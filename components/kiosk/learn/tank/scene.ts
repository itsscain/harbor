import { mix, rgba, shade } from "./color";
import { TAU, hash01, ribbon } from "./draw/core";

// The world around the creatures: water and sky for each tank theme, far-off scenery, light
// shafts from the surface, caustics dancing on the sand, swaying sea grass and anemones, the
// rippling surface, and the glass.

type Ctx = CanvasRenderingContext2D;

export type Theme = {
  id: string;
  /** Water from the surface down to the sand. */
  water: [string, string, string, string];
  sky: [string, string];
  far: string;
  sand: [string, string];
  /** Strength of light shafts and caustics (0 = dark tank). */
  light: number;
  /** Glowing specks drifting in the water. */
  glow: boolean;
  /** The kind of far-off scenery. */
  kind: "reef" | "kelp" | "ice" | "deep" | "lagoon" | "night" | "lava";
};

export const THEMES: Record<string, Theme> = {
  reef: { id: "reef", water: ["#9beaff", "#3cc4ee", "#1691cf", "#0b5fa5"], sky: ["#f1fbff", "#c4ecff"], far: "#1a7fc0", sand: ["#f6dfab", "#e2bd76"], light: 1, glow: false, kind: "reef" },
  kelp: { id: "kelp", water: ["#c9f8dd", "#5fd68f", "#0d9a6c", "#06523f"], sky: ["#f2fff6", "#d4f7e2"], far: "#0b7a57", sand: ["#d9c48f", "#a8894e"], light: 0.85, glow: false, kind: "kelp" },
  arctic: { id: "arctic", water: ["#ffffff", "#c6ebfc", "#6cc3ee", "#0a69a8"], sky: ["#ffffff", "#e9f7ff"], far: "#d9f1ff", sand: ["#f8fafc", "#c9d4e0"], light: 1, glow: false, kind: "ice" },
  deep: { id: "deep", water: ["#4f86da", "#1f3b8c", "#0b1d4f", "#020617"], sky: ["#33508f", "#1b2c5e"], far: "#08143a", sand: ["#3a4a62", "#141d2e"], light: 0.35, glow: true, kind: "deep" },
  lagoon: { id: "lagoon", water: ["#fff3f6", "#fbcfe8", "#c4b5fd", "#38bdf8"], sky: ["#fff8fb", "#ffe6f2"], far: "#a58ff3", sand: ["#fde68a", "#f2b84a"], light: 1, glow: false, kind: "lagoon" },
  night: { id: "night", water: ["#5553bf", "#312e81", "#1e1b4b", "#0c0a24"], sky: ["#07061a", "#1c1a4a"], far: "#141238", sand: ["#4c2a8f", "#1e1b4b"], light: 0.3, glow: true, kind: "night" },
  lava: { id: "lava", water: ["#ffeedd", "#fdba74", "#ea580c", "#7c2d12"], sky: ["#ffe2c4", "#ffbf8a"], far: "#4a1a08", sand: ["#4a4440", "#1c1917"], light: 0.7, glow: false, kind: "lava" },
};
export const themeOf = (id: string | null | undefined) => THEMES[id ?? "reef"] ?? THEMES.reef;
/** The color creatures take on far from the glass. */
export const fogColor = (th: Theme) => th.water[2];

export const SURFACE = 0.14;
/** The top of the sand at x. */
export function sandY(x: number, w: number, h: number) {
  return h * 0.865 + Math.sin(x * 0.011 + 0.6) * h * 0.012 + Math.sin(x * 0.029 + 2.1) * h * 0.006 - (x / w) * h * 0.008;
}

// ── The still parts, painted once into a cache ───────────────────────────────────────────────

