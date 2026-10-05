// Tools and gear: hardware, science, safety and medical things, keys and locks, treasure and money.

import { OL, P, circlePath, rr, softStar, star, type Pen, type Ramp } from "../pen";
import type { PicDef } from "..";

// ── Local helpers ─────────────────────────────────────────────────────────────────────────────
type Pt = [number, number];
const f = (n: number) => Math.round(n * 100) / 100;
/** A straight-segment path through points (dense points read as a smooth curve). */
const line = (pts: Pt[]) => `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(" L")}`;
/** A circle with a see-through hole (draw it with `eo` or `unite`). */
const ring = (cx: number, cy: number, R: number, r: number) => `${circlePath(cx, cy, R)} ${circlePath(cx, cy, r)}`;
/** A plus/cross shape centered at (cx, cy): arm half-width w, arm lengths up/down/side. */
const plus = (cx: number, cy: number, w: number, up: number, down: number, side: number) =>
  `M${cx - w} ${cy - up} H${cx + w} V${cy - w} H${cx + side} V${cy + w} H${cx + w} V${cy + down} H${cx - w} V${cy + w} H${cx - side} V${cy - w} H${cx - w} Z`;

/** An outlined shape whose inner loops are holes. */
function eo(d: Pen, dAttr: string, fill: string, sw = 3) {
  d.raw(`<path d="${dAttr}" fill="${fill}" fill-rule="evenodd" stroke="${OL}" stroke-width="${sw}" stroke-linejoin="round"/>`);
}

// Counted per picture, so a drawing comes out the same whatever was drawn before it.
const uids = new WeakMap<Pen, number>();
/** A gradient laid out on the board instead of per shape, so parts drawn separately shade as one. */
function ugrad(d: Pen, r: Ramp, x1: number, y1: number, x2: number, y2: number) {
  const n = uids.get(d) ?? 0;
  uids.set(d, n + 1);
  const id = `tl${n}`;
  d.raw(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${r[0]}"/><stop offset="0.55" stop-color="${r[1]}"/><stop offset="1" stop-color="${r[2]}"/></linearGradient>`);
  return `url(#${id})`;
}

/** Parts drawn as one solid piece: a single outline around them all, no seams inside.
 *  A part is a filled path (inner loops are holes), or [open path, width] for a thick stroke. */
type Part = string | [string, number];
function unite(d: Pen, parts: Part[], fill: string, sw = 3.2) {
  for (const pass of [0, 1]) {
    const c = pass ? fill : OL;
    for (const p of parts) {
      if (typeof p === "string") d.raw(`<path d="${p}" fill="${c}" fill-rule="evenodd"${pass ? "" : ` stroke="${OL}" stroke-width="${sw * 2}" stroke-linejoin="round"`}/>`);
      else d.raw(`<path d="${p[0]}" fill="none" stroke="${c}" stroke-width="${pass ? p[1] : p[1] + sw * 2}" stroke-linecap="round" stroke-linejoin="round"/>`);
    }
  }
}

/** Points every `step` units along a polyline; `at[i]` = where input point i landed. */
function resample(pts: Pt[], step: number) {
  const out: Pt[] = [pts[0]];
  const at = [0];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    let [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    let seg = Math.hypot(bx - ax, by - ay);
    while (seg > 0 && acc + seg >= step) {
      const k = (step - acc) / seg;
      ax += (bx - ax) * k;
      ay += (by - ay) * k;
      out.push([ax, ay]);
      seg = Math.hypot(bx - ax, by - ay);
      acc = 0;
    }
    acc += seg;
    at.push(out.length - 1);
  }
  out.push(pts[pts.length - 1]);
  return { out, at };
}

/** A twisted rope along evenly spaced points; `over` = the indexes where it crosses over itself.
 *  ramp = [highlight, rope, twist lines]. */
function rope(d: Pen, pts: Pt[], over: number[], w = 9, ramp: Ramp = [P.tan[0], P.wood[0], P.wood[1]]) {
  const n = pts.length;
  const span = (a: number, b: number) => line(pts.slice(Math.max(0, a), Math.min(n, b + 1)));
  const twists = (a: number, b: number) => {
    const a0 = Math.max(2, a);
    for (let i = a0 + ((4 - (a0 % 4)) % 4); i <= Math.min(n - 3, b); i += 4) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i + 1];
      const [x, y] = pts[i];
      const L = Math.hypot(x1 - x0, y1 - y0) || 1;
      const tx = (x1 - x0) / L;
      const ty = (y1 - y0) / L;
      const h = w / 2 - 0.3;
      d.stroke(`M${f(x - ty * h - tx * 2.8)} ${f(y + tx * h - ty * 2.8)} Q${f(x + tx * 0.6)} ${f(y + ty * 0.6)} ${f(x + ty * h + tx * 2.8)} ${f(y - tx * h + ty * 2.8)}`, { sw: 1.9, color: ramp[2] });
    }
  };
  const piece = (a: number, b: number, pad: number) => {
    d.stroke(span(a, b), { sw: w + 5.4, color: OL });
    d.stroke(span(a - pad, b + pad), { sw: w, color: ramp[1] });
    d.stroke(span(a - pad, b + pad), { sw: w * 0.34, color: ramp[0], op: 0.6 });
    twists(a - pad, b + pad);
  };
  piece(0, n - 1, 0);
  for (const i of over) piece(i - 9, i + 9, 5);
}

/** A magnifying glass: lens up-left with the handle down-right (dir 1), or mirrored (dir -1). */
function magnifier(d: Pen, dir: 1 | -1) {
  const cx = 50 - 14.5 * dir;
  const cy = 35.5;
  d.g(`rotate(${-45 * dir} 50 50)`, (g) => {
    g.path(rr(43, 58, 14, 41, 7), g.fill(P.red, "h"), { sw: 3 });
    g.stroke("M43.8 88 H56.2", { sw: 2.2, color: P.red[2] });
    g.path(rr(41.5, 51, 17, 11, 3.5), g.fill(P.steel, "h"), { sw: 2.6 });
  });
  d.circle(cx, cy, 26, d.fill(P.steel), { sw: 3.5 });
  d.circle(cx, cy, 18.5, d.lin([[0, "#f6fcff"], [0.55, "#cdeeff"], [1, "#94d3f7"]], 0, 0, 1, 1), { sw: 2.6 });
  d.stroke(`M${f(cx - 12)} ${f(cy + 3)} Q${f(cx - 11)} ${f(cy - 11)} ${f(cx + 3)} ${f(cy - 12)}`, { sw: 4, color: "#ffffff", op: 0.9 });
  d.circle(cx + 7.5, cy - 9.5, 2, "#ffffff", { stroke: null, op: 0.9 });
}

/** A key standing up (bow on top, teeth low on the left); tilt it with d.g. `sw` = outline width
 *  before any scaling (pass more when the key is drawn small). */
function keyShape(d: Pen, ramp: Ramp, sw = 3) {
  unite(
    d,
    [ring(50, 25, 19, 8), "M45 40 H55 V90 Q55 94 51 94 H38 Q36 94 36 92 V87 H45 V83 H38 Q36 83 36 81 V73 Q36 71 38 71 H45 Z", rr(41, 41, 18, 7, 3.5)],
    ugrad(d, ramp, 50, 6, 50, 96),
    sw,
  );
  d.stroke("M50 52 V88", { sw: sw * 0.67, color: ramp[2] });
}

/** An ellipse as a path (for rings drawn as thick strokes). */
const ell = (cx: number, cy: number, rx: number, ry: number) => `M${f(cx - rx)} ${f(cy)} a${f(rx)} ${f(ry)} 0 1 0 ${f(rx * 2)} 0 a${f(rx)} ${f(ry)} 0 1 0 ${f(-rx * 2)} 0 Z`;

