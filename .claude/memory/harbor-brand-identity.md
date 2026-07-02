---
name: harbor-brand-identity
description: "Harbor Brand Identity & UI/UX spec — what's implemented vs remaining."
metadata: 
  node_type: memory
  type: project
  originSessionId: 3cd03412-7647-4c62-ade9-5099b108cba8
---

The brand bible is `C:\Users\penda\Downloads\HARBOR_BRAND_IDENTITY_SPEC.md` (the look-and-feel
authority; wins over [[harbor-v2-lighthouse]] on identity). Thesis: "A lighthouse for the home" —
deep-water teals + scarce beacon gold, the dark wall as a premium instrument, calm-by-default,
the keeper's voice. Five attributes: Steady · Warm · Crafted · Calm · Alive.

**Audited 2026-06-25** (5-agent workflow): the visual SYSTEM was already compliant from the
Lighthouse build (Bricolage+DM Sans, type roles, **tabular-nums on every numeric — zero
violations**, all color tokens incl. obsidian/ksunken/kfloat, ambient/beacon/grain/Pressable,
child-accent ramp, theme separation, no theme-bleed, no banned copy on the wall). Real gaps were
concentrated → **SHIPPED 2026-06-25**:
- **Mark system** (`components/brand/Logo.tsx`): named SVG `<g>` layers (tower/lantern/beacon/
  sweep/stripe/water) for the living beacon; `tone` prop (auto/gold/mono) = the 5 color variants;
  new `BeaconGlyph` (light alone, reads at 16px), `StackedWordmark`, `HarborPlusLockup`.
- **App icons**: favicon = beacon glyph; all icons got a deep radial tile + real bloom
  (feGaussianBlur). `app/icon.svg` (glyph), `apple-icon.svg`/`public/icons/icon*.svg` (full mark).
- **12-color child palette** (`lib/kiosk/colors.ts` CHILD_PALETTE) — was only 8 w/ 2 wrong hexes;
  now the full coastal set (Coral FF7A66 … Clay E0926B). Existing kids keep their stored hex.
- **Semantic tokens** in globals.css: `--color-good`, `--color-error` (soft rose, never alarm-red),
  `--color-error-soft/ink`. (Defined; a full red-*→token migration across ~12 files NOT yet done.)
- **Illustration cast** (§8, the "hand of the brand") — NEW `components/brand/illustrations.tsx`:
  `Boat`, `AnchorMark`, `Waves`, `Buoy`, `HarborScene` (two-tone: currentColor + beacon gold,
  works dark+light). Wired into `FirstRunWelcome` (onboarding) + marketing waitlist. Verified
  rendering; more wiring (empty states, celebration, Voyage postcards) is the obvious next expansion.
- **Copy**: "Time's up"→"All done"; dropped "not a punishment" negation.

**Polish round 2 SHIPPED 2026-06-25:** shared `EmptyState` now renders the `Boat` illustration
with a gentle `.k-float` bob (§8.3 "empty states breathe") — propagates to all parent-app/admin
empties. Parent-app error/destructive `red-*` migrated to the soft-rose tokens (`text-error-ink`,
`bg-error-soft`, `border-error/30`); emerald kept as on-brand "good." Beacon-gold deliberately
retained on rewards/celebration (the earned-light metaphor; scarcity is for incidental chrome).

**Install/referral collateral SHIPPED 2026-06-25** (§4.3/§14) — `app/print/page.tsx` (route
`/print`, noindex): four print-ready letter-portrait sheets, reversed teal-on-seafog, keeper's
voice, illustration hand: (1) brand summary "A steady light for your family" + 3 pillars, (2) what-
to-expect install sheet + the offline/no-fee/no-mic/data-home promises, (3) Founding Family $249
first-15 offer, (4) clinician referral w/ a co-brand stamp area. `PrintButton` (window.print);
print CSS in globals.css (`@page letter`, break-after per sheet, `.print-hide`, print-color-adjust).
`SITE` constant = harbor-liard.vercel.app (swap when a custom domain lands). Verified via DOM (the
preview screenshot tool was wedged that session — couldn't capture, page healthy).

**QR codes SHIPPED 2026-06-25** on the collateral: real scannable QR (qrcode lib, ECC M, harbor-
teal modules) to the waitlist on the Founding Family + clinician cards. Pre-generated as a committed
static asset `public/qr-waitlist.svg` via `scripts/gen-qr.mjs` (no runtime dep; `qrcode` is a
devDependency). Update SITE in the script + re-run on a domain swap.

**Weather glyphs SHIPPED 2026-06-25** (§8.2) — `components/brand/WeatherGlyph.tsx`: custom two-tone
SVG set (sun/moon/partly/cloud/fog/drizzle/rain/snow/thunder) mapped from WMO codes; clouds in
currentColor, sun/moon/lightning in beacon gold. Added `is_day` to the weather fetch (sun by day,
crescent by night). Replaced the home-screen weather emoji. (`weatherGlyph` emoji fn in weather.ts
now unused but kept as a fallback.)

**Brand identity spec = DONE.** Thoroughly implemented across every surface — wall, parent app,
marketing, app icon, print/referral collateral (with QR), and now custom weather glyphs. The only
thing left is a genuine FEATURE, not brand polish: Voyage milestone postcards/badges (§9.2.14).

**ENV NOTE:** the Claude Preview screenshot tool was wedged across the whole 2026-06-25 session
(timed out on every page/server even with animations disabled) — kiosk is animation-heavy; verified
via DOM eval instead. Retry screenshots in a fresh session.

**GOTCHA:** don't put backticks in a double-quoted bash `git commit -m` message — bash
command-substitutes them (ate the word "tone" from one commit). Use single quotes or a heredoc.

Related: [[harbor-v2-lighthouse]], [[harbor-project]], [[kiosk-professional-ui]].
