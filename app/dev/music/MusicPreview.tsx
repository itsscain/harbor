"use client";

import { useEffect, useState } from "react";
import { INST_IDS, DRUM_IDS, INSTRUMENTS, DRUMS } from "@/lib/learn/mus/catalog";
import { PIECE_IDS, PIECES, piece } from "@/lib/learn/mus/pieces";
import { SONGS, songScore } from "@/lib/learn/mus/songs";
import { melody, progression, rhythm } from "@/lib/learn/mus/score";
import { musicMeter, playDrum, playNote, playScore } from "@/lib/learn/mus/synth";
import type { MSymbol } from "@/lib/learn/mus/types";
import { usePlayer } from "@/components/kiosk/learn/music/kit/player";
import { Bells, DrumPad, InstrumentPic, Keyboard, Ladder, PlayButton } from "@/components/kiosk/learn/music/kit/kit";
import { RhythmStrip, Staff, SymbolView } from "@/components/kiosk/learn/music/kit/notation";
import { CircleOfFifths, ChordBlocks, Dynamics, FormBlocks, GridView, Metronome, WaveView } from "@/components/kiosk/learn/music/kit/visual";

// Development-only: hear and see the whole music kit.
const SYMBOLS: MSymbol[] = ["treble", "bass", "whole", "half", "quarter", "eighth", "eighths", "sixteenths", "dotted-half", "dotted-quarter", "quarter-rest", "half-rest", "whole-rest", "eighth-rest", "sharp", "flat", "natural", "fermata", "repeat", "tie", "accent", "staccato", "time44", "time68"];

