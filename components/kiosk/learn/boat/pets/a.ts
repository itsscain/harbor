// Pets, set A — the parrot (the rig example), cat, dog and bunny.
import { OL, P, leaf, lumpy, smooth, type Pen, type Ramp } from "../../art/pen";
import { allEyes, eyesHappy, eyesSleep, toes, type PetRig } from "./rig";

const FOOT: Ramp = ["#f6dcdc", "#d0a9ae", "#946b72"];

/** A folded wing on the picture's left (bands of red, gold and blue), its shoulder at (38, 58). */
function macawWing(d: Pen) {
  const w = smooth([[39.5, 56], [32, 61], [29.5, 72], [32, 83], [36.5, 88], [41, 81], [43.5, 69], [44, 60]], 0.2);
  d.path(w, d.fill(P.red));
  d.clip(w, (c) => {
    c.rect(20, 69, 30, 7, 0, d.fill(P.gold, "v"), { stroke: null });
    c.rect(20, 76, 30, 16, 0, d.fill(P.blue, "v"), { stroke: null });
    c.stroke("M31 80.5 Q35.5 78.6 41.5 81.2", { sw: 1.6 });
    c.stroke("M32.5 85 Q36 83.4 40.5 85.6", { sw: 1.6 });
  });
  d.path(w, "none", { sw: 2.8 });
  d.shine(35.5, 63.5, 2.4, 4, 0.45, 10);
}

// ── Shared bits for the cat, dog and bunny ──────────────────────────────────────────────────
type Pt = [number, number];
const GINGER: Ramp = ["#ffd9a8", "#ffa651", "#df6f1c"];
const TABBY = "#d2621b";
const PINK: Ramp = ["#ffdbe4", "#ffa3b8", "#e0678a"];
const IRIS: Ramp = ["#1e7a44", "#46c35e", "#b9f27c"];
const GOLDEN: Ramp = ["#ffe6b3", "#f6bd68", "#cc8536"];
const FLOP: Ramp = ["#e9b06e", "#c27b36", "#86501f"];
const SNOW: Ramp = ["#ffffff", "#fbf8f2", "#e2d6c3"];
const FLUFF: Ramp = ["#fbf8ff", "#e4d9f8", "#a892d8"];
const MOUTH = "#7a2b3a";
const TONGUE = "#ff8fa8";

/** An ellipse as a path (for clip shapes). */
const oval = (x: number, y: number, rx: number, ry: number) =>
  `M${x - rx} ${y} a${rx} ${ry} 0 1 0 ${rx * 2} 0 a${rx} ${ry} 0 1 0 ${-rx * 2} 0 Z`;

/** The unit normal of a centerline at point i. */
function normalAt(c: Pt[], i: number): Pt {
  const a = c[Math.max(0, i - 1)];
  const b = c[Math.min(c.length - 1, i + 1)];
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
}
/** A tail: a smooth tube along centerline `c`, w0 wide at the root tapering to w1 at a round tip. */
function tailPath(c: Pt[], w0: number, w1: number) {
  const n = c.length;
  const L: Pt[] = [];
  const R: Pt[] = [];
  c.forEach((p, i) => {
    const [nx, ny] = normalAt(c, i);
    const w = (w0 + (w1 - w0) * (i / (n - 1))) / 2;
    L.push([p[0] + nx * w, p[1] + ny * w]);
    R.push([p[0] - nx * w, p[1] - ny * w]);
  });
  const [ex, ey] = c[n - 1];
  const [px, py] = c[n - 2];
  const l = Math.hypot(ex - px, ey - py) || 1;
  const tip: Pt = [ex + ((ex - px) / l) * w1 * 0.55, ey + ((ey - py) / l) * w1 * 0.55];
  return smooth([...L, tip, ...R.reverse()], 0.18);
}
/** A band across a tail at centerline point i (for stripes; clip it to the tail). */
function bandAt(c: Pt[], i: number, w: number) {
  const [nx, ny] = normalAt(c, i);
  const [x, y] = c[i];
  return `M${x + nx * w} ${y + ny * w} L${x - nx * w} ${y - ny * w}`;
}

