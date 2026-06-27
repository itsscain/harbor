"use client";

import { useEffect } from "react";
import { RouteError } from "@/components/ui/RouteError";
import { captureError } from "@/lib/observability";

export default function ParentError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => captureError(error, { boundary: "parent" }), [error]);
  return <RouteError reset={reset} homeHref="/app" homeLabel="Back to Home" />;
}
