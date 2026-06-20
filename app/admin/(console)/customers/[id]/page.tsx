import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Badge, Button, Input, Field, Select } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { titleCase } from "@/lib/format";
import { formatPairingCode } from "@/lib/codes";
import { CustomerForm } from "./CustomerForm";
import { ProvisionPanel } from "./ProvisionPanel";
import {
  deleteCustomer,
  nextFounderNumber,
  generatePairingCodeForHousehold,
  addReferral,
  updateReferralStatus,
  deleteReferral,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function CustomerDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();
  if (!customer) notFound();

  const [{ data: builds }, { data: referrals }, nextFounder] = await Promise.all([
    supabase.from("builds").select("id, name").order("sort_order"),
    supabase
      .from("referrals")
      .select("*")
      .eq("referring_customer_id", id)
      .order("created_at"),
    nextFounderNumber(),
  ]);

  let pairings: { id: string; code: string; status: string }[] = [];
  let plusStatus: string | undefined;
  if (customer.household_id) {
    const [{ data: pd }, { data: sub }] = await Promise.all([
      supabase
        .from("device_pairings")
        .select("id, code, status")
        .eq("household_id", customer.household_id)
        .order("created_at"),
      supabase
        .from("plus_subscriptions")
        .select("status")
        .eq("household_id", customer.household_id)
        .maybeSingle(),
    ]);
    pairings = pd ?? [];
    plusStatus = sub?.status;
  }

  return (
    <>
      <Link
        href="/admin/customers"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-harbor"
      >
        <ArrowLeft className="h-4 w-4" /> Customers
      </Link>

      <PageHeader
        title={customer.name}
        subtitle={`Status: ${titleCase(customer.status)}`}
        actions={
          customer.founder_number != null ? (
            <Badge tone="beacon">Founder #{customer.founder_number}</Badge>
          ) : undefined
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="font-display text-lg font-bold text-harbor">Record</h2>
          <div className="mt-4">
            <CustomerForm
              customer={customer}
              builds={builds ?? []}
              nextFounder={nextFounder}
            />
          </div>
        </Card>

        <div className="space-y-4">
          {/* Provisioning */}
          <Card>
            <h2 className="font-display text-lg font-bold text-harbor">
              Provisioning
            </h2>
            {!customer.household_id ? (
              <ProvisionPanel
                customerId={customer.id}
                defaultHouseholdName={`${customer.name}'s Home`}
              />
            ) : (
              <div className="mt-3 space-y-4">
                <div className="flex items-center gap-2">
                  <Badge tone="green">Provisioned</Badge>
                  {["active", "trialing", "past_due"].includes(plusStatus ?? "") ? (
                    <Badge tone="green">Plus active</Badge>
                  ) : (
                    <Badge tone="gray">Plus inactive</Badge>
                  )}
                </div>

                <div>
                  <p className="text-sm font-semibold text-harbor">Pairing codes</p>
                  <ul className="mt-2 space-y-1.5">
                    {pairings.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between rounded-lg bg-harbor-50 px-3 py-2"
                      >
                        <span className="font-mono text-lg font-bold tracking-wider text-harbor">
                          {formatPairingCode(p.code)}
                        </span>
                        <Badge tone={p.status === "paired" ? "green" : "amber"}>
                          {titleCase(p.status)}
                        </Badge>
                      </li>
                    ))}
                    {pairings.length === 0 && (
                      <li className="text-sm text-muted">No codes yet.</li>
                    )}
                  </ul>
                  <form
                    action={generatePairingCodeForHousehold.bind(
                      null,
                      customer.household_id,
                      customer.id,
                    )}
                    className="mt-3"
                  >
                    <SubmitButton size="sm" variant="secondary">
                      <Plus className="h-4 w-4" /> New pairing code
                    </SubmitButton>
                  </form>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Referrals */}
      <Card className="mt-4">
        <h2 className="font-display text-lg font-bold text-harbor">Referrals</h2>
        <div className="mt-3 space-y-2">
          {(referrals ?? []).map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-harbor-100 p-3"
            >
              <div>
                <p className="font-medium text-ink">{r.referred_name}</p>
                {r.referred_contact && (
                  <p className="text-sm text-muted">{r.referred_contact}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <form
                  action={updateReferralStatus.bind(null, r.id, customer.id)}
                  className="flex items-center gap-2"
                >
                  <Select name="status" defaultValue={r.status} className="py-1.5 text-sm">
                    <option value="pending">Pending</option>
                    <option value="contacted">Contacted</option>
                    <option value="converted">Converted</option>
                    <option value="declined">Declined</option>
                  </Select>
                  <SubmitButton size="sm" variant="secondary">
                    Save
                  </SubmitButton>
                </form>
                <form action={deleteReferral.bind(null, r.id, customer.id)}>
                  <button
                    type="submit"
                    className="rounded-lg border border-red-200 p-2 text-red-700 hover:bg-red-50"
                    aria-label="Delete referral"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          ))}
          {(referrals ?? []).length === 0 && (
            <p className="text-sm text-muted">No referrals captured yet.</p>
          )}
        </div>

        <form
          action={addReferral.bind(null, customer.id)}
          className="mt-4 grid gap-3 border-t border-harbor-100 pt-4 sm:grid-cols-3"
        >
          <Field label="Referred name">
            <Input name="referred_name" required placeholder="Who they referred" />
          </Field>
          <Field label="Contact">
            <Input name="referred_contact" placeholder="email or phone" />
          </Field>
          <div className="flex items-end">
            <SubmitButton>Add referral</SubmitButton>
          </div>
        </form>
      </Card>

      {/* Danger */}
      <Card className="mt-4 border-red-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-red-700">
              Delete customer
            </h2>
            <p className="text-sm text-muted">
              Removes the customer record. Provisioned households are not deleted.
            </p>
          </div>
          <form action={deleteCustomer.bind(null, customer.id)}>
            <Button type="submit" variant="danger">
              Delete
            </Button>
          </form>
        </div>
      </Card>
    </>
  );
}
