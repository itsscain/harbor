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
          <p className="text-eyebrow text-water">Getting started</p>
          <h2 className="mt-1 text-title text-harbor">
            {done === steps.length ? "All set — your wall is humming 🎉" : `You're ${done} of ${steps.length} steps in`}
          </h2>
        </div>
        <form action={dismiss}>
          <button
            type="submit"
            className="rounded-full p-1.5 text-muted transition hover:bg-harbor-50 hover:text-harbor"
            aria-label="Dismiss setup checklist"
          >
            <X className="h-5 w-5" />
          </button>
        </form>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-harbor-100">
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
                  ? "border-transparent bg-surface-sunken opacity-70"
                  : "border-harbor-100 hover:-translate-y-0.5 hover:border-water/40 hover:shadow-card-hover",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                  s.done ? "bg-emerald-500 text-white" : "bg-harbor-50 text-muted",
                )}
              >
                {s.done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block font-semibold", s.done ? "text-muted line-through" : "text-ink")}>
                  {s.label}
                </span>
                {!s.done && <span className="block truncate text-xs text-muted">{s.hint}</span>}
              </span>
              {!s.done && <ArrowRight className="h-4 w-4 shrink-0 text-muted" />}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
