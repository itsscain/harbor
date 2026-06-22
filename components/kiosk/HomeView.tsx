"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Bell, Pin, ChevronRight, Lock, ScrollText } from "lucide-react";
import type { useKiosk } from "./useKiosk";
import { todayKey } from "@/lib/kiosk/db";
import { eventsForDay, formatEventTime } from "@/lib/kiosk/calendar";
import { eventColor } from "@/lib/kiosk/colors";
import { nextBirthday } from "@/lib/kiosk/birthday";
import { WeatherWidget } from "./WeatherWidget";
import { ChoresBoard } from "./ChoresBoard";
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
  onOpenHouseRules,
  onParentMenu,
}: {
  kiosk: Kiosk;
  onSelectChild: (id: string) => void;
  onOpenCalendar: () => void;
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

  return (
    <div className="animate-enter mx-auto w-full max-w-6xl px-5 pb-28 pt-6 sm:px-8 sm:pt-8">
      {/* Header */}
      <header className="mb-7 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{greeting}</h1>
          <p className="mt-1 text-sm text-kmute">
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {weather?.lat != null && weather?.lon != null && (
            <WeatherWidget lat={weather.lat} lon={weather.lon} label={weather.label} />
          )}
          <p className="font-display text-3xl font-bold tabular-nums leading-none sm:text-4xl">
            {now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </p>
          <KButton variant="tonal" size="sm" onClick={onParentMenu} aria-label="Parents" className="w-10 px-0">
            <Lock className="h-4 w-4" />
          </KButton>
        </div>
      </header>

      {/* Highlight row */}
      {(nextCountdown || tonight) && (
        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          {nextCountdown && (
            <KCard className="flex items-center gap-4 bg-beacon/10 p-4 ring-beacon/25">
              <span className="text-3xl">{nextCountdown.emoji}</span>
              <div className="min-w-0">
                <p className="font-display text-lg font-bold text-beacon">
                  {nextCountdown.days === 0 ? "Today!" : `${nextCountdown.days} ${nextCountdown.days === 1 ? "sleep" : "sleeps"} to go`}
                </p>
                <p className="truncate text-sm text-kmute">{nextCountdown.title}</p>
              </div>
            </KCard>
          )}
          {tonight && (
            <KCard className="flex items-center gap-4 p-4">
              <span className="text-3xl">{tonight.emoji ?? "🍽️"}</span>
              <div className="min-w-0">
                <KEyebrow>Tonight&apos;s dinner</KEyebrow>
                <p className="mt-1 truncate font-display text-lg font-bold text-ktext">{tonight.title}</p>
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

      {/* Chores / task tracking — tap a chip to check off, tap a kid to open their screen */}
      <div className="mb-3 flex items-center justify-between">
        <KEyebrow>Chores today</KEyebrow>
        <span className="text-xs text-kmute">Tap to check off</span>
      </div>
      <div className="mb-6">
        <ChoresBoard kiosk={kiosk} onSelectChild={onSelectChild} variant="home" />
      </div>

      {/* Today agenda */}
      <button
        onClick={onOpenCalendar}
        className="flex w-full items-center justify-between gap-3 rounded-xl bg-kpanel p-4 text-left shadow-k ring-1 ring-kline/55 transition hover:brightness-110 active:scale-[0.99]"
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

      {(state.snapshot.house_rules ?? []).length > 0 && (
        <button
          onClick={onOpenHouseRules}
          className="mt-3 flex w-full items-center justify-between gap-3 rounded-xl bg-kpanel p-4 text-left shadow-k ring-1 ring-kline/55 transition hover:brightness-110 active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
              <ScrollText className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-lg font-bold text-ktext">House Rules</p>
              <p className="text-sm text-kmute">Our rules &amp; what happens</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-kmute" />
        </button>
      )}
    </div>
  );
}
