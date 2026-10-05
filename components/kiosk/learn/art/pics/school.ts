// School and office: books, paper, writing, maps, clocks and calendars, phones and computers.

import { OL, P, curve, heart, leaf, lumpy, rr, star, type Pen, type Ramp } from "../pen";
import type { PicDef } from "..";

// ── Local helpers ────────────────────────────────────────────────────────────────────────────
const rad = (deg: number) => (deg * Math.PI) / 180;

/** A white clock face with 12 ticks (the quarters bold). */
function face(d: Pen, cx: number, cy: number, r: number) {
  d.circle(cx, cy, r, d.fill(P.white), { sw: 2.6 });
  for (let i = 0; i < 12; i++) {
    const a = rad(i * 30);
    const big = i % 3 === 0;
    const r1 = r * (big ? 0.66 : 0.75);
    const r2 = r * 0.86;
    d.line(cx + Math.sin(a) * r1, cy - Math.cos(a) * r1, cx + Math.sin(a) * r2, cy - Math.cos(a) * r2, { sw: big ? 3 : 2.2, color: big ? OL : P.steel[2] });
  }
}

/** A clock dial: the face plus hands showing h:m. */
function dial(d: Pen, cx: number, cy: number, r: number, h: number, m: number) {
  face(d, cx, cy, r);
  const ha = rad(((h % 12) + m / 60) * 30);
  const ma = rad(m * 6);
  d.line(cx, cy, cx + Math.sin(ha) * r * 0.46, cy - Math.cos(ha) * r * 0.46, { sw: Math.max(4, r * 0.19) });
  d.line(cx, cy, cx + Math.sin(ma) * r * 0.7, cy - Math.cos(ma) * r * 0.7, { sw: Math.max(3, r * 0.12) });
  d.circle(cx, cy, Math.max(3, r * 0.11), P.red[1], { sw: 1.8 });
}

/** A yellow pencil along +x from its point at the origin (place and turn it with d.g). */
function pencil(d: Pen, len: number, w: number) {
  const h = w / 2;
  const xb = w * 1.25; // the sharpened wood ends, the paint starts
  const xe = len - w * 0.7; // the eraser starts
  const xf = xe - w * 0.55; // the metal band starts
  d.path(`M0 0 L${xb + 1} ${-h} L${xb + 1} ${h} Z`, d.fill(P.tan, "v"), { sw: 2.5 });
  d.path(`M0 0 L${xb * 0.38} ${-h * 0.38} Q${xb * 0.43} 0 ${xb * 0.38} ${h * 0.38} Z`, d.fill(P.ink), { sw: 2 });
  const sc = w * 0.15;
  d.path(`M${xb} ${-h} H${xf} V${h} H${xb} Q${xb - sc} ${h * 0.67} ${xb} ${h / 3} Q${xb - sc} 0 ${xb} ${-h / 3} Q${xb - sc} ${-h * 0.67} ${xb} ${-h} Z`, d.fill(P.gold, "v"), { sw: 3 });
  d.stroke(`M${xb + 1.5} ${-h / 3} H${xf} M${xb + 1.5} ${h / 3} H${xf}`, { sw: 1.8, color: P.gold[2] });
  d.path(`M${xe} ${-h} H${len - h * 0.7} Q${len} ${-h} ${len} ${-h * 0.3} V${h * 0.3} Q${len} ${h} ${len - h * 0.7} ${h} H${xe} Z`, d.fill(P.pink, "v"), { sw: 3 });
  d.path(rr(xf, -h - 1.2, xe - xf + 0.6, w + 2.4, 1.5), d.fill(P.silver, "v"), { sw: 2.5 });
  d.stroke(`M${(xf + xe) / 2 + 0.3} ${-h} V${h}`, { sw: 1.6, color: P.silver[2] });
  d.shine((xb + xf) / 2, -h * 0.58, (xf - xb) * 0.32, h * 0.17, 0.65, 0);
}

/** A sheet of paper with a folded top-right corner; returns its outline. */
function paper(d: Pen, x: number, y: number, w: number, h: number, fold: number) {
  const body = `M${x + 4} ${y} H${x + w - fold} L${x + w} ${y + fold} V${y + h - 4} Q${x + w} ${y + h} ${x + w - 4} ${y + h} H${x + 4} Q${x} ${y + h} ${x} ${y + h - 4} V${y + 4} Q${x} ${y} ${x + 4} ${y} Z`;
  d.path(body, d.fill(P.white, "d"), { sw: 3.5 });
  d.path(`M${x + w - fold} ${y} V${y + fold - 3} Q${x + w - fold} ${y + fold} ${x + w - fold + 3} ${y + fold} H${x + w} Z`, d.fill(P.grey, "d"), { sw: 2.6 });
  return body;
}

/** A book lying flat, seen from its top edge: covers, the cream page block and the round spine. */
function bookSide(d: Pen, x: number, y: number, w: number, h: number, ramp: Ramp, spineRight = false) {
  d.path(rr(x, y, w, h, 5), d.fill(ramp, "v"), { sw: 3 });
  const px = spineRight ? x + 3 : x + 10;
  const pw = w - 13;
  d.path(rr(px, y + 4.5, pw, h - 9, 2), d.fill(P.cream, "v"), { sw: 2.2 });
  for (const k of [1 / 3, 2 / 3]) d.stroke(`M${px + 3} ${y + 4.5 + (h - 9) * k} H${px + pw - 3}`, { sw: 1.6, color: P.tan[2] });
  const sx = spineRight ? x + w - 5 : x + 5;
  d.stroke(`M${sx} ${y + 4} V${y + h - 4}`, { sw: 2, color: ramp[2] });
  d.shine(x + w * 0.3, y + 2.6, w * 0.16, 1.4, 0.55, 0);
}

/** A closed book standing up, front cover on: the page block peeks out on the right and bottom. */
function book(d: Pen, ramp: Ramp) {
  d.path(rr(25, 13, 57, 79, 6), d.fill(P.cream, "v"), { sw: 3 });
  d.stroke("M79 19 V86 M31 89 H76", { sw: 1.6, color: P.tan[2] });
  const cover = rr(18, 8, 58, 79, 7);
  d.path(cover, d.fill(ramp, "d"), { sw: 3.5 });
  d.clip(cover, (c) => c.rect(10, 0, 18, 100, 0, ramp[2], { stroke: null, op: 0.3 }));
  d.line(28, 9.8, 28, 85.2, { sw: 2.2, color: ramp[2] });
  d.path(rr(37, 23, 30, 18, 3.5), d.fill(P.cream, "v"), { sw: 2.4 });
  d.stroke("M42 29.5 H62 M42 35 H55", { sw: 2.2, color: P.tan[2] });
  d.shine(41, 14.5, 9, 2.2, 0.55, -4);
}

/** A closed envelope seen from the back: body, bottom folds and the pointed top flap. */
function envelope(d: Pen, x: number, y: number, w: number, h: number, ramp: Ramp) {
  const cx = x + w / 2;
  d.path(rr(x, y, w, h, 6), d.fill(ramp, "v"), { sw: 3.5 });
  d.stroke(`M${x + 3} ${y + h - 3} L${cx - 6} ${y + h * 0.5} M${x + w - 3} ${y + h - 3} L${cx + 6} ${y + h * 0.5}`, { sw: 2.2, color: ramp[2] });
  d.path(`M${x + 1.5} ${y + 5} Q${x + 1} ${y + 1} ${x + 6} ${y + 1} H${x + w - 6} Q${x + w - 1} ${y + 1} ${x + w - 1.5} ${y + 5} L${cx + 5} ${y + h * 0.56} Q${cx} ${y + h * 0.62} ${cx - 5} ${y + h * 0.56} Z`, d.fill(ramp, "v"), { sw: 3 });
  d.shine(x + w * 0.24, y + 6, w * 0.12, 2.2, 0.7, -8);
}

