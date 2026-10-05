// How each aquarium creature looks and lives. Every creature is drawn from code (no emoji, no
// images): a body plan, its colors, its body shape (for the fish plan: the dorsal and belly
// contour from nose to tail, fins and a pattern), where it lives in the tank, how fast it swims
// and what it does when it's tapped.

export type Plan = "fish" | "turtle" | "octopus" | "squid" | "crab" | "arthro" | "snail" | "bird" | "frog" | "otter";
export type Habitat = "swim" | "bottom" | "surface";
export type TailKind = "fork" | "round" | "fan" | "lunate" | "shark" | "fluke" | "flipper" | "feet" | "taper" | "curl";
export type DorsalKind = "round" | "double" | "long" | "tall" | "curve" | "small" | "flow" | "ridge";
export type ReactKind = "dart" | "puff" | "ink" | "tuck" | "snap" | "flip" | "jump" | "spout" | "roll" | "flap" | "hide" | "shimmer" | "nod" | "chomp" | "zoom";
export type Head = "fish" | "shark" | "dolphin" | "whale" | "seal" | "penguin" | "croc" | "plesio" | "dragon" | "puffer";

/** A pattern painted on a fish-plan body (s = 0 nose … 1 tail base; v = −1 back … 1 belly). */
export type Pattern =
  | { kind: "bands"; at: [number, number][]; color: string; edge: string }
  | { kind: "spots"; at: [number, number, number][]; color: string }
  | { kind: "mottle"; color: string; n: number; size: number }
  | { kind: "tang"; color: string }
  | { kind: "scales"; color: string }
  | { kind: "grooves"; color: string }
  | { kind: "tuxedo" }
  | { kind: "stripes"; at: number[]; color: string };

export type FishBody = {
  /** Dorsal and belly contours: [s, height above/below the spine in body lengths]. */
  top: [number, number][];
  bot: [number, number][];
  /** "lat" = fish (side-to-side tail, seen from the side); "vert" = whales, seals, penguins… */
  wave: "lat" | "vert";
  tail: TailKind;
  tailLen: number;
  tailH: number;
  dorsal?: { kind: DorsalKind; s0: number; s1: number; h: number };
  anal?: { s0: number; s1: number; h: number };
  pect?: { kind: "fin" | "long" | "flipper" | "wing" | "legs" | "paddle"; s: number; v: number; len: number; w: number };
  head: Head;
  eye: { s: number; v: number; r: number; dark?: boolean; slit?: boolean; ring?: boolean };
  pattern?: Pattern[];
  whiskers?: boolean;
  gills?: number;
  blowhole?: boolean;
  bumps?: boolean;
  leaves?: boolean;
  spikes?: boolean;
};

export type Look = {
  plan: Plan;
  habitat: Habitat;
  /** Length at the baby stage, as a share of the tank's height. */
  len: number;
  /** Cruising speed, in body lengths per second. */
  speed: number;
  /** Where in the water column it likes to be (0 = just under the surface, 1 = the sand). */
  depth?: [number, number];
  react: ReactKind;
  jumper?: boolean;
  /** Glows in the dark (bioluminescent spots, pulsing). */
  glow?: string;
  /** Leaves a sparkle trail (legendary). */
  sparkle?: boolean;
  /** A variant within the plan (bird: duck | swan | flamingo; arthro: lobster | shrimp). */
  kind?: string;
  colors: Record<string, string>;
  fish?: FishBody;
};

const PUFFER_BODY = (spots: string): FishBody => ({
  top: [[0, 0], [0.04, 0.12], [0.15, 0.235], [0.4, 0.285], [0.65, 0.235], [0.85, 0.13], [1, 0.07]],
  bot: [[0, 0], [0.04, 0.1], [0.2, 0.245], [0.45, 0.29], [0.7, 0.215], [0.88, 0.11], [1, 0.06]],
  wave: "lat",
  tail: "round",
  tailLen: 0.22,
  tailH: 0.13,
  dorsal: { kind: "round", s0: 0.62, s1: 0.8, h: 0.075 },
  anal: { s0: 0.64, s1: 0.8, h: 0.065 },
  pect: { kind: "fin", s: 0.33, v: 0.02, len: 0.13, w: 0.08 },
  head: "puffer",
  eye: { s: 0.16, v: -0.1, r: 0.085 },
  pattern: [{ kind: "spots", color: spots, at: [[0.3, -0.55, 0.028], [0.45, -0.7, 0.024], [0.55, -0.4, 0.03], [0.68, -0.62, 0.022], [0.38, -0.3, 0.02], [0.78, -0.35, 0.02], [0.22, -0.72, 0.018], [0.6, -0.15, 0.018]] }],
  spikes: true,
});

