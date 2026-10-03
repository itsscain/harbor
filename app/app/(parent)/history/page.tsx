import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { PageHeader } from "@/components/ui/PageHeader";
import { MiniAvatar } from "@/components/ui/Chips";
import { tzFromSettings, formatTimeInTz, dayKeyInTz, formatInTz } from "@/lib/tz";
import { childColor } from "@/lib/kiosk/colors";
import { cn } from "@/lib/cn";

export const metadata = { title: "Activity" };
export const dynamic = "force-dynamic";

type Kid = { id: string; name: string; avatar: string | null; photo_url: string | null; color: string | null };
type Entry = { id: string; at: string; kidId: string | null; icon: string; text: string; delta: number | null; tone: "earn" | "spend" | "reset" | "feeling" };

const FEELING: Record<string, string> = { happy: "😊", calm: "😌", sad: "😢", angry: "😠", worried: "😟", tired: "😴", silly: "🤪", excited: "🤩" };

/** A ledger reason in plain words ("adjust:Great job" → "Great job"). */
function reasonText(reason: string | null, delta: number): { icon: string; text: string } {
  const r = reason ?? "";
  if (r === "reset") return { icon: "↺", text: "Stars reset to zero" };
  if (r.startsWith("adjust:")) return { icon: delta >= 0 ? "⭐" : "➖", text: r.slice(7) || (delta >= 0 ? "Stars from a grown-up" : "Stars taken away") };
  if (r === "adjust") return { icon: delta >= 0 ? "⭐" : "➖", text: delta >= 0 ? "Stars from a grown-up" : "Stars taken away" };
  if (r.startsWith("bonus")) return { icon: "💌", text: r.includes(":") ? `Bonus — ${r.split(":")[1]}` : "Bonus from a note" };
  if (r === "learn") return { icon: "📚", text: "Finished a lesson in Learn" };
  if (delta < 0) return { icon: "🎁", text: "Spent stars" };
  return { icon: "⭐", text: "Earned stars" };
}

function dayLabel(iso: string, tz: string): string {
  const key = dayKeyInTz(new Date(iso), tz);
  if (key === dayKeyInTz(Date.now(), tz)) return "Today";
  if (key === dayKeyInTz(Date.now() - 86_400_000, tz)) return "Yesterday";
  return formatInTz(new Date(iso), tz, { weekday: "long", month: "short", day: "numeric" });
}

