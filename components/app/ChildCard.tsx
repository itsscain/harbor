import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { childColor } from "@/lib/kiosk/colors";
import { Card } from "@/components/ui/primitives";

/** Premium child row — color identity (left accent + ringed avatar) like the wall. */
export function ChildCard({
  child,
  meta,
  index = 0,
}: {
  child: { id: string; name: string; avatar: string | null; color?: string | null };
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
      <Card interactive className="flex items-center gap-3.5 border-l-4" style={{ borderLeftColor: color }}>
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl"
          style={{ background: color + "22", boxShadow: `inset 0 0 0 2px ${color}` }}
        >
          {child.avatar ?? "🙂"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-title text-harbor">{child.name}</span>
          {meta && <span className="block truncate text-sm text-muted">{meta}</span>}
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
      </Card>
    </Link>
  );
}
