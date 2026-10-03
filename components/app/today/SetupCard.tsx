import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";
import { dismissOnboarding } from "@/app/app/(parent)/hub-actions";
import { cn } from "@/lib/cn";

type Step = { label: string; hint: string; done: boolean; href: string };

/** A compact "you're N of 5 in" card: one obvious next step, the rest one tap away. */
export function SetupCard({ steps }: { steps: Step[] }) {
  const done = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);
  return (
    <section className="mb-6 rounded-2xl border border-accent/30 bg-accent/[0.06] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-eyebrow text-accent">Getting started · {done} of {steps.length}</p>
          {next && <p className="mt-1 text-[17px] font-semibold text-fg">Next: {next.label}</p>}
        </div>
        <form action={dismissOnboarding}>
          <button
            type="submit"
            aria-label="Hide getting started"
            className="-mr-2 -mt-2 grid h-11 w-11 place-items-center rounded-full text-fg-muted transition hover:bg-surface-2 hover:text-fg"
          >
            <X className="h-5 w-5" />
          </button>
        </form>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      {next && (
        <Link
          href={next.href}
          className="tap mt-3 flex min-h-11 items-center justify-between gap-2 rounded-xl bg-accent px-4 text-[15px] font-semibold text-accent-fg transition hover:brightness-110"
        >
          {next.hint}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
      <details className="group mt-2">
        <summary className="flex min-h-10 cursor-pointer list-none items-center text-sm font-semibold text-fg-muted hover:text-fg">
          All steps
        </summary>
        <ul className="mt-1 space-y-1">
          {steps.map((s) => (
            <li key={s.label}>
              <Link href={s.href} className="flex min-h-10 items-center gap-2.5 rounded-lg px-1 text-sm">
                <span
                  className={cn(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-full",
                    s.done ? "bg-good text-white" : "border border-line-strong text-fg-subtle",
                  )}
                >
                  {s.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                <span className={cn(s.done ? "text-fg-muted line-through" : "text-fg")}>{s.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
