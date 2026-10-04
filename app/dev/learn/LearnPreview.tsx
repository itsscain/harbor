"use client";

import { useMemo, useState } from "react";
import { ChildView } from "@/components/kiosk/ChildView";
import { LearnApp } from "@/components/kiosk/learn/LearnApp";
import type { useKiosk } from "@/components/kiosk/useKiosk";
import type { KioskSnapshot, KioskState } from "@/lib/kiosk/types";
import type { LearnResult } from "@/lib/learn/types";
import type { LearnSnapshot } from "@/lib/learn/progress";

// Development-only mock wall for Harbor Learn: a real ChildView/LearnApp over an in-memory kiosk
// state. Finished lessons update progress locally (no network).

type Kiosk = ReturnType<typeof useKiosk>;
const HH = "00000000-0000-0000-0000-0000000000aa";
const CADE = "00000000-0000-0000-0000-0000000000c5";

function dayKey(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function makeState(grade: string, fresh: boolean): KioskState {
  const now = new Date().toISOString();
  const snapshot: KioskSnapshot = {
    household: { id: HH, name: "Rivera Family", plus_active: false, parent_pin_set: false, settings: { timezone: "America/New_York" } },
    children: [{ id: CADE, name: "Cade", avatar: "🦖", photo_url: null, color: "#4AA8F0", birthday: "2021-03-14", ai_profile: null, sort_order: 0, settings: { sound: true, readAloud: true } }],
    people: [],
    routines: [{ id: "r1", child_id: CADE, name: "Morning", type: "schedule", active: true, sort_order: 0, start_time: null, end_time: null, days_of_week: null }],
    steps: [
      { id: "s1", routine_id: "r1", order_index: 0, label: "Get dressed", icon: "👕", photo_url: null, step_type: "task", reward_points: 1, start_time: null, duration_min: null },
      { id: "s2", routine_id: "r1", order_index: 1, label: "Eat breakfast", icon: "🥣", photo_url: null, step_type: "task", reward_points: 1, start_time: null, duration_min: null },
      { id: "s3", routine_id: "r1", order_index: 2, label: "Brush teeth", icon: "🪥", photo_url: null, step_type: "task", reward_points: 1, start_time: null, duration_min: null },
    ],
    rewards: [{ child_id: CADE, points_total: 12 }],
    calm_tools: [],
    events: [],
    store_items: [],
    list_items: [],
    wall_messages: [],
    reminders: [],
    meals: [],
    server_time: now,
  };
  const learn: LearnSnapshot = {
    profiles: [{ child_id: CADE, grade, subjects: ["reading", "code", "math"], daily_goal: 2, earn_stars: true }],
    assignments: fresh ? [] : [{ id: "a1", child_id: CADE, lesson_id: "read.ls1.m", note: "Let's learn the m sound!", created_at: now }],
    kids: fresh
      ? {}
      : {
          [CADE]: {
            lessons: { "read.pa.rhyme1": [3, 1, now], "read.pa.first1": [2, 1, now], "read.pa.rhyme2": [3, 2, now], "code.u1.1": [3, 1, now], "math.c5.1": [2, 1, now] },
            stickers: { fish: 1, crab: 2, octopus: 1, turtle: 1 },
            days: [dayKey(-1), dayKey(-2)],
            xp: 120,
            today: 0,
          },
        },
    server_time: now,
  };
  return { deviceSecret: "dev", householdId: HH, kind: "wall", snapshot, pinHash: null, lastSync: now, points: { [CADE]: 12 }, progress: {}, outbox: [], learn, learnOutbox: [] };
}

export function LearnPreview({ lesson, grade, fresh }: { lesson: string | null; grade: string; fresh: boolean }) {
  const [state, setState] = useState<KioskState>(() => makeState(grade, fresh));
  const kiosk = useMemo(() => {
    const base = {
      state,
      online: true,
      syncStatus: "ok",
      finishLesson: (r: LearnResult) =>
        setState((s) => ({
          ...s,
          learnOutbox: [...(s.learnOutbox ?? []), r],
          points: { ...s.points, [r.child_id]: (s.points[r.child_id] ?? 0) + (r.stars >= 3 ? 2 : 1) },
        })),
      completeStep: (childId: string, step: { id: string; reward_points: number }) =>
        setState((s) => {
          const day = s.progress[childId]?.completed ?? [];
          return { ...s, progress: { ...s.progress, [childId]: { date: dayKey(0), completed: [...day, step.id] } }, points: { ...s.points, [childId]: (s.points[childId] ?? 0) + step.reward_points } };
        }),
      verifyPin: async () => true,
    } as Record<string, unknown>;
    return new Proxy(base, { get: (t, k: string) => (k in t ? t[k] : () => undefined) }) as unknown as Kiosk;
  }, [state]);
  const child = state.snapshot.children[0];

  return (
    <div className="fixed inset-0 overflow-hidden overscroll-none select-none">
      <div className="kiosk-root h-full w-full overflow-y-auto bg-kbg text-ktext">
        {lesson ? (
          <LearnApp kiosk={kiosk} child={child} accent="#4AA8F0" reduced={false} sound intensity={1} header={null} startWith={lesson} />
        ) : (
          <ChildView kiosk={kiosk} childId={CADE} onHome={() => {}} onOpenCalm={() => {}} />
        )}
      </div>
    </div>
  );
}
