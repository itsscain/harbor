"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { subscribeHousehold } from "@/lib/kiosk/realtime";

/** Keeps the Helm live (Real-Time §5.1) — subscribes to the household's nudge topic and
 *  refreshes the current route's server data when ANY member device changes something
 *  (a child completing a step on the wall, a co-parent's edit). Debounced; cleans up its
 *  channel on unmount. The parent's OWN edits are already instant via Server-Action
 *  revalidation — this covers changes made elsewhere. */
export function RealtimeRefresh({ householdId }: { householdId: string }) {
  const router = useRouter();
  useEffect(() => {
    if (!householdId) return;
    let t: number | undefined;
    const refresh = () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => router.refresh(), 400);
    };
    const unsub = subscribeHousehold(householdId, refresh);
    return () => {
      window.clearTimeout(t);
      unsub();
    };
  }, [householdId, router]);
  return null;
}
