"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Square, RotateCcw, Delete, Trash2, Eye, Code2, Rabbit, Turtle as TurtleIcon, Lightbulb, ScanEye } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Block, CodeLevel, Dir } from "@/lib/learn/types";
import { DEFAULT_LOOK } from "@/lib/learn/meta";
import { Glyph, GlyphRow, WithGlyphs } from "../art/Glyph";
import {
  blockCount, drawTarget, gridEngine, parseGrid, pixelEngine, runLevel, sameSeg, toPython, toText, turtleEngine,
  type GridState, type PixelState, type RunResult, type Step, type TurtleState,
} from "@/lib/learn/program";
import { SAY } from "@/lib/learn/script";
import { say, type Part } from "@/lib/learn/audio";
import { sfx, note } from "@/lib/learn/sfx";
import { Chunk } from "../kit";
import type { ActProps } from "../acts/common";
import { PromptRow, usePrompt } from "../acts/common";
import { BlockPill, Editor, blockWord, type EditorMode } from "./Editor";
import { insideOf, useBlockDrag, type DragSrc, type DropAt } from "./dnd";
import { BoatSchool } from "./BoatSchool";
import { colorize } from "../lab/CodeReadAct";
import { DanceStage, MusicStage, PixelStage, SeaStage, TurtleStage, type PixelView, type SeaView, type SeqView, type TurtleView } from "./Stages";
import {
  COND_LABEL, blockAt, condsOf, insertAt, isContainer, listAt, nextHint, paletteOf, removeAt, sameList, stepTarget, updateAt,
  type Cursor, type ListPath, type Sel,
} from "./blocks";

// One coding puzzle: a world to program (left) and the program (right). Tap blocks in, press
// play, and watch it run block by block — the running block lights up while the boat sails, the
// rover's sensors check, the robot dances, the bells ring, the turtle draws or the brush paints.
// A miss shows exactly what went wrong; then the hints climb: the level's tip → "try this block
// next" → "Show me" (watch the answer run, then build it yourself).

type Band = "little" | "middle" | "big";
const LEFT_OF: Record<Dir, Dir> = { up: "left", left: "down", down: "right", right: "up" };
const RIGHT_OF: Record<Dir, Dir> = { up: "right", right: "down", down: "left", left: "up" };
const DEG: Record<Dir, number> = { right: 0, down: 90, left: 180, up: 270 };
const shortest = (from: number, to: number) => {
  const d = (((to - from) % 360) + 540) % 360 - 180;
  return from + d;
};

type Phase = "edit" | "demo" | "run" | "won" | "failed";

const isCheck = (st: Step<unknown>) => st.event === "yes" || st.event === "no";
const sameAt = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i]);
/** A run that reached the goal and then kept going (too many blocks): where the extra moves
 *  start (a top-level block), whether a loop that was already running kept going, and how many
 *  moves came after arriving. */
function overshootOf(res: RunResult<unknown>, map: string[], facing: Dir) {
  if (res.won || !map.length) return null;
  const eng = gridEngine(map, facing);
  const k = res.steps.findIndex((st) => eng.won(st.state as GridState));
  if (k < 0) return null;
  const after = res.steps.slice(k + 1).filter((x) => !isCheck(x));
  if (!after.length) return null;
  const arrived = res.steps[k];
  const inLoop = !!arrived.iters?.some((a) => after[0].iters?.some((b) => sameAt(a.at, b.at)));
  return { arrive: k, from: after[0].at[0], inLoop, extra: after.length };
}
/** The moves so far match the target from the start (so the only trouble is extras at the end). */
const prefixMatches = (done: string[], target: string[]) => target.every((t, i) => done[i] === t);
type Views = { sea?: SeaView; seq?: SeqView; turtle?: TurtleView; pixel?: PixelView };

function initViews(level: CodeLevel): Views {
  switch (level.sim) {
    case "sea":
    case "rover": {
      const maps = level.maps ?? [];
      const states = maps.map((m) => gridEngine(m, level.facing ?? "right").init);
      return { sea: { states, angles: states.map((s) => DEG[s.facing]), active: 0, trails: states.map((s) => [`${s.x},${s.y}`]), bump: null, sensor: null, won: false } };
    }
    case "dance":
    case "music":
      return { seq: { done: [], current: null, key: 0, mismatch: null, demo: false, demoIndex: null, won: false } };
    case "turtle": {
      const st = turtleEngine().init;
      return { turtle: { state: st, extra: null, missing: null, won: false, angle: st.deg } };
    }
    case "pixel":
      return { pixel: { state: pixelEngine(level.picture ?? []).init, wrong: null, won: false, key: 0 } };
  }
}

/** A coding puzzle. Before a child's first boat puzzle comes Boat School — once, and it can't be
 *  skipped (leaving the level just means it starts again next time). */
export function CodeAct(props: ActProps<"code">) {
  const { act, fx } = props;
  const [schooled, setSchooled] = useState(false);
  if (act.level.sim === "sea" && !schooled && !fx.tutorialDone("boat")) {
    const band = fx.voice === "all" ? "little" : fx.voice === "core" ? "middle" : "big";
    return (
      <BoatSchool
        fx={fx}
        look={fx.look ?? DEFAULT_LOOK}
        band={band}
        onDone={() => {
          fx.completeTutorial("boat");
          setSchooled(true);
        }}
      />
    );
  }
  return <CodeLevel {...props} />;
}

