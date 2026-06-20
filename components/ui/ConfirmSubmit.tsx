"use client";

import { cn } from "@/lib/cn";

/** A submit button that asks for confirmation before submitting its form.
 *  Drop-in for destructive actions inside `<form action={deleteFn}>`. */
export function ConfirmSubmit({
  children,
  message = "Are you sure? This can't be undone.",
  className,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  message?: string;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <button
      type="submit"
      aria-label={ariaLabel}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50",
        className,
      )}
    >
      {children}
    </button>
  );
}
