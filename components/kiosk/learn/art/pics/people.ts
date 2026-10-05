// People, families, jobs, actions, hands and body parts — all built from the shared cast in
// ../people.ts so every person looks like they belong to the same story.

import { HAIR, OL, P, SKIN, drop, heart, lumpy, rr, star, type Pen, type Ramp } from "../pen";
import { CAST, MOODS, bust, figure, head, type Look, type Pose } from "../people";
import type { PicDef } from "..";

// ── Local helpers ──────────────────────────────────────────────────────────────────────────────
const rad = (a: number) => (a * Math.PI) / 180;
const f2 = (n: number) => Math.round(n * 100) / 100;
type XY = [number, number];
type Frame = { p: (x: number, y: number) => string; xy: (x: number, y: number) => XY };

/** A local frame: origin (x0, y0), scale s, rotated `deg`, optionally mirrored. Points are mapped
 *  onto the board, so outlines keep their width and the light still comes from the top-left. */
function frame(x0: number, y0: number, s: number, deg = 0, mirror = false): Frame {
  const c = Math.cos(rad(deg));
  const sn = Math.sin(rad(deg));
  const xy = (x: number, y: number): XY => {
    const lx = (mirror ? -x : x) * s;
    const ly = y * s;
    return [x0 + lx * c - ly * sn, y0 + lx * sn + ly * c];
  };
  return { xy, p: (x, y) => xy(x, y).map(f2).join(" ") };
}
/** A capsule from a to b, `w` wide — one straight finger. */
function cap(a: XY, b: XY, w: number) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const nx = (-(b[1] - a[1]) / L) * (w / 2);
  const ny = ((b[0] - a[0]) / L) * (w / 2);
  const r = f2(w / 2);
  return `M${f2(a[0] + nx)} ${f2(a[1] + ny)} L${f2(b[0] + nx)} ${f2(b[1] + ny)} A${r} ${r} 0 0 0 ${f2(b[0] - nx)} ${f2(b[1] - ny)} L${f2(a[0] - nx)} ${f2(a[1] - ny)} A${r} ${r} 0 0 0 ${f2(a[0] + nx)} ${f2(a[1] + ny)} Z`;
}
/** A rounded rectangle in a local frame. */
function rrF(F: Frame, x: number, y: number, w: number, h: number, r: number) {
  const p = F.p;
  return `M${p(x + r, y)} L${p(x + w - r, y)} Q${p(x + w, y)} ${p(x + w, y + r)} L${p(x + w, y + h - r)} Q${p(x + w, y + h)} ${p(x + w - r, y + h)} L${p(x + r, y + h)} Q${p(x, y + h)} ${p(x, y + h - r)} L${p(x, y + r)} Q${p(x, y)} ${p(x + r, y)} Z`;
}
/** One finger from a to b; `nail` shows its nail (the back of the hand), `polish` paints it. */
function finger(d: Pen, a: XY, b: XY, w: number, skin: Ramp, sw: number, nail = false, polish?: Ramp) {
  d.path(cap(a, b, w), d.fill(skin), { sw });
  if (nail) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const ux = (b[0] - a[0]) / L;
    const uy = (b[1] - a[1]) / L;
    const k = polish ? 0.36 : 0.3;
    const nx = b[0] - ux * w * k;
    const ny = b[1] - uy * w * k;
    const tf = `rotate(${f2((Math.atan2(uy, ux) * 180) / Math.PI)} ${f2(nx)} ${f2(ny)})`;
    if (polish) {
      d.ellipse(nx, ny, w * 0.36, w * 0.3, d.fill(polish), { sw: Math.max(1.4, sw * 0.6), tf });
      d.circle(nx - w * 0.1, ny - w * 0.1, w * 0.08, "#fff", { stroke: null, op: 0.8 });
    } else d.ellipse(nx, ny, w * 0.3, w * 0.24, "#ffeef2", { sw: Math.max(1.4, sw * 0.55), stroke: skin[2], tf });
  }
}
/** An open hand, palm toward us (or its back with `back`), fingers up in its frame. Thumb on the
 *  left unless mirrored. `spread` fans the fingers (1 = together, 4 = wide). */
function openHand(d: Pen, x: number, y: number, s: number, deg = 0, o: { skin?: number; spread?: number; mirror?: boolean; back?: boolean; sleeve?: Ramp | null; thumb?: number; polish?: Ramp } = {}) {
  const skin = SKIN[o.skin ?? 1];
  const F = frame(x, y, s, deg, o.mirror);
  const { p, xy } = F;
  const sw = Math.max(2.2, Math.min(3.2, s * 0.15));
  const k = o.spread ?? 1;
  const ta = rad(o.thumb ?? -148);
  finger(d, xy(-0.68, 0.42), xy(-0.68 + Math.cos(ta) * 1.12, 0.42 + Math.sin(ta) * 1.12), 0.56 * s, skin, sw, o.back, o.polish);
  const fx = [-0.69, -0.23, 0.23, 0.69];
  const len = [1.45, 1.62, 1.52, 1.2];
  const fan = [-5, -1.7, 1.7, 5];
  fx.forEach((bx, i) => {
    const a = rad(-90 + fan[i] * k);
    const b: XY = [bx * (1 + (k - 1) * 0.06), -0.42];
    finger(d, xy(b[0], b[1]), xy(b[0] + Math.cos(a) * len[i], b[1] + Math.sin(a) * len[i]), 0.47 * s, skin, sw, o.back, o.polish);
  });
  d.path(`M${p(-0.92, -0.58)} C${p(-0.5, -0.8)} ${p(0.5, -0.8)} ${p(0.92, -0.6)} C${p(1.02, 0)} ${p(0.94, 0.72)} ${p(0.64, 1.08)} L${p(-0.64, 1.08)} C${p(-0.92, 0.78)} ${p(-1.02, 0.2)} ${p(-0.92, -0.58)} Z`, d.fill(skin), { sw });
  if (o.back) {
    for (const bx of [-0.46, 0, 0.46]) d.stroke(`M${p(bx - 0.1, -0.42)} Q${p(bx, -0.34)} ${p(bx + 0.1, -0.42)}`, { sw: sw * 0.7, color: skin[2] });
  } else {
    d.stroke(`M${p(-0.5, 0.62)} Q${p(-0.62, 0.05)} ${p(-0.2, -0.22)}`, { sw: sw * 0.75, color: skin[2] });
    d.stroke(`M${p(-0.15, 0.1)} Q${p(0.3, 0.02)} ${p(0.62, -0.25)}`, { sw: sw * 0.75, color: skin[2] });
  }
  if (o.sleeve !== null) d.path(rrF(F, -0.86, 0.98, 1.72, 0.62, 0.22), d.fill(o.sleeve ?? P.sky, "v"), { sw });
  const sh = xy(-0.45, -0.3);
  d.shine(sh[0], sh[1], s * 0.2, s * 0.1, 0.45, deg - 30);
}
/** A thumbs-up fist (or thumbs-down with `down`): thumb up top, curled fingers stacked on the
 *  front, cuff at the wrist. Centered near (cx, cy). */
function thumbHand(d: Pen, cx: number, cy: number, down: boolean, skinI: number, sleeve: Ramp) {
  const skin = SKIN[skinI];
  const F = frame(cx, cy, 1, down ? 180 : 0, down);
  const sw = 3.2;
  finger(d, F.xy(-6, 0), F.xy(-6, -31), 18, skin, sw, true);
  for (const [y, x1] of [[-5, 27], [6.5, 28], [18, 26], [29, 21]] as const) finger(d, F.xy(0, y), F.xy(x1, y), 11.5, skin, sw);
  d.path(rrF(F, -26, -12, 36, 47, 14), d.fill(skin), { sw });
  d.stroke(`M${F.p(-6, 2)} Q${F.p(2, 8)} ${F.p(10, 4)}`, { sw: 2.4, color: skin[2] });
  d.path(rrF(F, -27, 31, 31, 13, 5), d.fill(sleeve, "v"), { sw });
  const sh = F.xy(-16, down ? 22 : -2);
  d.shine(sh[0], sh[1], 5, 8, 0.45, -20);
}
/** A pointing hand seen from the back: index straight out, thumb on top, the other fingers
 *  curled below. Points right in its frame; turn it with `deg`, flip with `mirror`. */
function pointHand(d: Pen, cx: number, cy: number, s: number, deg: number, mirror: boolean, skinI: number, sleeve: Ramp = P.sky) {
  const skin = SKIN[skinI];
  const F = frame(cx, cy, s, deg, mirror);
  const sw = 3.2;
  finger(d, F.xy(-2, -9), F.xy(40, -9), 13 * s, skin, sw, true);
  for (const [y, x1] of [[3, 14], [12.5, 12.5], [21.5, 9]] as const) finger(d, F.xy(-6, y), F.xy(x1, y), 10 * s, skin, sw);
  d.path(rrF(F, -30, -17, 36, 42, 14), d.fill(skin), { sw });
  for (const y of [-3, 7, 16.5]) d.stroke(`M${F.p(-10, y)} Q${F.p(-5, y + 2)} ${F.p(0, y)}`, { sw: 2.2, color: skin[2] });
  finger(d, F.xy(-17, -14), F.xy(7, -21), 11.5 * s, skin, sw, true);
  d.path(rrF(F, -44, -16, 15, 36, 5), d.fill(sleeve, "v"), { sw });
  const sh = F.xy(-20, 0);
  d.shine(sh[0], sh[1], 6 * s, 3.5 * s, 0.45, -25);
}
/** A footprint (sole and five toes), toes up, centered at (cx, cy); `left` for a left foot. */
function footprint(d: Pen, cx: number, cy: number, s: number, deg: number, left: boolean, ramp: Ramp) {
  const F = frame(cx, cy, s, deg, left);
  const p = F.p;
  d.path(`M${p(0, -16)} C${p(10, -16)} ${p(12, -4)} ${p(9, 4)} C${p(7, 10)} ${p(9, 15)} ${p(8, 20)} C${p(6, 27)} ${p(-6, 27)} ${p(-7, 20)} C${p(-8, 14)} ${p(-4, 8)} ${p(-6, 2)} C${p(-9, -6)} ${p(-9, -16)} ${p(0, -16)} Z`, d.fill(ramp), { sw: 2.8 });
  for (const [x, y, r] of [[-4, -23, 4.6], [3.4, -24.4, 3.3], [8.2, -22.2, 2.9], [11.6, -18.6, 2.5], [13.6, -14, 2.2]] as const) {
    const c = F.xy(x, y);
    d.circle(c[0], c[1], r * s, d.fill(ramp), { sw: 2.4 });
  }
}
/** A small palm-up hand for shrugs: fingers pointing out to the side (`dir` −1 left, 1 right). */
function palmUp(d: Pen, x: number, y: number, s: number, dir: number, skin: Ramp, deg = 0) {
  const F = frame(x, y, s, dir < 0 ? -deg : deg, dir < 0);
  const p = F.p;
  finger(d, F.xy(-2, -2), F.xy(-5, -9), 4.6 * s, skin, 2.6);
  d.path(`M${p(-6, 0)} Q${p(-6, -4)} ${p(0, -4)} L${p(8, -4)} Q${p(11, -4)} ${p(11, -1)} Q${p(11, 2)} ${p(8, 2)} L${p(2, 3)} Q${p(-6, 5)} ${p(-6, 0)} Z`, d.fill(skin), { sw: 2.6 });
}
/** The back of a head (hair all over, ears showing) — to turn a figure around. */
function backOfHead(d: Pen, cx: number, cy: number, r: number, skinI: number, hair: Ramp) {
  const skin = SKIN[skinI];
  for (const s of [-1, 1]) d.circle(cx + s * r * 0.96, cy + r * 0.12, r * 0.2, d.fill(skin), { sw: Math.max(2, r * 0.09) });
  d.circle(cx, cy, r * 1.04, d.fill(hair, "v"), { sw: Math.max(2.2, r * 0.1) });
  d.stroke(`M${f2(cx - r * 0.3)} ${f2(cy - r * 0.6)} Q${f2(cx)} ${f2(cy - r * 0.2)} ${f2(cx + r * 0.1)} ${f2(cy + r * 0.5)}`, { sw: Math.max(1.6, r * 0.07), color: hair[2] });
  d.shine(cx - r * 0.4, cy - r * 0.55, r * 0.3, r * 0.12, 0.4);
}
/** Open scissors: pivot at (x, y), blades pointing at `deg` (SVG degrees). */
function scissors(d: Pen, x: number, y: number, s: number, deg: number) {
  const bl = (a: number) => {
    const t = rad(a);
    const tx = x + Math.cos(t) * 21 * s;
    const ty = y + Math.sin(t) * 21 * s;
    const nx = -Math.sin(t) * 3.6 * s;
    const ny = Math.cos(t) * 3.6 * s;
    return `M${f2(x + nx)} ${f2(y + ny)} Q${f2((x + tx) / 2 + nx)} ${f2((y + ty) / 2 + ny)} ${f2(tx)} ${f2(ty)} Q${f2((x + tx) / 2 - nx * 0.4)} ${f2((y + ty) / 2 - ny * 0.4)} ${f2(x - nx)} ${f2(y - ny)} Z`;
  };
  for (const k of [-1, 1]) {
    const a = rad(deg + 180 + k * 22);
    const rx = x + Math.cos(a) * 10 * s;
    const ry = y + Math.sin(a) * 10 * s;
    d.tube(`M${f2(x)} ${f2(y)} L${f2(rx)} ${f2(ry)}`, P.red[1], 3.4 * s, 2.2);
    d.circle(rx, ry, 4.6 * s, "none", { sw: 3.4 * s + 4.4, stroke: OL });
    d.circle(rx, ry, 4.6 * s, "none", { sw: 3.4 * s, stroke: P.red[1] });
  }
  for (const k of [-1, 1]) d.path(bl(deg + k * 11), d.fill(P.silver), { sw: 2.4 });
  d.circle(x, y, 2.2 * s, d.fill(P.steel), { sw: 1.8 });
}
/** A tall fuzzy guard's hat. */
const lumpyHat = (cx: number, cy: number, rx: number, ry: number) => lumpy(cx, cy, rx, ry, 16, 0.045, 5);
/** A music note (♪) for dancing. */
function note(d: Pen, x: number, y: number, s: number, color: Ramp = P.violet) {
  d.stroke(`M${f2(x + s * 0.55)} ${f2(y)} L${f2(x + s * 0.55)} ${f2(y - s * 2.1)} Q${f2(x + s * 1.3)} ${f2(y - s * 1.7)} ${f2(x + s * 1.5)} ${f2(y - s * 1.1)}`, { sw: Math.max(2, s * 0.36) });
  d.ellipse(x, y, s * 0.68, s * 0.52, d.fill(color), { sw: Math.max(1.8, s * 0.28), tf: `rotate(-20 ${f2(x)} ${f2(y)})` });
}
/** Little lines bursting out around a point (claps, cheers, pops). */
function burst(d: Pen, cx: number, cy: number, r0: number, r1: number, angles: number[], color: string = P.gold[2], sw = 3.2) {
  for (const a of angles) d.stroke(`M${f2(cx + Math.cos(rad(a)) * r0)} ${f2(cy + Math.sin(rad(a)) * r0)} L${f2(cx + Math.cos(rad(a)) * r1)} ${f2(cy + Math.sin(rad(a)) * r1)}`, { sw, color });
}
/** Speed lines trailing behind something moving right. */
function speed(d: Pen, lines: [number, number, number][], color: string = P.steel[1]) {
  for (const [y, x0, x1] of lines) d.stroke(`M${x0} ${y} H${x1}`, { sw: 3.4, color });
}
/** A head seen from the side, facing right: hair, ear, eye, button nose; `mouth` open or a smile. */
function sideHead(d: Pen, cx: number, cy: number, r: number, look: Look, mouth: "open" | "smile" | "closed" = "smile", eye: "dot" | "closed" = "dot", deg = 0) {
  const skin = SKIN[look.skin ?? 1];
  const hair = look.hairColor ?? HAIR.brown;
  const F = frame(cx, cy, r, deg);
  const { p } = F;
  const sw = Math.max(2.4, r * 0.1);
  // Face and button nose in one outline.
  d.path(`M${p(0.99, -0.14)} Q${p(1.3, 0.0)} ${p(1.26, 0.18)} Q${p(1.2, 0.33)} ${p(0.96, 0.29)} A${f2(r)} ${f2(r)} 0 1 1 ${p(0.99, -0.14)} Z`, d.fill(skin), { sw });
  // Hair over the top and back.
  d.path(`M${p(0.72, -0.62)} Q${p(0.5, -1.16)} ${p(-0.15, -1.08)} Q${p(-1.12, -0.92)} ${p(-1.06, 0.12)} Q${p(-1.02, 0.5)} ${p(-0.74, 0.7)} Q${p(-0.62, 0.3)} ${p(-0.34, 0.12)} Q${p(-0.3, -0.36)} ${p(0.1, -0.5)} Q${p(0.44, -0.56)} ${p(0.72, -0.62)} Z`, d.fill(hair, "v"), { sw });
  const hs = F.xy(-0.25, -0.78);
  d.shine(hs[0], hs[1], r * 0.26, r * 0.09, 0.4, deg - 10);
  // Ear.
  const ear = F.xy(-0.08, 0.1);
  d.ellipse(ear[0], ear[1], r * 0.19, r * 0.25, d.fill(skin), { sw: sw * 0.85, tf: `rotate(${deg} ${f2(ear[0])} ${f2(ear[1])})` });
  d.stroke(`M${p(-0.04, 0.0)} Q${p(-0.16, 0.08)} ${p(-0.06, 0.22)}`, { sw: sw * 0.6, color: skin[2] });
  // Eye, brow, cheek.
  const e = F.xy(0.55, -0.06);
  if (eye === "dot") d.eye(e[0], e[1], r * 0.14);
  else d.stroke(`M${p(0.44, -0.06)} Q${p(0.55, 0.06)} ${p(0.66, -0.06)}`, { sw: sw * 0.85 });
  d.stroke(`M${p(0.42, -0.34)} Q${p(0.56, -0.42)} ${p(0.7, -0.33)}`, { sw: sw * 0.8 });
  const ch = F.xy(0.5, 0.32);
  d.cheek(ch[0], ch[1], r * 0.15);
  if (mouth === "open") d.path(`M${p(0.62, 0.5)} Q${p(0.78, 0.44)} ${p(0.9, 0.5)} Q${p(0.86, 0.72)} ${p(0.72, 0.7)} Q${p(0.62, 0.66)} ${p(0.62, 0.5)} Z`, "#7a2a3a", { sw: sw * 0.75 });
  else if (mouth === "smile") d.stroke(`M${p(0.6, 0.52)} Q${p(0.76, 0.64)} ${p(0.88, 0.5)}`, { sw: sw * 0.85 });
  else d.stroke(`M${p(0.64, 0.56)} L${p(0.86, 0.54)}`, { sw: sw * 0.85 });
}
/** Where figure() puts the head (same proportions as ../people.ts), before any lean. */
function figHead(foot: number, h: number, adult = false) {
  const r = h * (adult ? 0.15 : 0.19);
  const hipY = foot - h * (adult ? 0.4 : 0.33);
  const shY = hipY - h * (adult ? 0.3 : 0.27) + h * 0.085 * 0.6;
  return { cy: shY - r * 0.92, r, shY, hipY, limbW: h * 0.085 };
}
/** Where a two-part limb ends, using figure()'s angles (0 = down, + toward the right). */
function limbEnd(x: number, y: number, [a1, a2]: [number, number], L: number): XY {
  return [x + Math.sin(rad(a1)) * L + Math.sin(rad(a2)) * L, y + Math.cos(rad(a1)) * L + Math.cos(rad(a2)) * L];
}
/** figure() angles for a two-part limb from (x0, y0) reaching (x1, y1); `bend` picks the side the
 *  joint bends to (1 or −1). */
