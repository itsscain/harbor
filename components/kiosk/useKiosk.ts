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
import type {
  KioskState,
  KioskStep,
  KioskStoreItem,
  KioskListItem,
} from "@/lib/kiosk/types";

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
  // Reconciles against live state: mutations enqueued during the network await
  // are preserved (and their optimistic effects re-applied) so a tap mid-sync is
  // never lost.
  const runSync = useCallback(async () => {
    const before = stateRef.current;
    if (!before) return;
    const synced = await syncNow(before);
    if (synced === before) return; // offline, not Plus, or nothing changed

    setState((prev) => {
      if (!prev) return prev;
      // Entries appended after sync began (update() appends to the end).
      const newEntries = prev.outbox.slice(before.outbox.length);

      const points = { ...synced.points };
      const listItems = [...(synced.snapshot.list_items ?? [])];
      for (const m of newEntries) {
        if (m.kind === "completion")
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
        return {
          ...s,
          progress: { ...s.progress, [childId]: { date: today, completed } },
          points,
          outbox: [
            ...s.outbox,
            {
              kind: "completion",
              op_id: crypto.randomUUID(),
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
    pair,
    setPin,
    verifyPin,
    unpair,
    completeStep,
    checkIn,
    resetDay,
    redeem,
    redeemStoreItem,
    addListItem,
    checkListItem,
    syncNow: runSync,
  };
}
