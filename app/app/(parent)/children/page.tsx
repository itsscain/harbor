import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { buildTodayModel } from "@/lib/today";
import { PageHeader } from "@/components/ui/PageHeader";
import { FirstRunWelcome } from "@/components/app/FirstRunWelcome";
import { KidNow } from "@/components/app/today/KidNow";
import { AddChildLauncher } from "@/components/app/kids/AddChildSheet";
import { CHILD_PALETTE } from "@/lib/kiosk/colors";

export const metadata = { title: "Kids" };
export const dynamic = "force-dynamic";

// Kids — each kid's day at a glance (same live card as Today), one tap into their page.
export default async function KidsPage({ searchParams }: { searchParams: Promise<{ add?: string }> }) {
  const household = await getMyHousehold();
  if (!household) return <PageHeader title="Kids" subtitle="No household yet." />;
  const supabase = await createClient();
  const { add } = await searchParams;
  const m = await buildTodayModel(supabase, household);
  const nextColor = CHILD_PALETTE[m.kids.length % CHILD_PALETTE.length].value;

  if (m.kids.length === 0) return <FirstRunWelcome defaultColor={nextColor} />;

  return (
    <>
      <PageHeader
        title="Kids"
        subtitle="Tap a kid for their day, routines, chores and stars."
        actions={<AddChildLauncher nextColor={nextColor} autoOpen={add === "1"} variant="secondary" />}
      />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {m.kids.map((k) => (
          <KidNow key={k.id} kid={k} />
        ))}
      </div>
    </>
  );
}
