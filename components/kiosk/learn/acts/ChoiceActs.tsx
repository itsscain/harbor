"use client";

import { useState, type ReactNode } from "react";
import { Delete, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Option } from "@/lib/learn/types";
import type { Part } from "@/lib/learn/audio";
import { SAY } from "@/lib/learn/script";
import { sfx, buzz } from "@/lib/learn/sfx";
import { Chunk, useShuffled } from "../kit";
import { Visual } from "./Visual";
import { ChoiceTile, Hearable, PromptRow, tileState, useChoice, useLater, usePrompt, useSpokenPrompt, type ActProps } from "./common";

// The workhorse activities: pick the answer (pictures, words, numbers, shapes — whatever the item
// shows), type a number on a big keypad, and the manners scenes where every choice shows what
// happens next.

/** What's on an answer tile. */
function OptionFace({ o, layout }: { o: Option; layout: "grid" | "row" | "list" }) {
  if (o.visual)
    return (
      <span className="flex flex-col items-center gap-1 p-2">
        <Visual v={o.visual} size="sm" />
        {o.text && <span className="font-display text-2xl font-extrabold">{o.text}</span>}
      </span>
    );
  if (o.emoji)
    return (
      <span className="flex flex-col items-center gap-1 p-2">
        <span className="leading-none" style={{ fontSize: layout === "list" ? 44 : 84 }}>
          {o.emoji}
        </span>
        {o.text && <span className="font-reading text-2xl font-bold">{o.text}</span>}
      </span>
    );
  const long = (o.text ?? "").length > 18;
  return (
    <span className={cn("font-reading font-bold leading-tight", layout === "list" ? "w-full px-3 text-left text-[26px]" : long ? "px-3 text-[24px]" : "px-3 text-[40px]")}>
      {o.text}
    </span>
  );
}

