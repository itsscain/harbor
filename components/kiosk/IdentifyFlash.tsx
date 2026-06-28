"use client";

import { useEffect, useState } from "react";
import { play } from "@/lib/kiosk/feedback";

/** Identify (Device Management D3 / §7) — when the parent taps "Identify" in the manager,
 *  this device announces itself: a warm full-screen flash, a soft chime, and its name —
 *  so in a multi-screen house you know exactly which wall is which. Auto-dismisses. */
export function IdentifyFlash({ at, name }: { at: number | null; name: string | null }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!at) return;
    setShow(true);
    try {
      play("transition", true);
    } catch {
      /* sound is best-effort */
    }
    const t = window.setTimeout(() => setShow(false), 4500);
    return () => window.clearTimeout(t);
  }, [at]);

  if (!show) return null;
  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-beacon/90 text-center text-harbor"
      aria-hidden
    >
      <span className="animate-bounce text-8xl">👋</span>
      <p className="mt-5 font-display text-4xl font-extrabold sm:text-5xl">This is {name || "this Harbor"}</p>
      <p className="mt-2 text-lg font-semibold text-harbor/70">Your grown-up is looking for this screen</p>
    </div>
  );
}
