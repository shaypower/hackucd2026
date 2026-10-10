# TelDeal: plan, framework and tools

## Context
Transfer agents (TAs) at fund administrators take trade instructions by phone. Today they type in
the ISIN, account, currency and units by hand, look up whether the caller is authorised, call back a
nominated contact to confirm, then run a macro to build an Excel file for Payments. Each manual step
can let in a typing error or a fraudulent caller.

**TelDeal** is a web app for the TA. A call transcript goes in, an AI extracts the trade, code
validates every field, the callback is compared field by field, and approval produces the Payments
export plus an audit trail. It's built for HackUCD 2026 (FinTech theme). It needs one working
workflow, a meaningful OpenRouter feature, evidence of testing, and an optional Stripe sandbox
subscription worth +5 points. It's hosted on Vercel.

Decisions made: **team of 3**, **Supabase Postgres**, **text transcripts first (audio upload as a
stretch goal)**, **Stripe bonus in the last phase**.

At planning time the repo had no code: only `AGENTS.md`, `README.md`, `.mcp.json` (Context7, Playwright) and
`.claude/settings.json` (plugins). The Context7 MCP needs authorising (`/mcp`) before use.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| App framework | **Next.js (App Router) + TypeScript** | One codebase for UI and API; deploys to Vercel with no extra config |
| UI | **Tailwind + shadcn/ui** | A polished review screen quickly (counts toward "craft") |
| Hosting | **Vercel** (GitHub-connected: preview URL per PR, `main` goes to production) | Matches "main must always run"; judges get a live URL |
| Database | **Supabase Postgres** via the Vercel Marketplace integration (fills in the env vars automatically) | Persistent trades and audit log; SQL migrations in the repo |
| AI | **OpenRouter** via the **Vercel AI SDK** (`ai` + `@openrouter/ai-sdk-provider`), `generateObject` with a **zod** schema | Typed, schema-validated output; switching models is a one-line change (useful for the "stay curious" comparison) |
| Validation | Plain TypeScript + zod | Deterministic, unit-testable, never left to the model |
| Excel export | **exceljs** | Generates the Payments `.xlsx` on the server |
| Payments bonus | **Stripe** Node SDK, Checkout Sessions (subscription mode) + webhook | The route the criteria recommend |
| Testing | **Vitest** (validators, diff logic, eval script), **Playwright** (end-to-end against the Vercel preview) | Covers the "ordinary, boundary, failure inputs" requirement |

Security: there's no user login (one demo desk). **Every DB call runs on the server** with the
service-role key. RLS is turned on with no anon policies, so the browser can't read the register.
Keys stay in Vercel env vars, and `.env.example` gets placeholder values only.

---

## Architecture

```
Browser (TA desk UI)
   │
   ▼
Next.js route handlers on Vercel ──► OpenRouter (extract trade from transcript)
   │        │
   │        └─► lib/validation (ISIN check digit, register lookups, cut-off…)
   ▼
Supabase Postgres (register, trades, callbacks, audit_events, subscriptions)
   ▲
Stripe Checkout ──webhook──► /api/stripe/webhook (marks desk subscription active)
```

### User flow → routes
1. `/`: landing page with problem, pricing and a **Subscribe** button.
2. `/desk`: new trade. Paste or choose a sample transcript, then **Extract**.
3. `/trades/[id]`: review screen. Transcript on the left with highlighted quotes, fields on the
   right marked green/amber/red. Agent fixes fields (each edit is logged), then **Proceed to
   callback**.
4. `/trades/[id]/callback`: shows the nominated contact from the register. Agent pastes the
   callback transcript, and the app shows a field-by-field diff. Match unlocks **Approve**.
5. Approve: download the `.xlsx` for Payments and view the audit trail. Approve and export are
   **only available while the desk subscription is active**; this is how the app recognises the
   Stripe purchase.

### API (route handlers in `app/api/`)
| Method / path | Does |
|---|---|
| `POST /api/trades` | body `{transcript}` → extract → validate → save trade → returns trade + checks |
| `PATCH /api/trades/[id]` | agent edit of a field → re-validate → audit event |
| `POST /api/trades/[id]/callback` | body `{transcript}` → extract → diff against original → save |
| `POST /api/trades/[id]/approve` | requires all checks passing, a callback match and an active subscription |
| `GET /api/trades/[id]/export` | returns the `.xlsx` |
| `POST /api/checkout` | creates a Stripe Checkout Session (subscription) |
| `POST /api/stripe/webhook` | verifies the signature; on `checkout.session.completed` sets `subscriptions.status = active` |

