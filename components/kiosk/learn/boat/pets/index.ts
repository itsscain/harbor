// The living pets, by shop id (the catalog — names, prices, levels — is in lib/learn/boats.ts).
import { drawInline } from "../../art/pen";
import type { PetRig } from "./rig";
import { PETS_A } from "./a";
import { PETS_B } from "./b";
import { PETS_C } from "./c";
import { PETS_D } from "./d";

export type { PetRig, Trick, PetVoice } from "./rig";
export const PET_RIGS: PetRig[] = [...PETS_A, ...PETS_B, ...PETS_C, ...PETS_D];
export const RIG_BY_ID = new Map(PET_RIGS.map((p) => [p.id, p]));

const inner = new Map<string, string>();
/** A pet's inline SVG (cached). Ids are prefixed per pet so several pets can share a page. */
export function petInner(id: string): string | null {
  const hit = inner.get(id);
  if (hit) return hit;
  const rig = RIG_BY_ID.get(id);
  if (!rig) return null;
  const svg = drawInline(rig.draw, `${id.replace(/[^a-z0-9]/gi, "")}-`);
  inner.set(id, svg);
  return svg;
}
