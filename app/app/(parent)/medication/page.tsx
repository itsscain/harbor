import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { loadMeds } from "@/lib/meds";
import { PageHeader } from "@/components/ui/PageHeader";
import { MedsView } from "@/components/app/meds/MedsView";

export const metadata = { title: "Medicine" };
export const dynamic = "force-dynamic";

// Medicine — each kid's medicines, today's doses (one tap to mark given), and a log for the doctor.
export default async function MedicationPage() {
  const household = await getMyHousehold();
  if (!household) return <PageHeader title="Medicine" subtitle="No household yet." />;
  const supabase = await createClient();
  const { kids, log } = await loadMeds(supabase, household);
  return (
    <>
      <PageHeader title="Medicine" subtitle="Calm reminders on the wall, and a record of every dose. No stars — health isn’t a prize." />
      <MedsView kids={kids} log={log} />
    </>
  );
}
