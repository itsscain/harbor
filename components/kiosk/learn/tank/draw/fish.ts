import { rgba, shade } from "../color";
import type { FishBody, Look, Pattern } from "../species";
import { TAU, bump, clamp, drawCrown, drawEye, hash01, keysAt, lerp, smoothClosed, type Pose } from "./core";

// The fish plan: everything with a backbone that swims by bending it — fish, sharks, dolphins,
// whales, the seal, the penguin, the crocodile, the plesiosaur and the sea dragon.
//
// The body is built fresh every frame from a spine of points running nose → tail. The spine
// carries a swimming wave (side-to-side fish show it as a gentle ripple and a tail fin that
// turns toward and away from you; whales and seals beat up and down), a bend while turning or
// climbing, and per-species extras (the plesiosaur lifts its neck, the sea dragon curls its
// tail). The outline is traced along the dorsal and belly contours from the species' shape keys,
// then fins, pattern, light and face are drawn on top.

type Ctx = CanvasRenderingContext2D;
const N = 18;
const SX = new Float32Array(N);
const SY = new Float32Array(N);
const SA = new Float32Array(N);
const ST = new Float32Array(N);
const SB = new Float32Array(N);

type Prof = { top: Float32Array; bot: Float32Array; maxTop: number; maxBot: number };
const profs = new WeakMap<FishBody, Prof>();
function prof(f: FishBody): Prof {
  let p = profs.get(f);
  if (!p) {
    const top = new Float32Array(N);
    const bot = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const s = i / (N - 1);
      top[i] = Math.max(0, keysAt(f.top, s));
      bot[i] = Math.max(0, keysAt(f.bot, s));
    }
    p = { top, bot, maxTop: Math.max(...top), maxBot: Math.max(...bot) };
    profs.set(f, p);
  }
  return p;
}

type Q = { x: number; y: number; a: number; top: number; bot: number };
/** The current spine, interpolated at s (0 = nose, 1 = tail base). */
function at(s: number): Q {
  const u = clamp(s, 0, 1) * (N - 1);
  const i = Math.min(N - 2, Math.floor(u));
  const t = u - i;
  return { x: SX[i] + (SX[i + 1] - SX[i]) * t, y: SY[i] + (SY[i + 1] - SY[i]) * t, a: SA[i] + (SA[i + 1] - SA[i]) * t, top: ST[i] + (ST[i + 1] - ST[i]) * t, bot: SB[i] + (SB[i + 1] - SB[i]) * t };
}
/** A point on the body: v = −1 (back edge) … 0 (spine) … 1 (belly edge); beyond ±1 is outside. */
function on(s: number, v: number): [number, number] {
  const q = at(s);
  const d = v < 0 ? v * q.top : v * q.bot;
  return [q.x - Math.sin(q.a) * d, q.y + Math.cos(q.a) * d];
}
/** A point offset from the spine by an absolute distance (+ = toward the belly). */
function off(s: number, d: number): [number, number] {
  const q = at(s);
  return [q.x - Math.sin(q.a) * d, q.y + Math.cos(q.a) * d];
}

