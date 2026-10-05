"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import { TankEngine, type TankEvents, type TankInput } from "./engine";

// The living tank on the wall: one canvas driven by the TankEngine. Taps and drags go straight
// to the engine (feeding, tapping a friend, curious fish following a finger); what the engine
// reports back (a friend tapped, food eaten, an egg tapped) comes out through `events`.

export function Tank({ input, events, className }: { input: TankInput; events: TankEvents; className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<TankEngine | null>(null);
  const handlers = useRef(events);
  useEffect(() => {
    handlers.current = events;
  });

  useEffect(() => {
    const c = canvas.current;
    const w = wrap.current;
    if (!c || !w) return;
    const e = new TankEngine(c, () => handlers.current);
    engine.current = e;
    if (process.env.NODE_ENV !== "production") (window as unknown as { __tank?: TankEngine }).__tank = e;
    // Size it now (a resize observer only reports on the next painted frame), then keep up.
    e.resize(w.clientWidth, w.clientHeight);
    const ro = new ResizeObserver(([entry]) => e.resize(entry.contentRect.width, entry.contentRect.height));
    ro.observe(w);
    return () => {
      ro.disconnect();
      e.destroy();
      engine.current = null;
    };
  }, []);

  useEffect(() => {
    engine.current?.setInput(input);
  }, [input]);

  const at = (ev: PointerEvent<HTMLCanvasElement>) => {
    const r = ev.currentTarget.getBoundingClientRect();
    return [ev.clientX - r.left, ev.clientY - r.top] as const;
  };

  return (
    <div ref={wrap} className={className}>
      <canvas
        ref={canvas}
        className="absolute inset-0 block h-full w-full touch-none select-none"
        onPointerDown={(ev) => {
          const [x, y] = at(ev);
          ev.currentTarget.setPointerCapture(ev.pointerId);
          engine.current?.pointerDown(x, y);
        }}
        onPointerMove={(ev) => {
          const [x, y] = at(ev);
          engine.current?.pointerMove(x, y);
        }}
        onPointerUp={() => engine.current?.pointerUp()}
        onPointerCancel={() => engine.current?.pointerUp()}
        aria-label="Your aquarium. Tap a friend to say hi, tap the water to feed them."
        role="img"
      />
    </div>
  );
}
