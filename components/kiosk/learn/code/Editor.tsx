"use client";

import type { CSSProperties, ReactNode } from "react";
import { Trash2, Minus, Plus, CornerDownRight, CornerLeftUp } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Block } from "@/lib/learn/types";
import { COND_LABEL, lookOf, sameList, type Cursor, type ListPath, type Sel } from "./blocks";

// The program, as chunky blocks a child can read at a glance: actions are pills, loops and
// if/else are colored brackets that hold other blocks, and a glowing slot shows where the next
// block will go. While the program runs, the block that's working lights up.

export type EditorProps = {
  prog: Block[];
  cursor: Cursor;
  sel: Sel;
  /** Little sailors get icons only and a cursor that stays at the end. */
  band: "little" | "middle" | "big";
  running: boolean;
  /** The block that's running right now (+ the yes/no of a check). */
  active: { list: ListPath; index: number; answer?: "yes" | "no" } | null;
  /** Blocks the hint wants (pulsing). */
  ghost?: { list: ListPath; index: number } | null;
  /** From here on, the blocks aren't right yet (a hint marks them red). */
  bad?: { list: ListPath; from: number } | null;
  /** Loops that are running right now, and which pass they're on (shown on the loop). */
  loops?: { list: ListPath; index: number; k: number; n?: number }[];
  onCursor: (c: Cursor) => void;
  onSelect: (s: Sel) => void;
  onDelete: (list: ListPath, index: number) => void;
  onCount: (list: ListPath, index: number, delta: number) => void;
  onCond: (list: ListPath, index: number) => void;
};

export function BlockPill({ op, block, band, size = "md", style, className }: { op: string; block?: Block; band: EditorProps["band"]; size?: "sm" | "md" | "lg"; style?: CSSProperties; className?: string }) {
  const lk = lookOf(op);
  const icon = <span className={cn("leading-none", size === "lg" ? "text-[34px]" : size === "sm" ? "text-xl" : "text-[26px]")}>{lk.icon}</span>;
  const word = op === "call" ? block?.name ?? "call" : lk.word;
  const showWord = band !== "little" || /^(fd|rt|lt)\d/.test(op) || op === "call";
  return (
    <span
      className={cn("inline-flex items-center gap-2 rounded-2xl font-display font-extrabold text-white", size === "lg" ? "h-[68px] px-4 text-xl" : size === "sm" ? "h-10 px-2.5 text-sm" : "h-[54px] px-3.5 text-lg", className)}
      style={{ background: lk.color, boxShadow: `0 5px 0 ${lk.edge}`, ...style }}
    >
      {icon}
      {lk.text && !showWord && <span className="text-2xl">{lk.text}</span>}
      {showWord && <span className="whitespace-nowrap drop-shadow-[0_1px_0_rgba(0,0,0,0.2)]">{word}</span>}
    </span>
  );
}

export function Editor(p: EditorProps) {
  return (
    <div className="flex flex-col gap-0.5 pb-2">
      <ListInner p={p} list={[]} blocks={p.prog} depth={0} />
    </div>
  );
}

function Slot({ p, list, index, last }: { p: EditorProps; list: ListPath; index: number; last?: boolean }) {
  const here = sameList(p.cursor.list, list) && p.cursor.index === index;
  const tappable = !p.running && (p.band !== "little" || last);
  return (
    <button
      type="button"
      disabled={!tappable}
      aria-label="Put the next block here"
      onClick={() => p.onCursor({ list, index })}
      className={cn("relative flex w-full items-center transition-all", here ? "h-11" : tappable ? "h-3.5" : "h-1.5")}
    >
      {here && !p.running && (
        <span className="l-pulse flex h-9 w-full items-center gap-2 rounded-xl border-[3px] border-dashed border-[var(--l-gold)] bg-[var(--l-gold)]/20 px-3 font-display text-sm font-extrabold text-[var(--l-gold-edge)]">
          <Plus className="h-4 w-4" strokeWidth={3.5} /> next block goes here
        </span>
      )}
    </button>
  );
}

