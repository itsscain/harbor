// Pets, set B — penguin, seal, turtle and crab.
import { OL, P, circlePath, leaf, smooth, type Pen, type Ramp } from "../../art/pen";
import { allEyes, eyesHappy, eyesSleep, mouthOpen, mouthSmile, type PetRig } from "./rig";

const f = (n: number) => Math.round(n * 100) / 100;

/** An ellipse as a path, wound like circlePath — several of them in one path fill as one shape. */
function ellPath(cx: number, cy: number, rx: number, ry: number) {
  return `M${f(cx - rx)} ${f(cy)} a${f(rx)} ${f(ry)} 0 1 0 ${f(rx * 2)} 0 a${f(rx)} ${f(ry)} 0 1 0 ${f(-rx * 2)} 0 Z`;
}

/** A rounded hexagon (flat top), rx × ry. */
function hexPath(cx: number, cy: number, rx: number, ry: number) {
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) pts.push([cx + Math.cos((i * Math.PI) / 3) * rx, cy + Math.sin((i * Math.PI) / 3) * ry]);
  return smooth(pts, 0.07);
}

// ── Penguin ─────────────────────────────────────────────────────────────────────────────────
const PENG: Ramp = P.navy;

/** The penguin's flipper on the picture's left, its shoulder at (37.5, 58). */
function penguinFlipper(d: Pen) {
  const w = smooth([[38.5, 55.5], [33, 59.5], [29.2, 68], [28, 76.5], [30.5, 79.2], [34.8, 74.2], [39, 65.5], [40.5, 58.5]], 0.2);
  d.path(w, d.fill(PENG, "d"), { sw: 2.8 });
  d.shine(33.2, 64, 1.5, 3.8, 0.35, 22);
}

// ── Seal ────────────────────────────────────────────────────────────────────────────────────
const SEAL: Ramp = ["#eef3f9", "#b1bfd1", "#6f7f98"];

/** Big shiny eyes (a second, small sparkle each), with the happy and sleepy eyes at the same spots. */
function shinyEyes(d: Pen, lx: number, ly: number, rx: number, ry: number, r: number) {
  d.part("eyes", (lx + rx) / 2, (ly + ry) / 2, (g) => {
    for (const [x, y] of [[lx, ly], [rx, ry]]) {
      g.eye(x, y, r);
      g.circle(x + r * 0.3, y + r * 0.42, r * 0.17, "#fff", { stroke: null });
    }
  });
  eyesHappy(d, lx, ly, rx, ry, r);
  eyesSleep(d, lx, ly, rx, ry, r);
}

/** The seal's front flipper on the picture's left, its shoulder at (38, 60). */
function sealFlipper(d: Pen) {
  const w = smooth([[39.6, 57.6], [33.4, 61], [29.4, 68], [27.6, 74.8], [29.8, 78.8], [34.8, 78], [38.8, 72], [41.2, 65], [42, 60]], 0.2);
  d.path(w, d.fill(SEAL, "d"), { sw: 2.8 });
  for (const [x, y, a] of [[30, 76, 30], [32.4, 77.4, 10], [35, 76.6, -14]] as const)
    d.stroke(`M${x} ${y} l${f(Math.sin((a * Math.PI) / 180) * -1.4)} ${f(Math.cos((a * Math.PI) / 180) * 1.4)}`, { sw: 1.3 });
  d.shine(34.2, 64.5, 1.6, 3.4, 0.4, 22);
}

// ── Turtle ──────────────────────────────────────────────────────────────────────────────────
const SHELL: Ramp = P.green;
const PLATE: Ramp = ["#d4f7b4", "#93dd70", "#4fa83e"];
const TSKIN: Ramp = ["#d4fbf0", "#86e3cf", "#33a892"];
/** The honeycomb on the shell: [x, y, rx, ry]. */
const PLATES: [number, number, number, number][] = [
  [50, 72.5, 7.6, 7.2], [36.8, 64.9, 7.6, 7.2], [63.2, 64.9, 7.6, 7.2], [36.8, 80.1, 7.6, 7.2], [63.2, 80.1, 7.6, 7.2],
  [23.8, 72.5, 6.4, 7.2], [76.2, 72.5, 6.4, 7.2], [50, 57.3, 7.6, 7.2], [23.8, 57.3, 6.4, 7.2], [76.2, 57.3, 6.4, 7.2],
];

