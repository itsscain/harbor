---
name: harbor-kiosk-lumen
description: Kiosk "Lumen" visual language — one-light model + 7 materials; foundation shipped, §10 pending.
metadata:
  type: project
  originSessionId: 3cd03412-7647-4c62-ade9-5099b108cba8
---

Spec `HARBOR_KIOSK_LUMEN_VISUAL.md` (Downloads) — the wall's elevation/craft pass: "light not
pigment, water not paper." Build order is mandated: **§2 lighting model → §3 materials → then
depth/texture/motion**. Lumen supersedes the old "Harbor Depth" sketch.

**Already existed before Lumen (don't rebuild):** Harbor Depth v2 tokens (`--color-kobsidian
#070a0d / ksunken / kfloat`), easing set (`--ease-harbor-out/in-out/emphasis/anticip/calm`),
bloom halos (`--shadow-bloom-sm/md/lg` via `--bloom-color`), the daypart ambient (`.living-ambient`
+ `.living-ambient__field` + `LivingAmbient.tsx` sets `data-daypart` on `.kiosk-root` every 60s;
7 dayparts in `lib/kiosk/daypart.ts`), `BeaconLight.tsx` (conic sweep, accent-tinted), `.grain-overlay`
(fractal-noise SVG), `now-breathe`, `confetti-fly`, `animate-radial-fill`. Per-child accent ramp =
`lib/kiosk/accent.ts` (`accentRamp`/`accentVars` → `--accent/-bright/-deep/-glow/-soft/-text`).
Sensory intensity + reducedMotion live in `KioskChild.settings.{sensory,reducedMotion}`, normalized
in `lib/kiosk/motion.ts` (`INTENSITY {calm .6, standard 1, vivid 1.25}`, `intensityOf`, `scaleCount`),
read by `readChildSettings` **inside ChildView only** (shell ambient is NOT per-child gated — only OS
reduced-motion). Ambient is persistent (rendered once in `KioskShell`/`OutpostShell`, ducks to
opacity-30 during Anchor). Two overlapping ambient fields exist (`.living-ambient__field` +
`.kiosk-ambient`) — didn't touch.

**FOUNDATION SHIPPED (2026-06-27)** — all in `app/globals.css` + primitives:
- §2.3 elevation stacks `--lumen-sunken/base/raised/floating` (on `.kiosk-root`).
- §3 materials as classes: `.mat-obsidian` (warm top-lip glass — the default card), `.mat-frosted`,
  `.mat-liquid-light` (accent-emissive, derives from the ramp w/ fallbacks), `.mat-vellum`; plus
  `.lumen-rim` (§2.5), `.lumen-well` (§2.7, backs the unused `--color-ksunken`), `.lumen-lip` (§2.4).
- §3.4 **the ground is now lit deep water**: `.kiosk-root` background = daypart radials + vertical
  sea (was a flat `var(--color-kbg)`), `background-color` fallback for old webviews. Makes every
  screen sit in the sea + full-bleed. (Verified: `.kiosk-root` fills 1280×800 with the gradient.)
- §2.8 `.lumen-vignette` + §6.2 `.lumen-caustics` (cheap transform-animated radials, screen blend,
  `will-change:transform`; auto-frozen by the global reduced-motion block) mounted as siblings in the
  persistent ambient wrapper of both shells.
- Primitive re-skin (cascades): `KCard` → `.mat-obsidian`; `KButton` primary/beacon get a soft accent
  bloom + warm inset lip, tonal gets the base highlight; `KPill` water/beacon glow. `accentVars` now
  also emits `--accent-line`. SW cache → v8; `VoiceDebug` BUILD = "v8 · Lumen".

**§10 SIGNATURE MOMENTS SHIPPED (2026-06-27):** Anchor breathing centerpiece = concentric rings of
light (ripple meeting a beam pulse, calming-blue rings + warm core; `Anchor.tsx`) — the visual peak;
now-card emits a liquid-light rim (inline boxShadow on the NowCard, `ChildView.tsx`); Voyage gained a
shimmering water reflection band + bloomed lighthouse beam + seated buoys (`Voyage.tsx`); completion =
light-emitting checkmark glow + bloomed reward star; `Confetti` now takes `accent` → accent-tinted
luminous flecks (per-bit glow); Family cards = `.mat-obsidian` lit portraits with an active accent rim
(`ChildAuraCard.tsx`); StepCard idle moved off flat `bg-kpanel` → `.mat-obsidian`.

**Then ran a 3-lens adversarial review (craft §12 / perf §13 / correctness) and fixed:** `now-breathe`
animated box-shadow every frame on the biggest card → **transform scale** (compositor-cheap; the real
perf hazard); removed permanent `will-change` from `.pressable` base → only `[data-pressed]` (layer-
explosion risk on cheap tablets); `--lumen-sunken` was lit-from-below → bottom warm bounce; Anchor core
specular 40%→32% (under the beacon); ChildAuraCard active dropped the flat accent `borderColor` (killed
the warm lip; rim glow already emits). tsc clean. **Lesson: the §13 trap is animating box-shadow/filter
continuously — only transform+opacity may animate per-frame; static light (rims/blooms) is free.**

**POLISH SHIPPED (2026-06-27):** per-child Adaptive Sensory Intensity now scales the SHELL ambient —
`KioskShell`/`OutpostShell` read the active child's `settings.{sensory,reducedMotion}` via
`intensityOf` (`lib/kiosk/motion.ts`) and scale caustics + grain opacity (`0.06/0.025 * intensity`) +
pass `intensity`/`reduced` to `BeaconLight` (freezes the sweep for reducedMotion); OutpostShell now
ducks the lit world during Anchor (`onAnchorActive` → opacity-30 wrapper, parity w/ KioskShell);
Voyage flat tower/hull → `vg-tower`/`vg-hull` vertical gradients (lamp-lit top → dark base) + contact
shadows under lit buoys + lighthouse; caustics dropped `mix-blend-mode:screen` (full-viewport per-frame
composite cost, imperceptible at .06 over the dark sea). SW v10.

**VERIFICATION BREAKTHROUGH:** the dev preview's IndexedDB is **already paired** (household Daphne/
Cade/Harmony) — so the kiosk's PAIRED surfaces ARE screenshot-verifiable after all (not just the
pairing screen). Flow: `preview_eval` to reload, `preview_click [aria-label^="ChildName"]` to enter a
child, `preview_eval` to `.click()` a button by text (e.g. "I need a break" → Anchor). Visually
verified beautiful: lit-portrait home (full-bleed deep water), the moonlit Voyage (bloomed beam + moon
reflection + glowing now-card), and the Anchor breathing ripple. GOTCHA: Turbopack HMR can serve a
STALE chunk mid-edit (saw a phantom "intensityOf is not defined" that the prod build didn't have) —
do a fresh reload before trusting a preview runtime error; the clean `npm run build` is authoritative.

**§10.1 RESTING WALL SHIPPED (2026-06-28):** the `Screensaver` (most-seen surface) was still on the
pre-Lumen `.kiosk-ambient`; moved it onto the Lumen language — daypart deep-water ground + `.lumen-
caustics` + `.lumen-vignette` (replacing `.kiosk-ambient` + the crude top/bottom gradient), photos
floating within the lit scene, and a luminous clock (warm `text-shadow`, §8). `SleepMode` (night) left
as the dim amber ember by design. Couldn't trigger the screensaver live (this test household has
`settings.screensaver === false` → idle returns home not sleep); verified no regression + reused the
already-verified deep-water/caustics layers.

**STILL DEFERRED (lower value / not yet done):** `KModal`/`KSheet` frosted primitive + `KWell` (code-
health dedupe across 8+ sheet sites — the sheets already work + blur); §10.7 Store "filling vessels of
light" + Calendar/Timer light treatments; §10.6 transitions (shared-element flight Family↔Child,
directional depth). These are the last unbuilt Lumen pieces; none are user-facing gaps now. Related: [[harbor-childview-visual]], [[harbor-kiosk-overhaul]], [[harbor-brand-identity]],
[[kiosk-professional-ui]], [[harbor-project]].
