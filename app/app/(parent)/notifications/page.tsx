import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { tzFromSettings, dayKeyInTz } from "@/lib/tz";
import { PageHeader } from "@/components/ui/PageHeader";
import { NotificationRow } from "@/components/app/NotificationRow";
import { MarkAllRead } from "@/components/app/MarkAllRead";

export const metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

type Row = { id: string; title: string; body: string; route: string | null; tier: number; status: string; created_at: string };

/** Rows → Today / Earlier groups with "5 min ago"-style times, against "now". */
function group(rows: Row[], tz: string) {
  const now = Date.now();
  const today = dayKeyInTz(now, tz);
  const when = (iso: string) => {
    const min = Math.round((now - new Date(iso).getTime()) / 60000);
    if (min < 1) return "just now";
    if (min < 60) return `${min} min ago`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr} hr ago`;
    const day = Math.round(hr / 24);
    return day < 7 ? `${day} days ago` : new Date(iso).toLocaleDateString();
  };
  const items = rows.map((n) => ({ ...n, when: when(n.created_at), isToday: dayKeyInTz(new Date(n.created_at), tz) === today }));
  return { today: items.filter((n) => n.isToday), earlier: items.filter((n) => !n.isToday) };
}

// Notifications — everything Harbor flagged for you, even if a push didn't arrive.
export default async function NotificationsPage() {
  const household = await getMyHousehold();
  const tz = tzFromSettings((household?.settings ?? {}) as Record<string, unknown>);
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("id, title, body, route, tier, status, created_at").order("created_at", { ascending: false }).limit(100);
  const rows = data ?? [];
  const { today, earlier } = group(rows, tz);

  const list = (items: typeof today) => (
    <div className="space-y-1.5">
      {items.map((n) => (
        <NotificationRow key={n.id} id={n.id} title={n.title} body={n.body} route={n.route ?? "/app"} tier={n.tier} when={n.when} unread={n.status === "unread"} />
      ))}
    </div>
  );

  return (
    <>
      <PageHeader title="Notifications" subtitle="What Harbor flagged for you." actions={rows.some((n) => n.status === "unread") ? <MarkAllRead /> : undefined} />
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-strong p-6 text-center">
          <p className="text-3xl" aria-hidden>
            🔔
          </p>
          <p className="mt-1 font-semibold text-fg">You&apos;re all caught up</p>
          <p className="mx-auto mt-0.5 max-w-sm text-sm text-fg-muted">Harbor lets you know here when something needs you — a hard moment, a request, or a win to celebrate.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {today.length > 0 && (
            <section>
              <h2 className="mb-2 px-1 text-sm font-semibold text-fg-muted">Today</h2>
              {list(today)}
            </section>
          )}
          {earlier.length > 0 && (
            <section>
              <h2 className="mb-2 px-1 text-sm font-semibold text-fg-muted">Earlier</h2>
              {list(earlier)}
            </section>
          )}
        </div>
      )}
      <Link href="/app/settings?open=notifications" className="mt-6 flex min-h-11 items-center justify-center text-sm font-semibold text-accent">
        Choose what reaches your phone
      </Link>
    </>
  );
}
