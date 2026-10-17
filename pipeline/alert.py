"""Alert level, Trump-day status and home counters. Pure functions of the data and `now`.

Levels (DECISIONS.md):
  orange  for 6 h after the last published, directly quoted statement that triggers the alert
  white   (all clear) for 1 h after orange ends
  yellow  a triggering quote waiting for a second source, a triggering paraphrase,
          or the first statement of his Washington day, each within YELLOW_WINDOW
  green   otherwise
Every result carries a factual `based_on` (EN) / `based_on_uk` (UA) line. No jokes here:
level names and funny texts live in the app and come from Kondrat.
"""
from __future__ import annotations

from collections import Counter
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from .models import STATUS_PUBLISHED, STATUS_RETRACTED, Statement, parse_iso, utc_iso

WASHINGTON = ZoneInfo("America/New_York")
KYIV = ZoneInfo("Europe/Kyiv")

ORANGE_HOURS = 6
ALL_CLEAR_HOURS = 1
# Assumption (not fixed in DECISIONS.md): how long a yellow trigger keeps the level yellow.
YELLOW_WINDOW_HOURS = 6
DAY_START_HOUR_ET = 5          # his "day" starts at 05:00 Washington time
NIGHT_START_HOUR_ET = 23       # 23:00-05:00 Washington time counts as night
NIGHT_RECENT_HOURS = 2         # night posting = a night statement in the last 2 h
BASELINE_24H = date(2024, 11, 5)  # "24 hours" promise baseline (election day)

EMOJI = {"green": "🟢", "yellow": "🟡", "orange": "🟠", "white": "⚪"}
DAY_EMOJI = {"asleep": "😴", "awake": "☀️", "at_mic": "🎤", "night_posting": "🌙", "busy_elsewhere": "🌍"}
REGION_NAMES = {
    "ukraine": ("Ukraine", "Україна"), "russia": ("Russia", "Росія"),
    "greenland": ("Greenland", "Гренландія"), "canada": ("Canada", "Канада"),
    "mexico": ("Mexico", "Мексика"), "panama": ("Panama", "Панама"), "china": ("China", "Китай"),
    "venezuela": ("Venezuela", "Венесуела"), "middle_east": ("Middle East", "Близький Схід"),
    "eu_nato": ("EU / NATO", "ЄС / НАТО"), "us_domestic": ("US domestic", "США: внутрішні справи"),
}


def _t(s: Statement) -> datetime:
    return parse_iso(s.said_at)


def _hm(dt: datetime, tz: ZoneInfo) -> str:
    return dt.astimezone(tz).strftime("%H:%M")


def _outlets(s: Statement) -> str:
    return ", ".join(dict.fromkeys(x.outlet for x in s.sources)) or "?"


def _region_name(region: str | None, us_state: str | None, uk: bool) -> str:
    if region is None:
        return "?"
    name = REGION_NAMES.get(region, (region, region))[1 if uk else 0]
    return f"{name} ({us_state})" if us_state else name


def _live(statements: list[Statement], now: datetime) -> list[Statement]:
    return sorted((s for s in statements if s.status == STATUS_PUBLISHED and s.said_at and _t(s) <= now), key=_t)


def day_start_et(now: datetime) -> datetime:
    local = now.astimezone(WASHINGTON)
    d = local.date() if local.hour >= DAY_START_HOUR_ET else local.date() - timedelta(days=1)
    return datetime.combine(d, time(DAY_START_HOUR_ET), WASHINGTON)


def _is_night(dt: datetime) -> bool:
    h = dt.astimezone(WASHINGTON).hour
    return h >= NIGHT_START_HOUR_ET or h < DAY_START_HOUR_ET


def compute_level(published: list[Statement], pending: list[Statement], now: datetime) -> dict:
    live = _live(published, now)
    quotes = [s for s in live if s.triggers_alert and not s.is_paraphrase]
    out = {"level": "green", "since": None, "until": None, "statement_id": None, "jokes_off": False}
    if quotes:
        last = quotes[-1]
        t = _t(last)
        orange_end = t + timedelta(hours=ORANGE_HOURS)
        clear_end = orange_end + timedelta(hours=ALL_CLEAR_HOURS)
        where_en = _region_name(last.region, None, False)
        where_uk = _region_name(last.region, None, True)
        base_en = f"statement about {where_en} at {_hm(t, KYIV)} Kyiv time ({_outlets(last)})"
        base_uk = f"заява про: {where_uk}, о {_hm(t, KYIV)} за Києвом (за даними {_outlets(last)})"
        if now < orange_end:
            out.update(level="orange", since=utc_iso(t), until=utc_iso(orange_end), statement_id=last.id,
                       jokes_off=last.victims_flag, based_on=base_en, based_on_uk=base_uk)
            return _emoji(out)
        if now < clear_end:
            out.update(level="white", since=utc_iso(orange_end), until=utc_iso(clear_end), statement_id=last.id,
                       based_on=f"6 h since the last {base_en}", based_on_uk=f"минуло 6 год після: {base_uk}")
            return _emoji(out)

    window = now - timedelta(hours=YELLOW_WINDOW_HOURS)
    waiting = [s for s in pending if s.status != STATUS_RETRACTED and s.triggers_alert
               and s.said_at and window <= _t(s) <= now]
    if waiting:
        s = max(waiting, key=_t)
        out.update(level="yellow", since=s.said_at, statement_id=None,
                   based_on=f"a statement about Ukraine is waiting for a second source ({_outlets(s)})",
                   based_on_uk=f"заява про Україну чекає на друге джерело (поки лише {_outlets(s)})")
        return _emoji(out)
    para = [s for s in live if s.triggers_alert and s.is_paraphrase and _t(s) >= window]
    if para:
        s = para[-1]
        out.update(level="yellow", since=s.said_at, statement_id=s.id, jokes_off=s.victims_flag,
                   based_on=f"paraphrase without a direct quote at {_hm(_t(s), KYIV)} Kyiv time ({_outlets(s)})",
                   based_on_uk=f"переказ без прямої цитати о {_hm(_t(s), KYIV)} за Києвом (за даними {_outlets(s)})")
        return _emoji(out)
    today = [s for s in live if _t(s) >= day_start_et(now)]
    if today and _t(today[0]) >= window:
        s = today[0]
        out.update(level="yellow", since=s.said_at,
                   based_on=f"first statement of his day at {_hm(_t(s), WASHINGTON)} Washington time ({_outlets(s)})",
                   based_on_uk=f"перший пост о {_hm(_t(s), WASHINGTON)} за Вашингтоном (за даними {_outlets(s)})")
        return _emoji(out)
    if quotes:
        t = _t(quotes[-1])
        out.update(based_on=f"no new statements about Ukraine since {_hm(t, KYIV)} Kyiv time, {t.astimezone(KYIV):%d.%m}",
                   based_on_uk=f"нових заяв про Україну немає з {_hm(t, KYIV)} за Києвом, {t.astimezone(KYIV):%d.%m}")
    else:
        out.update(based_on="no statements about Ukraine recorded", based_on_uk="заяв про Україну не зафіксовано")
    return _emoji(out)


