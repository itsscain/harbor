import Link from "next/link";
import { Search, ChevronRight, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, Badge, Input } from "@/components/ui/primitives";

export const metadata = { title: "Accounts" };
export const dynamic = "force-dynamic";

const isPlus = (s?: string) => !!s && ["active", "trialing", "past_due"].includes(s);

export default async function AccountsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toLowerCase();

  const supabase = await createClient();
  const [{ data: households }, { data: customers }, { data: devices }, { data: subs }] = await Promise.all([
    supabase.from("households").select("id, name, created_at").order("created_at", { ascending: false }),
    supabase.from("customers").select("household_id, name"),
    supabase.from("device_pairings").select("household_id, status"),
    supabase.from("plus_subscriptions").select("household_id, status"),
  ]);

  const custByHh = new Map((customers ?? []).filter((c) => c.household_id).map((c) => [c.household_id, c.name]));
  const subByHh = new Map((subs ?? []).map((s) => [s.household_id, s.status]));
  const deviceCount = new Map<string, number>();
  for (const d of devices ?? []) if (d.household_id) deviceCount.set(d.household_id, (deviceCount.get(d.household_id) ?? 0) + 1);

  const list = (households ?? []).filter((h) => {
    if (!q) return true;
    const cust = custByHh.get(h.id) ?? "";
    return `${h.name} ${cust}`.toLowerCase().includes(q);
  });

  return (
    <>
      <PageHeader
        eyebrow="Run"
        icon={<ShieldCheck className="h-6 w-6" />}
        title="Accounts"
        subtitle="Open any customer account to inspect, diagnose, and fix it. Every action is audited."
      />

      <form className="mb-4 max-w-sm" action="/admin/accounts" method="get">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input name="q" defaultValue={sp.q ?? ""} placeholder="Search households or customers…" className="pl-9" />
        </div>
      </form>

      <div className="grid gap-3">
        {list.map((h) => {
          const cust = custByHh.get(h.id);
          const sub = subByHh.get(h.id);
          const devs = deviceCount.get(h.id) ?? 0;
          return (
            <Link key={h.id} href={`/admin/accounts/${h.id}`}>
              <Card interactive className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-title text-harbor">{h.name}</h2>
                    {isPlus(sub) && <Badge tone="green">Plus</Badge>}
                  </div>
                  <p className="text-sm text-muted">
                    {cust ? `${cust} · ` : ""}
                    {devs} device{devs === 1 ? "" : "s"}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
              </Card>
            </Link>
          );
        })}
        {list.length === 0 && (
          <EmptyState
            icon={<ShieldCheck className="h-9 w-9" />}
            title={(households ?? []).length === 0 ? "No accounts yet" : "No match"}
            body={(households ?? []).length === 0 ? "Households appear here once customers are provisioned." : `Nothing matches "${sp.q}".`}
          />
        )}
      </div>
    </>
  );
}
