import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { captureError } from "@/lib/observability";
import { tzFromSettings } from "@/lib/tz";
import { sendPush } from "./webpush";
import { mergePrefs, decide, applyDetail, CATEGORY_TIER, DEFAULT_PREFS, type NotifCategory } from "./prefs";

export type NotifyInput = {
  householdId: string;
  category: NotifCategory;
  title: string;
  body: string;
  route?: string;
  childId?: string | null;
  /** Override the tier derived from the category (rare). */
  tier?: number;
  /** Limit delivery to these parent profile ids; default = every parent in the household. */
  parentIds?: string[];
  /** A "send test" — bypass category/quiet-hours gating so it always exercises push end-to-end. */
  test?: boolean;
};

/**
 * The notification "brain": for each recipient parent, honor their preferences + quiet hours, ALWAYS
 * write the durable in-app record, and send web push unless held. Prunes dead subscriptions. Uses the
 * service role, so it works from device-authed contexts (the voice route) and parent-authed actions
 * alike. Never throws — a notification failing must never break the thing that triggered it.
 */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    const admin = createAdminClient();

    const { data: hh } = await admin
      .from("households")
      .select("owner_id, settings")
      .eq("id", input.householdId)
      .maybeSingle();
    if (!hh) return;
    const tz = tzFromSettings(hh.settings as Record<string, unknown>);

    const { data: members } = await admin
      .from("household_members")
      .select("profile_id")
      .eq("household_id", input.householdId);

    const parentSet = new Set<string>();
    if (hh.owner_id) parentSet.add(hh.owner_id);
    for (const m of members ?? []) if (m.profile_id) parentSet.add(m.profile_id);
    let parents = [...parentSet];
    if (input.parentIds?.length) parents = parents.filter((p) => input.parentIds!.includes(p));
    if (parents.length === 0) return;

    const tier = input.tier ?? CATEGORY_TIER[input.category];
    const route = input.route ?? "/app";

    const { data: prefRows } = await admin
      .from("notification_preferences")
      .select("parent_id, prefs")
      .in("parent_id", parents);
    const prefsById = new Map((prefRows ?? []).map((r) => [r.parent_id, mergePrefs(r.prefs)]));

    for (const parentId of parents) {
      const prefs = prefsById.get(parentId) ?? DEFAULT_PREFS;
      const decision = input.test ? "push" : decide(prefs, input.category, tz);
      if (decision === "skip") continue;

      // 1) Always write the in-app record (full detail — the center is the source of truth).
      const { data: rec, error: recErr } = await admin
        .from("notifications")
        .insert({
          parent_id: parentId,
          household_id: input.householdId,
          child_id: input.childId ?? null,
          tier,
          category: input.category,
          title: input.title,
          body: input.body,
          route,
          detail_level: prefs.detailLevel,
        })
        .select("id")
        .single();
      if (recErr) captureError(recErr, { area: "notify-record", household: input.householdId });

      // 2) Push, unless quiet hours held it. Detail level applies to the lock-screen payload only.
      if (decision === "push") {
        const { data: subs } = await admin
          .from("push_subscriptions")
          .select("id, endpoint, p256dh, auth")
          .eq("parent_id", parentId)
          .eq("active", true);

        const shown = applyDetail(prefs.detailLevel, input.title, input.body);
        for (const s of subs ?? []) {
          const res = await sendPush(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            { title: shown.title, body: shown.body, route, tier, id: rec?.id, tag: `${input.category}:${input.childId ?? ""}` },
          );
          if (res.ok) {
            await admin.from("push_subscriptions").update({ last_success_at: new Date().toISOString() }).eq("id", s.id);
          } else if (res.gone) {
            await admin.from("push_subscriptions").update({ active: false }).eq("id", s.id); // prune dead sub
          }
        }
      }
    }
  } catch (e) {
    captureError(e, { area: "notify", household: input.householdId, category: input.category });
  }
}
