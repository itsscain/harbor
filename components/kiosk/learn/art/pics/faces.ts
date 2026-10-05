// Feelings: the cast's faces with an expression each (../people.ts MOODS or a custom Expr), plus
// the face-characters (monkeys, robot, ghost, alien, skull…). Skin tones and hair vary across the
// set. Where head()'s parts can't say a feeling clearly enough (squeezed-shut eyes, a real eye
// roll, a long fibbing nose…), that part is drawn here, lined up with head()'s own layout.

import { HAIR, OL, P, SKIN, circlePath, curve, drop, heart, lumpy, rr, star, type Pen, type Ramp } from "../pen";
import { MOODS, hand, head, zees, type Eyes, type Look } from "../people";
import type { PicDef } from "..";

// ── Local helpers ─────────────────────────────────────────────────────────────────────────────
/** Faces whose eyes head() can't draw (squeezed shut, rolled up, side-eye…) ask for none and
 *  draw their own with the helpers below. */
const OWN: Eyes = "none";
const MOUTH = "#7a2a3a";
const TONGUE = "#ff7a8a";

/** Where head(d, cx, cy, r) puts the eyes, brows and mouth, so drawn-on parts line up. */
const at = (cx: number, cy: number, r: number) => {
  const er = r * 0.14;
  const ey = cy + r * 0.06;
  return { cx, cy, r, er, ey, lx: cx - r * 0.38, rx: cx + r * 0.38, by: ey - er * 2.1, my: cy + r * 0.5, mw: r * 0.36, sw: Math.max(1.8, r * 0.085) };
};
type At = ReturnType<typeof at>;
const skinOf = (look: Look): Ramp => SKIN[look.skin ?? 1];
const ell = (cx: number, cy: number, rx: number, ry: number) => `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${rx * 2} 0 a${rx} ${ry} 0 1 0 ${-rx * 2} 0 Z`;

/** Eyes squeezed shut: "> <", pointing at the nose. */
function squeeze(d: Pen, f: At, k = 1) {
  const w = f.er * 1.15 * k;
  const h = f.er * 0.95 * k;
  for (const s of [-1, 1]) {
    const x = s < 0 ? f.lx : f.rx;
    d.stroke(`M${x + s * w} ${f.ey - h} L${x - s * w * 0.9} ${f.ey} L${x + s * w} ${f.ey + h}`, { sw: f.sw * 1.2 });
  }
}

/** Eyes with whites: pupils looking (dx, dy) in −1..1, an upper lid down to `lid` (0 open … 1 shut). */
function lookEyes(d: Pen, f: At, skin: Ramp, dx: number, dy: number, lid = 0, size = 1.35, pupil = 0.56) {
  const R = f.er * size;
  for (const s of [-1, 1]) {
    const x = s < 0 ? f.lx : f.rx;
    d.circle(x, f.ey, R, "#fff", { stroke: null });
    d.clip(circlePath(x, f.ey, R), (g) => {
      const px = x + dx * R * 0.48;
      const py = f.ey + dy * R * 0.48;
      g.circle(px, py, R * pupil, OL, { stroke: null });
      g.circle(px - R * 0.2, py - R * 0.2, R * 0.2, "#fff", { stroke: null });
      if (lid > 0) g.rect(x - R - 1, f.ey - R - 1, R * 2 + 2, R * 2 * lid + 1, 0, skin[1], { stroke: null });
    });
    d.circle(x, f.ey, R, "none", { sw: f.sw * 0.9 });
    if (lid > 0) {
      const y = f.ey - R + R * 2 * lid;
      const half = Math.sqrt(Math.max(0, R * R - (y - f.ey) ** 2));
      d.stroke(`M${x - half} ${y} H${x + half}`, { sw: f.sw * 1.1 });
    }
  }
}

/** Downcast eyes: dark half-moons peeking under heavy lids that slope down at the outside. */
function downEyes(d: Pen, f: At, slope = 0.3) {
  for (const s of [-1, 1]) {
    const x = s < 0 ? f.lx : f.rx;
    const y = f.ey + f.er * 0.1;
    const yi = y - f.er * slope; // inner end of the lid (higher)
    const yo = y + f.er * slope; // outer end (lower)
    const xi = x - s * f.er * 1.4;
    const xo = x + s * f.er * 1.4;
    d.clip(`M${xi} ${yi} L${xo} ${yo} L${xo} ${y + f.er * 3} L${xi} ${y + f.er * 3} Z`, (g) => {
      g.ellipse(x, y + f.er * 0.15, f.er * 0.85, f.er * 1.05, OL, { stroke: null });
      g.circle(x - f.er * 0.3, y + f.er * 0.55, f.er * 0.24, "#fff", { stroke: null });
    });
    d.stroke(`M${xi} ${yi} L${xo} ${yo}`, { sw: f.sw * 1.15 });
  }
}

/** A forehead gone pale-blue with fright (the fear emoji's wash), drawn under the hairline. */
function fearWash(d: Pen, f: At) {
  d.clip(ell(f.cx, f.cy, f.r * 0.9, f.r * 0.96), (g) => {
    g.rect(f.cx - f.r, f.cy - f.r * 0.5, f.r * 2, f.r * 0.56, 0, g.lin([[0, "#4f6dff", 0.42], [1, "#4f6dff", 0]]), { stroke: null });
  });
}

/** A wide grimace: clenched teeth in a long rounded box (😬). */
function grimace(d: Pen, f: At, k = 1.25) {
  const w = f.mw * k;
  const box = rr(f.cx - w, f.my - f.r * 0.1, w * 2, f.r * 0.36, f.r * 0.13);
  d.path(box, "#fff", { sw: f.sw });
  d.clip(box, (g) => {
    g.stroke(`M${f.cx - w} ${f.my + f.r * 0.08} H${f.cx + w}`, { sw: f.sw * 0.65 });
    for (const k2 of [-0.6, -0.2, 0.2, 0.6]) g.stroke(`M${f.cx + k2 * w} ${f.my - f.r * 0.12} V${f.my + f.r * 0.3}`, { sw: f.sw * 0.55 });
  });
}

/** A zipper across the mouth, with its slider and pull tab. */
function zipper(d: Pen, f: At) {
  const w = f.mw * 1.2;
  const y = f.my + f.r * 0.06;
  d.tube(`M${f.cx - w} ${y} H${f.cx + w}`, P.silver[1], f.r * 0.15, 2.2);
  for (let i = -7; i <= 7; i++) d.stroke(`M${f.cx + (i / 7.6) * w} ${y - f.r * 0.075} V${y + f.r * 0.075}`, { sw: 1.4, color: P.steel[2] });
  const sx = f.cx + w * 0.6;
  d.path(rr(sx - 3.4, y - 3.6, 6.8, 7.2, 2.2), d.fill(P.steel), { sw: 2.2 });
  d.path(rr(sx - 2.8, y + 2.4, 5.6, 9.5, 2.6), d.fill(P.silver, "v"), { sw: 2.2 });
  d.ellipse(sx, y + 8.4, 1.1, 1.8, P.steel[2], { stroke: null });
}

/** A scrunched zigzag mouth (confounded, squeezing hard). */
function zigzag(d: Pen, f: At, k = 0.85) {
  const w = f.mw * k;
  const pts: string[] = [];
  for (let i = 0; i <= 6; i++) pts.push(`${i ? "L" : "M"}${f.cx - w + (i * w) / 3} ${f.my + f.r * (i % 2 ? 0.0 : 0.13)}`);
  d.stroke(pts.join(" "), { sw: f.sw * 1.1 });
}

