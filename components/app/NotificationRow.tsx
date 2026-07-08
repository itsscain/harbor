"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/cn";
import { markNotificationRead } from "@/app/app/(parent)/notification-actions";

const TIER_ACCENT: Record<number, string> = {
  1: "bg-beacon",
  2: "bg-accent",
  3: "bg-accent/12",
  4: "bg-accent/20",
  5: "bg-surface-2",
};

/** One notification in the center: tap marks it read and deep-links to where it belongs. */
export function NotificationRow({
  id,
  title,
  body,
  route,
  tier,
  when,
  unread,
}: {
  id: string;
  title: string;
  body: string;
  route: string;
  tier: number;
  when: string;
  unread: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function open() {
    start(async () => {
      if (unread) await markNotificationRead(id);
      router.push(route || "/app");
    });
  }

  return (
    <button
      type="button"
      onClick={open}
      disabled={pending}
      className={cn(
        "flex w-full items-start gap-3 rounded-2xl px-4 py-3.5 text-left transition active:scale-[0.99]",
        unread ? "bg-surface ring-1 ring-line" : "bg-transparent hover:bg-surface/60",
      )}
    >
      <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", unread ? TIER_ACCENT[tier] ?? "bg-accent" : "bg-transparent")} />
      <span className="min-w-0 flex-1">
        <span className={cn("block font-display font-bold leading-snug", unread ? "text-fg" : "text-fg-muted")}>{title}</span>
        <span className="mt-0.5 block text-sm leading-snug text-fg-muted">{body}</span>
        <span className="mt-1 block text-xs text-fg-subtle">{when}</span>
      </span>
    </button>
  );
}
