import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { buildTodayModel } from "@/lib/today";
import { Card } from "@/components/ui/primitives";
import { FirstRunWelcome } from "@/components/app/FirstRunWelcome";
import { TodayView } from "@/components/app/today/TodayView";
import { CHILD_PALETTE } from "@/lib/kiosk/colors";

export const metadata = { title: "Today" };
export const dynamic = "force-dynamic";

// Today — the action center (what needs me · kids right now · today & tonight · house mode).
export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string }>;
}) {
  const household = await getMyHousehold();
  if (!household) {
    return (
      <Card>
        <h1 className="text-display-sm text-fg">No household yet</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Your Harbor household will appear here once it&apos;s set up. If you just got an invite, check your email
          to finish creating your account.
        </p>
      </Card>
    );
  }

  const supabase = await createClient();
  const { setup } = await searchParams;
  const m = await buildTodayModel(supabase, household, { forceSetup: setup === "1" });

  // Brand-new household → the focused welcome (add your first child).
  if (m.kids.length === 0) return <FirstRunWelcome defaultColor={CHILD_PALETTE[0].value} />;
  return <TodayView m={m} />;
}
