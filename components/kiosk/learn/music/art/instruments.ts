// Harbor Learn music: every instrument, drum and music thing the Music course shows, drawn in the
// house style (../../art/STYLE.md) — a navy outline, light from the top-left, chunky bright shapes
// that read at 40px from across the room. Keyed by the sound ids in lib/learn/mus/catalog.ts
// (instruments and drums), plus a few pictures for the music screens (drum kit, metronome…).
//
//   instArt("violin")  →  { svg, w: 100, h: 100 }   (cached; null for an id that isn't drawn)
//
// Review: node scripts/learn-art.mjs instruments [ids…] [--big]

import { HAIR, OL, P, SKIN, circlePath, curve, draw, lumpy, rr, smooth, type Art, type Pen, type Ramp } from "../../art/pen";
import { MOODS, bust, figure, hand, type Expr } from "../../art/people";

// ── Local helpers ─────────────────────────────────────────────────────────────────────────────
type Pt = [number, number];
const f2 = (n: number) => Math.round(n * 100) / 100;
const rad = (deg: number) => (deg * Math.PI) / 180;
const xy = (p: Pt) => `${f2(p[0])} ${f2(p[1])}`;
/** The curve segments of `curve(pts)` without its opening move, to continue a path with. */
const through = (pts: Pt[]) => curve(pts).replace(/^M\S+ \S+/, "");
/** A closed four-cornered shape. */
const quad = (a: Pt, b: Pt, c: Pt, e: Pt) => `M${xy(a)} L${xy(b)} L${xy(c)} L${xy(e)} Z`;

/** Polished metal: light on the left, a bright band, a dark right edge. */
const metal = (d: Pen, r: Ramp, x2 = 1, y2 = 0.2) => d.lin([[0, r[0]], [0.3, r[1]], [0.6, r[1]], [0.78, r[0]], [1, r[2]]], 0, 0, x2, y2);
/** A standing cylinder's shading (drum shells, tubes): lit from the left. */
const cyl = (d: Pen, r: Ramp) => d.lin([[0, r[0]], [0.25, r[1]], [0.72, r[1]], [1, r[2]]], 0, 0, 1, 0);

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

/** A smooth tapered shape along a spine (sax bodies, drumsticks, horns): `ws` = width at each point. */
function limb(pts: Pt[], ws: number[], t = 0.17) {
  const n = pts.length;
  const L: Pt[] = [];
  const R: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / len;
    const ny = (b[0] - a[0]) / len;
    L.push([pts[i][0] + (nx * ws[i]) / 2, pts[i][1] + (ny * ws[i]) / 2]);
    R.push([pts[i][0] - (nx * ws[i]) / 2, pts[i][1] - (ny * ws[i]) / 2]);
  }
  const cap = (i: number, j: number): Pt => {
    const len = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]) || 1;
    const h = ws[i] * 0.45;
    return [pts[i][0] + ((pts[i][0] - pts[j][0]) / len) * h, pts[i][1] + ((pts[i][1] - pts[j][1]) / len) * h];
  };
  return smooth([...L, cap(n - 1, n - 2), ...R.reverse(), cap(0, 1)], t);
}

/** A little music note (♪) with its foot at (x, y). */
function note(d: Pen, x: number, y: number, s: number, ramp: Ramp) {
  d.tube(`M${f2(x + s * 0.42)} ${f2(y)} V${f2(y - s * 1.6)} Q${f2(x + s * 1.2)} ${f2(y - s * 1.3)} ${f2(x + s * 1.05)} ${f2(y - s * 0.7)}`, ramp[1], s * 0.24, 1.8);
  d.ellipse(x, y, s * 0.55, s * 0.42, d.fill(ramp), { sw: 2, tf: `rotate(-22 ${f2(x)} ${f2(y)})` });
}

/** Short burst lines round a point (a hit, a clap, a click). */
function burst(d: Pen, cx: number, cy: number, r0: number, r1: number, angles: number[], color: string = P.gold[2], sw = 3) {
  for (const a of angles) d.stroke(`M${f2(cx + Math.cos(rad(a)) * r0)} ${f2(cy + Math.sin(rad(a)) * r0)} L${f2(cx + Math.cos(rad(a)) * r1)} ${f2(cy + Math.sin(rad(a)) * r1)}`, { sw, color });
}

/** Sound arcs spreading from (x, y) — dir 1 to the right, -1 to the left. */
function waves(d: Pen, x: number, y: number, n: number, gap: number, dir = 1, color: string = P.sky[1]) {
  for (let i = 1; i <= n; i++) {
    const r = gap * i;
    d.tube(`M${f2(x + dir * r * 0.55)} ${f2(y - r)} Q${f2(x + dir * r * 1.25)} ${f2(y)} ${f2(x + dir * r * 0.55)} ${f2(y + r)}`, color, 3.2, 2);
  }
}

/** A flat keyboard: `n` white keys across the box, black keys where a piano has them (white key 0 = C). */
function keys(d: Pen, x: number, y: number, w: number, h: number, n: number, start = 0, blackH = 0.6) {
  const kw = w / n;
  const white = d.fill(P.white, "v");
  const black = d.fill(P.black, "v");
  d.path(rr(x - 1, y - 1, w + 2, h + 2, 2.5), OL, { stroke: null });
  for (let i = 0; i < n; i++) d.path(rr(x + i * kw + 0.6, y, kw - 1.2, h, Math.min(2, kw * 0.25)), white, { stroke: null });
  for (let i = 1; i < n; i++) {
    if (![1, 2, 4, 5, 6].includes((start + i) % 7)) continue;
    const bx = x + i * kw;
    d.path(rr(bx - kw * 0.32, y, kw * 0.64, h * blackH, Math.min(1.6, kw * 0.2)), black, { stroke: null });
  }
}

/** A knob with its pointer. */
function knob(d: Pen, x: number, y: number, r: number, ramp: Ramp, deg = -40) {
  d.circle(x, y, r, d.fill(ramp), { sw: 1.8 });
  d.line(x, y, x + Math.sin(rad(deg)) * r * 0.75, y - Math.cos(rad(deg)) * r * 0.75, { sw: 1.6, color: "#fff" });
}

/** A mallet: a stick from (x1, y1) to a ball head at (x2, y2). */
function mallet(d: Pen, x1: number, y1: number, x2: number, y2: number, head: Ramp, r = 5.5, shaft: string = P.wood[0]) {
  d.tube(`M${f2(x1)} ${f2(y1)} L${f2(x2)} ${f2(y2)}`, shaft, 2.6, 2);
  d.ball(x2, y2, r, head, { sw: 2.4 });
}

/** A drumstick: thick at the butt (x1, y1), tapering to a bead tip at (x2, y2). */
function stick(d: Pen, x1: number, y1: number, x2: number, y2: number, w = 5.2, ramp: Ramp = P.wood) {
  const L = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / L;
  const uy = (y2 - y1) / L;
  const at = (k: number): Pt => [x1 + ux * L * k, y1 + uy * L * k];
  d.path(limb([at(0), at(0.55), at(0.93)], [w, w * 0.86, w * 0.42]), d.fill(ramp, "h"), { sw: 2.2 });
  d.ellipse(x2 - ux * 2, y2 - uy * 2, w * 0.5, w * 0.36, d.fill(ramp), { sw: 2, tf: `rotate(${f2((Math.atan2(uy, ux) * 180) / Math.PI)} ${f2(x2 - ux * 2)} ${f2(y2 - uy * 2)})` });
}

/** A drum seen from a little above: the shell, hoops, lugs and the head on top (head center
 *  (cx, top), bottom edge at y = bot). */
function drum(d: Pen, cx: number, top: number, bot: number, rx: number, ry: number, o: { shell: Ramp; head?: Ramp; hoop?: Ramp; lugs?: number; hoopH?: number; sw?: number }) {
  const hoop = o.hoop ?? P.silver;
  const hh = o.hoopH ?? 4.5;
  const sw = o.sw ?? 3;
  const front = (y: number) => `A${rx} ${ry} 0 0 0 ${f2(cx + rx)} ${f2(y)}`;
  const back = (y: number) => `A${rx} ${ry} 0 0 1 ${f2(cx - rx)} ${f2(y)}`;
  d.path(`M${f2(cx - rx)} ${f2(top)} V${f2(bot)} ${front(bot)} V${f2(top)} Z`, cyl(d, o.shell), { sw });
  const n = o.lugs ?? 0;
  const chrome = n ? metal(d, P.silver) : "";
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * (i + 0.5)) / n;
    const x = cx - Math.cos(a) * rx * 0.9;
    const w = 2 + Math.sin(a) * 2;
    const dy = ry * Math.sin(a) * 0.9;
    const y0 = top + hh + dy + 1.5;
    const y1 = bot - hh + dy - 1.5;
    if (y1 - y0 > 3) d.path(rr(x - w / 2, y0, w, y1 - y0, w / 2), chrome, { sw: 1.6 });
  }
  d.path(`M${f2(cx - rx)} ${f2(bot - hh)} ${front(bot - hh)} V${f2(bot)} ${back(bot)} Z`, d.fill(hoop, "v"), { sw: sw * 0.8 });
  d.path(`M${f2(cx - rx)} ${f2(top)} ${front(top)} V${f2(top + hh)} ${back(top + hh)} Z`, d.fill(hoop, "v"), { sw: sw * 0.8 });
  d.ellipse(cx, top, rx, ry, d.fill(o.head ?? P.cream), { sw });
}

/** A hand drum whose shell tapers (bongos) or swells (conga): head radius rt at y = top, bottom
 *  radius rb at y = bot, `bulge` = extra half-width at the middle. */
function taperDrum(d: Pen, cx: number, top: number, bot: number, rt: number, rb: number, ry: number, shell: Ramp, o: { bulge?: number; lugs?: number; band?: Ramp } = {}) {
  const k = o.bulge ?? 0;
  const h = bot - top;
  const ryb = (ry * rb) / rt;
  const side = (s: number) => `C${f2(cx + s * (rt + k))} ${f2(top + h * 0.35)} ${f2(cx + s * (rb + k))} ${f2(bot - h * 0.35)} ${f2(cx + s * rb)} ${f2(bot)}`;
  const body = `M${f2(cx - rt)} ${f2(top)} ${side(-1)} A${f2(rb)} ${f2(ryb)} 0 0 0 ${f2(cx + rb)} ${f2(bot)} C${f2(cx + rb + k)} ${f2(bot - h * 0.35)} ${f2(cx + rt + k)} ${f2(top + h * 0.35)} ${f2(cx + rt)} ${f2(top)} Z`;
  d.path(body, cyl(d, shell), { sw: 3 });
  if (o.band) {
    const band = o.band;
    d.clip(body, (c) => {
      for (const t of [0.42, 0.62]) c.ellipse(cx, top + h * t + ry * 0.9, rt + k + 4, ry * 0.95, "none", { sw: 3.4, stroke: band[1] });
    });
    d.path(body, "none", { sw: 3 });
  }
  const n = o.lugs ?? 0;
  const chrome = n ? d.fill(P.silver) : "";
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * (i + 0.5)) / n;
    const x = cx - Math.cos(a) * rt * 0.86;
    const y = top + Math.sin(a) * ry * 0.9;
    d.tube(`M${f2(x)} ${f2(y + 3)} L${f2(x - Math.cos(a) * 1.2)} ${f2(y + h * 0.3)}`, P.silver[1], 1.8, 1.5);
    d.path(rr(x - Math.cos(a) * 1.2 - 2, y + h * 0.3 - 1, 4, 4, 1.4), chrome, { sw: 1.4 });
  }
  d.path(`M${f2(cx - rt)} ${f2(top)} A${rt} ${ry} 0 0 0 ${f2(cx + rt)} ${f2(top)} V${f2(top + 4)} A${rt} ${ry} 0 0 1 ${f2(cx - rt)} ${f2(top + 4)} Z`, d.fill(P.silver, "v"), { sw: 2.4 });
  d.ellipse(cx, top, rt, ry, d.fill(P.cream), { sw: 2.8 });
}

/** A cymbal seen nearly edge-on, bell up (or down with `flip`), center (cx, cy). */
function cymbal(d: Pen, cx: number, cy: number, rx: number, ry: number, rot = 0, flip = false, r: Ramp = P.gold) {
  d.g(`rotate(${rot} ${f2(cx)} ${f2(cy)})`, (g) => {
    const s = flip ? -1 : 1;
    g.path(`M${f2(cx - rx * 0.24)} ${f2(cy)} Q${f2(cx - rx * 0.22)} ${f2(cy - s * (ry + 4.5))} ${f2(cx)} ${f2(cy - s * (ry + 4.5))} Q${f2(cx + rx * 0.22)} ${f2(cy - s * (ry + 4.5))} ${f2(cx + rx * 0.24)} ${f2(cy)} Z`, g.fill(r), { sw: 2.2 });
    g.ellipse(cx, cy, rx, ry, metal(g, r, 1, 0.5), { sw: 2.6 });
    g.ellipse(cx, cy, rx * 0.66, ry * 0.62, "none", { sw: 1.3, stroke: r[2], op: 0.75 });
    g.ellipse(cx, cy - s * ry * 0.35, rx * 0.22, ry * 0.42, g.fill(r), { sw: 1.8 });
    g.shine(cx - rx * 0.5, cy - ry * 0.25, rx * 0.2, Math.max(1, ry * 0.22), 0.7, 0);
  });
}

/** A chrome stand: a rod from (x, top) down to a tripod with its feet on y = foot. */
function stand(d: Pen, x: number, top: number, foot: number, spread = 15) {
  const hub = foot - 13;
  d.tube(`M${f2(x)} ${f2(hub)} L${f2(x)} ${f2(foot - 3)}`, P.steel[1], 2.2, 1.7);
  for (const s of [-1, 1]) d.tube(`M${f2(x)} ${f2(hub)} L${f2(x + s * spread)} ${f2(foot)}`, P.steel[1], 2.4, 1.8);
  d.tube(`M${f2(x)} ${f2(top)} V${f2(hub)}`, P.silver[1], 3, 2);
  d.path(rr(x - 3, hub - 4, 6, 6, 2), d.fill(P.steel, "h"), { sw: 1.8 });
}

/** A violin-family body, upright: center (cx, cy), lower bout half-width w, half-height h.
 *  `slope` gives the sloping shoulders of a double bass. */
