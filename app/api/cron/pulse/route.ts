import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { tzFromSettings, minutesIntoDayInTz, dayKeyInTz, weekdayInTz, formatTimeInTz } from "@/lib/tz";
import { eventsForDay } from "@/lib/kiosk/calendar";
import type { KioskEvent } from "@/lib/kiosk/types";
import { notify } from "@/lib/notifications/dispatch";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// The pulse — the frequent (every ~15 min via Supabase pg_cron) notification engine.
// It fires time-based nudges that a once-daily Vercel-Hobby cron can't: event reminders,
// due reminders, and medication doses coming up. Each is deduped via notification_dispatch_log
// so it sends exactly once, and carries a SPECIFIC route so tapping the phone notification
// deep-links to the right screen. Delivery still honors each parent's prefs inside notify().

function authorized(req: Request): boolean {
  const secret = process.env.PULSE_SECRET || process.env.CRON_SECRET;
  if (!secret) return true; // local dev
  const h = req.headers.get("authorization");
  return h === `Bearer ${secret}`;
}

/** Claim a one-time dispatch slot; returns true if THIS call won it (i.e. not sent before). */
async function claim(
  admin: SupabaseClient,
  householdId: string,
  kind: string,
  entityId: string,
  doseKey: string,
): Promise<boolean> {
  const { data } = await admin
    .from("notification_dispatch_log")
    .upsert(
      { household_id: householdId, kind, entity_id: entityId, dose_key: doseKey },
      { onConflict: "household_id,kind,entity_id,dose_key", ignoreDuplicates: true },
    )
    .select("id");
  return !!(data && data.length);
}

const toMin = (hm: string): number => {
  const [h, m] = String(hm).split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
};

async function handle(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });

  const admin = createAdminClient();
  const now = new Date();
  const { data: households } = await admin.from("households").select("id, settings");
  let events = 0;
  let reminders = 0;
  let meds = 0;

  for (const hh of households ?? []) {
    const tz = tzFromSettings(hh.settings as Record<string, unknown> | null);
    const nowMin = minutesIntoDayInTz(now, tz);
    const todayKey = dayKeyInTz(now, tz);
    const dow = weekdayInTz(now, tz);

    // 1) EVENT reminders — a timed event starting within the next ~40 min. Deep-links to Calendar.
    const { data: evRows } = await admin
      .from("events")
      .select("id, child_id, title, emoji, location, starts_at, ends_at, all_day, is_countdown, person_label, color, responsible_label, recurrence_rule")
      .eq("household_id", hh.id)
      .is("deleted_at", null);
    for (const e of eventsForDay((evRows ?? []) as unknown as KioskEvent[], now, tz)) {
      if (e.all_day) continue;
      const until = minutesIntoDayInTz(new Date(e.starts_at), tz) - nowMin;
      if (until < 0 || until >= 40) continue;
      if (!(await claim(admin, hh.id, "event", e.id, todayKey))) continue;
      const at = formatTimeInTz(new Date(e.starts_at), tz);
      await notify({
        householdId: hh.id,
        category: "events",
        title: `⏰ ${e.title}`,
        body: `Coming up at ${at}${e.location ? ` · ${e.location}` : ""}.`,
        route: "/app/calendar",
      });
      events++;
    }

    // 2) REMINDERS due today (not done, not snoozed past today). Deep-links to Calendar.
    const { data: remRows } = await admin
      .from("reminders")
      .select("id, title, due_date, done, snoozed_until")
      .eq("household_id", hh.id)
      .is("deleted_at", null)
      .eq("done", false)
      .lte("due_date", todayKey);
    for (const r of remRows ?? []) {
      if (r.snoozed_until && r.snoozed_until > todayKey) continue;
      if (!(await claim(admin, hh.id, "reminder", r.id, todayKey))) continue;
      await notify({
        householdId: hh.id,
        category: "events",
        title: "🔔 Reminder",
        body: r.title,
        route: "/app/calendar",
      });
      reminders++;
    }

    // 3) MEDICATION doses coming up within ~20 min. Deep-links to the Medication station.
    const { data: medRows } = await admin
      .from("medications")
      .select("id, name, dose, schedule_times, days_of_week, active")
      .eq("household_id", hh.id)
      .eq("active", true)
      .is("deleted_at", null);
    for (const m of medRows ?? []) {
      const days = (m.days_of_week as number[] | null) ?? null;
      if (days && days.length && !days.includes(dow)) continue;
      for (const t of (m.schedule_times as string[] | null) ?? []) {
        const until = toMin(t) - nowMin;
        if (until < 0 || until >= 20) continue;
        if (!(await claim(admin, hh.id, "med", m.id, `${todayKey}:${t}`))) continue;
        await notify({
          householdId: hh.id,
          category: "medication",
          title: `💊 ${m.name}`,
          body: `${m.dose ? `${m.dose} · ` : ""}due at ${formatTimeInTz(new Date(`${todayKey}T${t.length === 5 ? t : t.slice(0, 5)}:00`), tz) || t}.`,
          route: "/app/medication",
        });
        meds++;
      }
    }
  }

  return Response.json({ ok: true, households: (households ?? []).length, events, reminders, meds });
}

// Supabase pg_cron calls this via net.http_post (POST); a manual/browser check uses GET.
export const GET = handle;
export const POST = handle;
