import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ShieldCheck,
  Users as UsersIcon,
  Tablet,
  RefreshCw,
  Radar,
  Wifi,
  WifiOff,
  Clock,
  CreditCard,
  Stethoscope,
  ScrollText,
  Star,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Badge, Stat, Input } from "@/components/ui/primitives";
import { Button } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { shortDate } from "@/lib/format";
import { accountDeviceCommand, addAccountNote } from "./actions";
import type { AdminAuditLog } from "@/lib/types";

export const metadata = { title: "Account" };
export const dynamic = "force-dynamic";

const STALE_MS = 24 * 60 * 60 * 1000;
const PLUS_ACTIVE = ["active", "trialing", "past_due"];
function ago(iso: string | null): string {
  if (!iso) return "never";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
async function headCount(p: PromiseLike<{ count: number | null }>): Promise<number> {
  const { count } = await p;
  return count ?? 0;
}

export default async function AccountInspector({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const { data: household } = await supabase.from("households").select("*").eq("id", id).maybeSingle();
  if (!household) notFound();

  const [{ data: children }, { data: devices }, { data: sub }, choresN, eventsN, listsN, storeN, { data: audit }] = await Promise.all([
    supabase.from("children").select("id, name").eq("household_id", id).is("deleted_at", null).order("sort_order"),
    supabase.from("device_pairings").select("*").eq("household_id", id),
    supabase.from("plus_subscriptions").select("status, plan, current_period_end").eq("household_id", id).maybeSingle(),
    headCount(supabase.from("chores").select("id", { count: "exact", head: true }).eq("household_id", id)),
    headCount(supabase.from("events").select("id", { count: "exact", head: true }).eq("household_id", id)),
    headCount(supabase.from("list_items").select("id", { count: "exact", head: true }).eq("household_id", id)),
    headCount(supabase.from("store_items").select("id", { count: "exact", head: true }).eq("household_id", id)),
    supabase.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(100),
  ]);

  const kids = children ?? [];
  const kidIds = kids.map((k) => k.id);
  const [{ data: routines }, { data: rewards }, { data: recentCheck }] = await Promise.all([
    kidIds.length ? supabase.from("routines").select("id").in("child_id", kidIds) : Promise.resolve({ data: [] as { id: string }[] }),
    kidIds.length ? supabase.from("rewards").select("child_id, points_total").in("child_id", kidIds) : Promise.resolve({ data: [] as { child_id: string; points_total: number }[] }),
    kidIds.length ? supabase.from("check_ins").select("created_at").in("child_id", kidIds).order("created_at", { ascending: false }).limit(1) : Promise.resolve({ data: [] as { created_at: string }[] }),
  ]);
  const pointsByKid = new Map((rewards ?? []).map((r) => [r.child_id, r.points_total]));

  const devs = devices ?? [];
  const paired = devs.filter((d) => d.status === "paired");
  const currentBuild = process.env.VERCEL_GIT_COMMIT_SHA || null;
  const lastSync = paired.map((d) => d.last_synced_at).filter(Boolean).sort().at(-1) as string | undefined;
  const lastActive = [lastSync, recentCheck?.[0]?.created_at].filter(Boolean).sort().at(-1) ?? null;
  const offline = (d: (typeof devs)[number]) => d.status === "paired" && !d.paused && (!d.last_synced_at || Date.now() - new Date(d.last_synced_at).getTime() > STALE_MS);
  const stale = (d: (typeof devs)[number]) => d.status === "paired" && !d.paused && currentBuild != null && (!d.app_version || d.app_version !== currentBuild);
  const brokenDevice = paired.some((d) => offline(d) || stale(d));

  const subStatus = sub?.status ?? "inactive";
  const subActive = PLUS_ACTIVE.includes(subStatus);
  const paymentIssue = subStatus === "past_due" || subStatus === "unpaid";
  const churned = subStatus === "canceled" || subStatus === "incomplete_expired";
  const inactiveLong = lastActive ? Date.now() - new Date(lastActive).getTime() > 7 * 86_400_000 : paired.length > 0;

  const health = paymentIssue
    ? { label: "Payment issue", tone: "red" as const }
    : brokenDevice
      ? { label: "Broken device", tone: "amber" as const }
      : churned
        ? { label: "Churned", tone: "gray" as const }
        : inactiveLong
          ? { label: "At-risk", tone: "amber" as const }
          : { label: "Active", tone: "green" as const };

  const plusDrift = !!household.plus_active !== subActive;
  const timeline = ((audit ?? []) as AdminAuditLog[]).filter(
    (a) => a.target_id === id || (a.detail as { household_id?: string } | null)?.household_id === id,
  );

  return (
    <>
      <PageHeader
        eyebrow="Account"
        backHref="/admin/accounts"
        icon={<ShieldCheck className="h-6 w-6" />}
        title={household.name}
        subtitle={`Created ${shortDate(household.created_at)} · ${household.parent_pin_hash ? "wall PIN set" : "no wall PIN"}`}
        actions={<Badge tone={health.tone}>{health.label}</Badge>}
      />

      {/* Overview */}
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Plan" value={subActive ? "Plus" : "Free"} hint={sub?.plan ?? "local-only"} accent={subActive} />
        <Stat label="Children" value={kids.length} />
        <Stat label="Devices" value={paired.length} hint={`${devs.length - paired.length} pending`} />
        <Stat label="Last active" value={ago(lastActive)} />
      </div>

      {/* Family data */}
      <Card className="mb-4">
        <div className="mb-3 flex items-center gap-2">
          <UsersIcon className="h-5 w-5 text-water" />
          <h2 className="text-title text-harbor">Family data</h2>
        </div>
        {kids.length === 0 ? (
          <p className="text-sm text-muted">No children set up yet.</p>
        ) : (
          <div className="mb-3 flex flex-wrap gap-2">
            {kids.map((k) => (
              <span key={k.id} className="inline-flex items-center gap-1.5 rounded-full bg-harbor-50 px-3 py-1 text-sm font-medium text-harbor">
                {k.name}
                <span className="inline-flex items-center gap-0.5 text-beacon">
                  <Star className="h-3.5 w-3.5 fill-beacon" />
                  {pointsByKid.get(k.id) ?? 0}
                </span>
              </span>
            ))}
          </div>
        )}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {[
            { label: "Routines", n: (routines ?? []).length },
            { label: "Chores", n: choresN },
            { label: "Events", n: eventsN },
            { label: "Lists", n: listsN },
            { label: "Rewards", n: storeN },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-surface-sunken p-3 text-center">
              <p className="font-display text-xl font-extrabold text-harbor">{s.n}</p>
              <span className="text-eyebrow text-muted">{s.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Devices */}
      <Card className="mb-4">
        <div className="mb-3 flex items-center gap-2">
          <Tablet className="h-5 w-5 text-water" />
          <h2 className="text-title text-harbor">Devices</h2>
        </div>
        {devs.length === 0 ? (
          <p className="text-sm text-muted">No devices paired. Provision + pair from the customer record.</p>
        ) : (
          <div className="space-y-2">
            {devs.map((d) => (
              <div key={d.id} className="flex flex-col gap-2 rounded-xl border border-harbor-100 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-harbor">{d.device_label || (d.kind === "outpost" ? "Lantern" : "Wall")}</span>
                    {d.status !== "paired" ? (
                      <Badge tone="gray">Pending</Badge>
                    ) : offline(d) ? (
                      <Badge tone="amber"><WifiOff className="mr-1 inline h-3 w-3" />Offline</Badge>
                    ) : (
                      <Badge tone="green"><Wifi className="mr-1 inline h-3 w-3" />Online</Badge>
                    )}
                    {stale(d) && <Badge tone="amber">Old build</Badge>}
                    {d.clock_suspect && <Badge tone="red"><Clock className="mr-1 inline h-3 w-3" />Clock</Badge>}
                    {d.pending_command && <Badge tone="blue">⟳ {d.pending_command}</Badge>}
                  </div>
                  <p className="text-xs text-muted">seen {ago(d.last_synced_at)}{d.app_version ? ` · v ${String(d.app_version).slice(0, 8)}` : " · version unknown"}</p>
                </div>
                {d.status === "paired" && (
                  <div className="flex shrink-0 items-center gap-2">
                    <form action={accountDeviceCommand.bind(null, id, d.id, "identify")}>
                      <Button type="submit" variant="ghost" size="sm"><Radar className="h-4 w-4" /> Identify</Button>
                    </form>
                    <form action={accountDeviceCommand.bind(null, id, d.id, "refresh")}>
                      <Button type="submit" variant="secondary" size="sm"><RefreshCw className="h-4 w-4" /> Refresh</Button>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Billing + Diagnostics */}
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-water" />
            <h2 className="text-title text-harbor">Subscription &amp; billing</h2>
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted">Status</span><span className="font-semibold text-harbor">{subStatus}</span></div>
            <div className="flex justify-between"><span className="text-muted">Plan</span><span className="font-semibold text-harbor">{sub?.plan ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted">Renews / ends</span><span className="font-semibold text-harbor">{sub?.current_period_end ? shortDate(sub.current_period_end) : "—"}</span></div>
            {plusDrift && (
              <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700">
                Drift: households.plus_active ({String(household.plus_active)}) disagrees with the subscription status.
              </p>
            )}
          </div>
          <p className="mt-3 text-xs text-muted">Stripe billing actions (refund, comp, change plan) arrive with billing — not hooked up yet.</p>
        </Card>

        <Card>
          <div className="mb-3 flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-water" />
            <h2 className="text-title text-harbor">Diagnostics</h2>
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted">Last device sync</span><span className="font-semibold text-harbor">{ago(lastSync ?? null)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Walls on old build</span><span className="font-semibold text-harbor">{currentBuild ? paired.filter(stale).length : "n/a (dev)"}</span></div>
            <div className="flex justify-between"><span className="text-muted">Offline walls</span><span className="font-semibold text-harbor">{paired.filter(offline).length}</span></div>
            <div className="flex justify-between"><span className="text-muted">Clock-suspect</span><span className="font-semibold text-harbor">{paired.filter((d) => d.clock_suspect).length}</span></div>
          </div>
        </Card>
      </div>

      {/* Support timeline */}
      <Card>
        <div className="mb-3 flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-water" />
          <h2 className="text-title text-harbor">Support timeline</h2>
        </div>
        <form action={addAccountNote.bind(null, id)} className="mb-4 flex gap-2">
          <Input name="note" placeholder="Add a support note…" className="flex-1" />
          <SubmitButton variant="secondary" pendingText="Saving…">Add note</SubmitButton>
        </form>
        {timeline.length === 0 ? (
          <p className="text-sm text-muted">No actions logged for this account yet.</p>
        ) : (
          <ul className="space-y-2">
            {timeline.map((a) => (
              <li key={a.id} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 shrink-0 text-xs text-muted">{shortDate(a.created_at)}</span>
                <span className="flex-1 text-ink">
                  <span className="font-semibold text-harbor">{a.action}</span>
                  {a.action === "note" && (a.detail as { note?: string } | null)?.note ? ` — ${(a.detail as { note?: string }).note}` : ""}
                  <span className="text-muted"> · {a.actor_name ?? "Operator"}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-muted">
          Coming next: view-as (gated support impersonation), data repair, and account lifecycle — each audited.
        </p>
      </Card>
    </>
  );
}
