import Link from "next/link";
import { Anchor, Waves, Sliders, Tablet, ListChecks, Gift, CalendarDays, Check, X, WifiOff, Lock, MicOff } from "lucide-react";
import { Wordmark } from "@/components/brand/Logo";
import { HarborScene } from "@/components/brand/illustrations";
import { WaitlistForm } from "@/components/marketing/WaitlistForm";
import { KioskMockup } from "@/components/marketing/KioskMockup";
import { Card } from "@/components/ui/primitives";

export const metadata = {
  title: "Harbor — helps your family, especially on the hard days",
  description:
    "The family wall for busy and neurodivergent homes. Routines, rewards, and two-way calendar sync — plus guided co-regulation for the meltdown a calendar can't touch. One payment, works offline, no always-on mic.",
};

const MOAT = [
  {
    icon: Anchor,
    title: "Anchor — for the meltdown",
    body: "When a child is dysregulated, the wall recedes and guides them: slow breathing they can feel through the screen, a feelings check-in, and a warm, non-shaming fresh start. Skylight is silent in this moment. It's the whole reason Harbor exists.",
  },
  {
    icon: Waves,
    title: "Tides — sees it coming",
    body: "Harbor quietly learns each child's rhythms and tells you, in plain language, when the hard moments tend to cluster and one thing that helps. A co-pilot for the hard days — not a chore chart that forgets your kid by tomorrow.",
  },
  {
    icon: Sliders,
    title: "Meets each child where they are",
    body: "One wall, adaptive intensity. A sensory-sensitive child gets gentle fades and quiet; a kid who loves big feedback gets the fireworks. The wall can even soften itself after a rough patch. No other family wall does this.",
  },
  {
    icon: Tablet,
    title: "Every spare tablet, included",
    body: "Turn any old tablet or phone into a per-child room device — their routine, their Anchor, a bedtime nightlight — at no extra cost. Skylight charges $139 per kid for Buddy. Harbor's room devices are free.",
  },
];

const BASICS = [
  { icon: ListChecks, label: "Visual routines & first-then boards" },
  { icon: Gift, label: "Stars, rewards & a cooperative family goal" },
  { icon: CalendarDays, label: "Two-way Google Calendar sync" },
  { icon: Anchor, label: "Calm Tools & guided Anchor sessions" },
];

const COMPARE: { feature: string; harbor: string; skylight: string; harborWins: boolean }[] = [
  { feature: "The dysregulated moment", harbor: "Guided co-regulation (Anchor)", skylight: "Nothing", harborWins: true },
  { feature: "Learns your child", harbor: "Tides pattern intelligence", skylight: "Stars forgotten tomorrow", harborWins: true },
  { feature: "Per-child room devices", harbor: "Any spare tablet — free", skylight: "Buddy, $139 each", harborWins: true },
  { feature: "Sensory adaptation", harbor: "Per-child intensity", skylight: "One setting for all", harborWins: true },
  { feature: "You own it", harbor: "One payment, works offline forever", skylight: "Subscription + hardware lock-in", harborWins: true },
  { feature: "Privacy", harbor: "Local-first · no always-on mic", skylight: "Cloud-first", harborWins: true },
  { feature: "Calendar & meal planning", harbor: "Two-way sync + capture", skylight: "Two-way sync + capture", harborWins: false },
];

