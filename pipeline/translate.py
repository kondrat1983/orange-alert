"""Machine translation en -> uk with Argos Translate, if installed. Offline, no keys."""
from __future__ import annotations

_translator = None
_unavailable = False


def _load():
    global _translator, _unavailable
    if _translator is not None or _unavailable:
        return _translator
    try:
        from argostranslate import translate as argos  # lazy: optional dependency
        langs = {lang.code: lang for lang in argos.get_installed_languages()}
        if "en" in langs and "uk" in langs:
            tr = langs["en"].get_translation(langs["uk"])
            if tr is not None:
                _translator = tr
                return tr
    except Exception:  # noqa: BLE001 - any failure means "no translation"
        pass
    _unavailable = True
    return None


def available() -> bool:
    return _load() is not None


def to_ukrainian(text: str) -> str | None:
    """Return the Ukrainian machine translation, or None if Argos (en->uk) is not available."""
    tr = _load()
    if tr is None:
        return None
    try:
        out = tr.translate(text)
    except Exception:  # noqa: BLE001
        return None
    return out or None