/** A friendly cartoon sword standing up, tip on top, centered on x = 50. */
function sword(d: Pen) {
  d.path("M42.5 66 V19 Q42.5 12 50 5 Q57.5 12 57.5 19 V66 Z", d.fill(P.silver, "h"), { sw: 3.2 });
  d.stroke("M50 15 V61", { sw: 2.2, color: P.silver[2] });
  d.path(rr(46, 70, 8, 18, 3), d.fill(P.red, "h"), { sw: 2.6 });
  d.stroke("M46.8 75.5 H53.2 M46.8 81 H53.2", { sw: 1.6, color: P.red[2] });
  d.path(rr(32, 63, 36, 9, 4.5), d.fill(P.gold, "v"), { sw: 3 });
  d.ball(50, 91, 5.5, P.gold, { sw: 2.6 });
}

/** A claw hammer standing up, head on top, centered on x = 50 (about 18..81 × 14..91). */
function hammer(d: Pen) {
  d.path(rr(45, 30, 10, 60, 5), d.fill(P.wood, "h"), { sw: 3 });
  d.path(rr(43.5, 64, 13, 27, 6), d.fill(P.red, "h"), { sw: 3 });
  d.stroke("M44.3 72 H55.7 M44.3 78 H55.7 M44.3 84 H55.7", { sw: 1.7, color: P.red[2] });
  d.path(
    "M24 11 H58 Q74 11 84 27 Q85.5 31 81.5 31 Q73 23 61 30 V35 Q61 38 58 38 H44 Q41 38 41 35 V33 H35 V36 Q35 40 31 40 H24 Q20 40 20 36 V15 Q20 11 24 11 Z",
    d.lin([[0, P.steel[0]], [0.5, P.steel[1]], [1, P.steel[2]]], 0, 0, 0.35, 1),
    { sw: 3.2 },
  );
  d.stroke("M24 13.5 V37.5", { sw: 2, color: P.steel[2] });
  d.shine(29, 17, 2, 5, 0.75, 0);
}

/** An open-end wrench standing up, jaw on top, centered on x = 50. */
function wrench(d: Pen) {
  unite(d, ["M43 7.61 A16 16 0 1 0 57 7.61 L57 21 A7 7 0 0 1 43 21 Z", rr(44, 32, 12, 42, 6), ring(50, 82, 10.5, 4.6)], ugrad(d, P.steel, 38, 8, 62, 92), 3);
  d.stroke("M50 40 V68", { sw: 2.2, color: P.steel[2] });
}

/** A padlock; open = the shackle popped up and swung out on its right leg. */
function padlock(d: Pen, open: boolean) {
  const sh = "M35 52 V35 A15 15 0 0 1 65 35 V52";
  const col = d.fill(P.steel, "h");
  if (open) d.g("rotate(22 65 50)", (g) => g.tube(sh, col, 9.5, 3));
  else d.tube(sh, col, 9.5, 3);
  d.path(rr(18, 46, 64, 46, 12), d.fill(P.gold), { sw: 3.5 });
  d.circle(50, 63, 6.2, P.ink[1], { stroke: null });
  d.path("M46.6 65 L44.8 79 Q44.6 81 46.6 81 H53.4 Q55.4 81 55.2 79 L53.4 65 Z", P.ink[1], { stroke: null });
  d.shine(29, 54, 6, 3, 0.55, -20);
}

/** A scissor blade from the pivot (x0, y0) to its tip (x1, y1); the straight cutting edge is on
 *  the `side` (1 = right of the way it points), the round back on the other. */
function blade(x0: number, y0: number, x1: number, y1: number, side: 1 | -1) {
  const L = Math.hypot(x1 - x0, y1 - y0);
  const ux = (x1 - x0) / L;
  const uy = (y1 - y0) / L;
  const nx = -uy * side;
  const ny = ux * side;
  const p = (a: number, b: number) => `${f(x0 + ux * a + nx * b)} ${f(y0 + uy * a + ny * b)}`;
  return `M${p(-5, 4.5)} L${p(L - 3, 1.8)} Q${p(L + 1.5, -0.5)} ${p(L - 3.5, -3.5)} Q${p(L * 0.45, -12.5)} ${p(-5, -7)} Q${p(-9, -1)} ${p(-5, 4.5)} Z`;
}

/** A bold dollar sign centered at (cx, cy), s = half its height. */
function dollar(d: Pen, cx: number, cy: number, s: number, color: string, w = s * 0.34, sw = 2) {
  const S = `M${f(cx + 0.55 * s)} ${f(cy - 0.6 * s)} Q${f(cx + 0.38 * s)} ${f(cy - 0.84 * s)} ${f(cx)} ${f(cy - 0.84 * s)} Q${f(cx - 0.6 * s)} ${f(cy - 0.84 * s)} ${f(cx - 0.6 * s)} ${f(cy - 0.41 * s)} Q${f(cx - 0.6 * s)} ${f(cy - 0.04 * s)} ${f(cx)} ${f(cy)} Q${f(cx + 0.6 * s)} ${f(cy + 0.04 * s)} ${f(cx + 0.6 * s)} ${f(cy + 0.42 * s)} Q${f(cx + 0.6 * s)} ${f(cy + 0.84 * s)} ${f(cx)} ${f(cy + 0.84 * s)} Q${f(cx - 0.38 * s)} ${f(cy + 0.84 * s)} ${f(cx - 0.55 * s)} ${f(cy + 0.6 * s)}`;
  unite(d, [[S, w], [`M${f(cx)} ${f(cy - 1.12 * s)} V${f(cy + 1.12 * s)}`, w * 0.85]], color, sw);
}

/** A green banknote, 84×46, centered at (50, 50); `sw` = outline width before scaling. */
function banknote(d: Pen, sw = 3.2) {
  d.path(rr(8, 27, 84, 46, 6), d.fill(P.green, "v"), { sw });
  d.path(rr(14, 33, 72, 34, 4), "none", { stroke: P.green[2], sw: sw * 0.62 });
  for (const [x, y] of [[21, 40], [79, 40], [21, 60], [79, 60]]) d.circle(x, y, 3.2, P.green[0], { stroke: P.green[2], sw: 1.6 });
  d.circle(50, 50, 14.5, d.fill(P.lime), { stroke: P.green[2], sw: sw * 0.7 });
  dollar(d, 50, 50, 9.5, P.forest[2], 3, 0.01);
  d.shine(24, 31.5, 10, 1.8, 0.55, 0);
}

/** The trefoil knot opened at its bottom loop: an overhand knot with its ends running out sideways. */
function knotRope() {
  const s = 12;
  const cx = 50;
  const cy = 46;
  const at = (t: number): Pt => [cx + s * (Math.sin(t) + 2 * Math.sin(2 * t)), cy - s * (Math.cos(t) - 2 * Math.cos(2 * t))];
  const raw: Pt[] = [];
  const bez = (a: Pt, b: Pt, c: Pt, e: Pt) => {
    for (let i = 0; i < 24; i++) {
      const u = i / 24;
      const v = 1 - u;
      raw.push([v * v * v * a[0] + 3 * v * v * u * b[0] + 3 * v * u * u * c[0] + u * u * u * e[0], v * v * v * a[1] + 3 * v * v * u * b[1] + 3 * v * u * u * c[1] + u * u * u * e[1]]);
    }
  };
  const t0 = Math.PI + 0.62;
  const t1 = 3 * Math.PI - 0.62;
  const A = at(t0);
  const B = at(t1);
  bez([88, 79], [78, 79], [A[0] - 1.3, A[1] + 12], A);
  // Where the rope passes over itself (the three crossings, every other pass).
  const marks = [3.9179, 6.0123, 8.1067];
  const idx: number[] = [];
  const N = 300;
  for (let i = 0; i <= N; i++) {
    const t = t0 + ((t1 - t0) * i) / N;
    for (const m of marks) if (Math.abs(t - m) <= (t1 - t0) / N / 2) idx.push(raw.length);
    raw.push(at(t));
  }
  bez(B, [B[0] + 1.3, B[1] + 12], [22, 79], [12, 79]);
  raw.push([12, 79]);
  const { out, at: map } = resample(raw, 1.2);
  return { pts: out, over: idx.map((i) => map[i]) };
}

