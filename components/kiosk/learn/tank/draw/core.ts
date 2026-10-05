import { mix, shade } from "../color";
import type { Look } from "../species";

// Shared pieces for drawing creatures: the pose a creature is drawn in, smooth outlines,
// interpolated body contours, eyes, and the depth-fogged palette.

export const TAU = Math.PI * 2;
type Ctx = CanvasRenderingContext2D;
type PathLike = CanvasRenderingContext2D | Path2D;

/** Everything about one moment of a creature's motion. Angles in radians; 0..1 amounts. */
export type Pose = {
  t: number;
  /** Swim cycle (tail beat / flipper stroke / walk). */
  phase: number;
  /** How hard it's swimming (0 = gliding). */
  amp: number;
  /** −1 (facing left) … 1 (facing right); passes through 0 while it turns around. */
  facing: number;
  /** Nose up (−) / down (+), for a creature facing right. */
  pitch: number;
  /** Body curve while turning or climbing. */
  bend: number;
  mouth: number;
  blink: number;
  /** Where the eyes look, in tank space (−1..1 each way). */
  lookX: number;
  lookY: number;
  puff: number;
  /** A tap reaction's progress (1 → 0). */
  react: number;
  tuck: number;
  walk: number;
  /** Otter on its back / seal barrel roll: 0 … 1. */
  roll: number;
  dabble: number;
  /** Fin, flipper or wing beat. */
  flap: number;
  /** Jet propulsion (octopus, squid): arms stream behind. */
  jet: number;
  /** Raise the head (plesiosaur) or claws (crab). */
  nod: number;
  claw: number;
  sleep: number;
  baby: number;
  royal: boolean;
  /** Depth haze toward the water color (0 = right at the glass). */
  fog: number;
  fogColor: string;
};

export const restPose = (): Pose => ({
  t: 0, phase: 0, amp: 0.4, facing: 1, pitch: 0, bend: 0, mouth: 0, blink: 0, lookX: 0, lookY: 0, puff: 0, react: 0, tuck: 0,
  walk: 0, roll: 0, dabble: 0, flap: 0, jet: 0, nod: 0, claw: 0, sleep: 0, baby: 0, royal: false, fog: 0, fogColor: "#2a8fd4",
});

