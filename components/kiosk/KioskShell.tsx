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
import { Screensaver } from "./Screensaver";
import { cn } from "@/lib/cn";

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
  const lastActivity = useRef(Date.now());

  const settings = (state?.snapshot.household.settings ?? {}) as Record<string, unknown>;
  const idleMs = ((settings.idleSeconds as number) || 120) * 1000;
  const screensaverOn = settings.screensaver !== false;
  const photoUrl = typeof settings.homePhotoUrl === "string" ? (settings.homePhotoUrl as string) : null;

  // If the current child was removed via sync, fall back Home.
  useEffect(() => {
    if (view.k === "child" && state && !state.snapshot.children.some((c) => c.id === view.id)) {
      setView({ k: "home" });
    }
  }, [view, state]);

  // Idle → return Home and show the screensaver. Any input wakes it.
  useEffect(() => {
    if (!screensaverOn) return;
    const onActivity = () => {
      lastActivity.current = Date.now();
      if (asleep) setAsleep(false);
    };
    window.addEventListener("pointerdown", onActivity);
    window.addEventListener("keydown", onActivity);
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
    };
  }, [screensaverOn, idleMs, asleep]);

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

      {asleep && screensaverOn && (
        <Screensaver photoUrl={photoUrl} onWake={() => setAsleep(false)} />
      )}
    </div>
  );
}

function ParentMenu({ kiosk, onClose }: { kiosk: Kiosk; onClose: () => void }) {
  const [confirmUnpair, setConfirmUnpair] = useState(false);
  const children = kiosk.state?.snapshot.children ?? [];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 sm:rounded-3xl">
        <h2 className="font-display text-xl font-extrabold text-harbor">Parent menu</h2>
        <p className="mt-1 text-sm text-muted">{kiosk.online ? "Online" : "Offline — the wall keeps working"}</p>

        <div className="mt-5 space-y-2">
          <MenuRow
            icon={RotateCcw}
            label="Reset today's checkmarks"
            onClick={() => children.forEach((c) => kiosk.resetDay(c.id))}
          />
          <MenuRow icon={RefreshCw} label="Sync now" onClick={() => void kiosk.syncNow()} />
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
