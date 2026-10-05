"use client";

import type { CSSProperties, ReactNode } from "react";
import { Trash2, Minus, Plus, CornerDownRight, CornerLeftUp } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Block } from "@/lib/learn/types";
import { COND_LABEL, lookOf, pyLine, sameList, type Cursor, type ListPath, type Sel } from "./blocks";
import { colorize } from "../lab/CodeReadAct";
import { GlyphRow } from "../art/Glyph";

// The program, as chunky blocks a child can read at a glance — every block shows its picture AND
// its code word, the lines are numbered (a program runs top to bottom), loops and if/else are
// colored brackets that hold other blocks, and a glowing slot shows where the next block goes.
// Blocks can be dragged in from the palette, moved, or dragged out to the trash; while dragging,
// the gaps open up and the nearest one lights. Word Wharf shows the words alone; Code Captain
// shows real code lines. While the program runs, the block that's working lights up.

export type EditorMode = "blocks" | "words" | "code";
export type EditorProps = {
  prog: Block[];
  cursor: Cursor;
  sel: Sel;
  /** Little sailors get bigger pictures and a cursor that stays at the end. */
  band: "little" | "middle" | "big";
  mode: EditorMode;
  running: boolean;
  /** The block that's running right now (+ the yes/no of a check). */
  active: { list: ListPath; index: number; answer?: "yes" | "no" } | null;
  /** Blocks the hint wants (pulsing). */
  ghost?: { list: ListPath; index: number } | null;
  /** From here on, the blocks aren't right yet (a hint marks them red). */
  bad?: { list: ListPath; from: number } | null;
  /** Loops that are running right now, and which pass they're on (shown on the loop). */
  loops?: { list: ListPath; index: number; k: number; n?: number }[];
  /** A drag is happening: open the gaps; `over` is the gap that would take the block. */
  dragging?: boolean;
  over?: { list: ListPath; index: number } | null;
  /** The block being dragged (dimmed in place). */
  lifted?: { list: ListPath; index: number } | null;
  /** Pointer handlers that let a block be dragged (and tapped to select). */
  grab: (list: ListPath, index: number, b: Block) => Record<string, (e: React.PointerEvent<HTMLElement>) => void>;
  onCursor: (c: Cursor) => void;
  onDelete: (list: ListPath, index: number) => void;
  onCount: (list: ListPath, index: number, delta: number) => void;
  onCond: (list: ListPath, index: number) => void;
};

/** A block's code word, as shown in the editor and read aloud. */
export function blockWord(op: string, block?: Block) {
  return op === "call" ? block?.name ?? "call" : lookOf(op).word;
}

export function BlockPill({ op, block, band, mode = "blocks", size = "md", style, className }: { op: string; block?: Block; band: EditorProps["band"]; mode?: EditorMode; size?: "sm" | "md" | "lg"; style?: CSSProperties; className?: string }) {
  const lk = lookOf(op);
  if (mode === "code") {
    const line = pyLine(block ?? { op });
    return (
      <span className={cn("inline-flex items-center rounded-xl bg-[#1e293b] font-mono font-bold text-[#e2e8f0] shadow-[0_4px_0_#020617]", size === "lg" ? "h-[60px] px-4 text-lg" : size === "sm" ? "h-9 px-2.5 text-sm" : "h-[50px] px-3.5 text-base", className)} style={style}>
        <span className="whitespace-pre">{colorize(line)}</span>
      </span>
    );
  }
  const word = blockWord(op, block);
  const icon = mode === "words" ? null : <GlyphRow s={lk.icon} size={size === "lg" ? 40 : size === "sm" ? 24 : 31} />;
  return (
    <span
      className={cn("inline-flex items-center gap-2 rounded-2xl font-display font-extrabold text-white", size === "lg" ? "h-[68px] px-4 text-xl" : size === "sm" ? "h-10 px-2.5 text-sm" : "h-[54px] px-3.5 text-lg", mode === "words" && (size === "sm" ? "text-base" : "text-2xl"), className)}
      style={{ background: lk.color, boxShadow: `0 5px 0 ${lk.edge}`, ...style }}
    >
      {icon}
      <span className={cn("whitespace-nowrap drop-shadow-[0_1px_0_rgba(0,0,0,0.2)]", band === "little" && mode !== "words" && size !== "sm" && "text-base")}>{mode === "words" ? word.toLowerCase() : word}</span>
    </span>
  );
}