/** Catmull-Rom through [x, y] keys (sorted by x), clamped at the ends. */
export function keysAt(keys: [number, number][], x: number): number {
  const n = keys.length;
  if (x <= keys[0][0]) return keys[0][1];
  if (x >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 0;
  while (i < n - 2 && x > keys[i + 1][0]) i++;
  const p0 = keys[Math.max(0, i - 1)];
  const p1 = keys[i];
  const p2 = keys[i + 1];
  const p3 = keys[Math.min(n - 1, i + 2)];
  const t = (x - p1[0]) / (p2[0] - p1[0] || 1);
  const m1 = ((p2[1] - p0[1]) / (p2[0] - p0[0] || 1)) * (p2[0] - p1[0]);
  const m2 = ((p3[1] - p1[1]) / (p3[0] - p1[0] || 1)) * (p2[0] - p1[0]);
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * p1[1] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[1] + (t3 - t2) * m2;
}

/** A smooth closed curve through a flat [x0, y0, x1, y1, …] polygon (corners become curves). */
export function smoothClosed(p: PathLike, pts: number[]) {
  const n = pts.length / 2;
  if (n < 3) return;
  const mx = (i: number) => (pts[(i % n) * 2] + pts[((i + 1) % n) * 2]) / 2;
  const my = (i: number) => (pts[(i % n) * 2 + 1] + pts[((i + 1) % n) * 2 + 1]) / 2;
  p.moveTo(mx(n - 1), my(n - 1));
  for (let i = 0; i < n; i++) p.quadraticCurveTo(pts[i * 2], pts[i * 2 + 1], mx(i), my(i));
  p.closePath();
}

/** A smooth open curve through points (passes through the first and last). */
export function smoothOpen(p: PathLike, pts: number[], move = true) {
  const n = pts.length / 2;
  if (n < 2) return;
  if (move) p.moveTo(pts[0], pts[1]);
  else p.lineTo(pts[0], pts[1]);
  if (n === 2) return void p.lineTo(pts[2], pts[3]);
  for (let i = 1; i < n - 1; i++) p.quadraticCurveTo(pts[i * 2], pts[i * 2 + 1], (pts[i * 2] + pts[i * 2 + 2]) / 2, (pts[i * 2 + 1] + pts[i * 2 + 3]) / 2);
  p.lineTo(pts[(n - 1) * 2], pts[(n - 1) * 2 + 1]);
}

/** A tapered ribbon along a center line (arms, tentacles, necks, kelp…): widths per point. */
export function ribbon(p: PathLike, xs: number[], ys: number[], ws: number[]) {
  const n = xs.length;
  const left: number[] = [];
  const right: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = i < n - 1 ? Math.atan2(ys[i + 1] - ys[i], xs[i + 1] - xs[i]) : Math.atan2(ys[i] - ys[i - 1], xs[i] - xs[i - 1]);
    const nx = -Math.sin(a) * ws[i] * 0.5;
    const ny = Math.cos(a) * ws[i] * 0.5;
    left.push(xs[i] + nx, ys[i] + ny);
    right.push(xs[i] - nx, ys[i] - ny);
  }
  const pts = [...left];
  for (let i = n - 1; i >= 0; i--) pts.push(right[i * 2], right[i * 2 + 1]);
  smoothClosed(p, pts);
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const bump = (u: number, c: number, w: number) => {
  const d = (u - c) / w;
  return d <= -1 || d >= 1 ? 0 : (1 - d * d) * (1 - d * d);
};

export type EyeOpts = { iris: string; lx: number; ly: number; blink: number; sleep: number; lid: string; outline: string; dark?: boolean; slit?: boolean; hslit?: boolean; ring?: boolean };

/** A big, friendly, living eye: white, colored iris, pupil, two catch-lights; blinks and sleeps. */
export function drawEye(ctx: Ctx, x: number, y: number, r: number, o: EyeOpts) {
  const lw = Math.max(0.8, r * 0.17);
  if (o.sleep > 0.65 || o.blink > 0.9) {
    // Closed: a soft happy curve.
    ctx.beginPath();
    ctx.arc(x, y - r * 0.25, r * 0.78, 0.18 * Math.PI, 0.82 * Math.PI);
    ctx.strokeStyle = o.outline;
    ctx.lineWidth = Math.max(1, r * 0.26);
    ctx.lineCap = "round";
    ctx.stroke();
    return;
  }
  if (o.ring) {
    ctx.beginPath();
    ctx.arc(x, y, r * 1.38, 0, TAU);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  if (o.dark) {
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, "#3a3230");
    g.addColorStop(1, "#0b0908");
    ctx.fillStyle = g;
  } else {
    const g = ctx.createLinearGradient(x, y - r, x, y + r);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(1, "#dde7f1");
    ctx.fillStyle = g;
  }
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = o.outline;
  ctx.stroke();
  const px = x + clamp(o.lx, -1, 1) * r * 0.26;
  const py = y + clamp(o.ly, -1, 1) * r * 0.26;
  if (!o.dark) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r * 0.94, 0, TAU);
    ctx.clip();
    const ig = ctx.createLinearGradient(px, py - r * 0.7, px, py + r * 0.7);
    ig.addColorStop(0, shade(o.iris, 0.35));
    ig.addColorStop(1, o.iris);
    ctx.beginPath();
    ctx.arc(px, py, r * 0.7, 0, TAU);
    ctx.fillStyle = ig;
    ctx.fill();
    ctx.beginPath();
    if (o.slit) ctx.ellipse(px, py, r * 0.15, r * 0.52, 0, 0, TAU);
    else if (o.hslit) ctx.ellipse(px, py, r * 0.5, r * 0.2, 0, 0, TAU);
    else ctx.arc(px, py, r * 0.4, 0, TAU);
    ctx.fillStyle = "#05070c";
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.arc(px - r * 0.27, py - r * 0.3, r * 0.27, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(px + r * 0.22, py + r * 0.24, r * 0.11, 0, TAU);
  ctx.fill();
  const lid = Math.max(o.blink, o.sleep * 0.7);
  if (lid > 0.04) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r + lw * 0.5, 0, TAU);
    ctx.clip();
    ctx.fillStyle = o.lid;
    ctx.fillRect(x - r * 1.2, y - r * 1.2, r * 2.4, r * 0.2 + r * 2.2 * lid);
    ctx.beginPath();
    ctx.moveTo(x - r, y - r + r * 2.2 * lid);
    ctx.lineTo(x + r, y - r + r * 2.2 * lid);
    ctx.strokeStyle = o.outline;
    ctx.lineWidth = lw;
    ctx.stroke();
    ctx.restore();
  }
}

