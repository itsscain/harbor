"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/** A submit button that asks for confirmation in a branded dialog before
 *  submitting its form. Drop-in for destructive actions inside
 *  `<form action={deleteFn}>`. The confirm button is a real submit, so it posts
 *  the surrounding form. */
export function ConfirmSubmit({
  children,
  message = "This can't be undone.",
  title = "Are you sure?",
  confirmLabel = "Delete",
  className,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  message?: string;
  title?: string;
  confirmLabel?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 active:scale-[0.98]",
          className,
        )}
      >
        {children}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-pop w-full max-w-sm rounded-2xl bg-white p-6 text-left shadow-pop"
          >
            <h2 className="text-title text-harbor">{title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-harbor transition hover:bg-harbor-50 active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={() => setOpen(false)}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-button transition hover:bg-red-700 active:scale-[0.98]"
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