def _emoji(d: dict) -> dict:
    d["emoji"] = EMOJI[d["level"]]
    return d


def compute_day_status(published: list[Statement], now: datetime) -> dict:
    live = _live(published, now)
    base = {"at_mic_source": None,  # 🎤 needs a machine-readable public schedule; not implemented yet
            "delay_note": True}     # statements reach us 10-60 min late; the UI must say so
    recent_night = [s for s in live if _is_night(_t(s)) and _t(s) >= now - timedelta(hours=NIGHT_RECENT_HOURS)]
    if _is_night(now) and recent_night:
        s = recent_night[-1]
        return _day(base, "night_posting", s,
                    f"statement at {_hm(_t(s), WASHINGTON)} Washington time ({_outlets(s)})",
                    f"заява о {_hm(_t(s), WASHINGTON)} за Вашингтоном (за даними {_outlets(s)})")
    today = [s for s in live if _t(s) >= day_start_et(now)]
    if not today:
        return _day(base, "asleep", None,
                    f"no public statements detected since {DAY_START_HOUR_ET:02d}:00 Washington time",
                    f"з {DAY_START_HOUR_ET:02d}:00 за Вашингтоном публічних заяв не виявлено")
    recent_alert = any(s.triggers_alert for s in today if _t(s) >= now - timedelta(hours=ORANGE_HOURS))
    elsewhere = [s for s in today if s.region and not s.triggers_alert]
    if elsewhere and not recent_alert and not today[-1].triggers_alert:
        counts = Counter((s.region, s.us_state) for s in elsewhere)
        top_n = max(counts.values())
        latest_top = [s for s in elsewhere if counts[(s.region, s.us_state)] == top_n][-1]
        region, state = latest_top.region, latest_top.us_state
        d = _day(base, "busy_elsewhere", latest_top,
                 f"{top_n} of {len(today)} statements today about {_region_name(region, state, False)}; "
                 f"latest at {_hm(_t(latest_top), WASHINGTON)} Washington time ({_outlets(latest_top)})",
                 f"сьогодні {top_n} з {len(today)} заяв про: {_region_name(region, state, True)}; "
                 f"остання о {_hm(_t(latest_top), WASHINGTON)} за Вашингтоном (за даними {_outlets(latest_top)})")
        d.update(region=region, us_state=state)
        return d
    s = today[0]
    return _day(base, "awake", s,
                f"first statement at {_hm(_t(s), WASHINGTON)} Washington time ({_outlets(s)})",
                f"перший пост о {_hm(_t(s), WASHINGTON)} за Вашингтоном (за даними {_outlets(s)})")


def _day(base: dict, state: str, s: Statement | None, en: str, uk: str) -> dict:
    d = dict(base)
    d.update(state=state, emoji=DAY_EMOJI[state], statement_id=s.id if s else None,
             region=None, us_state=None, based_on=en, based_on_uk=uk)
    return d


def compute_counters(published: list[Statement], now: datetime) -> dict:
    live = _live(published, now)
    ukr = [s for s in live if s.triggers_alert]
    kyiv_today = now.astimezone(KYIV).date()
    last = ukr[-1] if ukr else None
    return {
        # "Ukraine statement" = one that triggers the alert (Ukraine/Zelensky/war or Putin/Russia).
        "days_since_last_ukraine_statement":
            (kyiv_today - _t(last).astimezone(KYIV).date()).days if last else None,
        "last_ukraine_statement_id": last.id if last else None,
        "ukraine_statements_last_7_days": sum(1 for s in ukr if _t(s) >= now - timedelta(days=7)),
        "days_since_24h_promise_baseline": (kyiv_today - BASELINE_24H).days,
        "baseline_24h": BASELINE_24H.isoformat(),
    }


def compute_status(published: list[Statement], pending: list[Statement], now: datetime, auto_publish: bool = True) -> dict:
    return {
        "generated_at": utc_iso(now),
        "now_washington": now.astimezone(WASHINGTON).replace(microsecond=0).isoformat(),
        "now_kyiv": now.astimezone(KYIV).replace(microsecond=0).isoformat(),
        "auto_publish": auto_publish,
        "alert": compute_level(published, pending, now),
        "day": compute_day_status(published, now),
        "counters": compute_counters(published, now),
    }
