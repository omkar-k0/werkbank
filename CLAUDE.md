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
- Next.js 16 App Router, TypeScript, Tailwind 4. No ORM: all SQL lives in `src/lib/repo.ts`,
  and every query filters on `shop_id`. Workshop users are pinned to their `workshop_id`.
- DB layer `src/lib/db.ts`: Neon in production, PGlite (in-process Postgres) locally and in tests.
- Classifier `src/lib/classifier/`: lexicon rules + multinomial naive Bayes (temperature-calibrated),
  blended, then a gate (auto / check / review). The LLM only sees review-queue items and must
  quote the request verbatim, or its answer is discarded. Per-shop learning = seed counts +
  corrections × 4.
- Gate thresholds were fixed a priori (0.85 / margin 0.5 / check 0.55), and shops pick a strictness
  level. Do not tune thresholds or the lexicon against the test sets: that is leakage.
- UI never shows more than "99%+" confidence.
- Split orders: an order has no `order_parts` rows until the owner splits it across two workshops (max two, in
  parallel, each part has its own status / expected date / note). Then `orders.status`, `expected_date` and
  `completed_at` hold the derived overall result (done only when both parts are). A workshop user's `getOrder` /
  `listOrders` rows show their own part's progress. Splitting is a planning decision, so it is not a correction
  for the model. Reports count each workshop per part.
- Auth: owners sign in with Google only (`src/lib/google.ts`, routes under `src/app/api/auth/google/`); first
  sign-in with `mode=signup` creates the shop. The owner's lookup is by `users.google_sub`; a legacy owner row with the
  same Google-verified email is claimed once. Workshop staff have a globally unique lowercase `username` + password,
  created and reset by their owner (`createWorkshopUser`, `resetWorkshopUserPassword`); staff have no email.
  Flow tokens carry `aud: google-flow` so they can never be read as sessions. Needs `GOOGLE_CLIENT_ID`,
  `GOOGLE_CLIENT_SECRET` (setup in `docs/google-auth-setup.md`), optional `APP_URL`. Lost Google account = Omkar
  changes `google_sub`/email in the DB by hand. The live Google round trip is untested until credentials exist.
  Open gaps: no login rate limit; staff sessions survive a password reset.
- i18n (EN/DE, `src/lib/i18n/`): `messages.ts` holds both dictionaries (German must have every key; a test checks
  keys and {placeholders}). Language = `wb_lang` cookie, else Accept-Language, else English. Server pages use
  `await getT()`, client components `useT()`. Routing reasons and history lines are stored in English in the DB and
  translated at render by `dynamic.ts` (pattern match; tests run the real generators through it, so editing an English
  template without updating `dynamic.ts` fails a test). Not translated: CSV export, API error messages, user data.

## Evaluation (honest numbers only)
`npm run model` regenerates data, retrains and writes `reports/eval.md`. Training data is synthetic.
The test set uses unseen templates + synonyms; `data/handwritten.json` (60 messy requests) is test-only.
v1: hand-written auto-routed 40% at 95.8% accuracy; after 100 corrections, 82.5% auto at 99.7%.
Job-type accuracy about 70% (weak). Never quote the 400-correction row.

## Commands
`npm run dev` · `npm test` (57 tests: classifier, tenant isolation, split orders, auth, i18n) · `npm run build` · `npm run model`

## Open item from v1
Check whether `werkbank-live-fix.patch` was applied (README live URL + `export const maxDuration = 60`
in `src/app/api/demo/route.ts` and `src/app/api/demo/reset/route.ts`). If not, make those edits.
Demo reset takes about 45 s on Neon: seeding does about 600 sequential queries.

## v2 progress (all on main since 1 Nov 2026)
Done: batched seed, Next 16 + Vitest 5, German UI, split orders, Google owner login with username staff logins,
and the minimal redesign (see Design). Next: Stripe (needs `STRIPE_SECRET_KEY` test key in the environment; decisions:
enforce the Starter limits, lock the shop when a payment fails or the subscription is cancelled, lifetime EUR 790 is a
one-time payment with EUR 149/year as a separate update subscription), then Impressum + privacy pages if the site stays
public (Omkar must supply the address), then item 6.
Branches: `archive/pre-redesign` = main before the redesign (old README and look), `v2` = before the redesign too,
`design/stitch` = Omkar's Stitch export (not merged: its PRD contains invented metrics).
The live demo shop is already seeded, so the four split demo orders only appear after "Reset demo data" in Settings.
The new tables/columns are created automatically on first connection, no manual migration.
German classification is weaker than English (lexicon is mostly English): 3 of my first 5 German example
sentences went to review. Do not fix by tuning the lexicon against test data; see item 6.

## First-run guidance
`src/components/Tour.tsx`: a `<dialog>` tour shown once per person per browser (localStorage `wb_tour_v1_<role>`: owner 4 steps,
staff 3), reopened by the "How it works" link in the sidebar. A brand-new owner's board shows a get-started card instead
of an empty table (`onboardingStatus` in `repo.ts`: orders and staff counts; the demo shop never shows it). Review, reports
and the staff view have friendly empty states. All copy is in `messages.ts` (`getstarted.*`, `tour.*`).

## Design
Apple-like minimalism on the warm wood palette (details and what was rejected: `docs/design/README.md`). One filled
walnut button per owner screen, status = dot + label, hairlines not shadows, Newsreader headings, Inter text.
Custom component classes (`.btn`, `.card`, `.input`) live in `@layer components` so Tailwind utilities override them.
Never show invented UI claims (version numbers, "system online", order refs). Accuracy figures are shown with one
decimal and never above 99.9%.

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
