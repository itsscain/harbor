// Pets, set D — baby dino, baby dragon, unicorn and panda.
import { P, leaf, smooth, sparklePath, type Pen, type Ramp } from "../../art/pen";
import { allEyes, mouthOpen, mouthSmile, type PetRig } from "./rig";

type Pt = [number, number];
const f = (n: number) => Math.round(n * 100) / 100;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** The unit normal of a polyline at point i (the left-hand side of travel on screen). */
function normal(pts: Pt[], i: number): Pt {
  const p = pts[Math.max(0, i - 1)];
  const q = pts[Math.min(pts.length - 1, i + 1)];
  const len = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
  return [-(q[1] - p[1]) / len, (q[0] - p[0]) / len];
}

/** A closed shape tapering along a centerline (tails, horns, locks of mane): `w0` wide at the
 *  first point, `w1` at the last, with a rounded tip. */
function taper(pts: Pt[], w0: number, w1: number): string {
  const n = pts.length;
  const a: Pt[] = [];
  const b: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const [nx, ny] = normal(pts, i);
    const w = (w0 + ((w1 - w0) * i) / (n - 1)) / 2;
    a.push([pts[i][0] + nx * w, pts[i][1] + ny * w]);
    b.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  const e = pts[n - 1];
  const p = pts[n - 2];
  const len = Math.hypot(e[0] - p[0], e[1] - p[1]) || 1;
  const tip: Pt = [e[0] + ((e[0] - p[0]) / len) * w1 * 0.6, e[1] + ((e[1] - p[1]) / len) * w1 * 0.6];
  return smooth([...a, tip, ...b.reverse()], 0.18);
}

/** A tapering shape striped lengthwise in `ramps` (ramps[0] on the normal's side), outlined once. */
function rainbow(d: Pen, pts: Pt[], w0: number, w1: number, ramps: Ramp[], sw = 2.4) {
  const shape = taper(pts, w0, w1);
  const n = pts.length;
  const N = ramps.length;
  d.path(shape, ramps[N - 1][1], { stroke: null });
  d.clip(shape, (c) => {
    ramps.forEach((r, k) => {
      const frac = 0.5 - (k + 0.5) / N;
      const line = pts.map((pt, i): Pt => {
        const [nx, ny] = normal(pts, i);
        const off = frac * (w0 + ((w1 - w0) * i) / (n - 1));
        return [pt[0] + nx * off, pt[1] + ny * off];
      });
      c.path(taper(line, (w0 / N) * 1.3, (w1 / N) * 1.3), r[1], { stroke: null });
    });
  });
  d.path(shape, "none", { sw });
}

/** A soft spike (or horn) standing on (x, y), pointing at `deg` (−90 = up), `w` wide, `h` long. */
function spike(x: number, y: number, w: number, h: number, deg = -90): string {
  const ux = Math.cos(rad(deg));
  const uy = Math.sin(rad(deg));
  const at = (s: number, t: number) => `${f(x + ux * s - uy * t)} ${f(y + uy * s + ux * t)}`;
  return `M${at(0, -w / 2)} C${at(h * 0.45, -w * 0.52)} ${at(h * 0.85, -w * 0.3)} ${at(h * 0.95, -w * 0.09)} Q${at(h * 1.03, 0)} ${at(h * 0.95, w * 0.09)} C${at(h * 0.85, w * 0.3)} ${at(h * 0.45, w * 0.52)} ${at(0, w / 2)} Z`;
}

/** A stadium (a limb) from (x1, y1) to (x2, y2), `r` thick on each side. */
function capsule(x1: number, y1: number, x2: number, y2: number, r: number): string {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const nx = -Math.sin(a) * r;
  const ny = Math.cos(a) * r;
  return `M${f(x1 + nx)} ${f(y1 + ny)} L${f(x2 + nx)} ${f(y2 + ny)} A${f(r)} ${f(r)} 0 0 0 ${f(x2 - nx)} ${f(y2 - ny)} L${f(x1 - nx)} ${f(y1 - ny)} A${f(r)} ${f(r)} 0 0 0 ${f(x1 + nx)} ${f(y1 + ny)} Z`;
}

