"use client";

import { Glyph, GlyphRow, WithGlyphs } from "./art/Glyph";
import { Pet, type PetReact } from "./boat/Pet";
import { SideBoat } from "./KidBoat";
import { LessonBackdrop, SeaLane } from "./LessonScene";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Activity, Lesson } from "@/lib/learn/types";
import type { BoatLook } from "@/lib/learn/meta";
import type { Skills } from "@/lib/learn/mastery";
import type { Creature } from "@/lib/learn/reef";
import { COURSES, SUBJECT_LOOK, levelLabel, spiralItems } from "@/lib/learn/curriculum";
import { rng, int } from "@/lib/learn/gen";
import { COMBO, PRAISE, RETRY, SAY, lessonClipKeys, type VoiceLevel } from "@/lib/learn/script";
import { partsKey, preload, say, speakingNow, stopVoice, subscribeVoice, type Part } from "@/lib/learn/audio";
import { sfx, buzz } from "@/lib/learn/sfx";
import { BurstLayer, Chunk, ShellIcon, useBursts } from "./kit";
import { VoiceCtx, type LessonFx } from "./acts/common";
import { MeetAct, FindLetterAct, FirstSoundAct, RhymeAct, ReadWordAct, BuildAct, BlendAct, PopAct, SentenceAct } from "./acts/ReadingActs";
import { TraceAct } from "./acts/TraceAct";
import { CountAct, MakeAct, AddAct } from "./acts/MathActs";
import { ChoiceAct, KeypadAct, ScenarioAct } from "./acts/ChoiceActs";
import { SortAct, OrderAct, MatchAct, PlaceAct } from "./acts/DragActs";
import { StoryAct } from "./acts/StoryAct";
import { VerseAct } from "./acts/VerseAct";
import { SpotAct, SlotsAct, ReflectAct } from "./acts/CharacterActs";
import { CodeAct } from "./code/CodeAct";
import { ConceptAct } from "./lab/ConceptAct";
import { PredictAct } from "./lab/PredictAct";
import { LoopFindAct } from "./lab/LoopFindAct";
import { RecipeAct } from "./lab/RecipeAct";
import { FactoryAct } from "./lab/FactoryAct";
import { VariableAct } from "./lab/VariableAct";
import { EventsAct } from "./lab/EventsAct";
import { BinaryAct, SearchAct, SwapSortAct, CipherAct, LogicAct, MachineAct, PlotAct } from "./lab/PuzzleActs";
import { LabAct } from "./science/LabAct";
import { CodeReadAct } from "./lab/CodeReadAct";
import { CreatureView } from "./tank/CreatureView";

// One level, start to finish. Proven learning moves, built in:
//  • first-try accuracy decides the stars (60% passes) — honest, so the map means something;
//  • every miss gets a second chance, hints that climb, and the "why" once it's found;
//  • missed items come back in a retry round before the level ends (retrieval practice);
//  • a couple of "from before" items weave in skills that are due (spaced repetition);
//  • per-skill results go home, so the next practice targets exactly what's shaky.
// And the fun: a boat that sails the progress lane, combos that climb, boss levels with a sea
// monster to beat, and the occasional golden fish worth bonus shells.
//
// And no winning by tapping everything: a child who can't read hears the question before the
// answers wake up; a wrong answer pauses taps for a moment; two quick misses in a row ("tapping
// without looking") bring a coach that stops everything and asks the question again.

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

const FLOW_CLIPS = [...PRAISE, ...RETRY, ...COMBO, SAY.wantToLeave, SAY.keepGoing, SAY.fromBefore, SAY.retryRound, SAY.goldenFish, SAY.lookFirst, SAY.bossTime, SAY.reviewTime, SAY.hint, SAY.listenAgain, SAY.lessonDone, SAY.perfect, SAY.almost];
/** Seconds since a moment (helpers, so the clock stays out of render). */
const secondsSince = (t: number) => Math.round((Date.now() - t) / 1000);
const nowMs = () => Date.now();
/** Introductions (meet a letter, hear a story or a verse) and reflections have nothing to get
 *  wrong — they teach, and the items after them check. */