export function MusicPreview() {
  const player = usePlayer();
  // Test hooks: a level meter and the engine, for checking from the console.
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__music = { meter: musicMeter, playScore, piece, songScore, melody, rhythm, progression };
  }, []);
  const [now, setNow] = useState<string>("");
  const play = (label: string, s: Parameters<typeof player.play>[0]) => {
    setNow(label);
    player.play(s, { onEnd: () => setNow("") });
  };
  const twinkle = songScore("twinkle", { inst: "piano" });
  return (
    <div className="learn-root min-h-dvh p-6" style={{ background: "var(--l-bg)" }}>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6">
        <div className="flex items-center gap-4">
          <PlayButton playing={player.playing} onClick={() => (player.playing ? player.stop() : play("Twinkle", twinkle))} />
          <h1 className="font-display text-4xl font-extrabold text-white">Music kit {now && <span className="text-2xl">· playing {now}</span>}</h1>
        </div>

        <section className="rounded-[28px] bg-white p-5" data-testid="instruments">
          <h2 className="mb-3 font-display text-2xl font-extrabold text-[var(--l-ink)]">Instruments (tap to hear a scale)</h2>
          <div className="grid grid-cols-4 gap-3 lg:grid-cols-8">
            {INST_IDS.map((id) => (
              <button key={id} type="button" data-inst={id} className="flex flex-col items-center gap-1 rounded-[18px] bg-[var(--l-card-2)] p-2" onClick={() => play(INSTRUMENTS[id].name, melody([0, 2, 4, 5, 7, 9, 11, 12].map((s) => Math.max(INSTRUMENTS[id].lo, Math.min(INSTRUMENTS[id].hi - 12, 60)) + s), 0.4, id, 120))}>
                <InstrumentPic id={id} size={72} />
                <span className="font-display text-sm font-extrabold text-[var(--l-ink)]">{INSTRUMENTS[id].name}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] bg-white p-5" data-testid="drums">
          <h2 className="mb-3 font-display text-2xl font-extrabold text-[var(--l-ink)]">Drums</h2>
          <div className="grid grid-cols-5 gap-3 lg:grid-cols-9">
            {DRUM_IDS.map((id) => (
              <button key={id} type="button" data-drum={id} className="flex flex-col items-center gap-1 rounded-[18px] bg-[var(--l-card-2)] p-2" onPointerDown={() => playDrum(id)}>
                <InstrumentPic id={id} size={60} />
                <span className="font-display text-sm font-extrabold text-[var(--l-ink)]">{DRUMS[id].name}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] bg-white p-5" data-testid="pieces">
          <h2 className="mb-3 font-display text-2xl font-extrabold text-[var(--l-ink)]">Styles and moods</h2>
          <div className="flex flex-wrap gap-2">
            {PIECE_IDS.map((id) => (
              <button key={id} type="button" data-piece={id} className="rounded-full bg-[#ffe3f0] px-4 py-2 font-display text-lg font-extrabold text-[#5b0f6e]" onClick={() => play(PIECES[id].name, piece(id))}>
                {PIECES[id].name}
              </button>
            ))}
          </div>
          <h2 className="mb-3 mt-5 font-display text-2xl font-extrabold text-[var(--l-ink)]">Songs</h2>
          <div className="flex flex-wrap gap-2">
            {SONGS.map((s) => (
              <button key={s.id} type="button" data-song={s.id} className="rounded-full bg-[#e3f3ff] px-4 py-2 font-display text-lg font-extrabold text-[var(--l-ink)]" onClick={() => play(s.title, songScore(s.id))}>
                {s.title}
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-[28px] bg-white p-5" data-testid="notation">
          <h2 className="font-display text-2xl font-extrabold text-[var(--l-ink)]">Notation</h2>
          <Staff notes={[{ p: 60, d: 1 }, { p: 62, d: 1 }, { p: 64, d: 0.5 }, { p: 65, d: 0.5 }, { p: 67, d: 1 }, { p: 69, d: 2 }, { p: null, d: 1 }, { p: 71, d: 1 }, { p: [60, 64, 67], d: 4 }]} meter={[4, 4]} active={player.playing ? 3 : -1} />
          <Staff notes={[{ p: 43, d: 1 }, { p: 47, d: 1 }, { p: 50, d: 1 }, { p: 53, d: 1 }, { p: 57, d: 0.25 }, { p: 55, d: 0.25 }, { p: 53, d: 0.5 }, { p: 52, d: 3 }]} clef="bass" keySig={-2} meter={[4, 4]} />
          <Staff notes={[{ p: 66, d: 1.5 }, { p: 67, d: 0.5 }, { p: 74, d: 1 }, { p: 73, d: 1 }]} keySig={2} meter={[3, 4]} labels="letters" />
          <RhythmStrip cells={["ta", "titi", "z", "ta", "tika", "titika", "taa"]} meter={[4, 4]} />
          <RhythmStrip cells={["ta", "titi", "z", "ta"]} style="notes" meter={[4, 4]} />
          <RhythmStrip cells={["ta", "titi", "taa"]} style="icons" />
          <button type="button" className="self-start rounded-full bg-[#ffe3f0] px-4 py-2 font-display font-extrabold" onClick={() => play("Rhythm", rhythm(["ta", "titi", "z", "ta", "tika", "titika", "taa"], { bpm: 90 }))}>Play the rhythm</button>
          <div className="flex flex-wrap gap-3">
            {SYMBOLS.map((s) => (
              <span key={s} className="flex flex-col items-center rounded-[14px] bg-[var(--l-card-2)] p-2">
                <SymbolView sym={s} size={70} />
                <span className="text-xs font-bold">{s}</span>
              </span>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-[28px] bg-white p-5" data-testid="pads">
          <h2 className="font-display text-2xl font-extrabold text-[var(--l-ink)]">Pads</h2>
          <Keyboard lo={48} hi={72} labels="letters" />
          <Bells pitches={[60, 62, 64, 67, 69, 72]} />
          <div className="flex flex-wrap items-center gap-6">
            <DrumPad />
            <Ladder tonic={60} steps={[0, 2, 4, 5, 7, 9, 11, 12]} lit={[4, 7]} />
            <Metronome bpm={96} word="Andante" on={player.playing} />
            <Dynamics marks={["p", "mf", "f", "cresc"]} />
          </div>
          <WaveView hz={330} amp={0.6} compare={{ hz: 440, amp: 0.4 }} />
          <FormBlocks sections={["A", "B", "A", "C", "A"]} active={1} />
          <ChordBlocks romans={["I", "V", "vi", "IV"]} tonic={60} scale="major" />
          <div className="flex flex-wrap items-center gap-6">
            <CircleOfFifths lit={["G", "e"]} />
            <GridView rows={["kick", "snare", "hat"]} pattern={["x...x...x...x...", "....x.......x...", "x.x.x.x.x.x.x.x."]} />
          </div>
          <button type="button" className="self-start rounded-full bg-[#ffe3f0] px-4 py-2 font-display font-extrabold" onClick={() => play("I–V–vi–IV", progression(["I", "V", "vi", "IV"], 60, "major", { bpm: 96, style: "strum", bass: true, drums: "pop", inst: "guitar" }))}>Play I–V–vi–IV with a band</button>
          <button type="button" className="self-start rounded-full bg-[#ffe3f0] px-4 py-2 font-display font-extrabold" onClick={() => playNote("piano", 60)}>One piano note</button>
        </section>
      </div>
    </div>
  );
}
