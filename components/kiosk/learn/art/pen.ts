// Harbor Learn's drawing kit. Every picture in Learn — the things to count, the answers to tap,
// story scenes, stickers, icons — is a small SVG drawn with these helpers, so it all shares the
// aquarium's look: a bold navy outline, light from the top-left (a gradient plus a white shine),
// round friendly shapes and a bright palette. Pictures are drawn on a 100×100 board, filling
// roughly 8..92 so they sit evenly side by side.
//
//   draw((d) => {
//     d.ball(50, 54, 36, P.red);                       // a shiny red ball (fill + outline + shine)
//     d.path("M50 20 Q54 8 64 6", "none", { sw: 4 });  // a stem (outline only)
//     d.path(leaf(58, 16, 16, -30), d.fill(P.green));   // a leaf
//   })
//
// Keep it simple and bold: it has to read at 40px across a room. No text inside pictures.

export const OL = "#2a2f45";
export type Art = { svg: string; w: number; h: number };
/** A color ramp: light (where the light hits), base, dark (the shaded side). */
export type Ramp = readonly [string, string, string];

/** The palette. Pick a ramp and let `d.fill(ramp)` shade it. */
export const P = {
  red: ["#ff9a9a", "#ff4d5e", "#c41f3b"],
  coral: ["#ffb8a3", "#ff7a59", "#d64a2a"],
  orange: ["#ffcf94", "#ff9f43", "#d4680f"],
  gold: ["#fff3a8", "#ffd23a", "#e09a00"],
  lemon: ["#fffbd6", "#ffe766", "#e2bd00"],
  lime: ["#ddf89a", "#9fe14d", "#5b9f1c"],
  green: ["#9be9a5", "#3fbf5f", "#1d8448"],
  forest: ["#7fcf8a", "#2f9a4f", "#17663a"],
  teal: ["#97f0e2", "#2fc7b0", "#128676"],
  sky: ["#c4ebff", "#5cc4ff", "#1f8bd1"],
  blue: ["#a6caff", "#4a86ff", "#244fc4"],
  navy: ["#8593d6", "#3c4b9d", "#1f2a66"],
  violet: ["#d6c1ff", "#9b6cff", "#6236d2"],
  purple: ["#e3b8f5", "#b45bd9", "#7b2ea1"],
  pink: ["#ffc6e2", "#ff7ab8", "#d23f84"],
  rose: ["#ffd9df", "#ff9fb1", "#e05a75"],
  brown: ["#dcad80", "#a8703f", "#6b4220"],
  wood: ["#e6ba86", "#bd8648", "#7d5127"],
  tan: ["#fff2d9", "#f2d29b", "#c79c5f"],
  sand: ["#fff6dc", "#f7dfa4", "#d9b46c"],
  cream: ["#ffffff", "#fff7e6", "#ead6b0"],
  grey: ["#eef2f6", "#c3ccd8", "#8792a3"],
  steel: ["#dbe3ec", "#9aa9bc", "#5d6c81"],
  stone: ["#cfd5de", "#929cab", "#5c6575"],
  silver: ["#ffffff", "#d9e1ea", "#9eabbb"],
  white: ["#ffffff", "#f4f7fb", "#cfd8e3"],
  ink: ["#6b7190", "#3d4360", "#23273b"],
  black: ["#5c6070", "#2f3242", "#16182a"],
} as const satisfies Record<string, Ramp>;

