"use client";

import { useState } from "react";
import { Check, Shuffle } from "lucide-react";
import { cn } from "@/lib/cn";
import { say } from "@/lib/learn/audio";
import { sfx } from "@/lib/learn/sfx";
import { SONG_ADJ, SONG_KIND, SONG_NOUN } from "@/lib/learn/mus/song";
import { Chunk } from "../../kit";
import { Glyph } from "../../art/Glyph";

// Naming a song: three word wheels (a describing word, a sea word, a kind of song) — "The Groovy
// Octopus Jam". Every word is recorded, so a child who can't read hears each choice and the name.

/** A picture for each sea word (the album cover). */
export const NOUN_PIC: Record<string, string> = {
  Octopus: "🐙", Dolphin: "🐬", Pirate: "🏴‍☠️", Rocket: "🚀", Sailboat: "⛵", Starfish: "⭐", Thunder: "⚡", Lighthouse: "💡", Whale: "🐳", Waves: "🌊",
  Parrot: "🦜", Seahorse: "🐠", Sunrise: "🌅", Dragon: "🐉", Island: "🏝️", Treasure: "💎", Seagull: "🐦", Rainstorm: "🌧️", Jellyfish: "🐟", Moon: "🌙",
};
const rand = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];
/** A random name (a module helper: randomness stays out of render). */
export function randomTitle(): string {
  return `The ${rand(SONG_ADJ)} ${rand(SONG_NOUN)} ${rand(SONG_KIND)}`;
}
export function titleParts(title: string): { adj: string; noun: string; kind: string } | null {
  const m = /^The (\S+) (\S+) (\S+)$/.exec(title);
  return m && SONG_ADJ.includes(m[1]) && SONG_NOUN.includes(m[2]) && SONG_KIND.includes(m[3]) ? { adj: m[1], noun: m[2], kind: m[3] } : null;
}
export const coverPic = (title: string) => NOUN_PIC[titleParts(title)?.noun ?? ""] ?? "🎵";

export function NamePicker({ title, onPick, onClose }: { title: string; onPick: (t: string) => void; onClose: () => void }) {
  const start = titleParts(title) ?? { adj: SONG_ADJ[0], noun: SONG_NOUN[0], kind: SONG_KIND[0] };
  const [adj, setAdj] = useState(start.adj);
  const [noun, setNoun] = useState(start.noun);
  const [kind, setKind] = useState(start.kind);
  const name = `The ${adj} ${noun} ${kind}`;
  const pick = (set: (w: string) => void, w: string) => {
    sfx("pick");
    set(w);
    void say([w]);
  };
  const col = (words: string[], cur: string, set: (w: string) => void, pics?: Record<string, string>) => (
    <div className="flex max-h-[46vh] flex-col gap-2 overflow-y-auto rounded-[22px] bg-[var(--l-card-2)] p-2">
      {words.map((w) => (
        <button key={w} type="button" onClick={() => pick(set, w)} className={cn("flex items-center gap-2 rounded-[16px] px-3 py-2 text-left font-display text-xl font-extrabold transition-colors", w === cur ? "bg-[#ff6fb5] text-white shadow-[0_4px_0_#d9408f]" : "bg-white text-[var(--l-ink)]")}>
          {pics?.[w] && <Glyph e={pics[w]} size={30} />}
          {w}
        </button>
      ))}
    </div>
  );
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#2a0b3a]/55 p-4 backdrop-blur-sm">
      <div className="l-pop-in flex w-full max-w-[860px] flex-col gap-4 rounded-[32px] bg-white p-6 shadow-[0_10px_0_rgba(90,20,80,0.25)]">
        <div className="flex items-center gap-3">
          <Glyph e={NOUN_PIC[noun] ?? "🎵"} size={64} />
          <p className="flex-1 font-display text-3xl font-extrabold text-[#5b0f6e]">{name}</p>
          <Chunk
            tone="violet"
            onClick={() => {
              sfx("whoosh");
              const t = titleParts(randomTitle())!;
              setAdj(t.adj);
              setNoun(t.noun);
              setKind(t.kind);
              void say(["The", t.adj, t.noun, t.kind]);
            }}
            className="flex h-14 items-center gap-2 px-4 font-display text-lg font-extrabold"
          >
            <Shuffle className="h-6 w-6" /> Surprise me
          </Chunk>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {col(SONG_ADJ, adj, setAdj)}
          {col(SONG_NOUN, noun, setNoun, NOUN_PIC)}
          {col(SONG_KIND, kind, setKind)}
        </div>
        <div className="flex justify-end gap-3">
          <Chunk tone="white" onClick={() => (sfx("tap"), onClose())} className="h-14 px-6 font-display text-lg font-bold text-[var(--l-ink-2)]">
            Cancel
          </Chunk>
          <Chunk tone="green" onClick={() => (sfx("pick"), void say(["The", adj, noun, kind]), onPick(name))} className="flex h-14 items-center gap-2 px-8 font-display text-xl font-extrabold">
            <Check className="h-6 w-6" strokeWidth={3} /> That&apos;s the name!
          </Chunk>
        </div>
      </div>
    </div>
  );
}
