import Link from "next/link";
import { Tablet, Sparkles, ExternalLink, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { env } from "@/lib/env";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Badge, Input, Field } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { formatPairingCode } from "@/lib/pairing-format";
import { titleCase } from "@/lib/format";
import { setupMyFamily, newOwnerPairingCode } from "./actions";
import { PairingLink } from "./PairingLink";
import { ResetFamily } from "./ResetFamily";

export const metadata = { title: "My Family" };
export const dynamic = "force-dynamic";

export default async function MyFamilyPage() {
  const household = await getMyHousehold();
  const supabase = await createClient();

  const { data: pairings } = household
    ? await supabase
        .from("device_pairings")
        .select("code, status, created_at")
        .eq("household_id", household.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  const pending = (pairings ?? []).filter((p) => p.status === "pending");
  const paired = (pairings ?? []).filter((p) => p.status === "paired");

  if (!household) {
    return (
      <>
        <PageHeader
          title="Set up my family"
          subtitle="Use Harbor for your own family — free, with everything included."
        />
        <Card className="max-w-xl border-beacon/40 bg-beacon-soft/30">
          <Sparkles className="h-8 w-8 text-beacon" />
          <h2 className="mt-3 text-display-sm text-harbor">
            Your own Harbor — on the house
          </h2>
          <p className="mt-2 text-sm text-muted">
            This creates your family household with Harbor Plus included (cloud
            backup, edit-from-your-phone, insights), seeds a calm corner, and gives
            you a one-time link to open on your wall tablet. No payment, ever.
          </p>
          <form action={setupMyFamily} className="mt-4 flex flex-wrap items-end gap-3">
            <Field label="Family name" className="flex-1">
              <Input name="name" placeholder="The Pendarvis Family" defaultValue="My Family" />
            </Field>
            <SubmitButton variant="beacon" pendingText="Setting up…">
              Set up my family
            </SubmitButton>
          </form>
        </Card>
      </>
    );
  }

  const link = (code: string) => `${env.siteUrl}/kiosk?code=${code}`;

  return (
    <>
      <PageHeader
        title={household.name}
        subtitle="Your family wall. Open the link below on the tablet to pair it."
        actions={<Badge tone="green">Plus included</Badge>}
      />

      {pending.length > 0 ? (
        <div className="mb-4 space-y-3">
          <PairingLink url={link(pending[0].code)} code={pending[0].code} />
          <ol className="ml-4 list-decimal space-y-1 text-sm text-muted">
            <li>Open the link above on your wall tablet&apos;s browser.</li>
            <li>It pairs automatically, then asks you to set a parent PIN.</li>
            <li>Manage everything from the Harbor app on your phone.</li>
          </ol>
        </div>
      ) : (
        <Card className="mb-4">
          <p className="text-sm text-muted">
            No active setup link. Generate a fresh one to pair a wall.
          </p>
          <form action={newOwnerPairingCode.bind(null, household.id)} className="mt-3">
            <SubmitButton>
              <Plus className="h-4 w-4" /> New setup link
            </SubmitButton>
          </form>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2">
            <Tablet className="h-5 w-5 text-water" />
            <h2 className="text-title text-harbor">Walls</h2>
          </div>
          <ul className="mt-3 space-y-2">
            {paired.map((p) => (
              <li key={p.code} className="flex items-center justify-between rounded-lg bg-harbor-50 px-3 py-2">
                <span className="font-mono font-bold tracking-wider text-harbor">{formatPairingCode(p.code)}</span>
                <Badge tone="green">{titleCase(p.status)}</Badge>
              </li>
            ))}
            {paired.length === 0 && <li className="text-sm text-muted">No walls paired yet.</li>}
          </ul>
          {pending.length > 0 && (
            <form action={newOwnerPairingCode.bind(null, household.id)} className="mt-3">
              <SubmitButton size="sm" variant="secondary">
                <Plus className="h-4 w-4" /> Another setup link
              </SubmitButton>
            </form>
          )}
        </Card>

        <Card>
          <h2 className="text-title text-harbor">Manage your family</h2>
          <p className="mt-1 text-sm text-muted">
            Add kids, build routines, set rewards, and more in the parent app.
          </p>
          <Link
            href="/app"
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-harbor px-4 py-2.5 text-sm font-semibold text-white hover:bg-harbor-700"
          >
            Open the Harbor app <ExternalLink className="h-4 w-4" />
          </Link>
        </Card>
      </div>

      <ResetFamily />
    </>
  );
}
