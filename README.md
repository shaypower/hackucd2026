# hackUCD2026

## Team setup (once per person)

The repo ships shared AI-agent config so everyone's agents follow the same rules:

- [`AGENTS.md`](AGENTS.md) – project info, who owns what, rules for agents, git workflow.
  Codex reads it directly; Claude Code reads it through `CLAUDE.md`.
- `.mcp.json` – MCP servers for Claude Code: Context7 (up-to-date library docs) and Playwright (browser testing).
- `.claude/settings.json` – Claude Code plugins for the team (Superpowers, feature-dev, commit-commands).

**Claude Code:** run `claude` in the repo and accept the prompts to trust the folder,
install the plugins, and enable the project MCP servers.

**Codex:** MCP servers are configured per user, so run once:

```bash
codex mcp add context7 --url https://mcp.context7.com/mcp
codex mcp add playwright -- npx -y @playwright/mcp@latest
```

Playwright MCP needs Node.js 18+.

## Workflow

Short version (details in [AGENTS.md](AGENTS.md#git-workflow)): one GitHub Issue per task, one short-lived
branch per issue, `git pull --rebase origin main` before you start, merge back within about an hour,
and only edit inside your own area.
