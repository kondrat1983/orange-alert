import pytest

from pipeline.classify import REGIONS, classify


@pytest.mark.parametrize("quote,region", [
    ("The war in Ukraine must end", "ukraine"),
    ("Zelensky was here today", "ukraine"),
    ("Putin is not happy with this", "russia"),
    ("Russia has to stop and talk", "russia"),
    ("Greenland is a very important place for us", "greenland"),
    ("Canada should be our 51st state", "canada"),
    ("Europe must do more, much more", "eu_nato"),
    ("The talks with Iran go on", "middle_east"),
    ("Nothing to see here at all", None),
])
def test_region_from_quote(quote, region):
    assert classify(quote).region == region


@pytest.mark.parametrize("quote,triggers", [
    ("The war in Ukraine must end", True),
    ("Putin is not happy with this", True),          # DECISIONS: any statement about Putin/Russia
    ("Russia has to stop and talk", True),
    ("Greenland is a very important place for us", False),
    ("Canada is going up nicely", False),
    ("Europe must do more", False),
])
def test_alert_trigger_scope(quote, triggers):
    assert classify(quote).triggers_alert is triggers


def test_ukraine_mention_inside_other_region_still_triggers():
    c = classify("Greenland, Greenland, Greenland, and also Ukraine")
    assert c.region == "greenland" and c.triggers_alert


def test_california_is_us_domestic_with_state():
    c = classify("California needs a new approach to water.")
    assert (c.region, c.us_state, c.triggers_alert) == ("us_domestic", "California", False)


def test_state_name_does_not_break_other_regions():
    c = classify("Ukraine will be discussed in Texas next week")
    assert c.region == "ukraine" and c.triggers_alert


def test_region_falls_back_to_context_then_title():
    assert classify("It is a great place", context="He spoke about Greenland").region == "greenland"
    assert classify("It is a great place", title="Test Speaker on Canada").region == "canada"
    assert classify("It is a great place", context="Greenland", title="Canada").region == "greenland"


def test_quote_region_beats_context():
    assert classify("Greenland is great", context="Ukraine and Russia talks").region == "greenland"


@pytest.mark.parametrize("quote,flag", [
    ("Too many people have been killed in this war in Ukraine", True),
    ("Thousands of casualties on both sides", True),
    ("The victims deserve peace", True),
    ("The talks on Ukraine are moving forward", False),
])
def test_victims_flag(quote, flag):
    assert classify(quote).victims_flag is flag


def test_victims_flag_from_context():
    assert classify("This has to stop", context="after the attack left many dead in Ukraine").victims_flag


def test_topics():
    c = classify("We need a ceasefire and new sanctions, the deadline is two weeks")
    assert {"peace_talks", "sanctions", "deadline"} <= set(c.topics)
    assert "weapons" in classify("More Patriot missiles are coming").topics


def test_all_regions_known():
    assert "ukraine" in REGIONS and "us_domestic" in REGIONS
