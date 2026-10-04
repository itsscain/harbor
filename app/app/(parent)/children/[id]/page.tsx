import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { loadKidBasics, loadKidDay, loadKidRoutines, loadKidChores } from "@/lib/kid";
import { SetTopBarTitle } from "@/components/app/AppTopBar";
import { KidHeader, KidTabs, parseKidTab } from "@/components/app/kids/KidChrome";
import { KidTodayView, KidRoutinesView, KidChoresView, KidAboutView, KidLearnView } from "@/components/app/kids/KidTabViews";
import { loadKidLearn, nowDate } from "@/lib/learn/parent";
import { tzFromSettings } from "@/lib/tz";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("children").select("name").eq("id", id).maybeSingle();
  return { title: data?.name ?? "Kid" };
}

// A kid's page: their face and stars up top, then plain tabs — Today, Routines, Chores & stars,
// Learn, About. Each tab loads only what it shows.
export default async function KidPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; add?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const household = await getMyHousehold();
  if (!household) notFound();
  const supabase = await createClient();
  const kid = await loadKidBasics(supabase, id);
  if (!kid) notFound();
  const tab = parseKidTab(sp.tab);

  let body: React.ReactNode;
  if (tab === "routines") {
    const d = await loadKidRoutines(supabase, household, kid.id);
    body = <KidRoutinesView kid={kid} routines={d.routines} siblings={d.siblings} templates={d.templates} autoAdd={sp.add === "1"} />;
  } else if (tab === "chores") {
    const d = await loadKidChores(supabase, household, kid.id);
    body = <KidChoresView kid={kid} chores={d.chores} kids={d.kids} storeCount={d.storeCount} />;
  } else if (tab === "learn") {
    const tz = tzFromSettings(household.settings as Record<string, unknown> | null);
    body = <KidLearnView kid={kid} data={await loadKidLearn(supabase, kid, tz)} now={nowDate()} />;
  } else if (tab === "about") {
    body = <KidAboutView kid={kid} />;
  } else {
    body = <KidTodayView kid={kid} day={await loadKidDay(supabase, household, kid.id)} />;
  }

  return (
    <>
      <SetTopBarTitle title={kid.name} />
      <KidHeader kid={kid} />
      <KidTabs kidId={kid.id} active={tab} />
      {body}
    </>
  );
}
