"use client";

import { cn } from "@/lib/cn";

/** A controlled on/off row (a real switch, 44px tall) for client-driven sheets. Emits a
 *  hidden "on"/"" input under `name` when given, so it also works inside plain forms. */
export function Toggle({
  checked,
  onChange,
  label,
  hint,
  name,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
  name?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn("flex min-h-11 w-full items-center justify-between gap-3 rounded-xl text-left", className)}
    >
      <span className="min-w-0">
        <span className="block text-[15px] font-medium text-fg">{label}</span>
        {hint && <span className="block text-sm text-fg-muted">{hint}</span>}
      </span>
      <span className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", checked ? "bg-accent" : "bg-line-strong")}>
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow-card transition-transform duration-200",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        />
      </span>
      {name && <input type="hidden" name={name} value={checked ? "on" : ""} />}
    </button>
  );
}
