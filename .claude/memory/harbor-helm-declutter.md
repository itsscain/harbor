---
name: harbor-helm-declutter
description: Parent app (Helm) calm-redesign pattern — Disclosure + RoutineCard; lists as collapsed rows.
metadata:
  type: project
  originSessionId: 3cd03412-7647-4c62-ade9-5099b108cba8
---

User feedback (2026-06-27): the parent app, esp. the child detail page (`/app/children/[id]`), felt
**cluttered / overbearing / overstimulating** — every routine was an always-open full card (a wall of
controls). Wanted it to "feel good and look good, a million times better" + the same fixed app-wide.

**THE RULE (apply to every Helm list page):** lists render as **collapsed summary rows**; the edit form
lives BEHIND the row, not in front of it. "Add" forms are collapsed by default and auto-open only when the
list is empty. One palette per page (decorative color → Badge tones/icons only; colored card surfaces
reserved for live states). Reuse the design system verbatim (Card/Field/Switch/Badge/SubmitButton); no new
tokens. Plan came from a parallel Workflow (audit pages + design system → synthesis).

**SHIPPED (2026-06-27):**
- `components/app/Disclosure.tsx` — the one collapse primitive (summary row + ChevronDown; body gated by
  `hidden`; optional `bodyClassName` for padding, `defaultOpen`).
- `components/app/RoutineCard.tsx` — a routine as a collapsed row (emoji · name · "N steps" · step-emoji
  peek · schedule) → expands to the full editor (name/active/schedule, StepRows, add-step, delete). Autosave
  preserved. `routineEmoji()` maps name/type → emoji.
- `children/[id]/page.tsx` — routines via RoutineCard; Profile + Accessibility + Chores + Add-routine
  folded into Disclosures; **resequenced** (a scripted block move) so the page opens with independence
  readout → routines, config demoted below. Pattern for wrapping a Card: `<Card className="mb-4 p-0">
  <Disclosure bodyClassName="px-5 pb-5" summary={<div><span className="text-title text-harbor">Title</span>
  <span className="block text-sm text-muted">sub</span></div>}>…content…</Disclosure></Card>`.
- `medication/page.tsx` + `family/page.tsx` — same collapse (each med / each person → summary row; add-forms
  folded). Family person summary = avatar+name+role+N routines.

**VISUAL ELEVATION STANDARD (2026-06-27)** — user then wanted it not just decluttered but "massively better"
looking, "same standard across everything." Design-panel workflow (3 directions → judge) chose **"editorial":
color used like INK** — the child accent appears ONLY as a hero top-rule, the avatar ring, a color dot, and a
hover left-edge; white stays white; NO washes/glows/colored shadows. The one accent stat uses text-beacon.
Shared building blocks (THE app-wide bar — reuse on every Helm page): `components/ui/PageHero.tsx` (white
profile header: self-drawing accent rule via @keyframes grow motion-safe + reducedMotion-gated, ringed
avatar, display title, meta row, optional fused StatChip glance band), `components/ui/EntityAvatar.tsx` (the
one ringed squircle — photo|emoji, ring = double box-shadow), `components/ui/ListRow.tsx` (sunken emoji tile ·
title · calm subtitle; put inside a `group/disc` parent for hover), primitives `StatChip` + SectionHeader
`rule` prop (editorial hairline headers). Disclosure chevron now in a sunken well (group/disc). SHIPPED on:
child detail (PageHero + 3-stat band + RoutineCard-via-ListRow + section rules + config demoted to bottom),
child list (ChildCard → EntityAvatar + accent edge), Family (person → EntityAvatar + accent edge), Medication
(med → ListRow). Accent edge pattern: `className="group/disc … [border-left:3px_solid_transparent]
hover:[border-left-color:var(--accent)]" style={{ ["--accent"]: color }}`.

**SWEEP COMPLETE (2026-06-27):** declutter + standard applied to every editor-heavy Helm page — Store
(reward → ListRow, add collapsed), Messages (post-note collapsed), Rules (each rule a row; detail/reorder/
delete behind it; add collapsed), Settings (the 6 kitchen-sink domains each fold into a Disclosure w/ status
badge; Household stays open — done via a depth-aware node script handling both h2 + icon-header-div shapes),
Calendar (the 9-field add-event + reminder add-form fold; grid/lists stay front). Already-light/display pages
left as-is (they don't have the open-editor problem): /app Home, Lists (one compact add row), Meals, Pantry,
History, Insights. If polishing further: apply PageHero to /app Home + global color-restraint (some pages
still mix amber/violet/sky/emerald decoratively).
GOTCHA: the parent app is auth-gated — the preview has no parent session,
so these can't be screenshot-verified by the agent (verify via clean build + user review). Editing big JSX
blocks: use a node line-range/anchor script (depth-aware on `<Card`/`</Card>`) rather than fragile multiline
Edits. Related: [[kiosk-professional-ui]], [[harbor-brand-true]], [[harbor-project]].
