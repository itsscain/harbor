import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { PageHeader } from "@/components/ui/PageHeader";
import { ChildCard } from "@/components/app/ChildCard";
import { AddChildCard } from "@/components/app/AddChildCard";
import { FirstRunWelcome } from "@/components/app/FirstRunWelcome";
import { SectionHeader } from "@/components/ui/primitives";
import { CHILD_PALETTE } from "@/lib/kiosk/colors";

export const metadata = { title: "Children" };
export const dynamic = "force-dynamic";

export default async function ChildrenPage() {
  const household = await getMyHousehold();
  if (!household) return <PageHeader title="Children" subtitle="No household yet." />;

  const supabase = await createClient();
  const { data: children } = await supabase
    .from("children")
    .select("*")
    .eq("household_id", household.id)
    .is("deleted_at", null)
    .order("sort_order");
  const list = children ?? [];
  const nextColor = CHILD_PALETTE[list.length % CHILD_PALETTE.length].value;

  if (list.length === 0) return <FirstRunWelcome defaultColor={nextColor} />;

  const ids = list.map((c) => c.id);
  const [{ data: routines }, { data: rewards }] = await Promise.all([
    supabase.from("routines").select("child_id").in("child_id", ids).is("deleted_at", null),
    supabase.from("rewards").select("child_id, points_total").in("child_id", ids),
  ]);
  const rc = new Map<string, number>();
  (routines ?? []).forEach((r) => rc.set(r.child_id, (rc.get(r.child_id) ?? 0) + 1));
  const pts = new Map<string, number>();
  (rewards ?? []).forEach((r) => pts.set(r.child_id, r.points_total ?? 0));
  const meta = (id: string) => {
    const r = rc.get(id) ?? 0;
    const p = pts.get(id) ?? 0;
    return `${r} ${r === 1 ? "routine" : "routines"} · ${p} ★`;
  };

  return (
    <>
      <PageHeader eyebrow="Your crew" title="Children" subtitle="Each child's color, avatar, and routines." />
      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((c, i) => (
          <ChildCard key={c.id} child={c} meta={meta(c.id)} index={i} />
        ))}
      </div>
      <div className="mt-8">
        <SectionHeader eyebrow="Grow the crew">Add a child</SectionHeader>
        <AddChildCard defaultColor={nextColor} />
      </div>
    </>
  );
}