function CodeLevel({ act, fx, onDone }: ActProps<"code">) {
  const level = act.level;
  const band: Band = fx.voice === "all" ? "little" : fx.voice === "core" ? "middle" : "big";
  const look = fx.look ?? DEFAULT_LOOK;
  const [prog, setProg] = useState<Block[]>(() => (level.buggy ? JSON.parse(JSON.stringify(level.buggy)) : []));
  const [cursor, setCursor] = useState<Cursor>(() => ({ list: [], index: level.buggy?.length ?? 0 }));
  const [sel, setSel] = useState<Sel>(null);
  const [phase, setPhase] = useState<Phase>("edit");
  const [views, setViews] = useState<Views>(() => initViews(level));
  const [active, setActive] = useState<{ list: ListPath; index: number; answer?: "yes" | "no" } | null>(null);
  const [fails, setFails] = useState(0);
  // "Show me" waits for three DIFFERENT programs that didn't work — pressing Play on the same
  // broken program again (or mashing) doesn't unlock the answer.
  const [attempts, setAttempts] = useState(0);
  const lastTried = useRef("");
  const [msg, setMsg] = useState<{ text: string; tone: "good" | "bad" | "tip"; k: number } | null>(null);
  const [showCode, setShowCode] = useState(band === "big" || !!level.textCode);
  const [lang, setLang] = useState<"py" | "js">("py");
  const [fast, setFast] = useState(false);
  const [ghostOp, setGhostOp] = useState<string | null>(null);
  const [bad, setBad] = useState<{ list: ListPath; from: number } | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [loops, setLoops] = useState<{ list: ListPath; index: number; k: number; n?: number }[]>([]);
  const [hud, setHud] = useState<Hud | null>(null);
  const [recap, setRecap] = useState<Recap | null>(null);
  const [peek, setPeek] = useState(false);
  const peekTimer = useRef<number | null>(null);
  const zoneRef = useRef<HTMLDivElement | null>(null);
  const mode: EditorMode = level.mode ?? "blocks";
  const runStats = useRef<Recap | null>(null);
  const token = useRef(0);
  const timers = useRef<number[]>([]);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const palette = useMemo(() => paletteOf(level, level.solution), [level]);
  const target = useMemo(() => (level.sim === "turtle" ? drawTarget(level.draw ?? []) : []), [level]);
  const isSeq = level.sim === "dance" || level.sim === "music";
  // The route the program will sail, drawn on the map while it's being built: the whole way
  // ("full"), just the newest block's moves ("last"), or — later on — only when Peek is pressed.
  const route = useMemo(() => {
    const pv = peek ? "full" : level.preview;
    if ((level.sim !== "sea" && level.sim !== "rover") || !pv || !prog.length || phase === "run" || phase === "demo" || phase === "won") return null;
    const map = level.maps?.[0];
    const res = map ? runLevel(level, prog).results[0] : null;
    if (!map || !res) return null;
    const acts = res.steps.filter((st) => st.event !== "yes" && st.event !== "no");
    const states = [gridEngine(map, level.facing ?? "right").init, ...acts.map((st) => st.state as GridState)];
    let from = 0;
    if (pv === "last") {
      const top = prog.length - 1;
      const k = acts.findIndex((st) => st.at[0] === top);
      from = k < 0 ? states.length - 1 : k;
    }
    const end = states[states.length - 1];
    return { map: 0, cells: states.slice(from).map((st) => [st.x, st.y] as [number, number]), end, bump: res.fail?.reason === "rock" || res.fail?.reason === "edge" };
  }, [peek, level, prog, phase]);

  const goal = level.goal || (level.buggy ? SAY.codeBug : "");
  const parts: Part[] = [goal || SAY.codeTap];
  usePrompt(fx, parts, fx.voice === "keys" ? -1 : 420);

  const clearTimers = () => {
    token.current++;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => () => clearTimers(), []);
  const later = (fn: () => void, ms: number) => {
    const my = token.current;
    timers.current.push(window.setTimeout(() => my === token.current && fn(), ms));
  };

  // Dance + music: watch/listen to the target first.
  const demoTarget = () => {
    clearTimers();
    const t = level.target ?? [];
    setPhase("demo");
    setViews(initViews(level));
    t.forEach((m, i) =>
      later(() => {
        if (level.sim === "music") note(m);
        else sfx("whoosh");
        setViews((v) => ({ seq: { ...v.seq!, demo: true, demoIndex: i, current: m, key: (v.seq?.key ?? 0) + 1 } }));
      }, 700 + i * 680),
    );
    later(() => {
      setViews(initViews(level));
      setPhase("edit");
    }, 700 + t.length * 680 + 500);
  };
  useEffect(() => {
    if (isSeq && !level.buggy) {
      const t = window.setTimeout(() => {
        void say(level.sim === "music" ? SAY.listenFirst : SAY.watchFirst);
        demoTarget();
      }, fx.voice === "keys" ? 300 : 2300);
      return () => window.clearTimeout(t);
    }
    // Plays once when the puzzle opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Editing ──
  const editing = phase === "edit" || phase === "failed" || phase === "won";
  const touch = () => {
    if (phase === "failed") {
      setPhase("edit");
      setViews(initViews(level));
      setActive(null);
    }
  };
  /** Read a block's code word aloud as it goes in, so the words stick. */
  const sayWord = (b: Block) => {
    if (band === "big" || mode === "code") return;
    void say([blockWord(b.op, b)]);
  };
  const add = (make: () => Block) => {
    if (!editing || phase === "won") return;
    touch();
    const b = make();
    sfx("snap");
    sayWord(b);
    if (b.op === "def") {
      // Functions live at the top, before the program that uses them.
      setProg((p) => [b, ...p]);
      setCursor({ list: [0, "b"], index: 0 });
      return;
    }
    setProg((p) => insertAt(p, cursor, b));
    setCursor(isContainer(b.op) ? { list: [...cursor.list, cursor.index, "b"], index: 0 } : { list: cursor.list, index: cursor.index + 1 });
    setSel(null);
    setGhostOp(null);
    setBad(null);
  };
  const dropAt = (src: DragSrc, at: DropAt) => {
    if (!editing || phase === "won" || !at) return;
    touch();
    if (at === "trash") {
      if (src.kind === "prog") del(src.list, src.index);
      return;
    }
    if (src.kind === "palette") {
      const b = src.make();
      if (b.op === "def") return add(src.make);
      sfx("snap");
      sayWord(b);
      setProg((p) => insertAt(p, at, b));
      setCursor(isContainer(b.op) ? { list: [...at.list, at.index, "b"], index: 0 } : { list: at.list, index: at.index + 1 });
    } else {
      // Moving a block (with everything inside it) — never into itself.
      if (insideOf(at.list, src)) return;
      sfx("snap");
      let to = at;
      // Taking the block out first shifts what came after it in the same list.
      const list = to.list.map((v, k) => (k % 2 === 0 && typeof v === "number" && sameList(to.list.slice(0, k), src.list) && v > src.index ? v - 1 : v));
      to = { list, index: sameList(list, src.list) && to.index > src.index ? to.index - 1 : to.index };
      setProg((p) => insertAt(removeAt(p, src.list, src.index), to, src.block));
      setCursor({ list: to.list, index: to.index + 1 });
    }
    setSel(null);
    setGhostOp(null);
    setBad(null);
  };
  const back = () => {
    if (!editing || phase === "won") return;
    touch();
    sfx("tap");
    if (cursor.index > 0) {
      setProg((p) => removeAt(p, cursor.list, cursor.index - 1));
      setCursor({ list: cursor.list, index: cursor.index - 1 });
    } else if (cursor.list.length) {
      // At the start of a container: step out (and remove it if it's empty).
      const parent = cursor.list.slice(0, -2);
      const idx = cursor.list[cursor.list.length - 2] as number;
      const b = blockAt(prog, parent, idx);
      if (b && !(b.body?.length || b.else?.length)) {
        setProg((p) => removeAt(p, parent, idx));
        setCursor({ list: parent, index: idx });
      } else setCursor({ list: parent, index: idx + 1 });
    }
  };
  const clearAll = () => {
    if (!editing) return;
    touch();
    sfx("whoosh");
    const start = level.buggy ? JSON.parse(JSON.stringify(level.buggy)) : [];
    setProg(start);
    setCursor({ list: [], index: start.length });
    setSel(null);
    setBad(null);
    setPhase("edit");
    setViews(initViews(level));
    setActive(null);
  };
  const del = (list: ListPath, index: number) => {
    touch();
    sfx("tap");
    setProg((p) => removeAt(p, list, index));
    setSel(null);
    // Keep the cursor valid: put it where the block was.
    setCursor({ list, index: Math.min(index, listAt(removeAt(prog, list, index), list).length) });
  };
  const count = (list: ListPath, index: number, delta: number) => {
    touch();
    const b = blockAt(prog, list, index);
    if (!b) return;
    const n = ((((b.n ?? 2) - 2 + delta) % 9) + 9) % 9 + 2; // 2…10, wraps
    sfx("count", n);
    setProg((p) => updateAt(p, list, index, { n }));
  };
  const cond = (list: ListPath, index: number) => {
    touch();
    const b = blockAt(prog, list, index);
    if (!b) return;
    const opts = condsOf(level.solution, b.op === "until" ? "until" : "if");
    const next = opts[(opts.indexOf(b.cond ?? "") + 1) % opts.length];
    sfx("pick");
    setProg((p) => updateAt(p, list, index, { cond: next }));
  };

  const { drag, bind } = useBlockDrag({
    disabled: !editing || phase === "won",
    zone: zoneRef,
    onLift: () => sfx("lift"),
    onTap: (src) => {
      if (src.kind === "palette") return add(src.make);
      touch();
      sfx("tap");
      setSel((cur) => (cur && sameList(cur.list, src.list) && cur.index === src.index ? null : { list: src.list, index: src.index }));
    },
    onDrop: dropAt,
  });

  // ── Running ──
  const stepMs = (kind: "act" | "check") => {
    const base = band === "little" ? 460 : band === "middle" ? 360 : 280;
    return (kind === "check" ? base * 0.55 : base) * (fast ? 0.45 : 1);
  };

  const play = (program: Block[], demo: boolean) => {
    clearTimers();
    setSel(null);
    setMsg(null);
    setViews(initViews(level));
    setActive(null);
    setPhase(demo ? "demo" : "run");
    sfx("whoosh");
    const { results, won } = runLevel(level, program);
    runStats.current = recapOf(results, program);
    setRecap(null);
    setHud(null);
    setLoops([]);
    const totalSteps = results.reduce((n, r) => n + r.steps.length, 0);
    const scale = Math.min(1, 26000 / Math.max(1, totalSteps * stepMs("act")));
    let t = 350;
    let angleSea = initViews(level).sea?.angles ?? [];
    let angleTurtle = -90;
    results.forEach((res, m) => {
      if (m > 0) {
        later(() => setViews((v) => (v.sea ? { sea: { ...v.sea, active: m, bump: null, sensor: null } } : v)), t);
        t += 500;
      }
      // The moment it arrives with blocks still to go: point it out as it happens.
      const over = !demo && (level.sim === "sea" || level.sim === "rover") ? overshootOf(res, level.maps?.[m] ?? [], level.facing ?? "right") : null;
      const arriveAt = over ? over.arrive : -1;
      res.steps.forEach((st, si) => {
        const check = st.event === "yes" || st.event === "no";
        const prev = si > 0 ? res.steps[si - 1].state : null;
        // Precompute display angles so turns always take the short way.
        if (level.sim === "sea" || level.sim === "rover") {
          const gs = st.state as GridState;
          angleSea = angleSea.map((a, i) => (i === m ? shortest(a, DEG[gs.facing]) : a));
        }
        if (level.sim === "turtle") angleTurtle = shortest(angleTurtle, (st.state as TurtleState).deg);
        const seaAngles = angleSea;
        const tAngle = angleTurtle;
        later(() => showStep(program, st, m, check, prev, seaAngles, tAngle, si), t);
        if (si === arriveAt)
          later(() => {
            setMsg({ text: "🏝️ It made it… but there are more blocks!", tone: "tip", k: si });
            if (band !== "big") void say(SAY.stillGoing);
          }, t);
        t += stepMs(check ? "check" : "act") * scale;
      });
      if (!res.won) {
        later(() => (demo ? endDemo() : fail(res, m)), t + 250);
        t = Infinity;
      }
    });
    if (t !== Infinity) later(() => (demo ? endDemo() : won ? win(program) : fail(results[results.length - 1], results.length - 1)), t + 200);
  };

  const showStep = (program: Block[], st: Step<unknown>, m: number, check: boolean, prev: unknown, seaAngles: number[], tAngle: number, si: number) => {
    const tgt = stepTarget(program, st.at);
    setActive(tgt ? { ...tgt, answer: check ? (st.event as "yes" | "no") : undefined } : null);
    // Which loop passes are running (badges on the loops), and the step line under the world.
    const passes = (st.iters ?? []).flatMap((it) => {
      const lt = stepTarget(program, it.at);
      const lb = lt ? blockAt(program, lt.list, lt.index) : null;
      return lt && lb && (lb.op === "repeat" || lb.op === "until") ? [{ ...lt, k: it.k, n: it.n }] : [];
    });
    setLoops(passes);
    const blk = tgt ? blockAt(program, tgt.list, tgt.index) : undefined;
    const inner = passes[passes.length - 1];
    const cl = check && blk?.cond ? COND_LABEL[blk.cond] : undefined;
    setHud({ n: si + 1, op: blk?.op ?? "", block: blk, check: cl ? { icon: cl.icon, word: cl.word, yes: st.event === "yes" } : undefined, pass: inner ? { k: inner.k, n: inner.n } : undefined });
    const ev = st.event;
    if (check) sfx("beep");
    else if (ev === "move") sfx("move");
    else if (ev === "turn") sfx("turn");
    else if (ev === "shell") sfx("shell");
    else if (ev === "key") sfx("coin");
    else if (ev === "unlock") sfx("unlock");
    else if (ev === "button") sfx("snap");
    else if (ev === "warp") sfx("whoosh");
    else if (ev === "drift") sfx("splash");
    else if (ev === "catch") sfx("fish");
    else if (ev === "wait") sfx("tick");
    else if (ev === "shark") sfx("hit");
    else if (ev === "bump") sfx(level.sim === "sea" ? "splash" : "bump");
    else if (ev === "draw") sfx("draw");
    else if (ev === "paint") sfx("paint");
    else if (ev === "color" || ev === "pen") sfx("pick");
    else if (level.sim === "music") note(ev);
    else if (level.sim === "dance") sfx("whoosh");
    setViews((v) => {
      if (v.sea) {
        const gs = st.state as GridState;
        const states = v.sea.states.map((s, i) => (i === m ? gs : s));
        const trails = v.sea.trails.map((tr, i) => (i === m ? [...tr, `${gs.x},${gs.y}`] : tr));
        let sensor = v.sea.sensor;
        if (check) {
          const b = tgt ? blockAt(program, tgt.list, tgt.index) : null;
          const c = b?.cond ?? "";
          if (c === "blocked" || c === "clear" || c === "blockedLeft" || c === "blockedRight") {
            const dir = c === "blockedLeft" ? LEFT_OF[gs.facing] : c === "blockedRight" ? RIGHT_OF[gs.facing] : gs.facing;
            const yes = ev === "yes";
            sensor = { map: m, dir, blocked: c === "clear" ? !yes : yes, k: Date.now() };
          }
        }
        const bump = ev === "bump" ? { map: m, x: gs.x + (gs.facing === "right" ? 0.5 : gs.facing === "left" ? -0.5 : 0), y: gs.y + (gs.facing === "down" ? 0.5 : gs.facing === "up" ? -0.5 : 0), k: Date.now() } : ev === "shark" ? { map: m, x: gs.x, y: gs.y, k: Date.now() } : v.sea.bump;
        return { sea: { ...v.sea, states, trails, angles: seaAngles, sensor, bump, active: m } };
      }
      if (v.seq) {
        const done = (st.state as { done: string[] }).done;
        return { seq: { ...v.seq, done, current: ev, key: v.seq.key + 1, demo: false } };
      }
      if (v.turtle) return { turtle: { ...v.turtle, state: st.state as TurtleState, angle: tAngle } };
      if (v.pixel) return { pixel: { ...v.pixel, state: st.state as PixelState, key: v.pixel.key + 1 } };
      return v;
    });
    void prev;
  };

  const endDemo = () => {
    setActive(null);
    setHud(null);
    setLoops([]);
    setPhase("edit");
    setViews(initViews(level));
    setShowSolution(true);
    void say(SAY.tryTogether);
    setMsg({ text: "Now you try it! The answer is under your program.", tone: "tip", k: Date.now() });
  };

  const win = (program: Block[]) => {
    setPhase("won");
    setActive(null);
    setHud(null);
    setLoops([]);
    setViews((v) => (v.sea ? { sea: { ...v.sea, won: true } } : v.seq ? { seq: { ...v.seq, won: true } } : v.turtle ? { turtle: { ...v.turtle, won: true } } : v.pixel ? { pixel: { ...v.pixel, won: true } } : v));
    sfx("dock");
    const extra = level.buggy ? SAY.bugFixed : SAY.codeWin;
    fx.right(stageRef.current, [extra]);
    const n = blockCount(program);
    if (band !== "little" && n > level.best) setMsg({ text: `It works! Can you do it in ${level.best} blocks? (You used ${n}.)`, tone: "good", k: Date.now() });
    else setMsg({ text: level.buggy ? "Bug squashed! 🐞" : "It worked! 🎉", tone: "good", k: Date.now() });
    // What the program actually did — the "aha" of loops, checks and functions.
    const rc = runStats.current;
    if (rc) {
      setRecap(rc);
      if (fx.voice === "all") window.setTimeout(() => void say(rc.line), 1500);
    }
    window.setTimeout(() => onDone(fails), rc && rc.kind !== "steps" ? 3600 : 2600);
  };

  const fail = (res: RunResult<unknown>, m: number) => {
    setPhase("failed");
    setActive(null);
    setHud(null);
    setLoops([]);
    const n = fails + 1;
    setFails(n);
    const sig = JSON.stringify(prog);
    if (sig !== lastTried.current) {
      lastTried.current = sig;
      setAttempts((a) => a + 1);
    }
    fx.miss();
    let line: string = SAY.notThere;
    const final = res.final;
    // Too many blocks: it got there, and then the program kept going. Say exactly that, and turn
    // every block after the arrival red.
    const over = level.sim === "sea" || level.sim === "rover" ? overshootOf(res, level.maps?.[m] ?? [], level.facing ?? "right") : null;
    const extraMoves = isSeq && res.fail?.reason === "extra" && prefixMatches((final as { done: string[] }).done, level.target ?? []);
    if (over || extraMoves) {
      const loop = over ? over.inLoop : !!res.steps[res.steps.length - 1]?.iters?.length;
      setBad({ list: [], from: over ? over.from : res.fail!.at[0] });
      setGhostOp(null);
      setCursor({ list: [], index: prog.length });
      if (isSeq) setViews((v) => (v.seq ? { seq: { ...v.seq, mismatch: null } } : v));
      const who = level.sim === "sea" ? "boat" : level.sim === "rover" ? "rover" : level.sim === "music" ? "song" : "robot";
      const extra = over ? over.extra : 1;
      line = loop ? SAY.overshootLoop : level.sim === "music" ? SAY.tooManyNotes : level.sim === "dance" ? SAY.tooManyMoves : level.sim === "sea" ? SAY.overshoot : SAY.overshootGoal;
      const place = level.sim === "sea" ? "the island" : "the flag";
      const text = loop
        ? `🔁 Your loop went around too many times! The ${who} ${over ? `reached ${place}` : "finished"} — then the loop kept going. Make its number smaller.`
        : over
          ? `⛵ The ${who} reached ${place} — then kept going! It does EVERY block you give it, even ${extra === 1 ? "the extra one" : `the ${extra} extra ones`}. Take away the red ${extra === 1 ? "block" : "blocks"}.`
          : `🔢 Too many! The ${who} does every block — the red ones are extra. Take them away.`;
      void say(line);
      setMsg({ text, tone: "bad", k: Date.now() });
      return;
    }
    if (level.sim === "sea" || level.sim === "rover") {
      const gs = final as GridState;
      const goal = (level.maps?.[m] ?? []).findIndex((r) => r.includes("G"));
      const atGoal = goal >= 0 && level.maps![m][goal].indexOf("G") === gs.x && goal === gs.y;
      const grid = parseGrid(level.maps?.[m] ?? []);
      if (res.fail?.reason === "rock") line = SAY.bumped;
      else if (res.fail?.reason === "edge") line = SAY.outOfBounds;
      else if (res.fail?.reason === "locked") line = SAY.lockedGate;
      else if (res.fail?.reason === "bridge") line = SAY.bridgeUp;
      else if (res.fail?.reason === "shark") line = SAY.sharkGotYou;
      else if (res.fail?.reason === "nofish") line = SAY.noFish;
      else if (atGoal) line = (gs.caught?.length ?? 0) < grid.fish.size ? SAY.missedFish : SAY.missedShells;
      else if (res.overflow) line = "Your program never stopped! Check your loop.";
      if ((level.maps?.length ?? 0) > 1) line = `${line} (map ${m + 1})`;
    } else if (isSeq) {
      const done = (final as { done: string[] }).done;
      const t = level.target ?? [];
      let k = 0;
      while (k < done.length && k < t.length && done[k] === t[k]) k++;
      setViews((v) => (v.seq ? { seq: { ...v.seq, mismatch: k < t.length ? k : null } } : v));
      line = level.sim === "music" ? SAY.songWrong : SAY.danceWrong;
    } else if (level.sim === "turtle") {
      const ts = final as TurtleState;
      const extra = ts.segs.filter((g) => !target.some((t) => sameSeg(t, g)));
      const missing = target.filter((t) => !ts.segs.some((g) => sameSeg(t, g)));
      setViews((v) => (v.turtle ? { turtle: { ...v.turtle, extra, missing } } : v));
      line = res.fail?.reason === "edge" ? SAY.outOfBounds : SAY.drawWrong;
    } else if (level.sim === "pixel") {
      const ps = final as PixelState;
      const wrong: [number, number][] = [];
      (level.picture ?? []).forEach((row, y) => [...row].forEach((c, x) => (ps.grid[y]?.[x] ?? ".") !== c && wrong.push([x, y])));
      setViews((v) => (v.pixel ? { pixel: { ...v.pixel, wrong } } : v));
      line = SAY.pixelWrong;
    }
    void say(line);
    // Climbing hints.
    if (n === 1 && level.hint) {
      setMsg({ text: `💡 ${level.hint}`, tone: "tip", k: Date.now() });
      if (fx.voice !== "keys") window.setTimeout(() => void say([SAY.hint, { gap: 150 }, level.hint!]), 1900);
    } else if (n >= 2) {
      const h = nextHint(prog, level.solution);
      setGhostOp(h ? h.block.op : null);
      // Where the program first goes wrong (top level; functions sit apart at the top).
      let wrongAt = -1;
      if (h) {
        let seen = 0;
        prog.forEach((b, i) => {
          if (b.op === "def" || wrongAt >= 0) return;
          if (seen === h.index) wrongAt = i;
          seen++;
        });
      }
      setBad(wrongAt >= 0 ? { list: [], from: wrongAt } : null);
      if (wrongAt >= 0) setCursor({ list: [], index: prog.length });
      setMsg({
        text: !h ? `💡 ${level.hint ?? "Look closely at each step."}` : wrongAt >= 0 ? "💡 The red blocks aren't right yet. Take them away, then try the glowing block." : `💡 ${SAY.tryThisBlock} (it's glowing)`,
        tone: "tip",
        k: Date.now(),
      });
      if (h) window.setTimeout(() => void say(SAY.tryThisBlock), 1900);
    } else setMsg({ text: line, tone: "bad", k: Date.now() });
  };

  const doPeek = () => {
    sfx("pick");
    setPeek(true);
    if (peekTimer.current) window.clearTimeout(peekTimer.current);
    peekTimer.current = window.setTimeout(() => setPeek(false), 3800);
  };

  const stop = () => {
    clearTimers();
    setPhase("edit");
    setActive(null);
    setHud(null);
    setLoops([]);
    setViews(initViews(level));
  };

  // ── Layout ──
  const v = views;
  const stage =
    level.sim === "sea" || level.sim === "rover" ? (
      <SeaStage maps={level.maps ?? []} view={v.sea!} look={look} mars={level.sim === "rover"} route={route} />
    ) : level.sim === "dance" ? (
      <DanceStage target={level.target ?? []} view={v.seq!} pet={level.performer === "pet" ? look.pet ?? "pet-parrot" : null} />
    ) : level.sim === "music" ? (
      <MusicStage target={level.target ?? []} view={v.seq!} />
    ) : level.sim === "turtle" ? (
      <TurtleStage target={target} view={v.turtle!} />
    ) : (
      <PixelStage picture={level.picture ?? []} view={v.pixel!} />
    );
  const n = blockCount(prog);
  const calls = prog.filter((b) => b.op === "def" && b.name).map((b) => b.name!);
  const running = phase === "run" || phase === "demo";
  const text = showCode && mode !== "code" ? (lang === "py" ? toPython(prog) : toText(prog)) : [];

  return (
    <div className="flex h-full w-full flex-col gap-4 lg:flex-row lg:items-stretch">
      {/* World */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center gap-3">
        <PromptRow parts={parts}>{goal || "Build a program!"}</PromptRow>
        <div ref={stageRef} className="relative flex min-h-[300px] w-full flex-1 items-center justify-center">
          {stage}
          {phase === "demo" && <span className="l-pop-in pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--l-violet)] px-5 py-2 font-display text-xl font-extrabold text-white shadow-[0_5px_0_var(--l-violet-edge)]"><Glyph e="👀" size="1.25em" className="mx-[0.1em] inline-block align-[-0.28em]" /> Watch!</span>}
        </div>
        {running && hud && <StepHud hud={hud} band={band} />}
        {recap && phase === "won" && <RecapCard recap={recap} band={band} />}
        {msg && (
          <p key={msg.k} className={cn("l-pop-in max-w-[640px] rounded-[20px] px-5 py-3 text-center font-display text-xl font-bold", msg.tone === "good" ? "bg-[#dcfce7] text-[#166534]" : msg.tone === "bad" ? "bg-white text-[var(--l-coral-edge)]" : "bg-[#fff7d6] text-[#7a5200]")}>
            <WithGlyphs text={msg.text} />
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          {isSeq && (
            <Chunk tone="ghost" disabled={running} onClick={() => (sfx("tap"), demoTarget())} className="flex h-12 items-center gap-2 px-4 font-display text-lg font-extrabold">
              <Eye className="h-5 w-5" strokeWidth={2.8} /> {level.sim === "music" ? "Listen again" : "Watch again"}
            </Chunk>
          )}
          {!level.preview && (level.sim === "sea" || level.sim === "rover") && attempts >= 2 && phase !== "won" && !running && prog.length > 0 && (
            <Chunk tone="white" onClick={doPeek} className={cn("flex h-12 items-center gap-2 px-4 font-display text-lg font-extrabold text-[var(--l-ink)]", peek && "outline outline-[4px] outline-[var(--l-gold)]")}>
              <ScanEye className="h-5 w-5" strokeWidth={2.6} /> Peek at my path
            </Chunk>
          )}
          {attempts >= 3 && !showSolution && phase !== "won" && (
            <Chunk tone="gold" disabled={running} onClick={() => (sfx("pick"), void say(SAY.showMe), play(level.solution, true))} className="l-pulse flex h-12 items-center gap-2 px-5 font-display text-lg font-extrabold">
              <Lightbulb className="h-5 w-5" strokeWidth={2.8} /> Show me
            </Chunk>
          )}
        </div>
      </div>

      {/* Program */}
      <div className="flex min-h-[330px] w-full flex-col gap-3 rounded-[28px] bg-white/92 p-3 shadow-[0_8px_0_rgba(0,40,80,0.18)] lg:w-[46%] lg:min-w-[420px]">
        <div className="flex items-center gap-2 px-1">
          <span className="font-display text-lg font-extrabold text-[var(--l-ink)]"><WithGlyphs text={level.buggy ? "🐞 Fix this program" : mode === "code" ? "Your code" : "Your program"} /></span>
          {band !== "little" && (
            <span className={cn("rounded-full px-2.5 py-0.5 font-display text-sm font-extrabold", n <= level.best ? "bg-[#dcfce7] text-[#166534]" : "bg-[var(--l-card-2)] text-[var(--l-ink-2)]")}>
              {n} block{n === 1 ? "" : "s"} · <Glyph e="⭐" size="1.25em" className="mx-[0.1em] inline-block align-[-0.28em]" /> {level.best}
            </span>
          )}
          <span className="ml-auto flex items-center gap-1.5">
            {band !== "little" && mode !== "code" && (
              <button type="button" onClick={() => (sfx("tap"), setShowCode((s) => !s))} className={cn("flex h-10 items-center gap-1 rounded-xl px-2.5 font-display text-sm font-extrabold", showCode ? "bg-[var(--l-ink)] text-white" : "bg-[var(--l-card-2)] text-[var(--l-ink-2)]")} aria-label="Show the code">
                <Code2 className="h-4 w-4" strokeWidth={2.8} /> Code
              </button>
            )}
            <button type="button" onClick={() => (sfx("tap"), setFast((f) => !f))} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--l-card-2)] text-[var(--l-ink-2)]" aria-label={fast ? "Run slower" : "Run faster"}>
              {fast ? <Rabbit className="h-5 w-5" /> : <TurtleIcon className="h-5 w-5" />}
            </button>
          </span>
        </div>

        <div className={cn("grid min-h-0 flex-1 gap-3", showCode && text.length ? "grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]" : "grid-cols-1")}>
          <div ref={zoneRef} className={cn("min-h-[150px] overflow-y-auto overflow-x-hidden rounded-2xl p-2", mode === "code" ? "bg-[#0f172a]" : "bg-[var(--l-card-2)]")}>
            {prog.length === 0 && cursor.list.length === 0 && (
              <p className={cn("px-2 pb-1 pt-2 font-display text-base font-bold", mode === "code" ? "text-[#94a3b8]" : "text-[var(--l-ink-2)]")}>
                <WithGlyphs text={band === "little" ? "Tap a block — or drag it up here 👇" : mode === "code" ? "Tap or drag code lines below to write your program." : "Tap blocks below — or drag them into your program."} />
              </p>
            )}
            <Editor
              prog={prog}
              cursor={cursor}
              sel={sel}
              band={band}
              mode={mode}
              running={running}
              active={active}
              bad={bad}
              loops={loops}
              dragging={!!drag}
              over={drag?.over && drag.over !== "trash" ? drag.over : null}
              lifted={drag?.src.kind === "prog" ? { list: drag.src.list, index: drag.src.index } : null}
              grab={(list, index, block) => bind({ kind: "prog", list, index, block })}
              onCursor={(c) => (touch(), setCursor(c), setSel(null))}
              onDelete={del}
              onCount={count}
              onCond={cond}
            />
          </div>
          {showCode && text.length > 0 && (
            <div className="flex min-h-[150px] min-w-0 flex-col overflow-hidden rounded-2xl bg-[#0f172a]">
              {/* The same blocks in two real languages. */}
              <div className="flex gap-1 bg-[#1e293b] p-1.5">
                {(["py", "js"] as const).map((l) => (
                  <button key={l} type="button" onClick={() => (sfx("tap"), setLang(l))} className={cn("rounded-lg px-2.5 py-1 font-mono text-xs font-bold", lang === l ? "bg-[#334155] text-white" : "text-[#94a3b8]")}>
                    {l === "py" ? "Python" : "JavaScript"}
                  </button>
                ))}
              </div>
              <pre className="flex-1 overflow-auto p-3 font-mono text-[15px] leading-relaxed text-[#e2e8f0]">
                {text.map((ln, i) => (
                  <div key={i} className="whitespace-pre">
                    {colorize(ln)}
                  </div>
                ))}
              </pre>
            </div>
          )}
        </div>

        {showSolution && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border-2 border-dashed border-[var(--l-gold)] bg-[#fff7d6] p-2">
            <span className="font-display text-sm font-extrabold text-[#7a5200]">Answer:</span>
            {flat(level.solution).map((op, i) => (
              <BlockPill key={i} op={op} band={band} size="sm" />
            ))}
          </div>
        )}

        {/* Palette: tap a block to add it at the glowing slot, or drag it anywhere in the program. */}
        <div className="relative flex flex-wrap gap-2">
          {palette.map((p) => (
            <span
              key={p.op}
              role="button"
              tabIndex={0}
              {...bind({ kind: "palette", op: p.op, block: p.make(), make: p.make })}
              onKeyDown={(e) => e.key === "Enter" && add(p.make)}
              className={cn("touch-none cursor-grab rounded-2xl transition-transform active:translate-y-1", ghostOp === p.op && "l-hint", (!editing || phase === "won") && "opacity-50")}
              aria-label={`Add ${blockWord(p.op)}`}
            >
              <BlockPill op={p.op} block={p.make()} band={band} mode={mode} size={band === "little" ? "lg" : "md"} />
            </span>
          ))}
          {calls.map((name) => (
            <span
              key={`call-${name}`}
              role="button"
              tabIndex={0}
              {...bind({ kind: "palette", op: "call", block: { op: "call", name }, make: () => ({ op: "call", name }) })}
              className="touch-none cursor-grab rounded-2xl active:translate-y-1"
              aria-label={`Use ${name}`}
            >
              <BlockPill op="call" block={{ op: "call", name }} band={band} mode={mode} size={band === "little" ? "lg" : "md"} />
            </span>
          ))}
          {drag?.src.kind === "prog" && (
            <div data-trash className={cn("absolute inset-0 flex items-center justify-center gap-2 rounded-2xl border-[4px] border-dashed font-display text-xl font-extrabold transition-colors", drag.over === "trash" ? "border-[var(--l-coral)] bg-[var(--l-coral)] text-white" : "border-[var(--l-coral)] bg-[#fff1f0] text-[var(--l-coral-edge)]")}>
              <Trash2 className="h-6 w-6" strokeWidth={2.6} /> Drop here to take it out
            </div>
          )}
        </div>
        {/* The block in your finger while dragging. */}
        {drag && (
          <div className="pointer-events-none fixed z-[80]" style={{ left: drag.x, top: drag.y, transform: "translate(-50%, -70%) scale(1.08) rotate(-3deg)" }}>
            <BlockPill op={drag.src.block.op} block={drag.src.block} band={band} mode={mode} className="shadow-[0_12px_24px_rgba(0,30,60,0.35)]" />
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Chunk tone="white" disabled={running || phase === "won"} onClick={back} className="flex h-16 w-16 items-center justify-center text-[var(--l-ink-2)]" aria-label="Remove the last block">
            <Delete className="h-7 w-7" strokeWidth={2.6} />
          </Chunk>
          <Chunk tone="white" disabled={running || phase === "won"} onClick={clearAll} className="flex h-16 w-16 items-center justify-center text-[var(--l-ink-2)]" aria-label={level.buggy ? "Start over" : "Clear the program"}>
            {level.buggy ? <RotateCcw className="h-7 w-7" strokeWidth={2.6} /> : <Trash2 className="h-7 w-7" strokeWidth={2.4} />}
          </Chunk>
          {running ? (
            <Chunk tone="coral" onClick={() => (sfx("tap"), stop())} className="flex h-16 flex-1 items-center justify-center gap-2 font-display text-2xl font-extrabold">
              <Square className="h-7 w-7 fill-current" /> Stop
            </Chunk>
          ) : (
            <Chunk tone="green" disabled={phase === "won" || prog.length === 0} onClick={() => play(prog, false)} className={cn("flex h-16 flex-1 items-center justify-center gap-2 font-display text-2xl font-extrabold", prog.length > 0 && phase === "edit" && "l-pulse")}>
              <Play className="h-8 w-8 fill-current" /> {phase === "failed" ? "Try again" : "Play"}
            </Chunk>
          )}
        </div>
      </div>
    </div>
  );
}

/** A program as a flat strip of block names (for the "Show me" answer strip). */
function flat(p: Block[]): string[] {
  const out: string[] = [];
  for (const b of p) {
    out.push(b.op);
    if (b.body) out.push(...flat(b.body));
    if (b.else) out.push(...flat(b.else));
  }
  return out;
}


// ── Teaching what happened ───────────────────────────────────────────────────────────────────
type Hud = { n: number; op: string; block?: Block; check?: { icon: string; word: string; yes: boolean }; pass?: { k: number; n?: number } };
type Recap = { kind: "steps" | "loop" | "check" | "func"; blocks: number; actions: number; passes: number; checks: number; calls: number; line: string; text: string };

/** Count what a run really did: actions, loop passes, decisions, function calls. */
function recapOf(results: RunResult<unknown>[], program: Block[]): Recap {
  const steps = results.flatMap((r) => r.steps);
  const actions = steps.filter((st) => st.event !== "yes" && st.event !== "no").length;
  const checks = steps.length - actions;
  const passSet = new Set<string>();
  steps.forEach((st) => st.iters?.forEach((it) => it.n && passSet.add(`${it.at.join(".")}:${it.k}`)));
  const calls = countCalls(program);
  const blocks = blockCount(program);
  const base = { blocks, actions, passes: passSet.size, checks, calls };
  if (program.some((b) => b.op === "def") && calls > 1) return { kind: "func", ...base, line: SAY.recapFunc, text: `🧩 Your function ran ${calls} times — one name, lots of steps!` };
  if (checks > 0) return { kind: "check", ...base, line: SAY.recapCheck, text: `🧠 Your program checked ${checks} times and decided what to do — all by itself!` };
  if (passSet.size > 1) return { kind: "loop", ...base, line: SAY.recapLoop, text: `🔁 ${blocks} blocks did ${actions} moves — the loop did the repeating!` };
  return { kind: "steps", ...base, line: SAY.recapSteps, text: `✅ ${actions} steps, one at a time, in order. That's a program!` };
}
function countCalls(p: Block[], mult = 1): number {
  return p.reduce((n, b) => {
    if (b.op === "call") return n + mult;
    if (b.op === "def") return n;
    if (b.op === "repeat") return n + countCalls(b.body ?? [], mult * (b.n ?? 2));
    return n + countCalls(b.body ?? [], mult) + countCalls(b.else ?? [], mult);
  }, 0);
}

function RecapCard({ recap, band }: { recap: Recap; band: Band }) {
  const chips: [string, number, string][] = [["👣", recap.actions, recap.actions === 1 ? "step" : "steps"]];
  if (recap.passes > 1) chips.push(["🔁", recap.passes, "loop passes"]);
  if (recap.checks > 0) chips.push(["❓", recap.checks, recap.checks === 1 ? "check" : "checks"]);
  if (recap.calls > 1) chips.push(["🧩", recap.calls, "function calls"]);
  chips.push(["🧱", recap.blocks, recap.blocks === 1 ? "block" : "blocks"]);
  return (
    <div className="l-card-in flex max-w-[680px] flex-col items-center gap-2 rounded-[22px] bg-white/95 px-5 py-3 shadow-[0_6px_0_rgba(0,40,80,0.16)]">
      <span className="font-display text-sm font-extrabold uppercase tracking-wide text-[var(--l-ink-2)]">What your program did</span>
      <div className="flex flex-wrap justify-center gap-2">
        {chips.map(([icon, n, label], i) => (
          <span key={label} className="l-pop-in flex items-center gap-1.5 rounded-full bg-[var(--l-card-2)] px-3 py-1 font-display text-lg font-extrabold text-[var(--l-ink)]" style={{ animationDelay: `${i * 110}ms` }}>
            <Glyph e={icon} size={26} /> {n} {band !== "little" && <span className="text-base font-bold text-[var(--l-ink-2)]">{label}</span>}
          </span>
        ))}
      </div>
      {band !== "little" && <p className="text-balance text-center font-display text-lg font-bold text-[var(--l-ink)]"><WithGlyphs text={recap.text} /></p>}
    </div>
  );
}

function StepHud({ hud, band }: { hud: Hud; band: Band }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 rounded-full bg-black/25 px-3 py-1.5 font-display font-extrabold text-white">
      <span className="rounded-full bg-white/20 px-3 py-0.5 text-base"><WithGlyphs text={band === "little" ? `👣 ${hud.n}` : `Step ${hud.n}`} /></span>
      {hud.check ? (
        <span key={hud.n} className={cn("l-pop-in flex items-center gap-1.5 rounded-full px-3 py-0.5 text-base", hud.check.yes ? "bg-[#16a34a]" : "bg-[#dc2626]")}>
          <GlyphRow s={hud.check.icon} size={22} /> {band !== "little" && `${hud.check.word}?`} {hud.check.yes ? "✓ yes" : "✗ no"}
        </span>
      ) : hud.op && hud.op !== "def" ? (
        <span key={hud.n} className="l-pop-in">
          <BlockPill op={hud.op} block={hud.block} band={band} size="sm" />
        </span>
      ) : null}
      {hud.pass && <span className="rounded-full bg-[#ff9149] px-3 py-0.5 text-base"><Glyph e="🔁" size="1.25em" className="mx-[0.1em] inline-block align-[-0.28em]" /> {hud.pass.n ? `${hud.pass.k} of ${hud.pass.n}` : `#${hud.pass.k}`}</span>}
    </div>
  );
}
