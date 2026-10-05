// Boat parts that are pictures: figureheads (at the bow) and deck gear. Drawn with the house pen
// (see ../art/STYLE.md) on small boards, and placed by the boat renderer (Boat.tsx):
//
// FIGUREHEADS — board 40×40, the figure faces RIGHT (the way the boat sails). It fixes to the bow
// at (10, 30): that point sits on the bow's tip, the figure rising up and forward from it like a
// carved ship's figurehead (a leaping dolphin, a swan's neck, a dragon head…). Keep it inside
// x 4..38, y 2..38.
//
// DECK GEAR — board 40×40, standing on its base at (20, 38) (bottom middle), except:
//   gear-ring   a life ring CENTERED at (20, 20) — it hangs on the hull's side
//   gear-anchor hangs from its ring at (20, 4) — it dangles over the bow
//   gear-nest   a crow's-nest basket around a mast that runs up x = 20 (draw the basket in front;
//               its rim at y ≈ 15, bottom at y ≈ 30)
// (Party flags are drawn by the renderer — they string from the mast to the bow.)
//
// Review: node scripts/learn-art.mjs gear   (every board big, plus each one on a little boat).

import { HAIR, OL, P, SKIN, circlePath, drawInline, leaf, rr, smooth, softStar, sparklePath, type Pen, type Ramp } from "../art/pen";

// ── Local helpers ─────────────────────────────────────────────────────────────────────────────
type Pt = [number, number];
const q = (n: number) => Math.round(n * 100) / 100;

/** A smooth tapered limb along a spine (necks, tails): `ws` is its width at each spine point. */
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
    const h = ws[i] / 2;
    L.push([pts[i][0] + nx * h, pts[i][1] + ny * h]);
    R.push([pts[i][0] - nx * h, pts[i][1] - ny * h]);
  }
  // A rounding point past each end.
  const cap = (i: number, j: number): Pt => {
    const len = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]) || 1;
    const h = ws[i] * 0.45;
    return [pts[i][0] + ((pts[i][0] - pts[j][0]) / len) * h, pts[i][1] + ((pts[i][1] - pts[j][1]) / len) * h];
  };
  return smooth([...L, cap(n - 1, n - 2), ...R.reverse(), cap(0, 1)], t);
}

/** Parts drawn as one solid piece: one outline round them all, no seams inside. A part is a closed
 *  path, or [open path, width] for a thick stroke. */
type Part = string | [string, number];
function unite(d: Pen, parts: Part[], fill: string, sw = 2.2) {
  for (const pass of [0, 1])
    for (const p of parts) {
      if (typeof p === "string") d.path(p, pass ? fill : OL, pass ? { stroke: null } : { sw: sw * 2 });
      else d.stroke(p[0], { sw: p[1] + (pass ? 0 : sw * 2), color: pass ? fill : OL });
    }
}

/** The house round light laid over a box on the board (not per shape), so parts drawn separately
 *  shade as one piece. Its id comes from a fresh pen gradient, so it keeps the pen's prefix. */
function boardFill(d: Pen, r: Ramp, x0: number, y0: number, x1: number, y1: number) {
  const id = `${d.lin([[0, r[1]]]).slice(5, -1)}u`;
  const w = x1 - x0;
  const h = y1 - y0;
  d.raw(`<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${q(x0 + w * 0.35)}" cy="${q(y0 + h * 0.3)}" r="${q(Math.max(w, h) * 0.85)}"><stop offset="0" stop-color="${r[0]}"/><stop offset="0.55" stop-color="${r[1]}"/><stop offset="1" stop-color="${r[2]}"/></radialGradient>`);
  return `url(#${id})`;
}

/** A scalloped ring of puffs round a circle: a lion's mane. */
function fluff(cx: number, cy: number, r: number, n = 12, puff = 0.14) {
  let s = "";
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) {
      s = `M${q(x)} ${q(y)}`;
      continue;
    }
    const m = ((i - 0.5) / n) * Math.PI * 2;
    s += ` Q${q(cx + Math.cos(m) * r * (1 + puff * 2))} ${q(cy + Math.sin(m) * r * (1 + puff * 2))} ${q(x)} ${q(y)}`;
  }
  return `${s} Z`;
}

/** A head seen from the front: round on top, full cheeks, soft chin (half width w, half height h). */
function headPath(cx: number, cy: number, w: number, h: number) {
  return `M${q(cx)} ${q(cy - h)} C${q(cx + w * 0.72)} ${q(cy - h)} ${q(cx + w)} ${q(cy - h * 0.55)} ${q(cx + w)} ${q(cy)} C${q(cx + w)} ${q(cy + h * 0.62)} ${q(cx + w * 0.58)} ${q(cy + h)} ${q(cx)} ${q(cy + h)} C${q(cx - w * 0.58)} ${q(cy + h)} ${q(cx - w)} ${q(cy + h * 0.62)} ${q(cx - w)} ${q(cy)} C${q(cx - w)} ${q(cy - h * 0.55)} ${q(cx - w * 0.72)} ${q(cy - h)} ${q(cx)} ${q(cy - h)} Z`;
}

/** The little gilded scroll a figure stands on, curling up from the bow tip (10, 30) to (x, y). */
function mount(d: Pen, x: number, y: number) {
  d.tube(`M8.6 30.4 C${q(x - 5)} 30 ${q(x - 1)} ${q(y + 4)} ${q(x)} ${q(y)}`, d.fill(P.gold, "h"), 2.6, 1.8);
  d.circle(8.8, 30.2, 2, d.fill(P.gold), { sw: 1.8 });
  d.circle(8.8, 30.2, 0.7, P.gold[2], { stroke: null });
}

