// The people in Harbor Learn: one cast drawn from parts, so every kid, grown-up and Bible hero
// shares a look — a big round head, dot eyes with a sparkle, rosy cheeks, simple hair shapes —
// and every feeling is the same face with a different expression. Hands and whole bodies are
// built from the same pieces (thick outlined "tubes" for fingers, arms and legs).

import { HAIR, OL, P, SKIN, cloudPath, drop, heart, lumpy, rr, star, type Pen, type Ramp } from "./pen";

export type HairStyle = "short" | "spiky" | "curly" | "afro" | "long" | "pony" | "bun" | "braids" | "bald" | "wavy" | "puffs" | "baby" | "headcloth" | "none";
/** "none" = the picture draws its own eyes. */
export type Eyes = "dot" | "happy" | "closed" | "wide" | "wink" | "up" | "side" | "heart" | "star" | "x" | "sad" | "squint" | "teary" | "angry" | "tired" | "glare" | "none";
export type Brows = "none" | "up" | "sad" | "angry" | "worried" | "raised" | "flat";
export type Mouth = "smile" | "grin" | "laugh" | "frown" | "o" | "O" | "flat" | "wavy" | "teeth" | "tongue" | "smirk" | "small" | "wail" | "zip" | "yum" | "none" | "pout" | "kiss" | "yawn" | "shh";
export type Extra = "blush" | "tear" | "tears" | "sweat" | "zzz" | "steam" | "red" | "cold" | "hot" | "sick" | "bandage" | "halo" | "partyhat" | "sunglasses" | "glasses" | "cowboy" | "crown" | "anger" | "sparkles";

export type Expr = { eyes?: Eyes; brows?: Brows; mouth?: Mouth; extras?: Extra[] };

/** Feelings → expressions (the faces category and every scene use these). */
export const MOODS = {
  happy: { eyes: "dot", brows: "up", mouth: "smile", extras: ["blush"] },
  joy: { eyes: "happy", brows: "up", mouth: "grin", extras: ["blush"] },
  laugh: { eyes: "squint", brows: "up", mouth: "laugh", extras: ["blush"] },
  calm: { eyes: "closed", brows: "flat", mouth: "smile", extras: ["blush"] },
  sad: { eyes: "sad", brows: "sad", mouth: "frown" },
  cry: { eyes: "sad", brows: "sad", mouth: "frown", extras: ["tear"] },
  sob: { eyes: "squint", brows: "sad", mouth: "wail", extras: ["tears"] },
  angry: { eyes: "angry", brows: "angry", mouth: "frown", extras: ["anger"] },
  mad: { eyes: "glare", brows: "angry", mouth: "teeth", extras: ["red", "steam"] },
  surprised: { eyes: "wide", brows: "up", mouth: "o" },
  shock: { eyes: "wide", brows: "worried", mouth: "O", extras: ["sweat"] },
  worried: { eyes: "dot", brows: "worried", mouth: "wavy", extras: ["sweat"] },
  scared: { eyes: "wide", brows: "worried", mouth: "teeth", extras: ["sweat"] },
  sleepy: { eyes: "closed", brows: "flat", mouth: "small", extras: ["zzz"] },
  bored: { eyes: "tired", brows: "flat", mouth: "flat" },
  think: { eyes: "side", brows: "raised", mouth: "smirk" },
  confused: { eyes: "dot", brows: "raised", mouth: "wavy" },
  love: { eyes: "heart", brows: "up", mouth: "grin", extras: ["blush"] },
  shy: { eyes: "closed", brows: "worried", mouth: "small", extras: ["blush"] },
  neutral: { eyes: "dot", brows: "flat", mouth: "flat" },
  proud: { eyes: "closed", brows: "up", mouth: "smile", extras: ["blush", "sparkles"] },
  sick: { eyes: "tired", brows: "worried", mouth: "wavy", extras: ["sick"] },
  eyeroll: { eyes: "up", brows: "flat", mouth: "flat" },
  wink: { eyes: "wink", brows: "up", mouth: "tongue" },
} satisfies Record<string, Expr>;
export type Mood = keyof typeof MOODS;

export type Look = {
  skin?: number;
  hair?: HairStyle;
  hairColor?: Ramp;
  beard?: Ramp | null;
  /** A shirt / robe ramp for busts and bodies. */
  shirt?: Ramp;
};

const sk = (i = 1): Ramp => SKIN[Math.max(0, Math.min(SKIN.length - 1, i))];

// ── Heads ─────────────────────────────────────────────────────────────────────────────────────
/** A whole head (back hair, ears, face, front hair, expression, extras), centered at (cx, cy). */
export function head(d: Pen, cx: number, cy: number, r: number, look: Look = {}, expr: Expr = MOODS.happy) {
  const skin = expr.extras?.includes("red") ? (["#ffb3a0", "#ff7f6a", "#d9483a"] as Ramp) : expr.extras?.includes("cold") ? (["#d9f1ff", "#9fd3f5", "#5f9ccc"] as Ramp) : expr.extras?.includes("sick") ? (["#e6f5c9", "#bfdc8f", "#8bab5a"] as Ramp) : sk(look.skin);
  const hairC = look.hairColor ?? HAIR.brown;
  const style = look.hair ?? "short";
  hairBack(d, cx, cy, r, style, hairC);
  // Ears.
  if (style !== "headcloth") {
    for (const s of [-1, 1]) {
      d.circle(cx + s * r * 0.96, cy + r * 0.12, r * 0.2, d.fill(skin), { sw: Math.max(2, r * 0.09) });
      d.stroke(`M${cx + s * r * 0.97} ${cy + r * 0.05} q${s * r * 0.06} ${r * 0.07} 0 ${r * 0.14}`, { sw: Math.max(1.4, r * 0.05), color: skin[2] });
    }
  }
  // Face.
  d.ellipse(cx, cy, r, r * 1.0, d.fill(skin), { sw: Math.max(2.2, r * 0.1) });
  if (look.beard) beard(d, cx, cy, r, look.beard);
  hairFront(d, cx, cy, r, style, hairC);
  face(d, cx, cy, r, expr, !!look.beard);
  extras(d, cx, cy, r, expr.extras ?? [], skin);
}

