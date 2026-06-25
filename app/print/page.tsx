import type { Metadata } from "next";
import { Anchor, Waves as WavesIcon, Sliders, WifiOff, MicOff, Lock, Wrench, Users, Heart, Star } from "lucide-react";
import { Wordmark } from "@/components/brand/Logo";
import { HarborScene, Boat, AnchorMark } from "@/components/brand/illustrations";
import { PrintButton } from "@/components/marketing/PrintButton";

export const metadata: Metadata = {
  title: "Harbor — leave-behind collateral",
  robots: { index: false, follow: false },
};

// Swap for the custom domain once it's live.
const SITE = "harbor-liard.vercel.app";

/** A single printable sheet (letter portrait). Reversed teal-on-seafog (Brand §4.3). */
function Sheet({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={
        "sheet relative overflow-hidden rounded-[1.75rem] border border-harbor-100 bg-white p-12 shadow-card print:rounded-none " +
        (className ?? "")
      }
    >
      {children}
    </section>
  );
}

function Foot() {
  return (
    <div className="mt-auto flex items-center justify-between border-t border-harbor-100 pt-5 text-sm">
      <Wordmark className="[&_span]:text-lg" />
      <span className="text-muted">A steady light for your family.</span>
    </div>
  );
}

export default function PrintCollateral() {
  return (
    <div className="min-h-screen bg-seafog py-10">
      {/* Screen-only toolbar */}
      <div className="print-hide mx-auto mb-8 flex max-w-[51rem] flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-extrabold text-harbor">Harbor leave-behinds</h1>
          <p className="text-sm text-muted">Four cards for door-to-door + clinic referrals. Print, or Save as PDF (letter, portrait).</p>
        </div>
        <PrintButton />
      </div>

      <div className="mx-auto flex max-w-[51rem] flex-col gap-8 px-4 print:gap-0 print:px-0">
        {/* ── 1 · Brand summary ──────────────────────────────────────────────── */}
        <Sheet className="flex min-h-[9in] flex-col text-center">
          <div className="flex flex-col items-center">
            <HarborScene className="h-36 w-auto text-harbor" />
            <p className="mt-6 text-eyebrow text-water">The family wall, reimagined</p>
            <h2 className="mt-3 text-balance font-display text-[2.6rem] font-extrabold leading-[1.05] tracking-tight text-harbor">
              A steady light for your family.
            </h2>
            <p className="mt-3 font-display text-xl font-bold text-beacon">On the calm days and the hard ones.</p>
            <p className="mx-auto mt-5 max-w-md text-pretty text-muted">
              Harbor is a wall-mounted home base for busy and neurodivergent families — built around
              structure, rhythm, and dignity. It keeps the days predictable, and it&apos;s right there
              with you on the rough ones.
            </p>
          </div>
          <div className="mt-9 grid grid-cols-3 gap-4 text-left">
            {[
              { icon: Star, t: "Steady days", b: "Visual routines, rewards, and a calm family calendar — the whole crew, one glance." },
              { icon: Anchor, t: "The hard days", b: "When a child is overwhelmed, the wall guides them gently back to calm. A chart can't do that." },
              { icon: Lock, t: "Yours to keep", b: "One payment. Works offline forever. No required monthly fee, no always-on mic." },
            ].map((p) => (
              <div key={p.t} className="rounded-2xl bg-seafog/70 p-4">
                <p.icon className="h-5 w-5 text-water" />
                <p className="mt-2 font-display text-base font-bold text-harbor">{p.t}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{p.b}</p>
              </div>
            ))}
          </div>
          <div className="mt-auto pt-8">
            <p className="text-sm font-semibold text-harbor">{SITE}</p>
          </div>
        </Sheet>

        {/* ── 2 · What to expect (install) ───────────────────────────────────── */}
        <Sheet className="flex min-h-[9in] flex-col">
          <p className="text-eyebrow text-water">Your install</p>
          <h2 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-harbor">What to expect.</h2>
          <p className="mt-3 max-w-lg text-muted">
            We come to you. In about an hour, your family has a calm, working command center on the wall —
            set up around your kids, ready for the morning.
          </p>

          <ol className="mt-8 space-y-5">
            {[
              { icon: Wrench, t: "We mount it", b: "A tidy wall install at a height that works for your family — we handle the hardware." },
              { icon: Users, t: "We set up your crew", b: "Each child gets their own color, avatar, and routines. We'll build the first ones with you." },
              { icon: Heart, t: "It's yours from day one", b: "Walk through Calm Tools and Anchor together, and you're set. We're a text away after." },
            ].map((s, i) => (
              <li key={s.t} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-harbor text-white">
                  <s.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display text-lg font-bold text-harbor">
                    <span className="text-beacon">{i + 1}.</span> {s.t}
                  </p>
                  <p className="text-sm leading-relaxed text-muted">{s.b}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: WifiOff, t: "Works offline" },
              { icon: Star, t: "No monthly fee required" },
              { icon: MicOff, t: "No always-on mic" },
              { icon: Lock, t: "Your data stays home" },
            ].map((f) => (
              <div key={f.t} className="flex items-center gap-2 rounded-xl bg-seafog/70 px-3 py-2.5">
                <f.icon className="h-4 w-4 shrink-0 text-water" />
                <span className="text-xs font-semibold text-harbor">{f.t}</span>
              </div>
            ))}
          </div>

          <div className="mt-8" />
          <Foot />
        </Sheet>

        {/* ── 3 · Founding Family ────────────────────────────────────────────── */}
        <Sheet className="flex min-h-[9in] flex-col">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-eyebrow text-water">Founding Family · first 15 households</p>
              <h2 className="mt-2 text-balance font-display text-[2.5rem] font-extrabold leading-[1.05] tracking-tight text-harbor">
                $249, installed.
              </h2>
              <p className="mt-1 font-display text-xl font-bold text-beacon">Half off — for the first fifteen.</p>
            </div>
            <Boat className="h-16 w-16 shrink-0 text-harbor" />
          </div>

          <p className="mt-5 max-w-lg text-pretty text-muted">
            We&apos;re welcoming fifteen Founding Families at the founder rate. You get the full Harbor wall,
            professionally installed — in exchange for your honest feedback and a short testimonial as we grow.
          </p>

          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-harbor-100 bg-seafog/60 p-5">
              <p className="font-display text-base font-bold text-harbor">What you get</p>
              <ul className="mt-2 space-y-1.5 text-sm text-muted">
                <li>· The full Harbor wall, installed</li>
                <li>· Every feature — Anchor, Tides, routines, rewards</li>
                <li>· Free room devices on any spare tablet</li>
                <li>· One payment — it&apos;s yours</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-harbor-100 bg-seafog/60 p-5">
              <p className="font-display text-base font-bold text-harbor">What we ask</p>
              <ul className="mt-2 space-y-1.5 text-sm text-muted">
                <li>· Use it with your family</li>
                <li>· Tell us what helps and what doesn&apos;t</li>
                <li>· A short testimonial if you love it</li>
              </ul>
            </div>
          </div>

          <div className="mt-7 flex items-center gap-5 rounded-2xl bg-harbor p-5 text-white">
            <div className="flex-1">
              <p className="font-display text-lg font-bold">Claim your spot</p>
              <p className="mt-1 text-sm text-white/80">Scan to join — or visit the Founding Family list at</p>
              <p className="mt-0.5 font-display text-base font-extrabold text-beacon">{SITE}</p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/qr-waitlist.svg" alt="Scan to join the Harbor waitlist" width={96} height={96} className="shrink-0 rounded-lg bg-white p-2" />
          </div>

          <div className="mt-auto pt-7"><Foot /></div>
        </Sheet>

        {/* ── 4 · Clinician referral ─────────────────────────────────────────── */}
        <Sheet className="flex min-h-[9in] flex-col">
          <div className="flex items-center gap-3">
            <AnchorMark className="h-10 w-10 text-water" />
            <p className="text-eyebrow text-water">For the people who care for them</p>
          </div>
          <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-harbor">
            When a family needs more than a chart.
          </h2>
          <p className="mt-3 max-w-xl text-pretty text-muted">
            Harbor is a calm home base for families raising neurodivergent and high-needs kids. It carries the
            structure you already recommend — visual routines, first-then, predictable rhythms — and adds the
            part that&apos;s hardest to support between sessions: the rough moment itself.
          </p>

          <div className="mt-7 space-y-4">
            {[
              { icon: Anchor, t: "Guided co-regulation", b: "When a child is overwhelmed, the wall recedes and walks them through paced breathing, a feelings check-in, and a warm, non-shaming reset — at home, in the moment." },
              { icon: WavesIcon, t: "Patterns, in plain language", b: "Harbor gently learns each child's rhythms and surfaces when the hard moments tend to cluster — never labels, never diagnosis." },
              { icon: Sliders, t: "Meets each child where they are", b: "One wall, adaptive sensory intensity — gentle for a sensitive child, richer for one who wants big feedback." },
            ].map((r) => (
              <div key={r.t} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-seafog text-water ring-1 ring-harbor-100">
                  <r.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display text-base font-bold text-harbor">{r.t}</p>
                  <p className="text-sm leading-relaxed text-muted">{r.b}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-7 text-center font-display text-lg font-bold text-harbor">
            Trusted by families — and the people who care for them.
          </p>

          {/* Co-brand space (Brand §4.3): partner clinics can add their stamp here. */}
          <div className="mt-6 flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/qr-waitlist.svg" alt="Scan to refer a family to Harbor" width={72} height={72} className="shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-muted">To refer a family, scan or point them to</p>
              <p className="font-display text-base font-extrabold text-harbor">{SITE}</p>
            </div>
            <div className="h-12 w-px bg-harbor-100" />
            <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-xl border border-dashed border-harbor-100 text-center text-xs text-muted">
              Your practice&apos;s stamp
            </div>
          </div>

          <div className="mt-auto pt-6"><Foot /></div>
        </Sheet>
      </div>
    </div>
  );
}