export const SCHOOL: PicDef[] = [
  [
    "📖",
    "open book",
    (d) => {
      d.path("M5 32 Q28 23 50 31 Q72 23 95 32 L95 84 Q72 76 50 84 Q28 76 5 84 Z", d.fill(P.blue, "v"), { sw: 3.5 });
      d.path("M10 27 Q31 19 50 27 L50 79 Q31 71 10 79 Z", d.fill(P.white, "h"), { sw: 3 });
      d.path("M90 27 Q69 19 50 27 L50 79 Q69 71 90 79 Z", d.lin([[0, "#dfe6ef"], [0.25, "#ffffff"], [1, "#f4f7fb"]], 0, 0, 1, 0), { sw: 3 });
      for (let i = 0; i < 4; i++) {
        d.stroke(`M17 ${38 + i * 9} Q30 ${33 + i * 9} 43 ${37 + i * 9}`, { sw: 2.4, color: "#b4c3d6" });
        d.stroke(`M57 ${37 + i * 9} Q70 ${33 + i * 9} 83 ${38 + i * 9}`, { sw: 2.4, color: "#b4c3d6" });
      }
      d.path("M47 79 L50 92 L53 79 Z", d.fill(P.red), { sw: 2 });
    },
  ],
  [
    "🗺️",
    "treasure map",
    (d) => {
      // A map folded in four, the panels turned alternately to and from the light.
      const xs = [8, 29, 50, 71, 92];
      const top = [14, 20, 14, 20, 14];
      const bot = [80, 86, 80, 86, 80];
      const map = "M8 14 L29 20 L50 14 L71 20 L92 14 L92 80 L71 86 L50 80 L29 86 L8 80 Z";
      d.path(map, d.fill(P.sand, "v"), { sw: 3.5 });
      d.clip(map, (c) => {
        c.rect(0, 0, 100, 100, 0, c.rad([[0, P.wood[1], 0], [0.5, P.wood[1], 0], [1, P.wood[2], 0.42]], 0.5, 0.5, 0.62), { stroke: null });
        c.path(lumpy(47, 52, 33, 24, 10, 0.12, 3), c.fill(P.lemon, "v"), { sw: 2.4, stroke: P.brown[2] });
        c.path(lumpy(47, 51, 26, 17, 9, 0.14, 6), c.fill(P.lime, "v"), { stroke: null });
        for (const [x, y] of [[82, 30], [84, 70], [17, 25], [20, 78]]) c.stroke(`M${x - 6} ${y} q3 -3.5 6 0 t6 0`, { sw: 2.4, color: P.sky[2] });
        c.tube("M28 61 Q27 52 32 45", P.wood[1], 3, 1.8);
        for (const a of [-170, -122, -58, -10]) c.path(leaf(32, 45, 14, a, 0.48), c.fill(P.forest), { sw: 1.8 });
        c.stroke(curve([[35, 62], [43, 65], [50, 60], [53, 52], [58, 48]], 0.25), { sw: 3.8, color: P.brown[2], dash: "0.1 6.2" });
        for (const i of [1, 3]) c.poly([xs[i], top[i], xs[i + 1], top[i + 1], xs[i + 1], bot[i + 1], xs[i], bot[i]], P.wood[2], { stroke: null, op: 0.17 });
      });
      for (const i of [1, 2, 3]) d.line(xs[i], top[i], xs[i], bot[i], { sw: 2, color: P.wood[2], op: 0.7 });
      d.tube("M58 37 L70 49 M70 37 L58 49", P.red[1], 5.5, 2.5);
      d.path(map, "none", { sw: 3.5 });
      d.shine(17, 22, 6, 2.5, 0.6, 15);
    },
  ],
  [
    "📜",
    "scroll",
    (d) => {
      const sheet = "M24 22 Q21 50 24 78 L76 78 Q79 50 76 22 Z";
      d.path(sheet, d.fill(P.sand, "v"), { sw: 3 });
      d.clip(sheet, (c) => c.rect(0, 25, 100, 6, 0, P.sand[2], { stroke: null, op: 0.3 }));
      for (let i = 0; i < 5; i++) {
        const y = 33 + i * 8.5;
        const n = i === 4 ? 4 : 7;
        d.stroke(`M33 ${y} q2.4 -2.4 4.8 0${" t4.8 0".repeat(n - 1)}`, { sw: 2.2, color: P.wood[2], op: 0.65 });
      }
      for (const y of [18, 82]) {
        d.tube(`M14 ${y} H86`, P.wood[1], 5, 2.5);
        d.ball(12, y, 5.6, P.wood, { sw: 2.6 });
        d.ball(88, y, 5.6, P.wood, { sw: 2.6 });
        d.path(rr(19, y - 8, 62, 16, 8), d.fill(P.sand, "v"), { sw: 3 });
        d.stroke(`M24 ${y + 4} H76`, { sw: 1.8, color: P.sand[2], op: 0.9 });
        d.shine(34, y - 4, 9, 1.8, 0.7, 0);
      }
    },
  ],
  [
    "⏳",
    "hourglass",
    (d) => {
      d.shadow(50, 93, 30, 4);
      const glass = "M30 17 C30 37 45 43 45 50 C45 57 30 63 30 83 L70 83 C70 63 55 57 55 50 C55 43 70 37 70 17 Z";
      d.path(glass, d.lin([[0, "#ffffff"], [0.6, "#eaf7ff"], [1, P.sky[0]]], 0, 0, 1, 0), { stroke: null });
      d.clip(glass, (c) => {
        c.path("M26 33 Q50 41 74 33 L74 52 L26 52 Z", c.fill(P.gold, "v"), { stroke: null });
        c.rect(48.7, 48, 2.6, 32, 1.3, P.gold[1], { stroke: null });
        c.path("M26 84 L26 79 Q36 76 43 69 Q50 62 57 69 Q64 76 74 79 L74 84 Z", c.fill(P.gold, "v"), { stroke: null });
      });
      d.path(glass, "none", { sw: 3 });
      d.stroke("M35 22 Q36 32 42 38", { sw: 2.6, color: "#ffffff", op: 0.9 });
      d.stroke("M35 78 Q36 70 40 66", { sw: 2.6, color: "#ffffff", op: 0.7 });
      for (const x of [21, 79]) d.tube(`M${x} 17 V83`, P.wood[1], 4.5, 2.5);
      d.path(rr(13, 8, 74, 11, 5), d.fill(P.wood, "v"), { sw: 3 });
      d.path(rr(13, 81, 74, 11, 5), d.fill(P.wood, "v"), { sw: 3 });
      d.shine(26, 11.5, 8, 1.6, 0.6, 0);
    },
  ],
  [
    "📚",
    "stack of books",
    (d) => {
      d.shadow(50, 88, 42, 4);
      bookSide(d, 9, 63, 82, 22, P.blue);
      d.g("rotate(-3 51 52)", (g) => bookSide(g, 15, 41, 72, 22, P.red, true));
      d.g("rotate(4 47 30)", (g) => bookSide(g, 13, 19, 68, 21, P.green));
    },
  ],
  [
    "📏",
    "ruler",
    (d) => {
      d.g("rotate(-38 50 50)", (g) => {
        g.path(rr(7, 38, 86, 24, 4), g.fill(P.gold, "v"), { sw: 3.5 });
        for (let i = 0; i <= 12; i++) {
          const x = 13 + i * 6.2;
          const len = i % 4 === 0 ? 11 : i % 2 === 0 ? 8 : 5;
          g.line(x, 39.5, x, 38 + len, { sw: i % 4 === 0 ? 2.6 : 2 });
        }
        g.circle(86, 54, 2.8, P.gold[2], { sw: 2 });
        g.shine(36, 55, 18, 2, 0.5, 0);
      });
    },
  ],
  [
    "📣",
    "megaphone",
    (d) => {
      d.g("translate(2.2 1) rotate(-14 50 52)", (g) => {
        for (const [a, r1, r2] of [[-34, 10, 16.5], [0, 10.5, 17.5], [34, 10, 16.5]]) {
          const t = rad(a);
          g.line(72 + Math.cos(t) * r1, 52 + Math.sin(t) * r1, 72 + Math.cos(t) * r2, 52 + Math.sin(t) * r2, { sw: 3.4 });
        }
        g.path(rr(5, 44, 13, 16, 4.5), g.fill(P.ink, "v"), { sw: 3 });
        const cone = "M16 45 L58 24 Q63 21.5 63 27 L63 77 Q63 82.5 58 80 L16 59 Z";
        g.path(cone, g.fill(P.red, "v"), { sw: 3.5 });
        g.clip(cone, (c) => c.rect(42, 0, 8, 100, 0, "#ffffff", { stroke: null, op: 0.95 }));
        g.path(cone, "none", { sw: 3.5 });
        g.ellipse(63, 52, 8, 28.5, g.fill(P.red), { sw: 3.5 });
        g.ellipse(64, 52, 4.5, 22.5, g.fill(P.red, "h"), { stroke: null });
        g.ellipse(64.5, 52, 3, 19.5, P.red[2], { stroke: null, op: 0.8 });
        g.shine(30, 46, 9, 2.2, 0.55, -26);
      });
    },
  ],
  [
    "✏️",
    "pencil",
    (d) => {
      d.g("translate(13.4 86.6) rotate(-45)", (g) => pencil(g, 96, 22));
    },
  ],
  [
    "📱",
    "phone",
    (d) => {
      d.path(rr(25, 7, 50, 86, 11), d.fill(P.ink, "h"), { sw: 3.5 });
      d.path(rr(30, 14, 40, 72, 5), d.fill(P.sky, "d"), { sw: 2.2 });
      const apps: Ramp[] = [P.red, P.gold, P.green, P.violet, P.coral, P.teal, P.pink, P.blue, P.lime, P.orange, P.purple, P.navy];
      for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) d.path(rr(34 + c * 11.5, 21 + r * 12, 9, 9, 2.6), d.fill(apps[r * 3 + c], "d"), { stroke: null });
      d.path(rr(33, 70, 34, 11, 4), "#ffffff", { stroke: null, op: 0.45 });
      for (let c = 0; c < 3; c++) d.path(rr(36.5 + c * 10, 72, 7, 7, 2.2), d.fill([P.green, P.blue, P.red][c], "d"), { stroke: null });
      d.path(rr(43, 9.6, 14, 2.8, 1.4), "#101322", { stroke: null });
      d.shine(36, 19, 3, 9, 0.35, 20);
    },
  ],
  [
    "📅",
    "calendar",
    (d) => {
      const body = rr(12, 18, 76, 72, 9);
      d.path(body, d.fill(P.white, "v"), { sw: 3.5 });
      d.clip(body, (c) => c.rect(0, 0, 100, 38, 0, c.fill(P.red, "v"), { stroke: null }));
      d.line(12, 38, 88, 38, { sw: 3 });
      d.path(body, "none", { sw: 3.5 });
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 4; c++) {
          const hot = r === 1 && c === 2;
          d.path(rr(21 + c * 15, 45 + r * 14, 11, 10, 3), hot ? d.fill(P.coral) : P.sky[0], hot ? { sw: 2.2 } : { stroke: null });
        }
      for (const x of [32, 68]) {
        d.ellipse(x, 29, 4.2, 3.6, P.red[2], { stroke: null });
        d.tube(`M${x} 28 V13`, P.silver[1], 4, 2.5);
      }
      d.shine(24, 24, 7, 2.4, 0.45, -8);
    },
  ],
  [
    "📝",
    "note and pencil",
    (d) => {
      d.g("rotate(-6 46 50)", (g) => {
        paper(g, 15, 10, 60, 79, 15);
        for (let i = 0; i < 5; i++) g.stroke(`M24 ${32 + i * 10.5} H${i === 4 ? 46 : 65}`, { sw: 2.6, color: i === 4 ? P.ink[0] : P.sky[1] });
      });
      d.g("translate(50 74) rotate(-52)", (g) => pencil(g, 60, 14));
    },
  ],
  [
    "📄",
    "page",
    (d) => {
      paper(d, 18, 8, 64, 84, 18);
      d.stroke("M28 24 H52", { sw: 3.6, color: P.steel[2] });
      for (let i = 0; i < 6; i++) d.stroke(`M28 ${38 + i * 8.5} H${i === 5 ? 52 : 72}`, { sw: 2.6, color: P.steel[1] });
    },
  ],
  [
    "⏰",
    "alarm clock",
    (d) => {
      d.shadow(50, 92, 30, 4);
      for (const s of [-1, 1]) d.tube(`M${50 + s * 17} 80 L${50 + s * 24} 89`, P.ink[1], 4.5, 2.5);
      d.tube("M50 24 V13", P.steel[1], 3.2, 2.2);
      d.circle(50, 11, 4.2, d.fill(P.gold), { sw: 2.2 });
      for (const s of [-1, 1]) {
        const bx = 50 + s * 23;
        d.g(`rotate(${s * 36} ${bx} 23)`, (g) => {
          g.path(`M${bx - 14} 27 Q${bx - 14} 10 ${bx} 10 Q${bx + 14} 10 ${bx + 14} 27 Z`, g.fill(P.gold), { sw: 3 });
          g.path(rr(bx - 16, 25, 32, 5, 2.5), g.fill(P.gold, "v"), { sw: 2.5 });
          g.circle(bx, 9, 2.6, P.gold[2], { sw: 2 });
        });
      }
      d.circle(50, 52, 32, d.fill(P.red), { sw: 3.5 });
      d.shine(30, 34, 7, 3.4, 0.6, -45);
      dial(d, 50, 52, 25, 7, 0);
    },
  ],
  [
    "📢",
    "loudspeaker",
    (d) => {
      d.g("translate(1 -3.5) rotate(9 50 50)", (g) => {
        g.stroke("M17 39.5 Q13 50 17 60.5", { sw: 3.6 });
        g.stroke("M10.5 33 Q5 50 10.5 67", { sw: 3.6 });
        g.path("M64 58 L63 80 Q63 85 68 85 L73 85 Q78 85 78 80 L78 58 Z", g.fill(P.blue, "h"), { sw: 3 });
        g.path(rr(60, 35, 28, 28, 8), g.fill(P.blue, "v"), { sw: 3.5 });
        const horn = "M64 41 L33 24 Q28 21 28 27 L28 73 Q28 79 33 76 L64 59 Z";
        g.path(horn, g.fill(P.white, "v"), { sw: 3.5 });
        g.ellipse(29, 50, 7.5, 27.5, g.fill(P.blue), { sw: 3.5 });
        g.ellipse(28.5, 50, 3.8, 22, g.fill(P.navy, "h"), { stroke: null });
        g.shine(46, 37, 10, 2.4, 0.7, 28);
        g.shine(66, 40, 5, 2, 0.5, 0);
      });
    },
  ],
  [
    "📎",
    "paper clip",
    (d) => {
      const clip = "M58 34 L58 64 A8 8 0 0 1 42 64 L42 31 A15 15 0 0 1 72 31 L72 68 A22 22 0 0 1 28 68 L28 40";
      d.g("translate(-3.3 -1.5) rotate(-40 50 53)", (g) => {
        g.tube(clip, g.lin([[0, "#ffffff"], [0.5, P.silver[1]], [1, P.steel[1]]], 0, 0, 1, 1), 5.4, 2.6);
        g.stroke("M28.4 64 V45 M42.4 58 V36", { sw: 1.8, color: "#ffffff", op: 0.95 });
      });
    },
  ],
  [
    "⏱️",
    "stopwatch",
    (d) => {
      d.path(rr(45, 13, 10, 10, 2), d.fill(P.silver, "h"), { sw: 2.5 });
      d.path(rr(39, 7, 22, 8, 3.5), d.fill(P.red, "v"), { sw: 2.6 });
      d.g("rotate(45 50 57)", (g) => {
        g.path(rr(46, 16, 8, 9, 2), g.fill(P.silver, "h"), { sw: 2.4 });
        g.path(rr(43, 12, 14, 6, 3), g.fill(P.red, "v"), { sw: 2.4 });
      });
      d.circle(50, 57, 34, d.fill(P.silver), { sw: 3.5 });
      d.circle(50, 57, 28.5, d.fill(P.steel, "v"), { sw: 2 });
      face(d, 50, 57, 25);
      const a = rad(60);
      d.tube(`M${50 - Math.sin(a) * 6} ${57 + Math.cos(a) * 6} L${50 + Math.sin(a) * 20} ${57 - Math.cos(a) * 20}`, P.red[1], 2.6, 1.5);
      d.circle(50, 57, 3.6, d.fill(P.red), { sw: 2 });
      d.shine(30, 38, 7, 3.4, 0.7, -45);
    },
  ],
  [
    "📐",
    "triangle ruler",
    (d) => {
      const outer = "M20 86 Q14 86 14 80 L14 22 Q14 12 19 17 L81 79 Q88 86 78 86 Z";
      const hole = "M31 73 Q27 73 27 69 L27 49 Q27 43.4 31 47.4 L52.6 69 Q56.6 73 51 73 Z";
      d.raw(`<path d="${outer} ${hole}" fill="${d.fill(P.sky, "d")}" fill-rule="evenodd" stroke="${OL}" stroke-width="3.2" stroke-linejoin="round"/>`);
      for (let i = 0; i < 10; i++) {
        const t = i % 2 === 0 ? 7.5 : 4.5;
        d.line(15.5, 80 - i * 6, 14 + t, 80 - i * 6, { sw: 2 });
        d.line(20 + i * 6, 84.5, 20 + i * 6, 86 - t, { sw: 2 });
      }
      d.shine(19.5, 36, 1.8, 9, 0.6, 0);
    },
  ],
  [
    "🎧",
    "headphones",
    (p) => p.g("translate(0 -2.5)", (d) => {
      d.tube("M20 56 C18 12 82 12 80 56", P.ink[1], 7, 3);
      d.tube("M32.5 28.3 Q50 17.7 67.5 28.3", P.violet[1], 5.5, 2.4);
      for (const flip of [false, true]) {
        const cup = (g: Pen) => {
          g.path(rr(24, 51, 11, 32, 5.5), g.fill(P.ink, "h"), { sw: 3 });
          g.path(rr(9, 46, 21, 41, 10.5), g.fill(P.violet, "v"), { sw: 3.5 });
          g.path(rr(14, 56, 11, 21, 5.5), P.violet[2], { stroke: null, op: 0.35 });
        };
        if (flip) d.mirror(50, cup);
        else cup(d);
      }
      d.shine(15, 54, 2.2, 5, 0.65, 10);
    }),
  ],
  [
    "📘",
    "blue book",
    (d) => book(d, P.blue),
  ],
  [
    "📕",
    "red book",
    (d) => book(d, P.red),
  ],
  [
    "💻",
    "laptop",
    (p) => p.g("translate(0 2)", (d) => {
      d.shadow(50, 89, 42, 4);
      d.path(rr(17, 12, 66, 50, 6), d.fill(P.ink, "v"), { sw: 3.5 });
      const scr = rr(22, 17, 56, 39, 3);
      d.path(scr, d.fill(P.sky, "d"), { sw: 2.2 });
      d.clip(scr, (c) => c.path("M22 17 H46 L32 56 H22 Z", "#ffffff", { stroke: null, op: 0.25 }));
      d.path("M17 62 H83 L91 79 Q92 84 87 84 L13 84 Q8 84 9 79 Z", d.fill(P.silver, "v"), { sw: 3.5 });
      d.stroke("M23.5 66.5 H76.5", { sw: 3, color: P.steel[1], dash: "4.4 1.9", cap: "butt" });
      d.stroke("M21.5 71.5 H78.5", { sw: 3, color: P.steel[1], dash: "4.6 2", cap: "butt" });
      d.path(rr(42, 75.5, 16, 5, 2), P.steel[0], { sw: 1.8 });
      d.shine(30, 64.5, 6, 1.2, 0.8, 0);
    }),
  ],
  [
    "📞",
    "telephone receiver",
    (d) => {
      const set = "M10 71 C6 71 4.5 68 5.5 64 L9 50 C10 45 13 42 18 41.5 C22 41 26 41.5 29 40 C40 32 60 32 71 40 C74 41.5 78 41 82 41.5 C87 42 90 45 91 50 L94.5 64 C95.5 68 94 71 90 71 L68 71 C65 71 63.5 69 63.5 66 L63.5 58 C58 44 42 44 36.5 58 L36.5 66 C36.5 69 35 71 32 71 Z";
      d.g("translate(-3.3 -8.3) rotate(-36 50 55)", (g) => {
        g.path(set, g.fill(P.red, "v"), { sw: 3.5 });
        g.clip(set, (c) => {
          c.rect(0, 64.5, 40, 10, 0, P.red[2], { stroke: null, op: 0.45 });
          c.rect(60, 64.5, 40, 10, 0, P.red[2], { stroke: null, op: 0.45 });
        });
        g.path(set, "none", { sw: 3.5 });
        g.shine(36, 38.5, 8, 2, 0.6, -24);
        g.shine(13, 50, 1.8, 4.5, 0.5, 12);
      });
    },
  ],
  [
    "📸",
    "camera with flash",
    (p) => p.g("translate(0 2.5)", (d) => {
      d.glow(77, 21, 20, "#fff3a0", 0.95);
      d.path(star(77, 21, 14, 6.5, 8), d.fill(P.lemon), { sw: 2.2 });
      d.path(rr(34, 24, 30, 14, 5), d.fill(P.ink, "v"), { sw: 3 });
      d.path(rr(66, 27, 17, 9, 3), d.fill(P.white, "v"), { sw: 2.6 });
      d.path(rr(14, 28, 13, 8, 3), d.fill(P.red, "v"), { sw: 2.6 });
      const body = rr(8, 33, 84, 54, 11);
      d.path(body, d.fill(P.ink, "v"), { sw: 3.5 });
      d.clip(body, (c) => c.rect(0, 0, 100, 46, 0, c.fill(P.silver, "v"), { stroke: null }));
      d.line(8, 46, 92, 46, { sw: 2.4 });
      d.path(body, "none", { sw: 3.5 });
      d.path(rr(15, 37, 11, 6, 2), d.fill(P.sky, "d"), { sw: 1.8 });
      d.circle(50, 61, 22, d.fill(P.silver), { sw: 3 });
      d.circle(50, 61, 16, d.fill(P.ink), { sw: 2.4 });
      d.circle(50, 61, 11.5, d.rad([[0, "#8fc0ff"], [0.5, P.blue[2]], [1, "#141a3a"]], 0.35, 0.3, 0.8), { sw: 2 });
      d.circle(45.5, 56.5, 3.6, "#ffffff", { stroke: null, op: 0.85 });
      d.circle(54.5, 66, 1.8, "#ffffff", { stroke: null, op: 0.6 });
      d.shine(34, 37, 10, 1.6, 0.8, 0);
    }),
  ],
  [
    "✉️",
    "envelope",
    (d) => {
      envelope(d, 8, 22, 84, 58, P.white);
      d.circle(50, 55, 7.5, d.fill(P.red), { sw: 2.6 });
      d.path(heart(50, 55.6, 3.6), P.red[0], { stroke: null, op: 0.9 });
    },
  ],
  [
    "🏷️",
    "tag",
    (p) => p.g("translate(-3 2)", (d) => {
      d.g("translate(2 2) rotate(35 50 50)", (g) => {
        const tag = "M35 31 H80 Q87 31 87 38 V62 Q87 69 80 69 H35 Q32 69 30 67 L16 53 Q13 50 16 47 L30 33 Q32 31 35 31 Z";
        g.path(tag, g.fill(P.orange, "v"), { sw: 3.5 });
        g.circle(29, 50, 6, g.fill(P.silver), { sw: 2.4 });
        g.circle(29, 50, 2.8, "#ffffff", { sw: 2 });
        g.shine(52, 37, 14, 2.4, 0.55, 0);
      });
      d.tube("M33 40 C26 33 21 28 17 20 C14 13 19 9 24 12", P.cream[1], 2.2, 1.7);
    }),
  ],
  [
    "🖊️",
    "pen",
    (d) => {
      d.g("translate(14.5 85.5) rotate(-45)", (g) => {
        const L = 96;
        const h = 8;
        g.path("M0 0 L13 -4.5 L13 4.5 Z", g.fill(P.silver, "v"), { sw: 2.2 });
        g.path(`M12 -4.5 L26 ${-h} L26 ${h} L12 4.5 Z`, g.fill(P.ink, "v"), { sw: 2.6 });
        g.path(rr(25, -h, L - 39, h * 2, 3), g.fill(P.blue, "v"), { sw: 3 });
        g.path(rr(L - 16, -h - 1, 12, h * 2 + 2, 3), g.fill(P.blue, "v"), { sw: 3 });
        g.path(rr(L - 5, -4, 6, 8, 2), g.fill(P.silver, "v"), { sw: 2.4 });
        g.path(rr(L - 42, -h - 4.5, 32, 5, 2.5), g.fill(P.silver, "v"), { sw: 2.4 });
        g.shine(52, -h * 0.45, 16, 1.6, 0.6, 0);
      });
    },
  ],
  [
    "📒",
    "spiral notebook",
    (p) => p.g("translate(2 0)", (d) => {
      d.path(rr(27, 13, 57, 79, 6), d.fill(P.cream, "v"), { sw: 3 });
      d.stroke("M81 19 V86 M33 89 H78", { sw: 1.6, color: P.tan[2] });
      const cover = rr(20, 8, 58, 79, 7);
      d.path(cover, d.fill(P.gold, "d"), { sw: 3.5 });
      d.path(rr(39, 23, 30, 18, 3.5), d.fill(P.cream, "v"), { sw: 2.4 });
      d.stroke("M44 29.5 H64 M44 35 H57", { sw: 2.2, color: P.tan[2] });
      for (let i = 0; i < 7; i++) {
        const y = 15 + i * 10.6;
        d.ellipse(29, y + 1, 2.4, 2, P.gold[2], { stroke: null });
        d.tube(`M29 ${y + 1} C25 ${y - 4} 15 ${y - 4} 14 ${y + 1.5} C13.5 ${y + 4.5} 16 ${y + 5.5} 19 ${y + 5}`, P.silver[1], 2.4, 1.8);
      }
      d.shine(46, 14.5, 9, 2.2, 0.6, -4);
    }),
  ],
  [
    "🎓",
    "graduation cap",
    (p) => p.g("translate(0 6)", (d) => {
      d.path("M27 42 L27 63 Q50 75 73 63 L73 42 Z", d.fill(P.ink, "v"), { sw: 3.5 });
      d.poly([50, 17, 91, 36, 50, 55, 9, 36], P.black[2], { sw: 3.5 });
      d.poly([50, 12, 91, 31, 50, 50, 9, 31], d.fill(P.ink, "d"), { sw: 3.5 });
      d.shine(35, 26, 10, 2.6, 0.35, 25);
      d.tube("M50 31 Q68 33 80 39 L80 60", P.gold[1], 3, 2);
      d.circle(50, 31, 3.6, d.fill(P.gold), { sw: 2 });
      d.path("M76 58 Q80 55.5 84 58 L87 75 Q80 78 73 75 Z", d.fill(P.gold, "v"), { sw: 2.4 });
      d.stroke("M78 62 L77 74 M80 62 V75 M82 62 L83 74", { sw: 1.7, color: P.gold[2] });
    }),
  ],
  [
    "🕐",
    "one o'clock",
    (d) => {
      d.circle(50, 50, 41, d.fill(P.blue), { sw: 3.5 });
      d.shine(29, 26, 8, 3.6, 0.6, -45);
      dial(d, 50, 50, 33, 1, 0);
    },
  ],
  [
    "🧮",
    "abacus",
    (p) => p.g("translate(0 -2.5)", (d) => {
      d.shadow(50, 92, 40, 4);
      for (const s of [-1, 1]) d.tube(`M${50 + s * 32} 82 L${50 + s * 35} 89`, P.wood[2], 4, 2.5);
      const rows: [Ramp, number][] = [[P.red, 3], [P.gold, 1], [P.green, 4], [P.blue, 2]];
      rows.forEach(([ramp, left], r) => {
        const y = 31 + r * 12;
        d.line(16, y, 84, y, { sw: 2.4, color: P.brown[2] });
        for (let i = 0; i < 5; i++) {
          const x = i < left ? 23 + i * 9.4 : 77 - (4 - i) * 9.4;
          d.ellipse(x, y, 4.6, 5.4, d.fill(ramp), { sw: 2 });
        }
      });
      d.raw(`<path d="${rr(8, 14, 84, 70, 7)} ${rr(16, 21, 68, 56, 3)}" fill="${d.fill(P.wood, "v")}" fill-rule="evenodd" stroke="${OL}" stroke-width="3.2" stroke-linejoin="round"/>`);
      d.shine(22, 17.5, 9, 1.6, 0.55, 0);
    }),
  ],
  [
    "📗",
    "green book",
    (d) => book(d, P.green),
  ],
  [
    "🕰️",
    "mantel clock",
    (d) => {
      d.shadow(50, 92, 40, 4);
      for (const x of [21, 79]) d.ellipse(x, 88, 6, 3.6, d.fill(P.gold), { sw: 2.2 });
      d.path(rr(10, 76, 80, 11, 4), d.fill(P.wood, "v"), { sw: 3 });
      const body = "M12 78 L12 68 C12 60 18 57 25 56 C26 32 37 18 50 18 C63 18 74 32 75 56 C82 57 88 60 88 68 L88 78 Z";
      d.path(body, d.fill(P.wood, "v"), { sw: 3.5 });
      d.stroke("M16 69 C17 64 21 62 26 61.5 M84 69 C83 64 79 62 74 61.5", { sw: 2, color: P.wood[2] });
      d.circle(50, 14, 3.6, d.fill(P.gold), { sw: 2.2 });
      d.circle(50, 50, 20.5, d.fill(P.gold), { sw: 3 });
      dial(d, 50, 50, 16, 10, 10);
      d.shine(33, 33, 3, 7, 0.5, 30);
    },
  ],
  [
    "📆",
    "tear-off calendar",
    (d) => {
      d.path(rr(13, 18, 74, 74, 8), d.fill(P.grey, "v"), { sw: 3 });
      d.stroke("M18 89 H82", { sw: 1.8, color: P.steel[2] });
      const page = "M21 14 H79 Q87 14 87 22 V66 L69 85 H21 Q13 85 13 77 V22 Q13 14 21 14 Z";
      d.path(page, d.fill(P.white, "v"), { sw: 3.5 });
      d.clip(page, (c) => c.rect(0, 0, 100, 33, 0, c.fill(P.blue, "v"), { stroke: null }));
      d.line(13, 33, 87, 33, { sw: 3 });
      d.path(page, "none", { sw: 3.5 });
      d.stroke("M31 50 L38 45 V74 M48 46 H66 L54 74", { sw: 7 });
      d.path("M87 66 Q76 66 72 73 Q70 79 69 85 Q73 75 87 66 Z", d.fill(P.grey, "d"), { sw: 2.6 });
      for (const x of [33, 67]) {
        d.ellipse(x, 24, 4.2, 3.6, P.blue[2], { stroke: null });
        d.tube(`M${x} 23 V11`, P.silver[1], 4, 2.5);
      }
      d.shine(25, 19.5, 7, 2.2, 0.45, -8);
    },
  ],
  [
    "⌨️",
    "keyboard",
    (d) => {
      d.shadow(50, 77, 42, 4);
      d.path(rr(8, 27, 84, 45, 8), d.fill(P.ink, "v"), { sw: 3.5 });
      const key = (x: number, y: number, w: number, ramp: Ramp = P.white) => {
        d.path(rr(x, y + 1.4, w, 6.4, 1.8), ramp[2], { stroke: null });
        d.path(rr(x, y, w, 6.4, 1.8), d.fill(ramp, "v"), { stroke: null });
      };
      for (let i = 0; i < 11; i++) key(13.3 + i * 6.7, 33, 5.3);
      for (let i = 0; i < 10; i++) key(16.3 + i * 6.7, 41.5, 5.3);
      for (let i = 0; i < 9; i++) key(19.3 + i * 6.7, 50, 5.3);
      key(79.6, 50, 6.8, P.green);
      key(13.3, 58.5, 9.6);
      key(26, 58.5, 48);
      key(77, 58.5, 9.6);
      d.shine(20, 30, 9, 1.4, 0.4, 0);
    },
  ],
  [
    "🖥️",
    "desktop computer",
    (d) => {
      d.shadow(50, 91, 30, 4);
      d.path("M43 66 L57 66 L60 82 L40 82 Z", d.fill(P.silver, "h"), { sw: 3 });
      d.path(rr(26, 80, 48, 9, 4.5), d.fill(P.silver, "v"), { sw: 3 });
      d.path(rr(8, 12, 84, 58, 7), d.fill(P.silver, "v"), { sw: 3.5 });
      const scr = rr(14, 18, 72, 45, 3.5);
      d.path(scr, d.fill(P.navy, "d"), { sw: 2.4 });
      const code: [number, number, number, Ramp][] = [[20, 26, 22, P.green], [46, 26, 12, P.gold], [26, 33, 30, P.pink], [26, 40, 16, P.sky], [46, 40, 20, P.gold], [26, 47, 26, P.green], [20, 54, 14, P.sky]];
      for (const [x, y, w, c] of code) d.line(x, y, x + w, y, { sw: 3.4, color: c[1] });
      d.clip(scr, (c) => c.path("M14 18 H40 L26 63 H14 Z", "#ffffff", { stroke: null, op: 0.12 }));
      d.shine(22, 14.6, 10, 1.6, 0.8, 0);
    },
  ],
  [
    "🎛️",
    "control knobs",
    (d) => {
      d.path(rr(8, 14, 84, 72, 10), d.fill(P.ink, "v"), { sw: 3.5 });
      const knobs: [Ramp, number, number][] = [[P.red, -50, 72], [P.gold, 25, 58], [P.teal, 80, 66]];
      knobs.forEach(([ramp, a, sy], i) => {
        const x = 27 + i * 23;
        d.circle(x, 35, 10, d.fill(ramp), { sw: 2.6 });
        d.line(x, 35, x + Math.sin(rad(a)) * 7, 35 - Math.cos(rad(a)) * 7, { sw: 2.8, color: "#ffffff" });
        d.line(x, 55, x, 77, { sw: 4.5, color: "#12152a" });
        d.path(rr(x - 7.5, sy - 4.5, 15, 9, 3), d.fill(P.silver, "v"), { sw: 2.4 });
        d.line(x - 4, sy, x + 4, sy, { sw: 1.8, color: P.steel[2] });
      });
      d.shine(20, 19, 9, 1.8, 0.35, 0);
    },
  ],
  [
    "📌",
    "push pin",
    (d) => {
      d.g("translate(-8.4 3.4) rotate(35 50 52)", (g) => {
        g.path("M48.4 60 L51.6 60 L50.5 89 Q50 91 49.5 89 Z", g.fill(P.silver, "h"), { sw: 2 });
        g.ellipse(50, 58, 17, 6, g.fill(P.red, "v"), { sw: 3 });
        g.path("M40 32 L41 57 L59 57 L60 32 Z", g.fill(P.red, "h"), { sw: 3 });
        g.path("M27 20 L27 28 Q27 37 50 37 Q73 37 73 28 L73 20 Z", g.fill(P.red, "v"), { sw: 3.5 });
        g.ellipse(50, 20, 23, 8.5, g.fill(P.red), { sw: 3.5 });
        g.shine(41, 17.5, 8, 2.4, 0.65, -6);
        g.shine(44, 44, 1.8, 7, 0.5, 0);
      });
    },
  ],
  [
    "🖱️",
    "computer mouse",
    (d) => {
      d.g("translate(0 1) rotate(-10 50 62)", (g) => {
        g.tube("M50 35 C49 23 60 26 67 20 C73 15 78 13 86 15", P.ink[1], 3, 2);
        const body = "M50 34 C69 34 74 49 74 64 C74 81 64 90 50 90 C36 90 26 81 26 64 C26 49 31 34 50 34 Z";
        g.path(body, g.fill(P.white), { sw: 3.5 });
        g.stroke("M27.5 59 Q50 64 72.5 59 M50 34.5 V61.5", { sw: 2.4 });
        g.path(rr(46, 40, 8, 14, 4), g.fill(P.ink, "v"), { sw: 2.2 });
        g.shine(35, 46, 3.6, 8, 0.8, 20);
      });
    },
  ],
  [
    "🗂️",
    "card dividers",
    (p) => p.g("translate(0 -2.5)", (d) => {
      const card = (y: number, tx: number, ramp: Ramp) => {
        d.path(`M12 ${y + 6} Q12 ${y} 18 ${y} H${tx} Q${tx + 2} ${y} ${tx + 3} ${y - 3} L${tx + 4} ${y - 7} Q${tx + 5} ${y - 10} ${tx + 8} ${y - 10} H${tx + 18} Q${tx + 21} ${y - 10} ${tx + 22} ${y - 7} L${tx + 23} ${y - 3} Q${tx + 24} ${y} ${tx + 26} ${y} H82 Q88 ${y} 88 ${y + 6} V84 Q88 89 83 89 H17 Q12 89 12 84 Z`, d.fill(ramp, "v"), { sw: 3 });
        d.shine(tx + 10, y - 6.5, 4, 1.4, 0.6, 0);
      };
      card(26, 58, P.blue);
      card(39, 37, P.red);
      card(52, 16, P.gold);
      d.path(rr(26, 64, 48, 12, 3), d.fill(P.cream, "v"), { sw: 2.4 });
    }),
  ],
  [
    "📩",
    "envelope with arrow",
    (d) => {
      d.path(rr(12, 46, 76, 44, 6), d.fill(P.steel, "v"), { sw: 3.5 });
      d.path("M14 48 L50 24 L86 48 Z", d.fill(P.white, "v"), { sw: 3 });
      d.tube("M50 13 V50", P.red[1], 8, 3);
      d.path("M35 49 L50 73 L65 49 Z", d.fill(P.red, "v"), { sw: 3 });
      d.path("M12 50 L50 70 L88 50 V84 Q88 90 82 90 H18 Q12 90 12 84 Z", d.fill(P.white, "v"), { sw: 3.5 });
      d.stroke("M15 87 L42 68 M85 87 L58 68", { sw: 2, color: P.white[2] });
      d.shine(22, 57, 6, 2, 0.8, 28);
    },
  ],
  [
    "📧",
    "email",
    (d) => {
      for (const [y, x0, x1] of [[39, 12, 21], [51, 9, 20], [63, 12, 21]]) d.line(x0, y, x1, y, { sw: 3.6 });
      d.g("rotate(-8 56 52)", (g) => envelope(g, 25, 29, 63, 46, P.sky));
    },
  ],
  [
    "🧾",
    "receipt",
    (d) => {
      d.g("rotate(-5 50 50)", (g) => {
        let s = "M26 13";
        for (let x = 26; x < 74; x += 6) s += ` L${x + 3} 9 L${x + 6} 13`;
        s += " L74 87";
        for (let x = 74; x > 26; x -= 6) s += ` L${x - 3} 91 L${x - 6} 87`;
        g.path(`${s} Z`, g.fill(P.white, "v"), { sw: 3.2 });
        g.line(40, 22, 60, 22, { sw: 3.6, color: P.steel[2] });
        for (let i = 0; i < 4; i++) {
          const y = 32 + i * 8;
          g.line(33, y, i % 2 ? 46 : 51, y, { sw: 2.6, color: P.steel[1] });
          g.line(59, y, 67, y, { sw: 2.6, color: P.steel[1] });
        }
        g.line(32, 64, 68, 64, { sw: 2, color: P.steel[1], dash: "3 3" });
        g.line(33, 73, 46, 73, { sw: 3.6, color: P.ink[1] });
        g.line(56, 73, 67, 73, { sw: 3.6, color: P.ink[1] });
      });
    },
  ],
  [
    "📁",
    "folder",
    (p) => p.g("translate(0 -4)", (d) => {
      d.path("M10 28 Q10 20 18 20 H36 Q40 20 42 23 L46 29 H82 Q90 29 90 37 V80 Q90 88 82 88 H18 Q10 88 10 80 Z", d.lin([[0, P.gold[1]], [1, P.gold[2]]]), { sw: 3.5 });
      d.path(rr(19, 31, 60, 36, 2), d.fill(P.white, "v"), { sw: 2.4 });
      d.stroke("M26 39 H56 M26 46 H66", { sw: 2.4, color: P.steel[1] });
      d.path("M8 45 Q8 40 13 40 H87 Q92 40 92 45 L89 83 Q88.5 88 83 88 H17 Q11.5 88 11 83 Z", d.fill(P.gold, "v"), { sw: 3.5 });
      d.shine(26, 46, 12, 2.4, 0.6, -4);
    }),
  ],
  [
    "💾",
    "floppy disk",
    (d) => {
      const body = "M18 12 H76 L88 24 V82 Q88 88 82 88 H18 Q12 88 12 82 V18 Q12 12 18 12 Z";
      d.path(body, d.fill(P.blue, "v"), { sw: 3.5 });
      d.path("M30 12 H70 V33 Q70 36 67 36 H33 Q30 36 30 33 Z", d.fill(P.silver, "h"), { sw: 3 });
      d.path(rr(54, 16, 9, 15, 2), d.fill(P.ink, "v"), { sw: 2 });
      d.path(rr(21, 48, 58, 36, 4), d.fill(P.white, "v"), { sw: 2.8 });
      d.stroke("M28 59 H72 M28 67 H72 M28 75 H58", { sw: 2.4, color: P.sky[1] });
      d.circle(20, 80, 2, P.blue[2], { stroke: null });
      d.shine(21, 22, 4, 6, 0.45, 20);
    },
  ],
  [
    "⏲️",
    "timer",
    (d) => {
      d.shadow(50, 92, 32, 4);
      for (const s of [-1, 1]) d.ellipse(50 + s * 22, 85, 7, 4.5, d.fill(P.teal, "v"), { sw: 2.4 });
      d.circle(50, 51, 37, d.fill(P.teal), { sw: 3.5 });
      d.shine(28, 30, 8, 3.6, 0.55, -45);
      d.circle(50, 53, 28, d.fill(P.white), { sw: 2.6 });
      const a = rad(130);
      d.path(`M50 53 L50 30 A23 23 0 0 1 ${50 + Math.sin(a) * 23} ${53 - Math.cos(a) * 23} Z`, d.fill(P.red), { sw: 2.2 });
      for (let i = 0; i < 12; i++) {
        const t = rad(i * 30);
        d.line(50 + Math.sin(t) * 24.5, 53 - Math.cos(t) * 24.5, 50 + Math.sin(t) * 27, 53 - Math.cos(t) * 27, { sw: i % 3 ? 1.8 : 2.6 });
      }
      d.circle(50, 53, 8.5, d.fill(P.teal), { sw: 2.6 });
      d.line(50, 53, 50 + Math.sin(a) * 6, 53 - Math.cos(a) * 6, { sw: 2.6, color: "#ffffff" });
      d.path("M45 15 L55 15 L50 23 Z", d.fill(P.red), { sw: 2 });
    },
  ],
  [
    "🗓️",
    "spiral calendar",
    (d) => {
      const body = rr(12, 20, 76, 70, 8);
      d.path(body, d.fill(P.white, "v"), { sw: 3.5 });
      d.clip(body, (c) => c.rect(0, 0, 100, 37, 0, c.fill(P.orange, "v"), { stroke: null }));
      d.line(12, 37, 88, 37, { sw: 3 });
      d.path(body, "none", { sw: 3.5 });
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 5; c++) {
          const hot = r === 1 && c === 3;
          d.path(rr(19.5 + c * 12.5, 44 + r * 13.5, 9, 9, 2.5), hot ? d.fill(P.green) : P.sky[0], hot ? { sw: 2 } : { stroke: null });
        }
      for (let i = 0; i < 7; i++) {
        const x = 20 + i * 10;
        d.ellipse(x, 28, 2.6, 2.4, P.orange[2], { stroke: null });
        d.tube(`M${x} 28 C${x - 4.5} 21 ${x - 3.5} 12 ${x + 1} 12 C${x + 4.5} 12 ${x + 4.5} 17 ${x + 2.8} 21`, P.silver[1], 2.4, 1.8);
      }
      d.shine(22, 31.5, 6, 1.6, 0.5, 0);
    },
  ],
  [
    "🕧",
    "half past twelve",
    (d) => {
      d.circle(50, 50, 41, d.fill(P.blue), { sw: 3.5 });
      d.shine(29, 26, 8, 3.6, 0.6, -45);
      dial(d, 50, 50, 33, 12, 30);
    },
  ],
  [
    "📻",
    "radio",
    (p) => p.g("translate(0 2)", (d) => {
      d.shadow(50, 91, 40, 4);
      d.tube("M70 34 L85 11", P.silver[1], 2.6, 1.8);
      d.circle(85.5, 10, 3.4, d.fill(P.silver), { sw: 2 });
      d.tube("M30 34 Q30 23 41 23 H59 Q70 23 70 34", P.ink[1], 4.5, 2.5);
      d.path(rr(8, 32, 84, 56, 12), d.fill(P.teal, "v"), { sw: 3.5 });
      const grille = "M14 60 a17 17 0 1 0 34 0 a17 17 0 1 0 -34 0 Z";
      d.path(grille, d.fill(P.cream), { sw: 2.8 });
      d.clip(grille, (c) => {
        for (let y = 46; y <= 74; y += 5) for (let x = 17 + ((y / 5) % 2) * 2.5; x <= 45; x += 5) c.circle(x, y, 1.5, P.teal[2], { stroke: null });
      });
      d.path(rr(55, 43, 28, 15, 3), d.fill(P.cream, "v"), { sw: 2.4 });
      for (let i = 0; i < 6; i++) d.line(59 + i * 4, 46, 59 + i * 4, i % 2 ? 49 : 51, { sw: 1.6, color: P.tan[2] });
      d.line(68, 45.5, 68, 56, { sw: 2.2, color: P.red[1] });
      for (const x of [61, 77]) {
        d.circle(x, 71, 6.5, d.fill(P.ink), { sw: 2.4 });
        d.line(x, 71, x, 66.5, { sw: 1.8, color: "#ffffff" });
      }
      d.shine(22, 37, 9, 2, 0.55, -6);
    }),
  ],
  [
    "📓",
    "notebook",
    (d) => {
      d.path(rr(25, 13, 57, 79, 6), d.fill(P.cream, "v"), { sw: 3 });
      d.stroke("M79 19 V86 M31 89 H76", { sw: 1.6, color: P.tan[2] });
      const cover = rr(18, 8, 58, 79, 7);
      d.path(cover, d.fill(P.black, "d"), { sw: 3.5 });
      d.clip(cover, (c) => {
        // The marbled board: a dense mottle of soft pale flecks on black.
        const rnd = (i: number, k: number) => Math.abs(Math.sin(i * k) * 43758.5453) % 1;
        for (let i = 0; i < 120; i++) {
          const x = 27 + rnd(i, 12.9898) * 52;
          const y = 7 + rnd(i, 78.233) * 82;
          const s = 0.8 + rnd(i, 39.425) * 1.9;
          c.path(lumpy(x, y, s * (1.2 + rnd(i, 7.13) * 0.9), s, 7, 0.24, i), i % 4 ? "#ffffff" : P.grey[2], { stroke: null, op: i % 4 ? 0.82 : 0.9, tf: `rotate(${Math.round(rnd(i, 3.71) * 180)} ${x.toFixed(1)} ${y.toFixed(1)})` });
        }
        c.rect(10, 0, 18, 100, 0, P.black[2], { stroke: null });
      });
      d.line(28, 9.8, 28, 85.2, { sw: 2.2 });
      d.path(rr(37, 23, 30, 18, 3.5), d.fill(P.white, "v"), { sw: 2.4 });
      d.stroke("M42 29.5 H62 M42 35 H55", { sw: 2.2, color: P.steel[1] });
      d.shine(41, 14.5, 9, 2.2, 0.4, -4);
    },
  ],
  [
    "📋",
    "clipboard",
    (d) => {
      d.path(rr(16, 14, 68, 78, 8), d.fill(P.wood, "v"), { sw: 3.5 });
      d.path(rr(23, 24, 54, 62, 3), d.fill(P.white, "v"), { sw: 2.6 });
      for (let i = 0; i < 3; i++) {
        const y = 40 + i * 14;
        d.path(rr(29, y - 4.5, 9, 9, 2), "#ffffff", { sw: 2.2 });
        if (i < 2) d.stroke(`M30.5 ${y} L33.2 ${y + 3} L39 ${y - 4.5}`, { sw: 2.8, color: P.green[2] });
        d.line(44, y, i === 2 ? 60 : 70, y, { sw: 2.6, color: P.steel[1] });
      }
      d.path("M35 20 Q35 15 40 15 H43.5 Q43.5 7 50 7 Q56.5 7 56.5 15 H60 Q65 15 65 20 V26 Q65 30 61 30 H39 Q35 30 35 26 Z", d.fill(P.silver, "v"), { sw: 3 });
      d.circle(50, 13.5, 2.6, P.steel[2], { sw: 1.8 });
      d.shine(22, 22, 3, 6, 0.4, 20);
    },
  ],
  [
    "🖋️",
    "fountain pen",
    (d) => {
      d.g("translate(15 85) rotate(-45)", (g) => {
        const h = 8.5;
        g.path("M0 0 Q9 -6.5 23 -7.5 L23 7.5 Q9 6.5 0 0 Z", g.fill(P.gold, "v"), { sw: 2.6 });
        g.stroke("M3 0 H13", { sw: 1.8 });
        g.circle(14.8, 0, 1.9, OL, { stroke: null });
        g.path(rr(22, -6.5, 9, 13, 2), g.fill(P.ink, "v"), { sw: 2.6 });
        g.path(rr(30, -h - 0.6, 5.5, h * 2 + 1.2, 1.5), g.fill(P.gold, "v"), { sw: 2.4 });
        g.path(`M35 ${-h} H86 Q94 ${-h} 94 0 Q94 ${h} 86 ${h} H35 Z`, g.fill(P.purple, "v"), { sw: 3 });
        g.path(rr(56, -h - 4.5, 30, 5, 2.5), g.fill(P.gold, "v"), { sw: 2.4 });
        g.line(88, -h + 1.5, 88, h - 1.5, { sw: 2, color: P.gold[1] });
        g.shine(48, -h * 0.4, 10, 1.6, 0.6, 0);
      });
    },
  ],
];
