import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/primitives";
import type { NavGroup } from "@/lib/app-nav";

/** Renders a hub page (Plan / More) from the nav taxonomy — grouped rows with an
 *  icon tile, label, description, and chevron. One consistent presentation. */
export function NavHub({ groups }: { groups: NavGroup[] }) {
  return (
    <div className="space-y-7">
      {groups.map((g) => (
        <section key={g.heading}>
          <p className="text-eyebrow mb-2 text-muted">{g.heading}</p>
          <div className="space-y-2.5">
            {g.items.map(({ href, label, desc, icon: Icon }) => (
              <Link key={href} href={href} className="block">
                <Card interactive className="flex items-center gap-3.5 py-3.5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-harbor-50 text-harbor">
                    <Icon className="h-[22px] w-[22px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-title text-harbor">{label}</p>
                    <p className="truncate text-sm text-muted">{desc}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
