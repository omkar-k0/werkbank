# Werkbank: context for Claude Code

Handoff from the claude.ai session where v1 was designed, built and deployed (26 Oct 2026).
Owner: Omkar (M.Sc. Big Data & Business Analytics, FOM Essen). This is a CV/portfolio project.

## What it is
Multi-tenant SaaS for furniture shops that run their own workshops. The owner types a customer
request; a confidence-gated classifier routes it to a workshop (carpentry, upholstery, finishing,
metal), labels job type / urgency / effort, and sends unclear requests to a review queue.
Owner corrections retrain that shop's model. Origin: a client brief (a shop with 3 workshops)
that went quiet. Never put the client's name in the repo or on the site. The demo shop
"Lindenholz Möbel" is fictional.

## Live setup
- Live: https://werkbank-gamma.vercel.app (Vercel project `werkbank`, Hobby plan)
- Repo: github.com/omkar-k0/werkbank, local copy at ~/code/werkbank
- DB: Neon Postgres (Frankfurt), env `DATABASE_URL`. `AUTH_SECRET` is set in Vercel.
- Do NOT share `werkbank-omkar-26b3.vercel.app` (behind Vercel login). `werkbank.vercel.app` belongs to someone else.
- Optional env: `ANTHROPIC_API_KEY` (LLM step), `RESEND_API_KEY` + `MAIL_FROM` (done emails).

## Architecture (keep these decisions unless Omkar changes them)
- Next.js 15 App Router, TypeScript, Tailwind 4. No ORM: all SQL lives in `src/lib/repo.ts`,
  and every query filters on `shop_id`. Workshop users are pinned to their `workshop_id`.
- DB layer `src/lib/db.ts`: Neon in production, PGlite (in-process Postgres) locally and in tests.
- Classifier `src/lib/classifier/`: lexicon rules + multinomial naive Bayes (temperature-calibrated),
  blended, then a gate (auto / check / review). The LLM only sees review-queue items and must
  quote the request verbatim, or its answer is discarded. Per-shop learning = seed counts +
  corrections × 4.
- Gate thresholds were fixed a priori (0.85 / margin 0.5 / check 0.55), and shops pick a strictness
  level. Do not tune thresholds or the lexicon against the test sets: that is leakage.
- UI never shows more than "99%+" confidence.

## Evaluation (honest numbers only)
`npm run model` regenerates data, retrains and writes `reports/eval.md`. Training data is synthetic.
The test set uses unseen templates + synonyms; `data/handwritten.json` (60 messy requests) is test-only.
v1: hand-written auto-routed 40% at 95.8% accuracy; after 100 corrections, 82.5% auto at 99.7%.
Job-type accuracy about 70% (weak). Never quote the 400-correction row.

## Commands
`npm run dev` · `npm test` (23 tests: classifier + tenant isolation) · `npm run build` · `npm run model`

## Open item from v1
Check whether `werkbank-live-fix.patch` was applied (README live URL + `export const maxDuration = 60`
in `src/app/api/demo/route.ts` and `src/app/api/demo/reset/route.ts`). If not, make those edits.
Demo reset takes about 45 s on Neon: seeding does about 600 sequential queries.

## v2 candidates (ask Omkar which ones before building)
1. Stripe test-mode billing: monthly plans (Starter €29, Pro €59) and lifetime licence (€790)
2. One order split across two workshops
3. Photo attachments on orders
4. Email / WhatsApp alerts
5. German UI
6. Better job-type model; replace synthetic eval with real shop job slips if he can get them
7. Housekeeping: batch the demo seed, upgrade Next.js and Vitest (audit warnings; no `npm audit fix --force`)

## Working style
Blunt and honest, no flattery. Verify claims by running things. Ask before adding scope.
Plain language, no em dashes in prose he will publish.
