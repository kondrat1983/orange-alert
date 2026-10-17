"""Pipeline end to end on the saved fixtures, kill switch, retract, data-file contract."""
import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

from conftest import FIXTURES, NOW, ROOT, article
from pipeline import retract as retract_mod
from pipeline import run as run_mod
from pipeline.models import Statement, parse_iso


@pytest.fixture
def out(tmp_path):
    return tmp_path / "data"


def run_cli(out, *extra, env=None, monkeypatch=None):
    return run_mod.main(["--fixtures", str(FIXTURES), "--out", str(out), *extra])


def read(out, name):
    return json.loads((out / name).read_text(encoding="utf-8"))


def by_quote(doc, start):
    return [s for s in doc["statements"] if s["quote_en"].startswith(start)]


# --- fixture dry run ---------------------------------------------------------

def test_dry_run_writes_nothing(out, capsys):
    assert run_cli(out, "--dry-run") == 0
    assert not out.exists()
    text = capsys.readouterr().out
    assert "DRY_RUN" in text and "PUBLISHED" in text and "PENDING" in text


def test_real_data_dir_untouched_by_dry_run():
    before = {p.name: p.read_text() for p in (ROOT / "data").glob("*.json")}
    run_mod.main(["--fixtures", str(FIXTURES), "--out", str(ROOT / "data"), "--dry-run"])
    assert before == {p.name: p.read_text() for p in (ROOT / "data").glob("*.json")}


def test_fixture_outcomes(out, monkeypatch):
    monkeypatch.delenv("AUTO_PUBLISH", raising=False)
    run_cli(out)
    pub, pend = read(out, "statements.json"), read(out, "pending.json")

    # 2 groups -> published; region/flags
    (g,) = by_quote(pub, "Greenland is a very")
    assert g["region"] == "greenland" and not g["triggers_alert"] and len(g["sources"]) == 2
    (c,) = by_quote(pub, "California needs")
    assert (c["region"], c["us_state"]) == ("us_domestic", "California")
    (v,) = by_quote(pub, "Too many people")
    assert v["victims_flag"] and v["triggers_alert"]
    # primary source alone -> published
    assert by_quote(pub, "Our trade numbers")
    # three groups
    (a,) = by_quote(pub, "We will send more air defence")
    assert len({s["independence_group"] for s in a["sources"]}) == 3
    # typography variants across two outlets are merged into one entry
    assert len(by_quote(pub, "Europe must do more")) == 1
    # single group / single outlet syndicated twice -> pending, never published
    (r,) = by_quote(pend, "Russia has to stop")
    assert len({s["independence_group"] for s in r["sources"]}) == 1
    assert not by_quote(pub, "Russia has to stop")
    # paraphrase is pending, flagged
    assert any(s["is_paraphrase"] for s in pend["statements"])
    assert not any(s["is_paraphrase"] for s in pub["statements"])
    # another person's quote never appears anywhere
    everything = json.dumps([pub, pend])
    for banned in ("security guarantees", "Nothing is agreed", "Our position on Ukraine",
                   "entirely different view"):
        assert banned not in everything


def test_every_published_statement_is_verbatim_sourced_and_linked(out):
    from pipeline.fetch import FixtureFetcher
    from pipeline.verify import is_verbatim
    run_cli(out)
    texts = {a.url: a.text for a in FixtureFetcher(FIXTURES).fetch()}
    for s in read(out, "statements.json")["statements"]:
        assert s["sources"], "every statement must link at least one source"
        for src in s["sources"]:
            assert src["url"].startswith("https://")
            assert is_verbatim(s["quote_en"], texts[src["url"]]), (s["id"], src["url"])


def test_fixture_status_and_globe(out):
    run_cli(out)
    status, globe = read(out, "status.json"), read(out, "globe.json")
    assert status["alert"]["level"] == "orange"            # Ukraine quote published within 6 h of NOW
    assert status["alert"]["jokes_off"] in (True, False)
    assert status["day"]["state"] != "at_mic"
    assert set(globe["regions"]) >= {"ukraine", "russia", "greenland", "us_domestic"}
    assert globe["regions"]["ukraine"]["alert"] and not globe["regions"]["greenland"]["alert"]
    assert globe["window_hours"] == 24


def test_second_run_is_idempotent(out):
    run_cli(out)
    first = {n: read(out, n) for n in ("statements.json", "pending.json")}
    run_cli(out)
    second = {n: read(out, n) for n in ("statements.json", "pending.json")}
    assert [s["id"] for s in first["statements.json"]["statements"]] == \
           [s["id"] for s in second["statements.json"]["statements"]]
    assert [len(s["sources"]) for s in first["statements.json"]["statements"]] == \
           [len(s["sources"]) for s in second["statements.json"]["statements"]]
    assert len(first["pending.json"]["statements"]) == len(second["pending.json"]["statements"])


