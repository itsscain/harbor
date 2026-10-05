# Harbor Learn pictures — style guide

Every picture a child sees in Harbor Learn is drawn in code with `pen.ts` (people with
`people.ts`) and keyed by the emoji the content uses (`index.ts`). The UI renders them with
`<Glyph e="🍎" />`. **No emoji font anywhere** — if content needs a new picture, draw it.

## The look (match the aquarium)
- **Board:** 100×100. The subject fills roughly 8..92 and is centered (a ground shadow may sit
  at the bottom). Whole thing visible, nothing cropped.
- **Outline:** navy `OL` (#2a2f45) on every main shape — `sw` 3–3.5 for big shapes, 2–2.5 for
  small parts. Round joins and caps (the pen's default).
- **Light:** from the top-left. Fill shapes with `d.fill(P.<ramp>)` (round light, the default),
  `"v"` (top→bottom: buildings, clothes, water), `"h"` or `"d"`. Add one white `d.shine(...)`
  highlight on the main shape (top-left). Big round things: `d.ball(...)` does fill+shine.
- **Palette:** the ramps in `P` (and `SKIN`, `HAIR`). Bright, warm, friendly. Inner detail
  lines in the ramp's dark color without the navy outline (`{ color: P.x[2] }`).
- **Shapes:** round and chunky. Prefer circles, ellipses, rounded rects (`rr`), smooth curves
  (`smooth`, `curve`, `lumpy`, `cloudPath`), `leaf`, `heart`, `star`/`softStar`, `drop`.
  Use `d.tube(path, color, width)` for outlined thick strokes (stems, handles, legs, ropes).
  `d.clip(shape, fn)` keeps stripes/spots/patches inside a shape.
- **Faces:** animals get `d.eye(x, y, r)` (dark oval + sparkle), a small smile, maybe
  `d.cheek`. People use `head()` / `bust()` / `figure()` / `hand()` from `people.ts` with a
  `MOODS` expression. Vary `SKIN` tones and hair across the cast.
- **Read at 40px:** a child must know what it is from across the room. Clear silhouette, the
  defining feature exaggerated (giraffe = long neck, zebra = stripes), no hairline details,
  no text or letters inside pictures (symbols/numbers excepted).
- **Views:** the most recognizable one — side view for vehicles and most animals (facing left
  or right is fine), front view for faces, buildings and objects. A slight ¾ tilt is fine.

## Code
```ts
["🍎", "apple", (d) => {
  d.path("M50 31 C40 22 15 22 13 48 …", d.fill(P.red), { sw: 3.5 });
  d.tube("M50 32 Q48 21 54 11", P.brown[1], 4.5, 2.5);
  d.path(leaf(53, 21, 24, -22), d.fill(P.green, "d"), { sw: 2.6 });
  d.shine(29, 46, 6, 12, 0.6, 18);
}],
```
- One entry per emoji: `[emoji, plain name, draw]`. The name is also the picture's alt text.
- Keep a drawing to ~5–25 lines; write a small local helper when a category repeats a shape.
- Same picture every time: no `Math.random`, and if a helper writes its own gradient ids, count
  them per picture (`WeakMap<Pen, number>`), never in a module-level counter. (The pen already
  rounds every number, so trig is fine.)
- Review: `node scripts/learn-art.mjs sheet <category>` renders a contact sheet (big + a 34px
  copy) — look at it. `node scripts/learn-art.mjs missing` lists emoji Learn shows that have no
  drawing yet.
