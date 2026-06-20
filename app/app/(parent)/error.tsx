"use client";

import { RouteError } from "@/components/ui/RouteError";

export default function ParentError({ reset }: { error: Error; reset: () => void }) {
  return <RouteError reset={reset} homeHref="/app" homeLabel="Back to Home" />;
}
