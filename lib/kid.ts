import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { Household } from "@/lib/types";
import { tzFromSettings, dayKeyInTz, minutesIntoDayInTz, wallTimeToUtcMs } from "@/lib/tz";
import { routineForChild, effectiveSchedule } from "@/lib/kiosk/schedule";
import { runsToday, withinWindow, formatClock } from "@/lib/kiosk/calendar";
import { choreAssignee } from "@/lib/kiosk/chores";
import { routineEmoji } from "@/lib/routine-emoji";
import { formatSpan } from "@/lib/routine-presets";
import type { KioskChore, KioskRoutine, KioskRoutineOverride, KioskScheduleTemplate } from "@/lib/kiosk/types";

// Data for the redesigned kid page + routine editor. Each tab loads only what it shows (the old
// page fired ~12 sequential queries every time), in the family time zone, using the wall's own
// scheduling seam so the phone and the wall agree.

type Db = SupabaseClient<Database>;
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
};

/** "Every day · 7:00 – 8:00 AM" / "Weekdays · from 3:30 PM" / "Any time". */
export function whenLabel(start: string | null, end: string | null, days: number[] | null): string {
  const d = !days || days.length === 0 || days.length === 7
    ? "Every day"
    : days.length === 5 && [1, 2, 3, 4, 5].every((n) => days.includes(n))
      ? "Weekdays"
      : days.length === 2 && days.includes(0) && days.includes(6)
        ? "Weekends"
        : days.map((n) => DOW[n]).join(", ");
  const t = start && end ? formatSpan(start, end) : start ? `from ${formatClock(start)}` : end ? `until ${formatClock(end)}` : null;
  return t ? `${d} · ${t}` : d === "Every day" ? "Any time" : d;
}

export type KidBasics = {
  id: string;
  name: string;
  avatar: string | null;
  photo_url: string | null;
  color: string | null;
  birthday: string | null;
  settings: Record<string, unknown>;
  stars: number;
  age: number | null;
};

export async function loadKidBasics(supabase: Db, childId: string): Promise<KidBasics | null> {
  const [{ data: child }, { data: rw }] = await Promise.all([
    supabase.from("children").select("id, name, avatar, photo_url, color, birthday, settings").eq("id", childId).is("deleted_at", null).maybeSingle(),
    supabase.from("rewards").select("points_total").eq("child_id", childId).maybeSingle(),
  ]);
  if (!child) return null;
  const age = child.birthday ? Math.max(0, Math.floor((Date.now() - new Date(child.birthday).getTime()) / 31557600000)) : null;
  return { ...child, settings: (child.settings ?? {}) as Record<string, unknown>, stars: rw?.points_total ?? 0, age };
}

type RoutineRow = {
  id: string;
  child_id: string | null;
  person_id: string | null;
  name: string;
  type: string;
  active: boolean;
  start_time: string | null;
  end_time: string | null;
  days_of_week: number[] | null;
  scope: string;
  assigned_child_ids: string[] | null;
  schedule_template_id: string | null;
  sort_order: number;
  routine_steps: { id: string; deleted_at: string | null; icon: string | null }[];
};

async function loadRoutineContext(supabase: Db, householdId: string) {
  const [{ data: routines }, { data: templates }, { data: overrides }] = await Promise.all([
    supabase
      .from("routines")
      .select(
        "id, child_id, person_id, name, type, active, start_time, end_time, days_of_week, scope, assigned_child_ids, schedule_template_id, sort_order, routine_steps(id, deleted_at, icon)",
      )
      .eq("household_id", householdId)
      .is("deleted_at", null)
      .order("sort_order"),
    supabase.from("schedule_templates").select("*").eq("household_id", householdId).is("deleted_at", null),
    supabase.from("routine_child_overrides").select("*").eq("household_id", householdId).is("deleted_at", null),
  ]);
  return {
    routines: (routines ?? []) as unknown as RoutineRow[],
    snap: {
      schedule_templates: (templates ?? []) as unknown as KioskScheduleTemplate[],
      routine_child_overrides: (overrides ?? []) as unknown as KioskRoutineOverride[],
    },
  };
}

// ── Today tab ────────────────────────────────────────────────────────────────
export type KidDayRoutine = {
  id: string;
  name: string;
  emoji: string;
  done: number;
  total: number;
  when: string;
  state: "now" | "later" | "earlier" | "done" | "anytime";
};
export type KidDay = {
  routines: KidDayRoutine[];
  /** Every routine this kid has (any day, on or off) — 0 means "brand new, help them start". */
  totalRoutines: number;
  chores: { id: string; title: string; icon: string | null; points: number; done: boolean }[];
  corner: { id: string; endsAt: string } | null;
  grounding: { id: string; reason: string | null; endsOn: string; daysLeft: number } | null;
};

