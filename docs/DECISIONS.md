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
