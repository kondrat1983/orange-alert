# Помаранчева тривога / Orange Alert: spec for Claude Code

Owner: Kondrat. Date: 17 Oct 2026 (v3: team of models; v2: globe, Trump-day status, running gags). Status: idea, not approved.

A satirical PWA for Ukrainians that tracks what Donald Trump says about Ukraine, styled as a parody of air-raid alert apps. **The quotes are real and sourced; the humour is in the framing.**

**How to work on this:**
1. Read the whole spec.
2. Set up the team of models (section 0) and commit it.
3. Run the **business-analyst phase** (section 2): ask Kondrat questions before writing any production code.
4. Build the **mockup** (section 3) and wait for his feedback.
5. Only then build the MVP in the phases in section 10.

---

## 0. Team setup: who does what, on which model

Kondrat wants three models with clear roles:

| Role | Model | Does | Does not |
|---|---|---|---|
| **Main session** (the one Kondrat talks to) | **Haiku** | talks to Kondrat, asks the BA questions, sums up results, decides which agent gets which task, small edits to docs | write or change production code, write tests |
| **analyst** subagent | **Opus** | drafts each batch of BA questions with a recommended answer, keeps `docs/DECISIONS.md` and this spec up to date | write code |
| **coder** subagent | **Opus** | all production code: mockup, PWA, pipeline, GitHub Actions, push | approve its own work |
| **tester** subagent | **Sonnet** | unit tests, Playwright, dry runs of the pipeline, reviews what coder did, files bugs as GitHub issues | fix production code (it reports, coder fixes) |

The analyst role is Claude's suggestion on top of Kondrat's three: Haiku is fine for talking, but good BA questions need a stronger model. Haiku still asks the questions; Opus only prepares them.

**What to create first:**

1. `.claude/agents/analyst.md`, `.claude/agents/coder.md`, `.claude/agents/tester.md`, each with frontmatter like:

   ```markdown
   ---
   name: coder
   description: Writes all production code for Orange Alert (mockup, PWA, pipeline, GitHub Actions, push). Use for any code change.
   model: opus
   ---
   You are the coder for Orange Alert. Follow SPEC.md and docs/DECISIONS.md.
   ...role rules from the table above...
   ```

   (`analyst`: `model: opus`, `tester`: `model: sonnet`.)
2. `CLAUDE.md` in the repo root with the same table and these rules, so every future session follows them:
   - The main session talks to Kondrat **in Russian, short**: what was done, what's next, what needs his answer. The app UI is Ukrainian + English; code, commits and docs are in English.
   - Every code change goes coder → tester → main session reports. Nothing is called done until tester has passed it.
   - Never ask Kondrat to paste secret keys into chat.
3. Commit and tell Kondrat in one message that the team is set up.

**The main session's model is chosen by Kondrat** in the model picker when he starts the session (Haiku). If the main session finds it is running on another model, say so once and carry on.

If this environment does not support a `model` field for subagents, tell Kondrat and propose the closest working setup instead of silently ignoring it.

Usage note: Opus uses up usage limits much faster than Sonnet or Haiku. Give coder clear, bounded tasks.

---

## 1. Product in one paragraph

A home screen with the current "alert level" (🟢 calm, 🟡 threat of a statement, 🟠 alert: Trump is talking about Ukraine, ⚪ all clear), a **globe that shows where his attention is right now** (section 13: Ukraine lights up orange; if today it's Greenland, we can exhale) and a **"Trump day" status** (section 14: asleep, woke up and we're waiting, at the microphone, night posting). Under it: a feed of his real statements about Ukraine, each with the verbatim English quote, a Ukrainian translation, date, platform, topic tags and links to sources. Optional push notifications: "🟠 Тривога! Трамп знову говорить про Україну". Fact-based counters and running gags built on the best-known memes (section 15: "two weeks", "24 hours", TACO, cards). UI in Ukrainian and English.

## 2. Business-analyst phase: ask before you build

Act as a business analyst. Ask Kondrat questions **in small batches of 3–5**, one topic per batch, with your recommended answer for each. He answers from his iPhone, so keep questions short and offer options. Write the answers into `docs/DECISIONS.md` as you go.

Topics to cover (add your own if you see gaps):

