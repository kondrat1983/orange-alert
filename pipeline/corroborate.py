"""Corroboration rule (SPEC 5.4).

Publish only when at least two different independence groups carry the same
verbatim quote, or one primary source does. Everything else is pending.
"""
from __future__ import annotations

from .verify import is_verbatim, normalize

MIN_GROUPS = 2


def carriers(quote: str, candidates) -> list:
    """Candidates whose article text contains this exact quote (after normalisation)."""
    return [c for c in candidates if is_verbatim(quote, c.article.text)]


def pick_canonical(candidates) -> tuple[str, list]:
    """Choose the quote wording carried by the most independence groups (ties: longest).

    Returns (quote, carrying candidates). For paraphrases every candidate in the
    group counts, since wording differs by design.
    """
    if candidates[0].is_paraphrase:
        best = max(candidates, key=lambda c: (c.article.primary, len(c.quote)))
        return best.quote, list(candidates)
    best_key, best = None, None
    seen = set()
    for c in candidates:
        key = normalize(c.quote)
        if key in seen:
            continue
        seen.add(key)
        carry = carriers(c.quote, candidates)
        groups = {x.article.independence_group for x in carry}
        rank = (len(groups), any(x.article.primary for x in carry), len(c.quote))
        if best_key is None or rank > best_key:
            best_key, best = rank, (c.quote, carry)
    return best


def is_corroborated(sources) -> tuple[bool, str]:
    """Decide from a statement's sources. Returns (ok, reason)."""
    groups = {s.independence_group for s in sources}
    if any(s.primary for s in sources):
        return True, "primary source"
    if len(groups) >= MIN_GROUPS:
        return True, f"{len(groups)} independent groups: {', '.join(sorted(groups))}"
    return False, f"only {len(groups)} independence group ({', '.join(sorted(groups))}); waiting for a second"
