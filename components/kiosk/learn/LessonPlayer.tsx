"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Activity, Lesson } from "@/lib/learn/types";
import type { BoatLook } from "@/lib/learn/meta";
import type { Skills } from "@/lib/learn/mastery";
import { spiralItems } from "@/lib/learn/curriculum";
import { rng, int } from "@/lib/learn/gen";
import { COMBO, PRAISE, RETRY, SAY, lessonClipKeys, type VoiceLevel } from "@/lib/learn/script";
import { preload, say, stopVoice, type Part } from "@/lib/learn/audio";
import { sfx, buzz } from "@/lib/learn/sfx";
import { BurstLayer, Chunk, useBursts } from "./kit";
import { SideBoat } from "./KidBoat";
import type { LessonFx } from "./acts/common";
import { MeetAct, FindLetterAct, FirstSoundAct, RhymeAct, ReadWordAct, BuildAct, BlendAct, PopAct, SentenceAct } from "./acts/ReadingActs";
import { TraceAct } from "./acts/TraceAct";
import { CountAct, MakeAct, AddAct } from "./acts/MathActs";
import { ChoiceAct, KeypadAct, ScenarioAct } from "./acts/ChoiceActs";
import { SortAct, OrderAct, MatchAct, PlaceAct } from "./acts/DragActs";
import { CodeAct } from "./code/CodeAct";

// One level, start to finish. Proven learning moves, built in:
//  • first-try accuracy decides the stars (60% passes) — honest, so the map means something;
//  • every miss gets a second chance, hints that climb, and the "why" once it's found;
//  • missed items come back in a retry round before the level ends (retrieval practice);
//  • a couple of "from before" items weave in skills that are due (spaced repetition);
//  • per-skill results go home, so the next practice targets exactly what's shaky.
// And the fun: a boat that sails the progress lane, combos that climb, boss levels with a sea
// monster to beat, and the occasional golden fish worth bonus shells.

export type LessonOutcome = {
  correct: number;
  total: number;
  skills: Record<string, [number, number]>;
  durationSec: number;
  bestCombo: number;
  fishShells: number;
  /** Skills missed on the first try (for a Practice Cove detour). */
  missed: string[];
};

type Item = { act: Activity; kind: "main" | "spiral" | "retry"; scored: boolean };

const FLOW_CLIPS = [...PRAISE, ...RETRY, ...COMBO, SAY.wantToLeave, SAY.keepGoing, SAY.fromBefore, SAY.retryRound, SAY.goldenFish, SAY.bossTime, SAY.reviewTime, SAY.hint, SAY.listenAgain, SAY.lessonDone, SAY.perfect, SAY.almost];
/** Seconds since a moment (helpers, so the clock stays out of render). */
const secondsSince = (t: number) => Math.round((Date.now() - t) / 1000);
const nowMs = () => Date.now();
/** "Meet" just introduces something — nothing to get wrong. */
const isScored = (a: Activity) => a.kind !== "meet";

function ActView({ act: a, ...props }: { act: Activity; fx: LessonFx; onDone: (m: number) => void }): ReactNode {
  switch (a.kind) {
    case "meet": return <MeetAct act={a} {...props} />;
    case "trace": return <TraceAct act={a} {...props} />;
    case "find-letter": return <FindLetterAct act={a} {...props} />;
    case "first-sound": return <FirstSoundAct act={a} {...props} />;
    case "rhyme": return <RhymeAct act={a} {...props} />;
    case "build": return <BuildAct act={a} {...props} />;
    case "blend": return <BlendAct act={a} {...props} />;
    case "read-word": return <ReadWordAct act={a} {...props} />;
    case "pop": return <PopAct act={a} {...props} />;
    case "sentence": return <SentenceAct act={a} {...props} />;
    case "count": return <CountAct act={a} {...props} />;
    case "make": return <MakeAct act={a} {...props} />;
    case "add": return <AddAct act={a} {...props} />;
    case "choice": return <ChoiceAct act={a} {...props} />;
    case "keypad": return <KeypadAct act={a} {...props} />;
    case "scenario": return <ScenarioAct act={a} {...props} />;
    case "sort": return <SortAct act={a} {...props} />;
    case "order": return <OrderAct act={a} {...props} />;
    case "match": return <MatchAct act={a} {...props} />;
    case "place": return <PlaceAct act={a} {...props} />;
    case "code": return <CodeAct act={a} {...props} />;
  }
}