def test_future_dated_article_skipped(extractor, log):
    a = article('"We will talk about it soon," Test Speaker said.', at="2026-10-18T00:00:00Z", outlet="Example Gov", primary=True)
    pub, pend = run_mod.process([a], extractor, [], [], NOW, True, log)
    assert not pub and not pend


# --- kill switch -------------------------------------------------------------

def test_kill_switch_everything_pending(out, monkeypatch, capsys):
    monkeypatch.setenv("AUTO_PUBLISH", "false")
    run_cli(out)
    assert read(out, "statements.json")["statements"] == []
    assert len(read(out, "pending.json")["statements"]) >= 7
    assert read(out, "status.json")["auto_publish"] is False
    assert "KILL" in capsys.readouterr().out


@pytest.mark.parametrize("val,enabled", [("false", False), ("FALSE", False), ("0", False), ("off", False),
                                         ("no", False), ("true", True), ("", True), ("1", True)])
def test_auto_publish_parsing(monkeypatch, val, enabled):
    monkeypatch.setenv("AUTO_PUBLISH", val)
    assert run_mod.auto_publish_enabled() is enabled


def test_unset_means_enabled(monkeypatch):
    monkeypatch.delenv("AUTO_PUBLISH", raising=False)
    assert run_mod.auto_publish_enabled() is True


def test_kill_switch_primary_source_still_held(extractor, log):
    a = article('"We will talk about it soon," Test Speaker said.', outlet="Example Gov", primary=True)
    pub, pend = run_mod.process([a], extractor, [], [], NOW, False, log)
    assert not pub and len(pend) == 1


def test_kill_switch_off_promotes_corroborated_pending(out, monkeypatch):
    monkeypatch.setenv("AUTO_PUBLISH", "false")
    run_cli(out)
    monkeypatch.setenv("AUTO_PUBLISH", "true")
    run_cli(out)
    pub, pend = read(out, "statements.json"), read(out, "pending.json")
    assert by_quote(pub, "Greenland is a very") and by_quote(pub, "Our trade numbers")
    assert not by_quote(pend, "Greenland is a very")
    assert by_quote(pend, "Russia has to stop")        # still single-group


# --- retract -----------------------------------------------------------------

def test_retract_keeps_entry_with_reason_and_recomputes(out, monkeypatch):
    monkeypatch.delenv("AUTO_PUBLISH", raising=False)
    run_cli(out)
    (g,) = by_quote(read(out, "statements.json"), "Greenland is a very")
    assert retract_mod.retract(out, g["id"], "wrong quote", NOW)
    pub = read(out, "statements.json")
    (g2,) = by_quote(pub, "Greenland is a very")
    assert g2["status"] == "retracted" and g2["retract_reason"] == "wrong quote"
    assert read(out, "globe.json")["regions"]["greenland"]["count"] == 0


def test_retracted_is_not_readded_by_next_run(out, monkeypatch, capsys):
    monkeypatch.delenv("AUTO_PUBLISH", raising=False)
    run_cli(out)
    (g,) = by_quote(read(out, "statements.json"), "Greenland is a very")
    retract_mod.retract(out, g["id"], "wrong quote", NOW)
    capsys.readouterr()
    run_cli(out)
    pub, pend = read(out, "statements.json"), read(out, "pending.json")
    assert len(by_quote(pub, "Greenland is a very")) == 1
    assert by_quote(pub, "Greenland is a very")[0]["status"] == "retracted"
    assert not by_quote(pend, "Greenland is a very")
    assert "RETRACTED" in capsys.readouterr().out


def test_retract_pending_entry_not_promoted(out, monkeypatch):
    monkeypatch.setenv("AUTO_PUBLISH", "false")
    run_cli(out)
    (g,) = by_quote(read(out, "pending.json"), "Greenland is a very")
    retract_mod.retract(out, g["id"], "bad source", NOW)
    monkeypatch.setenv("AUTO_PUBLISH", "true")
    run_cli(out)
    live = [s for s in read(out, "statements.json")["statements"]
            if s["quote_en"].startswith("Greenland is a very") and s["status"] == "published"]
    assert live == []


def test_retract_cli_requires_reason_and_known_id(out, capsys, monkeypatch):
    monkeypatch.delenv("AUTO_PUBLISH", raising=False)
    run_cli(out)
    (g,) = by_quote(read(out, "statements.json"), "Greenland is a very")
    assert retract_mod.main([g["id"], "   ", "--data", str(out)]) == 2
    assert retract_mod.main(["st_nope", "reason", "--data", str(out)]) == 1
    assert by_quote(read(out, "statements.json"), "Greenland is a very")[0]["status"] == "published"
    assert retract_mod.main([g["id"], "typo in quote", "--data", str(out), "--now", "2026-10-17T18:00:00Z"]) == 0


