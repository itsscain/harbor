"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

// Chips replace dropdowns for short choice lists (≤ ~8 options) — every option visible, one tap.
// Form-integrated: selected values are emitted as hidden inputs under `name` (repeated when
// `multiple`, so a Server Action reads them with formData.getAll(name)).

export type ChipOption = { value: string; label: string; emoji?: string };

function toArray(v: string | string[] | null | undefined): string[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : v === "" ? [""] : [v];
}

const chipBase =
  "inline-flex min-h-11 select-none items-center gap-1.5 rounded-full border px-4 text-[15px] font-semibold transition active:scale-[0.97] focus-visible:outline-none";
const chipOn = "border-accent bg-accent/15 text-fg";
const chipOff = "border-line-strong bg-surface text-fg-muted hover:border-accent/50 hover:text-fg";

export function ChipGroup({
  name,
  options,
  multiple = false,
  defaultValue,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  name?: string;
  options: ChipOption[];
  multiple?: boolean;
  defaultValue?: string | string[] | null;
  value?: string | string[] | null;
  onChange?: (value: string[]) => void;
  ariaLabel?: string;
  className?: string;
}) {
  const [inner, setInner] = useState<string[]>(toArray(defaultValue));
  const selected = value !== undefined ? toArray(value) : inner;

  const pick = (v: string) => {
    const next = multiple ? (selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]) : [v];
    if (value === undefined) setInner(next);
    onChange?.(next);
  };

  return (
    <div role={multiple ? "group" : "radiogroup"} aria-label={ariaLabel} className={cn("flex flex-wrap gap-2", className)}>
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            role={multiple ? undefined : "radio"}
            aria-checked={multiple ? undefined : on}
            aria-pressed={multiple ? on : undefined}
            onClick={() => pick(o.value)}
            className={cn(chipBase, on ? chipOn : chipOff)}
          >
            {o.emoji && (
              <span aria-hidden className="text-base leading-none">
                {o.emoji}
              </span>
            )}
            {o.label}
            {multiple && on && <Check className="h-3.5 w-3.5 text-accent" aria-hidden />}
          </button>
        );
      })}
      {name && selected.map((v) => <input key={v || "_empty"} type="hidden" name={name} value={v} />)}
    </div>
  );
}

export type ChipChild = {
  id: string;
  name: string;
  avatar?: string | null;
  photo_url?: string | null;
  color?: string | null;
};

/** "Who?" — every child as a tappable avatar chip. `everyone` adds an "Everyone" chip whose
 *  value is "" (an empty string Server Actions treat as the whole family). */
export function ChildChips({
  name,
  kids,
  multiple = false,
  everyone = false,
  everyoneLabel = "Everyone",
  defaultValue,
  value,
  onChange,
  ariaLabel = "Who",
  className,
}: {
  name?: string;
  kids: ChipChild[];
  multiple?: boolean;
  everyone?: boolean;
  everyoneLabel?: string;
  defaultValue?: string | string[] | null;
  value?: string | string[] | null;
  onChange?: (value: string[]) => void;
  ariaLabel?: string;
  className?: string;
}) {
  const [inner, setInner] = useState<string[]>(toArray(defaultValue));
  const selected = value !== undefined ? toArray(value) : inner;

  const pick = (v: string) => {
    let next: string[];
    if (v === "") next = [""]; // "Everyone" is exclusive
    else if (multiple) {
      const base = selected.filter((x) => x !== "");
      next = base.includes(v) ? base.filter((x) => x !== v) : [...base, v];
    } else next = [v];
    if (value === undefined) setInner(next);
    onChange?.(next);
  };

  return (
    <div role={multiple ? "group" : "radiogroup"} aria-label={ariaLabel} className={cn("flex flex-wrap gap-2", className)}>
      {everyone && (
        <button
          type="button"
          role={multiple ? undefined : "radio"}
          aria-checked={multiple ? undefined : selected.includes("")}
          aria-pressed={multiple ? selected.includes("") : undefined}
          onClick={() => pick("")}
          className={cn(chipBase, selected.includes("") ? chipOn : chipOff)}
        >
          <span aria-hidden className="text-base leading-none">
            👨‍👩‍👧
          </span>
          {everyoneLabel}
        </button>
      )}
      {kids.map((k) => {
        const on = selected.includes(k.id);
        const tint = k.color ?? "#56c7e0";
        return (
          <button
            key={k.id}
            type="button"
            role={multiple ? undefined : "radio"}
            aria-checked={multiple ? undefined : on}
            aria-pressed={multiple ? on : undefined}
            onClick={() => pick(k.id)}
            className={cn(chipBase, "pl-1.5", on ? chipOn : chipOff)}
          >
            <MiniAvatar kid={k} tint={tint} />
            {k.name}
            {multiple && on && <Check className="h-3.5 w-3.5 text-accent" aria-hidden />}
          </button>
        );
      })}
      {name && selected.map((v) => <input key={v || "_everyone"} type="hidden" name={name} value={v} />)}
    </div>
  );
}

export function MiniAvatar({ kid, tint, size = 32 }: { kid: ChipChild; tint?: string; size?: number }) {
  const color = tint ?? kid.color ?? "#56c7e0";
  if (kid.photo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={kid.photo_url}
        alt=""
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size, boxShadow: `0 0 0 2px ${color}` }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full font-bold leading-none text-white"
      style={{ width: size, height: size, background: color, fontSize: Math.max(14, Math.round(size * 0.5)) }}
    >
      {kid.avatar || kid.name.slice(0, 1).toUpperCase()}
    </span>
  );
}
