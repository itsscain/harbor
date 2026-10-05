// Things at home: furniture, clothes, cleaning, the bathroom and the kitchen cupboard.

import { OL, P, drop, rr, softStar, type Pen } from "../pen";
import type { PicDef } from "..";

/** An ellipse as a path; `cw = false` winds it the other way, so it cuts a hole in a shape it's added to. */
function oval(cx: number, cy: number, rx: number, ry: number, cw = true) {
  const s = cw ? 1 : 0;
  return `M${cx - rx} ${cy} A${rx} ${ry} 0 1 ${s} ${cx + rx} ${cy} A${rx} ${ry} 0 1 ${s} ${cx - rx} ${cy} Z`;
}

/** A soap bubble: pale and glassy, with a white glint. */
function bubble(d: Pen, x: number, y: number, r: number) {
  d.circle(x, y, r, d.rad([[0, "#ffffff"], [0.55, "#eaf8ff"], [0.85, "#bfe6ff"], [1, "#d5c6ff"]], 0.4, 0.35, 0.75), { sw: r > 7 ? 2.4 : 2 });
  d.stroke(`M${x - r * 0.6} ${y + r * 0.05} Q${x - r * 0.58} ${y - r * 0.5} ${x - r * 0.1} ${y - r * 0.62}`, { color: "#ffffff", sw: Math.max(1.6, r * 0.24) });
}

