"use client";

import { useEffect, useState } from "react";
import { Lightbulb, X } from "lucide-react";

/** A single, dismissible, first-visit hint. Calm and one-line — a tip, never a callout
 *  stack. Dismissal is per-device (localStorage), which is the right grain for a "you've
 *  seen this" nudge and needs no DB write. Starts hidden and reveals on mount so it never
 *  flashes for someone who already dismissed it. */
export function InlineTip({ id, children }: { id: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const key = `harbor-tip-${id}`;

  useEffect(() => {
    try {
      if (!localStorage.getItem(key)) setShow(true);
    } catch {
      /* private mode / no storage — just show it */
      setShow(true);
    }
  }, [key]);

  if (!show) return null;

  function dismiss() {
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  return (
    <div className="animate-enter mb-4 flex items-start gap-3 rounded-xl border border-beacon/30 bg-beacon/10 px-4 py-3">
      <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-beacon" />
      <p className="min-w-0 flex-1 text-sm leading-relaxed text-fg">{children}</p>
      <button
        onClick={dismiss}
        aria-label="Dismiss tip"
        className="shrink-0 rounded-full p-1 text-fg-subtle transition hover:bg-surface-2 hover:text-fg"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
