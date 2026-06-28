"use client";

import { createClient } from "@/lib/supabase/client";

/** The current app build, injected at deploy (the git SHA on Vercel). The device reports
 *  this on check-in so the parent's manager can flag "on an old version". */
export const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || "dev";

export type DeviceState = {
  id: string;
  device_label: string | null;
  kind: string;
  child_id: string | null;
  settings: Record<string, unknown> | null;
  paused: boolean;
  command: string | null;
};

/** Device check-in (Device Management D3): report this build + last-seen, and pop any
 *  queued remote command. Authed by the device-secret (anon RPC). Best-effort. */
export async function fetchDeviceState(secret: string): Promise<DeviceState | null> {
  try {
    const { data, error } = await createClient().rpc("rpc_kiosk_device_state", {
      p_secret: secret,
      p_app_version: BUILD_ID,
    });
    if (error || !data) return null;
    return data as unknown as DeviceState;
  } catch {
    return null;
  }
}

/** Remote Refresh / the manual recovery: drop service workers + caches, then reload to
 *  the latest build. Never touches the "harbor-kiosk" IndexedDB, so pairing + PIN +
 *  progress survive. (Same recovery as the Debug panel's "Clear everything".) */
export async function nukeAndReload(): Promise<void> {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* reload anyway */
  }
  window.location.reload();
}
