import type { Metadata } from "next";
import { Wordmark } from "@/components/brand/Logo";
import { ParentNav } from "@/components/app/ParentNav";
import { ParentRail } from "@/components/app/ParentRail";
import { AccountMenu } from "@/components/app/AccountMenu";
import { RouteTransition } from "@/components/app/RouteTransition";
import { RealtimeRefresh } from "@/components/app/RealtimeRefresh";
import { requireUser } from "@/lib/auth";
import { getMyHousehold } from "@/lib/household";

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

  return (
    <div className="min-h-dvh bg-seafog">
      {household?.id && <RealtimeRefresh householdId={household.id} />}
      {/* Desktop: persistent command rail (The Helm). Mobile: bottom nav. */}
      <ParentRail householdName={household?.name} />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-harbor-100 bg-white/85 px-4 pb-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))] backdrop-blur-lg lg:hidden">
          <Wordmark />
          <AccountMenu householdName={household?.name} />
        </header>
        <main className="mx-auto w-full max-w-2xl p-4 pb-24 sm:p-6 lg:max-w-5xl lg:px-10 lg:py-8 lg:pb-10">
          <RouteTransition>{children}</RouteTransition>
        </main>
      </div>
      <div className="lg:hidden">
        <ParentNav />
      </div>
    </div>
  );
}
