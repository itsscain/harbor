"use client";

import { useOptimistic, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Sheet, SheetActions } from "@/components/ui/Sheet";
import { ChipGroup, ChildChips, type ChipChild } from "@/components/ui/Chips";
import { Button, Field } from "@/components/ui/primitives";
import { useQuickAction } from "@/components/ui/useQuickAction";
import { HOUSE_MODES, houseModeMeta, type HouseMode, type HouseModeState } from "@/lib/command";
import { setHouseMode } from "@/app/app/(parent)/command/actions";
import { cn } from "@/lib/cn";

const DURATIONS = [
  { value: "0", label: "Until I turn it off" },
  { value: "1", label: "1 hour" },
  { value: "2", label: "2 hours" },
  { value: "3", label: "3 hours" },
];

/** One tap flips every screen in the house into a mode. Options (auto-off, leave one kid out)
 *  live one tap further, in a sheet. */
export function HouseModeBar({ mode, kids }: { mode: HouseModeState; kids: ChipChild[] }) {
  const [active, setActive] = useOptimistic<HouseMode, HouseMode>(mode.mode, (_s, next) => next);
  const { run, pending } = useQuickAction();
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [target, setTarget] = useState<HouseMode>(mode.mode === "normal" ? "bedtime" : mode.mode);
  const [hours, setHours] = useState("0");
  const [except, setExcept] = useState<string[]>(mode.except);

  const apply = (next: HouseMode, h = 0, exceptChildId: string | null = null) => {
    const meta = houseModeMeta(next);
    run(
      async () => {
        const r = await setHouseMode({ mode: next, hours: h, exceptChildId });
        return r.ok ? { ok: true } : { ok: false, error: "Couldn't change the house mode. Try again." };
      },
      {
        optimistic: () => setActive(next),
        success: next === "normal" ? "Back to normal on every screen" : `${meta.emoji} ${meta.label} is on — every screen shows it`,
      },
    );
  };

  const until = mode.until ? new Date(mode.until).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : null;
  const exceptName = mode.except[0] ? kids.find((k) => k.id === mode.except[0])?.name : null;

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {HOUSE_MODES.map((m) => {
          const on = active === m.mode;
          return (
            <button
              key={m.mode}
              type="button"
              aria-pressed={on}
              disabled={pending}
              onClick={() => apply(on && m.mode !== "normal" ? "normal" : m.mode)}
              className={cn(
                "tap flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[15px] font-semibold transition active:scale-[0.97]",
                on ? "text-fg" : "border-line-strong text-fg-muted hover:text-fg",
              )}
              style={on ? { borderColor: m.tint, background: `${m.tint}26` } : undefined}
            >
              <span aria-hidden>{m.emoji}</span> {m.label}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="min-w-0 text-sm text-fg-muted">
          {active === "normal"
            ? "Tap a mode to change every screen at once."
            : `${houseModeMeta(active).wallLine}${until && active === mode.mode ? ` · until ${until}` : ""}${exceptName && active === mode.mode ? ` · not ${exceptName}` : ""}`}
        </p>
        <Button variant="ghost" size="sm" onClick={() => setOptionsOpen(true)} className="shrink-0">
          <SlidersHorizontal className="h-4 w-4" /> Options
        </Button>
      </div>

      <Sheet open={optionsOpen} onClose={() => setOptionsOpen(false)} title="House mode options" description="Pick a mode, how long it lasts, and who sits it out.">
        <div className="space-y-5">
          <Field label="Mode">
            <ChipGroup
              value={target}
              onChange={(v) => setTarget((v[0] as HouseMode) ?? "bedtime")}
              options={HOUSE_MODES.filter((m) => m.mode !== "normal").map((m) => ({ value: m.mode, label: m.label, emoji: m.emoji }))}
            />
          </Field>
          <Field label="Turn off automatically">
            <ChipGroup value={hours} onChange={(v) => setHours(v[0] ?? "0")} options={DURATIONS} />
          </Field>
          {kids.length > 1 && (
            <Field label="Leave someone out (optional)" hint="Their own bedside screen skips this mode.">
              <ChildChips kids={kids} value={except} onChange={(v) => setExcept(v.slice(-1))} />
            </Field>
          )}
          <SheetActions>
            <Button
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => {
                apply(target, Number(hours), except[0] ?? null);
                setOptionsOpen(false);
              }}
            >
              Turn on {houseModeMeta(target).label}
            </Button>
          </SheetActions>
        </div>
      </Sheet>
    </div>
  );
}
