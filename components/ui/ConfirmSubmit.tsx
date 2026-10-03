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
          "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-error/40 px-3 py-2 text-sm font-semibold text-error transition hover:bg-error/10 active:scale-[0.98]",
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
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-pop w-full max-w-sm rounded-2xl border border-line bg-surface p-6 text-left shadow-pop"
          >
            <h2 className="text-title text-fg">{title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                ref={cancelRef}
                onClick={() => setOpen(false)}
                className="min-h-11 rounded-xl px-4 py-2.5 text-sm font-semibold text-fg transition hover:bg-surface-2 active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                type="button"
                ref={confirmRef}
                onClick={() => {
                  // Submit the form explicitly BEFORE closing. Using a real submit
                  // button + setOpen(false) unmounts the submitter before the browser
                  // processes submission, which silently cancels the server action in
                  // production builds. requestSubmit() fires it deterministically first.
                  const form = confirmRef.current?.closest("form");
                  form?.requestSubmit();
                  setOpen(false);
                }}
                className="min-h-11 rounded-xl bg-error px-4 py-2.5 text-sm font-semibold text-white shadow-button transition hover:brightness-110 active:scale-[0.98]"
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
