// Harbor motion v2 — the shared vocabulary for physical motion and Adaptive
// Sensory Intensity. Pure constants + helpers; safe on client and server.
// See HARBOR_V2 §4.2 (springs) and §9.1.3 (intensity).

/** Named spring presets (stiffness / damping / mass). Consumed by any spring-
 *  driven motion (touch tracking, shared-element flights in later phases). */
export const SPRING = {
  gentle: { stiffness: 170, damping: 26, mass: 1.0 }, // default UI motion, view enters
  snappy: { stiffness: 320, damping: 30, mass: 0.9 }, // buttons, toggles, tabs
  bouncy: { stiffness: 420, damping: 18, mass: 1.0 }, // celebrations, reward pops (overshoot)
  stiff: { stiffness: 520, damping: 40, mass: 0.8 }, // drag-follow, finger tracking
  lazy: { stiffness: 120, damping: 30, mass: 1.2 }, // ambient, screensaver, bedtime
} as const;

// ── Adaptive Sensory Intensity ──────────────────────────────────────────────
export type Sensory = "calm" | "standard" | "vivid";

/** Multiplier applied to animation scale/duration, particle counts, and the
 *  loudness of celebration. `‹tune›` on real hardware. */
export const INTENSITY: Record<Sensory, number> = {
  calm: 0.6,
  standard: 1.0,
  vivid: 1.25,
};

export function sensoryOf(v: unknown): Sensory {
  return v === "calm" || v === "vivid" ? v : "standard";
}

export function intensityOf(v: unknown): number {
  return INTENSITY[sensoryOf(v)];
}

/** Scale a base particle/confetti count by the child's intensity (never < 0). */
export function scaleCount(base: number, intensity: number): number {
  return Math.max(0, Math.round(base * intensity));
}
