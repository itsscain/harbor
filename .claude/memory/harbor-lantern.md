---
name: harbor-lantern
description: The Harbor Lantern (/lantern) — per-child bedside device = the Outpost, commercialized. Device-initiated pairing + bedside layer.
metadata:
  type: project
---

Spec: `C:\Users\tj.pendarvis\Downloads\HARBOR_LANTERN_DEVICE.md`. The **Lantern** is the per-child
bedside device that beats Skylight Buddy on co-regulation, voice, neurodivergent fit, and the Voyage.
It is **the Outpost, commercialized** — reuse the existing single-child kiosk experience, don't rebuild
(the doc is emphatic: compose, don't fork). Phasing: **L1** pairing-to-a-child + single-child experience
+ satisfying complete → **L2** bedside layer + Anchor + voice → **L3** polish + management.

**SHIPPED 2026-07-02 (L1 + a bedside-layer start):**
- **Device-initiated pairing** (the signature UX; the doc §3 wants device-shows-code, parent-enters-and-
  picks-child — the INVERSE of the pre-existing parent-initiated flow). Migration **0062**:
  `pairing_requests` (pre-auth staging, RLS **deny-all** + revoked grants → reachable only via definer
  RPCs) + `rpc_lantern_request_code` (anon: mint code+nonce) + `rpc_lantern_poll` (anon, **nonce-gated** —
  knowing the code ≠ getting the secret) + `rpc_lantern_claim` (authenticated, **child_is_mine** — binds
  only to the caller's own child; mints device_secret, creates an `outpost` device_pairings row, fills the
  request so the device's poll adopts secret+snapshot). Codes 6-char unambiguous, expire 15 min.
- **`/lantern`** route + `manifest-lantern.webmanifest` (its own PWA). `components/kiosk/LanternApp.tsx`
  (parallels KioskApp: unpaired → `LanternSetup` [shows code, polls]; paired+outpost → `LanternShell`).
  `LanternSetup` persists {code,nonce} to localStorage (resume across reload), polls every 3s.
- **`useKiosk.adopt(result)`** — device-initiated claim result → paired KioskState (shares
  `applyPairResult` with `pair()`). Exported `PairResult` type.
- **BESPOKE LIGHT UI (2026-07-02, user override):** the first cut reused the DARK kiosk (OutpostShell/
  ChildView/Voyage) — user rejected it: "it just looked like the kiosk version." The Lantern must have a
  **completely different, LIGHT, Skylight-Buddy-style UI** built in Harbor's brand (a kid's-room device, not
  the wall). Rebuilt `LanternShell` to orchestrate light views (home ⇄ routine ⇄ chores) + Anchor + voice +
  a light resting clock. New: `lib/lantern/day.ts` (PURE logic over lib/kiosk helpers — childRoutinesToday,
  routineWindow[open/catchup/upcoming], routineProgress, doneToday, childChoresToday, pickNowRoutineId,
  childSettings) + `lib/lantern/theme.ts` (pastel routine themes); `components/lantern/` LanternHome (light
  hub: **child's own avatar as the face** [user pick], routine tiles with window-aware status, star balance,
  chores + break tiles), LanternRoutineView (one **focused task card** + big satisfying complete + Skip-for-
  now; PORTS ChildView's window/catch-up/strict-order/First-Then/approval/choice/substep/skill logic in a
  LIGHT card), LanternChores (pastel grid), LanternClock (light flip-clock, dims at night). Brand: seafog/
  white bg tinted by the child accent, harbor ink text, beacon-gold stars, Bricolage+DM Sans, big rounded
  tiles. **RULE: reuse the DATA/LOGIC (useKiosk + lib/kiosk + lib/lantern/day), NEW light PRESENTATION.**
  VoiceButton gated to voiceChat-on only. Confirmed direction with the user via a show_widget mock first
  (they're visual — do this for big Lantern visual changes).
- **Parent claim UI**: `claimLantern` action + `LanternClaimForm` (useActionState, inline error + warm
  "Welcome — this is Cade's Lantern!") in a "🏮 Set up a Lantern" card on `/app/devices`.

**SECURITY (adversarial review caught + fixed pre-ship, migration 0063 + client):** the Lantern voice
button is gated on the child's OWN `voiceChat` being on → routes ONLY to the bounded child-scoped
`/api/ai/voice`; it must NEVER fall back to `/api/ai/command` (childId=null) which reads/mutates the WHOLE
household (sibling data) — that would break §7 isolation. Pairing: a claimed `pairing_requests` row is
served for a 5-min adopt window then poll deletes it (was: served forever → secret leak); `request_code`
DELETEs expired rows (bounds anon flooding); `LanternSetup` retries `request_code` when offline and adopts
BEFORE burning the guard/localStorage token (transient IndexedDB failure retries, doesn't strand a consumed claim).

**UPDATES 2026-07-02 (user asks):**
- **Cross-device done-state (Lantern ↔ wall REALTIME):** the snapshot synced POINTS but not WHICH
  steps/chores were checked off, so a completion on one device didn't check off on another. Migration
  **0064** rebuilds `kiosk_snapshot` to add a `completions` array (last-2-days step/chore completions from
  reward_log: {child_id, ref, kind, at}); `sync.ts applyPull` UNION-merges them into local `progress` by
  the **family-tz service day** (today only); `useKiosk.runSync` now UNIONS `synced.progress` (cross-device)
  with `prev.progress` (during-await) instead of discarding the former. Points still come from `rewards`
  (no double-count — the merge only mirrors the CHECKMARK). Broadcast on reward_log already nudges pulls.
  **Requires Plus** (sync is Plus-gated; both test households have it). KioskSnapshot.completions added.
- **TZ bug:** server-rendered pages (`/app/history` activity, home next-event, child voice log) formatted
  times in **UTC** (Vercel) not Eastern. Fixed to `formatTimeInTz`/`formatInTz`/`dayKeyInTz` with the family
  tz (America/New_York default). GOTCHA: those helpers take **Date|number, NOT string** — wrap ISO in
  `new Date(...)`. Calendar page was already correct (reference). Remaining minor UTC displays: settings
  gcal, billing, meals, insights (lower priority).
- **Responsive Lantern:** home/routine/chores now `h-dvh flex` + auto-fit grids
  (`[grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]`) + internal `overflow-y-auto` so they FIT
  any tablet (landscape/portrait) instead of `min-h-dvh` overflowing.

**GOTCHAS / KNOWN GAPS:**
- The paired snapshot is the WHOLE household (`kiosk_snapshot(household)`) — the pre-existing Outpost model.
  The Lantern **UI** shows only the bound child, but local storage holds household data. True per-child
  cryptographic snapshot scoping (§7 "can't see other children even compromised") is a **future hardening**,
  NOT done — don't claim full data isolation.
- **L2/L3 REMAINING:** sound-machine + gentle wake-alarm→Morning-Voyage (§5), full nightlight config from the
  app, re-assign-to-a-sibling flow (§3.3), fleet/remote-refresh polish. Anchor + voice + the Voyage already
  work via the reused ChildView.
- Verify: parent `/app` + the paired kiosk/Lantern are auth/pairing-gated → agent preview can't screenshot;
  verify via clean build + adversarial review + a real paired device.

Related: [[harbor-device-mgmt]] (Outpost + device_pairings + pairing), [[harbor-routines-app]] (the child
routines it runs), [[harbor-kiosk-overhaul]] / [[harbor-childview-visual]] (ChildView/Voyage), [[harbor-ai-voice]]
(the voice it exposes), [[harbor-project]].
