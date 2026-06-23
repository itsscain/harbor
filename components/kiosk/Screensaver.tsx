"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Sparkles, CalendarDays, UtensilsCrossed, Pin, Gift, Star, ChevronRight, Lock } from "lucide-react";
import { LighthouseMark } from "@/components/brand/Logo";
import { WeatherWidget } from "./WeatherWidget";
import { ChildAvatar } from "./ChildAvatar";
import { eventsForDay, formatEventTime } from "@/lib/kiosk/calendar";
import { nextBirthday } from "@/lib/kiosk/birthday";
import { childColor } from "@/lib/kiosk/colors";
import type { useKiosk } from "./useKiosk";

type Kiosk = ReturnType<typeof useKiosk>;
type BriefMeal = { title: string; emoji: string | null; meal_type: string };

/** Render a plain-text brief, turning any **bold** spans into real bold (so a
 *  stray markdown asterisk never shows raw on the wall). */
function richText(text: string): ReactNode[] {
  return text
    .replace(/[#*_`]{3,}/g, "")
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, i) => {
      const m = /^\*\*([^*]+)\*\*$/.exec(part);
      return m ? <strong key={i} className="font-semibold text-white">{m[1]}</strong> : <span key={i}>{part}</span>;
    });
}

type Panel = { key: string; tint: string; icon: ReactNode; eyebrow: string; body: ReactNode };

/** Interactive idle screensaver — a calm, animated wall display that cycles
 *  flipping info panels (AI brief, dinner, today's agenda, notes, countdowns)
 *  and only unlocks via the button (so the family can glance without dismissing). */
