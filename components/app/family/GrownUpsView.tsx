"use client";

import { useOptimistic, useState } from "react";
import { ChevronRight, Plus, X } from "lucide-react";
import { Sheet, SheetActions, useSheetClose } from "@/components/ui/Sheet";
import { ActionForm, FormError } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ChipGroup, ChildChips, MiniAvatar, type ChipChild } from "@/components/ui/Chips";
import { EmojiPicker } from "@/components/ui/EmojiPicker";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { DayPicker } from "@/components/ui/DayPicker";
import { Toggle } from "@/components/ui/Toggle";
import { Button, Field, Input } from "@/components/ui/primitives";
import { useQuickAction } from "@/components/ui/useQuickAction";
import {
  inviteGrownUp,
  removeGrownUp,
  savePerson,
  deletePersonSoft,
  restorePerson,
  savePersonRoutine,
  deletePersonRoutineSoft,
  restorePersonRoutine,
  addPersonStepQuick,
  deletePersonStepSoft,
  restorePersonStep,
} from "@/app/app/(parent)/family/family-actions";
import { cn } from "@/lib/cn";

export type AppMember = { profileId: string; email: string; isOwner: boolean };
export type PersonStep = { id: string; label: string; icon: string | null };
export type PersonRoutine = { id: string; name: string; active: boolean; withChildId: string | null; days: number[] | null; steps: PersonStep[] };
export type Person = { id: string; name: string; avatar: string | null; role: string; color: string | null; photo_url: string | null; routines: PersonRoutine[] };

const ROLE_LABEL: Record<string, string> = { parent: "Parent", caregiver: "Caregiver", sibling: "Older sibling" };

export function GrownUpsView({
  members,
  isOwner,
  invitesAvailable,
  people,
  kids,
}: {
  members: AppMember[];
  isOwner: boolean;
  invitesAvailable: boolean;
  people: Person[];
  kids: ChipChild[];
}) {
  const { run, pending } = useQuickAction();
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<AppMember | null>(null);
  const [openPerson, setOpenPerson] = useState<Person | "new" | null>(null);
  const [goneMembers, hideMember] = useOptimistic<string[], string>([], (cur, id) => [...cur, id]);
  const [gonePeople, hidePerson] = useOptimistic<string[], string>([], (cur, id) => [...cur, id]);

  return (
    <>
      <section className="mb-8">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-title text-fg">Who has the app</h2>
          {isOwner && invitesAvailable && (
            <Button size="sm" variant="secondary" onClick={() => setInviting(true)}>
              <Plus className="h-4 w-4" /> Invite
            </Button>
          )}
        </div>
        <p className="mb-3 text-sm text-fg-muted">Each grown-up signs in with their own email and sees the same family.</p>
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {members
            .filter((m) => !goneMembers.includes(m.profileId))
            .map((m) => (
              <li key={m.profileId} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-fg">{m.email}</span>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold", m.isOwner ? "bg-beacon/15 text-beacon" : "bg-surface-2 text-fg-muted")}>
                  {m.isOwner ? "Owner" : "Grown-up"}
                </span>
                {isOwner && !m.isOwner && (
                  <button
                    type="button"
                    onClick={() => setRemoving(m)}
                    aria-label={`Remove ${m.email}`}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-fg-subtle transition hover:bg-error/10 hover:text-error"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          {members.length === 0 && <li className="px-4 py-3 text-sm text-fg-muted">Just you so far.</li>}
        </ul>
        {!isOwner && <p className="mt-2 text-sm text-fg-muted">Only the family&apos;s owner can invite or remove grown-ups.</p>}
        {isOwner && !invitesAvailable && <p className="mt-2 text-sm text-fg-muted">Inviting works on the live app.</p>}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-title text-fg">On the wall</h2>
          <Button size="sm" variant="secondary" onClick={() => setOpenPerson("new")}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        <p className="mb-3 text-sm text-fg-muted">Parents, caregivers or older siblings with their own routine on the wall — kids love seeing you do yours. No stars for grown-ups.</p>
        {people.filter((p) => !gonePeople.includes(p.id)).length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line-strong px-4 py-4 text-sm text-fg-muted">No grown-ups on the wall yet.</p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {people
              .filter((p) => !gonePeople.includes(p.id))
              .map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => setOpenPerson(p)} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-2">
                    <MiniAvatar kid={{ id: p.id, name: p.name, avatar: p.avatar, photo_url: p.photo_url, color: p.color }} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-fg">{p.name}</span>
                      <span className="block truncate text-sm text-fg-muted">
                        {ROLE_LABEL[p.role] ?? "Grown-up"} · {p.routines.length} {p.routines.length === 1 ? "routine" : "routines"}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" />
                  </button>
                </li>
              ))}
          </ul>
        )}
      </section>

      <Sheet open={inviting} onClose={() => setInviting(false)} title="Invite a grown-up" description="They'll get an email to make their sign-in.">
        <ActionForm action={inviteGrownUp} className="space-y-5">
          <Field label="Their email" htmlFor="inv-email">
            <Input id="inv-email" name="email" type="email" required autoComplete="off" placeholder="partner@example.com" data-autofocus />
          </Field>
          <FormError />
          <SheetActions>
            <SubmitButton size="lg" className="w-full sm:w-auto" confirmSaved={false}>
              Send invite
            </SubmitButton>
          </SheetActions>
        </ActionForm>
      </Sheet>

      <Sheet open={!!removing} onClose={() => setRemoving(null)} title={`Remove ${removing?.email ?? ""}?`} description="They'll lose access to your family's Harbor right away. You can invite them again later.">
        <SheetActions>
          <Button variant="ghost" onClick={() => setRemoving(null)}>
            Keep them
          </Button>
          <Button
            variant="danger"
            size="lg"
            disabled={pending}
            onClick={() => {
              const m = removing;
              if (!m) return;
              run(() => removeGrownUp(m.profileId), { optimistic: () => hideMember(m.profileId), onDone: () => setRemoving(null) });
            }}
          >
            Remove
          </Button>
        </SheetActions>
      </Sheet>

      <Sheet open={!!openPerson} onClose={() => setOpenPerson(null)} title={openPerson === "new" ? "Add a grown-up to the wall" : (openPerson?.name ?? "")}>
        {openPerson && <PersonPanel key={openPerson === "new" ? "new" : openPerson.id} person={openPerson === "new" ? null : openPerson} kids={kids} onDelete={hidePerson} />}
      </Sheet>
    </>
  );
}

