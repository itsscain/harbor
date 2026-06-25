"use client";

import { Printer } from "lucide-react";

/** Triggers the browser print dialog (→ Save as PDF) for the leave-behind sheets. */
export function PrintButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={
        "inline-flex items-center gap-2 rounded-xl bg-harbor px-4 py-2 text-sm font-semibold text-white shadow-button transition hover:brightness-110 active:translate-y-px " +
        (className ?? "")
      }
    >
      <Printer className="h-4 w-4" /> Print / Save as PDF
    </button>
  );
}
