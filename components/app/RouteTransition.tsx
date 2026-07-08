"use client";

import { useSelectedLayoutSegment } from "next/navigation";

/** Gentle fade-rise on tab change (replays by keying on the active segment).
 *  Disabled automatically under prefers-reduced-motion via the global rule. */
export function RouteTransition({ children }: { children: React.ReactNode }) {
  const segment = useSelectedLayoutSegment();
  // Key by segment so the spring page-enter replays on every navigation — the
  // "app feel" transition, applied once here for the whole tree.
  return (
    <div key={segment ?? "root"} className="app-route-enter">
      {children}
    </div>
  );
}
