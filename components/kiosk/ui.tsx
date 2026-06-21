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
      className={cn("rounded-3xl bg-kpanel ring-1 ring-kline/55 shadow-k", className)}
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
  "inline-flex items-center justify-center select-none whitespace-nowrap font-semibold transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kwater/70 focus-visible:ring-offset-2 focus-visible:ring-offset-kbg disabled:pointer-events-none disabled:opacity-40";

const BTN_SIZES = {
  sm: "h-11 rounded-xl px-4 text-sm gap-1.5",
  md: "h-14 rounded-2xl px-5 text-base gap-2",
  lg: "h-16 rounded-2xl px-7 text-lg gap-2.5",
} as const;

const BTN_VARIANTS = {
  primary: "bg-kwater text-harbor font-bold shadow-k hover:brightness-110 active:brightness-95",
  beacon: "bg-beacon text-harbor font-bold shadow-k hover:brightness-105 active:brightness-95",
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
  sm: "h-11 w-11 rounded-xl",
  md: "h-14 w-14 rounded-2xl",
  lg: "h-16 w-16 rounded-2xl",
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
      <div className="mx-auto flex w-full max-w-3xl items-stretch gap-1 px-3 py-2">
        {items.map((it) => {
          const active = it.key === current;
          const Icon = it.icon;
          return (
            <button
              key={it.key}
              onClick={() => onSelect(it.key)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2.5 transition active:scale-[0.97]",
                active ? "bg-kraise text-kwater" : "text-kmute hover:bg-kraise/60 hover:text-ktext",
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs font-bold">{it.label}</span>
              {it.badge ? (
                <span className="absolute right-[24%] top-1 min-w-[18px] rounded-full bg-beacon px-1 text-center text-[11px] font-bold leading-[18px] text-harbor">
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
            <ChevronLeft className="h-5 w-5" /> {backLabel}
          </KButton>
        )}
        {title && <span className="truncate font-display text-xl font-extrabold text-ktext">{title}</span>}
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </header>
  );
}
