"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { say } from "@/lib/learn/audio";
import { sfx } from "@/lib/learn/sfx";
import { SAY } from "@/lib/learn/script";
import type { BoatLook } from "@/lib/learn/meta";
import { SECTION_PARTS, songScoreOf, type StudioSong } from "@/lib/learn/mus/song";
import { Chunk } from "../../kit";
import { SideBoat } from "../../KidBoat";
import { Pet } from "../../boat/Pet";
import type { Trick } from "../../boat/pets/rig";
import { CreatureView } from "../../tank/CreatureView";
import { Confetti } from "../../../Confetti";
import { Glyph } from "../../art/Glyph";
import { usePlayer } from "../kit/player";
import { coverPic } from "./NamePicker";

// The concert: the child's own song, performed. Their boat is the stage, their pet dances a new
// trick every bar, the aquarium friends they've hatched bob along in the audience, the spotlights
// pulse with the beat, and the lyrics roll by karaoke-style. At the end — applause and confetti.

/** Sea friends who come to every show (until the child hatches their own). */
const DEFAULT_AUDIENCE = ["sunny", "splash", "bubbles", "pinch", "shelly"].map((id) => ({ id, scale: 1 }));
const TRICKS: Trick[] = ["dance", "bounce", "spin", "jump", "flap", "wave", "shake", "flip"];

