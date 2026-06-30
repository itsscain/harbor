import type { Metadata } from "next";
import Link from "next/link";
import { Anchor, Shield, Heart, WifiOff, Wrench, BadgeCheck, Star } from "lucide-react";
import { Wordmark } from "@/components/brand/Logo";
import { HarborScene } from "@/components/brand/illustrations";
import { FounderIntake } from "@/components/marketing/FounderIntake";
import { getFounderStatus, getPublicBuilds } from "@/lib/actions/founder";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Become a Founding Family",
  description:
    "Harbor is a calm, wall-mounted helper for families raising kids who need a little more. Claim a Founding Family spot — founder pricing, white-glove install, no payment now.",
  openGraph: {
    title: "Harbor — Become a Founding Family",
    description:
      "A calm wall that holds your family's routines and helps kids move through their day. Founder pricing, white-glove install, no payment now.",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Harbor — Become a Founding Family" },
};

const STEPS = [
  { t: "The day as a journey", d: "The wall shows each child's routine as a voyage — they see what's now and what's next, no nagging." },
  { t: "Tap through the day", d: "Kids tap each step done and watch their boat sail toward home. Calm, not gamified." },
  { t: "Help in hard moments", d: "One tap opens a breathing space that co-regulates — Harbor helps your child settle." },
  { t: "You steer from your phone", d: "Adjust routines, rewards, and the calendar gently from the companion app." },
];

const FAQ = [
  ["What if it doesn't work for my kid?", "There's a satisfaction guarantee. Harbor is built for neurodivergent and high-needs kids, and we help you set it up so it fits."],
  ["Do I have to pay now?", "No. Reserving secures your founder spot. We schedule your install, then invoice you — nothing up front."],
  ["How does install work?", "White-glove. We bring the right hardware for your wall, mount the hub (and a Lantern in each child's room), and set everything up."],
  ["Is my family's data private?", "Yes. A child's data stays private, never sold, on-device where possible. Privacy-first is core to Harbor."],
  ["What does it cost after?", "The wall is a one-time purchase you own. Harbor Plus (cloud sync) is optional — the daily core always works without it."],
  ["Which tablet do I need?", "We help you choose at signup, and it comes in the box. You don't source anything."],
];