/** The turtle's front flipper on the picture's left, coming out of the shell's side at (20, 70.5). */
function turtleFlipper(d: Pen) {
  const w = smooth([[22.8, 66.6], [16.4, 69.4], [11.4, 75.4], [10, 81.4], [12.8, 83], [18, 79.4], [23.2, 73.8]], 0.22);
  d.path(w, d.fill(TSKIN, "d"), { sw: 2.8 });
  d.circle(16.6, 74.6, 1.3, TSKIN[2], { stroke: null, op: 0.55 });
  d.circle(14, 78.8, 1, TSKIN[2], { stroke: null, op: 0.55 });
}

// ── Crab ────────────────────────────────────────────────────────────────────────────────────
const CRAB: Ramp = ["#ffb39c", "#ff6a4d", "#d03a24"];
/** A pincer pointing up, centered on (0, 0), its wrist at (0, 9.4). */
const CLAW = "M0.5 -1.5 C-0.5 -5 -1 -9 -2.6 -11.6 C-7.6 -10.6 -10.2 -5.6 -9.6 0 C-9 6 -5 9.4 0 9.4 C5 9.4 9.2 6 9.2 0.4 C9.2 -4.6 7.4 -8.8 4.4 -10.8 C3.4 -7.2 2 -4.2 0.5 -1.5 Z";

/** The crab's claw on the picture's left: a jointed arm from the shell's edge at (29, 63), hanging
 *  down and out, with the big pincer bent up at the wrist so it opens outward. */
function crabClaw(d: Pen) {
  d.tube("M29 63 L24.6 71.2", CRAB[1], 4.6, 2.4);
  d.g("translate(16.4 70.05) rotate(-82) scale(0.88)", (c) => {
    c.path(CLAW, c.fill(CRAB), { sw: 2.8 });
    c.shine(-4.6, -2.6, 1.8, 3.2, 0.5, 8);
  });
  d.circle(29, 63, 3.3, d.fill(CRAB), { sw: 2.2 });
}

