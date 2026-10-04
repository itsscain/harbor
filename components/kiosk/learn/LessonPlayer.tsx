"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Activity, Lesson, LearnResult } from "@/lib/learn/types";
import { lessonStars } from "@/lib/learn/progress";
import { pickSticker } from "@/lib/learn/stickers";
import { COMBO, PRAISE, RETRY, SAY, lessonClipKeys } from "@/lib/learn/script";
import { preload, say, stopVoice, type Part } from "@/lib/learn/audio";
import { sfx, buzz } from "@/lib/learn/sfx";
import { BurstLayer, Chunk, useBursts } from "./kit";
import type { LessonFx } from "./acts/common";
import { MeetAct, FindLetterAct, FirstSoundAct, RhymeAct, ReadWordAct, BuildAct, BlendAct, PopAct, SentenceAct } from "./acts/ReadingActs";
import { TraceAct } from "./acts/TraceAct";
import { CountAct, MakeAct, AddAct } from "./acts/MathActs";
import { CodeAct } from "./acts/CodeAct";

// One lesson, start to finish: a progress bar of chunks, one activity at a time, instant
// feedback on every answer (a chime that climbs with each answer in a row, stars flying out,
// a word of praise), and a gentle second chance on a miss. At the end the result is saved and
// the celebration takes over.

export type LessonOutcome = { result: LearnResult; stars: number; perfectStreak: number };

const FLOW_CLIPS = [...PRAISE, ...RETRY, ...COMBO, SAY.wantToLeave, SAY.lessonDone, SAY.perfect, SAY.openChest, SAY.newSticker, SAY.rareSticker, SAY.legendarySticker, SAY.goalDone, SAY.levelUp, SAY.streakUp, SAY.starsEarned, SAY.letsGo];

/** Seconds since a moment (a helper, so it stays out of render). */
const secondsSince = (t: number) => Math.round((Date.now() - t) / 1000);

function ActView({ act: a, ...props }: { act: Activity; fx: LessonFx; onDone: (m: number) => void }): ReactNode {
  switch (a.kind) {
    case "meet":
      return <MeetAct act={a} {...props} />;
    case "trace":
      return <TraceAct act={a} {...props} />;
    case "find-letter":
      return <FindLetterAct act={a} {...props} />;
    case "first-sound":
      return <FirstSoundAct act={a} {...props} />;
    case "rhyme":
      return <RhymeAct act={a} {...props} />;
    case "build":
      return <BuildAct act={a} {...props} />;
    case "blend":
      return <BlendAct act={a} {...props} />;
    case "read-word":
      return <ReadWordAct act={a} {...props} />;
    case "pop":
      return <PopAct act={a} {...props} />;
    case "sentence":
      return <SentenceAct act={a} {...props} />;
    case "count":
      return <CountAct act={a} {...props} />;
    case "make":
      return <MakeAct act={a} {...props} />;
    case "add":
      return <AddAct act={a} {...props} />;
    case "code":
      return <CodeAct act={a} {...props} />;
  }
}

