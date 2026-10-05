import type { Look } from "../species";
import { colorsFor, type Pose } from "./core";
import { drawFish, fishExtent } from "./fish";
import { drawCritter, critterCenterY, critterExtent } from "./critters";

export { groundOf } from "./critters";

/** The vertical middle of a creature relative to its origin. */
export function creatureCenterY(look: Look, len: number): number {
  return look.plan === "fish" ? 0 : critterCenterY(look, len);
}

export { restPose, type Pose } from "./core";

type Ctx = CanvasRenderingContext2D;

/** Side-view plans turn around by flipping (through a squash, so it reads as a 3D turn); the crab
 *  and the octopus face you, so they never flip. */
const FLIPS = new Set(["fish", "turtle", "squid", "arthro", "snail", "bird", "frog", "otter"]);

/** Draw one creature centered on the current origin, `len` pixels long, in `pose`. */
export function drawCreature(ctx: Ctx, look: Look, pose: Pose, len: number, id: string) {
  const C = colorsFor(look, pose.fog, pose.fogColor);
  ctx.save();
  let lx = pose.lookX;
  if (FLIPS.has(look.plan)) {
    const f = pose.facing;
    const sgn = f < 0 ? -1 : 1;
    const sx = Math.abs(f) < 0.07 ? 0.07 * sgn : f;
    ctx.rotate(pose.pitch * sgn * Math.min(1, Math.abs(f) * 1.5));
    ctx.scale(sx, 1);
    lx = pose.lookX * sgn;
  }
  if (look.plan === "fish") drawFish(ctx, look, pose, len, C, id, lx);
  else drawCritter(ctx, look, pose, len, C, id, lx);
  ctx.restore();
}

/** Half-width and half-height of a creature `len` pixels long (for hit tests, shadows, framing). */
export function creatureExtent(look: Look, len: number): [number, number] {
  return look.plan === "fish" ? fishExtent(look, len) : critterExtent(look, len);
}