def test_retracted_status_in_level_is_not_orange(out, monkeypatch):
    monkeypatch.delenv("AUTO_PUBLISH", raising=False)
    run_cli(out)
    for s in read(out, "statements.json")["statements"]:
        if s["triggers_alert"]:
            retract_mod.retract(out, s["id"], "test", NOW)
    assert read(out, "status.json")["alert"]["level"] != "orange"


# --- data files --------------------------------------------------------------

def test_committed_data_files_valid():
    for name in ("statements.json", "pending.json", "globe.json", "status.json"):
        json.loads((ROOT / "data" / name).read_text(encoding="utf-8"))
    for name in ("statements.json", "pending.json"):
        for d in json.loads((ROOT / "data" / name).read_text())["statements"]:
            Statement.from_dict(d)


def test_statement_roundtrip_and_utc_z(out):
    run_cli(out)
    for s in read(out, "statements.json")["statements"]:
        assert Statement.from_dict(s).to_dict() == s
        assert s["said_at"].endswith("Z")
        assert parse_iso(s["said_at"]) <= NOW


def test_machine_translation_label_only_when_translated(out):
    run_cli(out)
    for s in read(out, "statements.json")["statements"]:
        assert (s["translation"] == "machine") == (s["quote_uk"] is not None)


def test_cli_module_entrypoint_dry_run(tmp_path):
    r = subprocess.run([sys.executable, "-m", "pipeline.run", "--fixtures", str(FIXTURES),
                        "--out", str(tmp_path / "d"), "--dry-run"], cwd=ROOT, capture_output=True, text=True)
    assert r.returncode == 0 and "STATUS" in r.stdout


# --- safety ------------------------------------------------------------------

def test_fixtures_use_only_fake_speakers_and_outlets():
    for p in FIXTURES.rglob("*.json"):
        t = p.read_text(encoding="utf-8")
        assert "Trump" not in t, p
        if p.parent.name == "articles":
            d = json.loads(t)
            assert "example.com" in d["url"] and d["outlet"].startswith("Example"), p


def test_repo_contains_no_trump_quote():
    """No quoted string within reach of 'Trump said/wrote/...' in data, fixtures, docs, mockup or tests."""
    import re
    rx = re.compile(r"Trump[^.\n]{0,40}\b(?:said|wrote|posted|told|says)\b[^.\n]{0,60}[\"“][^\"”]{12,}")
    rx2 = re.compile(r"[\"“][^\"”]{20,}[\"”],? Trump (?:said|wrote)")
    for base in ("data", "docs", "mockup", "tests", "pipeline/fixtures", "README.md"):
        path = ROOT / base
        files = [path] if path.is_file() else [f for f in path.rglob("*") if f.is_file() and f.suffix in
                                               (".json", ".md", ".js", ".html", ".py", ".css")]
        for f in files:
            if f.name == "test_run.py":
                continue
            t = f.read_text(encoding="utf-8", errors="ignore")
            assert not rx.search(t) and not rx2.search(t), f


def test_secrets_not_in_code():
    import re
    rx = re.compile(r"(ghp_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,}|AKIA[A-Z0-9]{12,}|PRIVATE KEY-----|"
                    r"(?:api[_-]?key|secret|token)\s*=\s*[\"'][A-Za-z0-9_\-]{16,})", re.I)
    for f in list((ROOT / "pipeline").rglob("*.py")) + list((ROOT / "data").glob("*.json")) + \
             list((ROOT / "pipeline" / "fixtures").rglob("*.json")):
        assert not rx.search(f.read_text(encoding="utf-8")), f


def test_retract_twice_is_noop_unless_forced(out, capsys, monkeypatch):
    monkeypatch.delenv("AUTO_PUBLISH", raising=False)
    run_cli(out)
    (g,) = by_quote(read(out, "statements.json"), "Greenland is a very")
    assert retract_mod.main([g["id"], "--reason", "first", "--data", str(out)]) == 0
    before = (out / "statements.json").read_text()
    assert retract_mod.main([g["id"], "--reason", "second", "--data", str(out)]) == 0
    assert "Already retracted" in capsys.readouterr().out
    assert (out / "statements.json").read_text() == before
    assert retract_mod.main([g["id"], "--reason", "second", "--force", "--data", str(out)]) == 0
    assert by_quote(read(out, "statements.json"), "Greenland is a very")[0]["retract_reason"] == "second"


def test_retract_reason_may_start_with_dash(out, monkeypatch):
    monkeypatch.delenv("AUTO_PUBLISH", raising=False)
    run_cli(out)
    (g,) = by_quote(read(out, "statements.json"), "Greenland is a very")
    assert retract_mod.main([g["id"], "--reason=-x wrong date", "--data", str(out)]) == 0
    assert by_quote(read(out, "statements.json"), "Greenland is a very")[0]["retract_reason"] == "-x wrong date"
    assert retract_mod.main(["st_nope", "--reason=-x", "--data", str(out)]) == 1
