"""Shared helpers. Only fake speakers and fake outlets: never a real person, never a real quote."""
from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from pipeline.extract import Extractor, SpeakerConfig  # noqa: E402
from pipeline.models import Article, Source, Statement  # noqa: E402
from pipeline.run import DecisionLog  # noqa: E402

FIXTURES = ROOT / "pipeline" / "fixtures"
NOW = datetime(2026, 10, 17, 18, 0, tzinfo=timezone.utc)

SPEAKER = SpeakerConfig.from_dict(
    {"name": "Test Speaker", "aliases": ["Test Speaker", "Speaker"], "titles": ["the president"]})


@pytest.fixture
def extractor():
    return Extractor(SPEAKER)


@pytest.fixture
def log():
    return DecisionLog()


def article(text, outlet="Example News", group=None, primary=False, at="2026-10-17T10:00:00Z",
            title="Test Speaker news", url=None):
    slug = outlet.lower().replace(" ", "-")
    return Article(outlet=outlet, url=url or f"https://example.com/{slug}/{abs(hash(text)) % 10**6}",
                   independence_group=group or slug, primary=primary, published_at=at,
                   title=title, text=text)


def statement(sid="st_1", quote="Greenland is a very important place for us.", at="2026-10-17T10:00:00Z",
              region="greenland", alert=False, para=False, victims=False, status="published",
              us_state=None, groups=("example-news", "example-wire")):
    return Statement(
        id=sid, quote_en=quote, is_paraphrase=para, said_at=at, region=region, us_state=us_state,
        triggers_alert=alert, victims_flag=victims, status=status,
        sources=[Source(g.title(), f"https://example.com/{g}/{sid}", g) for g in groups])
