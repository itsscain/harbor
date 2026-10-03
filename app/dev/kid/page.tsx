import { notFound } from "next/navigation";
import { DevShell } from "./DevShell";
import { KidHeader, KidTabs, parseKidTab } from "@/components/app/kids/KidChrome";
import { KidTodayView, KidRoutinesView, KidChoresView, KidAboutView } from "@/components/app/kids/KidTabViews";
import { RoutineEditor } from "@/components/app/kids/RoutineEditor";
import { SetTopBarTitle } from "@/components/app/AppTopBar";
import type { KidBasics, KidDay, KidRoutineRow, KidChoreRow, TemplateCard, EditorStep } from "@/lib/kid";

// Development-only: the redesigned kid page + routine editor with mock data (404s in production).
// /dev/kid?tab=today|routines|chores|about  ·  &state=new (welcome) | status (break + grounding)
// /dev/kid?tab=editor  ·  &type=ft (a First/Then board)
export const dynamic = "force-dynamic";

const KIDS = [
  { id: "00000000-0000-0000-0000-00000000000a", name: "Leo", avatar: "🦊", photo_url: null, color: "#36C6D6" },
  { id: "00000000-0000-0000-0000-00000000000b", name: "Mia", avatar: "🐬", photo_url: null, color: "#F472A8" },
  { id: "00000000-0000-0000-0000-00000000000c", name: "Sam", avatar: "🐸", photo_url: null, color: "#5FCB8E" },
];
const LEO = KIDS[0].id;

const KID: KidBasics = {
  ...KIDS[0],
  birthday: "2018-05-12",
  settings: { sensory: "standard", readAloud: true, sound: true, bedtime: "20:00" },
  stars: 42,
  age: 7,
};

const DAY: KidDay = {
  routines: [
    { id: "r1", name: "Morning", emoji: "🌅", done: 6, total: 6, when: "6:30 – 9:00 AM", state: "done" },
    { id: "r2", name: "After school", emoji: "🎒", done: 2, total: 5, when: "3:00 – 6:00 PM", state: "earlier" },
    { id: "r3", name: "Bedtime", emoji: "🌙", done: 1, total: 6, when: "6:30 – 9:00 PM", state: "now" },
  ],
  totalRoutines: 3,
  chores: [
    { id: "c1", title: "Feed the dog", icon: "🐶", points: 5, done: true },
    { id: "c2", title: "Set the table", icon: "🍽️", points: 3, done: false },
  ],
  corner: null,
  grounding: null,
};

const ROUTINES: KidRoutineRow[] = [
  { id: "r1", name: "Morning", emoji: "🌅", when: "Every day · 6:30 – 9:00 AM", stepCount: 6, stepPeek: ["🌅", "🚽", "👕", "🥣", "🪥", "🎒"], active: true, sharedWith: [], usesSlot: null },
  { id: "r2", name: "After school", emoji: "🎒", when: "Weekdays · 3:00 – 6:00 PM", stepCount: 5, stepPeek: ["🍎", "🎒", "✏️", "📖", "🧹"], active: true, sharedWith: ["Mia"], usesSlot: null },
  { id: "r3", name: "Bedtime", emoji: "🌙", when: "Every day · 6:30 – 9:00 PM", stepCount: 6, stepPeek: ["🛁", "🌙", "🪥", "📚", "💡"], active: true, sharedWith: [], usesSlot: null },
  { id: "r4", name: "Saturday jobs", emoji: "📋", when: "Sat", stepCount: 3, stepPeek: ["🧹", "🛏️", "🧺"], active: false, sharedWith: [], usesSlot: null },
];

const TEMPLATES: TemplateCard[] = [
  { id: "t1", name: "Morning", emoji: "🌅", description: "Wake up to out the door.", steps: [{ icon: "🌅", label: "Wake up" }, { icon: "🚽", label: "Bathroom" }, { icon: "👕", label: "Get dressed" }, { icon: "🥣", label: "Breakfast" }, { icon: "🪥", label: "Brush teeth" }, { icon: "🎒", label: "Shoes & bag" }], saved: false },
  { id: "t2", name: "After school", emoji: "🎒", description: "Snack, homework, a little tidy.", steps: [{ icon: "🍎", label: "Snack" }, { icon: "✏️", label: "Homework" }, { icon: "📖", label: "Read" }, { icon: "🧹", label: "Tidy up" }], saved: false },
  { id: "t3", name: "Bedtime", emoji: "🌙", description: "A calm, same-every-night wind-down.", steps: [{ icon: "🛁", label: "Bath" }, { icon: "🌙", label: "Pajamas" }, { icon: "🪥", label: "Teeth" }, { icon: "📚", label: "Story" }, { icon: "💡", label: "Lights out" }], saved: false },
  { id: "t4", name: "ADHD-friendly morning", emoji: "⚡", description: "Short steps, big wins, fewer decisions.", steps: [{ icon: "💧", label: "Water" }, { icon: "👕", label: "Clothes" }, { icon: "🥣", label: "Eat" }], saved: false },
  { id: "t5", name: "First / Then", emoji: "🔁", description: "Do this first, then get that.", steps: [{ icon: "🧹", label: "Tidy" }, { icon: "🎮", label: "Game" }], saved: false },
  { id: "t6", name: "Swim day", emoji: "🏊", description: null, steps: [{ icon: "🩱", label: "Suit" }, { icon: "🧴", label: "Towel" }], saved: true },
];

