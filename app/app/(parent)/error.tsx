"use client";

import { useEffect } from "react";
import { RouteError } from "@/components/ui/RouteError";
import { captureError } from "@/lib/observability";

export default function ParentError({
  error,
  reset,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  unstable_retry?: () => void;
}) {
  useEffect(() => captureError(error, { boundary: "parent" }), [error]);
  return <RouteError retry={unstable_retry} reset={reset} homeHref="/app" homeLabel="Back to Today" />;
}