1. **Audience and tone.** Friends and family only, or anyone? How sharp is the humour? Are there topics that are off-limits for jokes (for example casualties)?
2. **Alert levels.** Exact wording for each level (Kondrat writes the jokes; see 6.3). What triggers 🟡? How long until ⚪ all clear?
3. **What counts as "about Ukraine".** Mentions of Zelensky, Putin, Russia, NATO, aid, sanctions, peace talks, territory? Only statements by Trump himself, or also by the White House press secretary or officials?
4. **Counters.** Which ones, and how each is calculated (see section 7).
5. **Notifications.** Every statement, or only certain topics? Quiet hours? Maximum per day?
6. **Sources.** Review the list in section 4. Add or remove outlets?
7. **Branding.** Name, icon, colours (see section 8).
8. **Corrections.** How a reader reports a wrong quote, and what happens then.
9. **Budget.** Decided: no Claude API, no paid services; everything runs on free tiers.
10. **Sharing.** Should each statement have a share card (image for Telegram / Instagram stories)?
11. **Globe.** 3D globe or flat map? Which regions are tracked? Time window (last 24 h, 72 h)? Texts for each region state (section 13).
12. **Trump-day status.** Which states, which signals count as "woke up", and the texts (section 14).
13. **Running gags.** Which of the gags in section 15 go into the MVP, the baseline date for each counter, and which ones need Kondrat's manual confirmation.

## 3. Mockup first

Before any backend, build a **clickable static mockup** in `mockup/` (plain HTML/CSS/JS, mobile-first, iPhone frame) and publish it with GitHub Pages so Kondrat can open it on his phone.

Screens:

1. **Home:** big alert-level card, the globe (section 13), the Trump-day status line (section 14), last statement preview, 2–3 counters, "В укриття" (mute for 24 h) button.
2. **Feed:** list of statements, filter by topic, search.
3. **Statement detail:** verbatim quote (EN), translation (UA), date and time (Kyiv time), platform (speech, Truth Social, X, interview, press conference), topic tags, list of sources with links, "Повідомити про помилку" (report an error), share.
4. **Notification settings:** on/off, topics, quiet hours.
5. **About:** "Сатиричний проєкт. Цитати справжні, коментарі наші." How it works, sources, how to report an error, not affiliated with anyone.

**In the mockup, do NOT invent Trump quotes.** Use obvious placeholders such as `«Тут буде дослівна цитата англійською»` and `Source: Example News`. Fake quotes attributed to a real person must never exist in this repo, not even as sample data.

Show both languages (UA / EN toggle) and both themes (light / dark).

## 4. Sources

**Approach decided: through news and transcripts, not by scraping social platforms directly.** Posts on Truth Social and X are picked up when outlets quote and link them. This is free and does not break platform rules. It means a delay of minutes to about an hour, which is fine.

Candidate sources. **Verify each one before use:** working RSS / API URL, terms of use, whether automated access is allowed. Do not trust this list blindly.

- Wire services and international outlets: Reuters, AP, BBC, The Guardian, Politico, CNN.
- Ukrainian outlets in English or Ukrainian: Kyiv Independent, Ukrainska Pravda, Suspilne, Ukrinform.
- Primary transcripts: whitehouse.gov remarks and briefings.
- Aggregated search: Google News RSS search for queries like `Trump Ukraine`, `Trump Zelensky`, `Trump Putin` [check terms].
- Possible archives of Trump's statements and Truth Social posts (for example Roll Call Factba.se) [check that they exist, their terms, and whether automated access is allowed; skip if not].

Rules:

- Store only: the short verbatim quote, our own one-line summary, metadata and **links**. Never copy article text into the repo.
- Paywalled outlets: link only, use them as a second source, never fetch around the paywall.
- Respect robots.txt and rate limits.

## 5. Pipeline (auto-publish, with safeguards)

**Decided: statements are published automatically.** Because of that, the safeguards below are not optional.

Runs as a **GitHub Actions** workflow on a schedule (every 15–30 min, decide in the BA phase):

1. **Fetch** new items from the sources.
2. **Extract** with deterministic scripts, no LLM (decided 17 Oct 2026): find quoted strings attributed to Trump ("Trump said / wrote / posted" patterns), date, platform, region and topics by keyword rules.
3. **Verify the quote is verbatim.** The quote string must appear in the fetched source text (normalised quotes and whitespace). If it doesn't, it is not a quote. Skip it or mark it "paraphrase" (see 6.2).
4. **Corroborate.** Auto-publish only when **two independent outlets** carry the same quote, or one primary source does (whitehouse.gov transcript, or the post itself linked by an outlet). Otherwise put it in `data/pending.json` and do not publish.
5. **Deduplicate** the same statement reported by many outlets (fuzzy match on the quote) into one entry with several sources.
6. **Translate** to Ukrainian with an offline open-source model (Argos Translate) in the Action. Label it as machine translation.
7. **Commit** to `data/statements.json`, so GitHub Pages redeploys.
8. **Notify** subscribers (section 9).

Also needed:

