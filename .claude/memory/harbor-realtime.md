---
name: harbor-realtime
description: Realtime freshness — parent edits hit the wall in <1s; Supabase DB-broadcast gotcha.
metadata:
  type: project
  originSessionId: 3cd03412-7647-4c62-ade9-5099b108cba8
---

Spec `HARBOR_REALTIME_FUNCTIONALITY.md` (Downloads). Goal: parent change → wall in 15–30s,
ideally instant; no stale caches; cheap. Shipped R1+R2 (2026-06-27).

**R1 — parent app read-your-own-writes:** `next.config.ts` → `experimental.staleTimes
{ dynamic: 0, static: 180 }` so the client Router Cache never serves a stale *navigation*
(the founder's "cache messing with /app"). Mutations already `revalidatePath`, so the
actor's own view was fresh on re-render; this fixes navigating back to a section.

**R2 — broadcast-from-database nudge (parent → wall in <1s):**
- Trigger `public.kiosk_broadcast()` (migration 0045, made private in 0047) on EVERY
  wall-visible table → `realtime.send(<data-free nudge>, 'changed', 'hh:'||household_id, true)`.
  One mechanism covers all writers (parent Server Actions, wall `rpc_kiosk_push`, admin).
  Derives household_id per table (direct col; or via children/people/routines for
  routines/routine_steps/rewards/check_ins/reward_log).
- Client `lib/kiosk/realtime.ts` `subscribeHousehold(id, onChange)`: private channel
  `hh:<uuid>`, `setAuth(session JWT for parents | anon key for the wall)`, returns a
  `removeChannel` cleanup. Wall: `useKiosk` effect → debounced (400ms) `runSync()` (same
  delta-pull path as the poll, so realtime + poll can't diverge). Parent: `RealtimeRefresh`
  in `/app/(parent)/layout.tsx` → debounced `router.refresh()` (live "on the wall now"
  mirror + co-parent freshness).
- The 30s delta poll + full reconcile on wake/online/focus (in `useKiosk`) ALREADY existed
  → that's the backstop (≤30s worst case). SW cache → v7.

**THE GOTCHA (cost me an hour; non-obvious):** Supabase **DB-broadcast (`realtime.send`)
only delivers over the PRIVATE / authorized path.** Sending with `private => false` to a
"public" channel does NOT reach subscribers (the insert lands in `realtime.messages` but is
never fanned out). You MUST: (1) send with `private => true`; (2) have an RLS **SELECT**
policy on `realtime.messages` authorizing the role (migration 0046 allows `anon` [the
device-secret wall, no JWT] + `authenticated` [parents] to receive `topic like 'hh:%' and
extension='broadcast'`); (3) client `setAuth(token)` + subscribe with `config:{private:true}`.
`realtime.messages` ships with RLS **on and no policy** → everything denied by default. The
public flag only controls who may *subscribe*, NOT delivery (per Supabase docs). Nudges are
data-free so the permissive anon policy is safe — real data is pulled over the existing
RLS/device-secret path. Revoke EXECUTE on the trigger fn from anon/authenticated (it's a
trigger, not an RPC — advisor flags it otherwise; triggers still fire).

**Verify realtime** with a node smoke test: anon client, `await realtime.setAuth(anonKey)`,
private channel, then a REAL DB write via SQL; the subscriber must OUTLIVE the write window
(give ~40s — failed/slow SQL round-trips can eat a short timeout and look like "no message").
Verified e2e: a `children` write delivered `{t:'changed',tbl:'children'}`.

**R4 — perf + observability (SHIPPED 2026-06-27):**
- Migration **0048**: covering indexes on every advisor-flagged unindexed FK + composite
  `(household_id, updated_at)` on syncable tables (the delta-pull cursor). Fixed the
  `household_members` RLS auth-initplan by wrapping `auth.uid()` → `(select auth.uid())`.
  Performance advisor now clean of unindexed-FK + initplan (new indexes show "unused" =
  brand-new, normal). LEFT the `household_members` FOR-ALL/_select multiple-permissive
  overlap — splitting security policies on the membership table isn't worth the untestable
  risk for a micro-gain.
- **Pooler / prepared-statements advice is N/A** — Harbor is PostgREST-only (`@supabase/ssr`
  + `supabase-js`, no `pg`/Drizzle/Prisma, no DATABASE_URL). No socket pool to exhaust.
  Audit-confirmed. Only revisit if a direct PG driver is ever added.
- **Suspense** (§7): tailored `loading.tsx` for `children/[id]` (the 7-query waterfall),
  `history`, `insights`, `settings`; admin skeleton migrated to the brand `Skeleton`
  (the `.skeleton` shimmer; the hand-rolled `animate-pulse` bypassed it).
- **Observability** (§8): `lib/observability.ts` `captureError(err, ctx)` — structured
  console line (Vercel log-drain captured), fire-and-forget, with a marked SENTRY SEAM.
  Wired into all four error boundaries (global-error + parent/admin/kiosk error.tsx — they
  were dropping `error`) and the kiosk sync catch. **Full Sentry SDK deliberately deferred**
  — it's absent, no DSN, and a heavy dep on a local-first PWA warrants the founder's go-ahead.
- **Sync-health** (§8): `subscribeHousehold(id, onChange, onStatus?)` now surfaces channel
  status + the nudge payload; `useKiosk` tracks `realtimeStatus / lastNudgeAt /
  lastPropagationMs / outboxDepth / clockSuspect`; the Debug panel (`VoiceDebug`, now
  `BUILD v7`) shows a "Live sync" block. Freshness made observable.

**Still optional:** full Sentry SDK (needs DSN + go-ahead), broad `useOptimistic`, the
sleep-disconnect cost lever (OS suspends the wall socket on sleep → onWake reconcile covers
it), `x-nextjs-cache` QA checklist. R1–R4 of the spec are done.
Related: [[harbor-project]], [[kiosk-sync-selfheal]], [[harbor-helm-declutter]].
