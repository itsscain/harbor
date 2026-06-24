import { cn } from "@/lib/cn";

/** A small earned-achievement badge for a child's completion streak. Hidden below
 *  2 days (a one-day "streak" isn't motivating and just adds noise). Beacon-gold to
 *  read as a reward, not an alarm. */
export function StreakBadge({
  count,
  compact = false,
  className,
}: {
  count: number;
  /** Drop the "days" word — for tight rows like the home child list. */
  compact?: boolean;
  className?: string;
}) {
  if (count < 2) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-beacon/15 font-bold text-beacon ring-1 ring-beacon/25",
        compact ? "px-2 py-0.5 text-sm" : "px-2.5 py-1 text-sm",
        className,
      )}
      title={`${count}-day streak`}
    >
      <span aria-hidden>🔥</span>
      {count}
      {!compact && <span className="font-medium text-beacon/80">day{count === 1 ? "" : "s"}</span>}
    </span>
  );
}