function hairBack(d: Pen, cx: number, cy: number, r: number, style: HairStyle, c: Ramp) {
  const sw = Math.max(2.2, r * 0.1);
  const fill = d.fill(c, "v");
  if (style === "long" || style === "wavy") {
    const low = style === "long" ? r * 1.55 : r * 1.1;
    d.path(`M${cx - r * 1.12} ${cy - r * 0.1} Q${cx - r * 1.3} ${cy + low * 0.6} ${cx - r * 1.05} ${cy + low} Q${cx} ${cy + low * 1.12} ${cx + r * 1.05} ${cy + low} Q${cx + r * 1.3} ${cy + low * 0.6} ${cx + r * 1.12} ${cy - r * 0.1} Q${cx + r * 1.1} ${cy - r * 1.25} ${cx} ${cy - r * 1.22} Q${cx - r * 1.1} ${cy - r * 1.25} ${cx - r * 1.12} ${cy - r * 0.1} Z`, fill, { sw });
  } else if (style === "afro") {
    d.path(lumpy(cx, cy - r * 0.18, r * 1.42, r * 1.3, 12, 0.07, 3), fill, { sw });
  } else if (style === "braids") {
    for (const s of [-1, 1]) {
      const x = cx + s * r * 1.02;
      for (let i = 0; i < 3; i++) d.ellipse(x, cy + r * (0.55 + i * 0.42), r * 0.2, r * 0.25, fill, { sw: sw * 0.8 });
      d.circle(x, cy + r * 1.8, r * 0.12, d.fill(P.pink), { sw: sw * 0.7 });
    }
  } else if (style === "pony") {
    d.path(`M${cx + r * 0.7} ${cy - r * 0.75} Q${cx + r * 1.7} ${cy - r * 0.6} ${cx + r * 1.45} ${cy + r * 0.6} Q${cx + r * 1.3} ${cy + r * 0.05} ${cx + r * 0.9} ${cy - r * 0.2} Z`, fill, { sw });
  } else if (style === "bun") {
    d.circle(cx, cy - r * 1.12, r * 0.42, fill, { sw });
  } else if (style === "puffs") {
    for (const s of [-1, 1]) d.path(lumpy(cx + s * r * 0.92, cy - r * 0.78, r * 0.42, r * 0.4, 8, 0.1, s + 4), fill, { sw });
  } else if (style === "headcloth") {
    // A cloth over the head that falls to the shoulders (Bible times).
    d.path(`M${cx - r * 1.2} ${cy + r * 1.5} Q${cx - r * 1.35} ${cy - r * 0.2} ${cx - r * 0.95} ${cy - r * 0.95} Q${cx} ${cy - r * 1.55} ${cx + r * 0.95} ${cy - r * 0.95} Q${cx + r * 1.35} ${cy - r * 0.2} ${cx + r * 1.2} ${cy + r * 1.5} Z`, fill, { sw });
  }
}

function hairFront(d: Pen, cx: number, cy: number, r: number, style: HairStyle, c: Ramp) {
  const sw = Math.max(2.2, r * 0.1);
  const fill = d.fill(c, "v");
  const top = cy - r * 1.02;
  switch (style) {
    case "bald":
    case "none":
      if (style === "bald") for (const s of [-1, 1]) d.path(`M${cx + s * r * 0.98} ${cy - r * 0.05} Q${cx + s * r * 1.05} ${cy - r * 0.55} ${cx + s * r * 0.7} ${cy - r * 0.62} Q${cx + s * r * 0.82} ${cy - r * 0.3} ${cx + s * r * 0.78} ${cy + r * 0.05} Z`, fill, { sw: sw * 0.8 });
      return;
    case "baby":
      d.stroke(`M${cx - r * 0.05} ${top + r * 0.02} q${r * 0.12} ${-r * 0.28} ${r * 0.3} ${-r * 0.12} q${-r * 0.2} ${r * 0.02} ${-r * 0.1} ${r * 0.2}`, { sw: sw * 0.9, color: c[2] });
      return;
    case "headcloth":
      // The front edge of the cloth and a band.
      d.path(`M${cx - r * 1.0} ${cy + r * 0.2} Q${cx - r * 1.08} ${cy - r * 0.95} ${cx} ${cy - r * 1.12} Q${cx + r * 1.08} ${cy - r * 0.95} ${cx + r * 1.0} ${cy + r * 0.2} Q${cx + r * 0.82} ${cy - r * 0.42} ${cx} ${cy - r * 0.55} Q${cx - r * 0.82} ${cy - r * 0.42} ${cx - r * 1.0} ${cy + r * 0.2} Z`, fill, { sw });
      d.path(`M${cx - r * 0.9} ${cy - r * 0.42} Q${cx} ${cy - r * 0.78} ${cx + r * 0.9} ${cy - r * 0.42}`, "none", { sw: sw * 1.9, stroke: OL });
      d.path(`M${cx - r * 0.9} ${cy - r * 0.42} Q${cx} ${cy - r * 0.78} ${cx + r * 0.9} ${cy - r * 0.42}`, "none", { sw: sw * 1.1, stroke: P.gold[1] });
      return;
    case "curly":
    case "afro":
      d.path(`M${cx - r * 1.02} ${cy - r * 0.05} ${scallops(cx - r * 1.02, cy - r * 0.05, cx + r * 1.02, cy - r * 0.05, r, 7, style === "afro" ? 1.1 : 0.95)} Q${cx + r * 0.7} ${cy - r * 0.55} ${cx} ${cy - r * 0.48} Q${cx - r * 0.7} ${cy - r * 0.55} ${cx - r * 1.02} ${cy - r * 0.05} Z`, fill, { sw });
      return;
    case "spiky": {
      const pts = [-1, -0.6, -0.2, 0.2, 0.6, 1].map((k, i) => `L${cx + k * r * 0.95} ${top - (i % 2 ? r * 0.02 : r * 0.32) + Math.abs(k) * r * 0.5}`).join(" ");
      d.path(`M${cx - r * 1.02} ${cy - r * 0.08} ${pts} L${cx + r * 1.02} ${cy - r * 0.08} Q${cx + r * 0.6} ${cy - r * 0.6} ${cx} ${cy - r * 0.5} Q${cx - r * 0.6} ${cy - r * 0.6} ${cx - r * 1.02} ${cy - r * 0.08} Z`, fill, { sw });
      return;
    }
    case "long":
    case "wavy":
    case "braids":
      // A center part with hair framing the face.
      d.path(`M${cx - r * 1.04} ${cy + r * 0.35} Q${cx - r * 1.12} ${cy - r * 0.95} ${cx} ${top - r * 0.1} Q${cx + r * 1.12} ${cy - r * 0.95} ${cx + r * 1.04} ${cy + r * 0.35} Q${cx + r * 0.86} ${cy - r * 0.42} ${cx + r * 0.06} ${cy - r * 0.62} L${cx} ${cy - r * 0.78} L${cx - r * 0.06} ${cy - r * 0.62} Q${cx - r * 0.86} ${cy - r * 0.42} ${cx - r * 1.04} ${cy + r * 0.35} Z`, fill, { sw });
      d.shine(cx - r * 0.45, cy - r * 0.78, r * 0.22, r * 0.08, 0.4);
      return;
    default:
      // short / pony / bun / puffs: a cap with a swoopy fringe.
      d.path(`M${cx - r * 1.03} ${cy + r * 0.05} Q${cx - r * 1.12} ${cy - r * 1.0} ${cx} ${top - r * 0.08} Q${cx + r * 1.12} ${cy - r * 1.0} ${cx + r * 1.03} ${cy + r * 0.05} Q${cx + r * 0.95} ${cy - r * 0.42} ${cx + r * 0.55} ${cy - r * 0.5} Q${cx + r * 0.15} ${cy - r * 0.32} ${cx - r * 0.25} ${cy - r * 0.52} Q${cx - r * 0.75} ${cy - r * 0.48} ${cx - r * 0.86} ${cy - r * 0.2} Q${cx - r * 0.95} ${cy - r * 0.05} ${cx - r * 1.03} ${cy + r * 0.05} Z`, fill, { sw });
      d.shine(cx - r * 0.42, cy - r * 0.8, r * 0.24, r * 0.08, 0.4);
  }
}

