import { ScrollText, Heart, ClipboardCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { tzFromSettings, formatTimeInTz, dayKeyInTz, formatInTz } from "@/lib/tz";

export const metadata = { title: "Activity" };
export const dynamic = "force-dynamic";

type Kid = { name: string; avatar: string | null; photo_url: string | null; color: string | null };
function oneKid(c: unknown): Kid | null {
  if (!c) return null;
  return (Array.isArray(c) ? c[0] : c) as Kid;
}

type Entry = {
  id: string;
  created_at: string;
  kid: Kid | null;
  icon: string;
  text: string;
  delta: number | null;
  tone: "earn" | "spend" | "reset" | "feeling";
};

/** Day bucket label, computed in the FAMILY timezone (not the server's UTC) so "Today"
 *  and each time below reflect Eastern, wherever the page renders. */
function dayLabel(iso: string, tz: string): string {
  const key = dayKeyInTz(new Date(iso), tz);
  const today = dayKeyInTz(Date.now(), tz);
  const yest = dayKeyInTz(Date.now() - 86_400_000, tz);
  if (key === today) return "Today";
  if (key === yest) return "Yesterday";
  return formatInTz(new Date(iso), tz, { weekday: "long", month: "short", day: "numeric" });
}

export default async function HistoryPage() {
  const household = await getMyHousehold();
  if (!household) {
    return <EmptyState title="No household yet" body="Your family's activity will show here once your household is set up." />;
  }
  const supabase = await createClient();
  const tz = tzFromSettings(household.settings as Record<string, unknown> | null);

  const [{ data: log }, { data: checkins }, { data: chores }, { data: steps }, { data: storeItems }] = await Promise.all([
    supabase
      .from("reward_log")
      .select("id, delta, reason, step_id, chore_id, store_item_id, created_at, children(name, avatar, photo_url, color)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(250),
    supabase
      .from("check_ins")
      .select("id, feeling, note, created_at, children(name, avatar, photo_url, color)")
      .order("created_at", { ascending: false })
      .limit(120),
    supabase.from("chores").select("id, title, icon"),
    supabase.from("routine_steps").select("id, label, icon"),
    supabase.from("store_items").select("id, label, emoji"),
  ]);

  const choreMap = new Map((chores ?? []).map((c) => [c.id, c]));
  const stepMap = new Map((steps ?? []).map((s) => [s.id, s]));
  const storeMap = new Map((storeItems ?? []).map((s) => [s.id, s]));

  const FEELING_EMOJI: Record<string, string> = {
    happy: "😀", calm: "😌", sad: "😢", angry: "😠", worried: "😟", tired: "😴", silly: "🤪", excited: "🤩",
  };

  const entries: Entry[] = [];

  for (const r of log ?? []) {
    let icon = "⭐";
    let text = r.reason || "Points";
    if (r.reason === "reset") {
      icon = "↺";
      text = "Points reset to zero";
    } else if (r.chore_id && choreMap.has(r.chore_id)) {
      const c = choreMap.get(r.chore_id)!;
      icon = c.icon ?? "✅";
      text = c.title;
    } else if (r.step_id && stepMap.has(r.step_id)) {
      const s = stepMap.get(r.step_id)!;
      icon = s.icon ?? "✅";
      text = s.label;
    } else if (r.store_item_id && storeMap.has(r.store_item_id)) {
      const si = storeMap.get(r.store_item_id)!;
      icon = si.emoji ?? "🎁";
      text = `Redeemed ${si.label}`;
    } else if ((r.delta ?? 0) < 0) {
      icon = "🎁";
      text = r.reason || "Redeemed";
    }
    entries.push({
      id: `l_${r.id}`,
      created_at: r.created_at,
      kid: oneKid(r.children),
      icon,
      text,
      delta: r.delta,
      tone: r.reason === "reset" ? "reset" : (r.delta ?? 0) < 0 ? "spend" : "earn",
    });
  }

  for (const c of checkins ?? []) {
    entries.push({
      id: `c_${c.id}`,
      created_at: c.created_at,
      kid: oneKid(c.children),
      icon: FEELING_EMOJI[c.feeling] ?? "💬",
      text: `Felt ${c.feeling}${c.note ? ` — ${c.note}` : ""}`,
      delta: null,
      tone: "feeling",
    });
  }

  entries.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  // Group into day buckets, preserving order.
  const groups: { day: string; items: Entry[] }[] = [];
  for (const e of entries) {
    const day = dayLabel(e.created_at, tz);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(e);
    else groups.push({ day, items: [e] });
  }

  return (
    <>
      <PageHeader
        eyebrow="Track"
        icon={<ScrollText className="h-6 w-6" />}
        title="Activity"
        subtitle="Everything the family has done — chores, routines, rewards, and check-ins."
      />

      {entries.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck className="h-9 w-9" />}
          title="No activity yet"
          body="As the kids check off routines and chores on the wall, every step shows up here with the time it happened."
        />
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.day}>
              <p className="text-eyebrow mb-2 text-fg-muted">{g.day}</p>
              <div className="overflow-hidden rounded-2xl border border-line bg-surface">
                {g.items.map((e, i) => (
                  <div
                    key={e.id}
                    className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-line" : ""}`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-lg">
                      {e.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-fg">{e.text}</p>
                      <p className="flex items-center gap-1.5 text-xs text-fg-muted">
                        {e.kid && (
                          <>
                            <span
                              className="inline-block h-2 w-2 rounded-full"
                              style={{ backgroundColor: e.kid.color ?? "#18606f" }}
                            />
                            {e.kid.name} ·{" "}
                          </>
                        )}
                        {formatTimeInTz(new Date(e.created_at), tz)}
                      </p>
                    </div>
                    {e.delta != null && e.delta !== 0 && (
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-sm font-bold tabular-nums ${
                          e.tone === "earn"
                            ? "bg-good/10 text-good"
                            : e.tone === "reset"
                              ? "bg-surface-2 text-fg-muted"
                              : "bg-beacon/10 text-beacon"
                        }`}
                      >
                        {e.delta > 0 ? `+${e.delta}` : e.delta}
                      </span>
                    )}
                    {e.tone === "feeling" && <Heart className="h-4 w-4 shrink-0 text-rose-400" />}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
