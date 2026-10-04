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
import { GRADES, type GradeId, type LearnProfile, type SubjectId } from "@/lib/learn/types";
import { COURSES, SUBJECT_LOOK, courseMap, lessonById } from "@/lib/learn/curriculum";
import { cn } from "@/lib/cn";

const SUBJECT_OPTIONS = [
  { value: "reading", label: "Reading", emoji: "📖" },
  { value: "code", label: "Code", emoji: "🧩" },
  { value: "math", label: "Math", emoji: "🔢" },
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
            {grade?.label ?? "Kindergarten"} · {profile.daily_goal} a day
          </span>
          <span className="mt-0.5 block truncate text-sm text-fg-muted">
            {saved ? `${subjects} · ${profile.earn_stars ? "stars on" : "stars off"}` : `Guessed from ${kidName}'s age — tap to set`}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" />
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={`${kidName}'s learning`}
        description="Lessons start a little below their grade, so the first ones feel easy."
      >
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
        <ChipGroup
          name="grade"
          options={GRADES.map((g) => ({ value: g.id, label: g.short }))}
          value={grade}
          onChange={(v) => v[0] && setGrade(v[0] as GradeId)}
          ariaLabel="Grade level"
        />
        <p className="mt-1.5 text-sm text-fg-muted">
          {GRADES.find((g) => g.id === grade)?.label} · {GRADES.find((g) => g.id === grade)?.age}
        </p>
      </Field>
      <Field label="Subjects">
        <ChipGroup name="subjects" multiple options={SUBJECT_OPTIONS} value={subjects} onChange={(v) => v.length && setSubjects(v)} ariaLabel="Subjects" />
      </Field>
      <Field label="Daily goal" hint="Lessons a day. Each one takes about 3–5 minutes.">
        <Stepper name="daily_goal" defaultValue={profile.daily_goal} min={1} max={10} presets={[1, 2, 3, 5]} label="Lessons a day" />
      </Field>
      <div className="rounded-xl border border-line px-3.5">
        <Toggle
          checked={stars}
          onChange={setStars}
          name="earn_stars"
          label="Earn wall stars"
          hint="1 star a lesson (2 for a perfect one), up to 10 a day, for the reward store."
        />
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

/** Missions: lessons a grown-up picked. They show up first on the wall's Learn screen. */
export function MissionsCard({
  kidId,
  kidName,
  grade,
  missions,
  bestStars,
}: {
  kidId: string;
  kidName: string;
  grade: GradeId;
  missions: MissionRow[];
  bestStars: Record<string, number>;
}) {
  const { run, pending } = useQuickAction();
  const [open, setOpen] = useState(false);
  const [gone, hide] = useOptimistic<string[], string>([], (cur, id) => [...cur, id]);
  const active = missions.filter((m) => m.status === "assigned" && !gone.includes(m.id));
  const done = missions.filter((m) => m.status === "done").slice(0, 3);

  return (
    <section>
      <div className="mb-2.5 mt-6 flex items-center justify-between gap-3">
        <h2 className="text-title text-fg">Missions</h2>
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Assign a lesson
        </Button>
      </div>
      {active.length === 0 && done.length === 0 ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-2xl border border-dashed border-line-strong p-6 text-center transition hover:bg-surface"
        >
          <p className="text-2xl" aria-hidden>
            🎯
          </p>
          <p className="mt-1 font-semibold text-fg">No missions yet</p>
          <p className="mt-0.5 text-sm text-fg-muted">Pick a lesson and it&rsquo;s the first thing {kidName} sees on Learn.</p>
        </button>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {active.map((m) => {
            const l = lessonById(m.lessonId);
            if (!l) return null;
            return (
              <li key={m.id} className="flex min-h-16 items-center gap-3 px-4 py-3">
                <span className="text-2xl leading-none" aria-hidden>
                  {l.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-fg">{l.title}</span>
                  <span className="mt-0.5 block truncate text-sm text-fg-muted">
                    {COURSES[l.subject].title} · {m.note ? `“${m.note}”` : `assigned ${m.when}`}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${l.title}`}
                  disabled={pending}
                  onClick={() =>
                    run(() => removeAssignment(m.id), {
                      optimistic: () => hide(m.id),
                      undo: () => restoreAssignment(m.id),
                    })
                  }
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-fg-muted transition hover:bg-surface-2 hover:text-fg"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            );
          })}
          {done.map((m) => {
            const l = lessonById(m.lessonId);
            if (!l) return null;
            return (
              <li key={m.id} className="flex min-h-14 items-center gap-3 px-4 py-2.5 opacity-80">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-good/15 text-good">
                  <Check className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[15px] text-fg">
                  {l.emoji} {l.title}
                </span>
                <span className="shrink-0 text-sm text-fg-muted">
                  {"⭐".repeat(Math.max(0, Math.min(3, bestStars[l.id] ?? 0)))} {m.when}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title="Assign a lesson" description={`It shows up as ${kidName}'s mission on the wall.`} size="lg">
        <AssignForm kidId={kidId} kidName={kidName} grade={grade} bestStars={bestStars} assignedIds={active.map((m) => m.lessonId)} />
      </Sheet>
    </section>
  );
}

function AssignForm({
  kidId,
  kidName,
  grade,
  bestStars,
  assignedIds,
}: {
  kidId: string;
  kidName: string;
  grade: GradeId;
  bestStars: Record<string, number>;
  assignedIds: string[];
}) {
  const close = useSheetClose();
  const { run, pending } = useQuickAction();
  const [subject, setSubject] = useState<SubjectId>("reading");
  const [picked, setPicked] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const map = useMemo(() => courseMap(subject, grade, (id) => (bestStars[id] ?? 0) > 0, new Set(assignedIds)), [subject, grade, bestStars, assignedIds]);
  const currentUnit = map.find((u) => u.lessons.some((l) => l.state === "next"))?.unit.id ?? map[0]?.unit.id;
  const [openUnit, setOpenUnit] = useState<string | null>(null);
  const shownUnit = openUnit ?? currentUnit;
  const look = SUBJECT_LOOK[subject];
  const lesson = picked ? lessonById(picked) : null;

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
      <div className="max-h-[46dvh] overflow-y-auto rounded-2xl border border-line">
        {map.map(({ unit, lessons }) => {
          const isOpen = unit.id === shownUnit;
          const doneN = lessons.filter((l) => l.state === "done").length;
          return (
            <div key={unit.id} className="border-b border-line last:border-b-0">
              <button
                type="button"
                onClick={() => setOpenUnit(isOpen ? "" : unit.id)}
                className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-surface-2"
                aria-expanded={isOpen}
              >
                <span className="text-xl" aria-hidden>
                  {unit.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-fg">{unit.title}</span>
                  <span className="block text-xs text-fg-muted">
                    {GRADES.find((g) => g.id === unit.grade)?.short} · {doneN}/{lessons.length} done
                  </span>
                </span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-fg-subtle transition-transform", isOpen && "rotate-180")} />
              </button>
              {isOpen && (
                <ul className="pb-2">
                  {lessons.map(({ lesson: l, state }) => {
                    const on = picked === l.id;
                    const stars = bestStars[l.id] ?? 0;
                    return (
                      <li key={l.id}>
                        <button
                          type="button"
                          onClick={() => setPicked(on ? null : l.id)}
                          aria-pressed={on}
                          className={cn(
                            "mx-2 flex min-h-12 w-[calc(100%-1rem)] items-center gap-3 rounded-xl px-3 py-2 text-left transition",
                            on ? "bg-accent/15 ring-1 ring-accent" : "hover:bg-surface-2",
                          )}
                        >
                          <span className="text-lg" aria-hidden>
                            {l.emoji}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[15px] text-fg">{l.title}</span>
                          {state === "done" ? (
                            <span className="shrink-0 text-xs">{"⭐".repeat(Math.min(3, stars))}</span>
                          ) : state === "next" ? (
                            <span
                              className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
                              style={{
                                background: `${look.to}22`,
                                color: look.to,
                              }}
                            >
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
        <Button
          size="lg"
          className="w-full sm:w-auto"
          disabled={!picked || pending}
          onClick={() =>
            picked &&
            run(() => assignLesson(kidId, picked, note || null), {
              onDone: () => close?.(),
            })
          }
        >
          <Send className="h-4 w-4" /> {lesson ? `Send “${lesson.title}” to ${kidName}` : "Pick a lesson"}
        </Button>
      </SheetActions>
    </div>
  );
}