/** Bumps along the hairline from (x0, y0) to (x1, y1) over the top of the head. */
function scallops(x0: number, y0: number, x1: number, y1: number, r: number, n: number, k: number) {
  const cx = (x0 + x1) / 2;
  const cy = y0;
  let s = "";
  for (let i = 1; i <= n; i++) {
    const a0 = Math.PI + ((i - 1) / n) * Math.PI;
    const a1 = Math.PI + (i / n) * Math.PI;
    const am = (a0 + a1) / 2;
    const ex = cx + Math.cos(a1) * r * 1.02;
    const ey = cy + Math.sin(a1) * r * 1.08;
    s += ` Q${cx + Math.cos(am) * r * (1.02 + 0.32 * k)} ${cy + Math.sin(am) * r * (1.08 + 0.3 * k)} ${ex} ${ey}`;
  }
  return s;
}

function beard(d: Pen, cx: number, cy: number, r: number, c: Ramp) {
  const sw = Math.max(2.2, r * 0.1);
  d.path(`M${cx - r * 0.98} ${cy + r * 0.05} Q${cx - r * 1.0} ${cy + r * 1.05} ${cx} ${cy + r * 1.3} Q${cx + r * 1.0} ${cy + r * 1.05} ${cx + r * 0.98} ${cy + r * 0.05} Q${cx + r * 0.78} ${cy + r * 0.62} ${cx + r * 0.3} ${cy + r * 0.5} Q${cx} ${cy + r * 0.36} ${cx - r * 0.3} ${cy + r * 0.5} Q${cx - r * 0.78} ${cy + r * 0.62} ${cx - r * 0.98} ${cy + r * 0.05} Z`, d.fill(c, "v"), { sw });
  // Mustache.
  d.path(`M${cx} ${cy + r * 0.4} Q${cx - r * 0.28} ${cy + r * 0.3} ${cx - r * 0.42} ${cy + r * 0.48} Q${cx - r * 0.2} ${cy + r * 0.5} ${cx} ${cy + r * 0.46} Q${cx + r * 0.2} ${cy + r * 0.5} ${cx + r * 0.42} ${cy + r * 0.48} Q${cx + r * 0.28} ${cy + r * 0.3} ${cx} ${cy + r * 0.4} Z`, d.fill(c, "v"), { sw: sw * 0.7 });
}

