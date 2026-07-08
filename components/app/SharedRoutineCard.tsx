import { Card, Badge, Field, Input, Select, Switch } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmSubmit } from "@/components/ui/ConfirmSubmit";
import { Disclosure } from "./Disclosure";
import { ListRow } from "@/components/ui/ListRow";
import { Trash2, Clock, Users } from "lucide-react";
import { formatClock } from "@/lib/kiosk/calendar";
import { childColor } from "@/lib/kiosk/colors";
import {
  updateSharedRoutine,
  deleteSharedRoutine,
  addSharedStep,
  deleteSharedStep,
  upsertOverride,
  clearOverride,
} from "@/app/app/(parent)/schedule/actions";

const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayLabel(days: number[] | null): string {
  if (!days || days.length === 0 || days.length === 7) return "Daily";
  const set = new Set(days);
  if (set.size === 5 && [1, 2, 3, 4, 5].every((d) => set.has(d))) return "Weekdays";
  if (set.size === 2 && set.has(0) && set.has(6)) return "Weekends";
  return [...days].sort((a, b) => a - b).map((d) => DAY_SHORT[d]).join(", ");
}

type SharedRoutine = {
  id: string;
  name: string;
  type: string;
  active: boolean;
  start_time: string | null;
  end_time: string | null;
  sort_order: number;
  days_of_week: number[] | null;
  assigned_child_ids: string[] | null;
  schedule_template_id: string | null;
};
type Kid = { id: string; name: string; color?: string | null };
type Step = { id: string; label: string; icon: string | null; step_type: string; reward_points: number };
type Template = { id: string; name: string; start_time: string | null; end_time: string | null; days_of_week: number[] | null };
type Override = { routine_id: string; child_id: string; time_offset_min: number; enabled: boolean; deleted_at: string | null };

/** Remount key for the main (uncontrolled) form so saved values resync — kept on the
 *  form, NOT the card, so the open Disclosure doesn't snap shut after a save. */

/** One SHARED routine (§2.1): defined once, assigned to many. The collapsed row shows
 *  who + when at a glance; the editor holds assignment, schedule/template, steps, and
 *  the per-child fine-tuning (§2.3) — a small diff, never a duplicate routine. */