/** Skin tones, light to deep — every person in Learn uses one of these. */
export const SKIN: readonly Ramp[] = [
  ["#ffe9d6", "#f9d0b0", "#dba683"],
  ["#ffdcbf", "#f1b98e", "#cf8f63"],
  ["#f2c49b", "#d99a6c", "#b0703f"],
  ["#d9a275", "#b67a4c", "#8a5530"],
  ["#a8714a", "#87522f", "#5e3519"],
];
/** Hair colors. */
export const HAIR = {
  black: ["#5a5468", "#2c2838", "#14111c"],
  brown: ["#a8754a", "#6f4626", "#45260f"],
  auburn: ["#d6804e", "#a9502a", "#6e2d12"],
  blond: ["#ffe9a6", "#f2c95c", "#c7942a"],
  red: ["#ffa071", "#e8642f", "#a83a14"],
  grey: ["#f1f3f6", "#c9ced6", "#8b93a1"],
  white: ["#ffffff", "#eef1f5", "#c6ccd6"],
} as const satisfies Record<string, Ramp>;

export type Style = {
  /** Outline width (default 3 — use 2–2.5 for small details, 3.5–4 for big bold shapes). */
  sw?: number;
  /** Outline color; null = no outline. */
  stroke?: string | null;
  /** Opacity. */
  op?: number;
  /** An SVG transform, e.g. "rotate(-20 50 50)". */
  tf?: string;
  dash?: string;
  cap?: "round" | "butt" | "square";
  join?: "round" | "miter" | "bevel";
};

const f2 = (n: number) => Math.round(n * 100) / 100;

/** The pen a picture is drawn with: gradients get unique ids, shapes get the house outline. */
export class Pen {
  private defs: string[] = [];
  private out: string[] = [];
  private n = 0;

  private id() {
    return `g${this.n++}`;
  }
  private attrs(fill: string, o: Style = {}) {
    const stroke = o.stroke === undefined ? OL : o.stroke;
    let a = `fill="${fill}"`;
    if (stroke) a += ` stroke="${stroke}" stroke-width="${o.sw ?? 3}" stroke-linejoin="${o.join ?? "round"}" stroke-linecap="${o.cap ?? "round"}"`;
    if (o.dash) a += ` stroke-dasharray="${o.dash}"`;
    if (o.op !== undefined && o.op < 1) a += ` opacity="${f2(o.op)}"`;
    if (o.tf) a += ` transform="${o.tf}"`;
    return a;
  }

  // ── Fills ─────────────────────────────────────────────────────────────────────────────────
  /** A gradient from a ramp: "r" round, lit from the top-left (most things) · "v" top→bottom ·
   *  "h" left→right · "d" diagonal. Returns a fill value like "url(#g0)". */
  fill(r: Ramp, kind: "r" | "v" | "h" | "d" = "r"): string {
    if (kind === "r") return this.rad([[0, r[0]], [0.55, r[1]], [1, r[2]]]);
    const [x2, y2] = kind === "v" ? [0, 1] : kind === "h" ? [1, 0] : [1, 1];
    return this.lin([[0, r[0]], [0.55, r[1]], [1, r[2]]], 0, 0, x2, y2);
  }
  /** A linear gradient (stops: [offset 0..1, color, opacity?]) in the shape's own box. */
  lin(stops: [number, string, number?][], x1 = 0, y1 = 0, x2 = 0, y2 = 1): string {
    const id = this.id();
    this.defs.push(`<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ""}/>`).join("")}</linearGradient>`);
    return `url(#${id})`;
  }
  /** A radial gradient centered at (cx, cy) in the shape's own box (0..1). */
  rad(stops: [number, string, number?][], cx = 0.35, cy = 0.3, r = 0.85): string {
    const id = this.id();
    this.defs.push(`<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ""}/>`).join("")}</radialGradient>`);
    return `url(#${id})`;
  }

