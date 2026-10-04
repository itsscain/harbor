"use client";

import { useMemo, useOptimistic, useState } from "react";
import { Check, ChevronDown, ChevronRight, GraduationCap, Plus, Send, X } from "lucide-react";
import { Sheet, SheetActions, useSheetClose } from "@/components/ui/Sheet";
import { ActionForm, FormError } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ChipGroup } from "@/components/ui/Chips";
import { Stepper } from "@/components/ui/Stepper";
import { Toggle } from "@/components/ui/Toggle";
import { Button, Field, Input } from "@/components/ui/primitives";
import { useQuickAction } from "@/components/ui/useQuickAction";
import { saveLearnSettings, assignLesson, removeAssignment, restoreAssignment } from "@/app/app/(parent)/children/learn-actions";
import { GRADES, gradeIndex, type GradeId, type LearnProfile, type SubjectId } from "@/lib/learn/types";
import { COURSES, SUBJECT_LOOK, courseMap, lessonsForGrade } from "@/lib/learn/curriculum";
import { missionLesson } from "@/lib/learn/parent";
import { cn } from "@/lib/cn";

const SUBJECT_OPTIONS = [
  { value: "reading", label: "Reading", emoji: "📖" },
  { value: "math", label: "Math", emoji: "🔢" },
  { value: "code", label: "Code", emoji: "🧩" },
  { value: "manners", label: "Captain's Code", emoji: "⚓" },
];

/** The kid's learning settings as one calm row; the controls live in a sheet behind it. */
export function LearnSettingsRow({ kidId, kidName, profile, saved }: { kidId: string; kidName: string; profile: LearnProfile; saved: boolean }) {
  const [open, setOpen] = useState(false);
  const grade = GRADES.find((g) => g.id === profile.grade);
  const subjects = profile.subjects.map((s) => COURSES[s].title).join(", ");
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 text-left transition hover:bg-surface-2"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
          <GraduationCap className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-fg">
            {grade?.label ?? "Kindergarten"} · {profile.daily_goal} a day{profile.daily_limit ? ` (max ${profile.daily_limit})` : ""}
          </span>
          <span className="mt-0.5 block truncate text-sm text-fg-muted">
            {saved ? `${subjects} · ${profile.earn_stars ? "stars on" : "stars off"}` : `Guessed from ${kidName}'s age — tap to set`}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={`${kidName}'s learning`} description="Each subject starts a grade below theirs, so the first levels feel easy. Earlier islands stay open for review.">
        <LearnSettingsForm kidId={kidId} profile={profile} />
      </Sheet>
    </>
  );
}

function LearnSettingsForm({ kidId, profile }: { kidId: string; profile: LearnProfile }) {
  const [grade, setGrade] = useState<GradeId>(profile.grade);
  const [subjects, setSubjects] = useState<string[]>(profile.subjects);
  const [stars, setStars] = useState(profile.earn_stars);
  return (
    <ActionForm action={saveLearnSettings.bind(null, kidId)} success="Saved" className="space-y-5">
      <Field label="Grade level">
        <ChipGroup name="grade" options={GRADES.map((g) => ({ value: g.id, label: g.short }))} value={grade} onChange={(v) => v[0] && setGrade(v[0] as GradeId)} ariaLabel="Grade level" />
        <p className="mt-1.5 text-sm text-fg-muted">
          {GRADES.find((g) => g.id === grade)?.label} · {GRADES.find((g) => g.id === grade)?.age}
        </p>
      </Field>
      <Field label="Subjects" hint="Captain's Code teaches manners, kindness, common sense and attitude.">
        <ChipGroup name="subjects" multiple options={SUBJECT_OPTIONS} value={subjects} onChange={(v) => v.length && setSubjects(v)} ariaLabel="Subjects" />
      </Field>
      <Field label="Daily goal" hint="Levels a day. Each takes about 3–6 minutes.">
        <Stepper name="daily_goal" defaultValue={profile.daily_goal} min={1} max={10} presets={[1, 2, 3, 5]} label="Levels a day" />
      </Field>
      <Field label="Daily limit" hint="Most levels a day — 0 means no limit. After that, the wall says “come back tomorrow.”">
        <Stepper name="daily_limit" defaultValue={profile.daily_limit} min={0} max={20} presets={[0, 4, 6, 10]} label="Most levels a day" />
      </Field>
      <div className="rounded-xl border border-line px-3.5">
        <Toggle checked={stars} onChange={setStars} name="earn_stars" label="Earn wall stars" hint="1 star a passed level (2 for a perfect one), up to 10 a day, for the reward store." />
      </div>
      <FormError />
      <SheetActions>
        <SubmitButton size="lg" confirmSaved={false}>
          Save
        </SubmitButton>
      </SheetActions>
    </ActionForm>
  );
}