// ── Figureheads ───────────────────────────────────────────────────────────────────────────────
export const FIGUREHEADS: Record<string, (d: Pen) => void> = {
  "fig-dolphin": (d) => {
    const b = P.sky;
    // Tail flukes resting on the bow tip, the body arcing up and forward into a dive.
    d.path(leaf(12.2, 28.4, 7, 170, 0.55), d.fill(b, "d"), { sw: 2.2 });
    d.path(leaf(12.2, 28.4, 6.2, 30, 0.55), d.fill(b, "d"), { sw: 2.2 });
    d.path("M17 11.6 C16.2 7.6 14.6 5.6 12 4.6 C16.6 4 21 5.6 23.6 8.9 Z", d.fill(b, "v"), { sw: 2.2 });
    const body = "M10.6 27.6 C10.4 19 15 10.6 23 8.2 C28 6.8 32.6 8 35 11.2 Q36 12.6 36.7 14.9 Q36.5 16.4 35 16.3 C33.4 16 31 17.2 28.6 17.8 C22.2 19.4 16.8 22.4 14.4 28.4 Z";
    d.path(body, d.fill(b), { sw: 2.4 });
    d.clip(body, (c) => c.stroke("M13.8 30.5 C15.6 23.6 21.6 19.8 28.6 18.8 C32.4 18.2 35.4 17.8 38.6 17.4", { sw: 5.4, color: "#fff", op: 0.85 }));
    d.path(body, "none", { sw: 2.4 });
    d.path(leaf(26.2, 17, 6.4, 148, 0.5), d.fill(b, "d"), { sw: 2 });
    d.eye(31.4, 12, 1.6);
    d.stroke("M35.2 15.7 Q33.6 15.8 32.6 15", { sw: 1.3 });
    d.cheek(30.4, 15.2, 1.4);
    d.shine(21.6, 10.4, 3.6, 1.2, 0.6, -22);
  },

  "fig-swan": (d) => {
    const w = P.white;
    // The S of the neck rises from a full breast; the wing is raised in an arch over the back.
    d.g("translate(2.8 1.4)", (d) => {
      const fill = boardFill(d, w, 3, 3, 34, 32);
      const neck = limb([[21.6, 25.6], [23.8, 19.2], [21.4, 13], [22.4, 7.8], [25.2, 5.8]], [5.4, 4.4, 4, 4, 3.6]);
      const body = "M3.6 20 C7 22.6 11.6 23.2 16.6 22.4 C21.4 21.6 25.6 23 25.8 26.6 C26 29.6 22.6 31.6 17 31.6 L11 31.6 C6.6 31.6 3.8 28 3.6 20 Z";
      unite(d, [neck, circlePath(26, 6.4, 3.4), body], fill, 2.3);
      const wing = "M22 26 C20.6 19.6 15.4 15.6 9.6 15.6 C7.4 15.6 5.6 16.2 4.2 17.2 C6 18 6.8 19 6.8 20.2 C8.4 20.4 9.4 21.4 9.6 22.6 C11.2 22.8 12.2 23.8 12.4 25.2 C15.6 27.4 19.6 27.6 22 26 Z";
      d.path(wing, d.fill(w), { sw: 2.2 });
      d.stroke("M19.6 23.4 Q16 20 11 19.6 M19.8 25.8 Q16.6 23.6 13.4 23.4", { sw: 1.1, color: P.grey[2], op: 0.6 });
      d.path("M28.4 4.8 L34 7.6 Q34.4 9 33 9 L28.2 8.6 Z", d.fill(P.orange), { sw: 1.8 });
      d.path("M27.2 4 C28.5 4 29.3 5.1 29.3 6.5 C29.3 7.7 28.5 8.7 27.2 8.6 Z", OL, { stroke: null });
      d.eye(25.2, 5.9, 1.15);
      d.shine(22.4, 14, 0.8, 2.4, 0.7, 20);
      d.shine(11.4, 18.6, 3, 1, 0.7, -10);
    });
  },

  "fig-seahorse": (d) => {
    const g = P.gold;
    const o = P.orange;
    // Back fin and crown behind the body; the tail curls round the bow tip.
    d.path("M14.4 13.6 C10.6 13.8 8.8 17 9.4 20.6 C10.8 20 12.6 20.2 14.2 21.2 Z", d.fill(o), { sw: 2 });
    d.stroke("M13.6 15.6 L10.6 16.6 M13.6 18.2 L10.2 19.2", { sw: 1.1, color: o[2] });
    d.path("M15.6 5.6 L15.8 3 L17.6 4.4 L19.2 2.9 L20.2 5.2 Z", d.fill(o), { sw: 1.8 });
    const tail = limb([[16.4, 24.5], [16, 28.5], [14, 31.6], [11, 32.2], [8.6, 30.2], [9, 27.4], [11.4, 26.8], [12.6, 28.8]], [4.4, 3.8, 3.2, 2.8, 2.4, 2, 1.6, 1.2]);
    d.path(tail, d.fill(g, "d"), { sw: 2.2 });
    const body = "M15 6.5 C15.5 4 17.5 3 19.5 3.6 C21 4.1 21.8 5.2 22.2 6.3 L28 7 C29.4 7.2 29.6 9.6 28.2 9.8 L22.6 10.2 C21.8 10.9 21.2 11.4 21 12.4 C24.4 14.4 25.4 18.6 23.8 22 C22.6 24.8 20.4 26.2 18.6 27 L14.4 25 C13.6 21.5 13.4 18 14.2 15 C14.6 13 14 11 13.6 9.8 C13.4 8.4 14 7.2 15 6.5 Z";
    d.path(body, d.fill(g), { sw: 2.4 });
    d.clip(body, (c) => {
      for (const y of [14.4, 17.2, 20, 22.8]) c.stroke(`M17 ${y} Q20.5 ${y + 1.6} 25.5 ${y - 0.4}`, { sw: 1.2, color: g[2] });
    });
    d.path(body, "none", { sw: 2.4 });
    d.eye(18.6, 7, 1.6);
    d.cheek(20.6, 9.8, 1.2);
    d.shine(16.6, 5.4, 1.6, 0.8, 0.6, -30);
    d.shine(21.6, 15, 1.1, 2.6, 0.5, -20);
  },

  "fig-owl": (d) => {
    // Perched on a gilded rod at the bow tip.
    d.path(rr(5.6, 29, 13.6, 2.8, 1.4), d.fill(P.gold, "v"), { sw: 1.8 });
    d.ball(19.8, 30.4, 1.9, P.gold, { sw: 1.8 });
    for (const s of [-1, 1]) d.path(`M${16 + s * 4.5} 11 L${16 + s * 7} 3.8 Q${16 + s * 8.2} 4.4 ${16 + s * 7.8} 6 L${16 + s * 7.6} 12.6 Z`, d.fill(P.wood), { sw: 2 });
    const body = "M16 7.2 C22.6 7.2 25.6 12.6 25.6 19 C25.6 25.4 21.6 29.4 16 29.4 C10.4 29.4 6.4 25.4 6.4 19 C6.4 12.6 9.4 7.2 16 7.2 Z";
    d.path(body, d.fill(P.wood), { sw: 2.4 });
    d.clip(body, (c) => {
      c.ellipse(16, 25.4, 7.2, 6.4, P.tan[1], { stroke: null });
      for (const [x, y] of [[13.4, 23.4], [18.6, 23.4], [16, 26.4]] as Pt[]) c.stroke(`M${x - 1.4} ${y} L${x} ${y + 1.4} L${x + 1.4} ${y}`, { color: P.wood[2], sw: 1.1 });
    });
    d.path(body, "none", { sw: 2.4 });
    for (const s of [-1, 1]) d.path(`M${16 + s * 9.4} 15.6 C${16 + s * 11.8} 19.6 ${16 + s * 11.4} 25.6 ${16 + s * 7.6} 29 C${16 + s * 8.2} 24 ${16 + s * 7.8} 19.6 ${16 + s * 9.4} 15.6 Z`, d.fill(P.brown), { sw: 2 });
    for (const s of [-1, 1]) d.circle(16 + s * 4, 15, 4.3, P.tan[0], { sw: 1.8 });
    for (const s of [-1, 1]) {
      d.circle(16 + s * 4, 15, 3, d.fill(P.gold), { sw: 1.3 });
      d.eye(16 + s * 4, 15, 1.9);
    }
    d.path("M14.4 18.4 H17.6 L16 21.2 Z", d.fill(P.orange), { sw: 1.5 });
    d.tube("M13.4 29.2 V31 M15.2 29.4 V31.2 M16.8 29.4 V31.2 M18.6 29.2 V31", P.orange[1], 1.1, 1.1);
    d.shine(10.6, 11.4, 2.6, 1.3, 0.5, -30);
  },

  "fig-eagle": (d) => {
    const br = P.brown;
    const gd = P.gold;
    // One wing raised up and back: brown flight feathers fanned out under gilded coverts.
    for (const [a, len] of [[-172, 11], [-154, 13], [-136, 14.6], [-118, 15.6], [-100, 15.6], [-82, 15]] as Pt[]) d.path(leaf(17, 18.4, len, a, 0.34), d.fill(br, "d"), { sw: 2 });
    d.path("M19.2 20.6 C17.8 15.6 18 11 20 7.2 C16.4 6.8 12 8.2 9.2 10.6 C9.4 13.2 8.6 15.6 7 17.4 C9.4 20 12.2 22 15 23.2 Z", d.fill(gd), { sw: 2 });
    d.stroke("M18.4 11.6 Q13.6 11.8 10.6 14 M18.2 16 Q14.4 16.4 11.6 18.6", { sw: 1.1, color: gd[2] });
    for (const a of [128, 146, 164]) d.path(leaf(12.6, 27.6, 7, a, 0.42), d.fill(br, "v"), { sw: 1.8 });
    const body = "M10.6 30.4 C9.4 25 11.6 19 17 16.2 C20.8 14.2 25.4 14.8 26.6 18.2 C27.8 21.8 25 26.2 20.4 28.8 C16.8 30.8 12.4 31.6 10.6 30.4 Z";
    d.path(body, d.fill(br), { sw: 2.4 });
    d.stroke("M18.4 22.4 l1.3 1.3 l1.3 -1.3 M14.6 25.6 l1.3 1.3 l1.3 -1.3 M20.6 26 l1.3 1.3 l1.3 -1.3", { sw: 1.1, color: br[0] });
    // The white head, a heavy brow and the big hooked beak.
    d.path("M19.8 18.4 C19 14.8 20.2 11.6 22.2 9.4 C24 7.2 27 6.4 30 7.2 C31.4 7.6 32 8.6 31.8 9.8 L31.4 12.8 C29.8 13.6 28.6 14.6 28.2 16 L27.6 18.2 L26 16.8 L24.8 19 L23.2 17.4 L21.6 19.6 Z", d.fill(P.white), { sw: 2.2 });
    d.path("M30.8 12.4 L33.8 12.6 C33.2 13.8 31.9 14.2 30.8 13.7 Z", d.fill(P.orange), { sw: 1.4 });
    d.path("M30.4 8.4 C32.8 7.9 35.2 9 36 11.4 C36.4 12.6 36.2 13.8 35.3 13.9 C35 13 34.3 12.5 33.3 12.5 L30.6 12.6 Z", d.fill(gd), { sw: 1.8 });
    d.eye(28, 10.4, 1.4);
    d.stroke("M25.8 8.6 Q28.4 7.8 31 9.2", { sw: 1.5 });
    d.shine(23.4, 11, 1.1, 2.4, 0.7, 25);
    d.shine(15.6, 19.6, 1.3, 2.6, 0.4, 25);
  },

  "fig-lion": (d) => {
    // A lion's bust: the mane flows down to the bow tip.
    const mane = boardFill(d, P.orange, 7, 4, 34, 31);
    unite(d, [fluff(22, 15.6, 10, 12, 0.12), circlePath(16.4, 23.6, 4.2), circlePath(13.4, 26.8, 3), circlePath(11.2, 29, 2.1)], mane, 2.4);
    for (let i = 0; i < 12; i++) {
      const a = ((i + 0.5) / 12) * Math.PI * 2;
      d.stroke(`M${q(22 + Math.cos(a) * 7.8)} ${q(15.6 + Math.sin(a) * 7.8)} L${q(22 + Math.cos(a) * 9.8)} ${q(15.6 + Math.sin(a) * 9.8)}`, { color: P.orange[2], sw: 1.3 });
    }
    d.stroke("M15.4 25.2 Q14 26.4 13.8 28", { color: P.orange[2], sw: 1.2 });
    for (const [x, y] of [[18, 9.2], [27.2, 8.8]] as Pt[]) {
      d.circle(x, y, 2.6, d.fill(P.gold), { sw: 1.8 });
      d.circle(x, y, 1.1, P.orange[1], { stroke: null });
    }
    d.path(headPath(23, 16.2, 7.2, 7), d.fill(P.gold), { sw: 2.4 });
    d.ellipse(23.4, 19.8, 3.9, 2.7, P.cream[1], { sw: 1.5 });
    d.path("M21.8 17.4 Q23.4 16.4 25 17.4 Q24.6 19 23.4 19.4 Q22.2 19 21.8 17.4 Z", d.fill(P.brown), { sw: 1.3 });
    d.stroke("M23.4 19.4 V20.4 M23.4 20.4 Q22.2 21.6 21 20.8 M23.4 20.4 Q24.6 21.6 25.8 20.8", { sw: 1.1 });
    d.eye(20.3, 14.5, 1.6);
    d.eye(26.5, 14.3, 1.6);
    d.cheek(18.5, 19, 1.5);
    d.cheek(28.5, 18.8, 1.5);
    d.shine(19.7, 11.3, 2.4, 1.2, 0.5, -20);
  },

  "fig-mermaid": (d) => {
    const skin = SKIN[1];
    const hair = HAIR.red;
    const t = P.teal;
    d.g("translate(0 0.6)", (d) => {
      // Hair streaming back; the tail curls down to the bow tip and ends in a fin there.
      d.path("M25.2 2.8 C20 2.6 16.8 6 17 10.2 C17.2 13.2 15.6 16 12.6 17.4 C16.4 18.8 20.4 17.8 22 14.8 C22.6 13.6 22.4 12 21.4 10.8 Z", d.fill(hair), { sw: 2 });
      d.path(leaf(10.6, 29.4, 5.7, -148, 0.64), d.fill(t, "d"), { sw: 2 });
      d.path(leaf(10.6, 29.4, 5.6, 162, 0.64), d.fill(t, "d"), { sw: 2 });
      const tail = limb([[20.4, 20.4], [18.6, 25.2], [15, 28.6], [11.4, 29.6]], [7, 5.8, 4.2, 2.4]);
      d.path(tail, d.fill(t), { sw: 2.2 });
      d.clip(tail, (c) => {
        for (const [x, y] of [[18.2, 22.8], [21, 22.4], [16.6, 26], [19.4, 25.8], [14.4, 28.2]] as Pt[]) c.stroke(`M${x - 1.2} ${y} Q${x} ${y + 1.3} ${x + 1.2} ${y}`, { sw: 1, color: t[2] });
      });
      d.path(tail, "none", { sw: 2.2 });
      // Both arms reach forward the way the boat goes: one just under her chin, one lower.
      d.tube("M25 13.8 L33.2 10.4", skin[2], 2.2, 1.4);
      d.circle(34.2, 10, 1.6, d.fill(skin), { sw: 1.3 });
      d.path("M22.4 12.6 C24.8 11.8 27 13.2 27 15.6 C27 18.4 24.8 21.4 21.8 21.8 C19.2 22.2 18 20 18.6 17.8 C19.2 15.4 20.4 13.2 22.4 12.6 Z", d.fill(skin), { sw: 2 });
      d.path("M19.6 16.6 Q21.4 15.2 23 16.6 Q22 18.6 20 18.4 Z M22.6 15.6 Q24.4 14.4 25.8 16.2 Q24.6 18 22.8 17.2 Z", d.fill(P.purple), { sw: 1.3 });
      d.tube("M25.4 15.8 Q29 18.8 33.2 17.8", skin[1], 2.1, 1.4);
      d.circle(34.3, 17.5, 1.6, d.fill(skin), { sw: 1.3 });
      d.circle(24.8, 7.6, 4.7, d.fill(skin), { sw: 2.2 });
      d.path("M20 7.6 C19.6 3.6 22.6 2.4 25 2.6 C28 2.8 29.8 4.8 29.6 7.2 C27.6 5.6 25 5.4 22.8 6.4 C21.8 7 20.8 7.6 20 7.6 Z", d.fill(hair), { sw: 1.8 });
      d.eye(24.4, 8.3, 1.25);
      d.eye(27.9, 8.3, 1.25);
      d.smile(26.1, 10.4, 2.4, 1.1);
      d.cheek(22.6, 10.2, 1.2);
      d.cheek(29.2, 10, 1.1);
    });
  },

  "fig-unicorn": (d) => {
    const head = "M7.6 30.6 C7 22 10.6 13.6 16 8.6 C18.6 6 22 5.6 25 7.6 C28.6 10 32 12.6 34.2 15 C35.6 16.8 34.6 19.6 32.2 20 C29.6 20.4 27 19.4 24.6 18.8 C21.6 21.6 18 25.6 15.6 30.6 Z";
    d.path(leaf(19.2, 7.6, 4.9, -112, 0.6), d.fill(P.white), { sw: 2 });
    d.path(head, d.fill(P.white), { sw: 2.4 });
    d.clip(head, (c) => c.ellipse(33.2, 17.4, 3.6, 3.4, P.rose[0], { stroke: null }));
    d.path(head, "none", { sw: 2.4 });
    // A pastel mane lying along the back of the neck, and a golden horn under the forelock.
    const locks: [string, Ramp][] = [
      ["M18.2 7.2 C13.4 6.8 10.4 9.8 9.4 14.6 C11 13.4 12.8 13.2 14.4 13.8 C15 11.4 16.4 9 18.2 7.2 Z", P.pink],
      ["M14 12.6 C9.4 13.2 6.6 16.8 6 21.8 C7.8 20.6 9.8 20.4 11.2 21 C11.6 18 12.6 15 14 12.6 Z", P.violet],
      ["M11 19.8 C7 21 5 25 5.2 29.6 C6.7 28.3 8.5 28 10.2 28.6 C10.1 25.6 10.4 22.6 11 19.8 Z", P.sky],
    ];
    for (const [p, r] of locks) d.path(p, d.fill(r), { sw: 1.8 });
    const horn = "M21 7 L29 3.2 L24.8 8.6 Z";
    d.path(horn, d.fill(P.gold, "d"), { sw: 1.8 });
    d.clip(horn, (c) => c.stroke("M23.9 4.2 L25.6 8.7 M25.4 3 L27.1 7.5 M26.8 2 L28.5 6.5", { sw: 1.1, color: P.gold[2] }));
    d.path(horn, "none", { sw: 1.8 });
    d.path("M22.8 7.4 C19.8 8.2 19 10.8 20.4 12.8 C20.8 11 22.2 9.8 24.6 9.4 Z", d.fill(P.pink), { sw: 1.6 });
    d.eye(25.6, 11.6, 1.6);
    d.stroke("M27 10 L28.4 9 M27.6 11 L29 10.6", { sw: 1 });
    d.ellipse(32.8, 16.4, 0.8, 0.6, P.rose[2], { stroke: null });
    d.stroke("M30.2 18.6 Q31.6 19.4 33 18.8", { sw: 1.1 });
    d.cheek(27.4, 15, 1.5);
    d.shine(14.6, 16.4, 1.2, 3.4, 0.6, 30);
  },

  "fig-dragon": (d) => {
    const g = P.green;
    const o = P.orange;
    // Spikes down the back of the neck and two small horns, behind the head and neck.
    for (const [x, y, a] of [[8.4, 25.4, -100], [8.8, 20.4, -115], [10.8, 15.8, -130], [14.6, 12, -145]] as [number, number, number][]) {
      d.path(leaf(x, y, 4.4, a, 0.7), d.fill(o, "v"), { sw: 1.6 });
    }
    d.path(leaf(19.4, 6.6, 5.6, -150, 0.5), d.fill(o, "d"), { sw: 1.7 });
    d.path(leaf(22.4, 6.4, 4.6, -130, 0.5), d.fill(o, "d"), { sw: 1.7 });
    const fill = boardFill(d, g, 7, 3, 36, 32);
    const neck = limb([[11.4, 30.6], [11.6, 23], [14.6, 16], [19.6, 11.2]], [8.4, 6.8, 5.8, 5.6]);
    const head = "M17 9.4 C17.4 5.4 21.4 3.8 25.4 4.6 C28.8 5.4 32.4 7 34.6 9 C36.2 10.4 35.8 13.4 33.8 14 C29.8 15.2 25 15.6 21 14.6 C18.2 13.8 16.8 11.8 17 9.4 Z";
    unite(d, [neck, head], fill, 2.3);
    d.clip(neck, (c) => {
      c.stroke("M17 30 C15.6 24 16.4 19 20.6 14.6", { sw: 4.4, color: P.gold[1] });
      c.stroke("M13.4 26.6 H18 M13.6 22.8 H18.2 M14.6 19.2 H19", { sw: 1, color: P.gold[2] });
    });
    d.eye(24.4, 8.6, 1.7);
    d.stroke("M22.2 6.2 Q24.6 5.2 26.8 6.6", { sw: 1.3 });
    d.circle(32.8, 9.6, 0.7, OL, { stroke: null });
    d.stroke("M25.2 12.6 Q29.6 13.6 34.2 12.2", { sw: 1.2 });
    d.path("M30.4 12.9 L31.2 14.4 L32 12.8 Z", "#fff", { sw: 0.8 });
    d.cheek(27.6, 11.2, 1.5);
    d.shine(21.2, 6.6, 2.4, 1, 0.55, -15);
  },

  "fig-star": (d) => {
    mount(d, 19.6, 23.2);
    d.glow(23, 14.2, 15, "#ffe066", 0.45);
    d.path(softStar(23, 14.4, 11.2, 5.8), d.fill(P.gold), { sw: 2.4 });
    d.path(softStar(23, 14.4, 6.4, 3.3), P.gold[0], { stroke: null, op: 0.55 });
    d.shine(19.6, 10.2, 2.4, 1.2, 0.75, -30);
    d.path(sparklePath(33.8, 5.8, 3), "#fff4a8", { sw: 1.2, stroke: "#e0a800" });
    d.path(sparklePath(8.4, 12.4, 2.2), "#fff4a8", { sw: 1, stroke: "#e0a800" });
  },
};