/** Line numbers in reading order (each block is one line; an "else" takes a line too). */
function numberLines(prog: Block[]) {
  const map = new Map<string, number>();
  let n = 0;
  const walk = (list: Block[], path: ListPath) =>
    list.forEach((b, i) => {
      map.set(`${path.join(".")}|${i}`, ++n);
      if (b.body) walk(b.body, [...path, i, "b"]);
      if (b.op === "ifelse") {
        n++;
        walk(b.else ?? [], [...path, i, "e"]);
      }
    });
  walk(prog, []);
  return map;
}

export function Editor(p: EditorProps) {
  const lines = numberLines(p.prog);
  return (
    <div className="flex flex-col gap-0.5 pb-2">
      <ListInner p={p} lines={lines} list={[]} blocks={p.prog} depth={0} />
    </div>
  );
}

function Slot({ p, list, index, last }: { p: EditorProps; list: ListPath; index: number; last?: boolean }) {
  const here = sameList(p.cursor.list, list) && p.cursor.index === index;
  const target = !!p.over && sameList(p.over.list, list) && p.over.index === index;
  const tappable = !p.running && (p.band !== "little" || last);
  return (
    <button
      type="button"
      disabled={!tappable && !p.dragging}
      data-slot={JSON.stringify({ list, index })}
      aria-label="Put the next block here"
      onClick={() => p.onCursor({ list, index })}
      className={cn("relative flex w-full items-center transition-all duration-150", target ? "h-12" : p.dragging ? "h-5" : here ? "h-11" : tappable ? "h-3.5" : "h-1.5")}
    >
      {target ? (
        <span className="flex h-10 w-full items-center gap-2 rounded-xl border-[3px] border-[var(--l-green)] bg-[var(--l-green)]/20 px-3 font-display text-sm font-extrabold text-[var(--l-green-edge)]">
          <Plus className="h-4 w-4" strokeWidth={3.5} /> drop it here
        </span>
      ) : p.dragging ? (
        <span className="h-1 w-full rounded-full bg-[var(--l-ink-2)]/15" />
      ) : (
        here &&
        !p.running && (
          <span className={cn("l-pulse flex h-9 w-full items-center gap-2 rounded-xl border-[3px] border-dashed px-3 font-display text-sm font-extrabold", p.mode === "code" ? "border-[#facc15] bg-[#facc15]/10 text-[#facc15]" : "border-[var(--l-gold)] bg-[var(--l-gold)]/20 text-[var(--l-gold-edge)]")}>
            <Plus className="h-4 w-4" strokeWidth={3.5} /> next {p.mode === "code" ? "line" : "block"} goes here
          </span>
        )
      )}
    </button>
  );
}

function ListInner({ p, lines, list, blocks, depth }: { p: EditorProps; lines: Map<string, number>; list: ListPath; blocks: Block[]; depth: number }) {
  return (
    <div className="flex flex-col">
      {blocks.map((b, i) => (
        <div key={i} className="flex flex-col">
          <Slot p={p} list={list} index={i} />
          <Row p={p} lines={lines} list={list} index={i} b={b} depth={depth} />
        </div>
      ))}
      <Slot p={p} list={list} index={blocks.length} last />
    </div>
  );
}

const stop = { onPointerDown: (e: React.PointerEvent) => e.stopPropagation() };
function LineNo({ n, code }: { n: number | undefined; code: boolean }) {
  return <span className={cn("w-6 shrink-0 text-right font-mono text-sm font-bold tabular-nums", code ? "text-[#64748b]" : "text-[var(--l-ink-2)]/60")}>{n}</span>;
}

