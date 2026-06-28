"use client";

import type { CSSProperties } from "react";
import { isNight } from "@/lib/kiosk/daypart";

/** Harbor Depth Layer 2 — the beacon as a living light (HARBOR_V2 §3.2).
 *  A slow volumetric sweep across the top of the wall, state-bound:
 *  - idle: slow, barely-there (felt more than seen);
 *  - active (a child is on their screen): brighter, tinted to their accent;
 *  - night: the sweep freezes to a still ember glow. */
export function BeaconLight({
  accent,
  active = false,
  night = isNight(),
  intensity = 1,
  reduced = false,
}: {
  accent?: string | null;
  active?: boolean;
  night?: boolean;
  /** Adaptive Sensory Intensity (§14) — scales the beacon's brightness per active child. */
  intensity?: number;
  /** The active child's reducedMotion — freezes the sweep to a still ember. */
  reduced?: boolean;
}) {
  const tint = active && accent ? accent : "rgba(246, 178, 61, 1)";
  const opacity = (night ? 0.05 : active ? 0.1 : 0.06) * intensity;
  const style = {
    "--beacon-tint": tint,
    "--beacon-opacity": String(opacity),
    "--beacon-speed": active ? "6s" : "8s",
    ...(night || reduced ? { animationPlayState: "paused" } : null),
  } as CSSProperties;
  return <div className="beacon-light" aria-hidden style={style} />;
}
