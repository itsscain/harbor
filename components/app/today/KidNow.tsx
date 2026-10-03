"use client";

import Link from "next/link";
import { Star, ChevronRight } from "lucide-react";
import { MiniAvatar } from "@/components/ui/Chips";
import { useQuickAction } from "@/components/ui/useQuickAction";
import { useQuickAdd } from "@/components/app/quick/QuickAdd";
import { calmBreath } from "@/app/app/(parent)/quick-actions";
import type { TodayKid } from "@/lib/today";
import { cn } from "@/lib/cn";

/** One kid, right now: what they're on (and how far), today's chores, their stars — and the three
 *  things a parent does most, one tap each. Tapping the top opens the kid's page. */
export function KidNow({ kid }: { kid: TodayKid }) {
  const quick = useQuickAdd();
  const { run, pending } = useQuickAction();
  const tint = kid.color ?? "#56c7e0";
  const r = kid.routine;
  const pct = r ? Math.round((r.done / Math.max(1, r.total)) * 100) : kid.allDone ? 100 : 0;

  let line: React.ReactNode;
  if (r) {
    const progress = r.state === "next" ? null : `${r.done} of ${r.total}`;
    line = (
      <>
        <span aria-hidden>{r.emoji}</span> {r.name}
        {progress && <span className="text-fg"> · {progress}</span>}
        {r.hint && <span className={cn(r.state === "late" && "text-beacon")}> · {r.hint}</span>}
      </>
    );
  } else if (kid.allDone) {
    line = <span className="font-medium text-good">All done today ✓</span>;
  } else if (kid.routinesToday === 0) {
    line = "No routines today";
  } else {
    line = <span className="font-medium text-good">Routines done ✓</span>;
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <Link href={`/app/children/${kid.id}`} className="tap -m-1 flex items-center gap-3 rounded-xl p-1">
        <MiniAvatar kid={kid} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-[17px] font-semibold text-fg">{kid.name}</p>
            {kid.status === "calm" && (
              <span className="shrink-0 rounded-full bg-[#7c6cf0]/15 px-2 py-0.5 text-xs font-semibold text-[#a99cf7]">Calm-down break</span>
            )}
            {kid.status === "grounded" && (
              <span className="shrink-0 rounded-full bg-beacon/15 px-2 py-0.5 text-xs font-semibold text-beacon">Grounded</span>
            )}
          </div>
          <p className="line-clamp-2 text-sm leading-snug text-fg-muted">{line}</p>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-beacon/12 px-2.5 py-1 text-sm font-bold tabular-nums text-beacon">
          <Star className="h-3.5 w-3.5 fill-current" /> {kid.stars}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
      </Link>

      {(r || kid.allDone) && (
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-label={`${kid.name}'s progress`}
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: tint }} />
        </div>
      )}
      {kid.chores.total > 0 && (
        <p className="mt-2 text-sm text-fg-muted">
          🧹 {kid.chores.done} of {kid.chores.total} {kid.chores.total === 1 ? "chore" : "chores"}
        </p>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2">
        <QuickButton onClick={() => quick.open("stars", kid.id)} label={`Give ${kid.name} stars`}>
          ⭐ Stars
        </QuickButton>
        <QuickButton onClick={() => quick.open("note", kid.id)} label={`Send ${kid.name} a note`}>
          💬 Note
        </QuickButton>
        <QuickButton
          disabled={pending}
          onClick={() => run(() => calmBreath({ childId: kid.id }), { success: `Calm breath started on ${kid.name}'s wall` })}
          label={`Start a calm breath on ${kid.name}'s wall`}
        >
          🌬️ Calm
        </QuickButton>
      </div>
    </div>
  );
}

function QuickButton({
  children,
  onClick,
  label,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className="tap min-h-11 rounded-xl border border-line-strong bg-surface-2/50 text-[15px] font-semibold text-fg transition hover:border-accent/50 hover:bg-surface-2 active:scale-[0.97] disabled:opacity-50"
    >
      {children}
    </button>
  );
}
