"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Score } from "@/lib/learn/mus/types";
import { musicServerSnapshot, musicSnapshot, playScore, subscribeMusic, type Playback } from "@/lib/learn/mus/synth";

// Playing music from a screen: one hook per activity. It plays a Score, reports the beat being
// heard (so notes, keys and beats can light up in time), stops when the activity goes away, and
// tells the caller when it ends. The beat is read from the audio clock — never counted with timers.

export type PlayOpts = { loop?: boolean; onEnd?: () => void; /** Beats at the start that aren't "the music" (a count-in), subtracted from the beat shown. */ offset?: number; muteTracks?: number[]; layer?: boolean; gain?: number; /** Start from this beat (keeps a loop going through a live edit). */ from?: number };

export function usePlayer() {
  const pb = useRef<Playback | null>(null);
  const raf = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState<number | null>(null);
  const [score, setScore] = useState<Score | null>(null);
  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    pb.current?.stop();
    pb.current = null;
    setPlaying(false);
    setBeat(null);
  }, []);
  const play = useCallback(
    (s: Score, o: PlayOpts = {}) => {
      cancelAnimationFrame(raf.current);
      pb.current?.stop();
      const p = playScore(s, {
        loop: o.loop,
        layer: o.layer,
        gain: o.gain,
        muteTracks: o.muteTracks,
        from: o.from,
        onEnd: () => {
          if (pb.current === p) {
            cancelAnimationFrame(raf.current);
            pb.current = null;
            setPlaying(false);
            setBeat(null);
          }
          o.onEnd?.();
        },
      });
      pb.current = p;
      setScore(s);
      if (!p) {
        // No audio (no context): still finish, so a lesson never gets stuck.
        window.setTimeout(() => o.onEnd?.(), 400);
        return null;
      }
      setPlaying(true);
      const off = o.offset ?? 0;
      let last = -999;
      const frame = () => {
        const cur = pb.current;
        if (!cur || cur !== p) return;
        const b = cur.beat() - off;
        // ~30 updates a second is plenty for lighting things up.
        if (Math.abs(b - last) >= 1 / 32) {
          last = b;
          setBeat(b);
        }
        raf.current = requestAnimationFrame(frame);
      };
      raf.current = requestAnimationFrame(frame);
      return p;
    },
    [],
  );
  useEffect(() => () => {
    cancelAnimationFrame(raf.current);
    pb.current?.stop();
  }, []);
  /** The playback in progress (call from handlers only). */
  const current = useCallback(() => pb.current, []);
  return { play, stop, playing, beat, score, current };
}

/** Is any music playing (and at what tempo)? — the companion pet grooves along. */
export function useMusicPlaying() {
  return useSyncExternalStore(subscribeMusic, musicSnapshot, musicServerSnapshot);
}
