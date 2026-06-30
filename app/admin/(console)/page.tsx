import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Sparkles,
  ChevronRight,
  AlertTriangle,
  Boxes,
  Tablet,
  CreditCard,
  Snowflake,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Button, Badge } from "@/components/ui/primitives";
import { Kpi } from "@/components/admin/Kpi";
import { currency, shortDate } from "@/lib/format";
import { getFounderStatus } from "@/lib/actions/founder";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

// Plan-derived MRR (no stored amount on subscriptions). Matches the prior dashboard.
const PLAN_MONTHLY = 3.99;
const PLAN_ANNUAL_MRR = 39 / 12;
const ACTIVE_SUB = ["active", "trialing", "past_due"];
const STALE_MS = 24 * 60 * 60 * 1000; // a wall that hasn't synced in 24h reads as offline

function ym(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}`;
}
function dir(now: number, prev: number): "up" | "down" | "flat" {
  return now > prev ? "up" : now < prev ? "down" : "flat";
}

export default async function DashboardPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: customers }, { data: signups }, { data: inventory }, { data: devices }, { data: subs }, { count: waitlistCount }, founder] =
    await Promise.all([
      supabase.from("customers").select("name, status, install_fee, founder_number, created_at, install_date, updated_at"),
      supabase.from("founder_signups").select("name, status, founder_number, created_at, quote"),
      supabase.from("inventory").select("part_name, on_hand_qty, reorder_threshold"),
      supabase.from("device_pairings").select("device_label, status, last_synced_at, app_version, paused, clock_suspect, kind"),
      supabase.from("plus_subscriptions").select("status, plan, created_at"),
      supabase.from("waitlist").select("id", { count: "exact", head: true }),
      getFounderStatus(),
    ]);

  const cust = customers ?? [];
  const sigs = signups ?? [];
  const inv = inventory ?? [];
  const devs = devices ?? [];
  const subList = subs ?? [];

  const now = new Date();
  const thisYM = ym(now);
  const lastYM = ym(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const inMonth = (iso: string | null | undefined, key: string) => !!iso && ym(new Date(iso)) === key;

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const installed = cust.filter((c) => c.status === "installed");
  const leads = cust.filter((c) => c.status === "lead");
  const scheduled = cust.filter((c) => c.status === "scheduled");
  const instThis = installed.filter((c) => inMonth(c.install_date ?? c.created_at, thisYM)).length;
  const instLast = installed.filter((c) => inMonth(c.install_date ?? c.created_at, lastYM)).length;

  const revOf = (rows: typeof installed) => rows.reduce((s, c) => s + Number(c.install_fee ?? 0), 0);
  const revThis = revOf(installed.filter((c) => inMonth(c.install_date ?? c.created_at, thisYM)));
  const revLast = revOf(installed.filter((c) => inMonth(c.install_date ?? c.created_at, lastYM)));
  const oneTimeTotal = revOf(installed);

  const activeSubs = subList.filter((s) => ACTIVE_SUB.includes(s.status));
  const mrr = activeSubs.reduce((s, x) => s + (x.plan === "annual" ? PLAN_ANNUAL_MRR : PLAN_MONTHLY), 0);
  const netNewSubs = activeSubs.filter((s) => inMonth(s.created_at, thisYM)).length;

  const paired = devs.filter((d) => d.status === "paired");
  const currentBuild = process.env.VERCEL_GIT_COMMIT_SHA || null;
  const staleWalls = currentBuild
    ? paired.filter((d) => !d.paused && d.app_version && d.app_version !== currentBuild)
    : [];
  const offlineWalls = paired.filter((d) => !d.paused && (!d.last_synced_at || now.getTime() - new Date(d.last_synced_at).getTime() > STALE_MS));

  // ── Needs your attention ────────────────────────────────────────────────────
  const toReview = sigs.filter((s) => s.status === "reserved").length;
  const lowStock = inv.filter((p) => Number(p.on_hand_qty ?? 0) <= Number(p.reorder_threshold ?? 0));
  const pastDue = subList.filter((s) => s.status === "past_due" || s.status === "unpaid").length;
  const coldLeads = leads.filter((c) => now.getTime() - new Date(c.updated_at ?? c.created_at).getTime() > 7 * 86_400_000).length;
  const clockSuspect = paired.filter((d) => d.clock_suspect).length;

  type Item = { icon: typeof AlertTriangle; label: string; href: string; tone: "amber" | "red" | "beacon" | "gray" };
  const attention: Item[] = [];
  if (toReview > 0) attention.push({ icon: Sparkles, label: `${toReview} founder signup${toReview === 1 ? "" : "s"} to review`, href: "/admin/founders", tone: "amber" });
  if (pastDue > 0) attention.push({ icon: CreditCard, label: `${pastDue} payment${pastDue === 1 ? "" : "s"} need attention`, href: "/admin/customers", tone: "red" });
  if (staleWalls.length > 0) attention.push({ icon: Tablet, label: `${staleWalls.length} wall${staleWalls.length === 1 ? "" : "s"} on an old version`, href: "/admin/fleet?filter=stale", tone: "amber" });
  if (offlineWalls.length > 0) attention.push({ icon: Tablet, label: `${offlineWalls.length} wall${offlineWalls.length === 1 ? "" : "s"} offline 24h+`, href: "/admin/fleet?filter=offline", tone: "amber" });
  if (lowStock.length > 0) attention.push({ icon: Boxes, label: `${lowStock.length} part${lowStock.length === 1 ? "" : "s"} low on stock`, href: "/admin/inventory", tone: "amber" });
  if (coldLeads > 0) attention.push({ icon: Snowflake, label: `${coldLeads} lead${coldLeads === 1 ? "" : "s"} cold (7+ days)`, href: "/admin/customers", tone: "gray" });
  if (clockSuspect > 0) attention.push({ icon: AlertTriangle, label: `${clockSuspect} device${clockSuspect === 1 ? "" : "s"} with a clock issue`, href: "/admin/fleet", tone: "amber" });
  if (founder.remaining > 0 && founder.remaining <= 3) attention.push({ icon: Sparkles, label: `Only ${founder.remaining} founder spot${founder.remaining === 1 ? "" : "s"} left`, href: "/admin/founders", tone: "beacon" });

  // ── Funnels ─────────────────────────────────────────────────────────────────
  const installFunnel = [
    { label: "Leads", count: leads.length, tone: "bg-slate-300" },
    { label: "Scheduled", count: scheduled.length, tone: "bg-water" },
    { label: "Installed", count: installed.length, tone: "bg-beacon" },
  ];
  const pipelineTotal = leads.length + scheduled.length + installed.length;
  // Per-stage funnel counts (intentionally a different view than the "Founder spots" KPI, which
  // uses getFounderStatus → founder_active_count, i.e. TOTAL spots taken across all active stages).
  const sigBy = (s: string) => sigs.filter((x) => x.status === s).length;
  const founderFunnel = [
    { label: "Reserved", count: sigBy("reserved") },
    { label: "Approved", count: sigBy("approved") },
    { label: "Scheduled", count: sigBy("scheduled") },
    { label: "Active", count: sigBy("active") },
  ];

  // ── Activity feed ─────────────────────────────────────────────────────────────
  type Act = { when: string; text: string; icon: typeof Users; tone: string };
  const activity: Act[] = [
    ...cust.map((c) => ({
      when: (c.install_date ?? c.created_at) as string,
      text: c.status === "installed" ? `Installed — ${c.name}` : c.status === "scheduled" ? `Scheduled — ${c.name}` : `New lead — ${c.name}`,
      icon: Users,
      tone: c.status === "installed" ? "text-emerald-700" : "text-water",
    })),
    ...sigs.map((s) => ({
      when: s.created_at as string,
      text: s.status === "waitlist" ? `Waitlist — ${s.name}` : `Founder reserved — ${s.name}${s.founder_number ? ` (#${s.founder_number})` : ""}`,
      icon: Sparkles,
      tone: "text-beacon",
    })),
  ]
    .filter((a) => a.when)
    .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
    .slice(0, 8);

  const toneClass: Record<string, string> = {
    amber: "text-amber-700 bg-amber-50",
    red: "text-red-700 bg-red-50",
    beacon: "text-harbor bg-beacon-soft",
    gray: "text-slate-600 bg-slate-100",
  };

  return (
    <>
      <PageHeader
        eyebrow="Operator HQ"
        icon={<LayoutDashboard className="h-6 w-6" />}
        title="Company HQ"
        subtitle="Run installs, the funnel, the fleet, and the founder program — at a glance."
        actions={
          <Link href="/admin/customers">
            <Button variant="beacon">+ New customer</Button>
          </Link>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Kpi label="Active installs" value={installed.length} trend={{ label: `${instThis} this month`, dir: dir(instThis, instLast) }} />
        <Kpi label="Plus MRR" value={currency(mrr)} hint={`${activeSubs.length} active`} trend={netNewSubs ? { label: `+${netNewSubs} new`, dir: "up" } : undefined} accent />
        <Kpi label="One-time revenue" value={currency(oneTimeTotal)} trend={{ label: `${currency(revThis)} this month`, dir: dir(revThis, revLast) }} />
        <Kpi label="Open pipeline" value={leads.length + scheduled.length} hint={`${leads.length} leads · ${scheduled.length} scheduled`} />
        <Kpi label="Founder spots" value={`${founder.cap - founder.remaining}/${founder.cap}`} hint={`${founder.remaining} left at the founder rate`} />
        <Kpi label="Fleet" value={paired.length} hint={paired.length === 0 ? "no walls yet" : staleWalls.length || offlineWalls.length ? `${staleWalls.length} on old build · ${offlineWalls.length} offline` : "all current & online"} />
      </div>

      {/* Needs your attention */}
      <Card className="mt-5">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-beacon" />
          <h2 className="text-title text-harbor">Needs your attention</h2>
        </div>
        {attention.length === 0 ? (
          <p className="flex items-center gap-2 text-muted">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" /> All clear — nothing needs you right now.
          </p>
        ) : (
          <div className="space-y-2">
            {attention.map((a, i) => (
              <Link key={i} href={a.href} className="flex items-center justify-between rounded-xl border border-harbor-100 px-3.5 py-2.5 transition hover:border-water/40 hover:bg-harbor-50/50">
                <span className="flex items-center gap-2.5 text-sm font-medium text-ink">
                  <span className={"flex h-7 w-7 items-center justify-center rounded-lg " + toneClass[a.tone]}>
                    <a.icon className="h-4 w-4" />
                  </span>
                  {a.label}
                </span>
                <ChevronRight className="h-4 w-4 text-muted" />
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* Funnels */}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-title text-harbor">Install pipeline</h2>
            <Badge tone="neutral">{pipelineTotal} total</Badge>
          </div>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-harbor-50">
            {pipelineTotal === 0
              ? null
              : installFunnel.map((s) => (s.count > 0 ? <div key={s.label} className={s.tone} style={{ width: `${(s.count / pipelineTotal) * 100}%` }} /> : null))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {installFunnel.map((s) => (
              <div key={s.label}>
                <span className="text-eyebrow text-muted">{s.label}</span>
                <p className="font-display text-xl font-extrabold text-harbor">{s.count}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-title text-harbor">Founder funnel</h2>
            <Link href="/admin/founders" className="text-sm font-semibold text-water hover:underline">
              View signups
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {founderFunnel.map((s) => (
              <div key={s.label} className="rounded-xl bg-harbor-50/60 p-3 text-center">
                <p className="font-display text-2xl font-extrabold text-harbor">{s.count}</p>
                <span className="text-eyebrow text-muted">{s.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">{sigBy("waitlist")} on the founder waitlist · {waitlistCount ?? 0} marketing waitlist</p>
        </Card>
      </div>

      {/* Revenue + activity */}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-title text-harbor">Revenue at a glance</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted">Plus MRR</span><span className="font-semibold tabular-nums text-harbor">{currency(mrr)}/mo</span></div>
            <div className="flex justify-between"><span className="text-muted">Annualized (ARR)</span><span className="font-semibold tabular-nums text-harbor">{currency(mrr * 12)}</span></div>
            <div className="flex justify-between"><span className="text-muted">One-time this month</span><span className="font-semibold tabular-nums text-harbor">{currency(revThis)}</span></div>
            <div className="flex justify-between border-t border-harbor-100 pt-2"><span className="text-muted">One-time, all time</span><span className="font-display font-bold tabular-nums text-harbor">{currency(oneTimeTotal)}</span></div>
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-title text-harbor">Recent activity</h2>
          {activity.length === 0 ? (
            <p className="text-sm text-muted">No activity yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {activity.map((a, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm">
                  <a.icon className={"h-4 w-4 shrink-0 " + a.tone} />
                  <span className="flex-1 text-ink">{a.text}</span>
                  <span className="shrink-0 text-xs text-muted">{shortDate(a.when)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Quick actions */}
      <h2 className="mb-3 mt-6 text-title text-harbor">Quick actions</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/admin/founders", icon: Sparkles, title: "Founder signups", body: "Review & approve inbound founders." },
          { href: "/admin/customers", icon: Users, title: "Customers", body: "Provision a household & pair a device." },
          { href: "/admin/builds", icon: Package, title: "Build catalog", body: "Edit the product line & margins." },
          { href: "/admin/shopping-list", icon: ShoppingCart, title: "Shopping list", body: "Generate a batch parts list." },
        ].map((q) => (
          <Link key={q.href} href={q.href}>
            <Card interactive className="flex h-full items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-harbor-50 text-harbor">
                <q.icon className="h-5 w-5" />
              </span>
              <span>
                <p className="font-display font-bold text-harbor">{q.title}</p>
                <p className="text-sm text-muted">{q.body}</p>
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
