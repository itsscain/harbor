"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { Block } from "@/lib/learn/types";
import type { ListPath } from "./blocks";

// Drag and drop for the block editor, made for fingers: drag a block from the palette into the
// program (the nearest gap lights up), drag a block within the program to move it, or drag it to
// the trash. A tap still works the old way (add at the glowing slot / select a block).

export type DragSrc = { kind: "palette"; op: string; block: Block; make: () => Block } | { kind: "prog"; list: ListPath; index: number; block: Block };
export type DropAt = { list: ListPath; index: number } | "trash" | null;
export type DragState = { src: DragSrc; x: number; y: number; over: DropAt };

/** Is path `inner` inside (or equal to) the block at `outer`'s list+index? (A block can't be
 *  dropped into itself.) */
export function insideOf(inner: ListPath, outer: { list: ListPath; index: number }) {
  const p = [...outer.list, outer.index];
  return inner.length >= p.length && p.every((v, i) => inner[i] === v);
}

export function useBlockDrag(opts: {
  disabled?: boolean;
  /** The program panel: its [data-slot] gaps are the drop targets. */
  zone: RefObject<HTMLElement | null>;
  onTap: (src: DragSrc) => void;
  onDrop: (src: DragSrc, at: DropAt) => void;
  onLift?: (src: DragSrc) => void;
}) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const st = useRef<{ src: DragSrc; x0: number; y0: number; id: number; moved: boolean } | null>(null);
  const optsRef = useRef(opts);
  useEffect(() => {
    optsRef.current = opts;
  });

  /** What's under the finger: the trash, the nearest gap in the program, or nothing. */
  const target = (x: number, y: number): DropAt => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    if (el?.closest("[data-trash]")) return "trash";
    const zone = optsRef.current.zone.current;
    if (!zone) return null;
    const zr = zone.getBoundingClientRect();
    if (x < zr.left - 40 || x > zr.right + 40 || y < zr.top - 40 || y > zr.bottom + 40) return null;
    let best: DropAt = null;
    let bd = Infinity;
    zone.querySelectorAll<HTMLElement>("[data-slot]").forEach((s) => {
      const r = s.getBoundingClientRect();
      const cx = Math.max(r.left, Math.min(x, r.right));
      const d = Math.abs(y - (r.top + r.height / 2)) + Math.abs(x - cx) * 0.6;
      if (d < bd) {
        bd = d;
        best = JSON.parse(s.dataset.slot!);
      }
    });
    return best;
  };

  const bind = (src: DragSrc) => ({
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (optsRef.current.disabled || st.current) return;
      st.current = { src, x0: e.clientX, y0: e.clientY, id: e.pointerId, moved: false };
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const s = st.current;
      if (!s || e.pointerId !== s.id) return;
      if (!s.moved && Math.hypot(e.clientX - s.x0, e.clientY - s.y0) > 10) {
        s.moved = true;
        optsRef.current.onLift?.(s.src);
      }
      if (s.moved) setDrag({ src: s.src, x: e.clientX, y: e.clientY, over: target(e.clientX, e.clientY) });
    },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
      const s = st.current;
      if (!s || e.pointerId !== s.id) return;
      st.current = null;
      setDrag(null);
      if (!s.moved) optsRef.current.onTap(s.src);
      else optsRef.current.onDrop(s.src, target(e.clientX, e.clientY));
    },
    onPointerCancel: () => {
      st.current = null;
      setDrag(null);
    },
  });
  return { drag, bind };
}
