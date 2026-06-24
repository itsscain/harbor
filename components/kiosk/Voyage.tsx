"use client";

import type { KioskStep } from "@/lib/kiosk/types";
import { LighthouseMark } from "@/components/brand/Logo";
import { KEyebrow } from "./ui";
import { cn } from "@/lib/cn";

/** The Voyage (HARBOR_V2 §9.1.5) — the day rendered as a little boat sailing home
 *  to the lighthouse. A boat marks "now" and advances with each completed step;
 *  the harbor lights up when the day is done. Time-blind / pre-reading kids can
 *  see *where they are* and *how far to done* spatially, without text. Additive —
 *  sits above the step cards, never replaces them. */
export function Voyage({
  steps,
  doneIds,
  accent,
  reducedMotion = false,
}: {
  steps: KioskStep[];
  doneIds: Set<string>;
  accent: string;
  reducedMotion?: boolean;
}) {
  const total = steps.length;
  if (total < 2) return null;
  const doneCount = steps.filter((s) => doneIds.has(s.id)).length;
  const allDone = doneCount === total;
  const currentIdx = steps.findIndex((s) => !doneIds.has(s.id));
  // Boat sits at the fraction of the journey completed (0 → start, 1 → home).
  const pct = total > 1 ? doneCount / total : 0;
  const glide = reducedMotion ? "" : "transition-all duration-700";

  return (
    <div className="relative mb-4 overflow-hidden rounded-2xl bg-kpanel/70 p-4 shadow-k ring-1 ring-kline/55">
      <div className="mb-4 flex items-center justify-between">
        <KEyebrow>Today&apos;s voyage</KEyebrow>
        <span className={cn("text-sm font-semibold", allDone ? "text-beacon" : "text-kmute")}>
          {allDone ? "Home! 🎉" : `${doneCount} of ${total}`}
        </span>
      </div>

      <div className="relative pt-5">
        {/* the water line */}
        <div className="absolute inset-x-1 top-[2.4rem] h-1 -translate-y-1/2 rounded-full" style={{ background: `${accent}22` }} />
        <div
          className={cn("absolute left-1 top-[2.4rem] h-1 -translate-y-1/2 rounded-full", glide)}
          style={{ width: `calc((100% - 0.5rem) * ${pct})`, background: accent, boxShadow: `0 0 10px -1px ${accent}` }}
        />

        {/* the sailing boat, riding the progress point */}
        <span
          aria-hidden
          className={cn("absolute z-10 -translate-x-1/2 text-2xl", glide, !reducedMotion && "k-float")}
          style={{ left: `calc(0.25rem + (100% - 0.5rem) * ${pct})`, top: 0 }}
        >
          ⛵
        </span>

        {/* waypoints (each routine step) + the lighthouse at the end */}
        <div className="relative flex items-center justify-between">
          {steps.map((s, i) => {
            const done = doneIds.has(s.id);
            const current = i === currentIdx;
            return (
              <div
                key={s.id}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-base ring-2",
                  done ? "text-harbor" : "bg-kraise text-ktext",
                  current && !reducedMotion && "k-glow",
                )}
                style={
                  done
                    ? { background: accent, borderColor: accent }
                    : { borderColor: current ? accent : "transparent" }
                }
              >
                {done ? "✓" : s.icon ?? "•"}
              </div>
            );
          })}
          <LighthouseMark className={cn("h-9 w-9 shrink-0", allDone ? "text-beacon" : "text-kmute/60")} />
        </div>
      </div>
    </div>
  );
}