export function ChoiceAct({ act: a, fx, onDone }: ActProps<"choice">) {
  const parts = useSpokenPrompt(fx, a.say, a.prompt);
  const answerOpt = a.options.find((o) => o.id === a.answer);
  const c = useChoice(a.answer, fx, onDone, {
    extra: fx.voice !== "keys" && answerOpt?.say ? answerOpt.say : [],
    why: a.why,
    whyParts: fx.voice === "all" ? [a.why ?? ""] : undefined,
  });
  const opts = useShuffled(a.options, fx.seed);
  const layout = a.layout ?? (opts.every((o) => (o.text ?? "").length <= 3 && !o.visual && !o.emoji) ? "row" : opts.some((o) => (o.text ?? "").length > 24) ? "list" : "grid");
  const speakable = (o: Option) => (o.say?.length ? o.say : fx.voice !== "keys" && a.readOptions && o.text ? [o.text] : null);
  return (
    <div className="flex w-full flex-col items-center gap-6">
      <PromptRow parts={parts}>{a.prompt}</PromptRow>
      {a.visual && (
        <div className="l-pop-in max-w-full rounded-[30px] bg-white px-6 py-5 shadow-[0_8px_0_var(--l-line)]">
          <Visual v={a.visual} />
        </div>
      )}
      <div className={cn("grid w-full gap-4", layout === "list" ? "max-w-[820px] grid-cols-1" : layout === "row" ? "max-w-[980px]" : "max-w-[900px] grid-cols-2")} style={layout === "row" ? { gridTemplateColumns: `repeat(${Math.min(4, opts.length)}, minmax(0, 1fr))` } : undefined}>
        {opts.map((o, i) => (
          <div key={o.id} className="l-rise relative" style={{ animationDelay: `${120 + i * 60}ms` }}>
            <Hearable parts={speakable(o)} side={layout === "list" ? "left" : "below"}>
              <ChoiceTile
                state={tileState(o.id, c, a.answer)}
                shakeKey={c.shake?.id === o.id ? c.shake.n : undefined}
                onPick={(el) => (sfx("pick"), c.choose(o.id, el))}
                label={o.text ?? o.id}
                className={cn("w-full text-[var(--l-ink)]", layout === "list" ? "min-h-[84px] justify-start px-4 py-3" : o.visual || o.emoji ? "min-h-[170px]" : "min-h-[128px]")}
              >
                <OptionFace o={o} layout={layout} />
              </ChoiceTile>
            </Hearable>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Keypad ───────────────────────────────────────────────────────────────────────────────────
export function KeypadAct({ act: a, fx, onDone }: ActProps<"keypad">) {
  const parts = useSpokenPrompt(fx, a.say, a.prompt);
  const answer = String(a.answer);
  const [typed, setTyped] = useState("");
  const [misses, setMisses] = useState(0);
  const [shake, setShake] = useState(0);
  const [done, setDone] = useState(false);
  const later = useLater();
  const decimal = answer.includes(".");
  const press = (k: string) => {
    if (done) return;
    sfx("tap");
    if (k === "back") return setTyped((t) => t.slice(0, -1));
    if (typed.length >= answer.length + 2) return;
    if (k === "." && (typed.includes(".") || !decimal)) return;
    setTyped((t) => (t === "0" && k !== "." ? k : t + k));
  };
  const check = (el: Element | null) => {
    if (done || !typed) return;
    if (Number(typed) === a.answer) {
      setDone(true);
      fx.right(el, fx.voice !== "keys" && a.answer <= 100 && Number.isInteger(a.answer) ? [typed] : []);
      if (misses > 0 && a.why) later(() => void fx.explain(a.why!, fx.voice === "all" ? [a.why!] : undefined).then(() => onDone(misses)), 1000);
      else later(() => onDone(misses), 1300);
    } else {
      setMisses((m) => m + 1);
      setShake((s) => s + 1);
      buzz([0, 30, 40, 30]);
      fx.wrong(el);
      later(() => setTyped(""), 450);
    }
  };
  const hint = misses >= 2 && !done ? (misses >= 3 ? answer : answer[0]) : null;
  const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", decimal ? "." : "back", "0", "ok"];
  return (
    <div className="flex w-full flex-col items-center gap-5 lg:flex-row lg:items-center lg:justify-center lg:gap-10">
      <div className="flex flex-col items-center gap-5">
        <PromptRow parts={parts}>{a.prompt}</PromptRow>
        {a.visual && (
          <div className="l-pop-in rounded-[30px] bg-white px-6 py-5 shadow-[0_8px_0_var(--l-line)]">
            <Visual v={a.visual} />
          </div>
        )}
        <div key={shake} className={cn("relative flex h-[104px] min-w-[260px] items-center justify-center rounded-[26px] border-[5px] bg-white px-6 font-display text-[64px] font-extrabold tabular-nums shadow-[0_7px_0_var(--l-line)]", shake > 0 && !done && "l-shake", done ? "border-[var(--l-green)] text-[var(--l-green-edge)]" : "border-white text-[var(--l-ink)]")}>
          {typed || (hint ? <span className="text-[var(--l-ink)]/25">{hint}</span> : <span className="text-[var(--l-ink)]/20">?</span>)}
          {a.unit && <span className="ml-2 text-3xl text-[var(--l-ink-2)]">{a.unit}</span>}
        </div>
        {misses >= 3 && !done && <p className="l-rise font-display text-xl font-bold text-white">The answer is {answer}. Type it in!</p>}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((k) =>
          k === "ok" ? (
            <Chunk key={k} tone="green" aria-label="Check" onClick={(e) => check(e.currentTarget)} className="flex h-[78px] w-[96px] items-center justify-center">
              <Check className="h-10 w-10" strokeWidth={3.5} />
            </Chunk>
          ) : k === "back" ? (
            <Chunk key={k} tone="white" aria-label="Delete" onClick={() => press("back")} className="flex h-[78px] w-[96px] items-center justify-center text-[var(--l-ink-2)]">
              <Delete className="h-9 w-9" strokeWidth={2.6} />
            </Chunk>
          ) : (
            <Chunk key={k} tone="white" onClick={() => press(k)} className="flex h-[78px] w-[96px] items-center justify-center font-display text-[40px] font-extrabold text-[var(--l-ink)]">
              {k}
            </Chunk>
          ),
        )}
      </div>
    </div>
  );
}

// ── Scenario (Captain's Code) ────────────────────────────────────────────────────────────────
export function ScenarioAct(props: ActProps<"scenario">) {
  return props.act.options.some((o) => o.then) ? <RewindScenario {...props} /> : <PlainScenario {...props} />;
}

/** The trust bridge: planks appear with honesty and fall with lies. */
function TrustBridge({ delta }: { delta: number }) {
  const base = 3;
  const n = base + delta;
  return (
    <div className="flex items-center gap-3 rounded-[20px] bg-white px-5 py-3 shadow-[0_4px_0_rgba(0,40,80,0.12)]" aria-label={`Trust ${delta > 0 ? "goes up" : "goes down"}`}>
      <span className="flex flex-col items-start">
        <span className="font-display text-xs font-extrabold uppercase tracking-wider text-[var(--l-ink-2)]">Trust bridge</span>
        <span className="relative mt-1 flex items-end gap-1.5 border-b-[4px] border-[#8a5a2b] px-1 pb-0.5">
          {Array.from({ length: 5 }, (_, k) => {
            const on = k < n;
            const changed = delta > 0 ? k === n - 1 : k === n;
            return <span key={k} className={cn("block h-9 w-6 rounded-[5px]", on ? "bg-[#c98a4a] shadow-[inset_0_-4px_0_rgba(0,0,0,0.2)]" : "border-2 border-dashed border-[#c98a4a]/50 bg-transparent", changed && (delta > 0 ? "l-plank-in" : "l-plank-fall"))} />;
          })}
        </span>
      </span>
      <span className={cn("font-display text-2xl font-extrabold", delta > 0 ? "text-[var(--l-green-edge)]" : "text-[var(--l-coral-edge)]")}>{delta > 0 ? "+1" : "−1"}</span>
    </div>
  );
}

/** Choose, watch what happens next, and rewind time if it didn't go well. */
function RewindScenario({ act: a, fx, onDone }: ActProps<"scenario">) {
  const storyParts = a.say?.length ? a.say : fx.voice !== "keys" ? [a.story] : [];
  const askParts = a.askSay?.length ? a.askSay : fx.voice !== "keys" ? [a.question] : [];
  const all: Part[] = [...storyParts, ...(askParts.length ? [{ gap: 350 }, ...askParts] : [])];
  usePrompt(fx, all.length ? all : [a.story, { gap: 300 }, a.question], all.length ? 380 : -1);
  const opts = useShuffled(a.options, fx.seed);
  const [picked, setPicked] = useState<Option | null>(null);
  const [tried, setTried] = useState<string[]>([]);
  const [rewinding, setRewinding] = useState(false);
  const later = useLater();
  const voiced = fx.voice !== "keys";
  const right = picked?.id === a.answer;

  const pick = (o: Option, el: Element | null) => {
    if (picked || rewinding) return;
    sfx("pick");
    setPicked(o);
    const then = o.then!;
    if (o.id === a.answer) {
      fx.right(el);
      later(() => {
        void (voiced ? fx.say([then.text]) : Promise.resolve(true)).then(() =>
          later(() => void (o.why ? fx.explain(o.why, voiced ? [o.why] : undefined) : Promise.resolve()).then(() => onDone(tried.length)), voiced ? 300 : 1800),
        );
      }, 900);
    } else {
      setTried((t) => (t.includes(o.id) ? t : [...t, o.id]));
      fx.miss();
      later(() => {
        sfx("soft-fail");
        if (voiced) void fx.say([then.text]);
      }, 350);
    }
  };
  const rewind = () => {
    sfx("whoosh");
    setRewinding(true);
    if (voiced) void fx.say([SAY.rewind]);
    later(() => {
      setPicked(null);
      setRewinding(false);
    }, 750);
  };

  return (
    <div className={cn("flex w-full max-w-[1100px] flex-col gap-5 lg:flex-row lg:items-stretch", rewinding && "l-rewind")}>
      <div className="l-pop-in flex flex-col items-center justify-center gap-3 rounded-[32px] bg-white px-6 py-6 shadow-[0_8px_0_var(--l-line)] lg:w-[44%]">
        <Visual v={a.scene} />
        <p className="text-balance text-center font-reading text-[27px] font-bold leading-snug text-[var(--l-ink)]">{a.story}</p>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-4">
        {!picked ? (
          <>
            <p className="font-display text-[28px] font-extrabold leading-tight text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.25)]">{a.question}</p>
            {opts.map((o, i) => {
              const wasTried = tried.includes(o.id);
              return (
                <div key={o.id} className="l-rise relative" style={{ animationDelay: `${120 + i * 70}ms` }}>
                  <Hearable parts={voiced ? (o.say?.length ? o.say : o.text ? [o.text] : null) : null}>
                    <Chunk tone="white" disabled={wasTried} onClick={(e) => pick(o, e.currentTarget)} className={cn("flex min-h-[84px] w-full items-center gap-3 px-4 py-3 text-left", wasTried && "opacity-45")}>
                      {wasTried && <span className="text-2xl">⏪</span>}
                      <span className={cn("font-reading text-[24px] font-bold leading-snug text-[var(--l-ink)]", wasTried && "line-through decoration-2")}>{o.text}</span>
                    </Chunk>
                  </Hearable>
                </div>
              );
            })}
          </>
        ) : (
          <div key={picked.id} className="l-scene-in flex flex-col items-center gap-4 rounded-[32px] px-6 py-6 text-center shadow-[0_8px_0_rgba(0,40,80,0.16)]" style={{ background: right ? "linear-gradient(180deg,#e9fff1,#ffffff)" : "linear-gradient(180deg,#fff0ec,#ffffff)" }}>
            <span className="font-display text-base font-extrabold uppercase tracking-wide text-[var(--l-ink-2)]">What happens next…</span>
            <span className={cn("text-[96px] leading-none", !fx.reduced && (right ? "l-boing" : "l-droop"))}>{picked.then!.emoji}</span>
            <p className="text-balance font-reading text-[25px] font-bold leading-snug text-[var(--l-ink)]">{picked.then!.text}</p>
            {picked.then!.trust !== undefined && <TrustBridge delta={picked.then!.trust} />}
            {!right && (
              <Chunk tone="violet" onClick={rewind} className={cn("mt-1 flex h-16 items-center gap-3 px-8 font-display text-2xl font-extrabold", !fx.reduced && "l-pulse")}>
                ⏪ Rewind time
              </Chunk>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PlainScenario({ act: a, fx, onDone }: ActProps<"scenario">) {
  const storyParts = a.say?.length ? a.say : fx.voice !== "keys" ? [a.story] : [];
  const askParts = a.askSay?.length ? a.askSay : fx.voice !== "keys" ? [a.question] : [];
  const all: Part[] = [...storyParts, ...(askParts.length ? [{ gap: 350 }, ...askParts] : [])];
  // Little sailors hear the story right away; a reader gets the replay button.
  usePrompt(fx, all.length ? all : [a.story, { gap: 300 }, a.question], all.length ? 380 : -1);
  const opts = useShuffled(a.options, fx.seed);
  const [picked, setPicked] = useState<string | null>(null);
  const [found, setFound] = useState(false);
  const [tried, setTried] = useState<string[]>([]);
  const [shake, setShake] = useState<{ id: string; n: number } | null>(null);
  const later = useLater();
  const pick = (o: Option, el: Element | null) => {
    if (found) return;
    sfx("pick");
    setPicked(o.id);
    const whyParts = o.why && fx.voice !== "keys" ? [o.why] : undefined;
    if (o.id === a.answer) {
      setFound(true);
      fx.right(el);
      later(() => void (o.why ? fx.explain(o.why, whyParts) : Promise.resolve()).then(() => onDone(tried.length)), 1100);
    } else {
      setShake((s) => ({ id: o.id, n: (s?.n ?? 0) + 1 }));
      // Tapping a choice that was already tried isn't another guess.
      if (tried.includes(o.id)) return;
      setTried((t) => [...t, o.id]);
      fx.miss();
      // The consequence is the lesson: "That would hurt her feelings." (shown beside the choices)
      if (whyParts) void fx.say(whyParts);
    }
  };
  const outcome = picked ? a.options.find((o) => o.id === picked) : null;
  return (
    <div className="flex w-full max-w-[1100px] flex-col gap-5 lg:flex-row lg:items-stretch">
      <div className="l-pop-in flex flex-col items-center justify-center gap-3 rounded-[32px] bg-white px-6 py-6 shadow-[0_8px_0_var(--l-line)] lg:w-[44%]">
        <Visual v={a.scene} />
        <p className="text-balance text-center font-reading text-[27px] font-bold leading-snug text-[var(--l-ink)]">{a.story}</p>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-4">
        <p className="font-display text-[28px] font-extrabold leading-tight text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.25)]">{a.question}</p>
        {opts.map((o, i) => {
          const isRight = found && o.id === a.answer;
          const wasTried = tried.includes(o.id);
          return (
            <div key={o.id} className="l-rise relative" style={{ animationDelay: `${150 + i * 70}ms` }}>
              <Hearable parts={fx.voice !== "keys" ? (o.say?.length ? o.say : o.text ? [o.text] : null) : null}>
                <Chunk
                  tone={isRight ? "green" : "white"}
                  disabled={found}
                  onClick={(e) => pick(o, e.currentTarget)}
                  className={cn("flex min-h-[84px] w-full items-center gap-3 px-4 py-3 text-left", wasTried && !isRight && "opacity-60", isRight && "l-boing", found && !isRight && "opacity-40")}
                >
                  <span key={shake?.id === o.id ? shake.n : 0} className={cn("flex w-full items-center gap-3", shake?.id === o.id && "l-shake")}>
                    {o.emoji && <span className="text-[40px] leading-none">{o.emoji}</span>}
                    <span className={cn("font-reading text-[24px] font-bold leading-snug", isRight ? "text-white" : "text-[var(--l-ink)]")}>{o.text}</span>
                  </span>
                </Chunk>
              </Hearable>
            </div>
          );
        })}
        {outcome?.why && !found && (
          <p key={outcome.id} className="l-pop-in rounded-[22px] bg-white/90 px-5 py-3 font-display text-xl font-bold text-[var(--l-coral-edge)]">
            🤔 {outcome.why} <span className="text-[var(--l-ink-2)]">Try another way.</span>
          </p>
        )}
      </div>
    </div>
  );
}

/** A labeled pill used by several acts. */
export function Pill({ children, tone = "white" }: { children: ReactNode; tone?: "white" | "gold" }) {
  return <span className={cn("rounded-full px-4 py-1.5 font-display text-lg font-extrabold shadow-[0_3px_0_rgba(0,40,80,0.15)]", tone === "gold" ? "bg-[var(--l-gold)] text-[#5a3b00]" : "bg-white text-[var(--l-ink)]")}>{children}</span>;
}
