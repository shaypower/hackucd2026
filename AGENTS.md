# hackUCD 2026

Instructions for every AI agent (Claude Code, Codex, ...) and every human on the team.
Agents read this on every task, so keep it short and current.

## Project

- **Building:** TelDeal: phone trade instructions → AI-extracted trade → code-validated checks →
  callback match → Payments `.xlsx` + audit trail, for fund transfer agents. Full plan: `docs/PLAN.md`.
- **Stack:** Next.js 16 (App Router, Cache Components on) + TypeScript, Tailwind v4 + shadcn/ui (base-nova),
  Supabase Postgres, OpenRouter via AI SDK (`ai` + `@openrouter/ai-sdk-provider`) + zod, Stripe sandbox, exceljs.
- **Setup:** `npm install`, copy `.env.example` to `.env.local` and fill in the team's shared keys (ask the repo owner).
- **Run:** `npm run dev` → http://localhost:3000 (local first; Vercel later).
- **Test:** `npm test` (Vitest, `**/*.test.ts`), `npm run typecheck`.
- **Format/lint:** `npm run lint`.

## Who owns what

Only edit files in the area your task is about. If something needs to change in another
person's area or in a shared file, say so instead of changing it.

| Area | Paths | Owner |
|------|-------|-------|
| Backend + functionality (and a plain test UI) | `lib/`, `app/api/**`, `app/(app)/**/page.tsx`, `supabase/`, `evals/run.ts`, `package.json` | Dev A |
| Frontend look and feel | `components/**` (after A hands a component over), `components/ui/`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `app/dev/gallery` | Dev B |
| Review and idea validation | `evals/fixtures/`, `docs/` | Person C |

Decoupling rule: pages (A) fetch data and pass props; components (B) only render props and never
call the API. Props/types live in `lib/types.ts` and `components/<area>/types.ts`; only A changes
them, and only by adding optional fields.

Shared hotspot files each have one owner; everyone else asks them for changes:
dependency manifests and lockfiles, DB schema/migrations, shared types / API contracts,
the route registry, global styles.

## Rules for agents

- Reuse before you create: search the repo and "Shared pieces" below for an existing
  helper, component or type before writing a new one.
- Keep diffs scoped to the task. No drive-by refactors, renames or reformatting of code you didn't change.
- Don't change shared contracts (types, API shapes, schema) as a side effect. Propose the change,
  or make it on its own as a small separate change.
- Look up library APIs with Context7 rather than relying on memory.
- Check UI changes in the browser with Playwright before calling them done.
- Never commit secrets. New env vars go in `.env.example` with a placeholder value.
- When you add something others will reuse, add a line for it under "Shared pieces".

## Git workflow

- `main` must always run. Tasks are GitHub Issues; one short-lived branch per issue: `<you>/<issue#>-<task>`.
- `git pull --rebase origin main` before starting a task; merge back within about an hour.
- Never commit straight to `main`; every change goes through a PR. Create Issues and PRs with the
  GitHub plugin (`gh` CLI if it isn't connected). Setup: `docs/PLAN.md` → "Git workflow".
- Small PRs. Review with `/code-review` (Claude) or `codex review` before merging.
- Running more than one agent yourself? Give each its own worktree (`claude -w <name>`) so they never share a folder.

## Shared pieces

<!-- one line each: path - what it is -->
- `lib/utils.ts` - `cn()` class-name merge helper (shadcn)
- `components/ui/` - shadcn components: button, card, textarea, input, label, badge, alert, table, separator
- `lib/types.ts` - zod schemas + types shared by API, pages and components (Trade, Check, CallbackResult, AuditEvent, ApiError...)
- `components/{trade,callback,audit,billing}/types.ts` - props contracts for presentational components
- `lib/mocks.ts` - mock trades/callbacks/audit/subscription/errors covering every UI state (for `/dev/gallery` and tests)

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
