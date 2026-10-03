import { notFound } from "next/navigation";
import { DevShell } from "../kid/DevShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { SettingsList } from "@/components/app/settings/SettingsList";
import { ScreensView, type Screen } from "@/components/app/devices/ScreensView";
import { NavHub } from "@/components/app/NavHub";
import { MORE_GROUPS } from "@/lib/app-nav";
import { DEFAULT_PREFS } from "@/lib/notifications/prefs";

// Development-only: Settings, Screens and More with mock data (404s in production).
// /dev/settings?view=settings|screens|more
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
      {view === "screens" ? (
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