export const HOME: PicDef[] = [
  [
    "🚪",
    "door",
    (d) => {
      d.shadow(50, 92, 40);
      d.path(rr(12, 85, 76, 8, 3), d.fill(P.stone, "v"), { sw: 3 });
      d.path("M19 87 V14 Q19 8 25 8 H75 Q81 8 81 14 V87 Z", d.fill(P.cream, "v"), { sw: 3.5 });
      d.path("M27 87 V19 Q27 15 31 15 H69 Q73 15 73 19 V87 Z", d.fill(P.wood, "h"), { sw: 3 });
      const inset = d.lin([[0, P.wood[2]], [0.25, P.wood[1]], [1, P.wood[0]]]);
      for (const [x, y] of [[33, 21], [52, 21], [33, 56], [52, 56]]) d.path(rr(x, y, 15, 25, 3), inset, { stroke: P.wood[2], sw: 2.2 });
      d.ball(66, 51, 4.4, P.gold, { sw: 2.2 });
      d.shine(30.5, 34, 2.2, 10, 0.45, 0);
    },
  ],
  [
    "📦",
    "cardboard box",
    (d) => d.g("translate(0 -3)", (d) => {
      d.shadow(50, 91, 42);
      d.path("M64 40 L90 25 L90 75 L64 90 Z", d.lin([[0, P.wood[1]], [1, P.wood[2]]], 0, 0, 1, 0), { sw: 2.6 });
      d.path("M10 40 L64 40 L64 90 L10 90 Z", d.lin([[0, P.wood[0]], [1, P.wood[1]]]), { sw: 2.6 });
      d.path("M10 40 L36 25 L90 25 L64 40 Z", d.lin([[0, P.tan[1]], [1, P.wood[0]]], 0, 0, 1, 1), { sw: 2.6 });
      d.path("M33 40 L41 40 L67 25 L59 25 Z", P.sand[0], { sw: 2 });
      d.path("M33 40 H41 V60 H33 Z", P.sand[1], { sw: 2 });
      d.path("M10 40 L36 25 L90 25 L90 75 L64 90 L10 90 Z", "none", { sw: 3.5 });
      d.shine(20, 49, 6, 2.2, 0.5, 0);
    }),
  ],
  [
    "🧥",
    "coat",
    (d) => {
      const c = P.red;
      const sleeve = "M38 16 Q24 17 20 30 L9 70 Q8 77 14 78 L22 79 Q27 79 28 74 L33 46 Z";
      const drawSleeve = (g: Pen) => {
        g.path(sleeve, g.fill(c, "v"), { sw: 3 });
        g.clip(sleeve, (k) => {
          k.stroke("M12 40 L36 46 M8 56 L34 61", { color: c[2], sw: 2.2 });
          k.path("M4 67 L34 73 L34 90 L4 90 Z", c[2], { stroke: OL, sw: 2.4 });
        });
        g.path(sleeve, "none", { sw: 3 });
      };
      drawSleeve(d);
      d.mirror(50, drawSleeve);
      const body = "M38 13 Q50 19 62 13 L72 19 Q77 26 72 46 L76 85 Q76 90 71 90 L29 90 Q24 90 24 85 L28 46 Q23 26 28 19 Z";
      d.path(body, d.fill(c, "v"), { sw: 3.5 });
      d.clip(body, (k) => {
        for (const y of [40, 57, 74]) k.stroke(`M20 ${y} Q50 ${y + 4} 80 ${y}`, { color: c[2], sw: 2.2 });
      });
      d.path("M36 21 L36 11 Q50 4 64 11 L64 21 Q50 27 36 21 Z", d.fill(c, "v"), { sw: 2.8 });
      d.path("M39 12.5 Q50 7 61 12.5 Q50 17 39 12.5 Z", c[2], { sw: 2 });
      d.tube("M50 17 V89", P.silver[1], 3, 1.6);
      d.path(rr(46.5, 19, 7, 11, 2.5), d.fill(P.silver, "v"), { sw: 2 });
      d.shine(35, 32, 3.5, 8, 0.45, 15);
    },
  ],
  [
    "🧺",
    "basket",
    (d) => {
      d.shadow(50, 92, 38);
      d.tube("M22 50 Q22 10 50 10 Q78 10 78 50", P.wood[1], 7, 3);
      d.stroke("M22 50 Q22 10 50 10 Q78 10 78 50", { color: P.wood[2], sw: 2, dash: "3 5" });
      const body = "M12 50 L88 50 L80 85 Q78 91 71 91 L29 91 Q22 91 20 85 Z";
      d.path(body, d.fill(P.wood, "v"), { sw: 3.5 });
      d.clip(body, (k) => {
        for (let r = 0; r < 5; r++) {
          const y = 57 + r * 8;
          for (let i = -1; i < 10; i++) k.ellipse(8 + i * 11 + (r % 2 ? 5.5 : 0), y, 5, 3.2, P.wood[0], { stroke: P.wood[2], sw: 1.6 });
        }
      });
      d.path(body, "none", { sw: 3.5 });
      const rim = rr(8, 43, 84, 11, 5.5);
      d.path(rim, d.fill(P.wood, "v"), { sw: 3 });
      d.clip(rim, (k) => {
        for (let x = 4; x < 96; x += 6) k.stroke(`M${x} 54 L${x + 6} 43`, { color: P.wood[2], sw: 1.8 });
      });
      d.path(rim, "none", { sw: 3 });
      d.shine(22, 46.5, 6, 1.8, 0.55, 0);
    },
  ],
  [
    "🧼",
    "soap",
    (d) => {
      d.shadow(50, 90, 38);
      d.path(rr(12, 52, 76, 36, 17), d.fill(P.pink, "v"), { sw: 3.5 });
      d.path(rr(16, 53.5, 68, 25, 12.5), d.fill(P.rose), { stroke: P.pink[2], sw: 2 });
      d.ellipse(50, 66, 19, 6.5, "none", { stroke: P.pink[2], sw: 2 });
      d.shine(29, 59, 7, 2.4, 0.65, -5);
      for (const [x, y, r] of [[30, 38, 9], [53, 25, 12.5], [75, 41, 7.5], [64, 48, 4.5], [37, 15, 5]]) bubble(d, x, y, r);
    },
  ],
  [
    "🧦",
    "sock",
    (d) => d.g("translate(-6 0)", (d) => {
      const sock = "M27 10 L57 10 L57 52 Q58 60 67 61 L79 62 Q92 63 92 75 Q92 88 78 88 L42 88 Q20 88 22 66 Z";
      d.path(sock, d.fill(P.sky, "v"), { sw: 3.5 });
      d.clip(sock, (k) => {
        k.path("M10 6 H70 V22 H10 Z", d.fill(P.white, "v"), { stroke: OL, sw: 2.4 });
        for (let x = 32; x < 57; x += 5) k.stroke(`M${x} 11 V20`, { color: P.grey[2], sw: 1.8 });
        for (const y of [29, 41]) k.path(`M10 ${y} H70 V${y + 6} H10 Z`, P.gold[1], { stroke: P.gold[2], sw: 1.6 });
        k.path("M8 64 Q26 62 34 74 Q39 84 35 96 H8 Z", d.fill(P.gold), { stroke: OL, sw: 2.4 });
        k.path("M77 52 Q71 72 79 96 H100 V52 Z", d.fill(P.gold), { stroke: OL, sw: 2.4 });
      });
      d.path(sock, "none", { sw: 3.5 });
      d.shine(33, 54, 2.6, 8, 0.5, 0);
    }),
  ],
  [
    "🛏️",
    "bed",
    (d) => {
      d.shadow(50, 91, 44);
      for (const x of [11, 82]) d.rect(x, 82, 7, 9, 2, P.wood[2], { sw: 2.5 });
      d.path(rr(16, 64, 68, 14, 4), d.fill(P.wood, "v"), { sw: 3 });
      d.path(rr(20, 51, 60, 15, 6), d.fill(P.white, "v"), { sw: 3 });
      const blanket = "M43 45 Q62 42 82 45 L82 76 Q62 79 43 76 Q40 60 43 45 Z";
      d.path(blanket, d.fill(P.blue, "v"), { sw: 3 });
      d.clip(blanket, (k) => {
        for (const [x, y, r] of [[61, 56, 4.5], [74, 66, 3.6], [56, 69, 3.2], [74, 52, 3]]) k.path(softStar(x, y, r), P.lemon[1], { stroke: null });
      });
      d.stroke("M49 46 Q47 61 49 76", { color: P.blue[2], sw: 2.2 });
      d.path(rr(8, 16, 16, 70, 8), d.fill(P.wood, "h"), { sw: 3.5 });
      d.path("M25 42 Q24 37 30 37.5 L41 38 Q47 38 46.5 43 L46 48 Q46 53 40 53 L30 53 Q24 53 24.5 48 Z", d.fill(P.white), { sw: 3 });
      d.path(rr(78, 42, 14, 44, 7), d.fill(P.wood, "h"), { sw: 3.5 });
      d.shine(13, 28, 2.2, 7, 0.5, 0);
      d.shine(31, 41.5, 5, 1.8, 0.8, -3);
    },
  ],
  [
    "🪥",
    "toothbrush",
    (d) => {
      d.g("rotate(-32 50 50) translate(-5 -3.5)", (g) => {
        const handle = "M12 60 Q12 54 18 54 L54 55 Q62 56 66 59 L90 59 Q94 59 94 63.5 Q94 68 90 68 L66 68 Q62 71 54 72 L18 73 Q12 73 12 67 Z";
        g.path(handle, g.fill(P.teal, "v"), { sw: 3.2 });
        g.path(rr(20, 59, 30, 9, 4.5), g.fill(P.lime, "v"), { stroke: P.teal[2], sw: 2 });
        const bristles = rr(69, 44, 23, 16, 3);
        g.path(bristles, g.fill(P.white, "h"), { sw: 2.6 });
        g.clip(bristles, (k) => {
          k.path("M60 40 H100 V49 H60 Z", P.sky[1], { stroke: null });
          for (const x of [74.5, 80.5, 86.5]) k.stroke(`M${x} 44 V60`, { color: P.grey[2], sw: 1.8 });
        });
        g.path(bristles, "none", { sw: 2.6 });
        g.path("M67 45 Q67 37 74 38 Q79 32 86 36 Q94 35 94 43 Q94 47 88 47 L72 47 Q67 47 67 45 Z", g.fill(P.white), { sw: 2.6 });
        g.stroke("M71 43 Q78 39 85 41 Q89 42 91 40", { color: P.red[1], sw: 2.6 });
      });
      d.shine(26, 64, 7, 2.2, 0.55, -32);
    },
  ],
  [
    "📺",
    "TV",
    (d) => {
      d.shadow(50, 92, 36);
      d.tube("M50 24 L31 9", P.silver[2], 2.4, 2);
      d.tube("M50 24 L70 8", P.silver[2], 2.4, 2);
      d.ball(31, 9, 3.6, P.red, { sw: 2 });
      d.ball(70, 8, 3.6, P.red, { sw: 2 });
      d.path("M40 30 Q40 19 50 19 Q60 19 60 30 Z", d.fill(P.ink), { sw: 2.5 });
      d.tube("M24 82 L19 91", P.ink[1], 4, 2.5);
      d.tube("M76 82 L81 91", P.ink[1], 4, 2.5);
      d.path(rr(8, 28, 84, 58, 13), d.fill(P.coral, "v"), { sw: 3.5 });
      d.path(rr(14, 34, 57, 46, 11), d.fill(P.ink), { sw: 2.5 });
      const screen = rr(18.5, 38.5, 48, 37, 9);
      d.path(screen, d.rad([[0, "#f2fcff"], [0.45, P.sky[1]], [1, P.blue[2]]], 0.38, 0.35, 0.85), { sw: 2 });
      d.clip(screen, (k) => {
        k.path("M14 64 L40 34 L50 34 L14 74 Z", "#ffffff", { stroke: null, op: 0.45 });
        k.path("M52 34 L56 34 L22 80 L18 80 Z", "#ffffff", { stroke: null, op: 0.3 });
      });
      for (const y of [46, 61]) {
        d.circle(81.5, y, 5.5, d.fill(P.cream), { sw: 2.4 });
        d.line(81.5, y - 4.5, 81.5, y, { sw: 2.2 });
      }
      for (const y of [71, 75.5]) d.line(76.5, y, 86.5, y, { sw: 2, color: P.coral[2] });
      d.shine(30, 31.5, 10, 1.6, 0.55, 0);
    },
  ],
  [
    "🧹",
    "broom",
    (d) => {
      d.g("translate(54 47) rotate(38) scale(0.93) translate(-50 -51)", (g) => {
        g.path(rr(45.5, 2, 9, 54, 4.5), g.fill(P.wood, "h"), { sw: 3 });
        const straw = "M38 56 L62 56 Q70 74 75 92 Q72 96 68 93 Q65 97 61 94 Q58 98 54 95 Q50 99 46 95 Q42 98 39 94 Q35 97 32 93 Q28 96 25 92 Q30 74 38 56 Z";
        g.path(straw, g.fill(P.gold, "v"), { sw: 3.2 });
        g.clip(straw, (k) => {
          for (const x of [-16, -8, 0, 8, 16]) k.stroke(`M${50 + x * 0.45} 60 L${50 + x * 1.35} 96`, { color: P.gold[2], sw: 2 });
        });
        g.path("M32 68 Q50 72 68 68 L70 75 Q50 79 30 75 Z", g.fill(P.red, "v"), { sw: 2.4 });
        g.path(rr(36, 50, 28, 10, 3), g.fill(P.red, "v"), { sw: 2.6 });
      });
      d.shine(64, 24, 1.8, 7, 0.55, 38);
    },
  ],
  [
    "🛋️",
    "couch",
    (d) => {
      const c = P.teal;
      d.shadow(50, 90, 44);
      for (const x of [15, 78]) d.rect(x, 80, 7, 10, 2, P.wood[2], { sw: 2.5 });
      d.path(rr(12, 24, 76, 46, 14), d.fill(c, "v"), { sw: 3.5 });
      for (const x of [19.5, 50.5]) d.path(rr(x, 30, 30, 32, 10), d.fill(c), { sw: 2.4 });
      d.path(rr(15, 69, 70, 15, 5), d.fill(c, "v"), { sw: 3 });
      for (const x of [19, 50]) d.path(rr(x, 58, 31, 15, 7), d.fill(c, "v"), { sw: 2.6 });
      d.path(rr(25, 44, 17, 17, 5), d.fill(P.gold), { sw: 2.6, tf: "rotate(-14 33.5 52.5)" });
      d.circle(33.5, 52.5, 1.8, P.gold[2], { stroke: null });
      for (const x of [6, 76]) d.path(rr(x, 45, 18, 39, 9), d.fill(c, "h"), { sw: 3.2 });
      d.shine(26, 34, 3, 6, 0.5, 10);
      d.shine(12, 54, 1.8, 6, 0.5, 0);
    },
  ],
  [
    "👟",
    "shoe",
    (d) => d.g("translate(50 55) scale(0.9) translate(-51 -59.5)", (d) => {
      d.shadow(50, 91, 44);
      d.path("M31 48 Q33 38 38 34 Q43 30 49 32 Q54 34 53 39 Q61 48 74 53 L69 62 Q52 56 34 50 Z", d.fill(P.sky, "v"), { sw: 3 });
      const upper = "M9 77 L9 46 Q9 39 16 39 Q26 40 32 47 L36 46.5 Q51 52 66 59 Q84 63 90 67 Q94 71 92 77 Z";
      d.path(upper, d.fill(P.blue, "v"), { sw: 3.5 });
      d.clip(upper, (k) => {
        k.path("M72 60 Q86 62 96 70 V80 H66 Q64 66 72 60 Z", d.fill(P.white, "v"), { stroke: OL, sw: 2.4 });
        k.path(rr(2, 36, 11, 18, 4), P.gold[1], { stroke: OL, sw: 2.4 });
      });
      d.path(upper, "none", { sw: 3.5 });
      d.tube("M20 69 Q38 67 54 58", P.gold[1], 4.5, 2);
      for (const [x, y] of [[41, 48.5], [49, 52], [57, 55.5]]) d.tube(`M${x} ${y} L${x + 4} ${y - 8}`, "#ffffff", 3, 1.8);
      d.path("M5 75 H93 Q97 75 96 80 Q95 88 85 88 H13 Q5 88 5 82 Z", d.fill(P.white, "v"), { sw: 3.2 });
      d.stroke("M9 81.5 H92", { color: P.grey[2], sw: 2.2 });
      d.shine(18, 46, 3, 6, 0.5, 20);
    }),
  ],
  [
    "🚰",
    "faucet",
    (d) => {
      d.path("M12 68 Q14 92 50 92 Q86 92 88 68 Z", d.fill(P.white, "v"), { sw: 3.5 });
      d.ellipse(50, 68, 38, 8, d.fill(P.white, "v"), { sw: 3 });
      d.ellipse(50, 69, 31, 5, d.lin([[0, P.sky[0]], [1, P.sky[1]]]), { stroke: P.sky[2], sw: 2 });
      d.path(rr(8, 14, 10, 30, 4), d.fill(P.steel, "h"), { sw: 3 });
      d.path("M16 22 H52 Q66 22 66 36 V44 H54 V39 Q54 34 50 34 H16 Z", d.fill(P.silver, "v"), { sw: 3.2 });
      d.path(rr(52, 43, 16, 6, 2.5), d.fill(P.steel, "v"), { sw: 2.5 });
      d.rect(31, 13, 7, 10, 2, d.fill(P.steel, "h"), { sw: 2.5 });
      d.tube("M23 12 H46", P.silver[1], 5, 2.5);
      d.circle(34.5, 12, 4, d.fill(P.blue), { sw: 2.2 });
      d.path("M56 49 H64 Q64 60 66 68 Q60 72 54 68 Q56 60 56 49 Z", d.fill(P.sky, "h"), { sw: 2.4 });
      d.stroke("M58.5 52 V63", { color: "#ffffff", sw: 2, op: 0.85 });
      d.path("M47 64 Q44 60 46 57 Q49 60 47 64 Z M73 64 Q76 60 74 57 Q71 60 73 64 Z", P.sky[1], { sw: 1.8 });
      d.shine(28, 25.5, 9, 1.8, 0.75, 0);
      d.shine(26, 76, 6, 2.5, 0.6, -10);
    },
  ],
  [
    "🧤",
    "gloves",
    (d) => d.g("translate(0 -3)", (d) => {
      const c = P.violet;
      const glove = (g: Pen) => {
        const p = "M23 72 L19 60 L11 49 A4.6 4.6 0 0 1 18 43.5 L22 48 L22 30 A3.6 3.6 0 0 1 29.2 30 L29.2 24 A3.6 3.6 0 0 1 36.4 24 L36.4 28 A3.6 3.6 0 0 1 43.6 28 L43.6 36 A3.2 3.2 0 0 1 50 36 L50 62 Q50 68 48 72 Z";
        g.path(p, g.fill(c), { sw: 3.2 });
        g.stroke("M29.2 30 V43 M36.4 28 V43 M43.6 36 V45", { color: c[2], sw: 2 });
        const cuff = rr(19, 66, 32, 24, 7);
        g.path(cuff, g.fill(P.cream, "v"), { sw: 3 });
        g.clip(cuff, (k) => {
          for (let x = 24; x < 50; x += 5) k.stroke(`M${x} 68 V88`, { color: P.cream[2], sw: 2 });
        });
        g.path(cuff, "none", { sw: 3 });
        g.shine(27, 47, 2.4, 6, 0.5, 10);
      };
      d.g("rotate(-5 34 80)", glove);
      d.mirror(50, (m) => m.g("rotate(-5 34 80)", glove));
    }),
  ],
  [
    "🪟",
    "window",
    (d) => {
      d.path(rr(11, 8, 78, 74, 6), d.fill(P.white, "v"), { sw: 3.5 });
      for (const [x, y] of [[18, 15], [53, 15], [18, 48], [53, 48]]) {
        const pane = rr(x, y, 29, 28, 3);
        d.path(pane, d.lin([[0, P.sky[0]], [1, P.sky[1]]], 0, 0, 1, 1), { sw: 2.5 });
        d.clip(pane, (k) => {
          k.path(`M${x - 2} ${y + 16} L${x + 14} ${y - 2} L${x + 20} ${y - 2} L${x - 2} ${y + 22} Z`, "#ffffff", { stroke: null, op: 0.55 });
          k.path(`M${x + 24} ${y - 2} L${x + 27} ${y - 2} L${x + 4} ${y + 30} L${x + 1} ${y + 30} Z`, "#ffffff", { stroke: null, op: 0.4 });
        });
      }
      d.path(rr(6, 80, 88, 10, 4), d.fill(P.wood, "v"), { sw: 3 });
      d.shine(16, 11.5, 6, 1.4, 0.6, 0);
    },
  ],
  [
    "🧴",
    "lotion bottle",
    (d) => {
      d.shadow(53, 92, 27);
      d.path(rr(25, 12, 22, 7, 3.5), d.fill(P.white, "v"), { sw: 2.4 });
      d.path(rr(42, 8, 25, 12, 4), d.fill(P.white, "v"), { sw: 2.6 });
      d.rect(50, 19, 9, 9, 1.5, d.fill(P.silver, "h"), { sw: 2.2 });
      d.path(rr(43, 27, 23, 12, 3), d.fill(P.white, "v"), { sw: 2.6 });
      for (const x of [49, 54.5, 60]) d.line(x, 29.5, x, 36.5, { color: P.grey[2], sw: 1.6 });
      const body = "M31 48 Q31 38 41 38 H68 Q78 38 78 48 V84 Q78 92 70 92 H39 Q31 92 31 84 Z";
      d.path(body, d.fill(P.orange, "h"), { sw: 3.5 });
      d.path(rr(39, 52, 31, 28, 6), d.fill(P.cream, "v"), { stroke: P.orange[2], sw: 2 });
      d.path(drop(54.5, 68, 5.5), d.fill(P.sky), { sw: 2.2 });
      d.shine(37, 52, 2.6, 9, 0.55, 0);
    },
  ],
  [
    "🥾",
    "boot",
    (d) => {
      d.shadow(50, 92, 44);
      d.path("M35 12 Q36 6 43 6 Q50 7 50 14 L52 42 Q55 52 67 57 L60 63 Q46 57 43 45 Z", d.fill(P.tan, "v"), { sw: 3 });
      const upper = "M11 80 L13 22 Q13 14 21 14 L37 14 Q41 14 41 20 L43 42 Q46 54 62 60 L82 63 Q93 66 93 74 L93 80 Z";
      d.path(upper, d.fill(P.wood, "v"), { sw: 3.5 });
      d.clip(upper, (k) => {
        k.path("M68 60 Q86 61 98 68 V84 H60 Q60 66 68 60 Z", d.fill(P.brown, "v"), { stroke: OL, sw: 2.4 });
        k.path("M4 48 Q22 52 25 68 V84 H4 Z", d.fill(P.brown, "v"), { stroke: OL, sw: 2.4 });
      });
      d.path(upper, "none", { sw: 3.5 });
      d.path(rr(10, 9, 34, 11, 5.5), d.fill(P.red, "v"), { sw: 3 });
      for (const [x, y] of [[42, 27], [43, 36], [46, 46], [53, 54]]) {
        d.tube(`M${x} ${y} L${x + 7} ${y - 5}`, P.red[1], 2.6, 1.8);
        d.circle(x, y, 2.2, d.fill(P.silver), { sw: 1.8 });
      }
      d.path("M7 78 H90 Q96 78 95 84 Q94 92 86 92 H14 Q7 92 7 86 Z", d.fill(P.ink, "v"), { sw: 3.2 });
      d.stroke("M10 82.5 H93", { color: P.tan[1], sw: 2.5 });
      d.shine(19, 30, 2.6, 9, 0.45, 0);
    },
  ],
  [
    "💍",
    "ring",
    (d) => {
      d.path(`${oval(50, 64, 32, 25)} ${oval(50, 66.5, 23, 16.5, false)}`, d.fill(P.gold, "d"), { sw: 3.5 });
      d.clip(oval(50, 66.5, 23, 16.5), (k) => k.path(`${oval(50, 66.5, 23, 16.5)} ${oval(50, 71, 23, 16.5, false)}`, P.gold[2], { stroke: null }));
      d.path(oval(50, 66.5, 23, 16.5), "none", { sw: 2.6 });
      d.stroke("M22 56 Q26 46 38 42", { color: "#ffffff", sw: 3, op: 0.7 });
      d.path("M40 38 L60 38 L56 48 Q50 51 44 48 Z", d.fill(P.gold, "v"), { sw: 2.6 });
      d.path("M35 30 L42.5 21 H57.5 L65 30 L50 47 Z", d.lin([[0, "#ffffff"], [0.45, P.sky[0]], [1, P.sky[1]]], 0, 0, 1, 1), { sw: 2.8 });
      d.stroke("M35 30 H65 M42.5 21 L46.5 30 L50 21 L53.5 30 L57.5 21 M46.5 30 L50 47 L53.5 30", { color: P.sky[2], sw: 1.6 });
      d.path("M42.5 21 H50 L46.5 30 H35 Z", "#ffffff", { stroke: null, op: 0.6 });
      d.sparkle(73, 22, 7);
      d.sparkle(26, 30, 4.5);
    },
  ],
  [
    "🪑",
    "chair",
    (d) => {
      const w = P.wood;
      d.shadow(50, 92, 38);
      for (const x of [27, 66]) d.path(rr(x, 12, 7, 74, 3.5), d.fill(w, "h"), { sw: 3 });
      for (const x of [40, 54]) d.path(rr(x, 20, 6, 38, 2), d.fill(w, "h"), { sw: 2.4 });
      d.path("M23 14 Q50 6 77 14 L77 22 Q50 15 23 22 Z", d.fill(w, "v"), { sw: 3 });
      d.path("M25 55 H75 L88 67 H12 Z", d.lin([[0, w[0]], [1, w[1]]]), { sw: 3 });
      d.path(rr(11, 66, 78, 8, 3), d.fill(w, "v"), { sw: 3 });
      for (const x of [14, 78]) d.path(rr(x, 72, 8, 20, 3), d.fill(w, "h"), { sw: 3 });
      d.shine(36, 12.5, 7, 1.5, 0.55, -8);
      d.shine(30, 59.5, 8, 1.6, 0.5, 0);
    },
  ],
  [
    "🛁",
    "bathtub",
    (d) => d.g("translate(50 53) scale(0.94) translate(-50 -55)", (d) => {
      d.shadow(50, 92, 40);
      for (const x of [24, 76]) d.path(`M${x - 5.5} 80 L${x + 5.5} 80 L${x + 3.5} 90 Q${x} 93 ${x - 3.5} 90 Z`, d.fill(P.gold), { sw: 2.4 });
      d.tube("M85 50 V31 Q85 23 77 23 Q71 23 71 29", P.silver[1], 5, 2.5);
      for (const [x, y, r] of [[18, 45, 7.5], [29, 38, 10], [44, 35, 11], [72, 40, 9], [84, 46, 5.5]]) d.circle(x, y, r, d.fill(P.white), { sw: 2.4 });
      d.path("M51 40 Q50 31 60 32 Q68 32 70 37 Q72 43 61 44 Q51 44 51 40 Z", d.fill(P.gold), { sw: 2.4 });
      d.circle(55, 28, 5.6, d.fill(P.gold), { sw: 2.4 });
      d.path("M50 28 Q46 28.5 46.5 30.5 Q48 31.5 51 30.5 Z", P.orange[1], { sw: 1.8 });
      d.circle(54, 26.5, 1.3, OL, { stroke: null });
      d.circle(58, 40, 7, d.fill(P.white), { sw: 2.4 });
      const tub = "M8 50 H92 Q92 86 70 86 H30 Q8 86 8 50 Z";
      d.path(tub, d.fill(P.sky, "v"), { sw: 3.5 });
      d.path(rr(4, 45, 92, 9, 4.5), d.fill(P.white, "v"), { sw: 3 });
      d.shine(22, 62, 8, 3, 0.55, -10);
    }),
  ],
  [
    "🧻",
    "toilet paper",
    (d) => {
      d.shadow(50, 92, 36);
      const roll = "M20 26 V74 A30 9.5 0 0 0 80 74 V26 Z";
      d.path(roll, d.lin([[0, "#ffffff"], [0.55, "#f2f6fa"], [1, "#c6d0dc"]], 0, 0, 1, 0), { sw: 3.5 });
      d.ellipse(50, 26, 30, 9.5, d.lin([[0, "#ffffff"], [1, "#e8eef5"]]), { sw: 3 });
      d.ellipse(50, 26, 10, 3.8, d.lin([[0, P.wood[2]], [1, P.wood[1]]]), { sw: 2.2 });
      const tail = "M54 56 Q67 57 80 52 V86 Q67 91 54 89 Z";
      d.path(tail, d.lin([[0, "#ffffff"], [1, "#dfe6ee"]], 0, 0, 1, 0), { sw: 3 });
      d.stroke("M56 72 Q67 74 78 69.5", { color: P.grey[2], sw: 2, dash: "2.5 3" });
      d.shine(28, 44, 2.6, 11, 0.9, 0);
    },
  ],
  [
    "🕶️",
    "sunglasses",
    (d) => d.g("translate(50 47) scale(0.9) translate(-50 -47)", (d) => {
      const frame = "M8 36 Q8 29 15 29 H41 Q47 29 46.5 35 L44.5 53 Q43 64 32 64 H24 Q10 64 9 51 Z";
      const lens = "M13.5 37 Q13.5 34 17 34 H39 Q42 34 41.7 37 L40 52 Q39 59 32 59 H25 Q15.5 59 14.8 51 Z";
      const side = (g: Pen) => {
        g.tube("M9 33 L4 31", P.black[1], 3.5, 2.4);
        g.path(frame, g.fill(P.black, "v"), { sw: 3 });
        g.path(lens, g.lin([[0, "#737c9e"], [0.5, "#383d58"], [1, "#1b1e2f"]], 0, 0, 0.6, 1), { stroke: null });
        g.clip(lens, (k) => {
          k.path("M12 50 L29 31 L35 31 L12 57 Z", "#ffffff", { stroke: null, op: 0.45 });
          k.path("M33 60 L43 47 L43 51 L37 60 Z", "#ffffff", { stroke: null, op: 0.3 });
        });
      };
      side(d);
      d.mirror(50, side);
      d.tube("M45 36 Q50 31 55 36", P.black[1], 3.6, 2.6);
      d.shine(18, 31.5, 5, 1.2, 0.5, 0);
      d.shine(62, 31.5, 5, 1.2, 0.5, 0);
    }),
  ],
  [
    "🧽",
    "sponge",
    (d) => {
      d.shadow(50, 91, 40);
      d.path("M78 52 L90 42 V76 Q90 80 87 82 L78 88 Z", d.lin([[0, P.gold[1]], [1, P.gold[2]]], 0, 0, 1, 0), { sw: 2.6 });
      d.path("M12 52 H78 V88 H16 Q12 88 12 84 Z", d.fill(P.gold), { sw: 2.6 });
      for (const [x, y, rx, ry] of [[22, 62, 3, 2.4], [35, 72, 2.4, 2], [50, 60, 3.4, 2.6], [63, 76, 3, 2.4], [24, 80, 2.2, 1.8], [45, 82, 2.6, 2], [70, 62, 2.2, 1.8], [56, 69, 1.8, 1.5], [37, 58, 1.8, 1.5], [84, 58, 1.8, 2.4], [85, 72, 1.6, 2]]) d.ellipse(x, y, rx, ry, P.gold[2], { stroke: null, op: 0.75 });
      d.path("M78 40 L90 30 V42 L78 52 Z", d.lin([[0, P.green[1]], [1, P.green[2]]], 0, 0, 1, 0), { sw: 2.6 });
      d.path("M12 40 H78 V52 H12 Z", d.fill(P.green, "v"), { sw: 2.6 });
      d.path("M12 40 L24 30 H90 L78 40 Z", d.lin([[0, P.lime[0]], [1, P.green[1]]], 0, 0, 1, 1), { sw: 2.6 });
      d.path("M12 40 L24 30 H90 V76 Q90 80 87 82 L78 88 H16 Q12 88 12 84 Z", "none", { sw: 3.5 });
      d.shine(22, 57, 6, 2, 0.5, 0);
      bubble(d, 66, 18, 7);
      bubble(d, 80, 11, 4.5);
    },
  ],
  [
    "🗑️",
    "trash can",
    (d) => {
      d.shadow(50, 92, 32);
      const body = "M20 34 H80 L74 87 Q73 92 68 92 H32 Q27 92 26 87 Z";
      d.path(body, d.fill(P.steel, "h"), { sw: 3.5 });
      d.clip(body, (k) => {
        for (const x of [-18, -6, 6, 18]) {
          k.stroke(`M${50 + x} 38 L${50 + x * 0.88} 90`, { color: P.steel[2], sw: 2.4 });
          k.stroke(`M${52.5 + x} 38 L${52.2 + x * 0.88} 90`, { color: "#ffffff", sw: 1.6, op: 0.55 });
        }
      });
      d.path(body, "none", { sw: 3.5 });
      d.path("M18 30 Q50 11 82 30 Z", d.fill(P.silver), { sw: 3 });
      d.tube("M42 21 Q42 12 50 12 Q58 12 58 21", P.steel[1], 4, 2.5);
      d.path(rr(12, 27, 76, 10, 5), d.fill(P.silver, "v"), { sw: 3 });
      d.shine(28, 31, 8, 1.6, 0.8, 0);
      d.shine(27, 52, 2.4, 10, 0.5, -4);
    },
  ],
  [
    "🪞",
    "mirror",
    (d) => {
      d.shadow(50, 93, 26);
      d.path("M44 80 L56 80 L62 89 Q62 93 58 93 H42 Q38 93 38 89 Z", d.fill(P.pink, "v"), { sw: 2.6 });
      d.ellipse(50, 45, 31, 39, d.fill(P.pink), { sw: 3.5 });
      const glass = oval(50, 45, 23.5, 31.5);
      d.path(glass, d.lin([[0, "#f4fbff"], [0.5, P.sky[0]], [1, P.sky[1]]], 0, 0, 1, 1), { sw: 2.4 });
      d.clip(glass, (k) => {
        k.path("M20 46 L48 12 L58 12 L20 58 Z", "#ffffff", { stroke: null, op: 0.6 });
        k.path("M38 80 L76 34 L76 41 L44 80 Z", "#ffffff", { stroke: null, op: 0.45 });
      });
      d.shine(28, 26, 3, 7, 0.55, 30);
    },
  ],
  [
    "🎩",
    "top hat",
    (d) => {
      d.shadow(50, 92, 40);
      d.path("M8 78 Q6 70 18 71 Q50 78 82 71 Q94 70 92 78 Q90 88 50 88 Q10 88 8 78 Z", d.fill(P.black, "v"), { sw: 3.5 });
      const crown = "M23 20 Q50 13 77 20 L72 75 Q50 81 28 75 Z";
      d.path(crown, d.fill(P.black, "h"), { sw: 3.5 });
      d.clip(crown, (k) => k.path("M10 58 Q50 66 90 58 V70 Q50 78 10 70 Z", d.fill(P.red, "v"), { stroke: OL, sw: 2.6 }));
      d.path(crown, "none", { sw: 3.5 });
      d.ellipse(50, 19.5, 27, 6.5, d.fill(P.ink), { sw: 3 });
      d.shine(32, 40, 2.5, 12, 0.35, 3);
    },
  ],
  [
    "☂️",
    "umbrella",
    (d) => {
      d.g("translate(57.5 52) rotate(26) scale(0.94) translate(-50 -50)", (g) => {
        g.tube("M50 60 V82 Q50 95 38.5 95 Q29 95 29 85", P.wood[1], 6.5, 3);
        g.tube("M50 -1 V8", P.silver[1], 3, 2.2);
        const canopy = "M50 5 Q67 28 69 58 Q63 66 57 59.5 Q50 68 43 59.5 Q37 66 31 58 Q33 28 50 5 Z";
        g.path(canopy, g.fill(P.purple, "h"), { sw: 3.4 });
        g.clip(canopy, (k) => k.stroke("M50 8 Q55 34 57 60 M50 8 Q45 34 43 60", { color: P.purple[2], sw: 2.2 }));
        g.path(rr(34, 34, 32, 9, 4), g.fill(P.violet, "v"), { sw: 2.6 });
        g.circle(56, 38.5, 2.4, d.fill(P.gold), { sw: 1.8 });
      });
      d.shine(54.5, 29, 2.2, 8, 0.55, 26);
    },
  ],
  [
    "🧢",
    "cap",
    (d) => {
      d.shadow(50, 84, 40);
      d.path("M62 62 Q84 56 94 64 Q97 70 90 73 Q74 78 58 71 Z", d.fill(P.red, "v"), { sw: 3.2 });
      const crown = "M10 70 Q6 34 38 27 Q70 21 80 54 Q82 62 78 66 Q44 76 10 70 Z";
      d.path(crown, d.fill(P.red), { sw: 3.5 });
      d.clip(crown, (k) => {
        k.stroke("M38 27 Q28 46 30 72 M38 27 Q56 42 58 70", { color: P.red[2], sw: 2.2 });
        k.path("M0 64 Q44 72 90 58 V90 H0 Z", P.red[2], { stroke: OL, sw: 2.4 });
      });
      d.path(crown, "none", { sw: 3.5 });
      d.circle(38, 26, 4, d.fill(P.red), { sw: 2.4 });
      d.shine(24, 42, 3.5, 8, 0.5, 30);
    },
  ],
  [
    "👕",
    "t-shirt",
    (d) => {
      const c = P.sky;
      const tee = "M35 12 Q50 22 65 12 L87 23 Q92 26 90 31 L83 45 Q81 49 77 47 L72 44 V86 Q72 90 68 90 H32 Q28 90 28 86 V44 L23 47 Q19 49 17 45 L10 31 Q8 26 13 23 Z";
      d.path(tee, d.fill(c, "v"), { sw: 3.5 });
      d.path("M35 12 Q50 22 65 12 Q50 7 35 12 Z", c[2], { sw: 2.4 });
      d.tube("M35.5 12.5 Q50 23.5 64.5 12.5", c[0], 3, 1.8);
      d.stroke("M14.5 28.8 L21.5 42.8 M85.5 28.8 L78.5 42.8", { color: c[2], sw: 2.2 });
      d.path(softStar(50, 55, 12), d.fill(P.lemon), { sw: 2.6 });
      d.shine(36, 30, 3.5, 8, 0.45, 15);
    },
  ],
  [
    "🧣",
    "scarf",
    (d) => {
      const c = P.green;
      d.tube("M23 34 Q50 8 77 34", c[2], 12, 3);
      const back = "M29 38 L45 40 L43 84 L26 82 Z";
      const front = "M42 42 L58 39 L68 79 L51 84 Z";
      for (const [t, x0, x1, y0, y1] of [[back, 26, 43, 82, 84], [front, 51, 68, 84, 79]] as const) {
        d.path(t, d.fill(c, "v"), { sw: 3 });
        d.clip(t, (k) => {
          for (const y of [62, 72]) k.path(`M0 ${y} L100 ${y - 1} V${y + 5} L0 ${y + 6} Z`, P.cream[1], { stroke: c[2], sw: 1.6 });
        });
        d.path(t, "none", { sw: 3 });
        for (let i = 0; i <= 4; i++) {
          const x = x0 + ((x1 - x0) * (i + 0.5)) / 5;
          const y = y0 + ((y1 - y0) * (i + 0.5)) / 5;
          d.tube(`M${x} ${y + 1} L${x} ${y + 6}`, c[1], 2, 1.4);
        }
      }
      const loop = "M22 34 Q50 62 78 34";
      d.tube(loop, c[1], 15, 3);
      d.stroke(loop, { color: P.cream[1], sw: 15, dash: "5 13", cap: "butt" });
      d.stroke("M27 39 Q50 58 73 39", { color: "#ffffff", sw: 2.4, op: 0.45 });
    },
  ],
  [
    "🦺",
    "safety vest",
    (d) => {
      const vest = "M27 9 H40 L50 42 L60 9 H73 Q77 30 90 40 V84 Q90 90 84 90 H16 Q10 90 10 84 V40 Q23 30 27 9 Z";
      d.path(vest, d.fill(P.orange, "v"), { sw: 3.5 });
      d.clip(vest, (k) => {
        const band = d.lin([[0, "#ffffff"], [1, P.silver[2]]]);
        for (const x of [29, 63]) k.path(rr(x, 4, 8, 60, 0), band, { stroke: OL, sw: 2.4 });
        for (const y of [56, 73]) k.path(rr(0, y, 100, 8, 0), band, { stroke: OL, sw: 2.4 });
        k.stroke("M50 42 V92", { sw: 2.6 });
      });
      d.path(vest, "none", { sw: 3.5 });
      d.shine(19, 46, 2.6, 7, 0.5, 10);
    },
  ],
  [
    "🛍️",
    "shopping bags",
    (d) => {
      d.shadow(52, 92, 40);
      d.tube("M25 34 Q25 14 35 14 Q45 14 45 34", P.teal[2], 3.5, 2.4);
      d.path("M15 31 H55 L58 80 Q58 84 54 84 H16 Q12 84 12 80 Z", d.fill(P.teal, "v"), { sw: 3.2 });
      d.stroke("M14 39 H56", { color: P.teal[2], sw: 2.2 });
      d.circle(25, 34, 2, OL, { stroke: null });
      d.circle(45, 34, 2, OL, { stroke: null });
      d.tube("M53 44 Q53 22 64 22 Q75 22 75 44", P.pink[2], 3.5, 2.4);
      d.path("M42 41 H86 L89 87 Q89 92 84 92 H45 Q40 92 40 87 Z", d.fill(P.pink, "v"), { sw: 3.5 });
      d.stroke("M42 49 H87", { color: P.pink[2], sw: 2.2 });
      d.circle(53, 44, 2, OL, { stroke: null });
      d.circle(75, 44, 2, OL, { stroke: null });
      d.path(softStar(64.5, 69, 10), d.fill(P.gold), { sw: 2.4 });
      d.shine(48, 58, 2.4, 8, 0.5, 0);
    },
  ],
  [
    "🕯️",
    "candle",
    (d) => {
      d.glow(50, 22, 28, "#ffe08a", 0.75);
      d.path("M14 82 Q16 93 50 93 Q84 93 86 82 Z", d.fill(P.gold, "v"), { sw: 3 });
      d.ellipse(50, 82, 36, 7.5, d.fill(P.gold), { sw: 3 });
      const body = "M35 41 V82 Q50 87 65 82 V41 Z";
      d.path(body, d.fill(P.cream, "h"), { sw: 3.2 });
      d.path("M35 41 Q35 36 50 36 Q65 36 65 41 V48 Q65 52 62 52 Q59 52 59 48 V46 Q57 44 55 46 V56 Q55 60 51.5 60 Q48 60 48 56 V47 Q46 45 44 47 V50 Q44 53 41 53 Q38 53 38 50 V47 Q35 46 35 44 Z", d.fill(P.white, "v"), { sw: 2.6 });
      d.ellipse(50, 40, 12, 3, P.cream[2], { stroke: null, op: 0.6 });
      d.stroke("M50 39 V31", { sw: 2.6 });
      d.path("M50 6 Q60 18 60 25 Q60 34 50 34 Q40 34 40 25 Q40 18 50 6 Z", d.rad([[0, "#fff6b0"], [0.55, "#ffb02e"], [1, "#f06a1d"]], 0.5, 0.7, 0.75), { sw: 2.8 });
      d.path("M50 17 Q55 24 55 28 Q55 32 50 32 Q45 32 45 28 Q45 24 50 17 Z", "#fff8d0", { stroke: null });
      d.shine(39.5, 62, 2, 9, 0.6, 0);
    },
  ],
  [
    "🛒",
    "shopping cart",
    (d) => d.g("translate(50 49) scale(0.96) translate(-47.5 -49)", (d) => {
      d.shadow(52, 92, 38);
      d.tube("M26 64 V76 H80", P.steel[1], 4, 2.6);
      d.tube("M78 64 L80 76", P.steel[1], 4, 2.6);
      for (const x of [31, 75]) {
        d.circle(x, 84, 6.5, d.fill(P.black), { sw: 2.6 });
        d.circle(x, 84, 2.4, P.silver[1], { stroke: null });
      }
      const basket = "M16 30 H88 L80 64 H26 Z";
      d.path(basket, d.lin([[0, "#ffffff"], [1, P.sky[0]]]), { sw: 3 });
      d.clip(basket, (k) => {
        for (const x of [26, 36, 46, 56, 66, 76]) k.stroke(`M${x + 2} 30 L${x + 4 + (x - 52) * -0.12} 64`, { color: P.steel[2], sw: 2.2 });
        for (const y of [41, 52]) k.stroke(`M10 ${y} H94`, { color: P.steel[2], sw: 2.2 });
      });
      d.path(basket, "none", { sw: 3.2 });
      d.path(rr(13, 25, 78, 7, 3.5), d.fill(P.red, "v"), { sw: 2.8 });
      d.tube("M15 28 L8 15", P.steel[1], 4, 2.6);
      d.path(rr(2, 10, 14, 7, 3.5), d.fill(P.red, "v"), { sw: 2.6, tf: "rotate(-60 9 13.5)" });
      d.shine(30, 27.5, 9, 1.4, 0.6, 0);
    }),
  ],
  [
    "🗄️",
    "file cabinet",
    (d) => {
      d.shadow(50, 93, 32);
      d.path(rr(21, 8, 58, 84, 5), d.fill(P.steel, "h"), { sw: 3.5 });
      for (const y of [13, 40, 67]) {
        d.path(rr(26, y, 48, 22, 3), d.fill(P.grey, "v"), { sw: 2.4 });
        d.path(rr(44, y + 4, 12, 6, 1.5), d.fill(P.white), { sw: 1.8 });
        d.path(rr(40, y + 13, 20, 5, 2.5), d.fill(P.steel, "v"), { sw: 2 });
      }
      d.shine(23.5, 30, 1.4, 12, 0.5, 0);
    },
  ],
  [
    "🩱",
    "swimsuit",
    (d) => {
      const c = P.teal;
      const suit = "M30 10 Q30 6 34 6 Q38 6 38 10 L39 26 Q50 38 61 26 L62 10 Q62 6 66 6 Q70 6 70 10 L71 32 Q75 44 70 56 Q69 64 74 72 Q60 76 56 90 H44 Q40 76 26 72 Q31 64 30 56 Q25 44 29 32 Z";
      d.path(suit, d.fill(c, "v"), { sw: 3.5 });
      d.clip(suit, (k) => {
        for (const [x, y, r] of [[36, 44, 3], [50, 50, 3], [64, 44, 3], [42, 60, 3], [58, 60, 3], [50, 72, 3], [36, 68, 2.5], [64, 68, 2.5], [50, 38, 2]]) k.circle(x, y, r, P.lemon[1], { stroke: null });
      });
      d.path(suit, "none", { sw: 3.5 });
      d.shine(34, 40, 2.4, 7, 0.5, 10);
    },
  ],
  [
    "🎒",
    "backpack",
    (d) => d.g("translate(50 51) scale(0.94) translate(-50 -50)", (d) => {
      const c = P.blue;
      d.shadow(50, 93, 34);
      d.tube("M41 15 Q41 6 50 6 Q59 6 59 15", c[2], 4, 2.6);
      for (const x of [16, 84]) d.tube(`M${x} 30 V80`, c[2], 6, 2.8);
      const body = "M22 32 Q22 13 50 13 Q78 13 78 32 V84 Q78 92 70 92 H30 Q22 92 22 84 Z";
      d.path(body, d.fill(c), { sw: 3.5 });
      d.stroke("M27 36 Q50 20 73 36", { sw: 2.4, color: c[2] });
      d.path(rr(29, 52, 42, 32, 9), d.fill(c, "v"), { sw: 3 });
      d.stroke("M31 61 H69", { color: c[2], sw: 2.2 });
      d.path(rr(57, 58, 6, 10, 2.5), d.fill(P.gold), { sw: 2 });
      d.path(rr(33, 26, 6, 10, 2.5), d.fill(P.gold), { sw: 2, tf: "rotate(-30 36 31)" });
      d.shine(31, 24, 5, 2.4, 0.5, -30);
    }),
  ],
  [
    "👒",
    "sun hat",
    (d) => d.g("translate(0 -3)", (d) => {
      d.shadow(50, 86, 40);
      d.ellipse(50, 66, 44, 16, d.fill(P.sand), { sw: 3.5 });
      d.stroke("M14 66 Q50 82 86 66 M24 64 Q50 76 76 64", { color: P.sand[2], sw: 1.8 });
      const crown = "M27 64 Q25 30 50 29 Q75 30 73 64 Q50 72 27 64 Z";
      d.path(crown, d.fill(P.sand), { sw: 3.2 });
      d.clip(crown, (k) => k.path("M10 52 Q50 62 90 52 V61 Q50 71 10 61 Z", d.fill(P.pink, "v"), { stroke: OL, sw: 2.4 }));
      d.path(crown, "none", { sw: 3.2 });
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        d.circle(70 + Math.cos(a) * 4.2, 58 + Math.sin(a) * 4.2, 3.4, d.fill(P.coral), { sw: 1.8 });
      }
      d.circle(70, 58, 2.6, d.fill(P.gold), { sw: 1.6 });
      d.shine(36, 38, 3.5, 7, 0.5, 20);
    }),
  ],
  [
    "🩴",
    "flip-flops",
    (d) => {
      const sole = "M64 10 Q80 9 82 26 Q83 40 79 52 Q76 62 78 74 Q79 90 66 91 Q54 92 54 76 Q54 64 55 52 Q52 36 51 26 Q50 11 64 10 Z";
      const flop = (g: Pen) => {
        g.path(sole, g.fill(P.sky), { sw: 3.2 });
        g.path("M65 15 Q76 15 77 27 Q78 38 75 48 Q72 60 74 72 Q75 85 66 86 Q59 86 59 76 Q59 64 60 52 Q57 36 56 27 Q56 16 65 15 Z", P.sky[0], { stroke: null, op: 0.6 });
        g.tube("M56 50 Q60 34 64 24 Q70 34 78 48", P.coral[1], 4.5, 2.4);
        g.circle(64, 24, 3, g.fill(P.coral), { sw: 2 });
      };
      d.g("translate(4 0) rotate(8 66 50)", flop);
      d.mirror(50, (m) => m.g("translate(4 4) rotate(8 66 50)", flop));
    },
  ],
  [
    "👛",
    "purse",
    (d) => {
      d.shadow(50, 89, 36);
      const body = "M14 44 Q14 32 26 32 H74 Q86 32 86 44 L84 70 Q82 86 66 86 H34 Q18 86 16 70 Z";
      d.path(body, d.fill(P.pink), { sw: 3.5 });
      d.tube("M17 38 Q50 28 83 38", P.gold[1], 4.5, 2.4);
      d.ball(45.5, 26, 4.6, P.gold, { sw: 2.2 });
      d.ball(54.5, 26, 4.6, P.gold, { sw: 2.2 });
      d.path("M50 74 C40 66 40 56 46 56 C48 56 50 58 50 60 C50 58 52 56 54 56 C60 56 60 66 50 74 Z", d.fill(P.rose), { stroke: P.pink[2], sw: 2 });
      d.shine(26, 45, 6, 2.4, 0.5, -15);
    },
  ],
  [
    "🖼️",
    "framed picture",
    (d) => {
      d.stroke("M38 17 L50 7 L62 17", { sw: 2.4 });
      d.circle(50, 7, 2.4, d.fill(P.steel), { sw: 1.8 });
      d.path(rr(8, 16, 84, 72, 4), d.fill(P.gold, "d"), { sw: 3.5 });
      d.path(rr(15, 23, 70, 58, 2), "none", { stroke: P.gold[2], sw: 2 });
      const pic = rr(19, 27, 62, 50, 2);
      d.path(pic, d.lin([[0, P.sky[0]], [1, P.sky[1]]]), { sw: 2.4 });
      d.clip(pic, (k) => {
        k.circle(68, 40, 6.5, d.fill(P.gold), { sw: 2 });
        k.path("M10 66 Q32 46 56 62 Q70 52 90 60 V90 H10 Z", d.fill(P.lime, "v"), { sw: 2.2 });
        k.path("M10 74 Q40 60 90 76 V90 H10 Z", d.fill(P.green, "v"), { sw: 2.2 });
      });
      d.path(pic, "none", { sw: 2.4 });
      d.shine(18, 20, 8, 1.6, 0.6, 0);
    },
  ],
  [
    "👓",
    "glasses",
    (d) => d.g("translate(50 51) scale(0.92) translate(-50 -51)", (d) => {
      const c = P.red;
      const side = (g: Pen) => {
        g.tube("M13 44 L6 41", c[2], 3.5, 2.4);
        g.path(`${oval(31, 51, 18.5, 17.5)} ${oval(31, 51, 13.5, 12.5, false)}`, g.fill(c), { sw: 3 });
        const lens = oval(31, 51, 13.5, 12.5);
        g.path(lens, g.lin([[0, "#ffffff"], [1, P.sky[0]]], 0, 0, 1, 1), { sw: 2.2 });
        g.clip(lens, (k) => {
          k.path("M14 54 L30 36 L36 36 L14 60 Z", "#ffffff", { stroke: null, op: 0.9 });
          k.path("M30 66 L46 48 L46 52 L34 66 Z", "#ffffff", { stroke: null, op: 0.8 });
        });
        g.shine(21, 40, 4, 1.6, 0.6, -40);
      };
      side(d);
      d.mirror(50, side);
      d.tube("M47 46 Q50 41 53 46", c[1], 3.6, 2.4);
    }),
  ],
  [
    "🧵",
    "spool of thread",
    (d) => d.g("translate(-5 0)", (d) => {
      d.shadow(48, 92, 32);
      d.path("M20 80 V86 A28 7.5 0 0 0 76 86 V80 Z", d.fill(P.wood, "h"), { sw: 3 });
      d.ellipse(48, 80, 28, 7.5, d.fill(P.wood), { sw: 3 });
      const thread = "M26 24 V79 A22 6 0 0 0 70 79 V24 Z";
      d.path(thread, d.fill(P.red, "h"), { sw: 3 });
      d.clip(thread, (k) => {
        for (let y = 20; y < 90; y += 6.5) k.stroke(`M24 ${y} Q48 ${y + 8} 72 ${y - 3}`, { color: P.red[2], sw: 1.6, op: 0.8 });
      });
      d.path(thread, "none", { sw: 3 });
      d.path("M20 16 V22 A28 7.5 0 0 0 76 22 V16 Z", d.fill(P.wood, "h"), { sw: 3 });
      d.ellipse(48, 16, 28, 7.5, d.fill(P.wood), { sw: 3 });
      d.ellipse(48, 16, 6, 2.2, P.wood[2], { sw: 1.8 });
      d.tube("M70 54 Q80 56 82 66 Q84 76 92 74", P.red[1], 2.6, 1.8);
      d.shine(31, 42, 2.4, 9, 0.5, 0);
    }),
  ],
  [
    "🩳",
    "shorts",
    (d) => {
      const c = P.green;
      const legs = "M21 26 H79 L89 78 Q89 82 85 83 L57 85 Q53 85 52 81 L50 52 L48 81 Q47 85 43 85 L15 83 Q11 82 11 78 Z";
      d.path(legs, d.fill(c, "v"), { sw: 3.5 });
      d.clip(legs, (k) => {
        k.stroke("M14 74 L49 77 M86 74 L51 77", { color: c[2], sw: 2.2 });
        k.stroke("M24 26 Q30 38 21 46 M76 26 Q70 38 79 46", { color: c[2], sw: 2.2 });
      });
      d.path(legs, "none", { sw: 3.5 });
      d.path(rr(19, 15, 62, 13, 4), d.fill(c, "v"), { sw: 3 });
      d.tube("M50 28 Q46 36 43 40 M50 28 Q54 36 57 40", P.white[1], 2.4, 1.6);
      d.shine(26, 50, 2.6, 9, 0.5, 8);
    },
  ],
  [
    "🚿",
    "shower",
    (d) => d.g("translate(50 50) scale(0.92) translate(-46.5 -49.5)", (d) => {
      d.tube("M14 12 H45 Q57 12 57 24 V29", P.silver[1], 6.5, 3);
      d.path(rr(8, 4, 9, 16, 3), d.fill(P.steel, "h"), { sw: 2.6 });
      d.path("M50 27 H64 L84 46 Q85 52 79 52 H35 Q29 52 30 46 Z", d.fill(P.silver, "v"), { sw: 3.4 });
      d.ellipse(57, 52, 24, 4.6, d.fill(P.steel), { sw: 2.8 });
      for (const [x, y, s] of [[39, 65, 3.6], [51, 67, 3.8], [63, 67, 3.8], [75, 65, 3.6], [33, 80, 3.3], [45, 82, 3.6], [57, 83, 3.6], [69, 82, 3.6], [81, 80, 3.3], [51, 94, 2.6], [64, 94, 2.6]]) d.path(drop(x, y - 2, s), d.fill(P.sky), { sw: 2 });
      d.shine(44, 36, 6, 1.8, 0.75, -10);
    }),
  ],
  [
    "📮",
    "postbox",
    (d) => {
      d.shadow(50, 93, 34);
      d.path(rr(20, 82, 60, 10, 3), d.fill(P.ink, "v"), { sw: 3 });
      d.path(rr(25, 30, 50, 54, 3), d.fill(P.red, "h"), { sw: 3.5 });
      d.path("M19 31 Q19 8 50 8 Q81 8 81 31 Z", d.fill(P.red), { sw: 3.5 });
      d.path(rr(17, 28, 66, 7, 3), d.fill(P.red, "v"), { sw: 3 });
      d.path(rr(38, 36, 24, 15, 2), d.fill(P.white, "v"), { sw: 2.4 });
      d.stroke("M38.5 37 L50 45 L61.5 37", { color: P.grey[2], sw: 1.8 });
      d.path(rr(32, 46, 36, 7, 3.5), d.fill(P.ink, "v"), { sw: 2.6 });
      d.path(rr(39, 61, 22, 14, 2), d.fill(P.cream, "v"), { sw: 2.2 });
      d.stroke("M43 66 H57 M43 70.5 H53", { color: P.cream[2], sw: 1.8 });
      d.shine(31, 16, 6, 2.4, 0.5, -30);
      d.shine(29.5, 48, 1.8, 10, 0.45, 0);
    },
  ],
  [
    "👜",
    "handbag",
    (d) => {
      const c = P.purple;
      d.shadow(50, 92, 40);
      d.tube("M32 42 Q32 13 50 13 Q68 13 68 42", c[2], 5, 3);
      const body = "M18 40 H82 L88 80 Q89 90 79 90 H21 Q11 90 12 80 Z";
      d.path(body, d.fill(c, "v"), { sw: 3.5 });
      d.path("M17 39 H83 L81 55 Q50 68 19 55 Z", d.fill(c), { sw: 3 });
      d.path(rr(44, 56, 12, 9, 3), d.fill(P.gold), { sw: 2.2 });
      for (const x of [32, 68]) d.circle(x, 40, 3, d.fill(P.gold), { sw: 2 });
      d.shine(27, 45, 6, 2, 0.5, -5);
    },
  ],
  [
    "👗",
    "dress",
    (d) => {
      const c = P.pink;
      const dress = "M37 9 Q37 6 40 7 Q50 18 60 7 Q63 6 63 9 L73 14 Q77 18 73 24 L66 27 V42 L85 81 Q87 89 79 89 Q66 93 50 90 Q34 93 21 89 Q13 89 15 81 L34 42 V27 L27 24 Q23 18 27 14 Z";
      d.path(dress, d.fill(c, "v"), { sw: 3.5 });
      d.clip(dress, (k) => {
        k.stroke("M42 48 Q36 66 32 90 M58 48 Q64 66 68 90 M50 48 V90", { color: c[2], sw: 2, op: 0.7 });
        for (const [x, y] of [[40, 60], [60, 60], [30, 80], [50, 74], [70, 80], [44, 84], [57, 86]]) k.circle(x, y, 2.4, "#ffffff", { stroke: null, op: 0.85 });
        k.path(rr(20, 40, 60, 8, 0), d.fill(P.rose, "v"), { stroke: OL, sw: 2.2 });
      });
      d.path(dress, "none", { sw: 3.5 });
      d.path("M50 44 L41 39 Q39 44 41 49 Z M50 44 L59 39 Q61 44 59 49 Z", d.fill(P.white), { sw: 2 });
      d.circle(50, 44, 2.4, P.rose[2], { sw: 1.8 });
      d.shine(39, 22, 2.4, 6, 0.5, 15);
    },
  ],
  [
    "🪣",
    "bucket",
    (d) => {
      d.shadow(50, 93, 32);
      d.tube("M16 42 Q16 9 50 9 Q84 9 84 42", P.silver[2], 2.6, 2.2);
      d.path("M14 40 L24 86 Q26 92 50 92 Q74 92 76 86 L86 40 Z", d.fill(P.gold, "h"), { sw: 3.5 });
      d.stroke("M18 58 Q50 66 82 58 M21 72 Q50 80 79 72", { color: P.gold[2], sw: 2.2 });
      d.ellipse(50, 40, 36, 9, d.fill(P.gold, "v"), { sw: 3 });
      d.ellipse(50, 40.5, 31, 6.5, P.gold[2], { sw: 2 });
      d.path("M21 42 Q50 49 79 42 Q78 38 72 37 Q50 34 28 37 Q22 38 21 42 Z", d.lin([[0, P.sky[0]], [1, P.sky[1]]]), { sw: 2 });
      for (const x of [16, 84]) d.circle(x, 44, 3, d.fill(P.silver), { sw: 2 });
      d.shine(26, 54, 2.6, 10, 0.55, -10);
    },
  ],
  [
    "🧷",
    "safety pin",
    (d) => {
      d.g("translate(50 50) rotate(-38) scale(0.94) translate(-50.5 -48)", (g) => {
        g.tube("M14 40.5 L84 40.5", P.silver[1], 4.6, 2.4);
        g.tube("M14 58 L84 56", P.silver[1], 4.6, 2.4);
        g.path(`${oval(12, 49, 9.5, 9.5)} ${oval(12, 49, 4.4, 4.4, false)}`, g.fill(P.silver), { sw: 2.6 });
        g.path("M74 34 H88 Q98 34 98 47.5 Q98 61 88 61 H74 Q71 61 71 58 V37 Q71 34 74 34 Z", g.fill(P.gold, "v"), { sw: 3 });
        g.stroke("M76 40 H89", { color: "#ffffff", sw: 2.2, op: 0.65 });
        g.stroke("M22 40.5 H62", { color: "#ffffff", sw: 1.8, op: 0.8 });
      });
    },
  ],
  [
    "🚽",
    "toilet",
    (d) => {
      d.shadow(52, 92, 36);
      d.path(rr(14, 16, 26, 44, 5), d.fill(P.white, "h"), { sw: 3.2 });
      d.path(rr(11, 11, 32, 8, 3.5), d.fill(P.white, "v"), { sw: 3 });
      d.tube("M40 25 H47", P.silver[2], 3, 2);
      d.path("M28 56 H86 Q86 72 68 78 Q63 80 63 86 V91 H37 V85 Q37 79 33 74 Q28 67 28 56 Z", d.fill(P.white, "v"), { sw: 3.5 });
      d.path(rr(24, 50, 66, 8, 4), d.fill(P.sky, "v"), { sw: 3 });
      d.shine(19, 30, 2.4, 9, 0.6, 0);
      d.shine(40, 64, 7, 2, 0.6, -5);
    },
  ],
  [
    "🩲",
    "briefs",
    (d) => {
      const c = P.violet;
      const body = "M16 34 H84 L82 46 Q66 52 61 76 Q50 81 39 76 Q34 52 18 46 Z";
      d.path(body, d.fill(c, "v"), { sw: 3.5 });
      d.stroke("M21 44 Q36 52 41 72 M79 44 Q64 52 59 72", { color: c[2], sw: 2 });
      d.path(rr(14, 24, 72, 12, 5), d.fill(P.white, "v"), { sw: 3 });
      d.stroke("M18 30 H82", { color: c[1], sw: 2.4 });
      d.shine(26, 41, 5, 1.8, 0.5, 10);
    },
  ],
  [
    "👖",
    "jeans",
    (d) => {
      const c = P.blue;
      const jeans = "M25 16 H75 L80 87 Q80 91 76 91 H58 Q55 91 55 88 L50 41 L45 88 Q45 91 42 91 H24 Q20 91 20 87 Z";
      d.path(jeans, d.fill(c, "v"), { sw: 3.5 });
      d.clip(jeans, (k) => {
        const st = { color: P.gold[1], sw: 1.6, dash: "2.6 2.4" };
        k.stroke("M28 17 Q35 25 27 32 M72 17 Q65 25 73 32", st);
        k.stroke("M51 17 V33 Q51 37 46 38", st);
        k.path("M10 80 L48 82 V96 H10 Z M52 82 L90 80 V96 H52 Z", d.fill(P.sky, "v"), { stroke: OL, sw: 2.4 });
      });
      d.path(jeans, "none", { sw: 3.5 });
      d.path(rr(24, 8, 52, 10, 3), d.fill(c, "v"), { sw: 3 });
      for (const x of [31, 66]) d.rect(x, 6.5, 4, 13, 1.5, c[1], { sw: 1.8 });
      d.circle(50, 13, 3, d.fill(P.gold), { sw: 1.8 });
      d.shine(31, 44, 2.6, 10, 0.45, 4);
    },
  ],
  [
    "📬",
    "mailbox",
    (d) => {
      d.shadow(50, 92, 26);
      d.path(rr(44, 56, 12, 34, 3), d.fill(P.wood, "h"), { sw: 3 });
      d.tube("M30 50 V14", P.ink[1], 3, 2.2);
      d.path("M30 10 H49 Q51 10 51 12 V22 Q51 24 49 24 H30 Z", d.fill(P.red, "v"), { sw: 2.6 });
      const box = "M12 60 V38 Q12 22 28 22 H72 Q88 22 88 38 V60 Z";
      d.path(box, d.fill(P.blue, "v"), { sw: 3.5 });
      d.clip(box, (k) => k.path("M77 18 H96 V64 H77 Z", d.fill(P.blue, "h"), { stroke: OL, sw: 2.6 }));
      d.path(box, "none", { sw: 3.5 });
      d.path(rr(81, 38, 5, 10, 2), d.fill(P.silver), { sw: 1.8 });
      d.circle(30, 46, 3, d.fill(P.silver), { sw: 2 });
      d.path(rr(61, 33, 22, 14, 2), d.fill(P.white, "v"), { sw: 2.4, tf: "rotate(-14 72 40)" });
      d.stroke("M62 36 L72 42 L82 33", { color: P.grey[2], sw: 1.8, tf: "rotate(-14 72 40)" });
      d.shine(22, 30, 6, 2, 0.5, -30);
    },
  ],
  [
    "🪤",
    "mousetrap",
    (d) => {
      d.shadow(50, 88, 45);
      d.path("M14 50 H86 L94 66 H6 Z", d.lin([[0, P.wood[0]], [1, P.wood[1]]]), { sw: 3 });
      d.path(rr(5, 65, 90, 14, 4), d.fill(P.wood, "v"), { sw: 3.2 });
      d.stroke("M14 71 H40 M50 74 H86", { color: P.wood[2], sw: 1.8, op: 0.7 });
      d.tube("M15 63 L21 53 H52 L50 63", P.silver[1], 3.8, 2.2);
      for (const x of [29, 42]) d.path(`${oval(x, 61, 4.4, 4.4)} ${oval(x, 61, 1.8, 1.8, false)}`, d.fill(P.steel), { sw: 2 });
      d.path(rr(55, 57, 27, 6, 2), d.fill(P.steel, "v"), { sw: 2.2 });
      d.path("M57 61 L88 61 L88 36 Z", d.fill(P.gold, "v"), { sw: 3 });
      d.path("M57 61 L88 36 L83 30 L52 55 Z", d.fill(P.lemon, "d"), { sw: 3 });
      for (const [x, y, r] of [[77, 55, 2.8], [84, 49, 2], [83, 57.5, 1.6]]) d.circle(x, y, r, P.gold[2], { stroke: null });
      for (const [x, y, r] of [[66, 49, 2], [74, 42, 1.6]]) d.circle(x, y, r, P.gold[1], { stroke: null });
      d.shine(22, 56, 7, 1.5, 0.6, 0);
    },
  ],
  [
    "🎽",
    "tank top",
    (d) => {
      const shirt = "M32 8 H41 Q43 22 50 22 Q57 22 59 8 H68 Q69 27 80 34 V86 Q80 90 76 90 H24 Q20 90 20 86 V34 Q31 27 32 8 Z";
      d.path(shirt, d.fill(P.sky, "v"), { sw: 3.5 });
      d.clip(shirt, (k) => {
        k.path("M58 2 L72 6 L28 96 L12 92 Z", d.fill(P.red, "v"), { stroke: OL, sw: 2.4 });
        k.stroke("M60.5 3 L19 92", { color: "#ffffff", sw: 2.2 });
      });
      d.path(shirt, "none", { sw: 3.5 });
      d.stroke("M41 9 Q43 23 50 23 Q57 23 59 9", { color: P.sky[2], sw: 2 });
      d.shine(27, 44, 2.4, 8, 0.5, 6);
    },
  ],
  [
    "👢",
    "tall boot",
    (d) => d.g("translate(-5 0)", (d) => {
      d.shadow(52, 92, 40);
      d.path("M22 78 H34 L32 91 H23 Z", d.fill(P.ink, "v"), { sw: 3 });
      const boot = "M24 14 H50 L51 56 Q53 65 64 68 L80 71 Q91 74 91 82 Q91 86 86 86 H34 L33 80 H24 Q21 80 21 76 Z";
      d.path(boot, d.fill(P.red, "h"), { sw: 3.5 });
      d.clip(boot, (k) => k.stroke("M30 82 V60 Q30 56 34 56", { color: P.red[2], sw: 2 }));
      d.path("M33 85 H88 Q92 85 91 88 Q90 91 86 91 H33 Z", d.fill(P.ink, "v"), { sw: 2.6 });
      d.path(rr(20, 8, 34, 13, 5), d.fill(P.red, "v"), { sw: 3 });
      d.stroke("M24 14.5 H50", { color: P.red[0], sw: 2, op: 0.7 });
      d.shine(29, 36, 2.6, 11, 0.5, 0);
    }),
  ],
  [
    "🏮",
    "paper lantern",
    (d) => d.g("translate(50 49.5) scale(0.95) translate(-50 -49.5)", (d) => {
      d.glow(50, 47, 46, "#ffb36b", 0.45);
      d.tube("M50 8 V13", P.gold[2], 2, 1.8);
      d.tube("M50 79 V84", P.red[1], 3, 2);
      d.path("M46 83 H54 L57 93 H43 Z", d.fill(P.red, "v"), { sw: 2.2 });
      d.ellipse(50, 46, 35, 28, d.rad([[0, "#ffd27a"], [0.45, P.red[1]], [1, P.red[2]]], 0.42, 0.42, 0.75), { sw: 3.5 });
      d.clip(oval(50, 46, 35, 28), (k) => {
        for (const kx of [-0.7, -0.35, 0, 0.35, 0.7]) k.stroke(`M${50 + kx * 22} 18 Q${50 + kx * 48} 46 ${50 + kx * 22} 74`, { color: P.red[2], sw: 2 });
      });
      d.path(rr(35, 12, 30, 9, 3), d.fill(P.gold, "v"), { sw: 2.8 });
      d.path(rr(35, 71, 30, 9, 3), d.fill(P.gold, "v"), { sw: 2.8 });
      d.shine(31, 32, 6, 3, 0.5, -35);
    }),
  ],
  [
    "👝",
    "pouch",
    (d) => d.g("translate(4 -4)", (d) => {
      const c = P.teal;
      d.shadow(52, 90, 38);
      d.tube("M17 42 Q4 46 6 60 Q8 70 18 66", c[2], 3.5, 2.4);
      const body = "M14 38 Q14 32 20 32 H82 Q88 32 88 38 L86 78 Q85 86 77 86 H25 Q17 86 16 78 Z";
      d.path(body, d.fill(c, "v"), { sw: 3.5 });
      d.path(rr(20, 54, 62, 26, 7), "none", { stroke: c[2], sw: 1.8, dash: "3 3" });
      d.tube("M18 41 H84", P.silver[1], 3.4, 2);
      d.stroke("M19 41 H83", { color: P.silver[2], sw: 3.4, dash: "1.4 1.6", cap: "butt" });
      d.path(rr(66, 38, 7, 16, 3), d.fill(P.gold), { sw: 2 });
      d.circle(69.5, 49, 1.6, OL, { stroke: null });
      d.shine(28, 46, 6, 2, 0.5, -5);
    }),
  ],
  [
    "👘",
    "kimono",
    (d) => {
      const c = P.violet;
      const blossom = (g: Pen, x: number, y: number, r: number) => {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
          g.circle(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.75, P.pink[0], { stroke: null });
        }
        g.circle(x, y, r * 0.5, P.gold[1], { stroke: null });
      };
      const sleeve = "M31 13 L8 19 Q5 20 5 24 V58 Q5 63 10 63 H31 Z";
      for (const flip of [false, true]) {
        const s = (g: Pen) => {
          g.path(sleeve, g.fill(c, "v"), { sw: 3.2 });
          g.clip(sleeve, (k) => blossom(k, 16, 47, 3.2));
        };
        if (flip) d.mirror(50, s);
        else s(d);
      }
      const body = "M30 11 H70 L73 90 Q73 92 71 92 H29 Q27 92 27 90 Z";
      d.path(body, d.fill(c, "v"), { sw: 3.5 });
      d.clip(body, (k) => {
        blossom(k, 36, 74, 3.4);
        blossom(k, 62, 82, 3.4);
        blossom(k, 58, 66, 2.6);
        k.stroke("M46 58 L40 92", { sw: 2.4 });
      });
      d.path("M39 10 L46 10 L62 50 L55 50 Z", d.fill(P.cream, "v"), { sw: 2.4 });
      d.path("M61 10 L54 10 L38 50 L45 50 Z", d.fill(P.white, "v"), { sw: 2.4 });
      d.path(rr(26, 46, 48, 13, 2), d.fill(P.gold, "v"), { sw: 3 });
      d.stroke("M27 52.5 H73", { color: P.red[1], sw: 2.4 });
      d.shine(34, 24, 2.2, 7, 0.45, 10);
    },
  ],
];
