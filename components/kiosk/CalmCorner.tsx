"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Wind, Heart, Hand, BookOpen, X } from "lucide-react";
import type { KioskCalmTool } from "@/lib/kiosk/types";
import { KButton, KCard, KIconButton, KTopBar } from "./ui";

const FEELINGS = [
  { key: "happy", emoji: "😊", label: "Happy" },
  { key: "calm", emoji: "😌", label: "Calm" },
  { key: "sad", emoji: "😢", label: "Sad" },
  { key: "angry", emoji: "😠", label: "Angry" },
  { key: "worried", emoji: "😟", label: "Worried" },
  { key: "tired", emoji: "😴", label: "Tired" },
  { key: "silly", emoji: "🤪", label: "Silly" },
  { key: "excited", emoji: "🤩", label: "Excited" },
];

/** Resolve any saved feeling key — known ones get their emoji/label, custom ones
 *  added by a parent fall back to a generic emoji + a friendly capitalized label. */
function feelingMeta(key: string) {
  const found = FEELINGS.find((f) => f.key === key.toLowerCase());
  if (found) return found;
  const label = key.charAt(0).toUpperCase() + key.slice(1);
  return { key, emoji: "💭", label };
}

const TOOL_META: Record<
  KioskCalmTool["tool_type"],
  { label: string; icon: typeof Wind; blurb: string }
> = {
  breathing: { label: "Take a breath", icon: Wind, blurb: "Slow breathing together" },
  feelings: { label: "How do I feel?", icon: Heart, blurb: "Tap how you feel" },
  break: { label: "I need a break", icon: Hand, blurb: "A calm minute" },
  social_story: { label: "A story", icon: BookOpen, blurb: "Read together" },
};

export function CalmCorner({
  tools,
  onCheckIn,
  onClose,
}: {
  tools: KioskCalmTool[];
  onCheckIn: (feeling: string) => void;
  onClose: () => void;
}) {
  const [open, setOpen] = useState<KioskCalmTool | null>(null);
  const enabled = tools.filter((t) => t.enabled);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-kbg text-ktext">
      <KTopBar
        onBack={open ? () => setOpen(null) : onClose}
        title="Calm Corner"
        right={
          <KIconButton
            variant="ghost"
            onClick={onClose}
            className="kiosk-tap"
            aria-label="Close calm corner"
          >
            <X className="h-5 w-5" />
          </KIconButton>
        }
      />

      <div className="flex flex-1 items-center justify-center p-6">
        {!open ? (
          <div className="grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
            {enabled.map((tool) => {
              const meta = TOOL_META[tool.tool_type];
              const Icon = meta.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => setOpen(tool)}
                  className="kiosk-tap flex items-center gap-4 rounded-xl bg-kpanel ring-1 ring-kline/55 shadow-k p-5 text-left transition active:scale-[0.98] hover:bg-kraise"
                >
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-beacon text-harbor shadow-k">
                    <Icon className="h-8 w-8" />
                  </span>
                  <span>
                    <span className="block font-display text-xl font-bold text-ktext">
                      {meta.label}
                    </span>
                    <span className="block text-kmute">{meta.blurb}</span>
                  </span>
                </button>
              );
            })}
            {enabled.length === 0 && (
              <p className="text-center text-kmute">
                No calm tools set up yet.
              </p>
            )}
          </div>
        ) : open.tool_type === "breathing" ? (
          <Breathing config={open.config} />
        ) : open.tool_type === "feelings" ? (
          <Feelings
            config={open.config}
            onPick={(f) => {
              onCheckIn(f);
            }}
          />
        ) : open.tool_type === "break" ? (
          <BreakTimer config={open.config} />
        ) : (
          <SocialStory config={open.config} />
        )}
      </div>
    </div>
  );
}

// ── Breathing ────────────────────────────────────────────────────────────────
function Breathing({ config }: { config: Record<string, unknown> }) {
  const pattern = useMemo(() => {
    const raw = String(config.pattern ?? "4-4-4");
    const parts = raw.split("-").map((n) => Number(n) || 4);
    return { inhale: parts[0] ?? 4, hold: parts[1] ?? 0, exhale: parts[2] ?? 4 };
  }, [config]);
  const rounds = Math.max(1, Number(config.rounds) || 4);
  const phases = useMemo(
    () =>
      [
        { label: "Breathe in", secs: pattern.inhale, scale: 1 },
        ...(pattern.hold ? [{ label: "Hold", secs: pattern.hold, scale: 1 }] : []),
        { label: "Breathe out", secs: pattern.exhale, scale: 0.55 },
      ] as const,
    [pattern],
  );
  const [i, setI] = useState(0);
  const [cycles, setCycles] = useState(0);
  const done = cycles >= rounds;
  useEffect(() => {
    if (done) return;
    const id = setTimeout(() => {
      const next = (i + 1) % phases.length;
      if (next === 0) setCycles((c) => c + 1);
      setI(next);
    }, phases[i].secs * 1000);
    return () => clearTimeout(id);
  }, [i, phases, done]);

  if (done) {
    return (
      <div className="text-center">
        <div className="text-6xl animate-reward">🌬️</div>
        <p className="mt-6 font-display text-2xl font-bold text-ktext">Great breathing!</p>
        <p className="mt-2 text-kmute">You took {rounds} slow breaths.</p>
      </div>
    );
  }

  const phase = phases[i];
  return (
    <div className="flex flex-col items-center">
      <div className="relative flex h-72 w-72 items-center justify-center">
        <div
          className="absolute h-72 w-72 rounded-full bg-kwater/20 ring-1 ring-kwater/30"
          style={{
            transform: `scale(${phase.scale})`,
            transition: `transform ${phase.secs}s ease-in-out`,
          }}
        />
        <div
          className="absolute h-52 w-52 rounded-full bg-kwater/40 ring-1 ring-kwater/40"
          style={{
            transform: `scale(${phase.scale})`,
            transition: `transform ${phase.secs}s ease-in-out`,
          }}
        />
        <span className="relative font-display text-3xl font-bold text-ktext">
          {phase.label}
        </span>
      </div>
      <p className="mt-8 text-kmute">Follow the circle. In and out.</p>
    </div>
  );
}