export async function loadKidDay(supabase: Db, household: Household, childId: string): Promise<KidDay> {
  const tz = tzFromSettings((household.settings ?? {}) as Record<string, unknown>);
  const now = new Date();
  const nowMs = now.getTime();
  const curMin = minutesIntoDayInTz(now, tz);
  const todayKey = dayKeyInTz(now, tz);
  const startOfDayIso = new Date(wallTimeToUtcMs(`${todayKey}T00:00`, tz)).toISOString();
  const familyDay = new Date(`${todayKey}T12:00:00Z`);

  const [{ routines, snap }, { data: log }, { data: chores }, { data: kids }, { data: corners }, { data: grounding }] = await Promise.all([
    loadRoutineContext(supabase, household.id),
    supabase.from("reward_log").select("step_id, chore_id").eq("child_id", childId).gte("created_at", startOfDayIso).is("deleted_at", null),
    supabase
      .from("chores")
      .select("id, child_id, title, icon, points, days_of_week, rotation_member_ids, active, sort_order")
      .eq("household_id", household.id)
      .is("deleted_at", null)
      .order("sort_order"),
    supabase.from("children").select("id").eq("household_id", household.id).is("deleted_at", null),
    supabase.from("corners").select("id, started_at, duration_minutes").eq("child_id", childId).eq("status", "active").is("deleted_at", null),
    supabase
      .from("groundings")
      .select("id, reason, ends_on")
      .eq("child_id", childId)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const done = new Set((log ?? []).map((l) => l.step_id ?? l.chore_id).filter(Boolean) as string[]);
  const mine = routines.filter((r) => !r.person_id && routineForChild(r as unknown as KioskRoutine, childId));

  const dayRoutines: KidDayRoutine[] = mine
    .filter((r) => r.active)
    .map((r) => {
      const eff = effectiveSchedule(r as unknown as KioskRoutine, childId, snap);
      return { r, eff };
    })
    .filter((x) => !x.eff.disabled && runsToday(x.eff.days_of_week, tz, now))
    .sort((a, b) => (a.eff.start_time ? toMin(a.eff.start_time) : -1) - (b.eff.start_time ? toMin(b.eff.start_time) : -1))
    .map(({ r, eff }): KidDayRoutine => {
      const ids = r.routine_steps.filter((s) => !s.deleted_at).map((s) => s.id);
      const d = ids.filter((id) => done.has(id)).length;
      const windowed = !!(eff.start_time || eff.end_time);
      const state: KidDayRoutine["state"] =
        ids.length > 0 && d >= ids.length
          ? "done"
          : !windowed
            ? "anytime"
            : withinWindow(eff, nowMs, tz)
              ? "now"
              : eff.start_time && toMin(eff.start_time) > curMin
                ? "later"
                : "earlier";
      return {
        id: r.id,
        name: r.name,
        emoji: routineEmoji(r),
        done: d,
        total: ids.length,
        when: whenLabel(eff.start_time, eff.end_time, null),
        state,
      };
    });

  const validIds = new Set((kids ?? []).map((k) => k.id));
  const myChores = ((chores ?? []) as unknown as KioskChore[])
    .filter((c) => c.active && runsToday(c.days_of_week, tz, now) && choreAssignee(c, validIds, familyDay) === childId)
    .map((c) => ({ id: c.id, title: c.title, icon: c.icon, points: c.points, done: done.has(c.id) }));

  const activeCorner = (corners ?? []).find((c) => new Date(c.started_at).getTime() + (c.duration_minutes ?? 5) * 60_000 > nowMs);
  const daysLeft = grounding?.ends_on
    ? Math.max(1, Math.round((new Date(`${grounding.ends_on}T12:00:00Z`).getTime() - new Date(`${todayKey}T12:00:00Z`).getTime()) / 86_400_000) + 1)
    : 0;

  return {
    routines: dayRoutines,
    totalRoutines: mine.length,
    chores: myChores,
    corner: activeCorner
      ? { id: activeCorner.id, endsAt: new Date(new Date(activeCorner.started_at).getTime() + (activeCorner.duration_minutes ?? 5) * 60_000).toISOString() }
      : null,
    grounding: grounding && grounding.ends_on >= todayKey ? { id: grounding.id, reason: grounding.reason, endsOn: grounding.ends_on, daysLeft } : null,
  };
}

// ── Routines tab ─────────────────────────────────────────────────────────────
export type KidRoutineRow = {
  id: string;
  name: string;
  emoji: string;
  when: string;
  stepCount: number;
  stepPeek: string[];
  active: boolean;
  sharedWith: string[];
  usesSlot: string | null;
};
export type TemplateCard = { id: string; name: string; emoji: string | null; description: string | null; steps: { icon: string | null; label: string }[]; saved: boolean };

export async function loadKidRoutines(supabase: Db, household: Household, childId: string) {
  const [{ routines, snap }, { data: kids }, { data: tpls }] = await Promise.all([
    loadRoutineContext(supabase, household.id),
    supabase.from("children").select("id, name, avatar, photo_url, color").eq("household_id", household.id).is("deleted_at", null).order("sort_order"),
    supabase
      .from("routine_templates")
      .select("id, name, emoji, description, content, household_id")
      .is("deleted_at", null)
      .order("household_id", { nullsFirst: true })
      .order("sort_order"),
  ]);
  const nameOf = new Map((kids ?? []).map((k) => [k.id, k.name]));
  const slotName = new Map(snap.schedule_templates.map((t) => [t.id, t.name]));

  const mine: KidRoutineRow[] = routines
    .filter((r) => !r.person_id && routineForChild(r as unknown as KioskRoutine, childId))
    .map((r) => {
      const eff = effectiveSchedule(r as unknown as KioskRoutine, childId, snap);
      const steps = r.routine_steps.filter((s) => !s.deleted_at);
      return {
        id: r.id,
        name: r.name,
        emoji: routineEmoji(r),
        when: whenLabel(eff.start_time, eff.end_time, eff.days_of_week),
        stepCount: steps.length,
        stepPeek: steps.slice(0, 6).map((s) => s.icon ?? "•"),
        active: r.active && !eff.disabled,
        sharedWith: r.scope === "shared" ? (r.assigned_child_ids ?? []).filter((id) => id !== childId).map((id) => nameOf.get(id) ?? "").filter(Boolean) : [],
        usesSlot: r.schedule_template_id ? slotName.get(r.schedule_template_id) ?? null : null,
      };
    });

  // Routines other kids have (for "Copy from…").
  const siblings = (kids ?? [])
    .filter((k) => k.id !== childId)
    .map((k) => ({
      id: k.id,
      name: k.name,
      routines: routines
        .filter((r) => !r.person_id && r.child_id === k.id)
        .map((r) => ({ id: r.id, name: r.name, emoji: routineEmoji(r), steps: r.routine_steps.filter((s) => !s.deleted_at).length })),
    }))
    .filter((s) => s.routines.length > 0);

  const templates: TemplateCard[] = (tpls ?? []).map((t) => {
    const content = (t.content ?? {}) as { steps?: { icon?: string; label?: string }[] };
    return {
      id: t.id,
      name: t.name,
      emoji: t.emoji,
      description: t.description,
      saved: !!t.household_id,
      steps: (content.steps ?? []).slice(0, 8).map((s) => ({ icon: s.icon ?? null, label: String(s.label ?? "") })),
    };
  });

  return { routines: mine, siblings, templates, kids: kids ?? [] };
}

// ── Chores & stars tab ───────────────────────────────────────────────────────
export type KidChoreRow = {
  id: string;
  title: string;
  icon: string | null;
  points: number;
  days: number[] | null;
  daysLabel: string;
  kidIds: string[];
  turnsWith: string[];
  requiresApproval: boolean;
  mineToday: boolean;
};

export async function loadKidChores(supabase: Db, household: Household, childId: string) {
  const tz = tzFromSettings((household.settings ?? {}) as Record<string, unknown>);
  const now = new Date();
  const familyDay = new Date(`${dayKeyInTz(now, tz)}T12:00:00Z`);
  const [{ data: chores }, { data: kids }, { count: storeCount }] = await Promise.all([
    supabase
      .from("chores")
      .select("id, child_id, title, icon, points, days_of_week, rotation_member_ids, requires_approval, active, sort_order")
      .eq("household_id", household.id)
      .is("deleted_at", null)
      .order("sort_order"),
    supabase.from("children").select("id, name, avatar, photo_url, color").eq("household_id", household.id).is("deleted_at", null).order("sort_order"),
    supabase.from("store_items").select("id", { count: "exact", head: true }).eq("household_id", household.id).is("deleted_at", null),
  ]);
  const nameOf = new Map((kids ?? []).map((k) => [k.id, k.name]));
  const validIds = new Set((kids ?? []).map((k) => k.id));
  const rows: KidChoreRow[] = ((chores ?? []) as unknown as (KioskChore & { requires_approval: boolean | null })[])
    .map((c) => {
      const rot = Array.isArray(c.rotation_member_ids) ? (c.rotation_member_ids as string[]).filter((id) => validIds.has(id)) : [];
      const kidIds = rot.length >= 2 ? rot : c.child_id ? [c.child_id] : [];
      return { c, kidIds };
    })
    .filter(({ kidIds }) => kidIds.includes(childId))
    .map(({ c, kidIds }) => ({
      id: c.id,
      title: c.title,
      icon: c.icon,
      points: c.points,
      days: (c.days_of_week as number[] | null) ?? null,
      daysLabel: whenLabel(null, null, (c.days_of_week as number[] | null) ?? null).replace("Any time", "Every day"),
      kidIds,
      turnsWith: kidIds.length >= 2 ? kidIds.filter((id) => id !== childId).map((id) => nameOf.get(id) ?? "").filter(Boolean) : [],
      requiresApproval: c.requires_approval === true,
      mineToday: c.active && runsToday(c.days_of_week, tz, now) && choreAssignee(c, validIds, familyDay) === childId,
    }));
  return { chores: rows, kids: kids ?? [], storeCount: storeCount ?? 0 };
}

// ── Routine editor ───────────────────────────────────────────────────────────
export type EditorStep = {
  id: string;
  label: string;
  icon: string | null;
  points: number;
  kind: string;
  hint: string | null;
  read_aloud: string | null;
  options: string[];
  step_type: string;
  order_index: number;
};

export async function loadRoutineEditor(supabase: Db, household: Household, routineId: string) {
  const [{ data: r }, { data: steps }, { data: kids }, { data: library }, { data: slots }] = await Promise.all([
    supabase
      .from("routines")
      .select("id, child_id, person_id, scope, assigned_child_ids, name, type, active, start_time, end_time, days_of_week, strict_order, schedule_template_id")
      .eq("id", routineId)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("routine_steps")
      .select("id, label, icon, reward_points, kind, hint, read_aloud, choice_options, substeps, step_type, order_index")
      .eq("routine_id", routineId)
      .is("deleted_at", null)
      .order("order_index"),
    supabase.from("children").select("id, name, avatar, photo_url, color").eq("household_id", household.id).is("deleted_at", null).order("sort_order"),
    supabase.from("step_library").select("id, label, icon, default_points, category").is("deleted_at", null).order("sort_order").limit(40),
    supabase.from("schedule_templates").select("id, name, start_time, end_time").eq("household_id", household.id).is("deleted_at", null),
  ]);
  if (!r || r.person_id) return null;
  // Options round-trip as "🍎 Apple" so editing never drops a picture the wall shows.
  const opts = (v: unknown): string[] =>
    Array.isArray(v)
      ? (v as { label?: string; icon?: string | null }[])
          .map((o) => [o?.icon, o?.label].filter(Boolean).join(" ").trim())
          .filter(Boolean)
      : [];
  const slot = r.schedule_template_id ? (slots ?? []).find((s) => s.id === r.schedule_template_id) ?? null : null;
  return {
    routine: {
      id: r.id,
      name: r.name,
      type: r.type,
      active: r.active,
      start: slot ? slot.start_time : r.start_time,
      end: slot ? slot.end_time : r.end_time,
      days: r.days_of_week as number[] | null,
      strict: r.strict_order === true,
      kidIds: r.scope === "shared" ? (r.assigned_child_ids ?? []) : r.child_id ? [r.child_id] : [],
      slotName: slot?.name ?? null,
    },
    steps: (steps ?? []).map((s) => ({
      id: s.id,
      label: s.label,
      icon: s.icon,
      points: s.reward_points,
      kind: s.kind ?? "standard",
      hint: s.hint,
      read_aloud: s.read_aloud,
      options: opts(s.kind === "choice" ? s.choice_options : s.kind === "substep" ? s.substeps : null),
      step_type: s.step_type,
      order_index: s.order_index,
    })) as EditorStep[],
    kids: kids ?? [],
    library: (library ?? []).map((l) => ({ id: l.id, label: l.label, icon: l.icon, points: l.default_points ?? 0 })),
  };
}