- **Kill switch:** a repo variable `AUTO_PUBLISH=false` that turns publishing off instantly.
- **Retract:** a simple way (CLI script or GitHub issue label) to hide an entry. Hidden entries show "Відкликано: <reason>" instead of disappearing silently.
- **Error reports** from readers become GitHub issues (or a form that creates them).
- **Logs** of every decision (published, pending, rejected and why) in the Action run summary.

## 6. Content rules

1. **Quotes are verbatim** and always shown in English next to the translation.
2. **Paraphrases** ("Trump said Ukraine should…" without a direct quote) are allowed only with a clear "Переказ" badge and a source link, and never trigger 🟠 on their own.
3. **No generated jokes about a real person.** All humour comes from fixed texts that Kondrat writes and approves: alert-level names, notification titles, empty states, the "В укриття" button, counter labels. Scripts only extract, classify and translate.
4. No invented quotes anywhere: not in data, tests, fixtures or the mockup.
5. Every statement page links to its sources.
6. The About page and footer say: satire, quotes are real, not affiliated with anyone.

## 7. Counters (examples, finalise in BA phase)

Facts only, computed from `statements.json`:

- Days since the last statement about Ukraine.
- Statements this week / this month.
- Statements per topic.
- A "promise" counter (for example how many times he said he would end the war quickly), **only** from statements tagged by the pipeline and confirmed by sources. Show the list behind the number.

## 8. Look and feel, and one safety rule

- Name: «Помаранчева тривога» (UA) / Orange Alert (EN). No surname and no photo of him in the name or icon. That avoids app-store and likeness issues later and the joke still lands.
- Icon: abstract (orange alert light, orange swirl). No caricature in the icon.
- **Safety rule: nothing may look or sound like a real air-raid alert.** No siren sound, no red-and-black alarm styling, no wording that could be mistaken for an official alert. Use orange, not red. Notification title always starts with "🟠 Помаранчева тривога". In a country where people run to the corridor on an air-raid push, a parody that can be mistaken for one at 3 a.m. is not funny.

## 9. Push notifications

- Web Push for the installed PWA (on iPhone it works only after "Add to Home Screen"; tell the user that in the UI).
- Store subscriptions in Supabase (free tier), table with RLS: the browser can only insert its own subscription.
- The GitHub Action sends pushes with VAPID keys.
- **Secrets live only in GitHub Actions secrets:** `VAPID_PRIVATE_KEY`, the Supabase service key. Never in code, never in commits, never in chat. The Supabase publishable (anon) key in the client is fine.
- Respect topics, quiet hours (Kyiv time) and a daily cap.

## 10. Phases

0. BA questions → `docs/DECISIONS.md`.
1. Mockup on GitHub Pages (including the globe and the Trump-day status, with placeholder data) → Kondrat's feedback.
2. MVP: real `statements.json`, feed, detail page, alert level, UA/EN, pipeline with all safeguards, kill switch.
3. Globe (section 13) and Trump-day status (section 14).
4. Push notifications.
5. Running gags and counters (section 15), share cards, error reports.

## 11. Tests

- Unit: quote-verbatim check (with curly quotes, line breaks, ellipses), dedup, corroboration rule, alert-level calculation, Kyiv time zone.
- Pipeline dry-run mode against saved fixtures. **Fixtures use clearly fake speakers** ("Test Speaker", "Example News"), not Trump.
- Playwright smoke test of the PWA on an iPhone-sized viewport, UA and EN.

## 12. Repo hygiene

- Public repo, MIT licence for the code.
- `README.md` in Ukrainian and English: what it is, satire disclaimer, how to report an error.
- No personal data of Kondrat's family in the repo.

---

## 13. Globe: "Куди дивиться Трамп"

The centrepiece of the home screen. A globe (3D, for example `globe.gl` / three.js, or a flat map if the 3D one is too heavy on an iPhone: decide in the BA phase) that shows **where his attention was in the last 24 hours** (window to be confirmed).

- **Ukraine mentioned → Ukraine glows and pulses orange**, alert level 🟠.
- **He is busy with another place → that place lights up in a calm colour, Ukraine stays dim**, and the status line says something like «Сьогодні він про Гренландію. Видихаємо 😮‍💨». The exact texts are written by Kondrat (section 6.3).
- Tap a lit region → its latest statement (quote + sources) and how many statements that region got in the window.
- Candidate regions (finalise in the BA phase): Ukraine, Russia, Greenland / Denmark, Canada, Mexico, Panama, China, Venezuela, Middle East (Israel, Gaza, Iran), EU / NATO, plus **"США: внутрішні справи"** (domestic politics: he is busy at home).

**Pipeline impact.** The globe needs statements on **all** regions, not only Ukraine. So the pipeline:

