"use client";

import { useEffect, useState } from "react";
import { Bell, X, Share, Plus } from "lucide-react";
import { pushSupported, isIOS, isStandalone, enablePush } from "@/lib/notifications/client";
import { registerPushSubscription, sendTestNotification } from "@/app/app/(parent)/notification-actions";

const DISMISS_KEY = "harbor-notif-prompt-dismissed";
const SNOOZE_DAYS = 5;

/** A natural, app-like "turn on notifications" soft-ask. Appears once the parent has been
 *  in the app a beat (not instantly on first paint), only when notifications are supported
 *  and not yet enabled/denied. Tapping Enable triggers the real OS prompt (the tap is the
 *  required user gesture) and subscribes; on iOS-in-Safari it shows the Add-to-Home-Screen
 *  step instead (push needs the installed PWA). Dismiss snoozes it for a few days. */
export function NotificationPrompt({ vapidKey }: { vapidKey?: string }) {
  const [show, setShow] = useState(false);
  const [iosInstall, setIosInstall] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pushSupported() || !vapidKey) return;
    if (typeof Notification !== "undefined" && Notification.permission !== "default") return; // granted or denied → nothing to ask
    const snoozed = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (snoozed && Date.now() - snoozed < SNOOZE_DAYS * 86_400_000) return;
    const ios = isIOS();
    setIosInstall(ios && !isStandalone());
    // A short delay so it feels like an app nudging you, not a wall on entry.
    const t = window.setTimeout(() => setShow(true), 1400);
    return () => window.clearTimeout(t);
  }, [vapidKey]);

  function snooze() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  }

  async function enable() {
    if (!vapidKey) return;
    setBusy(true);
    const res = await enablePush(vapidKey);
    if (res.ok) {
      await registerPushSubscription(res.sub);
      try {
        await sendTestNotification();
      } catch {
        /* ignore */
      }
    }
    setBusy(false);
    // Whether granted or denied, the OS state now settles it — don't nag again.
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="animate-sheet-up fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom)+4.5rem)] lg:bottom-4 lg:left-auto lg:right-4 lg:w-96 lg:pb-0">
      <div className="mx-auto max-w-md rounded-2xl border border-line bg-surface p-4 shadow-pop lg:mx-0">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <Bell className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            {iosInstall ? (
              <>
                <p className="text-title text-fg">Get Harbor on your Home Screen</p>
                <p className="mt-1 flex flex-wrap items-center gap-1 text-sm text-fg-muted">
                  Tap <Share className="inline h-4 w-4" /> then <Plus className="inline h-4 w-4" />
                  <span className="font-medium text-fg">Add to Home Screen</span> — then open Harbor from there to turn on alerts.
                </p>
                <button
                  onClick={snooze}
                  className="mt-3 rounded-lg px-3 py-1.5 text-sm font-semibold text-fg-muted transition hover:bg-surface-2"
                >
                  Got it
                </button>
              </>
            ) : (
              <>
                <p className="text-title text-fg">Turn on notifications</p>
                <p className="mt-1 text-sm text-fg-muted">
                  Event reminders, a daily summary, approvals, and the moment your child needs you — right on your phone.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={enable}
                    disabled={busy}
                    className="tap inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-fg shadow-button transition hover:brightness-110 disabled:opacity-60"
                  >
                    <Bell className="h-4 w-4" /> {busy ? "Turning on…" : "Enable"}
                  </button>
                  <button
                    onClick={snooze}
                    className="rounded-xl px-3 py-2 text-sm font-semibold text-fg-muted transition hover:bg-surface-2"
                  >
                    Not now
                  </button>
                </div>
              </>
            )}
          </div>
          <button onClick={snooze} aria-label="Dismiss" className="shrink-0 rounded-full p-1.5 text-fg-subtle transition hover:bg-surface-2 hover:text-fg">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
