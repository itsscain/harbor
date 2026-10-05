// Toys, games, sports, music, art, parties and prizes.

import { OL, P, circlePath, curve, drop, leaf, lumpy, rr, smooth, softStar, sparklePath, star, type Pen, type Ramp } from "../pen";
import { CAST, MOODS, figure } from "../people";
import type { PicDef } from "..";

// ── Local helpers ────────────────────────────────────────────────────────────────────────────
type Pt = [number, number];
const f2 = (n: number) => Math.round(n * 100) / 100;

/** A polygon with rounded corners: one radius for every corner, or one per corner. */
function roundPoly(pts: Pt[], r: number | number[]) {
  const n = pts.length;
  let s = "";
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const ri = Array.isArray(r) ? r[i] : r;
    const d1 = Math.hypot(p0[0] - p1[0], p0[1] - p1[1]);
    const d2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const k1 = Math.min(ri, d1 / 2) / d1;
    const k2 = Math.min(ri, d2 / 2) / d2;
    const ax = p1[0] + (p0[0] - p1[0]) * k1;
    const ay = p1[1] + (p0[1] - p1[1]) * k1;
    const bx = p1[0] + (p2[0] - p1[0]) * k2;
    const by = p1[1] + (p2[1] - p1[1]) * k2;
    s += `${i ? "L" : "M"}${f2(ax)} ${f2(ay)} Q${f2(p1[0])} ${f2(p1[1])} ${f2(bx)} ${f2(by)} `;
  }
  return `${s}Z`;
}

/** Polished metal: light on the left, a bright band, a dark right edge (trophies, horns, medals). */
const metal = (d: Pen, r: Ramp, x2 = 1, y2 = 0.2) =>
  d.lin([[0, r[0]], [0.3, r[1]], [0.6, r[1]], [0.78, r[0]], [1, r[2]]], 0, 0, x2, y2);

/** A neck ribbon: two striped straps from the top edge meeting at (50, yb). */
function vRibbon(d: Pen, back: Ramp, front: Ramp, stripe: string, yb = 50) {
  const strap = (pts: Pt[], ramp: Ramp, mid: Pt[]) => {
    const p = roundPoly(pts, 1.5);
    d.path(p, d.fill(ramp, "v"), { sw: 2.8 });
    d.clip(p, (c) => c.poly(mid.flat(), stripe, { stroke: null }));
    d.path(p, "none", { sw: 2.8 });
  };
  strap([[17, 8], [35, 8], [59, yb], [41, yb]], back, [[24, 8], [28, 8], [52, yb], [48, yb]]);
  strap([[65, 8], [83, 8], [59, yb], [41, yb]], front, [[72, 8], [76, 8], [52, yb], [48, yb]]);
}

/** A gold medal: a bevelled disc with a clasp at the top; draw the emboss on top. */
function medalDisc(d: Pen, cx: number, cy: number, r: number) {
  d.path(rr(cx - 6, cy - r - 6, 12, 9, 2.5), metal(d, P.gold), { sw: 2.4 });
  d.circle(cx, cy, r, d.fill(P.gold, "d"), { sw: 3.5 });
  d.circle(cx, cy, r * 0.76, d.fill([P.gold[0], P.gold[1], "#f0b400"]), { sw: 2, stroke: P.gold[2] });
}

/** A little music note (♪). */
function note(d: Pen, x: number, y: number, s: number, ramp: Ramp) {
  d.tube(`M${x + s * 0.42} ${y} V${y - s * 1.6} Q${x + s * 1.2} ${y - s * 1.3} ${x + s * 1.05} ${y - s * 0.7}`, ramp[1], s * 0.22, 1.8);
  d.ellipse(x, y, s * 0.55, s * 0.42, d.fill(ramp), { sw: 2, tf: `rotate(-22 ${x} ${y})` });
}