function Row({ p, lines, list, index, b, depth }: { p: EditorProps; lines: Map<string, number>; list: ListPath; index: number; b: Block; depth: number }) {
  const isActive = !!p.active && sameList(p.active.list, list) && p.active.index === index;
  const isSel = !!p.sel && sameList(p.sel.list, list) && p.sel.index === index;
  const isGhost = !!p.ghost && sameList(p.ghost.list, list) && p.ghost.index === index;
  const isBad = !!p.bad && sameList(p.bad.list, list) && index >= p.bad.from;
  const isLifted = !!p.lifted && sameList(p.lifted.list, list) && p.lifted.index === index;
  const pass = p.running ? p.loops?.find((l) => sameList(l.list, list) && l.index === index) : undefined;
  const lk = lookOf(b.op);
  const code = p.mode === "code";
  const n = lines.get(`${list.join(".")}|${index}`);
  const grab = p.running ? {} : p.grab(list, index, b);
  const toolbar = isSel && !p.running && (
    <span className="ml-auto flex items-center gap-1.5" {...stop}>
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
      <div className={cn("flex items-center gap-2 rounded-2xl transition-[transform,opacity]", isActive && "scale-[1.04]", isGhost && "l-hint", isLifted && "opacity-30")}>
        <LineNo n={n} code={code} />
        <span
          {...grab}
          role="button"
          tabIndex={0}
          aria-label={`${blockWord(b.op, b)} — drag to move, tap to select`}
          className={cn("touch-none rounded-2xl", !p.running && "cursor-grab", isActive && "ring-[5px] ring-white ring-offset-2 ring-offset-[var(--l-gold)]", isSel && "ring-[4px] ring-[var(--l-gold)]", isBad && !isSel && "l-pulse ring-[4px] ring-[var(--l-coral)]")}
        >
          <BlockPill op={b.op} block={b} band={p.band} mode={p.mode} />
        </span>
        {toolbar}
      </div>
    );
  }

  // Containers: a colored bracket (or, as code, an indented block) around the blocks it holds.
  const cond = b.cond ? COND_LABEL[b.cond] ?? { icon: "❓", word: b.cond } : null;
  const countBtn = b.op === "repeat" && (
    <button {...stop} type="button" disabled={p.running} onClick={() => p.onCount(list, index, 1)} className={cn("rounded-xl px-3 py-1 font-display text-xl font-extrabold shadow-[0_3px_0_rgba(0,0,0,0.15)]", code ? "bg-[#334155] font-mono text-[#fbbf24]" : "bg-white text-[#e26f27]")} aria-label={`${b.n} times — tap to change`}>
      {code ? b.n : `×${b.n}`}
    </button>
  );
  const condBtn = cond && (
    <button
      {...stop}
      type="button"
      disabled={p.running}
      onClick={() => p.onCond(list, index)}
      className={cn(
        "flex items-center gap-1.5 rounded-xl px-3 py-1 font-display text-base font-extrabold shadow-[0_3px_0_rgba(0,0,0,0.15)] transition-colors",
        code ? "bg-[#334155] font-mono text-[#93c5fd]" : "bg-white text-[#7e22ce]",
        isActive && p.active?.answer === "yes" && "bg-[#bbf7d0] text-[#15803d]",
        isActive && p.active?.answer === "no" && "bg-[#fecaca] text-[#b91c1c]",
      )}
      aria-label={`${cond.word} — tap to change`}
    >
      {!code && <GlyphRow s={cond.icon} size={26} />}
      {code ? pyLine({ op: "if", cond: b.cond }).replace(/^if /, "").replace(/:$/, "") : p.band !== "little" && <span>{cond.word}</span>}
      {isActive && p.active?.answer && <span className="text-lg">{p.active.answer === "yes" ? "✓" : "✗"}</span>}
    </button>
  );
  const passBadge = pass && (
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
  );
  const stepOut = (sameList(p.cursor.list.slice(0, list.length + 2), [...list, index, "b"]) || sameList(p.cursor.list.slice(0, list.length + 2), [...list, index, "e"])) && !p.running && (
    <button type="button" onClick={() => p.onCursor({ list, index: index + 1 })} className={cn("flex items-center gap-1 font-display text-xs font-extrabold", code ? "text-[#94a3b8]" : "text-white/90")} aria-label="Step out of this block">
      <CornerLeftUp className="h-4 w-4" strokeWidth={3} /> done inside
    </button>
  );

  if (code) {
    // for i in range(3):  /  if path_blocked():  /  while not at_goal():  /  def name():
    const head = b.op === "repeat" ? ["for i in range(", countBtn, "):"] : b.op === "until" ? ["while not ", condBtn, ":"] : b.op === "def" ? [`def ${b.name}():`] : ["if ", condBtn, ":"];
    return (
      <div className={cn("rounded-xl transition-transform", isActive && "scale-[1.01] bg-[#1e293b]", isGhost && "l-hint", isSel && "ring-[3px] ring-[#facc15]", isBad && !isSel && "ring-[3px] ring-[#f87171]", isLifted && "opacity-30")}>
        <div className="flex min-h-[50px] items-center gap-2">
          <LineNo n={n} code />
          <span {...grab} role="button" tabIndex={0} aria-label={`${blockWord(b.op, b)} — drag to move, tap to select`} className={cn("flex touch-none items-center gap-1 font-mono text-base font-bold", !p.running && "cursor-grab")}>
            {head.map((h, i) => (typeof h === "string" ? <span key={i} className="text-[#c084fc]">{h}</span> : <span key={i}>{h}</span>))}
          </span>
          {passBadge}
          {toolbar}
        </div>
        <div className="ml-8 border-l-2 border-[#334155] pl-3">
          <ListInner p={p} lines={lines} list={[...list, index, "b"]} blocks={b.body} depth={depth + 1} />
        </div>
        {b.op === "ifelse" && (
          <>
            <div className="flex items-center gap-2 py-1">
              <LineNo n={lines.get(`${list.join(".")}|${index}`)! + countLines(b.body) + 1} code />
              <span className="font-mono text-base font-bold text-[#c084fc]">else:</span>
            </div>
            <div className="ml-8 border-l-2 border-[#334155] pl-3">
              <ListInner p={p} lines={lines} list={[...list, index, "e"]} blocks={b.else ?? []} depth={depth + 1} />
            </div>
          </>
        )}
        <div className="flex h-6 items-center pl-8">{stepOut}</div>
      </div>
    );
  }

  const header = (
    <div className="flex min-h-[52px] items-center gap-2 px-2.5 py-1.5">
      <span className="font-mono text-sm font-bold text-white/70">{n}</span>
      <span {...grab} role="button" tabIndex={0} aria-label={`${blockWord(b.op, b)} — drag to move, tap to select`} className={cn("flex touch-none items-center gap-2 font-display text-lg font-extrabold text-white", !p.running && "cursor-grab")}>
        {p.mode !== "words" && <GlyphRow s={lk.icon ?? ""} size={29} />}
        {b.op === "def" ? <span>Define {b.name}</span> : b.op === "repeat" ? <span>Repeat</span> : <span>{b.op === "until" ? "Repeat until" : "If"}</span>}
      </span>
      {countBtn}
      {passBadge}
      {condBtn}
      {toolbar}
    </div>
  );
  return (
    <div className={cn("rounded-[20px] transition-transform", isActive && "scale-[1.02]", isGhost && "l-hint", isSel && "ring-[4px] ring-[var(--l-gold)]", isBad && !isSel && "ring-[4px] ring-[var(--l-coral)]", isLifted && "opacity-30")} style={{ background: lk.color, boxShadow: `0 5px 0 ${lk.edge}` }}>
      {header}
      <div className="ml-4 mr-1.5 rounded-xl bg-white/85 px-2">
        <ListInner p={p} lines={lines} list={[...list, index, "b"]} blocks={b.body} depth={depth + 1} />
      </div>
      {b.op === "ifelse" && (
        <>
          <div className="px-3 py-1 font-display text-base font-extrabold text-white">Else</div>
          <div className="ml-4 mr-1.5 rounded-xl bg-white/85 px-2">
            <ListInner p={p} lines={lines} list={[...list, index, "e"]} blocks={b.else ?? []} depth={depth + 1} />
          </div>
        </>
      )}
      <div className="flex h-6 items-center px-3">{stepOut}</div>
    </div>
  );
}

/** How many lines a list of blocks takes (for numbering an "else"). */
function countLines(list: Block[]): number {
  return list.reduce((n, b) => n + 1 + (b.body ? countLines(b.body) : 0) + (b.op === "ifelse" ? 1 + countLines(b.else ?? []) : 0), 0);
}

function ToolBtn({ children, label, onClick, danger }: { children: ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => e.stopPropagation()}
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
