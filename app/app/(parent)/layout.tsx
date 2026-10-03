import type { Metadata, Viewport } from "next";
import { ParentNav } from "@/components/app/ParentNav";
import { ParentRail } from "@/components/app/ParentRail";
import { AppTopBarProvider } from "@/components/app/AppTopBar";
import { RouteTransition } from "@/components/app/RouteTransition";
import { RealtimeRefresh } from "@/components/app/RealtimeRefresh";
import { RegisterSWApp } from "@/components/app/RegisterSWApp";
import { NotificationPrompt } from "@/components/app/NotificationPrompt";
import { BadgeSync } from "@/components/app/BadgeSync";
import { QuickAddProvider } from "@/components/app/quick/QuickAdd";
import { ToastProvider } from "@/components/ui/Toast";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { getMyHousehold } from "@/lib/household";
import { createClient } from "@/lib/supabase/server";
import { tzFromSettings } from "@/lib/tz";
import { env } from "@/lib/env";

async function isDark(): Promise<boolean> {
  return (await cookies()).get("harbor-theme")?.value !== "light";
}

// /app gets its own standalone manifest so "Add to Home Screen" installs the parent app
// (start_url/scope = /app) chrome-less, separate from the /kiosk wall app. The iPhone status bar
// follows the skin: translucent-dark over the dark Helm (the header already pads for the notch),
// default on the light skin — no more white bar over a dark app.
export async function generateMetadata(): Promise<Metadata> {
  const dark = await isDark();
  return {
    manifest: "/manifest-app.webmanifest",
    appleWebApp: { capable: true, statusBarStyle: dark ? "black-translucent" : "default", title: "Harbor" },
  };
}

// The parent app allows pinch-zoom (accessibility); the kid-proof wall keeps it locked at root.
export async function generateViewport(): Promise<Viewport> {
  const dark = await isDark();
  return {
    themeColor: dark ? "#0b0e13" : "#eef3f4",
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: "cover",
  };
}

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  const household = await getMyHousehold();
  // Dark is the default Helm skin; the Settings toggle writes this cookie.
  const theme = (await cookies()).get("harbor-theme")?.value === "light" ? "light" : "dark";
  const supabase = await createClient();

  // Unread count drives the nav bell + the installed app-icon badge (RLS scopes to this parent).
  // The kids list powers the global "+" (Who? chips) from any screen.
  const [unreadRes, kidsRes] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("status", "unread"),
    household
      ? supabase
          .from("children")
          .select("id, name, avatar, photo_url, color")
          .eq("household_id", household.id)
          .is("deleted_at", null)
          .order("sort_order")
      : Promise.resolve({ data: [] }),
  ]);
  const unread = unreadRes.count ?? 0;
  const kids = (kidsRes.data ?? []) as { id: string; name: string; avatar: string | null; photo_url: string | null; color: string | null }[];
  const tz = tzFromSettings((household?.settings ?? {}) as Record<string, unknown>);

  return (
    <div data-theme={theme} data-app-theme-root className="min-h-dvh bg-bg text-fg">
      <ToastProvider>
        <QuickAddProvider kids={kids} tz={tz}>
          {household?.id && <RealtimeRefresh householdId={household.id} />}
          <RegisterSWApp vapidKey={env.vapidPublicKey} />
          <NotificationPrompt vapidKey={env.vapidPublicKey} />
          <BadgeSync count={unread} />
          {/* Desktop: persistent rail. Mobile: a context-aware top bar + the bottom nav with "+". */}
          <ParentRail householdName={household?.name} unread={unread} />
          <div className="lg:pl-64">
            <AppTopBarProvider unread={unread} householdName={household?.name}>
              <main className="mx-auto w-full max-w-2xl p-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:p-6 sm:pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:max-w-5xl lg:px-10 lg:py-8 lg:pb-10">
                <RouteTransition>{children}</RouteTransition>
              </main>
            </AppTopBarProvider>
          </div>
          <div className="lg:hidden">
            <ParentNav unread={unread} />
          </div>
        </QuickAddProvider>
      </ToastProvider>
    </div>
  );
}