/** The expression: eyes, brows, nose, mouth (without the head shape). */
export function face(d: Pen, cx: number, cy: number, r: number, e: Expr, bearded = false) {
  const ex = r * 0.38;
  const ey = cy + r * 0.06;
  const er = r * 0.14;
  const sw = Math.max(1.8, r * 0.085);
  const my = cy + r * (bearded ? 0.58 : 0.5);
  // Cheeks first (under everything).
  if (e.extras?.includes("blush")) for (const s of [-1, 1]) d.cheek(cx + s * r * 0.6, cy + r * 0.38, r * 0.17);
  // Eyes.
  for (const s of [-1, 1]) {
    const x = cx + s * ex;
    const kind = e.eyes ?? "dot";
    switch (kind === "wink" ? (s < 0 ? "dot" : "happy") : kind) {
      case "dot":
        d.eye(x, ey, er);
        break;
      case "happy":
        d.stroke(`M${x - er} ${ey + er * 0.3} Q${x} ${ey - er * 1.3} ${x + er} ${ey + er * 0.3}`, { sw: sw * 1.1 });
        break;
      case "closed":
        d.stroke(`M${x - er} ${ey - er * 0.1} Q${x} ${ey + er * 1.1} ${x + er} ${ey - er * 0.1}`, { sw: sw * 1.1 });
        break;
      case "tired":
        // Heavy lids: the bottom half of the eye under a lid line.
        d.path(`M${x - er} ${ey} A${er} ${er} 0 0 0 ${x + er} ${ey} Z`, OL, { stroke: null });
        d.stroke(`M${x - er * 1.3} ${ey} H${x + er * 1.3}`, { sw: sw * 1.1 });
        break;
      case "wide":
        d.circle(x, ey, er * 1.35, "#fff", { sw: sw * 0.9 });
        d.circle(x, ey + er * 0.15, er * 0.62, OL, { stroke: null });
        d.circle(x - er * 0.2, ey - er * 0.1, er * 0.22, "#fff", { stroke: null });
        break;
      case "up":
        d.circle(x, ey, er * 1.3, "#fff", { sw: sw * 0.9 });
        d.circle(x + s * er * 0.15, ey - er * 0.62, er * 0.55, OL, { stroke: null });
        break;
      case "side":
        d.circle(x, ey, er * 1.25, "#fff", { sw: sw * 0.9 });
        d.circle(x + er * 0.55, ey + er * 0.1, er * 0.58, OL, { stroke: null });
        break;
      case "heart":
        d.path(heart(x, ey, er * 1.25), d.fill(P.red), { sw: sw * 0.8 });
        break;
      case "star":
        d.path(star(x, ey, er * 1.6), d.fill(P.gold), { sw: sw * 0.8 });
        break;
      case "x":
        d.stroke(`M${x - er} ${ey - er} L${x + er} ${ey + er} M${x + er} ${ey - er} L${x - er} ${ey + er}`, { sw: sw * 1.1 });
        break;
      case "sad":
        d.eye(x, ey + er * 0.2, er * 0.9);
        break;
      case "squint":
        d.stroke(`M${x - s * er} ${ey - er * 0.8} L${x + s * er * 0.9} ${ey} L${x - s * er} ${ey + er * 0.8}`, { sw: sw * 1.1 });
        break;
      case "teary":
        d.ellipse(x, ey, er * 1.15, er * 1.35, OL, { stroke: null });
        d.circle(x - er * 0.35, ey - er * 0.45, er * 0.48, "#fff", { stroke: null });
        d.circle(x + er * 0.35, ey + er * 0.4, er * 0.22, "#fff", { stroke: null });
        d.path(`M${x - er * 1.1} ${ey + er * 0.9} Q${x} ${ey + er * 1.5} ${x + er * 1.1} ${ey + er * 0.9}`, "none", { sw: sw * 0.8, stroke: "#5cc4ff" });
        break;
      case "angry":
        // A narrowed eye: its top cut by a slant that dips toward the nose.
        d.path(`M${x + s * er * 1.05} ${ey - er * 0.55} L${x - s * er * 1.05} ${ey + er * 0.15} Q${x - s * er * 0.6} ${ey + er * 1.1} ${x + s * er * 0.2} ${ey + er * 0.95} Q${x + s * er * 1.1} ${ey + er * 0.6} ${x + s * er * 1.05} ${ey - er * 0.55} Z`, OL, { stroke: null });
        break;
      case "glare":
        d.path(`M${x - er * 1.1} ${ey - er * (s < 0 ? 0.6 : 0)} L${x + er * 1.1} ${ey - er * (s < 0 ? 0 : 0.6)} L${x + er * 0.8} ${ey + er * 0.7} L${x - er * 0.8} ${ey + er * 0.7} Z`, OL, { stroke: null });
        break;
    }
  }
  // Brows.
  const by = ey - er * 2.1;
  const bw = er * 1.2;
  for (const s of [-1, 1]) {
    const x = cx + s * ex;
    const inner = x - s * bw;
    const outer = x + s * bw;
    switch (e.brows ?? "none") {
      case "up":
        d.stroke(`M${inner} ${by + er * 0.2} Q${x} ${by - er * 0.6} ${outer} ${by + er * 0.2}`, { sw });
        break;
      case "flat":
        d.stroke(`M${inner} ${by} L${outer} ${by}`, { sw });
        break;
      case "sad":
        d.stroke(`M${inner} ${by - er * 0.6} L${outer} ${by + er * 0.35}`, { sw });
        break;
      case "angry":
        d.stroke(`M${inner} ${by + er * 0.7} L${outer} ${by - er * 0.5}`, { sw: sw * 1.2 });
        break;
      case "worried":
        d.stroke(`M${inner} ${by - er * 0.7} Q${x} ${by - er * 0.2} ${outer} ${by + er * 0.2}`, { sw });
        break;
      case "raised":
        d.stroke(s < 0 ? `M${inner} ${by} L${outer} ${by}` : `M${inner} ${by - er * 0.2} Q${x} ${by - er * 1.4} ${outer} ${by - er * 0.4}`, { sw });
        break;
    }
  }
  // Nose: a little bump.
  if (!bearded) d.stroke(`M${cx - r * 0.06} ${cy + r * 0.26} q${r * 0.06} ${r * 0.08} ${r * 0.12} 0`, { sw: sw * 0.85, color: "rgba(42,47,69,0.55)" });
  // Mouth.
  const mw = r * 0.36;
  switch (e.mouth ?? "smile") {
    case "smile":
      d.stroke(`M${cx - mw} ${my - r * 0.04} Q${cx} ${my + r * 0.3} ${cx + mw} ${my - r * 0.04}`, { sw: sw * 1.1 });
      break;
    case "small":
      d.stroke(`M${cx - mw * 0.5} ${my} Q${cx} ${my + r * 0.14} ${cx + mw * 0.5} ${my}`, { sw: sw * 1.05 });
      break;
    case "grin":
      d.path(`M${cx - mw * 1.1} ${my - r * 0.06} Q${cx} ${my - r * 0.02} ${cx + mw * 1.1} ${my - r * 0.06} Q${cx + mw} ${my + r * 0.42} ${cx} ${my + r * 0.42} Q${cx - mw} ${my + r * 0.42} ${cx - mw * 1.1} ${my - r * 0.06} Z`, "#fff", { sw: sw * 1.05 });
      break;
    case "laugh":
      d.path(`M${cx - mw * 1.2} ${my - r * 0.1} Q${cx} ${my - r * 0.04} ${cx + mw * 1.2} ${my - r * 0.1} Q${cx + mw * 1.05} ${my + r * 0.55} ${cx} ${my + r * 0.55} Q${cx - mw * 1.05} ${my + r * 0.55} ${cx - mw * 1.2} ${my - r * 0.1} Z`, "#7a2a3a", { sw: sw * 1.05 });
      d.path(`M${cx - mw * 0.6} ${my + r * 0.42} Q${cx} ${my + r * 0.24} ${cx + mw * 0.6} ${my + r * 0.42} Q${cx} ${my + r * 0.56} ${cx - mw * 0.6} ${my + r * 0.42} Z`, "#ff7a8a", { stroke: null });
      d.path(`M${cx - mw * 1.02} ${my - r * 0.06} Q${cx} ${my} ${cx + mw * 1.02} ${my - r * 0.06} L${cx + mw * 0.92} ${my + r * 0.08} Q${cx} ${my + r * 0.12} ${cx - mw * 0.92} ${my + r * 0.08} Z`, "#fff", { stroke: null });
      break;
    case "frown":
      d.stroke(`M${cx - mw * 0.8} ${my + r * 0.14} Q${cx} ${my - r * 0.14} ${cx + mw * 0.8} ${my + r * 0.14}`, { sw: sw * 1.1 });
      break;
    case "wail":
      d.path(`M${cx - mw} ${my + r * 0.3} Q${cx - mw * 0.9} ${my - r * 0.12} ${cx} ${my - r * 0.12} Q${cx + mw * 0.9} ${my - r * 0.12} ${cx + mw} ${my + r * 0.3} Z`, "#7a2a3a", { sw: sw * 1.05 });
      break;
    case "o":
      d.ellipse(cx, my + r * 0.08, r * 0.11, r * 0.14, "#7a2a3a", { sw: sw * 0.95 });
      break;
    case "O":
      d.ellipse(cx, my + r * 0.12, r * 0.2, r * 0.27, "#7a2a3a", { sw: sw * 1.05 });
      break;
    case "flat":
      d.stroke(`M${cx - mw * 0.7} ${my + r * 0.06} L${cx + mw * 0.7} ${my + r * 0.06}`, { sw: sw * 1.1 });
      break;
    case "wavy":
      d.stroke(`M${cx - mw * 0.8} ${my + r * 0.08} q${mw * 0.27} ${-r * 0.12} ${mw * 0.53} 0 t${mw * 0.53} 0 t${mw * 0.53} 0`, { sw: sw * 1.05 });
      break;
    case "teeth":
      d.rect(cx - mw, my - r * 0.06, mw * 2, r * 0.3, r * 0.1, "#fff", { sw: sw });
      d.stroke(`M${cx - mw} ${my + r * 0.09} H${cx + mw} M${cx - mw * 0.35} ${my - r * 0.06} V${my + r * 0.24} M${cx + mw * 0.35} ${my - r * 0.06} V${my + r * 0.24}`, { sw: sw * 0.6 });
      break;
    case "tongue":
      d.stroke(`M${cx - mw} ${my - r * 0.04} Q${cx} ${my + r * 0.28} ${cx + mw} ${my - r * 0.04}`, { sw: sw * 1.1 });
      d.path(`M${cx - mw * 0.1} ${my + r * 0.1} Q${cx + mw * 0.05} ${my + r * 0.45} ${cx + mw * 0.45} ${my + r * 0.38} Q${cx + mw * 0.6} ${my + r * 0.16} ${cx + mw * 0.5} ${my + r * 0.06} Z`, "#ff7a8a", { sw: sw * 0.85 });
      break;
    case "yum":
      d.stroke(`M${cx - mw} ${my - r * 0.04} Q${cx} ${my + r * 0.28} ${cx + mw} ${my - r * 0.04}`, { sw: sw * 1.1 });
      d.path(`M${cx + mw * 0.35} ${my + r * 0.1} Q${cx + mw * 0.75} ${my + r * 0.4} ${cx + mw * 1.05} ${my + r * 0.12} Q${cx + mw * 0.9} ${my - r * 0.02} ${cx + mw * 0.7} ${my + r * 0.04} Z`, "#ff7a8a", { sw: sw * 0.85 });
      break;
    case "smirk":
      d.stroke(`M${cx - mw * 0.7} ${my + r * 0.08} Q${cx + mw * 0.3} ${my + r * 0.12} ${cx + mw * 0.8} ${my - r * 0.08}`, { sw: sw * 1.1 });
      break;
    case "zip":
      d.stroke(`M${cx - mw} ${my + r * 0.06} H${cx + mw}`, { sw: sw * 1.1 });
      for (let i = -2; i <= 2; i++) d.stroke(`M${cx + i * mw * 0.4} ${my - r * 0.04} v${r * 0.2}`, { sw: sw * 0.7 });
      d.rect(cx + mw * 0.85, my - r * 0.02, r * 0.14, r * 0.2, r * 0.04, d.fill(P.silver), { sw: sw * 0.6 });
      break;
    case "pout":
      d.stroke(`M${cx - mw * 0.55} ${my + r * 0.12} Q${cx} ${my - r * 0.06} ${cx + mw * 0.55} ${my + r * 0.12}`, { sw: sw * 1.2 });
      break;
    case "kiss":
      d.stroke(`M${cx - r * 0.05} ${my - r * 0.06} q${r * 0.14} ${r * 0.06} 0 ${r * 0.12} q${r * 0.14} ${r * 0.06} 0 ${r * 0.12}`, { sw: sw });
      break;
    case "yawn":
      d.ellipse(cx, my + r * 0.12, r * 0.18, r * 0.24, "#7a2a3a", { sw: sw });
      break;
    case "shh":
      d.stroke(`M${cx - mw * 0.4} ${my + r * 0.04} Q${cx} ${my + r * 0.1} ${cx + mw * 0.4} ${my + r * 0.04}`, { sw: sw });
      break;
    case "none":
      break;
  }
}

