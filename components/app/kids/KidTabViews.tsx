import Link from "next/link";
import { Check, ChevronRight, Pill, Tablet, Users } from "lucide-react";
import { KidQuickActions, KidStatusBanners, KidWelcome } from "./KidTodayParts";
import { AddRoutineSheet } from "./AddRoutineSheet";
import { KidStarsCard, KidChoreList } from "./KidChoresParts";
import { KidProfileCard, KidWallFeel, KidDangerZone } from "./KidAboutParts";
import { LearnSettingsRow, MissionsCard, type MissionRow } from "./KidLearnParts";
import { summarize, type KidLearnData, type UnitChip } from "@/lib/learn/parent";
import type { SubjectId } from "@/lib/learn/types";
import { dayKeyInTz, formatInTz, formatTimeInTz } from "@/lib/tz";
import type { KidBasics, KidDay, KidDayRoutine, KidRoutineRow, KidChoreRow, TemplateCard } from "@/lib/kid";
import type { ChipChild } from "@/components/ui/Chips";
import { cn } from "@/lib/cn";

// The four kid tabs as plain views over loaded data (the page loads only the active tab's data;
// /dev/kid renders the same views from mock data to check the design without signing in).

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-2.5 mt-6 flex items-center justify-between gap-3 first:mt-0">
      <h2 className="text-title text-fg">{children}</h2>
      {action}
    </div>
  );
}

const STATE: Record<KidDayRoutine["state"], { label: string; cls: string }> = {
  now: { label: "Now", cls: "bg-accent/15 text-accent" },
  later: { label: "Later", cls: "bg-surface-2 text-fg-muted" },
  earlier: { label: "Not finished", cls: "bg-beacon/15 text-beacon" },
  done: { label: "Done", cls: "bg-good/15 text-good" },
  anytime: { label: "Any time", cls: "bg-surface-2 text-fg-muted" },
};

