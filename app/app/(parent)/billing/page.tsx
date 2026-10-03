import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold, plusActive } from "@/lib/household";
import { isStripeConfigured } from "@/lib/env";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Badge } from "@/components/ui/primitives";
import { BillingActions } from "./BillingActions";

export const metadata = { title: "Harbor Plus" };
export const dynamic = "force-dynamic";

// Editing from your phone and seeing it on the wall is FREE for every family (2026-10). Plus is
// the extras on top.
const PLUS_FEATURES = [
  "Patterns — how the week went, gently",
  "More routines, stories and templates",
  "Built-in AI helpers (coming soon)",
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
        subtitle={isActive ? "Thanks for supporting Harbor." : "Optional extras. Your wall and phone stay free."}
        actions={isActive ? <Badge tone="green">Active</Badge> : undefined}
      />

      <Card className="mb-4">
        {!isActive && (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-display-sm text-fg">
            $3.99<span className="text-base font-medium text-fg-muted">/mo</span>
          </p>
          <span className="text-fg-muted">or</span>
          <p className="text-display-sm text-fg">
            $39<span className="text-base font-medium text-fg-muted">/yr</span>
          </p>
          <Badge tone="green">Save 18% yearly</Badge>
        </div>
        )}
        {isActive && sub?.current_period_end && (
          <p className="text-[15px] text-fg">
            {sub.plan ? `${sub.plan} plan · ` : ""}renews{" "}
            {new Date(sub.current_period_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        )}
        <ul className={isActive ? "mt-4 space-y-2" : "mt-4 space-y-2"}>
          {PLUS_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-fg">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-good" />
              {f}
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <BillingActions isActive={isActive} configured={configured} />
        </div>
      </Card>

      <Card className="border-line bg-surface-2">
        <p className="text-sm text-fg-muted">
          <strong className="text-fg">Cancel anytime.</strong> Your phone and wall keep working either way —
          you&apos;d only lose the extras.
        </p>
      </Card>
    </>
  );
}
