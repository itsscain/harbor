"use client";

import { useEffect } from "react";
import { daypartFor } from "@/lib/kiosk/daypart";

/** Harbor Depth Layer 1 — the time-aware ambient field (HARBOR_V2 §3.1).
 *  Sets `data-daypart` on `.kiosk-root` each minute (CSS crossfades the palette
 *  over 90s) and renders the slow drifting gradient field behind all content.
 *  "The harbor at the hour." */
export function LivingAmbient() {
  useEffect(() => {
    const root = document.querySelector(".kiosk-root") as HTMLElement | null;
    if (!root) return;
    const apply = () => root.setAttribute("data-daypart", daypartFor());
    apply();
    const id = window.setInterval(apply, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="living-ambient" aria-hidden>
      <div className="living-ambient__field animate-drift" />
    </div>
  );
}
