# Orange Alert pipeline

News pipeline (SPEC.md sections 5, 13, 14). Deterministic: no LLM. Python 3.12.
Runs offline against fixtures, or live against the sources in `sources.yml` (GitHub Actions).

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

## Live mode

```
python -m pipeline.run --live --out data [--sources pipeline/sources.yml] [--max-articles 60] [--dry-run]
```

`fetch.RssFetcher` reads every source in `sources.yml` (docs/SOURCES.md):

- RSS feeds via feedparser; the Guardian Content API (`show-fields=bodyText`) only when env
  `GUARDIAN_API_KEY` is set (skipped silently otherwise; the key is never logged).
- Items are kept only if newer than 72 h, not in `data/seen.json`, and title/summary name
  Trump / the president plus a region keyword. Article pages are then fetched (max 60 per run,
  primary sources first, then newest) with User-Agent `OrangeAlertBot/0.1 (+repo URL)`, a 20 s
  timeout, at most 1 request per host per 2 s, and a robots.txt check before every page.
  Feed items that carry full text (Guardian API, long `content:encoded`) need no page fetch.
- `link_only_domains` (Reuters, AP, CNN, Kyiv Post, Factba.se) are never fetched. Google News items
  are followed only when their `<source url>` is one of our `use` outlets; others are logged as
  `LINK_ONLY` / `DISCOVERY` and do not count as sources.
- Article text lives in memory only and is never written.
- Feed health goes to the decision log: `FEED OK|STALE|FAILED <source>` (stale = newest item older
  than 7 days, `(unverified)` = `verify: true` in sources.yml) and a `HEALTH` summary line. One failing
  feed or page never fails the run.
- State across runs: `data/seen.json` (handled item URLs, pruned after 14 days) and `pending.json`.
  Transient page failures (timeouts, 5xx, 429) and items over the cap are not marked seen, so they are retried.

## GitHub Actions

| Workflow | When | What |
|---|---|---|
| `pipeline.yml` | every 30 min + manual | live run, commits `data/` to the default branch (only if something besides timestamps changed), then deploys |
| `deploy.yml` | push to main touching `app/`, `data/`, `mockup/`; manual; called by the others | builds the site (app at `/`, `data/*.json` at `/data/`, mockup at `/mockup/`) and pushes it to `gh-pages` |
| `retract.yml` | manual, inputs `id` + `reason` | runs `pipeline.retract`, commits, deploys |
| `tests.yml` | push / PR | pytest |

Secret `GUARDIAN_API_KEY`: repo Settings → Secrets and variables → Actions → New repository secret.
The pipeline skips the Guardian while it is absent.

## Kill switch

```
AUTO_PUBLISH=false python -m pipeline.run ...
```

In Actions: repo Settings → Secrets and variables → Actions → Variables → `AUTO_PUBLISH` = `false`
(unset or `true` = auto-publish). Every new statement goes to `pending.json`. When the variable is
back to true, corroborated pending statements are promoted on the next run.

## Retract

```
python -m pipeline.retract <id> "<reason>" [--data data]
```

From a phone: GitHub app → repo → Actions → "Retract statement" → Run workflow → id + reason.

The entry stays in the data with `status: "retracted"` and `retract_reason` (the app shows
«Відкликано: <reason>»), status/globe are recomputed, and later runs never re-add it.