function extras(d: Pen, cx: number, cy: number, r: number, xs: Extra[], skin: Ramp) {
  const sw = Math.max(1.8, r * 0.085);
  for (const x of xs) {
    switch (x) {
      case "tear":
        d.path(drop(cx + r * 0.42, cy + r * 0.42, r * 0.13), d.fill(P.sky), { sw: sw * 0.8 });
        break;
      case "tears":
        for (const s of [-1, 1]) d.path(`M${cx + s * r * 0.38} ${cy + r * 0.2} Q${cx + s * r * 0.5} ${cy + r * 0.7} ${cx + s * r * 0.42} ${cy + r * 1.05} L${cx + s * r * 0.26} ${cy + r * 1.0} Q${cx + s * r * 0.34} ${cy + r * 0.6} ${cx + s * r * 0.26} ${cy + r * 0.22} Z`, d.fill(P.sky, "v"), { sw: sw * 0.7 });
        break;
      case "sweat":
        d.path(drop(cx + r * 0.88, cy - r * 0.5, r * 0.16), d.fill(P.sky), { sw: sw * 0.8 });
        break;
      case "zzz":
        zees(d, cx + r * 0.95, cy - r * 0.95, r * 0.28, sw);
        break;
      case "steam":
        for (const s of [-1, 1]) d.path(cloudPath(cx + s * r * 1.15, cy + r * 0.45, r * 0.5, r * 0.32), "#f4f7fb", { sw: sw * 0.8 });
        break;
      case "anger":
        angerMark(d, cx + r * 0.78, cy - r * 0.78, r * 0.22, sw);
        break;
      case "sick":
        d.path(drop(cx - r * 0.85, cy - r * 0.45, r * 0.14), d.fill(P.lime), { sw: sw * 0.8 });
        break;
      case "cold":
        for (const s of [-0.5, 0, 0.5]) d.path(`M${cx + s * r - r * 0.1} ${cy - r * 0.92} L${cx + s * r + r * 0.1} ${cy - r * 0.92} L${cx + s * r} ${cy - r * 0.62} Z`, "#e6f7ff", { sw: sw * 0.7 });
        break;
      case "hot":
        d.path(drop(cx + r * 0.88, cy - r * 0.5, r * 0.16), d.fill(P.sky), { sw: sw * 0.8 });
        d.path(drop(cx - r * 0.9, cy - r * 0.2, r * 0.12), d.fill(P.sky), { sw: sw * 0.8 });
        break;
      case "bandage":
        d.g(`rotate(-18 ${cx} ${cy - r * 0.6})`, (g) => {
          g.rect(cx - r * 1.05, cy - r * 0.78, r * 2.1, r * 0.34, r * 0.08, "#fff", { sw });
          g.rect(cx + r * 0.2, cy - r * 0.84, r * 0.3, r * 0.46, r * 0.06, "#ffd9df", { sw: sw * 0.7 });
        });
        break;
      case "halo":
        d.ellipse(cx, cy - r * 1.38, r * 0.62, r * 0.16, "none", { sw: sw * 1.9, stroke: OL });
        d.ellipse(cx, cy - r * 1.38, r * 0.62, r * 0.16, "none", { sw: sw * 1.1, stroke: P.gold[1] });
        break;
      case "partyhat":
        d.path(`M${cx - r * 0.42} ${cy - r * 0.8} L${cx + r * 0.1} ${cy - r * 1.75} L${cx + r * 0.5} ${cy - r * 0.72} Z`, d.fill(P.pink, "d"), { sw });
        d.stroke(`M${cx - r * 0.25} ${cy - r * 1.1} L${cx + r * 0.38} ${cy - r * 1.02} M${cx - r * 0.05} ${cy - r * 1.42} L${cx + r * 0.25} ${cy - r * 1.38}`, { sw: sw * 1.2, color: P.gold[1] });
        d.circle(cx + r * 0.1, cy - r * 1.78, r * 0.14, d.fill(P.gold), { sw: sw * 0.8 });
        break;
      case "crown":
        d.path(`M${cx - r * 0.6} ${cy - r * 0.78} L${cx - r * 0.66} ${cy - r * 1.4} L${cx - r * 0.3} ${cy - r * 1.08} L${cx} ${cy - r * 1.55} L${cx + r * 0.3} ${cy - r * 1.08} L${cx + r * 0.66} ${cy - r * 1.4} L${cx + r * 0.6} ${cy - r * 0.78} Z`, d.fill(P.gold), { sw });
        d.circle(cx, cy - r * 0.95, r * 0.09, d.fill(P.red), { sw: sw * 0.6 });
        break;
      case "sunglasses":
        for (const s of [-1, 1]) d.path(rr(cx + s * r * 0.38 - r * 0.3, cy - r * 0.08, r * 0.6, r * 0.38, r * 0.14), d.fill(P.black, "v"), { sw });
        d.stroke(`M${cx - r * 0.1} ${cy + r * 0.02} H${cx + r * 0.1} M${cx - r * 0.68} ${cy - r * 0.02} L${cx - r * 0.96} ${cy - r * 0.1} M${cx + r * 0.68} ${cy - r * 0.02} L${cx + r * 0.96} ${cy - r * 0.1}`, { sw });
        d.shine(cx - r * 0.5, cy + r * 0.02, r * 0.12, r * 0.05, 0.6);
        break;
      case "glasses":
        for (const s of [-1, 1]) d.circle(cx + s * r * 0.38, cy + r * 0.06, r * 0.27, "rgba(255,255,255,0.25)", { sw: sw * 0.9 });
        d.stroke(`M${cx - r * 0.11} ${cy + r * 0.04} Q${cx} ${cy - r * 0.04} ${cx + r * 0.11} ${cy + r * 0.04}`, { sw: sw * 0.9 });
        break;
      case "cowboy":
        d.path(`M${cx - r * 1.35} ${cy - r * 0.62} Q${cx} ${cy - r * 0.35} ${cx + r * 1.35} ${cy - r * 0.62} Q${cx + r * 1.15} ${cy - r * 0.86} ${cx + r * 0.75} ${cy - r * 0.78} Q${cx + r * 0.7} ${cy - r * 1.6} ${cx} ${cy - r * 1.42} Q${cx - r * 0.7} ${cy - r * 1.6} ${cx - r * 0.75} ${cy - r * 0.78} Q${cx - r * 1.15} ${cy - r * 0.86} ${cx - r * 1.35} ${cy - r * 0.62} Z`, d.fill(P.wood, "v"), { sw });
        d.stroke(`M${cx - r * 0.74} ${cy - r * 0.86} Q${cx} ${cy - r * 0.7} ${cx + r * 0.74} ${cy - r * 0.86}`, { sw: sw * 1.4, color: P.brown[2] });
        break;
      case "sparkles":
        d.sparkle(cx + r * 1.05, cy - r * 0.8, r * 0.24);
        d.sparkle(cx - r * 1.1, cy - r * 0.55, r * 0.16);
        break;
      case "red":
      case "blush":
        break;
    }
  }
  void skin;
}

