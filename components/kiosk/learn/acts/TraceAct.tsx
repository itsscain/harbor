"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { SAY, sndKey } from "@/lib/learn/script";
import { STROKES, LINES, strokePath, startAngle, type Pt } from "@/lib/learn/strokes";
import { say, type Part } from "@/lib/learn/audio";
import { sfx, buzz } from "@/lib/learn/sfx";
import { PromptRow, SoundChip, useLater, usePrompt, type ActProps } from "./common";

// Trace a letter with a finger, stroke by stroke, starting at the green dot. Lenient (a little
// finger is never pixel-perfect) but it does follow the real formation, so the habit sticks.

const NEAR = 12.5; // how close (in the 100-unit box) the finger must stay to the path
const LOOKAHEAD = 7; // how far ahead along the path one move can jump

export function TraceAct({ act, fx, onDone }: ActProps<"trace">) {
  const strokes = STROKES[act.letter] ?? STROKES.o;
  const snd = sndKey(act.letter);
  const parts: Part[] = fx.firstTime ? [snd, { gap: 300 }, SAY.traceIt] : [snd];
  usePrompt(fx, parts);
  const [si, setSi] = useState(0); // current stroke
  const [pi, setPi] = useState(0); // furthest point reached on it
  const [finger, setFinger] = useState<Pt | null>(null);
  const [done, setDone] = useState(false);
  const [nudge, setNudge] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const active = useRef<number | null>(null);
  const ticks = useRef(0);
  const later = useLater();

  /** Finger position in the letter's own 100-unit drawing (exact, whatever the screen size). */
  const toBox = (e: React.PointerEvent): Pt => {
    const m = svgRef.current?.getScreenCTM();
    if (!m) return { x: -99, y: -99 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };
  const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

  const completeStroke = (s: number) => {
    sfx("snap");
    buzz(14);
    active.current = null;
    setFinger(null);
    if (s + 1 >= strokes.length) {
      setDone(true);
      setSi(s + 1);
      later(() => {
        fx.right(svgRef.current, [snd]);
        later(() => void say(SAY.traceDone), 1300);
      }, 120);
      later(() => onDone(0), 3000);
    } else {
      setSi(s + 1);
      setPi(0);
    }
  };

  const onDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (done) return;
    const p = toBox(e);
    const stroke = strokes[si];
    // Dots are a tap.
    if (stroke.length === 1) {
      if (dist(p, stroke[0]) < NEAR + 4) completeStroke(si);
      return;
    }
    if (dist(p, stroke[pi]) <= NEAR + 3) {
      active.current = e.pointerId;
      setFinger(p);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    } else {
      setNudge((n) => n + 1); // show where to start
      if (pi === 0 && nudge % 3 === 1) void say(SAY.traceIt);
    }
  };
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (active.current !== e.pointerId) return;
    const p = toBox(e);
    setFinger(p);
    const stroke = strokes[si];
    let best = pi;
    for (let j = pi + 1; j <= Math.min(stroke.length - 1, pi + LOOKAHEAD); j++) if (dist(p, stroke[j]) <= NEAR) best = j;
    if (best !== pi) {
      if (++ticks.current % 3 === 0) sfx("trace");
      setPi(best);
      if (best >= stroke.length - 2) completeStroke(si);
    }
  };
  const onUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (active.current === e.pointerId) {
      active.current = null;
      setFinger(null);
    }
  };

  const cur = strokes[si];
  return (
    <div className="flex w-full flex-col items-center gap-5">
      <PromptRow parts={parts}>
        Trace <SoundChip text={act.letter} /> with your finger
      </PromptRow>
      <div className="relative rounded-[32px] bg-white p-3 shadow-[0_8px_0_var(--l-line)]">
        <svg
          ref={svgRef}
          viewBox="0 0 100 104"
          className={cn("block touch-none select-none", done && "l-boing")}
          style={{ width: "min(58vh, 560px)", height: "min(60vh, 582px)" }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          aria-label={`Trace the letter ${act.letter}`}
        >
          {/* handwriting lines */}
          <line x1="2" x2="98" y1={LINES.top} y2={LINES.top} stroke="#cfe3f3" strokeWidth="0.8" />
          <line x1="2" x2="98" y1={LINES.mid} y2={LINES.mid} stroke="#cfe3f3" strokeWidth="0.8" strokeDasharray="3 2.4" />
          <line x1="2" x2="98" y1={LINES.base} y2={LINES.base} stroke="#f2a0a0" strokeWidth="0.9" />
          <line x1="2" x2="98" y1={LINES.tail} y2={LINES.tail} stroke="#e3edf5" strokeWidth="0.6" />
          {/* the letter's road */}
          {strokes.map((s, i) =>
            s.length === 1 ? (
              <circle key={i} cx={s[0].x} cy={s[0].y} r="6.4" fill="#e5eef6" />
            ) : (
              <path key={i} d={strokePath(s)} fill="none" stroke="#e5eef6" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
            ),
          )}
          {/* what's been traced */}
          {strokes.map((s, i) => {
            if (i > si || (i === si && (s.length === 1 || pi === 0))) return null;
            const upto = i < si ? s : s.slice(0, pi + 1);
            return s.length === 1 ? (
              <circle key={`d${i}`} cx={s[0].x} cy={s[0].y} r="6.4" fill="url(#lt-ink)" />
            ) : (
              <path key={`d${i}`} d={strokePath(upto)} fill="none" stroke="url(#lt-ink)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
            );
          })}
          <defs>
            <linearGradient id="lt-ink" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ff9149" />
              <stop offset="1" stopColor="#ff6aa2" />
            </linearGradient>
          </defs>
          {/* guide for the current stroke: marching dashes, a start dot, a direction arrow */}
          {!done && cur && cur.length > 1 && (
            <>
              <path d={strokePath(cur.slice(pi))} fill="none" stroke="#9fb7cc" strokeWidth="1.3" strokeDasharray="2.6 3.4" strokeLinecap="round" className="l-dash" />
              <g key={nudge} className={nudge ? "l-boing" : undefined} style={{ transformOrigin: `${cur[pi].x}px ${cur[pi].y}px`, transformBox: "view-box" }}>
                <circle cx={cur[pi].x} cy={cur[pi].y} r="6.2" fill="#3ccf6e" stroke="#fff" strokeWidth="1.6" className={pi === 0 ? "l-pulse" : undefined} style={{ transformOrigin: `${cur[pi].x}px ${cur[pi].y}px`, transformBox: "view-box" }} />
                {pi === 0 && (
                  <text x={cur[0].x} y={cur[0].y + 2.3} textAnchor="middle" fontSize="6.4" fontWeight="800" fill="#fff">
                    {si + 1}
                  </text>
                )}
              </g>
              {pi === 0 && (
                <g transform={`translate(${cur[0].x} ${cur[0].y}) rotate(${startAngle(cur)}) translate(11 0)`}>
                  <path d="M-2.6 -3.4 L3 0 L-2.6 3.4 Z" fill="#3ccf6e" />
                </g>
              )}
            </>
          )}
          {!done && cur && cur.length === 1 && (
            <circle cx={cur[0].x} cy={cur[0].y} r="6.4" fill="#3ccf6e" stroke="#fff" strokeWidth="1.6" className="l-pulse" style={{ transformOrigin: `${cur[0].x}px ${cur[0].y}px`, transformBox: "view-box" }} />
          )}
          {finger && <circle cx={finger.x} cy={finger.y} r="4.2" fill="#fff" stroke="#ff9149" strokeWidth="1.4" opacity="0.9" />}
        </svg>
      </div>
    </div>
  );
}
