import { createAdminClient } from "@/lib/supabase/admin";
import { tzFromSettings, formatTimeInTz } from "@/lib/tz";
import { eventsForDay } from "@/lib/kiosk/calendar";
import type { KioskEvent } from "@/lib/kiosk/types";
import { notify } from "@/lib/notifications/dispatch";
import { cronAuthorized, sentWithin } from "@/lib/notifications/cron";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Daily morning job (Vercel Cron): pushes each household a short summary of the day, and —
// as a separate, independently-toggleable notification — today's calendar events. Idempotent
// per day so a cron retry never double-sends. Delivery honors each parent's prefs inside notify().
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return new Response("Unauthorized", { status: 401 });

  const admin = createAdminClient();
  const { data: households } = await admin.from("households").select("id, name, settings");

  let briefings = 0;
  let eventPings = 0;
  const now = new Date();

  for (const hh of households ?? []) {
    const tz = tzFromSettings(hh.settings as Record<string, unknown> | null);

    // Today's events (recurrence-aware, in the family tz).
    const { data: evRows } = await admin
      .from("events")
      .select("id, child_id, title, emoji, location, starts_at, ends_at, all_day, is_countdown, person_label, color, responsible_label, recurrence_rule")
      .eq("household_id", hh.id)
      .is("deleted_at", null);
    const todays = eventsForDay((evRows ?? []) as unknown as KioskEvent[], now, tz);
    const timed = todays.filter((e) => !e.all_day);

    const { count: routineCount } = await admin
      .from("routines")
      .select("id", { count: "exact", head: true })
      .eq("household_id", hh.id)
      .eq("active", true)
      .is("deleted_at", null);

    // 1) The morning summary ("briefing" category).
    if (!(await sentWithin(admin, hh.id, "briefing", 18))) {
      const evPhrase =
        todays.length === 0
          ? "Nothing on the calendar today"
          : `${todays.length} ${todays.length === 1 ? "event" : "events"} today`;
      const first = timed[0];
      const firstPhrase = first
        ? ` — first up, ${first.title} at ${formatTimeInTz(new Date(first.starts_at), tz)}`
        : "";
      const routinePhrase = (routineCount ?? 0) > 0 ? `. ${routineCount} routines are ready on the wall.` : ".";
      await notify({
        householdId: hh.id,
        category: "briefing",
        title: "Good morning from Harbor 🌅",
        body: `${evPhrase}${firstPhrase}${routinePhrase}`,
        route: "/app",
      });
      briefings++;
    }

    // 2) Today's events ("events" category — a separate toggle).
    if (todays.length > 0 && !(await sentWithin(admin, hh.id, "events", 18))) {
      const list = todays
        .slice(0, 4)
        .map((e) => (e.all_day ? e.title : `${e.title} · ${formatTimeInTz(new Date(e.starts_at), tz)}`))
        .join(" · ");
      const more = todays.length > 4 ? ` +${todays.length - 4} more` : "";
      await notify({
        householdId: hh.id,
        category: "events",
        title: `Today: ${todays.length} on the calendar`,
        body: `${list}${more}`,
        route: "/app/calendar",
      });
      eventPings++;
    }
  }

  return Response.json({ ok: true, households: (households ?? []).length, briefings, eventPings });
}