function ListInner({ p, list, blocks, depth }: { p: EditorProps; list: ListPath; blocks: Block[]; depth: number }) {
  return (
    <div className="flex flex-col">
      {blocks.map((b, i) => (
        <div key={i} className="flex flex-col">
          <Slot p={p} list={list} index={i} />
          <Row p={p} list={list} index={i} b={b} depth={depth} />
        </div>
      ))}
      <Slot p={p} list={list} index={blocks.length} last />
    </div>
  );
}

function Row({ p, list, index, b, depth }: { p: EditorProps; list: ListPath; index: number; b: Block; depth: number }) {
  const isActive = !!p.active && sameList(p.active.list, list) && p.active.index === index;
  const isSel = !!p.sel && sameList(p.sel.list, list) && p.sel.index === index;
  const isGhost = !!p.ghost && sameList(p.ghost.list, list) && p.ghost.index === index;
  const isBad = !!p.bad && sameList(p.bad.list, list) && index >= p.bad.from;
  const pass = p.running ? p.loops?.find((l) => sameList(l.list, list) && l.index === index) : undefined;
  const lk = lookOf(b.op);
  const select = () => !p.running && p.onSelect(isSel ? null : { list, index });
  const toolbar = isSel && !p.running && (
    <span className="ml-auto flex items-center gap-1.5">
      {b.op === "repeat" && (
        <>
          <ToolBtn label="fewer times" onClick={() => p.onCount(list, index, -1)}>
            <Minus className="h-5 w-5" strokeWidth={3} />
          </ToolBtn>
          <ToolBtn label="more times" onClick={() => p.onCount(list, index, 1)}>
            <Plus className="h-5 w-5" strokeWidth={3} />
          </ToolBtn>
        </>
      )}
      {(b.body || b.op === "def") && (
        <ToolBtn label="add blocks inside" onClick={() => p.onCursor({ list: [...list, index, "b"], index: (b.body ?? []).length })}>
          <CornerDownRight className="h-5 w-5" strokeWidth={3} />
        </ToolBtn>
      )}
      <ToolBtn label="delete block" danger onClick={() => p.onDelete(list, index)}>
        <Trash2 className="h-5 w-5" strokeWidth={2.6} />
      </ToolBtn>
    </span>
  );

  if (!b.body) {
    return (
      <div className={cn("flex items-center gap-2 rounded-2xl transition-transform", isActive && "scale-[1.04]", isGhost && "l-hint")}>
        <button type="button" onClick={select} disabled={p.running} className={cn("rounded-2xl", isActive && "ring-[5px] ring-white ring-offset-2 ring-offset-[var(--l-gold)]", isSel && "ring-[4px] ring-[var(--l-gold)]", isBad && !isSel && "l-pulse ring-[4px] ring-[var(--l-coral)]")}>
          <BlockPill op={b.op} block={b} band={p.band} />
        </button>
        {toolbar}
      </div>
    );
  }

  // Containers: a colored bracket around the blocks it holds.
  const cond = b.cond ? COND_LABEL[b.cond] ?? { icon: "❓", word: b.cond } : null;
  const header = (
    <div className="flex min-h-[52px] items-center gap-2 px-2.5 py-1.5">
      <button type="button" onClick={select} disabled={p.running} className="flex items-center gap-2 font-display text-lg font-extrabold text-white">
        <span className="text-[24px] leading-none">{lk.icon}</span>
        {b.op === "def" ? (
          <span>Define {b.name}</span>
        ) : b.op === "repeat" ? (
          <span>{p.band === "little" ? "" : "Repeat "}</span>
        ) : (
          <span>{b.op === "until" ? "Repeat until" : "If"}</span>
        )}
      </button>
      {b.op === "repeat" && (
        <button type="button" disabled={p.running} onClick={() => p.onCount(list, index, 1)} className="rounded-xl bg-white px-3 py-1 font-display text-xl font-extrabold text-[#e26f27] shadow-[0_3px_0_rgba(0,0,0,0.15)]" aria-label={`${b.n} times — tap to change`}>
          ×{b.n}
        </button>
      )}
      {pass && (
        // The loop counts its passes out loud (well, in big friendly numbers) while it runs.
        <span key={pass.k} className="l-pop-in flex items-center gap-1 rounded-xl bg-[#fff7d6] px-2.5 py-1 font-display text-base font-extrabold text-[#7a5200] shadow-[0_3px_0_rgba(0,0,0,0.15)]" aria-label={pass.n ? `pass ${pass.k} of ${pass.n}` : `check number ${pass.k}`}>
          {pass.n ? (
            <>
              <span className="text-xl">{pass.k}</span>
              <span className="opacity-60">of {pass.n}</span>
            </>
          ) : (
            <>
              <span className="opacity-60">check</span> <span className="text-xl">#{pass.k}</span>
            </>
          )}
        </span>
      )}
      {cond && (
        <button
          type="button"
          disabled={p.running}
          onClick={() => p.onCond(list, index)}
          className={cn("flex items-center gap-1.5 rounded-xl bg-white px-3 py-1 font-display text-base font-extrabold text-[#7e22ce] shadow-[0_3px_0_rgba(0,0,0,0.15)] transition-colors", isActive && p.active?.answer === "yes" && "bg-[#bbf7d0] text-[#15803d]", isActive && p.active?.answer === "no" && "bg-[#fecaca] text-[#b91c1c]")}
          aria-label={`${cond.word} — tap to change`}
        >
          <span>{cond.icon}</span>
          {p.band !== "little" && <span>{cond.word}</span>}
          {isActive && p.active?.answer && <span className="text-lg">{p.active.answer === "yes" ? "✓" : "✗"}</span>}
        </button>
      )}
      {toolbar}
    </div>
  );
  return (
    <div className={cn("rounded-[20px] transition-transform", isActive && "scale-[1.02]", isGhost && "l-hint", isSel && "ring-[4px] ring-[var(--l-gold)]", isBad && !isSel && "ring-[4px] ring-[var(--l-coral)]")} style={{ background: lk.color, boxShadow: `0 5px 0 ${lk.edge}` }}>
      {header}
      <div className="ml-4 mr-1.5 rounded-xl bg-white/85 px-2">
        <ListInner p={p} list={[...list, index, "b"]} blocks={b.body} depth={depth + 1} />
      </div>
      {b.op === "ifelse" && (
        <>
          <div className="px-3 py-1 font-display text-base font-extrabold text-white">Else</div>
          <div className="ml-4 mr-1.5 rounded-xl bg-white/85 px-2">
            <ListInner p={p} list={[...list, index, "e"]} blocks={b.else ?? []} depth={depth + 1} />
          </div>
        </>
      )}
      <div className="flex h-6 items-center px-3">
        {sameList(p.cursor.list.slice(0, list.length + 2), [...list, index, "b"]) || sameList(p.cursor.list.slice(0, list.length + 2), [...list, index, "e"]) ? (
          !p.running && (
            <button type="button" onClick={() => p.onCursor({ list, index: index + 1 })} className="flex items-center gap-1 font-display text-xs font-extrabold text-white/90" aria-label="Step out of this block">
              <CornerLeftUp className="h-4 w-4" strokeWidth={3} /> done inside
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}

function ToolBtn({ children, label, onClick, danger }: { children: ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn("flex h-10 w-10 items-center justify-center rounded-xl shadow-[0_3px_0_rgba(0,0,0,0.18)]", danger ? "bg-[var(--l-coral)] text-white" : "bg-white text-[var(--l-ink)]")}
    >
      {children}
    </button>
  );
}
