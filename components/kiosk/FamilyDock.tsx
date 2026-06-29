"use client";

import { CalendarDays, ClipboardCheck, ListChecks, ScrollText } from "lucide-react";
import { Pressable } from "./Pressable";
import { cn } from "@/lib/cn";

/** The FAMILY-only utility shelf (Kiosk Overhaul §4.3) — replaces the persistent
 *  KTabBar. Low-emphasis tonal pills; the instrument's quiet footnote, never the
 *  hero. Present nowhere else (CHILD is immersive). */
export function FamilyDock({
  onCalendar,
  onChores,
  onLists,
  onRules,
  groceriesLeft = 0,
  hasRules = true,
}: {
  onCalendar: () => void;
  onChores: () => void;
  onLists: () => void;
  onRules: () => void;
  groceriesLeft?: number;
  hasRules?: boolean;
}) {
  const items = [
    { key: "calendar", label: "Calendar", icon: CalendarDays, onClick: onCalendar, badge: 0 },
    { key: "chores", label: "Chores", icon: ClipboardCheck, onClick: onChores, badge: 0 },
    { key: "lists", label: "Lists", icon: ListChecks, onClick: onLists, badge: groceriesLeft },
    ...(hasRules ? [{ key: "rules", label: "House Rules", icon: ScrollText, onClick: onRules, badge: 0 }] : []),
  ];
  return (
    <nav className="flex items-center justify-center gap-2 rounded-2xl border border-kline/40 bg-kbg2/70 p-2 backdrop-blur-md sm:gap-3">
      {items.map((it) => (
        <Pressable
          key={it.key}
          haptics
          fx="navigate-in"
          onClick={it.onClick}
          aria-label={it.label}
          className={cn(
            "kiosk-tap relative flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-kmute transition hover:text-ktext",
          )}
        >
          <it.icon className="h-5 w-5" />
          <span className="hidden sm:inline">{it.label}</span>
          {it.badge > 0 && (
            <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-kwater px-1.5 text-xs font-bold tabular-nums text-harbor">
              {it.badge}
            </span>
          )}
        </Pressable>
      ))}
    </nav>
  );
}
