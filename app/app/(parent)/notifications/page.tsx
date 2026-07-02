import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { NotificationRow } from "@/components/app/NotificationRow";
import { markAllNotificationsRead } from "../notification-actions";

export const metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default async function NotificationsPage() {
  const supabase = await createClient();
  // RLS scopes these to the signed-in parent.
  const { data: rows } = await supabase
    .from("notifications")
    .select("id, title, body, route, tier, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  const list = rows ?? [];
  const hasUnread = list.some((n) => n.status === "unread");

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Everything Harbor has flagged for you — your reliable record, push or not." />

      {hasUnread && (
        <form action={markAllNotificationsRead} className="mb-3 flex justify-end">
          <SubmitButton className="rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold text-harbor ring-1 ring-harbor-100 hover:bg-harbor-50">
            Mark all read
          </SubmitButton>
        </form>
      )}

      {list.length === 0 ? (
        <Card className="flex flex-col items-center py-12 text-center">
          <Bell className="h-8 w-8 text-harbor-200" />
          <p className="mt-3 font-display text-lg font-bold text-harbor">You&apos;re all caught up</p>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Harbor will let you know here when something needs you — a child having a hard moment, a chore to approve, or a milestone to celebrate.
          </p>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {list.map((n) => (
            <NotificationRow
              key={n.id}
              id={n.id}
              title={n.title}
              body={n.body}
              route={n.route ?? "/app"}
              tier={n.tier}
              when={relativeTime(n.created_at)}
              unread={n.status === "unread"}
            />
          ))}
        </div>
      )}
    </div>
  );
}
