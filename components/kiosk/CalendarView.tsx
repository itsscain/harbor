"use client";

import { useMemo, useRef, useState, useEffect, type ReactNode } from "react";
import { MapPin, ChevronLeft, ChevronRight, X, Repeat, User, Flag, Volume2, Cloud } from "lucide-react";
import type { useKiosk } from "./useKiosk";
import { eventsForDay, occursOn, formatEventTime } from "@/lib/kiosk/calendar";
import { tzFromSettings, dayKeyInTz, minutesIntoDayInTz } from "@/lib/tz";
import { childColor, eventColor } from "@/lib/kiosk/colors";
import type { KioskEvent, KioskChild } from "@/lib/kiosk/types";
import { speak, haptic, HAPTIC } from "@/lib/kiosk/feedback";
import { ChildAvatar } from "./ChildAvatar";
import { KIconButton } from "./ui";
import { cn } from "@/lib/cn";

type Kiosk = ReturnType<typeof useKiosk>;
type View = "agenda" | "day" | "week" | "month";

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function startOfWeek(d: Date) { return addDays(startOfDay(d), -d.getDay()); }
function sameDate(a: Date, b: Date) { return a.toDateString() === b.toDateString(); }
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR_H = 60;

function fmtHour(h: number) {
  const am = h < 12 || h === 24;
  const hr = ((h + 11) % 12) + 1;
  return `${hr} ${am ? "AM" : "PM"}`;
}

function isAllDayish(e: KioskEvent, tz: string): boolean {
  if (e.all_day) return true;
  const end = e.ends_at ? new Date(e.ends_at) : null;
  return !!end && dayKeyInTz(new Date(e.starts_at), tz) !== dayKeyInTz(end, tz);
}

function eventMinutes(e: KioskEvent, tz: string): { start: number; end: number } {
  const s = new Date(e.starts_at);
  const start = minutesIntoDayInTz(s, tz);
  let end = start + 60;
  if (e.ends_at) {
    const en = new Date(e.ends_at);
    end = dayKeyInTz(s, tz) === dayKeyInTz(en, tz) ? minutesIntoDayInTz(en, tz) : 24 * 60;
  }
  return { start, end: Math.max(end, start + 30) };
}

type Laid = { e: KioskEvent; start: number; end: number; col: number; cols: number };

function layoutDay(events: KioskEvent[], tz: string): Laid[] {
  const items = events
    .filter((e) => !isAllDayish(e, tz))
    .map((e) => ({ e, ...eventMinutes(e, tz), col: 0, cols: 1 }))
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const out: Laid[] = [];
  let cluster: Laid[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const colEnds: number[] = [];
    for (const it of cluster) {
      let placed = false;
      for (let c = 0; c < colEnds.length; c++) {
        if (it.start >= colEnds[c]) { it.col = c; colEnds[c] = it.end; placed = true; break; }
      }
      if (!placed) { it.col = colEnds.length; colEnds.push(it.end); }
    }
    for (const it of cluster) { it.cols = colEnds.length; out.push(it); }
    cluster = []; clusterEnd = -1;
  };
  for (const it of items) {
    if (cluster.length && it.start >= clusterEnd) flush();
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.end);
  }
  if (cluster.length) flush();
  return out;
}

