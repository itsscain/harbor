import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMyHousehold } from "@/lib/household";
import { PageHeader } from "@/components/ui/PageHeader";
import { GrownUpsView, type AppMember, type Person } from "@/components/app/family/GrownUpsView";

export const metadata = { title: "Grown-ups" };
export const dynamic = "force-dynamic";

// Grown-ups — who can use Harbor (co-parents) and who shows up on the wall with their own routine.
export default async function FamilyPage() {
  const household = await getMyHousehold();
  if (!household) return <PageHeader title="Grown-ups" subtitle="No household yet." />;
  const supabase = await createClient();

  const [{ data: people }, { data: kids }, { data: authData }] = await Promise.all([
    supabase.from("people").select("id, name, avatar, role, color, photo_url").eq("household_id", household.id).is("deleted_at", null).order("sort_order"),
    supabase.from("children").select("id, name, avatar, photo_url, color").eq("household_id", household.id).is("deleted_at", null).order("sort_order"),
    supabase.auth.getUser(),
  ]);
  const personIds = (people ?? []).map((p) => p.id);
  const { data: routines } = personIds.length
    ? await supabase.from("routines").select("id, person_id, name, active, with_child_id, days_of_week, sort_order").in("person_id", personIds).is("deleted_at", null).order("sort_order")
    : { data: [] as { id: string; person_id: string | null; name: string; active: boolean; with_child_id: string | null; days_of_week: number[] | null; sort_order: number }[] };
  const routineIds = (routines ?? []).map((r) => r.id);
  const { data: steps } = routineIds.length
    ? await supabase.from("routine_steps").select("id, routine_id, label, icon, order_index").in("routine_id", routineIds).is("deleted_at", null).order("order_index")
    : { data: [] as { id: string; routine_id: string; label: string; icon: string | null; order_index: number }[] };

  // Co-parents: emails come from the admin client (tolerant of no service-role key, e.g. local dev).
  const isOwner = !!authData.user && household.owner_id === authData.user.id;
  let members: AppMember[] = [];
  let invitesAvailable = false;
  try {
    const admin = createAdminClient();
    const { data: rows } = await admin.from("household_members").select("profile_id, created_at").eq("household_id", household.id).order("created_at");
    members = await Promise.all(
      (rows ?? []).map(async (m) => {
        let email = "(account)";
        try {
          const { data } = await admin.auth.admin.getUserById(m.profile_id);
          email = data?.user?.email ?? email;
        } catch {
          /* leave placeholder */
        }
        return { profileId: m.profile_id, email, isOwner: m.profile_id === household.owner_id };
      }),
    );
    invitesAvailable = true;
  } catch {
    /* no service-role key */
  }

  const list: Person[] = (people ?? []).map((p) => ({
    ...p,
    routines: (routines ?? [])
      .filter((r) => r.person_id === p.id)
      .map((r) => ({
        id: r.id,
        name: r.name,
        active: r.active,
        withChildId: r.with_child_id,
        days: r.days_of_week,
        steps: (steps ?? []).filter((s) => s.routine_id === r.id).map((s) => ({ id: s.id, label: s.label, icon: s.icon })),
      })),
  }));

  return (
    <>
      <PageHeader title="Grown-ups" subtitle="Who can use Harbor, and who's on the wall." />
      <GrownUpsView members={members} isOwner={isOwner} invitesAvailable={invitesAvailable} people={list} kids={kids ?? []} />
    </>
  );
}
