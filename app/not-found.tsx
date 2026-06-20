import Link from "next/link";
import { LighthouseMark } from "@/components/brand/Logo";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-seafog px-6 text-center">
      <LighthouseMark className="h-14 w-14 text-harbor" />
      <h1 className="mt-6 font-display text-4xl font-extrabold text-harbor">Lost at sea</h1>
      <p className="mt-2 max-w-sm text-muted">
        We couldn&apos;t find that page. Let&apos;s get you back to safe harbor.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-harbor px-6 py-3 font-semibold text-white transition hover:bg-harbor-700"
      >
        Go home
      </Link>
    </main>
  );
}
