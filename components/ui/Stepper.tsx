"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

/** A −/value/+ control for small numbers (stars, minutes, days) — big targets, no typing.
 *  Optional preset chips jump straight to common values. Emits a hidden input under `name`. */
export function Stepper({
  name,
  defaultValue = 0,
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  suffix,
  presets,
  label = "Amount",
  className,
}: {
  name?: string;
  defaultValue?: number;
  value?: number;
  onChange?: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  presets?: number[];
  label?: string;
  className?: string;
}) {
  const [inner, setInner] = useState(defaultValue);
  const v = value ?? inner;
  const set = (n: number) => {
    const c = Math.max(min, Math.min(max, n));
    if (value === undefined) setInner(c);
    onChange?.(c);
  };

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <div role="group" aria-label={label} className="inline-flex w-fit items-center rounded-2xl border border-line-strong bg-surface">
        <button
          type="button"
          aria-label={`Decrease ${label.toLowerCase()}`}
          onClick={() => set(v - step)}
          disabled={v <= min}
          className="grid h-12 w-12 place-items-center rounded-l-2xl text-fg transition hover:bg-surface-2 disabled:opacity-35"
        >
          <Minus className="h-5 w-5" />
        </button>
        <output aria-live="polite" className="min-w-[4.5rem] px-1 text-center font-display text-xl font-bold tabular-nums text-fg">
          {v}
          {suffix && <span className="ml-1 text-sm font-semibold text-fg-muted">{suffix}</span>}
        </output>
        <button
          type="button"
          aria-label={`Increase ${label.toLowerCase()}`}
          onClick={() => set(v + step)}
          disabled={v >= max}
          className="grid h-12 w-12 place-items-center rounded-r-2xl text-fg transition hover:bg-surface-2 disabled:opacity-35"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
      {presets && presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => set(p)}
              aria-pressed={v === p}
              className={cn(
                "min-h-10 rounded-full border px-3.5 text-sm font-semibold tabular-nums transition",
                v === p ? "border-accent bg-accent/15 text-fg" : "border-line-strong text-fg-muted hover:text-fg",
              )}
            >
              {p}
              {suffix ? ` ${suffix}` : ""}
            </button>
          ))}
        </div>
      )}
      {name && <input type="hidden" name={name} value={v} />}
    </div>
  );
}
