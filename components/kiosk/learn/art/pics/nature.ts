// Sky, weather, space, earth, water, fire and growing things.

import { P, circlePath, cloudPath, curve, drop, heart, leaf, lumpy, rr, smooth, softStar, type Pen, type Ramp } from "../pen";
import type { PicDef } from "..";

// ── Local helpers ────────────────────────────────────────────────────────────────────────────
const f2 = (n: number) => Math.round(n * 100) / 100;
const rad = (deg: number) => (deg * Math.PI) / 180;
type Pt = [number, number];

/** Clear ice: paler than `P.sky`. */
const ICE: Ramp = ["#ffffff", "#d4f1ff", "#8fcdee"];

/** A polygon with rounded corners. */
function roundPoly(pts: Pt[], r: number) {
  const n = pts.length;
  let s = "";
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const d1 = Math.hypot(p0[0] - p1[0], p0[1] - p1[1]);
    const d2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const k1 = Math.min(r, d1 / 2) / d1;
    const k2 = Math.min(r, d2 / 2) / d2;
    s += `${i ? "L" : "M"}${f2(p1[0] + (p0[0] - p1[0]) * k1)} ${f2(p1[1] + (p0[1] - p1[1]) * k1)} Q${f2(p1[0])} ${f2(p1[1])} ${f2(p1[0] + (p2[0] - p1[0]) * k2)} ${f2(p1[1] + (p2[1] - p1[1]) * k2)} `;
  }
  return `${s}Z`;
}

/** A leaf's own frame: u runs from the base (0) to the tip (1), v across; both in leaf lengths. */
function frame(x: number, y: number, len: number, deg: number) {
  const ca = Math.cos(rad(deg));
  const sa = Math.sin(rad(deg));
  return (u: number, v: number): Pt => [x + u * len * ca - v * len * sa, y + u * len * sa + v * len * ca];
}
const pt = (p: Pt) => `${f2(p[0])} ${f2(p[1])}`;

/** A plump rounded leaf from (x, y) toward `deg`; `bend` curls it sideways (in lengths). */
function rleaf(x: number, y: number, len: number, deg: number, fat = 0.36, bend = 0) {
  const q = frame(x, y, len, deg);
  const s = (u: number, v: number) => pt(q(u, v));
  return `M${s(0, 0)} C${s(0.2, -fat * 1.1 + bend * 0.5)} ${s(0.72, -fat * 1.1 + bend)} ${s(1, bend)} C${s(0.74, fat * 1.05 + bend)} ${s(0.22, fat + bend * 0.5)} ${s(0, 0)} Z`;
}
/** The midrib of an `rleaf`, plus `veins` pairs of side veins. */
function rib(x: number, y: number, len: number, deg: number, bend = 0, veins = 0, fat = 0.36) {
  const q = frame(x, y, len, deg);
  const s = (u: number, v: number) => pt(q(u, v));
  const b = (u: number) => bend * Math.min(1, u * 1.15);
  let p = `M${s(0.08, bend * 0.05)} Q${s(0.5, bend * 0.75)} ${s(0.84, bend * 0.92)}`;
  for (let i = 0; i < veins; i++) {
    const u = 0.26 + (i * 0.42) / Math.max(1, veins - 1);
    for (const k of [-1, 1]) p += ` M${s(u, b(u))} Q${s(u + 0.08, k * fat * 0.3 + b(u + 0.08))} ${s(u + 0.15, k * fat * 0.6 + b(u + 0.15))}`;
  }
  return p;
}

/** A long petal with a rounded tip (daisies). */
function petal(x: number, y: number, len: number, deg: number, w = 0.2) {
  const q = frame(x, y, len, deg);
  const s = (u: number, v: number) => pt(q(u, v));
  return `M${s(0, 0)} C${s(0.15, -w)} ${s(0.68, -w * 1.15)} ${s(0.9, -w * 0.88)} Q${s(1.03, 0)} ${s(0.9, w * 0.88)} C${s(0.68, w * 1.15)} ${s(0.15, w)} ${s(0, 0)} Z`;
}

/** The right half of a maple leaf (top tip → stem); the left half is its mirror. */
const MAPLE: Pt[] = [[50, 5], [55, 17], [61, 14], [58, 33], [68, 22], [71, 29], [86, 25], [81, 39], [87, 42], [68, 56], [71, 63], [54, 60]];
const maplePoly = () => [...MAPLE, ...[...MAPLE].reverse().slice(0, -1).map(([x, y]): Pt => [100 - x, y])].flat();

/** A rose bloom seen a little from above (petal cups around a spiral), drawn around (0, 0)
 *  and placed with `tf`; its stem joins at (0, 18). */
function roseBloom(d: Pen, ramp: Ramp, tf: string) {
  d.g(tf, (g) => {
    for (const s of [-1, 1]) g.path(leaf(0, 14, 15, 90 - s * 52, 0.4), g.fill(P.green, "d"), { sw: 2.4 });
    g.path(lumpy(0, 0, 22, 19.5, 8, 0.06, 5), g.fill(ramp), { sw: 3 });
    g.stroke("M-18 0 Q-16 17 0 18 Q16 17 18 0 M-13 -5 Q-12 9.5 0 10.5 Q12 9.5 13 -5 M-8 -9.5 Q-7 2.5 0 3 Q7 2.5 8 -9.5 M-2.5 -12.5 Q2.5 -16 5.5 -11 Q6 -6.5 0 -6.5 Q-4 -7 -2.5 -10", { sw: 2.3, color: ramp[2] });
    g.shine(-11, -10, 5, 2.6, 0.55, -30);
  });
}

/** A puffy cloud with a shaded underside and a shine. */
function cloud(d: Pen, cx: number, cy: number, w: number, h: number, ramp: Ramp = P.white, sw = 3.5) {
  const c = cloudPath(cx, cy, w, h);
  d.path(c, d.fill(ramp, "v"), { sw });
  d.clip(c, (k) => k.path(cloudPath(cx + w * 0.04, cy + h * 0.52, w * 1.04, h * 0.7), ramp[2], { stroke: null, op: 0.32 }));
  d.path(c, "none", { sw });
  d.shine(cx - w * 0.095, cy - h * 0.39, w * 0.08, h * 0.055, 0.75, -40);
}

/** An ellipse as a path; `ccw` runs it the other way (to cut a hole in a shape). */
const ell = (cx: number, cy: number, rx: number, ry: number, ccw = false) =>
  `M${f2(cx - rx)} ${f2(cy)} A${f2(rx)} ${f2(ry)} 0 1 ${ccw ? 0 : 1} ${f2(cx + rx)} ${f2(cy)} A${f2(rx)} ${f2(ry)} 0 1 ${ccw ? 0 : 1} ${f2(cx - rx)} ${f2(cy)} Z`;

/** A scene in a rounded tile (sunrise, night sky): `fn` paints inside, then the frame. */
function tile(d: Pen, fn: (c: Pen) => void) {
  const t = "M26 8 H74 Q92 8 92 26 V74 Q92 92 74 92 H26 Q8 92 8 74 V26 Q8 8 26 8 Z";
  d.path(t, "#ffffff", { sw: 3.5 });
  d.clip(t, fn);
  d.path(t, "none", { sw: 3.5 });
}

/** An oak-style leaf (rounded lobes) from (x, y) toward `deg`, and its veins. */
const OAK: Pt[] = [[0.08, 0.08], [0.18, 0.21], [0.28, 0.14], [0.39, 0.29], [0.5, 0.18], [0.61, 0.28], [0.72, 0.17], [0.82, 0.21], [0.92, 0.1]];
function oakLeaf(x: number, y: number, len: number, deg: number, fat = 1) {
  const q = frame(x, y, len, deg);
  return smooth([q(0, 0), ...OAK.map(([u, v]) => q(u, v * fat)), q(1, 0), ...[...OAK].reverse().map(([u, v]) => q(u + 0.02, -v * fat))], 0.17);
}
function oakVeins(x: number, y: number, len: number, deg: number, fat = 1) {
  const q = frame(x, y, len, deg);
  let p = `M${pt(q(0.02, 0))} L${pt(q(0.9, 0))}`;
  for (const [u, v] of [[0.18, 0.21], [0.39, 0.29], [0.61, 0.28], [0.82, 0.21]]) for (const k of [-1, 1]) p += ` M${pt(q(u - 0.09, 0))} L${pt(q(u, k * v * fat * 0.66))}`;
  return p;
}

/** Moon phases share one disc and one set of craters. `f` = how much is lit (0 new … 1 full),
 *  `side` = which side the light is on (r = waxing, l = waning); `sh` = where the shine sits. */
const MOON_DARK: Ramp = ["#747b9d", "#474e70", "#2b3050"];
const CRATERS: [number, number, number][] = [[35, 33, 6.5], [60, 25, 4.2], [64, 57, 8.5], [31, 62, 5.2], [49, 75, 4.4], [76, 40, 3.8], [48, 46, 3.4], [21, 47, 3], [71, 75, 3.2]];
function moon(d: Pen, f: number, side: "r" | "l", sh: [number, number, number]) {
  const disc = circlePath(50, 50, 40);
  d.path(disc, d.fill(MOON_DARK), { sw: 3.5 });
  d.clip(disc, (c) => {
    for (const [x, y, s] of CRATERS) c.circle(x, y, s, MOON_DARK[2], { stroke: null, op: 0.55 });
  });
  if (f > 0) {
    const kx = f2(40 * Math.abs(1 - 2 * f));
    const gib = f > 0.5 ? 1 : 0;
    const back = f === 0.5 ? "L50 10" : `A${kx} 40 0 0 ${side === "r" ? gib : 1 - gib} 50 10`;
    const lit = f >= 1 ? disc : `M50 10 A40 40 0 0 ${side === "r" ? 1 : 0} 50 90 ${back} Z`;
    d.path(lit, d.fill(P.lemon, "d"), { stroke: null });
    d.clip(lit, (c) => {
      for (const [x, y, s] of CRATERS) c.circle(x, y, s, P.lemon[2], { stroke: null, op: 0.5 });
      c.shine(sh[0], sh[1], 7.5, 3.6, 0.65, sh[2]);
    });
  } else d.shine(sh[0], sh[1], 7.5, 3.6, 0.22, sh[2]);
  d.path(disc, "none", { sw: 3.5 });
}

/** A lightning bolt centered on (cx, cy); s = 1 is 88 tall. */
const BOLT = [44, 6, 72, 6, 58, 38, 78, 38, 36, 94, 44, 54, 24, 54];
function bolt(d: Pen, cx: number, cy: number, s: number, sw = 3) {
  d.poly(BOLT.map((v, i) => (i % 2 ? cy + (v - 50) * s : cx + (v - 51) * s)), d.fill(P.gold, "d"), { sw });
}

/** A falling raindrop. */
function rainDrop(d: Pen, x: number, y: number, s: number, sw = 2.5) {
  d.path(drop(x, y, s), d.fill(P.sky), { sw });
  d.shine(x - s * 0.36, y + s * 0.05, s * 0.2, s * 0.4, 0.7, 20);
}

