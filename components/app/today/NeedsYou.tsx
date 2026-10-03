"use client";

import { useOptimistic } from "react";
import { Check, Clock, Pill, Bell } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { MiniAvatar } from "@/components/ui/Chips";
import { useQuickAction } from "@/components/ui/useQuickAction";
import { decideRequest } from "@/app/app/(parent)/command/actions";
import {
  markDoseGiven,
  undoDoseGiven,
  completeReminder,
  reopenReminder,
  snoozeReminder,
} from "@/app/app/(parent)/quick-actions";
import type { NeedItem } from "@/lib/today";
import { cn } from "@/lib/cn";

function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

/** "Needs you" — everything waiting on a grown-up, each answerable right here in one tap. Items
 *  disappear optimistically and come back (with the real reason) if the save fails. */
export function NeedsYou({ items }: { items: NeedItem[] }) {
  const [visible, hide] = useOptimistic(items, (state, key: string) => state.filter((i) => i.key !== key));
  const { run, pending } = useQuickAction();

  if (visible.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 text-[15px] text-fg-muted">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-good/15 text-good">
          <Check className="h-4 w-4" strokeWidth={2.5} />
        </span>
        All clear — nothing needs you right now.
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {visible.map((item) => (
        <li key={item.key} className="rounded-2xl border border-line bg-surface p-4">
          {item.kind === "request" && (
            <>
              <div className="flex items-start gap-3">
                <MiniAvatar kid={{ id: item.id, name: item.childName, avatar: item.childAvatar, color: item.childColor }} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] leading-snug text-fg">
                    <span className="font-semibold">{item.childName}</span> asks for{" "}
                    <span className="font-semibold">
                      {item.emoji} {item.summary}
                    </span>
                  </p>
                  <p className="mt-0.5 text-sm text-fg-muted">{ago(item.at)}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  disabled={pending}
                  onClick={() =>
                    run(
                      async () => {
                        const r = await decideRequest({ id: item.id, decision: "approved" });
                        return r.ok ? { ok: true } : { ok: false, error: "Someone already answered that one." };
                      },
                      { optimistic: () => hide(item.key), success: `Approved — ${item.childName}'s wall will show it` },
                    )
                  }
                >
                  <Check className="h-4 w-4" /> Approve
                </Button>
                <Button
                  variant="secondary"
                  disabled={pending}
                  onClick={() =>
                    run(
                      async () => {
                        const r = await decideRequest({ id: item.id, decision: "denied" });
                        return r.ok ? { ok: true } : { ok: false, error: "Someone already answered that one." };
                      },
                      { optimistic: () => hide(item.key), success: `Got it — ${item.childName} will see "maybe later"` },
                    )
                  }
                >
                  Not now
                </Button>
              </div>
            </>
          )}

          {item.kind === "med" && (
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-full",
                  item.overdue ? "bg-error/15 text-error" : "bg-accent/15 text-accent",
                )}
              >
                <Pill className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-fg">
                  {item.childName} · {item.name}
                  {item.dose ? <span className="font-normal text-fg-muted"> {item.dose}</span> : null}
                </p>
                <p className={cn("text-sm", item.overdue ? "text-error" : "text-fg-muted")}>
                  {item.overdue ? `Missed — was due ${item.timeLabel}` : `Due ${item.timeLabel}`}
                </p>
              </div>
              <Button
                size="sm"
                disabled={pending}
                onClick={() =>
                  run(() => markDoseGiven({ medicationId: item.medicationId, childId: item.childId, time: item.time }), {
                    optimistic: () => hide(item.key),
                    undo: () => undoDoseGiven({ medicationId: item.medicationId, time: item.time }),
                  })
                }
              >
                Mark given
              </Button>
            </div>
          )}

          {item.kind === "reminder" && (
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-full",
                  item.overdue ? "bg-beacon/15 text-beacon" : "bg-accent/15 text-accent",
                )}
              >
                <Bell className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-fg">{item.title}</p>
                <p className="text-sm text-fg-muted">{item.overdue ? item.dueLabel : "Due today"}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Move "${item.title}" to tomorrow`}
                  disabled={pending}
                  onClick={() => run(() => snoozeReminder(item.id), { optimistic: () => hide(item.key) })}
                >
                  <Clock className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(() => completeReminder(item.id), {
                      optimistic: () => hide(item.key),
                      undo: () => reopenReminder(item.id),
                    })
                  }
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
