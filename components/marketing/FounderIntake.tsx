"use client";

import { useActionState, useMemo, useState } from "react";
import { CheckCircle2, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { reserveFounderSpot, type FounderReserveState, type PublicBuild } from "@/lib/actions/founder";
import { lanternQuote, LANTERN_DISCOUNT } from "@/lib/founder-pricing";
import { Field, Input, Select, Textarea, Button } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";

const STEPS = ["You", "Your kids", "Your Harbor", "Your wall", "Last bit"];
const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;

export function FounderIntake({ builds, lanternBase, utm }: { builds: PublicBuild[]; lanternBase?: number; utm?: string }) {
  const [state, action] = useActionState<FounderReserveState, FormData>(reserveFounderSpot, {});
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [kids, setKids] = useState(1);
  const [buildId, setBuildId] = useState(() => builds.find((b) => b.is_default)?.id ?? builds[0]?.id ?? "");
  const [err, setErr] = useState<string | null>(null);

  const build = useMemo(() => builds.find((b) => b.id === buildId) ?? builds[0], [builds, buildId]);
  const lq = useMemo(() => lanternQuote(kids, lanternBase), [kids, lanternBase]);
  const hubPrice = build ? Number(build.founder_price) : 0;
  const total = hubPrice + lq.total;

  if (state.success) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center shadow-card sm:p-10">
        <CheckCircle2 className="mx-auto h-14 w-14 text-water" />
        {state.waitlisted ? (
          <>
            <h3 className="mt-4 font-display text-2xl font-bold text-harbor">You&apos;re on the waitlist 💙</h3>
            <p className="mx-auto mt-2 max-w-md text-muted">
              The founding spots are full right now — but we saved your place in line. We&apos;ll reach out the
              moment one opens or the next batch begins. Thank you for wanting Harbor for your family.
            </p>
          </>
        ) : (
          <>
            <h3 className="mt-4 font-display text-2xl font-bold text-harbor">Your founder spot is reserved 🎉</h3>
            {state.founderNumber ? (
              <p className="mt-1 font-semibold text-water">Founding Family #{state.founderNumber}</p>
            ) : null}
            <p className="mx-auto mt-3 max-w-md text-muted">
              Here&apos;s what happens next: we&apos;ll review your info, reach out to schedule your white-glove
              install, and send your invoice — <b>no payment needed yet</b>. Welcome to the founding families.
            </p>
          </>
        )}
      </div>
    );
  }

  const last = step === STEPS.length - 1;
  function next() {
    if (step === 0 && (!name.trim() || !/.+@.+\..+/.test(email))) {
      setErr("Please add your name and a valid email.");
      return;
    }
    setErr(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  return (
    <form action={action} className="rounded-3xl bg-white p-6 shadow-card sm:p-8">
      {/* progress */}
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1">
            <div className={"h-1.5 rounded-full transition-colors " + (i <= step ? "bg-beacon" : "bg-harbor-100")} />
          </div>
        ))}
      </div>
      <p className="mb-4 text-eyebrow text-water">
        Step {step + 1} of {STEPS.length} · {STEPS[step]}
      </p>

      {/* Step 1 — You */}
      <div className={step === 0 ? "space-y-3" : "hidden"}>
        <Field label="Your name">
          <Input name="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </Field>
        <Field label="Phone (optional)">
          <Input name="phone" type="tel" autoComplete="tel" />
        </Field>
      </div>

      {/* Step 2 — Your kids */}
      <div className={step === 1 ? "space-y-3" : "hidden"}>
        <Field label="How many kids?" hint="Each child gets a Harbor Lantern in their room — and the more kids, the bigger the per-child discount.">
          <Select name="kids_count" value={String(kids)} onChange={(e) => setKids(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
                {n === 6 ? "+" : ""} {n === 1 ? "child" : "children"}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Their ages (optional)">
          <Input name="kid_ages" placeholder="e.g. 4, 7, 9" />
        </Field>
        <Field label="Anything you'd like us to know? (optional)" hint="What they need, what's hard — only if you want to share.">
          <Textarea name="kid_notes" rows={2} />
        </Field>
      </div>

      {/* Step 3 — Your Harbor + live quote */}
      <div className={step === 2 ? "space-y-3" : "hidden"}>
        <Field label="Your central hub (the family wall)" hint="We'll help you choose if you're unsure.">
          <Select name="build_id" value={buildId} onChange={(e) => setBuildId(e.target.value)}>
            {builds.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.tablet_model}) — {usd(Number(b.founder_price))}
              </option>
            ))}
          </Select>
        </Field>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="wants_plus" className="h-4 w-4 rounded border-harbor-100" />
          I&apos;m interested in Harbor Plus (cloud sync) — optional, not billed now
        </label>
        {/* the live quote */}
        <div className="mt-2 rounded-2xl bg-harbor-50/60 p-4 text-sm">
          <div className="flex justify-between text-ink">
            <span>{build?.name ?? "Hub"} (founder price)</span>
            <span className="font-semibold tabular-nums">{usd(hubPrice)}</span>
          </div>
          {lq.prices.map((p, i) => (
            <div key={i} className="mt-1 flex justify-between text-muted">
              <span>
                Lantern {i + 1}{" "}
                {i > 0 ? <span className="text-water">· {Math.round(LANTERN_DISCOUNT[Math.min(i, LANTERN_DISCOUNT.length - 1)] * 100)}% off</span> : null}
              </span>
              <span className="tabular-nums">{usd(p)}</span>
            </div>
          ))}
          {lq.saved > 0 && (
            <p className="mt-2 text-water">You&apos;re saving {usd(lq.saved)} with {kids} Lanterns 🎉</p>
          )}
          <div className="mt-2 flex justify-between border-t border-harbor-100 pt-2 font-display text-base font-bold text-harbor">
            <span>Total (pay later)</span>
            <span className="tabular-nums">{usd(total)}</span>
          </div>
          <p className="mt-1 text-xs text-muted">+ install fee at scheduling. No payment now.</p>
        </div>
      </div>

      {/* Step 4 — Your wall */}
      <div className={step === 3 ? "space-y-3" : "hidden"}>
        <Field label="What's your wall?" hint="So we bring the right mounting hardware.">
          <Select name="wall_type" defaultValue="Not sure">
            {["Drywall", "Plaster", "Brick / Masonry", "Concrete", "Tile", "Wood / paneling", "Not sure"].map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </Select>
        </Field>
        <Field label="Mounting">
          <Select name="mounting" defaultValue="Yes — mount it on the wall">
            {["Yes — mount it on the wall", "I'd prefer a stand / tabletop", "Let's discuss at scheduling"].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </Select>
        </Field>
        <Field label="Where should the hub go?">
          <Select name="hub_room" defaultValue="Kitchen">
            {["Kitchen", "Living Room", "Family Room", "Dining Room", "Hallway", "Entryway", "Home Office", "Other"].map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="City"><Input name="city" autoComplete="address-level2" /></Field>
          <Field label="State"><Input name="state" autoComplete="address-level1" /></Field>
        </div>
        <Field label="Street address (optional)"><Input name="address" autoComplete="street-address" /></Field>
      </div>

      {/* Step 5 — Last bit */}
      <div className={step === 4 ? "space-y-3" : "hidden"}>
        <Field label="Rough timing for an install? (optional)">
          <Input name="timing" placeholder="e.g. next few weeks, weekends" />
        </Field>
        <Field label="How did you hear about Harbor? (optional)">
          <Input name="heard_from" />
        </Field>
        <Field label="Questions or anything else? (optional)">
          <Textarea name="notes" rows={2} />
        </Field>
        <p className="text-xs text-muted">
          Your family&apos;s info stays private — never sold, handled to our child-data standard. Reserving secures
          your spot; you&apos;re invoiced after we schedule your install.
        </p>
      </div>

      {/* honeypot (hidden from people) + campaign */}
      <input type="text" name="hp" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {utm ? <input type="hidden" name="utm" value={utm} /> : null}

      {(err || state.error) && (
        <p role="alert" className="mt-4 rounded-xl bg-error-soft px-3 py-2 text-sm text-error-ink">
          {err || state.error}
        </p>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        {step > 0 ? (
          <Button type="button" variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        ) : (
          <span />
        )}
        {last ? (
          <SubmitButton size="lg" variant="beacon" pendingText="Reserving…">
            <Sparkles className="h-5 w-5" /> Claim my founder spot
          </SubmitButton>
        ) : (
          <Button type="button" variant="beacon" size="lg" onClick={next}>
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </form>
  );
}
