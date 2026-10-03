import Link from "next/link";
import { Star } from "lucide-react";
import { MiniAvatar } from "@/components/ui/Chips";
import type { KidBasics } from "@/lib/kid";
import { cn } from "@/lib/cn";

/** The top of a kid's page: their face, name, age and stars — calm, theme-aware. */
export function KidHeader({ kid }: { kid: KidBasics }) {
  return (
    <header className="mb-4 flex items-center gap-4">
      <MiniAvatar kid={kid} size={64} />
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-[2rem] font-extrabold leading-tight tracking-tight text-fg">{kid.name}</h1>
        <p className="mt-0.5 flex items-center gap-2 text-sm text-fg-muted">
          {kid.age != null && <span>{kid.age} years old</span>}
          {kid.age != null && <span aria-hidden>·</span>}
          <span className="inline-flex items-center gap-1 font-semibold text-beacon">
            <Star className="h-3.5 w-3.5 fill-current" /> {kid.stars} stars
          </span>
        </p>
      </div>
    </header>
  );
}

export const KID_TABS = [
  { key: "today", label: "Today" },
  { key: "routines", label: "Routines" },
  { key: "chores", label: "Chores" },
  { key: "about", label: "About" },
] as const;
export type KidTab = (typeof KID_TABS)[number]["key"];

export function parseKidTab(v: string | undefined): KidTab {
  return (KID_TABS.find((t) => t.key === v)?.key ?? "today") as KidTab;
}

/** Four plain tabs instead of one 600-control scroll. */
export function KidTabs({ kidId, active, base }: { kidId: string; active: KidTab; base?: string }) {
  const root = base ?? `/app/children/${kidId}`;
  return (
    <nav aria-label="Sections" className="mb-5 flex gap-1 overflow-x-auto rounded-2xl border border-line bg-surface p-1 [scrollbar-width:none]">
      {KID_TABS.map((t) => {
        const on = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.key === "today" ? root : `${root}?tab=${t.key}`}
            aria-current={on ? "page" : undefined}
            scroll={false}
            replace
            className={cn(
              "flex min-h-10 flex-1 shrink-0 items-center justify-center whitespace-nowrap rounded-xl px-3 text-sm font-semibold transition",
              on ? "bg-accent/15 text-fg" : "text-fg-muted hover:bg-surface-2 hover:text-fg",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
