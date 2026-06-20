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
import type { KioskState, KioskStep } from "@/lib/kiosk/types";

export type KioskStatus = "loading" | "unpaired" | "ready";

export function useKiosk() {
  const [state, setState] = useState<KioskState | null>(null);
  const [status, setStatus] = useState<KioskStatus>("loading");
  const [online, setOnline] = useState(true);
  const stateRef = useRef<KioskState | null>(null);
  stateRef.current = state;

  // Initial load from IndexedDB.
  useEffect(() => {
    let mounted = true;
    loadState().then((s) => {
      if (!mounted) return;
      setState(s);
      setStatus(s ? "ready" : "unpaired");
    });
    return () => {
      mounted = false;
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

  // Background sync (no-op unless online + Plus). Daily use never needs this.
  const runSync = useCallback(async () => {
    const current = stateRef.current;
    if (!current) return;
    const next = await syncNow(current);
    if (next !== current) {
      void persistState(next);
      setState(next);
    }
  }, []);

  useEffect(() => {
    const setOn = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) void runSync();
    };
    setOnline(navigator.onLine);
    window.addEventListener("online", setOn);
    window.addEventListener("offline", setOn);
    void runSync();
    const id = window.setInterval(runSync, 60_000);
    return () => {
      window.removeEventListener("online", setOn);
      window.removeEventListener("offline", setOn);
      window.clearInterval(id);
    };
  }, [runSync]);

  // ── Setup / pairing ─────────────────────────────────────────────────────────
  const pair = useCallback(async (code: string) => {
    const res = await pairDevice(code);
    const points: Record<string, number> = {};
    for (const rw of res.snapshot.rewards) points[rw.child_id] = rw.points_total;
    const fresh: KioskState = {
      deviceSecret: res.device_secret,
      householdId: res.household_id,
      snapshot: res.snapshot,
      pinHash: null,
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
        return {
          ...s,
          progress: { ...s.progress, [childId]: { date: today, completed } },
          points,
          outbox: [
            ...s.outbox,
            {
              kind: "completion",
              child_id: childId,
              step_id: step.id,
              points: step.reward_points,
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

  return {
    state,
    status,
    online,
    pair,
    setPin,
    verifyPin,
    unpair,
    completeStep,
    checkIn,
    resetDay,
    redeem,
    syncNow: runSync,
  };
}
