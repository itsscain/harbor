"use client";

import { useEffect } from "react";
import { RouteError } from "@/components/ui/RouteError";
import { captureError } from "@/lib/observability";

export default function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => captureError(error, { boundary: "admin" }), [error]);
  return <RouteError reset={reset} homeHref="/admin" homeLabel="Back to Dashboard" />;
}
