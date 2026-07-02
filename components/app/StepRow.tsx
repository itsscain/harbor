"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ChevronDown, ArrowUp, ArrowDown, Trash2, Plus, X, Sparkles } from "lucide-react";
import { updateStep, moveStep, deleteStep } from "@/app/app/(parent)/actions";
import { Field, Input, Select, Badge } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmSubmit } from "@/components/ui/ConfirmSubmit";
import { cn } from "@/lib/cn";

type StepOption = { icon: string; label: string };
type Step = {
  id: string;
  label: string;
  icon: string | null;
  step_type: string;
  start_time: string | null;
  duration_min: number | null;
  reward_points: number;
  support_level?: number | null;
  kind?: string | null;
  read_aloud?: string | null;
  hint?: string | null;
  why_note?: string | null;
  sensory_note?: string | null;
  // Stored as jsonb — arrives as unknown; normOptions() sanitizes it.
  choice_options?: unknown;
  substeps?: unknown;
};

// The interaction kinds a step can take (§8.2). 'standard' is the plain tap-to-complete.
const KINDS: { value: string; label: string; blurb: string }[] = [
  { value: "standard", label: "Standard", blurb: "Tap to check it off." },
  { value: "timed", label: "Timed", blurb: "Runs a gentle timer for the minutes below." },
  { value: "choice", label: "Choice", blurb: "The child picks one of the options — their call." },
  { value: "substep", label: "Sub-steps", blurb: "Small parts to tick off; all done = step done." },
  { value: "approval", label: "Needs a grown-up", blurb: "A parent PIN is needed before the stars." },
  { value: "together", label: "Together", blurb: "A side-by-side moment; shows on the grown-up's wall too." },
];
const KIND_TONE: Record<string, "blue" | "beacon" | "green" | "amber" | "neutral"> = {
  timed: "blue",
  choice: "green",
  substep: "green",
  approval: "amber",
  together: "beacon",
};

function normOptions(v: unknown): StepOption[] {
  if (!Array.isArray(v)) return [];
  return v.map((o) => {
    const r = (o ?? {}) as Record<string, unknown>;
    return { icon: r.icon ? String(r.icon) : "", label: r.label ? String(r.label) : "" };
  });
}

/** A calm, scannable step row. Collapsed = emoji + label + at-a-glance badges.
 *  Tap to reveal the detail tray (kind, points, timing, scaffolding + advanced
 *  per-step options). Autosaves when focus leaves the row — the explicit Save is the
 *  guaranteed path. Secondary fields stay in the DOM (hidden) so a save never wipes them. */
