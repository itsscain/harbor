import Link from "next/link";
import { ChevronRight, Users, Search, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, Badge, Input, Field, Select } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { titleCase } from "@/lib/format";
import { createCustomer } from "./actions";

export const metadata = { title: "Customers" };
export const dynamic = "force-dynamic";

const statusTone: Record<string, "gray" | "blue" | "green"> = {
  lead: "gray",
  scheduled: "blue",
  installed: "green",
};
const STAGES = ["lead", "scheduled", "installed"] as const;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stage?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toLowerCase();
  const stage = STAGES.includes(sp.stage as (typeof STAGES)[number]) ? sp.stage : "";

  const supabase = await createClient();
  const [{ data: customers }, { data: builds }, { data: subs }, { count: reservedSignups }] = await Promise.all([
    supabase.from("customers").select("*, builds(name)").order("created_at", { ascending: false }),
    supabase.from("builds").select("id, name").order("sort_order"),
    supabase.from("plus_subscriptions").select("household_id, status"),
    supabase.from("founder_signups").select("id", { count: "exact", head: true }).eq("status", "reserved"),
  ]);

  const all = customers ?? [];
  const plusByHousehold = new Map((subs ?? []).map((s) => [s.household_id, s.status]));
  const isPlusActive = (status?: string) => !!status && ["active", "trialing", "past_due"].includes(status);
  const countByStage = (s: string) => all.filter((c) => c.status === s).length;

  const filtered = all.filter((c) => {
    if (stage && c.status !== stage) return false;
    if (q && !(`${c.name} ${c.email ?? ""}`.toLowerCase().includes(q))) return false;
    return true;
  });

  const chips: { key: string; label: string; count: number }[] = [
    { key: "", label: "All", count: all.length },
    ...STAGES.map((s) => ({ key: s, label: titleCase(s), count: countByStage(s) })),
  ];
  const chipHref = (key: string) => {
    const p = new URLSearchParams();
    if (key) p.set("stage", key);
    if (q) p.set("q", sp.q ?? "");
    const s = p.toString();
    return s ? `?${s}` : "/admin/customers";
  };

  return (
    <>
      <PageHeader
        eyebrow="Customers"
        icon={<Users className="h-6 w-6" />}
        title="Customers & Installs"
        subtitle="Move families lead → scheduled → installed. Provision households and pair devices from each record."
      />

      {(reservedSignups ?? 0) > 0 && (
        <Link
          href="/admin/founders"
          className="mb-4 flex items-center justify-between rounded-2xl border border-beacon/40 bg-beacon-soft/50 px-4 py-3"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-harbor">
            <Sparkles className="h-5 w-5 text-beacon" />
            {reservedSignups} founder signup{reservedSignups === 1 ? "" : "s"} waiting to be approved into the pipeline
          </span>
          <ChevronRight className="h-4 w-4 text-muted" />
        </Link>
      )}

      {/* stage filter + search */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {chips.map((c) => (
          <Link
            key={c.key || "all"}
            href={chipHref(c.key)}
            className={
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition " +
              (stage === c.key ? "bg-harbor text-white" : "bg-white text-harbor ring-1 ring-harbor-100 hover:bg-harbor-50")
            }
          >
            {c.label}
            <span className={"tabular-nums " + (stage === c.key ? "text-white/70" : "text-muted")}>{c.count}</span>
          </Link>
        ))}
        <form className="ml-auto flex items-center gap-2" action="/admin/customers" method="get">
          {stage ? <input type="hidden" name="stage" value={stage} /> : null}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input name="q" defaultValue={sp.q ?? ""} placeholder="Search name or email…" className="w-56 pl-9" />
          </div>
        </form>
      </div>

      <div className="grid gap-3">
        {filtered.map((c) => {
          const plusStatus = c.household_id ? plusByHousehold.get(c.household_id) : undefined;
          return (
            <Link key={c.id} href={`/admin/customers/${c.id}`}>
              <Card interactive className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-title text-harbor">{c.name}</h2>
                    <Badge tone={statusTone[c.status]}>{titleCase(c.status)}</Badge>
                    {c.founder_number != null && <Badge tone="beacon">Founder #{c.founder_number}</Badge>}
                    {c.household_id && <Badge tone="neutral">Provisioned</Badge>}
                    {isPlusActive(plusStatus) && <Badge tone="green">Plus</Badge>}
                  </div>
                  <p className="text-sm text-muted">
                    {(c.builds as { name: string } | null)?.name ?? "No build"}
                    {c.email ? ` · ${c.email}` : ""}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
              </Card>
            </Link>
          );
        })}
        {filtered.length === 0 &&
          (all.length === 0 ? (
            <EmptyState
              icon={<Users className="h-9 w-9" />}
              title="No customers yet"
              body="Approve a founder signup, or add a lead below — then provision a household and pair a device."
            />
          ) : (
            <Card className="text-center text-muted">No customers match {q ? `"${sp.q}"` : "this stage"}.</Card>
          ))}
      </div>

      {/* add a lead (collapsed — the pipeline is the hero) */}
      <details className="mt-5 rounded-2xl border border-harbor-100 bg-white p-5 shadow-card">
        <summary className="cursor-pointer font-display font-bold text-harbor">+ Add a lead manually</summary>
        <form action={createCustomer} className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Name">
            <Input name="name" required placeholder="Family / contact name" />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" placeholder="parent@email.com" />
          </Field>
          <Field label="Phone">
            <Input name="phone" placeholder="(555) 555-5555" />
          </Field>
          <Field label="Build (intended)">
            <Select name="build_id" defaultValue="">
              <option value="">— none yet —</option>
              {(builds ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <SubmitButton pendingText="Adding…">Add lead</SubmitButton>
          </div>
        </form>
      </details>
    </>
  );
}
