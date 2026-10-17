"""Group candidates that report the same statement (fuzzy match on the quote)."""
from __future__ import annotations

from datetime import timedelta

from rapidfuzz import fuzz

from .models import parse_iso
from .verify import normalize

SIMILAR_RATIO = 90        # whole-quote similarity
CONTAINED_RATIO = 97      # one quote is (nearly) inside the other
MIN_CONTAINED_CHARS = 20  # ...and the shorter one is not just a few words
SAME_STATEMENT_WINDOW = timedelta(hours=72)


def same_quote(a: str, b: str) -> bool:
    na, nb = normalize(a), normalize(b)
    if not na or not nb:
        return False
    if na == nb or fuzz.ratio(na, nb) >= SIMILAR_RATIO:
        return True
    shorter = min(len(na), len(nb))
    return shorter >= MIN_CONTAINED_CHARS and fuzz.partial_ratio(na, nb) >= CONTAINED_RATIO


def within_window(t1: str, t2: str) -> bool:
    if not t1 or not t2:
        return True
    return abs(parse_iso(t1) - parse_iso(t2)) <= SAME_STATEMENT_WINDOW


def group_candidates(candidates):
    """Single-link clustering: quotes and paraphrases are never mixed."""
    groups: list[list] = []
    for c in candidates:
        home = None
        for g in groups:
            if any(
                o.is_paraphrase == c.is_paraphrase
                and within_window(o.article.published_at, c.article.published_at)
                and same_quote(o.quote, c.quote)
                for o in g
            ):
                home = g
                break
        if home is None:
            groups.append([c])
        else:
            home.append(c)
    return groups
