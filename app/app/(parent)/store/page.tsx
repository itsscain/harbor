import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { PageHeader } from "@/components/ui/PageHeader";
import { RewardsView, type Reward, type FamilyGoal } from "@/components/app/store/RewardsView";

export const metadata = { title: "Rewards" };
export const dynamic = "force-dynamic";

// Rewards — what kids spend their stars on, plus the family goal everyone fills together.
export default async function StorePage() {
  const household = await getMyHousehold();
  if (!household) return <PageHeader title="Rewards" subtitle="No household yet." />;
  const supabase = await createClient();
  const [{ data: items }, { data: kids }] = await Promise.all([
    supabase.from("store_items").select("id, label, emoji, cost_points, kind, child_id, enabled").eq("household_id", household.id).is("deleted_at", null).order("sort_order"),
    supabase.from("children").select("id, name, avatar, photo_url, color").eq("household_id", household.id).is("deleted_at", null).order("sort_order"),
  ]);
  const kidIds = (kids ?? []).map((k) => k.id);
  const { data: balances } = kidIds.length ? await supabase.from("rewards").select("points_total").in("child_id", kidIds) : { data: [] as { points_total: number }[] };

  const g = ((household.settings ?? {}) as Record<string, unknown>).family_goal as
    | { label?: string; emoji?: string; target?: number; reward?: string | null; active?: boolean }
    | null
    | undefined;
  const goal: FamilyGoal = g?.label
    ? { label: g.label, emoji: g.emoji ?? null, target: g.target ?? 100, reward: g.reward ?? null, active: g.active !== false }
    : null;
  const rewards: Reward[] = (items ?? []).map((i) => ({
    id: i.id,
    label: i.label,
    emoji: i.emoji,
    cost: i.cost_points,
    kind: i.kind,
    childId: i.child_id,
    enabled: i.enabled,
  }));

  return (
    <>
      <PageHeader title="Rewards" subtitle="What kids spend their stars on. It all shows on the wall." />
      <RewardsView rewards={rewards} kids={kids ?? []} goal={goal} familyStars={(balances ?? []).reduce((n, b) => n + (b.points_total ?? 0), 0)} />
    </>
  );
}
