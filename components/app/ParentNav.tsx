"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_TABS } from "@/lib/app-nav";
import { cn } from "@/lib/cn";

/** Mobile bottom bar — the four primary destinations (Today · Kids · Plan · More).
 *  Everything else is reached through the Plan and More hub pages. */
export function ParentNav({ unread = 0 }: { unread?: number }) {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg">
      <div className="mx-auto flex max-w-2xl items-stretch justify-around">
        {PRIMARY_TABS.map(({ href, label, icon: Icon, exact, match, badge }) => {
          const active = exact
            ? pathname === href
            : (match ?? [href]).some((r) => pathname === r || pathname.startsWith(r + "/") || pathname === href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="group flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-semibold transition active:scale-90"
            >
              <span
                className={cn(
                  "relative flex h-9 w-16 items-center justify-center rounded-2xl transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                  active ? "scale-105 bg-accent/15" : "group-hover:bg-surface-2",
                )}
              >
                {/* Keyed on active so the spring pop replays when a tab becomes selected. */}
                <Icon
                  key={active ? "on" : "off"}
                  className={cn(
                    "h-[22px] w-[22px] transition-colors",
                    active ? "nav-pop text-accent" : "text-fg-muted",
                    active && "fill-accent/15",
                  )}
                />
                {badge && unread > 0 && (
                  <span className="absolute right-2 top-1 h-2 w-2 rounded-full bg-beacon ring-2 ring-surface" aria-hidden />
                )}
              </span>
              <span className={cn("transition-colors", active ? "text-fg" : "text-fg-muted")}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
