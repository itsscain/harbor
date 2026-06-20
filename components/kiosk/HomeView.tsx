"use client";

import { useEffect, useState } from "react";
import { CalendarDays, ListChecks, Heart, Bell, Pin, ChevronRight, Star, Lock } from "lucide-react";
import type { useKiosk } from "./useKiosk";
import { todayKey } from "@/lib/kiosk/db";
import { eventsForDay, formatEventTime, runsToday } from "@/lib/kiosk/calendar";
import { childColor, eventColor } from "@/lib/kiosk/colors";
import { WeatherWidget } from "./WeatherWidget";
import { cn } from "@/lib/cn";

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
  onOpenLists,
  onOpenCalm,
  onParentMenu,
}: {
  kiosk: Kiosk;
  onSelectChild: (id: string) => void;
  onOpenCalendar: () => void;
  onOpenLists: () => void;
  onOpenCalm: () => void;
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

  const todayStr = todayKey(); // local calendar date (matches the rest of the wall)
  const tonight =
    (snap.meals ?? []).find((m) => m.date === todayStr && m.meal_type === "dinner") ??
    (snap.meals ?? []).find((m) => m.date === todayStr);

  const nextCountdown = (snap.events ?? [])
    .filter((e) => e.is_countdown)
    .map((e) => ({ e, d: daysUntil(e.starts_at) }))
    .filter((x) => x.d >= 0)
    .sort((a, b) => a.d - b.d)[0];

  const messages = (snap.wall_messages ?? [])
    .filter((m) => !m.expires_at || new Date(m.expires_at) > now)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 3);

  const dueReminders = (snap.reminders ?? []).filter(
    (r) => !r.done && r.due_date <= todayStr && (!r.snoozed_until || r.snoozed_until <= todayStr),
  );

  const groceriesLeft = (snap.list_items ?? []).filter(
    (i) => i.list_kind === "grocery" && !i.checked,
  ).length;

  function childProgress(childId: string) {
    const routineIds = snap.routines
      .filter((r) => r.child_id === childId && r.active && runsToday(r.days_of_week))
      .map((r) => r.id);
    const steps = snap.steps.filter(
      (s) => routineIds.includes(s.routine_id) && s.step_type === "task",
    );
    const completed =
      state!.progress[childId]?.date === today ? state!.progress[childId].completed : [];
    const done = steps.filter((s) => completed.includes(s.id)).length;
    return { done, total: steps.length, points: state!.points[childId] ?? 0 };
  }

  return (
    <div className="min-h-full bg-seafog">
      <div className="mx-auto w-full max-w-3xl p-4 sm:p-6 lg:max-w-5xl">
        {/* Greeting + clock */}
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h1 className="font-display text-3xl font-extrabold text-harbor">{greeting}</h1>
            <p className="text-muted">
              {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {weather?.lat != null && weather?.lon != null && (
              <WeatherWidget lat={weather.lat} lon={weather.lon} label={weather.label} />
            )}
            <div className="flex flex-col items-end gap-1">
              <p className="font-display text-4xl font-extrabold tabular-nums text-harbor">
                {now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </p>
              <button
                onClick={onParentMenu}
                className="kiosk-tap flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-muted shadow-sm"
              >
                <Lock className="h-3.5 w-3.5" /> Parents
              </button>
            </div>
          </div>
        </div>

        {/* Countdown + tonight's dinner */}
        {(nextCountdown || tonight) && (
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            {nextCountdown && (
              <div className="flex items-center gap-3 rounded-2xl border border-beacon/40 bg-beacon-soft/40 p-4">
                <span className="text-3xl">{nextCountdown.e.emoji ?? "🎉"}</span>
                <div>
                  <p className="font-display text-lg font-extrabold text-harbor">
                    {nextCountdown.d === 0 ? "Today!" : `${nextCountdown.d} ${nextCountdown.d === 1 ? "sleep" : "sleeps"} to go`}
                  </p>
                  <p className="text-sm text-muted">{nextCountdown.e.title}</p>
                </div>
              </div>
            )}
            {tonight && (
              <div className="flex items-center gap-3 rounded-2xl border border-harbor-100 bg-white p-4">
                <span className="text-3xl">{tonight.emoji ?? "🍽️"}</span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted">Tonight&apos;s dinner</p>
                  <p className="font-display text-lg font-bold text-harbor">{tonight.title}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reminders banner */}
        {dueReminders.length > 0 && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <Bell className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-800">Don&apos;t forget</p>
              <ul className="text-sm text-amber-800">
                {dueReminders.map((r) => (
                  <li key={r.id}>• {r.title}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div className="mb-4 space-y-2">
            {messages.map((m) => (
              <div key={m.id} className="flex items-start gap-3 rounded-2xl border border-beacon/30 bg-beacon-soft/40 p-4">
                <span className="text-2xl">{m.emoji ?? (m.pinned ? "📌" : "💬")}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-ink">{m.body}</p>
                  {m.author_label && <p className="mt-0.5 text-xs font-semibold text-muted">— {m.author_label}</p>}
                </div>
                {m.pinned && <Pin className="h-4 w-4 shrink-0 text-beacon" />}
              </div>
            ))}
          </div>
        )}

        {/* Children tiles */}
        <h2 className="mb-2 font-display text-lg font-bold text-harbor">Tap to start your day</h2>
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((c) => {
            const p = childProgress(c.id);
            return (
              <button
                key={c.id}
                onClick={() => onSelectChild(c.id)}
                style={{ borderLeftColor: childColor(c) }}
                className="kiosk-tap flex items-center gap-4 rounded-3xl border-2 border-l-8 border-harbor-100 bg-white p-5 text-left transition active:scale-[0.99]"
              >
                <span
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-4xl"
                  style={{ backgroundColor: childColor(c) + "22", boxShadow: `inset 0 0 0 2px ${childColor(c)}` }}
                >
                  {c.avatar ?? "🙂"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-2xl font-extrabold text-harbor">{c.name}</p>
                  <p className="flex items-center gap-2 text-sm text-muted">
                    {p.total > 0 ? `${p.done}/${p.total} steps` : "No routine yet"}
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-4 w-4 fill-beacon text-beacon" /> {p.points}
                    </span>
                  </p>
                </div>
                <ChevronRight className="h-6 w-6 text-muted" />
              </button>
            );
          })}
        </div>

        {/* Today agenda */}
        <button
          onClick={onOpenCalendar}
          className="mb-4 flex w-full items-center justify-between rounded-2xl border border-harbor-100 bg-white p-4 text-left"
        >
          <div className="min-w-0 flex-1">
            <p className="mb-1 flex items-center gap-2 font-display text-lg font-bold text-harbor">
              <CalendarDays className="h-5 w-5" /> Today
            </p>
            {todays.length === 0 ? (
              <p className="text-sm text-muted">Nothing scheduled. Enjoy the calm.</p>
            ) : (
              <ul className="space-y-1 text-sm text-ink">
                {todays.map((e) => (
                  <li key={e.id} className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: eventColor(e, childrenById) }}
                    />
                    <span className="font-semibold text-water">{formatEventTime(e)}</span>
                    <span>{e.emoji} {e.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
        </button>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-3">
          <QuickAction icon={CalendarDays} label="Calendar" onClick={onOpenCalendar} />
          <QuickAction
            icon={ListChecks}
            label={groceriesLeft > 0 ? `List · ${groceriesLeft}` : "List"}
            onClick={onOpenLists}
          />
          <QuickAction icon={Heart} label="Calm" onClick={onOpenCalm} accent />
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
  accent = false,
}: {
  icon: typeof Heart;
  label: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "kiosk-tap flex flex-col items-center justify-center gap-1.5 rounded-2xl py-5 font-bold transition active:scale-[0.98]",
        accent ? "bg-beacon text-harbor" : "bg-white text-harbor border border-harbor-100",
      )}
    >
      <Icon className="h-7 w-7" />
      <span className="text-sm">{label}</span>
    </button>
  );
}