/** The open happy mouth (a dark "D" with a pink tongue), drawn into a part of your own. */
function openMouth(d: Pen, cx: number, cy: number, w: number, sw = 2.2) {
  const h = w * 0.62;
  const shape = `M${f(cx - w / 2)} ${f(cy - h * 0.12)} Q${f(cx)} ${f(cy - h * 0.32)} ${f(cx + w / 2)} ${f(cy - h * 0.12)} Q${f(cx + w * 0.42)} ${f(cy + h)} ${f(cx)} ${f(cy + h)} Q${f(cx - w * 0.42)} ${f(cy + h)} ${f(cx - w / 2)} ${f(cy - h * 0.12)} Z`;
  d.path(shape, "#7a2b3a", { sw });
  d.clip(shape, (c) => c.ellipse(cx, cy + h * 0.95, w * 0.3, h * 0.42, "#ff8fa8", { stroke: null }));
  d.path(shape, "none", { sw });
}

/** A rosy cheek that stays pink on a colored face. */
function blush(d: Pen, cx: number, cy: number, r: number) {
  d.ellipse(cx, cy, r, r * 0.62, "#ff9cc0", { stroke: null, op: 0.8 });
}

// ── Baby dino ────────────────────────────────────────────────────────────────────────────────
const DINO = P.green;
const SPIKE: Ramp = ["#fffbd6", "#ffe066", "#e0a800"];
const DINO_TAIL: Pt[] = [[45, 81], [33.5, 86], [23, 83], [16.5, 75], [15.5, 66]];

/** A tiny T-rex arm on side `s` (−1 = the picture's left): it hangs from the shoulder and the
 *  hand turns in, two little claws down. */
function dinoArm(g: Pen, s: number) {
  const x = 50 + s * 12.5;
  const hx = x - s * 3.2;
  for (const k of [0, 1]) g.path(spike(hx - s * (0.2 + k * 2.2), 69.4, 2.1, 2.6, 90 + s * 18), P.cream[1], { sw: 1.4 });
  g.tube(`M${x} 61.5 Q${x + s * 0.6} 66.6 ${hx} 68`, DINO[1], 5, 2.4);
  g.shine(x - 0.8, 63.6, 0.9, 1.6, 0.5, 15);
}

// ── Baby dragon ──────────────────────────────────────────────────────────────────────────────
const DRAGON = P.violet;
const WING: Ramp = ["#ffd6ec", "#ff9ccd", "#d9579a"];
const HORN: Ramp = ["#fffdf0", "#ffecb0", "#d9ae5a"];

/** A little bat wing on side `s`, its root hidden behind the shoulder at (50 + 10.5s, 62).
 *  It fans from straight down to nearly level, so at rest its top half peeks out beside the
 *  body, and a cheer (115° up) shows its bottom half beside the head. */
function dragonWing(g: Pen, s: number) {
  const rx = 50 + s * 10.5;
  const ry = 62;
  const at = (deg: number, r: number): Pt => [rx - s * Math.cos(rad(deg)) * r, ry + Math.sin(rad(deg)) * r];
  const p = (q: Pt) => `${f(q[0])} ${f(q[1])}`;
  const tips: [number, number][] = [[166, 22.5], [142, 22.5], [118, 20.5], [94, 16.5]];
  let w = `M${p([rx, ry])} Q${p(at(172, 12))} ${p(at(tips[0][0], tips[0][1]))}`;
  for (let i = 1; i < tips.length; i++) {
    const [a0, r0] = tips[i - 1];
    const [a1, r1] = tips[i];
    w += ` Q${p(at((a0 + a1) / 2, ((r0 + r1) / 2) * 0.7))} ${p(at(a1, r1))}`;
  }
  w += ` Q${p(at(86, 8))} ${p([rx, ry])} Z`;
  g.path(w, g.fill(WING, "d"), { sw: 2.4 });
  g.clip(w, (c) => {
    for (const [a, r] of tips.slice(1)) c.stroke(`M${p(at(a + 4, 4))} L${p(at(a, r - 1.5))}`, { sw: 1.6, color: WING[2] });
  });
  // The wing's arm along its top edge, ending in a tiny claw.
  g.stroke(`M${p(at(168, 5))} Q${p(at(173, 12))} ${p(at(tips[0][0], tips[0][1]))}`, { sw: 3.2, color: DRAGON[2] });
  g.path(spike(...at(tips[0][0], tips[0][1]), 2.6, 3.2, s < 0 ? -170 : -10), HORN[1], { sw: 1.4 });
}