const isScored = (a: Activity) => a.kind !== "meet" && a.kind !== "story" && a.kind !== "reflect" && a.kind !== "concept" && !(a.kind === "verse" && a.v.step === "listen");
/** Big hands-on activities (a whole program, a factory, an experiment) aren't replayed in the
 *  retry round — the level's next items and later reviews bring the skill back instead. */
const LONG_KINDS = new Set<Activity["kind"]>(["code", "predict", "loopfind", "recipe", "factory", "variable", "events", "search", "swapsort", "lab", "concept"]);

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
    case "story": return <StoryAct act={a} {...props} />;
    case "verse": return <VerseAct act={a} {...props} />;
    case "spot": return <SpotAct act={a} {...props} />;
    case "slots": return <SlotsAct act={a} {...props} />;
    case "reflect": return <ReflectAct act={a} {...props} />;
    case "concept": return <ConceptAct act={a} {...props} />;
    case "predict": return <PredictAct act={a} {...props} />;
    case "loopfind": return <LoopFindAct act={a} {...props} />;
    case "recipe": return <RecipeAct act={a} {...props} />;
    case "factory": return <FactoryAct act={a} {...props} />;
    case "variable": return <VariableAct act={a} {...props} />;
    case "events": return <EventsAct act={a} {...props} />;
    case "binary": return <BinaryAct act={a} {...props} />;
    case "search": return <SearchAct act={a} {...props} />;
    case "swapsort": return <SwapSortAct act={a} {...props} />;
    case "cipher": return <CipherAct act={a} {...props} />;
    case "logic": return <LogicAct act={a} {...props} />;
    case "machine": return <MachineAct act={a} {...props} />;
    case "plot": return <PlotAct act={a} {...props} />;
    case "lab": return <LabAct act={a} {...props} />;
    case "coderead": return <CodeReadAct act={a} {...props} />;
  }
}

