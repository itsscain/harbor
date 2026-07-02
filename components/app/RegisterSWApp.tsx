"use client";

import { useEffect } from "react";
import { registerAppSW, enablePush } from "@/lib/notifications/client";
import { registerPushSubscription } from "@/app/app/(parent)/notification-actions";

/** Registers the /app-scoped push service worker (push-only; no offline caching) and re-subscribes
 *  if the browser rotates the subscription. Rendered in the parent layout so notifications work on
 *  any /app page. Never touches the kiosk/Lantern (this SW is scoped to /app). */
export function RegisterSWApp() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    void registerAppSW().catch(() => {});

    const onMsg = async (e: MessageEvent) => {
      if (e.data?.type !== "harbor-resubscribe") return;
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) return;
      const res = await enablePush(key);
      if (res.ok) await registerPushSubscription(res.sub);
    };
    navigator.serviceWorker.addEventListener("message", onMsg);
    return () => navigator.serviceWorker.removeEventListener("message", onMsg);
  }, []);

  return null;
}
