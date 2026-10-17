import pytest

from conftest import article


def quotes(extractor, text, title="Test Speaker news"):
    return [(c.quote, c.is_paraphrase) for c in extractor.extract(article(text, title=title))]


@pytest.mark.parametrize("text,expected", [
    ('"We will talk about it soon," Test Speaker said.', "We will talk about it soon"),
    ('“We will talk about it soon,” Test Speaker said.', "We will talk about it soon"),
    ('"We will talk about it soon," said Test Speaker.', "We will talk about it soon"),
    ('Test Speaker said: "We will talk about it soon."', "We will talk about it soon."),
    ('Test Speaker wrote on Truth Social: "We will talk about it soon."', "We will talk about it soon."),
    ('Test Speaker said the deal was "very close to done".', "very close to done"),
    ('Test Speaker said: "We will talk\nabout it soon."', "We will talk about it soon."),   # line break folded
    ('Test Speaker spoke. "We will talk about it soon," the president said.', "We will talk about it soon"),
])
def test_attributed_quote_is_extracted(extractor, text, expected):
    assert quotes(extractor, text) == [(expected, False)]


@pytest.mark.parametrize("text", [
    '"We will talk about it soon," Other Person said.',
    '"We will talk about it soon," Jane Speaker said.',                       # another person with the same surname
    '"Test Speaker is wrong about this one," Other Person said.',             # speaker is only mentioned
    'Other Person said: "Test Speaker is wrong about this one."',
    'Other Person said Test Speaker was "completely wrong about this".',
    'Test Speaker met Other Person, who said "we will not agree to that".',
    '"We will talk about it soon," Other Person said. Test Speaker disagreed.',
    '"We will talk about it soon."',                                           # no attribution at all
    'Test Speaker has been quiet. "We will talk about it soon," a source said.',
    '"We will talk about it soon," Test Speaker Jr. said.',
])
def test_other_persons_quote_is_not_taken(extractor, text):
    assert quotes(extractor, text) == []


def test_the_president_not_used_when_another_president_is_named(extractor):
    text = 'President Other met allies. "We will talk about it soon," the president said. Test Speaker left. Test Speaker slept.'
    assert quotes(extractor, text) == []


def test_the_president_needs_article_about_speaker(extractor):
    text = '"We will talk about it soon," the president said.'
    assert quotes(extractor, text, title="Weather report") == []


def test_short_quotes_are_skipped(extractor):
    assert quotes(extractor, '"Very bad," Test Speaker said.') == []


def test_two_speakers_in_one_article(extractor):
    text = ('"We will talk about it soon," Test Speaker said.\n\n'
            '"Nothing is agreed until everything is agreed," Other Person said.')
    assert quotes(extractor, text) == [("We will talk about it soon", False)]


def test_paraphrase_detected_only_without_direct_quote(extractor):
    text = "Test Speaker said Ukraine should consider a ceasefire this week."
    assert quotes(extractor, text) == [(text, True)]
    both = text + '\n\n"We will talk about it soon," Test Speaker said.'
    assert quotes(extractor, both) == [("We will talk about it soon", False)]


def test_paraphrase_of_another_person_not_taken(extractor):
    assert quotes(extractor, "Other Person said Ukraine should consider a ceasefire this week.") == []
    assert quotes(extractor, "Jane Speaker said Ukraine should consider a ceasefire this week.") == []


@pytest.mark.parametrize("text,platform", [
    ('Test Speaker wrote on Truth Social: "We will talk about it soon."', "truth_social"),
    ('"We will talk about it soon," Test Speaker said in an interview.', "interview"),
    ('"We will talk about it soon," Test Speaker told reporters.', "press_conference"),
    ('"We will talk about it soon," Test Speaker said in a speech.', "speech"),
    ('"We will talk about it soon," Test Speaker said.', "unknown"),
])
def test_platform_detection(extractor, text, platform):
    (c,) = extractor.extract(article(text))
    assert c.platform == platform


@pytest.mark.parametrize("text", [
    'Test Speaker said that Other Person called it "a total disaster for us".',
    'Test Speaker said the report called it "a complete and utter failure".',
])
def test_partial_quote_of_third_party_is_not_taken(extractor, text):
    assert quotes(extractor, text) == []
