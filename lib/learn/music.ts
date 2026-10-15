import type { Course } from "./types";
import { buildWorlds, makeItemsFor, type WorldDef } from "./gen";
import { WORLDS as K1 } from "./mus/content/k1";
import { WORLDS as G23 } from "./mus/content/g23";
import { WORLDS as G45 } from "./mus/content/g45";
import { WORLDS as G6 } from "./mus/content/g6";
import { WORLDS as G78 } from "./mus/content/g78";

// Music — Kindergarten through 8th grade. Kids hear it, read it, play it and MAKE it: the steady
// beat and rhythm (Kodály syllables: ta, ti-ti…), pitch and solfège (so-mi → the whole scale), the
// staff, the keyboard, instruments and families, meter, form, dynamics and tempo, chords and
// progressions, scales and keys, songwriting and lyrics, beat-making and production, sound science
// and music history. Every level teaches first (an explainer you can hear), practices with real
// sound (tap it, play it, sort it, build it), then lets the child create — and what they learn
// unlocks new powers in their Studio (lib/learn/mus/powers.ts), where they make their own songs.
//
// Engine + theory: lib/learn/mus/*. Content: lib/learn/mus/content/* (one file per grade band).
// UI: components/kiosk/learn/music/*. Skill keys "u:<family>[:<detail>]".

const WORLDS: WorldDef[] = [...K1, ...G23, ...G45, ...G6, ...G78];

export const MUSIC: Course = {
  id: "music",
  title: "Music",
  emoji: "🎵",
  tagline: "Make your own songs",
  units: buildWorlds("music", "mus", WORLDS, 0),
  itemsFor: makeItemsFor(WORLDS),
};
