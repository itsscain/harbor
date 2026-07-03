"use client";

import { useEffect } from "react";

/**
 * Auto-fullscreen for the Lantern bedside device. Browsers refuse programmatic
 * fullscreen without a user gesture, so we can't force it on load — instead we
 * request it on the FIRST tap/keypress (which reads as "automatic": the child's
 * first touch lights the Lantern to full screen), and re-arm whenever fullscreen
 * is exited so a later tap restores it. Best-effort and self-healing:
 *  - no-ops where the Fullscreen API is unavailable (notably iPhone Safari, which
 *    instead relies on the PWA manifest's display mode),
 *  - swallows the promise rejection browsers throw when the gesture isn't trusted,
 *  - passive + capture listeners so a tap anywhere counts, even when a child
 *    handler calls stopPropagation.
 */
export function AutoFullscreen() {
  useEffect(() => {
    if (typeof document === "undefined") return;

    type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
    type FsDoc = Document & { webkitFullscreenElement?: Element | null };
    const doc = document as FsDoc;
    const el = document.documentElement as FsEl;

    const supported = !!el.requestFullscreen || !!el.webkitRequestFullscreen;
    if (!supported) return;

    const isFullscreen = () => !!(document.fullscreenElement || doc.webkitFullscreenElement);

    const request = () => {
      if (isFullscreen()) return;
      try {
        const p = el.requestFullscreen ? el.requestFullscreen() : el.webkitRequestFullscreen?.();
        if (p && typeof (p as Promise<void>).catch === "function") {
          (p as Promise<void>).catch(() => {
            /* blocked (untrusted gesture / permissions policy) — the next tap retries */
          });
        }
      } catch {
        /* not allowed right now — a later gesture will try again */
      }
    };

    // A tap/keypress is a trusted gesture; request fullscreen if we're not already there.
    const onGesture = () => request();

    window.addEventListener("pointerdown", onGesture, { capture: true, passive: true });
    window.addEventListener("keydown", onGesture, { capture: true });
    // Some launches (tapping the installed icon / following a link) carry activation —
    // try once immediately; harmless if the browser declines.
    request();

    const opts = { capture: true } as EventListenerOptions;
    return () => {
      window.removeEventListener("pointerdown", onGesture, opts);
      window.removeEventListener("keydown", onGesture, opts);
    };
  }, []);

  return null;
}