export function LessonPlayer({
  lesson,
  playId,
  skills,
  voice,
  look,
  reduced,
  dusk,
  buddy,
  tutorials,
  onTutorial,
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
  /** Evening: the sea under a dusky sky. */
  dusk?: boolean;
  /** The reef buddy who cheers from the corner. */
  buddy?: { creature: Creature; scale: number } | null;
  /** Tutorials this child has finished ("boat,…"), and how to record one. */
  tutorials: string;
  onTutorial: (id: string) => void;
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
  // The level card stays up for a moment (a beat of anticipation), even when everything is cached.
  const [introDone, setIntroDone] = useState(false);
  const [why, setWhy] = useState<{ text: string; k: number } | null>(null);
  const [bossHit, setBossHit] = useState(0);
  const [fish, setFish] = useState<{ k: number; caught: boolean; x?: number; y?: number; n?: number } | null>(null);
  const [fishShells, setFishShells] = useState(0);
  const [cheer, setCheer] = useState(0);
  // The pet (on the boat up top, and big in the corner) cheers a right answer and tilts its head
  // kindly at a miss, with a speech bubble that says what the voice says.
  const [petReact, setPetReact] = useState<PetReact>(null);
  const [bubble, setBubble] = useState<{ text: string; k: number; good: boolean } | null>(null);
  useEffect(() => {
    if (!bubble) return;
    const t = window.setTimeout(() => setBubble(null), 1900);
    return () => window.clearTimeout(t);
  }, [bubble]);
  const [glow, setGlow] = useState<{ k: number; gold: boolean } | null>(null);
  // The guessing guard: which activity has been heard, a short pause after a miss, the coach.
  const [heardAt, setHeardAt] = useState(-1);
  const [cooling, setCooling] = useState(false);
  const [coach, setCoach] = useState<number | null>(null);
  const missTimes = useRef<number[]>([]);
  const coolTimer = useRef<number | undefined>(undefined);
  // The latest "record a tutorial" callback (a stable fx doesn't change every time the app renders).
  const tutorialRef = useRef(onTutorial);
  useEffect(() => {
    tutorialRef.current = onTutorial;
  });
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

  // A level with a story waits on its card until the story's been told (then "Let's go!").
  const [storyTold, setStoryTold] = useState(false);
  useEffect(() => {
    if (lesson.intro) return;
    const t = window.setTimeout(() => setIntroDone(true), reduced ? 300 : 1400);
    return () => window.clearTimeout(t);
  }, [reduced, lesson.intro]);
  useEffect(() => {
    if (!lesson.intro || !ready) return;
    const told = () => setStoryTold(true);
    if (voice === "keys") {
      const t = window.setTimeout(told, 1200);
      return () => window.clearTimeout(t);
    }
    const cap = window.setTimeout(told, 14000);
    void say(lesson.intro).then(told);
    return () => window.clearTimeout(cap);
  }, [lesson.intro, ready, voice]);

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
      setCheer((c) => c + 1);
      setGlow({ k: Date.now(), gold: n >= 5 });
      let line: string;
      if (n === 3 || n === 5 || n === 8 || n === 12) {
        line = COMBO[(n === 3 ? 2 : n === 5 ? 0 : n === 8 ? 1 : 3) % COMBO.length];
        setComboFlash({ n, k: Date.now() });
      } else line = PRAISE[praiseRef.current++ % PRAISE.length];
      setPetReact({ mood: "cheer", k: Date.now() });
      setBubble({ text: line, k: Date.now(), good: true });
      void say([line, ...(extra.length ? [{ gap: 120 }, ...extra] : [])]);
    },
    [fireAt],
  );
  // A miss pauses taps for a moment (no machine-gunning every answer). Two misses within a few
  // seconds = tapping without looking: the coach stops everything and asks the question again.
  // Returns true when the coach takes over (it does the talking).
  const guard = useCallback((): boolean => {
    const now = Date.now();
    const recent = [...missTimes.current.filter((t) => now - t < 4000), now];
    missTimes.current = recent;
    window.clearTimeout(coolTimer.current);
    if (recent.length >= 2) {
      missTimes.current = [];
      setCoach(now);
      const off = () => setCoach((c) => (c === now ? null : c));
      window.setTimeout(() => void say([SAY.lookFirst, { gap: 250 }, ...promptRef.current]).then(() => window.setTimeout(off, 350)), 600);
      window.setTimeout(off, 9000); // never stuck
      return true;
    }
    setCooling(true);
    coolTimer.current = window.setTimeout(() => setCooling(false), 900);
    return false;
  }, []);
  const miss = useCallback(() => {
    comboRef.current = 0;
    setCombo(0);
    setPetReact({ mood: "oops", k: Date.now() });
    setBubble({ text: "Try again!", k: Date.now(), good: false });
    sfx("wrong");
    buzz([0, 30, 40, 30]);
    guard();
  }, [guard]);
  const wrong = useCallback(
    (el?: Element | null, reprompt: Part[] = []) => {
      comboRef.current = 0;
      setCombo(0);
      sfx("wrong");
      buzz([0, 30, 40, 30]);
      setPetReact({ mood: "oops", k: Date.now() });
      if (guard()) return;
      const line = RETRY[praiseRef.current++ % RETRY.length];
      setBubble({ text: line, k: Date.now(), good: false });
      void say([line, ...(reprompt.length ? [{ gap: 250 }, ...reprompt] : [])]);
      void el;
    },
    [guard],
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
      tutorialDone: (id) => tutorials.split(",").includes(id),
      completeTutorial: (id) => tutorialRef.current(id),
    }),
    [right, wrong, miss, explain, fireAt, firstTime, playId, i, reduced, voice, look, tutorials],
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
    // The fish swims by a little after the next question has been asked — and only speaks up if
    // nothing else is being said (it must never talk over a question).
    if (i === fishAt)
      window.setTimeout(() => {
        setFish({ k: Date.now(), caught: false });
        sfx("fish");
        if (!speakingNow()) void say(SAY.goldenFish);
      }, 2600);
    let q = queue;
    if (all.length >= q.length) {
      // Retry round: the ones missed on the first try come back once (not code — those were solved).
      const again = !retryAnnounced ? q.filter((it, k) => it.kind !== "retry" && all[k] > 0 && !LONG_KINDS.has(it.act.kind) && isScored(it.act)).slice(0, 3) : [];
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
    const t = window.setTimeout(() => setFish(null), 8200);
    return () => window.clearTimeout(t);
  }, [fish]);

  // Caught the moment a finger touches it (a tap that waits for the finger to lift misses a fish
  // that's already swum on). The prize pops right where it was caught, and the button stays put
  // under the finger, so lifting it can't land on an answer underneath.
  const catchFish = (el: HTMLElement) => {
    if (!fish || fish.caught) return;
    const r = el.getBoundingClientRect();
    const n = 8 + Math.floor(rng(`fishv:${playId}`)() * 13);
    setFish({ ...fish, caught: true, x: r.left + r.width / 2, y: r.top + r.height / 2, n });
    setFishShells((s) => s + n);
    sfx("coin");
    buzz([0, 20, 30, 20]);
    fireAt(el, "sea", 16);
    window.setTimeout(() => setFish(null), 1600);
  };

  // Listen first: a child who can't read hears each question before its answers wake up (until
  // the question has been said, or a few seconds pass).
  const listening = voice === "all" && ready && introDone && !!cur && heardAt !== i;
  useEffect(() => {
    if (!listening) return;
    let started = false;
    const heard = () => setHeardAt(i);
    const unsub = subscribeVoice(() => {
      const now = speakingNow();
      const asked = promptRef.current.length > 0 && now === partsKey(promptRef.current);
      if (asked) started = true;
      else if (started) window.setTimeout(heard, 200);
    });
    const quiet = window.setTimeout(() => !started && heard(), 1800);
    const cap = window.setTimeout(heard, 6500);
    return () => {
      unsub();
      window.clearTimeout(quiet);
      window.clearTimeout(cap);
    };
  }, [listening, i]);

  const kindBadge = cur?.kind === "spiral" ? "🗺️ From before!" : cur?.kind === "retry" ? "🔁 Try again!" : null;

  return (
    <div className="fixed inset-0 z-[45] flex flex-col overflow-hidden">
      <LessonBackdrop subject={lesson.subject} dusk={dusk} reduced={reduced} />
      {/* The companion in the corner — the child's own boat pet (or their aquarium buddy) — cheering every
          right answer and saying so in a bubble. It sits behind the activity, so a tall one's buttons
          are never covered. */}
      {ready && introDone && (look.pet || buddy) && (
        <div className="pointer-events-none fixed bottom-2 left-2 flex items-end" aria-hidden>
          <span className="relative block drop-shadow-[0_6px_6px_rgba(0,30,60,0.25)]">
            {look.pet ? (
              <Pet id={look.pet} size={132} react={petReact} still={reduced} mood={dusk ? "sleep" : "idle"} />
            ) : (
              buddy && (
                <span key={cheer} className={cn("block", cheer > 0 && "l-hop")}>
                  <CreatureView id={buddy.creature.id} size={Math.round(104 * buddy.scale)} react={cheer} animate={!reduced} />
                </span>
              )
            )}
          </span>
          {bubble && (
            <span key={bubble.k} className={cn("l-say -ml-3 mb-[86px] max-w-[230px] rounded-[22px] rounded-bl-[6px] bg-white px-4 py-2 font-display text-xl font-extrabold leading-tight shadow-[0_5px_0_rgba(0,40,80,0.18)]", bubble.good ? "text-[var(--l-green-edge)]" : "text-[var(--l-coral-edge)]")}>
              {bubble.text}
            </span>
          )}
        </div>
      )}

      <BurstLayer bursts={bursts} />
      {/* A right answer warms the edges of the screen (gold when the streak is hot). */}
      {glow && !reduced && <div key={glow.k} className={cn("l-edge-glow pointer-events-none fixed inset-0 z-[60]", glow.gold && "l-edge-glow-gold")} aria-hidden />}
      {/* Top bar: leave · the boat sailing the lane · combo · hear again */}
      <div className="relative flex items-center gap-4 px-5 pb-1 pt-2 sm:px-8">
        <Chunk tone="ghost" aria-label="Stop the level" onClick={() => (sfx("tap"), setConfirmExit(true), void say(SAY.wantToLeave))} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full" style={{ borderRadius: 999 }}>
          <X className="h-7 w-7" strokeWidth={3} />
        </Chunk>
        <SeaLane done={results.length} total={queue.length} boss={boss} look={look} reduced={reduced} hot={combo >= 5} petReact={petReact} />
        <div className={cn("flex h-14 min-w-14 items-center justify-center gap-1 rounded-full px-3 font-display text-2xl font-extrabold text-white transition-all", combo >= 2 ? "bg-[var(--l-orange)] shadow-[0_5px_0_var(--l-orange-edge)]" : "bg-white/25")} aria-label={`${combo} in a row`}>
          <Glyph e="🔥" size={34} className={cn(combo >= 2 ? "l-flame" : "opacity-60 grayscale-[0.6]")} />
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
          <Glyph key={bossHit} e="🐙" size={64} className={cn(bossHit > 0 && "l-hit")} />
          <div className="relative h-5 flex-1 overflow-hidden rounded-full bg-black/25">
            <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#ef4444] to-[#f97316] transition-[width] duration-500" style={{ width: `${(bossHp / Math.max(1, scoredMain)) * 100}%` }} />
          </div>
          <span className="font-display text-lg font-extrabold text-white">{bossHp <= 0 ? "Beaten!" : "Kraken"}</span>
        </div>
      )}

      {/* The activity */}
      <div className="relative flex min-h-0 flex-1">
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 pb-4 pt-1 sm:px-8">
          {ready && introDone && cur ? (
            <div key={i} className="l-slide-in flex h-full w-full max-w-[1180px] flex-col items-center justify-center gap-1">
              {/* One reserved row for the little signs ("From before!", "Listen…"), so they never cover the
                  question and nothing jumps when the reading ends. */}
              <div className="flex h-9 shrink-0 items-center justify-center gap-3">
                {kindBadge && (
                  <span className="l-pop-in rounded-full bg-white/90 px-4 py-1 font-display text-lg font-extrabold text-[var(--l-ink)] shadow-[0_3px_0_rgba(0,40,80,0.15)]">
                    <WithGlyphs text={kindBadge} />
                  </span>
                )}
                {listening && coach === null && (
                  <span className="l-pop-in flex items-center gap-2 rounded-full bg-white/95 px-4 py-1 font-display text-lg font-extrabold text-[var(--l-ink)] shadow-[0_3px_0_rgba(0,40,80,0.15)]">
                    <Glyph e="👂" size={28} className="l-hear-wiggle inline-block" /> Listen…
                  </span>
                )}
              </div>
              {/* my-auto (not align-items) centers it, so a tall activity overflows downward and scrolls instead of losing its top */}
              <div className="flex min-h-0 w-full flex-1 justify-center">
                <div className={cn("my-auto flex w-full justify-center transition-opacity duration-300", (listening || coach !== null) && "opacity-80")}>
                  <VoiceCtx.Provider value={voice}>
                    <ActView act={cur.act} fx={fx} onDone={onDone} />
                  </VoiceCtx.Provider>
                </div>
              </div>
            </div>
          ) : (
            <LevelCard lesson={lesson} items={scoredMain} boss={boss} look={look} onGo={lesson.intro && storyTold ? () => setIntroDone(true) : undefined} />
          )}
          {comboFlash && (
            <div key={comboFlash.k} className="l-pop-in pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 rounded-full bg-[var(--l-orange)] px-7 py-3 font-display text-3xl font-extrabold text-white shadow-[0_6px_0_var(--l-orange-edge)]">
              <Glyph e="🔥" size={40} className="mr-2 inline-block align-[-0.3em]" />
              {comboFlash.n} in a row!
            </div>
          )}
          {why && (
            <div key={why.k} className="l-pop-in pointer-events-none absolute bottom-6 left-1/2 z-[5] w-[min(92%,760px)] -translate-x-1/2 rounded-[26px] bg-white px-6 py-4 text-center font-display text-2xl font-bold leading-snug text-[var(--l-ink)] shadow-[0_8px_0_var(--l-line)]">
              <Glyph e="💡" size={38} className="mr-2 inline-block align-[-0.35em]" />
              <WithGlyphs text={why.text} />
            </div>
          )}
        </div>
        {/* The guard: while the question is being asked, for a moment after a miss, and while the
            coach talks, taps on the activity are held (the top bar still works). */}
        {ready && introDone && cur && (listening || cooling || coach !== null) && (
          <div className="absolute inset-0 z-[20]" aria-hidden>
            {coach !== null && (
              <div key={coach} className="l-coach-in absolute left-1/2 top-[22%] flex w-[min(90%,560px)] flex-col items-center gap-2 rounded-[32px] bg-white px-7 py-6 text-center shadow-[0_10px_0_var(--l-line)]">
                <Glyph e="👀" size={86} />
                <p className="font-display text-3xl font-extrabold text-[var(--l-ink)]">Stop and look first!</p>
                <p className="font-display text-xl font-bold text-[var(--l-ink-2)]">Listen to the question again, then choose.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* The golden fish (a big invisible net around it, so a small finger can catch it) */}
      {fish && (
        <button
          key={fish.k}
          type="button"
          onPointerDown={(e) => catchFish(e.currentTarget)}
          className={cn("fixed z-[60] flex touch-none select-none items-center justify-center p-7 leading-none", !fish.caught && "l-swim left-0 top-[30%]")}
          style={fish.caught ? { left: fish.x, top: fish.y, transform: "translate(-50%, -50%)" } : undefined}
          aria-label="Catch the golden fish"
        >
          {fish.caught ? (
            <span className="l-pop-in flex items-center gap-2 whitespace-nowrap rounded-full bg-white/95 px-5 py-2 font-display text-4xl font-extrabold text-[var(--l-gold-edge)] shadow-[0_5px_0_var(--l-gold-edge)]">
              +{fish.n} <ShellIcon size={40} />
            </span>
          ) : (
            <Glyph e="🐠" size={115} className="drop-shadow-[0_0_26px_rgba(255,200,61,0.95)]" />
          )}
        </button>
      )}

      {confirmExit && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0b2340]/55 p-6 backdrop-blur-sm">
          <div className="l-pop-in w-full max-w-md rounded-[32px] bg-white p-7 text-center shadow-[0_10px_0_var(--l-line)]">
            <Glyph e="⚓" size={88} className="mx-auto block" />
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

/** The card a level opens with: which level, what it's called, how many challenges, and three
 *  stars waiting to be won (boss and review levels get their own banners). */
function LevelCard({ lesson, items, boss, onGo, look }: { lesson: Lesson; items: number; boss: boolean; onGo?: () => void; look: BoatLook }) {
  const sl = SUBJECT_LOOK[lesson.subject];
  const isPractice = lesson.id.startsWith("practice:");
  return (
    <div className="l-card-in relative flex w-[min(92vw,640px)] flex-col items-center overflow-hidden rounded-[40px] bg-white text-center shadow-[0_14px_0_rgba(0,40,80,0.22),0_30px_60px_rgba(0,40,80,0.25)]">
      {/* The subject's colors across the top, with a little sea of waves. */}
      <div className="relative h-36 w-full" style={{ background: `linear-gradient(160deg, ${sl.from}, ${sl.to})` }}>
        <svg viewBox="0 0 640 60" preserveAspectRatio="none" className="absolute inset-x-0 -bottom-px h-10 w-full" aria-hidden>
          <path d="M0 30 Q40 12 80 30 T160 30 T240 30 T320 30 T400 30 T480 30 T560 30 T640 30 V60 H0 Z" fill="#ffffff" opacity="0.35" />
          <path d="M0 42 Q40 26 80 42 T160 42 T240 42 T320 42 T400 42 T480 42 T560 42 T640 42 V60 H0 Z" fill="#ffffff" />
        </svg>
        <span className="absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/95 px-4 py-1 font-display text-lg font-extrabold shadow-[0_3px_0_rgba(0,40,80,0.15)]" style={{ color: sl.ink }}>
          {isPractice ? "Practice" : `Level ${levelLabel(lesson)}`} · {COURSES[lesson.subject].title}
        </span>
        {/* Your boat, setting out for this level. */}
        <span className="l-boat-in pointer-events-none absolute -left-2 bottom-1">
          <SideBoat look={look} size={118} />
        </span>
      </div>
      {/* The level's picture in a big round badge, sitting on the waves. */}
      <span className="relative -mt-20 flex h-40 w-40 items-center justify-center rounded-full bg-white shadow-[0_8px_0_rgba(0,40,80,0.12),inset_0_0_0_8px_rgba(242,248,252,1)]" style={{ boxShadow: `0 8px 0 rgba(0,40,80,0.12), 0 0 0 7px ${sl.from}55` }}>
        <GlyphRow s={lesson.emoji} size={112} className="l-bob" />
      </span>
      <div className="flex w-full flex-col items-center gap-3 px-10 pb-8 pt-4">
        <p className="max-w-[520px] text-balance font-display text-[40px] font-extrabold leading-[1.05] text-[var(--l-ink)]">{lesson.title}</p>
        {boss && (
          <span className="l-stamp flex items-center gap-2 rounded-full bg-[var(--l-coral)] px-5 py-1.5 font-display text-xl font-extrabold text-white shadow-[0_4px_0_var(--l-coral-edge)]">
            <Glyph e="🐙" size={34} /> BOSS LEVEL
          </span>
        )}
        {lesson.kind === "review" && (
          <span className="l-stamp flex items-center gap-2 rounded-full bg-[var(--l-gold)] px-5 py-1.5 font-display text-xl font-extrabold text-[#5a3b00] shadow-[0_4px_0_var(--l-gold-edge)]">
            <Glyph e="🗺️" size={34} /> Treasure review
          </span>
        )}
        <span className="flex items-center gap-2" aria-label="three stars to win">
          {[0, 1, 2].map((k) => (
            <span key={k} className="l-star-in" style={{ animationDelay: `${250 + k * 160}ms` }}>
              <Glyph e="⭐" size={k === 1 ? 64 : 52} className="opacity-35 grayscale" />
            </span>
          ))}
        </span>
        {items > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-[var(--l-card-2)] px-4 py-1 font-display text-lg font-bold text-[var(--l-ink-2)]">
            <Glyph e="🎯" size={26} /> {items} challenge{items === 1 ? "" : "s"}
          </span>
        )}
        {lesson.intro && (
          <p className="l-rise relative max-w-[560px] text-balance rounded-[22px] bg-[#fff7d6] px-5 py-3 pl-14 text-left font-display text-xl font-bold leading-snug text-[#5a3b00] shadow-[0_4px_0_#f2d27a]">
            <Glyph e="📜" size={40} className="absolute left-3 top-3" />
            {lesson.intro}
          </p>
        )}
        {onGo && (
          <Chunk tone="green" onClick={() => (sfx("pick"), onGo())} className="l-pop-in l-pulse mt-1 flex h-16 items-center gap-3 px-10 font-display text-2xl font-extrabold">
            Let&apos;s go! <Glyph e="⛵" size={40} />
          </Chunk>
        )}
      </div>
    </div>
  );
}
