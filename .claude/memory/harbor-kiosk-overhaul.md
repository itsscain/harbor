---
name: harbor-kiosk-overhaul
description: Harbor Kiosk UI Overhaul spec — wall hub-and-spoke redesign; phase progress.
metadata: 
  node_type: memory
  type: project
  originSessionId: 3cd03412-7647-4c62-ade9-5099b108cba8
---

Spec: `C:\Users\penda\Downloads\HARBOR_KIOSK_OVERHAUL_SPEC.md` (authority for `/kiosk` structure/
IA; wins over v1 §5). Thesis: a wall is not a phone — retire the bottom-tab "browse an app" model
for **hub-and-spoke: AMBIENT ↔ FAMILY ↔ CHILD**, children as heroes (not the calendar), resting
state as the flagship, approach-gradient (10-ft rest UI / 2-ft touch UI). Engine untouched
(IndexedDB/sync/RPCs/offline). Phases K1–K6.

**K1 (feel) = already shipped** via Lighthouse: Pressable, LivingAmbient, BeaconLight, grain,
adaptive intensity, accent ramp, Voyage, completion chain, weather glyphs.

**K2 (the new IA) SHIPPED 2026-06-26** — the drastic structural win:
- `lib/kiosk/childStatus.ts` `childDayStatus()` — shared per-child routine+chore progress / next /
  state (anchor|reset|done|active|idle); feeds aura cards now + AMBIENT glance dots later.
- `ChildAuraCard.tsx` (§6.2) — avatar in accent progress ring, glance status, next-thing hint,
  glow when active, check when done, streak badge; whole card → CHILD.
- `FamilyView.tsx` (§6) — the hub replacing the v1 HomeView feed: compact top, reminder banner,
  child aura grid (hero), Family Goal, `RhythmStrip` (today's events + now marker), glance tiles,
  dock. No scrolling for essentials.
- `FamilyDock.tsx` (§4.3) — slim pills (Calendar·Chores·Lists·Rules), FAMILY-only; replaced KTabBar.
- `KioskShell.tsx` — hub-and-spoke routing + adaptive secondary top bar (← Harbor) for Calendar/
  Lists/Chores (they had no back without the tab bar). **Retired KTabBar; deleted HomeView.tsx.**
- Verified on the wall (screenshots work again this session): FAMILY hub renders premium (Mia+Leo
  aura cards, dock, tiles); AMBIENT→FAMILY→CHILD→back + FAMILY→Calendar→← Harbor→back all work.

**K3 (AMBIENT glance dots) SHIPPED 2026-06-26** — `GlanceDots.tsx`: per-child aura dots (avatar in
conic accent ring + status badge from childDayStatus: partial ring/active, check/done, heart/anchor,
dim/idle) on the screensaver above the unlock; tap → wake into that CHILD (Screensaver `onSelectChild`
→ shell sets child view). Verified on the wall (Mia+Leo dots; tapping Leo → Leo's view). The rest of
AMBIENT (hero clock, rotating panels for all §5.3 cases, sleep+nightlight) was already strong.

**K4 (regulation + rewards) SHIPPED 2026-06-26** — audited via 5-agent workflow first. **Anchor wall
transformation** (§9.1, the flagship): on open the world RECEDES — ChildView content blurs+desaturates
(`.anchor-world.is-receded` in globals.css), shell ducks the depth layers to 30% (anchorActive), and
Anchor is now a translucent calming-BLUE veil (`.anchor-veil` backdrop-blur) so the receded world shows
behind. ChildView `onAnchorActive`→shell blocks idle sleep (never interrupts co-regulation) + `autoAnchor`
prop. **Strategy card** stage (breathe→feelings→strategy→re-entry). **Store FillVessel** (`FillVessel.tsx`,
filling lighthouse) for goal items (§10.2). **ParentGate** soft error (hapticErrorSoft+play('error')+rose
"Hmm, that's not it"). **ParentMenu** "Start an Anchor for a child" quick action → child view +anchor flag.
**Calm Tools** footer label fixed (modal was already titled Calm Tools). Verified on the wall (recede
screenshot = calm blue field; strategy flow; lighthouse vessel).

**K5 (secondary surfaces + first-run) SHIPPED 2026-06-26** — audited via 5-agent workflow. Part 1:
Chores-all **family teamwork meter** (familyChoreProgress() in childStatus.ts; cooperative done/total,
verified "0 of 7"); Calendar **accent-tints when a single child is filtered** + **"Synced from Google
Calendar" cloud** in the event sheet (KioskEvent.google_event_id) + filter-chip haptics; Lists
**satisfying check-off** (hapticTapMedium+play('step')) + add-item pop + tabular "N left". Part 2: the
**"lighting the lighthouse" first-run** (§12) — PairingScreen reframed ("Let's light your Harbor",
auto-format XXXX-XXXX), **LightingMoment.tsx** (beacon ignites + bloom + "Welcome home, [Family]",
play('milestone'), family name sanitized) wired into KioskApp before PinSetup, plays once on first boot.
**Verified E2E via local unpair/re-pair** (minted code LITE2026; welcome→lighting→PIN→wall) — the preview
is now re-paired (code LITE2026, PIN 1234; household has NO server PIN so nothing was clobbered).
**BUG FOUND+FIXED:** LightingMoment auto-advance timer reset on every re-render (onDone identity) → ref +
run-once effect.

**REMAINING — K6 only (delight, P2):** Voyages milestones, minigame decision (Star Catch → calm scene or
cut), photo-mode ambient, Harbor Report panel on the wall, sonic polish. **Carried polish:** single
continuous ambient layer across states (§4.1 — screensaver paints its own bg); shared-element FAMILY↔CHILD
avatar flight (currently a plain view swap); CHILD "Home" should be the avatar.
**K4** — Anchor wall transformation (world recedes/desaturates to blue, grain softens, sounds duck),
Calm Tools rename, Store filling-vessels, ParentMenu quick-Anchor + PinPad. **K5** — secondary
polish (calendar accent blocks/now-line/sync affordance, chores teamwork meter, Lists Quick Capture
on wall) + "lighting the lighthouse" first-run. **K6** — Voyages milestones, minigame decision
(calm scene or cut Star Catch), photo-mode ambient, Harbor Report panel, sonic polish.

NOTE: CHILD view still uses a text "Home" button (spec wants the avatar as home / shared-element
flight — a K2/K3 polish item). Shared-element FAMILY↔CHILD flight not yet built (currently a plain
view swap).

Related: [[harbor-v2-lighthouse]], [[harbor-brand-identity]], [[harbor-project]].
