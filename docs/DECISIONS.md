# Decisions

Answers from the business-analyst phase (SPEC.md section 2). Newest at the bottom.

| Date | Topic | Decision | Notes |
|---|---|---|---|
| 2026-10-17 | Team | Main session + analyst (Opus) + coder (Opus) + tester (Sonnet), defined in `.claude/agents/` | SPEC.md section 0 |
| 2026-10-17 | Audience | Public, for anyone; shareable link | Matches public repo |
| 2026-10-17 | Tone | Dry irony: humour from framing and facts, no crudeness | |
| 2026-10-17 | Off-limits | Casualties and the dead: when a statement is about victims, joke framing (level texts, badges) is turned off for it | Other topics (deported children, Zelensky/AFU, strikes on cities) not banned |
| 2026-10-17 | Mass-strike days | No special mode; the app works as usual | |
| 2026-10-17 | 🟡 trigger | Any of: scheduled public event (press conference, interview) now; a paraphrase without a direct quote; a quote waiting for a second source; start of his day ("woke up": first detected statement of his day, Washington time, any topic) | Status line must show what it is based on (SPEC 14). Open: whether a plain clock time (e.g. 09:00 ET) also counts as "start of day" |
| 2026-10-17 | 🟠 duration | 6 h after the last statement about Ukraine | |
| 2026-10-17 | ⚪ all clear | Shown for 1 h after 🟠 ends, then 🟢 | |
| 2026-10-17 | Push on ⚪ | No | Avoid noise and resemblance to real all-clear alerts |
| 2026-10-17 | "Woke up" signal | First detected statement of his day (any topic), Washington time; UI notes the 10–60 min delay | Closes the open point on 🟡 |
| 2026-10-17 | Speakers | Trump only; no press secretary or officials | |
| 2026-10-17 | Scope of topics | 🟠 and push: Ukraine/Zelensky/war (peace talks, aid, weapons, territory) + any statement about Putin/Russia. Feed: all regions, filterable by region; non-Ukraine regions are calm-coloured on the globe ("we exhale") and never trigger 🟠 or push | Changes SPEC 13: non-Ukraine statements are published to the feed in full (same verbatim + corroboration safeguards), not only as aggregates. Higher API cost; to be estimated in budget batch |
| 2026-10-17 | Push default | One daily digest (time TBD, Kyiv evening) | Per-🟠 push is opt-in in settings |
| 2026-10-17 | Quiet hours | 22:00–10:00 Kyiv by default, user-adjustable | |
| 2026-10-17 | Daily cap | Max 3 pushes per day per subscriber, digest included | |
| 2026-10-17 | Running gags in MVP | "Two weeks" tracker, "24 hours" counter, TACO-meter | TACO outcomes shown only after Kondrat confirms each (SPEC 15.3). Cards-as-UI not in MVP |
| 2026-10-17 | "24 hours" baseline | Election day, 5 Nov 2024 | Counter links to the original promises |
| 2026-10-17 | Home counters | Days since last Ukraine statement; Ukraine statements in last 7 days; days since "24 hours" baseline | |
| 2026-10-17 | Globe | Light 3D globe (d3/SVG orthographic, no textures), iPhone-friendly | |
| 2026-10-17 | Globe window | Last 24 h | |
| 2026-10-17 | Globe regions | Full SPEC 13 list: Ukraine, Russia, Greenland/Denmark, Canada, Mexico, Panama, China, Venezuela, Middle East, EU/NATO, US domestic | |
| 2026-10-17 | Trump-day states | All 5 from SPEC 14; "At the microphone" only if a machine-readable public schedule with allowed automated access is found | |
| 2026-10-17 | Claude API | **Not used.** Extraction, classification and dedup are done with deterministic scripts (pattern matching, keyword rules, fuzzy matching) | Replaces SPEC 5 step 2 (LLM extraction). Corroboration (2 independent outlets carrying the same verbatim quote) becomes the main precision safeguard. Translation approach: open question |
| 2026-10-17 | Error reports | By email or Telegram | Which one and which address: open question |
| 2026-10-17 | Share cards | Yes, after MVP (phase 5); MVP has link previews only | |
| 2026-10-17 | Branding | As in SPEC 8: «Помаранчева тривога» / Orange Alert, orange + calm dark blue, abstract icon; mockup shows 2 icon variants | |
| 2026-10-17 | Translation | Offline open-source model (Argos Translate) run inside GitHub Actions; labelled "машинний переклад" | No keys, no cost |
| 2026-10-17 | Error-report contact | Dedicated project email (address TBD by Kondrat); never his personal address | |
| 2026-10-17 | Pipeline schedule | Every 30 min (default; no API cost now) | Main-session default, not asked |
| 2026-10-17 | Non-Ukraine days | Core mechanic: when his attention is elsewhere, the home screen reads as "we're safe, today {region} got it" (e.g. Greenland, California). Region name comes from data; the phrase itself is Kondrat's text | "US: domestic" may name a specific state (e.g. California) when the source states it |
| 2026-10-17 | Joke texts | Claude drafts in the style of the "У Вашингтоні прокинувся Трамп. Масова евакуація з інтернету!" meme (official-bulletin tone, absurd instruction); Kondrat approves. Drafts in `docs/TEXTS.md` | Tone only; no red/siren look (SPEC 8) |
| 2026-10-17 | Error-report contact | kondrat1983@gmail.com (Kondrat's choice) | Supersedes "dedicated project email". Public repo, so expect spam |
| 2026-10-17 | Hosting | GitHub Pages from the `gh-pages` branch (auto-enabled). Mockup: https://kondrat1983.github.io/orange-alert/ | Updating it is a manual push of `mockup/` to `gh-pages` for now; automate later |
| 2026-10-17 | Mockup feedback | Approved as is ("Все шикарно"). Draft texts in `docs/TEXTS.md` approved. Icon: variant 1 (default) unless Kondrat says otherwise | Go to MVP (SPEC 10, phase 2) |
| 2026-10-17 | MVP stack | Pipeline in Python 3.12 (Argos Translate is Python), stdlib + feedparser + rapidfuzz; PWA in plain HTML/CSS/JS in `app/`, built from the mockup, reads `data/*.json` | Main-session default |
| 2026-10-17 | Mute button | «В укриття» renamed to «Торкнутися трави» / "Touch grass" (Kondrat). While muted: «Ви на траві до {time}. Тут тихо.» | Also drops another air-raid association |
| 2026-10-17 | Sources | Verified list in `docs/SOURCES.md`. Starter set: BBC, Guardian API, NPR, Al Jazeera, Kyiv Independent, UP EN, Politico, Ukrinform, whitehouse.gov (primary), Google News search (discovery only). Reuters, AP, CNN, Kyiv Post, Factba.se: link-only. Wire bylines (AP/Reuters/AFP) count as the wire, not the outlet. No machine-readable WH schedule found, so 🎤 stays out of MVP | Sandbox could not fetch feeds; first Actions dry run must confirm each URL. Guardian needs a free key as Actions secret `GUARDIAN_API_KEY` |
