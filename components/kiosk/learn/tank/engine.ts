import type { EggTier } from "@/lib/learn/reef";
import { DECOR_BY_ID, type Decor, type FoodKind } from "@/lib/learn/aquarium";
import { sfx } from "@/lib/learn/sfx";
import { rgba } from "./color";
import { DECOR_ART, DECOR_FX, artImage, eggArt } from "./art";
import { TAU, clamp, heartPath, sparklePath } from "./draw/core";
import { creatureExtent, drawCreature, groundOf, restPose } from "./draw";
import { lookOf, type Look } from "./species";
import { SURFACE, drawAnemone, drawCaustics, drawPlant, drawRays, drawSurface, fogColor, makePlants, paintFar, paintGlass, paintReef, paintSand, paintWater, sandY, surfaceAt, themeOf, type Plant, type Ripple, type Theme } from "./scene";

// The living aquarium. A simulation steps every creature, food pellet and bubble each frame and
// paints the whole tank on one canvas:
//
//   swimmers wander, rest, dart, turn around (a squash that reads as a turn), climb and dive with
//   their bodies bending, follow a finger dragged on the glass, chase food, beg a little when
//   they're hungry and there's food, and drift down to sleep near the sand at night;
//   bottom-dwellers walk the sand (the octopus jets up into the water and floats back down);
//   surface creatures paddle along the top (the duck dabbles, the frog and otter dive).
//
// Food dropped with a tap floats a moment, then sinks; the nearest hungry creature races over
// and eats it (hearts, a gulp, "+growth"). Creatures that have had their treats for the day
// leave food alone, and the tank never takes more food than its creatures can eat.

const STAGE_SCALE = [0.85, 1, 1.15, 1.3];
const easeOutBack = (x: number) => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2);

export type TankCreature = { egg: string; id: string; stage: number; buddy: boolean; appetite: number };
export type TankEgg = { id: string; tier: EggTier };
export type TankInput = {
  creatures: TankCreature[];
  eggs: TankEgg[];
  decor: string[];
  trying: string | null;
  theme: string;
  holding: FoodKind | null;
  stock: Record<FoodKind, number>;
  night: boolean;
  reduced: boolean;
  paused: boolean;
};
export type TankEvents = {
  creature: (egg: string, x: number, y: number) => void;
  egg: (id: string) => void;
  decor: (id: string) => void;
  eat: (egg: string, food: FoodKind) => void;
  noFood: (food: FoodKind) => void;
  allFull: () => void;
  noFriends: () => void;
};

type Mode = "wander" | "rest" | "seek" | "curious" | "flee" | "beg" | "jump" | "sleep" | "dive" | "jet" | "peck" | "sip";

type Agent = {
  c: TankCreature;
  look: Look;
  x: number;
  y: number;
  vx: number;
  vy: number;
  z: number;
  zT: number;
  len: number;
  facing: number;
  dir: 1 | -1;
  turnHold: number;
  pitch: number;
  bend: number;
  phase: number;
  flap: number;
  walk: number;
  amp: number;
  mode: Mode;
  modeT: number;
  speedMul: number;
  tx: number;
  ty: number;
  blinkAt: number;
  blink: number;
  mouth: number;
  mouthT: number;
  react: number;
  puffT: number;
  puff: number;
  tuckT: number;
  tuck: number;
  clawT: number;
  claw: number;
  nodT: number;
  nod: number;
  roll: number;
  dabbleT: number;
  dabble: number;
  jet: number;
  spin: number;
  spinT: number;
  gazeX: number;
  gazeY: number;
  sleep: number;
  wakeT: number;
  spawn: number;
  breathAt: number;
  begAt: number;
  jumpAt: number;
  diveAt: number;
  air: boolean;
  /** Bottom-dwellers: height above the sand (the octopus's jet); surface: depth of a dive. */
  lift: number;
  appetite: number;
  hop: number;
  /** Nose-down tilt while pecking at the sand. */
  pitchBias: number;
  /** When a creature next does something on its own (a flap, a roll, a claw wave…). */
  idleAt: number;
  puffAt: number;
};

type Pellet = { id: number; kind: FoodKind; x: number; y: number; vy: number; float: number; rot: number; rest: boolean; life: number; gone: boolean };
type Particle = {
  kind: "bubble" | "heart" | "spark" | "ink" | "drop" | "ring" | "text" | "zzz" | "shock" | "sand";
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  text?: string;
  color?: string;
};
type Placed = { id: string; d: Decor; x: number; y: number; w: number; h: number; layer: "back" | "floor" | "float" | "surface"; proc?: "grass" | "flower" };

