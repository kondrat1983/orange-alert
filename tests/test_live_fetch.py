"""Live-mode fetch tests against a local fake HTTP server. Fake speaker / outlets only."""
from __future__ import annotations

import json
import socket
import threading
import time
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest

from pipeline import fetch, run
from pipeline.extract import SpeakerConfig
from pipeline.fetch import (HttpClient, RssFetcher, SourceConfig, SourcesConfig, load_sources,
                            prune_seen, seen_payload)

NOW = datetime(2026, 10, 17, 18, 0, tzinfo=timezone.utc)
KEY = "SECRETKEY-abc123"
BODY = ("Test Speaker said: \"The Ukraine plan is moving along nicely today.\" "
        "The president spoke on Ukraine for ten minutes. " * 6)


def page(text=BODY):
    return f"<html><body><article><p>{text}</p></article></body></html>"


def rss(items):
    pub = "Sat, 17 Oct 2026 16:00:00 GMT"
    body = "".join(f"<item><title>{t}</title><link>{l}</link><pubDate>{pub}</pubDate>"
                   f"<description>The president on Ukraine</description></item>" for t, l in items)
    return f"<?xml version='1.0'?><rss version='2.0'><channel><title>x</title>{body}</channel></rss>"


class H(BaseHTTPRequestHandler):
    log: list = []
    slow = 1.5

    def log_message(self, *a):
        pass

    def _send(self, code, body, ctype="text/html"):
        b = body.encode() if isinstance(body, str) else body
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        H.log.append(self.path)
        p = self.path
        if p == "/robots.txt":
            return self._send(200, "User-agent: *\nDisallow: /private/\n", "text/plain")
        if p.startswith("/guardian"):
            if KEY not in p:
                return self._send(401, "no key")
            res = [{"webUrl": f"http://127.0.0.1:{self.server.server_port}/a/g1", "webTitle": "President on Ukraine",
                    "webPublicationDate": "2026-10-17T15:00:00Z", "fields": {"bodyText": BODY}}]
            return self._send(200, json.dumps({"response": {"results": res}}), "application/json")
        if p == "/feed500":
            return self._send(500, "boom")
        if p == "/garbage":
            return self._send(200, "<<<not a feed {{{", "text/plain")
        if p == "/slow":
            time.sleep(self.slow)
            return self._send(200, page())
        if p == "/a/404":
            return self._send(404, "nope")
        if p == "/a/500":
            return self._send(500, "boom")
        if p == "/a/429":
            return self._send(429, "slow down")
        if p.startswith("/private/") or p.startswith("/a/"):
            return self._send(200, page())
        if p.startswith("/feed"):
            n = int(p[5:] or 0) if p[5:].isdigit() else 0
            return self._send(200, rss([(f"President Ukraine {i}", f"http://127.0.0.1:{self.server.server_port}/a/n{i}")
                                        for i in range(n)]), "application/rss+xml")
        if p == "/mixed":
            base = f"http://127.0.0.1:{self.server.server_port}"
            return self._send(200, rss([("President Ukraine ok", base + "/a/ok"),
                                        ("President Ukraine 404", base + "/a/404"),
                                        ("President Ukraine 500", base + "/a/500"),
                                        ("President Ukraine 429", base + "/a/429"),
                                        ("President Ukraine robots", base + "/private/x"),
                                        ("President Ukraine slow", base + "/slow")]), "application/rss+xml")
        self._send(404, "?")


@pytest.fixture
def server():
    H.log = []
    s = ThreadingHTTPServer(("127.0.0.1", 0), H)
    t = threading.Thread(target=s.serve_forever, daemon=True)
    t.start()
    yield f"http://127.0.0.1:{s.server_port}"
    s.shutdown()


def closed_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]
    s.close()
    return p


def src(name, url, **kw):
    kw.setdefault("domains", ["127.0.0.1"])
    return SourceConfig(name=name, url=url, independence_group=name.lower(), **kw)


def make(sources, link_only=None, seen=None, env=None, max_articles=60, timeout=0.5):
    logs = []
    client = HttpClient(timeout=timeout, host_interval=0)
    f = RssFetcher(SourcesConfig(sources, link_only or {}), NOW, seen=seen if seen is not None else {},
                   log=lambda k, m: logs.append((k, m)), client=client, env=env or {}, max_articles=max_articles)
    return f, logs


def test_bad_feeds_do_not_fail(server):
    f, logs = make([src("Bad500", server + "/feed500"), src("Garbage", server + "/garbage"),
                    src("Refused", f"http://127.0.0.1:{closed_port()}/feed"), src("Good", server + "/feed2")])
    arts = f.fetch()
    states = {h.name: h.state for h in f.health}
    assert states["Bad500"] == states["Garbage"] == states["Refused"] == "failed"
    assert states["Good"] == "ok"
    assert len(arts) == 2


