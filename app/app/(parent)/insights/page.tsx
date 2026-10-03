import Link from "next/link";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold, plusActive } from "@/lib/household";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/primitives";
import { AiInsightCard } from "@/components/app/AiInsightCard";
import { FEATURES } from "@/lib/features";
import { tzFromSettings, dayKeyInTz, formatInTz, minutesIntoDayInTz } from "@/lib/tz";

export const metadata = { title: "Patterns" };
export const dynamic = "force-dynamic";

const TOUGH = new Set(["sad", "angry", "worried", "tired", "frustrated"]);
const FEELING: Record<string, string> = { happy: "😊", calm: "😌", sad: "😢", angry: "😠", worried: "😟", tired: "😴", silly: "🤪", excited: "🤩" };
const DAY_MS = 86_400_000;

const daysAgoIso = (n: number) => new Date(Date.now() - n * DAY_MS).toISOString();

/** Two weeks of check-offs and feelings → gentle, family-time-zone patterns. */
function computePatterns(done: { created_at: string }[], checkins: { feeling: string; created_at: string }[], tz: string) {
  const now = Date.now();
  const days: { key: string; label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * DAY_MS);
    days.push({ key: dayKeyInTz(d, tz), label: formatInTz(d, tz, { weekday: "short" }), count: 0 });
  }
  for (const c of done) {
    const day = days.find((d) => d.key === dayKeyInTz(new Date(c.created_at), tz));
    if (day) day.count++;
  }
  const feelings = new Map<string, number>();
  const hours = new Array(24).fill(0);
  for (const c of checkins) {
    feelings.set(c.feeling, (feelings.get(c.feeling) ?? 0) + 1);
    if (TOUGH.has(c.feeling)) hours[Math.floor(minutesIntoDayInTz(new Date(c.created_at), tz) / 60)]++;
  }
  const peak = hours.indexOf(Math.max(...hours));
  return {
    days,
    total: days.reduce((n, d) => n + d.count, 0),
    best: days.reduce((a, b) => (b.count > a.count ? b : a), days[0]),
    feelings: [...feelings.entries()].sort((a, b) => b[1] - a[1]),
    toughLabel: Math.max(...hours) > 0 ? `${((peak + 11) % 12) + 1} ${peak < 12 ? "AM" : "PM"}` : null,
  };
}

// Patterns (Plus) — gentle trends over the last two weeks, in the family's time zone.
export default async function InsightsPage() {
  const household = await getMyHousehold();
  if (!household) return <PageHeader title="Patterns" subtitle="No household yet." />;
  const supabase = await createClient();
  const { data: sub } = await supabase.from("plus_subscriptions").select("status").eq("household_id", household.id).maybeSingle();

  if (!plusActive(sub?.status)) {
    return (
      <>
        <PageHeader title="Patterns" />
        <section className="rounded-2xl border border-beacon/40 bg-beacon/10 p-5">
          <Sparkles className="h-7 w-7 text-beacon" />
          <h2 className="mt-3 text-title text-fg">Patterns come with Harbor Plus</h2>
          <p className="mt-1.5 text-[15px] text-fg-muted">See how the week went and when days tend to get bumpy — about rhythm, never labels. Your wall keeps working free either way.</p>
          <Link href="/app/billing" className="mt-4 inline-block">
            <Button variant="beacon">See Harbor Plus</Button>
          </Link>
        </section>
      </>
    );
  }

  const tz = tzFromSettings(household.settings as Record<string, unknown> | null);
  const { data: children } = await supabase.from("children").select("id").eq("household_id", household.id).is("deleted_at", null);
  const ids = (children ?? []).map((c) => c.id);
  const since = daysAgoIso(14);
  const [{ data: done }, { data: checkins }] = ids.length
    ? await Promise.all([
        supabase.from("reward_log").select("created_at").in("child_id", ids).in("reason", ["step", "chore"]).gt("delta", -1).is("deleted_at", null).gte("created_at", since),
        supabase.from("check_ins").select("feeling, created_at").in("child_id", ids).gte("created_at", since),
      ])
    : [{ data: [] }, { data: [] }];
  const p = computePatterns(done ?? [], checkins ?? [], tz);
  const maxDay = Math.max(1, ...p.days.map((d) => d.count));
  const maxFeel = Math.max(1, ...p.feelings.map(([, n]) => n));

  return (
    <>
      <PageHeader title="Patterns" subtitle="Gentle trends from the last two weeks." />
      {FEATURES.ai && (
        <div className="mb-4">
          <AiInsightCard />
        </div>
      )}

      <section className="mb-5 rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-title text-fg">Checked off this week</h2>
          <span className="text-sm text-fg-muted">{p.total > 0 ? `${p.total} · best ${p.best.label}` : "None yet"}</span>
        </div>
        <div className="mt-4 flex items-end justify-between gap-2">
          {p.days.map((d) => (
            <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-28 w-full items-end" title={`${d.count} on ${d.label}`}>
                <div className="w-full rounded-t-lg bg-beacon" style={{ height: `${Math.max(d.count > 0 ? 6 : 0, (d.count / maxDay) * 100)}%` }} />
              </div>
              <span className="text-xs font-bold tabular-nums text-fg">{d.count}</span>
              <span className="text-xs text-fg-muted">{d.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-5 rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-title text-fg">How they&apos;ve been feeling</h2>
        {p.feelings.length === 0 ? (
          <p className="mt-1.5 text-sm text-fg-muted">No feelings check-ins yet — they show up as kids use the calm tools on the wall.</p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {p.feelings.map(([feeling, n]) => (
              <li key={feeling} className="flex items-center gap-3">
                <span className="flex w-24 shrink-0 items-center gap-1.5 text-sm font-medium capitalize text-fg">
                  <span aria-hidden>{FEELING[feeling] ?? "💬"}</span> {feeling}
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${(n / maxFeel) * 100}%` }} />
                </div>
                <span className="w-6 text-right text-sm tabular-nums text-fg-muted">{n}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-beacon/30 bg-beacon/10 p-5">
        <h2 className="text-title text-fg">A gentle pattern</h2>
        <p className="mt-1.5 text-[15px] text-fg-muted">
          {p.toughLabel
            ? `Harder feelings tend to show up around ${p.toughLabel}. That's a good time for a calmer handoff — a heads-up, a timer, or a calm tool before the next thing.`
            : "Not enough check-ins yet to spot a rhythm. As the calm tools get used, gentle patterns will show up here."}
        </p>
      </section>
    </>
  );
}