const FAQ = [
  {
    q: "What does Harbor do that Skylight doesn't?",
    a: "Everything Skylight does — routines, rewards, two-way calendar sync, meal planning — plus the part a calendar can't touch: it meets a child in the meltdown with guided, multi-sensory co-regulation (Anchor), learns their rhythms to help you see it coming (Tides), and adapts its whole sensory intensity to the child in front of it.",
  },
  {
    q: "Do I need to pay monthly?",
    a: "No. The wall is a one-time install and runs entirely on the device — it keeps working forever with no required subscription. Harbor Plus is optional and only adds cloud backup, edit-from-your-phone sync, calendar sync, and insights.",
  },
  {
    q: "Is there an always-on microphone?",
    a: "No. Voice is tap-to-talk only and off by default — the wall listens only when your child taps it. Combined with local-first storage and your own AI key, your family's data stays yours.",
  },
  {
    q: "What if the internet goes down?",
    a: "Nothing changes. The daily core — routines, rewards, Calm Tools, Anchor — runs local-first on the tablet and works with the internet unplugged. Sync just resumes when you're back online (with Plus).",
  },
  {
    q: "Who is Harbor for?",
    a: "Busy and neurodivergent households who want a calm, predictable home base — built around structure, rhythm, and dignity. Never labels or diagnosis.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-seafog">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0f14]/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <span className="text-white [&_*]:!text-white">
            <Wordmark />
          </span>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-xl px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10">
              Sign in
            </Link>
            <Link
              href="#waitlist"
              className="rounded-xl bg-beacon px-4 py-2 text-sm font-bold text-harbor shadow-button transition hover:brightness-105 active:translate-y-px"
            >
              Join the waitlist
            </Link>
          </div>
        </div>
      </header>

      {/* ── Cinematic hero — the harbor at night ─────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#0b0f14] text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 50% at 78% 0%, rgba(246,178,61,0.16), transparent 60%), radial-gradient(55% 50% at 10% 100%, rgba(60,188,217,0.12), transparent 65%)",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 sm:py-28 lg:grid-cols-2">
          <div className="animate-enter text-center lg:text-left">
            <p className="text-eyebrow text-beacon">The family wall, reimagined</p>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.04] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              Skylight keeps the schedule.
              <br />
              <span className="text-seafoam">Harbor helps your family.</span>
            </h1>
            <p className="mt-5 font-display text-2xl font-bold text-beacon">Especially on the hard days.</p>
            <p className="mx-auto mt-5 max-w-xl text-lg text-white/70 lg:mx-0">
              The wall-mounted home base for busy and neurodivergent families — visual routines, rewards,
              and two-way calendar sync, plus the one thing a calendar can&apos;t do: meet a child in the
              meltdown with guided, multi-sensory co-regulation.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Link
                href="#waitlist"
                className="rounded-2xl bg-beacon px-7 py-4 text-lg font-bold text-harbor shadow-button transition hover:brightness-105 active:translate-y-px"
              >
                Become a Founding Family
              </Link>
              <Link
                href="/kiosk"
                className="rounded-2xl border border-white/15 bg-white/5 px-7 py-4 text-lg font-semibold text-white transition hover:-translate-y-0.5 hover:border-white/30"
              >
                See the wall
              </Link>
            </div>
            <p className="mt-4 text-sm text-white/45">Founding rate · first 15 households · $249 installed</p>
          </div>

          <div className="animate-enter" style={{ animationDelay: "120ms" }}>
            <KioskMockup />
          </div>
        </div>

        {/* privacy / trust strip */}
        <div className="relative border-t border-white/10">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 px-5 py-5 sm:grid-cols-4">
            {[
              { icon: MicOff, label: "No always-on mic" },
              { icon: WifiOff, label: "Works offline forever" },
              { icon: Check, label: "One payment — you own it" },
              { icon: Lock, label: "Local-first & private" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center justify-center gap-2 text-center">
                <Icon className="h-5 w-5 shrink-0 text-beacon" />
                <span className="text-sm font-semibold text-white/80">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The hard day (emotional core) ────────────────────────────────────── */}
      <section className="bg-[#11161d] text-white">
        <div className="mx-auto max-w-3xl px-5 py-20 text-center">
          <p className="text-eyebrow text-beacon">The moment no one else serves</p>
          <h2 className="mt-3 text-balance font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            The meltdown. The refusal. The &ldquo;I can&apos;t.&rdquo;
          </h2>
          <p className="mt-5 text-pretty text-lg text-white/70">
            It&apos;s the hardest part of parenting a high-needs kid — and a paper chart makes it worse
            while a calendar sits silent. The instant a child reaches for it, Harbor&apos;s{" "}
            <strong className="text-white">Anchor</strong> takes over: the wall goes quiet, a slow
            breathing light they can <em>feel</em>, a gentle &ldquo;how are you feeling?&rdquo;, and a
            warm welcome back. No timers shouting. No shame. Just steadiness.
          </p>
          <p className="mt-6 font-display text-xl font-bold text-seafoam">
            Skylight rewards the checklist. Harbor helps when the checklist falls apart.
          </p>
        </div>
      </section>

      {/* ── The moat ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <p className="text-eyebrow text-center text-water">Why families switch</p>
        <h2 className="mt-2 text-center font-display text-3xl font-extrabold tracking-tight text-harbor sm:text-4xl">
          The four things Skylight can&apos;t follow.
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {MOAT.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="p-7">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#16586a,#0c3b47)] text-white shadow-button">
                <Icon className="h-7 w-7" />
              </span>
              <h3 className="mt-5 text-title text-harbor">{title}</h3>
              <p className="mt-2 text-pretty text-muted">{body}</p>
            </Card>
          ))}
        </div>

        <div className="mt-8 rounded-3xl border border-harbor-100 bg-white p-7 shadow-card">
          <p className="text-eyebrow text-water">And all the basics, done beautifully</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {BASICS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5 rounded-xl bg-surface-sunken px-3.5 py-3">
                <Icon className="h-5 w-5 shrink-0 text-water" />
                <span className="text-sm font-semibold text-harbor">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison ───────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-5 pb-20">
        <h2 className="text-center font-display text-3xl font-extrabold tracking-tight text-harbor sm:text-4xl">
          Harbor vs. Skylight
        </h2>
        <p className="mt-2 text-center text-muted">The honest contrast — we respect what they do well.</p>
        <div className="mt-8 overflow-hidden rounded-3xl border border-harbor-100 bg-white shadow-card">
          <div className="grid grid-cols-[1.3fr_1fr_1fr] gap-px bg-harbor-100 text-sm">
            <div className="bg-harbor px-4 py-3 font-bold text-white">&nbsp;</div>
            <div className="bg-harbor px-4 py-3 text-center font-bold text-beacon">Harbor</div>
            <div className="bg-harbor px-4 py-3 text-center font-bold text-white/70">Skylight</div>
            {COMPARE.map((r) => (
              <div key={r.feature} className="contents">
                <div className="bg-white px-4 py-3 font-semibold text-harbor">{r.feature}</div>
                <div className="bg-seafoam/30 px-4 py-3 text-center">
                  <span className="inline-flex items-start gap-1.5 text-left text-harbor">
                    {r.harborWins && <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />}
                    <span className="font-medium">{r.harbor}</span>
                  </span>
                </div>
                <div className="bg-white px-4 py-3 text-center text-muted">
                  <span className="inline-flex items-start gap-1.5 text-left">
                    {r.harborWins ? <X className="mt-0.5 h-4 w-4 shrink-0 text-red-400" /> : <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted" />}
                    <span>{r.skylight}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Local-first promise ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="grid items-center gap-8 rounded-3xl bg-harbor p-8 text-white shadow-pop sm:p-12 md:grid-cols-2">
          <div>
            <p className="text-eyebrow text-beacon">The promise</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              It works forever — even with the internet unplugged.
            </h2>
            <p className="mt-4 text-seafoam">
              The wall runs <strong>local-first</strong>, right on the device. No servers required for
              daily use, so the product you buy keeps working. That&apos;s how we promise no required
              monthly fee — and mean it.
            </p>
          </div>
          <ul className="space-y-3">
            {[
              "Runs fully offline on the tablet",
              "Your one-time install — you own it",
              "Optional Harbor Plus adds cloud backup, calendar sync & insights",
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

      {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-5 pb-20">
        <p className="text-eyebrow text-center text-water">Questions</p>
        <h2 className="mt-2 text-center font-display text-3xl font-extrabold tracking-tight text-harbor">The honest answers.</h2>
        <div className="mt-8 space-y-3">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group rounded-2xl border border-harbor-100 bg-white p-5 shadow-card">
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-title text-harbor">
                {q}
                <span className="text-muted transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-pretty text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Founder offer + waitlist ─────────────────────────────────────────── */}
      <section id="waitlist" className="mx-auto max-w-3xl scroll-mt-20 px-5 py-20">
        <div className="text-center">
          <HarborScene className="mx-auto mb-6 h-28 w-auto text-harbor" />
          <span className="inline-flex items-center rounded-full bg-beacon-soft px-4 py-1.5 text-sm font-bold text-harbor">
            Founding Family offer · first 15 households
          </span>
          <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-harbor sm:text-4xl">
            $249 installed — half off, for the first 15.
          </h2>
          <p className="mt-3 text-pretty text-muted">
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
          <p className="text-sm text-muted">© 2026 Harbor · helps your family, especially on the hard days.</p>
        </div>
      </footer>
    </div>
  );
}
