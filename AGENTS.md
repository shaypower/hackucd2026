# hackUCD 2026

Instructions for every AI agent (Claude Code, Codex, ...) and every human on the team.
Agents read this on every task, so keep it short and current.

## Project

<!-- TODO: fill in once the idea and stack are picked -->
- **Building:** TBD
- **Stack:** TBD
- **Run:** TBD
- **Test:** TBD
- **Format/lint:** TBD

## Who owns what

Only edit files in the area your task is about. If something needs to change in another
person's area or in a shared file, say so instead of changing it.

| Area | Owner |
|------|-------|
| TBD  | TBD   |

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
- Small PRs. Review with `/code-review` (Claude) or `codex review` before merging.
- Running more than one agent yourself? Give each its own worktree (`claude -w <name>`) so they never share a folder.

## Shared pieces

<!-- one line each: path - what it is -->
- (none yet)
