"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { KioskStep } from "@/lib/kiosk/types";
import { tone, speak } from "@/lib/kiosk/feedback";

function toMinutes(t: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

/**
 * "Now / Next" band driven purely by the device clock against step start_times.
 * Externalizes time and gives a proactive 2-minute spoken/chime warning before
 * each transition — the top meltdown-prevention support.
 */
export function NowNext({
  steps,
  sound,
  readAloud,
}: {
  steps: KioskStep[];
  sound: boolean;
  readAloud: boolean;
}) {
  const timed = steps
    .map((s) => ({ step: s, min: toMinutes(s.start_time) }))
    .filter((x): x is { step: KioskStep; min: number } => x.min !== null)
    .sort((a, b) => a.min - b.min);

  const [nowMin, setNowMin] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });
  const warnedFor = useRef<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setNowMin(d.getHours() * 60 + d.getMinutes());
    }, 15000);
    return () => clearInterval(id);
  }, []);

  if (timed.length === 0) return null;

  let currentIdx = -1;
  for (let i = 0; i < timed.length; i++) {
    if (timed[i].min <= nowMin) currentIdx = i;
  }
  const current = currentIdx >= 0 ? timed[currentIdx] : null;
  const next = timed[currentIdx + 1] ?? null;

  // Proactive 2-minute transition warning.
  useEffect(() => {
    if (!next) return;
    const mins = next.min - nowMin;
    if (mins <= 2 && mins > 0 && warnedFor.current !== next.step.id) {
      warnedFor.current = next.step.id;
      tone(sound);
      speak(`Two minutes until ${next.step.label}`, readAloud);
    }
  }, [nowMin, next, sound, readAloud]);

  let pct = 0;
  if (current && next && next.min > current.min) {
    pct = Math.min(1, Math.max(0, (nowMin - current.min) / (next.min - current.min)));
  }

  return (
    <div className="mb-4 rounded-2xl border border-water/30 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-water">Now</p>
          <p className="truncate font-display text-xl font-bold text-harbor">
            {current ? `${current.step.icon ?? ""} ${current.step.label}` : "Free time"}
          </p>
        </div>
        {next && (
          <>
            <ArrowRight className="h-6 w-6 shrink-0 text-muted" />
            <div className="min-w-0 text-right">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Next</p>
              <p className="truncate font-display text-xl font-bold text-ink">
                {next.step.icon ?? ""} {next.step.label}
              </p>
            </div>
          </>
        )}
      </div>
      {current && next && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-harbor-50">
          <div
            className="h-full rounded-full bg-water transition-all"
            style={{ width: `${pct * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
