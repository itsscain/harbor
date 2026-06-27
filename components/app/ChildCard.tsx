import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { childColor } from "@/lib/kiosk/colors";
import { Card } from "@/components/ui/primitives";
import { EntityAvatar } from "@/components/ui/EntityAvatar";

/** Premium child row — same language as the detail hero: ringed avatar, display name,
 *  the child's accent revealed only as a hover left-edge (color used like ink). */
export function ChildCard({
  child,
  meta,
  index = 0,
}: {
  child: { id: string; name: string; avatar: string | null; color?: string | null; photo_url?: string | null };
  meta?: string;
  index?: number;
}) {
  const color = childColor(child);
  return (
    <Link
      href={`/app/children/${child.id}`}
      className="block animate-enter"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <Card
        interactive
        className="group/disc flex items-center gap-4 [border-left:3px_solid_transparent] hover:[border-left-color:var(--accent)]"
        style={{ ["--accent" as string]: color }}
      >
        <EntityAvatar photoUrl={child.photo_url} fallback={child.avatar ?? "🙂"} accent={color} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-xl font-extrabold tracking-[-0.02em] text-harbor">{child.name}</p>
          {meta && <p className="mt-0.5 truncate text-sm text-muted">{meta}</p>}
        </div>
        <ChevronRight className="ml-auto h-5 w-5 text-harbor-100 transition group-hover/disc:translate-x-0.5 group-hover/disc:text-water" />
      </Card>
    </Link>
  );
}
