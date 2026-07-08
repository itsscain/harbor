"use client";

import { useEffect, useState } from "react";
import { readHouseMode, effectiveHouseMode, houseModeMeta } from "@/lib/command";

/**
 * Parent Power — House Modes on the wall. Reads households.settings.house_mode (rides
 * the snapshot, nudged in <1s when the parent flips it) and paints the wall accordingly:
 * a calm top ribbon for every mode, a gentle full tint for wind-down modes, and a soft
 * "screens are resting" cover for screen-free. The cover is humane — a tap peeks past it
 * for a moment (kids can always see the clock) rather than hard-locking the tablet.
 */
export function HouseModeLayer({
  settings,
  childId,
}: {
  settings: Record<string, unknown> | null | undefined;
  childId?: string | null;
}) {
  const state = effectiveHouseMode(readHouseMode(settings), childId);
  const meta = houseModeMeta(state.mode);
  const [peekUntil, setPeekUntil] = useState(0);
  const [, force] = useState(0);

  // Re-check the peek window + mode expiry roughly each second.
  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (state.mode === "normal") return null;
  const peeking = Date.now() < peekUntil;

  return (
    <>
      {/* Calm top ribbon — an ambient status, never blocking. */}
      <div className="pointer-events-none fixed inset-x-0 top-2 z-[24] flex justify-center px-4">
        <div
          className="animate-enter flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold text-white shadow-k backdrop-blur"
          style={{ background: `${meta.tint}d9`, boxShadow: `0 0 24px -8px ${meta.tint}` }}
        >
          <span className="text-base leading-none">{meta.emoji}</span>
          <span>{meta.wallLine}</span>
        </div>
      </div>

      {/* Gentle whole-wall tint for wind-down modes (bedtime/quiet). */}
      {(state.mode === "bedtime" || state.mode === "quiet") && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[23] transition-opacity duration-1000"
          style={{ background: `radial-gradient(1200px 900px at 50% 120%, ${meta.tint}22, transparent 70%)` }}
        />
      )}

      {/* Screen-free — a soft cover. Tap to peek (kids keep the clock); it returns after. */}
      {state.mode === "screen_free" && !peeking && (
        <button
          onClick={() => setPeekUntil(Date.now() + 18_000)}
          className="fixed inset-0 z-[45] flex flex-col items-center justify-center gap-4 px-8 text-center"
          style={{ background: "radial-gradient(1200px 900px at 50% 40%, #14202f 0%, #0a0f16 70%)" }}
          aria-label="Screens are resting — tap to peek"
        >
          <span className="text-6xl">{meta.emoji}</span>
          <h2 className="font-display text-3xl font-bold text-ktext">Screens are resting</h2>
          <p className="max-w-sm text-kmute">
            A grown-up turned on screen-free time. Take a break — tap if you need to check the time.
          </p>
        </button>
      )}
    </>
  );
}