/** An open grin with the tongue sticking out over the lip. */
function tongueOut(d: Pen, f: At, k = 0.9, dx = 0) {
  const w = f.mw * k;
  const m = `M${f.cx - w} ${f.my - f.r * 0.04} Q${f.cx} ${f.my + f.r * 0.02} ${f.cx + w} ${f.my - f.r * 0.04} Q${f.cx + w * 0.9} ${f.my + f.r * 0.32} ${f.cx} ${f.my + f.r * 0.32} Q${f.cx - w * 0.9} ${f.my + f.r * 0.32} ${f.cx - w} ${f.my - f.r * 0.04} Z`;
  d.path(m, MOUTH, { sw: f.sw });
  const tx = f.cx + dx * w;
  const tw = w * 0.55;
  d.path(`M${tx - tw} ${f.my + f.r * 0.12} Q${tx - tw * 1.08} ${f.my + f.r * 0.5} ${tx} ${f.my + f.r * 0.5} Q${tx + tw * 1.08} ${f.my + f.r * 0.5} ${tx + tw} ${f.my + f.r * 0.12} Z`, d.fill(P.pink), { sw: f.sw * 0.9 });
  d.stroke(`M${tx} ${f.my + f.r * 0.22} V${f.my + f.r * 0.38}`, { sw: f.sw * 0.6, color: P.pink[2] });
}

/** A big closed-teeth grin: a crescent of white teeth (😁). */
function teethGrin(d: Pen, f: At, k = 1.25) {
  const w = f.mw * k;
  const p = `M${f.cx - w} ${f.my - f.r * 0.08} Q${f.cx} ${f.my + f.r * 0.02} ${f.cx + w} ${f.my - f.r * 0.08} Q${f.cx + w * 0.9} ${f.my + f.r * 0.44} ${f.cx} ${f.my + f.r * 0.44} Q${f.cx - w * 0.9} ${f.my + f.r * 0.44} ${f.cx - w} ${f.my - f.r * 0.08} Z`;
  d.path(p, "#fff", { sw: f.sw * 1.05 });
  d.clip(p, (g) => {
    g.stroke(`M${f.cx - w} ${f.my + f.r * 0.12} Q${f.cx} ${f.my + f.r * 0.24} ${f.cx + w} ${f.my + f.r * 0.12}`, { sw: f.sw * 0.7 });
    for (const t of [-0.6, -0.2, 0.2, 0.6]) g.stroke(`M${f.cx + t * w} ${f.my - f.r * 0.1} V${f.my + f.r * 0.5}`, { sw: f.sw * 0.5 });
  });
}

/** Dizzy spiral eyes. */
function spirals(d: Pen, f: At, R = f.er * 1.35) {
  for (const s of [-1, 1]) {
    const x = s < 0 ? f.lx : f.rx;
    const pts: [number, number][] = [];
    for (let i = 0; i <= 30; i++) {
      const t = (i / 30) * Math.PI * 4.4 * s;
      const rad = (i / 30) * R;
      pts.push([x + Math.cos(t) * rad, f.ey + Math.sin(t) * rad]);
    }
    d.stroke(curve(pts, 0.18), { sw: f.sw * 0.95 });
  }
}

/** Wide-open eyes with tiny pupils (terror). */
function shockEyes(d: Pen, f: At, k = 1.55) {
  for (const s of [-1, 1]) {
    const x = s < 0 ? f.lx : f.rx;
    d.ellipse(x, f.ey, f.er * k, f.er * k * 1.12, "#fff", { sw: f.sw * 0.9 });
    d.circle(x, f.ey + f.er * 0.1, f.er * 0.45, OL, { stroke: null });
  }
}

/** Big pleading puppy eyes, brimming with tears. */
function puppyEyes(d: Pen, f: At, k = 1.45) {
  for (const s of [-1, 1]) {
    const x = s < 0 ? f.lx : f.rx;
    const rx = f.er * k;
    const ry = f.er * 1.15 * k;
    const e = ell(x, f.ey, rx, ry);
    d.path(e, OL, { stroke: null });
    d.clip(e, (g) => g.ellipse(x, f.ey + ry * 0.98, rx * 1.1, ry * 0.5, P.sky[1], { stroke: null, op: 0.9 }));
    d.circle(x - rx * 0.3, f.ey - ry * 0.32, rx * 0.42, "#fff", { stroke: null });
    d.circle(x + rx * 0.34, f.ey + ry * 0.12, rx * 0.18, "#fff", { stroke: null });
  }
}

/** A big sweat drop with a shine. */
function sweat(d: Pen, x: number, y: number, s: number) {
  d.path(drop(x, y, s), d.fill(P.sky), { sw: 2.2 });
  d.shine(x - s * 0.35, y + s * 0.05, s * 0.22, s * 0.38, 0.75, 0);
}

/** An open, down-turned mouth (fright, dismay). */
function openFrown(d: Pen, f: At, k = 1) {
  const w = f.mw * 0.75 * k;
  d.path(`M${f.cx - w} ${f.my + f.r * 0.24} Q${f.cx - w * 0.95} ${f.my - f.r * 0.1 * k} ${f.cx} ${f.my - f.r * 0.1 * k} Q${f.cx + w * 0.95} ${f.my - f.r * 0.1 * k} ${f.cx + w} ${f.my + f.r * 0.24} Q${f.cx} ${f.my + f.r * 0.14} ${f.cx - w} ${f.my + f.r * 0.24} Z`, MOUTH, { sw: f.sw });
}

/** Closed eyes with sad lids, sloping down at the outside (weary, hurting). */
function sadShut(d: Pen, f: At) {
  for (const s of [-1, 1]) {
    const x = s < 0 ? f.lx : f.rx;
    d.stroke(`M${x - s * f.er * 1.2} ${f.ey - f.er * 0.2} Q${x} ${f.ey + f.er * 0.7} ${x + s * f.er * 1.25} ${f.ey + f.er * 0.6}`, { sw: f.sw * 1.2 });
  }
}

/** A cartoon puff of steam: overlapping balls outlined as one cloud, turned to blow along `deg`. */
function puffCloud(d: Pen, x: number, y: number, s: number, deg: number) {
  const balls: [number, number, number][] = [[0, 0, 1], [-0.95, 0.3, 0.7], [0.92, 0.32, 0.68], [0.05, 0.62, 0.62]];
  const p = balls.map(([bx, by, k]) => ell(bx * s, by * s, k * s, k * s)).join(" ");
  d.g(`translate(${x} ${y}) rotate(${deg})`, (g) => {
    g.path(p, "none", { sw: 5 });
    g.path(p, g.fill(P.white), { stroke: null });
    g.shine(-s * 0.35, -s * 0.4, s * 0.3, s * 0.14, 0.9);
  });
}

/** A tear flying off at an angle (degrees, 0 = point up). */
function flyingTear(d: Pen, x: number, y: number, s: number, deg: number) {
  d.g(`rotate(${deg} ${x} ${y})`, (g) => sweat(g, x, y, s));
}

