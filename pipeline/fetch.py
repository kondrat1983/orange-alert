"""Fetchers return Articles.

FixtureFetcher reads saved fixture articles (offline). RssFetcher reads the live
sources in pipeline/sources.yml (RSS feeds and the Guardian Content API) and fetches
article pages politely: honest User-Agent, robots.txt checked before every article
fetch, at most one request per host every 2 s, timeouts, paywalled / link-only
sites never fetched. Article text is held in memory only and never written anywhere.
"""
from __future__ import annotations

import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
from calendar import timegm
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Callable, Protocol

from .classify import _region_hits
from .models import Article, parse_iso, utc_iso


class Fetcher(Protocol):
    def fetch(self) -> list[Article]:
        """Return recent articles with their full text."""
        ...


class FixtureFetcher:
    """Reads saved articles from DIR/articles/*.json (one article per file).

    Each file: {outlet, url, independence_group, primary, published_at, title, text}.
    """

    def __init__(self, directory: str | Path):
        self.directory = Path(directory)

    def fetch(self) -> list[Article]:
        articles = []
        for path in sorted((self.directory / "articles").glob("*.json")):
            d = json.loads(path.read_text(encoding="utf-8"))
            articles.append(Article(
                outlet=d["outlet"],
                url=d["url"],
                independence_group=d.get("independence_group") or d["outlet"],
                primary=bool(d.get("primary", False)),
                published_at=utc_iso(parse_iso(d["published_at"])),
                title=d.get("title", ""),
                text=d["text"],
            ))
        return articles


def load_fixture_config(directory: str | Path) -> dict:
    """Optional DIR/config.json: {"speaker": {...}, "now": "<ISO>"}."""
    path = Path(directory) / "config.json"
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


# --- live fetching -----------------------------------------------------------

USER_AGENT = "OrangeAlertBot/0.1 (+https://github.com/kondrat1983/orange-alert)"
ROBOTS_AGENT = "OrangeAlertBot"
TIMEOUT_S = 20
HOST_INTERVAL_S = 2.0       # docs/SOURCES.md: max 1 request per host per 2 s
MAX_BYTES = 5_000_000
MAX_ARTICLES = 60           # article page requests per run
MAX_AGE_HOURS = 72          # older feed items are ignored
STALE_DAYS = 7              # feed health: newest item older than this = stale
SEEN_KEEP_DAYS = 14         # data/seen.json pruning
FEED_TEXT_MIN_CHARS = 1500  # feed items with this much text are used without fetching the page
MIN_ARTICLE_CHARS = 200
SOURCES_FILE = Path(__file__).resolve().parent / "sources.yml"

LogFn = Callable[[str, str], None]


class FetchError(Exception):
    """A request failed. The message never contains the URL (it may carry an API key)."""

    def __init__(self, msg: str, status: int | None = None):
        super().__init__(msg)
        self.status = status


@dataclass
class Response:
    status: int
    url: str
    body: bytes
    content_type: str

    def text(self) -> str:
        m = re.search(r"charset=([\w-]+)", self.content_type, re.I)
        enc = m.group(1) if m else None
        if not enc:
            m = re.search(rb"<meta[^>]+charset=[\"']?([\w-]+)", self.body[:2048], re.I)
            enc = m.group(1).decode("ascii") if m else "utf-8"
        try:
            return self.body.decode(enc, errors="replace")
        except LookupError:
            return self.body.decode("utf-8", errors="replace")


class HttpClient:
    """urllib GET with an honest User-Agent, a timeout and a per-host rate limit."""

    def __init__(self, user_agent: str = USER_AGENT, timeout: float = TIMEOUT_S,
                 host_interval: float = HOST_INTERVAL_S, clock=time.monotonic, sleep=time.sleep):
        self.user_agent, self.timeout, self.host_interval = user_agent, timeout, host_interval
        self.clock, self.sleep = clock, sleep
        self._last: dict[str, float] = {}

    def _wait(self, host: str):
        last = self._last.get(host)
        if last is not None:
            delay = self.host_interval - (self.clock() - last)
            if delay > 0:
                self.sleep(delay)
        self._last[host] = self.clock()

    def get(self, url: str, accept: str = "*/*") -> Response:
        self._wait(urllib.parse.urlsplit(url).hostname or "")
        req = urllib.request.Request(url, headers={"User-Agent": self.user_agent, "Accept": accept})
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as r:  # noqa: S310 - http(s) only
                body = r.read(MAX_BYTES + 1)
                if len(body) > MAX_BYTES:
                    raise FetchError("response too large")
                return Response(r.status, r.geturl(), body, r.headers.get("Content-Type", ""))
        except urllib.error.HTTPError as e:
            raise FetchError(f"HTTP {e.code}", e.code) from None
        except urllib.error.URLError as e:
            raise FetchError(f"network error: {type(e.reason).__name__}") from None
        except (TimeoutError, OSError, ValueError) as e:
            raise FetchError(f"{type(e).__name__}") from None