Every error returns `{error: {code, message, field?}}` with a proper HTTP status, which the UI
displays.

### AI design (`lib/ai/extract.ts`)
- The zod `ExtractedTrade` schema has: `direction` (subscribe/redeem/switch), `isin`, `account_no`,
  `account_name`, `caller_name`, `currency`, `quantity` + `quantity_type` (units | cash), and
  `evidence` (a transcript quote for each field). It also has `trades[]`, so one call can hold
  several trades, plus `unreadable_reason?`.
- Temperature 0. The system prompt covers spoken forms ("I-E zero zero B four…", phonetic
  alphabet, "five K").
- **The model never approves anything.** Its output is only a proposal; `lib/validation` decides.
- The same function is used for the callback transcript, so the diff compares like with like.
- Stretch goal: audio upload → transcript via an audio-capable OpenRouter model (check that a
  suitable model exists before relying on it).

### Validation (`lib/validation/`)
- `isin.ts`: format plus ISO 6166 check digit (letters → numbers, then Luhn). On failure, suggest
  the closest ISIN in the register that does pass.
- `register.ts`: ISIN exists in `funds`; account exists and the name roughly matches; caller is in
  `authorised_callers` for that account; currency is one of the fund's share-class currencies;
  before the dealing cut-off.
- `ambiguity.ts`: flags a quantity with no unit, or the caller's currency differing from the share
  class.
- `diff.ts`: field-by-field comparison of the original and callback trades.
- Each check returns `{check, status: pass|warn|fail, message}`.

### Database (`supabase/migrations/`)
`funds(isin pk, name, share_class_currencies text[], cutoff_time)`,
`accounts(account_no pk, account_name)`,
`authorised_callers(id, account_no fk, name, phone, is_nominated_callback bool)`,
`trades(id, status, transcript, extracted jsonb, checks jsonb, created_at)`,
`callbacks(id, trade_id fk, transcript, extracted jsonb, diff jsonb)`,
`audit_events(id, trade_id fk, actor, type, payload jsonb, at)`,
`subscriptions(desk_id pk, stripe_customer_id, status, current_period_end)`.
Seed file `supabase/seed.sql` holds the synthetic register.

### Data (state sources in the README and the pitch)
- **Funds:** about 10 real, public ISINs of Irish-domiciled UCITS funds/ETFs (a public fact
  sheet is the source; check each ISIN). Share-class currencies and cut-offs are **synthetic,
  labelled as such**.
- **Accounts and callers:** fictional, clearly labelled.
- **Transcripts:** about 20 hand-written synthetic calls in `evals/fixtures/*.json`, each with
  the correct trade as ground truth:
  - Ordinary: a clean subscribe and a clean redeem.
  - Boundary: spelled-out ISIN, phonetic alphabet, "5k", cash vs units, two trades in one call,
    after cut-off.
  - Failure: wrong check digit, unauthorised caller, callback with a different quantity,
    gibberish or empty input, a prompt injection inside the transcript.

---

## Team split and decoupling

Two developers, plus one person on review and idea validation:
- **Dev A (backend and functionality):** everything that makes it work, plus a **plain test UI**
  so the full flow can be clicked through.
- **Dev B (frontend look and feel):** makes it look good by restyling A's components and building
  the pages A doesn't need.
- **Person C:** review and idea validation (no app code).

### How the two devs stay decoupled: the props boundary
Every screen is split into a **page** (fetches data and handles actions; A owns it) and
**presentational components** (they only receive props and render; B owns them after handover).

```
app/(app)/trades/[id]/page.tsx        ← A: loads trade, wires actions
   └─ <TradeReview trade checks onEdit onProceed />   ← props = the contract
         components/trade/TradeReview.tsx            ← A writes plain v1, B restyles
```

Rules:
1. **Contracts are fixed in Phase 0:** `lib/types.ts` (zod schemas + TS types for `Trade`,
   `Check`, `CallbackDiff`, `ApiError`) and the props interface in `components/<area>/types.ts`.
   Only A changes them, and only by **adding optional fields**. Post in chat when one changes.