export function SharedRoutineCard({
  routine: r,
  steps,
  kids,
  templates,
  overrides,
  version,
}: {
  routine: SharedRoutine;
  steps: Step[];
  kids: Kid[];
  templates: Template[];
  overrides: Override[];
  /** Bumps on save (updated_at) — remounts the main form for defaultValue resync. */
  version?: string;
}) {
  const assigned = new Set(r.assigned_child_ids ?? []);
  const assignedKids = kids.filter((k) => assigned.has(k.id));
  const tpl = templates.find((t) => t.id === r.schedule_template_id) ?? null;
  const winStart = tpl ? tpl.start_time : r.start_time;
  const winEnd = tpl ? tpl.end_time : r.end_time;
  const winDays = tpl ? tpl.days_of_week : r.days_of_week;
  const windowChip = [
    winStart ? formatClock(winStart) : null,
    winEnd ? `– ${formatClock(winEnd)}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Card className="group/disc overflow-hidden p-0 transition-[box-shadow] duration-200 hover:shadow-card-hover">
      <Disclosure
        defaultOpen={false}
        summary={
          <ListRow
            tile="👨‍👩‍👧‍👦"
            dim={!r.active}
            title={
              <>
                <span className="truncate">{r.name}</span>
                <Badge tone="blue">Shared</Badge>
                {!r.active && <Badge tone="neutral">Off</Badge>}
              </>
            }
            subtitle={
              <>
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {assignedKids.length ? assignedKids.map((k) => k.name).join(", ") : "No one yet"}
                </span>
                {(windowChip || tpl) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold tabular-nums text-accent">
                    <Clock className="h-3 w-3" />
                    {tpl ? `${tpl.name}${windowChip ? ` · ${windowChip}` : ""}` : windowChip}
                    {dayLabel(winDays ?? null) !== "Daily" ? ` · ${dayLabel(winDays ?? null)}` : ""}
                  </span>
                )}
                <span>
                  {steps.length} {steps.length === 1 ? "step" : "steps"}
                </span>
              </>
            }
          />
        }
      >
        <div className="space-y-4 px-4 pb-4 pt-1">
          {/* name + active + who + schedule — one save */}
          <form key={version} action={updateSharedRoutine.bind(null, r.id)} className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <input
                name="name"
                defaultValue={r.name}
                aria-label="Routine name"
                className="min-w-0 flex-1 rounded-lg bg-transparent px-1 py-1 text-title text-fg outline-none focus:bg-surface-2"
              />
              <Switch name="active" label="Active" defaultChecked={r.active} />
              <SubmitButton size="sm" variant="secondary">
                Save
              </SubmitButton>
            </div>

            <Field label="Who does this routine?" hint="Set once — it applies to everyone picked.">
              <div className="flex flex-wrap gap-1.5">
                {kids.map((k) => (
                  <label key={k.id} className="cursor-pointer">
                    <input type="checkbox" name="assigned" value={k.id} defaultChecked={assigned.has(k.id)} className="peer sr-only" />
                    <span className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-fg-muted transition peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-fg">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: childColor(k) }} aria-hidden />
                      {k.name}
                    </span>
                  </label>
                ))}
              </div>
            </Field>

            <details className="rounded-xl bg-surface-2 px-3 py-2" open={false}>
              <summary className="cursor-pointer select-none text-sm font-semibold text-accent">Schedule &amp; days</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Field label="Schedule template" hint="Edit the template once — every routine using it follows." className="sm:col-span-3">
                  <Select name="schedule_template_id" defaultValue={r.schedule_template_id ?? ""}>
                    <option value="">Use this routine&apos;s own times</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {t.start_time ? ` (${formatClock(t.start_time)}${t.end_time ? ` – ${formatClock(t.end_time)}` : ""})` : ""}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Starts">
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
                        <span className="inline-flex h-11 min-w-11 items-center justify-center rounded-lg border border-line bg-surface px-2 text-sm font-semibold text-fg-muted transition peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-fg">
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
            {steps.length === 0 && (
              <p className="rounded-xl bg-surface-2 px-3 py-4 text-center text-sm text-fg-muted">
                No steps yet — add the first one below.
              </p>
            )}
            {steps.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface-2 text-lg">{s.icon ?? "•"}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">{s.label}</span>
                {s.reward_points > 0 && <Badge tone="beacon">★ {s.reward_points}</Badge>}
                <form action={deleteSharedStep.bind(null, s.id)}>
                  <ConfirmSubmit message={`Remove "${s.label}"?`} aria-label={`Remove ${s.label}`}>
                    <Trash2 className="h-4 w-4" />
                  </ConfirmSubmit>
                </form>
              </div>
            ))}
          </div>

          {/* add step */}
          <form action={addSharedStep.bind(null, r.id)} className="flex items-center gap-2 border-t border-line pt-3">
            <Input name="icon" placeholder="➕" aria-label="Emoji" className="w-14 shrink-0 text-center text-xl" />
            <Input name="label" placeholder="Add a step…" required className="flex-1" />
            <Input
              name="reward_points"
              type="number"
              min={0}
              max={99}
              defaultValue={1}
              aria-label="Star points"
              title="Star points"
              className="w-16 shrink-0 text-center"
            />
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

          {/* per-child fine-tuning (§2.3) — a small diff, never a duplicate */}
          {assignedKids.length > 0 && (
            <details className="rounded-xl bg-surface-2 px-3 py-2">
              <summary className="cursor-pointer select-none text-sm font-semibold text-accent">
                Fine-tune per child
              </summary>
              <div className="mt-3 space-y-2">
                {assignedKids.map((k) => {
                  const ov = overrides.find((o) => o.routine_id === r.id && o.child_id === k.id && !o.deleted_at);
                  return (
                    <div
                      key={`${k.id}:${ov ? `${ov.time_offset_min}:${ov.enabled}` : "none"}`}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2"
                    >
                      <form
                        action={upsertOverride.bind(null, r.id, k.id)}
                        className="flex min-w-0 flex-1 flex-wrap items-center gap-3"
                      >
                        <span className="inline-flex items-center gap-2 text-sm font-semibold text-fg">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: childColor(k) }} />
                          {k.name}
                        </span>
                        <Field label="Shift (min)" className="w-28">
                          <Input
                            name="time_offset_min"
                            type="number"
                            step={5}
                            min={-720}
                            max={720}
                            defaultValue={ov?.time_offset_min ?? 0}
                          />
                        </Field>
                        <Switch name="enabled" label="On for them" defaultChecked={ov?.enabled ?? true} />
                        <SubmitButton size="sm" variant="secondary">
                          Save
                        </SubmitButton>
                      </form>
                      {ov && (
                        <form action={clearOverride.bind(null, r.id, k.id)}>
                          <ConfirmSubmit
                            message={`Reset ${k.name}'s tweaks for "${r.name}"?`}
                            title="Reset tweaks?"
                            confirmLabel="Reset"
                          >
                            Reset
                          </ConfirmSubmit>
                        </form>
                      )}
                    </div>
                  );
                })}
                <p className="text-xs text-fg-muted">
                  Shift moves the whole window earlier (−) or later (+) for that child only.
                </p>
              </div>
            </details>
          )}

          <div className="flex justify-end">
            <form action={deleteSharedRoutine.bind(null, r.id)}>
              <ConfirmSubmit message={`Delete the shared "${r.name}" routine for everyone?`}>
                <Trash2 className="h-4 w-4" /> Delete routine
              </ConfirmSubmit>
            </form>
          </div>
        </div>
      </Disclosure>
    </Card>
  );
}
