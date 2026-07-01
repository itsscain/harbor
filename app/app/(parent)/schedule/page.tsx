import Link from "next/link";
import { CalendarClock, Plus, Copy, Wand2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { tzFromSettings, weekdayInTz } from "@/lib/tz";
import { effectiveSchedule } from "@/lib/kiosk/schedule";
import type { KioskRoutine } from "@/lib/kiosk/types";
import { formatClock } from "@/lib/kiosk/calendar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, SectionHeader, Field, Input, Select, Badge } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmSubmit } from "@/components/ui/ConfirmSubmit";
import { Disclosure } from "@/components/app/Disclosure";
import { SharedRoutineCard } from "@/components/app/SharedRoutineCard";
import { FamilyScheduleGrid, type GridRow } from "@/components/app/FamilyScheduleGrid";
import { cn } from "@/lib/cn";
import {
  createScheduleTemplate,
  updateScheduleTemplate,
  deleteScheduleTemplate,
  createSharedRoutine,
  copyChildRoutines,
  applyTemplateToChild,
} from "./actions";

export const metadata = { title: "Family Schedule" };
export const dynamic = "force-dynamic";

const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function runsOnDay(days: number[] | null, day: number): boolean {
  return !days || days.length === 0 || days.includes(day);
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const household = await getMyHousehold();
  if (!household) {
    return (
      <Card>
        <p className="py-6 text-center text-sm text-muted">
          No household yet — once your Harbor is set up, the Family Schedule lives here.
        </p>
      </Card>
    );
  }
  const supabase = await createClient();
  const tz = tzFromSettings(household.settings as Record<string, unknown> | null);
  const today = weekdayInTz(new Date(), tz);
  const sp = await searchParams;
  const dayNum = sp.day == null || sp.day === "" ? NaN : Number(sp.day);
  const day = Number.isInteger(dayNum) && dayNum >= 0 && dayNum <= 6 ? dayNum : today;

  const [{ data: kids }, { data: routines }, { data: templates }, { data: overrides }] = await Promise.all([
    supabase
      .from("children")
      .select("id, name, color, sort_order")
      .eq("household_id", household.id)
      .is("deleted_at", null)
      .order("sort_order"),
    supabase
      .from("routines")
      .select("*")
      .eq("household_id", household.id)
      .is("person_id", null)
      .is("deleted_at", null)
      .order("sort_order"),
    supabase
      .from("schedule_templates")
      .select("*")
      .eq("household_id", household.id)
      .is("deleted_at", null)
      .order("sort_order"),
    supabase
      .from("routine_child_overrides")
      .select("*")
      .eq("household_id", household.id)
      .is("deleted_at", null),
  ]);

  const children = kids ?? [];
  const allRoutines = routines ?? [];
  const tpls = templates ?? [];
  const ovs = overrides ?? [];
  const shared = allRoutines.filter((r) => r.scope === "shared");

  // Steps for the shared routines (their editors live on this page).
  const sharedIds = shared.map((r) => r.id);
  const { data: sharedSteps } = sharedIds.length
    ? await supabase
        .from("routine_steps")
        .select("id, routine_id, label, icon, step_type, reward_points, order_index")
        .in("routine_id", sharedIds)
        .is("deleted_at", null)
        .order("order_index")
    : { data: [] as { id: string; routine_id: string; label: string; icon: string | null; step_type: string; reward_points: number; order_index: number }[] };

  // The grid: every child × every routine that reaches them, through the SAME
  // per-child resolution the wall uses (override → template → own schedule).
  const resolveCtx = { schedule_templates: tpls, routine_child_overrides: ovs };
  const gridRows: GridRow[] = children.map((child) => {
    const blocks = allRoutines
      .filter(
        (r) =>
          r.active &&
          (r.scope === "shared" ? (r.assigned_child_ids ?? []).includes(child.id) : r.child_id === child.id),
      )
      .map((r) => {
        const eff = effectiveSchedule(r as unknown as KioskRoutine, child.id, resolveCtx);
        return { r, eff };
      })
      .filter(({ eff }) => runsOnDay(eff.days_of_week, day))
      .map(({ r, eff }) => ({
        id: r.id,
        name: r.name,
        start: eff.start_time,
        end: eff.end_time,
        shared: r.scope === "shared",
        disabled: eff.disabled,
      }));
    return { child, blocks };
  });

  return (
    <>
      <PageHeader
        eyebrow="Plan"
        icon={<CalendarClock className="h-6 w-6" />}
        title="Family Schedule"
        subtitle="Every routine, every child, one place. Set a window once — it applies to everyone."
      />

      {/* ── The day at a glance (§3) ── */}
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-title text-harbor">{DAY_FULL[day]}</h2>
          <div className="flex gap-1">
            {DOW.map((d, i) => (
              <Link
                key={i}
                href={`/app/schedule?day=${i}`}
                aria-current={i === day ? "date" : undefined}
                className={cn(
                  "inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-semibold transition",
                  i === day ? "bg-water text-white shadow-button" : "text-muted hover:bg-harbor-50",
                  i === today && i !== day && "ring-1 ring-water/40",
                )}
              >
                {d}
              </Link>
            ))}
          </div>
        </div>
        {children.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            No children yet — add your first in <Link href="/app/children" className="font-semibold text-water underline">Children</Link>.
          </p>
        ) : (
          <FamilyScheduleGrid rows={gridRows} />
        )}
        <p className="mt-3 text-xs text-muted">
          Solid blocks are shared routines; lighter ones belong to one child. Faded = turned off for that child.
        </p>
      </Card>

      {/* ── Shared routines (§2.1) ── */}
      <SectionHeader eyebrow="Define once" className="mt-8">
        Shared routines
      </SectionHeader>
      <div className="space-y-3">
        {shared.length === 0 && (
          <Card>
            <p className="text-sm text-muted">
              No shared routines yet. Create one below — set the window once and assign it to
              everyone who does it. Editing it later updates every child at the same time.
            </p>
          </Card>
        )}
        {shared.map((r) => (
          <SharedRoutineCard
            key={r.id}
            version={r.updated_at}
            routine={{
              id: r.id,
              name: r.name,
              type: r.type,
              active: r.active,
              start_time: r.start_time,
              end_time: r.end_time,
              sort_order: r.sort_order,
              days_of_week: r.days_of_week,
              assigned_child_ids: r.assigned_child_ids,
              schedule_template_id: r.schedule_template_id,
            }}
            steps={(sharedSteps ?? []).filter((s) => s.routine_id === r.id)}
            kids={children}
            templates={tpls}
            overrides={ovs}
          />
        ))}

        <Card className="p-0">
          <Disclosure
            summary={
              <span className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-water">
                <Plus className="h-4 w-4" /> New shared routine
              </span>
            }
            bodyClassName="px-5 pb-5"
          >
            <form action={createSharedRoutine} className="grid gap-3 sm:grid-cols-2">
              <Field label="Name">
                <Input name="name" placeholder="Morning routine" required />
              </Field>
              <Field label="Type">
                <Select name="type" defaultValue="schedule">
                  <option value="schedule">Step list</option>
                  <option value="first_then">First / Then</option>
                </Select>
              </Field>
              <Field label="Who does it?" hint="Pick everyone — one definition covers them all." className="sm:col-span-2">
                <div className="flex flex-wrap gap-1.5">
                  {children.map((k) => (
                    <label key={k.id} className="cursor-pointer">
                      <input type="checkbox" name="assigned" value={k.id} defaultChecked className="peer sr-only" />
                      <span className="inline-flex h-11 items-center justify-center rounded-lg border border-harbor-100 bg-white px-3 text-sm font-semibold text-muted transition peer-checked:border-water peer-checked:bg-water peer-checked:text-white">
                        {k.name}
                      </span>
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="Schedule template" hint="Or set times below." className="sm:col-span-2">
                <Select name="schedule_template_id" defaultValue="">
                  <option value="">No template — use the times below</option>
                  {tpls.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Starts">
                <Input name="start_time" type="time" />
              </Field>
              <Field label="Ends">
                <Input name="end_time" type="time" />
              </Field>
              <Field label="Days" className="sm:col-span-2">
                <div className="flex flex-wrap gap-1">
                  {DOW.map((d, i) => (
                    <label key={i} className="cursor-pointer">
                      <input type="checkbox" name="days" value={i} className="peer sr-only" />
                      <span className="inline-flex h-11 min-w-11 items-center justify-center rounded-lg border border-harbor-100 bg-white px-2 text-sm font-semibold text-muted transition peer-checked:border-water peer-checked:bg-water peer-checked:text-white">
                        {d}
                      </span>
                    </label>
                  ))}
                </div>
              </Field>
              <div className="sm:col-span-2">
                <SubmitButton>Create shared routine</SubmitButton>
              </div>
            </form>
          </Disclosure>
        </Card>
      </div>

      {/* ── Schedule templates (§2.2) ── */}
      <SectionHeader eyebrow="Reusable windows" className="mt-8">
        Schedule templates
      </SectionHeader>
      <div className="space-y-3">
        {tpls.map((t) => (
          <Card key={t.id} className="p-0">
            <Disclosure
              summary={
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0 truncate text-sm font-semibold text-harbor">{t.name}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge tone="blue">
                      {t.start_time ? formatClock(t.start_time) : "—"}
                      {t.end_time ? ` – ${formatClock(t.end_time)}` : ""}
                    </Badge>
                  </span>
                </div>
              }
              bodyClassName="px-5 pb-5"
            >
              <form key={t.updated_at} action={updateScheduleTemplate.bind(null, t.id)} className="grid gap-3 sm:grid-cols-3">
                <Field label="Name" className="sm:col-span-3">
                  <Input name="name" defaultValue={t.name} required />
                </Field>
                <Field label="Starts">
                  <Input name="start_time" type="time" defaultValue={t.start_time ? t.start_time.slice(0, 5) : ""} />
                </Field>
                <Field label="Ends">
                  <Input name="end_time" type="time" defaultValue={t.end_time ? t.end_time.slice(0, 5) : ""} />
                </Field>
                <Field label="Days" className="sm:col-span-3">
                  <div className="flex flex-wrap gap-1">
                    {DOW.map((d, i) => (
                      <label key={i} className="cursor-pointer">
                        <input type="checkbox" name="days" value={i} defaultChecked={(t.days_of_week ?? []).includes(i)} className="peer sr-only" />
                        <span className="inline-flex h-11 min-w-11 items-center justify-center rounded-lg border border-harbor-100 bg-white px-2 text-sm font-semibold text-muted transition peer-checked:border-water peer-checked:bg-water peer-checked:text-white">
                          {d}
                        </span>
                      </label>
                    ))}
                  </div>
                </Field>
                <div className="flex items-center gap-2 sm:col-span-3">
                  <SubmitButton size="sm" variant="secondary">
                    Save
                  </SubmitButton>
                </div>
              </form>
              <form action={deleteScheduleTemplate.bind(null, t.id)} className="mt-3 flex justify-end">
                <ConfirmSubmit
                  message={`Delete "${t.name}"? Routines using it keep their own times instead.`}
                >
                  Delete template
                </ConfirmSubmit>
              </form>
            </Disclosure>
          </Card>
        ))}

        <Card className="p-0">
          <Disclosure
            summary={
              <span className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-water">
                <Plus className="h-4 w-4" /> New template
              </span>
            }
            bodyClassName="px-5 pb-5"
          >
            <form action={createScheduleTemplate} className="grid gap-3 sm:grid-cols-3">
              <Field label="Name" className="sm:col-span-3">
                <Input name="name" placeholder="School Morning" required />
              </Field>
              <Field label="Starts">
                <Input name="start_time" type="time" />
              </Field>
              <Field label="Ends">
                <Input name="end_time" type="time" />
              </Field>
              <Field label="Days" className="sm:col-span-3">
                <div className="flex flex-wrap gap-1">
                  {DOW.map((d, i) => (
                    <label key={i} className="cursor-pointer">
                      <input type="checkbox" name="days" value={i} className="peer sr-only" />
                      <span className="inline-flex h-11 min-w-11 items-center justify-center rounded-lg border border-harbor-100 bg-white px-2 text-sm font-semibold text-muted transition peer-checked:border-water peer-checked:bg-water peer-checked:text-white">
                        {d}
                      </span>
                    </label>
                  ))}
                </div>
              </Field>
              <div className="sm:col-span-3">
                <SubmitButton variant="secondary">Create template</SubmitButton>
              </div>
            </form>
          </Disclosure>
        </Card>
      </div>

      {/* ── Bulk actions (§2.4) ── */}
      {children.length >= 2 && (
        <>
          <SectionHeader eyebrow="One action, many targets" className="mt-8">
            Bulk actions
          </SectionHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <div className="mb-2 flex items-center gap-2">
                <Copy className="h-4 w-4 text-water" />
                <h3 className="text-sm font-bold text-harbor">Copy routines between kids</h3>
              </div>
              <p className="mb-3 text-xs text-muted">Clone a sibling&apos;s whole setup (routines + steps), then tweak.</p>
              <form action={copyChildRoutines} className="flex flex-wrap items-end gap-2">
                <Field label="From" className="min-w-28 flex-1">
                  <Select name="from_child" defaultValue="">
                    <option value="" disabled>
                      Child…
                    </option>
                    {children.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="To" className="min-w-28 flex-1">
                  <Select name="to_child" defaultValue="">
                    <option value="" disabled>
                      Child…
                    </option>
                    {children.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <SubmitButton size="sm" variant="secondary">
                  Copy
                </SubmitButton>
              </form>
            </Card>
            <Card>
              <div className="mb-2 flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-water" />
                <h3 className="text-sm font-bold text-harbor">Apply a template to a child</h3>
              </div>
              <p className="mb-3 text-xs text-muted">Point all of one child&apos;s routines at a named window in one go.</p>
              <form action={applyTemplateToChild} className="flex flex-wrap items-end gap-2">
                <Field label="Child" className="min-w-28 flex-1">
                  <Select name="child_id" defaultValue="">
                    <option value="" disabled>
                      Child…
                    </option>
                    {children.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Template" className="min-w-28 flex-1">
                  <Select name="template_id" defaultValue="">
                    <option value="" disabled>
                      Template…
                    </option>
                    {tpls.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <SubmitButton size="sm" variant="secondary">
                  Apply
                </SubmitButton>
              </form>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
