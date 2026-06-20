"use client";

import { RouteError } from "@/components/ui/RouteError";

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return <RouteError reset={reset} homeHref="/admin" homeLabel="Back to Dashboard" />;
}
