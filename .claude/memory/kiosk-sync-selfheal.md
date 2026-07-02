---
name: kiosk-sync-selfheal
description: "How the kiosk prunes stale/orphaned cached rows — delta sync is additive, a full reconcile heals."
metadata: 
  node_type: memory
  type: project
  originSessionId: 3cd03412-7647-4c62-ade9-5099b108cba8
---

Harbor's kiosk sync (`lib/kiosk/sync.ts`) is **delta + additive**: `syncNow` pulls rows changed since `lastSync` and `mergeById` upserts them (removing only rows whose delta carries `deleted_at`). So a server row that vanished **without a deletion the wall could see** (e.g. a hard delete, or a row gone from the snapshot) lingers forever in the device's IndexedDB — this is what caused a stale "Test" wall message that wasn't in the DB.

**Fix shipped:** `syncNow(state, {full:true})` pulls the COMPLETE set (`p_since=null`) and `applyPull(…, replace=true)` **replaces** every server-authored array instead of merging, pruning orphans. It runs **on boot** (`runSync(true)` in `useKiosk`) and from **Parent menu → "Refresh from cloud"**; the 30s interval stays a cheap delta. Guards intact: offline / no-Plus early-returns (daily core untouched), outbox pushed first, `state.progress`/points preserved (kiosk-authored, never replaced).

**Stale-bundle delivery (the real blocker):** an always-on wall never reloads, so deploys (incl. the self-heal) don't run until it loads the new build. Fixed: `public/sw.js` cache version bump per deploy (v3) + `RegisterSW.tsx` reloads the wall on SW `controllerchange` (guarded: only after a prior controller, throttled once/min via sessionStorage → no reload loop) and polls `reg.update()` every 30 min + on visibility. So the wall auto-updates. A persistent stale "Test" wall message was this class of bug — not in the DB anywhere, just cached on the device.

**Gotcha for full-replace:** the `kiosk_snapshot` full pull returns only **active** groundings (`status='active'`) — that's fine because `activeGroundingFor` already filters `status==='active'` and the wall never needs ended ones. Any NEW server-authored table added to the snapshot must have its full-pull (`p_since is null`) branch return the **complete** non-deleted set, or full-replace will wrongly drop valid rows. Related: [[harbor-project]].
