"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Heart } from "lucide-react";
import type { KioskCorner } from "@/lib/kiosk/types";
import { speak } from "@/lib/kiosk/feedback";
import { Confetti } from "./Confetti";
import { cn } from "@/lib/cn";

/** The calm-corner view on the wall: a soothing countdown + the gentle plan,
 *  read aloud once. When the timer ends, a warm "welcome back". Never shaming. */
export function CornerTimer({
  corner,
  childName,
  readAloud,
  reducedMotion = false,
  onBreathe,
}: {
  corner: KioskCorner;
  childName: string;
  readAloud: boolean;
  reducedMotion?: boolean;
  onBreathe?: () => void;
}) {
  const startMs = useMemo(() => new Date(corner.started_at).getTime(), [corner.started_at]);
  const totalMs = Math.max(60_000, corner.duration_minutes * 60_000);
  const [now, setNow] = useState(() => startMs); // SSR-stable; ticks on mount
  const spoken = useRef(false);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const msLeft = Math.max(0, startMs + totalMs - now);
  const done = msLeft <= 0;
  const mm = Math.floor(msLeft / 60_000);
  const ss = Math.floor((msLeft % 60_000) / 1000);
  const pct = Math.min(100, Math.max(0, Math.round((1 - msLeft / totalMs) * 100)));

  // Speak the plan once when the calm corner first appears.
  useEffect(() => {
    if (spoken.current || !readAloud || !corner.plan) return;
    spoken.current = true;
    const p = corner.plan;
    const parts = [p.encouragement, ...(p.steps ?? []), p.reminder].filter(Boolean);
    if (parts.length) speak(parts.join(" "), readAloud);
  }, [readAloud, corner.plan]);

  const plan = corner.plan;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#1b1733] to-[#141a24] p-6 text-center shadow-k ring-1 ring-violet-400/25 sm:p-8",
        !reducedMotion && "animate-enter",
      )}
    >
      <div className="mb-1 flex items-center justify-center gap-2 text-violet-300">
        <Heart className="h-5 w-5" />
        <span className="font-display text-sm font-semibold uppercase tracking-wide">Anchor</span>
      </div>

      {done ? (
        <>
          {!reducedMotion && <Confetti count={28} />}
          <p className="mt-2 font-display text-4xl font-bold text-ktext">All done 💚</p>
          <p className="mt-1 text-lg text-violet-200">Welcome back, {childName}. Fresh start!</p>
          {plan?.encouragement && <p className="mt-4 text-pretty text-base text-kmute">{plan.encouragement}</p>}
        </>
      ) : (
        <>
          <p className="mt-1 text-base text-kmute">
            Take your time, {childName}. Calm body, calm mind.
          </p>
          <p className="my-3 font-display text-6xl font-bold tabular-nums text-ktext">
            {mm}:{String(ss).padStart(2, "0")}
          </p>
          <div className="mx-auto mb-4 h-2.5 max-w-xs overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-violet-400 transition-all" style={{ width: `${pct}%` }} />
          </div>

          {plan?.steps && plan.steps.length > 0 && (
            <ul className="mx-auto max-w-md space-y-2 text-left">
              {plan.steps.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 rounded-xl bg-white/5 px-3.5 py-2.5 text-ktext">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-400/20 text-sm font-bold text-violet-200">
                    {i + 1}
                  </span>
                  <span className="text-pretty text-base">{s}</span>
                </li>
              ))}
            </ul>
          )}

          {plan?.reminder && (
            <p className="mx-auto mt-3 max-w-md text-pretty rounded-xl bg-violet-400/10 px-4 py-2.5 text-base text-violet-100">
              💡 {plan.reminder}
            </p>
          )}
          {plan?.encouragement && <p className="mt-3 text-pretty text-base italic text-kmute">{plan.encouragement}</p>}

          {onBreathe && (
            <button
              onClick={onBreathe}
              className="kiosk-tap mx-auto mt-5 flex items-center gap-2 rounded-full bg-violet-400/20 px-6 py-2.5 font-semibold text-violet-100 ring-1 ring-violet-400/30 active:scale-95"
            >
              🫧 Breathe with me
            </button>
          )}
        </>
      )}
    </div>
  );
}
