import { notFound } from "next/navigation";
import { DevShell } from "../kid/DevShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { SettingsList } from "@/components/app/settings/SettingsList";
import { ScreensView, type Screen } from "@/components/app/devices/ScreensView";
import { NavHub } from "@/components/app/NavHub";
import { MORE_GROUPS } from "@/lib/app-nav";
import { DEFAULT_PREFS } from "@/lib/notifications/prefs";
import { RewardsView } from "@/components/app/store/RewardsView";
import { NotesView } from "@/components/app/messages/NotesView";
import { GrownUpsView } from "@/components/app/family/GrownUpsView";
import { CalmToolsView } from "@/components/app/calm/CalmToolsView";
import { RulesView } from "@/components/app/rules/RulesView";
import { FamilyTimes } from "@/components/app/schedule/FamilyTimes";
import { FamilyScheduleGrid } from "@/components/app/FamilyScheduleGrid";

// Development-only: Settings, Screens and More with mock data (404s in production).
// /dev/settings?view=settings|screens|more|rewards|notes|grownups|calm|rules|times
export const dynamic = "force-dynamic";

const KIDS = [
  { id: "00000000-0000-0000-0000-00000000000a", name: "Leo", avatar: "🦊", photo_url: null, color: "#36C6D6" },
  { id: "00000000-0000-0000-0000-00000000000b", name: "Mia", avatar: "🐬", photo_url: null, color: "#F472A8" },
];

const SCREENS: Screen[] = [
  { id: "d1", name: "Kitchen wall", icon: "🖥️", typeLabel: "Family wall", status: "online", statusLabel: "Online", code: "ABCDEFGH", stale: false, sleep: { screensaver: true, idleSeconds: null, quietStart: null, quietEnd: null } },
  { id: "d2", name: "Leo's screen", icon: "🛏️", typeLabel: "Leo's bedroom screen", status: "away", statusLabel: "Offline · 3 days ago", code: "JKLMNPQR", stale: true, sleep: { screensaver: true, idleSeconds: 300, quietStart: "19:30", quietEnd: "06:30" } },
  { id: "d3", name: "Family wall", icon: "🖥️", typeLabel: "Family wall", status: "pending", statusLabel: "Waiting", code: "STUVWXYZ", stale: false, sleep: { screensaver: true, idleSeconds: null, quietStart: null, quietEnd: null } },
];