const CHORES: KidChoreRow[] = [
  { id: "c1", title: "Feed the dog", icon: "🐶", points: 5, days: null, daysLabel: "Every day", kidIds: [LEO], turnsWith: [], requiresApproval: false, mineToday: true },
  { id: "c2", title: "Take out the trash", icon: "🗑️", points: 5, days: [2, 5], daysLabel: "Tue, Fri", kidIds: [LEO, KIDS[1].id], turnsWith: ["Mia"], requiresApproval: true, mineToday: false },
  { id: "c3", title: "Make bed", icon: "🛏️", points: 2, days: [1, 2, 3, 4, 5], daysLabel: "Weekdays", kidIds: [LEO], turnsWith: [], requiresApproval: false, mineToday: true },
];

const STEPS: EditorStep[] = [
  { id: "s1", label: "Bath time", icon: "🛁", points: 0, kind: "together", hint: null, read_aloud: null, options: [], step_type: "task", order_index: 0 },
  { id: "s2", label: "Pajamas on", icon: "🌙", points: 2, kind: "standard", hint: "Put clothes in the hamper", read_aloud: null, options: [], step_type: "task", order_index: 1 },
  { id: "s3", label: "Brush teeth", icon: "🪥", points: 0, kind: "substep", hint: null, read_aloud: null, options: ["⬆️ Top", "⬇️ Bottom", "💦 Rinse"], step_type: "task", order_index: 2 },
  { id: "s4", label: "Pick a story", icon: "📚", points: 3, kind: "choice", hint: null, read_aloud: null, options: ["🐻 Bear book", "🚀 Space book", "🐉 Dragon book"], step_type: "task", order_index: 3 },
  { id: "s5", label: "Lights out", icon: "💡", points: 5, kind: "approval", hint: null, read_aloud: "Time for lights out, sleepy head", options: [], step_type: "task", order_index: 4 },
];
const FT_STEPS: EditorStep[] = [
  { id: "f1", label: "Tidy your room", icon: "🧹", points: 0, kind: "standard", hint: null, read_aloud: null, options: [], step_type: "first", order_index: 0 },
  { id: "f2", label: "20 minutes of games", icon: "🎮", points: 0, kind: "standard", hint: null, read_aloud: null, options: [], step_type: "then", order_index: 1 },
];
const LIBRARY = [
  { id: "l1", label: "Wake up", icon: "🌅", points: 0 },
  { id: "l2", label: "Bathroom", icon: "🚽", points: 0 },
  { id: "l3", label: "Get dressed", icon: "👕", points: 5 },
  { id: "l4", label: "Breakfast", icon: "🥣", points: 5 },
  { id: "l5", label: "Brush teeth", icon: "🪥", points: 5 },
  { id: "l6", label: "Brush hair", icon: "💇", points: 0 },
  { id: "l7", label: "Drink water", icon: "💧", points: 0 },
  { id: "l8", label: "Story", icon: "📚", points: 5 },
  { id: "l9", label: "Lights out", icon: "💡", points: 0 },
  { id: "l10", label: "Tidy up", icon: "🧹", points: 5 },
  { id: "l11", label: "Take a breath", icon: "🫧", points: 0 },
];

export default async function DevKidPage({ searchParams }: { searchParams: Promise<{ tab?: string; state?: string; type?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const sp = await searchParams;

  if (sp.tab === "editor") {
    const ft = sp.type === "ft";
    return (
      <DevShell kids={KIDS}>
        <SetTopBarTitle title={ft ? "First / Then" : "Bedtime"} />
        <RoutineEditor
          kidId={LEO}
          accent={KIDS[0].color}
          routine={{ id: "r3", name: ft ? "First / Then" : "Bedtime", type: ft ? "first_then" : "schedule", active: true, start: ft ? null : "18:30", end: ft ? null : "21:00", days: null, strict: !ft, kidIds: [LEO], slotName: null }}
          steps={ft ? FT_STEPS : STEPS}
          kids={KIDS}
          library={LIBRARY}
        />
      </DevShell>
    );
  }

  const tab = parseKidTab(sp.tab);
  const day: KidDay =
    sp.state === "new"
      ? { routines: [], totalRoutines: 0, chores: [], corner: null, grounding: null }
      : sp.state === "status"
        ? { ...DAY, corner: { id: "k1", endsAt: "2026-10-03T21:04:00.000Z" }, grounding: { id: "g1", reason: "Hit his sister", endsOn: "2026-10-05", daysLeft: 2 } }
        : DAY;

  return (
    <DevShell kids={KIDS}>
      <SetTopBarTitle title={KID.name} />
      <KidHeader kid={KID} />
      <KidTabs kidId={KID.id} active={tab} base="/dev/kid" />
      {tab === "today" && <KidTodayView kid={KID} day={day} />}
      {tab === "routines" && <KidRoutinesView kid={KID} routines={sp.state === "new" ? [] : ROUTINES} siblings={[{ id: KIDS[1].id, name: "Mia", routines: [{ id: "x1", name: "Morning", emoji: "🌅", steps: 5 }, { id: "x2", name: "Piano practice", emoji: "📋", steps: 3 }] }]} templates={TEMPLATES} autoAdd={false} />}
      {tab === "chores" && <KidChoresView kid={KID} chores={sp.state === "new" ? [] : CHORES} kids={KIDS} storeCount={6} />}
      {tab === "about" && <KidAboutView kid={KID} />}
    </DevShell>
  );
}
