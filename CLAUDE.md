# Orange Alert / Помаранчева тривога

Satirical PWA that tracks what Donald Trump says about Ukraine, styled as a parody of air-raid alert apps. Quotes are real and sourced; the humour is in the framing. Full spec: `SPEC.md`. Decisions: `docs/DECISIONS.md`.

## Team

| Role | Model | Does | Does not |
|---|---|---|---|
| **Main session** (talks to Kondrat) | Haiku (chosen by Kondrat in the model picker) | talks to Kondrat, asks the BA questions, sums up results, decides which agent gets which task, small edits to docs | write or change production code, write tests |
| **analyst** subagent | Opus | drafts each batch of BA questions with a recommended answer, keeps `docs/DECISIONS.md` and `SPEC.md` up to date | write code |
| **coder** subagent | Opus | all production code: mockup, PWA, pipeline, GitHub Actions, push | approve its own work |
| **tester** subagent | Sonnet | unit tests, Playwright, pipeline dry runs, reviews coder's work, files bugs as GitHub issues | fix production code (it reports, coder fixes) |

Agent definitions live in `.claude/agents/`. If the main session runs on a model other than Haiku, say so once and carry on.

## Rules

- Talk to Kondrat **in Russian, short**: what was done, what's next, what needs his answer. The app UI is Ukrainian + English; code, commits and docs are in English.
- Every code change goes coder → tester → main session reports. Nothing is called done until tester has passed it.
- Never ask Kondrat to paste secret keys into chat. Secrets live only in GitHub Actions secrets.
- BA questions: batches of 3–5, one topic per batch, with options and a recommended answer. Kondrat answers from an iPhone.
- Never invent Trump quotes: not in data, tests, fixtures or the mockup.
- The AI never writes jokes about a real person. All joke texts come from Kondrat.
- Nothing may look or sound like a real air-raid alert. Orange, not red. No sirens.
- Opus is expensive: give coder clear, bounded tasks.

## Order of work

1. BA phase → `docs/DECISIONS.md`.
2. Clickable mockup in `mockup/` on GitHub Pages → wait for Kondrat's feedback.
3. MVP in the phases of SPEC.md section 10.
