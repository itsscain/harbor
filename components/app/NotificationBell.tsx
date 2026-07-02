import Link from "next/link";
import { Bell } from "lucide-react";
import { cn } from "@/lib/cn";

/** The notification bell + unread count — links to the notification center. */
export function NotificationBell({ count, className }: { count: number; className?: string }) {
  return (
    <Link
      href="/app/notifications"
      aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
      className={cn("relative flex h-10 w-10 items-center justify-center rounded-full text-harbor transition hover:bg-harbor-50", className)}
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute right-0.5 top-0.5 min-w-[18px] rounded-full bg-beacon px-1 text-center text-[11px] font-extrabold leading-[18px] text-harbor">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
