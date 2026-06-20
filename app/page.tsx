import Link from "next/link";
import {
  ListChecks,
  HeartHandshake,
  ShieldCheck,
  Check,
  WifiOff,
} from "lucide-react";
import { Wordmark, LighthouseMark } from "@/components/brand/Logo";
import { WaitlistForm } from "@/components/marketing/WaitlistForm";

export const metadata = {
  title: "Harbor — calm on the wall for busy families",
};

const PILLARS = [
  {
    icon: ListChecks,
    title: "Routines on the wall",
    body: "Visual daily routines and first-then boards, always glanceable. Tap to complete, earn stars, and watch the day take shape — no nagging.",
  },
  {
    icon: HeartHandshake,
    title: "A calm-down corner they control",
    body: "Guided breathing, a feelings check-in, an “I need a break” button, and social stories — there whenever a child reaches for them.",
  },
  {
    icon: ShieldCheck,
    title: "Locked down so it survives kids",
    body: "Kid-proof by default. A parent PIN gates every setting and edit. Kids can finish their steps and self-regulate — and nothing else.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-seafog">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-harbor-100 bg-seafog/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <Wordmark />
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-harbor hover:text-water">
              Sign in
            </Link>
            <Link
              href="#waitlist"
              className="rounded-xl bg-harbor px-4 py-2 text-sm font-semibold text-white hover:bg-harbor-700"
            >
              Join the waitlist
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[480px] w-[480px] -translate-x-1/2 beacon-ring" aria-hidden />
        <div className="relative mx-auto max-w-3xl px-5 py-20 text-center sm:py-28">
          <LighthouseMark className="mx-auto h-14 w-14 text-harbor" />
          <h1 className="mt-6 font-display text-4xl font-extrabold leading-tight text-harbor sm:text-6xl">
            Calm on the wall for busy, beautiful, chaotic families.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted sm:text-xl">
            Harbor turns a wall-mounted tablet into a steady home base for
            neurodivergent and busy households — visual routines, a calm-down
            corner kids control, and kid-proof lockdown.
          </p>
          <p className="mt-6 font-display text-xl font-bold text-harbor">
            One payment. You own it. No required monthly fee.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="#waitlist"
              className="rounded-2xl bg-beacon px-7 py-4 text-lg font-bold text-harbor transition hover:brightness-95"
            >
              Become a Founding Family
            </Link>
            <Link
              href="/kiosk"
              className="rounded-2xl border border-harbor-100 bg-white px-7 py-4 text-lg font-semibold text-harbor transition hover:bg-harbor-50"
            >
              See the wall app
            </Link>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-5xl px-5 py-12">
        <div className="grid gap-5 md:grid-cols-3">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-3xl border border-harbor-100 bg-white p-7 shadow-sm">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-harbor text-white">
                <Icon className="h-7 w-7" />
              </span>
              <h3 className="mt-5 font-display text-xl font-bold text-harbor">{title}</h3>
              <p className="mt-2 text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Promise / local-first */}
      <section className="mx-auto max-w-5xl px-5 py-12">
        <div className="grid items-center gap-8 rounded-3xl bg-harbor p-8 text-white sm:p-12 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-extrabold sm:text-4xl">
              It works forever — even with the internet unplugged.
            </h2>
            <p className="mt-4 text-seafoam">
              The wall runs <strong>local-first</strong>, right on the device. No
              servers required for daily use, so the product you buy keeps working.
              That&apos;s how we can promise no required monthly fee — and mean it.
            </p>
          </div>
          <ul className="space-y-3">
            {[
              "Runs fully offline on the tablet",
              "Your one-time install — you own it",
              "Optional Harbor Plus adds cloud backup & remote editing",
              "Cancel Plus anytime; the wall keeps working as-is",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 rounded-xl bg-white/10 px-4 py-3">
                {item.startsWith("Runs fully") ? (
                  <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-beacon" />
                ) : (
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-beacon" />
                )}
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Founder offer + waitlist */}
      <section id="waitlist" className="mx-auto max-w-3xl scroll-mt-20 px-5 py-16">
        <div className="text-center">
          <span className="inline-flex items-center rounded-full bg-beacon-soft px-4 py-1.5 text-sm font-bold text-harbor">
            Founding Family offer · first 15 households
          </span>
          <h2 className="mt-4 font-display text-3xl font-extrabold text-harbor sm:text-4xl">
            $249 installed — half off, for the first 15.
          </h2>
          <p className="mt-3 text-muted">
            Founding Families get the full Harbor wall professionally installed at
            the founder rate, in exchange for feedback and a testimonial. Join the
            list and we&apos;ll be in touch.
          </p>
        </div>
        <div className="mt-8">
          <WaitlistForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-harbor-100 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-5 py-8 sm:flex-row">
          <Wordmark />
          <p className="text-sm text-muted">
            © {new Date().getFullYear()} Harbor. Built for calmer homes.
          </p>
        </div>
      </footer>
    </div>
  );
}
