"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Check, Send, Share, Plus, ShieldAlert } from "lucide-react";
import { pushSupported, isIOS, isStandalone, enablePush, disablePush } from "@/lib/notifications/client";
import {
  registerPushSubscription,
  unregisterPushSubscription,
  saveNotificationPrefs,
  sendTestNotification,
} from "@/app/app/(parent)/notification-actions";
import { CATEGORY_LABEL, CATEGORY_DESC, VISIBLE_CATEGORIES, NOTIF_PRESETS, type NotifPrefs, type DetailLevel } from "@/lib/notifications/prefs";
import { Toggle } from "@/components/ui/Toggle";
import { ChipGroup } from "@/components/ui/Chips";
import { Input } from "@/components/ui/primitives";
import { useQuickAction } from "@/components/ui/useQuickAction";
import { Disclosure } from "@/components/app/Disclosure";
import { cn } from "@/lib/cn";

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
  const { run } = useQuickAction();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      // Fire a real push immediately so they SEE it land — instant proof it works.
      try {
        await sendTestNotification();
        setTested(true);
        window.setTimeout(() => setTested(false), 4000);
      } catch {
        /* the manual test button remains available */
      }
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
  // Every change saves itself a moment later — no Save button to forget.
  function change(next: NotifPrefs) {
    setPrefs(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      run(
        async () => {
          await saveNotificationPrefs(next);
          return { ok: true } as const;
        },
        { success: "Saved" },
      );
    }, 600);
  }
  const preset =
    NOTIF_PRESETS.find((p) => VISIBLE_CATEGORIES.every((c) => prefs.categories[c] === (c === "distress" || p.on.includes(c))))?.key ?? "custom";
  function applyPreset(key: string) {
    const p = NOTIF_PRESETS.find((x) => x.key === key);
    if (!p) return;
    const categories = { ...prefs.categories };
    for (const c of VISIBLE_CATEGORIES) categories[c] = c === "distress" || p.on.includes(c);
    change({ ...prefs, categories });
  }

  const needsInstall = caps.ios && !caps.standalone;

  return (
    <div className="space-y-5">
      {/* Enable / status */}
      <div>
        {!caps.supported ? (
          <p className="text-sm text-fg-muted">This browser doesn&apos;t support notifications. You&apos;ll still see everything in your notification center.</p>
        ) : needsInstall ? (
          <div className="rounded-xl bg-surface-2 p-3.5 text-sm text-fg">
            <p className="font-semibold text-fg">Add Harbor to your Home Screen to get alerts</p>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-fg-muted">
              Tap <Share className="inline h-4 w-4" /> Share, then <Plus className="inline h-4 w-4" /> <span className="font-medium">Add to Home Screen</span> — then open Harbor from your Home Screen and come back here.
            </p>
          </div>
        ) : perm === "denied" ? (
          <div className="flex items-start gap-2.5 rounded-xl bg-beacon/10 p-3.5 text-sm">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-beacon" />
            <p className="text-fg">
              Notifications are blocked. {caps.ios ? "On iPhone, remove Harbor from your Home Screen and add it again to re-enable." : "Turn them back on in your browser's site settings."} You’ll still see everything in your notification center.
            </p>
          </div>
        ) : subscribed ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/12 px-3 py-1.5 text-sm font-semibold text-fg">
              <Bell className="h-4 w-4" /> Notifications on for this device
            </span>
            <button type="button" onClick={onDisable} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-fg-muted hover:bg-surface-2">
              <BellOff className="h-4 w-4" /> Turn off
            </button>
          </div>
        ) : (
          <button type="button" onClick={onEnable} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 font-display font-extrabold text-accent-fg transition active:scale-[0.98] disabled:opacity-60">
            <Bell className="h-5 w-5" /> Enable notifications
          </button>
        )}
        {!pushConfigured && caps.supported && (
          <p className="mt-2 text-xs text-fg-muted">Push isn&apos;t fully set up on the server yet — alerts still land in your notification center below.</p>
        )}
      </div>

      {/* Test */}
      {(subscribed || !pushConfigured) && caps.supported && (
        <button type="button" onClick={onTest} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-sm font-semibold text-fg ring-1 ring-line hover:bg-surface-2 disabled:opacity-60">
          {tested ? <Check className="h-4 w-4 text-accent" /> : <Send className="h-4 w-4" />} {tested ? "Sent — check your notification center" : "Send a test notification"}
        </button>
      )}

      {/* Preferences — three simple choices, the details behind "Customize" */}
      <div className="border-t border-line pt-4">
        <p className="mb-2.5 text-[15px] font-semibold text-fg">What should reach your phone?</p>
        <div className="flex flex-col gap-2">
          {NOTIF_PRESETS.map((p) => {
            const on = preset === p.key;
            return (
              <button
                key={p.key}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => applyPreset(p.key)}
                className={cn(
                  "flex min-h-12 items-center gap-3 rounded-xl border px-4 text-left text-[15px] font-semibold transition",
                  on ? "border-accent bg-accent/12 text-fg" : "border-line text-fg-muted hover:border-accent/50 hover:text-fg",
                )}
              >
                <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border-2", on ? "border-accent" : "border-line-strong")}>
                  {on && <span className="h-2.5 w-2.5 rounded-full bg-accent" />}
                </span>
                {p.label}
              </button>
            );
          })}
          {preset === "custom" && <p className="px-1 text-sm text-fg-muted">You&apos;ve picked your own mix below.</p>}
        </div>

        <div className="mt-4 rounded-xl border border-line">
          <Disclosure summary={<span className="text-[15px] font-semibold text-fg">Customize</span>} bodyClassName="space-y-1 px-4 pb-4">
            {VISIBLE_CATEGORIES.map((c) =>
              c === "distress" ? (
                <div key={c} className="flex min-h-11 items-center justify-between gap-3 py-1">
                  <span className="min-w-0">
                    <span className="block text-[15px] font-medium text-fg">{CATEGORY_LABEL[c]}</span>
                    <span className="block text-sm text-fg-muted">{CATEGORY_DESC[c]}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-accent/12 px-2.5 py-1 text-xs font-semibold text-fg">Always on</span>
                </div>
              ) : (
                <Toggle
                  key={c}
                  checked={prefs.categories[c]}
                  onChange={(v) => change({ ...prefs, categories: { ...prefs.categories, [c]: v } })}
                  label={CATEGORY_LABEL[c]}
                  hint={CATEGORY_DESC[c]}
                  className="py-1"
                />
              ),
            )}
          </Disclosure>
        </div>

        <div className="mt-4 rounded-xl border border-line px-3.5">
          <Toggle
            checked={prefs.quietHours.enabled}
            onChange={(v) => change({ ...prefs, quietHours: { ...prefs.quietHours, enabled: v } })}
            label="Quiet overnight"
            hint="Hold everyday alerts until morning"
            className="py-1"
          />
          {prefs.quietHours.enabled && (
            <div className="space-y-3 pb-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm text-fg-muted">
                  From
                  <Input type="time" value={prefs.quietHours.start} onChange={(e) => change({ ...prefs, quietHours: { ...prefs.quietHours, start: e.target.value } })} className="mt-1" />
                </label>
                <label className="text-sm text-fg-muted">
                  Until
                  <Input type="time" value={prefs.quietHours.end} onChange={(e) => change({ ...prefs, quietHours: { ...prefs.quietHours, end: e.target.value } })} className="mt-1" />
                </label>
              </div>
              <Toggle
                checked={prefs.quietHours.allowCritical}
                onChange={(v) => change({ ...prefs, quietHours: { ...prefs.quietHours, allowCritical: v } })}
                label="Still tell me if a child needs me"
              />
            </div>
          )}
        </div>

        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-fg">On the lock screen, show</p>
          <ChipGroup
            ariaLabel="Lock screen detail"
            value={prefs.detailLevel}
            onChange={(v) => v[0] && change({ ...prefs, detailLevel: v[0] as DetailLevel })}
            options={[
              { value: "full", label: "Everything" },
              { value: "names", label: "Names only" },
              { value: "discreet", label: "Nothing personal" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