function fiddleBody(cx: number, cy: number, w: number, h: number, slope = false) {
  const top: Pt[] = slope ? [[0.3, -1], [0.52, -0.86], [0.72, -0.62], [0.68, -0.38]] : [[0.6, -0.96], [0.83, -0.75], [0.8, -0.5], [0.64, -0.34]];
  const right: Pt[] = [...top, [0.47, -0.16], [0.5, 0.06], [0.66, 0.16], [0.97, 0.38], [0.95, 0.72], [0.5, 0.98]];
  const pts: Pt[] = [[0, -1.02], ...right, [0, 1.02], ...right.slice().reverse().map(([x, y]): Pt => [-x, y])];
  return smooth(pts.map(([x, y]): Pt => [cx + x * w, cy + y * h]), 0.2);
}

/** A whole violin-family instrument, upright, centered on x = cx: scroll on top, body below.
 *  The caller tilts it with a group transform. */
function fiddle(d: Pen, cx: number, y0: number, w: number, h: number, o: { ramp: Ramp; neck: number; slope?: boolean; endpin?: number; chinrest?: boolean; sw?: number }) {
  const sw = o.sw ?? 3;
  const bodyTop = y0 + o.neck;
  const cy = bodyTop + h;
  const nw = w * 0.3;
  const nut = y0 + o.neck * 0.4;
  // Pegs, pegbox, scroll and neck.
  for (const s of [-1, 1]) for (const k of [0, 1]) d.path(rr(s > 0 ? cx + nw * 0.4 : cx - nw * 1.25, y0 + nw * 2 + k * o.neck * 0.11, nw * 0.85, nw * 0.5, nw * 0.25), d.fill(P.ink), { sw: sw * 0.55 });
  d.path(rr(cx - nw * 0.6, y0 + nw * 1.3, nw * 1.2, nut - y0 - nw * 1.1, nw * 0.4), d.fill(o.ramp, "h"), { sw: sw * 0.7 });
  d.circle(cx, y0 + nw * 1.05, nw * 1.05, d.fill(o.ramp), { sw: sw * 0.7 });
  d.stroke(`M${f2(cx - nw * 0.3)} ${f2(y0 + nw * 1.05)} a${f2(nw * 0.36)} ${f2(nw * 0.36)} 0 1 1 ${f2(nw * 0.5)} ${f2(nw * 0.24)}`, { sw: sw * 0.45, color: o.ramp[2] });
  d.path(rr(cx - nw / 2, nut - 1, nw, bodyTop - nut + 4, nw * 0.3), d.fill(o.ramp, "h"), { sw: sw * 0.7 });
  // Endpin.
  if (o.endpin) d.tube(`M${f2(cx)} ${f2(cy + h)} V${f2(cy + h + o.endpin)}`, P.silver[1], Math.max(1.6, w * 0.08), 1.8);
  // Body.
  d.path(fiddleBody(cx, cy, w, h, o.slope), d.rad([[0, P.orange[0]], [0.45, o.ramp[1]], [1, o.ramp[2]]], 0.4, 0.42, 0.8), { sw });
  // f-holes.
  for (const s of [-1, 1]) d.stroke(`M${f2(cx + s * w * 0.42)} ${f2(cy - h * 0.24)} q${f2(-s * w * 0.12)} ${f2(h * 0.12)} 0 ${f2(h * 0.24)} t0 ${f2(h * 0.24)}`, { sw: Math.max(1.6, w * 0.08), color: o.ramp[2] });
  // Fingerboard, tailpiece, chinrest, bridge and strings.
  d.path(rr(cx - nw * 0.56, nut, nw * 1.12, bodyTop + h * 0.72 - nut, nw * 0.4), d.fill(P.ink, "h"), { sw: sw * 0.65 });
  d.path(`M${f2(cx - w * 0.16)} ${f2(cy + h * 0.22)} L${f2(cx + w * 0.16)} ${f2(cy + h * 0.22)} L${f2(cx + w * 0.08)} ${f2(cy + h * 0.88)} Q${f2(cx)} ${f2(cy + h * 0.96)} ${f2(cx - w * 0.08)} ${f2(cy + h * 0.88)} Z`, d.fill(P.ink, "v"), { sw: sw * 0.65 });
  if (o.chinrest) d.path(`M${f2(cx - w * 0.18)} ${f2(cy + h * 0.66)} Q${f2(cx - w * 0.7)} ${f2(cy + h * 0.6)} ${f2(cx - w * 0.64)} ${f2(cy + h * 0.86)} Q${f2(cx - w * 0.38)} ${f2(cy + h * 0.98)} ${f2(cx - w * 0.12)} ${f2(cy + h * 0.9)} Z`, d.fill(P.ink), { sw: sw * 0.55 });
  d.path(rr(cx - w * 0.32, cy - h * 0.01, w * 0.64, Math.max(2.2, h * 0.075), h * 0.03), d.fill(P.tan, "v"), { sw: sw * 0.5 });
  for (const s of [-1.5, -0.5, 0.5, 1.5]) d.line(cx + s * nw * 0.22, nut, cx + s * w * 0.06, cy + h * 0.24, { sw: Math.max(0.9, w * 0.04), color: "#fff6dc" });
  d.shine(cx - w * 0.55, cy + h * 0.42, w * 0.1, h * 0.2, 0.5, 20);
}

/** A bow: stick and hair from (x1, y1) (the frog) to (x2, y2) (the tip). */
function bow(d: Pen, x1: number, y1: number, x2: number, y2: number, s = 1) {
  const L = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / L;
  const uy = (y2 - y1) / L;
  const nx = -uy * 3.2 * s;
  const ny = ux * 3.2 * s;
  d.stroke(`M${f2(x1 + ux * 6 * s)} ${f2(y1 + uy * 6 * s)} L${f2(x2 - ux * 2)} ${f2(y2 - uy * 2)}`, { sw: 2.2 * s, color: P.cream[2] });
  d.tube(`M${f2(x1 + nx)} ${f2(y1 + ny)} L${f2(x2 + nx * 0.6)} ${f2(y2 + ny * 0.6)}`, P.brown[1], 2.2 * s, 1.7);
  d.path(rr(-4 * s, -3 * s, 9 * s, 6.4 * s, 2 * s), d.fill(P.ink), { sw: 1.8, tf: `translate(${f2(x1 + nx * 0.4)} ${f2(y1 + ny * 0.4)}) rotate(${f2((Math.atan2(uy, ux) * 180) / Math.PI)})` });
}

/** An acoustic guitar body (figure-8), upright: center (cx, cy), lower half-width w, half-height h. */
const guitarBody = (cx: number, cy: number, w: number, h: number) =>
  smooth(([[0, -1], [0.57, -0.9], [0.72, -0.55], [0.5, -0.2], [0.88, 0.06], [1, 0.48], [0.64, 0.9], [0, 1], [-0.64, 0.9], [-1, 0.48], [-0.88, 0.06], [-0.5, -0.2], [-0.72, -0.55], [-0.57, -0.9]] as Pt[]).map(([x, y]): Pt => [cx + x * w, cy + y * h]), 0.2);

/** Strings as thin light lines between two heights, spread across `w`. */
function strings(d: Pen, cx: number, y1: number, y2: number, w1: number, w2: number, n: number, sw = 0.9, color = "#fff6dc") {
  for (let i = 0; i < n; i++) {
    const k = n === 1 ? 0 : i / (n - 1) - 0.5;
    d.line(cx + k * w1, y1, cx + k * w2, y2, { sw, color });
  }
}

/** A handbell standing mouth-down: the middle of its mouth at (x, y), half-width w, height h. */
function handbell(d: Pen, x: number, y: number, w: number, h: number, r: Ramp, deg = 0) {
  d.g(`rotate(${deg} ${f2(x)} ${f2(y)})`, (g) => {
    g.path(rr(x - w * 0.2, y - h - w * 0.95, w * 0.4, w * 1.05, w * 0.16), g.fill([r[0], r[2], r[2]], "h"), { sw: 2.4 });
    g.ball(x, y - h - w * 0.98, w * 0.3, P.white, { sw: 2.2 });
    g.ball(x, y + w * 0.1, w * 0.2, P.steel, { sw: 2 });
    const body = `M${f2(x)} ${f2(y - h)} C${f2(x + w * 0.62)} ${f2(y - h)} ${f2(x + w * 0.64)} ${f2(y - h * 0.5)} ${f2(x + w * 0.68)} ${f2(y - h * 0.26)} C${f2(x + w * 0.72)} ${f2(y - h * 0.08)} ${f2(x + w * 0.96)} ${f2(y - h * 0.05)} ${f2(x + w)} ${f2(y)} L${f2(x - w)} ${f2(y)} C${f2(x - w * 0.96)} ${f2(y - h * 0.05)} ${f2(x - w * 0.72)} ${f2(y - h * 0.08)} ${f2(x - w * 0.68)} ${f2(y - h * 0.26)} C${f2(x - w * 0.64)} ${f2(y - h * 0.5)} ${f2(x - w * 0.62)} ${f2(y - h)} ${f2(x)} ${f2(y - h)} Z`;
    g.path(body, metal(g, r, 1, 0.35), { sw: 3 });
    g.path(rr(x - w * 1.06, y - w * 0.2, w * 2.12, w * 0.34, w * 0.17), g.fill(r, "v"), { sw: 2.4 });
    g.shine(x - w * 0.34, y - h * 0.58, w * 0.11, h * 0.2, 0.65, 6);
  });
}

