"use client";

import { useState, useTransition } from "react";
import { Star, MessageSquare, Hand, Wind, Send, X, Power, Clock } from "lucide-react";
import { Card, Button, Input, Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import {
  HOUSE_MODES,
  houseModeMeta,
  type HouseMode,
  type HouseModeState,
} from "@/lib/command";
import { grantStars, sendWallNote, getAttention, startCalmMoment, setHouseMode } from "@/app/app/(parent)/command/actions";

export type CommandChild = {
  id: string;
  name: string;
  color: string | null;
  photo_url: string | null;
  avatar: string | null;
  points: number;
};

const STAR_STEPS = [-5, -1, 1, 5, 10];
const DURATIONS: { h: number; label: string }[] = [
  { h: 0, label: "Until I end it" },
  { h: 1, label: "1 hour" },
  { h: 2, label: "2 hours" },
  { h: 3, label: "3 hours" },
];

function Avatar({ child, size = 40 }: { child: CommandChild; size?: number }) {
  const tint = child.color ?? "#56c7e0";
  if (child.photo_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={child.photo_url}
        alt={child.name}
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover ring-2"
        style={{ width: size, height: size, boxShadow: `0 0 0 2px ${tint}55` }}
      />
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, background: tint }}
    >
      {child.avatar || child.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function CommandConsole({
  kids,
  houseMode,
}: {
  kids: CommandChild[];
  houseMode: HouseModeState;
}) {
  const [pts, setPts] = useState<Record<string, number>>(
    Object.fromEntries(kids.map((c) => [c.id, c.points])),
  );
  const [mode, setMode] = useState<HouseModeState>(houseMode);
  const [duration, setDuration] = useState(0);
  const [exceptId, setExceptId] = useState<string>("");
  const [flash, setFlash] = useState<{ msg: string; tone: "ok" | "warn" } | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null); // child id whose note composer is open
  const [noteText, setNoteText] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  const toast = (msg: string, tone: "ok" | "warn" = "ok") => {
    setFlash({ msg, tone });
    window.setTimeout(() => setFlash(null), 2600);
  };

  const activeMeta = houseModeMeta(mode.mode);

  const pickMode = (m: HouseMode) => {
    start(async () => {
      await setHouseMode({ mode: m, hours: duration, exceptChildId: exceptId || null });
      if (m === "normal") {
        setMode({ mode: "normal", until: null, except: [], setAt: null });
        toast("House back to normal");
      } else {
        const until = duration > 0 ? new Date(Date.now() + duration * 3600_000).toISOString() : null;
        setMode({ mode: m, until, except: exceptId ? [exceptId] : [], setAt: new Date().toISOString() });
        toast(`${houseModeMeta(m).emoji} ${houseModeMeta(m).label} is on`);
      }
    });
  };

  const doGrant = (child: CommandChild, delta: number) => {
    start(async () => {
      const res = await grantStars({ childId: child.id, delta, reason: reasons[child.id], pop: delta > 0 });
      if (res.ok) {
        setPts((p) => ({ ...p, [child.id]: res.points }));
        setReasons((r) => ({ ...r, [child.id]: "" }));
        toast(`${delta > 0 ? "+" : ""}${delta} ★ · ${child.name}`, delta > 0 ? "ok" : "warn");
      }
    });
  };

  const sendNote = (child: CommandChild) => {
    const body = noteText.trim();
    if (!body) return;
    start(async () => {
      await sendWallNote({ childId: child.id, body });
      setNoteFor(null);
      setNoteText("");
      toast(`Note sent to ${child.name}'s wall`);
    });
  };

  const untilLabel = mode.until
    ? new Date(mode.until).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : null;
  const exceptName = mode.except[0] ? kids.find((c) => c.id === mode.except[0])?.name : null;

  return (
    <div className="space-y-6">
      {/* ── House mode ─────────────────────────────────────────────── */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-eyebrow text-fg-muted">The whole house</p>
            <h2 className="text-title text-fg">House mode</h2>
          </div>
          {mode.mode !== "normal" && (
            <Badge tone="blue">
              {activeMeta.emoji} On{untilLabel ? ` · until ${untilLabel}` : ""}
            </Badge>
          )}
        </div>

        {mode.mode !== "normal" && (
          <div
            className="mb-4 flex items-center gap-3 rounded-xl border px-4 py-3"
            style={{ borderColor: `${activeMeta.tint}55`, background: `${activeMeta.tint}14` }}
          >
            <span className="text-2xl">{activeMeta.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-fg">{activeMeta.label} is on</p>
              <p className="text-xs text-fg-muted">
                Every wall shows &ldquo;{activeMeta.wallLine}&rdquo;
                {untilLabel ? ` · until ${untilLabel}` : ""}
                {exceptName ? ` · except ${exceptName}` : ""}
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => pickMode("normal")} disabled={pending}>
              <Power className="h-4 w-4" /> End
            </Button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {HOUSE_MODES.filter((m) => m.mode !== "normal").map((m) => {
            const on = mode.mode === m.mode;
            return (
              <button
                key={m.mode}
                onClick={() => pickMode(on ? "normal" : m.mode)}
                disabled={pending}
                className={cn(
                  "tap flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-center transition-all",
                  on ? "text-fg" : "border-line bg-surface text-fg-muted hover:border-accent/40 hover:text-fg",
                )}
                style={on ? { borderColor: `${m.tint}`, background: `${m.tint}1f` } : undefined}
              >
                <span className="text-2xl leading-none">{m.emoji}</span>
                <span className="text-sm font-semibold">{m.label}</span>
                <span className="text-[11px] leading-tight text-fg-subtle">{m.blurb}</span>
              </button>
            );
          })}
        </div>

        {/* Options applied when you pick a mode */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Auto-off</span>
          <div className="flex flex-wrap gap-1">
            {DURATIONS.map((d) => (
              <button
                key={d.h}
                onClick={() => setDuration(d.h)}
                className={cn(
                  "rounded-full px-2.5 py-1 font-semibold transition",
                  duration === d.h ? "bg-accent text-accent-fg" : "bg-surface-2 text-fg-muted hover:text-fg",
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
          {kids.length > 1 && (
            <label className="ml-auto inline-flex items-center gap-1.5">
              <span>Except</span>
              <select
                value={exceptId}
                onChange={(e) => setExceptId(e.target.value)}
                className="rounded-lg border border-line-strong bg-surface px-2 py-1 text-fg"
              >
                <option value="">nobody</option>
                {kids.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      </Card>

      {/* ── Per-child live actions ─────────────────────────────────── */}
      <div>
        <p className="text-eyebrow mb-2 text-fg-muted">Reach a child, right now</p>
        <div className="space-y-3">
          {kids.map((child) => (
            <Card key={child.id} className="p-4">
              <div className="flex items-center gap-3">
                <Avatar child={child} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-fg">{child.name}</p>
                  <p className="text-xs text-fg-muted">
                    <Star className="mr-0.5 inline h-3 w-3 -translate-y-px fill-beacon text-beacon" />
                    {pts[child.id] ?? 0} stars
                  </p>
                </div>
              </div>

              {/* Stars — grant or dock on the fly */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {STAR_STEPS.map((d) => (
                  <button
                    key={d}
                    onClick={() => doGrant(child, d)}
                    disabled={pending}
                    className={cn(
                      "tap rounded-lg px-3 py-1.5 text-sm font-bold transition disabled:opacity-50",
                      d > 0
                        ? "bg-good/15 text-good hover:bg-good/25"
                        : "bg-error/12 text-error hover:bg-error/20",
                    )}
                  >
                    {d > 0 ? `+${d}` : d}
                  </button>
                ))}
                <Input
                  value={reasons[child.id] ?? ""}
                  onChange={(e) => setReasons((r) => ({ ...r, [child.id]: e.target.value }))}
                  placeholder="reason (optional)"
                  className="h-8 flex-1 min-w-28 px-2.5 py-1 text-xs"
                />
              </div>

              {/* Quick reaches */}
              <div className="mt-2 grid grid-cols-3 gap-2">
                <Button size="sm" variant="secondary" onClick={() => setNoteFor(noteFor === child.id ? null : child.id)} disabled={pending}>
                  <MessageSquare className="h-4 w-4" /> Note
                </Button>
                <Button size="sm" variant="secondary" onClick={() => start(async () => { await getAttention({ childId: child.id }); toast(`Nudged ${child.name}'s wall`); })} disabled={pending}>
                  <Hand className="h-4 w-4" /> Attention
                </Button>
                <Button size="sm" variant="secondary" onClick={() => start(async () => { await startCalmMoment({ childId: child.id }); toast(`Calm moment on ${child.name}'s wall`); })} disabled={pending}>
                  <Wind className="h-4 w-4" /> Calm
                </Button>
              </div>

              {noteFor === child.id && (
                <div className="animate-sheet-up mt-2 flex items-center gap-2">
                  <Input
                    autoFocus
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendNote(child)}
                    placeholder={`A note for ${child.name}'s wall…`}
                    className="flex-1"
                    maxLength={200}
                  />
                  <Button size="sm" onClick={() => sendNote(child)} disabled={pending || !noteText.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setNoteFor(null); setNoteText(""); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Toast */}
      {flash && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
          <div
            className={cn(
              "animate-sheet-up rounded-full px-4 py-2 text-sm font-semibold text-white shadow-card",
              flash.tone === "ok" ? "bg-good" : "bg-error",
            )}
          >
            {flash.msg}
          </div>
        </div>
      )}
    </div>
  );
}