/** A short plush arm from the shoulder (sx, sy) down to a round paw at (px, py), `w` thick —
 *  its top tucks under the head, and it turns around the shoulder. Optional tabby stripes and a
 *  paw of another color. */
function stubArm(g: Pen, sx: number, sy: number, px: number, py: number, w: number, ramp: Ramp, stripe?: string, paw?: string) {
  const L = Math.hypot(px - sx, py - sy);
  const deg = (Math.atan2(sx - px, py - sy) * 180) / Math.PI;
  const end = L + w * 0.46;
  const arm = smooth([[0, -w * 0.5], [w * 0.47, -w * 0.1], [w * 0.47, L * 0.5], [w * 0.53, L * 0.9], [0, end], [-w * 0.53, L * 0.9], [-w * 0.47, L * 0.5], [-w * 0.47, -w * 0.1]], 0.2);
  g.g(`translate(${sx} ${sy}) rotate(${deg})`, (a) => {
    a.path(arm, a.fill(ramp), { stroke: null });
    if (stripe || paw) a.clip(arm, (c) => {
      if (stripe) for (const k of [0.3, 0.56]) c.stroke(`M${-w} ${L * k - 1} Q0 ${L * k + 0.8} ${w} ${L * k - 1}`, { sw: 2.3, color: stripe });
      if (paw) c.ellipse(0, end - 0.4, w * 0.8, w * 0.52, paw, { stroke: null });
    });
    a.path(arm, "none", { sw: 2.6 });
    for (const k of [-1, 1]) a.line(k * w * 0.18, end - 2.5, k * w * 0.18, end - 0.5, { sw: 1.4 });
  });
}

/** Big cat eyes: dark, with a green glow along the bottom and two sparkles. */
function catEyes(d: Pen, lx: number, rx: number, y: number, r: number) {
  d.part("eyes", (lx + rx) / 2, y, (g) => {
    for (const x of [lx, rx]) {
      const o = oval(x, y, r * 0.84, r);
      g.path(o, OL, { stroke: null });
      g.clip(o, (c) => c.ellipse(x, y + r * 0.72, r * 0.95, r * 0.66, c.fill(IRIS, "v"), { stroke: null }));
      g.circle(x - r * 0.28, y - r * 0.36, r * 0.4, "#fff", { stroke: null });
      g.circle(x + r * 0.34, y + r * 0.3, r * 0.15, "#fff", { stroke: null });
    }
  });
  eyesHappy(d, lx, y, rx, y, r);
  eyesSleep(d, lx, y, rx, y, r);
}

const CAT_HEAD = smooth([[50, 19.8], [61.6, 21.6], [69, 29.6], [71, 40.2], [67.8, 50.2], [59, 55.4], [50, 56.2], [41, 55.4], [32.2, 50.2], [29, 40.2], [31, 29.6], [38.4, 21.6]], 0.2);
/** A sitting plush body (cat, dog): a soft pear, round at the bottom so the paws peek out. */
const SIT = smooth([[50, 51], [59.6, 53.4], [65.2, 61], [67.6, 72], [65.6, 82.2], [59.8, 86.8], [50, 88], [40.2, 86.8], [34.4, 82.2], [32.4, 72], [34.8, 61], [40.4, 53.4]], 0.2);
const CAT_TAIL: Pt[] = [[41, 87], [33, 88.6], [26, 85.5], [22, 78], [21.6, 69.5], [24, 62], [28.4, 57.4], [32.4, 56.6]];