export class TankEngine {
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private t = 0;
  private last = 0;
  private raf = 0;
  private running = false;
  private input: TankInput | null = null;
  private theme: Theme = themeOf("reef");
  private agents: Agent[] = [];
  private pellets: Pellet[] = [];
  private parts: Particle[] = [];
  private ripples: Ripple[] = [];
  private plants: Plant[] = [];
  private placed: Placed[] = [];
  private motes: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = [];
  private bg: HTMLCanvasElement | null = null;
  private glassLayer: HTMLCanvasElement | null = null;
  private dirty = true;
  private pointer = { down: false, x: 0, y: 0, until: -1 };
  private nest = { x: 0, y: 0 };
  private eggHits: { id: string; x: number; y: number; r: number }[] = [];
  private font = "system-ui, sans-serif";
  private nextPellet = 1;
  private initial = true;
  private crowd = 1;
  private emitAt = new Map<string, number>();
  private bounce = new Map<string, number>();
  private airAt = 0;
  private pose = restPose();
  private decorKey = "";
  private frameAvg = 1 / 60;
  /** Lighter painting for slower tablets (1× resolution, fewer effects). */
  private lite = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private events: () => TankEvents,
  ) {
    this.ctx = canvas.getContext("2d")!;
    const fam = getComputedStyle(document.documentElement).getPropertyValue("--font-bricolage").trim();
    if (fam) this.font = `${fam}, system-ui, sans-serif`;
    document.addEventListener("visibilitychange", this.onVis);
  }

  destroy() {
    this.stop();
    document.removeEventListener("visibilitychange", this.onVis);
  }

  private onVis = () => {
    if (document.hidden) this.stop();
    else this.maybeStart();
  };

  // ── Setup ──────────────────────────────────────────────────────────────────────────────────

  resize(w: number, h: number) {
    if (w < 10 || h < 10 || (Math.abs(w - this.w) < 1 && Math.abs(h - this.h) < 1)) return;
    const wasEmpty = this.w === 0 && !this.agents.some((a) => a.x !== 0);
    let dpr = this.lite ? 1 : Math.min(2, window.devicePixelRatio || 1);
    if (w * h * dpr * dpr > 2_600_000) dpr = Math.sqrt(2_600_000 / (w * h));
    this.dpr = dpr;
    this.w = w;
    this.h = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.nest = { x: w * 0.1, y: sandY(w * 0.1, w, h) };
    this.motes = Array.from({ length: 34 }, () => ({ x: Math.random() * w, y: h * (0.12 + Math.random() * 0.75), vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 3, r: 0.6 + Math.random() * 1.6, a: 0.15 + Math.random() * 0.35 }));
    this.layout();
    this.dirty = true;
    for (const a of this.agents) {
      a.len = this.lenOf(a.look, a.c.stage);
      if (wasEmpty) this.place(a, false);
      else this.keepInside(a);
    }
    this.maybeStart();
    if (!this.running) this.draw();
  }

  setInput(input: TankInput) {
    const prev = this.input;
    this.input = input;
    if (!prev || prev.theme !== input.theme) {
      this.theme = themeOf(input.theme);
      this.dirty = true;
    }
    const key = `${input.decor.join(",")}|${input.trying ?? ""}`;
    if (key !== this.decorKey) {
      this.decorKey = key;
      this.layout();
      this.dirty = true;
    }
    // Creatures: keep the ones we have, add newly hatched ones at the nest, let go of the rest.
    const want = new Map(input.creatures.map((c) => [c.egg, c]));
    this.agents = this.agents.filter((a) => want.has(a.c.egg));
    const have = new Set(this.agents.map((a) => a.c.egg));
    const n = input.creatures.length;
    this.crowd = n > 10 ? Math.max(0.62, 1 - (n - 10) * 0.025) : 1;
    for (const c of input.creatures) {
      if (have.has(c.egg)) continue;
      this.agents.push(this.makeAgent(c, !this.initial));
    }
    for (const a of this.agents) {
      const c = want.get(a.c.egg)!;
      a.c = c;
      a.appetite = c.appetite;
      a.look = lookOf(c.id);
    }
    this.initial = false;
    if (input.paused) this.stop();
    else this.maybeStart();
    if (!this.running) this.draw();
  }

  private maybeStart() {
    if (this.running || !this.input || this.input.paused || document.hidden || this.w === 0) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private frame = (now: number) => {
    if (!this.running) return;
    const slow = this.input?.reduced ? 0.3 : 1;
    const real = Math.max(0, (now - this.last) / 1000);
    const dt = Math.min(0.05, real) * slow;
    this.last = now;
    // Slower tablets: if frames keep running long, paint at 1× resolution with lighter effects.
    if (real < 0.25) this.frameAvg += (real - this.frameAvg) * 0.05;
    if (!this.lite && this.frameAvg > 0.03 && this.t > 3) {
      this.lite = true;
      const { w, h } = this;
      this.w = 0;
      this.resize(w, h);
    }
    this.t += dt;
    this.step(dt);
    this.draw();
    this.raf = requestAnimationFrame(this.frame);
  };

  private lenOf(look: Look, stage: number) {
    return this.h * look.len * STAGE_SCALE[clamp(stage, 0, 3)] * this.crowd;
  }

  private makeAgent(c: TankCreature, entering: boolean): Agent {
    const look = lookOf(c.id);
    const a: Agent = {
      c,
      look,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      z: 0.3 + Math.random() * 0.7,
      zT: 0.5,
      len: this.lenOf(look, c.stage),
      facing: Math.random() < 0.5 ? -1 : 1,
      dir: 1,
      turnHold: 0,
      pitch: 0,
      bend: 0,
      phase: Math.random() * TAU,
      flap: Math.random() * TAU,
      walk: 0,
      amp: 0.5,
      mode: "wander",
      modeT: 0,
      speedMul: 1,
      tx: 0,
      ty: 0,
      blinkAt: this.t + 1 + Math.random() * 3,
      blink: 0,
      mouth: 0,
      mouthT: 0,
      react: 0,
      puffT: 0,
      puff: 0,
      tuckT: 0,
      tuck: 0,
      clawT: 0,
      claw: 0,
      nodT: 0,
      nod: 0,
      roll: look.plan === "otter" ? 1 : 0,
      dabbleT: 0,
      dabble: 0,
      jet: 0,
      spin: 0,
      spinT: 0,
      gazeX: 0,
      gazeY: 0,
      sleep: 0,
      wakeT: 0,
      spawn: entering ? 0 : 1,
      breathAt: this.t + 3 + Math.random() * 8,
      begAt: this.t + 15 + Math.random() * 25,
      jumpAt: this.t + 20 + Math.random() * 30,
      diveAt: this.t + 15 + Math.random() * 25,
      air: false,
      lift: 0,
      appetite: c.appetite,
      hop: 0,
      pitchBias: 0,
      idleAt: this.t + 12 + Math.random() * 20,
      puffAt: 0,
    };
    a.dir = a.facing < 0 ? -1 : 1;
    if (this.w) this.place(a, entering);
    return a;
  }

  /** Put a creature somewhere it belongs (or at the nest, if it just hatched). */
  private place(a: Agent, entering: boolean) {
    const { w, h } = this;
    a.x = entering ? this.nest.x : w * (0.12 + Math.random() * 0.76);
    if (a.look.habitat === "bottom") a.y = this.groundY(a);
    else if (a.look.habitat === "surface") a.y = this.surfaceY(a);
    else {
      const [d0, d1] = a.look.depth ?? [0.2, 0.8];
      const top = h * SURFACE;
      const bot = sandY(a.x, w, h);
      a.y = entering ? this.nest.y - a.len * 0.4 : top + (bot - top) * (d0 + Math.random() * (d1 - d0));
    }
    a.tx = a.x;
    a.ty = a.y;
    if (entering) this.burst(a.x, a.y, "spark", 12, "#fff6a8");
  }

  private groundY(a: Agent) {
    return sandY(a.x, this.w, this.h) - groundOf(a.look, a.len) + 2;
  }
  private surfaceY(a: Agent) {
    const base = surfaceAt(a.x, this.h, this.t);
    switch (a.look.plan) {
      case "bird":
        return base + a.len * 0.02;
      case "frog":
        return base + a.len * 0.1;
      case "otter":
        return base + a.len * 0.03;
      default:
        return base + a.len * 0.035;
    }
  }

  private keepInside(a: Agent) {
    const m = a.len * 0.4;
    a.x = clamp(a.x, m, this.w - m);
    if (a.look.habitat === "bottom") a.y = this.groundY(a) - a.lift;
    else if (a.look.habitat === "surface" && a.lift <= 0) a.y = this.surfaceY(a);
    else a.y = clamp(a.y, this.h * SURFACE + m * 0.5, sandY(a.x, this.w, this.h) - m * 0.5);
  }

  /** Where decorations, the anemone and sea grass go. */
  private layout() {
    if (!this.input || !this.w) return;
    const { w, h } = this;
    const ids = [...this.input.decor];
    if (this.input.trying && !ids.includes(this.input.trying)) ids.push(this.input.trying);
    const list = ids.map((id) => DECOR_BY_ID.get(id)).filter((d): d is Decor => !!d);
    /** Big and small mixed, then spread left to right with even gaps (they only overlap when
     *  there are more than fit). */
    const mixSizes = <T extends { h: number }>(items: T[]) => {
      const sorted = [...items].sort((a, b) => b.h - a.h);
      const out: T[] = [];
      while (sorted.length) {
        out.push(sorted.shift()!);
        if (sorted.length) out.push(sorted.pop()!);
      }
      return out;
    };
    const spread = (widths: number[], x0: number, x1: number) => {
      const total = widths.reduce((a, b) => a + b, 0);
      const span = x1 - x0;
      const fits = total < span;
      const gap = fits ? (span - total) / (widths.length + 1) : (span - total) / Math.max(1, widths.length - 1);
      let x = x0 + (fits ? gap : 0);
      return widths.map((wd) => {
        const c = x + wd / 2;
        x += wd + gap;
        return c;
      });
    };
    const out: Placed[] = [];
    const back = list.filter((d) => d.spot === "back" && d.id !== "palm");
    const floor = list.filter((d) => d.spot === "floor");
    const float = list.filter((d) => d.spot === "float");
    const SIZE: Record<string, number> = { castle: 0.3, ship: 0.27, volcano: 0.26, statue: 0.3, mermaid: 0.3, pineapple: 0.2, trident: 0.24, crystal: 0.15, chest: 0.13, anchor: 0.17, mushroom: 0.13, star: 0.07, rock: 0.11, shell: 0.11, balloon: 0.15, moon: 0.13, rainbow: 0.14, sparkles: 0.1, crown: 0.09 };
    const sized = (d: Decor, k = 1) => {
      if (d.id === "grass" || d.id === "flower") return { d, w: h * 0.13 * k, h: h * 0.16 * k };
      const art = DECOR_ART[d.id];
      const hh = h * (SIZE[d.id] ?? 0.12) * k;
      return { d, w: (hh * art.w) / art.h, h: hh };
    };
    // Back pieces shrink a little when there are lots of them.
    let backItems = back.map((d) => sized(d));
    const backSpan = w * 0.72;
    const backTotal = backItems.reduce((a, b) => a + b.w, 0);
    if (backTotal > backSpan * 1.25) backItems = back.map((d) => sized(d, Math.max(0.72, (backSpan * 1.25) / backTotal)));
    backItems = mixSizes(backItems);
    spread(backItems.map((b) => b.w * 0.85), w * 0.2, w * 0.92).forEach((x, i) => {
      const b = backItems[i];
      out.push({ id: b.d.id, d: b.d, x, y: sandY(x, w, h) + h * 0.03, w: b.w, h: b.h, layer: "back" });
    });
    const floorItems = mixSizes(floor.map((d) => sized(d)));
    spread(floorItems.map((f) => f.w), w * 0.22, w * 0.86).forEach((x, i) => {
      const f = floorItems[i];
      const proc = f.d.id === "grass" || f.d.id === "flower" ? (f.d.id as "grass" | "flower") : undefined;
      out.push({ id: f.d.id, d: f.d, x, y: sandY(x, w, h) + (proc ? 4 : h * 0.035), w: f.w, h: f.h, layer: "floor", proc });
    });
    const floatItems = float.map((d) => sized(d));
    spread(floatItems.map((f) => f.w * 1.4), w * 0.12, w * 0.88).forEach((x, i) => {
      const f = floatItems[i];
      out.push({ id: f.d.id, d: f.d, x, y: h * (0.32 + (i % 2) * 0.1), w: f.w, h: f.h, layer: "float" });
    });
    if (list.some((d) => d.id === "palm")) {
      // The island floats at the surface: its sand at the waterline, the palm up in the air.
      const art = DECOR_ART.palm;
      const hh = h * SURFACE * 1.25;
      out.push({ id: "palm", d: DECOR_BY_ID.get("palm")!, x: w * 0.74, y: h * SURFACE + hh * (52 / 170), w: (hh * art.w) / art.h, h: hh, layer: "surface" });
    }
    this.placed = out;
    this.plants = makePlants(w, h, this.theme, out.filter((p) => p.proc === "grass").map((p) => p.x));
  }

  // ── Input ──────────────────────────────────────────────────────────────────────────────────

  pointerDown(x: number, y: number) {
    if (!this.input) return;
    const hit = this.hitAgent(x, y);
    if (hit) {
      if (this.input.holding) this.drop(hit.x, this.input.holding);
      else {
        this.reactTo(hit, x);
        this.events().creature(hit.c.egg, hit.x, hit.y - creatureExtent(hit.look, hit.len)[1]);
      }
      return;
    }
    const egg = this.eggHits.find((e) => Math.hypot(e.x - x, e.y - y) < e.r);
    if (egg) {
      this.events().egg(egg.id);
      return;
    }
    if (this.input.holding) {
      this.drop(x, this.input.holding);
      return;
    }
    const dec = [...this.placed].reverse().find((p) => x > p.x - p.w / 2 && x < p.x + p.w / 2 && y > p.y - p.h && y < p.y);
    if (dec) {
      this.bounce.set(dec.id, this.t);
      const fx = DECOR_FX[dec.id];
      if (fx?.emit === "bubbles") this.emit(dec, 8);
      else this.burst(dec.x, dec.y - dec.h * 0.6 + this.bob(dec), "spark", 8, "#fff6c8");
      sfx(fx?.emit === "bubbles" ? "bubble" : "pop");
      this.events().decor(dec.id);
      return;
    }
    // A tap on the glass: a ripple, and curious creatures come to look.
    this.pointer = { down: true, x, y, until: this.t + 2.5 };
    this.parts.push({ kind: "ring", x, y, vx: 0, vy: 0, life: 0.7, max: 0.7, size: 10 });
    for (const a of this.agents) {
      if (a.look.habitat !== "swim" || Math.hypot(a.x - x, a.y - y) > Math.max(110, a.len * 0.9)) continue;
      const ang = Math.atan2(a.y - y, a.x - x);
      this.setMode(a, "flee", 0.45, a.x + Math.cos(ang) * a.len * 1.5, a.y + Math.sin(ang) * a.len);
    }
    sfx("bubble");
  }

  pointerMove(x: number, y: number) {
    if (!this.pointer.down) return;
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.until = this.t + 2;
  }

  pointerUp() {
    if (this.pointer.down) this.pointer.until = this.t + 1.5;
    this.pointer.down = false;
  }

  private hitAgent(x: number, y: number): Agent | null {
    const sorted = [...this.agents].sort((a, b) => b.z - a.z);
    for (const a of sorted) {
      const [ex, ey] = creatureExtent(a.look, a.len);
      const s = 0.8 + 0.2 * a.z;
      const rx = ex * s * Math.max(0.5, Math.abs(a.facing)) + 14;
      const ry = ey * s + 14;
      const cy = a.look.plan === "bird" ? a.y - a.len * 0.2 : a.y;
      const dx = (x - a.x) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) return a;
    }
    return null;
  }

  private drop(x: number, kind: FoodKind) {
    const input = this.input!;
    if (!this.agents.length) return this.events().noFriends();
    const inWater = this.pellets.filter((p) => !p.gone);
    const appetite = this.agents.reduce((s, a) => s + Math.max(0, a.appetite), 0);
    if (inWater.length >= appetite) return this.events().allFull();
    if (input.stock[kind] - inWater.filter((p) => p.kind === kind).length <= 0) return this.events().noFood(kind);
    const px = clamp(x, 20, this.w - 20);
    this.pellets.push({ id: this.nextPellet++, kind, x: px, y: this.h * SURFACE - 8, vy: 30, float: kind === "flakes" ? 2.4 : kind === "shrimp" ? 1.2 : 0.6, rot: Math.random() * TAU, rest: false, life: 30, gone: false });
    this.ripples.push({ x: px, r: 4, life: 1, big: false });
    sfx("plop");
  }

  private reactTo(a: Agent, x: number) {
    a.react = 1;
    a.wakeT = 8;
    a.sleep = 0;
    const away = Math.sign(a.x - x) || 1;
    switch (a.look.react) {
      case "dart":
        this.setMode(a, "flee", 1.1, a.x + away * this.w * 0.3, a.y + (Math.random() - 0.5) * this.h * 0.2);
        a.spinT = 0.6;
        break;
      case "puff":
        a.puffT = 3;
        sfx("pop");
        break;
      case "ink":
        for (let i = 0; i < 14; i++) this.parts.push({ kind: "ink", x: a.x + (Math.random() - 0.5) * a.len * 0.3, y: a.y + (Math.random() - 0.5) * a.len * 0.3, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30, life: 2.2, max: 2.2, size: a.len * (0.12 + Math.random() * 0.12) });
        if (a.look.plan === "octopus") {
          a.mode = "jet";
          a.modeT = 2.2;
          a.tx = clamp(a.x + away * this.w * 0.25, a.len, this.w - a.len);
        } else this.setMode(a, "flee", 1.2, a.x + away * this.w * 0.35, a.y);
        sfx("whoosh");
        break;
      case "tuck":
      case "hide":
        a.tuckT = 1.8;
        break;
      case "snap":
        a.clawT = 1.6;
        if (a.look.plan === "arthro") {
          this.parts.push({ kind: "shock", x: a.x + a.dir * a.len * 0.45, y: a.y, vx: 0, vy: 0, life: 0.5, max: 0.5, size: a.len * 0.2 });
          this.burst(a.x + a.dir * a.len * 0.45, a.y, "bubble", 6);
          sfx("snap");
        } else sfx("snap");
        break;
      case "flip":
        a.hop = 1;
        a.vx = -a.dir * a.len * 4;
        a.tuckT = 0;
        sfx("whoosh");
        break;
      case "jump":
        if (a.look.plan === "frog") {
          a.mode = "jump";
          a.vy = -this.h * 1.1;
          a.vx = a.dir * a.len * 2.5;
          a.air = true;
          this.splash(a.x, 6);
        } else this.setMode(a, "jump", 4, a.x + a.dir * this.w * 0.2, this.h * SURFACE - this.h * 0.25);
        break;
      case "spout":
        this.setMode(a, "jump", 5, a.x + a.dir * this.w * 0.15, this.h * SURFACE + a.len * 0.12);
        break;
      case "roll":
        if (a.look.plan === "otter") {
          a.diveAt = this.t;
          this.splash(a.x, 4);
        } else a.spinT = 0.9;
        break;
      case "flap":
        this.splash(a.x, 3);
        sfx("chirp");
        break;
      case "nod":
        a.nodT = 1.6;
        break;
      case "chomp":
        a.mouthT = 0.9;
        a.dir = x > a.x ? 1 : -1;
        sfx("snap");
        break;
      case "zoom":
        this.setMode(a, "flee", 1.4, a.x < this.w / 2 ? this.w * 0.9 : this.w * 0.1, a.y);
        break;
      case "shimmer":
        this.burst(a.x, a.y, "spark", 10, "#fff1a8");
        break;
    }
  }

  private idle(a: Agent) {
    const L = a.look;
    const { w, h } = this;
    switch (L.react) {
      case "flap":
        if (a.lift <= 0) {
          a.react = 1;
          this.ripples.push({ x: a.x, r: 5, life: 0.9, big: false });
        }
        break;
      case "snap":
        if (L.plan === "crab") a.clawT = 1.2;
        break;
      case "roll":
        if (L.plan !== "otter") a.spinT = 0.9;
        break;
      case "zoom":
        if (a.mode === "wander") this.setMode(a, "flee", 1.3, a.x < w / 2 ? w * 0.88 : w * 0.12, a.y);
        break;
      case "jump":
        if (L.plan === "frog" && a.lift <= 0 && !a.air) {
          a.mode = "jump";
          a.vy = -h * 1.05;
          a.vx = a.dir * a.len * 2.2;
          a.air = true;
          this.splash(a.x, 6);
        }
        break;
      case "shimmer":
        this.burst(a.x, a.y, "spark", 6, "#fff1a8");
        break;
    }
  }

  private setMode(a: Agent, m: Mode, time: number, tx: number, ty: number) {
    a.mode = m;
    a.modeT = time;
    a.tx = tx;
    a.ty = ty;
  }

  // ── Simulation ─────────────────────────────────────────────────────────────────────────────

  private step(dt: number) {
    const input = this.input;
    if (!input) return;
    for (const a of this.agents) this.stepAgent(a, dt, input);
    this.stepPellets(dt);
    this.stepParticles(dt);
    this.stepPlants(dt);
    // Ambient bubbles from the sand, and decorations that give off bubbles or sparkles.
    if (this.t > this.airAt) {
      this.airAt = this.t + 0.18 + Math.random() * 0.25;
      const x = this.w * 0.9 + (Math.random() - 0.5) * 6;
      this.parts.push({ kind: "bubble", x, y: sandY(x, this.w, this.h) - 2, vx: 0, vy: -(30 + Math.random() * 25), life: 9, max: 9, size: 1.5 + Math.random() * 2.5 });
    }
    for (const p of this.placed) {
      const fx = DECOR_FX[p.id];
      if (!fx?.emit) continue;
      const next = this.emitAt.get(p.id) ?? 0;
      if (this.t < next) continue;
      this.emitAt.set(p.id, this.t + (fx.emit === "sparkles" ? 0.5 + Math.random() * 0.6 : 2.5 + Math.random() * 3));
      this.emit(p, fx.emit === "sparkles" ? 1 : 3 + Math.floor(Math.random() * 3));
    }
    for (const m of this.motes) {
      m.x += m.vx * dt;
      m.y += m.vy * dt + Math.sin(this.t * 0.5 + m.r * 9) * dt * 2;
      if (m.x < 0) m.x += this.w;
      if (m.x > this.w) m.x -= this.w;
      if (m.y < this.h * 0.1) m.y = this.h * 0.85;
      if (m.y > this.h * 0.88) m.y = this.h * 0.12;
    }
    for (const r of this.ripples) {
      r.r += dt * (r.big ? 60 : 36);
      r.life -= dt * 0.9;
    }
    this.ripples = this.ripples.filter((r) => r.life > 0);
  }

  private stepAgent(a: Agent, dt: number, input: TankInput) {
    const L = a.look;
    a.len += (this.lenOf(L, a.c.stage) - a.len) * Math.min(1, dt * 1.5);
    a.spawn = Math.min(1, a.spawn + dt * 1.2);
    a.modeT -= dt;
    a.react = Math.max(0, a.react - dt / 1.3);
    a.wakeT = Math.max(0, a.wakeT - dt);
    a.puffT = Math.max(0, a.puffT - dt);
    a.puff += ((a.puffT > 0 ? 1 : 0) - a.puff) * Math.min(1, dt * (a.puffT > 0 ? 6 : 1.5));
    a.tuckT = Math.max(0, a.tuckT - dt);
    a.tuck += ((a.tuckT > 0 ? 1 : 0) - a.tuck) * Math.min(1, dt * 5);
    a.clawT = Math.max(0, a.clawT - dt);
    a.claw += ((a.clawT > 0 ? 1 : 0) - a.claw) * Math.min(1, dt * 6);
    a.nodT = Math.max(0, a.nodT - dt);
    a.nod = a.nodT > 0 ? Math.sin((1 - a.nodT / 1.6) * Math.PI) : 0;
    a.mouthT = Math.max(0, a.mouthT - dt);
    a.mouth = a.mouthT > 0 ? Math.abs(Math.sin(a.mouthT * 11)) : Math.max(0, a.mouth - dt * 4);
    if (a.spinT > 0) {
      a.spinT -= dt;
      a.spin = (1 - Math.max(0, a.spinT) / 0.9) * TAU * (a.look.react === "roll" ? 1 : 0);
      if (a.look.react === "dart" && a.spinT < 0.3 && a.spinT + dt >= 0.3) a.dir = a.dir === 1 ? -1 : 1;
    } else a.spin = 0;
    // Blinking (and sleepy eyes at night).
    if (this.t > a.blinkAt) a.blinkAt = this.t + 2.5 + Math.random() * 4;
    a.blink = a.blinkAt - this.t < 0.13 ? 1 : 0;
    const sleepy = input.night && a.wakeT <= 0;
    a.sleep += ((sleepy && (a.mode === "sleep" || a.mode === "rest") ? 1 : 0) - a.sleep) * Math.min(1, dt * 1.5);
    if (a.sleep > 0.8 && Math.random() < dt * 0.25) this.parts.push({ kind: "zzz", x: a.x + a.dir * a.len * 0.2, y: a.y - a.len * 0.2, vx: 6, vy: -14, life: 2, max: 2, size: 10 + Math.random() * 5 });

    const food = this.bestPellet(a);
    if (food && a.mode !== "flee" && a.mode !== "jet" && !(a.mode === "jump" && a.air)) {
      a.mode = "seek";
      a.modeT = 0.5;
      a.tx = food.x;
      a.ty = food.y;
    } else if (a.mode === "seek" && !food) {
      a.mode = "wander";
      a.modeT = 0;
    }
    const curious = (this.pointer.down || this.t < this.pointer.until) && !input.holding;
    // Little things they do on their own, now and then.
    if (this.t > a.idleAt && !input.night && a.spawn >= 1) {
      a.idleAt = this.t + 18 + Math.random() * 24;
      this.idle(a);
    }

    if (L.habitat === "bottom") this.stepBottom(a, dt, curious, sleepy);
    else if (L.habitat === "surface" && a.lift <= 0 && a.mode !== "jump") this.stepSurface(a, dt, curious, sleepy);
    else this.stepSwim(a, dt, curious, sleepy, input);

    // Eat if a pellet is right at the mouth.
    if (food && a.appetite > 0) {
      const [mx, my] = this.mouthOf(a);
      const reach = Math.max(12, a.len * 0.2);
      if (Math.hypot(food.x - mx, food.y - my) < reach) this.eat(a, food);
    }
    // Every now and then, a breath of bubbles.
    if (this.t > a.breathAt && L.habitat !== "surface") {
      a.breathAt = this.t + 6 + Math.random() * 10;
      const [mx, my] = this.mouthOf(a);
      this.burst(mx, my, "bubble", 1 + Math.floor(Math.random() * 2));
    }
    // Gaze: food, a finger, or where it's going.
    let gx = a.tx - a.x;
    let gy = a.ty - a.y;
    if (curious) {
      gx = this.pointer.x - a.x;
      gy = this.pointer.y - a.y;
    }
    const gl = Math.hypot(gx, gy) || 1;
    a.gazeX += ((gx / gl) * 0.9 - a.gazeX) * Math.min(1, dt * 4);
    a.gazeY += ((gy / gl) * 0.7 - a.gazeY) * Math.min(1, dt * 4);
  }

  private stepSwim(a: Agent, dt: number, curious: boolean, sleepy: boolean, input: TankInput) {
    const { w, h } = this;
    const L = a.look;
    const [ex, ey] = creatureExtent(L, a.len);
    const top = h * SURFACE + ey + 6;
    const bot = () => sandY(a.x, w, h) - ey - 4;
    const cruise = L.speed * a.len;
    // A creature from the surface that dove: come back up when the dive is over.
    const diver = L.habitat === "surface";
    if (a.air) {
      // Out of the water: a ballistic arc, then a splash.
      a.vy += h * 2.4 * dt;
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.pitch = clamp(Math.atan2(a.vy, Math.abs(a.vx) + 1), -1.2, 1.2);
      if (a.y > h * SURFACE && a.vy > 0) {
        a.air = false;
        this.splash(a.x, 10);
        a.mode = "wander";
        a.modeT = 0;
      }
      this.animate(a, dt, Math.hypot(a.vx, a.vy), cruise);
      return;
    }
    if (diver) {
      // A surface creature underwater: explore until the dive is over, then swim back up.
      if (a.mode !== "seek" && a.mode !== "jump" && !(a.mode === "dive" && a.modeT > 0)) {
        a.mode = "wander";
        a.tx = clamp(a.x + a.dir * a.len, a.len, w - a.len);
        a.ty = h * SURFACE;
        if (a.y <= top + 4) {
          a.lift = 0;
          a.y = this.surfaceY(a);
          a.vy = 0;
          this.ripples.push({ x: a.x, r: 4, life: 0.8, big: false });
          return;
        }
      }
    } else if (a.modeT <= 0 && a.mode !== "seek") this.chooseSwim(a, sleepy, input);
    if (curious && a.mode !== "seek" && a.mode !== "flee" && a.mode !== "jump" && Math.hypot(this.pointer.x - a.x, this.pointer.y - a.y) < w * 0.45) {
      a.mode = "curious";
      a.modeT = 0.3;
      const off = ((a.c.egg.charCodeAt(0) % 5) - 2) * a.len * 0.35;
      a.tx = this.pointer.x + off;
      a.ty = this.pointer.y + off * 0.4;
    }
    let speed = cruise * a.speedMul;
    switch (a.mode) {
      case "rest":
        speed = cruise * 0.12;
        break;
      case "seek":
        speed = cruise * 1.9;
        break;
      case "curious":
        speed = cruise * 1.4;
        break;
      case "flee":
        speed = cruise * 2.8;
        break;
      case "beg":
        speed = cruise * 0.7;
        break;
      case "sleep":
        speed = cruise * 0.25;
        break;
      case "jump":
        speed = cruise * 3;
        break;
      case "dive":
        speed = cruise * 1.1;
        break;
      case "peck":
      case "sip":
        speed = cruise * 0.8;
        break;
    }
    if (a.puff > 0.3) speed *= 0.35;
    if (a.tuck > 0.3) speed *= 0.25;
    if (Math.abs(a.facing) < 0.9) speed *= 0.6;
    const dx = a.tx - a.x;
    const dy = a.ty - a.y;
    const dist = Math.hypot(dx, dy) || 1;
    const want = Math.min(speed, dist * 1.4);
    const agility = L.len > 0.35 ? 1.1 : L.plan === "turtle" ? 1.4 : 2.4;
    a.vx += ((dx / dist) * want - a.vx) * Math.min(1, dt * agility);
    a.vy += ((dy / dist) * want - a.vy) * Math.min(1, dt * agility);
    // School: drift toward the others' heading and middle.
    if (a.mode === "wander" && this.schools(a)) {
      let n = 0;
      let mx = 0;
      let my = 0;
      let vx = 0;
      let vy = 0;
      for (const b of this.agents) {
        if (b === a || !this.schools(b) || Math.hypot(b.x - a.x, b.y - a.y) > Math.max(150, a.len * 2.5)) continue;
        n++;
        mx += b.x;
        my += b.y;
        vx += b.vx;
        vy += b.vy;
      }
      if (n) {
        a.vx += ((vx / n - a.vx) * 0.7 + (mx / n - a.x) * 0.25) * dt;
        a.vy += ((vy / n - a.vy) * 0.7 + (my / n - a.y) * 0.25) * dt;
      }
    }
    // Pecking at the sand and kissing the surface, once there.
    const near = dist < a.len * 0.45;
    a.pitchBias += ((a.mode === "peck" && near ? 0.5 : 0) - a.pitchBias) * Math.min(1, dt * 4);
    if (near && (a.mode === "peck" || a.mode === "sip")) {
      if (this.t > a.puffAt) {
        a.puffAt = this.t + (a.mode === "peck" ? 0.45 : 1.2);
        a.mouthT = 0.3;
        const [mx, my] = this.mouthOf(a);
        if (a.mode === "peck") for (let i = 0; i < 4; i++) this.parts.push({ kind: "sand", x: mx + (Math.random() - 0.5) * 8, y: my + 4, vx: (Math.random() - 0.5) * 30, vy: -10 - Math.random() * 20, life: 0.9, max: 0.9, size: 1.5 + Math.random() * 2.5, color: this.theme.sand[0] });
        else {
          this.ripples.push({ x: mx, r: 3, life: 0.7, big: false });
          this.burst(mx, my, "bubble", 1);
        }
      }
      if (a.mode === "sip" && a.modeT > 1.4) a.modeT = 1.4;
    }
    // A lunge at food that's almost in reach, mouth already open.
    if (a.mode === "seek" && dist < a.len * 0.7) {
      a.mouth = Math.max(a.mouth, 0.65);
      a.vx += (dx / dist) * cruise * 2 * dt;
      a.vy += (dy / dist) * cruise * 2 * dt;
    }
    // Personal space.
    for (const b of this.agents) {
      if (b === a || b.look.habitat !== "swim") continue;
      const sx = a.x - b.x;
      const sy = a.y - b.y;
      const r = (a.len + b.len) * 0.45;
      const d2 = sx * sx + sy * sy;
      if (d2 < r * r && d2 > 1) {
        const d = Math.sqrt(d2);
        a.vx += (sx / d) * (r - d) * dt * 2;
        a.vy += (sy / d) * (r - d) * dt * 2;
      }
    }
    if (a.mode === "jump" && a.look.jumper && a.y < h * SURFACE + a.len * 0.3 && a.vy < 0) {
      // Breach!
      a.air = true;
      a.vy = -h * (0.9 + Math.random() * 0.3);
      a.vx = a.dir * a.len * 3;
      this.splash(a.x, 12);
      sfx("splash");
      return;
    }
    if (a.mode === "jump" && a.look.react === "spout" && a.y < h * SURFACE + a.len * 0.2) {
      // Whales blow a spout at the surface.
      for (let i = 0; i < 18; i++) this.parts.push({ kind: "drop", x: a.x + a.dir * a.len * 0.18, y: h * SURFACE - 2, vx: (Math.random() - 0.5) * 60, vy: -h * (0.5 + Math.random() * 0.35), life: 1.4, max: 1.4, size: 2 + Math.random() * 3 });
      sfx("splash");
      a.mode = "wander";
      a.modeT = 0;
      a.ty = a.y + this.h * 0.2;
    }
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    const minX = ex * 0.7;
    const maxX = w - ex * 0.7;
    if (a.x < minX) a.vx += (minX - a.x) * dt * 6;
    if (a.x > maxX) a.vx -= (a.x - maxX) * dt * 6;
    const yTop = a.mode === "jump" ? h * SURFACE - a.len : top;
    a.y = clamp(a.y, yTop, bot());
    a.x = clamp(a.x, ex * 0.3, w - ex * 0.3);
    this.animate(a, dt, Math.hypot(a.vx, a.vy), cruise);
  }

  /** Small fish that swim in loose schools. */
  private schools(a: Agent) {
    return a.look.plan === "fish" && a.look.habitat === "swim" && a.look.len <= 0.21 && !a.look.jumper && a.look.fish?.wave === "lat";
  }

  private chooseSwim(a: Agent, sleepy: boolean, input: TankInput) {
    const { w, h } = this;
    const L = a.look;
    const [d0, d1] = L.depth ?? [0.2, 0.8];
    const top = h * SURFACE;
    const bot = sandY(a.x, w, h);
    a.speedMul = 1;
    const anyFood = input.stock.flakes + input.stock.shrimp + input.stock.golden > 0;
    if (sleepy) {
      a.mode = "sleep";
      a.modeT = 6 + Math.random() * 6;
      a.tx = clamp(a.x + (Math.random() - 0.5) * w * 0.15, a.len, w - a.len);
      a.ty = bot - a.len * (0.4 + Math.random() * 0.3);
      return;
    }
    if (L.jumper && this.t > a.jumpAt) {
      a.jumpAt = this.t + 30 + Math.random() * 40;
      this.setMode(a, "jump", 5, clamp(a.x + a.dir * w * 0.25, a.len, w - a.len), top - h * 0.2);
      return;
    }
    if (a.appetite > 0 && anyFood && this.t > a.begAt) {
      a.begAt = this.t + 30 + Math.random() * 30;
      this.setMode(a, "beg", 3.5, w * (0.3 + Math.random() * 0.4), top + a.len * 0.8);
      return;
    }
    // Whales come up to blow a spout now and then.
    if (L.react === "spout" && this.t > a.jumpAt) {
      a.jumpAt = this.t + 40 + Math.random() * 40;
      this.setMode(a, "jump", 6, clamp(a.x + a.dir * w * 0.2, a.len, w - a.len), top + a.len * 0.1);
      return;
    }
    const ext = creatureExtent(L, a.len)[1];
    const r = Math.random();
    if (r < 0.1 && (L.plan === "fish" || L.plan === "turtle") && L.len < 0.3) {
      // Peck at the sand for a snack.
      const px = clamp(a.x + (Math.random() - 0.5) * w * 0.35, a.len, w - a.len);
      this.setMode(a, "peck", 7, px, sandY(px, w, h) - ext - 2);
      return;
    }
    if (r < 0.16 && L.fish?.wave === "lat") {
      // Come up and kiss the surface.
      this.setMode(a, "sip", 5, clamp(a.x + (Math.random() - 0.5) * w * 0.3, a.len, w - a.len), top + ext + 4);
      return;
    }
    if (r < 0.3) {
      a.mode = "rest";
      a.modeT = 1.5 + Math.random() * 2.5;
      a.tx = a.x;
      // Turtles like a nap on the bottom.
      a.ty = L.plan === "turtle" && Math.random() < 0.6 ? bot - ext - 2 : a.y;
      if (a.ty !== a.y) a.modeT = 4 + Math.random() * 3;
      return;
    }
    a.mode = "wander";
    a.modeT = 3 + Math.random() * 5;
    a.speedMul = r > 0.92 ? 2 : 0.8 + Math.random() * 0.5;
    // Small fish travel together in a loose school.
    if (this.schools(a) && Math.random() < 0.6) {
      const mate = this.agents.find((b) => b !== a && this.schools(b) && b.mode === "wander");
      if (mate) {
        a.tx = clamp(mate.tx + (Math.random() - 0.5) * a.len * 2, a.len, w - a.len);
        a.ty = clamp(mate.ty + (Math.random() - 0.5) * a.len, top + ext, bot - ext);
        a.modeT = mate.modeT;
        return;
      }
    }
    // Big creatures patrol the length of the tank.
    if (L.len >= 0.3) {
      a.tx = a.x < w / 2 ? w * (0.75 + Math.random() * 0.15) : w * (0.1 + Math.random() * 0.15);
      a.ty = clamp(a.y + (Math.random() - 0.5) * h * 0.18, top + (bot - top) * d0, top + (bot - top) * d1);
      a.modeT = 6 + Math.random() * 4;
      return;
    }
    // Sunny visits the anemone now and then.
    const anemone = this.placed.find((p) => p.proc === "flower");
    if (a.c.id === "sunny" && anemone && Math.random() < 0.35) {
      a.tx = anemone.x;
      a.ty = anemone.y - h * 0.12;
      return;
    }
    a.tx = w * (0.08 + Math.random() * 0.84);
    a.ty = top + (bot - top) * (d0 + Math.random() * (d1 - d0));
    a.zT = 0.25 + Math.random() * 0.75;
  }

  private stepBottom(a: Agent, dt: number, curious: boolean, sleepy: boolean) {
    const { w, h } = this;
    const L = a.look;
    const cruise = L.speed * a.len;
    const octo = L.plan === "octopus";
    if (a.mode === "jet" && octo) {
      // Up into the water, then drift back down.
      a.jet = Math.min(1, a.jet + dt * 4);
      const up = a.modeT > 1 ? 1 : 0;
      a.lift += ((up ? h * 0.35 : 0) - a.lift) * Math.min(1, dt * (up ? 2.5 : 0.8));
      a.vx += ((a.tx - a.x) * 1.2 - a.vx) * Math.min(1, dt * 2);
      a.x += a.vx * dt;
      if (a.modeT <= 0 && a.lift < 4) {
        a.mode = "wander";
        a.lift = 0;
      }
    } else {
      a.jet = Math.max(0, a.jet - dt * 2);
      a.lift = Math.max(0, a.lift - dt * h * 0.3);
      if (a.modeT <= 0 && a.mode !== "seek") {
        if (sleepy) {
          a.mode = "sleep";
          a.modeT = 8;
          a.tx = a.x;
        } else if (octo && Math.random() < 0.15) {
          a.mode = "jet";
          a.modeT = 2.4;
          a.tx = w * (0.15 + Math.random() * 0.7);
        } else if (Math.random() < 0.3) {
          a.mode = "rest";
          a.modeT = 1.5 + Math.random() * 3;
          a.tx = a.x;
        } else {
          a.mode = "wander";
          a.modeT = 3 + Math.random() * 4;
          a.tx = w * (0.08 + Math.random() * 0.84);
        }
      }
      if (curious && a.mode !== "seek" && a.mode !== "flee") a.tx = this.pointer.x;
      let speed = cruise * (a.mode === "seek" ? 2 : a.mode === "rest" || a.mode === "sleep" ? 0 : 1);
      if (a.tuck > 0.3) speed = 0;
      const dx = a.tx - a.x;
      const want = Math.sign(dx) * Math.min(speed, Math.abs(dx) * 1.5);
      if (a.hop > 0) {
        a.hop = Math.max(0, a.hop - dt * 2);
      } else a.vx += (want - a.vx) * Math.min(1, dt * 3);
      a.x += a.vx * dt;
    }
    a.x = clamp(a.x, a.len * 0.5, w - a.len * 0.5);
    a.y = this.groundY(a) - a.lift - Math.sin(a.hop * Math.PI) * a.len * 0.4;
    a.walk += (Math.abs(a.vx) / a.len) * dt * 7;
    if (L.plan !== "crab" && L.plan !== "octopus") {
      if (a.vx * a.dir < -4) a.turnHold += dt;
      else a.turnHold = 0;
      if (a.turnHold > 0.15 && a.hop <= 0) {
        a.dir = a.dir === 1 ? -1 : 1;
        a.turnHold = 0;
      }
      a.facing += (a.dir - a.facing) * Math.min(1, dt * 4);
    } else a.facing = a.vx >= 0 ? 1 : -1;
    a.pitch = 0;
    a.phase += dt * 3;
    a.flap += dt * 4;
    a.amp = 0.4;
    a.z += (0.7 - a.z) * dt * 0.2;
  }

  private stepSurface(a: Agent, dt: number, curious: boolean, sleepy: boolean) {
    const { w } = this;
    const L = a.look;
    const cruise = L.speed * a.len;
    const canDive = L.plan === "frog" || L.plan === "otter" || L.plan === "fish";
    if (a.modeT <= 0 && a.mode !== "seek") {
      if (canDive && this.t > a.diveAt && !sleepy) {
        a.diveAt = this.t + 18 + Math.random() * 25;
        a.lift = 1;
        a.mode = "dive";
        a.modeT = 3 + Math.random() * 4;
        a.tx = w * (0.15 + Math.random() * 0.7);
        a.ty = this.h * 0.55;
        this.splash(a.x, 6);
        return;
      }
      if (L.kind === "duck" && Math.random() < 0.25) a.dabbleT = 1.6;
      a.mode = Math.random() < 0.3 || sleepy ? "rest" : "wander";
      a.modeT = 2 + Math.random() * 4;
      a.tx = a.mode === "rest" ? a.x : w * (0.1 + Math.random() * 0.8);
    }
    if (curious && a.mode !== "seek") a.tx = this.pointer.x;
    const speed = cruise * (a.mode === "seek" ? 2.2 : a.mode === "rest" ? 0 : 1);
    const dx = a.tx - a.x;
    a.vx += (Math.sign(dx) * Math.min(speed, Math.abs(dx) * 1.5) - a.vx) * Math.min(1, dt * 2.5);
    a.x = clamp(a.x + a.vx * dt, a.len * 0.5, w - a.len * 0.5);
    a.y = this.surfaceY(a);
    a.vy = 0;
    a.dabbleT = Math.max(0, a.dabbleT - dt);
    a.dabble += ((a.dabbleT > 0.2 ? 1 : 0) - a.dabble) * Math.min(1, dt * 5);
    if (L.plan === "otter") a.roll += (1 - a.roll) * Math.min(1, dt * 3);
    if (Math.abs(a.vx) > 6 && Math.random() < dt * 2) this.ripples.push({ x: a.x - a.dir * a.len * 0.3, r: 3, life: 0.8, big: false });
    this.animate(a, dt, Math.abs(a.vx), cruise);
    // Rock with the waves under it.
    const slope = (surfaceAt(a.x + 8, this.h, this.t) - surfaceAt(a.x - 8, this.h, this.t)) / 16;
    a.pitch = Math.atan(slope) * 1.4 * (a.facing < 0 ? -1 : 1);
  }

  /** Facing, tilt, body bend and the swim cycle, from how the creature is moving. */
  private animate(a: Agent, dt: number, speed: number, cruise: number) {
    const L = a.look;
    if (L.plan === "otter" && a.look.habitat === "surface" && a.lift > 0) a.roll += (0 - a.roll) * Math.min(1, dt * 3);
    if (a.vx * a.dir < -6) a.turnHold += dt;
    else a.turnHold = 0;
    if (a.turnHold > 0.18) {
      a.dir = a.dir === 1 ? -1 : 1;
      a.turnHold = 0;
    }
    a.facing += (a.dir - a.facing) * Math.min(1, dt * 4.5);
    if (!a.air) {
      const maxPitch = L.len > 0.35 ? 0.35 : L.plan === "fish" && L.fish?.wave === "vert" ? 0.75 : 0.55;
      const target = clamp(Math.atan2(a.vy, Math.abs(a.vx) + cruise * 0.15) + a.pitchBias, -maxPitch - a.pitchBias, maxPitch + a.pitchBias);
      const prev = a.pitch;
      a.pitch += (target - a.pitch) * Math.min(1, dt * 3);
      a.bend += (clamp(((a.pitch - prev) / Math.max(dt, 0.001)) * -0.4, -0.6, 0.6) - a.bend) * Math.min(1, dt * 4);
    }
    const sn = clamp(speed / Math.max(1, cruise), 0, 2.5);
    const lat = L.fish?.wave === "lat";
    a.phase += dt * TAU * (lat ? 1.8 : L.plan === "turtle" ? 0.5 : 1) * (0.55 + sn * 0.9);
    a.flap += dt * TAU * (L.plan === "turtle" ? 0.35 + sn * 0.35 : L.fish?.pect?.kind === "wing" ? 1 + sn : 1.1 + sn * 0.8);
    a.amp += (clamp(0.22 + sn * 0.6, 0, 1) - a.amp) * Math.min(1, dt * 3);
    a.z += (a.zT - a.z) * dt * 0.15;
  }

  private bestPellet(a: Agent): Pellet | null {
    if (a.appetite <= 0) return null;
    let best: Pellet | null = null;
    let bd = Infinity;
    const surface = a.look.habitat === "surface" && a.lift <= 0;
    const diver = a.look.plan === "frog" || a.look.plan === "otter";
    for (const p of this.pellets) {
      if (p.gone) continue;
      if (surface && !diver && p.y > this.h * SURFACE + a.len * 0.6) continue;
      const d = Math.hypot(p.x - a.x, p.y - a.y);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    if (best && surface && diver && best.y > this.h * SURFACE + a.len * 0.6) {
      a.lift = 1;
      a.mode = "seek";
    }
    return best;
  }

  private mouthOf(a: Agent): [number, number] {
    const s = 0.8 + 0.2 * a.z;
    const f = a.facing < 0 ? -1 : 1;
    switch (a.look.plan) {
      case "crab":
      case "octopus":
        return [a.x, a.y + a.len * 0.05 * s];
      case "bird":
        return [a.x + f * a.len * 0.4 * s, this.h * SURFACE + 2];
      case "snail":
        return [a.x + f * a.len * 0.4 * s, a.y + a.len * 0.05];
      case "squid":
        return [a.x - f * a.len * 0.12 * s, a.y];
      default:
        return [a.x + f * a.len * 0.4 * s * Math.max(0.4, Math.abs(a.facing)), a.y + Math.sin(a.pitch * f) * a.len * 0.4 * s];
    }
  }

  private eat(a: Agent, p: Pellet) {
    p.gone = true;
    a.appetite -= 1;
    a.mouthT = 0.45;
    a.wakeT = Math.max(a.wakeT, 4);
    const [mx, my] = this.mouthOf(a);
    this.burst(mx, my - a.len * 0.1, "heart", 6);
    this.parts.push({ kind: "text", x: mx, y: my - a.len * 0.3, vx: 0, vy: -40, life: 1.4, max: 1.4, size: Math.max(16, this.h * 0.032), text: `+${p.kind === "golden" ? 120 : p.kind === "shrimp" ? 50 : 20}` });
    sfx("gulp");
    this.events().eat(a.c.egg, p.kind);
  }

  private stepPellets(dt: number) {
    const { w, h } = this;
    for (const p of this.pellets) {
      if (p.gone) continue;
      if (p.float > 0) {
        p.float -= dt;
        p.y = surfaceAt(p.x, h, this.t) + 2;
        p.rot += dt;
        continue;
      }
      if (p.rest) {
        p.life -= dt;
        if (p.life <= 0) p.gone = true;
        continue;
      }
      const term = h * (p.kind === "flakes" ? 0.035 : p.kind === "shrimp" ? 0.05 : 0.07);
      p.vy += (term - p.vy) * Math.min(1, dt * 2);
      p.y += p.vy * dt;
      p.x += Math.sin(this.t * 2.2 + p.id) * dt * (p.kind === "flakes" ? 14 : 6);
      p.rot += dt * (p.kind === "flakes" ? 2.5 : 0.6);
      const floor = sandY(p.x, w, h) - 3;
      if (p.y >= floor) {
        p.y = floor;
        p.rest = true;
      }
    }
    this.pellets = this.pellets.filter((p) => !p.gone);
  }

  private stepParticles(dt: number) {
    const top = this.h * SURFACE;
    for (const p of this.parts) {
      p.life -= dt;
      switch (p.kind) {
        case "bubble":
          p.y += p.vy * dt;
          p.x += Math.sin(this.t * 3 + p.size * 7) * dt * 10;
          p.size += dt * 0.25;
          if (p.y < top + 2) {
            p.life = 0;
            this.ripples.push({ x: p.x, r: 2, life: 0.5, big: false });
          }
          break;
        case "drop":
          p.vy += this.h * 2.2 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          if (p.y > top + 4 && p.vy > 0) p.life = 0;
          break;
        case "sand":
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 30 * dt;
          p.vx *= 1 - dt * 2;
          break;
        case "heart":
        case "spark":
        case "zzz":
        case "text":
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy *= 1 - dt * 0.6;
          break;
        case "ink":
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.size += dt * 18;
          p.vx *= 1 - dt;
          p.vy *= 1 - dt;
          break;
        case "ring":
        case "shock":
          p.size += dt * (p.kind === "shock" ? 160 : 90);
          break;
      }
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    if (this.parts.length > 260) this.parts.splice(0, this.parts.length - 260);
  }

  private stepPlants(dt: number) {
    for (const p of this.plants) {
      let push = 0;
      for (const a of this.agents) {
        const dx = p.x - a.x;
        const r = a.len * 0.5 + 18;
        if (Math.abs(dx) > r || a.y < p.y - p.h || a.y > p.y + 10) continue;
        push += Math.sign(dx || 1) * (1 - Math.abs(dx) / r) * clamp(Math.abs(a.vx) / (a.look.speed * a.len + 1), 0.3, 1.2) * 0.5;
      }
      p.push += (clamp(push, -0.6, 0.6) - p.push) * Math.min(1, dt * 3);
    }
  }

  private burst(x: number, y: number, kind: "heart" | "spark" | "bubble", n: number, color?: string) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + Math.random() * 0.6;
      const v = kind === "bubble" ? 0 : 30 + Math.random() * 40;
      this.parts.push({
        kind,
        x: x + (kind === "bubble" ? (Math.random() - 0.5) * 8 : 0),
        y,
        vx: Math.cos(a) * v,
        vy: kind === "bubble" ? -(35 + Math.random() * 25) : Math.sin(a) * v - 30,
        life: kind === "bubble" ? 8 : 1.1 + Math.random() * 0.4,
        max: kind === "bubble" ? 8 : 1.4,
        size: kind === "bubble" ? 2 + Math.random() * 3 : kind === "heart" ? 9 + Math.random() * 5 : 6 + Math.random() * 5,
        color,
      });
    }
  }

  private splash(x: number, n: number) {
    const top = this.h * SURFACE;
    for (let i = 0; i < n; i++) this.parts.push({ kind: "drop", x: x + (Math.random() - 0.5) * 16, y: top, vx: (Math.random() - 0.5) * 120, vy: -this.h * (0.25 + Math.random() * 0.35), life: 1.2, max: 1.2, size: 2 + Math.random() * 2.5 });
    this.ripples.push({ x, r: 6, life: 1, big: true });
  }

  private emit(p: Placed, n: number) {
    const fx = DECOR_FX[p.id];
    if (!fx?.at) return;
    const ex = p.x - p.w / 2 + p.w * fx.at[0];
    const ey = p.y - p.h + p.h * fx.at[1] + this.bob(p);
    if (fx.emit === "sparkles") for (let i = 0; i < n; i++) this.parts.push({ kind: "spark", x: ex + (Math.random() - 0.5) * p.w * 0.6, y: ey + (Math.random() - 0.5) * p.h * 0.4, vx: (Math.random() - 0.5) * 8, vy: -8 - Math.random() * 10, life: 1.2, max: 1.2, size: 4 + Math.random() * 4, color: "#fff4b0" });
    else this.burst(ex, ey, "bubble", n);
  }

  private bob(p: Placed) {
    const fx = DECOR_FX[p.id];
    return fx?.bob ? Math.sin(this.t * 1.1 + p.x * 0.01) * p.h * fx.bob : 0;
  }

  // ── Painting ───────────────────────────────────────────────────────────────────────────────

  private rebuild() {
    const { w, h, dpr } = this;
    const make = () => {
      const c = document.createElement("canvas");
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      return c;
    };
    const bg = this.bg && this.bg.width === Math.round(w * dpr) ? this.bg : make();
    const b = bg.getContext("2d")!;
    b.setTransform(dpr, 0, 0, dpr, 0, 0);
    b.clearRect(0, 0, w, h);
    paintWater(b, w, h, this.theme);
    paintFar(b, w, h, this.theme);
    const onLoad = () => {
      this.dirty = true;
      if (!this.running) this.draw();
    };
    const img = (p: Placed) => {
      const im = artImage(DECOR_ART[p.id], onLoad);
      if (im) b.drawImage(im, p.x - p.w / 2, p.y - p.h, p.w, p.h);
    };
    // Back pieces are farther away: a little of the water's color washes over them.
    const backs = this.placed.filter((p) => p.layer === "back");
    if (backs.length) {
      const haze = make();
      const hz = haze.getContext("2d")!;
      hz.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const p of backs) {
        const im = artImage(DECOR_ART[p.id], onLoad);
        if (im) hz.drawImage(im, p.x - p.w / 2, p.y - p.h, p.w, p.h);
      }
      hz.globalCompositeOperation = "source-atop";
      hz.fillStyle = rgba(this.theme.water[2], 0.2);
      hz.fillRect(0, 0, w, h);
      b.setTransform(1, 0, 0, 1, 0, 0);
      b.drawImage(haze, 0, 0);
      b.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    for (const p of this.placed) if (p.layer === "surface") img(p);
    paintSand(b, w, h, this.theme);
    paintReef(b, w, h, this.theme);
    for (const p of this.placed) if (p.layer === "floor" && !p.proc) img(p);
    this.bg = bg;
    const gl = this.glassLayer && this.glassLayer.width === Math.round(w * dpr) ? this.glassLayer : make();
    const g = gl.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    paintGlass(g, w, h);
    this.glassLayer = gl;
    this.dirty = false;
  }

  private draw() {
    const { ctx, w, h, dpr } = this;
    if (!w || !this.input) return;
    if (this.dirty || !this.bg) this.rebuild();
    const t = this.t;
    const th = this.theme;
    const night = this.input.night;
    const fog = fogColor(th);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.bg!, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawRays(ctx, w, h, th, t, night);
    if (!this.lite) drawCaustics(ctx, w, h, th, t, night);
    // Drifting specks.
    for (const m of this.motes) {
      ctx.fillStyle = th.glow ? `rgba(160,220,255,${m.a + 0.25 * Math.sin(t * 2 + m.r * 10)})` : `rgba(255,255,255,${m.a * 0.7})`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r * (th.glow ? 1.4 : 1), 0, TAU);
      ctx.fill();
    }
    for (const p of this.plants) if (!p.front) drawPlant(ctx, p, t);
    this.drawDecor(t);
    this.drawNest(t);
    // Shadows on the sand.
    for (const a of this.agents) {
      const gy = sandY(a.x, w, h);
      const d = gy - a.y;
      if (d > h * 0.4 || a.air) continue;
      const k = 1 - d / (h * 0.4);
      ctx.fillStyle = `rgba(0,20,40,${0.16 * k})`;
      ctx.beginPath();
      ctx.ellipse(a.x, gy + 3, a.len * 0.38 * (0.6 + 0.4 * k), a.len * 0.06, 0, 0, TAU);
      ctx.fill();
    }
    const sorted = [...this.agents].sort((a, b) => a.z - b.z);
    for (const a of sorted) this.drawAgent(a, fog);
    for (const p of this.pellets) this.drawPellet(p, t);
    this.drawParticles(t);
    for (const p of this.plants) if (p.front) drawPlant(ctx, p, t);
    drawSurface(ctx, w, h, th, t, this.ripples);
    if (night) {
      ctx.fillStyle = "rgba(8,10,40,0.42)";
      ctx.fillRect(0, 0, w, h);
      // Moonlight from above.
      const mg = ctx.createRadialGradient(w * 0.75, 0, 0, w * 0.75, 0, h * 0.9);
      mg.addColorStop(0, "rgba(200,220,255,0.18)");
      mg.addColorStop(1, "rgba(200,220,255,0)");
      ctx.fillStyle = mg;
      ctx.fillRect(0, 0, w, h);
    }
    this.drawGlows(t, night);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (this.glassLayer) ctx.drawImage(this.glassLayer, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.drawTexts();
  }

  private drawDecor(t: number) {
    const ctx = this.ctx;
    for (const p of this.placed) {
      const since = t - (this.bounce.get(p.id) ?? -10);
      const sq = since < 0.5 ? 1 + Math.sin(since * 20) * 0.08 * (1 - since / 0.5) : 1;
      if (p.proc === "grass") continue;
      if (p.proc === "flower") {
        drawAnemone(ctx, p.x, p.y, p.h * 1.4 * sq, t, since < 1 ? 1 - since : 0);
        continue;
      }
      // Floating decorations move, so they're drawn every frame (the rest live in the cache).
      if (p.layer === "float") {
        const im = artImage(DECOR_ART[p.id]);
        if (im) {
          const by = this.bob(p);
          ctx.save();
          ctx.translate(p.x, p.y + by);
          ctx.scale(sq, 1 / sq);
          if (p.id === "crown" || p.id === "moon") ctx.rotate(Math.sin(t * 0.8) * 0.08);
          ctx.drawImage(im, -p.w / 2, -p.h, p.w, p.h);
          ctx.restore();
        }
      }
      if (this.input?.trying === p.id) {
        ctx.save();
        ctx.setLineDash([8, 6]);
        ctx.lineDashOffset = -t * 30;
        ctx.strokeStyle = `rgba(255,255,255,${0.7 + 0.3 * Math.sin(t * 5)})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(p.x - p.w / 2 - 8, p.y - p.h - 8 + this.bob(p), p.w + 16, p.h + 12, 14);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  private drawNest(t: number) {
    const ctx = this.ctx;
    const eggs = this.input?.eggs ?? [];
    this.eggHits = [];
    if (!eggs.length) return;
    const { x, y } = this.nest;
    const s = this.h * 0.085;
    // A woven nest of sea grass.
    ctx.fillStyle = "#6b5a2e";
    ctx.beginPath();
    ctx.ellipse(x, y + 2, s * 1.35, s * 0.42, 0, 0, TAU);
    ctx.fill();
    const shown = eggs.slice(0, 4);
    shown.forEach((e, i) => {
      const ex = x + (i - (shown.length - 1) / 2) * s * 0.62;
      const ey = y - s * 0.32 - (i % 2) * s * 0.06;
      const wob = Math.sin(t * 3 + i * 1.7) * 0.12 + (Math.sin(t * 0.7 + i) > 0.92 ? Math.sin(t * 30) * 0.15 : 0);
      const im = artImage(eggArt(e.tier));
      if (im) {
        ctx.save();
        ctx.translate(ex, ey + s * 0.4);
        ctx.rotate(wob);
        const eh = s * 0.95;
        ctx.drawImage(im, (-eh * 0.8) / 2, -eh, eh * 0.8, eh);
        ctx.restore();
      }
      this.eggHits.push({ id: e.id, x: ex, y: ey, r: s * 0.6 });
    });
    ctx.strokeStyle = "#8a7440";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y + 2, s * 1.35, s * 0.42, 0, 0.05 * Math.PI, 0.95 * Math.PI);
    ctx.stroke();
    ctx.strokeStyle = "#a8915a";
    ctx.lineWidth = 2;
    for (let k = -3; k <= 3; k++) {
      ctx.beginPath();
      ctx.moveTo(x + k * s * 0.35, y - s * 0.05);
      ctx.lineTo(x + k * s * 0.35 + s * 0.12, y + s * 0.38);
      ctx.stroke();
    }
    if (eggs.length > 4) {
      ctx.font = `800 ${Math.round(s * 0.42)}px ${this.font}`;
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "rgba(0,30,60,0.6)";
      ctx.lineWidth = 3;
      ctx.strokeText(`+${eggs.length - 4}`, x + s * 1.4, y - s * 0.1);
      ctx.fillText(`+${eggs.length - 4}`, x + s * 1.4, y - s * 0.1);
    }
  }

  private drawAgent(a: Agent, fog: string) {
    const { ctx, h } = this;
    const p = this.pose;
    p.t = this.t;
    p.phase = a.phase;
    p.amp = a.amp;
    p.facing = a.facing;
    p.pitch = a.look.plan === "octopus" ? (a.vx > 0 ? 0.5 : -0.5) : a.pitch + a.spin;
    p.bend = a.bend;
    p.mouth = a.mouth;
    p.blink = a.blink;
    p.lookX = a.gazeX;
    p.lookY = a.gazeY;
    p.puff = a.puff;
    p.react = a.look.react === "flip" ? a.hop : a.react;
    p.tuck = a.tuck;
    p.walk = a.walk;
    p.roll = a.roll;
    p.dabble = a.dabble;
    p.flap = a.flap;
    p.jet = a.jet;
    p.nod = a.nod;
    p.claw = a.claw;
    p.sleep = a.sleep;
    p.baby = a.c.stage === 0 ? 1 : 0;
    p.royal = a.c.stage === 3;
    p.fog = (1 - a.z) * 0.55;
    p.fogColor = fog;
    const s = (0.8 + 0.2 * a.z) * (0.15 + 0.85 * easeOutBack(a.spawn));
    const surface = a.look.habitat === "surface" && a.lift <= 0 && !a.air;
    const draw = (alpha: number) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(a.x, a.y);
      ctx.scale(s, s);
      drawCreature(ctx, a.look, p, a.len, a.c.id);
      ctx.restore();
    };
    if (surface) {
      // The part under the water shows through it, softly.
      const sy = surfaceAt(a.x, h, this.t);
      ctx.save();
      ctx.beginPath();
      ctx.rect(a.x - a.len * 2, sy, a.len * 4, a.len * 2);
      ctx.clip();
      draw(0.55);
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.rect(a.x - a.len * 2, sy - a.len * 2, a.len * 4, a.len * 2);
      ctx.clip();
      draw(1);
      ctx.restore();
    } else draw(1);
    const [, ey] = creatureExtent(a.look, a.len);
    const topY = a.y - (a.look.plan === "bird" ? a.len * 0.75 : ey * s) - 12;
    if (a.c.buddy) {
      ctx.save();
      ctx.translate(a.x, topY - 4 + Math.sin(this.t * 3) * 3);
      ctx.beginPath();
      sparklePath(ctx, 0, 0, 8);
      ctx.fillStyle = "#ffd23a";
      ctx.fill();
      ctx.strokeStyle = "#a86a00";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
    // A hungry friend (and food to give) looks up hopefully: a little thought bubble.
    if (a.appetite > 0 && (a.mode === "beg" || (this.input?.holding && a.mode !== "seek")) && a.spawn >= 1) {
      const bx = a.x + (a.facing < 0 ? -1 : 1) * a.len * 0.25;
      const by = topY - (a.c.buddy ? 14 : 0) + Math.sin(this.t * 2.4) * 2;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.beginPath();
      ctx.arc(bx, by, 11, 0, TAU);
      ctx.arc(bx - 9, by + 12, 3.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#ff8a3d";
      ctx.beginPath();
      ctx.arc(bx - 3, by + 1, 3.2, 0, TAU);
      ctx.arc(bx + 3.5, by - 2, 2.6, 0, TAU);
      ctx.fill();
    }
  }

  private drawPellet(p: Pellet, t: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    if (p.rest) ctx.globalAlpha = Math.min(1, p.life / 3);
    const s = Math.max(4, this.h * 0.009);
    if (p.kind === "flakes") {
      ctx.fillStyle = ["#ff5d5d", "#ffd23a", "#ff9f43"][p.id % 3];
      ctx.beginPath();
      ctx.moveTo(-s, -s * 0.4);
      ctx.lineTo(s * 0.8, -s * 0.7);
      ctx.lineTo(s, s * 0.5);
      ctx.lineTo(-s * 0.6, s * 0.6);
      ctx.closePath();
      ctx.fill();
    } else if (p.kind === "shrimp") {
      ctx.fillStyle = "#ff7fa0";
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 1.2, s * 0.6, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#d94a6f";
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      const g = ctx.createRadialGradient(-s * 0.3, -s * 0.3, 0, 0, 0, s);
      g.addColorStop(0, "#fffbe0");
      g.addColorStop(0.6, "#ffd23a");
      g.addColorStop(1, "#d48a00");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, TAU);
      ctx.fill();
      if (Math.sin(t * 6 + p.id) > 0.6) {
        ctx.beginPath();
        sparklePath(ctx, s * 0.8, -s * 0.8, s * 0.8);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawParticles(t: number) {
    const ctx = this.ctx;
    for (const p of this.parts) {
      const k = p.life / p.max;
      switch (p.kind) {
        case "bubble":
          ctx.strokeStyle = "rgba(255,255,255,0.75)";
          ctx.fillStyle = "rgba(255,255,255,0.14)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, TAU);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.beginPath();
          ctx.arc(p.x - p.size * 0.35, p.y - p.size * 0.35, p.size * 0.25, 0, TAU);
          ctx.fill();
          break;
        case "drop":
          ctx.fillStyle = `rgba(220,245,255,${0.85 * k})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, TAU);
          ctx.fill();
          break;
        case "heart": {
          const s = p.size * (k > 0.8 ? (1 - k) * 5 : 1);
          ctx.globalAlpha = Math.min(1, k * 2);
          ctx.beginPath();
          heartPath(ctx, p.x, p.y, s);
          ctx.fillStyle = "#ff4f7b";
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        }
        case "spark":
          ctx.globalAlpha = Math.min(1, k * 2) * (0.6 + 0.4 * Math.sin(t * 12 + p.x));
          ctx.beginPath();
          sparklePath(ctx, p.x, p.y, p.size);
          ctx.fillStyle = p.color ?? "#fff4b0";
          ctx.fill();
          ctx.globalAlpha = 1;
          break;
        case "ink":
          ctx.fillStyle = `rgba(30,20,50,${0.35 * k})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, TAU);
          ctx.fill();
          break;
        case "ring":
        case "shock":
          ctx.strokeStyle = `rgba(255,255,255,${0.7 * k})`;
          ctx.lineWidth = p.kind === "shock" ? 4 : 2.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, TAU);
          ctx.stroke();
          break;
        case "sand":
          ctx.fillStyle = rgba(p.color ?? "#e8cf98", 0.85 * k);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1.5 - k * 0.5), 0, TAU);
          ctx.fill();
          break;
        case "zzz":
          ctx.font = `800 ${p.size}px ${this.font}`;
          ctx.fillStyle = `rgba(255,255,255,${0.9 * k})`;
          ctx.fillText("z", p.x, p.y);
          break;
        case "text":
          break;
      }
    }
  }

  private drawTexts() {
    const ctx = this.ctx;
    for (const p of this.parts) {
      if (p.kind !== "text" || !p.text) continue;
      const k = p.life / p.max;
      ctx.globalAlpha = Math.min(1, k * 2.5);
      ctx.font = `800 ${Math.round(p.size)}px ${this.font}`;
      ctx.textAlign = "center";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(10,60,30,0.75)";
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = "#b6ff9a";
      ctx.fillText(p.text, p.x, p.y);
      // A little sprout beside the number.
      const sx = p.x + ctx.measureText(p.text).width / 2 + p.size * 0.5;
      const sy = p.y - p.size * 0.35;
      ctx.fillStyle = "#4cd964";
      ctx.beginPath();
      ctx.ellipse(sx - p.size * 0.18, sy - p.size * 0.1, p.size * 0.22, p.size * 0.12, -0.6, 0, TAU);
      ctx.ellipse(sx + p.size * 0.18, sy - p.size * 0.15, p.size * 0.22, p.size * 0.12, 0.6, 0, TAU);
      ctx.fill();
      ctx.textAlign = "start";
      ctx.globalAlpha = 1;
    }
  }

  private drawGlows(t: number, night: boolean) {
    const ctx = this.ctx;
    const dark = night || this.theme.glow;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const a of this.agents) {
      const glow = a.look.glow ?? (a.look.sparkle ? "#ffd23a" : null);
      if (!glow || (!dark && !a.look.sparkle)) continue;
      const r = a.len * 0.7;
      const g = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, r);
      g.addColorStop(0, rgba(glow, (dark ? 0.32 : 0.14) * (0.7 + 0.3 * Math.sin(t * 2 + a.x))));
      g.addColorStop(1, rgba(glow, 0));
      ctx.fillStyle = g;
      ctx.fillRect(a.x - r, a.y - r, r * 2, r * 2);
      if (a.look.sparkle && Math.random() < 0.08) this.parts.push({ kind: "spark", x: a.x + (Math.random() - 0.5) * a.len * 0.6, y: a.y + (Math.random() - 0.5) * a.len * 0.3, vx: 0, vy: -10, life: 0.9, max: 0.9, size: 3 + Math.random() * 3, color: "#fff6c8" });
    }
    for (const p of this.placed) {
      const fx = DECOR_FX[p.id];
      if (!fx?.glow) continue;
      const cx = p.x;
      const cy = p.y - p.h * 0.55 + this.bob(p);
      const r = Math.max(p.w, p.h) * (dark ? 0.9 : 0.6);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, rgba(fx.glow, (dark ? 0.4 : 0.16) * (0.75 + 0.25 * Math.sin(t * 1.7 + p.x))));
      g.addColorStop(1, rgba(fx.glow, 0));
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    ctx.restore();
  }
}
