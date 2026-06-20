import { LogOut } from "lucide-react";
import { Wordmark } from "@/components/brand/Logo";
import { ParentNav } from "@/components/app/ParentNav";
import { requireUser } from "@/lib/auth";
import { signOut } from "@/lib/actions/auth";

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return (
    <div className="min-h-screen bg-seafog pb-20">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-harbor-100 bg-white/95 px-4 py-3 backdrop-blur">
        <Wordmark />
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-harbor"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </form>
      </header>
      <main className="mx-auto w-full max-w-2xl p-4 sm:p-6">{children}</main>
      <ParentNav />
    </div>
  );
}
