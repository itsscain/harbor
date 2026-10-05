// Mammals and birds: pets, farm animals and wild ones. Animal faces get the house eyes (a dark
// oval with a sparkle) and a little smile. Face emoji (🐱 🐻 …) are drawn head-on like the dog;
// whole animals (🐕 🐘 …) stand side-on, facing left, on a soft ground shadow.

import { HAIR, OL, P, circlePath, leaf, lumpy, rr, smooth, type Pen, type Ramp } from "../pen";
import type { PicDef } from "..";

type Pt = [number, number];
const r2 = (v: number) => Math.round(v * 100) / 100;

/** The same ramp a step darker — far legs, the far wing, parts in shade. */
const deep = (r: Ramp): Ramp => [r[1], r[2], r[2]];

/** A scalloped ring of puffs round an ellipse: wool, manes, fluffy chests. */
function fluff(cx: number, cy: number, rx: number, ry: number, n = 12, puff = 0.16, rot = 0) {
  let s = "";
  for (let i = 0; i <= n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    const x = cx + Math.cos(a) * rx;
    const y = cy + Math.sin(a) * ry;
    if (i === 0) {
      s = `M${r2(x)} ${r2(y)}`;
      continue;
    }
    const m = rot + ((i - 0.5) / n) * Math.PI * 2;
    s += ` Q${r2(cx + Math.cos(m) * rx * (1 + puff * 2))} ${r2(cy + Math.sin(m) * ry * (1 + puff * 2))} ${r2(x)} ${r2(y)}`;
  }
  return `${s} Z`;
}

/** A head seen from the front: round on top, full cheeks, soft chin (half width w, half height h). */
function headPath(cx: number, cy: number, w: number, h: number) {
  return `M${cx} ${cy - h} C${r2(cx + w * 0.72)} ${cy - h} ${cx + w} ${r2(cy - h * 0.55)} ${cx + w} ${cy} C${cx + w} ${r2(cy + h * 0.62)} ${r2(cx + w * 0.58)} ${cy + h} ${cx} ${cy + h} C${r2(cx - w * 0.58)} ${cy + h} ${cx - w} ${r2(cy + h * 0.62)} ${cx - w} ${cy} C${cx - w} ${r2(cy - h * 0.55)} ${r2(cx - w * 0.72)} ${cy - h} ${cx} ${cy - h} Z`;
}

/** Points along a smooth (Catmull-Rom) curve through `pts`, `steps` per span. */
function along(pts: Pt[], steps = 10): Pt[] {
  const c: Pt[] = [];
  const n = pts.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n - 1, i + 2)];
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      const f = (a: number, b: number, cc: number, dd: number) => 0.5 * (2 * b + (cc - a) * t + (2 * a - 5 * b + 4 * cc - dd) * t * t + (3 * b - a - 3 * cc + dd) * t * t * t);
      c.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  c.push(pts[n - 1]);
  return c;
}

/** A smooth limb along a centerline, width w0 at the start → w1 at the end, round at both ends:
 *  trunks, tails, necks, horns. */
