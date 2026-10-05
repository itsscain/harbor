"use client";

import { useState } from "react";
import { Play, Wrench } from "lucide-react";
import { cn } from "@/lib/cn";
import type { EvAction, EvSprite } from "@/lib/learn/types";
import { SAY } from "@/lib/learn/script";
import { say } from "@/lib/learn/audio";
import { note, sfx } from "@/lib/learn/sfx";
import { Chunk } from "../kit";
import type { ActProps } from "../acts/common";
import { PromptRow, useLater, usePrompt } from "../acts/common";
import { Glyph, GlyphRow, WithGlyphs } from "../art/Glyph";

// Event Studio: apps and games are made of events — "WHEN this is tapped, DO that". Read what the
// app should do, wire each character to an action, then switch to play mode and tap your own app
// to see it work. (A wrong wire is caught before play, and the row turns red so the fix is clear.)

const NOTES = ["C", "E", "G", "A", "D"];

export function EventsAct({ act, fx, onDone }: ActProps<"events">) {
  const voiced = fx.voice !== "keys";
  usePrompt(fx, voiced ? [act.story, "~", SAY.eventsIntro] : [act.story], voiced ? 420 : -1);
  const later = useLater();
  const [wires, setWires] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<"build" | "play" | "won">("build");
  const [wrong, setWrong] = useState<string[]>([]);
  const [misses, setMisses] = useState(0);
  const [fxState, setFxState] = useState<Record<string, { k: number; fx: EvAction["fx"]; hidden?: boolean; count?: number; hue?: number }>>({});
  const [tapped, setTapped] = useState<string[]>([]);
  const goalOf = (sprite: string) => act.goal.find((g) => g.sprite === sprite)?.action;
  const actionOf = (id?: string) => act.actions.find((a) => a.id === id);
  const ready = act.sprites.every((s) => wires[s.id]);

  const cycle = (sprite: string) => {
    if (mode !== "build") return;
    sfx("pick");
    setWrong((w) => w.filter((x) => x !== sprite));
    const ids = act.actions.map((a) => a.id);
    const i = ids.indexOf(wires[sprite] ?? "");
    setWires((w) => ({ ...w, [sprite]: ids[(i + 1) % ids.length] }));
  };
  const play = () => {
    const bad = act.sprites.filter((s) => wires[s.id] !== goalOf(s.id)).map((s) => s.id);
    if (bad.length) {
      setWrong(bad);
      setMisses((m) => m + 1);
      fx.wrong(null);
      void say(SAY.eventsWrong);
      return;
    }
    sfx("unlock");
    setMode("play");
    if (voiced) void say(SAY.eventsPlay);
    fx.setPrompt([SAY.eventsPlay]);
  };
  const trigger = (s: EvSprite, el: HTMLElement) => {
    if (mode === "build") return;
    const a = actionOf(wires[s.id]);
    if (!a) return;
    const prev = fxState[s.id];
    if (a.fx === "sing") note(NOTES[act.sprites.indexOf(s) % NOTES.length]);
    else if (a.fx === "count") sfx("coin");
    else if (a.fx === "rain") fx.burst(el, "star", 14);
    else if (a.fx === "glow") sfx("star");
    else if (a.fx === "hide") sfx("whoosh");
    else sfx("pop");
    setFxState((st) => ({
      ...st,
      [s.id]: { k: (prev?.k ?? 0) + 1, fx: a.fx, hidden: a.fx === "hide" ? !prev?.hidden : prev?.hidden, count: (prev?.count ?? 0) + (a.fx === "count" ? 1 : 0), hue: a.fx === "color" ? ((prev?.hue ?? 0) + 90) % 360 : prev?.hue },
    }));
    if (mode === "play" && !tapped.includes(s.id)) {
      const now = [...tapped, s.id];
      setTapped(now);
      if (now.length === act.sprites.length) {
        setMode("won");
        later(() => fx.right(null), 500);
        later(() => onDone(misses), 3200);
      }
    }
  };

  return (
    <div className="flex w-full max-w-[1180px] flex-col gap-4">
      <PromptRow parts={[act.story]}>{act.prompt}</PromptRow>
      {/* What the app should do: pictures for pre-readers, the words for readers. */}
      <div className="flex flex-wrap items-center justify-center gap-2 rounded-[20px] bg-white/95 px-4 py-2 shadow-[0_5px_0_rgba(0,40,80,0.14)]">
        <span className="font-display text-lg font-extrabold text-[var(--l-ink-2)]"><Glyph e="🎯" size="1.25em" className="mx-[0.1em] inline-block align-[-0.28em]" /> Goal:</span>
        {fx.voice === "all" ? (
          act.goal.map((g) => {
            const s = act.sprites.find((x) => x.id === g.sprite);
            const a = actionOf(g.action);
            return (
              <span key={g.sprite} className="flex items-center gap-1.5 rounded-full bg-[var(--l-card-2)] px-3 py-1 font-display text-lg font-extrabold text-[var(--l-ink)]">
                <GlyphRow s={s?.emoji ?? ""} size={32} /><Glyph e="👆" size="1.25em" className="mx-[0.1em] inline-block align-[-0.28em]" /> → <GlyphRow s={a?.icon ?? ""} size={32} /> {a?.label}
              </span>
            );
          })
        ) : (
          <span className="font-display text-lg font-bold text-[var(--l-ink)]">{act.story}</span>
        )}
      </div>
      <div className="flex w-full flex-col items-stretch gap-4 lg:flex-row">
        {/* The app */}
        <div className={cn("relative flex min-h-[320px] flex-1 flex-wrap items-center justify-center gap-6 overflow-hidden rounded-[28px] p-6 shadow-[0_8px_0_rgba(0,40,80,0.16)]", mode === "build" ? "bg-[#e2e8f0]" : "bg-gradient-to-b from-[#bae6fd] to-[#e0f2fe]")}>
          <span className="absolute left-4 top-3 rounded-full bg-white/80 px-3 py-1 font-display text-sm font-extrabold text-[var(--l-ink-2)]"><WithGlyphs text={mode === "build" ? "🔧 Building…" : "▶️ Your app is running — tap things!"} /></span>
          {act.sprites.map((s) => {
            const st = fxState[s.id];
            const anim = st && st.k > 0 ? { jump: "l-hop", spin: "l-spin", grow: "l-grow", shake: "l-shake", glow: "l-pop-in", sing: "l-boing", hide: "", count: "l-pop-in", rain: "l-boing", color: "l-pop-in" }[st.fx] : "";
            return (
              <button key={s.id} type="button" disabled={mode === "build"} onClick={(e) => trigger(s, e.currentTarget)} className={cn("relative flex flex-col items-center gap-1 rounded-3xl p-3", mode !== "build" && !tapped.includes(s.id) && "l-pulse")} aria-label={s.name}>
                <span
                  key={st?.k ?? 0}
                  className={cn("block transition-[opacity,filter] duration-300", anim)}
                  style={{
                    opacity: st?.hidden ? 0.15 : 1,
                    filter: `${st?.fx === "glow" && st.k % 2 === 1 ? "drop-shadow(0 0 26px rgba(250,204,21,0.95)) brightness(1.15)" : ""} ${st?.hue ? `hue-rotate(${st.hue}deg)` : ""}`.trim() || undefined,
                  }}
                >
                  <GlyphRow s={s.emoji} size={112} />
                </span>
                {st?.fx === "sing" && <span key={`n${st.k}`} className="l-float-num absolute -top-2 right-0 text-4xl"><Glyph e="🎵" size="1.25em" className="mx-[0.1em] inline-block align-[-0.28em]" /></span>}
                {(st?.count ?? 0) > 0 && <span key={`c${st?.count}`} className="l-pop-in absolute -right-2 -top-2 flex h-10 min-w-10 items-center justify-center rounded-full bg-[var(--l-gold)] px-2 font-display text-xl font-extrabold text-[#5a3b00]">{st?.count}</span>}
                <span className="rounded-full bg-white/80 px-3 py-0.5 font-display text-base font-extrabold text-[var(--l-ink)]">{s.name}</span>
              </button>
            );
          })}
        </div>
        {/* The event wiring */}
        <div className="flex w-full flex-col gap-2 rounded-[28px] bg-white/95 p-3 shadow-[0_8px_0_rgba(0,40,80,0.18)] lg:w-[46%]">
          <span className="px-1 font-display text-lg font-extrabold text-[var(--l-ink)]"><Glyph e="⚡" size="1.25em" className="mx-[0.1em] inline-block align-[-0.28em]" /> Events</span>
          {act.sprites.map((s) => {
            const a = actionOf(wires[s.id]);
            const bad = wrong.includes(s.id);
            return (
              <div key={s.id} className={cn("flex flex-wrap items-center gap-2 rounded-2xl bg-[#fef9c3] px-3 py-2 shadow-[0_4px_0_#facc15]", bad && "l-shake bg-[#fee2e2] shadow-[0_4px_0_#f87171]")}>
                <span className="font-display text-lg font-extrabold text-[#854d0e]">When</span>
                <span className="rounded-xl bg-white px-2.5 py-1 font-display text-lg font-extrabold text-[var(--l-ink)]">
                  <GlyphRow s={s.emoji} size={30} className="mr-1 align-[-0.3em]" />
                  {s.name} tapped
                </span>
                <span className="font-display text-xl font-extrabold text-[#854d0e]">→</span>
                <Chunk tone={a ? "violet" : "white"} disabled={mode !== "build"} onClick={() => cycle(s.id)} className={cn("flex h-12 items-center px-3 font-display text-lg font-extrabold", !a && "border-[3px] border-dashed border-[var(--l-line)] text-[var(--l-ink-2)]")}>
                  <WithGlyphs text={a ? `${a.icon} ${a.label}` : "tap to pick ❓"} />
                </Chunk>
              </div>
            );
          })}
          {mode === "build" ? (
            <Chunk tone="green" disabled={!ready} onClick={play} className={cn("mt-1 flex h-16 items-center justify-center gap-2 font-display text-2xl font-extrabold", ready && "l-pulse")}>
              <Play className="h-8 w-8 fill-current" /> Play my app
            </Chunk>
          ) : (
            <Chunk tone="white" disabled={mode === "won"} onClick={() => (sfx("tap"), setMode("build"), setTapped([]))} className="mt-1 flex h-14 items-center justify-center gap-2 font-display text-xl font-extrabold text-[var(--l-ink-2)]">
              <Wrench className="h-6 w-6" /> Back to building
            </Chunk>
          )}
        </div>
      </div>
    </div>
  );
}
