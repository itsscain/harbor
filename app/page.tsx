import Link from "next/link";
import { ListChecks, HeartHandshake, ShieldCheck, Check, WifiOff, Lock } from "lucide-react";
import { Wordmark } from "@/components/brand/Logo";
import { WaitlistForm } from "@/components/marketing/WaitlistForm";
import { KioskMockup } from "@/components/marketing/KioskMockup";
import { Card } from "@/components/ui/primitives";

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

const TRUST = [
  { icon: WifiOff, label: "Works fully offline" },
  { icon: Check, label: "One payment — you own it" },
  { icon: Lock, label: "Private by design" },
  { icon: ShieldCheck, label: "Kid-proof lockdown" },
];

const FAQ = [
  {
    q: "Do I need to pay monthly?",
    a: "No. The wall is a one-time install and runs entirely on the device — it keeps working forever with no required subscription. Harbor Plus is optional and only adds cloud backup, edit-from-your-phone sync, and insights.",
  },
  {
    q: "What if the internet goes down?",
    a: "Nothing changes. The daily core runs local-first on the tablet, so routines, rewards, and the calm corner all work with the internet unplugged. Sync just resumes when you're back online (with Plus).",
  },
  {
    q: "Is it really kid-proof?",
    a: "Yes. The wall is locked to Harbor and a parent PIN gates every setting, edit, and exit. Kids can finish their steps and use the calm corner — and nothing else.",
  },
  {
    q: "Who is Harbor for?",
    a: "Busy and neurodivergent households who want a calm, predictable home base. It's built around structure and rhythm — never labels or diagnosis.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-seafog">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-harbor-100 bg-seafog/85 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Wordmark />
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-xl px-3 py-2 text-sm font-semibold text-harbor transition hover:bg-harbor-50">
              Sign in
            </Link>
            <Link
              href="#waitlist"
              className="rounded-xl bg-[linear-gradient(180deg,#16586a,#0c3b47)] px-4 py-2 text-sm font-semibold text-white shadow-button transition hover:brightness-110 active:translate-y-px"
            >
              Join the waitlist
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <span className="absolute left-1/2 top-0 h-[480px] w-[480px] -translate-x-1/2 beacon-ring" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:py-24 lg:grid-cols-2">
          <div className="animate-enter text-center lg:text-left">
            <p className="text-eyebrow text-water">For busy, beautiful, chaotic families</p>
            <h1 className="mt-3 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-harbor sm:text-5xl lg:text-6xl">
              Calm on the wall, every single day.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-muted lg:mx-0">
              Harbor turns a wall-mounted tablet into a steady home base — visual routines, a
              calm-down corner kids control, and kid-proof lockdown.
            </p>
            <p className="mt-6 font-display text-xl font-bold text-harbor">
              One payment. You own it. No required monthly fee.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Link
                href="#waitlist"
                className="rounded-2xl bg-[linear-gradient(180deg,#f8bf57,#f2a92f)] px-7 py-4 text-lg font-bold text-harbor shadow-button transition hover:brightness-105 active:translate-y-px"
              >
                Become a Founding Family
              </Link>
              <Link
                href="/kiosk"
                className="rounded-2xl border border-harbor-100 bg-white px-7 py-4 text-lg font-semibold text-harbor shadow-card transition hover:-translate-y-0.5 hover:border-water/40"
              >
                See the wall app
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted">Founding rate · first 15 households · $249 installed</p>
          </div>

          <div className="animate-enter" style={{ animationDelay: "120ms" }}>
            <KioskMockup />
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-harbor-100 bg-white">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 px-5 py-6 sm:grid-cols-4">
          {TRUST.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center justify-center gap-2 text-center">
              <Icon className="h-5 w-5 shrink-0 text-water" />
              <span className="text-sm font-semibold text-harbor">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <p className="text-eyebrow text-center text-water">What's on the wall</p>
        <h2 className="mt-2 text-center font-display text-3xl font-extrabold tracking-tight text-harbor sm:text-4xl">
          Three things, done beautifully.
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <Card key={title} interactive className="p-7">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#16586a,#0c3b47)] text-white shadow-button">
                <Icon className="h-7 w-7" />
              </span>
              <h3 className="mt-5 text-title text-harbor">{title}</h3>
              <p className="mt-2 text-muted">{body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Promise / local-first */}
      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="grid items-center gap-8 rounded-3xl bg-harbor p-8 text-white shadow-pop sm:p-12 md:grid-cols-2">
          <div>
            <p className="text-eyebrow text-beacon">The promise</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              It works forever — even with the internet unplugged.
            </h2>
            <p className="mt-4 text-seafoam">
              The wall runs <strong>local-first</strong>, right on the device. No servers required for
              daily use, so the product you buy keeps working. That&apos;s how we can promise no required
              monthly fee — and mean it.
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

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 pb-16">
        <p className="text-eyebrow text-center text-water">Questions</p>
        <h2 className="mt-2 text-center font-display text-3xl font-extrabold tracking-tight text-harbor">
          The honest answers.
        </h2>
        <div className="mt-8 space-y-3">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group rounded-2xl border border-harbor-100 bg-white p-5 shadow-card">
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-title text-harbor">
                {q}
                <span className="text-muted transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Founder offer + waitlist */}
      <section id="waitlist" className="mx-auto max-w-3xl scroll-mt-20 px-5 py-16">
        <div className="text-center">
          <span className="inline-flex items-center rounded-full bg-beacon-soft px-4 py-1.5 text-sm font-bold text-harbor">
            Founding Family offer · first 15 households
          </span>
          <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-harbor sm:text-4xl">
            $249 installed — half off, for the first 15.
          </h2>
          <p className="mt-3 text-muted">
            Founding Families get the full Harbor wall professionally installed at the founder rate, in
            exchange for feedback and a testimonial. Join the list and we&apos;ll be in touch.
          </p>
        </div>
        <div className="mt-8">
          <WaitlistForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-harbor-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 sm:flex-row">
          <Wordmark />
          <p className="text-sm text-muted">© 2026 Harbor. Built for calmer homes.</p>
        </div>
      </footer>
    </div>
  );
}