/** The cat's left ear (pink inside), its base hidden in the head. */
function catEar(g: Pen) {
  g.path("M29.4 37 Q28.4 22 31 13.4 Q32.2 10 35.4 12 Q43 17 49 24.6 Z", g.fill(GINGER), { sw: 2.8 });
  g.path("M33 30 Q32.4 21.4 34.2 16.4 Q35 14.4 36.8 15.8 Q41.4 19.6 44.6 24 Z", g.fill(PINK, "v"), { stroke: null });
}

const DOG_HEAD = smooth([[50, 19.6], [62, 21.4], [69.6, 30], [70.8, 40.6], [67.4, 50.4], [59, 55.8], [50, 56.6], [41, 55.8], [32.6, 50.4], [29.2, 40.6], [30.4, 30], [38, 21.4]], 0.2);
const DOG_TAIL: Pt[] = [[41, 84.6], [34, 84], [28.6, 80.2], [25.4, 74.4], [24.6, 68.4]];

/** The pup's left ear: a soft flap hanging beside the head (its top tucked behind it). */
function dogEar(g: Pen) {
  const e = smooth([[36, 21.5], [27.6, 22.6], [21.2, 30], [18.8, 40.5], [20, 49.8], [24.8, 54.2], [29.8, 52], [32.4, 44], [34.6, 33]], 0.2);
  g.path(e, g.fill(FLOP), { sw: 2.8 });
  g.shine(23.4, 33, 1.4, 4, 0.35, 12);
}

const BUNNY_HEAD = smooth([[50, 28], [60.6, 29.8], [67, 36.8], [68.8, 46], [65.8, 54.6], [58.4, 59.4], [50, 60.2], [41.6, 59.4], [34.2, 54.6], [31.2, 46], [33, 36.8], [39.4, 29.8]], 0.2);
const BUNNY_BODY = smooth([[50, 55], [59.6, 57.4], [65.8, 64.6], [68.4, 75], [66.6, 84.4], [60, 89.4], [50, 90.6], [40, 89.4], [33.4, 84.4], [31.6, 75], [34.2, 64.6], [40.4, 57.4]], 0.2);

/** A tall bunny ear centered at (x, y), turned `rot`°, pink inside. */
function bunnyEar(g: Pen, x: number, y: number, rot: number) {
  const tf = `rotate(${rot} ${x} ${y})`;
  g.ellipse(x, y, 5.8, 12, g.fill(FLUFF), { sw: 2.8, tf });
  g.ellipse(x, y - 0.6, 2.9, 8.5, g.fill(PINK, "v"), { stroke: null, tf });
}

