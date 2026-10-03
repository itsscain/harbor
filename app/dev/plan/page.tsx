import { notFound } from "next/navigation";
import { DevShell } from "../kid/DevShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { PlanAgenda } from "@/components/app/plan/PlanAgenda";
import { FamilyList, type ListItem } from "@/components/app/plan/FamilyLists";
import { MedsView } from "@/components/app/meds/MedsView";
import { dayKeyInTz, formatInTz, wallTimeToUtcMs } from "@/lib/tz";
import type { PlanModel, PlanDay } from "@/lib/plan";
import type { MedKid, MedLogDay } from "@/lib/meds";

// Development-only: the Plan agenda, Lists and Medicine with mock data (404s in production).
// /dev/plan?view=plan|lists|todo|meds
export const dynamic = "force-dynamic";

const TZ = "America/New_York";
const KIDS = [
  { id: "00000000-0000-0000-0000-00000000000a", name: "Leo", avatar: "🦊", photo_url: null, color: "#36C6D6" },
  { id: "00000000-0000-0000-0000-00000000000b", name: "Mia", avatar: "🐬", photo_url: null, color: "#F472A8" },
];

function mockPlan(): PlanModel {
  const today = dayKeyInTz(Date.now(), TZ);
  const add = (n: number) => {
    const d = new Date(`${today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const day = (i: number, extra: Partial<PlanDay>): PlanDay => {
    const key = add(i);
    const noon = new Date(wallTimeToUtcMs(`${key}T12:00`, TZ));
    return {
      key,
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : formatInTz(noon, TZ, { weekday: "long" }),
      sub: formatInTz(noon, TZ, { month: "short", day: "numeric" }),
      isToday: i === 0,
      showDinnerSlot: i < 7,
      meals: [],
      events: [],
      reminders: [],
      ...extra,
    };
  };
  const ev = (id: string, i: number, time: string | null, title: string, emoji: string, color: string, who: string | null, extra: object = {}) => ({
    kind: "event" as const,
    key: `ev:${id}:${add(i)}`,
    time: time ? formatInTz(new Date(wallTimeToUtcMs(`${add(i)}T${time}`, TZ)), TZ, { hour: "numeric", minute: "2-digit" }) : "All day",
    sortMin: time ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) : -1,
    color,
    who,
    repeatLabel: null as string | null,
    edit: { id, title, emoji, date: add(i), time, childId: null, repeat: null as string | null, location: null as string | null, countdown: false },
    ...extra,
  });
  return {
    tz: TZ,
    todayKey: today,
    kids: KIDS,
    overdue: [
      { kind: "reminder", key: "rem:o1", who: null, overdueLabel: "Was due Oct 1", edit: { id: "o1", title: "Return library books", dueDate: add(-2), childId: null, done: false } },
    ],
    days: [
      day(0, {
        events: [ev("e1", 0, "15:30", "Soccer practice", "⚽", "#36C6D6", "Leo", { repeatLabel: "Every week", edit: { id: "e1", title: "Soccer practice", emoji: "⚽", date: add(0), time: "15:30", childId: KIDS[0].id, repeat: "weekly", location: "Field 3", countdown: false } }), ev("e2", 0, "18:00", "Piano lesson", "🎹", "#F472A8", "Mia")],
        reminders: [{ kind: "reminder", key: "rem:r1", who: "Mia", overdueLabel: null, edit: { id: "r1", title: "Sign the field-trip form", dueDate: add(0), childId: KIDS[1].id, done: false } }],
        meals: [{ kind: "meal", key: "meal:m1", edit: { id: "m1", date: add(0), title: "Spaghetti night", emoji: "🍝", mealType: "dinner", notes: null } }],
      }),
      day(1, { events: [ev("e3", 1, "09:00", "Dentist", "🦷", "#18606F", "Leo")] }),
      day(2, {}),
      day(3, { meals: [{ kind: "meal", key: "meal:m2", edit: { id: "m2", date: add(3), title: "Tacos", emoji: "🌮", mealType: "dinner", notes: null } }] }),
      day(4, { events: [ev("e4", 4, null, "No school", "🏫", "#18606F", null)] }),
      day(5, {}),
      day(6, {}),
      day(9, { events: [ev("e5", 9, "14:00", "Mia's birthday party", "🎂", "#F472A8", "Mia")] }),
    ],
  };
}

const LIST: ListItem[] = [
  { id: "i1", name: "Milk", checked: false, addedBy: "Phone" },
  { id: "i2", name: "Bananas", checked: false, addedBy: "Wall" },
  { id: "i3", name: "Bread", checked: false, addedBy: "Phone" },
  { id: "i4", name: "Eggs", checked: true, addedBy: "Phone" },
];

function mockMeds(): { kids: MedKid[]; log: MedLogDay[] } {
  return {
    kids: [
      {
        ...KIDS[0],
        meds: [
          {
            id: "md1", childId: KIDS[0].id, name: "Focus medicine", dose: "10 mg", icon: "💊", times: ["07:30"], days: [1, 2, 3, 4, 5], withFood: true, parentGives: true, helpsNote: null, active: true,
            scheduleLabel: "7:30 AM · Weekdays",
            today: [{ time: "07:30", label: "7:30 AM", status: "given", givenLabel: "7:34 AM · a grown-up" }],
          },
          {
            id: "md2", childId: KIDS[0].id, name: "Allergy", dose: "5 ml", icon: "🧴", times: ["08:00", "20:00"], days: null, withFood: false, parentGives: true, helpsNote: null, active: true,
            scheduleLabel: "8:00 AM · 8:00 PM · Every day",
            today: [
              { time: "08:00", label: "8:00 AM", status: "missed", givenLabel: null },
              { time: "20:00", label: "8:00 PM", status: "due", givenLabel: null },
            ],
          },
        ],
      },
      { ...KIDS[1], meds: [] },
    ],
    log: [
      { key: "t", label: "Today", entries: [{ id: "l1", kidName: "Leo", medName: "Focus medicine", icon: "💊", doseLabel: "7:30 AM", at: "7:34 AM", by: "a grown-up" }] },
      { key: "y", label: "Thu, Oct 2", entries: [{ id: "l2", kidName: "Leo", medName: "Allergy", icon: "🧴", doseLabel: "8:00 PM", at: "8:05 PM", by: "on the wall" }] },
    ],
  };
}

export default async function DevPlanPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { view } = await searchParams;
  return (
    <DevShell kids={KIDS}>
      {view === "lists" || view === "todo" ? (
        <>
          <PageHeader title="Lists" subtitle="The same lists as the wall — add here or there." />
          <FamilyList kind={view === "todo" ? "todo" : "grocery"} items={view === "todo" ? [] : LIST} />
        </>
      ) : view === "meds" ? (
        <>
          <PageHeader title="Medicine" subtitle="Calm reminders on the wall, and a record of every dose." />
          <MedsView {...mockMeds()} />
        </>
      ) : (
        <>
          <PageHeader title="Plan" subtitle="The next two weeks. Tap anything to change it — the wall updates right away." />
          <PlanAgenda model={mockPlan()} />
        </>
      )}
    </DevShell>
  );
}
