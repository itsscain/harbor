"use client";

import { useEffect, useRef } from "react";
import { lookOf } from "./species";
import { creatureCenterY, creatureExtent, drawCreature, restPose } from "./draw";

// One living creature in a little canvas: the aquarium card, the Fish Book, the hatching
// reveal, the buddy on the boat and in the corner of lessons. It swims in place — tail beating,
// fins fanning, eyes blinking and looking around — and plays its reaction when `react` changes.
// All portraits share one animation frame.

type Tick = (t: number) => void;
const ticks = new Set<Tick>();
let raf = 0;
function loop(now: number) {
  for (const f of ticks) f(now / 1000);
  raf = ticks.size ? requestAnimationFrame(loop) : 0;
}
function onTick(f: Tick) {
  ticks.add(f);
  if (!raf) raf = requestAnimationFrame(loop);
  return () => {
    ticks.delete(f);
  };
}

const STAGE_FIT = [0.8, 0.88, 0.95, 1];

export function CreatureView({
  id,
  size,
  animate = true,
  stage = 1,
  royal = false,
  silhouette,
  react = 0,
  eating = false,
  facing = 1,
  className,
  label,
}: {
  id: string;
  size: number;
  animate?: boolean;
  /** 0 baby · 1 young · 2 grown · 3 royal. */
  stage?: number;
  royal?: boolean;
  /** Draw as a dark shape (a friend not found yet). */
  silhouette?: string;
  /** Bump to play the creature's tap reaction. */
  react?: number;
  eating?: boolean;
  facing?: 1 | -1;
  className?: string;
  label?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef({ react: 0, reactAt: -10, eating: false });

  useEffect(() => {
    live.current.eating = eating;
  }, [eating]);
  useEffect(() => {
    if (react > 0) live.current.reactAt = -1;
  }, [react]);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(size * dpr);
    c.height = Math.round(size * dpr);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const look = lookOf(id);
    const pose = restPose();
    const [hx, hy] = creatureExtent(look, 1);
    const len = Math.min((size * 0.46) / hx, (size * 0.42) / hy) * STAGE_FIT[Math.max(0, Math.min(3, stage))];
    pose.baby = stage === 0 ? 1 : 0;
    pose.royal = royal;
    pose.facing = facing;
    // The otter is happiest floating on its back.
    pose.roll = look.plan === "otter" ? 1 : 0;
    const surface = look.habitat === "surface";
    const bottom = look.habitat === "bottom" && look.plan !== "octopus";
    let blinkAt = 2 + Math.random() * 2;
    const draw = (t: number) => {
      const L = live.current;
      if (L.reactAt === -1) L.reactAt = t;
      const r = Math.max(0, 1 - (t - L.reactAt) / 1.4);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      pose.t = t;
      pose.phase = t * (look.plan === "fish" ? 5.5 : 3.2);
      pose.flap = t * (look.plan === "turtle" ? 1.6 : 5);
      pose.amp = 0.55;
      pose.walk = bottom ? t * 2.2 : 0;
      pose.lookX = Math.sin(t * 0.5) * 0.5;
      pose.lookY = Math.sin(t * 0.73) * 0.25;
      if (t > blinkAt) blinkAt = t + 2.5 + Math.random() * 3;
      pose.blink = blinkAt - t < 0.14 ? 1 : 0;
      pose.react = r;
      pose.puff = look.react === "puff" ? Math.min(1, r * 2.2) : 0;
      pose.claw = look.react === "snap" ? r : 0;
      pose.tuck = look.react === "tuck" || look.react === "hide" ? Math.min(1, r * 2) : 0;
      pose.mouth = L.eating ? Math.abs(Math.sin(t * 9)) : look.react === "chomp" ? Math.abs(Math.sin(t * 8)) * r : 0;
      pose.jet = 0;
      pose.nod = look.react === "nod" ? Math.sin(r * Math.PI) : 0;
      const bob = Math.sin(t * 1.5) * size * (surface || bottom ? 0.006 : 0.018);
      ctx.translate(size / 2, size / 2 + bob - creatureCenterY(look, len) + (bottom ? size * 0.04 : 0));
      if (surface) {
        // A little pool of water for floaters: a glinting surface that fades out at the sides.
        const g = ctx.createLinearGradient(0, 0, 0, size * 0.4);
        g.addColorStop(0, "rgba(120,200,255,0.5)");
        g.addColorStop(1, "rgba(120,200,255,0)");
        const wave = (x: number) => Math.sin(x * 0.08 + t * 2) * 2;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-size / 2, wave(-size / 2));
        for (let x = -size / 2; x <= size / 2; x += 6) ctx.lineTo(x, wave(x));
        ctx.lineTo(size / 2, size * 0.4);
        ctx.lineTo(-size / 2, size * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.75)";
        ctx.lineWidth = Math.max(1.5, size * 0.009);
        ctx.beginPath();
        for (let x = -size / 2; x <= size / 2; x += 6) ctx[x === -size / 2 ? "moveTo" : "lineTo"](x, wave(x));
        ctx.stroke();
        ctx.globalCompositeOperation = "destination-in";
        const m = ctx.createLinearGradient(-size / 2, 0, size / 2, 0);
        m.addColorStop(0, "rgba(0,0,0,0)");
        m.addColorStop(0.25, "#000");
        m.addColorStop(0.75, "#000");
        m.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = m;
        ctx.fillRect(-size / 2, -size, size, size * 2);
        ctx.globalCompositeOperation = "source-over";
      }
      drawCreature(ctx, look, pose, len, id);
      if (silhouette) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalCompositeOperation = "source-in";
        ctx.fillStyle = silhouette;
        ctx.fillRect(0, 0, size, size);
        ctx.globalCompositeOperation = "source-over";
      }
    };
    if (!animate) {
      draw(1.3);
      return;
    }
    return onTick(draw);
  }, [id, size, animate, stage, royal, silhouette, facing]);

  return <canvas ref={ref} className={className} style={{ width: size, height: size }} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} />;
}
