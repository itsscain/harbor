"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Sheet, SheetActions } from "@/components/ui/Sheet";
import { ActionForm, FormError } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ChipGroup } from "@/components/ui/Chips";
import { Stepper } from "@/components/ui/Stepper";
import { Toggle } from "@/components/ui/Toggle";
import { Button, Field, Input } from "@/components/ui/primitives";
import { useQuickAction } from "@/components/ui/useQuickAction";
import { useQuickAdd } from "@/components/app/quick/QuickAdd";
import { calmBreath } from "@/app/app/(parent)/quick-actions";
import { addStarterRoutines } from "@/app/app/(parent)/children/kid-actions";
import { startCorner, endCorner, startGrounding, adjustGrounding, endGrounding } from "@/app/app/(parent)/hub-actions";

const ok = async (fn: () => Promise<unknown>) => {
  await fn();
  return { ok: true } as const;
};

function Tile({ emoji, label, onClick, disabled }: { emoji: string; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="tap flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-2xl border border-line bg-surface px-1 text-center text-sm font-semibold leading-tight text-fg transition hover:border-accent/50 active:scale-[0.97] disabled:opacity-45"
    >
      <span className="text-xl leading-none" aria-hidden>
        {emoji}
      </span>
      {label}
    </button>
  );
}

/** The five things you do for a kid in the moment — one tap each (two for the bigger ones). */
export function KidQuickActions({ kidId, kidName, inBreak, grounded }: { kidId: string; kidName: string; inBreak: boolean; grounded: boolean }) {
  const quick = useQuickAdd();
  const { run, pending } = useQuickAction();
  const [sheet, setSheet] = useState<null | "break" | "ground">(null);
  const [pauseRewards, setPauseRewards] = useState(true);
  const [noScreens, setNoScreens] = useState(true);

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        <Tile emoji="⭐" label="Stars" onClick={() => quick.open("stars", kidId)} />
        <Tile emoji="💬" label="Note" onClick={() => quick.open("note", kidId)} />
        <Tile
          emoji="🌬️"
          label="Calm breath"
          disabled={pending}
          onClick={() => run(() => calmBreath({ childId: kidId }), { success: `Calm breath started on ${kidName}'s wall` })}
        />
        <Tile emoji="🛟" label="Calm-down break" disabled={inBreak} onClick={() => setSheet("break")} />
        <Tile emoji="⛔" label="Grounding" disabled={grounded} onClick={() => setSheet("ground")} />
      </div>

      <Sheet
        open={sheet === "break"}
        onClose={() => setSheet(null)}
        title={`Calm-down break for ${kidName}`}
        description="The wall shows a gentle timer and calming steps. You can end it any time."
      >
        <ActionForm action={startCorner.bind(null, kidId)} success="Calm-down break started" className="space-y-5">
          <Field label="How long?">
            <ChipGroup
              name="minutes"
              defaultValue="5"
              options={[
                { value: "2", label: "2 min" },
                { value: "5", label: "5 min" },
                { value: "10", label: "10 min" },
              ]}
            />
          </Field>
          <Field label="What happened? (optional, just for you)" htmlFor="brk-reason">
            <Input id="brk-reason" name="reason" maxLength={120} placeholder="e.g. upset about screen time ending" />
          </Field>
          <FormError />
          <SheetActions>
            <SubmitButton size="lg" className="w-full sm:w-auto" confirmSaved={false}>
              Start the break
            </SubmitButton>
          </SheetActions>
        </ActionForm>
      </Sheet>

      <Sheet open={sheet === "ground"} onClose={() => setSheet(null)} title={`Ground ${kidName}`} description="A calm, time-limited consequence that shows on the wall.">
        <ActionForm action={startGrounding.bind(null, kidId)} success={`${kidName} is grounded`} className="space-y-5">
          <Field label="For how many days?">
            <Stepper name="days" defaultValue={1} min={1} max={14} presets={[1, 2, 3, 7]} suffix="days" label="Days" />
          </Field>
          <Field label="Why? (optional)" htmlFor="gr-reason" hint="Shown on the wall in plain words.">
            <Input id="gr-reason" name="reason" maxLength={120} placeholder="e.g. hitting his sister" />
          </Field>
          <div className="divide-y divide-line rounded-xl border border-line px-3.5">
            <Toggle checked={pauseRewards} onChange={setPauseRewards} name="pause_rewards" label="Pause the reward store" hint="Stars can still be earned" />
            <Toggle checked={noScreens} onChange={setNoScreens} name="pause_screen_time" label="No screen time" />
          </div>
          <FormError />
          <SheetActions>
            <SubmitButton size="lg" className="w-full sm:w-auto" confirmSaved={false}>
              Start grounding
            </SubmitButton>
          </SheetActions>
        </ActionForm>
      </Sheet>
    </>
  );
}

/** Live status with its one-tap controls. */
export function KidStatusBanners({
  kidId,
  kidName,
  corner,
  grounding,
}: {
  kidId: string;
  kidName: string;
  corner: { id: string; endsAt: string } | null;
  grounding: { id: string; reason: string | null; daysLeft: number } | null;
}) {
  const { run, pending } = useQuickAction();
  if (!corner && !grounding) return null;
  return (
    <div className="mb-4 space-y-2.5">
      {corner && (
        <div className="flex items-center gap-3 rounded-2xl border border-[#7c6cf0]/40 bg-[#7c6cf0]/10 p-4">
          <span className="text-2xl" aria-hidden>
            🛟
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-fg">{kidName} is on a calm-down break</p>
            <p className="text-sm text-fg-muted">
              Until {new Date(corner.endsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </p>
          </div>
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => ok(() => endCorner(corner.id, kidId)), { success: "Break ended" })}>
            End
          </Button>
        </div>
      )}
      {grounding && (
        <div className="rounded-2xl border border-beacon/40 bg-beacon/10 p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden>
              ⛔
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-fg">
                Grounded · {grounding.daysLeft} {grounding.daysLeft === 1 ? "day" : "days"} left
              </p>
              {grounding.reason && <p className="truncate text-sm text-fg-muted">{grounding.reason}</p>}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => run(() => ok(() => adjustGrounding(grounding.id, kidId, -1)), { success: `${kidName} earned a day back` })}
            >
              Earn a day back
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => ok(() => endGrounding(grounding.id, kidId)), { success: "Grounding ended" })}>
              End early
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** A brand-new (or routine-less) kid: one tap sets up their whole day. */
export function KidWelcome({ kidId, kidName }: { kidId: string; kidName: string }) {
  const { run, pending } = useQuickAction();
  return (
    <section className="mb-5 rounded-2xl border border-accent/35 bg-accent/[0.07] p-5">
      <p className="text-eyebrow text-accent">Let&apos;s get started</p>
      <h2 className="mt-1 text-[1.25rem] font-bold text-fg">Set up {kidName}&apos;s day</h2>
      <p className="mt-1 text-[15px] text-fg-muted">
        Start with ready-made 🌅 Morning, 🎒 After school and 🌙 Bedtime routines — each shows up on the wall at the right time, and you can change
        every step.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button size="lg" disabled={pending} onClick={() => run(() => addStarterRoutines(kidId))} className="w-full sm:w-auto">
          <Sparkles className="h-4 w-4" /> Add all three
        </Button>
        <Link
          href={`/app/children/${kidId}?tab=routines&add=1`}
          className="flex min-h-12 items-center justify-center rounded-xl border border-line-strong px-5 text-[15px] font-semibold text-fg transition hover:bg-surface-2"
        >
          Choose my own
        </Link>
      </div>
    </section>
  );
}
