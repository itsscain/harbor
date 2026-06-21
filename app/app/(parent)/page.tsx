import Link from "next/link";
import { ChevronRight, Tablet, Sparkles, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold, plusActive } from "@/lib/household";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Badge, SectionHeader } from "@/components/ui/primitives";
import { formatPairingCode } from "@/lib/pairing-format";
import { titleCase } from "@/lib/format";
import { ChildCard } from "@/components/app/ChildCard";
import { FirstRunWelcome } from "@/components/app/FirstRunWelcome";
import { SetupChecklist } from "@/components/app/SetupChecklist";
import { CHILD_PALETTE } from "@/lib/kiosk/colors";
import { dismissOnboarding } from "./hub-actions";

export const metadata = { title: "Home" };
export const dynamic = "force-dynamic";

export default async function ParentHome() {
  const household = await getMyHousehold();
  const supabase = await createClient();

  if (!household) {
    return (
      <Card>
        <h1 className="text-display-sm text-harbor">No household yet</h1>
        <p className="mt-2 text-sm text-muted">
          Your Harbor household will appear here once it&apos;s set up. If you just got an invite,
          check your email to finish creating your account.
        </p>
      </Card>
    );
  }

  const [{ data: children }, { data: pairings }, { data: sub }] = await Promise.all([
    supabase.from("children").select("*").eq("household_id", household.id).is("deleted_at", null).order("sort_order"),
    supabase.from("device_pairings").select("code, status").eq("household_id", household.id).order("created_at"),
    supabase.from("plus_subscriptions").select("status").eq("household_id", household.id).maybeSingle(),
  ]);

  const list = children ?? [];
  const isPlus = plusActive(sub?.status);
  const nextColor = CHILD_PALETTE[list.length % CHILD_PALETTE.length].value;

  // Brand-new household → focused welcome + the wall pairing card.
  if (list.length === 0) {
    return (
      <>
        <FirstRunWelcome defaultColor={nextColor} />
        <div className="mt-6">
          <DevicesCard pairings={pairings ?? []} />
        </div>
      </>
    );
  }

  // Setup checklist progress.
  const childIds = list.map((c) => c.id);
  let routineCount = 0;
  if (childIds.length) {
    const { count } = await supabase
      .from("routines")
      .select("id", { count: "exact", head: true })
      .in("child_id", childIds)
      .is("deleted_at", null);
    routineCount = count ?? 0;
  }
  const { count: storeCount } = await supabase
    .from("store_items")
    .select("id", { count: "exact", head: true })
    .eq("household_id", household.id)
    .is("deleted_at", null);

  const settings = (household.settings ?? {}) as Record<string, unknown>;
  const steps = [
    { label: "Add a child", hint: "Name, avatar, and color", done: childIds.length > 0, href: "/app/children#add" },
    { label: "Build a routine", hint: "Use a one-tap template", done: routineCount > 0, href: childIds[0] ? `/app/children/${childIds[0]}` : "/app/children#add" },
    { label: "Add a reward", hint: "Something to work toward", done: (storeCount ?? 0) > 0, href: "/app/store" },
    { label: "Pair your wall", hint: "Open the setup link on the tablet", done: (pairings ?? []).some((p) => p.status === "paired"), href: "#devices" },
  ];
  const showChecklist = settings.onboardingDismissed !== true && !steps.every((s) => s.done);

  return (
    <>
      <PageHeader
        eyebrow="Family"
        title={household.name}
        subtitle="Your command center — manage routines and push them to the wall."
        actions={isPlus ? <Badge tone="green">Plus</Badge> : undefined}
      />

      {showChecklist && <SetupChecklist steps={steps} dismiss={dismissOnboarding} />}

      {!isPlus && (
        <Link href="/app/billing" className="block">
          <Card interactive className="mb-6 flex items-center gap-3 border-beacon/40 bg-beacon-soft/40">
            <Sparkles className="h-6 w-6 shrink-0 text-beacon" />
            <div className="flex-1">
              <p className="font-semibold text-harbor">Your wall works free, forever.</p>
              <p className="text-sm text-muted">Harbor Plus adds cloud backup, edit-from-here sync, and insights.</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted" />
          </Card>
        </Link>
      )}

      <SectionHeader
        eyebrow="Your crew"
        action={
          <Link href="/app/children#add" className="inline-flex items-center gap-1 text-sm font-semibold text-water hover:text-harbor">
            <Plus className="h-4 w-4" /> Add child
          </Link>
        }
      >
        Children
      </SectionHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((c, i) => (
          <ChildCard key={c.id} child={c} meta="Tap to manage routines" index={i} />
        ))}
      </div>

      <div className="mt-6">
        <DevicesCard pairings={pairings ?? []} />
      </div>
    </>
  );
}

function DevicesCard({ pairings }: { pairings: { code: string; status: string }[] }) {
  return (
    <Card id="devices" className="scroll-mt-20">
      <div className="flex items-center gap-2">
        <Tablet className="h-5 w-5 text-water" />
        <h3 className="text-title text-harbor">Wall devices</h3>
      </div>
      <ul className="mt-3 space-y-2">
        {pairings.map((p) => (
          <li key={p.code} className="flex items-center justify-between rounded-xl bg-surface-sunken px-3 py-2.5">
            <span className="font-mono font-bold tracking-wider text-harbor">{formatPairingCode(p.code)}</span>
            <Badge tone={p.status === "paired" ? "green" : "amber"}>{titleCase(p.status)}</Badge>
          </li>
        ))}
        {pairings.length === 0 && (
          <li className="text-sm text-muted">No devices yet. Pair one from Settings or your setup link.</li>
        )}
      </ul>
    </Card>
  );
}
