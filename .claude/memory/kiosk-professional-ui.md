---
name: kiosk-professional-ui
description: "The user holds the Harbor kiosk UI to a high \"professional, not childish\" bar — what actually fixed it."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 3cd03412-7647-4c62-ade9-5099b108cba8
---

The user rejected the wall kiosk UI as "childish/unprofessional" three-plus times, especially **button sizing**, despite earlier dark redesigns. The root causes that mattered:

1. A global `.kiosk-tap` rule forced **min 96×96px on every control**, bloating nav/chrome/parent buttons. Fix: 44px base; `.kiosk-tap-xl` (88px) only for kids' primary step actions.
2. The theme's custom radius scale makes `rounded-2xl` = 24px and `rounded-3xl` = 30px (very round). Use **`rounded-xl` (16px)** for cards/panels/buttons.
3. Teal-tinted surfaces + oversized display type read kid-like. Use a **neutral premium dark** (`--color-kbg #0c1014`, `kpanel #161b22`, crisp `ktext #eef2f6`, accent `kwater #3cbcd9`), `font-bold` not `extrabold`, restrained sizes.

**Why:** they benchmark against Skylight and want AAA polish. **How to apply:** centralize buttons/cards in `components/kiosk/ui.tsx` (`KButton`/`KCard`/`KIconButton`/`KPill`/`KTabBar`); prefer proportionate sizing + tight radii. When the preview screenshot tool is unavailable, align on a `show_widget` mockup BEFORE a big visual change, then verify with computed-style inspection. They chose **real photo avatars** over emoji (`children.photo_url`, `child-photos` storage bucket, `ChildAvatar` fallback photo→emoji→initial). Related: [[harbor-project]].
