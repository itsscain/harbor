"use client";

import { useEffect, useRef, useState } from "react";
import { LighthouseMark } from "@/components/brand/Logo";
import { play, haptic, HAPTIC } from "@/lib/kiosk/feedback";
import { cn } from "@/lib/cn";

/** "Lighting the lighthouse" (Kiosk Overhaul §12.3) — the signature first-boot
 *  moment TJ delivers in the family's living room. The wall starts dark, the beacon
 *  ignites with a warm bloom, the ambient comes alive, and it welcomes the family.
 *  Plays once right after pairing, before PIN setup. Tap (or ~4s) to continue. */
export function LightingMoment({ familyName, onDone }: { familyName?: string | null; onDone: () => void }) {
  const [lit, setLit] = useState(false);
  // Run the sequence once on mount; a ref keeps the auto-advance stable across the
  // re-renders that pairing/sync trigger (otherwise the timer keeps resetting).
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    const t0 = setTimeout(() => {
      setLit(true);
      play("milestone");
      haptic(HAPTIC.milestone);
    }, 450);
    const t1 = setTimeout(() => onDoneRef.current(), 4200);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
    };
  }, []);

  return (
    <button
      onClick={onDone}
      aria-label="Continue"
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center overflow-hidden bg-kobsidian text-white"
    >
      {/* the warm bloom that ignites from the beacon */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-[1800ms] ease-[var(--ease-harbor-calm)]"
        style={{
          opacity: lit ? 1 : 0,
          background: "radial-gradient(62% 52% at 50% 42%, rgba(246,178,61,0.24), rgba(24,96,111,0.10) 45%, transparent 68%)",
        }}
      />
      <LighthouseMark
        className={cn(
          "relative h-24 w-24 text-beacon transition-all duration-[1400ms] ease-[var(--ease-harbor-calm)]",
          lit ? "scale-100 opacity-100 animate-beacon" : "scale-90 opacity-30",
        )}
      />
      <p
        className={cn(
          "relative mt-9 font-display text-4xl font-bold transition-all duration-700 sm:text-5xl",
          lit ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        )}
      >
        Welcome home{familyName ? `, ${familyName}` : ""}.
      </p>
      <p className={cn("relative mt-3 text-lg text-white/55 transition-opacity delay-300 duration-700", lit ? "opacity-100" : "opacity-0")}>
        Your Harbor is lit.
      </p>
    </button>
  );
}
