import Link from "next/link";
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

  return (
    <>
      <PageHeader
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
        />
        <Stat label="Waitlist leads" value={waitlistCount ?? 0} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-harbor">
              Founding Family program
            </h2>
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

        <Card>
          <h2 className="font-display text-lg font-bold text-harbor">
            Quick actions
          </h2>
          <div className="mt-4 grid gap-2">
            <Link href="/admin/builds">
              <Button variant="secondary" className="w-full justify-start">
                Manage the build catalog
              </Button>
            </Link>
            <Link href="/admin/shopping-list">
              <Button variant="secondary" className="w-full justify-start">
                Generate a batch shopping list
              </Button>
            </Link>
            <Link href="/admin/customers">
              <Button variant="secondary" className="w-full justify-start">
                Provision a customer &amp; pair a device
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </>
  );
}