// The three wise monkeys share one head; each covers something different with its hands.
/** A monkey's head (ears, fur, tuft, face mask, nose, mouth); eyes are drawn by the caller. */
function monkeyHead(d: Pen, cx: number, cy: number, r: number, mouth: "smile" | "o" | "none" = "smile") {
  for (const s of [-1, 1]) {
    d.circle(cx + s * r * 1.04, cy + r * 0.06, r * 0.34, d.fill(P.brown), { sw: 3 });
    d.circle(cx + s * r * 1.04, cy + r * 0.06, r * 0.19, d.fill(P.tan), { stroke: null });
  }
  d.path(`M${cx - r * 0.2} ${cy - r * 0.9} Q${cx - r * 0.16} ${cy - r * 1.28} ${cx + r * 0.04} ${cy - r * 1.02} Q${cx + r * 0.2} ${cy - r * 1.3} ${cx + r * 0.26} ${cy - r * 0.88} Z`, d.fill(P.brown), { sw: 2.6 });
  d.circle(cx, cy, r, d.fill(P.brown), { sw: 3.5 });
  d.shine(cx - r * 0.42, cy - r * 0.6, r * 0.26, r * 0.12, 0.45);
  // The face: two eye patches and a muzzle melted into one shape, outlined as one.
  const mask = `${ell(cx - r * 0.3, cy - r * 0.06, r * 0.38, r * 0.4)} ${ell(cx + r * 0.3, cy - r * 0.06, r * 0.38, r * 0.4)} ${ell(cx, cy + r * 0.4, r * 0.62, r * 0.46)}`;
  d.path(mask, "none", { sw: 5.4 });
  d.path(mask, d.fill(P.tan), { stroke: null });
  for (const s of [-1, 1]) d.ellipse(cx + s * r * 0.08, cy + r * 0.27, r * 0.05, r * 0.035, OL, { stroke: null });
  for (const s of [-1, 1]) d.cheek(cx + s * r * 0.45, cy + r * 0.42, r * 0.12);
  if (mouth === "smile") d.stroke(`M${cx - r * 0.24} ${cy + r * 0.48} Q${cx} ${cy + r * 0.7} ${cx + r * 0.24} ${cy + r * 0.48}`, { sw: 2.6 });
  if (mouth === "o") d.ellipse(cx, cy + r * 0.56, r * 0.1, r * 0.13, MOUTH, { sw: 2.4 });
}
/** A monkey hand (the cast's hand in a monkey's tan, with a furry wrist instead of a sleeve). */
function monkeyHand(d: Pen, x: number, y: number, s: number, deg: number, left = false) {
  hand(d, x, y, s, deg, { skin: 3, back: true, left });
  d.g(`translate(${x} ${y}) rotate(${deg})`, (g) => g.path(rr(-s * 1.04, s * 0.92, s * 2.08, s * 0.6, s * 0.28), g.fill(P.brown, "v"), { sw: Math.max(2, s * 0.13) }));
}

