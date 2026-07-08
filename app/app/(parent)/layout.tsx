import type { Metadata } from "next";
import { Wordmark } from "@/components/brand/Logo";
import { ParentNav } from "@/components/app/ParentNav";
import { ParentRail } from "@/components/app/ParentRail";
import { AccountMenu } from "@/components/app/AccountMenu";
import { RouteTransition } from "@/components/app/RouteTransition";
import { RealtimeRefresh } from "@/components/app/RealtimeRefresh";
import { RegisterSWApp } from "@/components/app/RegisterSWApp";
import { NotificationPrompt } from "@/components/app/NotificationPrompt";
import { NotificationBell } from "@/components/app/NotificationBell";
import { BadgeSync } from "@/components/app/BadgeSync";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { getMyHousehold } from "@/lib/household";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

// /app gets its own standalone manifest so "Add to Home Screen" installs the parent app
// (start_url/scope = /app) chrome-less, separate from the /kiosk wall app.
export const metadata: Metadata = {
  manifest: "/manifest-app.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Harbor" },
};

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  const household = await getMyHousehold();
  // Dark is the default Helm skin; the Settings toggle writes this cookie.
  const theme = (await cookies()).get("harbor-theme")?.value === "light" ? "light" : "dark";

  // Unread count drives the nav bell + the installed app-icon badge (RLS scopes to this parent).
  let unread = 0;
  try {
    const supabase = await createClient();
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("status", "unread");
    unread = count ?? 0;
  } catch {
    /* tolerate the table not existing yet */
  }

  return (
    <div data-theme={theme} data-app-theme-root className="min-h-dvh bg-bg text-fg">
      {household?.id && <RealtimeRefresh householdId={household.id} />}
      <RegisterSWApp vapidKey={env.vapidPublicKey} />
      <NotificationPrompt vapidKey={env.vapidPublicKey} />
      <BadgeSync count={unread} />
      {/* Desktop: persistent command rail (The Helm). Mobile: bottom nav. */}
      <ParentRail householdName={household?.name} unread={unread} />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-surface/85 px-4 pb-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))] backdrop-blur-lg lg:hidden">
          <Wordmark />
          <div className="flex items-center gap-1">
            <NotificationBell count={unread} />
            <AccountMenu householdName={household?.name} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-2xl p-4 pb-24 sm:p-6 lg:max-w-5xl lg:px-10 lg:py-8 lg:pb-10">
          <RouteTransition>{children}</RouteTransition>
        </main>
      </div>
      <div className="lg:hidden">
        <ParentNav unread={unread} />
      </div>
    </div>
  );
}
