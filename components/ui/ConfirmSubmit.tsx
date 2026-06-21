"use client";

import { useEffect, useRef, useState } from "react";
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Tab") {
        // Trap focus between Cancel and Confirm.
        const first = cancelRef.current;
        const last = confirmRef.current;
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      triggerRef.current?.focus(); // restore focus to the trigger on close
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
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
                ref={cancelRef}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-harbor transition hover:bg-harbor-50 active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                type="submit"
                ref={confirmRef}
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