export function Concert({ song, look, audience, reduced, onClose }: { song: StudioSong; look: BoatLook; audience: { id: string; scale: number }[]; reduced: boolean; onClose: () => void }) {
  const player = usePlayer();
  const score = useMemo(() => songScoreOf(song), [song]);
  const [done, setDone] = useState(false);
  const [run, setRun] = useState(0);
  const spb = 60 / song.bpm;
  useEffect(() => {
    const t = window.setTimeout(() => {
      void say(SAY.studioCrowd).then(() =>
        player.play(score, {
          onEnd: () => {
            setDone(true);
            sfx("legendary");
          },
        }),
      );
    }, 400);
    return () => window.clearTimeout(t);
    // Starts once per encore.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);
  const beat = player.beat ?? -1;
  const bar = beat >= 0 ? Math.floor(beat / 4) : -1;
  const pulse = beat >= 0 ? Math.floor(beat) : -1;
  // Which section is playing (for its name and the lyric line).
  const sectionAt = (() => {
    if (!song.sections.length || bar < 0) return null;
    let b = 0;
    for (const id of song.sections) {
      const len = song.bars * (id === "chorus" ? 2 : 1);
      if (bar < b + len) return { id, barIn: bar - b };
      b += len;
    }
    return null;
  })();
  const lyric = song.lyrics.length && bar >= 0 ? song.lyrics[(sectionAt ? sectionAt.barIn : bar) % song.lyrics.length] : "";
  const trick: Trick = TRICKS[Math.max(0, bar) % TRICKS.length];
  return (
    <div className="fixed inset-0 z-[70] overflow-hidden" style={{ background: "radial-gradient(1200px 600px at 50% 110%, #3a1a6e 0%, transparent 60%), linear-gradient(180deg, #0b1030 0%, #1a1450 55%, #2b1660 100%)" }}>
      {/* Stars */}
      {Array.from({ length: 26 }, (_, k) => (
        <span key={k} className="l-twinkle absolute rounded-full bg-white" style={{ left: `${(k * 37) % 100}%`, top: `${(k * 23) % 45}%`, width: 3 + (k % 3), height: 3 + (k % 3), animationDelay: `${(k % 7) * 0.4}s` }} />
      ))}
      {/* Spotlights pulse with the beat. */}
      {[18, 50, 82].map((x, k) => (
        <div
          key={k}
          className="pointer-events-none absolute top-0 h-[78%] w-[34%] -translate-x-1/2 transition-opacity duration-150"
          style={{ left: `${x}%`, background: `conic-gradient(from 180deg at 50% 0%, transparent 160deg, ${["#ff6fb5", "#ffd25a", "#5cf2c3"][k]}55 175deg, ${["#ff6fb5", "#ffd25a", "#5cf2c3"][k]}55 185deg, transparent 200deg)`, opacity: pulse >= 0 && (pulse + k) % 3 === 0 ? 1 : 0.45, filter: "blur(2px)" } as CSSProperties}
        />
      ))}
      {/* Title */}
      <div className="absolute inset-x-0 top-4 flex items-center justify-center gap-3">
        <span className="flex items-center gap-3 rounded-full bg-white/95 px-6 py-2 shadow-[0_6px_0_rgba(0,0,0,0.25)]">
          <Glyph e={coverPic(song.title)} size={44} />
          <span className="font-display text-2xl font-extrabold text-[#5b0f6e]">{song.title}</span>
          {sectionAt && <span className="rounded-full px-3 py-0.5 font-display text-sm font-extrabold text-white" style={{ background: SECTION_PARTS[sectionAt.id].color }}>{SECTION_PARTS[sectionAt.id].name}</span>}
        </span>
      </div>
      <Chunk tone="ghost" aria-label="Leave the concert" onClick={() => (sfx("tap"), player.stop(), onClose())} className="absolute right-5 top-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ borderRadius: 999 }}>
        <X className="h-7 w-7" strokeWidth={3} />
      </Chunk>
      {/* The sea and the stage */}
      <div className="absolute inset-x-0 bottom-0 h-[34%]" style={{ background: "linear-gradient(180deg,#26407e,#152a5c)" }} />
      <div className={cn("absolute bottom-[22%] left-1/2 -translate-x-1/2", player.playing && !reduced && "m-groove")} style={{ "--beat": `${spb}s` } as CSSProperties}>
        <SideBoat look={look} size={360} bob={!reduced} still={reduced} night petReact={pulse >= 0 && pulse % 4 === 0 ? { mood: "cheer", k: pulse } : null} />
      </div>
      {/* The pet, big, as the lead dancer */}
      {look.pet && (
        <div className="absolute bottom-[26%] left-[14%]">
          <Pet id={look.pet} size={170} trick={bar >= 0 && !reduced ? { t: trick, k: bar } : null} />
        </div>
      )}
      {/* The audience: aquarium friends bobbing along */}
      <div className="absolute inset-x-0 bottom-3 flex items-end justify-center gap-4">
        {(audience.length ? audience : DEFAULT_AUDIENCE).map((c, k) => (
          <span key={k} className={cn(player.playing && !reduced && "m-groove")} style={{ "--beat": `${spb * (k % 2 ? 2 : 1)}s`, animationDelay: `${k * 0.07}s` } as CSSProperties}>
            <CreatureView id={c.id} size={Math.round(64 * Math.min(1.4, c.scale))} animate={!reduced} />
          </span>
        ))}
      </div>
      {/* Karaoke */}
      {lyric && (
        <div className="absolute inset-x-0 bottom-[36%] flex justify-center">
          <span key={`${bar}:${lyric}`} className="l-pop-in rounded-[22px] bg-black/45 px-6 py-2 font-display text-3xl font-extrabold text-white">{lyric}</span>
        </div>
      )}
      {done && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
          {!reduced && <Confetti count={90} spread={520} accent="#ff6fb5" />}
          <p className="l-pop-in font-display text-[72px] font-black text-white drop-shadow-[0_6px_0_rgba(0,0,0,0.35)]">Bravo!</p>
          <div className="flex gap-3">
            <Chunk tone="green" onClick={() => (sfx("pick"), setDone(false), setRun((r) => r + 1))} className="flex h-16 items-center gap-2 px-8 font-display text-2xl font-extrabold">
              <RotateCcw className="h-7 w-7" strokeWidth={3} /> Encore!
            </Chunk>
            <Chunk tone="white" onClick={() => (sfx("tap"), onClose())} className="h-16 px-8 font-display text-xl font-bold text-[var(--l-ink)]">
              Back to the Studio
            </Chunk>
          </div>
        </div>
      )}
    </div>
  );
}