function reach(x0: number, y0: number, x1: number, y1: number, L: number, bend = 1): [number, number] {
  const D = Math.min(Math.hypot(x1 - x0, y1 - y0), L * 1.998);
  const phi = (Math.atan2(x1 - x0, y1 - y0) * 180) / Math.PI;
  const al = (Math.acos(D / (2 * L)) * 180) / Math.PI;
  return [phi + bend * al, phi - bend * al];
}
/** An astronaut's helmet around a head at (cx, cy) radius r: draw `inside` (the head) between the
 *  shell and the glass. */
function helmet(d: Pen, cx: number, cy: number, r: number, inside: () => void) {
  const R = r * 1.5;
  d.circle(cx, cy, R, d.fill(P.white), { sw: 3.2 });
  inside();
  const vx = r * 1.12;
  const vy = r * 1.08;
  const vcy = cy + r * 0.12;
  d.ellipse(cx, vcy, vx, vy, "rgba(150,210,255,0.28)", { stroke: null });
  // The shell's front: a ring around the visor window.
  d.path(`M${f2(cx - R)} ${f2(cy)} A${f2(R)} ${f2(R)} 0 1 1 ${f2(cx + R)} ${f2(cy)} A${f2(R)} ${f2(R)} 0 1 1 ${f2(cx - R)} ${f2(cy)} Z M${f2(cx - vx)} ${f2(vcy)} A${f2(vx)} ${f2(vy)} 0 1 0 ${f2(cx + vx)} ${f2(vcy)} A${f2(vx)} ${f2(vy)} 0 1 0 ${f2(cx - vx)} ${f2(vcy)} Z`, d.fill(P.white), { sw: 3.2 });
  d.ellipse(cx, vcy, vx, vy, "none", { sw: 2.6, stroke: P.steel[2] });
  d.stroke(`M${f2(cx - vx * 0.75)} ${f2(vcy - vy * 0.45)} Q${f2(cx - vx * 0.4)} ${f2(vcy - vy * 0.85)} ${f2(cx + vx * 0.05)} ${f2(vcy - vy * 0.88)}`, { sw: 3.4, color: "#ffffff", op: 0.85 });
  d.shine(cx - R * 0.55, cy - R * 0.62, R * 0.2, R * 0.09, 0.9);
  d.circle(cx + R * 0.86, cy + R * 0.1, r * 0.16, d.fill(P.red), { sw: 2 });
}
/** A raised fist (palm side): curled fingers across the top, the thumb over them. */
function fist(d: Pen, cx: number, cy: number, s: number, skin: Ramp) {
  const x0 = cx - 27 * s;
  const y0 = cy - 26 * s;
  d.path(rr(x0, y0, 54 * s, 52 * s, 17 * s), d.fill(skin), { sw: 3.4 });
  for (let i = 0; i < 4; i++) d.path(rr(x0 + 1.5 * s + i * 12.75 * s, y0 + 2 * s, 12.75 * s, 28 * s, 6.3 * s), d.fill(skin), { sw: 2.6 });
  finger(d, [x0 + 8 * s, y0 + 37 * s], [x0 + 39 * s, y0 + 31 * s], 13 * s, skin, 3);
  d.shine(x0 + 8 * s, y0 + 9 * s, 3 * s, 6 * s, 0.55, 0);
}
/** Pose angles (0 = straight down, + toward the right of the picture), for figure(). */
const pose = (armB: [number, number], armF: [number, number], legB: [number, number] = [6, 0], legF: [number, number] = [-6, 0], lean = 0): Pose => ({ armB, armF, legB, legF, lean });

