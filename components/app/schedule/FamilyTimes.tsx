"use client";

import { useOptimistic, useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { Sheet, SheetActions, useSheetClose } from "@/components/ui/Sheet";
import { ActionForm, FormError } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { DayPicker } from "@/components/ui/DayPicker";
import { Button, Field, Input } from "@/components/ui/primitives";
import { useQuickAction } from "@/components/ui/useQuickAction";
import { saveFamilyTime, deleteFamilyTime, restoreFamilyTime } from "@/app/app/(parent)/schedule/actions";

export type FamilyTime = { id: string; name: string; start: string | null; end: string | null; days: number[] | null; label: string; following: number };

/** Shared times several routines can follow — change one and they all move. */
export function FamilyTimes({ times }: { times: FamilyTime[] }) {
  const [editing, setEditing] = useState<FamilyTime | "new" | null>(null);
  const [gone, hide] = useOptimistic<string[], string>([], (cur, id) => [...cur, id]);
  const shown = times.filter((t) => !gone.includes(t.id));

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-title text-fg">Family times</h2>
        <Button size="sm" variant="secondary" onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>
      <p className="mb-3 text-sm text-fg-muted">A shared time several routines can follow. Change it once and they all move.</p>
      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line-strong px-4 py-4 text-sm text-fg-muted">
          None yet. Try “School morning 7:00–7:45” for everyone&apos;s morning routines.
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {shown.map((t) => (
            <li key={t.id}>
              <button type="button" onClick={() => setEditing(t)} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-2">
                <span className="text-2xl leading-none" aria-hidden>
                  👪
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-fg">{t.name}</span>
                  <span className="block truncate text-sm text-fg-muted">
                    {t.label}
                    {t.following > 0 && ` · ${t.following} ${t.following === 1 ? "routine" : "routines"}`}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Add a family time" : "Edit family time"}>
        {editing && <TimeForm key={editing === "new" ? "new" : editing.id} time={editing === "new" ? null : editing} onDelete={hide} />}
      </Sheet>
    </section>
  );
}

function TimeForm({ time, onDelete }: { time: FamilyTime | null; onDelete: (id: string) => void }) {
  const close = useSheetClose();
  const { run, pending } = useQuickAction();
  return (
    <ActionForm action={saveFamilyTime.bind(null, time?.id ?? null)} className="space-y-5">
      <Field label="Name" htmlFor="ft-name">
        <Input id="ft-name" name="name" required maxLength={40} defaultValue={time?.name ?? ""} placeholder="School morning" data-autofocus />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Starts" htmlFor="ft-start">
          <Input id="ft-start" name="start_time" type="time" defaultValue={time?.start?.slice(0, 5) ?? "07:00"} />
        </Field>
        <Field label="Ends" htmlFor="ft-end">
          <Input id="ft-end" name="end_time" type="time" defaultValue={time?.end?.slice(0, 5) ?? "07:45"} />
        </Field>
      </div>
      <Field label="Days">
        <DayPicker name="days" defaultValue={time?.days ?? [1, 2, 3, 4, 5]} />
      </Field>
      {time && time.following > 0 && (
        <p className="text-sm text-fg-muted">
          {time.following} {time.following === 1 ? "routine follows" : "routines follow"} this time — saving moves {time.following === 1 ? "it" : "them"} too.
        </p>
      )}
      <FormError />
      <SheetActions className={time ? "sm:justify-between" : undefined}>
        {time && (
          <Button
            type="button"
            variant="ghost"
            className="text-error"
            disabled={pending}
            onClick={() => {
              let linked: string[] = [];
              run(
                async () => {
                  const r = await deleteFamilyTime(time.id);
                  if (r.ok) linked = r.ids ?? [];
                  return r;
                },
                { optimistic: () => onDelete(time.id), undo: () => restoreFamilyTime(time.id, linked), onDone: () => close?.() },
              );
            }}
          >
            Remove
          </Button>
        )}
        <SubmitButton size="lg" className={time ? undefined : "w-full sm:w-auto"} confirmSaved={false}>
          {time ? "Save" : "Add"}
        </SubmitButton>
      </SheetActions>
    </ActionForm>
  );
}
