// Food, drinks and things to eat with.

import { OL, P, circlePath, curve, leaf, lumpy, rr, smooth, type Pen, type Ramp } from "../pen";
import type { PicDef } from "..";

// Baked, cooked and sweet colors the main palette doesn't have (same light / base / dark ramps).
const EGG: Ramp = ["#ffffff", "#fcefd8", "#dfbd8a"];
const CRUST: Ramp = ["#ffdca2", "#eba552", "#b4642a"]; // bread, buns, waffles
const COOKIE: Ramp = ["#ffe3aa", "#efb96e", "#c07d3a"];
const CHOC: Ramp = ["#a8724a", "#6b3e22", "#3b200e"];
const NUT: Ramp = ["#eda97b", "#a8572b", "#5e2f0f"];
const HONEY: Ramp = ["#ffe68e", "#ffb320", "#cc7200"];
const SHELL: Ramp = ["#fde4b6", "#e4b676", "#a8783c"]; // peanut shells
const VANILLA: Ramp = ["#ffffff", "#fff3da", "#e6cc9a"];
const BUTTER: Ramp = ["#fffdf0", "#fff0a3", "#e6c552"];
const SPONGE: Ramp = ["#fff6dc", "#f9e2a6", "#ddb66c"]; // cake
const PEAR: Ramp = ["#fbfbbf", "#d5e35e", "#93a82a"];
const OLIVE: Ramp = ["#dcec9c", "#9db93c", "#5a7417"];
const SAGE: Ramp = ["#d9ead0", "#93b783", "#587d48"]; // olive leaves
const POP: Ramp = ["#ffffff", "#fff3cc", "#e6c063"]; // popcorn
const TEA: Ramp = ["#ffe9a8", "#e3a640", "#a86a1a"];
const ROAST: Ramp = ["#f3a777", "#c0602f", "#80361a"];
const MEAT: Ramp = ["#f7929a", "#d63e52", "#93203a"];
const FLAT: Ramp = ["#fffaea", "#f8e2ae", "#dcb26a"]; // flatbread dough
const TORTILLA: Ramp = ["#fff3b8", "#f5cb5a", "#cf9530"];
const PRETZEL: Ramp = ["#eaac70", "#b0682f", "#6e3a14"];
const ICE: Ramp = ["#ffffff", "#f3f8ff", "#cddbec"];
const GLASS: Ramp = ["#ffffff", "#dff3ff", "#9fd2f0"];

const r2 = (v: number) => Math.round(v * 100) / 100;