/** A little gold crown (a creature that's all grown up). */
export function drawCrown(ctx: Ctx, x: number, y: number, s: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 1.6) * 0.08);
  const w = s;
  const h = s * 0.62;
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.lineTo(-w / 2, -h * 0.55);
  ctx.lineTo(-w / 4, -h * 0.2);
  ctx.lineTo(0, -h);
  ctx.lineTo(w / 4, -h * 0.2);
  ctx.lineTo(w / 2, -h * 0.55);
  ctx.lineTo(w / 2, 0);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -h, 0, 0);
  g.addColorStop(0, "#fff3a0");
  g.addColorStop(0.5, "#ffd23a");
  g.addColorStop(1, "#e69a00");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = Math.max(1, s * 0.07);
  ctx.strokeStyle = "#a86a00";
  ctx.stroke();
  ctx.fillStyle = "#ff4f7b";
  for (const [cx, cy] of [[0, -h], [-w / 2, -h * 0.55], [w / 2, -h * 0.55]] as const) {
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.09, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** A vector heart (for "yum!" bursts). */
export function heartPath(p: PathLike, x: number, y: number, s: number) {
  p.moveTo(x, y + s * 0.35);
  p.bezierCurveTo(x - s * 0.9, y - s * 0.25, x - s * 0.45, y - s * 0.95, x, y - s * 0.45);
  p.bezierCurveTo(x + s * 0.45, y - s * 0.95, x + s * 0.9, y - s * 0.25, x, y + s * 0.35);
  p.closePath();
}

/** A 4-point sparkle. */
export function sparklePath(p: PathLike, x: number, y: number, s: number) {
  p.moveTo(x, y - s);
  p.quadraticCurveTo(x + s * 0.18, y - s * 0.18, x + s, y);
  p.quadraticCurveTo(x + s * 0.18, y + s * 0.18, x, y + s);
  p.quadraticCurveTo(x - s * 0.18, y + s * 0.18, x - s, y);
  p.quadraticCurveTo(x - s * 0.18, y - s * 0.18, x, y - s);
  p.closePath();
}

// ── Depth fog: a creature far from the glass takes on the water's color ──────────────────────
const fogCache = new WeakMap<Look, Map<string, Record<string, string>>>();
export function colorsFor(look: Look, fog: number, fogColor: string): Record<string, string> {
  const q = Math.round(clamp(fog, 0, 1) * 8) / 8;
  if (q === 0) return look.colors;
  let m = fogCache.get(look);
  if (!m) {
    m = new Map();
    fogCache.set(look, m);
  }
  const key = `${q}|${fogColor}`;
  let c = m.get(key);
  if (!c) {
    c = {};
    for (const [k, v] of Object.entries(look.colors)) c[k] = mix(v, fogColor, q * 0.55);
    m.set(key, c);
  }
  return c;
}

/** A stable pseudo-random number in [0, 1) from a string and an index. */
export function hash01(s: string, i: number): number {
  let h = 2166136261 ^ i;
  for (let k = 0; k < s.length; k++) h = Math.imul(h ^ s.charCodeAt(k), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}
