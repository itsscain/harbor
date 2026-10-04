"use client";

import { useEffect, useState } from "react";
import type { KioskChild, KioskState } from "@/lib/kiosk/types";
import { serviceDay, tzOf } from "@/lib/kiosk/time";
import { dayKeyInTz } from "@/lib/tz";
import { mergeKid } from "@/lib/learn/progress";

// Harbor Learn is big (681 levels, generated on load), so the wall's My Day screen never pays for
// it up front: the Learn code is fetched quietly once the wall has been idle a moment (the service
// worker keeps the chunk for offline), or right away when a child flips to Learn.

type LearnModule = typeof import("./LearnApp");
let mod: LearnModule | null = null;
let job: Promise<LearnModule> | null = null;

export function loadLearn(): Promise<LearnModule> {
  job ??= import("./LearnApp").then((m) => (mod = m));
  return job;
}

/** The Learn app's code: null until loaded. `now` asks for it immediately (a child tapped Learn). */
export function useLearnModule(now: boolean): LearnModule | null {
  const [m, setM] = useState<LearnModule | null>(mod);
  useEffect(() => {
    if (m) return;
    let live = true;
    const go = () => void loadLearn().then((x) => live && setM(x)).catch(() => (job = null));
    const t = window.setTimeout(go, now ? 0 : 3500);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [m, now]);
  return m;
}

/** The Learn switch's badge before the Learn code has loaded: missions waiting, or a dot while
 *  today's goal isn't met yet (no curriculum needed). */
export function lightLearnBadge(state: KioskState, child: KioskChild): number | "dot" | null {
  const snap = state.learn ?? null;
  const missions = (snap?.assignments ?? []).filter((a) => a.child_id === child.id).length;
  if (missions) return missions;
  const tz = tzOf(state);
  const todayKey = serviceDay(state);
  const kid = mergeKid(snap, child.id, state.learnOutbox ?? [], todayKey, (iso) => dayKeyInTz(new Date(iso), tz), state.learnEvents ?? []);
  const goal = snap?.profiles?.find((p) => p.child_id === child.id)?.daily_goal ?? 2;
  return kid.todayCount < goal ? "dot" : null;
}