export function Screensaver({
  kiosk,
  photos,
  onWake,
  deviceSecret,
}: {
  kiosk: Kiosk;
  photos: string[];
  onWake: () => void;
  deviceSecret?: string;
}) {
  const snap = kiosk.state?.snapshot;
  const [now, setNow] = useState(() => new Date());
  const [photoIdx, setPhotoIdx] = useState(0);
  const [panelIdx, setPanelIdx] = useState(0);
  const [brief, setBrief] = useState<string | null>(null);
  const [meals, setMeals] = useState<BriefMeal[]>([]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (photos.length < 2) return;
    const id = setInterval(() => setPhotoIdx((i) => (i + 1) % photos.length), 14000);
    return () => clearInterval(id);
  }, [photos.length]);

  // Today's AI brief + meals (server keeps the key; generated at most once/day).
  useEffect(() => {
    if (!deviceSecret) return;
    const d = new Date();
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    let alive = true;
    fetch("/api/ai/brief", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ device_secret: deviceSecret, date, tzOffsetMinutes: d.getTimezoneOffset() }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive || !data) return;
        setBrief(typeof data.brief === "string" && data.brief.trim() ? data.brief.trim() : null);
        setMeals(Array.isArray(data.meals) ? data.meals : []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [deviceSecret]);

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const hsettings = (snap?.household.settings ?? {}) as Record<string, unknown>;
  const weather = hsettings.weather as { lat?: number; lon?: number; label?: string } | undefined;

  const panels = useMemo<Panel[]>(() => {
    const out: Panel[] = [];
    const children = [...(snap?.children ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    const childrenById = new Map(children.map((c) => [c.id, c]));

    if (brief) {
      out.push({
        key: "brief",
        tint: "#3cbcd9",
        icon: <Sparkles className="h-5 w-5" />,
        eyebrow: "Harbor",
        body: <p className="text-pretty text-2xl font-medium leading-relaxed text-white/90 sm:text-3xl">{richText(brief)}</p>,
      });
    }

    const dinner = meals.find((m) => m.meal_type === "dinner") ?? meals[0]
      ?? (snap?.meals ?? []).find((m) => m.meal_type === "dinner");
    if (dinner) {
      out.push({
        key: "dinner",
        tint: "#f6b23d",
        icon: <UtensilsCrossed className="h-5 w-5" />,
        eyebrow: "Tonight's dinner",
        body: (
          <div className="flex items-center gap-5">
            <span className="text-6xl">{dinner.emoji ?? "🍽️"}</span>
            <p className="font-display text-4xl font-bold leading-tight text-white sm:text-5xl">{dinner.title}</p>
          </div>
        ),
      });
    }

    const todays = snap ? eventsForDay(snap.events ?? [], now).slice(0, 4) : [];
    if (todays.length) {
      out.push({
        key: "agenda",
        tint: "#3cbcd9",
        icon: <CalendarDays className="h-5 w-5" />,
        eyebrow: "Today",
        body: (
          <ul className="space-y-3">
            {todays.map((e) => {
              const c = e.child_id ? childrenById.get(e.child_id) : null;
              return (
                <li key={e.id} className="flex items-center gap-3 text-xl text-white/90 sm:text-2xl">
                  <span className="w-24 shrink-0 font-semibold text-kwater">{formatEventTime(e)}</span>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c ? childColor(c) : "#3cbcd9" }} />
                  <span className="truncate">{e.emoji ? `${e.emoji} ` : ""}{e.title}</span>
                </li>
              );
            })}
          </ul>
        ),
      });
    }

    const notes = (snap?.wall_messages ?? [])
      .filter((m) => !m.expires_at || new Date(m.expires_at) > now)
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 2);
    if (notes.length) {
      out.push({
        key: "notes",
        tint: "#f6b23d",
        icon: <Pin className="h-5 w-5" />,
        eyebrow: "Family notes",
        body: (
          <div className="space-y-4">
            {notes.map((m) => (
              <div key={m.id} className="flex items-start gap-3">
                <span className="text-3xl">{m.emoji ?? (m.pinned ? "📌" : "💬")}</span>
                <div>
                  <p className="text-2xl leading-snug text-white/90">{m.body}</p>
                  {m.author_label && <p className="mt-0.5 text-base text-white/50">— {m.author_label}</p>}
                </div>
              </div>
            ))}
          </div>
        ),
      });
    }

    const countdowns = [
      ...(snap?.events ?? [])
        .filter((e) => e.is_countdown)
        .map((e) => ({ emoji: e.emoji ?? "🎉", title: e.title, days: daysUntil(e.starts_at) })),
      ...children
        .map((c) => {
          const nb = nextBirthday(c.birthday);
          return nb ? { emoji: "🎂", title: `${c.name}'s birthday`, days: nb.daysUntil } : null;
        })
        .filter((x): x is { emoji: string; title: string; days: number } => !!x),
    ]
      .filter((x) => x.days >= 0)
      .sort((a, b) => a.days - b.days);
    if (countdowns[0]) {
      const c = countdowns[0];
      out.push({
        key: "countdown",
        tint: "#f6b23d",
        icon: <Gift className="h-5 w-5" />,
        eyebrow: "Counting down",
        body: (
          <div className="flex items-center gap-5">
            <span className="text-6xl">{c.emoji}</span>
            <div>
              <p className="font-display text-5xl font-bold text-beacon">{c.days === 0 ? "Today!" : c.days}</p>
              <p className="text-xl text-white/80">{c.days === 0 ? c.title : `${c.days === 1 ? "sleep" : "sleeps"} until ${c.title}`}</p>
            </div>
          </div>
        ),
      });
    }

    const leaders = children
      .map((c) => ({ c, pts: kiosk.state?.points[c.id] ?? 0 }))
      .filter((x) => x.pts > 0)
      .sort((a, b) => b.pts - a.pts)
      .slice(0, 3);
    if (leaders.length) {
      out.push({
        key: "stars",
        tint: "#f6b23d",
        icon: <Star className="h-5 w-5" />,
        eyebrow: "Star leaders",
        body: (
          <div className="space-y-3">
            {leaders.map(({ c, pts }) => (
              <div key={c.id} className="flex items-center gap-3">
                <ChildAvatar child={c} size={40} rounded="rounded-full" />
                <span className="flex-1 truncate text-2xl font-semibold text-white/90">{c.name}</span>
                <span className="flex items-center gap-1.5 text-2xl font-bold text-beacon">
                  <Star className="h-5 w-5 fill-beacon" /> {pts}
                </span>
              </div>
            ))}
          </div>
        ),
      });
    }

    return out;
  }, [snap, brief, meals, now, kiosk.state?.points]);

  useEffect(() => {
    if (panels.length < 2) return;
    const id = setInterval(() => setPanelIdx((i) => (i + 1) % panels.length), 7000);
    return () => clearInterval(id);
  }, [panels.length]);

  const cur = panels.length ? panels[panelIdx % panels.length] : null;
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();
  const safePhoto = photos.length ? photoIdx % photos.length : 0;

  return (
    // Stop touches from reaching the kiosk's wake listeners — only the button unlocks.
    <div
      onPointerDown={stop}
      onTouchStart={stop}
      onKeyDown={stop}
      className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-kbg2 text-white"
    >
      {/* Ambient + optional photo backdrop */}
      {photos.length > 0 ? (
        photos.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src + i}
            src={src}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[2000ms]"
            style={{ opacity: i === safePhoto ? 0.32 : 0 }}
          />
        ))
      ) : null}
      <div className="kiosk-ambient animate-drift" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-b from-kbg2/40 via-transparent to-kbg2/80" aria-hidden />

      <div className="relative z-10 flex min-h-full flex-col items-center px-6 py-8 sm:px-10">
        {/* Clock header */}
        <header className="flex flex-col items-center pt-6 text-center">
          <LighthouseMark className="h-9 w-9 animate-beacon text-white/80" />
          <p className="mt-4 font-display text-7xl font-bold tabular-nums leading-none sm:text-8xl">
            {now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </p>
          <p className="mt-3 text-xl text-white/70">
            {greeting} · {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          {weather?.lat != null && weather?.lon != null && (
            <div className="mt-3">
              <WeatherWidget lat={weather.lat} lon={weather.lon} label={weather.label} />
            </div>
          )}
        </header>

        {/* Rotating flip panel */}
        {cur && (
          <div className="flex w-full flex-1 flex-col items-center justify-center">
            <button
              onClick={() => setPanelIdx((i) => (i + 1) % panels.length)}
              aria-label="Next panel"
              className="w-[min(40rem,92vw)] text-left"
            >
              <div
                key={cur.key + panelIdx}
                className="animate-panel rounded-3xl border border-white/10 bg-white/[0.06] p-7 shadow-k-pop backdrop-blur-md sm:p-9"
              >
                <div className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide" style={{ color: cur.tint }}>
                  {cur.icon}
                  {cur.eyebrow}
                </div>
                {cur.body}
              </div>
            </button>
            {panels.length > 1 && (
              <div className="mt-5 flex items-center gap-2">
                {panels.map((p, i) => (
                  <span
                    key={p.key}
                    className={`h-2 rounded-full transition-all ${i === panelIdx % panels.length ? "w-6 bg-white/85" : "w-2 bg-white/30"}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        {!cur && <div className="flex-1" />}

        {/* Unlock button — the only way out */}
        <button
          onClick={onWake}
          className="kiosk-tap mb-2 inline-flex items-center gap-2.5 rounded-full bg-white/12 px-7 py-4 text-lg font-semibold text-white ring-1 ring-white/20 backdrop-blur-sm transition active:scale-95"
        >
          <Lock className="h-5 w-5" /> Tap to open Harbor
          <ChevronRight className="h-5 w-5 opacity-70" />
        </button>
      </div>
    </div>
  );
}

function daysUntil(iso: string): number {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / 86_400_000);
}

/** Night sleep mode: near-black, very dim clock so the wall isn't a glowing
 *  screen at night. Any tap wakes it. */
export function SleepMode({ onWake }: { onWake: () => void }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  return (
    <button
      onClick={onWake}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black"
      aria-label="Tap to wake"
    >
      <span className="font-display text-3xl font-bold tabular-nums text-white/25">
        {now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
      </span>
    </button>
  );
}