const TURTLE = (c: Record<string, string>, glow?: string): Look => ({ plan: "turtle", habitat: "swim", len: 0.26, speed: 0.3, depth: [0.15, 0.75], react: "tuck", colors: c, glow });

export const LOOKS: Record<string, Look> = {
  splash: {
    plan: "fish",
    habitat: "swim",
    len: 0.17,
    speed: 0.55,
    depth: [0.15, 0.8],
    react: "dart",
    colors: { back: "#1c4fc4", mid: "#2f86ff", belly: "#78bfff", fin: "#2a64e0", finEdge: "#0d1b4a", tail: "#ffd23f", iris: "#1b2a55" },
    fish: {
      top: [[0, 0], [0.03, 0.1], [0.12, 0.2], [0.32, 0.29], [0.52, 0.27], [0.72, 0.19], [0.9, 0.09], [1, 0.06]],
      bot: [[0, 0], [0.03, 0.085], [0.15, 0.18], [0.36, 0.25], [0.56, 0.23], [0.76, 0.15], [0.9, 0.08], [1, 0.05]],
      wave: "lat",
      tail: "lunate",
      tailLen: 0.3,
      tailH: 0.2,
      dorsal: { kind: "long", s0: 0.18, s1: 0.86, h: 0.07 },
      anal: { s0: 0.42, s1: 0.86, h: 0.065 },
      pect: { kind: "fin", s: 0.3, v: 0.05, len: 0.16, w: 0.075 },
      head: "fish",
      eye: { s: 0.14, v: -0.07, r: 0.06 },
      pattern: [{ kind: "tang", color: "#0f1b45" }],
    },
  },
  sunny: {
    plan: "fish",
    habitat: "swim",
    len: 0.155,
    speed: 0.6,
    depth: [0.3, 0.9],
    react: "dart",
    colors: { back: "#ff6410", mid: "#ff8a24", belly: "#ffb262", fin: "#ff7a1a", finEdge: "#1a1a1a", iris: "#3a1a08" },
    fish: {
      top: [[0, 0], [0.03, 0.095], [0.12, 0.18], [0.3, 0.235], [0.55, 0.22], [0.78, 0.15], [0.92, 0.1], [1, 0.085]],
      bot: [[0, 0], [0.03, 0.08], [0.15, 0.17], [0.35, 0.21], [0.6, 0.19], [0.8, 0.13], [1, 0.08]],
      wave: "lat",
      tail: "round",
      tailLen: 0.3,
      tailH: 0.165,
      dorsal: { kind: "double", s0: 0.22, s1: 0.8, h: 0.11 },
      anal: { s0: 0.56, s1: 0.82, h: 0.09 },
      pect: { kind: "fin", s: 0.3, v: 0.05, len: 0.15, w: 0.085 },
      head: "fish",
      eye: { s: 0.12, v: -0.06, r: 0.062 },
      pattern: [{ kind: "bands", color: "#ffffff", edge: "#141414", at: [[0.165, 0.075], [0.47, 0.095], [0.88, 0.055]] }],
    },
  },
  bubbles: { plan: "fish", habitat: "swim", len: 0.15, speed: 0.3, depth: [0.3, 0.8], react: "puff", colors: { back: "#d6ad46", mid: "#e9cb72", belly: "#fff6dc", fin: "#f2d27e", finEdge: "#b8923e", iris: "#2d4a1a" }, fish: PUFFER_BODY("#7d5e1f") },
  ruby: { plan: "fish", habitat: "swim", len: 0.15, speed: 0.32, depth: [0.3, 0.8], react: "puff", colors: { back: "#f0305f", mid: "#ff6a8e", belly: "#ffe3ea", fin: "#ff8fab", finEdge: "#c21d48", iris: "#4a0f1f" }, fish: PUFFER_BODY("#a8183e") },
  goldie: {
    plan: "fish",
    habitat: "swim",
    len: 0.2,
    speed: 0.4,
    depth: [0.2, 0.75],
    react: "dart",
    sparkle: true,
    colors: { back: "#f08a00", mid: "#ffb81c", belly: "#ffeaa3", fin: "#ffc94a", finEdge: "#ff9d00", iris: "#3a2200" },
    fish: {
      top: [[0, 0], [0.04, 0.11], [0.15, 0.22], [0.38, 0.27], [0.62, 0.23], [0.85, 0.13], [1, 0.075]],
      bot: [[0, 0], [0.04, 0.1], [0.2, 0.23], [0.45, 0.27], [0.7, 0.2], [0.9, 0.1], [1, 0.065]],
      wave: "lat",
      tail: "fan",
      tailLen: 0.72,
      tailH: 0.33,
      dorsal: { kind: "flow", s0: 0.25, s1: 0.66, h: 0.17 },
      anal: { s0: 0.66, s1: 0.86, h: 0.1 },
      pect: { kind: "fin", s: 0.3, v: 0.07, len: 0.15, w: 0.08 },
      head: "fish",
      eye: { s: 0.13, v: -0.075, r: 0.062 },
      pattern: [{ kind: "scales", color: "#fff3b0" }],
    },
  },
  chompers: {
    plan: "fish",
    habitat: "swim",
    len: 0.32,
    speed: 0.42,
    depth: [0.3, 0.75],
    react: "chomp",
    colors: { back: "#5b7894", mid: "#7c97b0", belly: "#f1f5f8", fin: "#6582a0", finEdge: "#3f5872", iris: "#0e1a26" },
    fish: {
      top: [[0, 0], [0.04, 0.05], [0.12, 0.09], [0.38, 0.125], [0.65, 0.095], [0.86, 0.05], [1, 0.032]],
      bot: [[0, 0], [0.05, 0.045], [0.18, 0.09], [0.4, 0.11], [0.65, 0.075], [0.86, 0.04], [1, 0.028]],
      wave: "lat",
      tail: "shark",
      tailLen: 0.36,
      tailH: 0.25,
      dorsal: { kind: "tall", s0: 0.33, s1: 0.55, h: 0.2 },
      anal: { s0: 0.8, s1: 0.88, h: 0.035 },
      pect: { kind: "fin", s: 0.28, v: 0.07, len: 0.22, w: 0.07 },
      head: "shark",
      eye: { s: 0.11, v: -0.035, r: 0.04 },
      gills: 4,
    },
  },
  finn: {
    plan: "fish",
    habitat: "swim",
    len: 0.3,
    speed: 0.7,
    depth: [0.1, 0.65],
    react: "jump",
    jumper: true,
    colors: { back: "#577690", mid: "#86a3b9", belly: "#e6eff5", fin: "#5a7993", finEdge: "#3d566c", iris: "#101820" },
    fish: {
      top: [[0, 0], [0.025, 0.03], [0.07, 0.045], [0.12, 0.095], [0.24, 0.13], [0.46, 0.135], [0.7, 0.09], [0.9, 0.04], [1, 0.025]],
      bot: [[0, 0], [0.03, 0.025], [0.1, 0.06], [0.3, 0.12], [0.55, 0.11], [0.8, 0.06], [1, 0.025]],
      wave: "vert",
      tail: "fluke",
      tailLen: 0.22,
      tailH: 0.11,
      dorsal: { kind: "curve", s0: 0.42, s1: 0.6, h: 0.13 },
      pect: { kind: "flipper", s: 0.28, v: 0.075, len: 0.15, w: 0.05 },
      head: "dolphin",
      eye: { s: 0.135, v: -0.014, r: 0.037, dark: true },
      blowhole: true,
    },
  },
  spout: {
    plan: "fish",
    habitat: "swim",
    len: 0.44,
    speed: 0.2,
    depth: [0.3, 0.75],
    react: "spout",
    colors: { back: "#46699a", mid: "#6a8db8", belly: "#bccfe3", fin: "#476b9a", finEdge: "#2f4d75", iris: "#0e1a2e", mottle: "#9fb6d4" },
    fish: {
      top: [[0, 0], [0.03, 0.05], [0.1, 0.085], [0.3, 0.11], [0.6, 0.095], [0.85, 0.05], [1, 0.025]],
      bot: [[0, 0], [0.03, 0.06], [0.12, 0.1], [0.35, 0.115], [0.6, 0.09], [0.85, 0.045], [1, 0.022]],
      wave: "vert",
      tail: "fluke",
      tailLen: 0.18,
      tailH: 0.12,
      dorsal: { kind: "small", s0: 0.76, s1: 0.84, h: 0.03 },
      pect: { kind: "flipper", s: 0.26, v: 0.07, len: 0.11, w: 0.035 },
      head: "whale",
      eye: { s: 0.17, v: 0.022, r: 0.031, dark: true },
      pattern: [{ kind: "mottle", color: "#9fb6d4", n: 16, size: 0.014 }, { kind: "grooves", color: "#8ea6c4" }],
      blowhole: true,
    },
  },
  humphrey: {
    plan: "fish",
    habitat: "swim",
    len: 0.42,
    speed: 0.24,
    depth: [0.3, 0.75],
    react: "spout",
    colors: { back: "#2b3a4f", mid: "#40536c", belly: "#e7edf3", fin: "#eef3f7", finEdge: "#2b3a4f", iris: "#0b111a" },
    fish: {
      top: [[0, 0], [0.03, 0.055], [0.12, 0.1], [0.3, 0.13], [0.55, 0.12], [0.8, 0.06], [1, 0.03]],
      bot: [[0, 0], [0.04, 0.07], [0.14, 0.12], [0.35, 0.14], [0.6, 0.1], [0.85, 0.05], [1, 0.025]],
      wave: "vert",
      tail: "fluke",
      tailLen: 0.2,
      tailH: 0.14,
      dorsal: { kind: "small", s0: 0.7, s1: 0.77, h: 0.035 },
      pect: { kind: "long", s: 0.24, v: 0.085, len: 0.34, w: 0.055 },
      head: "whale",
      eye: { s: 0.15, v: 0.03, r: 0.031, dark: true },
      pattern: [{ kind: "grooves", color: "#c6d1dc" }],
      bumps: true,
      blowhole: true,
    },
  },
  biscuit: {
    plan: "fish",
    habitat: "swim",
    len: 0.27,
    speed: 0.6,
    depth: [0.1, 0.8],
    react: "roll",
    colors: { back: "#76655a", mid: "#9a8777", belly: "#d3c4b2", fin: "#695a4e", finEdge: "#4a3f37", iris: "#120c08" },
    fish: {
      top: [[0, 0], [0.04, 0.08], [0.1, 0.12], [0.18, 0.11], [0.26, 0.13], [0.45, 0.15], [0.7, 0.11], [0.9, 0.05], [1, 0.035]],
      bot: [[0, 0], [0.04, 0.07], [0.12, 0.1], [0.3, 0.14], [0.55, 0.14], [0.8, 0.08], [1, 0.035]],
      wave: "vert",
      tail: "flipper",
      tailLen: 0.22,
      tailH: 0.12,
      pect: { kind: "flipper", s: 0.3, v: 0.1, len: 0.17, w: 0.06 },
      head: "seal",
      eye: { s: 0.075, v: -0.045, r: 0.045, dark: true },
      pattern: [{ kind: "mottle", color: "#5b4c41", n: 14, size: 0.012 }],
      whiskers: true,
    },
  },
  waddles: {
    plan: "fish",
    habitat: "swim",
    len: 0.21,
    speed: 0.8,
    depth: [0.1, 0.8],
    react: "zoom",
    colors: { back: "#1c2330", mid: "#2b3443", belly: "#ffffff", fin: "#1c2330", finEdge: "#0e131b", iris: "#0e131b", beak: "#ffad2e", feet: "#ff9b1c" },
    fish: {
      top: [[0, 0], [0.03, 0.05], [0.1, 0.1], [0.2, 0.13], [0.45, 0.16], [0.7, 0.13], [0.9, 0.07], [1, 0.045]],
      bot: [[0, 0], [0.03, 0.05], [0.12, 0.11], [0.4, 0.155], [0.7, 0.12], [0.9, 0.065], [1, 0.04]],
      wave: "vert",
      tail: "feet",
      tailLen: 0.16,
      tailH: 0.08,
      pect: { kind: "wing", s: 0.33, v: 0.0, len: 0.3, w: 0.06 },
      head: "penguin",
      eye: { s: 0.1, v: -0.05, r: 0.034, ring: true },
      pattern: [{ kind: "tuxedo" }],
    },
  },
  snappy: {
    plan: "fish",
    habitat: "surface",
    len: 0.38,
    speed: 0.25,
    react: "chomp",
    colors: { back: "#4c7b2c", mid: "#6a9a3f", belly: "#d8dc95", fin: "#456f28", finEdge: "#2f4f1a", iris: "#e8c22a" },
    fish: {
      top: [[0, 0], [0.05, 0.035], [0.17, 0.05], [0.23, 0.075], [0.4, 0.09], [0.6, 0.075], [0.8, 0.045], [1, 0.022]],
      bot: [[0, 0], [0.05, 0.03], [0.2, 0.045], [0.35, 0.08], [0.55, 0.075], [0.8, 0.04], [1, 0.02]],
      wave: "lat",
      tail: "taper",
      tailLen: 0.06,
      tailH: 0.03,
      dorsal: { kind: "ridge", s0: 0.3, s1: 1, h: 0.03 },
      pect: { kind: "legs", s: 0.3, v: 0.07, len: 0.1, w: 0.03 },
      head: "croc",
      eye: { s: 0.215, v: -0.075, r: 0.03, slit: true },
      pattern: [{ kind: "stripes", at: [0.45, 0.62, 0.78, 0.9], color: "#3c6322" }],
    },
  },
  nessie: {
    plan: "fish",
    habitat: "swim",
    len: 0.38,
    speed: 0.28,
    depth: [0.25, 0.75],
    react: "nod",
    colors: { back: "#2c9a8c", mid: "#4cbfb0", belly: "#c6f1e7", fin: "#288579", finEdge: "#1b5f56", iris: "#0d2a26" },
    fish: {
      top: [[0, 0], [0.025, 0.035], [0.06, 0.04], [0.1, 0.022], [0.3, 0.026], [0.42, 0.08], [0.6, 0.12], [0.78, 0.09], [0.9, 0.04], [1, 0.02]],
      bot: [[0, 0], [0.025, 0.03], [0.07, 0.035], [0.1, 0.02], [0.32, 0.024], [0.45, 0.08], [0.62, 0.11], [0.8, 0.07], [0.92, 0.03], [1, 0.015]],
      wave: "vert",
      tail: "taper",
      tailLen: 0.05,
      tailH: 0.02,
      pect: { kind: "paddle", s: 0.47, v: 0.06, len: 0.17, w: 0.05 },
      head: "plesio",
      eye: { s: 0.035, v: -0.013, r: 0.02 },
      pattern: [{ kind: "spots", color: "#22796e", at: [[0.5, -0.6, 0.012], [0.58, -0.75, 0.01], [0.66, -0.55, 0.012], [0.72, -0.7, 0.009], [0.55, -0.3, 0.009], [0.8, -0.5, 0.008]] }],
    },
  },
  tide: {
    plan: "fish",
    habitat: "swim",
    len: 0.24,
    speed: 0.14,
    depth: [0.35, 0.85],
    react: "shimmer",
    colors: { back: "#ea9f2e", mid: "#f6c35a", belly: "#f9dc8e", fin: "#fff0b8", finEdge: "#e8a23a", iris: "#3a2200", leaf: "#a2c74a", leafDark: "#7aa333", stripe: "#d9702a" },
    fish: {
      top: [[0, 0], [0.06, 0.012], [0.14, 0.02], [0.2, 0.05], [0.35, 0.075], [0.55, 0.06], [0.75, 0.035], [1, 0.012]],
      bot: [[0, 0], [0.06, 0.012], [0.15, 0.02], [0.22, 0.05], [0.4, 0.08], [0.6, 0.05], [0.8, 0.02], [1, 0.01]],
      wave: "lat",
      tail: "curl",
      tailLen: 0.02,
      tailH: 0.01,
      dorsal: { kind: "flow", s0: 0.44, s1: 0.6, h: 0.04 },
      head: "dragon",
      eye: { s: 0.19, v: -0.03, r: 0.026 },
      pattern: [{ kind: "stripes", at: [0.3, 0.42, 0.54, 0.66], color: "#d9702a" }],
      leaves: true,
    },
  },
  shelly: TURTLE({ shell: "#5f8f3e", shellLight: "#a3ce6e", scute: "#3e6a26", skin: "#9ec06a", skinDark: "#6f8f45", belly: "#ece1b2", iris: "#2a1c0a" }),
  aurora: TURTLE({ shell: "#24525e", shellLight: "#41808d", scute: "#143841", skin: "#4f8f8a", skinDark: "#2f6460", belly: "#bfe9e0", iris: "#082322" }, "#6fffe9"),
  inky: { plan: "octopus", habitat: "bottom", len: 0.22, speed: 0.25, react: "ink", colors: { body: "#ff6f91", light: "#ffabc0", dark: "#d9466c", spots: "#c93d63", sucker: "#ffd6e0", iris: "#2a0a14" } },
  midnight: { plan: "octopus", habitat: "bottom", len: 0.22, speed: 0.25, react: "ink", glow: "#7cf9ff", colors: { body: "#4044a8", light: "#7a7fe8", dark: "#262a70", spots: "#2b2e7d", sucker: "#a3a7ff", iris: "#05061f" } },
  squirt: { plan: "squid", habitat: "swim", len: 0.24, speed: 0.5, depth: [0.15, 0.7], react: "ink", colors: { body: "#f4a1c5", light: "#ffd5e6", dark: "#d3679a", spots: "#c2457b", fin: "#fbbcd8", iris: "#2a0a1a" } },
  pinch: { plan: "crab", habitat: "bottom", len: 0.15, speed: 0.4, react: "snap", colors: { shell: "#ff5636", light: "#ff9a74", dark: "#c43a20", claw: "#ff6a45", leg: "#ff7d58", iris: "#1a0a05" } },
  snaps: { plan: "arthro", kind: "lobster", habitat: "bottom", len: 0.24, speed: 0.22, react: "flip", colors: { body: "#d63d29", light: "#ff8264", dark: "#9b2414", claw: "#e04a33", leg: "#c9412d", iris: "#120404" } },
  zippy: { plan: "arthro", kind: "shrimp", habitat: "swim", len: 0.13, speed: 0.4, depth: [0.55, 0.95], react: "snap", colors: { body: "#ff9468", light: "#ffd2bb", dark: "#e0603a", claw: "#ff7448", leg: "#ff9f7a", stripe: "#ffffff", iris: "#140704" } },
  echo: { plan: "snail", habitat: "bottom", len: 0.13, speed: 0.06, react: "hide", colors: { shell: "#eaaf66", dark: "#b5733a", band: "#fff1d2", body: "#d9c7b3", bodyDark: "#b39e88", iris: "#1a1008" } },
  puddles: { plan: "bird", kind: "duck", habitat: "surface", len: 0.15, speed: 0.3, react: "flap", colors: { body: "#ffd83a", light: "#fff27e", dark: "#efb000", beak: "#ff9a1f", feet: "#ff8a1f", iris: "#1a1206" } },
  grace: { plan: "bird", kind: "swan", habitat: "surface", len: 0.22, speed: 0.22, react: "flap", colors: { body: "#ffffff", light: "#ffffff", dark: "#d5dee9", beak: "#ff8c1a", knob: "#1e1e1e", feet: "#3a3a3a", iris: "#101010" } },
  rosie: { plan: "bird", kind: "flamingo", habitat: "surface", len: 0.21, speed: 0.2, react: "flap", colors: { body: "#ff8db4", light: "#ffc7d9", dark: "#ef6690", beak: "#2b2b2b", beakLight: "#ffe0ea", feet: "#ff7aa2", iris: "#2a1010" } },
  hopper: { plan: "frog", habitat: "surface", len: 0.16, speed: 0.5, react: "jump", colors: { body: "#46c052", light: "#93e46c", dark: "#2c8a37", belly: "#e8f7b2", spots: "#2a7d33", iris: "#ffcf3a" } },
  pebble: { plan: "otter", habitat: "surface", len: 0.23, speed: 0.5, react: "roll", colors: { fur: "#8a5a3b", light: "#b37c53", dark: "#5c3a24", face: "#e4c39d", nose: "#2e1b12", iris: "#120a05" } },
};

/** The look for a creature id (anything unknown swims as a friendly fish). */
export const lookOf = (id: string): Look => LOOKS[id] ?? LOOKS.splash;
