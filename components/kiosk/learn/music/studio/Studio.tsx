"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Lock, Minus, Pencil, Plus, Save, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { bandOf, type GradeId } from "@/lib/learn/types";
import type { KidLearn } from "@/lib/learn/progress";
import type { BoatLook } from "@/lib/learn/meta";
import type { DrumId, InstId } from "@/lib/learn/mus/types";
import { say } from "@/lib/learn/audio";
import { sfx } from "@/lib/learn/sfx";
import { SAY } from "@/lib/learn/script";
import { DRUMS, INSTRUMENTS } from "@/lib/learn/mus/catalog";
import { NOTE_ORDER, studioPowers, type Powers } from "@/lib/learn/mus/powers";
import { GROOVES, type ChordStyle, type Groove } from "@/lib/learn/mus/score";
import { SCALES, noteName, scale as scaleOf, tempoWord, type ScaleKind } from "@/lib/learn/mus/theory";
import { SECTION_IDS, SECTION_PARTS, SLOTS_PER_BAR, STEPS_PER_BAR, chordTonesAt, loopScore, newSong, songIsEmpty, songScoreOf, type SectionId, type StudioSong } from "@/lib/learn/mus/song";
import { playDrum } from "@/lib/learn/mus/synth";
import { Chunk } from "../../kit";
import { Glyph } from "../../art/Glyph";
import { usePlayer } from "../kit/player";
import { InstrumentPic, PlayButton, SoundOffNote } from "../kit/kit";
import { BeatGrid } from "../kit/BeatGrid";
import { MelodyGrid } from "../kit/MelodyGrid";
import { ChordStrip } from "../kit/ChordStrip";
import { Concert } from "./Concert";
import { MySongs } from "./MySongs";
import { NamePicker, coverPic, randomTitle } from "./NamePicker";

// The Studio — where kids make their own songs with everything they've learned. A beat (the Beat
// Lab grid), a tune (the note grid, in the notes and scales they've met), chords and a bass line, words,
// and the order of the song's sections — then a concert on their boat for their aquarium friends.
// It grows as they learn: every drum, note, instrument, scale, groove and tool here is unlocked by
// passing a music level (lib/learn/mus/powers.ts). Songs are kept in My Songs and sync home, so a
// grown-up can hear them on their phone.

export type StudioProps = {
  kid: KidLearn;
  grade: GradeId;
  look: BoatLook;
  reduced: boolean;
  /** Aquarium friends who come to the concert (creature id + how big it's grown). */
  audience: { id: string; scale: number }[];
  onBack: () => void;
  onSave: (song: StudioSong) => void;
  onDelete: (id: string) => void;
};

