"""Deterministic extraction of quotes attributed to one speaker. No LLM.

Supported attribution patterns (straight or curly quotes):
  "...," Speaker said.            /  "...," said Speaker.
  Speaker said: "..."             /  Speaker wrote on Truth Social: "..."
  "...," the president said.      (only when the article is about the speaker)
  Speaker said the deal was "very close".   (partial quote)
A sentence where the speaker "said" something with no quotation marks is a
paraphrase, extracted only when the article has no direct quote from him.

Anything not clearly attributed to the speaker is skipped. Being strict here
is the point: a missed quote costs nothing, a misattributed one is a lie.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from .models import Article

VERBS = (
    "said", "says", "wrote", "writes", "posted", "posts", "told", "tells", "added", "adds",
    "declared", "declares", "stated", "states", "insisted", "insists", "claimed", "claims",
    "warned", "warns", "remarked", "argued", "argues", "replied", "replies", "continued",
    "asked", "asks", "boasted", "promised", "promises", "announced", "announces",
)
PARAPHRASE_VERBS = (
    "said", "says", "claimed", "claims", "suggested", "suggests", "argued", "argues",
    "insisted", "insists", "promised", "promises", "warned", "warns", "told", "tells",
)
# Words allowed directly before a speaker alias (otherwise "Melania Trump said" would match "Trump said").
ALLOWED_PREFIXES = {"president", "donald", "mr", "mr.", "us", "u.s.", "former", "then"}
MIN_QUOTE_WORDS = 3
SENTENCE_STARTERS = {
    "then", "later", "earlier", "but", "and", "so", "now", "still", "yet", "meanwhile", "however",
    "also", "instead", "here", "there", "when", "while", "after", "before", "today", "yesterday",
    "on", "in", "at", "as", "if", "because", "since", "although", "though",
}

# Partial quotes ('Speaker said the deal was "very close"') are taken only when nothing between the
# speaker's verb and the opening quote could make the words someone else's: no other name, no other
# subject ("the report", "officials", "she"), no speech or characterisation verb ("called", "dubbed").
CHARACTERISATION_VERBS = (
    "call", "calls", "called", "calling", "describe", "describes", "described", "describing",
    "label", "labels", "labelled", "labeled", "term", "terms", "termed", "dub", "dubs", "dubbed",
    "brand", "brands", "branded", "deem", "deems", "deemed", "characterised", "characterized",
    "characterises", "characterizes", "refer", "refers", "referred", "quote", "quotes", "quoted",
    "cite", "cites", "cited", "report", "reports", "reported", "reporting", "according",
    "write", "wrote", "written", "say", "saying", "tweeted", "posted", "put", "puts", "summed",
)
OTHER_SUBJECTS = (
    "she", "her", "they", "them", "their", "we", "you", "i", "report", "reports", "officials",
    "official", "aides", "aide", "critics", "critic", "analysts", "analyst", "experts", "expert",
    "statement", "spokesman", "spokeswoman", "spokesperson", "sources", "source", "lawmakers",
    "observers", "commentators", "media", "newspaper", "article", "editorial", "letter", "memo",
    "document", "documents", "others", "someone", "people", "government", "ministry", "agency",
)
_OTHER_PARTY_RE = re.compile(rf"\b(?:{'|'.join(CHARACTERISATION_VERBS + OTHER_SUBJECTS)})\b", re.I)
_CAPITALISED_RE = re.compile(r"\b[A-Z]")

_QUOTE_RE = re.compile(r"[\"“”]([^\"“”]+?)[\"“”]")
_SENT_END_RE = re.compile(r"[.!?](?=\s|$)|\n\s*\n")
_OTHER_PRESIDENT_RE = re.compile(r"\bPresident\s+([A-Z][\w'-]+)")
_ADVERB = r"(?:\s+(?:also|later|then|again|once|simply|repeatedly|\w+ly))?"


@dataclass
class SpeakerConfig:
    name: str
    aliases: list[str]
    titles: list[str] = field(default_factory=lambda: ["the president"])

    @classmethod
    def from_dict(cls, d: dict) -> "SpeakerConfig":
        aliases = d.get("aliases") or [d["name"]]
        return cls(name=d["name"], aliases=list(aliases), titles=list(d.get("titles", ["the president"])))


DEFAULT_SPEAKER = SpeakerConfig(
    name="Donald Trump",
    aliases=["President Donald Trump", "President Trump", "Donald Trump", "Trump"],
    titles=["the president", "the US president", "the U.S. president"],
)


@dataclass
class Candidate:
    quote: str
    is_paraphrase: bool
    article: Article
    context: str  # the sentence (or paragraph) around the quote, for classification
    platform: str


def _alt(words) -> str:
    return "|".join(re.escape(w) for w in sorted(words, key=len, reverse=True))


class Extractor:
    def __init__(self, speaker: SpeakerConfig):
        self.speaker = speaker
        alias = _alt(speaker.aliases)
        title = _alt(speaker.titles)
        verb = _alt(VERBS)
        self._alias_re = re.compile(rf"\b(?:{alias})\b")
        self._title_re = re.compile(rf"\b(?:{title})\b", re.I)
        # Quote followed by attribution: '"...," Speaker said' or '"...," said Speaker'.
        self._after_alias = re.compile(rf"^\s*,?\s*(?P<who>{alias}){_ADVERB}\s+(?:{verb})\b")
        self._after_alias_inv = re.compile(rf"^\s*,?\s*(?:{verb})\s+(?P<who>{alias})\b")
        self._after_title = re.compile(rf"^\s*,?\s*(?:{title}){_ADVERB}\s+(?:{verb})\b", re.I)
        self._after_title_inv = re.compile(rf"^\s*,?\s*(?:{verb})\s+(?:{title})\b", re.I)
        # Attribution before the quote, ending in ':' or ',' right before it.
        self._before_full = re.compile(
            rf"(?P<who>{alias}){_ADVERB}\s+(?P<verb>{verb})\b(?P<gap>[^\"“”]{{0,100}}?)[:,]\s*$")
        self._before_title = re.compile(
            rf"(?:{title}){_ADVERB}\s+(?P<verb>{verb})\b(?P<gap>[^\"“”]{{0,100}}?)[:,]\s*$", re.I)
        # Partial quote: attribution earlier in the same sentence, no colon needed.
        self._before_partial = re.compile(rf"(?P<who>{alias}){_ADVERB}\s+(?P<verb>{verb})\b(?P<gap>.*)$")
        self._any_verb = re.compile(rf"\b(?:{verb})\b", re.I)
        self._paraphrase = re.compile(
            rf"(?P<who>{alias}){_ADVERB}\s+(?:{_alt(PARAPHRASE_VERBS)})\b(?:\s+\w+)?\s+(?:that\s+)?\w+")

    # --- helpers -------------------------------------------------------
    def _alias_ok(self, text: str, start: int, end: int) -> bool:
        """Reject aliases that are part of another person's name ("Melania Trump", "Trump Jr.")."""
        after = text[end:end + 5]
        if re.match(r",?\s*Jr\b", after):
            return False
        before = text[:start].rstrip()
        m = re.search(r"([\w.'-]+)$", before)
        if not m:
            return True
        word = m.group(1)
        if not word[:1].isupper() or word.casefold() in ALLOWED_PREFIXES:
            return True
        # A capitalised adverb or conjunction at the start of a sentence ("Then Trump said") is fine;
        # any other capitalised word is taken to be part of another person's name.
        return word.casefold() in SENTENCE_STARTERS

    def is_about_speaker(self, article: Article) -> bool:
        if self._alias_re.search(article.title):
            return True
        return len(self._alias_re.findall(article.text)) >= 2

    def _title_ok(self, article: Article, text: str, pos: int) -> bool:
        """'The president said' counts only in an article about the speaker, with no other President X nearby."""
        if not self.is_about_speaker(article):
            return False
        window = text[max(0, pos - 400):pos]
        own = {w.casefold() for a in self.speaker.aliases for w in a.split()}
        for m in _OTHER_PRESIDENT_RE.finditer(window):
            if m.group(1).casefold() not in own:
                return False
        return True

    @staticmethod
    def _sentence_start(text: str, pos: int, floor: int) -> int:
        start = floor
        for m in _SENT_END_RE.finditer(text, floor, pos):
            start = m.end()
        return start

    # --- extraction ------------------------------------------------------
    def extract(self, article: Article) -> list[Candidate]:
        out: list[Candidate] = []
        for para in re.split(r"\n\s*\n", article.text):
            out.extend(self._extract_paragraph(article, para))
        if not out:
            out.extend(self._extract_paraphrases(article))
        return out

    def _extract_paragraph(self, article: Article, text: str) -> list[Candidate]:
        found: list[Candidate] = []
        prev_end = 0
        for m in _QUOTE_RE.finditer(text):
            raw = m.group(1)
            q_start, q_end = m.start(), m.end()
            after = text[q_end:q_end + 80]
            before = text[self._sentence_start(text, q_start, prev_end):q_start]
            prev_end = q_end
            clause = self._attribution(article, text, raw, before, after, q_start, q_end)
            if clause is None:
                continue
            quote = _clean_quote(raw)
            if len(quote.split()) < MIN_QUOTE_WORDS:
                continue
            sent_start = self._sentence_start(text, q_start, 0)
            sent_end_m = _SENT_END_RE.search(text, q_end)
            context = text[sent_start:sent_end_m.end() if sent_end_m else len(text)]
            found.append(Candidate(
                quote=quote, is_paraphrase=False, article=article, context=context.strip(),
                platform=detect_platform(clause + " " + context, article.title),
            ))
        return found

    def _attribution(self, article, text, raw, before, after, q_start, q_end) -> str | None:
        """Return the attribution clause if the quote belongs to the speaker, else None."""
        # Attribution after the quote only when the quote is left "open" for it:
        # '"We will win," he said' / '"Will we?" he asked'. Not after a full stop.
        open_end = raw.rstrip()[-1:] in (",", "!", "?", "-") or after.lstrip().startswith(",")
        if open_end:
            for rx in (self._after_alias, self._after_alias_inv):
                m = rx.match(after)
                if m and self._alias_ok(text, q_end + m.start("who"), q_end + m.end("who")):
                    return m.group(0)
            for rx in (self._after_title, self._after_title_inv):
                m = rx.match(after)
                if m and self._title_ok(article, text, q_start):
                    return m.group(0)
            # Someone else is attributed right after the quote ('"...," Other Person said') -> not ours.
            if re.match(r"^\s*,?\s*[^.!?\"“”]{0,40}?\b(?:%s)\b" % _alt(VERBS), after):
                return None
        base = len(text[:q_start]) - len(before)
        m = self._before_full.search(before)
        if m and not self._any_verb.search(m.group("gap")) and self._alias_ok(text, base + m.start("who"), base + m.end("who")):
            return m.group(0)
        m = self._before_title.search(before)
        if m and not self._any_verb.search(m.group("gap")) and self._title_ok(article, text, q_start):
            return m.group(0)
        m = self._before_partial.search(before)
        if (m and not self._any_verb.search(m.group("gap"))
                and not _QUOTE_RE.search(m.group("gap"))
                and not _OTHER_PARTY_RE.search(m.group("gap"))
                and not _CAPITALISED_RE.search(m.group("gap"))
                and self._alias_ok(text, base + m.start("who"), base + m.end("who"))):
            return m.group(0)
        return None

    def _extract_paraphrases(self, article: Article) -> list[Candidate]:
        found = []
        for para in re.split(r"\n\s*\n", article.text):
            pos = 0
            for sm in list(_SENT_END_RE.finditer(para)) + [None]:
                end = sm.end() if sm else len(para)
                sentence = para[pos:end].strip()
                pos = end
                if not sentence or re.search(r"[\"“”]", sentence):
                    continue
                m = self._paraphrase.search(sentence)
                if not m:
                    continue
                offset = para.find(sentence)
                if not self._alias_ok(para, offset + m.start("who"), offset + m.end("who")):
                    continue
                flat = re.sub(r"\s+", " ", sentence)
                if len(flat.split()) < MIN_QUOTE_WORDS + 2:
                    continue
                found.append(Candidate(
                    quote=flat, is_paraphrase=True, article=article, context=flat,
                    platform=detect_platform(flat, article.title),
                ))
        return found


def _clean_quote(raw: str) -> str:
    """Collapse whitespace and drop the journalistic trailing comma ('"We will win," he said')."""
    q = re.sub(r"\s+", " ", raw).strip()
    return q.rstrip(",;: ").strip()


_PLATFORM_RULES = [
    ("truth_social", re.compile(r"\bTruth Social\b", re.I)),
    ("x", re.compile(r"\b(?:on X|X post|posted on X|on Twitter|tweet(?:ed)?)\b")),
    ("interview", re.compile(r"\binterview\b", re.I)),
    ("press_conference", re.compile(r"\b(?:press conference|news conference|told reporters|briefing|press gaggle)\b", re.I)),
    ("speech", re.compile(r"\b(?:speech|rally|remarks|address(?:ed)?)\b", re.I)),
]


def detect_platform(context: str, title: str = "") -> str:
    for text in (context, title):
        for name, rx in _PLATFORM_RULES:
            if rx.search(text):
                return name
    return "unknown"