def host_of(url: str) -> str:
    host = (urllib.parse.urlsplit(url).hostname or "").lower()
    return host[4:] if host.startswith("www.") else host


def domain_match(host: str, domains) -> str | None:
    """Return the matching entry of `domains` for host (exact or subdomain), else None."""
    for d in domains:
        if host == d or host.endswith("." + d):
            return d
    return None


class RobotsCache:
    """robots.txt per host. 404 = everything allowed; 401/403 or any failure = nothing allowed."""

    def __init__(self, client: HttpClient, agent: str = ROBOTS_AGENT):
        self.client, self.agent = client, agent
        self._cache: dict[str, urllib.robotparser.RobotFileParser | bool] = {}

    def allowed(self, url: str) -> bool:
        parts = urllib.parse.urlsplit(url)
        if parts.scheme not in ("http", "https"):
            return False
        key = f"{parts.scheme}://{parts.netloc}"
        if key not in self._cache:
            self._cache[key] = self._load(key)
        rp = self._cache[key]
        if isinstance(rp, bool):
            return rp
        return rp.can_fetch(self.agent, url)

    def _load(self, base: str):
        try:
            resp = self.client.get(base + "/robots.txt", accept="text/plain")
        except FetchError as e:
            if e.status is not None and 400 <= e.status < 500 and e.status not in (401, 403):
                return True
            return False
        rp = urllib.robotparser.RobotFileParser()
        rp.parse(resp.text().splitlines())
        return rp


