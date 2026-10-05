"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/cn";
import type { FactoryRule } from "@/lib/learn/types";
import { condTest, factoryWins, route } from "@/lib/learn/codelab";
import { SAY } from "@/lib/learn/script";
import { say } from "@/lib/learn/audio";
import { sfx } from "@/lib/learn/sfx";
import { Chunk } from "../kit";
import type { ActProps } from "../acts/common";
import { PromptRow, useLater, usePrompt } from "../acts/common";
import { Glyph, GlyphRow, WithGlyphs } from "../art/Glyph";

// Sorting Factory: things roll down a conveyor belt, and YOUR rule decides where each one goes.
// "For each thing: IF it's red → red bin, ELSE → blue bin." Tap the chips to build the rule, run
// the factory, and watch the sensor check every rule, line by line, for every item. Wrong bins get
// a red ✗, so the bug in the rule is easy to see. If/else, else-if and AND — and the hidden loop.

export function FactoryAct({ act, fx, onDone }: ActProps<"factory">) {
  const voiced = fx.voice !== "keys";
  usePrompt(fx, voiced ? [act.prompt, "~", SAY.factoryIntro] : [act.prompt], voiced ? 420 : -1);
  const later = useLater();
  const [rules, setRules] = useState<FactoryRule[]>(() => act.answer.map(() => ({ cond: "", bin: "" })));
  const [elseBin, setElseBin] = useState("");
  const [phase, setPhase] = useState<"edit" | "run" | "oops" | "won">("edit");
  const [cur, setCur] = useState(-1); // item on the sensor
  const [line, setLine] = useState<{ i: number; yes: boolean } | null>(null); // rule being checked (-1 = else)
  const [placed, setPlaced] = useState<{ id: string; bin: string; ok: boolean }[]>([]);
  const [misses, setMisses] = useState(0);
  const editing = phase === "edit" || phase === "oops";
  const ready = rules.every((r) => r.cond && r.bin) && !!elseBin;

  const cycle = <T,>(list: T[], v: T | "", next: (t: T) => void) => {
    const i = list.indexOf(v as T);
    next(list[(i + 1) % list.length]);
  };
  const touch = () => {
    if (phase === "oops") {
      setPhase("edit");
      setPlaced([]);
      setCur(-1);
      setLine(null);
    }
  };
  const setCond = (k: number) => {
    if (!editing) return;
    touch();
    sfx("pick");
    cycle(act.conds.map((c) => c.id), rules[k].cond, (id) => setRules((rs) => rs.map((r, j) => (j === k ? { ...r, cond: id } : r))));
  };
  const setBin = (k: number) => {
    if (!editing) return;
    touch();
    sfx("pick");
    cycle(act.bins.map((b) => b.id), k < 0 ? elseBin : rules[k].bin, (id) => (k < 0 ? setElseBin(id) : setRules((rs) => rs.map((r, j) => (j === k ? { ...r, bin: id } : r)))));
  };

  const run = () => {
    if (!ready) return;
    setPhase("run");
    setPlaced([]);
    sfx("whoosh");
    let t = 400;
    const step = fx.voice === "all" ? 520 : 400;
    act.items.forEach((it, n) => {
      later(() => (setCur(n), setLine(null), sfx("move")), t);
      t += step;
      // The sensor checks each rule in order until one says yes.
      let landed = elseBin;
      for (let i = 0; i < rules.length; i++) {
        const yes = condTest(it, act.conds.find((c) => c.id === rules[i].cond));
        const ii = i;
        later(() => (setLine({ i: ii, yes }), sfx("beep")), t);
        t += step * 0.75;
        if (yes) {
          landed = rules[i].bin;
          break;
        }
        if (i === rules.length - 1) {
          later(() => setLine({ i: -1, yes: true }), t);
          t += step * 0.6;
        }
      }
      const ok = landed === route(it, act.answer, act.elseBin, act.conds);
      later(() => {
        setPlaced((p) => [...p, { id: it.id, bin: landed, ok }]);
        sfx(ok ? "pop" : "soft-fail");
      }, t);
      t += step * 0.6;
    });
    later(() => {
      setCur(-1);
      setLine(null);
      if (factoryWins(act.items, rules, elseBin, act.conds, act.answer, act.elseBin)) {
        setPhase("won");
        fx.right(null, [SAY.factoryWin]);
        later(() => onDone(misses), 2400);
      } else {
        setPhase("oops");
        setMisses((m) => m + 1);
        fx.miss();
        void say(SAY.factoryWrong);
      }
    }, t + 300);
  };

  const binOf = (id: string) => act.bins.find((b) => b.id === id);
  const condOf = (id: string) => act.conds.find((c) => c.id === id);
  const waiting = act.items.filter((it) => !placed.some((p) => p.id === it.id));
  return (
    <div className="flex w-full max-w-[1180px] flex-col gap-4">
      <PromptRow parts={[act.prompt]}>{act.prompt}</PromptRow>
      {/* The factory floor: belt → sensor → bins */}
      <div className="flex w-full flex-col items-center gap-3 rounded-[28px] bg-gradient-to-b from-[#e2e8f0] to-[#cbd5e1] p-4 shadow-[0_8px_0_rgba(0,40,80,0.16)]">
        <div className="flex w-full items-center gap-3">
          <div className="relative flex min-h-[86px] flex-1 items-center gap-2 overflow-hidden rounded-2xl bg-[#475569] px-3 py-2" style={{ backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0 18px, transparent 18px 36px)" }}>
            {waiting.map((it) => (
              <span key={it.id} className={cn("flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white shadow-[0_4px_0_rgba(0,0,0,0.25)] transition-all duration-300", act.items[cur]?.id === it.id && "-translate-y-1 scale-110 ring-[5px] ring-[var(--l-gold)]")} title={it.name}>
                <GlyphRow s={it.emoji} size={50} />
              </span>
            ))}
          </div>
          <span className={cn("flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#1e293b] shadow-[0_4px_0_rgba(0,0,0,0.3)]", line && (line.yes ? "ring-[5px] ring-[#22c55e]" : "ring-[5px] ring-[#ef4444]"))}>
            <Glyph e="📡" size={44} />
          </span>
        </div>
        <div className="flex w-full flex-wrap justify-center gap-3">
          {act.bins.map((b) => (
            <div key={b.id} className="flex min-w-[160px] flex-1 flex-col items-center gap-1 rounded-2xl border-[4px] border-white/80 bg-white/60 p-2">
              <span className="font-display text-lg font-extrabold text-[var(--l-ink)]">
                <GlyphRow s={b.emoji} size={30} className="mr-1 align-[-0.3em]" />
                {b.label}
              </span>
              <div className="flex min-h-[58px] flex-wrap justify-center gap-1">
                {placed
                  .filter((p) => p.bin === b.id)
                  .map((p) => (
                    <span key={p.id} className="l-pop-in relative">
                      <GlyphRow s={act.items.find((x) => x.id === p.id)?.emoji ?? ""} size={46} />
                      {!p.ok && <Glyph e="❌" size={28} className="absolute -right-2 -top-2" />}
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* The rule */}
      <div className="flex w-full flex-col gap-2 rounded-[26px] bg-white/95 p-4 shadow-[0_8px_0_rgba(0,40,80,0.16)]">
        <span className="font-display text-lg font-extrabold text-[var(--l-ink-2)]"><Glyph e="🔁" size="1.25em" className="mx-[0.1em] inline-block align-[-0.28em]" /> For each thing on the belt:</span>
        {rules.map((r, k) => (
          <RuleRow key={k} lead={k === 0 ? "IF" : "ELSE IF"} active={line?.i === k ? line.yes : null}>
            <Pick onClick={() => setCond(k)} disabled={!editing} empty={!r.cond} tone="violet">
              <WithGlyphs text={r.cond ? `${condOf(r.cond)?.icon} ${condOf(r.cond)?.label}` : "tap to pick ❓"} />
            </Pick>
            <span className="font-display text-2xl font-extrabold text-[var(--l-ink)]">→</span>
            <Pick onClick={() => setBin(k)} disabled={!editing} empty={!r.bin} tone="teal">
              <WithGlyphs text={r.bin ? `${binOf(r.bin)?.emoji} ${binOf(r.bin)?.label}` : "pick a bin 📦"} />
            </Pick>
          </RuleRow>
        ))}
        <RuleRow lead="ELSE" active={line?.i === -1 ? true : null}>
          <Pick onClick={() => setBin(-1)} disabled={!editing} empty={!elseBin} tone="teal">
            <WithGlyphs text={elseBin ? `${binOf(elseBin)?.emoji} ${binOf(elseBin)?.label}` : "pick a bin 📦"} />
          </Pick>
        </RuleRow>
        <Chunk tone="green" disabled={!editing || !ready} onClick={run} className={cn("mt-1 flex h-16 items-center justify-center gap-2 font-display text-2xl font-extrabold", editing && ready && "l-pulse")}>
          <Play className="h-8 w-8 fill-current" /> {phase === "oops" ? "Run it again" : "Run the factory"}
        </Chunk>
      </div>
    </div>
  );
}

function RuleRow({ lead, active, children }: { lead: string; active: boolean | null; children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3 rounded-2xl px-2 py-1.5 transition-colors", active === true && "bg-[#dcfce7]", active === false && "bg-[#fee2e2]")}>
      <span className="w-[110px] font-display text-xl font-extrabold text-[#7e22ce]">{lead}</span>
      {children}
      {active !== null && <span className="l-pop-in text-2xl">{active ? "✓" : "✗"}</span>}
    </div>
  );
}

function Pick({ children, onClick, disabled, empty, tone }: { children: React.ReactNode; onClick: () => void; disabled: boolean; empty: boolean; tone: "violet" | "teal" }) {
  return (
    <Chunk tone={empty ? "white" : tone} disabled={disabled} onClick={onClick} className={cn("flex h-14 items-center px-4 font-display text-lg font-extrabold", empty && "border-[3px] border-dashed border-[var(--l-line)] text-[var(--l-ink-2)]")}>
      {children}
    </Chunk>
  );
}

