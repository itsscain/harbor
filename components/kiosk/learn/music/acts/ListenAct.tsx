"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { MOption } from "@/lib/learn/mus/types";
import { sfx } from "@/lib/learn/sfx";
import { useShuffled } from "../../kit";
import { ChoiceTile, Hearable, PromptRow, spoken, tileState, useChoice, type ActProps } from "../../acts/common";
import { GlyphRow, WithGlyphs } from "../../art/Glyph";
import { usePlayer } from "../kit/player";
import { InstrumentPic, MiniPlay, PlayButton, SoundOffNote } from "../kit/kit";
import { MusicVisual } from "../kit/visual";

// Listen, then choose. The question is asked, then the music plays by itself (and any answers that
// are sounds play one after another, each tile glowing while it's heard) — so the answers wake up
// only once the child has actually listened. Every sound can be played again: the big button for
// the music, a small play button BESIDE each sound answer (never on it).

function Face({ o, layout }: { o: MOption; layout: "grid" | "row" | "list" }) {
  const big = layout !== "list";
  return (
    <span className={cn("flex items-center gap-3 p-2", big ? "flex-col" : "w-full flex-row px-4")}>
      {o.inst && <InstrumentPic id={o.inst} size={big ? 104 : 64} />}
      {o.emoji && <GlyphRow s={o.emoji} size={big ? (o.text ? 76 : 100) : 48} />}
      {o.show && <MusicVisual m={o.show} size="sm" />}
      {o.text && <span className={cn("font-display font-extrabold leading-tight", big ? (o.text.length > 14 ? "text-[22px]" : "text-[30px]") : "text-[24px]")}><WithGlyphs text={o.text} /></span>}
    </span>
  );
}

