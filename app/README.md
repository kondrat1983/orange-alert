# Orange Alert PWA (`app/`)

Plain HTML/CSS/JS, no build step. Built from `mockup/` (which stays as the clickable mockup).

## Files

| File | What |
|---|---|
| `index.html` | Shell; loads pinned d3 7.9.0 and topojson-client 3.1.0 from jsDelivr |
| `app.js` | Screens: home (level, Trump-day status, globe, latest, counters, «Торкнутися трави»), feed, statement detail, notification settings, about |
| `style.css` | Orange + calm dark blue, light/dark. Never red |
| `manifest.json`, `icons/` | PWA manifest; icon variant 1 (SVG + 192/512 PNG) |
| `sw.js` | Service worker: offline app shell, network-first for `./data/`, cache-first for the pinned CDN files |

## Deploy layout

The site root serves the contents of `app/`, with the pipeline's `data/` copied next to it:

```
<site root>/
  index.html  app.js  style.css  manifest.json  sw.js  icons/
  data/statements.json  data/status.json  data/globe.json
```

The app reads only relative `./data/statements.json`, `./data/status.json` and `./data/globe.json`.
`pending.json` is never read or shown (it may be copied, it is just ignored).
If a file is missing or broken, the app shows the empty state («Заяв немає. Підозріло.») and level 🟢.

## Run locally

```
rm -rf /tmp/oa-site && mkdir -p /tmp/oa-site
cp -r app/* /tmp/oa-site/ && cp -r data /tmp/oa-site/data
python3 -m http.server 8000 -d /tmp/oa-site
# open http://localhost:8000/
```

To try it with pipeline fixture output, point the copy at a scratch run instead of `data/`
(`python -m pipeline.run --fixtures pipeline/fixtures --out /tmp/oa-fx`, then `cp -r /tmp/oa-fx /tmp/oa-site/data`).
Never copy fixture output into the repo's `data/`.

## Demo mode

`?demo=1` (e.g. `http://localhost:8000/?demo=1`) ignores `data/` and uses built-in placeholder
data (no quotes, "Example News" sources) with a level switcher: 🟢 🟡 🟠 ⚪, "busy with Greenland",
"busy with California". Without `?demo=1` there is no switcher.

## Behaviour notes

- Level, based-on lines and day status come from `status.json`. If `alert.until` has passed (pipeline
  paused), 🟠 is shown as ⚪ for 1 h and then 🟢, so a stale file never shows an old alert as current.
- When `alert.jokes_off` is true (statement about victims), the level card drops the joke texts.
- «Ми в безпеці: сьогодні дісталося {region}» shows when `day.state` is `busy_elsewhere` and the level is not 🟠.
- Counters "days since" and "in 7 days" are recomputed from `statements.json` on the device; the
  "24 hours" counter from `counters.baseline_24h`.
- «Торкнутися трави» stores a 24 h mute in `localStorage` (`oa.muteUntil`); push (phase 4) will honour it.
- Notification settings are UI only (push is phase 4); stored in `localStorage` (`oa.notify`).
  Topic toggles are disabled only when the master switch is off.
- Bump `VERSION` in `sw.js` when shell files change.
