---
name: harbor-kiosk-rework
description: Kiosk Massive Rework — K1 Harbor Feedback System shipped; Voyage/Ambient/Anchor peaks deferred (K2/K3).
metadata:
  type: project
  originSessionId: 3cd03412-7647-4c62-ade9-5099b108cba8
---

Spec `HARBOR_KIOSK_REWORK.md` (Downloads) — make the wall lit (Lumen), **felt** (the Feedback System),
and alive. Ship **K1 first**. Lumen was already largely shipped ([[harbor-kiosk-lumen]]); the genuinely-new
K1 core is the Feedback System.

**Grounding caught the spec half-outdated:** the wall ALREADY had a synth engine + haptics + voice:
`lib/kiosk/audioctx.ts` (one shared AudioContext, auto-unlocked on first gesture — reuse it, never make a
2nd), `lib/kiosk/feedback.ts` (`play()` synth sounds, `chime`/`tone`, `haptic()` + `HAPTIC` patterns,
`speak()`/`cheer()`), `components/kiosk/Pressable.tsx` (`usePress` fires tapLight haptic on pointerdown +
`.pressable` CSS scale), and completions/rewards already fired sound+haptic+voice. Per-child settings via
`readChildSettings` → {sound, haptics, reducedMotion, sensory, intensity, readAloud}; `lib/kiosk/motion.ts`
`intensityOf`/`INTENSITY` {calm .6/standard 1/vivid 1.25}. **So the real K1 gap was just §3.6 (no unified
bus) + the SILENT micro-events (taps/nav/tabs/back/break made no sound — only completions did).**

