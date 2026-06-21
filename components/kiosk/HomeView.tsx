"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Bell, Pin, ChevronRight, Star, Lock } from "lucide-react";
import type { useKiosk } from "./useKiosk";
import { todayKey } from "@/lib/kiosk/db";
import { eventsForDay, formatEventTime, runsToday } from "@/lib/kiosk/calendar";
import { childColor, eventColor } from "@/lib/kiosk/colors";
import { activeGroundingFor } from "@/lib/kiosk/grounding";
import { nextBirthday } from "@/lib/kiosk/birthday";
import { WeatherWidget } from "./WeatherWidget";
import { KCard, KEyebrow, KButton } from "./ui";

function daysUntil(iso: string): number {
  const d = new Date(iso); d.setHours(0, 0, 0, 0);
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / 86400000);
}

type Kiosk = ReturnType<typeof useKiosk>;

export function HomeView({
  kiosk,
  onSelectChild,
  onOpenCalendar,
  onParentMenu,
}: {
  kiosk: Kiosk;
  onSelectChild: (id: string) => void;
  onOpenCalendar: () => void;
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
  const today = todayKey();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const children = [...snap.children].sort((a, b) => a.sort_order - b.sort_order);
  const childrenById = new Map(snap.children.map((c) => [c.id, c]));
  const todays = eventsForDay(snap.events ?? [], now).slice(0, 4);

  const hsettings = (snap.household.settings ?? {}) as Record<string, unknown>;
  const weather = hsettings.weather as { lat?: number; lon?: number; label?: string } | undefined;

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

  const messages = (snap.wall_messages ?? [])
    .filter((m) => !m.expires_at || new Date(m.expires_at) > now)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 3);

  const dueReminders = (snap.reminders ?? []).filter(
    (r) => !r.done && r.due_date <= todayStr && (!r.snoozed_until || r.snoozed_until <= todayStr),
  );

  function childProgress(childId: string) {
    const routineIds = snap.routines
      .filter((r) => r.child_id === childId && r.active && runsToday(r.days_of_week))
      .map((r) => r.id);
    const steps = snap.steps.filter((s) => routineIds.includes(s.routine_id) && s.step_type === "task");
    const completed = state!.progress[childId]?.date === today ? state!.progress[childId].completed : [];
    const done = steps.filter((s) => completed.includes(s.id)).length;
    return { done, total: steps.length, points: state!.points[childId] ?? 0 };
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-28 pt-6 sm:px-8 sm:pt-8">
      {/* Header */}
      <header className="mb-7 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{greeting}</h1>
          <p className="mt-1 text-kmute">
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {weather?.lat != null && weather?.lon != null && (
            <WeatherWidget lat={weather.lat} lon={weather.lon} label={weather.label} />
          )}
          <div className="flex flex-col items-end gap-2">
            <p className="font-display text-4xl font-extrabold tabular-nums leading-none sm:text-5xl">
              {now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </p>
            <KButton variant="tonal" size="sm" onClick={onParentMenu} className="rounded-full px-4">
              <Lock className="h-4 w-4" /> Parents
            </KButton>
          </div>
        </div>
      </header>

      {/* Highlight row */}
      {(nextCountdown || tonight) && (
        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          {nextCountdown && (
            <KCard className="flex items-center gap-4 bg-beacon/10 p-5 ring-beacon/25">
              <span className="text-4xl">{nextCountdown.emoji}</span>
              <div className="min-w-0">
                <p className="font-display text-xl font-extrabold text-beacon">
                  {nextCountdown.days === 0 ? "Today!" : `${nextCountdown.days} ${nextCountdown.days === 1 ? "sleep" : "sleeps"} to go`}
                </p>
                <p className="truncate text-sm text-kmute">{nextCountdown.title}</p>
              </div>
            </KCard>
          )}
          {tonight && (
            <KCard className="flex items-center gap-4 p-5">
              <span className="text-4xl">{tonight.emoji ?? "🍽️"}</span>
              <div className="min-w-0">
                <KEyebrow>Tonight&apos;s dinner</KEyebrow>
                <p className="mt-1 truncate font-display text-xl font-bold text-ktext">{tonight.title}</p>
              </div>
            </KCard>
          )}
        </div>
      )}

      {/* Reminders */}
      {dueReminders.length > 0 && (
        <KCard className="mb-5 flex items-start gap-3 bg-amber-400/10 p-5 ring-amber-400/25">
          <Bell className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <div>
            <p className="font-bold text-amber-200">Don&apos;t forget</p>
            <ul className="mt-1 space-y-0.5 text-sm text-amber-100/90">
              {dueReminders.map((r) => <li key={r.id}>• {r.title}</li>)}
            </ul>
          </div>
        </KCard>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <div className="mb-5 space-y-2.5">
          {messages.map((m) => (
            <KCard key={m.id} className="flex items-start gap-3 p-4">
              <span className="text-2xl">{m.emoji ?? (m.pinned ? "📌" : "💬")}</span>
              <div className="min-w-0 flex-1">
                <p className="text-ktext">{m.body}</p>
                {m.author_label && <p className="mt-0.5 text-xs font-semibold text-kmute">— {m.author_label}</p>}
              </div>
              {m.pinned && <Pin className="h-4 w-4 shrink-0 text-beacon" />}
            </KCard>
          ))}
        </div>
      )}

      {/* Children */}
      <KEyebrow className="mb-3">Tap to start the day</KEyebrow>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {children.map((c) => {
          const p = childProgress(c.id);
          const color = childColor(c);
          const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
          const reset = activeGroundingFor(snap.groundings, c.id);
          const allDone = p.total > 0 && p.done === p.total;
          return (
            <button
              key={c.id}
              onClick={() => onSelectChild(c.id)}
              className="kiosk-tap group rounded-3xl bg-kpanel p-5 text-left shadow-k ring-1 ring-kline/55 transition hover:brightness-110 active:scale-[0.99]"
              style={{ borderTop: `4px solid ${color}` }}
            >
              <div className="flex items-center gap-4">
                <span
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-4xl"
                  style={{ background: color + "26", boxShadow: `inset 0 0 0 2px ${color}` }}
                >
                  {c.avatar ?? "🙂"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-display text-2xl font-extrabold text-ktext">{c.name}</p>
                    {reset && (
                      <span className="shrink-0 rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-bold text-amber-300">
                        🌱 {reset.lastDay ? "last day" : `${reset.daysLeft}d`}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 flex items-center gap-2 text-sm text-kmute">
                    <span className={allDone ? "font-semibold text-emerald-300" : undefined}>
                      {p.total > 0 ? (allDone ? "All done! 🎉" : `${p.done}/${p.total} steps`) : "No routine yet"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-beacon">
                      <Star className="h-4 w-4 fill-beacon" /> {p.points}
                    </span>
                  </p>
                </div>
                <ChevronRight className="h-6 w-6 shrink-0 text-kmute transition group-hover:text-ktext" />
              </div>
              {p.total > 0 && (
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-kraise">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Today agenda */}
      <button
        onClick={onOpenCalendar}
        className="flex w-full items-center justify-between gap-3 rounded-3xl bg-kpanel p-5 text-left shadow-k ring-1 ring-kline/55 transition hover:brightness-110 active:scale-[0.99]"
      >
        <div className="min-w-0 flex-1">
          <p className="mb-2 flex items-center gap-2 font-display text-lg font-bold text-ktext">
            <CalendarDays className="h-5 w-5 text-kwater" /> Today
          </p>
          {todays.length === 0 ? (
            <p className="text-sm text-kmute">Nothing scheduled. Enjoy the calm. 🌊</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {todays.map((e) => (
                <li key={e.id} className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: eventColor(e, childrenById) }} />
                  <span className="font-semibold text-kwater">{formatEventTime(e)}</span>
                  <span className="text-ktext">{e.emoji} {e.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-kmute" />
      </button>
    </div>
  );
}
