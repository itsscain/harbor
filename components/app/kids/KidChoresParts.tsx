"use client";

import { useOptimistic, useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus, ShieldCheck, Repeat, Gift } from "lucide-react";
import { Sheet, SheetActions, useSheetClose } from "@/components/ui/Sheet";
import { ActionForm, FormError } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ChildChips, type ChipChild } from "@/components/ui/Chips";
import { Stepper } from "@/components/ui/Stepper";
import { DayPicker } from "@/components/ui/DayPicker";
import { EmojiPicker } from "@/components/ui/EmojiPicker";
import { Toggle } from "@/components/ui/Toggle";
import { Button, Field, Input } from "@/components/ui/primitives";
import { useQuickAction } from "@/components/ui/useQuickAction";
import { useQuickAdd } from "@/components/app/quick/QuickAdd";
import { setStarsTo, saveChore, deleteChoreSoft, restoreChore } from "@/app/app/(parent)/children/kid-actions";
import type { KidChoreRow } from "@/lib/kid";

/** Stars: the balance, one button to give/take, and "Set to…" for fixing a count that's off. */
export function KidStarsCard({ kidId, kidName, stars, storeCount }: { kidId: string; kidName: string; stars: number; storeCount: number }) {
  const quick = useQuickAdd();
  const { run, pending } = useQuickAction();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(stars);

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-center gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-beacon/15 text-3xl" aria-hidden>
          ⭐
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[2rem] font-extrabold leading-none tabular-nums text-fg">{stars}</p>
          <p className="mt-1 text-sm text-fg-muted">stars to spend</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button onClick={() => quick.open("stars", kidId)}>Give or take</Button>
        <Button
          variant="secondary"
          onClick={() => {
            setTarget(stars);
            setOpen(true);
          }}
        >
          Set to…
        </Button>
      </div>
      <Link
        href="/app/store"
        className="mt-3 flex min-h-11 items-center gap-2 rounded-xl px-1 text-sm font-semibold text-fg-muted transition hover:text-fg"
      >
        <Gift className="h-4 w-4" />
        <span className="flex-1">Reward store{storeCount ? ` · ${storeCount} ${storeCount === 1 ? "reward" : "rewards"}` : ""}</span>
        <ChevronRight className="h-4 w-4" />
      </Link>

      <Sheet open={open} onClose={() => setOpen(false)} title={`Set ${kidName}'s stars`} description="For fixing a count that's off. It's logged like any other change.">
        <div className="space-y-5 pb-1">
          <Stepper value={target} onChange={setTarget} min={0} max={9999} presets={[0, 10, 25, 50]} suffix="★" label="Stars" />
          <SheetActions>
            <Button
              size="lg"
              className="w-full sm:w-auto"
              disabled={pending || target === stars}
              onClick={() => run(() => setStarsTo(kidId, target), { onDone: () => setOpen(false) })}
            >
              Set to {target} stars
            </Button>
          </SheetActions>
        </div>
      </Sheet>
    </section>
  );
}

/** The kid's chores as calm rows; the editor lives behind the row. */
export function KidChoreList({ kidId, kidName, chores, kids }: { kidId: string; kidName: string; chores: KidChoreRow[]; kids: ChipChild[] }) {
  const quick = useQuickAdd();
  const [editing, setEditing] = useState<KidChoreRow | null>(null);
  const [gone, hide] = useOptimistic<string[], string>([], (cur, id) => [...cur, id]);
  const shown = chores.filter((c) => !gone.includes(c.id));

  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h2 className="text-title text-fg">Chores</h2>
        <Button size="sm" variant="secondary" onClick={() => quick.open("chore", kidId)}>
          <Plus className="h-4 w-4" /> Add a chore
        </Button>
      </div>
      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-strong p-6 text-center">
          <p className="text-2xl" aria-hidden>
            🧹
          </p>
          <p className="mt-1 font-semibold text-fg">No chores yet</p>
          <p className="mt-0.5 text-sm text-fg-muted">Jobs {kidName} checks off on the wall to earn stars.</p>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {shown.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => setEditing(c)} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-2">
                <span className="text-2xl leading-none" aria-hidden>
                  {c.icon ?? "✅"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-fg">{c.title}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-fg-muted">
                    <span>{c.daysLabel}</span>
                    {c.turnsWith.length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Repeat className="h-3.5 w-3.5" /> Takes turns with {c.turnsWith.join(", ")}
                      </span>
                    )}
                    {c.requiresApproval && (
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5" /> Grown-up OK
                      </span>
                    )}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-bold text-beacon">★ {c.points}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={!!editing} onClose={() => setEditing(null)} title="Edit chore">
        {editing && <ChoreEditForm key={editing.id} chore={editing} kids={kids} onDelete={hide} />}
      </Sheet>
    </section>
  );
}

function ChoreEditForm({ chore, kids, onDelete }: { chore: KidChoreRow; kids: ChipChild[]; onDelete: (id: string) => void }) {
  const close = useSheetClose();
  const { run, pending } = useQuickAction();
  const [who, setWho] = useState<string[]>(chore.kidIds);
  const [approval, setApproval] = useState(chore.requiresApproval);

  return (
    <ActionForm action={saveChore.bind(null, chore.id)} success="Chore saved" className="space-y-5">
      <div className="flex items-end gap-3">
        <EmojiPicker name="icon" defaultValue={chore.icon ?? "✅"} label="Icon" />
        <Field label="Chore" htmlFor="ch-title" className="flex-1">
          <Input id="ch-title" name="title" required maxLength={80} defaultValue={chore.title} />
        </Field>
      </div>
      {kids.length > 1 && (
        <Field label="Who does it?" hint={who.length >= 2 ? "They'll take turns, one week each." : undefined}>
          <ChildChips name="child_ids" kids={kids} multiple value={who} onChange={(v) => v.length && setWho(v)} />
        </Field>
      )}
      {kids.length <= 1 && who.map((id) => <input key={id} type="hidden" name="child_ids" value={id} />)}
      <Field label="Stars">
        <Stepper name="points" defaultValue={chore.points} max={50} presets={[1, 3, 5, 10]} suffix="★" label="Stars" />
      </Field>
      <Field label="Days">
        <DayPicker name="days" defaultValue={chore.days} />
      </Field>
      <div className="rounded-xl border border-line px-3.5">
        <Toggle checked={approval} onChange={setApproval} name="requires_approval" label="Needs a grown-up's OK" hint="A grown-up enters the wall PIN to check it off." />
      </div>
      <FormError />
      <SheetActions className="sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          className="text-error"
          disabled={pending}
          onClick={() =>
            run(() => deleteChoreSoft(chore.id), {
              optimistic: () => onDelete(chore.id),
              undo: () => restoreChore(chore.id),
              onDone: () => close?.(),
            })
          }
        >
          Delete
        </Button>
        <SubmitButton size="lg" confirmSaved={false}>
          Save
        </SubmitButton>
      </SheetActions>
    </ActionForm>
  );
}