// ── The pictures ──────────────────────────────────────────────────────────────────────────────
export const INSTRUMENT_ART: Record<string, [name: string, draw: (d: Pen) => void]> = {
  // ── Keyboards and tuned percussion ──
  piano: [
    "grand piano",
    (d) => {
      // Seen from the front-right: the keys in front, the curved case behind with its golden
      // insides, and the lid propped open on its stick.
      const S = (u: number, v: number, z = 0): Pt => [21.4 + u * 58.3 + v * 15.1, 62.6 + u * 6.5 - v * 21.6 - z * 43.2];
      const th = rad(48);
      const L = (u: number, v: number): Pt => S(u * Math.cos(th), v, u * Math.sin(th));
      const bent: Pt[] = [[1, 0], [1, 0.3], [0.97, 0.55], [0.86, 0.85], [0.64, 1.12], [0.42, 1.38], [0.22, 1.58], [0.08, 1.68], [0, 1.68]];
      const outline = (m: (u: number, v: number) => Pt) => `M${xy(m(0, 0))} L${xy(m(1, 0))} ${through(bent.map(([u, v]) => m(u, v)))} Z`;
      d.shadow(50, 92, 42);
      // Legs and the pedal lyre.
      for (const [u, v] of [[0.07, 0.08], [0.95, 0.38]]) {
        const [x, y0] = S(u, v, -0.22);
        const y1 = S(u, v, -0.62)[1];
        d.path(`M${f2(x - 4.3)} ${f2(y0)} L${f2(x + 4.3)} ${f2(y0)} L${f2(x + 2.6)} ${f2(y1)} L${f2(x - 2.6)} ${f2(y1)} Z`, d.fill(P.ink, "h"), { sw: 2.4 });
        d.ellipse(x, y1 + 0.5, 3.8, 1.9, d.fill(P.gold), { sw: 1.6 });
      }
      const [lx, ly] = S(0.5, 0.05, -0.22);
      d.path(`M${f2(lx - 4.8)} ${f2(ly)} Q${f2(lx - 7.5)} ${f2(ly + 7.5)} ${f2(lx - 3.2)} ${f2(ly + 13)} H${f2(lx + 3.2)} Q${f2(lx + 7.5)} ${f2(ly + 7.5)} ${f2(lx + 4.8)} ${f2(ly)} Z`, d.fill(P.ink, "h"), { sw: 2 });
      const brass = d.fill(P.gold, "v");
      for (const k of [-1, 1]) d.path(rr(lx + k * 3.2 - 1.9, ly + 12, 3.8, 4.8, 1.4), brass, { sw: 1.5 });
      // The case walls.
      const top = [S(0, 0), ...bent.slice(0, 3).map(([u, v]) => S(u, v))];
      const bot = [S(0, 0, -0.22), ...bent.slice(0, 3).map(([u, v]) => S(u, v, -0.22))];
      d.path(`M${xy(top[0])} L${xy(top[1])} ${through(top.slice(1))} L${xy(bot[3])} ${through(bot.slice(1).reverse())} L${xy(bot[0])} Z`, d.fill(P.ink, "v"), { sw: 3.2 });
      // The open top: black rim, golden plate and strings.
      d.path(outline((u, v) => S(u, v)), d.fill(P.ink), { sw: 3 });
      const inner = outline((u, v) => S(0.5 + (u - 0.5) * 0.88, 0.8 + (v - 0.8) * 0.9));
      d.path(inner, d.fill(P.gold, "d"), { sw: 2 });
      d.clip(inner, (c) => {
        for (let k = 0; k < 8; k++) c.line(...S(0.12 + k * 0.11, 0.1), ...S(0.12 + k * 0.11, 1.8), { sw: 1.3, color: P.gold[2] });
      });
      // The prop stick, then the lid.
      d.tube(`M${xy(S(0.66, 0.6))} L${xy(L(0.98, 0.6))}`, P.ink[0], 2, 1.6);
      d.path(outline(L), d.lin([[0, P.ink[0]], [0.45, P.ink[1]], [1, P.ink[2]]], 0, 0, 1, 1), { sw: 3.2 });
      d.shine(...S(0.16, 0.5, 0.18), 2.4, 9, 0.5, 34);
      // The keyboard.
      const K = (u: number, v: number, z = -0.05) => S(u, v, z);
      d.path(quad(K(-0.04, -0.34), K(1.04, -0.34), K(1.04, -0.34, -0.17), K(-0.04, -0.34, -0.17)), d.fill(P.ink, "v"), { sw: 2.4 });
      d.path(quad(K(0.04, -0.33), K(0.96, -0.33), K(0.96, 0), K(0.04, 0)), OL, { sw: 2.2 });
      const n = 10;
      const du = 0.92 / n;
      const white = d.fill(P.white, "v");
      const black = d.fill(P.black, "v");
      for (let i = 0; i < n; i++) {
        const a = 0.04 + i * du + 0.006;
        const b = a + du - 0.012;
        d.path(quad(K(a, -0.32), K(b, -0.32), K(b, -0.01), K(a, -0.01)), white, { stroke: null });
        d.path(quad(K(a, -0.32), K(b, -0.32), K(b, -0.32, -0.1), K(a, -0.32, -0.1)), P.white[2], { stroke: null });
      }
      for (let i = 1; i < n; i++) {
        if (![1, 2, 4, 5, 6].includes(i % 7)) continue;
        const c = 0.04 + i * du;
        d.path(quad(K(c - 0.028, -0.16, -0.02), K(c + 0.028, -0.16, -0.02), K(c + 0.028, -0.01, -0.02), K(c - 0.028, -0.01, -0.02)), black, { sw: 1.2 });
      }
      for (const [a, b] of [[-0.04, 0.04], [0.96, 1.04]]) {
        d.path(quad(K(a, -0.34, 0.03), K(b, -0.34, 0.03), K(b, 0, 0.03), K(a, 0, 0.03)), d.fill(P.ink), { sw: 2 });
        d.path(quad(K(a, -0.34, 0.03), K(b, -0.34, 0.03), K(b, -0.34, -0.17), K(a, -0.34, -0.17)), P.ink[1], { sw: 2 });
      }
    },
  ],
  bells: [
    "handbells",
    (d) => {
      handbell(d, 25, 80, 14, 34, P.red, -20);
      handbell(d, 75, 80, 14, 34, P.blue, 20);
      handbell(d, 50, 88, 17, 40, P.gold, 0);
      for (const s of [-1, 1]) d.stroke(`M${50 + s * 30} 20 Q${50 + s * 36} 26 ${50 + s * 34} 34 M${50 + s * 37} 13 Q${50 + s * 45} 22 ${50 + s * 43} 33`, { sw: 2.6, color: P.gold[2] });
    },
  ],
  marimba: [
    "marimba",
    (d) => {
      d.shadow(50, 92, 42);
      const n = 8;
      const bx = (i: number) => 15 + i * 8.9;
      // Frame ends and legs.
      for (const x of [11, 89]) {
        d.tube(`M${x} 46 V86`, P.brown[1], 4.4, 2.4);
        d.circle(x, 88, 3, d.fill(P.ink), { sw: 1.8 });
      }
      d.tube("M11 80 H89", P.brown[1], 3, 2);
      // Resonator tubes under the bars, long on the low side.
      const brass = metal(d, P.gold, 1, 0);
      for (let i = 0; i < n; i++) d.path(rr(bx(i) + 0.9, 50, 6, 32 - i * 2.6, 3), brass, { sw: 2 });
      // The bars.
      const rosewood = d.fill([P.wood[0], P.brown[1], P.brown[2]], "h");
      for (let i = 0; i < n; i++) {
        const t = 15 + i * 2.2;
        d.path(rr(bx(i), t, 7.8, 50 - t, 2.4), rosewood, { sw: 2.2 });
        d.circle(bx(i) + 3.9, t + 5, 1.1, P.brown[2], { stroke: null });
      }
      d.path(rr(8, 44, 84, 8, 3), d.fill(P.brown, "v"), { sw: 2.6 });
      d.path(rr(6, 20, 8, 32, 3), d.fill(P.brown, "h"), { sw: 2.4 });
      d.path(rr(86, 30, 8, 22, 3), d.fill(P.brown, "h"), { sw: 2.4 });
      d.shine(18, 47, 10, 1.4, 0.55, 0);
      // Two yarn mallets.
      mallet(d, 40, 36, 60, 9, P.violet, 5.5);
      mallet(d, 56, 38, 78, 14, P.violet, 5.5);
    },
  ],
  xylophone: [
    "xylophone",
    (d) => {
      d.shadow(50, 90, 42);
      const cols = [P.red, P.orange, P.gold, P.lime, P.teal, P.blue, P.violet];
      d.tube("M9 30 L91 44", P.wood[1], 6, 2.6);
      d.tube("M9 76 L91 62", P.wood[1], 6, 2.6);
      for (let i = 0; i < 7; i++) {
        const x = 12 + i * 11;
        const half = 27 - i * 2.6;
        d.path(rr(x, 53 - half, 9.4, half * 2, 2.6), d.fill(cols[i], "h"), { sw: 2.4 });
        for (const y of [53 - half + 5, 53 + half - 5]) d.circle(x + 4.7, y, 1.3, P.silver[1], { sw: 1.1 });
        d.shine(x + 2.6, 53 - half + 12, 1, 5, 0.55, 0);
      }
      mallet(d, 56, 94, 78, 70, P.red, 6);
      mallet(d, 88, 92, 70, 66, P.red, 6);
    },
  ],
  glock: [
    "glockenspiel",
    (d) => {
      d.shadow(50, 91, 42);
      // A blue case with shiny steel bars in two rows, laid out like piano keys.
      d.path(rr(7, 24, 86, 62, 8), d.fill(P.blue, "v"), { sw: 3.4 });
      d.path(rr(12, 29, 76, 52, 5), d.fill(P.navy, "v"), { sw: 2.2 });
      const steel = metal(d, P.silver, 1, 0);
      for (let i = 0; i < 8; i++) {
        const x = 14.5 + i * 9;
        const half = 15 - i * 0.9;
        d.path(rr(x, 63 - half, 7.6, half * 2, 2), steel, { sw: 2 });
        for (const y of [63 - half + 3, 63 + half - 3]) d.circle(x + 3.8, y, 1, P.steel[2], { stroke: null });
      }
      for (const i of [1, 2, 4, 5, 6]) {
        const x = 14.5 + i * 9 - 3.4;
        d.path(rr(x, 32.5, 6.8, 13, 1.8), steel, { sw: 1.8 });
        d.circle(x + 3.4, 35.5, 0.9, P.steel[2], { stroke: null });
      }
      d.shine(13, 27, 9, 1.4, 0.55, 0);
      mallet(d, 24, 93, 40, 66, P.red, 4.6, P.ink[0]);
      mallet(d, 84, 93, 64, 64, P.red, 4.6, P.ink[0]);
    },
  ],
  musicbox: [
    "music box",
    (d) => {
      d.shadow(48, 92, 38);
      // The lid, swung open behind: red velvet in a wooden frame.
      d.path(quad([20, 52], [78, 52], [82, 16], [24, 16]), d.fill(P.wood, "v"), { sw: 3 });
      d.path(quad([25, 48], [73, 48], [76, 21], [28, 21]), d.fill([P.red[1], P.red[2], "#8f1028"], "v"), { sw: 2 });
      // The box: its open top, the side with the crank, and the front.
      d.path(quad([14, 60], [74, 60], [84, 50], [24, 50]), P.brown[2], { sw: 3 });
      d.path(quad([74, 60], [84, 50], [84, 80], [74, 90]), d.fill(P.brown, "v"), { sw: 3 });
      d.path(rr(14, 60, 60, 30, 3), d.fill(P.wood, "v"), { sw: 3.2 });
      d.path(rr(19.5, 65, 49, 20, 3), "none", { sw: 2, stroke: P.gold[1] });
      d.path(`M44 72 C44 68.5 38.5 68.5 38.5 72.5 C38.5 76 44 78.5 44 80.5 C44 78.5 49.5 76 49.5 72.5 C49.5 68.5 44 68.5 44 72 Z`, d.fill(P.red), { sw: 2 });
      d.shine(19, 63, 6, 1.5, 0.6, 0);
      d.circle(79, 69, 2.8, d.fill(P.silver), { sw: 1.8 });
      d.tube("M79 69 L91 62", P.silver[1], 2.4, 1.8);
      d.tube("M91 62 L91 53", P.wood[1], 4.2, 2);
      // The little dancer turning on top.
      d.ellipse(48, 55.5, 7, 2.4, d.fill(P.gold), { sw: 1.8 });
      figure(d, 48, 55, 33, { skin: 1, hair: "bun", hairColor: HAIR.brown, shirt: P.pink }, { armB: [-150, 150], armF: [150, -150], legB: [-4, 0], legF: [4, 0] }, MOODS.happy, { dress: true, pants: P.rose, shoes: P.pink });
      note(d, 12, 40, 7, P.violet);
      note(d, 13, 22, 6, P.pink);
    },
  ],
  kalimba: [
    "kalimba",
    (d) => {
      d.shadow(50, 93, 32);
      d.path("M20 22 Q20 12 30 12 Q50 8 70 12 Q80 12 80 22 V80 Q80 90 70 90 H30 Q20 90 20 80 Z", d.fill(P.wood, "v"), { sw: 3.5 });
      d.circle(50, 81, 5, P.brown[2], { sw: 2.4 });
      const tine = d.fill(P.silver, "h");
      for (let i = -4; i <= 4; i++) {
        const x = 50 + i * 5.6;
        const end = 73 - Math.abs(i) * 5.2;
        d.path(rr(x - 2.1, 18, 4.2, end - 18, 2.1), tine, { sw: 1.8 });
      }
      d.path(rr(23, 21, 54, 5, 2.5), d.fill(P.steel, "v"), { sw: 2 });
      d.path(rr(23, 30, 54, 6, 3), d.fill(P.brown, "v"), { sw: 2.2 });
      d.shine(27, 46, 2, 10, 0.4, 0);
    },
  ],
  steeldrum: [
    "steel drum",
    (d) => {
      d.shadow(50, 92, 40);
      // A shiny steel pan seen from above: a short skirt, a rolled rim, and the dish hammered
      // into note "petals" round the middle.
      const cx = 50;
      const cy = 50;
      const rx = 41;
      const ry = 24;
      d.path(`M${cx - rx} ${cy} V${cy + 16} A${rx} ${ry} 0 0 0 ${cx + rx} ${cy + 16} V${cy} Z`, cyl(d, P.silver), { sw: 3.2 });
      d.ellipse(cx, cy, rx, ry, metal(d, P.silver, 1, 0.4), { sw: 3.2 });
      const dish = `M${cx - rx + 5} ${cy} a${rx - 5} ${ry - 4} 0 1 0 ${(rx - 5) * 2} 0 a${rx - 5} ${ry - 4} 0 1 0 ${-(rx - 5) * 2} 0 Z`;
      d.path(dish, d.lin([[0, P.steel[1]], [0.45, P.silver[1]], [1, "#ffffff"]]), { sw: 2.2 });
      const pad = d.lin([[0, "#ffffff"], [1, P.silver[1]]]);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.39;
        const x = cx + Math.cos(a) * (rx - 15);
        const y = cy + Math.sin(a) * (ry - 9.5);
        const deg = (Math.atan2(Math.sin(a) * (ry / rx), Math.cos(a)) * 180) / Math.PI;
        d.ellipse(x, y, 8, 4.4, pad, { sw: 1.8, stroke: P.steel[2], tf: `rotate(${f2(deg)} ${f2(x)} ${f2(y)})` });
      }
      for (const [x, y] of [[43, 48.5], [57, 48.5], [50, 54]] as Pt[]) d.ellipse(x, y, 4.6, 2.8, pad, { sw: 1.6, stroke: P.steel[2] });
      d.shine(23, 39, 8, 2, 0.85, -14);
      // Two sticks with red rubber tips.
      for (const [x1, y1, x2, y2] of [[10, 12, 36, 42], [90, 10, 64, 40]]) {
        d.tube(`M${x1} ${y1} L${x2} ${y2}`, P.wood[0], 3.2, 2);
        d.ball(x2, y2, 4.8, P.red, { sw: 2.2 });
      }
    },
  ],
  // ── Strings that are plucked and strummed ──
  guitar: [
    "guitar",
    (d) => {
      d.g("rotate(36 50 50)", (g) => {
        g.path(rr(43.5, 2, 13, 15, 4), g.fill(P.brown, "v"), { sw: 2.6 });
        for (const y of [5.5, 9.5, 13.5]) for (const s of [-1, 1]) g.circle(50 + s * 9, y, 2.2, g.fill(P.silver), { sw: 1.5 });
        g.path(rr(46.5, 15, 7, 32, 1.5), g.fill(P.brown, "h"), { sw: 2.4 });
        for (const y of [21, 27, 33, 39]) g.line(47, y, 53, y, { sw: 1.2, color: P.silver[1] });
        g.path(guitarBody(50, 67, 22, 27), g.rad([[0, P.orange[0]], [0.5, P.orange[1]], [1, P.brown[1]]], 0.42, 0.55, 0.72), { sw: 3.4 });
        g.path(rr(46.5, 38, 7, 16, 1.5), g.fill(P.brown, "h"), { sw: 2.2 });
        g.circle(50, 60, 9.5, "none", { sw: 2.4, stroke: P.brown[2] });
        g.circle(50, 60, 7, OL, { stroke: null });
        g.path("M56 63 Q64 64 63 72 Q60 78 54 74 Q57 68 56 63 Z", P.brown[2], { stroke: null, op: 0.45 });
        g.path(rr(41, 78, 18, 5, 2.2), g.fill(P.brown, "v"), { sw: 2.2 });
        strings(g, 50, 16, 80, 5, 5, 6);
        g.shine(38, 74, 3, 8, 0.45, 18);
      });
    },
  ],
  eguitar: [
    "electric guitar",
    (d) => {
      d.g("rotate(36 50 50)", (g) => {
        // Headstock with its six tuners in a row, and the neck.
        g.path("M46.5 19 L45 4 Q45 1 48 1 Q55 2 56 6 Q56 10 53 12 L53.5 19 Z", g.fill(P.tan, "v"), { sw: 2.4 });
        for (const y of [4, 7.5, 11, 14.5]) g.circle(42.5, y, 1.8, g.fill(P.silver), { sw: 1.4 });
        g.path(rr(46.5, 16, 7, 36, 1.5), g.fill(P.tan, "h"), { sw: 2.4 });
        for (const y of [24, 31, 38]) g.circle(50, y, 1.1, OL, { stroke: null });
        // The body, with its pickguard, pickups, knobs and bridge.
        const body = smooth([[45, 50], [41.5, 43], [37, 39], [33, 41], [31.5, 48], [33.5, 57], [31, 64], [28, 74], [31, 85], [39, 92], [50, 93.5], [61, 92], [69, 85], [72, 75], [69, 65], [66, 59], [68.5, 52], [67.5, 46], [63.5, 43.5], [59, 46], [55, 52]], 0.2);
        g.path(body, g.fill(P.red), { sw: 3.4 });
        g.path("M44 52 Q36 54 36 62 Q35 70 40 76 Q44 82 52 82 Q58 81 60 76 L58 62 L56 52 Z", g.fill(P.white, "v"), { sw: 2.2 });
        for (const y of [57, 64.5, 72]) g.path(rr(44, y, 12, 4, 2), g.fill(P.black, "v"), { sw: 1.6 });
        g.path(rr(43.5, 78, 13, 4, 1.4), metal(g, P.silver), { sw: 1.6 });
        for (const [x, y] of [[61, 77], [64.5, 83], [59, 85]] as Pt[]) g.circle(x, y, 2.4, g.fill(P.cream), { sw: 1.5 });
        strings(g, 50, 17, 80, 4.4, 5, 6, 0.8);
        g.shine(36, 70, 2.6, 8, 0.5, 14);
      });
    },
  ],
  ukulele: [
    "ukulele",
    (d) => {
      // Small and chunky next to the guitar: a short neck, four strings, two pegs a side.
      d.g("translate(50 51) rotate(28) scale(0.9) translate(-50 -51)", (g) => {
        g.path("M43 10 Q43 3 50 3 Q57 3 57 10 L55 22 H45 Z", g.fill(P.brown, "v"), { sw: 2.6 });
        for (const y of [9, 16]) for (const s of [-1, 1]) g.circle(50 + s * 9.5, y, 3, g.fill(P.cream), { sw: 1.7 });
        g.path(rr(45.5, 20, 9, 30, 1.8), g.fill(P.brown, "h"), { sw: 2.5 });
        for (const y of [27, 34, 41]) g.line(46, y, 54, y, { sw: 1.4, color: P.silver[1] });
        const ramp: Ramp = ["#ffeab8", "#f9c25c", "#c9822a"];
        g.path(guitarBody(50, 71, 25, 26), g.rad([[0, ramp[0]], [0.55, ramp[1]], [1, ramp[2]]], 0.42, 0.5, 0.75), { sw: 3.6 });
        g.path(rr(45.5, 44, 9, 14, 1.8), g.fill(P.brown, "h"), { sw: 2.2 });
        g.circle(50, 64, 8, OL, { sw: 2.6, stroke: P.brown[2] });
        g.path(rr(40, 82, 20, 5.4, 2.6), g.fill(P.brown, "v"), { sw: 2.2 });
        // A hibiscus on the lower bout.
        for (let i = 0; i < 5; i++) {
          const a = rad(i * 72 - 90);
          g.circle(66 + Math.cos(a) * 3.6, 82 + Math.sin(a) * 3.6, 3, g.fill(P.pink), { sw: 1.4 });
        }
        g.circle(66, 82, 1.8, P.gold[1], { sw: 1.1 });
        strings(g, 50, 21, 84, 5, 5.4, 4, 1.3);
        g.shine(35, 76, 3, 7, 0.5, 18);
      });
    },
  ],
  banjo: [
    "banjo",
    (d) => {
      d.g("rotate(36 50 50)", (g) => {
        g.path("M44.5 9 Q44 2 50 2 Q56 2 55.5 9 L54.5 17 H45.5 Z", g.fill(P.brown, "v"), { sw: 2.4 });
        for (const y of [6, 12]) for (const s of [-1, 1]) g.circle(50 + s * 8, y, 2.2, g.fill(P.silver), { sw: 1.5 });
        g.path(rr(46.5, 15, 7, 36, 1.5), g.fill(P.brown, "h"), { sw: 2.3 });
        g.circle(42, 29, 2.2, g.fill(P.silver), { sw: 1.5 });
        for (const y of [22, 28, 34, 40]) g.line(47, y, 53, y, { sw: 1.2, color: P.silver[1] });
        // The round drum body: a metal rim with its brackets and a white head.
        const cy = 68;
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          g.tube(`M${f2(50 + Math.cos(a) * 21)} ${f2(cy + Math.sin(a) * 21)} L${f2(50 + Math.cos(a) * 25.5)} ${f2(cy + Math.sin(a) * 25.5)}`, P.silver[1], 2.2, 1.4);
        }
        g.circle(50, cy, 22, metal(g, P.silver, 1, 1), { sw: 3 });
        g.circle(50, cy, 18, g.fill(P.cream), { sw: 2.2 });
        g.path("M47 84 L53 84 L55.5 89 L44.5 89 Z", metal(g, P.silver), { sw: 1.8 });
        g.path(rr(43.5, 76, 13, 3.4, 1.4), g.fill(P.brown, "v"), { sw: 1.6 });
        strings(g, 50, 16, 86, 4, 6, 5, 0.9, P.steel[1]);
        g.shine(41, 58, 5, 3, 0.7, -35);
      });
    },
  ],
  harp: [
    "harp",
    (d) => {
      d.shadow(48, 93, 34);
      const neck: [Pt, Pt, Pt, Pt][] = [
        [[22, 16], [34, 4], [47, 8], [55, 19]],
        [[55, 19], [61, 27], [72, 27], [87, 21]],
      ];
      const bez = (a: number, b: number, c: number, e: number, t: number) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * e;
      const neckY = (x: number) => {
        const s = x < 55 ? neck[0] : neck[1];
        let lo = 0;
        let hi = 1;
        for (let i = 0; i < 24; i++) {
          const t = (lo + hi) / 2;
          if (bez(s[0][0], s[1][0], s[2][0], s[3][0], t) < x) lo = t;
          else hi = t;
        }
        return bez(s[0][1], s[1][1], s[2][1], s[3][1], (lo + hi) / 2);
      };
      // Strings (red for C, blue for F, like a real harp) run down into the soundboard.
      for (let i = 0; i < 11; i++) {
        const x = 31 + i * 4.2;
        const col = i % 7 === 0 ? P.red[1] : i % 7 === 3 ? P.blue[1] : "#fff6dc";
        d.line(x, neckY(x) + 4, x, 91 - (x - 27) * 1.25, { sw: 1.6, color: col });
      }
      d.path("M27 88 L45 88 L91 25 Q89 18 82 19 Z", d.fill(P.wood, "h"), { sw: 3 });
      d.stroke("M37 85 L86 24", { sw: 2.4, color: P.wood[2], op: 0.7 });
      // Neck, the column with its crown, and the base.
      d.tube("M22 16 C34 4 47 8 55 19 C61 27 72 27 87 21", P.gold[1], 6.5, 2.8);
      d.path(rr(19, 17, 9, 70, 4), metal(d, P.gold), { sw: 3 });
      d.path(rr(15.5, 8, 16, 10, 4), d.fill(P.gold), { sw: 2.6 });
      d.path(rr(13, 85, 38, 8, 3), d.fill(P.gold, "v"), { sw: 3 });
      d.shine(22, 34, 1.4, 12, 0.65, 0);
    },
  ],
  bass: [
    "bass guitar",
    (d) => {
      d.g("translate(50 50) rotate(-38) scale(0.93) translate(-50 -52)", (g) => {
        g.path("M45.5 14 L44.5 1 Q44.5 -2 47.5 -2 L55 -2 Q58 -2 57.5 2 L54.5 14 Z", g.fill(P.tan, "v"), { sw: 2.4 });
        for (const y of [0.5, 4.5, 8.5, 12.5]) {
          g.tube(`M44.5 ${y} H40`, P.silver[1], 1.6, 1.3);
          g.ellipse(38.6, y, 2.2, 1.6, g.fill(P.silver), { sw: 1.3 });
        }
        g.path(rr(46.5, 12, 7, 42, 1.5), g.fill(P.tan, "h"), { sw: 2.4 });
        for (const y of [22, 30, 38, 46]) g.circle(50, y, 1.1, OL, { stroke: null });
        const body = smooth([[45, 52], [41.5, 45], [36.5, 40.5], [31.5, 42], [29.5, 50], [31.5, 60], [28.5, 68], [25.5, 79], [29, 90], [38, 97], [50, 98.5], [62, 97], [71, 90], [74.5, 80], [71.5, 69], [67.5, 62], [70, 54], [69, 48], [65, 45.5], [60, 47.5], [55.5, 53]], 0.2);
        g.path(body, g.fill(P.blue), { sw: 3.4 });
        g.path("M44 54 Q36 56 36 65 Q35 74 41 81 Q46 87 54 86 Q60 85 61 79 L59 64 L56 54 Z", g.fill(P.white, "v"), { sw: 2.2 });
        g.path(rr(42.5, 62, 7.5, 4.2, 2), g.fill(P.black, "v"), { sw: 1.5 });
        g.path(rr(50, 65.5, 7.5, 4.2, 2), g.fill(P.black, "v"), { sw: 1.5 });
        g.path(rr(43.5, 74, 13, 4.2, 2), g.fill(P.black, "v"), { sw: 1.5 });
        g.path(rr(43.5, 83, 13, 5, 1.6), metal(g, P.silver), { sw: 1.6 });
        for (const [x, y] of [[64, 82], [67, 88]] as Pt[]) g.circle(x, y, 2.5, g.fill(P.cream), { sw: 1.5 });
        strings(g, 50, 13, 85, 4.4, 6, 4, 1, P.steel[1]);
        g.shine(34, 74, 2.6, 9, 0.5, 14);
      });
    },
  ],
  synthbass: [
    "synth bass",
    (d) => {
      d.shadow(50, 91, 42);
      d.path(rr(8, 26, 84, 60, 8), d.fill(P.violet, "v"), { sw: 3.4 });
      // The screen and its big, slow, low wave.
      const scr = rr(15, 33, 50, 27, 5);
      d.path(scr, d.fill(P.black, "v"), { sw: 2.4 });
      d.clip(scr, (c) => {
        c.stroke("M15 46.5 H65", { sw: 1.2, color: P.teal[2], op: 0.7 });
        c.stroke("M13 46 C21 29 31 29 39 46 S57 63 65 46", { sw: 8, color: P.lime[1], op: 0.3 });
        c.stroke("M13 46 C21 29 31 29 39 46 S57 63 65 46", { sw: 3.4, color: P.lime[0] });
      });
      knob(d, 77, 40, 5.6, P.gold);
      knob(d, 77, 54, 4.4, P.pink, 30);
      keys(d, 14, 65, 72, 16, 8);
      d.shine(16, 29.5, 8, 1.5, 0.5, 0);
    },
  ],
  // ── Strings that are bowed ──
  violin: [
    "violin",
    (d) => {
      d.g("translate(48 50) rotate(-34) translate(-50 -50)", (g) => fiddle(g, 50, 5, 16, 26, { ramp: P.wood, neck: 36, chinrest: true }));
      bow(d, 12, 88, 90, 36);
    },
  ],
  viola: [
    "viola",
    (d) => {
      d.g("translate(48 49) rotate(-34) translate(-50 -50)", (g) => fiddle(g, 50, 3, 18, 28, { ramp: ["#c58a58", "#7e4a26", "#4a2810"], neck: 34, chinrest: true }));
      bow(d, 10, 90, 92, 40);
    },
  ],
  cello: [
    "cello",
    (d) => {
      d.shadow(50, 94, 18);
      fiddle(d, 50, 3, 19, 26.5, { ramp: P.wood, neck: 29, endpin: 7 });
      bow(d, 8, 72, 92, 52);
    },
  ],
  doublebass: [
    "double bass",
    (d) => {
      d.shadow(50, 95, 20);
      fiddle(d, 50, 2, 22, 27, { ramp: P.brown, neck: 32, slope: true, endpin: 6 });
    },
  ],
  strings: [
    "string section",
    (d) => {
      d.shadow(58, 93, 26);
      d.g("translate(63 0) scale(0.8) translate(-50 22)", (g) => fiddle(g, 50, 3, 19, 26.5, { ramp: P.brown, neck: 29, endpin: 7 }));
      d.g("translate(33 54) rotate(-28) scale(0.64) translate(-50 -50)", (g) => fiddle(g, 50, 5, 16, 26, { ramp: P.wood, neck: 36, chinrest: true }));
      bow(d, 14, 22, 82, 66, 0.9);
    },
  ],
  pizz: [
    "plucked strings",
    (d) => {
      d.g("translate(38 50) rotate(-14) scale(0.94) translate(-50 -50)", (g) => fiddle(g, 50, 5, 16, 26, { ramp: P.wood, neck: 36, chinrest: true }));
      hand(d, 62, 66, 11, -60, { fingers: ["up", "curl", "curl", "curl"], thumb: "in", skin: 0 });
      burst(d, 41, 62, 7, 14, [165, 200, 235], P.gold[2], 3);
      d.sparkle(22, 32, 5);
    },
  ],
  // ── Woodwinds ──
  flute: [
    "flute",
    (d) => {
      d.g("rotate(-26 50 54)", (g) => {
        g.path(rr(9, 48, 84, 12.5, 6.25), metal(g, P.silver, 0, 1), { sw: 3 });
        g.path(rr(3.5, 48.5, 8.5, 11.5, 4), g.fill(P.steel, "v"), { sw: 2.6 });
        for (const x of [31, 79]) g.line(x, 48.6, x, 60.4, { sw: 2.2, color: P.steel[2] });
        g.ellipse(20, 49, 7.6, 4.2, metal(g, P.silver, 0, 1), { sw: 2.2 });
        g.ellipse(20, 48.8, 3.2, 1.8, OL, { stroke: null });
        g.line(37, 49.6, 75, 49.6, { sw: 2, color: P.steel[2] });
        for (const x of [40, 47.5, 55, 62.5, 70]) {
          g.circle(x, 54, 4, g.fill(P.white), { sw: 1.9 });
          g.circle(x, 54, 1.4, P.steel[2], { stroke: null });
        }
        for (const x of [84, 89]) g.circle(x, 54.4, 2.6, g.fill(P.white), { sw: 1.6 });
        g.shine(56, 50.4, 26, 1.1, 0.85, 0);
      });
      note(d, 18, 34, 7, P.violet);
      note(d, 34, 20, 6, P.sky);
    },
  ],
  piccolo: [
    "piccolo",
    (d) => {
      d.g("rotate(-24 50 52)", (g) => {
        g.path(rr(24, 46, 56, 11, 5.5), metal(g, P.silver, 0, 1), { sw: 2.8 });
        g.path(rr(19, 46.5, 8, 10, 3.5), g.fill(P.steel, "v"), { sw: 2.4 });
        g.line(41, 46.9, 41, 56.1, { sw: 2, color: P.steel[2] });
        g.ellipse(33, 47, 6, 3.4, metal(g, P.silver, 0, 1), { sw: 2 });
        g.ellipse(33, 46.8, 2.6, 1.4, OL, { stroke: null });
        for (const x of [48, 55, 62, 69]) {
          g.circle(x, 51.2, 3.2, g.fill(P.white), { sw: 1.6 });
          g.circle(x, 51.2, 1, P.steel[2], { stroke: null });
        }
        g.shine(58, 48, 16, 1, 0.85, 0);
      });
      d.sparkle(84, 22, 6);
      d.sparkle(72, 12, 3.6);
      d.sparkle(90, 38, 3.2);
    },
  ],
  recorder: [
    "recorder",
    (d) => {
      d.g("rotate(30 50 50)", (g) => {
        const tip = P.sky;
        g.path("M44.5 77 H55.5 L58.5 89 Q50 94 41.5 89 Z", g.fill(tip, "h"), { sw: 2.6 });
        g.path(rr(44.5, 30, 11, 49, 4), g.fill(P.cream, "h"), { sw: 2.6 });
        g.path("M43.5 6 Q50 1 56.5 6 L57.5 31 Q50 34 42.5 31 Z", g.fill(tip, "h"), { sw: 2.8 });
        g.path("M46.5 16 H53.5 V19.5 L46.5 22 Z", OL, { stroke: null });
        for (const y of [38, 44.5, 51, 57.5, 64, 70.5]) g.ellipse(50, y, 2.4, 2.1, OL, { stroke: null });
        g.shine(46.5, 14, 1.1, 6, 0.65, 0);
        g.shine(47, 50, 1, 10, 0.6, 0);
      });
    },
  ],
  clarinet: [
    "clarinet",
    (d) => {
      d.g("rotate(32 50 50)", (g) => {
        const b = P.black;
        g.path("M44 76 H56 Q57 85 64 91 Q50 96 36 91 Q43 85 44 76 Z", g.fill(b, "h"), { sw: 2.8 });
        g.path(rr(45.5, 19, 9, 59, 3), g.fill(b, "h"), { sw: 2.8 });
        g.path(rr(44.6, 11, 10.8, 9, 3.5), g.fill(b, "h"), { sw: 2.6 });
        g.path("M46.5 11 L47.4 3.5 Q50 1.4 52.6 3.5 L53.5 11 Z", g.fill(b, "h"), { sw: 2.4 });
        g.path(rr(45.8, 6.6, 8.4, 2.8, 1.2), metal(g, P.silver), { sw: 1.4 });
        for (const y of [19.5, 48, 77]) g.path(rr(44.2, y - 1.7, 11.6, 3.4, 1.5), metal(g, P.silver), { sw: 1.4 });
        g.line(54, 24, 54, 72, { sw: 1.6, color: P.silver[1] });
        for (const y of [26, 32, 38, 55, 61, 67]) {
          g.circle(50, y, 2.9, "none", { sw: 1.8, stroke: P.silver[1] });
          g.circle(50, y, 1.2, P.black[2], { stroke: null });
        }
        g.shine(47.2, 42, 0.9, 14, 0.45, 0);
      });
    },
  ],
  oboe: [
    "oboe",
    (d) => {
      d.g("rotate(-32 50 50)", (g) => {
        const b = P.black;
        g.path("M46 79 H54 Q55 86 58 91 Q50 94 42 91 Q45 86 46 79 Z", g.fill(b, "h"), { sw: 2.6 });
        g.path(rr(46.6, 15, 6.8, 66, 3), g.fill(b, "h"), { sw: 2.6 });
        g.path(rr(46, 44.5, 8, 3, 1.4), metal(g, P.silver), { sw: 1.3 });
        g.path(rr(46, 77.5, 8, 3, 1.4), metal(g, P.silver), { sw: 1.3 });
        // The double reed: a cork, a thread wrap and two thin blades.
        g.path(rr(47.6, 10, 4.8, 6, 1.4), g.fill(P.tan, "v"), { sw: 1.5 });
        g.path(rr(48, 6, 4, 5, 1.2), g.fill(P.red, "v"), { sw: 1.4 });
        g.path("M48.6 6.5 L48.4 1.5 Q50 0.5 51.6 1.5 L51.4 6.5 Z", g.fill(P.sand, "v"), { sw: 1.4 });
        for (const y of [22, 28, 34, 40, 52, 58, 64, 70]) g.circle(50, y, 1.9, g.fill(P.silver), { sw: 1.1 });
        g.line(53.2, 20, 53.2, 74, { sw: 1.4, color: P.silver[1] });
        g.line(46.8, 24, 46.8, 68, { sw: 1.4, color: P.silver[1] });
        g.shine(48, 34, 0.7, 10, 0.45, 0);
      });
    },
  ],
  bassoon: [
    "bassoon",
    (d) => {
      const maple: Ramp = ["#f2ad7e", "#c4652f", "#7e3816"];
      d.g("rotate(10 50 50)", (g) => {
        g.tube("M44.5 41 C44.5 32 38 28 31 29.5 C25 31 21 28 21.5 21", P.silver[1], 2.4, 1.8);
        g.path("M19.8 21.5 L23.2 21.5 L22.6 14.5 L20.4 14.5 Z", g.fill(P.sand, "v"), { sw: 1.4 });
        g.path(rr(40, 40, 9, 46, 3.5), g.fill(maple, "h"), { sw: 2.6 });
        g.path(rr(49, 9, 10.5, 77, 3.5), g.fill(maple, "h"), { sw: 2.6 });
        g.path(rr(47.5, 4, 13.5, 8, 3), g.fill(P.cream, "h"), { sw: 2.4 });
        g.path("M38.5 75 H61 V85 Q61 94 50 94 Q38.5 94 38.5 85 Z", g.fill(maple, "h"), { sw: 2.8 });
        g.path(rr(38, 73, 23.5, 4, 1.6), metal(g, P.silver), { sw: 1.5 });
        for (const y of [48, 55, 62]) g.circle(44.5, y, 1.9, g.fill(P.silver), { sw: 1.2 });
        for (const y of [24, 34, 46, 58]) g.circle(54.2, y, 1.9, g.fill(P.silver), { sw: 1.2 });
        g.line(57.6, 20, 57.6, 66, { sw: 1.4, color: P.silver[1] });
        g.shine(51.6, 30, 0.9, 14, 0.5, 0);
      });
    },
  ],
  sax: [
    "saxophone",
    (d) => {
      d.tube("M47 27 C46 17 39 11 30 12", P.gold[1], 5.4, 2.6);
      d.path("M30 9 L21 10.6 Q18.5 12 21 13.6 L30 15.2 Z", d.fill(P.black, "v"), { sw: 2.2 });
      d.path(rr(26, 8.8, 3.4, 6.8, 1.2), metal(d, P.silver), { sw: 1.4 });
      const body = limb([[47, 24], [47.5, 40], [49, 56], [52, 70], [58, 81], [66, 84], [72, 78], [74, 66], [75, 56]], [7, 9, 11, 13, 15, 16, 16, 18, 20]);
      d.path(body, d.fill(P.gold, "h"), { sw: 3 });
      d.path("M65 59 Q67 50 62 41 L92 41 Q86 50 85 59 Z", metal(d, P.gold, 1, 0.3), { sw: 3 });
      d.ellipse(77, 41, 15, 5, d.fill(P.gold, "v"), { sw: 2.8 });
      d.ellipse(77, 41.5, 11, 3, P.gold[2], { stroke: null });
      d.stroke("M52 34 Q53 52 57 68", { sw: 1.7, color: P.gold[2] });
      for (const [x, y] of [[47.4, 33], [47.8, 40], [48.4, 47], [49.4, 57], [50.6, 64], [52.4, 71]] as Pt[]) d.circle(x, y, 2.6, d.fill(P.cream), { sw: 1.5 });
      d.shine(44.2, 50, 1.3, 9, 0.6, -4);
      d.shine(70, 48, 1.3, 6, 0.6, 10);
    },
  ],
  // ── Brass ──
  trumpet: [
    "trumpet",
    (d) => {
      d.g("rotate(-14 50 52)", (g) => {
        const gold = P.gold[1];
        g.tube("M38 50 Q22 50 22 61 Q22 72 36 72 H58 Q70 72 70 62 Q70 56 62 56", gold, 5, 2.6);
        g.tube("M12 50 H62", gold, 5, 2.6);
        g.path("M5 44 Q11 47 12 49 V51 Q11 53 5 56 Z", metal(g, P.gold, 0, 1), { sw: 2.2 });
        for (const x of [36, 45, 54]) {
          g.path(rr(x - 3.6, 38, 7.2, 27, 2.5), metal(g, P.gold), { sw: 2.4 });
          g.tube(`M${x} 38 V31`, P.gold[2], 2, 1.8);
          g.path(rr(x - 4.6, 26, 9.2, 5.4, 2.6), g.fill(P.cream), { sw: 2.2 });
        }
        g.path("M58 45 L68 45 Q80 43 92 28 L92 72 Q80 57 68 55 L58 55 Z", metal(g, P.gold, 0.6, 1), { sw: 3 });
        g.ellipse(92, 50, 4.6, 22, g.fill(P.gold, "h"), { sw: 3 });
        g.ellipse(93, 50, 2, 17, P.gold[2], { stroke: null });
        g.shine(76, 46, 7, 1.6, 0.7, -30);
        g.shine(24, 48.5, 8, 1.1, 0.7, 0);
      });
    },
  ],
  trombone: [
    "trombone",
    (d) => {
      d.g("rotate(-8 50 50)", (g) => {
        const gold = P.gold[1];
        g.tube("M26 52 H86 Q92 52 92 56 Q92 60 86 60 H18", gold, 4.4, 2.4);
        g.tube("M50 36 H20 Q10 36 10 44 Q10 52 20 52 H28", gold, 4.4, 2.4);
        g.path("M8 55.5 Q14 58 16 59 V61 Q14 62 8 64.5 Z", metal(g, P.gold, 0, 1), { sw: 2 });
        g.tube("M33 38 V50", P.gold[2], 2, 1.6);
        g.tube("M42 54 V58", P.gold[2], 2.4, 1.6);
        g.tube("M70 54 V58", P.gold[2], 2.4, 1.6);
        g.circle(93.5, 56, 2.4, g.fill(P.black), { sw: 1.6 });
        g.path("M48 31.5 L54 31.5 Q64 30 75 17 L75 55 Q64 42 54 40.5 L48 40.5 Z", metal(g, P.gold, 0.6, 1), { sw: 3 });
        g.ellipse(75, 36, 4.4, 19, g.fill(P.gold, "h"), { sw: 3 });
        g.ellipse(76, 36, 1.8, 14, P.gold[2], { stroke: null });
        g.shine(65, 33, 6, 1.4, 0.7, -32);
        g.shine(50, 50.6, 16, 1, 0.75, 0);
      });
    },
  ],
  horn: [
    "french horn",
    (d) => {
      const gold = P.gold[1];
      d.tube("M30 29 Q21 22 15 15", gold, 3.6, 2.2);
      d.path("M10 9 Q14 11 16 13 L14.6 15.4 Q12 13.4 8 13 Z", metal(d, P.gold, 0, 1), { sw: 2 });
      d.tube(circlePath(42, 50, 27), gold, 6.2, 2.6);
      d.tube(circlePath(42, 50, 18.5), gold, 4.6, 2.2);
      d.path("M55 68 Q72 66 86 42 L86 88 Q72 78 57 75 Z", metal(d, P.gold, 0.6, 1), { sw: 3 });
      d.ellipse(86, 65, 6, 23, d.fill(P.gold, "h"), { sw: 3 });
      d.ellipse(87, 65, 2.6, 18, P.gold[2], { stroke: null });
      for (const x of [33, 42, 51]) {
        d.circle(x, 52, 4.6, metal(d, P.gold, 1, 1), { sw: 2.2 });
        d.circle(x, 52, 1.8, d.fill(P.silver), { sw: 1.2 });
      }
      for (const x of [33, 42, 51]) d.tube(`M${x} 46 L${x - 4} 38`, P.gold[2], 2.6, 1.6);
      d.shine(22, 38, 1.6, 7, 0.75, 25);
      d.shine(74, 56, 6, 1.4, 0.6, -50);
    },
  ],
  tuba: [
    "tuba",
    (d) => {
      d.shadow(52, 94, 30);
      d.path(limb([[60, 40], [67, 58], [65, 76], [53, 87], [38, 82], [32, 68]], [17, 17, 16, 15, 13, 12]), d.fill(P.gold, "h"), { sw: 3 });
      d.tube("M58 62 C58 74 54 78 49 78 C44 78 42 73 44 67", P.gold[1], 4.6, 2.2);
      d.path("M33 14 Q50 22 52 44 H68 Q70 22 87 14 Z", metal(d, P.gold, 1, 0.3), { sw: 3 });
      d.ellipse(60, 14, 27, 6.5, d.fill(P.gold, "v"), { sw: 3 });
      d.ellipse(60, 14.6, 22, 4, P.gold[2], { stroke: null });
      for (const x of [27, 35, 43]) {
        d.path(rr(x - 3.6, 48, 7.2, 22, 2.4), metal(d, P.gold), { sw: 2.2 });
        d.tube(`M${x} 48 V43`, P.gold[2], 1.8, 1.6);
        d.path(rr(x - 4.4, 38.5, 8.8, 5, 2.4), d.fill(P.cream), { sw: 2 });
      }
      d.tube("M22 63 Q12 62 12 50 V35", P.gold[1], 4, 2.2);
      d.path("M8.5 28 Q12 31 12 33 V36 H12 Q12 31 15.5 28 Z", metal(d, P.gold, 0, 1), { sw: 2 });
      d.shine(54, 26, 1.6, 8, 0.6, -10);
      d.shine(60, 62, 1.8, 9, 0.5, -10);
    },
  ],
  // ── More keyboards, reeds and voices ──
  organ: [
    "pipe organ",
    (d) => {
      d.shadow(50, 93, 42);
      const tin = metal(d, P.silver);
      for (let i = 0; i < 9; i++) {
        const k = Math.abs(i - 4);
        const x = 13.5 + i * 8.2;
        const top = 9 + k * 6.5;
        d.path(rr(x, top, 7.2, 52 - top, 2.6), tin, { sw: 2 });
        d.path(`M${f2(x + 1.5)} 45 Q${f2(x + 3.6)} 40.5 ${f2(x + 5.7)} 45 Z`, OL, { stroke: null });
      }
      d.path(rr(8, 45, 84, 7, 3), d.fill(P.brown, "v"), { sw: 2.6 });
      d.path(rr(11, 51, 78, 41, 4), d.fill(P.wood, "v"), { sw: 3.2 });
      keys(d, 21, 57, 58, 10, 11);
      keys(d, 21, 71, 58, 10, 11);
      const stops: [number, number, Ramp][] = [[15.5, 60, P.red], [15.5, 67, P.gold], [15.5, 74, P.green], [84.5, 60, P.sky], [84.5, 67, P.violet], [84.5, 74, P.pink]];
      for (const [x, y, c] of stops) d.circle(x, y, 2.3, d.fill(c), { sw: 1.4 });
      d.shine(14, 86, 8, 1.4, 0.4, 0);
    },
  ],
  accordion: [
    "accordion",
    (d) => {
      d.shadow(50, 93, 40);
      const bel = rr(29, 21, 39, 62, 2);
      d.path(bel, d.fill(P.white, "v"), { sw: 3 });
      d.clip(bel, (c) => {
        for (let i = 0; i < 8; i++) c.rect(29 + i * 4.9 + 2.45, 18, 2.45, 70, 0, P.grey[1], { stroke: null });
        for (let i = 0; i < 8; i++) {
          const x = 29 + i * 4.9;
          c.path(`M${f2(x)} 21 L${f2(x + 2.45)} 26 L${f2(x + 4.9)} 21 Z`, P.ink[1], { stroke: null });
          c.path(`M${f2(x)} 83 L${f2(x + 2.45)} 78 L${f2(x + 4.9)} 83 Z`, P.ink[1], { stroke: null });
        }
      });
      d.path(bel, "none", { sw: 3 });
      // Left side: the bass buttons.
      d.path(rr(9, 15, 23, 74, 6), d.fill(P.red, "v"), { sw: 3.2 });
      d.path(rr(13, 20, 15, 64, 4), "none", { sw: 1.8, stroke: P.gold[1] });
      const pearl = d.fill(P.white);
      for (let r = 0; r < 6; r++) for (let c = 0; c < 2; c++) d.circle(17.5 + c * 6, 27 + r * 10, 2.3, pearl, { sw: 1.3 });
      // Right side: the piano keys, standing on end.
      d.path(rr(65, 13, 26, 78, 6), d.fill(P.red, "v"), { sw: 3.2 });
      d.path(rr(69, 19, 17, 66, 2), OL, { stroke: null });
      const white = d.fill(P.white, "h");
      const black = d.fill(P.black, "h");
      for (let i = 0; i < 8; i++) d.path(rr(69.6, 19.5 + i * 8.2, 15.8, 7.2, 1.6), white, { stroke: null });
      for (const i of [1, 2, 4, 5, 6]) d.path(rr(69.6, 19 + i * 8.2 - 2.6, 9, 5.2, 1.2), black, { stroke: null });
      d.shine(12.5, 30, 1.4, 9, 0.5, 0);
    },
  ],
  harmonica: [
    "harmonica",
    (d) => {
      d.g("rotate(-10 50 54)", (g) => {
        g.path(rr(8, 54, 84, 14, 5), metal(g, P.silver, 0, 1), { sw: 3 });
        g.path(rr(10, 45, 80, 12, 2), g.fill(P.red, "v"), { sw: 2.6 });
        for (let i = 0; i < 10; i++) g.path(rr(13.2 + i * 7.6, 47.4, 5, 7.2, 1.2), OL, { stroke: null });
        g.path(rr(8, 33, 84, 14, 5), metal(g, P.silver, 0, 1), { sw: 3 });
        g.shine(34, 37, 20, 1.6, 0.85, 0);
      });
      note(d, 22, 26, 7, P.violet);
      note(d, 70, 17, 6, P.pink);
    },
  ],
  synth: [
    "synthesizer",
    (d) => {
      d.shadow(50, 91, 44);
      d.path(quad([13, 48], [87, 48], [83, 19], [17, 19]), d.fill(P.ink, "v"), { sw: 3 });
      const cols: Ramp[] = [P.red, P.gold, P.sky, P.lime];
      for (let i = 0; i < 4; i++) knob(d, 25 + i * 9.5, 27.5, 3.6, cols[i], -40 + i * 25);
      for (let i = 0; i < 4; i++) knob(d, 25 + i * 9.5, 38.5, 3.6, cols[3 - i], 30 - i * 20);
      for (let i = 0; i < 3; i++) {
        const x = 67 + i * 6.5;
        d.line(x, 24, x, 43, { sw: 2.4, color: P.black[2] });
        d.path(rr(x - 3, 28 + i * 4.5, 6, 4.4, 1.4), d.fill(P.white, "v"), { sw: 1.4 });
      }
      d.path(rr(8, 46, 84, 40, 6), d.fill(P.ink, "v"), { sw: 3.2 });
      for (const x of [5.5, 86.5]) d.path(rr(x, 32, 8, 56, 3.5), d.fill(P.wood, "h"), { sw: 2.6 });
      keys(d, 27, 52, 56, 29, 9);
      for (const x of [16, 21.5]) d.path(rr(x, 56, 3.8, 17, 1.9), d.fill(P.black, "h"), { sw: 1.4 });
      d.shine(20, 22, 8, 1.4, 0.45, 0);
    },
  ],
  pad: [
    "synth pad",
    (d) => {
      d.glow(50, 30, 38, P.violet[0], 0.8);
      const waves3: [string, Ramp][] = [
        ["M8 22 C16 11 26 11 34 22 S52 33 60 22 S80 11 92 18", P.pink],
        ["M8 31 C18 18 30 18 40 31 S62 44 72 31 S88 20 93 25", P.sky],
        ["M8 40 C20 28 31 28 42 40 S64 52 75 40 S89 31 93 35", P.violet],
      ];
      for (const [p, c] of waves3) {
        d.stroke(p, { sw: 10, color: c[0], op: 0.5 });
        d.stroke(p, { sw: 3.6, color: c[1] });
      }
      d.sparkle(86, 52, 4);
      d.sparkle(14, 50, 3);
      d.path(rr(10, 55, 80, 33, 7), d.fill(["#ffffff", "#ece4ff", "#b6a2e8"], "v"), { sw: 3.2 });
      keys(d, 16, 63, 68, 20, 10);
      d.shine(18, 58.5, 8, 1.3, 0.7, 0);
    },
  ],
  choir: [
    "choir",
    (d) => {
      const sing: Expr = { eyes: "closed", brows: "up", mouth: "O", extras: ["blush"] };
      const stole = (cx: number, cy: number, r: number) => {
        for (const s of [-1, 1]) d.tube(`M${f2(cx + s * r * 0.5)} ${f2(cy + r * 1.1)} L${f2(cx + s * r * 0.66)} 98`, P.gold[1], r * 0.3, 2);
      };
      bust(d, 22, 55, 13, { skin: 1, hair: "long", hairColor: HAIR.blond, shirt: P.violet }, sing, 98, "none");
      stole(22, 55, 13);
      bust(d, 78, 55, 13, { skin: 4, hair: "short", hairColor: HAIR.black, shirt: P.violet }, sing, 98, "none");
      stole(78, 55, 13);
      bust(d, 50, 48, 14.5, { skin: 2, hair: "puffs", hairColor: HAIR.brown, shirt: P.violet }, { ...sing, eyes: "happy" }, 98, "none");
      stole(50, 48, 14.5);
      note(d, 16, 26, 6.5, P.pink);
      note(d, 76, 24, 6.5, P.sky);
      note(d, 46, 15, 5.5, P.gold);
    },
  ],
  whistle: [
    "tin whistle",
    (d) => {
      d.g("rotate(30 50 50)", (g) => {
        g.path(rr(45.5, 27, 9, 66, 4.5), metal(g, P.gold), { sw: 2.6 });
        g.path("M44.5 5 Q50 1 55.5 5 L56 30 Q50 32 44 30 Z", g.fill(P.green, "h"), { sw: 2.8 });
        g.path("M46.5 19 H53.5 V22.5 L46.5 25 Z", OL, { stroke: null });
        for (const y of [41, 48, 55, 65, 72, 79]) g.ellipse(50, y, 2.4, 2, OL, { stroke: null });
        g.shine(47.6, 58, 1, 14, 0.65, 0);
        g.shine(46.6, 13, 1, 5, 0.6, 0);
      });
    },
  ],
  timpani: [
    "timpani",
    (d) => {
      d.shadow(50, 93, 40);
      for (const [x1, x2] of [[30, 21], [70, 79]]) {
        d.tube(`M${x1} 72 L${x2} 89`, P.steel[1], 3, 2);
        d.circle(x2, 90, 2.8, d.fill(P.ink), { sw: 1.6 });
      }
      d.tube("M50 78 V86", P.steel[1], 2.6, 1.6);
      d.path(quad([41, 93], [59, 93], [56, 85], [44, 85]), d.fill(P.ink, "v"), { sw: 2 });
      // The copper kettle, with tuning rods round it.
      d.path("M13 40 C13 64 29 80 50 80 C71 80 87 64 87 40 Z", metal(d, P.orange, 1, 0.5), { sw: 3.4 });
      for (const a of [0.14, 0.32, 0.5, 0.68, 0.86]) {
        const ang = Math.PI * a;
        const x = 50 - Math.cos(ang) * 35;
        const y = 44 + Math.sin(ang) * 9.5;
        d.tube(`M${f2(x)} ${f2(y)} L${f2(x + (50 - x) * 0.07)} ${f2(y + 12)}`, P.silver[1], 2.2, 1.5);
      }
      d.path("M13 40 A37 10.5 0 0 0 87 40 V45 A37 10.5 0 0 1 13 45 Z", d.fill(P.silver, "v"), { sw: 2.6 });
      d.ellipse(50, 40, 37, 10.5, d.fill(P.cream), { sw: 3 });
      d.shine(24, 56, 3, 8, 0.6, 30);
      mallet(d, 90, 10, 62, 37, P.cream, 6.4);
    },
  ],
  // ── Drums and percussion ──
  kick: [
    "kick drum",
    (d) => {
      d.shadow(52, 93, 40);
      for (const [x1, y1, x2] of [[22, 64, 12], [74, 66, 88]]) d.tube(`M${x1} ${y1} L${x2} 90`, P.silver[1], 2.6, 1.8);
      // The shell going back to the right, then the front head in its hoop.
      d.ellipse(60, 41, 29, 32, cyl(d, P.red), { sw: 3.2 });
      d.path(quad([44, 12], [60, 9], [60, 73], [44, 76]), cyl(d, P.red), { stroke: null });
      d.stroke("M44 12 L60 9 M44 76 L60 73", { sw: 3.2 });
      for (const a of [-50, -15, 20, 55]) {
        const x = 44 + Math.cos(rad(a)) * 29;
        const y = 44 + Math.sin(rad(a)) * 32;
        d.tube(`M${f2(x)} ${f2(y)} L${f2(x + 13)} ${f2(y - 2.6)}`, P.silver[1], 2.2, 1.5);
      }
      d.ellipse(44, 44, 29, 32, d.fill(P.red), { sw: 3.2 });
      d.ellipse(44, 44, 23.5, 26.5, d.fill(P.cream), { sw: 2.4 });
      d.shine(31, 30, 5, 3, 0.7, -40);
      // The pedal: footboard, frame and the beater hitting the head.
      d.path(quad([34, 93], [52, 93], [50, 80], [38, 80]), d.fill(P.ink, "v"), { sw: 2.2 });
      for (const x of [37, 51]) d.tube(`M${x} 82 V64`, P.silver[1], 2.2, 1.6);
      d.tube("M37 64 H51", P.steel[1], 2.4, 1.6);
      d.tube("M44 64 V50", P.steel[1], 2, 1.5);
      d.ball(44, 47, 5, P.ink, { sw: 2 });
    },
  ],
  snare: [
    "snare drum",
    (d) => {
      d.shadow(50, 91, 40);
      drum(d, 50, 50, 74, 38, 13, { shell: P.blue, lugs: 8 });
      d.shine(18, 62, 1.6, 5, 0.6, 0);
      stick(d, 12, 12, 56, 46);
      stick(d, 88, 10, 44, 46);
    },
  ],
  hat: [
    "hi-hat",
    (d) => {
      d.shadow(50, 93, 26);
      stand(d, 50, 34, 92, 18);
      d.path(quad([41, 94], [59, 94], [56, 84], [44, 84]), d.fill(P.ink, "v"), { sw: 2 });
      cymbal(d, 50, 36.5, 36, 6, 0, true);
      cymbal(d, 50, 31, 36, 6);
      d.tube("M50 25 V13", P.silver[1], 2.4, 1.6);
      d.path(rr(46.5, 17, 7, 4, 1.5), d.fill(P.ink, "v"), { sw: 1.4 });
    },
  ],
  openhat: [
    "open hi-hat",
    (d) => {
      d.shadow(50, 93, 26);
      stand(d, 50, 44, 92, 18);
      d.path(quad([41, 94], [59, 94], [56, 84], [44, 84]), d.fill(P.ink, "v"), { sw: 2 });
      cymbal(d, 50, 44, 36, 6, 0, true);
      d.tube("M50 40 V12", P.silver[1], 2.2, 1.6);
      cymbal(d, 50, 25, 36, 6);
      for (const s of [-1, 1]) d.stroke(`M${50 + s * 39} 28 q${s * 4} 6 0 12`, { sw: 2.8, color: P.gold[2] });
      d.sparkle(16, 13, 4.5);
      d.sparkle(84, 11, 4.5);
      d.sparkle(86, 58, 3);
    },
  ],
  clap: [
    "clap",
    (d) => {
      hand(d, 37, 63, 12.5, 24, { skin: 1 });
      hand(d, 63, 63, 12.5, -24, { skin: 1, left: true });
      burst(d, 50, 24, 4, 14, [-90, -132, -48], P.gold[2], 3.2);
      for (const s of [-1, 1]) d.stroke(`M${50 + s * 33} 26 Q${50 + s * 41} 36 ${50 + s * 38} 48`, { sw: 3, color: P.gold[2] });
    },
  ],
  snap: [
    "finger snap",
    (d) => {
      // A hand seen from the thumb side (the people kit's skin and tube fingers): the middle
      // finger pressed to the thumb, just about to snap, the others relaxed — and the spark.
      const skin = SKIN[3];
      const sw = 2.6;
      d.path(rr(24, 82, 34, 13, 5), d.fill(P.sky, "v"), { sw: 3, tf: "rotate(-8 41 88)" });
      d.tube("M58 52 C64 36 58 24 47 24", skin[1], 9, sw);
      d.path("M33 86 C30 72 31 60 38 52 C45 45 59 44 65 51 C71 58 70 73 62 86 Z", d.fill(skin), { sw: 3 });
      for (const [cx, cy] of [[65, 61], [63, 72]] as Pt[]) {
        d.ellipse(cx, cy, 6.5, 5.6, d.fill(skin), { sw });
        d.stroke(`M${cx - 3} ${cy - 1} q3 3 6 0`, { sw: 1.8, color: skin[2] });
      }
      d.tube("M57 50 C66 47 73 43 79 36", skin[1], 8.5, sw);
      d.tube("M39 60 C38 46 40 34 45 27", skin[1], 9.5, sw);
      d.glow(46, 24, 13, "#fff1a0", 0.85);
      burst(d, 45, 23, 8, 17, [175, 215, 255], P.gold[2], 3.2);
      d.sparkle(46, 24, 5);
      d.sparkle(18, 40, 3.6);
      d.shine(42, 60, 2.4, 6, 0.4, 10);
    },
  ],
  stomp: [
    "stomp",
    (d) => {
      d.shadow(54, 92, 42, 5);
      d.tube("M39 3 L39 52", P.blue[1], 18, 3);
      d.stroke("M32.5 9 V47", { sw: 2, color: P.blue[2], op: 0.6 });
      const upper = "M24 82 L24 62 Q24 52 34 52 L48 52 Q53 52 55 58 Q61 65 73 67 Q87 69 89 77 Q90 82 86 83 Z";
      d.path(upper, d.fill(P.red, "v"), { sw: 3.2 });
      d.clip(upper, (c) => c.path("M70 64 Q86 66 94 74 V90 H66 Q64 72 70 64 Z", c.fill(P.white, "v"), { sw: 2.4 }));
      d.path(upper, "none", { sw: 3.2 });
      for (const [x, y] of [[46, 57], [52, 61], [58, 65]] as Pt[]) d.tube(`M${x} ${y} L${x + 4} ${y - 7}`, "#fff", 2.6, 1.6);
      d.path("M19 81 H88 Q93 81 92 86 Q91 91 85 91 H23 Q17 91 17 86 Q17 81 19 81 Z", d.fill(P.white, "v"), { sw: 3 });
      d.stroke("M21 86 H89", { sw: 2, color: P.grey[2] });
      d.shine(28, 62, 2.2, 6, 0.55, 10);
      burst(d, 14, 89, 4, 12, [190, 215, 240], P.gold[2], 3.2);
      burst(d, 94, 89, 3, 9, [-60, -25], P.gold[2], 3.2);
      for (const x of [14, 64, 74]) d.stroke(`M${x} 20 V38`, { sw: 3, color: P.steel[1] });
    },
  ],
  tom: [
    "tom drum",
    (d) => {
      d.shadow(50, 93, 24);
      stand(d, 50, 62, 92, 16);
      d.g("rotate(-12 50 46)", (g) => drum(g, 50, 32, 62, 28, 10.5, { shell: P.red, lugs: 6 }));
      stick(d, 92, 8, 60, 32);
    },
  ],
  lowtom: [
    "floor tom",
    (d) => {
      d.shadow(50, 93, 40);
      for (const [x1, x2] of [[24, 13], [76, 87]]) {
        d.tube(`M${x1} 56 L${x2} 91`, P.silver[1], 2.6, 1.8);
        d.path(rr(x1 - 3, 52, 6, 7, 2), d.fill(P.silver, "h"), { sw: 1.6 });
      }
      drum(d, 50, 26, 76, 31, 11, { shell: P.red, lugs: 7 });
    },
  ],
  crash: [
    "crash cymbal",
    (d) => {
      d.shadow(50, 93, 22);
      stand(d, 50, 44, 92, 18);
      cymbal(d, 50, 40, 38, 11, -14);
      for (const s of [-1, 1]) d.stroke(`M${50 + s * 30} ${s < 0 ? 22 : 8} q${s * 7} 6 ${s * 6} 16`, { sw: 3, color: P.gold[2] });
      d.sparkle(14, 22, 5);
      d.sparkle(88, 48, 4);
      d.sparkle(30, 12, 3);
    },
  ],
  ride: [
    "ride cymbal",
    (d) => {
      d.shadow(50, 93, 22);
      stand(d, 50, 44, 92, 18);
      cymbal(d, 50, 40, 44, 9.5, -6, false, ["#ffe4ad", "#e6ad4e", "#a9671c"]);
      stick(d, 92, 8, 56, 32);
    },
  ],
  cymbals: [
    "cymbals",
    (d) => {
      const pan = (g: Pen) => {
        g.tube("M24 44 Q9 43 9 50 Q9 57 24 56", P.brown[1], 3.6, 2.2);
        g.ellipse(30, 50, 13, 34, metal(g, P.gold, 1, 0.3), { sw: 3 });
        g.ellipse(30, 50, 8.6, 23, "none", { sw: 1.4, stroke: P.gold[2], op: 0.75 });
        g.ellipse(30, 50, 4.6, 10, g.fill(P.gold), { sw: 2 });
        g.shine(26, 32, 2, 8, 0.7, 8);
      };
      pan(d);
      d.mirror(50, pan);
      burst(d, 50, 20, 3, 12, [-90, -128, -52], P.gold[2], 3);
      burst(d, 50, 80, 3, 12, [90, 128, 52], P.gold[2], 3);
    },
  ],
  cowbell: [
    "cowbell",
    (d) => {
      d.shadow(47, 92, 26);
      d.tube("M38 22 Q38 8 48 8 Q58 8 58 22", P.brown[1], 5, 2.4);
      d.ball(48, 83, 4.6, P.steel, { sw: 2 });
      d.path("M37 21 H59 Q62 21 63 25 L72 77 Q72 81 67 81 H29 Q24 81 24 77 L33 25 Q34 21 37 21 Z", metal(d, P.silver), { sw: 3.4 });
      d.path("M27 79 Q48 84 69 79", "none", { sw: 2.2, stroke: P.steel[2] });
      d.shine(36, 42, 2, 12, 0.7, 9);
      stick(d, 93, 32, 69, 52);
      burst(d, 70, 52, 6, 13, [150, 190, 230], P.gold[2], 2.8);
    },
  ],
  shaker: [
    "shaker",
    (d) => {
      d.g("rotate(-30 50 50)", (g) => {
        const tube = rr(18, 38, 64, 24, 10);
        g.path(tube, g.lin([[0, "#effaff"], [0.5, "#c9ecff"], [1, "#94cdee"]]), { sw: 3 });
        g.clip(tube, (c) => {
          const cols = [P.red, P.gold, P.green, P.blue, P.pink, P.orange, P.violet].map((r) => c.fill(r));
          for (let i = 0; i < 9; i++) c.circle(22 + i * 6.8, 57.5, 3.3, cols[i % 7], { sw: 1.4 });
          for (let i = 0; i < 6; i++) c.circle(27 + i * 9, 51.5, 3.1, cols[(i + 3) % 7], { sw: 1.4 });
        });
        g.path(tube, "none", { sw: 3 });
        g.shine(48, 42.5, 22, 1.6, 0.9, 0);
        for (const x of [11, 79]) g.path(rr(x, 35, 10, 30, 4), g.fill(P.red, "v"), { sw: 2.8 });
      });
      for (const s of [-1, 1]) {
        const [x, y] = s < 0 ? [14, 52] : [86, 48];
        d.stroke(`M${x - 6} ${y + s * 14} q${s * -4} ${s * -8} 4 ${s * -16} M${x + 6} ${y + s * 18} q${s * -3} ${s * -6} 3 ${s * -12}`, { sw: 2.8, color: P.steel[1] });
      }
    },
  ],
  maracas: [
    "maracas",
    (d) => {
      const one = (g: Pen, ramp: Ramp, band: Ramp) => {
        g.tube("M50 54 L50 88", P.wood[1], 6, 2.6);
        g.circle(50, 90, 3.6, g.fill(P.wood), { sw: 2 });
        const head = "M50 14 C60 14 66 24 66 34 C66 46 58 55 50 55 C42 55 34 46 34 34 C34 24 40 14 50 14 Z";
        g.path(head, g.fill(ramp), { sw: 3.2 });
        g.clip(head, (c) => c.path("M30 34 L36 28 L42 34 L48 28 L54 34 L60 28 L66 34 L72 28 V40 L66 46 L60 40 L54 46 L48 40 L42 46 L36 40 L30 46 Z", c.fill(band), { sw: 1.8 }));
        g.path(head, "none", { sw: 3.2 });
        g.shine(43, 23, 3.4, 6, 0.7, -25);
      };
      d.g("rotate(-24 50 92)", (g) => one(g, P.red, P.gold));
      d.g("rotate(24 50 92)", (g) => one(g, P.teal, P.pink));
      for (const s of [-1, 1]) d.stroke(`M${50 + s * 12} 12 Q${50 + s * 16} 6 ${50 + s * 22} 6 M${50 + s * 8} 20 Q${50 + s * 13} 14 ${50 + s * 19} 14`, { sw: 2.8, color: P.steel[1] });
    },
  ],
  tamb: [
    "tambourine",
    (d) => {
      d.circle(50, 50, 39, d.fill(P.red), { sw: 3.4 });
      d.circle(50, 50, 29.5, d.fill(P.cream), { sw: 2.6 });
      d.shine(37, 35, 7, 3.6, 0.65, -35);
      const zil = metal(d, P.silver, 1, 1);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        const x = 50 + Math.cos(a) * 34.2;
        const y = 50 + Math.sin(a) * 34.2;
        d.g(`rotate(${f2((a * 180) / Math.PI + 90)} ${f2(x)} ${f2(y)})`, (g) => {
          g.path(rr(x - 7, y - 3.2, 14, 6.4, 2), P.red[2], { sw: 1.6 });
          for (const s of [-1, 1]) g.circle(x + s * 2.8, y, 3.5, zil, { sw: 1.4 });
        });
      }
      for (const s of [-1, 1]) d.stroke(`M${50 + s * 44} 34 q${s * 5} 16 0 32`, { sw: 3, color: P.steel[1] });
    },
  ],
  triangle: [
    "triangle",
    (d) => {
      d.tube("M50 7 V19", P.red[1], 2.4, 1.6);
      d.circle(50, 7, 3.2, d.fill(P.red), { sw: 1.8 });
      d.tube("M19 74 L46 25 Q50 18 54 25 L84 75 Q87 81 80 81 H24", P.silver[1], 4.8, 2.4);
      d.stroke("M44 31 L23 69", { sw: 1.6, color: "#fff", op: 0.95 });
      d.tube("M93 44 L76 54", P.silver[1], 2.4, 1.6);
      d.tube("M93 44 L87 47.5", P.ink[1], 4, 1.6);
      burst(d, 76, 55, 6, 13, [-110, -150, 170], P.gold[2], 2.8);
      d.sparkle(84, 28, 5);
      d.sparkle(20, 34, 3.6);
    },
  ],
  block: [
    "wood block",
    (d) => {
      d.shadow(48, 91, 38);
      d.path(quad([12, 52], [68, 52], [84, 40], [28, 40]), d.fill(P.wood, "v"), { sw: 3 });
      d.path(quad([68, 52], [84, 40], [84, 72], [68, 84]), d.fill(P.brown, "v"), { sw: 3 });
      d.path(rr(12, 52, 56, 32, 3), d.fill(P.wood, "v"), { sw: 3.2 });
      d.path(rr(18, 60, 44, 6, 3), P.brown[2], { sw: 2 });
      d.stroke("M18 75 H62", { sw: 1.6, color: P.wood[2], op: 0.6 });
      d.shine(19, 56, 8, 1.4, 0.55, 0);
      mallet(d, 93, 8, 58, 38, P.red, 7);
      burst(d, 56, 40, 10, 17, [175, 205, 235], P.gold[2], 2.8);
    },
  ],
  rim: [
    "rim click",
    (d) => {
      d.shadow(50, 92, 40);
      drum(d, 50, 52, 76, 38, 13, { shell: P.blue, lugs: 8 });
      stick(d, 93, 33, 30, 58, 6);
      burst(d, 80, 37, 5, 13, [-120, -80, -40], P.gold[2], 3);
    },
  ],
  sticks: [
    "drumsticks",
    (d) => {
      stick(d, 18, 90, 76, 12, 6.6);
      stick(d, 82, 90, 24, 12, 6.6);
      burst(d, 50, 34, 3, 11, [-90, -125, -55], P.gold[2], 3);
    },
  ],
  bongo: [
    "bongos",
    (d) => {
      d.shadow(50, 90, 42);
      d.path(rr(40, 52, 20, 13, 3), d.fill(P.brown, "v"), { sw: 2.6 });
      taperDrum(d, 27, 42, 80, 18, 13, 6.5, P.wood, { lugs: 3, band: P.brown });
      taperDrum(d, 71, 38, 82, 21, 15, 7.5, P.wood, { lugs: 4, band: P.brown });
    },
  ],
  conga: [
    "conga",
    (d) => {
      d.shadow(50, 95, 24);
      taperDrum(d, 50, 17, 92, 18, 15, 6.5, P.wood, { bulge: 7, lugs: 4, band: P.red });
    },
  ],
  gong: [
    "gong",
    (d) => {
      d.shadow(50, 94, 42);
      for (const x of [14, 86]) d.path(rr(x - 4, 14, 8, 76, 3), d.fill(P.red, "h"), { sw: 2.8 });
      for (const x of [14, 86]) d.path(rr(x - 9, 86, 18, 6, 3), d.fill(P.red, "v"), { sw: 2.6 });
      d.path("M5 10 Q12 16 18 15 H82 Q88 16 95 10 L94 18 Q88 23 82 22 H18 Q12 23 6 18 Z", d.fill(P.red, "v"), { sw: 2.8 });
      d.stroke("M38 21 L41 30 M62 21 L59 30", { sw: 2.4 });
      d.circle(50, 56, 27, metal(d, P.gold, 1, 1), { sw: 3.2 });
      d.circle(50, 56, 21, "none", { sw: 1.6, stroke: P.gold[2], op: 0.8 });
      d.circle(50, 56, 9, d.fill(P.gold), { sw: 2.4 });
      d.shine(39, 44, 5, 2.6, 0.75, -35);
      mallet(d, 92, 84, 75, 67, P.red, 6.5);
    },
  ],
  bassdrum: [
    "bass drum",
    (d) => {
      d.shadow(50, 93, 36);
      d.ellipse(58, 49, 28, 35, cyl(d, P.blue), { sw: 3.2 });
      d.path(quad([42, 14], [58, 14], [58, 84], [42, 84]), cyl(d, P.blue), { stroke: null });
      d.stroke("M42 14 H58 M42 84 H58", { sw: 3.2 });
      for (const a of [-60, -25, 10, 45]) {
        const x = 42 + Math.cos(rad(a)) * 28;
        const y = 49 + Math.sin(rad(a)) * 35;
        d.tube(`M${f2(x)} ${f2(y)} L${f2(x + 14)} ${f2(y)}`, P.silver[1], 2.2, 1.5);
      }
      d.ellipse(42, 49, 28, 35, d.fill(P.white), { sw: 3.2 });
      d.ellipse(42, 49, 23, 29.5, "none", { sw: 2, stroke: P.white[2] });
      d.shine(30, 32, 5, 3, 0.8, -40);
      d.tube("M84 92 L60 62", P.wood[0], 3.4, 2);
      d.path(lumpy(57, 58, 9, 9, 10, 0.1, 3), d.fill(P.sky), { sw: 2.6 });
      d.shine(54, 54, 2.6, 1.6, 0.7, -30);
    },
  ],
  // ── Pictures for the music screens ──
  drumkit: [
    "drum kit",
    (d) => {
      d.shadow(50, 93, 44);
      // Hi-hat (left) and crash (right) on their stands.
      stand(d, 15, 32, 92, 8);
      cymbal(d, 15, 33, 13, 3.4, 0, true);
      cymbal(d, 15, 29, 13, 3.4);
      stand(d, 85, 24, 92, 8);
      cymbal(d, 85, 22, 15, 4.6, 14);
      // Two toms on top of the bass drum.
      d.g("rotate(-12 37 34)", (g) => drum(g, 37, 28, 42, 11, 4.4, { shell: P.red, hoopH: 2.4, sw: 2.4 }));
      d.g("rotate(12 63 34)", (g) => drum(g, 63, 28, 42, 11, 4.4, { shell: P.red, hoopH: 2.4, sw: 2.4 }));
      // Snare on the left, floor tom on the right.
      stand(d, 24, 60, 92, 8);
      drum(d, 24, 55, 64, 12, 4.4, { shell: P.silver, hoopH: 2.2, sw: 2.4 });
      for (const x of [72, 88]) d.tube(`M${x} 74 L${x + (x < 80 ? -2 : 2)} 92`, P.silver[1], 1.8, 1.5);
      drum(d, 80, 56, 80, 11, 4.4, { shell: P.red, hoopH: 2.4, sw: 2.4 });
      // The bass drum, front and center.
      d.circle(50, 66, 23, d.fill(P.red), { sw: 3 });
      d.circle(50, 66, 18, d.fill(P.cream), { sw: 2.2 });
      d.path(roundPoly([[50, 56], [53, 63], [60.5, 63.5], [54.5, 68], [56.5, 75.5], [50, 71], [43.5, 75.5], [45.5, 68], [39.5, 63.5], [47, 63]], 1), d.fill(P.gold), { sw: 1.8 });
      d.shine(40, 54, 4, 2, 0.7, -40);
    },
  ],
  baton: [
    "conductor's baton",
    (d) => {
      d.stroke("M26 34 Q42 6 80 8", { sw: 3.2, color: P.violet[1], dash: "1 7" });
      note(d, 54, 30, 6.5, P.pink);
      note(d, 76, 31, 5.5, P.sky);
      d.sparkle(89, 12, 5.5);
      d.path(limb([[36, 62], [60, 38], [84, 15]], [5, 3.8, 2.4]), d.fill(P.white, "v"), { sw: 2.2 });
      hand(d, 33, 71, 12.5, -6, { fingers: ["curl", "curl", "curl", "curl"], thumb: "in", skin: 2 });
    },
  ],
  metronome: [
    "metronome",
    (d) => {
      d.shadow(50, 93, 32);
      d.path(roundPoly([[38, 10], [62, 10], [80, 86], [20, 86]], 4), d.fill(P.wood, "v"), { sw: 3.4 });
      d.path(roundPoly([[43, 16], [57, 16], [66, 70], [34, 70]], 3), d.fill(P.cream, "v"), { sw: 2.2 });
      for (let i = 0; i < 7; i++) d.line(44 - i * 0.6, 23 + i * 6.5, 49, 23 + i * 6.5, { sw: 1.6, color: P.tan[2] });
      d.g("rotate(24 50 66)", (g) => {
        g.tube("M50 66 V14", P.silver[1], 2.4, 1.8);
        g.path(roundPoly([[44.5, 28], [55.5, 28], [54, 37], [46, 37]], 1.5), metal(g, P.gold), { sw: 2 });
      });
      d.circle(50, 66, 3, d.fill(P.gold), { sw: 1.8 });
      d.path(rr(15, 82, 70, 10, 3.5), d.fill(P.brown, "v"), { sw: 3 });
      d.stroke("M70 12 Q78 17 81 26", { sw: 3, color: P.gold[2] });
      d.stroke("M30 12 Q22 17 19 26", { sw: 3, color: P.gold[2], op: 0.45 });
      d.shine(42, 24, 1.4, 8, 0.6, 12);
    },
  ],
  musicstand: [
    "music stand",
    (d) => {
      d.shadow(50, 94, 26);
      stand(d, 50, 58, 93, 18);
      d.path(quad([14, 60], [86, 60], [80, 12], [20, 12]), d.fill(P.ink, "v"), { sw: 3 });
      d.path(quad([22, 56], [78, 56], [73, 17], [27, 17]), d.fill(P.white, "v"), { sw: 2.2 });
      for (const top of [22, 38]) {
        for (let k = 0; k < 5; k++) {
          const y = top + k * 2.6;
          const inset = (56 - y) * 0.13;
          d.line(23 + inset, y, 77 - inset, y, { sw: 1.1, color: P.ink[0] });
        }
      }
      const heads: Pt[] = [[33, 29], [43, 26.5], [53, 31.5], [63, 28], [36, 45], [48, 42], [60, 47]];
      for (const [x, y] of heads) {
        d.line(x + 2.4, y, x + 2.4, y - 8, { sw: 1.4, color: OL });
        d.ellipse(x, y, 2.9, 2.2, OL, { stroke: null, tf: `rotate(-20 ${x} ${y})` });
      }
      d.path(rr(12, 55, 76, 7, 3), d.fill(P.ink, "v"), { sw: 2.6 });
      d.shine(22, 15, 8, 1.2, 0.5, 0);
    },
  ],
  speaker: [
    "speaker",
    (d) => {
      d.shadow(40, 93, 26);
      d.path(rr(14, 10, 50, 80, 8), d.fill(P.ink, "v"), { sw: 3.4 });
      d.circle(39, 28, 9.5, d.fill(P.steel), { sw: 2.4 });
      d.circle(39, 28, 5, d.fill(P.black), { sw: 1.8 });
      d.circle(39, 63, 20, d.fill(P.steel), { sw: 2.8 });
      d.circle(39, 63, 15, d.rad([[0, P.black[0]], [1, P.black[2]]], 0.4, 0.35, 0.8), { sw: 2 });
      d.circle(39, 63, 5.5, d.fill(P.steel), { sw: 1.8 });
      d.shine(22, 16, 6, 1.6, 0.5, 0);
      waves(d, 66, 50, 3, 7, 1, P.sky[1]);
    },
  ],
  vinyl: [
    "record",
    (d) => {
      d.circle(50, 50, 41, d.fill(P.black), { sw: 3.2 });
      for (const r of [35, 30, 25, 20]) d.circle(50, 50, r, "none", { sw: 1.4, stroke: P.black[0], op: 0.75 });
      d.circle(50, 50, 14, d.fill(P.red), { sw: 2.4 });
      d.circle(50, 50, 9.5, "none", { sw: 1.4, stroke: P.red[0], op: 0.9 });
      d.circle(50, 50, 2.6, "#fff", { sw: 1.8 });
      d.stroke("M22.3 34 A32 32 0 0 1 34 22.3", { sw: 3.4, color: "#fff", op: 0.5 });
      d.stroke("M77.7 66 A32 32 0 0 1 66 77.7", { sw: 3.4, color: "#fff", op: 0.25 });
    },
  ],
  cassette: [
    "cassette tape",
    (d) => {
      d.shadow(50, 88, 40, 4);
      d.path(rr(8, 20, 84, 62, 7), d.fill(P.orange, "v"), { sw: 3.4 });
      d.path(rr(15, 26, 70, 34, 4), d.fill(P.cream, "v"), { sw: 2.2 });
      d.rect(15.5, 29, 69, 3.4, 0, P.red[1], { stroke: null });
      d.rect(15.5, 33.4, 69, 2, 0, P.sky[1], { stroke: null });
      d.path(rr(29, 39, 42, 16, 8), d.fill(P.ink, "v"), { sw: 2.2 });
      d.path("M40 53 Q50 50 60 53 V54.5 H40 Z", P.brown[1], { stroke: null });
      for (const x of [38, 62]) {
        d.circle(x, 47, 6.4, d.fill(P.white), { sw: 1.8 });
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          d.line(x + Math.cos(a) * 1.8, 47 + Math.sin(a) * 1.8, x + Math.cos(a) * 4.2, 47 + Math.sin(a) * 4.2, { sw: 1.4, color: P.steel[2] });
        }
      }
      d.path(roundPoly([[24, 82], [76, 82], [70, 66], [30, 66]], 3), d.fill([P.orange[1], P.orange[2], P.orange[2]], "v"), { sw: 2.6 });
      for (const x of [36, 64]) d.circle(x, 75, 2.6, OL, { stroke: null });
      for (const x of [45, 55]) d.circle(x, 76, 1.6, OL, { stroke: null });
      for (const [x, y] of [[13, 25], [87, 25], [13, 77], [87, 77]] as Pt[]) d.circle(x, y, 1.8, d.fill(P.silver), { sw: 1.2 });
      d.shine(20, 23, 8, 1.4, 0.55, 0);
    },
  ],
  mixer: [
    "mixing board",
    (d) => {
      d.shadow(50, 93, 44);
      d.path(quad([6, 84], [94, 84], [86, 18], [14, 18]), d.fill(P.ink, "v"), { sw: 3.2 });
      d.path(quad([6, 84], [94, 84], [94, 90], [6, 90]), P.ink[2], { sw: 2.6 });
      const cols: Ramp[] = [P.red, P.gold, P.lime, P.sky, P.pink];
      const levels = [70, 56, 62, 50, 66];
      for (let i = 0; i < 5; i++) {
        const xb = 20 + i * 15;
        const X = (y: number) => 50 + (xb - 50) * (0.84 + (0.16 * (y - 18)) / 66);
        knob(d, X(27), 27, 3.6, P.grey, -40 + i * 20);
        knob(d, X(38), 38, 3.6, cols[i], 40 - i * 20);
        d.line(X(47), 47, X(80), 80, { sw: 2.8, color: P.black[2] });
        d.path(rr(X(levels[i]) - 4.6, levels[i] - 2.8, 9.2, 5.6, 1.6), d.fill(cols[i], "v"), { sw: 1.6 });
      }
      d.shine(20, 22, 10, 1.4, 0.4, 0);
    },
  ],
  "headphones-studio": [
    "studio headphones",
    (d) => {
      d.tube("M19 58 C16 8 84 8 81 58", P.ink[1], 8, 3);
      d.tube("M29 27 Q50 13 71 27", P.red[1], 4, 2);
      const cup = (g: Pen) => {
        g.tube("M21 46 V40", P.silver[1], 3, 1.8);
        g.path(rr(27, 50, 10, 32, 5), g.fill(P.black, "h"), { sw: 2.6 });
        g.path(rr(8, 44, 23, 44, 11.5), g.fill(P.ink, "v"), { sw: 3.4 });
        g.ellipse(19.5, 66, 6, 13, "none", { sw: 2.6, stroke: P.red[1] });
      };
      cup(d);
      d.mirror(50, cup);
      d.stroke("M16 88 q-5 2 -1 5 q5 2 1 5", { sw: 2.6 });
      d.shine(13, 52, 2, 6, 0.6, 10);
    },
  ],
  notes: [
    "music notes",
    (d) => {
      d.tube("M38.6 73 V26", P.violet[1], 4.4, 2.6);
      d.tube("M80.6 63 V16", P.violet[1], 4.4, 2.6);
      d.path(quad([36, 19], [83, 9], [83, 21], [36, 31]), d.fill(P.violet, "d"), { sw: 3 });
      d.ellipse(29, 76, 11.5, 8.6, d.fill(P.pink), { sw: 3, tf: "rotate(-22 29 76)" });
      d.ellipse(71, 66, 11.5, 8.6, d.fill(P.sky), { sw: 3, tf: "rotate(-22 71 66)" });
      d.shine(25, 72.5, 4, 2, 0.7, -22);
      d.shine(67, 62.5, 4, 2, 0.7, -22);
      d.sparkle(14, 38, 5);
      d.sparkle(92, 40, 3.4);
    },
  ],
  clef: [
    "treble clef",
    (d) => {
      const path: Pt[] = [[40, 84], [47, 90], [55, 86], [56, 76], [54, 60], [51, 42], [49, 28], [50, 16], [55, 9], [60, 13], [58, 24], [47, 35], [35, 49], [34, 64], [45, 73], [60, 70], [65, 59], [59, 49], [49, 50], [46, 58]];
      d.tube(curve(path), d.fill(P.violet, "d"), 6.6, 3);
      d.ball(40, 84, 6, P.violet, { sw: 3 });
      d.shine(51.5, 20, 1.2, 5, 0.75, 20);
      d.shine(37, 56, 1.2, 5, 0.6, -10);
    },
  ],
};

export const INSTRUMENT_IDS: string[] = Object.keys(INSTRUMENT_ART);

const cache = new Map<string, Art>();
/** The picture for an instrument, drum or music thing (cached), or null if it isn't drawn. */
export function instArt(id: string): Art | null {
  const hit = cache.get(id);
  if (hit) return hit;
  if (!Object.prototype.hasOwnProperty.call(INSTRUMENT_ART, id)) return null;
  const art = draw(INSTRUMENT_ART[id][1]);
  cache.set(id, art);
  return art;
}