export function StepRow({
  step,
  childId,
  isFirst,
  isLast,
  routineType = "schedule",
}: {
  step: Step;
  childId: string;
  isFirst: boolean;
  isLast: boolean;
  /** First/Then routines expose the board-position select; schedules don't. */
  routineType?: string;
}) {
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [kind, setKind] = useState(step.kind ?? "standard");
  // A convenience toggle that forces points to 0 for a health / self-care step — not a
  // persisted flag (points===0 is the source of truth), so it starts unchecked.
  const [noPoints, setNoPoints] = useState(false);
  const [choiceOpts, setChoiceOpts] = useState<StepOption[]>(normOptions(step.choice_options));
  const [subOpts, setSubOpts] = useState<StepOption[]>(normOptions(step.substeps));
  const formRef = useRef<HTMLFormElement>(null);

  const markDirty = () => setDirty(true);

  // Bonus: autosave when focus leaves the row. The explicit Save below is the
  // guaranteed path (autosave-on-blur can be missed in some browsers).
  const onBlur = (e: React.FocusEvent<HTMLFormElement>) => {
    const next = e.relatedTarget as Node | null;
    if (dirty && formRef.current && (!next || !formRef.current.contains(next))) {
      formRef.current.requestSubmit();
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-harbor-100 bg-white transition focus-within:border-water/50 focus-within:shadow-card">
      <div className="flex items-start gap-1.5 p-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={`${open ? "Collapse" : "Edit"} ${step.label}`}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-harbor-50 text-2xl ring-1 ring-harbor-100 transition hover:bg-harbor-100 active:scale-95"
        >
          {step.icon ?? "•"}
        </button>

        <form
          ref={formRef}
          action={updateStep.bind(null, step.id, childId)}
          onBlur={onBlur}
          onChange={markDirty}
          onSubmit={() => setDirty(false)}
          className="min-w-0 flex-1"
        >
          <div className="flex min-h-12 items-center gap-2">
            <input
              name="label"
              defaultValue={step.label}
              aria-label="Step label"
              className="min-w-0 flex-1 rounded-md bg-transparent px-1 py-1 text-base font-semibold text-ink outline-none focus:bg-surface-sunken"
            />
            {!open && !dirty && (
              <div className="hidden items-center gap-1.5 sm:flex">
                {kind !== "standard" && <Badge tone={KIND_TONE[kind] ?? "neutral"}>{KINDS.find((k) => k.value === kind)?.label ?? kind}</Badge>}
                {routineType === "first_then" && step.step_type !== "task" && <Badge tone="blue">{step.step_type}</Badge>}
                {step.start_time && <Badge tone="neutral">{step.start_time.slice(0, 5)}</Badge>}
                {step.reward_points > 0 && <Badge tone="beacon">{step.reward_points} pts</Badge>}
              </div>
            )}
            {dirty || open ? (
              <SubmitButton size="sm" variant="secondary" savedText="Saved">Save</SubmitButton>
            ) : (
              <SaveStatus />
            )}
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? "Collapse" : "Expand"}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-harbor-50"
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
            </button>
          </div>

          {/* Detail tray — kept in the DOM (hidden when collapsed) so a save never wipes fields */}
          <div className={cn("mt-2 space-y-3", !open && "hidden")}>
            <div className="grid gap-3 rounded-xl bg-surface-sunken p-3 sm:grid-cols-2">
              <Field label="Emoji"><Input name="icon" defaultValue={step.icon ?? ""} className="text-center text-xl" /></Field>
              <Field label="What kind of step?">
                <Select name="kind" value={kind} onChange={(e) => { setKind(e.target.value); markDirty(); }}>
                  {KINDS.map((k) => (
                    <option key={k.value} value={k.value}>{k.label}</option>
                  ))}
                </Select>
              </Field>

              {/* First/Then board position — only meaningful on a First/Then routine. */}
              {routineType === "first_then" ? (
                <Field label="Board" className="sm:col-span-2">
                  <Select name="step_type" defaultValue={step.step_type}>
                    <option value="task">Task</option>
                    <option value="first">First</option>
                    <option value="then">Then</option>
                  </Select>
                </Field>
              ) : (
                <input type="hidden" name="step_type" value={step.step_type === "task" ? "task" : step.step_type} />
              )}

              {/* Kind-specific helper + editors */}
              <p className="sm:col-span-2 -mt-1 flex items-center gap-1.5 text-xs text-muted">
                <Sparkles className="h-3.5 w-3.5 text-water" />
                {KINDS.find((k) => k.value === kind)?.blurb}
              </p>

              {kind === "choice" && (
                <div className="sm:col-span-2">
                  <OptionsEditor
                    legend="Choices — the child picks one"
                    options={choiceOpts}
                    onChange={(next) => { setChoiceOpts(next); markDirty(); }}
                  />
                  <input type="hidden" name="choice_options" value={JSON.stringify(choiceOpts.filter((o) => o.label.trim()))} />
                </div>
              )}
              {kind === "substep" && (
                <div className="sm:col-span-2">
                  <OptionsEditor
                    legend="Sub-steps — all get ticked off"
                    options={subOpts}
                    onChange={(next) => { setSubOpts(next); markDirty(); }}
                  />
                  <input type="hidden" name="substeps" value={JSON.stringify(subOpts.filter((o) => o.label.trim()))} />
                </div>
              )}

              <Field label={kind === "timed" ? "Minutes (timer)" : "Minutes"}>
                <Input name="duration_min" type="number" min={0} defaultValue={step.duration_min ?? ""} />
              </Field>
              <Field label="Time"><Input name="start_time" type="time" defaultValue={step.start_time ? step.start_time.slice(0, 5) : ""} /></Field>

              <Field label="Points" hint={noPoints ? "No stars — a health / self-care step." : undefined}>
                <Input name="reward_points" type="number" min={0} defaultValue={step.reward_points} disabled={noPoints} />
              </Field>
              <Field label="Support level" hint="Fades as they master it (§ Skill Levels)">
                <Select name="support_level" defaultValue={String(step.support_level ?? 1)}>
                  <option value="1">1 · Full support</option>
                  <option value="2">2 · Fewer prompts</option>
                  <option value="3">3 · Just a reminder</option>
                  <option value="4">4 · On your own</option>
                </Select>
              </Field>

              <label className="sm:col-span-2 flex items-center gap-2 text-xs font-medium text-ink">
                <input
                  type="checkbox"
                  name="no_points"
                  checked={noPoints}
                  onChange={(e) => { setNoPoints(e.target.checked); markDirty(); }}
                  className="h-4 w-4 rounded border-harbor-200 text-water focus:ring-water"
                />
                Health / self-care step — no stars (medication, teeth, meds are never gamified)
              </label>
            </div>

            {/* Advanced, revealed on demand (§8.2) — read-aloud, a hint, why it matters, sensory. */}
            <details className="rounded-xl border border-harbor-100 px-3 py-2">
              <summary className="cursor-pointer select-none text-sm font-semibold text-water">Advanced · voice, hint &amp; notes</summary>
              <div className="mt-3 grid gap-3">
                <Field label="Read-aloud text" hint="Spoken instead of the label when the wall reads it out.">
                  <Input name="read_aloud" defaultValue={step.read_aloud ?? ""} placeholder={step.label} />
                </Field>
                <Field label="Hint" hint="A gentle nudge shown under the step on the wall.">
                  <Input name="hint" defaultValue={step.hint ?? ""} placeholder="e.g. don't forget the top teeth!" />
                </Field>
                <Field label="Why this matters" hint="For you — voiced on request, not shown by default.">
                  <Input name="why_note" defaultValue={step.why_note ?? ""} />
                </Field>
                <Field label="Sensory note" hint="A private note to yourself (never shown to the child).">
                  <Input name="sensory_note" defaultValue={step.sensory_note ?? ""} />
                </Field>
              </div>
            </details>
          </div>
        </form>

        <div className="flex shrink-0 flex-col gap-1">
          <form action={moveStep.bind(null, step.id, childId, "up")}>
            <MoveButton dir="up" disabled={isFirst} label={`Move ${step.label} up`} />
          </form>
          <form action={moveStep.bind(null, step.id, childId, "down")}>
            <MoveButton dir="down" disabled={isLast} label={`Move ${step.label} down`} />
          </form>
        </div>
      </div>

      {/* Delete lives in the expanded footer so collapsed rows stay clean */}
      {open && (
        <div className="flex justify-end border-t border-harbor-100 px-3 py-2">
          <form action={deleteStep.bind(null, step.id, childId)}>
            <ConfirmSubmit message={`Delete "${step.label}"?`} aria-label={`Delete ${step.label}`} className="px-2.5 py-1.5 text-xs">
              <Trash2 className="h-3.5 w-3.5" /> Delete step
            </ConfirmSubmit>
          </form>
        </div>
      )}
    </div>
  );
}

