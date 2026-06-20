"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, RotateCcw, LogOut } from "lucide-react";
import type { useKiosk } from "./useKiosk";
import { HomeView } from "./HomeView";
import { ChildView } from "./ChildView";
import { CalendarView } from "./CalendarView";
import { ListsView } from "./ListsView";
import { CalmCorner } from "./CalmCorner";
import { ParentGate } from "./ParentGate";
import { Screensaver, SleepMode } from "./Screensaver";
import { cn } from "@/lib/cn";

function inQuietHours(start?: string, end?: string, d = new Date()): boolean {
  if (!start || !end) return false;
  const cur = d.getHours() * 60 + d.getMinutes();
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const s = sh * 60 + sm;
  const e = eh * 60 + em;
  if (s === e) return false;
  return s < e ? cur >= s && cur < e : cur >= s || cur < e; // handles overnight
}

type Kiosk = ReturnType<typeof useKiosk>;
type View =
  | { k: "home" }
  | { k: "calendar" }
  | { k: "lists" }
  | { k: "child"; id: string };

export function KioskShell({ kiosk }: { kiosk: Kiosk }) {
  const { state } = kiosk;
  const [view, setView] = useState<View>({ k: "home" });
  const [calmOpen, setCalmOpen] = useState(false);
  const [gate, setGate] = useState(false);
  const [menu, setMenu] = useState(false);
  const [asleep, setAsleep] = useState(false);
  const [, setTick] = useState(0);
  const lastActivity = useRef(Date.now());

  const settings = (state?.snapshot.household.settings ?? {}) as Record<string, unknown>;
  const idleMs = ((settings.idleSeconds as number) || 120) * 1000;
  const screensaverOn = settings.screensaver !== false;
  const quietStart = settings.quietStart as string | undefined;
  const quietEnd = settings.quietEnd as string | undefined;
  const photos =
    (settings.homePhotos as string[] | undefined)?.length
      ? (settings.homePhotos as string[])
      : typeof settings.homePhotoUrl === "string" && settings.homePhotoUrl
        ? [settings.homePhotoUrl as string]
        : [];
  const quietConfigured = Boolean(quietStart && quietEnd);
  const sleepEnabled = screensaverOn || quietConfigured;

  // If the current child was removed via sync, fall back Home.
  useEffect(() => {
    if (view.k === "child" && state && !state.snapshot.children.some((c) => c.id === view.id)) {
      setView({ k: "home" });
    }
  }, [view, state]);

  // Re-evaluate quiet hours roughly each minute.
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Idle → return Home and show the screensaver / sleep mode. Any input wakes it.
  useEffect(() => {
    if (!sleepEnabled) return;
    const onActivity = () => {
      lastActivity.current = Date.now();
      if (asleep) setAsleep(false);
    };
    window.addEventListener("pointerdown", onActivity);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("touchstart", onActivity, { passive: true });
    const id = window.setInterval(() => {
      if (Date.now() - lastActivity.current > idleMs) {
        setAsleep(true);
        setView({ k: "home" });
        setCalmOpen(false);
        setMenu(false);
        setGate(false);
      }
    }, 5000);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("touchstart", onActivity);
    };
  }, [sleepEnabled, idleMs, asleep]);

  if (!state) return null;

  const children = state.snapshot.children;
  // Resolve a child for calm-corner check-ins (the active child, else the first).
  const activeChildId = view.k === "child" ? view.id : children[0]?.id ?? "";

  return (
    <div className="min-h-full">
      {view.k === "home" && (
        <HomeView
          kiosk={kiosk}
          onSelectChild={(id) => setView({ k: "child", id })}
          onOpenCalendar={() => setView({ k: "calendar" })}
          onOpenLists={() => setView({ k: "lists" })}
          onOpenCalm={() => setCalmOpen(true)}
          onParentMenu={() => setGate(true)}
        />
      )}
      {view.k === "child" && (
        <ChildView
          kiosk={kiosk}
          childId={view.id}
          onHome={() => setView({ k: "home" })}
          onOpenCalm={() => setCalmOpen(true)}
        />
      )}
      {view.k === "calendar" && (
        <CalendarView kiosk={kiosk} onHome={() => setView({ k: "home" })} />
      )}
      {view.k === "lists" && (
        <ListsView kiosk={kiosk} onHome={() => setView({ k: "home" })} />
      )}

      {calmOpen && (
        <CalmCorner
          tools={state.snapshot.calm_tools}
          onCheckIn={(f) => activeChildId && kiosk.checkIn(activeChildId, f)}
          onClose={() => setCalmOpen(false)}
        />
      )}

      {gate && (
        <ParentGate
          verify={kiosk.verifyPin}
          onSuccess={() => {
            setGate(false);
            setMenu(true);
          }}
          onCancel={() => setGate(false)}
        />
      )}

      {menu && <ParentMenu kiosk={kiosk} onClose={() => setMenu(false)} />}

      {asleep && inQuietHours(quietStart, quietEnd) ? (
        <SleepMode onWake={() => setAsleep(false)} />
      ) : asleep && screensaverOn ? (
        <Screensaver photos={photos} onWake={() => setAsleep(false)} />
      ) : null}
    </div>
  );
}