export function drawFish(ctx: Ctx, look: Look, pose: Pose, len: number, C: Record<string, string>, id: string, lx: number) {
  const f = look.fish!;
  const L = len / (1 + f.tailLen * 0.8);
  const P = prof(f);
  const puff = pose.puff;
  // Center the whole creature, tail fin included, on the origin.
  const shift = f.tail === "taper" || f.tail === "curl" ? 0 : f.tailLen * L * 0.5;
  for (let i = 0; i < N; i++) {
    const s = i / (N - 1);
    let x = (0.5 - s) * L + shift;
    let y = 0;
    if (f.wave === "lat") y += pose.amp * 0.03 * L * Math.sin(pose.phase - 2.4 * s) * s * s;
    else y += pose.amp * 0.07 * L * Math.sin(pose.phase - 2.8 * s) * (0.12 + 0.88 * Math.pow(s, 1.6));
    y += pose.bend * 0.2 * L * s * s;
    if (f.head === "plesio" && s < 0.42) y -= pose.nod * 0.16 * L * Math.pow(1 - s / 0.42, 2);
    if (f.tail === "curl" && s > 0.66) {
      const k = (s - 0.66) / 0.34;
      y += (0.13 + 0.03 * Math.sin(pose.t * 1.3)) * L * k * k;
      x += 0.12 * L * k * k * k;
    }
    SX[i] = x;
    SY[i] = y;
    let top = P.top[i] * L;
    let bot = P.bot[i] * L;
    if (puff > 0) {
      const round = Math.sqrt(Math.max(0, 1 - Math.pow(2 * s - 1, 2))) * 0.4 * L;
      top += (Math.max(top, round) - top) * puff;
      bot += (Math.max(bot, round) - bot) * puff;
    }
    ST[i] = top;
    SB[i] = bot;
  }
  for (let i = 0; i < N; i++) {
    const a = Math.max(0, i - 1);
    const b = Math.min(N - 1, i + 1);
    SA[i] = Math.atan2(SY[a] - SY[b], SX[a] - SX[b]);
  }

  const outline = C.outline ?? shade(C.back, -0.55);
  const lw = clamp(L * 0.016, 1, 3.4);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // ── Behind the body ─────────────────────────────────────────────────────────────────────
  if (f.leaves) leaves(ctx, pose, L, C, outline, lw);
  if (f.spikes && puff > 0.15) spikes(ctx, L, puff, C, outline, lw);
  if (f.pect?.kind === "paddle") paddles(ctx, f, pose, L, C, outline, lw, true);
  if (f.pect?.kind === "legs") legs(ctx, pose, L, C, outline, lw, true);
  if (f.dorsal) {
    if (f.dorsal.kind === "ridge") ridge(ctx, f.dorsal.s0, f.dorsal.s1, f.dorsal.h * L, C, outline, lw);
    else dorsalFin(ctx, f, pose, L, C, outline, lw);
  }
  if (f.anal) finAlong(ctx, f.anal.s0, f.anal.s1, 1, (u) => Math.pow(Math.sin(Math.PI * u), 0.8) * f.anal!.h * L * (1 - puff * 0.5), 0.5, 0, pose, C, outline, lw);
  tailFin(ctx, f, pose, L, C, outline, lw);

  // ── The body ────────────────────────────────────────────────────────────────────────────
  const body = new Path2D();
  const pts: number[] = [SX[0] + Math.cos(SA[0]) * L * 0.006, SY[0] + Math.sin(SA[0]) * L * 0.006];
  for (let i = 1; i < N; i++) pts.push(SX[i] + Math.sin(SA[i]) * ST[i], SY[i] - Math.cos(SA[i]) * ST[i]);
  for (let i = N - 1; i >= 1; i--) pts.push(SX[i] - Math.sin(SA[i]) * SB[i], SY[i] + Math.cos(SA[i]) * SB[i]);
  smoothClosed(body, pts);

  const mt = P.maxTop * L * (1 + puff * 0.7);
  const mb = P.maxBot * L * (1 + puff * 0.7);
  const g = ctx.createLinearGradient(0, -mt, 0, mb);
  if (f.pattern?.some((p) => p.kind === "tuxedo")) {
    g.addColorStop(0, C.back);
    g.addColorStop(0.47, C.mid);
    g.addColorStop(0.5, C.belly);
    g.addColorStop(1, shade(C.belly, -0.08));
  } else {
    g.addColorStop(0, shade(C.back, -0.06));
    g.addColorStop(0.42, C.mid);
    g.addColorStop(1, C.belly);
  }
  ctx.fillStyle = g;
  ctx.fill(body);

  ctx.save();
  ctx.clip(body);
  for (const p of f.pattern ?? []) pattern(ctx, p, pose, L, C, id);
  // Light from above: a soft sheen on the upper body, shade along the belly.
  const hx = L * 0.15;
  const hy = -mt * 0.55;
  const hl = ctx.createRadialGradient(hx, hy, 0, hx, hy, L * 0.62);
  hl.addColorStop(0, "rgba(255,255,255,0.36)");
  hl.addColorStop(0.55, "rgba(255,255,255,0.08)");
  hl.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = hl;
  ctx.fillRect(-L, -L, L * 2, L * 2);
  const bs = ctx.createLinearGradient(0, mb * 0.3, 0, mb * 1.05);
  bs.addColorStop(0, "rgba(10,22,48,0)");
  bs.addColorStop(1, "rgba(10,22,48,0.24)");
  ctx.fillStyle = bs;
  ctx.fillRect(-L, 0, L * 2, L);
  ctx.restore();

  ctx.lineWidth = lw;
  ctx.strokeStyle = outline;
  ctx.stroke(body);

  // ── In front of the body ────────────────────────────────────────────────────────────────
  if (f.pect?.kind === "paddle") paddles(ctx, f, pose, L, C, outline, lw, false);
  else if (f.pect?.kind === "legs") legs(ctx, pose, L, C, outline, lw, false);
  else if (f.pect) pectoral(ctx, f, pose, L, C, outline, lw);
  face(ctx, f, pose, L, C, outline, lw, lx);
  if (pose.royal) {
    const [cx, cy] = off(f.head === "plesio" ? 0.03 : 0.17, -(at(f.head === "plesio" ? 0.03 : 0.17).top + L * 0.035));
    drawCrown(ctx, cx, cy, Math.max(10, L * (f.head === "plesio" ? 0.07 : 0.12)), pose.t);
  }
}

// ── Fins ─────────────────────────────────────────────────────────────────────────────────────

/** A fin along the back (side −1) or belly (side 1) from s0 to s1. */
function finAlong(ctx: Ctx, s0: number, s1: number, side: -1 | 1, h: (u: number) => number, sweep: number, wave: number, pose: Pose, C: Record<string, string>, outline: string, lw: number, color?: string) {
  const K = 12;
  const base: number[] = [];
  const outer: number[] = [];
  for (let k = 0; k <= K; k++) {
    const u = k / K;
    const q = at(lerp(s0, s1, u));
    const d = side < 0 ? -q.top * 0.82 : q.bot * 0.82;
    const nx = -Math.sin(q.a);
    const ny = Math.cos(q.a);
    const bx = q.x + nx * d;
    const by = q.y + ny * d;
    const hh = h(u);
    const w = wave ? Math.sin(pose.phase * 0.7 - u * 3.2) * wave * hh : 0;
    base.push(bx, by);
    outer.push(bx + nx * side * hh - Math.cos(q.a) * (sweep * hh + w), by + ny * side * hh - Math.sin(q.a) * (sweep * hh + w));
  }
  const path = new Path2D();
  const pts = [...base];
  for (let k = K; k >= 0; k--) pts.push(outer[k * 2], outer[k * 2 + 1]);
  smoothClosed(path, pts);
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = color ?? C.fin;
  ctx.fill(path);
  ctx.globalAlpha = 1;
  // Fin rays.
  ctx.save();
  ctx.clip(path);
  ctx.strokeStyle = rgba(shade(color ?? C.fin, -0.35), 0.35);
  ctx.lineWidth = Math.max(0.6, lw * 0.45);
  ctx.beginPath();
  for (let k = 1; k < K; k += 2) {
    ctx.moveTo(base[k * 2], base[k * 2 + 1]);
    ctx.lineTo(outer[k * 2], outer[k * 2 + 1]);
  }
  ctx.stroke();
  ctx.restore();
  ctx.lineWidth = lw * 0.85;
  ctx.strokeStyle = C.finEdge ?? outline;
  ctx.stroke(path);
}