export default async function FoundersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const utmRaw = sp.utm_source ?? sp.utm ?? sp.ref;
  const utm = Array.isArray(utmRaw) ? utmRaw[0] : utmRaw;
  const [status, builds] = await Promise.all([getFounderStatus(), getPublicBuilds()]);
  const soldOut = status.remaining <= 0 || status.state === "paused";
  // The Lantern is the per-child add-on, not a hub option — split it out of the hub list
  // and use its real catalog price as the multi-kid quote base.
  const lanternBuild = builds.find((b) => /lantern/i.test(b.name));
  const hubBuilds = builds.filter((b) => !/lantern/i.test(b.name));
  const lanternBase = lanternBuild ? Number(lanternBuild.founder_price) : undefined;

  const Scarcity = ({ className = "" }: { className?: string }) => (
    <span className={"inline-flex items-center gap-2 rounded-full bg-beacon-soft px-3.5 py-1.5 text-sm font-semibold text-harbor " + className}>
      <Star className="h-4 w-4 fill-beacon text-beacon" />
      {soldOut ? "Founding spots are full — join the waitlist" : `Only ${status.remaining} of ${status.cap} founder spots left`}
    </span>
  );

  return (
    <main className="bg-seafog text-ink">
      {/* header */}
      <header className="sticky top-0 z-20 flex items-center justify-between bg-[#0b0f14] px-5 py-3 text-white">
        <Wordmark />
        <Link href="#claim" className="rounded-xl bg-beacon px-4 py-2 text-sm font-semibold text-harbor">
          Claim your spot
        </Link>
      </header>

      {/* hero */}
      <section className="bg-[#0b0f14] px-5 pb-16 pt-10 text-white">
        <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-2">
          <div>
            <Scarcity className="mb-5" />
            <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">
              A calm wall for families raising kids who need a little more.
            </h1>
            <p className="mt-4 max-w-md text-lg text-white/70">
              Harbor holds your family&apos;s routines, helps each child move through their day, and co-regulates
              in the hard moments — so mornings and bedtimes get gentler.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="#claim" className="rounded-xl bg-beacon px-6 py-3 font-display text-lg font-bold text-harbor">
                Claim your founder spot
              </Link>
              <span className="text-sm text-white/60">Founding rate — $249 installed · save $150</span>
            </div>
          </div>
          <div className="text-water">
            <HarborScene className="mx-auto w-full max-w-sm" />
          </div>
        </div>
      </section>

      {/* trust strip */}
      <section className="border-b border-harbor-100 bg-white px-5 py-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-harbor">
          <span className="inline-flex items-center gap-2"><BadgeCheck className="h-5 w-5 text-water" /> Veteran-owned (SDVOSB)</span>
          <span className="inline-flex items-center gap-2"><Shield className="h-5 w-5 text-water" /> Privacy-first — never sold</span>
          <span className="inline-flex items-center gap-2"><Wrench className="h-5 w-5 text-water" /> White-glove install</span>
          <span className="inline-flex items-center gap-2"><Heart className="h-5 w-5 text-water" /> Built by a parent</span>
        </div>
      </section>

      {/* the problem — empathy */}
      <section className="px-5 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-eyebrow text-water">If your days feel like this</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-harbor">You know the hard parts.</h2>
          <p className="mt-4 text-lg text-muted">
            The meltdowns at transitions. Repeating the same reminders ten times. A schedule that lives only in
            your head. Apps that were never built for a kid who needs more. You&apos;re carrying a lot — Harbor is
            built to carry some of it with you.
          </p>
          <p className="mt-4 font-display text-xl font-semibold text-harbor">Harbor helps your child need Harbor less.</p>
        </div>
      </section>

      {/* how it works */}
      <section className="bg-white px-5 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-display text-3xl font-bold text-harbor">How Harbor works</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.t} className="rounded-2xl bg-seafog p-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-harbor font-display font-bold text-white">{i + 1}</div>
                <h3 className="mt-3 font-display text-lg font-bold text-harbor">{s.t}</h3>
                <p className="mt-1 text-sm text-muted">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* builds */}
      <section className="px-5 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold text-harbor">Choose your Harbor</h2>
            <p className="mt-2 text-muted">A central hub for the family — and a Lantern in each child&apos;s room. We install it all.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {hubBuilds.map((b) => (
              <div key={b.id} className={"rounded-2xl border bg-white p-6 " + (b.is_default ? "border-beacon shadow-card" : "border-harbor-100")}>
                {b.is_default && <span className="text-eyebrow text-beacon">Most popular</span>}
                <h3 className="mt-1 font-display text-xl font-bold text-harbor">{b.name}</h3>
                <p className="text-sm text-muted">{b.tablet_model} · {b.screen_size}</p>
                <p className="mt-3 font-display text-2xl font-bold text-harbor">${Number(b.founder_price).toLocaleString()}</p>
                <p className="text-xs text-muted line-through">${Number(b.standard_price).toLocaleString()} standard</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* why different */}
      <section className="bg-white px-5 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-harbor">Why Harbor is different</h2>
          <p className="mt-4 text-lg text-muted">
            Other family screens keep the schedule. <b className="text-harbor">Harbor helps the family.</b> It&apos;s
            built for neurodivergent and high-needs kids — calm, not gamified for health tasks — local-first and
            private, and made by a dad who needed it.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-water">
            <WifiOff className="h-4 w-4" /> Works fully offline — your day never depends on our servers
          </div>
        </div>
      </section>

      {/* claim */}
      <section id="claim" className="px-5 py-16">
        <div className="mx-auto max-w-xl">
          <div className="mb-6 text-center">
            <Anchor className="mx-auto h-9 w-9 text-water" />
            <h2 className="mt-3 font-display text-3xl font-bold text-harbor">
              {soldOut ? "Join the waitlist" : "Claim your founder spot"}
            </h2>
            <p className="mt-2 text-muted">
              {soldOut
                ? "Founding spots are full right now — leave your info and we'll reach out the moment one opens."
                : "No payment now — reserve your spot, we schedule your install, you're invoiced later."}
            </p>
            <div className="mt-3 flex justify-center"><Scarcity /></div>
          </div>
          <FounderIntake builds={hubBuilds} lanternBase={lanternBase} utm={utm} />
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white px-5 py-16">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center font-display text-3xl font-bold text-harbor">Questions, answered</h2>
          <div className="mt-8 space-y-3">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group rounded-2xl bg-seafog p-5">
                <summary className="cursor-pointer list-none font-display font-semibold text-harbor">{q}</summary>
                <p className="mt-2 text-sm text-muted">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-[#0b0f14] px-5 py-8 text-center text-sm text-white/50">
        <Wordmark />
        <p className="mt-2">Veteran-owned · built by a parent · your family&apos;s data stays private.</p>
      </footer>
    </main>
  );
}
