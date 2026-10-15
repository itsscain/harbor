"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { say } from "@/lib/learn/audio";
import { sfx } from "@/lib/learn/sfx";
import { Chunk } from "../../kit";
import type { ActProps } from "../../acts/common";
import { MiniSpeaker } from "../../acts/common";
import { Glyph, WithGlyphs } from "../../art/Glyph";
import { usePlayer } from "../kit/player";
import { Bells, DrumPad, Keyboard, PlayButton, SoundOffNote } from "../kit/kit";
import { MusicVisual } from "../kit/visual";

// A music idea, taught with sound: each frame is one sentence (spoken for kids who can't read yet)
// and a picture of the idea that PLAYS — the notes glow on the staff as they sound, the beat hearts
// pulse, the keys light up. Some frames put a drum, bells or a piano right there to try it. Hearing
// the idea happen is what makes the names and symbols mean something.

/** A keyboard that fits a frame's notes: from the C at or below the lowest to the B/C above the highest
 *  (at least an octave and a half, at most three octaves). */
const keyLo = (pads?: number[]) => (pads?.length ? Math.floor(Math.min(...pads) / 12) * 12 : 60);
const keyHi = (pads?: number[]) => {
  const lo = keyLo(pads);
  const top = pads?.length ? Math.max(...pads) : 76;
  return Math.min(lo + 36, Math.max(lo + 16, Math.ceil((top + 1) / 12) * 12));
};

export function IdeaAct({ act, fx, onDone }: ActProps<"idea">) {
  const [frame, setFrame] = useState(0);
  const [heard, setHeard] = useState(false);
  const f = act.frames[frame];
  const last = act.frames.length - 1;
  const player = usePlayer();
  const voiced = fx.voice !== "keys";

  useEffect(() => {
    let live = true;
    fx.setPrompt([f.text]);
    const go = () => {
      if (!live) return;
      if (f.sound) player.play(f.sound, { onEnd: () => live && setHeard(true) });
      else setHeard(true);
    };
    const t = window.setTimeout(() => {
      if (voiced) void say(f.text).then(() => window.setTimeout(go, 150));
      else go();
    }, frame === 0 ? 450 : 250);
    return () => {
      live = false;
      window.clearTimeout(t);
      player.stop();
    };
    // Each frame speaks its sentence, then plays its sound, once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame]);

  const next = () => {
    sfx("tap");
    player.stop();
    if (frame < last) {
      setHeard(false);
      setFrame(frame + 1);
    } else {
      sfx("star");
      onDone(0);
    }
  };
  const pads = f.pads?.length ? f.pads : [60, 62, 64, 67, 69];
  return (
    <div className="flex w-full max-w-[1040px] flex-col items-center gap-4">
      <span className="l-pop-in rounded-full bg-[#d9408f] px-5 py-1.5 font-display text-xl font-extrabold text-white shadow-[0_4px_0_#a8306e]">
        <Glyph e="🎵" size="1.25em" className="mx-[0.1em] inline-block align-[-0.28em]" /> {act.title}
      </span>
      <SoundOffNote />
      <div key={frame} className="l-scene-in relative flex min-h-[280px] w-full flex-col items-center justify-center gap-4 rounded-[32px] bg-white/95 px-5 py-6 shadow-[0_8px_0_rgba(0,40,80,0.16)]">
        {f.show && <MusicVisual m={f.show} beat={player.beat} score={player.score} size={f.pad ? "md" : "lg"} />}
        {f.pad === "drum" && <DrumPad size={f.show ? 210 : 250} drum="snare" />}
        {f.pad === "bells" && (
          <div className="w-full max-w-[640px]">
            <Bells pitches={pads} tonic={60} height={f.show ? 170 : 220} />
          </div>
        )}
        {f.pad === "keys" && (
          <div className="w-full max-w-[720px]">
            <Keyboard lo={keyLo(f.pads)} hi={keyHi(f.pads)} lit={f.pads ?? []} labels="letters" height={f.show ? 150 : 200} />
          </div>
        )}
        {f.sound && (
          <div className="absolute right-4 top-4">
            <PlayButton size={68} playing={player.playing} onClick={() => (player.playing ? player.stop() : player.play(f.sound!, { onEnd: () => setHeard(true) }))} />
          </div>
        )}
      </div>
      <div key={`t${frame}`} className="l-card-in relative flex w-full max-w-[880px] items-center gap-3 rounded-[24px] bg-[#fff0f7] px-5 py-4 shadow-[0_5px_0_#f5b8d6]">
        <p className="flex-1 text-balance text-center font-display text-2xl font-bold leading-snug text-[#5b0f6e]">
          <WithGlyphs text={f.text} />
        </p>
        <MiniSpeaker parts={[f.text]} className="relative" />
      </div>
      <div className="flex items-center gap-3">
        <span className="flex gap-1.5" aria-label={`part ${frame + 1} of ${last + 1}`}>
          {act.frames.map((_, i) => (
            <span key={i} className={cn("h-3 rounded-full transition-all", i === frame ? "w-8 bg-white" : i < frame ? "w-3 bg-white/80" : "w-3 bg-white/35")} />
          ))}
        </span>
        <Chunk tone={frame < last ? "blue" : "green"} onClick={next} className={cn("flex h-16 items-center gap-2 px-8 font-display text-2xl font-extrabold", heard && "l-pulse")}>
          {frame < last ? (
            <>
              Next <ArrowRight className="h-7 w-7" strokeWidth={3} />
            </>
          ) : (
            <>
              Got it! <ThumbsUp className="h-7 w-7" strokeWidth={2.6} />
            </>
          )}
        </Chunk>
      </div>
    </div>
  );
}
