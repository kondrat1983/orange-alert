"""Fetchers return Articles. Only the offline FixtureFetcher exists for now;
network fetchers (RSS, transcripts) are a later task and must implement the same interface."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Protocol

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
