import { cn } from "@/lib/cn";

// ── Button ───────────────────────────────────────────────────────────────────
type ButtonVariant = "primary" | "secondary" | "beacon" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-fg shadow-button hover:brightness-110",
  secondary: "border border-line-strong bg-surface text-fg hover:border-accent/50 hover:bg-raised",
  beacon: "bg-[linear-gradient(180deg,#f8bf57,#f2a92f)] text-[#3a2a06] shadow-button hover:brightness-105",
  ghost: "text-fg hover:bg-surface-2",
  danger: "border border-error/40 bg-surface text-error hover:bg-error/10",
};
const buttonSizes: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150",
        "active:translate-y-px active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none disabled:active:translate-y-0",
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    />
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────
export function Card({
  className,
  interactive = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-surface p-5 shadow-card",
        interactive &&
          "transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-card-hover active:scale-[0.985] active:duration-75",
        className,
      )}
      {...props}
    />
  );
}

// ── Section heading ───────────────────────────────────────────────────────────
export function SectionHeader({
  children,
  eyebrow,
  action,
  rule = false,
  className,
}: {
  children: React.ReactNode;
  eyebrow?: string;
  action?: React.ReactNode;
  /** Editorial section rule — a hairline under the heading + extra top air. */
  rule?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-end justify-between gap-3",
        rule ? "mb-4 border-b border-line pb-2" : "mb-3",
        className,
      )}
    >
      <div>
        {eyebrow && <p className="text-eyebrow mb-1 text-fg-muted">{eyebrow}</p>}
        <h2 className="text-title text-fg">{children}</h2>
      </div>
      {action}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

// ── Badge ────────────────────────────────────────────────────────────────────
// Alpha-tinted over the themed surface so tones read on both dark and light.
const badgeTones: Record<string, string> = {
  neutral: "bg-surface-2 text-fg-muted",
  beacon: "bg-beacon/15 text-beacon",
  green: "bg-good/15 text-good",
  blue: "bg-accent/15 text-accent",
  amber: "bg-beacon/15 text-beacon",
  red: "bg-error/15 text-error",
  gray: "bg-surface-2 text-fg-subtle",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: keyof typeof badgeTones;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

// ── Stat ─────────────────────────────────────────────────────────────────────
export function Stat({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <Card className={cn(accent && "border-beacon/30 bg-beacon/[0.08]")}>
      <p className="text-sm font-medium text-fg-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-extrabold text-fg">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-fg-muted">{hint}</p>}
    </Card>
  );
}

// ── StatChip ─ a glance figure inside a fused band (no card chrome) ───────────────
export function StatChip({
  value,
  label,
  hint,
  accent = false,
}: {
  value: React.ReactNode;
  label: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="px-4 py-3.5 text-center sm:text-left">
      <p
        className={cn(
          "font-display text-2xl font-extrabold leading-none tracking-[-0.02em] text-fg",
          accent && "text-beacon",
        )}
      >
        {value}
      </p>
      <p className="text-eyebrow mt-1 text-fg-muted">{label}</p>
      {hint && <p className="mt-0.5 text-[11px] text-fg-subtle">{hint}</p>}
    </div>
  );
}

// ── Form fields ──────────────────────────────────────────────────────────────
export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-fg">
          {label}
        </label>
      )}
      {children}
      {hint && <p className="text-xs text-fg-muted">{hint}</p>}
    </div>
  );
}

const fieldClass =
  "w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-fg outline-none transition placeholder:text-fg-subtle focus:border-accent focus:ring-4 focus:ring-accent/20 hover:border-accent/40";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClass, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldClass, "min-h-24", className)} {...props} />;
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldClass, "appearance-none", className)} {...props} />;
}

// ── Switch ────────────────────────────────────────────────────────────────────
/** A branded toggle. Pure CSS (peer) so it works inside plain `<form action>`s
 *  without client JS — submits like a checkbox under `name`. */
export function Switch({
  name,
  defaultChecked,
  label,
  hint,
  className,
}: {
  name: string;
  defaultChecked?: boolean;
  label: string;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={cn("flex cursor-pointer items-center justify-between gap-3", className)}>
      <span>
        <span className="block text-sm font-medium text-fg">{label}</span>
        {hint && <span className="block text-xs text-fg-muted">{hint}</span>}
      </span>
      <span className="relative inline-flex shrink-0">
        <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
        <span className="block h-7 w-12 rounded-full bg-line-strong transition-colors duration-200 peer-checked:bg-accent peer-focus-visible:ring-4 peer-focus-visible:ring-accent/25" />
        <span className="pointer-events-none absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-card transition-transform duration-200 peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