/** A six-armed snowflake; `branch` adds the little V on each arm. */
function flake(d: Pen, x: number, y: number, r: number, w: number, sw = 2.5, branch = true) {
  let p = "";
  for (let i = 0; i < 6; i++) {
    const a = rad(i * 60 - 90);
    p += `M${f2(x)} ${f2(y)} L${f2(x + Math.cos(a) * r)} ${f2(y + Math.sin(a) * r)} `;
    if (!branch) continue;
    const bx = x + Math.cos(a) * r * 0.56;
    const by = y + Math.sin(a) * r * 0.56;
    for (const s of [-1, 1]) {
      const b = a + s * rad(48);
      p += `M${f2(bx)} ${f2(by)} L${f2(bx + Math.cos(b) * r * 0.34)} ${f2(by + Math.sin(b) * r * 0.34)} `;
    }
  }
  d.tube(p, d.fill(ICE), w, sw);
}

/** The sun: a glow, alternating rays and a shiny gold ball (the ☀️ look at any size). */
function sun(d: Pen, cx: number, cy: number, r: number, glow = true) {
  if (glow) d.glow(cx, cy, r * 1.8, "#ffe066", 0.6);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r2 = r * (i % 2 ? 1.52 : 1.7);
    d.tube(`M${f2(cx + Math.cos(a) * r * 1.14)} ${f2(cy + Math.sin(a) * r * 1.14)} L${f2(cx + Math.cos(a) * r2)} ${f2(cy + Math.sin(a) * r2)}`, P.orange[1], r * 0.2, 2.5);
  }
  d.ball(cx, cy, r, P.gold, { sw: 3.5 });
}

// ── The globe ────────────────────────────────────────────────────────────────────────────────
// Simplified coastlines as [lat, lon] loops, projected onto a ball (orthographic) for 🌍 🌎 🌏.
type LL = [number, number][];
const AFRICA: LL = [[35.8, -5.9], [37.2, 10], [33, 11], [32.5, 15.5], [30.5, 19.5], [32.8, 22], [31.2, 29.9], [31.3, 32.3], [29.9, 32.6], [22, 36.8], [15.6, 39.4], [12.6, 43.3], [11.8, 51.2], [2, 45.3], [-4, 39.7], [-10.5, 40.4], [-15, 40.7], [-20, 35], [-25.9, 32.6], [-29.9, 31], [-34, 25.6], [-34.8, 20], [-34.4, 18.5], [-29, 16.5], [-22.9, 14.5], [-17, 11.8], [-12.5, 13.5], [-8.8, 13.2], [-6, 12.3], [-1, 9], [3.8, 9.5], [4.3, 6], [6.4, 3.4], [5.5, -0.2], [4.4, -7.7], [8.5, -13.2], [10.5, -15], [14.7, -17.4], [20.8, -17], [26.1, -14.5], [30.4, -9.6], [33.6, -7.6]];
const EURASIA: LL = [[36, -5.6], [36.7, -2.1], [38.8, 0.2], [41.4, 2.2], [42.4, 3.2], [43.3, 5.4], [43.7, 7.3], [44.4, 8.9], [41.9, 12.2], [40, 15.6], [38, 15.6], [39, 17.1], [40.4, 17.2], [39.8, 18.4], [41.1, 16.9], [43.6, 13.5], [45.4, 12.3], [45.3, 13.6], [43.5, 16.4], [41.9, 19.4], [40.4, 19.5], [37.8, 21.1], [36.4, 22.5], [38, 23.7], [40.6, 22.9], [40.9, 26], [40, 26.2], [38.4, 26.3], [37, 27.3], [36.6, 30.5], [36.2, 33], [36.8, 36], [35.5, 35.8], [33.9, 35.5], [31.5, 34.4], [31.1, 32.5], [29.9, 32.6], [27.7, 34.2], [29.5, 34.9], [27, 35.6], [24.1, 38], [21.5, 39.2], [17, 42.5], [12.7, 43.5], [12.8, 45], [14.5, 49], [16.9, 54], [19, 57.7], [22.5, 59.8], [24.2, 57.3], [26.4, 56.4], [24.2, 54.5], [24, 51.6], [25.9, 51.4], [26.3, 50.2], [29.4, 48], [30, 48.8], [29, 50.8], [27.2, 56.3], [25.3, 60.6], [24.8, 66.9], [22.5, 69], [21, 72.6], [19, 72.8], [15, 74], [8.1, 77.5], [13, 80.3], [16.5, 82], [20, 86.7], [22, 88.5], [22, 91], [16.5, 94.5], [16, 97.6], [12, 98.6], [8, 98.3], [1.3, 103.8], [5, 103.4], [8.5, 100.2], [10.5, 99.3], [13.5, 100.5], [12.5, 102], [10.4, 104.4], [8.6, 104.8], [10.8, 106.7], [12.2, 109.2], [16, 108.2], [19, 105.7], [21.5, 108], [21.4, 110.3], [22.3, 114.2], [24.5, 118.1], [27, 120.4], [31, 121.9], [35, 119.5], [37.4, 122.6], [37.5, 118.9], [39, 117.8], [40.8, 121], [39, 121.5], [39.8, 124.3], [37.7, 126.2], [34.7, 126.3], [35.1, 129], [38, 128.6], [42.6, 130.7], [43.1, 131.9], [46.5, 138.3], [53.5, 141], [59.4, 143.2], [59.6, 151], [57, 156.5], [51, 156.6], [56, 162.5], [60, 163.5], [62.5, 177], [64.5, 177.5], [66, 190], [69.7, 170], [71, 150], [72.5, 129], [76, 113], [77.7, 104], [73.5, 80], [68.5, 73], [69.5, 60], [68, 44], [66.5, 33], [69.7, 30], [71.1, 25.8], [70, 19], [66, 13], [62.5, 5.5], [59, 5.6], [58, 7.5], [59, 10], [57.7, 11.9], [55.4, 13], [56.2, 16], [59.3, 18.5], [63, 18.5], [65.8, 22.5], [63, 21.5], [60.2, 22.5], [60.2, 25], [59.9, 30], [59.5, 24.7], [57.4, 21.6], [54.7, 20], [54.4, 18.6], [54.2, 12.1], [54.5, 10], [57.6, 10.5], [56, 8.1], [53.6, 8.5], [53.4, 5], [51.9, 4], [51, 2.4], [49.7, 0.2], [49.4, -1.3], [48.6, -1.8], [48.4, -4.8], [47.3, -2.5], [46, -1.2], [43.4, -1.6], [43.5, -5.8], [43.3, -8.3], [42, -8.9], [38.7, -9.5], [37, -9], [37.1, -7.4], [36.5, -6.3]];
const AMERICAS: LL = [[71, -156.8], [70.2, -148.5], [69.6, -141], [69.5, -133], [68.5, -115], [67.8, -108], [68.2, -98], [69, -94], [66.5, -86], [64, -88.5], [58.8, -94.2], [55.3, -82.3], [51.2, -80.5], [55, -77], [58.5, -77.5], [62.5, -78], [60, -70], [58.5, -62.5], [55, -59.5], [52, -55.8], [50.2, -60], [50, -66.4], [48.6, -68.8], [49.2, -64.4], [46, -64], [45.3, -61], [43.5, -65.7], [44.8, -66.9], [43.6, -70.2], [42, -70], [41.2, -72], [40.6, -74], [38.9, -74.9], [37, -76], [35.2, -75.5], [32, -80.9], [30.3, -81.4], [27, -80.1], [25.2, -80.4], [26, -81.7], [28, -82.8], [29.9, -84.3], [30.4, -87.2], [29, -89.2], [29.6, -92], [29.4, -94.8], [26, -97.2], [22.3, -97.8], [19.2, -96.1], [18.6, -91.8], [21.2, -90], [21.5, -87], [18.5, -88], [16, -88.6], [15.8, -84.8], [15, -83.2], [11, -83.7], [9.4, -79.9], [8.6, -76.9], [11, -74.8], [12.4, -71.7], [10.6, -71.6], [10.5, -66.9], [10.7, -61.6], [8.5, -60], [6.8, -58.2], [5.8, -55.2], [4.9, -52.3], [1.8, -50], [-0.2, -49.5], [-1.4, -48.5], [-2.5, -44.3], [-3.7, -38.5], [-5.2, -35.3], [-8, -34.9], [-13, -38.5], [-17.8, -39.2], [-22.9, -42], [-23, -43.2], [-25.5, -48.5], [-28.5, -48.8], [-32, -52.1], [-34.9, -54.9], [-34.9, -56.2], [-36.3, -56.8], [-38.7, -62.3], [-41, -62.8], [-42.5, -64], [-45.8, -67.5], [-47.8, -65.9], [-50.1, -68.5], [-52.3, -68.4], [-54.9, -67], [-55.9, -67.3], [-53, -73.5], [-50, -75.3], [-46, -75], [-41.8, -73.9], [-37, -73.5], [-33, -71.7], [-27, -70.8], [-23.6, -70.4], [-18.5, -70.3], [-15.4, -75.2], [-12, -77.1], [-6, -81.1], [-4.6, -81.3], [-2.2, -80.9], [1, -80], [3.9, -77.3], [7, -77.8], [8.9, -79.5], [7.5, -80.4], [8.2, -82.9], [9.6, -85], [11, -85.7], [12.5, -87.6], [13.5, -89.8], [14.5, -92.3], [16.2, -94.8], [15.7, -96.5], [16.8, -99.9], [18, -102.2], [19.1, -104.3], [20.6, -105.3], [22.5, -105.6], [25.8, -109.4], [28, -111.2], [31.5, -114], [30, -114.6], [28, -112.9], [24.2, -110.3], [22.9, -109.9], [24.7, -112.2], [27.5, -114.5], [30, -115.8], [32.5, -117.1], [34, -118.5], [34.5, -120.5], [37.8, -122.5], [40.4, -124.4], [43.3, -124.4], [46.2, -124], [48.4, -124.7], [49, -123.1], [50.5, -127], [54.5, -130.5], [58.3, -136.5], [59.5, -139.8], [60, -145], [59.5, -151.5], [57.5, -154], [56, -158.5], [54.8, -163], [58.5, -158], [58.8, -162], [61, -165], [63.5, -162], [64.5, -166], [65.6, -168], [67, -163.5], [68.9, -166.2], [70.6, -160]];
const ISLANDS: LL[] = [
  [[-12, 49.3], [-15.3, 50.4], [-25, 47.1], [-25.6, 45.2], [-23.4, 43.6], [-15.7, 46.3]], // Madagascar
  [[50.1, -5.7], [50.7, -1.3], [51.1, 1.4], [52.9, 1.7], [53.6, 0.1], [55, -1.5], [56, -2.8], [57.7, -1.8], [58.6, -3], [58.5, -5], [57, -5.8], [55.7, -5], [54.8, -3.3], [53.4, -3], [52, -4.5], [51.6, -5.2], [51.4, -3.2]], // Great Britain
  [[55.3, -7.3], [54.3, -5.6], [52.2, -6.4], [51.5, -9.8], [53.3, -10], [54.6, -8.6]], // Ireland
  [[66.5, -23], [66.2, -15], [65, -13.6], [63.4, -18], [63.8, -22.7], [65, -24]], // Iceland
  [[31, 130.5], [33.5, 129.9], [34.4, 131], [35.5, 133], [36.5, 136], [37.8, 138.9], [39.5, 140], [41.4, 140], [41.5, 141.5], [39.6, 142], [38.3, 141], [36, 140.7], [35, 139.8], [34.6, 138.2], [33.7, 135.4], [33.2, 132.5], [32, 131.5]], // Japan
  [[41.5, 140.1], [43.3, 140.4], [45.4, 141.9], [44, 145.3], [43, 145], [42, 143.3], [42.5, 141]], // Hokkaido
  [[9.8, 80.2], [8.5, 81.3], [6, 81], [6.1, 80.1], [7.5, 79.8]], // Sri Lanka
  [[25.3, 121.5], [23.5, 121.5], [22, 120.8], [23, 120.1], [24.5, 120.6]], // Taiwan
  [[5.6, 95.3], [3.5, 98.8], [1, 103], [-3, 106], [-5.9, 105.8], [-4, 102], [-1, 99.5], [2, 97.5]], // Sumatra
  [[-6, 106], [-6.9, 112.6], [-7.7, 114.5], [-8.8, 114.4], [-8, 110], [-7.4, 106.4]], // Java
  [[7, 117], [5, 119.3], [1, 119], [-2, 116.5], [-4, 114.6], [-3, 111], [-1, 109.5], [1.5, 109], [2, 111.5], [4.5, 114]], // Borneo
  [[1.5, 125], [0.5, 120.5], [-1, 120.6], [-5.5, 119.5], [-5.5, 122.5], [-3, 121.5], [-1, 123.3], [0.8, 121.5]], // Sulawesi
  [[-0.8, 131], [-2.5, 134], [-2.6, 141], [-5.5, 145.8], [-8, 147], [-10.6, 150.5], [-8, 143.5], [-9, 141], [-8, 138.5], [-4.5, 135.5], [-4, 132], [-2, 130]], // New Guinea
  [[18.5, 120.8], [18.2, 122.2], [14, 124], [13, 123.8], [14, 120.5], [16.5, 120.3]], // Luzon
  [[9.5, 125.5], [7, 126.5], [6, 125.5], [7, 122], [8.5, 123.5]], // Mindanao
  [[-10.7, 142.5], [-14.5, 143.7], [-16.9, 145.8], [-19.3, 146.8], [-23, 150.8], [-25.5, 153.1], [-28.6, 153.6], [-32.9, 151.8], [-35, 150.8], [-37.5, 149.9], [-38.8, 146.4], [-38, 140.8], [-35.6, 138.1], [-34.9, 137.5], [-33, 137.8], [-35.1, 135.6], [-32.1, 133.6], [-31.6, 131], [-33.9, 123.5], [-34.4, 119.9], [-35, 117.9], [-34.3, 115.1], [-31.8, 115.7], [-26, 113.2], [-22, 113.9], [-20.4, 117], [-19.6, 121], [-16.4, 123], [-14.2, 126], [-14.8, 129], [-12.4, 130.8], [-11.2, 132.5], [-12.2, 136.8], [-15, 135.5], [-17.6, 140.8], [-15, 141.5], [-12.5, 141.6]], // Australia
  [[-40.8, 144.7], [-41, 148.3], [-43.2, 147.9], [-43.4, 146], [-41.6, 145]], // Tasmania
  [[-34.4, 172.7], [-37.5, 175.9], [-37.6, 178.5], [-39.6, 177], [-41.6, 175.2], [-39.4, 173.8], [-36.5, 174.4]], // New Zealand (north)
  [[-40.5, 172.7], [-41.8, 174.3], [-43.8, 173.1], [-46.6, 168.5], [-45.8, 166.5], [-43, 170.5]], // New Zealand (south)
  [[83.6, -35], [81.5, -15], [76, -19], [70.5, -22], [68, -31], [65.5, -38], [60, -43], [63, -51], [68.5, -53], [70.5, -54.5], [76.5, -68.5], [78, -72.5], [81, -64], [82.5, -50]], // Greenland
  [[73.7, -80], [70.5, -68], [66.5, -61.8], [62.3, -65.5], [64.5, -76], [68.5, -76], [70, -86]], // Baffin Island
  [[73, -115], [71.5, -103], [69, -101.5], [68.5, -110], [69.5, -118], [71, -119]], // Victoria Island
  [[21.8, -84.9], [23.1, -82.4], [23.2, -80.5], [22.4, -78], [21, -75.7], [20.2, -74.1], [19.9, -77.7], [21.6, -80], [22.2, -82]], // Cuba
  [[19.9, -72.8], [19.7, -69.9], [18.4, -68.4], [18.2, -71], [18.4, -74.4]], // Hispaniola
  [[51.6, -55.5], [49.5, -53.5], [46.6, -53.1], [47.6, -59.3], [49, -58], [50.5, -57]], // Newfoundland
];
const LAKES: LL[] = [
  [[41.2, 28.9], [42.7, 27.7], [44.2, 28.7], [45.2, 29.7], [46.6, 31], [45.3, 32.5], [44.4, 33.5], [45, 35.5], [45.4, 36.6], [44.7, 37.5], [43.4, 40], [41.6, 41.6], [41.1, 39], [41.7, 36], [42, 33.5], [41.2, 31]], // Black Sea
  [[47, 51.5], [46.5, 49], [44.5, 47.5], [42.5, 47.8], [40.5, 49.8], [38.5, 48.9], [37, 50.5], [37.3, 53.9], [40, 53], [41.5, 52.6], [42.6, 52.5], [44.5, 50.4], [45.5, 53], [46.9, 53]], // Caspian Sea
];