// ── Feelings ─────────────────────────────────────────────────────────────────
function Feelings({
  config,
  onPick,
}: {
  config: Record<string, unknown>;
  onPick: (feeling: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  // Synchronous latch — a double-tap must log exactly one check-in (the `picked`
  // state guard only kicks in after the next render).
  const submitting = useRef(false);
  const keys =
    Array.isArray(config.options) && (config.options as string[]).length
      ? (config.options as string[])
      : FEELINGS.slice(0, 6).map((f) => f.key);
  const list = keys.map(feelingMeta);

  if (picked) {
    const f = feelingMeta(picked);
    return (
      <div className="text-center">
        <div className="text-8xl animate-reward">{f.emoji}</div>
        <p className="mt-6 font-display text-2xl font-bold text-ktext">
          Thanks for sharing.
        </p>
        <p className="mt-2 text-kmute">
          It&apos;s okay to feel {f.label.toLowerCase()}. You&apos;re doing great.
        </p>
      </div>
    );
  }

  return (
    <div className="grid w-full max-w-xl grid-cols-3 gap-4">
      {list.map((f) => (
        <button
          key={f.key}
          onClick={() => {
            if (picked || submitting.current) return;
            submitting.current = true;
            setPicked(f.key);
            onPick(f.key);
          }}
          className="kiosk-tap flex flex-col items-center gap-2 rounded-xl bg-kpanel ring-1 ring-kline/55 shadow-k p-5 transition active:scale-95 hover:bg-kraise"
        >
          <span className="text-5xl">{f.emoji}</span>
          <span className="font-semibold text-ktext">{f.label}</span>
        </button>
      ))}
    </div>
  );
}

// ── Break timer ──────────────────────────────────────────────────────────────
function BreakTimer({ config }: { config: Record<string, unknown> }) {
  const total = (Number(config.minutes) || 5) * 60;
  const [left, setLeft] = useState(total);
  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  const m = Math.floor(left / 60);
  const s = left % 60;
  return (
    <div className="flex flex-col items-center text-center">
      <div className="h-44 w-44 animate-beacon rounded-full bg-kwater/30 ring-1 ring-kwater/40" />
      <p className="mt-8 font-display text-2xl font-bold text-ktext">
        {left > 0 ? "Take your time" : "Feeling better?"}
      </p>
      <p className="mt-2 text-5xl font-bold tabular-nums text-kmute">
        {left > 0 ? `${m}:${String(s).padStart(2, "0")}` : "💛"}
      </p>
      <p className="mt-4 max-w-xs text-kmute">
        Sit somewhere comfy. Breathe slowly. You can stay as long as you need.
      </p>
    </div>
  );
}

// ── Social story ─────────────────────────────────────────────────────────────
function SocialStory({ config }: { config: Record<string, unknown> }) {
  const pages = Array.isArray(config.pages) ? (config.pages as string[]) : [];
  const title = String(config.title ?? "A story");
  const [p, setP] = useState(0);

  if (!pages.length) {
    return <p className="text-kmute">This story has no pages yet.</p>;
  }

  return (
    <div className="w-full max-w-xl text-center">
      <p className="font-display text-lg font-bold text-kmute">{title}</p>
      <KCard className="mt-4 flex min-h-48 items-center justify-center p-5">
        <p className="font-display text-2xl font-bold leading-relaxed text-ktext">
          {pages[p]}
        </p>
      </KCard>
      <div className="mt-6 flex items-center justify-center gap-4">
        <KButton
          variant="tonal"
          size="lg"
          onClick={() => setP((x) => Math.max(0, x - 1))}
          disabled={p === 0}
          className="kiosk-tap"
        >
          Back
        </KButton>
        <span className="text-kmute">
          {p + 1} / {pages.length}
        </span>
        <KButton
          variant="beacon"
          size="lg"
          onClick={() => setP((x) => Math.min(pages.length - 1, x + 1))}
          disabled={p === pages.length - 1}
          className="kiosk-tap"
        >
          Next
        </KButton>
      </div>
    </div>
  );
}
