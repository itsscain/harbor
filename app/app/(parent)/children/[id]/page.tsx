import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2, RefreshCw, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, Input, Field, Select, Switch } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmSubmit } from "@/components/ui/ConfirmSubmit";
import { StepRow } from "@/components/app/StepRow";
import { GroundingCard } from "@/components/app/GroundingCard";
import { ChildPhotoField } from "@/components/app/ChildPhotoField";
import { SuggestChoresButton } from "@/components/app/SuggestChoresButton";
import { AiProfileCard, type AiProfile } from "@/components/app/AiProfileCard";
import { titleCase } from "@/lib/format";
import {
  updateChild,
  deleteChild,
  deleteChildPermanently,
  addRoutine,
  addRoutineFromTemplate,
  addGradeRoutines,
  updateRoutine,
  deleteRoutine,
  addStep,
  createChore,
  updateChore,
  deleteChore,
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

  const { data: grounding } = await supabase
    .from("groundings")
    .select("*")
    .eq("child_id", id)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: chores } = await supabase
    .from("chores")
    .select("*")
    .eq("child_id", id)
    .is("deleted_at", null)
    .order("sort_order");

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
        <div className="mt-3 border-b border-harbor-100 pb-4">
          <ChildPhotoField
            childId={child.id}
            name={child.name}
            photoUrl={child.photo_url}
            color={child.color ?? "#18606f"}
          />
        </div>
        <form action={updateChild.bind(null, child.id)} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Field label="Name">
              <Input name="name" defaultValue={child.name} required />
            </Field>
            <Field label="Emoji" hint="Used on the wall if no photo is set.">
              <Input name="avatar" defaultValue={child.avatar ?? ""} className="w-24 text-center text-xl" />
            </Field>
          </div>
          <Field label="Birthday" hint="Drives a “N sleeps until their birthday” countdown on the wall.">
            <Input name="birthday" type="date" defaultValue={child.birthday ?? ""} className="w-full sm:w-56" />
          </Field>
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
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Wall theme">
              <Select name="theme" defaultValue={typeof cs.theme === "string" ? (cs.theme as string) : "harbor"}>
                <option value="harbor">Deep Harbor</option>
                <option value="water">Mid Water</option>
                <option value="beacon">Beacon</option>
                <option value="seafoam">Seafoam</option>
              </Select>
            </Field>
            <Field label="Bedtime" hint="Shows a visual countdown to bed on the wall.">
              <Input name="bedtime" type="time" defaultValue={typeof cs.bedtime === "string" ? (cs.bedtime as string) : ""} />
            </Field>
          </div>
          <SubmitButton variant="secondary">Save accessibility</SubmitButton>
        </form>
      </Card>

      <div className="mb-4">
        <GroundingCard
          childId={child.id}
          childName={child.name}
          grounding={
            grounding
              ? {
                  ...grounding,
                  privileges_lost:
                    Array.isArray(grounding.privileges_lost) && grounding.privileges_lost.every((x) => typeof x === "string")
                      ? (grounding.privileges_lost as string[])
                      : null,
                }
              : null
          }
        />
      </div>

      {/* Chores */}
      <Card className="mb-4">
        <h3 className="text-title text-harbor">Chores</h3>
        <p className="mt-1 text-sm text-muted">
          Tasks {child.name} checks off on the wall to earn stars. They show on the family chore board.
        </p>
        <div className="mt-3">
          <SuggestChoresButton childId={child.id} />
        </div>
        {(chores ?? []).length > 0 ? (
          <div className="mt-3 space-y-2">
            {(chores ?? []).map((ch) => {
              const days = (ch.days_of_week ?? []) as number[];
              const rotating = Array.isArray(ch.rotation_member_ids) && ch.rotation_member_ids.length >= 2;
              return (
                <div key={ch.id} className="rounded-xl border border-harbor-100 p-3">
                  {/* key on updated_at: after a save the row remounts so the day
                      checkboxes (uncontrolled) re-sync to the saved selection. */}
                  <form key={ch.updated_at} action={updateChore.bind(null, ch.id, child.id)} className="space-y-2.5">
                    <div className="flex items-end gap-2">
                      <Input name="icon" defaultValue={ch.icon ?? "✅"} aria-label="Icon" className="w-14 shrink-0 text-center text-xl" />
                      <Input name="title" defaultValue={ch.title} aria-label="Chore name" className="min-w-0 flex-1" />
                      <Input name="points" type="number" min={0} defaultValue={ch.points} aria-label="Stars" className="w-16 shrink-0" />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
                        <label key={i} className="cursor-pointer">
                          <input type="checkbox" name="days" value={i} defaultChecked={days.includes(i)} className="peer sr-only" />
                          <span className="flex h-8 w-10 items-center justify-center rounded-lg border border-harbor-100 text-xs font-semibold text-muted transition peer-checked:border-water peer-checked:bg-water/10 peer-checked:text-water">
                            {d.slice(0, 2)}
                          </span>
                        </label>
                      ))}
                      <div className="ml-auto">
                        <SubmitButton size="sm" variant="secondary">Save</SubmitButton>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-medium text-ink">
                      <input type="checkbox" name="approval" defaultChecked={ch.requires_approval ?? false} className="h-4 w-4 rounded border-harbor-200 text-water focus:ring-water" />
                      Needs a grown-up&apos;s OK to check off
                    </label>
                    {rotating && (
                      <p className="flex items-center gap-1 text-xs font-medium text-water">
                        <RefreshCw className="h-3 w-3" aria-hidden="true" /> Rotates between the kids each week
                      </p>
                    )}
                  </form>
                  <div className="mt-2 border-t border-harbor-50 pt-2 text-right">
                    <form action={deleteChore.bind(null, ch.id, child.id)} className="inline">
                      <ConfirmSubmit message={`Delete "${ch.title}"?`} aria-label={`Delete ${ch.title}`} className="px-2.5 py-1.5 text-xs">
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </ConfirmSubmit>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">No chores yet — add the first one below.</p>
        )}
        <form action={createChore.bind(null, child.id)} className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto]">
            <Field label="Icon">
              <Input name="icon" defaultValue="✅" className="w-16 text-center text-xl" />
            </Field>
            <Field label="Chore">
              <Input name="title" required placeholder="Feed the dog, dishes…" />
            </Field>
            <Field label="Stars">
              <Input name="points" type="number" min={0} defaultValue={5} className="w-20" />
            </Field>
          </div>
          <Field label="Days" hint="Leave all unchecked for every day.">
            <div className="flex flex-wrap gap-1.5">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
                <label key={i} className="cursor-pointer">
                  <input type="checkbox" name="days" value={i} className="peer sr-only" />
                  <span className="flex h-9 w-12 items-center justify-center rounded-lg border border-harbor-100 text-sm font-semibold text-muted transition peer-checked:border-water peer-checked:bg-water/10 peer-checked:text-water">
                    {d}
                  </span>
                </label>
              ))}
            </div>
          </Field>
          <label className="flex items-center gap-2.5 rounded-xl border border-harbor-100 px-3.5 py-3 text-sm font-medium text-ink">
            <input type="checkbox" name="rotate" className="h-4 w-4 rounded border-harbor-200 text-water focus:ring-water" />
            <span className="flex items-center gap-1.5">
              <RefreshCw className="h-4 w-4 text-water" /> Rotate between all the kids each week
            </span>
          </label>
          <label className="flex items-center gap-2.5 rounded-xl border border-harbor-100 px-3.5 py-3 text-sm font-medium text-ink">
            <input type="checkbox" name="approval" className="h-4 w-4 rounded border-harbor-200 text-water focus:ring-water" />
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-water" /> Needs a grown-up&apos;s OK to check off
            </span>
          </label>
          <SubmitButton variant="secondary">Add chore</SubmitButton>
        </form>
      </Card>

      <div className="mb-4">
        <AiProfileCard
          childId={child.id}
          childName={child.name}
          profile={(child.ai_profile as AiProfile) ?? null}
        />
      </div>

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
        <p className="mt-1 text-sm text-muted">Quick start by grade — adds Morning, After school &amp; Bedtime, tuned for their age:</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            ["kindergarten", "🎒 Kindergarten"],
            ["grade2", "✏️ 2nd grade"],
            ["grade4", "📚 4th grade"],
          ].map(([key, label]) => (
            <form key={key} action={addGradeRoutines.bind(null, child.id)}>
              <input type="hidden" name="grade" value={key} />
              <SubmitButton size="sm" variant="beacon" savedText="Added">{label}</SubmitButton>
            </form>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted">Or add a single routine from a template:</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            ["morning", "🌅 Morning"],
            ["midday", "☀️ Summer day"],
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
        <h3 className="text-title text-red-700">Danger zone</h3>
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-ink">Hide from the wall</p>
              <p className="text-sm text-muted">Removes {child.name} from the wall and app. Their data is kept.</p>
            </div>
            <form action={deleteChild.bind(null, child.id)}>
              <ConfirmSubmit
                title={`Hide ${child.name}?`}
                confirmLabel="Hide"
                message={`${child.name} will disappear from the wall and app, but their routines and history are kept.`}
              >
                Hide
              </ConfirmSubmit>
            </form>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-red-100 pt-3">
            <div>
              <p className="font-semibold text-ink">Delete permanently</p>
              <p className="text-sm text-muted">Erases {child.name} and all their routines, points, and history. Can&apos;t be undone.</p>
            </div>
            <form action={deleteChildPermanently.bind(null, child.id)}>
              <ConfirmSubmit
                title={`Delete ${child.name} forever?`}
                confirmLabel="Delete forever"
                message={`This permanently erases ${child.name} and ALL their routines, rewards, points, and history from Harbor. This cannot be undone.`}
              >
                Delete
              </ConfirmSubmit>
            </form>
          </div>
        </div>
      </Card>
    </>
  );
}
