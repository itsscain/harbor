"use client";

import { useEffect, useRef, useState } from "react";
import { Music, Play, Square } from "lucide-react";
import { cn } from "@/lib/cn";
import { songScoreOf, type StudioSong } from "@/lib/learn/mus/song";
import { NOTE_COLORS } from "@/lib/learn/mus/theory";
import { playScore, type Playback } from "@/lib/learn/mus/synth";
import { setSfx } from "@/lib/learn/sfx";
import { resumeAudioCtx } from "@/lib/kiosk/audioctx";

// The songs a child made in the wall's Music Studio, playable right here on a parent's phone —
// the same synth the wall uses, so it sounds exactly like what they heard when they made it.

export function KidSongs({ kidName, songs, tz }: { kidName: string; songs: StudioSong[]; tz: string }) {
  const [playing, setPlaying] = useState<string | null>(null);
  const pb = useRef<Playback | null>(null);
  useEffect(() => () => pb.current?.stop(), []);
  const toggle = (s: StudioSong) => {
    if (playing === s.id) {
      pb.current?.stop();
      pb.current = null;
      setPlaying(null);
      return;
    }
    pb.current?.stop();
    resumeAudioCtx();
    setSfx(true, 1);
    pb.current = playScore(songScoreOf(s), { onEnd: () => setPlaying((p) => (p === s.id ? null : p)) });
    setPlaying(s.id);
  };
  if (!songs.length)
    return <p className="text-sm text-fg-muted">When {kidName} makes a song in the Music Studio on the wall, it shows up here — tap it to hear it.</p>;
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {songs.slice(0, 12).map((s) => {
        const on = playing === s.id;
        const parts = [s.beat.grid.some((g) => g.includes("x")) && "beat", s.melody.notes.some((n) => typeof n === "number") && "tune", s.chords.on && "chords", s.lyrics.length > 0 && "lyrics"].filter(Boolean).join(" · ");
        return (
          <li key={s.id}>
            <button type="button" onClick={() => toggle(s)} className={cn("flex w-full items-center gap-3 rounded-xl border border-line bg-surface-2 p-2.5 text-left transition-colors", on && "border-accent")} aria-label={on ? `Stop ${s.title}` : `Play ${s.title}`}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: `linear-gradient(140deg, ${NOTE_COLORS[((s.key % 12) + 12) % 12]}, #c04fe6)` }}>
                {on ? <Square className="h-5 w-5" fill="currentColor" strokeWidth={0} /> : <Play className="ml-0.5 h-5 w-5" fill="currentColor" strokeWidth={0} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-fg">{s.title}</span>
                <span className="block truncate text-xs text-fg-muted">
                  <Music className="mr-1 inline h-3 w-3" />
                  {parts || "a song"} · {s.bpm} bpm{s.at ? ` · ${new Date(s.at).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: tz })}` : ""}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
