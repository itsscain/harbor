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

/** The result of a device check-in. `revoked` means the server REACHED US and rejected the
 *  secret (the device was removed/unpaired) — the only signal that triggers a local wipe.
 *  `error` is transient (offline, timeout, server hiccup) → never wipe; keep working. */
export type DeviceStateResult =
  | { kind: "ok"; state: DeviceState }
  | { kind: "revoked" }
  | { kind: "error" };

/** Device check-in (Device Management D3): report this build + last-seen, pop any queued
 *  remote command, and detect revocation. Authed by the device-secret (anon RPC). */
export async function fetchDeviceState(secret: string): Promise<DeviceStateResult> {
  try {
    const { data, error } = await createClient().rpc("rpc_kiosk_device_state", {
      p_secret: secret,
      p_app_version: BUILD_ID,
    });
    if (error) {
      // rpc_kiosk_device_state raises 'unauthorized_device' (errcode P0001) when the secret
      // no longer matches a paired row (the parent removed it). Key off the STABLE Postgres
      // code (P0001) — the only exception this RPC raises — with the message as a fallback,
      // so a future wording change can't make a genuinely-revoked wall fail to wipe. Every
      // other path (offline/timeout/5xx/HTML/CORS) lacks both → "error", never a wipe.
      const code = (error as { code?: string }).code || "";
      const msg = (error.message || "").toLowerCase();
      if (code === "P0001" || msg.includes("unauthorized_device")) return { kind: "revoked" };
      return { kind: "error" };
    }
    if (!data) return { kind: "error" };
    return { kind: "ok", state: data as unknown as DeviceState };
  } catch {
    return { kind: "error" };
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

/** Remote WIPE / lost-device safeguard (§7) — scrub EVERY trace of household data, then
 *  reload to a clean pairing screen. Unlike a refresh, this clears the data stores: the
 *  kiosk DB (secret, PIN, snapshot, progress), the voice-cache DB (TTS clips of names), all
 *  harbor-* localStorage (home geo, child ids), and the SW + caches. Used on revocation. */
export async function wipeEverythingAndReload(): Promise<void> {
  try {
    if (typeof indexedDB !== "undefined") {
      indexedDB.deleteDatabase("harbor-kiosk"); // secret, PIN, snapshot, progress
      indexedDB.deleteDatabase("harbor-voice"); // synthesized clips of child names/messages
    }
  } catch {
    /* best effort */
  }
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.toLowerCase().startsWith("harbor")) localStorage.removeItem(k);
    }
  } catch {
    /* ignore */
  }
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