- collects and classifies Trump statements by region;
- publishes statements on **all** regions to the feed (filter by region), with the same verbatim and corroboration safeguards;
- only Ukraine/war and Putin/Russia statements raise 🟠 and send push; other regions light up calm on the globe (decided 17 Oct 2026, see DECISIONS.md).

Region classification is done by keyword rules (no LLM, no API cost).

## 14. Trump-day status: «Трамп прокинувся, чекаємо»

A one-line status under the alert level, with both Washington and Kyiv time shown. Candidate states (texts by Kondrat):

| State | Signal |
|---|---|
| 😴 Спить | no public activity detected yet in his day (Washington time) |
| ☀️ Прокинувся, чекаємо | first statement or post of his day detected, about any topic |
| 🎤 Біля мікрофона | a scheduled public event (press conference, remarks, interview) is happening now |
| 🌙 Нічний постинг | posts detected late at night, Washington time |
| 🌍 Зайнятий іншим | busy with another region (links to the globe) |

Rules:

- **Every status shows what it is based on**, for example «перший пост о 06:12 за Вашингтоном (за даними Reuters)» or «за публічним розкладом Білого дому». Never present a guess as a fact.
- Possible signals: the time of the first detected statement of the day (from the pipeline, which has a delay of 10–60 min: say so in the UI), the White House public schedule [check whether it is published in a machine-readable form and whether automated access is allowed].
- Nothing about his health, private life or whereabouts beyond public schedules and public statements.
- Mind the time zones: Kyiv and Washington are usually 7 hours apart, but daylight-saving changes happen on different dates, so for some weeks the gap is 6 hours. Use a proper time-zone library.

## 15. Running gags (meme mechanics)

Kondrat asked to build on the best-known memes. Researched 17 Oct 2026. These are the recurring jokes about Trump that Ukrainian and international social media actually use, and how each can become a **fact-based** feature. The humour comes from real data next to a familiar meme, never from invented content.

1. **«Два тижні» / "two weeks".** Trump has repeatedly said things are "two weeks" away, a pattern commentators trace back to 2017; Ukrainian users mocked his repeated deadlines for Putin in the same way.
   **Feature: "Two-weeks tracker".** Every statement with a "two weeks" (or N days) deadline about Russia or Ukraine gets a countdown. After the deadline: «Дедлайн минув N днів тому». Status: виконано / перенесено / тихо забуто.
2. **«24 години».** His campaign promise to end the war in 24 hours.
   **Feature: a counter of days since the promise baseline** (Kondrat picks the baseline in the BA phase, for example inauguration day, 20 Jan 2025), with links to the original promises.
3. **TACO: "Trump Always Chickens Out".** Coined by FT columnist Robert Armstrong on 2 May 2025 about tariff reversals; now a general meme for threats he walks back.
   **Feature: "TACO-meter" for ultimatums to Russia** (sanctions deadlines, threats): threat → outcome. The outcome needs a source too. **Outcome labels are shown only after Kondrat confirms them** (one tap), even though everything else is auto-published, because "he backed down" is a judgement, not a quote.
4. **«Карти» / "You don't have the cards".** From the 28 Feb 2025 Oval Office clash; Ukrainians turned it around and joked when Zelensky "got the cards".
   **Feature: UI wording and visuals only.** Counters displayed as playing cards; an empty state like «Карт поки немає» (Kondrat writes the final texts).
5. **The tariff chart.** His big board of tariff rates became a template Ukrainians filled with diner prices and planting calendars.
   **Feature: a share-card format** inspired by that board, filled with our own counters (for example "Weekly report: Ukraine 3, Greenland 7, Canada 2").
6. **Greenland, Canada as "the 51st state", "Gulf of America".** His other fixations are a gift to the globe (section 13): «Сьогодні знову Гренландія. Видихаємо».

Rules for this section:

- **Do not copy meme images.** Make original visuals that reference the format. Meme pictures belong to their authors.
- Every number behind a gag links to the statements it is built from.
- Kondrat approves the final joke texts before release.

Sources for this section (for context; do not scrape them):
- Kyiv Post, top Ukrainian social-media reactions to Trump in 2025: https://www.kyivpost.com/amp/post/66519
- The Page, top memes of 2025 about Trump, Zelensky and Ukrainians: https://thepage.ua/ua/news/top-memiv-2025-pro-trampa-zelenskogo-ta-ukrayinciv/amp
- The Bulwark on the "two weeks" pattern: https://www.thebulwark.com/p/trumps-bizarre-obsession-with-two
- Know Your Meme, TACO origin: https://knowyourmeme.com/memes/taco-trump-always-chickens-out
