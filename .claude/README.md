# Claude Code context for Harbor

This folder carries the assistant context so work can continue from any machine.

- **`memory/`** — durable project memory. `MEMORY.md` is the index; each `*.md` is one
  fact (architecture decisions, shipped phases, gotchas). Loaded by Claude Code each
  session for this project. Contains no secrets (keys/passwords live only in
  `.env.local`, which is git-ignored, and in Vercel).
- **`plans/`** — saved implementation plans.
- **`launch.json`** — dev-server config for the preview tooling.
- **`settings.local.json`** — local permission allowlist (no secrets).

Project architecture is documented in [`../AGENTS.md`](../AGENTS.md) (referenced by
`../CLAUDE.md`). To resume elsewhere: clone, `npm install`, recreate `.env.local` from
your Supabase/Vercel dashboards, then open the repo in Claude Code.
