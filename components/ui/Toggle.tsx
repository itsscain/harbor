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
  compact = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
  name?: string;
  className?: string;
  /** Just the switch (e.g. at the end of a list row); the label stays for screen readers. */
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={compact ? label : undefined}
      onClick={() => onChange(!checked)}
      className={cn("flex min-h-11 items-center justify-between gap-3 rounded-xl text-left", compact ? "w-auto" : "w-full", className)}
    >
      {!compact && (
        <span className="min-w-0">
          <span className="block text-[15px] font-medium text-fg">{label}</span>
          {hint && <span className="block text-sm text-fg-muted">{hint}</span>}
        </span>
      )}
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
