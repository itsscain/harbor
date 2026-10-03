"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/cn";

const fmt = (hm: string) => {
  const [h, m] = hm.split(":").map(Number);
  if (!Number.isFinite(h)) return hm;
  const ampm = h >= 12 ? "pm" : "am";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m || 0).padStart(2, "0")} ${ampm}`;
};

/** One or more times of day — real time pickers instead of "08:00,20:00" typed as text.
 *  Each time posts under `name` (formData.getAll); `joinedName` also posts them comma-joined
 *  for actions that expect a single string. Quick presets cover the usual moments. */
export function TimeList({
  name,
  joinedName,
  defaultValue = [],
  presets = ["07:30", "12:00", "15:30", "20:00"],
  addLabel = "Add a time",
  className,
}: {
  name?: string;
  joinedName?: string;
  defaultValue?: string[];
  presets?: string[];
  addLabel?: string;
  className?: string;
}) {
  const [times, setTimes] = useState<string[]>(defaultValue.filter(Boolean));
  const add = (t: string) => setTimes((cur) => (cur.includes(t) ? cur : [...cur, t].sort()));
  const unused = presets.filter((p) => !times.includes(p));

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {times.map((t, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="time"
            name={name}
            value={t}
            onChange={(e) => setTimes((cur) => cur.map((x, j) => (j === i ? e.target.value : x)))}
            aria-label={`Time ${i + 1}`}
            className="min-h-11 flex-1 rounded-xl border border-line-strong bg-surface px-3.5 text-base text-fg outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/20"
          />
          <button
            type="button"
            onClick={() => setTimes((cur) => cur.filter((_, j) => j !== i))}
            aria-label={`Remove ${fmt(t)}`}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-fg-muted transition hover:bg-surface-2 hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <div className="flex flex-wrap gap-1.5">
        {unused.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => add(p)}
            className="inline-flex min-h-10 items-center gap-1 rounded-full border border-line-strong px-3.5 text-sm font-semibold text-fg-muted transition hover:border-accent/50 hover:text-fg"
          >
            <Plus className="h-3.5 w-3.5" /> {fmt(p)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => add(times.length ? times[times.length - 1] : "08:00")}
          className="inline-flex min-h-10 items-center gap-1 rounded-full border border-dashed border-line-strong px-3.5 text-sm font-semibold text-fg-muted transition hover:text-fg"
        >
          <Plus className="h-3.5 w-3.5" /> {addLabel}
        </button>
      </div>
      {joinedName && <input type="hidden" name={joinedName} value={times.filter(Boolean).join(",")} />}
    </div>
  );
}
