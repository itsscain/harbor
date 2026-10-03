"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { PRIMARY_TABS } from "@/lib/app-nav";
import { useQuickAdd } from "@/components/app/quick/QuickAdd";
import { cn } from "@/lib/cn";

type NavTab = (typeof PRIMARY_TABS)[number] & { active: boolean };

function Tab({ t, unread }: { t: NavTab; unread: number }) {
  const Icon = t.icon;
  return (
    <Link
      href={t.href}
      aria-current={t.active ? "page" : undefined}
      className="group flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-semibold transition active:scale-90"
    >
      <span
        className={cn(
          "relative flex h-9 w-14 items-center justify-center rounded-2xl transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          t.active ? "scale-105 bg-accent/15" : "group-hover:bg-surface-2",
        )}
      >
        <Icon key={t.active ? "on" : "off"} className={cn("h-[22px] w-[22px] transition-colors", t.active ? "nav-pop text-accent" : "text-fg-muted")} />
        {t.badge && unread > 0 && <span className="absolute right-1.5 top-1 h-2 w-2 rounded-full bg-beacon ring-2 ring-surface" aria-hidden />}
      </span>
      <span className={cn("transition-colors", t.active ? "text-fg" : "text-fg-muted")}>{t.label}</span>
    </Link>
  );
}

/** Mobile bottom bar — Today · Kids · (+) · Plan · More. The center "+" adds or sends anything
 *  from anywhere (stars, a note to the wall, an event, a to-do, groceries, a chore…). */
export function ParentNav({ unread = 0 }: { unread?: number }) {
  const pathname = usePathname();
  const { open } = useQuickAdd();
  const tabs = PRIMARY_TABS.map((t) => {
    const active = t.exact
      ? pathname === t.href
      : (t.match ?? [t.href]).some((r) => pathname === r || pathname.startsWith(r + "/") || pathname === t.href);
    return { ...t, active };
  });

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg">
      <div className="mx-auto flex max-w-2xl items-stretch justify-around">
        <Tab t={tabs[0]} unread={unread} />
        <Tab t={tabs[1]} unread={unread} />
        <div className="flex flex-1 items-center justify-center">
          <button
            type="button"
            onClick={() => open("menu")}
            aria-label="Add or send something"
            className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-accent-fg shadow-button transition hover:brightness-110 active:scale-90"
          >
            <Plus className="h-6 w-6" strokeWidth={2.5} />
          </button>
        </div>
        <Tab t={tabs[2]} unread={unread} />
        <Tab t={tabs[3]} unread={unread} />
      </div>
    </nav>
  );
}