export const PETS_A: PetRig[] = [
  {
    id: "pet-parrot",
    voice: "squawk",
    tricks: ["flap", "spin", "dance"],
    draw: (d) => {
      d.shadow(50, 92, 21, 3.4);
      // Tail feathers, behind everything, resting toward the deck.
      d.part("tail", 43, 79, (t) => {
        t.path(leaf(44, 78, 25, 146, 0.26), t.fill(P.red, "d"), { sw: 2.6 });
        t.path(leaf(45, 80, 20, 128, 0.26), t.fill(P.blue, "d"), { sw: 2.6 });
      });
      d.part("feet", 50, 90, (g) => {
        for (const x of [43.5, 56.5]) {
          g.ellipse(x, 89.4, 4.8, 2.8, g.fill(FOOT), { sw: 2.2 });
          toes(g, x, 90.4, 6.2);
        }
      });
      d.part("body", 50, 90, (g) => {
        g.path(smooth([[50, 52], [63.5, 58], [66.5, 71], [62, 85], [50, 89.5], [38, 85], [33.5, 71], [36.5, 58]], 0.2), g.fill(P.red), { sw: 3 });
        g.ellipse(51, 75.5, 10, 11, g.fill(P.coral, "v"), { stroke: null, op: 0.75 });
      });
      d.part("armL", 39, 58, macawWing);
      d.part("armR", 61, 58, (g) => g.mirror(50, macawWing));
      d.part("head", 50, 54, (h) => {
        // The crest, tucked behind the head so its feathers grow out of it.
        h.part("extra", 51, 20, (c) => {
          c.path(leaf(47, 21.5, 11, -120, 0.42), c.fill(P.orange), { sw: 2.4 });
          c.path(leaf(51.5, 20, 13, -90, 0.42), c.fill(P.red), { sw: 2.4 });
          c.path(leaf(56, 21.5, 11, -60, 0.42), c.fill(P.orange), { sw: 2.4 });
        });
        h.circle(51, 37, 18.5, h.fill(P.red), { sw: 3.2 });
        h.shine(43, 26, 4.4, 2.6, 0.5, -25);
        // The macaw's white face patches, with fine feather lines.
        for (const [x, y] of [[43.8, 36.5], [58.2, 36]] as const) {
          h.ellipse(x, y, 7, 7.8, "#fbfbff", { stroke: null });
          h.stroke(`M${x - 4.6} ${y + 3.8} Q${x} ${y + 5.6} ${x + 4.6} ${y + 3.8}`, { sw: 0.9, color: "#e5a3a8" });
        }
        allEyes(h, 43.8, 35.2, 58.2, 34.8, 3.9);
        h.cheek(37, 44.5, 3.2);
        h.cheek(65, 44, 3.2);
        // Beak, closed: dark lower beak under the ivory hooked upper beak.
        h.part("mouth", 51, 44, (m) => {
          m.ellipse(51.6, 46.8, 4.4, 3.6, m.fill(P.ink), { sw: 2.2 });
          m.path("M44.6 40.2 Q51.4 35.4 58.2 40.2 Q58.8 47 54 52.4 Q52.8 53.6 52.2 52.2 Q52.3 47.8 49 45 Q46 43.2 44.6 40.2 Z", m.fill(P.cream), { sw: 2.6 });
          m.shine(48.6, 40.2, 2.4, 1.1, 0.75, -10);
        });
        // Beak, open: the lower beak drops and a pink tongue shows.
        h.part("open", 51, 44, (m) => {
          m.path("M47 44.8 Q51.6 58 57.4 46 Z", "#6b2a36", { sw: 2.4 });
          m.ellipse(52.2, 50.2, 3, 2, "#ff8fa8", { stroke: null });
          m.path("M44.4 39.2 Q51.4 34.2 58.4 39.2 Q59 45.2 54.6 49.8 Q53.4 51 52.8 49.6 Q52.6 46 49.2 43.6 Q46 42 44.4 39.2 Z", m.fill(P.cream), { sw: 2.6 });
          m.shine(48.6, 39.2, 2.4, 1.1, 0.75, -10);
        });
      });
    },
  },
  {
    // Ship Cat: an orange tabby sitting up tall, its striped tail curled beside it.
    id: "pet-cat",
    voice: "meow",
    tricks: ["jump", "wave", "spin"],
    draw: (d) => {
      d.shadow(50, 92, 22, 3.4);
      d.part("tail", 39, 86, (t) => {
        const s = tailPath(CAT_TAIL, 8.4, 6.2);
        t.path(s, t.fill(GINGER, "h"), { stroke: null });
        t.clip(s, (c) => {
          for (const i of [2, 3, 4, 5]) c.stroke(bandAt(CAT_TAIL, i, 6), { sw: 2.4, color: TABBY });
        });
        t.path(s, "none", { sw: 2.8 });
      });
      d.part("feet", 50, 90, (g) => {
        for (const x of [41, 59]) {
          g.ellipse(x, 88.8, 6.8, 3.6, g.fill(P.cream), { sw: 2.4 });
          toes(g, x, 90.2, 7.6);
        }
      });
      d.part("body", 50, 90, (g) => {
        g.path(SIT, g.fill(GINGER), { sw: 3 });
        g.clip(SIT, (c) => {
          c.ellipse(50, 72, 9.5, 15, c.fill(P.cream, "v"), { stroke: null });
          // Tabby marks on the haunches, below the arms.
          for (const k of [-1, 1]) {
            c.stroke(`M${50 + k * 18.4} 79.4 Q${50 + k * 15.6} 79.8 ${50 + k * 13.6} 81.8`, { sw: 2.3, color: TABBY });
            c.stroke(`M${50 + k * 17.4} 84 Q${50 + k * 15} 84.2 ${50 + k * 13.4} 85.8`, { sw: 2.3, color: TABBY });
          }
        });
      });
      d.part("armL", 39.6, 60, (g) => stubArm(g, 39.6, 60, 38.8, 72.5, 9.6, GINGER, TABBY, P.cream[1]));
      d.part("armR", 60.4, 60, (g) => stubArm(g, 60.4, 60, 61.2, 72.5, 9.6, GINGER, TABBY, P.cream[1]));
      d.part("head", 50, 54, (h) => {
        h.part("earL", 38.5, 27, catEar);
        h.part("earR", 61.5, 27, (g) => g.mirror(50, catEar));
        h.path(CAT_HEAD, h.fill(GINGER), { sw: 3.2 });
        h.clip(CAT_HEAD, (c) => {
          // Tabby marks: three on the brow, two on each cheek.
          c.stroke("M45.6 20 L47 26.4", { sw: 2.4, color: TABBY });
          c.stroke("M50 19 L50 27.4", { sw: 2.4, color: TABBY });
          c.stroke("M54.4 20 L53 26.4", { sw: 2.4, color: TABBY });
          for (const [a, b] of [[28.4, 34.6], [71.6, 65.4]] as const) {
            c.stroke(`M${a} 36.2 Q${(a + b) / 2} 36.6 ${b} 38`, { sw: 2.2, color: TABBY });
            c.stroke(`M${a} 40.6 Q${(a + b) / 2} 40.8 ${b - (b - a) * 0.15} 41.8`, { sw: 2.2, color: TABBY });
          }
          // A cream muzzle.
          c.ellipse(47.2, 47.4, 3.8, 2.9, P.cream[1], { stroke: null });
          c.ellipse(52.8, 47.4, 3.8, 2.9, P.cream[1], { stroke: null });
        });
        h.shine(41, 26, 4.4, 2.4, 0.5, -25);
        catEyes(h, 42.6, 57.4, 38.6, 4.2);
        h.cheek(35.6, 46.4, 3.2);
        h.cheek(64.4, 46.4, 3.2);
        h.part("mouth", 50, 47, (m) => {
          m.stroke("M50 46 L50 47.4 M46.2 47 Q48.1 49.8 50 47.4 Q51.9 49.8 53.8 47", { sw: 2 });
        });
        h.part("open", 50, 48, (m) => {
          const o = "M46.2 46.8 Q50 45.8 53.8 46.8 Q53.6 52.8 50 53.6 Q46.4 52.8 46.2 46.8 Z";
          m.path(o, MOUTH, { sw: 2 });
          m.clip(o, (c) => c.ellipse(50, 53.4, 3, 2.4, TONGUE, { stroke: null }));
          m.path(o, "none", { sw: 2 });
        });
        h.path("M47.4 43.6 Q50 42.6 52.6 43.6 Q52.4 45.4 50 46.4 Q47.6 45.4 47.4 43.6 Z", h.fill(PINK), { sw: 1.6 });
        h.part("extra", 50, 47, (w) => {
          for (const k of [-1, 1]) {
            w.stroke(`M${50 + k * 11.5} 46.2 Q${50 + k * 17} 44.6 ${50 + k * 24.4} 44.4`, { sw: 1.5 });
            w.stroke(`M${50 + k * 11.5} 48.6 Q${50 + k * 16.6} 48.8 ${50 + k * 23.4} 50.8`, { sw: 1.5 });
          }
        });
      });
    },
  },
  {
    // Sea Pup: a golden puppy in a red sailor bandana, tail always wagging.
    id: "pet-dog",
    voice: "woof",
    tricks: ["spin", "jump", "wave"],
    draw: (d) => {
      d.shadow(50, 92, 22, 3.4);
      d.part("tail", 39, 84, (t) => {
        const s = tailPath(DOG_TAIL, 9.4, 6.4);
        t.path(s, t.fill(GOLDEN, "h"), { stroke: null });
        t.clip(s, (c) => c.ellipse(24.4, 66.2, 5.4, 4.4, SNOW[1], { stroke: null }));
        t.path(s, "none", { sw: 2.8 });
      });
      d.part("feet", 50, 90, (g) => {
        for (const x of [41, 59]) {
          g.ellipse(x, 88.8, 6.8, 3.6, g.fill(GOLDEN), { sw: 2.4 });
          toes(g, x, 90.2, 7.6);
        }
      });
      d.part("body", 50, 90, (g) => {
        g.path(SIT, g.fill(GOLDEN), { sw: 3 });
        g.clip(SIT, (c) => c.ellipse(50, 72, 10.5, 16, c.fill(SNOW, "v"), { stroke: null }));
        // The sailor bandana, knotted under the chin.
        const scarf = "M34 53 Q50 59 66 53 L64.4 58.6 Q57.6 62.4 52.6 69.6 Q50 72.6 47.4 69.6 Q42.4 62.4 35.6 58.6 Z";
        g.path(scarf, g.fill(P.red, "v"), { sw: 2.4 });
        g.clip(scarf, (c) => {
          for (const [x, y] of [[42, 60], [50, 62], [58, 60], [46.4, 65.6], [53.6, 65.6], [50, 69.2]] as const) c.circle(x, y, 1.2, "#fff", { stroke: null });
        });
      });
      d.part("armL", 39.4, 62.4, (g) => stubArm(g, 39.4, 62.4, 38.6, 74.4, 9.6, GOLDEN));
      d.part("armR", 60.6, 62.4, (g) => stubArm(g, 60.6, 62.4, 61.4, 74.4, 9.6, GOLDEN));
      d.part("head", 50, 54, (h) => {
        h.part("earL", 31, 24, dogEar);
        h.part("earR", 69, 24, (g) => g.mirror(50, dogEar));
        h.path(DOG_HEAD, h.fill(GOLDEN), { sw: 3.2 });
        h.clip(DOG_HEAD, (c) => c.ellipse(50, 48.4, 10.4, 7.8, c.fill(SNOW, "v"), { stroke: null }));
        h.shine(41, 26, 4.4, 2.4, 0.5, -25);
        allEyes(h, 41.8, 37, 58.2, 37, 4.2);
        h.cheek(34.8, 45.8, 3.2);
        h.cheek(65.2, 45.8, 3.2);
        h.part("mouth", 50, 48, (m) => {
          m.stroke("M50 47.2 L50 48.8 M45.2 48.4 Q47.6 51.4 50 48.8 Q52.4 51.4 54.8 48.4", { sw: 2.1 });
        });
        h.part("open", 50, 49, (m) => {
          const o = "M44.8 48 Q50 47.2 55.2 48 Q54.8 55 50 55.4 Q45.2 55 44.8 48 Z";
          m.path(o, MOUTH, { sw: 2.1 });
          m.clip(o, (c) => c.ellipse(50, 54.6, 3.8, 3.2, TONGUE, { stroke: null }));
          m.path(o, "none", { sw: 2.1 });
        });
        h.path("M45.8 43 Q50 41.2 54.2 43 Q54.6 45.2 52 46.6 Q50 47.4 48 46.6 Q45.4 45.2 45.8 43 Z", h.fill(P.black), { sw: 2 });
        h.shine(48, 43.1, 1.5, 0.75, 0.8, -10);
      });
    },
  },
  {
    // Bunny: soft white and lilac, tall pink-lined ears and a round puff of a tail.
    id: "pet-bunny",
    voice: "squeak",
    tricks: ["jump", "flip", "bounce"],
    draw: (d) => {
      d.shadow(50, 92, 22, 3.4);
      d.part("tail", 34, 83, (t) => {
        const puff = lumpy(29.4, 82.4, 6.4, 6, 9, 0.08, 3);
        t.path(puff, t.fill(P.white), { sw: 2.6 });
        t.shine(27.4, 79.8, 1.8, 1.1, 0.7, -25);
      });
      d.part("feet", 50, 90, (g) => {
        for (const x of [40.2, 59.8]) {
          g.ellipse(x, 89.6, 7.4, 3.8, g.fill(P.white), { sw: 2.4 });
          toes(g, x, 90.6, 7);
        }
      });
      d.part("body", 50, 91, (g) => {
        g.path(BUNNY_BODY, g.fill(FLUFF), { sw: 3 });
        g.clip(BUNNY_BODY, (c) => c.ellipse(50, 78, 11, 13.5, c.fill(P.white, "v"), { stroke: null }));
      });
      d.part("armL", 40.8, 65, (g) => stubArm(g, 40.8, 65, 40.2, 75.5, 8.4, FLUFF, undefined, "#ffffff"));
      d.part("armR", 59.2, 65, (g) => stubArm(g, 59.2, 65, 59.8, 75.5, 8.4, FLUFF, undefined, "#ffffff"));
      d.part("head", 50, 58, (h) => {
        h.part("earL", 43, 31, (g) => bunnyEar(g, 41.4, 22.4, -11));
        h.part("earR", 57, 31, (g) => bunnyEar(g, 58.6, 22.4, 11));
        h.path(BUNNY_HEAD, h.fill(FLUFF), { sw: 3.2 });
        // A white muzzle.
        h.clip(BUNNY_HEAD, (c) => {
          c.ellipse(47.4, 52.4, 4.4, 3.6, "#ffffff", { stroke: null });
          c.ellipse(52.6, 52.4, 4.4, 3.6, "#ffffff", { stroke: null });
        });
        h.shine(41.4, 33.6, 4.2, 2.3, 0.6, -25);
        allEyes(h, 42.8, 44.6, 57.2, 44.6, 4.2);
        h.ellipse(37, 51.6, 3.8, 2.4, "#ff8aa8", { stroke: null, op: 0.55 });
        h.ellipse(63, 51.6, 3.8, 2.4, "#ff8aa8", { stroke: null, op: 0.55 });
        h.part("mouth", 50, 53, (m) => {
          m.path("M48.1 51.8 H51.9 V54.2 Q51.9 55 51.1 55 H48.9 Q48.1 55 48.1 54.2 Z", "#fff", { sw: 1.3 });
          m.line(50, 52, 50, 54.9, { sw: 1.1 });
          m.stroke("M50 51.4 L50 52 M46.4 51.4 Q48.2 53.4 50 51.9 Q51.8 53.4 53.6 51.4", { sw: 1.8 });
        });
        h.part("open", 50, 54, (m) => {
          const o = "M46 51.6 Q50 50.8 54 51.6 Q53.6 57.8 50 58.4 Q46.4 57.8 46 51.6 Z";
          m.path(o, MOUTH, { sw: 1.9 });
          m.clip(o, (c) => {
            c.ellipse(50, 58, 2.8, 2.2, TONGUE, { stroke: null });
            c.path("M48.1 49.8 H51.9 V53.8 Q51.9 54.6 51.1 54.6 H48.9 Q48.1 54.6 48.1 53.8 Z", "#fff", { sw: 1.2 });
            c.line(50, 51.2, 50, 54.5, { sw: 1 });
          });
          m.path(o, "none", { sw: 1.9 });
        });
        h.path("M48 49.2 Q50 48.4 52 49.2 Q51.7 50.8 50 51.5 Q48.3 50.8 48 49.2 Z", h.fill(PINK), { sw: 1.5 });
      });
    },
  },
];