  // ── Shapes ────────────────────────────────────────────────────────────────────────────────
  path(dAttr: string, fill: string, o?: Style) {
    this.out.push(`<path d="${dAttr}" ${this.attrs(fill, o)}/>`);
    return this;
  }
  circle(cx: number, cy: number, r: number, fill: string, o?: Style) {
    this.out.push(`<circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(r)}" ${this.attrs(fill, o)}/>`);
    return this;
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, fill: string, o?: Style) {
    this.out.push(`<ellipse cx="${f2(cx)}" cy="${f2(cy)}" rx="${f2(rx)}" ry="${f2(ry)}" ${this.attrs(fill, o)}/>`);
    return this;
  }
  rect(x: number, y: number, w: number, h: number, rx: number, fill: string, o?: Style) {
    this.out.push(`<rect x="${f2(x)}" y="${f2(y)}" width="${f2(w)}" height="${f2(h)}" rx="${f2(rx)}" ${this.attrs(fill, o)}/>`);
    return this;
  }
  /** A filled polygon through [x, y, x, y, …]. */
  poly(pts: number[], fill: string, o?: Style) {
    this.out.push(`<polygon points="${pairs(pts)}" ${this.attrs(fill, o)}/>`);
    return this;
  }
  /** A stroke-only line. */
  line(x1: number, y1: number, x2: number, y2: number, o: Style & { color?: string } = {}) {
    this.out.push(`<line x1="${f2(x1)}" y1="${f2(y1)}" x2="${f2(x2)}" y2="${f2(y2)}" ${this.attrs("none", { ...o, stroke: o.color ?? o.stroke ?? OL })}/>`);
    return this;
  }
  /** A stroke-only open path (a stem, a whisker, a smile). */
  stroke(dAttr: string, o: Style & { color?: string } = {}) {
    this.out.push(`<path d="${dAttr}" ${this.attrs("none", { ...o, stroke: o.color ?? o.stroke ?? OL })}/>`);
    return this;
  }
  /** A thick colored stroke with the outline around it — arms, legs, tails, handles, ropes.
   *  `w` is the color's width; the outline adds `sw` on each side. */
  tube(dAttr: string, color: string, w: number, sw = 3, o: Style = {}) {
    this.out.push(`<path d="${dAttr}" fill="none" stroke="${OL}" stroke-width="${f2(w + sw * 2)}" stroke-linecap="round" stroke-linejoin="round"${o.tf ? ` transform="${o.tf}"` : ""}${o.op !== undefined ? ` opacity="${o.op}"` : ""}/>`);
    this.out.push(`<path d="${dAttr}" fill="none" stroke="${color}" stroke-width="${f2(w)}" stroke-linecap="round" stroke-linejoin="round"${o.tf ? ` transform="${o.tf}"` : ""}${o.op !== undefined ? ` opacity="${o.op}"` : ""}/>`);
    return this;
  }

  // ── House touches ─────────────────────────────────────────────────────────────────────────
  /** The white highlight where the light hits (top-left). */
  shine(cx: number, cy: number, rx: number, ry: number, a = 0.55, rot = -25) {
    this.out.push(`<ellipse cx="${f2(cx)}" cy="${f2(cy)}" rx="${f2(rx)}" ry="${f2(ry)}" fill="#fff" opacity="${a}" transform="rotate(${rot} ${f2(cx)} ${f2(cy)})"/>`);
    return this;
  }
  /** A shiny ball: shaded fill, outline and shine. */
  ball(cx: number, cy: number, r: number, ramp: Ramp, o?: Style) {
    this.circle(cx, cy, r, this.fill(ramp), o);
    return this.shine(cx - r * 0.38, cy - r * 0.42, r * 0.3, r * 0.17);
  }
  /** A shaded ellipse with a shine. */
  blob(cx: number, cy: number, rx: number, ry: number, ramp: Ramp, o?: Style) {
    this.ellipse(cx, cy, rx, ry, this.fill(ramp), o);
    return this.shine(cx - rx * 0.38, cy - ry * 0.45, rx * 0.28, ry * 0.15);
  }
  /** A soft colored halo (no outline) — glows, light, magic. */
  glow(cx: number, cy: number, r: number, color: string, a = 0.7) {
    return this.circle(cx, cy, r, this.rad([[0, color, a], [0.5, color, a * 0.45], [1, color, 0]], 0.5, 0.5, 0.5), { stroke: null });
  }
  /** A soft shadow on the ground. */
  shadow(cx: number, cy: number, rx: number, ry = rx * 0.22, a = 0.16) {
    return this.ellipse(cx, cy, rx, ry, `rgba(20,30,60,${a})`, { stroke: null });
  }
  /** Rosy cheek. */
  cheek(cx: number, cy: number, r = 4.5) {
    return this.ellipse(cx, cy, r, r * 0.62, "#ff7a9a", { stroke: null, op: 0.45 });
  }
  /** A cute eye: dark oval with a white sparkle (r ≈ 3–6). */
  eye(cx: number, cy: number, r = 4) {
    this.ellipse(cx, cy, r * 0.82, r, OL, { stroke: null });
    return this.circle(cx - r * 0.28, cy - r * 0.38, r * 0.36, "#fff", { stroke: null });
  }
  /** A little smile under the eyes. */
  smile(cx: number, cy: number, w = 8, sw = 2.5) {
    return this.stroke(`M${f2(cx - w / 2)} ${f2(cy)} Q${f2(cx)} ${f2(cy + w * 0.55)} ${f2(cx + w / 2)} ${f2(cy)}`, { sw });
  }
  /** Sparkle stars around something special. */
  sparkle(cx: number, cy: number, s: number, color = "#fff4a8") {
    return this.path(sparklePath(cx, cy, s), color, { sw: Math.max(1.2, s * 0.14), stroke: "#e0a800" });
  }

