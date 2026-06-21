import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, Input, Field, Select, Switch } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmSubmit } from "@/components/ui/ConfirmSubmit";
import { StepRow } from "@/components/app/StepRow";
import { titleCase } from "@/lib/format";
import {
  updateChild,
  deleteChild,
  addRoutine,
  addRoutineFromTemplate,
  updateRoutine,
  deleteRoutine,
  addStep,
} from "../../actions";
import { updateChildSettings } from "../../hub-actions";
import { CHILD_PALETTE, childColor } from "@/lib/kiosk/colors";

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

  const color = childColor(child);
  const colorName = CHILD_PALETTE.find((p) => p.value === color)?.name;

  return (
    <>
      <Link
        href="/app/children"
        className="mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 -ml-2.5 text-sm font-semibold text-muted transition hover:bg-harbor-50 hover:text-harbor"
      >
        <ArrowLeft className="h-4 w-4" /> Children
      </Link>

      {/* Colored hero */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-harbor-100 shadow-card animate-enter">
        <div className="flex items-center gap-4 p-5" style={{ background: color + "14" }}>
          <span
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-3xl"
            style={{ background: color + "26", boxShadow: `inset 0 0 0 3px ${color}` }}
          >
            {child.avatar ?? "🙂"}
          </span>
          <div className="min-w-0">
            <p className="text-eyebrow text-muted">Child profile</p>
            <h1 className="truncate text-display text-harbor">{child.name}</h1>
            {colorName && (
              <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} /> {colorName}
              </span>
            )}
          </div>
        </div>
      </div>

      <Card className="mb-4">
        <h2 className="text-title text-harbor">Profile</h2>
        <form action={updateChild.bind(null, child.id)} className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Field label="Name">
              <Input name="name" defaultValue={child.name} required />
            </Field>
            <Field label="Emoji">
              <Input name="avatar" defaultValue={child.avatar ?? ""} className="w-24 text-center text-xl" />
            </Field>
          </div>
          <Field label="Color" hint="Shows on the wall calendar, tiles, and routine board.">
            <div className="flex flex-wrap gap-2">
              {CHILD_PALETTE.map((p) => (
                <label key={p.value} className="flex h-11 w-11 cursor-pointer items-center justify-center" title={p.name}>
                  <input
                    type="radio"
                    name="color"
                    value={p.value}
                    defaultChecked={childColor(child) === p.value}
                    className="peer sr-only"
                  />
                  <span
                    className="block h-7 w-7 rounded-full ring-2 ring-transparent ring-offset-2 transition-transform peer-checked:scale-110 peer-checked:ring-harbor"
                    style={{ backgroundColor: p.value }}
                  />
                </label>
              ))}
            </div>
          </Field>
          <SubmitButton variant="secondary">Save</SubmitButton>
        </form>
      </Card>

      <Card className="mb-4">
        <h2 className="text-title text-harbor">Accessibility &amp; wall</h2>
        <p className="text-sm text-muted">How {child.name}&apos;s wall reads, sounds, and feels.</p>
        <form action={updateChildSettings.bind(null, child.id)} className="mt-3 space-y-3">
          <div className="divide-y divide-harbor-100 rounded-xl border border-harbor-100">
            {[
              { name: "readAloud", label: "Read aloud on tap", hint: "Speak each step when tapped", def: cs.readAloud !== false },
              { name: "autoRead", label: "Auto-read on open", hint: "Read the routine aloud automatically", def: cs.autoRead === true },
              { name: "sound", label: "Success sounds", hint: "Play a chime on completion", def: cs.sound !== false },
              { name: "haptics", label: "Vibrate on done", hint: "Gentle buzz when a step is finished", def: cs.haptics !== false },
              { name: "reducedMotion", label: "Reduce motion", hint: "Calmer, minimal animation", def: cs.reducedMotion === true },
            ].map((t) => (
              <div key={t.name} className="px-3.5 py-3">
                <Switch name={t.name} label={t.label} hint={t.hint} defaultChecked={t.def} />
              </div>
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
            {/* Routine header */}
            <form action={updateRoutine.bind(null, r.id, child.id)} className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  name="name"
                  defaultValue={r.name}
                  aria-label="Routine name"
                  className="min-w-0 flex-1 rounded-lg bg-transparent px-1 py-1 text-title text-harbor outline-none focus:bg-surface-sunken"
                />
                <Badge tone="neutral">{titleCase(r.type)}</Badge>
                <Switch name="active" label="Active" defaultChecked={r.active} />
                <SubmitButton size="sm" variant="secondary">Save</SubmitButton>
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
                      {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d, i) => (
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

            {/* Steps */}
            <div className="mt-4 space-y-2">
              {rSteps.length === 0 && (
                <p className="rounded-xl bg-surface-sunken px-3 py-4 text-center text-sm text-muted">
                  No steps yet — add the first one below.
                </p>
              )}
              {rSteps.map((s, i) => (
                <StepRow key={s.id} step={s} childId={child.id} isFirst={i === 0} isLast={i === rSteps.length - 1} />
              ))}
            </div>

            {/* add step — one quiet affordance */}
            <form
              action={addStep.bind(null, r.id, child.id)}
              className="mt-3 flex items-center gap-2 border-t border-harbor-100 pt-3"
            >
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

            <div className="mt-4 flex justify-end">
              <form action={deleteRoutine.bind(null, r.id, child.id)}>
                <ConfirmSubmit message={`Delete the "${r.name}" routine and its steps?`}>
                  <Trash2 className="h-4 w-4" /> Delete routine
                </ConfirmSubmit>
              </form>
            </div>
          </Card>
        );
      })}

      {/* add routine */}
      <Card className="mb-4">
        <h3 className="text-title text-harbor">Add a routine</h3>
        <p className="mt-1 text-sm text-muted">Start from a template — fills in the steps for you:</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            ["morning", "🌅 Morning"],
            ["bedtime", "🌙 Bedtime"],
            ["afterschool", "🍎 After school"],
            ["firstthen", "🔁 First / Then"],
          ].map(([key, label]) => (
            <form key={key} action={addRoutineFromTemplate.bind(null, child.id)}>
              <input type="hidden" name="template" value={key} />
              <SubmitButton size="sm" variant="secondary" savedText="Added">
                {label}
              </SubmitButton>
            </form>
          ))}
        </div>
        <p className="mt-4 text-sm font-semibold text-harbor">…or build your own:</p>
        <form action={addRoutine.bind(null, child.id)} className="mt-2 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
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
            <h3 className="text-title text-red-700">Remove child</h3>
            <p className="text-sm text-muted">Hides this child from the wall.</p>
          </div>
          <form action={deleteChild.bind(null, child.id)}>
            <ConfirmSubmit
              message={`Remove ${child.name}? This hides them and all their routines from the wall.`}
            >
              Remove
            </ConfirmSubmit>
          </form>
        </div>
      </Card>
    </>
  );
}