/** A scalloped blob: `n` round bumps around an ellipse (broccoli, popcorn, cream, shaved ice). */
function bumpy(cx: number, cy: number, rx: number, ry: number, n: number, k = 0.62, rot = 0): string {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (rot * Math.PI) / 180;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  let s = `M${r2(pts[0][0])} ${r2(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % n];
    const nx = (y2 - y1) * k;
    const ny = -(x2 - x1) * k;
    s += ` C${r2(x1 + nx)} ${r2(y1 + ny)} ${r2(x2 + nx)} ${r2(y2 + ny)} ${r2(x2)} ${r2(y2)}`;
  }
  return `${s} Z`;
}

/** Points along an ellipse arc, from angle a0 to a1 (degrees; 0 = right, 90 = down). */
function arcPts(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return out;
}

/** A table fork standing upright, centered on (0, 0), 85 long. */
function fork(d: Pen) {
  d.path(
    "M-8.5 -39 Q-8.5 -42.5 -6.6 -42.5 Q-4.7 -42.5 -4.7 -39 V-26 H-1.9 V-39 Q-1.9 -42.5 0 -42.5 Q1.9 -42.5 1.9 -39 V-26 H4.7 V-39 Q4.7 -42.5 6.6 -42.5 Q8.5 -42.5 8.5 -39 V-23 Q8.5 -13 3.2 -10.5 L4.8 35 Q4.8 42.5 0 42.5 Q-4.8 42.5 -4.8 35 L-3.2 -10.5 Q-8.5 -13 -8.5 -23 Z",
    d.fill(P.silver, "h"),
    { sw: 2.6 },
  );
  d.shine(-2, 14, 1.3, 9, 0.9, 0);
}
/** A table knife standing upright, centered on (0, 0), 85 long. */
function knife(d: Pen) {
  d.path("M-5.8 2 V-24 Q-5.8 -40 2 -42.5 Q5.8 -43.2 5.8 -37 V2 Z", d.fill(P.silver, "h"), { sw: 2.6 });
  d.path(rr(-5, 0, 10, 42.5, 5), d.fill(P.steel, "h"), { sw: 2.6 });
  d.shine(-2.2, -22, 1.3, 8, 0.9, 4);
}

/** Rising steam: soft white wisps. */
function steam(d: Pen, xs: number[], top: number, bottom: number) {
  xs.forEach((x, i) => {
    const h = bottom - top;
    const s = i % 2 ? -1 : 1;
    d.tube(`M${x} ${bottom} C${x - 7 * s} ${bottom - h * 0.36} ${x + 7 * s} ${bottom - h * 0.62} ${x + 1 * s} ${top}`, "#ffffff", 4, 2.1);
  });
}

/** The outline of a curved body that tapers along the curve p0 → p1 → p2 (half-width h(t)). */
function sweep(p0: [number, number], p1: [number, number], p2: [number, number], h: (t: number) => number, n = 18): string {
  const L: [number, number][] = [];
  const R: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0];
    const y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1];
    const dx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
    const dy = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
    const len = Math.hypot(dx, dy) || 1;
    const w = h(t);
    L.push([x - (dy / len) * w, y + (dx / len) * w]);
    R.push([x + (dy / len) * w, y - (dx / len) * w]);
  }
  return smooth([...L, ...R.reverse()], 0.18);
}
/** The outline of a curved body that tapers along a circular arc (angles in degrees, 0 = right, 90 = down). */
function arcSweep(cx: number, cy: number, R: number, a0: number, a1: number, h: (t: number) => number, n = 18): string {
  const O: [number, number][] = [];
  const I: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = ((a0 + (a1 - a0) * t) * Math.PI) / 180;
    const w = h(t);
    O.push([cx + Math.cos(a) * (R + w), cy + Math.sin(a) * (R + w)]);
    I.push([cx + Math.cos(a) * (R - w), cy + Math.sin(a) * (R - w)]);
  }
  return smooth([...O, ...I.reverse()], 0.18);
}
/** A point on an arc (as in `arcSweep`) at t, `off` outside the arc's radius. */
function onArc(cx: number, cy: number, R: number, a0: number, a1: number, t: number, off = 0): [number, number] {
  const a = ((a0 + (a1 - a0) * t) * Math.PI) / 180;
  return [cx + Math.cos(a) * (R + off), cy + Math.sin(a) * (R + off)];
}
/** A point on the curve p0 → p1 → p2, pushed `off` along its normal (the side `sweep` calls L). */
function onCurve(p0: [number, number], p1: [number, number], p2: [number, number], t: number, off = 0): [number, number] {
  const x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0];
  const y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1];
  const dx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
  const dy = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
  const len = Math.hypot(dx, dy) || 1;
  return [x - (dy / len) * off, y + (dx / len) * off];
}

/** A star with separate x / y radii — a strawberry's or tomato's leafy cap. */
function starXY(cx: number, cy: number, Rx: number, Ry: number, rx: number, ry: number, n: number, rot = 0): string {
  const p: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = ((rot + (i * 180) / n) * Math.PI) / 180;
    const [ax, ay] = i % 2 ? [rx, ry] : [Rx, Ry];
    p.push(`${i ? "L" : "M"}${r2(cx + Math.cos(a) * ax)} ${r2(cy + Math.sin(a) * ay)}`);
  }
  return `${p.join(" ")} Z`;
}

/** An ellipse as a path (for clip shapes). */
function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  return `M${r2(cx - rx)} ${r2(cy)} a${rx} ${ry} 0 1 0 ${r2(rx * 2)} 0 a${rx} ${ry} 0 1 0 ${r2(-rx * 2)} 0 Z`;
}

/** A circle with a round hole (a donut, a ring). */
function ring(cx: number, cy: number, R: number, r: number): string {
  return `${circlePath(cx, cy, R)} M${r2(cx - r)} ${r2(cy)} a${r} ${r} 0 1 1 ${r2(r * 2)} 0 a${r} ${r} 0 1 1 ${r2(-r * 2)} 0 Z`;
}

export const FOOD: PicDef[] = [
  [
    "🍎",
    "apple",
    (d) => {
      d.path("M50 31 C40 22 15 22 13 48 C11 74 30 93 44 90 C47 89 49 88 50 88 C51 88 53 89 56 90 C70 93 89 74 87 48 C85 22 60 22 50 31 Z", d.fill(P.red), { sw: 3.5 });
      d.tube("M50 32 Q48 21 54 11", P.brown[1], 4.5, 2.5);
      d.path(leaf(53, 21, 24, -22), d.fill(P.green, "d"), { sw: 2.6 });
      d.stroke("M55 20 Q65 16 74 12", { sw: 1.6, color: P.green[2] });
      d.shine(29, 46, 6, 12, 0.6, 18);
    },
  ],
  [
    "🥚",
    "egg",
    (d) => {
      d.shadow(50, 91, 25, 4.2);
      d.path("M50 9 C69 9 82 37 82 60 C82 79 68 90 50 90 C32 90 18 79 18 60 C18 37 31 9 50 9 Z", d.fill(EGG), { sw: 3.5 });
      d.shine(35, 36, 5.5, 12, 0.9, 22);
    },
  ],
  [
    "🍽️",
    "dinner plate",
    (d) => {
      d.g("translate(13 51) scale(0.95)", fork);
      d.g("translate(87 51) scale(0.95)", knife);
      d.circle(50, 51, 27.5, d.fill(P.white), { sw: 3.5 });
      d.circle(50, 51, 23, "none", { sw: 2.6, stroke: P.sky[1] });
      d.circle(50, 51, 16.5, d.lin([[0, "#dfe6ef"], [1, "#ffffff"]], 0, 0, 1, 1), { sw: 2, stroke: P.white[2] });
      d.shine(37, 37, 7, 3, 0.9, -42);
    },
  ],
  [
    "🍞",
    "bread",
    (d) => {
      d.shadow(50, 87, 40, 5);
      const loaf = "M12 78 C6 56 14 25 50 23 C86 25 94 56 88 78 Q87 84 80 84 L20 84 Q13 84 12 78 Z";
      d.path(loaf, d.fill(CRUST), { sw: 3.5 });
      d.clip(loaf, (c) => c.path("M4 70 Q50 78 96 70 L96 90 L4 90 Z", CRUST[0], { stroke: null, op: 0.55 }));
      for (const [x, y] of [[29, 53], [50, 46], [71, 53]]) d.path(leaf(x - 6.4, y + 10.2, 24, -58, 0.25), "#ffe9bd", { sw: 2.2 });
      d.shine(28, 40, 8, 3.6, 0.55, -38);
    },
  ],
  [
    "🥤",
    "cup with straw",
    (d) => {
      d.shadow(50, 92, 22, 4);
      const straw = "M55 34 L61 16 L74 12";
      d.tube(straw, "#ffffff", 6, 2.5);
      d.stroke(straw, { color: P.red[1], sw: 6, dash: "3.4 3.4", cap: "butt" });
      const cup = "M26 44 L31.5 87 Q32 91 36 91 L64 91 Q68 91 68.5 87 L74 44 Z";
      d.path(cup, d.fill(P.red, "h"), { sw: 3.5 });
      d.clip(cup, (c) => c.path("M20 60 Q35 54 50 60 Q65 66 80 60 L80 73 Q65 79 50 73 Q35 67 20 73 Z", "#ffffff", { stroke: null, op: 0.92 }));
      d.path(cup, "none", { sw: 3.5 });
      d.path("M30 38 Q32 27 50 27 Q68 27 70 38 Z", d.fill(P.white), { sw: 3 });
      d.path(rr(21, 36, 58, 9, 4.5), d.fill(P.white, "v"), { sw: 3 });
      d.shine(33, 56, 2.6, 8, 0.6, 8);
    },
  ],
  [
    "🍪",
    "cookie",
    (d) => {
      d.shadow(50, 91, 34, 4.5);
      const ck = lumpy(50, 50, 40, 39, 13, 0.035, 3);
      d.path(ck, d.fill(COOKIE), { sw: 3.5 });
      d.clip(ck, (c) => {
        for (const [x, y, r] of [[31, 44, 2], [62, 38, 1.6], [40, 70, 1.8], [72, 60, 1.5], [52, 58, 1.4], [24, 58, 1.4], [60, 82, 1.4]]) c.circle(x, y, r, COOKIE[2], { stroke: null, op: 0.45 });
      });
      const chips: [number, number, number][] = [[38, 32, 6], [62, 27, 5.2], [72, 46, 6.2], [48, 50, 5.6], [27, 60, 5.4], [56, 70, 6.2], [76, 67, 4.6], [38, 79, 4.6]];
      chips.forEach(([x, y, r], i) => {
        d.path(lumpy(x, y, r, r * 0.86, 6, 0.16, i + 2), d.fill(CHOC), { stroke: null });
        d.circle(x - r * 0.3, y - r * 0.32, r * 0.28, "#ffffff", { stroke: null, op: 0.35 });
      });
      d.shine(26, 34, 8, 4, 0.5, -45);
    },
  ],
  [
    "🍬",
    "candy",
    (d) => {
      d.g("rotate(-24 50 50)", (g) => {
        const fan = (h: Pen) => {
          h.path("M31 46 L12 29 Q7 35 10.5 41 Q5.5 46 9.5 51 Q5.5 56 10.5 61 Q7 66 12 71 L31 54 Z", h.fill(P.rose, "h"), { sw: 3 });
          h.stroke("M30 50 L11 45 M30 50 L11 57", { sw: 2, color: P.pink[2] });
          h.path(rr(27, 44, 7, 12, 3), h.fill(P.pink, "v"), { sw: 2.6 });
        };
        fan(g);
        g.mirror(50, fan);
        const body = "M50 32 C63 32 72 40 72 50 C72 60 63 68 50 68 C37 68 28 60 28 50 C28 40 37 32 50 32 Z";
        g.path(body, g.fill(P.pink), { sw: 3.5 });
        g.clip(body, (c) => {
          for (let i = -3; i <= 3; i++) c.stroke(`M${40 + i * 11} 26 L${60 + i * 11} 74`, { color: "#ffffff", sw: 4.5, op: 0.85 });
        });
        g.path(body, "none", { sw: 3.5 });
        g.shine(41, 39, 5, 2.6, 0.7, -20);
      });
    },
  ],
  [
    "🥄",
    "spoon",
    (d) => {
      d.g("rotate(40 50 50)", (g) => {
        g.path("M46 44 Q47 57 45 66 L43.2 90 Q43.2 98 50 98 Q56.8 98 56.8 90 L55 66 Q53 57 54 44 Z", g.fill(P.silver, "h"), { sw: 3 });
        g.ellipse(50, 25, 18, 23, g.rad([[0, P.silver[0]], [0.55, P.silver[1]], [1, P.silver[2]]], 0.25, 0.45, 0.9), { sw: 3.5 });
        g.ellipse(51, 27.5, 12.5, 17, g.lin([[0, P.steel[1]], [0.55, P.silver[1]], [1, "#ffffff"]], 0, 0, 0.4, 1), { stroke: null, op: 0.75 });
        g.shine(40, 22, 2.8, 8.5, 0.85, 4);
        g.shine(47, 78, 1.3, 7.5, 0.8, -3);
      });
    },
  ],
  [
    "🥛",
    "glass of milk",
    (d) => {
      d.shadow(50, 92, 24, 4);
      const glass = "M24 13 L30 86 Q30.6 91 36 91 L64 91 Q69.4 91 70 86 L76 13 Z";
      d.path(glass, "#e4f4ff", { stroke: null });
      d.clip(glass, (c) => {
        c.path("M10 28 L90 28 L90 100 L10 100 Z", c.lin([[0, "#ffffff"], [0.62, "#f6f8fb"], [1, "#d3dce7"]], 0, 0, 1, 0), { stroke: null });
        c.stroke("M30 83 Q50 86.5 70 83", { sw: 2, color: P.white[2] });
      });
      d.ellipse(50, 28, 24.8, 4.6, "#ffffff", { sw: 2, stroke: P.white[2] });
      d.path(glass, "none", { sw: 3.5 });
      d.ellipse(50, 13, 26, 4.8, "#f2faff", { sw: 3 });
      d.shine(34.5, 52, 2.4, 21, 0.9, -4);
    },
  ],
  [
    "🌰",
    "chestnut",
    (d) => {
      d.shadow(50, 91, 30, 4.5);
      const nut = "M50 14 Q53 21 62 25 Q86 32 87 57 Q88 78 70 86 Q60 90 50 90 Q40 90 30 86 Q12 78 13 57 Q14 32 38 25 Q47 21 50 14 Z";
      d.path(nut, d.fill(NUT), { sw: 3.5 });
      d.clip(nut, (c) => {
        c.path("M6 68 Q50 78 94 68 L94 96 L6 96 Z", c.fill(P.tan, "v"), { sw: 2.4 });
        for (const [x, y] of [[26, 77], [36, 81], [47, 83], [58, 83], [69, 80], [78, 75], [31, 86], [42, 88], [53, 88], [64, 87]]) c.circle(x, y, 1.2, P.tan[2], { stroke: null });
      });
      d.path(nut, "none", { sw: 3.5 });
      d.path("M47.5 15 Q50 6 52.5 15 Z", P.tan[1], { sw: 2 });
      d.shine(31, 40, 6, 12, 0.6, 28);
    },
  ],
  [
    "🥣",
    "bowl",
    (d) => {
      d.shadow(50, 92, 30, 4.5);
      d.ellipse(50, 46, 41, 10, d.fill(P.sky, "v"), { sw: 3.5 });
      d.tube("M60 46 L84 13", P.silver[1], 6.5, 2.6);
      d.shine(80, 19, 1.2, 4, 0.9, 36);
      d.ellipse(50, 47.5, 36, 7.4, "#ffffff", { sw: 2, stroke: P.white[2] });
      for (const [x, y] of [[30, 46], [41, 49.5], [53, 45], [64, 49.5], [74, 46.5], [46, 43.5], [35, 51]]) {
        d.circle(x, y, 3.2, P.gold[1], { sw: 1.4, stroke: P.orange[2] });
        d.circle(x, y, 1, "#fff6dc", { stroke: null });
      }
      const front = "M9 46 A41 10 0 0 0 91 46 C91 74 74 89 50 89 C26 89 9 74 9 46 Z";
      d.path(front, d.fill(P.blue, "v"), { sw: 3.5 });
      d.clip(front, (c) => c.path("M4 64 Q50 76 96 64 L96 70 Q50 82 4 70 Z", "#ffffff", { stroke: null, op: 0.85 }));
      d.path(front, "none", { sw: 3.5 });
      d.shine(23, 63, 7, 3, 0.55, 30);
    },
  ],
  [
    "🍯",
    "honey jar",
    (d) => {
      d.shadow(50, 92, 33, 4.5);
      const jar = "M28 38 Q12 47 13 66 Q14 90 50 90 Q86 90 87 66 Q88 47 72 38 Z";
      d.path(jar, d.fill(HONEY), { sw: 3.5 });
      d.path(rr(27, 29, 46, 12, 5), d.fill(HONEY, "v"), { sw: 3 });
      d.path("M25 29 H75 V35 Q75 44 70.5 44 Q66 44 66 38.5 Q63 35 59 38 V48 Q59 53 54.5 53 Q50 53 50 48 V38 Q45.5 35 41 38 Q41 42 36.5 42 Q32 42 32 37 Q30 34 25 34 Z", d.fill(P.gold, "v"), { sw: 2.4 });
      d.path(rr(22, 17, 56, 14, 6), d.fill(P.wood, "v"), { sw: 3 });
      d.stroke("M28 24 H72", { sw: 2, color: P.wood[2] });
      d.circle(50, 68, 11, d.fill(P.cream), { sw: 2.4 });
      d.path("M50 61.5 L55.6 64.75 L55.6 71.25 L50 74.5 L44.4 71.25 L44.4 64.75 Z", d.fill(P.gold), { sw: 2 });
      d.shine(25, 58, 4, 10, 0.55, 20);
    },
  ],
  [
    "🥕",
    "carrot",
    (d) => {
      d.g("rotate(38 50 52)", (g) => {
        g.path(leaf(50, 30, 24, -122, 0.36), g.fill(P.green, "v"), { sw: 2.6 });
        g.path(leaf(50, 30, 24, -58, 0.36), g.fill(P.green, "v"), { sw: 2.6 });
        g.path(leaf(50, 30, 28, -90, 0.36), g.fill(P.green, "v"), { sw: 2.6 });
        const body = "M33 33 Q33 25 50 25 Q67 25 67 33 Q66 62 53.5 93 Q50 99 46.5 93 Q34 62 33 33 Z";
        g.path(body, g.fill(P.orange, "h"), { sw: 3.5 });
        g.stroke("M36 45 Q40 47 44 46 M56 53 Q60 54 63 52 M39 63 Q42.5 65 46 64 M55 73 Q57.5 74 60 72 M45 83 Q47 84 49 83", { sw: 2.2, color: P.orange[2] });
        g.shine(40, 40, 2.6, 9, 0.6, 2);
      });
    },
  ],
  [
    "🎂",
    "birthday cake",
    (d) => {
      d.ellipse(50, 86, 44, 7, d.fill(P.white, "v"), { sw: 3 });
      const body = "M16 52 V77 Q16 88 50 88 Q84 88 84 77 V52 Z";
      d.path(body, d.fill(P.pink, "h"), { sw: 3.5 });
      for (const [x, y, c] of [[24, 74, P.gold[1]], [35, 80, P.sky[1]], [50, 77, "#ffffff"], [64, 81, P.lime[1]], [76, 74, P.gold[1]], [42, 70, P.sky[1]], [58, 70, P.gold[1]]] as const) d.circle(x, y, 2.3, c, { sw: 1.4 });
      const top = arcPts(50, 52, 34, 9, 180, 360, 10);
      const dripPts: [number, number][] = [
        [84, 58], [81, 63], [76.5, 61.5], [72, 63], [70.5, 70], [67.5, 72.5], [64.5, 70], [63.5, 64], [57, 64.5], [52, 65.5], [49.5, 72], [46, 74.5], [42.5, 72], [41, 65], [35, 63.5], [31, 63], [29, 68], [26, 70], [23, 67.5], [22.5, 62], [18, 59.5],
      ];
      d.path(smooth([...top, ...dripPts], 0.16), d.fill(P.cream), { sw: 3 });
      d.stroke("M22 58 Q50 66 78 58", { sw: 1.8, color: P.cream[2], op: 0.8 });
      for (const [x, c] of [[34, P.sky], [50, P.lemon], [66, P.lime]] as const) {
        d.path(rr(x - 3.6, 27, 7.2, 25, 2.6), d.fill(c, "h"), { sw: 2.4 });
        d.clip(rr(x - 3.6, 27, 7.2, 25, 2.6), (cl) => {
          for (let k = 0; k < 4; k++) cl.stroke(`M${x - 5} ${31 + k * 6.5} L${x + 5} ${27 + k * 6.5}`, { color: "#ffffff", sw: 2.2, op: 0.9 });
        });
        d.stroke(`M${x} 27 V23`, { sw: 1.8 });
        d.glow(x, 17, 8, "#ffd75e", 0.55);
        d.path(`M${x} 9.5 Q${x + 5} 15.5 ${x + 4} 19 A4 4 0 0 1 ${x - 4} 19 Q${x - 5} 15.5 ${x} 9.5 Z`, d.rad([[0, "#fff6b0"], [0.55, "#ffcf3a"], [1, "#ff8a2a"]], 0.5, 0.7, 0.7), { sw: 2 });
      }
      d.shine(23, 63, 2.6, 7, 0.45, 0);
    },
  ],
  [
    "🧂",
    "salt shaker",
    (d) => {
      d.shadow(50, 92, 24, 4);
      const body = "M29 44 L26 84 Q26 91 33 91 L67 91 Q74 91 74 84 L71 44 Z";
      d.path(body, "#e6f5ff", { stroke: null });
      d.clip(body, (c) => {
        c.path("M18 58 Q50 63 82 58 L82 96 L18 96 Z", c.lin([[0, "#ffffff"], [0.6, "#f5f7fa"], [1, "#d5dde7"]], 0, 0, 1, 0), { stroke: null });
        for (const [x, y] of [[34, 66], [44, 70], [56, 67], [64, 73], [38, 78], [50, 80], [61, 84], [31, 86], [45, 87]]) c.rect(x - 1, y - 1, 2, 2, 0.5, P.white[2], { stroke: null });
      });
      d.path(body, "none", { sw: 3.5 });
      d.path("M28.5 41 Q28 15 50 14 Q72 15 71.5 41 Z", d.fill(P.silver), { sw: 3.5 });
      for (const [x, y] of [[50, 22], [41, 27], [59, 27], [45.5, 34], [54.5, 34]]) d.circle(x, y, 2, OL, { stroke: null });
      d.path(rr(25.5, 38, 49, 8, 3), d.fill(P.steel, "v"), { sw: 3 });
      d.shine(35, 23, 3, 6, 0.75, 30);
      d.shine(31.5, 66, 1.8, 13, 0.85, 4);
    },
  ],
  [
    "🥦",
    "broccoli",
    (d) => {
      d.shadow(50, 92, 20, 4);
      d.tube("M50 76 L32 56 M50 74 L68 56 M50 77 L50 54", P.lime[1], 9, 3);
      d.path("M39.5 92 Q42 76 42.5 62 L57.5 62 Q58 76 60.5 92 Q50 95.5 39.5 92 Z", d.fill(P.lime, "h"), { sw: 3.5 });
      const florets: [number, number, number, number, number][] = [[50, 27, 19, 14, 1], [30, 41, 17, 14, 2], [70, 41, 17, 14, 3], [50, 49, 19, 13, 4]];
      for (const [x, y, rx, ry, s] of florets) {
        d.path(bumpy(x, y, rx, ry, 9, 0.55, s * 17), d.fill(P.green), { sw: 3 });
        for (const [px, py] of [[-6, -4], [5, 2]]) d.circle(x + px, y + py, 2.2, P.lime[0], { stroke: null, op: 0.55 });
      }
      d.shine(41, 20, 6.5, 3, 0.5, -30);
    },
  ],
  [
    "🍋",
    "lemon",
    (d) => {
      d.shadow(50, 88, 32, 4.5);
      d.g("rotate(-28 50 52)", (g) => {
        const lem = "M8 52 Q9 45.5 17 44 Q26 23 50 23 Q74 23 83 44 Q91 45.5 92 52 Q91 58.5 83 60 Q74 81 50 81 Q26 81 17 60 Q9 58.5 8 52 Z";
        g.path(lem, g.rad([[0, P.lemon[0]], [0.55, P.lemon[1]], [1, P.lemon[2]]], 0.45, 0.22, 0.85), { sw: 3.5 });
        for (const [x, y] of [[30, 58], [40, 66], [56, 68], [66, 60], [72, 50], [60, 40], [46, 52], [36, 46], [52, 32], [24, 50]]) g.circle(x, y, 1.1, P.lemon[2], { stroke: null, op: 0.5 });
        g.shine(44, 31, 10, 3.6, 0.7, 4);
      });
    },
  ],
  [
    "🍌",
    "banana",
    (d) => {
      const arc = [39.8, 23.6, 46, 132, 12] as const;
      const at = (t: number, off = 0) => onArc(...arc, t, off);
      d.shadow(48, 90, 32, 4);
      const [ex, ey] = at(1);
      d.tube(`M${r2(ex - 0.8)} ${r2(ey + 2)} L${r2(ex + 3)} ${r2(ey - 13)}`, P.lime[2], 6.5, 2.6);
      d.circle(ex + 3.2, ey - 13.6, 3.4, d.fill(P.brown), { sw: 2 });
      d.path(arcSweep(...arc, (t) => 3 + 12.5 * Math.sin(Math.PI * t) ** 0.75 + 2.5 * t), d.fill(P.gold), { sw: 3.5 });
      const ridge: [number, number][] = [];
      for (let i = 0; i <= 8; i++) ridge.push(at(0.12 + i * 0.095, 5));
      d.stroke(curve(ridge, 0.2), { sw: 2.2, color: P.gold[2], op: 0.75 });
      const [tx, ty] = at(0);
      d.circle(tx + 0.5, ty, 3.6, d.fill(P.brown), { sw: 2 });
      const [sx, sy] = at(0.6, -7);
      d.shine(sx, sy, 10, 2.6, 0.6, -30);
    },
  ],
  [
    "🥫",
    "tin can",
    (d) => {
      d.shadow(50, 92, 31, 4.5);
      const body = "M22 20 V82 A28 7 0 0 0 78 82 V20 Z";
      d.path(body, d.fill(P.silver, "h"), { sw: 3.5 });
      d.clip(body, (c) => {
        c.path("M22 33 A28 7 0 0 0 78 33 V70 A28 7 0 0 1 22 70 Z", c.fill(P.red, "h"), { sw: 2.6 });
        c.path("M22 45 A28 7 0 0 0 78 45 V56 A28 7 0 0 1 22 56 Z", "#ffffff", { stroke: null, op: 0.95 });
        c.path("M22 26 A28 7 0 0 0 78 26", "none", { sw: 2, stroke: P.silver[2] });
        c.path("M22 78 A28 7 0 0 0 78 78", "none", { sw: 2, stroke: P.silver[2] });
      });
      d.path(body, "none", { sw: 3.5 });
      d.ellipse(50, 20, 28, 7, d.fill(P.silver), { sw: 3.5 });
      d.ellipse(50, 20.5, 21.5, 4.6, d.lin([[0, P.steel[1]], [1, P.silver[0]]]), { sw: 2 });
      d.shine(29.5, 52, 2.4, 14, 0.7, 0);
    },
  ],
  [
    "🍓",
    "strawberry",
    (d) => {
      const body = "M50 92 C34 87 13 67 14 45 C15 31 28 26 50 30 C72 26 85 31 86 45 C87 67 66 87 50 92 Z";
      d.path(body, d.fill(P.red), { sw: 3.5 });
      d.clip(body, (c) => {
        for (let row = 0; row < 6; row++) {
          for (let col = 0; col < 7; col++) c.ellipse(20 + col * 10 + (row % 2 ? 5 : 0), 43 + row * 9, 1.6, 2.4, "#ffe68a", { stroke: null });
        }
      });
      d.path(body, "none", { sw: 3.5 });
      d.path(starXY(50, 31, 25, 12, 8, 5, 6, 0), d.fill(P.green, "v"), { sw: 2.6 });
      d.tube("M50 29 Q50 19 56 12", P.forest[1], 4, 2.4);
      d.shine(29, 47, 5, 10, 0.55, 22);
    },
  ],
  [
    "🍇",
    "grapes",
    (d) => {
      d.tube("M50 28 Q49 16 56 8", P.brown[1], 4.2, 2.4);
      const gs: [number, number][] = [[27, 36], [43, 33], [59, 33], [74, 37], [35, 51], [51, 49], [67, 52], [43, 66], [59, 66], [51, 81]];
      for (const [x, y] of gs) {
        d.circle(x, y, 10, d.fill(P.purple), { sw: 2.8 });
        d.shine(x - 4, y - 4.2, 2.8, 1.6, 0.65, -35);
      }
      d.path(leaf(55, 20, 28, -12, 0.42), d.fill(P.green, "d"), { sw: 2.6 });
      d.stroke("M57 19.5 Q68 17 80 14", { sw: 1.6, color: P.green[2] });
    },
  ],
  [
    "🍕",
    "pizza",
    (d) => {
      const slice = "M16 28 Q50 17 84 28 L55.5 86 Q50 95 44.5 86 Z";
      d.path(slice, d.fill(P.gold), { sw: 3.5 });
      for (const [x, y, r] of [[37, 43, 7.5], [62, 44, 7], [50, 65, 6.5]]) {
        d.circle(x, y, r, d.fill(P.red), { sw: 2.4 });
        d.circle(x - r * 0.25, y + r * 0.3, r * 0.15, P.red[2], { stroke: null, op: 0.7 });
        d.circle(x + r * 0.35, y - r * 0.1, r * 0.12, P.red[2], { stroke: null, op: 0.7 });
      }
      d.path("M10 26 Q50 9 90 26 Q93 33 86 36 Q50 23 14 36 Q7 33 10 26 Z", d.fill(CRUST, "v"), { sw: 3.5 });
      d.shine(26, 26, 8, 2.6, 0.55, -14);
    },
  ],
  [
    "🧃",
    "juice box",
    (d) => {
      d.shadow(50, 92, 30, 4.5);
      d.path("M62 33 L78 25 V83 L62 91 Z", d.lin([[0, P.green[1]], [1, P.green[2]]], 0, 0, 1, 0), { sw: 3 });
      d.path(rr(22, 33, 40, 58, 3), d.fill(P.green, "v"), { sw: 3.5 });
      d.path("M22 33 L38 25 H78 L62 33 Z", d.fill(P.lime, "h"), { sw: 3 });
      d.tube("M54 29 L57 10 L66 6", "#ffffff", 4.6, 2.4);
      d.path(rr(27, 45, 30, 36, 7), "#ffffff", { sw: 2.4 });
      d.ball(42, 66, 9.5, P.orange, { sw: 2.4 });
      d.path(leaf(43, 56.5, 10, -40, 0.45), d.fill(P.green, "d"), { sw: 2 });
      d.shine(27, 40, 2.4, 3, 0.4, 0);
    },
  ],
  [
    "☕",
    "mug",
    (d) => {
      d.shadow(45, 91, 31, 4.5);
      steam(d, [34, 45, 56], 13, 33);
      d.tube("M68 52 Q87 50 87 64 Q87 78 68 78", P.teal[1], 7, 3);
      const body = "M18 42 V76 Q18 90 32 90 L56 90 Q70 90 70 76 V42 Z";
      d.path(body, d.fill(P.teal, "h"), { sw: 3.5 });
      d.ellipse(44, 42, 26, 6.5, d.fill(P.white), { sw: 3 });
      d.ellipse(44, 43.2, 21.5, 4.4, d.fill(CHOC), { stroke: null });
      d.path(rr(33, 37.5, 8.5, 7, 2.2), d.fill(P.white), { sw: 2, tf: "rotate(-12 37 41)" });
      d.path(rr(46, 38.5, 8.5, 7, 2.2), d.fill(P.white), { sw: 2, tf: "rotate(10 50 42)" });
      d.shine(26, 58, 3, 10, 0.5, 6);
    },
  ],
  [
    "🍩",
    "donut",
    (d) => {
      d.shadow(50, 92, 34, 4.5);
      d.path(ring(50, 50, 40, 12), d.fill(CRUST), { sw: 3.5 });
      const pts: [number, number][] = [];
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        const r = [37, 33, 34][i % 3];
        pts.push([50 + Math.cos(a) * r, 50 + Math.sin(a) * r]);
      }
      d.path(`${smooth(pts, 0.2)} M35 50 a15 15 0 1 0 30 0 a15 15 0 1 0 -30 0 Z`, d.fill(P.pink), { sw: 2.8 });
      const cols = ["#ffffff", P.gold[1], P.sky[1], P.lime[1]];
      for (let i = 0; i < 12; i++) {
        const a = ((i * 30 + (i % 2 ? 12 : -6)) * Math.PI) / 180;
        const r = 22 + (i % 3) * 3.5;
        const x = 50 + Math.cos(a) * r;
        const y = 50 + Math.sin(a) * r;
        const t = ((i * 67) % 180) * (Math.PI / 180);
        d.tube(`M${r2(x - Math.cos(t) * 2.8)} ${r2(y - Math.sin(t) * 2.8)} L${r2(x + Math.cos(t) * 2.8)} ${r2(y + Math.sin(t) * 2.8)}`, cols[i % 4], 2.6, 1.2);
      }
      d.shine(31, 31, 8, 3.6, 0.6, -42);
    },
  ],
  [
    "🍭",
    "lollipop",
    (d) => {
      d.tube("M50 62 V91", "#ffffff", 6, 2.6);
      const c = circlePath(50, 37, 30);
      d.path(c, d.fill(P.pink), { sw: 3.5 });
      d.clip(c, (k) => {
        const pts: [number, number][] = [];
        for (let i = 0; i <= 72; i++) {
          const t = (i / 72) * Math.PI * 6;
          const r = 1 + (31 * i) / 72;
          pts.push([50 + Math.cos(t) * r, 37 + Math.sin(t) * r]);
        }
        k.stroke(curve(pts, 0.2), { color: "#ffffff", sw: 5.5, op: 0.95 });
      });
      d.path(c, "none", { sw: 3.5 });
      d.shine(37, 23, 7, 3.6, 0.55, -40);
    },
  ],
  [
    "🥪",
    "sandwich",
    (d) => {
      d.shadow(50, 88, 40, 4.5);
      d.path("M10 52 L60 17 L90 52 Z", d.fill(CRUST, "v"), { sw: 3.5 });
      d.path("M22 52 L59.5 25.5 L80 52 Z", d.fill(P.cream, "v"), { stroke: null });
      const face = "M10 52 H90 V80 Q90 85 85 85 H15 Q10 85 10 80 Z";
      d.path(face, d.fill(P.cream, "v"), { sw: 3.5 });
      d.clip(face, (c) => {
        c.rect(0, 52, 100, 2.6, 0, CRUST[1], { stroke: null });
        c.path("M0 70 H100 V65 Q95 68 90 65 Q85 62 80 65 Q75 68 70 65 Q65 62 60 65 Q55 68 50 65 Q45 62 40 65 Q35 68 30 65 Q25 62 20 65 Q15 68 10 65 Q5 62 0 65 Z", P.red[1], { sw: 2 });
        c.path("M0 66 H100 V59 Q95 64 90 60 Q85 56 80 60 Q75 64 70 60 Q65 56 60 60 Q55 64 50 60 Q45 56 40 60 Q35 64 30 60 Q25 56 20 60 Q15 64 10 60 Q5 56 0 60 Z", d.fill(P.green, "v"), { sw: 2 });
        c.path("M0 69.5 H100 V74 H0 Z", P.gold[1], { sw: 2 });
        c.rect(0, 82, 100, 4, 0, CRUST[1], { stroke: null });
      });
      d.path(face, "none", { sw: 3.5 });
      d.shine(44, 40, 8, 2.6, 0.6, -35);
    },
  ],
  [
    "🍱",
    "lunch tray",
    (d) => {
      d.shadow(50, 90, 42, 4.5);
      d.path(rr(8, 24, 84, 64, 10), d.fill(P.red, "v"), { sw: 3.5 });
      d.path(rr(8, 16, 84, 64, 10), d.fill(P.red), { sw: 3.5 });
      const well = d.lin([[0, "#6e2232"], [1, "#8c3442"]]);
      for (const [x, y, w, h] of [[14, 22, 36, 52], [54, 22, 32, 25], [54, 51, 14, 23], [71, 51, 15, 23]]) d.path(rr(x, y, w, h, 4.5), well, { sw: 2.2 });
      d.path(rr(16.5, 24.5, 31, 47, 3.5), d.fill(P.white), { sw: 1.8 });
      for (const [x, y, a] of [[23, 31, 30], [36, 30, -20], [42, 38, 60], [22, 42, -50], [24, 60, -30], [37, 62, 20], [30, 67, 70], [42, 54, 80], [21, 52, 10], [30, 37, -70]]) d.ellipse(x, y, 2.2, 1.1, P.white[2], { stroke: null, tf: `rotate(${a} ${x} ${y})` });
      d.circle(32, 48, 4.6, d.fill(P.red), { sw: 1.8 });
      for (const [x, y] of [[62, 36], [76, 33], [70, 39]]) d.path(bumpy(x, y, 6.5, 5.5, 7, 0.5), d.fill(P.green), { sw: 2 });
      d.path(rr(56, 54, 10, 17, 2.5), d.fill(P.gold), { sw: 2 });
      d.stroke("M58 59 H64 M58 65 H64", { sw: 1.6, color: P.gold[2] });
      d.ball(78.5, 58.5, 5.2, P.orange, { sw: 2 });
      d.ball(78.5, 68, 5.2, P.orange, { sw: 2 });
      d.shine(20, 19, 10, 2, 0.5, 0);
    },
  ],
  [
    "🥜",
    "peanuts",
    (d) => {
      const shell = "M-15 -12.5 C-6 -12.5 -5 -9 0 -9 C5 -9 6 -14 14 -14 C23 -14 28 -7 28 0 C28 8 23 14 14 14 C6 14 5 9 0 9 C-5 9 -6 12.5 -15 12.5 C-23 12.5 -27.5 6.5 -27.5 0 C-27.5 -6.5 -23 -12.5 -15 -12.5 Z";
      const nut = (g: Pen) => {
        g.path(shell, g.fill(SHELL), { sw: 3 });
        g.clip(shell, (c) => {
          for (let x = -24; x <= 26; x += 6) for (let y = -10; y <= 10; y += 5) c.circle(x + (((y + 10) / 5) % 2 ? 3 : 0), y, 1.1, SHELL[2], { stroke: null, op: 0.6 });
        });
        g.stroke("M0 -9 Q-2.5 0 0 9", { sw: 1.8, color: SHELL[2] });
        g.shine(-17, -6, 5, 2, 0.6, -10);
      };
      d.shadow(50, 88, 34, 4.5);
      d.g("translate(38 38) rotate(28) scale(1.05)", nut);
      d.g("translate(57 57) rotate(-32) scale(1.2)", nut);
    },
  ],
  [
    "🍲",
    "pot of soup",
    (d) => {
      d.shadow(50, 92, 36, 4.5);
      steam(d, [37, 50, 63], 11, 36);
      for (const s of [-1, 1]) d.tube(`M${50 + s * 33} 54 Q${50 + s * 44} 54 ${50 + s * 43} 61 Q${50 + s * 42} 67 ${50 + s * 33} 67`, P.steel[1], 5, 2.6);
      const body = "M13 48 V75 Q13 90 30 90 H70 Q87 90 87 75 V48 Z";
      d.path(body, d.fill(P.steel, "h"), { sw: 3.5 });
      d.ellipse(50, 48, 37, 9, d.fill(P.silver), { sw: 3.5 });
      d.ellipse(50, 49, 32, 6.2, d.fill(P.coral), { stroke: null });
      for (const [x, y, c] of [[34, 48, P.orange], [56, 51, P.orange], [66, 47, P.orange]] as const) d.circle(x, y, 3.2, c[1], { sw: 1.4 });
      for (const [x, y] of [[44, 47], [47, 52], [74, 50], [27, 50], [60, 46]]) d.circle(x, y, 1.9, P.green[1], { sw: 1.2 });
      for (const [x, y] of [[40, 51.5], [52, 46], [70, 52]]) d.rect(x - 2, y - 2, 4, 4, 1, P.cream[1], { sw: 1.2 });
      d.shine(22, 63, 3, 10, 0.5, 4);
    },
  ],
  [
    "🌽",
    "corn",
    (d) => {
      d.g("rotate(32 50 50)", (g) => {
        const cob = "M50 7 C62 7 66 20 66 38 L64.5 74 Q63 86 50 86 Q37 86 35.5 74 L34 38 C34 20 38 7 50 7 Z";
        g.path(cob, g.fill(P.gold, "h"), { sw: 3.5 });
        g.clip(cob, (c) => {
          for (let row = 0; row < 12; row++) {
            for (let col = -3; col <= 3; col++) {
              const x = 50 + col * 7 + (row % 2 ? 3.5 : 0);
              const y = 12 + row * 6.4;
              c.path(rr(x - 3, y - 2.7, 6, 5.4, 2.2), c.fill(P.gold), { sw: 1.3, stroke: P.gold[2] });
            }
          }
          c.path(cob, c.lin([[0, "#ffffff", 0.3], [0.35, "#ffffff", 0], [0.7, P.orange[2], 0], [1, P.orange[2], 0.4]], 0, 0, 1, 0), { stroke: null });
        });
        g.path(cob, "none", { sw: 3.5 });
        g.path("M50 95 Q27 86 25 62 Q24 49 31 39 Q34 64 50 83 Z", g.fill(P.lime, "h"), { sw: 3 });
        g.path("M50 95 Q73 86 75 62 Q76 49 69 39 Q66 64 50 83 Z", g.fill(P.green, "h"), { sw: 3 });
        g.stroke("M30 54 Q32 70 43 83 M70 54 Q68 70 57 83", { sw: 1.8, color: P.forest[2], op: 0.55 });
        g.shine(40.5, 24, 2.6, 9, 0.65, 0);
      });
    },
  ],
  [
    "🍦",
    "ice cream",
    (d) => {
      const cone = "M28.5 56 L71.5 56 L53 93 Q50 98 47 93 Z";
      d.path(cone, d.fill(COOKIE, "h"), { sw: 3.5 });
      d.clip(cone, (c) => {
        for (let i = -4; i <= 6; i++) {
          c.stroke(`M${14 + i * 9} 52 L${44 + i * 9} 100`, { sw: 2, color: COOKIE[2] });
          c.stroke(`M${86 - i * 9} 52 L${56 - i * 9} 100`, { sw: 2, color: COOKIE[2] });
        }
      });
      d.path(cone, "none", { sw: 3.5 });
      d.path(rr(21, 44, 58, 18, 9), d.fill(VANILLA), { sw: 3.2 });
      d.path(rr(27, 31, 46, 17, 8.5), d.fill(VANILLA), { sw: 3.2 });
      d.path(rr(34, 19, 32, 16, 8), d.fill(VANILLA), { sw: 3.2 });
      d.path("M41 22 Q42 9 55 7 Q51 13 57 21 Z", d.fill(VANILLA), { sw: 3 });
      d.stroke("M30 57 Q50 60 70 57 M35 44 Q50 47 65 44 M41 31 Q50 33 59 31", { sw: 1.8, color: VANILLA[2], op: 0.8 });
      d.shine(41, 24, 4.5, 2.2, 0.8, -20);
      d.shine(31, 36, 4, 2, 0.7, -20);
    },
  ],
  [
    "🍳",
    "frying pan",
    (d) => {
      d.tube("M62 60 L85 83", P.ink[1], 9.5, 3);
      d.stroke("M64.5 59.5 L84 79", { sw: 2, color: P.ink[0], op: 0.9 });
      d.circle(84.5, 82.5, 2.3, "#ffffff", { sw: 1.8 });
      d.circle(41, 41, 33, d.fill(P.black), { sw: 3.5 });
      d.circle(41, 41, 27, d.rad([[0, "#4d5268"], [1, "#24273a"]], 0.4, 0.35, 0.8), { sw: 2, stroke: "#1a1c2c" });
      d.path(lumpy(41, 42, 20, 18, 8, 0.1, 5), d.fill(P.white), { sw: 2.6 });
      d.ball(43, 40, 8.5, P.gold, { sw: 2.4 });
      d.shine(21, 26, 7, 2.6, 0.4, -48);
    },
  ],
  [
    "🧁",
    "cupcake",
    (d) => {
      d.shadow(50, 92, 26, 4);
      const wrap = "M24 57 L76 57 L69 89 Q68 92 64.5 92 L35.5 92 Q32 92 31 89 Z";
      d.path(wrap, d.fill(P.sky, "v"), { sw: 3.5 });
      d.clip(wrap, (c) => {
        for (const x of [-3, -1.5, 0, 1.5, 3]) c.stroke(`M${50 + x * 8.6} 57 L${50 + x * 6} 92`, { sw: 2, color: P.sky[2], op: 0.75 });
      });
      d.path(wrap, "none", { sw: 3.5 });
      d.path(rr(17, 45, 66, 18, 9), d.fill(P.pink), { sw: 3.2 });
      d.path(rr(25, 31, 50, 17, 8.5), d.fill(P.pink), { sw: 3.2 });
      d.path("M36 34 Q36 21 50 21 Q64 21 64 34 Z", d.fill(P.pink), { sw: 3.2 });
      const cols = ["#ffffff", P.gold[1], P.sky[1], P.lime[1]];
      [[26, 53, 30], [40, 57, -40], [57, 55, 60], [72, 52, -20], [34, 39, -60], [50, 42, 20], [64, 38, 70], [45, 29, 40]].forEach(([x, y, a], i) => {
        const t = (a * Math.PI) / 180;
        d.tube(`M${r2(x - Math.cos(t) * 2.6)} ${r2(y - Math.sin(t) * 2.6)} L${r2(x + Math.cos(t) * 2.6)} ${r2(y + Math.sin(t) * 2.6)}`, cols[i % 4], 2.4, 1.2);
      });
      d.tube("M51 15 Q52 8 58 5", P.forest[1], 2.6, 2);
      d.ball(50, 18, 6.8, P.red, { sw: 2.6 });
      d.shine(27, 49, 5, 2, 0.6, -15);
    },
  ],
  [
    "🥗",
    "salad",
    (d) => {
      d.shadow(50, 92, 34, 4.5);
      d.ellipse(50, 52, 42, 10, d.fill(P.wood, "v"), { sw: 3.5 });
      for (const [x, y, len, a, c] of [[30, 52, 28, -128, P.green], [70, 52, 28, -52, P.green], [42, 52, 32, -104, P.lime], [58, 52, 32, -76, P.forest], [50, 52, 30, -90, P.green]] as const) d.path(leaf(x, y, len, a, 0.48), d.fill(c, "v"), { sw: 2.6 });
      for (const [x, y] of [[28, 44], [62, 34]]) {
        d.circle(x, y, 7.5, d.fill(P.red), { sw: 2.2 });
        d.circle(x, y, 4.2, P.red[0], { stroke: null, op: 0.6 });
        for (const a of [0, 120, 240]) d.circle(x + Math.cos((a * Math.PI) / 180) * 2.4, y + Math.sin((a * Math.PI) / 180) * 2.4, 1, "#fff3a8", { stroke: null });
      }
      for (const [x, y] of [[46, 38], [74, 45]]) {
        d.circle(x, y, 7, P.forest[1], { sw: 2.2 });
        d.circle(x, y, 5, "#e9fbc6", { stroke: null });
        for (const a of [30, 150, 270]) d.circle(x + Math.cos((a * Math.PI) / 180) * 2.2, y + Math.sin((a * Math.PI) / 180) * 2.2, 0.9, P.lime[2], { stroke: null });
      }
      const front = "M8 52 A42 10 0 0 0 92 52 C92 77 74 90 50 90 C26 90 8 77 8 52 Z";
      d.path(front, d.fill(P.wood, "v"), { sw: 3.5 });
      d.stroke("M14 66 Q50 80 86 66", { sw: 2, color: P.wood[2], op: 0.6 });
      d.shine(22, 64, 7, 3, 0.45, 28);
    },
  ],
  [
    "🧀",
    "cheese",
    (d) => {
      d.shadow(50, 89, 42, 4.5);
      const hole = d.rad([[0, "#c27f00"], [1, "#f5bb22"]], 0.3, 0.25, 0.95);
      const rind = "M76 52 L90 34 V66 Q90 68 88.5 70 L76 85 Z";
      d.path(rind, d.lin([[0, P.gold[1]], [1, P.gold[2]]], 0, 0, 1, 0), { sw: 3 });
      const top = "M10 52 L90 34 L76 52 Z";
      d.path(top, d.fill(P.lemon, "d"), { sw: 3 });
      d.ellipse(58, 45, 4.5, 1.8, hole, { stroke: null });
      d.ellipse(76, 41, 3.2, 1.4, hole, { stroke: null });
      const front = "M10 52 H76 V82 Q76 85 73 85 H13 Q10 85 10 82 Z";
      d.path(front, d.fill(P.gold, "v"), { sw: 3.5 });
      d.clip(front, (c) => {
        for (const [x, y, r] of [[27, 68, 6.5], [47, 75, 4.5], [61, 62, 5.5], [38, 57, 3], [69, 79, 3.2], [52, 52, 5], [14, 81, 4]]) c.circle(x, y, r, hole, { stroke: null });
      });
      d.path(front, "none", { sw: 3.5 });
      d.shine(20, 60, 2.4, 7, 0.55, 0);
    },
  ],
  [
    "🍊",
    "orange",
    (d) => {
      d.shadow(50, 92, 30, 4.5);
      const o = circlePath(50, 55, 37);
      d.path(o, d.fill(P.orange), { sw: 3.5 });
      d.clip(o, (c) => {
        for (const [x, y] of [[34, 56], [42, 66], [55, 72], [66, 62], [72, 48], [62, 40], [48, 50], [30, 70], [44, 82], [62, 82], [76, 70], [56, 58], [38, 44], [70, 34]]) c.circle(x, y, 1.2, P.orange[2], { stroke: null, op: 0.4 });
      });
      d.path(o, "none", { sw: 3.5 });
      d.path(leaf(53, 19.5, 24, -24, 0.42), d.fill(P.green, "d"), { sw: 2.6 });
      d.stroke("M55 18.5 Q65 15 74 11", { sw: 1.6, color: P.green[2] });
      d.path(starXY(50, 19.5, 6, 3.4, 2.4, 1.4, 5, -90), d.fill(P.forest), { sw: 1.8 });
      d.shine(35, 38, 9, 5, 0.55, -35);
    },
  ],
  [
    "🍫",
    "chocolate bar",
    (d) => {
      d.shadow(50, 92, 28, 4);
      d.g("rotate(-16 50 52)", (g) => {
        g.path(rr(28, 9, 44, 60, 5), g.fill(CHOC), { sw: 3.5 });
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 2; c++) {
            const x = 31.5 + c * 19;
            const y = 12.5 + r * 15;
            g.path(rr(x, y, 17, 12.5, 2.5), g.lin([[0, CHOC[0]], [0.45, CHOC[1]], [1, CHOC[2]]], 0, 0, 1, 1), { sw: 1.8, stroke: CHOC[2] });
            g.stroke(`M${x + 3} ${y + 3} H${x + 12}`, { sw: 1.6, color: CHOC[0], op: 0.7 });
          }
        }
        g.path("M27 58 L32 53 L37 58 L42 53 L47 58 L52 53 L57 58 L62 53 L67 58 L73 53 V64 H27 Z", g.fill(P.silver, "v"), { sw: 2.4 });
        g.path("M25 60 H75 V86 Q75 92 69 92 H31 Q25 92 25 86 Z", g.fill(P.red, "h"), { sw: 3.5 });
        g.path("M25 70 H75 V77 H25 Z", g.fill(P.gold, "v"), { sw: 2.2 });
        g.shine(31.5, 18, 1.6, 4, 0.6, 0);
      });
    },
  ],
  [
    "🍰",
    "slice of cake",
    (d) => {
      d.shadow(52, 89, 42, 4.5);
      const yTop = (x: number) => r2(60 - 0.225 * (x - 10));
      const front = "M10 60 L90 42 V68 L13 85.4 Q10 86 10 83 Z";
      d.path(front, SPONGE[1], { sw: 3.5 });
      d.clip(front, (c) => {
        const band = (a: number, b: number, fill: string) => c.path(`M0 ${yTop(0) + a} L100 ${yTop(100) + a} L100 ${yTop(100) + b} L0 ${yTop(0) + b} Z`, fill, { stroke: null });
        band(0, 4.5, P.cream[1]);
        band(4.5, 12, SPONGE[0]);
        band(12, 15.5, "#ffffff");
        band(15.5, 18.5, P.red[1]);
        band(18.5, 30, SPONGE[1]);
      });
      d.path(front, "none", { sw: 3.5 });
      d.path("M10 60 L46 26 Q74 24 90 42 Z", d.fill(P.cream, "v"), { sw: 3.5 });
      for (const [x, y] of [[52, 31], [79, 36.5]]) d.path(bumpy(x, y, 6, 3.4, 7, 0.45), d.fill(P.white), { sw: 2 });
      d.path(bumpy(66, 33, 7.5, 3.8, 8, 0.45), d.fill(P.white), { sw: 2 });
      d.path("M66 36 C59.5 34 55.5 27 56.5 21.5 C57.5 17.5 61.5 16.5 66 18.5 C70.5 16.5 74.5 17.5 75.5 21.5 C76.5 27 72.5 34 66 36 Z", d.fill(P.red), { sw: 2.6 });
      for (const [x, y] of [[62, 24], [70, 24], [66, 29], [61, 30], [71, 30]]) d.ellipse(x, y, 0.9, 1.3, "#ffe68a", { stroke: null });
      d.path(starXY(66, 18.5, 7.5, 3.4, 2.8, 1.6, 5, 0), d.fill(P.green), { sw: 1.8 });
      d.shine(31, 46, 9, 2.6, 0.6, -40);
    },
  ],
  [
    "🍒",
    "cherries",
    (d) => {
      d.shadow(50, 92, 33, 4);
      d.tube("M32 54 Q36 31 55 14", P.forest[1], 3.6, 2.4);
      d.tube("M68 58 Q69 35 55 14", P.forest[1], 3.6, 2.4);
      d.path(leaf(55, 14, 25, -15, 0.42), d.fill(P.green, "d"), { sw: 2.6 });
      d.stroke("M57 13.5 Q67 11.5 77 8.5", { sw: 1.6, color: P.green[2] });
      d.ball(31, 70, 18, P.red, { sw: 3.5 });
      d.ball(68, 73, 18, P.red, { sw: 3.5 });
      d.stroke("M27.5 54.5 Q31.5 57 35.5 54.5 M64.5 57.5 Q68.5 60 72.5 57.5", { sw: 2, color: P.red[2] });
    },
  ],
  [
    "🍉",
    "watermelon",
    (d) => {
      d.shadow(50, 90, 34, 4);
      const w = "M50 10 L90 70 A56 56 0 0 1 10 70 Z";
      d.path(w, d.fill(P.forest), { sw: 3.5 });
      d.clip(w, (c) => {
        c.circle(50, 30.8, 51, "#e2f8b8", { stroke: null });
        c.circle(50, 30.8, 47, c.rad([[0, "#ff9aa0"], [0.55, P.red[1]], [1, "#e23a50"]], 0.5, 0.2, 0.9), { stroke: null });
        for (const [x, y, a] of [[50, 36, 0], [41, 49, -14], [59, 49, 14], [32, 62, -24], [50, 63, 0], [68, 62, 24], [41, 75, -12], [59, 75, 12]]) {
          c.ellipse(x, y, 1.7, 2.8, OL, { stroke: null, tf: `rotate(${a} ${x} ${y})` });
          c.circle(x - 0.5, y - 1, 0.6, "#ffffff", { stroke: null, op: 0.8 });
        }
      });
      d.path(w, "none", { sw: 3.5 });
      d.shine(40, 32, 2.2, 8, 0.55, 33);
    },
  ],
  [
    "🧈",
    "butter",
    (d) => {
      d.shadow(50, 81, 44, 4.5);
      d.ellipse(50, 63, 44, 14, d.fill(P.sky, "v"), { sw: 3.5 });
      d.ellipse(50, 61.5, 35, 9.5, d.lin([[0, P.sky[1]], [1, P.sky[0]]]), { sw: 2, stroke: P.sky[2] });
      d.path("M66 38 L79 28 V52 L66 62 Z", d.lin([[0, BUTTER[1]], [1, BUTTER[2]]], 0, 0, 1, 0), { sw: 3 });
      d.path("M23 38 L36 28 H79 L66 38 Z", d.fill(BUTTER, "h"), { sw: 3 });
      d.path("M23 38 H66 V62 H23 Z", d.fill(BUTTER, "v"), { sw: 3.5 });
      d.shine(31, 44, 2, 6, 0.6, 0);
    },
  ],
  [
    "🔪",
    "kitchen knife",
    (d) => {
      d.g("rotate(40 50 50)", (g) => {
        g.path("M42 56 V15 Q42 7 47 6.5 Q60 18 60 42 V56 Z", g.fill(P.silver, "h"), { sw: 3.5 });
        g.stroke("M55.5 54 V43 Q55.5 25 47.5 12", { sw: 1.6, color: P.silver[2], op: 0.8 });
        g.path(rr(40.5, 53, 21, 8, 3), g.fill(P.steel, "h"), { sw: 2.8 });
        g.path(rr(42, 60, 17, 34, 6.5), g.fill(P.wood, "h"), { sw: 3.5 });
        g.circle(50.5, 70, 2.2, g.fill(P.silver), { sw: 1.6 });
        g.circle(50.5, 83, 2.2, g.fill(P.silver), { sw: 1.6 });
        g.shine(46, 29, 1.8, 10, 0.85, 0);
      });
    },
  ],
  [
    "🥔",
    "potato",
    (d) => {
      d.shadow(50, 86, 36, 4.5);
      d.g("rotate(-14 50 52)", (g) => {
        const pt = lumpy(50, 52, 40, 28, 9, 0.07, 6);
        g.path(pt, g.fill(P.wood), { sw: 3.5 });
        for (const [x, y, r] of [[28, 52, 1.4], [40, 60, 1.2], [56, 66, 1.4], [70, 52, 1.2], [60, 44, 1.1], [48, 46, 1.2], [76, 62, 1.1], [34, 64, 1]]) g.circle(x, y, r, P.wood[2], { stroke: null, op: 0.5 });
        for (const [x, y] of [[37, 42], [64, 37], [72, 61], [45, 68]]) {
          g.ellipse(x, y, 2.2, 1.5, P.wood[2], { stroke: null });
          g.ellipse(x - 0.5, y - 0.6, 1, 0.6, "#ffffff", { stroke: null, op: 0.4 });
        }
        g.shine(33, 39, 10, 3.6, 0.5, -15);
      });
    },
  ],
  [
    "🍟",
    "french fries",
    (d) => {
      d.shadow(50, 93, 26, 4);
      for (const [x, top, a] of [[31, 24, -9], [39, 15, -5], [47, 20, -1], [55, 12, 3], [63, 18, 7], [70, 26, 11], [43, 28, -3], [59, 27, 5]]) d.path(rr(x - 3.6, top, 7.2, 50, 2), d.fill(P.gold, "h"), { sw: 2.4, tf: `rotate(${a} ${x} 76)` });
      const carton = "M21 46 Q50 59 79 46 L71.5 90 Q71 93 67.5 93 L32.5 93 Q29 93 28.5 90 Z";
      d.path(carton, d.fill(P.red, "h"), { sw: 3.5 });
      d.clip(carton, (c) => c.path("M10 69 Q50 81 90 69 L90 75 Q50 87 10 75 Z", "#ffffff", { stroke: null, op: 0.9 }));
      d.path(carton, "none", { sw: 3.5 });
      d.shine(29, 60, 2.6, 8, 0.5, 8);
    },
  ],
  [
    "🍵",
    "cup of tea",
    (d) => {
      d.shadow(50, 91, 34, 4.5);
      steam(d, [42, 58], 14, 40);
      d.ellipse(50, 85, 38, 7, d.fill(P.wood, "v"), { sw: 3 });
      const cup = "M19 44 L21.5 72 Q23.5 86 50 86 Q76.5 86 78.5 72 L81 44 Z";
      d.path(cup, d.fill(P.green, "h"), { sw: 3.5 });
      d.clip(cup, (c) => c.path("M10 58 Q50 66 90 58 L90 64 Q50 72 10 64 Z", P.lime[0], { stroke: null, op: 0.75 }));
      d.path(cup, "none", { sw: 3.5 });
      d.path(leaf(43, 76, 14, -40, 0.42), P.lime[0], { stroke: null, op: 0.85 });
      d.ellipse(50, 44, 31, 7.5, d.fill(P.white), { sw: 3 });
      d.ellipse(50, 45.3, 26, 5, d.fill(TEA), { stroke: null });
      d.shine(27, 58, 2.6, 9, 0.5, 4);
    },
  ],
  [
    "🍴",
    "fork and knife",
    (d) => {
      d.g("translate(50 50) rotate(-32) scale(1.06)", knife);
      d.g("translate(50 50) rotate(32) scale(1.06)", fork);
    },
  ],
  [
    "🍾",
    "popping bottle",
    (d) => {
      d.shadow(34, 92, 22, 3.5);
      const fizz: Ramp = ["#fffef5", "#fff3b8", "#f0c850"];
      d.g("rotate(24 44 66)", (g) => {
        g.path(bumpy(44, 14, 10.5, 8.5, 7, 0.5, 10), g.fill(fizz), { sw: 2.4 });
        g.path(bumpy(43, 3, 7, 5.5, 6, 0.5, 40), g.fill(fizz), { sw: 2.2 });
        const bottle = "M38.5 26 H49.5 V38 Q51 42 54 45 Q61 50 61 58 V80 Q61 85 56 85 H32 Q27 85 27 80 V58 Q27 50 34 45 Q37 42 38.5 38 Z";
        g.path(bottle, g.fill(HONEY, "h"), { sw: 3.5 });
        g.path("M37.5 23 H50.5 V36 Q44 39 37.5 36 Z", g.fill(P.red, "h"), { sw: 2.6 });
        g.path(rr(30.5, 57, 27, 17, 5), g.fill(P.cream), { sw: 2.4 });
        g.ball(44, 66, 5, P.red, { sw: 1.8 });
        g.path(leaf(44.5, 60.5, 5.5, -50, 0.5), P.green[1], { sw: 1.4 });
        g.shine(31.5, 62, 1.8, 7, 0.6, 0);
      });
      for (const [x, y, r] of [[56, 10, 2.4], [78, 34, 2], [62, 30, 1.6], [50, 22, 1.8], [84, 44, 1.6]]) d.circle(x, y, r, "#fff7cc", { sw: 1.4 });
      d.g("rotate(40 80 15)", (g) => {
        g.path(rr(74.5, 9, 11, 12, 3), g.fill(P.wood, "h"), { sw: 2.6 });
        g.stroke("M77.5 12 V18 M82.5 12 V18", { sw: 1.4, color: P.wood[2] });
      });
      for (const [x1, y1, x2, y2] of [[72, 27, 77, 24], [76, 32, 82, 30]]) d.line(x1, y1, x2, y2, { color: P.gold[2], sw: 2.6 });
      d.sparkle(22, 26, 6.5);
      d.sparkle(14, 52, 4);
      d.sparkle(86, 62, 4.5);
    },
  ],
  [
    "🥬",
    "leafy greens",
    (d) => {
      d.shadow(50, 92, 22, 4);
      const stalkLeaf = (g: Pen, seed: number, blade: Ramp) => {
        g.path("M44.5 91 Q42 64 46 44 L54 44 Q58 64 55.5 91 Z", g.lin([[0, "#f6ffe6"], [0.6, P.lime[0]], [1, P.lime[1]]], 0, 1, 0, 0), { sw: 3 });
        g.path(lumpy(50, 36, 16, 23, 11, 0.07, seed), g.fill(blade), { sw: 3 });
        g.stroke("M50 60 Q49.5 38 50 18", { sw: 2.6, color: P.lime[0], op: 0.9 });
        g.stroke("M50 46 L41 38 M50 36 L42 28 M50 46 L59 38 M50 36 L58 28", { sw: 1.6, color: blade[2], op: 0.5 });
      };
      d.g("rotate(-26 50 90)", (g) => stalkLeaf(g, 3, P.forest));
      d.g("rotate(26 50 90)", (g) => stalkLeaf(g, 5, P.forest));
      d.g("translate(0 -2)", (g) => stalkLeaf(g, 7, P.green));
      d.shine(43, 22, 3, 7, 0.45, 15);
    },
  ],
  [
    "🥥",
    "coconut",
    (d) => {
      d.shadow(50, 91, 38, 4.5);
      const shell = "M10 46 C10 76 28 90 50 90 C72 90 90 76 90 46 Z";
      d.path(shell, d.fill(P.brown), { sw: 3.5 });
      d.clip(shell, (c) => {
        for (const [x, y, a] of [[22, 60, 60], [30, 72, 40], [42, 80, 70], [56, 82, 110], [68, 76, 130], [78, 64, 120], [36, 62, 50], [50, 70, 90], [64, 64, 120], [26, 50, 80], [74, 52, 100]]) {
          const t = (a * Math.PI) / 180;
          c.line(x - Math.cos(t) * 3.5, y - Math.sin(t) * 3.5, x + Math.cos(t) * 3.5, y + Math.sin(t) * 3.5, { color: P.brown[2], sw: 1.8, op: 0.75 });
        }
      });
      d.path(shell, "none", { sw: 3.5 });
      d.ellipse(50, 45, 40, 19, d.fill(P.brown, "v"), { sw: 3.5 });
      d.ellipse(50, 45.5, 34.5, 15.5, d.fill(P.white), { sw: 2 });
      d.ellipse(50, 47, 24, 9.5, d.lin([[0, "#e8ddc8"], [1, "#fffaf0"]]), { sw: 1.8, stroke: "#d8c8a8" });
      d.shine(30, 38, 7, 2.4, 0.9, -12);
    },
  ],
  [
    "🍅",
    "tomato",
    (d) => {
      d.shadow(50, 91, 34, 4.5);
      const body = "M50 28 C71 24 91 35 90 58 C89 80 72 90 50 90 C28 90 11 80 10 58 C9 35 29 24 50 28 Z";
      d.path(body, d.fill(P.red), { sw: 3.5 });
      d.stroke("M44 32 Q34 40 32 52 M56 32 Q66 40 68 52", { sw: 2.2, color: P.red[2], op: 0.3 });
      d.path(starXY(50, 29, 19, 8.5, 5.5, 3.2, 5, -54), d.fill(P.green, "v"), { sw: 2.4 });
      d.tube("M50 28 Q50 20 55 15", P.forest[1], 4, 2.4);
      d.shine(28, 45, 6.5, 11, 0.55, 30);
    },
  ],
  [
    "🫖",
    "teapot",
    (d) => {
      d.shadow(50, 91, 36, 4.5);
      d.path("M30 62 Q17 60 13 45 Q11 39 7 36 Q14 31 19 38 Q23 46 33 50 Z", d.fill(P.coral, "h"), { sw: 3 });
      d.tube("M72 47 Q89 45 89 60 Q89 74 72 76", P.coral[1], 6.5, 3);
      const body = "M50 35 C72 35 82 50 80 66 C78 82 66 90 50 90 C34 90 22 82 20 66 C18 50 28 35 50 35 Z";
      d.path(body, d.fill(P.coral), { sw: 3.5 });
      d.clip(body, (c) => {
        for (const [x, y, r] of [[34, 52, 3.4], [50, 48, 3.4], [66, 52, 3.4], [28, 68, 3.4], [42, 64, 3.4], [58, 64, 3.4], [72, 68, 3.4], [36, 80, 3.4], [50, 78, 3.4], [64, 80, 3.4]]) c.circle(x, y, r, "#fff3e6", { stroke: null, op: 0.95 });
      });
      d.path(body, "none", { sw: 3.5 });
      d.path("M31 39 Q35 28 50 28 Q65 28 69 39 Q50 44 31 39 Z", d.fill(P.coral, "v"), { sw: 3 });
      d.ball(50, 23, 5, P.coral, { sw: 2.6 });
      d.shine(30, 52, 5, 8, 0.45, 30);
    },
  ],
  [
    "🍐",
    "pear",
    (d) => {
      d.shadow(50, 92, 28, 4.5);
      d.tube("M50 24 Q50 15 54 9", P.brown[1], 4.2, 2.4);
      d.path(leaf(52, 17, 22, -26, 0.42), d.fill(P.green, "d"), { sw: 2.6 });
      const pear = "M50 21 C58 21 61 29 61 37 C61 46 78 54 80 70 C82 85 68 92 50 92 C32 92 18 85 20 70 C22 54 39 46 39 37 C39 29 42 21 50 21 Z";
      d.path(pear, d.fill(PEAR), { sw: 3.5 });
      for (const [x, y] of [[34, 70], [44, 78], [58, 80], [66, 68], [56, 58], [48, 44], [70, 78], [40, 60]]) d.circle(x, y, 1.1, PEAR[2], { stroke: null, op: 0.5 });
      d.shine(31, 64, 4.5, 10, 0.55, 22);
    },
  ],
  [
    "🥒",
    "cucumber",
    (d) => {
      d.g("rotate(-38 46 46)", (g) => {
        const body = rr(10, 33, 72, 27, 13.5);
        g.path(body, g.fill(P.forest, "v"), { sw: 3.5 });
        g.clip(body, (c) => {
          c.stroke("M8 41 Q46 38 84 41 M8 51 Q46 54 84 51", { color: P.green[0], sw: 2.4, op: 0.4 });
          for (const [x, y] of [[22, 40], [34, 46], [46, 39], [58, 47], [70, 41], [28, 53], [52, 54], [66, 53]]) c.circle(x, y, 1.3, P.lime[0], { stroke: null, op: 0.8 });
        });
        g.path(body, "none", { sw: 3.5 });
        g.path("M80 43 Q86 46.5 80 50 Z", P.lime[1], { sw: 2 });
        g.shine(30, 38, 12, 2.4, 0.5, 0);
      });
      d.circle(70, 72, 16, d.fill(P.forest), { sw: 3 });
      d.circle(70, 72, 13, d.fill(["#f6ffde", "#dcf5a8", "#acd66a"]), { stroke: null });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.3;
        d.ellipse(70 + Math.cos(a) * 6, 72 + Math.sin(a) * 6, 1.1, 2.1, "#ffffff", { stroke: P.lime[2], sw: 0.8, tf: `rotate(${r2((a * 180) / Math.PI + 90)} ${r2(70 + Math.cos(a) * 6)} ${r2(72 + Math.sin(a) * 6)})` });
      }
      d.shine(63, 66, 3.6, 1.8, 0.7, -35);
    },
  ],
  [
    "🧇",
    "waffle",
    (d) => {
      d.shadow(50, 91, 38, 4.5);
      d.g("rotate(-8 50 50)", (g) => {
        g.path(rr(14, 14, 72, 72, 16), g.fill(CRUST), { sw: 3.5 });
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) g.path(rr(20.8 + c * 15.5, 20.8 + r * 15.5, 12, 12, 2.6), g.lin([[0, CRUST[2]], [1, CRUST[1]]], 0, 0, 1, 1), { sw: 1.6, stroke: CRUST[2] });
        }
        g.path(rr(41, 40, 18, 15, 3.5), g.fill(BUTTER), { sw: 2.4 });
        g.shine(26, 22, 8, 2.4, 0.55, -8);
      });
    },
  ],
  [
    "🥧",
    "pie",
    (d) => {
      d.shadow(50, 87, 44, 4.5);
      d.path("M6 46 L15 70 Q50 88 85 70 L94 46 Z", d.fill(P.silver, "v"), { sw: 3.5 });
      d.stroke("M21 67 L18 58 M34 73 L32 63 M50 75 V65 M66 73 L68 63 M79 67 L82 58", { sw: 2, color: P.silver[2] });
      d.path(bumpy(50, 45, 43, 21, 24, 0.5), d.fill(CRUST), { sw: 3.2 });
      const fill = ellipsePath(50, 45, 34.5, 15);
      d.path(fill, d.fill(P.red), { sw: 2.4 });
      d.clip(fill, (c) => {
        for (const x of [22, 37, 52, 67, 82]) c.tube(`M${x - 11} 26 L${x + 7} 66`, CRUST[1], 5, 1.6);
        for (const x of [18, 33, 48, 63, 78]) c.tube(`M${x + 11} 26 L${x - 7} 66`, CRUST[1], 5, 1.6);
      });
      d.path(fill, "none", { sw: 2.4 });
      d.shine(25, 35, 7.5, 2.4, 0.55, -18);
    },
  ],
  [
    "🍔",
    "hamburger",
    (d) => {
      d.shadow(50, 91, 40, 4.5);
      d.path("M14 72 H86 V78 Q86 88 74 88 H26 Q14 88 14 78 Z", d.fill(CRUST, "v"), { sw: 3.5 });
      d.path(rr(10, 60, 80, 15, 7.5), d.fill(CHOC), { sw: 3.5 });
      for (const [x, y] of [[24, 66], [36, 69], [50, 66], [64, 69], [77, 66]]) d.circle(x, y, 1.3, CHOC[0], { stroke: null, op: 0.8 });
      d.path("M11 56 H89 V60 H80 L74 69 L68 60 H40 L33 68 L27 60 H11 Z", d.fill(P.gold, "v"), { sw: 2.6 });
      d.path("M8 51 H92 Q94 55 90 57 Q85 60 80 56.5 Q75 60 70 56.5 Q65 60 60 56.5 Q55 60 50 56.5 Q45 60 40 56.5 Q35 60 30 56.5 Q25 60 20 56.5 Q15 60 10 57 Q6 55 8 51 Z", d.fill(P.green, "v"), { sw: 2.6 });
      d.path("M12 48 Q12 14 50 14 Q88 14 88 48 Q88 53 83 53 H17 Q12 53 12 48 Z", d.fill(CRUST), { sw: 3.5 });
      for (const [x, y, a] of [[34, 26, -30], [48, 22, 0], [62, 25, 30], [40, 36, -15], [56, 35, 15], [70, 38, 40], [27, 39, -40]]) d.ellipse(x, y, 2.6, 1.5, P.cream[1], { sw: 1.2, tf: `rotate(${a} ${x} ${y})` });
      d.shine(27, 28, 8, 3.4, 0.5, -38);
    },
  ],
  [
    "🍿",
    "popcorn",
    (d) => {
      d.shadow(50, 93, 28, 4);
      const kernels: [number, number, number][] = [[42, 16, 8.5], [58, 15, 8.5], [30, 28, 9], [48, 28, 9.5], [65, 27, 9], [76, 38, 8.5], [24, 39, 8.5], [38, 38, 9], [57, 39, 9]];
      kernels.forEach(([x, y, r], i) => {
        d.path(bumpy(x, y, r, r * 0.88, 6, 0.48, i * 23), d.fill(POP), { sw: 2.4 });
        d.circle(x + r * 0.25, y + r * 0.2, r * 0.22, P.gold[1], { stroke: null, op: 0.35 });
      });
      const bucket = "M20 44 L80 44 L72 90 Q71.5 93 68 93 L32 93 Q28.5 93 28 90 Z";
      d.path(bucket, "#ffffff", { sw: 3.5 });
      d.clip(bucket, (c) => {
        for (const [t, b] of [[20, 28], [40, 43.6], [60, 59.2], [80, 74.8]]) c.path(`M${t - 3} 44 L${t + 7} 44 L${b + 5.5} 94 L${b - 2.5} 94 Z`, c.fill(P.red, "h"), { stroke: null });
        c.path(bucket, c.lin([[0, "#ffffff", 0.35], [0.4, "#ffffff", 0], [0.75, "#1f2a66", 0], [1, "#1f2a66", 0.18]], 0, 0, 1, 0), { stroke: null });
      });
      d.path(bucket, "none", { sw: 3.5 });
      d.path(rr(16, 40, 68, 8, 3.5), d.fill(P.white, "v"), { sw: 3 });
    },
  ],
  [
    "🥞",
    "pancakes",
    (d) => {
      d.ellipse(50, 84, 45, 8.5, d.fill(P.white, "v"), { sw: 3 });
      [[72, 0], [63, 2], [54, -2], [45, 1]].forEach(([y, dx]) => {
        d.path(`M${14 + dx} ${y} A36 9 0 0 0 ${86 + dx} ${y} V${y + 8} A36 9 0 0 1 ${14 + dx} ${y + 8} Z`, d.fill(CRUST, "v"), { sw: 3 });
      });
      d.ellipse(51, 45, 36, 9, d.fill(COOKIE), { sw: 3 });
      d.path(smooth([[24, 42], [36, 37], [52, 36], [68, 38], [78, 44], [76, 50], [74, 58], [71, 60], [68, 56], [66, 51], [58, 52], [52, 53], [49, 61], [46, 63], [43, 60], [42, 53], [32, 51], [27, 48]], 0.18), d.fill(HONEY), { sw: 2.4 });
      d.path(rr(43, 36, 15, 10, 2.5), d.fill(BUTTER), { sw: 2.2 });
      d.shine(36, 40, 5, 1.6, 0.7, -6);
    },
  ],
  [
    "🫒",
    "olives",
    (d) => {
      d.tube("M10 26 Q46 22 90 14", P.brown[1], 4, 2.4);
      d.path(leaf(30, 24.5, 26, 158, 0.26), d.fill(SAGE, "v"), { sw: 2.4 });
      d.path(leaf(66, 18.5, 26, -40, 0.26), d.fill(SAGE, "v"), { sw: 2.4 });
      d.tube("M40 24 Q38 34 38 42 M62 20 Q64 32 64 46", P.brown[1], 2.6, 2);
      d.ellipse(38, 62, 15, 20, d.fill(OLIVE), { sw: 3.5, tf: "rotate(12 38 62)" });
      d.shine(31, 53, 3, 7, 0.65, 22);
      d.ellipse(64, 66, 15, 20, d.fill(OLIVE), { sw: 3.5, tf: "rotate(-10 64 66)" });
      d.shine(57, 57, 3, 7, 0.65, 15);
    },
  ],
  [
    "🍧",
    "shaved ice",
    (d) => {
      d.shadow(50, 92, 22, 4);
      d.tube("M58 34 L80 10", P.silver[1], 5.5, 2.4);
      const dome = bumpy(50, 46, 33, 27, 13, 0.42, 5);
      d.path(dome, d.fill(ICE), { sw: 3 });
      d.clip(dome, (c) => {
        c.g("rotate(-35 50 46)", (k) => {
          const band = (y0: number, y1: number, fill: string) => k.path(`M-20 ${y0} Q-7.5 ${y0 - 3.5} 5 ${y0} T30 ${y0} T55 ${y0} T80 ${y0} T105 ${y0} T130 ${y0} V${y1} H-20 Z`, fill, { stroke: null, op: 0.95 });
          band(36, 50, P.pink[1]);
          band(50, 62, P.gold[1]);
          band(62, 110, P.sky[1]);
        });
        c.path(dome, c.rad([[0, "#ffffff", 0.5], [0.5, "#ffffff", 0], [1, "#1f2a66", 0.2]], 0.3, 0.25, 0.9), { stroke: null });
        for (const [x, y] of [[36, 30], [50, 24], [62, 30], [44, 40], [56, 44], [28, 46], [72, 44], [40, 54], [62, 56], [30, 58], [74, 58], [50, 60]]) c.circle(x, y, 1.3, "#ffffff", { stroke: null, op: 0.9 });
      });
      d.path(dome, "none", { sw: 3 });
      d.path("M42 80 L39 88 Q38.5 91 42 91 H58 Q61.5 91 61 88 L58 80 Z", d.fill(GLASS, "h"), { sw: 3 });
      d.path("M12 58 Q13 82 50 82 Q87 82 88 58 Z", d.fill(GLASS, "h"), { sw: 3.5 });
      d.stroke("M20 66 Q50 74 80 66", { sw: 2, color: "#ffffff", op: 0.9 });
      d.shine(24, 64, 5, 2, 0.8, 20);
    },
  ],
  [
    "🍖",
    "meat on bone",
    (d) => {
      d.shadow(50, 90, 38, 4.5);
      const shaft = "M48 50 L74 76";
      const knobs: [number, number][] = [[70.5, 81.5], [81.5, 70.5]];
      d.stroke(shaft, { color: OL, sw: 17 });
      for (const [x, y] of knobs) d.circle(x, y, 10, OL, { stroke: null });
      d.stroke(shaft, { color: P.cream[1], sw: 11 });
      for (const [x, y] of knobs) d.circle(x, y, 7, d.fill(P.cream), { stroke: null });
      d.stroke("M54 52.5 L72 70.5", { sw: 2.4, color: "#ffffff", op: 0.9 });
      const meat = smooth([[14, 44], [18, 26], [32, 14], [50, 12], [64, 20], [71, 34], [68, 50], [60, 62], [46, 66], [30, 63], [18, 56]], 0.2);
      d.path(meat, d.fill(ROAST), { sw: 3.5 });
      d.clip(meat, (c) => {
        for (let i = 0; i < 4; i++) c.line(30 + i * 10, 64, 56 + i * 10, 22, { color: ROAST[2], sw: 2.6, op: 0.3 });
      });
      d.shine(30, 27, 9, 4, 0.5, -35);
    },
  ],
  [
    "🫓",
    "flatbread",
    (d) => {
      d.shadow(50, 76, 46, 4.5);
      d.g("rotate(-8 50 52)", (g) => {
        const naan: [number, number][] = [[6, 52], [13, 41], [32, 35], [58, 34], [82, 38], [94, 48], [91, 59], [71, 66], [43, 68], [19, 64]];
        g.path(smooth(naan.map(([x, y]): [number, number] => [x, y + 6]), 0.2), g.fill(CRUST, "v"), { sw: 3.5 });
        g.path(smooth(naan, 0.2), g.fill(FLAT), { sw: 3 });
        for (const [x, y, rx, ry, a] of [[28, 46, 6, 2.6, -12], [52, 41, 5, 2.2, 8], [73, 50, 6.5, 2.8, 18], [42, 58, 5.5, 2.4, -6], [64, 60, 4.4, 2, 0], [20, 55, 3.4, 1.6, 12], [80, 42, 3.4, 1.5, -18], [56, 51, 3.2, 1.5, 24], [36, 51, 2.6, 1.2, -24], [66, 39, 2.4, 1.1, 0]]) {
          g.ellipse(x, y, rx, ry, CRUST[1], { stroke: null, op: 0.8, tf: `rotate(${a} ${x} ${y})` });
          g.ellipse(x + rx * 0.15, y + ry * 0.2, rx * 0.45, ry * 0.45, CRUST[2], { stroke: null, op: 0.5, tf: `rotate(${a} ${x} ${y})` });
        }
        g.shine(26, 41, 10, 2.6, 0.6, -8);
      });
    },
  ],
  [
    "🌶️",
    "hot pepper",
    (d) => {
      const p0: [number, number] = [70, 34];
      const p1: [number, number] = [70, 94];
      const p2: [number, number] = [16, 80];
      d.shadow(46, 90, 32, 3.5);
      d.path(sweep(p0, p1, p2, (t) => 1.6 + 11.5 * (1 - t) ** 0.8), d.fill(P.red), { sw: 3.5 });
      const [sx, sy] = onCurve(p0, p1, p2, 0.27, 6);
      d.shine(sx, sy, 2.6, 9, 0.55, 18);
      d.tube("M70 26 Q71 13 81 9", P.forest[1], 4.5, 2.6);
      d.path(smooth([[56, 36], [58, 28], [65, 23], [75, 23], [82, 28], [84, 36], [79, 33], [74, 37], [70, 33], [66, 37], [61, 33]], 0.18), d.fill(P.green, "v"), { sw: 2.6 });
    },
  ],
  [
    "🥘",
    "pan of food",
    (d) => {
      d.shadow(50, 84, 44, 4.5);
      for (const s of [-1, 1]) d.tube(`M${50 + s * 36} 50 Q${50 + s * 47} 47 ${50 + s * 47} 56 Q${50 + s * 47} 64 ${50 + s * 37} 62`, P.ink[1], 4.5, 2.6);
      d.path("M10 54 V61 A40 20 0 0 0 90 61 V54 Z", d.fill(P.black, "h"), { sw: 3.5 });
      d.ellipse(50, 54, 40, 20, d.fill(P.black), { sw: 3.5 });
      const food = ellipsePath(50, 54, 34.5, 15.5);
      d.path(food, d.fill(P.gold), { sw: 2 });
      d.clip(food, (c) => {
        for (const [x, y, a] of [[24, 54, 20], [34, 62, -30], [44, 44, 60], [58, 66, 10], [70, 46, -40], [78, 56, 70], [52, 54, 0], [38, 52, 80]]) c.ellipse(x, y, 1.8, 0.9, P.gold[2], { stroke: null, op: 0.6, tf: `rotate(${a} ${x} ${y})` });
      });
      d.path(food, "none", { sw: 2 });
      for (const [x, y] of [[36, 48], [62, 46], [66, 61]]) d.tube(`M${x - 5} ${y - 1.5} Q${x} ${y + 6} ${x + 5} ${y - 1.5}`, P.coral[1], 4.2, 1.6);
      for (const [x, y] of [[44, 58], [52, 47], [28, 56], [74, 53], [57, 63], [46, 51], [32, 62]]) d.circle(x, y, 2.3, d.fill(P.green), { sw: 1.4 });
      for (const [x1, y1, x2, y2] of [[22, 50, 28, 47], [70, 66, 76, 63], [54, 54, 60, 55]]) d.tube(`M${x1} ${y1} L${x2} ${y2}`, P.red[1], 2.6, 1.4);
      d.path("M41 66 A9 9 0 0 1 59 66 Z", d.fill(P.lemon), { sw: 2 });
      d.stroke("M44 65.5 A6 6 0 0 1 56 65.5", { sw: 1.4, color: "#ffffff" });
      d.shine(22, 44, 7, 2, 0.4, -20);
    },
  ],
  [
    "🥖",
    "baguette",
    (d) => {
      d.shadow(50, 88, 38, 4);
      d.g("rotate(-35 50 50)", (g) => {
        g.path("M4 50 Q5 38.5 19 38.5 H81 Q95 38.5 96 50 Q95 61.5 81 61.5 H19 Q5 61.5 4 50 Z", g.fill(CRUST, "v"), { sw: 3.5 });
        for (const x of [22, 36, 50, 64, 78]) g.path(leaf(x - 5.5, 55.5, 15.5, -45, 0.28), "#ffe9bd", { sw: 2 });
        g.shine(28, 42.5, 12, 1.8, 0.55, 0);
      });
    },
  ],
  [
    "🍑",
    "peach",
    (d) => {
      d.shadow(50, 92, 32, 4.5);
      d.tube("M50 31 Q50 23 53 18", P.brown[1], 3.6, 2.2);
      const body = "M50 31 C58 23 75 23 83 35 C93 49 91 72 78 84 C70 91 60 93 50 93 C40 93 30 91 22 84 C9 72 7 49 17 35 C25 23 42 23 50 31 Z";
      d.path(body, d.rad([[0, "#ffe6bf"], [0.45, "#ffad7d"], [1, "#e75d6f"]], 0.3, 0.3, 0.9), { sw: 3.5 });
      d.clip(body, (c) => c.ellipse(70, 66, 24, 26, "#ff5c7a", { stroke: null, op: 0.22 }));
      d.path(body, "none", { sw: 3.5 });
      d.stroke("M50 33 C44.5 43 43.5 55 45.5 66", { sw: 2.4, color: "#d4566c", op: 0.75 });
      d.path(leaf(52, 25, 26, -28, 0.42), d.fill(P.green, "d"), { sw: 2.6 });
      d.stroke("M54 24 Q64 19 73 14", { sw: 1.6, color: P.green[2] });
      d.path(leaf(49, 26, 17, -150, 0.42), d.fill(P.forest, "d"), { sw: 2.4 });
      d.shine(29, 47, 6, 11, 0.55, 25);
    },
  ],
  [
    "🥩",
    "steak",
    (d) => {
      d.shadow(50, 86, 42, 4.5);
      const outer: [number, number][] = [[12, 48], [20, 30], [40, 20], [62, 22], [82, 32], [90, 50], [84, 68], [66, 80], [44, 82], [24, 74], [14, 62]];
      d.path(smooth(outer, 0.2), d.fill(P.cream), { sw: 3.5 });
      const inner = outer.map(([x, y]): [number, number] => [r2(52 + (x - 52) * 0.8 + 3), r2(52 + (y - 52) * 0.8 + 3)]);
      d.path(smooth(inner, 0.2), d.fill(MEAT), { sw: 2.2, stroke: MEAT[2] });
      d.stroke("M29 58 Q35 52 42 53 M47 46 Q51 41 57 40 M55 65 Q61 58 70 58 M62 46 Q66 42 71 42 M37 71 Q41 67 46 67", { sw: 1.9, color: "#ffd9de", op: 0.85 });
      d.shine(36, 36, 8, 3, 0.5, -25);
    },
  ],
  [
    "🥨",
    "pretzel",
    (d) => {
      d.shadow(50, 92, 36, 4);
      const pts: [number, number][] = [[64, 76], [57, 66], [50, 56], [43, 45.5], [36, 34], [28, 22], [16, 22], [9, 38], [11, 58], [22, 75], [36, 85], [50, 87], [64, 85], [78, 75], [89, 58], [91, 38], [84, 22], [72, 22], [64, 34], [57, 45.5], [50, 56], [43, 66], [36, 76]];
      const path = curve(pts, 0.2);
      d.tube(path, PRETZEL[1], 10, 3);
      d.stroke(path, { color: PRETZEL[0], sw: 2.6, op: 0.7 });
      const over = "M56.2 46.9 L43.8 65.1";
      d.stroke(over, { color: OL, sw: 16, cap: "butt" });
      d.stroke(over, { color: PRETZEL[1], sw: 10, cap: "butt" });
      d.stroke("M56.8 47.3 L43.2 64.7", { color: PRETZEL[0], sw: 2.6, op: 0.7, cap: "butt" });
      for (const [x, y, a] of [[21, 23, 20], [10, 45, -10], [16, 67, 30], [33, 84, 0], [52, 87, 40], [70, 82, -20], [86, 65, 10], [90, 42, 30], [80, 21, -10], [39, 38, 15], [62, 39, -25], [46, 63, 35]]) d.rect(x - 1.7, y - 1.7, 3.4, 3.4, 0.8, "#ffffff", { sw: 1, stroke: P.grey[2], tf: `rotate(${a} ${x} ${y})` });
    },
  ],
  [
    "🌮",
    "taco",
    (d) => {
      d.shadow(50, 89, 40, 4.5);
      d.g("rotate(-8 50 60)", (g) => {
        g.path(bumpy(50, 47, 37, 7, 12, 0.5, 7), g.fill(CHOC), { sw: 2.4 });
        g.path("M9 50 Q8 40 15 41 Q17 33 25 37 Q30 30 37 35 Q43 29 49 34 Q56 28 62 34 Q69 29 74 36 Q82 32 85 40 Q93 40 91 50 Z", g.fill(P.green, "v"), { sw: 2.4 });
        for (const [x, y, a] of [[26, 41, 10], [44, 38, -15], [62, 39, 20], [78, 43, -10]]) g.path(rr(x - 3.2, y - 3.2, 6.4, 6.4, 1.6), g.fill(P.red), { sw: 1.6, tf: `rotate(${a} ${x} ${y})` });
        for (const [x, y, a] of [[35, 40, -30], [53, 37, 25], [70, 40, -20], [18, 45, 30], [86, 46, 20]]) {
          const t = (a * Math.PI) / 180;
          g.tube(`M${r2(x - Math.cos(t) * 3.4)} ${r2(y - Math.sin(t) * 3.4)} L${r2(x + Math.cos(t) * 3.4)} ${r2(y + Math.sin(t) * 3.4)}`, P.gold[0], 2.4, 1.2);
        }
        const shell = "M8 47 Q50 55 92 47 C92 72 74 90 50 90 C26 90 8 72 8 47 Z";
        g.path(shell, g.fill(TORTILLA), { sw: 3.5 });
        for (const [x, y, r] of [[28, 66, 2], [44, 76, 1.6], [62, 70, 2.2], [74, 60, 1.6], [36, 58, 1.4], [54, 62, 1.4], [20, 56, 1.4]]) g.circle(x, y, r, TORTILLA[2], { stroke: null, op: 0.45 });
        g.shine(24, 60, 3, 9, 0.5, 30);
      });
    },
  ],
];
