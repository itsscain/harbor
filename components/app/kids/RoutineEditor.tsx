"use client";

import { useEffect, useOptimistic, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronRight, Eye, Pencil, Plus, X } from "lucide-react";
import { Sheet, SheetActions, useSheetClose } from "@/components/ui/Sheet";
import { ActionForm, FormError } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ChipGroup, ChildChips, type ChipChild } from "@/components/ui/Chips";
import { Stepper } from "@/components/ui/Stepper";
import { DayPicker } from "@/components/ui/DayPicker";
import { EmojiPicker } from "@/components/ui/EmojiPicker";
import { Toggle } from "@/components/ui/Toggle";
import { Button, Field, Input } from "@/components/ui/primitives";
import { useQuickAction } from "@/components/ui/useQuickAction";
import { Disclosure } from "@/components/app/Disclosure";
import { RoutinePreview } from "@/components/app/RoutinePreview";
import { routineEmoji } from "@/lib/routine-emoji";
import { WHEN_PRESETS, presetFor, formatSpan } from "@/lib/routine-presets";
import { cn } from "@/lib/cn";
import type { EditorStep } from "@/lib/kid";
import {
  renameRoutine,
  setRoutineFlag,
  setRoutineWindow,
  setRoutineDays,
  setRoutineKids,
  copyRoutineToKid,
  deleteRoutineSoft,
  restoreRoutine,
  addStepQuick,
  saveStep,
  deleteStepSoft,
  restoreStep,
  reorderSteps,
} from "@/app/app/(parent)/children/kid-actions";

// One routine, one screen: its steps first (the thing you actually change), then when it
// happens, which days, and who does it. Everything saves as you go — no Save buttons to miss.

type EditorRoutine = {
  id: string;
  name: string;
  type: string;
  active: boolean;
  start: string | null;
  end: string | null;
  days: number[] | null;
  strict: boolean;
  kidIds: string[];
  slotName: string | null;
};
type LibraryItem = { id: string; label: string; icon: string | null; points: number };

const KINDS = [
  { value: "standard", label: "Regular", emoji: "✅", hint: "" },
  { value: "approval", label: "Grown-up OK", emoji: "🛡️", hint: "A grown-up enters the wall PIN to check it off." },
  { value: "together", label: "Together", emoji: "🤝", hint: "Marked “Together” — something a grown-up does with them." },
  { value: "choice", label: "Pick one", emoji: "🎲", hint: "They choose one of the options you list." },
  { value: "substep", label: "Has parts", emoji: "🧩", hint: "Small parts they tick off — all done means the step is done." },
] as const;
const kindLabel = (k: string) => (k === "standard" || k === "timed" ? null : (KINDS.find((x) => x.value === k)?.label ?? null));

/** Save the latest value after a pause (and on the way out, so nothing is lost). */
function useDebouncedSave<T>(save: (v: T) => void, ms = 700) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<{ v: T } | null>(null);
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (latest.current) saveRef.current(latest.current.v);
    },
    [],
  );
  return (v: T) => {
    latest.current = { v };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      latest.current = null;
      saveRef.current(v);
    }, ms);
  };
}

