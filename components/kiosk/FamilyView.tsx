"use client";

import { useEffect, useState } from "react";
import { Bell, Lock } from "lucide-react";
import type { useKiosk } from "./useKiosk";
import { todayKey } from "@/lib/kiosk/db";
import { eventsForDay } from "@/lib/kiosk/calendar";
import { eventColor } from "@/lib/kiosk/colors";
import { nextBirthday } from "@/lib/kiosk/birthday";
import { childDayStatus } from "@/lib/kiosk/childStatus";
import { activeStreak } from "@/lib/kiosk/streak";
import { WeatherWidget } from "./WeatherWidget";
import { FamilyGoal } from "./FamilyGoal";
import { ChildAuraCard } from "./ChildAuraCard";
import { FamilyDock } from "./FamilyDock";
import { Pressable } from "./Pressable";
import { KCard, KEyebrow } from "./ui";

function daysUntil(iso: string): number {
  const d = new Date(iso); d.setHours(0, 0, 0, 0);
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / 86400000);
}

type Kiosk = ReturnType<typeof useKiosk>;

/** FAMILY hub (Kiosk Overhaul §6) — touched to answer "who's doing what right now?"
 *  The children are the heroes (aura cards); the schedule is supporting cast; the
 *  essentials fit with no scrolling. Replaces v1's vertical HomeView feed. */
