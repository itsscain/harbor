import { cn } from "@/lib/cn";

/** The standard top of a profile-shaped Helm page: a calm card with a single accent
 *  top-rule that draws itself in, an optional ringed avatar, display title, a meta row, and —
 *  if given — a fused glance band of StatChips. Color is used like ink: the accent appears only
 *  as this rule (the avatar ring + dots live in the children). Theme tokens only, so it reads
 *  correctly on the dark (default) and light Helm skins. */
export function PageHero({
  eyebrow,
  title,
  accent = "#18606f",
  avatar,
  meta,
  stats,
  reducedMotion = false,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  accent?: string;
  avatar?: React.ReactNode;
  meta?: React.ReactNode;
  stats?: React.ReactNode;
  reducedMotion?: boolean;
  className?: string;
}) {
  return (
    <header className={cn("mb-8 overflow-hidden rounded-2xl border border-line bg-surface shadow-card animate-enter", className)}>
      <div
        className={cn("h-1 w-full origin-left", !reducedMotion && "motion-safe:animate-[grow_520ms_var(--ease-harbor-out)]")}
        style={{ background: accent }}
      />
      <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:gap-7 sm:p-8">
        {avatar}
        <div className="min-w-0 flex-1">
          {eyebrow && <p className="text-eyebrow text-fg-muted">{eyebrow}</p>}
          <h1 className="mt-1.5 truncate font-display text-[2.25rem] font-extrabold leading-[1.04] tracking-[-0.03em] text-fg sm:text-[2.5rem]">
            {title}
          </h1>
          {meta && <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-fg-muted">{meta}</div>}
        </div>
      </div>
      {stats && <div className="grid grid-cols-3 divide-x divide-line border-t border-line">{stats}</div>}
    </header>
  );
}
