import Link from "next/link";
import { Check, X, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

type Step = { label: string; hint: string; done: boolean; href: string };

/** A celebratory, progress-ringed setup tracker (replaces the flat checklist). */
export function SetupChecklist({
  steps,
  dismiss,
}: {
  steps: Step[];
  dismiss: () => void;
}) {
  const done = steps.filter((s) => s.done).length;
  const pct = Math.round((done / steps.length) * 100);

  return (
    <Card className="mb-6 animate-enter">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-eyebrow text-accent">Getting started</p>
          <h2 className="mt-1 text-title text-fg">
            {done === steps.length ? "All set — your wall is humming 🎉" : `You're ${done} of ${steps.length} steps in`}
          </h2>
        </div>
        <form action={dismiss}>
          <button
            type="submit"
            className="-mr-1.5 -mt-1.5 flex h-11 w-11 items-center justify-center rounded-full text-fg-muted transition hover:bg-surface-2 hover:text-fg"
            aria-label="Dismiss setup checklist"
          >
            <X className="h-5 w-5" />
          </button>
        </form>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#18606f,#2f8f86)] transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="mt-4 space-y-2">
        {steps.map((s, i) => (
          <li key={s.label}>
            <Link
              href={s.href}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition",
                s.done
                  ? "border-transparent bg-surface-2 opacity-70"
                  : "border-line hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-card-hover",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                  s.done ? "bg-emerald-500 text-white" : "bg-surface-2 text-fg-muted",
                )}
              >
                {s.done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block font-semibold", s.done ? "text-fg-muted line-through" : "text-fg")}>
                  {s.label}
                </span>
                {!s.done && <span className="block truncate text-xs text-fg-muted">{s.hint}</span>}
              </span>
              {!s.done && <ArrowRight className="h-4 w-4 shrink-0 text-fg-muted" />}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
