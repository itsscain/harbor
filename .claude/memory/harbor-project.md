---
name: harbor-project
description: "Harbor — the wall-tablet family command center app at C:\\Users\\penda\\HARBOR (stack, infra, deploy, accounts)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 3cd03412-7647-4c62-ade9-5099b108cba8
---

Harbor is a wall-mounted-tablet family command center (visual routines, calm-down
corner, kid-proof lockdown) for neurodivergent/busy households. Built 2026-06-20
as one Next.js 16 app with four surfaces: `/` (marketing+waitlist), `/kiosk`
(offline-first PWA, the product), `/app` (parent companion), `/admin` (operator HQ).

**Business rule (non-negotiable):** the kiosk core runs local-first from IndexedDB
and must never be gated behind the server or a subscription. Plus (Stripe) is
additive; canceling degrades to local-only.

**Infra**
- Supabase project ref `bxikpngjclaqbdspakya` (org "Cainssh", us-east-1), managed
  via the Supabase MCP. Migrations in `supabase/migrations/`. RLS on every table;
  kiosk uses anon SECURITY DEFINER RPCs (`rpc_kiosk_pair/pull/push`).
- Deployed on Vercel (team cainssh, project `harbor`): **https://harbor-liard.vercel.app**.
  Prod env vars set via `vercel env`. Service role key + SETUP_SECRET + admin temp
  password live in `.env.local` (gitignored) and Vercel — NOT in git/memory.
- Stripe is coded but **deferred/inactive** (no keys). See `docs/STRIPE_SETUP.md`.

**Accounts (in the live DB)**
- Admin: pendarvis.tj1@gmail.com — seeded with `must_change_password=true` (first
  login forces a password reset; temp password is in `.env.local`).
- Demo data: parent test.parent@example.com, household "Rivera Family" (kids Mia/Leo),
  pairing code TESTPAIR (consumed during testing). Safe to delete when no longer needed.

**Family Hub expansion** (migration 0009): added household-scoped tables `events`
(calendar), `store_items` (reward store — closes the points loop), `list_items`
(shared lists — the ONE new kiosk write path via guarded `list_ops`), `wall_messages`
(notes/nudges; bonus points applied server-side only), `reminders`; plus
`households.settings` jsonb (idle/screensaver), `reward_log.store_item_id`, and
nullable `routines`/`routine_steps` time columns (Now/Next). Kiosk now has a
Home dashboard + idle screensaver, per-child views, read-aloud/sensory cues. Parent
app nav is Home/Calendar/Lists/Store/More. Design doc lists many more "later"
features (meal planner, bedtime/sensory modes, co-parenting/two-home, behavior
insights).

**Stack notes:** Next 16 (Turbopack, React 19, Tailwind v4 `@theme`), `proxy.ts`
not `middleware.ts`, async request APIs. See [[harbor-build-feedback]] for working
preferences if present. Architecture details in `AGENTS.md`.