export function ListenAct({ act: a, fx, onDone }: ActProps<"listen">) {
  const player = usePlayer();
  const { parts, auto } = spoken(fx, a.say, a.prompt);
  const anySound = a.options.some((o) => o.sound);
  const shuffled = useShuffled(a.options, fx.seed);
  const opts = !anySound && a.options.length >= 3 ? shuffled : a.options;
  const layout = a.layout ?? (opts.some((o) => o.show) ? "list" : opts.length === 2 || anySound ? "row" : "grid");
  const answerOpt = a.options.find((o) => o.id === a.answer);
  const c = useChoice(a.answer, fx, onDone, { why: a.why, whyParts: fx.voice === "all" && a.why ? [a.why] : undefined, extra: fx.voice !== "keys" && answerOpt?.text && !anySound ? [answerOpt.text] : [] });
  const [ready, setReady] = useState(!a.sound && !anySound);
  const [playingOpt, setPlayingOpt] = useState<string | null>(null);
  const live = useRef(true);

  // Ask, then play the music, then each sound answer in turn.
  const queue = useMemo(() => [...(a.sound ? [{ id: "__main", s: a.sound }] : []), ...a.options.filter((o) => o.sound).map((o) => ({ id: o.id, s: o.sound! }))], [a]);
  const runQueue = (i: number) => {
    if (!live.current) return;
    if (i >= queue.length) {
      setPlayingOpt(null);
      setReady(true);
      return;
    }
    const q = queue[i];
    setPlayingOpt(q.id === "__main" ? null : q.id);
    player.play(q.s, { onEnd: () => window.setTimeout(() => runQueue(i + 1), 450) });
  };
  useEffect(() => {
    live.current = true;
    fx.setPrompt(parts);
    const t = window.setTimeout(() => {
      if (auto && parts.length) void fx.say(parts).then(() => window.setTimeout(() => runQueue(0), 200));
      else runQueue(0);
    }, 380);
    // Never keep the answers asleep for long.
    const cap = window.setTimeout(() => live.current && setReady(true), 22000);
    return () => {
      live.current = false;
      window.clearTimeout(t);
      window.clearTimeout(cap);
      player.stop();
    };
    // Asked once on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playOne = (id: string) => {
    sfx("tap");
    const s = id === "__main" ? a.sound : a.options.find((o) => o.id === id)?.sound;
    if (!s) return;
    // Listening on their own counts: tapping a sound stops the automatic run, so wake the answers.
    live.current = true;
    setReady(true);
    if (player.playing && (playingOpt === id || (id === "__main" && playingOpt === null))) {
      player.stop();
      setPlayingOpt(null);
      return;
    }
    setPlayingOpt(id === "__main" ? null : id);
    player.play(s, { onEnd: () => setPlayingOpt(null) });
  };
  const textParts = (o: MOption) => (o.say?.length ? o.say : fx.voice !== "keys" && o.text && !o.sound ? [o.text] : null);

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <PromptRow parts={parts}>{a.prompt}</PromptRow>
      <SoundOffNote />
      {a.sound && (
        <div className="l-pop-in flex max-w-full items-center gap-5 rounded-[32px] bg-white/95 px-6 py-4 shadow-[0_8px_0_rgba(0,40,80,0.14)]">
          <PlayButton size={104} playing={player.playing && playingOpt === null} onClick={() => playOne("__main")} pulse={ready} />
          {a.show ? <MusicVisual m={a.show} beat={playingOpt === null ? player.beat : null} score={playingOpt === null ? player.score : null} /> : <ListenWaves on={player.playing && playingOpt === null} />}
        </div>
      )}
      {!a.sound && a.show && (
        <div className="l-pop-in max-w-full rounded-[30px] bg-white px-6 py-5 shadow-[0_8px_0_var(--l-line)]">
          <MusicVisual m={a.show} />
        </div>
      )}
      <div className={cn("grid w-full gap-4 transition-opacity duration-300", !ready && "pointer-events-none opacity-70", layout === "list" ? "max-w-[860px] grid-cols-1" : layout === "row" ? "max-w-[1000px]" : "max-w-[920px] grid-cols-2 lg:grid-cols-3")} style={layout === "row" ? { gridTemplateColumns: `repeat(${Math.min(4, opts.length)}, minmax(0, 1fr))` } : undefined}>
        {opts.map((o, i) => {
          const tile = (
            <ChoiceTile
              state={tileState(o.id, c, a.answer)}
              shakeKey={c.shake?.id === o.id ? c.shake.n : undefined}
              onPick={(el) => (sfx("pick"), c.choose(o.id, el))}
              label={o.text ?? o.id}
              className={cn("w-full text-[var(--l-ink)]", layout === "list" ? "min-h-[88px] justify-start py-2" : "min-h-[150px]", playingOpt === o.id && "outline outline-[6px] outline-offset-2 outline-[#ff6fb5]")}
            >
              <Face o={o} layout={layout} />
            </ChoiceTile>
          );
          return (
            <div key={o.id} className="l-rise relative" style={{ animationDelay: `${120 + i * 60}ms` }}>
              {o.sound ? (
                <div className={cn("flex items-center gap-3", layout === "row" ? "flex-col-reverse" : "flex-row")}>
                  <MiniPlay playing={playingOpt === o.id && player.playing} onClick={() => playOne(o.id)} size={fx.voice === "all" ? 68 : 60} />
                  <div className="w-full min-w-0 flex-1">{tile}</div>
                </div>
              ) : (
                <Hearable parts={textParts(o)} side={layout === "list" ? "left" : "below"}>
                  {tile}
                </Hearable>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** "Listening" waves when there's no picture to follow along with. */
function ListenWaves({ on }: { on: boolean }) {
  return (
    <span className="flex h-24 items-center gap-2" aria-hidden>
      {[0.5, 0.8, 1, 0.7, 0.9, 0.6, 1, 0.75, 0.5].map((h, k) => (
        <span key={k} className={cn("w-3 rounded-full bg-[#ff6fb5]", on ? "m-eq" : "opacity-40")} style={{ height: `${h * 100}%`, animationDelay: `${k * 0.09}s` }} />
      ))}
    </span>
  );
}