// ── Deck gear ─────────────────────────────────────────────────────────────────────────────────
/** A tulip on a stem, its cup at (x, y). */
function tulip(d: Pen, x: number, y: number, r: Ramp) {
  d.path(`M${q(x - 2.8)} ${q(y - 1.6)} L${q(x - 1.5)} ${q(y - 3.8)} L${q(x)} ${q(y - 2.2)} L${q(x + 1.5)} ${q(y - 3.8)} L${q(x + 2.8)} ${q(y - 1.6)} C${q(x + 2.8)} ${q(y + 2.6)} ${q(x - 2.8)} ${q(y + 2.6)} ${q(x - 2.8)} ${q(y - 1.6)} Z`, d.fill(r), { sw: 1.8 });
}
/** A flower pot (rim at `top`, standing on y = 38). */
function pot(d: Pen, x: number, w: number, top: number, r: Ramp) {
  d.path(`M${q(x - w / 2 + 0.8)} ${q(top + 2.6)} H${q(x + w / 2 - 0.8)} L${q(x + w / 2 - 2.2)} 38 H${q(x - w / 2 + 2.2)} Z`, d.fill(r, "h"), { sw: 2.2 });
  d.path(rr(x - w / 2, top, w, 3.6, 1.4), d.fill(r, "v"), { sw: 2.2 });
}

