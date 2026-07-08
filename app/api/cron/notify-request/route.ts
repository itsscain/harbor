import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications/dispatch";
import { requestSummary, requestKindMeta } from "@/lib/command";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Fired by a DB trigger (requests_notify → net.http_post) the instant a kid taps
// "Ask a grown-up" on the wall or Lantern. Turns that request into a real push in the
// parents' pockets — the 'approvals' notification category, deep-linked to /app/command
// so one tap lands on Approve / Not now. Bearer matches the pulse (Vault → PULSE_SECRET).

function authorized(req: Request): boolean {
  const secret = process.env.PULSE_SECRET || process.env.CRON_SECRET;
  if (!secret) return true; // local dev
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function handle(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });

  let requestId = "";
  try {
    const j = (await req.json()) as { request_id?: string };
    requestId = String(j?.request_id ?? "");
  } catch {
    /* no body */
  }
  if (!requestId) return Response.json({ ok: false, error: "no request_id" }, { status: 400 });

  const admin = createAdminClient();
  const { data: r } = await admin
    .from("requests")
    .select("id, household_id, child_id, kind, amount, body, status")
    .eq("id", requestId)
    .maybeSingle();
  if (!r) return Response.json({ ok: true, skipped: "not found" });
  if (r.status !== "pending") return Response.json({ ok: true, skipped: "already decided" });

  const { data: child } = await admin.from("children").select("name").eq("id", r.child_id).maybeSingle();
  const name = child?.name ?? "Your child";
  const meta = requestKindMeta(r.kind);
  const summary = requestSummary(r.kind, r.amount, r.body);

  await notify({
    householdId: r.household_id,
    category: "approvals",
    childId: r.child_id,
    title: `${meta.emoji} ${name} is asking`,
    body: `${name} would like ${summary}. Tap to approve or say not now.`,
    route: `/app/command?request=${r.id}`,
  });

  return Response.json({ ok: true, notified: true });
}

// The DB trigger POSTs; a manual/browser check can GET.
export const GET = handle;
export const POST = handle;
