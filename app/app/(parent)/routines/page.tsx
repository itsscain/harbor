import Link from "next/link";
import { ListChecks, CalendarClock, ChevronRight, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, SectionHeader, StatChip } from "@/components/ui/primitives";
import { EntityAvatar } from "@/components/ui/EntityAvatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { TemplateApplyHub } from "@/components/app/TemplateApplyHub";
import { childColor } from "@/lib/kiosk/colors";

export const metadata = { title: "Routines" };
export const dynamic = "force-dynamic";

export default async function RoutinesPage() {
  const household = await getMyHousehold();
  if (!household) {
    return (
      <>
        <PageHeader eyebrow="Build" icon={<ListChecks className="h-6 w-6" />} title="Routines" />
        <Card>
          <p className="py-6 text-center text-sm text-fg-muted">Once your Harbor is set up, build your routines here.</p>
        </Card>
      </>
    );
  }

  const supabase = await createClient();
  const [{ data: kids }, { data: routines }, { data: templates }] = await Promise.all([
    supabase
      .from("children")
      .select("id, name, avatar, photo_url, color, settings, sort_order")
      .eq("household_id", household.id)
      .is("deleted_at", null)
      .order("sort_order"),
    supabase
      .from("routines")
      .select("child_id, scope, active")
      .eq("household_id", household.id)
      .is("deleted_at", null),
    supabase
      .from("routine_templates")
      .select("id, name, emoji, description, need_tags, household_id, content")
      .is("deleted_at", null)
      .order("household_id", { nullsFirst: true })
      .order("sort_order"),
  ]);

  const children = kids ?? [];
  const allRoutines = routines ?? [];
  const tpls = templates ?? [];
  const sharedCount = allRoutines.filter((r) => r.scope === "shared").length;
  const perChild = new Map<string, { total: number; active: number }>();
  for (const r of allRoutines) {
    if (!r.child_id) continue;
    const cur = perChild.get(r.child_id) ?? { total: 0, active: 0 };
    cur.total += 1;
    if (r.active) cur.active += 1;
    perChild.set(r.child_id, cur);
  }
  const totalChildRoutines = [...perChild.values()].reduce((n, x) => n + x.total, 0);

  return (
    <>
      <PageHeader
        eyebrow="Build"
        icon={<ListChecks className="h-6 w-6" />}
        title="Routines"
        subtitle="Build each child's day, set family windows once, and start from a proven template."
      />

      {children.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="h-7 w-7" />}
          title="No routines yet"
          body="Add your first child, then build their morning, after-school, and bedtime — or start from a template."
          action={
            <Link
              href="/app/children"
              className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(180deg,#16586a,#0c3b47)] px-4 py-2.5 text-sm font-semibold text-white shadow-button transition hover:brightness-110"
            >
              Add a child
            </Link>
          }
        />
      ) : (
        <>
          {/* glance band */}
          <Card className="mb-6 grid grid-cols-3 divide-x divide-line p-0">
            <StatChip value={totalChildRoutines} label="child routines" hint={`across ${children.length} ${children.length === 1 ? "child" : "kids"}`} />
            <StatChip value={sharedCount} label="shared routines" hint="one def, many kids" accent={sharedCount > 0} />
            <StatChip value={tpls.length} label="templates" hint="ready to use" />
          </Card>

          {/* each child → their builder */}
          <SectionHeader rule eyebrow="Per child">Each child&apos;s routines</SectionHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {children.map((c) => {
              const m = perChild.get(c.id) ?? { total: 0, active: 0 };
              const color = childColor(c);
              return (
                <Link key={c.id} href={`/app/children/${c.id}`} className="block">
                  <Card
                    interactive
                    className="flex items-center gap-3 [border-left:3px_solid_transparent] hover:[border-left-color:var(--accent)]"
                    style={{ ["--accent" as string]: color }}
                  >
                    <EntityAvatar photoUrl={c.photo_url} fallback={c.avatar ?? "🙂"} accent={color} />
                    <div className="min-w-0 flex-1">
                      <p className="text-title text-fg">{c.name}</p>
                      <p className="text-sm text-fg-muted">
                        {m.total === 0
                          ? "No routines yet — tap to build"
                          : `${m.total} ${m.total === 1 ? "routine" : "routines"} · ${m.active} active`}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-fg-muted" />
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* family schedule */}
          <SectionHeader rule eyebrow="Across the family" className="mt-8">Plan the whole day</SectionHeader>
          <Link href="/app/schedule" className="block">
            <Card interactive className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-fg">
                <CalendarClock className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-title text-fg">Family Schedule</p>
                <p className="text-sm text-fg-muted">
                  Every routine × every child on one timeline. Set a window once — shared routines, templates &amp; per-child tweaks.
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-fg-muted" />
            </Card>
          </Link>

          {/* template library */}
          <SectionHeader rule eyebrow="Start fast" className="mt-8" action={<span className="hidden items-center gap-1.5 text-xs text-fg-muted sm:inline-flex"><Sparkles className="h-3.5 w-3.5" /> pre-filled &amp; tweakable</span>}>
            Start from a template
          </SectionHeader>
          <TemplateApplyHub templates={tpls} children={children.map((c) => ({ id: c.id, name: c.name }))} />
        </>
      )}
    </>
  );
}
