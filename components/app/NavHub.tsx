import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { NavGroup } from "@/lib/app-nav";

/** A hub page (More) from the nav taxonomy — each group is one calm list of rows (icon, label,
 *  one plain line, chevron), the same rows Plan and Settings use. */
export function NavHub({ groups }: { groups: NavGroup[] }) {
  return (
    <div className="space-y-6">
      {groups
        .filter((g) => g.items.length > 0)
        .map((g) => (
          <section key={g.heading}>
            <h2 className="mb-2 px-1 text-sm font-semibold text-fg-muted">{g.heading}</h2>
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
              {g.items.map(({ href, label, desc, icon: Icon }) => (
                <li key={href}>
                  <Link href={href} className="flex min-h-16 items-center gap-3 px-4 py-3 transition hover:bg-surface-2">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-accent">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-fg">{label}</span>
                      <span className="block truncate text-sm text-fg-muted">{desc}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}
