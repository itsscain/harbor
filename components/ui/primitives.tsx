import { cn } from "@/lib/cn";

// ── Button ───────────────────────────────────────────────────────────────────
type ButtonVariant = "primary" | "secondary" | "beacon" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-harbor text-white hover:bg-harbor-700",
  secondary: "border border-harbor-100 bg-white text-harbor hover:bg-harbor-50",
  beacon: "bg-beacon text-harbor hover:brightness-95",
  ghost: "text-harbor hover:bg-harbor-50",
  danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
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
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:opacity-60 disabled:pointer-events-none",
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
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-harbor-100 bg-white p-5 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

// ── Badge ────────────────────────────────────────────────────────────────────
const badgeTones: Record<string, string> = {
  neutral: "bg-harbor-50 text-harbor",
  beacon: "bg-beacon-soft text-harbor",
  green: "bg-emerald-50 text-emerald-700",
  blue: "bg-sky-50 text-sky-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  gray: "bg-slate-100 text-slate-600",
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
    <Card className={cn(accent && "border-beacon/40 bg-beacon-soft/40")}>
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-extrabold text-harbor">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
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
        <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

const fieldClass =
  "w-full rounded-xl border border-harbor-100 bg-white px-3.5 py-2.5 text-ink outline-none transition focus:border-water";

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