/** Sleepy Z's going up and to the right. */
export function zees(d: Pen, x: number, y: number, s: number, sw = 2.4) {
  [0, 1, 2].forEach((i) => {
    const k = s * (1 - i * 0.25);
    const xx = x + i * s * 0.9;
    const yy = y - i * s * 1.1;
    d.stroke(`M${xx - k / 2} ${yy - k / 2} H${xx + k / 2} L${xx - k / 2} ${yy + k / 2} H${xx + k / 2}`, { sw: sw * (1 - i * 0.15), color: "#5c6ca8" });
  });
}
/** The cartoon "anger" vein mark. */
export function angerMark(d: Pen, x: number, y: number, s: number, sw = 2.4) {
  for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const)
    d.stroke(`M${x + dx * s * 0.25} ${y + dy * s} Q${x + dx * s * 0.3} ${y + dy * s * 0.3} ${x + dx * s} ${y + dy * s * 0.25}`, { sw: sw * 1.2, color: "#e8344a" });
}

// ── Busts (head and shoulders) ───────────────────────────────────────────────────────────────
/** Head and shoulders, the way people emoji are framed: head at (cx, cy) radius r, shoulders
 *  down to y = bottom. */
export function bust(d: Pen, cx: number, cy: number, r: number, look: Look = {}, expr: Expr = MOODS.happy, bottom = 98, collar: "round" | "v" | "robe" | "none" = "round") {
  const shirt = look.shirt ?? P.blue;
  const top = cy + r * 0.86;
  const sw = Math.max(2.4, r * 0.1);
  // Neck.
  d.rect(cx - r * 0.3, cy + r * 0.6, r * 0.6, r * 0.55, r * 0.1, sk(look.skin)[1], { sw });
  // Shoulders.
  d.path(`M${cx - r * 1.55} ${bottom} Q${cx - r * 1.6} ${top + r * 0.3} ${cx - r * 0.7} ${top} Q${cx} ${top + r * 0.22} ${cx + r * 0.7} ${top} Q${cx + r * 1.6} ${top + r * 0.3} ${cx + r * 1.55} ${bottom} Z`, d.fill(shirt, "v"), { sw });
  if (collar === "round") d.stroke(`M${cx - r * 0.42} ${top + r * 0.04} Q${cx} ${top + r * 0.42} ${cx + r * 0.42} ${top + r * 0.04}`, { sw: sw * 0.9, color: shirt[2] });
  if (collar === "v") d.path(`M${cx - r * 0.4} ${top + r * 0.02} L${cx} ${top + r * 0.55} L${cx + r * 0.4} ${top + r * 0.02} Z`, sk(look.skin)[1], { sw: sw * 0.8 });
  if (collar === "robe") d.stroke(`M${cx - r * 0.45} ${top + r * 0.02} L${cx + r * 0.1} ${bottom} M${cx + r * 0.45} ${top + r * 0.02} L${cx - r * 0.05} ${top + r * 0.75}`, { sw: sw * 0.85, color: shirt[2] });
  head(d, cx, cy, r, look, expr);
}

