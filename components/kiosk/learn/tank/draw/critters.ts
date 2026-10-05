import { rgba, shade } from "../color";
import type { Look } from "../species";
import { TAU, clamp, drawCrown, drawEye, lerp, ribbon, smoothClosed, smoothOpen, type Pose } from "./core";

// Every creature that isn't built on a swimming spine: the sea turtles, the octopuses, the squid,
// the crab, the lobster and the pistol shrimp, the sea snail, the duck, the swan and the
// flamingo, the frog and the sea otter. Each is drawn facing right (the crab and octopus face
// you), centered on the origin, `L` pixels long; flipping and tilting happen outside.

type Ctx = CanvasRenderingContext2D;

export function drawCritter(ctx: Ctx, look: Look, pose: Pose, L: number, C: Record<string, string>, id: string, lx: number) {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  switch (look.plan) {
    case "turtle":
      return turtle(ctx, look, pose, L, C, lx);
    case "octopus":
      return octopus(ctx, look, pose, L, C);
    case "squid":
      return squid(ctx, pose, L, C, lx);
    case "crab":
      return crab(ctx, pose, L, C);
    case "arthro":
      return arthro(ctx, look.kind === "shrimp", pose, L, C, lx);
    case "snail":
      return snail(ctx, pose, L, C, lx);
    case "bird":
      return bird(ctx, look.kind ?? "duck", pose, L, C, lx);
    case "frog":
      return frog(ctx, pose, L, C, lx);
    case "otter":
      return otter(ctx, pose, L, C, lx);
  }
  void id;
}

/** Half extents relative to `len` (hit tests, shadows and portrait framing). */
export function critterExtent(look: Look, len: number): [number, number] {
  const k: Record<string, [number, number]> = {
    turtle: [0.5, 0.26],
    octopus: [0.36, 0.5],
    squid: [0.55, 0.16],
    crab: [0.52, 0.34],
    arthro: [0.5, 0.24],
    snail: [0.46, 0.36],
    bird: [0.48, 0.5],
    frog: [0.5, 0.26],
    otter: [0.52, 0.22],
  };
  const [a, b] = look.plan === "bird" && look.kind !== "duck" ? [0.45, 0.56] : (k[look.plan] ?? [0.5, 0.25]);
  return [a * len, b * len];
}

/** Where a creature's middle is, relative to its origin (so portraits can center it). */
export function critterCenterY(look: Look, len: number): number {
  if (look.plan === "bird") return (look.kind === "duck" ? -0.16 : -0.33) * len;
  return 0;
}

/** How far below the origin a bottom-dweller's feet touch the sand (relative to `len`). */
export function groundOf(look: Look, len: number): number {
  const k: Record<string, number> = { crab: 0.22, arthro: 0.12, snail: 0.12, octopus: 0.36 };
  return (k[look.plan] ?? 0.2) * len;
}

const lineW = (L: number, k = 0.016) => clamp(L * k, 1, 3.2);

function fillStroke(ctx: Ctx, p: Path2D, fill: string | CanvasGradient, stroke: string, lw: number) {
  ctx.fillStyle = fill;
  ctx.fill(p);
  ctx.lineWidth = lw;
  ctx.strokeStyle = stroke;
  ctx.stroke(p);
}

