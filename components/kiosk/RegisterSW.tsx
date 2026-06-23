"use client";

import { useEffect } from "react";

/** Registers the kiosk service worker and tells it which /_next chunks the page
 *  actually loaded, so the app shell + JS are guaranteed cached for offline boot. */
export function RegisterSW() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const cacheLoadedAssets = () => {
      const ctrl = navigator.serviceWorker.controller;
      if (!ctrl || typeof performance === "undefined") return;
      try {
        const urls = performance
          .getEntriesByType("resource")
          .map((e) => e.name)
          .filter(
            (n) => n.startsWith(window.location.origin) && n.includes("/_next/"),
          );
        if (urls.length) ctrl.postMessage({ type: "CACHE_ASSETS", urls });
      } catch {
        /* best effort */
      }
    };

    const register = async () => {
      try {
        // If a controller already exists, a later controllerchange means a NEW
        // build activated — reload so an always-on wall picks up deploys itself.
        const hadController = !!navigator.serviceWorker.controller;
        let reloading = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          setTimeout(cacheLoadedAssets, 500);
          // Reload to pick up the new build — but never more than once a minute, so
          // even a misbehaving SW can't put the wall into a reload loop.
          if (!hadController || reloading) return;
          let last = 0;
          try {
            last = Number(sessionStorage.getItem("harbor-sw-reload") || 0);
          } catch {
            /* ignore */
          }
          if (Date.now() - last < 60_000) return;
          reloading = true;
          try {
            sessionStorage.setItem("harbor-sw-reload", String(Date.now()));
          } catch {
            /* ignore */
          }
          window.location.reload();
        });

        const reg = await navigator.serviceWorker.register("/sw.js");
        setTimeout(cacheLoadedAssets, 1500);
        // Check for a new service worker periodically (the wall rarely reloads).
        const check = () => reg.update().catch(() => {});
        window.setInterval(check, 30 * 60 * 1000);
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") check();
        });
      } catch {
        /* offline support is best-effort; the app still works without it */
      }
    };

    if (document.readyState === "complete") void register();
    else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);
  return null;
}
