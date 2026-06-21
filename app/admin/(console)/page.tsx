import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Stat, Card, Button, Badge } from "@/components/ui/primitives";
import { currency } from "@/lib/format";
import { FOUNDER_SPOTS } from "@/lib/types";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const PLAN_MONTHLY = 3.99;
const PLAN_ANNUAL_MRR = 39 / 12;

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [{ data: customers }, { data: subs }, { count: waitlistCount }] =
    await Promise.all([
      supabase.from("customers").select("status, install_fee, founder_number"),
      supabase.from("plus_subscriptions").select("status, plan"),
      supabase.from("waitlist").select("id", { count: "exact", head: true }),
    ]);

  const installs = (customers ?? []).filter((c) => c.status === "installed");
  const leadCount = (customers ?? []).filter((c) => c.status === "lead").length;
  const scheduledCount = (customers ?? []).filter(
    (c) => c.status === "scheduled",
  ).length;
  const installedCount = installs.length;
  const oneTimeRevenue = installs.reduce(
    (sum, c) => sum + Number(c.install_fee ?? 0),
    0,
  );
  const foundersUsed = (customers ?? []).filter(
    (c) => c.founder_number != null,
  ).length;

  const activeSubs = (subs ?? []).filter((s) =>
    ["active", "trialing", "past_due"].includes(s.status),
  );
  const mrr = activeSubs.reduce(
    (sum, s) => sum + (s.plan === "annual" ? PLAN_ANNUAL_MRR : PLAN_MONTHLY),
    0,
  );

  const founderPct = Math.min(100, (foundersUsed / FOUNDER_SPOTS) * 100);

  const pipelineTotal = leadCount + scheduledCount + installedCount;
  const pipeline = [
    { label: "Leads", count: leadCount, tone: "bg-slate-300" },
    { label: "Scheduled", count: scheduledCount, tone: "bg-water" },
    { label: "Installed", count: installedCount, tone: "bg-beacon" },
  ];

  const quickActions = [
    {
      href: "/admin/builds",
      icon: Package,
      title: "Build catalog",
      body: "Edit the product line, supplies, and margins.",
    },
    {
      href: "/admin/shopping-list",
      icon: ShoppingCart,
      title: "Shopping list",
      body: "Generate a batch Amazon parts list with totals.",
    },
    {
      href: "/admin/customers",
      icon: Users,
      title: "Customers",
      body: "Provision a household and pair a device.",
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Operator HQ"
        icon={<LayoutDashboard className="h-6 w-6" />}
        title="Company HQ"
        subtitle="Your one place to run installs, the catalog, and the founder program."
        actions={
          <Link href="/admin/customers">
            <Button variant="beacon">+ New customer</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total installs" value={installs.length} />
        <Stat
          label="One-time revenue"
          value={currency(oneTimeRevenue)}
          hint="Collected install fees"
        />
        <Stat
          label="Plus MRR"
          value={currency(mrr)}
          hint={`${activeSubs.length} active subscriber${activeSubs.length === 1 ? "" : "s"}`}
          accent
        />
        <Stat label="Waitlist leads" value={waitlistCount ?? 0} />
      </div>

      <Card className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-title text-harbor">Install pipeline</h2>
          <Badge tone="neutral">{pipelineTotal} total</Badge>
        </div>
        <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-harbor-50">
          {pipelineTotal === 0 ? (
            <div className="h-full w-full bg-harbor-50" />
          ) : (
            pipeline.map((seg) => (
              <div
                key={seg.label}
                className={`h-full ${seg.tone} transition-all`}
                style={{ width: `${(seg.count / pipelineTotal) * 100}%` }}
              />
            ))
          )}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {pipeline.map((seg) => (
            <div key={seg.label} className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${seg.tone}`}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-eyebrow text-muted">{seg.label}</p>
                <p className="font-display text-xl font-extrabold text-harbor">
                  {seg.count}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-title text-harbor">Founding Family program</h2>
            <Badge tone="beacon">
              {foundersUsed} / {FOUNDER_SPOTS} claimed
            </Badge>
          </div>
          <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-harbor-50">
            <div
              className="h-full rounded-full bg-beacon transition-all"
              style={{ width: `${founderPct}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-muted">
            {FOUNDER_SPOTS - foundersUsed} founder spot
            {FOUNDER_SPOTS - foundersUsed === 1 ? "" : "s"} remaining at the $249
            rate. Numbers are auto-capped at {FOUNDER_SPOTS}.
          </p>
        </Card>

        <div>
          <h2 className="text-title mb-3 text-harbor">Quick actions</h2>
          <div className="grid gap-3">
            {quickActions.map(({ href, icon: Icon, title, body }) => (
              <Link key={href} href={href}>
                <Card interactive className="flex items-center gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-harbor-50 text-harbor">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-harbor">{title}</p>
                    <p className="text-sm text-muted">{body}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
