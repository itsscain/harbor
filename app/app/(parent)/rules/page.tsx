import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { PageHeader } from "@/components/ui/PageHeader";
import { RulesView, type Rule } from "@/components/app/rules/RulesView";

export const metadata = { title: "House rules" };
export const dynamic = "force-dynamic";

// House rules — a few clear rules on the wall, and the same calm steps if one is broken.
export default async function RulesPage() {
  const household = await getMyHousehold();
  if (!household) return <PageHeader title="House rules" subtitle="No household yet." />;
  const supabase = await createClient();
  const { data } = await supabase.from("house_rules").select("id, kind, title, detail, emoji").eq("household_id", household.id).is("deleted_at", null).order("sort_order");
  const rules: Rule[] = (data ?? []).map((r) => ({ ...r, kind: r.kind === "consequence" ? "consequence" : "rule" }));
  return (
    <>
      <PageHeader title="House rules" subtitle="Clear rules on the wall, and calm steps if one is broken." />
      <RulesView rules={rules} />
    </>
  );
}
