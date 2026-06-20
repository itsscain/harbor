import Link from "next/link";
import { Wordmark } from "@/components/brand/Logo";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-seafog px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex justify-center">
          <Wordmark />
        </Link>
        <div className="rounded-2xl border border-harbor-100 bg-white p-8 shadow-sm">
          <h1 className="font-display text-2xl font-bold text-harbor">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-muted">
            Sign in to manage your household.
          </p>
          <LoginForm next={next} />
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          New here?{" "}
          <Link href="/#waitlist" className="font-semibold text-water underline">
            Join the Founding Family waitlist
          </Link>
        </p>
      </div>
    </main>
  );
}
