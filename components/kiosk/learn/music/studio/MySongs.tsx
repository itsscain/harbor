"use client";

import { useState } from "react";
import { Play, Plus, Square, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { sfx } from "@/lib/learn/sfx";
import { NOTE_COLORS } from "@/lib/learn/mus/theory";
import { songScoreOf, type StudioSong } from "@/lib/learn/mus/song";
import { Chunk } from "../../kit";
import { Glyph } from "../../art/Glyph";
import { usePlayer } from "../kit/player";
import { coverPic } from "./NamePicker";

// My Songs: every song the child has kept, as an album cover — tap the cover to hear it, open it
// to keep working on it, or (two taps) let it go.

export function MySongs({ songs, current, onOpen, onNew, onDelete }: { songs: StudioSong[]; current: string | null; onOpen: (s: StudioSong) => void; onNew: () => void; onDelete: (id: string) => void }) {
  const player = usePlayer();
  const [playing, setPlaying] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const toggle = (s: StudioSong) => {
    sfx("tap");
    if (playing === s.id) {
      player.stop();
      setPlaying(null);
      return;
    }
    setPlaying(s.id);
    player.play(songScoreOf(s), { onEnd: () => setPlaying(null) });
  };
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      <button type="button" onClick={() => (sfx("pick"), onNew())} className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-[26px] border-[4px] border-dashed border-white/70 bg-white/20 font-display text-2xl font-extrabold text-white">
        <Plus className="h-12 w-12" strokeWidth={3} /> New song
      </button>
      {songs.map((s) => {
        const c = NOTE_COLORS[((s.key % 12) + 12) % 12];
        const on = playing === s.id;
        return (
          <div key={s.id} className={cn("l-rise flex flex-col overflow-hidden rounded-[26px] bg-white shadow-[0_8px_0_rgba(90,20,80,0.2)]", current === s.id && "ring-4 ring-[#ff6fb5]")}>
            <button type="button" onClick={() => toggle(s)} className="relative flex h-[150px] items-center justify-center" style={{ background: `radial-gradient(circle at 30% 25%, #ffffff66, transparent 50%), linear-gradient(140deg, ${c}, #c04fe6)` }} aria-label={on ? `Stop ${s.title}` : `Play ${s.title}`}>
              <Glyph e={coverPic(s.title)} size={96} className={cn(on && "m-groove")} />
              <span className="absolute bottom-2 right-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-[#d9408f] shadow-[0_4px_0_rgba(0,0,0,0.2)]">
                {on ? <Square className="h-5 w-5" fill="currentColor" strokeWidth={0} /> : <Play className="ml-0.5 h-6 w-6" fill="currentColor" strokeWidth={0} />}
              </span>
            </button>
            <div className="flex flex-1 flex-col gap-2 p-3">
              <p className="font-display text-lg font-extrabold leading-tight text-[var(--l-ink)]">{s.title}</p>
              <div className="mt-auto flex gap-2">
                <Chunk tone="violet" onClick={() => (sfx("pick"), player.stop(), onOpen(s))} className="h-11 flex-1 font-display text-base font-extrabold">
                  Open
                </Chunk>
                <Chunk
                  tone={confirm === s.id ? "coral" : "white"}
                  aria-label={confirm === s.id ? "Tap again to delete" : "Delete"}
                  onClick={() => {
                    if (confirm === s.id) {
                      sfx("whoosh");
                      player.stop();
                      setConfirm(null);
                      onDelete(s.id);
                    } else {
                      sfx("tap");
                      setConfirm(s.id);
                    }
                  }}
                  className="flex h-11 items-center justify-center gap-1 px-3 font-display text-sm font-extrabold"
                >
                  <Trash2 className={cn("h-5 w-5", confirm !== s.id && "text-[var(--l-ink-2)]")} />
                  {confirm === s.id && "Sure?"}
                </Chunk>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
