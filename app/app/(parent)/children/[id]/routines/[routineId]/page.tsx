import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { loadRoutineEditor } from "@/lib/kid";
import { SetTopBarTitle } from "@/components/app/AppTopBar";
import { RoutineEditor } from "@/components/app/kids/RoutineEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Routine" };

// One routine on one screen — steps, when, days, who. Everything saves as you go.
export default async function RoutinePage({ params }: { params: Promise<{ id: string; routineId: string }> }) {
  const { id, routineId } = await params;
  const household = await getMyHousehold();
  if (!household) notFound();
  const supabase = await createClient();
  const data = await loadRoutineEditor(supabase, household, routineId);
  if (!data) notFound();
  const accent = data.kids.find((k) => k.id === id)?.color ?? "#18606f";

  return (
    <>
      <SetTopBarTitle title={data.routine.name} />
      <RoutineEditor kidId={id} accent={accent} routine={data.routine} steps={data.steps} kids={data.kids} library={data.library} slots={data.slots} overrides={data.overrides} />
    </>
  );
}
