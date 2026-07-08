"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Check, Send, Share, Plus, ShieldAlert } from "lucide-react";
import { pushSupported, isIOS, isStandalone, enablePush, disablePush } from "@/lib/notifications/client";
import {
  registerPushSubscription,
  unregisterPushSubscription,
  saveNotificationPrefs,
  sendTestNotification,
} from "@/app/app/(parent)/notification-actions";
import { CATEGORY_LABEL, CATEGORY_DESC, CATEGORY_ORDER, type NotifPrefs, type DetailLevel } from "@/lib/notifications/prefs";
import { cn } from "@/lib/cn";

const CATS = CATEGORY_ORDER;

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", on ? "bg-water" : "bg-harbor-100")}
    >
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

export function NotificationsCard({
  pushConfigured,
  vapidPublicKey,
  initialPrefs,
}: {
  pushConfigured: boolean;
  vapidPublicKey: string;
  initialPrefs: NotifPrefs;
}) {
  const [caps, setCaps] = useState({ supported: true, ios: false, standalone: true });
  const [perm, setPerm] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tested, setTested] = useState(false);
  const [prefs, setPrefs] = useState<NotifPrefs>(initialPrefs);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // All async (after an await) so we never call setState synchronously in the effect body.
    (async () => {
      let sub = false;
      try {
        const reg = await navigator.serviceWorker?.getRegistration("/app");
        sub = !!(await reg?.pushManager.getSubscription());
      } catch {
        /* ignore */
      }
      setCaps({ supported: pushSupported(), ios: isIOS(), standalone: isStandalone() });
      setPerm(typeof Notification !== "undefined" ? Notification.permission : "default");
      setSubscribed(sub);
    })();
  }, []);

  async function onEnable() {
    setBusy(true);
    const res = await enablePush(vapidPublicKey);
    if (res.ok) {
      await registerPushSubscription(res.sub);
      setSubscribed(true);
      setPerm("granted");
    } else if (res.reason === "denied") {
      setPerm("denied");
    }
    setBusy(false);
  }
  async function onDisable() {
    setBusy(true);
    const ep = await disablePush();
    if (ep) await unregisterPushSubscription(ep);
    setSubscribed(false);
    setBusy(false);
  }
  async function onTest() {
    setBusy(true);
    await sendTestNotification();
    setTested(true);
    setBusy(false);
    window.setTimeout(() => setTested(false), 4000);
  }
  function patch(p: Partial<NotifPrefs>) {
    setPrefs((cur) => ({ ...cur, ...p }));
    setSaved(false);
  }
  async function onSave() {
    setBusy(true);
    await saveNotificationPrefs(prefs);
    setBusy(false);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
  }

  const needsInstall = caps.ios && !caps.standalone;

  return (
    <div className="space-y-5">
      {/* Enable / status */}
      <div>
        {!caps.supported ? (
          <p className="text-sm text-muted">This browser doesn&apos;t support notifications. You&apos;ll still see everything in your notification center.</p>
        ) : needsInstall ? (
          <div className="rounded-xl bg-harbor-50 p-3.5 text-sm text-ink">
            <p className="font-semibold text-harbor">Add Harbor to your Home Screen to get alerts</p>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-muted">
              Tap <Share className="inline h-4 w-4" /> Share, then <Plus className="inline h-4 w-4" /> <span className="font-medium">Add to Home Screen</span> — then open Harbor from your Home Screen and come back here.
            </p>
          </div>
        ) : perm === "denied" ? (
          <div className="flex items-start gap-2.5 rounded-xl bg-beacon-soft p-3.5 text-sm">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-beacon" />
            <p className="text-ink">
              Notifications are blocked. {caps.ios ? "On iPhone, remove Harbor from your Home Screen and add it again to re-enable." : "Turn them back on in your browser's site settings."} You&apos;ll still see everything in your notification center.
            </p>
          </div>
        ) : subscribed ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-seafoam px-3 py-1.5 text-sm font-semibold text-harbor">
              <Bell className="h-4 w-4" /> Notifications on for this device
            </span>
            <button type="button" onClick={onDisable} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-muted hover:bg-harbor-50">
              <BellOff className="h-4 w-4" /> Turn off
            </button>
          </div>
        ) : (
          <button type="button" onClick={onEnable} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-harbor px-5 py-2.5 font-display font-extrabold text-white transition active:scale-[0.98] disabled:opacity-60">
            <Bell className="h-5 w-5" /> Enable notifications
          </button>
        )}
        {!pushConfigured && caps.supported && (
          <p className="mt-2 text-xs text-muted">Push isn&apos;t fully set up on the server yet — alerts still land in your notification center below.</p>
        )}
      </div>

      {/* Test */}
      {(subscribed || !pushConfigured) && caps.supported && (
        <button type="button" onClick={onTest} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-harbor ring-1 ring-harbor-100 hover:bg-harbor-50 disabled:opacity-60">
          {tested ? <Check className="h-4 w-4 text-water" /> : <Send className="h-4 w-4" />} {tested ? "Sent — check your notification center" : "Send a test notification"}
        </button>
      )}

      {/* Preferences */}
      <div className="border-t border-harbor-100 pt-4">
        <p className="mb-3 text-sm font-semibold text-harbor">What to tell you about</p>
        <div className="space-y-3">
          {CATS.map((c) => (
            <div key={c} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{CATEGORY_LABEL[c]}</p>
                <p className="text-xs text-muted">{CATEGORY_DESC[c]}</p>
              </div>
              {c === "distress" ? (
                // Safety: a "your child needs you" alert always reaches you — it can't be turned off.
                <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-seafoam px-2.5 py-1 text-xs font-semibold text-harbor">Always on</span>
              ) : (
                <div className="mt-0.5">
                  <Toggle
                    label={CATEGORY_LABEL[c]}
                    on={prefs.categories[c]}
                    onChange={(v) => patch({ categories: { ...prefs.categories, [c]: v } })}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm text-ink">Quiet hours (hold non-urgent alerts overnight)</span>
            <Toggle label="Quiet hours" on={prefs.quietHours.enabled} onChange={(v) => patch({ quietHours: { ...prefs.quietHours, enabled: v } })} />
          </label>
          {prefs.quietHours.enabled && (
            <div className="flex flex-wrap items-center gap-2 pl-1 text-sm text-muted">
              <span>From</span>
              <input type="time" value={prefs.quietHours.start} onChange={(e) => patch({ quietHours: { ...prefs.quietHours, start: e.target.value } })} className="rounded-lg border border-harbor-100 px-2 py-1 text-ink" />
              <span>to</span>
              <input type="time" value={prefs.quietHours.end} onChange={(e) => patch({ quietHours: { ...prefs.quietHours, end: e.target.value } })} className="rounded-lg border border-harbor-100 px-2 py-1 text-ink" />
              <label className="ml-1 flex items-center gap-1.5">
                <input type="checkbox" checked={prefs.quietHours.allowCritical} onChange={(e) => patch({ quietHours: { ...prefs.quietHours, allowCritical: e.target.checked } })} className="h-4 w-4 rounded" />
                let &quot;needs you&quot; through
              </label>
            </div>
          )}

          <label className="flex items-center justify-between gap-3">
            <span className="text-sm text-ink">Lock-screen detail</span>
            <select
              value={prefs.detailLevel}
              onChange={(e) => patch({ detailLevel: e.target.value as DetailLevel })}
              className="rounded-lg border border-harbor-100 bg-white px-2 py-1.5 text-sm text-ink"
            >
              <option value="full">Full (&quot;Cade finished his morning&quot;)</option>
              <option value="names">Names only (&quot;Cade needs you&quot;)</option>
              <option value="discreet">Discreet (&quot;Harbor: you have an update&quot;)</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button type="button" onClick={onSave} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-harbor px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            Save preferences
          </button>
          {saved && <span className="inline-flex items-center gap-1 text-sm font-semibold text-water"><Check className="h-4 w-4" /> Saved</span>}
        </div>
      </div>
    </div>
  );
}
