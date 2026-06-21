"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ChevronDown, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { updateStep, moveStep, deleteStep } from "@/app/app/(parent)/actions";
import { Field, Input, Select, Badge } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmSubmit } from "@/components/ui/ConfirmSubmit";
import { cn } from "@/lib/cn";

type Step = {
  id: string;
  label: string;
  icon: string | null;
  step_type: string;
  start_time: string | null;
  duration_min: number | null;
  reward_points: number;
};

/** A calm, scannable step row. Collapsed = emoji + label + at-a-glance badges.
 *  Tap to reveal the detail tray. Autosaves when focus leaves the row — no Save
 *  button. Secondary fields stay in the DOM (just hidden) so a save never wipes them. */
export function StepRow({
  step,
  childId,
  isFirst,
  isLast,
}: {
  step: Step;
  childId: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Bonus: autosave when focus leaves the row. The explicit Save below is the
  // guaranteed path (autosave-on-blur can be missed in some browsers).
  const onBlur = (e: React.FocusEvent<HTMLFormElement>) => {
    const next = e.relatedTarget as Node | null;
    if (dirty && formRef.current && (!next || !formRef.current.contains(next))) {
      formRef.current.requestSubmit();
    }
  };

  return (
    <div className="rounded-xl border border-harbor-100 bg-white transition focus-within:border-water/50 focus-within:shadow-card">
      <div className="flex items-center gap-1.5 p-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={`${open ? "Collapse" : "Edit"} ${step.label}`}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface-sunken text-2xl transition hover:bg-harbor-50 active:scale-95"
        >
          {step.icon ?? "•"}
        </button>

        <form
          ref={formRef}
          action={updateStep.bind(null, step.id, childId)}
          onBlur={onBlur}
          onChange={() => setDirty(true)}
          onSubmit={() => setDirty(false)}
          className="min-w-0 flex-1"
        >
          <div className="flex items-center gap-2">
            <input
              name="label"
              defaultValue={step.label}
              aria-label="Step label"
              className="min-w-0 flex-1 rounded-md bg-transparent px-1 py-1 text-base font-semibold text-ink outline-none focus:bg-surface-sunken"
            />
            {!open && !dirty && (
              <div className="hidden items-center gap-1.5 sm:flex">
                {step.step_type !== "task" && <Badge tone="blue">{step.step_type}</Badge>}
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
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-harbor-50"
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
            </button>
          </div>

          <div className={cn(open ? "mt-3 grid gap-3 border-t border-harbor-100 pt-3 sm:grid-cols-2" : "hidden")}>
            <Field label="Emoji"><Input name="icon" defaultValue={step.icon ?? ""} className="text-center text-xl" /></Field>
            <Field label="Type">
              <Select name="step_type" defaultValue={step.step_type}>
                <option value="task">Task</option>
                <option value="first">First</option>
                <option value="then">Then</option>
              </Select>
            </Field>
            <Field label="Time"><Input name="start_time" type="time" defaultValue={step.start_time ? step.start_time.slice(0, 5) : ""} /></Field>
            <Field label="Minutes"><Input name="duration_min" type="number" min={0} defaultValue={step.duration_min ?? ""} /></Field>
            <Field label="Points" className="sm:col-span-2"><Input name="reward_points" type="number" min={0} defaultValue={step.reward_points} /></Field>
          </div>
        </form>

        <div className="flex shrink-0 flex-col gap-1">
          <form action={moveStep.bind(null, step.id, childId, "up")}>
            <button type="submit" disabled={isFirst} aria-label={`Move ${step.label} up`} className="flex h-8 w-8 items-center justify-center rounded-lg border border-harbor-100 text-harbor transition hover:bg-harbor-50 disabled:opacity-30">
              <ArrowUp className="h-4 w-4" />
            </button>
          </form>
          <form action={moveStep.bind(null, step.id, childId, "down")}>
            <button type="submit" disabled={isLast} aria-label={`Move ${step.label} down`} className="flex h-8 w-8 items-center justify-center rounded-lg border border-harbor-100 text-harbor transition hover:bg-harbor-50 disabled:opacity-30">
              <ArrowDown className="h-4 w-4" />
            </button>
          </form>
          <form action={deleteStep.bind(null, step.id, childId)}>
            <ConfirmSubmit message={`Delete "${step.label}"?`} aria-label={`Delete ${step.label}`} className="h-8 w-8 px-0 py-0">
              <Trash2 className="h-4 w-4" />
            </ConfirmSubmit>
          </form>
        </div>
      </div>
    </div>
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
