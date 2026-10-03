"use client";

import { useState } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { QuickAddProvider } from "@/components/app/quick/QuickAdd";
import { ParentNav } from "@/components/app/ParentNav";
import { AppTopBarProvider } from "@/components/app/AppTopBar";
import { TodayView } from "@/components/app/today/TodayView";
import type { TodayModel } from "@/lib/today";

const KIDS = [
  { id: "00000000-0000-0000-0000-00000000000a", name: "Leo", avatar: "🦊", photo_url: null, color: "#36C6D6" },
  { id: "00000000-0000-0000-0000-00000000000b", name: "Mia", avatar: "🐬", photo_url: null, color: "#F472A8" },
  { id: "00000000-0000-0000-0000-00000000000c", name: "Sam", avatar: "🐸", photo_url: null, color: "#5FCB8E" },
];

const MODEL: TodayModel = {
  greeting: "Good evening",
  familyName: "Rivera Family",
  dateLabel: "Friday, October 3",
  tz: "America/New_York",
  needs: [
    { kind: "request", key: "r1", id: "r1", childName: "Leo", childAvatar: "🦊", childColor: "#36C6D6", emoji: "📺", summary: "30 min of screen time", at: new Date(Date.now() - 4 * 60000).toISOString() },
    { kind: "med", key: "m1", medicationId: "m1", childId: KIDS[1].id, childName: "Mia", name: "Melatonin", dose: "1 mg", time: "20:00", timeLabel: "8:00 PM", overdue: false, parentGives: true },
    { kind: "reminder", key: "rem1", id: "rem1", title: "Return library books", overdue: true, dueLabel: "was due Oct 1" },
  ],
  kids: [
    { ...KIDS[0], stars: 42, status: null, routine: { id: "rt1", name: "Bedtime", emoji: "🌙", done: 4, total: 6, state: "now", hint: "until 8:30 PM" }, routinesToday: 2, routinesDone: 1, chores: { done: 2, total: 3 }, allDone: false },
    { ...KIDS[1], stars: 17, status: null, routine: null, routinesToday: 2, routinesDone: 2, chores: { done: 2, total: 2 }, allDone: true },
    { ...KIDS[2], stars: 8, status: "calm", routine: { id: "rt3", name: "Bedtime", emoji: "🌙", done: 1, total: 5, state: "now", hint: "until 8:00 PM" }, routinesToday: 2, routinesDone: 1, chores: { done: 0, total: 1 }, allDone: false },
  ],
  today: [
    { id: "e1", title: "Soccer practice", emoji: "⚽", time: "3:30 PM", past: true, color: "#36C6D6" },
    { id: "e2", title: "Piano lesson", emoji: "🎹", time: "6:00 PM", past: false, color: "#F472A8" },
  ],
  tomorrow: [{ id: "e3", title: "Dentist", emoji: "🦷", time: "9:00 AM", past: false, color: "#5FCB8E" }],
  dinner: { title: "Spaghetti night", emoji: "🍝" },
  houseMode: { mode: "normal", until: null, except: [], setAt: null },
  setup: {
    show: true,
    steps: [
      { label: "Add your kids", hint: "Name, picture, and color", done: true, href: "#" },
      { label: "Give them a routine", hint: "Start from a ready-made one", done: true, href: "#" },
      { label: "Add a reward", hint: "Something to spend stars on", done: true, href: "#" },
      { label: "Set a wall PIN", hint: "Keeps little hands out of settings", done: false, href: "#" },
      { label: "Connect your wall", hint: "Show your family on the tablet", done: false, href: "#" },
    ],
  },
};

export function TodayPreview() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  return (
    <div data-theme={theme} data-app-theme-root className="min-h-dvh bg-bg text-fg">
      <ToastProvider>
        <QuickAddProvider kids={KIDS} tz="America/New_York">
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="fixed right-2 top-2 z-50 rounded-full bg-surface-2 px-3 py-1 text-xs text-fg-muted">
            {theme}
          </button>
          <AppTopBarProvider unread={2} householdName="Rivera Family">
            <main className="mx-auto w-full max-w-2xl p-4 pb-32">
              <TodayView m={MODEL} />
            </main>
          </AppTopBarProvider>
          <ParentNav />
        </QuickAddProvider>
      </ToastProvider>
    </div>
  );
}