const SYNC_LABEL: Record<string, string> = {
  idle: "",
  syncing: "Syncing…",
  ok: "Backed up to the cloud",
  error: "Sync hiccup — will retry automatically",
  offline: "Offline — the wall keeps working",
  "no-plus": "Local only · Harbor Plus adds cloud backup",
};

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "";
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.round(hrs / 24)} d ago`;
}

function ParentMenu({ kiosk, onClose }: { kiosk: Kiosk; onClose: () => void }) {
  const [confirmUnpair, setConfirmUnpair] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const children = kiosk.state?.snapshot.children ?? [];
  const syncText = SYNC_LABEL[kiosk.syncStatus] ?? "";
  const lastSync = relativeTime(kiosk.lastSync);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 sm:rounded-3xl">
        <h2 className="font-display text-xl font-extrabold text-harbor">Parent menu</h2>
        <p className="mt-1 text-sm text-muted">
          {syncText || (kiosk.online ? "Online" : "Offline — the wall keeps working")}
          {lastSync ? ` · last synced ${lastSync}` : ""}
        </p>

        <div className="mt-5 space-y-2">
          {!confirmReset ? (
            <MenuRow
              icon={RotateCcw}
              label="Reset all kids' checkmarks for today"
              onClick={() => setConfirmReset(true)}
            />
          ) : (
            <button
              onClick={() => {
                children.forEach((c) => kiosk.resetDay(c.id));
                setConfirmReset(false);
              }}
              className="kiosk-tap w-full rounded-2xl bg-amber-500 py-4 font-bold text-white"
            >
              Tap again to reset today for everyone
            </button>
          )}
          <MenuRow
            icon={RefreshCw}
            label={kiosk.syncStatus === "syncing" ? "Syncing…" : "Sync now"}
            onClick={() => void kiosk.syncNow()}
          />
          {!confirmUnpair ? (
            <MenuRow icon={LogOut} label="Unpair this device" danger onClick={() => setConfirmUnpair(true)} />
          ) : (
            <button
              onClick={() => void kiosk.unpair()}
              className="kiosk-tap w-full rounded-2xl bg-red-600 py-4 font-bold text-white"
            >
              Tap again to confirm unpair
            </button>
          )}
        </div>

        <button onClick={onClose} className="kiosk-tap mt-5 w-full rounded-2xl bg-harbor py-4 font-bold text-white">
          Done
        </button>
      </div>
    </div>
  );
}

function MenuRow({
  icon: Icon,
  label,
  onClick,
  danger = false,
}: {
  icon: typeof RefreshCw;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "kiosk-tap flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left font-semibold",
        danger ? "bg-red-50 text-red-700" : "bg-harbor-50 text-harbor",
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}
