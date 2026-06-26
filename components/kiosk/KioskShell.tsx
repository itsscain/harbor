"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, RotateCcw, LogOut, Star, ArrowLeft, Heart } from "lucide-react";
import type { useKiosk } from "./useKiosk";
import { FamilyView } from "./FamilyView";
import { ChildView } from "./ChildView";
import { CalendarView } from "./CalendarView";
import { ListsView } from "./ListsView";
import { ChoresView } from "./ChoresBoard";
import { CalmCorner } from "./CalmCorner";
import { ParentGate } from "./ParentGate";
import { Screensaver, SleepMode } from "./Screensaver";
import { VoiceButton } from "./VoiceButton";
import { HouseRules } from "./HouseRules";
import { LivingAmbient } from "./LivingAmbient";
import { BeaconLight } from "./BeaconLight";
import { Pressable } from "./Pressable";
import { KButton, KCard } from "./ui";
import { childColor } from "@/lib/kiosk/colors";
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
  | { k: "chores" }
  | { k: "child"; id: string; anchor?: boolean };

export function KioskShell({ kiosk }: { kiosk: Kiosk }) {
  const { state } = kiosk;
  const [view, setView] = useState<View>({ k: "home" });
  const [calmOpen, setCalmOpen] = useState(false);
  const [houseRulesOpen, setHouseRulesOpen] = useState(false);
  const [gate, setGate] = useState(false);
  const [menu, setMenu] = useState(false);
  const [asleep, setAsleep] = useState(false);
  // True while a child's Anchor session is open — ducks the ambient depth layers and
  // blocks idle sleep so co-regulation is never interrupted (§9.1).
  const [anchorActive, setAnchorActive] = useState(false);
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
      const idle = Date.now() - lastActivity.current > idleMs;
      // Never sleep mid-Anchor — co-regulation completes first (§9.1).
      if (anchorActive) return;
      // Only "sleep" when something will actually render (screensaver on, or in
      // quiet hours), so we never blank to nothing.
      if (idle && (screensaverOn || inQuietHours(quietStart, quietEnd))) {
        setAsleep(true);
        setView({ k: "home" });
        setCalmOpen(false);
        setHouseRulesOpen(false);
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
  }, [sleepEnabled, idleMs, asleep, anchorActive]);

  if (!state) return null;

  const children = state.snapshot.children;
  // Resolve a child for calm-corner check-ins (the active child, else the first).
  const activeChildId = view.k === "child" ? view.id : children[0]?.id ?? "";
  // The Beacon tints to the active child's accent while their screen is open.
  const activeChild = view.k === "child" ? children.find((c) => c.id === view.id) : null;
  const activeAccent = activeChild ? childColor(activeChild) : null;

  const SECONDARY_TITLE: Record<string, string> = { calendar: "Calendar", lists: "Lists", chores: "Chores" };
  const isSecondary = view.k === "calendar" || view.k === "lists" || view.k === "chores";

  return (
    <div className="min-h-full">
      {/* Harbor Depth — fixed material layers behind all content (§3). Duck during
          Anchor so the world quiets while a child co-regulates (§9.1). */}
      <div className={cn("transition-opacity duration-700 ease-[var(--ease-harbor-calm)]", anchorActive && "opacity-30")}>
        <LivingAmbient />
        <BeaconLight accent={activeAccent} active={view.k === "child"} />
        <div className="grain-overlay" aria-hidden />
      </div>

      <div className="relative z-10">
      {/* Adaptive top bar — secondary surfaces get a ← Harbor home (§4.2) */}
      {isSecondary && (
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-kline/50 bg-kbg2/80 px-4 py-3 backdrop-blur-md">
          <Pressable
            haptics
            onClick={() => setView({ k: "home" })}
            aria-label="Back to Harbor"
            className="kiosk-tap flex items-center gap-2 rounded-xl bg-kpanel px-3.5 py-2 font-semibold text-ktext ring-1 ring-kline/55"
          >
            <ArrowLeft className="h-5 w-5" /> Harbor
          </Pressable>
          <h1 className="font-display text-lg font-bold text-ktext">{SECONDARY_TITLE[view.k]}</h1>
        </div>
      )}
      {view.k === "home" && (
        <FamilyView
          kiosk={kiosk}
          onSelectChild={(id) => setView({ k: "child", id })}
          onOpenCalendar={() => setView({ k: "calendar" })}
          onOpenChores={() => setView({ k: "chores" })}
          onOpenLists={() => setView({ k: "lists" })}
          onOpenHouseRules={() => setHouseRulesOpen(true)}
          onParentMenu={() => setGate(true)}
        />
      )}
      {view.k === "child" && (
        <ChildView
          key={view.id + (view.anchor ? "-anchor" : "")}
          kiosk={kiosk}
          childId={view.id}
          onHome={() => setView({ k: "home" })}
          onOpenCalm={() => setCalmOpen(true)}
          onAnchorActive={setAnchorActive}
          autoAnchor={view.anchor}
        />
      )}
      {view.k === "calendar" && (
        <CalendarView kiosk={kiosk} onHome={() => setView({ k: "home" })} />
      )}
      {view.k === "lists" && (
        <ListsView kiosk={kiosk} onHome={() => setView({ k: "home" })} />
      )}
      {view.k === "chores" && (
        <ChoresView kiosk={kiosk} onSelectChild={(id) => setView({ k: "child", id })} />
      )}

      {calmOpen && (
        <CalmCorner
          tools={state.snapshot.calm_tools}
          onCheckIn={(f) => activeChildId && kiosk.checkIn(activeChildId, f)}
          onClose={() => setCalmOpen(false)}
        />
      )}

      {houseRulesOpen && (
        <HouseRules rules={state.snapshot.house_rules ?? []} onClose={() => setHouseRulesOpen(false)} />
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

      {menu && (
        <ParentMenu
          kiosk={kiosk}
          onClose={() => setMenu(false)}
          onQuickAnchor={(id) => {
            setMenu(false);
            setView({ k: "child", id, anchor: true });
          }}
        />
      )}

      {!asleep && !gate && !menu && state.deviceSecret && (
        <VoiceButton deviceSecret={state.deviceSecret} onActed={() => void kiosk.syncNow()} />
      )}

      {asleep && inQuietHours(quietStart, quietEnd) ? (
        <SleepMode onWake={() => setAsleep(false)} />
      ) : asleep && screensaverOn ? (
        <Screensaver
          kiosk={kiosk}
          photos={photos}
          onWake={() => setAsleep(false)}
          onSelectChild={(id) => {
            setAsleep(false);
            setView({ k: "child", id });
          }}
          deviceSecret={state.deviceSecret}
        />
      ) : null}
      </div>
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

function ParentMenu({
  kiosk,
  onClose,
  onQuickAnchor,
}: {
  kiosk: Kiosk;
  onClose: () => void;
  onQuickAnchor: (childId: string) => void;
}) {
  const [confirmUnpair, setConfirmUnpair] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmPoints, setConfirmPoints] = useState(false);
  const [pointsErr, setPointsErr] = useState(false);
  const [resettingPoints, setResettingPoints] = useState(false);
  const [anchorPick, setAnchorPick] = useState(false);
  const children = kiosk.state?.snapshot.children ?? [];
  const syncText = SYNC_LABEL[kiosk.syncStatus] ?? "";
  const lastSync = relativeTime(kiosk.lastSync);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <KCard className="w-full max-w-md rounded-b-none rounded-t-xl p-5 shadow-k-pop sm:rounded-xl">
        <h2 className="font-display text-2xl font-bold text-ktext">Parent menu</h2>
        <p className="mt-1 text-sm text-kmute">
          {syncText || (kiosk.online ? "Online" : "Offline — the wall keeps working")}
          {lastSync ? ` · last synced ${lastSync}` : ""}
        </p>

        <div className="mt-5 space-y-2.5">
          {!confirmReset ? (
            <MenuRow
              icon={RotateCcw}
              label="Reset all kids' checkmarks for today"
              onClick={() => setConfirmReset(true)}
            />
          ) : (
            <KButton
              variant="beacon"
              className="h-16 w-full"
              onClick={() => {
                children.forEach((c) => kiosk.resetDay(c.id));
                setConfirmReset(false);
              }}
            >
              Tap again to reset today for everyone
            </KButton>
          )}
          {!confirmPoints ? (
            <MenuRow
              icon={Star}
              label="Reset all points to zero"
              danger
              onClick={() => {
                setPointsErr(false);
                setConfirmPoints(true);
              }}
            />
          ) : (
            <KButton
              variant="danger"
              className="h-16 w-full"
              disabled={resettingPoints}
              onClick={async () => {
                if (resettingPoints) return;
                setResettingPoints(true);
                const ok = await kiosk.resetPoints();
                setResettingPoints(false);
                setConfirmPoints(false);
                setPointsErr(!ok);
              }}
            >
              {resettingPoints ? "Resetting…" : "Tap again to zero everyone's points"}
            </KButton>
          )}
          {pointsErr && (
            <p className="px-1 text-sm text-red-300">Couldn&apos;t reset — connect to Wi-Fi and try again.</p>
          )}
          {/* Quick Anchor — start a calm session for a child in the moment (§11.2) */}
          {children.length > 0 && (
            !anchorPick ? (
              <MenuRow icon={Heart} label="Start an Anchor for a child" onClick={() => setAnchorPick(true)} />
            ) : (
              <div className="rounded-xl bg-kraise p-3">
                <p className="px-1 pb-2 text-sm font-semibold text-kmute">Start an Anchor for…</p>
                <div className="flex flex-wrap gap-2">
                  {children.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => onQuickAnchor(c.id)}
                      className="kiosk-tap rounded-xl px-4 py-2.5 font-semibold text-ktext ring-1 ring-kline/55"
                      style={{ background: `${childColor(c)}22` }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )
          )}
          <MenuRow
            icon={RefreshCw}
            label={kiosk.syncStatus === "syncing" ? "Syncing…" : "Refresh from cloud"}
            onClick={() => void kiosk.syncNow(true)}
          />
          {!confirmUnpair ? (
            <MenuRow icon={LogOut} label="Unpair this device" danger onClick={() => setConfirmUnpair(true)} />
          ) : (
            <KButton variant="danger" className="h-16 w-full" onClick={() => void kiosk.unpair()}>
              Tap again to confirm unpair
            </KButton>
          )}
        </div>

        <KButton variant="primary" size="lg" className="mt-5 w-full" onClick={onClose}>
          Done
        </KButton>
      </KCard>
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
        "kiosk-tap flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left font-semibold",
        danger ? "bg-red-500/10 text-red-300" : "bg-kraise text-ktext",
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}
