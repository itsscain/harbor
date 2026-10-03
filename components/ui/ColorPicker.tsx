"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { CHILD_PALETTE } from "@/lib/kiosk/colors";
import { cn } from "@/lib/cn";

/** The one color picker — named swatches, big targets, a check on the chosen one. */
export function ColorPicker({
  name,
  defaultValue,
  onChange,
  className,
}: {
  name?: string;
  defaultValue?: string | null;
  onChange?: (hex: string) => void;
  className?: string;
}) {
  const [value, setValue] = useState<string>(defaultValue ?? CHILD_PALETTE[0].value);
  return (
    <div role="radiogroup" aria-label="Color" className={cn("flex flex-wrap gap-2.5", className)}>
      {CHILD_PALETTE.map((c) => {
        const on = value.toLowerCase() === c.value.toLowerCase();
        return (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={c.name}
            title={c.name}
            onClick={() => {
              setValue(c.value);
              onChange?.(c.value);
            }}
            className="grid h-11 w-11 place-items-center rounded-full transition active:scale-95"
            style={{
              background: c.value,
              boxShadow: on ? `0 0 0 3px var(--c-surface), 0 0 0 5px ${c.value}` : undefined,
            }}
          >
            {on && <Check className="h-5 w-5 text-white drop-shadow" strokeWidth={3} aria-hidden />}
          </button>
        );
      })}
      {name && <input type="hidden" name={name} value={value} />}
    </div>
  );
}
