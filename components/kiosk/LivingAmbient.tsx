"use client";

import { useEffect } from "react";
import type { CSSProperties } from "react";
import { daypartFor } from "@/lib/kiosk/daypart";

/** Harbor Depth Layer 1 — the time-aware living harbor behind ALL live content
 *  (Kiosk Rework §5.6). Sets `data-daypart` on `.kiosk-root` each minute (CSS crossfades
 *  the palette over 90s) and renders a layered, slowly-breathing deep-water field —
 *  atmosphere + drifting caustics + a soft breathing glow + a horizon band — so the wall
 *  reads as a living harbor even on a sparse home (no flat dead space). Pure CSS, z-0,
 *  pointer-events none. Intensity-scaled + frozen for reduced motion. */
export function LivingAmbient({ intensity = 1, reduced = false }: { intensity?: number; reduced?: boolean }) {
  useEffect(() => {
    const root = document.querySelector(".kiosk-root") as HTMLElement | null;
    if (!root) return;
    const apply = () => root.setAttribute("data-daypart", daypartFor());
    apply();
    const id = window.setInterval(apply, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="living-ambient"
      data-reduced={reduced ? "" : undefined}
      style={{ ["--amb-intensity" as string]: String(intensity) } as CSSProperties}
      aria-hidden
    >
      <div className="living-ambient__field animate-drift" />
      <div className="living-ambient__caustics" />
      <div className="living-ambient__glow" />
      <div className="living-ambient__horizon" />
    </div>
  );
}