2. **A writes plain v1 components** (unstyled HTML, no Tailwind tweaking) that render every field
   and state. Once a component works end to end, A says "handed over" and **never edits it
   again**. If more data is needed, A adds an optional prop and asks B to show it.
3. **B never fetches data or calls the API.** B works only with props, using mock data from
   `lib/mocks.ts` (A writes it from real API responses) in a component gallery at `/dev/gallery`.
   B can start before the backend exists.
4. **Typed client:** A provides `lib/api-client.ts` (typed `fetch` functions). Pages use it;
   components never do.
5. Separate git worktrees (`claude -w`) and branches; A and B never edit the same file.

### Ownership. This goes into the `AGENTS.md` table

| Area | Paths | Owner |
|---|---|---|
| **Backend + functionality** | `lib/` (ai, validation, db, types, api-client, mocks), `app/api/**`, `app/(app)/**/page.tsx` (data and actions only), `supabase/`, `evals/run.ts`, `package.json`, Vitest tests | Dev A |
| **Frontend look and feel** | `components/**` (after handover), `components/ui/` (shadcn), `app/globals.css`, `app/layout.tsx`, landing/pricing page `app/page.tsx`, `/dev/gallery`, Playwright visual checks | Dev B |
| **Review and idea validation** | `evals/fixtures/` (JSON transcripts + correct answers), `docs/` | Person C |

Shared hotspots: `package.json`, migrations and `lib/types.ts` → A; global styles and theme → B.
If B needs a new dependency (e.g. an icon library), B asks A.

### Agent task cards (one GitHub Issue each, one agent per worktree)
Each card names its files, its contract and when it's done, so it can go straight to an agent.

**Dev A (backend):**
| # | Task | Files | Done when |
|---|---|---|---|
| A1 | Scaffold Next.js + shadcn, Vercel link, env vars, `.env.example` | root config | Production URL shows the scaffold |
| A2 | Contracts: `lib/types.ts` + component props types + `lib/mocks.ts` | `lib/`, `components/*/types.ts` | B can build against them |
| A3 | Supabase migration + seed (funds, accounts, callers, trades, audit, subscriptions) | `supabase/` | `supabase db reset` seeds the register |
| A4 | ISIN check digit + register checks + ambiguity, with Vitest | `lib/validation/` | Tests pass for valid, wrong digit, wrong length, unknown, unauthorised |
| A5 | OpenRouter extraction (`generateObject` + zod, evidence quotes) + `evals/run.ts` | `lib/ai/`, `evals/run.ts` | Eval prints per-field accuracy on C's fixtures |
| A6 | `POST /api/trades`, `PATCH /api/trades/[id]` + audit events + plain `/desk` and review pages | `app/api/trades`, `app/(app)` | Paste transcript → see checks on the preview URL |
| A7 | Callback route + `diff.ts` + approve + `.xlsx` export + plain callback page | `app/api/trades/[id]/*`, `lib/validation/diff.ts` | Mismatch blocks; match → approve → file downloads |
| A8 | Stripe: `/api/checkout`, webhook, subscription gate on approve, `useSubscription` status | `app/api/checkout`, `app/api/stripe` | Test card turns the subscription active and approve unlocks |
| A9 | Model comparison (2 OpenRouter models) + prompt-injection hardening | `lib/ai/`, `evals/` | Results table handed to C |