export const TOOLS: PicDef[] = [
  [
    "💡",
    "light bulb",
    (d) => {
      d.glow(50, 40, 46, "#fff3a0", 0.85);
      d.path("M50 8 C70 8 80 22 80 38 C80 52 68 58 64 70 L36 70 C32 58 20 52 20 38 C20 22 30 8 50 8 Z", d.fill(P.lemon), { sw: 3.5 });
      d.stroke("M42 62 L42 47 Q46 40 50 47 Q54 40 58 47 L58 62", { sw: 2.4, color: P.orange[2] });
      d.path(rr(35, 70, 30, 17, 4), d.fill(P.steel, "h"), { sw: 3 });
      d.stroke("M36 76 H64 M36 81.5 H64", { sw: 2 });
      d.path("M42 87 L58 87 L54 94 L46 94 Z", d.fill(P.ink), { sw: 2.5 });
      d.shine(35, 25, 7, 11, 0.65, 30);
    },
  ],
  ["🔍", "magnifying glass", (d) => magnifier(d, 1)],
  [
    "🧱",
    "brick",
    (d) => {
      d.shadow(50, 90, 44, 5);
      d.path(rr(7, 15, 86, 73, 5), d.fill(P.grey, "v"), { sw: 3.5 });
      const x0 = 10;
      const x1 = 90;
      const G = 3.2;
      const H = 14.4;
      const L = (x1 - x0 - 2 * G) / 3;
      const h = (x1 - x0 - 2 * L - 3 * G) / 2;
      let k = 0;
      for (let r = 0; r < 4; r++) {
        const y = 18 + r * (H + G);
        const spans: Pt[] =
          r % 2 === 0
            ? [[x0, x0 + L], [x0 + L + G, x0 + 2 * L + G], [x1 - L, x1]]
            : [[x0, x0 + h], [x0 + h + G, x0 + h + G + L], [x1 - h - G - L, x1 - h - G], [x1 - h, x1]];
        for (const [a, b] of spans) {
          d.path(rr(a, y, b - a, H, 3), d.fill(P.coral, "v"), { sw: 2.4 });
          if (k++ % 3 === 1) d.path(rr(a, y, b - a, H, 3), P.coral[2], { stroke: null, op: 0.22 });
          d.stroke(`M${f(a + 3.5)} ${f(y + 3)} H${f(b - 3.5)}`, { sw: 1.8, color: P.coral[0], op: 0.9 });
        }
      }
      d.shine(22, 22.5, 6, 2, 0.55, -4);
    },
  ],
  [
    "🧲",
    "magnet",
    (d) => {
      const U = "M12 18 V52 A38 38 0 0 0 88 52 V18 H65 V52 A15 15 0 0 1 35 52 V18 Z";
      d.path(U, d.fill(P.red), { sw: 3.5 });
      d.clip("M50 0 H100 V100 H50 Z", (c) => c.path(U, c.fill(P.blue), { stroke: null }));
      d.path(U, "none", { sw: 3.5 });
      d.stroke("M50 67 V90", { sw: 2.6 });
      for (const x of [12, 65]) d.path(rr(x, 11, 23, 19, 3), d.fill(P.silver, "v"), { sw: 3 });
      d.shine(19.5, 52, 3, 11, 0.5, 0);
    },
  ],
  [
    "⚖️",
    "balance scale",
    (d) => {
      d.shadow(50, 92, 26, 5);
      for (const x of [24, 76]) d.stroke(`M${x} 28 L${x - 14} 61 M${x} 28 L${x + 14} 61`, { sw: 2.6 });
      d.path(rr(45.5, 20, 9, 64, 3), d.fill(P.gold, "h"), { sw: 3 });
      d.path("M28 92 Q28 83 37 82 H63 Q72 83 72 92 Z", d.fill(P.gold, "v"), { sw: 3 });
      d.path(rr(14, 22, 72, 7, 3.5), d.fill(P.gold, "v"), { sw: 3 });
      d.ball(50, 16, 6, P.gold, { sw: 2.6 });
      for (const x of [24, 76]) {
        d.path(`M${x - 16} 61 Q${x} 84 ${x + 16} 61 Z`, d.fill(P.gold, "v"), { sw: 3 });
        d.ellipse(x, 61, 16, 3.2, P.gold[0], { sw: 2.4 });
        d.circle(x, 28, 2.8, P.gold[2], { sw: 2 });
      }
      d.shine(18, 25, 3, 1.2, 0.7, 0);
    },
  ],
  [
    "🧭",
    "compass",
    (d) => {
      eo(d, ring(50, 11.5, 5.2, 2.2), d.fill(P.gold), 2.4);
      d.path(rr(44.5, 14, 11, 10, 3), d.fill(P.gold, "h"), { sw: 2.6 });
      d.circle(50, 57, 34.5, d.fill(P.gold), { sw: 3.5 });
      d.circle(50, 57, 27, d.fill(P.cream), { sw: 2.6 });
      d.path(star(50, 57, 22, 5, 4), P.sky[0], { stroke: null });
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        d.line(50 + Math.cos(a) * 20.5, 57 + Math.sin(a) * 20.5, 50 + Math.cos(a) * 24.5, 57 + Math.sin(a) * 24.5, { sw: 2.8 });
      }
      d.g("rotate(40 50 57)", (g) => {
        g.path("M50 34 L56.5 57 L43.5 57 Z", g.fill(P.red), { sw: 2.4 });
        g.path("M50 80 L43.5 57 L56.5 57 Z", g.fill(P.white), { sw: 2.4 });
      });
      d.circle(50, 57, 3.6, d.fill(P.gold), { sw: 2 });
      d.shine(30, 38, 6.5, 3.2, 0.6, -45);
    },
  ],
  [
    "💎",
    "gem",
    (d) => {
      const T0: Pt = [27, 18];
      const T1: Pt = [50, 18];
      const T2: Pt = [73, 18];
      const G0: Pt = [8, 38];
      const G1: Pt = [35, 38];
      const G2: Pt = [65, 38];
      const G3: Pt = [92, 38];
      const C: Pt = [50, 90];
      const facet = (pts: Pt[], color: string) => d.poly(pts.flat(), color, { stroke: null });
      facet([G0, T0, G1], P.sky[0]);
      facet([T0, T1, G1], "#f2fbff");
      facet([G1, T1, G2], "#9fdcff");
      facet([T1, T2, G2], P.sky[0]);
      facet([G2, T2, G3], P.sky[1]);
      facet([G0, G1, C], P.sky[1]);
      facet([G1, G2, C], "#8fd3ff");
      facet([G2, G3, C], P.blue[1]);
      d.stroke("M8 38 H92 M27 18 L35 38 L50 18 L65 38 L73 18 M35 38 L50 90 L65 38", { sw: 2, color: P.blue[2] });
      d.path("M27 18 H73 L92 38 L50 90 L8 38 Z", "none", { sw: 3.5 });
      d.shine(31, 26, 4, 2, 0.8, -40);
      d.sparkle(84, 14, 7, "#ffffff");
    },
  ],
  [
    "🛡️",
    "shield",
    (d) => {
      const outer = "M50 7 C63 13 76 15 88 13 V45 C88 70 72 85 50 94 C28 85 12 70 12 45 V13 C24 15 37 13 50 7 Z";
      const inner = "M50 16 C60 21 70 23 80 22 V45 C80 64 67 76 50 84 C33 76 20 64 20 45 V22 C30 23 40 21 50 16 Z";
      d.path(outer, d.fill(P.silver), { sw: 3.5 });
      d.path(inner, d.fill(P.blue), { sw: 2.6 });
      d.clip(inner, (c) => c.path(plus(50, 44, 5.5, 40, 50, 40), c.fill(P.gold), { sw: 2.4 }));
      d.path(inner, "none", { sw: 2.6 });
      d.shine(31, 33, 4.5, 9, 0.45, 25);
    },
  ],
  [
    "🧪",
    "test tube",
    (d) => {
      const tube = "M37 13 L63 13 L63 76 A13 13 0 0 1 37 76 Z";
      d.g("rotate(28 50 50)", (g) => {
        g.path(tube, g.lin([[0, "#ffffff"], [1, "#d8eefc"]], 0, 0, 1, 0), { sw: 3.4 });
        g.clip(tube, (c) => {
          c.g("rotate(-28 50 50)", (s) => {
            s.rect(0, 51, 100, 50, 0, s.fill(P.lime, "v"), { stroke: null });
            s.rect(0, 51, 100, 4.5, 0, P.lime[0], { stroke: null });
            s.stroke("M0 51 H100", { sw: 2.4, color: P.lime[2] });
            s.circle(44, 65, 3.4, "#ffffff", { stroke: P.lime[2], sw: 1.6 });
            s.circle(37, 75, 2.5, "#ffffff", { stroke: P.lime[2], sw: 1.6 });
            s.circle(46.5, 75.5, 1.8, "#ffffff", { stroke: P.lime[2], sw: 1.3 });
          });
        });
        g.path(tube, "none", { sw: 3.4 });
        g.stroke("M43 22 V72", { sw: 4, color: "#ffffff", op: 0.85 });
        g.path(rr(33, 7, 34, 9, 4.5), g.fill(P.white, "v"), { sw: 3 });
      });
    },
  ],
  [
    "🔩",
    "nut and bolt",
    (d) => {
      d.g("rotate(-38 50 50)", (g) => {
        const shank = "M41 24 H59 V85 L54 91 H46 L41 85 Z";
        g.path(shank, g.fill(P.steel, "h"), { sw: 3 });
        g.clip(shank, (c) => {
          for (let y = 31; y < 92; y += 5.5) c.stroke(`M38 ${y + 2} L62 ${y - 2}`, { sw: 1.8, color: P.steel[2] });
        });
        g.path(rr(28, 56, 44, 17, 3), g.fill(P.silver, "h"), { sw: 3 });
        g.stroke("M39 57.5 V71.5 M61 57.5 V71.5", { sw: 2, color: P.silver[2] });
        g.path(rr(26, 8, 48, 19, 3.5), g.fill(P.steel, "h"), { sw: 3.2 });
        g.stroke("M38 9.5 V25.5 M62 9.5 V25.5", { sw: 2, color: P.steel[2] });
        g.shine(32, 14, 3, 1.5, 0.7, 0);
      });
    },
  ],
  [
    "🪢",
    "knot",
    (d) => {
      const { pts, over } = knotRope();
      rope(d, pts, over, 9.5);
    },
  ],
  [
    "🔑",
    "key",
    (d) => {
      d.g("rotate(-45 50 50)", (g) => keyShape(g, P.gold));
      d.shine(26, 27, 5, 2.4, 0.7, -45);
    },
  ],
  [
    "🔦",
    "flashlight",
    (d) => {
      d.g("translate(-1 4) rotate(-10 50 50)", (g) => {
        g.path("M60 35 L88 19 Q94 50 88 81 L60 65 Z", g.lin([[0, "#fff09a", 0.95], [0.7, "#fff3a0", 0.35], [1, "#fff3a0", 0]], 0, 0, 1, 0), { stroke: null });
        g.path("M60 42 L84 33 Q87 50 84 67 L60 58 Z", g.lin([[0, "#ffffff", 0.95], [1, "#ffffff", 0]], 0, 0, 1, 0), { stroke: null });
        g.path(rr(5, 38, 40, 24, 8), g.fill(P.blue, "v"), { sw: 3.2 });
        g.stroke("M12 39.5 V60.5 M17.5 39.5 V60.5", { sw: 2.2, color: P.blue[2] });
        g.path("M42 37 L58 28 L58 72 L42 63 Z", g.fill(P.blue, "v"), { sw: 3.2 });
        g.path(rr(56, 26, 8, 48, 3.5), g.fill(P.steel, "h"), { sw: 3.2 });
        g.path(rr(24, 32.5, 11, 7, 2.5), g.fill(P.red), { sw: 2.4 });
        g.shine(27, 44, 10, 2, 0.55, 0);
      });
    },
  ],
  [
    "🔋",
    "battery",
    (d) => {
      d.path(rr(41, 7, 18, 12, 3), d.fill(P.steel, "h"), { sw: 2.8 });
      const body = rr(29, 15, 42, 77, 8);
      d.path(body, d.fill(P.green, "h"), { sw: 3.5 });
      d.clip(body, (c) => c.rect(20, 10, 60, 18, 0, c.fill(P.silver, "h"), { stroke: null }));
      d.path(body, "none", { sw: 3.5 });
      d.stroke("M29 28 H71", { sw: 2.6 });
      d.path("M54 35 L39 61 H49 L45 84 L62 55 H51 L57 35 Z", d.fill(P.lemon, "v"), { sw: 2.6 });
      d.shine(35, 50, 2.6, 13, 0.5, 0);
    },
  ],
  [
    "🔌",
    "plug",
    (d) => {
      d.tube("M41.5 75 C38 85 44 90.5 55 89 C66 87.5 72 84 83 87.5", P.ink[1], 7.5, 2.8);
      d.g("translate(0 2) rotate(18 50 50) translate(50 48) scale(0.95) translate(-50 -48)", (g) => {
        for (const x of [36, 57]) {
          g.path(rr(x, 7, 7, 27, 2), g.fill(P.gold, "h"), { sw: 2.6 });
          g.circle(x + 3.5, 14, 1.6, P.gold[2], { stroke: null });
        }
        g.path("M23 34 Q23 27 30 27 H70 Q77 27 77 34 V48 Q77 63 62 65 H38 Q23 63 23 48 Z", g.fill(P.ink), { sw: 3.5 });
        g.path("M39 63 H61 L58 77 H42 Z", g.fill(P.ink, "h"), { sw: 3 });
        g.stroke("M41 68 H59 M42 72.5 H58", { sw: 1.8, color: P.ink[0] });
        g.shine(33, 35, 7, 2.6, 0.45, -10);
      });
    },
  ],
  [
    "🌡️",
    "thermometer",
    (d) => {
      const glass = "M36 22 A14 14 0 0 1 64 22 V58.4 A19.5 19.5 0 1 1 36 58.4 Z";
      d.path(glass, d.lin([[0, "#ffffff"], [1, "#d6eaf7"]], 0, 0, 1, 0), { sw: 3.5 });
      for (let i = 0; i < 6; i++) d.line(58.5, 20 + i * 6.5, i % 2 ? 60.5 : 62, 20 + i * 6.5, { sw: 2, color: P.steel[1] });
      unite(d, [circlePath(50, 72, 13), rr(44, 30, 12, 44, 6)], ugrad(d, P.red, 40, 30, 64, 90), 1.5);
      d.stroke("M40.5 18 V55", { sw: 3.6, color: "#ffffff", op: 0.9 });
      d.shine(43.5, 66.5, 3, 5, 0.75, 30);
    },
  ],
  [
    "⚓",
    "anchor",
    (d) => {
      unite(
        d,
        [
          ring(50, 14.5, 7.8, 3.6),
          rr(45.5, 20, 9, 64, 4.5),
          rr(27, 26.5, 46, 9, 4.5),
          ["M17 54 Q18 84 50 84 Q82 84 83 54", 9],
          "M7.5 62 L16.5 42 L27.5 58 Q17 55 7.5 62 Z",
          "M92.5 62 L83.5 42 L72.5 58 Q83 55 92.5 62 Z",
        ],
        ugrad(d, P.steel, 28, 10, 72, 92),
        3.2,
      );
      d.shine(36, 29.5, 6, 1.6, 0.7, 0);
      d.shine(48, 46, 1.4, 9, 0.5, 0);
    },
  ],
  [
    "✂️",
    "scissors",
    (d) => {
      const handle = (x: number) => unite(d, [[`M50 55 L${50 + (x - 50) * 0.62} 70`, 7], [ell(x, 79, 11.5, 9.5), 6.5]], ugrad(d, P.red, x - 14, 64, x + 12, 92), 2.8);
      handle(31);
      d.path(blade(50, 55, 75, 8, -1), d.fill(P.silver, "h"), { sw: 2.8 });
      handle(69);
      d.path(blade(50, 55, 25, 8, 1), d.fill(P.silver, "h"), { sw: 2.8 });
      d.circle(50, 55, 3.8, d.fill(P.steel), { sw: 2.2 });
      d.shine(36, 30, 1.6, 7, 0.75, -28);
    },
  ],
  [
    "⚔️",
    "crossed swords",
    (d) => {
      d.g("rotate(-40 50 50)", sword);
      d.g("rotate(40 50 50)", sword);
    },
  ],
  [
    "⚙️",
    "gear",
    (d) => {
      const n = 8;
      const p: string[] = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        for (const [da, rad] of [[-0.215, 33], [-0.135, 43], [0.135, 43], [0.215, 33]]) p.push(`${f(50 + Math.cos(a + da) * rad)} ${f(50 + Math.sin(a + da) * rad)}`);
      }
      eo(d, `M${p.join(" L")} Z ${circlePath(50, 50, 10.5)}`, d.fill(P.steel), 3.5);
      d.circle(50, 50, 19.5, "none", { stroke: P.steel[2], sw: 2.4 });
      d.shine(33, 27, 6, 3, 0.55, -40);
    },
  ],
  [
    "⛑️",
    "rescue helmet",
    (d) => {
      d.shadow(50, 92, 34, 5);
      d.tube("M25 72 Q29 91 50 91 Q71 91 75 72", P.ink[1], 3.5, 2.2);
      d.path("M14 70 Q12 17 50 15 Q88 17 86 70 Z", d.fill(P.red), { sw: 3.5 });
      d.path("M8 68 Q8 61 16 62.5 Q50 70 84 62.5 Q92 61 92 68 Q92 76 83 77.5 Q50 85 17 77.5 Q8 76 8 68 Z", d.fill(P.red, "v"), { sw: 3.2 });
      d.path(plus(50, 41, 5.5, 14, 14, 14), d.fill(P.white), { sw: 2.6 });
      d.shine(29, 31, 5.5, 11, 0.5, 30);
    },
  ],
  [
    "🔗",
    "chain link",
    (d) => {
      d.g("rotate(-45 50 50)", (g) => {
        const A = rr(9, 37, 48, 26, 13);
        const B = rr(43, 37, 48, 26, 13);
        const col = g.fill(P.steel, "v");
        g.tube(B, col, 8, 3);
        g.tube(A, col, 8, 3);
        g.clip("M38 50 H62 V72 H38 Z", (c) => c.tube(B, col, 8, 3));
        g.stroke("M17 37 H33 M51 37 H67", { sw: 2.4, color: "#ffffff", op: 0.75 });
      });
    },
  ],
  [
    "🔨",
    "hammer",
    (d) => {
      d.g("translate(-8 2) rotate(30 50 52) translate(50 52) scale(0.88) translate(-50 -52)", hammer);
    },
  ],
  [
    "🔬",
    "microscope",
    (d) => {
      d.shadow(51, 93, 34, 5);
      d.path("M18 92 Q18 82 28 82 H74 Q84 82 84 92 Z", d.fill(P.blue, "v"), { sw: 3.2 });
      d.tube("M33 84 V62 Q33 42 52 36", d.fill(P.blue, "h"), 11, 3);
      d.path(rr(40, 61, 42, 7, 3.5), d.fill(P.ink, "v"), { sw: 2.8 });
      d.path(rr(56, 58, 15, 4, 1.5), P.sky[0], { sw: 1.8 });
      d.g("rotate(-29.4 51 33)", (g) => {
        g.path(rr(46.5, 47, 9, 11, 2), g.fill(P.steel, "h"), { sw: 2.8 });
        g.path(rr(44, 15, 14, 34, 3), g.fill(P.silver, "h"), { sw: 3 });
        g.path(rr(44, 20, 14, 5, 1), g.fill(P.blue, "h"), { sw: 2.2 });
        g.path(rr(42.5, 7, 17, 10, 3), g.fill(P.ink, "h"), { sw: 3 });
      });
      d.circle(33, 54, 6.5, d.fill(P.silver), { sw: 2.6 });
      d.shine(27, 66, 1.6, 6, 0.55, 0);
    },
  ],
  [
    "🔧",
    "wrench",
    (d) => {
      d.g("rotate(45 50 50)", wrench);
      d.shine(66, 24, 2.2, 5, 0.7, 45);
    },
  ],
  [
    "🛠️",
    "hammer and wrench",
    (d) => {
      d.g("rotate(-42 50 50) translate(50 50) scale(0.86) translate(-50 -50)", wrench);
      d.g("rotate(42 50 50) translate(50 50) scale(0.86) translate(-50 -50)", hammer);
    },
  ],
  [
    "🔔",
    "bell",
    (d) => {
      d.g("rotate(-12 50 50)", (g) => {
        eo(g, ring(50, 11, 6, 2.6), g.fill(P.gold), 2.6);
        g.ball(50, 84, 7.5, P.gold, { sw: 2.8 });
        g.path("M50 15 C67 15 72 28 72 44 C72 59 76 66 86 73 L14 73 C24 66 28 59 28 44 C28 28 33 15 50 15 Z", g.fill(P.gold), { sw: 3.5 });
        g.path(rr(9, 70, 82, 11, 5.5), g.fill(P.gold, "v"), { sw: 3.2 });
        g.shine(39, 31, 4.5, 10, 0.6, 18);
      });
      d.stroke("M11 33 Q6 41 9 50 M88 20 Q94 27 93 36", { sw: 3, color: P.gold[2] });
    },
  ],
  [
    "🩹",
    "bandage",
    (d) => {
      d.g("rotate(-38 50 50)", (g) => {
        g.path(rr(6, 34, 88, 32, 16), g.fill(P.tan, "v"), { sw: 3.2 });
        g.path(rr(35, 37.5, 30, 25, 5), g.fill(P.cream, "v"), { sw: 2.4 });
        for (const x of [41, 47, 53, 59]) for (const y of [44, 50, 56]) g.circle(x, y, 1.1, P.cream[2], { stroke: null });
        for (const x of [15, 22, 78, 85]) for (const y of [45, 55]) g.circle(x, y, 1.6, P.tan[2], { stroke: null });
        g.shine(20, 40, 8, 2, 0.6, 0);
      });
    },
  ],
  ["🔒", "lock", (d) => padlock(d, false)],
  ["🔎", "magnifier", (d) => magnifier(d, -1)],
  [
    "🪜",
    "ladder",
    (d) => {
      d.shadow(50, 93, 38, 5);
      const xl = (y: number) => 29.5 - (y - 8) * 0.12;
      const xr = (y: number) => 70.5 + (y - 8) * 0.12;
      for (const y of [20, 36, 52, 68, 84]) {
        d.path(rr(xl(y) - 2, y - 3.5, xr(y) - xl(y) + 4, 7.5, 3), d.fill(P.wood, "v"), { sw: 2.6 });
      }
      for (const [x0, x1] of [[xl(8), xl(92)], [xr(8), xr(92)]]) {
        d.path(`M${f(x0 - 4.5)} 8 H${f(x0 + 4.5)} L${f(x1 + 4.5)} 92 H${f(x1 - 4.5)} Z`, d.fill(P.wood, "h"), { sw: 3 });
      }
      d.shine(27.5, 22, 1.5, 8, 0.6, 7);
    },
  ],
  [
    "⛓️",
    "chains",
    (d) => {
      d.g("rotate(-35 50 50) translate(50 50) scale(0.94) translate(-50 -50)", (g) => {
        const col = g.fill(P.stone, "v");
        for (const cx of [22, 50, 78]) g.tube(rr(cx - 14, 39.5, 28, 21, 10.5), col, 6.5, 2.8);
        for (const cx of [36, 64]) g.path(rr(cx - 14.5, 45.5, 29, 9, 4.5), g.fill(P.stone, "v"), { sw: 2.8 });
        g.stroke("M17 39.5 H27 M45 39.5 H55 M73 39.5 H83", { sw: 2, color: "#ffffff", op: 0.6 });
      });
    },
  ],
  [
    "⛏️",
    "pick",
    (d) => {
      d.g("translate(2 2) rotate(35 50 50) translate(50 50) scale(0.88) translate(-50 -50)", (g) => {
        g.path(rr(44.5, 28, 11, 66, 5.5), g.fill(P.wood, "h"), { sw: 3.2 });
        g.path("M6 44 Q50 -3 94 44 Q50 29 6 44 Z", g.fill(P.steel, "v"), { sw: 3.4 });
        g.path(rr(41, 14, 18, 24, 4), g.fill(P.stone, "h"), { sw: 3.2 });
        g.shine(26, 27, 8, 1.8, 0.6, -30);
      });
    },
  ],
  [
    "🏺",
    "clay jar",
    (d) => {
      d.shadow(50, 93, 22, 4);
      for (const s of [-1, 1]) d.tube(`M${50 + s * 8} 20 Q${50 + s * 29} 15 ${50 + s * 28} 34 Q${50 + s * 27} 42 ${50 + s * 18} 47`, d.fill(P.orange, "v"), 5.5, 2.8);
      const body = "M41 27 C20 33 14 51 22 67 C28 79 37 84 40 86 L60 86 C63 84 72 79 78 67 C86 51 80 33 59 27 Z";
      d.path(body, d.fill(P.orange), { sw: 3.5 });
      d.clip(body, (c) => {
        c.rect(0, 48, 100, 11, 0, P.brown[2], { stroke: null });
        const z: Pt[] = [];
        for (let i = 0; i <= 18; i++) z.push([12 + i * 4.4, i % 2 ? 50.8 : 56.2]);
        c.stroke(line(z), { sw: 2, color: P.sand[1] });
      });
      d.path(body, "none", { sw: 3.5 });
      d.path("M41 29 L42.5 15 H57.5 L59 29 Z", d.fill(P.orange, "h"), { sw: 3 });
      d.path(rr(36, 8, 28, 8, 4), d.fill(P.orange, "v"), { sw: 3 });
      d.path("M40.5 85 H59.5 L63 92 H37 Z", d.fill(P.orange, "v"), { sw: 3 });
      d.shine(31, 40, 4.5, 8.5, 0.5, 28);
    },
  ],
  [
    "🔭",
    "telescope",
    (d) => {
      d.shadow(47, 93, 28, 4);
      const leg = d.fill(P.wood, "h");
      d.tube("M46 60 L48.5 90", leg, 5, 2.6);
      d.g("rotate(-32 48 50)", (g) => {
        g.path("M14 43 L78 37 L78 63 L14 57 Z", g.fill(P.blue, "v"), { sw: 3.2 });
        g.path(rr(32, 40.5, 7, 19, 2), g.fill(P.gold, "v"), { sw: 2.4 });
        g.path(rr(76, 33, 11, 34, 3.5), g.fill(P.gold, "v"), { sw: 3.2 });
        g.path(rr(5, 44.5, 11, 11, 2.5), g.fill(P.ink, "v"), { sw: 2.6 });
        g.shine(50, 42.5, 14, 1.6, 0.6, -5);
      });
      d.tube("M46 60 L27 90", leg, 5, 2.6);
      d.tube("M46 60 L67 90", leg, 5, 2.6);
      d.circle(46, 59, 5, d.fill(P.steel), { sw: 2.6 });
    },
  ],
  [
    "🪓",
    "axe",
    (d) => {
      d.g("translate(1 5) rotate(24 50 50) translate(50 50) scale(0.92) translate(-50 -50)", (g) => {
        g.tube("M55 14 Q52 54 56 91", g.fill(P.wood, "h"), 9.5, 3);
        const head = "M64 11 V35 Q56 37 48 34 Q36 41 19 47 Q11 31 15 9 Q32 14 48 12 Q56 9 64 11 Z";
        g.path(head, g.fill(P.red, "v"), { sw: 3.2 });
        g.clip(head, (c) => c.path("M0 0 H15 Q11 31 19 47 L26 44.5 Q18.5 31 22 10.5 L22 0 Z", c.fill(P.silver, "h"), { stroke: null }));
        g.stroke("M22 10.5 Q18.5 31 26 44.5", { sw: 2.2 });
        g.path(head, "none", { sw: 3.2 });
        g.shine(40, 17, 6, 1.6, 0.6, 5);
      });
    },
  ],
  [
    "🏹",
    "bow and arrow",
    (d) => {
      d.g("rotate(-45 50 50)", (g) => {
        g.stroke("M36 13 L19 50 L36 87", { sw: 2.4 });
        g.tube("M36 13 Q78 50 36 87", g.fill(P.wood, "h"), 8, 3);
        g.path(rr(52, 41, 10, 18, 3.5), g.fill(P.red, "h"), { sw: 2.6 });
        g.tube("M19 50 H82", P.tan[1], 4.6, 2.6);
        g.path("M80 41 L97 50 L80 59 Q84 50 80 41 Z", g.fill(P.steel, "h"), { sw: 2.6 });
        g.path("M20 50 L14.5 40 H25 L35 50 Z", g.fill(P.blue, "v"), { sw: 2.4 });
        g.path("M20 50 L14.5 60 H25 L35 50 Z", g.fill(P.blue, "v"), { sw: 2.4 });
      });
    },
  ],
  ["🔓", "open lock", (d) => padlock(d, true)],
  [
    "📡",
    "satellite dish",
    (d) => {
      d.shadow(40, 93, 24, 4);
      d.path(rr(36.5, 62, 7, 24, 2.5), d.fill(P.steel, "h"), { sw: 3 });
      d.path("M24 92 Q24 84 32 83 H48 Q56 84 56 92 Z", d.fill(P.steel, "v"), { sw: 3 });
      d.g("rotate(35 40 54)", (g) => {
        g.path("M8 52 A32 24 0 0 0 72 52 Z", g.fill(P.silver, "v"), { sw: 3.2 });
        g.ellipse(40, 52, 32, 10, g.fill(P.white, "v"), { sw: 3.2 });
        g.tube("M40 53 V28", P.steel[1], 3.5, 2.4);
        g.circle(40, 25, 5, g.fill(P.red), { sw: 2.4 });
      });
      for (const r of [10, 18]) {
        const a1 = (-100 * Math.PI) / 180;
        const a2 = (-10 * Math.PI) / 180;
        const cx = 54.3;
        const cy = 31.9;
        d.stroke(`M${f(cx + r * Math.cos(a1))} ${f(cy + r * Math.sin(a1))} A${r} ${r} 0 0 1 ${f(cx + r * Math.cos(a2))} ${f(cy + r * Math.sin(a2))}`, { sw: 3.4, color: P.sky[1] });
      }
    },
  ],
  [
    "🗝️",
    "old key",
    (d) => {
      const ramp: Ramp = [P.orange[0], P.gold[2], P.brown[1]];
      d.g("translate(0 2) rotate(-30 46 50)", (g) => {
        unite(
          g,
          [ring(27, 40.5, 9, 3.3), ring(27, 59.5, 9, 3.3), ring(15.5, 50, 9, 3.3), rr(22, 45.5, 63, 9, 3.5), rr(32, 42, 4.5, 16, 2), rr(38.5, 42, 4.5, 16, 2), "M70 54 H85 V73 H80 V65.5 H75 V73 H70 Z"],
          ugrad(g, ramp, 30, 30, 60, 75),
          3,
        );
        g.stroke("M45 50 H82", { sw: 1.8, color: ramp[2] });
        g.shine(23, 36.5, 3, 1.6, 0.7, -30);
      });
    },
  ],
  [
    "🛢️",
    "oil barrel",
    (d) => {
      d.shadow(50, 93, 33, 5);
      d.path("M19 20 V82 A31 8 0 0 0 81 82 V20 Z", d.fill(P.blue, "h"), { sw: 3.5 });
      for (const y of [40, 64]) {
        d.stroke(`M19.5 ${y - 3.4} A31 8 0 0 0 80.5 ${y - 3.4}`, { sw: 2.2, color: P.blue[0], op: 0.8 });
        d.stroke(`M19 ${y} A31 8 0 0 0 81 ${y}`, { sw: 3.2 });
      }
      d.ellipse(50, 20, 31, 8, d.fill(P.sky, "v"), { sw: 3.2 });
      d.ellipse(50, 20, 24, 5, "none", { stroke: P.blue[1], sw: 1.8 });
      d.ellipse(63, 19.5, 4.5, 2, d.fill(P.steel), { sw: 2 });
      d.circle(50, 53, 7.5, "#ffffff", { sw: 2.2 });
      d.path("M50 46.5 Q55 52.5 55 55 A5 5 0 0 1 45 55 Q45 52.5 50 46.5 Z", P.ink[1], { stroke: null });
      d.shine(27, 52, 2.5, 18, 0.45, 0);
    },
  ],
  [
    "🧬",
    "DNA",
    (d) => {
      d.g("rotate(-28 50 50)", (g) => {
        const A = 17;
        const y0 = 9;
        const y1 = 91;
        const ph = (y: number) => ((y - y0) / 41) * Math.PI * 2 + 0.5;
        const xs = (y: number, s: number) => 50 + s * A * Math.sin(ph(y));
        const runs = (s: number, front: boolean) => {
          const out: string[] = [];
          let cur: Pt[] = [];
          for (let y = y0; y <= y1 + 0.01; y += 1) {
            if (s * Math.cos(ph(y)) > 0 === front) cur.push([xs(y, s), y]);
            else if (cur.length) {
              out.push(line(cur));
              cur = [];
            }
          }
          if (cur.length) out.push(line(cur));
          return out;
        };
        for (const [s, r] of [[1, P.blue], [-1, P.pink]] as const) for (const p of runs(s, false)) g.tube(p, r[2], 6.5, 2.6);
        const pairs = [[P.gold[1], P.green[1]], [P.red[1], P.sky[1]]];
        for (let k = 0; k < 12; k++) {
          const y = y0 + 3.4 + k * 6.8;
          const a = xs(y, 1);
          const b = xs(y, -1);
          if (Math.abs(a - b) < 6) continue;
          const m = (a + b) / 2;
          const [c1, c2] = pairs[k % 2];
          g.tube(`M${f(a)} ${f(y)} L${f(m)} ${f(y)}`, c1, 3.6, 1.6);
          g.tube(`M${f(m)} ${f(y)} L${f(b)} ${f(y)}`, c2, 3.6, 1.6);
        }
        for (const [s, r] of [[1, P.blue], [-1, P.pink]] as const) for (const p of runs(s, true)) g.tube(p, r[1], 6.5, 2.6);
      });
    },
  ],
  [
    "🧰",
    "toolbox",
    (d) => {
      d.shadow(50, 91, 42, 5);
      d.tube("M34 36 V27 Q34 21 40 21 H60 Q66 21 66 27 V36", d.fill(P.steel, "v"), 6, 3);
      const box = rr(9, 34, 82, 54, 7);
      d.path(box, d.fill(P.red, "v"), { sw: 3.5 });
      d.clip(box, (c) => c.rect(0, 34, 100, 15, 0, P.red[0], { stroke: null, op: 0.35 }));
      d.stroke("M9 49 H91", { sw: 3 });
      for (const x of [25, 75]) d.path(rr(x - 5.5, 44, 11, 11, 2.5), d.fill(P.silver, "v"), { sw: 2.4 });
      d.shine(22, 39.5, 8, 2, 0.55, 0);
    },
  ],
  [
    "🩺",
    "stethoscope",
    (d) => {
      const tube = d.fill(P.teal, "h");
      d.tube("M44 54 C44 79 47 90 59 90 C69 90 74 85 74 79", tube, 6.5, 2.8);
      d.tube("M37 43 Q41 51 44 55 M51 43 Q47 51 44 55", tube, 6.5, 2.8);
      d.tube("M26 17 Q26 35 37 44 M62 17 Q62 35 51 44", P.steel[1], 4.4, 2.6);
      for (const x of [26, 62]) d.ball(x, 15, 5, P.ink, { sw: 2.6 });
      d.path(rr(70, 71, 8, 9, 2), d.fill(P.steel, "h"), { sw: 2.6 });
      d.circle(74, 62, 13.5, d.fill(P.silver), { sw: 3.2 });
      d.circle(74, 62, 8.3, d.fill(P.sky), { sw: 2.2 });
      d.shine(69, 56, 3, 1.6, 0.8, -40);
    },
  ],
  [
    "🔱",
    "trident",
    (d) => {
      const head = (x: number, y: number) => `M${x} ${y} L${x + 8} ${y + 13} Q${x + 3} ${y + 11} ${x} ${y + 15} Q${x - 3} ${y + 11} ${x - 8} ${y + 13} Z`;
      unite(
        d,
        [rr(46, 44, 8, 47, 4), ["M24 28 V32 Q24 46 50 46 Q76 46 76 32 V28", 8], ["M50 22 V46", 8], head(50, 10), head(24, 16), head(76, 16), rr(41.5, 45, 17, 8, 3.5)],
        ugrad(d, P.gold, 30, 10, 70, 92),
        3.2,
      );
      d.shine(46.5, 18, 1.5, 3.5, 0.7, 0);
      d.shine(48.5, 66, 1.3, 9, 0.5, 0);
    },
  ],
  [
    "🥽",
    "goggles",
    (d) => {
      for (const s of [-1, 1]) d.path(rr(s < 0 ? 5 : 83, 41, 12, 16, 3), d.fill(P.ink, "v"), { sw: 2.8 });
      const frame = "M14 36 Q14 25 27 25 H73 Q86 25 86 36 V60 Q86 73 73 73 H63 Q57 73 54 66 Q50 60 46 66 Q43 73 37 73 H27 Q14 73 14 60 Z";
      d.path(frame, d.fill(P.lime), { sw: 3.5 });
      for (const x of [20, 54]) {
        d.path(rr(x, 32, 26, 33, 11), d.lin([[0, "#f2fbff"], [0.6, "#bfe8ff"], [1, "#86cdf5"]], 0, 0, 1, 1), { sw: 2.6 });
        d.stroke(`M${x + 6} ${44} Q${x + 7} ${37} ${x + 13} ${36}`, { sw: 3, color: "#ffffff", op: 0.9 });
      }
      for (const x of [34, 42, 58, 66]) d.circle(x, 28.5, 1.4, P.lime[2], { stroke: null });
      d.shine(19, 30, 3, 1.4, 0.6, -30);
    },
  ],
  [
    "💣",
    "bomb",
    (d) => {
      d.shadow(44, 92, 30, 5);
      d.ball(43, 61, 30.5, P.black, { sw: 3.5 });
      d.g("rotate(42 64.5 38)", (g) => g.path(rr(56.5, 31, 16, 13, 3), g.fill(P.steel, "h"), { sw: 3 }));
      d.tube("M68.5 33 Q72 22 81 20", P.tan[1], 4, 2.4);
      d.glow(82, 18.5, 12, "#ffd23a", 0.9);
      d.path(star(82, 18.5, 9.5, 4.2, 8), d.fill(P.gold), { stroke: P.orange[2], sw: 2 });
      d.circle(82, 18.5, 3, "#ffffff", { stroke: null });
    },
  ],
  [
    "🔐",
    "lock with key",
    (d) => {
      d.g("translate(-9 -6) translate(50 50) scale(0.84) translate(-50 -50)", (g) => padlock(g, false));
      d.g("translate(70 69) rotate(135) scale(0.58) translate(-50 -50)", (g) => keyShape(g, P.gold, 4.4));
    },
  ],
  [
    "🪚",
    "saw",
    (d) => {
      d.g("translate(0 2) rotate(-20 50 50)", (g) => {
        let teeth = "";
        for (let x = 9; x < 62; x += 5.3) teeth += ` L${f(x + 2.65)} 66.5 L${f(x + 5.3)} 61`;
        g.path(`M64 31 L13 45 Q8 46.5 8 51 V61${teeth} L64 61 Z`, g.fill(P.silver, "v"), { sw: 3 });
        g.stroke("M58 36 L16 48", { sw: 2, color: "#ffffff", op: 0.8 });
        eo(g, "M58 27 Q58 20 66 20 H82 Q92 20 92 32 V62 Q92 74 80 74 H66 Q58 74 58 66 Z " + rr(67, 33, 15, 28, 7.5), g.fill(P.wood, "h"), 3.2);
        for (const y of [33, 59]) g.circle(62, y, 2.2, d.fill(P.steel), { sw: 1.6 });
      });
    },
  ],
  [
    "🪝",
    "hook",
    (d) => {
      unite(d, [ring(70, 21, 9, 4.2), ["M70 29 V58 A22 22 0 0 1 26 58 V52", 9], "M20.5 55 L26 38.5 L31.5 55 Z"], ugrad(d, P.steel, 30, 20, 70, 85), 3.2);
      d.shine(66, 16, 2.2, 1.6, 0.8, -40);
      d.shine(73, 45, 1.3, 8, 0.5, 0);
    },
  ],
  [
    "🪛",
    "screwdriver",
    (d) => {
      d.g("rotate(45 50 50)", (g) => {
        g.path("M46.5 47 V17 L45 9 H55 L53.5 17 V47 Z", g.fill(P.steel, "h"), { sw: 2.8 });
        g.path(rr(42.5, 44, 15, 9, 2.5), g.fill(P.silver, "h"), { sw: 2.8 });
        g.path(rr(36.5, 51, 27, 43, 11), g.fill(P.orange, "h"), { sw: 3.2 });
        g.stroke("M44 58 V87 M50 58 V87 M56 58 V87", { sw: 2.2, color: P.orange[2] });
        g.shine(41, 60, 1.6, 6, 0.65, 0);
      });
    },
  ],
  [
    "🪙",
    "coin",
    (d) => {
      d.circle(52.5, 52.5, 37, d.fill([P.gold[1], P.gold[2], P.orange[2]]), { sw: 3.5 });
      d.circle(48, 48, 37, d.fill(P.gold), { sw: 3.5 });
      d.circle(48, 48, 28.5, "none", { stroke: P.gold[2], sw: 2.6 });
      d.path(softStar(48, 50, 17, 8.8), d.fill(P.lemon), { stroke: P.gold[2], sw: 2.4 });
      d.shine(33, 28, 9, 4.5, 0.65, -40);
      d.sparkle(84, 17, 6.5, "#ffffff");
    },
  ],
  [
    "💰",
    "money bag",
    (d) => {
      d.shadow(50, 93, 34, 5);
      d.path("M38 37 C13 47 9 72 17 84 C23 93 77 93 83 84 C91 72 87 47 62 37 Z", d.fill(P.tan), { sw: 3.5 });
      d.path("M39 36 Q25 18 35 11 Q42 17 46 13 Q50 7 54 13 Q58 17 65 11 Q75 18 61 36 Z", d.fill(P.tan, "v"), { sw: 3.2 });
      d.path(rr(34, 32.5, 32, 8, 4), d.fill(P.red, "v"), { sw: 2.8 });
      dollar(d, 50, 66, 14.5, P.forest[1], 5, 2.2);
      d.shine(28, 55, 4.5, 10, 0.5, 30);
    },
  ],
  [
    "💵",
    "dollar bill",
    (d) => {
      d.g("rotate(8 50 50) translate(2 5)", (g) => g.path(rr(8, 27, 84, 46, 6), g.fill(P.forest, "v"), { sw: 3.2 }));
      d.g("rotate(-8 50 50) translate(0 -3)", (g) => banknote(g));
    },
  ],
  [
    "💸",
    "money with wings",
    (d) => {
      // A wing rooted on the bill's top edge, sweeping up and out, feathers scalloped along the back.
      const wing = (g: Pen) => {
        g.path("M60 43 Q70 22 93 17 Q96 23 90 26 Q95 31 87 33.5 Q91 38.5 82 39.5 Q84 44 74 44 Q68 46 62 48 Z", g.fill(P.white, "v"), { sw: 3 });
        g.stroke("M67 41 Q76 33 88 28 M71 43.5 Q78 40 84 38", { sw: 2, color: P.white[2] });
      };
      d.g("translate(52 50) scale(0.86) translate(-50 -50) rotate(-12 50 50)", (g) => {
        g.mirror(50, wing);
        g.g("translate(50 56) scale(0.72) translate(-50 -50)", (b) => banknote(b, 4.4));
        wing(g);
      });
      d.stroke("M10 80 H23 M16 88 H31 M8 72 H15", { sw: 3, color: P.sky[1] });
    },
  ],
];