/** The Earth seen from above (lat0, lon0): blue sea, green land, lit from the top-left. */
function globe(d: Pen, lat0: number, lon0: number) {
  const R = 41;
  const p0 = rad(lat0);
  // View frame: X right, Y up, Z toward us (Z < 0 = the far side).
  const xyz = ([lat, lon]: [number, number]): [number, number, number] => {
    const p = rad(lat);
    const dl = rad(lon - lon0);
    return [Math.cos(p) * Math.sin(dl), Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(dl), Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(dl)];
  };
  // A coastline loop, made counter-clockwise, is cut into the runs we can see. From where a run
  // slips round the back, the land carries on counter-clockwise along the rim, so each run is
  // joined to the next way back in found that way (it may split into several pieces).
  const TAU = Math.PI * 2;
  const shape = (ring: LL) => {
    let area = 0;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      area += a[1] * b[0] - b[1] * a[0];
    }
    const ll = area < 0 ? [...ring].reverse() : ring;
    const pts: [number, number, number][] = [];
    for (let i = 0; i < ll.length; i++) {
      const a = ll[i];
      const b = ll[(i + 1) % ll.length];
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) / 2.5));
      for (let k = 0; k < n; k++) pts.push(xyz([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]));
    }
    const n = pts.length;
    const vis = pts.map((p) => p[2] >= 0);
    const screen = (loop: Pt[]) => smooth(loop.map(([x, y]): Pt => [50 + R * x, 50 - R * y]), 0.16);
    if (!vis.includes(true)) return null;
    if (!vis.includes(false)) return screen(pts.map((p): Pt => [p[0], p[1]]));
    type Run = { pts: Pt[]; inA: number; outA: number };
    const runs: Run[] = [];
    const s = vis.findIndex((v, i) => !v && vis[(i + 1) % n]);
    let cur: Run | null = null;
    for (let k = 0; k < n; k++) {
      const a = pts[(s + k) % n];
      const b = pts[(s + k + 1) % n];
      const av = a[2] >= 0;
      const bv = b[2] >= 0;
      const t = av !== bv ? a[2] / (a[2] - b[2]) : 0;
      const ang = Math.atan2(a[1] + t * (b[1] - a[1]), a[0] + t * (b[0] - a[0]));
      if (!av && bv) cur = { pts: [[Math.cos(ang), Math.sin(ang)]], inA: ang, outA: 0 };
      if (bv && cur) cur.pts.push([b[0], b[1]]);
      if (av && !bv && cur) {
        cur.pts.push([Math.cos(ang), Math.sin(ang)]);
        cur.outA = ang;
        runs.push(cur);
        cur = null;
      }
    }
    const used = runs.map(() => false);
    const loops: string[] = [];
    for (let r0 = 0; r0 < runs.length; r0++) {
      const loop: Pt[] = [];
      for (let r = r0; !used[r]; ) {
        used[r] = true;
        loop.push(...runs[r].pts);
        const out = runs[r].outA;
        let next = r;
        let gap = TAU;
        runs.forEach((q, qi) => {
          const g = (((q.inA - out) % TAU) + TAU) % TAU;
          if (g < gap) [gap, next] = [g, qi];
        });
        for (let g = 0.08; g < gap; g += 0.08) loop.push([Math.cos(out + g), Math.sin(out + g)]);
        r = next;
      }
      if (loop.length > 2) loops.push(screen(loop));
    }
    return loops.join(" ");
  };
  const ball = circlePath(50, 50, R);
  d.path(ball, d.fill(P.sky), { sw: 3.5 });
  d.clip(ball, (c) => {
    for (const ll of [AFRICA, EURASIA, AMERICAS, ...ISLANDS]) {
      const s = shape(ll);
      if (s) c.path(s, c.fill(P.green, "d"), { sw: 2 });
    }
    for (const ll of LAKES) {
      const s = shape(ll);
      if (s) c.path(s, P.sky[1], { sw: 1.8 });
    }
    c.circle(50, 50, R, c.rad([[0, "#ffffff", 0.32], [0.42, "#ffffff", 0], [0.78, "#1f2a66", 0.08], [1, "#1f2a66", 0.34]], 0.36, 0.3, 0.78), { stroke: null });
  });
  d.path(ball, "none", { sw: 3.5 });
  d.shine(33, 25, 9, 4.5, 0.6, -35);
}

