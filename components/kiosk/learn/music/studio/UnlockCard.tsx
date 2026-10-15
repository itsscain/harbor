"use client";

import { Play } from "lucide-react";
import { Chunk } from "../../kit";
import { Glyph } from "../../art/Glyph";
import { sfx } from "@/lib/learn/sfx";
import { isDrum, isInst } from "@/lib/learn/mus/catalog";
import { NOTE_ORDER, powerName } from "@/lib/learn/mus/powers";
import { playDrum, playNote, playScore } from "@/lib/learn/mus/synth";
import { groove, type Groove } from "@/lib/learn/mus/score";
import { scale as scaleOf, type ScaleKind } from "@/lib/learn/mus/theory";
import { InstrumentPic } from "../kit/kit";

// "New in your Studio!" — the finish-screen card when a music level unlocks something: a new drum,
// note, instrument, scale, groove or tool. Tap it to hear it. Learning grows the Studio.

/** Play a taste of an unlock. */
export function tasteOf(key: string) {
  const [kind, id] = key.split(":");
  if (kind === "drum" && isDrum(id)) return playDrum(id, 1);
  if (kind === "inst" && isInst(id)) {
    [60, 64, 67, 72].forEach((p, i) => window.setTimeout(() => playNote(id, p, 0.5, 0.85), i * 180));
    return;
  }
  if (kind === "note") {
    const n = NOTE_ORDER.find((x) => x.syl === id);
    if (n) playNote("bells", 60 + n.semis, 1, 0.9);
    return;
  }
  if (kind === "scale") {
    try {
      scaleOf(60, id as ScaleKind).forEach((p, i) => window.setTimeout(() => playNote("piano", p, 0.35, 0.8), i * 150));
    } catch {
      /* unknown scale: nothing to play */
    }
    return;
  }
  if (kind === "groove") {
    try {
      playScore(groove(id as Groove, 2, 100));
    } catch {
      /* unknown groove */
    }
    return;
  }
  sfx("sticker");
}

function iconFor(key: string) {
  const [kind, id] = key.split(":");
  if ((kind === "drum" && isDrum(id)) || (kind === "inst" && isInst(id))) return <InstrumentPic id={id} size={56} />;
  if (kind === "note") return <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ff6fb5] font-display text-xl font-black text-white">{id}</span>;
  if (kind === "groove") return <InstrumentPic id="drumkit" size={56} />;
  if (kind === "tool" && id === "chords") return <InstrumentPic id="piano" size={56} />;
  if (kind === "tool" && id === "lyrics") return <Glyph e="🎤" size={52} />;
  return <InstrumentPic id="mixer" size={56} />;
}

export function UnlockCard({ keys, onStudio }: { keys: string[]; onStudio?: () => void }) {
  return (
    <div className="l-card-in flex max-w-[640px] flex-wrap items-center gap-3 rounded-[24px] p-3 pr-4 text-white shadow-[0_7px_0_rgba(120,20,80,0.25)]" style={{ background: "linear-gradient(150deg,#ff6fb5,#c04fe6)", animationDelay: "1500ms" }}>
      <div className="flex flex-col">
        <span className="font-display text-sm font-extrabold uppercase tracking-wider text-white/90">New in your Studio!</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {keys.map((k) => (
            <button key={k} type="button" onClick={() => tasteOf(k)} className="flex items-center gap-2 rounded-[18px] bg-white/95 py-1 pl-1 pr-3 text-[var(--l-ink)] shadow-[0_4px_0_rgba(0,0,0,0.15)] active:translate-y-0.5" aria-label={`Hear ${powerName(k)}`}>
              {iconFor(k)}
              <span className="font-display text-lg font-extrabold leading-tight">{powerName(k)}</span>
              <Play className="h-5 w-5 text-[#d9408f]" fill="currentColor" strokeWidth={0} />
            </button>
          ))}
        </div>
      </div>
      {onStudio && (
        <Chunk tone="violet" onClick={() => (sfx("pick"), onStudio())} className="flex h-14 items-center px-5 font-display text-lg font-extrabold">
          Try it in the Studio
        </Chunk>
      )}
    </div>
  );
}