export function FamilyView({
  kiosk,
  onSelectChild,
  onSelectPerson,
  onOpenCalendar,
  onOpenChores,
  onOpenLists,
  onOpenHouseRules,
  onParentMenu,
}: {
  kiosk: Kiosk;
  onSelectChild: (id: string) => void;
  onSelectPerson: (id: string) => void;
  onOpenCalendar: () => void;
  onOpenChores: () => void;
  onOpenLists: () => void;
  onOpenHouseRules: () => void;
  onParentMenu: () => void;
}) {
  const { state } = kiosk;
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 20000);
    return () => clearInterval(id);
  }, []);

  if (!state) return null;
  const snap = state.snapshot;
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const children = [...snap.children].sort((a, b) => a.sort_order - b.sort_order);
  const people = [...(snap.people ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const childrenById = new Map(snap.children.map((c) => [c.id, c]));
  const hsettings = (snap.household.settings ?? {}) as Record<string, unknown>;
  const weather = hsettings.weather as { lat?: number; lon?: number; label?: string } | undefined;
  const familyGoal = hsettings.family_goal as
    | { label?: string; emoji?: string; target?: number; reward?: string | null; active?: boolean }
    | undefined;
  const goalCurrent = children.reduce((sum, c) => sum + (state.points[c.id] ?? 0), 0);

  const todayStr = todayKey();
  const tonight =
    (snap.meals ?? []).find((m) => m.date === todayStr && m.meal_type === "dinner") ??
    (snap.meals ?? []).find((m) => m.date === todayStr);

  const eventCountdowns = (snap.events ?? [])
    .filter((e) => e.is_countdown)
    .map((e) => ({ emoji: e.emoji ?? "🎉", title: e.title, days: daysUntil(e.starts_at) }))
    .filter((x) => x.days >= 0);
  const birthdayCountdowns = children
    .map((c) => {
      const nb = nextBirthday(c.birthday);
      if (!nb) return null;
      const turns = nb.turning && nb.turning > 0 ? ` · turns ${nb.turning}` : "";
      return { emoji: "🎂", title: `${c.name}'s birthday${turns}`, days: nb.daysUntil };
    })
    .filter((x): x is { emoji: string; title: string; days: number } => x !== null);
  const nextCountdown = [...eventCountdowns, ...birthdayCountdowns].sort((a, b) => a.days - b.days)[0];

  const pinnedNote = (snap.wall_messages ?? [])
    .filter((m) => !m.expires_at || new Date(m.expires_at) > now)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (a.created_at < b.created_at ? 1 : -1))[0];

  const dueReminders = (snap.reminders ?? []).filter(
    (r) => !r.done && r.due_date <= todayStr && (!r.snoozed_until || r.snoozed_until <= todayStr),
  );

  const goalActive = familyGoal?.active && familyGoal.label && (familyGoal.target ?? 0) > 0;
  const colsClass =
    children.length <= 1 ? "grid-cols-1 max-w-xs mx-auto"
      : children.length === 2 ? "grid-cols-2 max-w-2xl mx-auto"
        : children.length === 3 ? "grid-cols-3"
          : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-8 pt-5 sm:px-6">
      {/* Compact top bar (interactive state) */}
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ktext sm:text-3xl">{greeting}</h1>
          <p className="mt-1 text-sm text-kmute">
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {weather?.lat != null && weather?.lon != null && (
            <WeatherWidget lat={weather.lat} lon={weather.lon} label={weather.label} />
          )}
          <p className="font-display text-3xl font-bold tabular-nums leading-none text-ktext sm:text-4xl">
            {now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </p>
          <Pressable haptics onClick={onParentMenu} aria-label="Parents" className="kiosk-tap flex h-10 w-10 items-center justify-center rounded-xl bg-kpanel text-kmute ring-1 ring-kline/55">
            <Lock className="h-4 w-4" />
          </Pressable>
        </div>
      </header>

      {/* Gentle reminder banner (never red) */}
      {dueReminders.length > 0 && (
        <KCard className="mb-4 flex items-start gap-3 bg-amber-400/10 p-4 ring-amber-400/25">
          <Bell className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <div>
            <p className="font-bold text-amber-200">Don&apos;t forget</p>
            <ul className="mt-1 space-y-0.5 text-sm text-amber-100/90">
              {dueReminders.slice(0, 3).map((r) => <li key={r.id}>• {r.title}</li>)}
            </ul>
          </div>
        </KCard>
      )}

      {/* HERO — the child aura cards */}
      {children.length > 0 ? (
        <div className={`grid gap-3 sm:gap-4 ${colsClass}`}>
          {children.map((c) => (
            <ChildAuraCard
              key={c.id}
              child={c}
              status={childDayStatus(state, c.id)}
              streak={activeStreak(state.streaks, c.id)}
              onSelect={() => onSelectChild(c.id)}
            />
          ))}
        </div>
      ) : (
        <KCard className="p-6 text-center text-kmute">No kids yet. A grown-up can add them in the Harbor app.</KCard>
      )}

      {/* In the boat too (§4.1) — parents/caregivers are participants, calm + secondary. */}
      {people.length > 0 && (
        <div className="mx-auto mt-4 flex max-w-3xl flex-wrap items-center justify-center gap-2.5">
          {people.map((p) => (
            <Pressable
              key={p.id}
              haptics
              onClick={() => onSelectPerson(p.id)}
              aria-label={`${p.name}'s routine`}
              className="kiosk-tap flex items-center gap-2.5 rounded-full py-2 pl-2 pr-4 ring-1 ring-kline/55"
              style={{ background: `${p.color || "#6b8aa6"}14` }}
            >
              <span
                className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-lg"
                style={{ background: `${p.color || "#6b8aa6"}26` }}
              >
                {p.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  p.avatar || "💙"
                )}
              </span>
              <span className="text-sm font-semibold text-ktext">{p.name}</span>
            </Pressable>
          ))}
        </div>
      )}

      {/* Family goal — the cooperative vessel everyone fills */}
      {goalActive && (
        <div className="mt-4">
          <FamilyGoal
            goal={{ label: familyGoal!.label!, emoji: familyGoal!.emoji, target: familyGoal!.target!, reward: familyGoal!.reward }}
            current={goalCurrent}
          />
        </div>
      )}

      {/* Rhythm strip — today's shared events with a "now" marker */}
      <RhythmStrip events={eventsForDay(snap.events ?? [], now)} childrenById={childrenById} now={now} onOpen={onOpenCalendar} />

      {/* Glance tiles */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {tonight && (
          <KCard className="flex items-center gap-3 p-4">
            <span className="text-3xl">{tonight.emoji ?? "🍽️"}</span>
            <div className="min-w-0">
              <KEyebrow>Tonight&apos;s dinner</KEyebrow>
              <p className="mt-0.5 truncate font-display text-base font-bold text-ktext">{tonight.title}</p>
            </div>
          </KCard>
        )}
        {nextCountdown && (
          <KCard className="flex items-center gap-3 bg-beacon/10 p-4 ring-beacon/25">
            <span className="text-3xl">{nextCountdown.emoji}</span>
            <div className="min-w-0">
              <p className="font-display text-base font-bold text-beacon">
                {nextCountdown.days === 0 ? "Today!" : `${nextCountdown.days} ${nextCountdown.days === 1 ? "sleep" : "sleeps"}`}
              </p>
              <p className="truncate text-sm text-kmute">{nextCountdown.title}</p>
            </div>
          </KCard>
        )}
        {pinnedNote && (
          <KCard className="flex items-start gap-3 p-4">
            <span className="text-2xl">{pinnedNote.emoji ?? "💬"}</span>
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm text-ktext">{pinnedNote.body}</p>
              {pinnedNote.author_label && <p className="mt-0.5 text-xs text-kmute">— {pinnedNote.author_label}</p>}
            </div>
          </KCard>
        )}
      </div>

      {/* The slim dock — the instrument's quiet utility shelf */}
      <div className="mt-6 flex justify-center">
        <FamilyDock
          onCalendar={onOpenCalendar}
          onChores={onOpenChores}
          onLists={onOpenLists}
          onRules={onOpenHouseRules}
          groceriesLeft={(snap.list_items ?? []).filter((i) => i.list_kind === "grocery" && !i.checked).length}
          hasRules={(snap.house_rules ?? []).length > 0}
        />
      </div>
    </div>
  );
}