export const NATURE: PicDef[] = [
  [
    "☀️",
    "sun",
    (d) => {
      d.glow(50, 50, 49, "#ffe066", 0.65);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const r2 = i % 2 ? 41 : 46;
        d.tube(`M${50 + Math.cos(a) * 31} ${50 + Math.sin(a) * 31} L${50 + Math.cos(a) * r2} ${50 + Math.sin(a) * r2}`, P.orange[1], 5.5, 2.5);
      }
      d.ball(50, 50, 27, P.gold, { sw: 3.5 });
    },
  ],
  [
    "🌙",
    "crescent moon",
    (d) => {
      d.glow(46, 50, 46, "#fff4b0", 0.5);
      d.path("M60 10 A40 40 0 1 0 90 66 A31 31 0 1 1 60 10 Z", d.fill(P.lemon, "d"), { sw: 3.5 });
      d.circle(30, 62, 4.5, P.lemon[2], { stroke: null, op: 0.55 });
      d.circle(42, 79, 3.2, P.lemon[2], { stroke: null, op: 0.55 });
      d.circle(22, 44, 2.8, P.lemon[2], { stroke: null, op: 0.55 });
      d.shine(30, 28, 5, 10, 0.55, 35);
    },
  ],
  [
    "⭐",
    "star",
    (d) => {
      d.path(softStar(50, 54, 45, 22), d.fill(P.gold), { sw: 3.5 });
      d.shine(37, 38, 7, 4, 0.6, -35);
    },
  ],
  [
    "🌊",
    "wave",
    (d) => {
      const body = "M6 92 Q6 54 34 30 Q56 12 76 18 Q92 24 90 42 Q84 34 72 36 Q58 38 56 52 Q55 66 70 70 Q84 73 94 62 L94 92 Z";
      d.path(body, d.fill(P.sky, "v"), { sw: 3.5 });
      d.clip(body, (c) => {
        c.path("M56 52 Q58 40 70 37 Q62 46 63 56 Q64 66 76 69 Q62 70 56 52 Z", P.blue[1], { stroke: null, op: 0.45 });
        c.path("M6 80 Q20 72 32 80 Q46 88 58 80 Q72 72 94 82 L94 92 L6 92 Z", P.blue[1], { stroke: null, op: 0.35 });
      });
      d.path(body, "none", { sw: 3.5 });
      d.path("M64 37 Q72 26 84 31 Q92 35 90 42 Q84 34 72 36 Q68 36 64 37 Z", "#ffffff", { sw: 2.6 });
      d.circle(92, 30, 3, "#ffffff", { sw: 2 });
      d.circle(84, 22, 2.2, "#ffffff", { sw: 1.8 });
      d.shine(28, 52, 7, 16, 0.4, 35);
    },
  ],
  [
    "🪨",
    "rock",
    (d) => {
      d.shadow(50, 86, 40);
      const rock = "M10 82 Q6 62 18 48 Q28 28 50 26 Q73 24 85 42 Q95 58 90 82 Z";
      d.path(rock, d.fill(P.stone), { sw: 3.5 });
      d.stroke("M42 30 Q48 46 40 58 M70 33 Q66 46 75 57", { sw: 2.4, color: P.stone[2] });
      d.path("M20 52 Q32 44 41 48 Q35 57 22 60 Z", "#ffffff", { stroke: null, op: 0.2 });
      d.shine(58, 36, 12, 4.5, 0.45, -8);
    },
  ],
  [
    "🌳",
    "tree",
    (d) => {
      d.shadow(50, 92, 28);
      d.path("M43 92 L46 62 Q38 56 30 58 Q39 50 47 55 L49 45 L56 45 L56 57 Q64 50 72 53 Q63 57 57 63 L59 92 Z", d.fill(P.wood, "h"), { sw: 3 });
      d.path(lumpy(50, 36, 39, 30, 11, 0.09, 7), d.fill(P.green), { sw: 3.5 });
      d.path(lumpy(36, 28, 13, 9, 7, 0.12, 3), P.lime[0], { stroke: null, op: 0.45 });
      for (const [x, y] of [[64, 44], [40, 50], [70, 28]]) d.stroke(`M${x - 5} ${y} q5 4 10 0`, { sw: 2.2, color: P.forest[2], op: 0.55 });
    },
  ],
  [
    "💧",
    "water drop",
    (d) => {
      d.path(drop(50, 60, 27), d.fill(P.sky), { sw: 3.5 });
      d.shine(39, 58, 5, 11, 0.6, 20);
      d.circle(60, 74, 3, "#ffffff", { stroke: null, op: 0.7 });
    },
  ],
  [
    "🔥",
    "fire",
    (d) => {
      d.glow(50, 60, 46, "#ffb347", 0.5);
      d.path("M50 6 Q61 25 71 31 Q73 21 68 12 Q90 32 90 59 Q90 87 50 93 Q10 87 10 59 Q10 40 25 27 Q25 40 34 45 Q31 22 50 6 Z", d.rad([[0, "#ffe066"], [0.5, "#ff9f43"], [1, "#e8462e"]], 0.5, 0.78, 0.78), { sw: 3.5 });
      d.path("M50 40 Q57 52 63 56 Q67 50 65 43 Q76 56 74 71 Q72 88 50 90 Q28 88 26 71 Q26 58 37 50 Q37 58 44 61 Q42 50 50 40 Z", d.fill(P.lemon, "v"), { sw: 2.6 });
      d.path("M50 64 Q56 72 56 78 Q56 86 50 86 Q44 86 44 78 Q44 72 50 64 Z", "#fffbe0", { stroke: null, op: 0.9 });
    },
  ],

  // ── Batch: the most-used sky, earth and plant pictures ────────────────────────────────────
  ["🌍", "earth", (d) => globe(d, 14, 16)],
  [
    "🌱",
    "seedling",
    (d) =>
      d.g("translate(0 -6)", (g) => {
        g.shadow(50, 90, 36, 5);
        const mound = "M13 89 Q15 70 50 69 Q85 70 87 89 Z";
        g.path(mound, g.fill(P.brown, "v"), { sw: 3.5 });
        for (const [x, y, r] of [[30, 81, 2.4], [63, 78, 2.8], [74, 84, 2], [45, 84, 1.8], [54, 74, 1.6]]) g.circle(x, y, r, P.brown[2], { stroke: null, op: 0.55 });
        g.shine(30, 75, 8, 2.6, 0.35, -6);
        g.tube("M50 72 Q47 60 50 48", P.green[1], 5.5, 2.5);
        g.path(rleaf(49, 51, 37, -160, 0.37, -0.06), g.fill(P.lime, "d"), { sw: 3 });
        g.stroke(rib(49, 51, 37, -160, -0.06), { sw: 2, color: P.lime[2] });
        g.path(rleaf(51, 48, 34, -26, 0.37, 0.06), g.fill(P.green, "d"), { sw: 3 });
        g.stroke(rib(51, 48, 34, -26, 0.06), { sw: 2, color: P.green[2] });
        g.shine(26, 39, 6, 3, 0.6, 15);
      }),
  ],
  [
    "💨",
    "puff of air",
    (d) => {
      for (const [x1, y] of [[22, 34], [13, 50], [24, 66]]) {
        d.tube(`M${x1} ${y} H58`, P.sky[0], 7, 2.8);
        d.line(x1 + 3, y - 1, x1 + 18, y - 1, { sw: 2, color: "#ffffff", op: 0.8 });
      }
      const puff = ([[60, 50, 18], [74, 38, 12], [76, 59, 11.5], [48, 60, 10], [50, 38, 10.5]] as [number, number, number][]).map(([x, y, r]) => circlePath(x, y, r)).join(" ");
      d.path(puff, "none", { sw: 7 });
      d.path(puff, d.fill(P.white), { stroke: null });
      d.clip(puff, (c) => c.path(cloudPath(64, 80, 56, 40), P.white[2], { stroke: null, op: 0.45 }));
      d.shine(48, 36, 6, 3.5, 0.8, -30);
    },
  ],
  [
    "⚡",
    "lightning bolt",
    (d) => {
      d.glow(50, 50, 48, "#ffe066", 0.55);
      d.poly(BOLT, d.fill(P.gold, "d"), { sw: 3.5 });
      d.shine(45, 20, 3.5, 10, 0.65, 23);
    },
  ],
  [
    "🧊",
    "ice cube",
    (d) => {
      d.shadow(50, 91, 36, 5);
      const T: Pt = [50, 12];
      const R: Pt = [88, 30];
      const RB: Pt = [88, 70];
      const B: Pt = [50, 88];
      const LB: Pt = [12, 70];
      const L: Pt = [12, 30];
      const F: Pt = [50, 48];
      const S = roundPoly([T, R, RB, B, LB, L], 7);
      d.path(S, ICE[1], { sw: 3.5 });
      d.clip(S, (c) => {
        c.poly([...T, ...R, ...F, ...L], c.fill(["#ffffff", "#ecf9ff", "#c3e8fb"], "d"), { stroke: null });
        c.poly([...L, ...F, ...B, ...LB], c.fill(["#e6f7ff", "#b4e3fb", "#84c8ee"], "v"), { stroke: null });
        c.poly([...F, ...R, ...RB, ...B], c.fill(["#c6ecff", "#88ccf0", "#559fd6"], "v"), { stroke: null });
        c.stroke("M21 45 L21 63 M28 49 L28 57", { sw: 3.2, color: "#ffffff", op: 0.85 });
        c.stroke("M60 58 L60 74", { sw: 3, color: "#ffffff", op: 0.45 });
        for (const [x, y, r] of [[70, 66, 2.6], [77, 58, 1.8], [36, 74, 2]]) c.circle(x, y, r, "#ffffff", { stroke: null, op: 0.7 });
      });
      d.stroke("M14 31 L50 48 L86 31 M50 48 V86", { sw: 2.5 });
      d.path(S, "none", { sw: 3.5 });
      d.shine(40, 26, 10, 4, 0.8, 25);
    },
  ],
  [
    "🌿",
    "herb",
    (d) => {
      const A: Pt = [31, 89];
      const C: Pt = [38, 50];
      const Z: Pt = [66, 20];
      const at = (t: number): Pt => [(1 - t) ** 2 * A[0] + 2 * t * (1 - t) * C[0] + t * t * Z[0], (1 - t) ** 2 * A[1] + 2 * t * (1 - t) * C[1] + t * t * Z[1]];
      const ang = (t: number) => (Math.atan2((1 - t) * (C[1] - A[1]) + t * (Z[1] - C[1]), (1 - t) * (C[0] - A[0]) + t * (Z[0] - C[0])) * 180) / Math.PI;
      d.tube(`M${A[0]} ${A[1]} Q${C[0]} ${C[1]} ${Z[0]} ${Z[1]}`, P.green[2], 4, 2.5);
      const leaves: [number, number, number][] = [[0.2, -1, 24], [0.26, 1, 24], [0.42, -1, 23], [0.48, 1, 23], [0.64, -1, 20], [0.7, 1, 20], [0.85, -1, 16], [0.89, 1, 16], [1, 0, 13]];
      for (const [t, s, len] of leaves) {
        const [x, y] = at(t);
        const a = ang(t) + s * 52;
        const ramp = t > 0.7 ? P.lime : P.green;
        d.path(rleaf(x, y, len, a, 0.34, s * 0.04), d.fill(ramp, "d"), { sw: 2.6 });
        d.stroke(rib(x, y, len, a, s * 0.04), { sw: 1.8, color: ramp[2] });
      }
      const [sx, sy] = at(0.2);
      d.shine(sx - 12, sy - 8, 4.5, 2.2, 0.6, ang(0.2) - 52);
    },
  ],
  [
    "❄️",
    "snowflake",
    (d) => {
      d.glow(50, 50, 47, "#bfe8ff", 0.55);
      flake(d, 50, 50, 37.5, 7.5, 2.6);
      const hex: number[] = [];
      for (let i = 0; i < 6; i++) hex.push(50 + Math.cos(rad(i * 60 - 90)) * 9, 50 + Math.sin(rad(i * 60 - 90)) * 9);
      d.poly(hex, d.fill(ICE), { sw: 2.6 });
      d.shine(46, 46, 3, 1.8, 0.8, -30);
    },
  ],
  ["☁️", "cloud", (d) => cloud(d, 50, 57, 84, 62)],
  [
    "🌧️",
    "rain cloud",
    (d) => {
      for (const [x, y] of [[26, 74], [44, 84], [62, 74], [80, 84]]) rainDrop(d, x, y, 5.5);
      cloud(d, 50, 42, 82, 56, P.grey);
    },
  ],
  [
    "🌾",
    "wheat",
    (d) => {
      d.tube("M50 74 Q38 66 34 52 M50 74 V48 M50 74 Q62 66 66 52 M50 74 Q46 82 42 88 M50 74 V88 M50 74 Q54 82 58 88", P.gold[2], 4, 2.2);
      const head = (bx: number, by: number, deg: number) => {
        const a = rad(deg);
        const ux = Math.cos(a);
        const uy = Math.sin(a);
        for (let k = 4; k >= 0; k--) {
          const s = 5 + k * 5.6;
          for (const side of [-1, 1]) {
            const x = bx + ux * s - uy * side * 4;
            const y = by + uy * s + ux * side * 4;
            d.ellipse(x, y, 6.6, 4, d.fill(P.gold), { sw: 2, tf: `rotate(${f2(deg + side * 26)} ${f2(x)} ${f2(y)})` });
          }
        }
        const tx = bx + ux * 33;
        const ty = by + uy * 33;
        d.ellipse(tx, ty, 6.4, 3.8, d.fill(P.gold), { sw: 2, tf: `rotate(${f2(deg)} ${f2(tx)} ${f2(ty)})` });
      };
      head(34, 52, -112);
      head(66, 52, -68);
      head(50, 48, -90);
      d.path("M41 69 Q50 72 59 69 L59 77 Q50 80 41 77 Z", d.fill(P.wood, "v"), { sw: 2.5 });
    },
  ],
  [
    "🪵",
    "log",
    (d) =>
      d.g("translate(0 6)", (g) => {
        g.shadow(52, 79, 38, 6);
        g.tube("M66 36 Q67 27 74 21", P.brown[1], 4.5, 2.5);
        g.path(leaf(74, 21, 15, -40, 0.45), g.fill(P.green, "d"), { sw: 2.4 });
        g.path("M25 34 H78 Q90 34 90 53 Q90 72 78 72 H25 Z", g.fill(P.brown, "v"), { sw: 3.5 });
        g.stroke("M40 43 Q54 40 66 44 M47 59 Q62 56 79 60 M36 65 Q44 63 52 66 M72 46 Q79 45 84 48", { sw: 2.4, color: P.brown[2] });
        g.shine(52, 38.5, 12, 2.4, 0.4, -2);
        g.ellipse(25, 53, 13, 19, g.fill(P.tan), { sw: 3.5 });
        g.ellipse(25, 53, 9, 13.5, "none", { sw: 2, stroke: P.wood[1] });
        g.ellipse(25, 53, 4.8, 7.5, "none", { sw: 2, stroke: P.wood[1] });
        g.circle(25, 53, 1.8, P.wood[2], { stroke: null });
        g.shine(20, 44, 2.5, 5, 0.6, 15);
      }),
  ],
  [
    "🌈",
    "rainbow",
    (d) => {
      const cx = 50;
      const cy = 68;
      const R0 = 42;
      const bw = 4.6;
      const band = (r1: number, r2: number) => `M${f2(cx - r1)} ${cy} A${f2(r1)} ${f2(r1)} 0 0 1 ${f2(cx + r1)} ${cy} L${f2(cx + r2)} ${cy} A${f2(r2)} ${f2(r2)} 0 0 0 ${f2(cx - r2)} ${cy} Z`;
      const cols = [P.red[1], P.orange[1], P.gold[1], P.green[1], P.sky[1], P.violet[1]];
      cols.forEach((col, i) => d.path(band(R0 - i * bw, R0 - (i + 1) * bw), col, { stroke: null }));
      d.path(band(R0, R0 - 6 * bw), "none", { sw: 3 });
      d.stroke(`M${cx - R0 + 6} ${cy - 10} A${R0 - 4} ${R0 - 4} 0 0 1 ${cx - 14} ${cy - R0 + 6}`, { sw: 2.2, color: "#ffffff", op: 0.55 });
      cloud(d, 24, 72, 32, 24);
      cloud(d, 76, 72, 32, 24);
    },
  ],
  [
    "⛈️",
    "thunderstorm",
    (d) => {
      bolt(d, 50, 70, 0.46);
      rainDrop(d, 24, 74, 5);
      rainDrop(d, 78, 78, 5);
      cloud(d, 50, 40, 82, 56, P.stone);
    },
  ],
  [
    "🌀",
    "swirl",
    (d) => {
      const N = 70;
      const turns = 1.9;
      const outer: Pt[] = [];
      const inner: Pt[] = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const th = t * turns * Math.PI * 2 + 2.2;
        const r = 3 + 34 * t;
        const w = 1.6 + 6 * t;
        outer.push([44.5 + Math.cos(th) * (r + w), 45 + Math.sin(th) * (r + w)]);
        inner.push([44.5 + Math.cos(th) * (r - w), 45 + Math.sin(th) * (r - w)]);
      }
      const end = inner[N];
      const start = outer[0];
      const path = `${curve(outer)} A7.6 7.6 0 0 1 ${f2(end[0])} ${f2(end[1])} ${curve(inner.reverse()).replace(/^M[^C]*/, "")} A1.6 1.6 0 0 1 ${f2(start[0])} ${f2(start[1])} Z`;
      d.path(path, d.fill(P.blue, "d"), { sw: 3 });
      d.shine(25, 25, 6, 3, 0.55, -45);
    },
  ],
  [
    "🌬️",
    "wind",
    (d) => {
      const col = P.sky[0];
      d.g("translate(52 50) scale(0.88) translate(-50 -50)", (g) => {
        g.tube("M10 34 H50 C62 34 68 26 64 18 C60 11 48 14 52 24", col, 8, 3.2);
        g.tube("M8 52 H68 C82 52 90 40 84 32 C78 25 68 30 72 38", col, 8, 3.2);
        g.tube("M14 70 H52 C64 70 70 78 66 85 C62 92 50 90 53 81", col, 8, 3.2);
        for (const [x1, x2, y] of [[14, 40, 33], [12, 56, 51], [18, 44, 69]]) g.line(x1, y, x2, y, { sw: 2.3, color: "#ffffff", op: 0.8 });
      });
    },
  ],
  [
    "🌅",
    "sunrise",
    (d) => {
      tile(d, (c) => {
        c.rect(0, 0, 100, 62, 0, c.lin([[0, "#ff9fb1"], [0.5, "#ffbf8a"], [1, "#fff1a6"]]), { stroke: null });
        c.path(cloudPath(25, 28, 26, 10), "#ffffff", { stroke: null, op: 0.55 });
        c.path(cloudPath(77, 20, 20, 8), "#ffffff", { stroke: null, op: 0.55 });
        sun(c, 50, 62, 17);
        c.rect(0, 62, 100, 38, 0, c.lin([[0, "#7fd3ff"], [0.5, "#3aa0ec"], [1, "#2167c9"]]), { stroke: null });
        for (const [w, y] of [[30, 68], [22, 74.5], [14, 81], [7, 87]]) c.line(50 - w / 2, y, 50 + w / 2, y, { sw: 3.2, color: "#fff3a8", op: 0.95 });
        c.stroke("M14 75 q5 -3 10 0 M76 70 q5 -3 10 0 M70 85 q4 -2.5 8 0 M20 86 q4 -2.5 8 0", { sw: 2, color: "#ffffff", op: 0.7 });
        c.line(0, 62, 100, 62, { sw: 2.5 });
      });
    },
  ],
  ["🌕", "full moon", (d) => moon(d, 1, "r", [32, 30, -40])],
  [
    "🌸",
    "cherry blossom",
    (d) => {
      const cx = 50;
      const cy = 52;
      const s = 20.5;
      for (let i = 0; i < 5; i++) d.path(heart(cx, cy - 0.95 * s, s), d.rad([[0, "#ff8cc0"], [0.5, "#ffc4dc"], [1, "#fff0f6"]], 0.5, 1, 1.05), { sw: 3, tf: `rotate(${i * 72} ${cx} ${cy})` });
      for (let i = 0; i < 5; i++) {
        const a = rad(i * 72 - 90);
        d.line(cx + Math.cos(a) * 12, cy + Math.sin(a) * 12, cx + Math.cos(a) * 21, cy + Math.sin(a) * 21, { sw: 2, color: P.pink[1], op: 0.55 });
      }
      for (let i = 0; i < 10; i++) {
        const a = rad(i * 36 - 72);
        const x = cx + Math.cos(a) * 13;
        const y = cy + Math.sin(a) * 13;
        d.line(cx, cy, x, y, { sw: 1.8, color: P.pink[2] });
        d.circle(x, y, 2.3, P.gold[1], { sw: 1.4 });
      }
      d.circle(cx, cy, 6.5, d.fill(P.pink), { sw: 2.4 });
      d.shine(41, 23, 5, 2.8, 0.7, -30);
    },
  ],
  [
    "🍃",
    "blowing leaves",
    (d) => {
      d.tube("M12 70 C28 75 44 64 58 55 C72 46 86 44 88 34 C90 25 79 21 76 29", P.sky[0], 3.6, 2.2);
      const lf = (x: number, y: number, len: number, deg: number, ramp: Ramp, bend: number) => {
        const q = frame(x, y, len, deg);
        d.tube(`M${pt(q(0.02, 0))} L${pt(q(-0.16, 0.03))}`, ramp[2], 3, 2.2);
        d.path(rleaf(x, y, len, deg, 0.36, bend), d.fill(ramp, "d"), { sw: 3 });
        d.stroke(rib(x, y, len, deg, bend, 3), { sw: 1.9, color: ramp[2] });
      };
      lf(18, 47, 47, -32, P.green, -0.05);
      lf(44, 82, 41, -22, P.lime, 0.05);
      d.shine(31, 32, 6, 2.6, 0.6, -32);
    },
  ],
  [
    "🌻",
    "sunflower",
    (d) => {
      const cx = 50;
      const cy = 42;
      d.tube("M50 62 Q47 76 50 88", P.green[1], 6, 2.5);
      d.path(rleaf(49, 83, 24, 198, 0.36, 0.05), d.fill(P.green, "d"), { sw: 2.8 });
      d.path(rleaf(50, 79, 24, -18, 0.36, -0.05), d.fill(P.green, "d"), { sw: 2.8 });
      for (let i = 0; i < 16; i++) {
        const a = i * 22.5 + 11.25;
        d.path(leaf(cx + Math.cos(rad(a)) * 12, cy + Math.sin(rad(a)) * 12, 20, a, 0.36), d.fill(P.orange), { sw: 2.2 });
      }
      for (let i = 0; i < 16; i++) {
        const a = i * 22.5;
        d.path(leaf(cx + Math.cos(rad(a)) * 12, cy + Math.sin(rad(a)) * 12, 21.5, a, 0.4), d.fill(P.gold), { sw: 2.4 });
      }
      const C = circlePath(cx, cy, 16);
      d.path(C, d.fill(P.brown), { sw: 3 });
      d.clip(C, (c) => {
        for (let i = 1; i < 66; i++) {
          const r = 1.95 * Math.sqrt(i);
          const t = i * 2.39996;
          c.circle(cx + Math.cos(t) * r, cy + Math.sin(t) * r, 1.15, P.brown[2], { stroke: null, op: 0.8 });
        }
      });
      d.path(C, "none", { sw: 3 });
      d.shine(cx - 6.5, cy - 7.5, 4.5, 2.5, 0.5, -35);
    },
  ],
  ["🌑", "new moon", (d) => moon(d, 0, "r", [32, 30, -40])],
  [
    "⛄",
    "snowman",
    (d) => {
      d.shadow(50, 92, 30, 5);
      d.tube("M31 62 L14 48 M19.5 52.5 L11 55 M19.5 52.5 L18 43", P.brown[1], 3.6, 2.2);
      d.tube("M69 62 L86 48 M80.5 52.5 L89 55 M80.5 52.5 L82 43", P.brown[1], 3.6, 2.2);
      d.ball(50, 70, 22, P.white, { sw: 3.5 });
      for (const y of [65, 76]) d.circle(50, y, 2.7, d.fill(P.black), { sw: 1.5 });
      d.ball(50, 39, 15.5, P.white, { sw: 3.5 });
      d.path("M58 54 L66 70 Q62 73 58 72 L53 57 Z", d.fill(P.red, "v"), { sw: 2.5 });
      d.path(rr(34, 50, 32, 9, 4.5), d.fill(P.red, "v"), { sw: 2.6 });
      d.line(56, 51, 56, 58, { sw: 2.4, color: "#ffffff", op: 0.55 });
      d.line(44, 51, 44, 58, { sw: 2.4, color: "#ffffff", op: 0.55 });
      d.eye(44.5, 36, 2.6);
      d.eye(55.5, 36, 2.6);
      d.cheek(40.5, 42.5, 3);
      d.cheek(59.5, 42.5, 3);
      d.smile(50, 47.5, 8, 2);
      d.path("M50 40.5 L64 44 L50 46 Z", d.fill(P.orange), { sw: 2 });
      d.path(rr(39, 9, 22, 18, 3), d.fill(P.black, "h"), { sw: 3 });
      d.rect(39, 20, 22, 4.5, 0, d.fill(P.red, "v"), { sw: 2.2 });
      d.path(rr(33, 25, 34, 5.5, 2.75), d.fill(P.black, "v"), { sw: 2.8 });
      d.shine(43, 13, 2, 4, 0.35, 0);
    },
  ],
  [
    "🍂",
    "fallen leaves",
    (d) => {
      d.shadow(50, 79, 38, 5);
      const lf = (x: number, y: number, len: number, deg: number, ramp: Ramp) => {
        const q = frame(x, y, len, deg);
        d.tube(`M${pt(q(0.03, 0))} L${pt(q(-0.14, 0.03))}`, ramp[2], 3.4, 2.2);
        d.path(oakLeaf(x, y, len, deg, 1.25), d.fill(ramp, "d"), { sw: 3 });
        d.stroke(oakVeins(x, y, len, deg, 1.25), { sw: 2, color: ramp[2] });
      };
      lf(55, 68, 50, -150, P.wood);
      lf(45, 70, 50, -30, P.gold);
      lf(50, 75, 55, -92, P.orange);
      d.shine(44, 35, 3, 7, 0.5, 5);
    },
  ],
  [
    "🌷",
    "tulip",
    (d) => {
      d.shadow(50, 89, 22, 4);
      d.path("M49 88 Q24 79 20 46 Q37 58 49 81 Z", d.fill(P.green, "d"), { sw: 3 });
      d.path("M51 88 Q76 79 80 52 Q64 62 51 82 Z", d.fill(P.green, "d"), { sw: 3 });
      d.tube("M50 50 V87", P.green[1], 5.5, 2.5);
      d.path("M30 15 Q25 42 37 51 Q43 56 50 56 Q57 56 63 51 Q75 42 70 15 Q61 26 50 24 Q39 26 30 15 Z", d.fill([P.pink[1], P.pink[2], P.purple[2]], "v"), { sw: 3 });
      d.path("M50 10 Q64 20 65 36 Q64 52 50 57 Q36 52 35 36 Q36 20 50 10 Z", d.fill(P.pink), { sw: 3 });
      d.stroke("M50 24 Q47 38 50 51", { sw: 2, color: P.pink[2], op: 0.5 });
      d.shine(43, 28, 3.5, 8, 0.55, 12);
    },
  ],
  [
    "🌟",
    "glowing star",
    (d) => {
      d.glow(50, 51, 50, "#ffd23a", 0.8);
      for (let i = 0; i < 5; i++) {
        const a = rad(i * 72 - 54);
        d.tube(`M${f2(50 + Math.cos(a) * 27)} ${f2(51 + Math.sin(a) * 27)} L${f2(50 + Math.cos(a) * 37)} ${f2(51 + Math.sin(a) * 37)}`, P.orange[1], 4.5, 2.2);
      }
      d.path(softStar(50, 51, 37, 18), d.fill(P.gold), { sw: 3.5 });
      d.shine(39, 38, 6, 3.5, 0.6, -35);
      d.sparkle(84, 17, 8, "#ffffff");
      d.sparkle(16, 20, 5.5, "#ffffff");
      d.sparkle(85, 80, 5, "#ffffff");
    },
  ],
  [
    "🍄",
    "mushroom",
    (d) => {
      d.shadow(50, 91, 32, 5);
      d.path("M38 56 Q37 78 32 88 Q50 94 68 88 Q63 78 62 56 Z", d.fill(P.cream, "h"), { sw: 3.2 });
      d.path("M38.5 60 Q50 66 61.5 60 L61.8 66 Q50 71 38.2 66 Z", P.tan[1], { stroke: null, op: 0.7 });
      d.tube("M22 90 l-3 -7 M26 90 l1 -9 M74 90 l1 -9 M78 90 l4 -7", P.green[1], 2.6, 2);
      const cap = "M8 54 Q8 13 50 12 Q92 13 92 54 Q92 63 50 63 Q8 63 8 54 Z";
      d.path(cap, d.fill(P.red), { sw: 3.5 });
      d.clip(cap, (c) => {
        for (const [x, y, r] of [[31, 30, 7.5], [56, 23, 6], [75, 38, 8], [18, 47, 5], [46, 45, 5.5], [65, 56, 4], [88, 52, 4]]) c.circle(x, y, r, d.fill(P.white), { sw: 2 });
      });
      d.path(cap, "none", { sw: 3.5 });
      d.shine(26, 22, 8, 4, 0.55, -35);
    },
  ],
  [
    "🕳️",
    "hole",
    (d) => {
      d.path(lumpy(50, 52, 40, 25, 12, 0.05, 2), d.fill(P.green, "v"), { sw: 3.5 });
      d.tube("M16 40 l-2 -8 M20 38 l1 -8 M82 38 l1 -8 M86 40 l3 -7", P.green[1], 2.6, 2);
      d.ellipse(50, 50, 33, 17, d.fill(P.brown, "v"), { sw: 3 });
      const H = ell(50, 51, 24, 11);
      d.path(H, P.brown[2], { sw: 3 });
      d.clip(H, (c) => c.ellipse(50, 56.5, 24.5, 11, c.rad([[0, "#3d4360"], [0.6, "#23273b"], [1, "#16182a"]], 0.5, 0.7, 0.7), { stroke: null }));
      d.path(H, "none", { sw: 3 });
      d.shine(33, 40, 7, 2.4, 0.4, -12);
    },
  ],
  [
    "💦",
    "splash",
    (d) => {
      const puddle = "M16 86 Q18 78 32 79 L38 70 L44 78 L50 66 L56 78 L62 70 L68 79 Q82 78 84 86 Q84 92 50 92 Q16 92 16 86 Z";
      d.path(puddle, d.fill(P.sky, "v"), { sw: 3 });
      d.stroke("M26 87 Q50 82 74 87", { sw: 2, color: "#ffffff", op: 0.7 });
      const drops: [number, number, number][] = [[50, 31, 12.5], [22, 49, 9.5], [78, 47, 10]];
      for (const [x, y, s] of drops) {
        const rot = (Math.atan2(84 - y, 50 - x) * 180) / Math.PI + 90;
        d.path(drop(x, y, s), d.fill(P.sky), { sw: 3, tf: `rotate(${f2(rot)} ${x} ${y})` });
        const th = rad(rot);
        const rx = x - 0.25 * s * Math.sin(th);
        const ry = y + 0.25 * s * Math.cos(th);
        d.shine(rx - 0.36 * s, ry - 0.36 * s, 0.3 * s, 0.17 * s, 0.75, -40);
      }
    },
  ],
  [
    "🪐",
    "ringed planet",
    (d) => {
      const ring = (k: Pen) => {
        k.path(ell(50, 50, 46, 14) + ell(50, 50, 33, 8.6, true), k.fill(P.sand, "v"), { sw: 3 });
        k.path(ell(50, 50, 39.5, 11.3), "none", { sw: 2, stroke: P.sand[2] });
      };
      d.g("rotate(-20 50 50)", (g) => g.clip("M0 0 H100 V50 H0 Z", ring));
      const ball = circlePath(50, 50, 27);
      d.path(ball, d.fill(P.orange), { sw: 3.5 });
      d.clip(ball, (c) =>
        c.g("rotate(-20 50 50)", (g) => {
          g.rect(10, 34, 80, 6, 3, P.gold[0], { stroke: null, op: 0.6 });
          g.rect(10, 52, 80, 7, 3.5, P.coral[2], { stroke: null, op: 0.3 });
          g.rect(10, 64, 80, 5, 2.5, P.gold[0], { stroke: null, op: 0.45 });
        }),
      );
      d.path(ball, "none", { sw: 3.5 });
      d.shine(39, 35, 7, 3.6, 0.6, -35);
      d.g("rotate(-20 50 50)", (g) => g.clip("M0 50 H100 V100 H0 Z", ring));
    },
  ],
  [
    "🌴",
    "palm tree",
    (d) => {
      d.shadow(50, 92, 36, 4);
      d.tube("M42 88 Q40 60 54 35", d.fill(P.wood, "h"), 9, 3);
      d.path("M14 92 Q20 79 50 78 Q80 79 86 92 Z", d.fill(P.sand, "v"), { sw: 3.5 });
      for (let i = 1; i < 5; i++) {
        const t = i / 6.4 + 0.12;
        const x = (1 - t) ** 2 * 42 + 2 * t * (1 - t) * 40 + t * t * 54;
        const y = (1 - t) ** 2 * 88 + 2 * t * (1 - t) * 60 + t * t * 35;
        d.stroke(`M${f2(x - 4.5)} ${f2(y - 1)} q4.5 3 9 0`, { sw: 2, color: P.wood[2] });
      }
      const cx = 53;
      const cy = 33;
      const frond = (deg: number, len: number, lift: number) => {
        const tx = cx + Math.cos(rad(deg)) * len;
        const ty = cy + Math.sin(rad(deg)) * len + lift * 0.9;
        const kx = (cx + tx) / 2;
        const ky = (cy + ty) / 2 - lift;
        const nl = Math.hypot(tx - cx, ty - cy);
        const nx = (-(ty - cy) / nl) * len * 0.2;
        const ny = ((tx - cx) / nl) * len * 0.2;
        d.path(`M${cx} ${cy} Q${f2(kx + nx)} ${f2(ky + ny)} ${f2(tx)} ${f2(ty)} Q${f2(kx - nx)} ${f2(ky - ny)} ${cx} ${cy} Z`, d.fill(P.green, "d"), { sw: 2.8 });
        d.stroke(`M${cx} ${cy} Q${f2(kx)} ${f2(ky)} ${f2(tx)} ${f2(ty)}`, { sw: 1.8, color: P.forest[2] });
      };
      frond(200, 38, 10);
      frond(-20, 38, 10);
      frond(165, 36, 4);
      frond(15, 36, 4);
      for (const [x, y] of [[48, 40], [57, 41], [52.5, 45]] as Pt[]) d.ball(x, y, 5, P.brown, { sw: 2.4 });
      frond(-135, 31, 6);
      frond(-48, 31, 6);
      frond(-92, 23, 2);
      d.shine(44, 25, 4, 2, 0.5, -30);
    },
  ],
  [
    "🌵",
    "cactus",
    (d) => {
      d.shadow(50, 92, 32, 4);
      d.path("M16 92 Q22 79 50 79 Q78 79 84 92 Z", d.fill(P.sand, "v"), { sw: 3.5 });
      const G = P.green;
      d.path("M39 64 H31 Q22 64 22 55 V40 Q22 33 28.5 33 Q35 33 35 40 V52 H39 Z", d.fill(G, "h"), { sw: 3 });
      d.path("M61 54 H69 Q78 54 78 45 V30 Q78 23 71.5 23 Q65 23 65 30 V42 H61 Z", d.fill(G, "h"), { sw: 3 });
      d.path("M38 86 V30 Q38 17 50 17 Q62 17 62 30 V86 Z", d.fill(G, "h"), { sw: 3.5 });
      d.stroke("M46 24 V84 M54 24 V84 M28.5 38 V58 M71.5 28 V48", { sw: 2, color: G[2], op: 0.55 });
      d.stroke("M41 34 l-3 -2.5 M41 50 l-3 -2.5 M41 66 l-3 -2.5 M59 42 l3 -2.5 M59 58 l3 -2.5 M59 74 l3 -2.5 M25 46 l-3 -2 M75 36 l3 -2", { sw: 1.8, color: P.cream[1] });
      for (let i = 0; i < 5; i++) d.path(heart(50, 13.5, 5.2), d.fill(P.pink), { sw: 2, tf: `rotate(${i * 72} 50 18)` });
      d.circle(50, 18, 2.6, P.gold[1], { sw: 1.6 });
      d.shine(42.5, 34, 2.4, 9, 0.5, 0);
    },
  ],
  [
    "🌫️",
    "fog",
    (d) => {
      cloud(d, 50, 36, 78, 52, P.grey);
      for (const [x1, x2, y] of [[18, 70, 61], [30, 86, 73.5], [12, 62, 86]]) {
        d.tube(`M${x1} ${y} H${x2}`, P.grey[0], 6, 2.6);
        d.line(x1 + 3, y - 1.2, x1 + 16, y - 1.2, { sw: 2, color: "#ffffff", op: 0.9 });
      }
    },
  ],
  [
    "🪴",
    "potted plant",
    (d) => {
      d.shadow(50, 92, 26, 4);
      const leaves: [number, number, number, Ramp][] = [[-158, 34, 0.08, P.forest], [-22, 34, -0.08, P.forest], [-128, 40, 0.06, P.green], [-52, 40, -0.06, P.green], [-92, 42, 0.02, P.lime]];
      for (const [deg, len, bend, ramp] of leaves) {
        d.path(rleaf(50, 58, len, deg, 0.3, bend), d.fill(ramp, "d"), { sw: 2.8 });
        d.stroke(rib(50, 58, len, deg, bend), { sw: 1.9, color: ramp[2] });
      }
      d.path("M29 64 H71 L65.5 89 Q65 92 62 92 H38 Q35 92 34.5 89 Z", d.fill(P.coral, "v"), { sw: 3.5 });
      d.path(rr(24, 54, 52, 12, 4), d.fill(P.coral, "v"), { sw: 3.5 });
      d.shine(33, 58, 6, 2, 0.5, -4);
      d.shine(38, 72, 2.4, 7, 0.4, 8);
    },
  ],
  [
    "🌨️",
    "snow cloud",
    (d) => {
      for (const [x, y] of [[27, 72], [50, 81], [73, 72]]) flake(d, x, y, 8.5, 3.6, 2.2, false);
      cloud(d, 50, 40, 82, 56, P.grey);
    },
  ],
  [
    "🌼",
    "daisy",
    (d) => {
      for (let i = 0; i < 13; i++) {
        const a = (i * 360) / 13 - 90;
        d.path(petal(50 + Math.cos(rad(a)) * 9, 50 + Math.sin(rad(a)) * 9, 33, a, 0.2), d.fill(P.white), { sw: 2.4 });
      }
      const C = circlePath(50, 50, 14.5);
      d.path(C, d.fill(P.gold), { sw: 3 });
      d.clip(C, (c) => {
        for (let i = 1; i < 40; i++) {
          const r = 2.2 * Math.sqrt(i);
          const t = i * 2.39996;
          c.circle(50 + Math.cos(t) * r, 50 + Math.sin(t) * r, 1, P.orange[2], { stroke: null, op: 0.55 });
        }
      });
      d.path(C, "none", { sw: 3 });
      d.shine(44, 43, 4.5, 2.6, 0.6, -35);
    },
  ],
  [
    "🌌",
    "milky way",
    (d) => {
      tile(d, (c) => {
        c.rect(0, 0, 100, 100, 0, c.lin([[0, "#2c3478"], [0.6, "#1f2a66"], [1, "#141a44"]]), { stroke: null });
        c.g("rotate(-35 50 50)", (g) => {
          g.ellipse(50, 50, 72, 19, g.rad([[0, "#ffffff", 0.7], [0.3, "#d6c1ff", 0.55], [0.65, "#9b6cff", 0.28], [1, "#9b6cff", 0]], 0.5, 0.5, 0.5), { stroke: null });
          g.ellipse(50, 50, 58, 6, g.rad([[0, "#ffffff", 0.85], [0.6, "#ffc6e2", 0.4], [1, "#ffc6e2", 0]], 0.5, 0.5, 0.5), { stroke: null });
        });
        const dots: [number, number, number][] = [[18, 20, 1.3], [30, 14, 1], [44, 24, 1.4], [62, 16, 1.1], [78, 28, 1.3], [86, 14, 1], [22, 40, 1], [36, 46, 1.5], [52, 38, 1.2], [66, 48, 1], [82, 46, 1.3], [14, 58, 1.2], [28, 62, 1], [58, 60, 1.4], [72, 64, 1], [88, 60, 1.1], [42, 56, 1], [50, 30, 1], [70, 36, 1.5], [33, 30, 1.2]];
        for (const [x, y, r] of dots) c.circle(x, y, r, "#ffffff", { stroke: null, op: 0.9 });
        c.sparkle(26, 26, 6, "#fff4a8");
        c.sparkle(76, 20, 4.5, "#ffffff");
        c.sparkle(64, 56, 5, "#ffffff");
        c.path("M0 80 Q18 70 36 77 Q56 85 74 74 Q88 67 100 72 V100 H0 Z", c.fill(P.navy, "v"), { sw: 2.6 });
      });
    },
  ],
  ["🌎", "earth", (d) => globe(d, 14, -84)],
  ["🌒", "waxing crescent moon", (d) => moon(d, 0.27, "r", [72, 26, 40])],
  [
    "🌤️",
    "mostly sunny",
    (d) => {
      sun(d, 43, 42, 18);
      cloud(d, 65, 73, 54, 36);
    },
  ],
  [
    "🥀",
    "wilted flower",
    (d) => {
      const red: Ramp = [P.red[0], P.coral[2], P.brown[2]];
      const dry: Ramp = [P.lime[0], P.lime[2], P.brown[1]];
      d.g("translate(0 -5)", (g) => {
        g.shadow(50, 92, 28, 4);
        g.path(petal(60, 89, 15, -12, 0.38), g.fill(red, "d"), { sw: 2.2 });
        g.tube("M33 91 Q29 56 41 36 Q51 20 62 26 Q69 31 68 42", P.lime[2], 4.2, 2.5);
        g.path(rleaf(32, 70, 24, 172, 0.32, 0.16), g.fill(dry, "d"), { sw: 2.6 });
        g.path(rleaf(34, 56, 22, -12, 0.32, 0.18), g.fill(dry, "d"), { sw: 2.6 });
        roseBloom(g, red, "translate(72 56.8) rotate(165) scale(0.85)");
      });
    },
  ],
  [
    "🌞",
    "smiling sun",
    (d) => {
      sun(d, 50, 50, 24.5);
      d.eye(42, 47.5, 3.7);
      d.eye(58, 47.5, 3.7);
      d.cheek(36.5, 55.5, 4.2);
      d.cheek(63.5, 55.5, 4.2);
      d.smile(50, 55.5, 12, 2.8);
    },
  ],
  [
    "🌄",
    "mountain sunrise",
    (d) => {
      tile(d, (c) => {
        c.rect(0, 0, 100, 100, 0, c.lin([[0, "#ff9fb1"], [0.45, "#ffc58a"], [0.8, "#fff1a6"]]), { stroke: null });
        sun(c, 50, 60, 15);
        c.path("M-4 100 V64 L22 34 Q26 30 30 34 L56 72 L60 100 Z", c.fill(P.violet, "v"), { sw: 3 });
        c.path("M104 100 V66 L80 38 Q76 34 72 38 L44 76 L40 100 Z", c.fill(P.navy, "v"), { sw: 3 });
        c.path("M16 41 L22 34 Q26 30 30 34 L36 43 L31 40 L27 45 L22 39 Z", "#ffffff", { sw: 2.2 });
        c.path("M66 46 L72 38 Q76 34 80 38 L86 45 L81 43 L77 48 L72 43 Z", "#ffffff", { sw: 2.2 });
        c.path("M0 82 Q26 72 50 80 Q74 88 100 78 V100 H0 Z", c.fill(P.green, "v"), { sw: 3 });
        c.shine(20, 50, 2.5, 7, 0.35, 35);
      });
    },
  ],
  [
    "🍀",
    "four-leaf clover",
    (d) => {
      const cx = 50;
      const cy = 44;
      d.tube("M50 50 Q52 72 60 88", P.green[2], 4.5, 2.5);
      for (let i = 0; i < 4; i++) d.path(heart(cx, cy - 0.95 * 17, 17), d.fill(P.green), { sw: 3, tf: `rotate(${45 + i * 90} ${cx} ${cy})` });
      for (let i = 0; i < 4; i++) {
        const a = rad(45 + i * 90 - 90);
        const x = cx + Math.cos(a) * 17;
        const y = cy + Math.sin(a) * 17;
        d.stroke(`M${f2(x - Math.sin(a) * 7)} ${f2(y + Math.cos(a) * 7)} Q${f2(x - Math.cos(a) * 4)} ${f2(y - Math.sin(a) * 4)} ${f2(x + Math.sin(a) * 7)} ${f2(y - Math.cos(a) * 7)}`, { sw: 2.2, color: P.lime[0], op: 0.8 });
      }
      d.circle(cx, cy, 3.2, P.green[2], { sw: 2 });
      d.shine(31, 30, 5, 2.8, 0.6, -45);
    },
  ],
  [
    "🍁",
    "maple leaf",
    (d) => {
      d.tube("M50 58 Q50 76 55 88", P.brown[1], 4.5, 2.5);
      d.g("translate(50 46) scale(0.92) translate(-50 -46)", (g) => {
        g.poly(maplePoly(), g.fill(P.red, "d"), { sw: 3.4 });
        g.stroke("M50 60 L50 14 M50 60 L80 30 M50 60 L20 30 M50 60 L66 58 M50 60 L34 58", { sw: 2.4, color: P.red[2], op: 0.75 });
        g.shine(30, 33, 6, 3, 0.55, -25);
      });
    },
  ],
  [
    "🌦️",
    "sun and rain",
    (d) => {
      sun(d, 36, 34, 16);
      for (const [x, y] of [[40, 80], [58, 86], [76, 80]]) rainDrop(d, x, y, 5);
      cloud(d, 58, 53, 68, 46, P.grey);
    },
  ],
  [
    "🌲",
    "pine tree",
    (d) => {
      d.shadow(50, 92, 26, 4);
      d.path(rr(44, 74, 12, 18, 3), d.fill(P.wood, "h"), { sw: 3 });
      const tier = (top: number, bot: number, hw: number) => `M50 ${top} L${50 + hw} ${bot} Q50 ${bot + 8} ${50 - hw} ${bot} Z`;
      for (const [top, bot, hw] of [[34, 76, 38], [20, 57, 29], [7, 37, 20]]) {
        d.path(tier(top, bot, hw), d.fill(P.forest, "v"), { sw: 3.5 });
        d.stroke(`M${50 - hw * 0.3} ${top + (bot - top) * 0.32} L${50 - hw * 0.62} ${top + (bot - top) * 0.72}`, { sw: 3, color: "#ffffff", op: 0.35 });
      }
    },
  ],
  ["🌔", "waxing gibbous moon", (d) => moon(d, 0.73, "r", [46, 25, -30])],
  [
    "🌺",
    "hibiscus",
    (d) => {
      const cx = 50;
      const cy = 52;
      const R = 40;
      const hib = (a: number) => {
        const q = (da: number, r: number): Pt => [cx + Math.cos(rad(a + da)) * r * R, cy + Math.sin(rad(a + da)) * r * R];
        return smooth([q(0, 0.08), q(-26, 0.55), q(-34, 0.86), q(-22, 1), q(-8, 0.96), q(4, 1.02), q(18, 1), q(32, 0.88), q(28, 0.55)], 0.2);
      };
      for (let i = 0; i < 5; i++) d.path(hib(i * 72 - 90), d.fill(P.coral), { sw: 3 });
      d.circle(cx, cy, 17, d.rad([[0, P.red[2], 0.95], [0.55, P.red[2], 0.6], [1, P.red[2], 0]], 0.5, 0.5, 0.5), { stroke: null });
      for (let i = 0; i < 5; i++) {
        const a = rad(i * 72 - 90);
        d.line(cx + Math.cos(a) * 10, cy + Math.sin(a) * 10, cx + Math.cos(a) * 26, cy + Math.sin(a) * 26, { sw: 2, color: P.red[2], op: 0.5 });
      }
      d.tube(`M${cx} ${cy} Q58 42 66 26`, P.cream[1], 3.4, 2.2);
      for (const [x, y] of [[62, 27], [70, 25], [64, 21], [69, 31], [72, 20]] as Pt[]) d.circle(x, y, 2.4, P.gold[1], { sw: 1.5 });
      d.circle(cx, cy, 4, P.red[2], { sw: 2 });
      d.shine(36, 26, 6, 3, 0.55, -30);
    },
  ],
  [
    "🌹",
    "rose",
    (d) => {
      d.tube("M50 48 Q47 70 50 88", P.green[2], 4.6, 2.5);
      d.path("M48.6 60 L42 56 L48.4 64 Z M51.3 73 L58 70 L51.2 77 Z", P.green[2], { sw: 2 });
      d.path(rleaf(48.8, 68, 24, 196, 0.36, 0.06), d.fill(P.green, "d"), { sw: 2.8 });
      d.stroke(rib(48.8, 68, 24, 196, 0.06), { sw: 1.8, color: P.green[2] });
      d.path(rleaf(50, 80, 22, -16, 0.36, -0.06), d.fill(P.green, "d"), { sw: 2.8 });
      d.stroke(rib(50, 80, 22, -16, -0.06), { sw: 1.8, color: P.green[2] });
      roseBloom(d, P.red, "translate(50 30)");
    },
  ],
  ["🌏", "earth", (d) => globe(d, 5, 117)],
  [
    "🌪️",
    "tornado",
    (d) => {
      const N = 22;
      const L: Pt[] = [];
      const Rr: Pt[] = [];
      const cxAt = (t: number) => 50 + Math.sin(t * Math.PI * 1.15) * 9 - t * 5;
      const hwAt = (t: number) => 3 + 36 * (1 - t) ** 1.25;
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const y = 16 + t * 72;
        L.push([cxAt(t) - hwAt(t), y]);
        Rr.push([cxAt(t) + hwAt(t), y]);
      }
      const top = L[0];
      const topR = Rr[0];
      const bot = Rr[N];
      const botL = L[N];
      const funnel = `M${pt(top)} Q${f2(cxAt(0))} 4 ${pt(topR)} ${curve(Rr).replace(/^M[^C]*/, "")} Q${f2(cxAt(1))} ${f2(bot[1] + 5)} ${pt(botL)} ${curve([...L].reverse()).replace(/^M[^C]*/, "")} Z`;
      d.path(lumpy(48, 88, 16, 5, 9, 0.18, 3), d.fill(P.tan), { sw: 2.4 });
      d.path(funnel, d.fill(P.grey, "h"), { sw: 3.5 });
      d.clip(funnel, (c) => {
        for (let i = 1; i < 7; i++) {
          const t = i / 7.2;
          const x = cxAt(t);
          const w = hwAt(t);
          const y = 16 + t * 72;
          c.stroke(`M${f2(x - w - 2)} ${f2(y - 3)} Q${f2(x)} ${f2(y + 6)} ${f2(x + w + 2)} ${f2(y - 3)}`, { sw: 2.4, color: P.grey[2] });
        }
        c.path(ell(cxAt(0), 17, hwAt(0) - 4, 6), "#ffffff", { stroke: null, op: 0.4 });
      });
      d.path(funnel, "none", { sw: 3.5 });
      d.path(leaf(80, 66, 10, -30, 0.45), d.fill(P.green), { sw: 2 });
      d.circle(22, 72, 2.8, d.fill(P.brown), { sw: 1.8 });
      d.circle(78, 82, 2.2, d.fill(P.brown), { sw: 1.6 });
      d.shine(26, 21, 8, 3, 0.55, -6);
    },
  ],
  ["🌗", "third quarter moon", (d) => moon(d, 0.5, "l", [30, 30, -40])],
  ["🌓", "first quarter moon", (d) => moon(d, 0.5, "r", [64, 24, -20])],
  [
    "☔",
    "umbrella and rain",
    (d) => {
      for (const [x, y] of [[16, 26], [31, 16], [69, 16], [84, 26]]) rainDrop(d, x, y, 3.8, 2.2);
      d.tube("M50 56 V80 Q50 88 43 88 Q36.5 88 36.5 81", P.wood[1], 4.4, 2.5);
      const canopy = "M10 58 Q12 28 50 26 Q88 28 90 58 Q80 50 70 58 Q60 50 50 58 Q40 50 30 58 Q20 50 10 58 Z";
      d.path(canopy, d.fill(P.violet, "v"), { sw: 3.5 });
      d.clip(canopy, (c) => {
        c.path("M50 26 Q38 34 30 58 L50 58 Z", "#ffffff", { stroke: null, op: 0.22 });
        c.path("M50 26 Q62 34 70 58 L90 58 L90 20 Z", P.violet[2], { stroke: null, op: 0.25 });
      });
      d.stroke("M50 26 Q38 34 30 57 M50 26 V57 M50 26 Q62 34 70 57", { sw: 2.2, color: P.violet[2] });
      d.path(canopy, "none", { sw: 3.5 });
      d.tube("M50 25 V19", P.violet[2], 3, 2.2);
      d.shine(28, 38, 7, 3, 0.55, -40);
    },
  ],
  [
    "☄️",
    "comet",
    (d) => {
      d.path("M21.5 58.5 Q50 34 91 9 Q65 50 41.5 78.5 Z", d.lin([[0, "#ffe066"], [0.55, "#ff9f43"], [1, "#ff7a59", 0.85]], 0, 1, 1, 0), { sw: 3 });
      d.path("M26 64 Q52 42 82 18 Q60 52 36 74 Z", d.lin([[0, "#fffbd6"], [0.6, "#ffe066"], [1, "#ffcf94", 0.6]], 0, 1, 1, 0), { stroke: null });
      d.stroke("M34 62 Q52 46 72 26 M40 68 Q56 54 70 38", { sw: 2.2, color: "#ffffff", op: 0.7 });
      d.glow(31.5, 68.5, 24, "#fff4b0", 0.85);
      d.ball(31.5, 68.5, 14, P.lemon, { sw: 3.5 });
      d.sparkle(18, 22, 6, "#ffffff");
      d.sparkle(82, 76, 5, "#ffffff");
      d.sparkle(60, 86, 3.5, "#ffffff");
    },
  ],
  [
    "🌩️",
    "lightning cloud",
    (d) => {
      bolt(d, 51, 70, 0.5);
      cloud(d, 50, 40, 82, 56, P.grey);
    },
  ],
  [
    "⛅",
    "partly cloudy",
    (d) => {
      sun(d, 38, 41, 17);
      cloud(d, 55, 67, 74, 52);
    },
  ],
  ["🌖", "waning gibbous moon", (d) => moon(d, 0.73, "l", [30, 30, -40])],
  ["🌘", "waning crescent moon", (d) => moon(d, 0.27, "l", [25, 31, -45])],
  [
    "🎋",
    "bamboo",
    (d) => {
      d.shadow(50, 92, 28, 4);
      const stalk = (x: number, top: number, w: number, seg: number) => {
        for (let y = 92; y > top + 2; y -= seg) {
          const y0 = Math.max(top, y - seg);
          d.path(rr(x - w / 2, y0, w, y - y0, 3), d.fill(P.lime, "h"), { sw: 2.6 });
          if (y0 > top) d.path(rr(x - w / 2 - 1.5, y0 - 2, w + 3, 4, 2), d.fill(P.green, "h"), { sw: 2.2 });
        }
      };
      const lf = (x: number, y: number, len: number, deg: number, ramp: Ramp) => d.path(leaf(x, y, len, deg, 0.22), d.fill(ramp, "d"), { sw: 2.4 });
      stalk(64, 22, 8, 15);
      lf(64, 37, 26, -20, P.green);
      lf(64, 37, 22, 12, P.forest);
      lf(64, 67, 22, -8, P.green);
      stalk(40, 10, 11, 16);
      lf(40, 27, 28, -150, P.green);
      lf(40, 28, 21, -116, P.forest);
      lf(40, 58, 26, 192, P.green);
      lf(40, 58, 20, 160, P.forest);
      d.shine(37, 20, 1.6, 6, 0.6, 0);
    },
  ],
];
