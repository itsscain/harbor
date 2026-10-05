// Marks, arrows, colors, shapes, numbers and letters, hearts and signs — crisp and bold. Most are
// built from a few helpers so a family (every arrow, every colored square) matches exactly.

import { OL, P, circlePath, cloudPath, heart, rr, softStar, sparklePath, star, type Pen, type Ramp } from "../pen";
import type { PicDef } from "..";

// ── Helpers ─────────────────────────────────────────────────────────────────────────────────
/** A rounded-square badge (keycaps, buttons). */
const badge = (d: Pen, ramp: Ramp, r = 20) => {
  d.path(rr(10, 10, 80, 80, r), d.fill(ramp, "v"), { sw: 3.5 });
  d.shine(28, 22, 14, 4.5, 0.35, -8);
};
const square = (ramp: Ramp) => (d: Pen) => {
  d.path(rr(14, 14, 72, 72, 14), d.fill(ramp), { sw: 3.5 });
  d.shine(30, 27, 12, 5, 0.5, -20);
};
const disc = (ramp: Ramp) => (d: Pen) => d.ball(50, 50, 37, ramp, { sw: 3.5 });

/** A fat arrow pointing at `deg` (0 = right), centered. */
const arrow = (deg: number, ramp: Ramp = P.blue) => (d: Pen) =>
  d.g(`rotate(${deg} 50 50)`, (g) => {
    g.path("M12 40 L52 40 L52 20 L90 50 L52 80 L52 60 L12 60 Z", g.fill(ramp, deg % 180 === 0 ? "v" : "h"), { sw: 3.5 });
    g.stroke("M17 44 H48", { sw: 2.5, color: "#ffffff", op: 0.55 });
  });
const head = (d: Pen, x: number, y: number, deg: number, s: number, color: string) =>
  d.path(`M${x + s} ${y} L${x - s * 0.7} ${y - s * 0.95} L${x - s * 0.7} ${y + s * 0.95} Z`, color, { sw: 3, tf: `rotate(${deg} ${x} ${y})` });

