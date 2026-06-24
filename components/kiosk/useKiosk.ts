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
import { createClient } from "@/lib/supabase/client";
import type {
  KioskState,
  KioskStep,
  KioskChore,
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
    } catch {
      setSyncStatus("error");
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
              op_id: crypto.randomUUID(),
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
    pair,
    setPin,
    verifyPin,
    unpair,
    completeStep,
    completeChore,
    checkIn,
    softenChild,
    resetDay,
    resetPoints,
    redeem,
    redeemStoreItem,
    addListItem,
    checkListItem,
    syncNow: runSync,
  };
}
