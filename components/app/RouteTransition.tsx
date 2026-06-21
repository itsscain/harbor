"use client";

import { useSelectedLayoutSegment } from "next/navigation";

/** Gentle fade-rise on tab change (replays by keying on the active segment).
 *  Disabled automatically under prefers-reduced-motion via the global rule. */
export function RouteTransition({ children }: { children: React.ReactNode }) {
  const segment = useSelectedLayoutSegment();
  return (
    <div key={segment ?? "root"} className="animate-enter">
      {children}
    </div>
  );
}
