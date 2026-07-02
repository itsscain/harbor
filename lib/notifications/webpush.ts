import "server-only";
import webpush from "web-push";
import { env, serverEnv, isPushConfigured } from "@/lib/env";

/** Web Push transport — VAPID-signed, encrypted end-to-end by the push protocol. Server-only.
 *  The app runs fine without VAPID keys (isPushConfigured() === false → sends are a graceful no-op). */

let configured = false;
function ensure() {
  if (configured) return;
  webpush.setVapidDetails(serverEnv.vapidSubject, env.vapidPublicKey, serverEnv.vapidPrivateKey);
  configured = true;
}

export type WebPushSub = { endpoint: string; keys: { p256dh: string; auth: string } };

/** Send one push. Returns { ok } on success, and { gone: true } for a dead subscription
 *  (404/410) so the caller can prune it. Never throws. */
export async function sendPush(sub: WebPushSub, payload: Record<string, unknown>): Promise<{ ok: boolean; gone: boolean }> {
  if (!isPushConfigured()) return { ok: false, gone: false };
  ensure();
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 60 * 60 * 24 });
    return { ok: true, gone: false };
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    return { ok: false, gone: status === 404 || status === 410 };
  }
}
