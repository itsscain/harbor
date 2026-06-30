import { Settings as SettingsIcon, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Field, Input, Switch, Badge } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { getFounderStatus } from "@/lib/actions/founder";
import { updateFounderProgram } from "./actions";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: prog }, status] = await Promise.all([
    supabase.from("founder_program").select("cap, rate, enrollment_state").maybeSingle(),
    getFounderStatus(),
  ]);
  const cap = prog?.cap ?? 15;
  const rate = prog?.rate ?? 249;
  const paused = (prog?.enrollment_state ?? "open") === "paused";
  const claimed = status.cap - status.remaining;

  return (
    <>
      <PageHeader
        eyebrow="Operator"
        icon={<SettingsIcon className="h-6 w-6" />}
        title="Settings"
        subtitle="Business configuration. The founder program drives the public funnel live."
      />

      <Card>
        <div className="mb-1 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-beacon" />
          <h2 className="text-title text-harbor">Founder program</h2>
          <Badge tone={paused ? "amber" : "green"}>{paused ? "Paused" : "Open"}</Badge>
        </div>
        <p className="text-sm text-muted">
          {claimed} of {status.cap} claimed · {status.remaining} remaining.
          {paused ? " Enrollment is paused — the public page shows a waitlist." : ""}
        </p>

        <form action={updateFounderProgram} className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Founder spots (cap)" hint="The public counter + auto-waitlist follow this.">
            <Input name="cap" type="number" min={1} max={999} defaultValue={cap} />
          </Field>
          <Field label="Founder rate ($)" hint="Shown on the funnel; per-build founder prices live in the Catalog.">
            <Input name="rate" type="number" min={0} step="1" defaultValue={Number(rate)} />
          </Field>
          <div className="rounded-xl border border-harbor-100 px-3.5 py-3 sm:col-span-2">
            <Switch
              name="paused"
              label="Pause enrollment"
              hint="When paused (or sold out), the public link becomes a waitlist — advertising is never wasted."
              defaultChecked={paused}
            />
          </div>
          <div className="sm:col-span-2">
            <SubmitButton variant="secondary">Save founder program</SubmitButton>
          </div>
        </form>
      </Card>

      <Card className="mt-4">
        <h2 className="text-title text-harbor">More settings</h2>
        <p className="mt-1 text-sm text-muted">
          Business profile (name, logo, service area, SDVOSB), pricing &amp; fees, team &amp; roles (RBAC), and
          integrations (Stripe, email/SMS) arrive with the remaining Operator HQ phases.
        </p>
      </Card>
    </>
  );
}
