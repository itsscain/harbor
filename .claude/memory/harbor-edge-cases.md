---
name: harbor-edge-cases
description: Harbor Edge Cases & Exploit Fixes — economy/time/authority hardening; audit findings + progress.
metadata: 
  node_type: memory
  type: project
  originSessionId: 3cd03412-7647-4c62-ade9-5099b108cba8
---

Spec: `C:\Users\penda\Downloads\HARBOR_EDGE_CASES_AND_FIXES.md` — harden the points economy + time/sync
integrity against child exploits (threat model = a kid on the wall who wants more stars / to skip / clock-
tamper). Principle: **harden the economy, never the child's regulation** (break/Anchor always free). Build
the 5 root systems (§1) first. Additive to v1 schema.

**5-agent audit 2026-06-26** (workflow wubbv4ebo): 17 reproducible exploits, 4 partial, 7 already safe.
**ALREADY SAFE (don't rebuild):** the AUTHORITY model — the wall is read+complete only; it can't author
routines/chores/rewards/points; voice can't complete/redeem/mutate or open settings; no unguarded gate
path; re-check farming is blocked locally (one-way completion, `progress.completed`); re-opening a done
routine doesn't re-award; routines not scheduled today (runsToday) aren't completable; sleep is quiet-
hours-gated not routine-gated.

**SHIPPED round 1 (2026-06-26):**
- **§1.1 idempotent ledger** — the push RPC already deduped on client_op_id; the hole was RANDOM per-device
  op_ids → offline double-earn (K1). Fix: deterministic op_ids `<child>:step|chore:<id>:<serviceDay>` in
  useKiosk completeStep/completeChore; `reward_log.client_op_id` → text (migration 0037, recreated
  rpc_kiosk_push FROM LIVE def to keep 0025 rotation crediting). **Verified E2E** (same op_id twice → 1
  award). GOTCHA: always recreate an RPC from `pg_get_functiondef` (live), not an old migration file — 0010
  was stale vs 0018/0025 chore handling.
- **§H1 PIN rate-limit** — ParentGate: 5 wrong → escalating cooldown (30s→5min) "try again in a bit".

**§1.2 SERVER BACKSTOP SHIPPED (2026-06-26, migration 0038):** rpc_kiosk_push now rejects any
completion/chore/redemption with `created_at > now()+2min` (`continue when …`) → forward-clock farming
(roll to tomorrow → re-earn, E2) is dropped at sync; local optimistic points reconcile away. Verified
(present applied=1, +1-day applied=0). The deterministic op_id (§1.1) already handles same-day/backward.

**§1.2 CLIENT SHIPPED (2026-06-26):** `lib/kiosk/time.ts` — `trustedNow()` = state.lastSync (server time)
+ wall elapsed since sync; `serviceDay()` from trustedNow, FROZEN at lastTrustedDay when clockSuspect;
`clockJumpedBack()` detects backward jumps. sync.ts applyPull re-anchors trustedAt/lastTrustedDay + clears
clockSuspect. useKiosk: 90s clock-watch sets clockSuspect on a backward jump; completion/chore op_ids now
key off `serviceDay()` (trusted). KioskShell: calm clock-suspect banner. Normal path verified unbroken
(serviceDay==todayKey when honest). **Time-integrity story now substantially complete** (server future-
guard 0038 + client trusted serviceDay + clock-suspect). NOTE: display code (ChildView prog/childStatus/
streak/grounding) still reads raw todayKey() — only the dedup op_id is trusted; a fuller sweep + routing
those off serviceDay + pushing clock_suspect to /app (device_pairings col) is a future polish.

**REMAINING P0/P1 (next rounds):** §C1 redemptions as reconciled events (offline double-spend); §B5
approval-gated chore awards before approval; routine windows (§1.3/A1-A4 TJ's bedtime-at-noon — routines
always-on, no window, arrival not per-kind); §C5 pause_rewards on every redeem path; §I1 voice config
gating.
- **§C1 redemptions as reconciled events** — currently just points_total decrements → offline double-spend.
- **§B5 approval-gated chore** — awards points before parent approval (should be pending/zero until approved).
- **routine windows / arrival per kind (§1.3, A1-A4 — TJ's bedtime-at-noon)** — routines are always-on when
  days_of_week matches; not windowed by start_time; arrival is the same regardless of routine kind. Add
  routines.kind + window; gate completion/arrival to the window. (P1 but high-value/TJ's case.)
- **§C5/D1** pause_rewards enforced only on the Store screen, not every redeem path.
- **§I1** voice config-mutating commands (add_chore/plan_dinners) should be parent-gated.

Acceptance tests = §3 of the spec (each reproduced exploit is a failing test). Related: [[harbor-kiosk-overhaul]],
[[harbor-childview-visual]], [[harbor-project]].