export default async function DevSettingsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { view } = await searchParams;
  return (
    <DevShell kids={KIDS}>
      {view === "rewards" ? (
        <>
          <PageHeader title="Rewards" subtitle="What kids spend their stars on. It all shows on the wall." />
          <RewardsView
            kids={KIDS}
            familyStars={64}
            goal={{ label: "Family movie night", emoji: "🍕", target: 150, reward: "Pizza and a movie", active: true }}
            rewards={[
              { id: "r1", label: "20 minutes of screen time", emoji: "📺", cost: 15, kind: "screen_time", childId: null, enabled: true },
              { id: "r2", label: "Ice cream treat", emoji: "🍦", cost: 25, kind: "reward", childId: null, enabled: true },
              { id: "r3", label: "New LEGO set", emoji: "🧱", cost: 300, kind: "goal", childId: KIDS[0].id, enabled: true },
              { id: "r4", label: "Pick the family movie", emoji: "🎬", cost: 30, kind: "reward", childId: null, enabled: false },
            ]}
          />
        </>
      ) : view === "notes" ? (
        <>
          <PageHeader title="Message board" subtitle="Notes that show on the wall's home screen." />
          <NotesView
            kids={KIDS}
            tz="America/New_York"
            notes={[
              { id: "n1", body: "Home by 5:30 — snack's in the fridge. You've got this!", emoji: "💛", childId: null, author: "Mom", pinned: true, bonus: 0, until: null, meta: "Everyone · Kept at top · from Mom · 2 hr ago" },
              { id: "n2", body: "Proud of how you helped your sister today 🌟", emoji: "🌟", childId: KIDS[0].id, author: null, pinned: false, bonus: 5, until: null, meta: "For Leo · 1 days ago" },
            ]}
          />
        </>
      ) : view === "grownups" ? (
        <>
          <PageHeader title="Grown-ups" subtitle="Who can use Harbor, and who's on the wall." />
          <GrownUpsView
            isOwner
            invitesAvailable
            kids={KIDS}
            members={[
              { profileId: "p1", email: "you@example.com", isOwner: true },
              { profileId: "p2", email: "partner@example.com", isOwner: false },
            ]}
            people={[
              { id: "pp1", name: "Dad", avatar: "🧔", role: "parent", color: "#7C6CF0", photo_url: null, routines: [{ id: "pr1", name: "Wind-down", active: true, withChildId: KIDS[0].id, days: null, steps: [{ id: "st1", label: "Phone away", icon: "📵" }, { id: "st2", label: "Read together", icon: "📖" }] }] },
            ]}
          />
        </>
      ) : view === "calm" ? (
        <>
          <PageHeader title="Calm tools" subtitle="What kids can reach any time on the wall when feelings get big." />
          <CalmToolsView
            tools={[
              { id: "c1", type: "breathing", enabled: true, config: { pattern: "4-7-8", rounds: 4 } },
              { id: "c2", type: "feelings", enabled: true, config: { options: ["happy", "calm", "sad", "angry", "worried", "tired"] } },
              { id: "c3", type: "break", enabled: false, config: { minutes: 5 } },
            ]}
          />
        </>
      ) : view === "rules" ? (
        <>
          <PageHeader title="House rules" subtitle="Clear rules on the wall, and calm steps if one is broken." />
          <RulesView
            rules={[
              { id: "h1", kind: "rule", title: "Be kind with words and hands", detail: null, emoji: "💛" },
              { id: "h2", kind: "rule", title: "Listen the first time", detail: null, emoji: "👂" },
              { id: "h3", kind: "consequence", title: "Gentle reminder", detail: "A calm heads-up about the choice.", emoji: "💬" },
              { id: "h4", kind: "consequence", title: "Warning", detail: "Last chance to turn it around.", emoji: "⏸️" },
            ]}
          />
        </>
      ) : view === "times" ? (
        <>
          <PageHeader title="Routine times" subtitle="Who does what, and when it shows on the wall." />
          <section className="mb-6 rounded-2xl border border-line bg-surface p-4">
            <FamilyScheduleGrid
              rows={[
                { child: KIDS[0], blocks: [{ id: "b1", name: "Morning", start: "06:30", end: "09:00", shared: true, disabled: false }, { id: "b2", name: "Bedtime", start: "18:30", end: "21:00", shared: false, disabled: false }] },
                { child: { ...KIDS[1], color: "#F6D365" }, blocks: [{ id: "b3", name: "Morning", start: "07:00", end: "09:30", shared: true, disabled: false }] },
              ]}
            />
          </section>
          <FamilyTimes times={[{ id: "t1", name: "School morning", start: "07:00", end: "07:45", days: [1, 2, 3, 4, 5], label: "7:00 – 7:45 AM · Weekdays", following: 2 }]} />
        </>
      ) : view === "screens" ? (
        <>
          <PageHeader title="Screens" subtitle="Your family wall and any bedroom screens — see what's online, rename, or add another." />
          <ScreensView screens={SCREENS} kids={KIDS} />
        </>
      ) : view === "more" ? (
        <>
          <PageHeader title="More" />
          <NavHub groups={MORE_GROUPS} />
        </>
      ) : (
        <>
          <PageHeader title="Settings" />
          <SettingsList
            data={{
              familyName: "Rivera Family",
              timezone: "America/New_York",
              pinSet: true,
              wall: { screensaver: true, idleSeconds: 120, quietStart: "20:30", quietEnd: "06:30", weatherCity: "Austin, Texas", photos: [] },
              screens: 2,
              google: { connected: false, email: null, lastSynced: null, status: null },
              theme: "dark",
              notifications: { pushConfigured: true, vapidPublicKey: "", prefs: DEFAULT_PREFS },
            }}
          />
        </>
      )}
    </DevShell>
  );
}
