"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

const DAYS = [
  { n: 0, short: "S", long: "Sunday" },
  { n: 1, short: "M", long: "Monday" },
  { n: 2, short: "T", long: "Tuesday" },
  { n: 3, short: "W", long: "Wednesday" },
  { n: 4, short: "T", long: "Thursday" },
  { n: 5, short: "F", long: "Friday" },
  { n: 6, short: "S", long: "Saturday" },
];
const ALL = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKENDS = [0, 6];
const same = (a: number[], b: number[]) => a.length === b.length && a.every((x) => b.includes(x));

/** The one day-of-week picker (it used to exist in 4 sizes). 0 = Sunday. Empty/null = every
 *  day. Emits one hidden input per chosen day under `name` (formData.getAll(name)). */
export function DayPicker({
  name,
  defaultValue,
  onChange,
  className,
}: {
  name?: string;
  defaultValue?: number[] | null;
  onChange?: (days: number[]) => void;
  className?: string;
}) {
  const [days, setDays] = useState<number[]>(defaultValue && defaultValue.length ? defaultValue : ALL);
  const set = (next: number[]) => {
    const sorted = [...next].sort();
    setDays(sorted);
    onChange?.(sorted);
  };
  const toggle = (n: number) => set(days.includes(n) ? days.filter((d) => d !== n) : [...days, n]);
  const preset = (label: string, value: number[]) => (
    <button
      type="button"
      onClick={() => set(value)}
      aria-pressed={same(days, value)}
      className={cn(
        "min-h-10 rounded-full border px-3.5 text-sm font-semibold transition",
        same(days, value) ? "border-accent bg-accent/15 text-fg" : "border-line-strong text-fg-muted hover:text-fg",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <div role="group" aria-label="Days" className="flex gap-1.5">
        {DAYS.map((d) => {
          const on = days.includes(d.n);
          return (
            <button
              key={d.n}
              type="button"
              aria-label={d.long}
              aria-pressed={on}
              onClick={() => toggle(d.n)}
              className={cn(
                "grid h-11 w-11 place-items-center rounded-full text-sm font-bold transition active:scale-95",
                on ? "bg-accent text-accent-fg" : "border border-line-strong text-fg-muted hover:text-fg",
              )}
            >
              {d.short}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {preset("Every day", ALL)}
        {preset("Weekdays", WEEKDAYS)}
        {preset("Weekends", WEEKENDS)}
      </div>
      {name && days.map((d) => <input key={d} type="hidden" name={name} value={d} />)}
    </div>
  );
}
