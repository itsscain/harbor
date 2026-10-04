"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { useKiosk } from "../useKiosk";
import type { KioskChild } from "@/lib/kiosk/types";
import { bandOf, type LearnResult, type Lesson, type SubjectId } from "@/lib/learn/types";
import { COURSES, lessonById, levelLabel, mixedPractice, nextLessonFor, practiceLesson, unitById } from "@/lib/learn/curriculum";
import { albumProgress, pickSticker, type ChestKind } from "@/lib/learn/stickers";
import { levelName, levelOf, mergeKid, starsFor, streakFrom, xpFor } from "@/lib/learn/progress";
import { SHELLS, shellsForLesson, type BoatLook, type ShopItem } from "@/lib/learn/meta";
import { voiceLevelFor, SAY } from "@/lib/learn/script";
import { prefetchLibrary, say, stopVoice } from "@/lib/learn/audio";
import { setSfx } from "@/lib/learn/sfx";
import { badgeStats, badgesFor, earned, heroCards } from "@/lib/learn/badges";
import { CREATURE_BY_ID, eggsEarned, eggsWaiting, growth, type Creature, type Egg } from "@/lib/learn/reef";
import { dayKeyInTz } from "@/lib/tz";
import { LearnHome } from "./LearnHome";
import { VoyageMap } from "./VoyageMap";
import { HarborShop } from "./HarborShop";
import { DailyChest, dailyPrize } from "./DailyChest";
import { LessonPlayer, type LessonOutcome } from "./LessonPlayer";
import { LessonDone, type DoneInfo } from "./LessonDone";
import { Treasures, type TreasureTab } from "./Treasures";
import { BrainGym, type GymGame } from "./BrainGym";
import { kidLearnView, starsForLesson } from "./learnData";

// Loaded lazily by the wall (see lazy.ts), so it also carries the view-model the badge needs.
export { kidLearnView };

// Harbor Learn on the wall — the bright second screen a child flips to from "My Day".
// Home → a subject's voyage map → a level → the treasure-chest finish → the next level (or a
// Practice Cove detour when a level isn't passed yet). Lessons, voice and progress all work
// offline; results and shells sync home for the grown-ups.

type Kiosk = ReturnType<typeof useKiosk>;
type Screen =
  | { s: "home" }
  | { s: "map"; subject: SubjectId; sailFrom?: string | null }
  | { s: "treasures"; tab?: TreasureTab; hatch?: string }
  | { s: "shop" }
  | { s: "gym" }
  | { s: "lesson"; lesson: Lesson; playId: string; back: Screen }
  | { s: "done"; lesson: Lesson; info: DoneInfo; next: Lesson | null; missed: string[]; back: Screen };

/** Evening and night get a softer, deeper lagoon. */
function toneNow(): "day" | "dusk" {
  const h = new Date().getHours();
  return h >= 19 || h < 6 ? "dusk" : "day";
}
const newPlayId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const nowIso = () => new Date().toISOString();
const nowMs = () => Date.now();