/** Stroke letters and digits in a 10×14 box, drawn as outlined tubes. */
const GLYPH: Record<string, string> = {
  "0": "M5 0.9 C8.6 0.9 9.8 4 9.8 7 C9.8 10 8.6 13.1 5 13.1 C1.4 13.1 0.2 10 0.2 7 C0.2 4 1.4 0.9 5 0.9 Z",
  "1": "M2.2 3.6 L6 0.9 V13.1",
  "2": "M1 4 C1 1.4 3.6 0.6 5.4 0.8 C8.4 1.2 9.6 4 7.9 6.6 L1 13.1 H9.8",
  "3": "M1.3 2.2 C3 0.4 8.2 0.2 8.6 3.6 C8.9 6 6.2 7 4.6 7 C7.2 7 9.6 8.1 9.4 10.6 C9.1 13.6 3 14 1 11.8",
  "4": "M7.4 13.1 V0.9 L0.4 9.4 H10",
  "5": "M9 0.9 H2.2 L1.3 6.8 C3 5.6 6 5.4 8 6.8 C10 8.5 9.5 12.5 6 13.2 C3.8 13.6 2 12.8 1 11.5",
  "6": "M8.6 2.2 C6.2 0 1.4 0.9 1 6.6 C0.7 10 2 13.2 5 13.2 C8 13.2 9.3 11 9.2 9.2 C9 7 7 5.8 5 5.8 C3 5.8 1.3 7 1 9",
  "7": "M0.8 0.9 H9.6 L4 13.1",
  "8": "M5 7 C2 7 1.2 5 1.4 3.8 C1.7 1.5 3.5 0.8 5 0.8 C6.5 0.8 8.3 1.5 8.6 3.8 C8.8 5 8 7 5 7 C1.8 7 0.8 9 1 10.5 C1.3 12.8 3.4 13.3 5 13.3 C6.6 13.3 8.7 12.8 9 10.5 C9.2 9 8.2 7 5 7 Z",
  "9": "M9 5 C8.7 7 7 8.2 5 8.2 C3 8.2 0.8 7 0.8 4.6 C0.8 2.2 2.8 0.8 5 0.8 C8 0.8 9.2 3 9.1 6 C9 10 7 13.2 4 13.2 C2.8 13.2 1.8 12.6 1.3 12",
  A: "M0.6 13.1 L5 0.9 L9.4 13.1 M2.3 8.7 H7.7",
  B: "M1 0.9 V13.1 M1 0.9 H5.4 C8 0.9 8.8 2.5 8.8 3.9 C8.8 5.6 7.4 6.8 5.4 6.8 H1 M5.4 6.8 C8.3 6.8 9.4 8.3 9.4 10 C9.4 11.8 8 13.1 5.6 13.1 H1",
  C: "M9.3 3 C8.3 1.6 7 0.9 5.4 0.9 C2.5 0.9 0.8 3.6 0.8 7 C0.8 10.4 2.5 13.1 5.4 13.1 C7 13.1 8.4 12.4 9.3 11",
  D: "M1 0.9 V13.1 M1 0.9 H4.4 C8 0.9 9.6 3.5 9.6 7 C9.6 10.5 8 13.1 4.4 13.1 H1",
  O: "M5 0.9 C8.8 0.9 10 4 10 7 C10 10 8.8 13.1 5 13.1 C1.2 13.1 0 10 0 7 C0 4 1.2 0.9 5 0.9 Z",
  a: "M8 5 V13.1 M8 9 C8 6.3 6.6 5 4.6 5 C2.4 5 1 6.8 1 9 C1 11.3 2.4 13.1 4.6 13.1 C6.6 13.1 8 11.6 8 9",
  b: "M1.2 0.9 V13.1 M1.2 9 C1.2 6.4 2.8 5 4.8 5 C7 5 8.4 6.8 8.4 9 C8.4 11.3 7 13.1 4.8 13.1 C2.8 13.1 1.2 11.6 1.2 9",
  c: "M8 6.4 C7.3 5.5 6.2 5 5 5 C2.6 5 1 6.8 1 9 C1 11.3 2.6 13.1 5 13.1 C6.2 13.1 7.3 12.6 8 11.6",
  d: "M8 0.9 V13.1 M8 9 C8 6.4 6.4 5 4.4 5 C2.2 5 0.8 6.8 0.8 9 C0.8 11.3 2.2 13.1 4.4 13.1 C6.4 13.1 8 11.6 8 9",
  "#": "M3.4 1 L2.2 13 M7.8 1 L6.6 13 M0.6 4.6 H9.8 M0.2 9.4 H9.4",
  "%": "M9 1.4 L1 12.6",
  "!": "M5 1 V9",
  "?": "M1.6 3.8 C1.6 1.6 3.2 0.8 5 0.8 C7.2 0.8 8.6 2 8.6 3.8 C8.6 5.6 7 6.4 5.8 7 C5.2 7.3 5 7.8 5 8.6 V9.4",
};
/** Write `s` centered at (cx, cy), `h` tall, as outlined tubes in `color`. */
const write = (d: Pen, s: string, cx: number, cy: number, h: number, color = "#ffffff", gap = 0.35) => {
  const k = h / 14;
  const adv = 10 * k + gap * 10 * k;
  const w = s.length * adv - gap * 10 * k;
  [...s].forEach((ch, i) => {
    const x0 = cx - w / 2 + i * adv;
    const y0 = cy - h / 2;
    const tf = `translate(${x0} ${y0}) scale(${k})`;
    const sw = 3 / k;
    if (ch === "%") {
      d.g(tf, (g) => {
        g.tube(GLYPH["%"], color, 2.1, sw / 2.2);
        g.circle(2.4, 3.2, 1.9, color, { sw: sw / 2.4 });
        g.circle(7.6, 10.8, 1.9, color, { sw: sw / 2.4 });
      });
      return;
    }
    const path = GLYPH[ch];
    if (!path) return;
    d.g(tf, (g) => {
      g.tube(path, color, 2.1, sw / 2.2);
      if (ch === "!" || ch === "?") g.circle(5, 12.4, 1.25, color, { sw: sw / 2.6 });
    });
  });
};
const keycap = (s: string, ramp: Ramp = P.blue) => (d: Pen) => {
  badge(d, ramp);
  write(d, s, 50, 52, s.length > 1 ? 34 : 46);
};
const grid4 = (chars: string, ramp: Ramp) => (d: Pen) => {
  badge(d, ramp);
  [...chars].forEach((ch, i) => write(d, ch, i % 2 ? 66 : 34, i < 2 ? 34 : 68, 24));
};
/** A heart in a ramp, with a shine. */
const heartOf = (d: Pen, ramp: Ramp, cx = 50, cy = 52, s = 38) => {
  d.path(heart(cx, cy, s), d.fill(ramp), { sw: 3.5 });
  d.shine(cx - s * 0.5, cy - s * 0.48, s * 0.2, s * 0.12, 0.6, -35);
};
/** The red "no" ring with a slash, drawn over a picture. */
const noSign = (d: Pen, inner: (d: Pen) => void) => {
  d.circle(50, 50, 40, "#ffffff", { sw: 3.5 });
  inner(d);
  d.circle(50, 50, 36, "none", { sw: 12, stroke: OL });
  d.circle(50, 50, 36, "none", { sw: 7, stroke: P.red[1] });
  d.tube("M25 25 L75 75", P.red[1], 7, 2.5);
};
const music = (d: Pen, x: number, y: number, s: number, ramp: Ramp = P.violet) => {
  d.ellipse(x, y, s * 0.62, s * 0.46, d.fill(ramp), { sw: 3, tf: `rotate(-22 ${x} ${y})` });
  d.tube(`M${x + s * 0.52} ${y - s * 0.1} V${y - s * 2}`, ramp[2], s * 0.18, 2.6);
};

