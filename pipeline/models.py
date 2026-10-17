"""Data models shared by the pipeline."""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any

STATUS_PUBLISHED = "published"
STATUS_PENDING = "pending"
STATUS_RETRACTED = "retracted"

PLATFORMS = ("speech", "truth_social", "x", "interview", "press_conference", "unknown")


def utc_iso(dt: datetime) -> str:
    """Format a datetime as UTC ISO 8601 with a trailing Z."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_iso(value: str) -> datetime:
    """Parse an ISO 8601 timestamp; naive values are treated as UTC."""
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


@dataclass
class Source:
    outlet: str
    url: str
    independence_group: str
    primary: bool = False

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "Source":
        return cls(
            outlet=d["outlet"],
            url=d["url"],
            independence_group=d.get("independence_group") or d["outlet"],
            primary=bool(d.get("primary", False)),
        )


@dataclass
class Article:
    """One fetched news item (or transcript) with its full text."""
    outlet: str
    url: str
    independence_group: str
    primary: bool
    published_at: str  # UTC ISO
    title: str
    text: str

    @property
    def source(self) -> Source:
        return Source(self.outlet, self.url, self.independence_group, self.primary)


@dataclass
class Statement:
    id: str
    quote_en: str
    quote_uk: str | None = None
    translation: str | None = "machine"  # "machine" when quote_uk is machine-translated, else None
    is_paraphrase: bool = False
    said_at: str = ""  # UTC ISO
    platform: str = "unknown"
    region: str | None = None
    us_state: str | None = None
    topics: list[str] = field(default_factory=list)
    triggers_alert: bool = False
    victims_flag: bool = False
    sources: list[Source] = field(default_factory=list)
    status: str = STATUS_PENDING
    retract_reason: str | None = None

    @property
    def groups(self) -> set[str]:
        return {s.independence_group for s in self.sources}

    @property
    def has_primary(self) -> bool:
        return any(s.primary for s in self.sources)

    def add_source(self, src: Source) -> bool:
        """Add a source unless its URL is already listed. Returns True if added."""
        if any(s.url == src.url for s in self.sources):
            return False
        self.sources.append(src)
        return True

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        d["sources"] = [s.to_dict() for s in self.sources]
        return d

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "Statement":
        return cls(
            id=d["id"],
            quote_en=d["quote_en"],
            quote_uk=d.get("quote_uk"),
            translation=d.get("translation"),
            is_paraphrase=bool(d.get("is_paraphrase", False)),
            said_at=d.get("said_at", ""),
            platform=d.get("platform", "unknown"),
            region=d.get("region"),
            us_state=d.get("us_state"),
            topics=list(d.get("topics", [])),
            triggers_alert=bool(d.get("triggers_alert", False)),
            victims_flag=bool(d.get("victims_flag", False)),
            sources=[Source.from_dict(s) for s in d.get("sources", [])],
            status=d.get("status", STATUS_PENDING),
            retract_reason=d.get("retract_reason"),
        )