export const PEOPLE: PicDef[] = [
  ["🧒", "child", (d) => bust(d, 50, 40, 25, CAST.kid, MOODS.happy)],
  ["👦", "boy", (d) => bust(d, 50, 40, 25, CAST.boy, MOODS.happy)],
  ["👧", "girl", (d) => bust(d, 50, 41, 25, CAST.girl, MOODS.happy)],
  ["🧔", "man with a beard", (d) => bust(d, 50, 38, 25, CAST.bearded, MOODS.happy, 98, "robe")],
  [
    "🙏",
    "praying hands",
    (d) => {
      const skin = SKIN[2];
      // Soft light behind the hands.
      d.glow(50, 44, 44, "#fff3b0", 0.55);
      for (const side of [1, -1]) {
        const draw = (g: typeof d) => {
          // One hand seen from the side, its inner edge pressed flat against the other at x = 50:
          // fingers together on top (each tip a little bump), the palm swelling below.
          g.path("M50 10 Q56 9 58 15 Q63 15 64 22 Q68 24 68 32 L69 52 Q75 60 73 72 L70 86 L50 86 Z", g.fill(skin), { sw: 3 });
          g.stroke("M58 16 Q60 30 61 46 M64 23 Q66 36 66 50", { sw: 2, color: skin[2] });
          // The thumb, standing up along the front edge.
          g.path("M50 47 Q57 46 58 53 L58 66 Q57 71 50 71 Z", g.fill(skin), { sw: 2.6 });
          // Sleeve.
          g.path(rr(48, 80, 27, 16, 6), g.fill(P.sky, "v"), { sw: 3 });
        };
        if (side > 0) draw(d);
        else d.mirror(50, draw);
      }
      d.stroke("M50 12 V86", { sw: 3 });
      // Little rays of light.
      for (const [x1, y1, x2, y2] of [[28, 18, 22, 12], [72, 18, 78, 12], [24, 34, 16, 32], [76, 34, 84, 32]]) d.stroke(`M${x1} ${y1} L${x2} ${y2}`, { sw: 3, color: P.gold[2] });
    },
  ],
  [
    "👀",
    "eyes",
    (d) => {
      for (const [cx, px] of [[32, 24.5], [68, 60.5]]) {
        const ball = `M${cx - 18} 52 A18 27 0 1 1 ${cx + 18} 52 A18 27 0 1 1 ${cx - 18} 52 Z`;
        d.path(ball, d.fill(P.white), { sw: 3.6 });
        d.clip(ball, (c) => {
          c.circle(px, 57, 11.5, c.fill(P.ink), { sw: 2.4 });
          c.circle(px - 4, 52, 4.4, "#fff", { stroke: null });
          c.circle(px + 4, 62, 2, "#fff", { stroke: null, op: 0.9 });
        });
        d.path(ball, "none", { sw: 3.6 });
      }
    },
  ],
  [
    "🗣️",
    "talking",
    (d) => {
      const look: Look = { skin: 3, hairColor: HAIR.black };
      d.rect(26, 66, 15, 16, 4, SKIN[3][1], { sw: 3 });
      d.path("M6 98 Q6 80 24 76 Q34 80 44 76 Q62 80 62 98 Z", d.fill(P.teal, "v"), { sw: 3 });
      sideHead(d, 34, 45, 26, look, "open");
      for (const [r, a] of [[11, 30], [19, 34], [27, 36]]) {
        const cx = 60;
        const cy = 60;
        d.stroke(`M${f2(cx + Math.cos(rad(-a)) * r)} ${f2(cy + Math.sin(rad(-a)) * r)} A${r} ${r} 0 0 1 ${f2(cx + Math.cos(rad(a)) * r)} ${f2(cy + Math.sin(rad(a)) * r)}`, { sw: 4, color: P.sky[2] });
      }
    },
  ],
  [
    "👂",
    "ear",
    (d) => {
      const skin = SKIN[1];
      const ear = "M30 34 C30 14 48 6 62 9 C80 13 88 30 83 48 C80 60 72 64 68 72 C64 82 62 90 52 92 C42 94 36 86 38 79 C40 72 44 70 42 62 C40 56 30 50 30 34 Z";
      d.path(ear, d.fill(skin), { sw: 3.5 });
      // The rim folding in, the bowl and the little flap.
      d.path("M42 30 C44 20 56 16 64 19 C74 23 76 36 72 46 C69 54 62 56 60 62 C58 68 52 70 50 64 C48 58 56 52 58 46 C60 38 56 30 50 31 C47 32 45 34 42 30 Z", skin[2], { stroke: null, op: 0.55 });
      d.stroke("M42 30 C44 20 56 16 64 19 C74 23 76 36 72 46 C69 54 62 56 60 62", { sw: 2.6, color: skin[2] });
      d.path("M46 52 C50 48 54 52 52 58 C50 62 46 60 46 52 Z", d.fill(skin), { sw: 2.2 });
      d.shine(44, 18, 7, 3.5, 0.5, -30);
    },
  ],
  [
    "🤝",
    "handshake",
    (d) => {
      const A = SKIN[1];
      const B = SKIN[3];
      // The left arm and hand, behind.
      d.tube("M20 80 L36 62", A[1], 22, 3.2);
      d.path("M27 58 C29 43 43 32 57 31 C69 30 75 38 73 48 L67 72 C55 78 41 80 29 76 Z", d.fill(A), { sw: 3.2 });
      d.path(rr(8, 70, 30, 18, 7), d.fill(P.blue, "v"), { sw: 3.2, tf: "rotate(42 23 79)" });
      // The right arm and hand, in front: its fingers wrap down over the left hand.
      d.tube("M80 80 L63 62", B[1], 22, 3.2);
      d.path("M73 42 L73 72 C63 79 54 79 46 77 C39 76 38 69 43 68 C36 67 35 59 41 58.5 C34 57 34 49 40 48.5 C35 47 37 39 44 40 C52 39 62 35 73 42 Z", d.fill(B), { sw: 3.2 });
      d.stroke("M43 68 L55 67 M41 58.5 L54 58 M40 48.5 L53 48.5", { sw: 2.4, color: B[2] });
      d.shine(55, 45, 6, 2.4, 0.45, -8);
      d.path(rr(62, 70, 30, 18, 7), d.fill(P.orange, "v"), { sw: 3.2, tf: "rotate(-42 77 79)" });
      // The left hand's thumb hooks over the top.
      d.tube("M33 47 Q45 31 63 34", A[1], 10.5, 3.2);
    },
  ],
  ["🧑", "person", (d) => bust(d, 50, 40, 25, { skin: 4, hair: "curly", hairColor: HAIR.black, shirt: P.gold }, MOODS.happy, 98, "v")],
  ["✋", "raised hand", (d) => openHand(d, 57, 58, 21, 0, { skin: 1 })],
  [
    "🏃",
    "running",
    (d) => {
      speed(d, [[40, 6, 22], [52, 2, 18], [64, 8, 20]]);
      d.shadow(52, 92, 24);
      figure(d, 54, 90, 86, { skin: 3, hair: "curly", hairColor: HAIR.black, shirt: P.orange }, pose([-55, 10], [45, 135], [-40, -100], [75, 5], 10), MOODS.joy, { pants: P.blue });
    },
  ],
  [
    "🧑‍🤝‍🧑",
    "friends",
    (d) => {
      d.shadow(50, 93, 40);
      figure(d, 31, 92, 80, { skin: 4, hair: "puffs", hairColor: HAIR.black, shirt: P.violet }, pose([-140, -165], [25, 25]), MOODS.joy, { pants: P.navy });
      figure(d, 69, 92, 80, { skin: 0, hair: "short", hairColor: HAIR.red, shirt: P.lime }, pose([-25, -25], [12, 6]), MOODS.happy, { pants: P.blue });
    },
  ],
  [
    "🦴",
    "bone",
    (d) => {
      const bone = "M34.8 42 L65.2 42 A11 11 0 1 1 80.6 50 A11 11 0 1 1 65.2 58 L34.8 58 A11 11 0 1 1 19.4 50 A11 11 0 1 1 34.8 42 Z";
      d.g("translate(50 52) rotate(-32) scale(1.14) translate(-50 -50)", (g) => {
        g.path(bone, g.fill(P.cream), { sw: 3.2 });
        g.stroke("M34 54 L66 54", { sw: 2.4, color: P.cream[2] });
        g.shine(48, 46.5, 12, 2.2, 0.9, 0);
      });
    },
  ],
  [
    "💪",
    "strong arm",
    (d) => {
      const skin = SKIN[2];
      // Upper arm with a big muscle, bending up into the forearm.
      d.path("M12 62 C16 38 48 28 58 50 L61 38 L83 37 C87 56 89 74 83 84 Q78 92 66 90 L12 90 Z", d.fill(skin), { sw: 3.5 });
      d.stroke("M58 50 Q54 58 46 61", { sw: 2.4, color: skin[2] });
      // The fist on top: curled fingers facing left, the thumb wrapped over them.
      d.path("M60 40 L60 18 Q60 8 72 8 L80 8 Q90 8 90 20 L88 34 Q86 42 76 42 Z", d.fill(skin), { sw: 3.2 });
      for (const y of [14, 22.5, 31]) finger(d, [70, y], [55, y], 9, skin, 2.8);
      finger(d, [78, 38], [62, 30], 9, skin, 2.8);
      // T-shirt sleeve.
      d.path("M4 56 L26 52 Q34 72 28 93 L4 95 Z", d.fill(P.red, "v"), { sw: 3.2 });
      d.shine(34, 44, 8, 3.5, 0.55, -25);
      burst(d, 38, 36, 12, 19, [-150, -110, -70]);
    },
  ],
  [
    "👶",
    "baby",
    (d) => {
      d.path("M16 99 Q16 76 36 71 Q50 76 64 71 Q84 76 84 99 Z", d.fill(P.sky, "v"), { sw: 3 });
      d.path("M33 70 Q50 98 67 70 Q50 76 33 70 Z", d.fill(P.white), { sw: 2.6 });
      head(d, 50, 44, 29, CAST.baby, { eyes: "dot", brows: "none", mouth: "none", extras: ["blush"] });
      for (const s of [-1, 1]) d.cheek(50 + s * 17, 56, 6);
      // A pacifier.
      d.ellipse(50, 61, 9, 6, d.fill(P.sky), { sw: 2.6 });
      d.circle(50, 64, 4.6, "none", { sw: 5.6, stroke: OL });
      d.circle(50, 64, 4.6, "none", { sw: 2.6, stroke: P.gold[1] });
      d.circle(50, 60, 2.2, P.sky[2], { stroke: null });
    },
  ],
  [
    "🚶",
    "walking",
    (d) => {
      d.shadow(50, 92, 22);
      figure(d, 50, 90, 86, { skin: 1, hair: "short", hairColor: HAIR.brown, shirt: P.green }, pose([-28, -20], [26, 12], [-22, -6], [24, 4], 3), MOODS.happy, { pants: P.navy });
    },
  ],
  [
    "🙌",
    "raised hands",
    (d) => {
      openHand(d, 29, 52, 15.5, -16, { skin: 2, mirror: true, thumb: -125 });
      openHand(d, 71, 52, 15.5, 16, { skin: 2, thumb: -125 });
      burst(d, 50, 22, 6, 13, [-90]);
      burst(d, 50, 20, 9, 15, [-135, -45]);
    },
  ],
  [
    "🧠",
    "brain",
    (d) => {
      const pts: XY[] = [[14, 58], [10, 42], [16, 27], [29, 16], [46, 11], [64, 12], [79, 20], [89, 34], [90, 50], [84, 62], [71, 66], [58, 66], [47, 72], [33, 71], [21, 67]];
      let s = `M${pts[0][0]} ${pts[0][1]}`;
      pts.forEach((a, i) => {
        const b = pts[(i + 1) % pts.length];
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const k = 0.28;
        s += ` Q${f2((a[0] + b[0]) / 2 + ((b[1] - a[1]) / L) * L * k)} ${f2((a[1] + b[1]) / 2 - ((b[0] - a[0]) / L) * L * k)} ${b[0]} ${b[1]}`;
      });
      s += " Z";
      d.tube("M58 72 Q60 82 56 92", P.rose[1], 9, 3);
      const cb = "M54 72 Q58 62 72 64 Q86 66 84 76 Q80 86 66 84 Q56 82 54 72 Z";
      d.path(cb, d.fill(P.rose), { sw: 3 });
      d.clip(cb, (c) => {
        for (const y of [70, 76, 81]) c.stroke(`M52 ${y} Q70 ${y - 4} 88 ${y}`, { sw: 2, color: P.rose[2] });
      });
      d.path(s, d.fill(P.rose), { sw: 3.5 });
      for (const l of ["M22 40 Q28 32 36 36 Q42 40 48 33", "M18 54 Q26 48 32 54 Q38 60 46 52", "M50 22 Q54 30 62 26 Q70 22 74 30", "M54 44 Q60 36 68 42 Q74 48 82 42", "M38 22 Q36 28 40 30", "M58 58 Q64 52 72 56", "M28 62 Q36 60 40 64"]) d.stroke(l, { sw: 2.6, color: P.rose[2] });
      d.shine(30, 24, 9, 4, 0.55, -25);
    },
  ],
  ["👩", "woman", (d) => bust(d, 50, 40, 25, CAST.woman, MOODS.happy)],
  [
    "👃",
    "nose",
    (d) => {
      const skin = SKIN[2];
      d.path("M44 8 C52 8 56 14 57 24 L64 50 C78 54 84 72 72 82 C67 86 61 85 57 82 C52 88 40 90 32 85 C23 79 25 66 34 61 C38 48 38 30 36 18 C36 12 39 8 44 8 Z", d.fill(skin), { sw: 3.5 });
      d.stroke("M35 63 C44 59 52 66 50 77", { sw: 2.6, color: skin[2] });
      d.ellipse(59, 80, 5.5, 3, OL, { stroke: null, tf: "rotate(-12 59 80)" });
      d.shine(49, 28, 3.5, 11, 0.5, -15);
      d.shine(69, 63, 5, 3, 0.55, -30);
    },
  ],
  [
    "🦶",
    "foot",
    (d) => {
      const skin = SKIN[1];
      // The smaller toes peek out behind the big toe.
      for (const [x, y, r] of [[71, 65, 5.2], [77, 68, 5.6]]) d.circle(x, y, r, d.fill(skin), { sw: 2.6 });
      d.path("M30 22 L54 22 L56 50 C63 57 72 63 82 68 C92 71 95 86 86 88 L30 88 C17 88 13 77 18 68 C23 60 30 55 30 22 Z", d.fill(skin), { sw: 3.5 });
      d.stroke("M79 87 Q78 78 82 72", { sw: 2.4, color: skin[2] });
      d.ellipse(88.5, 77, 3.4, 4.4, "#ffeef2", { sw: 1.6, stroke: skin[2], tf: "rotate(-15 88.5 77)" });
      d.stroke("M40 60 Q45 63 43 68", { sw: 2.4, color: skin[2] });
      d.path(rr(24, 12, 38, 16, 6), d.fill(P.blue, "v"), { sw: 3 });
      d.shine(37, 40, 3.4, 9, 0.45, 0);
    },
  ],
  ["👍", "thumbs up", (d) => thumbHand(d, 47, 51, false, 2, P.sky)],
  [
    "🏊",
    "swimming",
    (d) => {
      const skin = SKIN[3];
      // The arm reaching forward over the water.
      d.tube("M54 66 Q60 28 80 30", skin[1], 10, 3);
      d.circle(84, 33, 7, d.fill(skin), { sw: 3 });
      head(d, 38, 54, 18, { skin: 3, hair: "none" }, MOODS.happy);
      // Swim cap and goggles.
      d.path("M19.5 54 Q18 34 38 33 Q58 34 56.5 54 Q50 46 38 46 Q26 46 19.5 54 Z", d.fill(P.red), { sw: 3 });
      d.shine(30, 39, 5, 2.4, 0.5, -20);
      d.stroke("M21 56 L55 56", { sw: 2.8 });
      for (const s of [-1, 1]) d.circle(38 + s * 7, 56, 5.2, "rgba(150,215,255,0.5)", { sw: 2.6 });
      // Water.
      const water = "M6 70 Q14 63 22 70 T38 70 T54 70 T70 70 T86 70 T94 70 L94 92 Q94 94 92 94 L8 94 Q6 94 6 92 Z";
      d.path(water, d.fill(P.sky, "v"), { sw: 3 });
      d.stroke("M14 82 Q22 77 30 82 T46 82 M58 84 Q66 79 74 84 T90 84", { sw: 2.4, color: "#ffffff", op: 0.7 });
      for (const [x, y, r] of [[92, 22, 2.6], [74, 22, 2], [64, 62, 2.4]]) d.circle(x, y, r, d.fill(P.sky), { sw: 1.8 });
    },
  ],
  [
    "🙇",
    "bowing",
    (d) => {
      const look: Look = { skin: 1, hairColor: HAIR.black };
      const skin = SKIN[1];
      d.shadow(46, 92, 30);
      for (const x of [30, 38]) {
        d.tube(`M${x} 52 L${x} 86`, P.navy[1], 11, 3);
        d.ellipse(x + 4, 89, 8.5, 4.5, d.fill(P.ink, "v"), { sw: 3 });
      }
      // Body folded forward from the hips, head bowed low.
      d.path(cap([33, 52], [57, 37], 24), d.fill(P.teal, "v"), { sw: 3 });
      sideHead(d, 71, 50, 15.5, look, "closed", "closed", 72);
      // Arm hanging down.
      d.tube("M56 38 L58 62", P.teal[1], 10, 3);
      d.circle(58, 66, 5.5, d.fill(skin), { sw: 3 });
      d.shine(36, 40, 6, 3, 0.4, -32);
    },
  ],
  [
    "👵",
    "grandma",
    (d) => {
      bust(d, 50, 40, 25, CAST.grandma, { eyes: "dot", brows: "up", mouth: "smile", extras: ["blush", "glasses"] });
      for (let i = -3; i <= 3; i++) d.circle(50 + i * 5.2, 71 - i * i * 0.6, 2.5, d.fill(P.white), { sw: 1.6 });
    },
  ],
  [
    "👴",
    "grandpa",
    (d) => {
      bust(d, 50, 40, 25, CAST.grandpa, { eyes: "dot", brows: "up", mouth: "smile", extras: ["blush", "glasses"] }, 98, "v");
      d.path("M50 48.6 Q44 45.5 38 50 Q43 53.4 50 51.2 Q57 53.4 62 50 Q56 45.5 50 48.6 Z", d.fill(HAIR.grey, "v"), { sw: 2.2 });
    },
  ],
  [
    "👅",
    "tongue",
    (d) => {
      d.path("M10 36 Q30 12 50 21 Q70 12 90 36 Q70 58 50 58 Q30 58 10 36 Z", d.fill(P.red), { sw: 3.2 });
      d.path("M20 36 Q35 29 50 31 Q65 29 80 36 Q65 47 50 47 Q35 47 20 36 Z", "#6a2232", { sw: 2.4 });
      const tongue = "M32 38 Q50 32 68 38 L70 66 Q70 90 50 90 Q30 90 30 66 Z";
      d.path(tongue, d.fill(P.pink), { sw: 3.2 });
      d.stroke("M50 44 Q49 60 50 74", { sw: 2.6, color: P.pink[2] });
      d.shine(39, 58, 3.5, 8, 0.55, 10);
      d.shine(30, 26, 6, 2.5, 0.5, -20);
    },
  ],
  [
    "🤴",
    "king",
    (d) => {
      const cx = 50;
      const cy = 47;
      const r = 22;
      bust(d, cx, cy, r, { skin: 2, hair: "short", hairColor: HAIR.brown, beard: HAIR.brown, shirt: P.red }, MOODS.happy, 98, "none");
      // Fur collar.
      const fur = "M20 82 Q24 66 38 66 Q50 72 62 66 Q76 66 80 82 Q66 74 50 80 Q34 74 20 82 Z";
      d.path(fur, d.fill(P.white), { sw: 3 });
      for (const [x, y] of [[29, 73], [41, 72], [59, 72], [71, 73]]) d.path(`M${x} ${y - 2.5} L${x + 1.6} ${y + 2} L${x - 1.6} ${y + 2} Z`, OL, { stroke: null });
      // Crown.
      d.path(`M${cx - r * 0.98} ${cy - r * 0.55} L${cx - r * 1.1} ${cy - r * 1.55} L${cx - r * 0.55} ${cy - r * 1.05} L${cx} ${cy - r * 1.72} L${cx + r * 0.55} ${cy - r * 1.05} L${cx + r * 1.1} ${cy - r * 1.55} L${cx + r * 0.98} ${cy - r * 0.55} Z`, d.fill(P.gold), { sw: 3 });
      d.path(rr(cx - r * 1.02, cy - r * 0.8, r * 2.04, r * 0.3, r * 0.1), d.fill(P.orange, "v"), { sw: 2.4 });
      for (const [x, y] of [[cx - r * 1.1, cy - r * 1.55], [cx, cy - r * 1.72], [cx + r * 1.1, cy - r * 1.55]]) d.circle(x, y, 3, d.fill(P.gold), { sw: 2 });
      d.circle(cx, cy - r * 1.18, 3.4, d.fill(P.red), { sw: 2 });
      for (const s of [-1, 1]) d.circle(cx + s * r * 0.62, cy - r * 0.65, 2.4, d.fill(P.sky), { sw: 1.6 });
      d.shine(cx - r * 0.6, cy - r * 1.25, 2.4, 5, 0.6, 15);
    },
  ],
  [
    "🫀",
    "heart organ",
    (d) => {
      d.tube("M54 36 Q52 12 68 11 Q82 11 82 28", P.red[1], 11, 3);
      for (const x of [62, 70]) d.tube(`M${x} 13 L${x} 5`, P.red[1], 5, 2.4);
      d.tube("M40 36 Q34 18 22 18", P.blue[1], 10, 3);
      d.tube("M72 40 Q84 40 88 50", P.blue[1], 8, 3);
      const body = "M26 46 Q26 30 42 32 Q50 26 60 32 Q80 30 80 50 Q80 72 50 92 Q22 76 24 58 Q24 50 26 46 Z";
      d.path(body, d.fill(P.red), { sw: 3.5 });
      d.stroke("M56 34 Q48 54 56 80", { sw: 2.6, color: P.red[2] });
      d.stroke("M42 48 Q40 60 44 70", { sw: 2.2, color: P.red[2], op: 0.7 });
      d.shine(36, 44, 5, 9, 0.55, 25);
    },
  ],
  [
    "👏",
    "clapping",
    (d) => {
      const skin = SKIN[1];
      const hand = (g: Pen) => {
        g.path("M50 14 Q56 13 58 19 Q63 19 64 26 Q68 28 68 36 L69 56 Q75 64 73 76 L70 86 L50 86 Z", g.fill(skin), { sw: 3 });
        g.stroke("M58 20 Q60 34 61 50 M64 27 Q66 40 66 54", { sw: 2, color: skin[2] });
        g.path("M50 51 Q57 50 58 57 L58 70 Q57 75 50 75 Z", g.fill(skin), { sw: 2.6 });
        g.path(rr(48, 80, 27, 14, 6), g.fill(P.coral, "v"), { sw: 3 });
      };
      d.g("rotate(13 50 86)", hand);
      d.mirror(50, (m) => m.g("rotate(13 50 86)", hand));
      burst(d, 50, 17, 5, 13, [-90, -140, -40]);
      for (const s of [-1, 1]) d.stroke(`M${50 + s * 31} 40 Q${50 + s * 37} 50 ${50 + s * 34} 60`, { sw: 3, color: P.gold[2] });
    },
  ],
  [
    "👩‍🏫",
    "teacher",
    (d) => {
      d.path(rr(8, 8, 84, 56, 6), d.fill(P.wood, "v"), { sw: 3 });
      d.path(rr(13.5, 13.5, 73, 45, 3), d.fill(P.forest, "v"), { sw: 2.4 });
      d.stroke("M19 42 L26 28 L33 42 Z", { sw: 2.6, color: "#ffffff", op: 0.85 });
      d.circle(76, 33, 6.5, "none", { sw: 2.6, stroke: "#ffffff", op: 0.85 });
      d.stroke("M66 50 L82 50", { sw: 2.6, color: "#ffffff", op: 0.6 });
      bust(d, 45, 57, 18, { skin: 2, hair: "bun", hairColor: HAIR.brown, shirt: P.violet }, { eyes: "dot", brows: "up", mouth: "smile", extras: ["blush", "glasses"] }, 98, "v");
      d.tube("M71 84 L87 24", P.wood[2], 3.4, 2);
      d.circle(71, 84, 6, SKIN[2][1], { sw: 2.6 });
    },
  ],
  [
    "🧑‍🌾",
    "farmer",
    (d) => {
      const cx = 50;
      const cy = 50;
      const r = 21;
      bust(d, cx, cy, r, { skin: 3, hair: "short", hairColor: HAIR.brown, shirt: P.red }, MOODS.happy, 98, "none");
      // Overalls: a bib and two straps with buttons.
      d.path("M37 98 L38 82 L62 82 L63 98 Z", d.fill(P.blue, "v"), { sw: 2.8 });
      for (const s of [-1, 1]) {
        d.tube(`M${cx + s * 12} 82 L${cx + s * 20} 69`, P.blue[1], 4.5, 2.4);
        d.circle(cx + s * 11, 85, 2.2, d.fill(P.gold), { sw: 1.6 });
      }
      // Straw hat.
      d.ellipse(cx, cy - r * 0.62, 38, 8.5, d.fill(P.sand), { sw: 3 });
      d.path(`M${cx - 18} ${cy - r * 0.6} Q${cx - 19} ${cy - r * 1.75} ${cx} ${cy - r * 1.78} Q${cx + 19} ${cy - r * 1.75} ${cx + 18} ${cy - r * 0.6} Q${cx} ${cy - r * 0.45} ${cx - 18} ${cy - r * 0.6} Z`, d.fill(P.sand), { sw: 3 });
      d.path(`M${cx - 18.5} ${cy - r * 0.92} Q${cx} ${cy - r * 0.78} ${cx + 18.5} ${cy - r * 0.92} L${cx + 18} ${cy - r * 0.62} Q${cx} ${cy - r * 0.48} ${cx - 18} ${cy - r * 0.62} Z`, d.fill(P.red), { sw: 2.2 });
      for (const [x1, y1, x2, y2] of [[22, 37, 30, 37], [70, 37, 78, 37], [44, 20, 47, 26], [56, 20, 53, 26]]) d.stroke(`M${x1} ${y1} L${x2} ${y2}`, { sw: 1.8, color: P.sand[2] });
      d.shine(cx - 9, cy - r * 1.45, 4, 2.4, 0.6, -25);
    },
  ],
  [
    "🙋",
    "raising hand",
    (d) => {
      const look: Look = { skin: 2, hair: "curly", hairColor: HAIR.auburn, shirt: P.sky };
      d.tube("M62 80 L71 50", P.sky[1], 12, 3);
      d.tube("M71 50 L75 30", SKIN[2][1], 9, 3);
      openHand(d, 76, 22, 8.5, 8, { skin: 2, sleeve: null });
      bust(d, 40, 50, 21, look, MOODS.joy);
    },
  ],
  ["👉", "pointing right", (d) => pointHand(d, 49, 52, 0.9, 0, false, 2)],
  [
    "🙅",
    "saying no",
    (d) => {
      const look: Look = { skin: 1, hair: "long", hairColor: HAIR.red, shirt: P.violet };
      const skin = SKIN[1];
      bust(d, 50, 36, 22, look, { eyes: "dot", brows: "angry", mouth: "flat" });
      // Forearms crossed in a big X.
      for (const [x0, x1, deg, mir] of [[78, 31, -38, true], [22, 69, 38, false]] as const) {
        d.tube(`M${x0} 99 L${(x0 + x1) / 2 + (x0 < 50 ? -4 : 4)} 84`, P.violet[1], 13, 3);
        d.tube(`M${(x0 + x1) / 2 + (x0 < 50 ? -4 : 4)} 84 L${x1} 63`, skin[1], 11, 3);
        openHand(d, x1 + (x0 < 50 ? 3 : -3), 57, 7.5, deg, { skin: 1, sleeve: null, mirror: mir });
      }
    },
  ],
  [
    "🤲",
    "open palms",
    (d) => {
      openHand(d, 37.5, 56, 14.5, -10, { skin: 3, spread: 0.5, sleeve: P.blue, thumb: -165 });
      openHand(d, 62.5, 56, 14.5, 10, { skin: 3, spread: 0.5, mirror: true, sleeve: P.blue, thumb: -165 });
      d.glow(50, 14, 14, "#ffd9df", 0.8);
      d.path(heart(50, 14, 8), d.fill(P.pink), { sw: 2.6 });
      d.shine(46, 10.5, 2, 1.2, 0.7, -30);
    },
  ],
  [
    "👸",
    "queen",
    (d) => {
      const cx = 50;
      const cy = 48;
      const r = 22;
      bust(d, cx, cy, r, { skin: 4, hair: "long", hairColor: HAIR.black, shirt: P.purple }, MOODS.happy, 98, "none");
      for (let i = -3; i <= 3; i++) d.circle(cx + i * 4.6, 77 - i * i * 0.5, 2.3, d.fill(P.gold), { sw: 1.5 });
      d.path(heart(cx, 79, 3.6), d.fill(P.pink), { sw: 1.6 });
      // Crown.
      const base = cy - r * 0.72;
      d.path(`M${cx - r * 0.9} ${base} L${cx - r * 0.98} ${cy - r * 1.32} Q${cx - r * 0.62} ${cy - r * 1.08} ${cx - r * 0.45} ${cy - r * 1.42} Q${cx - r * 0.22} ${cy - r * 1.1} ${cx} ${cy - r * 1.62} Q${cx + r * 0.22} ${cy - r * 1.1} ${cx + r * 0.45} ${cy - r * 1.42} Q${cx + r * 0.62} ${cy - r * 1.08} ${cx + r * 0.98} ${cy - r * 1.32} L${cx + r * 0.9} ${base} Q${cx} ${base + 4} ${cx - r * 0.9} ${base} Z`, d.fill(P.gold), { sw: 2.8 });
      for (const [x, y, rr2] of [[cx - r * 0.98, cy - r * 1.32, 2.4], [cx - r * 0.45, cy - r * 1.42, 2.4], [cx, cy - r * 1.62, 2.8], [cx + r * 0.45, cy - r * 1.42, 2.4], [cx + r * 0.98, cy - r * 1.32, 2.4]] as const) d.circle(x, y, rr2, d.fill(P.white), { sw: 1.6 });
      d.path(heart(cx, cy - r * 0.98, 3.4), d.fill(P.pink), { sw: 1.6 });
      d.shine(cx - r * 0.55, cy - r * 1.08, 2, 4, 0.6, 20);
    },
  ],
  [
    "👆",
    "pointing up",
    (d) => {
      pointHand(d, 52, 52, 0.9, -90, false, 3);
      for (const r of [9, 15]) d.stroke(`M${f2(44.5 - r * 0.7)} ${f2(12 - r * 0.2)} Q44.5 ${f2(12 - r * 1.05)} ${f2(44.5 + r * 0.7)} ${f2(12 - r * 0.2)}`, { sw: 2.6, color: P.sky[2] });
    },
  ],
  [
    "🤷",
    "shrugging",
    (d) => {
      const look: Look = { skin: 3, hair: "short", hairColor: HAIR.black, shirt: P.green };
      const skin = SKIN[3];
      bust(d, 50, 38, 19, look, { eyes: "dot", brows: "raised", mouth: "smirk" }, 98, "round");
      for (const s of [-1, 1]) {
        // Elbows down at the sides, forearms up, palms to the sky.
        d.tube(`M${50 + s * 22} 70 L${50 + s * 29} 88`, P.green[1], 11, 3);
        d.tube(`M${50 + s * 29} 88 L${50 + s * 31} 68`, skin[1], 9, 3);
        palmUp(d, 50 + s * 31.5, 65, 1.35, s, skin, -22);
      }
    },
  ],
  [
    "👼",
    "baby angel",
    (d) => {
      for (const s of [-1, 1]) {
        const w = `M${50 + s * 12} 66 Q${50 + s * 30} 46 ${50 + s * 44} 54 Q${50 + s * 46} 64 ${50 + s * 38} 68 Q${50 + s * 42} 76 ${50 + s * 32} 80 Q${50 + s * 30} 88 ${50 + s * 18} 86 Z`;
        d.path(w, d.fill(P.white), { sw: 3 });
        d.stroke(`M${50 + s * 22} 64 Q${50 + s * 30} 66 ${50 + s * 36} 66 M${50 + s * 20} 74 Q${50 + s * 26} 76 ${50 + s * 32} 76`, { sw: 2, color: P.white[2] });
      }
      d.path("M26 99 Q26 80 40 76 Q50 80 60 76 Q74 80 74 99 Z", d.fill(P.white, "v"), { sw: 3 });
      head(d, 50, 50, 23, { skin: 1, hair: "curly", hairColor: HAIR.blond }, { eyes: "happy", brows: "up", mouth: "smile", extras: ["blush", "halo"] });
    },
  ],
  [
    "🕵️",
    "detective",
    (d) => {
      const cx = 44;
      const cy = 50;
      const r = 21;
      bust(d, cx, cy, r, { skin: 0, hair: "short", hairColor: HAIR.brown, shirt: P.tan }, { eyes: "dot", brows: "raised", mouth: "smirk" }, 98, "v");
      // Popped coat collar.
      for (const s of [-1, 1]) d.path(`M${cx + s * 6} ${cy + r * 0.92} L${cx + s * 17} ${cy + r * 0.78} L${cx + s * 15} ${cy + r * 1.7} Z`, d.fill(P.tan), { sw: 2.6 });
      // Deerstalker cap.
      const cap2 = `M${cx - r * 1.05} ${cy - r * 0.3} Q${cx - r * 1.1} ${cy - r * 1.3} ${cx} ${cy - r * 1.32} Q${cx + r * 1.1} ${cy - r * 1.3} ${cx + r * 1.05} ${cy - r * 0.3} Z`;
      d.path(cap2, d.fill(P.wood), { sw: 3 });
      d.clip(cap2, (c) => {
        for (const x of [-12, 0, 12]) c.stroke(`M${cx + x} ${cy - r * 1.4} L${cx + x} ${cy}`, { sw: 1.8, color: P.brown[2], op: 0.6 });
        c.stroke(`M${cx - r * 1.2} ${cy - r * 0.8} L${cx + r * 1.2} ${cy - r * 0.8}`, { sw: 1.8, color: P.brown[2], op: 0.6 });
      });
      d.path(`M${cx - r * 0.7} ${cy - r * 0.42} Q${cx} ${cy - r * 0.62} ${cx + r * 0.7} ${cy - r * 0.42} Q${cx} ${cy - r * 0.08} ${cx - r * 0.7} ${cy - r * 0.42} Z`, d.fill(P.brown, "v"), { sw: 2.6 });
      d.shine(cx - r * 0.5, cy - r * 1.0, 4, 2.4, 0.5, -20);
      // Magnifying glass over one eye.
      d.tube("M70 66 L84 86", P.brown[1], 7, 3);
      d.circle(61, 54, 14, "rgba(190,230,255,0.45)", { sw: 3.4 });
      d.circle(61, 54, 14, "none", { sw: 2.2, stroke: P.gold[1] });
      d.eye(60, 54, 6.5);
      d.shine(55, 48, 4, 2, 0.75, -35);
    },
  ],
  [
    "🦵",
    "leg",
    (d) => {
      const skin = SKIN[2];
      d.path("M22 26 L60 38 C70 41 74 52 68 60 L58 78 C64 80 76 81 84 82 C92 83 93 92 86 93 L46 93 C40 93 38 88 40 82 L46 62 C47 58 44 56 40 55 L16 46 Z", d.fill(skin), { sw: 3.5 });
      d.stroke("M60 46 Q64 50 62 55", { sw: 2.4, color: skin[2] });
      d.stroke("M76 87 Q78 84 82 84", { sw: 2.2, color: skin[2] });
      d.path(rr(8, 18, 22, 36, 7), d.fill(P.blue, "v"), { sw: 3, tf: "rotate(20 19 36)" });
      d.shine(42, 40, 9, 3, 0.45, 18);
    },
  ],
  [
    "👣",
    "footprints",
    (d) => {
      footprint(d, 34, 63, 1.05, -12, true, P.stone);
      footprint(d, 66, 37, 1.05, 12, false, P.stone);
    },
  ],
  [
    "👥",
    "two people",
    (d) => {
      const shape = (g: Pen, x: number, y: number, s: number, c: string) => {
        g.path(`M${x - 24 * s} ${y + 48 * s} Q${x - 25 * s} ${y + 24 * s} ${x - 10 * s} ${y + 21 * s} Q${x} ${y + 25 * s} ${x + 10 * s} ${y + 21 * s} Q${x + 25 * s} ${y + 24 * s} ${x + 24 * s} ${y + 48 * s} Z`, c, { sw: 3 });
        g.circle(x, y, 13 * s, c, { sw: 3 });
      };
      shape(d, 64, 30, 0.95, "#aab6cc");
      shape(d, 40, 40, 1.05, "#7f8db0");
    },
  ],
  [
    "🦷",
    "tooth",
    (d) => {
      const tooth = "M20 32 C20 13 38 11 50 19 C62 11 80 13 80 32 C80 46 75 55 73 67 C71 81 67 91 60 91 C53 91 54 77 50 70 C46 77 47 91 40 91 C33 91 29 81 27 67 C25 55 20 46 20 32 Z";
      d.path(tooth, d.fill(P.white), { sw: 3.5 });
      d.stroke("M50 21 Q47 30 50 36", { sw: 2.2, color: P.white[2] });
      d.shine(32, 26, 6, 9, 0.9, -30);
      d.sparkle(80, 14, 7);
    },
  ],
  [
    "🫁",
    "lungs",
    (d) => {
      for (const s of [-1, 1]) d.path(`M${50 + s * 6} 34 C${50 + s * 20} 22 ${50 + s * 38} 36 ${50 + s * 38} 62 C${50 + s * 38} 82 ${50 + s * 30} 92 ${50 + s * 20} 90 C${50 + s * 12} 88 ${50 + s * 7} 80 ${50 + s * 7} 70 Z`, d.fill(P.rose), { sw: 3.3 });
      d.tube("M50 8 L50 42", P.white[1], 8, 2.6);
      for (const y of [14, 21, 28, 35]) d.stroke(`M46.5 ${y} H53.5`, { sw: 1.6, color: P.white[2] });
      for (const s of [-1, 1]) {
        d.tube(`M50 42 Q${50 + s * 8} 46 ${50 + s * 16} 54`, P.white[1], 6, 2.4);
        d.stroke(`M${50 + s * 16} 54 L${50 + s * 24} 50 M${50 + s * 16} 54 L${50 + s * 20} 66 M${50 + s * 24} 50 L${50 + s * 30} 54`, { sw: 2.2, color: P.rose[2] });
      }
      d.shine(26, 44, 4, 8, 0.5, 20);
      d.shine(70, 40, 3, 6, 0.4, 20);
    },
  ],
  [
    "👐",
    "open hands",
    (d) => {
      openHand(d, 30, 54, 14.5, -28, { skin: 0, spread: 2.2, mirror: true, sleeve: P.teal });
      openHand(d, 70, 54, 14.5, 28, { skin: 0, spread: 2.2, sleeve: P.teal });
      for (const s of [-1, 1]) d.stroke(`M${50 + s * 41} 28 Q${50 + s * 46} 40 ${50 + s * 43} 52 M${50 + s * 36} 18 Q${50 + s * 40} 22 ${50 + s * 41} 26`, { sw: 3, color: P.steel[1] });
    },
  ],
  [
    "✍️",
    "writing hand",
    (d) => {
      const skin = SKIN[1];
      d.path(rr(8, 50, 66, 42, 4), d.fill(P.white, "v"), { sw: 3, tf: "rotate(-6 41 71)" });
      d.stroke("M16 78 q4 -7 8 0 t8 0 t8 0", { sw: 2.6, color: P.blue[2] });
      // Pencil.
      d.tube("M46 80 L82 26", P.gold[1], 8, 2.6);
      d.tube("M82 26 L86 20", P.pink[1], 8, 2.6);
      d.path("M42.5 86 L44 77 L50 81 Z", d.fill(P.wood), { sw: 2.2 });
      // The hand holding it.
      d.path("M54 52 C58 44 68 42 76 46 C86 50 88 62 82 70 C76 78 64 78 58 74 C52 70 50 60 54 52 Z", d.fill(skin), { sw: 3 });
      finger(d, [60, 54], [50, 70], 8, skin, 2.8);
      for (const [x, y] of [[70, 74], [78, 70]] as const) d.stroke(`M${x - 4} ${y - 4} q2 4 6 3`, { sw: 2.2, color: skin[2] });
      d.path(rr(74, 32, 22, 30, 7), d.fill(P.violet, "v"), { sw: 3, tf: "rotate(-30 85 47)" });
    },
  ],
  [
    "👨‍👩‍👧",
    "family",
    (d) => {
      bust(d, 30, 34, 17, CAST.man, MOODS.happy, 98);
      bust(d, 70, 34, 17, CAST.woman, MOODS.happy, 98);
      bust(d, 50, 61, 15, { skin: 2, hair: "puffs", hairColor: HAIR.brown, shirt: P.pink }, MOODS.joy, 98);
    },
  ],
  [
    "🧍",
    "standing person",
    (d) => {
      d.shadow(50, 93, 20);
      figure(d, 50, 91, 90, { skin: 2, hair: "short", hairColor: HAIR.brown, shirt: P.sky }, pose([-8, -3], [8, 3], [4, 0], [-4, 0]), MOODS.happy, { adult: true, pants: P.navy });
    },
  ],
  ["👨", "man", (d) => bust(d, 50, 40, 25, CAST.man, MOODS.happy, 98, "v")],
  [
    "👫",
    "couple holding hands",
    (d) => {
      d.shadow(50, 93, 40);
      figure(d, 31, 91, 84, CAST.woman, pose([-8, -3], [20, 20]), MOODS.happy, { adult: true, dress: true, pants: SKIN[1], shoes: P.coral });
      figure(d, 69, 91, 84, { skin: 3, hair: "short", hairColor: HAIR.black, shirt: P.blue }, pose([-20, -20], [8, 3]), MOODS.happy, { adult: true, pants: P.navy });
    },
  ],
  [
    "🩸",
    "drop of blood",
    (d) => {
      d.path(drop(50, 60, 27), d.fill(P.red), { sw: 3.5 });
      d.shine(39, 58, 5, 11, 0.6, 20);
      d.circle(60, 74, 3, "#ffffff", { stroke: null, op: 0.6 });
    },
  ],
  [
    "💇",
    "haircut",
    (d) => {
      const cx = 43;
      const cy = 45;
      const r = 21;
      // Salon cape.
      d.path(`M${cx - 36} 99 Q${cx - 34} ${cy + r * 1.1} ${cx} ${cy + r * 1.05} Q${cx + 34} ${cy + r * 1.1} ${cx + 36} 99 Z`, d.fill(P.white, "v"), { sw: 3 });
      d.clip(`M${cx - 36} 99 Q${cx - 34} ${cy + r * 1.1} ${cx} ${cy + r * 1.05} Q${cx + 34} ${cy + r * 1.1} ${cx + 36} 99 Z`, (c) => {
        for (let x = cx - 36; x < cx + 40; x += 12) c.path(`M${x} 99 L${x + 5} ${cy + r * 0.9} L${x + 10} ${cy + r * 0.9} L${x + 5} 99 Z`, P.sky[0], { stroke: null });
      });
      head(d, cx, cy, r, { skin: 1, hair: "wavy", hairColor: HAIR.auburn }, MOODS.happy);
      // Scissors snipping at the side of the hair.
      scissors(d, 74, 40, 1.08, 204);
      for (const [x, y, a] of [[70, 60, 20], [78, 67, -30]] as const) d.stroke(`M${x} ${y} q3 2 2 6`, { sw: 2.6, color: HAIR.auburn[1], tf: `rotate(${a} ${x} ${y})` });
    },
  ],
  [
    "👨‍👩‍👧‍👦",
    "family of four",
    (d) => {
      bust(d, 29, 32, 15.5, CAST.man, MOODS.happy, 98);
      bust(d, 71, 32, 15.5, CAST.woman, MOODS.happy, 98);
      bust(d, 35, 64, 13, { skin: 2, hair: "pony", hairColor: HAIR.brown, shirt: P.pink }, MOODS.joy, 98);
      bust(d, 65, 64, 13, { skin: 2, hair: "spiky", hairColor: HAIR.black, shirt: P.green }, MOODS.joy, 98);
    },
  ],
  [
    "💅",
    "painted nails",
    (d) => {
      openHand(d, 40, 52, 15, -12, { skin: 1, back: true, spread: 1.6, polish: P.pink, sleeve: P.violet });
      // Polish bottle.
      d.path(rr(66, 62, 24, 28, 8), d.fill(P.pink), { sw: 3 });
      d.path(rr(71, 44, 14, 20, 4), d.fill(P.black, "v"), { sw: 3 });
      d.shine(72, 70, 2.6, 6, 0.65, 0);
      d.sparkle(88, 50, 5);
    },
  ],
  ["🖐️", "hand with fingers spread", (d) => openHand(d, 54, 58, 19.5, -4, { skin: 3, spread: 4.6, thumb: -160 })],
  [
    "👄",
    "lips",
    (d) => {
      const lips = "M8 50 Q28 22 42 30 Q50 34 58 30 Q72 22 92 50 Q72 80 50 80 Q28 80 8 50 Z";
      d.path(lips, d.fill(P.red), { sw: 3.5 });
      d.clip(lips, (c) => c.path("M0 0 H100 V50 Q72 56 50 53 Q28 56 0 50 Z", P.red[2], { stroke: null, op: 0.35 }));
      d.stroke("M12 50 Q30 56 50 53 Q70 56 88 50", { sw: 3 });
      d.shine(40, 64, 10, 4, 0.55, -6);
      d.shine(30, 36, 5, 2.4, 0.5, -30);
    },
  ],
  [
    "👤",
    "person shadow",
    (d) => {
      d.path("M20 92 Q19 62 38 58 Q50 63 62 58 Q81 62 80 92 Z", "#7f8db0", { sw: 3.2 });
      d.circle(50, 36, 17, "#7f8db0", { sw: 3.2 });
    },
  ],
  [
    "👋",
    "waving hand",
    (d) => {
      openHand(d, 54, 58, 18.5, -22, { skin: 0, spread: 1.8, sleeve: P.coral });
      for (const [x, y] of [[16, 24], [12, 36]] as const) d.stroke(`M${x} ${y} q-5 8 0 16`, { sw: 3.2, color: P.steel[1] });
      d.stroke("M84 14 q6 6 4 14 M90 10 q7 8 5 18", { sw: 3.2, color: P.steel[1] });
    },
  ],
  [
    "🧗",
    "climbing",
    (d) => {
      const wall = rr(10, 8, 80, 86, 12);
      d.path(wall, d.fill(P.sand, "v"), { sw: 3 });
      d.clip(wall, (c) => {
        for (const [x, y, rx, ry, col] of [[24, 18, 5, 4, P.red], [70, 26, 4.5, 4, P.blue], [80, 58, 5, 4, P.gold], [20, 70, 4, 3.5, P.green], [58, 84, 5, 4, P.violet], [34, 46, 4, 3.5, P.orange]] as const) c.ellipse(x, y, rx, ry, c.fill(col), { sw: 2.2 });
      });
      const look: Look = { skin: 2, hair: "short", hairColor: HAIR.brown, shirt: P.orange };
      figure(d, 50, 86, 76, look, pose([-155, -172], [105, 160], [-55, 15], [12, 4]), MOODS.happy, { pants: P.navy });
      const hd = figHead(86, 76);
      backOfHead(d, 50, hd.cy, hd.r, 2, HAIR.brown);
    },
  ],
  [
    "🕺",
    "dancing man",
    (d) => {
      d.shadow(50, 93, 22);
      figure(d, 46, 91, 86, { skin: 4, hair: "afro", hairColor: HAIR.black, shirt: P.purple }, pose([-55, 45], [122, 150], [-8, 0], [38, -14], -4), MOODS.joy, { adult: true, pants: P.black, shoes: P.ink });
      note(d, 18, 34, 6, P.blue);
      note(d, 80, 66, 5, P.pink);
    },
  ],
  [
    "🧙",
    "wizard",
    (d) => {
      const cx = 50;
      const cy = 55;
      const r = 18;
      bust(d, cx, cy, r, { skin: 1, hair: "short", hairColor: HAIR.white, beard: HAIR.white, shirt: P.violet }, MOODS.happy, 98, "robe");
      // Long beard.
      d.path(`M${cx - r * 0.8} ${cy + r * 0.7} Q${cx - r * 0.75} ${cy + r * 1.9} ${cx} ${cy + r * 2.25} Q${cx + r * 0.75} ${cy + r * 1.9} ${cx + r * 0.8} ${cy + r * 0.7} Q${cx} ${cy + r * 1.3} ${cx - r * 0.8} ${cy + r * 0.7} Z`, d.fill(HAIR.white, "v"), { sw: 2.6 });
      d.path(`M${cx} ${cy + r * 0.4} Q${cx - r * 0.28} ${cy + r * 0.3} ${cx - r * 0.42} ${cy + r * 0.48} Q${cx - r * 0.2} ${cy + r * 0.5} ${cx} ${cy + r * 0.46} Q${cx + r * 0.2} ${cy + r * 0.5} ${cx + r * 0.42} ${cy + r * 0.48} Q${cx + r * 0.28} ${cy + r * 0.3} ${cx} ${cy + r * 0.4} Z`, d.fill(HAIR.white, "v"), { sw: 1.8 });
      // Tall pointy hat with stars.
      const hat = `M${cx - 22} ${cy - r * 0.62} Q${cx - 10} ${cy - r * 1.6} ${cx - 2} ${cy - r * 2.3} Q${cx + 6} ${cy - r * 2.8} ${cx + 18} ${cy - r * 2.65} Q${cx + 8} ${cy - r * 2.3} ${cx + 10} ${cy - r * 1.8} Q${cx + 14} ${cy - r * 1.2} ${cx + 22} ${cy - r * 0.62} Z`;
      d.path(hat, d.fill(P.blue), { sw: 3 });
      d.ellipse(cx, cy - r * 0.62, 30, 6.5, d.fill(P.blue, "v"), { sw: 3 });
      d.path(star(cx - 2, cy - r * 1.35, 5), d.fill(P.gold), { sw: 1.8 });
      d.path(star(cx + 7, cy - r * 2.05, 3.4), d.fill(P.gold), { sw: 1.6 });
      d.shine(cx - 10, cy - r * 1.4, 2.4, 6, 0.5, 25);
    },
  ],
  ["👇", "pointing down", (d) => pointHand(d, 48, 48, 0.9, 90, false, 1)],
  ["👈", "pointing left", (d) => pointHand(d, 51, 52, 0.9, 0, true, 3, P.coral)],
  [
    "🦸",
    "superhero",
    (d) => {
      const cx = 50;
      const cy = 40;
      const r = 21;
      // Cape flaring out behind the shoulders.
      d.path(`M${cx - 14} ${cy + r * 0.9} Q${cx - 34} ${cy + r * 1.6} ${cx - 42} 98 L${cx + 42} 98 Q${cx + 34} ${cy + r * 1.6} ${cx + 14} ${cy + r * 0.9} Z`, d.fill(P.red, "v"), { sw: 3 });
      bust(d, cx, cy, r, { skin: 3, hair: "short", hairColor: HAIR.black, shirt: P.blue }, { eyes: "dot", brows: "up", mouth: "grin", extras: ["blush"] }, 98, "none");
      // Mask over the eyes.
      const ey = cy + r * 0.06;
      d.path(`M${cx - r * 0.95} ${ey - r * 0.1} Q${cx - r * 0.75} ${ey - r * 0.42} ${cx - r * 0.38} ${ey - r * 0.32} Q${cx} ${ey - r * 0.2} ${cx + r * 0.38} ${ey - r * 0.32} Q${cx + r * 0.75} ${ey - r * 0.42} ${cx + r * 0.95} ${ey - r * 0.1} Q${cx + r * 0.85} ${ey + r * 0.3} ${cx + r * 0.42} ${ey + r * 0.28} Q${cx + r * 0.12} ${ey + r * 0.26} ${cx} ${ey + r * 0.08} Q${cx - r * 0.12} ${ey + r * 0.26} ${cx - r * 0.42} ${ey + r * 0.28} Q${cx - r * 0.85} ${ey + r * 0.3} ${cx - r * 0.95} ${ey - r * 0.1} Z`, d.fill(P.red), { sw: 2.6 });
      for (const s of [-1, 1]) {
        d.ellipse(cx + s * r * 0.38, ey, r * 0.2, r * 0.17, "#fff", { sw: 1.8 });
        d.eye(cx + s * r * 0.38, ey, r * 0.12);
      }
      // Star badge.
      d.circle(cx, 84, 9, d.fill(P.gold), { sw: 2.6 });
      d.path(star(cx, 84.5, 6.2), d.fill(P.red), { sw: 1.8 });
    },
  ],
  [
    "🏋️",
    "lifting weights",
    (d) => {
      const h = 78;
      const foot = 92;
      const ar: [number, number] = [-128, -172];
      const af: [number, number] = [128, 172];
      const hd = figHead(foot, h);
      d.shadow(50, 94, 26);
      figure(d, 50, foot, h, { skin: 1, hair: "pony", hairColor: HAIR.red, shirt: P.lime }, pose(ar, af, [-14, 0], [14, 0]), MOODS.joy, { pants: P.navy });
      const L = h * 0.15;
      const hb = limbEnd(50 - hd.limbW * 1.3, hd.shY, ar, L);
      const hf = limbEnd(50 + hd.limbW * 1.3, hd.shY, af, L);
      const y = (hb[1] + hf[1]) / 2;
      d.tube(`M12 ${y} L88 ${y}`, P.steel[1], 3.6, 2.4);
      for (const s of [-1, 1]) {
        d.path(rr(50 + s * 33 - 5, y - 13, 10, 26, 4), d.fill(P.red, "v"), { sw: 2.8 });
        d.path(rr(50 + s * 39.5 - 3, y - 9, 6, 18, 2.5), d.fill(P.red, "v"), { sw: 2.6 });
      }
      for (const [x, yy] of [hb, hf]) d.circle(x, yy, 4.2, SKIN[1][1], { sw: 2.4 });
    },
  ],
  ["👎", "thumbs down", (d) => thumbHand(d, 53, 49, true, 0, P.coral)],
  [
    "🧘",
    "meditating",
    (d) => {
      const skin = SKIN[3];
      d.glow(50, 50, 42, "#d6c1ff", 0.4);
      d.path(rr(6, 80, 88, 13, 6.5), d.fill(P.teal, "v"), { sw: 3 });
      // Crossed legs.
      d.path("M14 82 Q12 66 30 64 L70 64 Q88 66 86 82 Q70 88 50 84 Q30 88 14 82 Z", d.fill(P.violet, "v"), { sw: 3 });
      d.stroke("M38 70 Q50 80 64 74", { sw: 2.4, color: P.violet[2] });
      for (const s of [-1, 1]) d.ellipse(50 + s * 15, 78, 6, 3.5, d.fill(skin), { sw: 2.4 });
      // Body and arms resting on the knees.
      d.path(rr(35, 40, 30, 30, 11), d.fill(P.lime, "v"), { sw: 3 });
      for (const s of [-1, 1]) {
        d.tube(`M${50 + s * 13} 46 L${50 + s * 24} 62 L${50 + s * 31} 72`, P.lime[1], 8, 3);
        d.tube(`M${50 + s * 25} 64 L${50 + s * 31} 72`, skin[1], 7.5, 3);
        d.circle(50 + s * 32, 73, 5, d.fill(skin), { sw: 2.6 });
      }
      head(d, 50, 27, 15, { skin: 3, hair: "bun", hairColor: HAIR.black }, MOODS.calm);
    },
  ],
  [
    "🤏",
    "pinching fingers",
    (d) => {
      const skin = SKIN[2];
      // Seen from the back: the index finger and the thumb reach out and almost meet.
      d.tube("M48 52 Q66 54 76 44", skin[1], 12, 3.2);
      for (const [y, x1] of [[63, 63], [72, 60]] as const) finger(d, [42, y], [x1, y], 10, skin, 3.2);
      d.path(rr(20, 34, 36, 46, 14), d.fill(skin), { sw: 3.2 });
      for (const y of [48, 58, 67]) d.stroke(`M40 ${y} Q45 ${y + 2} 50 ${y}`, { sw: 2.2, color: skin[2] });
      d.tube("M30 40 Q50 22 75 28", skin[1], 11.5, 3.2);
      d.ellipse(74, 27.5, 3, 2.3, "#ffeef2", { sw: 1.4, stroke: skin[2], tf: "rotate(15 74 27.5)" });
      d.path(rr(6, 38, 15, 38, 5), d.fill(P.sky, "v"), { sw: 3 });
      for (const [x, y, r] of [[86, 36, 2], [90, 30, 1.4], [89, 42, 1.4]] as const) d.circle(x, y, r, d.fill(P.white), { sw: 1.4 });
      d.shine(29, 50, 4, 7, 0.45, -10);
    },
  ],
  [
    "👊",
    "punch",
    (d) => {
      const skin = SKIN[3];
      d.path(star(50, 50, 46, 30, 10), d.fill(P.lemon), { stroke: null, op: 0.8 });
      d.path(rr(40, 74, 28, 18, 6), d.fill(P.orange, "v"), { sw: 3 });
      d.path(rr(22, 24, 56, 54, 18), d.fill(skin), { sw: 3.4 });
      for (let i = 0; i < 4; i++) d.path(rr(24 + i * 13, 26, 13, 30, 6.5), d.fill(skin), { sw: 2.6 });
      finger(d, [30, 62], [62, 56], 13, skin, 3);
      d.shine(30, 34, 3, 6, 0.55, 0);
      burst(d, 50, 50, 38, 46, [-150, -30, 150, 30, 200, -20], P.orange[2], 3);
    },
  ],
  [
    "🧜",
    "mermaid",
    (d) => {
      const skin = SKIN[1];
      const tail = "M34 56 L60 56 Q64 72 72 80 Q78 86 84 84 L80 92 Q70 94 62 88 Q44 76 34 56 Z";
      d.path("M80 82 Q92 72 96 78 Q92 84 86 86 Q94 90 92 96 Q84 94 79 90 Z", d.fill(P.teal), { sw: 2.8 });
      d.path(tail, d.fill(P.teal), { sw: 3 });
      d.clip(tail, (c) => {
        for (const [x, y] of [[40, 62], [48, 62], [56, 62], [44, 69], [52, 69], [60, 69], [52, 76], [60, 76], [66, 82]] as const) c.stroke(`M${x - 3.5} ${y} Q${x} ${y + 4} ${x + 3.5} ${y}`, { sw: 1.8, color: P.teal[2] });
      });
      // Body, shell top and arms.
      d.path(rr(34, 34, 26, 26, 9), d.fill(skin), { sw: 3 });
      for (const s of [-1, 1]) d.path(`M${47 + s * 6} 42 Q${47 + s * 11} 42 ${47 + s * 11} 48 Q${47 + s * 6} 50 ${47 + s * 1} 48 Q${47 + s * 1} 42 ${47 + s * 6} 42 Z`, d.fill(P.purple), { sw: 2 });
      d.tube("M35 40 Q28 50 32 58", skin[1], 7, 2.8);
      d.tube("M59 40 Q66 48 64 56", skin[1], 7, 2.8);
      head(d, 47, 22, 14, { skin: 1, hair: "long", hairColor: HAIR.red }, MOODS.happy);
      for (const [x, y, r] of [[78, 30, 3.4], [84, 20, 2.4], [74, 18, 1.8]] as const) d.circle(x, y, r, "rgba(196,235,255,0.6)", { sw: 1.8 });
    },
  ],
  [
    "👁️",
    "eye",
    (d) => {
      const lid = "M8 52 Q50 4 92 52 Q50 94 8 52 Z";
      d.path(lid, d.fill(P.white), { sw: 3.5 });
      d.clip(lid, (c) => {
        c.circle(50, 51, 21, c.rad([[0, "#7fe0c8"], [0.55, "#2fb08f"], [1, "#156b5a"]], 0.4, 0.35, 0.8), { sw: 2.6 });
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          c.stroke(`M${f2(50 + Math.cos(a) * 11)} ${f2(51 + Math.sin(a) * 11)} L${f2(50 + Math.cos(a) * 18)} ${f2(51 + Math.sin(a) * 18)}`, { sw: 1.4, color: "#bff5e6", op: 0.6 });
        }
        c.circle(50, 51, 9, OL, { stroke: null });
        c.circle(43, 44, 5, "#fff", { stroke: null });
        c.circle(56, 57, 2.2, "#fff", { stroke: null, op: 0.9 });
      });
      d.path(lid, "none", { sw: 3.5 });
      d.stroke("M10 50 Q50 2 90 50", { sw: 5 });
      for (const [x1, y1, x2, y2] of [[22, 34, 16, 25], [36, 24, 33, 14], [50, 21, 50, 10], [64, 24, 67, 14], [78, 34, 84, 25]]) d.stroke(`M${x1} ${y1} L${x2} ${y2}`, { sw: 3 });
    },
  ],
  [
    "🤸",
    "cartwheel",
    (d) => {
      d.stroke("M14 44 Q10 24 26 12", { sw: 3.2, color: P.steel[1] });
      d.stroke("M86 44 Q90 24 74 12", { sw: 3.2, color: P.steel[1] });
      d.shadow(50, 93, 30);
      d.g("rotate(-152 50 52)", (g) => figure(g, 50, 88, 78, { skin: 4, hair: "puffs", hairColor: HAIR.black, shirt: P.pink }, pose([-128, -140], [128, 140], [-30, -30], [30, 30]), MOODS.joy, { pants: P.violet }));
    },
  ],
  [
    "🚶‍♂️",
    "man walking",
    (d) => {
      d.shadow(50, 93, 22);
      figure(d, 50, 91, 88, { skin: 4, hair: "short", hairColor: HAIR.black, beard: HAIR.black, shirt: P.orange }, pose([-26, -18], [24, 10], [-20, -6], [22, 4], 3), MOODS.happy, { adult: true, pants: P.brown });
    },
  ],
  [
    "🏃‍♂️",
    "man running",
    (d) => {
      speed(d, [[38, 4, 20], [50, 1, 16], [62, 6, 18]]);
      d.shadow(52, 93, 24);
      figure(d, 54, 90, 88, { skin: 0, hair: "short", hairColor: HAIR.brown, shirt: P.blue }, pose([-55, 10], [45, 135], [-40, -100], [75, 5], 10), MOODS.happy, { adult: true, pants: P.ink, shoes: P.red });
    },
  ],
  [
    "💂",
    "royal guard",
    (d) => {
      const cx = 50;
      const cy = 58;
      const r = 17;
      bust(d, cx, cy, r, { skin: 1, hair: "none", shirt: P.red }, { eyes: "dot", brows: "flat", mouth: "flat", extras: ["blush"] }, 98, "none");
      for (const y of [84, 93]) d.circle(cx, y, 2.4, d.fill(P.gold), { sw: 1.6 });
      d.path(rr(cx - 8, cy + r * 0.86, 16, 7, 2), d.fill(P.red, "v"), { sw: 2.4 });
      // Tall fuzzy hat and its chin strap.
      d.stroke(`M${cx - r * 0.95} ${cy - r * 0.2} Q${cx - r * 0.9} ${cy + r * 0.9} ${cx} ${cy + r * 1.02} Q${cx + r * 0.9} ${cy + r * 0.9} ${cx + r * 0.95} ${cy - r * 0.2}`, { sw: 4.4 });
      d.stroke(`M${cx - r * 0.95} ${cy - r * 0.2} Q${cx - r * 0.9} ${cy + r * 0.9} ${cx} ${cy + r * 1.02} Q${cx + r * 0.9} ${cy + r * 0.9} ${cx + r * 0.95} ${cy - r * 0.2}`, { sw: 2, color: P.gold[1] });
      d.path(lumpyHat(cx, cy - r * 1.6, r * 1.15, r * 1.45), d.fill(P.black, "v"), { sw: 3 });
      d.shine(cx - r * 0.5, cy - r * 2.3, 3, 7, 0.35, 15);
    },
  ],
  [
    "👩‍💻",
    "coder at a laptop",
    (d) => {
      bust(d, 50, 38, 20, { skin: 3, hair: "braids", hairColor: HAIR.black, shirt: P.teal }, { eyes: "dot", brows: "up", mouth: "smile", extras: ["blush", "glasses"] }, 98, "round");
      d.path(rr(20, 58, 60, 32, 5), d.fill(P.silver, "v"), { sw: 3 });
      d.path(rr(12, 88, 76, 7, 3), d.fill(P.steel, "v"), { sw: 3 });
      d.stroke("M42 68 L36 74 L42 80 M58 68 L64 74 L58 80 M53 66 L47 82", { sw: 3, color: P.blue[1] });
      d.shine(28, 63, 4, 2, 0.8, -20);
    },
  ],
  [
    "✌️",
    "peace sign",
    (d) => {
      const skin = SKIN[1];
      const F = frame(52, 60, 19);
      const { p, xy } = F;
      const sw = 3;
      finger(d, xy(-0.46, -0.42), xy(-0.46 + Math.cos(rad(-104)) * 1.62, -0.42 + Math.sin(rad(-104)) * 1.62), 0.47 * 19, skin, sw);
      finger(d, xy(0.02, -0.42), xy(0.02 + Math.cos(rad(-76)) * 1.72, -0.42 + Math.sin(rad(-76)) * 1.72), 0.47 * 19, skin, sw);
      d.path(`M${p(-0.92, -0.58)} C${p(-0.5, -0.8)} ${p(0.5, -0.8)} ${p(0.92, -0.6)} C${p(1.02, 0)} ${p(0.94, 0.72)} ${p(0.64, 1.08)} L${p(-0.64, 1.08)} C${p(-0.92, 0.78)} ${p(-1.02, 0.2)} ${p(-0.92, -0.58)} Z`, d.fill(skin), { sw });
      // Ring and little finger folded down, the thumb holding them.
      for (const [y, x1] of [[-0.42, 0.95], [-0.02, 0.9]] as const) finger(d, xy(0.18, y), xy(x1, y), 0.44 * 19, skin, sw);
      finger(d, xy(-0.82, 0.55), xy(0.42, 0.12), 0.52 * 19, skin, sw);
      d.path(rrF(F, -0.86, 0.98, 1.72, 0.62, 0.22), d.fill(P.sky, "v"), { sw });
      const sh = xy(-0.5, -0.2);
      d.shine(sh[0], sh[1], 3.5, 2, 0.45, -30);
    },
  ],
  [
    "💃",
    "dancing woman",
    (d) => {
      const x = 48;
      const foot = 91;
      const h = 86;
      d.shadow(50, 93, 24);
      figure(d, x, foot, h, { skin: 2, hair: "bun", hairColor: HAIR.black, shirt: P.red }, pose([-100, -62], [150, 168], [-6, 0], [34, 18]), MOODS.joy, { adult: true, dress: true, pants: SKIN[2], shoes: P.red });
      // A ruffled skirt swirling out.
      const skirt = `M${x - 8} 48 L${x + 8} 48 C${x + 14} 54 ${x + 24} 59 ${x + 31} 61 Q${x + 29} 67 ${x + 22} 66 Q${x + 18} 72 ${x + 11} 70 Q${x + 6} 75 ${x} 73 Q${x - 6} 76 ${x - 11} 73 Q${x - 17} 76 ${x - 20} 71 C${x - 17} 62 ${x - 12} 54 ${x - 8} 48 Z`;
      d.path(skirt, d.fill(P.red, "v"), { sw: 3 });
      d.stroke(`M${x - 14} 66 Q${x} 64 ${x + 22} 60`, { sw: 2.2, color: P.red[2] });
      note(d, 80, 30, 5.5, P.gold);
    },
  ],
  [
    "🏄",
    "surfing",
    (d) => {
      const wave = "M6 92 L6 50 Q8 24 30 18 Q46 14 52 26 Q42 22 36 30 Q32 40 42 50 Q56 62 72 66 Q86 68 94 66 L94 90 Q94 92 92 92 Z";
      d.path(wave, d.fill(P.sky, "v"), { sw: 3 });
      d.path("M40 22 Q48 18 52 26 Q44 23 38 28 Z", "#ffffff", { sw: 2.2 });
      d.stroke("M14 78 Q24 72 34 78 M56 84 Q66 78 76 84", { sw: 2.4, color: "#ffffff", op: 0.7 });
      d.g("rotate(-10 62 70)", (g) => {
        g.ellipse(62, 70, 27, 5.5, g.fill(P.orange, "v"), { sw: 3 });
        g.stroke("M40 70 L84 70", { sw: 2, color: "#ffffff", op: 0.8 });
      });
      figure(d, 62, 67, 58, { skin: 3, hair: "curly", hairColor: HAIR.blond, shirt: P.teal }, pose([-100, -80], [100, 80], [-34, 10], [34, -10]), MOODS.joy, { pants: P.coral });
      for (const [x, y, r] of [[90, 54, 2.4], [84, 48, 1.8], [30, 12, 2]] as const) d.circle(x, y, r, d.fill(P.sky), { sw: 1.6 });
    },
  ],
  [
    "🧑‍🚀",
    "astronaut",
    (d) => {
      const cx = 50;
      const cy = 42;
      const r = 19;
      d.path("M10 99 Q10 72 32 68 Q50 74 68 68 Q90 72 90 99 Z", d.fill(P.white, "v"), { sw: 3 });
      d.path(rr(39, 80, 22, 13, 3), d.fill(P.steel, "v"), { sw: 2.4 });
      for (const [x, c] of [[44, P.red], [50, P.gold], [56, P.sky]] as const) d.circle(x, 86.5, 2.2, d.fill(c), { sw: 1.4 });
      d.path(star(22, 84, 5), d.fill(P.gold), { sw: 1.6 });
      helmet(d, cx, cy, r, () => head(d, cx, cy + 2, r, { skin: 1, hair: "short", hairColor: HAIR.brown }, MOODS.joy));
    },
  ],
  [
    "☝️",
    "one finger up",
    (d) => {
      // A fist with the pointer finger standing straight up: "one".
      const skin = SKIN[4];
      finger(d, [38, 56], [38, 10], 14, skin, 3.2);
      d.path(rr(36, 76, 30, 18, 6), d.fill(P.sky, "v"), { sw: 3 });
      d.path(rr(26, 40, 50, 42, 15), d.fill(skin), { sw: 3.4 });
      for (let i = 0; i < 3; i++) d.path(rr(45.5 + i * 9.8, 42, 9.8, 24, 4.9), d.fill(skin), { sw: 2.6 });
      finger(d, [32, 70], [62, 64], 13, skin, 3);
      d.shine(34, 22, 2, 6, 0.5, 0);
    },
  ],
  [
    "👯",
    "dancing twins",
    (d) => {
      const h = 76;
      const foot = 91;
      const hd = figHead(foot, h);
      d.shadow(50, 93, 40);
      for (const x of [30, 70]) {
        for (const s of [-1, 1]) {
          const ex = x + s * 6;
          const ey = hd.cy - hd.r * 1.25;
          d.ellipse(ex, ey, 4.2, 10, d.fill(P.black, "v"), { sw: 2.6, tf: `rotate(${s * 14} ${ex} ${ey})` });
          d.ellipse(ex, ey + 1, 1.8, 6.5, P.pink[1], { stroke: null, tf: `rotate(${s * 14} ${ex} ${ey})` });
        }
        figure(d, x, foot, h, { skin: 1, hair: "long", hairColor: HAIR.black, shirt: P.pink }, pose([-150, -166], [52, -40], [-6, 0], [26, -6]), MOODS.joy, { dress: true, pants: SKIN[1], shoes: P.pink });
        d.stroke(`M${x - hd.r * 0.9} ${f2(hd.cy - hd.r * 0.62)} Q${x} ${f2(hd.cy - hd.r * 1.32)} ${x + hd.r * 0.9} ${f2(hd.cy - hd.r * 0.62)}`, { sw: 2.8, color: P.black[1] });
      }
    },
  ],
  [
    "✊",
    "raised fist",
    (d) => {
      d.path(rr(36, 70, 30, 22, 7), d.fill(P.green, "v"), { sw: 3 });
      fist(d, 50, 44, 1, SKIN[0]);
    },
  ],
  [
    "🧑‍⚕️",
    "doctor",
    (d) => {
      const cx = 50;
      const cy = 40;
      const r = 22;
      bust(d, cx, cy, r, { skin: 4, hair: "short", hairColor: HAIR.black, shirt: P.white }, MOODS.happy, 98, "none");
      const top = cy + r * 0.86;
      d.path(`M${cx - 11} ${top + 1} L${cx} ${top + 20} L${cx + 11} ${top + 1} Z`, d.fill(P.teal, "v"), { sw: 2.4 });
      for (const s of [-1, 1]) d.path(`M${cx + s * 11} ${top + 1} L${cx + s * 4} ${top + 24} L${cx + s * 19} ${top + 10} Z`, d.fill(P.white), { sw: 2.4 });
      // Stethoscope around the neck.
      d.tube(`M${cx - 15} ${top + 2} Q${cx - 18} ${top + 22} ${cx - 6} ${top + 28}`, "#4a5470", 3.2, 1.6);
      d.tube(`M${cx + 15} ${top + 2} Q${cx + 20} ${top + 18} ${cx + 18} ${top + 24}`, "#4a5470", 3.2, 1.6);
      d.circle(cx + 18, top + 28, 5.2, d.fill(P.silver), { sw: 2.4 });
      d.circle(cx + 18, top + 28, 2.2, P.steel[1], { stroke: null });
      d.path(rr(cx - 26, top + 18, 10, 9, 2), d.fill(P.white), { sw: 2 });
      d.tube(`M${cx - 19} ${top + 14} L${cx - 19} ${top + 22}`, P.blue[1], 2.4, 1.4);
    },
  ],
  [
    "🙆",
    "arms in a circle",
    (d) => {
      const skin = SKIN[2];
      for (const s of [-1, 1]) {
        d.tube(`M${50 + s * 24} 84 Q${50 + s * 34} 64 ${50 + s * 34} 48`, P.coral[1], 11, 3);
        d.tube(`M${50 + s * 34} 48 Q${50 + s * 33} 22 ${50 + s * 6} 14`, skin[1], 9.5, 3);
      }
      d.circle(50, 13.5, 6, d.fill(skin), { sw: 3 });
      bust(d, 50, 56, 19, { skin: 2, hair: "short", hairColor: HAIR.auburn, shirt: P.coral }, MOODS.joy);
    },
  ],
  [
    "👪",
    "family",
    (d) => {
      d.path(heart(50, 16, 8), d.fill(P.pink), { sw: 2.6 });
      bust(d, 29, 37, 17, { skin: 3, hair: "short", hairColor: HAIR.black, shirt: P.green }, MOODS.happy, 98, "v");
      bust(d, 71, 37, 17, { skin: 3, hair: "bun", hairColor: HAIR.black, shirt: P.gold }, MOODS.happy, 98);
      d.path("M32 99 Q32 82 44 79 Q50 82 56 79 Q68 82 68 99 Z", d.fill(P.sky, "v"), { sw: 3 });
      head(d, 50, 66, 14, { skin: 3, hair: "baby", hairColor: HAIR.black }, { eyes: "dot", brows: "none", mouth: "smile", extras: ["blush"] });
    },
  ],
  [
    "🚴",
    "riding a bike",
    (d) => {
      const wheel = (x: number, y: number) => {
        d.circle(x, y, 14, "none", { sw: 9, stroke: OL });
        d.circle(x, y, 14, "none", { sw: 3.6, stroke: P.ink[1] });
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI;
          d.line(x - Math.cos(a) * 11, y - Math.sin(a) * 11, x + Math.cos(a) * 11, y + Math.sin(a) * 11, { sw: 1.2, color: P.steel[1] });
        }
        d.circle(x, y, 3, d.fill(P.silver), { sw: 1.8 });
      };
      wheel(24, 76);
      wheel(76, 76);
      const bb: XY = [49, 77];
      for (const [x1, y1, x2, y2] of [[bb[0], bb[1], 41, 56], [42, 59, 69, 54], [bb[0], bb[1], 70, 58], [bb[0], bb[1], 24, 76], [42, 58, 24, 76], [69, 52, 76, 76]] as const) d.tube(`M${x1} ${y1} L${x2} ${y2}`, P.red[1], 4.2, 2.2);
      d.tube("M69 53 L67 45 L61 44", P.ink[1], 3.2, 2);
      d.path("M33 55 Q40 52 46 55 Q40 58 33 55 Z", d.fill(P.black), { sw: 2.2 });
      // The rider: hips on the seat, hands on the bars, feet on the pedals.
      const h = 76;
      const hip = 55;
      const x = 40;
      const hd = figHead(hip + h * 0.33, h);
      const legL = (h * 0.33) / 2;
      const armL = h * 0.15;
      const legB = reach(x - hd.limbW * 0.5, hip, 43, 72, legL, 1);
      const legF = reach(x + hd.limbW * 0.5, hip, 55, 80, legL, 1);
      const armB = reach(x - hd.limbW * 1.3, hd.shY, 62, 44, armL, -1);
      const armF = reach(x + hd.limbW * 1.3, hd.shY, 62, 44, armL, -1);
      figure(d, x, hip + h * 0.33, h, { skin: 1, hair: "short", hairColor: HAIR.brown, shirt: P.lime }, pose(armB, armF, legB, legF), MOODS.joy, { pants: P.blue });
      // Helmet.
      const r = hd.r;
      d.path(`M${x - r * 1.12} ${f2(hd.cy - r * 0.22)} Q${x - r * 1.18} ${f2(hd.cy - r * 1.42)} ${x} ${f2(hd.cy - r * 1.42)} Q${x + r * 1.2} ${f2(hd.cy - r * 1.42)} ${x + r * 1.16} ${f2(hd.cy - r * 0.22)} Z`, d.fill(P.sky), { sw: 2.8 });
      d.stroke(`M${x - r * 0.3} ${f2(hd.cy - r * 1.38)} Q${x + r * 0.2} ${f2(hd.cy - r * 0.9)} ${x + r * 0.8} ${f2(hd.cy - r * 0.6)}`, { sw: 2.4, color: P.sky[2] });
      d.shine(x - r * 0.5, hd.cy - r * 1.05, 3, 1.6, 0.6, -20);
    },
  ],
  [
    "🤰",
    "pregnant mom",
    (d) => {
      const x = 44;
      const skin = SKIN[3];
      const look: Look = { skin: 3, hair: "long", hairColor: HAIR.brown };
      d.shadow(50, 93, 24);
      // Legs and shoes.
      for (const s of [-1, 1]) {
        d.tube(`M${x + s * 4} 66 L${x + s * 4.5} 87`, skin[1], 7, 2.6);
        d.ellipse(x + s * 4.5 + 2.5, 89, 6, 3.6, d.fill(P.violet, "v"), { sw: 2.4 });
      }
      // The far arm hangs down; the dress rounds out over the baby.
      d.tube(`M${x - 9} 36 L${x - 13} 50`, P.violet[1], 7.5, 2.6);
      d.tube(`M${x - 13} 50 L${x - 14} 62`, skin[1], 6.4, 2.6);
      d.circle(x - 14, 64, 4.2, d.fill(skin), { sw: 2.4 });
      d.rect(x - 3.5, 30, 7, 6, 2, skin[1], { sw: 2.4 });
      const dress = `M${x - 10} 34 L${x + 10} 34 C${x + 12} 40 ${x + 12} 43 ${x + 13} 45 C${x + 28} 48 ${x + 31} 64 ${x + 18} 70 L${x + 18} 73 Q${x} 77 ${x - 16} 73 L${x - 11} 44 Z`;
      d.path(dress, d.fill(P.violet, "v"), { sw: 3 });
      d.stroke(`M${x + 11} 50 Q${x + 22} 54 ${x + 18} 66`, { sw: 2.2, color: P.violet[2], op: 0.7 });
      d.path(heart(x + 17, 58, 4), d.fill(P.pink), { sw: 1.6 });
      // The near arm, a hand resting on the bump.
      d.tube(`M${x + 9} 36 L${x + 13} 47`, P.violet[1], 7.5, 2.6);
      d.tube(`M${x + 13} 47 L${x + 21} 50`, skin[1], 6.4, 2.6);
      d.circle(x + 22.5, 50.5, 4.4, d.fill(skin), { sw: 2.4 });
      head(d, x, 21, 12.5, look, MOODS.happy);
    },
  ],
  [
    "🧝",
    "elf",
    (d) => {
      const cx = 50;
      const cy = 50;
      const r = 20;
      for (const s of [-1, 1]) d.path(`M${cx + s * r * 0.8} ${cy + r * 0.32} Q${cx + s * r * 1.45} ${cy - r * 0.05} ${cx + s * r * 1.78} ${cy - r * 0.78} Q${cx + s * r * 1.2} ${cy - r * 0.42} ${cx + s * r * 0.82} ${cy - r * 0.22} Z`, d.fill(SKIN[0]), { sw: 2.6 });
      bust(d, cx, cy, r, { skin: 0, hair: "short", hairColor: HAIR.blond, shirt: P.green }, MOODS.joy, 98, "none");
      const top = cy + r * 0.86;
      d.path(`M${cx - 18} ${top + 2} L${cx - 13} ${top + 12} L${cx - 7} ${top + 6} L${cx} ${top + 14} L${cx + 7} ${top + 6} L${cx + 13} ${top + 12} L${cx + 18} ${top + 2} Q${cx} ${top + 8} ${cx - 18} ${top + 2} Z`, d.fill(P.lime), { sw: 2.4 });
      // Pointy hat with a floppy tip.
      d.path(`M${cx - r * 1.08} ${cy - r * 0.42} Q${cx - r * 0.7} ${cy - r * 1.75} ${cx + r * 0.25} ${cy - r * 2.05} Q${cx + r * 0.95} ${cy - r * 2.2} ${cx + r * 1.5} ${cy - r * 1.62} Q${cx + r * 0.95} ${cy - r * 1.58} ${cx + r * 0.78} ${cy - r * 1.18} Q${cx + r * 1.02} ${cy - r * 0.8} ${cx + r * 1.08} ${cy - r * 0.42} Z`, d.fill(P.forest), { sw: 3 });
      d.path(`M${cx - r * 1.1} ${cy - r * 0.68} Q${cx} ${cy - r * 0.9} ${cx + r * 1.1} ${cy - r * 0.68} L${cx + r * 1.08} ${cy - r * 0.38} Q${cx} ${cy - r * 0.6} ${cx - r * 1.08} ${cy - r * 0.38} Z`, d.fill(P.red), { sw: 2.4 });
      d.circle(cx + r * 1.52, cy - r * 1.58, 4, d.fill(P.gold), { sw: 2 });
      d.shine(cx - r * 0.45, cy - r * 1.3, 2.4, 5, 0.45, 30);
    },
  ],
  [
    "👩‍🚀",
    "astronaut woman",
    (d) => {
      const cx = 50;
      const cy = 42;
      const r = 19;
      d.path("M10 99 Q10 72 32 68 Q50 74 68 68 Q90 72 90 99 Z", d.fill(P.white, "v"), { sw: 3 });
      d.path(rr(39, 80, 22, 13, 3), d.fill(P.violet, "v"), { sw: 2.4 });
      for (const [x, c] of [[44, P.pink], [50, P.gold], [56, P.sky]] as const) d.circle(x, 86.5, 2.2, d.fill(c), { sw: 1.4 });
      d.path(heart(78, 84, 5), d.fill(P.pink), { sw: 1.6 });
      helmet(d, cx, cy, r, () => head(d, cx, cy + 2, r, { skin: 4, hair: "long", hairColor: HAIR.black }, MOODS.happy));
    },
  ],
  [
    "🧚",
    "fairy",
    (d) => {
      const cx = 46;
      const cy = 44;
      const r = 19;
      for (const s of [-1, 1]) {
        d.path(`M${cx + s * 8} 66 Q${cx + s * 28} 8 ${cx + s * 44} 20 Q${cx + s * 52} 38 ${cx + s * 14} 70 Z`, "rgba(214,193,255,0.8)", { sw: 2.6 });
        d.path(`M${cx + s * 10} 72 Q${cx + s * 40} 66 ${cx + s * 40} 84 Q${cx + s * 30} 94 ${cx + s * 10} 78 Z`, "rgba(196,235,255,0.85)", { sw: 2.6 });
        d.shine(cx + s * 32, 26, 3, 7, 0.7, s * 35);
      }
      bust(d, cx, cy, r, { skin: 2, hair: "long", hairColor: HAIR.blond, shirt: P.pink }, MOODS.joy, 98);
      for (const [x, c] of [[cx - 10, P.pink], [cx - 3, P.gold], [cx + 4, P.sky], [cx + 11, P.pink]] as const) d.circle(x, cy - r * 0.98 + Math.abs(x - cx) * 0.18, 3, d.fill(c), { sw: 1.6 });
      // Wand.
      d.tube("M76 86 L84 42", P.wood[1], 3.4, 2);
      d.circle(76, 86, 4.4, SKIN[2][1], { sw: 2.4 });
      d.path(star(85, 35, 9), d.fill(P.gold), { sw: 2.4 });
      d.sparkle(70, 26, 4);
      d.sparkle(92, 52, 3.2);
    },
  ],
  [
    "🧞",
    "genie",
    (d) => {
      const skin = SKIN[3];
      // The magic lamp.
      d.tube("M34 78 Q24 74 14 66", P.gold[1], 7, 3);
      d.stroke("M76 74 Q88 73 86 82 Q84 88 75 86", { sw: 8.6 });
      d.stroke("M76 74 Q88 73 86 82 Q84 88 75 86", { sw: 3.6, color: P.gold[1] });
      d.path("M28 80 Q32 70 54 70 Q76 70 80 80 Q76 90 54 90 Q32 90 28 80 Z", d.fill(P.gold), { sw: 3 });
      d.path(rr(44, 88, 20, 6, 3), d.fill(P.orange, "v"), { sw: 2.6 });
      d.shine(42, 76, 7, 2.6, 0.6, -10);
      // A smoky tail rising out of the spout.
      const tail = "M38 56 C26 60 16 56 12 64 C18 64 24 70 36 70 C48 70 58 62 62 56 Z";
      d.path(tail, d.fill(P.violet), { sw: 3 });
      d.stroke("M20 64 Q30 66 40 62", { sw: 2.2, color: P.violet[2] });
      // Body, vest and crossed arms.
      d.path(rr(36, 32, 28, 26, 10), d.fill(skin), { sw: 3 });
      for (const s of [-1, 1]) d.path(`M${50 + s * 13} 33 L${50 + s * 4} 33 L${50 + s * 7} 57 L${50 + s * 13} 57 Z`, d.fill(P.red), { sw: 2.4 });
      d.tube("M36 38 Q40 50 60 48", skin[1], 8, 3);
      d.tube("M64 38 Q60 50 40 48", skin[1], 8, 3);
      head(d, 50, 21, 12, { skin: 3, hair: "bun", hairColor: HAIR.black }, MOODS.joy);
      d.circle(38.2, 26, 1.8, "none", { sw: 1.6, stroke: P.gold[2] });
      d.sparkle(84, 20, 5);
    },
  ],
  [
    "👷",
    "builder",
    (d) => {
      const cx = 50;
      const cy = 47;
      const r = 21;
      bust(d, cx, cy, r, { skin: 2, hair: "short", hairColor: HAIR.brown, shirt: P.orange }, MOODS.happy, 98, "v");
      const top = cy + r * 0.86;
      const body = `M${cx - r * 1.55} 98 Q${cx - r * 1.6} ${top + r * 0.3} ${cx - r * 0.7} ${top} Q${cx} ${top + r * 0.22} ${cx + r * 0.7} ${top} Q${cx + r * 1.6} ${top + r * 0.3} ${cx + r * 1.55} 98 Z`;
      d.clip(body, (c) => {
        for (const y of [84, 92]) c.rect(cx - 40, y - 2.4, 80, 4.8, 0, "#fff6a8", { sw: 1.6 });
      });
      // Hard hat.
      d.path(`M${cx - r * 1.02} ${cy - r * 0.42} Q${cx - r * 1.08} ${cy - r * 1.45} ${cx} ${cy - r * 1.48} Q${cx + r * 1.08} ${cy - r * 1.45} ${cx + r * 1.02} ${cy - r * 0.42} Z`, d.fill(P.gold), { sw: 3 });
      d.path(rr(cx - r * 1.3, cy - r * 0.58, r * 2.6, r * 0.28, r * 0.14), d.fill(P.gold, "v"), { sw: 2.8 });
      d.path(rr(cx - 3.5, cy - r * 1.45, 7, r * 0.9, 3.5), d.fill(P.orange, "v"), { sw: 2.2 });
      d.shine(cx - r * 0.55, cy - r * 1.05, 3.4, 6, 0.6, 25);
    },
  ],
  [
    "👨‍👩‍👦",
    "family with a boy",
    (d) => {
      bust(d, 30, 34, 17, { skin: 4, hair: "short", hairColor: HAIR.black, beard: HAIR.black, shirt: P.teal }, MOODS.happy, 98);
      bust(d, 70, 34, 17, { skin: 4, hair: "long", hairColor: HAIR.black, shirt: P.gold }, MOODS.happy, 98);
      bust(d, 50, 61, 15, { skin: 4, hair: "curly", hairColor: HAIR.black, shirt: P.blue }, MOODS.joy, 98);
    },
  ],
  [
    "👳",
    "person with a turban",
    (d) => {
      const cx = 50;
      const cy = 51;
      const r = 21;
      bust(d, cx, cy, r, { skin: 3, hair: "none", beard: HAIR.black, shirt: P.blue }, MOODS.happy, 98, "v");
      const t = `M${cx - r * 1.1} ${cy - r * 0.28} Q${cx - r * 1.28} ${cy - r * 1.52} ${cx} ${cy - r * 1.66} Q${cx + r * 1.28} ${cy - r * 1.52} ${cx + r * 1.1} ${cy - r * 0.28} Q${cx} ${cy - r * 0.62} ${cx - r * 1.1} ${cy - r * 0.28} Z`;
      d.path(t, d.fill(P.orange), { sw: 3 });
      d.clip(t, (c) => {
        for (const k of [0, 1, 2]) c.stroke(`M${cx - r * 1.2} ${cy - r * (0.5 + k * 0.38)} Q${cx - r * 0.1} ${cy - r * (0.62 + k * 0.42)} ${cx + r * 1.2} ${cy - r * (1.15 + k * 0.36)}`, { sw: 2.2, color: P.orange[2] });
      });
      d.path(t, "none", { sw: 3 });
      d.path(`M${cx} ${cy - r * 0.62} L${cx - 4} ${cy - r * 1.05} L${cx + 4} ${cy - r * 1.05} Z`, d.fill(P.orange, "v"), { sw: 2 });
      d.shine(cx - r * 0.6, cy - r * 1.2, 5, 2.6, 0.5, -25);
    },
  ],
];
