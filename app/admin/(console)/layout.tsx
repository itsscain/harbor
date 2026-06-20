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
        <div className="mt-auto border-t border-harbor-100 pt-4">
          <p className="px-3 text-xs text-muted">Signed in as</p>
          <p className="px-3 text-sm font-semibold text-harbor">
            {profile.full_name || "Operator"}
          </p>
          <form action={signOut}>
            <button
              type="submit"
              className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:bg-harbor-50 hover:text-harbor"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex w-full flex-col">
        <header className="flex items-center justify-between border-b border-harbor-100 bg-white px-4 py-3 md:hidden">
          <Wordmark />
          <form action={signOut}>
            <button type="submit" className="text-sm font-semibold text-muted">
              Sign out
            </button>
          </form>
        </header>
        <div className="md:hidden border-b border-harbor-100 bg-white px-2 py-2 overflow-x-auto">
          <AdminNav />
        </div>

        <main className="mx-auto w-full max-w-6xl flex-1 p-5 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
