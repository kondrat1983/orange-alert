from datetime import date, datetime, timedelta

import pytest

from conftest import statement
from pipeline.alert import (BASELINE_24H, KYIV, WASHINGTON, compute_counters, compute_day_status,
                            compute_level, compute_status, day_start_et)


def utc(s):
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


UKR = dict(region="ukraine", alert=True)
T0 = "2026-10-17T10:00:00Z"


def level(pub, now, pend=()):
    return compute_level(list(pub), list(pend), utc(now))


# --- alert level -----------------------------------------------------------

def test_green_when_empty():
    assert level([], "2026-10-17T12:00:00Z")["level"] == "green"


def test_orange_six_hours_then_white_one_hour_then_green():
    s = statement(at=T0, **UKR)
    assert level([s], "2026-10-17T10:00:00Z")["level"] == "orange"
    assert level([s], "2026-10-17T15:59:59Z")["level"] == "orange"
    assert level([s], "2026-10-17T16:00:00Z")["level"] == "white"
    assert level([s], "2026-10-17T16:59:59Z")["level"] == "white"
    assert level([s], "2026-10-17T17:00:00Z")["level"] not in ("white", "orange")


def test_orange_has_since_until_and_reason():
    r = level([statement(at=T0, **UKR)], "2026-10-17T11:00:00Z")
    assert r["since"] == "2026-10-17T10:00:00Z" and r["until"] == "2026-10-17T16:00:00Z"
    assert r["based_on"] and r["based_on_uk"] and r["emoji"] == "\U0001F7E0"


def test_new_statement_extends_orange():
    a, b = statement("a", at=T0, **UKR), statement("b", at="2026-10-17T14:00:00Z", **UKR)
    r = level([a, b], "2026-10-17T18:00:00Z")
    assert r["level"] == "orange" and r["statement_id"] == "b"


def test_non_alert_region_never_orange():
    r = level([statement(at=T0, region="greenland", alert=False)], "2026-10-17T10:30:00Z")
    assert r["level"] != "orange"


def test_paraphrase_never_orange():
    r = level([statement(at=T0, para=True, **UKR)], "2026-10-17T10:30:00Z")
    assert r["level"] == "yellow"


def test_pending_trigger_is_yellow():
    p = statement(at=T0, status="pending", groups=("example-news",), **UKR)
    r = level([], "2026-10-17T11:00:00Z", pend=[p])
    assert r["level"] == "yellow" and "second source" in r["based_on"]


def test_retracted_never_counts():
    s = statement(at=T0, status="retracted", **UKR)
    assert level([s], "2026-10-17T10:30:00Z")["level"] == "green"
    p = statement(at=T0, status="retracted", **UKR)
    assert level([], "2026-10-17T10:30:00Z", pend=[p])["level"] == "green"


def test_future_statement_ignored():
    assert level([statement(at="2026-10-17T20:00:00Z", **UKR)], "2026-10-17T12:00:00Z")["level"] == "green"


def test_victims_turns_jokes_off_only_for_that_statement():
    assert level([statement(at=T0, victims=True, **UKR)], "2026-10-17T11:00:00Z")["jokes_off"] is True
    assert level([statement(at=T0, **UKR)], "2026-10-17T11:00:00Z")["jokes_off"] is False


def test_yellow_for_first_statement_of_day():
    s = statement(at="2026-10-17T11:00:00Z", region="greenland")   # 07:00 ET
    r = level([s], "2026-10-17T12:00:00Z")
    assert r["level"] == "yellow" and "Washington" in r["based_on"]


def test_white_follows_orange_not_yellow():
    s = statement(at=T0, **UKR)
    assert level([s], "2026-10-17T16:30:00Z")["level"] == "white"


# --- Trump-day status -------------------------------------------------------

def day(pub, now):
    return compute_day_status(list(pub), utc(now))


def test_asleep_without_statements():
    d = day([], "2026-10-17T12:00:00Z")
    assert d["state"] == "asleep" and d["delay_note"] is True


def test_awake_after_first_statement():
    d = day([statement(at="2026-10-17T11:00:00Z", region="canada")], "2026-10-17T13:00:00Z")
    assert d["state"] == "awake"


def test_statement_before_0500_et_does_not_wake_the_new_day():
    # 08:30Z = 04:30 EDT belongs to the previous Washington day; now 10:00Z = 06:00 EDT.
    d = day([statement(at="2026-10-17T08:30:00Z", region="canada")], "2026-10-17T10:00:00Z")
    assert d["state"] == "asleep"


def test_night_posting():
    d = day([statement(at="2026-10-18T04:00:00Z", region="canada")], "2026-10-18T05:00:00Z")  # 00:00 / 01:00 EDT
    assert d["state"] == "night_posting"


def test_busy_elsewhere_needs_two_statements_and_names_region():
    a = statement("a", at="2026-10-17T11:00:00Z", region="greenland")
    b = statement("b", at="2026-10-17T12:00:00Z", region="greenland")
    d = day([a, b], "2026-10-17T14:00:00Z")
    assert d["state"] == "busy_elsewhere" and d["region"] == "greenland"
    assert day([a], "2026-10-17T14:00:00Z")["state"] == "awake"


def test_busy_elsewhere_carries_us_state():
    a = statement("a", at="2026-10-17T11:00:00Z", region="us_domestic", us_state="California")
    b = statement("b", at="2026-10-17T12:00:00Z", region="us_domestic", us_state="California")
    d = day([a, b], "2026-10-17T14:00:00Z")
    assert d["state"] == "busy_elsewhere" and d["us_state"] == "California"
    assert "California" in d["based_on"]