// ── Hands ────────────────────────────────────────────────────────────────────────────────────
export type Finger = "up" | "curl" | "bend";
export type HandOpts = {
  /** Index, middle, ring, pinky. */
  fingers?: [Finger, Finger, Finger, Finger];
  thumb?: "out" | "up" | "in" | "side";
  skin?: number;
  /** Mirror for a left hand. */
  left?: boolean;
  /** Show the back of the hand (nails) instead of the palm. */
  back?: boolean;
};
/** A cartoon hand, fingers up, palm centered at (x, y), `s` ≈ half the palm width; rotate with
 *  `deg` (0 = fingers up, 90 = pointing right). */
export function hand(d: Pen, x: number, y: number, s: number, deg = 0, o: HandOpts = {}) {
  const skin = sk(o.skin);
  const fingers = o.fingers ?? ["up", "up", "up", "up"];
  const w = s * 0.5;
  const sw = Math.max(2, s * 0.13);
  const tf = `translate(${x} ${y}) rotate(${deg})${o.left ? " scale(-1 1)" : ""}`;
  d.g(tf, (g) => {
    const len = [1.15, 1.3, 1.2, 0.95];
    const fx = [-0.66, -0.22, 0.22, 0.64];
    // Thumb (behind the palm when tucked across it).
    const thumb = o.thumb ?? "out";
    const thumbPath = thumb === "out" ? `M${-s * 0.75} ${s * 0.45} L${-s * 1.45} ${-s * 0.25}` : thumb === "up" ? `M${-s * 0.8} ${s * 0.2} L${-s * 0.95} ${-s * 0.95}` : thumb === "side" ? `M${-s * 0.8} ${s * 0.45} L${-s * 1.25} ${s * 0.1}` : `M${-s * 0.7} ${s * 0.55} L${s * 0.1} ${s * 0.15}`;
    if (thumb !== "in") g.tube(thumbPath, skin[1], w * 1.05, sw);
    fingers.forEach((f, i) => {
      const L = f === "up" ? len[i] * s * 1.25 : f === "bend" ? len[i] * s * 0.7 : s * 0.25;
      const bx = fx[i] * s;
      if (f === "curl") g.tube(`M${bx} ${-s * 0.55} L${bx} ${-s * 0.62}`, skin[1], w * 1.02, sw);
      else g.tube(`M${bx} ${-s * 0.4} L${bx + (f === "bend" ? s * 0.1 : 0)} ${-s * 0.4 - L}`, skin[1], w, sw);
      if (o.back && f === "up") g.ellipse(bx, -s * 0.4 - L + s * 0.12, w * 0.3, w * 0.36, "#ffe3ea", { stroke: null, op: 0.9 });
    });
    // Palm.
    g.path(`M${-s * 0.95} ${-s * 0.55} Q${-s * 1.0} ${s * 0.95} ${-s * 0.2} ${s * 1.1} Q${s * 0.65} ${s * 1.18} ${s * 0.92} ${s * 0.6} Q${s * 1.02} ${-s * 0.1} ${s * 0.9} ${-s * 0.6} Q${0} ${-s * 0.8} ${-s * 0.95} ${-s * 0.55} Z`, g.fill(skin), { sw });
    if (fingers.some((f) => f === "curl")) fingers.forEach((f, i) => f === "curl" && g.stroke(`M${fx[i] * s - w * 0.3} ${-s * 0.46} q${w * 0.3} ${w * 0.25} ${w * 0.6} 0`, { sw: sw * 0.8, color: skin[2] }));
    if (thumb === "in") g.tube(`M${-s * 0.7} ${s * 0.45} L${s * 0.15} ${-s * 0.05}`, skin[1], w * 1.05, sw);
    if (!o.back) g.stroke(`M${-s * 0.35} ${s * 0.2} Q${s * 0.05} ${s * 0.45} ${s * 0.45} ${s * 0.15}`, { sw: sw * 0.7, color: skin[2] });
    // Sleeve cuff.
    g.path(rr(-s * 0.95, s * 1.0, s * 1.9, s * 0.55, s * 0.2), g.fill(P.sky, "v"), { sw });
  });
}

