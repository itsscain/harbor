// Living pets: the friend who rides on a child's boat. Each pet is a drawing in the house style
// (navy outline, light from the top-left, a white shine) built from named PARTS that the page
// animates — it breathes, blinks, looks around, wags, cheers when its sailor gets an answer right,
// tilts its head kindly on a miss, dozes at night and does a trick when it's tapped.
//
// THE RIG (every pet follows it — see `parrot` in a.ts for a full example):
// • Board 100×100. The pet sits facing the viewer (a little turned to the right is nice), its
//   base (feet / bottom) on y ≈ 92, centered on x = 50, filling about 12..88 across.
// • Draw with `d.part(name, pivotX, pivotY, fn)`. The pivot is the joint the part turns around.
//   Parts may nest (eyes and mouth go INSIDE head). Names:
//     body   — the torso (pivot: bottom middle). Breathes.
//     head   — everything on the head (pivot: the neck). Looks around, tilts, nods.
//     eyes   — open eyes (pivot: between the eyes). Blinks.       ┐ all four are REQUIRED,
//     happy  — closed happy eyes "^ ^" (hidden until a cheer).     │ drawn at the same spots
//     sleep  — closed sleepy eyes (hidden until night).            │ (helpers below)
//     mouth  — the resting mouth / closed beak.                    │
//     open   — an open happy mouth / open beak (cheer, roar).      ┘
//     armL / armR — arms, wings, flippers, fins, claws: L = the picture's left side (pivot: the
//                   shoulder). A cheer swings armL up by turning it +115°, armR by −115°.
//     earL / earR — ears, horns, antennae, a crest (pivot: the base). Twitch and droop.
//     tail   — (pivot: where it joins the body). Wags ±10°.
//     feet   — legs/feet (optional, no motion of their own).
//     extra  — one more thing that wiggles gently (tentacles, a horn's sparkle, whiskers).
// • Draw order = layering: tail first (behind), then feet, body, arms, head on top.
// • Parts must still look attached when turned: draw each limb so its base tucks under the body
//   (overlap a little), and turn around that base.
// • `node scripts/learn-art.mjs pets` renders every pet in its poses (idle, blink, cheer, oops,
//   sleep and its tricks) — check that nothing detaches or pokes off the board.

import type { PetVoice } from "@/lib/learn/sfx";
import { OL, type Pen } from "../../art/pen";

export type Trick = "spin" | "flip" | "jump" | "flap" | "wave" | "dance" | "shake" | "roar" | "hide" | "bounce";
export type { PetVoice };
export type PetRig = {
  id: string;
  /** The sound it makes when tapped. */
  voice: PetVoice;
  /** Its tricks (2–3), played in turn when tapped. */
  tricks: Trick[];
  draw: (d: Pen) => void;
};

const f = (n: number) => Math.round(n * 100) / 100;

/** Open eyes: dark ovals with a sparkle (r ≈ 3–5). */
export function eyesOpen(d: Pen, lx: number, ly: number, rx: number, ry: number, r: number) {
  d.part("eyes", (lx + rx) / 2, (ly + ry) / 2, (g) => {
    g.eye(lx, ly, r);
    g.eye(rx, ry, r);
  });
}
/** Happy closed eyes "^ ^" at the same spots. */
export function eyesHappy(d: Pen, lx: number, ly: number, rx: number, ry: number, r: number, sw = 2.6) {
  d.part("happy", (lx + rx) / 2, (ly + ry) / 2, (g) => {
    for (const [x, y] of [[lx, ly], [rx, ry]])
      g.stroke(`M${f(x - r)} ${f(y + r * 0.35)} Q${f(x)} ${f(y - r * 1.05)} ${f(x + r)} ${f(y + r * 0.35)}`, { sw, cap: "round" });
  });
}
/** Sleepy closed eyes (a soft downward curve) at the same spots. */
export function eyesSleep(d: Pen, lx: number, ly: number, rx: number, ry: number, r: number, sw = 2.6) {
  d.part("sleep", (lx + rx) / 2, (ly + ry) / 2, (g) => {
    for (const [x, y] of [[lx, ly], [rx, ry]])
      g.stroke(`M${f(x - r)} ${f(y - r * 0.1)} Q${f(x)} ${f(y + r * 0.85)} ${f(x + r)} ${f(y - r * 0.1)}`, { sw, cap: "round" });
  });
}
/** All three eye sets at once (open, happy, sleepy). */
export function allEyes(d: Pen, lx: number, ly: number, rx: number, ry: number, r: number) {
  eyesOpen(d, lx, ly, rx, ry, r);
  eyesHappy(d, lx, ly, rx, ry, r);
  eyesSleep(d, lx, ly, rx, ry, r);
}
/** A small smile (the resting mouth). */
export function mouthSmile(d: Pen, cx: number, cy: number, w: number, sw = 2.4) {
  d.part("mouth", cx, cy, (g) => g.smile(cx, cy, w, sw));
}
/** An open happy mouth: a dark rounded "D" with a pink tongue. */
export function mouthOpen(d: Pen, cx: number, cy: number, w: number, sw = 2.2) {
  d.part("open", cx, cy, (g) => {
    const h = w * 0.62;
    const shape = `M${f(cx - w / 2)} ${f(cy - h * 0.12)} Q${f(cx)} ${f(cy - h * 0.32)} ${f(cx + w / 2)} ${f(cy - h * 0.12)} Q${f(cx + w * 0.42)} ${f(cy + h)} ${f(cx)} ${f(cy + h)} Q${f(cx - w * 0.42)} ${f(cy + h)} ${f(cx - w / 2)} ${f(cy - h * 0.12)} Z`;
    g.path(shape, "#7a2b3a", { sw });
    g.clip(shape, (c) => c.ellipse(cx, cy + h * 0.95, w * 0.3, h * 0.42, "#ff8fa8", { stroke: null }));
    g.path(shape, "none", { sw });
  });
}
/** Both mouths (smile + open) for a pet with a plain mouth. */
export function bothMouths(d: Pen, cx: number, cy: number, w: number) {
  mouthSmile(d, cx, cy, w);
  mouthOpen(d, cx, cy + 0.5, w * 0.95);
}
/** Little claws / toes along the bottom of a foot (3 bumps). */
export function toes(d: Pen, cx: number, cy: number, w: number) {
  for (const k of [-1, 0, 1]) d.line(cx + k * w * 0.3, cy - w * 0.18, cx + k * w * 0.3, cy + w * 0.02, { sw: 1.6, color: OL });
}