function PersonPanel({ person, kids, onDelete }: { person: Person | null; kids: ChipChild[]; onDelete: (id: string) => void }) {
  const close = useSheetClose();
  const { run, pending } = useQuickAction();
  const [routine, setRoutine] = useState<PersonRoutine | "new" | null>(null);
  const [goneR, hideR] = useOptimistic<string[], string>([], (cur, id) => [...cur, id]);

  return (
    <div className="space-y-6 pb-1">
      <ActionForm action={savePerson.bind(null, person?.id ?? null)} closeOnSuccess={!person} className="space-y-5">
        <div className="flex items-end gap-3">
          <EmojiPicker name="avatar" defaultValue={person?.avatar ?? "💙"} label="Face" />
          <Field label="Name" htmlFor="pp-name" className="flex-1">
            <Input id="pp-name" name="name" required maxLength={40} defaultValue={person?.name ?? ""} placeholder="Mom, Dad, Grandma…" data-autofocus={!person || undefined} />
          </Field>
        </div>
        <Field label="Who are they?">
          <ChipGroup
            name="role"
            defaultValue={person?.role ?? "parent"}
            options={[
              { value: "parent", label: "Parent" },
              { value: "caregiver", label: "Caregiver" },
              { value: "sibling", label: "Older sibling" },
            ]}
          />
        </Field>
        <Field label="Their color">
          <ColorPicker name="color" defaultValue={person?.color} />
        </Field>
        <FormError />
        <SubmitButton variant={person ? "secondary" : "primary"} size={person ? "md" : "lg"} className={person ? undefined : "w-full sm:w-auto"}>
          {person ? "Save" : "Add to the wall"}
        </SubmitButton>
      </ActionForm>

      {person && (
        <>
          <section>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="font-semibold text-fg">Their routines</h3>
              <Button size="sm" variant="secondary" onClick={() => setRoutine("new")}>
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
            {person.routines.filter((r) => !goneR.includes(r.id)).length === 0 ? (
              <p className="rounded-xl border border-dashed border-line-strong px-3.5 py-3 text-sm text-fg-muted">No routine yet — like “Wind-down” or “Morning”.</p>
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                {person.routines
                  .filter((r) => !goneR.includes(r.id))
                  .map((r) => (
                    <li key={r.id}>
                      <button type="button" onClick={() => setRoutine(r)} className={cn("flex min-h-14 w-full items-center gap-3 px-3.5 py-2.5 text-left transition hover:bg-surface-2", !r.active && "opacity-60")}>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-fg">{r.name}</span>
                          <span className="block truncate text-sm text-fg-muted">
                            {r.steps.length} {r.steps.length === 1 ? "step" : "steps"}
                            {r.withChildId && ` · together with ${kids.find((k) => k.id === r.withChildId)?.name ?? "a kid"}`}
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" />
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </section>
          <div className="border-t border-line pt-4">
            <Button
              variant="ghost"
              className="text-error"
              disabled={pending}
              onClick={() => run(() => deletePersonSoft(person.id), { optimistic: () => onDelete(person.id), undo: () => restorePerson(person.id), onDone: () => close?.() })}
            >
              Remove {person.name} from the wall
            </Button>
          </div>
        </>
      )}

      <Sheet open={!!routine} onClose={() => setRoutine(null)} title={routine === "new" ? "Add a routine" : (routine?.name ?? "")}>
        {routine && person && <PersonRoutinePanel key={routine === "new" ? "new" : routine.id} personId={person.id} routine={routine === "new" ? null : routine} kids={kids} onDelete={hideR} />}
      </Sheet>
    </div>
  );
}

function PersonRoutinePanel({ personId, routine, kids, onDelete }: { personId: string; routine: PersonRoutine | null; kids: ChipChild[]; onDelete: (id: string) => void }) {
  const close = useSheetClose();
  const { run, pending } = useQuickAction();
  const [active, setActive] = useState(routine?.active ?? true);
  const [text, setText] = useState("");
  const [goneS, hideS] = useOptimistic<string[], string>([], (cur, id) => [...cur, id]);
  const [newSteps, addS] = useOptimistic<PersonStep[], PersonStep>([], (cur, s) => [...cur, s]);
  const steps = [...(routine?.steps ?? []), ...newSteps].filter((s) => !goneS.includes(s.id));

  return (
    <div className="space-y-6 pb-1">
      <ActionForm action={savePersonRoutine.bind(null, routine?.id ?? null, personId)} closeOnSuccess={!routine} className="space-y-5">
        <Field label="Routine" htmlFor="pr-name">
          <Input id="pr-name" name="name" required maxLength={60} defaultValue={routine?.name ?? ""} placeholder="Wind-down, Morning, Self-care…" data-autofocus={!routine || undefined} />
        </Field>
        {kids.length > 0 && (
          <Field label="Do it together with a kid? (optional)">
            <ChildChips name="with_child_id" kids={kids} everyone everyoneLabel="Just me" everyoneEmoji="🙋" defaultValue={routine?.withChildId ?? ""} />
          </Field>
        )}
        <Field label="Days">
          <DayPicker name="days" defaultValue={routine?.days ?? null} />
        </Field>
        {routine && (
          <div className="rounded-xl border border-line px-3.5">
            <Toggle checked={active} onChange={setActive} name="active" label="Show on the wall" />
          </div>
        )}
        <FormError />
        <SubmitButton variant={routine ? "secondary" : "primary"} size={routine ? "md" : "lg"} className={routine ? undefined : "w-full sm:w-auto"}>
          {routine ? "Save" : "Add routine"}
        </SubmitButton>
      </ActionForm>

      {routine && (
        <>
          <section>
            <h3 className="mb-2 font-semibold text-fg">Steps</h3>
            {steps.length > 0 && (
              <ul className="mb-3 divide-y divide-line overflow-hidden rounded-xl border border-line">
                {steps.map((s) => (
                  <li key={s.id} className={cn("flex min-h-12 items-center gap-3 pl-3.5", s.id.startsWith("temp-") && "opacity-60")}>
                    <span className="text-xl leading-none" aria-hidden>
                      {s.icon ?? "•"}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[15px] text-fg">{s.label}</span>
                    <button
                      type="button"
                      disabled={s.id.startsWith("temp-")}
                      aria-label={`Remove ${s.label}`}
                      onClick={() => run(() => deletePersonStepSoft(s.id), { optimistic: () => hideS(s.id), undo: () => restorePersonStep(s.id) })}
                      className="grid h-12 w-12 shrink-0 place-items-center text-fg-subtle transition hover:text-error"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const label = text.trim();
                if (!label) return;
                setText("");
                run(() => addPersonStepQuick(routine.id, label, null), { optimistic: () => addS({ id: `temp-${Date.now()}`, label, icon: null }) });
              }}
            >
              <Input value={text} onChange={(e) => setText(e.target.value)} maxLength={80} placeholder="Add a step…" aria-label="New step" className="min-w-0 flex-1" />
              <Button type="submit" disabled={!text.trim()}>
                <Plus className="h-4 w-4" /> Add
              </Button>
            </form>
          </section>
          <div className="border-t border-line pt-4">
            <Button
              variant="ghost"
              className="text-error"
              disabled={pending}
              onClick={() => run(() => deletePersonRoutineSoft(routine.id), { optimistic: () => onDelete(routine.id), undo: () => restorePersonRoutine(routine.id), onDone: () => close?.() })}
            >
              Remove this routine
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