// Activity — everything the family did, day by day, in plain words. Filter by kid.
export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ kid?: string; more?: string }> }) {
  const household = await getMyHousehold();
  if (!household) return <PageHeader title="Activity" subtitle="No household yet." />;
  const { kid, more } = await searchParams;
  const supabase = await createClient();
  const tz = tzFromSettings(household.settings as Record<string, unknown> | null);
  const { data: kidsData } = await supabase.from("children").select("id, name, avatar, photo_url, color").eq("household_id", household.id).is("deleted_at", null).order("sort_order");
  const kids: Kid[] = kidsData ?? [];
  const kidIds = kids.map((k) => k.id);
  const only = kid && kidIds.includes(kid) ? [kid] : kidIds;
  const limit = more ? 1000 : 200;

  const [{ data: log }, { data: checkins }, { data: chores }, { data: steps }, { data: storeItems }] = only.length
    ? await Promise.all([
        supabase.from("reward_log").select("id, child_id, delta, reason, step_id, chore_id, store_item_id, created_at").in("child_id", only).is("deleted_at", null).order("created_at", { ascending: false }).limit(limit),
        supabase.from("check_ins").select("id, child_id, feeling, note, created_at").in("child_id", only).order("created_at", { ascending: false }).limit(Math.round(limit / 2)),
        supabase.from("chores").select("id, title, icon").eq("household_id", household.id),
        supabase.from("routine_steps").select("id, label, icon").limit(2000),
        supabase.from("store_items").select("id, label, emoji").eq("household_id", household.id),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const choreMap = new Map((chores ?? []).map((c) => [c.id, c]));
  const stepMap = new Map((steps ?? []).map((s) => [s.id, s]));
  const storeMap = new Map((storeItems ?? []).map((s) => [s.id, s]));

  const entries: Entry[] = [];
  for (const r of log ?? []) {
    let { icon, text } = reasonText(r.reason, r.delta ?? 0);
    if (r.chore_id && choreMap.has(r.chore_id)) {
      const c = choreMap.get(r.chore_id)!;
      icon = c.icon ?? "✅";
      text = c.title;
    } else if (r.step_id && stepMap.has(r.step_id)) {
      const s = stepMap.get(r.step_id)!;
      icon = s.icon ?? "✅";
      text = s.label;
    } else if (r.store_item_id && storeMap.has(r.store_item_id)) {
      const s = storeMap.get(r.store_item_id)!;
      icon = s.emoji ?? "🎁";
      text = `Spent on ${s.label}`;
    }
    entries.push({ id: `l_${r.id}`, at: r.created_at, kidId: r.child_id, icon, text, delta: r.delta, tone: r.reason === "reset" ? "reset" : (r.delta ?? 0) < 0 ? "spend" : "earn" });
  }
  for (const c of checkins ?? []) {
    entries.push({ id: `c_${c.id}`, at: c.created_at, kidId: c.child_id, icon: FEELING[c.feeling] ?? "💬", text: `Felt ${c.feeling}${c.note ? ` — ${c.note}` : ""}`, delta: null, tone: "feeling" });
  }
  entries.sort((a, b) => (a.at < b.at ? 1 : -1));

  const groups: { day: string; items: Entry[] }[] = [];
  for (const e of entries) {
    const day = dayLabel(e.at, tz);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(e);
    else groups.push({ day, items: [e] });
  }
  const kidById = new Map(kids.map((k) => [k.id, k]));
  const href = (k?: string) => `/app/history${k ? `?kid=${k}` : ""}`;

  return (
    <>
      <PageHeader title="Activity" subtitle="Everything that happened, day by day." />

      {kids.length > 1 && (
        <nav aria-label="Whose activity" className="mb-5 flex flex-wrap gap-2">
          <Link
            href={href()}
            replace
            scroll={false}
            className={cn("inline-flex min-h-11 items-center rounded-full border px-4 text-[15px] font-semibold transition", !kid ? "border-accent bg-accent/15 text-fg" : "border-line-strong text-fg-muted hover:text-fg")}
          >
            Everyone
          </Link>
          {kids.map((k) => (
            <Link
              key={k.id}
              href={href(k.id)}
              replace
              scroll={false}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-full border pl-1.5 pr-4 text-[15px] font-semibold transition",
                kid === k.id ? "border-accent bg-accent/15 text-fg" : "border-line-strong text-fg-muted hover:text-fg",
              )}
            >
              <MiniAvatar kid={k} size={28} /> {k.name}
            </Link>
          ))}
        </nav>
      )}

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-strong p-6 text-center">
          <p className="text-3xl" aria-hidden>
            📋
          </p>
          <p className="mt-1 font-semibold text-fg">Nothing yet</p>
          <p className="mt-0.5 text-sm text-fg-muted">As kids check things off on the wall, it all shows up here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.day}>
              <h2 className="mb-2 px-1 text-sm font-semibold text-fg-muted">{g.day}</h2>
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                {g.items.map((e) => {
                  const k = e.kidId ? kidById.get(e.kidId) : null;
                  return (
                    <li key={e.id} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-lg" aria-hidden>
                        {e.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-fg">{e.text}</span>
                        <span className="flex items-center gap-1.5 text-sm text-fg-muted">
                          {k && kids.length > 1 && (
                            <>
                              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: childColor(k) }} aria-hidden />
                              {k.name} ·
                            </>
                          )}
                          {formatTimeInTz(new Date(e.at), tz)}
                        </span>
                      </span>
                      {e.delta != null && e.delta !== 0 && (
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2.5 py-1 text-sm font-bold tabular-nums",
                            e.tone === "earn" ? "bg-good/10 text-good" : e.tone === "reset" ? "bg-surface-2 text-fg-muted" : "bg-beacon/10 text-beacon",
                          )}
                        >
                          {e.delta > 0 ? `+${e.delta}` : e.delta} ★
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {!more && (log ?? []).length >= limit && (
            <Link href={`/app/history?${kid ? `kid=${kid}&` : ""}more=1`} replace scroll={false} className="flex min-h-12 items-center justify-center rounded-xl border border-line-strong text-[15px] font-semibold text-fg transition hover:bg-surface-2">
              Show older
            </Link>
          )}
        </div>
      )}
    </>
  );
}
