"use client";

import { useSelectedLayoutSegment } from "next/navigation";

/** Gentle fade-rise on tab change (replays by keying on the active segment).
 *  Disabled automatically under prefers-reduced-motion via the global rule. */
export function RouteTransition({ children }: { children: React.ReactNode }) {
  const segment = useSelectedLayoutSegment();
  // Key by segment so per-section .animate-enter classes replay on tab change.
  // No wrapper animation here — that would double-animate the whole tree.
  return <div key={segment ?? "root"}>{children}</div>;
}
