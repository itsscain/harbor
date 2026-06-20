"use client";

import { Home as HomeIcon, MapPin, CalendarDays } from "lucide-react";
import type { useKiosk } from "./useKiosk";
import { eventsForDay, upcomingDays, formatEventTime } from "@/lib/kiosk/calendar";
import type { KioskEvent } from "@/lib/kiosk/types";
import { speak } from "@/lib/kiosk/feedback";

type Kiosk = ReturnType<typeof useKiosk>;

export function CalendarView({ kiosk, onHome }: { kiosk: Kiosk; onHome: () => void }) {
  const events = kiosk.state?.snapshot.events ?? [];
  const today = new Date();
  const todays = eventsForDay(events, today);
  const upcoming = upcomingDays(events, 7).filter((d) => d.date.getDate() !== today.getDate());

  return (
    <div className="flex min-h-full flex-col bg-seafog">
      <header className="flex items-center justify-between bg-harbor px-4 py-3 text-white">
        <button onClick={onHome} className="kiosk-tap flex items-center gap-2 rounded-2xl bg-white/15 px-3 py-2 font-semibold">
          <HomeIcon className="h-5 w-5" /> Home
        </button>
        <span className="font-display text-xl font-bold">Family Calendar</span>
        <span className="w-20" />
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 p-4 sm:p-6">
        <h1 className="font-display text-2xl font-extrabold text-harbor">
          {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </h1>
        <p className="mb-4 text-muted">Today</p>

        {todays.length === 0 ? (
          <div className="rounded-2xl border border-harbor-100 bg-white p-6 text-center text-muted">
            Nothing scheduled today — enjoy the calm. 🌊
          </div>
        ) : (
          <div className="space-y-2">
            {todays.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </div>
        )}

        {upcoming.length > 0 && (
          <>
            <h2 className="mb-2 mt-8 flex items-center gap-2 font-display text-lg font-bold text-harbor">
              <CalendarDays className="h-5 w-5" /> Coming up
            </h2>
            <div className="space-y-4">
              {upcoming.map(({ date, events: evs }) => (
                <div key={date.toISOString()}>
                  <p className="mb-1 text-sm font-semibold text-muted">
                    {date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                  </p>
                  <div className="space-y-2">
                    {evs.map((e) => (
                      <EventRow key={e.id} event={e} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function EventRow({ event }: { event: KioskEvent }) {
  return (
    <button
      onClick={() => speak(`${event.title} at ${formatEventTime(event)}`)}
      className="flex w-full items-center gap-3 rounded-2xl border border-harbor-100 bg-white p-4 text-left"
    >
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
        style={{ backgroundColor: (event.color ?? "#0c3b47") + "22" }}
      >
        {event.emoji ?? "📅"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg font-bold text-harbor">{event.title}</p>
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
          <span className="font-semibold">{formatEventTime(event)}</span>
          {event.person_label && <span>· {event.person_label}</span>}
          {event.location && (
            <span className="inline-flex items-center gap-0.5">
              · <MapPin className="h-3.5 w-3.5" /> {event.location}
            </span>
          )}
        </p>
      </div>
    </button>
  );
}