/** A tiny add/remove editor for choice options / sub-steps — icon + label rows.
 *  Serializes into a hidden input on the parent form. */
function OptionsEditor({
  legend,
  options,
  onChange,
}: {
  legend: string;
  options: StepOption[];
  onChange: (next: StepOption[]) => void;
}) {
  const set = (i: number, patch: Partial<StepOption>) =>
    onChange(options.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  const remove = (i: number) => onChange(options.filter((_, j) => j !== i));
  const add = () => onChange([...options, { icon: "", label: "" }]);

  return (
    <div className="rounded-xl border border-harbor-100 bg-white p-3">
      <p className="mb-2 text-sm font-medium text-ink">{legend}</p>
      <div className="space-y-2">
        {options.length === 0 && (
          <p className="text-xs text-muted">No options yet — add a couple below.</p>
        )}
        {options.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              aria-label="Option emoji"
              value={o.icon}
              onChange={(e) => set(i, { icon: e.target.value })}
              className="w-14 shrink-0 text-center text-lg"
              placeholder="🙂"
            />
            <Input
              aria-label="Option label"
              value={o.label}
              onChange={(e) => set(i, { label: e.target.value })}
              className="min-w-0 flex-1"
              placeholder="Option…"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Remove option"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-red-50 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-water transition hover:bg-harbor-50"
      >
        <Plus className="h-4 w-4" /> Add option
      </button>
    </div>
  );
}

/** Reorder control with a synchronous in-flight latch so a double-tap can't
 *  jump a step two positions (moveStep is a relative swap, not idempotent). */
function MoveButton({ dir, disabled, label }: { dir: "up" | "down"; disabled: boolean; label: string }) {
  const { pending } = useFormStatus();
  const submitting = useRef(false);
  useEffect(() => {
    if (!pending) submitting.current = false;
  }, [pending]);
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-label={label}
      onClick={(e) => {
        if (pending || submitting.current) {
          e.preventDefault();
          return;
        }
        submitting.current = true;
      }}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-harbor-100 text-harbor transition hover:bg-harbor-50 disabled:opacity-30"
    >
      {dir === "up" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
    </button>
  );
}

function SaveStatus() {
  const { pending } = useFormStatus();
  const was = useRef(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (pending) {
      was.current = true;
      return;
    }
    if (was.current) {
      was.current = false;
      setSaved(true);
      const t = setTimeout(() => setSaved(false), 1500);
      return () => clearTimeout(t);
    }
  }, [pending]);
  if (!pending && !saved) return null;
  return <span className="shrink-0 text-xs font-medium text-muted">{pending ? "Saving…" : "Saved ✓"}</span>;
}
