import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { tzFromSettings, weekdayInTz } from "@/lib/tz";
import { effectiveSchedule } from "@/lib/kiosk/schedule";
import type { KioskRoutine } from "@/lib/kiosk/types";
import { routineEmoji } from "@/lib/routine-emoji";
import { formatSpan } from "@/lib/routine-presets";
import { formatClock } from "@/lib/kiosk/calendar";
import { PageHeader } from "@/components/ui/PageHeader";
import { FamilyScheduleGrid, type GridRow } from "@/components/app/FamilyScheduleGrid";
import { FamilyTimes, type FamilyTime } from "@/components/app/schedule/FamilyTimes";
import { cn } from "@/lib/cn";

export const metadata = { title: "Routine times" };
export const dynamic = "force-dynamic";

const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const runsOnDay = (days: number[] | null, day: number) => !days || days.length === 0 || days.includes(day);
const toMin = (t: string | null) => (t ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) : -1);
const dayWords = (d: number[] | null) =>
  !d || d.length === 0 || d.length === 7 ? "Every day" : d.length === 5 && [1, 2, 3, 4, 5].every((x) => d.includes(x)) ? "Weekdays" : d.map((x) => DAY_SHORT[x]).join(", ");

// Routine times — the family's day at a glance (who does what, when), and the shared
// "family times" routines can follow. Editing a routine happens in its own editor.
export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const household = await getMyHousehold();
  if (!household) return <PageHeader title="Routine times" subtitle="No household yet." />;
  const supabase = await createClient();
  const tz = tzFromSettings(household.settings as Record<string, unknown> | null);
  const today = weekdayInTz(new Date(), tz);
  const sp = await searchParams;
  const dayNum = sp.day == null || sp.day === "" ? NaN : Number(sp.day);
  const day = Number.isInteger(dayNum) && dayNum >= 0 && dayNum <= 6 ? dayNum : today;

  const [{ data: kids }, { data: routines }, { data: templates }, { data: overrides }] = await Promise.all([
    supabase.from("children").select("id, name, color, avatar, photo_url, sort_order").eq("household_id", household.id).is("deleted_at", null).order("sort_order"),
    supabase.from("routines").select("*").eq("household_id", household.id).is("person_id", null).is("deleted_at", null).order("sort_order"),
    supabase.from("schedule_templates").select("*").eq("household_id", household.id).is("deleted_at", null).order("sort_order"),
    supabase.from("routine_child_overrides").select("*").eq("household_id", household.id).is("deleted_at", null),
  ]);
  const children = kids ?? [];
  const all = routines ?? [];
  const tpls = templates ?? [];
  const ctx = { schedule_templates: tpls, routine_child_overrides: overrides ?? [] };
  const kidsOf = (r: (typeof all)[number]) => (r.scope === "shared" ? (r.assigned_child_ids ?? []) : r.child_id ? [r.child_id] : []);
  const nameOf = new Map(children.map((k) => [k.id, k.name]));

  // Grid: every child × every routine that reaches them, resolved exactly like the wall.
  const gridRows: GridRow[] = children.map((child) => ({
    child,
    blocks: all
      .filter((r) => r.active && kidsOf(r).includes(child.id))
      .map((r) => ({ r, eff: effectiveSchedule(r as unknown as KioskRoutine, child.id, ctx) }))
      .filter(({ eff }) => runsOnDay(eff.days_of_week, day))
      .map(({ r, eff }) => ({ id: r.id, name: r.name, start: eff.start_time, end: eff.end_time, shared: r.scope === "shared", disabled: eff.disabled })),
  }));

  // The day's routines as rows (one per routine, with who does it).
  const dayRows = all
    .filter((r) => r.active)
    .map((r) => {
      const who = kidsOf(r).filter((id) => nameOf.has(id));
      const eff = effectiveSchedule(r as unknown as KioskRoutine, who[0] ?? null, ctx);
      return { r, who, eff };
    })
    .filter(({ who, eff }) => who.length > 0 && runsOnDay(eff.days_of_week, day))
    .sort((a, b) => toMin(a.eff.start_time) - toMin(b.eff.start_time));

  const times: FamilyTime[] = tpls.map((t) => ({
    id: t.id,
    name: t.name,
    start: t.start_time,
    end: t.end_time,
    days: t.days_of_week as number[] | null,
    label: [t.start_time && t.end_time ? formatSpan(t.start_time, t.end_time) : t.start_time ? `from ${formatClock(t.start_time)}` : "", dayWords(t.days_of_week as number[] | null)].filter(Boolean).join(" · "),
    following: all.filter((r) => r.schedule_template_id === t.id).length,
  }));

  return (
    <>
      <PageHeader title="Routine times" subtitle="Who does what, and when it shows on the wall." />

      <nav aria-label="Day" className="mb-4 flex gap-1 overflow-x-auto rounded-2xl border border-line bg-surface p-1 [scrollbar-width:none]">
        {DOW.map((d, i) => (
          <Link
            key={i}
            href={`/app/schedule?day=${i}`}
            replace
            scroll={false}
            aria-current={i === day ? "date" : undefined}
            className={cn(
              "flex min-h-10 min-w-10 flex-1 items-center justify-center rounded-xl text-sm font-semibold transition",
              i === day ? "bg-accent/15 text-fg" : "text-fg-muted hover:bg-surface-2 hover:text-fg",
            )}
          >
            {d}
            {i === today && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-accent" aria-label="today" />}
          </Link>
        ))}
      </nav>

      {children.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line-strong p-5 text-center text-sm text-fg-muted">
          Add a child first —{" "}
          <Link href="/app/children?add=1" className="font-semibold text-accent">
            Add a child
          </Link>
        </p>
      ) : (
        <>
          <section className="mb-6 rounded-2xl border border-line bg-surface p-4">
            <h2 className="mb-3 text-title text-fg">{day === today ? `Today · ${DAY_FULL[day]}` : DAY_FULL[day]}</h2>
            <FamilyScheduleGrid rows={gridRows} />
          </section>

          <section className="mb-8">
            <h2 className="mb-2 text-title text-fg">Routines on {DAY_FULL[day]}</h2>
            {dayRows.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line-strong px-4 py-4 text-sm text-fg-muted">Nothing scheduled.</p>
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                {dayRows.map(({ r, who, eff }) => (
                  <li key={r.id}>
                    <Link href={`/app/children/${who[0]}/routines/${r.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 transition hover:bg-surface-2">
                      <span className="w-[5.5rem] shrink-0 text-sm font-semibold tabular-nums text-fg-muted">
                        {eff.start_time ? formatClock(eff.start_time) : "Any time"}
                      </span>
                      <span className="text-xl leading-none" aria-hidden>
                        {routineEmoji(r)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-fg">{r.name}</span>
                        <span className="block truncate text-sm text-fg-muted">
                          {who.map((id) => nameOf.get(id)).join(", ")}
                          {r.schedule_template_id && ` · follows “${tpls.find((t) => t.id === r.schedule_template_id)?.name ?? "a family time"}”`}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <FamilyTimes times={times} />
    </>
  );
}
