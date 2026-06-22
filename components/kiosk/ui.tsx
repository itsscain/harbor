"use client";

import { cn } from "@/lib/cn";
import { ChevronLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   Harbor kiosk UI kit — the single source of truth for the wall's dark theme.
   Every surface, button, and pill on the kiosk should come from here so spacing,
   radius, elevation, and states stay consistent (Skylight-grade, calm dark).
   ──────────────────────────────────────────────────────────────────────────── */

/** Card / panel — one radius, one hairline, one elevation, everywhere. */
export function KCard({
  className,
  children,
  ...rest
}: { className?: string; children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-xl bg-kpanel ring-1 ring-kline/55 shadow-k", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Small uppercase eyebrow above a group of content. */
export function KEyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("text-xs font-bold uppercase tracking-[0.16em] text-kmute", className)}>
      {children}
    </p>
  );
}

const PILL_TONES = {
  default: "bg-kraise text-kmute ring-1 ring-kline/55",
  water: "bg-kwater/15 text-kwater ring-1 ring-kwater/30",
  beacon: "bg-beacon/15 text-beacon ring-1 ring-beacon/30",
  good: "bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30",
  warn: "bg-amber-400/15 text-amber-200 ring-1 ring-amber-400/30",
  danger: "bg-red-500/15 text-red-300 ring-1 ring-red-500/30",
} as const;

/** Rounded status/label pill. */
export function KPill({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof PILL_TONES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold",
        PILL_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const BTN_BASE =
  "inline-flex items-center justify-center select-none whitespace-nowrap font-medium transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kwater/70 focus-visible:ring-offset-2 focus-visible:ring-offset-kbg disabled:pointer-events-none disabled:opacity-40";

const BTN_SIZES = {
  sm: "h-10 rounded-lg px-3.5 text-sm gap-1.5",
  md: "h-12 rounded-xl px-5 text-[15px] gap-2",
  lg: "h-14 rounded-xl px-6 text-base gap-2.5",
} as const;

const BTN_VARIANTS = {
  primary: "bg-kwater text-harbor font-semibold hover:brightness-110 active:brightness-95",
  beacon: "bg-beacon text-harbor font-semibold hover:brightness-105 active:brightness-95",
  tonal: "bg-kraise text-ktext ring-1 ring-kline/55 hover:brightness-125",
  ghost: "bg-transparent text-kmute hover:bg-kraise hover:text-ktext",
  danger: "bg-red-500/15 text-red-300 ring-1 ring-red-500/30 hover:bg-red-500/25",
} as const;

type KButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof BTN_VARIANTS;
  size?: keyof typeof BTN_SIZES;
};

/** The one button. Variants: primary (accent), beacon (rewards), tonal (default), ghost, danger. */
export function KButton({ variant = "tonal", size = "md", className, children, ...rest }: KButtonProps) {
  return (
    <button className={cn(BTN_BASE, BTN_SIZES[size], BTN_VARIANTS[variant], className)} {...rest}>
      {children}
    </button>
  );
}

const ICON_SIZES = {
  sm: "h-10 w-10 rounded-lg",
  md: "h-12 w-12 rounded-xl",
  lg: "h-14 w-14 rounded-xl",
} as const;

type KIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof BTN_VARIANTS;
  size?: keyof typeof ICON_SIZES;
};

/** Square icon-only button, same variants as KButton. Always pass aria-label. */
export function KIconButton({ variant = "tonal", size = "md", className, children, ...rest }: KIconButtonProps) {
  return (
    <button className={cn(BTN_BASE, ICON_SIZES[size], BTN_VARIANTS[variant], className)} {...rest}>
      {children}
    </button>
  );
}

export type KTab<T extends string> = {
  key: T;
  label: string;
  icon: LucideIcon;
  badge?: number | null;
};

/** Persistent bottom navigation — the wall's primary way to move between sections. */
export function KTabBar<T extends string>({
  items,
  current,
  onSelect,
}: {
  items: KTab<T>[];
  current: T | null;
  onSelect: (key: T) => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-kline/50 bg-kbg2/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-2xl items-stretch gap-1 px-3 py-1.5">
        {items.map((it) => {
          const active = it.key === current;
          const Icon = it.icon;
          return (
            <button
              key={it.key}
              onClick={() => onSelect(it.key)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 transition-all duration-200 active:scale-[0.94]",
                active ? "bg-kraise text-kwater shadow-k" : "text-kmute hover:bg-kraise/60 hover:text-ktext",
              )}
            >
              {active && <span aria-hidden className="absolute top-1 h-1 w-7 rounded-full bg-kwater/80" />}
              <Icon
                className={cn("transition-all duration-200", active ? "h-[23px] w-[23px]" : "h-[22px] w-[22px]")}
                strokeWidth={active ? 2.4 : 2}
              />
              <span className={cn("text-[11px]", active ? "font-semibold" : "font-medium")}>{it.label}</span>
              {it.badge ? (
                <span className="absolute right-[26%] top-0.5 min-w-[17px] rounded-full bg-beacon px-1 text-center text-[10px] font-semibold leading-[17px] text-harbor">
                  {it.badge > 99 ? "99+" : it.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** Consistent top bar for focus-mode views (a back affordance + title + optional action). */
export function KTopBar({
  onBack,
  backLabel = "Back",
  title,
  right,
}: {
  onBack?: () => void;
  backLabel?: string;
  title?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-kline/50 bg-kbg2/90 px-4 py-3 backdrop-blur-md sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {onBack && (
          <KButton variant="tonal" size="sm" onClick={onBack} className="px-3">
            <ChevronLeft className="h-4 w-4" /> {backLabel}
          </KButton>
        )}
        {title && <span className="truncate font-display text-lg font-bold text-ktext">{title}</span>}
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </header>
  );
}
