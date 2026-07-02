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

**DELIGHT PASS 2026-07-02 (user: "make it like a lantern buddy… more friendly… smooth like butter swipe
through cards like Skylight Buddy… feedback for the child… a million times better"):**
- **The mascot** = `components/lantern/LanternBuddy.tsx` (export name stays `LanternBuddy`; callers unchanged),
  moods `happy|wave|cheer|sleepy`, props `{mood,accent,size,reducedMotion,cheerKey}`. **PURE transform/opacity
  animation only** (keyframes `lb-bob/lb-blink/lb-glow/lb-cheer/lb-wave/lb-spark` in globals.css after
  `.nudge-x`) so it's smooth on a cheap tablet + fully still under reduced motion. Replay a cheer by bumping
  `cheerKey` (keyed remount). Exports `buddyMood()` + `buddyLine(done,total,name)`. Greets on the Home hero
  (replaced the plain big avatar; ChildAvatar still the 40px top-bar identity) and rides in the routine flow.
  **v1 was "Beam", a buoy-lantern — the user rejected it 2026-07-02: "looks like a rocket ship with a face."
  REDESIGNED to "Skipper", a SAILBOAT** (viewBox `0 0 120 100`, landscape; width=size*1.2, height=size): a
  wide hull in the **child's accent color** (sail cream, seafoam inner, coral pennant, gold waterline stripe +
  a warm masthead light), riding a mint wave. Picked by the user from 6 workflow-generated + judged candidates
  (sailboat / paper-lantern / buoy+lantern / life-ring / lighthouse / classic-lantern) that I RENDERED in a
  throwaway static page and screenshotted via the Claude Preview MCP (python http.server on a temp launch.json
  config — reverted after). **LESSON: for mascot/character SVG, RENDER + screenshot before shipping — judging
  SVG blind is how "Beam" shipped looking like a rocket.** Sailboat can't read as a rocket (horizontal mass +
  sail + wave). Moods: happy (bob+blink+glow), wave (pennant flaps), cheer (whole-boat bounce + sparkles),
  sleepy (arced eyes, dim light, "z").
- **Butter-smooth swipe carousel** (LanternRoutineView, REPLACED the single focused card): native CSS
  scroll-snap (`snap-x snap-mandatory overflow-x-auto` + card `w-[86%] snap-center` + `px-[7%]` peek +
  `[-webkit-overflow-scrolling:touch]`, scrollbar hidden). Manual swipe = native momentum (NO `scroll-smooth`
  on the container — programmatic scrolls pass `behavior:"smooth"` explicitly). Auto-centers the first-undone
  step on open + after each completion via a `useEffect([doneCount, routineId])` calling
  `scrollIntoView({inline:"center",block:"nearest"})` (only fires on completion, never fights a manual swipe).
  a11y arrow buttons (`sm:flex`, hidden on mobile) `scrollBy(±clientWidth*0.86)`. **All gates preserved**
  (no-silent-no-op): not-yet-open refusal, catch-up, strict-order/First-Then nudge (now also scrolls to the
  expected step), approval PIN, choice, substep.
- **Richer feedback**: per-completion radial bloom + check on the card (`animate-radial-fill`, ends opacity
  0), points burst, Confetti, Beam cheer+sparkles — all scaled by sensory intensity / off under reducedMotion.
- **Cards "too big / cut off" fix (user, 2026-07-02):** the carousel now **fills the height** (`flex min-h-0
  flex-1`), each card wrapper is `h-full w-[86%] max-w-[380px] snap-center` (max-w so cards aren't giant on a
  wide tablet), and StepCard is a **full-height flex column** (`h-full ... justify between icon+title / a
  flex-1 centered content region`) with vh-clamped icon (`w-[clamp(56px,12vh,96px)]`) + button
  (`w-[clamp(60px,11vh,88px)]`) + `overflow-hidden`, so a card is bounded to the viewport and can't grow past
  it & clip. Substep list scrolls internally (`min-h-0 flex-1 overflow-y-auto`). The `<main>` branches were
  refactored into ONE ternary chain (resting / finish / empty / carousel) — allDone-order matters (allDone
  wins over notYetOpen); catchUp banner nested in the carousel branch. Replaced the earlier `m-auto`-wrapper
  attempt (which still let content-sized cards overflow).
- **Earlier review fixes (adversarial pass, 4 confirmed):** (1+2) tall card clipped on short/landscape → the
  complete button is vh-clamped `w-[clamp(...)]` like the icon (superseded by the full-height rewrite above);
  (3) substep final-tick no longer pre-commits full
  `subProgress` before `complete()` — if an order gate refuses, it hands to `complete()` for the nudge so the
  card never sticks at "N of N done"; (4) header Beam now flips to a short-lived `justCheered` mood (950ms)
  so the bounce fires on EVERY completion, not just the last. Shipped commit c826871.

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