function limb(pts: Pt[], w0: number, w1: number, steps = 10) {
  const c = along(pts, steps);
  const L: Pt[] = [];
  const R: Pt[] = [];
  for (let i = 0; i < c.length; i++) {
    const a = c[Math.max(0, i - 1)];
    const b = c[Math.min(c.length - 1, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const tx = (b[0] - a[0]) / len;
    const ty = (b[1] - a[1]) / len;
    const w = (w0 + (w1 - w0) * (i / (c.length - 1))) / 2;
    L.push([c[i][0] - ty * w, c[i][1] + tx * w]);
    R.push([c[i][0] + ty * w, c[i][1] - tx * w]);
  }
  const pt = (p: Pt) => `${r2(p[0])} ${r2(p[1])}`;
  let s = `M${pt(L[0])}`;
  for (let i = 1; i < L.length; i++) s += ` L${pt(L[i])}`;
  s += ` A${r2(w1 / 2)} ${r2(w1 / 2)} 0 0 0 ${pt(R[R.length - 1])}`;
  for (let i = R.length - 2; i >= 0; i--) s += ` L${pt(R[i])}`;
  return `${s} A${r2(w0 / 2)} ${r2(w0 / 2)} 0 0 0 ${pt(L[0])} Z`;
}

/** A leg from y0 down to the ground at y1; `hoof` paints a dark foot. */
function leg(d: Pen, x: number, y0: number, y1: number, w: number, ramp: Ramp, hoof?: string, sw = 3) {
  d.path(rr(x - w / 2, y0, w, y1 - y0, w * 0.48), d.fill(ramp, "h"), { sw });
  if (hoof) {
    const h = Math.min(w * 0.75, (y1 - y0) * 0.35);
    d.path(`M${r2(x - w / 2)} ${r2(y1 - h)} H${r2(x + w / 2)} V${r2(y1 - w * 0.3)} Q${r2(x + w / 2)} ${y1} ${r2(x + w * 0.2)} ${y1} H${r2(x - w * 0.2)} Q${r2(x - w / 2)} ${y1} ${r2(x - w / 2)} ${r2(y1 - w * 0.3)} Z`, hoof, { sw });
  }
}

/** Whiskers: three a side, fanning out from the muzzle. */
function whiskers(d: Pen, cx: number, cy: number, gap: number, len: number, sw = 2) {
  for (const s of [-1, 1])
    for (const k of [-1, 0, 1]) d.stroke(`M${cx + s * gap} ${cy + k * 2.6} Q${cx + s * (gap + len * 0.55)} ${cy + k * 3.6 - 1.2} ${cx + s * (gap + len)} ${cy + k * 6.5 - 0.5}`, { sw });
}

/** Two lobes of muzzle (cats, lions, tigers) outlined as one shape. */
function muzzle(d: Pen, cx: number, cy: number, r: number, fill: string, sw = 2.4) {
  d.circle(cx - r * 0.68, cy, r, fill, { sw });
  d.circle(cx + r * 0.68, cy, r, fill, { sw });
  d.circle(cx - r * 0.68, cy, r - sw / 2, fill, { stroke: null });
  d.circle(cx + r * 0.68, cy, r - sw / 2, fill, { stroke: null });
}

/** An eye that still shows on dark fur: a pale ring round the house eye. */
function ringEye(d: Pen, x: number, y: number, r: number) {
  d.circle(x, y, r * 1.4, "#fff", { stroke: null });
  d.eye(x, y, r);
}

const uids = new WeakMap<Pen, number>();
/** One gradient shared by several shapes, so a neck and a body shade as one piece: the house
 *  round light from the top-left, laid over the box x0,y0 → x1,y1. */
function oneFill(d: Pen, r: Ramp, x0: number, y0: number, x1: number, y1: number) {
  const n = uids.get(d) ?? 0;
  uids.set(d, n + 1);
  const w = x1 - x0;
  const h = y1 - y0;
  d.raw(`<defs><radialGradient id="ua${n}" gradientUnits="userSpaceOnUse" cx="${r2(x0 + w * 0.35)}" cy="${r2(y0 + h * 0.3)}" r="${r2(Math.max(w, h) * 0.85)}"><stop offset="0" stop-color="${r[0]}"/><stop offset="0.55" stop-color="${r[1]}"/><stop offset="1" stop-color="${r[2]}"/></radialGradient></defs>`);
  return `url(#ua${n})`;
}

/** An ellipse as a path (for clips and unions), turned `rot` degrees. */
function oval(cx: number, cy: number, rx: number, ry: number, rot = 0) {
  const a = (rot * Math.PI) / 180;
  const at = (t: number, k = 1): Pt => {
    const x = Math.cos(t) * rx * k;
    const y = Math.sin(t) * ry * k;
    return [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)];
  };
  // Four cubic quarter-arcs; the handles are the tangent points scaled by the circle constant.
  const K = 0.5523;
  const q = Math.PI / 2;
  let s = `M${at(0).map(r2).join(" ")}`;
  for (let i = 0; i < 4; i++) {
    const t0 = i * q;
    const t1 = t0 + q;
    const p0 = at(t0);
    const p1 = at(t1);
    const d0 = [at(t0 + q)[0] - cx, at(t0 + q)[1] - cy];
    const d1 = [at(t1 - q)[0] - cx, at(t1 - q)[1] - cy];
    s += ` C${r2(p0[0] + d0[0] * K)} ${r2(p0[1] + d0[1] * K)} ${r2(p1[0] + d1[0] * K)} ${r2(p1[1] + d1[1] * K)} ${r2(p1[0])} ${r2(p1[1])}`;
  }
  return `${s} Z`;
}

/** Several shapes drawn as one outlined piece — no lines where they overlap. */
function union(d: Pen, paths: string[], fill: string, sw = 3.5) {
  for (const p of paths) d.path(p, "none", { sw: sw * 2 });
  for (const p of paths) d.path(p, fill, { stroke: null });
}

/** A bushy tail: puffs (radius r0 → r1) overlapping along a curve, outlined as one piece.
 *  Returns the tail's outline (all the puffs) for clipping fur marks inside it. */
function bushy(d: Pen, pts: Pt[], r0: number, r1: number, ramp: Ramp, n = 11, sw = 3.2) {
  const c = along(pts, 24);
  const puffs: string[] = [];
  for (let i = 0; i < n; i++) {
    const p = c[Math.round((i / (n - 1)) * (c.length - 1))];
    puffs.push(circlePath(p[0], p[1], r0 + ((r1 - r0) * i) / (n - 1)));
  }
  const xs = c.map((p) => p[0]);
  const ys = c.map((p) => p[1]);
  union(d, puffs, oneFill(d, ramp, Math.min(...xs) - r0, Math.min(...ys) - r0, Math.max(...xs) + r0, Math.max(...ys) + r0), sw);
  return puffs.join(" ");
}


/** Scale a drawing by `s` about the board's center, then nudge it by (dx, dy) — keeps wide or
 *  low animals centered and inside the frame. */
function place(dx: number, dy: number, s: number, fn: (d: Pen) => void) {
  return (d: Pen) => {
    d.g(`translate(${r2(50 + dx)} ${r2(50 + dy)}) scale(${s}) translate(-50 -50)`, fn);
  };
}

/** A spiky coat: a zigzag along the top of an ellipse (a0 → a1 degrees), closed along `base`. */
function spiky(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number, tip: number, base: Pt[]) {
  const pts: Pt[] = [];
  for (let i = 0; i <= n * 2; i++) {
    const a = ((a0 + ((a1 - a0) * i) / (n * 2)) * Math.PI) / 180;
    const k = i % 2 ? 1 + tip : 1;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return `M${[...pts, ...base].map((p) => `${r2(p[0])} ${r2(p[1])}`).join(" L")} Z`;
}

/** A camel's head on the end of its neck: droopy lips, long lashes. */
function camelHead(d: Pen, c: Ramp) {
  d.path(leaf(32, 24, 8, -62, 0.45), d.fill(c), { sw: 2.4 });
  d.ellipse(22, 30, 13, 9, d.fill(c), { sw: 3, tf: "rotate(10 22 30)" });
  d.path("M10 32.5 Q8.5 39 13.5 40 Q18 40.5 19.5 37", d.fill(c), { sw: 2.4 });
  d.eye(22.5, 27.5, 3.8);
  d.stroke("M19 23 l-1.2 -2.6 M22.5 22.4 l0 -2.8 M26 23 l1.2 -2.6", { sw: 1.7 });
  d.cheek(25.5, 33.5, 3);
  d.shine(18, 25, 3.4, 1.7, 0.5, -20);
}

// The horse family's side-on body and head (horse, zebra).
const EQ_BODY = "M38 50 C38 42 46 38 58 38 L74 38 C84 38 89 44 89 51 C89 60 83 65 74 65 L52 65 C43 65 38 58 38 50 Z";
const EQ_NECK: Pt[] = [[48, 48], [38, 34], [32, 26]];
const EQ_HEAD = "M35 15 C27 15 21 21 17 29 C14 34 11 39 13 43 C15 47 21 47 24 43 C28 39 34 39 39 34 C43 29 42 18 35 15 Z";

export const ANIMALS: PicDef[] = [
  [
    "🐶",
    "dog",
    (d) => {
      // Floppy ears behind the head.
      for (const s of [-1, 1]) d.path(`M${50 + s * 22} 24 Q${50 + s * 46} 22 ${50 + s * 44} 52 Q${50 + s * 42} 72 ${50 + s * 31} 66 Q${50 + s * 25} 46 ${50 + s * 14} 32 Z`, d.fill(P.brown, "v"), { sw: 3 });
      d.path("M50 16 C72 16 82 32 81 52 C80 74 66 88 50 88 C34 88 20 74 19 52 C18 32 28 16 50 16 Z", d.fill(P.tan), { sw: 3.5 });
      d.path(lumpy(37, 41, 11, 10, 7, 0.12, 2), P.wood[1], { stroke: null, op: 0.75 });
      d.ellipse(50, 66, 20, 15, d.fill(P.cream), { sw: 3 });
      d.eye(37, 46, 5);
      d.eye(63, 46, 5);
      d.path("M43 57 Q50 53 57 57 Q56 63 50 65 Q44 63 43 57 Z", d.fill(P.black), { sw: 2.5 });
      d.shine(47, 57, 3, 1.5, 0.7, -10);
      d.stroke("M50 65 V70 M50 70 Q45 75 40 70 M50 70 Q55 75 60 70", { sw: 2.5 });
      d.path("M45 73 Q50 85 56 73 Z", d.fill(P.pink), { sw: 2.2 });
      d.cheek(29, 62, 4.5);
      d.cheek(71, 62, 4.5);
      d.shine(36, 26, 8, 4, 0.45, -15);
      void OL;
    },
  ],
  [
    "🐑",
    "sheep",
    place(-1.5, -6, 1, (d) => {
      d.shadow(58, 89, 30);
      leg(d, 50, 66, 87, 7.5, deep(P.ink));
      leg(d, 80, 66, 87, 7.5, deep(P.ink));
      const wool = fluff(60, 53, 28, 19, 13, 0.14);
      d.path(wool, d.fill(P.white), { sw: 3.5 });
      for (const [x, y] of [[54, 49], [70, 45], [77, 58], [62, 62]] as Pt[]) d.stroke(`M${x - 4} ${y} q4 -5 8 0`, { color: P.white[2], sw: 2.2 });
      leg(d, 41, 67, 88, 8, P.ink);
      leg(d, 71, 67, 88, 8, P.ink);
      d.shine(52, 39, 10, 4, 0.8, -12);
      // Head: a dark face, the ear out the back, a woolly cap.
      d.path(leaf(36, 45, 16, 25, 0.45), d.fill(P.ink), { sw: 2.5 });
      d.path(leaf(38, 46, 9, 25, 0.3), P.rose[1], { stroke: null, op: 0.9 });
      d.ellipse(26, 47, 14.5, 12, d.fill(P.ink), { sw: 3, tf: "rotate(-30 26 47)" });
      d.path(fluff(32, 36, 9.5, 7, 8, 0.2), d.fill(P.white), { sw: 2.5 });
      ringEye(d, 24, 46, 3.6);
      d.stroke("M14.5 54.5 Q17 57.5 19.5 54.5", { color: P.ink[0], sw: 2 });
      d.shine(19, 42, 3.5, 1.8, 0.35, -30);
    }),
  ],
  [
    "🐦",
    "bird",
    place(-1.5, -3.5, 0.97, (d) => {
      d.shadow(48, 90, 20);
      d.tube("M43 78 V88 M39 89 H47 M53 78 V88 M49 89 H57", P.orange[1], 2.6, 2);
      d.path("M66 56 L88 36 Q95 41 91 48 Q97 52 92 59 Q88 64 76 66 Z", d.fill(P.blue, "d"), { sw: 3 });
      d.path("M45 34 Q42 22 52 18 Q50 26 55 31 Z", d.fill(P.sky), { sw: 2.5 });
      const body = "M48 31 C66 31 77 43 77 58 C77 74 65 84 48 84 C30 84 19 72 19 56 C19 42 31 31 48 31 Z";
      d.path(body, d.fill(P.sky), { sw: 3.5 });
      d.clip(body, (c) => c.ellipse(44, 76, 24, 14, P.cream[1], { stroke: null }));
      d.path(body, "none", { sw: 3.5 });
      d.path("M38 55 C39 46 52 44 62 48 L80 55 Q78 60.5 72 59.5 L76 63.5 Q71 67.5 66 64 L68 69 Q60 71.5 53 67 C44 66.5 37 62 38 55 Z", d.fill(P.blue), { sw: 2.8 });
      d.stroke("M62 59.5 L71 59.8 M56 63.5 L65.5 64.2", { color: P.blue[2], sw: 1.8, op: 0.8 });
      d.path("M23 47 L9 51 L23 56 Z", d.fill(P.orange), { sw: 2.5 });
      d.eye(33, 46, 4.6);
      d.cheek(31, 57, 4);
      d.shine(38, 38, 8, 3.6, 0.6, -25);
    }),
  ],
  [
    "🦉",
    "owl",
    (d) => {
      d.path(rr(10, 83, 80, 9, 4.5), d.fill(P.brown, "v"), { sw: 3 });
      for (const s of [-1, 1]) d.path(`M${50 + s * 20} 28 L${50 + s * 30} 9 Q${50 + s * 33} 10 ${50 + s * 32} 14 L${50 + s * 31} 34 Z`, d.fill(P.wood), { sw: 3 });
      const body = "M50 17 C71 17 82 31 82 52 C82 74 68 87 50 87 C32 87 18 74 18 52 C18 31 29 17 50 17 Z";
      d.path(body, d.fill(P.wood), { sw: 3.5 });
      d.clip(body, (c) => {
        c.ellipse(50, 70, 20, 17, P.tan[1], { stroke: null });
        for (const [x, y] of [[43, 66], [57, 66], [50, 73], [43, 80], [57, 80]] as Pt[]) c.stroke(`M${x - 3} ${y} L${x} ${y + 3} L${x + 3} ${y}`, { color: P.wood[2], sw: 2 });
      });
      d.path(body, "none", { sw: 3.5 });
      for (const s of [-1, 1]) d.path(`M${50 + s * 30} 46 C${50 + s * 40} 56 ${50 + s * 38} 74 ${50 + s * 25} 84 C${50 + s * 26} 70 ${50 + s * 24} 58 ${50 + s * 30} 46 Z`, d.fill(P.brown), { sw: 3 });
      for (const s of [-1, 1]) d.circle(50 + s * 12, 43, 13, P.tan[0], { sw: 2.5 });
      for (const s of [-1, 1]) d.circle(50 + s * 12, 43, 11.8, P.tan[0], { stroke: null });
      for (const s of [-1, 1]) {
        d.circle(50 + s * 12, 43, 8.6, d.fill(P.gold), { sw: 2 });
        d.eye(50 + s * 12, 43, 5.4);
      }
      d.path("M45 51 L55 51 L50 60 Z", d.fill(P.orange), { sw: 2.2 });
      d.tube("M40 84 V88 M44 84 V89 M56 84 V89 M60 84 V88", P.orange[1], 3, 1.8);
      d.shine(34, 26, 7, 3.5, 0.5, -25);
    },
  ],
  [
    "🦁",
    "lion",
    (d) => {
      d.path(fluff(50, 50, 38, 38, 14, 0.1), d.fill(P.orange), { sw: 3.5 });
      for (let i = 0; i < 14; i++) {
        const a = ((i + 0.5) / 14) * Math.PI * 2;
        d.stroke(`M${r2(50 + Math.cos(a) * 30)} ${r2(50 + Math.sin(a) * 30)} L${r2(50 + Math.cos(a) * 36)} ${r2(50 + Math.sin(a) * 36)}`, { color: P.orange[2], sw: 2.5 });
      }
      for (const s of [-1, 1]) {
        d.circle(50 + s * 20, 30, 8.5, d.fill(P.gold), { sw: 3 });
        d.circle(50 + s * 20, 30, 4, P.orange[1], { stroke: null });
      }
      d.path(headPath(50, 54, 25, 25), d.fill(P.gold), { sw: 3.5 });
      muzzle(d, 50, 65, 9, P.cream[1]);
      d.path("M44 58 Q50 55 56 58 Q55 63 50 65 Q45 63 44 58 Z", d.fill(P.brown), { sw: 2.4 });
      d.stroke("M50 65 V68 M50 68 Q46 72 42 69 M50 68 Q54 72 58 69", { sw: 2.2 });
      d.eye(40, 48, 4.6);
      d.eye(60, 48, 4.6);
      d.cheek(32, 61, 4);
      d.cheek(68, 61, 4);
      d.shine(39, 36, 7, 3.4, 0.5, -20);
      d.shine(26, 22, 6, 3, 0.4, -40);
    },
  ],
  [
    "🦆",
    "duck",
    place(0.5, -4, 1, (d) => {
      d.shadow(56, 90, 28);
      for (const x of [49, 63]) {
        d.tube(`M${x} 78 V86`, P.orange[1], 3.4, 2);
        d.path(`M${x} 85 L${x - 8} 90 Q${x - 1} 93 ${x + 6} 90 Z`, d.fill(P.orange), { sw: 2.2 });
      }
      const body = "M26 62 C24 77 40 85 57 85 C75 85 87 75 90 61 Q92 52 88 45 Q82 53 71 52 C60 50 50 48 40 50 C32 52 27 56 26 62 Z";
      d.path(body, d.fill(P.grey), { sw: 3.5 });
      d.clip(body, (c) => c.ellipse(32, 68, 15, 19, c.fill(HAIR.auburn), { stroke: null }));
      d.path(body, "none", { sw: 3.5 });
      const wing = "M44 61 C52 53 72 52 84 59 C78 70 60 73 48 69 Z";
      d.path(wing, d.fill(P.stone), { sw: 2.8 });
      d.clip(wing, (c) => c.rect(70, 50, 6, 30, 0, P.blue[1], { stroke: null }));
      d.path(wing, "none", { sw: 2.8 });
      d.circle(34, 36, 15, d.fill(P.green), { sw: 3.5 });
      d.stroke("M24 47 Q34 53 44 47", { color: "#fff", sw: 3.5 });
      d.path("M21 35 Q12 32 8 37 Q7 43 12 44 Q18 45 22 42 Z", d.fill(P.gold), { sw: 2.6 });
      d.eye(33, 32, 4);
      d.cheek(37, 41, 3.4);
      d.shine(28, 27, 5, 2.6, 0.5, -30);
      d.shine(46, 58, 6, 2.4, 0.4, -10);
    }),
  ],
  [
    "🐱",
    "cat",
    place(0, 2.5, 1, (d) => {
      for (const s of [-1, 1]) {
        d.path(`M${50 + s * 30} 47 Q${50 + s * 34} 24 ${50 + s * 30} 12 Q${50 + s * 28} 8 ${50 + s * 23} 11 Q${50 + s * 12} 18 ${50 + s * 4} 28 Z`, d.fill(P.orange), { sw: 3 });
        d.path(`M${50 + s * 26} 38 Q${50 + s * 28} 24 ${50 + s * 26} 17 Q${50 + s * 18} 21 ${50 + s * 12} 28 Z`, P.rose[1], { stroke: null });
      }
      const head = headPath(50, 55, 33, 28);
      d.path(head, d.fill(P.orange), { sw: 3.5 });
      d.clip(head, (c) => {
        for (const x of [42, 50, 58]) c.path(`M${x - 3.2} 25 L${x} ${x === 50 ? 39 : 36} L${x + 3.2} 25 Z`, P.orange[2], { stroke: null });
        for (const s of [-1, 1]) for (const y of [50, 57]) c.stroke(`M${50 + s * 36} ${y} Q${50 + s * 30} ${y} ${50 + s * 26} ${y + 2}`, { color: P.orange[2], sw: 3 });
      });
      muzzle(d, 50, 66, 8.5, P.cream[1], 2.2);
      d.path("M46 60 Q50 58 54 60 Q52.5 64 50 65 Q47.5 64 46 60 Z", d.fill(P.pink), { sw: 2 });
      d.stroke("M50 65 V67 M50 67 Q47 70.5 44 68 M50 67 Q53 70.5 56 68", { sw: 2 });
      whiskers(d, 50, 66, 13, 26, 2);
      for (const x of [38, 62]) {
        d.eye(x, 48, 5.4);
        d.circle(x + 1.8, 50.6, 1, "#fff", { stroke: null });
      }
      d.cheek(29, 61, 4.2);
      d.cheek(71, 61, 4.2);
      d.shine(36, 35, 7, 3.2, 0.45, -20);
    }),
  ],
  [
    "🐘",
    "elephant",
    place(-2, -4, 0.95, (d) => {
      const g = P.steel;
      d.shadow(56, 90, 34);
      leg(d, 53, 62, 88, 12, deep(g));
      leg(d, 85, 62, 88, 12, deep(g));
      d.tube("M89 52 Q95 60 92 68", g[2], 2.4, 2);
      d.path(leaf(92, 66, 8, 100, 0.55), d.fill(deep(g)), { sw: 2 });
      d.path("M38 56 C36 36 52 28 67 28 C83 28 93 40 91 56 C90 70 80 76 66 76 C52 76 40 72 38 56 Z", d.fill(g), { sw: 3.5 });
      for (const x of [43, 75]) {
        leg(d, x, 64, 88, 13, g);
        for (const k of [-3.2, 3.2]) d.ellipse(x + k, 87, 2.3, 1.8, P.cream[1], { sw: 1.5 });
      }
      d.shine(62, 36, 10, 4, 0.5, -10);
      d.circle(35, 42, 19, d.fill(g), { sw: 3.5 });
      d.path(limb([[24, 48], [16, 56], [14, 67], [17, 75], [24, 77]], 13, 7.5), d.fill(g, "h"), { sw: 3 });
      d.stroke("M14 62 h5 M14 67 h5", { color: g[2], sw: 2 });
      d.path("M42 27 C58 22 64 38 62 50 C60 62 50 66 43 60 C47 50 47 37 42 27 Z", d.fill(g), { sw: 3 });
      d.path("M46 32 C56 31 58 41 57 49 C56 56 51 58 47 56 C49 48 49 39 46 32 Z", P.rose[1], { stroke: null, op: 0.7 });
      d.eye(31, 38, 4);
      d.cheek(34, 48, 3.6);
      d.smile(26, 53, 5, 2.2);
      d.shine(28, 30, 6, 3, 0.5, -30);
    }),
  ],
  [
    "🐾",
    "paw prints",
    place(0, 5.5, 1.05, (d) => {
      const paw = (cx: number, cy: number, rot: number) =>
        d.g(`rotate(${rot} ${cx} ${cy})`, (g) => {
          g.path(`M${cx - 12} ${cy + 3} C${cx - 13} ${cy - 9} ${cx + 13} ${cy - 9} ${cx + 12} ${cy + 3} C${cx + 11} ${cy + 11} ${cx + 4} ${cy + 9} ${cx} ${cy + 11} C${cx - 4} ${cy + 9} ${cx - 11} ${cy + 11} ${cx - 12} ${cy + 3} Z`, g.fill(P.brown), { sw: 3 });
          g.shine(cx - 5, cy - 2, 4, 2, 0.45, -15);
          for (const [dx, dy, a] of [[-13, -11, -25], [-4.8, -17.5, -8], [4.8, -17.5, 8], [13, -11, 25]] as [number, number, number][]) {
            g.ellipse(cx + dx, cy + dy, 4.4, 5.6, g.fill(P.brown), { sw: 2.6, tf: `rotate(${a} ${cx + dx} ${cy + dy})` });
          }
        });
      paw(33, 68, -16);
      paw(67, 34, 14);
    }),
  ],
  [
    "🐻",
    "bear",
    (d) => {
      for (const s of [-1, 1]) {
        d.circle(50 + s * 24, 27, 11, d.fill(P.brown), { sw: 3 });
        d.circle(50 + s * 24, 27, 5.5, P.tan[1], { stroke: null });
      }
      d.path(headPath(50, 55, 33, 30), d.fill(P.brown), { sw: 3.5 });
      d.ellipse(50, 65, 15, 12, d.fill(P.tan), { sw: 2.8 });
      d.ellipse(50, 59, 6.5, 4.4, d.fill(P.black), { sw: 2.2 });
      d.shine(48, 57.5, 2.4, 1.2, 0.7, -10);
      d.stroke("M50 63 V67 M50 67 Q46 71 43 68 M50 67 Q54 71 57 68", { sw: 2.2 });
      d.eye(37, 48, 4.8);
      d.eye(63, 48, 4.8);
      d.cheek(29, 61, 4.4);
      d.cheek(71, 61, 4.4);
      d.shine(36, 34, 8, 4, 0.4, -18);
    },
  ],
  [
    "🐧",
    "penguin",
    place(0, -2, 1, (d) => {
      d.shadow(50, 91, 22);
      for (const s of [-1, 1]) d.ellipse(50 + s * 10, 88, 9, 4.5, d.fill(P.orange), { sw: 2.5 });
      for (const s of [-1, 1]) d.path(`M${50 + s * 26} 44 C${50 + s * 38} 54 ${50 + s * 38} 68 ${50 + s * 32} 76 C${50 + s * 26} 70 ${50 + s * 22} 58 ${50 + s * 22} 48 Z`, d.fill(P.ink), { sw: 3 });
      d.path("M50 12 C72 12 80 32 80 54 C80 76 68 90 50 90 C32 90 20 76 20 54 C20 32 28 12 50 12 Z", d.fill(P.ink), { sw: 3.5 });
      d.path("M50 33 C46 25 34 25 32 37 C30 45 31 52 32 60 C30 72 38 84 50 84 C62 84 70 72 68 60 C69 52 70 45 68 37 C66 25 54 25 50 33 Z", d.fill(P.white), { sw: 2.2 });
      d.eye(41, 41, 4.2);
      d.eye(59, 41, 4.2);
      d.path("M44 49 Q50 46 56 49 L50 57 Z", d.fill(P.orange), { sw: 2.2 });
      d.cheek(36, 51, 3.6);
      d.cheek(64, 51, 3.6);
      d.shine(37, 20, 8, 3.6, 0.35, -20);
    }),
  ],
  [
    "🕊️",
    "dove",
    place(0.5, 10, 0.93, (d) => {
      d.path("M54 50 C55 32 66 16 86 11 C85 24 80 36 68 50 Z", d.fill(P.silver), { sw: 3 });
      d.path("M70 52 L89 47 Q95 51 91 56 Q96 60 91 64 Q93 70 86 70 L68 64 Z", d.fill(P.white), { sw: 3 });
      const body = "M18 48 C20 38 30 36 38 40 C48 44 59 46 72 52 C78 55 78 62 72 64 C58 70 40 70 30 62 C24 58 18 56 18 48 Z";
      d.path(body, d.fill(P.white), { sw: 3.5 });
      // The near wing, raised, with four feather tips along its back edge.
      d.path("M34 52 C30 38 31 23 39 12 Q46 6 50 13 Q52 16 51 19 Q57 15 59 22 Q60 25 58 28 Q65 26 66 33 Q66 36 64 38 Q71 38 70 45 Q70 52 58 54 Q44 57 34 52 Z", d.fill(P.white), { sw: 3 });
      d.stroke("M51 19 L47.5 25 M58 28 L54.5 33.5 M64 38 L60.5 43", { color: P.silver[2], sw: 2 });
      d.path("M19 46 L11 49 L19 52 Z", d.fill(P.orange), { sw: 2 });
      d.stroke("M13 51 Q11 58 16 64", { color: P.forest[2], sw: 2.2 });
      for (const [x, y, a] of [[12, 55, 200], [14, 60, 150], [16, 64, 210]] as [number, number, number][]) d.path(leaf(x, y, 8, a, 0.38), d.fill(P.green), { sw: 1.8 });
      d.eye(27, 45, 3.6);
      d.cheek(29, 52, 3.2);
      d.shine(44, 26, 6, 3, 0.6, -60);
    }),
  ],
  [
    "🦊",
    "fox",
    (d) => {
      for (const s of [-1, 1]) {
        const ear = `M${50 + s * 32} 46 Q${50 + s * 34} 22 ${50 + s * 30} 9 Q${50 + s * 27} 6 ${50 + s * 22} 10 Q${50 + s * 12} 18 ${50 + s * 6} 28 Z`;
        d.path(ear, d.fill(P.orange), { sw: 3 });
        d.path(`M${50 + s * 27} 38 Q${50 + s * 28} 24 ${50 + s * 26} 16 Q${50 + s * 18} 21 ${50 + s * 13} 28 Z`, P.cream[1], { stroke: null });
        d.clip(ear, (c) => c.ellipse(50 + s * 28, 8, 9, 7, P.ink[1], { stroke: null }));
        d.path(ear, "none", { sw: 3 });
      }
      const head = "M50 24 C66 24 79 33 82 48 Q88 56 85 61 C77 74 63 84 50 86 C37 84 23 74 15 61 Q12 56 18 48 C21 33 34 24 50 24 Z";
      d.path(head, d.fill(P.orange), { sw: 3.5 });
      d.clip(head, (c) => c.path("M10 58 C24 54 38 57 50 66 C62 57 76 54 90 58 L90 92 L10 92 Z", d.fill(P.cream), { stroke: null }));
      d.path(head, "none", { sw: 3.5 });
      d.ellipse(50, 72, 5.5, 3.8, d.fill(P.black), { sw: 2 });
      d.shine(48.5, 70.8, 2, 1, 0.7, -10);
      d.stroke("M50 76 V78 M50 78 Q47 81 44 79 M50 78 Q53 81 56 79", { sw: 2 });
      d.eye(37, 50, 4.8);
      d.eye(63, 50, 4.8);
      d.cheek(30, 64, 4);
      d.cheek(70, 64, 4);
      d.shine(38, 34, 8, 3.6, 0.45, -18);
    },
  ],
  [
    "🐕",
    "dog",
    place(-2, -3, 0.95, (d) => {
      const c = P.tan;
      d.shadow(60, 90, 31);
      leg(d, 53, 64, 88, 9, deep(c));
      leg(d, 84, 64, 88, 9, deep(c));
      d.path(limb([[84, 53], [91, 45], [92, 32]], 9, 5.5), d.fill(c), { sw: 3 });
      const body = "M40 56 C40 46 48 43 62 43 C76 43 88 45 89 56 C90 66 85 72 73 72 L52 72 C44 72 40 65 40 56 Z";
      d.path(body, d.fill(c), { sw: 3.5 });
      d.clip(body, (k) => k.path(lumpy(72, 51, 10, 7, 7, 0.15, 3), P.wood[1], { stroke: null, op: 0.75 }));
      d.path(body, "none", { sw: 3.5 });
      for (const x of [46, 77]) {
        leg(d, x, 66, 89, 10, c);
        d.ellipse(x, 88, 5.6, 2.8, P.cream[1], { sw: 2 });
      }
      d.shine(61, 48, 9, 3, 0.55, -8);
      d.path(rr(41, 42, 7.5, 20, 3.75), d.fill(P.red, "h"), { sw: 2.5, tf: "rotate(-24 44.75 52)" });
      d.circle(46.5, 62, 3.6, d.fill(P.gold), { sw: 2 });
      d.circle(35, 37, 17.5, d.fill(c), { sw: 3.5 });
      d.ellipse(21, 45.5, 11.5, 8.5, d.fill(P.cream), { sw: 3 });
      d.path("M20 51.5 Q22.5 61 28 51.5 Z", d.fill(P.pink), { sw: 2 });
      d.stroke("M14 49.5 Q21 53.5 29 50.5", { sw: 2.2 });
      d.ellipse(11.5, 42, 4.4, 3.6, d.fill(P.black), { sw: 2 });
      d.shine(10.5, 40.8, 1.6, 0.9, 0.7, -10);
      d.path("M37 22 Q50 19 51.5 32 Q53 45 46.5 51 Q40 52 40.5 41 Q40 30 37 22 Z", d.fill(P.brown, "v"), { sw: 3 });
      d.eye(30, 35, 4.6);
      d.cheek(32, 46.5, 3.4);
      d.shine(31, 26, 6, 3, 0.45, -25);
    }),
  ],
  [
    "🦅",
    "eagle",
    (d) => {
      const br = P.brown;
      d.g("translate(0 8)", (k) => {
        k.path("M56 48 C60 34 67 22 76 14 Q79 6 83 9 L82 15 Q87 9 89 13 L87 19 Q92 16 90 22 C84 32 75 42 66 50 Z", k.fill(deep(br)), { sw: 3 });
        k.path("M69 56 L87 53 Q93 58 88 63 Q91 68 85 69 L69 64 Z", k.fill(P.white), { sw: 3 });
        k.path("M26 46 C32 38 46 40 56 44 C66 48 73 52 77 58 C73 66 58 68 46 66 C36 64 28 58 26 50 Z", k.fill(br), { sw: 3.5 });
        k.tube("M54 66 L57 71 M60 65 L63 70", P.gold[1], 3, 2);
        k.path("M38 50 C33 38 34 24 40 14 Q41 5 46 9 L47 15 Q50 6 54 11 L54 17 Q59 9 61 15 L60 21 Q66 15 66 23 C66 34 64 44 60 50 Z", k.fill(br), { sw: 3 });
        k.stroke("M47 15 Q48 26 48 36 M54 17 Q54 28 54 38 M60 21 Q59 30 58 40", { color: br[2], sw: 2 });
        k.circle(28, 42, 11, k.fill(P.white), { sw: 3 });
        k.path("M19 38 C13 37 9 41 10 47 C12 45 14 45 16 47 L20 46 Z", k.fill(P.gold), { sw: 2.4 });
        k.eye(27, 40, 3.4);
        k.stroke("M24 36 Q27.5 34.8 31 36.6", { sw: 1.8 });
        k.cheek(29, 47, 2.8);
        k.shine(42, 22, 4, 2, 0.4, -70);
        k.shine(25, 36, 3, 1.6, 0.6, -30);
      });
    },
  ],
  [
    "🐴",
    "horse",
    (d) => {
      const c = P.wood;
      const mane = HAIR.brown;
      d.path("M44 20 C60 14 76 28 82 46 Q88 54 83 60 Q90 68 84 76 Q89 84 82 90 L72 90 C72 68 68 46 54 30 Z", d.fill(mane), { sw: 3 });
      d.path(leaf(46, 26, 17, -78, 0.42), d.fill(c), { sw: 3 });
      d.path(leaf(47, 25, 10, -78, 0.28), c[2], { stroke: null, op: 0.6 });
      const head = "M18 70 C12 68 10 62 12 56 C14 48 20 40 28 32 C34 26 40 22 46 22 C58 22 68 34 72 46 C76 58 76 74 76 90 L46 90 C46 82 46 74 42 68 C38 64 32 66 28 69 C24 71 20 71 18 70 Z";
      d.path(head, d.fill(c), { sw: 3.5 });
      d.clip(head, (k) => {
        k.ellipse(17, 61, 10, 11, P.tan[1], { stroke: null });
        k.path("M33 33 Q25 43 17 56 L22 58 Q29 46 37 35 Z", "#fff", { stroke: null, op: 0.92 });
      });
      d.path(head, "none", { sw: 3.5 });
      d.path("M45 24 Q33 23 29 33 Q35 30 38 35 Q40 28 47 28 Z", d.fill(mane), { sw: 2.5 });
      d.stroke("M44 62 C38 58 36 48 41 42", { color: c[2], sw: 2.2 });
      d.ellipse(13.5, 58, 2, 3.2, OL, { stroke: null, tf: "rotate(20 13.5 58)" });
      d.eye(34, 42, 4.3);
      d.stroke("M14 66 Q18 69 23 67", { sw: 2.2 });
      d.cheek(30, 55, 3.6);
      d.shine(57, 38, 6, 3, 0.4, -40);
    },
  ],
  [
    "🦒",
    "giraffe",
    place(-3.5, 0.5, 1, (d) => {
      const y = P.gold;
      const spot = HAIR.auburn[1];
      d.shadow(68, 91, 24);
      leg(d, 60, 62, 90, 6.5, deep(y), P.brown[2]);
      leg(d, 86, 62, 90, 6.5, deep(y), P.brown[2]);
      d.tube("M89 52 Q93 60 91 70", y[2], 2, 2);
      d.path(leaf(91, 68, 8, 95, 0.5), P.brown[2], { sw: 2 });
      d.path(limb([[62, 48], [51, 33], [42, 21]], 7, 5), d.fill(P.orange), { sw: 2.5 });
      const neck = limb([[56, 54], [46, 38], [36, 26]], 16, 10);
      const body = "M50 54 C50 46 60 44 72 45 C84 46 91 50 91 58 C91 66 84 70 72 70 C58 70 50 64 50 54 Z";
      union(d, [neck, body], oneFill(d, y, 30, 18, 92, 72));
      const spots = (k: Pen) => {
        for (const [x, yy, r, s] of [[45, 37, 4.5, 1], [40, 29, 3.5, 2], [51, 47, 4.5, 3], [62, 52, 5.5, 4], [75, 50, 6, 5], [86, 56, 5, 6], [69, 63, 5.5, 7], [57, 63, 4.5, 8], [82, 66, 4, 9]] as number[][])
          k.path(lumpy(x, yy, r, r * 0.85, 6, 0.22, s), spot, { stroke: null });
      };
      d.clip(neck, spots);
      d.clip(body, spots);
      leg(d, 54, 64, 90, 7, y, P.brown[2]);
      leg(d, 80, 64, 90, 7, y, P.brown[2]);
      d.shine(66, 49, 7, 2.6, 0.5, -8);
      // Head: ossicones, ear, muzzle.
      for (const x of [31, 36]) {
        d.tube(`M${x} 20 L${x - 1} 12`, y[1], 3, 2);
        d.circle(x - 1, 11, 3, d.fill(P.brown), { sw: 2 });
      }
      d.path(leaf(37, 22, 10, -15, 0.4), d.fill(y), { sw: 2.5 });
      d.ellipse(29, 26, 12.5, 8.5, d.fill(y), { sw: 3, tf: "rotate(22 29 26)" });
      d.ellipse(19, 30, 6.5, 5.5, d.fill(P.tan), { sw: 2.4, tf: "rotate(22 19 30)" });
      d.eye(29, 24, 3.6);
      d.stroke("M16 34 Q19 36 22 34.5", { sw: 2 });
      d.cheek(30, 31, 3);
    }),
  ],
  [
    "🐄",
    "cow",
    place(0, -3, 0.93, (d) => {
      const w = P.white;
      const blk = P.ink;
      d.shadow(58, 90, 33);
      leg(d, 50, 62, 88, 9, deep(w), blk[1]);
      leg(d, 86, 62, 88, 9, deep(w), blk[1]);
      d.tube("M89 46 Q94 56 92 67", w[2], 2.4, 2);
      d.path(leaf(92, 65, 10, 95, 0.55), d.fill(blk), { sw: 2 });
      const body = "M34 50 C34 40 44 36 58 36 L75 36 C86 36 91 44 91 54 C91 66 85 72 74 72 L49 72 C39 72 34 64 34 50 Z";
      d.path(body, d.fill(w), { sw: 3.5 });
      d.clip(body, (k) => {
        k.path(lumpy(56, 44, 10, 8, 7, 0.22, 2), k.fill(blk), { stroke: null });
        k.path(lumpy(79, 61, 11, 9, 7, 0.22, 5), k.fill(blk), { stroke: null });
        k.path(lumpy(88, 39, 7, 6, 6, 0.22, 7), k.fill(blk), { stroke: null });
      });
      d.path(body, "none", { sw: 3.5 });
      d.ellipse(69, 72, 7.5, 4.8, d.fill(P.rose), { sw: 2.4 });
      d.tube("M66 75.5 V78.5 M72 75.5 V78.5", P.rose[1], 2.4, 1.8);
      leg(d, 42, 64, 89, 9.5, w, blk[1]);
      leg(d, 78, 64, 89, 9.5, w, blk[1]);
      d.shine(52, 40, 8, 3, 0.6, -8);
      // Head.
      d.path(limb([[30, 33], [31, 25], [36, 21]], 5.5, 3.5), d.fill(P.cream), { sw: 2.4 });
      d.path(leaf(35, 39, 13, 12, 0.42), d.fill(w), { sw: 2.6 });
      d.path(leaf(37, 39.5, 8, 12, 0.3), P.rose[1], { stroke: null });
      const head = oval(25, 44, 14, 13);
      d.path(head, d.fill(w), { sw: 3.5 });
      d.clip(head, (k) => k.path(lumpy(33, 36, 8, 7, 6, 0.2, 3), k.fill(blk), { stroke: null }));
      d.path(head, "none", { sw: 3.5 });
      d.ellipse(16, 53, 10.5, 8, d.fill(P.rose), { sw: 3 });
      d.ellipse(12, 52, 1.7, 2.6, P.rose[2], { stroke: null });
      d.ellipse(19, 52.5, 1.7, 2.6, P.rose[2], { stroke: null });
      d.stroke("M12 57 Q16 59.5 20 57", { sw: 2 });
      d.eye(23, 42, 4.2);
      d.shine(19, 36, 4, 2, 0.5, -30);
    }),
  ],
  [
    "🐔",
    "chicken",
    (d) => {
      const c = P.cream;
      d.shadow(52, 90, 24);
      for (const x of [46, 58]) d.tube(`M${x} 82 V88 M${x - 4} 89.5 L${x} 88 L${x + 4} 89.5`, P.orange[1], 3, 2);
      for (const [a, len] of [[-78, 19], [-52, 22], [-27, 19]]) d.path(leaf(72, 56, len, a, 0.5), d.fill(c), { sw: 2.8 });
      const body = smooth([[31, 20], [40, 22], [44, 32], [50, 44], [64, 45], [76, 46], [84, 58], [80, 74], [64, 85], [46, 86], [28, 78], [20, 62], [22, 47], [20, 34], [24, 24]], 0.2);
      d.path(body, d.fill(c), { sw: 3.5 });
      d.path("M44 60 C50 50 66 50 74 58 Q77 66 70 68 Q66 74 60 72 Q52 76 46 70 Q42 66 44 60 Z", d.fill(P.sand), { sw: 2.6 });
      for (const [x, y, r] of [[26, 21, 4.6], [31.5, 17, 5.2], [37, 20.5, 4.6]]) d.circle(x, y, r, d.fill(P.red), { sw: 2.4 });
      for (const [x, y, r] of [[26, 21, 4.6], [31.5, 17, 5.2], [37, 20.5, 4.6]]) d.circle(x, y, r - 1.2, P.red[1], { stroke: null });
      d.path(body, "none", { sw: 3.5 });
      d.path("M21 32 L12 35.5 L21 39 Z", d.fill(P.gold), { sw: 2.2 });
      d.path("M19 39 Q16 44 19 47 Q23 47 23 42 Z", d.fill(P.red), { sw: 2 });
      d.eye(29, 31, 3.8);
      d.cheek(31, 39, 3.2);
      d.shine(34, 52, 7, 3, 0.6, -40);
    },
  ],
  [
    "🐇",
    "rabbit",
    (d) => {
      const g = P.grey;
      d.shadow(56, 90, 30);
      d.ellipse(42, 25, 5.5, 13.5, d.fill(deep(g)), { sw: 3, tf: "rotate(26 42 25)" });
      d.path(fluff(85, 66, 6.5, 6.5, 7, 0.2), d.fill(P.white), { sw: 2.5 });
      const body = "M32 62 C30 50 40 45 52 46 C70 47 84 57 84 72 C84 83 74 88 62 88 L44 88 C36 88 32 82 33 77 C31 73 31 67 32 62 Z";
      d.path(body, d.fill(g), { sw: 3.5 });
      d.clip(body, (k) => k.ellipse(40, 77, 10, 14, P.white[1], { stroke: null }));
      d.path(body, "none", { sw: 3.5 });
      d.stroke("M60 86 C56 75 63 64 75 66", { color: g[2], sw: 2.2 });
      d.path(rr(54, 82, 28, 8, 4), d.fill(g, "v"), { sw: 3 });
      d.ellipse(40, 86.5, 6, 3.8, d.fill(g), { sw: 2.5 });
      d.shine(62, 53, 8, 3, 0.5, -15);
      d.circle(31, 47, 15, d.fill(g), { sw: 3.5 });
      d.ellipse(34, 25, 6, 14, d.fill(g), { sw: 3, tf: "rotate(10 34 25)" });
      d.ellipse(34, 26, 3, 9.5, P.rose[1], { stroke: null, tf: "rotate(10 34 26)" });
      d.eye(27, 45, 4.2);
      d.ellipse(17, 50, 2.6, 2.1, d.fill(P.pink), { sw: 1.6 });
      d.stroke("M17.5 52.5 Q19 55.5 22 54", { sw: 2 });
      d.stroke("M15 53 L9 52 M15 55 L9.5 57", { sw: 1.6 });
      d.cheek(28, 54, 3.4);
      d.shine(26, 38, 5, 2.5, 0.5, -30);
    },
  ],
  [
    "🪶",
    "feather",
    place(1.5, -1.5, 1.12, (d) => {
      d.g("rotate(38 50 50)", (k) => {
        const vane = "M50 74 C41 70 36 63 36 57 L43 52 L35 47 C34 34 40 20 50 9 C59 18 65 27 64 32 L57 37 L65 42 C66 55 60 68 50 74 Z";
        k.tube("M50 72 L50 92", P.cream[2], 3.2, 2.2);
        k.path(vane, k.fill(P.sky), { sw: 3 });
        k.clip(vane, (c) => {
          for (const y of [24, 34, 44, 54, 62]) c.stroke(`M50 ${y} L38 ${y + 8} M50 ${y - 3} L62 ${y + 5}`, { color: P.sky[2], sw: 1.6, op: 0.7 });
          c.path("M50 9 C58 18 65 27 65 40 L50 40 Z", "#fff", { stroke: null, op: 0.18 });
        });
        k.stroke("M50 12 Q51 40 50 73", { color: "#fff", sw: 2.4 });
        k.shine(44, 30, 3.5, 7, 0.45, 10);
      });
    }),
  ],
  [
    "🦇",
    "bat",
    place(0, 3, 1, (d) => {
      const v = P.violet;
      for (const s of [-1, 1]) {
        const x = (dx: number) => r2(50 + s * dx);
        d.path(`M${x(10)} 46 C${x(16)} 34 ${x(24)} 28 ${x(30)} 26 Q${x(38)} 26 ${x(42)} 34 Q${x(34)} 40 ${x(38)} 52 Q${x(30)} 48 ${x(26)} 56 Q${x(18)} 52 ${x(14)} 60 Z`, d.fill(deep(v)), { sw: 3 });
        d.stroke(`M${x(30)} 27 L${x(38)} 51 M${x(30)} 27 L${x(26)} 55`, { color: v[0], sw: 1.8, op: 0.7 });
      }
      for (const s of [-1, 1]) d.path(`M${50 + s * 6} 40 L${50 + s * 14} 19 Q${50 + s * 17} 18 ${50 + s * 17} 22 L${50 + s * 15} 42 Z`, d.fill(v), { sw: 2.8 });
      for (const s of [-1, 1]) d.path(`M${50 + s * 9} 38 L${50 + s * 14} 25 L${50 + s * 13.5} 39 Z`, P.pink[1], { stroke: null, op: 0.7 });
      d.ellipse(50, 53, 15, 17, d.fill(v), { sw: 3.5 });
      d.ellipse(50, 60, 8.5, 8.5, v[0], { stroke: null, op: 0.6 });
      d.eye(44, 49, 4);
      d.eye(56, 49, 4);
      d.stroke("M45 56.5 Q50 60.5 55 56.5", { sw: 2 });
      d.path("M46.5 57.6 L48 61.5 L49.4 58.6 Z M53.5 57.6 L52 61.5 L50.6 58.6 Z", "#fff", { sw: 1.2 });
      d.cheek(40.5, 55, 3);
      d.cheek(59.5, 55, 3);
      d.tube("M46 70 V73 M54 70 V73", deep(v)[1], 2.6, 1.8);
      d.shine(44, 41, 5, 2.4, 0.5, -25);
    }),
  ],
  [
    "🦜",
    "parrot",
    place(0, -2.5, 1, (d) => {
      d.path(limb([[57, 58], [64, 74], [69, 91]], 10, 5), d.fill(P.blue), { sw: 3 });
      d.path(limb([[54, 58], [58, 74], [60, 90]], 11, 5.5), d.fill(P.red), { sw: 3 });
      d.path(rr(14, 64, 72, 8, 4), d.fill(P.wood, "v"), { sw: 3 });
      const head = oval(42, 27, 13, 13);
      const body = oval(50, 46, 15, 20, 18);
      union(d, [body, head], oneFill(d, P.red, 26, 12, 68, 68));
      const wing = "M48 36 C59 32 67 42 69 54 C70 61 67 67 62 69 C57 60 50 50 48 36 Z";
      d.path(wing, d.fill(P.blue), { sw: 2.8 });
      d.clip(wing, (k) => {
        k.rect(40, 28, 40, 13, 0, k.fill(P.gold, "v"), { stroke: null });
        k.rect(40, 41, 40, 6, 0, P.green[1], { stroke: null });
      });
      d.path(wing, "none", { sw: 2.8 });
      d.tube("M45 63 V68 M50 64 V69", P.stone[1], 3, 2);
      d.ellipse(40, 25, 7, 6, P.white[1], { sw: 2 });
      d.eye(40.5, 24.5, 3.2);
      d.path("M32 20 C24 20 19 26 21 35 C23 32 26 30 30 31 C31 27 32 24 32 20 Z", d.fill(P.cream), { sw: 2.6 });
      d.path("M30 31 C27 32 26 35 28 37 C31 37 33 35 33 32 Z", d.fill(P.ink), { sw: 2.2 });
      d.shine(37, 17, 5, 2.4, 0.5, -20);
    }),
  ],
  [
    "🐷",
    "pig",
    (d) => {
      const p = P.rose;
      for (const s of [-1, 1]) {
        d.path(`M${50 + s * 31} 40 Q${50 + s * 37} 22 ${50 + s * 32} 11 Q${50 + s * 18} 15 ${50 + s * 11} 28 Z`, d.fill(p), { sw: 3 });
        d.path(`M${50 + s * 32} 11 Q${50 + s * 25} 19 ${50 + s * 29} 26 Q${50 + s * 35} 20 ${50 + s * 32} 11 Z`, p[2], { stroke: null, op: 0.55 });
      }
      d.path(headPath(50, 55, 33, 29), d.fill(p), { sw: 3.5 });
      d.ellipse(50, 64, 13.5, 9.5, d.fill(P.pink), { sw: 3 });
      d.ellipse(45, 64, 2.4, 3.6, P.pink[2], { stroke: null });
      d.ellipse(55, 64, 2.4, 3.6, P.pink[2], { stroke: null });
      d.shine(46, 59.5, 4, 1.6, 0.6, -10);
      d.eye(37, 47, 4.6);
      d.eye(63, 47, 4.6);
      d.smile(50, 77, 8, 2.2);
      d.cheek(28, 62, 4.5);
      d.cheek(72, 62, 4.5);
      d.shine(36, 34, 8, 4, 0.45, -18);
    },
  ],
  [
    "🐪",
    "camel",
    place(-1, -4, 0.97, (d) => {
      const c = P.tan;
      d.shadow(58, 90, 32);
      leg(d, 54, 62, 89, 6.5, deep(c));
      leg(d, 85, 62, 89, 6.5, deep(c));
      d.tube("M88 50 Q92 58 90 66", c[2], 2.2, 2);
      d.path(leaf(90, 64, 7, 95, 0.5), c[2], { sw: 2 });
      const body = "M41 58 C39 50 43 46 49 45 C53 30 61 21 69 21 C78 21 83 32 85 44 C90 46 92 54 90 60 C88 68 82 71 74 71 L51 71 C45 71 42 66 41 58 Z";
      const neck = limb([[47, 54], [35, 58], [27, 48], [24, 35]], 13, 9);
      union(d, [neck, body], oneFill(d, c, 12, 20, 92, 72));
      for (const x of [48, 79]) {
        leg(d, x, 64, 90, 7, c);
        d.ellipse(x, 89, 5.5, 2.4, d.fill(deep(c)), { sw: 2.2 });
      }
      d.shine(62, 30, 6, 3, 0.55, -40);
      camelHead(d, c);
    }),
  ],
  [
    "🐰",
    "bunny",
    (d) => {
      const w = P.white;
      for (const s of [-1, 1]) {
        const cx = 50 + s * 12;
        const rot = s * 9;
        d.ellipse(cx, 27, 8.5, 18, d.fill(w), { sw: 3, tf: `rotate(${rot} ${cx} 27)` });
        d.ellipse(cx, 28.5, 4.4, 12.5, P.rose[1], { stroke: null, tf: `rotate(${rot} ${cx} 28.5)` });
      }
      d.path(headPath(50, 63, 31, 25), d.fill(w), { sw: 3.5 });
      d.eye(39, 59, 4.8);
      d.eye(61, 59, 4.8);
      d.path(rr(46.6, 72, 6.8, 6.5, 1.6), "#fff", { sw: 1.8 });
      d.line(50, 72.4, 50, 78, { sw: 1.4 });
      d.path("M46.5 66 Q50 64.5 53.5 66 Q52 69.5 50 70 Q48 69.5 46.5 66 Z", d.fill(P.pink), { sw: 2 });
      d.stroke("M50 70 V72 M50 72 Q47 75 44 73 M50 72 Q53 75 56 73", { sw: 2 });
      whiskers(d, 50, 69, 11, 15, 1.8);
      d.cheek(31, 68, 4.5);
      d.cheek(69, 68, 4.5);
      d.shine(38, 45, 8, 4, 0.5, -18);
    },
  ],
  [
    "🐭",
    "mouse",
    (d) => {
      const g = P.grey;
      for (const s of [-1, 1]) {
        d.circle(50 + s * 25, 33, 16, d.fill(g), { sw: 3 });
        d.circle(50 + s * 25, 34, 10, d.fill(P.rose), { stroke: null });
      }
      d.path("M50 30 C66 30 77 41 77 54 C77 68 63 80 50 86 C37 80 23 68 23 54 C23 41 34 30 50 30 Z", d.fill(g), { sw: 3.5 });
      d.eye(40, 53, 4.6);
      d.eye(60, 53, 4.6);
      whiskers(d, 50, 72, 7, 21, 1.8);
      d.circle(50, 72, 4.4, d.fill(P.pink), { sw: 2.2 });
      d.stroke("M46.5 78.5 Q50 81.5 53.5 78.5", { sw: 2 });
      d.cheek(34, 64, 4);
      d.cheek(66, 64, 4);
      d.shine(39, 39, 7, 3.4, 0.5, -20);
    },
  ],
  [
    "🐣",
    "hatching chick",
    (d) => {
      d.shadow(50, 91, 28);
      d.path(leaf(33, 57, 15, 212, 0.45), d.fill(P.lemon), { sw: 2.6 });
      d.path(leaf(67, 57, 15, -32, 0.45), d.fill(P.lemon), { sw: 2.6 });
      d.circle(50, 44, 22, d.fill(P.lemon), { sw: 3.5 });
      d.path("M36 27 L41 31 L45.5 25 L50 31 L54.5 25 L59 31 L64 27 C63 18 57 13 50 13 C43 13 37 18 36 27 Z", d.fill(P.cream), { sw: 2.6 });
      d.eye(42, 44, 4.2);
      d.eye(58, 44, 4.2);
      d.path("M45.5 51 L54.5 51 L50 57 Z", d.fill(P.orange), { sw: 2 });
      d.cheek(35.5, 53, 3.6);
      d.cheek(64.5, 53, 3.6);
      d.shine(40, 30, 3, 1.5, 0.5, -20);
      d.path("M17 58 L25 52 L32 59 L40 51 L48 59 L56 51 L64 59 L72 52 L80 59 L83 58 C85 78 70 90 50 90 C30 90 15 78 17 58 Z", d.fill(P.cream), { sw: 3.5 });
      d.stroke("M30 70 L36 74 L33 79 M66 66 L70 71", { color: P.cream[2], sw: 2 });
      d.shine(27, 67, 5, 2.5, 0.7, -30);
    },
  ],
  [
    "🐺",
    "wolf",
    place(0, 2, 1, (d) => {
      const g = P.stone;
      for (const s of [-1, 1]) {
        d.path(`M${50 + s * 31} 44 Q${50 + s * 33} 22 ${50 + s * 28} 8 Q${50 + s * 25} 6 ${50 + s * 21} 10 Q${50 + s * 12} 18 ${50 + s * 6} 28 Z`, d.fill(g), { sw: 3 });
        d.path(`M${50 + s * 26} 36 Q${50 + s * 27} 23 ${50 + s * 25} 15 Q${50 + s * 17} 21 ${50 + s * 13} 28 Z`, P.grey[0], { stroke: null });
      }
      const head = "M50 22 C65 22 77 31 80 44 L89 52 L82 57 L88 63 L79 67 C73 78 62 86 50 88 C38 86 27 78 21 67 L12 63 L18 57 L11 52 L20 44 C23 31 35 22 50 22 Z";
      d.path(head, d.fill(g), { sw: 3.5 });
      d.clip(head, (k) => {
        k.path("M6 60 C24 55 38 57 50 64 C62 57 76 55 94 60 L94 92 L6 92 Z", k.fill(P.white), { stroke: null });
        k.path("M44 20 Q46 36 50 47 Q54 36 56 20 Z", g[2], { stroke: null, op: 0.45 });
        for (const s of [-1, 1]) k.ellipse(50 + s * 12, 42, 6, 2.8, P.grey[0], { stroke: null, op: 0.75 });
      });
      d.path(head, "none", { sw: 3.5 });
      d.ellipse(50, 69, 7, 5, d.fill(P.black), { sw: 2.2 });
      d.shine(48, 67.5, 2.4, 1.2, 0.7, -10);
      d.stroke("M50 74 V77 M50 77 Q46 80.5 42.5 78 M50 77 Q54 80.5 57.5 78", { sw: 2 });
      d.eye(38, 50, 4.6);
      d.eye(62, 50, 4.6);
      d.cheek(30, 65, 3.8);
      d.cheek(70, 65, 3.8);
      d.shine(38, 31, 7, 3.4, 0.45, -18);
    }),
  ],
  [
    "🐐",
    "goat",
    place(-3.5, 1, 1, (d) => {
      const w = P.white;
      d.shadow(60, 90, 30);
      leg(d, 53, 62, 88, 7, deep(w), P.ink[1]);
      leg(d, 85, 62, 88, 7, deep(w), P.ink[1]);
      d.path(leaf(87, 47, 11, -55, 0.5), d.fill(w), { sw: 2.5 });
      const body = "M38 52 C38 43 46 40 58 40 L75 40 C85 40 90 46 90 54 C90 64 84 69 74 69 L52 69 C43 69 38 62 38 52 Z";
      const neck = limb([[48, 50], [38, 40], [32, 32]], 15, 12);
      union(d, [neck, body], oneFill(d, w, 20, 22, 92, 70));
      leg(d, 46, 64, 89, 7.5, w, P.ink[1]);
      leg(d, 78, 64, 89, 7.5, w, P.ink[1]);
      d.shine(62, 45, 8, 3, 0.7, -8);
      d.path(limb([[30, 23], [33, 14], [41, 10], [47, 15]], 7, 3.4), d.fill(P.stone), { sw: 2.4 });
      d.path(leaf(36, 30, 13, 22, 0.38), d.fill(w), { sw: 2.5 });
      d.path(leaf(37.5, 30.6, 8, 22, 0.25), P.rose[1], { stroke: null });
      d.ellipse(26, 33, 14, 11, d.fill(w), { sw: 3, tf: "rotate(-38 26 33)" });
      d.path("M16 44 Q13 53 17 59 Q21 52 23 45 Z", d.fill(P.grey), { sw: 2.2 });
      d.ellipse(15.6, 39, 1.5, 2.2, OL, { stroke: null });
      d.eye(26, 30.5, 4);
      d.stroke("M16 43.5 Q19.5 45.5 23 44", { sw: 2 });
      d.cheek(29.5, 38, 3.2);
      d.shine(26, 24.5, 4, 2, 0.6, -35);
    }),
  ],
  [
    "🐓",
    "rooster",
    place(-2.5, 0, 1, (d) => {
      d.shadow(52, 90, 24);
      for (const x of [46, 58]) d.tube(`M${x} 78 V88 M${x - 4.5} 89.5 L${x} 88 L${x + 4.5} 89.5`, P.gold[1], 3, 2);
      const tail: [Pt[], Ramp][] = [
        [[[66, 58], [72, 34], [83, 20], [91, 30]], P.forest],
        [[[66, 61], [77, 43], [88, 42], [91, 55]], P.teal],
        [[[66, 64], [78, 58], [86, 66]], P.forest],
      ];
      for (const [pts, col] of tail) d.path(limb(pts, 9, 4), d.fill(col), { sw: 2.8 });
      const body = smooth([[32, 19], [41, 22], [46, 34], [54, 48], [68, 50], [78, 58], [76, 72], [62, 81], [46, 82], [30, 74], [22, 60], [24, 44], [22, 32], [25, 23]], 0.2);
      d.path(body, d.fill(HAIR.auburn), { sw: 3.5 });
      d.clip(body, (k) => k.path("M14 16 L46 16 L56 50 Q46 60 36 56 Q28 62 20 54 Z", k.fill(P.orange), { stroke: null }));
      d.path(body, "none", { sw: 3.5 });
      d.path("M42 60 C50 52 64 54 70 62 Q70 70 63 70 Q58 75 52 72 Q44 72 42 60 Z", d.fill(deep(HAIR.auburn)), { sw: 2.6 });
      const comb: [number, number, number][] = [[25, 20, 4.6], [30, 15, 5.4], [36.5, 13.5, 5], [42, 17.5, 4.4]];
      for (const [x, y, r] of comb) d.circle(x, y, r, d.fill(P.red), { sw: 2.4 });
      for (const [x, y, r] of comb) d.circle(x, y, r - 1.2, P.red[1], { stroke: null });
      d.path("M24 27 L11 22 L23 31 Z", d.fill(P.gold), { sw: 2.2 });
      d.path("M23 33 L12 31 L24 36.5 Z", d.fill(P.gold), { sw: 2.2 });
      d.path("M22 37 Q18 44 22 48 Q27 47 26 40 Z", d.fill(P.red), { sw: 2 });
      d.eye(30, 28, 3.8);
      d.cheek(32, 36, 3);
      d.shine(35, 52, 6, 3, 0.45, -40);
    }),
  ],
  [
    "🐮",
    "cow",
    (d) => {
      const w = P.white;
      for (const s of [-1, 1]) d.path(limb([[50 + s * 16, 28], [50 + s * 23, 21], [50 + s * 23, 12]], 6.5, 3.5), d.fill(P.cream), { sw: 2.5 });
      for (const s of [-1, 1]) {
        const a = s < 0 ? 170 : 10;
        d.path(leaf(50 + s * 22, 40, 21, a, 0.4), d.fill(w), { sw: 2.8 });
        d.path(leaf(50 + s * 25, 40.4, 13, a, 0.26), P.rose[1], { stroke: null });
      }
      const head = headPath(50, 50, 26, 28);
      d.path(head, d.fill(w), { sw: 3.5 });
      d.clip(head, (k) => {
        k.path(lumpy(64, 44, 12, 11, 7, 0.2, 4), k.fill(P.ink), { stroke: null });
        k.path(lumpy(31, 28, 8, 7, 6, 0.2, 2), k.fill(P.ink), { stroke: null });
      });
      d.path(head, "none", { sw: 3.5 });
      d.ellipse(50, 72, 21, 13.5, d.fill(P.rose), { sw: 3 });
      d.ellipse(42, 70.5, 2.8, 4, P.rose[2], { stroke: null });
      d.ellipse(58, 70.5, 2.8, 4, P.rose[2], { stroke: null });
      d.shine(43, 64, 5, 2, 0.6, -10);
      d.stroke("M44 78.5 Q50 82.5 56 78.5", { sw: 2.2 });
      d.eye(39, 47, 4.6);
      ringEye(d, 61, 47, 4.6);
      d.cheek(30, 59, 3.8);
      d.cheek(70, 59, 3.8);
      d.shine(37, 32, 6, 3, 0.5, -18);
    },
  ],
  [
    "🐤",
    "baby chick",
    place(0, -2, 1, (d) => {
      const y = P.lemon;
      d.shadow(52, 90, 22);
      for (const x of [46, 57]) d.tube(`M${x} 80 V88 M${x - 4} 89.5 L${x} 88 L${x + 4} 89.5`, P.orange[1], 2.8, 2);
      d.path(leaf(76, 56, 12, -28, 0.5), d.fill(y), { sw: 2.4 });
      union(d, [oval(54, 62, 25, 21), oval(38, 40, 16, 15)], oneFill(d, y, 20, 24, 80, 84));
      d.path("M48 62 C54 54 68 54 74 62 Q72 70 64 70 Q56 72 48 62 Z", d.fill(P.gold), { sw: 2.5 });
      d.path("M37 26 Q35 17 41 14 Q40 19 44 24 Z", d.fill(y), { sw: 2.2 });
      d.path("M23 38 L12 42 L23 46 Z", d.fill(P.orange), { sw: 2.2 });
      d.eye(33, 37, 4.2);
      d.cheek(33, 47, 3.4);
      d.shine(32, 30, 6, 3, 0.6, -25);
    }),
  ],
  [
    "🦘",
    "kangaroo",
    place(-7.5, 2.5, 0.96, (d) => {
      const c = P.wood;
      d.shadow(58, 90, 32);
      d.path(limb([[60, 74], [76, 82], [92, 86]], 15, 5), d.fill(c), { sw: 3 });
      const body = smooth([[46, 30], [58, 40], [68, 58], [70, 74], [56, 82], [44, 74], [38, 56], [38, 40]], 0.22);
      d.path(body, d.fill(c), { sw: 3.5 });
      d.clip(body, (k) => k.ellipse(42, 60, 9, 20, P.tan[1], { stroke: null }));
      d.path(body, "none", { sw: 3.5 });
      d.path("M75 81 Q77 90 68 90 L42 90 Q37 90 37 86.5 Q37 83 42 83 L66 81 Z", d.fill(c, "v"), { sw: 3 });
      d.ellipse(66, 70, 12, 15, d.fill(c), { sw: 3 });
      // The joey peeking out of the pouch.
      d.path(leaf(46, 58, 7, -100, 0.45), d.fill(c), { sw: 2 });
      d.path(leaf(49, 58, 7, -70, 0.45), d.fill(c), { sw: 2 });
      d.circle(47, 62, 6.5, d.fill(c), { sw: 2.4 });
      d.eye(45.5, 61.5, 2.2);
      d.path("M37 64 Q48 70 58 64 Q58 74 48 76 Q38 74 37 64 Z", d.fill(P.tan), { sw: 2.6 });
      d.path(limb([[44, 44], [39, 50], [37, 54]], 6.5, 5.5), d.fill(c), { sw: 2.6 });
      d.shine(50, 37, 5, 2.4, 0.45, -40);
      d.path(leaf(38, 18, 14, -82, 0.42), d.fill(c), { sw: 2.6 });
      d.path(leaf(43, 19, 13, -60, 0.42), d.fill(c), { sw: 2.6 });
      d.ellipse(34, 25, 12, 8.5, d.fill(c), { sw: 3, tf: "rotate(10 34 25)" });
      d.ellipse(23, 26, 2.6, 2.2, d.fill(P.black), { sw: 1.6 });
      d.eye(33, 23, 3.6);
      d.stroke("M24 30 Q27 32 30 30.5", { sw: 2 });
      d.cheek(34, 30, 2.8);
    }),
  ],
  [
    "🦌",
    "deer",
    place(-4, 2, 0.98, (d) => {
      const c = HAIR.auburn;
      d.shadow(60, 90, 28);
      leg(d, 54, 60, 89, 6, deep(c), P.ink[1]);
      leg(d, 84, 60, 89, 6, deep(c), P.ink[1]);
      d.path(leaf(86, 46, 9, -50, 0.5), d.fill(P.cream), { sw: 2.4 });
      const body = "M40 52 C40 44 48 41 60 41 L74 41 C84 41 89 46 89 53 C89 62 83 66 74 66 L52 66 C44 66 40 60 40 52 Z";
      const neck = limb([[48, 50], [40, 38], [35, 30]], 13, 10);
      union(d, [neck, body], oneFill(d, c, 20, 24, 90, 68));
      d.clip(body, (k) => k.ellipse(62, 67, 18, 5, P.cream[1], { stroke: null }));
      leg(d, 47, 62, 90, 6.5, c, P.ink[1]);
      leg(d, 78, 62, 90, 6.5, c, P.ink[1]);
      d.shine(62, 45, 8, 2.6, 0.5, -8);
      d.tube("M33 22 Q30 14 33 8 M31.5 15 L26 11 M36 22 Q40 14 46 11 M41 15.5 L41 9", P.tan[1], 3.4, 2);
      d.path(leaf(38, 28, 12, -5, 0.42), d.fill(c), { sw: 2.5 });
      d.path(leaf(39.5, 28, 7, -5, 0.28), P.cream[1], { stroke: null });
      d.ellipse(28, 31, 11, 8, d.fill(c), { sw: 3, tf: "rotate(-28 28 31)" });
      d.ellipse(19, 36, 3.2, 2.6, d.fill(P.black), { sw: 1.8 });
      d.eye(28, 29, 3.6);
      d.stroke("M19 39.5 Q22 41.5 25 40", { sw: 2 });
      d.cheek(29, 36, 2.8);
    }),
  ],
  [
    "🐿️",
    "squirrel",
    place(-6, -2, 1, (d) => {
      const c = P.orange;
      d.shadow(54, 90, 26);
      const tail = bushy(d, [[56, 80], [73, 72], [79, 54], [77, 35], [68, 23], [58, 25]], 11, 8.5, c, 12);
      d.clip(tail, (k) => k.stroke("M66 74 Q72 67 72.5 60 M73 47 Q72.5 40 69 35", { color: c[2], sw: 2, op: 0.4 }));
      d.ellipse(46, 66, 17, 21, d.fill(c), { sw: 3.5 });
      d.clip(oval(46, 66, 17, 21), (k) => k.ellipse(39, 71, 9, 15, P.cream[1], { stroke: null }));
      d.ellipse(46, 66, 17, 21, "none", { sw: 3.5 });
      d.ellipse(52, 87, 11, 3.8, d.fill(c), { sw: 2.5 });
      d.circle(38, 40, 14, d.fill(c), { sw: 3.5 });
      d.path(leaf(43, 29, 12, -72, 0.45), d.fill(c), { sw: 2.5 });
      d.path(leaf(43.5, 28.5, 7, -72, 0.3), P.rose[1], { stroke: null });
      // An acorn held in the front paws.
      d.ellipse(30, 61, 5.5, 6.5, d.fill(P.gold), { sw: 2.2 });
      d.path("M23.5 58 Q30 51 36.5 58 Q30 60 23.5 58 Z", d.fill(P.brown), { sw: 2.2 });
      d.stroke("M30 54 L31 51", { sw: 2 });
      for (const s of [-1, 1]) d.ellipse(30 + s * 6, 62, 3.4, 4, d.fill(c), { sw: 2 });
      d.eye(33, 38, 4);
      d.ellipse(24.5, 43, 2.2, 1.8, d.fill(P.black), { sw: 1.4 });
      d.stroke("M25 46 Q28 48.5 31 46.5", { sw: 2 });
      d.cheek(34, 47, 3);
      d.shine(34, 31, 5, 2.5, 0.5, -30);
    }),
  ],
  [
    "🐎",
    "horse",
    place(-4, 1.5, 0.97, (d) => {
      const c = P.wood;
      const mane = HAIR.brown;
      d.shadow(60, 90, 32);
      leg(d, 53, 58, 89, 7, deep(c), P.ink[1]);
      leg(d, 85, 58, 89, 7, deep(c), P.ink[1]);
      d.path(limb([[87, 45], [92, 57], [88, 72]], 9, 6), d.fill(mane), { sw: 3 });
      d.path(limb([[52, 40], [44, 28], [37, 18]], 8, 6), d.fill(mane), { sw: 2.8 });
      union(d, [limb(EQ_NECK, 17, 12), EQ_BODY], oneFill(d, c, 18, 18, 90, 66));
      d.path(limb([[44, 58], [38, 70], [42, 79]], 7.5, 7), d.fill(c), { sw: 3 });
      d.ellipse(42.5, 80, 4.6, 3.4, d.fill(P.ink), { sw: 2.4, tf: "rotate(30 42.5 80)" });
      leg(d, 78, 60, 90, 7.5, c, P.ink[1]);
      d.shine(62, 42, 8, 2.6, 0.5, -8);
      d.path(leaf(34, 19, 12, -84, 0.4), d.fill(c), { sw: 2.5 });
      const head = EQ_HEAD;
      d.path(head, d.fill(c), { sw: 3 });
      d.clip(head, (k) => {
        k.ellipse(15, 41, 7, 6.5, P.tan[1], { stroke: null });
        k.path("M28 19 Q21 27 16.5 35 L19.5 36.5 Q24 28.5 31 21 Z", "#fff", { stroke: null, op: 0.92 });
      });
      d.path(head, "none", { sw: 3 });
      d.path("M36 16 Q29 15 26 21 Q30 19.5 33 22 Z", d.fill(mane), { sw: 2 });
      d.ellipse(13.8, 39.5, 1.4, 2.2, OL, { stroke: null, tf: "rotate(-30 13.8 39.5)" });
      d.eye(29, 25.5, 3.5);
      d.stroke("M15 45 Q18 46.2 21 44.2", { sw: 2 });
      d.cheek(31, 33, 2.8);
    }),
  ],
  [
    "🦦",
    "otter",
    place(-0.5, -8, 0.96, (d) => {
      const c = HAIR.brown;
      d.path("M8 66 Q19 60 30 66 T52 66 T74 66 T92 66 L92 78 Q50 90 8 78 Z", d.fill(P.sky, "v"), { sw: 3 });
      d.path(limb([[72, 59], [84, 58], [91, 51]], 9, 4.5), d.fill(c), { sw: 3 });
      const body = oval(52, 57, 27, 12, -4);
      d.path(body, d.fill(c), { sw: 3.5 });
      d.clip(body, (k) => k.ellipse(50, 49, 24, 7, P.tan[1], { stroke: null }));
      d.path(body, "none", { sw: 3.5 });
      for (const [x, a] of [[70, -74], [77, -54]]) d.path(leaf(x, 50, 11, a, 0.55), d.fill(c), { sw: 2.4 });
      // The water closes over its back: it floats.
      d.path("M26 64 Q36 59.5 46 64 T66 64 T86 64 L84 71 Q55 76 28 71 Z", P.sky[1], { stroke: null, op: 0.55 });
      d.stroke("M28 64.5 Q37 60 46 64.5 T66 64.5 T84 64.5", { color: "#fff", sw: 2, op: 0.8 });
      d.ellipse(46, 44, 6.5, 4.6, d.fill(P.stone), { sw: 2.4 });
      for (const s of [-1, 1]) d.ellipse(46 + s * 6.5, 47, 3.6, 3, d.fill(c), { sw: 2 });
      for (const s of [-1, 1]) d.circle(23 + s * 11, 40, 3.2, d.fill(c), { sw: 2.2 });
      const head = oval(23, 49, 15, 12.5);
      d.path(head, d.fill(c), { sw: 3.5 });
      d.clip(head, (k) => {
        k.path("M6 50 Q14 44 23 48 Q32 44 40 50 L40 64 L6 64 Z", P.cream[1], { stroke: null });
        for (const s of [-1, 1]) k.ellipse(23 + s * 6, 41, 4, 2, P.tan[1], { stroke: null, op: 0.8 });
      });
      d.path(head, "none", { sw: 3.5 });
      d.path("M20 49 Q23 47.5 26 49 Q25 52 23 52.5 Q21 52 20 49 Z", d.fill(P.black), { sw: 1.6 });
      d.stroke("M23 52.5 V54.5 M23 54.5 Q20.8 57 18.8 55 M23 54.5 Q25.2 57 27.2 55", { sw: 1.8 });
      whiskers(d, 23, 53, 6, 9, 1.4);
      d.eye(17.5, 45, 3.4);
      d.eye(28.5, 45, 3.4);
      d.shine(17, 40, 4, 1.8, 0.45, -20);
      d.stroke("M12 74 q5 -3 10 0 M62 77 q5 -3 10 0", { color: "#fff", sw: 2.2, op: 0.9 });
    }),
  ],
  [
    "🦔",
    "hedgehog",
    place(-1.5, -8.5, 1, (d) => {
      d.shadow(54, 88, 32);
      for (const x of [40, 66]) d.ellipse(x, 84, 5.5, 3.8, d.fill(P.brown), { sw: 2.4 });
      const coat = spiky(56, 64, 30, 24, 178, 360, 13, 0.22, [[86, 76], [44, 80]]);
      d.path(coat, d.fill(P.brown), { sw: 3 });
      d.clip(coat, (k) => {
        for (let i = 0; i < 9; i++) {
          const a = ((196 + i * 18) * Math.PI) / 180;
          k.stroke(`M${r2(56 + Math.cos(a) * 16)} ${r2(64 + Math.sin(a) * 12)} L${r2(56 + Math.cos(a) * 28)} ${r2(64 + Math.sin(a) * 22)}`, { color: P.brown[2], sw: 2, op: 0.6 });
        }
      });
      d.shine(52, 46, 9, 3.4, 0.4, -12);
      d.path("M48 52 C38 50 26 56 15 64 C12 66 13 69 17 69 C28 72 40 80 52 80 C62 80 64 70 60 62 C58 56 54 53 48 52 Z", d.fill(P.tan), { sw: 3 });
      d.circle(13.5, 66, 3.4, d.fill(P.black), { sw: 1.8 });
      d.circle(41, 54, 4, d.fill(P.tan), { sw: 2.2 });
      d.circle(41, 54, 2, P.rose[1], { stroke: null });
      d.eye(31, 60, 3.6);
      d.stroke("M18 70 Q22 72.5 26 70.5", { sw: 2 });
      d.cheek(33, 67, 3);
    }),
  ],
  [
    "🦫",
    "beaver",
    place(-3, -8, 1, (d) => {
      const c = P.brown;
      d.shadow(54, 90, 32);
      const tail = oval(79, 80, 13.5, 6.5, -12);
      d.path(tail, d.fill(P.ink), { sw: 3 });
      d.clip(tail, (k) => {
        for (let i = -3; i <= 3; i++) {
          k.stroke(`M${70 + i * 5} 70 l8 20`, { color: P.ink[0], sw: 1.4, op: 0.7 });
          k.stroke(`M${70 + i * 5} 90 l8 -20`, { color: P.ink[0], sw: 1.4, op: 0.7 });
        }
      });
      d.path(tail, "none", { sw: 3 });
      d.ellipse(54, 64, 24, 20, d.fill(c), { sw: 3.5 });
      d.clip(oval(54, 64, 24, 20), (k) => k.ellipse(44, 72, 12, 14, P.tan[1], { stroke: null, op: 0.9 }));
      d.ellipse(54, 64, 24, 20, "none", { sw: 3.5 });
      d.ellipse(44, 86, 7, 3.6, d.fill(deep(c)), { sw: 2.4 });
      d.ellipse(63, 86, 7, 3.6, d.fill(deep(c)), { sw: 2.4 });
      d.shine(58, 49, 8, 3, 0.45, -15);
      d.circle(38, 35, 4.2, d.fill(c), { sw: 2.4 });
      d.circle(31, 47, 15, d.fill(c), { sw: 3.5 });
      d.ellipse(22, 53, 9, 7, d.fill(P.tan), { sw: 2.4 });
      d.path(rr(17.5, 57.5, 7.5, 7.5, 1.8), d.fill(P.gold), { sw: 2 });
      d.line(21.25, 58, 21.25, 65, { sw: 1.4 });
      d.ellipse(16, 50.5, 3.6, 2.8, d.fill(P.black), { sw: 1.8 });
      d.stroke("M15.5 54.5 Q18 57 21 55.8", { sw: 1.8 });
      d.eye(29, 43.5, 3.9);
      d.cheek(31, 52, 3);
      d.path(rr(18, 66, 34, 5.5, 2.75), d.fill(P.wood, "v"), { sw: 2.4, tf: "rotate(-8 35 69)" });
      for (const x of [27, 40]) d.ellipse(x, 68, 4, 3.6, d.fill(c), { sw: 2 });
      d.shine(26, 39, 4, 2, 0.45, -30);
    }),
  ],
  [
    "🦓",
    "zebra",
    place(-2.5, 1.5, 0.99, (d) => {
      const w = P.white;
      const st = P.ink[1];
      d.shadow(60, 90, 32);
      for (const x of [53, 85]) {
        leg(d, x, 58, 89, 7, deep(w), P.ink[1]);
        for (const y of [69, 76]) d.line(x - 2.4, y, x + 2.4, y, { color: st, sw: 2.6 });
      }
      d.tube("M88 46 Q93 56 90 66", w[2], 2.2, 2);
      d.path(leaf(90, 64, 9, 95, 0.55), d.fill(P.ink), { sw: 2 });
      const maneP: Pt[] = [[52, 40], [44, 28], [37, 18]];
      const mane = limb(maneP, 9, 7);
      d.path(mane, d.fill(P.ink), { sw: 2.6 });
      d.clip(mane, (k) => {
        for (const p of along(maneP, 3).slice(1, -1)) k.circle(p[0] + 3, p[1] - 2, 1.6, "#fff", { stroke: null, op: 0.8 });
      });
      const neck = limb(EQ_NECK, 17, 12);
      union(d, [neck, EQ_BODY], oneFill(d, w, 18, 18, 90, 66));
      d.clip(EQ_BODY, (k) => {
        for (const x of [52, 60, 68, 76, 84]) k.path(`M${x - 3} 34 Q${x - 7} 50 ${x - 1} 68 L${x + 3} 68 Q${x - 2} 50 ${x + 2} 34 Z`, st, { stroke: null });
      });
      d.clip(neck, (k) => {
        for (const t of [0.3, 0.55, 0.8]) {
          const x = 48 - 16 * t;
          const y = 48 - 22 * t;
          k.path(`M${r2(x - 9)} ${r2(y - 6.5)} L${r2(x + 9.5)} ${r2(y + 7)} L${r2(x + 9.5)} ${r2(y + 10)} L${r2(x - 9)} ${r2(y - 3)} Z`, st, { stroke: null });
        }
      });
      for (const x of [46, 78]) {
        leg(d, x, 60, 90, 7.5, w, P.ink[1]);
        for (const y of [70, 77]) d.line(x - 2.6, y, x + 2.6, y, { color: st, sw: 2.6 });
      }
      d.shine(64, 42, 7, 2.4, 0.6, -8);
      d.path(leaf(34, 19, 12, -84, 0.4), d.fill(w), { sw: 2.5 });
      d.path(EQ_HEAD, d.fill(w), { sw: 3 });
      d.clip(EQ_HEAD, (k) => {
        k.ellipse(14.5, 41, 7.5, 7, k.fill(P.ink), { stroke: null });
        k.stroke("M24 19 Q30 22 34 20 M20 25 Q28 28 36 26", { color: st, sw: 2.8 });
      });
      d.path(EQ_HEAD, "none", { sw: 3 });
      d.ellipse(13.8, 39.5, 1.4, 2.2, P.ink[0], { stroke: null, tf: "rotate(-30 13.8 39.5)" });
      d.eye(29, 28, 3.5);
      d.cheek(31, 35, 2.8);
    }),
  ],
  [
    "🐖",
    "pig",
    place(-0.5, -7, 0.97, (d) => {
      const p = P.rose;
      d.shadow(56, 89, 32);
      leg(d, 50, 66, 87, 8, deep(p), p[2]);
      leg(d, 80, 66, 87, 8, deep(p), p[2]);
      d.tube("M85 52 Q92 50 91 44 Q90 39 86 42 Q83 45 87 47", p[2], 2.4, 2);
      union(d, [oval(56, 58, 31, 20), oval(28, 52, 16, 15)], oneFill(d, p, 12, 36, 88, 78));
      leg(d, 42, 68, 88, 8.5, p, p[2]);
      leg(d, 72, 68, 88, 8.5, p, p[2]);
      d.shine(58, 43, 10, 3.4, 0.55, -8);
      d.ellipse(14, 56, 6, 6.8, d.fill(P.pink), { sw: 2.6 });
      d.ellipse(12.5, 54, 1.2, 1.9, P.pink[2], { stroke: null });
      d.ellipse(12.5, 58.5, 1.2, 1.9, P.pink[2], { stroke: null });
      d.path("M26 40 L14 32 Q27 26 37 37 Z", d.fill(p), { sw: 2.6 });
      d.path("M25 36.5 L18 32 Q26 29.5 32 35.5 Z", p[2], { stroke: null, op: 0.45 });
      d.eye(24, 48, 4);
      d.stroke("M18 63 Q22 65.5 26 63.5", { sw: 2 });
      d.cheek(27, 58, 3.6);
    }),
  ],
  [
    "🐒",
    "monkey",
    (d) => {
      const c = P.brown;
      const f = P.tan;
      d.path(rr(8, 11, 84, 8, 4), d.fill(P.wood, "v"), { sw: 3 });
      d.path(leaf(17, 15, 12, 145, 0.45), d.fill(P.green), { sw: 2.2 });
      d.path(leaf(82, 15, 12, 35, 0.45), d.fill(P.green), { sw: 2.2 });
      d.path(limb([[57, 72], [70, 79], [80, 72], [79, 62], [72, 63]], 5.5, 4.5), d.fill(c), { sw: 2.6 });
      for (const [a, b, e] of [[[45, 72], [42, 82], [44, 87]], [[55, 72], [58, 82], [55, 87]]] as Pt[][]) {
        d.path(limb([a, b, e], 7, 6.5), d.fill(c), { sw: 2.6 });
        d.ellipse(e[0], e[1] + 1.5, 4.6, 3.4, d.fill(f), { sw: 2 });
      }
      d.path(limb([[56, 52], [60, 34], [59, 18]], 7, 6.5), d.fill(c), { sw: 2.6 });
      d.ellipse(59, 15.5, 5, 4.4, d.fill(f), { sw: 2.2 });
      d.ellipse(50, 62, 13, 15, d.fill(c), { sw: 3.2 });
      d.ellipse(49, 65, 7.5, 10, f[1], { stroke: null });
      d.path(limb([[42, 54], [32, 58], [26, 50]], 7, 6.5), d.fill(c), { sw: 2.6 });
      d.circle(25.5, 48.5, 4.4, d.fill(f), { sw: 2.2 });
      for (const x of [30, 58]) {
        d.circle(x, 38, 6.5, d.fill(c), { sw: 2.6 });
        d.circle(x, 38, 3.4, f[1], { stroke: null });
      }
      d.circle(44, 38, 14, d.fill(c), { sw: 3.5 });
      for (const p of [circlePath(39.5, 37, 6.5), circlePath(48.5, 37, 6.5), oval(44, 45, 8.5, 6)]) d.path(p, f[1], { stroke: null });
      d.eye(39.5, 37, 3.2);
      d.eye(48.5, 37, 3.2);
      d.circle(42.5, 43.5, 0.9, OL, { stroke: null });
      d.circle(45.5, 43.5, 0.9, OL, { stroke: null });
      d.smile(44, 46.5, 6, 2);
      d.shine(38, 28, 5, 2.4, 0.45, -25);
    },
  ],
  [
    "🦨",
    "skunk",
    place(-1.5, 1, 0.99, (d) => {
      const k = P.ink;
      d.shadow(50, 89, 30);
      const tp: Pt[] = [[62, 70], [76, 62], [82, 44], [78, 28], [66, 20], [56, 24]];
      const tail = bushy(d, tp, 10, 8, k, 12);
      d.clip(tail, (c) => c.path(limb(tp, 7, 5), "#fff", { stroke: null, op: 0.95 }));
      for (const x of [30, 40, 52, 60]) leg(d, x, 74, 88, 6.5, k);
      const body = oval(44, 68, 23, 15);
      d.path(body, d.fill(k), { sw: 3.5 });
      d.clip(body, (c) => c.path(limb([[22, 56], [44, 53], [68, 60]], 9, 7), "#fff", { stroke: null, op: 0.95 }));
      d.path(body, "none", { sw: 3.5 });
      for (const x of [17, 30]) d.circle(x, 52, 3.6, d.fill(k), { sw: 2.2 });
      const head = oval(23, 63, 13, 11.5, -8);
      d.path(head, d.fill(k), { sw: 3.5 });
      d.clip(head, (c) => c.path("M22 50 Q19 58 13 63 L16 65 Q22 60 27 51 Z", "#fff", { stroke: null, op: 0.95 }));
      d.path(head, "none", { sw: 3.5 });
      d.ellipse(11.5, 65.5, 2.8, 2.2, d.fill(P.pink), { sw: 1.6 });
      ringEye(d, 21, 61, 3.3);
      d.stroke("M13.5 69 Q16.5 71 19.5 69.5", { color: P.ink[0], sw: 1.8 });
      d.shine(38, 57, 6, 2.4, 0.3, -10);
    }),
  ],
  [
    "🐯",
    "tiger",
    (d) => {
      const o = P.orange;
      const st = P.ink[1];
      for (const s of [-1, 1]) {
        d.circle(50 + s * 24, 27, 10, d.fill(o), { sw: 3 });
        d.circle(50 + s * 24, 28, 5, P.cream[1], { stroke: null });
      }
      const head = headPath(50, 55, 33, 29);
      d.path(head, d.fill(o), { sw: 3.5 });
      d.clip(head, (k) => {
        k.path("M10 63 C24 55 38 58 50 63 C62 58 76 55 90 63 L90 92 L10 92 Z", P.cream[1], { stroke: null });
        for (const s of [-1, 1]) k.ellipse(50 + s * 13, 39.5, 6, 3.4, P.cream[1], { stroke: null });
        k.path("M46 25 L50 40 L54 25 Z", st, { stroke: null });
        for (const s of [-1, 1]) {
          k.stroke(`M${50 + s * 7} 27 Q${50 + s * 9} 32 ${50 + s * 7.5} 35`, { color: st, sw: 2.6 });
          for (const y of [45, 53, 61]) k.path(`M${50 + s * 36} ${y - 3} L${50 + s * 24} ${y + 1} L${50 + s * 36} ${y + 3.5} Z`, st, { stroke: null });
        }
      });
      d.path(head, "none", { sw: 3.5 });
      muzzle(d, 50, 67, 8.5, P.white[1], 2.2);
      d.path("M45.5 60.5 Q50 58.5 54.5 60.5 Q53 64.5 50 65.5 Q47 64.5 45.5 60.5 Z", d.fill(P.pink), { sw: 2 });
      d.stroke("M50 65.5 V68 M50 68 Q47 71.5 44 69 M50 68 Q53 71.5 56 69", { sw: 2 });
      whiskers(d, 50, 67, 13, 22, 1.8);
      d.eye(38, 48, 5);
      d.eye(62, 48, 5);
      d.shine(36, 34, 6, 3, 0.45, -20);
    },
  ],
  [
    "🐅",
    "tiger",
    place(-2.5, -5, 0.97, (d) => {
      const o = P.orange;
      const st = P.ink[1];
      d.shadow(58, 90, 33);
      for (const x of [53, 85]) leg(d, x, 62, 88, 9, deep(o));
      const tail = limb([[86, 50], [91, 40], [87, 28]], 7, 5.5);
      d.path(tail, d.fill(o), { sw: 3 });
      d.clip(tail, (k) => {
        k.stroke("M86 44 l7 -2 M86 36 l7 0", { color: st, sw: 2.6 });
        k.circle(87, 27, 4.5, st, { stroke: null });
      });
      const body = "M36 53 C36 43 46 39 60 39 C76 39 89 43 89 55 C89 66 80 70 68 70 L50 70 C41 70 36 63 36 53 Z";
      d.path(body, d.fill(o), { sw: 3.5 });
      d.clip(body, (k) => {
        k.ellipse(60, 72, 24, 7, P.cream[1], { stroke: null });
        for (const x of [52, 61, 70, 79, 87]) k.path(`M${x - 3.5} 37 Q${x - 1} 47 ${x + 1} 55 Q${x + 2.5} 47 ${x + 3.5} 37 Z`, st, { stroke: null });
      });
      d.path(body, "none", { sw: 3.5 });
      for (const x of [45, 77]) {
        leg(d, x, 64, 89, 9.5, o);
        d.line(x - 3.3, 74, x + 3.3, 74, { color: st, sw: 2.4 });
        d.line(x - 3.3, 80, x + 3.3, 80, { color: st, sw: 2.4 });
      }
      d.shine(60, 44, 8, 2.6, 0.5, -8);
      for (const x of [17, 39]) {
        d.circle(x, 31, 6.5, d.fill(o), { sw: 2.6 });
        d.circle(x, 31.5, 3.2, P.cream[1], { stroke: null });
      }
      const head = oval(28, 45, 17, 15);
      d.path(head, d.fill(o), { sw: 3.5 });
      d.clip(head, (k) => {
        k.path("M8 50 C18 46 24 48 28 51 C32 48 38 46 48 50 L48 64 L8 64 Z", P.cream[1], { stroke: null });
        k.path("M25.5 30 L28 39 L30.5 30 Z", st, { stroke: null });
        for (const s of [-1, 1]) for (const y of [41, 47]) k.path(`M${28 + s * 18} ${y - 2.4} L${28 + s * 11} ${y + 0.6} L${28 + s * 18} ${y + 3} Z`, st, { stroke: null });
      });
      d.path(head, "none", { sw: 3.5 });
      muzzle(d, 28, 52.5, 5.4, P.white[1], 2);
      d.path("M25.5 48 Q28 47 30.5 48 Q29.5 50.5 28 51 Q26.5 50.5 25.5 48 Z", d.fill(P.pink), { sw: 1.8 });
      d.eye(21.5, 43, 3.6);
      d.eye(34.5, 43, 3.6);
      d.shine(22, 35, 4, 2, 0.45, -25);
    }),
  ],
  [
    "🐈",
    "cat",
    place(-2, -3.5, 1, (d) => {
      const g = P.stone;
      const st = P.stone[2];
      d.shadow(58, 90, 30);
      for (const x of [52, 82]) leg(d, x, 62, 88, 6.5, deep(g));
      d.path(limb([[82, 52], [89, 42], [90, 30], [86, 22], [80, 24]], 7, 5.5), d.fill(g), { sw: 3 });
      const body = "M36 55 C36 47 44 44 56 44 C70 44 84 46 85 55 C86 63 80 67 70 67 L48 67 C40 67 36 62 36 55 Z";
      d.path(body, d.fill(g), { sw: 3.5 });
      d.clip(body, (k) => {
        k.ellipse(56, 68, 18, 6, P.white[1], { stroke: null });
        for (const x of [56, 65, 74]) k.path(`M${x - 3} 42 Q${x - 1} 49 ${x} 54 Q${x + 2} 49 ${x + 3} 42 Z`, st, { stroke: null, op: 0.8 });
      });
      d.path(body, "none", { sw: 3.5 });
      for (const x of [44, 74]) {
        leg(d, x, 63, 89, 7, g);
        d.ellipse(x, 88, 4.6, 2.6, P.white[1], { sw: 2 });
      }
      d.shine(54, 48, 7, 2.4, 0.5, -8);
      for (const s of [-1, 1]) {
        const x = 30 + s * 10;
        d.path(`M${x - 6} 34 L${x + s * 2} 19 L${x + 7} 31 Z`, d.fill(g), { sw: 2.6 });
        d.path(`M${x - 3} 31 L${x + s * 1.5} 23 L${x + 4} 30 Z`, P.rose[1], { stroke: null });
      }
      const head = oval(30, 42, 16, 14);
      d.path(head, d.fill(g), { sw: 3.5 });
      d.clip(head, (k) => {
        for (const x of [26, 30, 34]) k.path(`M${x - 2} 27 L${x} ${x === 30 ? 36 : 34} L${x + 2} 27 Z`, st, { stroke: null, op: 0.8 });
      });
      d.path(head, "none", { sw: 3.5 });
      muzzle(d, 30, 49, 5.2, P.white[1], 2);
      d.path("M27.6 45.4 Q30 44.4 32.4 45.4 Q31.4 47.8 30 48.4 Q28.6 47.8 27.6 45.4 Z", d.fill(P.pink), { sw: 1.8 });
      whiskers(d, 30, 49, 8, 12, 1.5);
      d.eye(24, 41, 3.8);
      d.eye(36, 41, 3.8);
      d.cheek(20, 47, 2.6);
      d.cheek(40, 47, 2.6);
      d.shine(23, 34, 4, 2, 0.45, -25);
    }),
  ],
  [
    "🐫",
    "camel",
    place(-1, -4.5, 0.97, (d) => {
      const c = P.wood;
      d.shadow(58, 90, 32);
      leg(d, 54, 62, 89, 6.5, deep(c));
      leg(d, 85, 62, 89, 6.5, deep(c));
      d.tube("M88 50 Q92 58 90 66", c[2], 2.2, 2);
      d.path(leaf(90, 64, 7, 95, 0.5), c[2], { sw: 2 });
      const body = "M41 58 C39 50 43 46 47 46 C49 33 55 25 61 27 C66 29 66 35 67 38 C69 29 75 23 81 27 C86 31 86 41 86 46 C90 48 92 54 90 60 C88 68 82 71 74 71 L51 71 C45 71 42 66 41 58 Z";
      const neck = limb([[47, 54], [35, 58], [27, 48], [24, 35]], 13, 9);
      union(d, [neck, body], oneFill(d, c, 12, 22, 92, 72));
      for (const x of [48, 79]) {
        leg(d, x, 64, 90, 7, c);
        d.ellipse(x, 89, 5.5, 2.4, d.fill(deep(c)), { sw: 2.2 });
      }
      d.shine(56, 33, 4, 2.2, 0.5, -40);
      d.shine(76, 31, 4, 2.2, 0.5, -40);
      camelHead(d, c);
    }),
  ],
  [
    "🦚",
    "peacock",
    place(-4, -3, 1, (d) => {
      const fan = "M16 66 A38 38 0 0 1 92 66 Q54 76 16 66 Z";
      d.path(fan, d.fill(P.teal), { sw: 3.5 });
      d.clip(fan, (k) => {
        for (let i = 0; i < 9; i++) {
          const a = Math.PI + (Math.PI * (i + 0.5)) / 9;
          k.stroke(`M54 66 L${r2(54 + Math.cos(a) * 40)} ${r2(66 + Math.sin(a) * 40)}`, { color: P.teal[2], sw: 1.6, op: 0.5 });
        }
        const spot = (x: number, y: number, s: number) => {
          k.ellipse(x, y, 4.6 * s, 5.6 * s, k.fill(P.gold), { sw: 1.6 });
          k.ellipse(x, y + 0.6 * s, 3 * s, 3.6 * s, P.blue[1], { stroke: null });
          k.circle(x, y + 1 * s, 1.5 * s, P.navy[2], { stroke: null });
        };
        for (let i = 0; i < 7; i++) {
          const a = Math.PI + (Math.PI * (i + 0.5)) / 7;
          spot(54 + Math.cos(a) * 31, 66 + Math.sin(a) * 31, 1);
        }
        for (let i = 0; i < 4; i++) {
          const a = Math.PI + (Math.PI * (i + 0.5)) / 4;
          spot(54 + Math.cos(a) * 19, 66 + Math.sin(a) * 19, 0.85);
        }
      });
      d.path(fan, "none", { sw: 3.5 });
      d.tube("M40 80 V89 M46 80 V89", P.stone[1], 2.6, 2);
      union(d, [oval(43, 72, 11, 13), limb([[42, 66], [39, 50], [40, 38]], 11, 9), circlePath(40, 36, 8)], oneFill(d, P.blue, 28, 26, 56, 86));
      for (const x of [35, 40, 45]) {
        d.stroke(`M40 29 L${x} 21`, { sw: 1.6 });
        d.circle(x, 20, 2.2, d.fill(P.blue), { sw: 1.6 });
      }
      d.ellipse(37, 36, 4.2, 3.4, "#fff", { stroke: null });
      d.path("M33 36 L26 38 L33 40 Z", d.fill(P.stone), { sw: 1.8 });
      d.eye(37.5, 35.5, 2.6);
      d.shine(38, 64, 3, 6, 0.4, 15);
    }),
  ],
  [
    "🐥",
    "chick",
    place(0, -2.5, 1, (d) => {
      const y = P.lemon;
      d.shadow(50, 91, 24);
      for (const s of [-1, 1]) d.tube(`M${50 + s * 9} 82 V88 M${50 + s * 5} 89.5 L${50 + s * 9} 88 L${50 + s * 13} 89.5`, P.orange[1], 2.8, 2);
      for (const s of [-1, 1]) d.path(leaf(50 + s * 26, 60, 15, s < 0 ? 158 : 22, 0.5), d.fill(y), { sw: 2.6 });
      for (const a of [-118, -90, -62]) d.path(leaf(50, 28, 11, a, 0.42), d.fill(y), { sw: 2.2 });
      d.path(fluff(50, 55, 30, 28, 18, 0.05), d.fill(y), { sw: 3.5 });
      d.eye(40, 51, 4.6);
      d.eye(60, 51, 4.6);
      d.path("M44.5 59 Q50 56 55.5 59 L50 66 Z", d.fill(P.orange), { sw: 2.2 });
      d.cheek(33, 61, 4);
      d.cheek(67, 61, 4);
      d.shine(38, 37, 8, 4, 0.6, -25);
    }),
  ],
  [
    "🦝",
    "raccoon",
    place(-7.5, -3, 1, (d) => {
      const g = P.stone;
      d.shadow(54, 90, 30);
      const tp: Pt[] = [[60, 82], [76, 80], [86, 66], [84, 50]];
      const tail = bushy(d, tp, 8.5, 7.5, g, 10);
      d.clip(tail, (k) => {
        // Dark rings across the tail (and a dark tip).
        const c = along(tp, 24);
        for (const t of [0.24, 0.5, 0.76, 0.98]) {
          const i = Math.round(t * (c.length - 1));
          const a = c[Math.max(0, i - 1)];
          const b = c[Math.min(c.length - 1, i + 1)];
          const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
          const nx = (-(b[1] - a[1]) / len) * 12;
          const ny = ((b[0] - a[0]) / len) * 12;
          k.stroke(`M${r2(c[i][0] - nx)} ${r2(c[i][1] - ny)} L${r2(c[i][0] + nx)} ${r2(c[i][1] + ny)}`, { color: P.ink[1], sw: t > 0.9 ? 8 : 5, cap: "butt" });
        }
      });
      const body = oval(48, 68, 19, 19);
      d.path(body, d.fill(g), { sw: 3.5 });
      d.clip(body, (k) => k.ellipse(48, 75, 11, 13, P.grey[0], { stroke: null }));
      d.path(body, "none", { sw: 3.5 });
      for (const x of [39, 57]) d.ellipse(x, 87, 6.5, 3.4, d.fill(P.ink), { sw: 2.2 });
      for (const x of [40, 56]) d.ellipse(x, 72, 4.4, 3.6, d.fill(P.ink), { sw: 2 });
      for (const s of [-1, 1]) {
        d.path(`M${46 + s * 8} 30 L${46 + s * 15} 15 Q${46 + s * 20} 14 ${46 + s * 21} 20 L${46 + s * 21} 34 Z`, d.fill(g), { sw: 2.6 });
        d.path(`M${46 + s * 11} 29 L${46 + s * 15.5} 19.5 L${46 + s * 18.5} 30 Z`, P.white[1], { stroke: null });
      }
      const head = "M46 22 C58 22 68 28 70 38 Q74 44 70 48 C64 56 54 60 46 62 C38 60 28 56 22 48 Q18 44 22 38 C24 28 34 22 46 22 Z";
      d.path(head, d.fill(g), { sw: 3.5 });
      d.clip(head, (k) => {
        k.path("M28 54 Q46 42 64 54 L64 66 L28 66 Z", P.white[1], { stroke: null });
        for (const s of [-1, 1]) k.ellipse(46 + s * 9, 31, 6, 2.6, P.white[1], { stroke: null });
        k.path("M20 41 Q29 33 37 37 Q46 41 55 37 Q63 33 72 41 Q67 49 58 47 Q50 45 46 50 Q42 45 34 47 Q25 49 20 41 Z", k.fill(P.ink), { stroke: null });
      });
      d.path(head, "none", { sw: 3.5 });
      d.ellipse(46, 54.5, 3.6, 2.7, d.fill(P.black), { sw: 1.8 });
      d.stroke("M46 57.2 V58.8 M46 58.8 Q43.8 61 41.8 59.4 M46 58.8 Q48.2 61 50.2 59.4", { sw: 1.8 });
      ringEye(d, 37, 41.5, 3.3);
      ringEye(d, 55, 41.5, 3.3);
      d.shine(36, 27, 5, 2.4, 0.45, -20);
    }),
  ],
  [
    "🦢",
    "swan",
    place(-1, 1.5, 0.97, (d) => {
      const w = P.white;
      d.path("M8 74 Q19 68 30 74 T52 74 T74 74 T92 74 L92 82 Q50 92 8 82 Z", d.fill(P.sky, "v"), { sw: 3 });
      const body = "M20 66 C20 56 32 50 46 52 L64 52 C76 50 86 42 91 32 C93 50 88 66 76 72 C64 78 32 78 20 66 Z";
      const neck = limb([[34, 58], [24, 48], [22, 36], [27, 25], [32, 19]], 9, 7.5);
      union(d, [neck, body, oval(31, 18, 7.5, 6.2)], oneFill(d, w, 14, 10, 92, 78));
      d.path("M44 61 C54 51 70 49 84 41 C84 53 78 62 66 66 Q57 70 48 68 Z", d.fill(w), { sw: 2.8 });
      d.stroke("M58 59 Q64 57 70 54 M54 64 Q62 63 70 60", { color: w[2], sw: 2 });
      d.path("M25 16.5 L13 20.5 Q14 23.5 18 23 L25 21 Z", d.fill(P.orange), { sw: 2.2 });
      d.circle(25.4, 18.2, 2.5, OL, { stroke: null });
      d.eye(31.5, 16.5, 2.6);
      d.shine(26, 33, 2, 5, 0.6, 15);
      d.stroke("M14 80 q5 -3 10 0 M66 82 q5 -3 10 0", { color: "#fff", sw: 2.2, op: 0.9 });
    }),
  ],
  [
    "🐵",
    "monkey",
    (d) => {
      const c = P.brown;
      const f = P.tan;
      for (const s of [-1, 1]) {
        d.circle(50 + s * 31, 52, 11, d.fill(c), { sw: 3 });
        d.circle(50 + s * 31, 52, 6, f[1], { stroke: null });
      }
      d.path("M45 20 Q47 11 56 12 Q50 15 51 20 Z", d.fill(c), { sw: 2.4 });
      d.path(headPath(50, 52, 30, 33), d.fill(c), { sw: 3.5 });
      union(d, [circlePath(39, 47, 12), circlePath(61, 47, 12), oval(50, 66, 20, 15)], oneFill(d, f, 27, 35, 73, 81), 2.6);
      d.eye(39, 47, 4.8);
      d.eye(61, 47, 4.8);
      d.ellipse(46.5, 61, 1.4, 2.2, OL, { stroke: null });
      d.ellipse(53.5, 61, 1.4, 2.2, OL, { stroke: null });
      d.stroke("M40 68 Q50 77 60 68", { sw: 2.4 });
      d.cheek(31, 60, 4);
      d.cheek(69, 60, 4);
      d.shine(37, 29, 7, 3.4, 0.45, -20);
    },
  ],
  [
    "🦩",
    "flamingo",
    place(-3, 1, 0.97, (d) => {
      const p = P.pink;
      d.shadow(56, 91, 14);
      d.tube("M57 54 L58 72 L57 88", p[1], 3, 2);
      d.tube("M51 89.5 L57 88 L63 89.5", p[1], 3, 2);
      d.tube("M61 54 L69 66 L58 68", p[1], 3, 2);
      for (const a of [-14, 8]) d.path(leaf(76, 42, 13, a, 0.4), d.fill(p), { sw: 2.4 });
      const neck = limb([[45, 42], [36, 38], [33, 28], [36, 20], [32, 13]], 7.5, 6.5);
      union(d, [neck, oval(59, 44, 21, 13, -10), oval(30, 14, 6.5, 5.5)], oneFill(d, p, 20, 6, 82, 58));
      d.path("M50 46 C58 38 72 37 80 42 C76 50 66 54 56 53 Z", d.fill(deep(p)), { sw: 2.4 });
      const beak = "M25 12 Q19 12.5 18 17.5 Q17 23 20 27 L22.5 26 Q21.5 21 24.5 18 Q26 16 26 14 Z";
      d.path(beak, d.fill(P.white), { sw: 2.2 });
      d.clip(beak, (k) => k.rect(14, 21, 12, 8, 0, P.ink[1], { stroke: null }));
      d.path(beak, "none", { sw: 2.2 });
      d.eye(31, 12.5, 2.4);
      d.shine(56, 37, 6, 2.4, 0.5, -15);
    }),
  ],
  [
    "🦤",
    "dodo",
    place(-0.5, -5.5, 0.97, (d) => {
      const g = P.steel;
      d.shadow(54, 90, 26);
      for (const x of [48, 62]) d.tube(`M${x} 76 V88 M${x - 5} 89.5 L${x} 88 L${x + 5} 89.5`, P.gold[1], 4, 2.2);
      d.path(fluff(84, 46, 8, 7, 7, 0.22), d.fill(P.white), { sw: 2.4 });
      union(d, [oval(56, 58, 26, 22), oval(30, 36, 13, 12), limb([[42, 52], [32, 40]], 16, 14)], oneFill(d, g, 17, 24, 82, 80));
      d.path(leaf(54, 54, 20, 25, 0.5), d.fill(deep(g)), { sw: 2.4 });
      const beak = "M24 31 C14 29 7 35 8 43 C9 48 13.5 48 14.5 44.5 C15.5 41 18 40 24 40 Z";
      d.path(beak, d.fill(P.lemon), { sw: 2.4 });
      d.clip(beak, (k) => k.circle(9, 44.5, 5, P.ink[1], { stroke: null }));
      d.path(beak, "none", { sw: 2.4 });
      d.eye(31, 33, 3.6);
      d.cheek(32, 41, 3);
      d.shine(46, 44, 8, 3, 0.5, -20);
    }),
  ],
  [
    "🐼",
    "panda",
    (d) => {
      for (const s of [-1, 1]) d.circle(50 + s * 24, 27, 11, d.fill(P.black), { sw: 3 });
      d.path(headPath(50, 55, 33, 30), d.fill(P.white), { sw: 3.5 });
      for (const s of [-1, 1]) d.ellipse(50 + s * 14, 50, 8.5, 10.5, d.fill(P.black), { stroke: null, tf: `rotate(${s * -35} ${50 + s * 14} 50)` });
      ringEye(d, 36.5, 49, 3.5);
      ringEye(d, 63.5, 49, 3.5);
      d.ellipse(50, 62, 5.5, 3.8, d.fill(P.black), { sw: 2 });
      d.stroke("M50 65.5 V68 M50 68 Q46.5 71.5 43.5 69 M50 68 Q53.5 71.5 56.5 69", { sw: 2 });
      d.cheek(30, 65, 4.4);
      d.cheek(70, 65, 4.4);
      d.shine(36, 34, 8, 4, 0.5, -18);
    },
  ],
  [
    "🐂",
    "ox",
    place(0, 0, 0.93, (d) => {
      const c = P.brown;
      d.shadow(58, 90, 33);
      leg(d, 50, 62, 88, 9.5, deep(c), P.ink[1]);
      leg(d, 86, 62, 88, 9.5, deep(c), P.ink[1]);
      d.tube("M89 46 Q94 56 92 67", c[2], 2.4, 2);
      d.path(leaf(92, 65, 10, 95, 0.55), d.fill(deep(c)), { sw: 2 });
      d.path("M34 50 C33 38 42 31 56 33 L74 36 C86 36 91 44 91 54 C91 66 85 72 74 72 L48 72 C38 72 34 62 34 50 Z", d.fill(c), { sw: 3.5 });
      for (const x of [42, 78]) leg(d, x, 64, 89, 10, c, P.ink[1]);
      d.shine(52, 38, 8, 3, 0.5, -10);
      d.path(limb([[33, 34], [40, 26], [38, 16], [31, 12]], 7, 3.6), d.fill(P.cream), { sw: 2.4 });
      d.path(leaf(35, 40, 13, 12, 0.42), d.fill(c), { sw: 2.6 });
      d.path(leaf(37, 40.5, 8, 12, 0.3), P.rose[1], { stroke: null, op: 0.8 });
      d.path(oval(25, 45, 14.5, 13.5), d.fill(c), { sw: 3.5 });
      d.path(limb([[26, 34], [19, 31], [15, 23], [19, 16]], 7, 3.6), d.fill(P.cream), { sw: 2.4 });
      d.path(fluff(25, 33, 6.5, 4, 6, 0.25), d.fill(deep(c)), { sw: 2 });
      d.ellipse(16, 54, 10.5, 8, d.fill(P.tan), { sw: 3 });
      d.ellipse(12, 53, 1.7, 2.6, P.tan[2], { stroke: null });
      d.ellipse(19, 53.5, 1.7, 2.6, P.tan[2], { stroke: null });
      d.stroke("M12 58 Q16 60.5 20 58", { sw: 2 });
      d.eye(24, 43, 4.2);
      d.cheek(28, 50, 3);
      d.shine(21, 37, 4, 2, 0.45, -30);
    }),
  ],
  [
    "🦍",
    "gorilla",
    (d) => {
      const f = HAIR.black;
      const s = P.stone;
      d.shadow(50, 91, 36);
      for (const k of [-1, 1]) {
        d.path(limb([[50 + k * 20, 46], [50 + k * 30, 64], [50 + k * 30, 83]], 15, 12), d.fill(f), { sw: 3.2 });
        d.ellipse(50 + k * 30, 86, 8, 4.6, d.fill(s), { sw: 2.4 });
      }
      for (const k of [-1, 1]) d.ellipse(50 + k * 12, 85, 9.5, 5.5, d.fill(f), { sw: 3 });
      d.path(oval(50, 63, 22, 24), d.fill(f), { sw: 3.5 });
      d.ellipse(50, 62, 12, 12, f[0], { stroke: null, op: 0.6 });
      d.shine(36, 48, 5, 2.4, 0.25, -30);
      d.path("M50 15 C62 15 70 25 70 38 C70 50 62 56 50 56 C38 56 30 50 30 38 C30 25 38 15 50 15 Z", d.fill(f), { sw: 3.5 });
      union(d, [circlePath(43.5, 38, 8), circlePath(56.5, 38, 8), oval(50, 47, 11, 8)], oneFill(d, s, 35, 30, 65, 55), 2.4);
      d.stroke("M36 32 Q43.5 28.5 50 32 Q56.5 28.5 64 32", { color: f[1], sw: 3 });
      d.eye(43.5, 38.5, 3.5);
      d.eye(56.5, 38.5, 3.5);
      d.ellipse(47, 45, 1.6, 2.2, OL, { stroke: null });
      d.ellipse(53, 45, 1.6, 2.2, OL, { stroke: null });
      d.smile(50, 49.5, 7, 2);
      d.shine(42, 21, 5, 2.4, 0.3, -20);
    },
  ],
  [
    "🐨",
    "koala",
    (d) => {
      const g = P.stone;
      for (const s of [-1, 1]) {
        d.path(fluff(50 + s * 26, 34, 13, 13, 10, 0.1), d.fill(g), { sw: 3 });
        d.path(fluff(50 + s * 26, 35, 8, 8, 8, 0.12), P.white[1], { stroke: null });
      }
      d.path(headPath(50, 56, 30, 28), d.fill(g), { sw: 3.5 });
      d.path(oval(50, 61, 8.5, 11), d.fill(P.ink), { sw: 2.4 });
      d.shine(47, 55.5, 2.2, 3.6, 0.5, 0);
      d.eye(36, 52, 4.2);
      d.eye(64, 52, 4.2);
      d.stroke("M44.5 76 Q50 79.5 55.5 76", { sw: 2.2 });
      d.cheek(29, 64, 4.2);
      d.cheek(71, 64, 4.2);
      d.shine(38, 37, 6, 3, 0.4, -20);
    },
  ],
  [
    "🐹",
    "hamster",
    place(0, -2.5, 1, (d) => {
      const o = P.orange;
      for (const s of [-1, 1]) {
        d.circle(50 + s * 20, 27, 7.5, d.fill(o), { sw: 2.8 });
        d.circle(50 + s * 20, 27.5, 4, P.rose[1], { stroke: null });
      }
      const head = "M50 22 C68 22 80 34 82 50 C84 68 72 86 50 86 C28 86 16 68 18 50 C20 34 32 22 50 22 Z";
      d.path(head, d.fill(o), { sw: 3.5 });
      d.clip(head, (k) => {
        k.path("M10 60 C20 48 34 50 42 56 Q50 47 58 56 C66 50 80 48 90 60 L90 92 L10 92 Z", k.fill(P.cream), { stroke: null });
        k.path("M46.5 31 Q50 27 53.5 31 L53 53 L47 53 Z", P.cream[1], { stroke: null, op: 0.9 });
      });
      d.path(head, "none", { sw: 3.5 });
      d.eye(37, 48, 4.8);
      d.eye(63, 48, 4.8);
      d.ellipse(50, 58.5, 3.2, 2.4, d.fill(P.pink), { sw: 1.8 });
      d.path(rr(48, 63.5, 4, 4.2, 1), "#fff", { sw: 1.4 });
      d.stroke("M50 61 V63.5 M50 63.5 Q47.5 66 45 64 M50 63.5 Q52.5 66 55 64", { sw: 1.8 });
      whiskers(d, 50, 61, 10, 12, 1.5);
      d.cheek(29, 64, 4.4);
      d.cheek(71, 64, 4.4);
      d.shine(36, 33, 7, 3.4, 0.45, -20);
    }),
  ],
  [
    "🐻‍❄️",
    "polar bear",
    place(0, -2.5, 1, (d) => {
      const w = P.white;
      for (const s of [-1, 1]) {
        d.circle(50 + s * 25, 30, 8.5, d.fill(w), { sw: 3 });
        d.circle(50 + s * 25, 30.5, 4, P.grey[1], { stroke: null });
      }
      d.path(headPath(50, 56, 32, 29), d.fill(w), { sw: 3.5 });
      d.ellipse(50, 66, 16, 12.5, d.fill(P.cream), { sw: 2.8 });
      d.ellipse(50, 60, 7, 4.8, d.fill(P.black), { sw: 2.2 });
      d.shine(48, 58.5, 2.4, 1.2, 0.7, -10);
      d.stroke("M50 64.5 V68 M50 68 Q46 72 43 69 M50 68 Q54 72 57 69", { sw: 2.2 });
      d.eye(37, 50, 4.6);
      d.eye(63, 50, 4.6);
      d.cheek(29, 63, 4.2);
      d.cheek(71, 63, 4.2);
      d.shine(36, 37, 8, 4, 0.5, -18);
    }),
  ],
  [
    "🐀",
    "rat",
    place(-1.5, -10, 0.98, (d) => {
      const g = P.stone;
      d.shadow(50, 88, 30);
      d.path(limb([[74, 70], [86, 76], [92, 64], [86, 51]], 5, 2.6), d.fill(P.rose), { sw: 2.4 });
      for (const x of [38, 66]) d.ellipse(x, 84, 5, 2.8, d.fill(P.rose), { sw: 2 });
      const body = smooth([[13, 64], [22, 54], [38, 47], [58, 46], [74, 52], [80, 66], [70, 80], [46, 82], [28, 76], [18, 70]], 0.2);
      d.path(body, d.fill(g), { sw: 3.5 });
      d.clip(body, (k) => k.ellipse(42, 81, 24, 8, P.grey[0], { stroke: null }));
      d.path(body, "none", { sw: 3.5 });
      d.shine(52, 51, 9, 3, 0.5, -8);
      d.circle(38, 47, 8, d.fill(g), { sw: 2.6 });
      d.circle(38, 47.5, 4.6, P.rose[1], { stroke: null });
      d.circle(13, 64, 2.8, d.fill(P.pink), { sw: 1.6 });
      d.stroke("M17 62 L9 58 M17 65 L8.5 66", { sw: 1.4 });
      d.eye(27, 58, 3.6);
      d.stroke("M16 69 Q19 71 22 69.5", { sw: 1.8 });
      d.cheek(28, 66, 3);
    }),
  ],
  [
    "🐗",
    "boar",
    place(-0.5, -7, 0.97, (d) => {
      const c = HAIR.brown;
      d.shadow(56, 89, 32);
      leg(d, 50, 66, 87, 8, deep(c), P.ink[1]);
      leg(d, 80, 66, 87, 8, deep(c), P.ink[1]);
      d.tube("M86 52 Q92 56 91 64", c[2], 2, 2);
      d.path(leaf(91, 63, 6, 95, 0.5), c[2], { sw: 1.8 });
      d.path(spiky(56, 58, 30, 20, 196, 334, 9, 0.2, [[56, 58]]), d.fill(deep(c)), { sw: 2.6 });
      union(d, [oval(56, 58, 31, 20), oval(28, 54, 16, 15)], oneFill(d, c, 12, 38, 88, 78));
      leg(d, 42, 68, 88, 8.5, c, P.ink[1]);
      leg(d, 72, 68, 88, 8.5, c, P.ink[1]);
      d.shine(58, 44, 9, 3, 0.4, -8);
      d.path(leaf(31, 42, 12, -100, 0.45), d.fill(c), { sw: 2.5 });
      d.path(leaf(31, 41, 7, -100, 0.28), P.rose[1], { stroke: null, op: 0.7 });
      d.ellipse(14, 58, 6, 6.8, d.fill(P.rose), { sw: 2.6 });
      d.ellipse(12.5, 56, 1.2, 1.9, P.rose[2], { stroke: null });
      d.ellipse(12.5, 60.5, 1.2, 1.9, P.rose[2], { stroke: null });
      d.path("M21 64 Q15 65 13 55 Q18 60 23 61 Z", d.fill(P.cream), { sw: 1.8 });
      ringEye(d, 25, 50, 3.4);
      d.stroke("M19 67 Q23 69.5 27 67.5", { sw: 2 });
      d.cheek(29, 60, 3.4);
    }),
  ],
  [
    "🦡",
    "badger",
    place(0, -11, 0.96, (d) => {
      const g = P.stone;
      d.shadow(54, 86, 34);
      for (const x of [52, 82]) leg(d, x, 62, 85, 9, deep(P.ink));
      d.path(leaf(84, 54, 9, -22, 0.5), d.fill(g), { sw: 2.4 });
      const body = oval(60, 59, 29, 17);
      d.path(body, d.fill(g), { sw: 3.5 });
      d.clip(body, (k) => {
        k.ellipse(60, 77, 30, 9, P.ink[1], { stroke: null });
        for (const x of [56, 66, 76]) k.stroke(`M${x} 46 q-2 6 0 12`, { color: g[2], sw: 2, op: 0.5 });
      });
      d.path(body, "none", { sw: 3.5 });
      for (const x of [42, 72]) leg(d, x, 64, 86, 9.5, P.ink);
      d.shine(60, 47, 10, 3, 0.45, -6);
      // A white head with the black band through the eye.
      const head = "M44 44 C33 42 18 48 9 59 C7 61.5 8 65.5 12 66 C22 69 34 76 45 74 C54 72 55 49 44 44 Z";
      d.path(head, d.fill(P.white), { sw: 3.2 });
      d.clip(head, (k) => k.path("M4 57.5 Q24 45 56 50 L56 60 Q28 55.5 4 64 Z", k.fill(P.ink), { stroke: null }));
      d.path(head, "none", { sw: 3.2 });
      d.circle(43.5, 46, 4, d.fill(P.white), { sw: 2.2 });
      d.circle(43.5, 46.5, 1.8, P.rose[1], { stroke: null });
      d.circle(10.5, 62, 3.2, d.fill(P.black), { sw: 1.6 });
      ringEye(d, 27, 54.5, 3.4);
      d.stroke("M14 67 Q18 69.5 22 67.8", { sw: 2 });
      d.cheek(29, 64, 3);
    }),
  ],
  [
    "🦛",
    "hippo",
    place(-0.5, -8, 0.91, (d) => {
      const h: Ramp = [P.white[0], P.violet[0], P.violet[1]];
      d.shadow(56, 90, 34);
      for (const x of [53, 82]) leg(d, x, 66, 88, 11, deep(h));
      d.path(leaf(88, 54, 8, 20, 0.5), d.fill(h), { sw: 2.4 });
      for (const x of [31, 40]) {
        d.circle(x, 36, 4.4, d.fill(h), { sw: 2.4 });
        d.circle(x, 36.5, 2, P.rose[1], { stroke: null });
      }
      union(d, [oval(60, 58, 29, 22), oval(31, 50, 17, 15), oval(21, 61, 14, 11)], oneFill(d, h, 6, 34, 90, 82));
      for (const x of [44, 74]) leg(d, x, 68, 89, 12, h);
      d.shine(60, 42, 10, 3.4, 0.6, -8);
      d.ellipse(11.5, 55, 1.6, 2.3, OL, { stroke: null });
      d.ellipse(17.5, 54, 1.6, 2.3, OL, { stroke: null });
      d.path(rr(14, 64.5, 3.6, 4.4, 1), "#fff", { sw: 1.4 });
      d.path(rr(22, 65.2, 3.6, 4.4, 1), "#fff", { sw: 1.4 });
      d.stroke("M8 63 Q20 68.5 33 63", { sw: 2.2 });
      d.eye(30, 45, 3.8);
      d.cheek(31, 57, 3.6);
      d.shine(26, 40, 4, 2, 0.6, -30);
    }),
  ],
  [
    "🦥",
    "sloth",
    place(0, -1.5, 0.95, (d) => {
      const c = P.wood;
      d.path(rr(8, 12, 84, 8, 4), d.fill(P.brown, "v"), { sw: 3 });
      d.path(leaf(16, 16, 12, 145, 0.45), d.fill(P.green), { sw: 2.2 });
      d.path(leaf(84, 16, 12, 35, 0.45), d.fill(P.green), { sw: 2.2 });
      for (const s of [-1, 1]) {
        d.path(limb([[50 + s * 12, 52], [50 + s * 18, 34], [50 + s * 16, 18]], 9.5, 8.5), d.fill(c), { sw: 2.8 });
        d.stroke(`M${50 + s * 16 - 3.5} 12 q-2.4 4 0.5 8 M${50 + s * 16} 11.5 q-2.4 4 0.5 8 M${50 + s * 16 + 3.5} 12 q-2.4 4 0.5 8`, { sw: 2 });
      }
      for (const s of [-1, 1]) {
        d.path(limb([[50 + s * 9, 76], [50 + s * 13, 86]], 9, 8), d.fill(c), { sw: 2.8 });
        d.stroke(`M${50 + s * 13 - 3} 89 l${s * 1} 2.6 M${50 + s * 13} 89.6 l${s * 1} 2.6 M${50 + s * 13 + 3} 89 l${s * 1} 2.6`, { sw: 1.8 });
      }
      d.path(fluff(50, 63, 19, 21, 14, 0.05), d.fill(c), { sw: 3.5 });
      d.path(oval(50, 55, 14.5, 11.5), d.fill(P.cream), { sw: 2.4 });
      for (const s of [-1, 1]) d.ellipse(50 + s * 8, 54, 6.5, 3.6, d.fill(P.brown), { stroke: null, tf: `rotate(${s * -18} ${50 + s * 8} 54)` });
      ringEye(d, 42, 53.5, 2.6);
      ringEye(d, 58, 53.5, 2.6);
      d.ellipse(50, 58.5, 3.2, 2.4, d.fill(P.black), { sw: 1.6 });
      d.smile(50, 61.5, 7, 2);
      d.cheek(40, 61, 2.8);
      d.cheek(60, 61, 2.8);
      d.shine(39, 45, 4, 2, 0.5, -25);
    }),
  ],
  [
    "🐆",
    "leopard",
    place(-2.5, -5, 0.97, (d) => {
      const y = P.gold;
      const st = P.ink[1];
      const rosette = (k: Pen, x: number, yy: number, r: number) => k.circle(x, yy, r, P.orange[1], { stroke: st, sw: 1.8 });
      d.shadow(58, 90, 33);
      for (const x of [53, 85]) leg(d, x, 62, 88, 9, deep(y));
      const tail = limb([[86, 50], [91, 40], [87, 28]], 7, 5.5);
      d.path(tail, d.fill(y), { sw: 3 });
      d.clip(tail, (k) => {
        k.circle(89, 42, 1.8, st, { stroke: null });
        k.circle(88.5, 34, 1.8, st, { stroke: null });
        k.circle(87, 27, 4.5, st, { stroke: null });
      });
      const body = "M36 53 C36 43 46 39 60 39 C76 39 89 43 89 55 C89 66 80 70 68 70 L50 70 C41 70 36 63 36 53 Z";
      d.path(body, d.fill(y), { sw: 3.5 });
      d.clip(body, (k) => {
        k.ellipse(60, 72, 24, 7, P.cream[1], { stroke: null });
        for (const [x, yy] of [[50, 47], [61, 45], [72, 46], [82, 50], [56, 57], [67, 56], [78, 59], [46, 59]] as Pt[]) rosette(k, x, yy, 3);
      });
      d.path(body, "none", { sw: 3.5 });
      for (const x of [45, 77]) {
        leg(d, x, 64, 89, 9.5, y);
        d.circle(x - 1, 75, 1.6, st, { stroke: null });
        d.circle(x + 1.5, 81, 1.6, st, { stroke: null });
      }
      d.shine(60, 44, 8, 2.6, 0.5, -8);
      for (const x of [17, 39]) {
        d.circle(x, 31, 6.5, d.fill(y), { sw: 2.6 });
        d.circle(x, 31.5, 3.2, P.cream[1], { stroke: null });
      }
      const head = oval(28, 45, 17, 15);
      d.path(head, d.fill(y), { sw: 3.5 });
      d.clip(head, (k) => {
        k.path("M8 50 C18 46 24 48 28 51 C32 48 38 46 48 50 L48 64 L8 64 Z", P.cream[1], { stroke: null });
        for (const [x, yy] of [[22, 34], [28, 32], [34, 34], [14, 44], [42, 44]] as Pt[]) k.circle(x, yy, 1.7, st, { stroke: null });
      });
      d.path(head, "none", { sw: 3.5 });
      muzzle(d, 28, 52.5, 5.4, P.white[1], 2);
      d.path("M25.5 48 Q28 47 30.5 48 Q29.5 50.5 28 51 Q26.5 50.5 25.5 48 Z", d.fill(P.pink), { sw: 1.8 });
      d.eye(21.5, 43, 3.6);
      d.eye(34.5, 43, 3.6);
      d.shine(22, 36, 4, 2, 0.45, -25);
    }),
  ],
  [
    "🦧",
    "orangutan",
    (d) => {
      const f = HAIR.auburn;
      const s = P.tan;
      d.shadow(50, 91, 36);
      for (const k of [-1, 1]) {
        bushy(d, [[50 + k * 18, 46], [50 + k * 28, 62], [50 + k * 30, 80]], 7.5, 6.5, f, 8, 3);
        d.ellipse(50 + k * 30, 85, 6.5, 4.4, d.fill(s), { sw: 2.4 });
      }
      for (const k of [-1, 1]) d.ellipse(50 + k * 11, 85, 8.5, 5, d.fill(f), { sw: 3 });
      d.path(fluff(50, 64, 20, 22, 14, 0.06), d.fill(f), { sw: 3.5 });
      d.path(spiky(50, 34, 15, 15, 205, 335, 5, 0.25, [[50, 34]]), d.fill(f), { sw: 2.6 });
      d.circle(50, 36, 16, d.fill(f), { sw: 3.5 });
      union(d, [oval(50, 38, 11.5, 11), oval(50, 46, 10, 7)], oneFill(d, s, 38, 27, 62, 54), 2.4);
      d.eye(45.5, 36, 3.2);
      d.eye(54.5, 36, 3.2);
      d.ellipse(48, 43, 1.3, 1.9, OL, { stroke: null });
      d.ellipse(52, 43, 1.3, 1.9, OL, { stroke: null });
      d.stroke("M43.5 47.5 Q50 53 56.5 47.5", { sw: 2.2 });
      d.cheek(41, 43, 2.6);
      d.cheek(59, 43, 2.6);
      d.shine(41, 25, 5, 2.4, 0.45, -25);
      d.shine(40, 55, 4, 2, 0.35, -40);
    },
  ],
  [
    "🐃",
    "yak",
    place(-2, -1.5, 0.91, (d) => {
      const c = HAIR.brown;
      d.shadow(58, 90, 33);
      for (const x of [42, 50, 78, 86]) leg(d, x, 66, 88.5, 9, x === 50 || x === 86 ? deep(c) : c, P.ink[1]);
      bushy(d, [[89, 48], [92, 58], [90, 68]], 4.5, 5.5, c, 5, 2.6);
      const fr: Pt[] = [];
      for (let i = 0; i <= 12; i++) fr.push([90 - i * (58 / 12), i % 2 ? 72 : 77.5]);
      const body = `M32 52 C30 37 42 29 56 31 L74 34 C86 34 91 42 91 52 L91 72 ${fr.map((p) => `L${r2(p[0])} ${r2(p[1])}`).join(" ")} L32 70 Z`;
      d.path(body, d.fill(c), { sw: 3.5 });
      d.clip(body, (k) => {
        for (const x of [44, 54, 64, 74, 84]) k.stroke(`M${x} 52 Q${x - 2} 62 ${x} 72`, { color: c[2], sw: 2, op: 0.6 });
      });
      d.shine(54, 37, 9, 3, 0.4, -10);
      d.path(limb([[31, 37], [38, 30], [37, 20], [31, 16]], 6.5, 3.4), d.fill(P.cream), { sw: 2.4 });
      d.path(oval(25, 48, 14, 13), d.fill(c), { sw: 3.5 });
      d.path(limb([[24, 38], [17, 35], [13, 27], [17, 20]], 6.5, 3.4), d.fill(P.cream), { sw: 2.4 });
      d.ellipse(16, 57, 9.5, 7.5, d.fill(P.tan), { sw: 2.8 });
      d.ellipse(12.5, 56, 1.5, 2.3, P.tan[2], { stroke: null });
      d.ellipse(19, 56.5, 1.5, 2.3, P.tan[2], { stroke: null });
      d.path(fluff(26, 40, 9, 5, 8, 0.22), d.fill(deep(c)), { sw: 2.2 });
      ringEye(d, 23, 47, 3.4);
      d.stroke("M12.5 61 Q16 63 19.5 61", { sw: 2 });
    }),
  ],
];