// ── Unicorn ──────────────────────────────────────────────────────────────────────────────────
const PASTEL = {
  pink: ["#ffd8ea", "#ff9ccb", "#e05a96"],
  peach: ["#ffe5cd", "#ffbb85", "#e8894a"],
  lemon: ["#fff8c8", "#ffe066", "#ddb125"],
  mint: ["#d6f8e5", "#80dfac", "#3aa872"],
  sky: ["#d6efff", "#82cbff", "#3490d4"],
  lilac: ["#ece0ff", "#bf9cff", "#825ade"],
} as const satisfies Record<string, Ramp>;
const RAINBOW: Ramp[] = [PASTEL.pink, PASTEL.peach, PASTEL.lemon, PASTEL.mint, PASTEL.sky, PASTEL.lilac];
const HOOF: Ramp = ["#fff3a8", "#ffd23a", "#d99400"];

/** A front leg on side `s`, held like an arm: shoulder at (50 + 10s, 61), a golden hoof below. */
function unicornLeg(g: Pen, s: number) {
  const x = 50 + s * 10;
  const hx = x - s * 1.4;
  const leg = capsule(x, 61, hx, 72.5, 3.8);
  g.path(leg, g.fill(P.white, "h"), { sw: 2.6 });
  g.clip(leg, (c) => c.rect(hx - 7, 71, 14, 8, 0, c.fill(HOOF, "v"), { stroke: null }));
  g.path(leg, "none", { sw: 2.6 });
  g.stroke(`M${hx - 3.7} 71.2 Q${hx} 72.4 ${hx + 3.7} 71.2`, { sw: 1.8 });
}

// ── Panda ────────────────────────────────────────────────────────────────────────────────────
const BAMBOO: Ramp = ["#dcf7a8", "#8fd45a", "#4f9a2a"];

/** A chunky black arm on side `s`, shoulder at (50 + 13.5s, 60.5). */
function pandaArm(g: Pen, s: number) {
  const x = 50 + s * 13.5;
  g.path(capsule(x, 60.5, x + s * 0.8, 70.5, 4.9), g.fill(P.black), { sw: 2.6 });
  g.shine(x - 1.6, 63, 1, 2.4, 0.3, 10);
}

