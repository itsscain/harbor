import Link from "next/link";
import { LighthouseMark } from "@/components/brand/Logo";

// A themed "not here" inside the parent app — it used to fall through to the light marketing
// 404, which linked to the public homepage instead of back to Today.
export default function ParentNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <LighthouseMark className="h-12 w-12 text-fg" />
      <h1 className="mt-4 font-display text-2xl font-extrabold text-fg">That page isn&apos;t here</h1>
      <p className="mt-2 max-w-sm text-fg-muted">It may have moved in the new layout. Everything still lives a tap or two from Today.</p>
      <Link
        href="/app"
        className="mt-6 min-h-11 rounded-xl bg-accent px-6 py-3 font-semibold text-accent-fg transition hover:brightness-110"
      >
        Back to Today
      </Link>
    </div>
  );
}
