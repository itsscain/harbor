import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { buildPlanModel } from "@/lib/plan";
import { PageHeader } from "@/components/ui/PageHeader";
import { PlanAgenda } from "@/components/app/plan/PlanAgenda";
import { PLAN_GROUPS } from "@/lib/app-nav";

export const metadata = { title: "Plan" };
export const dynamic = "force-dynamic";

// Plan — the next two weeks in one list (events, reminders, dinners), then the other planning
// tools. Everything here also shows on the wall.
export default async function PlanPage() {
  const household = await getMyHousehold();
  if (!household) return <PageHeader title="Plan" subtitle="No household yet." />;
  const supabase = await createClient();
  const model = await buildPlanModel(supabase, household);
  const tools = PLAN_GROUPS.flatMap((g) => g.items);

  return (
    <>
      <PageHeader title="Plan" subtitle="The next two weeks. Tap anything to change it — the wall updates right away." />
      <PlanAgenda model={model} />

      <h2 className="mb-2 mt-8 text-title text-fg">More planning</h2>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {tools.map((t) => (
          <li key={t.href}>
            <Link href={t.href} className="flex min-h-16 items-center gap-3 px-4 py-3 transition hover:bg-surface-2">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-fg-muted">
                <t.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-fg">{t.label}</span>
                <span className="block truncate text-sm text-fg-muted">{t.desc}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
