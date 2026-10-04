"use client";

import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { SAY } from "@/lib/learn/script";
import type { Part } from "@/lib/learn/audio";
import { sfx, buzz } from "@/lib/learn/sfx";
import { Chunk, shuffleSeeded } from "../kit";
import { Hearable, PromptRow, useLater, usePrompt, useSpokenPrompt, type ActProps } from "./common";

// Character in action: the Truth Detective's case file, the Repair Kit (build better words one
// piece at a time), and "think about it" moments with no wrong answer — including choosing what
// to thank God for, which becomes a prayer said out loud.

// ── Truth Detective ──────────────────────────────────────────────────────────────────────
export function SpotAct({ act: a, fx, onDone }: ActProps<"spot">) {
  const voiced = fx.voice !== "keys";
  const lead: Part[] | undefined = a.say?.length ? [SAY.detective, { gap: 250 }, ...a.say] : undefined;
  const parts = useSpokenPrompt(fx, lead, a.prompt);
  const [found, setFound] = useState<number[]>([]);
  const [honest, setHonest] = useState<number[]>([]);
  const [shake, setShake] = useState<{ i: number; n: number } | null>(null);
  const [misses, setMisses] = useState(0);
  const later = useLater();
  const done = found.length >= a.answer.length;
  const tap = (i: number, el: HTMLElement) => {
    if (done || found.includes(i)) return;
    if (voiced) void fx.say([a.lines[i].text]);
    if (a.answer.includes(i)) {
      const now = [...found, i];
      setFound(now);
      sfx("snap");
      buzz([0, 20, 30, 20]);
      fx.burst(el, "star", 10);
      if (now.length >= a.answer.length) {
        fx.right(el);
        later(() => void fx.explain(a.why, voiced ? [a.why] : undefined).then(() => onDone(misses)), 1200);
      } else if (voiced) later(() => void fx.say([SAY.foundIt]), 700);
    } else {
      if (!honest.includes(i)) setHonest((h) => [...h, i]);
      setMisses((m) => m + 1);
      setShake({ i, n: (shake?.n ?? 0) + 1 });
      fx.miss();
      if (voiced) later(() => void fx.say([SAY.thatsHonest]), 600);
    }
  };
  return (
    <div className="flex w-full max-w-[1000px] flex-col items-center gap-5">
      <PromptRow parts={parts}>
        🕵️ {a.prompt}
      </PromptRow>
      <div className="l-pop-in relative w-full rounded-[30px] border-[5px] border-[#e8d9b5] bg-[#fffdf6] p-5 shadow-[0_9px_0_#d9c497]">
        <div className="-mt-1 mb-3 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 font-display text-2xl font-extrabold text-[#5a3b00]">
            <span className="rounded-lg bg-[#ffe9a8] px-2 py-0.5 text-base uppercase tracking-wider">Case file</span>
            {a.title}
          </span>
          <span className="text-[44px] leading-none">{a.scene ?? "🔍"}</span>
        </div>
        <ol className="flex flex-col gap-2.5">
          {a.lines.map((l, i) => {
            const isFound = found.includes(i);
            const isHonest = honest.includes(i);
            return (
              <li key={i}>
                <Hearable parts={voiced ? [l.text] : null}>
                  <button
                    type="button"
                    onClick={(e) => tap(i, e.currentTarget)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[18px] border-[3px] px-4 py-3 text-left transition-colors",
                      isFound ? "border-[var(--l-coral)] bg-[var(--l-coral)]/12" : isHonest ? "border-[var(--l-green)]/50 bg-[var(--l-green)]/8" : "border-[#efe3c4] bg-white hover:border-[var(--l-gold)]",
                    )}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f5ead0] font-display text-lg font-extrabold text-[#7a5a1c]">{i + 1}</span>
                    {l.emoji && <span className="text-[34px] leading-none">{l.emoji}</span>}
                    <span key={shake?.i === i ? shake.n : 0} className={cn("flex-1 font-reading text-[23px] font-bold leading-snug text-[var(--l-ink)]", shake?.i === i && "l-shake", isFound && "line-through decoration-[var(--l-coral)] decoration-[3px]")}>
                      {l.text}
                    </span>
                    {isFound && <span className="l-stamp shrink-0 rotate-[-10deg] rounded-lg border-[3px] border-[var(--l-coral)] px-2 py-0.5 font-display text-sm font-extrabold uppercase text-[var(--l-coral-edge)]">Found!</span>}
                    {isHonest && !isFound && <span className="shrink-0 text-2xl">✅</span>}
                  </button>
                </Hearable>
              </li>
            );
          })}
        </ol>
        {a.answer.length > 1 && (
          <p className="mt-3 text-center font-display text-lg font-extrabold text-[#7a5a1c]">
            Found {found.length} of {a.answer.length}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Repair Kit / Respect Builder ─────────────────────────────────────────────────────────
export function SlotsAct({ act: a, fx, onDone }: ActProps<"slots">) {
  const voiced = fx.voice !== "keys";
  usePrompt(fx, a.say ?? [a.prompt], a.say?.length || voiced ? 380 : -1);
  const [k, setK] = useState(0);
  const [misses, setMisses] = useState(0);
  const [shake, setShake] = useState<{ id: string; n: number } | null>(null);
  const [tried, setTried] = useState<string[]>([]);
  const [tip, setTip] = useState<string | null>(null);
  const later = useLater();
  const done = k >= a.slots.length;
  const cur = a.slots[Math.min(k, a.slots.length - 1)];
  const opts = useMemo(() => shuffleSeeded(cur.options, `${fx.seed}:${k}`), [cur, fx.seed, k]);
  const pick = (o: string, el: HTMLElement) => {
    if (done) return;
    if (voiced) void fx.say([o]);
    if (o === cur.answer) {
      sfx("snap");
      buzz(14);
      fx.burst(el, "heart", 8);
      setTried([]);
      setTip(tried.length && cur.why ? cur.why : null);
      const n = k + 1;
      setK(n);
      if (n >= a.slots.length) {
        fx.right(el);
        // Read the whole thing back — practicing the words out loud is the point.
        later(() => void fx.say(a.slots.map((s) => s.answer)).then(() => onDone(misses)), 1100);
      }
    } else {
      setMisses((m) => m + 1);
      setTried((t) => [...t, o]);
      setShake({ id: o, n: (shake?.n ?? 0) + 1 });
      setTip(cur.why ?? null);
      fx.miss();
    }
  };
  return (
    <div className="flex w-full max-w-[1100px] flex-col gap-4 lg:flex-row lg:items-start">
      <div className="l-pop-in flex flex-col items-center gap-3 rounded-[30px] bg-white px-6 py-5 shadow-[0_8px_0_var(--l-line)] lg:w-[40%]">
        {a.scene && <span className="text-[72px] leading-none">{a.scene}</span>}
        {a.story && <p className="text-balance text-center font-reading text-[25px] font-bold leading-snug text-[var(--l-ink)]">{a.story}</p>}
        <p className="mt-1 rounded-full bg-[var(--l-card-2)] px-4 py-1.5 text-center font-display text-lg font-extrabold text-[var(--l-violet)]">🧰 {a.prompt}</p>
      </div>
      <div className="flex flex-1 flex-col gap-3">
        {a.slots.map((s, i) => (
          <div key={i} className={cn("rounded-[22px] border-[3px] px-4 py-3 transition-colors", i < k ? "border-transparent bg-white shadow-[0_5px_0_var(--l-green-edge)]" : i === k ? "border-[var(--l-gold)] bg-white/95" : "border-dashed border-white/60 bg-white/25")}>
            {s.label && <p className={cn("font-display text-sm font-extrabold uppercase tracking-wide", i <= k ? "text-[var(--l-violet)]" : "text-white")}>{s.label}</p>}
            {i < k ? (
              <p className="l-pop-in font-reading text-[23px] font-bold leading-snug text-[var(--l-ink)]">
                <Check className="mr-1 inline h-6 w-6 text-[var(--l-green)]" strokeWidth={3.5} />
                {s.answer}
              </p>
            ) : i === k ? (
              <div className="mt-2 flex flex-col gap-2">
                {opts.map((o) => (
                  <Hearable key={`${k}:${o}`} parts={voiced ? [o] : null}>
                    <Chunk tone="white" disabled={tried.includes(o)} onClick={(e) => (sfx("pick"), pick(o, e.currentTarget))} className={cn("flex min-h-[64px] w-full items-center px-4 py-2 text-left", tried.includes(o) && "opacity-50", misses >= 2 && tried.length >= 1 && o === cur.answer && "l-hint")}>
                      <span key={shake?.id === o ? shake.n : 0} className={cn("font-reading text-[22px] font-bold leading-snug text-[var(--l-ink)]", shake?.id === o && "l-shake")}>
                        {o}
                      </span>
                    </Chunk>
                  </Hearable>
                ))}
              </div>
            ) : (
              <p className="font-display text-lg font-bold text-white/80">…</p>
            )}
          </div>
        ))}
        {tip && !done && (
          <p key={tip + k} className="l-pop-in rounded-[18px] bg-white/90 px-4 py-2.5 font-display text-lg font-bold text-[var(--l-ink-2)]">
            💡 {tip}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Think about it ───────────────────────────────────────────────────────────────────────
export function ReflectAct({ act: a, fx, onDone }: ActProps<"reflect">) {
  const voiced = fx.voice !== "keys";
  usePrompt(fx, a.say ?? [a.prompt], a.say?.length || voiced ? 380 : -1);
  const [picked, setPicked] = useState<string[]>([]);
  const [phase, setPhase] = useState<"pick" | "reply">("pick");
  const later = useLater();
  const choice = a.options.find((o) => o.id === picked[0]);

  useEffect(() => {
    if (voiced) later(() => void fx.say([SAY.noWrong]), 4200);
    // Once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = (id: string, el: HTMLElement) => {
    if (phase !== "pick") return;
    const o = a.options.find((x) => x.id === id)!;
    sfx("pick");
    fx.burst(el, "heart", 6);
    if (voiced) void fx.say([o.text]);
    if (a.multi) return setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
    setPicked([id]);
    setPhase("reply");
    later(() => void fx.say(o.reply ? [o.reply] : [SAY.thanksSharing]), 500);
  };
  const finishMulti = () => {
    if (!picked.length) return;
    sfx("star");
    setPhase("reply");
    const items = picked.map((id) => a.options.find((o) => o.id === id)!.text);
    void fx.say([SAY.prayerLead, ...items.flatMap((t) => [{ gap: 160 }, t]), { gap: 300 }, ...(a.closing ? [a.closing] : [])]);
  };
  const items = picked.map((id) => a.options.find((o) => o.id === id)!);
  return (
    <div className="flex w-full max-w-[1000px] flex-col items-center gap-5">
      <PromptRow parts={[a.prompt]}>
        {a.scene && <span className="mr-2">{a.scene}</span>}
        {a.prompt}
      </PromptRow>
      {phase === "pick" && (
        <>
          <div className={cn("grid w-full gap-3", a.options.length > 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1 sm:grid-cols-2")}>
            {a.options.map((o, i) => {
              const on = picked.includes(o.id);
              return (
                <div key={o.id} className="l-rise relative" style={{ animationDelay: `${80 + i * 50}ms` }}>
                  <Hearable parts={voiced ? [o.text] : null}>
                    <Chunk tone={on ? "violet" : "white"} onClick={(e) => tap(o.id, e.currentTarget)} className={cn("flex min-h-[96px] w-full items-center gap-3 px-4 py-3 text-left", on && "l-boing")}>
                      {o.emoji && <span className="text-[44px] leading-none">{o.emoji}</span>}
                      <span className={cn("flex-1 font-reading text-[22px] font-bold leading-snug", on ? "text-white" : "text-[var(--l-ink)]")}>{o.text}</span>
                      {a.multi && <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[3px]", on ? "border-white bg-white text-[var(--l-violet)]" : "border-[var(--l-line)]")}>{on && <Check className="h-5 w-5" strokeWidth={4} />}</span>}
                    </Chunk>
                  </Hearable>
                </div>
              );
            })}
          </div>
          {a.multi && (
            <Chunk tone="green" disabled={!picked.length} onClick={finishMulti} className={cn("flex h-16 items-center gap-2 px-10 font-display text-2xl font-extrabold", !picked.length && "opacity-50")}>
              🙏 Done
            </Chunk>
          )}
        </>
      )}
      {phase === "reply" && (
        <div className="l-pop-in flex w-full max-w-[820px] flex-col items-center gap-4 rounded-[30px] bg-white px-7 py-6 text-center shadow-[0_8px_0_var(--l-line)]">
          {a.multi ? (
            <>
              <span className="text-[56px] leading-none">🙏</span>
              <p className="font-reading text-[26px] font-bold leading-snug text-[var(--l-ink)]">
                Dear God, thank You for {items.map((o, i) => `${i && i === items.length - 1 ? "and " : ""}${o.text.replace(/^(My|Yummy) /, (m) => m.toLowerCase())}`).join(items.length > 2 ? ", " : " ")}.
                {a.closing ? ` ${a.closing}` : ""}
              </p>
            </>
          ) : (
            <>
              <span className="text-[56px] leading-none">{choice?.emoji ?? "💭"}</span>
              <p className="font-reading text-[26px] font-bold leading-snug text-[var(--l-ink)]">{choice?.reply || "Thanks for sharing!"}</p>
            </>
          )}
          <Chunk tone="green" onClick={() => (sfx("pick"), onDone(0))} className="flex h-16 items-center gap-2 px-10 font-display text-2xl font-extrabold">
            {a.multi ? "Amen ✓" : "Next ✓"}
          </Chunk>
        </div>
      )}
    </div>
  );
}