function dorsalFin(ctx: Ctx, f: FishBody, pose: Pose, L: number, C: Record<string, string>, outline: string, lw: number) {
  const d = f.dorsal!;
  const H = d.h * L * (1 - pose.puff * 0.55);
  const shapes: Record<string, [(u: number) => number, number, number]> = {
    round: [(u) => Math.pow(Math.sin(Math.PI * u), 0.75), 0.45, 0],
    double: [(u) => Math.max(0.62 * bump(u, 0.2, 0.24), bump(u, 0.64, 0.36)), 0.35, 0],
    long: [(u) => (0.62 + 0.38 * Math.sin(Math.PI * u)) * Math.min(1, u / 0.07, (1 - u) / 0.07), 0.3, 0],
    tall: [(u) => Math.pow(u < 0.3 ? u / 0.3 : 1 - (u - 0.3) / 0.7, 1.05), 0.75, 0],
    curve: [(u) => (u < 0.55 ? Math.pow(u / 0.55, 0.85) : 1 - Math.pow((u - 0.55) / 0.45, 0.7)), 1.1, 0],
    small: [(u) => Math.pow(Math.sin(Math.PI * u), 1.2), 0.7, 0],
    flow: [(u) => Math.pow(Math.sin(Math.PI * u), 0.55), 0.55, 0.22],
  };
  const [h, sweep, wave] = shapes[d.kind] ?? shapes.round;
  finAlong(ctx, d.s0, d.s1, -1, (u) => h(u) * H, sweep, wave, pose, C, outline, lw);
}

/** Scutes along a crocodile's back. */
function ridge(ctx: Ctx, s0: number, s1: number, h: number, C: Record<string, string>, outline: string, lw: number) {
  ctx.beginPath();
  for (let s = s0; s < s1 - 0.02; s += 0.045) {
    const [ax, ay] = on(s, -0.9);
    const [bx, by] = on(s + 0.045, -0.9);
    const q = at(s + 0.0225);
    const [tx, ty] = [(ax + bx) / 2 + Math.sin(q.a) * h * (1 - (s - s0) * 0.5), (ay + by) / 2 - Math.cos(q.a) * h * (1 - (s - s0) * 0.5)];
    ctx.moveTo(ax, ay);
    ctx.lineTo(tx, ty);
    ctx.lineTo(bx, by);
  }
  ctx.fillStyle = C.fin;
  ctx.fill();
  ctx.lineWidth = lw * 0.7;
  ctx.strokeStyle = outline;
  ctx.stroke();
}

