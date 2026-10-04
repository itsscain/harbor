"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Sky, StoryAct as SceneAct } from "@/lib/learn/types";
import { SAY } from "@/lib/learn/script";
import { sfx, buzz } from "@/lib/learn/sfx";
import { Chunk, shuffleSeeded } from "../kit";
import { MiniSpeaker, useLater, type ActProps } from "./common";

// A story you step through and act out. Each scene is a little stage — its own sky, the big
// picture in the middle, small things floating above and along the ground — narrated in the
// Harbor voice for children who can't read yet. Many scenes ask for a hand: tap the hammer to
// build the ark, find the lost sheep, gather the five smooth stones. The arrow lights up once
// the scene is heard and done. Nothing to get wrong here — this part is the teaching.

const SKY: Record<Sky, [string, string]> = {
  day: ["#8fdcff", "#d3f4ff"],
  dawn: ["#ffb38a", "#ffe6c2"],
  dusk: ["#7b6ad6", "#ffa48f"],
  night: ["#1d2b64", "#3c4aa8"],
  storm: ["#3f4d66", "#7d8ea8"],
  sea: ["#33aee2", "#b9eeff"],
  desert: ["#ffc66b", "#ffeccc"],
  garden: ["#7ed67f", "#dcf7c9"],
  glory: ["#ffe58a", "#fff8dc"],
  indoor: ["#e9cfae", "#f8ead8"],
};
const DARK: Sky[] = ["night", "storm", "dusk"];

function graphemes(s: string): string[] {
  try {
    return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(s)].map((x) => x.segment);
  } catch {
    return [...s];
  }
}