export function LessonPlayer({
  lesson,
  playId,
  skills,
  voice,
  look,
  reduced,
  onExit,
  onComplete,
}: {
  lesson: Lesson;
  /** Unique per play (seeds shuffles, the surprise fish, the result's id). */
  playId: string;
  /** The child's skill memory (picks the "from before" items). */
  skills: Skills;
  voice: VoiceLevel;
  look: BoatLook;
  reduced: boolean;
  onExit: () => void;
  onComplete: (o: LessonOutcome) => void;
}) {
  // The queue: the lesson, with up to two due skills from earlier woven in.
  const [queue, setQueue] = useState<Item[]>(() => {
    const main: Item[] = lesson.activities.map((act) => ({ act, kind: "main", scored: isScored(act) }));
    const extra = lesson.kind === "lesson" ? spiralItems(lesson, skills, nowMs(), main.length >= 6 ? 2 : 1) : [];
    const out = [...main];
    extra.forEach((act, k) => out.splice(Math.min(out.length, Math.round(((k + 1) * out.length) / (extra.length + 1)) + k), 0, { act, kind: "spiral", scored: false }));
    return out;
  });
  const [i, setI] = useState(0);
  const [results, setResults] = useState<number[]>([]); // mistakes per queue item
  const [retryAnnounced, setRetryAnnounced] = useState(false);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [comboFlash, setComboFlash] = useState<{ n: number; k: number } | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const [ready, setReady] = useState(false);
  const [why, setWhy] = useState<{ text: string; k: number } | null>(null);
  const [bossHit, setBossHit] = useState(0);
  const [fish, setFish] = useState<{ k: number; caught: boolean } | null>(null);
  const [fishShells, setFishShells] = useState(0);
  const promptRef = useRef<Part[]>([]);
  const comboRef = useRef(0);
  const praiseRef = useRef(0);
  const startedAt = useRef(0);
  const { bursts, fireAt } = useBursts();
  const boss = lesson.kind === "boss";
  const scoredMain = queue.filter((q) => q.kind === "main" && q.scored).length;
  const bossHp = boss ? scoredMain - queue.slice(0, results.length).filter((q, k) => q.kind === "main" && q.scored && results[k] === 0).length : 0;

  // The surprise: about one level in three, a golden fish swims by partway through.
  const fishAt = useMemo(() => {
    const r = rng(`fish:${playId}`);
    return r() < 0.34 && lesson.activities.length >= 4 ? int(r, 2, lesson.activities.length - 2) : -1;
  }, [playId, lesson.activities.length]);

  // Warm every sound this level needs before the first activity speaks.
  useEffect(() => {
    let live = true;
    startedAt.current = Date.now();
    const keys = [...lessonClipKeys(lesson), ...FLOW_CLIPS];
    const timeout = window.setTimeout(() => live && setReady(true), 2500); // never hold a kid back
    void preload(keys).then(() => {
      if (!live) return;
      window.clearTimeout(timeout);
      setReady(true);
      if (lesson.kind === "boss") {
        sfx("boss");
        void say(SAY.bossTime);
      } else if (lesson.kind === "review") void say(SAY.reviewTime);
    });
    return () => {
      live = false;
      window.clearTimeout(timeout);
      stopVoice();
    };
  }, [lesson]);

  const cur = queue[i];
  const firstTime = useMemo(() => !queue.slice(0, i).some((q) => q.act.kind === cur?.act.kind), [queue, i, cur]);

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
      if (n === 3 || n === 5 || n === 8 || n === 12) {
        line = COMBO[(n === 3 ? 2 : n === 5 ? 0 : n === 8 ? 1 : 3) % COMBO.length];
        setComboFlash({ n, k: Date.now() });
      } else line = PRAISE[praiseRef.current++ % PRAISE.length];
      void say([line, ...(extra.length ? [{ gap: 120 }, ...extra] : [])]);
    },
    [fireAt],
  );
  const miss = useCallback(() => {
    comboRef.current = 0;
    setCombo(0);
    sfx("wrong");
    buzz([0, 30, 40, 30]);
  }, []);
  const wrong = useCallback(
    (el?: Element | null, reprompt: Part[] = []) => {
      miss();
      void say([RETRY[praiseRef.current++ % RETRY.length], ...(reprompt.length ? [{ gap: 250 }, ...reprompt] : [])]);
      void el;
    },
    [miss],
  );
  const explain = useCallback(async (text: string, parts?: Part[]) => {
    setWhy({ text, k: Date.now() });
    const t0 = Date.now();
    if (parts?.length) await say(parts);
    const left = Math.max(0, 2300 - (Date.now() - t0));
    await new Promise((r) => window.setTimeout(r, left));
    setWhy(null);
  }, []);

  const fx: LessonFx = useMemo(
    () => ({
      say,
      setPrompt: (p) => {
        promptRef.current = p;
      },
      right,
      wrong,
      miss,
      explain,
      burst: (el, kind, count) => fireAt(el ?? null, kind, count),
      firstTime,
      seed: `${playId}:${i}`,
      reduced,
      voice,
      look,
    }),
    [right, wrong, miss, explain, fireAt, firstTime, playId, i, reduced, voice, look],
  );

  const finish = (all: number[], q: Item[]) => {
    const sk: Record<string, [number, number]> = {};
    let correct = 0;
    let total = 0;
    const missed = new Set<string>();
    q.forEach((it, k) => {
      if (it.kind === "retry" || !isScored(it.act)) return;
      const ok = all[k] === 0;
      if (it.act.skill) {
        const cur = sk[it.act.skill] ?? [0, 0];
        sk[it.act.skill] = [cur[0] + (ok ? 1 : 0), cur[1] + 1];
        if (!ok) missed.add(it.act.skill);
      }
      if (it.kind === "main") {
        total++;
        if (ok) correct++;
      }
    });
    onComplete({ correct, total, skills: sk, durationSec: secondsSince(startedAt.current), bestCombo, fishShells, missed: [...missed] });
  };

  const onDone = (m: number) => {
    const all = [...results, m];
    setResults(all);
    if (boss && cur?.kind === "main" && cur.scored && m === 0) setBossHit((h) => h + 1);
    if (i === fishAt) window.setTimeout(() => {
      setFish({ k: Date.now(), caught: false });
      sfx("fish");
      void say(SAY.goldenFish);
    }, 700);
    let q = queue;
    if (all.length >= q.length) {
      // Retry round: the ones missed on the first try come back once (not code — those were solved).
      const again = !retryAnnounced ? q.filter((it, k) => it.kind !== "retry" && all[k] > 0 && it.act.kind !== "code" && it.act.kind !== "meet").slice(0, 3) : [];
      if (again.length) {
        q = [...q, ...again.map((it) => ({ act: it.act, kind: "retry" as const, scored: false }))];
        setQueue(q);
        setRetryAnnounced(true);
        window.setTimeout(() => void say(SAY.retryRound), 600);
      } else return finish(all, q);
    }
    setI(all.length);
  };

  useEffect(() => {
    if (!comboFlash) return;
    const t = window.setTimeout(() => setComboFlash(null), 1600);
    return () => window.clearTimeout(t);
  }, [comboFlash]);
  useEffect(() => {
    if (!fish || fish.caught) return;
    const t = window.setTimeout(() => setFish(null), 6600);
    return () => window.clearTimeout(t);
  }, [fish]);

  const catchFish = (el: Element) => {
    if (!fish || fish.caught) return;
    const n = 8 + Math.floor(rng(`fishv:${playId}`)() * 13);
    setFish({ ...fish, caught: true });
    setFishShells((s) => s + n);
    sfx("coin");
    fireAt(el, "sea", 16);
    window.setTimeout(() => setFish(null), 1400);
  };

  const progress = Math.min(1, results.length / queue.length);
  const kindBadge = cur?.kind === "spiral" ? "🗺️ From before!" : cur?.kind === "retry" ? "🔁 Try again!" : null;

  return (
    <div className="fixed inset-0 z-[45] flex flex-col overflow-hidden" style={{ background: "var(--l-bg)" }}>
      <BurstLayer bursts={bursts} />
      {/* Top bar: leave · the boat sailing the lane · combo · hear again */}
      <div className="flex items-center gap-4 px-5 pb-2 pt-4 sm:px-8">
        <Chunk tone="ghost" aria-label="Stop the level" onClick={() => (sfx("tap"), setConfirmExit(true), void say(SAY.wantToLeave))} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full" style={{ borderRadius: 999 }}>
          <X className="h-7 w-7" strokeWidth={3} />
        </Chunk>
        <div className="relative h-14 flex-1">
          <div className="absolute inset-x-0 top-1/2 h-5 -translate-y-1/2 overflow-hidden rounded-full bg-white/25 shadow-[inset_0_3px_0_rgba(0,40,80,0.12)]">
            <div className="absolute inset-y-0 left-0 rounded-full bg-[var(--l-gold)] transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ width: `${Math.max(3, progress * 100)}%` }}>
              <div className="absolute inset-x-3 top-1 h-1.5 rounded-full bg-white/45" />
            </div>
          </div>
          <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/3 text-4xl drop-shadow-[0_3px_0_rgba(0,40,80,0.2)]">{boss ? "🐙" : "🏝️"}</span>
          <span className="absolute top-1/2 transition-[left] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ left: `calc(${progress * 100}% - 34px)`, transform: "translateY(-62%)" }}>
            <SideBoat look={look} size={64} bob={!reduced} />
          </span>
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

      {/* Boss health */}
      {boss && ready && (
        <div className="mx-auto flex w-full max-w-[640px] items-center gap-3 px-6">
          <span key={bossHit} className={cn("text-5xl", bossHit > 0 && "l-hit")}>🐙</span>
          <div className="relative h-5 flex-1 overflow-hidden rounded-full bg-black/25">
            <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#ef4444] to-[#f97316] transition-[width] duration-500" style={{ width: `${(bossHp / Math.max(1, scoredMain)) * 100}%` }} />
          </div>
          <span className="font-display text-lg font-extrabold text-white">{bossHp <= 0 ? "Beaten!" : "Kraken"}</span>
        </div>
      )}

      {/* The activity */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 pb-6 pt-2 sm:px-8">
        {ready && cur ? (
          <div key={i} className="l-slide-in flex h-full w-full max-w-[1180px] flex-col items-center justify-center gap-3">
            {kindBadge && <span className="l-pop-in rounded-full bg-white/90 px-4 py-1 font-display text-lg font-extrabold text-[var(--l-ink)] shadow-[0_3px_0_rgba(0,40,80,0.15)]">{kindBadge}</span>}
            <div className="flex min-h-0 w-full flex-1 items-center justify-center">
              <ActView act={cur.act} fx={fx} onDone={onDone} />
            </div>
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
        {why && (
          <div key={why.k} className="l-pop-in pointer-events-none absolute bottom-6 left-1/2 z-[5] w-[min(92%,760px)] -translate-x-1/2 rounded-[26px] bg-white px-6 py-4 text-center font-display text-2xl font-bold leading-snug text-[var(--l-ink)] shadow-[0_8px_0_var(--l-line)]">
            💡 {why.text}
          </div>
        )}
      </div>

      {/* The golden fish */}
      {fish && (
        <button key={fish.k} type="button" onClick={(e) => catchFish(e.currentTarget)} className={cn("fixed left-0 top-[38%] z-[60] text-[84px] leading-none drop-shadow-[0_0_24px_rgba(255,200,61,0.9)]", fish.caught ? "l-pop-in" : "l-swim")} aria-label="Catch the golden fish">
          {fish.caught ? <span className="font-display text-5xl font-extrabold text-[var(--l-gold)] drop-shadow-[0_3px_0_rgba(0,40,80,0.4)]">+🐚</span> : "🐠"}
        </button>
      )}

      {confirmExit && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0b2340]/55 p-6 backdrop-blur-sm">
          <div className="l-pop-in w-full max-w-md rounded-[32px] bg-white p-7 text-center shadow-[0_10px_0_var(--l-line)]">
            <div className="text-6xl">🛟</div>
            <p className="mt-3 font-display text-3xl font-extrabold text-[var(--l-ink)]">Stop this level?</p>
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
