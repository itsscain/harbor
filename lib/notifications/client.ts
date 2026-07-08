// Client-side web-push helpers for the parent app. Browser-only (used by client components).

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** Running as an installed PWA (Home Screen) rather than a Safari tab. iOS push needs this. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** A subscription minted with a DIFFERENT VAPID key can never receive our pushes — the push
 *  service silently drops them. Detect that so we can replace the stale subscription. */
function subMatchesKey(sub: PushSubscription, key: Uint8Array): boolean {
  const existing = sub.options?.applicationServerKey;
  if (!existing) return true; // can't verify (old browser) → don't churn a working sub
  const a = new Uint8Array(existing);
  if (a.length !== key.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== key[i]) return false;
  return true;
}

/** Register the /app-scoped push service worker (idempotent). */
export async function registerAppSW(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register("/sw-app.js", { scope: "/app" });
}

export type SubJSON = { endpoint: string; p256dh: string; auth: string; platform: string };

function toJSON(sub: PushSubscription): SubJSON | null {
  const j = sub.toJSON();
  if (!j.endpoint || !j.keys?.p256dh || !j.keys?.auth) return null;
  return {
    endpoint: j.endpoint,
    p256dh: j.keys.p256dh,
    auth: j.keys.auth,
    platform: isIOS() ? "ios" : typeof navigator !== "undefined" ? navigator.platform || "web" : "web",
  };
}

/** Ask permission (if needed) and subscribe. Returns the subscription JSON to register with the
 *  backend, or a reason it couldn't. */
export async function enablePush(vapidPublicKey: string): Promise<{ ok: true; sub: SubJSON } | { ok: false; reason: "unsupported" | "denied" | "error" }> {
  if (!pushSupported() || !vapidPublicKey) return { ok: false, reason: "unsupported" };
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return { ok: false, reason: "denied" };
    const reg = await registerAppSW();
    await navigator.serviceWorker.ready;
    const key = urlBase64ToUint8Array(vapidPublicKey);
    let sub = await reg.pushManager.getSubscription();
    // Replace a subscription tied to a stale/rotated VAPID key — otherwise pushes never arrive.
    if (sub && !subMatchesKey(sub, key)) {
      try {
        await sub.unsubscribe();
      } catch {
        /* ignore — we resubscribe below regardless */
      }
      sub = null;
    }
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key as BufferSource,
      });
    }
    const json = toJSON(sub);
    return json ? { ok: true, sub: json } : { ok: false, reason: "error" };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/** Unsubscribe locally; returns the endpoint that was removed (to deactivate server-side). */
export async function disablePush(): Promise<string | null> {
  try {
    const reg = await navigator.serviceWorker.getRegistration("/app");
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return null;
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    return endpoint;
  } catch {
    return null;
  }
}
