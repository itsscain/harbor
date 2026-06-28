"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadState,
  persistState,
  clearState,
  hashPin,
  todayKey,
} from "@/lib/kiosk/db";
import { pairDevice, syncNow } from "@/lib/kiosk/sync";
import { subscribeHousehold } from "@/lib/kiosk/realtime";
import { fetchDeviceState, nukeAndReload } from "@/lib/kiosk/deviceState";
import { captureError } from "@/lib/observability";
import { nextStreak } from "@/lib/kiosk/streak";
import { serviceDay, clockJumpedBack } from "@/lib/kiosk/time";
import { SKILL_THRESHOLD } from "@/lib/kiosk/skill";
import { createClient } from "@/lib/supabase/client";
import type {
  KioskState,
  KioskStep,
  KioskChore,
  KioskMedication,
  KioskStoreItem,
  KioskListItem,
} from "@/lib/kiosk/types";

export type KioskStatus = "loading" | "unpaired" | "ready" | "error";
export type SyncStatus = "idle" | "syncing" | "ok" | "error" | "offline" | "no-plus";

export function useKiosk() {
  const [state, setState] = useState<KioskState | null>(null);
  const [status, setStatus] = useState<KioskStatus>("loading");
  const [online, setOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  // Sync-health (Real-Time §8) — observable diagnostics for the Debug panel.
  const [realtimeStatus, setRealtimeStatus] = useState<string>("idle");
  const [lastNudgeAt, setLastNudgeAt] = useState<number | null>(null);
  const [lastPropagationMs, setLastPropagationMs] = useState<number | null>(null);
  // Device Management D3 — remote control surfaced from the parent's manager.
  const [identifyAt, setIdentifyAt] = useState<number | null>(null);
  const [deviceLabel, setDeviceLabel] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const stateRef = useRef<KioskState | null>(null);
  stateRef.current = state;

  // Initial load from IndexedDB. Never leave the wall stuck on the splash:
  // a storage failure surfaces a recoverable error, and a watchdog catches hangs.
  useEffect(() => {
    let mounted = true;
    const watchdog = setTimeout(() => {
      if (mounted) setStatus((st) => (st === "loading" ? "error" : st));
    }, 8000);
    loadState()
      .then((s) => {
        if (!mounted) return;
        setState(s);
        setStatus(s ? "ready" : "unpaired");
      })
      .catch(() => {
        if (mounted) setStatus("error");
      })
      .finally(() => clearTimeout(watchdog));
    return () => {
      mounted = false;
      clearTimeout(watchdog);
    };
  }, []);

  // Persist + update helper.
  const update = useCallback(
    (mutator: (s: KioskState) => KioskState) => {
      setState((prev) => {
        if (!prev) return prev;
        const next = mutator(prev);
        if (next !== prev) void persistState(next);
        return next;
      });
    },
    [],
  );

  // Clock-integrity watch (§1.2): track the wall clock and flag a backward jump as
  // suspect (real time never reverses — that's a kid changing the device clock to
  // re-earn). Cleared + re-anchored to server time on the next sync (applyPull).
  useEffect(() => {
    const tick = () =>
      update((s) => ({ ...s, lastSeenWall: Date.now(), clockSuspect: s.clockSuspect || clockJumpedBack(s) }));
    const id = window.setInterval(tick, 90_000);
    return () => window.clearInterval(id);
  }, [update]);

  // Background sync (no-op unless online + Plus). Daily use never needs this.
  // Reconciles against live state: mutations enqueued during the network await
  // are preserved (and their optimistic effects re-applied) so a tap mid-sync is
  // never lost.
  const runSync = useCallback(async (full = false) => {
    const before = stateRef.current;
    if (!before) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setSyncStatus("offline");
      return;
    }
    if (!before.snapshot.household.plus_active) {
      setSyncStatus("no-plus");
      return;
    }
    setSyncStatus("syncing");
    let synced: KioskState;
    try {
      synced = await syncNow(before, { full });
    } catch (e) {
      setSyncStatus("error");
      captureError(e, { area: "sync", full });
      return;
    }
    setSyncStatus("ok");
    if (synced === before) return; // nothing changed

    setState((prev) => {
      if (!prev) return prev;
      // Entries appended after sync began (update() appends to the end).
      const newEntries = prev.outbox.slice(before.outbox.length);

      const points = { ...synced.points };
      const listItems = [...(synced.snapshot.list_items ?? [])];
      for (const m of newEntries) {
        if (m.kind === "completion" || m.kind === "chore_done")
          points[m.child_id] = (points[m.child_id] ?? 0) + m.points;
        else if (m.kind === "redemption")
          points[m.child_id] = Math.max(0, (points[m.child_id] ?? 0) - m.points);
        else if (m.kind === "list_add") {
          if (!listItems.some((li) => li.id === m.client_id)) {
            const opt = (prev.snapshot.list_items ?? []).find((li) => li.id === m.client_id);
            if (opt) listItems.push(opt);
          }
        } else if (m.kind === "list_check") {
          const idx = listItems.findIndex((li) => li.id === m.id);
          if (idx >= 0) listItems[idx] = { ...listItems[idx], checked: m.checked };
        }
      }

      const merged: KioskState = {
        ...synced,
        outbox: newEntries,
        progress: prev.progress, // keep completions enqueued during the await
        points,
        snapshot: { ...synced.snapshot, list_items: listItems },
      };
      void persistState(merged);
      return merged;
    });
  }, []);

  useEffect(() => {
    const setOn = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) void runSync();
    };
    // Sync the moment the wall is looked at again (tab visible / window focused),
    // so a parent's edit on their phone shows up promptly instead of waiting a tick.
    const onWake = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      void runSync();
    };
    setOnline(navigator.onLine);
    window.addEventListener("online", setOn);
    window.addEventListener("offline", setOn);
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    void runSync(true); // boot: full reconcile so stale/orphaned cached rows self-heal
    const id = window.setInterval(runSync, 30_000);
    // Periodic full reconcile (cheap-enough, every ~13 min) so a long-running wall
    // prunes any stale cached rows without needing a reload.
    const fullId = window.setInterval(() => runSync(true), 13 * 60_000);
    return () => {
      window.removeEventListener("online", setOn);
      window.removeEventListener("offline", setOn);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
      window.clearInterval(id);
      window.clearInterval(fullId);
    };
  }, [runSync]);

  // Realtime nudge (Real-Time §4) — a parent's change reaches the wall in < 1s instead
  // of waiting for the 30s poll. Subscribe to the household's public, data-free topic;
  // on a nudge, debounce + delta-pull (the same authoritative path as the poll, so the
  // two can never diverge). The 30s poll + reconcile-on-wake remain the backstop.
  const householdId = state?.snapshot.household.id;
  const plusActive = state?.snapshot.household.plus_active ?? false;
  useEffect(() => {
    if (!householdId || !plusActive) return;
    let t: number | undefined;
    const nudge = (payload?: { at?: number }) => {
      const now = Date.now();
      setLastNudgeAt(now);
      // Edit→wall propagation (§8 freshness SLO). payload.at is server epoch seconds;
      // guard against device-clock skew so a bad clock can't show nonsense.
      if (payload?.at) {
        const ms = now - payload.at * 1000;
        if (ms >= 0 && ms < 60_000) setLastPropagationMs(ms);
      }
      window.clearTimeout(t);
      t = window.setTimeout(() => void runSync(), 400);
    };
    setRealtimeStatus("connecting");
    const unsub = subscribeHousehold(householdId, nudge, setRealtimeStatus);
    return () => {
      window.clearTimeout(t);
      setRealtimeStatus("idle");
      unsub();
    };
  }, [householdId, plusActive, runSync]);

  // Device check-in (Device Management D3) — report this build + last-seen and pop any
  // remote command the parent queued. NOT Plus-gated: device control (Remote Refresh,
  // Identify) must work for every paired wall, not just synced ones. Polls every 30s.
  const deviceSecret = state?.deviceSecret;
  useEffect(() => {
    if (!deviceSecret) return;
    let stopped = false;
    const check = async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      const ds = await fetchDeviceState(deviceSecret);
      if (stopped || !ds) return;
      setDeviceLabel(ds.device_label);
      setPaused(ds.paused === true);
      if (ds.command === "refresh") {
        void nukeAndReload(); // drops caches/SW + reloads to the latest build
        return;
      }
      if (ds.command === "identify") setIdentifyAt(Date.now());
    };
    void check();
    const id = window.setInterval(check, 30_000);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [deviceSecret]);

  // ── Setup / pairing ─────────────────────────────────────────────────────────
  const pair = useCallback(async (code: string) => {
    const res = await pairDevice(code);
    const points: Record<string, number> = {};
    for (const rw of res.snapshot.rewards) points[rw.child_id] = rw.points_total;
    const fresh: KioskState = {
      deviceSecret: res.device_secret,
      householdId: res.household_id,
      kind: res.kind ?? "wall",
      outpostChildId: res.child_id ?? null,
      snapshot: res.snapshot,
      // Adopt an account PIN set in the companion app, if any; otherwise the
      // installer sets a local PIN on the next screen.
      pinHash: res.snapshot.household.parent_pin_hash ?? null,
      lastSync: res.snapshot.server_time ?? null,
      points,
      progress: {},
      outbox: [],
    };
    await persistState(fresh);
    setState(fresh);
    setStatus("ready");
  }, []);

  const setPin = useCallback(
    async (pin: string) => {
      const pinHash = await hashPin(pin);
      update((s) => ({ ...s, pinHash }));
    },
    [update],
  );

  const verifyPin = useCallback(async (pin: string) => {
    const current = stateRef.current;
    if (!current?.pinHash) return true; // no PIN set yet → allow (setup)
    return (await hashPin(pin)) === current.pinHash;
  }, []);

  const unpair = useCallback(async () => {
    await clearState();
    setState(null);
    setStatus("unpaired");
  }, []);

  // ── Kid actions ─────────────────────────────────────────────────────────────
  const completeStep = useCallback(
    (childId: string, step: KioskStep) => {
      update((s) => {
        const today = todayKey();
        const prog =
          s.progress[childId]?.date === today
            ? s.progress[childId]
            : { date: today, completed: [] };
        if (prog.completed.includes(step.id)) return s; // one-way for the day
        const completed = [...prog.completed, step.id];
        const points = {
          ...s.points,
          [childId]: (s.points[childId] ?? 0) + step.reward_points,
        };
        // Skill Levels (§4.4): completing builds toward fading the next prompt. Advance
        // the streak once per TRUSTED day; at the threshold, fade one level + celebrate.
        // Compassionate — a missed day never demotes (the parent re-scaffolds manually).
        const day = serviceDay(s);
        const skill = { ...(s.skill ?? {}) };
        const key = `${childId}:${step.id}`;
        const cur = skill[key] ?? { streak: 0, level: 0, lastDate: "" };
        let { streak, level } = cur;
        if (cur.lastDate !== day) streak += 1;
        const baseline = step.support_level ?? 1;
        let leveledUp = false;
        if (streak >= SKILL_THRESHOLD && baseline + level < 4) {
          level += 1;
          streak = 0;
          leveledUp = true;
        }
        skill[key] = { streak, level, lastDate: day };
        return {
          ...s,
          progress: { ...s.progress, [childId]: { date: today, completed } },
          points,
          skill,
          lastLevelUp: leveledUp
            ? { childId, stepId: step.id, level: Math.min(4, baseline + level), n: Date.now() }
            : s.lastLevelUp,
          outbox: [
            ...s.outbox,
            {
              kind: "completion",
              // Deterministic key (Edge Cases §1.1): same child+step+day → one award,
              // across devices and re-completes. The day is TRUSTED (§1.2 serviceDay)
              // so a clock change can't mint a new key (frozen when clock is suspect).
              op_id: `${childId}:step:${step.id}:${serviceDay(s)}`,
              child_id: childId,
              step_id: step.id,
              points: step.reward_points,
              created_at: new Date().toISOString(),
            },
            {
              kind: "skill_progress",
              child_id: childId,
              step_id: step.id,
              streak,
              level_earned: level,
              last_date: day,
              created_at: new Date().toISOString(),
            },
          ],
        };
      });
    },
    [update],
  );

  // Mark a chore done for the day — same one-way, idempotent, points-awarding
  // mechanism as routine steps (done-state lives in the daily progress list).
  const completeChore = useCallback(
    (childId: string, chore: KioskChore) => {
      update((s) => {
        const today = todayKey();
        const prog =
          s.progress[childId]?.date === today
            ? s.progress[childId]
            : { date: today, completed: [] };
        if (prog.completed.includes(chore.id)) return s;
        const completed = [...prog.completed, chore.id];
        const points = {
          ...s.points,
          [childId]: (s.points[childId] ?? 0) + chore.points,
        };
        return {
          ...s,
          progress: { ...s.progress, [childId]: { date: today, completed } },
          points,
          outbox: [
            ...s.outbox,
            {
              kind: "chore_done",
              // Deterministic key (§1.1) on the TRUSTED day (§1.2) — one award per
              // child+chore+day, clock-tamper-resistant.
              op_id: `${childId}:chore:${chore.id}:${serviceDay(s)}`,
              child_id: childId,
              chore_id: chore.id,
              points: chore.points,
              created_at: new Date().toISOString(),
            },
          ],
        };
      });
    },
    [update],
  );

  // Parent/caregiver completes one of THEIR own routine steps (§4.1). NO points, no
  // rewards — a calm sense of completion + modeling. Done-state lives in personProgress
  // (resets daily), synced as a points-free person_completion for streaks/modeling.
  const completePersonStep = useCallback(
    (personId: string, step: KioskStep) => {
      update((s) => {
        const today = todayKey();
        const pp = s.personProgress ?? {};
        const prog = pp[personId]?.date === today ? pp[personId] : { date: today, completed: [] };
        if (prog.completed.includes(step.id)) return s; // one-way for the day
        const completed = [...prog.completed, step.id];
        return {
          ...s,
          personProgress: { ...pp, [personId]: { date: today, completed } },
          outbox: [
            ...s.outbox,
            {
              kind: "person_completion",
              op_id: `person:${personId}:step:${step.id}:${serviceDay(s)}`,
              person_id: personId,
              step_id: step.id,
              created_at: new Date().toISOString(),
            },
          ],
        };
      });
    },
    [update],
  );

  // Medication Station (§4.3): log a dose taken. NO points, ever — health isn't a prize.
  // Idempotent per (med, day, time) via a deterministic op_id on the TRUSTED day.
  const takeMedication = useCallback(
    (childId: string, med: KioskMedication, doseTime: string, confirmedBy: "child" | "parent") => {
      update((s) => {
        const day = serviceDay(s);
        const mp = s.medProgress ?? {};
        const prog = mp[childId]?.date === day ? mp[childId] : { date: day, completed: [] };
        const id = `${med.id}:${doseTime}`;
        if (prog.completed.includes(id)) return s;
        return {
          ...s,
          medProgress: { ...mp, [childId]: { date: day, completed: [...prog.completed, id] } },
          outbox: [
            ...s.outbox,
            {
              kind: "med_log",
              op_id: `med:${med.id}:${day}:${doseTime}`,
              child_id: childId,
              medication_id: med.id,
              dose_date: day,
              dose_time: doseTime,
              confirmed_by: confirmedBy,
              created_at: new Date().toISOString(),
            },
          ],
        };
      });
    },
    [update],
  );

  const checkIn = useCallback(
    (childId: string, feeling: string) => {
      update((s) => ({
        ...s,
        outbox: [
          ...s.outbox,
          {
            kind: "check_in",
            child_id: childId,
            feeling,
            note: null,
            created_at: new Date().toISOString(),
          },
        ],
      }));
    },
    [update],
  );

  // Auto-soften (§9.1.3): after a rough Anchor, run this child at calm intensity
  // for the rest of today (date-stamped; auto-restores tomorrow). Local + offline.
  const softenChild = useCallback(
    (childId: string) => {
      update((s) => ({ ...s, autoSoften: { ...(s.autoSoften ?? {}), [childId]: todayKey() } }));
    },
    [update],
  );

  // Completion streak: count today once when a child finishes their day. Idempotent
  // per day; the gap/reset logic lives in nextStreak. Local + offline.
  const bumpStreak = useCallback(
    (childId: string) => {
      update((s) => {
        const cur = s.streaks?.[childId];
        const next = nextStreak(cur);
        if (cur && cur.lastDate === next.lastDate && cur.count === next.count) return s;
        return { ...s, streaks: { ...(s.streaks ?? {}), [childId]: next } };
      });
    },
    [update],
  );

  // ── Parent actions ──────────────────────────────────────────────────────────
  const resetDay = useCallback(
    (childId: string) => {
      update((s) => ({
        ...s,
        progress: { ...s.progress, [childId]: { date: todayKey(), completed: [] } },
      }));
    },
    [update],
  );

  // Reset every child's points to zero (parent-PIN gated). Persists server-side via
  // a device-validated RPC (writes a balancing 'reset' row, keeps the ledger), then
  // zeros locally. Needs a connection so it sticks through the next sync.
  const resetPoints = useCallback(async (): Promise<boolean> => {
    const st = stateRef.current;
    if (!st) return false;
    if (typeof navigator !== "undefined" && !navigator.onLine) return false;
    try {
      const { error } = await createClient().rpc("rpc_kiosk_reset_points", { p_secret: st.deviceSecret });
      if (error) return false;
    } catch {
      return false;
    }
    setState((prev) => (prev ? { ...prev, points: {} } : prev));
    return true;
  }, []);

  const redeem = useCallback(
    (childId: string, points: number, reason: string) => {
      update((s) => {
        const have = s.points[childId] ?? 0;
        if (points <= 0 || points > have) return s;
        return {
          ...s,
          points: { ...s.points, [childId]: have - points },
          outbox: [
            ...s.outbox,
            {
              kind: "redemption",
              op_id: crypto.randomUUID(),
              child_id: childId,
              points,
              reason,
              created_at: new Date().toISOString(),
            },
          ],
        };
      });
    },
    [update],
  );

  // Redeem a parent-defined reward-store item (decrements points only).
  const redeemStoreItem = useCallback(
    (childId: string, item: KioskStoreItem) => {
      update((s) => {
        const have = s.points[childId] ?? 0;
        if (item.cost_points <= 0 || item.cost_points > have) return s;
        return {
          ...s,
          points: { ...s.points, [childId]: have - item.cost_points },
          outbox: [
            ...s.outbox,
            {
              kind: "redemption",
              op_id: crypto.randomUUID(),
              child_id: childId,
              points: item.cost_points,
              reason: item.label,
              label: item.label,
              store_item_id: item.id,
              created_at: new Date().toISOString(),
            },
          ],
        };
      });
    },
    [update],
  );

  // Shared lists: optimistic add/check, synced via the guarded list_ops push.
  const addListItem = useCallback(
    (name: string, opts?: { category?: string | null; list_kind?: string }) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      update((s) => {
        const client_id = crypto.randomUUID();
        const item: KioskListItem = {
          id: client_id,
          list_kind: opts?.list_kind ?? "grocery",
          name: trimmed,
          category: opts?.category ?? null,
          quantity: null,
          checked: false,
          added_by_label: "Wall",
          sort_order: 999,
        };
        return {
          ...s,
          snapshot: {
            ...s.snapshot,
            list_items: [...(s.snapshot.list_items ?? []), item],
          },
          outbox: [
            ...s.outbox,
            {
              kind: "list_add",
              client_id,
              name: trimmed,
              category: opts?.category ?? null,
              list_kind: item.list_kind,
              added_by_label: "Wall",
              created_at: new Date().toISOString(),
            },
          ],
        };
      });
    },
    [update],
  );

  const checkListItem = useCallback(
    (id: string, checked: boolean) => {
      update((s) => ({
        ...s,
        snapshot: {
          ...s.snapshot,
          list_items: (s.snapshot.list_items ?? []).map((li) =>
            li.id === id ? { ...li, checked } : li,
          ),
        },
        outbox: [
          ...s.outbox,
          { kind: "list_check", id, checked, created_at: new Date().toISOString() },
        ],
      }));
    },
    [update],
  );

  return {
    state,
    status,
    online,
    syncStatus,
    lastSync: state?.lastSync ?? null,
    // Sync-health (Real-Time §8) — surfaced in the Debug panel.
    realtimeStatus,
    lastNudgeAt,
    lastPropagationMs,
    outboxDepth: state?.outbox.length ?? 0,
    clockSuspect: state?.clockSuspect ?? false,
    // Device Management D3 — remote control signals for the shell.
    identifyAt,
    deviceLabel,
    paused,
    pair,
    setPin,
    verifyPin,
    unpair,
    completeStep,
    completeChore,
    completePersonStep,
    takeMedication,
    checkIn,
    softenChild,
    bumpStreak,
    resetDay,
    resetPoints,
    redeem,
    redeemStoreItem,
    addListItem,
    checkListItem,
    syncNow: runSync,
  };
}