// ── Whole bodies ─────────────────────────────────────────────────────────────────────────────
export type Pose = {
  /** Shoulder → elbow → hand angles in degrees for the back (left in the picture) and front (right)
   *  arms: 0 = straight down, 180 = up, + swings toward the right of the picture — so the left arm
   *  reaches out with negative angles and the right arm with positive ones. */
  armB?: [number, number];
  armF?: [number, number];
  /** Hip → knee → foot angles (same convention). */
  legB?: [number, number];
  legF?: [number, number];
  /** Lean of the body in degrees. */
  lean?: number;
};
export const POSES = {
  stand: { armB: [-12, -6], armF: [12, 6], legB: [-6, 0], legF: [6, 0] },
  wave: { armB: [-12, -6], armF: [120, 165], legB: [-6, 0], legF: [6, 0] },
  cheer: { armB: [-138, -165], armF: [138, 165], legB: [-10, 0], legF: [10, 0] },
  walk: { armB: [-28, -40], armF: [28, 10], legB: [-24, -8], legF: [26, 6], lean: 4 },
  run: { armB: [-60, -110], armF: [55, 120], legB: [-50, -10], legF: [70, -20], lean: 12 },
  jump: { armB: [-140, -160], armF: [140, 160], legB: [-30, 20], legF: [30, -20] },
  point: { armB: [-12, -6], armF: [85, 88], legB: [-6, 0], legF: [6, 0] },
  raise: { armB: [-12, -6], armF: [140, 172], legB: [-6, 0], legF: [6, 0] },
} satisfies Record<string, Pose>;

/** A whole kid (or grown-up with `adult`), standing on y = foot, `h` tall. */
export function figure(d: Pen, x: number, foot: number, h: number, look: Look = {}, pose: Pose = POSES.stand, expr: Expr = MOODS.happy, o: { pants?: Ramp; shoes?: Ramp; adult?: boolean; dress?: boolean } = {}) {
  const skin = sk(look.skin);
  const shirt = look.shirt ?? P.blue;
  const pants = o.pants ?? P.navy;
  const shoes = o.shoes ?? P.ink;
  const r = h * (o.adult ? 0.15 : 0.19);
  const legL = h * (o.adult ? 0.4 : 0.33);
  const bodyL = h * (o.adult ? 0.3 : 0.27);
  const limbW = h * 0.085;
  const sw = Math.max(2.2, h * 0.026);
  const hipY = foot - legL;
  const shY = hipY - bodyL + limbW * 0.6;
  const lean = pose.lean ?? 0;
  const rad = (a: number) => (a * Math.PI) / 180;
  const limb = (sx: number, sy: number, [a1, a2]: [number, number], L: number) => {
    const ex = sx + Math.sin(rad(a1)) * L;
    const ey = sy + Math.cos(rad(a1)) * L;
    const hx = ex + Math.sin(rad(a2)) * L;
    const hy = ey + Math.cos(rad(a2)) * L;
    return { ex, ey, hx, hy };
  };
  d.g(`rotate(${lean} ${x} ${foot})`, (g) => {
    const armL = h * (o.adult ? 0.17 : 0.15);
    const legSeg = legL / 2;
    const drawLeg = (a: [number, number], dx: number) => {
      const k = limb(x + dx, hipY, a, legSeg);
      g.tube(`M${x + dx} ${hipY} L${k.ex} ${k.ey} L${k.hx} ${k.hy}`, pants[1], limbW, sw);
      g.ellipse(k.hx + limbW * 0.35, k.hy + limbW * 0.15, limbW * 0.8, limbW * 0.5, g.fill(shoes, "v"), { sw });
    };
    const drawArm = (a: [number, number], dx: number) => {
      const k = limb(x + dx, shY, a, armL);
      g.tube(`M${x + dx} ${shY} L${k.ex} ${k.ey}`, shirt[1], limbW * 1.05, sw);
      g.tube(`M${k.ex} ${k.ey} L${k.hx} ${k.hy}`, skin[1], limbW * 0.85, sw);
      g.circle(k.hx, k.hy, limbW * 0.55, skin[1], { sw });
    };
    drawLeg(pose.legB ?? [-6, 0], -limbW * 0.5);
    drawArm(pose.armB ?? [-12, -6], -limbW * 1.3);
    drawLeg(pose.legF ?? [6, 0], limbW * 0.5);
    // Body.
    if (o.dress) g.path(`M${x - limbW * 1.2} ${shY - limbW * 0.3} L${x + limbW * 1.2} ${shY - limbW * 0.3} L${x + limbW * 2.1} ${hipY + legL * 0.25} L${x - limbW * 2.1} ${hipY + legL * 0.25} Z`, g.fill(shirt, "v"), { sw });
    else g.path(rr(x - limbW * 1.45, shY - limbW * 0.4, limbW * 2.9, bodyL + limbW * 0.3, limbW * 0.9), g.fill(shirt, "v"), { sw });
    drawArm(pose.armF ?? [12, 6], limbW * 1.3);
    head(g, x, shY - r * 0.92, r, look, expr);
  });
}

/** Default looks for the cast (skin index, hair, color, shirt) so people stay recognizable. */
export const CAST = {
  kid: { skin: 2, hair: "short", hairColor: HAIR.brown, shirt: P.teal },
  boy: { skin: 1, hair: "spiky", hairColor: HAIR.auburn, shirt: P.blue },
  girl: { skin: 3, hair: "puffs", hairColor: HAIR.black, shirt: P.pink },
  teen: { skin: 0, hair: "wavy", hairColor: HAIR.blond, shirt: P.violet },
  man: { skin: 2, hair: "short", hairColor: HAIR.black, shirt: P.navy },
  woman: { skin: 1, hair: "long", hairColor: HAIR.brown, shirt: P.coral },
  bearded: { skin: 2, hair: "short", hairColor: HAIR.brown, beard: HAIR.brown, shirt: P.tan },
  grandpa: { skin: 1, hair: "bald", hairColor: HAIR.grey, shirt: P.green },
  grandma: { skin: 3, hair: "bun", hairColor: HAIR.grey, shirt: P.purple },
  baby: { skin: 1, hair: "baby", hairColor: HAIR.blond, shirt: P.sky },
} satisfies Record<string, Look>;