export function paintWater(ctx: Ctx, w: number, h: number, th: Theme) {
  const sy = h * SURFACE;
  const sky = ctx.createLinearGradient(0, 0, 0, sy);
  sky.addColorStop(0, th.sky[0]);
  sky.addColorStop(1, th.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, sy + 2);
  if (th.kind === "night") {
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = `rgba(255,255,240,${0.4 + hash01("star", i) * 0.6})`;
      ctx.beginPath();
      ctx.arc(hash01("sx", i) * w, hash01("sy", i) * sy * 0.9, 0.6 + hash01("sr", i) * 1.2, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = "#fff7c8";
    ctx.beginPath();
    ctx.arc(w * 0.82, sy * 0.45, sy * 0.3, 0, TAU);
    ctx.fill();
  }
  const g = ctx.createLinearGradient(0, sy, 0, h);
  g.addColorStop(0, th.water[0]);
  g.addColorStop(0.18, th.water[1]);
  g.addColorStop(0.58, th.water[2]);
  g.addColorStop(1, th.water[3]);
  ctx.fillStyle = g;
  ctx.fillRect(0, sy, w, h - sy);
  // Sunlight spreading down from the surface.
  const sun = ctx.createRadialGradient(w * 0.35, sy, 0, w * 0.35, sy, h * 0.9);
  sun.addColorStop(0, rgba("#ffffff", 0.28 * th.light));
  sun.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sun;
  ctx.fillRect(0, sy, w, h);
}

/** Far-off scenery for each theme, hazy with distance. */
export function paintFar(ctx: Ctx, w: number, h: number, th: Theme) {
  const base = h * 0.88;
  const r = (i: number) => hash01(th.id, i);
  ctx.save();
  switch (th.kind) {
    case "reef":
    case "lagoon":
    case "night": {
      const col = th.kind === "lagoon" ? th.far : th.far;
      ctx.fillStyle = rgba(col, th.kind === "night" ? 0.7 : 0.42);
      for (let i = 0; i < 9; i++) {
        const x = (i / 8) * w + (r(i) - 0.5) * w * 0.08;
        const mh = h * (0.08 + r(i + 20) * 0.14);
        ctx.beginPath();
        ctx.ellipse(x, base, w * (0.06 + r(i + 40) * 0.06), mh, 0, Math.PI, TAU);
        ctx.fill();
      }
      // Branching coral and sea fans.
      ctx.strokeStyle = rgba(col, th.kind === "night" ? 0.8 : 0.5);
      ctx.lineCap = "round";
      for (let i = 0; i < 6; i++) {
        const x = w * (0.08 + r(i + 60) * 0.84);
        const y = base - h * 0.06;
        const s = h * (0.1 + r(i + 70) * 0.08);
        ctx.lineWidth = Math.max(2, s * 0.09);
        ctx.beginPath();
        branch(ctx, x, y, -Math.PI / 2, s, 3, th.id + i);
        ctx.stroke();
      }
      break;
    }
    case "kelp":
      ctx.strokeStyle = rgba(th.far, 0.45);
      ctx.lineCap = "round";
      for (let i = 0; i < 9; i++) {
        const x = w * (0.05 + i * 0.11 + (r(i) - 0.5) * 0.05);
        ctx.lineWidth = w * 0.012;
        ctx.beginPath();
        ctx.moveTo(x, base);
        for (let y = base; y > h * 0.12; y -= h * 0.05) ctx.lineTo(x + Math.sin(y * 0.02 + i) * w * 0.012, y);
        ctx.stroke();
      }
      break;
    case "ice": {
      // An ice shelf just under the surface, and icebergs far away.
      const sy = h * SURFACE;
      ctx.fillStyle = "rgba(240,250,255,0.92)";
      ctx.beginPath();
      ctx.moveTo(0, sy);
      for (let i = 0; i <= 16; i++) {
        const x = (i / 16) * w;
        ctx.lineTo(x, sy + h * (0.02 + (i % 2 ? r(i) * 0.07 : r(i) * 0.03)));
      }
      ctx.lineTo(w, sy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba(th.far, 0.75);
      for (let i = 0; i < 5; i++) {
        const x = w * (0.1 + i * 0.2 + (r(i + 9) - 0.5) * 0.06);
        const bh = h * (0.12 + r(i + 30) * 0.12);
        ctx.beginPath();
        ctx.moveTo(x - w * 0.07, base);
        ctx.lineTo(x - w * 0.03, base - bh * 0.7);
        ctx.lineTo(x, base - bh);
        ctx.lineTo(x + w * 0.04, base - bh * 0.6);
        ctx.lineTo(x + w * 0.08, base);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case "deep": {
      ctx.fillStyle = rgba(th.far, 0.9);
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, h * 0.45);
      ctx.quadraticCurveTo(w * 0.08, h * 0.4, w * 0.12, h * 0.62);
      ctx.quadraticCurveTo(w * 0.2, h * 0.86, w * 0.3, h * 0.88);
      ctx.lineTo(w * 0.62, h * 0.9);
      ctx.quadraticCurveTo(w * 0.8, h * 0.5, w * 0.92, h * 0.55);
      ctx.quadraticCurveTo(w, h * 0.58, w, h * 0.5);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
      for (let i = 0; i < 14; i++) {
        ctx.fillStyle = `rgba(140,200,255,${0.25 + r(i) * 0.35})`;
        ctx.beginPath();
        ctx.arc(r(i + 50) * w, h * (0.25 + r(i + 80) * 0.5), 1 + r(i + 7) * 1.6, 0, TAU);
        ctx.fill();
      }
      break;
    }
    case "lava": {
      ctx.fillStyle = rgba(th.far, 0.85);
      for (let i = 0; i < 6; i++) {
        const x = w * (0.04 + i * 0.18 + (r(i) - 0.5) * 0.05);
        const sh = h * (0.18 + r(i + 30) * 0.22);
        ctx.beginPath();
        ctx.moveTo(x - w * 0.06, base + h * 0.02);
        ctx.lineTo(x - w * 0.015, base - sh);
        ctx.lineTo(x + w * 0.02, base - sh * 0.8);
        ctx.lineTo(x + w * 0.06, base + h * 0.02);
        ctx.closePath();
        ctx.fill();
      }
      for (let i = 0; i < 3; i++) {
        const x = w * (0.2 + i * 0.3);
        const gl = ctx.createRadialGradient(x, base, 0, x, base, h * 0.18);
        gl.addColorStop(0, "rgba(255,180,80,0.65)");
        gl.addColorStop(1, "rgba(255,120,40,0)");
        ctx.fillStyle = gl;
        ctx.fillRect(x - h * 0.2, base - h * 0.2, h * 0.4, h * 0.3);
      }
      break;
    }
  }
  ctx.restore();
  // Distance haze over the scenery.
  const haze = ctx.createLinearGradient(0, h * 0.3, 0, h);
  haze.addColorStop(0, rgba(th.water[1], 0));
  haze.addColorStop(1, rgba(th.water[2], 0.25));
  ctx.fillStyle = haze;
  ctx.fillRect(0, h * 0.3, w, h * 0.7);
}

function branch(ctx: Ctx, x: number, y: number, a: number, len: number, depth: number, seed: string) {
  const x2 = x + Math.cos(a) * len;
  const y2 = y + Math.sin(a) * len;
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  if (depth <= 0) return;
  for (const k of [-1, 1]) branch(ctx, x2, y2, a + k * (0.35 + hash01(seed, depth * 7 + k) * 0.35), len * 0.68, depth - 1, seed + k);
}

export function paintSand(ctx: Ctx, w: number, h: number, th: Theme) {
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 8) ctx.lineTo(x, sandY(x, w, h));
  ctx.lineTo(w, h);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, h * 0.84, 0, h);
  g.addColorStop(0, th.sand[0]);
  g.addColorStop(1, th.sand[1]);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Grains and pebbles.
  for (let i = 0; i < 260; i++) {
    const x = hash01(th.id + "g", i) * w;
    const y = sandY(x, w, h) + hash01(th.id + "y", i) * (h - sandY(x, w, h));
    ctx.fillStyle = rgba(hash01("c", i) > 0.5 ? shade(th.sand[1], -0.25) : shade(th.sand[0], 0.35), 0.5);
    ctx.fillRect(x, y, 1.6, 1.6);
  }
  for (let i = 0; i < 18; i++) {
    const x = hash01(th.id + "p", i) * w;
    const y = sandY(x, w, h) + h * (0.03 + hash01(th.id + "q", i) * 0.09);
    const r = 2 + hash01("r", i) * 4;
    ctx.fillStyle = mix(th.sand[1], "#7a869a", 0.5);
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.3, r, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.ellipse(x - r * 0.3, y - r * 0.35, r * 0.45, r * 0.25, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  // A lit edge along the top of the sand.
  ctx.beginPath();
  for (let x = 0; x <= w; x += 8) {
    const y = sandY(x, w, h);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = rgba(shade(th.sand[0], 0.5), 0.7);
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** Vignette and glass reflections (painted once, drawn over everything). */
export function paintGlass(ctx: Ctx, w: number, h: number) {
  const v = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.35, w / 2, h * 0.5, Math.max(w, h) * 0.75);
  v.addColorStop(0, "rgba(0,10,30,0)");
  v.addColorStop(1, "rgba(0,10,30,0.32)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(w * 0.06, 0);
  ctx.lineTo(w * 0.16, 0);
  ctx.lineTo(w * 0.02, h);
  ctx.lineTo(-w * 0.08, h);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.045;
  ctx.beginPath();
  ctx.moveTo(w * 0.2, 0);
  ctx.lineTo(w * 0.23, 0);
  ctx.lineTo(w * 0.09, h);
  ctx.lineTo(w * 0.06, h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ── Moving light ─────────────────────────────────────────────────────────────────────────────

export function drawRays(ctx: Ctx, w: number, h: number, th: Theme, t: number, night: boolean) {
  const a = th.light * (night ? 0.4 : 1);
  if (a <= 0.05) return;
  const sy = h * SURFACE;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 6; i++) {
    const x = w * (0.08 + i * 0.17) + Math.sin(t * 0.07 + i * 1.9) * w * 0.04;
    const top = w * (0.02 + (i % 3) * 0.012);
    const bot = top * (2.6 + (i % 2));
    const skew = w * 0.1;
    const alpha = a * (0.07 + 0.05 * Math.sin(t * 0.35 + i * 2.3));
    const g = ctx.createLinearGradient(0, sy, 0, h * 0.85);
    g.addColorStop(0, `rgba(255,255,240,${alpha})`);
    g.addColorStop(1, "rgba(255,255,240,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - top, sy);
    ctx.lineTo(x + top, sy);
    ctx.lineTo(x + skew + bot, h * 0.85);
    ctx.lineTo(x + skew - bot, h * 0.85);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

let causticTile: HTMLCanvasElement | null = null;
/** A tileable web of bright lines — sunlight focused by the waves (built once). */
function caustics(): HTMLCanvasElement {
  if (causticTile) return causticTile;
  const S = 192;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(S, S);
  const pts: [number, number][] = Array.from({ length: 18 }, (_, i) => [hash01("cx", i) * S, hash01("cy", i) * S]);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      let d1 = 1e9;
      let d2 = 1e9;
      for (const [px, py] of pts) {
        let dx = Math.abs(x - px);
        let dy = Math.abs(y - py);
        if (dx > S / 2) dx = S - dx;
        if (dy > S / 2) dy = S - dy;
        const d = dx * dx + dy * dy;
        if (d < d1) {
          d2 = d1;
          d1 = d;
        } else if (d < d2) d2 = d;
      }
      const e = Math.sqrt(d2) - Math.sqrt(d1);
      const v = Math.max(0, 1 - e / 6);
      const i = (y * S + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 255;
      img.data[i + 2] = 245;
      img.data[i + 3] = Math.round(Math.pow(v, 2.2) * 255);
    }
  ctx.putImageData(img, 0, 0);
  causticTile = c;
  return c;
}

export function drawCaustics(ctx: Ctx, w: number, h: number, th: Theme, t: number, night: boolean) {
  const a = th.light * (night ? 0.35 : 1);
  if (a <= 0.05) return;
  const tile = caustics();
  const pat = ctx.createPattern(tile, "repeat");
  if (!pat) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 16) ctx.lineTo(x, sandY(x, w, h) - 4);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.clip();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = pat;
  for (const [sx, sy, sc, al] of [[11, 6, 1.3, 0.22], [-7, 9, 1.9, 0.14]] as const) {
    ctx.save();
    ctx.globalAlpha = al * a;
    ctx.translate((t * sx) % (192 * sc), (t * sy) % (192 * sc));
    ctx.scale(sc, sc * 0.55);
    ctx.fillRect(-192, (h * 0.8) / (sc * 0.55) - 192, (w + 400) / sc, (h * 0.3) / (sc * 0.55) + 400);
    ctx.restore();
  }
  ctx.restore();
}

// ── Plants ───────────────────────────────────────────────────────────────────────────────────

export type Plant = { x: number; y: number; h: number; w: number; phase: number; c1: string; c2: string; push: number; front: boolean; kelp?: boolean };

export function makePlants(w: number, h: number, th: Theme, clumps: number[]): Plant[] {
  const out: Plant[] = [];
  const add = (x: number, n: number, front: boolean, scale = 1, seed = 0) => {
    for (let i = 0; i < n; i++) {
      const px = x + (i - (n - 1) / 2) * w * 0.012 + (hash01("px" + seed, i) - 0.5) * w * 0.01;
      const green = th.kind === "lava" ? ["#7a8a3a", "#c2b04a"] : th.kind === "deep" || th.kind === "night" ? ["#1f6f6a", "#47c9b0"] : ["#1f8a4c", "#7ee07a"];
      out.push({ x: px, y: sandY(px, w, h) + 4, h: h * (0.14 + hash01("ph" + seed, i) * 0.12) * scale, w: Math.max(5, w * 0.009) * scale, phase: hash01("pp" + seed, i) * TAU, c1: green[0], c2: green[1], push: 0, front });
    }
  };
  add(w * 0.035, 4, false, 1.1, 1);
  add(w * 0.965, 4, false, 1.1, 2);
  add(w * 0.02, 3, true, 0.7, 3);
  add(w * 0.985, 2, true, 0.6, 4);
  clumps.forEach((x, k) => add(x, 6, false, 0.9, 10 + k));
  if (th.kind === "kelp")
    for (let i = 0; i < 6; i++) {
      const x = w * (0.12 + i * 0.15);
      out.push({ x, y: sandY(x, w, h) + 4, h: h * (0.55 + hash01("kh", i) * 0.2), w: w * 0.016, phase: i * 1.3, c1: "#2f6b1f", c2: "#8bbf3a", push: 0, front: false, kelp: true });
    }
  return out;
}

export function drawPlant(ctx: Ctx, p: Plant, t: number) {
  const n = p.kelp ? 12 : 8;
  const xs: number[] = [p.x];
  const ys: number[] = [p.y];
  const ws: number[] = [p.w];
  let a = -Math.PI / 2;
  const seg = p.h / n;
  for (let j = 1; j <= n; j++) {
    const u = j / n;
    a = -Math.PI / 2 + (Math.sin(t * (p.kelp ? 0.5 : 0.9) + p.phase + j * 0.35) * (p.kelp ? 0.18 : 0.14) + p.push * 0.9) * u * 1.6;
    xs.push(xs[j - 1] + Math.cos(a) * seg);
    ys.push(ys[j - 1] + Math.sin(a) * seg);
    ws.push(p.w * (1 - u * 0.75));
  }
  const path = new Path2D();
  ribbon(path, xs, ys, ws);
  const g = ctx.createLinearGradient(0, p.y, 0, p.y - p.h);
  g.addColorStop(0, p.c1);
  g.addColorStop(1, p.c2);
  ctx.fillStyle = g;
  ctx.fill(path);
  ctx.lineWidth = 1;
  ctx.strokeStyle = rgba(shade(p.c1, -0.4), 0.5);
  ctx.stroke(path);
  if (p.kelp) {
    // Kelp blades along the stem.
    for (let j = 2; j < n; j += 2) {
      for (const side of [-1, 1]) {
        const bx = xs[j];
        const by = ys[j];
        const sway = Math.sin(t * 0.8 + p.phase + j) * 0.3;
        const ang = -Math.PI / 2 + side * 0.9 + sway;
        const L = p.w * 3.2;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + Math.cos(ang - side * 0.4) * L * 0.6, by + Math.sin(ang - side * 0.4) * L * 0.6, bx + Math.cos(ang) * L, by + Math.sin(ang) * L);
        ctx.quadraticCurveTo(bx + Math.cos(ang + side * 0.3) * L * 0.5, by + Math.sin(ang + side * 0.3) * L * 0.5, bx, by);
        ctx.fillStyle = p.c2;
        ctx.fill();
      }
    }
  }
}

/** A sea anemone: a stalk and a crown of waving tentacles. */
export function drawAnemone(ctx: Ctx, x: number, y: number, s: number, t: number, wiggle: number) {
  const n = 15;
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI * (1.05 + (i / (n - 1)) * 0.9);
    const xs = [x + Math.cos(a0) * s * 0.18];
    const ys = [y - s * 0.32];
    const ws = [s * 0.075];
    let a = a0;
    for (let j = 1; j <= 5; j++) {
      a += Math.sin(t * 1.6 + i * 0.7 + j * 0.5) * 0.18 + wiggle * Math.sin(t * 14 + i) * 0.2;
      xs.push(xs[j - 1] + Math.cos(a) * s * 0.075);
      ys.push(ys[j - 1] + Math.sin(a) * s * 0.075);
      ws.push(s * 0.075 * (1 - j * 0.12));
    }
    const p = new Path2D();
    ribbon(p, xs, ys, ws);
    ctx.fillStyle = i % 2 ? "#ff7cc0" : "#ff9fd2";
    ctx.fill(p);
    ctx.beginPath();
    ctx.arc(xs[5], ys[5], s * 0.04, 0, TAU);
    ctx.fillStyle = "#ffe3f2";
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(x - s * 0.16, y);
  ctx.quadraticCurveTo(x - s * 0.2, y - s * 0.2, x - s * 0.22, y - s * 0.34);
  ctx.lineTo(x + s * 0.22, y - s * 0.34);
  ctx.quadraticCurveTo(x + s * 0.2, y - s * 0.2, x + s * 0.16, y);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, y - s * 0.34, 0, y);
  g.addColorStop(0, "#ff8fc8");
  g.addColorStop(1, "#c03a82");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#7a1f4f";
  ctx.stroke();
}

// ── The surface ──────────────────────────────────────────────────────────────────────────────

export type Ripple = { x: number; r: number; life: number; big: boolean };

export function surfaceAt(x: number, h: number, t: number) {
  return h * SURFACE + Math.sin(x * 0.02 + t * 1.3) * 2.2 + Math.sin(x * 0.051 - t * 0.9) * 1.3;
}

export function drawSurface(ctx: Ctx, w: number, h: number, th: Theme, t: number, ripples: Ripple[]) {
  // The bright underside of the surface…
  const sy = h * SURFACE;
  const under = ctx.createLinearGradient(0, sy, 0, sy + h * 0.05);
  under.addColorStop(0, rgba("#ffffff", 0.28 * Math.max(0.4, th.light)));
  under.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = under;
  ctx.fillRect(0, sy, w, h * 0.05);
  // …and the moving line where water meets air.
  ctx.beginPath();
  for (let x = 0; x <= w; x += 6) {
    const y = surfaceAt(x, h, t);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = rgba("#ffffff", 0.85);
  ctx.lineWidth = 2.2;
  ctx.stroke();
  for (const r of ripples) {
    const a = Math.max(0, r.life);
    ctx.strokeStyle = rgba("#ffffff", 0.6 * a);
    ctx.lineWidth = r.big ? 2.5 : 1.6;
    ctx.beginPath();
    ctx.ellipse(r.x, sy + 1, r.r, r.r * 0.22, 0, 0, TAU);
    ctx.stroke();
  }
}
