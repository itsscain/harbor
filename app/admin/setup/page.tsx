import Link from "next/link";
import { Wordmark } from "@/components/brand/Logo";
import { serverEnv } from "@/lib/env";
import { adminExists } from "./actions";
import { SetupForm } from "./SetupForm";

export const metadata = { title: "First-time setup" };
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const exists = await adminExists();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-seafog px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex justify-center">
          <Wordmark />
        </Link>
        <div className="rounded-2xl border border-harbor-100 bg-white p-8 shadow-sm">
          <h1 className="font-display text-2xl font-bold text-harbor">
            Company setup
          </h1>
          <p className="mt-1 text-sm text-muted">
            Create the one operator (admin) account. This page closes itself once
            an admin exists.
          </p>

          {exists ? (
            <div className="mt-6 space-y-4">
              <p className="rounded-xl bg-harbor-50 px-4 py-3 text-sm text-harbor">
                Setup is already complete — an admin account exists.
              </p>
              <Link
                href="/login?next=/admin"
                className="inline-flex rounded-xl bg-harbor px-5 py-3 font-semibold text-white"
              >
                Sign in
              </Link>
            </div>
          ) : (
            <div className="mt-6">
              <SetupForm defaultEmail={serverEnv.adminEmail} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
