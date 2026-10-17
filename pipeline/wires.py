"""Wire byline detection (docs/SOURCES.md `wire_markers`).

A wire story republished by several outlets is one source, not several. When an
article's byline area carries a wire marker, its independence group becomes the
wire, whatever outlet it came through. Applied in run.process, so every fetcher
gets it.
"""
from __future__ import annotations

import re
from dataclasses import replace

from .models import Article

# Mirrors docs/SOURCES.md wire_markers. Case-sensitive on purpose ("AP", not "ap").
WIRE_MARKERS: dict[str, list[str]] = {
    "ap": ["Associated Press", "(AP)"],
    "reuters": ["Reuters"],
    "afp": ["AFP", "Agence France-Presse"],
}
# Bylines and datelines sit at the start; wire credits ("Reporting by ...") at the end.
BYLINE_CHARS = 400

_RULES = [(group, re.compile("|".join(
    re.escape(m) if not m[0].isalnum() else rf"\b{re.escape(m)}\b" for m in markers)))
    for group, markers in WIRE_MARKERS.items()]


def wire_group(article: Article) -> str | None:
    """Return the wire's independence group if the article's byline area names one."""
    text = article.text
    areas = [text[:BYLINE_CHARS], text[-BYLINE_CHARS:]] if len(text) > 2 * BYLINE_CHARS else [text]
    for area in areas:
        hits = [(m.start(), group) for group, rx in _RULES for m in [rx.search(area)] if m]
        if hits:
            return min(hits)[1]
    return None


def apply_wire_groups(articles: list[Article]) -> list[Article]:
    """Collapse wire copy to the wire's independence group. Primary sources are left alone."""
    out = []
    for a in articles:
        group = None if a.primary else wire_group(a)
        out.append(replace(a, independence_group=group) if group and group != a.independence_group else a)
    return out
