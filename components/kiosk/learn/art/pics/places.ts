// Buildings, landmarks and things that go.

import { OL, P, circlePath, drop, heart, lumpy, rr, smooth, sparklePath, star, type Pen, type Ramp } from "../pen";
import type { PicDef } from "..";

// ── Local helpers ────────────────────────────────────────────────────────────────────────────

const n2 = (n: number) => Math.round(n * 100) / 100;

/** A tire with a silver hub (side views of things that go). */
function wheel(d: Pen, x: number, y: number, r: number) {
  d.circle(x, y, r, d.fill(P.black), { sw: 3 });
  d.circle(x, y, r * 0.42, d.fill(P.silver), { sw: 2 });
}

/** A glass pane lit from the top-left. */
function pane(d: Pen, x: number, y: number, w: number, h: number, r = 2.5, sw = 2.4) {
  d.rect(x, y, w, h, r, d.fill(P.sky, "d"), { sw });
}

/** The sea a boat sits in: a wavy band from `y` down to `yb`. */
function sea(d: Pen, y: number, x0 = 7, x1 = 93, yb = 92) {
  const n = 6;
  const s = (x1 - x0) / n;
  let p = `M${x0} ${y}`;
  for (let i = 0; i < n; i++) {
    const a = x0 + i * s;
    p += ` Q${n2(a + s / 4)} ${y - 3.5} ${n2(a + s / 2)} ${y} Q${n2(a + (3 * s) / 4)} ${y + 3.5} ${n2(a + s)} ${y}`;
  }
  p += ` V${yb - 5} Q${x1} ${yb} ${x1 - 5} ${yb} H${x0 + 5} Q${x0} ${yb} ${x0} ${yb - 5} Z`;
  d.path(p, d.fill(P.sky, "v"), { sw: 3 });
  d.stroke(`M${x0 + 10} ${y + 5.5} q4 -2.5 8 0 M${x0 + 48} ${y + 6} q4 -2.5 8 0`, { color: "#ffffff", sw: 2, op: 0.85 });
}

/** A little scene in a rounded-square window (landscapes): sky, clipped contents, frame. */
function scene(d: Pen, sky: string, fn: (d: Pen) => void) {
  const box = rr(8, 8, 84, 84, 18);
  d.path(box, sky, { stroke: null });
  d.clip(box, fn);
  d.path(box, "none", { sw: 3.5 });
}

/** A point on a quadratic curve and the unit normal there (for marks along a trunk or road). */
function qAt(t: number, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number) {
  const u = 1 - t;
  const x = u * u * x0 + 2 * u * t * x1 + t * t * x2;
  const y = u * u * y0 + 2 * u * t * y1 + t * t * y2;
  const dx = 2 * u * (x1 - x0) + 2 * t * (x2 - x1);
  const dy = 2 * u * (y1 - y0) + 2 * t * (y2 - y1);
  const l = Math.hypot(dx, dy) || 1;
  return { x, y, nx: -dy / l, ny: dx / l };
}

/** A drooping palm frond from (x, y): `deg` is where it points (0 = right); `flip` mirrors it left. */
function frond(d: Pen, x: number, y: number, len: number, deg: number, flip = false, ramp: Ramp = P.green) {
  const L = len;
  const tf = `translate(${x} ${y})${flip ? " scale(-1 1)" : ""} rotate(${deg})`;
  d.path(`M0 0 Q${n2(L * 0.38)} ${n2(-L * 0.58)} ${L} ${n2(L * 0.32)} Q${n2(L * 0.58)} ${n2(L * 0.12)} 0 0 Z`, d.fill(ramp, "v"), { sw: 2.6, tf });
  d.stroke(`M3 -2 Q${n2(L * 0.44)} ${n2(-L * 0.3)} ${n2(L * 0.88)} ${n2(L * 0.25)}`, { color: ramp[2], sw: 1.5, tf });
}

/** A fat crescent moon (horns to the right) centered near (cx, cy). */
function crescent(cx: number, cy: number, r: number) {
  const tx = n2(cx + r * 0.5);
  const t1 = n2(cy - r * 0.866);
  const t2 = n2(cy + r * 0.866);
  return `M${tx} ${t1} A${r} ${r} 0 1 0 ${tx} ${t2} A${n2(r * 1.12)} ${n2(r * 1.12)} 0 0 1 ${tx} ${t1} Z`;
}

/** A little front-view house: walls from (x, y) down to the ground at 90, a pitched roof, a door
 *  (left, right or center) and a window beside it (none when the door is centered). */
function cottage(d: Pen, x: number, y: number, w: number, wall: Ramp, roof: Ramp, door: "l" | "r" | "c" = "r") {
  const rise = w * 0.52;
  d.rect(x, y, w, 90 - y, 0, d.fill(wall, "v"), { sw: 3 });
  d.path(`M${x - 4} ${y + 2} L${x + w / 2} ${n2(y - rise)} L${x + w + 4} ${y + 2} Q${x + w + 4} ${y + 6} ${x + w} ${y + 6} L${x} ${y + 6} Q${x - 4} ${y + 6} ${x - 4} ${y + 2} Z`, d.fill(roof, "v"), { sw: 3 });
  const dw = w * 0.26;
  const dx = door === "l" ? x + w * 0.16 : door === "r" ? x + w * 0.58 : x + (w - dw) / 2;
  d.path(`M${n2(dx)} 90 V${n2(90 - dw * 1.5)} Q${n2(dx)} ${n2(90 - dw * 2)} ${n2(dx + dw / 2)} ${n2(90 - dw * 2)} Q${n2(dx + dw)} ${n2(90 - dw * 2)} ${n2(dx + dw)} ${n2(90 - dw * 1.5)} V90 Z`, d.fill(P.wood, "v"), { sw: 2.4 });
  if (door === "c") return;
  const wx = door === "l" ? x + w * 0.58 : x + w * 0.14;
  const ws = w * 0.28;
  const wy = y + 12;
  d.rect(wx, wy, ws, ws, 1.8, d.fill(P.sky, "d"), { sw: 2.2 });
  d.stroke(`M${n2(wx + ws / 2)} ${wy} V${n2(wy + ws)} M${n2(wx)} ${n2(wy + ws / 2)} H${n2(wx + ws)}`, { sw: 1.6 });
}

/** A pine tree standing on (x, y), `h` tall. */
function pine(d: Pen, x: number, y: number, h: number, ramp: Ramp = P.forest, sw = 2.4) {
  const w = h * 0.4;
  d.rect(x - h * 0.06, y - h * 0.2, h * 0.12, h * 0.2, 1, P.wood[1], { sw: sw - 0.4 });
  const t = y - h;
  const m = y - h * 0.56;
  const b = y - h * 0.16;
  d.poly([x, t, x + w * 0.6, m, x + w * 0.3, m, x + w, b, x - w, b, x - w * 0.3, m, x - w * 0.6, m], d.fill(ramp, "h"), { sw });
}

