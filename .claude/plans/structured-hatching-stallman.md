# Harbor — Full Build Plan

## Context
Harbor is a family command-center platform for chaotic / neurodivergent households, delivered on a wall-mounted Fire tablet. The working directory `C:\Users\penda\HARBOR` is empty (greenfield) — this plan builds the entire product described in the Master Build Prompt: one Next.js codebase with four surfaces (Kiosk, Parent Companion, Admin Console, Public site), a Supabase Postgres backend with RLS, an offline-first kiosk, and deferred Stripe billing.

The **non-negotiable business constraint** drives the architecture: the kiosk's daily core (profiles, visual routines, first-then boards, tap-to-complete + rewards, calm corner, kid-proof lockdown) **must run fully offline from on-device storage and must never be gated behind our servers or a subscription.** Plus (cloud backup, remote edit, content library) is purely additive; canceling it degrades to local-only, never to a broken device.

## Decisions locked (from user)
1. **Provision Supabase now** — create the Harbor project via the Supabase MCP up front; apply migrations/RLS/seed against it while building. Vercel deploy at the end.
2. **Build Plus code, defer activation** — implement subscribe/cancel/Customer Portal/webhook + graceful local-only degrade, wired to env vars. Stripe MCP is **not connected**, so products/prices/webhook get created later (by a connected Stripe MCP or by the user in the dashboard). App must boot and run with no Stripe keys.
3. **Run straight through** — build all 8 milestones autonomously; pause only for genuine blockers or anything that changes the data model or the §1 business constraints.
4. **Admin seed = `/admin/setup` route gated by `SETUP_SECRET`** (my choice, per spec's "implement one and tell me"). Reason: it uses the server-side service role to call `auth.admin.createUser` (robust, unlike hand-inserting into `auth.users`), and self-disables once an admin exists — no temp-password handling in migrations.

## Architecture — the local-first crux
- **Kiosk source of truth = IndexedDB on the tablet.** All daily reads/writes (render routines, tap-to-complete, points, check-ins, calm corner) hit IndexedDB only. The app shell is precached by a service worker, so it cold-loads with the network unplugged. Zero network calls are required for daily use.
- **Pairing (one-time, needs network):** Admin generates a pairing code. Kiosk submits it once; server binds the device to the household and returns a **device secret** + a full household snapshot, which the kiosk writes to IndexedDB. After that, fully offline.
- **Sync (only when online AND Plus active):** background push of local mutations (check-ins, reward deltas) and pull of parent edits, using `updated_at` cursors + soft-delete tombstones. If offline or Plus inactive, sync is skipped and nothing breaks.
- **Kiosk DB access without a user login:** kids never authenticate. The kiosk uses the Supabase anon key to call three `SECURITY DEFINER` RPCs that validate the device secret server-side and scope every operation to the bound household:
  - `rpc_kiosk_pair(code)` → binds device, returns `{ device_secret, snapshot }`
  - `rpc_kiosk_pull(device_secret, since)` → snapshot/delta
  - `rpc_kiosk_push(device_secret, mutations)` → applies child-safe writes (check-ins, step completions, reward points)
  This keeps table-level RLS strict (no broad anon table access) and centralizes kiosk authz. (Chosen over Edge Functions to avoid extra deploy surface; equivalent security.)

## Tech stack & dependencies
- **Next.js (App Router) + TypeScript + Tailwind CSS** scaffolded with `create-next-app`.
- `@supabase/supabase-js` + `@supabase/ssr` (cookie-based auth for App Router; middleware-gated `/admin` and `/app`).
- `stripe` (server) + `@stripe/stripe-js` (client) — wired but guarded by `isStripeConfigured()` so the app runs keyless.
- `idb` — typed IndexedDB wrapper for the kiosk local store.
- `zod` — input validation (waitlist, RPC payloads, forms).
- `lucide-react` — icons (kid-friendly kiosk glyphs + admin UI).
- Fonts via `next/font/google`: **Bricolage Grotesque** (display) + **DM Sans** (body), with system fallbacks.
- PWA: hand-written `/public/sw.js` (precache kiosk shell + runtime cache) + `/public/manifest.webmanifest`, registered client-side from the kiosk route (avoids `next-pwa`'s App Router friction).

## Repository structure
```
app/
  (public)/            page.tsx (landing + Founding Family waitlist)
  kiosk/               pairing + kid view + calm corner (client, offline-first)
  app/                 parent companion (auth: parent) — routines, billing, insights, settings
  admin/               operator HQ (auth: admin)
    setup/             one-time SETUP_SECRET-gated admin bootstrap
  api/
    stripe/webhook/    subscription lifecycle → plus_subscriptions upsert
    stripe/checkout/   create checkout session (monthly|annual)
    stripe/portal/     Customer Portal session
lib/
  supabase/            server, browser, middleware clients
  kiosk/               IndexedDB store (idb), sync engine, pairing client
  stripe/              server client + isStripeConfigured guard + feature gating
  validation/          zod schemas
components/            shared UI + design-system primitives
supabase/migrations/   schema + RLS + RPCs + seed (applied via MCP)
public/                sw.js, manifest.webmanifest, icons
```

## Data model (spec §6 + necessary additions)
All spec tables created via migration with timestamps, FKs, and RLS. Additions required to make local-first/sync/kiosk-auth work:
- `device_pairings`: add `device_secret` (uuid, returned once at pair), `device_label`, `last_synced_at`.
- Syncable child-data tables (`children`, `routines`, `routine_steps`, `rewards`, `calm_tools`, `check_ins`): add `updated_at` (trigger-maintained) and `deleted_at` (soft-delete tombstone) for delta sync.
- `profiles`: add `must_change_password` boolean.
- `rewards`: include a `reward_log` companion table for point history/redemptions.
- **RLS:** admin → full; parent → only their household's rows; `waitlist` → anon `INSERT` open, `SELECT` admin-only; `builds`/`build_supplies` → admin-only. Kiosk paths go through the `SECURITY DEFINER` RPCs, not anon table grants.
- After migrations, run `get_advisors` (security + performance) and resolve flagged issues (e.g., missing RLS, function search_path).

## Milestone execution (maps to spec §11; run straight through)
1. **Scaffold + provisioning:** `create-next-app`, install deps, design tokens/fonts, Supabase clients + middleware, role gating. Create the Supabase project via MCP (`confirm_cost` → `create_project`, region us-east-1, generated DB password), write `.env.local`.
2. **Migrations + RLS + RPCs + seed:** all §6 tables + additions, RLS policies, the three kiosk RPCs, `updated_at` triggers; seed the Build Catalog (§8). Verify with `get_advisors`.
3. **Admin Console:** dashboard (installs, one-time + Plus MRR, founder X/15, Plus count, waitlist leads); Build Catalog CRUD with auto hardware-cost/margin; supplies/sourcing view; shopping-list/PO generator (build × qty → aggregated Amazon list + total); optional inventory with low-stock flags; customers/installs pipeline (lead→scheduled→installed, founder number, referrals, Plus status); founder tracker (capped at 15); provision flow (create household + invite parent + assign build + generate pairing code); `/admin/setup` bootstrap.
4. **Harbor Kiosk:** pairing screen → IndexedDB snapshot; kid view (visual routines, first-then, tap-to-complete + reward animation, points/stars, transition timers); calm corner (breathing, feelings check-in, "I need a break", social stories); parent-PIN gate for all edits/settings/child-switch/exit; full-screen kiosk-friendly layout, large hit areas, high contrast, reduced-motion; service worker + manifest; **verified fully offline**.
5. **Parent Companion:** manage children + routines; build/edit routines and push-to-wall (Plus sync); rewards/calm-tool config per child; gentle insights (completion trends/patterns, framed as structure not diagnosis); household settings, parent-PIN management, device pairing status; billing entry points.
6. **Stripe Plus (deferred activation):** checkout (monthly/annual), Customer Portal, `/api/stripe/webhook` → `plus_subscriptions` upsert + household Plus toggle; **cancel degrades to local-only**, core never gated; everything guarded so a keyless app still runs. Document/queue product+price+webhook creation for when Stripe MCP is connected.
7. **Public landing + waitlist:** Harbor-branded landing (three pillars + "one payment, you own it, no required monthly fee"); Founding Family waitlist (name, email, town, kids_count) → Supabase; founder offer ($249 / first 15) + CTA.
8. **PWA/offline polish + deploy:** finalize SW/caching, accessibility (focus states, contrast, reduced motion), responsiveness; deploy to Vercel via MCP and set env vars.

## Design system (Harbor brand, §9)
Tailwind theme tokens: Deep Harbor `#0C3B47` (primary), Mid Water `#18606F`, Beacon `#F6B23D` (accent, sparingly), Sea Foam `#CFE6E1`, Sea Fog `#EDF3F3` (cool off-white bg), Ink `#0F2A33`, Muted `#5C7178`. Lighthouse mark + soft beacon-glow motif. Calm/warm/trustworthy — not techy, not clinical.

## Secrets / env (never hardcoded)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL`, `ADMIN_EMAIL`, `ADMIN_TEMP_PASSWORD`, `SETUP_SECRET`. Written to `.env.local` locally and set on Vercel via MCP at deploy. Stripe vars may be blank initially (app stays functional).

## Verification (end-to-end)
- `npm run dev` and exercise each surface; `npm run build` must pass clean.
- **Supabase:** `get_advisors` clean for security + performance; manually confirm RLS (parent can't read another household; builds admin-only; waitlist anon insert works).
- **Kiosk offline (the critical test):** pair once, then go offline (DevTools "Offline") and confirm routines render, tap-to-complete, points, check-ins, and calm corner all work; reload offline and confirm cold-load from SW + IndexedDB.
- **Plus cancel degrade:** simulate canceled subscription → kiosk keeps working from local data; only sync/backup/new content disabled.
- **Keyless boot:** with Stripe env unset, app runs and Plus UI shows a "not yet available" state rather than erroring.
- **Founder cap:** assigning a 16th founder number is blocked.
- Deploy to Vercel; smoke-test the public + admin surfaces on the deployed URL.

## Where I will pause (per "run straight through")
- Any change to the spec's data model beyond the additions listed above, or to the §1 business constraints.
- `confirm_cost` before creating the Supabase project (cost gate).
- Vercel deploy (outward-facing) — I'll confirm before publishing.
- If Stripe activation is wanted live, I'll stop for the Stripe MCP connection or dashboard keys.