export const PETS_D: PetRig[] = [
  {
    id: "pet-dino",
    voice: "roar",
    tricks: ["roar", "jump", "dance"],
    draw: (d) => {
      d.shadow(50, 92, 23, 3.4);
      // A thick tail curling up beside it, soft spikes along its top.
      d.part("tail", 41, 80, (t) => {
        for (const [i, h] of [[2.1, 5.4], [2.7, 6.2], [3.3, 5.6]] as const) {
          const k = Math.floor(i);
          const u = i - k;
          const q = DINO_TAIL[k];
          const r = DINO_TAIL[k + 1];
          const n0 = normal(DINO_TAIL, k);
          const n1 = normal(DINO_TAIL, k + 1);
          const deg = (Math.atan2(n0[1] + (n1[1] - n0[1]) * u, n0[0] + (n1[0] - n0[0]) * u) * 180) / Math.PI;
          const half = (16 + ((5 - 16) * i) / 4) / 2 - 0.6;
          const x = q[0] + (r[0] - q[0]) * u + Math.cos(rad(deg)) * half;
          const y = q[1] + (r[1] - q[1]) * u + Math.sin(rad(deg)) * half;
          t.path(spike(x, y, h * 1.2, h, deg), t.fill(SPIKE), { sw: 2 });
        }
        t.path(taper(DINO_TAIL, 16, 5), t.fill(DINO, "d"), { sw: 2.8 });
      });
      d.part("feet", 50, 90, (g) => {
        for (const s of [-1, 1]) {
          const x = 50 + s * 11.5;
          g.ellipse(x, 88.2, 7.4, 4.3, g.fill(DINO), { sw: 2.6 });
          for (const k of [-1, 0, 1]) g.ellipse(x + k * 3.5, 91.3 - Math.abs(k) * 0.5, 1.4, 1.1, P.cream[1], { sw: 1.3 });
        }
      });
      d.part("body", 50, 90, (g) => {
        const body = smooth([[50, 52.5], [61.5, 55.5], [67.5, 65], [70.5, 77], [66, 86.5], [50, 89.5], [34, 86.5], [29.5, 77], [32.5, 65], [38.5, 55.5]], 0.2);
        g.path(body, g.fill(DINO), { sw: 3 });
        for (const [x, y, r] of [[65.5, 71, 1.9], [66.5, 77.5, 1.3], [34, 73.5, 1.6]] as const) g.circle(x, y, r, DINO[2], { stroke: null, op: 0.35 });
        const belly = smooth([[50, 59.5], [58.5, 63.5], [61.5, 74.5], [58, 84.5], [50, 87.5], [42, 84.5], [38.5, 74.5], [41.5, 63.5]], 0.2);
        g.path(belly, g.fill(P.sand, "v"), { sw: 2, stroke: P.sand[2] });
        g.clip(belly, (c) => {
          for (const y of [67.5, 73.5, 79.5]) c.stroke(`M36 ${y} Q50 ${y + 2.8} 64 ${y}`, { sw: 1.6, color: P.sand[2] });
        });
        g.shine(36.5, 66, 2, 4.2, 0.45, 20);
      });
      d.part("armL", 37.5, 61.5, (g) => dinoArm(g, -1));
      d.part("armR", 62.5, 61.5, (g) => dinoArm(g, 1));
      d.part("head", 50, 56, (h) => {
        // Soft back spikes peeking over the top of the head.
        h.part("extra", 51, 21, (c) => {
          c.path(spike(41.5, 22, 8, 9, -122), c.fill(SPIKE), { sw: 2.2 });
          c.path(spike(60.5, 22, 8, 9, -58), c.fill(SPIKE), { sw: 2.2 });
          c.path(spike(51, 20, 9.4, 10, -90), c.fill(SPIKE), { sw: 2.2 });
        });
        const head = smooth([[51, 17.5], [64, 19.5], [72, 28.5], [73.5, 40], [68, 50.5], [51, 55.5], [34, 50.5], [28.5, 40], [30, 28.5], [38, 19.5]], 0.2);
        h.path(head, h.fill(DINO), { sw: 3.2 });
        for (const [x, y, r] of [[62, 23.5, 2.2], [67.5, 28.5, 1.5], [57, 21.8, 1.2]] as const) h.circle(x, y, r, DINO[2], { stroke: null, op: 0.35 });
        h.shine(41, 25.5, 4.6, 2.6, 0.5, -25);
        h.clip(head, (c) => c.ellipse(51, 47, 15, 8.5, DINO[0], { stroke: null, op: 0.5 }));
        for (const x of [47.6, 54.4]) h.ellipse(x, 41.6, 1.1, 1.4, DINO[2], { stroke: null });
        allEyes(h, 42.5, 33, 59.5, 33, 4.1);
        blush(h, 35.5, 42.5, 3.4);
        blush(h, 66.5, 42.5, 3.4);
        mouthSmile(h, 51, 46.4, 13);
        // A wide happy roar with two tiny teeth.
        h.part("open", 51, 47, (m) => {
          const shape = "M41.5 45 Q51 43.2 60.5 45 Q59.6 55 51 55 Q42.4 55 41.5 45 Z";
          m.path(shape, "#7a2b3a", { sw: 2.4 });
          m.clip(shape, (c) => {
            c.ellipse(51, 55, 6.4, 4, "#ff8fa8", { stroke: null });
            c.path("M43.8 44 L48 44 Q46.6 48.8 45.9 48.8 Q45.2 48.8 43.8 44 Z", "#fff", { sw: 1.2 });
            c.path("M54 44 L58.2 44 Q56.8 48.8 56.1 48.8 Q55.4 48.8 54 44 Z", "#fff", { sw: 1.2 });
          });
          m.path(shape, "none", { sw: 2.4 });
        });
      });
    },
  },
  {
    id: "pet-dragon",
    voice: "roar",
    tricks: ["flap", "roar", "flip"],
    draw: (d) => {
      d.shadow(50, 92, 22, 3.4);
      // A tail lying along the deck, a spade on its tip.
      d.part("tail", 42, 84, (t) => {
        t.path(taper([[46, 84.5], [35, 89], [25.5, 89.5], [19.5, 86]], 10, 4.5), t.fill(DRAGON, "d"), { sw: 2.6 });
        t.path(spike(20.5, 86.5, 9.5, 9.5, -150), t.fill(WING), { sw: 2.4 });
      });
      // Bat wings, behind the body: their roots are hidden behind the shoulders.
      d.part("armL", 39.5, 62, (g) => dragonWing(g, -1));
      d.part("armR", 60.5, 62, (g) => dragonWing(g, 1));
      d.part("feet", 50, 90, (g) => {
        for (const s of [-1, 1]) {
          const x = 50 + s * 10.5;
          g.ellipse(x, 88.4, 6.6, 4, g.fill(DRAGON), { sw: 2.4 });
          for (const k of [-1, 0, 1]) g.ellipse(x + k * 3.1, 91.3 - Math.abs(k) * 0.5, 1.3, 1, P.cream[1], { sw: 1.2 });
        }
      });
      d.part("body", 50, 90, (g) => {
        const body = smooth([[50, 53], [60.5, 56], [66, 66], [68.5, 78], [64, 87], [50, 89.5], [36, 87], [31.5, 78], [34, 66], [39.5, 56]], 0.2);
        g.path(body, g.fill(DRAGON), { sw: 3 });
        const belly = smooth([[50, 60], [57.5, 63.5], [60, 74.5], [57, 84.5], [50, 87.5], [43, 84.5], [40, 74.5], [42.5, 63.5]], 0.2);
        g.path(belly, g.fill(P.gold, "v"), { sw: 2, stroke: P.gold[2] });
        g.clip(belly, (c) => {
          for (const y of [66, 72, 78]) c.stroke(`M38 ${y} Q50 ${y + 3} 62 ${y}`, { sw: 1.6, color: P.gold[2] });
        });
        g.shine(38.5, 63, 2.2, 4.4, 0.45, 20);
      });
      d.part("head", 50, 55, (h) => {
        // Two little horns, tucked behind the head.
        for (const [name, s] of [["earL", -1], ["earR", 1]] as const) {
          h.part(name, 51 + s * 7, 23, (e) => {
            const horn = taper([[51 + s * 6.6, 25], [51 + s * 8.2, 18], [51 + s * 11, 11.4]], 8.6, 3);
            e.path(horn, e.fill(HORN, "h"), { sw: 2 });
            e.clip(horn, (c) => c.stroke(`M${51 + s * 4.2} 17.4 Q${51 + s * 8.6} 17 ${51 + s * 13} 14.6`, { sw: 1.3, color: HORN[2] }));
          });
        }
        // Little frills at the jaw.
        for (const s of [-1, 1]) h.path(`M${51 + s * 17.5} 38 Q${51 + s * 22} 37.5 ${51 + s * 23.6} 35.4 Q${51 + s * 22.6} 39.4 ${51 + s * 24.6} 41.4 Q${51 + s * 21} 43 ${51 + s * 17} 45 Z`, h.fill(WING, "h"), { sw: 2 });
        const head = smooth([[51, 18.5], [63, 21], [70, 30], [70.5, 41], [65.5, 50], [51, 55.5], [36.5, 50], [31.5, 41], [32, 30], [39, 21]], 0.2);
        h.path(head, h.fill(DRAGON), { sw: 3.2 });
        h.shine(42, 26, 4.4, 2.5, 0.5, -25);
        h.ellipse(51, 46.5, 11, 7, DRAGON[0], { stroke: null, op: 0.6 });
        for (const x of [47.8, 54.2]) h.ellipse(x, 43.6, 1, 1.3, DRAGON[2], { stroke: null });
        allEyes(h, 43, 34, 59, 34, 4);
        blush(h, 37, 43.5, 3.2);
        blush(h, 65, 43.5, 3.2);
        mouthSmile(h, 51, 47.6, 8);
        // Open: a happy mouth and a tiny puff of flame sparkles.
        h.part("open", 51, 48, (m) => {
          openMouth(m, 51, 48, 8.6);
          m.path("M64.5 53.5 Q61.5 50.5 63.5 46.5 Q64.6 48.8 66 48 Q66.2 45.6 68 44.4 Q67.6 47.6 69.2 49.6 Q69.6 53.2 66.8 54 Q65.4 54.3 64.5 53.5 Z", m.fill(P.orange), { sw: 1.8 });
          m.path("M66 52.8 Q64.8 51 66.2 49.4 Q67 50.8 67.8 50.6 Q68.4 52.6 66 52.8 Z", P.gold[0], { stroke: null });
          m.path(sparklePath(71.5, 44.5, 2.2), P.gold[0], { sw: 1.2, stroke: P.gold[2] });
        });
      });
    },
  },
  {
    id: "pet-unicorn",
    voice: "neigh",
    tricks: ["flip", "jump", "dance"],
    draw: (d) => {
      d.shadow(50, 92, 21, 3.4);
      // A rainbow tail swishing up behind.
      d.part("tail", 42, 82, (t) => rainbow(t, [[45, 82], [33.5, 86], [24, 83], [18.5, 75], [18.5, 66], [22.5, 59.5]], 14, 4, RAINBOW.slice(0, 5)));
      // Back hooves peeking out under the body.
      d.part("feet", 50, 90, (g) => {
        for (const s of [-1, 1]) g.path(`M${50 + s * 12 - 5} 86 Q${50 + s * 12} 84.6 ${50 + s * 12 + 5} 86 L${50 + s * 12 + 5.6} 90.6 Q${50 + s * 12} 92.2 ${50 + s * 12 - 5.6} 90.6 Z`, g.fill(HOOF, "v"), { sw: 2.2 });
      });
      d.part("body", 50, 90, (g) => {
        const body = smooth([[50, 53], [61, 56.5], [66.5, 66.5], [69, 78], [64.5, 87], [50, 89.5], [35.5, 87], [31, 78], [33.5, 66.5], [39, 56.5]], 0.2);
        g.path(body, g.fill(P.white), { sw: 3 });
        g.clip(body, (c) => {
          c.stroke("M36 74 Q33 81 38 87.5", { sw: 1.8, color: P.white[2] });
          c.stroke("M64 74 Q67 81 62 87.5", { sw: 1.8, color: P.white[2] });
        });
        g.shine(38.5, 64, 2.2, 4.4, 0.6, 20);
      });
      d.part("armL", 40, 61, (g) => unicornLeg(g, -1));
      d.part("armR", 60, 61, (g) => unicornLeg(g, 1));
      d.part("head", 50, 56, (h) => {
        // The mane flows down behind the head, every color peeking out.
        rainbow(h, [[56, 19.4], [44, 17.6], [33.5, 21.6], [27.5, 30.5], [26, 40], [28, 48.5]], 15, 4.5, RAINBOW);
        rainbow(h, [[54, 18.5], [62.5, 18.5], [69.5, 24.5], [72.5, 33]], 10, 3.5, RAINBOW.slice(0, 4).reverse());
        for (const [name, s] of [["earL", -1], ["earR", 1]] as const) {
          h.part(name, 51 + s * 11.5, 25.5, (e) => {
            e.path(leaf(51 + s * 11.5, 26.5, 13, -90 + s * 24, 0.5), e.fill(P.white), { sw: 2.4 });
            e.path(leaf(51 + s * 11.6, 25.5, 8.4, -90 + s * 24, 0.36), "#ffb3c8", { stroke: null });
          });
        }
        const head = smooth([[51, 19.5], [62.5, 21.5], [69.5, 30.5], [70, 41], [66, 50], [59, 56], [51, 57.5], [43, 56], [36, 50], [32, 41], [32.5, 30.5], [39.5, 21.5]], 0.2);
        h.path(head, h.fill(P.white), { sw: 3.2 });
        h.shine(42, 27.5, 4.2, 2.4, 0.7, -25);
        // A golden spiral horn with a sparkle (it wiggles).
        h.part("extra", 51.5, 23.4, (c) => {
          const horn = "M45.8 24.4 Q48.4 16.2 50.8 10.6 Q51.5 9.3 52.2 10.6 Q54.6 16.2 57.2 24.4 Q51.5 26.4 45.8 24.4 Z";
          c.path(horn, c.fill(P.gold, "h"), { sw: 2.4 });
          c.clip(horn, (k) => {
            for (const y of [21.8, 17.6, 13.6]) k.stroke(`M44 ${y + 2} L59 ${y - 2}`, { sw: 1.6, color: P.gold[2] });
          });
          c.shine(49.6, 17.6, 0.9, 3.2, 0.75, 18);
          c.path(sparklePath(60.8, 13, 3.4), "#fff8c4", { sw: 1.3, stroke: P.gold[2] });
        });
        // A forelock curl over the forehead, beside the horn.
        rainbow(h, [[47.5, 23], [43.8, 24.6], [41.6, 28.4]], 5.6, 2.2, [PASTEL.pink, PASTEL.lilac], 2.2);
        // A soft muzzle, nostrils, cheeks.
        h.ellipse(51, 50.4, 10.5, 6.6, "#eef0fa", { stroke: null });
        for (const s of [-1, 1]) h.ellipse(51 + s * 3.4, 48.6, 0.95, 1.35, "#a9b0cc", { stroke: null, tf: `rotate(${s * -20} ${51 + s * 3.4} 48.6)` });
        h.cheek(37.5, 45, 3.4);
        h.cheek(64.5, 45, 3.4);
        // Eyes with long lashes (open, happy and sleepy).
        const E: [number, number][] = [[43.5, 36], [58.5, 36]];
        h.part("eyes", 51, 36, (g) => {
          for (const [x, y] of E) {
            const s = x < 51 ? -1 : 1;
            g.eye(x, y, 4.1);
            g.stroke(`M${x + s * 2.8} ${y - 2.3} q${s * 1.6} -0.6 ${s * 2.6} -2.2`, { sw: 1.5 });
            g.stroke(`M${x + s * 1.3} ${y - 3.6} q${s * 1} -0.9 ${s * 1.4} -2.6`, { sw: 1.5 });
          }
        });
        h.part("happy", 51, 36, (g) => {
          for (const [x, y] of E) {
            const s = x < 51 ? -1 : 1;
            g.stroke(`M${x - 4} ${y + 1.4} Q${x} ${y - 4.2} ${x + 4} ${y + 1.4}`, { sw: 2.6 });
            g.stroke(`M${x + s * 3.6} ${y} q${s * 1.6} -0.4 ${s * 2.6} -1.8`, { sw: 1.5 });
          }
        });
        h.part("sleep", 51, 36, (g) => {
          for (const [x, y] of E) {
            const s = x < 51 ? -1 : 1;
            g.stroke(`M${x - 4} ${y - 0.4} Q${x} ${y + 3.4} ${x + 4} ${y - 0.4}`, { sw: 2.6 });
            g.stroke(`M${x + s * 3.4} ${y + 0.6} l${s * 1.4} 1.6`, { sw: 1.5 });
            g.stroke(`M${x + s * 1.8} ${y + 1.5} l${s * 0.8} 1.9`, { sw: 1.5 });
          }
        });
        mouthSmile(h, 51, 52, 6, 2.2);
        mouthOpen(h, 51, 52.2, 6.6, 2);
      });
    },
  },
  {
    id: "pet-panda",
    voice: "chirp",
    tricks: ["flip", "wave", "dance"],
    draw: (d) => {
      d.shadow(50, 92, 22, 3.4);
      // Black feet, soles out, with pink pads.
      d.part("feet", 50, 90, (g) => {
        for (const s of [-1, 1]) {
          const x = 50 + s * 13.5;
          g.ellipse(x, 86.5, 7.8, 6.2, g.fill(P.black), { sw: 2.6 });
          g.ellipse(x, 88.2, 3.5, 2.6, "#ff9fb8", { stroke: null });
          for (const k of [-1, 0, 1]) g.circle(x + k * 2.7, 84.7 - (k === 0 ? 0.6 : 0), 1.1, "#ff9fb8", { stroke: null });
        }
      });
      d.part("body", 50, 90, (g) => {
        const body = smooth([[50, 52], [63, 55], [70.5, 65.5], [71, 77.5], [64.5, 87], [50, 89.5], [35.5, 87], [29, 77.5], [29.5, 65.5], [37, 55]], 0.2);
        g.path(body, g.fill(P.white), { sw: 3 });
        // The black band over the shoulders.
        g.clip(body, (c) => c.path("M20 48 H80 V62 Q66 68 50 66 Q34 68 20 62 Z", c.fill(P.black, "v"), { sw: 2.4 }));
        g.path(body, "none", { sw: 3 });
        g.shine(40, 72, 2.4, 4.4, 0.6, 20);
      });
      // The left paw holds a little bamboo sprout (it wiggles, and rises with a cheer).
      d.part("armL", 36.5, 60.5, (g) => {
        g.part("extra", 36, 71, (b) => {
          b.tube("M39 72 L24.5 75.5", BAMBOO[1], 3.2, 1.8);
          b.stroke("M31.2 72.4 l0.7 3.3", { sw: 1.3 });
          b.path(leaf(25, 75.4, 9, 205, 0.42), b.fill(BAMBOO, "d"), { sw: 1.8 });
          b.path(leaf(25, 75.4, 9.5, 145, 0.42), b.fill(BAMBOO, "d"), { sw: 1.8 });
        });
        pandaArm(g, -1);
      });
      d.part("armR", 63.5, 60.5, (g) => pandaArm(g, 1));
      d.part("head", 50, 56, (h) => {
        h.part("earL", 36.5, 26, (e) => e.circle(34.5, 22.5, 7.6, e.fill(P.black), { sw: 2.8 }));
        h.part("earR", 64.5, 26, (e) => e.circle(66.5, 22.5, 7.6, e.fill(P.black), { sw: 2.8 }));
        h.ellipse(50.5, 38, 21.5, 18.5, h.fill(P.white), { sw: 3.2 });
        h.shine(39.5, 26.5, 4.4, 2.4, 0.8, -25);
        // Eye patches, with the eyes on them (white-rimmed so they sparkle).
        h.ellipse(42, 38.5, 5.8, 7.4, h.fill(P.black), { stroke: null, tf: "rotate(32 42 38.5)" });
        h.ellipse(59, 38.5, 5.8, 7.4, h.fill(P.black), { stroke: null, tf: "rotate(-32 59 38.5)" });
        h.part("eyes", 50.5, 37.4, (g) => {
          for (const x of [42.8, 58.2]) {
            g.ellipse(x, 37.4, 3.9, 4.6, "#fff", { stroke: null });
            g.eye(x, 37.4, 3.6);
          }
        });
        h.part("happy", 50.5, 37.4, (g) => {
          for (const x of [42.8, 58.2]) g.stroke(`M${x - 3.6} ${38.8} Q${x} ${33.4} ${x + 3.6} ${38.8}`, { sw: 2.4, color: "#fff" });
        });
        h.part("sleep", 50.5, 37.4, (g) => {
          for (const x of [42.8, 58.2]) g.stroke(`M${x - 3.6} ${37} Q${x} ${41} ${x + 3.6} ${37}`, { sw: 2.4, color: "#fff" });
        });
        h.cheek(35, 46.5, 3.4);
        h.cheek(66, 46.5, 3.4);
        h.path("M47.4 43.9 Q50.5 42.8 53.6 43.9 Q53.2 46.4 50.5 47.3 Q47.8 46.4 47.4 43.9 Z", h.fill(P.black), { sw: 1.6 });
        h.part("mouth", 50.5, 49, (m) => m.stroke("M50.5 47.2 V48.6 M46.7 48.4 Q48.6 51 50.5 48.6 Q52.4 51 54.3 48.4", { sw: 2 }));
        mouthOpen(h, 50.5, 49.2, 8);
      });
    },
  },
];