// ── Today ────────────────────────────────────────────────────────────────────
export function KidTodayView({ kid, day }: { kid: KidBasics; day: KidDay }) {
  return (
    <div>
      <KidStatusBanners kidId={kid.id} kidName={kid.name} corner={day.corner} grounding={day.grounding} />
      {day.totalRoutines === 0 && <KidWelcome kidId={kid.id} kidName={kid.name} />}

      <SectionTitle>Right now</SectionTitle>
      <KidQuickActions kidId={kid.id} kidName={kid.name} inBreak={!!day.corner} grounded={!!day.grounding} />

      {day.totalRoutines > 0 && (
        <>
          <SectionTitle>Today&apos;s routines</SectionTitle>
          {day.routines.length === 0 ? (
            <p className="rounded-2xl border border-line bg-surface p-4 text-[15px] text-fg-muted">
              Nothing scheduled today.{" "}
              <Link href={`/app/children/${kid.id}?tab=routines`} className="font-semibold text-accent">
                See all routines
              </Link>
            </p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
              {day.routines.map((r) => {
                const st = STATE[r.state];
                const pct = r.total ? Math.round((r.done / r.total) * 100) : 0;
                return (
                  <li key={r.id}>
                    <Link href={`/app/children/${kid.id}/routines/${r.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 transition hover:bg-surface-2">
                      <span className="text-2xl leading-none" aria-hidden>
                        {r.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-semibold text-fg">{r.name}</span>
                          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold", st.cls)}>{st.label}</span>
                        </span>
                        <span className="mt-1.5 flex items-center gap-2 text-sm text-fg-muted">
                          {r.total > 0 ? (
                            <>
                              <span className="h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-surface-2">
                                <span className="block h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                              </span>
                              <span className="whitespace-nowrap">
                                {r.done} of {r.total}
                              </span>
                            </>
                          ) : (
                            "No steps yet"
                          )}
                          {r.state === "later" && <span className="truncate">· {r.when}</span>}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {day.chores.length > 0 && (
        <>
          <SectionTitle
            action={
              <Link href={`/app/children/${kid.id}?tab=chores`} className="text-sm font-semibold text-accent">
                Manage
              </Link>
            }
          >
            Today&apos;s chores
          </SectionTitle>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {day.chores.map((c) => (
              <li key={c.id} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
                <span
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full border-2",
                    c.done ? "border-good bg-good text-white" : "border-line-strong",
                  )}
                  aria-label={c.done ? "Done" : "Not done yet"}
                >
                  {c.done && <Check className="h-4 w-4" strokeWidth={3} />}
                </span>
                <span className="text-xl leading-none" aria-hidden>
                  {c.icon ?? "✅"}
                </span>
                <span className={cn("min-w-0 flex-1 truncate font-medium", c.done ? "text-fg-muted line-through" : "text-fg")}>{c.title}</span>
                {c.points > 0 && <span className="shrink-0 text-sm font-bold text-beacon">★ {c.points}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// ── Routines ─────────────────────────────────────────────────────────────────
export function KidRoutinesView({
  kid,
  routines,
  siblings,
  templates,
  autoAdd,
}: {
  kid: KidBasics;
  routines: KidRoutineRow[];
  siblings: { id: string; name: string; routines: { id: string; name: string; emoji: string; steps: number }[] }[];
  templates: TemplateCard[];
  autoAdd: boolean;
}) {
  return (
    <div>
      <SectionTitle action={<AddRoutineSheet kidId={kid.id} kidName={kid.name} templates={templates} siblings={siblings} autoOpen={autoAdd} variant={routines.length ? "secondary" : "primary"} />}>
        Routines
      </SectionTitle>
      {routines.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-strong p-6 text-center">
          <p className="text-2xl" aria-hidden>
            🗓️
          </p>
          <p className="mt-1 font-semibold text-fg">No routines yet</p>
          <p className="mt-0.5 text-sm text-fg-muted">A routine is a short checklist {kid.name} follows on the wall, like Morning or Bedtime.</p>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {routines.map((r) => (
            <li key={r.id}>
              <Link href={`/app/children/${kid.id}/routines/${r.id}`} className={cn("flex min-h-[4.5rem] items-center gap-3 px-4 py-3 transition hover:bg-surface-2", !r.active && "opacity-70")}>
                <span className="text-2xl leading-none" aria-hidden>
                  {r.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-semibold text-fg">{r.name}</span>
                    {!r.active && <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-fg-muted">Off</span>}
                  </span>
                  <span className={cn("mt-0.5 block truncate text-sm", r.stepCount === 0 ? "font-semibold text-beacon" : "text-fg-muted")}>
                    {r.stepCount === 0 ? "No steps yet — tap to add some" : r.when}
                  </span>
                  {r.sharedWith.length > 0 && (
                    <span className="mt-0.5 flex items-center gap-1 text-sm text-fg-muted">
                      <Users className="h-3.5 w-3.5" /> Shared with {r.sharedWith.join(", ")}
                    </span>
                  )}
                </span>
                {r.stepPeek.length > 0 && (
                  <span className="hidden shrink-0 text-base tracking-wide sm:block" aria-hidden>
                    {r.stepPeek.join(" ")}
                  </span>
                )}
                <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Chores & stars ───────────────────────────────────────────────────────────
export function KidChoresView({ kid, chores, kids, storeCount }: { kid: KidBasics; chores: KidChoreRow[]; kids: ChipChild[]; storeCount: number }) {
  return (
    <div className="space-y-6">
      <KidStarsCard kidId={kid.id} kidName={kid.name} stars={kid.stars} storeCount={storeCount} />
      <KidChoreList kidId={kid.id} kidName={kid.name} chores={chores} kids={kids} />
    </div>
  );
}

// ── About ────────────────────────────────────────────────────────────────────
export function KidAboutView({ kid }: { kid: KidBasics }) {
  const rows = [
    { href: "/app/medication", icon: Pill, label: "Medicine", sub: `Doses and reminders for ${kid.name}` },
    { href: "/app/devices", icon: Tablet, label: "Screens", sub: "The wall and any bedside screen" },
  ];
  return (
    <div className="space-y-4">
      <KidProfileCard kid={kid} />
      <KidWallFeel kidId={kid.id} kidName={kid.name} settings={kid.settings} />
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {rows.map((r) => (
          <li key={r.href}>
            <Link href={r.href} className="flex min-h-16 items-center gap-3 px-4 py-3 transition hover:bg-surface-2">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-fg-muted">
                <r.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-fg">{r.label}</span>
                <span className="block truncate text-sm text-fg-muted">{r.sub}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" />
            </Link>
          </li>
        ))}
      </ul>
      <KidDangerZone kidId={kid.id} kidName={kid.name} />
    </div>
  );
}

// ── Learn ────────────────────────────────────────────────────────────────────
/** "today, 3:42 PM" · "yesterday" · "Mon, Oct 1" — in the family's time zone. */
function whenLabel(iso: string, tz: string, now: Date): string {
  const day = dayKeyInTz(new Date(iso), tz);
  const today = dayKeyInTz(now, tz);
  const yesterday = dayKeyInTz(new Date(now.getTime() - 86400_000), tz);
  if (day === today) return `today, ${formatTimeInTz(new Date(iso), tz)}`;
  if (day === yesterday) return "yesterday";
  return formatInTz(new Date(iso), tz, { weekday: "short", month: "short", day: "numeric" });
}

const UNIT_CHIP: Record<UnitChip["state"], string> = {
  done: "border-good/30 bg-good/10 text-good",
  doing: "border-accent/40 bg-accent/10 text-fg",
  next: "border-accent/40 text-fg",
  later: "border-line text-fg-subtle",
};

export function KidLearnView({ kid, data, now }: { kid: KidBasics; data: KidLearnData; now: Date }) {
  const s = summarize(data, now);
  const goal = data.profile.daily_goal;
  const best: Record<string, number> = {};
  for (const r of data.results) best[r.lesson_id] = Math.max(best[r.lesson_id] ?? 0, r.stars);
  const missions: MissionRow[] = data.assignments.map((a) => ({
    id: a.id,
    lessonId: a.lesson_id,
    note: a.note,
    status: a.status,
    when: whenLabel(a.status === "done" && a.completed_at ? a.completed_at : a.created_at, data.tz, now),
  }));
  const stats = [
    { emoji: "🔥", value: s.streak, label: "day streak" },
    { emoji: "📚", value: s.weekPassed, label: `levels passed this week${s.weekLessons > s.weekPassed ? ` (${s.weekLessons} tries)` : ""}` },
    { emoji: "⏱️", value: s.weekMinutes, label: "minutes this week" },
    { emoji: "🏅", value: s.level, label: `level · ${s.levelName}` },
  ];
  const shaky: Partial<Record<SubjectId, number>> = Object.fromEntries(s.bySubject.map((b) => [b.subject, b.shaky.length]));

  return (
    <div>
      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((st) => (
            <div key={st.label} className="rounded-xl bg-surface-2 px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-2xl font-extrabold tabular-nums text-fg">
                <span className="text-xl" aria-hidden>
                  {st.emoji}
                </span>
                {st.value}
              </p>
              <p className="mt-0.5 text-xs font-medium text-fg-muted">{st.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-fg">Today&apos;s goal</span>
            <span className="tabular-nums text-fg-muted">
              {Math.min(s.todayCount, goal)} of {goal} levels{s.todayCount >= goal ? " ✅" : ""}
            </span>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-surface-2">
            <div className={cn("h-full rounded-full", s.todayCount >= goal ? "bg-good" : "bg-accent")} style={{ width: `${Math.min(100, (s.todayCount / goal) * 100)}%` }} />
          </div>
          <p className="mt-2 text-sm text-fg-muted">
            {s.lastActive ? `Last level ${whenLabel(s.lastActive, data.tz, now)}` : `${kid.name} hasn’t tried a level yet. On the wall, tap Learn next to My Day.`}
          </p>
        </div>
      </section>

      <div className="mt-3">
        <LearnSettingsRow kidId={kid.id} kidName={kid.name} profile={data.profile} saved={data.profileSaved} />
      </div>

      <MissionsCard kidId={kid.id} kidName={kid.name} grade={data.profile.grade} missions={missions} bestStars={best} shaky={shaky} />

      <SectionTitle>Progress</SectionTitle>
      <div className="space-y-3">
        {s.bySubject.map((sub) => {
          const cur = sub.current;
          const ci = cur ? sub.units.findIndex((u) => u.id === cur.id) : sub.units.length;
          const shown = sub.units.filter((u, i) => u.state === "done" || i <= ci + 2);
          const more = sub.units.length - shown.length;
          return (
            <section key={sub.subject} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-2xl" style={{ background: `${sub.color}22` }} aria-hidden>
                  {sub.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-fg">{sub.title}</p>
                  <p className="truncate text-sm text-fg-muted">{cur ? `${cur.emoji} ${cur.title} · ${cur.done} of ${cur.total}${sub.where ? ` · ${sub.where}` : ""}` : "Every island finished 🎉"}</p>
                </div>
                <span className="shrink-0 text-right text-xs text-fg-muted">
                  <span className="block text-base font-bold tabular-nums text-fg">{sub.lessonsDone}</span>
                  levels · ⭐ {sub.stars}
                </span>
              </div>
              {cur && (
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full" style={{ width: `${cur.total ? (cur.done / cur.total) * 100 : 0}%`, background: sub.color }} />
                </div>
              )}
              {sub.next && (
                <p className="mt-2 text-sm text-fg-muted">
                  Up next: <span className="font-semibold text-fg">{sub.next}</span>
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {shown.map((u) => (
                  <span key={u.id} className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium", UNIT_CHIP[u.state])}>
                    {u.state === "done" ? <Check className="h-3 w-3" /> : <span aria-hidden>{u.emoji}</span>}
                    {u.title}
                    {u.state === "doing" && (
                      <span className="tabular-nums text-fg-muted">
                        {u.done}/{u.total}
                      </span>
                    )}
                  </span>
                ))}
                {more > 0 && <span className="rounded-full px-2 py-1 text-xs text-fg-subtle">+{more} more</span>}
              </div>
              {(sub.strong.length > 0 || sub.shaky.length > 0) && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
                      Strong · {sub.mastered} mastered of {sub.practiced}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {sub.strong.slice(0, 6).map((k) => (
                        <span key={k.skill} className="rounded-full border border-good/30 bg-good/10 px-2.5 py-1 text-xs font-medium text-fg" title={`${k.strength}% strong`}>
                          {k.mastered ? "✓ " : ""}
                          {k.label}
                        </span>
                      ))}
                      {sub.strong.length === 0 && <span className="text-xs text-fg-subtle">Building up…</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Needs practice · {sub.shaky.length}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {sub.shaky.slice(0, 6).map((k) => (
                        <span key={k.skill} className="rounded-full border border-beacon/50 bg-beacon/15 px-2.5 py-1 text-xs font-medium text-fg" title={`${k.strength}% — the wall brings this back in review`}>
                          {k.label}
                        </span>
                      ))}
                      {sub.shaky.length === 0 && <span className="text-xs text-fg-subtle">Nothing shaky right now 🎉</span>}
                    </div>
                  </div>
                </div>
              )}
              {sub.subject === "reading" && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Letter sounds · {s.lettersKnown.length} of 26</p>
                  <div className="mt-2 grid grid-cols-9 gap-1 sm:grid-cols-[repeat(13,minmax(0,1fr))]">
                    {"abcdefghijklmnopqrstuvwxyz".split("").map((l) => {
                      const known = s.lettersKnown.includes(l);
                      return (
                        <span key={l} className={cn("grid aspect-square place-items-center rounded-lg text-sm font-bold", known ? "bg-accent/20 text-fg" : "bg-surface-2 text-fg-subtle")} title={known ? `${l}: learned` : `${l}: not yet`}>
                          {l}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {s.recent.length > 0 && (
        <>
          <SectionTitle>Recent levels</SectionTitle>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {s.recent.map((r) => (
              <li key={r.id} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
                <span className="text-xl leading-none" aria-hidden>
                  {r.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-fg">
                    {r.label && !r.practice ? <span className="mr-1.5 tabular-nums text-fg-muted">{r.label}</span> : null}
                    {r.title}
                  </span>
                  <span className="block text-xs text-fg-muted">
                    {whenLabel(r.at, data.tz, now)} · {r.minutes} min{r.score ? ` · ${r.score} first try` : ""}
                    {!r.passed ? " · not passed yet — it'll come back" : ""}
                  </span>
                </span>
                <span className="shrink-0 text-sm" aria-label={`${r.stars} of 3 stars`}>
                  {"⭐".repeat(r.stars)}
                  <span className="opacity-30">{"⭐".repeat(3 - r.stars)}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