function tailFin(ctx: Ctx, f: FishBody, pose: Pose, L: number, C: Record<string, string>, outline: string, lw: number) {
  if (f.tail === "taper" || f.tail === "curl") return;
  const q = at(1);
  const tl = f.tailLen * L;
  const th = f.tailH * L * (1 - pose.puff * 0.4);
  let wag: number;
  let fs = 1;
  if (f.wave === "lat") {
    wag = pose.amp * 0.2 * Math.sin(pose.phase - 2.6);
    fs = 1 - pose.amp * 0.4 * (1 - Math.abs(Math.cos(pose.phase - 2.4)));
  } else wag = pose.amp * 0.55 * Math.cos(pose.phase - 2.9);
  ctx.save();
  ctx.translate(q.x, q.y);
  ctx.rotate(q.a + Math.PI + wag);
  ctx.scale(fs, 1);
  const p = new Path2D();
  const color = C.tail ?? C.fin;
  let alpha = 0.95;
  switch (f.tail) {
    case "fork":
      p.moveTo(0, -th * 0.22);
      p.quadraticCurveTo(tl * 0.45, -th * 0.45, tl, -th);
      p.quadraticCurveTo(tl * 0.62, -th * 0.25, tl * 0.6, 0);
      p.quadraticCurveTo(tl * 0.62, th * 0.25, tl, th);
      p.quadraticCurveTo(tl * 0.45, th * 0.45, 0, th * 0.22);
      p.closePath();
      break;
    case "lunate":
      p.moveTo(0, -th * 0.18);
      p.quadraticCurveTo(tl * 0.5, -th * 0.45, tl * 1.02, -th);
      p.quadraticCurveTo(tl * 0.62, -th * 0.18, tl * 0.58, 0);
      p.quadraticCurveTo(tl * 0.62, th * 0.18, tl * 1.02, th);
      p.quadraticCurveTo(tl * 0.5, th * 0.45, 0, th * 0.18);
      p.closePath();
      break;
    case "round":
      p.moveTo(0, -th * 0.3);
      p.bezierCurveTo(tl * 0.45, -th * 1.05, tl * 1.05, -th * 0.85, tl * 1.02, 0);
      p.bezierCurveTo(tl * 1.05, th * 0.85, tl * 0.45, th * 1.05, 0, th * 0.3);
      p.closePath();
      break;
    case "shark":
      p.moveTo(0, -th * 0.16);
      p.quadraticCurveTo(tl * 0.5, -th * 0.55, tl * 1.05, -th * 1.12);
      p.quadraticCurveTo(tl * 0.72, -th * 0.25, tl * 0.56, th * 0.04);
      p.quadraticCurveTo(tl * 0.6, th * 0.3, tl * 0.64, th * 0.62);
      p.quadraticCurveTo(tl * 0.3, th * 0.35, 0, th * 0.14);
      p.closePath();
      break;
    case "fluke":
      p.moveTo(0, -th * 0.16);
      p.quadraticCurveTo(tl * 0.45, -th * 0.22, tl * 0.82, -th * 0.62);
      p.quadraticCurveTo(tl * 1.08, -th * 0.72, tl * 0.98, -th * 0.2);
      p.quadraticCurveTo(tl * 0.86, 0, tl * 0.98, th * 0.2);
      p.quadraticCurveTo(tl * 1.08, th * 0.72, tl * 0.82, th * 0.62);
      p.quadraticCurveTo(tl * 0.45, th * 0.22, 0, th * 0.16);
      p.closePath();
      break;
    case "fan": {
      alpha = 0.8;
      const w = (d: number) => Math.sin(pose.phase * 0.8 - d * 3) * th * 0.13 * (0.45 + pose.amp);
      const pts: number[] = [0, -th * 0.2, tl * 0.32, -th * 0.72 + w(0.2), tl * 0.78, -th * 1.02 + w(0.45)];
      for (let k = 0; k <= 8; k++) {
        const u = k / 8;
        const notch = 1 - 0.3 * bump(u, 0.5, 0.32);
        pts.push(tl * notch * (0.97 + 0.06 * Math.sin(pose.t * 2.6 - u * 4)), lerp(-th * 0.96, th * 0.96, u) + w(0.9 + u * 0.15));
      }
      pts.push(tl * 0.78, th * 1.02 + w(0.45), tl * 0.32, th * 0.72 + w(0.2), 0, th * 0.2);
      smoothClosed(p, pts);
      break;
    }
    case "flipper":
      for (const sgn of [-1, 1]) {
        const sw = Math.sin(pose.phase - 2.8) * 0.12 * sgn;
        p.moveTo(0, sgn * th * 0.1);
        p.bezierCurveTo(tl * 0.4, sgn * th * 0.15, tl * 0.75, sgn * th * (0.95 + sw), tl * 1.02, sgn * th * (0.85 + sw));
        p.quadraticCurveTo(tl * 0.9, sgn * th * 0.3, tl * 0.55, sgn * th * 0.02);
        p.closePath();
      }
      break;
    case "feet": {
      p.moveTo(0, -th * 0.35);
      p.quadraticCurveTo(tl * 0.5, -th * 0.4, tl * 0.75, -th * 0.05);
      p.quadraticCurveTo(tl * 0.5, th * 0.25, 0, th * 0.35);
      p.closePath();
      break;
    }
  }
  ctx.globalAlpha = alpha;
  if (f.tail === "fan") {
    const fg = ctx.createLinearGradient(0, 0, tl, 0);
    fg.addColorStop(0, color);
    fg.addColorStop(1, rgba(shade(color, 0.45), 0.55));
    ctx.fillStyle = fg;
  } else ctx.fillStyle = f.tail === "feet" ? C.back : color;
  ctx.fill(p);
  ctx.globalAlpha = 1;
  if (f.tail !== "flipper" && f.tail !== "feet") {
    ctx.save();
    ctx.clip(p);
    ctx.strokeStyle = rgba(shade(color, -0.35), f.tail === "fan" ? 0.3 : 0.32);
    ctx.lineWidth = Math.max(0.6, lw * 0.45);
    ctx.beginPath();
    for (let k = -3; k <= 3; k++) {
      ctx.moveTo(0, k * th * 0.06);
      ctx.lineTo(tl * 1.05, k * th * 0.32);
    }
    ctx.stroke();
    ctx.restore();
  }
  ctx.lineWidth = lw * 0.85;
  ctx.strokeStyle = C.finEdge ?? outline;
  ctx.stroke(p);
  if (f.tail === "feet") {
    // Two orange feet trailing behind (this frame is turned half around, so "down" is −y).
    for (const [dy, ph] of [[-th * 0.25, 0], [-th * 0.45, 1.3]] as const) {
      const kick = Math.sin(pose.phase + ph) * 0.25;
      ctx.save();
      ctx.translate(tl * 0.2, dy);
      ctx.rotate(-0.35 - kick);
      ctx.beginPath();
      ctx.moveTo(0, -th * 0.12);
      ctx.lineTo(tl * 0.75, -th * 0.28);
      ctx.lineTo(tl * 0.82, th * 0.0);
      ctx.lineTo(tl * 0.75, th * 0.28);
      ctx.lineTo(0, th * 0.12);
      ctx.closePath();
      ctx.fillStyle = C.feet ?? "#ff9b1c";
      ctx.fill();
      ctx.lineWidth = lw * 0.7;
      ctx.strokeStyle = shade(C.feet ?? "#ff9b1c", -0.4);
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
}

function pectoral(ctx: Ctx, f: FishBody, pose: Pose, L: number, C: Record<string, string>, outline: string, lw: number) {
  const pc = f.pect!;
  const q = at(pc.s);
  const [bx, by] = off(pc.s, pc.v * L * (1 + pose.puff * 0.4));
  const len = pc.len * L;
  const w = pc.w * L;
  let ang: number;
  switch (pc.kind) {
    case "wing":
      ang = Math.PI - 0.4 + Math.sin(pose.flap) * 0.85;
      break;
    case "flipper":
      ang = Math.PI - 0.75 + Math.sin(pose.flap * 0.6) * 0.22;
      break;
    case "long":
      ang = Math.PI - 0.85 + Math.sin(pose.flap * 0.45) * 0.28;
      break;
    default:
      ang = Math.PI - 0.62 + Math.sin(pose.flap) * 0.5;
  }
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(q.a + ang);
  const p = new Path2D();
  if (pc.kind === "fin") {
    p.moveTo(0, -w * 0.5);
    p.quadraticCurveTo(len * 0.55, -w * 0.95, len, -w * 0.05);
    p.quadraticCurveTo(len * 0.62, w * 0.6, 0, w * 0.5);
    p.closePath();
  } else if (pc.kind === "long") {
    const pts: number[] = [0, -w * 0.5];
    for (let k = 1; k <= 6; k++) pts.push((len * k) / 6, -w * 0.5 * (1 - k / 7) - (k % 2 ? w * 0.12 : 0));
    pts.push(len * 1.02, 0, len * 0.6, w * 0.35, 0, w * 0.5);
    smoothClosed(p, pts);
  } else {
    p.moveTo(0, -w * 0.5);
    p.bezierCurveTo(len * 0.4, -w * 0.85, len * 0.95, -w * 0.45, len, 0);
    p.bezierCurveTo(len * 0.95, w * 0.42, len * 0.4, w * 0.7, 0, w * 0.5);
    p.closePath();
  }
  if (pc.kind === "fin") {
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = C.fin;
    ctx.fill(p);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = rgba(shade(C.fin, -0.35), 0.4);
    ctx.lineWidth = Math.max(0.6, lw * 0.45);
    ctx.beginPath();
    for (let k = -1; k <= 1; k++) {
      ctx.moveTo(0, k * w * 0.18);
      ctx.lineTo(len * 0.85, k * w * 0.3);
    }
    ctx.stroke();
  } else {
    const pg = ctx.createLinearGradient(0, -w * 0.5, 0, w * 0.5);
    pg.addColorStop(0, shade(C.fin, 0.12));
    pg.addColorStop(1, shade(C.fin, -0.12));
    ctx.fillStyle = pg;
    ctx.fill(p);
  }
  ctx.lineWidth = lw * 0.85;
  ctx.strokeStyle = C.finEdge ?? outline;
  ctx.stroke(p);
  ctx.restore();
}

/** The plesiosaur's two flippers on each side, rowing like wings. */
function paddles(ctx: Ctx, f: FishBody, pose: Pose, L: number, C: Record<string, string>, outline: string, lw: number, far: boolean) {
  const pc = f.pect!;
  for (const [s, ph, scale] of [[pc.s, 0, 1], [pc.s + 0.27, 2.2, 0.85]] as const) {
    const q = at(s);
    const [bx, by] = off(s, pc.v * L);
    const len = pc.len * L * scale;
    const w = pc.w * L * scale;
    const ang = Math.PI - 0.55 + Math.sin(pose.flap + ph + (far ? Math.PI * 0.8 : 0)) * 0.6;
    ctx.save();
    ctx.translate(bx + (far ? L * 0.02 : 0), by - (far ? L * 0.012 : 0));
    ctx.rotate(q.a + ang);
    const p = new Path2D();
    p.moveTo(0, -w * 0.5);
    p.bezierCurveTo(len * 0.45, -w * 0.9, len * 0.95, -w * 0.4, len, 0);
    p.bezierCurveTo(len * 0.9, w * 0.38, len * 0.4, w * 0.6, 0, w * 0.5);
    p.closePath();
    ctx.fillStyle = far ? shade(C.fin, -0.22) : C.fin;
    ctx.fill(p);
    ctx.lineWidth = lw * 0.8;
    ctx.strokeStyle = outline;
    ctx.stroke(p);
    ctx.restore();
  }
}

/** Crocodile legs, paddling. */
function legs(ctx: Ctx, pose: Pose, L: number, C: Record<string, string>, outline: string, lw: number, far: boolean) {
  for (const [s, ph] of [[0.3, 0], [0.62, Math.PI]] as const) {
    const q = at(s);
    const [bx, by] = on(s, 0.55);
    const swing = Math.sin(pose.phase * 0.5 + ph + (far ? 1.6 : 0)) * 0.5;
    const l1 = L * 0.085;
    const l2 = L * 0.075;
    const a1 = q.a + Math.PI * 0.5 + 0.5 + swing;
    const kx = bx + Math.cos(a1) * l1;
    const ky = by + Math.sin(a1) * l1;
    const a2 = a1 - 0.9 - swing * 0.4;
    const fx = kx + Math.cos(a2) * l2;
    const fy = ky + Math.sin(a2) * l2;
    ctx.strokeStyle = far ? shade(C.mid, -0.25) : C.mid;
    ctx.lineWidth = L * 0.035;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(kx, ky);
    ctx.lineTo(fx, fy);
    ctx.stroke();
    ctx.fillStyle = far ? shade(C.mid, -0.25) : C.mid;
    ctx.beginPath();
    ctx.ellipse(fx, fy, L * 0.03, L * 0.014, a2, 0, TAU);
    ctx.fill();
    ctx.lineWidth = lw * 0.6;
    ctx.strokeStyle = outline;
    ctx.stroke();
  }
}

/** Leafy appendages that make a sea dragon look like drifting seaweed. */
function leaves(ctx: Ctx, pose: Pose, L: number, C: Record<string, string>, outline: string, lw: number) {
  const spots: [number, -1 | 1, number][] = [[0.18, -1, 0.8], [0.27, 1, 1], [0.36, -1, 1.1], [0.45, 1, 1.15], [0.55, -1, 1.05], [0.65, 1, 0.95], [0.76, -1, 0.85], [0.88, 1, 0.7]];
  for (const [s, side, size] of spots) {
    const q = at(s);
    const [bx, by] = on(s, side * 0.7);
    const sway = Math.sin(pose.t * 1.4 + s * 7) * 0.3 + pose.react * Math.sin(pose.t * 12) * 0.3;
    const dir = q.a + side * (Math.PI / 2) + (side < 0 ? 0.65 : -0.65) * -1 + Math.PI * 0.15 * side + sway;
    const ll = L * 0.11 * size;
    const lw2 = L * 0.035 * size;
    for (const [k, rot] of [[1, 0], [0.7, side * 0.55]] as const) {
      const d = dir + rot;
      const tx = bx + Math.cos(d) * ll * k;
      const ty = by + Math.sin(d) * ll * k;
      const mx = (bx + tx) / 2;
      const my = (by + ty) / 2;
      const px = -Math.sin(d) * lw2 * k;
      const py = Math.cos(d) * lw2 * k;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(mx + px, my + py, tx, ty);
      ctx.quadraticCurveTo(mx - px, my - py, bx, by);
      ctx.fillStyle = k === 1 ? C.leaf : C.leafDark;
      ctx.fill();
      ctx.lineWidth = lw * 0.5;
      ctx.strokeStyle = C.leafDark;
      ctx.stroke();
    }
  }
}

/** A pufferfish's spines, standing up as it puffs. */
function spikes(ctx: Ctx, L: number, puff: number, C: Record<string, string>, outline: string, lw: number) {
  ctx.beginPath();
  for (let s = 0.12; s < 0.9; s += 0.055) {
    for (const side of [-1, 1] as const) {
      const q = at(s);
      const [bx, by] = on(s, side * 0.9);
      const nx = -Math.sin(q.a) * side;
      const ny = Math.cos(q.a) * side;
      const sl = L * 0.07 * puff;
      const w = L * 0.016;
      ctx.moveTo(bx - Math.cos(q.a) * w, by - Math.sin(q.a) * w);
      ctx.lineTo(bx + nx * sl, by + ny * sl);
      ctx.lineTo(bx + Math.cos(q.a) * w, by + Math.sin(q.a) * w);
    }
  }
  ctx.fillStyle = shade(C.back, -0.12);
  ctx.fill();
  ctx.lineWidth = lw * 0.6;
  ctx.strokeStyle = outline;
  ctx.stroke();
}

// ── Patterns ─────────────────────────────────────────────────────────────────────────────────

const mottles = new Map<string, [number, number, number][]>();
function pattern(ctx: Ctx, p: Pattern, pose: Pose, L: number, C: Record<string, string>, id: string) {
  switch (p.kind) {
    case "bands":
      for (const [sc, w] of p.at) {
        const pts: number[] = [];
        for (const v of [-1.3, -0.5, 0.4, 1.3]) {
          const [x, y] = on(sc - w / 2 + (Math.abs(v) < 1 ? 0.012 : 0), v);
          pts.push(x, y);
        }
        for (const v of [1.3, 0.4, -0.5, -1.3]) {
          const [x, y] = on(sc + w / 2 + (Math.abs(v) < 1 ? 0.012 : 0), v);
          pts.push(x, y);
        }
        const band = new Path2D();
        smoothClosed(band, pts);
        ctx.lineWidth = L * 0.022;
        ctx.strokeStyle = p.edge;
        ctx.stroke(band);
        ctx.fillStyle = p.color;
        ctx.fill(band);
      }
      break;
    case "tang": {
      const pts: number[] = [];
      for (let s = 0.2; s <= 0.97; s += 0.07) pts.push(...on(s, -0.62 - 0.2 * Math.sin(Math.PI * s)));
      for (let s = 0.97; s >= 0.2; s -= 0.07) pts.push(...on(s, -0.18 + 0.42 * bump(s, 0.62, 0.38)));
      const pal = new Path2D();
      smoothClosed(pal, pts);
      ctx.fillStyle = p.color;
      ctx.fill(pal);
      break;
    }
    case "spots":
      ctx.fillStyle = p.color;
      for (const [s, v, r] of p.at) {
        const [x, y] = on(s, v);
        ctx.beginPath();
        ctx.arc(x, y, r * L * (1 + pose.puff * 0.5), 0, TAU);
        ctx.fill();
      }
      break;
    case "mottle": {
      let list = mottles.get(id);
      if (!list) {
        list = Array.from({ length: p.n }, (_, i) => [0.12 + hash01(id, i) * 0.8, -0.95 + hash01(id, i + 99) * 1.15, p.size * (0.6 + hash01(id, i + 7) * 0.9)] as [number, number, number]);
        mottles.set(id, list);
      }
      ctx.fillStyle = rgba(p.color, 0.7);
      for (const [s, v, r] of list) {
        const [x, y] = on(s, v);
        ctx.beginPath();
        ctx.ellipse(x, y, r * L * 1.3, r * L, 0, 0, TAU);
        ctx.fill();
      }
      break;
    }
    case "scales": {
      ctx.strokeStyle = rgba(p.color, 0.38);
      ctx.lineWidth = Math.max(0.6, L * 0.006);
      const r = L * 0.028;
      ctx.beginPath();
      for (let s = 0.24; s < 0.88; s += 0.055) {
        for (let v = -0.75, row = 0; v <= 0.75; v += 0.3, row++) {
          const [x, y] = on(s + (row % 2) * 0.027, v);
          ctx.moveTo(x - r * 0.2, y - r);
          ctx.arc(x - r * 0.2, y, r, -Math.PI / 2, Math.PI / 2, true);
        }
      }
      ctx.stroke();
      // A shimmer that slides along the body.
      const sx = Math.sin(pose.t * 0.9) * L * 0.6;
      const sg = ctx.createLinearGradient(sx - L * 0.18, -L * 0.2, sx + L * 0.18, L * 0.2);
      sg.addColorStop(0, "rgba(255,255,255,0)");
      sg.addColorStop(0.5, "rgba(255,255,240,0.38)");
      sg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = sg;
      ctx.fillRect(-L, -L, L * 2, L * 2);
      break;
    }
    case "grooves": {
      ctx.strokeStyle = rgba(p.color, 0.75);
      ctx.lineWidth = Math.max(0.6, L * 0.006);
      ctx.beginPath();
      for (let k = 0; k < 5; k++) {
        const v = 0.32 + k * 0.15;
        let first = true;
        for (let s = 0.04; s <= 0.4; s += 0.04) {
          const [x, y] = on(s, v);
          if (first) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          first = false;
        }
      }
      ctx.stroke();
      break;
    }
    case "stripes":
      ctx.fillStyle = rgba(p.color, 0.85);
      for (const s of p.at) {
        const pts = [...on(s - 0.018, -1.2), ...on(s + 0.018, -1.2), ...on(s + 0.012, -0.15), ...on(s - 0.012, -0.15)];
        ctx.beginPath();
        ctx.moveTo(pts[0], pts[1]);
        for (let k = 2; k < pts.length; k += 2) ctx.lineTo(pts[k], pts[k + 1]);
        ctx.closePath();
        ctx.fill();
      }
      break;
    case "tuxedo":
      break;
  }
}

// ── Faces ────────────────────────────────────────────────────────────────────────────────────

function face(ctx: Ctx, f: FishBody, pose: Pose, L: number, C: Record<string, string>, outline: string, lw: number, lx: number) {
  const tip = at(0);
  const mouth = pose.mouth;
  ctx.strokeStyle = outline;
  ctx.lineWidth = lw;
  switch (f.head) {
    case "fish":
    case "puffer": {
      // Gill cover.
      ctx.save();
      ctx.strokeStyle = rgba(shade(C.mid, -0.4), 0.45);
      ctx.lineWidth = lw * 0.8;
      ctx.beginPath();
      const g1 = on(0.25, -0.55);
      const g2 = on(0.205, 0.1);
      const g3 = on(0.24, 0.62);
      ctx.moveTo(g1[0], g1[1]);
      ctx.quadraticCurveTo(g2[0], g2[1], g3[0], g3[1]);
      ctx.stroke();
      ctx.restore();
      const [mx, my] = on(0.012, 0.22);
      if (f.head === "puffer") {
        ctx.beginPath();
        ctx.ellipse(mx, my, L * 0.017, L * (0.02 + mouth * 0.02), 0, 0, TAU);
        ctx.fillStyle = shade(C.belly, -0.2);
        ctx.fill();
        ctx.lineWidth = lw * 0.8;
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(mx, my, L * 0.008, L * (0.009 + mouth * 0.015), 0, 0, TAU);
        ctx.fillStyle = "#4a1424";
        ctx.fill();
      } else if (mouth > 0.08) {
        ctx.beginPath();
        ctx.ellipse(mx - L * 0.006, my, L * 0.022 * (0.6 + mouth * 0.6), L * 0.03 * mouth, 0, 0, TAU);
        ctx.fillStyle = "#4a1424";
        ctx.fill();
        ctx.lineWidth = lw * 0.8;
        ctx.stroke();
      } else {
        const [ax, ay] = on(0.006, 0.18);
        const [bx, by] = on(0.06, 0.32);
        const [cx, cy] = on(0.03, 0.55);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.quadraticCurveTo(cx, cy, bx, by);
        ctx.lineWidth = lw * 0.85;
        ctx.stroke();
      }
      break;
    }
    case "shark": {
      const top = [on(0.045, 0.5), on(0.1, 0.92), on(0.17, 0.62)];
      if (mouth > 0.12) {
        const drop = L * 0.06 * mouth;
        ctx.beginPath();
        ctx.moveTo(top[0][0], top[0][1]);
        ctx.quadraticCurveTo(top[1][0], top[1][1], top[2][0], top[2][1]);
        ctx.quadraticCurveTo(top[1][0], top[1][1] + drop * 1.8, top[0][0], top[0][1]);
        ctx.fillStyle = "#5a1a2a";
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        for (let k = 1; k < 6; k++) {
          const u = k / 6;
          const x = lerp(top[0][0], top[2][0], u);
          const y = lerp(top[0][1], top[2][1], u) + Math.sin(u * Math.PI) * (top[1][1] - top[0][1]) * 0.5;
          ctx.beginPath();
          ctx.moveTo(x - L * 0.008, y);
          ctx.lineTo(x, y + L * 0.016);
          ctx.lineTo(x + L * 0.008, y);
          ctx.fill();
        }
      } else {
        ctx.beginPath();
        ctx.moveTo(top[0][0], top[0][1]);
        ctx.quadraticCurveTo(top[1][0], top[1][1], top[2][0], top[2][1]);
        ctx.stroke();
      }
      // Gill slits.
      ctx.save();
      ctx.strokeStyle = rgba(shade(C.back, -0.45), 0.55);
      ctx.lineWidth = lw * 0.8;
      ctx.beginPath();
      for (let k = 0; k < (f.gills ?? 4); k++) {
        const s = 0.19 + k * 0.022;
        const a = on(s, -0.32);
        const b = on(s - 0.008, 0.4);
        ctx.moveTo(a[0], a[1]);
        ctx.quadraticCurveTo(b[0] - L * 0.012, (a[1] + b[1]) / 2, b[0], b[1]);
      }
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "dolphin": {
      const pts = [on(0.0, 0.1), on(0.05, 0.25), on(0.1, 0.2), on(0.125, -0.05)];
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      ctx.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
      ctx.quadraticCurveTo(pts[3][0] - L * 0.005, pts[2][1], pts[3][0], pts[3][1]);
      ctx.lineWidth = lw * 0.85;
      ctx.stroke();
      if (mouth > 0.1) {
        ctx.beginPath();
        ctx.ellipse(pts[1][0], pts[1][1] + L * 0.006, L * 0.03, L * 0.012 * mouth, 0, 0, TAU);
        ctx.fillStyle = "#5a2a3a";
        ctx.fill();
      }
      break;
    }
    case "whale": {
      const a = on(0.005, 0.15);
      const b = on(0.1, 0.5);
      const c = on(0.2, 0.18);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.quadraticCurveTo(b[0], b[1], c[0], c[1]);
      ctx.lineWidth = lw * 0.9;
      ctx.stroke();
      if (f.bumps) {
        ctx.fillStyle = shade(C.back, 0.12);
        for (let s = 0.02; s < 0.15; s += 0.028) {
          const [x, y] = on(s, -0.78);
          ctx.beginPath();
          ctx.arc(x, y, L * 0.008, 0, TAU);
          ctx.fill();
        }
      }
      break;
    }
    case "seal": {
      const [nx, ny] = on(0.004, -0.15);
      ctx.beginPath();
      ctx.ellipse(nx - L * 0.004, ny, L * 0.014, L * 0.01, 0, 0, TAU);
      ctx.fillStyle = "#1c1410";
      ctx.fill();
      const [mx, my] = on(0.022, 0.32);
      ctx.beginPath();
      ctx.moveTo(mx + L * 0.012, my - L * 0.006);
      ctx.quadraticCurveTo(mx, my + L * 0.01 + mouth * L * 0.01, mx - L * 0.014, my - L * 0.002);
      ctx.lineWidth = lw * 0.75;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = Math.max(0.6, lw * 0.4);
      ctx.beginPath();
      for (const [dy, len] of [[-0.012, 0.07], [0.0, 0.075], [0.012, 0.065]] as const) {
        ctx.moveTo(mx - L * 0.004, my + L * dy);
        ctx.lineTo(mx + L * len * 0.9, my + L * dy * 2.4 + L * 0.008);
      }
      ctx.stroke();
      break;
    }
    case "penguin": {
      const q = at(0);
      ctx.save();
      ctx.translate(q.x, q.y);
      ctx.rotate(q.a);
      const bl = L * 0.085;
      const open = mouth * L * 0.012;
      ctx.beginPath();
      ctx.moveTo(-L * 0.02, -L * 0.014);
      ctx.quadraticCurveTo(bl * 0.6, -L * 0.012, bl, -open * 0.3);
      ctx.lineTo(-L * 0.02, L * 0.002 - open * 0.3);
      ctx.closePath();
      ctx.fillStyle = "#1c2330";
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-L * 0.02, L * 0.002 + open);
      ctx.lineTo(bl * 0.92, open * 0.6);
      ctx.quadraticCurveTo(bl * 0.4, L * 0.016 + open, -L * 0.02, L * 0.016 + open);
      ctx.closePath();
      ctx.fillStyle = C.beak ?? "#ffad2e";
      ctx.fill();
      ctx.lineWidth = lw * 0.7;
      ctx.strokeStyle = outline;
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "croc": {
      const a = on(0.005, 0.1);
      const c = on(0.2, 0.22);
      // Teeth peeking out along the long smile.
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      for (let k = 1; k < 9; k++) {
        const u = k / 9;
        const x = lerp(a[0], c[0], u);
        const y = lerp(a[1], c[1], u);
        const dir = k % 2 ? 1 : -1;
        ctx.moveTo(x - L * 0.007, y);
        ctx.lineTo(x, y + dir * L * 0.014);
        ctx.lineTo(x + L * 0.007, y);
      }
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.quadraticCurveTo(lerp(a[0], c[0], 0.5), lerp(a[1], c[1], 0.5) + L * 0.008 + mouth * L * 0.03, c[0], c[1]);
      ctx.lineWidth = lw * 0.9;
      ctx.stroke();
      const [nx, ny] = on(0.015, -1.05);
      ctx.beginPath();
      ctx.arc(nx, ny, L * 0.012, 0, TAU);
      ctx.fillStyle = C.mid;
      ctx.fill();
      ctx.lineWidth = lw * 0.6;
      ctx.stroke();
      // The raised bump the eye sits on.
      const [ex, ey] = off(f.eye.s, f.eye.v * L);
      ctx.beginPath();
      ctx.arc(ex, ey + L * 0.008, f.eye.r * L * 1.45, Math.PI, TAU);
      ctx.fillStyle = C.mid;
      ctx.fill();
      ctx.lineWidth = lw * 0.8;
      ctx.stroke();
      break;
    }
    case "plesio": {
      const a = on(0.004, 0.2);
      const b = on(0.04, 0.35);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.quadraticCurveTo((a[0] + b[0]) / 2, b[1] + L * 0.006, b[0], b[1] - L * 0.004);
      ctx.lineWidth = lw * 0.7;
      ctx.stroke();
      break;
    }
    case "dragon": {
      ctx.beginPath();
      ctx.arc(tip.x - L * 0.004, tip.y, L * 0.006 + mouth * L * 0.006, 0, TAU);
      ctx.fillStyle = "#3a1a08";
      ctx.fill();
      break;
    }
  }
  if (f.blowhole) {
    const [bx, by] = on(f.head === "dolphin" ? 0.19 : 0.21, -0.98);
    ctx.beginPath();
    ctx.ellipse(bx, by, L * 0.01, L * 0.004, at(0.2).a, 0, TAU);
    ctx.fillStyle = shade(C.back, -0.4);
    ctx.fill();
  }
  const e = f.eye;
  const [ex, ey] = off(e.s, e.v * L * (1 + pose.puff * 0.6));
  const r = e.r * L * (1 + pose.baby * 0.18) * (1 + pose.puff * 0.25);
  drawEye(ctx, ex, ey, r, { iris: C.iris ?? "#1a2a40", lx, ly: pose.lookY, blink: pose.blink, sleep: pose.sleep, lid: C.back, outline, dark: e.dark, slit: e.slit, ring: e.ring });
}

/** Rough half-extents (for hit testing and shadows). */
export function fishExtent(look: Look, len: number): [number, number] {
  const f = look.fish!;
  const P = prof(f);
  const L = len / (1 + f.tailLen * 0.8);
  const tail = f.tail === "taper" || f.tail === "curl" ? 0 : f.tailLen * L;
  return [(L + tail) * 0.5, Math.max(P.maxTop, P.maxBot) * L + (f.dorsal ? f.dorsal.h * L * 0.5 : 0)];
}
