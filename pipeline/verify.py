"""Verbatim check: a quote must appear in the source text after normalisation.

Normalisation folds curly quotes, dashes, ellipses, line breaks and whitespace,
and compares case-insensitively. An ellipsis inside a quote marks an omission,
so each ellipsis-separated segment must appear in the source, in order.
"""
from __future__ import annotations

import re
import unicodedata

_QUOTE_MAP = {
    "\u2018": "'", "\u2019": "'", "\u201a": "'", "\u201b": "'", "\u2032": "'",
    "\u201c": '"', "\u201d": '"', "\u201e": '"', "\u201f": '"', "\u2033": '"', "\u00ab": '"', "\u00bb": '"',
    "\u2010": "-", "\u2011": "-",  # hyphens stay hyphens
    "\u2012": " - ", "\u2013": " - ", "\u2014": " - ", "\u2015": " - ", "\u2212": " - ",  # dashes
    "\u2026": "...",
    "\u00a0": " ", "\u2009": " ", "\u202f": " ", "\u200b": "",
}
_TRANS = str.maketrans(_QUOTE_MAP)
_ELLIPSIS_RE = re.compile(r"\.(?:\s*\.){2,}")
_DASH_RE = re.compile(r"\s*-{2,}\s*|\s+-\s*|\s*-\s+")
_WS_RE = re.compile(r"\s+")
_EDGE_PUNCT = " \t\n,.;:'\"-"


def normalize(text: str) -> str:
    """Fold typography so that the same words compare equal."""
    text = unicodedata.normalize("NFKC", text).translate(_TRANS)
    text = _ELLIPSIS_RE.sub("...", text)
    text = _DASH_RE.sub(" - ", text)
    text = _WS_RE.sub(" ", text)
    return text.strip().casefold()


def segments(quote: str) -> list[str]:
    """Split a normalised quote into its ellipsis-separated segments."""
    parts = [p.strip(_EDGE_PUNCT) for p in normalize(quote).split("...")]
    return [p for p in parts if p]


def is_verbatim(quote: str, source_text: str) -> bool:
    """True if every segment of the quote appears in the source text, in order."""
    segs = segments(quote)
    if not segs:
        return False
    hay = normalize(source_text)
    pos = 0
    for seg in segs:
        idx = hay.find(seg, pos)
        if idx < 0:
            return False
        pos = idx + len(seg)
    return True
