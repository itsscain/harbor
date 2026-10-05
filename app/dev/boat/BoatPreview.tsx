"use client";

import { useState } from "react";
import { DEFAULT_LOOK, SHOP, type BoatLook } from "@/lib/learn/boats";
import { SideBoat, TopBoat } from "@/components/kiosk/learn/boat/Boat";
import { Pet, type PetReact } from "@/components/kiosk/learn/boat/Pet";
import { RIG_BY_ID } from "@/components/kiosk/learn/boat/pets";

const of = (slot: string) => SHOP.filter((i) => i.slot === slot);
const SHOWCASE: Partial<BoatLook>[] = [
  { hull: "hull-coral", sail: "sail-white", pet: "pet-parrot", trail: "trail-sparkles" },
  { hull: "hull-sky", sail: "sail-stripes", paint: "paint-waves", pet: "pet-dog", figure: "fig-dolphin" },
  { hull: "hull-orange", sail: "sail-bolt", paint: "paint-stripe", pet: "pet-cat", deck: ["gear-bell", "gear-lantern"] },
  { hull: "hull-navy", sail: "sail-stars", paint: "paint-gold", pet: "pet-penguin", figure: "fig-mermaid", deck: ["gear-nest", "gear-ring"] },
  { hull: "hull-white", sail: "sail-sunburst", paint: "paint-hearts", pet: "pet-bunny", deck: ["gear-bunting", "gear-flowers"] },
  { hull: "hull-wood", sail: "sail-stripes", paint: "paint-plain", pet: "pet-owl", figure: "fig-dragon" },
  { hull: "hull-sun", sail: "sail-rainbow", paint: "paint-plain", pet: "pet-frog" },
  { hull: "hull-ink", sail: "sail-pirate", paint: "paint-shark", flag: "flag-pirate", pet: "pet-parrot", deck: ["gear-chest", "gear-wheel"] },
];

export function BoatPreview({ night }: { night: boolean }) {
  const [react, setReact] = useState<PetReact>(null);
  const k = react?.k ?? 0;
  const models = of("boat");
  return (
    <div className="min-h-screen overflow-y-auto bg-[linear-gradient(180deg,#bfe9ff,#4fb6ea)] p-6 font-display">
      <div className="mb-4 flex gap-3">
        <button className="rounded-xl bg-white px-4 py-2 font-bold" onClick={() => setReact({ mood: "cheer", k: k + 1 })}>Cheer!</button>
        <button className="rounded-xl bg-white px-4 py-2 font-bold" onClick={() => setReact({ mood: "oops", k: k + 1 })}>Oops</button>
      </div>
      <h2 className="mb-2 text-2xl font-extrabold text-white">Models</h2>
      <div className="grid grid-cols-4 gap-4">
        {models.map((b, i) => (
          <div key={b.id} className="flex flex-col items-center rounded-3xl bg-white/30 p-2">
            <SideBoat look={{ ...DEFAULT_LOOK, ...SHOWCASE[i], boat: b.id }} size={250} sea showTrail night={night} petReact={react} petTappable />
            <div className="flex items-center gap-3">
              <span className="font-bold text-white">{b.name}</span>
              <TopBoat look={{ ...DEFAULT_LOOK, ...SHOWCASE[i], boat: b.id }} size={70} />
            </div>
          </div>
        ))}
      </div>
      {(["paint", "sail", "flag", "figure", "deck", "trail"] as const).map((slot) => (
        <div key={slot}>
          <h2 className="mb-2 mt-6 text-2xl font-extrabold capitalize text-white">{slot}</h2>
          <div className="grid grid-cols-6 gap-3">
            {of(slot).map((it) => (
              <div key={it.id} className="flex flex-col items-center rounded-2xl bg-white/30 p-1">
                <SideBoat
                  look={{ ...DEFAULT_LOOK, hull: slot === "paint" ? "hull-sky" : "hull-coral", ...(slot === "deck" ? { deck: [it.id] } : { [slot]: it.id }) }}
                  size={150}
                  showTrail={slot === "trail"}
                  night={night}
                  bob={false}
                />
                <span className="text-sm font-bold text-white">{it.name}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      <h2 className="mb-2 mt-6 text-2xl font-extrabold text-white">Pets (tap one)</h2>
      <div className="grid grid-cols-8 gap-3">
        {of("pet").map((p) => (
          <div key={p.id} className="flex flex-col items-center rounded-2xl bg-white/40 p-2">
            {RIG_BY_ID.has(p.id) ? <Pet id={p.id} size={120} react={react} tappable mood={night ? "sleep" : "idle"} /> : <div className="flex h-[120px] w-[120px] items-center justify-center text-white/70">not drawn</div>}
            <span className="text-sm font-bold text-white">{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
