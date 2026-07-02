---
name: harbor-childview-visual
description: "Harbor ChildView Visual Build Spec — the pixel-level redesign of the wall's child screen; progress."
metadata: 
  node_type: memory
  type: project
  originSessionId: 3cd03412-7647-4c62-ade9-5099b108cba8
---

Spec: `C:\Users\penda\Downloads\HARBOR_CHILDVIEW_VISUAL_SPEC.md` (visual layer for `/kiosk` ChildView
only; builds to match `harbor_childview_mockup.html` — NOT in Downloads, build from the spec values).
Goal: the structurally-correct ChildView reads flat/generic → apply full Harbor Depth: living ambient,
child-accent suffusion, the Voyage as hero, a glowing "do this now" focal card, the completion chain.

**CORE SHIPPED 2026-06-26** ("the feel + the hero"):
- §2.2 accent ramp: `accentRamp()` (lib/kiosk/accent.ts) gained `bright`/`deep`; new `accentVars(hex)`
  emits `--accent / -bright / -deep / -glow / -soft / -text` as CSS vars set on the ChildView root.
- §3 living ambient: ChildView root bg = accent-soft wash (upper-right) + deep-water gradient (replaces
  flat bg-kbg).
- §7 the Voyage REBUILT (`components/kiosk/Voyage.tsx`) as the hero — SVG harbor (viewBox 0 0 1120 250):
  sky/sea gradients, celestial body (moon `night` / sun `day`+`golden` by hour), dashed track + lit
  segment, lit buoys (done) / dim (upcoming), boat at "now", glowing lighthouse (brightens at "almost
  home"). Takes `ramp` + `scene`; position math any-N. Replaced the old emoji-boat band.
- §8 now-card (`NowCard` in ChildView.tsx): current step = large accent-bordered breathing "DO THIS
  NOW" focal (emoji well, big label, points, nudge, read-aloud); §9 the rest recede in a 3-up row.
- Retired the standalone NowNext band (removed import + usage).
- Verified on the wall (Leo's Bedtime: harbor Voyage boat→lighthouse, glowing "Bath time" now-card).

**§5/§6/§11 SHIPPED 2026-06-26** — the SCREEN now fully matches the spec: §5 avatar gains an accent
ring/bloom + the progress bar is an accent deep→bright gradient w/ glow; §6 encouragement + break share
a row, break is an accent pill w/ a pulsing glow dot (not a gray strip); §11 footer Calm Tools is a
SUBTLE accent tint (not the loud gold block). Verified on the wall.

**REMAINING (ChildView):** §12 star-arc chain polish (mostly exists), full 7-daypart palette (currently
only day/golden/night), and §15 FEATURES (P1: arrival postcards, parent "lighthouse keeper" voice notes,
"how are the seas?" feelings check at routine start, bedtime "anchor down" wind-down; P2: child's vessel
picker, weather-aware ambient, co-op sibling step). Scene tracks WALL CLOCK not routine context (a
bedtime routine viewed at noon shows the day scene). The CORE SCREEN is done — what's left is additive
features, not layout.

Related: [[harbor-kiosk-overhaul]] (§7 is the structural ChildView), [[harbor-brand-identity]],
[[harbor-v2-lighthouse]]. NOTE: kiosk overhaul K6 (delight) also still pending.
