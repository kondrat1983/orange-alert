"""Pipeline entry point.

    python -m pipeline.run --fixtures pipeline/fixtures --out data [--dry-run] [--now ISO]

Reads existing data/*.json from --out, fetches articles, extracts, verifies,
deduplicates, corroborates, classifies, translates, then writes
statements.json, pending.json, globe.json and status.json.
Kill switch: env AUTO_PUBLISH=false sends every new statement to pending.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

from . import translate
from .alert import compute_status
from .classify import ALERT_REGIONS, REGIONS, classify
from .corroborate import is_corroborated, pick_canonical
from .dedup import group_candidates, same_quote, within_window
from .extract import DEFAULT_SPEAKER, Extractor, SpeakerConfig
from .fetch import FixtureFetcher, load_fixture_config
from .models import (STATUS_PENDING, STATUS_PUBLISHED, STATUS_RETRACTED, Article, Statement,
                     parse_iso, utc_iso)
from .verify import is_verbatim, normalize
from .wires import apply_wire_groups

GLOBE_WINDOW_HOURS = 24
SCHEMA_VERSION = 1


class DecisionLog:
    def __init__(self):
        self.lines: list[str] = []

    def __call__(self, kind: str, msg: str):
        line = f"{kind:<10} {msg}"
        self.lines.append(line)
        print(line)

    def write_step_summary(self, header: str):
        path = os.environ.get("GITHUB_STEP_SUMMARY")
        if not path:
            return
        with open(path, "a", encoding="utf-8") as f:
            f.write(f"## {header}\n\n")
            for line in self.lines:
                f.write(f"- `{line}`\n")
            f.write("\n")


def auto_publish_enabled() -> bool:
    return os.environ.get("AUTO_PUBLISH", "true").strip().lower() not in ("false", "0", "no", "off")


def statement_id(quote: str, said_at: str) -> str:
    h = hashlib.sha1(f"{normalize(quote)}|{said_at[:10]}".encode("utf-8")).hexdigest()
    return "st_" + h[:12]


# --- data files -------------------------------------------------------------

def _read_list(path: Path) -> list[Statement]:
    if not path.exists():
        return []
    d = json.loads(path.read_text(encoding="utf-8"))
    return [Statement.from_dict(x) for x in d.get("statements", [])]


def load_data(data_dir: Path) -> tuple[list[Statement], list[Statement]]:
    return _read_list(data_dir / "statements.json"), _read_list(data_dir / "pending.json")


def _dump(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def build_globe(published: list[Statement], now: datetime) -> dict:
    since = now - timedelta(hours=GLOBE_WINDOW_HOURS)
    live = sorted((s for s in published if s.status == STATUS_PUBLISHED and s.region and s.said_at
                   and since <= parse_iso(s.said_at) <= now), key=lambda s: s.said_at)
    regions = {r: {"count": 0, "latest_statement_id": None, "latest_said_at": None,
                   "alert": r in ALERT_REGIONS, "us_states": {}} for r in REGIONS}
    for s in live:
        r = regions[s.region]
        r["count"] += 1
        r["latest_statement_id"], r["latest_said_at"] = s.id, s.said_at
        if s.us_state:
            r["us_states"][s.us_state] = r["us_states"].get(s.us_state, 0) + 1
    focus = None
    if live:
        top = max(r["count"] for r in regions.values())
        focus = max((k for k, v in regions.items() if v["count"] == top),
                    key=lambda k: regions[k]["latest_said_at"])
    focus_state = None
    if focus and regions[focus]["us_states"]:
        focus_state = Counter(regions[focus]["us_states"]).most_common(1)[0][0]
    return {"version": SCHEMA_VERSION, "generated_at": utc_iso(now), "window_hours": GLOBE_WINDOW_HOURS,
            "focus": focus, "focus_us_state": focus_state, "regions": regions}


def write_outputs(data_dir: Path, published, pending, now: datetime, auto_publish: bool) -> dict:
    """Write all four data files. Returns status.json content."""
    key = lambda s: s.said_at or ""  # noqa: E731
    published = sorted(published, key=key, reverse=True)
    pending = sorted(pending, key=key, reverse=True)
    stamp = utc_iso(now)
    _dump(data_dir / "statements.json",
          {"version": SCHEMA_VERSION, "updated_at": stamp, "statements": [s.to_dict() for s in published]})
    _dump(data_dir / "pending.json",
          {"version": SCHEMA_VERSION, "updated_at": stamp, "statements": [s.to_dict() for s in pending]})
    _dump(data_dir / "globe.json", build_globe(published, now))
    status = compute_status(published, pending, now, auto_publish)
    _dump(data_dir / "status.json", status)
    return status


# --- processing -------------------------------------------------------------

def _find_existing(quote: str, said_at: str, is_paraphrase: bool, pool: list[Statement]) -> Statement | None:
    for s in pool:
        if s.is_paraphrase == is_paraphrase and within_window(s.said_at, said_at) and same_quote(s.quote_en, quote):
            return s
    return None


def _build_statement(quote: str, group, carry, sources) -> Statement:
    said_at = min(c.article.published_at for c in group)
    lead = carry[0] if carry else group[0]
    cls = classify(quote, lead.context, lead.article.title)
    platforms = Counter(c.platform for c in group if c.platform != "unknown")
    quote_uk = translate.to_ukrainian(quote)
    return Statement(
        id=statement_id(quote, said_at), quote_en=quote, quote_uk=quote_uk,
        translation="machine" if quote_uk else None,
        is_paraphrase=group[0].is_paraphrase, said_at=said_at,
        platform=platforms.most_common(1)[0][0] if platforms else "unknown",
        region=cls.region, us_state=cls.us_state, topics=cls.topics,
        triggers_alert=cls.triggers_alert, victims_flag=cls.victims_flag,
        sources=sources, status=STATUS_PENDING,
    )


def process(articles: list[Article], extractor: Extractor, published: list[Statement],
            pending: list[Statement], now: datetime, auto_publish: bool, log: DecisionLog):
    candidates = []
    for a in apply_wire_groups(articles):
        if parse_iso(a.published_at) > now:
            log("SKIP", f"{a.url}: published in the future relative to now")
            continue
        found = extractor.extract(a)
        if not found:
            log("NO_QUOTE", f"{a.url}: nothing attributed to {extractor.speaker.name}")
        for c in found:
            if not is_verbatim(c.quote, a.text):
                log("REJECTED", f"{a.url}: not verbatim in source: {c.quote[:60]!r}")
                continue
            candidates.append(c)

    if not auto_publish:
        log("KILL", "AUTO_PUBLISH=false: new statements go to pending")

    for group in group_candidates(candidates):
        quote, carry = pick_canonical(group)
        sources = []
        for c in carry:
            if all(s.url != c.article.url for s in sources):
                sources.append(c.article.source)
        said_at = min(c.article.published_at for c in group)
        label = ("paraphrase " if group[0].is_paraphrase else "") + repr(quote[:70])
        match = _find_existing(quote, said_at, group[0].is_paraphrase, published + pending)
        if match is not None and match.status == STATUS_RETRACTED:
            log("RETRACTED", f"{match.id} {label}: matches a retracted entry, not re-added")
            continue
        if match is not None and match in published:
            added = sum(match.add_source(s) for s in sources if is_verbatim(match.quote_en, _text(group, s.url)))
            log("KNOWN", f"{match.id} {label}: already published (+{added} sources)")
            continue
        if match is not None:  # pending: carry its sources over and decide again
            pending.remove(match)
            if normalize(match.quote_en) == normalize(quote):
                for s in match.sources:
                    if all(x.url != s.url for x in sources):
                        sources.append(s)
        st = _build_statement(quote, group, carry, sources)
        if match is not None and normalize(match.quote_en) == normalize(quote):
            st.id = match.id
        ok, why = is_corroborated(st.sources)
        tags = f"region={st.region}{'/' + st.us_state if st.us_state else ''} alert={st.triggers_alert} victims={st.victims_flag}"
        if ok and auto_publish:
            st.status = STATUS_PUBLISHED
            published.append(st)
            log("PUBLISHED", f"{st.id} {label}: {why}; {tags}")
        else:
            pending.append(st)
            log("PENDING", f"{st.id} {label}: {why if not ok else 'kill switch'}; {tags}")

    # Promote pending entries that are corroborated (e.g. held back while the kill switch was on).
    if auto_publish:
        for st in list(pending):
            ok, why = is_corroborated(st.sources)
            if st.status == STATUS_PENDING and ok:
                pending.remove(st)
                st.status = STATUS_PUBLISHED
                published.append(st)
                log("PROMOTED", f"{st.id}: {why}")
    return published, pending


def _text(group, url: str) -> str:
    for c in group:
        if c.article.url == url:
            return c.article.text
    return ""


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="python -m pipeline.run", description=__doc__.split("\n\n")[0])
    ap.add_argument("--fixtures", required=True, help="fixture directory (config.json + articles/*.json)")
    ap.add_argument("--out", required=True, help="data directory to read existing data from and write to")
    ap.add_argument("--dry-run", action="store_true", help="do everything but write nothing")
    ap.add_argument("--now", help="override current time (ISO 8601); default: fixture config 'now' or real time")
    args = ap.parse_args(argv)

    cfg = load_fixture_config(args.fixtures)
    speaker = SpeakerConfig.from_dict(cfg["speaker"]) if "speaker" in cfg else DEFAULT_SPEAKER
    now_s = args.now or cfg.get("now")
    now = parse_iso(now_s) if now_s else datetime.now(timezone.utc)
    auto_publish = auto_publish_enabled()
    out = Path(args.out)

    log = DecisionLog()
    log("START", f"now={utc_iso(now)} speaker={speaker.name!r} auto_publish={auto_publish} "
                 f"translation={'argos' if translate.available() else 'off'} dry_run={args.dry_run}")
    published, pending = load_data(out)
    articles = FixtureFetcher(args.fixtures).fetch()
    log("FETCHED", f"{len(articles)} articles")
    published, pending = process(articles, Extractor(speaker), published, pending, now, auto_publish, log)

    if args.dry_run:
        status = compute_status(published, pending, now, auto_publish)
        log("DRY_RUN", "nothing written")
    else:
        status = write_outputs(out, published, pending, now, auto_publish)
        log("WROTE", f"{out}/statements.json, pending.json, globe.json, status.json")
    log("STATUS", f"alert={status['alert']['level']} day={status['day']['state']} "
                  f"published={len(published)} pending={len(pending)}")
    log.write_step_summary("Orange Alert pipeline")
    return 0


if __name__ == "__main__":
    sys.exit(main())