export function CalendarView({ kiosk }: { kiosk: Kiosk; onHome?: () => void }) {
  const snap = kiosk.state?.snapshot;
  const tz = tzFromSettings((snap?.household?.settings ?? null) as Record<string, unknown> | null);
  const events = useMemo(() => snap?.events ?? [], [snap]);
  const children = useMemo(() => [...(snap?.children ?? [])].sort((a, b) => a.sort_order - b.sort_order), [snap]);
  const childrenById = useMemo(() => new Map(children.map((c) => [c.id, c])), [children]);

  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [filter, setFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<KioskEvent | null>(null);
  const selChild = selected?.child_id ? children.find((c) => c.id === selected.child_id) ?? null : null;
  // If a sync removes the open event, close the detail overlay so it never shows stale data.
  useEffect(() => {
    if (selected && !events.some((e) => e.id === selected.id)) setSelected(null);
  }, [events, selected]);

  const dayEvents = (d: Date): KioskEvent[] => {
    const evs = eventsForDay(events, d, tz);
    return filter ? evs.filter((e) => e.child_id === filter) : evs;
  };
  const allDayFor = (d: Date): KioskEvent[] => {
    const day = dayKeyInTz(d, tz);
    return events.filter((e) => {
      if (filter && e.child_id !== filter) return false;
      if (!isAllDayish(e, tz)) return false;
      const s = dayKeyInTz(new Date(e.starts_at), tz);
      const en = e.ends_at ? dayKeyInTz(new Date(e.ends_at), tz) : s;
      return (day >= s && day <= en) || occursOn(e, d, tz);
    });
  };

  function shift(dir: number) {
    if (view === "month") { const x = new Date(anchor); x.setMonth(x.getMonth() + dir); setAnchor(startOfDay(x)); }
    else if (view === "week") setAnchor(addDays(anchor, dir * 7));
    else setAnchor(addDays(anchor, dir));
  }

  const title =
    view === "month"
      ? anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : view === "week"
        ? `${startOfWeek(anchor).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${addDays(startOfWeek(anchor), 6).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
        : anchor.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const weekDays = useMemo(() => {
    const s = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => addDays(s, i));
  }, [anchor]);

  return (
    <div
      className="animate-enter flex h-dvh flex-col overflow-hidden bg-kbg pb-[84px] text-ktext"
      style={
        filter
          ? { background: `linear-gradient(180deg, ${childColor(children.find((c) => c.id === filter))}1c, var(--color-kbg) 42%)` }
          : undefined
      }
    >
      <header className="flex items-center justify-between gap-3 border-b border-kline/50 bg-kbg2/80 px-4 py-3 backdrop-blur-md sm:px-6">
        <span className="font-display text-2xl font-bold text-ktext">Calendar</span>
        <div className="flex items-center gap-1 rounded-full bg-kpanel p-1 ring-1 ring-kline/55">
          {(["day", "week", "month", "agenda"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-current={view === v ? "page" : undefined}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-bold capitalize transition active:scale-[0.97]",
                view === v ? "bg-kwater text-harbor shadow-k" : "text-kmute hover:text-ktext",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </header>

      {/* Per-person filter chips */}
      {children.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-kline/50 bg-kpanel px-4 py-2.5">
          <button
            onClick={() => {
              haptic(HAPTIC.toggle);
              setFilter(null);
            }}
            className={cn(
              "kiosk-tap rounded-full px-3 py-1.5 text-sm font-semibold transition",
              filter === null ? "bg-kwater text-harbor" : "bg-kraise text-ktext",
            )}
          >
            Everyone
          </button>
          {children.map((c) => {
            const active = filter === c.id;
            return (
              <button
                key={c.id}
                onClick={() => {
                  haptic(HAPTIC.toggle);
                  setFilter(active ? null : c.id);
                }}
                className={cn(
                  "flex items-center gap-2 rounded-full py-1 pl-1 pr-3.5 text-sm font-medium transition",
                  active ? "text-white" : "bg-kraise text-ktext hover:brightness-125",
                )}
                style={active ? { backgroundColor: childColor(c) } : undefined}
              >
                <ChildAvatar child={c} size={26} rounded="rounded-full" />
                {c.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Navigation */}
      {view !== "agenda" && (
        <div className="flex items-center justify-between px-4 py-2.5">
          <button onClick={() => shift(-1)} className="kiosk-tap rounded-xl bg-kpanel p-2 text-ktext ring-1 ring-kline/55 transition hover:brightness-125" aria-label="Previous">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={() => setAnchor(startOfDay(new Date()))} aria-label="Jump to today" className="font-display text-lg font-bold text-ktext transition hover:text-kwater">
            {title}
          </button>
          <button onClick={() => shift(1)} className="kiosk-tap rounded-xl bg-kpanel p-2 text-ktext ring-1 ring-kline/55 transition hover:brightness-125" aria-label="Next">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      <main className="min-h-0 flex-1 overflow-hidden p-3 sm:p-4">
        {view === "agenda" && (
          <div className="mx-auto h-full max-w-3xl overflow-y-auto">
            <AgendaView events={events} filter={filter} childrenById={childrenById} tz={tz} onOpen={setSelected} />
          </div>
        )}
        {view === "day" && (
          <TimeGrid days={[anchor]} dayEvents={dayEvents} allDayFor={allDayFor} childrenById={childrenById} tz={tz} onOpen={setSelected} />
        )}
        {view === "week" && (
          <TimeGrid days={weekDays} dayEvents={dayEvents} allDayFor={allDayFor} childrenById={childrenById} tz={tz} onOpen={setSelected} onPickDay={(d) => { setAnchor(d); setView("day"); }} />
        )}
        {view === "month" && (
          <div className="mx-auto h-full max-w-5xl overflow-y-auto">
            <MonthGrid anchor={anchor} dayEvents={dayEvents} childrenById={childrenById} onPickDay={(d) => { setAnchor(d); setView("day"); }} />
          </div>
        )}
      </main>

      {selected && (
        <EventDetail
          event={selected}
          child={selChild}
          color={eventColor(selected, childrenById)}
          tz={tz}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function TimeGrid({
  days,
  dayEvents,
  allDayFor,
  childrenById,
  tz,
  onOpen,
  onPickDay,
}: {
  days: Date[];
  dayEvents: (d: Date) => KioskEvent[];
  allDayFor: (d: Date) => KioskEvent[];
  childrenById: Map<string, { id: string; color?: string | null }>;
  tz: string;
  onOpen?: (e: KioskEvent) => void;
  onPickDay?: (d: Date) => void;
}) {
  const now = new Date();
  const today = startOfDay(now);

  const { from, to } = useMemo(() => {
    let lo = 8, hi = 18;
    for (const d of days) {
      for (const e of dayEvents(d)) {
        if (isAllDayish(e, tz)) continue;
        const { start, end } = eventMinutes(e, tz);
        lo = Math.min(lo, Math.floor(start / 60));
        hi = Math.max(hi, Math.ceil(end / 60));
      }
    }
    return { from: Math.max(0, Math.min(lo, 7)), to: Math.min(24, Math.max(hi, 20)) };
  }, [days, dayEvents]);

  const hours = Array.from({ length: to - from }, (_, i) => from + i);
  const gridHeight = (to - from) * HOUR_H;

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nowMin = now.getHours() * 60 + now.getMinutes();
    // Reveal events even when they're earlier than "now": anchor the scroll to the
    // earliest event of the shown days (or now, whichever is earlier) so a morning
    // event is never hidden above the fold.
    let earliest = Infinity;
    for (const d of days) {
      for (const e of dayEvents(d)) {
        if (isAllDayish(e, tz)) continue;
        earliest = Math.min(earliest, eventMinutes(e, tz).start);
      }
    }
    const target = Number.isFinite(earliest) ? Math.min(nowMin, earliest) : nowMin;
    const y = ((target - from * 60) / 60) * HOUR_H - 40;
    el.scrollTop = Math.max(0, y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const hasAllDay = days.some((d) => allDayFor(d).length > 0);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl bg-kpanel shadow-k ring-1 ring-kline/55">
      {/* Day headers */}
      <div className="flex border-b border-kline/50" style={{ paddingRight: 6 }}>
        <div className="w-12 shrink-0 sm:w-14" />
        {days.map((d) => {
          const isToday = sameDate(d, today);
          return (
            <button
              key={d.toISOString()}
              onClick={() => onPickDay?.(d)}
              className={cn("flex flex-1 flex-col items-center gap-0.5 py-2 transition", onPickDay && "hover:bg-kraise")}
            >
              <span className={cn("text-xs font-semibold", isToday ? "text-kwater" : "text-kmute")}>{DOW[d.getDay()]}</span>
              <span
                className={cn(
                  "flex h-8 min-w-8 items-center justify-center rounded-full px-2 font-display text-lg font-bold",
                  isToday ? "bg-kwater text-harbor" : "text-ktext",
                )}
              >
                {d.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      {/* All-day / multi-day row */}
      {hasAllDay && (
        <div className="flex border-b border-kline/50 bg-kraise" style={{ paddingRight: 6 }}>
          <div className="flex w-12 shrink-0 items-center justify-end pr-1.5 text-[10px] font-semibold uppercase text-kmute sm:w-14">All-day</div>
          {days.map((d) => (
            <div key={d.toISOString()} className="flex-1 space-y-1 px-1 py-1.5">
              {allDayFor(d).map((e) => {
                const color = eventColor(e, childrenById);
                return (
                  <button
                    key={e.id}
                    onClick={() => onOpen?.(e)}
                    className="block w-full truncate rounded-md px-1.5 py-1 text-left text-xs font-semibold text-ktext"
                    style={{ background: color + "33", borderLeft: `3px solid ${color}` }}
                  >
                    {e.emoji ? `${e.emoji} ` : ""}{e.title}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto">
        <div className="flex" style={{ height: gridHeight, paddingRight: 6 }}>
          <div className="relative w-12 shrink-0 sm:w-14">
            {hours.map((h, i) => (
              <div key={h} className="absolute right-1.5 -translate-y-1/2 text-[11px] font-medium text-kmute" style={{ top: i * HOUR_H }}>
                {i === 0 ? "" : fmtHour(h)}
              </div>
            ))}
          </div>

          {days.map((d) => {
            const laid = layoutDay(dayEvents(d), tz);
            const isToday = sameDate(d, today);
            const nowMin = now.getHours() * 60 + now.getMinutes();
            const nowTop = ((nowMin - from * 60) / 60) * HOUR_H;
            const showNow = isToday && nowMin >= from * 60 && nowMin <= to * 60;
            return (
              <div key={d.toISOString()} className="relative flex-1 border-l border-kline-soft">
                {hours.map((h, i) => (
                  <div key={h} className="absolute inset-x-0 border-t border-kline-soft" style={{ top: i * HOUR_H }} />
                ))}

                {laid.map(({ e, start, end, col, cols }) => {
                  const color = eventColor(e, childrenById);
                  const top = ((start - from * 60) / 60) * HOUR_H;
                  const height = Math.max(26, ((end - start) / 60) * HOUR_H - 2);
                  const widthPct = 100 / cols;
                  const tall = height >= 44;
                  return (
                    <button
                      key={e.id}
                      onClick={() => onOpen?.(e)}
                      className="absolute overflow-hidden rounded-lg px-1.5 py-1 text-left transition active:scale-[0.98]"
                      style={{
                        top,
                        height,
                        left: `calc(${col * widthPct}% + 2px)`,
                        width: `calc(${widthPct}% - 4px)`,
                        background: color + "33",
                        borderLeft: `3px solid ${color}`,
                      }}
                    >
                      <span className="block truncate text-xs font-bold leading-tight text-ktext">
                        {e.emoji ? `${e.emoji} ` : ""}{e.title}
                      </span>
                      {tall && <span className="block truncate text-[10px] leading-tight text-kmute">{formatEventTime(e, tz)}</span>}
                    </button>
                  );
                })}

                {showNow && (
                  <div className="pointer-events-none absolute inset-x-0 z-10" style={{ top: nowTop }}>
                    <div className="relative h-0 border-t-2 border-red-500">
                      <span className="absolute -left-1 -top-[5px] h-2.5 w-2.5 rounded-full bg-red-500" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EventRow({ event, color, tz, onOpen }: { event: KioskEvent; color: string; tz: string; onOpen: (e: KioskEvent) => void }) {
  return (
    <button
      onClick={() => onOpen(event)}
      className="flex w-full items-center gap-3 rounded-xl bg-kpanel p-4 text-left shadow-k ring-1 ring-kline/55 transition active:scale-[0.99]"
      style={{ borderLeft: `6px solid ${color}` }}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl" style={{ backgroundColor: color + "33" }}>
        {event.emoji ?? "📅"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg font-bold text-ktext">{event.title}</p>
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-kmute">
          <span className="font-semibold text-kwater">{formatEventTime(event, tz)}</span>
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
  tz,
  onOpen,
}: {
  events: KioskEvent[];
  filter: string | null;
  childrenById: Map<string, { id: string; color?: string | null }>;
  tz: string;
  onOpen: (e: KioskEvent) => void;
}) {
  const base = startOfDay(new Date());
  const days: { date: Date; evs: KioskEvent[] }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = addDays(base, i);
    let evs = eventsForDay(events, d, tz);
    if (filter) evs = evs.filter((e) => e.child_id === filter);
    if (evs.length) days.push({ date: d, evs });
  }
  if (days.length === 0) {
    return <div className="rounded-xl bg-kpanel p-5 text-center text-kmute shadow-k ring-1 ring-kline/55">Nothing scheduled. Enjoy the calm. 🌊</div>;
  }
  return (
    <div className="space-y-5 pb-4">
      {days.map(({ date, evs }) => (
        <div key={date.toISOString()}>
          <p className="mb-1.5 text-sm font-semibold text-kmute">
            {date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </p>
          <div className="space-y-2">
            {evs.map((e) => <EventRow key={e.id} event={e} color={eventColor(e, childrenById)} tz={tz} onOpen={onOpen} />)}
          </div>
        </div>
      ))}
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
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-kmute">
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
                "flex min-h-16 flex-col rounded-lg border p-1 text-left transition hover:border-kwater/50 sm:min-h-20",
                isToday ? "border-kwater bg-kpanel" : inMonth ? "border-kline/55 bg-kpanel" : "border-transparent bg-kpanel/30",
              )}
            >
              <span className={cn("text-xs font-bold", isToday ? "text-kwater" : inMonth ? "text-ktext" : "text-kmute/50")}>
                {d.getDate()}
              </span>
              <div className="mt-0.5 flex flex-wrap gap-0.5">
                {evs.slice(0, 5).map((e) => (
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

function recurrenceLabel(rule: string): string | null {
  if (!rule) return null;
  if (rule === "daily") return "Repeats every day";
  if (rule === "weekdays") return "Every weekday";
  if (rule === "weekly" || rule.startsWith("weekly:")) return "Repeats weekly";
  if (rule === "monthly") return "Repeats monthly";
  return "Repeats";
}

/** Skylight-style event detail — tap any event to see the full picture.
 *  Bottom-sheet on the wall, centered on wider screens. Reads itself aloud on
 *  open; closes on Done, the X, the backdrop, or Esc. */
function EventDetail({
  event,
  child,
  color,
  tz,
  onClose,
}: {
  event: KioskEvent;
  child: KioskChild | null;
  color: string;
  tz: string;
  onClose: () => void;
}) {
  const dateStr = new Date(event.starts_at).toLocaleDateString("en-US", { timeZone: tz, weekday: "long", month: "long", day: "numeric" });
  const allDay = isAllDayish(event, tz);
  const timeStr = allDay ? "All day" : formatEventTime(event, tz);
  const recurrence = recurrenceLabel(event.recurrence_rule ?? "");
  const spoken =
    `${event.title}. ${dateStr}. ${timeStr}.` +
    (event.person_label ? ` ${event.person_label}.` : "") +
    (event.location ? ` At ${event.location}.` : "") +
    (event.responsible_label ? ` ${event.responsible_label}.` : "");

  useEffect(() => {
    speak(spoken);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows: { key: string; node: ReactNode }[] = [];
  if (child) rows.push({ key: "child", node: (<><ChildAvatar child={child} size={22} rounded="rounded-full" /><span>{child.name}</span></>) });
  if (event.person_label && event.person_label !== child?.name)
    rows.push({ key: "person", node: (<><User className="h-4 w-4 text-kmute" /><span>{event.person_label}</span></>) });
  if (event.location) rows.push({ key: "loc", node: (<><MapPin className="h-4 w-4 text-kmute" /><span>{event.location}</span></>) });
  if (event.responsible_label) rows.push({ key: "resp", node: (<><Flag className="h-4 w-4 text-kmute" /><span>{event.responsible_label}</span></>) });
  if (recurrence) rows.push({ key: "rec", node: (<><Repeat className="h-4 w-4 text-kmute" /><span>{recurrence}</span></>) });

  return (
    <div
      onClick={onClose}
      className="animate-enter fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={event.title}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-2xl bg-kpanel shadow-k-pop ring-1 ring-kline/55 sm:rounded-2xl"
        style={{ borderTop: `4px solid ${color}` }}
      >
        <div className="flex items-start gap-3 p-5">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl" style={{ backgroundColor: color + "33" }}>
            {event.emoji ?? "📅"}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="break-words font-display text-2xl font-bold leading-tight text-ktext">{event.title}</h2>
            <p className="mt-1 text-sm font-semibold text-kwater">{dateStr} · {timeStr}</p>
            {event.google_event_id && (
              <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-kmute">
                <Cloud className="h-3.5 w-3.5" /> Synced from Google Calendar
              </p>
            )}
          </div>
          <KIconButton onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </KIconButton>
        </div>

        {rows.length > 0 && (
          <div className="space-y-2.5 border-t border-kline/50 px-5 py-4">
            {rows.map((r) => (
              <div key={r.key} className="flex items-center gap-2.5 text-sm text-ktext">
                {r.node}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 border-t border-kline/50 p-4">
          <button
            onClick={() => speak(spoken)}
            aria-label="Read aloud"
            className="kiosk-tap flex items-center justify-center gap-2 rounded-xl bg-kraise px-4 text-sm font-medium text-ktext ring-1 ring-kline/55 transition hover:brightness-125 active:scale-[0.98]"
          >
            <Volume2 className="h-5 w-5 text-kwater" /> Read aloud
          </button>
          <button
            onClick={onClose}
            className="kiosk-tap flex-1 rounded-xl bg-kwater py-3 text-sm font-semibold text-harbor transition hover:brightness-105 active:scale-[0.98]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
