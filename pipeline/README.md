# Orange Alert pipeline

Offline core of the news pipeline (SPEC.md sections 5, 13, 14). Deterministic: no LLM,
no API keys. Python 3.12.

```
pip install -r pipeline/requirements.txt
# optional machine translation en->uk (otherwise quote_uk is null):
# pip install argostranslate  (+ an installed en->uk Argos package)
```

## Flow

fetch (`fetch.py`) → extract quotes attributed to the speaker (`extract.py`) →
verbatim check against the source text (`verify.py`) → group the same quote across outlets
(`dedup.py`) → publish only with ≥2 independence groups or 1 primary source, else pending
(`corroborate.py`) → region / topics / alert trigger / victims flag by keywords (`classify.py`) →
Argos translation (`translate.py`) → alert level, Trump-day status, counters (`alert.py`) →
`data/statements.json`, `pending.json`, `globe.json`, `status.json` (`run.py`).

## Dry run against fixtures

Fixtures in `pipeline/fixtures/` use a fake speaker ("Test Speaker") and fake outlets on
example.com. They never contain a real person or a real quote. `config.json` sets the
speaker and a fixed `now`.

```
python -m pipeline.run --fixtures pipeline/fixtures --out data --dry-run
```

`--dry-run` reads existing data from `--out` but writes nothing. Without it, all four files are
written to `--out` (use a scratch directory for fixtures, not `data/`). `--now ISO` overrides
the clock. The decision log (PUBLISHED / PENDING / REJECTED / KNOWN / RETRACTED / PROMOTED ...)
goes to stdout and, if `$GITHUB_STEP_SUMMARY` is set, to the Actions run summary.

## Kill switch

```
AUTO_PUBLISH=false python -m pipeline.run ...
```

Every new statement goes to `pending.json`. When the variable is back to true, corroborated
pending statements are promoted on the next run.

## Retract

```
python -m pipeline.retract <id> "<reason>" [--data data]
```

The entry stays in the data with `status: "retracted"` and `retract_reason` (the app shows
«Відкликано: <reason>»), status/globe are recomputed, and later runs never re-add it.