/** Today's shared events as a calm mini-timeline with a "now" marker (§6.3). */
function RhythmStrip({
  events,
  childrenById,
  now,
  onOpen,
}: {
  events: ReturnType<typeof eventsForDay>;
  childrenById: Map<string, { id: string; color?: string | null }>;
  now: Date;
  onOpen: () => void;
}) {
  const DAY_START = 6 * 60;
  const DAY_END = 22 * 60;
  const pos = (min: number) => Math.max(0, Math.min(1, (min - DAY_START) / (DAY_END - DAY_START)));
  const timed = (events ?? [])
    .filter((e) => !e.all_day && !e.is_countdown && e.starts_at)
    .map((e) => {
      const d = new Date(e.starts_at);
      return { e, min: d.getHours() * 60 + d.getMinutes(), label: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) };
    })
    .filter((x) => x.min >= DAY_START && x.min <= DAY_END)
    .sort((a, b) => a.min - b.min);
  if (timed.length === 0) return null;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowVisible = nowMin >= DAY_START && nowMin <= DAY_END;

  return (
    <Pressable haptics onClick={onOpen} aria-label="Open calendar" className="mt-5 block w-full rounded-2xl bg-kpanel/60 px-4 pb-3 pt-4 ring-1 ring-kline/40">
      <div className="relative h-14">
        <div className="absolute inset-x-1 top-3 h-px bg-kline/60" />
        {nowVisible && (
          <div className="absolute -translate-x-1/2" style={{ left: `${pos(nowMin) * 100}%`, top: 0 }}>
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-kwater opacity-60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-kwater" />
            </span>
            <span className="mt-0.5 block -translate-x-1/2 text-[10px] font-bold uppercase tracking-wide text-kwater">now</span>
          </div>
        )}
        {timed.map(({ e, min, label }) => {
          const past = min < nowMin;
          return (
            <div key={e.id} className="absolute -translate-x-1/2 text-center" style={{ left: `${pos(min) * 100}%`, top: 8 }}>
              <span
                className={cnDot(past)}
                style={{ background: eventColor(e, childrenById), opacity: past ? 0.4 : 1 }}
              />
              <span className={`mt-1.5 block whitespace-nowrap text-[11px] tabular-nums ${past ? "text-kmute/60" : "text-kmute"}`}>{label}</span>
            </div>
          );
        })}
      </div>
    </Pressable>
  );
}

function cnDot(past: boolean) {
  return `mx-auto block h-3 w-3 rounded-full ${past ? "" : "ring-2 ring-white/15"}`;
}