export type MissionRow = {
  id: string;
  lessonId: string;
  note: string | null;
  status: "assigned" | "done";
  when: string;
};

/** Missions: levels (or a Practice Cove) a grown-up picked. They show up first on the wall's Learn screen. */
export function MissionsCard({ kidId, kidName, grade, missions, bestStars, shaky }: { kidId: string; kidName: string; grade: GradeId; missions: MissionRow[]; bestStars: Record<string, number>; shaky: Partial<Record<SubjectId, number>> }) {
  const { run, pending } = useQuickAction();
  const [open, setOpen] = useState(false);
  const [gone, hide] = useOptimistic<string[], string>([], (cur, id) => [...cur, id]);
  const active = missions.filter((m) => m.status === "assigned" && !gone.includes(m.id));
  const done = missions.filter((m) => m.status === "done").slice(0, 3);
  const remove = (m: MissionRow) => run(() => removeAssignment(m.id), { optimistic: () => hide(m.id), undo: () => restoreAssignment(m.id) });

  return (
    <section>
      <div className="mb-2.5 mt-6 flex items-center justify-between gap-3">
        <h2 className="text-title text-fg">Missions</h2>
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Assign
        </Button>
      </div>
      {active.length === 0 && done.length === 0 ? (
        <button type="button" onClick={() => setOpen(true)} className="w-full rounded-2xl border border-dashed border-line-strong p-6 text-center transition hover:bg-surface">
          <p className="text-2xl" aria-hidden>
            🎯
          </p>
          <p className="mt-1 font-semibold text-fg">No missions yet</p>
          <p className="mt-0.5 text-sm text-fg-muted">Pick a level — or practice on what&rsquo;s tricky — and it&rsquo;s the first thing {kidName} sees on Learn.</p>
        </button>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {active.map((m) => {
            const l = missionLesson(m.lessonId);
            return (
              <li key={m.id} className="flex min-h-16 items-center gap-3 px-4 py-3">
                <span className="text-2xl leading-none" aria-hidden>
                  {l?.emoji ?? "🗂️"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-fg">{l ? `${l.kind === "lesson" ? `${l.label} ` : ""}${l.title}` : "An older lesson"}</span>
                  <span className="mt-0.5 block truncate text-sm text-fg-muted">
                    {l ? `${COURSES[l.subject].title} · ${m.note ? `“${m.note}”` : `assigned ${m.when}`}` : "Learn was updated — remove this and pick a new level"}
                  </span>
                </span>
                <button type="button" aria-label="Remove mission" disabled={pending} onClick={() => remove(m)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-fg-muted transition hover:bg-surface-2 hover:text-fg">
                  <X className="h-4 w-4" />
                </button>
              </li>
            );
          })}
          {done.map((m) => {
            const l = missionLesson(m.lessonId);
            if (!l) return null;
            return (
              <li key={m.id} className="flex min-h-14 items-center gap-3 px-4 py-2.5 opacity-80">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-good/15 text-good">
                  <Check className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[15px] text-fg">
                  {l.emoji} {l.kind === "lesson" ? `${l.label} ` : ""}
                  {l.title}
                </span>
                <span className="shrink-0 text-sm text-fg-muted">
                  {l.kind === "lesson" ? "⭐".repeat(Math.max(0, Math.min(3, bestStars[m.lessonId] ?? 0))) : ""} {m.when}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title="Assign a mission" description={`It shows up first on ${kidName}'s wall.`} size="lg">
        <AssignForm kidId={kidId} kidName={kidName} grade={grade} bestStars={bestStars} assignedIds={active.map((m) => m.lessonId)} shaky={shaky} />
      </Sheet>
    </section>
  );
}

function AssignForm({ kidId, kidName, grade, bestStars, assignedIds, shaky }: { kidId: string; kidName: string; grade: GradeId; bestStars: Record<string, number>; assignedIds: string[]; shaky: Partial<Record<SubjectId, number>> }) {
  const close = useSheetClose();
  const { run, pending } = useQuickAction();
  const [subject, setSubject] = useState<SubjectId>("reading");
  const [picked, setPicked] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [allGrades, setAllGrades] = useState(false);
  const map = useMemo(() => courseMap(subject, grade, (id) => (id in bestStars ? bestStars[id] : null), new Set(assignedIds)), [subject, grade, bestStars, assignedIds]);
  const fit = useMemo(() => new Set(lessonsForGrade(subject, grade).map((u) => u.id)), [subject, grade]);
  const units = allGrades ? map : map.filter((u) => fit.has(u.unit.id));
  const currentUnit = map.find((u) => u.lessons.some((l) => l.state === "next"))?.unit.id ?? units[0]?.unit.id;
  const [openUnit, setOpenUnit] = useState<string | null>(null);
  const shownUnit = openUnit ?? currentUnit;
  const look = SUBJECT_LOOK[subject];
  const pickedInfo = picked ? missionLesson(picked) : null;
  const practiceId = `practice:${subject}`;
  const tricky = shaky[subject] ?? 0;

  return (
    <div className="space-y-4 pb-1">
      {/* Focus lands here (not the note field), so a phone keyboard doesn't cover the list. */}
      <div data-autofocus tabIndex={-1} className="outline-none">
        <ChipGroup
          options={SUBJECT_OPTIONS}
          value={subject}
          onChange={(v) => {
            if (!v[0]) return;
            setSubject(v[0] as SubjectId);
            setOpenUnit(null);
            setPicked(null);
          }}
          ariaLabel="Subject"
        />
      </div>
      <button
        type="button"
        onClick={() => setPicked(picked === practiceId ? null : practiceId)}
        aria-pressed={picked === practiceId}
        className={cn("flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition", picked === practiceId ? "border-accent bg-accent/15" : "border-line hover:bg-surface-2")}
      >
        <span className="text-2xl" aria-hidden>
          🏝️
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-fg">Practice Cove — what&rsquo;s tricky</span>
          <span className="block text-sm text-fg-muted">{tricky ? `Builds a level from the ${tricky} ${COURSES[subject].title.toLowerCase()} skill${tricky === 1 ? "" : "s"} ${kidName} is still working on.` : `Brings back skills that are due for review (nothing's shaky right now).`}</span>
        </span>
        {picked === practiceId && <Check className="h-4 w-4 shrink-0 text-accent" />}
      </button>
      <div className="flex items-center justify-between gap-3 px-1 text-sm">
        <span className="text-fg-muted">{allGrades ? "All grades" : `Levels for ${GRADES.find((g) => g.id === grade)?.label ?? "their grade"} (a grade below to a grade above)`}</span>
        <button type="button" onClick={() => setAllGrades((a) => !a)} className="font-semibold text-accent">
          {allGrades ? "Fit to grade" : "Show all grades"}
        </button>
      </div>
      <div className="max-h-[42dvh] overflow-y-auto rounded-2xl border border-line">
        {units.map(({ unit, lessons }) => {
          const isOpen = unit.id === shownUnit;
          const doneN = lessons.filter((l) => l.state === "done").length;
          const far = Math.abs(gradeIndex(unit.grade) - gradeIndex(grade)) > 1;
          return (
            <div key={unit.id} className="border-b border-line last:border-b-0">
              <button type="button" onClick={() => setOpenUnit(isOpen ? "" : unit.id)} className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-surface-2" aria-expanded={isOpen}>
                <span className="text-xl" aria-hidden>
                  {unit.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-fg">
                    Island {unit.n}: {unit.title}
                  </span>
                  <span className="block text-xs text-fg-muted">
                    {GRADES.find((g) => g.id === unit.grade)?.short}
                    {far ? " · outside their grade" : ""} · {doneN}/{lessons.length} passed
                  </span>
                </span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-fg-subtle transition-transform", isOpen && "rotate-180")} />
              </button>
              {isOpen && (
                <ul className="pb-2">
                  {lessons.map(({ lesson: l, state, label, stars }) => {
                    const on = picked === l.id;
                    return (
                      <li key={l.id}>
                        <button
                          type="button"
                          onClick={() => setPicked(on ? null : l.id)}
                          aria-pressed={on}
                          className={cn("mx-2 flex min-h-12 w-[calc(100%-1rem)] items-center gap-3 rounded-xl px-3 py-2 text-left transition", on ? "bg-accent/15 ring-1 ring-accent" : "hover:bg-surface-2")}
                        >
                          <span className="w-10 shrink-0 text-xs font-bold tabular-nums text-fg-muted">{label}</span>
                          <span className="text-lg" aria-hidden>
                            {l.kind === "boss" ? "🐙" : l.kind === "review" ? "🗺️" : l.emoji}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[15px] text-fg">{l.title}</span>
                          {state === "done" ? (
                            <span className="shrink-0 text-xs">{"⭐".repeat(Math.min(3, stars))}</span>
                          ) : state === "next" ? (
                            <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: `${look.to}22`, color: look.to }}>
                              Up next
                            </span>
                          ) : null}
                          {on && <Check className="h-4 w-4 shrink-0 text-accent" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
      <Field label="A note (optional)" htmlFor="learn-note" hint="Shows under the mission on the wall.">
        <Input id="learn-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} placeholder="You've got this!" />
      </Field>
      <SheetActions>
        <Button size="lg" className="w-full sm:w-auto" disabled={!picked || pending} onClick={() => picked && run(() => assignLesson(kidId, picked, note || null), { onDone: () => close?.() })}>
          <Send className="h-4 w-4" /> {pickedInfo ? `Send “${pickedInfo.title}” to ${kidName}` : "Pick a level"}
        </Button>
      </SheetActions>
    </div>
  );
}
