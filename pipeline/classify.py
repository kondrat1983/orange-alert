"""Keyword rules for region, topics, alert trigger and victims flag. No LLM.

Region is decided from the quote first; if the quote names no place, from the
sentence around it; then from the article title.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

# Order matters for ties: earlier regions win.
REGION_KEYWORDS: dict[str, list[str]] = {
    "ukraine": ["Ukraine", "Ukrainian", "Ukrainians", "Kyiv", "Kiev", "Zelensky", "Zelenskyy", "Zelenskiy",
                "Donbas", "Donbass", "Donetsk", "Luhansk", "Crimea", "Kharkiv", "Odesa", "Odessa",
                "Zaporizhzhia", "Kherson"],
    "russia": ["Russia", "Russian", "Russians", "Putin", "Kremlin", "Moscow"],
    "greenland": ["Greenland", "Denmark", "Danish", "Copenhagen", "Nuuk"],
    "canada": ["Canada", "Canadian", "Canadians", "Ottawa", "51st state"],
    "mexico": ["Mexico", "Mexican", "Mexicans", "Gulf of America"],
    "panama": ["Panama", "Panama Canal"],
    "china": ["China", "Chinese", "Beijing", "Xi Jinping", "Taiwan"],
    "venezuela": ["Venezuela", "Venezuelan", "Maduro", "Caracas"],
    "middle_east": ["Israel", "Israeli", "Gaza", "Hamas", "Iran", "Iranian", "Tehran", "Netanyahu",
                    "Hezbollah", "Middle East", "Lebanon", "Syria", "Saudi"],
    "eu_nato": ["NATO", "European Union", "EU", "Brussels", "Europe", "European", "Europeans"],
    "us_domestic": ["Congress", "Senate", "House Democrats", "Democrats", "Republicans", "governor",
                    "federal judge", "Supreme Court", "the border", "midterms"],
}
REGIONS = tuple(REGION_KEYWORDS)
ALERT_REGIONS = {"ukraine", "russia"}  # DECISIONS: Ukraine/Zelensky/war + Putin/Russia

US_STATES = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
    "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
    "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri",
    "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York",
    "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island",
    "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia",
    "Washington State", "West Virginia", "Wisconsin", "Wyoming",
]

TOPIC_KEYWORDS: dict[str, list[str]] = {
    "war": ["war", "invasion", "front line", "frontline", "fighting", "troops", "battlefield", "offensive"],
    "peace_talks": ["peace", "talks", "negotiation", "negotiations", "negotiate", "ceasefire", "cease-fire",
                    "deal", "summit", "truce", "agreement"],
    "aid": ["aid", "assistance", "funding", "billion", "money", "support package"],
    "weapons": ["weapons", "weapon", "missiles", "missile", "Patriot", "Patriots", "Tomahawk", "Tomahawks",
                "arms", "ammunition", "F-16", "air defense", "air defence"],
    "sanctions": ["sanction", "sanctions", "secondary tariffs", "oil buyers"],
    "territory": ["territory", "territories", "land", "border", "borders", "annex", "annexation",
                  "Crimea", "Donbas"],
    "tariffs": ["tariff", "tariffs"],
    "deadline": ["two weeks", "deadline", "24 hours", "ultimatum",
                 r"\d+\s+days", r"(?:ten|twelve|fifteen|twenty|thirty|forty|fifty)\s+days"],
}

VICTIMS_KEYWORDS = [
    "killed", "kill", "killing", "dead", "death", "deaths", "died", "casualties", "victims", "victim",
    "wounded", "injured", "bodies", "lost their lives", "massacre", "slaughter",
]


def _rx(words: list[str]) -> re.Pattern:
    alts = []
    for w in sorted(words, key=len, reverse=True):
        alts.append(w if ("\\" in w or "(" in w) else re.escape(w))
    return re.compile(r"\b(?:" + "|".join(alts) + r")\b")


# All-caps acronyms (EU, NATO) match case-sensitively; other region words case-insensitively.
def _region_patterns(words: list[str]) -> list[re.Pattern]:
    caps = [w for w in words if w.isupper()]
    rest = [w for w in words if not w.isupper()]
    pats = []
    if caps:
        pats.append(_rx(caps))
    if rest:
        pats.append(re.compile(_rx(rest).pattern, re.I))
    return pats


_REGION_RX = {r: _region_patterns(ws) for r, ws in REGION_KEYWORDS.items()}
_TOPIC_RX = {t: re.compile(_rx(ws).pattern, re.I) for t, ws in TOPIC_KEYWORDS.items()}
_STATE_RX = re.compile(_rx(US_STATES).pattern)
_VICTIMS_RX = re.compile(_rx(VICTIMS_KEYWORDS).pattern, re.I)


@dataclass
class Classification:
    region: str | None
    us_state: str | None
    topics: list[str]
    triggers_alert: bool
    victims_flag: bool


def _region_hits(text: str) -> dict[str, int]:
    hits: dict[str, int] = {}
    for region, pats in _REGION_RX.items():
        n = sum(len(p.findall(text)) for p in pats)
        if n:
            hits[region] = n
    state = _STATE_RX.search(text)
    if state:
        hits["us_domestic"] = hits.get("us_domestic", 0) + 1
    return hits


def _best(hits: dict[str, int]) -> str | None:
    if not hits:
        return None
    return max(REGIONS, key=lambda r: (hits.get(r, 0), -REGIONS.index(r)))


def classify(quote: str, context: str = "", title: str = "") -> Classification:
    region = None
    us_state = None
    for text in (quote, context, title):
        hits = _region_hits(text)
        if hits:
            region = _best(hits)
            if region == "us_domestic":
                m = _STATE_RX.search(text)
                us_state = m.group(0).replace(" State", "") if m else None
            break
    near = f"{quote} {context}"
    topics = [t for t, rx in _TOPIC_RX.items() if rx.search(near)]
    triggers = region in ALERT_REGIONS or any(
        _region_hits(quote).get(r) for r in ALERT_REGIONS)
    victims = bool(_VICTIMS_RX.search(near))
    return Classification(region, us_state, topics, triggers, victims)