class _TextExtractor(HTMLParser):
    """Paragraph text from an article page (prefers <article>), plus byline text."""
    SKIP = {"script", "style", "noscript", "svg", "nav", "form", "button", "aside", "template", "iframe"}
    BLOCKS = {"p", "blockquote", "h1", "h2"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip = 0
        self.article = 0
        self.buf: list[str] | None = None
        self.buf_in_article = False
        self.paras: list[tuple[bool, str]] = []
        self.byline_tag: str | None = None
        self.byline_depth = 0
        self.byline: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP:
            self.skip += 1
            return
        if tag == "article":
            self.article += 1
        if self.byline_tag is None:
            cls = " ".join(v or "" for k, v in attrs if k in ("class", "rel", "itemprop")).lower()
            if re.search(r"byline|author|credit", cls):
                self.byline_tag, self.byline_depth = tag, 1
        elif tag == self.byline_tag:
            self.byline_depth += 1
        if tag in self.BLOCKS:
            self._flush()
            self.buf, self.buf_in_article = [], self.article > 0
        elif tag == "br" and self.buf is not None:
            self.buf.append(" ")

    def handle_endtag(self, tag):
        if tag in self.SKIP:
            self.skip = max(0, self.skip - 1)
            return
        if tag in self.BLOCKS:
            self._flush()
        if tag == "article":
            self.article = max(0, self.article - 1)
        if tag == self.byline_tag:
            self.byline_depth -= 1
            if self.byline_depth <= 0:
                self.byline_tag = None

    def handle_data(self, data):
        if self.skip:
            return
        if self.buf is not None:
            self.buf.append(data)
        if self.byline_tag is not None:
            self.byline.append(data)

    def _flush(self):
        if self.buf is not None:
            t = re.sub(r"\s+", " ", "".join(self.buf)).strip()
            if t:
                self.paras.append((self.buf_in_article, t))
        self.buf = None

    def result(self) -> str:
        self._flush()
        inside = [t for a, t in self.paras if a]
        paras = inside if inside else [t for _, t in self.paras]
        byline = re.sub(r"\s+", " ", " ".join(self.byline)).strip()[:300]
        return "\n\n".join(([byline] if byline else []) + paras)


def html_to_text(html: str) -> str:
    p = _TextExtractor()
    try:
        p.feed(html)
        p.close()
    except Exception:  # noqa: BLE001 - broken HTML: keep what was parsed
        pass
    return p.result()


# --- sources ---------------------------------------------------------------

@dataclass
class SourceConfig:
    name: str
    url: str
    type: str = "rss"
    independence_group: str = ""
    primary: bool = False
    verify: bool = False
    domains: list[str] = field(default_factory=list)
    api_key_env: str | None = None

    @property
    def per_item(self) -> bool:
        return self.independence_group == "per_item"


@dataclass
class SourcesConfig:
    sources: list[SourceConfig]
    link_only: dict[str, str]  # domain -> independence group


def load_sources(path: str | Path = SOURCES_FILE, env=None) -> SourcesConfig:
    """Read sources.yml. API sources whose key env var is unset are skipped silently."""
    import yaml  # lazy: only the live path needs it
    env = os.environ if env is None else env
    d = yaml.safe_load(Path(path).read_text(encoding="utf-8")) or {}
    out = []
    for s in d.get("sources", []):
        cfg = SourceConfig(
            name=s["name"], url=s["url"], type=s.get("type", "rss"),
            independence_group=s.get("independence_group") or s["name"].lower(),
            primary=bool(s.get("primary", False)), verify=bool(s.get("verify", False)),
            domains=[x.lower() for x in s.get("domains", [])], api_key_env=s.get("api_key_env"))
        if cfg.api_key_env and not env.get(cfg.api_key_env, "").strip():
            continue
        out.append(cfg)
    link_only = d.get("link_only_domains") or {}
    if isinstance(link_only, list):
        link_only = {x: x.split(".")[0] for x in link_only}
    return SourcesConfig(out, {k.lower(): v for k, v in link_only.items()})


# --- seen URLs (data/seen.json) ----------------------------------------------

def load_seen(path: Path) -> dict[str, str]:
    try:
        d = json.loads(Path(path).read_text(encoding="utf-8"))
        return {k: v for k, v in d.get("urls", {}).items() if isinstance(v, str)}
    except (OSError, ValueError, AttributeError):
        return {}


def prune_seen(seen: dict[str, str], now: datetime, keep_days: int = SEEN_KEEP_DAYS) -> dict[str, str]:
    cutoff = now - timedelta(days=keep_days)
    out = {}
    for url, at in seen.items():
        try:
            if parse_iso(at) >= cutoff:
                out[url] = at
        except ValueError:
            pass
    return out


def seen_payload(seen: dict[str, str], now: datetime) -> dict:
    return {"version": 1, "keep_days": SEEN_KEEP_DAYS,
            "urls": dict(sorted(prune_seen(seen, now).items()))}


# --- live fetcher -------------------------------------------------------------

_SPEAKER_RX = re.compile(r"\b(?:Trump|president)\b", re.I)


def prefilter(text: str) -> bool:
    """Cheap check before fetching a page: names Trump / the president and a region keyword."""
    return bool(_SPEAKER_RX.search(text)) and bool(_region_hits(text))


@dataclass
class FeedItem:
    source: SourceConfig
    url: str
    title: str
    summary: str
    published_at: datetime | None
    outlet: str
    group: str
    primary: bool
    text: str = ""          # full text when the feed / API carries it
    item_domain: str = ""   # Google News: domain of the item's <source url>


@dataclass
class FeedHealth:
    name: str
    state: str              # ok | stale | failed
    items: int = 0
    newest: str | None = None
    detail: str = ""
    verify: bool = False


def _struct_to_dt(t) -> datetime | None:
    if not t:
        return None
    try:
        return datetime.fromtimestamp(timegm(t), tz=timezone.utc)
    except (TypeError, ValueError, OverflowError):
        return None


def _strip_html(s: str) -> str:
    """Feed title / summary / content to plain text."""
    if "<" not in s:
        return s.strip()
    has_blocks = re.search(r"<(?:p|blockquote|h1|h2)[\s>]", s, re.I)
    return html_to_text(f"<article>{s}</article>" if has_blocks else f"<article><p>{s}</p></article>")


class RssFetcher:
    """Live fetcher over sources.yml. One failing source or page never fails the run."""

    def __init__(self, config: SourcesConfig, now: datetime, seen: dict[str, str] | None = None,
                 log: LogFn | None = None, client: HttpClient | None = None, env=None,
                 max_articles: int = MAX_ARTICLES, max_age_hours: int = MAX_AGE_HOURS):
        self.config, self.now = config, now
        self.seen = seen if seen is not None else {}
        self.log = log or (lambda k, m: print(f"{k:<10} {m}"))
        self.client = client or HttpClient()
        self.robots = RobotsCache(self.client)
        self.env = os.environ if env is None else env
        self.max_articles, self.max_age = max_articles, timedelta(hours=max_age_hours)
        self.health: list[FeedHealth] = []
        self.requests = 0
        self._use_domains = {d: s for s in config.sources if not s.per_item for d in s.domains}

    # -- feeds --

    def _read_source(self, src: SourceConfig) -> list[FeedItem]:
        if src.type == "api":
            return self._read_guardian(src)
        import feedparser  # lazy: only the live path needs it
        resp = self.client.get(src.url, accept="application/rss+xml, application/atom+xml, application/xml, text/xml")
        feed = feedparser.parse(resp.body)
        if feed.bozo and not feed.entries:
            raise FetchError(f"unparseable feed ({type(feed.get('bozo_exception')).__name__})")
        items = []
        for e in feed.entries:
            link = e.get("link") or ""
            if not link.startswith(("http://", "https://")):
                continue
            content = ""
            if e.get("content"):
                content = _strip_html(max((c.get("value", "") for c in e.content), key=len))
            outlet, group, item_domain = src.name, src.independence_group, ""
            if src.per_item:
                srcinfo = e.get("source") or {}
                outlet = srcinfo.get("title") or "Google News"
                item_domain = host_of(srcinfo.get("href") or "")
                group = ""
            items.append(FeedItem(
                source=src, url=link, title=_strip_html(e.get("title", "")),
                summary=_strip_html(e.get("summary", "")),
                published_at=_struct_to_dt(e.get("published_parsed") or e.get("updated_parsed")),
                outlet=outlet, group=group, primary=src.primary, text=content, item_domain=item_domain))
        return items

    def _read_guardian(self, src: SourceConfig) -> list[FeedItem]:
        key = self.env.get(src.api_key_env or "", "").strip()
        if not key:
            return []
        sep = "&" if "?" in src.url else "?"
        resp = self.client.get(f"{src.url}{sep}api-key={urllib.parse.quote(key)}", accept="application/json")
        try:
            results = json.loads(resp.text())["response"]["results"]
        except (ValueError, KeyError, TypeError):
            raise FetchError("unexpected API response") from None
        items = []
        for r in results:
            url = r.get("webUrl") or ""
            if not url:
                continue
            try:
                at = parse_iso(r["webPublicationDate"])
            except (KeyError, ValueError):
                at = None
            body = (r.get("fields") or {}).get("bodyText") or ""
            items.append(FeedItem(source=src, url=url, title=r.get("webTitle", ""), summary="",
                                  published_at=at, outlet=src.name, group=src.independence_group,
                                  primary=src.primary, text=body))
        return items

    def read_feeds(self) -> list[FeedItem]:
        items: list[FeedItem] = []
        stale_before = self.now - timedelta(days=STALE_DAYS)
        for src in self.config.sources:
            tag = " (unverified)" if src.verify else ""
            try:
                got = self._read_source(src)
            except Exception as e:  # noqa: BLE001 - one bad feed never fails the run
                detail = str(e) if isinstance(e, FetchError) else type(e).__name__
                self.health.append(FeedHealth(src.name, "failed", detail=detail, verify=src.verify))
                self.log("FEED", f"FAILED {src.name}{tag}: {detail}")
                continue
            dates = [i.published_at for i in got if i.published_at]
            newest = max(dates) if dates else None
            state = "ok" if newest and newest >= stale_before else "stale"
            h = FeedHealth(src.name, state, len(got), utc_iso(newest) if newest else None, verify=src.verify)
            self.health.append(h)
            self.log("FEED", f"{state.upper()} {src.name}{tag}: {len(got)} items, newest {h.newest or 'n/a'}")
            items.extend(got)
        return items

    # -- articles --

    def _mark(self, *urls: str):
        stamp = utc_iso(self.now)
        for u in urls:
            if u:
                self.seen.setdefault(u, stamp)

    def _page_text(self, url: str) -> tuple[str, str] | None:
        """robots.txt check + GET. Returns (final_url, text), or None (logged; seen-marking done here
        for permanent failures)."""
        if not self.robots.allowed(url):
            self.log("ROBOTS", f"{url}: disallowed by robots.txt, skipped")
            self._mark(url)
            return None
        self.requests += 1
        try:
            resp = self.client.get(url, accept="text/html,application/xhtml+xml")
        except FetchError as e:
            self.log("FETCH_ERR", f"{url}: {e}")
            if e.status is not None and 400 <= e.status < 500 and e.status != 429:
                self._mark(url)
            return None
        if "html" not in resp.content_type.lower() and resp.content_type:
            self.log("SKIP", f"{url}: not an HTML page ({resp.content_type.split(';')[0]})")
            self._mark(url)
            return None
        return resp.url, html_to_text(resp.text())

    def _resolve_google(self, item: FeedItem) -> tuple[str, SourceConfig] | None:
        """Google News: only items from a `use` outlet are followed; everything else is logged."""
        lo = domain_match(item.item_domain, self.config.link_only)
        if lo:
            self.log("LINK_ONLY", f"{item.outlet} ({item.item_domain}) via Google News: {item.title[:80]!r}")
            self._mark(item.url)
            return None
        d = domain_match(item.item_domain, self._use_domains)
        if not d:
            self.log("DISCOVERY", f"{item.outlet} ({item.item_domain or '?'}) via Google News, not a fetched "
                                  f"source: {item.title[:80]!r}")
            self._mark(item.url)
            return None
        return item.url, self._use_domains[d]

    def _to_article(self, item: FeedItem) -> Article | None:
        src, url, text = item.source, item.url, item.text
        outlet, group, primary = item.outlet, item.group, item.primary
        if src.per_item:
            got = self._resolve_google(item)
            if got is None:
                return None
            _, use_src = got
            outlet, group, primary = use_src.name, use_src.independence_group, use_src.primary
        host = host_of(url)
        if domain_match(host, self.config.link_only):
            self.log("LINK_ONLY", f"{url}: link-only outlet, not fetched")
            self._mark(url)
            return None
        if len(text) < FEED_TEXT_MIN_CHARS:
            if self.requests >= self.max_articles:
                return None  # cap reached; not marked seen, picked up next run
            if not src.per_item and src.domains and not domain_match(host, src.domains):
                self.log("SKIP", f"{url}: host {host} is not one of {src.name}'s domains")
                self._mark(url)
                return None
            got = self._page_text(url)
            if got is None:
                return None
            final, text = got
            fhost = host_of(final)
            if src.per_item:
                d = domain_match(fhost, self._use_domains)
                if not d:
                    self.log("DISCOVERY", f"{item.outlet} via Google News: link did not resolve to the outlet")
                    self._mark(url, final)
                    return None
                if final in self.seen:
                    self._mark(url)
                    return None
            elif domain_match(fhost, self.config.link_only):
                self.log("LINK_ONLY", f"{url}: redirected to a link-only outlet, not used")
                self._mark(url, final)
                return None
            self._mark(url)
            url = final
        if len(text) < MIN_ARTICLE_CHARS:
            self.log("SKIP", f"{url}: no article text found")
            self._mark(url)
            return None
        self._mark(url, item.url)
        published = item.published_at or self.now
        return Article(outlet=outlet, url=url, independence_group=group, primary=primary,
                       published_at=utc_iso(published), title=item.title, text=text)

    def fetch(self) -> list[Article]:
        items = self.read_feeds()
        cutoff = self.now - self.max_age
        fresh, n_old, n_seen, n_off = [], 0, 0, 0
        known = set()
        for it in items:
            if it.url in self.seen or it.url in known:
                n_seen += 1
                continue
            known.add(it.url)
            if it.published_at and it.published_at < cutoff:
                n_old += 1
                continue
            if not prefilter(f"{it.title}\n{it.summary}\n{it.text[:3000]}"):
                n_off += 1
                continue
            fresh.append(it)
        # Primary sources first, then newest first.
        fresh.sort(key=lambda i: (not i.primary, -(i.published_at or self.now).timestamp()))
        self.log("ITEMS", f"{len(items)} feed items: {len(fresh)} candidates, {n_seen} already seen, "
                          f"{n_old} older than {int(self.max_age.total_seconds() // 3600)} h, {n_off} off-topic")
        articles, skipped_cap = [], 0
        for it in fresh:
            if self.requests >= self.max_articles and len(it.text) < FEED_TEXT_MIN_CHARS:
                skipped_cap += 1
                continue
            try:
                a = self._to_article(it)
            except Exception as e:  # noqa: BLE001 - one bad page never fails the run
                self.log("FETCH_ERR", f"{it.url}: {type(e).__name__}")
                continue
            if a is not None:
                articles.append(a)
        if skipped_cap:
            self.log("CAP", f"article cap {self.max_articles} reached; {skipped_cap} items left for the next run")
        return articles