// ── The faces ─────────────────────────────────────────────────────────────────────────────────
export const FACES: PicDef[] = [
  [
    "🤔",
    "thinking face",
    (d) => {
      const look: Look = { skin: 3, hair: "short", hairColor: HAIR.black };
      const f = at(48, 42, 30);
      // Head tilted, eyes up, a sideways "hmm…" mouth…
      d.g(`rotate(8 ${f.cx} ${f.cy})`, (g) => {
        head(g, f.cx, f.cy, f.r, look, { eyes: OWN, brows: "raised", mouth: "none" });
        lookEyes(g, f, skinOf(look), 0.55, -0.65);
        g.stroke(`M${f.cx - f.mw * 0.55} ${f.my + f.r * 0.1} Q${f.cx} ${f.my + f.r * 0.02} ${f.cx + f.mw * 0.55} ${f.my - f.r * 0.02}`, { sw: f.sw * 1.1 });
      });
      // …and a finger on the chin.
      hand(d, 67, 76, 9, -22, { fingers: ["up", "curl", "curl", "curl"], thumb: "out", skin: 3 });
    },
  ],
  ["😊", "happy face", (d) => head(d, 50, 54, 34, { skin: 2, hair: "short", hairColor: HAIR.brown }, MOODS.happy)],
  ["😢", "crying face", (d) => head(d, 50, 54, 34, { skin: 1, hair: "curly", hairColor: HAIR.auburn }, MOODS.cry)],
  ["😠", "angry face", (d) => head(d, 50, 54, 34, { skin: 0, hair: "spiky", hairColor: HAIR.auburn }, MOODS.angry)],
  [
    "🤗",
    "hugging face",
    (d) => {
      head(d, 50, 47, 30, { skin: 4, hair: "puffs", hairColor: HAIR.black }, { eyes: "happy", brows: "up", mouth: "grin", extras: ["blush"] });
      // Two open hands held out for a hug.
      hand(d, 23, 76, 9, -22, { skin: 4, left: true });
      hand(d, 77, 76, 9, 22, { skin: 4 });
    },
  ],
  [
    "😔",
    "sorry face",
    (d) => {
      const f = at(50, 52, 32);
      head(d, f.cx, f.cy, f.r, { skin: 2, hair: "wavy", hairColor: HAIR.brown }, { eyes: OWN, brows: "sad", mouth: "frown" });
      // Eyes cast down at the floor.
      downEyes(d, f);
    },
  ],
  [
    "😴",
    "sleeping face",
    (d) => {
      d.g("rotate(-8 44 61)", (g) => head(g, 44, 61, 30, { skin: 1, hair: "curly", hairColor: HAIR.blond }, { eyes: "closed", brows: "flat", mouth: "o" }));
      zees(d, 70, 38, 10, 3.8);
    },
  ],
  [
    "🤖",
    "robot",
    (d) => {
      // Antenna.
      d.tube("M50 24 V16", P.steel[1], 3.5, 2.5);
      d.ball(50, 13.5, 5.2, P.red);
      // Ears.
      for (const x of [9, 81]) d.path(rr(x, 43, 10, 24, 4), d.fill(P.steel, "v"), { sw: 3 });
      // Head.
      d.path(rr(16, 22, 68, 66, 20), d.fill(P.silver), { sw: 3.5 });
      d.shine(31, 30, 10, 4, 0.8, -15);
      for (const x of [24, 76]) d.circle(x, 81, 2, P.steel[2], { stroke: null });
      // Face screen with glowing eyes and smile.
      d.path(rr(23, 35, 54, 40, 14), d.lin([[0, P.navy[1]], [1, P.navy[2]]]), { sw: 2.6 });
      for (const x of [38, 62]) {
        d.glow(x, 51, 11, P.sky[0], 0.55);
        d.ellipse(x, 51, 5.5, 6.5, d.fill(P.sky), { sw: 2 });
        d.circle(x - 1.8, 48.6, 1.9, "#fff", { stroke: null });
      }
      d.stroke("M41 63 Q50 70 59 63", { sw: 3.2, color: P.sky[0] });
      d.circle(29, 64, 2.6, P.pink[1], { stroke: null, op: 0.9 });
      d.circle(71, 64, 2.6, P.pink[1], { stroke: null, op: 0.9 });
    },
  ],
  [
    "🙄",
    "rolling eyes",
    (d) => {
      const look: Look = { skin: 3, hair: "pony", hairColor: HAIR.brown };
      const f = at(46, 55, 31);
      head(d, f.cx, f.cy, f.r, look, { eyes: OWN, brows: "flat", mouth: "none" });
      // Pupils rolled right up under the lids.
      lookEyes(d, f, skinOf(look), 0.3, -1.25, 0.2, 1.5);
      // "Ugh": a flat, sideways mouth.
      d.stroke(`M${f.cx - f.mw * 0.65} ${f.my + f.r * 0.06} L${f.cx + f.mw * 0.65} ${f.my + f.r * 0.12}`, { sw: f.sw * 1.15 });
    },
  ],
  [
    "😕",
    "confused face",
    (d) => {
      const f = at(50, 54, 34);
      head(d, f.cx, f.cy, f.r, { skin: 1, hair: "curly", hairColor: HAIR.red }, { eyes: "dot", brows: "worried", mouth: "none" });
      // A wonky, slanted mouth.
      d.stroke(`M${f.cx - f.mw * 0.8} ${f.my + f.r * 0.02} Q${f.cx} ${f.my - f.r * 0.04} ${f.cx + f.mw * 0.8} ${f.my + f.r * 0.2}`, { sw: f.sw * 1.15 });
    },
  ],
  [
    "🤥",
    "lying face",
    (d) => {
      const look: Look = { skin: 2, hair: "short", hairColor: HAIR.auburn };
      const skin = skinOf(look);
      const f = at(45, 54, 31);
      head(d, f.cx, f.cy, f.r, look, { eyes: OWN, brows: "raised", mouth: "wavy" });
      lookEyes(d, f, skin, -0.75, 0.15, 0.32, 1.12);
      // The long fibbing nose: thick at the face, tapering to a round tip.
      const ny = f.cy + f.r * 0.32;
      d.path(`M${f.cx - 3} ${ny - 5} L${86} ${ny - 2.6} Q${91} ${ny - 2.4} ${91} ${ny} Q${91} ${ny + 2.4} ${86} ${ny + 2.6} L${f.cx - 3} ${ny + 5} Q${f.cx - 8} ${ny} ${f.cx - 3} ${ny - 5} Z`, d.fill(skin, "v"), { sw: 2.6 });
      d.shine(f.cx + 16, ny - 2.2, 9, 1.1, 0.6, 0);
    },
  ],
  [
    "😤",
    "huffing face",
    (d) => {
      const f = at(50, 49, 31);
      head(d, f.cx, f.cy, f.r, { skin: 4, hair: "short", hairColor: HAIR.black }, { eyes: "angry", brows: "angry", mouth: "frown" });
      // Two huffs of steam blowing out of the nose.
      for (const s of [-1, 1]) puffCloud(d, f.cx + s * f.r * 0.95, f.cy + f.r * 0.78, f.r * 0.22, s * 25);
    },
  ],
  [
    "🤫",
    "shushing face",
    (d) => {
      head(d, 50, 46, 31, { skin: 0, hair: "wavy", hairColor: HAIR.blond }, { eyes: "dot", brows: "up", mouth: "shh" });
      // One finger over the lips.
      hand(d, 55.9, 74.5, 9, 0, { fingers: ["up", "curl", "curl", "curl"], thumb: "in", skin: 0, back: true });
    },
  ],
  [
    "😨",
    "scared face",
    (d) => {
      const f = at(50, 54, 34);
      head(d, f.cx, f.cy, f.r, { skin: 3, hair: "curly", hairColor: HAIR.black }, { eyes: "wide", brows: "worried", mouth: "none", extras: ["sweat"] });
      fearWash(d, f);
      openFrown(d, f);
    },
  ],
  ["😟", "worried face", (d) => head(d, 50, 58, 31, { skin: 1, hair: "bun", hairColor: HAIR.brown }, MOODS.worried)],
  [
    "😬",
    "grimacing face",
    (d) => {
      const f = at(50, 54, 34);
      head(d, f.cx, f.cy, f.r, { skin: 2, hair: "spiky", hairColor: HAIR.brown }, { eyes: "dot", brows: "worried", mouth: "none" });
      grimace(d, f);
    },
  ],
  ["😞", "disappointed face", (d) => head(d, 50, 52, 32, { skin: 1, hair: "wavy", hairColor: HAIR.auburn }, { eyes: "closed", brows: "sad", mouth: "frown" })],
  ["😋", "yummy face", (d) => head(d, 50, 54, 34, { skin: 0, hair: "curly", hairColor: HAIR.auburn }, { eyes: "happy", brows: "up", mouth: "yum", extras: ["blush"] })],
  [
    "🤐",
    "zipped mouth",
    (d) => {
      const f = at(50, 54, 34);
      head(d, f.cx, f.cy, f.r, { skin: 3, hair: "short", hairColor: HAIR.brown }, { eyes: "dot", brows: "up", mouth: "none" });
      zipper(d, f);
    },
  ],
  ["😄", "joyful face", (d) => head(d, 46, 55, 31, { skin: 1, hair: "pony", hairColor: HAIR.auburn }, { eyes: "happy", brows: "up", mouth: "laugh", extras: ["blush"] })],
  ["😎", "cool face", (d) => head(d, 50, 54, 34, { skin: 4, hair: "spiky", hairColor: HAIR.black }, { eyes: "dot", brows: "up", mouth: "smile", extras: ["sunglasses"] })],
  [
    "🙈",
    "monkey covering eyes",
    (d) => {
      monkeyHead(d, 50, 50, 30, "smile");
      monkeyHand(d, 35, 53, 9, 35);
      monkeyHand(d, 65, 53, 9, -35, true);
    },
  ],
  ["😮", "surprised face", (d) => head(d, 50, 54, 34, { skin: 0, hair: "short", hairColor: HAIR.red }, { eyes: "wide", brows: "up", mouth: "O" })],
  [
    "😩",
    "weary face",
    (d) => {
      const f = at(50, 56, 30.5);
      head(d, f.cx, f.cy, f.r, { skin: 2, hair: "puffs", hairColor: HAIR.brown }, { eyes: OWN, brows: "worried", mouth: "wail" });
      sadShut(d, f);
    },
  ],
  [
    "🤕",
    "hurt face",
    (d) => {
      const f = at(50, 54, 34);
      head(d, f.cx, f.cy, f.r, { skin: 1, hair: "short", hairColor: HAIR.brown }, { eyes: "sad", brows: "worried", mouth: "wavy", extras: ["bandage"] });
      // A little bandage strip on the cheek too.
      const x = f.cx - f.r * 0.6;
      const y = f.cy + f.r * 0.5;
      d.g(`rotate(-28 ${x} ${y})`, (g) => {
        g.path(rr(x - 8, y - 3.2, 16, 6.4, 3.2), g.fill(P.tan), { sw: 2 });
        g.rect(x - 2.8, y - 3.2, 5.6, 6.4, 1, P.sand[2], { stroke: null, op: 0.7 });
      });
    },
  ],
  [
    "😒",
    "unamused face",
    (d) => {
      const look: Look = { skin: 3, hair: "bun", hairColor: HAIR.black };
      const f = at(50, 58, 31);
      head(d, f.cx, f.cy, f.r, look, { eyes: OWN, brows: "flat", mouth: "none" });
      // Side-eye under heavy lids.
      lookEyes(d, f, skinOf(look), 0.95, 0.3, 0.46, 1.3);
      d.stroke(`M${f.cx - f.mw * 0.6} ${f.my + f.r * 0.06} Q${f.cx + f.mw * 0.2} ${f.my + f.r * 0.02} ${f.cx + f.mw * 0.7} ${f.my + f.r * 0.14}`, { sw: f.sw * 1.15 });
    },
  ],
  [
    "😡",
    "furious face",
    (d) => {
      const f = at(50, 55, 32);
      head(d, f.cx, f.cy, f.r, { skin: 1, hair: "short", hairColor: HAIR.black }, { eyes: "glare", brows: "angry", mouth: "teeth", extras: ["red", "anger"] });
      // Steam blowing out of both ears.
      for (const s of [-1, 1]) puffCloud(d, f.cx + s * f.r * 1.17, f.cy - f.r * 0.12, f.r * 0.13, s * 70);
    },
  ],
  [
    "🥶",
    "freezing face",
    (d) => {
      const f = at(50, 54, 34);
      head(d, f.cx, f.cy, f.r, { skin: 1, hair: "short", hairColor: HAIR.brown }, { eyes: "wide", brows: "worried", mouth: "none", extras: ["cold"] });
      grimace(d, f, 0.95);
      // Shivers.
      for (const s of [-1, 1]) d.stroke(`M${f.cx + s * f.r * 1.13} ${f.cy - f.r * 0.24} q${s * 3} 5 0 10 q${-s * 3} 5 0 10`, { sw: 2.4, color: P.sky[2] });
    },
  ],
  [
    "🤒",
    "sick with a fever",
    (d) => {
      const f = at(46, 54, 33);
      head(d, f.cx, f.cy, f.r, { skin: 2, hair: "curly", hairColor: HAIR.brown }, { eyes: "tired", brows: "worried", mouth: "none", extras: ["sweat"] });
      // Fever-flushed cheeks.
      for (const s of [-1, 1]) d.ellipse(f.cx + s * f.r * 0.6, f.cy + f.r * 0.36, f.r * 0.2, f.r * 0.12, "#ff4d6a", { stroke: null, op: 0.5 });
      // A thermometer in the mouth.
      const x0 = f.cx + 1;
      const y0 = f.my + 3;
      d.ellipse(f.cx, y0, 4.2, 3.6, MOUTH, { sw: 2.4 });
      d.tube(`M${x0} ${y0} L${x0 + 38} ${y0 - 11}`, "#ffffff", 6.5, 2.4);
      d.stroke(`M${x0 + 2} ${y0 - 0.6} L${x0 + 22} ${y0 - 6.4}`, { sw: 2.8, color: P.red[1] });
    },
  ],
  [
    "🤨",
    "raised eyebrow",
    (d) => {
      const f = at(50, 54, 34);
      head(d, f.cx, f.cy, f.r, { skin: 2, hair: "curly", hairColor: HAIR.black }, { eyes: OWN, brows: "none", mouth: "none" });
      // One eye narrowed under a low, flat brow…
      const lid = f.ey - f.er * 0.15;
      d.clip(`M${f.lx - 8} ${lid} H${f.lx + 8} V${f.ey + 10} H${f.lx - 8} Z`, (g) => g.ellipse(f.lx, f.ey + f.er * 0.15, f.er * 0.9, f.er * 1.05, OL, { stroke: null }));
      d.stroke(`M${f.lx - f.er * 1.35} ${lid} H${f.lx + f.er * 1.35}`, { sw: f.sw * 1.1 });
      d.stroke(`M${f.lx - f.er * 1.4} ${f.by + f.er * 0.9} L${f.lx + f.er * 1.3} ${f.by + f.er * 1.25}`, { sw: f.sw * 1.25 });
      // …the other wide open under a brow arched way up.
      d.eye(f.rx, f.ey - f.er * 0.1, f.er * 1.15);
      d.stroke(`M${f.rx - f.er * 1.3} ${f.by + f.er * 0.1} Q${f.rx} ${f.by - f.er * 2.1} ${f.rx + f.er * 1.4} ${f.by - f.er * 0.1}`, { sw: f.sw * 1.25 });
      d.stroke(`M${f.cx - f.mw * 0.6} ${f.my + f.r * 0.12} L${f.cx + f.mw * 0.6} ${f.my + f.r * 0.04}`, { sw: f.sw * 1.15 });
    },
  ],
  [
    "😂",
    "tears of joy",
    (d) => {
      const f = at(50, 54, 34);
      head(d, f.cx, f.cy, f.r, { skin: 2, hair: "short", hairColor: HAIR.black }, { eyes: "happy", brows: "up", mouth: "laugh", extras: ["blush"] });
      flyingTear(d, f.lx - f.er * 2.7, f.ey + f.er * 0.9, 5, 60);
      flyingTear(d, f.rx + f.er * 2.7, f.ey + f.er * 0.9, 5, -60);
    },
  ],
  [
    "😭",
    "sobbing face",
    (d) => {
      const f = at(50, 56, 30.5);
      head(d, f.cx, f.cy, f.r, { skin: 0, hair: "puffs", hairColor: HAIR.auburn }, { eyes: OWN, brows: "sad", mouth: "wail", extras: ["tears"] });
      squeeze(d, f);
    },
  ],
  ["🙂", "slight smile", (d) => head(d, 50, 54, 34, { skin: 0, hair: "short", hairColor: HAIR.brown }, { eyes: "dot", brows: "flat", mouth: "small" })],
  [
    "😖",
    "scrunched-up face",
    (d) => {
      const f = at(50, 54, 34);
      head(d, f.cx, f.cy, f.r, { skin: 1, hair: "spiky", hairColor: HAIR.auburn }, { eyes: OWN, brows: "sad", mouth: "none" });
      squeeze(d, f);
      zigzag(d, f);
    },
  ],
  ["😶", "speechless face", (d) => head(d, 50, 58, 31, { skin: 4, hair: "bun", hairColor: HAIR.black }, { eyes: "dot", brows: "flat", mouth: "none" })],
  ["😌", "relieved face", (d) => head(d, 50, 52, 32, { skin: 2, hair: "wavy", hairColor: HAIR.black }, MOODS.calm)],
  // Upside down, a smile and brows turn into a "beard face"; an open grin stays a mouth.
  ["🙃", "upside-down face", (d) => d.g("rotate(180 50 50)", (g) => head(g, 50, 46, 34, { skin: 0, hair: "short", hairColor: HAIR.blond }, { eyes: "dot", brows: "none", mouth: "laugh", extras: ["blush"] }))],
  [
    "🥵",
    "overheated face",
    (d) => {
      const f = at(50, 59, 30);
      head(d, f.cx, f.cy, f.r, { skin: 1, hair: "curly", hairColor: HAIR.brown }, { eyes: "tired", brows: "worried", mouth: "none", extras: ["red", "hot"] });
      tongueOut(d, f);
      // Heat rising off the head.
      for (const x of [-12, 0, 12]) d.stroke(`M${f.cx + x} ${f.cy - f.r * 1.27} q3 -3 0 -6 q-3 -3 0 -6`, { sw: 2.6, color: P.orange[1] });
    },
  ],
  [
    "😏",
    "smirking face",
    (d) => {
      const look: Look = { skin: 0, hair: "curly", hairColor: HAIR.black };
      const f = at(50, 54, 34);
      head(d, f.cx, f.cy, f.r, look, { eyes: OWN, brows: "raised", mouth: "smirk" });
      lookEyes(d, f, skinOf(look), 0.85, 0.2, 0.42, 1.25);
    },
  ],
  [
    "🙉",
    "monkey covering ears",
    (d) => {
      const r = 28;
      monkeyHead(d, 50, 52, r, "o");
      for (const s of [-1, 1]) d.eye(50 + s * r * 0.3, 52 - r * 0.06, r * 0.14);
      monkeyHand(d, 19, 56, 8.5, 6, true);
      monkeyHand(d, 81, 56, 8.5, -6);
    },
  ],
  [
    "😅",
    "phew face",
    (d) => {
      const f = at(50, 56, 30.5);
      head(d, f.cx, f.cy, f.r, { skin: 3, hair: "puffs", hairColor: HAIR.black }, { eyes: "happy", brows: "worried", mouth: "laugh", extras: ["blush"] });
      sweat(d, f.cx + f.r * 0.72, f.cy - f.r * 0.42, f.r * 0.19);
    },
  ],
  [
    "😳",
    "embarrassed face",
    (d) => {
      const f = at(50, 54, 34);
      head(d, f.cx, f.cy, f.r, { skin: 0, hair: "curly", hairColor: HAIR.brown }, { eyes: "wide", brows: "up", mouth: "none" });
      for (const s of [-1, 1]) d.ellipse(f.cx + s * f.r * 0.6, f.cy + f.r * 0.4, f.r * 0.22, f.r * 0.14, "#ff4d6a", { stroke: null, op: 0.55 });
      d.stroke(`M${f.cx - f.mw * 0.4} ${f.my + f.r * 0.06} H${f.cx + f.mw * 0.4}`, { sw: f.sw * 1.1 });
    },
  ],
  [
    "😓",
    "downcast face with sweat",
    (d) => {
      const f = at(50, 54, 34);
      head(d, f.cx, f.cy, f.r, { skin: 4, hair: "short", hairColor: HAIR.black }, { eyes: "closed", brows: "sad", mouth: "frown" });
      sweat(d, f.cx - f.r * 0.62, f.cy - f.r * 0.3, f.r * 0.17);
    },
  ],
  [
    "😵",
    "dizzy face",
    (d) => {
      const f = at(50, 60, 30);
      head(d, f.cx, f.cy, f.r, { skin: 1, hair: "spiky", hairColor: HAIR.brown }, { eyes: OWN, brows: "none", mouth: "wavy" });
      spirals(d, f);
      // Stars circling the head.
      d.ellipse(50, 18, 27, 7, "none", { sw: 2, stroke: P.gold[2], dash: "4 4" });
      for (const [x, y, s] of [[25, 19, 6], [51, 12.5, 5], [76, 20, 6.5]]) d.path(star(x, y, s), d.fill(P.gold), { sw: 2 });
    },
  ],
  [
    "😁",
    "beaming face",
    (d) => {
      const f = at(48, 58, 27.5);
      head(d, f.cx, f.cy, f.r, { skin: 2, hair: "afro", hairColor: HAIR.black }, { eyes: "happy", brows: "up", mouth: "none", extras: ["blush"] });
      teethGrin(d, f);
    },
  ],
  [
    "🙊",
    "monkey covering mouth",
    (d) => {
      const r = 30;
      monkeyHead(d, 50, 47, r, "none");
      for (const s of [-1, 1]) d.eye(50 + s * r * 0.3, 47 - r * 0.06, r * 0.16);
      monkeyHand(d, 36, 67, 9, 72);
      monkeyHand(d, 64, 69, 9, -72, true);
    },
  ],
  [
    "😫",
    "tired face",
    (d) => {
      const f = at(50, 52, 32);
      head(d, f.cx, f.cy, f.r, { skin: 3, hair: "wavy", hairColor: HAIR.blond }, { eyes: OWN, brows: "worried", mouth: "wail" });
      squeeze(d, f);
    },
  ],
  ["😇", "angel face", (d) => head(d, 50, 58, 30, { skin: 1, hair: "curly", hairColor: HAIR.blond }, { eyes: "happy", brows: "up", mouth: "smile", extras: ["blush", "halo"] })],
  ["😐", "straight face", (d) => head(d, 50, 54, 34, { skin: 1, hair: "short", hairColor: HAIR.auburn }, MOODS.neutral)],
  [
    "👻",
    "ghost",
    (d) => {
      d.shadow(50, 94, 21, 3, 0.14);
      d.g("translate(3 2) scale(0.94) rotate(-6 50 50)", (g) => {
        // Little arms up: "boo!"
        g.ellipse(14, 47, 5.5, 9.5, g.fill(P.white), { sw: 3, tf: "rotate(-38 14 47)" });
        g.ellipse(86, 47, 5.5, 9.5, g.fill(P.white), { sw: 3, tf: "rotate(38 86 47)" });
        g.path("M18 48 C18 26 32 10 50 10 C68 10 82 26 82 48 L82 80 Q82 90 74 90 Q66 90 66 81 Q66 90 58 90 Q50 90 50 81 Q50 90 42 90 Q34 90 34 81 Q34 90 26 90 Q18 90 18 80 Z", g.fill(P.white), { sw: 3.5 });
        g.shine(33, 24, 8, 4.5, 0.9, -30);
        g.eye(40, 42, 5.5);
        g.eye(60, 42, 5.5);
        g.path("M43 52 Q50 54 57 52 Q56 62 50 62 Q44 62 43 52 Z", MOUTH, { sw: 2.5 });
        g.path("M46 59 Q50 56 54 59 Q50 62 46 59 Z", TONGUE, { stroke: null });
        g.cheek(31, 51, 4.5);
        g.cheek(69, 51, 4.5);
      });
    },
  ],
  [
    "😃",
    "big smile",
    (d) => {
      const f = at(46, 55, 31);
      head(d, f.cx, f.cy, f.r, { skin: 0, hair: "pony", hairColor: HAIR.blond }, { eyes: OWN, brows: "up", mouth: "laugh" });
      for (const s of [-1, 1]) d.eye(s < 0 ? f.lx : f.rx, f.ey - f.er * 0.15, f.er * 1.4);
    },
  ],
  [
    "🥱",
    "yawning face",
    (d) => {
      const f = at(47, 47, 31);
      head(d, f.cx, f.cy, f.r, { skin: 4, hair: "short", hairColor: HAIR.black }, { eyes: "closed", brows: "flat", mouth: "none" });
      // A huge yawn, a sleepy tear, and a polite hand.
      d.ellipse(f.cx, f.my + f.r * 0.14, f.r * 0.22, f.r * 0.3, MOUTH, { sw: f.sw });
      d.ellipse(f.cx, f.my + f.r * 0.33, f.r * 0.13, f.r * 0.08, TONGUE, { stroke: null });
      d.path(drop(f.lx - f.er * 1.6, f.ey + f.er * 1.4, 2.4), d.fill(P.sky), { sw: 1.6 });
      hand(d, f.cx + f.r * 0.8, f.my + f.r * 0.52, 7.8, -62, { skin: 4, back: true });
    },
  ],
  [
    "🤪",
    "silly face",
    (d) => {
      const f = at(48, 56, 30);
      d.g("rotate(8 48 56)", (g) => {
        head(g, f.cx, f.cy, f.r, { skin: 0, hair: "puffs", hairColor: HAIR.red }, { eyes: OWN, brows: "none", mouth: "none" });
        // One big googly eye, one little one; brows all over the place.
        g.circle(f.lx, f.ey - 1, f.er * 1.65, "#fff", { sw: f.sw * 0.9 });
        g.circle(f.lx + 1.5, f.ey + 0.5, f.er * 0.6, OL, { stroke: null });
        g.eye(f.rx, f.ey + 1, f.er * 0.75);
        g.stroke(`M${f.lx - f.er * 1.4} ${f.by - f.er * 0.7} Q${f.lx} ${f.by - f.er * 2} ${f.lx + f.er * 1.4} ${f.by - f.er * 0.9}`, { sw: f.sw });
        g.stroke(`M${f.rx - f.er * 1.1} ${f.by + f.er * 0.7} L${f.rx + f.er * 1.1} ${f.by + f.er * 0.2}`, { sw: f.sw });
        tongueOut(g, f, 0.9, 0.3);
      });
    },
  ],
  [
    "😱",
    "screaming face",
    (d) => {
      const f = at(50, 47, 30);
      head(d, f.cx, f.cy, f.r, { skin: 1, hair: "short", hairColor: HAIR.blond }, { eyes: OWN, brows: "worried", mouth: "none" });
      fearWash(d, f);
      shockEyes(d, f);
      d.ellipse(f.cx, f.my + f.r * 0.16, f.r * 0.16, f.r * 0.3, MOUTH, { sw: f.sw });
      // Hands pressed to the cheeks.
      hand(d, f.cx - f.r * 0.95, f.cy + f.r * 0.72, 8.5, 14, { skin: 1, back: true, left: true });
      hand(d, f.cx + f.r * 0.95, f.cy + f.r * 0.72, 8.5, -14, { skin: 1, back: true });
    },
  ],
  [
    "😣",
    "struggling face",
    (d) => {
      const f = at(50, 52, 32);
      head(d, f.cx, f.cy, f.r, { skin: 3, hair: "wavy", hairColor: HAIR.black }, { eyes: OWN, brows: "sad", mouth: "none" });
      squeeze(d, f);
      // A tight, wobbly frown.
      d.stroke(`M${f.cx - f.mw * 0.62} ${f.my + f.r * 0.18} Q${f.cx - f.mw * 0.32} ${f.my - f.r * 0.02} ${f.cx} ${f.my + f.r * 0.07} Q${f.cx + f.mw * 0.32} ${f.my - f.r * 0.02} ${f.cx + f.mw * 0.62} ${f.my + f.r * 0.18}`, { sw: f.sw * 1.15 });
    },
  ],
  [
    "💀",
    "skull",
    (d) => {
      d.path("M50 10 C73 10 87 26 87 46 C87 59 80 67 73 70 L73 82 Q73 90 65 90 L35 90 Q27 90 27 82 L27 70 C20 67 13 59 13 46 C13 26 27 10 50 10 Z", d.fill(P.cream), { sw: 3.5 });
      d.shine(31, 24, 9, 5, 0.9, -30);
      // Big round sockets with a friendly glint.
      for (const s of [-1, 1]) {
        d.ellipse(50 + s * 15, 47, 10, 11.5, d.fill(P.ink), { sw: 2.6 });
        d.circle(50 + s * 15 - 3.5, 42.5, 3, "#fff", { stroke: null });
        d.circle(50 + s * 15 + 3, 50.5, 1.4, "#fff", { stroke: null });
      }
      d.path("M50 59 Q45 66 47 68 Q49 69 50 66.5 Q51 69 53 68 Q55 66 50 59 Z", d.fill(P.ink), { sw: 1.8 });
      d.stroke("M33 76 Q50 81 67 76", { sw: 2.6 });
      d.stroke("M40 77.5 V87 M50 78.6 V89 M60 77.5 V87", { sw: 2.2 });
    },
  ],
  [
    "🤧",
    "sneezing face",
    (d) => {
      const f = at(47, 46, 30);
      head(d, f.cx, f.cy, f.r, { skin: 0, hair: "short", hairColor: HAIR.red }, { eyes: OWN, brows: "worried", mouth: "none" });
      squeeze(d, f, 0.9);
      // A hand holding a tissue to the nose… achoo!
      hand(d, f.cx + 13, f.cy + f.r * 1.12, 7.5, -12, { skin: 0, fingers: ["bend", "bend", "bend", "bend"], thumb: "up" });
      const tx = f.cx + 3;
      const ty = f.cy + f.r * 0.42;
      d.path(lumpy(tx, ty, 14, 10.5, 9, 0.12, 5), d.fill(P.white), { sw: 2.6 });
      d.stroke(`M${tx - 7} ${ty + 1} Q${tx - 1} ${ty - 3} ${tx + 6} ${ty + 2}`, { sw: 1.6, color: P.white[2] });
      for (const [x1, y1, x2, y2] of [[tx + 17, ty - 6, tx + 23, ty - 10], [tx + 18.5, ty + 1, tx + 25, ty + 1], [tx + 17, ty + 8, tx + 23, ty + 12]]) d.stroke(`M${x1} ${y1} L${x2} ${y2}`, { sw: 2.6, color: P.sky[2] });
    },
  ],
  [
    "🥳",
    "party face",
    (d) => {
      const f = at(46, 62, 28);
      head(d, f.cx, f.cy, f.r, { skin: 3, hair: "puffs", hairColor: HAIR.black }, { eyes: "happy", brows: "up", mouth: "none", extras: ["blush", "partyhat"] });
      // A party horn.
      const x0 = f.cx + 1;
      const y0 = f.my + 3;
      d.ellipse(f.cx, y0, 3.6, 3, MOUTH, { sw: 2.2 });
      const cone = `M${x0} ${y0 - 1.6} L${x0 + 25} ${y0 - 8} L${x0 + 28} ${y0 + 5} Z`;
      d.path(cone, d.fill(P.gold, "v"), { sw: 2.4 });
      d.clip(cone, (g) => g.stroke(`M${x0 + 9} ${y0 - 8} L${x0 + 12} ${y0 + 6} M${x0 + 18} ${y0 - 10} L${x0 + 21} ${y0 + 8}`, { sw: 2.6, color: P.pink[1] }));
      d.ellipse(x0 + 26.5, y0 - 1.5, 2.8, 6.8, d.fill(P.pink), { sw: 2.2 });
      // Confetti.
      const bits: [number, number, readonly [string, string, string], number][] = [[13, 17, P.pink, 20], [86, 22, P.sky, -30], [89, 50, P.lime, 40], [12, 72, P.violet, 10], [85, 89, P.gold, -20], [76, 10, P.lime, 60]];
      for (const [x, y, c, a] of bits) d.path(rr(x - 3.2, y - 1.7, 6.4, 3.4, 1.2), c[1], { sw: 1.6, tf: `rotate(${a} ${x} ${y})` });
    },
  ],
  [
    "🥺",
    "pleading face",
    (d) => {
      const f = at(50, 54, 34);
      head(d, f.cx, f.cy, f.r, { skin: 4, hair: "curly", hairColor: HAIR.black }, { eyes: OWN, brows: "worried", mouth: "none", extras: ["blush"] });
      puppyEyes(d, f);
      d.stroke(`M${f.cx - f.mw * 0.4} ${f.my + f.r * 0.13} Q${f.cx} ${f.my - f.r * 0.02} ${f.cx + f.mw * 0.4} ${f.my + f.r * 0.13}`, { sw: f.sw * 1.1 });
    },
  ],
  [
    "😜",
    "silly wink",
    (d) => {
      const f = at(45, 55, 30.5);
      d.g("rotate(-6 45 55)", (g) => {
        head(g, f.cx, f.cy, f.r, { skin: 4, hair: "pony", hairColor: HAIR.black }, { eyes: OWN, brows: "up", mouth: "none" });
        g.eye(f.lx, f.ey - 0.5, f.er * 1.3);
        g.stroke(`M${f.rx - f.er * 1.1} ${f.ey + f.er * 0.3} Q${f.rx} ${f.ey - f.er * 1.2} ${f.rx + f.er * 1.1} ${f.ey + f.er * 0.3}`, { sw: f.sw * 1.15 });
        tongueOut(g, f, 0.9, 0.35);
      });
    },
  ],
  [
    "😝",
    "tongue out",
    (d) => {
      const f = at(50, 54, 34);
      head(d, f.cx, f.cy, f.r, { skin: 2, hair: "short", hairColor: HAIR.blond }, { eyes: OWN, brows: "up", mouth: "none", extras: ["blush"] });
      squeeze(d, f);
      tongueOut(d, f, 1.05);
    },
  ],
  [
    "👾",
    "pixel alien",
    (d) => {
      const rows = ["..X.....X..", "...X...X...", "..XXXXXXX..", ".XXXXXXXXX.", "XXXXXXXXXXX", "X.XXXXXXX.X", "X.X.....X.X", "...XX.XX..."];
      const c = 7.3;
      const x0 = 50 - 5.5 * c;
      const y0 = 50 - 4 * c;
      let p = "";
      rows.forEach((row, j) => [...row].forEach((ch, i) => {
        if (ch === "X") p += `M${x0 + i * c} ${y0 + j * c} h${c} v${c} h${-c} Z `;
      }));
      d.path(p, "none", { sw: 4.6 });
      d.path(p, d.fill(P.violet), { stroke: null });
      for (const i of [3, 7]) {
        d.rect(x0 + i * c, y0 + 3 * c, c, c, 0, OL, { stroke: null });
        d.rect(x0 + i * c + 1.3, y0 + 3 * c + 1.3, 2.6, 2.6, 0, "#fff", { stroke: null });
      }
      d.rect(x0 + 2 * c + 1.5, y0 + 2 * c + 1.5, c * 1.5, 2.4, 0, "#fff", { stroke: null, op: 0.6 });
    },
  ],
  ["😀", "grinning face", (d) => head(d, 50, 54, 34, { skin: 1, hair: "curly", hairColor: HAIR.brown }, { eyes: "dot", brows: "up", mouth: "laugh" })],
  [
    "🤩",
    "star-struck face",
    (d) => {
      head(d, 50, 55, 33, { skin: 3, hair: "short", hairColor: HAIR.auburn }, { eyes: "star", brows: "up", mouth: "laugh" });
      d.sparkle(84, 22, 7.5);
      d.sparkle(15, 32, 5);
    },
  ],
  [
    "🤡",
    "clown",
    (d) => {
      // A rainbow ring of curly puffs.
      const cols = [P.red, P.orange, P.gold, P.lime, P.sky, P.violet, P.pink];
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * (1 + i / 8);
        d.circle(50 + Math.cos(a) * 32, 55 + Math.sin(a) * 33, 9.6, d.fill(cols[i % cols.length]), { sw: 2.6 });
      }
      // White face paint, diamond eyes, a red nose and a huge red smile.
      d.ellipse(50, 56, 29, 31, d.fill(P.white), { sw: 3.5 });
      d.shine(37, 35, 8, 4, 0.9);
      for (const s of [-1, 1]) {
        const x = 50 + s * 12;
        d.path(`M${x} 37 L${x + 5.2} 49 L${x} 61 L${x - 5.2} 49 Z`, d.fill(P.sky), { sw: 2 });
        d.eye(x, 49, 4.4);
        d.stroke(`M${x - 6} 33 Q${x} 28 ${x + 6} 33`, { sw: 2.6 });
      }
      d.path("M30 66 Q50 92 70 66 Q66 64 63 68 Q50 80 37 68 Q34 64 30 66 Z", d.fill(P.red), { sw: 2.8 });
      d.stroke("M37 69 Q50 80 63 69", { sw: 2.4 });
      d.ball(50, 61, 7.5, P.red);
    },
  ],
  ["🤠", "cowboy face", (d) => head(d, 50, 60, 30, { skin: 2, hair: "short", hairColor: HAIR.brown }, { eyes: "dot", brows: "up", mouth: "grin", extras: ["blush", "cowboy"] })],
  [
    "💩",
    "poop",
    (d) => {
      d.shadow(50, 93, 34, 4);
      for (const t of [
        "M14 77 Q14 63 29 63 H71 Q86 63 86 77 Q86 91 71 91 H29 Q14 91 14 77 Z",
        "M22 59 Q22 46 35 46 H65 Q78 46 78 59 Q78 71 65 71 H35 Q22 71 22 59 Z",
        "M31 42 Q31 31 42 31 H58 Q69 31 69 42 Q69 53 58 53 H42 Q31 53 31 42 Z",
        "M41 34 Q41 21 53 15 Q57 13 57 9 Q64 16 61 25 Q59 31 61 35 Z",
      ])
        d.path(t, d.fill(P.brown), { sw: 3 });
      d.shine(40, 36, 5, 2.5, 0.5, -20);
      d.shine(28, 51, 4, 2, 0.4, -20);
      // A happy face.
      for (const x of [39, 61]) {
        d.ellipse(x, 57, 6, 7, "#fff", { sw: 2.4 });
        d.ellipse(x + 1, 58, 3.4, 4, OL, { stroke: null });
        d.circle(x, 56.5, 1.3, "#fff", { stroke: null });
      }
      d.path("M40 72 Q50 74 60 72 Q58 83 50 83 Q42 83 40 72 Z", MOUTH, { sw: 2.4 });
      d.path("M44 79 Q50 75 56 79 Q50 83 44 79 Z", TONGUE, { stroke: null });
    },
  ],
  [
    "🤯",
    "mind blown",
    (d) => {
      const f = at(50, 65, 26);
      // BOOM, bursting up out of the head.
      d.path(star(50, 36, 28, 16, 12), d.fill(P.orange), { sw: 3 });
      d.path(star(50, 37, 17, 10, 12, 15), d.fill(P.gold), { sw: 2.4 });
      head(d, f.cx, f.cy, f.r, { skin: 1, hair: "short", hairColor: HAIR.brown }, { eyes: "wide", brows: "up", mouth: "O" });
      for (const s of [-1, 1]) d.stroke(`M${50 + s * 32} 55 L${50 + s * 40} 50 M${50 + s * 33} 66 L${50 + s * 42} 67`, { sw: 2.8, color: P.orange[2] });
    },
  ],
  [
    "🥰",
    "loving face",
    (d) => {
      head(d, 50, 58, 30, { skin: 4, hair: "bun", hairColor: HAIR.black }, { eyes: "happy", brows: "up", mouth: "smile", extras: ["blush"] });
      for (const [x, y, s] of [[17, 26, 7.5], [82, 22, 8.5], [86, 52, 5.5]]) {
        d.path(heart(x, y, s), d.fill(P.red), { sw: 2.4 });
        d.shine(x - s * 0.45, y - s * 0.35, s * 0.22, s * 0.12, 0.7, -35);
      }
    },
  ],
  [
    "👽",
    "friendly alien",
    (d) => {
      d.path("M50 9 C74 9 88 25 88 45 C88 64 67 88 50 91 C33 88 12 64 12 45 C12 25 26 9 50 9 Z", d.fill(P.lime), { sw: 3.5 });
      d.shine(30, 23, 11, 5, 0.55, -30);
      const eye = (g: Pen) => {
        g.path("M19 44 Q32 37 45 52 Q46 63 37 63 Q21 59 19 44 Z", g.fill(P.ink), { sw: 2.6 });
        g.ellipse(29, 47, 4.2, 2.6, "#fff", { stroke: null, op: 0.9, tf: "rotate(25 29 47)" });
        g.circle(39, 57, 1.6, "#fff", { stroke: null });
      };
      eye(d);
      d.mirror(50, eye);
      for (const s of [-1, 1]) d.circle(50 + s * 2.6, 67, 1.1, P.lime[2], { stroke: null });
      d.smile(50, 74, 11, 2.6);
      d.cheek(25, 67, 4);
      d.cheek(75, 67, 4);
    },
  ],
];
