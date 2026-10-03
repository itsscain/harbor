import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { PageHeader } from "@/components/ui/PageHeader";
import { CalmToolsView, type CalmTool } from "@/components/app/calm/CalmToolsView";

export const metadata = { title: "Calm tools" };
export const dynamic = "force-dynamic";

// Calm tools — what kids can reach any time on the wall when feelings get big.
export default async function CalmPage() {
  const household = await getMyHousehold();
  if (!household) return <PageHeader title="Calm tools" subtitle="No household yet." />;
  const supabase = await createClient();
  const { data } = await supabase.from("calm_tools").select("id, tool_type, enabled, config").eq("household_id", household.id).is("deleted_at", null).order("sort_order");
  const tools: CalmTool[] = (data ?? []).map((t) => ({ id: t.id, type: t.tool_type, enabled: t.enabled, config: (t.config ?? {}) as Record<string, unknown> }));
  return (
    <>
      <PageHeader title="Calm tools" subtitle="What kids can reach any time on the wall when feelings get big." />
      <CalmToolsView tools={tools} />
    </>
  );
}
