import pytest

from pipeline.verify import is_verbatim, normalize, segments


@pytest.mark.parametrize("quote,source", [
    ("It's a very good deal", "He said it’s a very good deal today."),            # curly apostrophe
    ("It’s a very good deal", "He said it's a very good deal today."),
    ("We say \"yes\" here", "We say “yes” here, he said."),                   # curly double quotes
    ("We will talk about it soon", "We will talk\nabout   it  soon."),                 # line break + spaces
    ("We will talk about it soon", "We will talk about it soon."),           # nbsp / thin space
    ("Europe must do more - much more", "Europe must do more — much more"),       # em dash
    ("Europe must do more - much more", "Europe must do more–much more"),         # en dash, no spaces
    ("Europe must do more -- much more", "Europe must do more — much more"),      # double hyphen
    ("Greenland IS very important", "greenland is very important"),                    # case
    ("one two... four five", "one two… four five"),                               # ellipsis char vs dots
    ("one two… four five", "one two... four five"),
    ("one two . . . four five", "one two... four five"),                              # spaced dots
])
def test_verbatim_accepts_typography_variants(quote, source):
    assert is_verbatim(quote, source)


def test_verbatim_ellipsis_segments_in_order_with_omission():
    src = "We are watching this very closely and we will decide next week what to do."
    assert is_verbatim("We are watching ... we will decide next week", src)
    assert is_verbatim("We are watching … we will decide next week", src)


def test_verbatim_ellipsis_segments_out_of_order_rejected():
    src = "We are watching this closely and we will decide next week."
    assert not is_verbatim("we will decide next week ... We are watching", src)


@pytest.mark.parametrize("quote,source", [
    ("We will send ten planes", "We will send two planes"),                            # changed word
    ("We will talk soon", "We will talk about it soon"),                               # dropped word, no ellipsis
    ("We will not send weapons", "We will now send weapons"),                          # one-letter change
    ("anything at all", ""),
    ("", "some text"),
    ("...", "some ... text"),                                                          # only an ellipsis
    ("   ", "some text"),
])
def test_verbatim_rejects_non_matches(quote, source):
    assert not is_verbatim(quote, source)


def test_hyphen_in_word_is_not_a_dash():
    assert is_verbatim("a well-known deal", "a well‑known deal")
    assert not is_verbatim("a wellknown deal", "a well-known deal")


def test_segments_split_on_ellipsis():
    assert segments("one two... four five") == ["one two", "four five"]
    assert segments("...") == []


def test_normalize_idempotent():
    s = "He said: “Wait… — now”\n\nok"
    assert normalize(normalize(s)) == normalize(s)
