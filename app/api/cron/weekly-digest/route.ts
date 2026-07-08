import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications/dispatch";
import { cronAuthorized, sentWithin } from "@/lib/notifications/cron";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Weekly job (Vercel Cron, Monday morning): a gentle recap of the past week per household —
// things completed + stars earned. Idempotent within the week. Honors each parent's prefs.
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return new Response("Unauthorized", { status: 401 });

  const admin = createAdminClient();
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data: households } = await admin.from("households").select("id, name");

  let sent = 0;
  for (const hh of households ?? []) {
    if (await sentWithin(admin, hh.id, "digest", 5 * 24)) continue; // once per ~week

    const { data: kids } = await admin.from("children").select("id").eq("household_id", hh.id).is("deleted_at", null);
    const childIds = (kids ?? []).map((c) => c.id);
    if (childIds.length === 0) continue;

    const { data: log } = await admin
      .from("reward_log")
      .select("delta, reason")
      .in("child_id", childIds)
      .gte("created_at", since);

    const rows = log ?? [];
    const done = rows.filter((r) => r.reason === "step" || r.reason === "chore").length;
    const starsEarned = rows.reduce((n, r) => (r.delta > 0 ? n + r.delta : n), 0);
    if (done === 0 && starsEarned === 0) continue; // nothing to celebrate; stay quiet

    await notify({
      householdId: hh.id,
      category: "digest",
      title: "Your week with Harbor 🌊",
      body: `${done} ${done === 1 ? "thing" : "things"} done and ${starsEarned} ${starsEarned === 1 ? "star" : "stars"} earned this week. Nicely done.`,
      route: "/app/insights",
    });
    sent++;
  }

  return Response.json({ ok: true, households: (households ?? []).length, sent });
}
