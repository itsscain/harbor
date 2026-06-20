import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
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

export default async function CustomersPage() {
  const supabase = await createClient();
  const [{ data: customers }, { data: builds }, { data: subs }] =
    await Promise.all([
      supabase
        .from("customers")
        .select("*, builds(name)")
        .order("created_at", { ascending: false }),
      supabase.from("builds").select("id, name").order("sort_order"),
      supabase.from("plus_subscriptions").select("household_id, status"),
    ]);

  const plusByHousehold = new Map(
    (subs ?? []).map((s) => [s.household_id, s.status]),
  );
  const isPlusActive = (status?: string) =>
    !!status && ["active", "trialing", "past_due"].includes(status);

  return (
    <>
      <PageHeader
        title="Customers & Installs"
        subtitle="Leads → scheduled → installed. Provision households and pair devices from each record."
      />

      <Card className="mb-4">
        <h2 className="font-display text-lg font-bold text-harbor">Add a lead</h2>
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
      </Card>

      <div className="grid gap-3">
        {(customers ?? []).map((c) => {
          const plusStatus = c.household_id
            ? plusByHousehold.get(c.household_id)
            : undefined;
          return (
            <Link key={c.id} href={`/admin/customers/${c.id}`}>
              <Card className="flex items-center justify-between hover:border-water/50">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-lg font-bold text-harbor">
                      {c.name}
                    </h2>
                    <Badge tone={statusTone[c.status]}>{titleCase(c.status)}</Badge>
                    {c.founder_number != null && (
                      <Badge tone="beacon">Founder #{c.founder_number}</Badge>
                    )}
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
        {(customers ?? []).length === 0 && (
          <Card>
            <p className="py-6 text-center text-sm text-muted">
              No customers yet. Add your first lead above.
            </p>
          </Card>
        )}
      </div>
    </>
  );
}