export const GEAR: Record<string, (d: Pen) => void> = {
  "gear-ring": (d) => {
    const at = (deg: number, r: number) => `${q(20 + Math.cos((deg * Math.PI) / 180) * r)} ${q(20 + Math.sin((deg * Math.PI) / 180) * r)}`;
    d.tube(circlePath(20, 20, 11.2), P.red[1], 7.4, 2.4);
    for (const a of [45, 135, 225, 315]) d.stroke(`M${at(a - 17, 11.2)} A11.2 11.2 0 0 1 ${at(a + 17, 11.2)}`, { sw: 7.4, color: "#fff", cap: "butt" });
    d.circle(20, 20, 14.9, "none", { sw: 2.2 });
    d.circle(20, 20, 7.5, "none", { sw: 2.2 });
    d.shine(12.4, 12.6, 3.2, 1.3, 0.55, -45);
  },

  "gear-bell": (d) => {
    // A wooden post with an arm, the brass bell hanging from it.
    d.path(rr(4.6, 34.2, 14, 3.8, 1.6), d.fill(P.wood, "v"), { sw: 2 });
    d.path(rr(9.4, 6, 4.8, 29.4, 1.8), d.fill(P.wood, "h"), { sw: 2 });
    d.tube("M12.4 18 L18.4 9.8", P.wood[1], 2.4, 1.7);
    d.path(rr(7.8, 4.4, 21.4, 4.8, 2.2), d.fill(P.wood, "v"), { sw: 2 });
    d.path(rr(21.6, 8.4, 3, 3.6, 1), d.fill(P.gold), { sw: 1.8 });
    d.tube("M23 27 Q23.6 31 22.6 34", P.cream[2], 1.6, 1.5);
    d.ball(23, 28.6, 2.2, P.gold, { sw: 1.8 });
    d.path("M23 11 C28.5 11 29.5 15.5 29.5 19.5 C29.5 23 30.5 24.5 32 26 L14 26 C15.5 24.5 16.5 23 16.5 19.5 C16.5 15.5 17.5 11 23 11 Z", d.fill(P.gold), { sw: 2.4 });
    d.path(rr(13, 24.6, 20, 3.4, 1.7), d.fill(P.gold, "v"), { sw: 2.2 });
    d.shine(19.6, 15.6, 1.4, 3.4, 0.6, 15);
  },

  "gear-telescope": (d) => {
    d.tube("M19 24 L20.4 36", P.wood[2], 2.2, 1.8);
    d.g("rotate(-34 19 21)", (g) => {
      g.path(rr(4, 18.6, 7, 4.8, 1.4), g.fill(P.gold, "v"), { sw: 2 });
      g.path(rr(10, 17.6, 10, 6.8, 1.6), g.fill(P.gold, "v"), { sw: 2.2 });
      g.path(rr(19, 16.4, 13, 9.2, 2), g.fill(P.gold, "v"), { sw: 2.4 });
      g.path(rr(31, 15.4, 4, 11.2, 1.6), g.fill(P.orange, "v"), { sw: 2.2 });
      g.shine(25, 18.2, 4.5, 0.9, 0.6, 0);
    });
    d.tube("M19 24 L10.6 36", P.wood[1], 2.4, 1.8);
    d.tube("M19 24 L27.9 36", P.wood[1], 2.4, 1.8);
    d.circle(19, 22.6, 2.2, d.fill(P.steel), { sw: 1.8 });
  },

  "gear-anchor": (d) => {
    unite(
      d,
      [
        [circlePath(20, 6.4, 2.2), 1.8],
        rr(18.2, 8.6, 3.6, 26, 1.8),
        rr(12, 11.4, 16, 3.6, 1.8),
        ["M8.6 24 Q9 35.4 20 35.4 Q31 35.4 31.4 24", 3.6],
        "M5 27.6 L8.6 20 L12.8 26.4 Q8.6 25.2 5 27.6 Z",
        "M35 27.6 L31.4 20 L27.2 26.4 Q31.4 25.2 35 27.6 Z",
      ],
      boardFill(d, P.steel, 6, 3, 34, 37),
      2.2,
    );
    d.shine(15.6, 12.6, 2.4, 0.7, 0.7, 0);
    d.shine(19.4, 20, 0.6, 4, 0.5, 0);
  },

  "gear-lantern": (d) => {
    d.glow(20, 16, 16, "#ffd23a", 0.65);
    d.path(rr(12.6, 34.2, 14.8, 3.8, 1.6), d.fill(P.wood, "v"), { sw: 2 });
    d.path(rr(17.4, 25.4, 5.2, 9.6, 1.6), d.fill(P.wood, "h"), { sw: 2 });
    d.circle(20, 3.4, 1.7, "none", { sw: 1.6 });
    d.path(rr(13.4, 9.4, 13.2, 13.6, 1.6), d.rad([[0, "#fffde8"], [0.45, "#ffe066"], [1, "#ffa62b"]], 0.5, 0.5, 0.6), { sw: 2.2 });
    d.path("M20 11.8 C22.4 14.6 22.8 17 20 19.8 C17.2 17 17.6 14.6 20 11.8 Z", d.fill(P.orange), { stroke: null, op: 0.9 });
    d.stroke("M17.2 9.6 V22.8 M22.8 9.6 V22.8", { sw: 1.3 });
    d.path("M12.4 10 L15.4 5 H24.6 L27.6 10 Z", d.fill(P.ink, "v"), { sw: 2 });
    d.path(rr(12.4, 22.2, 15.2, 3.6, 1.4), d.fill(P.ink, "v"), { sw: 2 });
    d.shine(15.4, 12.6, 0.8, 2.4, 0.8, 0);
  },

  "gear-wheel": (d) => {
    d.path("M17 20 H23 L24.6 34.4 H15.4 Z", d.fill(P.wood, "h"), { sw: 2.2 });
    d.path(rr(11.4, 33.6, 17.2, 4.4, 2), d.fill(P.wood, "v"), { sw: 2.2 });
    // Eight spokes run from the brass hub out through the rim and end in handles.
    const at = (a: number, r: number): Pt => [20 + Math.cos(a) * r, 16.6 + Math.sin(a) * r];
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + Math.PI / 8;
      const [x1, y1] = at(a, 11);
      const [x2, y2] = at(a, 13.6);
      d.tube(`M${q(x1)} ${q(y1)} L${q(x2)} ${q(y2)}`, P.wood[1], 2.8, 1.7);
    }
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + Math.PI / 8;
      const [x1, y1] = at(a, 11.2);
      d.tube(`M20 16.6 L${q(x1)} ${q(y1)}`, P.wood[1], 1.4, 1);
    }
    d.tube(circlePath(20, 16.6, 9.6), P.wood[1], 2.4, 1.7);
    d.ball(20, 16.6, 2.5, P.gold, { sw: 1.6 });
  },

  "gear-flowers": (d) => {
    // Left pot: two tulips. Right pot: a big round flower.
    d.tube("M11 28 Q10.4 21 9 15.6 M13.6 28 Q14.4 22 15.6 17.6", P.green[1], 1.4, 1.3);
    d.path(leaf(11.6, 27.4, 7, -125, 0.45), d.fill(P.green), { sw: 1.6 });
    d.path(leaf(12.8, 27.4, 6.4, -55, 0.45), d.fill(P.green), { sw: 1.6 });
    tulip(d, 9, 14.4, P.red);
    tulip(d, 15.6, 16.4, P.pink);
    pot(d, 12, 12, 26.6, P.coral);
    d.tube("M28 27 V17", P.green[1], 1.4, 1.3);
    d.path(leaf(28, 25.6, 6.4, -150, 0.45), d.fill(P.green), { sw: 1.6 });
    d.path(leaf(28, 24.6, 6.4, -30, 0.45), d.fill(P.green), { sw: 1.6 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      d.circle(28 + Math.cos(a) * 3.8, 14 + Math.sin(a) * 3.8, 2.8, d.fill(P.lemon), { sw: 1.6 });
    }
    d.circle(28, 14, 2.6, d.fill(P.orange), { sw: 1.6 });
    pot(d, 28, 13, 26, P.sky);
  },

  "gear-chest": (d) => {
    // The lid is lifted, and gold (and a ruby) heaps up in the gap.
    d.glow(20, 16, 16, "#ffe066", 0.65);
    for (const [x, y] of [[9.4, 20.2], [20.6, 18.2], [25.2, 18.4], [29.4, 18.8], [31.2, 20.6], [17.6, 20.4], [23, 20.4]] as Pt[]) d.circle(x, y, 2.7, d.fill(P.gold), { sw: 1.4 });
    d.path("M14 14.2 L17 17.4 L14 21 L11 17.4 Z", d.fill(P.red), { sw: 1.4 });
    d.shine(13.2, 16.4, 0.6, 1.2, 0.8, 30);
    d.path(rr(5.6, 21, 28.8, 16.4, 2.4), d.fill(P.wood, "v"), { sw: 2.4 });
    d.stroke("M6.4 29.2 H33.6", { sw: 1.2, color: P.wood[2] });
    for (const x of [9, 31]) d.path(rr(x - 1.5, 21, 3, 16.4, 1), d.fill(P.gold, "h"), { sw: 1.6 });
    d.path("M5 15.4 L5 12.2 C5 7.8 11 6 20 6 C29 6 35 7.8 35 12.2 L35 15.4 Z", d.fill(P.wood), { sw: 2.4 });
    for (const x of [9, 31]) d.path(`M${x - 1.5} 15.4 V8.8 Q${x} 7.4 ${x + 1.5} 7.6 V15.4 Z`, d.fill(P.gold, "h"), { sw: 1.6 });
    d.path(rr(18.5, 14.4, 3, 4.4, 1), d.fill(P.gold, "h"), { sw: 1.5 });
    d.path(rr(16.6, 22.6, 6.8, 6.2, 1.4), d.fill(P.gold), { sw: 1.8 });
    d.path("M20 24.4 a1 1 0 1 1 0.01 0 Z M19.6 25 h0.8 l0.4 2 h-1.6 Z", OL, { stroke: null });
    d.path(sparklePath(33.6, 4.4, 2.6), "#fff4a8", { sw: 1.1, stroke: "#e0a800" });
    d.shine(11, 9.2, 3.4, 1.1, 0.55, -8);
  },

  "gear-umbrella": (d) => {
    d.g("rotate(-5 20 38)", (g) => {
      g.path(rr(15, 34.4, 10, 3.6, 1.6), g.fill(P.steel, "v"), { sw: 2 });
      g.tube("M20 6 V36", P.white[1], 1.6, 1.6);
      const xs = [4.5, 9.67, 14.83, 20, 25.17, 30.33, 35.5];
      let can = "M4.5 17 C5 8.2 11.6 3.8 20 3.8 C28.4 3.8 35 8.2 35.5 17";
      for (let i = 5; i >= 0; i--) can += ` Q${q((xs[i] + xs[i + 1]) / 2)} 14.8 ${xs[i]} 17`;
      can += " Z";
      g.path(can, "#fff", { sw: 2.4 });
      g.clip(can, (c) => {
        for (let i = 0; i < 6; i += 2) c.poly([20, 0, xs[i] + (xs[i] - 20) * 0.3, 20, xs[i + 1] + (xs[i + 1] - 20) * 0.3, 20], c.fill(P.red, "v"), { stroke: null });
      });
      g.path(can, "none", { sw: 2.4 });
      g.circle(20, 3.2, 1.5, P.red[1], { sw: 1.5 });
      g.shine(11.6, 8.8, 3, 1.1, 0.55, -30);
    });
  },

  "gear-fishing": (d) => {
    d.stroke("M34.4 4.4 Q35 12 34.6 19.6", { sw: 0.9 });
    d.stroke("M34.6 25.4 V28.4 Q34.6 30.2 33.2 29.8", { sw: 1.1 });
    const bob = circlePath(34.6, 22.6, 2.8);
    d.path(bob, "#fff", { sw: 1.6 });
    d.clip(bob, (c) => c.rect(30, 18, 10, 4.6, 0, c.fill(P.red, "v"), { stroke: null }));
    d.path(bob, "none", { sw: 1.6 });
    d.tube("M11 33 L34.4 4.4", P.wood[1], 1.6, 1.5);
    d.circle(19.6, 25, 2.1, d.fill(P.steel), { sw: 1.5 });
    d.circle(19.6, 25, 0.6, OL, { stroke: null });
    d.path("M5 28 H18 L16.6 38 H6.4 Z", d.fill(P.sky, "h"), { sw: 2.2 });
    d.path(rr(4.4, 27, 14.2, 3, 1.2), d.fill(P.sky, "v"), { sw: 2 });
    d.shine(8, 31.6, 0.8, 2.4, 0.6, 5);
  },

  "gear-nest": (d) => {
    const body = "M7.6 16.6 H32.4 L30.8 28.6 Q30.4 30.4 28.6 30.4 H11.4 Q9.6 30.4 9.2 28.6 Z";
    d.path(body, d.fill(P.wood, "v"), { sw: 2.2 });
    d.clip(body, (c) => {
      for (const x of [12, 16, 20, 24, 28]) c.stroke(`M${x} 16 L${q(20 + (x - 20) * 0.92)} 31`, { sw: 1.1, color: P.wood[2] });
      c.stroke("M8 23.4 H32", { sw: 2.2, color: P.brown[2], op: 0.7 });
    });
    d.path(body, "none", { sw: 2.2 });
    d.path(rr(6.4, 12.8, 27.2, 4.8, 2.4), d.fill(P.brown, "v"), { sw: 2.2 });
    d.shine(11.4, 14.2, 2.8, 0.8, 0.6, 0);
  },
};

const cache = new Map<string, string>();
/** A figurehead's or a gear item's inline SVG (40×40 board), or null if it isn't drawn. */
export function partInner(id: string): string | null {
  const hit = cache.get(id);
  if (hit) return hit;
  const fn = FIGUREHEADS[id] ?? GEAR[id];
  if (!fn) return null;
  const svg = drawInline(fn, `${id.replace(/[^a-z0-9]/gi, "")}-`);
  cache.set(id, svg);
  return svg;
}