export const PLACES: PicDef[] = [
  [
    "🏠",
    "house",
    (d) => {
      d.shadow(50, 92, 40);
      d.rect(63, 16, 11, 22, 2, d.fill(P.coral, "h"), { sw: 3 });
      d.path("M19 48 L81 48 L81 91 L19 91 Z", d.fill(P.cream, "v"), { sw: 3.5 });
      d.path("M9 53 L50 13 L91 53 Q91 58 86 58 L14 58 Q9 58 9 53 Z", d.fill(P.red, "v"), { sw: 3.5 });
      d.path("M42 91 V69 Q42 61 50 61 Q58 61 58 69 V91 Z", d.fill(P.wood, "v"), { sw: 3 });
      d.circle(54.5, 77, 1.9, OL, { stroke: null });
      for (const x of [24, 63]) {
        d.rect(x, 64, 13, 13, 2.5, d.fill(P.sky, "d"), { sw: 2.6 });
        d.stroke(`M${x + 6.5} 64 V77 M${x} 70.5 H${x + 13}`, { sw: 2 });
      }
      d.shine(30, 40, 10, 3, 0.4, -40);
    },
  ],
  [
    "⛵",
    "sailboat",
    (d) => {
      // The big mainsail (with a Harbor coral stripe) behind the mast, the jib in front.
      const main = "M48 12 Q25 31 13 56 L48 56 Z";
      d.path(main, d.fill(P.white, "d"), { sw: 3 });
      d.clip(main, (c) => c.path("M6 42 H52 V48 H6 Z", c.fill(P.coral, "h"), { stroke: null }));
      d.path(main, "none", { sw: 3 });
      const jib = "M52 19 Q77 36 87 57 L52 57 Z";
      d.path(jib, d.fill(P.white, "d"), { sw: 3 });
      d.stroke("M55 30 Q66 37 72 46", { color: P.white[2], sw: 1.8 });
      d.tube("M50 11 V61", P.wood[1], 4, 2.5);
      d.path("M52 11 L66 14.5 L52 18 Z", d.fill(P.red, "h"), { sw: 2.2 });
      d.tube("M12 58 H50", P.wood[1], 3.4, 2.4);
      // Hull with a cream stripe and portholes.
      const hull = "M7 59 Q50 66 93 57 Q89 76 73 84 L27 84 Q11 79 7 59 Z";
      d.path(hull, d.fill(P.coral, "v"), { sw: 3.5 });
      d.clip(hull, (c) => c.path("M5 64 Q50 71 95 62 L95 66.5 Q50 75.5 5 68.5 Z", P.cream[1], { stroke: null }));
      d.path(hull, "none", { sw: 3.5 });
      for (const x of [36, 50, 64]) d.circle(x, 76.5, 2.5, d.fill(P.sky, "d"), { sw: 2 });
      d.shine(22, 62.5, 7, 1.6, 0.6, 6);
      sea(d, 84);
    },
  ],
  [
    "🚗",
    "car",
    (d) => {
      d.shadow(50, 86, 42);
      d.path("M7 70 Q7 56 20 54 L28 52 L36 36 Q40 30 48 30 L66 30 Q74 30 78 38 L85 52 Q94 54 94 66 L94 72 Q94 77 89 77 L12 77 Q7 77 7 70 Z", d.fill(P.red, "v"), { sw: 3.5 });
      d.path("M38 52 L44 38 Q46 35 50 35 L56 35 L56 52 Z", d.fill(P.sky, "d"), { sw: 2.6 });
      d.path("M61 52 L61 35 L66 35 Q71 35 73 39 L79 52 Z", d.fill(P.sky, "d"), { sw: 2.6 });
      d.stroke("M58 55 V73", { sw: 2, color: P.red[2] });
      d.stroke("M48 59 H53", { sw: 2.4 });
      for (const x of [27, 74]) {
        d.circle(x, 77, 11.5, d.fill(P.black), { sw: 3 });
        d.circle(x, 77, 4.8, d.fill(P.silver), { sw: 2 });
      }
      d.ellipse(91, 62, 3, 4, d.fill(P.gold), { sw: 2 });
      d.rect(8, 60, 5, 6, 2, d.fill(P.orange), { sw: 2 });
      d.shine(30, 59, 10, 3, 0.5, -4);
    },
  ],
  [
    "🏝️",
    "desert island",
    (d) => {
      d.ellipse(50, 79, 44, 12.5, d.fill(P.sky, "v"), { sw: 3 });
      d.stroke("M11 80 q4 -3 8 0 M77 87 q4 -3 8 0 M80 73 q3 -2.4 6 0", { color: "#ffffff", sw: 2.2, op: 0.85 });
      d.path("M19 80 Q21 64 50 63 Q79 64 81 80 Q50 86 19 80 Z", d.fill(P.sand), { sw: 3 });
      d.shine(34, 68.5, 8, 2.2, 0.7, -6);
      // A curved, ringed palm trunk.
      d.tube("M57 76 Q59 50 46 30", P.wood[1], 7, 3);
      for (const t of [0.18, 0.36, 0.54, 0.72]) {
        const p = qAt(t, 57, 76, 59, 50, 46, 30);
        d.line(p.x - p.nx * 4.2, p.y - p.ny * 4.2, p.x + p.nx * 4.2, p.y + p.ny * 4.2, { color: P.wood[2], sw: 1.8 });
      }
      frond(d, 46, 30, 21, 52, true);
      frond(d, 46, 30, 21, 50);
      frond(d, 46, 30, 28, 12, true);
      frond(d, 46, 30, 28, 10);
      frond(d, 46, 30, 30, -30, true);
      frond(d, 46, 30, 30, -32);
      for (const [x, y] of [[42, 34], [49.5, 34.5], [45.5, 38]]) d.ball(x, y, 3.6, P.brown, { sw: 2.2 });
    },
  ],
  [
    "🏜️",
    "desert",
    (d) => {
      scene(d, d.lin([[0, "#9fdcff"], [1, "#fff1c9"]]), (c) => {
        c.glow(68, 29, 22, "#ffe066", 0.6);
        c.ball(68, 29, 10, P.gold, { sw: 3 });
        c.path("M4 62 Q24 46 46 54 Q70 38 96 50 V96 H4 Z", c.fill(P.orange, "v"), { sw: 3 });
        c.stroke("M58 52 Q66 48 74 50", { color: P.orange[0], sw: 2, op: 0.8 });
        // A saguaro cactus, half buried in the front dune.
        c.tube("M31 62 H25 Q21.5 62 21.5 58.5 V50", P.green[1], 7.5, 3);
        c.tube("M40 55 H45 Q48.5 55 48.5 51.5 V42", P.green[1], 7.5, 3);
        c.path(rr(28.5, 33, 13, 48, 6.5), c.fill(P.green, "h"), { sw: 3 });
        c.stroke("M35 39 V74", { color: P.green[2], sw: 1.6 });
        c.shine(32, 40, 1.6, 4.5, 0.6, 0);
        c.path("M4 76 Q30 62 58 72 Q78 79 96 68 V96 H4 Z", c.fill(P.sand, "v"), { sw: 3 });
        c.stroke("M62 82 Q70 79 78 82 M22 86 Q30 83 38 86", { color: P.sand[2], sw: 1.8 });
      });
    },
  ],
  [
    "🏖️",
    "beach",
    (d) => {
      scene(d, d.lin([[0, "#8fd3ff"], [1, "#dff5ff"]]), (c) => {
        c.path("M14 24 Q14 18 20 18 Q22 13 28 14 Q33 12 35 18 Q40 18 40 23 Q40 26 36 26 H17 Q14 26 14 24 Z", "#ffffff", { sw: 2.2 });
        c.path("M4 44 H96 V96 H4 Z", c.fill(P.blue, "v"), { sw: 2.6 });
        c.stroke("M14 52 q4 -3 8 0 M66 49 q4 -3 8 0 M44 56 q4 -3 8 0", { color: "#ffffff", sw: 2, op: 0.8 });
        // The pole goes in before the sand so it looks planted.
        c.g("translate(52 26) rotate(-12)", (u) => u.tube("M0 0 V56", P.white[1], 3.4, 2.2));
        c.path("M4 66 Q28 56 52 62 Q76 68 96 58 V96 H4 Z", c.fill(P.sand, "v"), { sw: 3 });
        c.stroke("M4 66 Q28 56 52 62 Q76 68 96 58", { color: "#ffffff", sw: 2, op: 0.7, tf: "translate(0 -3)" });
        c.g("translate(52 26) rotate(-12)", (u) => {
          const can = "M-31 15 C-30 -10 30 -10 31 15 Q24.8 10.5 18.6 15 Q12.4 10.5 6.2 15 Q0 10.5 -6.2 15 Q-12.4 10.5 -18.6 15 Q-24.8 10.5 -31 15 Z";
          u.path(can, "#ffffff", { sw: 3 });
          u.clip(can, (k) => {
            k.poly([0, -4, -57, 32, -34, 32], k.fill(P.red, "v"), { stroke: null });
            k.poly([0, -4, -11.5, 32, 11.5, 32], k.fill(P.red, "v"), { stroke: null });
            k.poly([0, -4, 34, 32, 57, 32], k.fill(P.red, "v"), { stroke: null });
          });
          u.path(can, "none", { sw: 3 });
          u.circle(0, -4.5, 2.6, P.red[1], { sw: 2 });
          u.shine(-14, 2, 6, 2, 0.55, -30);
        });
        const ball = circlePath(27, 79, 7.5);
        c.path(ball, "#ffffff", { sw: 2.5 });
        c.clip(ball, (k) => {
          k.ellipse(19.5, 79, 4.5, 10, P.blue[1], { stroke: null });
          k.ellipse(34.5, 79, 4.5, 10, P.gold[1], { stroke: null });
          k.ellipse(27, 79, 2.2, 10, P.red[1], { stroke: null });
        });
        c.path(ball, "none", { sw: 2.5 });
        c.shine(24.5, 75.5, 2.4, 1.4, 0.8, -30);
      });
    },
  ],
  [
    "⛰️",
    "mountain",
    (d) => {
      d.shadow(50, 89, 42);
      const back = "M46 88 L68 34 Q70 29 72 34 L93 88 Z";
      d.path(back, d.fill(P.steel, "h"), { sw: 3.5 });
      d.clip(back, (c) => c.path("M70 31 L74 44 L70 56 L76 70 L72 92 L100 92 L100 20 Z", P.steel[2], { stroke: null, op: 0.35 }));
      d.path(back, "none", { sw: 3.5 });
      const front = "M7 88 L38 18 Q40 13 42 18 L76 88 Z";
      d.path(front, d.fill(P.stone, "h"), { sw: 3.5 });
      d.clip(front, (c) => c.path("M40 16 L45 32 L40 46 L47 62 L43 92 L90 92 L90 0 Z", P.stone[2], { stroke: null, op: 0.4 }));
      d.stroke("M40 16 L45 32 L40 46 L47 62 L43 80", { color: P.stone[2], sw: 2 });
      d.path(front, "none", { sw: 3.5 });
      d.path("M7 88 Q9 78 18 79 Q26 72 36 79 Q46 74 56 80 Q66 74 76 79 Q86 76 93 84 L93 88 Q93 90 91 90 L9 90 Q7 90 7 88 Z", d.fill(P.green, "v"), { sw: 3 });
      d.shine(31, 40, 2.6, 9, 0.45, 24);
    },
  ],
  [
    "🚲",
    "bicycle",
    (d) => {
      d.shadow(50, 90, 42);
      for (const x of [28, 72]) {
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4 + 0.2;
          d.line(x, 68, x + Math.cos(a) * 13, 68 + Math.sin(a) * 13, { color: P.steel[1], sw: 1.4 });
        }
        d.tube(circlePath(x, 68, 15.5), P.black[1], 5.5, 2.4);
        d.circle(x, 68, 3, d.fill(P.silver), { sw: 2 });
      }
      d.tube("M28 68 L48 68 L41 45 Z M41 45 L66 44 L48 68 M66 44 L72 68", P.teal[1], 4.5, 2.4);
      d.tube("M41 45 L39.5 38", P.steel[1], 3, 2);
      d.path("M30 37 Q38 32 47 35 Q48 39 42 40 L33 40 Q29 39 30 37 Z", d.fill(P.black), { sw: 2.4 });
      d.tube("M66 44 L64 35 Q63 31 58 31", P.steel[1], 3.2, 2.2);
      d.tube("M58 31 L54 31", P.black[1], 4.5, 2.2);
      d.circle(48, 68, 5, d.fill(P.silver), { sw: 2.2 });
      d.tube("M48 68 L52 77", P.steel[2], 2.6, 2);
      d.rect(48.5, 76, 8, 3.4, 1.2, P.black[1], { sw: 2 });
      d.shine(52, 43.5, 6, 1, 0.6, -2);
    },
  ],
  [
    "🚢",
    "ship",
    (d) => {
      for (const x of [38, 55]) {
        d.path(`M${x} 32 L${x + 1.5} 13 L${x + 12.5} 13 L${x + 14} 32 Z`, d.fill(P.red, "h"), { sw: 3 });
        d.path(`M${x + 1.5} 13 L${x + 12.5} 13 L${x + 12.9} 18 L${x + 1.1} 18 Z`, d.fill(P.black, "v"), { sw: 2.4 });
      }
      d.rect(29, 30, 46, 13, 3, d.fill(P.white, "v"), { sw: 3 });
      for (let i = 0; i < 5; i++) pane(d, 33 + i * 8.4, 33.5, 5, 6, 1.5, 2);
      d.rect(17, 42, 66, 13, 3, d.fill(P.white, "v"), { sw: 3 });
      for (let i = 0; i < 7; i++) pane(d, 21 + i * 8.6, 45.5, 5, 6, 1.5, 2);
      const hull = "M7 54 L93 52 Q89 68 81 80 L19 80 Q11 70 7 54 Z";
      d.path(hull, d.fill(P.navy, "v"), { sw: 3.5 });
      d.clip(hull, (c) => {
        c.path("M0 59 L100 57 V61 L0 63 Z", "#ffffff", { stroke: null, op: 0.95 });
        c.path("M0 72 H100 V96 H0 Z", c.fill(P.red, "v"), { sw: 2.5 });
      });
      d.path(hull, "none", { sw: 3.5 });
      for (const x of [26, 38, 50, 62, 74]) d.circle(x, 67, 2.4, d.fill(P.sky, "d"), { sw: 1.8 });
      d.shine(20, 56, 8, 1.4, 0.5, -2);
      sea(d, 82);
    },
  ],
  [
    "🏞️",
    "river valley",
    (d) => {
      scene(d, d.lin([[0, "#9fdcff"], [1, "#e4f6ff"]]), (c) => {
        c.path("M4 54 L24 29 Q27 25 30 29 L43 45 L59 23 Q62 19 65 23 L96 60 V96 H4 Z", c.fill(P.steel, "v"), { sw: 2.6 });
        c.path("M21 33 L24 29 Q27 25 30 29 L33 33 L29 32 L26.5 35 L24 32 Z M56 27 L59 23 Q62 19 65 23 L68 27 L64 26 L61.5 29.5 L59 26 Z", "#ffffff", { sw: 2 });
        c.path("M4 57 Q26 47 50 53 Q74 59 96 51 V96 H4 Z", c.fill(P.green, "v"), { sw: 3 });
        c.path(smooth([[50, 53], [49, 60], [37, 70], [38, 82], [32, 98], [78, 98], [64, 82], [53, 70], [59, 60], [56, 53]], 0.18), c.fill(P.sky, "v"), { sw: 2.6 });
        c.stroke("M44 76 q3 -2 6 0 M50 88 q4 -2.4 8 0", { color: "#ffffff", sw: 2, op: 0.85 });
        pine(c, 19, 76, 24);
        pine(c, 11, 66, 15);
        pine(c, 80, 72, 22);
        pine(c, 89, 82, 16);
      });
    },
  ],
  [
    "🏗️",
    "building crane",
    (d) => {
      d.shadow(48, 90, 40);
      // A little building going up.
      d.rect(54, 66, 34, 23, 2, d.fill(P.coral, "v"), { sw: 3 });
      d.stroke("M54 74 H88 M54 81.5 H88", { color: P.coral[2], sw: 1.8 });
      for (const x of [59, 70, 81]) d.stroke(`M${x} 66 V74 M${x + 5} 74 V81.5 M${x} 81.5 V89`, { color: P.coral[2], sw: 1.6 });
      // Mast, jib, counterweight and cab.
      d.rect(21, 25, 13, 63, 2, d.fill(P.gold, "h"), { sw: 3 });
      d.stroke("M21 25 L34 36 L21 47 L34 58 L21 69 L34 80 L21 88", { sw: 2 });
      d.poly([22, 22, 27.5, 9, 33, 22], d.fill(P.gold, "v"), { sw: 2.6 });
      d.stroke("M27.5 10 L88 21 M27.5 10 L12 20", { sw: 1.8 });
      d.rect(9, 20, 83, 7, 2, d.fill(P.gold, "v"), { sw: 3 });
      d.stroke("M36 27 L41 20 L46 27 L51 20 L56 27 L61 20 L66 27 L71 20 L76 27 L81 20 L86 27", { sw: 1.7 });
      d.rect(9, 27, 11, 9, 2, d.fill(P.stone, "v"), { sw: 2.6 });
      d.rect(34, 27, 11, 10, 2, d.fill(P.gold, "v"), { sw: 2.6 });
      pane(d, 37, 29.5, 6, 5, 1.2, 1.8);
      // Cable, hook and a hanging beam.
      d.rect(68, 26, 10, 4, 1.5, P.steel[2], { sw: 2 });
      d.line(73, 30, 73, 47, { sw: 2 });
      d.stroke("M73 47 V51 Q73 55 77 55 Q80 55 80 52", { sw: 2.8 });
      d.stroke("M73 51 L62 57 M73 51 L84 57", { sw: 1.8 });
      d.rect(57, 56, 32, 6.5, 1.6, d.fill(P.orange, "v"), { sw: 2.6 });
      d.shine(25, 34, 1.4, 6, 0.6, 0);
    },
  ],
  [
    "⛺",
    "tent",
    (d) => {
      d.shadow(50, 88, 42);
      d.path("M44 19 L79 25 Q83 26 84 30 L90 81 L75 86 Z", d.lin([[0, P.orange[1]], [1, P.orange[2]]], 0, 0, 1, 0), { sw: 3.5 });
      d.stroke("M51 36 L82 41 M58 54 L86 58", { color: P.orange[2], sw: 1.8, op: 0.6 });
      d.tube("M44 19 V10", P.wood[1], 2.6, 2);
      d.path("M45.5 10 L56 13 L45.5 16 Z", d.fill(P.red, "h"), { sw: 2 });
      d.path("M44 18 L75 86 L11 86 Z", d.fill(P.orange, "v"), { sw: 3.5 });
      d.path("M44 38 L56 86 L32 86 Z", d.fill(P.ink, "v"), { sw: 2.6 });
      d.path("M44 38 L32 86 L25 86 Q34 66 44 38 Z", d.fill(P.gold, "v"), { sw: 2.2 });
      d.path("M44 38 L56 86 L63 86 Q54 66 44 38 Z", d.fill(P.gold, "v"), { sw: 2.2 });
      d.stroke("M11 86 L7.5 90 M90 81 L93.5 85", { sw: 2.6 });
      d.shine(31, 54, 2.6, 10, 0.5, 24);
    },
  ],
  [
    "🚀",
    "rocket",
    (d) => {
      d.path("M41 71 Q37 80 50 90.5 Q63 80 59 71 Z", d.lin([[0, "#fff3a8"], [0.45, "#ffb347"], [1, "#ff6a3d"]]), { sw: 3 });
      d.path("M45 72 Q44 79 50 85 Q56 79 55 72 Z", "#fffbe0", { stroke: null });
      d.path("M35 49 Q21 55 20 75 Q28 69 37 69 Z", d.fill(P.red, "v"), { sw: 3 });
      d.path("M65 49 Q79 55 80 75 Q72 69 63 69 Z", d.fill(P.red, "v"), { sw: 3 });
      d.path("M40 67 L60 67 L58 75 L42 75 Z", d.fill(P.steel, "v"), { sw: 2.6 });
      const body = "M50 9 Q69 23 67 51 Q66 61 63 69 L37 69 Q34 61 33 51 Q31 23 50 9 Z";
      d.path(body, d.fill(P.white, "h"), { sw: 3.5 });
      d.clip(body, (c) => c.path("M20 0 H80 V24 Q50 30 20 24 Z", c.fill(P.red, "v"), { sw: 2.6 }));
      d.path(body, "none", { sw: 3.5 });
      d.circle(50, 41, 9, d.fill(P.silver), { sw: 3 });
      d.circle(50, 41, 5.6, d.fill(P.sky, "d"), { sw: 2 });
      d.shine(47.6, 38.6, 2, 1.2, 0.85, -30);
      d.path("M50 55 Q53.5 62 53 71 L47 71 Q46.5 62 50 55 Z", d.fill(P.red, "h"), { sw: 2.6 });
      d.shine(40, 30, 2.4, 8, 0.6, 18);
    },
  ],
  [
    "🏔️",
    "snowy mountain",
    (d) => {
      d.shadow(50, 89, 42);
      const back = "M7 88 L28 41 Q30 37 32 41 L56 88 Z";
      d.path(back, d.fill(P.steel, "h"), { sw: 3 });
      d.clip(back, (c) => c.path("M16 62 L21 58 L26 63 L31 57 L36 62 L42 58 L42 20 L16 20 Z", c.fill(P.white, "v"), { sw: 2.4 }));
      d.path(back, "none", { sw: 3 });
      const big = "M18 88 L52 14 Q54 10 56 14 L92 88 Z";
      d.path(big, d.lin([[0, P.navy[0]], [1, P.navy[1]]], 0, 0, 1, 0), { sw: 3.5 });
      d.clip(big, (c) => {
        c.path("M54 12 L58 32 L54 50 L61 68 L57 92 L100 92 L100 0 Z", P.navy[2], { stroke: null, op: 0.3 });
        c.path("M26 52 L34 47 L41 54 L49 45 L56 55 L64 47 L72 53 L82 46 L82 0 L26 0 Z", c.fill(P.white, "v"), { sw: 2.6 });
      });
      d.path(big, "none", { sw: 3.5 });
      d.shine(46, 27, 2.4, 8, 0.8, 25);
    },
  ],
  [
    "🏛️",
    "temple",
    (d) => {
      d.shadow(50, 91, 44);
      d.rect(8, 81, 84, 9, 2.5, d.fill(P.cream, "v"), { sw: 3 });
      d.rect(13, 74, 74, 8, 2, d.fill(P.cream, "v"), { sw: 3 });
      d.rect(18, 41, 64, 34, 0, d.fill(P.tan, "v"), { sw: 3 });
      for (const x of [25, 37.5, 50, 62.5, 75]) {
        d.rect(x - 4, 43, 8, 30, 1, d.fill(P.cream, "h"), { sw: 2.6 });
        d.stroke(`M${x - 1.4} 46.5 V70 M${x + 1.4} 46.5 V70`, { color: P.tan[2], sw: 1.2 });
        d.rect(x - 6, 40.5, 12, 4, 1.2, P.cream[1], { sw: 2.2 });
        d.rect(x - 5.5, 71, 11, 4, 1.2, P.cream[1], { sw: 2.2 });
      }
      d.rect(11, 32, 78, 9.5, 2, d.fill(P.cream, "v"), { sw: 3 });
      d.path("M8 33.5 L50 11 L92 33.5 Z", d.fill(P.cream, "v"), { sw: 3.5 });
      d.path("M23 30 L50 16.5 L77 30 Z", P.tan[1], { sw: 2 });
      d.circle(50, 24.5, 3.4, d.fill(P.gold), { sw: 2 });
      d.shine(31, 23.5, 8, 1.8, 0.8, -28);
    },
  ],
  [
    "🚚",
    "delivery truck",
    (d) => {
      d.shadow(50, 87, 43);
      d.rect(10, 68, 76, 7, 2, P.ink[1], { sw: 2.5 });
      const box = rr(7, 22, 56, 49, 5);
      d.path(box, d.fill(P.white, "v"), { sw: 3.5 });
      d.clip(box, (c) => c.rect(0, 52, 70, 7, 0, c.fill(P.orange, "h"), { stroke: null }));
      d.path(box, "none", { sw: 3.5 });
      d.stroke("M35 27 V48 M35 62 V66", { color: P.white[2], sw: 2 });
      d.path("M62 75 V38 Q62 33 67 33 L78 33 Q83 33 85.5 37.5 L92 52 Q94 55 94 60 V70 Q94 76 88 76 H62 Z", d.fill(P.orange, "v"), { sw: 3.5 });
      d.path("M68 52 V41 Q68 38.5 70.5 38.5 L77.5 38.5 Q80.5 38.5 81.5 41 L86.5 52 Z", d.fill(P.sky, "d"), { sw: 2.6 });
      d.stroke("M68 59 H73", { sw: 2.4 });
      wheel(d, 25, 76, 10.5);
      wheel(d, 78, 76, 10.5);
      d.ellipse(92, 63, 2.4, 3.4, d.fill(P.gold), { sw: 2 });
      d.shine(18, 29.5, 9, 2, 0.8, -4);
    },
  ],
  [
    "🌉",
    "bridge",
    (d) => {
      scene(d, d.lin([[0, "#26306e"], [1, "#6f62c9"]]), (c) => {
        for (const [x, y, s] of [[18, 20, 3.4], [84, 17, 2.8], [82, 36, 2.2], [16, 40, 2.4], [35, 14, 2]]) c.path(sparklePath(x, y, s), "#fff6c2", { stroke: null });
        c.path(crescent(50, 25, 8), d.fill(P.lemon), { sw: 2.2 });
        c.path("M4 64 H96 V96 H4 Z", c.fill(P.blue, "v"), { sw: 2.6 });
        c.stroke("M14 72 H26 M60 75 H72 M34 82 H44 M76 86 H86", { color: P.gold[1], sw: 2, op: 0.75 });
        for (const x of [30, 70]) {
          c.rect(x - 3.5, 22, 7, 46, 1.5, c.fill(P.red, "h"), { sw: 2.6 });
          c.stroke(`M${x - 3.5} 32 H${x + 3.5} M${x - 3.5} 44 H${x + 3.5}`, { sw: 2 });
        }
        c.stroke("M36 37 V58 M42 46 V58 M50 50 V58 M58 46 V58 M64 37 V58 M14 51.5 V58 M22 42.5 V58 M78 42.5 V58 M86 51.5 V58", { color: P.red[0], sw: 1.4 });
        c.tube("M4 56 Q22 52 30 23 Q50 77 70 23 Q78 52 96 56", P.red[1], 2.4, 1.6);
        c.rect(2, 57, 96, 6, 1, c.fill(P.red, "v"), { sw: 2.6 });
        for (let x = 10; x < 95; x += 10) c.circle(x, 60, 1.1, P.lemon[0], { stroke: null });
      });
    },
  ],
  [
    "🏡",
    "house with garden",
    (d) => {
      d.shadow(50, 91, 44);
      d.path("M8 86 Q8 79 15 79 H85 Q92 79 92 86 V88 Q92 91 89 91 H11 Q8 91 8 88 Z", d.fill(P.green, "v"), { sw: 3 });
      d.tube("M78 82 V58", P.wood[1], 5.5, 2.6);
      d.path(lumpy(78, 44, 15, 17, 11, 0.09, 7), d.fill(P.green), { sw: 3 });
      d.path(lumpy(73, 37, 6, 4.5, 7, 0.12, 3), P.lime[0], { stroke: null, op: 0.5 });
      d.rect(47, 19, 8, 16, 1.5, d.fill(P.coral, "h"), { sw: 2.6 });
      d.rect(13, 48, 50, 34, 0, d.fill(P.lemon, "v"), { sw: 3.5 });
      d.path("M7 52 L38 21 L69 52 Q69 56 65 56 L11 56 Q7 56 7 52 Z", d.fill(P.blue, "v"), { sw: 3.5 });
      d.path("M32 82 V68 Q32 62 38 62 Q44 62 44 68 V82 Z", d.fill(P.wood, "v"), { sw: 2.8 });
      d.circle(41, 73, 1.5, OL, { stroke: null });
      for (const x of [17, 49]) {
        pane(d, x, 62, 10, 10, 2, 2.4);
        d.stroke(`M${x + 5} 62 V72 M${x} 67 H${x + 10}`, { sw: 1.8 });
      }
      d.path("M33 82 H43 L47 91 H29 Z", d.fill(P.sand, "v"), { sw: 2.4 });
      d.tube("M11 83 H27 M50 83 H89", P.white[1], 2.6, 2);
      for (const x of [13, 20.5, 28, 51.5, 59, 66.5, 74, 81.5, 89]) d.path(`M${x - 2.8} 89.5 V78.5 L${x} 75 L${x + 2.8} 78.5 V89.5 Z`, d.fill(P.white, "v"), { sw: 2 });
      d.shine(26, 41, 8, 2.2, 0.5, -45);
    },
  ],
  [
    "✈️",
    "airplane",
    (d) => {
      d.g("rotate(-10 50 54)", (g) => {
        g.path("M53 47 L64 47 L76 32 Q77 30 75 30 L70 30 Z", g.fill(P.blue, "v"), { sw: 2.6 });
        g.path("M15 49 L11 25 Q10.5 21 14.5 21 L19 21 Q22 21 24 24 L37 46 Z", g.fill(P.blue, "v"), { sw: 3 });
        const body = "M10 53.5 Q10 45 20 45 L76 45 Q90 45 94 53.5 Q93 62 80 62 L20 62 Q10 62 10 53.5 Z";
        g.path(body, g.fill(P.white, "v"), { sw: 3.5 });
        g.clip(body, (c) => c.path("M0 55.5 H100 V58.5 H0 Z", P.blue[1], { stroke: null }));
        g.path(body, "none", { sw: 3.5 });
        for (let i = 0; i < 6; i++) g.circle(32 + i * 7.5, 51, 2.1, g.fill(P.sky, "d"), { sw: 1.6 });
        g.path("M80 48.5 L86 48.5 Q89.5 49.5 91 52.5 L81 52.5 Z", g.fill(P.sky, "d"), { sw: 2 });
        g.path("M42 57 L61 57 L45 83 Q44 85 41 85 L35 85 Q33 85 34 83 Z", g.fill(P.blue, "v"), { sw: 3 });
        g.rect(46, 64, 13, 7.5, 3.75, g.fill(P.silver, "v"), { sw: 2.4 });
        g.path("M13 56 L27 56 L20 67 Q19 68 17 68 L13 68 Z", g.fill(P.blue, "v"), { sw: 2.6 });
        g.shine(26, 48, 10, 1.6, 0.85, 0);
      });
    },
  ],
  [
    "🏫",
    "school",
    (d) => {
      d.shadow(50, 91, 44);
      d.rect(6, 47, 88, 6, 2, d.fill(P.stone, "v"), { sw: 3 });
      d.rect(9, 52, 82, 38, 0, d.fill(P.red, "v"), { sw: 3.5 });
      for (const x of [14, 26, 65, 77]) {
        for (const y of [57, 71]) {
          pane(d, x, y, 9, 9.5, 1.8, 2.3);
          d.stroke(`M${x + 4.5} ${y} V${y + 9.5}`, { sw: 1.6 });
        }
      }
      d.rect(36, 34, 28, 56, 0, d.fill(P.cream, "v"), { sw: 3.5 });
      d.tube("M50 20 V9", P.steel[1], 2, 1.8);
      d.path("M51 9 L60 11.5 L51 14 Z", d.fill(P.red, "h"), { sw: 1.8 });
      d.path("M32 36 L50 19 L68 36 Q68 38 66 38 L34 38 Q32 38 32 36 Z", d.fill(P.navy, "v"), { sw: 3.5 });
      d.circle(50, 48, 6.5, d.fill(P.white), { sw: 2.6 });
      d.stroke("M50 48 V44 M50 48 L53 49.5", { sw: 1.8 });
      d.path("M42 90 V70 Q42 63 50 63 Q58 63 58 70 V90 Z", d.fill(P.wood, "v"), { sw: 3 });
      d.stroke("M50 64 V90", { sw: 2 });
      d.shine(16, 51.5, 8, 1.2, 0.7, 0);
    },
  ],
  [
    "🚌",
    "bus",
    (d) => {
      d.shadow(50, 87, 44);
      const body = "M6 71 V33 Q6 26 13 26 L76 26 Q81 26 81.5 31 L82.5 45 L89 46 Q94 47 94 53 V71 Q94 77 88 77 H12 Q6 77 6 71 Z";
      d.path(body, d.fill(P.gold, "v"), { sw: 3.5 });
      d.clip(body, (c) => {
        c.rect(0, 55, 100, 2.4, 0, P.ink[1], { stroke: null });
        c.rect(0, 61, 100, 2.4, 0, P.ink[1], { stroke: null });
      });
      d.path(body, "none", { sw: 3.5 });
      for (let i = 0; i < 4; i++) pane(d, 11 + i * 12.5, 32, 9.5, 13, 2, 2.4);
      pane(d, 62, 32, 10, 30, 2, 2.4);
      d.stroke("M67 32 V62", { sw: 1.8 });
      d.path("M76 31.5 L77 45 L81 45 L80.4 33 Q80 31.5 78.5 31.5 Z", d.fill(P.sky, "d"), { sw: 2 });
      wheel(d, 24, 77, 10.5);
      wheel(d, 76, 77, 10.5);
      d.ellipse(92, 57, 2.2, 3.2, d.fill(P.lemon), { sw: 2 });
      d.rect(87.5, 66, 7, 5, 1.6, P.ink[1], { sw: 2 });
      d.shine(16, 29.5, 8, 1.5, 0.85, 0);
    },
  ],
  [
    "🚨",
    "siren light",
    (d) => {
      d.glow(50, 50, 48, "#ff5a6a", 0.5);
      for (const a of [-160, -125, -90, -55, -20]) {
        const r = (a * Math.PI) / 180;
        d.tube(`M${n2(50 + Math.cos(r) * 31)} ${n2(52 + Math.sin(r) * 31)} L${n2(50 + Math.cos(r) * 40)} ${n2(52 + Math.sin(r) * 40)}`, P.gold[1], 4.5, 2.4);
      }
      d.rect(20, 73, 60, 14, 4, d.fill(P.ink, "v"), { sw: 3.5 });
      const dome = "M28 75 V52 Q28 28 50 28 Q72 28 72 52 V75 Z";
      d.path(dome, d.fill(P.red), { sw: 3.5 });
      d.ellipse(50, 57, 8, 11, "#ffe1e1", { stroke: null, op: 0.7 });
      d.rect(25, 69, 50, 7, 2.5, d.fill(P.silver, "v"), { sw: 2.6 });
      d.shine(38, 42, 3.5, 9, 0.65, 20);
    },
  ],
  [
    "🏰",
    "castle",
    (d) => {
      d.shadow(50, 91, 44);
      const wall = "M27 90 V40 H33 V46 H37 V40 H43 V46 H47 V40 H53 V46 H57 V40 H63 V46 H67 V40 H73 V90 Z";
      d.path(wall, d.fill(P.grey, "v"), { sw: 3.5 });
      d.stroke("M30 56 H38 M58 54 H66 M34 66 H42 M60 70 H68", { color: P.grey[2], sw: 1.8 });
      d.path("M40 90 V72 Q40 62 50 62 Q60 62 60 72 V90 Z", d.fill(P.wood, "v"), { sw: 3 });
      d.stroke("M45 64.5 V90 M50 62.5 V90 M55 64.5 V90", { color: P.wood[2], sw: 1.6 });
      d.circle(50, 52, 3.4, d.fill(P.ink), { sw: 2 });
      for (const x of [19, 81]) {
        d.rect(x - 10, 38, 20, 52, 2, d.fill(P.grey, "v"), { sw: 3.5 });
        d.rect(x - 11.5, 33, 23, 7, 2, d.fill(P.grey, "v"), { sw: 3 });
        d.tube(`M${x} 16 V9`, P.steel[1], 1.8, 1.6);
        d.path(`M${x + 1} 9 L${x + 9} 11.5 L${x + 1} 14 Z`, d.fill(P.red, "h"), { sw: 1.8 });
        d.path(`M${x - 12} 34 L${x} 15 L${x + 12} 34 Z`, d.fill(P.blue, "v"), { sw: 3.5 });
        d.path(`M${x - 2.5} 58 V51 Q${x - 2.5} 47.5 ${x} 47.5 Q${x + 2.5} 47.5 ${x + 2.5} 51 V58 Z`, d.fill(P.ink, "v"), { sw: 2 });
        d.stroke(`M${x - 6} 70 H${x + 2} M${x - 2} 78 H${x + 6}`, { color: P.grey[2], sw: 1.8 });
      }
      d.shine(14, 27, 2, 5, 0.6, 30);
      d.shine(13, 46, 1.6, 5, 0.6, 0);
    },
  ],
  [
    "🎢",
    "roller coaster",
    (d) => {
      d.shadow(50, 90, 44);
      for (const [x, y] of [[18.8, 49.5], [31, 28], [43.4, 54], [74, 78]]) d.tube(`M${x} ${y + 3} V88`, P.silver[1], 2.6, 1.8);
      d.stroke("M18.8 62 H31 M31 70 H43.4", { color: P.steel[1], sw: 1.8 });
      const track = "M11 86 C16 66 20 28 31 28 C42 28 44 80 58 80 Q68 80 74 78 Q81 80 89 82";
      d.tube(track, P.red[1], 4.4, 2.6);
      d.tube(circlePath(74, 62, 16), P.red[1], 4.4, 2.6);
      d.stroke(track, { color: P.red[0], sw: 1.2, op: 0.9 });
      d.stroke(circlePath(74, 62, 16), { color: P.red[0], sw: 1.2, op: 0.9 });
      d.g("translate(31 23)", (g) => {
        g.circle(-3.5, -10, 3.2, g.fill(P.tan), { sw: 1.8 });
        g.circle(3.5, -10, 3.2, g.fill(P.brown), { sw: 1.8 });
        g.path("M-9 -1 V-6 Q-9 -8 -7 -8 H6 Q10 -8 11 -4 L11 -1 Z", g.fill(P.blue, "v"), { sw: 2.4 });
      });
      d.shine(19, 50, 1.4, 6, 0.6, 20);
    },
  ],
  [
    "🏙️",
    "city",
    (d) => {
      d.shadow(50, 91, 44);
      const tower = (x: number, y: number, w: number, ramp: Ramp) => {
        d.rect(x, y, w, 90 - y, 2, d.fill(ramp, "h"), { sw: 3 });
        const cols = Math.floor((w - 4) / 6);
        const x0 = x + (w - (cols * 6 - 2.5)) / 2;
        for (let yy = y + 6; yy < 84; yy += 8) for (let i = 0; i < cols; i++) d.rect(x0 + i * 6, yy, 3.5, 4.2, 0.8, ramp[0], { stroke: null, op: 0.95 });
      };
      tower(19, 30, 21, P.sky);
      tower(58, 38, 20, P.teal);
      d.tube("M50 16 V10", P.steel[1], 2, 1.8);
      tower(38, 16, 24, P.blue);
      tower(8, 52, 18, P.cream);
      tower(74, 56, 18, P.lemon);
      d.shine(42, 21, 1.4, 5, 0.7, 0);
    },
  ],
  [
    "🛤️",
    "railway track",
    (d) => {
      scene(d, d.lin([[0, "#9fdcff"], [1, "#e4f6ff"]]), (c) => {
        c.path("M4 44 Q20 32 36 40 Q52 30 68 38 Q82 32 96 40 V96 H4 Z", c.fill(P.forest, "v"), { sw: 2.4 });
        c.path("M4 43 H96 V96 H4 Z", c.fill(P.green, "v"), { sw: 2.6 });
        c.path("M45.5 43 L54.5 43 L88 96 L12 96 Z", c.fill(P.stone, "v"), { sw: 2.4 });
        for (const y of [45.5, 49, 53.5, 59, 66, 74.5, 85]) {
          const g = 1.4 + ((y - 43) / 53) * 24;
          const h = 0.7 + (y - 43) * 0.085;
          c.path(rr(50 - g * 1.38, y - h, g * 2.76, h * 2, h * 0.6), c.fill(P.wood, "v"), { sw: 1 + (y - 43) * 0.035 });
        }
        c.poly([48.2, 43, 49.2, 43, 28.5, 96, 23, 96], c.fill(P.silver, "h"), { sw: 2 });
        c.poly([50.8, 43, 51.8, 43, 77, 96, 71.5, 96], c.fill(P.silver, "h"), { sw: 2 });
      });
    },
  ],
  [
    "🗿",
    "moai statue",
    (d) => {
      d.shadow(50, 91, 38);
      d.path("M12 90 Q14 80 26 80 H74 Q86 80 88 90 Z", d.fill(P.green, "v"), { sw: 3 });
      for (const s of [-1, 1]) d.path(rr(s < 0 ? 23 : 70, 33, 7, 30, 3.5), d.fill(P.stone, "h"), { sw: 3 });
      const head = "M31 84 L29 30 Q29 12 50 12 Q71 12 71 30 L69 84 Z";
      d.path(head, d.fill(P.stone, "h"), { sw: 3.5 });
      d.path("M30 34 Q50 27 70 34 Q70 39 65 40 Q50 35 35 40 Q30 39 30 34 Z", d.fill(P.stone, "v"), { sw: 2.4 });
      d.ellipse(40, 44, 6, 3, P.stone[2], { stroke: null, op: 0.6 });
      d.ellipse(60, 44, 6, 3, P.stone[2], { stroke: null, op: 0.6 });
      d.path("M46.5 39 Q44.5 52 42 59 Q41.5 64 46.5 64 H53.5 Q58.5 64 58 59 Q55.5 52 53.5 39 Z", d.fill(P.stone, "h"), { sw: 2.6 });
      d.path("M40 71 Q50 68 60 71 Q50 74.5 40 71 Z", P.stone[2], { sw: 2.2 });
      d.stroke("M42 79 Q50 82 58 79", { color: P.stone[2], sw: 2 });
      d.shine(37, 20, 6, 2.4, 0.5, -20);
    },
  ],
  [
    "🚧",
    "road barrier",
    (d) => {
      d.shadow(50, 90, 42);
      for (const x of [22, 78]) {
        d.rect(x - 3.5, 28, 7, 58, 1.5, d.fill(P.silver, "h"), { sw: 2.6 });
        d.rect(x - 10, 83, 20, 6, 2.5, d.fill(P.ink, "v"), { sw: 2.6 });
        d.glow(x, 21, 13, "#ffcf6b", 0.7);
        d.ball(x, 21, 6.5, P.orange, { sw: 2.6 });
      }
      for (const [y, h] of [[34, 17], [58, 13]]) {
        const b = rr(8, y, 84, h, 3);
        d.path(b, "#ffffff", { sw: 3 });
        d.clip(b, (c) => {
          for (let x = -12; x < 100; x += 16) c.poly([x, y + h, x + 8, y + h, x + 8 + h, y, x + h, y], c.fill(P.orange, "v"), { stroke: null });
        });
        d.path(b, "none", { sw: 3 });
      }
      d.shine(16, 37.5, 6, 1.3, 0.8, 0);
    },
  ],
  [
    "🏪",
    "shop",
    (d) => {
      d.shadow(50, 91, 44);
      d.rect(12, 30, 76, 60, 0, d.fill(P.cream, "v"), { sw: 3.5 });
      d.rect(9, 15, 82, 16, 3.5, d.fill(P.teal, "v"), { sw: 3.5 });
      d.path(star(50, 23.5, 5.5, 2.6), d.fill(P.gold), { sw: 2 });
      d.shine(20, 19, 7, 1.4, 0.7, 0);
      let aw = "M8 33 H92 V43";
      for (let i = 0; i < 10; i++) {
        const x = 92 - i * 8.4;
        aw += ` Q${n2(x - 4.2)} 49.5 ${n2(x - 8.4)} 43`;
      }
      aw += " Z";
      d.path(aw, "#ffffff", { sw: 3 });
      d.clip(aw, (c) => {
        for (let i = 0; i < 10; i += 2) c.rect(8 + i * 8.4, 30, 8.4, 24, 0, c.fill(P.red, "v"), { stroke: null });
      });
      d.path(aw, "none", { sw: 3 });
      d.rect(17, 54, 37, 28, 2, d.fill(P.sky, "d"), { sw: 3 });
      d.line(17, 72, 54, 72, { sw: 2.2 });
      for (const [x, r] of [[24, P.red], [32, P.orange], [40, P.lime], [47.5, P.gold]] as const) d.ball(x, 68, 3.6, r, { sw: 1.8 });
      d.shine(23, 59, 5, 1.6, 0.7, -30);
      d.rect(61, 52, 21, 38, 2, d.fill(P.wood, "v"), { sw: 3 });
      pane(d, 65, 56, 13, 14, 2, 2.2);
      d.circle(77.5, 74, 1.7, OL, { stroke: null });
      d.rect(14, 82, 41, 5, 1.5, d.fill(P.stone, "v"), { sw: 2.4 });
    },
  ],
  [
    "🌇",
    "sunset",
    (d) => {
      scene(d, d.lin([[0, "#7b5cd6"], [0.5, "#ff7a9a"], [1, "#ffc069"]]), (c) => {
        c.glow(50, 62, 36, "#fff0a0", 0.85);
        c.ball(50, 62, 17, P.gold, { sw: 3 });
        c.stroke("M18 30 H32 M66 24 H82 M72 34 H86", { color: "#ffd0dd", sw: 2.4, op: 0.8 });
        for (const [x, y, w] of [[4, 50, 17], [20, 60, 12], [31, 70, 13], [43, 67, 12], [54, 73, 12], [65, 58, 13], [77, 46, 19]]) {
          c.rect(x, y, w, 96 - y, 1.5, c.fill(P.navy, "v"), { sw: 2.6 });
          for (let yy = y + 5; yy < 90; yy += 7) for (let xx = x + 3; xx + 3 <= x + w - 2; xx += 5) if ((xx * 7 + yy * 3) % 5 < 3) c.rect(xx, yy, 2.6, 3.2, 0.6, P.gold[0], { stroke: null, op: 0.9 });
        }
      });
    },
  ],
  [
    "🛰️",
    "satellite",
    (d) => {
      d.g("rotate(-30 50 52)", (g) => {
        g.line(30, 52, 70, 52, { sw: 3.5 });
        for (const x of [8, 66]) {
          g.rect(x, 42, 26, 20, 2, g.fill(P.blue, "v"), { sw: 3 });
          g.stroke(`M${x + 8.7} 42 V62 M${x + 17.3} 42 V62 M${x} 52 H${x + 26}`, { color: P.sky[0], sw: 1.4, op: 0.85 });
        }
        g.line(50, 39, 50, 31, { sw: 3 });
        g.path("M38 28 Q50 42 62 28 Q50 32 38 28 Z", g.fill(P.silver, "v"), { sw: 2.6 });
        g.line(50, 33, 50, 23, { sw: 2 });
        g.circle(50, 22, 2.4, g.fill(P.red), { sw: 1.8 });
        g.rect(39, 38, 22, 28, 3, g.fill(P.gold, "h"), { sw: 3 });
        g.stroke("M39 47 H61 M39 57 H61", { color: P.gold[2], sw: 1.8 });
        g.shine(44, 42, 1.6, 4, 0.7, 0);
      });
    },
  ],
  [
    "⛽",
    "fuel pump",
    (d) => {
      d.shadow(48, 91, 36);
      d.tube("M64 54 Q64 72 76 70 Q85 68 84 50 Q83 34 76 31 Q70 29 58 31", P.black[1], 4, 2.4);
      d.rect(13, 84, 50, 7, 2.5, d.fill(P.stone, "v"), { sw: 3 });
      d.path(rr(16, 13, 44, 73, 7), d.fill(P.red, "v"), { sw: 3.5 });
      d.rect(22, 21, 32, 20, 3, d.fill(P.white, "v"), { sw: 2.6 });
      d.rect(26, 26, 24, 4, 1.4, P.ink[0], { stroke: null });
      d.rect(26, 33, 15, 4, 1.4, P.ink[0], { stroke: null, op: 0.7 });
      d.path(drop(38, 63, 7.5), "#ffffff", { sw: 2.4 });
      d.path(rr(58.5, 41, 10, 16, 3), d.fill(P.steel, "h"), { sw: 2.6 });
      d.path("M60 42 L56 36 Q55 34 57 33 L59 33", "none", { sw: 2.4 });
      d.shine(23, 17, 6, 1.5, 0.75, 0);
    },
  ],
  [
    "⛪",
    "church",
    (d) => {
      d.shadow(50, 91, 44);
      d.rect(13, 56, 74, 34, 0, d.fill(P.cream, "v"), { sw: 3.5 });
      d.path("M7 60 L40 35 L60 35 L93 60 Q93 63 90 63 L10 63 Q7 63 7 60 Z", d.fill(P.red, "v"), { sw: 3.5 });
      for (const x of [21, 73]) d.path(`M${x - 3.5} 82 V72 Q${x - 3.5} 67.5 ${x} 67.5 Q${x + 3.5} 67.5 ${x + 3.5} 72 V82 Z`, d.fill(P.sky, "d"), { sw: 2.4 });
      d.rect(38, 36, 24, 54, 0, d.fill(P.cream, "v"), { sw: 3.5 });
      d.path("M44 50 V44 Q44 40 50 40 Q56 40 56 44 V50 Z", d.fill(P.ink, "v"), { sw: 2.4 });
      d.path("M46.5 49 Q46.5 43.5 50 43.5 Q53.5 43.5 53.5 49 Z", d.fill(P.gold), { sw: 1.6 });
      d.circle(50, 60, 5, d.fill(P.sky, "d"), { sw: 2.4 });
      d.stroke("M50 55 V65 M45 60 H55", { sw: 1.6 });
      d.path("M43 90 V76 Q43 69 50 69 Q57 69 57 76 V90 Z", d.fill(P.wood, "v"), { sw: 3 });
      d.stroke("M50 70 V90", { sw: 2 });
      d.path("M35 37 L50 21 L65 37 Q65 39 63 39 L37 39 Q35 39 35 37 Z", d.fill(P.red, "v"), { sw: 3.5 });
      d.tube("M50 21 V10.5 M44.5 14.5 H55.5", P.gold[1], 3.2, 2.2);
      d.shine(41, 31, 1.4, 4, 0.6, 40);
      d.shine(18, 66, 1.4, 6, 0.5, 0);
    },
  ],
  [
    "🚒",
    "fire engine",
    (d) => {
      d.shadow(50, 87, 44);
      const body = "M7 72 V41 Q7 36 12 36 H67 V31 Q67 27 71 27 H80 Q85 27 87 32 L91 46 Q93 49 93 54 V72 Q93 77 88 77 H12 Q7 77 7 72 Z";
      d.path(body, d.fill(P.red, "v"), { sw: 3.5 });
      d.clip(body, (c) => c.rect(0, 58, 100, 4.5, 0, "#ffffff", { stroke: null }));
      d.path(body, "none", { sw: 3.5 });
      for (const x of [12, 30.5, 49]) {
        d.rect(x, 41, 15, 13, 2, P.red[2], { stroke: null, op: 0.35 });
        d.line(x + 4, 47.5, x + 11, 47.5, { sw: 2 });
      }
      d.path("M73 31.5 H80 Q82.5 31.5 83.5 34 L86.5 45 H73 Z", d.fill(P.sky, "d"), { sw: 2.6 });
      d.rect(11, 26, 55, 7, 1.5, d.fill(P.silver, "v"), { sw: 2.6 });
      d.stroke("M18 26 V33 M25 26 V33 M32 26 V33 M39 26 V33 M46 26 V33 M53 26 V33 M60 26 V33", { sw: 1.8 });
      d.rect(71, 21, 9, 6, 2.5, d.fill(P.blue), { sw: 2.2 });
      wheel(d, 25, 77, 10.5);
      wheel(d, 76, 77, 10.5);
      d.ellipse(90.5, 64, 2.2, 3.2, d.fill(P.gold), { sw: 2 });
      d.shine(16, 39, 6, 1.3, 0.75, 0);
    },
  ],
  [
    "🛶",
    "canoe",
    (d) => {
      const hull = "M7 47 Q13 58 50 59 Q87 58 93 47 Q91 68 73 75 H27 Q9 68 7 47 Z";
      d.path(hull, d.fill(P.wood, "v"), { sw: 3.5 });
      d.clip(hull, (c) => c.stroke("M30 60 V80 M50 60 V80 M70 60 V80", { color: P.wood[2], sw: 1.6, op: 0.6 }));
      d.path(hull, "none", { sw: 3.5 });
      d.tube("M9 50 Q15 60 50 61 Q85 60 91 50", P.wood[0], 2.4, 1.8);
      d.shine(22, 64, 8, 1.6, 0.6, 6);
      sea(d, 80);
      d.tube("M33 17 L62 74", P.wood[1], 3.4, 2.4);
      d.tube("M29.5 18.5 L36.5 15", P.wood[1], 3.4, 2.4);
      d.path("M57.5 66 Q66 62 69 70 L74 83 Q75 89 70 90 Q65 91 63 86 Z", d.fill(P.wood, "h"), { sw: 2.6 });
    },
  ],
  [
    "🛸",
    "flying saucer",
    (d) => {
      d.path("M36 60 L64 60 L84 93 L16 93 Z", d.lin([[0, "#fff3a0", 0.9], [1, "#fff3a0", 0.05]]), { stroke: null });
      d.path("M31 50 Q31 23 50 23 Q69 23 69 50 Z", d.fill(P.sky, "d"), { sw: 3 });
      d.shine(42, 31, 3, 6, 0.75, 30);
      d.ellipse(50, 52, 43, 12.5, d.fill(P.silver, "v"), { sw: 3.5 });
      d.ellipse(50, 57, 24, 5.5, d.fill(P.steel, "v"), { sw: 2.4 });
      const lights = [P.gold, P.pink, P.teal, P.gold, P.pink, P.teal];
      for (let i = 0; i < 6; i++) {
        const a = Math.PI * (0.12 + (i * 0.76) / 5);
        d.ball(50 - Math.cos(a) * 34, 52 + Math.sin(a) * 4.5 - 1, 3, lights[i], { sw: 1.8 });
      }
      d.shine(26, 46, 8, 1.6, 0.8, -6);
    },
  ],
  [
    "🏕️",
    "campsite",
    (d) => {
      scene(d, d.lin([[0, "#3c4b9d"], [0.55, "#8f7ae0"], [1, "#ffb38a"]]), (c) => {
        for (const [x, y, s] of [[18, 18, 3], [40, 14, 2.2], [62, 20, 2.6], [30, 30, 1.8]]) c.path(sparklePath(x, y, s), "#fff6c2", { stroke: null });
        c.path(crescent(80, 21, 6), c.fill(P.lemon), { sw: 2 });
        pine(c, 88, 64, 34);
        pine(c, 74, 62, 24);
        pine(c, 12, 62, 26);
        c.path("M4 62 Q50 54 96 62 V96 H4 Z", c.fill(P.green, "v"), { sw: 2.6 });
        c.path("M36 40 L62 46 Q65 47 65.5 50 L68 80 L58 84 Z", c.lin([[0, P.gold[1]], [1, P.gold[2]]], 0, 0, 1, 0), { sw: 3 });
        c.path("M36 39 L58 84 L13 84 Z", c.fill(P.gold, "v"), { sw: 3.2 });
        c.path("M36 54 L44.5 84 L27.5 84 Z", c.fill(P.ink, "v"), { sw: 2.4 });
        c.glow(79, 76, 16, "#ffb347", 0.75);
        c.tube("M70 86 L88 80 M70 80 L88 86", P.wood[1], 3.6, 2.2);
        c.path("M79 62 Q83 69 86 71 Q87 66 86 64 Q91 70 90 76 Q89 83 79 83 Q69 83 68 76 Q68 71 72 68 Q72 72 75 73 Q74 67 79 62 Z", c.fill(P.orange, "v"), { sw: 2.4 });
        c.path("M79 71 Q82 75 82 78 Q82 81 79 81 Q76 81 76 78 Q76 75 79 71 Z", P.lemon[1], { stroke: null });
      });
    },
  ],
  [
    "🏭",
    "factory",
    (d) => {
      d.shadow(50, 91, 44);
      for (const [x, y, r] of [[28, 19, 5], [36, 14, 6.5], [47, 12, 5.5], [44, 22, 4]] as const) d.circle(x, y, r, d.fill(P.white), { sw: 2.2 });
      for (const x of [14, 27]) {
        d.rect(x, 22, 10, 30, 1.5, d.fill(P.red, "h"), { sw: 3 });
        d.rect(x, 28, 10, 4, 0, "#ffffff", { sw: 2 });
      }
      for (const x of [40, 57, 74]) d.path(`M${x} 49 V33 L${x + 17} 49 Z`, d.fill(P.stone, "v"), { sw: 3 });
      for (const x of [40, 57, 74]) d.path(`M${x + 1.6} 47 V37.5 L${x + 6} 41.5 V47 Z`, d.fill(P.sky, "d"), { stroke: null });
      d.rect(8, 48, 84, 42, 0, d.fill(P.steel, "v"), { sw: 3.5 });
      for (const x of [14, 28, 42]) pane(d, x, 58, 9, 10, 1.8, 2.3);
      d.rect(62, 62, 24, 28, 1.5, d.fill(P.gold, "v"), { sw: 3 });
      d.stroke("M62 69 H86 M62 76 H86 M62 83 H86", { color: P.gold[2], sw: 1.8 });
      d.shine(18, 52, 7, 1.4, 0.7, 0);
    },
  ],
  [
    "🗼",
    "lighthouse",
    (d) => {
      d.path("M50 31 L7 17 L7 45 Z", d.lin([[0, "#fff3a0", 0.95], [1, "#fff3a0", 0]], 1, 0, 0, 0), { stroke: null });
      d.path("M50 31 L93 17 L93 45 Z", d.lin([[0, "#fff3a0", 0.95], [1, "#fff3a0", 0]], 0, 0, 1, 0), { stroke: null });
      d.path("M11 91 Q9 84 16 82 Q19 75 28 77 Q34 71 43 75 Q50 71 57 75 Q66 71 72 77 Q81 75 84 82 Q91 84 89 91 Z", d.fill(P.stone, "v"), { sw: 3 });
      d.stroke("M22 84 Q26 81 30 83 M70 83 Q74 81 78 84", { color: P.stone[2], sw: 1.8 });
      const tw = "M35 87 L40.5 43 H59.5 L65 87 Z";
      d.path(tw, d.fill(P.white, "h"), { sw: 3.5 });
      d.clip(tw, (c) => {
        for (const y of [50, 66]) c.rect(30, y, 40, 8, 0, c.fill(P.red, "h"), { stroke: null });
        c.rect(30, 82, 40, 8, 0, c.fill(P.red, "h"), { stroke: null });
      });
      d.path(tw, "none", { sw: 3.5 });
      d.path("M46 87 V79 Q46 75 50 75 Q54 75 54 79 V87 Z", d.fill(P.ink, "v"), { sw: 2.4 });
      d.circle(50, 61, 2.2, d.fill(P.sky, "d"), { sw: 1.8 });
      d.rect(41, 25, 18, 14, 1.5, d.fill(P.lemon), { sw: 2.6 });
      d.glow(50, 32, 11, "#ffffff", 0.9);
      d.stroke("M47 25 V39 M53 25 V39", { sw: 1.8 });
      d.rect(35, 38.5, 30, 5, 2, d.fill(P.ink, "v"), { sw: 2.6 });
      d.path("M38 26 Q38 13 50 13 Q62 13 62 26 Z", d.fill(P.red, "v"), { sw: 3 });
      d.circle(50, 11, 2.4, d.fill(P.red), { sw: 1.8 });
      d.shine(44, 17, 3, 1.4, 0.7, -30);
      d.shine(44, 56, 1.4, 6, 0.6, 5);
    },
  ],
  [
    "🚆",
    "train",
    (d) => {
      d.rect(7, 80, 86, 4.5, 1.5, d.fill(P.steel, "v"), { sw: 2.2 });
      d.stroke("M22 33 L28 24 L34 33 M25 24 H31", { sw: 2.2 });
      const body = "M6 71 V40 Q6 33 13 33 H54 Q74 33 88 50 Q94 58 93 64 Q92 72 84 72 H12 Q6 72 6 71 Z";
      d.path(body, d.fill(P.white, "v"), { sw: 3.5 });
      d.clip(body, (c) => {
        c.rect(0, 57, 100, 6, 0, c.fill(P.blue, "h"), { stroke: null });
        c.rect(0, 63, 100, 2.6, 0, P.red[1], { stroke: null });
      });
      d.path(body, "none", { sw: 3.5 });
      for (let i = 0; i < 3; i++) pane(d, 11 + i * 12, 39, 9, 11, 2, 2.4);
      d.rect(48, 39, 7.5, 18, 1.8, d.fill(P.silver, "v"), { sw: 2.2 });
      d.path("M62 39 H66 Q76 39 83.5 50 H62 Z", d.fill(P.sky, "d"), { sw: 2.4 });
      for (const x of [17, 29, 61, 73]) d.circle(x, 75, 5, d.fill(P.black), { sw: 2.4 });
      d.circle(89.5, 63, 2, d.fill(P.gold), { sw: 1.6 });
      d.shine(18, 36, 9, 1.4, 0.85, 0);
    },
  ],
  [
    "🏚️",
    "old house",
    (d) => {
      d.shadow(50, 91, 42);
      d.g("rotate(-3 50 90)", (g) => {
        const wall = "M16 90 V52 H84 V90 Z";
        g.path(wall, g.fill(P.wood, "v"), { sw: 3.5 });
        g.clip(wall, (c) => {
          c.stroke("M24 52 V90 M32 52 V90 M40 52 V90 M48 52 V90 M56 52 V90 M64 52 V90 M72 52 V90 M80 52 V90", { color: P.wood[2], sw: 1.6, op: 0.7 });
          c.path("M64 56 H72 V66 L68 70 L64 66 Z", P.ink[1], { stroke: null, op: 0.85 });
        });
        g.path(wall, "none", { sw: 3.5 });
        g.path("M8 55 L47 19 L92 53 Q93 57 88 57 L12 58 Q7 58 8 55 Z", g.fill(P.brown, "v"), { sw: 3.5 });
        g.path("M56 33 L64 35 L62 42 L54 40 Z", P.ink[1], { sw: 2.2 });
        g.stroke("M24 45 L32 47 M70 45 L78 46 M36 34 L42 36", { color: P.brown[2], sw: 2 });
        g.rect(21, 62, 14, 13, 1, P.ink[1], { sw: 2.4 });
        g.tube("M19 61 L37 76 M37 61 L19 76", P.wood[0], 3, 1.8);
        g.path("M42 90 V66 L57 64 V90 Z", g.fill(P.wood, "v"), { sw: 3 });
        g.stroke("M42 66 L57 90 M57 64 L42 90", { color: P.wood[2], sw: 2 });
        for (const x of [14, 30, 66, 86]) g.path(`M${x - 4} 91 Q${x - 3} 84 ${x - 1} 86 Q${x} 81 ${x + 1} 86 Q${x + 3} 84 ${x + 4} 91 Z`, g.fill(P.green, "v"), { sw: 1.8 });
        g.shine(26, 44, 7, 1.8, 0.4, -40);
      });
    },
  ],
  [
    "🏎️",
    "race car",
    (d) => {
      d.g("translate(0 -4)", (g) => {
        g.shadow(50, 86, 44);
        g.tube("M14 41 V57", P.ink[1], 2.6, 2);
        g.rect(6, 34, 17, 7, 2, g.fill(P.blue, "v"), { sw: 2.6 });
        const body = "M10 66 Q10 56 20 55 L36 54 Q40 46 48 45 L56 45 Q60 45 62 50 L66 55 L87 60 Q94 62 93.5 68 Q93 72 87 72 L14 72 Q10 72 10 66 Z";
        g.path(body, g.fill(P.blue, "v"), { sw: 3.5 });
        g.clip(body, (c) => c.path("M0 62 L100 64 V67 L0 65 Z", "#ffffff", { stroke: null }));
        g.path(body, "none", { sw: 3.5 });
        g.circle(49, 46, 6.5, g.fill(P.gold), { sw: 2.6 });
        g.path("M50 43 H55 Q56 46 54 48 H50 Z", g.fill(P.ink, "v"), { sw: 1.6 });
        g.circle(52, 61, 5.5, "#ffffff", { sw: 2.2 });
        g.stroke("M50.6 59 L52.6 57.6 V64.6", { sw: 2 });
        g.rect(80, 69, 13.5, 4.5, 1.6, g.fill(P.ink, "v"), { sw: 2.2 });
        wheel(g, 26, 72, 12.5);
        wheel(g, 76, 72, 11);
        g.shine(22, 58, 7, 1.4, 0.75, -4);
      });
    },
  ],
  [
    "🌃",
    "night city",
    (d) => {
      scene(d, d.lin([[0, "#1a2257"], [1, "#3c4b9d"]]), (c) => {
        for (const [x, y, s] of [[16, 17, 3], [33, 24, 2.2], [56, 14, 2.6], [88, 40, 2], [14, 36, 1.8], [62, 30, 1.8]]) c.path(sparklePath(x, y, s), "#fff6c2", { stroke: null });
        c.path(crescent(78, 21, 7.5), c.fill(P.lemon), { sw: 2.2 });
        c.tube("M47 30 V20", P.steel[1], 1.8, 1.6);
        for (const [x, y, w] of [[4, 54, 15], [17, 40, 14], [29, 60, 12], [39, 30, 16], [53, 50, 12], [63, 44, 15], [76, 58, 20]]) {
          c.rect(x, y, w, 96 - y, 1.5, c.fill(P.ink, "v"), { sw: 2.6 });
          for (let yy = y + 5; yy < 90; yy += 7) for (let xx = x + 3; xx + 3 <= x + w - 2; xx += 5) if ((xx * 5 + yy * 3) % 7 < 4) c.rect(xx, yy, 2.6, 3.2, 0.6, P.gold[1], { stroke: null });
        }
      });
    },
  ],
  [
    "💒",
    "wedding chapel",
    (d) => {
      d.shadow(50, 91, 42);
      d.rect(15, 55, 70, 35, 0, d.fill(P.white, "v"), { sw: 3.5 });
      d.path("M9 59 L39 36 L61 36 L91 59 Q91 62 88 62 L12 62 Q9 62 9 59 Z", d.fill(P.pink, "v"), { sw: 3.5 });
      for (const x of [23, 77]) d.path(`M${x - 3.5} 82 V72 Q${x - 3.5} 67.5 ${x} 67.5 Q${x + 3.5} 67.5 ${x + 3.5} 72 V82 Z`, d.fill(P.sky, "d"), { sw: 2.4 });
      d.rect(38, 38, 24, 52, 0, d.fill(P.white, "v"), { sw: 3.5 });
      d.path(heart(50, 55, 6.5), d.fill(P.red), { sw: 2.4 });
      d.path("M43 90 V77 Q43 70 50 70 Q57 70 57 77 V90 Z", d.fill(P.wood, "v"), { sw: 3 });
      d.stroke("M50 71 V90", { sw: 2 });
      d.path("M35 39 L50 24 L65 39 Q65 41 63 41 L37 41 Q35 41 35 39 Z", d.fill(P.pink, "v"), { sw: 3.5 });
      d.line(50, 24, 50, 19, { sw: 2.4 });
      d.path(heart(50, 14, 7.5), d.fill(P.red), { sw: 2.6 });
      d.shine(46.5, 10.5, 2, 1.2, 0.8, -30);
      d.path(heart(19, 34, 4), d.fill(P.pink), { sw: 2 });
      d.path(heart(83, 30, 3.4), d.fill(P.pink), { sw: 2 });
      d.shine(41, 33, 1.4, 4, 0.6, 40);
    },
  ],
  [
    "🚦",
    "traffic light",
    (d) => {
      d.shadow(50, 91, 18);
      d.tube("M50 72 V88", P.steel[1], 5, 2.6);
      d.rect(40, 86, 20, 5, 2, d.fill(P.ink, "v"), { sw: 2.4 });
      d.path(rr(31, 8, 38, 66, 11), d.fill(P.ink, "h"), { sw: 3.5 });
      for (const [y, r] of [[21.5, P.red], [41, P.gold], [60.5, P.green]] as const) {
        d.circle(50, y, 9.6, P.black[2], { stroke: null });
        d.ball(50, y, 7.6, r, { sw: 2.4 });
      }
      d.shine(36, 18, 1.4, 6, 0.4, 0);
    },
  ],
  [
    "🚐",
    "van",
    (d) => {
      d.shadow(50, 87, 43);
      const body = "M6 70 V37 Q6 26 17 26 H70 Q84 26 89 39 L93 54 Q94 58 94 62 V70 Q94 76 88 76 H12 Q6 76 6 70 Z";
      d.path(body, d.fill(P.white, "v"), { sw: 3.5 });
      d.clip(body, (c) => c.path("M0 52 H100 V100 H0 Z", c.fill(P.teal, "v"), { stroke: null }));
      d.path(body, "none", { sw: 3.5 });
      d.stroke("M6 52 H94", { sw: 2.2 });
      for (const x of [12, 29, 46]) pane(d, x, 32, 13, 14, 2.5, 2.4);
      d.path("M64 32 H72 Q79 32 83 39 L86.5 46 H64 Z", d.fill(P.sky, "d"), { sw: 2.4 });
      d.stroke("M44 55 V73", { color: P.teal[2], sw: 2 });
      d.stroke("M38 60 H42", { sw: 2.2 });
      wheel(d, 24, 76, 10.5);
      wheel(d, 75, 76, 10.5);
      d.ellipse(91.5, 60, 2.2, 3.2, d.fill(P.gold), { sw: 2 });
      d.shine(18, 29.5, 8, 1.5, 0.85, 0);
    },
  ],
  [
    "🛖",
    "hut",
    (d) => {
      d.shadow(50, 91, 40);
      d.path("M20 90 V58 Q20 54 24 54 H76 Q80 54 80 58 V90 Z", d.fill(P.tan, "v"), { sw: 3.5 });
      d.stroke("M25 70 Q28 68 31 70 M66 76 Q69 74 72 76 M28 82 Q31 80 34 82", { color: P.tan[2], sw: 1.8 });
      d.path("M41 90 V71 Q41 62 50 62 Q59 62 59 71 V90 Z", d.fill(P.ink, "v"), { sw: 3 });
      let roof = "M50 11 L92 57";
      for (let i = 1; i <= 12; i++) roof += ` L${n2(92 - i * 7)} ${i % 2 ? 63 : 57}`;
      roof += " Z";
      d.path(roof, d.fill(P.gold, "v"), { sw: 3.5 });
      d.stroke("M50 15 L28 55 M50 15 L40 57 M50 15 L60 57 M50 15 L72 55", { color: P.gold[2], sw: 1.6 });
      d.stroke("M33 33 Q50 38 67 33", { color: P.wood[2], sw: 2.4 });
      d.circle(50, 11, 3, d.fill(P.wood), { sw: 2 });
      d.shine(38, 32, 2, 7, 0.55, 40);
    },
  ],
  [
    "🚁",
    "helicopter",
    (d) => {
      d.shadow(54, 91, 30);
      d.stroke("M45 67 L42 80 M67 67 L70 80", { sw: 3 });
      d.tube("M30 80 H78 Q84 80 86 75", P.steel[1], 3, 2.2);
      d.poly([38, 47, 38, 59, 14, 51, 14, 45], d.fill(P.gold, "v"), { sw: 3 });
      d.path("M8 29 L15 29 L20 48 L12 48 Z", d.fill(P.gold, "v"), { sw: 2.6 });
      d.tube("M14 33.5 V46.5 M7.5 40 H20.5", P.steel[1], 2, 1.6);
      d.circle(14, 40, 2, d.fill(P.silver), { sw: 1.6 });
      const body = "M34 56 Q34 36 54 36 H60 Q80 36 84 54 Q84 70 66 70 H46 Q34 70 34 56 Z";
      d.path(body, d.fill(P.gold, "v"), { sw: 3.5 });
      d.path("M60 40 H63 Q77 41 80 54 H60 Z", d.fill(P.sky, "d"), { sw: 2.6 });
      pane(d, 43, 42, 11, 11, 2.5, 2.4);
      d.rect(51, 29, 6, 8, 1.5, d.fill(P.steel, "v"), { sw: 2.2 });
      d.path(rr(14, 24, 80, 5.5, 2.75), d.fill(P.ink, "v"), { sw: 2.4 });
      d.shine(42, 40.5, 4, 1.4, 0.6, -20);
    },
  ],
  [
    "🚙",
    "SUV",
    (d) => {
      d.shadow(50, 87, 43);
      d.circle(14, 57, 7.5, d.fill(P.black), { sw: 2.6 });
      d.circle(14, 57, 3, d.fill(P.silver), { sw: 1.6 });
      d.tube("M35 23 V19 M67 23 V19", P.ink[1], 2, 1.6);
      d.rect(30, 16, 42, 4, 1.5, P.ink[1], { sw: 2 });
      d.path("M14 72 V48 Q14 41 21 41 H26 L31 27 Q33 23 39 23 H70 Q76 23 79 29 L86 43 Q93 45 93 55 V72 Q93 77 88 77 H19 Q14 77 14 72 Z", d.fill(P.blue, "v"), { sw: 3.5 });
      d.path("M31 41 L35 31 Q36 28 39 28 H46 V41 Z", d.fill(P.sky, "d"), { sw: 2.4 });
      d.path("M50 41 V28 H60 V41 Z", d.fill(P.sky, "d"), { sw: 2.4 });
      d.path("M64 41 V28 H69 Q73 28 75 31 L80 41 Z", d.fill(P.sky, "d"), { sw: 2.4 });
      d.stroke("M62 44 V72", { color: P.blue[2], sw: 2 });
      d.stroke("M52 48 H57", { sw: 2.4 });
      wheel(d, 31, 77, 12);
      wheel(d, 75, 77, 12);
      d.ellipse(90.5, 52, 2.6, 3.4, d.fill(P.gold), { sw: 2 });
      d.shine(24, 45, 6, 1.6, 0.7, -4);
    },
  ],
  [
    "🎡",
    "ferris wheel",
    (d) => {
      d.shadow(50, 91, 36);
      d.tube("M50 44 L27 88 M50 44 L73 88", P.steel[1], 4, 2.4);
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        d.line(50, 44, 50 + Math.cos(a) * 31, 44 + Math.sin(a) * 31, { color: P.steel[1], sw: 1.8 });
      }
      d.tube(circlePath(50, 44, 31), P.coral[1], 3.4, 2.4);
      const cars = [P.sky, P.gold, P.lime, P.pink];
      for (let i = 0; i < 8; i++) {
        const a = ((i + 0.5) * Math.PI) / 4;
        const x = n2(50 + Math.cos(a) * 31);
        const y = n2(44 + Math.sin(a) * 31);
        d.path(`M${n2(x - 5.5)} ${n2(y + 2)} H${n2(x + 5.5)} V${n2(y + 6.5)} Q${n2(x + 5.5)} ${n2(y + 11)} ${n2(x + 1.5)} ${n2(y + 11)} H${n2(x - 1.5)} Q${n2(x - 5.5)} ${n2(y + 11)} ${n2(x - 5.5)} ${n2(y + 6.5)} Z`, d.fill(cars[i % 4], "v"), { sw: 2.2 });
        d.circle(x, y, 1.8, d.fill(P.silver), { sw: 1.6 });
      }
      d.ball(50, 44, 5, P.gold, { sw: 2.4 });
      d.rect(20, 86, 60, 5, 2, d.fill(P.stone, "v"), { sw: 2.4 });
    },
  ],
  [
    "🚛",
    "big truck",
    (d) => {
      d.shadow(50, 87, 45);
      d.rect(10, 68, 76, 6, 2, P.ink[1], { sw: 2.4 });
      const tr = rr(7, 23, 58, 45, 4);
      d.path(tr, d.fill(P.silver, "v"), { sw: 3.5 });
      d.clip(tr, (c) => c.rect(0, 52, 70, 5, 0, c.fill(P.red, "h"), { stroke: null }));
      d.path(tr, "none", { sw: 3.5 });
      d.stroke("M21 27 V48 M35 27 V48 M49 27 V48", { color: P.silver[2], sw: 1.8 });
      d.tube("M69 33 V14", P.silver[1], 3, 2);
      d.path("M65 74 V32 Q65 27 70 27 H79 Q84 27 85 32 L86 44 H88 Q93 45 93 51 V72 Q93 76 88 76 H65 Z", d.fill(P.blue, "v"), { sw: 3.5 });
      d.path("M71 32 H79 Q81 32 81.5 34 L82.5 44 H71 Z", d.fill(P.sky, "d"), { sw: 2.4 });
      d.stroke("M88 55 H93 M88 60 H93", { sw: 1.8 });
      for (const x of [16, 32, 58, 82]) wheel(d, x, 76, 8.5);
      d.ellipse(90.5, 66, 2, 2.8, d.fill(P.gold), { sw: 1.8 });
      d.shine(18, 30, 9, 1.8, 0.8, -3);
    },
  ],
  [
    "🚜",
    "tractor",
    (d) => {
      d.shadow(50, 89, 44);
      d.tube("M66 47 V29", P.ink[1], 3.4, 2.2);
      d.circle(71, 20, 5, d.fill(P.white), { sw: 2 });
      d.circle(79.5, 13.5, 3.6, d.fill(P.white), { sw: 1.8 });
      d.tube("M23 26 V50 M47 26 V50", P.ink[1], 2.6, 2);
      d.rect(26, 29, 18, 17, 2, d.fill(P.sky, "d"), { stroke: null, op: 0.75 });
      d.rect(18, 21, 33, 6, 2, d.fill(P.green, "v"), { sw: 2.8 });
      d.path("M18 70 V50 H52 L54 46 H86 Q92 46 92 52 V68 Q92 72 88 72 H18 Z", d.fill(P.green, "v"), { sw: 3.5 });
      d.stroke("M86 52 V66 M81 52 V66", { color: P.green[2], sw: 1.8 });
      d.circle(33, 68, 19.5, d.fill(P.black), { sw: 3.5 });
      d.circle(33, 68, 9, d.fill(P.gold), { sw: 2.6 });
      d.circle(33, 68, 2.4, P.gold[2], { stroke: null });
      d.tube("M10 65 A23.5 23.5 0 0 1 57 65", P.green[1], 5.5, 2.6);
      d.circle(78, 77, 11, d.fill(P.black), { sw: 3 });
      d.circle(78, 77, 5, d.fill(P.gold), { sw: 2 });
      d.shine(58, 50, 9, 1.4, 0.8, 0);
    },
  ],
  [
    "🚂",
    "steam engine",
    (d) => {
      d.shadow(50, 89, 44);
      d.circle(83, 17, 5, d.fill(P.white), { sw: 2 });
      d.circle(72, 12.5, 4.5, d.fill(P.white), { sw: 1.8 });
      d.path("M73 44 L71 28 Q70.5 25 74 25 H81 Q84.5 25 84 28 L82 44 Z", d.fill(P.black, "h"), { sw: 3 });
      d.path("M51 44 Q51 35 57.5 35 Q64 35 64 44 Z", d.fill(P.gold), { sw: 2.6 });
      d.rect(36, 43, 50, 25, 4, d.fill(P.black, "v"), { sw: 3.5 });
      d.stroke("M48 43 V68 M70 43 V68", { color: P.gold[1], sw: 2.4 });
      d.rect(84, 44, 6, 23, 3, d.fill(P.silver, "h"), { sw: 2.6 });
      d.rect(9, 26, 34, 6, 2, d.fill(P.black, "v"), { sw: 2.8 });
      d.rect(12, 31, 28, 38, 2, d.fill(P.red, "v"), { sw: 3.5 });
      pane(d, 17, 36, 18, 14, 2.5, 2.4);
      d.rect(9, 66, 80, 6, 2, d.fill(P.red, "v"), { sw: 2.6 });
      d.path("M85 66 L93 80 H83 Z", d.fill(P.gold, "v"), { sw: 2.6 });
      for (const [x, r] of [[26, 12.5], [55, 9.5], [74, 9.5]] as const) {
        d.circle(x, 76, r, d.fill(P.red), { sw: 3 });
        d.circle(x, 76, r * 0.38, d.fill(P.silver), { sw: 2 });
      }
      d.tube("M26 77 L74 77", P.silver[1], 2.4, 1.8);
      d.shine(42, 47, 6, 1.4, 0.5, 0);
    },
  ],
  [
    "🚤",
    "speedboat",
    (d) => {
      d.g("rotate(-4 50 70)", (g) => {
        g.tube("M16 44 V27", P.steel[1], 1.8, 1.6);
        g.path("M17 27 L27 29.8 L17 32.6 Z", g.fill(P.red, "h"), { sw: 1.8 });
        g.path(rr(8, 42, 9, 23, 3.5), g.fill(P.ink, "v"), { sw: 2.6 });
        g.path("M45 49 Q47 34 59 33 Q62.5 33 64 36 L70 49 Z", g.fill(P.sky, "d"), { sw: 2.6 });
        g.shine(53, 39, 1.6, 4, 0.8, 30);
        g.rect(27, 40, 14, 10, 3.5, g.fill(P.red, "v"), { sw: 2.4 });
        const hull = "M12 49 H70 Q87 49 95 40 Q96 60 79 72 H22 Q13 68 12 49 Z";
        g.path(hull, g.fill(P.white, "v"), { sw: 3.5 });
        g.clip(hull, (c) => c.path("M0 58 L100 50 V55.5 L0 63.5 Z", c.fill(P.red, "h"), { stroke: null }));
        g.path(hull, "none", { sw: 3.5 });
        g.shine(23, 52.5, 9, 1.4, 0.85, 0);
      });
      sea(d, 77);
      d.path("M73 78 Q78 69 85 70 Q90 66 94 70 Q91 75 86 80 Z", d.fill(P.white, "v"), { sw: 2.2 });
      for (const [x, y, r] of [[89, 61, 2.2], [83, 63.5, 1.7], [93, 65.5, 1.4]] as const) d.circle(x, y, r, "#ffffff", { stroke: P.sky[2], sw: 1.4 });
      d.stroke("M10 82 Q14 78 18 82 M20 87 Q24 83 28 87", { color: "#ffffff", sw: 2.6 });
    },
  ],
  [
    "🏤",
    "post office",
    (d) => {
      d.shadow(50, 91, 44);
      d.rect(12, 32, 76, 58, 0, d.fill(P.cream, "v"), { sw: 3.5 });
      d.rect(8, 21, 84, 12, 3, d.fill(P.blue, "v"), { sw: 3.5 });
      d.shine(18, 25, 7, 1.4, 0.7, 0);
      d.rect(35, 38, 30, 20, 2.5, d.fill(P.white, "v"), { sw: 2.8 });
      d.stroke("M36 39 L50 50 L64 39", { sw: 2.4 });
      d.circle(50, 50, 2.8, d.fill(P.red), { sw: 1.8 });
      for (const x of [17, 69]) {
        pane(d, x, 63, 14, 14, 2, 2.4);
        d.stroke(`M${x + 7} 63 V77 M${x} 70 H${x + 14}`, { sw: 1.6 });
      }
      d.rect(41, 65, 18, 25, 2, d.fill(P.blue, "v"), { sw: 3 });
      pane(d, 44.5, 69, 11, 9, 1.6, 2);
      d.circle(55.5, 82, 1.5, OL, { stroke: null });
    },
  ],
  [
    "💺",
    "seat",
    (d) => {
      d.shadow(50, 91, 30);
      d.tube("M36 74 L33 87 M64 74 L67 87", P.steel[1], 3.2, 2.2);
      d.tube("M28 88 H72", P.steel[1], 3, 2);
      d.path(rr(12, 46, 11, 28, 5), d.fill(P.navy, "h"), { sw: 3 });
      d.path(rr(77, 46, 11, 28, 5), d.fill(P.navy, "h"), { sw: 3 });
      d.path(rr(24, 10, 52, 58, 14), d.fill(P.blue, "h"), { sw: 3.5 });
      d.path(rr(31, 30, 38, 30, 9), "none", { stroke: P.blue[2], sw: 1.8 });
      d.path(rr(30, 14, 40, 13, 5.5), d.fill(P.white, "v"), { sw: 2.4 });
      d.path(rr(18, 58, 64, 17, 8.5), d.fill(P.blue, "v"), { sw: 3.5 });
      d.shine(31, 36, 2, 7, 0.55, 0);
      d.shine(30, 62, 7, 1.6, 0.6, 0);
    },
  ],
  [
    "🏬",
    "department store",
    (d) => {
      d.shadow(50, 91, 44);
      for (const x of [20, 80]) {
        d.tube(`M${x} 19 V8.5`, P.steel[1], 1.8, 1.6);
        d.path(`M${x + 1} 8.5 L${x + 9} 11 L${x + 1} 13.5 Z`, d.fill(x < 50 ? P.gold : P.teal, "h"), { sw: 1.8 });
      }
      d.rect(10, 26, 80, 64, 0, d.fill(P.rose, "v"), { sw: 3.5 });
      d.rect(7, 17, 86, 12, 3, d.fill(P.purple, "v"), { sw: 3.5 });
      d.rect(44.5, 21.5, 11, 6, 1.2, d.fill(P.gold), { sw: 1.8 });
      d.stroke("M47.5 21.5 Q47.5 18.5 50 18.5 Q52.5 18.5 52.5 21.5", { sw: 1.6 });
      d.shine(16, 20.5, 7, 1.3, 0.7, 0);
      for (const y of [35, 50]) for (let i = 0; i < 5; i++) pane(d, 15 + i * 15, y, 10, 10, 1.8, 2.3);
      d.rect(28, 64, 44, 6, 2, d.fill(P.purple, "v"), { sw: 2.6 });
      d.rect(33, 70, 34, 20, 1.5, d.fill(P.sky, "d"), { sw: 2.6 });
      d.stroke("M44 70 V90 M50 70 V90 M56 70 V90", { sw: 1.8 });
      pane(d, 13, 70, 13, 15, 1.8, 2.3);
      pane(d, 74, 70, 13, 15, 1.8, 2.3);
    },
  ],
  [
    "🏦",
    "bank",
    (d) => {
      d.shadow(50, 91, 44);
      d.rect(8, 82, 84, 8, 2.5, d.fill(P.grey, "v"), { sw: 3 });
      d.rect(13, 75, 74, 8, 2, d.fill(P.grey, "v"), { sw: 3 });
      d.rect(17, 44, 66, 32, 0, d.fill(P.grey, "v"), { sw: 3 });
      d.path("M43 76 V60 Q43 54 50 54 Q57 54 57 60 V76 Z", d.fill(P.gold, "v"), { sw: 2.8 });
      d.stroke("M50 55 V76", { color: P.gold[2], sw: 1.8 });
      for (const x of [23.5, 35.5, 64.5, 76.5]) {
        d.rect(x - 4, 46, 8, 28, 1, d.fill(P.white, "h"), { sw: 2.6 });
        d.rect(x - 5.5, 43, 11, 4, 1.2, P.white[1], { sw: 2.2 });
        d.rect(x - 5.5, 72, 11, 4, 1.2, P.white[1], { sw: 2.2 });
      }
      d.rect(11, 36, 78, 8, 2, d.fill(P.white, "v"), { sw: 3 });
      d.path("M8 37 L50 10 L92 37 Z", d.fill(P.navy, "v"), { sw: 3.5 });
      d.circle(50, 27, 7.8, d.fill(P.gold), { sw: 2.6 });
      d.stroke("M53.4 23.6 Q52.8 21.6 50 21.6 Q46.6 21.6 46.6 24.4 Q46.6 26.8 50 27.1 Q53.4 27.4 53.4 30 Q53.4 32.6 50 32.6 Q47 32.6 46.4 30.6 M50 19.6 V34.4", { sw: 2 });
      d.shine(31, 25, 6, 1.6, 0.5, -32);
    },
  ],
  [
    "🛣️",
    "highway",
    (d) => {
      scene(d, d.lin([[0, "#9fdcff"], [1, "#e4f6ff"]]), (c) => {
        c.path("M4 46 Q22 34 40 42 Q58 32 74 40 Q86 35 96 42 V96 H4 Z", c.fill(P.forest, "v"), { sw: 2.4 });
        c.path("M4 44 H96 V96 H4 Z", c.fill(P.lime, "v"), { sw: 2.6 });
        c.path("M46 44 H54 L94 96 H6 Z", c.fill(P.ink, "v"), { sw: 2.6 });
        c.poly([46.5, 44, 47.1, 44, 13.5, 96, 9.5, 96], "#ffffff", { stroke: null });
        c.poly([52.9, 44, 53.5, 44, 90.5, 96, 86.5, 96], "#ffffff", { stroke: null });
        for (const [a, b] of [[46, 48.5], [51.5, 55.5], [59.5, 65], [70, 78], [84, 96]]) {
          const wa = 0.3 + (a - 44) * 0.05;
          const wb = 0.3 + (b - 44) * 0.05;
          c.poly([50 - wa, a, 50 + wa, a, 50 + wb, b, 50 - wb, b], P.gold[1], { stroke: null });
        }
        pine(c, 16, 62, 18);
        pine(c, 86, 60, 16);
        pine(c, 26, 52, 10);
        pine(c, 76, 51, 9);
      });
    },
  ],
  [
    "🏘️",
    "houses",
    (d) => {
      d.shadow(50, 91, 44);
      cottage(d, 33, 40, 34, P.cream, P.blue, "c");
      d.circle(50, 52, 3.4, d.fill(P.sky, "d"), { sw: 2 });
      cottage(d, 11, 56, 30, P.rose, P.red, "l");
      cottage(d, 59, 58, 30, P.lemon, P.green);
      d.shine(42, 31, 6, 1.6, 0.5, -45);
    },
  ],
  [
    "🛗",
    "elevator",
    (d) => {
      d.shadow(48, 92, 38);
      d.path(rr(12, 9, 62, 83, 4), d.fill(P.steel, "v"), { sw: 3.5 });
      d.rect(29, 13, 28, 10, 3, d.fill(P.ink, "v"), { sw: 2.2 });
      d.poly([37, 21, 40.5, 15.5, 44, 21], P.lime[1], { stroke: null });
      d.poly([46, 15.5, 49.5, 21, 53, 15.5], P.ink[0], { stroke: null });
      d.rect(18, 27, 24.5, 63, 1, d.fill(P.silver, "h"), { sw: 2.6 });
      d.rect(43.5, 27, 24.5, 63, 1, d.fill(P.silver, "h"), { sw: 2.6 });
      d.shine(25, 44, 2, 12, 0.7, 0);
      d.shine(50.5, 44, 2, 12, 0.7, 0);
      d.path(rr(78, 44, 11, 23, 3.5), d.fill(P.steel, "v"), { sw: 2.6 });
      d.circle(83.5, 50.5, 3.2, d.fill(P.gold), { sw: 1.8 });
      d.circle(83.5, 60.5, 3.2, d.fill(P.white), { sw: 1.8 });
      d.poly([81.8, 51.6, 83.5, 49, 85.2, 51.6], OL, { stroke: null });
      d.poly([81.8, 59.4, 83.5, 62, 85.2, 59.4], OL, { stroke: null });
    },
  ],
  [
    "🏢",
    "office building",
    (d) => {
      d.shadow(50, 91, 36);
      d.rect(41, 7.5, 18, 7, 1.5, d.fill(P.stone, "v"), { sw: 2.4 });
      d.rect(23, 13, 54, 77, 2, d.fill(P.sand, "v"), { sw: 3.5 });
      for (let j = 0; j < 6; j++) for (let i = 0; i < 4; i++) pane(d, 28.5 + i * 11.5, 19 + j * 9, 8, 6, 1.2, 1.8);
      d.rect(42, 74, 16, 16, 1.5, d.fill(P.sky, "d"), { sw: 2.6 });
      d.stroke("M50 74 V90", { sw: 1.8 });
      d.rect(39, 71, 22, 4, 1.5, d.fill(P.stone, "v"), { sw: 2.2 });
      d.shine(29, 16.5, 7, 1.3, 0.8, 0);
    },
  ],
  [
    "🌋",
    "volcano",
    (d) => {
      d.shadow(50, 90, 44);
      // A billowing ash cloud: puffs outlined first, then filled again so only the silhouette keeps a line.
      const puffs = [[34, 27.5, 10], [50, 21, 12], [66, 27.5, 10], [42, 33, 8], [58, 33, 8], [24, 33, 7], [76, 33, 7]] as const;
      for (const [x, y, r] of puffs) d.circle(x, y, r, P.stone[1], { sw: 5.6 });
      for (const [x, y, r] of puffs) d.circle(x, y, r, P.stone[1], { stroke: null });
      for (const [x, y, r] of [[46, 16, 5], [31, 23.5, 3.6], [62, 23, 3.6]] as const) d.circle(x, y, r, P.stone[0], { stroke: null, op: 0.8 });
      d.glow(50, 36, 26, "#ff9f43", 0.65);
      d.path("M40 40 Q31 30 36 15 Q42 24 45 19 Q47 8 53 13 Q57 21 59 16 Q68 26 60 40 Z", d.lin([[0, "#fff3a8"], [0.45, "#ffb347"], [1, "#ff5a3c"]]), { sw: 2.8 });
      d.path(drop(27, 25, 3), d.fill(P.orange), { sw: 1.8 });
      d.path(drop(73, 21, 2.8), d.fill(P.orange), { sw: 1.8 });
      d.path(drop(80, 34, 2.2), d.fill(P.orange), { sw: 1.6 });
      const cone = "M7 88 Q22 70 31 47 Q34 39 40 38 Q50 41 60 38 Q66 39 69 47 Q78 70 93 88 Z";
      d.path(cone, d.fill(P.brown, "h"), { sw: 3.5 });
      d.clip(cone, (c) => {
        c.path("M60 36 L64 52 L60 66 L67 80 L63 96 L100 96 L100 20 Z", P.brown[2], { stroke: null, op: 0.3 });
        c.path("M33 38 Q50 44 67 38 Q66 46 63 50 Q61 55 64 60 Q66 65 62 66 Q58 67 57.5 61 Q57 55 54.5 51 Q53 56 53 66 Q53 76 48.5 76 Q44 76 44.5 67 Q45 58 44.5 51 Q41 54 38 59 Q35 64 31.5 62 Q29 59.5 32 54 Q35 48 33 38 Z", c.lin([[0, "#ffcf6b"], [0.5, "#ff7a3c"], [1, "#e8462e"]]), { sw: 2.4 });
      });
      d.path(cone, "none", { sw: 3.5 });
      d.ellipse(50, 39.5, 9, 2.4, "#fff3a8", { stroke: null, op: 0.9 });
      d.shine(24, 70, 2.4, 8, 0.4, 36);
    },
  ],
];
