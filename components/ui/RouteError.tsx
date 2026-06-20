"use client";

import Link from "next/link";
import { LighthouseMark } from "@/components/brand/Logo";

/** Branded route-level error UI for error.tsx boundaries. */
export function RouteError({
  reset,
  homeHref = "/",
  homeLabel = "Go home",
  title = "Something went wrong",
  message = "Sorry about that. You can try again, or head back.",
}: {
  reset: () => void;
  homeHref?: string;
  homeLabel?: string;
  title?: string;
  message?: string;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <LighthouseMark className="h-12 w-12 text-harbor" />
      <h1 className="mt-4 font-display text-2xl font-extrabold text-harbor">{title}</h1>
      <p className="mt-2 max-w-sm text-muted">{message}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-xl bg-harbor px-6 py-3 font-semibold text-white transition hover:bg-harbor-700"
        >
          Try again
        </button>
        <Link
          href={homeHref}
          className="rounded-xl border border-harbor-100 bg-white px-6 py-3 font-semibold text-harbor transition hover:bg-harbor-50"
        >
          {homeLabel}
        </Link>
      </div>
    </div>
  );
}
