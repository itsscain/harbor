"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  Heart,
  Pill,
  CalendarDays,
  ListChecks,
  UtensilsCrossed,
  Gift,
  ScrollText,
  Sparkles,
  History,
  Tablet,
  Settings,
  LogOut,
} from "lucide-react";
import { Wordmark } from "@/components/brand/Logo";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/app", label: "Home", icon: Home, exact: true },
  { href: "/app/children", label: "Children", icon: Users },
  { href: "/app/family", label: "Family", icon: Heart },
  { href: "/app/medication", label: "Medication", icon: Pill },
  { href: "/app/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/app/lists", label: "Lists", icon: ListChecks },
  { href: "/app/meals", label: "Meals", icon: UtensilsCrossed },
  { href: "/app/store", label: "Reward store", icon: Gift },
  { href: "/app/rules", label: "House rules", icon: ScrollText },
  { href: "/app/insights", label: "Insights", icon: Sparkles },
  { href: "/app/history", label: "History", icon: History },
  { href: "/app/devices", label: "Devices", icon: Tablet },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

/** The Helm — the parent's persistent command rail on desktop (§8.1). On mobile
 *  it's hidden and ParentNav (bottom bar) takes over. */
export function ParentRail({ householdName }: { householdName?: string | null }) {
  const pathname = usePathname();
  const name = householdName?.trim() || "Your family";
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-harbor-100 bg-white/85 backdrop-blur-lg lg:flex">
      <div className="px-5 pb-4 pt-5">
        <Wordmark />
        <p className="mt-2 truncate text-sm font-medium text-muted">{name}</p>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
        {ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition active:scale-[0.98]",
                active ? "bg-water/12 text-harbor" : "text-muted hover:bg-harbor-50 hover:text-ink",
              )}
            >
              <Icon className={cn("h-5 w-5 shrink-0", active ? "text-water" : "text-muted")} />
              {label}
            </Link>
          );
        })}
      </nav>
      <form action={signOut} className="border-t border-harbor-100 p-3">
        <button
          type="submit"
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted transition hover:bg-error-soft hover:text-error-ink"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </form>
    </aside>
  );
}
