"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { useKiosk } from "../useKiosk";
import type { KioskChild } from "@/lib/kiosk/types";
import type { Lesson, SubjectId } from "@/lib/learn/types";
import { lessonById, nextLessonFor } from "@/lib/learn/curriculum";
import { STICKER_BY_ID } from "@/lib/learn/stickers";
import { levelName, levelOf, streakFrom, xpFor } from "@/lib/learn/progress";
import { prefetchLibrary, stopVoice } from "@/lib/learn/audio";
import { setSfx } from "@/lib/learn/sfx";
import { LearnHome } from "./LearnHome";
import { SubjectMap } from "./SubjectMap";
import { StickerBook } from "./StickerBook";
import { LessonPlayer, type LessonOutcome } from "./LessonPlayer";
import { LessonDone, type DoneInfo } from "./LessonDone";
import { kidLearnView, starsForLesson } from "./learnData";

// Harbor Learn on the wall — the bright second screen a child flips to from "My Day".
// Home → a subject's path → a lesson → the treasure-chest finish → the next lesson. Lessons,
// voice and progress all work offline; finished lessons sync home for the grown-ups.

type Kiosk = ReturnType<typeof useKiosk>;
type Screen =
  | { s: "home" }
  | { s: "map"; subject: SubjectId }
  | { s: "stickers" }
  | { s: "lesson"; lessonId: string; playId: string; back: Screen }
  | { s: "done"; lessonId: string; info: DoneInfo; nextId: string | null; back: Screen };

/** Evening and night get a softer, deeper lagoon. */
function toneNow(): "day" | "dusk" {
  const h = new Date().getHours();
  return h >= 19 || h < 6 ? "dusk" : "day";
}
const newPlayId = () => Date.now().toString(36);

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
  /** True while a lesson (or its finish) is open — the wall stays awake longer. */
  onBusy?: (busy: boolean) => void;
  /** Open straight into this lesson (previews). */
  startWith?: string | null;
}) {
  const [screen, setScreen] = useState<Screen>(() => (startWith && lessonById(startWith) ? { s: "lesson", lessonId: startWith, playId: "preview", back: { s: "home" } } : { s: "home" }));
  const state = kiosk.state;

  useEffect(() => {
    prefetchLibrary();
    return () => stopVoice();
  }, []);
  useEffect(() => {
    setSfx(sound, intensity);
  }, [sound, intensity]);
  const busy = screen.s === "lesson" || screen.s === "done";
  useEffect(() => {
    onBusy?.(busy);
  }, [busy, onBusy]);
  useEffect(() => () => onBusy?.(false), [onBusy]);

  if (!state) return null;
  const view = kidLearnView(state, child);

  const start = (lesson: Lesson, back: Screen) => setScreen({ s: "lesson", lessonId: lesson.id, playId: newPlayId(), back });

  const complete = (lesson: Lesson, o: LessonOutcome, back: Screen) => {
    const { kid, profile, assignments, todayKey } = view; // progress BEFORE this lesson
    const sticker = STICKER_BY_ID.get(o.result.sticker ?? "") ?? STICKER_BY_ID.get("fish")!;
    const xpGain = xpFor(o.stars);
    const info: DoneInfo = {
      stars: o.stars,
      sticker,
      newSticker: !kid.stickers[sticker.id],
      xpBefore: kid.xp,
      xpGain,
      levelNames: [levelName(levelOf(kid.xp)), levelName(levelOf(kid.xp + xpGain))],
      goal: { before: kid.todayCount, after: kid.todayCount + 1, target: profile.daily_goal },
      streak: { before: kid.streak, after: streakFrom([todayKey, ...kid.days], todayKey) },
      wallStars: starsForLesson(view, o.stars),
    };
    const doneNow = (id: string) => id === lesson.id || (kid.lessons[id]?.stars ?? 0) > 0;
    const stillAssigned = assignments.map((a) => a.lesson_id).filter((id) => id !== lesson.id);
    const next = nextLessonFor(lesson.subject, profile.grade, doneNow, stillAssigned);
    kiosk.finishLesson(o.result);
    setScreen({ s: "done", lessonId: lesson.id, info, nextId: next?.id ?? null, back });
  };

  const tone = toneNow();
  let body: ReactNode = null;
  if (screen.s === "home") {
    body = (
      <LearnHome
        name={child.name}
        accent={accent}
        view={view}
        reduced={reduced}
        onStart={(l) => start(l, { s: "home" })}
        onOpenSubject={(subject) => setScreen({ s: "map", subject })}
        onOpenStickers={() => setScreen({ s: "stickers" })}
      />
    );
  } else if (screen.s === "map") {
    const here = screen;
    body = <SubjectMap subject={screen.subject} view={view} reduced={reduced} onBack={() => setScreen({ s: "home" })} onStart={(l) => start(l, here)} />;
  } else if (screen.s === "stickers") {
    body = <StickerBook stickers={view.kid.stickers} onBack={() => setScreen({ s: "home" })} />;
  } else if (screen.s === "lesson") {
    const lesson = lessonById(screen.lessonId);
    const here = screen;
    if (lesson)
      body = (
        <LessonPlayer
          key={screen.playId}
          lesson={lesson}
          childId={child.id}
          playId={screen.playId}
          owned={view.kid.stickers}
          reduced={reduced}
          onExit={() => setScreen(here.back)}
          onComplete={(o) => complete(lesson, o, here.back)}
        />
      );
  } else if (screen.s === "done") {
    const lesson = lessonById(screen.lessonId);
    const next = screen.nextId ? lessonById(screen.nextId) : null;
    const here = screen;
    if (lesson)
      body = (
        <LessonDone
          key={screen.lessonId + here.info.xpBefore}
          lesson={lesson}
          info={screen.info}
          accent={accent}
          reduced={reduced}
          next={next}
          onNext={() => next && start(next, here.back)}
          onHome={() => setScreen(here.back)}
        />
      );
  }

  return (
    <div className="learn-root relative min-h-dvh" data-tone={tone} data-reduced={reduced ? "true" : undefined}>
      {header}
      {body}
    </div>
  );
}
