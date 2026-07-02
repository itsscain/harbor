"use client";

import { useState } from "react";
import { Card, Badge, Field, Input, Select, Switch } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmSubmit } from "@/components/ui/ConfirmSubmit";
import { Disclosure } from "./Disclosure";
import { StepRow } from "./StepRow";
import { RoutinePreview } from "./RoutinePreview";
import { ListRow } from "@/components/ui/ListRow";
import { Trash2, Clock, Eye, BookmarkPlus } from "lucide-react";
import { updateRoutine, addStep, deleteRoutine, saveRoutineAsTemplate } from "@/app/app/(parent)/actions";

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function dayLabel(days: number[] | null): string | null {
  if (!days || days.length === 0 || days.length === 7) return "Daily";
  const set = new Set(days);
  if (set.size === 5 && [1, 2, 3, 4, 5].every((d) => set.has(d))) return "Weekdays";
  if (set.size === 2 && set.has(0) && set.has(6)) return "Weekends";
  return [...days].sort((a, b) => a - b).map((d) => DAY_SHORT[d]).join(", ");
}

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
  choice_options?: unknown;
  substeps?: unknown;
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
  schedule_template_id?: string | null;
  strict_order?: boolean | null;
  celebration_style?: string | null;
  sensory_intensity?: string | null;
};

