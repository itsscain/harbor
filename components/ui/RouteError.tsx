"use client";

import Link from "next/link";
import { LighthouseMark } from "@/components/brand/Logo";

/** Branded route-level error UI for error.tsx boundaries. Theme tokens only (it's shown inside
 *  the dark-by-default Helm as well as the light marketing/admin surfaces). Saving problems are
 *  handled in place by ActionForm — this screen is only for genuine crashes. */
export function RouteError({
  retry,
  reset,
  homeHref = "/",
  homeLabel = "Go home",
  title = "Something went wrong",
  message = "Sorry about that — it's not you. Try again, or head back and pick up where you left off.",
}: {
  /** Re-fetch + re-render (Next 16 `unstable_retry`). Preferred over `reset`. */
  retry?: () => void;
  reset?: () => void;
  homeHref?: string;
  homeLabel?: string;
  title?: string;
  message?: string;
}) {
  const again = retry ?? reset;
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <LighthouseMark className="h-12 w-12 text-fg" />
      <h1 className="mt-4 font-display text-2xl font-extrabold text-fg">{title}</h1>
      <p className="mt-2 max-w-sm text-fg-muted">{message}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {again && (
          <button
            onClick={again}
            className="min-h-11 rounded-xl bg-accent px-6 py-3 font-semibold text-accent-fg transition hover:brightness-110"
          >
            Try again
          </button>
        )}
        <Link
          href={homeHref}
          className="min-h-11 rounded-xl border border-line-strong bg-surface px-6 py-3 font-semibold text-fg transition hover:bg-raised"
        >
          {homeLabel}
        </Link>
      </div>
    </div>
  );
}