function Block({ title, sub, action, children }: { title: string; sub?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-4 rounded-2xl border border-line bg-surface p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-title text-fg">{title}</h2>
          {sub && <p className="mt-0.5 text-sm text-fg-muted">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function RoutineEditor({
  kidId,
  accent,
  routine,
  steps,
  kids,
  library,
}: {
  kidId: string;
  accent: string;
  routine: EditorRoutine;
  steps: EditorStep[];
  kids: ChipChild[];
  library: LibraryItem[];
}) {
  return (
    <>
      <TitleBlock routine={routine} />
      <StepsBlock routine={routine} steps={steps} library={library} />
      <WhenBlock routine={routine} />
      <Block title="Days">
        <DaysPicker routineId={routine.id} days={routine.days} />
      </Block>
      {kids.length > 1 && <WhoBlock routine={routine} kids={kids} />}
      <MoreBlock kidId={kidId} accent={accent} routine={routine} steps={steps} kids={kids} />
    </>
  );
}

// ── Name + on/off ────────────────────────────────────────────────────────────
function TitleBlock({ routine }: { routine: EditorRoutine }) {
  const { run } = useQuickAction();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(routine.name);
  const [active, setActive] = useState(routine.active);

  const commit = () => {
    setEditing(false);
    const n = name.trim();
    if (!n) return setName(routine.name);
    if (n !== routine.name) run(() => renameRoutine(routine.id, n));
  };

  return (
    <header className="mb-4 rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-center gap-3">
        <span className="text-[2rem] leading-none" aria-hidden>
          {routineEmoji({ name, type: routine.type })}
        </span>
        {editing ? (
          <input
            autoFocus
            value={name}
            maxLength={60}
            aria-label="Routine name"
            onChange={(e) => setName(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              } else if (e.key === "Escape") {
                setName(routine.name);
                setEditing(false);
              }
            }}
            className="min-w-0 flex-1 rounded-xl border border-accent bg-surface-2 px-3 py-2 text-xl font-bold text-fg outline-none"
          />
        ) : (
          <button type="button" onClick={() => setEditing(true)} className="group flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left" aria-label={`Rename ${name}`}>
            <h1 className="truncate font-display text-[1.6rem] font-extrabold leading-tight text-fg">{name}</h1>
            <Pencil className="h-4 w-4 shrink-0 text-fg-subtle transition group-hover:text-fg" />
          </button>
        )}
      </div>
      <div className="mt-3 border-t border-line pt-2">
        <Toggle
          checked={active}
          onChange={(v) => {
            setActive(v);
            run(() => setRoutineFlag(routine.id, "active", v));
          }}
          label="Show on the wall"
          hint={active ? "Kids can see it and do it" : "Hidden for now — nothing is deleted"}
        />
      </div>
    </header>
  );
}

// ── Steps ────────────────────────────────────────────────────────────────────
function StepsBlock({ routine, steps, library }: { routine: EditorRoutine; steps: EditorStep[]; library: LibraryItem[] }) {
  const { run, pending } = useQuickAction();
  const [withNew, addTemp] = useOptimistic<EditorStep[], EditorStep>(steps, (cur, s) => [...cur, s]);
  const [gone, hide] = useOptimistic<string[], string>([], (cur, id) => [...cur, id]);
  const [savedOrder, setSavedOrder] = useOptimistic<string[] | null, string[]>(null, (_c, ids) => ids);
  const [reorder, setReorder] = useState<EditorStep[] | null>(null);
  const [editing, setEditing] = useState<EditorStep | null>(null);
  const [text, setText] = useState("");
  const [moreIdeas, setMoreIdeas] = useState(false);
  const isFT = routine.type === "first_then";

  const ordered = savedOrder
    ? (savedOrder.map((id) => withNew.find((s) => s.id === id)).filter(Boolean) as EditorStep[]).concat(withNew.filter((s) => !savedOrder.includes(s.id)))
    : withNew;
  const list = (reorder ?? ordered).filter((s) => !gone.includes(s.id));
  const have = new Set(list.map((s) => s.label.toLowerCase()));
  const ideas = library.filter((l) => !have.has(l.label.toLowerCase()));

  const add = (label: string, icon: string | null, points: number) => {
    const temp: EditorStep = {
      id: `temp-${Date.now()}`,
      label,
      icon,
      points,
      kind: "standard",
      hint: null,
      read_aloud: null,
      options: [],
      step_type: "task",
      order_index: 9999,
    };
    run(() => addStepQuick(routine.id, { label, icon, points }), { optimistic: () => addTemp(temp) });
  };

  const addTyped = () => {
    const label = text.trim();
    if (!label) return;
    const l = label.toLowerCase();
    const match = library.find((x) => x.label.toLowerCase() === l) ?? (l.length >= 4 ? library.find((x) => x.label.toLowerCase().includes(l) || l.includes(x.label.toLowerCase())) : undefined);
    add(label, match?.icon ?? null, match?.points ?? 0);
    setText("");
  };

  const move = (i: number, d: -1 | 1) =>
    setReorder((cur) => {
      if (!cur) return cur;
      const a = [...cur];
      const j = i + d;
      if (j < 0 || j >= a.length) return a;
      [a[i], a[j]] = [a[j], a[i]];
      return a;
    });

  const finishReorder = () => {
    if (!reorder) return;
    const ids = reorder.map((s) => s.id);
    const changed = ids.some((id, i) => id !== ordered[i]?.id);
    setReorder(null);
    if (changed) run(() => reorderSteps(routine.id, ids), { optimistic: () => setSavedOrder(ids) });
  };

  return (
    <Block
      title={isFT ? "First, then" : `Steps · ${list.length}`}
      sub={isFT ? "Do the first thing, then get the second." : list.length === 0 ? "Add the steps in the order they happen." : "Tap a step to change it."}
      action={
        !isFT && list.length >= 2 ? (
          reorder ? (
            <Button size="sm" onClick={finishReorder}>
              Done
            </Button>
          ) : (
            <Button size="sm" variant="secondary" disabled={pending} onClick={() => setReorder(ordered.filter((s) => !s.id.startsWith("temp-")))}>
              Reorder
            </Button>
          )
        ) : undefined
      }
    >
      {list.length > 0 && (
        <ol className="divide-y divide-line overflow-hidden rounded-xl border border-line">
          {list.map((s, i) => {
            const temp = s.id.startsWith("temp-");
            const kl = kindLabel(s.kind);
            const lead = isFT ? (s.step_type === "first" ? "First" : s.step_type === "then" ? "Then" : null) : null;
            return (
              <li key={s.id} className={cn("flex items-center", temp && "opacity-60")}>
                <button
                  type="button"
                  disabled={temp || !!reorder}
                  onClick={() => setEditing(s)}
                  className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-3.5 py-2.5 text-left transition enabled:hover:bg-surface-2"
                >
                  <span className="w-6 shrink-0 text-center text-sm font-semibold tabular-nums text-fg-subtle">{lead ? "" : i + 1}</span>
                  <span className="text-2xl leading-none" aria-hidden>
                    {s.icon ?? "⭐"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-fg">
                      {lead && <span className="text-fg-muted">{lead}: </span>}
                      {s.label}
                    </span>
                    {(kl || s.options.length > 0) && (
                      <span className="block truncate text-sm text-fg-muted">
                        {kl}
                        {s.options.length > 0 && ` · ${s.options.join(", ")}`}
                      </span>
                    )}
                  </span>
                  {s.points > 0 && <span className="shrink-0 text-sm font-bold text-beacon">★ {s.points}</span>}
                  {!reorder && !temp && <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" />}
                </button>
                {reorder && (
                  <div className="flex shrink-0 gap-1 pr-2">
                    <button
                      type="button"
                      aria-label={`Move ${s.label} up`}
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                      className="grid h-11 w-11 place-items-center rounded-xl border border-line text-fg transition hover:bg-surface-2 disabled:opacity-30"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${s.label} down`}
                      disabled={i === list.length - 1}
                      onClick={() => move(i, 1)}
                      className="grid h-11 w-11 place-items-center rounded-xl border border-line text-fg transition hover:bg-surface-2 disabled:opacity-30"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {!isFT && !reorder && (
        <>
          <form
            className={cn("flex gap-2", list.length > 0 && "mt-3")}
            onSubmit={(e) => {
              e.preventDefault();
              addTyped();
            }}
          >
            <Input value={text} onChange={(e) => setText(e.target.value)} maxLength={80} placeholder="Add a step…" aria-label="New step" className="min-w-0 flex-1" />
            <Button type="submit" disabled={!text.trim()} aria-label="Add step">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </form>
          {ideas.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-fg-subtle">Quick add</p>
              <div className="flex flex-wrap gap-1.5">
                {(moreIdeas ? ideas : ideas.slice(0, 8)).map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => add(l.label, l.icon, l.points)}
                    className="tap inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-surface-2/60 px-3 text-sm font-medium text-fg transition hover:border-accent/50 active:scale-[0.97]"
                  >
                    <span aria-hidden>{l.icon}</span> {l.label}
                  </button>
                ))}
                {!moreIdeas && ideas.length > 8 && (
                  <button type="button" onClick={() => setMoreIdeas(true)} className="min-h-10 px-2 text-sm font-semibold text-accent">
                    More ideas
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <Sheet open={!!editing} onClose={() => setEditing(null)} title="Edit step">
        {editing && <StepForm key={editing.id} step={editing} onDelete={hide} />}
      </Sheet>
    </Block>
  );
}

function StepForm({ step, onDelete }: { step: EditorStep; onDelete: (id: string) => void }) {
  const close = useSheetClose();
  const { run, pending } = useQuickAction();
  const [kind, setKind] = useState<string>(step.kind === "timed" ? "standard" : step.kind);
  const [options, setOptions] = useState<string[]>(step.options.length ? step.options : ["", ""]);
  const isTask = step.step_type === "task";
  const hint = KINDS.find((k) => k.value === kind)?.hint;

  return (
    <ActionForm action={saveStep.bind(null, step.id)} success="Step saved" className="space-y-5">
      <div className="flex items-end gap-3">
        <EmojiPicker name="icon" defaultValue={step.icon ?? "⭐"} label="Picture" />
        <Field label="Step" htmlFor="st-label" className="flex-1">
          <Input id="st-label" name="label" required maxLength={80} defaultValue={step.label} />
        </Field>
      </div>
      <Field label="Stars for doing it" hint="Everyday self-care can stay at 0 — finishing the routine is the win.">
        <Stepper name="points" defaultValue={step.points} max={50} presets={[0, 1, 3, 5]} suffix="★" label="Stars" />
      </Field>
      {isTask ? (
        <Field label="What kind of step?">
          <ChipGroup name="kind" value={kind} onChange={(v) => v[0] && setKind(v[0])} options={KINDS.map((k) => ({ value: k.value, label: k.label, emoji: k.emoji }))} />
          {hint && <p className="mt-2 text-sm text-fg-muted">{hint}</p>}
        </Field>
      ) : (
        <input type="hidden" name="kind" value="standard" />
      )}
      {isTask && (kind === "choice" || kind === "substep") && (
        <Field label={kind === "choice" ? "Options to pick from" : "The parts"} hint="Start with an emoji to show a picture, like “🍎 Apple”.">
          <div className="space-y-2">
            {options.map((o, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  name="option"
                  value={o}
                  maxLength={44}
                  placeholder={kind === "choice" ? `Option ${i + 1}` : `Part ${i + 1}`}
                  onChange={(e) => setOptions((cur) => cur.map((x, j) => (j === i ? e.target.value : x)))}
                  className="min-w-0 flex-1"
                />
                <button
                  type="button"
                  aria-label="Remove"
                  onClick={() => setOptions((cur) => cur.filter((_, j) => j !== i))}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-fg-muted transition hover:bg-surface-2 hover:text-fg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {options.length < 8 && (
              <button type="button" onClick={() => setOptions((cur) => [...cur, ""])} className="min-h-10 text-sm font-semibold text-accent">
                + Add {kind === "choice" ? "an option" : "a part"}
              </button>
            )}
          </div>
        </Field>
      )}
      <div className="rounded-xl border border-line">
        <Disclosure summary={<span className="text-[15px] font-semibold text-fg">More options</span>} bodyClassName="space-y-4 px-4 pb-4">
          <Field label="Tip under the step" htmlFor="st-hint" hint="A short helper line shown on the wall.">
            <Input id="st-hint" name="hint" maxLength={140} defaultValue={step.hint ?? ""} placeholder="e.g. Top and bottom, two minutes" />
          </Field>
          <Field label="Say it differently" htmlFor="st-read" hint="What the wall says out loud instead of the step name.">
            <Input id="st-read" name="read_aloud" maxLength={140} defaultValue={step.read_aloud ?? ""} />
          </Field>
        </Disclosure>
      </div>
      <FormError />
      <SheetActions className="sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          className="text-error"
          disabled={pending}
          onClick={() =>
            run(() => deleteStepSoft(step.id), {
              optimistic: () => onDelete(step.id),
              undo: () => restoreStep(step.id),
              onDone: () => close?.(),
            })
          }
        >
          Remove step
        </Button>
        <SubmitButton size="lg" confirmSaved={false}>
          Save step
        </SubmitButton>
      </SheetActions>
    </ActionForm>
  );
}

// ── When ─────────────────────────────────────────────────────────────────────
function WhenBlock({ routine }: { routine: EditorRoutine }) {
  const { run } = useQuickAction();
  const [start, setStart] = useState(routine.start?.slice(0, 5) ?? "");
  const [end, setEnd] = useState(routine.end?.slice(0, 5) ?? "");
  const [slot, setSlot] = useState(routine.slotName);
  const current = !start && !end ? "any" : (presetFor(start, end)?.key ?? "custom");
  const [custom, setCustom] = useState(current === "custom");
  const sel = custom ? "custom" : current;

  const apply = (s: string | null, e: string | null) => {
    setStart(s ?? "");
    setEnd(e ?? "");
    setSlot(null);
    run(() => setRoutineWindow(routine.id, s, e));
  };

  return (
    <Block title="When" sub="It opens on the wall at the start time. If it's missed, they can still finish it later.">
      <ChipGroup
        ariaLabel="When"
        value={sel}
        onChange={(v) => {
          const k = v[0];
          if (!k || k === sel) return;
          if (k === "custom") return setCustom(true);
          setCustom(false);
          if (k === "any") return apply(null, null);
          const p = WHEN_PRESETS.find((x) => x.key === k);
          if (p) apply(p.start, p.end);
        }}
        options={[
          ...WHEN_PRESETS.map((p) => ({ value: p.key, label: p.label, emoji: p.emoji })),
          { value: "any", label: "Any time", emoji: "🕒" },
          { value: "custom", label: "Custom", emoji: "✏️" },
        ]}
      />
      {sel !== "custom" && sel !== "any" && start && end && <p className="mt-2.5 text-sm text-fg-muted">{formatSpan(start, end)}</p>}
      {sel === "custom" && (
        <form
          className="mt-3 grid grid-cols-2 items-end gap-2 sm:flex"
          onSubmit={(e) => {
            e.preventDefault();
            apply(start || null, end || null);
          }}
        >
          <Field label="Opens" htmlFor="re-start">
            <Input id="re-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Closes" htmlFor="re-end">
            <Input id="re-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
          <Button type="submit" variant="secondary" className="col-span-2 sm:mb-0">
            Save time
          </Button>
        </form>
      )}
      {slot && (
        <p className="mt-3 rounded-xl bg-surface-2 px-3.5 py-2.5 text-sm text-fg-muted">
          Uses the family &ldquo;{slot}&rdquo; time. Picking a time here gives this routine its own.
        </p>
      )}
    </Block>
  );
}

// ── Days ─────────────────────────────────────────────────────────────────────
function DaysPicker({ routineId, days }: { routineId: string; days: number[] | null }) {
  const { run } = useQuickAction();
  const save = useDebouncedSave<number[]>((d) => run(() => setRoutineDays(routineId, d)));
  return <DayPicker defaultValue={days} onChange={save} />;
}

// ── Who ──────────────────────────────────────────────────────────────────────
function WhoBlock({ routine, kids }: { routine: EditorRoutine; kids: ChipChild[] }) {
  const { run } = useQuickAction();
  const [who, setWho] = useState<string[]>(routine.kidIds);
  const save = useDebouncedSave<string[]>((ids) => run(() => setRoutineKids(routine.id, ids)));
  return (
    <Block title="Who does it?" sub={who.length >= 2 ? "One routine for all of them — each kid checks off their own steps." : "Pick more than one kid to share it."}>
      <ChildChips
        kids={kids}
        multiple
        value={who}
        onChange={(v) => {
          if (!v.length) return;
          setWho(v);
          save(v);
        }}
      />
    </Block>
  );
}

// ── More ─────────────────────────────────────────────────────────────────────
function MoreBlock({ kidId, accent, routine, steps, kids }: { kidId: string; accent: string; routine: EditorRoutine; steps: EditorStep[]; kids: ChipChild[] }) {
  const router = useRouter();
  const { run, pending } = useQuickAction();
  const [strict, setStrict] = useState(routine.strict);
  const [preview, setPreview] = useState(false);
  const others = kids.filter((k) => !routine.kidIds.includes(k.id));

  const parse = (o: string) => {
    const m = o.match(/^(\p{Extended_Pictographic}[\p{Extended_Pictographic}\u{FE0F}\u{200D}]*)\s*(.*)$/u);
    return m && m[2] ? { icon: m[1], label: m[2] } : { icon: "", label: o };
  };
  const previewSteps = steps.map((s) => ({
    id: s.id,
    label: s.label,
    icon: s.icon,
    reward_points: s.points,
    kind: s.kind,
    step_type: s.step_type,
    hint: s.hint,
    choice_options: s.kind === "choice" ? s.options.map(parse) : null,
    substeps: s.kind === "substep" ? s.options.map(parse) : null,
  }));

  return (
    <section className="mb-4 overflow-hidden rounded-2xl border border-line bg-surface">
      <Disclosure summary={<span className="text-title text-fg">More options</span>} bodyClassName="space-y-5 px-4 pb-5">
        {routine.type !== "first_then" && (
          <div className="rounded-xl border border-line px-3.5">
            <Toggle
              checked={strict}
              onChange={(v) => {
                setStrict(v);
                run(() => setRoutineFlag(routine.id, "strict_order", v));
              }}
              label="Steps go in order"
              hint="They can't skip ahead to a later step"
            />
          </div>
        )}

        <Button variant="secondary" className="w-full" onClick={() => setPreview(true)} disabled={steps.length === 0}>
          <Eye className="h-4 w-4" /> See it like the kids do
        </Button>

        {others.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold text-fg">Copy to another kid</p>
            <div className="flex flex-wrap gap-2">
              {others.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => copyRoutineToKid(routine.id, k.id), { success: `Copied to ${k.name}` })}
                  className="tap inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-[15px] font-semibold text-fg transition hover:border-accent/50 disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" /> {k.name}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-sm text-fg-muted">Makes a separate copy they can change on their own.</p>
          </div>
        )}

        <div className="border-t border-line pt-4">
          <Button
            variant="danger"
            disabled={pending}
            onClick={() =>
              run(() => deleteRoutineSoft(routine.id), {
                undo: () => restoreRoutine(routine.id),
                onDone: () => router.replace(`/app/children/${kidId}?tab=routines`),
              })
            }
          >
            Delete this routine
          </Button>
        </div>
      </Disclosure>

      {preview && (
        <RoutinePreview
          routine={{ name: routine.name, type: routine.type, strict_order: strict }}
          steps={previewSteps}
          accent={accent}
          onClose={() => setPreview(false)}
        />
      )}
    </section>
  );
}
