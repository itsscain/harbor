"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, ListChecks, Gift, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/cn";

const items = [
  { href: "/app", label: "Home", icon: Home, exact: true },
  { href: "/app/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/app/lists", label: "Lists", icon: ListChecks },
  { href: "/app/store", label: "Store", icon: Gift },
  { href: "/app/more", label: "More", icon: LayoutGrid },
];

export function ParentNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-harbor-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-stretch justify-around">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-semibold transition",
                active ? "text-harbor" : "text-muted",
              )}
            >
              <Icon className={cn("h-6 w-6", active && "text-water")} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
