"use client";

import { useState } from "react";
import { ChipGroup } from "./Chips";
import { Input } from "./primitives";
import { dayKeyInTz, weekdayInTz } from "@/lib/tz";

// "When?" as chips — Today / Tomorrow / (This weekend) / Pick a date — in the family time zone.
// Posts one YYYY-MM-DD under `name`. With a `defaultValue` (editing), it opens on that day.

function dayKeys(tz: string) {
  const now = Date.now();
  const dow = weekdayInTz(now, tz);
  const toSat = (6 - dow + 7) % 7 || 7;
  return {
    today: dayKeyInTz(now, tz),
    tomorrow: dayKeyInTz(now + 86_400_000, tz),
    saturday: dayKeyInTz(now + toSat * 86_400_000, tz),
  };
}

export function DateChips({
  tz,
  name,
  defaultValue,
  includeWeekend = false,
  allowPast = false,
}: {
  tz: string;
  name: string;
  defaultValue?: string | null;
  includeWeekend?: boolean;
  allowPast?: boolean;
}) {
  const d = dayKeys(tz);
  const initial = !defaultValue || defaultValue === d.today ? "today" : defaultValue === d.tomorrow ? "tomorrow" : "pick";
  const [choice, setChoice] = useState<string>(initial);
  const [custom, setCustom] = useState(defaultValue ?? d.today);
  const value = choice === "today" ? d.today : choice === "tomorrow" ? d.tomorrow : choice === "weekend" ? d.saturday : custom;
  return (
    <div className="space-y-2">
      <ChipGroup
        value={choice}
        onChange={(v) => setChoice(v[0] ?? "today")}
        options={[
          { value: "today", label: "Today" },
          { value: "tomorrow", label: "Tomorrow" },
          ...(includeWeekend ? [{ value: "weekend", label: "This weekend" }] : []),
          { value: "pick", label: "Pick a date" },
        ]}
        ariaLabel="When"
      />
      {choice === "pick" && <Input type="date" value={custom} min={allowPast ? undefined : d.today} onChange={(e) => setCustom(e.target.value)} aria-label="Date" />}
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

const TIME_PRESETS = [
  { value: "", label: "All day" },
  { value: "09:00", label: "9 am" },
  { value: "15:30", label: "3:30 pm" },
  { value: "18:00", label: "6 pm" },
];

/** "What time?" — All day or a preset, plus an exact time field. Posts HH:MM ("" = all day). */
export function TimeChips({ name, defaultValue }: { name: string; defaultValue?: string | null }) {
  const [time, setTime] = useState(defaultValue ?? "");
  return (
    <div className="space-y-2">
      <ChipGroup value={TIME_PRESETS.some((p) => p.value === time) ? time : null} onChange={(v) => setTime(v[0] ?? "")} options={TIME_PRESETS} ariaLabel="Time" />
      <Input type="time" name={name} value={time} onChange={(e) => setTime(e.target.value)} aria-label="Exact time" />
    </div>
  );
}
