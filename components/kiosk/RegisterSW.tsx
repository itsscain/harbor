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
        await navigator.serviceWorker.register("/sw.js");
        // Once a controller exists, cache what we loaded (retry after control transfer).
        setTimeout(cacheLoadedAssets, 1500);
        navigator.serviceWorker.addEventListener("controllerchange", () =>
          setTimeout(cacheLoadedAssets, 500),
        );
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