function vgrad(ctx: Ctx, y0: number, y1: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

/** A soft glossy highlight on the upper-left of a shape (call while clipped to it). */
function gloss(ctx: Ctx, x: number, y: number, r: number, a = 0.34) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,255,255,${a})`);
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

// ── Sea turtle ────────────────────────────────────────────────────────────────────────────────
function flipperShape(ctx: Ctx, x: number, y: number, ang: number, len: number, w: number, fore: number, color: string, outline: string, lw: number, spots: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.scale(1, fore);
  const p = new Path2D();
  p.moveTo(0, -w * 0.5);
  p.bezierCurveTo(len * 0.4, -w * 0.95, len * 0.86, -w * 0.35, len, w * 0.08);
  p.bezierCurveTo(len * 0.72, w * 0.5, len * 0.3, w * 0.62, 0, w * 0.5);
  p.closePath();
  fillStroke(ctx, p, color, outline, lw);
  ctx.save();
  ctx.clip(p);
  ctx.fillStyle = spots;
  for (let k = 0; k < 5; k++) {
    ctx.beginPath();
    ctx.ellipse(len * (0.22 + k * 0.15), -w * 0.1 + (k % 2) * w * 0.18, w * 0.13, w * 0.09, 0.4, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

function turtle(ctx: Ctx, look: Look, pose: Pose, L: number, C: Record<string, string>, lx: number) {
  const outline = shade(C.shell, -0.6);
  const lw = lineW(L);
  const t = pose.t;
  const tuck = pose.tuck;
  const stroke = Math.sin(pose.flap);
  const glow = look.glow;
  const pulse = 0.55 + 0.45 * Math.sin(t * 2.2);
  const skinDark = shade(C.skin, -0.28);
  // Far side flippers (behind the shell).
  flipperShape(ctx, 0.14 * L, 0.03 * L, Math.PI - 0.95 + Math.sin(pose.flap + 2.6) * 0.72 * (1 - tuck), 0.36 * L * (1 - tuck * 0.5), 0.1 * L, 0.65 + 0.35 * Math.abs(Math.cos(pose.flap + 2.6)), skinDark, outline, lw, rgba(C.skinDark, 0.5));
  flipperShape(ctx, -0.28 * L, 0.05 * L, Math.PI - 0.4 + Math.sin(pose.flap * 0.5 + 1) * 0.25, 0.13 * L * (1 - tuck * 0.6), 0.07 * L, 1, skinDark, outline, lw, rgba(C.skinDark, 0.5));
  // Head and neck (the shell covers the neck as the head pulls in).
  const hx = (0.37 - tuck * 0.17) * L + Math.sin(t * 0.9) * 0.006 * L;
  const hy = -0.03 * L + Math.sin(t * 1.1) * 0.005 * L;
  const neck = new Path2D();
  neck.moveTo(0.16 * L, -0.05 * L);
  neck.quadraticCurveTo(hx - 0.1 * L, hy - 0.06 * L, hx - 0.02 * L, hy - 0.05 * L);
  neck.lineTo(hx - 0.02 * L, hy + 0.05 * L);
  neck.quadraticCurveTo(hx - 0.1 * L, hy + 0.07 * L, 0.16 * L, 0.06 * L);
  neck.closePath();
  fillStroke(ctx, neck, C.skin, outline, lw);
  const head = new Path2D();
  head.ellipse(hx, hy, 0.11 * L, 0.078 * L, -0.08, 0, TAU);
  ctx.fillStyle = vgrad(ctx, hy - 0.08 * L, hy + 0.08 * L, [[0, shade(C.skin, 0.15)], [1, C.skinDark]]);
  ctx.fill(head);
  ctx.save();
  ctx.clip(head);
  ctx.fillStyle = rgba(C.skinDark, 0.55);
  for (const [dx, dy, r] of [[-0.04, -0.035, 0.022], [0.0, -0.05, 0.018], [-0.07, 0.0, 0.016], [-0.02, 0.0, 0.014]] as const) {
    ctx.beginPath();
    ctx.ellipse(hx + dx * L, hy + dy * L, r * L * 1.3, r * L, 0, 0, TAU);
    ctx.fill();
  }
  gloss(ctx, hx - 0.02 * L, hy - 0.05 * L, 0.08 * L, 0.3);
  ctx.restore();
  ctx.lineWidth = lw;
  ctx.strokeStyle = outline;
  ctx.stroke(head);
  // Beak and smile.
  ctx.beginPath();
  ctx.moveTo(hx + 0.105 * L, hy + 0.005 * L);
  ctx.quadraticCurveTo(hx + 0.06 * L, hy + 0.04 * L + pose.mouth * 0.02 * L, hx + 0.0 * L, hy + 0.03 * L);
  ctx.lineWidth = lw * 0.85;
  ctx.stroke();
  drawEye(ctx, hx + 0.04 * L, hy - 0.022 * L, 0.03 * L * (1 + pose.baby * 0.2), { iris: C.iris, lx, ly: pose.lookY, blink: pose.blink, sleep: pose.sleep, lid: C.skin, outline });
  if (glow) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = rgba(glow, 0.55 * pulse);
    for (const [dx, dy] of [[-0.04, -0.035], [0.0, -0.05], [-0.07, 0.0]] as const) {
      ctx.beginPath();
      ctx.arc(hx + dx * L, hy + dy * L, 0.012 * L, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
  // The shell.
  const shell = new Path2D();
  shell.moveTo(-0.37 * L, 0.05 * L);
  shell.bezierCurveTo(-0.4 * L, -0.08 * L, -0.22 * L, -0.235 * L, -0.03 * L, -0.235 * L);
  shell.bezierCurveTo(0.15 * L, -0.235 * L, 0.29 * L, -0.11 * L, 0.28 * L, 0.035 * L);
  shell.quadraticCurveTo(-0.04 * L, 0.13 * L, -0.37 * L, 0.05 * L);
  shell.closePath();
  ctx.fillStyle = vgrad(ctx, -0.24 * L, 0.1 * L, [[0, C.shellLight], [0.55, C.shell], [1, C.scute]]);
  ctx.fill(shell);
  ctx.save();
  ctx.clip(shell);
  // Scutes: the plates of the shell, with a little shine on each.
  const plates: [number, number, number, number][] = [[-0.24, -0.14, 0.085, 0.06], [-0.07, -0.17, 0.09, 0.06], [0.1, -0.14, 0.08, 0.055], [-0.3, -0.03, 0.06, 0.05], [-0.16, -0.05, 0.07, 0.05], [-0.01, -0.06, 0.07, 0.05], [0.14, -0.04, 0.065, 0.045], [0.24, -0.01, 0.04, 0.035]];
  for (const [px, py, rx, ry] of plates) {
    const plate = new Path2D();
    const pts: number[] = [];
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU + Math.PI / 6;
      pts.push(px * L + Math.cos(a) * rx * L, py * L + Math.sin(a) * ry * L);
    }
    smoothClosed(plate, pts);
    ctx.fillStyle = rgba(shade(C.shell, 0.06), 0.9);
    ctx.fill(plate);
    ctx.lineWidth = lw * 1.1;
    ctx.strokeStyle = C.scute;
    ctx.stroke(plate);
    gloss(ctx, px * L - rx * L * 0.3, py * L - ry * L * 0.4, rx * L * 0.9, 0.22);
    if (glow) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineWidth = lw * 1.4;
      ctx.strokeStyle = rgba(glow, 0.5 * pulse);
      ctx.stroke(plate);
      ctx.restore();
    }
  }
  // The rim and the pale belly plate.
  ctx.beginPath();
  ctx.moveTo(-0.37 * L, 0.03 * L);
  ctx.quadraticCurveTo(-0.04 * L, 0.1 * L, 0.29 * L, 0.012 * L);
  ctx.lineTo(0.3 * L, 0.06 * L);
  ctx.quadraticCurveTo(-0.04 * L, 0.16 * L, -0.38 * L, 0.07 * L);
  ctx.closePath();
  ctx.fillStyle = C.belly;
  ctx.fill();
  gloss(ctx, -0.1 * L, -0.2 * L, 0.25 * L, 0.3);
  ctx.restore();
  ctx.lineWidth = lw;
  ctx.strokeStyle = outline;
  ctx.stroke(shell);
  // Near flippers (in front).
  flipperShape(ctx, -0.27 * L, 0.06 * L, Math.PI - 0.35 + Math.sin(pose.flap * 0.5) * 0.25, 0.14 * L * (1 - tuck * 0.6), 0.075 * L, 1, C.skin, outline, lw, rgba(C.skinDark, 0.6));
  flipperShape(ctx, 0.12 * L, 0.05 * L, Math.PI - 0.95 + stroke * 0.75 * (1 - tuck), 0.38 * L * (1 - tuck * 0.5), 0.105 * L, 0.6 + 0.4 * Math.abs(Math.cos(pose.flap)), C.skin, outline, lw, rgba(C.skinDark, 0.6));
  if (pose.royal) drawCrown(ctx, hx, hy - 0.1 * L, Math.max(10, 0.1 * L), t);
}

// ── Octopus (faces you) ───────────────────────────────────────────────────────────────────────
function octopus(ctx: Ctx, look: Look, pose: Pose, L: number, C: Record<string, string>) {
  const outline = shade(C.body, -0.55);
  const lw = lineW(L);
  const t = pose.t;
  const jet = pose.jet;
  const glow = look.glow;
  const pulse = 0.55 + 0.45 * Math.sin(t * 2.4);
  ctx.save();
  ctx.rotate(pose.pitch * jet + Math.sin(t * 0.7) * 0.05 * (1 - jet));
  const squeeze = 1 - 0.12 * jet * Math.max(0, Math.sin(pose.phase));
  const arm = (k: number, back: boolean) => {
    const spread = lerp(0.36, 0.06, jet);
    let a = Math.PI / 2 + (k - 3.5) * spread;
    let x = (k - 3.5) * 0.05 * L;
    let y = 0.02 * L - (back ? 0.012 * L : 0);
    const xs = [x];
    const ys = [y];
    const ws = [0.062 * L];
    const n = 10;
    const seg = 0.06 * L * (back ? 0.92 : 1);
    const side = k < 4 ? 1 : -1;
    for (let j = 1; j <= n; j++) {
      const u = j / n;
      a += Math.sin(t * 2.1 + j * 0.55 + k * 1.7) * 0.2 * (1 - jet * 0.75) * u + (u > 0.6 ? 0.22 * side * (1 - jet) : 0) * u;
      x += Math.cos(a) * seg;
      y += Math.sin(a) * seg;
      xs.push(x);
      ys.push(y);
      ws.push(0.062 * L * Math.pow(1 - u, 0.85) + 0.007 * L);
    }
    const p = new Path2D();
    ribbon(p, xs, ys, ws);
    const color = back ? C.dark : C.body;
    ctx.fillStyle = vgrad(ctx, 0, 0.6 * L, [[0, color], [1, shade(color, -0.12)]]);
    ctx.fill(p);
    ctx.lineWidth = lw * 0.85;
    ctx.strokeStyle = outline;
    ctx.stroke(p);
    if (!back) {
      ctx.fillStyle = C.sucker;
      for (let j = 1; j < 7; j++) {
        const ang = Math.atan2(ys[j + 1] - ys[j], xs[j + 1] - xs[j]);
        const r = ws[j] * 0.22;
        ctx.beginPath();
        ctx.arc(xs[j] - Math.sin(ang) * ws[j] * 0.28 * side, ys[j] + Math.cos(ang) * ws[j] * 0.28 * side, r, 0, TAU);
        ctx.fill();
      }
      if (glow) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = rgba(glow, 0.6 * pulse);
        for (let j = 2; j < 9; j += 2) {
          ctx.beginPath();
          ctx.arc(xs[j], ys[j], ws[j] * 0.18, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      }
    }
  };
  for (const k of [0, 2, 4, 6]) arm(k, true);
  // Mantle and head.
  const m = new Path2D();
  const top = -0.46 * L * squeeze;
  m.moveTo(0, top);
  m.bezierCurveTo(0.17 * L, top, 0.23 * L, -0.25 * L, 0.19 * L, -0.1 * L);
  m.bezierCurveTo(0.17 * L, -0.0 * L, 0.12 * L, 0.05 * L, 0, 0.055 * L);
  m.bezierCurveTo(-0.12 * L, 0.05 * L, -0.17 * L, 0.0, -0.19 * L, -0.1 * L);
  m.bezierCurveTo(-0.23 * L, -0.25 * L, -0.17 * L, top, 0, top);
  m.closePath();
  const mg = ctx.createRadialGradient(-0.06 * L, -0.3 * L, 0.02 * L, 0, -0.18 * L, 0.32 * L);
  mg.addColorStop(0, C.light);
  mg.addColorStop(0.55, C.body);
  mg.addColorStop(1, C.dark);
  ctx.fillStyle = mg;
  ctx.fill(m);
  ctx.save();
  ctx.clip(m);
  ctx.fillStyle = rgba(C.spots, 0.55);
  for (const [x, y, r] of [[-0.08, -0.34, 0.03], [0.07, -0.3, 0.025], [0.0, -0.4, 0.02], [-0.12, -0.2, 0.02], [0.13, -0.18, 0.022], [0.04, -0.22, 0.016]] as const) {
    ctx.beginPath();
    ctx.ellipse(x * L, y * L, r * L * 1.2, r * L, 0.3, 0, TAU);
    ctx.fill();
    if (glow) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = rgba(glow, 0.55 * pulse);
      ctx.beginPath();
      ctx.arc(x * L, y * L, r * L * 0.55, 0, TAU);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = rgba(C.spots, 0.55);
    }
  }
  gloss(ctx, -0.07 * L, -0.36 * L, 0.16 * L, 0.38);
  ctx.restore();
  ctx.lineWidth = lw;
  ctx.strokeStyle = outline;
  ctx.stroke(m);
  for (const k of [1, 3, 5, 7]) arm(k, false);
  // Face: big eyes, rosy cheeks, a little smile.
  const er = 0.058 * L * (1 + pose.baby * 0.15);
  for (const sx of [-1, 1]) drawEye(ctx, sx * 0.085 * L, -0.07 * L, er, { iris: C.iris, lx: pose.lookX, ly: pose.lookY, blink: pose.blink, sleep: pose.sleep, lid: C.body, outline });
  ctx.fillStyle = rgba("#ff4f7b", 0.28);
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sx * 0.13 * L, -0.0 * L, 0.03 * L, 0.018 * L, 0, 0, TAU);
    ctx.fill();
  }
  ctx.beginPath();
  if (pose.mouth > 0.1) ctx.ellipse(0, 0.012 * L, 0.018 * L, 0.02 * L * pose.mouth, 0, 0, TAU);
  else ctx.arc(0, -0.005 * L, 0.025 * L, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.lineWidth = lw * 0.9;
  ctx.strokeStyle = outline;
  if (pose.mouth > 0.1) {
    ctx.fillStyle = "#4a1424";
    ctx.fill();
  }
  ctx.stroke();
  if (pose.royal) drawCrown(ctx, 0, top - 0.02 * L, Math.max(10, 0.13 * L), t);
  ctx.restore();
}

// ── Squid (mantle first) ──────────────────────────────────────────────────────────────────────
function squid(ctx: Ctx, pose: Pose, L: number, C: Record<string, string>, lx: number) {
  const outline = shade(C.body, -0.55);
  const lw = lineW(L);
  const t = pose.t;
  const flap = Math.sin(pose.flap);
  // Arms and the two long tentacles, trailing behind.
  // Draw the far arms first, then the tentacles, then the near arms.
  const order = [1, 3, 6, 8, 4, 5, 0, 2, 7, 9];
  for (const k of order) {
    const long = k === 4 || k === 5;
    const n = long ? 12 : 7;
    const seg = (long ? 0.042 : 0.03 + (k % 3) * 0.005) * L;
    let a = Math.PI + (k - 4.5) * (long ? 0.05 : 0.15) * (1 - pose.jet * 0.5);
    let x = -0.15 * L;
    let y = (k - 4.5) * 0.011 * L;
    const xs = [x];
    const ys = [y];
    const base = long ? 0.022 * L : 0.042 * L;
    const ws = [base];
    for (let j = 1; j <= n; j++) {
      const u = j / n;
      a += Math.sin(t * 2.4 + j * 0.6 + k) * 0.13 * u * (1 - pose.jet * 0.6) + (long ? 0 : (k < 5 ? -1 : 1) * 0.03 * u);
      x += Math.cos(a) * seg;
      y += Math.sin(a) * seg;
      xs.push(x);
      ys.push(y);
      // Tentacles end in a wide club; arms taper to a point.
      ws.push(long ? (j > n - 3 ? 0.038 * L * (j === n ? 0.6 : 1) : base * (1 - u * 0.4)) : base * Math.pow(1 - u, 0.9) + 0.005 * L);
    }
    const p = new Path2D();
    ribbon(p, xs, ys, ws);
    const far = k === 1 || k === 3 || k === 6 || k === 8;
    fillStroke(ctx, p, far ? C.dark : long ? shade(C.body, -0.08) : C.body, outline, lw * 0.7);
  }
  // Fins at the tip.
  for (const sgn of [-1, 1]) {
    const p = new Path2D();
    const h = (0.1 + 0.03 * flap * sgn) * L;
    p.moveTo(0.22 * L, sgn * 0.05 * L);
    p.quadraticCurveTo(0.3 * L, sgn * (0.05 * L + h), 0.44 * L, sgn * 0.01 * L);
    p.closePath();
    ctx.globalAlpha = 0.9;
    fillStroke(ctx, p, C.fin, outline, lw * 0.8);
    ctx.globalAlpha = 1;
  }
  // Mantle.
  const m = new Path2D();
  m.moveTo(0.46 * L, 0);
  m.quadraticCurveTo(0.32 * L, -0.11 * L, 0.08 * L, -0.09 * L);
  m.lineTo(-0.03 * L, -0.075 * L);
  m.quadraticCurveTo(-0.055 * L, 0, -0.03 * L, 0.075 * L);
  m.lineTo(0.08 * L, 0.09 * L);
  m.quadraticCurveTo(0.32 * L, 0.11 * L, 0.46 * L, 0);
  m.closePath();
  ctx.fillStyle = vgrad(ctx, -0.1 * L, 0.1 * L, [[0, C.light], [0.5, C.body], [1, C.dark]]);
  ctx.fill(m);
  ctx.save();
  ctx.clip(m);
  for (let i = 0; i < 9; i++) {
    const x = (0.02 + i * 0.045) * L;
    const y = (i % 2 ? -0.035 : 0.03) * L;
    const r = 0.014 * L * (0.75 + 0.45 * Math.sin(t * 3 + i * 1.7));
    ctx.fillStyle = rgba(C.spots, 0.65);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  gloss(ctx, 0.2 * L, -0.06 * L, 0.18 * L, 0.35);
  ctx.restore();
  ctx.lineWidth = lw;
  ctx.strokeStyle = outline;
  ctx.stroke(m);
  // Head.
  const h = new Path2D();
  h.ellipse(-0.1 * L, 0, 0.075 * L, 0.068 * L, 0, 0, TAU);
  fillStroke(ctx, h, vgrad(ctx, -0.07 * L, 0.07 * L, [[0, C.light], [1, C.body]]), outline, lw);
  drawEye(ctx, -0.095 * L, -0.012 * L, 0.044 * L * (1 + pose.baby * 0.15), { iris: C.iris, lx, ly: pose.lookY, blink: pose.blink, sleep: pose.sleep, lid: C.body, outline });
  if (pose.royal) drawCrown(ctx, -0.1 * L, -0.09 * L, Math.max(10, 0.1 * L), t);
}

// ── Crab (faces you, walks sideways) ──────────────────────────────────────────────────────────
function crab(ctx: Ctx, pose: Pose, L: number, C: Record<string, string>) {
  const outline = shade(C.shell, -0.6);
  const lw = lineW(L, 0.018);
  const t = pose.t;
  const w = pose.walk;
  const ground = 0.22 * L;
  const bob = Math.abs(Math.sin(w)) * 0.012 * L;
  const by = -0.02 * L - bob;
  // Legs, four on each side, stepping in a wave.
  for (const side of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const ph = w + k * (Math.PI / 2) + (side < 0 ? Math.PI : 0);
      const lift = Math.max(0, Math.cos(ph)) * 0.045 * L;
      const hx = side * (0.17 + k * 0.025) * L;
      const hy = by + 0.05 * L + k * 0.01 * L;
      const fx = side * (0.3 + k * 0.055) * L + Math.sin(ph) * 0.03 * L;
      const fy = ground - lift;
      const kx = (hx + fx) / 2 + side * 0.05 * L;
      const ky = Math.min(hy, fy) - 0.08 * L - lift * 0.4;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 0.04 * L + lw;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(kx, ky);
      ctx.lineTo(fx, fy);
      ctx.stroke();
      ctx.strokeStyle = k % 2 ? C.leg : shade(C.leg, -0.08);
      ctx.lineWidth = 0.04 * L;
      ctx.stroke();
    }
  }
  // Claws (raised when it's excited, snapping).
  const up = pose.claw;
  for (const side of [-1, 1]) {
    const sx = side * 0.24 * L;
    const sy = by - 0.02 * L;
    const ex = side * 0.37 * L;
    const ey = by - 0.04 * L - up * 0.12 * L + Math.sin(t * 1.3 + side) * 0.008 * L;
    const cx = side * 0.41 * L;
    const cy = by - 0.15 * L - up * 0.15 * L + Math.sin(t * 1.3 + side) * 0.012 * L;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 0.05 * L + lw;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.lineTo(cx, cy + 0.04 * L);
    ctx.stroke();
    ctx.strokeStyle = C.claw;
    ctx.lineWidth = 0.05 * L;
    ctx.stroke();
    const open = up > 0.05 ? 0.15 + 0.4 * Math.abs(Math.sin(t * 11)) * up : 0.12 + 0.05 * Math.sin(t * 2 + side);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(side * -0.35);
    ctx.scale(side, 1);
    const palm = new Path2D();
    palm.ellipse(0, 0.02 * L, 0.075 * L, 0.06 * L, 0, 0, TAU);
    fillStroke(ctx, palm, vgrad(ctx, -0.05 * L, 0.08 * L, [[0, C.light], [1, C.claw]]), outline, lw);
    for (const [dir, rot] of [[-1, -open], [1, open * 0.4]] as const) {
      ctx.save();
      ctx.translate(0.02 * L, -0.03 * L);
      ctx.rotate(rot);
      const f = new Path2D();
      f.moveTo(-0.02 * L, 0);
      f.quadraticCurveTo(0.02 * L, dir * 0.07 * L - 0.04 * L, 0.06 * L, -0.085 * L);
      f.quadraticCurveTo(0.035 * L, -0.03 * L, 0.03 * L, 0.01 * L);
      f.closePath();
      fillStroke(ctx, f, dir < 0 ? C.claw : shade(C.claw, -0.1), outline, lw);
      ctx.restore();
    }
    ctx.save();
    ctx.clip(palm);
    gloss(ctx, -0.02 * L, -0.01 * L, 0.06 * L, 0.35);
    ctx.restore();
    ctx.restore();
  }
  // Eye stalks.
  for (const side of [-1, 1]) {
    const sway = Math.sin(t * 1.7 + side) * 0.012 * L;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 0.028 * L + lw;
    ctx.beginPath();
    ctx.moveTo(side * 0.06 * L, by - 0.12 * L);
    ctx.lineTo(side * 0.085 * L + sway, by - 0.23 * L);
    ctx.stroke();
    ctx.strokeStyle = C.shell;
    ctx.lineWidth = 0.028 * L;
    ctx.stroke();
  }
  // Shell.
  const sh = new Path2D();
  const pts: number[] = [];
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * TAU;
    const bumpy = a > Math.PI ? 1 + 0.035 * Math.cos(a * 9) : 1;
    pts.push(Math.cos(a) * 0.3 * L * bumpy, by + Math.sin(a) * (a > Math.PI ? 0.17 : 0.12) * L * bumpy);
  }
  smoothClosed(sh, pts);
  ctx.fillStyle = vgrad(ctx, by - 0.17 * L, by + 0.12 * L, [[0, C.light], [0.5, C.shell], [1, C.dark]]);
  ctx.fill(sh);
  ctx.save();
  ctx.clip(sh);
  ctx.fillStyle = rgba(shade(C.light, 0.3), 0.6);
  for (const [x, y, r] of [[-0.12, -0.1, 0.018], [0.1, -0.11, 0.016], [-0.02, -0.13, 0.014], [0.18, -0.05, 0.012], [-0.19, -0.05, 0.013]] as const) {
    ctx.beginPath();
    ctx.arc(x * L, by + y * L + 0.02 * L, r * L, 0, TAU);
    ctx.fill();
  }
  gloss(ctx, -0.08 * L, by - 0.12 * L, 0.2 * L, 0.32);
  ctx.restore();
  ctx.lineWidth = lw;
  ctx.strokeStyle = outline;
  ctx.stroke(sh);
  // Eyes on top of the stalks, a big smile.
  for (const side of [-1, 1]) {
    const sway = Math.sin(t * 1.7 + side) * 0.012 * L;
    drawEye(ctx, side * 0.085 * L + sway, by - 0.25 * L, 0.048 * L * (1 + pose.baby * 0.15), { iris: C.iris, lx: pose.lookX, ly: pose.lookY, blink: pose.blink, sleep: pose.sleep, lid: C.shell, outline });
  }
  ctx.beginPath();
  if (pose.mouth > 0.1) ctx.ellipse(0, by + 0.02 * L, 0.03 * L, 0.025 * L * pose.mouth, 0, 0, TAU);
  else ctx.arc(0, by - 0.01 * L, 0.045 * L, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.lineWidth = lw * 1.1;
  ctx.strokeStyle = outline;
  if (pose.mouth > 0.1) {
    ctx.fillStyle = "#4a1424";
    ctx.fill();
  }
  ctx.stroke();
  if (pose.royal) drawCrown(ctx, 0, by - 0.18 * L, Math.max(10, 0.14 * L), t);
}

// ── Lobster and pistol shrimp (side view) ─────────────────────────────────────────────────────
function arthro(ctx: Ctx, shrimp: boolean, pose: Pose, L: number, C: Record<string, string>, lx: number) {
  const outline = shade(C.body, -0.6);
  const lw = lineW(L);
  const t = pose.t;
  const ground = 0.12 * L;
  const flipCurl = pose.react;
  // Antennae: the shrimp's loop up and trail back over its body; the lobster's long whips sweep
  // forward and arc back, thick at the base.
  for (const [k, len] of [[0, shrimp ? 0.9 : 1.1], [1, shrimp ? 0.8 : 1]] as const) {
    const pts: number[] = [];
    let x = 0.2 * L;
    let y = -0.05 * L;
    let a = shrimp ? -0.12 - k * 0.1 : -0.35 - k * 0.12;
    pts.push(x, y);
    for (let j = 1; j <= 10; j++) {
      a += (shrimp ? (j < 5 ? -0.46 : -0.04) : j < 6 ? -0.24 : -0.05) + Math.sin(t * 1.6 + j * 0.4 + k) * 0.04;
      x += Math.cos(a) * L * 0.07 * len;
      y += Math.sin(a) * L * 0.07 * len;
      pts.push(x, y);
    }
    const col = k ? shade(C.body, -0.2) : C.body;
    if (!shrimp) {
      // A thick base segment.
      ctx.strokeStyle = outline;
      ctx.lineWidth = L * 0.026;
      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      ctx.lineTo(pts[2], pts[3]);
      ctx.stroke();
      ctx.strokeStyle = col;
      ctx.lineWidth = L * 0.018;
      ctx.stroke();
    }
    ctx.beginPath();
    smoothOpen(ctx, pts);
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1, L * (shrimp ? 0.008 : 0.011));
    ctx.stroke();
  }
  // Walking legs (or, for the shrimp, little legs and fluttering swimmerets).
  for (let k = 0; k < 4; k++) {
    const ph = pose.walk + k * (Math.PI / 2);
    const hx = (0.1 - k * 0.05) * L;
    const hy = 0.03 * L;
    const lift = shrimp ? 0 : Math.max(0, Math.cos(ph)) * 0.03 * L;
    const fx = hx + (shrimp ? -0.02 * L : Math.sin(ph) * 0.03 * L);
    const fy = shrimp ? hy + 0.07 * L : ground - lift;
    ctx.strokeStyle = k % 2 ? C.leg : shade(C.leg, -0.15);
    ctx.lineWidth = Math.max(1, L * (shrimp ? 0.01 : 0.016));
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx + 0.03 * L, (hy + fy) / 2 - 0.02 * L);
    ctx.lineTo(fx, fy);
    ctx.stroke();
  }
  // Abdomen: six segments curling down, ending in the tail fan.
  const segs = 6;
  let ax = -0.1 * L;
  let ay = -0.015 * L;
  let ang = Math.PI;
  const curl = (shrimp ? 0.17 : 0.06) + flipCurl * 0.42;
  const parts: { x: number; y: number; a: number; h: number; l: number }[] = [];
  for (let i = 0; i < segs; i++) {
    const h = (shrimp ? 0.09 : 0.13) * L * (1 - i * (shrimp ? 0.09 : 0.075));
    const l = (shrimp ? 0.06 : 0.056) * L;
    ang += curl + Math.sin(t * 2 + i) * 0.015;
    parts.push({ x: ax, y: ay, a: ang, h, l });
    ax += Math.cos(ang) * l;
    ay -= Math.sin(ang) * l;
  }
  // Swimmerets under the abdomen.
  for (let i = 0; i < 5; i++) {
    const p = parts[i];
    const flutter = Math.sin(t * (shrimp ? 14 : 5) + i * 0.9) * 0.4;
    const x0 = p.x + Math.cos(p.a) * p.l * 0.5 + Math.sin(-p.a) * 0;
    const y0 = p.y - Math.sin(p.a) * p.l * 0.5 + p.h * 0.4;
    ctx.strokeStyle = shade(C.leg, -0.1);
    ctx.lineWidth = Math.max(1, L * 0.008);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + Math.cos(Math.PI / 2 + flutter) * 0.04 * L, y0 + Math.sin(Math.PI / 2 + flutter) * 0.04 * L);
    ctx.stroke();
  }
  // Tail fan.
  const last = parts[segs - 1];
  const tx = last.x + Math.cos(last.a) * last.l;
  const ty = last.y - Math.sin(last.a) * last.l;
  for (const k of [-2, -1, 0, 1, 2]) {
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(-last.a + k * 0.32);
    const fan = new Path2D();
    fan.moveTo(0, -0.012 * L);
    fan.quadraticCurveTo(0.05 * L, -0.03 * L, 0.085 * L, 0);
    fan.quadraticCurveTo(0.05 * L, 0.03 * L, 0, 0.012 * L);
    fan.closePath();
    fillStroke(ctx, fan, k === 0 ? C.body : shade(C.body, -0.1), outline, lw * 0.8);
    ctx.restore();
  }
  for (let i = segs - 1; i >= 0; i--) {
    const p = parts[i];
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(-p.a + Math.PI);
    const seg = new Path2D();
    seg.moveTo(0.005 * L, -p.h * 0.5);
    seg.quadraticCurveTo(-p.l * 0.55, -p.h * 0.62, -p.l * 1.12, -p.h * 0.42);
    seg.lineTo(-p.l * 1.12, p.h * 0.32);
    seg.quadraticCurveTo(-p.l * 0.5, p.h * 0.48, 0.005 * L, p.h * 0.45);
    seg.closePath();
    ctx.fillStyle = vgrad(ctx, -p.h * 0.6, p.h * 0.5, [[0, C.light], [0.45, C.body], [1, C.dark]]);
    ctx.fill(seg);
    if (shrimp) {
      ctx.save();
      ctx.clip(seg);
      ctx.fillStyle = rgba(C.stripe ?? "#ffffff", 0.75);
      ctx.fillRect(-p.l * 0.62, -p.h, p.l * 0.16, p.h * 2);
      ctx.restore();
    }
    ctx.lineWidth = lw;
    ctx.strokeStyle = outline;
    ctx.stroke(seg);
    ctx.restore();
  }
  // Carapace with its pointed rostrum.
  const cp = new Path2D();
  const ch = (shrimp ? 0.1 : 0.155) * L;
  cp.moveTo(0.27 * L, -0.045 * L);
  cp.lineTo(0.17 * L, -0.03 * L);
  cp.quadraticCurveTo(0.08 * L, -ch * 0.85, -0.12 * L, -ch * 0.62);
  cp.lineTo(-0.12 * L, ch * 0.42);
  cp.quadraticCurveTo(0.05 * L, ch * 0.62, 0.17 * L, 0.02 * L);
  cp.closePath();
  ctx.fillStyle = vgrad(ctx, -ch, ch * 0.6, [[0, C.light], [0.5, C.body], [1, C.dark]]);
  ctx.fill(cp);
  ctx.save();
  ctx.clip(cp);
  gloss(ctx, 0.02 * L, -ch * 0.6, 0.14 * L, 0.35);
  if (shrimp) {
    ctx.fillStyle = rgba(C.stripe ?? "#ffffff", 0.75);
    ctx.fillRect(-0.02 * L, -ch, 0.03 * L, ch * 2);
  } else {
    // A lobster's knobbly armor and the groove across its shell.
    ctx.fillStyle = rgba(C.light, 0.55);
    for (let k = 0; k < 9; k++) {
      ctx.beginPath();
      ctx.arc((-0.09 + (k % 5) * 0.05) * L, (-ch * 0.45 + Math.floor(k / 5) * ch * 0.35) + (k % 2) * 0.01 * L, 0.009 * L, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = rgba(C.dark, 0.6);
    ctx.lineWidth = lw * 0.9;
    ctx.beginPath();
    ctx.moveTo(0.02 * L, -ch * 0.75);
    ctx.quadraticCurveTo(-0.01 * L, 0, 0.03 * L, ch * 0.45);
    ctx.stroke();
  }
  ctx.restore();
  ctx.lineWidth = lw;
  ctx.strokeStyle = outline;
  ctx.stroke(cp);
  // Claws: two big ones for the lobster; one giant snapping claw for the pistol shrimp.
  const claws: [number, number, boolean][] = shrimp ? [[1.25, 0, false], [0.55, 0.02, true]] : [[1.55, 0, false], [1.35, 0.03, true]];
  for (const [size, dy, far] of claws) {
    if (!far) continue;
    claw(ctx, 0.14 * L, 0.02 * L + dy * L, size, pose, L, far ? shade(C.claw, -0.18) : C.claw, outline, lw, shrimp);
  }
  for (const [size, dy, far] of claws) {
    if (far) continue;
    claw(ctx, 0.14 * L, 0.02 * L + dy * L, size, pose, L, C.claw, outline, lw, shrimp);
  }
  // Eye on its stalk.
  ctx.strokeStyle = outline;
  ctx.lineWidth = Math.max(1.5, L * 0.016);
  ctx.beginPath();
  ctx.moveTo(0.14 * L, -0.06 * L);
  ctx.lineTo(0.17 * L, -0.085 * L);
  ctx.stroke();
  drawEye(ctx, 0.175 * L, -0.09 * L, 0.024 * L * (1 + pose.baby * 0.2), { iris: C.iris, lx, ly: pose.lookY, blink: pose.blink, sleep: pose.sleep, lid: C.body, outline, dark: true });
  if (pose.royal) drawCrown(ctx, 0.0, -ch - 0.03 * L, Math.max(10, 0.11 * L), t);
}

function claw(ctx: Ctx, x: number, y: number, size: number, pose: Pose, L: number, color: string, outline: string, lw: number, shrimp: boolean) {
  const t = pose.t;
  const open = pose.claw > 0.05 ? 0.1 + 0.45 * Math.abs(Math.sin(t * 9)) * pose.claw : 0.1 + 0.06 * Math.sin(t * 1.5);
  const ex = x + 0.08 * L * size;
  const ey = y + 0.05 * L;
  const cx = ex + 0.1 * L * size;
  const cy = ey - 0.01 * L;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 0.032 * L * size + lw;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(ex, ey);
  ctx.lineTo(cx - 0.02 * L * size, cy);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.032 * L * size;
  ctx.stroke();
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.12);
  const s = size * (shrimp ? 1.1 : 1);
  const palm = new Path2D();
  palm.ellipse(0, 0, 0.075 * L * s, 0.042 * L * s, 0, 0, TAU);
  fillStroke(ctx, palm, color, outline, lw);
  for (const [dir, rot] of [[-1, -open], [1, open * 0.3]] as const) {
    ctx.save();
    ctx.translate(0.06 * L * s, dir * 0.012 * L * s);
    ctx.rotate(rot);
    const f = new Path2D();
    f.moveTo(0, dir * 0.016 * L * s);
    f.quadraticCurveTo(0.05 * L * s, dir * 0.02 * L * s, 0.075 * L * s, dir * 0.002 * L * s);
    f.quadraticCurveTo(0.04 * L * s, -dir * 0.004 * L * s, 0, -dir * 0.012 * L * s);
    f.closePath();
    fillStroke(ctx, f, shade(color, dir < 0 ? 0 : -0.1), outline, lw * 0.9);
    ctx.restore();
  }
  ctx.save();
  ctx.clip(palm);
  gloss(ctx, -0.02 * L * s, -0.02 * L * s, 0.06 * L * s, 0.35);
  ctx.restore();
  ctx.restore();
}

// ── Sea snail ─────────────────────────────────────────────────────────────────────────────────
function snail(ctx: Ctx, pose: Pose, L: number, C: Record<string, string>, lx: number) {
  const outline = shade(C.dark, -0.5);
  const lw = lineW(L);
  const t = pose.t;
  const hide = pose.tuck;
  const gy = 0.12 * L;
  const stretch = 1 + Math.sin(pose.walk) * 0.03;
  const out = 1 - hide * 0.85;
  // The foot, gliding along the sand.
  const foot = new Path2D();
  const front = (0.36 * stretch * out + 0.0) * L;
  const back = -0.42 * L * out;
  const pts: number[] = [back, gy - 0.01 * L];
  for (let k = 0; k <= 10; k++) {
    const x = lerp(back, front, k / 10);
    pts.push(x, gy + Math.sin(x * 0.2 - t * 5) * 0.004 * L);
  }
  pts.push(front + 0.04 * L * out, gy - 0.05 * L, front + 0.01 * L, gy - 0.12 * L * out, front - 0.08 * L * out, gy - 0.1 * L, 0.0, gy - 0.07 * L, back * 0.7, gy - 0.05 * L);
  smoothClosed(foot, pts);
  ctx.fillStyle = vgrad(ctx, gy - 0.12 * L, gy, [[0, C.body], [1, C.bodyDark]]);
  ctx.fill(foot);
  ctx.lineWidth = lw;
  ctx.strokeStyle = outline;
  ctx.stroke(foot);
  // Eye stalks.
  if (out > 0.2) {
    for (const [k, dx] of [[0, 0], [1, -0.035]] as const) {
      const bx = front - 0.03 * L + dx * L;
      const by = gy - 0.1 * L;
      const sway = Math.sin(t * 1.4 + k) * 0.08;
      const ang = -1.15 - k * 0.15 + sway;
      const len = 0.17 * L * out;
      const ex = bx + Math.cos(ang) * len;
      const ey = by + Math.sin(ang) * len;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 0.022 * L + lw;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.strokeStyle = k ? C.bodyDark : C.body;
      ctx.lineWidth = 0.022 * L;
      ctx.stroke();
      drawEye(ctx, ex, ey, 0.026 * L * out * (1 + pose.baby * 0.2), { iris: C.iris, lx, ly: pose.lookY, blink: pose.blink, sleep: pose.sleep, lid: C.body, outline, dark: true });
    }
    ctx.beginPath();
    ctx.arc(front - 0.02 * L, gy - 0.07 * L, 0.025 * L, 0.15 * Math.PI, 0.75 * Math.PI);
    ctx.lineWidth = lw * 0.8;
    ctx.strokeStyle = outline;
    ctx.stroke();
  }
  // The spiral shell.
  const cx = -0.04 * L;
  const cy = gy - 0.25 * L;
  const R = 0.23 * L;
  const shell = new Path2D();
  shell.arc(cx, cy, R, 0, TAU);
  const sg = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
  sg.addColorStop(0, shade(C.shell, 0.35));
  sg.addColorStop(0.6, C.shell);
  sg.addColorStop(1, C.dark);
  ctx.fillStyle = sg;
  ctx.fill(shell);
  ctx.save();
  ctx.clip(shell);
  for (const [col, w, off] of [[C.dark, 0.05, 0], [C.band, 0.022, 0.5]] as const) {
    ctx.beginPath();
    for (let a = 0; a <= TAU * 3.2; a += 0.12) {
      const r = R * Math.exp(-0.15 * (a + off));
      const x = cx + Math.cos(a + 1) * r * 0.98;
      const y = cy + Math.sin(a + 1) * r * 0.98;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = col;
    ctx.lineWidth = w * L;
    ctx.stroke();
  }
  gloss(ctx, cx - R * 0.35, cy - R * 0.45, R * 0.7, 0.42);
  ctx.restore();
  ctx.lineWidth = lw;
  ctx.strokeStyle = outline;
  ctx.stroke(shell);
  if (pose.royal) drawCrown(ctx, cx, cy - R - 0.01 * L, Math.max(10, 0.12 * L), t);
}

// ── Duck, swan and flamingo, floating on the surface (local y = 0 is the waterline) ───────────
function bird(ctx: Ctx, kind: string, pose: Pose, L: number, C: Record<string, string>, lx: number) {
  const outline = shade(C.dark, -0.55);
  const lw = lineW(L);
  const t = pose.t;
  ctx.save();
  ctx.rotate(pose.dabble * 1.15);
  const swan = kind === "swan";
  const flam = kind === "flamingo";
  // Underwater: webbed feet paddling (a power stroke back, a folded recovery forward).
  ctx.save();
  ctx.beginPath();
  ctx.rect(-L, 0, L * 2, L);
  ctx.clip();
  for (const side of [0, 1]) {
    const ph = pose.phase + side * Math.PI;
    const kick = Math.sin(ph);
    const hx = (side ? -0.09 : 0.03) * L;
    const fx = hx - kick * 0.075 * L;
    const fy = 0.165 * L + Math.cos(ph) * 0.018 * L;
    const col = side ? shade(C.feet, -0.15) : C.feet;
    ctx.strokeStyle = rgba(col, 0.85);
    ctx.lineWidth = Math.max(1.5, L * 0.02);
    ctx.beginPath();
    ctx.moveTo(hx, 0.07 * L);
    ctx.quadraticCurveTo(hx + 0.01 * L, (0.07 * L + fy) / 2, fx, fy);
    ctx.stroke();
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(0.15 + kick * 0.45);
    const spread = 0.55 + 0.45 * Math.max(0, kick);
    const foot = new Path2D();
    foot.moveTo(0.008 * L, 0);
    foot.lineTo(-0.075 * L, -0.032 * L * spread);
    foot.quadraticCurveTo(-0.062 * L, -0.012 * L * spread, -0.085 * L, 0);
    foot.quadraticCurveTo(-0.062 * L, 0.012 * L * spread, -0.075 * L, 0.032 * L * spread);
    foot.closePath();
    ctx.fillStyle = rgba(col, 0.9);
    ctx.fill(foot);
    ctx.lineWidth = lw * 0.6;
    ctx.strokeStyle = rgba(shade(col, -0.45), 0.8);
    ctx.stroke(foot);
    ctx.restore();
  }
  ctx.restore();
  // Body: a compact duck with an upturned tail, a long smooth swan, a fluffy flamingo.
  const body = new Path2D();
  if (swan) {
    body.moveTo(0.16 * L, -0.13 * L);
    body.bezierCurveTo(0.02 * L, -0.2 * L, -0.2 * L, -0.25 * L, -0.37 * L, -0.31 * L);
    body.quadraticCurveTo(-0.45 * L, -0.31 * L, -0.43 * L, -0.2 * L);
    body.quadraticCurveTo(-0.41 * L, -0.04 * L, -0.28 * L, 0.06 * L);
    body.quadraticCurveTo(-0.05 * L, 0.12 * L, 0.2 * L, 0.08 * L);
    body.quadraticCurveTo(0.34 * L, 0.02 * L, 0.3 * L, -0.06 * L);
    body.quadraticCurveTo(0.26 * L, -0.12 * L, 0.16 * L, -0.13 * L);
  } else if (flam) {
    body.moveTo(0.17 * L, -0.12 * L);
    body.bezierCurveTo(0.06 * L, -0.25 * L, -0.2 * L, -0.27 * L, -0.33 * L, -0.19 * L);
    body.quadraticCurveTo(-0.44 * L, -0.13 * L, -0.4 * L, -0.03 * L);
    body.quadraticCurveTo(-0.31 * L, 0.08 * L, -0.05 * L, 0.1 * L);
    body.quadraticCurveTo(0.23 * L, 0.1 * L, 0.29 * L, -0.02 * L);
    body.quadraticCurveTo(0.29 * L, -0.09 * L, 0.17 * L, -0.12 * L);
  } else {
    body.moveTo(0.14 * L, -0.2 * L);
    body.quadraticCurveTo(-0.05 * L, -0.24 * L, -0.25 * L, -0.2 * L);
    body.quadraticCurveTo(-0.33 * L, -0.21 * L, -0.38 * L, -0.29 * L);
    body.quadraticCurveTo(-0.37 * L, -0.12 * L, -0.3 * L, -0.02 * L);
    body.quadraticCurveTo(-0.22 * L, 0.1 * L, 0.0, 0.11 * L);
    body.quadraticCurveTo(0.26 * L, 0.11 * L, 0.31 * L, -0.02 * L);
    body.quadraticCurveTo(0.33 * L, -0.15 * L, 0.14 * L, -0.2 * L);
  }
  body.closePath();
  ctx.fillStyle = vgrad(ctx, -0.3 * L, 0.12 * L, [[0, C.light], [0.5, C.body], [1, C.dark]]);
  ctx.fill(body);
  const flapUp = pose.react > 0 ? Math.abs(Math.sin(t * 16)) * pose.react : 0;
  ctx.save();
  ctx.clip(body);
  gloss(ctx, 0.08 * L, -0.18 * L, 0.25 * L, 0.3);
  if (flapUp < 0.05) foldedWing(ctx, L, C, lw, swan, flam);
  ctx.restore();
  ctx.lineWidth = lw;
  ctx.strokeStyle = outline;
  ctx.stroke(body);
  // Neck and head.
  let hx: number;
  let hy: number;
  let hr: number;
  if (swan || flam) {
    const sway = Math.sin(t * 0.9) * 0.015 * L;
    const xs = [0.2 * L, 0.29 * L, 0.24 * L, 0.15 * L + sway, 0.2 * L + sway, 0.28 * L + sway];
    const ys = [-0.12 * L, -0.3 * L, -0.48 * L, -0.62 * L, -0.76 * L, -0.8 * L];
    const ws = [0.1 * L, 0.07 * L, 0.06 * L, 0.055 * L, 0.06 * L, 0.06 * L];
    const neck = new Path2D();
    ribbon(neck, xs, ys, ws);
    ctx.fillStyle = flam ? C.body : C.light;
    ctx.fill(neck);
    ctx.lineWidth = lw;
    ctx.stroke(neck);
    hx = 0.29 * L + sway;
    hy = -0.8 * L;
    hr = 0.06 * L;
  } else {
    hx = 0.24 * L;
    hy = -0.36 * L;
    hr = 0.14 * L;
    const neck = new Path2D();
    neck.moveTo(0.1 * L, -0.18 * L);
    neck.quadraticCurveTo(0.14 * L, -0.3 * L, hx - 0.1 * L, hy + 0.04 * L);
    neck.lineTo(hx + 0.06 * L, hy + 0.1 * L);
    neck.quadraticCurveTo(0.26 * L, -0.18 * L, 0.27 * L, -0.12 * L);
    neck.closePath();
    ctx.fillStyle = C.body;
    ctx.fill(neck);
  }
  // Beak.
  ctx.save();
  ctx.translate(hx + hr * 0.75, hy + hr * (swan || flam ? 0.1 : 0.15));
  const open = pose.mouth * 0.25;
  if (flam) {
    const b = new Path2D();
    b.moveTo(-0.01 * L, -0.025 * L);
    b.quadraticCurveTo(0.08 * L, -0.03 * L, 0.1 * L, 0.03 * L);
    b.quadraticCurveTo(0.09 * L, 0.06 * L, 0.06 * L, 0.04 * L);
    b.quadraticCurveTo(0.03 * L, 0.01 * L, -0.01 * L, 0.02 * L);
    b.closePath();
    fillStroke(ctx, b, C.beakLight, outline, lw * 0.8);
    ctx.save();
    ctx.clip(b);
    ctx.fillStyle = C.beak;
    ctx.fillRect(0.055 * L, -0.05 * L, 0.08 * L, 0.12 * L);
    ctx.restore();
  } else {
    for (const [dir, col] of [[-1, C.beak], [1, shade(C.beak, -0.12)]] as const) {
      ctx.save();
      ctx.rotate(dir * open);
      const b = new Path2D();
      const len = swan ? 0.085 * L : 0.13 * L;
      b.moveTo(-0.01 * L, dir * 0.002 * L);
      b.quadraticCurveTo(len * 0.5, dir * (swan ? 0.024 : 0.04) * L, len, dir * 0.012 * L);
      b.quadraticCurveTo(len * 1.05, 0, len, 0);
      b.lineTo(-0.01 * L, 0);
      b.closePath();
      fillStroke(ctx, b, col, outline, lw * 0.8);
      ctx.restore();
    }
    if (swan) {
      ctx.beginPath();
      ctx.arc(-0.005 * L, -0.012 * L, 0.018 * L, 0, TAU);
      ctx.fillStyle = C.knob;
      ctx.fill();
    }
  }
  ctx.restore();
  // Head.
  const head = new Path2D();
  head.arc(hx, hy, hr, 0, TAU);
  ctx.fillStyle = vgrad(ctx, hy - hr, hy + hr, [[0, C.light], [1, C.body]]);
  ctx.fill(head);
  ctx.save();
  ctx.clip(head);
  gloss(ctx, hx - hr * 0.3, hy - hr * 0.4, hr, 0.35);
  ctx.restore();
  ctx.lineWidth = lw;
  ctx.strokeStyle = outline;
  ctx.stroke(head);
  drawEye(ctx, hx + hr * 0.25, hy - hr * 0.15, hr * (swan || flam ? 0.34 : 0.26) * (1 + pose.baby * 0.2), { iris: C.iris, lx, ly: pose.lookY, blink: pose.blink, sleep: pose.sleep, lid: C.body, outline, dark: true });
  if (!swan) {
    ctx.fillStyle = rgba("#ff5c8a", 0.3);
    ctx.beginPath();
    ctx.ellipse(hx + hr * 0.15, hy + hr * 0.35, hr * 0.22, hr * 0.13, 0, 0, TAU);
    ctx.fill();
  }
  // Flapping: the wing lifts out of the body and beats.
  if (flapUp >= 0.05) {
    ctx.save();
    ctx.translate(0.08 * L, -0.15 * L);
    ctx.rotate(-0.3 - flapUp * 1.2);
    const wing = new Path2D();
    wing.moveTo(0, 0);
    wing.quadraticCurveTo(-0.1 * L, -0.12 * L, -0.4 * L, -0.08 * L);
    for (let k = 0; k < 4; k++) wing.quadraticCurveTo((-0.37 + k * 0.07) * L, (0.0 + k * 0.025) * L, (-0.33 + k * 0.08) * L, (0.02 + k * 0.03) * L);
    wing.quadraticCurveTo(-0.02 * L, 0.08 * L, 0, 0);
    wing.closePath();
    ctx.fillStyle = vgrad(ctx, -0.1 * L, 0.1 * L, [[0, C.light], [1, C.dark]]);
    ctx.fill(wing);
    if (flam) {
      ctx.save();
      ctx.clip(wing);
      ctx.fillStyle = "#2b2b2b";
      ctx.fillRect(-0.45 * L, -0.15 * L, 0.13 * L, 0.3 * L);
      ctx.restore();
    }
    ctx.lineWidth = lw;
    ctx.strokeStyle = outline;
    ctx.stroke(wing);
    ctx.restore();
  }
  // Where the bird meets the water: a soft ring of ripples.
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = Math.max(1, L * 0.012);
  ctx.beginPath();
  ctx.ellipse(-0.04 * L, 0.004 * L, 0.37 * L, 0.035 * L, 0, 0.05 * Math.PI, 0.95 * Math.PI);
  ctx.stroke();
  if (pose.royal) drawCrown(ctx, hx, hy - hr - 0.02 * L, Math.max(10, hr * 1.1), t);
  ctx.restore();
}

/** A folded wing resting on a bird's side: layered coverts and the long flight feathers. */
function foldedWing(ctx: Ctx, L: number, C: Record<string, string>, lw: number, swan: boolean, flam: boolean) {
  const tipX = (swan ? -0.42 : flam ? -0.38 : -0.34) * L;
  const tipY = (swan ? -0.28 : flam ? -0.16 : -0.25) * L;
  const wing = new Path2D();
  wing.moveTo(0.13 * L, -0.12 * L);
  wing.quadraticCurveTo(-0.05 * L, -0.2 * L, tipX, tipY);
  wing.quadraticCurveTo(tipX * 0.6, -0.02 * L, -0.04 * L, 0.0);
  wing.quadraticCurveTo(0.08 * L, -0.02 * L, 0.13 * L, -0.12 * L);
  wing.closePath();
  ctx.fillStyle = swan ? vgrad(ctx, -0.2 * L, 0.0, [[0, "#ffffff"], [1, "#eaf0f6"]]) : vgrad(ctx, -0.2 * L, 0.0, [[0, shade(C.body, -0.04)], [1, shade(C.dark, -0.06)]]);
  ctx.fill(wing);
  // Flight feathers along the back edge.
  ctx.save();
  ctx.clip(wing);
  for (let k = 0; k < 5; k++) {
    const u = k / 5;
    const fx = 0.02 * L + (tipX - 0.02 * L) * (0.45 + u * 0.55);
    const fy = -0.04 * L + (tipY + 0.04 * L) * (0.45 + u * 0.55);
    ctx.beginPath();
    ctx.ellipse(fx, fy + 0.035 * L, 0.11 * L, 0.03 * L, Math.atan2(tipY, tipX) - Math.PI, 0, TAU);
    ctx.fillStyle = flam && k > 2 ? "#2b2b2b" : swan ? shade("#f4f7fb", -0.02 * k) : shade(C.dark, -0.04 * k);
    ctx.fill();
    ctx.strokeStyle = rgba(shade(C.dark, -0.35), swan ? 0.22 : 0.4);
    ctx.lineWidth = Math.max(0.7, lw * 0.5);
    ctx.stroke();
  }
  // Rows of small covert feathers near the shoulder.
  ctx.strokeStyle = rgba(shade(C.dark, -0.3), 0.35);
  for (let r = 0; r < 2; r++)
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.arc((0.05 - k * 0.07 - r * 0.035) * L, (-0.1 + r * 0.04) * L, 0.035 * L, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
    }
  ctx.restore();
  ctx.lineWidth = lw * 0.8;
  ctx.strokeStyle = rgba(shade(C.dark, -0.45), swan ? 0.35 : 0.7);
  ctx.stroke(wing);
}

// ── Frog ──────────────────────────────────────────────────────────────────────────────────────
function frog(ctx: Ctx, pose: Pose, L: number, C: Record<string, string>, lx: number) {
  const outline = shade(C.dark, -0.55);
  const lw = lineW(L);
  const t = pose.t;
  // The kick: 0 = legs folded, 1 = legs stretched out behind.
  const e = Math.pow(Math.max(0, Math.sin(pose.flap)), 0.6);
  const leg = (far: boolean) => {
    // Folded (crouched under the body) ↔ stretched straight back, with a slight bend kept in.
    const hip = [-0.2 * L, 0.03 * L];
    const knee = [lerp(-0.03, -0.38, e) * L, lerp(0.12, 0.09, e) * L];
    const ankle = [lerp(-0.27, -0.58, e) * L, lerp(0.12, 0.05, e) * L];
    // Toes point forward when folded and sweep down and back through the kick.
    const toeDir = lerp(0.15, Math.PI + 0.05, e);
    const col = far ? shade(C.body, -0.22) : C.body;
    const dark = far ? shade(C.dark, -0.15) : C.dark;
    // Thigh: a strong, rounded muscle.
    const thigh = new Path2D();
    ribbon(thigh, [hip[0], (hip[0] + knee[0]) / 2, knee[0]], [hip[1], (hip[1] + knee[1]) / 2 - 0.012 * L, knee[1]], [0.12 * L, 0.11 * L, 0.05 * L]);
    fillStroke(ctx, thigh, vgrad(ctx, hip[1] - 0.06 * L, knee[1] + 0.05 * L, [[0, col], [1, dark]]), outline, lw);
    // Shin, tapering to the ankle.
    const shin = new Path2D();
    ribbon(shin, [knee[0], ankle[0]], [knee[1], ankle[1]], [0.055 * L, 0.03 * L]);
    fillStroke(ctx, shin, col, outline, lw);
    // A long webbed foot with four toes.
    ctx.save();
    ctx.translate(ankle[0], ankle[1]);
    ctx.rotate(toeDir);
    const fl = 0.16 * L;
    const web = new Path2D();
    web.moveTo(0, -0.012 * L);
    const tips: [number, number][] = [[fl, -0.05 * L], [fl * 1.08, -0.017 * L], [fl * 1.08, 0.017 * L], [fl, 0.05 * L]];
    for (const [x, y] of tips) web.quadraticCurveTo(x * 0.75, y * 0.55, x, y);
    web.lineTo(0, 0.012 * L);
    web.closePath();
    fillStroke(ctx, web, rgba(col, 0.92), outline, lw * 0.8);
    ctx.fillStyle = col;
    for (const [x, y] of tips) {
      ctx.beginPath();
      ctx.arc(x, y, 0.011 * L, 0, TAU);
      ctx.fill();
      ctx.lineWidth = lw * 0.6;
      ctx.stroke();
    }
    ctx.restore();
  };
  leg(true);
  // Far front leg.
  ctx.strokeStyle = shade(C.body, -0.22);
  ctx.lineWidth = 0.04 * L;
  ctx.beginPath();
  ctx.moveTo(0.1 * L, 0.06 * L);
  ctx.lineTo(0.17 * L, 0.15 * L);
  ctx.stroke();
  // Body.
  const body = new Path2D();
  body.moveTo(0.34 * L, 0.0);
  body.bezierCurveTo(0.3 * L, -0.12 * L, 0.18 * L, -0.15 * L, 0.05 * L, -0.15 * L);
  body.bezierCurveTo(-0.12 * L, -0.15 * L, -0.28 * L, -0.12 * L, -0.31 * L, 0.0);
  body.bezierCurveTo(-0.28 * L, 0.1 * L, -0.1 * L, 0.13 * L, 0.06 * L, 0.12 * L);
  body.bezierCurveTo(0.22 * L, 0.11 * L, 0.33 * L, 0.07 * L, 0.34 * L, 0.0);
  body.closePath();
  ctx.fillStyle = vgrad(ctx, -0.15 * L, 0.13 * L, [[0, C.light], [0.45, C.body], [0.62, C.body], [0.66, C.belly], [1, C.belly]]);
  ctx.fill(body);
  ctx.save();
  ctx.clip(body);
  ctx.fillStyle = rgba(C.spots, 0.6);
  for (const [x, y, r] of [[-0.12, -0.1, 0.03], [0.0, -0.12, 0.022], [-0.22, -0.05, 0.025], [0.1, -0.09, 0.018]] as const) {
    ctx.beginPath();
    ctx.ellipse(x * L, y * L, r * L * 1.3, r * L, 0, 0, TAU);
    ctx.fill();
  }
  gloss(ctx, 0.05 * L, -0.12 * L, 0.2 * L, 0.32);
  ctx.restore();
  ctx.lineWidth = lw;
  ctx.strokeStyle = outline;
  ctx.stroke(body);
  // The eye bulge.
  const eb = new Path2D();
  eb.arc(0.16 * L, -0.15 * L, 0.075 * L, Math.PI * 0.95, Math.PI * 2.05);
  ctx.fillStyle = C.body;
  ctx.fill(eb);
  ctx.lineWidth = lw;
  ctx.stroke(eb);
  drawEye(ctx, 0.16 * L, -0.16 * L, 0.058 * L * (1 + pose.baby * 0.2), { iris: C.iris, lx, ly: pose.lookY, blink: pose.blink, sleep: pose.sleep, lid: C.body, outline, hslit: true });
  // A wide smile.
  ctx.beginPath();
  ctx.moveTo(0.32 * L, 0.02 * L);
  ctx.quadraticCurveTo(0.2 * L, 0.07 * L + pose.mouth * 0.04 * L, 0.06 * L, 0.03 * L);
  ctx.lineWidth = lw;
  ctx.strokeStyle = outline;
  ctx.stroke();
  ctx.fillStyle = rgba("#ff5c8a", 0.25);
  ctx.beginPath();
  ctx.ellipse(0.2 * L, 0.0, 0.03 * L, 0.018 * L, 0, 0, TAU);
  ctx.fill();
  // Near legs.
  ctx.strokeStyle = outline;
  ctx.lineWidth = 0.045 * L + lw;
  ctx.beginPath();
  ctx.moveTo(0.12 * L, 0.06 * L);
  ctx.lineTo(0.2 * L, 0.16 * L);
  ctx.stroke();
  ctx.strokeStyle = C.body;
  ctx.lineWidth = 0.045 * L;
  ctx.stroke();
  leg(false);
  if (pose.royal) drawCrown(ctx, 0.08 * L, -0.2 * L, Math.max(10, 0.12 * L), t);
}

// ── Sea otter: swims underwater, floats on its back at the surface ────────────────────────────
function otter(ctx: Ctx, pose: Pose, L: number, C: Record<string, string>, lx: number) {
  const outline = shade(C.dark, -0.5);
  const lw = lineW(L);
  const t = pose.t;
  const r = pose.roll;
  ctx.save();
  if (r < 0.5) {
    ctx.scale(1, Math.max(0.08, 1 - r * 2));
    otterSwim(ctx, pose, L, C, outline, lw, lx);
  } else {
    ctx.scale(1, Math.max(0.08, r * 2 - 1));
    otterFloat(ctx, pose, L, C, outline, lw, t);
  }
  ctx.restore();
}

function otterSwim(ctx: Ctx, pose: Pose, L: number, C: Record<string, string>, outline: string, lw: number, lx: number) {
  const n = 12;
  const xs: number[] = [];
  const ys: number[] = [];
  const ws: number[] = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    xs.push((0.3 - s * 0.82) * L);
    ys.push(Math.sin(pose.phase - s * 2.6) * 0.03 * L * pose.amp * (0.3 + s));
    ws.push((s < 0.15 ? 0.16 : s < 0.6 ? 0.19 - (s - 0.15) * 0.06 : s < 0.75 ? 0.15 - (s - 0.6) * 0.55 : 0.07 - (s - 0.75) * 0.2) * L);
  }
  // Back foot.
  ctx.fillStyle = C.dark;
  ctx.beginPath();
  ctx.ellipse(xs[8], ys[8] + 0.07 * L, 0.06 * L, 0.025 * L, 0.4 + Math.sin(pose.phase) * 0.3, 0, TAU);
  ctx.fill();
  const body = new Path2D();
  ribbon(body, xs, ys, ws);
  ctx.fillStyle = vgrad(ctx, -0.1 * L, 0.1 * L, [[0, C.light], [0.5, C.fur], [1, C.dark]]);
  ctx.fill(body);
  ctx.lineWidth = lw;
  ctx.strokeStyle = outline;
  ctx.stroke(body);
  // Head.
  const hx = 0.32 * L;
  const hy = ys[0] - 0.01 * L;
  const head = new Path2D();
  head.ellipse(hx, hy, 0.1 * L, 0.085 * L, 0, 0, TAU);
  ctx.fillStyle = C.fur;
  ctx.fill(head);
  ctx.save();
  ctx.clip(head);
  ctx.fillStyle = C.face;
  ctx.beginPath();
  ctx.ellipse(hx + 0.04 * L, hy + 0.025 * L, 0.07 * L, 0.05 * L, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = lw;
  ctx.stroke(head);
  ctx.fillStyle = C.fur;
  ctx.beginPath();
  ctx.arc(hx - 0.05 * L, hy - 0.075 * L, 0.022 * L, 0, TAU);
  ctx.fill();
  ctx.stroke();
  drawEye(ctx, hx + 0.035 * L, hy - 0.02 * L, 0.024 * L * (1 + pose.baby * 0.2), { iris: C.iris, lx, ly: pose.lookY, blink: pose.blink, sleep: pose.sleep, lid: C.fur, outline, dark: true });
  ctx.fillStyle = C.nose;
  ctx.beginPath();
  ctx.ellipse(hx + 0.095 * L, hy + 0.01 * L, 0.018 * L, 0.013 * L, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = Math.max(0.6, lw * 0.4);
  ctx.beginPath();
  for (const dy of [0.01, 0.025]) {
    ctx.moveTo(hx + 0.07 * L, hy + dy * L);
    ctx.lineTo(hx + 0.15 * L, hy + dy * L + 0.012 * L);
  }
  ctx.stroke();
  // Front paw.
  ctx.fillStyle = C.dark;
  ctx.beginPath();
  ctx.ellipse(xs[2], ys[2] + 0.085 * L, 0.03 * L, 0.018 * L, 0.6 + Math.sin(pose.phase + 1) * 0.4, 0, TAU);
  ctx.fill();
  if (pose.royal) drawCrown(ctx, hx - 0.01 * L, hy - 0.1 * L, Math.max(10, 0.1 * L), pose.t);
}

function otterFloat(ctx: Ctx, pose: Pose, L: number, C: Record<string, string>, outline: string, lw: number, t: number) {
  // Lying on its back: belly up, head raised, paws on its chest holding a pebble.
  const bob = Math.sin(t * 1.5) * 0.01 * L;
  const body = new Path2D();
  body.moveTo(0.22 * L, -0.06 * L + bob);
  body.quadraticCurveTo(0.0, -0.16 * L + bob, -0.3 * L, -0.07 * L + bob);
  body.quadraticCurveTo(-0.36 * L, 0.03 * L + bob, -0.2 * L, 0.06 * L + bob);
  body.quadraticCurveTo(0.05 * L, 0.09 * L + bob, 0.22 * L, 0.03 * L + bob);
  body.closePath();
  ctx.fillStyle = vgrad(ctx, -0.16 * L, 0.08 * L, [[0, C.face], [0.4, C.light], [1, C.fur]]);
  ctx.fill(body);
  ctx.lineWidth = lw;
  ctx.strokeStyle = outline;
  ctx.stroke(body);
  // Tail and feet poking up.
  ctx.fillStyle = C.fur;
  ctx.beginPath();
  ctx.ellipse(-0.42 * L, 0.0 + bob, 0.11 * L, 0.025 * L, 0.1, 0, TAU);
  ctx.fill();
  ctx.stroke();
  for (const dx of [-0.26, -0.2]) {
    ctx.fillStyle = C.dark;
    ctx.beginPath();
    ctx.ellipse(dx * L, -0.12 * L + bob + Math.sin(t * 2 + dx * 9) * 0.006 * L, 0.025 * L, 0.04 * L, -0.4, 0, TAU);
    ctx.fill();
  }
  // Head, raised at the front.
  const hx = 0.28 * L;
  const hy = -0.1 * L + bob;
  const head = new Path2D();
  head.ellipse(hx, hy, 0.095 * L, 0.085 * L, 0, 0, TAU);
  ctx.fillStyle = C.fur;
  ctx.fill(head);
  ctx.save();
  ctx.clip(head);
  ctx.fillStyle = C.face;
  ctx.beginPath();
  ctx.ellipse(hx + 0.02 * L, hy + 0.03 * L, 0.075 * L, 0.055 * L, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = lw;
  ctx.strokeStyle = outline;
  ctx.stroke(head);
  drawEye(ctx, hx + 0.035 * L, hy - 0.025 * L, 0.022 * L, { iris: C.iris, lx: 0.3, ly: -0.2, blink: pose.blink, sleep: pose.sleep, lid: C.fur, outline, dark: true });
  drawEye(ctx, hx - 0.02 * L, hy - 0.03 * L, 0.02 * L, { iris: C.iris, lx: 0.3, ly: -0.2, blink: pose.blink, sleep: pose.sleep, lid: C.fur, outline, dark: true });
  ctx.fillStyle = C.nose;
  ctx.beginPath();
  ctx.ellipse(hx + 0.06 * L, hy + 0.01 * L, 0.016 * L, 0.012 * L, 0, 0, TAU);
  ctx.fill();
  // Paws holding a pebble on its chest.
  ctx.fillStyle = "#9aa7b4";
  ctx.beginPath();
  ctx.ellipse(0.1 * L, -0.12 * L + bob, 0.03 * L, 0.024 * L, 0, 0, TAU);
  ctx.fill();
  ctx.lineWidth = lw * 0.8;
  ctx.stroke();
  ctx.fillStyle = C.dark;
  for (const dx of [0.07, 0.13]) {
    ctx.beginPath();
    ctx.ellipse(dx * L, -0.115 * L + bob + Math.sin(t * 3) * 0.004 * L, 0.018 * L, 0.014 * L, 0, 0, TAU);
    ctx.fill();
  }
  if (pose.royal) drawCrown(ctx, hx, hy - 0.1 * L, Math.max(10, 0.1 * L), t);
}