**K1 SHIPPED (2026-06-28) — unify + fill, did NOT rebuild:**
- `feedback.ts`: a single **`feedback(event, opts)` bus** mapping the §3.2 named events → coordinated sound
  + haptic (+ the keeper's voice on meaningful events when `say` passed), gated by sound/haptics and
  **scaled by sensory intensity** (`play()` gained a `gain` arg → `curGain` multiplies each blip's vol;
  `scaleHaptic()` scales vibrate patterns). New micro sounds (tap/navigate/back/tabswitch/break/listen/
  select) — soft, one warm key (C-pentatonic), **per-name debounced ~45ms** so rapid taps never stack
  ("lovely on the 50th tap"). `setFxDefaults({sound,haptics,intensity,quiet})` set by KioskShell from the
  effective (household+device-merged) settings; **quiet hours DUCK all sound ×0.5 (softer, not silent);
  device sound toggle = hard mute.**
- `Pressable`/`usePress` gained an `fx` event prop → a press fires the bus beat; omit `fx` = legacy
  haptic-only press (zero regression for existing Pressables).
- Wired the silent sites: child-card (`ChildAuraCard`) + dock (`FamilyDock`) → `navigate-in`; ChildView
  Home → `back`; routine tabs → `tab-switch`; "I need a break" → `break`. Completions re-routed through
  the bus too (`step-complete`/`chore-complete`/`arrival`), intensity-scaled, faithful.

**Adversarial review (after build) caught + I fixed:** (1) finishing a routine fired step-chime AND
arrival-bell (+ two voice lines) overlapping → now a finishing step plays ONLY the arrival beat;
(2) global debounce could swallow a distinct fast nav sound → per-name `Map`; (3) child completions
bypassed quiet hours → quiet now ducks every sound. **VERIFY: build clean + `/kiosk` boots with no console
errors + a press exercises usePress→feedback without throwing (AudioContext+vibrate present); the audible/
haptic QUALITY (synth tones, patterns) is only verifiable on the wall tablet — headless can't play sound.**
Build stamp **v18**.

**K2 SHIPPED (2026-06-28) — the Voyage elevation (the hero, §5.3):** again the foundation existed
(`components/kiosk/Voyage.tsx` was already a daypart SVG scene, NOT the flat purple band the spec
described) → elevated, not rebuilt. Now a **hybrid**: GPU-cheap **CSS atmospheric planes** (sky / stars /
breathing bloom / hazy shore / water / shimmering reflection / drifting caustics [reuses `lumen-caustics`] /
waterline) + **one SVG overlay** keeping the proven boat/lighthouse art and the 1120×250 coordinate math.
New: **7 daypart palettes** (one JS table feeds BOTH the CSS planes AND the SVG disc — the key
coordinate-alignment fix; `--body-x/y` as % of 1120×250, root `aspectRatio:1120/250` so SVG `meet` maps 1:1,
water `top:60%` = SVG y=150); daypart via `lib/kiosk/daypartFor()`; lit track grows via **scaleX** (transform,
not the `d` attr); done steps = glowing **buoys with reflections**; the accent boat **bobs** (NESTED groups —
a middle `<g transform=translate>` holds position so the CSS bob transform can't clobber it) + **glides**
forward on completion + **surges** (forward-lean, driven by `arrivalSignal=celebrate?.n`) + wake; lighthouse
brightness + beam opacity ramp **continuously** with `proximity=doneCount/N`; beam **sweeps** (pivots at the
lamp via `transform-box:fill-box;transform-origin:100% 100%`); arrival fires a one-shot **flare** (once, via
a `prevAllDone` ref). All `transform`/`opacity` only, `will-change` ONLY on caustics, bloom faked with
gradients not blur → 60fps. Accent-suffused (`accentVars` on root → planes; `ramp.*` in SVG, all gradient
ids `uid`-namespaced to avoid `url(#…)` collisions), intensity-scaled (fewer stars/dimmer caustics for calm),
reduced-motion frozen to the correct lit end-state (`.vg-root[data-rm] *`), `data-lite` weak-device hook
reserved. **VERIFY: build clean + rendered all 4 daypart/progress states in a THROWAWAY `/voyagetest` harness
+ screenshotted (the Voyage lives inside a paired ChildView, unreachable headless), harness then deleted.**
Adversarial review → "sound, ships at 60fps." Build stamp **v19**. Reused the durably-authorized cadence:
Workflow(ground→3-approach design panel→judge synthesis) → build → screenshot-verify → review → ship.
**Lesson again: trust `npm run build`, not the dev preview — a stale Turbopack HMR phantom reported a parse
error at the exact current lines while prod built clean AND the page rendered (a broken file can't render).**

**K2b SHIPPED (2026-06-29) — the resting Ambient (§5.6):** again the foundation existed (the idle
`Screensaver` is already the rich resting wall; the gap was `LivingAmbient` — the always-on layer behind
ALL live content — which was one drifting gradient, so a sparse home read as flat black below the cards).
Elevated `LivingAmbient` into a layered breathing deep-water field: drifting **caustics** in the lower
water (reuses `lumen-caustics`, screen-blended), a soft central **glow** on a slow 16s breath, a faint
**horizon** band for depth — all daypart-lit (existing 7 `--amb-*` palettes), intensity-scaled
(`--amb-intensity` from the active child's sensory) + frozen for per-child reduced motion. CSS-only, z-0,
transform/opacity. KioskShell passes `ambIntensity` + `ambReduced` (already computed); no FamilyView change
(the richer full-bleed ambient shows through the empty lower half). VERIFY: throwaway `/ambienttest` harness
screenshotted 3 dayparts (morning teal+horizon+caustics, golden amber, calm night) → dead space now reads as
lit deep water; harness deleted. Build stamp **v21**.

**K3 SHIPPED (2026-06-29) — the Anchor breathing centerpiece (§5.7, the emotional peak):** the Anchor
already had the breath-synced rings + cadence + haptics + AI co-regulation ([[harbor-ai-voice]]); added the
§5.7 cinematic shell: (1) **dissolve into water** — a deep-water layer RISES (`anchor-rise` 1.3s) to fill
the screen as the world recedes (the existing `anchor-world.is-receded` blur/desaturate) + a slower 1.1s
veil fade; (2) **living water ripples** — slow concentric ripples (`anchor-ripple`, staggered `--rip-delay`)
roll outward behind the luminous breathing core; (3) **warm re-entry** — `anchor-warm` bloom at "Welcome
back". All CSS transform/opacity; `anchor-water`/`anchor-warm` use `backwards` fill + `z-index:-1` (behind
the veil's flex content, above its bg) so reduced/frozen motion shows the correct STILL water (ripples hide
via a reduced-motion media query). Verified via a throwaway `/anchortest` harness screenshot (deep-water
veil filled, glowing core, ripples + rings) — deleted. Build stamp **v22**.

**The kiosk rework's signature peaks are all in: K1 feedback · K2 Voyage · K2b Ambient · K3 Anchor.**
**DEFERRED (polish):** shared-element transitions (Family↔Child avatar flight), House Rules / Calendar /
Lists / Store Lumen elevation, the now-card/Chores completion-chain payoff, sibling-sleep ducking, voice on
more meaningful events, the ambient sound bed. Related: [[harbor-kiosk-lumen]], [[harbor-childview-visual]],
[[harbor-kiosk-overhaul]], [[harbor-voice-tts]], [[harbor-project]].
