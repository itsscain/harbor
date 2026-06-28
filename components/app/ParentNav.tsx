"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, CalendarDays, ListChecks, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/cn";

// "More" is a hub linking out to these — treat any of them as the More tab.
const MORE_ROUTES = ["/app/more", "/app/family", "/app/medication", "/app/store", "/app/meals", "/app/pantry", "/app/calm", "/app/rules", "/app/messages", "/app/history", "/app/insights", "/app/devices", "/app/billing", "/app/settings"];

const items = [
  { href: "/app", label: "Home", icon: Home, exact: true },
  { href: "/app/children", label: "Children", icon: Users },
  { href: "/app/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/app/lists", label: "Lists", icon: ListChecks },
  { href: "/app/more", label: "More", icon: LayoutGrid, group: MORE_ROUTES },
];

export function ParentNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-harbor-100 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg">
      <div className="mx-auto flex max-w-2xl items-stretch justify-around">
        {items.map(({ href, label, icon: Icon, exact, group }) => {
          const active = group
            ? group.some((r) => pathname.startsWith(r))
            : exact
              ? pathname === href
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="group flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-semibold transition active:scale-90"
            >
              <span
                className={cn(
                  "flex h-8 w-14 items-center justify-center rounded-2xl transition-all duration-200",
                  active ? "bg-water/12" : "group-hover:bg-harbor-50",
                )}
              >
                <Icon
                  className={cn(
                    "h-[22px] w-[22px] transition-colors",
                    active ? "text-water" : "text-muted",
                    active && "fill-water/15",
                  )}
                />
              </span>
              <span className={cn("transition-colors", active ? "text-harbor" : "text-muted")}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
