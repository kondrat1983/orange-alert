from conftest import article
from pipeline.dedup import group_candidates, same_quote, within_window
from pipeline.extract import Candidate


def cand(quote, para=False, at="2026-10-17T10:00:00Z", outlet="Example News"):
    a = article(quote, outlet=outlet, at=at)
    return Candidate(quote=quote, is_paraphrase=para, article=a, context=quote, platform="unknown")


def test_same_quote_ignores_typography_and_case():
    assert same_quote("It's a very good deal for us", "it’s a very good deal for us.")
    assert same_quote("Europe must do more... much more", "Europe must do more… much more")


def test_different_quotes_not_same():
    assert not same_quote("It is good", "It is bad")
    assert not same_quote("We will talk about it soon", "Nothing is agreed until everything is agreed")
    assert not same_quote("", "anything")


def test_quote_contained_in_longer_quote_counts():
    assert same_quote("Greenland is a very important place for us",
                      "Greenland is a very important place for us, and we will keep talking about it")


def test_grouping_merges_across_outlets():
    groups = group_candidates([cand("Greenland is a very important place for us", outlet="Example News"),
                               cand("greenland is a very important place for us.", outlet="Example Wire"),
                               cand("We will talk about it soon", outlet="Example Times")])
    assert sorted(len(g) for g in groups) == [1, 2]


def test_quote_and_paraphrase_never_mixed():
    q = "Test Speaker said the deal is very close to done."
    groups = group_candidates([cand(q, para=False), cand(q, para=True)])
    assert len(groups) == 2


def test_time_window_separates_old_repeat():
    assert within_window("2026-10-17T10:00:00Z", "2026-10-19T09:00:00Z")
    assert not within_window("2026-10-17T10:00:00Z", "2026-10-21T10:00:00Z")
    groups = group_candidates([cand("We will talk about it soon", at="2026-10-10T10:00:00Z"),
                               cand("We will talk about it soon", at="2026-10-17T10:00:00Z")])
    assert len(groups) == 2
