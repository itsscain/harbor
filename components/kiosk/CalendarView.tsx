"use client";

import { useMemo, useState } from "react";
import { Home as HomeIcon, MapPin, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import type { useKiosk } from "./useKiosk";
import { eventsForDay, formatEventTime } from "@/lib/kiosk/calendar";
import { childColor, eventColor } from "@/lib/kiosk/colors";
import type { KioskEvent } from "@/lib/kiosk/types";
import { speak } from "@/lib/kiosk/feedback";
import { cn } from "@/lib/cn";

type Kiosk = ReturnType<typeof useKiosk>;
type View = "agenda" | "day" | "week" | "month";

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function startOfWeek(d: Date) { return addDays(startOfDay(d), -d.getDay()); }
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarView({ kiosk, onHome }: { kiosk: Kiosk; onHome: () => void }) {
  const snap = kiosk.state?.snapshot;
  const events = useMemo(() => snap?.events ?? [], [snap]);
  const children = useMemo(() => [...(snap?.children ?? [])].sort((a, b) => a.sort_order - b.sort_order), [snap]);
  const childrenById = useMemo(() => new Map(children.map((c) => [c.id, c])), [children]);

  const [view, setView] = useState<View>("agenda");
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [filter, setFilter] = useState<string | null>(null);

  const dayEvents = (d: Date): KioskEvent[] => {
    const evs = eventsForDay(events, d);
    return filter ? evs.filter((e) => e.child_id === filter) : evs;
  };

  function shift(dir: number) {
    if (view === "month") {
      const x = new Date(anchor);
      x.setMonth(x.getMonth() + dir);
      setAnchor(startOfDay(x));
    } else if (view === "week") {
      setAnchor(addDays(anchor, dir * 7));
    } else {
      setAnchor(addDays(anchor, dir));
    }
  }

  const title =
    view === "month"
      ? anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : view === "week"
        ? `${startOfWeek(anchor).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${addDays(startOfWeek(anchor), 6).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
        : anchor.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="flex min-h-full flex-col bg-seafog">
      <header className="flex items-center justify-between bg-harbor px-4 py-3 text-white">
        <button onClick={onHome} className="kiosk-tap flex items-center gap-2 rounded-2xl bg-white/15 px-3 py-2 font-semibold">
          <HomeIcon className="h-5 w-5" /> Home
        </button>
        <span className="font-display text-xl font-bold">Family Calendar</span>
        <span className="w-20" />
      </header>

      {/* View toggle */}
      <div className="flex items-center justify-center gap-1 px-4 pt-3">
        {(["agenda", "day", "week", "month"] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            aria-current={view === v ? "page" : undefined}
            className={cn(
              "kiosk-tap rounded-full px-4 py-2 text-sm font-semibold capitalize",
              view === v ? "bg-harbor text-white" : "bg-white text-harbor",
            )}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Per-person legend / filter */}
      {children.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
          <button
            onClick={() => setFilter(null)}
            className={cn(
              "kiosk-tap rounded-full px-3 py-1.5 text-sm font-semibold",
              filter === null ? "bg-water text-white" : "bg-white text-harbor",
            )}
          >
            Everyone
          </button>
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilter(filter === c.id ? null : c.id)}
              className={cn(
                "kiosk-tap flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold",
                filter === c.id ? "text-white" : "bg-white text-harbor",
              )}
              style={filter === c.id ? { backgroundColor: childColor(c) } : undefined}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: childColor(c) }} />
              {c.avatar} {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Navigation (not for agenda) */}
      {view !== "agenda" && (
        <div className="flex items-center justify-between px-4 pt-3">
          <button onClick={() => shift(-1)} className="kiosk-tap rounded-xl bg-white p-2 text-harbor" aria-label="Previous">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={() => setAnchor(startOfDay(new Date()))} className="font-display text-lg font-bold text-harbor">
            {title}
          </button>
          <button onClick={() => shift(1)} className="kiosk-tap rounded-xl bg-white p-2 text-harbor" aria-label="Next">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6">
        {view === "agenda" && <AgendaView events={events} filter={filter} childrenById={childrenById} />}
        {view === "day" && <DayList date={anchor} events={dayEvents(anchor)} childrenById={childrenById} />}
        {view === "week" && (
          <WeekGrid anchor={anchor} dayEvents={dayEvents} childrenById={childrenById} onPickDay={(d) => { setAnchor(d); setView("day"); }} />
        )}
        {view === "month" && (
          <MonthGrid anchor={anchor} dayEvents={dayEvents} childrenById={childrenById} onPickDay={(d) => { setAnchor(d); setView("day"); }} />
        )}
      </main>
    </div>
  );
}

function EventRow({ event, color }: { event: KioskEvent; color: string }) {
  return (
    <button
      onClick={() => speak(`${event.title} at ${formatEventTime(event)}`)}
      className="flex w-full items-center gap-3 rounded-2xl border border-harbor-100 bg-white p-4 text-left"
      style={{ borderLeft: `6px solid ${color}` }}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl" style={{ backgroundColor: color + "22" }}>
        {event.emoji ?? "📅"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg font-bold text-harbor">{event.title}</p>
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
          <span className="font-semibold">{formatEventTime(event)}</span>
          {event.person_label && <span>· {event.person_label}</span>}
          {event.location && (
            <span className="inline-flex items-center gap-0.5">· <MapPin className="h-3.5 w-3.5" /> {event.location}</span>
          )}
        </p>
      </div>
    </button>
  );
}

function AgendaView({
  events,
  filter,
  childrenById,
}: {
  events: KioskEvent[];
  filter: string | null;
  childrenById: Map<string, { id: string; color?: string | null }>;
}) {
  const base = startOfDay(new Date());
  const days: { date: Date; evs: KioskEvent[] }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = addDays(base, i);
    let evs = eventsForDay(events, d);
    if (filter) evs = evs.filter((e) => e.child_id === filter);
    if (evs.length) days.push({ date: d, evs });
  }
  if (days.length === 0) {
    return <div className="rounded-2xl border border-harbor-100 bg-white p-6 text-center text-muted">Nothing scheduled. Enjoy the calm. 🌊</div>;
  }
  return (
    <div className="space-y-5">
      {days.map(({ date, evs }) => (
        <div key={date.toISOString()}>
          <p className="mb-1.5 text-sm font-semibold text-muted">
            {date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </p>
          <div className="space-y-2">
            {evs.map((e) => <EventRow key={e.id} event={e} color={eventColor(e, childrenById)} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function DayList({
  date,
  events,
  childrenById,
}: {
  date: Date;
  events: KioskEvent[];
  childrenById: Map<string, { id: string; color?: string | null }>;
}) {
  if (events.length === 0) {
    return <div className="rounded-2xl border border-harbor-100 bg-white p-6 text-center text-muted">Nothing on {date.toLocaleDateString("en-US", { weekday: "long" })}.</div>;
  }
  return (
    <div className="space-y-2">
      {events.map((e) => <EventRow key={e.id} event={e} color={eventColor(e, childrenById)} />)}
    </div>
  );
}

function Chip({ event, color }: { event: KioskEvent; color: string }) {
  return (
    <div
      className="truncate rounded px-1.5 py-0.5 text-left text-xs font-medium text-ink"
      style={{ background: color + "22", borderLeft: `3px solid ${color}` }}
    >
      {!event.all_day && <span className="text-[10px] text-muted">{formatEventTime(event)} </span>}
      {event.emoji} {event.title}
    </div>
  );
}

function WeekGrid({
  anchor,
  dayEvents,
  childrenById,
  onPickDay,
}: {
  anchor: Date;
  dayEvents: (d: Date) => KioskEvent[];
  childrenById: Map<string, { id: string; color?: string | null }>;
  onPickDay: (d: Date) => void;
}) {
  const start = startOfWeek(anchor);
  const today = startOfDay(new Date()).getTime();
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {Array.from({ length: 7 }).map((_, i) => {
        const d = addDays(start, i);
        const evs = dayEvents(d);
        const isToday = d.getTime() === today;
        return (
          <button
            key={i}
            onClick={() => onPickDay(d)}
            className={cn("min-h-32 rounded-2xl border bg-white p-2 text-left", isToday ? "border-water" : "border-harbor-100")}
          >
            <p className={cn("mb-1 text-xs font-bold", isToday ? "text-water" : "text-muted")}>
              {DOW[d.getDay()]} {d.getDate()}
            </p>
            <div className="space-y-1">
              {evs.slice(0, 4).map((e) => <Chip key={e.id} event={e} color={eventColor(e, childrenById)} />)}
              {evs.length > 4 && <p className="text-[11px] text-muted">+{evs.length - 4} more</p>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function MonthGrid({
  anchor,
  dayEvents,
  childrenById,
  onPickDay,
}: {
  anchor: Date;
  dayEvents: (d: Date) => KioskEvent[];
  childrenById: Map<string, { id: string; color?: string | null }>;
  onPickDay: (d: Date) => void;
}) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = addDays(startOfDay(first), -first.getDay());
  const today = startOfDay(new Date()).getTime();
  const month = anchor.getMonth();
  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted">
        {DOW.map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 42 }).map((_, i) => {
          const d = addDays(gridStart, i);
          const evs = dayEvents(d);
          const inMonth = d.getMonth() === month;
          const isToday = d.getTime() === today;
          return (
            <button
              key={i}
              onClick={() => onPickDay(d)}
              className={cn(
                "flex min-h-16 flex-col rounded-lg border p-1 text-left sm:min-h-20",
                isToday ? "border-water bg-white" : inMonth ? "border-harbor-100 bg-white" : "border-transparent bg-white/40",
              )}
            >
              <span className={cn("text-xs font-bold", isToday ? "text-water" : inMonth ? "text-ink" : "text-muted/50")}>
                {d.getDate()}
              </span>
              <div className="mt-0.5 flex flex-wrap gap-0.5">
                {evs.slice(0, 4).map((e) => (
                  <span key={e.id} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: eventColor(e, childrenById) }} />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
