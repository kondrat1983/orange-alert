import pytest

from conftest import NOW, article
from pipeline.corroborate import is_corroborated
from pipeline.models import Source
from pipeline.run import process


def src(group, primary=False, outlet=None):
    return Source(outlet or group, f"https://example.com/{group}/{primary}", group, primary)


def test_two_groups_publish():
    assert is_corroborated([src("example-news"), src("example-wire")])[0]


def test_one_group_pending():
    ok, why = is_corroborated([src("example-news")])
    assert not ok and "waiting" in why


def test_same_group_via_two_outlets_is_one():
    ok, _ = is_corroborated([src("example-times", outlet="Example Times"), src("example-times", outlet="Example Daily")])
    assert not ok


def test_primary_alone_publishes():
    assert is_corroborated([src("example-gov", primary=True)])[0]


def test_empty_sources_pending():
    assert not is_corroborated([])[0]


def run(articles, extractor, log, auto=True, published=None, pending=None):
    return process(articles, extractor, published if published is not None else [],
                   pending if pending is not None else [], NOW, auto, log)


Q = '"Greenland is a very important place for us," Test Speaker said.'


def test_process_two_outlets_publish(extractor, log):
    pub, pend = run([article(Q, outlet="Example News"), article(Q, outlet="Example Wire")], extractor, log)
    assert len(pub) == 1 and not pend
    assert {s.independence_group for s in pub[0].sources} == {"example-news", "example-wire"}


def test_process_one_outlet_pending(extractor, log):
    pub, pend = run([article(Q)], extractor, log)
    assert not pub and len(pend) == 1


def test_process_syndicated_copy_same_group_stays_pending(extractor, log):
    a = article(Q, outlet="Example Times", group="example-times", url="https://example.com/a")
    b = article(Q, outlet="Example Daily", group="example-times", url="https://example.com/b")
    pub, pend = run([a, b], extractor, log)
    assert not pub and len(pend) == 1 and len(pend[0].sources) == 2


def test_process_primary_publishes_alone(extractor, log):
    pub, pend = run([article(Q, outlet="Example Gov", primary=True)], extractor, log)
    assert len(pub) == 1 and not pend


def test_process_pending_promoted_when_second_group_arrives(extractor, log):
    _, pend = run([article(Q, outlet="Example News")], extractor, log)
    pub, pend = run([article(Q, outlet="Example Wire")], extractor, log, pending=pend)
    assert len(pub) == 1 and not pend


def test_process_negated_variant_does_not_corroborate(extractor, log):
    a = article('"We will not send weapons to Kyiv soon," Test Speaker said.', outlet="Example News")
    b = article('"We will now send weapons to Kyiv soon," Test Speaker said.', outlet="Example Wire")
    pub, pend = run([a, b], extractor, log)
    assert not pub, "two different wordings must not count as one quote carried by two outlets"


def test_process_quote_not_in_source_text_is_never_published(extractor, log):
    # Extraction works on the same text, so verbatim can only fail if the extractor altered the quote.
    pub, pend = run([article(Q, outlet="Example Gov", primary=True)], extractor, log)
    for s in pub:
        assert s.quote_en.lower().rstrip(".,") in Q.lower()


@pytest.mark.xfail(strict=True, reason="BUG/GAP: no code applies wire_markers (docs/SOURCES.md); group comes straight from the fetcher")
def test_wire_copy_via_two_outlets_counts_once(extractor, log):
    """SOURCES.md: a (AP)/Reuters byline makes the independence group the wire, not the outlet.
    Fixture/Fetcher input gives each outlet its own group, so the pipeline itself must collapse them."""
    ap = "(AP) -- "
    a = article(ap + Q, outlet="Example News", group="example-news")
    b = article(ap + Q, outlet="Example Radio", group="example-radio")
    pub, pend = run([a, b], extractor, log)
    assert not pub, "same wire story through two outlets was counted as 2 independent groups"

