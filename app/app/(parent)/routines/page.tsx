import Link from "next/link";
import { ChevronRight, Plus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { loadAllKidRoutines } from "@/lib/kid";
import { PageHeader } from "@/components/ui/PageHeader";
import { MiniAvatar } from "@/components/ui/Chips";
import { cn } from "@/lib/cn";

export const metadata = { title: "All routines" };
export const dynamic = "force-dynamic";

// All routines — every kid's routines in one list. Tap one to change it; each kid has an
// "Add a routine" that opens templates, copying from a sibling, or starting blank.
export default async function RoutinesPage() {
  const household = await getMyHousehold();
  if (!household) return <PageHeader title="All routines" subtitle="No household yet." />;
  const supabase = await createClient();
  const all = await loadAllKidRoutines(supabase, household);

  return (
    <>
      <PageHeader title="All routines" subtitle="Every kid's routines in one place. Tap one to change it." />
      {all.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-strong p-6 text-center">
          <p className="font-semibold text-fg">No kids yet</p>
          <Link href="/app/children?add=1" className="mt-2 inline-block text-sm font-semibold text-accent">
            Add a child
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {all.map(({ kid, routines }) => (
            <section key={kid.id}>
              <div className="mb-2 flex items-center gap-3">
                <MiniAvatar kid={kid} size={32} />
                <h2 className="min-w-0 flex-1 truncate text-title text-fg">{kid.name}</h2>
                <Link
                  href={`/app/children/${kid.id}?tab=routines&add=1`}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-line-strong px-3 text-sm font-semibold text-fg transition hover:bg-surface-2"
                >
                  <Plus className="h-4 w-4" /> Add
                </Link>
              </div>
              {routines.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-line-strong px-4 py-3.5 text-sm text-fg-muted">No routines yet.</p>
              ) : (
                <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                  {routines.map((r) => (
                    <li key={r.id}>
                      <Link href={`/app/children/${kid.id}/routines/${r.id}`} className={cn("flex min-h-16 items-center gap-3 px-4 py-3 transition hover:bg-surface-2", !r.active && "opacity-70")}>
                        <span className="text-2xl leading-none" aria-hidden>
                          {r.emoji}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate font-semibold text-fg">{r.name}</span>
                            {!r.active && <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-fg-muted">Off</span>}
                          </span>
                          <span className={cn("block truncate text-sm", r.stepCount === 0 ? "font-semibold text-beacon" : "text-fg-muted")}>
                            {r.stepCount === 0 ? "No steps yet — tap to add some" : r.when}
                          </span>
                          {r.sharedWith.length > 0 && (
                            <span className="flex items-center gap-1 text-sm text-fg-muted">
                              <Users className="h-3.5 w-3.5" /> Shared with {r.sharedWith.join(", ")}
                            </span>
                          )}
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
