import Link from "next/link";
import { Sparkles, TrendingUp, HeartHandshake } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold, plusActive } from "@/lib/household";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Button, Badge, Stat } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = { title: "Insights" };
export const dynamic = "force-dynamic";

const TOUGH = new Set(["sad", "angry", "worried", "tired", "frustrated"]);
const DAY_MS = 86_400_000;

export default async function InsightsPage() {
  const household = await getMyHousehold();
  if (!household) {
    return <EmptyState title="No household yet" body="Gentle insights will appear here once your household is set up." />;
  }

  const supabase = await createClient();
  const { data: sub } = await supabase
    .from("plus_subscriptions")
    .select("status")
    .eq("household_id", household.id)
    .maybeSingle();

  if (!plusActive(sub?.status)) {
    return (
      <>
        <PageHeader title="Gentle insights" />
        <Card className="border-beacon/40 bg-beacon-soft/40">
          <Sparkles className="h-8 w-8 text-beacon" />
          <h2 className="mt-3 text-display-sm text-harbor">
            Insights come with Harbor Plus
          </h2>
          <p className="mt-2 text-sm text-muted">
            See completion trends and when the day tends to get bumpy — framed as
            rhythm and structure, never labels or diagnosis. Your wall keeps
            working free either way.
          </p>
          <Link href="/app/billing" className="mt-4 inline-block">
            <Button variant="beacon">See Harbor Plus</Button>
          </Link>
        </Card>
      </>
    );
  }

  const { data: children } = await supabase
    .from("children")
    .select("id, name")
    .eq("household_id", household.id)
    .is("deleted_at", null);
  const childIds = (children ?? []).map((c) => c.id);

  const since = new Date(Date.now() - 14 * DAY_MS).toISOString();
  const [{ data: completions }, { data: checkins }] = childIds.length
    ? await Promise.all([
        supabase
          .from("reward_log")
          .select("created_at, delta")
          .in("child_id", childIds)
          .gt("delta", 0)
          .gte("created_at", since),
        supabase
          .from("check_ins")
          .select("feeling, created_at")
          .in("child_id", childIds)
          .gte("created_at", since),
      ])
    : [{ data: [] }, { data: [] }];

  // Completions per day (last 7).
  const days: { label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY_MS);
    const key = d.toISOString().slice(0, 10);
    const count = (completions ?? []).filter((c) => c.created_at.slice(0, 10) === key).length;
    days.push({ label: d.toLocaleDateString("en-US", { weekday: "short" }), count });
  }
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  // Feelings distribution.
  const feelingCounts = new Map<string, number>();
  for (const c of checkins ?? [])
    feelingCounts.set(c.feeling, (feelingCounts.get(c.feeling) ?? 0) + 1);
  const feelings = [...feelingCounts.entries()].sort((a, b) => b[1] - a[1]);
  const maxFeel = Math.max(1, ...feelings.map(([, n]) => n));

  // Tough-moment peak hour.
  const hourTough = new Array(24).fill(0);
  for (const c of checkins ?? []) {
    if (TOUGH.has(c.feeling)) hourTough[new Date(c.created_at).getHours()]++;
  }
  const peakHour = hourTough.indexOf(Math.max(...hourTough));
  const hasTough = Math.max(...hourTough) > 0;
  const peakLabel = `${((peakHour + 11) % 12) + 1}${peakHour < 12 ? "am" : "pm"}`;

  const totalSteps = days.reduce((s, d) => s + d.count, 0);
  const bestDay = days.reduce((a, b) => (b.count > a.count ? b : a), days[0]);
  const totalCheckins = (checkins ?? []).length;

  return (
    <>
      <PageHeader eyebrow="Connect" icon={<TrendingUp className="h-6 w-6" />} title="Gentle insights" actions={<Badge tone="green">Plus</Badge>} />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <Stat label="Steps this week" value={totalSteps} accent />
        <Stat label="Check-ins" value={totalCheckins} />
        <Stat label="Best day" value={totalSteps > 0 ? bestDay.label : "—"} />
      </div>

      <Card className="mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-water" />
          <h2 className="text-title text-harbor">Steps finished this week</h2>
        </div>
        <div className="mt-4 flex items-end justify-between gap-2">
          {days.map((d, i) => (
            <div key={i} className="group flex flex-1 flex-col items-center gap-1">
              <div className="flex h-28 w-full items-end" title={`${d.count} on ${d.label}`}>
                <div
                  className="w-full rounded-t-lg bg-[linear-gradient(180deg,#f8bf57,#f2a92f)] transition-all duration-500 group-hover:brightness-105"
                  style={{ height: `${Math.max(d.count > 0 ? 6 : 0, (d.count / maxDay) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-bold text-ink">{d.count}</span>
              <span className="text-xs text-muted">{d.label}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-4">
        <h2 className="text-title text-harbor">How they&apos;ve been feeling</h2>
        {feelings.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            No feelings check-ins yet. They&apos;ll show here as your kids use the
            calm corner.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {feelings.map(([feeling, n]) => (
              <li key={feeling} className="flex items-center gap-3">
                <span className="w-20 text-sm font-medium capitalize text-ink">
                  {feeling}
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-harbor-50">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#18606f,#2f8f86)] transition-all duration-500"
                    style={{ width: `${(n / maxFeel) * 100}%` }}
                  />
                </div>
                <span className="w-6 text-right text-sm text-muted">{n}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="border-beacon/30 bg-beacon-soft/30">
        <div className="flex items-center gap-2">
          <HeartHandshake className="h-5 w-5 text-beacon" />
          <h2 className="text-title text-harbor">A gentle pattern</h2>
        </div>
        <p className="mt-2 text-sm text-muted">
          {hasTough
            ? `Tougher feelings tend to cluster around ${peakLabel}. That's a great window for a calmer transition — maybe a timer and the calm corner before the next activity. This is about rhythm, not labels.`
            : "Not enough data yet to spot a rhythm. As the calm corner gets used, gentle patterns will appear here — always framed as structure, never diagnosis."}
        </p>
      </Card>
    </>
  );
}