def test_page_outcomes(server):
    seen = {}
    f, logs = make([src("Mixed", server + "/mixed")], seen=seen)
    arts = f.fetch()
    assert [a.url.rsplit("/", 1)[1] for a in arts] == ["ok"]
    base = server
    assert base + "/a/404" in seen                      # permanent: seen
    assert base + "/private/x" in seen                  # robots: seen
    assert base + "/private/x" not in H.log
    assert "/private/x" not in H.log
    assert base + "/a/500" not in seen                  # transient: retry
    assert base + "/a/429" not in seen
    assert base + "/slow" not in seen                   # timeout: retry
    assert base + "/a/ok" in seen


def test_cap(server):
    f, logs = make([src("Many", server + "/feed10")], max_articles=3)
    seen = f.seen
    arts = f.fetch()
    assert len(arts) == 3
    page_hits = [p for p in H.log if p.startswith("/a/")]
    assert len(page_hits) == 3
    assert len(seen) == 3                               # others retried next run
    assert any(k == "CAP" for k, _ in logs)


def test_guardian_key(server):
    g = src("Guardian", server + "/guardian?q=x", type="api", api_key_env="GUARDIAN_API_KEY")
    # skipped without key (load_sources level)
    import yaml, tempfile, os
    cfg = load_sources(env={})
    assert all(s.type != "api" for s in cfg.sources)
    cfg = load_sources(env={"GUARDIAN_API_KEY": KEY})
    assert any(s.type == "api" for s in cfg.sources)
    f, logs = make([g], env={"GUARDIAN_API_KEY": KEY})
    arts = f.fetch()
    assert len(arts) == 1 and KEY not in json.dumps([a.__dict__ for a in arts], default=str)
    assert KEY not in json.dumps(logs)
    # failing API with key: key not in log
    g2 = src("Guardian", server + "/feed500", type="api", api_key_env="GUARDIAN_API_KEY")
    f, logs = make([g2], env={"GUARDIAN_API_KEY": KEY})
    f.fetch()
    assert KEY not in json.dumps(logs) and KEY not in json.dumps([h.__dict__ for h in f.health])
    # refused connection with key
    g3 = src("Guardian", f"http://127.0.0.1:{closed_port()}/g", type="api", api_key_env="GUARDIAN_API_KEY")
    f, logs = make([g3], env={"GUARDIAN_API_KEY": KEY})
    f.fetch()
    assert KEY not in json.dumps(logs)


def test_prune_seen():
    seen = {"u1": "2026-10-01T00:00:00Z", "u2": "2026-10-10T00:00:00Z", "u3": "garbage"}
    out = seen_payload(seen, NOW)["urls"]
    assert list(out) == ["u2"]


def _patch_main(monkeypatch, server, sources):
    monkeypatch.setattr(run, "DEFAULT_SPEAKER", SpeakerConfig.from_dict(
        {"name": "Test Speaker", "aliases": ["Test Speaker", "Speaker"], "titles": ["the president"]}))
    monkeypatch.setattr(run, "load_sources", lambda path, **kw: SourcesConfig(sources, {}))
    orig = fetch.HttpClient.__init__
    monkeypatch.setattr(fetch.HttpClient, "__init__",
                        lambda self, *a, **k: orig(self, timeout=1, host_interval=0))


def test_live_main_writes_no_text_and_kill_switch(server, monkeypatch, tmp_path, capsys):
    out = tmp_path / "data"
    out.mkdir()
    (out / "seen.json").write_text(json.dumps({"version": 1, "urls": {
        "http://old/": "2026-09-01T00:00:00Z", "http://new/": "2026-10-15T00:00:00Z"}}))
    _patch_main(monkeypatch, server, [src("A", server + "/feed1", primary=True)])
    monkeypatch.setenv("AUTO_PUBLISH", "false")
    monkeypatch.setenv("GUARDIAN_API_KEY", KEY)
    assert run.main(["--live", "--out", str(out), "--now", "2026-10-17T18:00:00Z"]) == 0
    stdout = capsys.readouterr().out
    assert KEY not in stdout
    st = json.loads((out / "statements.json").read_text())
    assert st["statements"] == []                       # kill switch: nothing published
    pend = json.loads((out / "pending.json").read_text())
    assert len(pend["statements"]) == 1
    seen = json.loads((out / "seen.json").read_text())["urls"]
    assert "http://old/" not in seen and "http://new/" in seen
    # no article text persisted anywhere
    for p in out.glob("*.json"):
        txt = p.read_text()
        assert "for ten minutes" not in txt and KEY not in txt, p
    # second run with publishing on: seen items skipped (no refetch)
    H.log.clear()
    monkeypatch.setenv("AUTO_PUBLISH", "true")
    assert run.main(["--live", "--out", str(out), "--now", "2026-10-17T18:05:00Z"]) == 0
    assert not [p for p in H.log if p.startswith("/a/")]
    st = json.loads((out / "statements.json").read_text())
    assert len(st["statements"]) == 1                    # primary pending promoted