export function LessonPlayer({
  lesson,
  childId,
  playId,
  owned,
  reduced,
  onExit,
  onComplete,
}: {
  lesson: Lesson;
  childId: string;
  /** Unique per play (seeds shuffles + the result's id). */
  playId: string;
  /** Stickers the child already has (so the chest favors new ones). */
  owned: Record<string, number>;
  reduced: boolean;
  onExit: () => void;
  onComplete: (o: LessonOutcome) => void;
}) {
  const acts = lesson.activities;
  const [i, setI] = useState(0);
  const [misses, setMisses] = useState<number[]>([]);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [comboFlash, setComboFlash] = useState<{ n: number; k: number } | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const [ready, setReady] = useState(false);
  const promptRef = useRef<Part[]>([]);
  const comboRef = useRef(0);
  const praiseRef = useRef(0);
  const startedAt = useRef(0);
  const { bursts, fireAt } = useBursts();

  // Warm every sound this lesson needs before the first activity speaks.
  useEffect(() => {
    let live = true;
    startedAt.current = Date.now();
    const keys = [...lessonClipKeys(lesson), ...FLOW_CLIPS];
    const timeout = window.setTimeout(() => live && setReady(true), 2500); // never hold a kid back
    void preload(keys).then(() => {
      if (!live) return;
      window.clearTimeout(timeout);
      setReady(true);
    });
    return () => {
      live = false;
      window.clearTimeout(timeout);
      stopVoice();
    };
  }, [lesson]);

  // Which activity kinds have already appeared (the long instructions are said once per play).
  const firstTime = useMemo(() => !acts.slice(0, i).some((a) => a.kind === acts[i]?.kind), [acts, i]);

  const right = useCallback(
    (el?: Element | null, extra: Part[] = []) => {
      const n = comboRef.current + 1;
      comboRef.current = n;
      setCombo(n);
      setBestCombo((b) => Math.max(b, n));
      sfx("correct", n - 1);
      buzz([0, 18, 30, 18]);
      fireAt(el ?? null, "star", n >= 3 ? 14 : 10);
      let line: string;
      if (n === 3 || n === 5 || n === 8) {
        line = COMBO[(n === 3 ? 2 : n === 5 ? 0 : 1) % COMBO.length];
        setComboFlash({ n, k: Date.now() });
      } else line = PRAISE[praiseRef.current++ % PRAISE.length];
      void say([line, ...(extra.length ? [{ gap: 120 }, ...extra] : [])]);
    },
    [fireAt],
  );
  const wrong = useCallback((el?: Element | null, reprompt: Part[] = []) => {
    comboRef.current = 0;
    setCombo(0);
    sfx("wrong");
    buzz([0, 30, 40, 30]);
    void say([RETRY[praiseRef.current++ % RETRY.length], ...(reprompt.length ? [{ gap: 250 }, ...reprompt] : [])]);
    void el;
  }, []);

  const fx: LessonFx = useMemo(
    () => ({
      say,
      setPrompt: (p) => {
        promptRef.current = p;
      },
      right,
      wrong,
      burst: (el, kind, count) => fireAt(el ?? null, kind, count),
      firstTime,
      seed: `${playId}:${i}`,
      reduced,
    }),
    [right, wrong, fireAt, firstTime, playId, i, reduced],
  );

  const finish = (all: number[]) => {
    const mistakes = all.reduce((s, m) => s + Math.min(2, m), 0);
    const stars = lessonStars(mistakes, acts.length);
    const sticker = pickSticker(`${childId}:${lesson.id}:${playId}`, owned, stars);
    const result: LearnResult = {
      op_id: `${childId}:${lesson.id}:${playId}`,
      child_id: childId,
      lesson_id: lesson.id,
      subject: lesson.subject,
      stars,
      correct: all.filter((m) => m === 0).length,
      total: acts.length,
      duration_sec: secondsSince(startedAt.current),
      sticker: sticker.id,
      completed_at: new Date().toISOString(),
    };
    onComplete({ result, stars, perfectStreak: bestCombo });
  };

  const onDone = (m: number) => {
    const all = [...misses, m];
    setMisses(all);
    if (all.length >= acts.length) finish(all);
    else setI(all.length);
  };

  useEffect(() => {
    if (!comboFlash) return;
    const t = window.setTimeout(() => setComboFlash(null), 1600);
    return () => window.clearTimeout(t);
  }, [comboFlash]);

  const progress = misses.length / acts.length;

  return (
    <div className="fixed inset-0 z-[45] flex flex-col overflow-hidden" style={{ background: "var(--l-bg)" }}>
      <BurstLayer bursts={bursts} />
      {/* Top bar: leave · progress · combo · hear again */}
      <div className="flex items-center gap-4 px-5 pb-2 pt-4 sm:px-8">
        <Chunk tone="ghost" aria-label="Stop the lesson" onClick={() => (sfx("tap"), setConfirmExit(true), void say(SAY.wantToLeave))} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full" style={{ borderRadius: 999 }}>
          <X className="h-7 w-7" strokeWidth={3} />
        </Chunk>
        <div className="relative h-7 flex-1 overflow-hidden rounded-full bg-white/30 shadow-[inset_0_3px_0_rgba(0,40,80,0.12)]">
          <div className="absolute inset-y-0 left-0 rounded-full bg-[var(--l-gold)] transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ width: `${Math.max(4, progress * 100)}%` }}>
            <div className="absolute inset-x-3 top-1.5 h-2 rounded-full bg-white/45" />
          </div>
          {Array.from({ length: acts.length - 1 }, (_, k) => (
            <span key={k} className="absolute inset-y-1.5 w-[3px] rounded-full bg-white/40" style={{ left: `${((k + 1) / acts.length) * 100}%` }} />
          ))}
        </div>
        <div className={cn("flex h-14 min-w-14 items-center justify-center gap-1 rounded-full px-3 font-display text-2xl font-extrabold text-white transition-all", combo >= 2 ? "bg-[var(--l-orange)] shadow-[0_5px_0_var(--l-orange-edge)]" : "bg-white/20")} aria-label={`${combo} in a row`}>
          <span className={cn(combo >= 2 && "l-flame")}>🔥</span>
          {combo >= 2 && <span key={combo} className="l-pop-in tabular-nums">{combo}</span>}
        </div>
        <Chunk tone="blue" aria-label="Hear it again" onClick={() => (sfx("tap"), promptRef.current.length && void say(promptRef.current))} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full" style={{ borderRadius: 999 }}>
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5 6 9H2v6h4l5 4V5z" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        </Chunk>
      </div>

      {/* The activity */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 pb-6 pt-2 sm:px-8">
        {ready ? (
          <div key={i} className="l-slide-in flex h-full w-full max-w-[1180px] items-center justify-center">
            <ActView act={acts[i]} fx={fx} onDone={onDone} />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-white">
            <span className="l-bob text-7xl">{lesson.emoji}</span>
            <p className="font-display text-3xl font-extrabold drop-shadow-[0_2px_0_rgba(0,40,80,0.25)]">{lesson.title}</p>
          </div>
        )}
        {comboFlash && (
          <div key={comboFlash.k} className="l-pop-in pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 rounded-full bg-[var(--l-orange)] px-7 py-3 font-display text-3xl font-extrabold text-white shadow-[0_6px_0_var(--l-orange-edge)]">
            🔥 {comboFlash.n} in a row!
          </div>
        )}
      </div>

      {confirmExit && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0b2340]/55 p-6 backdrop-blur-sm">
          <div className="l-pop-in w-full max-w-md rounded-[32px] bg-white p-7 text-center shadow-[0_10px_0_var(--l-line)]">
            <div className="text-6xl">🛟</div>
            <p className="mt-3 font-display text-3xl font-extrabold text-[var(--l-ink)]">Stop this lesson?</p>
            <p className="mt-1 text-lg text-[var(--l-ink-2)]">You&rsquo;re doing great — you can finish it later.</p>
            <div className="mt-6 flex flex-col gap-3">
              <Chunk tone="green" onClick={() => (sfx("pick"), setConfirmExit(false), void say(SAY.keepGoing))} className="h-16 font-display text-2xl font-extrabold">
                Keep going!
              </Chunk>
              <Chunk tone="white" onClick={() => (sfx("tap"), onExit())} className="h-14 font-display text-xl font-bold text-[var(--l-ink-2)]">
                Stop for now
              </Chunk>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