export function StoryAct({ act: a, fx, onDone }: ActProps<"story">) {
  const [i, setI] = useState(0);
  const [heard, setHeard] = useState(false);
  const [acted, setActed] = useState(false);
  const later = useLater();
  const scene = a.scenes[i];
  const last = i === a.scenes.length - 1;
  const voiced = fx.voice !== "keys";
  const ready = heard && (acted || !scene.act);

  // Narrate each scene as it arrives (then the thing to do). Readers get the text and a speaker.
  useEffect(() => {
    const parts = scene.act ? [scene.text, { gap: 350 }, scene.act.prompt] : [scene.text];
    fx.setPrompt(parts);
    let live = true;
    const minWait = later;
    if (voiced) {
      void fx.say(i === 0 ? [SAY.storyTime, { gap: 250 }, ...parts] : parts).then(() => live && setHeard(true));
      minWait(() => live && setHeard(true), Math.min(9000, 1800 + scene.text.length * 55)); // never stuck if audio fails
    } else minWait(() => live && setHeard(true), 900);
    return () => {
      live = false;
    };
    // Re-runs per scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  const next = () => {
    if (!ready) return;
    sfx("whoosh");
    if (last) return onDone(0);
    setI((n) => n + 1);
    setHeard(false);
    setActed(false);
  };

  const baseSky = scene.sky ?? "day";
  const afterSky = scene.act?.type === "tap" ? scene.act.afterSky : undefined;
  const sky = acted && afterSky ? afterSky : baseSky;
  const [c0, c1] = SKY[baseSky];
  const dark = DARK.includes(sky);
  return (
    <div className="flex w-full max-w-[1100px] flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between gap-3 px-1">
        <span className="rounded-full bg-white/90 px-4 py-1.5 font-display text-lg font-extrabold text-[var(--l-ink)] shadow-[0_3px_0_rgba(0,40,80,0.15)]">
          {a.emoji} {a.title}
          {a.ref && <span className="ml-2 text-base font-bold text-[var(--l-ink-2)]">· {a.ref}</span>}
        </span>
        <span className="flex gap-1.5" aria-label={`Scene ${i + 1} of ${a.scenes.length}`}>
          {a.scenes.map((_, k) => (
            <span key={k} className={cn("h-3 rounded-full transition-all", k === i ? "w-8 bg-white" : k < i ? "w-3 bg-white/80" : "w-3 bg-white/35")} />
          ))}
        </span>
      </div>

      {/* The stage */}
      <div key={i} className="l-scene-in relative h-[min(46dvh,430px)] w-full overflow-hidden rounded-[34px] shadow-[0_10px_0_rgba(0,40,80,0.18)]" style={{ background: `linear-gradient(180deg, ${c0}, ${c1})` }}>
        {afterSky && <div className="pointer-events-none absolute inset-0 transition-opacity duration-[1400ms] ease-out" style={{ background: `linear-gradient(180deg, ${SKY[afterSky][0]}, ${SKY[afterSky][1]})`, opacity: acted ? 1 : 0 }} />}
        {sky === "glory" && !fx.reduced && <div className="l-rays pointer-events-none absolute left-1/2 top-[-30%] h-[160%] w-[160%] -translate-x-1/2 opacity-40" style={{ background: "repeating-conic-gradient(rgba(255,255,255,0.8) 0deg 8deg, transparent 8deg 24deg)" } as CSSProperties} />}
        {sky === "night" && <Stars reduced={fx.reduced} />}
        {sky === "storm" && !fx.reduced && <Rain />}
        {scene.top && (
          <div className="absolute inset-x-0 flex justify-center gap-[6%] transition-[top] duration-500" style={{ top: scene.act && !acted ? "18%" : "6%" }}>
            {graphemes(scene.top).map((e, k) => (
              <span key={k} className={cn("text-[64px] leading-none", !fx.reduced && "l-float")} style={{ animationDelay: `${k * 0.5}s` }}>
                {e}
              </span>
            ))}
          </div>
        )}
        {scene.ground && (
          <div className="absolute inset-x-0 bottom-[4%] flex justify-center gap-[5%]">
            {graphemes(scene.ground).map((e, k) => (
              <span key={k} className={cn("text-[56px] leading-none", !fx.reduced && "l-sway")} style={{ animationDelay: `${k * 0.3}s` }}>
                {e}
              </span>
            ))}
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          {scene.act ? <SceneAction act={scene.act} art={scene.art} fx={fx} seed={`${fx.seed}:${i}`} onDone={() => setActed(true)} /> : <Art art={scene.art} reduced={fx.reduced} />}
        </div>
      </div>

      {/* Narration + next */}
      <div className="flex w-full items-stretch gap-3">
        <div className={cn("relative flex flex-1 items-center rounded-[26px] px-6 py-4 shadow-[0_6px_0_var(--l-line)]", dark ? "bg-[#f4f1ff]" : "bg-white")}>
          <p className="text-balance font-reading text-[26px] font-bold leading-snug text-[var(--l-ink)]">{scene.text}</p>
          {!voiced && <MiniSpeaker parts={[scene.text]} className="-right-2 -top-2" />}
        </div>
        <Chunk tone={ready ? "green" : "white"} disabled={!ready} onClick={next} aria-label={last ? "Finish the story" : "Next scene"} className={cn("flex w-[112px] shrink-0 flex-col items-center justify-center gap-1 font-display text-lg font-extrabold", ready && !fx.reduced && "l-pulse", !ready && "opacity-50")}>
          {last ? <span className="text-4xl">✅</span> : <ChevronRight className="h-12 w-12" strokeWidth={3.5} />}
          {last ? "The end" : "Next"}
        </Chunk>
      </div>
    </div>
  );
}

function Art({ art, reduced }: { art: string; reduced: boolean }) {
  const g = graphemes(art);
  const size = g.length <= 1 ? 170 : g.length === 2 ? 140 : g.length === 3 ? 118 : 96;
  return (
    <div className="flex items-end justify-center gap-3">
      {g.map((e, k) => (
        <span key={k} className={cn("select-none leading-none drop-shadow-[0_8px_0_rgba(0,30,60,0.15)]", !reduced && "l-bob")} style={{ fontSize: size, animationDelay: `${k * 0.35}s` }}>
          {e}
        </span>
      ))}
    </div>
  );
}

function Stars({ reduced }: { reduced: boolean }) {
  const dots = useMemo(() => Array.from({ length: 22 }, (_, k) => ({ x: (k * 37) % 100, y: (k * 53) % 55, s: 2 + (k % 3), d: (k % 5) * 0.6 })), []);
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {dots.map((d, k) => (
        <span key={k} className={cn("absolute rounded-full bg-white", !reduced && "l-twinkle")} style={{ left: `${d.x}%`, top: `${d.y}%`, width: d.s, height: d.s, animationDelay: `${d.d}s` }} />
      ))}
    </div>
  );
}

function Rain() {
  return <div className="l-rain pointer-events-none absolute inset-0 opacity-50" aria-hidden />;
}

/** The thing to do in a scene. */
function SceneAction({ act, art, fx, seed, onDone }: { act: SceneAct; art: string; fx: ActProps<"story">["fx"]; seed: string; onDone: () => void }) {
  if (act.type === "tap") return <TapIt act={act} fx={fx} onDone={onDone} />;
  if (act.type === "find") return <FindIt act={act} fx={fx} seed={seed} onDone={onDone} />;
  return <CollectIt act={act} art={art} fx={fx} onDone={onDone} />;
}

function Prompt({ text }: { text: string }) {
  return <span className="l-pop-in absolute left-1/2 top-3 z-[2] -translate-x-1/2 whitespace-nowrap rounded-full bg-white/95 px-5 py-2 font-display text-xl font-extrabold text-[var(--l-ink)] shadow-[0_4px_0_rgba(0,40,80,0.18)]">👆 {text}</span>;
}

function TapIt({ act, fx, onDone }: { act: Extract<SceneAct, { type: "tap" }>; fx: ActProps<"story">["fx"]; onDone: () => void }) {
  const [n, setN] = useState(0);
  const [bump, setBump] = useState(0);
  const done = n >= act.n;
  const tap = (el: HTMLElement) => {
    if (done) return;
    const k = n + 1;
    setN(k);
    setBump((b) => b + 1);
    buzz(12);
    if (k >= act.n) {
      sfx("star");
      fx.burst(el, "star", 16);
      onDone();
    } else {
      sfx("count", k);
      fx.burst(el, "sea", 5);
    }
  };
  return (
    <>
      {!done && <Prompt text={act.prompt} />}
      <button type="button" onClick={(e) => tap(e.currentTarget)} className="relative flex flex-col items-center gap-3" aria-label={act.prompt}>
        <span key={done ? "after" : bump} className={cn("select-none leading-none drop-shadow-[0_8px_0_rgba(0,30,60,0.18)]", done ? "l-pop-in" : bump ? "l-boing" : !fx.reduced && "l-pulse")} style={{ fontSize: 168 }}>
          {done ? act.after ?? act.target : act.target}
        </span>
        {act.n > 1 && !done && (
          <span className="flex gap-1.5">
            {Array.from({ length: act.n }, (_, k) => (
              <span key={k} className={cn("h-4 w-4 rounded-full border-[3px] border-white", k < n ? "bg-[var(--l-gold)]" : "bg-white/30")} />
            ))}
          </span>
        )}
      </button>
    </>
  );
}

function FindIt({ act, fx, seed, onDone }: { act: Extract<SceneAct, { type: "find" }>; fx: ActProps<"story">["fx"]; seed: string; onDone: () => void }) {
  const spots = useMemo(() => {
    const all = shuffleSeeded([act.target, ...act.decoys], seed);
    return all.map((e, k) => ({ e, target: e === act.target && all.indexOf(act.target) === k, x: 10 + ((k * 61 + 17) % 80), y: 22 + ((k * 37 + 11) % 56), s: 0.85 + ((k * 13) % 5) * 0.08 }));
  }, [act, seed]);
  const [found, setFound] = useState(false);
  const [shake, setShake] = useState<{ k: number; n: number } | null>(null);
  return (
    <>
      {!found && <Prompt text={act.prompt} />}
      {spots.map((s, k) => (
        <button
          key={k}
          type="button"
          onClick={(e) => {
            if (found) return;
            if (s.target) {
              setFound(true);
              sfx("star");
              buzz([0, 20, 30, 20]);
              fx.burst(e.currentTarget, "heart", 16);
              onDone();
            } else {
              sfx("tap");
              setShake({ k, n: (shake?.n ?? 0) + 1 });
            }
          }}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${s.x}%`, top: `${s.y}%` }}
          aria-label={s.target ? "the one to find" : "not this one"}
        >
          <span key={shake?.k === k ? shake.n : 0} className={cn("block select-none leading-none transition-transform", shake?.k === k && "l-shake", found && s.target && "l-boing scale-125", found && !s.target && "opacity-40")} style={{ fontSize: 76 * s.s }}>
            {s.e}
          </span>
        </button>
      ))}
    </>
  );
}

function CollectIt({ act, art, fx, onDone }: { act: Extract<SceneAct, { type: "collect" }>; art: string; fx: ActProps<"story">["fx"]; onDone: () => void }) {
  const [got, setGot] = useState<number[]>([]);
  const target = useRef<HTMLSpanElement | null>(null);
  const [fly, setFly] = useState<Record<number, { dx: number; dy: number }>>({});
  const done = got.length >= act.items.length;
  const grab = (k: number, el: HTMLElement) => {
    if (got.includes(k)) return;
    const t = target.current?.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (t) setFly((f) => ({ ...f, [k]: { dx: t.left + t.width / 2 - (r.left + r.width / 2), dy: t.top + t.height / 2 - (r.top + r.height / 2) } }));
    const now = [...got, k];
    setGot(now);
    sfx("count", now.length);
    buzz(10);
    if (now.length >= act.items.length) {
      window.setTimeout(() => {
        sfx("star");
        if (target.current) fx.burst(target.current, "star", 16);
      }, 420);
      onDone();
    }
  };
  return (
    <>
      {!done && <Prompt text={act.prompt} />}
      {graphemes(art).length > 1 && <span className="absolute left-[8%] top-[30%] select-none text-[72px] leading-none opacity-90">{graphemes(art).filter((e) => e !== act.into)[0]}</span>}
      <span ref={target} key={done ? "full" : "empty"} className={cn("absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 select-none leading-none drop-shadow-[0_8px_0_rgba(0,30,60,0.15)]", done && "l-boing")} style={{ fontSize: 150 }}>
        {act.into}
      </span>
      <div className="absolute inset-x-0 bottom-[10%] flex flex-wrap justify-center gap-4 px-6">
        {act.items.map((e, k) => {
          const f = fly[k];
          return (
            <button
              key={k}
              type="button"
              onClick={(ev) => grab(k, ev.currentTarget)}
              disabled={got.includes(k)}
              className="relative select-none text-[64px] leading-none"
              style={{ transform: f ? `translate(${f.dx}px, ${f.dy}px) scale(0.4)` : undefined, opacity: f ? 0 : 1, transition: "transform 520ms cubic-bezier(0.3,0.7,0.3,1), opacity 520ms ease-in" }}
              aria-label={`Tap ${e}`}
            >
              <span className={cn("block", !got.includes(k) && !fx.reduced && "l-bob")} style={{ animationDelay: `${k * 0.2}s` }}>
                {e}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
