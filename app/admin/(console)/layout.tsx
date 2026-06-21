import Link from "next/link";
import { LogOut } from "lucide-react";
import { Wordmark } from "@/components/brand/Logo";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/auth";
import { signOut } from "@/lib/actions/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAdmin();

  return (
    <div className="flex min-h-screen bg-seafog">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-harbor-100 bg-white p-5 md:flex">
        <Link href="/admin" className="mb-8">
          <Wordmark />
        </Link>
        <AdminNav />
        <div className="mt-auto rounded-2xl bg-surface-sunken p-3">
          <p className="text-eyebrow text-muted">Signed in as</p>
          <p className="text-sm font-semibold text-harbor">
            {profile.full_name || "Operator"}
          </p>
          <form action={signOut}>
            <button
              type="submit"
              className="mt-2 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-muted transition hover:bg-white hover:text-harbor"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex w-full flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-harbor-100 bg-white/85 px-4 py-3 backdrop-blur-lg md:hidden">
          <Wordmark />
          <form action={signOut}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-harbor"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </form>
        </header>
        <div className="sticky top-[57px] z-10 border-b border-harbor-100 bg-white/85 px-2 py-2 backdrop-blur-lg md:hidden">
          <AdminNav orientation="horizontal" />
        </div>

        <main className="mx-auto w-full max-w-6xl flex-1 p-5 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
