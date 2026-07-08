"use client";

import { useEffect } from "react";
import { registerAppSW, enablePush } from "@/lib/notifications/client";
import { registerPushSubscription } from "@/app/app/(parent)/notification-actions";

/** Registers the /app-scoped push service worker (push-only; no offline caching) and re-subscribes
 *  if the browser rotates the subscription. Rendered in the parent layout so notifications work on
 *  any /app page. Never touches the kiosk/Lantern (this SW is scoped to /app). */
export function RegisterSWApp({ vapidKey }: { vapidKey?: string }) {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    void registerAppSW().catch(() => {});
    // Server-passed key is authoritative; fall back to the build-time inlined public key.
    const key = vapidKey || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    // Self-heal: if the parent already granted notifications but the subscription was dropped
    // (browser cleanup / VAPID rotation), re-subscribe silently so pushes keep firing. Guarded on
    // permission === "granted", so this NEVER prompts on load — it only restores an opted-in device.
    void (async () => {
      try {
        if (!key || typeof Notification === "undefined" || Notification.permission !== "granted") return;
        const res = await enablePush(key);
        if (res.ok) await registerPushSubscription(res.sub);
      } catch {
        /* ignore — the explicit Enable flow remains available */
      }
    })();

    const onMsg = async (e: MessageEvent) => {
      if (e.data?.type !== "harbor-resubscribe") return;
      if (!key) return;
      const res = await enablePush(key);
      if (res.ok) await registerPushSubscription(res.sub);
    };
    navigator.serviceWorker.addEventListener("message", onMsg);
    return () => navigator.serviceWorker.removeEventListener("message", onMsg);
  }, [vapidKey]);

  return null;
}