  // ── Structure ─────────────────────────────────────────────────────────────────────────────
  /** Draw part of the picture under a transform ("rotate(20 50 50)", "translate(10 0) scale(0.8)"). */
  g(tf: string, fn: (d: Pen) => void, op?: number) {
    this.out.push(`<g transform="${tf}"${op !== undefined ? ` opacity="${op}"` : ""}>`);
    fn(this);
    this.out.push(`</g>`);
    return this;
  }
  /** Mirror part of the picture left↔right around x = cx. */
  mirror(cx: number, fn: (d: Pen) => void) {
    return this.g(`translate(${f2(cx * 2)} 0) scale(-1 1)`, fn);
  }
  /** Draw only inside a shape (stripes on a fish, patches on a ball, a reflection in glass). */
  clip(dAttr: string, fn: (d: Pen) => void) {
    const id = this.id();
    this.defs.push(`<clipPath id="${id}"><path d="${dAttr}"/></clipPath>`);
    this.out.push(`<g clip-path="url(#${id})">`);
    fn(this);
    this.out.push(`</g>`);
    return this;
  }
  /** Raw SVG, for anything the helpers don't cover. */
  raw(s: string) {
    this.out.push(s);
    return this;
  }

  toSvg(w: number, h: number) {
    return tidy(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 2}" height="${h * 2}">${this.defs.length ? `<defs>${this.defs.join("")}</defs>` : ""}${this.out.join("")}</svg>`);
  }
}

/** Every number in a picture to 2 decimals: the server and the browser can disagree on the last
 *  digits of a sin/cos, and a picture must come out the same everywhere (it's smaller, too). */
const tidy = (svg: string) =>
  svg.replace(/-?\d+\.\d+e[-+]?\d+|-?\d+\.\d{3,}/gi, (m) => {
    const v = Math.round(parseFloat(m) * 100) / 100;
    return Object.is(v, -0) ? "0" : String(v);
  });

/** Draw a picture (100×100 unless told otherwise). */
export function draw(fn: (d: Pen) => void, w = 100, h = 100): Art {
  const d = new Pen();
  fn(d);
  return { svg: d.toSvg(w, h), w, h };
}

