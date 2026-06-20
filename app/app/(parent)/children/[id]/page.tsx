import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Badge, Input, Field, Select, Button } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { titleCase } from "@/lib/format";
import {
  updateChild,
  deleteChild,
  addRoutine,
  updateRoutine,
  deleteRoutine,
  addStep,
  updateStep,
  deleteStep,
} from "../../actions";
import { updateChildSettings } from "../../hub-actions";

export const dynamic = "force-dynamic";

export default async function ChildDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: child } = await supabase
    .from("children")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!child) notFound();
  const cs = (child.settings ?? {}) as Record<string, unknown>;

  const { data: routines } = await supabase
    .from("routines")
    .select("*")
    .eq("child_id", id)
    .is("deleted_at", null)
    .order("sort_order");

  const routineIds = (routines ?? []).map((r) => r.id);
  const { data: steps } = routineIds.length
    ? await supabase
        .from("routine_steps")
        .select("*")
        .in("routine_id", routineIds)
        .is("deleted_at", null)
        .order("order_index")
    : { data: [] };

  return (
    <>
      <Link
        href="/app"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-harbor"
      >
        <ArrowLeft className="h-4 w-4" /> Home
      </Link>

      <PageHeader title={`${child.avatar ?? "🙂"} ${child.name}`} />

      <Card className="mb-4">
        <h2 className="font-display text-base font-bold text-harbor">Profile</h2>
        <form action={updateChild.bind(null, child.id)} className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <Field label="Name">
            <Input name="name" defaultValue={child.name} required />
          </Field>
          <Field label="Emoji">
            <Input name="avatar" defaultValue={child.avatar ?? ""} className="w-24 text-center text-xl" />
          </Field>
          <div className="flex items-end">
            <SubmitButton variant="secondary">Save</SubmitButton>
          </div>
        </form>
      </Card>

      <Card className="mb-4">
        <h2 className="font-display text-base font-bold text-harbor">Accessibility &amp; wall</h2>
        <p className="text-sm text-muted">How {child.name}&apos;s wall reads, sounds, and feels.</p>
        <form action={updateChildSettings.bind(null, child.id)} className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              { name: "readAloud", label: "Read aloud on tap", def: cs.readAloud !== false },
              { name: "autoRead", label: "Auto-read on open", def: cs.autoRead === true },
              { name: "sound", label: "Success sounds", def: cs.sound !== false },
              { name: "haptics", label: "Vibrate on done", def: cs.haptics !== false },
              { name: "reducedMotion", label: "Reduce motion", def: cs.reducedMotion === true },
            ].map((t) => (
              <label key={t.name} className="flex items-center gap-2 rounded-xl border border-harbor-100 px-3 py-2.5 text-sm font-medium text-ink">
                <input type="checkbox" name={t.name} defaultChecked={t.def} className="h-4 w-4" />
                {t.label}
              </label>
            ))}
          </div>
          <Field label="Wall theme">
            <Select name="theme" defaultValue={typeof cs.theme === "string" ? (cs.theme as string) : "harbor"}>
              <option value="harbor">Deep Harbor</option>
              <option value="water">Mid Water</option>
              <option value="beacon">Beacon</option>
              <option value="seafoam">Seafoam</option>
            </Select>
          </Field>
          <SubmitButton variant="secondary">Save accessibility</SubmitButton>
        </form>
      </Card>

      <div className="mb-2 flex items-center gap-2 text-sm text-muted">
        <RefreshCw className="h-4 w-4" />
        Changes save here and sync to your wall (with Harbor Plus).
      </div>

      {(routines ?? []).map((r) => {
        const rSteps = (steps ?? []).filter((s) => s.routine_id === r.id);
        return (
          <Card key={r.id} className="mb-4">
            <form action={updateRoutine.bind(null, r.id, child.id)} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
                <Field label="Routine name">
                  <Input name="name" defaultValue={r.name} />
                </Field>
                <Field label="Order">
                  <Input name="sort_order" type="number" defaultValue={r.sort_order} className="w-20" />
                </Field>
                <label className="flex items-end gap-2 pb-2.5 text-sm font-medium text-ink">
                  <input type="checkbox" name="active" defaultChecked={r.active} className="h-4 w-4" />
                  Active
                </label>
                <div className="flex items-end">
                  <SubmitButton size="sm" variant="secondary">Save</SubmitButton>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Starts (for time-aware)">
                  <Input name="start_time" type="time" defaultValue={r.start_time ? r.start_time.slice(0, 5) : ""} />
                </Field>
                <Field label="Ends">
                  <Input name="end_time" type="time" defaultValue={r.end_time ? r.end_time.slice(0, 5) : ""} />
                </Field>
                <Field label="Days">
                  <div className="flex flex-wrap gap-1">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d, i) => (
                      <label key={i} className="cursor-pointer">
                        <input type="checkbox" name="days" value={i} defaultChecked={(r.days_of_week ?? []).includes(i)} className="peer sr-only" />
                        <span className="inline-block rounded-lg border border-harbor-100 px-2 py-1.5 text-xs font-semibold text-muted peer-checked:border-water peer-checked:bg-water peer-checked:text-white">
                          {d}
                        </span>
                      </label>
                    ))}
                  </div>
                </Field>
              </div>
            </form>

            <div className="mt-2 flex items-center gap-2">
              <Badge tone="neutral">{titleCase(r.type)}</Badge>
            </div>

            {/* Steps */}
            <div className="mt-4 space-y-2">
              {rSteps.map((s) => (
                <form
                  key={s.id}
                  action={updateStep.bind(null, s.id, child.id)}
                  className="grid grid-cols-12 items-end gap-2 rounded-xl border border-harbor-100 p-3"
                >
                  <Field label="Emoji" className="col-span-3 sm:col-span-1">
                    <Input name="icon" defaultValue={s.icon ?? ""} className="text-center text-xl" />
                  </Field>
                  <Field label="Label" className="col-span-9 sm:col-span-4">
                    <Input name="label" defaultValue={s.label} />
                  </Field>
                  <Field label="Type" className="col-span-5 sm:col-span-2">
                    <Select name="step_type" defaultValue={s.step_type}>
                      <option value="task">Task</option>
                      <option value="first">First</option>
                      <option value="then">Then</option>
                    </Select>
                  </Field>
                  <Field label="Time" className="col-span-4 sm:col-span-1">
                    <Input name="start_time" type="time" defaultValue={s.start_time ? s.start_time.slice(0, 5) : ""} />
                  </Field>
                  <Field label="Mins" className="col-span-3 sm:col-span-1">
                    <Input name="duration_min" type="number" defaultValue={s.duration_min ?? ""} />
                  </Field>
                  <Field label="Order" className="col-span-2 sm:col-span-1">
                    <Input name="order_index" type="number" defaultValue={s.order_index} />
                  </Field>
                  <Field label="Pts" className="col-span-3 sm:col-span-1">
                    <Input name="reward_points" type="number" defaultValue={s.reward_points} />
                  </Field>
                  <div className="col-span-12 flex items-center gap-2 sm:col-span-1">
                    <SubmitButton size="sm" variant="secondary">Save</SubmitButton>
                  </div>
                </form>
              ))}
            </div>

            {/* delete-step buttons (avoid nested forms) */}
            {rSteps.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {rSteps.map((s) => (
                  <form key={s.id} action={deleteStep.bind(null, s.id, child.id)}>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> {s.icon} {s.label}
                    </button>
                  </form>
                ))}
              </div>
            )}

            {/* add step */}
            <form
              action={addStep.bind(null, r.id, child.id)}
              className="mt-4 grid grid-cols-12 items-end gap-2 border-t border-harbor-100 pt-4"
            >
              <Field label="Emoji" className="col-span-3 sm:col-span-1">
                <Input name="icon" placeholder="🪥" className="text-center text-xl" />
              </Field>
              <Field label="New step label" className="col-span-9 sm:col-span-5">
                <Input name="label" placeholder="Brush teeth" required />
              </Field>
              <Field label="Type" className="col-span-5 sm:col-span-2">
                <Select name="step_type" defaultValue={r.type === "first_then" ? "first" : "task"}>
                  <option value="task">Task</option>
                  <option value="first">First</option>
                  <option value="then">Then</option>
                </Select>
              </Field>
              <Field label="Points" className="col-span-4 sm:col-span-2">
                <Input name="reward_points" type="number" defaultValue={0} />
              </Field>
              <div className="col-span-12 sm:col-span-2">
                <SubmitButton size="sm">Add step</SubmitButton>
              </div>
            </form>

            <div className="mt-4 flex justify-end">
              <form action={deleteRoutine.bind(null, r.id, child.id)}>
                <Button type="submit" variant="danger" size="sm">
                  <Trash2 className="h-4 w-4" /> Delete routine
                </Button>
              </form>
            </div>
          </Card>
        );
      })}

      {/* add routine */}
      <Card className="mb-4">
        <h3 className="font-display text-base font-bold text-harbor">Add a routine</h3>
        <form action={addRoutine.bind(null, child.id)} className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <Field label="Name">
            <Input name="name" required placeholder="Morning, Bedtime…" />
          </Field>
          <Field label="Type">
            <Select name="type" defaultValue="schedule">
              <option value="schedule">Schedule (checklist)</option>
              <option value="first_then">First–Then board</option>
            </Select>
          </Field>
          <div className="flex items-end">
            <SubmitButton>Add</SubmitButton>
          </div>
        </form>
      </Card>

      <Card className="border-red-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-red-700">Remove child</h3>
            <p className="text-sm text-muted">Hides this child from the wall.</p>
          </div>
          <form action={deleteChild.bind(null, child.id)}>
            <Button type="submit" variant="danger">Remove</Button>
          </form>
        </div>
      </Card>
    </>
  );
}