type Template = { id: string; name: string; start_time: string | null; end_time: string | null };
type LibraryStep = { id: string; label: string; icon: string | null; default_points: number; kind: string; category: string | null };

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
export function RoutineCard({
  routine: r,
  steps,
  childId,
  color = "#18606f",
  templates = [],
  library = [],
}: {
  routine: Routine;
  steps: Step[];
  childId: string;
  color?: string;
  /** Household schedule templates (P2 §2.2) — a routine can point at a named window. */
  templates?: Template[];
  /** Curated + household step library (P3 §9) — tap-to-add common steps. */
  library?: LibraryStep[];
}) {
  const [showPreview, setShowPreview] = useState(false);
  const count = steps.length;
  const peek = steps.slice(0, 5);
  const when = r.start_time ? r.start_time.slice(0, 5) : null;
  const days = dayLabel(r.days_of_week);

  return (
    <Card
      className="group/disc overflow-hidden p-0 transition-[box-shadow] duration-200 hover:shadow-card-hover [border-left:3px_solid_transparent] hover:[border-left-color:var(--accent)]"
      style={{ ["--accent" as string]: color }}
    >
      <Disclosure
        defaultOpen={false}
        summary={
          <ListRow
            tile={routineEmoji(r)}
            dim={!r.active}
            title={
              <>
                <span className="truncate">{r.name}</span>
                {!r.active && <Badge tone="neutral">Off</Badge>}
              </>
            }
            subtitle={
              <>
                <span>
                  {count} {count === 1 ? "step" : "steps"}
                </span>
                {(when || (days && days !== "Daily")) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-harbor-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-water">
                    <Clock className="h-3 w-3" />
                    {[when, days && days !== "Daily" ? days : null].filter(Boolean).join(" · ")}
                  </span>
                )}
                {peek.length > 0 && (
                  <span className="hidden items-center gap-1 sm:flex">
                    {peek.map((s) => (
                      <span key={s.id} className="grid h-6 w-6 place-items-center rounded-md bg-surface-sunken text-sm">
                        {s.icon ?? "•"}
                      </span>
                    ))}
                    {count > peek.length && <span className="text-xs font-semibold text-muted">+{count - peek.length}</span>}
                  </span>
                )}
              </>
            }
          />
        }
      >
        <div className="space-y-4 px-4 pb-4 pt-1">
          {/* name + active + schedule */}
          <form action={updateRoutine.bind(null, r.id, childId)} className="space-y-3">
            {/* Marks this as the advanced builder form so updateRoutine writes the
                routine-level options (an unchecked toggle is absent from FormData). */}
            <input type="hidden" name="advanced_present" value="1" />
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
                {templates.length > 0 && (
                  <Field
                    label="Schedule template"
                    hint="When set, the window comes from the template — edit it once, every routine using it follows."
                    className="sm:col-span-3"
                  >
                    <Select name="schedule_template_id" defaultValue={r.schedule_template_id ?? ""}>
                      <option value="">Use this routine&apos;s own times</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
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

            {/* Routine-level power (§8.2), revealed on demand — order, celebration, sensory. */}
            <details className="rounded-xl bg-surface-sunken px-3 py-2">
              <summary className="cursor-pointer select-none text-sm font-semibold text-water">Routine options</summary>
              <div className="mt-3 space-y-3">
                <Switch
                  name="strict_order"
                  label="Do steps in order"
                  hint="Tapping ahead gently nudges back to the current step (never a silent no-op)."
                  defaultChecked={r.strict_order ?? false}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Celebration" hint="How the finish moment plays on the wall.">
                    <Select name="celebration_style" defaultValue={r.celebration_style ?? ""}>
                      <option value="">Auto (match the child)</option>
                      <option value="confetti">Confetti &amp; cheer</option>
                      <option value="voyage">Calm voyage arrival</option>
                      <option value="calm">Quiet &amp; gentle</option>
                    </Select>
                  </Field>
                  <Field label="Sensory intensity" hint="Overrides the child's setting for this routine only.">
                    <Select name="sensory_intensity" defaultValue={r.sensory_intensity ?? ""}>
                      <option value="">Inherit from child</option>
                      <option value="calm">Calm — gentle &amp; minimal</option>
                      <option value="standard">Standard</option>
                      <option value="vivid">Vivid — big &amp; bright</option>
                    </Select>
                  </Field>
                </div>
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
              <StepRow key={s.id} step={s} childId={childId} isFirst={i === 0} isLast={i === count - 1} routineType={r.type} />
            ))}
          </div>

          {/* step library — tap to add a common step (§9). Assembling, not typing. */}
          {library.length > 0 && (
            <details className="rounded-xl bg-surface-sunken px-3 py-2">
              <summary className="cursor-pointer select-none text-sm font-semibold text-water">From the step library</summary>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {library.map((lib) => (
                  <form key={lib.id} action={addStep.bind(null, r.id, childId)}>
                    <input type="hidden" name="label" value={lib.label} />
                    <input type="hidden" name="icon" value={lib.icon ?? ""} />
                    <input type="hidden" name="reward_points" value={lib.default_points} />
                    <input type="hidden" name="kind" value={lib.kind} />
                    <input type="hidden" name="step_type" value="task" />
                    <SubmitButton size="sm" variant="secondary" savedText="Added ✓">
                      <span className="text-base">{lib.icon ?? "•"}</span> {lib.label}
                    </SubmitButton>
                  </form>
                ))}
              </div>
            </details>
          )}

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

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-harbor-100 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                disabled={count === 0}
                className="inline-flex items-center gap-1.5 rounded-xl border border-harbor-100 bg-white px-3 py-1.5 text-sm font-semibold text-harbor transition hover:border-water/40 hover:shadow-card disabled:opacity-50"
              >
                <Eye className="h-4 w-4 text-water" /> See it on the wall
              </button>
              <form action={saveRoutineAsTemplate.bind(null, r.id, childId)}>
                <SubmitButton size="sm" variant="ghost" savedText="Saved ✓">
                  <BookmarkPlus className="h-4 w-4" /> Save as template
                </SubmitButton>
              </form>
            </div>
            <form action={deleteRoutine.bind(null, r.id, childId)}>
              <ConfirmSubmit message={`Delete the "${r.name}" routine and its steps?`}>
                <Trash2 className="h-4 w-4" /> Delete routine
              </ConfirmSubmit>
            </form>
          </div>
        </div>
      </Disclosure>
      {showPreview && (
        <RoutinePreview
          routine={{ name: r.name, type: r.type, strict_order: r.strict_order }}
          steps={steps.map((s) => ({
            id: s.id,
            label: s.label,
            icon: s.icon,
            reward_points: s.reward_points,
            kind: s.kind,
            step_type: s.step_type,
            hint: s.hint,
            choice_options: s.choice_options,
            substeps: s.substeps,
          }))}
          accent={color}
          onClose={() => setShowPreview(false)}
        />
      )}
    </Card>
  );
}