export const SYMBOLS: PicDef[] = [
  [
    "✅",
    "check mark",
    (d) => {
      d.path(rr(12, 12, 76, 76, 22), d.fill(P.green, "v"), { sw: 3.5 });
      d.shine(30, 24, 14, 5, 0.4, -10);
      d.tube("M30 52 L45 66 L71 36", "#ffffff", 10, 3);
    },
  ],
  [
    "❌",
    "cross mark",
    (d) => {
      d.tube("M24 24 L76 76 M76 24 L24 76", P.red[1], 17, 3.5);
      d.stroke("M22 30 L28 24", { sw: 3, color: "#ffffff", op: 0.6 });
    },
  ],
  [
    "❓",
    "question mark",
    (d) => {
      d.tube("M33 34 Q33 14 51 14 Q69 14 69 31 Q69 43 57 48 Q50 51 50 60 V63", P.red[1], 14, 3.5);
      d.circle(50, 82, 9, d.fill(P.red), { sw: 3.5 });
      d.stroke("M37 28 Q40 21 47 19", { sw: 3, color: "#ffffff", op: 0.6 });
    },
  ],
  [
    "❔",
    "white question mark",
    (d) => {
      d.tube("M33 34 Q33 14 51 14 Q69 14 69 31 Q69 43 57 48 Q50 51 50 60 V63", P.white[1], 14, 3.5);
      d.circle(50, 82, 9, d.fill(P.white), { sw: 3.5 });
    },
  ],
  [
    "❗",
    "exclamation mark",
    (d) => {
      d.path("M40 12 Q50 7 60 12 L56 62 Q50 66 44 62 Z", d.fill(P.red, "v"), { sw: 3.5 });
      d.circle(50, 80, 9.5, d.fill(P.red), { sw: 3.5 });
      d.stroke("M45 18 L47 50", { sw: 3, color: "#ffffff", op: 0.55 });
    },
  ],
  [
    "✨",
    "sparkles",
    (d) => {
      d.glow(50, 50, 46, "#fff3a0", 0.55);
      d.path(sparklePath(44, 54, 30), d.fill(P.gold), { sw: 3 });
      d.path(sparklePath(76, 26, 14), d.fill(P.gold), { sw: 2.6 });
      d.path(sparklePath(78, 76, 10), d.fill(P.gold), { sw: 2.4 });
      d.shine(38, 46, 4, 9, 0.6, 0);
    },
  ],
  [
    "💥",
    "boom",
    (d) => {
      d.path(star(50, 50, 44, 24, 10, 8), d.fill(P.orange), { sw: 3.5 });
      d.path(star(50, 50, 26, 14, 8, -6), d.fill(P.lemon), { sw: 2.6 });
      d.circle(50, 50, 7, "#fffbe0", { stroke: null });
    },
  ],
  [
    "💫",
    "dizzy star",
    (d) => {
      d.tube("M14 70 Q30 86 54 74 Q74 62 70 44", P.gold[0], 6, 2.5);
      d.path(softStar(64, 34, 26, 12.5), d.fill(P.gold), { sw: 3.2 });
      d.shine(57, 26, 4, 2.5, 0.6, -35);
      d.path(sparklePath(22, 30, 8), d.fill(P.gold), { sw: 2 });
    },
  ],
  ["💤", "zzz", (d) => [[28, 72, 26], [54, 46, 20], [74, 24, 14]].forEach(([x, y, s]) => d.tube(`M${x - s / 2} ${y - s / 2} H${x + s / 2} L${x - s / 2} ${y + s / 2} H${x + s / 2}`, P.sky[1], s * 0.24, 3))],
  [
    "💢",
    "anger symbol",
    (d) => {
      for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]])
        d.tube(`M${50 + dx * 9} ${50 + dy * 36} Q${50 + dx * 10} ${50 + dy * 10} ${50 + dx * 36} ${50 + dy * 9}`, P.red[1], 9, 3);
    },
  ],
  [
    "🔆",
    "bright",
    (d) => {
      badge(d, P.lemon, 22);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        d.tube(`M${50 + Math.cos(a) * 22} ${52 + Math.sin(a) * 22} L${50 + Math.cos(a) * 32} ${52 + Math.sin(a) * 32}`, P.orange[1], 4, 2.4);
      }
      d.ball(50, 52, 15, P.orange, { sw: 3 });
    },
  ],
  // Colors.
  ["⚪", "white circle", disc(P.white)],
  ["⚫", "black circle", disc(P.black)],
  ["🔴", "red circle", disc(P.red)],
  ["🔵", "blue circle", disc(P.blue)],
  ["🟢", "green circle", disc(P.green)],
  ["🟡", "yellow circle", disc(P.gold)],
  ["🟠", "orange circle", disc(P.orange)],
  ["🟣", "purple circle", disc(P.violet)],
  ["🟤", "brown circle", disc(P.brown)],
  ["🟥", "red square", square(P.red)],
  ["🟨", "yellow square", square(P.gold)],
  ["🟩", "green square", square(P.green)],
  ["🟦", "blue square", square(P.blue)],
  ["🟫", "brown square", square(P.brown)],
  ["⬛", "black square", square(P.black)],
  ["⬜", "white square", square(P.white)],
  [
    "▪️",
    "small square",
    (d) => {
      d.path(rr(30, 30, 40, 40, 8), d.fill(P.black), { sw: 3 });
      d.shine(39, 38, 6, 2.5, 0.4, -20);
    },
  ],
  [
    "🔲",
    "square button",
    (d) => {
      d.path(rr(12, 12, 76, 76, 12), d.fill(P.black, "v"), { sw: 3.5 });
      d.path(rr(24, 24, 52, 52, 8), d.fill(P.white), { sw: 3 });
    },
  ],
  [
    "🔘",
    "radio button",
    (d) => {
      d.ball(50, 50, 38, P.white, { sw: 3.5 });
      d.circle(50, 50, 24, "none", { sw: 3.5 });
      d.ball(50, 50, 15, P.ink, { sw: 3 });
    },
  ],
  ["⭕", "red ring", (d) => {
    d.circle(50, 50, 33, "none", { sw: 19, stroke: OL });
    d.circle(50, 50, 33, "none", { sw: 12, stroke: P.red[1] });
    d.stroke("M26 34 Q32 24 42 20", { sw: 3, color: "#ffffff", op: 0.55 });
  }],
  ["🔺", "red triangle", (d) => {
    d.path("M50 12 L90 84 Q90 88 86 88 L14 88 Q10 88 10 84 Z", d.fill(P.red), { sw: 3.5 });
    d.shine(42, 40, 5, 10, 0.5, 30);
  }],
  ["🔷", "blue diamond", (d) => {
    d.path("M50 8 L90 50 L50 92 L10 50 Z", d.fill(P.blue), { sw: 3.5 });
    d.shine(36, 38, 8, 4, 0.5, -45);
  }],
  ["🔶", "orange diamond", (d) => {
    d.path("M50 8 L90 50 L50 92 L10 50 Z", d.fill(P.orange), { sw: 3.5 });
    d.shine(36, 38, 8, 4, 0.5, -45);
  }],
  ["🔼", "up button", (d) => {
    badge(d, P.coral);
    d.path("M50 28 L74 68 L26 68 Z", "#ffffff", { sw: 3 });
  }],
  ["🔽", "down button", (d) => {
    badge(d, P.coral);
    d.path("M50 72 L74 32 L26 32 Z", "#ffffff", { sw: 3 });
  }],
  ["▶️", "play button", (d) => {
    badge(d, P.blue);
    d.path("M38 28 L72 50 L38 72 Z", "#ffffff", { sw: 3 });
  }],
  ["⏩", "fast forward", (d) => {
    badge(d, P.blue);
    d.path("M24 30 L50 50 L24 70 Z M50 30 L76 50 L50 70 Z", "#ffffff", { sw: 3 });
  }],
  ["⏪", "rewind", (d) => {
    badge(d, P.blue);
    d.path("M76 30 L50 50 L76 70 Z M50 30 L24 50 L50 70 Z", "#ffffff", { sw: 3 });
  }],
  // Arrows.
  ["➡️", "right arrow", arrow(0)],
  ["⬅️", "left arrow", arrow(180)],
  ["⬆️", "up arrow", arrow(-90)],
  ["⬇️", "down arrow", arrow(90)],
  ["↘️", "down-right arrow", arrow(45)],
  ["↔️", "left-right arrow", (d) => {
    d.path("M8 50 L30 26 L30 40 L70 40 L70 26 L92 50 L70 74 L70 60 L30 60 L30 74 Z", d.fill(P.blue, "v"), { sw: 3.5 });
    d.stroke("M34 44 H66", { sw: 2.5, color: "#ffffff", op: 0.55 });
  }],
  ["↕️", "up-down arrow", (d) => {
    d.path("M50 8 L74 30 L60 30 L60 70 L74 70 L50 92 L26 70 L40 70 L40 30 L26 30 Z", d.fill(P.blue, "h"), { sw: 3.5 });
    d.stroke("M44 34 V66", { sw: 2.5, color: "#ffffff", op: 0.55 });
  }],
  ["↩️", "turn back arrow", (d) => {
    d.tube("M80 82 V50 Q80 30 60 30 H34", P.blue[1], 13, 3.5);
    head(d, 26, 30, 180, 20, P.blue[1]);
  }],
  ["↪️", "turn arrow", (d) => {
    d.tube("M20 82 V50 Q20 30 40 30 H66", P.blue[1], 13, 3.5);
    head(d, 74, 30, 0, 20, P.blue[1]);
  }],
  ["🔁", "repeat", (d) => {
    d.tube("M22 56 V44 Q22 30 36 30 H66", P.teal[1], 11, 3.2);
    head(d, 72, 30, 0, 15, P.teal[1]);
    d.tube("M78 44 V56 Q78 70 64 70 H34", P.teal[1], 11, 3.2);
    head(d, 28, 70, 180, 15, P.teal[1]);
  }],
  ["🔄", "arrows going around", (d) => {
    d.tube("M26 60 A26 26 0 0 1 64 28", P.teal[1], 11, 3.2);
    head(d, 68, 31, 40, 14, P.teal[1]);
    d.tube("M74 40 A26 26 0 0 1 36 72", P.teal[1], 11, 3.2);
    head(d, 32, 69, 220, 14, P.teal[1]);
  }],
  ["🔃", "clockwise arrows", (d) => {
    d.tube("M30 34 A26 26 0 0 1 74 46", P.teal[1], 11, 3.2);
    head(d, 75, 52, 95, 14, P.teal[1]);
    d.tube("M70 66 A26 26 0 0 1 26 54", P.teal[1], 11, 3.2);
    head(d, 25, 48, 275, 14, P.teal[1]);
  }],
  ["🔀", "shuffle", (d) => {
    d.tube("M14 32 H32 Q44 32 50 50 Q56 68 68 68 H76", P.violet[1], 10, 3);
    d.tube("M14 68 H32 Q44 68 50 50 Q56 32 68 32 H76", P.violet[1], 10, 3);
    head(d, 82, 32, 0, 13, P.violet[1]);
    head(d, 82, 68, 0, 13, P.violet[1]);
  }],
  ["🔝", "to the top", (d) => {
    d.tube("M22 14 H78", P.ink[1], 9, 3);
    d.g("translate(0 6)", arrow(-90, P.blue));
  }],
  ["🔚", "the end", (d) => {
    d.tube("M14 22 V78", P.ink[1], 9, 3);
    d.g("translate(6 0)", arrow(180, P.blue));
  }],
  // Math.
  ["➕", "plus", (d) => d.tube("M50 18 V82 M18 50 H82", P.green[1], 15, 3.5)],
  ["➖", "minus", (d) => d.tube("M18 50 H82", P.red[1], 15, 3.5)],
  ["✖️", "times", (d) => d.tube("M26 26 L74 74 M74 26 L26 74", P.orange[1], 15, 3.5)],
  ["➗", "divide", (d) => {
    d.tube("M18 50 H82", P.violet[1], 13, 3.5);
    d.ball(50, 24, 9, P.violet, { sw: 3 });
    d.ball(50, 76, 9, P.violet, { sw: 3 });
  }],
  ["💯", "one hundred", (d) => {
    write(d, "100", 50, 42, 40, P.red[1], 0.18);
    d.tube("M18 70 Q50 64 82 70 M24 82 Q50 77 76 82", P.red[1], 6, 2.6);
  }],
  ["〰️", "wavy line", (d) => d.tube("M10 52 Q20 32 30 50 T50 50 T70 50 T90 48", P.teal[1], 9, 3)],
  ["➰", "curly loop", (d) => d.tube("M10 66 Q28 66 40 54 Q58 36 50 26 Q40 16 34 34 Q28 56 56 66 Q74 72 90 62", P.teal[1], 8, 3)],
  ["♾️", "infinity", (d) => d.tube("M50 50 C40 34 16 32 16 50 C16 68 40 66 50 50 C60 34 84 32 84 50 C84 68 60 66 50 50 Z", P.violet[1], 10, 3.2)],
  // Numbers and letters.
  ["0️⃣", "zero", keycap("0")],
  ["1️⃣", "one", keycap("1")],
  ["3️⃣", "three", keycap("3")],
  ["5️⃣", "five", keycap("5")],
  ["6️⃣", "six", keycap("6")],
  ["7️⃣", "seven", keycap("7")],
  ["9️⃣", "nine", keycap("9")],
  ["🔟", "ten", keycap("10")],
  ["🔢", "numbers", grid4("1234", P.blue)],
  ["🔤", "letters abc", (d) => {
    badge(d, P.teal);
    write(d, "abc", 50, 52, 30);
  }],
  ["🔡", "small letters", grid4("abcd", P.teal)],
  ["🔠", "capital letters", grid4("ABCD", P.teal)],
  ["🔣", "symbols", grid4("#%!?", P.violet)],
  ["🅰️", "letter A", keycap("A", P.red)],
  ["🅱️", "letter B", keycap("B", P.red)],
  ["🅾️", "letter O", keycap("O", P.red)],
  // Hearts.
  ["❤️", "red heart", (d) => heartOf(d, P.red)],
  ["💛", "yellow heart", (d) => heartOf(d, P.gold)],
  ["🤍", "white heart", (d) => heartOf(d, P.white)],
  ["🖤", "black heart", (d) => heartOf(d, P.black)],
  ["💔", "broken heart", (d) => {
    const crack = "M50 22 L44 36 L54 46 L44 58 L52 70 L50 90";
    d.g("translate(-4 0) rotate(-8 50 90)", (g) => g.clip("M0 0 H50 L44 36 L54 46 L44 58 L52 70 L50 100 H0 Z", (c) => heartOf(c, P.red)));
    d.g("translate(4 0) rotate(8 50 90)", (g) => g.clip("M100 0 H50 L44 36 L54 46 L44 58 L52 70 L50 100 H100 Z", (c) => heartOf(c, P.red)));
    void crack;
  }],
  ["💖", "sparkling heart", (d) => {
    heartOf(d, P.pink);
    d.sparkle(78, 24, 10);
    d.sparkle(20, 74, 7);
    d.sparkle(62, 58, 6, "#ffffff");
  }],
  ["💗", "growing heart", (d) => {
    heartOf(d, P.rose, 50, 54, 42);
    heartOf(d, P.pink, 50, 56, 26);
  }],
  ["💓", "beating heart", (d) => {
    heartOf(d, P.red, 50, 54, 32);
    for (const s of [-1, 1]) d.stroke(`M${50 + s * 42} 38 q${s * 6} 10 0 20 M${50 + s * 48} 32 q${s * 8} 16 0 32`, { sw: 3, color: P.red[1] });
  }],
  ["💞", "two hearts", (d) => {
    heartOf(d, P.pink, 38, 40, 24);
    heartOf(d, P.red, 64, 64, 22);
  }],
  ["💝", "heart with a ribbon", (d) => {
    heartOf(d, P.red);
    d.path("M50 26 L50 90", "none", { sw: 9, stroke: OL });
    d.stroke("M50 26 V88", { sw: 5, color: P.gold[1] });
    d.path("M50 28 Q36 12 30 22 Q28 32 50 30 Q72 32 70 22 Q64 12 50 28 Z", d.fill(P.gold), { sw: 2.6 });
  }],
  // Bubbles.
  ["💬", "speech bubble", (d) => {
    d.path("M20 16 H80 Q92 16 92 28 V58 Q92 70 80 70 H44 L26 86 L30 70 H20 Q8 70 8 58 V28 Q8 16 20 16 Z", d.fill(P.white, "v"), { sw: 3.5 });
    for (const x of [32, 50, 68]) d.circle(x, 43, 5, P.sky[1], { sw: 2 });
  }],
  ["💭", "thought bubble", (d) => {
    d.path(cloudPath(54, 40, 78, 56), d.fill(P.white, "v"), { sw: 3.5 });
    d.circle(24, 78, 7, d.fill(P.white), { sw: 3 });
    d.circle(14, 90, 4, d.fill(P.white), { sw: 2.5 });
  }],
  ["🗯️", "shout bubble", (d) => {
    d.path(star(52, 46, 42, 30, 12, 4), d.fill(P.white, "v"), { sw: 3.5 });
    d.tube("M52 26 V48", P.red[1], 8, 2.6);
    d.circle(52, 62, 5, P.red[1], { sw: 2.5 });
  }],
  // Signs.
  ["🚫", "not allowed", (d) => noSign(d, () => undefined)],
  ["⛔", "no entry", (d) => {
    d.ball(50, 50, 40, P.red, { sw: 3.5 });
    d.path(rr(20, 42, 60, 16, 5), "#ffffff", { sw: 3 });
  }],
  ["🛑", "stop sign", (d) => {
    const oct = (r: number) => {
      const p: number[] = [];
      for (let i = 0; i < 8; i++) {
        const a = ((i * 45 + 22.5) * Math.PI) / 180;
        p.push(50 + Math.cos(a) * r, 50 + Math.sin(a) * r);
      }
      return p;
    };
    d.poly(oct(42), d.fill(P.red), { sw: 3.5 });
    d.poly(oct(35), "none", { sw: 3.5, stroke: "#ffffff" });
    d.path(rr(26, 44, 48, 12, 4), "#ffffff", { stroke: null });
  }],
  ["⚠️", "warning", (d) => {
    d.path("M50 10 L92 84 Q92 90 86 90 L14 90 Q8 90 8 84 Z", d.fill(P.gold), { sw: 3.5, join: "round" });
    d.tube("M50 36 V62", P.ink[1], 7, 2);
    d.circle(50, 75, 4.5, P.ink[1], { stroke: null });
  }],
  ["♻️", "recycle", (d) => {
    // Three arrows chasing each other along the sides of a triangle (corners 50,12 · 88,80 ·
    // 12,80, whose middle is 50, 57.3): each runs up its side and points at the next corner.
    for (let i = 0; i < 3; i++)
      d.g(`rotate(${i * 120} 50 57.33)`, (g) => {
        g.tube("M19 67.8 L37.5 34.6", P.green[1], 10, 3);
        head(g, 42.2, 26.2, -60.8, 12, P.green[1]);
      });
  }],
  ["♿", "accessible", (d) => {
    badge(d, P.blue);
    d.circle(46, 26, 6, "#ffffff", { stroke: null });
    d.stroke("M44 36 L42 58 H62 L68 74", { sw: 6, color: "#ffffff" });
    d.stroke("M42 46 H58", { sw: 5, color: "#ffffff" });
    d.circle(44, 64, 14, "none", { sw: 5, stroke: "#ffffff" });
  }],
  ["☢️", "radiation sign", (d) => {
    d.ball(50, 50, 40, P.gold, { sw: 3.5 });
    for (let i = 0; i < 3; i++) d.path(`M50 50 L${50 + Math.cos(((i * 120 - 90) * Math.PI) / 180 - 0.5) * 32} ${50 + Math.sin(((i * 120 - 90) * Math.PI) / 180 - 0.5) * 32} A32 32 0 0 1 ${50 + Math.cos(((i * 120 - 90) * Math.PI) / 180 + 0.5) * 32} ${50 + Math.sin(((i * 120 - 90) * Math.PI) / 180 + 0.5) * 32} Z`, P.black[1], { stroke: null });
    d.circle(50, 50, 9, P.gold[1], { stroke: null });
    d.circle(50, 50, 6, P.black[1], { stroke: null });
  }],
  ["🚭", "no smoking", (d) => noSign(d, (g) => {
    g.rect(24, 46, 46, 9, 2, "#ffffff", { sw: 2.5 });
    g.rect(62, 46, 8, 9, 2, P.orange[1], { sw: 2.5 });
    g.stroke("M74 42 q4 -6 0 -12", { sw: 2.5, color: P.grey[2] });
  })],
  ["🚯", "no littering", (d) => noSign(d, (g) => {
    g.path("M36 40 H64 L60 74 H40 Z", g.fill(P.grey, "v"), { sw: 2.6 });
    g.rect(32, 34, 36, 7, 3, P.grey[1], { sw: 2.6 });
  })],
  ["📵", "no phones", (d) => noSign(d, (g) => {
    g.path(rr(38, 24, 24, 50, 5), g.fill(P.ink, "v"), { sw: 2.6 });
    g.rect(42, 30, 16, 34, 2, P.sky[0], { stroke: null });
  })],
  ["🔊", "loud speaker", (d) => {
    d.path("M14 40 H30 L52 22 V78 L30 60 H14 Z", d.fill(P.ink, "v"), { sw: 3.5 });
    d.tube("M62 38 Q70 50 62 62", P.sky[1], 5, 2.5);
    d.tube("M70 28 Q84 50 70 72", P.sky[1], 5, 2.5);
  }],
  ["🔇", "muted speaker", (d) => {
    d.path("M14 40 H30 L52 22 V78 L30 60 H14 Z", d.fill(P.ink, "v"), { sw: 3.5 });
    d.tube("M64 38 L86 60 M86 38 L64 60", P.red[1], 6, 2.6);
  }],
  ["♨️", "hot springs", (d) => {
    d.path("M14 62 Q14 86 50 86 Q86 86 86 62 Z", d.fill(P.red, "v"), { sw: 3.5 });
    for (const x of [32, 50, 68]) d.tube(`M${x} 54 Q${x - 7} 44 ${x} 36 Q${x + 7} 26 ${x} 16`, P.coral[1], 5.5, 2.5);
  }],
  ["⚛️", "atom", (d) => {
    for (const r of [0, 60, -60]) d.ellipse(50, 50, 40, 15, "none", { sw: 4, tf: `rotate(${r} 50 50)`, stroke: P.violet[1] });
    d.ball(50, 50, 9, P.violet, { sw: 3 });
    d.circle(88, 50, 4, P.violet[1], { stroke: null });
  }],
  ["✝️", "cross", (d) => {
    d.glow(50, 42, 46, "#fff3b0", 0.6);
    d.path("M42 8 H58 V30 H78 V46 H58 V92 H42 V46 H22 V30 H42 Z", d.fill(P.wood, "h"), { sw: 3.5 });
    d.stroke("M46 14 V86 M28 36 H72", { sw: 1.6, color: P.wood[2], op: 0.6 });
    d.shine(46, 22, 2, 8, 0.55, 0);
  }],
  ["📍", "map pin", (d) => {
    d.shadow(50, 92, 14);
    d.path("M50 92 Q26 62 26 40 A24 24 0 0 1 74 40 Q74 62 50 92 Z", d.fill(P.red), { sw: 3.5 });
    d.circle(50, 40, 9, "#ffffff", { sw: 3 });
    d.shine(38, 28, 6, 3.5, 0.55, -35);
  }],
  ["🚩", "red flag", (d) => {
    d.tube("M28 92 V12", P.steel[1], 5, 2.6);
    d.path("M30 14 Q52 8 60 20 Q68 30 84 26 L72 44 L84 60 Q66 64 58 54 Q50 44 30 50 Z", d.fill(P.red, "d"), { sw: 3 });
  }],
  ["🏁", "checkered flag", (d) => {
    d.tube("M24 92 V12", P.steel[1], 5, 2.6);
    const flag = "M26 14 Q48 8 58 18 Q68 26 86 22 V58 Q68 62 58 54 Q48 44 26 50 Z";
    d.path(flag, "#ffffff", { sw: 3 });
    d.clip(flag, (c) => {
      for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2 === 0) c.rect(26 + i * 10, 10 + j * 12, 10, 12, 0, P.black[1], { stroke: null, tf: `skewY(-4)` });
    });
    d.path(flag, "none", { sw: 3 });
  }],
  ["🏴‍☠️", "pirate flag", (d) => {
    d.tube("M22 94 V10", P.wood[1], 5, 2.6);
    const flag = "M24 12 Q46 6 58 16 Q70 24 88 20 V62 Q70 66 58 58 Q46 48 24 54 Z";
    d.path(flag, d.fill(P.black, "v"), { sw: 3 });
    d.circle(55, 32, 10, "#ffffff", { sw: 2 });
    d.rect(50, 39, 10, 6, 2, "#ffffff", { sw: 2 });
    d.circle(51.5, 32, 2.6, P.black[1], { stroke: null });
    d.circle(58.5, 32, 2.6, P.black[1], { stroke: null });
    d.stroke("M40 50 L70 42 M40 42 L70 50", { sw: 3.5, color: "#ffffff" });
  }],
  // Music and charts.
  ["🎵", "music note", (d) => {
    music(d, 42, 74, 22);
    d.tube("M54 30 Q68 34 70 50", P.violet[2], 5, 2.6);
  }],
  ["🎶", "music notes", (d) => {
    music(d, 30, 76, 17);
    music(d, 66, 66, 17);
    d.tube("M42 42 L78 32", P.violet[2], 5, 2.6);
  }],
  ["🎼", "music staff", (d) => {
    d.path(rr(8, 20, 84, 60, 10), d.fill(P.white, "v"), { sw: 3 });
    for (let i = 0; i < 5; i++) d.stroke(`M14 ${32 + i * 9} H86`, { sw: 1.8, color: P.ink[0] });
    d.tube("M30 76 C18 60 40 48 36 30 C34 22 26 24 28 34 L34 72", P.violet[1], 3.4, 2);
    music(d, 64, 59, 10);
  }],
  ["📈", "chart going up", (d) => {
    d.path(rr(10, 12, 80, 76, 10), d.fill(P.white, "v"), { sw: 3.5 });
    d.stroke("M22 24 V76 H80", { sw: 2.5, color: P.grey[2] });
    d.tube("M26 68 L44 52 L56 60 L76 32", P.green[1], 5, 2.5);
    head(d, 78, 30, -55, 8, P.green[1]);
  }],
  ["📉", "chart going down", (d) => {
    d.path(rr(10, 12, 80, 76, 10), d.fill(P.white, "v"), { sw: 3.5 });
    d.stroke("M22 24 V76 H80", { sw: 2.5, color: P.grey[2] });
    d.tube("M26 32 L44 48 L56 40 L76 66", P.red[1], 5, 2.5);
    head(d, 78, 69, 50, 8, P.red[1]);
  }],
  ["📊", "bar chart", (d) => {
    d.path(rr(10, 12, 80, 76, 10), d.fill(P.white, "v"), { sw: 3.5 });
    [[24, 50, P.blue], [42, 30, P.coral], [60, 60, P.green]].forEach(([x, h, c]) => d.path(rr(x as number, 76 - (h as number), 14, h as number, 3), d.fill(c as Ramp, "v"), { sw: 2.6 }));
    d.stroke("M18 76 H82", { sw: 2.5 });
  }],
];
void circlePath;