type Tab = "beat" | "tune" | "chords" | "words" | "song" | "songs";
const freshId = () => `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const nowIso = () => new Date().toISOString();
const MAJOR_PALETTE = ["I", "ii", "iii", "IV", "V", "vi"];
const MINOR_PALETTE = ["i", "iv", "v", "VI", "III", "VII"];
const CHORD_INSTS: InstId[] = ["piano", "guitar", "ukulele", "organ", "strings", "pad", "harp", "marimba", "synth", "accordion"];
const STYLES: { id: ChordStyle; label: string }[] = [
  { id: "strum", label: "Strum" },
  { id: "block", label: "Hold" },
  { id: "arp", label: "Ripple" },
  { id: "pulse", label: "Pulse" },
  { id: "pad", label: "Dreamy" },
];
const KEYS = [57, 58, 60, 62, 63, 64, 65, 67];
const MINORISH = (s: ScaleKind) => s === "minor" || s === "minorPenta" || s === "harmonic" || s === "dorian" || s === "phrygian" || s === "blues";

function starter(p: Powers): StudioSong {
  const rows: DrumId[] = ["kick", "clap", ...(["shaker", "snare", "hat"] as DrumId[]).filter((d) => p.drums.includes(d)).slice(0, 1)];
  return { ...newSong(freshId(), { rows, inst: "bells", scale: "sml", title: randomTitle() }), at: nowIso() };
}
/** The melody rows for a song: its scale, or (little ones) the solfège notes they've met. */
function melodyPitches(s: StudioSong, p: Powers): number[] {
  if (s.scale !== "sml" && s.scale !== "somi" && s.scale in SCALES) return scaleOf(s.key, s.scale, 1, true);
  const semis = NOTE_ORDER.filter((n) => p.notes.includes(n.syl)).map((n) => n.semis);
  return (semis.length >= 2 ? semis : [4, 7, 9]).map((x) => s.key + x);
}
/** A drum groove squeezed onto the 8-steps-a-bar grid (16ths fold into their 8th). */
function grooveRows(g: Groove, p: Powers): { rows: DrumId[]; grid: string[] } | null {
  const G = GROOVES[g];
  if (G.meter[0] !== 4 && G.meter[0] !== 2) return null;
  const rows: DrumId[] = [];
  const grid: string[] = [];
  for (const [k, pat] of Object.entries(G.rows) as [DrumId, string][]) {
    if (!p.drums.includes(k) && k !== "kick" && k !== "clap") continue;
    let eighths = G.per === 4 ? Array.from({ length: pat.length / 2 }, (_, i) => (pat[i * 2] !== "." || pat[i * 2 + 1] !== "." ? "x" : ".")).join("") : pat;
    while (eighths.length < STEPS_PER_BAR) eighths += eighths;
    rows.push(k);
    grid.push(eighths.slice(0, STEPS_PER_BAR).replace(/X/g, "x"));
  }
  return rows.length ? { rows: rows.slice(0, 6), grid: grid.slice(0, 6) } : null;
}
/** Change a song's loop length, repeating what's there into the new bars. */
function resize(s: StudioSong, bars: 1 | 2 | 4): StudioSong {
  const steps = bars * STEPS_PER_BAR;
  const slots = bars * SLOTS_PER_BAR;
  const rep = <T,>(xs: T[], n: number, empty: T) => Array.from({ length: n }, (_, i) => (xs.length ? xs[i % xs.length] : empty));
  return {
    ...s,
    bars,
    beat: { rows: s.beat.rows, grid: s.beat.grid.map((g) => rep(g.split(""), steps, ".").join("")) },
    melody: { ...s.melody, notes: rep(s.melody.notes, slots, null) },
    chords: { ...s.chords, romans: rep(s.chords.romans, bars, "I") },
  };
}

export function Studio({ kid, grade, look, reduced, audience, onBack, onSave, onDelete }: StudioProps) {
  const powers = useMemo(() => studioPowers(grade, (id) => kid.lessons[id]?.stars ?? null), [grade, kid.lessons]);
  const little = bandOf(grade) !== "big";
  const [song, setSong] = useState<StudioSong>(() => kid.songs[0] ?? starter(powers));
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<Tab>("beat");
  const [naming, setNaming] = useState(false);
  const [concert, setConcert] = useState(false);
  const [page, setPage] = useState(0);
  const [adding, setAdding] = useState(false);
  const [savedFlash, setSavedFlash] = useState(0);
  const spoken = useRef(new Set<string>());
  const player = usePlayer();
  const has = (tool: string) => powers.tools.has(tool);

  const restart = (next: StudioSong) => {
    const cur = player.current();
    if (!cur || !player.playing) return;
    const b = Math.max(0, cur.beat());
    player.play(loopScore(next), { loop: true, from: b });
  };
  const update = (fn: (s: StudioSong) => StudioSong) => {
    const next = fn(song);
    setSong(next);
    restart(next);
    setDirty(true);
  };
  const toggle = () => {
    sfx("tap");
    if (player.playing) player.stop();
    else player.play(loopScore(song), { loop: true });
  };
  const keep = (s: StudioSong = song) => {
    if (songIsEmpty(s)) return;
    onSave({ ...s, at: nowIso() });
    setDirty(false);
  };
  const go = (t: Tab) => {
    sfx("pick");
    setTab(t);
    const line = t === "beat" ? SAY.studioBeat : t === "tune" ? SAY.studioTune : t === "chords" ? SAY.studioChords : null;
    if (little && line && !spoken.current.has(t)) {
      spoken.current.add(t);
      void say(line);
    }
  };

  const steps = song.bars * STEPS_PER_BAR;
  // One bar at a time (8 eighth-note steps), so the beats always group the way kids learn them.
  const pageBars = 1;
  const pages = Math.ceil(song.bars / pageBars);
  const off = page * pageBars * STEPS_PER_BAR;
  const span = pageBars * STEPS_PER_BAR;
  const beat = player.beat;
  const playStep = player.playing && beat !== null && beat >= 0 ? Math.floor(beat * 2) % steps : -1;
  const pagePlay = playStep >= off && playStep < off + span ? playStep - off : -1;
  const mpitches = melodyPitches(song, powers);
  const palette = MINORISH(song.scale) ? MINOR_PALETTE : MAJOR_PALETTE;

  const tabs: { id: Tab; label: string; icon: ReactNode; lock?: string }[] = [
    { id: "beat", label: "Beat", icon: <InstrumentPic id="drumkit" size={40} /> },
    { id: "tune", label: "Tune", icon: <InstrumentPic id="bells" size={40} /> },
    { id: "chords", label: "Chords", icon: <InstrumentPic id="piano" size={40} />, lock: has("chords") ? undefined : "chords" },
    { id: "words", label: "Words", icon: <Glyph e="🎤" size={36} />, lock: has("lyrics") ? undefined : "lyrics" },
    { id: "song", label: "Song", icon: <InstrumentPic id="mixer" size={40} />, lock: has("sections") ? undefined : "sections" },
    { id: "songs", label: `My Songs${kid.songs.length ? ` (${kid.songs.length})` : ""}`, icon: <InstrumentPic id="vinyl" size={40} /> },
  ];

  if (concert) return <Concert song={song} look={look} audience={audience} reduced={reduced} onClose={() => setConcert(false)} />;

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-3 px-4 pb-8 pt-1 sm:px-6">
      {/* Top: back · the song's name · keep it · concert */}
      <div className="flex flex-wrap items-center gap-3">
        <Chunk tone="white" aria-label="Back" onClick={() => (sfx("tap"), player.stop(), dirty && keep(), onBack())} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full" style={{ borderRadius: 999 }}>
          <ArrowLeft className="h-7 w-7 text-[var(--l-ink)]" strokeWidth={3} />
        </Chunk>
        <button type="button" onClick={() => (sfx("tap"), void say(SAY.studioName), setNaming(true))} className="flex min-w-0 items-center gap-2 rounded-full bg-white/95 py-1.5 pl-2 pr-4 shadow-[0_4px_0_rgba(90,20,80,0.18)]">
          <Glyph e={coverPic(song.title)} size={42} />
          <span className="truncate font-display text-2xl font-extrabold text-[#5b0f6e]">{song.title}</span>
          <Pencil className="h-5 w-5 shrink-0 text-[#d9408f]" />
        </button>
        <div className="ml-auto flex items-center gap-2">
          <Chunk tone={dirty ? "green" : "white"} onClick={() => (sfx("pick"), keep(), setSavedFlash((n) => n + 1), void say(SAY.songSaved))} disabled={songIsEmpty(song)} className="flex h-14 items-center gap-2 px-5 font-display text-lg font-extrabold">
            <Save className={cn("h-6 w-6", !dirty && "text-[var(--l-ink-2)]")} /> {dirty ? "Keep it!" : "Kept"}
          </Chunk>
          <Chunk tone="violet" onClick={() => (sfx("pick"), player.stop(), dirty && keep(), void say(SAY.studioConcert), setConcert(true))} disabled={songIsEmpty(song)} className="flex h-14 items-center gap-2 px-5 font-display text-lg font-extrabold">
            <Glyph e="🎤" size={30} /> Concert!
          </Chunk>
        </div>
      </div>
      {savedFlash > 0 && <span key={savedFlash} className="l-pop-in self-end rounded-full bg-[var(--l-green)] px-4 py-1 font-display text-base font-extrabold text-white">Saved in My Songs!</span>}
      <SoundOffNote />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => (t.lock ? (sfx("soft-fail"), void say(SAY.studioLocked)) : go(t.id))}
            className={cn("relative flex h-[62px] items-center gap-2 rounded-[20px] px-4 font-display text-lg font-extrabold transition-transform", tab === t.id ? "bg-white text-[#5b0f6e] shadow-[0_5px_0_rgba(90,20,80,0.2)]" : "bg-white/25 text-white", t.lock && "opacity-60")}
          >
            {t.icon}
            {t.label}
            {t.lock && <Lock className="h-5 w-5" />}
          </button>
        ))}
      </div>

      {/* The workbench */}
      <div className="rounded-[30px] bg-white/95 p-4 shadow-[0_8px_0_rgba(90,20,80,0.16)]">
        {tab === "beat" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {song.beat.rows.map((r, i) => (
                <span key={r} className="flex items-center gap-1 rounded-full bg-[var(--l-card-2)] py-1 pl-1 pr-2">
                  <button type="button" onPointerDown={() => playDrum(r)} aria-label={`Hear ${DRUMS[r].name}`}>
                    <InstrumentPic id={r} size={34} />
                  </button>
                  <span className="font-display text-sm font-extrabold text-[var(--l-ink)]">{DRUMS[r].name}</span>
                  {song.beat.rows.length > 1 && (
                    <button type="button" aria-label={`Remove ${DRUMS[r].name}`} onClick={() => update((s) => ({ ...s, beat: { rows: s.beat.rows.filter((_, k) => k !== i), grid: s.beat.grid.filter((_, k) => k !== i) } }))} className="ml-1 rounded-full p-0.5 text-[var(--l-ink-2)]">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </span>
              ))}
              {song.beat.rows.length < 6 && powers.drums.some((d) => !song.beat.rows.includes(d)) && (
                <Chunk tone="blue" onClick={() => (sfx("tap"), setAdding(!adding))} className="flex h-10 items-center gap-1 px-3 font-display text-sm font-extrabold">
                  <Plus className="h-5 w-5" /> Add a drum
                </Chunk>
              )}
              {powers.grooves.length > 0 && <span className="ml-auto font-display text-sm font-extrabold text-[var(--l-ink-2)]">Grooves:</span>}
              {powers.grooves.map((g) => {
                const gr = grooveRows(g, powers);
                if (!gr) return null;
                return (
                  <button key={g} type="button" onClick={() => (sfx("pick"), update((s) => ({ ...s, swing: has("swing") ? (GROOVES[g].swing ?? 0) : 0, beat: { rows: gr.rows, grid: gr.grid.map((x) => x.repeat(s.bars)) } })))} className="rounded-full bg-[#ffe3f0] px-3 py-1.5 font-display text-sm font-extrabold capitalize text-[#5b0f6e]">
                    {g}
                  </button>
                );
              })}
            </div>
            {adding && (
              <div className="flex flex-wrap gap-2 rounded-[20px] bg-[var(--l-card-2)] p-2">
                {powers.drums
                  .filter((d) => !song.beat.rows.includes(d))
                  .map((d) => (
                    <button key={d} type="button" onClick={() => (playDrum(d), setAdding(false), update((s) => ({ ...s, beat: { rows: [...s.beat.rows, d], grid: [...s.beat.grid, ".".repeat(s.bars * STEPS_PER_BAR)] } })))} className="flex flex-col items-center gap-0.5 rounded-[16px] bg-white p-2">
                      <InstrumentPic id={d} size={48} />
                      <span className="font-display text-xs font-extrabold">{DRUMS[d].name}</span>
                    </button>
                  ))}
              </div>
            )}
            <BeatGrid
              rows={song.beat.rows}
              steps={span}
              grid={song.beat.grid.map((g) => g.slice(off, off + span))}
              playStep={pagePlay}
              size={little ? "lg" : "md"}
              onChange={(part) => update((s) => ({ ...s, beat: { ...s.beat, grid: s.beat.grid.map((g, i) => g.slice(0, off) + (part[i] ?? g.slice(off, off + span)) + g.slice(off + span)) } }))}
            />
          </div>
        )}
        {tab === "tune" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {powers.insts.map((id) => (
                <button key={id} type="button" onClick={() => (sfx("pick"), update((s) => ({ ...s, melody: { ...s.melody, inst: id } })))} className={cn("flex items-center gap-1 rounded-full py-1 pl-1 pr-3 font-display text-sm font-extrabold", song.melody.inst === id ? "bg-[#ff6fb5] text-white" : "bg-[var(--l-card-2)] text-[var(--l-ink)]")}>
                  <InstrumentPic id={id} size={32} /> {INSTRUMENTS[id].name}
                </button>
              ))}
            </div>
            {powers.scales.some((x) => x !== "sml") && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-sm font-extrabold text-[var(--l-ink-2)]">Notes:</span>
                {(["sml", ...powers.scales.filter((x) => x !== "sml" && x !== "somi")] as ScaleKind[]).map((k) => (
                  <button key={k} type="button" onClick={() => (sfx("pick"), update((s) => ({ ...s, scale: k, melody: { ...s.melody, notes: s.melody.notes.map(() => null) } })))} className={cn("rounded-full px-3 py-1.5 font-display text-sm font-extrabold", song.scale === k ? "bg-[#8b6cff] text-white" : "bg-[#efe9ff] text-[#5b3fb8]")}>
                    {k === "sml" ? "My notes" : ({ major: "Major", minor: "Minor", penta: "Pentatonic", minorPenta: "Minor penta", blues: "Blues", dorian: "Dorian", mixolydian: "Mixolydian", lydian: "Lydian", phrygian: "Phrygian", harmonic: "Harmonic minor", chromatic: "All 12" } as Record<string, string>)[k] ?? k}
                  </button>
                ))}
              </div>
            )}
            <MelodyGrid
              pitches={mpitches}
              tonic={song.key}
              labels={bandOf(grade) === "little" ? "colors" : little ? "solfege" : "letters"}
              inst={song.melody.inst}
              holds={has("holds")}
              bar={SLOTS_PER_BAR}
              size={bandOf(grade) === "little" ? "lg" : "md"}
              playSlot={pagePlay}
              fits={song.chords.on ? (slot) => chordTonesAt(song, slot + off) : undefined}
              notes={song.melody.notes.slice(off, off + span).map((n) => (typeof n === "number" ? song.key + n : n))}
              onChange={(part) => update((s) => ({ ...s, melody: { ...s.melody, notes: [...s.melody.notes.slice(0, off), ...part.map((n) => (typeof n === "number" ? n - s.key : n)), ...s.melody.notes.slice(off + span)] } }))}
            />
          </div>
        )}
        {tab === "chords" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {STYLES.map((st) => (
                <button key={st.id} type="button" onClick={() => (sfx("pick"), update((s) => ({ ...s, chords: { ...s.chords, style: st.id } })))} className={cn("rounded-full px-3 py-1.5 font-display text-sm font-extrabold", song.chords.style === st.id ? "bg-[#8b6cff] text-white" : "bg-[#efe9ff] text-[#5b3fb8]")}>
                  {st.label}
                </button>
              ))}
              <span className="mx-1 h-6 w-px bg-[var(--l-line)]" />
              {CHORD_INSTS.filter((i) => powers.insts.includes(i) || i === "piano").map((id) => (
                <button key={id} type="button" onClick={() => (sfx("pick"), update((s) => ({ ...s, chords: { ...s.chords, inst: id } })))} className={cn("flex items-center gap-1 rounded-full py-1 pl-1 pr-3 font-display text-sm font-extrabold", song.chords.inst === id ? "bg-[#ff6fb5] text-white" : "bg-[var(--l-card-2)] text-[var(--l-ink)]")}>
                  <InstrumentPic id={id} size={30} /> {INSTRUMENTS[id].name}
                </button>
              ))}
              {has("bass") && (
                <button type="button" onClick={() => (sfx("pick"), update((s) => ({ ...s, bass: { ...s.bass, on: !s.bass.on, inst: powers.insts.includes("synthbass") && s.bass.inst === "bass" && s.bass.on ? "synthbass" : s.bass.inst } })))} className={cn("ml-auto flex items-center gap-1 rounded-full py-1 pl-1 pr-3 font-display text-sm font-extrabold", song.bass.on ? "bg-[#22c59b] text-white" : "bg-[var(--l-card-2)] text-[var(--l-ink)]")}>
                  <InstrumentPic id={song.bass.inst} size={30} /> Bass {song.bass.on ? "on" : "off"}
                </button>
              )}
            </div>
            <ChordStrip
              palette={palette}
              tonic={song.key}
              scale={MINORISH(song.scale) ? "minor" : "major"}
              inst={song.chords.inst}
              playBar={playStep >= 0 ? Math.floor(playStep / STEPS_PER_BAR) : -1}
              value={song.chords.on ? song.chords.romans : song.chords.romans.map(() => null)}
              onChange={(v) => update((s) => ({ ...s, chords: { ...s.chords, on: v.some(Boolean), romans: v.map((x, i) => x ?? s.chords.romans[i] ?? "I") } }))}
            />
          </div>
        )}
        {tab === "words" && (
          <div className="flex flex-col gap-2">
            <p className="font-display text-base font-bold text-[var(--l-ink-2)]">One line for each bar — they roll by in your concert.</p>
            {Array.from({ length: Math.max(1, song.bars) }, (_, i) => (
              <input
                key={i}
                value={song.lyrics[i] ?? ""}
                maxLength={60}
                placeholder={["Sailing on the moonlight sea", "My dolphin friend is here with me", "Waves go up and waves go down", "We sing the song all over town"][i % 4]}
                onChange={(e) => {
                  const v = e.target.value;
                  setSong((s) => {
                    const lyrics = Array.from({ length: Math.max(s.lyrics.length, i + 1) }, (_, k) => (k === i ? v : (s.lyrics[k] ?? "")));
                    return { ...s, lyrics: lyrics.slice(0, 8) };
                  });
                  setDirty(true);
                }}
                className="h-14 rounded-[18px] border-[3px] border-[var(--l-line)] bg-white px-4 font-display text-xl font-bold text-[var(--l-ink)] outline-none focus:border-[#ff6fb5]"
              />
            ))}
          </div>
        )}
        {tab === "song" && (
          <div className="flex flex-col gap-3">
            <p className="font-display text-base font-bold text-[var(--l-ink-2)]">Build your song: add sections in order. Each one plays your loop with different parts.</p>
            <div className="flex flex-wrap gap-2">
              {SECTION_IDS.map((id: SectionId) => (
                <button key={id} type="button" disabled={song.sections.length >= 10} onClick={() => (sfx("pick"), update((s) => ({ ...s, sections: [...s.sections, id] })))} className="flex h-14 items-center gap-1.5 rounded-[18px] px-4 font-display text-lg font-extrabold text-white shadow-[0_4px_0_rgba(0,0,0,0.15)]" style={{ background: SECTION_PARTS[id].color }}>
                  <Plus className="h-5 w-5" /> {SECTION_PARTS[id].name}
                </button>
              ))}
            </div>
            <div className="flex min-h-[86px] flex-wrap items-center gap-2 rounded-[20px] bg-[var(--l-card-2)] p-3">
              {song.sections.length === 0 && <span className="font-display text-lg font-bold text-[var(--l-ink-2)]">No sections yet — your loop plays twice.</span>}
              {song.sections.map((id, i) => {
                const pp = SECTION_PARTS[id];
                return (
                  <button key={i} type="button" onClick={() => (sfx("tap"), update((s) => ({ ...s, sections: s.sections.filter((_, k) => k !== i) })))} className="flex flex-col items-center rounded-[16px] px-3 py-1.5 text-white" style={{ background: pp.color }} aria-label={`Remove ${pp.name}`}>
                    <span className="font-display text-base font-extrabold">{pp.name}</span>
                    <span className="flex gap-0.5 text-[10px] font-bold opacity-90">{[pp.beat && "beat", pp.bass && "bass", pp.chords && "chords", pp.melody && "tune"].filter(Boolean).join(" · ")}</span>
                  </button>
                );
              })}
            </div>
            {song.sections.length > 0 && (
              <Chunk tone="violet" onClick={() => (sfx("pick"), player.play(songScoreOf(song)))} className="self-start h-12 px-5 font-display text-lg font-extrabold">
                Play the whole song
              </Chunk>
            )}
          </div>
        )}
        {tab === "songs" && (
          <MySongs
            songs={kid.songs}
            current={song.id}
            onOpen={(s) => {
              player.stop();
              setSong(s);
              setDirty(false);
              setPage(0);
              setTab("beat");
            }}
            onNew={() => {
              player.stop();
              if (dirty) keep();
              setSong(starter(powers));
              setDirty(false);
              setPage(0);
              setTab("beat");
            }}
            onDelete={(id) => {
              onDelete(id);
              if (id === song.id) {
                setSong(starter(powers));
                setDirty(false);
              }
            }}
          />
        )}
      </div>

      {/* Transport: play · tempo · swing · loop length · key · pages */}
      {tab !== "songs" && (
        <div className="flex flex-wrap items-center gap-3 rounded-[26px] bg-white/25 p-3">
          <PlayButton size={84} playing={player.playing} onClick={toggle} pulse />
          {has("tempo") ? (
            <div className="flex items-center gap-2 rounded-full bg-white/95 p-1.5">
              <Chunk tone="white" aria-label="Slower" onClick={() => update((s) => ({ ...s, bpm: Math.max(60, s.bpm - 6) }))} className="flex h-11 w-11 items-center justify-center rounded-full" style={{ borderRadius: 999 }}>
                <Minus className="h-5 w-5" />
              </Chunk>
              <span className="min-w-[120px] text-center font-display text-lg font-extrabold text-[var(--l-ink)]">
                {song.bpm} bpm <span className="block text-xs text-[var(--l-ink-2)]">{tempoWord(song.bpm)}</span>
              </span>
              <Chunk tone="white" aria-label="Faster" onClick={() => update((s) => ({ ...s, bpm: Math.min(180, s.bpm + 6) }))} className="flex h-11 w-11 items-center justify-center rounded-full" style={{ borderRadius: 999 }}>
                <Plus className="h-5 w-5" />
              </Chunk>
            </div>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-white/30 px-3 py-2 font-display text-sm font-extrabold text-white/90">
              <Lock className="h-4 w-4" /> Speed dial
            </span>
          )}
          {has("swing") && (
            <button type="button" onClick={() => (sfx("pick"), update((s) => ({ ...s, swing: s.swing ? 0 : 0.28 })))} className={cn("h-12 rounded-full px-4 font-display text-base font-extrabold", song.swing ? "bg-[#ffc83d] text-[#5a3b00]" : "bg-white/95 text-[var(--l-ink)]")}>
              Swing {song.swing ? "on" : "off"}
            </button>
          )}
          {(has("bars2") || has("bars4")) && (
            <div className="flex items-center gap-1 rounded-full bg-white/95 p-1">
              {([1, 2, 4] as const)
                .filter((b) => b === 1 || (b === 2 && (has("bars2") || has("bars4"))) || (b === 4 && has("bars4")))
                .map((b) => (
                  <button key={b} type="button" onClick={() => (sfx("pick"), setPage(0), update((s) => resize(s, b)))} className={cn("h-10 rounded-full px-3 font-display text-sm font-extrabold", song.bars === b ? "bg-[#8b6cff] text-white" : "text-[var(--l-ink)]")}>
                    {b} bar{b > 1 ? "s" : ""}
                  </button>
                ))}
            </div>
          )}
          {has("keys") && (
            <div className="flex items-center gap-1 rounded-full bg-white/95 p-1">
              {KEYS.map((k) => (
                <button key={k} type="button" onClick={() => (sfx("pick"), update((s) => ({ ...s, key: k })))} className={cn("h-10 min-w-10 rounded-full px-2 font-display text-sm font-extrabold", song.key === k ? "bg-[#ff6fb5] text-white" : "text-[var(--l-ink)]")}>
                  {noteName(k, { flats: true })}
                </button>
              ))}
            </div>
          )}
          {pages > 1 && (
            <div className="ml-auto flex items-center gap-1 rounded-full bg-white/95 p-1">
              {Array.from({ length: pages }, (_, k) => (
                <button key={k} type="button" onClick={() => (sfx("tap"), setPage(k))} className={cn("h-10 rounded-full px-3 font-display text-sm font-extrabold", page === k ? "bg-[#ff6fb5] text-white" : "text-[var(--l-ink)]")}>
                  Bar {k + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {naming && (
        <NamePicker
          title={song.title}
          onClose={() => setNaming(false)}
          onPick={(t) => {
            setNaming(false);
            update((s) => ({ ...s, title: t }));
          }}
        />
      )}
    </div>
  );
}
