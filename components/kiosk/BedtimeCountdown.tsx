"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/** Minutes from `now` until today's bedtime ("HH:MM"); negative if already past. */
function minutesUntil(bedtime: string, now: Date): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(bedtime.trim());
  if (!m) return null;
  const bt = new Date(now);
  bt.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return Math.round((bt.getTime() - now.getTime()) / 60000);
}

/** The wind-down window we visualize (last 4 hours before bed). */
const WINDOW = 240;

function pieces(bedtime: string, now: Date) {
  const diff = minutesUntil(bedtime, now);
  if (diff === null) return null;
  // After midnight, today's bedtime reads as deeply negative — treat the small
  // hours as "asleep" rather than a stale "Bedtime!" banner all night.
  const asleep = diff <= -120;
  const past = diff <= 0;
  const progress = past ? 1 : Math.max(0, Math.min(1, 1 - diff / WINDOW)); // 0 = far, 1 = bedtime
  const icon = asleep ? "😴" : past ? "🌙" : progress > 0.82 ? "🌙" : progress > 0.45 ? "🌆" : "☀️";
  const label = asleep
    ? "Sleep time"
    : past
      ? "Bedtime!"
      : diff < 15
        ? "Almost bedtime!"
        : diff < 60
          ? `${diff} min till bed`
          : diff <= WINDOW
            ? `${Math.round(diff / 60)} hr${Math.round(diff / 60) === 1 ? "" : "s"} till bed`
            : "Lots of time till bed";
  const short = asleep ? "Sleep" : past ? "Bedtime!" : diff < 60 ? `${diff}m` : `${Math.round(diff / 60)}h`;
  return { icon, label, short, progress, past, asleep };
}

/** Visual "how long until bed" — a sun→moon track a non-reader can read at a glance.
 *  `chip` is the compact form under a name on Home; `full` is the kid's screen. */
export function BedtimeCountdown({
  bedtime,
  variant = "chip",
  color,
  onSpeak,
  className,
}: {
  bedtime: string;
  variant?: "chip" | "full";
  color?: string;
  onSpeak?: (text: string) => void;
  className?: string;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const p = pieces(bedtime, now);
  if (!p) return null;
  const fill = (1 - p.progress) * 100; // remaining time as a draining bar

  if (variant === "chip") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span className="text-base leading-none" aria-hidden>
          {p.icon}
        </span>
        <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-kraise" role="img" aria-label={p.label}>
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all"
            style={{ width: `${fill}%`, background: color ?? "#3cbcd9" }}
          />
        </div>
        <span className="whitespace-nowrap text-xs font-medium text-kmute">{p.short}</span>
      </div>
    );
  }

  return (
    <button
      onClick={onSpeak ? () => onSpeak(p.label) : undefined}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl bg-kpanel/70 p-3 text-left ring-1 ring-kline/55",
        onSpeak && "transition active:scale-[0.99]",
        className,
      )}
    >
      <span className="text-3xl leading-none" aria-hidden>
        {p.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-base font-bold text-ktext">{p.label}</p>
        <div
          className="relative mt-1.5 h-3 overflow-hidden rounded-full"
          style={{ background: "linear-gradient(90deg, rgba(246,178,61,0.35), rgba(24,96,111,0.45), rgba(12,16,20,0.9))" }}
          role="img"
          aria-label={p.label}
        >
          <span
            className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-center text-sm leading-5"
            style={{ left: `${p.progress * 100}%` }}
            aria-hidden
          >
            {p.past ? "🛏️" : "•"}
          </span>
        </div>
      </div>
      <span className="text-2xl leading-none" aria-hidden>
        🛏️
      </span>
    </button>
  );
}
