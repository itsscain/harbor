import Link from "next/link";
import { Wordmark } from "@/components/brand/Logo";

/**
 * Temporary home. The full Founding Family landing page is built in Milestone 7;
 * this keeps the root route presentable until then.
 */
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-seafog px-6 text-center">
      <Wordmark className="scale-125" />
      <div className="max-w-xl">
        <h1 className="font-display text-4xl font-extrabold text-harbor sm:text-5xl">
          Calm on the wall for busy families.
        </h1>
        <p className="mt-4 text-lg text-muted">
          Visual routines, a calm-down corner kids control, and kid-proof
          lockdown — on a wall-mounted tablet. One payment, you own it. No
          required monthly fee.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/login"
          className="rounded-xl bg-harbor px-6 py-3 font-semibold text-white transition hover:bg-harbor-700"
        >
          Sign in
        </Link>
        <Link
          href="/kiosk"
          className="rounded-xl border border-harbor-100 bg-white px-6 py-3 font-semibold text-harbor transition hover:bg-harbor-50"
        >
          Open the wall app
        </Link>
      </div>
    </main>
  );
}
