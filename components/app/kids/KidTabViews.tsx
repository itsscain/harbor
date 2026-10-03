import Link from "next/link";
import { Check, ChevronRight, Pill, Tablet, Users } from "lucide-react";
import { KidQuickActions, KidStatusBanners, KidWelcome } from "./KidTodayParts";
import { AddRoutineSheet } from "./AddRoutineSheet";
import { KidStarsCard, KidChoreList } from "./KidChoresParts";
import { KidProfileCard, KidWallFeel, KidDangerZone } from "./KidAboutParts";
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
