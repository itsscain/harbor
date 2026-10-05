// Sea life, bugs, reptiles, amphibians, dinosaurs, creatures of legend and tiny living things.

import { OL, P, circlePath, curve, drop, leaf, lumpy, rr } from "../pen";
import type { Pen, Ramp } from "../pen";
import type { PicDef } from "..";

type Pt = [number, number];
const q = (v: number) => Math.round(v * 100) / 100;

/** Points along a smooth line through `pts` (Catmull-Rom), `per` samples per segment. */
function along(pts: Pt[], per = 10): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per;
      const f = (j: 0 | 1) => 0.5 * (2 * p1[j] + (p2[j] - p0[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t * t + (3 * p1[j] - p0[j] - 3 * p2[j] + p3[j]) * t * t * t);
      out.push([f(0), f(1)]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** A body, tail, arm or worm around a smooth centerline: `w0` wide at the start, `w1` at the
 *  end (round ends). `ease` > 1 keeps it fat longer before it tapers. */
function ribbon(pts: Pt[], w0: number, w1: number, ease = 1): string {
  const s = along(pts);
  const n = s.length;
  const a: Pt[] = [];
  const b: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const p = s[Math.max(0, i - 1)];
    const nx = s[Math.min(n - 1, i + 1)];
    const len = Math.hypot(nx[0] - p[0], nx[1] - p[1]) || 1;
    const tx = (nx[0] - p[0]) / len;
    const ty = (nx[1] - p[1]) / len;
    const w = (w0 + (w1 - w0) * Math.pow(i / (n - 1), ease)) / 2;
    a.push([s[i][0] - ty * w, s[i][1] + tx * w]);
    b.push([s[i][0] + ty * w, s[i][1] - tx * w]);
  }
  const pt = (p: Pt) => `${q(p[0])} ${q(p[1])}`;
  return `M${pt(a[0])} ${a.slice(1).map((p) => `L${pt(p)}`).join(" ")} A${q(w1 / 2)} ${q(w1 / 2)} 0 0 0 ${pt(b[n - 1])} ${b
    .slice(0, -1)
    .reverse()
    .map((p) => `L${pt(p)}`)
    .join(" ")} A${q(w0 / 2)} ${q(w0 / 2)} 0 0 0 ${pt(a[0])} Z`;
}

/** An open spiral around (cx, cy): radius r0 → r1 over `turns` (negative = the other way). */
function spiral(cx: number, cy: number, r0: number, r1: number, turns: number, a0 = 0): string {
  const pts: Pt[] = [];
  const steps = Math.max(8, Math.round(Math.abs(turns) * 28));
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const ang = ((a0 + u * turns * 360) * Math.PI) / 180;
    const r = r0 + (r1 - r0) * u;
    pts.push([cx + Math.cos(ang) * r, cy + Math.sin(ang) * r]);
  }
  return curve(pts, 0.2);
}

/** A white eyeball with the house eye in it (bulging eyes, eyes on dark bodies). */
function eyeball(d: Pen, x: number, y: number, r: number, dx = 0, dy = 0, sw = 2.4) {
  d.circle(x, y, r, d.fill(P.white), { sw });
  d.eye(x + dx, y + dy, r * 0.6);
}

/** A ramp one step darker (the far side of a creature: back legs, back arms). */
const deep = (r: Ramp): Ramp => [r[1], r[2], OL];

/** Translucent bug wings. */
const wingFill = (d: Pen) => d.lin([[0, "#ffffff", 0.95], [1, "#bfe3ff", 0.85]], 0, 0, 1, 1);

/** Several shapes drawn as one creature: a single outline around all of them, no seams where
 *  a head meets a body or a tail. Parts are [path, fill]. */
function union(d: Pen, parts: [string, string][], sw = 3.2) {
  for (const [p] of parts) d.path(p, OL, { sw: sw * 2 });
  for (const [p, fill] of parts) d.path(p, fill, { stroke: null });
}

/** Thick strokes that join cleanly (all outlines first, then all colors): water jets, legs. */
function tubes(d: Pen, paths: string[], color: string, w: number, sw = 3) {
  for (const p of paths) d.stroke(p, { sw: w + sw * 2, color: OL });
  for (const p of paths) d.stroke(p, { sw: w, color });
}

/** Rosy cheeks. Pass a higher `a` on green skin, where a faint pink turns grey. */
const blush = (d: Pen, x: number, y: number, r = 4.5, a = 0.6) => d.ellipse(x, y, r, r * 0.62, "#ff86b0", { stroke: null, op: a });
const GREEN_BLUSH = 0.9;

/** A transform that scales part of a picture by `s` around (cx, cy) and then nudges it. */
const about = (s: number, cx = 50, cy = 50, dx = 0, dy = 0) => `translate(${cx + dx} ${cy + dy}) scale(${s}) translate(${-cx} ${-cy})`;

export const WILD: PicDef[] = [
  [
    "🐟",
    "fish",
    (d) => {
      d.path("M73 50 L94 29 Q89 50 94 71 Z", d.fill(P.blue, "d"), { sw: 3 });
      d.path("M36 32 Q50 14 66 31 Z", d.fill(P.blue, "v"), { sw: 3 });
      d.path("M8 52 Q20 28 48 28 Q71 28 80 50 Q71 72 48 72 Q20 72 8 52 Z", d.fill(P.sky), { sw: 3.5 });
      d.clip("M8 52 Q20 28 48 28 Q71 28 80 50 Q71 72 48 72 Q20 72 8 52 Z", (c) => {
        c.path("M8 58 Q30 74 50 74 Q70 74 80 58 Q50 64 8 58 Z", "#e8f7ff", { stroke: null, op: 0.85 });
        c.stroke("M51 26 Q44 50 51 74", { sw: 5, color: P.blue[1], op: 0.7 });
        c.stroke("M63 28 Q57 50 63 72", { sw: 5, color: P.blue[1], op: 0.7 });
      });
      d.path("M8 52 Q20 28 48 28 Q71 28 80 50 Q71 72 48 72 Q20 72 8 52 Z", "none", { sw: 3.5 });
      d.stroke("M33 40 Q27 50 33 60", { sw: 2.5 });
      d.eye(21, 47, 4.6);
      d.path("M40 58 Q49 53 53 62 Q46 67 40 58 Z", d.fill(P.blue, "v"), { sw: 2.2 });
      d.stroke("M9 53 Q12 56 16 55", { sw: 2 });
      d.shine(34, 37, 10, 3.6, 0.6, -8);
    },
  ],
  [
    "🐸",
    "frog",
    (d) => {
      const head = "M14 33.8 A17 17 0 1 1 44.7 36.5 Q50 39.5 55.3 36.5 A17 17 0 1 1 86 33.8 C90 42 93 52 92 62 C91 80 72 90 50 90 C28 90 9 80 8 62 C7 52 10 42 14 33.8 Z";
      d.path(head, d.fill(P.green), { sw: 3.5 });
      d.clip(head, (c) => {
        c.ellipse(50, 94, 38, 22, P.lime[0], { stroke: null, op: 0.75 });
        for (const [x, y, r] of [[15, 56, 3.2], [85, 54, 3.6], [80, 68, 2.4], [20, 70, 2.2]]) c.circle(x, y, r, P.green[2], { stroke: null, op: 0.35 });
      });
      for (const x of [30, 70]) eyeball(d, x, 28, 11.5, x < 50 ? 1.6 : -1.6, 1.2, 2.6);
      d.ellipse(45, 49, 1.7, 1.3, OL, { stroke: null });
      d.ellipse(55, 49, 1.7, 1.3, OL, { stroke: null });
      d.stroke("M25 59 Q50 83 75 59", { sw: 3.2 });
      d.stroke("M22 57 Q25 58 26 61 M78 57 Q75 58 74 61", { sw: 2.4 });
      blush(d, 22, 67, 5, GREEN_BLUSH);
      blush(d, 78, 67, 5, GREEN_BLUSH);
      d.shine(17, 21, 4.5, 2.4, 0.6, -50);
    },
  ],
  [
    "🦋",
    "butterfly",
    (d) => {
      const up = "M47 36 C42 20 26 8 14 12 C5 15 5 32 10 42 C15 52 34 54 47 49 Z";
      const lo = "M47 54 C36 52 20 56 17 68 C14 80 24 90 34 86 C42 83 47 72 47 60 Z";
      const wing = (c: Pen) => {
        c.path(lo, c.fill(P.violet), { sw: 3 });
        c.clip(lo, (k) => {
          k.path(lo, "none", { stroke: P.violet[2], sw: 8 });
          k.circle(30, 72, 5.5, P.pink[0], { stroke: null });
          for (const [x, y] of [[20, 70], [24, 82], [33, 86]]) k.circle(x, y, 1.9, "#fff", { stroke: null });
        });
        c.path(lo, "none", { sw: 3 });
        c.path(up, c.fill(P.sky), { sw: 3.2 });
        c.clip(up, (k) => {
          k.path(up, "none", { stroke: P.blue[2], sw: 9 });
          k.circle(27, 29, 7, P.gold[1], { stroke: P.orange[1], sw: 2.5 });
          for (const [x, y] of [[12, 22], [10, 32], [14, 42], [20, 13]]) k.circle(x, y, 2, "#fff", { stroke: null });
        });
        c.path(up, "none", { sw: 3.2 });
      };
      wing(d);
      d.mirror(50, wing);
      for (const s of [-1, 1]) {
        d.stroke(`M${50 + s * 3} 21 Q${50 + s * 7} 12 ${50 + s * 14} 10`, { sw: 2.5 });
        d.circle(50 + s * 14, 10, 3, P.ink[1], { sw: 2 });
      }
      d.path(rr(45.5, 30, 9, 52, 4.5), d.fill(P.ink, "h"), { sw: 3 });
      d.stroke("M46.5 44 H53.5 M46.5 54 H53.5 M46.5 64 H53.5", { sw: 1.8, color: P.ink[2] });
      d.circle(50, 26, 7.5, d.fill(P.ink), { sw: 3 });
      d.circle(47.2, 25.5, 1.6, "#fff", { stroke: null });
      d.circle(52.8, 25.5, 1.6, "#fff", { stroke: null });
      d.shine(20, 20, 5, 2.5, 0.6, -40);
    },
  ],
  [
    "🐝",
    "bee",
    (d) => {
      d.ellipse(60, 24, 10, 15, wingFill(d), { sw: 2.5, tf: "rotate(28 60 24)" });
      d.path("M82 56 L92 61 L82 66 Z", d.fill(P.ink), { sw: 2.2 });
      const body = "M14 60 C14 42 30 32 50 32 C70 32 84 44 84 60 C84 76 70 86 50 86 C30 86 14 76 14 60 Z";
      d.path(body, d.fill(P.gold), { sw: 3.5 });
      d.clip(body, (c) => {
        c.stroke("M52 28 Q45 59 52 90", { sw: 9, color: P.ink[1] });
        c.stroke("M69 28 Q62 59 69 90", { sw: 9, color: P.ink[1] });
      });
      d.path(body, "none", { sw: 3.5 });
      d.ellipse(46, 23, 10, 15, wingFill(d), { sw: 2.5, tf: "rotate(-22 46 23)" });
      d.stroke("M27 39 Q22 28 15 24", { sw: 2.6 });
      d.circle(15, 24, 3.2, d.fill(P.ink), { sw: 2 });
      d.stroke("M35 35 Q34 24 29 17", { sw: 2.6 });
      d.circle(29, 17, 3.2, d.fill(P.ink), { sw: 2 });
      d.eye(31, 55, 5.2);
      d.smile(28, 66, 9);
      d.cheek(39, 67, 4.5);
      d.shine(26, 45, 6, 3, 0.6, -40);
    },
  ],
  [
    "🐢",
    "turtle",
    (d) => {
      d.g(about(0.97, 50, 55, 0.5, -3), (d) => {
        d.shadow(52, 87, 38);
        for (const x of [40, 78]) d.path(`M${x - 6} 68 L${x - 6} 81 Q${x - 6} 86 ${x} 86 Q${x + 6} 86 ${x + 6} 81 L${x + 6} 68 Z`, d.fill(deep(P.lime), "h"), { sw: 2.8 });
        d.path("M84 64 Q92 66 93 71 Q88 72 82 70 Z", d.fill(P.lime), { sw: 2.6 });
        d.tube("M34 62 Q26 58 20 52", P.lime[1], 12, 3);
        for (const x of [30, 68]) d.path(`M${x - 7} 68 L${x - 7} 82 Q${x - 7} 88 ${x} 88 Q${x + 7} 88 ${x + 7} 82 L${x + 7} 68 Z`, d.fill(P.lime, "h"), { sw: 3 });
        d.ellipse(17, 46, 11.5, 10.5, d.fill(P.lime), { sw: 3 });
        const shell = "M22 66 C22 42 36 25 54 25 C72 25 86 42 86 66 Z";
        d.path(shell, d.fill(P.green), { sw: 3.5 });
        d.clip(shell, (c) => {
          c.path("M45 36 L63 36 L69 48 L63 60 L45 60 L39 48 Z", P.lime[0], { stroke: P.forest[2], sw: 2.4, op: 0.9 });
          c.stroke("M45 36 L40 24 M63 36 L68 24 M69 48 L90 48 M39 48 L18 48 M45 60 L42 70 M63 60 L66 70", { sw: 2.4, color: P.forest[2] });
        });
        d.path(shell, "none", { sw: 3.5 });
        d.path("M17 63 Q54 71 91 63 Q94 68 89 72 Q54 80 19 72 Q14 68 17 63 Z", d.fill(P.gold, "v"), { sw: 3 });
        d.eye(14, 44, 3.8);
        d.smile(12, 51, 7, 2.2);
        blush(d, 21, 51, 3.5, GREEN_BLUSH);
        d.shine(42, 33, 9, 3.5, 0.55, -25);
      });
    },
  ],
  [
    "🐚",
    "spiral shell",
    (d) => {
      d.g("translate(54.5 47.5) rotate(32) scale(0.97) translate(-50 -51)", (g) => {
        // The light still comes from the top-left once the shell is tipped over.
        const lit = g.rad([[0, P.sand[0]], [0.55, P.sand[1]], [1, P.sand[2]]], 0.2, 0.4, 0.9);
        const shell = "M50 6 Q57.5 10.5 60 23 Q70.5 28.5 72 40 C81 47 84 61 80 73 C76 85 64 92 50 96 C38 92 24 84 20 70 C17 57 21 42 28.5 34 Q29.5 24 40 19 Q42 10 50 6 Z";
        g.path(shell, lit, { sw: 3.5 });
        g.clip(shell, (c) => {
          c.stroke("M34 27.5 Q50 34.5 66 32.5", { sw: 5.5, color: P.coral[1], op: 0.55 });
          c.stroke("M21 52 Q50 63 81 56", { sw: 7, color: P.coral[1], op: 0.55 });
          c.stroke("M20 71 Q48 81 84 73", { sw: 7, color: P.coral[1], op: 0.45 });
          c.stroke("M45 11.5 Q50 14.5 55.5 13.5", { sw: 2.2, color: P.sand[2] });
          c.stroke("M40 19 Q48 25 60 23", { sw: 2.6, color: P.sand[2] });
          c.stroke("M28.5 34 Q48 44 72 40", { sw: 2.6, color: P.sand[2] });
        });
        g.path(shell, "none", { sw: 3.5 });
        const mouth = "M57 50 C71 48 83 58 83 72 C83 86 73 94 63 92 C55 90 53 80 55 70 C56 62 53 54 57 50 Z";
        g.path(mouth, g.fill(P.rose), { sw: 3 });
        g.path("M61 56 C71 56 77 64 77 73 C77 82 71 88 64 86 C59 84 58 78 59 70 C60 64 58 59 61 56 Z", g.lin([[0, P.pink[2]], [1, P.pink[1]]], 0, 0, 1, 1), { stroke: null, op: 0.75 });
        g.shine(34, 57, 4.5, 11, 0.6, 12);
      });
    },
  ],
  [
    "🐠",
    "tropical fish",
    (d) => {
      const orange = P.orange;
      d.path("M74 50 C80 40 85 31 91 30 C94 40 94 60 91 70 C85 69 80 60 74 50 Z", d.fill(orange, "d"), { sw: 3 });
      d.path("M30 28 C33 15 45 10 51 18 C56 10 68 14 70 31 Z", d.fill(orange, "v"), { sw: 3 });
      d.path("M42 71 C43 82 55 86 60 71 Z", d.fill(orange, "v"), { sw: 2.8 });
      const body = "M9 50 C9 34 26 24 46 24 C66 24 78 38 80 50 C78 62 66 76 46 76 C26 76 9 66 9 50 Z";
      d.path(body, d.fill(orange), { sw: 3.5 });
      d.clip(body, (c) => {
        c.path("M27 20 Q37 50 27 80 L37 80 Q46 50 37 20 Z", "#fff", { sw: 2.4 });
        c.path("M52 20 Q59 35 52 50 Q59 65 52 80 L62 80 Q69 65 62 50 Q69 35 62 20 Z", "#fff", { sw: 2.4 });
        c.path("M74 30 Q78 50 74 70 L86 70 L86 30 Z", "#fff", { sw: 2.4 });
      });
      d.path(body, "none", { sw: 3.5 });
      d.path("M33 56 Q42 52 45 61 Q38 65 33 56 Z", d.fill(orange, "v"), { sw: 2.2 });
      d.eye(19, 46, 4.6);
      d.stroke("M10 52 Q13 56 17 55", { sw: 2 });
      d.shine(22, 34, 6, 3, 0.6, -25);
    },
  ],
  [
    "🐍",
    "snake",
    (d) => {
      d.shadow(56, 85, 33);
      const line: Pt[] = [[25, 36], [26, 56], [37, 71], [54, 74], [64, 61], [70, 50], [83, 51], [88, 63], [82, 73]];
      const body = ribbon(line, 19, 3, 1.6);
      d.path(body, d.fill(P.lime), { sw: 3.2 });
      d.clip(body, (c) => {
        const s = along(line);
        for (let i = 7; i < s.length - 8; i += 9) {
          const k = 5 - i * 0.03;
          c.path(`M${q(s[i][0])} ${q(s[i][1] - k)} L${q(s[i][0] + k)} ${q(s[i][1])} L${q(s[i][0])} ${q(s[i][1] + k)} L${q(s[i][0] - k)} ${q(s[i][1])} Z`, P.green[2], { stroke: null, op: 0.6 });
        }
      });
      d.path(body, "none", { sw: 3.2 });
      d.stroke("M37 31 L45 32 M45 32 L49 29 M45 32 L49 35", { sw: 2.6, color: P.red[1] });
      d.ellipse(26, 28, 13, 10, d.fill(P.lime), { sw: 3.2, tf: "rotate(6 26 28)" });
      d.eye(24, 25, 3.8);
      d.smile(30, 32, 7, 2.2);
      d.circle(36, 27, 1, OL, { stroke: null });
      blush(d, 20, 32, 3.2, GREEN_BLUSH);
      d.shine(20, 22, 4, 2, 0.6, -30);
    },
  ],
  [
    "🐙",
    "octopus",
    (d) => {
      d.g(about(0.93, 50, 51, 0, -0.5), (d) => {
        const arm = (pts: Pt[], w: number, ramp: Ramp) => d.path(ribbon(pts, w, 3.4, 0.9), d.fill(ramp), { sw: 3.2 });
        arm([[42, 58], [37, 74], [36, 86], [41, 91]], 11, deep(P.purple));
        arm([[58, 58], [63, 74], [64, 86], [59, 91]], 11, deep(P.purple));
        const left = (k: Pen, f: (pts: Pt[], w: number, r: Ramp) => void) => {
          f([[32, 52], [20, 60], [11, 70], [11, 81], [17, 86], [23, 83]], 13, P.purple);
          f([[40, 58], [30, 70], [26, 82], [30, 91], [37, 91]], 12.5, P.purple);
          f([[47, 60], [46, 74], [44, 84], [47, 92], [52, 89]], 11, P.purple);
          for (const [x, y] of [[13, 77], [16, 82], [28, 84]]) k.circle(x, y, 1.8, P.purple[0], { stroke: P.purple[2], sw: 1 });
        };
        left(d, arm);
        d.mirror(50, (m) => left(m, (pts, w, r) => m.path(ribbon(pts, w, 3.4, 0.9), m.fill(r), { sw: 3.2 })));
        const head = "M50 8 C70 8 82 22 82 38 C82 54 70 64 50 64 C30 64 18 54 18 38 C18 22 30 8 50 8 Z";
        d.path(head, d.fill(P.purple), { sw: 3.7 });
        for (const [x, y, r] of [[66, 19, 3.4], [73, 29, 2.3], [59, 14, 2]]) d.circle(x, y, r, P.purple[2], { stroke: null, op: 0.3 });
        d.eye(39, 39, 5.6);
        d.eye(61, 39, 5.6);
        d.smile(50, 49, 10, 2.8);
        d.cheek(30, 48, 4.8);
        d.cheek(70, 48, 4.8);
        d.shine(33, 21, 9, 4.5, 0.55, -35);
      });
    },
  ],
  [
    "🐞",
    "ladybug",
    (d) => {
      for (const s of [-1, 1]) {
        d.tube(`M${50 + s * 22} 44 L${50 + s * 35} 38`, P.ink[1], 3.6, 2.2);
        d.tube(`M${50 + s * 26} 60 L${50 + s * 39} 61`, P.ink[1], 3.6, 2.2);
        d.tube(`M${50 + s * 22} 76 L${50 + s * 34} 85`, P.ink[1], 3.6, 2.2);
        d.stroke(`M${50 + s * 5} 15 Q${50 + s * 9} 9 ${50 + s * 15} 9`, { sw: 2.5 });
        d.circle(50 + s * 15, 9, 2.8, P.ink[1], { sw: 2 });
      }
      d.circle(50, 26, 15, d.fill(P.black), { sw: 3 });
      const body = "M50 25 C70 25 84 40 84 58 C84 77 69 91 50 91 C31 91 16 77 16 58 C16 40 30 25 50 25 Z";
      d.path(body, d.fill(P.red), { sw: 3.5 });
      d.clip(body, (c) => {
        for (const [x, y, r] of [[36, 45, 6], [64, 45, 6], [30, 64, 6.5], [70, 64, 6.5], [42, 80, 5.5], [58, 80, 5.5]]) c.circle(x, y, r, d.fill(P.black), { stroke: null });
      });
      d.stroke("M50 27 V90", { sw: 2.8 });
      d.path(body, "none", { sw: 3.5 });
      d.circle(44.5, 20, 3.8, "#fff", { sw: 1.6 });
      d.circle(55.5, 20, 3.8, "#fff", { sw: 1.6 });
      d.circle(45, 20.6, 2, OL, { stroke: null });
      d.circle(55, 20.6, 2, OL, { stroke: null });
      d.shine(33, 35, 8, 3.6, 0.6, -35);
    },
  ],
  [
    "🐋",
    "whale",
    (d) => {
      d.g("translate(3.5 6) scale(0.9)", (g) => {
        g.path(leaf(85, 38, 24, -128, 0.55), g.fill(P.blue, "d"), { sw: 3.4 });
        g.path(leaf(85, 38, 22, -56, 0.55), g.fill(P.blue, "d"), { sw: 3.4 });
        const body = "M6 54 C6 39 19 30 38 30 C56 30 66 42 76 42 C80 42 83 40 85 37 L88 41 C86 49 80 59 70 66 C58 74 40 78 25 76 C12 74 6 65 6 54 Z";
        g.path(body, g.fill(P.blue), { sw: 3.8 });
        g.clip(body, (c) => {
          c.path("M2 58 Q22 67 40 65 Q58 63 76 62 L76 92 L2 92 Z", P.sky[0], { stroke: null, op: 0.9 });
          c.stroke("M14 67 Q34 74 54 69 M19 72 Q36 78 52 74", { sw: 2.2, color: P.sky[2], op: 0.8 });
        });
        g.path(body, "none", { sw: 3.8 });
        g.stroke("M7 57 Q21 61 34 57", { sw: 2.8 });
        g.path(leaf(42, 65, 17, 125, 0.5), g.fill(P.blue, "d"), { sw: 3 });
        g.eye(29, 49, 4);
        g.shine(30, 37, 11, 3.6, 0.55, -8);
      });
    },
  ],
  [
    "🐛",
    "caterpillar",
    (d) => {
      d.shadow(50, 86, 38);
      const segs: [number, number, number][] = [[18, 71, 9.5], [30.5, 66, 11], [43.5, 63, 12], [57, 63, 12], [69.5, 60, 11.5]];
      for (const [x, y, r] of segs) d.ellipse(x + 1, y + r - 1, 3, 3.6, P.green[2], { sw: 2 });
      segs.forEach(([x, y, r], i) => {
        d.circle(x, y, r, d.fill(i % 2 ? P.lime : P.green), { sw: 3 });
        d.circle(x - r * 0.15, y - r * 0.5, r * 0.2, P.gold[1], { sw: 1.6 });
      });
      d.stroke("M71 30 Q68 20 62 15", { sw: 2.6 });
      d.circle(62, 15, 3, d.fill(P.orange), { sw: 2 });
      d.stroke("M83 30 Q86 21 85 13", { sw: 2.6 });
      d.circle(85, 13, 3, d.fill(P.orange), { sw: 2 });
      d.circle(77, 43, 15, d.fill(P.lime), { sw: 3.2 });
      d.eye(80, 41, 4.6);
      d.smile(82, 50, 8, 2.4);
      blush(d, 72, 50, 4, GREEN_BLUSH);
      d.shine(71, 35, 5, 2.6, 0.6, -35);
    },
  ],
  [
    "🦈",
    "shark",
    (d) => {
      d.path("M79 49 C83 39 87 30 92 22 C94 34 93 44 88 52 C92 60 93 66 91 75 C86 68 82 62 79 56 Z", d.fill(P.steel, "d"), { sw: 3 });
      d.path("M42 37 C47 27 51 19 57 14 C60 22 62 30 64 37 Z", d.fill(P.steel, "v"), { sw: 3 });
      const body = "M8 54 C14 40 32 34 52 34 C68 34 79 42 85 49 L85 56 C77 64 64 70 48 70 C30 70 14 64 8 54 Z";
      d.path(body, d.fill(P.steel), { sw: 3.5 });
      d.clip(body, (c) => c.path("M4 56 Q30 72 60 65 Q76 61 92 52 L92 92 L4 92 Z", d.fill(P.white, "v"), { stroke: null }));
      d.path(body, "none", { sw: 3.5 });
      d.stroke("M36 45 Q34 50 36 55 M41 45 Q39 50 41 55 M46 45 Q44 50 46 55", { sw: 2.2, color: P.steel[2] });
      d.path("M38 62 C36 70 32 76 27 80 C37 81 46 73 49 64 Z", d.fill(P.steel, "d"), { sw: 2.8 });
      d.eye(24, 47, 4.2);
      d.stroke("M12 56 Q21 62 31 58", { sw: 2.6 });
      d.path("M17.5 59.3 L19.5 63.4 L21.8 60.4 Z M23.6 60.5 L25.6 64 L27.6 59.8 Z", "#fff", { sw: 1.4 });
      d.shine(30, 40, 10, 3.2, 0.55, -10);
    },
  ],
  [
    "🐳",
    "spouting whale",
    (d) => {
      tubes(d, ["M37 38 Q36 29 37 21", "M37 22 Q30 12 20 16", "M37 22 Q44 12 54 16"], P.sky[0], 5.5, 2.6);
      d.path(drop(18, 25, 2.8), d.fill(P.sky), { sw: 2 });
      d.path(drop(56, 25, 2.8), d.fill(P.sky), { sw: 2 });
      d.path(leaf(81, 47, 18, -118, 0.55), d.fill(P.sky, "d"), { sw: 3 });
      d.path(leaf(81, 47, 16, -50, 0.55), d.fill(P.sky, "d"), { sw: 3 });
      const body = "M8 63 C8 45 23 37 41 37 C59 37 67 49 75 51 C78 51 80 49 81 46 L85 49 C84 61 79 73 67 81 C57 87 44 89 32 88 C16 86 8 77 8 63 Z";
      d.path(body, d.fill(P.sky), { sw: 3.5 });
      d.clip(body, (c) => {
        c.path("M4 67 Q24 75 46 73 Q64 71 82 66 L82 96 L4 96 Z", "#ffffff", { stroke: null, op: 0.8 });
        c.stroke("M17 77 Q34 83 52 79 M24 82 Q38 87 50 84", { sw: 2, color: P.sky[2], op: 0.55 });
      });
      d.path(body, "none", { sw: 3.5 });
      d.path(leaf(42, 73, 14, 128, 0.5), d.fill(P.sky, "d"), { sw: 2.8 });
      d.eye(25, 59, 4.6);
      d.stroke("M9 65 Q19 71 31 67", { sw: 2.6 });
      blush(d, 33, 70, 4);
      d.shine(25, 45, 9, 3.6, 0.6, -15);
    },
  ],
  [
    "🦎",
    "lizard",
    (d) => {
      const g = P.green;
      d.g("translate(3 3) scale(0.94)", (d) => {
        d.shadow(50, 81, 36);
        tubes(d, ["M40 60 Q40 68 45 74", "M64 60 Q68 67 73 72"], g[2], 6, 2.6);
        const tail = ribbon([[58, 56], [71, 60], [83, 55], [87, 44], [83, 34], [76, 33], [73, 39], [77, 43]], 14, 3, 0.9);
        const body = "M24 47 C32 41 46 41 57 44 C66 46 70 52 68 58 C66 64 56 66 45 65 C35 64 27 60 23 56 Z";
        const head = "M8 49 C8 41 14 35 22 35 C31 35 36 41 36 48 C36 55 30 58 22 58 C14 58 8 56 8 49 Z";
        union(d, [[tail, d.fill(g)], [body, d.fill(g)], [head, d.fill(g)]], 3);
        d.clip(body, (c) => c.ellipse(46, 68, 26, 8, P.lime[0], { stroke: null, op: 0.7 }));
        for (const [x, y, r] of [[44, 48, 2.8], [54, 49, 2.3], [34, 49, 2], [62, 53, 2], [82, 48, 2]]) d.circle(x, y, r, P.lime[0], { stroke: null, op: 0.85 });
        tubes(d, ["M30 60 Q25 66 22 73", "M58 61 Q59 68 55 74"], g[1], 6.5, 2.8);
        for (const [x, y] of [[22, 74], [55, 75]]) for (const k of [-1, 0, 1]) d.circle(x + k * 4.6, y + Math.abs(k) * -0.8 + 1.5, 2.4, g[0], { sw: 1.8 });
        d.eye(21, 44, 4.4);
        d.stroke("M10 51 Q18 56 27 52", { sw: 2.4 });
        blush(d, 27, 54, 3.4, GREEN_BLUSH);
        d.shine(15, 40, 4, 2, 0.6, -30);
      });
    },
  ],
  [
    "🦖",
    "T. rex",
    (d) => {
      const g = P.green;
      d.shadow(58, 90, 32);
      const leg = "M46 62 C46 52 58 48 66 54 C72 59 72 70 66 76 L66 84 C70 84 72 86 72 88 C72 90 70 91 66 91 L46 91 C43 91 42 89 43 87 C44 85 47 84 50 84 L52 76 C48 72 46 67 46 62 Z";
      d.path(leg, d.fill(deep(g), "h"), { sw: 3, tf: "translate(12 -1)" });
      const tail = ribbon([[60, 58], [72, 64], [81, 72], [87, 82]], 24, 4, 1);
      const body = "M33 47 C42 39 60 40 69 49 C78 58 77 72 67 79 C57 86 42 84 35 76 C28 68 27 54 33 47 Z";
      const head = "M10 25 C10 15 20 9 33 9 C46 9 54 15 54 25 L54 33 C54 42 47 47 37 47 L21 47 C14 47 10 43 10 37 Z";
      union(d, [[tail, d.fill(g)], [body, d.fill(g)], [head, d.fill(g)]], 3.2);
      d.clip(body, (c) => {
        c.ellipse(38, 68, 11, 17, P.lime[0], { stroke: null, op: 0.8 });
        c.stroke("M28 62 Q38 65 48 62 M28 69 Q38 72 48 69", { sw: 1.8, color: P.green[1], op: 0.5 });
      });
      d.stroke("M58 43 Q62 47 60 51 M67 48 Q71 52 68 56 M75 58 Q79 62 76 66", { sw: 3, color: g[2], op: 0.4 });
      tubes(d, ["M42 57 Q35 62 30 58"], g[1], 5, 2.4);
      d.stroke("M30 58 L27 55.5 M30 58 L27.5 61", { sw: 2.2 });
      d.path(leg, d.fill(g, "h"), { sw: 3 });
      d.stroke("M50 87.5 V91 M56 87.5 V91", { sw: 2 });
      d.shine(52, 58, 4, 2, 0.4, -30);
      d.eye(37, 22, 4.8);
      d.stroke("M31 14.5 Q37 11.5 43 14.5", { sw: 2.6 });
      d.circle(16, 18, 1.5, OL, { stroke: null });
      d.path("M16.5 36.4 L18 39.6 L19.5 36.7 Z M24.5 37.3 L26 40.6 L27.5 37.5 Z M32.5 37.2 L34 40.4 L35.5 37 Z", "#fff", { sw: 1.4 });
      d.stroke("M12 35 Q26 40 44 35", { sw: 2.8 });
      blush(d, 45, 30, 4, GREEN_BLUSH);
      d.shine(22, 16, 8, 3.4, 0.55, -15);
    },
  ],
  [
    "🦕",
    "long-neck dinosaur",
    (d) => {
      const g = P.teal;
      d.shadow(56, 89, 38);
      for (const x of [45, 75]) d.path(rr(x - 6, 62, 12, 25, 5), d.fill(deep(g), "h"), { sw: 2.8 });
      for (const x of [37, 67]) d.path(rr(x - 6.5, 62, 13, 27, 5.5), d.fill(g, "h"), { sw: 3 });
      const neck = ribbon([[42, 58], [32, 45], [27, 31], [24, 20]], 20, 11, 1);
      const head = "M10 19 C10 13 15 10 22 10 C29 10 34 14 34 19 C34 24 29 27 22 27 C15 27 10 24 10 19 Z";
      const body = "M30 62 C30 48 44 41 60 41 C76 41 86 50 86 62 C86 74 74 80 58 80 C42 80 30 74 30 62 Z";
      const tail = ribbon([[78, 58], [85, 63], [89, 70.5]], 18, 3, 1);
      union(d, [[tail, d.fill(g)], [neck, d.fill(g)], [body, d.fill(g)], [head, d.fill(g)]], 3.2);
      d.clip(body, (c) => c.ellipse(56, 84, 28, 12, g[0], { stroke: null, op: 0.75 }));
      for (const [x, y, r] of [[52, 48, 4], [64, 46, 3.4], [75, 51, 3], [40, 53, 2.6]]) d.circle(x, y, r, g[0], { stroke: null, op: 0.75 });
      for (const x of [32, 37, 42, 62, 67, 72]) d.stroke(`M${x} 89 V85.5`, { sw: 1.8 });
      d.eye(19, 17, 3.6);
      d.stroke("M11 21 Q16 24 21 22", { sw: 2.2 });
      blush(d, 25, 22, 3, GREEN_BLUSH);
      d.shine(50, 47, 9, 3.4, 0.55, -15);
    },
  ],
  [
    "🐜",
    "ant",
    (d) => {
      const c = P.brown;
      d.shadow(52, 85, 36);
      tubes(d, ["M46 58 L40 66 L36 78", "M50 60 L56 69 L56 80", "M54 58 L66 64 L76 76"], c[2], 3.4, 2.2);
      tubes(d, ["M24 39 L20 27 L10 22", "M31 38 L33 25 L25 15"], c[2], 2.8, 2.2);
      d.circle(10, 22, 2.6, c[2], { sw: 1.8 });
      d.circle(25, 15, 2.6, c[2], { sw: 1.8 });
      d.ellipse(71, 55, 19, 15, d.fill(c), { sw: 3.2 });
      d.ellipse(48, 56, 10.5, 8.5, d.fill(c), { sw: 3 });
      d.circle(28, 50, 14, d.fill(c), { sw: 3.2 });
      tubes(d, ["M44 60 L32 66 L26 80", "M48 62 L48 71 L44 82", "M52 60 L62 68 L68 81"], c[1], 3.8, 2.4);
      d.eye(24, 47, 4.8);
      d.smile(22, 56, 7, 2.2);
      blush(d, 32, 56, 3.6);
      d.shine(65, 47, 7, 3, 0.55, -20);
    },
  ],
  [
    "🐌",
    "snail",
    (d) => {
      const skin = P.tan;
      d.shadow(52, 88, 40);
      tubes(d, ["M23 46 Q18 35 14 25", "M31 45 Q33 34 35 24"], skin[1], 4.6, 2.4);
      const body = "M10 84 C8 77 12 71 16 67 C14 58 16 48 24 44 C32 40 41 46 41 54 L42 72 L80 72 C88 72 92 78 90 82 C89 85 86 86 82 86 L16 86 C12 86 10 85 10 84 Z";
      d.path(body, d.fill(skin), { sw: 3.2 });
      eyeball(d, 14, 22, 5.6, -0.8, 0.6, 2.2);
      eyeball(d, 35, 21, 5.6, -0.8, 0.6, 2.2);
      d.path(circlePath(62, 50, 26), d.fill(P.coral), { sw: 3.5 });
      d.stroke(spiral(63, 52, 2.5, 21, 2.2, 200), { sw: 3, color: P.coral[2] });
      d.shine(50, 34, 8, 4, 0.55, -35);
      d.smile(22, 58, 8, 2.4);
      blush(d, 31, 61, 3.6);
    },
  ],
  [
    "🐊",
    "crocodile",
    (d) => {
      const g = P.forest;
      d.g(about(0.94, 50, 55, 0, -1), (d) => {
        d.shadow(48, 85, 40);
        for (const [x, y] of [[57, 40], [64, 40.5], [71, 43]]) d.path(`M${x - 3.8} ${y + 3} L${x} ${y - 5} L${x + 3.8} ${y + 3} Z`, g[2], { sw: 2.2 });
        tubes(d, ["M44 66 L46 80", "M70 63 L74 77"], g[2], 8, 2.8);
        const body = "M8 57 C8 50 12 47 18 47 L30 45 C32 38 37 34 43 34 C48 34 51 37 53 40 C60 39 68 40 74 44 C80 48 80 60 74 66 C66 72 52 74 42 70 C34 67 26 65 18 65 C12 65 8 62 8 57 Z";
        const tail = ribbon([[68, 52], [77, 51], [84, 44], [86, 34], [82, 26], [76, 25]], 20, 3.5, 1);
        union(d, [[tail, d.fill(g)], [body, d.fill(g)]], 3.2);
        d.clip(body, (c) => {
          c.path("M4 60 Q30 66 48 66 Q66 66 82 58 L82 90 L4 90 Z", P.lime[0], { stroke: null, op: 0.75 });
          for (const [x, y] of [[54, 46], [62, 46], [70, 48], [58, 53], [66, 54]]) c.ellipse(x, y, 2.8, 2, g[2], { stroke: null, op: 0.4 });
        });
        d.path("M14 58.6 L15.8 62.4 L17.6 58.8 Z M21 58.9 L22.8 62.7 L24.6 59 Z M28 59 L29.8 62.8 L31.6 58.8 Z M17.5 61.8 L19.2 59.2 L20.9 61.9 Z M24.5 62 L26.2 59.4 L27.9 62 Z", "#fff", { sw: 1.3 });
        d.stroke("M10 58 Q24 60.5 36 57.5 Q39.5 56.5 41 52.5", { sw: 2.8 });
        d.circle(13, 48.5, 1.6, OL, { stroke: null });
        eyeball(d, 42, 41, 6, -1, 0.4, 2.6);
        blush(d, 44, 57, 3.6, GREEN_BLUSH);
        tubes(d, ["M36 66 Q35 74 31 80", "M62 66 Q63 74 60 80"], g[1], 8.5, 2.8);
        for (const [x, y] of [[31, 81], [60, 81]]) for (const k of [-1, 0, 1]) d.circle(x + k * 4.4, y + 1.4 - Math.abs(k) * 0.8, 2.3, g[1], { sw: 1.8 });
        d.shine(20, 51, 7, 2.2, 0.55, -6);
      });
    },
  ],
  [
    "🦀",
    "crab",
    (d) => {
      const r = P.coral;
      d.shadow(50, 89, 34);
      const side = (k: Pen) => {
        tubes(k, ["M27 62 Q16 61 10 70", "M28 68 Q18 72 15 81", "M31 73 Q25 80 23 87"], r[1], 4.4, 2.4);
        tubes(k, ["M30 54 Q20 50 18 40"], r[1], 6, 2.6);
        k.path("M18 41 C10 41 6 33 7 25 C8 18 11 13 15 11 C15 17 17 21 21 23 C24 19 26 16 29 15 C31 21 30 31 26 37 C24 40 21 41 18 41 Z", k.fill(r), { sw: 3 });
        tubes(k, ["M43 46 L41 34"], r[1], 4, 2.2);
      };
      side(d);
      d.mirror(50, side);
      d.path("M50 42 C70 42 82 52 82 62 C82 74 68 82 50 82 C32 82 18 74 18 62 C18 52 30 42 50 42 Z", d.fill(r), { sw: 3.5 });
      for (const [x, y, s] of [[40, 51, 2.2], [60, 51, 2.2], [50, 48, 1.7], [31, 60, 1.6], [69, 60, 1.6]]) d.circle(x, y, s, r[2], { stroke: null, op: 0.4 });
      eyeball(d, 41, 30, 6.5, 0, 0.6, 2.4);
      eyeball(d, 59, 30, 6.5, 0, 0.6, 2.4);
      d.smile(50, 64, 12, 2.6);
      blush(d, 35, 66, 4);
      blush(d, 65, 66, 4);
      d.shine(36, 50, 8, 3.4, 0.55, -25);
    },
  ],
  [
    "🕷️",
    "spider",
    (d) => {
      const c = P.navy;
      d.shadow(50, 85, 36);
      const legs = (k: Pen) => tubes(k, ["M36 38 L20 22 L12 30", "M33 45 L15 37 L10 50", "M33 53 L15 55 L12 68", "M37 59 L25 70 L21 81"], c[1], 4.6, 2.6);
      legs(d);
      d.mirror(50, legs);
      d.circle(50, 47, 25, d.fill(c), { sw: 3.5 });
      eyeball(d, 41, 44, 7.6, 0.6, 0.8);
      eyeball(d, 59, 44, 7.6, -0.6, 0.8);
      d.circle(44, 32, 3, d.fill(P.white), { sw: 1.8 });
      d.circle(56, 32, 3, d.fill(P.white), { sw: 1.8 });
      d.path("M46 58.5 L47.5 62.5 L49 58.8 Z M51 58.8 L52.5 62.5 L54 58.5 Z", "#fff", { sw: 1.3 });
      d.stroke("M43 57 Q50 61.5 57 57", { sw: 2.4, color: "#fff" });
      blush(d, 34, 55, 4);
      blush(d, 66, 55, 4);
      d.shine(39, 30, 7, 3.4, 0.5, -35);
    },
  ],
  [
    "🐡",
    "blowfish",
    (d) => {
      const y = P.gold;
      d.path("M76 52 C81 45 86 39 91 39 C93 46 93 58 91 65 C86 65 81 59 76 52 Z", d.fill(y, "d"), { sw: 3 });
      for (const deg of [-158, -137, -116, -95, -74, -53, -32, 32, 53, 74, 95, 116, 137, 158]) {
        const a = (deg * Math.PI) / 180;
        const b = 0.15;
        d.path(
          `M${q(46 + Math.cos(a - b) * 30)} ${q(52 + Math.sin(a - b) * 30)} L${q(46 + Math.cos(a) * 39.5)} ${q(52 + Math.sin(a) * 39.5)} L${q(46 + Math.cos(a + b) * 30)} ${q(52 + Math.sin(a + b) * 30)} Z`,
          y[0],
          { sw: 2.2 },
        );
      }
      const body = circlePath(46, 52, 32);
      d.path(body, d.fill(y), { sw: 3.5 });
      d.clip(body, (c) => {
        c.ellipse(44, 84, 34, 18, P.cream[1], { stroke: null, op: 0.9 });
        for (const [x, yy, r] of [[50, 28, 3], [62, 33, 2.6], [40, 24, 2.2], [70, 44, 2.2], [58, 22, 1.8]]) c.circle(x, yy, r, P.wood[1], { stroke: null, op: 0.45 });
      });
      d.path(body, "none", { sw: 3.5 });
      d.path(leaf(54, 60, 15, 25, 0.62), d.fill(y, "d"), { sw: 2.6 });
      eyeball(d, 31, 45, 8.2, -1.4, 0.4, 2.4);
      d.ellipse(15, 58, 4.2, 3.8, d.fill(P.coral), { sw: 2.4 });
      d.ellipse(14.5, 58, 1.6, 1.4, P.coral[2], { stroke: null });
      blush(d, 30, 60, 4);
      d.shine(36, 28, 9, 4, 0.55, -35);
    },
  ],
  [
    "🪱",
    "earthworm",
    (d) => {
      d.shadow(48, 85, 38);
      const line: Pt[] = [[15, 67], [25, 76], [38, 70], [48, 62], [60, 67], [70, 71], [77, 59], [78, 45], [75, 33]];
      const body = ribbon(line, 13, 20, 1);
      d.path(body, d.fill(P.rose), { sw: 3.2 });
      d.clip(body, (c) => {
        const s = along(line);
        for (let i = 3; i < s.length - 10; i += 4) {
          const [x, y] = s[i];
          const [x2, y2] = s[i + 1];
          const len = Math.hypot(x2 - x, y2 - y) || 1;
          const nx = -(y2 - y) / len;
          const ny = (x2 - x) / len;
          const band = i > 50 && i < 60;
          c.stroke(`M${q(x + nx * 11)} ${q(y + ny * 11)} L${q(x - nx * 11)} ${q(y - ny * 11)}`, { sw: band ? 5.5 : 1.8, color: band ? P.pink[1] : P.rose[2], op: band ? 0.35 : 0.5 });
        }
      });
      d.path(body, "none", { sw: 3.2 });
      d.eye(70.5, 32, 3.8);
      d.eye(79.5, 32, 3.8);
      d.smile(75, 39, 7, 2.3);
      blush(d, 67, 39, 3);
      blush(d, 83, 39, 3);
      d.shine(31, 69, 5, 2, 0.6, -35);
    },
  ],
  [
    "🐬",
    "dolphin",
    (d) => {
      const b = P.sky;
      d.g(about(0.95, 50, 50, -1, 4), (d) => {
        d.path(leaf(86, 62, 15, 62, 0.55), d.fill(b, "d"), { sw: 3 });
        d.path(leaf(86, 62, 15, 142, 0.55), d.fill(b, "d"), { sw: 3 });
        d.path("M47 28 C51 21 57 15 65 12 C63 19 63 26 66 31 Z", d.fill(b, "v"), { sw: 3 });
        const body = "M8 61 C10 57 14 55 19 54 C20 40 32 27 50 26 C68 25 83 36 88 53 L90 61 L83 63 C78 54 68 50 57 51 C46 52 37 58 29 63 C22 67 12 66 8 61 Z";
        d.path(body, d.fill(b), { sw: 3.6 });
        d.clip(body, (c) => c.stroke("M18 67 C28 62 40 54 56 53 C68 52 76 56 84 64", { sw: 12, color: "#ffffff", op: 0.8 }));
        d.path(body, "none", { sw: 3.6 });
        d.path(leaf(39, 57, 15, 112, 0.5), d.fill(b, "d"), { sw: 2.8 });
        d.eye(28, 45, 4.3);
        d.stroke("M10 60 Q18 62 25 57", { sw: 2.6 });
        blush(d, 32, 52, 3.4);
        d.shine(42, 33, 10, 3.4, 0.6, -18);
      });
    },
  ],
  [
    "🕸️",
    "spider web",
    (d) => {
      const n = 8;
      const at = (r: number, i: number): Pt => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2 + 0.2;
        const k = r * (1 + 0.06 * Math.sin(i * 2.3));
        return [50 + Math.cos(a) * k, 50 + Math.sin(a) * k];
      };
      for (let i = 0; i < n; i++) {
        const [x, y] = at(40.5, i);
        d.stroke(`M50 50 L${q(x)} ${q(y)}`, { sw: 2.6 });
      }
      for (const r of [9.5, 18, 26.5, 35]) {
        let p = "";
        for (let i = 0; i < n; i++) {
          const [x, y] = at(r, i);
          const [x2, y2] = at(r, i + 1);
          p += `${i ? "" : `M${q(x)} ${q(y)}`} Q${q(50 + ((x + x2) / 2 - 50) * 0.82)} ${q(50 + ((y + y2) / 2 - 50) * 0.82)} ${q(x2)} ${q(y2)} `;
        }
        d.stroke(p, { sw: 2.2 });
      }
      for (const [x, y, r] of [[72, 33, 3.6], [30, 72, 3.2], [60, 79, 2.6]]) d.ball(x, y, r, P.sky, { sw: 1.8 });
    },
  ],
  [
    "🦗",
    "cricket",
    (d) => {
      const g = P.lime;
      d.shadow(52, 85, 38);
      tubes(d, ["M42 60 L45 70 L51 80", "M50 60 L58 70 L63 80", "M68 58 L80 81"], g[2], 3.2, 2.2);
      d.stroke("M21 39 Q25 16 52 9", { sw: 2.4 });
      d.stroke("M27 39 Q35 20 60 16", { sw: 2.4 });
      d.path("M40 48 C54 44 76 46 86 52 C90 56 88 62 82 64 C70 68 52 66 42 62 Z", d.fill(g), { sw: 3 });
      d.path("M37 46 C54 39 76 42 90 52 C76 55 54 55 37 52 Z", d.fill(P.green, "v"), { sw: 2.8 });
      d.stroke("M44 49 Q64 47 84 52", { sw: 1.8, color: P.green[2], op: 0.6 });
      d.path(ribbon([[52, 58], [62, 44], [72, 30]], 13, 6, 1), d.fill(g), { sw: 3 });
      tubes(d, ["M72 30 L87 76"], g[1], 3.8, 2.4);
      d.ellipse(40, 54, 10, 11, d.fill(g), { sw: 3 });
      d.ellipse(24, 50, 13, 13.5, d.fill(g), { sw: 3.2 });
      tubes(d, ["M36 62 L30 70 L24 80", "M42 63 L44 72 L40 82"], g[1], 3.6, 2.4);
      d.eye(21, 47, 5);
      d.smile(18, 57, 7, 2.2);
      blush(d, 28, 58, 3.4, GREEN_BLUSH);
      d.shine(18, 42, 4, 2, 0.6, -30);
    },
  ],
  [
    "🦑",
    "squid",
    (d) => {
      const p = P.pink;
      for (const s of [-1, 1]) {
        d.path(ribbon([[50 + s * 6, 64], [50 + s * 14, 76], [50 + s * 24, 84], [50 + s * 31, 86]], 5, 4, 1), d.fill(p), { sw: 2.6 });
        d.ellipse(50 + s * 33, 86, 6, 4, d.fill(p), { sw: 2.6, tf: `rotate(${s * 12} ${50 + s * 33} 86)` });
      }
      for (const [x0, x1, x2] of [[45, 44, 46], [55, 56, 54]]) d.path(ribbon([[x0, 62], [x1, 76], [x2, 87]], 7, 3.2, 1), d.fill(deep(p)), { sw: 2.6 });
      for (const [x0, x1, x2] of [[37, 33, 35], [42, 39, 40], [47, 46, 46], [53, 54, 54], [58, 61, 60], [63, 67, 65]]) d.path(ribbon([[x0, 62], [x1, 76], [x2, 89]], 7.5, 3.4, 1), d.fill(p), { sw: 2.7 });
      d.path("M50 8 C60 13 74 22 80 32 C70 36 58 33 50 30 C42 33 30 36 20 32 C26 22 40 13 50 8 Z", d.fill(p, "v"), { sw: 3 });
      const mantle = "M50 10 C62 18 67 36 67 51 C67 62 60 69 50 69 C40 69 33 62 33 51 C33 36 38 18 50 10 Z";
      d.path(mantle, d.fill(p), { sw: 3.5 });
      for (const [x, y, r] of [[56, 26, 2.4], [60, 36, 1.8], [53, 40, 1.6]]) d.circle(x, y, r, p[2], { stroke: null, op: 0.35 });
      d.eye(42, 52, 4.8);
      d.eye(58, 52, 4.8);
      d.smile(50, 60, 8, 2.4);
      blush(d, 37, 60, 3.4);
      blush(d, 63, 60, 3.4);
      d.shine(42, 28, 3.5, 9, 0.55, 18);
    },
  ],
  [
    "🦭",
    "seal",
    (d) => {
      const s = P.stone;
      d.shadow(50, 85, 40);
      d.path(leaf(82, 70, 11, -28, 0.62), d.fill(s, "d"), { sw: 2.8 });
      d.path(leaf(82, 70, 11, 28, 0.62), d.fill(s, "d"), { sw: 2.8 });
      const body = "M12 44 C12 32 22 24 32 24 C44 24 50 34 52 42 C58 54 70 62 82 66 L84 71 C74 78 60 82 44 82 C30 82 22 76 20 64 C14 60 12 52 12 44 Z";
      d.path(body, d.fill(s), { sw: 3.5 });
      d.clip(body, (c) => {
        c.ellipse(44, 88, 32, 14, P.grey[0], { stroke: null, op: 0.85 });
        for (const [x, y, r] of [[48, 40, 2.4], [58, 50, 2], [66, 58, 2.2], [42, 50, 1.6]]) c.circle(x, y, r, s[2], { stroke: null, op: 0.35 });
      });
      d.path(body, "none", { sw: 3.5 });
      d.path(leaf(36, 73, 15, 128, 0.5), d.fill(s, "d"), { sw: 2.8 });
      d.ellipse(19, 47, 7.5, 5.5, d.fill(P.grey), { sw: 2.2 });
      d.ellipse(13.5, 43.5, 3, 2.2, OL, { stroke: null });
      for (const y of [45, 49]) d.stroke(`M18 ${y} L9 ${y + (y - 47) * 1.2}`, { sw: 1.6 });
      d.eye(27, 36, 5.2);
      blush(d, 30, 46, 3.8);
      d.shine(26, 28, 7, 3, 0.55, -25);
    },
  ],
  [
    "🪰",
    "fly",
    (d) => {
      const b = P.ink;
      const legs = (k: Pen) => tubes(k, ["M41 42 L27 38 L20 29", "M39 48 L22 51 L15 61", "M42 55 L32 70 L31 82"], b[1], 3.2, 2.2);
      legs(d);
      d.mirror(50, legs);
      d.ellipse(50, 67, 12, 17, d.fill(b), { sw: 3 });
      d.clip("M38 67 a12 17 0 1 0 24 0 a12 17 0 1 0 -24 0 Z", (c) => {
        for (const y of [64, 72, 80]) c.stroke(`M36 ${y} Q50 ${y + 4} 64 ${y}`, { sw: 2.4, color: b[0], op: 0.7 });
      });
      const wing = (k: Pen) => {
        k.ellipse(32, 60, 11, 21, wingFill(k), { sw: 2.6, tf: "rotate(32 32 60)" });
        k.stroke("M42 46 Q32 58 24 72 M38 52 Q30 56 22 58", { sw: 1.4, color: P.sky[2], op: 0.7 });
      };
      wing(d);
      d.mirror(50, wing);
      d.circle(50, 45, 12.5, d.fill(b), { sw: 3 });
      d.circle(50, 28, 11, d.fill(b), { sw: 3 });
      for (const s of [-1, 1]) {
        d.ellipse(50 + s * 9, 26, 8, 9, d.fill(P.red), { sw: 2.6 });
        d.eye(50 + s * 8, 27, 3.6);
      }
      d.stroke("M46.5 33.5 Q50 36.5 53.5 33.5", { sw: 2, color: "#fff" });
      d.shine(44, 39, 4, 2, 0.4, -30);
    },
  ],
  [
    "🦣",
    "mammoth",
    (d) => {
      const f = P.brown;
      d.g("translate(2.5 1) scale(0.95)", (d) => {
        d.shadow(55, 89, 38);
        for (const x of [54, 85]) d.path(rr(x - 7, 60, 13, 27, 5), d.fill(deep(f), "h"), { sw: 2.8 });
        for (const x of [46, 77]) d.path(rr(x - 7.5, 60, 15, 29, 6), d.fill(f, "h"), { sw: 3 });
        const body = "M32 40 C36 24 54 17 68 21 C82 25 92 38 92 54 C92 63 88 69 83 72 L78 69 L73 73 L67 69 L61 73 L55 69 L49 73 L43 69 L37 71 C32 66 30 54 32 40 Z";
        const head = "M14 40 C14 25 24 13 36 13 C48 13 54 24 54 36 C54 48 48 56 38 58 C28 60 14 54 14 40 Z";
        const trunk = ribbon([[24, 50], [18, 62], [16, 74], [20, 82], [26, 80]], 12, 6, 1);
        union(d, [[body, d.fill(f)], [head, d.fill(f)], [trunk, d.fill(f)]], 3.3);
        d.stroke("M62 30 Q66 36 63 42 M74 32 Q79 39 75 46 M68 50 Q72 56 69 62", { sw: 2.5, color: f[2], op: 0.5 });
        d.stroke("M19 70 H24 M18 76 H23", { sw: 1.9, color: f[2], op: 0.6 });
        d.path("M42 30 C50 27 56 35 52 45 C48 51 42 47 42 30 Z", d.fill(deep(f)), { sw: 2.7 });
        d.path(ribbon([[31, 55], [24, 65], [15, 66], [10, 58]], 7, 2.6, 1), d.fill(P.cream), { sw: 2.9 });
        d.eye(31, 34, 3.9);
        blush(d, 37, 45, 3.6);
        d.shine(28, 22, 7, 3, 0.5, -30);
      });
    },
  ],
  [
    "🐉",
    "dragon",
    (d) => {
      const g = P.green;
      const o = P.orange;
      d.shadow(54, 92, 34);
      const wing = "M60 51 C64 37 74 23 86 15 C88 23 90 30 92 37 C88 37 85 39 84 43 C84 47 86 49 86 51 C82 49 78 50 76 53 C72 53 68 55 66 58 Z";
      d.path(wing, d.fill([o[1], o[2], o[2]], "d"), { sw: 3, tf: "translate(-12 1) rotate(-10 60 51)" });
      const tail = ribbon([[58, 78], [71, 84], [81, 83], [87, 76]], 13, 4.5, 1);
      d.path("M87 78 C83 77 81 74 82 70 C83 67 85 64 87 61 C89 64 91 67 91 70 C92 74 90 77 87 78 Z", d.fill(o), { sw: 2.6 });
      for (const [x, y, a] of [[22, 15, -20], [32, 13, 0], [45, 34, 35], [53, 38, 45]]) d.path(`M${x - 4} ${y + 3} L${x} ${y - 6} L${x + 4} ${y + 3} Z`, d.fill(o, "v"), { sw: 2.2, tf: `rotate(${a} ${x} ${y})` });
      const body = "M36 60 C36 46 46 38 56 40 C68 42 74 54 74 66 C74 80 64 88 54 88 C42 88 36 78 36 66 Z";
      const head = "M10 32 C10 22 18 15 30 15 C40 15 48 21 50 31 C52 41 46 49 36 49 L22 49 C14 49 10 43 10 32 Z";
      for (const [x1, y1, x2, y2] of [[34, 18, 42, 8], [41, 21, 51, 13]]) d.path(`M${x1 - 3} ${y1} L${x2} ${y2} L${x1 + 4} ${y1 + 2} Z`, d.fill(P.cream), { sw: 2.4 });
      union(d, [[tail, d.fill(g)], [body, d.fill(g)], [head, d.fill(g)]], 3.2);
      d.clip(body, (c) => {
        c.ellipse(46, 68, 10, 19, d.fill(P.gold), { stroke: OL, sw: 2.4 });
        c.stroke("M36 60 H56 M36 68 H56 M36 76 H56", { sw: 1.8, color: P.gold[2], op: 0.7 });
      });
      d.path(wing, d.fill(o, "d"), { sw: 3 });
      d.stroke("M62 51 L85 17 M64 53 L90 36 M66 55 L85 49", { sw: 2, color: o[2], op: 0.7 });
      tubes(d, ["M42 62 Q36 66 32 62"], g[1], 5, 2.4);
      d.path("M54 72 C54 64 66 62 70 70 C72 76 68 80 64 82 L66 86 C70 86 72 88 71 90 L52 90 C49 90 49 87 52 86 L56 85 C54 80 54 76 54 72 Z", d.fill(g, "h"), { sw: 3 });
      d.eye(33, 28, 4.8);
      d.stroke("M27 21 Q33 18.5 39 21", { sw: 2.4 });
      d.circle(15, 29, 1.4, OL, { stroke: null });
      d.stroke("M12 39 Q24 44 38 40", { sw: 2.6 });
      d.path("M30 42.4 L31.6 45.6 L33.2 42 Z", "#fff", { sw: 1.3 });
      blush(d, 40, 37, 3.6, GREEN_BLUSH);
      d.shine(22, 21, 7, 3, 0.55, -15);
    },
  ],
  [
    "🦟",
    "mosquito",
    (d) => {
      const s = P.stone;
      d.g("translate(2 -1)", (d) => {
        d.shadow(48, 89, 34);
        tubes(d, ["M35 51 L29 64 L23 86", "M38 52 L49 68 L58 88", "M42 52 L64 64 L82 86"], s[2], 3, 2);
        d.path(leaf(40, 37, 42, -14, 0.25), wingFill(d), { sw: 2.4 });
        const abd = "M44 48 C56 46 76 50 86 58 C90 62 86 66 80 66 C68 66 52 60 44 56 Z";
        d.path(abd, d.fill(s), { sw: 3 });
        d.clip(abd, (c) => {
          for (const x of [57, 67, 77]) c.stroke(`M${x} 40 L${x - 4} 70`, { sw: 3.4, color: "#fff", op: 0.85 });
        });
        d.path(abd, "none", { sw: 3 });
        d.ellipse(37, 46, 11, 9.5, d.fill(s), { sw: 3 });
        d.path(leaf(40, 40, 38, 4, 0.25), wingFill(d), { sw: 2.4 });
        tubes(d, ["M16 46 L8 60"], s[2], 2.2, 1.8);
        d.circle(22, 40, 9.5, d.fill(s), { sw: 3 });
        d.stroke("M20 31 Q18 24 13 21 M25 31 Q26 24 23 18", { sw: 2 });
        eyeball(d, 21, 39, 5.4, -1, 0.4, 2);
        tubes(d, ["M32 53 L22 66 L14 88", "M36 54 L37 70 L31 89", "M40 54 L52 70 L62 89"], s[1], 3.2, 2);
        d.shine(33, 41, 4, 2, 0.55, -30);
      });
    },
  ],
  [
    "🦄",
    "unicorn",
    (d) => {
      const locks: [string, Ramp][] = [
        ["M50 20 C68 12 86 24 86 42 C78 36 68 34 58 37 Z", P.pink],
        ["M60 34 C78 32 91 48 89 64 C81 56 73 52 66 55 Z", P.violet],
        ["M67 52 C83 54 92 70 87 88 C81 78 75 72 70 72 Z", P.sky],
      ];
      for (const [p, r] of locks) d.path(p, d.fill(r), { sw: 3 });
      const head = "M14 58 C12 50 18 44 26 40 C30 30 38 22 50 22 C62 22 70 32 72 44 C74 58 76 75 78 91 L44 91 C44 82 42 74 36 68 C30 72 22 74 17 70 C13 66 13 62 14 58 Z";
      d.path(head, d.fill(P.white), { sw: 3.5 });
      d.clip(head, (c) => c.ellipse(15, 61, 12, 12, P.rose[0], { stroke: null }));
      d.path(head, "none", { sw: 3.5 });
      d.path(leaf(57, 27, 17, -76, 0.5), d.fill(P.white), { sw: 3 });
      d.path(leaf(57, 26, 10, -76, 0.38), P.rose[1], { stroke: null });
      const horn = "M34 27 L28 8 L45 22 Z";
      d.path(horn, d.fill(P.gold, "d"), { sw: 2.8 });
      d.clip(horn, (c) => c.stroke("M30 22 L40 17 M29 16.5 L36.5 13 M28 11 L32.5 9.5", { sw: 2, color: P.gold[2] }));
      d.path(horn, "none", { sw: 2.8 });
      d.path("M44 23 C38 30 40 37 47 41 C48 33 51 27 58 24 Z", d.fill(P.pink), { sw: 2.6 });
      d.eye(42, 45, 4.6);
      d.stroke("M45 41.5 L48.5 39 M46.5 44 L50 43", { sw: 1.8 });
      d.ellipse(15.5, 59, 2, 1.6, P.rose[2], { stroke: null });
      d.stroke("M17 67 Q21 69 25 67", { sw: 2.2 });
      blush(d, 31, 57, 4);
      d.shine(56, 36, 7, 3.5, 0.5, -40);
    },
  ],
  [
    "🪲",
    "beetle",
    (d) => {
      const t = P.teal;
      const side = (k: Pen) => {
        tubes(k, ["M36 35 L24 29 L19 20", "M30 54 L16 55 L10 63", "M32 71 L21 78 L19 87"], P.ink[1], 3.6, 2.2);
        k.stroke("M45 13.5 Q40 9 33.5 9.5", { sw: 2.5 });
        k.circle(33.5, 9.8, 2.6, P.ink[1], { sw: 1.8 });
      };
      side(d);
      d.mirror(50, side);
      d.ellipse(50, 19, 11.5, 9.5, d.fill(P.ink), { sw: 3 });
      d.path("M30 36.5 C30 28.5 40 25 50 25 C60 25 70 28.5 70 36.5 C70 42.5 62 45 50 45 C38 45 30 42.5 30 36.5 Z", d.fill(t), { sw: 3 });
      const shell = "M50 42 C67 42 79 52 79 65.5 C79 80 67 90 50 90 C33 90 21 80 21 65.5 C21 52 33 42 50 42 Z";
      d.path(shell, d.fill(t), { sw: 3.5 });
      d.clip(shell, (c) => {
        c.path("M14 79 Q50 95 86 79 L86 96 L14 96 Z", P.violet[1], { stroke: null, op: 0.35 });
        c.ellipse(64, 63, 4, 15, "#fff", { stroke: null, op: 0.3, tf: "rotate(-12 64 63)" });
      });
      d.stroke("M50 43 V89", { sw: 2.8 });
      d.path(shell, "none", { sw: 3.5 });
      d.circle(44.5, 18, 3.4, "#fff", { sw: 1.6 });
      d.circle(55.5, 18, 3.4, "#fff", { sw: 1.6 });
      d.circle(44.8, 18.6, 1.8, OL, { stroke: null });
      d.circle(55.2, 18.6, 1.8, OL, { stroke: null });
      d.shine(36, 55, 4.5, 11, 0.6, 12);
    },
  ],
  [
    "🦪",
    "oyster",
    (d) => {
      const nacre = (k: Pen) => k.lin([[0, P.rose[0]], [0.5, P.violet[0]], [1, P.sky[0]]], 0, 0, 1, 1);
      d.shadow(50, 89, 38);
      d.g("rotate(-10 50 34)", (g) => {
        g.path(lumpy(50, 32, 37, 19, 12, 0.05, 4), g.fill(P.stone), { sw: 3.2 });
        g.path(lumpy(50, 34, 30, 13, 10, 0.05, 5), nacre(g), { sw: 2.2 });
      });
      const cup = "M10 64 C10 56 28 50 50 50 C72 50 90 56 90 64 C90 78 72 89 50 89 C28 89 10 78 10 64 Z";
      d.path(cup, d.fill(P.stone), { sw: 3.5 });
      d.clip(cup, (c) => c.stroke("M14 72 Q50 86 86 72 M18 79 Q50 92 82 79", { sw: 2.2, color: P.stone[2], op: 0.6 }));
      d.path(cup, "none", { sw: 3.5 });
      d.ellipse(50, 63, 34, 10.5, nacre(d), { sw: 2.4 });
      d.glow(50, 56, 18, "#ffffff", 0.95);
      d.ball(50, 56, 10.5, P.white, { sw: 2.8 });
      d.shine(30, 24, 8, 3, 0.5, -20);
    },
  ],
  [
    "🦞",
    "lobster",
    (d) => {
      const r = P.red;
      const side = (k: Pen) => {
        k.stroke("M46 28 Q41 16 36 9", { sw: 2.4 });
        tubes(k, ["M41 50 L31 54 L27 60", "M41 56 L31 62 L28 68", "M42 62 L33 69 L31 75"], r[1], 3.4, 2.2);
        tubes(k, ["M42 39 Q32 38 27 31"], r[1], 6, 2.6);
        k.path("M27 33 C18 35 10 29 10 21 C10 15 13 11 17 9 C17 14 19 18 23 19 C25 15 27 12 30 11 C33 16 33 25 30 30 C29 32 28 33 27 33 Z", k.fill(r), { sw: 3 });
      };
      side(d);
      d.mirror(50, side);
      d.path("M50 80 L39 90 Q50 93 61 90 Z", d.fill(r, "v"), { sw: 2.6 });
      d.path("M50 80 L32 87 Q34 92 40 91 Z M50 80 L68 87 Q66 92 60 91 Z", d.fill(r, "v"), { sw: 2.6 });
      for (const [y, w] of [[56, 22], [62.5, 20], [69, 17], [75.5, 14]]) d.path(rr(50 - w / 2, y, w, 8, 4), d.fill(r, "h"), { sw: 2.6 });
      tubes(d, ["M45 27 L44 22", "M55 27 L56 22"], r[1], 3.4, 2);
      d.path("M50 26 C60 26 64 36 64 46 C64 56 58 61 50 61 C42 61 36 56 36 46 C36 36 40 26 50 26 Z", d.fill(r), { sw: 3.5 });
      eyeball(d, 44, 21, 4.6, 0, 0.5, 2.2);
      eyeball(d, 56, 21, 4.6, 0, 0.5, 2.2);
      d.smile(50, 45, 9, 2.4);
      blush(d, 41.5, 46, 3);
      blush(d, 58.5, 46, 3);
      d.shine(44, 34, 3, 6, 0.55, 20);
    },
  ],
  [
    "🦐",
    "shrimp",
    (d) => {
      const c = P.coral;
      d.g("translate(0 3)", (d) => {
        const line: Pt[] = [[30, 46], [44, 30], [63, 26], [78, 36], [84, 54], [76, 70], [60, 76]];
        d.stroke("M19 40 Q21 15 52 8", { sw: 2.2 });
        d.stroke("M22 44 Q34 21 66 15", { sw: 2.2 });
        for (const [x, y, a] of [[48, 50, 100], [57, 46, 95], [65, 50, 120], [70, 59, 150]]) tubes(d, [`M${x} ${y} l${q(Math.cos((a * Math.PI) / 180) * 9)} ${q(Math.sin((a * Math.PI) / 180) * 9)}`], c[1], 3, 2);
        d.path(leaf(61, 76, 15, 150, 0.6), d.fill(c, "d"), { sw: 2.6 });
        d.path(leaf(61, 76, 15, 200, 0.6), d.fill(c, "d"), { sw: 2.6 });
        const body = ribbon(line, 28, 9, 1);
        d.path(body, d.fill(c), { sw: 3.2 });
        d.clip(body, (k) => {
          const s = along(line);
          for (let i = 12; i < s.length - 4; i += 8) {
            const [x, y] = s[i];
            const [x2, y2] = s[i + 1];
            const len = Math.hypot(x2 - x, y2 - y) || 1;
            k.stroke(`M${q(x - ((y2 - y) / len) * 16)} ${q(y + ((x2 - x) / len) * 16)} L${q(x + ((y2 - y) / len) * 16)} ${q(y - ((x2 - x) / len) * 16)}`, { sw: 3, color: "#fff", op: 0.6 });
          }
        });
        d.path(body, "none", { sw: 3.2 });
        d.path("M20 40 L8 37 L19 45 Z", d.fill(c), { sw: 2.4 });
        d.eye(29, 39, 4.6);
        d.smile(24, 49, 6.5, 2.2);
        blush(d, 33, 50, 3.2);
        d.shine(42, 33, 7, 3, 0.55, -40);
      });
    },
  ],
  [
    "🦠",
    "microbe",
    (d) => {
      const g = P.lime;
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2 + 0.1;
        const [c, s] = [Math.cos(a), Math.sin(a)];
        d.stroke(`M${q(50 + c * 30)} ${q(52 + s * 26)} Q${q(50 + c * 38 - s * 3)} ${q(52 + s * 34 + c * 3)} ${q(50 + c * 41)} ${q(52 + s * 37)}`, { sw: 2.6 });
      }
      const body = lumpy(50, 52, 33, 29, 8, 0.08, 3);
      d.path(body, d.fill(g), { sw: 3.5 });
      d.clip(body, (c) => {
        for (const [x, y, r] of [[30, 66, 3.4], [70, 40, 2.8], [60, 73, 2.4], [70, 66, 3], [44, 74, 1.8], [24, 46, 2]]) c.circle(x, y, r, P.lime[0], { stroke: P.lime[2], sw: 1.2, op: 0.9 });
      });
      d.eye(41, 48, 4.8);
      d.eye(59, 48, 4.8);
      d.smile(50, 58, 10, 2.6);
      blush(d, 33, 57, 4, GREEN_BLUSH);
      blush(d, 67, 57, 4, GREEN_BLUSH);
      d.shine(36, 33, 8, 3.6, 0.55, -30);
    },
  ],
  [
    "🦂",
    "scorpion",
    (d) => {
      const o = P.orange;
      d.shadow(50, 86, 40);
      tubes(d, ["M40 72 L37 80 L40 86", "M48 73 L48 81 L52 87", "M56 72 L59 80 L65 86", "M63 70 L69 78 L76 84"], o[2], 3.2, 2.2);
      tubes(d, ["M31 61 Q31 53 36 46"], o[2], 4.6, 2.4);
      d.path("M24 52 C18 50 14 44 15 38 C16 34 19 31 22 30 C22 34 24 37 27 38 C28 35 30 32 32 31 C35 35 35 42 32 47 Z", d.fill(deep(o)), { sw: 2.6, tf: "translate(10 -4)" });
      const beads: [number, number, number][] = [[68, 64, 9], [76, 55, 8.5], [80, 44, 8], [80, 33, 7.5], [75, 24, 7], [67, 20, 6.5]];
      for (const [x, y, r] of beads) d.circle(x, y, r, d.fill(o), { sw: 3 });
      d.path("M62 18 C56 18 53 23 55 30 C57 27 60 25 64 25 Z", d.fill(P.wood), { sw: 2.4 });
      d.path("M28 66 C28 58 40 54 52 54 C64 54 74 58 74 66 C74 72 64 76 52 76 C40 76 28 72 28 66 Z", d.fill(o), { sw: 3.2 });
      d.stroke("M44 55.5 Q42 66 44 75.5 M54 55 Q52 66 54 76 M64 56.5 Q62 66 64 75", { sw: 2, color: o[2], op: 0.6 });
      tubes(d, ["M24 66 Q16 62 14 52"], o[1], 5.5, 2.6);
      d.path("M14 54 C8 52 4 46 5 40 C6 36 9 33 12 32 C12 36 14 39 17 40 C18 37 20 34 22 33 C25 37 25 44 22 49 C20 52 17 54 14 54 Z", d.fill(o), { sw: 2.8, tf: "translate(3 0)" });
      d.ellipse(28, 64.5, 12, 11, d.fill(o), { sw: 3.2 });
      tubes(d, ["M34 72 L28 80 L22 86", "M42 74 L40 82 L34 88", "M50 75 L51 83 L48 89", "M58 74 L62 81 L61 88"], o[1], 3.4, 2.4);
      d.eye(24.5, 61.5, 4.4);
      d.smile(22.5, 69.5, 6.5, 2.2);
      blush(d, 31.5, 69, 3.2);
      d.shine(46, 59, 7, 2.6, 0.55, -10);
    },
  ],
  [
    "🐲",
    "dragon face",
    (d) => {
      const g = P.green;
      const side = (k: Pen) => {
        k.path("M33 26 C29 19 25 13 21 7 C29 9 37 15 42 22 Z", k.fill(P.cream), { sw: 2.8 });
        k.path("M21 40 L8 33 L13 44 L7 51 L15 54 L11 62 L23 58 Z", k.fill(P.orange, "h"), { sw: 2.6 });
      };
      side(d);
      d.mirror(50, side);
      for (const [x, y, s] of [[50, 14, 6.5], [42, 18, 4.5], [58, 18, 4.5]]) d.path(`M${x - s} ${y + 5} L${x} ${y - s} L${x + s} ${y + 5} Z`, d.fill(P.orange, "v"), { sw: 2.4 });
      const head = "M50 16 C70 16 82 30 82 48 C82 70 70 88 50 88 C30 88 18 70 18 48 C18 30 30 16 50 16 Z";
      d.path(head, d.fill(g), { sw: 3.5 });
      d.ellipse(50, 70, 23, 15, d.fill(P.lime), { sw: 2.8 });
      d.ellipse(43, 66, 2.6, 2, OL, { stroke: null });
      d.ellipse(57, 66, 2.6, 2, OL, { stroke: null });
      d.path("M42.5 77.5 L44 81.5 L45.8 78.4 Z M57.5 77.5 L56 81.5 L54.2 78.4 Z", "#fff", { sw: 1.4 });
      d.stroke("M39 76 Q50 84 61 76", { sw: 2.6 });
      eyeball(d, 37, 44, 8.6, 0.6, 1);
      eyeball(d, 63, 44, 8.6, -0.6, 1);
      d.stroke("M28 33 Q36 29 44 32 M56 32 Q64 29 72 33", { sw: 2.8 });
      blush(d, 27, 60, 4.5, GREEN_BLUSH);
      blush(d, 73, 60, 4.5, GREEN_BLUSH);
      d.shine(33, 25, 7, 3, 0.55, -25);
    },
  ],
];