**Dev B (frontend):**
| # | Task | Files | Done when |
|---|---|---|---|
| B1 | Visual direction: shadcn theme, type, colours (green/amber/red), app shell/nav | `globals.css`, `layout.tsx`, `components/ui` | Shell looks finished in the gallery |
| B2 | `/dev/gallery` showing every component state from `lib/mocks.ts` | `app/dev/gallery` | Every state (pass/warn/fail, loading, error, empty) is visible |
| B3 | Restyle `TradeReview`: transcript with highlighted evidence quotes next to the fields | `components/trade/` | Clicking a field highlights its quote |
| B4 | Restyle `CallbackDiff` and `AuditTrail` | `components/callback/`, `components/audit/` | Mismatches are obvious at a glance |
| B5 | Landing + pricing page with Subscribe button (calls A's `startCheckout()`) and "active" badge | `app/page.tsx`, `components/billing/` | Explains the problem in 10 seconds |
| B6 | Error, loading and empty states; works at phone width; Playwright screenshots | `components/**` | No unstyled states left |

**Person C's job:**
- **User evidence:** interview anyone with TA or fund-ops experience; collect public evidence (TA
  job ads listing manual entry and callbacks, Central Bank of Ireland guidance); keep the
  evidence-vs-assumption list in `docs/evidence.md`.
- **Test data:** write the ~20 synthetic transcripts with correct answers (ordinary, boundary,
  failure); check the real ISINs and record the data sources in `docs/data.md`.
- **Review:** review every PR (`/code-review` or by hand) before merge; click through each Vercel
  preview with the fixture scenarios and file a GitHub Issue for anything wrong.
- **Pitch:** write it up from the eval results (accuracy, model comparison, what changed); prepare
  and rehearse the demo script; act as the "investor" when testing the Stripe flow.

## Timeline (assumes about 6 hours; scale if different)

**Phase 0: contracts first (≈30 min)**
- A: A1 + A2. Scaffold, deploy to production, write `lib/types.ts`, props types and mocks. B
  reviews the props so they cover what the design needs.
- B: B1 starts as soon as the scaffold is on `main`.
- C: fill in `AGENTS.md` (stack, run/test commands, owner table); create Issues from the task
  cards; save this plan as `docs/PLAN.md`; start writing transcripts.

**Phase 1: first working slice (≈2 h)**
- A: A3 → A4 → A5 → A6 (plain UI).
- B: B2 → B3 against mocks; doesn't wait for A.
- C: first 10 fixtures within the first hour (A5 needs them); user evidence; review PRs.
- **Milestone:** a pasted transcript shows up as validated fields on the live URL. Plain is fine.
  Then A hands over `TradeReview` and B swaps in the restyled version.

**Phase 2: full workflow (≈1.5 h)**
- A: A7 (callback, approve, export), hands over `CallbackDiff` / `AuditTrail` as each works.
- B: B4 on the handed-over components; B5 landing page.
- C: remaining fixtures; run the eval; click through every preview; report bugs as Issues;
  record what changed and why (the "stay curious" story).

**Phase 3: bonus + polish (≈1 h)**
- A: A8 Stripe (e.g. €49/month per desk, test mode), then A9 model comparison; stretch goal,
  audio upload.
- B: B5 Subscribe button wired to `startCheckout()`; B6 states, mobile, screenshots.
- C: full test purchase as a customer; finish the evidence, data-source and eval sections of the
  pitch.

**Phase 4: freeze (≈30 min)**
- Merge everything, check production, add the seeded demo data, rehearse the 2-minute demo: one
  clean trade, then one blocked fraud attempt, then a Stripe purchase that unlocks export.

---

## Mapping to the judging criteria
- **Users first:** the user is a TA operations analyst at a Dublin fund administrator. Collect
  evidence: a teammate's first-hand experience (if any), public TA job ads that list the manual
  callback and data-entry duties, and the Central Bank of Ireland's guidance on outsourcing and
  operational resilience. Keep a list of what is evidence and what is assumption. Route to users:
  pilot with one TA desk through its operations manager.
- **Craft:** a single clear review screen, green/amber/red checks, helpful error messages, typed
  API errors.
- **Urgency/focus:** one workflow; no phone integration, real login or compliance claims.
- **Stay curious:** test the assumption "an LLM extracts spoken ISINs reliably" with the eval set
  and the model comparison; show what changed as a result (e.g. adding check-digit suggestions).
- **AI usage:** structured extraction with quoted evidence, measured accuracy, and the limitation
  (the model gets digits wrong) handled by deterministic checks.

## Verification
- `npm run test`: Vitest for ISIN check digits (valid, wrong digit, wrong length, lowercase),
  register checks, diff and ambiguity.
- `npm run eval`: runs every fixture through OpenRouter and prints per-field accuracy and
  failures. Target ≥95% on ordinary fixtures; boundary and failure fixtures must be **flagged**,
  not wrongly passed.
- Playwright (MCP or `npx playwright test`) against the Vercel preview URL: paste transcript →
  review → callback mismatch is blocked → callback match → approve → `.xlsx` downloads.
- Stripe: locally `stripe listen --forward-to localhost:3000/api/stripe/webhook`; test card
  `4242 4242 4242 4242`; confirm the `subscriptions` row turns active and approve unlocks. Repeat
  on production with the webhook endpoint registered in the Stripe dashboard.
- Check the Vercel production deployment with `vercel:status` and open the URL on a phone.
