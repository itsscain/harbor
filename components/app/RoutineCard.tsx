"use client";

import { Card, Badge, Field, Input, Select, Switch } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmSubmit } from "@/components/ui/ConfirmSubmit";
import { Disclosure } from "./Disclosure";
import { StepRow } from "./StepRow";
import { Trash2, Clock } from "lucide-react";
import { updateRoutine, addStep, deleteRoutine } from "@/app/app/(parent)/actions";

type Step = {
  id: string;
  label: string;
  icon: string | null;
  step_type: string;
  start_time: string | null;
  duration_min: number | null;
  reward_points: number;
  support_level?: number | null;
};

type Routine = {
  id: string;
  name: string;
  type: string;
  active: boolean;
  start_time: string | null;
  end_time: string | null;
  sort_order: number;
  days_of_week: number[] | null;
};

function routineEmoji(r: Routine): string {
  const n = r.name.toLowerCase();
  if (/(morning|wake)/.test(n)) return "🌅";
  if (/(bed|night|sleep|wind)/.test(n)) return "🌙";
  if (/(school|home ?work)/.test(n)) return "🍎";
  if (/(noon|midday|lunch|day)/.test(n)) return "☀️";
  if (r.type === "first_then") return "🔁";
  return "📋";
}

const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/** One routine as a calm collapsed row (emoji · name · N steps · a soft peek). Tap to
 *  reveal the editor — steps, schedule, add-step, delete. Autosave is preserved by
 *  StepRow; the schedule + name save on their own buttons. */
export function RoutineCard({ routine: r, steps, childId }: { routine: Routine; steps: Step[]; childId: string }) {
  const count = steps.length;
  const peek = steps.slice(0, 5);
  const when = r.start_time ? r.start_time.slice(0, 5) : null;

  return (
    <Card className="p-0">
      <Disclosure
        defaultOpen={false}
        summary={
          <div className="flex items-center gap-3">
            <span className="text-2xl">{routineEmoji(r)}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-title text-harbor">{r.name}</span>
                {!r.active && <Badge tone="neutral">Off</Badge>}
              </div>
              <div className="mt-0.5 flex items-center gap-2.5 text-sm text-muted">
                <span>
                  {count} {count === 1 ? "step" : "steps"}
                </span>
                {when && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {when}
                  </span>
                )}
                {peek.length > 0 && (
                  <span className="flex items-center gap-0.5 opacity-70">
                    {peek.map((s) => (
                      <span key={s.id} className="text-base">
                        {s.icon ?? "•"}
                      </span>
                    ))}
                    {count > peek.length && <span className="text-xs">+{count - peek.length}</span>}
                  </span>
                )}
              </div>
            </div>
          </div>
        }
      >
        <div className="space-y-4 px-4 pb-4 pt-1">
          {/* name + active + schedule */}
          <form action={updateRoutine.bind(null, r.id, childId)} className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <input
                name="name"
                defaultValue={r.name}
                aria-label="Routine name"
                className="min-w-0 flex-1 rounded-lg bg-transparent px-1 py-1 text-title text-harbor outline-none focus:bg-surface-sunken"
              />
              <Switch name="active" label="Active" defaultChecked={r.active} />
              <SubmitButton size="sm" variant="secondary">
                Save
              </SubmitButton>
            </div>
            <details className="rounded-xl bg-surface-sunken px-3 py-2">
              <summary className="cursor-pointer select-none text-sm font-semibold text-water">Schedule &amp; days</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Field label="Starts (time-aware)">
                  <Input name="start_time" type="time" defaultValue={r.start_time ? r.start_time.slice(0, 5) : ""} />
                </Field>
                <Field label="Ends">
                  <Input name="end_time" type="time" defaultValue={r.end_time ? r.end_time.slice(0, 5) : ""} />
                </Field>
                <Field label="Order">
                  <Input name="sort_order" type="number" defaultValue={r.sort_order} className="w-24" />
                </Field>
                <Field label="Days" className="sm:col-span-3">
                  <div className="flex flex-wrap gap-1">
                    {DOW.map((d, i) => (
                      <label key={i} className="cursor-pointer">
                        <input type="checkbox" name="days" value={i} defaultChecked={(r.days_of_week ?? []).includes(i)} className="peer sr-only" />
                        <span className="inline-flex h-11 min-w-11 items-center justify-center rounded-lg border border-harbor-100 bg-white px-2 text-sm font-semibold text-muted transition peer-checked:border-water peer-checked:bg-water peer-checked:text-white">
                          {d}
                        </span>
                      </label>
                    ))}
                  </div>
                </Field>
              </div>
            </details>
          </form>

          {/* steps */}
          <div className="space-y-2">
            {count === 0 && (
              <p className="rounded-xl bg-surface-sunken px-3 py-4 text-center text-sm text-muted">
                No steps yet — add the first one below.
              </p>
            )}
            {steps.map((s, i) => (
              <StepRow key={s.id} step={s} childId={childId} isFirst={i === 0} isLast={i === count - 1} />
            ))}
          </div>

          {/* add step */}
          <form action={addStep.bind(null, r.id, childId)} className="flex items-center gap-2 border-t border-harbor-100 pt-3">
            <Input name="icon" placeholder="➕" aria-label="Emoji" className="w-14 shrink-0 text-center text-xl" />
            <Input name="label" placeholder="Add a step…" required className="flex-1" />
            {r.type === "first_then" ? (
              <Select name="step_type" defaultValue="first" aria-label="First or Then" className="w-28 shrink-0">
                <option value="first">First</option>
                <option value="then">Then</option>
              </Select>
            ) : (
              <input type="hidden" name="step_type" value="task" />
            )}
            <SubmitButton size="sm">Add</SubmitButton>
          </form>

          <div className="flex justify-end">
            <form action={deleteRoutine.bind(null, r.id, childId)}>
              <ConfirmSubmit message={`Delete the "${r.name}" routine and its steps?`}>
                <Trash2 className="h-4 w-4" /> Delete routine
              </ConfirmSubmit>
            </form>
          </div>
        </div>
      </Disclosure>
    </Card>
  );
}
