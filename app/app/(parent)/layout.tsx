import { Wordmark } from "@/components/brand/Logo";
import { ParentNav } from "@/components/app/ParentNav";
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
    <div className="min-h-screen bg-seafog pb-24">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-harbor-100 bg-white/85 px-4 py-2.5 backdrop-blur-lg">
        <Wordmark />
        <AccountMenu householdName={household?.name} />
      </header>
      <main className="mx-auto w-full max-w-2xl p-4 sm:p-6">
        <RouteTransition>{children}</RouteTransition>
      </main>
      <ParentNav />
    </div>
  );
}
