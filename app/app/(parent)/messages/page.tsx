import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { tzFromSettings, dayKeyInTz, formatInTz } from "@/lib/tz";
import { PageHeader } from "@/components/ui/PageHeader";
import { NotesView, type Note } from "@/components/app/messages/NotesView";

export const metadata = { title: "Message board" };
export const dynamic = "force-dynamic";

function ago(iso: string, now: number): string {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return hrs < 24 ? `${hrs} hr ago` : `${Math.round(hrs / 24)} days ago`;
}

type Row = { id: string; body: string; emoji: string | null; child_id: string | null; author_label: string | null; pinned: boolean; bonus_points: number; expires_at: string | null; created_at: string };

/** Rows → plain-language notes ("For Maya · Kept at top · 2 hr ago"), against "now". */
function toNotes(rows: Row[], kids: { id: string; name: string }[], tz: string): Note[] {
  const now = Date.now();
  return rows
    .filter((m) => !m.expires_at || new Date(m.expires_at).getTime() > now)
    .map((m) => ({
      id: m.id,
      body: m.body,
      emoji: m.emoji,
      childId: m.child_id,
      author: m.author_label,
      pinned: m.pinned,
      bonus: m.bonus_points,
      until: m.expires_at ? dayKeyInTz(new Date(m.expires_at), tz) : null,
      meta: [
        m.child_id ? `For ${kids.find((k) => k.id === m.child_id)?.name ?? "one kid"}` : "Everyone",
        m.pinned ? "Kept at top" : null,
        m.expires_at ? `until ${formatInTz(new Date(m.expires_at), tz, { weekday: "short", month: "short", day: "numeric" })}` : null,
        m.author_label ? `from ${m.author_label}` : null,
        ago(m.created_at, now),
      ]
        .filter(Boolean)
        .join(" · "),
    }));
}

// Message board — notes that show on the wall's home screen.
export default async function MessagesPage() {
  const household = await getMyHousehold();
  if (!household) return <PageHeader title="Message board" subtitle="No household yet." />;
  const supabase = await createClient();
  const tz = tzFromSettings((household.settings ?? {}) as Record<string, unknown>);
  const [{ data: rows }, { data: kids }] = await Promise.all([
    supabase
      .from("wall_messages")
      .select("id, body, emoji, child_id, author_label, pinned, bonus_points, expires_at, created_at")
      .eq("household_id", household.id)
      .is("deleted_at", null)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("children").select("id, name, avatar, photo_url, color").eq("household_id", household.id).is("deleted_at", null).order("sort_order"),
  ]);

  return (
    <>
      <PageHeader title="Message board" subtitle="Notes that show on the wall's home screen." />
      <NotesView notes={toNotes(rows ?? [], kids ?? [], tz)} kids={kids ?? []} tz={tz} />
    </>
  );
}