def test_not_busy_elsewhere_when_ukraine_recent():
    a = statement("a", at="2026-10-17T11:00:00Z", region="greenland")
    b = statement("b", at="2026-10-17T12:00:00Z", region="greenland")
    c = statement("c", at="2026-10-17T13:00:00Z", **UKR)
    assert day([a, b, c], "2026-10-17T14:00:00Z")["state"] != "busy_elsewhere"


def test_at_mic_state_never_emitted():
    for now in ("2026-10-17T05:00:00Z", "2026-10-17T14:00:00Z", "2026-10-18T03:00:00Z"):
        assert day([statement(at="2026-10-17T11:00:00Z")], now)["state"] != "at_mic"


def test_every_day_status_states_its_basis():
    d = day([statement(at="2026-10-17T11:00:00Z", region="canada")], "2026-10-17T13:00:00Z")
    assert d["based_on"] and d["based_on_uk"]


# --- time zones ------------------------------------------------------------

@pytest.mark.parametrize("now,wash,kyiv,gap", [
    ("2026-01-15T12:00:00Z", "-05:00", "+02:00", 7),      # both winter
    ("2026-07-15T12:00:00Z", "-04:00", "+03:00", 7),      # both summer
    ("2026-03-15T12:00:00Z", "-04:00", "+02:00", 6),      # US already on DST, Kyiv not yet (gap week)
    ("2026-03-28T12:00:00Z", "-04:00", "+02:00", 6),
    ("2026-03-30T12:00:00Z", "-04:00", "+03:00", 7),      # Kyiv switched 29 Mar
    ("2026-10-28T12:00:00Z", "-04:00", "+02:00", 6),      # Kyiv back on 25 Oct, US still DST until 1 Nov
    ("2026-11-02T12:00:00Z", "-05:00", "+02:00", 7),
])
def test_status_timezones_across_dst_gap_weeks(now, wash, kyiv, gap):
    st = compute_status([], [], utc(now))
    assert st["now_washington"].endswith(wash)
    assert st["now_kyiv"].endswith(kyiv)
    n = utc(now)
    assert (n.astimezone(KYIV).utcoffset() - n.astimezone(WASHINGTON).utcoffset()) == timedelta(hours=gap)


def test_based_on_uses_correct_local_times_in_gap_week():
    s = statement(at="2026-10-28T13:30:00Z", **UKR)           # 09:30 EDT, 15:30 EET
    r = level([s], "2026-10-28T14:00:00Z")
    assert "15:30" in r["based_on"] and "15:30" in r["based_on_uk"]
    d = day([statement(at="2026-10-28T13:30:00Z", region="canada")], "2026-10-28T14:00:00Z")
    assert "09:30" in d["based_on"]


@pytest.mark.parametrize("now,expected", [
    ("2026-10-17T18:00:00Z", "2026-10-17T05:00:00-04:00"),
    ("2026-10-17T08:00:00Z", "2026-10-16T05:00:00-04:00"),    # 04:00 ET -> still previous day
    ("2026-11-01T10:30:00Z", "2026-11-01T05:00:00-05:00"),    # day of US fall-back
    ("2026-03-08T12:00:00Z", "2026-03-08T05:00:00-04:00"),    # day of US spring-forward
])
def test_day_start_is_0500_washington(now, expected):
    assert day_start_et(utc(now)).isoformat() == expected


# --- counters --------------------------------------------------------------

def test_baseline_24h_is_election_day_2024():
    assert BASELINE_24H == date(2024, 11, 5)
    c = compute_counters([], utc("2026-10-17T12:00:00Z"))
    assert c["days_since_24h_promise_baseline"] == 711 and c["baseline_24h"] == "2024-11-05"


def test_baseline_counter_rolls_over_at_kyiv_midnight():
    # 20:59Z = 23:59 Kyiv (EEST, +3) on 17 Oct; 21:00Z = 00:00 on 18 Oct.
    assert compute_counters([], utc("2026-10-17T20:59:59Z"))["days_since_24h_promise_baseline"] == 711
    assert compute_counters([], utc("2026-10-17T21:00:00Z"))["days_since_24h_promise_baseline"] == 712


def test_baseline_counter_uses_winter_offset():
    # After 25 Oct Kyiv is +2: midnight is 22:00Z.
    assert compute_counters([], utc("2026-11-05T21:59:00Z"))["days_since_24h_promise_baseline"] == 730
    assert compute_counters([], utc("2026-11-05T22:00:00Z"))["days_since_24h_promise_baseline"] == 731


def test_days_since_last_ukraine_statement_by_kyiv_date():
    s = statement(at="2026-10-16T22:30:00Z", **UKR)       # 01:30 on 17 Oct in Kyiv
    assert compute_counters([s], utc("2026-10-17T10:00:00Z"))["days_since_last_ukraine_statement"] == 0
    s2 = statement(at="2026-10-17T20:30:00Z", **UKR)      # 23:30 Kyiv on 17 Oct
    assert compute_counters([s2], utc("2026-10-17T21:30:00Z"))["days_since_last_ukraine_statement"] == 1


def test_counters_none_without_statements_and_7_day_window():
    assert compute_counters([], utc("2026-10-17T12:00:00Z"))["days_since_last_ukraine_statement"] is None
    old = statement("o", at="2026-10-09T12:00:00Z", **UKR)
    new = statement("n", at="2026-10-12T12:00:00Z", **UKR)
    other = statement("g", at="2026-10-12T12:00:00Z", region="greenland")
    c = compute_counters([old, new, other], utc("2026-10-17T12:00:00Z"))
    assert c["ukraine_statements_last_7_days"] == 1 and c["last_ukraine_statement_id"] == "n"


def test_retracted_excluded_from_counters():
    s = statement(at="2026-10-16T12:00:00Z", status="retracted", **UKR)
    assert compute_counters([s], utc("2026-10-17T12:00:00Z"))["days_since_last_ukraine_statement"] is None
