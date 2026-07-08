"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, LogOut } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Wordmark } from "@/components/brand/Logo";
import { signOut } from "@/lib/actions/auth";
import { PLAN_GROUP, MORE_GROUPS, type NavItem } from "@/lib/app-nav";
import { cn } from "@/lib/cn";

// The Helm — the parent's persistent command rail on desktop. Mobile hides it and
// ParentNav (bottom bar) takes over. Grouped by the same taxonomy the mobile hubs use:
// Today · Kids, then Plan, Your family, Look back, Harbor helps, Account.
const TOP: NavItem[] = [
  { href: "/app", label: "Today", desc: "", icon: Home },
  { href: "/app/children", label: "Kids", desc: "", icon: Users },
];
const GROUPS = [PLAN_GROUP, ...MORE_GROUPS];

function isActive(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(href + "/");
}

export function ParentRail({ householdName, unread = 0 }: { householdName?: string | null; unread?: number }) {
  const pathname = usePathname();
  const name = householdName?.trim() || "Your family";

  const Row = ({ href, label, icon: Icon }: { href: string; label: string; icon: LucideIcon }) => {
    const active = isActive(pathname, href);
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition active:scale-[0.98]",
          active ? "bg-accent/12 text-fg" : "text-fg-muted hover:bg-surface-2 hover:text-fg",
        )}
      >
        <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-accent" : "text-fg-subtle")} />
        <span className="flex-1 truncate">{label}</span>
        {href === "/app/notifications" && unread > 0 && (
          <span className="min-w-[20px] rounded-full bg-beacon px-1.5 text-center text-[11px] font-extrabold leading-5 text-fg">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface/85 text-fg backdrop-blur-lg lg:flex">
      <div className="px-5 pb-4 pt-5">
        <Wordmark />
        <p className="mt-2 truncate text-sm font-medium text-fg-muted">{name}</p>
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-3">
        <div className="space-y-0.5">
          {TOP.map((i) => (
            <Row key={i.href} {...i} />
          ))}
        </div>
        {GROUPS.map((g) => (
          <div key={g.heading} className="space-y-0.5">
            <p className="text-eyebrow px-3 pb-1 pt-1 text-fg-subtle">{g.heading}</p>
            {g.items.map((i) => (
              <Row key={i.href} {...i} />
            ))}
          </div>
        ))}
      </nav>
      <form action={signOut} className="border-t border-line p-3">
        <button
          type="submit"
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-fg-muted transition hover:bg-error/10 hover:text-error"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </form>
    </aside>
  );
}
