import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold, plusActive } from "@/lib/household";
import { isStripeConfigured } from "@/lib/env";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Badge } from "@/components/ui/primitives";
import { BillingActions } from "./BillingActions";

export const metadata = { title: "Harbor Plus" };
export const dynamic = "force-dynamic";

const PLUS_FEATURES = [
  "Cloud backup of your routines and progress",
  "Edit from your phone and push to the wall",
  "Gentle insights and trends",
  "The growing content & template library",
  "New features first",
];

export default async function BillingPage() {
  const household = await getMyHousehold();
  const supabase = await createClient();
  const { data: sub } = household
    ? await supabase
        .from("plus_subscriptions")
        .select("status, plan, current_period_end")
        .eq("household_id", household.id)
        .maybeSingle()
    : { data: null };

  const isActive = plusActive(sub?.status);
  const configured = isStripeConfigured();

  return (
    <>
      <PageHeader
        title="Harbor Plus"
        subtitle="Optional. Your wall works free, forever — Plus just adds the extras."
        actions={isActive ? <Badge tone="green">Active</Badge> : undefined}
      />

      <Card className="mb-4">
        <p className="font-display text-2xl font-extrabold text-harbor">
          $3.99<span className="text-base font-medium text-muted">/mo</span>
          <span className="mx-2 text-muted">·</span>
          $39<span className="text-base font-medium text-muted">/yr</span>
        </p>
        <ul className="mt-4 space-y-2">
          {PLUS_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-ink">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              {f}
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <BillingActions isActive={isActive} configured={configured} />
        </div>
      </Card>

      <Card className="border-harbor-100 bg-harbor-50">
        <p className="text-sm text-muted">
          <strong className="text-harbor">Cancel anytime.</strong> If you stop
          Plus, your wall keeps running exactly as-is from the tablet&apos;s own
          data — you only lose cloud backup, remote editing, and new content.
          Nothing on the wall breaks.
        </p>
      </Card>
    </>
  );
}
