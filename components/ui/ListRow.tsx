import { cn } from "@/lib/cn";

/** The shared Helm list-row: an emoji/icon tile on a sunken rail, a title, a calm
 *  subtitle, optional trailing. Every list — routines, chores, meds, people — reads as
 *  this row, so the whole app feels like one product. Put it inside a `group/disc`
 *  parent to get the hover lift on the tile. */
export function ListRow({
  tile,
  title,
  subtitle,
  trailing,
  dim = false,
}: {
  tile: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  dim?: boolean;
}) {
  return (
    <div className="flex items-center gap-4">
      <span
        className={cn(
          "grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-surface-sunken text-2xl ring-1 ring-harbor-100 transition group-hover/disc:bg-harbor-50",
          dim && "opacity-60",
        )}
      >
        {tile}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 truncate text-title text-harbor">{title}</div>
        {subtitle && <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">{subtitle}</div>}
      </div>
      {trailing}
    </div>
  );
}