// ── Path helpers (return a `d` string) ─────────────────────────────────────────────────────
const pairs = (pts: number[]) => {
  const s: string[] = [];
  for (let i = 0; i < pts.length; i += 2) s.push(`${f2(pts[i])},${f2(pts[i + 1])}`);
  return s.join(" ");
};
/** A rounded rectangle. */
export function rr(x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  return `M${f2(x + r)} ${f2(y)} H${f2(x + w - r)} Q${f2(x + w)} ${f2(y)} ${f2(x + w)} ${f2(y + r)} V${f2(y + h - r)} Q${f2(x + w)} ${f2(y + h)} ${f2(x + w - r)} ${f2(y + h)} H${f2(x + r)} Q${f2(x)} ${f2(y + h)} ${f2(x)} ${f2(y + h - r)} V${f2(y + r)} Q${f2(x)} ${f2(y)} ${f2(x + r)} ${f2(y)} Z`;
}
/** A circle as a path (for clip shapes). */
export function circlePath(cx: number, cy: number, r: number) {
  return `M${f2(cx - r)} ${f2(cy)} a${f2(r)} ${f2(r)} 0 1 0 ${f2(r * 2)} 0 a${f2(r)} ${f2(r)} 0 1 0 ${f2(-r * 2)} 0 Z`;
}
/** A water drop pointing up (rain, tears, sweat), `s` ≈ its round part's radius. */
export function drop(cx: number, cy: number, s: number) {
  return `M${f2(cx)} ${f2(cy - s * 1.6)} Q${f2(cx + s * 1.1)} ${f2(cy - s * 0.2)} ${f2(cx + s)} ${f2(cy + s * 0.25)} A${f2(s)} ${f2(s)} 0 0 1 ${f2(cx - s)} ${f2(cy + s * 0.25)} Q${f2(cx - s * 1.1)} ${f2(cy - s * 0.2)} ${f2(cx)} ${f2(cy - s * 1.6)} Z`;
}
/** A star with `n` points (outer radius R, inner r), point up. */
export function star(cx: number, cy: number, R: number, r = R * 0.48, n = 5, rot = 0) {
  const p: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = ((i * Math.PI) / n) - Math.PI / 2 + (rot * Math.PI) / 180;
    const rad = i % 2 ? r : R;
    p.push(`${i ? "L" : "M"}${f2(cx + Math.cos(a) * rad)} ${f2(cy + Math.sin(a) * rad)}`);
  }
  return `${p.join(" ")} Z`;
}
/** A soft rounded star (for stickers and rewards). */
export function softStar(cx: number, cy: number, R: number, r = R * 0.52, n = 5) {
  const pts: [number, number][] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = ((i * Math.PI) / n) - Math.PI / 2;
    const rad = i % 2 ? r : R;
    pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
  }
  return smooth(pts, 0.18);
}
/** A heart (s = half width). */
export function heart(cx: number, cy: number, s: number) {
  return `M${f2(cx)} ${f2(cy + s * 0.95)} C${f2(cx - s * 1.25)} ${f2(cy + s * 0.2)} ${f2(cx - s * 1.05)} ${f2(cy - s * 0.85)} ${f2(cx - s * 0.45)} ${f2(cy - s * 0.85)} C${f2(cx - s * 0.12)} ${f2(cy - s * 0.85)} ${f2(cx)} ${f2(cy - s * 0.55)} ${f2(cx)} ${f2(cy - s * 0.4)} C${f2(cx)} ${f2(cy - s * 0.55)} ${f2(cx + s * 0.12)} ${f2(cy - s * 0.85)} ${f2(cx + s * 0.45)} ${f2(cy - s * 0.85)} C${f2(cx + s * 1.05)} ${f2(cy - s * 0.85)} ${f2(cx + s * 1.25)} ${f2(cy + s * 0.2)} ${f2(cx)} ${f2(cy + s * 0.95)} Z`;
}
/** A four-point twinkle. */
export function sparklePath(cx: number, cy: number, s: number) {
  const k = s * 0.2;
  return `M${f2(cx)} ${f2(cy - s)} Q${f2(cx + k)} ${f2(cy - k)} ${f2(cx + s)} ${f2(cy)} Q${f2(cx + k)} ${f2(cy + k)} ${f2(cx)} ${f2(cy + s)} Q${f2(cx - k)} ${f2(cy + k)} ${f2(cx - s)} ${f2(cy)} Q${f2(cx - k)} ${f2(cy - k)} ${f2(cx)} ${f2(cy - s)} Z`;
}
/** A leaf from (x, y) pointing at angle `deg`, length `len`. */
export function leaf(x: number, y: number, len: number, deg = -90, fat = 0.42) {
  const a = (deg * Math.PI) / 180;
  const tx = x + Math.cos(a) * len;
  const ty = y + Math.sin(a) * len;
  const nx = -Math.sin(a) * len * fat;
  const ny = Math.cos(a) * len * fat;
  const mx = (x + tx) / 2;
  const my = (y + ty) / 2;
  return `M${f2(x)} ${f2(y)} Q${f2(mx + nx)} ${f2(my + ny)} ${f2(tx)} ${f2(ty)} Q${f2(mx - nx)} ${f2(my - ny)} ${f2(x)} ${f2(y)} Z`;
}
/** A smooth closed shape through points (Catmull-Rom → Bézier). `t` = tension (0.15–0.25). */
export function smooth(pts: [number, number][], t = 0.2) {
  const n = pts.length;
  let s = `M${f2(pts[0][0])} ${f2(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    s += ` C${f2(p1[0] + (p2[0] - p0[0]) * t)} ${f2(p1[1] + (p2[1] - p0[1]) * t)} ${f2(p2[0] - (p3[0] - p1[0]) * t)} ${f2(p2[1] - (p3[1] - p1[1]) * t)} ${f2(p2[0])} ${f2(p2[1])}`;
  }
  return `${s} Z`;
}
/** A smooth open line through points. */
export function curve(pts: [number, number][], t = 0.2) {
  let s = `M${f2(pts[0][0])} ${f2(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    s += ` C${f2(p1[0] + (p2[0] - p0[0]) * t)} ${f2(p1[1] + (p2[1] - p0[1]) * t)} ${f2(p2[0] - (p3[0] - p1[0]) * t)} ${f2(p2[1] - (p3[1] - p1[1]) * t)} ${f2(p2[0])} ${f2(p2[1])}`;
  }
  return s;
}
/** A lumpy blob (rocks, clouds, bushes): `n` bumps around an ellipse, wobble from a seed. */
export function lumpy(cx: number, cy: number, rx: number, ry: number, n = 9, wobble = 0.12, seed = 1) {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + Math.sin(seed * 12.9898 + i * 78.233) * wobble;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return smooth(pts, 0.2);
}
/** A puffy cloud outline made of round bumps along the top and a flat-ish bottom. */
export function cloudPath(cx: number, cy: number, w: number, h: number) {
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const yb = cy + h * 0.32;
  return `M${f2(x0 + h * 0.3)} ${f2(yb)} Q${f2(x0 - h * 0.05)} ${f2(yb)} ${f2(x0 + h * 0.02)} ${f2(cy + h * 0.02)} Q${f2(x0 + h * 0.06)} ${f2(cy - h * 0.32)} ${f2(x0 + w * 0.3)} ${f2(cy - h * 0.2)} Q${f2(cx - w * 0.08)} ${f2(cy - h * 0.72)} ${f2(cx + w * 0.12)} ${f2(cy - h * 0.38)} Q${f2(x1 - w * 0.08)} ${f2(cy - h * 0.5)} ${f2(x1 - h * 0.06)} ${f2(cy - h * 0.02)} Q${f2(x1 + h * 0.08)} ${f2(yb)} ${f2(x1 - h * 0.3)} ${f2(yb)} Z`;
}

/** A data URL for an <img>, cached per picture. */
const urls = new WeakMap<Art, string>();
export function artUrl(a: Art): string {
  let u = urls.get(a);
  if (!u) {
    u = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(a.svg)}`;
    urls.set(a, u);
  }
  return u;
}
