// Pets, set C — frog, octopus, owl and fox.
import { OL, P, smooth, type Pen, type Ramp } from "../../art/pen";
import { allEyes, bothMouths, eyesHappy, eyesSleep, type PetRig } from "./rig";

type Pt = [number, number];
const q = (v: number) => Math.round(v * 100) / 100;

/** An x drawn for the picture's left side (s = -1), or mirrored onto the right (s = 1). Drawing
 *  each side (instead of mirroring a group) keeps the light coming from the top-left on both. */
const sx = (s: number, x: number) => (s < 0 ? x : 100 - x);
const side = (s: number, pts: Pt[]): Pt[] => pts.map(([x, y]) => [sx(s, x), y]);
/** A closed path of quadratic curves: M p0 Q p1 p2 Q p3 p4 … Z. */
const quads = (pts: Pt[]) => {
  let s = `M${q(pts[0][0])} ${q(pts[0][1])}`;
  for (let i = 1; i + 1 < pts.length; i += 2) s += ` Q${q(pts[i][0])} ${q(pts[i][1])} ${q(pts[i + 1][0])} ${q(pts[i + 1][1])}`;
  return `${s} Z`;
};

/** Points along a smooth line through `pts` (Catmull-Rom). */
function along(pts: Pt[], per = 10): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per;
      const f = (j: 0 | 1) => 0.5 * (2 * p1[j] + (p2[j] - p0[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t * t + (3 * p1[j] - p0[j] - 3 * p2[j] + p3[j]) * t * t * t);
      out.push([f(0), f(1)]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** A limb, tentacle or tail around a smooth centerline: `w0` wide at the start, `w1` at the end,
 *  with round ends (so a limb turned around its first point stays attached). */
function taper(pts: Pt[], w0: number, w1: number): string {
  const s = along(pts);
  const n = s.length;
  const a: Pt[] = [];
  const b: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const p = s[Math.max(0, i - 1)];
    const nx = s[Math.min(n - 1, i + 1)];
    const len = Math.hypot(nx[0] - p[0], nx[1] - p[1]) || 1;
    const tx = (nx[0] - p[0]) / len;
    const ty = (nx[1] - p[1]) / len;
    const w = (w0 + ((w1 - w0) * i) / (n - 1)) / 2;
    a.push([s[i][0] - ty * w, s[i][1] + tx * w]);
    b.push([s[i][0] + ty * w, s[i][1] - tx * w]);
  }
  const pt = (p: Pt) => `${q(p[0])} ${q(p[1])}`;
  const back = b.slice(0, -1).reverse();
  return `M${pt(a[0])} ${a.slice(1).map((p) => `L${pt(p)}`).join(" ")} A${q(w1 / 2)} ${q(w1 / 2)} 0 0 0 ${pt(b[n - 1])} ${back.map((p) => `L${pt(p)}`).join(" ")} A${q(w0 / 2)} ${q(w0 / 2)} 0 0 0 ${pt(a[0])} Z`;
}

/** Rosy cheeks that stay pink on green or purple skin (the pen's cheek turns grey there). */
const blush = (d: Pen, x: number, y: number, r: number, a = 0.8) => d.ellipse(x, y, r, r * 0.62, "#ff86b0", { stroke: null, op: a });

// ── Frog ──────────────────────────────────────────────────────────────────────────────────────
const FROG = P.green;
const FROG_BELLY: Ramp = ["#fdffe6", "#ecf8b8", "#c8e07c"];

/** A folded back leg: webbed toes splayed on the deck, tucked under a round thigh. */
function frogLeg(d: Pen, s: number) {
  const toes = (
    [
      [[32, 87], [25, 86.6], [18.6, 85.6]],
      [[32, 88], [25.6, 89.6], [19.8, 91.2]],
      [[33, 89], [28.6, 91.6], [25.6, 93.2]],
    ] as Pt[][]
  ).map((t) => side(s, t));
  const line = (t: Pt[]) => `M${q(t[0][0])} ${q(t[0][1])} Q${q(t[1][0])} ${q(t[1][1])} ${q(t[2][0])} ${q(t[2][1])}`;
  // One outline round all three toes (outlines first, then the green on top).
  for (const t of toes) {
    d.stroke(line(t), { sw: 3.4 + 4.8, color: OL });
    d.circle(t[2][0], t[2][1], 2.3 + 2.4, OL, { stroke: null });
  }
  for (const t of toes) {
    d.stroke(line(t), { sw: 3.4, color: FROG[1] });
    d.circle(t[2][0], t[2][1], 2.3, FROG[1], { stroke: null });
  }
  const cx = sx(s, 33.5);
  d.ellipse(cx, 79.5, 11, 9.2, d.fill(FROG), { sw: 3, tf: `rotate(${-30 * s} ${cx} 79.5)` });
}

/** A front leg, splayed out a little, with three round toe pads on the deck. */
function frogArm(d: Pen, s: number) {
  for (const [x, y] of side(s, [[31.4, 87], [34.2, 89], [37.4, 88.4]])) d.circle(x, y, 2.4, FROG[1], { sw: 2.2 });
  d.path(taper(side(s, [[40.5, 64], [37.6, 74.5], [35, 84.5]]), 7.6, 6.2), d.fill(FROG), { sw: 2.6 });
}

// ── Octopus ───────────────────────────────────────────────────────────────────────────────────
const OCTO = P.purple;
/** The tentacles further back, a shade deeper. */
const OCTO_BACK: Ramp = ["#d6a2ee", "#a64fcf", "#6c2a92"];
const CUP = "#ffd9f0";

/** Suction cups: little pale dots along a tentacle. */
function cups(d: Pen, pts: Pt[], r = 1.3) {
  for (const [x, y] of pts) d.circle(x, y, r, CUP, { stroke: OCTO[2], sw: 0.9 });
}

/** A front tentacle: hangs from under the dome, its tip curling out like a little hand. It hangs
 *  a touch inward so that, raised, it swings out beside the dome instead of behind it. */
function octoArm(d: Pen, s: number) {
  d.path(taper(side(s, [[34.5, 55.5], [36, 62.5], [37.2, 69.5], [36.6, 75], [33.2, 77.2], [30.8, 74.4]]), 9.6, 3.4), d.fill(OCTO), { sw: 2.8 });
  cups(d, side(s, [[37.4, 75.6], [34, 78.6]]));
}

// ── Owl ───────────────────────────────────────────────────────────────────────────────────────
const OWL = P.wood;
const OWL_DARK = P.brown;
const OWL_FACE = "#fff4e2";

/** A short round wing with two feather lines near its tip. */
function owlWing(d: Pen, s: number) {
  const w = smooth(side(s, [[37, 56], [31, 60.5], [27.6, 69], [28, 77.5], [31.5, 84.5], [36, 80], [39, 71], [39.6, 61]]), 0.2);
  d.path(w, d.fill(OWL_DARK), { sw: 2.8 });
  d.clip(w, (c) => {
    c.stroke(`M${sx(s, 28.6)} 74.4 Q${sx(s, 32.6)} 72.6 ${sx(s, 38)} 74.6`, { sw: 1.6, color: OWL_DARK[2] });
    c.stroke(`M${sx(s, 29.4)} 79.2 Q${sx(s, 33)} 77.6 ${sx(s, 37)} 79.4`, { sw: 1.6, color: OWL_DARK[2] });
  });
}

/** A feathery ear tuft, leaning out, with a feather line down it. */
function owlTuft(d: Pen, s: number) {
  d.path(quads(side(s, [[31, 31], [29.6, 21.6], [24.8, 14.6], [33.6, 17], [40.6, 25]])), d.fill(OWL_DARK), { sw: 2.6 });
  d.stroke(`M${sx(s, 33.6)} 25.6 Q${sx(s, 31)} 21.4 ${sx(s, 28)} 17.8`, { sw: 1.4, color: OWL_DARK[2] });
}

// ── Fox ───────────────────────────────────────────────────────────────────────────────────────
const FOX = P.orange;
const SOCK: Ramp = ["#7a5a58", "#4a3138", "#2a1c22"];

/** A big pointy ear: pale inside, a dark tip. */
function foxEar(d: Pen, s: number) {
  const ear = quads(side(s, [[31.5, 37], [28, 21.5], [29.6, 13], [32, 11.6], [35, 13.4], [42, 18.5], [46.5, 29]]));
  d.path(ear, d.fill(FOX), { sw: 2.8 });
  d.path(quads(side(s, [[34.6, 33], [32.2, 23.5], [33.2, 17.6], [38.6, 22], [42.6, 29]])), "#ffe2d2", { stroke: null });
  d.clip(ear, (c) => c.ellipse(sx(s, 31), 11.8, 7, 6.2, c.fill(SOCK), { stroke: null }));
  d.path(ear, "none", { sw: 2.8 });
}

/** A chubby front leg at the body's side, a dark sock on its paw. */
function foxLeg(d: Pen, s: number) {
  const leg = taper(side(s, [[39.5, 63], [38, 73.5], [37.8, 83.5]]), 10.4, 8.2);
  d.path(leg, d.fill(FOX), { sw: 2.6 });
  d.clip(leg, (c) => c.rect(sx(s, 37.8) - 8, 77.5, 16, 12, 0, c.fill(SOCK, "v"), { stroke: null }));
  d.path(leg, "none", { sw: 2.6 });
  d.ellipse(sx(s, 37.6), 86.8, 5.6, 3.6, d.fill(SOCK), { sw: 2.4 });
  d.shine(sx(s, 37.6) - 1.8, 85.6, 1.8, 0.8, 0.4, -10);
}

export const PETS_C: PetRig[] = [
  {
    id: "pet-frog",
    voice: "ribbit",
    tricks: ["jump", "flip"],
    draw: (d) => {
      d.shadow(50, 92, 25, 3.6);
      d.part("feet", 50, 88, (g) => {
        frogLeg(g, -1);
        frogLeg(g, 1);
      });
      d.part("body", 50, 90, (g) => {
        const body = smooth([[50, 48], [63, 51.5], [70, 63.5], [69.5, 78.5], [62, 88.5], [50, 90.6], [38, 88.5], [30.5, 78.5], [30, 63.5], [37, 51.5]], 0.2);
        g.path(body, g.fill(FROG), { sw: 3 });
        g.clip(body, (c) => c.ellipse(50, 77, 11.5, 13.5, c.fill(FROG_BELLY, "v"), { stroke: null }));
        g.path(body, "none", { sw: 3 });
      });
      d.part("armL", 40.5, 64, (g) => frogArm(g, -1));
      d.part("armR", 59.5, 64, (g) => frogArm(g, 1));
      d.part("head", 50, 58, (h) => {
        // A wide head with two round bumps on top for the eyes.
        const head = "M30.17 33.21 A9.4 9.4 0 1 1 47.14 34.7 Q50 36.8 52.86 34.7 A9.4 9.4 0 1 1 69.83 33.21 C73.2 36.6 76 41.5 75.5 47.5 C74.5 55.5 63.5 60.5 50 60.5 C36.5 60.5 25.5 55.5 24.5 47.5 C24 41.5 26.8 36.6 30.17 33.21 Z";
        h.path(head, h.fill(FROG), { sw: 3.2 });
        h.clip(head, (c) => {
          for (const [x, y, r] of [[29.5, 43, 1.8], [71, 42, 2.2], [68, 47.5, 1.3]] as const) c.circle(x, y, r, FROG[2], { stroke: null, op: 0.3 });
        });
        h.shine(30, 40, 3.2, 1.8, 0.4, -50);
        // White eyeballs with big dark eyes, all inside "eyes" so a blink shuts them.
        h.part("eyes", 50, 30.5, (e) => {
          for (const [x, s] of [[39, 1], [61, -1]] as const) {
            e.circle(x, 30.5, 6, e.fill(P.white), { sw: 2.2 });
            e.eye(x + s * 0.8, 31.1, 4.1);
          }
        });
        eyesHappy(h, 39, 30.5, 61, 30.5, 4.6);
        eyesSleep(h, 39, 30.5, 61, 30.5, 4.6);
        h.ellipse(46.8, 40.5, 1.2, 0.9, OL, { stroke: null });
        h.ellipse(53.2, 40.5, 1.2, 0.9, OL, { stroke: null });
        blush(h, 31, 50, 4.3, 0.85);
        blush(h, 69, 50, 4.3, 0.85);
        // A big wide smile, and a wide-open "ribbit!" mouth in the same spot.
        h.part("mouth", 50, 49, (m) => {
          m.stroke("M36 46 Q50 55.5 64 46", { sw: 2.6 });
          m.stroke("M34.5 44.8 Q36.2 45.4 36.6 47.4 M65.5 44.8 Q63.8 45.4 63.4 47.4", { sw: 2 });
        });
        h.part("open", 50, 49, (m) => {
          const o = "M35.6 45.4 Q50 49.6 64.4 45.4 Q61.5 57 50 57 Q38.5 57 35.6 45.4 Z";
          m.path(o, "#7a2b3a", { sw: 2.4 });
          m.clip(o, (c) => c.ellipse(50, 57, 8.5, 4.6, "#ff8fa8", { stroke: null }));
          m.path(o, "none", { sw: 2.4 });
        });
      });
    },
  },
  {
    id: "pet-octopus",
    voice: "blub",
    tricks: ["wave", "dance", "shake"],
    draw: (d) => {
      d.shadow(50, 92, 28, 3.6);
      // The outer tentacles, curling out on the deck (they wiggle gently).
      d.part("extra", 50, 70, (g) => {
        for (const s of [-1, 1]) {
          g.path(taper(side(s, [[42.5, 65.5], [35.5, 78.5], [26.5, 86.5], [18, 89.8], [13.2, 87.2], [14.2, 83]]), 10, 3.4), g.fill(OCTO_BACK), { sw: 2.8 });
          cups(g, side(s, [[21, 90.6], [16, 90.4], [12.6, 86.6]]));
        }
      });
      // The inner tentacles, down the middle onto the deck (they rise and fall as it breathes).
      d.part("body", 50, 90, (g) => {
        for (const s of [-1, 1]) {
          g.path(taper(side(s, [[46.5, 62], [44.5, 74], [41.5, 84], [36, 89.6], [31.6, 87.6]]), 10, 3.4), g.fill(OCTO), { sw: 2.8 });
          cups(g, side(s, [[38.4, 90.6], [34, 90.6]]));
        }
      });
      d.part("armL", 34.5, 55.5, (g) => octoArm(g, -1));
      d.part("armR", 65.5, 55.5, (g) => octoArm(g, 1));
      // The big round dome, with the face on it.
      d.part("head", 50, 62, (h) => {
        const dome = "M50 18.5 C64.5 18.5 74 29 74 42.5 C74 55.5 64 64.5 50 64.5 C36 64.5 26 55.5 26 42.5 C26 29 35.5 18.5 50 18.5 Z";
        h.path(dome, h.fill(OCTO), { sw: 3.4 });
        h.clip(dome, (c) => {
          for (const [x, y, r] of [[64, 26.5, 2.6], [69.5, 34.5, 1.8], [58.5, 23, 1.5]] as const) c.circle(x, y, r, OCTO[2], { stroke: null, op: 0.3 });
        });
        h.shine(36, 27.5, 6.5, 3.4, 0.5, -35);
        allEyes(h, 41.8, 45, 58.2, 45, 4.2);
        blush(h, 34.5, 52.5, 3.8, 0.7);
        blush(h, 65.5, 52.5, 3.8, 0.7);
        bothMouths(h, 50, 52.5, 7.5);
      });
    },
  },
  {
    id: "pet-owl",
    voice: "hoot",
    tricks: ["flap", "spin"],
    draw: (d) => {
      d.shadow(50, 92, 22, 3.4);
      d.part("feet", 50, 90, (g) => {
        for (const x of [43.5, 56.5]) {
          const toes = [`M${x} 87 L${x - 2.8} 91.2`, `M${x} 87 L${x} 91.8`, `M${x} 87 L${x + 2.8} 91.2`];
          for (const p of toes) g.stroke(p, { sw: 3 + 3.6, color: OL });
          for (const p of toes) g.stroke(p, { sw: 3, color: P.orange[1] });
        }
      });
      d.part("body", 50, 90, (g) => {
        const body = smooth([[50, 51], [64.5, 55], [71.5, 67.5], [69.5, 82], [60.5, 89.8], [50, 91.2], [39.5, 89.8], [30.5, 82], [28.5, 67.5], [35.5, 55]], 0.2);
        g.path(body, g.fill(OWL), { sw: 3 });
        g.clip(body, (c) => {
          // A cream chest with a fluffy scalloped top and little V feathers.
          c.path("M36.5 66 Q39.6 61.4 43.2 64 Q46.4 59.4 50 62.4 Q53.6 59.4 56.8 64 Q60.4 61.4 63.5 66 Q65.6 80.5 58.2 88.4 Q50 93.4 41.8 88.4 Q34.4 80.5 36.5 66 Z", c.fill(P.cream, "v"), { stroke: null });
          for (const [x, y] of [[45.5, 69], [54.5, 69], [50, 75], [45.5, 81], [54.5, 81]] as const) c.stroke(`M${x - 2.4} ${y} L${x} ${y + 2.2} L${x + 2.4} ${y}`, { color: OWL[1], sw: 1.8 });
        });
        g.path(body, "none", { sw: 3 });
      });
      d.part("armL", 37, 58, (g) => owlWing(g, -1));
      d.part("armR", 63, 58, (g) => owlWing(g, 1));
      d.part("head", 50, 56, (h) => {
        h.part("earL", 35, 27, (e) => owlTuft(e, -1));
        h.part("earR", 65, 27, (e) => owlTuft(e, 1));
        h.ellipse(50, 39, 23, 19, h.fill(OWL), { sw: 3.2 });
        h.shine(37, 25.4, 4.8, 2.2, 0.5, -20);
        // The pale face: two feather discs with one thin rim round both.
        for (const x of [41.2, 58.8]) h.circle(x, 40, 9.9, OWL[2], { stroke: null, op: 0.55 });
        for (const x of [41.2, 58.8]) h.circle(x, 40, 9, OWL_FACE, { stroke: null });
        allEyes(h, 41.2, 40.3, 58.8, 40.3, 4.3);
        blush(h, 33.6, 48.2, 3, 0.6);
        blush(h, 66.4, 48.2, 3, 0.6);
        // A small hooked beak; open, the lower half drops and a pink tongue shows.
        h.part("mouth", 50, 46.5, (m) => {
          m.path("M46.1 44.3 Q50 42.7 53.9 44.3 Q52.5 48.9 50 51.1 Q47.5 48.9 46.1 44.3 Z", m.fill(P.orange), { sw: 2 });
          m.shine(48.4, 44.6, 1.4, 0.7, 0.6, -10);
        });
        h.part("open", 50, 46.5, (m) => {
          m.path("M46.4 45.4 Q50 44.7 53.6 45.4 L52.7 52.2 Q50 54.2 47.3 52.2 Z", "#7a2b3a", { sw: 1.8 });
          m.ellipse(50, 51.4, 2, 1.3, "#ff8fa8", { stroke: null });
          m.path("M45.9 43.7 Q50 42.1 54.1 43.7 Q52.7 46.9 50 48.5 Q47.3 46.9 45.9 43.7 Z", m.fill(P.orange), { sw: 2 });
          m.path("M47.3 51.8 Q50 50.9 52.7 51.8 Q51.6 54.5 50 54.9 Q48.4 54.5 47.3 51.8 Z", m.fill(P.orange), { sw: 1.8 });
        });
      });
    },
  },
  {
    id: "pet-fox",
    voice: "yip",
    tricks: ["spin", "jump"],
    draw: (d) => {
      d.shadow(54, 92, 27, 3.6);
      // A big fluffy tail curling up beside it, a white tip at the end.
      d.part("tail", 60, 85, (t) => {
        const tail = smooth([[57, 90], [70, 91], [81.5, 86], [88, 75], [88.5, 63], [84, 54.5], [77.5, 51.5], [72, 53.5], [72.5, 58.5], [76.5, 63], [77.5, 72], [72.5, 79.5], [63, 82], [56.5, 82]], 0.2);
        t.path(tail, t.fill(FOX), { sw: 3 });
        t.clip(tail, (c) => {
          c.path(smooth([[70, 50], [80, 47], [90, 52], [89, 58.5], [84, 60.5], [79, 59], [74, 61.5], [69, 59]], 0.2), c.fill(P.white), { stroke: null });
          c.stroke("M82.6 70 Q84.6 76 81 81.6", { sw: 1.8, color: FOX[2] });
        });
        t.path(tail, "none", { sw: 3 });
      });
      // The folded hind legs: round haunches with dark paws peeking out in front.
      d.part("feet", 50, 90, (g) => {
        for (const s of [-1, 1]) {
          g.ellipse(sx(s, 30.5), 82.5, 9.4, 8.6, g.fill(FOX), { sw: 2.8 });
          g.ellipse(sx(s, 27.6), 89.6, 4.8, 2.7, g.fill(SOCK), { sw: 2.2 });
        }
      });
      d.part("body", 50, 90, (g) => {
        const body = smooth([[50, 50], [62, 53.5], [68, 66], [67, 80.5], [60, 89], [50, 90.6], [40, 89], [33, 80.5], [32, 66], [38, 53.5]], 0.2);
        g.path(body, g.fill(FOX), { sw: 3 });
        g.clip(body, (c) => c.path("M50 52 C59.5 52 62.5 59 61.5 67 C60.5 75 55.5 80.5 50 81.5 C44.5 80.5 39.5 75 38.5 67 C37.5 59 40.5 52 50 52 Z", c.fill(P.white, "v"), { stroke: null }));
        g.path(body, "none", { sw: 3 });
      });
      d.part("armL", 39.5, 63, (g) => foxLeg(g, -1));
      d.part("armR", 60.5, 63, (g) => foxLeg(g, 1));
      d.part("head", 50, 58, (h) => {
        h.part("earL", 38, 30, (e) => foxEar(e, -1));
        h.part("earR", 62, 30, (e) => foxEar(e, 1));
        // Fluffy white chest fur under the chin (it hides where the front legs join).
        h.path("M38 55 H62 Q63.6 61.5 60.2 65.6 Q58 64.6 56 66.6 Q53.4 69.8 50 69 Q46.6 69.8 44 66.6 Q42 64.6 39.8 65.6 Q36.4 61.5 38 55 Z", h.fill(P.white, "v"), { stroke: null });
        const head = "M50 23 C62 23 70.5 30 72 40 Q76.5 45.5 74 49 Q69 57.5 50 60.5 Q31 57.5 26 49 Q23.5 45.5 28 40 C29.5 30 38 23 50 23 Z";
        h.path(head, h.fill(FOX), { sw: 3.2 });
        h.clip(head, (c) => c.path("M20 43 C30 41 41 43 50 48.5 C59 43 70 41 80 43 L80 64 L20 64 Z", c.fill(P.white, "v"), { stroke: null }));
        h.path(head, "none", { sw: 3.2 });
        h.shine(36.5, 29, 4.8, 2.4, 0.5, -22);
        allEyes(h, 41.5, 39.5, 58.5, 39.5, 4);
        h.ellipse(50, 48.6, 2.8, 2, h.fill(P.black), { sw: 1.6 });
        blush(h, 33, 49.5, 3.2, 0.55);
        blush(h, 67, 49.5, 3.2, 0.55);
        h.part("mouth", 50, 52, (m) => m.stroke("M50 50.6 V51.8 M50 51.8 Q48 54 46 52.6 M50 51.8 Q52 54 54 52.6", { sw: 1.8 }));
        h.part("open", 50, 52, (m) => {
          const o = "M45.6 51.6 Q50 53 54.4 51.6 Q53.6 57.6 50 57.6 Q46.4 57.6 45.6 51.6 Z";
          m.path(o, "#7a2b3a", { sw: 1.8 });
          m.clip(o, (c) => c.ellipse(50, 57.4, 3, 2, "#ff8fa8", { stroke: null }));
          m.path(o, "none", { sw: 1.8 });
          m.stroke("M50 50.6 V51.8", { sw: 1.8 });
        });
      });
    },
  },
];
