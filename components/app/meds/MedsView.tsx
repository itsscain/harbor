"use client";

import { useOptimistic, useState } from "react";
import { Check, ChevronRight, Plus } from "lucide-react";
import { Sheet, SheetActions, useSheetClose } from "@/components/ui/Sheet";
import { ActionForm, FormError } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { MiniAvatar } from "@/components/ui/Chips";
import { EmojiPicker } from "@/components/ui/EmojiPicker";
import { TimeList } from "@/components/ui/TimeList";
import { DayPicker } from "@/components/ui/DayPicker";
import { Toggle } from "@/components/ui/Toggle";
import { Button, Field, Input } from "@/components/ui/primitives";
import { useQuickAction } from "@/components/ui/useQuickAction";
import { Disclosure } from "@/components/app/Disclosure";
import { markDoseGiven, undoDoseGiven } from "@/app/app/(parent)/quick-actions";
import { saveMedication, deleteMedicationSoft, restoreMedication } from "@/app/app/(parent)/medication/med-actions";
import type { MedKid, MedRow, MedLogDay, DoseToday } from "@/lib/meds";
import { cn } from "@/lib/cn";

type Editing = { childId: string; childName: string; med: MedRow | null } | null;

export function MedsView({ kids, log }: { kids: MedKid[]; log: MedLogDay[] }) {
  const { run } = useQuickAction();
  const [editing, setEditing] = useState<Editing>(null);
  const [given, markGiven] = useOptimistic<string[], string>([], (cur, k) => [...cur, k]);
  const [gone, hide] = useOptimistic<string[], string>([], (cur, k) => [...cur, k]);

  const give = (m: MedRow, d: DoseToday) =>
    run(() => markDoseGiven({ medicationId: m.id, childId: m.childId, time: d.time }), {
      optimistic: () => markGiven(`${m.id}:${d.time}`),
      undo: () => undoDoseGiven({ medicationId: m.id, time: d.time }),
      success: `${m.name} (${d.label}) marked as given`,
    });

  const doseChip = (m: MedRow, d: DoseToday) => {
    const isGiven = d.status === "given" || given.includes(`${m.id}:${d.time}`);
    if (isGiven)
      return (
        <span key={d.time} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-good/15 px-3 text-sm font-semibold text-good">
          <Check className="h-4 w-4" strokeWidth={3} /> {d.label}
          {d.givenLabel && <span className="font-normal text-fg-muted">· {d.givenLabel}</span>}
        </span>
      );
    return (
      <button
        key={d.time}
        type="button"
        onClick={() => give(m, d)}
        className={cn(
          "tap inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition active:scale-[0.97]",
          d.status === "due" ? "border-accent bg-accent text-accent-fg" : d.status === "missed" ? "border-beacon/50 bg-beacon/10 text-fg" : "border-line-strong text-fg-muted hover:text-fg",
        )}
      >
        {d.label} · {d.status === "missed" ? "Not logged — mark given" : "Mark given"}
      </button>
    );
  };

  return (
    <>
      {kids.length === 0 && <p className="rounded-2xl border border-line bg-surface p-5 text-fg-muted">Add a child first — then you can add their medicine.</p>}

      <div className="space-y-7">
        {kids.map((k) => {
          const meds = k.meds.filter((m) => !gone.includes(m.id));
          return (
            <section key={k.id}>
              <div className="mb-2.5 flex items-center gap-3">
                <MiniAvatar kid={k} size={36} />
                <h2 className="min-w-0 flex-1 truncate text-title text-fg">{k.name}</h2>
                <Button size="sm" variant="secondary" onClick={() => setEditing({ childId: k.id, childName: k.name, med: null })}>
                  <Plus className="h-4 w-4" /> Add medicine
                </Button>
              </div>
              {meds.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-line-strong px-4 py-4 text-sm text-fg-muted">No medicine for {k.name}.</p>
              ) : (
                <ul className="space-y-2.5">
                  {meds.map((m) => (
                    <li key={m.id} className={cn("overflow-hidden rounded-2xl border border-line bg-surface", !m.active && "opacity-70")}>
                      <button type="button" onClick={() => setEditing({ childId: k.id, childName: k.name, med: m })} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-2">
                        <span className="text-2xl leading-none" aria-hidden>
                          {m.icon ?? "💊"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate font-semibold text-fg">{m.name}</span>
                            {m.dose && <span className="shrink-0 text-sm text-fg-muted">{m.dose}</span>}
                            {!m.active && <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-fg-muted">Paused</span>}
                          </span>
                          <span className="block truncate text-sm text-fg-muted">{m.scheduleLabel}</span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" />
                      </button>
                      {m.today.length > 0 && (
                        <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
                          <span className="sr-only">Today:</span>
                          {m.today.map((d) => doseChip(m, d))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <section className="mt-8 overflow-hidden rounded-2xl border border-line bg-surface">
        <Disclosure
          summary={
            <span>
              <span className="block text-title text-fg">Dose log</span>
              <span className="block text-sm text-fg-muted">The last two weeks — handy for the doctor</span>
            </span>
          }
          bodyClassName="px-4 pb-4"
        >
          {log.length === 0 ? (
            <p className="text-sm text-fg-muted">No doses logged yet.</p>
          ) : (
            <div className="space-y-4">
              {log.map((day) => (
                <div key={day.key}>
                  <p className="mb-1 text-sm font-semibold text-fg">{day.label}</p>
                  <ul className="space-y-1">
                    {day.entries.map((e) => (
                      <li key={e.id} className="flex items-baseline gap-2 text-sm">
                        <span className="w-[4.5rem] shrink-0 tabular-nums text-fg-muted">{e.at}</span>
                        <span className="min-w-0 text-fg">
                          {e.icon ?? "💊"} {e.medName}
                          {kids.length > 1 && <span className="text-fg-muted"> · {e.kidName}</span>}
                          <span className="text-fg-muted">
                            {e.doseLabel && ` · ${e.doseLabel} dose`} · {e.by}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Disclosure>
      </section>

      <p className="mt-6 text-sm text-fg-subtle">
        Harbor tracks and gently reminds — it doesn’t dispense or dose. A grown-up is always in charge of medicine. This is support, not medical advice.
      </p>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing?.med ? `Edit ${editing.med.name}` : `Add medicine for ${editing?.childName ?? ""}`}>
        {editing && <MedForm key={editing.med?.id ?? `new:${editing.childId}`} childId={editing.childId} med={editing.med} onDelete={(id) => hide(id)} />}
      </Sheet>
    </>
  );
}

function MedForm({ childId, med, onDelete }: { childId: string; med: MedRow | null; onDelete: (id: string) => void }) {
  const close = useSheetClose();
  const { run, pending } = useQuickAction();
  const [parentGives, setParentGives] = useState(med?.parentGives ?? true);
  const [withFood, setWithFood] = useState(med?.withFood ?? false);
  const [active, setActive] = useState(med?.active ?? true);

  return (
    <ActionForm action={saveMedication.bind(null, med?.id ?? null, childId)} className="space-y-5">
      <div className="flex items-end gap-3">
        <EmojiPicker name="icon" defaultValue={med?.icon ?? "💊"} label="Icon" />
        <Field label="Medicine" htmlFor="md-name" className="flex-1">
          <Input id="md-name" name="name" required maxLength={60} defaultValue={med?.name ?? ""} placeholder="Name" data-autofocus />
        </Field>
      </div>
      <Field label="Dose (optional)" htmlFor="md-dose">
        <Input id="md-dose" name="dose" maxLength={40} defaultValue={med?.dose ?? ""} placeholder="5 mg, 1 tablet" />
      </Field>
      <Field label="When is it taken?">
        <TimeList name="times" defaultValue={med?.times ?? []} presets={["07:30", "12:00", "15:30", "20:00"]} addLabel="Add a time" />
      </Field>
      <Field label="Which days?">
        <DayPicker name="days" defaultValue={med?.days ?? null} />
      </Field>
      <div className="divide-y divide-line rounded-xl border border-line px-3.5">
        <Toggle checked={parentGives} onChange={setParentGives} name="parent_administered" label="A grown-up gives it" hint="The wall asks for your PIN to log it" className="py-2" />
        <Toggle checked={withFood} onChange={setWithFood} name="with_food" label="Take with food" className="py-2" />
      </div>
      <div className="rounded-xl border border-line">
        <Disclosure summary={<span className="text-[15px] font-semibold text-fg">More options</span>} bodyClassName="space-y-4 px-4 pb-4">
          <Field label="A kind note for your child (optional)" htmlFor="md-note" hint="Shown on the wall with the medicine.">
            <Input id="md-note" name="helps_note" maxLength={140} defaultValue={med?.helpsNote ?? ""} placeholder="This helps your body feel steady." />
          </Field>
          {med && <Toggle checked={active} onChange={setActive} name="active" label="Show on the wall" hint={active ? "Reminders are on" : "Paused — nothing is deleted"} />}
        </Disclosure>
      </div>
      <FormError />
      <SheetActions className={med ? "sm:justify-between" : undefined}>
        {med && (
          <Button
            type="button"
            variant="ghost"
            className="text-error"
            disabled={pending}
            onClick={() =>
              run(() => deleteMedicationSoft(med.id), {
                optimistic: () => onDelete(med.id),
                undo: () => restoreMedication(med.id),
                onDone: () => close?.(),
              })
            }
          >
            Remove
          </Button>
        )}
        <SubmitButton size="lg" className={med ? undefined : "w-full sm:w-auto"} confirmSaved={false}>
          {med ? "Save" : "Add medicine"}
        </SubmitButton>
      </SheetActions>
    </ActionForm>
  );
}