export const PETS_B: PetRig[] = [
  {
    id: "pet-penguin",
    voice: "honk",
    tricks: ["dance", "flap", "spin"],
    draw: (d) => {
      d.shadow(50, 92, 21, 3.4);
      // Webbed orange feet, three round toes each, peeking out under the belly.
      d.part("feet", 50, 90, (g) => {
        for (const x of [42, 58])
          g.path(`M${x - 6.6} 90.6 Q${x - 6.4} 86.6 ${x} 86.6 Q${x + 6.4} 86.6 ${x + 6.6} 90.6 Q${x + 4.4} 92.8 ${x + 2.2} 91 Q${x} 92.8 ${x - 2.2} 91 Q${x - 4.4} 92.8 ${x - 6.6} 90.6 Z`, g.fill(P.orange), { sw: 2.1 });
      });
      d.part("body", 50, 89, (g) => {
        const body = smooth([[50, 50], [64.5, 55.5], [68.5, 70], [64.5, 83.2], [50, 88.4], [35.5, 83.2], [31.5, 70], [35.5, 55.5]], 0.2);
        g.path(body, g.fill(PENG), { sw: 3 });
        g.clip(body, (c) => c.path(ellPath(50.5, 74, 12.5, 14.8), c.fill(P.white), { stroke: null }));
        g.path(body, "none", { sw: 3 });
      });
      d.part("armL", 37.5, 58, penguinFlipper);
      d.part("armR", 62.5, 58, (g) => g.mirror(50, penguinFlipper));
      d.part("head", 50, 55, (h) => {
        // A little tuft of head feathers, tucked behind the head.
        h.part("extra", 50, 20, (c) => {
          c.path(leaf(49, 21.5, 9.5, -108, 0.46), c.fill(PENG), { sw: 2.2 });
          c.path(leaf(52, 21, 7.5, -64, 0.46), c.fill(PENG), { sw: 2.2 });
        });
        const head = circlePath(50, 37.5, 19);
        h.path(head, h.fill(PENG), { sw: 3.2 });
        // The white face: two round patches around the eyes and a white chin.
        h.clip(head, (c) => c.path(`${ellPath(43, 40.5, 9.2, 10)} ${ellPath(57, 40.5, 9.2, 10)} ${ellPath(50, 50, 13, 8.5)}`, c.fill(P.white), { stroke: null }));
        h.path(head, "none", { sw: 3.2 });
        h.shine(41, 25, 4.4, 2.4, 0.4, -28);
        allEyes(h, 43.2, 40, 56.8, 40, 3.9);
        h.cheek(37, 48, 3.2);
        h.cheek(63, 48, 3.2);
        // Beak, closed: a little rounded triangle with a line where it shuts.
        h.part("mouth", 50, 47, (m) => {
          m.path("M44.4 44.8 Q50 41.6 55.6 44.8 Q54.2 49.8 50 50.8 Q45.8 49.8 44.4 44.8 Z", m.fill(P.orange), { sw: 2 });
          m.stroke("M46 46.7 Q50 48.1 54 46.7", { sw: 1.2, color: P.orange[2] });
          m.shine(47.6, 44.5, 1.7, 0.8, 0.75, -10);
        });
        // Beak, open: the lower beak drops and a pink tongue shows.
        h.part("open", 50, 47, (m) => {
          m.path("M45.2 44.8 Q50 46.4 54.8 44.8 Q54 53.4 50 53.8 Q46 53.4 45.2 44.8 Z", "#6b2a36", { sw: 2 });
          m.ellipse(50, 51.2, 2.8, 1.7, "#ff8fa8", { stroke: null });
          m.path("M46 50.6 Q50 53.2 54 50.6 Q53 55.4 50 55.8 Q47 55.4 46 50.6 Z", m.fill(P.orange), { sw: 2 });
          m.path("M44.4 43.6 Q50 40.4 55.6 43.6 Q54 47.4 50 48 Q46 47.4 44.4 43.6 Z", m.fill(P.orange), { sw: 2 });
          m.shine(47.6, 43.4, 1.7, 0.8, 0.75, -10);
        });
      });
    },
  },
  {
    id: "pet-seal",
    voice: "bark",
    tricks: ["flap", "flip", "bounce"],
    draw: (d) => {
      d.shadow(52, 92, 23, 3.4);
      // Rear flippers: the tail curls out along the deck to the right.
      d.part("tail", 62, 87.5, (t) => {
        t.path(leaf(60.5, 87.5, 21, -26, 0.38), t.fill(SEAL, "d"), { sw: 2.6 });
        t.path(leaf(60.5, 88.5, 20, 4, 0.38), t.fill(SEAL, "d"), { sw: 2.6 });
      });
      d.part("body", 50, 91, (g) => {
        const body = smooth([[50, 51], [63.5, 56], [69.5, 69], [69.5, 82], [62, 90], [48, 91.2], [35, 88], [30.5, 74], [35.5, 57]], 0.2);
        g.path(body, g.fill(SEAL), { sw: 3 });
        g.clip(body, (c) => {
          c.ellipse(49, 76.5, 12, 13.5, c.fill(P.white, "v"), { stroke: null, op: 0.9 });
          for (const [x, y, r] of [[63.5, 63.5, 1.5], [66, 69, 1.1], [34.5, 68, 1.2]] as const) c.circle(x, y, r, SEAL[2], { stroke: null, op: 0.5 });
        });
        g.path(body, "none", { sw: 3 });
      });
      d.part("armL", 38, 60, sealFlipper);
      d.part("armR", 62, 60, (g) => g.mirror(50, sealFlipper));
      d.part("head", 50, 56, (h) => {
        h.ellipse(50, 38.2, 21.4, 18.8, h.fill(SEAL), { sw: 3.2 });
        h.shine(41, 26, 4.6, 2.5, 0.55, -22);
        for (const [x, y, r] of [[59.5, 25, 1.5], [63.5, 28.5, 1.1], [56, 23, 0.9]] as const) h.circle(x, y, r, SEAL[2], { stroke: null, op: 0.45 });
        shinyEyes(h, 41.4, 36, 58.6, 36, 4.5);
        h.cheek(36.5, 46, 3.4);
        h.cheek(63.5, 46, 3.4);
        // Whiskers, from the muzzle pads.
        h.part("extra", 50, 47, (w) => {
          for (const s of [-1, 1]) {
            w.stroke(`M${50 + s * 8} 46 Q${50 + s * 13} 44.4 ${50 + s * 17.5} 44.8`, { sw: 1.3 });
            w.stroke(`M${50 + s * 8} 48.2 Q${50 + s * 13} 48.4 ${50 + s * 17.2} 50`, { sw: 1.3 });
          }
        });
        h.ellipse(46, 47.4, 4.4, 3.5, h.fill(P.white), { sw: 2 });
        h.ellipse(54, 47.4, 4.4, 3.5, h.fill(P.white), { sw: 2 });
        for (const [x, y] of [[44.4, 47], [46.6, 48.6], [55.6, 47], [53.4, 48.6]] as const) h.circle(x, y, 0.45, OL, { stroke: null });
        h.path("M46.8 42.6 Q50 41.4 53.2 42.6 Q52.4 45.4 50 46 Q47.6 45.4 46.8 42.6 Z", h.fill(P.ink), { sw: 1.8 });
        h.shine(48.8, 42.8, 1.1, 0.6, 0.8, -10);
        mouthSmile(h, 50, 51.4, 5, 2);
        mouthOpen(h, 50, 51.4, 7, 2);
      });
    },
  },
  {
    id: "pet-turtle",
    voice: "blub",
    tricks: ["hide", "spin"],
    draw: (d) => {
      d.shadow(50, 92, 27, 3.4);
      // A stubby tail peeking out behind the shell.
      d.part("tail", 28, 87, (t) => {
        t.path("M29 83 Q19.4 84 15 88.4 Q16.4 91.8 21.6 91.2 Q26.6 90.8 29.4 89.6 Z", t.fill(TSKIN, "d"), { sw: 2.4 });
      });
      d.part("body", 50, 90, (g) => {
        const dome = smooth([[50, 50.5], [69.5, 54.5], [81, 67], [83, 83.5], [50, 89.5], [17, 83.5], [19, 67], [30.5, 54.5]], 0.2);
        g.path(dome, g.fill(SHELL), { sw: 3.2 });
        g.clip(dome, (c) => {
          for (const [x, y, rx, ry] of PLATES) c.path(hexPath(x, y, rx, ry), c.fill(PLATE), { sw: 1.8, stroke: SHELL[2] });
          c.path("M8 80 Q50 89 92 80 L92 100 L8 100 Z", c.fill(P.lime, "v"), { sw: 2, stroke: SHELL[2] });
        });
        g.path(dome, "none", { sw: 3.2 });
        // The opening the head comes out of (and ducks back into).
        g.ellipse(50, 61, 10.6, 3.7, "#1b4630", { sw: 2.2 });
        g.shine(29, 63, 5, 2.4, 0.5, -38);
      });
      d.part("armL", 20, 70.5, turtleFlipper);
      d.part("armR", 80, 70.5, (g) => g.mirror(50, turtleFlipper));
      d.part("head", 50, 61, (h) => {
        // A short, thick neck out of the opening, with a soft crease.
        h.path("M41.6 62 Q42.6 55.5 45 50 L55 50 Q57.4 55.5 58.4 62 Q50 64 41.6 62 Z", h.fill(TSKIN, "h"), { sw: 2.6 });
        h.stroke("M45.2 57 Q50 58.6 54.8 57", { sw: 1.2, color: TSKIN[2] });
        h.ellipse(50, 37.2, 18.6, 16.6, h.fill(TSKIN), { sw: 3.2 });
        // Little scale patches on top of the head.
        for (const [x, y, s] of [[56.5, 25.3, 2.3], [61.8, 29.3, 1.7], [51.2, 23.5, 1.6]] as const) h.path(hexPath(x, y, s, s * 0.88), TSKIN[2], { stroke: null, op: 0.4 });
        h.shine(42, 26.7, 4.4, 2.3, 0.6, -25);
        allEyes(h, 43, 37.2, 57, 37.2, 3.9);
        h.cheek(37.5, 44.7, 3.2);
        h.cheek(62.5, 44.7, 3.2);
        mouthSmile(h, 50, 44.4, 8);
        mouthOpen(h, 50, 44.9, 7.6);
      });
    },
  },
  {
    id: "pet-crab",
    voice: "click",
    tricks: ["dance", "wave", "shake"],
    draw: (d) => {
      d.shadow(50, 92, 27, 3.6);
      // Three little legs on each side, out from under the shell.
      d.part("feet", 50, 84, (g) => {
        const legs: [number, number, number, number, number, number][] = [
          [35, 83.5, 26, 82.5, 23.5, 91], [32, 81, 22, 80, 18.5, 89.5], [29.5, 78, 18.5, 77.5, 14, 87.5],
        ];
        for (const [bx, by, kx, ky, tx, ty] of legs) {
          g.tube(`M${bx} ${by} Q${kx} ${ky} ${tx} ${ty}`, CRAB[1], 3.4, 2.2);
          g.tube(`M${100 - bx} ${by} Q${100 - kx} ${ky} ${100 - tx} ${ty}`, CRAB[1], 3.4, 2.2);
        }
      });
      d.part("body", 50, 87, (g) => {
        const shell = smooth([[50, 45.5], [66.5, 49], [73.5, 60], [72, 75.5], [62, 85], [50, 86.5], [38, 85], [28, 75.5], [26.5, 60], [33.5, 49]], 0.2);
        g.path(shell, g.fill(CRAB), { sw: 3.2 });
        g.shine(36, 52.5, 4.6, 2.4, 0.5, -30);
        for (const [x, y, r] of [[59, 50.5, 1.5], [63.5, 54, 1.1], [55.5, 54, 0.9]] as const) g.circle(x, y, r, CRAB[0], { stroke: null, op: 0.8 });
      });
      d.part("armL", 29, 63, crabClaw);
      d.part("armR", 71, 63, (g) => g.mirror(50, crabClaw));
      d.part("head", 50, 64, (h) => {
        // Short eye stalks with big googly eyes on top.
        h.tube("M44 50 Q43.4 45 43 40", CRAB[1], 3.6, 2.2);
        h.tube("M56 50 Q56.6 45 57 40", CRAB[1], 3.6, 2.2);
        h.circle(42.5, 35.5, 6.2, h.fill(P.white), { sw: 2.6 });
        h.circle(57.5, 35.5, 6.2, h.fill(P.white), { sw: 2.6 });
        allEyes(h, 42.8, 36, 57.2, 36, 3.6);
        h.cheek(36.5, 63.5, 3.6);
        h.cheek(63.5, 63.5, 3.6);
        mouthSmile(h, 50, 61.5, 14, 2.6);
        mouthOpen(h, 50, 62, 12.5);
      });
    },
  },
];