export function LearnApp({
  kiosk,
  child,
  accent,
  reduced,
  sound,
  intensity,
  header,
  onBusy,
  startWith,
}: {
  kiosk: Kiosk;
  child: KioskChild;
  accent: string;
  reduced: boolean;
  sound: boolean;
  intensity: number;
  /** The wall's top row (Home · My Day/Learn · stars), shown above Learn's own screens. */
  header: ReactNode;
  /** True while a level (or its finish) is open — the wall stays awake longer. */
  onBusy?: (busy: boolean) => void;
  /** Open straight into this level (previews). */
  startWith?: string | null;
}) {
  const [screen, setScreen] = useState<Screen>(() => {
    const l = startWith ? lessonById(startWith) : null;
    return l ? { s: "lesson", lesson: l, playId: "preview", back: { s: "home" } } : { s: "home" };
  });
  const [greeted, setGreeted] = useState(false);
  const [chestOpen, setChestOpen] = useState(false);
  const state = kiosk.state;

  useEffect(() => {
    prefetchLibrary();
    return () => stopVoice();
  }, []);
  useEffect(() => {
    setSfx(sound, intensity);
  }, [sound, intensity]);
  const busy = screen.s === "lesson" || screen.s === "done" || screen.s === "gym";
  useEffect(() => {
    onBusy?.(busy);
  }, [busy, onBusy]);
  useEffect(() => () => onBusy?.(false), [onBusy]);

  if (!state) return null;
  const view = kidLearnView(state, child);
  const { kid, profile, assignments, todayKey } = view;
  const look = kid.look;
  const voice = voiceLevelFor(profile.grade);

  const start = (lesson: Lesson, back: Screen) => {
    if (view.left === 0 && startWith == null) {
      void say(SAY.dailyLimit);
      setScreen({ s: "home" });
      return;
    }
    setScreen({ s: "lesson", lesson, playId: newPlayId(), back });
  };

  const practice = (subject: SubjectId, back: Screen, focus: string[] = []) => {
    const p = practiceLesson(subject, kid.skills, { focus, seed: `${todayKey}:${newPlayId()}`, now: nowMs() });
    if (p) start(p, back);
    else void say(SAY.keepGoing);
  };
  /** Brain Boost: what's due across every subject, mixed together. */
  const boost = (back: Screen) => {
    const p = mixedPractice(profile.subjects, kid.skills, { seed: `${todayKey}:${newPlayId()}`, now: nowMs() });
    if (p) {
      void say(SAY.brainBoost);
      start(p, back);
    } else void say(SAY.keepGoing);
  };
  const eggs = eggsWaiting(kid, kid.hatched);
  const buddyHatch = kid.hatched.find((h) => h.creature === (kid.buddy ?? kid.hatched[0]?.creature)) ?? null;
  const buddyCreature = buddyHatch ? (CREATURE_BY_ID.get(buddyHatch.creature) ?? null) : null;

  const complete = (lesson: Lesson, playId: string, o: LessonOutcome, back: Screen) => {
    const isPractice = lesson.kind === "practice";
    const stars = isPractice ? Math.max(1, starsFor(o.correct, o.total)) : starsFor(o.correct, o.total);
    const passed = stars >= 1;
    const prevBest = kid.lessons[lesson.id]?.stars ?? 0;
    const firstClear = passed && !isPractice && prevBest < 1;
    const seed = `${child.id}:${lesson.id}:${playId}`;
    const chest: ChestKind | null = !passed ? null : isPractice ? "wood" : lesson.kind === "boss" || stars >= 3 ? "gold" : stars === 2 ? "silver" : "wood";
    const pick = chest ? pickSticker(seed, kid.stickers, chest) : null;
    const stickerId = pick ? (pick.shiny ? `${pick.sticker.id}*` : pick.sticker.id) : null;
    const has = (id: string) => (kid.stickers[id] ?? 0) > 0;
    const newSticker = !!pick && (pick.shiny ? !has(`${pick.sticker.id}*`) : !has(pick.sticker.id) && !has(`${pick.sticker.id}*`));
    let shells = shellsForLesson({ stars, kind: lesson.kind, firstClear, bestCombo: o.bestCombo, passed }) + o.fishShells;
    if (pick && !newSticker) shells += SHELLS.duplicate;
    // A finished sticker set pays a bonus.
    let setDone: DoneInfo["setDone"] = null;
    if (pick && newSticker) {
      const before = albumProgress(kid.stickers).find((x) => x.set.id === pick.sticker.set);
      const after = albumProgress({ ...kid.stickers, [stickerId!]: 1 }).find((x) => x.set.id === pick.sticker.set);
      if (before && after && !before.complete && after.complete) {
        setDone = after.set;
        shells += SHELLS.setComplete;
      }
    }
    // So does a finished island (all levels passed, or the boss beaten — testing out counts).
    const unit = unitById(lesson.unit);
    let worldDone: DoneInfo["worldDone"] = null;
    let nextWorld: DoneInfo["nextWorld"] = null;
    const bossBefore = !!unit?.lessons.some((l) => l.kind === "boss" && (kid.lessons[l.id]?.stars ?? 0) >= 1);
    if (unit && firstClear && !bossBefore && (lesson.kind === "boss" || unit.lessons.every((l) => l.id === lesson.id || (kid.lessons[l.id]?.stars ?? 0) >= 1))) {
      worldDone = unit;
      nextWorld = COURSES[lesson.subject].units[unit.n] ?? null;
      shells += SHELLS.worldComplete;
    }
    shells = Math.min(500, shells);

    const result: LearnResult = {
      op_id: seed,
      child_id: child.id,
      lesson_id: lesson.id,
      subject: lesson.subject,
      stars,
      correct: o.correct,
      total: o.total,
      duration_sec: o.durationSec,
      sticker: stickerId,
      completed_at: nowIso(),
      skills: o.skills,
      kind: lesson.kind,
      shells,
    };
    const xpGain = xpFor(stars);
    // What this level unlocks beyond stars and stickers: a hero card, eggs, badges, a growing buddy.
    const after = mergeKid(state.learn ?? null, child.id, [...(state.learnOutbox ?? []), result], todayKey, (iso) => dayKeyInTz(new Date(iso), view.tz), state.learnEvents ?? []);
    const cardsBefore = new Map(heroCards(kid.lessons).map((c) => [c.hero.id, c.holo]));
    const cardNow = passed && lesson.card ? heroCards(after.lessons).find((c) => c.hero.id === lesson.card) : undefined;
    const card = cardNow && (!cardsBefore.has(cardNow.hero.id) || (cardNow.holo && !cardsBefore.get(cardNow.hero.id))) ? { hero: cardNow.hero, holo: cardNow.holo, upgrade: cardsBefore.has(cardNow.hero.id) } : null;
    const eggIds = new Set(eggsEarned(kid).map((e) => e.id));
    const newEggs = eggsEarned(after).filter((e) => !eggIds.has(e.id));
    const statsBefore = badgeStats(kid);
    const statsAfter = badgeStats(after);
    const newBadges = badgesFor(profile.subjects).filter((b) => !earned(b, statsBefore) && earned(b, statsAfter));
    const grew = buddyHatch ? growth(kid.xp + xpGain, buddyHatch).index > growth(kid.xp, buddyHatch).index : false;
    const info: DoneInfo = {
      passed,
      stars,
      correct: o.correct,
      total: o.total,
      label: lesson.id.startsWith("practice:mix") ? "Brain Boost" : isPractice ? "Practice Cove" : levelLabel(lesson),
      shells,
      chest,
      sticker: pick?.sticker ?? null,
      shiny: pick?.shiny ?? false,
      newSticker,
      xpBefore: kid.xp,
      xpGain,
      levelNames: [levelName(levelOf(kid.xp)), levelName(levelOf(kid.xp + xpGain))],
      goal: { before: kid.todayCount, after: kid.todayCount + 1, target: profile.daily_goal },
      streak: { before: kid.streak, after: streakFrom([todayKey, ...kid.days], todayKey) },
      wallStars: starsForLesson(view, stars),
      setDone,
      worldDone,
      nextWorld,
      canPractice: !isPractice && o.missed.length > 0,
      card,
      eggs: newEggs,
      badges: newBadges,
      challenge: passed && unit?.challenge ? unit.challenge : null,
      buddy: buddyCreature && passed ? { creature: buddyCreature, grew: grew && buddyHatch ? growth(kid.xp + xpGain, buddyHatch).stage.name : null } : null,
    };
    const best = (id: string) => (id === lesson.id ? Math.max(prevBest, stars) : kid.lessons[id] ? kid.lessons[id].stars : null);
    const stillAssigned = assignments.map((a) => a.lesson_id).filter((id) => id !== lesson.id || !passed);
    const next = passed ? nextLessonFor(lesson.subject, profile.grade, best, stillAssigned) : null;
    kiosk.finishLesson(result);
    const mapBack: Screen = back.s === "map" ? { ...back, sailFrom: passed && !isPractice ? lesson.id : null } : back;
    setScreen({ s: "done", lesson, info, next, missed: o.missed, back: mapBack });
  };

  const event = (e: Omit<Parameters<Kiosk["learnEvent"]>[0], "child_id" | "at">) => kiosk.learnEvent({ ...e, child_id: child.id, at: nowIso() });
  const buy = (item: ShopItem) => {
    event({ op_id: `buy:${child.id}:${item.id}`, type: "spend", amount: item.price, item: item.id });
    equip({ ...look, [item.slot]: item.id });
  };
  const equip = (next: BoatLook) => event({ op_id: `look:${child.id}:${newPlayId()}`, type: "look", look: next });
  const prize = dailyPrize(child.id, todayKey, kid.stickers);
  const chestReady = kid.dailyChest !== todayKey;
  const openChest = () => {
    event({ op_id: `daily:${child.id}:${todayKey}`, type: "daily", amount: prize.shells });
    if (prize.sticker) event({ op_id: `daily-sticker:${child.id}:${todayKey}`, type: "earn", amount: 0, item: `sticker:${prize.shiny ? `${prize.sticker.id}*` : prize.sticker.id}`, reason: "daily chest" });
  };
  const hatch = (egg: Egg, creature: Creature) => event({ op_id: `hatch:${child.id}:${egg.id}`, type: "collect", item: `hatch:${egg.id}`, data: { creature: creature.id, xp: kid.xp } });
  const pickBuddy = (id: string) => event({ op_id: `buddy:${child.id}:${newPlayId()}`, type: "collect", item: `buddy:${id}` });
  const gymResult = (game: GymGame, score: number, shells: number) => {
    if (score > (kid.bests[game] ?? 0)) event({ op_id: `best:${child.id}:${game}:${newPlayId()}`, type: "best", item: `gym:${game}`, amount: Math.min(1000, score) });
    if (shells > 0) event({ op_id: `gym:${child.id}:${newPlayId()}`, type: "earn", amount: shells, reason: "gym" });
  };

  const tone = toneNow();
  let body: ReactNode = null;
  if (screen.s === "home") {
    body = (
      <LearnHome
        name={child.name}
        view={view}
        reduced={reduced}
        look={look}
        eggs={eggs.length}
        buddy={buddyCreature}
        onStart={(l) => start(l, { s: "home" })}
        onOpenSubject={(subject) => setScreen({ s: "map", subject })}
        onOpenTreasures={() => setScreen({ s: "treasures" })}
        onOpenShop={() => setScreen({ s: "shop" })}
        onOpenGym={() => setScreen({ s: "gym" })}
        onOpenChest={() => setChestOpen(true)}
        onPractice={(s) => practice(s, { s: "home" })}
        onBoost={() => boost({ s: "home" })}
        greet={!greeted}
        onGreeted={() => setGreeted(true)}
      />
    );
  } else if (screen.s === "map") {
    const here: Screen = { s: "map", subject: screen.subject };
    body = (
      <VoyageMap
        key={`${screen.subject}:${screen.sailFrom ?? ""}`}
        subject={screen.subject}
        view={view}
        reduced={reduced}
        look={look}
        sailFrom={screen.sailFrom}
        onBack={() => setScreen({ s: "home" })}
        onStart={(l) => start(l, here)}
        onPractice={() => practice(screen.subject, here)}
      />
    );
  } else if (screen.s === "treasures") {
    body = (
      <Treasures
        key={screen.tab ?? "reef"}
        kid={kid}
        subjects={profile.subjects}
        eggs={eggs}
        childId={child.id}
        reduced={reduced}
        accent={accent}
        tab={screen.tab}
        autoHatch={screen.hatch}
        onBack={() => setScreen({ s: "home" })}
        onHatch={hatch}
        onBuddy={pickBuddy}
      />
    );
  } else if (screen.s === "gym") {
    body = <BrainGym band={bandOf(profile.grade)} bests={kid.bests} paidToday={kid.gymToday} reduced={reduced} onBack={() => setScreen({ s: "home" })} onResult={gymResult} />;
  } else if (screen.s === "shop") {
    body = <HarborShop look={look} owned={kid.owned} shells={kid.shells} level={kid.level} reduced={reduced} onBack={() => setScreen({ s: "home" })} onBuy={buy} onEquip={equip} />;
  } else if (screen.s === "lesson") {
    const here = screen;
    body = (
      <LessonPlayer
        key={screen.playId}
        lesson={screen.lesson}
        playId={screen.playId}
        skills={kid.skills}
        voice={voice}
        look={look}
        reduced={reduced}
        buddy={buddyCreature && buddyHatch ? { creature: buddyCreature, scale: growth(kid.xp, buddyHatch).stage.scale } : null}
        onExit={() => setScreen(here.back)}
        onComplete={(o) => complete(here.lesson, here.playId, o, here.back)}
      />
    );
  } else if (screen.s === "done") {
    const here = screen;
    body = (
      <LessonDone
        key={`${screen.lesson.id}:${here.info.xpBefore}:${here.info.shells}`}
        lesson={screen.lesson}
        info={screen.info}
        accent={accent}
        look={look}
        reduced={reduced}
        next={screen.next}
        onNext={() => here.next && start(here.next, here.back)}
        onRetry={() => start(here.lesson, here.back)}
        onPractice={() => practice(here.lesson.subject, here.back, here.missed)}
        onHome={() => setScreen(here.back)}
        onHatch={() => setScreen({ s: "treasures", tab: "reef", hatch: here.info.eggs?.[0]?.id })}
      />
    );
  }

  return (
    <div className="learn-root relative min-h-dvh" data-tone={tone} data-reduced={reduced ? "true" : undefined}>
      {header}
      {body}
      {chestOpen && <DailyChest ready={chestReady} prize={prize} accent={accent} reduced={reduced} onOpen={openChest} onClose={() => setChestOpen(false)} />}
    </div>
  );
}
