import { Wordmark } from "@/components/brand/Logo";
import { ParentNav } from "@/components/app/ParentNav";
import { ParentRail } from "@/components/app/ParentRail";
import { AccountMenu } from "@/components/app/AccountMenu";
import { RouteTransition } from "@/components/app/RouteTransition";
import { requireUser } from "@/lib/auth";
import { getMyHousehold } from "@/lib/household";

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  const household = await getMyHousehold();

  return (
    <div className="min-h-screen bg-seafog">
      {/* Desktop: persistent command rail (The Helm). Mobile: bottom nav. */}
      <ParentRail householdName={household?.name} />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-harbor-100 bg-white/85 px-4 py-2.5 backdrop-blur-lg lg:hidden">
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