export const PLAY: PicDef[] = [
  [
    "🏆",
    "trophy",
    (d) => {
      d.glow(50, 42, 48, "#fff1a0", 0.55);
      d.shadow(50, 92, 28);
      // Handles.
      const handle = "M27 21 C9 18 7 36 14 44 C19 50 27 52 33 52";
      d.tube(handle, P.gold[1], 5, 3);
      d.mirror(50, (m) => m.tube(handle, P.gold[1], 5, 3));
      // Stem, collar and base.
      d.path("M44 58 Q47 65 45 71 H55 Q53 65 56 58 Z", metal(d, P.gold), { sw: 2.8 });
      d.path(rr(37, 69, 26, 7, 2.5), metal(d, P.gold), { sw: 2.8 });
      d.path(rr(27, 75, 46, 15, 4), d.fill(P.brown, "v"), { sw: 3.2 });
      d.path(rr(39, 79, 22, 7, 2), metal(d, P.gold), { sw: 2 });
      // The cup.
      d.path("M21 16 C21 44 32 59 50 61 C68 59 79 44 79 16 Z", metal(d, P.gold), { sw: 3.5 });
      d.ellipse(50, 16, 29, 6.5, d.fill(P.gold, "v"), { sw: 3.2 });
      d.ellipse(50, 16.5, 23.5, 3.6, P.gold[2], { stroke: null });
      d.path(softStar(50, 37, 11, 5.6), "#fff6c4", { sw: 2, stroke: P.orange[2] });
      d.shine(31, 31, 3.6, 10, 0.75, 12);
      d.circle(33, 46, 1.8, "#fff", { stroke: null, op: 0.7 });
      d.sparkle(13, 15, 6.5);
      d.sparkle(88, 10, 4.5);
      d.sparkle(87, 62, 4);
    },
  ],
  [
    "⚽",
    "soccer ball",
    (d) => {
      d.shadow(50, 92, 32);
      const ball = circlePath(50, 50, 40);
      d.path(ball, d.fill(P.white), { sw: 3.5 });
      d.clip(ball, (c) => {
        const pent = (cx: number, cy: number, r: number, rot: number) => {
          const p: number[] = [];
          for (let i = 0; i < 5; i++) {
            const a = ((rot + i * 72 - 90) * Math.PI) / 180;
            p.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
          }
          c.poly(p, c.fill(P.black), { sw: 2 });
        };
        pent(50, 50, 13, 0);
        for (let i = 0; i < 5; i++) {
          const a = ((i * 72 - 90) * Math.PI) / 180;
          c.stroke(`M${50 + Math.cos(a) * 13} ${50 + Math.sin(a) * 13} L${50 + Math.cos(a) * 26} ${50 + Math.sin(a) * 26}`, { sw: 2.2 });
          pent(50 + Math.cos(a + 0.63) * 41, 50 + Math.sin(a + 0.63) * 41, 12, i * 72 + 36);
        }
      });
      d.shine(36, 32, 9, 5, 0.6, -35);
      void OL;
    },
  ],
  [
    "🧸",
    "teddy bear",
    (d) => {
      const fur = P.wood;
      d.shadow(50, 94, 30);
      for (const s of [-1, 1]) {
        d.ellipse(50 + s * 17, 84, 12, 9, d.fill(fur), { sw: 3 });
        d.ellipse(50 + s * 18, 86, 6, 4.5, P.tan[1], { sw: 2 });
      }
      d.ellipse(50, 66, 24, 21, d.fill(fur), { sw: 3.5 });
      d.ellipse(50, 70, 13, 11, P.tan[1], { stroke: null, op: 0.9 });
      for (const s of [-1, 1]) d.ellipse(50 + s * 25, 62, 8.5, 13, d.fill(fur), { sw: 3, tf: `rotate(${s * -30} ${50 + s * 25} 62)` });
      for (const s of [-1, 1]) {
        d.circle(50 + s * 18, 17, 9.5, d.fill(fur), { sw: 3 });
        d.circle(50 + s * 18, 17, 4.5, P.tan[1], { stroke: null });
      }
      d.circle(50, 34, 22, d.fill(fur), { sw: 3.5 });
      d.ellipse(50, 42, 10, 8, d.fill(P.tan), { sw: 2.5 });
      d.ellipse(50, 38.5, 4, 2.8, OL, { stroke: null });
      d.stroke("M50 41 V44 M46 45 Q50 48 54 45", { sw: 2 });
      d.eye(42, 31, 3.4);
      d.eye(58, 31, 3.4);
      d.path("M50 56 L40 51 Q37 56 40 61 Z M50 56 L60 51 Q63 56 60 61 Z", d.fill(P.pink), { sw: 2.4 });
      d.circle(50, 56, 3, P.pink[2], { sw: 2 });
      d.shine(40, 20, 6, 3, 0.4, -20);
      void rr;
    },
  ],
  [
    "👑",
    "crown",
    (d) => {
      d.glow(50, 50, 48, "#fff1a0", 0.45);
      d.shadow(50, 90, 34);
      const body = roundPoly([[19, 72], [15, 32], [33, 50], [50, 22], [67, 50], [85, 32], [81, 72]], [2, 3, 4, 3, 4, 3, 2]);
      d.path(body, d.fill(P.gold, "v"), { sw: 3.5 });
      d.stroke("M21 58 L33 50 L50 36 L67 50 L79 58", { sw: 2, color: P.gold[2], op: 0.55 });
      // Jewels on the points.
      d.ball(15, 30, 5.5, P.white, { sw: 2.5 });
      d.ball(85, 30, 5.5, P.white, { sw: 2.5 });
      d.ball(50, 19, 6, P.white, { sw: 2.5 });
      d.path(drop(50, 47, 5.2), d.fill(P.sky), { sw: 2.2 });
      d.circle(33, 58, 3.2, d.fill(P.green), { sw: 1.8 });
      d.circle(67, 58, 3.2, d.fill(P.green), { sw: 1.8 });
      // The band.
      d.path(rr(15, 64, 70, 20, 6), metal(d, P.gold, 1, 0.3), { sw: 3.5 });
      d.ellipse(50, 74, 7.5, 5.8, d.fill(P.red), { sw: 2.2 });
      d.ellipse(29, 74, 4.6, 4.6, d.fill(P.blue), { sw: 2 });
      d.ellipse(71, 74, 4.6, 4.6, d.fill(P.blue), { sw: 2 });
      d.circle(48, 72, 1.6, "#fff", { stroke: null, op: 0.8 });
      d.shine(24, 47, 3, 8, 0.6, 10);
      d.shine(26, 68, 6, 2, 0.6, 0);
      d.sparkle(88, 12, 5);
      d.sparkle(12, 12, 3.5);
    },
  ],
  [
    "🎁",
    "gift",
    (d) => {
      d.shadow(50, 92, 36);
      // Box with its ribbon.
      d.path(rr(18, 46, 64, 44, 4), d.fill(P.red, "v"), { sw: 3.5 });
      d.rect(20, 48, 60, 5, 0, P.red[2], { stroke: null, op: 0.45 });
      d.rect(43, 47, 14, 42, 0, d.fill(P.gold, "h"), { sw: 2.5 });
      // Lid.
      d.path(rr(12, 32, 76, 17, 4), d.fill(P.red, "v"), { sw: 3.5 });
      d.rect(42, 32, 16, 17, 0, d.fill(P.gold, "h"), { sw: 2.5 });
      // Bow.
      const loop = "M50 32 C44 20 26 11 20 19 C14 28 34 33 50 32 Z";
      d.path(loop, d.fill(P.gold), { sw: 3 });
      d.mirror(50, (m) => m.path(loop, m.fill(P.gold), { sw: 3 }));
      d.path("M45 30 C40 24 30 19 27 22 C25 25 35 29 45 30 Z", P.gold[2], { stroke: null, op: 0.55 });
      d.path("M55 30 C60 24 70 19 73 22 C75 25 65 29 55 30 Z", P.gold[2], { stroke: null, op: 0.55 });
      d.path(rr(44, 26, 12, 10, 4), d.fill(P.gold), { sw: 2.6 });
      d.shine(22, 37, 6, 2, 0.6, 0);
      d.shine(25, 60, 3, 9, 0.35, 0);
      d.sparkle(88, 18, 5);
      d.sparkle(11, 22, 3.6);
    },
  ],
  [
    "🎈",
    "balloon",
    (d) => {
      const b = "M50 7 C71 7 83 23 83 41 C83 60 65 73 50 75 C35 73 17 60 17 41 C17 23 29 7 50 7 Z";
      d.stroke("M50 80 Q44 84 49 87.5 Q54 91 49 94", { sw: 2.2 });
      d.path("M44.5 81 L50 74 L55.5 81 Q50 83.5 44.5 81 Z", d.fill(P.red, "v"), { sw: 2.5 });
      d.path(b, d.fill(P.red), { sw: 3.5 });
      d.clip(b, (c) => c.stroke("M77 52 Q70 66 54 71", { sw: 4, color: P.red[0], op: 0.45 }));
      d.shine(33, 26, 6.5, 12, 0.75, 32);
      d.circle(28, 44, 2.6, "#fff", { stroke: null, op: 0.65 });
    },
  ],
  [
    "🎉",
    "party popper",
    (d) => {
      // Streamers and confetti bursting out.
      d.tube("M47 50 C46 36 56 33 55 24 C54 16 60 11 66 13", P.pink[1], 3.6, 2.2);
      d.tube("M51 55 C62 50 66 58 75 54 C83 50 82 42 89 41", P.sky[1], 3.6, 2.2);
      d.tube("M50 52 C58 42 66 44 70 34 C73 27 80 26 82 20", P.lime[1], 3.6, 2.2);
      const bits: [number, number, number, Ramp][] = [[38, 30, 20, P.gold], [70, 12, -30, P.violet], [88, 30, 15, P.coral], [84, 64, -20, P.gold], [62, 30, 40, P.sky], [74, 72, 30, P.pink]];
      for (const [x, y, rot, c] of bits) d.path(rr(x - 3.5, y - 2.2, 7, 4.4, 1.4), d.fill(c), { sw: 1.8, tf: `rotate(${rot} ${x} ${y})` });
      for (const [x, y, c] of [[46, 18, P.red], [88, 52, P.violet], [66, 60, P.gold]] as [number, number, Ramp][]) d.circle(x, y, 2.6, d.fill(c), { sw: 1.6 });
      d.sparkle(30, 16, 4.5);
      // The cone.
      const cone = "M13 89 L35.4 45.4 A15 5.5 45 0 0 56.6 66.6 Z";
      d.path(cone, d.fill(P.gold, "d"), { sw: 3.5 });
      d.clip(cone, (c) => {
        for (const t of [0.28, 0.55, 0.82]) {
          const x = 13 + (46 - 13) * t;
          const y = 89 + (56 - 89) * t;
          c.line(x - 16, y - 16, x + 16, y + 16, { sw: 6.5, color: P.pink[1] });
        }
      });
      d.path(cone, "none", { sw: 3.5 });
      d.ellipse(46, 56, 15, 5.5, d.fill(P.violet), { sw: 3, tf: "rotate(45 46 56)" });
      d.ellipse(46.6, 55.4, 10.5, 3, P.violet[2], { stroke: null, tf: "rotate(45 46.6 55.4)" });
      d.shine(24, 64, 2.5, 9, 0.55, 26);
    },
  ],
  [
    "🎨",
    "paint palette",
    (d) => {
      d.shadow(52, 90, 36);
      const outer = smooth([[14, 42], [28, 22], [52, 14], [76, 18], [91, 34], [92, 56], [81, 75], [60, 86], [38, 86], [22, 79], [30, 68], [20, 60]], 0.18);
      d.path(`${outer} ${circlePath(37, 70, 5.5)}`, d.fill(P.wood), { sw: 3.5 });
      d.shine(26, 34, 7, 3.5, 0.5, -35);
      const blobs: [number, number, Ramp, number][] = [[31, 39, P.red, 1], [51, 29, P.gold, 2], [71, 32, P.green, 3], [80, 52, P.blue, 4], [68, 70, P.violet, 5], [52, 60, P.white, 6]];
      for (const [x, y, c, s] of blobs) {
        d.path(lumpy(x, y, 8, 7, 7, 0.1, s), d.fill(c), { sw: 2.4 });
        d.circle(x - 3, y - 2.5, 1.8, "#fff", { stroke: null, op: 0.75 });
      }
    },
  ],
  [
    "🧩",
    "puzzle piece",
    (d) => {
      const piece =
        "M18 30 H37 C39.5 30 40 28 38.6 26.1 A9 9 0 1 1 49.4 26.1 C48 28 48.5 30 51 30 H70 " +
        "V49 C70 51.5 72 52 73.9 50.6 A9 9 0 1 1 73.9 61.4 C72 60 70 60.5 70 63 V82 " +
        "H51 C48.5 82 48 80 49.4 78.1 A9 9 0 1 0 38.6 78.1 C40 80 39.5 82 37 82 H18 " +
        "V63 C18 60.5 20 60 21.9 61.4 A9 9 0 1 0 21.9 50.6 C20 52 18 51.5 18 49 Z";
      d.g("translate(-4 4)", (g) => {
        g.shadow(54, 88, 30);
        g.path(piece, g.fill(P.green), { sw: 3.5 });
        g.clip(piece, (c) => c.path(piece, "none", { sw: 5, stroke: P.green[0], op: 0.5, tf: "translate(2.5 2.5)" }));
        g.path(piece, "none", { sw: 3.5 });
        g.shine(29, 38, 7, 3.5, 0.55, -30);
      });
    },
  ],
  [
    "🪁",
    "kite",
    (d) => {
      d.g("rotate(-14 44 40)", (g) => {
        const T: Pt = [44, 8];
        const L: Pt = [16, 33];
        const R: Pt = [72, 33];
        const B: Pt = [44, 70];
        const C: Pt = [44, 33];
        const tri = (a: Pt, b: Pt, ramp: Ramp) => g.poly([a[0], a[1], b[0], b[1], C[0], C[1]], g.fill(ramp), { stroke: null });
        tri(T, L, P.red);
        tri(T, R, P.gold);
        tri(L, B, P.gold);
        tri(R, B, P.red);
        g.poly([...T, ...R, ...B, ...L], "none", { sw: 3.5 });
        g.stroke(`M${T[0]} ${T[1] + 2} L${B[0]} ${B[1] - 2} M${L[0] + 2} ${L[1]} L${R[0] - 2} ${R[1]}`, { sw: 2.2, color: P.wood[2] });
        g.shine(34, 22, 3, 7, 0.6, 50);
      });
      const tail = curve([[52, 66], [56, 76], [50, 84], [60, 90], [74, 88], [86, 80]], 0.25);
      d.stroke(tail, { sw: 2.8 });
      const bow = (x: number, y: number, rot: number, c: Ramp) =>
        d.path(`M${x} ${y} L${x - 7.5} ${y - 5.5} Q${x - 9} ${y} ${x - 7.5} ${y + 5.5} Z M${x} ${y} L${x + 7.5} ${y - 5.5} Q${x + 9} ${y} ${x + 7.5} ${y + 5.5} Z`, d.fill(c), { sw: 2.2, tf: `rotate(${rot} ${x} ${y})` });
      bow(54.5, 77, 62, P.sky);
      bow(62, 89.5, 14, P.violet);
      bow(80, 85, -35, P.lime);
    },
  ],
  [
    "🖍️",
    "crayon",
    (d) => {
      d.g("rotate(-38 50 50)", (g) => {
        g.path("M72 42 L88.5 47.6 Q92 50 88.5 52.4 L72 58 Z", g.fill(P.blue, "v"), { sw: 3 });
        g.path(rr(10, 41, 66, 18, 4), g.fill(P.blue, "v"), { sw: 3.5 });
        g.path(rr(22, 39.5, 44, 21, 2.5), g.fill([P.sky[0], P.blue[0], P.blue[1]], "v"), { sw: 3 });
        g.rect(26, 41, 3.5, 18, 0, P.blue[2], { stroke: null });
        g.rect(58.5, 41, 3.5, 18, 0, P.blue[2], { stroke: null });
        g.stroke("M33 50 Q36 45 39 50 T45 50 T51 50 T57 50", { sw: 2.4, color: P.blue[2] });
        g.shine(30, 44, 14, 1.6, 0.7, 0);
      });
    },
  ],
  [
    "🎭",
    "theater masks",
    (d) => {
      const mask = "M-17 -16 Q0 -23 17 -16 Q21 0 14.5 12 Q8 21 0 22 Q-8 21 -14.5 12 Q-21 0 -17 -16 Z";
      // Sad mask behind.
      d.g("translate(63 38) rotate(14) scale(1.12)", (g) => {
        g.path(mask, g.fill(P.sky), { sw: 3 });
        g.shine(-11, -15.5, 4.5, 1.8, 0.6, -12);
        g.path("M-12 -4 Q-7 -1 -3 -5 Q-7 -8 -12 -4 Z M12 -4 Q7 -1 3 -5 Q7 -8 12 -4 Z", OL, { sw: 1.5 });
        g.stroke("M-13 -9 L-4 -12.5 M13 -9 L4 -12.5", { sw: 2.2 });
        g.path("M-8 13 Q0 4 8 13 Q0 9 -8 13 Z", OL, { sw: 2 });
        g.path(drop(-8, 6, 2.2), "#fff", { sw: 1.4 });
      });
      // Happy mask in front.
      d.g("translate(38 60) rotate(-12) scale(1.12)", (g) => {
        g.path(mask, g.fill(P.gold), { sw: 3 });
        g.shine(-11, -15.5, 4.5, 1.8, 0.65, -12);
        g.path("M-12 -3 Q-7.5 -10 -3 -3 Q-7.5 -6 -12 -3 Z M12 -3 Q7.5 -10 3 -3 Q7.5 -6 12 -3 Z", OL, { sw: 1.6 });
        g.stroke("M-13 -11 Q-8 -14 -3 -12 M13 -11 Q8 -14 3 -12", { sw: 2.2 });
        g.path("M-10 4 Q0 18 10 4 Q0 8 -10 4 Z", OL, { sw: 2 });
        g.cheek(-11, 5, 3.2);
        g.cheek(11, 5, 3.2);
      });
    },
  ],
  [
    "🎮",
    "game controller",
    (d) => {
      d.shadow(50, 86, 38);
      const pad = "M28 24 H72 C86 24 92 36 92 50 C92 64 88 77 79 77 C71 77 68 67 62 62 H38 C32 67 29 77 21 77 C12 77 8 64 8 50 C8 36 14 24 28 24 Z";
      d.path(pad, d.fill(P.violet), { sw: 3.5 });
      d.shine(24, 31, 8, 3, 0.5, -10);
      d.path(roundPoly([[24, 35], [30, 35], [30, 41], [36, 41], [36, 47], [30, 47], [30, 53], [24, 53], [24, 47], [18, 47], [18, 41], [24, 41]], 1.6), d.fill(P.ink, "v"), { sw: 2.2 });
      const btn: [number, number, Ramp][] = [[73, 35.5, P.green], [81.5, 44, P.red], [73, 52.5, P.gold], [64.5, 44, P.sky]];
      for (const [x, y, c] of btn) d.ball(x, y, 4.4, c, { sw: 2 });
      d.path(rr(40, 37, 8, 4, 2), P.violet[2], { sw: 1.6 });
      d.path(rr(52, 37, 8, 4, 2), P.violet[2], { sw: 1.6 });
      for (const x of [40, 60]) {
        d.circle(x, 53, 5.2, d.fill(P.ink), { sw: 2 });
        d.circle(x - 1, 52, 2.4, P.ink[0], { stroke: null });
      }
    },
  ],
  [
    "🎣",
    "fishing pole",
    (d) => {
      // Line down to the fish.
      d.stroke("M86 10 Q85 28 70 40", { sw: 2 });
      // Rod, reel and cork handle.
      d.tube("M20 81 Q46 44 86 10", P.blue[1], 4.2, 2.6);
      d.tube("M11 92 L22 79", P.wood[0], 8, 2.8);
      d.stroke("M14 89 L19 83", { sw: 1.6, color: P.wood[2] });
      d.circle(30, 77, 7.5, d.fill(P.silver), { sw: 2.6 });
      d.circle(30, 77, 2.6, P.steel[2], { stroke: null });
      d.tube("M30 77 L38 82", P.steel[1], 2.2, 2);
      // The fish, hooked and wiggling.
      d.g("translate(74 60) rotate(78) scale(1.15)", (g) => {
        g.path("M10 0 C14 -4 18 -10 23 -11 Q20 0 23 11 C18 10 14 4 10 0 Z", g.fill(P.orange, "v"), { sw: 2.4 });
        g.path("M-18 0 C-14 -11 4 -13 13 0 C4 13 -14 11 -18 0 Z", g.fill(P.orange), { sw: 2.7 });
        g.path("M-4 -9 Q2 -16 9 -7 Z", g.fill(P.orange, "v"), { sw: 2 });
        g.stroke("M-1 -8 Q3 -2 -1 7", { sw: 1.6, color: P.orange[2] });
        g.eye(-10, -2.5, 2.6);
        g.shine(-5, -6, 4, 1.5, 0.6, -10);
      });
    },
  ],
  [
    "🎲",
    "die",
    (d) => {
      const c = 50;
      const s = 38;
      const k = s * Math.cos(Math.PI / 6);
      const T: Pt = [c, 52 - s];
      const R: Pt = [c + k, 52 - s / 2];
      const C: Pt = [c, 52];
      const L: Pt = [c - k, 52 - s / 2];
      const B: Pt = [c, 52 + s];
      const BR: Pt = [c + k, 52 + s / 2];
      const BL: Pt = [c - k, 52 + s / 2];
      d.shadow(50, 91, 30);
      const hex = roundPoly([T, R, BR, B, BL, L], 7);
      d.path(hex, "#ffffff", { sw: 3.5 });
      d.clip(hex, (g) => {
        g.poly([...T, ...R, ...C, ...L], d.fill(P.white), { stroke: null });
        g.poly([...L, ...C, ...B, ...BL], d.lin([[0, "#f4f7fb"], [1, "#dfe6ef"]]), { stroke: null });
        g.poly([...C, ...R, ...BR, ...B], d.lin([[0, "#dbe3ec"], [1, "#b9c4d2"]]), { stroke: null });
      });
      d.stroke(`M${L[0] + 1} ${L[1] + 0.6} L${C[0]} ${C[1]} L${R[0] - 1} ${R[1] + 0.6} M${C[0]} ${C[1]} L${B[0]} ${B[1] - 1}`, { sw: 2.4 });
      d.path(hex, "none", { sw: 3.5 });
      const face = (o: Pt, e1: Pt, e2: Pt, dots: Pt[], r: number, color: string) =>
        d.g(`matrix(${f2(e1[0])} ${f2(e1[1])} ${f2(e2[0])} ${f2(e2[1])} ${f2(o[0])} ${f2(o[1])})`, (g) => {
          for (const [u, v] of dots) g.circle(u, v, r, color, { stroke: null });
        });
      const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
      face(T, sub(R, T), sub(L, T), [[0.5, 0.5]], 0.15, P.red[1]);
      face(L, sub(C, L), sub(BL, L), [[0.24, 0.24], [0.76, 0.24], [0.5, 0.5], [0.24, 0.76], [0.76, 0.76]], 0.095, OL);
      face(C, sub(R, C), sub(B, C), [[0.24, 0.24], [0.5, 0.5], [0.76, 0.76]], 0.095, OL);
      d.shine(36, 29, 7, 2.2, 0.75, -30);
    },
  ],
  [
    "🥁",
    "drum",
    (d) => {
      d.shadow(50, 91, 38);
      const cx = 50;
      const rx = 37;
      const ry = 11;
      const top = 40;
      const bot = 74;
      const front = (y: number) => `A${rx} ${ry} 0 0 0 ${cx + rx} ${y}`;
      const back = (y: number) => `A${rx} ${ry} 0 0 1 ${cx - rx} ${y}`;
      const shell = `M${cx - rx} ${top} V${bot} ${front(bot)} V${top} Z`;
      d.path(shell, d.lin([[0, P.red[0]], [0.22, P.red[1]], [0.7, P.red[1]], [1, P.red[2]]], 0, 0, 1, 0), { sw: 3.5 });
      // Zigzag cords between the rims.
      const yAt = (x: number, base: number) => base + ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2));
      const zz: string[] = [];
      for (let i = 0; i <= 6; i++) {
        const x = cx - rx + 4 + ((rx * 2 - 8) * i) / 6;
        zz.push(`${i ? "L" : "M"}${f2(x)} ${f2(i % 2 ? yAt(x, bot) - 7 : yAt(x, top) + 7)}`);
      }
      d.tube(zz.join(" "), "#ffffff", 2.6, 1.6);
      // Gold rims.
      d.path(`M${cx - rx} ${bot - 6} ${front(bot - 6)} V${bot} ${back(bot)} Z`, d.fill(P.gold, "v"), { sw: 3 });
      d.path(`M${cx - rx} ${top} ${front(top)} V${top + 6} ${back(top + 6)} Z`, d.fill(P.gold, "v"), { sw: 3 });
      d.ellipse(cx, top, rx, ry, d.fill(P.cream), { sw: 3.5 });
      d.shine(24, 54, 3, 7, 0.45, 0);
      // Sticks.
      for (const [x1, y1, x2, y2] of [[18, 12, 56, 35], [84, 10, 44, 34]]) {
        d.tube(`M${x1} ${y1} L${x2} ${y2}`, P.wood[0], 4.5, 2.5);
        d.circle(x2, y2, 4, d.fill(P.wood), { sw: 2.5 });
      }
    },
  ],
  [
    "🏀",
    "basketball",
    (d) => {
      d.shadow(50, 92, 32);
      const ball = circlePath(50, 50, 40);
      d.path(ball, d.fill(P.orange), { sw: 3.5 });
      d.clip(ball, (c) =>
        c.g("rotate(-22 50 50)", (g) => {
          g.stroke("M50 6 V94 M6 50 H94", { sw: 2.8 });
          g.stroke("M21 14 Q40 50 21 86 M79 14 Q60 50 79 86", { sw: 2.8 });
        }),
      );
      d.path(ball, "none", { sw: 3.5 });
      d.shine(34, 29, 9, 5, 0.55, -35);
    },
  ],
  [
    "🔮",
    "crystal ball",
    (d) => {
      d.glow(50, 42, 48, "#d9c2ff", 0.75);
      d.shadow(50, 91, 30);
      // Stand.
      d.path("M30 71 Q50 65 70 71 L78 85 Q50 93 22 85 Z", d.fill(P.gold, "v"), { sw: 3.2 });
      d.stroke("M27 79 Q50 85 73 79", { sw: 2, color: P.gold[2] });
      // The glass ball.
      const orb = circlePath(50, 41, 32);
      d.path(orb, d.rad([[0, "#f6f0ff"], [0.45, P.violet[0]], [0.8, P.violet[1]], [1, P.violet[2]]], 0.38, 0.32, 0.8), { sw: 3.5 });
      d.clip(orb, (c) => {
        c.path("M14 52 Q30 38 48 48 Q64 58 86 42 L86 80 L14 80 Z", P.purple[1], { stroke: null, op: 0.35 });
        c.path("M14 60 Q34 50 50 58 Q68 66 86 54 L86 80 L14 80 Z", P.purple[2], { stroke: null, op: 0.25 });
        c.path(sparklePath(61, 36, 6.5), "#ffffff", { stroke: null, op: 0.95 });
        c.path(sparklePath(42, 55, 3.6), "#ffffff", { stroke: null, op: 0.85 });
        c.circle(68, 52, 1.8, "#ffffff", { stroke: null, op: 0.8 });
        c.circle(50, 26, 1.4, "#ffffff", { stroke: null, op: 0.7 });
      });
      d.path(orb, "none", { sw: 3.5 });
      d.shine(36, 27, 9, 5, 0.75, -35);
      d.sparkle(86, 14, 4.5);
      d.sparkle(13, 20, 3.5);
    },
  ],
  [
    "🎯",
    "bullseye",
    (d) => {
      const cx = 45;
      const cy = 53;
      d.circle(cx, cy, 37, d.fill(P.red), { sw: 3.5 });
      d.circle(cx, cy, 28.5, d.fill(P.white), { sw: 2.2 });
      d.circle(cx, cy, 20, d.fill(P.red), { sw: 2.2 });
      d.circle(cx, cy, 11.5, d.fill(P.white), { sw: 2.2 });
      d.circle(cx, cy, 5, P.red[1], { sw: 2 });
      d.shine(30, 30, 8, 4, 0.5, -38);
      // The dart, stuck dead center.
      d.g(`translate(${cx + 1} ${cy - 1}) rotate(-45)`, (g) => {
        g.tube("M2 0 L8 0", P.steel[1], 2.2, 1.8);
        g.path("M30 0 L40 -11 Q46 -12 49 -9 L44 0 L49 9 Q46 12 40 11 Z", g.fill(P.sky, "v"), { sw: 2.4 });
        g.tube("M20 0 L40 0", P.ink[1], 3, 2.2);
        g.path(rr(7, -4, 15, 8, 3.5), metal(g, P.gold, 0, 1), { sw: 2.4 });
        g.stroke("M12 -3.5 V3.5 M16 -3.5 V3.5", { sw: 1.5, color: P.gold[2] });
      });
    },
  ],
  [
    "⚾",
    "baseball",
    (d) => {
      d.shadow(50, 92, 32);
      const ball = circlePath(50, 50, 40);
      d.path(ball, d.fill(P.white), { sw: 3.5 });
      d.clip(ball, (c) =>
        c.g("rotate(-28 50 50)", (g) => {
          for (const s of [-1, 1]) {
            const p0: Pt = [50 + s * 25, 12];
            const p1: Pt = [50 + s * 7, 50];
            const p2: Pt = [50 + s * 25, 88];
            g.stroke(`M${p0[0]} ${p0[1]} Q${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]}`, { sw: 2.2, color: P.red[1] });
            for (let i = 1; i < 10; i++) {
              const t = i / 10;
              const x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0];
              const y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1];
              const tx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
              const ty = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
              const l = Math.hypot(tx, ty);
              const [ux, uy] = [tx / l, ty / l];
              const [nx, ny] = [-uy, ux];
              g.stroke(`M${f2(x - nx * 4 - ux * 1.6)} ${f2(y - ny * 4 - uy * 1.6)} L${f2(x)} ${f2(y)} L${f2(x + nx * 4 - ux * 1.6)} ${f2(y + ny * 4 - uy * 1.6)}`, { sw: 2, color: P.red[1] });
            }
          }
        }),
      );
      d.path(ball, "none", { sw: 3.5 });
      d.shine(35, 28, 9, 5, 0.6, -35);
    },
  ],
  [
    "🎠",
    "carousel horse",
    (d) => {
      d.shadow(58, 92, 22);
      // The pole, through the saddle.
      const px = 60;
      const pole = rr(px - 3.5, 9, 7, 83, 3.5);
      d.path(pole, d.fill(P.gold, "h"), { sw: 2.6 });
      d.clip(pole, (c) => {
        for (let y = 0; y < 100; y += 9) c.line(px - 6, y + 6, px + 6, y, { sw: 3.2, color: P.red[1] });
      });
      d.path(pole, "none", { sw: 2.6 });
      d.circle(px, 10, 5, d.fill(P.gold), { sw: 2.4 });
      const W = P.white;
      const hoof = (x: number, y: number, rot: number) => d.ellipse(x, y, 4.2, 3.2, d.fill(P.gold), { sw: 2.2, tf: `rotate(${rot} ${x} ${y})` });
      // Far legs (in shade), tail, near legs — all tucked under the body.
      d.tube("M52 60 L44 69 L48 78", P.grey[1], 6, 2.6);
      hoof(48.5, 80, 10);
      d.tube("M70 60 L72 72 L68 80", P.grey[1], 6, 2.6);
      hoof(68, 82, -5);
      d.path("M77 44 C91 40 95 58 89 72 C87 62 83 56 76 54 Z", d.fill(P.violet), { sw: 2.6 });
      d.tube("M72 58 L81 66 L88 63", W[1], 6.5, 2.8);
      hoof(89.5, 62.5, -70);
      d.tube("M44 59 L34 65 L38 75", W[1], 6.5, 2.8);
      hoof(38.5, 77.5, 10);
      // Body and neck in one piece.
      const body = smooth([[38, 57], [33, 46], [30, 35], [32, 25], [39, 20], [46, 26], [50, 35], [55, 41], [65, 39], [75, 40], [81, 47], [81, 56], [75, 63], [62, 65], [50, 64], [42, 62]], 0.2);
      d.path(body, d.fill(W), { sw: 3 });
      // Mane along the crest, and the forelock.
      d.path("M39 17 Q47 15 47 23 Q54 24 51 32 Q58 34 54 41 Q58 45 53 46 L49 40 Q45 30 37 23 Z", d.fill(P.pink), { sw: 2.4 });
      // Head.
      const head = "M39 19 C33 14 25 16 20 23 C16 28 11 31 10 36 C9 41 15 44 20 41 C25 38 30 38 34 35 C40 31 43 23 39 19 Z";
      d.path(head, d.fill(W), { sw: 3 });
      d.clip(head, (c) => c.circle(12, 38, 6.5, P.rose[1], { stroke: null, op: 0.75 }));
      d.path(head, "none", { sw: 3 });
      d.path("M33 18 L32 8 L39 15 Z", d.fill(W), { sw: 2.4 });
      d.path(lumpy(31, 17, 4.5, 3.6, 6, 0.18, 4), d.fill(P.pink), { sw: 2 });
      d.eye(27, 25, 2.5);
      d.circle(12.5, 36, 1.2, OL, { stroke: null });
      d.stroke("M14 41 Q17 42 19 40", { sw: 1.6 });
      // Bridle: noseband, cheek strap and a rosette.
      d.stroke("M20 28 Q17 34 21 40.5 M20.5 33 L31 30.5 L37 20", { sw: 2.2, color: P.red[1] });
      d.circle(31, 30.5, 2.6, d.fill(P.gold), { sw: 1.6 });
      // Saddle with its stirrup.
      d.tube(`M${px - 2} 52 L${px - 3} 60`, P.ink[1], 1.4, 1.5);
      d.path(rr(px - 6.5, 59, 7, 4.5, 1.8), d.fill(P.gold), { sw: 1.8 });
      d.path("M48 43 Q60 36 72 43 L70 51 Q60 55 50 51 Z", d.fill(P.red), { sw: 2.6 });
      d.path("M52 41 Q59 35 67 40 L65 44 Q59 41 54 45 Z", d.fill(P.gold), { sw: 2 });
      d.shine(42, 49, 2.2, 6, 0.55, 20);
    },
  ],
  [
    "🛷",
    "sled",
    (d) => {
      d.shadow(50, 88, 40);
      const runner = "M76 80 H29 Q11 80 11 63 Q11 50 21 50 Q29 50 28 58";
      const depth: Pt = [14, -15];
      // Far runner and struts.
      d.g(`translate(${depth[0]} ${depth[1]})`, (g) => {
        for (const x of [36, 54, 70]) g.tube(`M${x} 62 L${x} 79`, P.red[2], 3.4, 2.2);
        g.tube(runner, P.red[2], 5, 2.6);
      });
      // Deck: three slats seen from above, and the front edge.
      const slat = (a: number, b: number) => {
        const q = (x: number, k: number): Pt => [x + depth[0] * k, 62 + depth[1] * k];
        return roundPoly([q(23, a), q(75, a), q(75, b), q(23, b)], 2);
      };
      for (const [a, b] of [[0.7, 1], [0.36, 0.64], [0.02, 0.3]]) {
        d.path(slat(a, b), d.fill([P.tan[0], P.wood[0], P.wood[1]], "v"), { sw: 2.4 });
      }
      d.path(rr(22, 61, 54, 6, 2.5), d.fill(P.wood, "v"), { sw: 2.6 });
      // Near runner and struts.
      for (const x of [30, 50, 68]) d.tube(`M${x} 67 L${x} 79`, P.red[1], 3.4, 2.2);
      d.tube(runner, P.red[1], 5, 2.6);
      d.stroke("M17 57 Q19 53 23 52.5", { sw: 1.8, color: "#ffffff", op: 0.6 });
      // Rope.
      d.tube("M25 61 Q10 66 11 77 Q12 87 26 87", P.tan[1], 2.6, 1.6);
      d.shine(36, 59, 10, 1.2, 0.6, 0);
    },
  ],
  [
    "🎳",
    "bowling ball",
    (d) => {
      d.shadow(52, 90, 36);
      const pin = "M63 9 C69 9 72 14 72 20 C72 26 68 30 67.5 35 C67 42 78 50 78 62 C78 74 73 82 72 88 L54 88 C53 82 48 74 48 62 C48 50 59 42 58.5 35 C58 30 54 26 54 20 C54 14 57 9 63 9 Z";
      d.path(pin, d.fill(P.white), { sw: 3.2 });
      d.clip(pin, (c) => {
        c.path("M40 33 Q63 37 86 33 L86 37.5 Q63 41.5 40 37.5 Z", P.red[1], { stroke: null });
        c.path("M40 41 Q63 45 86 41 L86 45.5 Q63 49.5 40 45.5 Z", P.red[1], { stroke: null });
      });
      d.path(pin, "none", { sw: 3.2 });
      d.shine(58, 18, 2.4, 5, 0.6, 15);
      d.shine(55, 60, 2.6, 9, 0.5, 5);
      // The ball.
      d.circle(34, 67, 23, d.fill(P.blue), { sw: 3.5 });
      for (const [x, y, r] of [[27, 59, 3.4], [36.5, 57, 3.4], [33, 67.5, 3.8]]) {
        d.ellipse(x, y, r, r * 0.9, P.blue[2], { sw: 2 });
        d.ellipse(x, y + 0.6, r * 0.6, r * 0.5, OL, { stroke: null });
      }
      d.shine(23, 53, 6, 3, 0.55, -40);
    },
  ],
  [
    "🥅",
    "goal net",
    (d) => {
      d.shadow(50, 88, 44, 6);
      // The net: back panel grid and the side panels.
      d.path("M14 85 L22 34 L78 34 L86 85 Z", "#f4f7fb", { stroke: null, op: 0.9 });
      d.clip("M14 85 L22 34 L78 34 L86 85 Z", (c) => {
        for (let x = 18; x <= 84; x += 7) c.line(x, 30, x, 88, { sw: 1.5, color: P.steel[1] });
        for (let y = 36; y <= 86; y += 7) c.line(10, y, 90, y, { sw: 1.5, color: P.steel[1] });
      });
      d.stroke("M14 26 L22 34 L78 34 L86 26 M22 34 L14 85 M78 34 L86 85", { sw: 2, color: P.steel[2] });
      // Posts and crossbar.
      d.tube("M12 87 V24 H88 V87", "#ffffff", 6, 2.8);
      d.stroke("M10.5 70 V30 Q10.5 25.5 15 25.5", { sw: 1.5, color: P.white[2] });
    },
  ],
  [
    "🎺",
    "trumpet",
    (d) => {
      d.shadow(50, 86, 36);
      const g1 = P.gold[1];
      d.g("translate(49 55) rotate(-16) scale(1.02) translate(-50 -46)", (t) => {
        // Loop under the valves and the long lead pipe.
        t.tube("M38 46 Q24 46 24 57 Q24 68 36 68 H60 Q70 68 70 59 Q70 52 62 52", g1, 5, 2.6);
        t.tube("M12 46 H64", g1, 5, 2.6);
        t.path("M7 40 Q12 43 13 45 V47 Q12 49 7 52 Z", metal(t, P.gold, 0, 1), { sw: 2.4 });
        // Valves.
        for (const x of [38, 47, 56]) {
          t.path(rr(x - 3.5, 34, 7, 26, 2.5), metal(t, P.gold), { sw: 2.4 });
          t.tube(`M${x} 34 V27`, P.gold[2], 2, 1.8);
          t.path(rr(x - 4.5, 22, 9, 5, 2.5), t.fill(P.cream), { sw: 2.2 });
        }
        // The bell.
        t.path("M60 41 L70 41 Q81 39 90 26 L90 66 Q81 53 70 51 L60 51 Z", metal(t, P.gold, 0.6, 1), { sw: 3 });
        t.ellipse(90, 46, 4.5, 20, t.fill(P.gold, "h"), { sw: 3 });
        t.ellipse(91, 46, 2, 15, P.gold[2], { stroke: null });
        t.shine(77, 42, 7, 1.6, 0.7, -32);
        t.shine(26, 44.5, 9, 1.1, 0.7, 0);
      });
    },
  ],
  [
    "🧶",
    "yarn",
    (d) => {
      d.shadow(48, 88, 32);
      d.tube("M70 72 Q82 80 76 86 Q70 92 82 92 Q90 92 92 84", P.pink[1], 3.2, 2.2);
      const ball = circlePath(47, 47, 35);
      d.path(ball, d.fill(P.pink), { sw: 3.5 });
      d.clip(ball, (c) => {
        const wrap = (rot: number, n: number) =>
          c.g(`rotate(${rot} 47 47)`, (g) => {
            for (let i = 0; i < n; i++) {
              const y = 22 + i * 9;
              g.stroke(`M8 ${y} Q47 ${y - 14} 86 ${y}`, { sw: 2.2, color: P.pink[2] });
            }
          });
        wrap(-35, 6);
        wrap(48, 4);
      });
      d.path(ball, "none", { sw: 3.5 });
      d.shine(33, 28, 9, 4.5, 0.55, -38);
    },
  ],
  [
    "🃏",
    "playing card",
    (d) => {
      // A card face-down behind.
      d.g("rotate(-13 36 52)", (g) => {
        const back = rr(13, 18, 46, 66, 7);
        g.path(back, g.fill(P.red, "v"), { sw: 3 });
        g.path(rr(18, 23, 36, 56, 4), "none", { sw: 2, stroke: "#ffffff", op: 0.85 });
        g.clip(rr(18, 23, 36, 56, 4), (c) => {
          for (let k = -60; k < 80; k += 9) {
            c.line(18 + k, 23, 18 + k + 56, 79, { sw: 1.5, color: P.red[0], op: 0.8 });
            c.line(18 + k + 56, 23, 18 + k, 79, { sw: 1.5, color: P.red[0], op: 0.8 });
          }
        });
      });
      // The joker card in front.
      d.g("rotate(9 62 50)", (g) => {
        g.path(rr(37, 14, 50, 72, 7), g.fill(P.white), { sw: 3.5 });
        g.path(softStar(43.5, 21, 3.6, 1.7), g.fill(P.violet), { sw: 1.5 });
        g.path(softStar(80.5, 79, 3.6, 1.7), g.fill(P.violet), { sw: 1.5 });
        // Jester hat: three floppy points with bells.
        g.path("M51 46 C46 41 43 34 47 29 C51 33 55 38 57 44 Z", g.fill(P.red), { sw: 2.4 });
        g.path("M73 46 C78 41 81 34 77 29 C73 33 69 38 67 44 Z", g.fill(P.sky), { sw: 2.4 });
        g.path("M54 45 C54 36 58 29 62 23 C66 29 70 36 70 45 Z", g.fill(P.gold), { sw: 2.4 });
        for (const [x, y] of [[46.5, 28], [77.5, 28], [62, 22]]) g.circle(x, y, 2.8, g.fill(P.gold), { sw: 1.8 });
        // Face.
        g.circle(62, 57, 11, g.fill([P.tan[0], "#ffd9b8", "#e8b48a"]), { sw: 2.6 });
        g.path(rr(49, 43.5, 26, 6, 3), g.fill(P.violet), { sw: 2.2 });
        g.eye(58, 56, 1.9);
        g.eye(66, 56, 1.9);
        g.smile(62, 61, 7, 2);
        g.cheek(55.5, 60.5, 2.4);
        g.cheek(68.5, 60.5, 2.4);
        // Ruffled collar.
        g.path("M50 70 Q53 66 56 70 Q59 66 62 70 Q65 66 68 70 Q71 66 74 70 Q72 76 62 76 Q52 76 50 70 Z", g.fill(P.lime), { sw: 2.2 });
        g.shine(45, 34, 3, 9, 0.35, 0);
      });
    },
  ],
  [
    "🎆",
    "fireworks",
    (d) => {
      const sky = rr(8, 8, 84, 84, 18);
      d.path(sky, d.lin([[0, P.navy[1]], [1, P.navy[2]]]), { sw: 3.5 });
      d.clip(sky, (c) => {
        const burst = (cx: number, cy: number, r: number, n: number, col: string, dot: string) => {
          c.glow(cx, cy, r * 1.25, col, 0.5);
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 + 0.2;
            const [ca, sa] = [Math.cos(a), Math.sin(a)];
            c.line(cx + ca * r * 0.28, cy + sa * r * 0.28, cx + ca * r * 0.78, cy + sa * r * 0.78, { sw: r * 0.13, color: col });
            c.circle(cx + ca * r, cy + sa * r, r * 0.085, dot, { stroke: null });
          }
          c.circle(cx, cy, r * 0.12, "#ffffff", { stroke: null });
        };
        burst(42, 38, 25, 12, P.gold[1], "#fff6c4");
        burst(70, 64, 17, 10, P.pink[1], P.pink[0]);
        burst(28, 72, 11, 8, P.sky[1], P.sky[0]);
        c.stroke("M70 92 Q68 86 70 80", { sw: 2, color: P.pink[0], op: 0.6 });
        c.path(sparklePath(78, 24, 4), "#ffffff", { stroke: null });
        c.path(sparklePath(18, 22, 2.6), "#ffffff", { stroke: null });
        c.path(sparklePath(52, 82, 2.4), "#ffffff", { stroke: null });
      });
      d.path(sky, "none", { sw: 3.5 });
    },
  ],
  [
    "🖌️",
    "paintbrush",
    (d) => {
      // A fresh stroke of paint.
      d.path("M10 86 C22 72 40 92 56 80 C60 77 64 80 60 84 C44 96 24 82 14 92 C10 95 6 90 10 86 Z", d.fill(P.sky), { sw: 2.8 });
      d.g("translate(56 44) rotate(-45)", (g) => {
        // Handle.
        g.path("M2 -6 L40 -4.5 Q46 -4 46 0 Q46 4 40 4.5 L2 6 Z", g.fill(P.red, "v"), { sw: 3 });
        // Ferrule.
        g.path(rr(-14, -7.5, 18, 15, 2.5), metal(g, P.silver, 0, 1), { sw: 3 });
        g.stroke("M-9 -7 V7 M-4 -7 V7", { sw: 1.6, color: P.silver[2] });
        // Bristles, dipped in paint.
        const tip = "M-14 -7 Q-30 -7 -42 0 Q-30 7 -14 7 Z";
        g.path(tip, g.fill(P.tan, "v"), { sw: 3 });
        g.clip(tip, (c) => c.path("M-28 -12 Q-24 0 -28 12 L-46 12 L-46 -12 Z", c.fill(P.sky, "v"), { stroke: null }));
        g.path(tip, "none", { sw: 3 });
        g.shine(20, -2.5, 14, 1.4, 0.6, 0);
      });
    },
  ],
  [
    "🎖️",
    "star medal",
    (d) => {
      // Striped ribbon.
      const rib = roundPoly([[31, 8], [69, 8], [69, 33], [50, 43], [31, 33]], [2, 2, 2, 3, 2]);
      d.path(rib, d.fill(P.blue, "v"), { sw: 3 });
      d.clip(rib, (c) => {
        c.rect(40, 0, 20, 50, 0, "#ffffff", { stroke: null });
        c.rect(45.5, 0, 9, 50, 0, P.red[1], { stroke: null });
      });
      d.path(rib, "none", { sw: 3 });
      d.tube(circlePath(50, 45, 3.6), P.gold[1], 2.4, 2);
      // The star, faceted like cut metal.
      const cx = 50;
      const cy = 68;
      const R = 24;
      const r = 11.5;
      const at = (deg: number, rad: number): Pt => [cx + Math.cos((deg * Math.PI) / 180) * rad, cy + Math.sin((deg * Math.PI) / 180) * rad];
      const S = star(cx, cy, R, r);
      d.path(S, d.fill(P.gold), { sw: 3.5, join: "round" });
      d.clip(S, (c) => {
        for (let i = 0; i < 5; i++) {
          const o = at(-90 + 72 * i, R + 2);
          const inn = at(-54 + 72 * i, r);
          c.poly([cx, cy, ...o, ...inn], P.orange[1], { stroke: null, op: 0.35 });
        }
      });
      d.path(S, "none", { sw: 3.5 });
      d.circle(cx, cy, 6.5, d.fill(P.red), { sw: 2.2 });
      d.circle(cx - 2, cy - 2, 1.6, "#fff", { stroke: null, op: 0.8 });
      d.shine(42, 56, 2.2, 6, 0.7, 30);
      d.sparkle(84, 54, 4.5);
      d.sparkle(16, 60, 3.5);
    },
  ],
  [
    "🎤",
    "microphone",
    (d) => {
      note(d, 17, 34, 10, P.sky);
      d.g("rotate(32 50 52)", (g) => {
        g.path("M39 48 H61 L56 88 Q50 93 44 88 Z", g.fill(P.violet, "h"), { sw: 3.2 });
        g.path(rr(47.5, 60, 5, 10, 2.5), g.fill(P.lime), { sw: 1.8 });
        g.path(rr(36, 41, 28, 10, 3.5), metal(g, P.gold), { sw: 3 });
        const head = circlePath(50, 25, 18);
        g.path(head, g.fill(P.silver), { sw: 3.5 });
        g.clip(head, (c) => {
          for (let k = -42; k <= 42; k += 7) {
            c.line(50 + k - 20, 5, 50 + k + 20, 45, { sw: 1.5, color: P.silver[2] });
            c.line(50 + k + 20, 5, 50 + k - 20, 45, { sw: 1.5, color: P.silver[2] });
          }
        });
        g.path(head, "none", { sw: 3.5 });
        g.shine(43, 16, 5.5, 3, 0.8, -35);
        g.shine(44, 63, 1.4, 9, 0.45, 0);
      });
    },
  ],
  [
    "🎹",
    "piano keys",
    (d) => {
      d.shadow(50, 89, 42);
      d.path(rr(8, 18, 84, 68, 9), d.fill(P.red, "v"), { sw: 3.5 });
      d.shine(22, 24, 9, 2.2, 0.5, 0);
      for (const x of [76, 84]) d.circle(x, 26, 2.8, d.fill(P.gold), { sw: 1.8 });
      d.path(rr(13, 33, 74, 47, 3), OL, { stroke: null });
      const kw = 72 / 7;
      for (let i = 0; i < 7; i++) d.path(rr(14 + i * kw + 0.7, 34, kw - 1.4, 45, 2.5), d.fill(P.white, "v"), { sw: 2 });
      for (const i of [1, 2, 4, 5, 6]) {
        const x = 14 + i * kw;
        d.path(rr(x - 3.6, 34, 7.2, 27, 2), d.fill(P.black, "v"), { sw: 2 });
        d.stroke(`M${f2(x - 1.2)} 38 V56`, { sw: 1.4, color: "#ffffff", op: 0.35 });
      }
    },
  ],
  [
    "🛹",
    "skateboard",
    (d) => {
      d.shadow(50, 86, 40);
      d.g("rotate(-10 50 58)", (g) => {
        for (const x of [29, 71]) {
          g.rect(x - 2.5, 55, 5, 6, 1, P.steel[1], { sw: 2 });
          g.path(rr(x - 8, 59, 16, 5, 2.5), metal(g, P.steel, 0, 1), { sw: 2.2 });
          g.circle(x, 70, 8.5, g.fill(P.lime), { sw: 3 });
          g.circle(x, 70, 3.2, P.lime[2], { sw: 1.8 });
          g.shine(x - 3, 66, 2.6, 1.4, 0.6, -30);
        }
        const deck = "M9 41 Q13 52 24 52 H76 Q87 52 91 41";
        g.tube(deck, P.coral[1], 8.5, 3);
        g.stroke(deck, { sw: 2.6, color: P.gold[1], tf: "translate(0 2.2)" });
        g.stroke(deck, { sw: 2, color: "#ffffff", op: 0.55, tf: "translate(0 -2.4)" });
      });
    },
  ],
  [
    "🏐",
    "beach ball",
    (d) => {
      d.shadow(50, 92, 32);
      const R = 40;
      const cx = 50;
      const cy = 50;
      const al = (40 * Math.PI) / 180;
      const be = (-18 * Math.PI) / 180;
      type V3 = [number, number, number];
      const N: V3 = [0, -Math.cos(al), Math.sin(al)];
      const E2: V3 = [0, Math.sin(al), Math.cos(al)];
      const p3 = (th: number, ph: number): V3 => {
        const c = Math.cos(th);
        const x = c * Math.cos(ph);
        const y = c * Math.sin(ph) * E2[1] + Math.sin(th) * N[1];
        const z = c * Math.sin(ph) * E2[2] + Math.sin(th) * N[2];
        return [x * Math.cos(be) - y * Math.sin(be), x * Math.sin(be) + y * Math.cos(be), z];
      };
      const scr = (v: V3): Pt => [cx + R * v[0], cy + R * v[1]];
      // The visible part of a meridian: from the pole down to the rim.
      const merid = (ph: number) => {
        const pts: Pt[] = [];
        let prev = p3(Math.PI / 2, ph);
        pts.push(scr(prev));
        for (let deg = 87; deg >= -90; deg -= 3) {
          const v = p3((deg * Math.PI) / 180, ph);
          if (v[2] <= 0) {
            const t = prev[2] / (prev[2] - v[2]);
            pts.push(scr([prev[0] + (v[0] - prev[0]) * t, prev[1] + (v[1] - prev[1]) * t, 0]));
            break;
          }
          pts.push(scr(v));
          prev = v;
        }
        return pts;
      };
      const ball = circlePath(cx, cy, R);
      const cols: Ramp[] = [P.red, P.white, P.blue, P.gold, P.white, P.green];
      const step = Math.PI / 3;
      const off = (10 * Math.PI) / 180;
      d.path(ball, P.white[1], { sw: 3.5 });
      d.clip(ball, (c) => {
        for (let k = 0; k < 6; k++) {
          const a = merid(off + k * step);
          const b = merid(off + (k + 1) * step);
          const la = a[a.length - 1];
          const lb = b[b.length - 1];
          const angA = Math.atan2(la[1] - cy, la[0] - cx);
          let dA = Math.atan2(lb[1] - cy, lb[0] - cx) - angA;
          while (dA > Math.PI) dA -= Math.PI * 2;
          while (dA < -Math.PI) dA += Math.PI * 2;
          const out: Pt[] = [];
          for (let i = 0; i <= 6; i++) {
            const ang = angA + (dA * i) / 6;
            out.push([cx + Math.cos(ang) * R * 1.6, cy + Math.sin(ang) * R * 1.6]);
          }
          const poly = [...a, ...out, ...b.reverse()];
          c.poly(poly.flat(), cols[k][1], { stroke: null });
        }
        c.circle(cx, cy, R, c.rad([[0, "#ffffff", 0.45], [0.45, "#ffffff", 0], [1, "#1a2040", 0.3]], 0.35, 0.3, 0.8), { stroke: null });
        for (let k = 0; k < 6; k++) {
          const m = merid(off + k * step);
          c.stroke(`M${m.map((p) => `${f2(p[0])} ${f2(p[1])}`).join(" L")}`, { sw: 2 });
        }
        const cap: number[] = [];
        for (let i = 0; i < 24; i++) cap.push(...scr(p3((74 * Math.PI) / 180, (i / 24) * Math.PI * 2)));
        c.poly(cap, "#ffffff", { sw: 2 });
      });
      d.path(ball, "none", { sw: 3.5 });
      d.shine(31, 36, 7, 4, 0.5, -40);
    },
  ],
  [
    "🏅",
    "sports medal",
    (d) => {
      vRibbon(d, P.red, P.red, "#ffffff", 46);
      medalDisc(d, 50, 66, 24);
      d.path(softStar(50, 67, 11, 5.6), "#fff6c4", { sw: 2, stroke: P.orange[2] });
      d.shine(37, 55, 3, 7, 0.75, 35);
      d.sparkle(84, 58, 4.5);
      d.sparkle(15, 64, 3.5);
    },
  ],
  [
    "🎸",
    "guitar",
    (d) => {
      d.g("translate(50 50) rotate(38) scale(1.06) translate(-50 -50)", (g) => {
        // Neck and headstock.
        g.path(rr(44, 3, 12, 15, 3.5), g.fill(P.brown, "v"), { sw: 2.8 });
        for (const y of [7, 13]) for (const s of [-1, 1]) g.circle(50 + s * 8.5, y, 2.3, g.fill(P.silver), { sw: 1.6 });
        g.path(rr(46, 15, 8, 40, 1.5), g.fill(P.brown, "h"), { sw: 2.6 });
        for (const y of [22, 29, 36, 43]) g.line(46.5, y, 53.5, y, { sw: 1.2, color: P.silver[1] });
        // Body.
        const body = smooth([[50, 37], [62, 40], [65, 50], [60, 59], [68, 66], [71, 78], [63, 89], [50, 92], [37, 89], [29, 78], [32, 66], [40, 59], [35, 50], [38, 40]], 0.2);
        g.path(body, g.rad([[0, P.orange[0]], [0.5, P.orange[1]], [1, P.brown[1]]], 0.42, 0.55, 0.7), { sw: 3.5 });
        g.path(rr(46, 36, 8, 18, 1.5), g.fill(P.brown, "h"), { sw: 2.4 });
        g.circle(50, 60, 9, "none", { sw: 2.2, stroke: P.brown[2] });
        g.circle(50, 60, 6.5, OL, { stroke: null });
        g.path(rr(42, 75, 16, 5, 2), g.fill(P.brown, "v"), { sw: 2.2 });
        g.stroke("M48 15 V77 M50 15 V77 M52 15 V77", { sw: 0.9, color: "#fff6dc", op: 0.9 });
        g.shine(41, 72, 3, 7, 0.45, 20);
      });
    },
  ],
  [
    "🕹️",
    "joystick",
    (d) => {
      d.shadow(50, 89, 40);
      d.path(roundPoly([[22, 56], [78, 56], [89, 86], [11, 86]], 7), d.fill(P.blue, "v"), { sw: 3.5 });
      d.ellipse(50, 59, 26, 5.5, P.blue[0], { stroke: null, op: 0.6 });
      for (const [x, c] of [[29, P.gold], [71, P.red]] as [number, Ramp][]) {
        d.ellipse(x, 73, 6.5, 4.6, c[2], { sw: 2.2 });
        d.ellipse(x, 71.5, 6.5, 4.4, d.fill(c), { sw: 2.2 });
      }
      d.ellipse(50, 60, 9, 3.6, OL, { stroke: null });
      d.tube("M50 60 L55 30", P.steel[1], 5, 2.6);
      d.ball(56, 25, 13, P.red, { sw: 3 });
    },
  ],
  [
    "♟️",
    "chess pawn",
    (d) => {
      d.shadow(50, 91, 32);
      const ink = P.ink;
      d.path(rr(18, 80, 64, 10, 4.5), d.fill(ink, "v"), { sw: 3.2 });
      d.path(rr(25, 72, 50, 10, 4.5), d.fill(ink, "v"), { sw: 3.2 });
      d.path("M42 40 Q41 58 31 73 H69 Q59 58 58 40 Z", d.fill(ink, "h"), { sw: 3.2 });
      d.path(rr(35, 34, 30, 8, 4), d.fill(ink, "v"), { sw: 3.2 });
      d.circle(50, 22, 12.5, d.fill(ink), { sw: 3.2 });
      d.shine(45, 16, 4, 2.4, 0.5, -35);
      d.shine(42.5, 56, 1.5, 9, 0.35, 10);
    },
  ],
  [
    "🎬",
    "clapperboard",
    (d) => {
      d.shadow(50, 92, 38);
      const stripes = (c: Pen, x: number, y: number, w: number, h: number) => {
        for (let k = 0; k < w + h; k += 14) c.poly([x + k, y, x + k + 7, y, x + k + 7 - h, y + h, x + k - h, y + h], "#ffffff", { stroke: null });
      };
      // Slate.
      d.path(rr(14, 46, 72, 44, 5), d.fill(P.ink, "v"), { sw: 3.5 });
      d.stroke("M19 62 H81 M19 76 H81 M50 62 V86", { sw: 1.8, color: P.ink[0] });
      // Fixed bar.
      const bar = rr(14, 36, 72, 11, 3);
      d.path(bar, d.fill(P.black, "v"), { sw: 3 });
      d.clip(bar, (c) => stripes(c, 14, 36, 72, 11));
      d.path(bar, "none", { sw: 3 });
      // The clapper, swung open.
      d.g("rotate(-13 16 36)", (g) => {
        const top = rr(14, 24.5, 72, 11, 3);
        g.path(top, g.fill(P.black, "v"), { sw: 3 });
        g.clip(top, (c) => stripes(c, 14, 24.5, 72, 11));
        g.path(top, "none", { sw: 3 });
      });
      d.circle(17.5, 36, 3, d.fill(P.silver), { sw: 2 });
      d.shine(24, 51, 6, 1.6, 0.4, 0);
    },
  ],
  [
    "🎀",
    "ribbon bow",
    (d) => {
      const tail = "M46 50 L28 84 L36 81 L40 89 L55 52 Z";
      d.path(tail, d.fill(P.pink, "v"), { sw: 3 });
      d.mirror(50, (m) => m.path(tail, m.fill(P.pink, "v"), { sw: 3 }));
      const loop = "M50 44 C40 27 13 20 11 37 C9 54 36 57 50 44 Z";
      d.path(loop, d.fill(P.pink), { sw: 3.2 });
      d.mirror(50, (m) => m.path(loop, m.fill(P.pink), { sw: 3.2 }));
      d.path("M45 43 C38 35 25 31 22 37 C20 42 33 46 45 43 Z", P.pink[2], { stroke: null, op: 0.5 });
      d.path("M55 43 C62 35 75 31 78 37 C80 42 67 46 55 43 Z", P.pink[2], { stroke: null, op: 0.5 });
      d.path(rr(42.5, 35, 15, 17, 6), d.fill(P.pink), { sw: 3 });
      d.shine(19, 31, 5, 2.5, 0.6, -30);
      d.shine(66, 31, 4, 2, 0.45, 20);
    },
  ],
  [
    "🏒",
    "hockey stick",
    (d) => {
      d.shadow(48, 89, 40);
      // Puck.
      d.path("M58 80 V85 A12 4.5 0 0 0 82 85 V80 Z", d.fill(P.black, "v"), { sw: 2.8 });
      d.ellipse(70, 80, 12, 4.5, d.fill(P.ink), { sw: 2.8 });
      // Stick: shaft, blade and tape.
      d.tube("M76 8 L44 72", P.wood[0], 6.5, 3);
      d.tube("M76 8 L70 20", P.black[1], 6.5, 0);
      d.tube("M45 70 Q40 84 26 84 H14", P.wood[0], 8, 3);
      d.tube("M38 80 Q33 84 26 84 H16", P.black[1], 8, 0);
      d.stroke("M33 80.5 L31 87.5 M27 80.5 L25 87.5 M21 80.5 L19 87.5", { sw: 1.4, color: "#ffffff", op: 0.7 });
      d.stroke("M69 13 L49 53", { sw: 1.8, color: "#ffffff", op: 0.6 });
    },
  ],
  [
    "🎄",
    "christmas tree",
    (d) => {
      d.shadow(50, 92, 22);
      d.rect(45, 74, 10, 10, 2, d.fill(P.brown, "h"), { sw: 2.6 });
      d.path(roundPoly([[34, 80], [66, 80], [62, 92], [38, 92]], 2.5), d.fill(P.red, "v"), { sw: 3 });
      const tier = (top: number, bot: number, w: number) => `M50 ${top} L${50 + w} ${bot - 3} Q${50 + w * 0.5} ${bot + 3} 50 ${bot} Q${50 - w * 0.5} ${bot + 3} ${50 - w} ${bot - 3} Z`;
      d.path(tier(42, 78, 33), d.fill(P.green), { sw: 3 });
      d.path(tier(28, 60, 25), d.fill(P.green), { sw: 3 });
      d.path(tier(16, 42, 17), d.fill(P.green), { sw: 3 });
      d.stroke("M27 69 Q50 78 72 64", { sw: 2.4, color: P.gold[1] });
      d.stroke("M33 51 Q50 58 66 48", { sw: 2.4, color: P.gold[1] });
      const balls: [number, number, Ramp][] = [[33, 72, P.red], [60, 72, P.sky], [46, 66, P.gold], [40, 53, P.sky], [60, 52, P.red], [51, 36, P.gold], [44, 31, P.red]];
      for (const [x, y, c] of balls) d.ball(x, y, 3.4, c, { sw: 1.8 });
      d.path(softStar(50, 16.5, 9, 4.6), d.fill(P.gold), { sw: 2.6 });
      d.shine(46.5, 13.5, 2.2, 1.2, 0.7, -30);
    },
  ],
  [
    "📯",
    "post horn",
    (d) => {
      // Cord and tassel.
      d.tube("M24 60 Q26 84 42 86 Q54 87 58 74", P.red[1], 2.8, 1.8);
      d.path("M38 86 L46 86 L48 94 L36 94 Z", d.fill(P.red, "v"), { sw: 2.2 });
      d.circle(42, 86, 3.4, d.fill(P.gold), { sw: 1.8 });
      // Mouthpiece pipe leaving the coil at the top, and its cup.
      d.tube("M42 26 Q26 25 15 31", P.gold[1], 5, 2.6);
      d.path("M8 27 Q12 30 15 29 L16 34 Q12 34 9 37 Z", metal(d, P.gold, 0, 1), { sw: 2.2 });
      // The coil: one loop of tubing.
      d.tube("M42 26 C64 26 66 70 42 70 C20 70 18 38 34 30", P.gold[1], 6.5, 2.8);
      d.stroke("M30 36 Q24 44 26 54", { sw: 2, color: "#ffffff", op: 0.6 });
      // Bell pipe leaving the coil at the bottom, flaring to the right.
      d.path("M40 66 Q54 66 62 60 Q72 52 79 40 L90 34 L90 82 L79 76 Q70 72 58 74 Q48 75 40 75 Z", metal(d, P.gold, 0.5, 1), { sw: 3 });
      d.ellipse(90, 58, 4.5, 24, d.fill(P.gold, "h"), { sw: 3 });
      d.ellipse(91, 58, 2, 18, P.gold[2], { stroke: null });
      d.shine(76, 52, 6, 1.5, 0.7, -40);
    },
  ],
  [
    "🏈",
    "football",
    (d) => {
      d.shadow(50, 90, 32);
      d.g("rotate(-35 50 50)", (g) => {
        const ball = "M7 50 C18 25 82 25 93 50 C82 75 18 75 7 50 Z";
        g.path(ball, g.fill(P.brown), { sw: 3.5 });
        g.clip(ball, (c) => {
          c.stroke("M23 30 Q18 50 23 70 M77 30 Q82 50 77 70", { sw: 4.5, color: "#ffffff" });
        });
        g.path(ball, "none", { sw: 3.5 });
        g.tube("M36 41 H64", "#ffffff", 2.4, 1.8);
        for (const x of [40, 45, 50, 55, 60]) g.tube(`M${x} 37.5 V44.5`, "#ffffff", 2.2, 1.6);
        g.shine(30, 39, 9, 3, 0.45, -12);
      });
    },
  ],
  [
    "🎾",
    "tennis ball",
    (d) => {
      d.shadow(50, 92, 32);
      const fuzz: Ramp = ["#f9ffc2", "#dcf04a", "#9dbb14"];
      const ball = circlePath(50, 50, 40);
      d.path(ball, d.fill(fuzz), { sw: 3.5 });
      d.clip(ball, (c) =>
        c.g("rotate(-35 50 50)", (g) => {
          const seam = "M14 18 Q44 50 14 82 M86 18 Q56 50 86 82";
          g.stroke(seam, { sw: 7.5, color: fuzz[2], op: 0.45 });
          g.stroke(seam, { sw: 4.5, color: "#ffffff" });
        }),
      );
      d.path(ball, "none", { sw: 3.5 });
      d.shine(34, 29, 9, 5, 0.55, -35);
    },
  ],
  [
    "⛸️",
    "ice skate",
    (d) => {
      d.shadow(52, 91, 38);
      // Blade and its posts.
      for (const x of [27, 72]) d.rect(x - 3, 70, 6, 9, 1, metal(d, P.silver), { sw: 2.2 });
      d.path("M15 84 H80 Q91 84 91 75 Q91 70 86 70 L84 73 Q87 74 86 77 Q85 79 80 79 H15 Q12 79 12 81.5 Q12 84 15 84 Z", metal(d, P.silver, 0, 1), { sw: 2.6 });
      // The boot.
      const boot = "M24 70 L22 22 Q22 12 32 12 H50 Q57 12 57 19 L58 41 Q61 49 73 53 L83 56 Q91 59 90 65 Q89 71 82 71 L24 71 Z";
      d.path(boot, d.fill(P.sky), { sw: 3.5 });
      d.clip(boot, (c) => {
        c.rect(10, 66, 90, 10, 0, P.ink[1], { stroke: null });
        c.path(rr(14, 6, 50, 13, 4), d.fill(P.white, "v"), { sw: 2.4 });
      });
      d.path(boot, "none", { sw: 3.5 });
      // Laces.
      for (const y of [25, 32, 39, 46]) {
        const x = 54 + (y - 25) * 0.18;
        d.stroke(`M${x - 9} ${y + 3} L${x} ${y} M${x - 9} ${y} L${x} ${y + 3}`, { sw: 2.2, color: "#ffffff" });
      }
      d.shine(30, 30, 3, 9, 0.55, 0);
    },
  ],
  [
    "🎃",
    "jack-o'-lantern",
    (d) => {
      d.shadow(50, 91, 38);
      d.path("M45 24 Q44 13 51 8 L57 11 Q52 16 53 24 Z", d.fill(P.forest, "h"), { sw: 2.6 });
      d.path(leaf(55, 19, 16, -25), d.fill(P.green, "d"), { sw: 2.2 });
      const body = "M50 24 C58 18 77 20 86 34 C94 46 94 70 84 80 C74 90 58 90 50 86 C42 90 26 90 16 80 C6 70 6 46 14 34 C23 20 42 18 50 24 Z";
      d.path(body, d.fill(P.orange), { sw: 3.5 });
      d.stroke("M35 24 Q20 56 33 88 M65 24 Q80 56 67 88", { sw: 2.2, color: P.orange[2], op: 0.75 });
      // A friendly glowing face.
      const glow = d.rad([[0, "#fffbe0"], [0.6, P.gold[1]], [1, P.orange[1]]], 0.5, 0.5, 0.7);
      d.path(roundPoly([[24, 54], [33, 39], [42, 54]], 3), glow, { sw: 2.6 });
      d.path(roundPoly([[58, 54], [67, 39], [76, 54]], 3), glow, { sw: 2.6 });
      d.path(roundPoly([[46, 62], [50, 56], [54, 62]], 1.5), glow, { sw: 2.2 });
      d.path("M24 66 Q50 72 76 66 Q72 84 50 85 Q28 84 24 66 Z M44 69.5 V75 H52 V70 Z", glow, { sw: 2.6 });
      d.path("M44 69.6 V75.5 H52 V69.8", P.orange[1], { sw: 2.2 });
      d.shine(25, 36, 7, 3.5, 0.5, -40);
    },
  ],
  [
    "🥇",
    "gold medal",
    (d) => {
      vRibbon(d, P.blue, P.blue, P.sky[0], 46);
      medalDisc(d, 50, 66, 24);
      d.path("M45.5 60 L53 55 H57 V75 H61 V79.5 H45.5 V75 H51 V62 L47.5 64 Z", "#fff6c4", { sw: 2, stroke: P.orange[2] });
      d.shine(37, 55, 3, 7, 0.75, 35);
      d.sparkle(85, 56, 5);
      d.sparkle(14, 62, 4);
      d.sparkle(82, 86, 3);
    },
  ],
  [
    "🪄",
    "magic wand",
    (d) => {
      d.glow(68, 30, 30, "#fff1a0", 0.75);
      d.g("translate(42 60) rotate(-45)", (g) => {
        const wand = rr(-38, -5, 70, 10, 5);
        g.path(wand, g.fill(P.black, "v"), { sw: 3 });
        g.clip(wand, (c) => {
          c.rect(20, -6, 14, 12, 0, c.fill(P.white, "v"), { stroke: null });
          c.rect(-40, -6, 12, 12, 0, c.fill(P.white, "v"), { stroke: null });
        });
        g.path(wand, "none", { sw: 3 });
        g.line(20, -5, 20, 5, { sw: 2 });
        g.line(-28, -5, -28, 5, { sw: 2 });
        g.shine(-4, -2.4, 14, 1.2, 0.5, 0);
      });
      d.sparkle(70, 27, 13);
      d.sparkle(87, 46, 5);
      d.sparkle(52, 13, 5);
      d.circle(86, 18, 2.4, P.gold[1], { sw: 1.4, stroke: P.gold[2] });
      d.circle(76, 52, 1.8, P.gold[1], { sw: 1.2, stroke: P.gold[2] });
    },
  ],
  [
    "🏏",
    "cricket bat",
    (d) => {
      d.shadow(50, 90, 38);
      d.g("rotate(35 50 50)", (g) => {
        g.path(rr(46, 5, 8, 32, 3.5), g.fill(P.red, "h"), { sw: 2.8 });
        g.stroke("M46.5 11 L53.5 14 M46.5 18 L53.5 21 M46.5 25 L53.5 28", { sw: 1.4, color: P.red[2] });
        g.path("M44 35 H56 Q61 36 61 42 V86 Q61 92 55 92 H45 Q39 92 39 86 V42 Q39 36 44 35 Z", g.fill(P.tan, "h"), { sw: 3.2 });
        g.stroke("M50 42 V87", { sw: 2, color: P.tan[2], op: 0.7 });
        g.shine(44, 60, 1.6, 14, 0.6, 0);
      });
      d.ball(76, 79, 9.5, P.red, { sw: 2.8 });
      d.stroke("M67.5 77 Q76 73 85 78", { sw: 1.6, color: "#ffffff" });
    },
  ],
  [
    "🪂",
    "parachute",
    (d) => {
      const xs = [10, 23.3, 36.7, 50, 63.3, 76.7, 90];
      // Lines down to the rider's hands.
      for (const x of xs) if (x !== 50) d.stroke(`M${x} 44 L${x < 50 ? 41.6 : 58.4} 65.4`, { sw: 1.5 });
      figure(d, 50, 93, 34, CAST.kid, { armB: [-145, -160], armF: [145, 160], legB: [12, 4], legF: [-12, -4] }, MOODS.joy);
      // The canopy, in rainbow panels.
      let edge = "M10 44 C10 18 30 8 50 8 C70 8 90 18 90 44";
      for (let i = 6; i > 0; i--) edge += ` Q${f2((xs[i] + xs[i - 1]) / 2)} 38 ${xs[i - 1]} 44`;
      const canopy = `${edge} Z`;
      const cols: Ramp[] = [P.red, P.orange, P.gold, P.green, P.sky, P.violet];
      d.path(canopy, "#ffffff", { sw: 3.2 });
      d.clip(canopy, (c) => {
        for (let i = 0; i < 6; i++) {
          const a = xs[i];
          const b = xs[i + 1];
          c.path(`M50 4 Q${a + (a - 50) * 0.25} 20 ${a} 46 L${b} 46 Q${b + (b - 50) * 0.25} 20 50 4 Z`, c.fill(cols[i], "v"), { stroke: null });
        }
        for (const x of xs.slice(1, 6)) c.stroke(`M50 6 Q${x + (x - 50) * 0.25} 20 ${x} 46`, { sw: 1.8 });
      });
      d.path(canopy, "none", { sw: 3.2 });
      d.shine(28, 20, 7, 3, 0.55, -35);
    },
  ],
  [
    "🎿",
    "skis",
    (d) => {
      // Poles stuck in the snow behind.
      for (const s of [-1, 1]) {
        d.tube(`M${50 + s * 30} 84 L${50 + s * 36} 22`, P.steel[1], 2.6, 2);
        d.tube(`M${50 + s * 36} 22 L${50 + s * 36.8} 14`, P.ink[1], 4.6, 2);
        d.ellipse(50 + s * 30.7, 76, 6, 2.2, "none", { sw: 2.2 });
      }
      // Two skis crossed, tips curling out.
      const ski = (s: number) => {
        const path = `M${50 - s * 17} 86 L${50 + s * 11} 20 Q${50 + s * 14} 11 ${50 + s * 21} 13`;
        d.tube(path, P.red[1], 8, 2.8);
        d.stroke(`M${50 - s * 15.6} 80 L${50 + s * 10} 22`, { sw: 1.8, color: "#ffffff", op: 0.6 });
        const ang = (Math.atan2(-66, s * 28) * 180) / Math.PI;
        d.path(rr(-7, -5.5, 14, 11, 3), d.fill(P.ink, "v"), { sw: 2.2, tf: `translate(${f2(50 - s * 7.7)} 64) rotate(${f2(ang + 90)})` });
      };
      ski(-1);
      ski(1);
      // Fresh snow.
      d.path("M8 92 Q7 79 20 77 Q27 70 37 74 Q46 67 56 72 Q66 66 75 73 Q91 73 92 92 Z", d.fill(P.white, "v"), { sw: 3 });
      d.shine(24, 80, 5, 1.8, 0.8, -10);
    },
  ],
  [
    "⛳",
    "golf flag",
    (d) => {
      d.ellipse(50, 80, 42, 11, d.fill(P.green, "v"), { sw: 3 });
      d.ellipse(36, 77, 18, 4, P.lime[0], { stroke: null, op: 0.45 });
      d.ellipse(57, 80, 6.5, 2.4, OL, { stroke: null });
      d.tube("M57 80 V10", "#ffffff", 3, 2);
      d.path("M58.5 11 Q71 13 85 21 Q74 26 71 31 Q65 31 58.5 34 Z", d.fill(P.red), { sw: 2.6 });
      d.ball(33, 74, 6, P.white, { sw: 2.2 });
      d.circle(35, 75, 0.9, P.white[2], { stroke: null });
      d.circle(32, 77, 0.9, P.white[2], { stroke: null });
    },
  ],
  [
    "🎏",
    "carp streamer",
    (d) => {
      d.tube("M15 92 V14", P.wood[0], 4, 2.4);
      d.ball(15, 11, 5, P.gold, { sw: 2.2 });
      const carp = (y: number, ramp: Ramp, s: number) =>
        d.g(`translate(18 ${y}) scale(${s})`, (g) => {
          const body = "M0 -10 C20 -13 40 -9 56 -6 Q64 -12 72 -14 Q67 -3 72 9 Q64 8 56 5 C40 9 20 13 0 10 Z";
          g.path(body, g.fill(ramp, "v"), { sw: 3 });
          g.clip(body, (c) => {
            for (const x of [18, 28, 38, 48]) c.stroke(`M${x} -8 Q${x + 5} 0 ${x} 8`, { sw: 1.8, color: ramp[2], op: 0.8 });
          });
          g.path(body, "none", { sw: 3 });
          g.ellipse(1, 0, 3, 10, g.fill(P.white), { sw: 2.4 });
          g.circle(10, -2, 4.2, "#ffffff", { sw: 2 });
          g.circle(10.5, -2, 2, OL, { stroke: null });
          g.shine(18, -6, 8, 1.6, 0.6, 0);
        });
      carp(32, P.red, 1);
      carp(66, P.blue, 0.92);
    },
  ],
  [
    "🛴",
    "scooter",
    (d) => {
      d.shadow(51, 90, 40);
      for (const x of [21, 79]) {
        d.circle(x, 80, 9, d.fill(P.black), { sw: 3 });
        d.circle(x, 80, 3.4, d.fill(P.silver), { sw: 1.8 });
      }
      d.stroke("M11 76 Q12 67 22 67", { sw: 3.2 });
      d.tube("M66 72 L76 61", P.sky[1], 5.5, 2.8);
      d.tube("M79 80 L71 16", P.sky[1], 5.5, 2.8);
      d.path(rr(15, 66, 58, 8, 4), d.fill(P.sky, "v"), { sw: 3 });
      d.tube("M58 15 H84", P.steel[1], 4, 2.6);
      d.tube("M58 15 H63 M79 15 H84", P.ink[1], 4.5, 0);
      d.shine(24, 68, 8, 1.4, 0.6, 0);
    },
  ],
  [
    "🪀",
    "yo-yo",
    (d) => {
      d.stroke("M53 50 Q50 32 50 15", { sw: 2.2 });
      d.circle(50, 11, 4, "none", { sw: 2.2 });
      d.circle(56, 64, 27, d.fill([P.red[1], P.red[2], "#8f1028"]), { sw: 3.2 });
      d.circle(50, 61, 27, d.fill(P.red), { sw: 3.5 });
      d.circle(50, 61, 17, "none", { sw: 2.2, stroke: P.red[2] });
      d.path(softStar(50, 61, 8, 4), d.fill(P.gold), { sw: 2 });
      d.shine(38, 46, 7, 3.5, 0.6, -38);
    },
  ],
  [
    "🎻",
    "violin",
    (d) => {
      // The bow, behind.
      d.g("rotate(36 50 50)", (g) => {
        g.tube("M50 6 V92", P.brown[1], 2.6, 2);
        g.stroke("M54 9 V86", { sw: 1.6, color: P.cream[2] });
        g.path(rr(46.5, 84, 9, 8, 2), g.fill(P.ink), { sw: 2 });
      });
      d.g("translate(50 50) rotate(-38) scale(1.14) translate(-50 -50)", (g) => {
        // Scroll and neck.
        g.circle(50, 9, 4.6, g.fill(P.brown), { sw: 2.4 });
        g.path(rr(47, 11, 6, 22, 2), g.fill(P.brown, "h"), { sw: 2.4 });
        // Body.
        const body = smooth([[50, 32], [60, 34], [63, 42], [59, 50], [57, 56], [60, 62], [66, 71], [64, 82], [57, 88], [50, 89], [43, 88], [36, 82], [34, 71], [40, 62], [43, 56], [41, 50], [37, 42], [40, 34]], 0.2);
        g.path(body, g.rad([[0, P.orange[0]], [0.5, P.wood[1]], [1, P.brown[2]]], 0.42, 0.45, 0.75), { sw: 3.2 });
        g.stroke("M42 62 Q44 66 42 71 M58 62 Q56 66 58 71", { sw: 2, color: P.brown[2] });
        g.path(rr(47, 18, 6, 46, 2), g.fill(P.ink, "h"), { sw: 2.2 });
        g.path(rr(46, 74, 8, 13, 3.5), g.fill(P.ink, "v"), { sw: 2.2 });
        g.line(44, 70, 56, 70, { sw: 2.4, color: P.tan[1] });
        g.stroke("M48.6 20 V75 M51.4 20 V75", { sw: 0.9, color: "#fff6dc", op: 0.9 });
        g.shine(43, 78, 2.5, 5, 0.45, 20);
      });
    },
  ],
];
