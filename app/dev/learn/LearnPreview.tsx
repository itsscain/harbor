"use client";

import { useMemo, useState } from "react";
import { ChildView } from "@/components/kiosk/ChildView";
import { LearnApp } from "@/components/kiosk/learn/LearnApp";
import type { useKiosk } from "@/components/kiosk/useKiosk";
import type { KioskSnapshot, KioskState } from "@/lib/kiosk/types";
import type { LearnResult } from "@/lib/learn/types";
import type { LearnEvent, LearnSnapshot } from "@/lib/learn/progress";
import { CREATURES } from "@/lib/learn/reef";
import { DECOR, TANKS } from "@/lib/learn/aquarium";

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

function makeState(grade: string, fresh: boolean, aq: string | null, tank: string | null): KioskState {
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
    profiles: [{ child_id: CADE, grade, subjects: ["reading", "math", "code", "science", "manners", "faith"], daily_goal: 2, earn_stars: true, daily_limit: 0 }],
    assignments: fresh ? [] : [{ id: "a1", child_id: CADE, lesson_id: "read.ls1.3", note: "Let's learn some new letters!", created_at: now }],
    kids: fresh
      ? {}
      : {
          [CADE]: {
            lessons: { "read.ls1.1": [3, 1, now], "read.ls1.2": [2, 1, now], "code.voyage.1": [3, 1, now], "code.voyage.2": [2, 1, now], "math.count5.1": [3, 1, now], "math.count5.2": [0, 1, now], "char.magic-words.1": [3, 1, now], "faith.creation.1": [3, 1, now] },
            stickers: { fish: 1, crab: 2, octopus: 1, turtle: 1, "shell*": 1 },
            days: [dayKey(-1), dayKey(-2)],
            xp: 120,
            today: 0,
            skills: {
              "r:sound:m": [4, 4, now, "11"],
              "r:sound:s": [3, 4, now, "0"],
              "m:count:4": [1, 3, now, "0"],
              "m:count:5": [1, 2, now, "0"],
              "m:count:3": [3, 3, now, "1"],
              "c:sequencing": [6, 6, now, "11"],
              "h:magic-words": [6, 6, now, "1"],
              "f:story:creation": [4, 4, now, "1"],
              "f:verse:gen1-1": [3, 4, now, "0"],
            },
            shells: 640,
            // A few aquarium things: two eggs bought (hatched below), a flakes pack, three decorations.
            owned: ["sail-stripes", "egg:sea:dev002", "egg:rare:dev003", "food:flakes:dev001", "decor:grass", "decor:castle", "decor:balloon"],
            look: { hull: "hull-coral", sail: "sail-stripes", flag: "flag-pennant", pet: null, trail: null },
            daily: null,
            // A returning learner has been through Boat School (a fresh one gets it first) and has
            // three aquarium friends, one of which had two treats today.
            collected: [
              ["tutorial:boat", null, now],
              ["hatch:welcome", { creature: "sunny", xp: 0 }, now],
              ["hatch:egg:sea:dev002", { creature: "inky", xp: 40 }, now],
              ["hatch:egg:rare:dev003", { creature: "shelly", xp: 100 }, now],
            ],
            fed: { welcome: [2, 0, 0, now, 2] },
          },
        },
    server_time: now,
  };
  // ?aq=full — every creature (at every growth stage), every decoration and tank, food to give.
  const kid = learn.kids[CADE];
  if (kid && aq === "full") {
    kid.xp = 1500;
    kid.shells = 4000;
    kid.collected = [["tutorial:boat", null, now], ...CREATURES.map((c, i) => [`hatch:dev-${c.id}`, { creature: c.id, xp: [1450, 1300, 900, 100][i % 4] }, now] as [string, { creature: string; xp: number }, string])];
    kid.owned = [...kid.owned!, ...DECOR.map((d) => `decor:${d.id}`), ...TANKS.map((t) => `tank:${t.id}`), ...["flakes", "shrimp", "golden"].flatMap((k) => [1, 2, 3].map((n) => `food:${k}:dev${n}`))];
    kid.fed = {};
  }
  if (kid && tank) kid.collected = [...(kid.collected ?? []), [`aq:tank:${tank}`, null, now]];
  return { deviceSecret: "dev", householdId: HH, kind: "wall", snapshot, pinHash: null, lastSync: now, points: { [CADE]: 12 }, progress: {}, outbox: [], learn, learnOutbox: [], learnEvents: [] };
}

export function LearnPreview({ lesson, only, grade, fresh, aq, tank }: { lesson: string | null; only: string | null; grade: string; fresh: boolean; aq: string | null; tank: string | null }) {
  const [state, setState] = useState<KioskState>(() => makeState(grade, fresh, aq, tank));
  const kiosk = useMemo(() => {
    const base = {
      state,
      online: true,
      syncStatus: "ok",
      finishLesson: (r: LearnResult) =>
        setState((s) => ({
          ...s,
          learnOutbox: [...(s.learnOutbox ?? []), r],
          points: { ...s.points, [r.child_id]: (s.points[r.child_id] ?? 0) + (r.stars >= 1 ? (r.stars >= 3 ? 2 : 1) : 0) },
        })),
      learnEvent: (e: LearnEvent) => setState((s) => ((s.learnEvents ?? []).some((x) => x.op_id === e.op_id) ? s : { ...s, learnEvents: [...(s.learnEvents ?? []), e] })),
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
          <LearnApp kiosk={kiosk} child={child} accent="#4AA8F0" reduced={false} sound intensity={1} header={null} startWith={only ? `${lesson}#${only}` : lesson} />
        ) : (
          <ChildView kiosk={kiosk} childId={CADE} onHome={() => {}} onOpenCalm={() => {}} />
        )}
      </div>
    </div>
  );
}
