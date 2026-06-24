"use client";

import { useEffect, useState } from "react";
import { Heart, Sparkles } from "lucide-react";
import { startCorner, endCorner, generateCornerReport } from "@/app/app/(parent)/hub-actions";
import { Card, Field, Input } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmSubmit } from "@/components/ui/ConfirmSubmit";

type Plan = { steps?: string[]; reminder?: string; encouragement?: string };
export type CornerRow = {
  id: string;
  reason: string | null;
  feeling: string | null;
  duration_minutes: number;
  started_at: string;
  status: string;
  plan: Plan | null;
  report: string | null;
};

function prettyDateTime(s: string) {
  return new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function CornerCard({
  childId,
  childName,
  active,
  recent,
}: {
  childId: string;
  childName: string;
  active: CornerRow | null;
  recent: CornerRow[];
}) {
  const past = recent.filter((r) => r.id !== active?.id);
  return (
    <Card className="border-violet-200 bg-violet-50/30">
      <div className="flex items-center gap-2 text-harbor">
        <Heart className="h-5 w-5 text-violet-500" />
        <h2 className="text-title">Anchor</h2>
      </div>
      <p className="mt-1 text-sm text-muted">
        A short, supportive reset — not a punishment. Harbor shows a calm timer and gentle steps on the
        wall, talks {childName} through it, and helps you reflect afterward.
      </p>

      {active ? (
        <ActiveCorner childId={childId} childName={childName} c={active} />
      ) : (
        <StartCorner childId={childId} childName={childName} />
      )}

      {past.length > 0 && <RecentCorners childId={childId} recent={past} />}
    </Card>
  );
}

function StartCorner({ childId, childName }: { childId: string; childName: string }) {
  return (
    <form action={startCorner.bind(null, childId)} className="mt-4 space-y-3">
      <Field label="What happened? (the reason)" hint="Kept private — helps Harbor coach gently and spot patterns over time.">
        <Input name="reason" placeholder="Hit his brother · wouldn't stop yelling…" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="How are they feeling? (optional)">
          <Input name="feeling" placeholder="Angry · frustrated · overwhelmed" />
        </Field>
        <Field label="Minutes" hint="Leave blank to set it by age (about 1 per year).">
          <Input name="minutes" type="number" min={1} max={30} placeholder="auto" />
        </Field>
      </div>
      <SubmitButton variant="secondary" className="border-violet-300 text-violet-800" confirmSaved={false}>
        <Heart className="h-4 w-4" /> Start an Anchor for {childName}
      </SubmitButton>
    </form>
  );
}

function ActiveCorner({ childId, childName, c }: { childId: string; childName: string; c: CornerRow }) {
  const startMs = new Date(c.started_at).getTime();
  const totalMs = c.duration_minutes * 60_000;
  // Init to start time so SSR and first client render agree (no hydration mismatch),
  // then tick to real time on mount.
  const [now, setNow] = useState(() => startMs);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const msLeft = Math.max(0, startMs + totalMs - now);
  const done = msLeft <= 0;
  const mm = Math.floor(msLeft / 60_000);
  const ss = Math.floor((msLeft % 60_000) / 1000);
  const pct = Math.min(100, Math.max(0, Math.round((1 - msLeft / totalMs) * 100)));

  return (
    <div className="mt-4 rounded-xl border border-violet-200 bg-white/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-700">
          {childName} is in Anchor
        </span>
        <span className="font-display text-2xl font-bold tabular-nums text-violet-700">
          {done ? "Time's up 💚" : `${mm}:${String(ss).padStart(2, "0")}`}
        </span>
      </div>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-violet-100">
        <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      {c.reason && <p className="mt-2 text-sm text-muted">About: {c.reason}</p>}

      {c.plan && (
        <div className="mt-3 space-y-2 text-sm">
          {(c.plan.steps ?? []).length > 0 && (
            <ul className="space-y-1">
              {(c.plan.steps ?? []).map((s, i) => (
                <li key={i} className="flex gap-2 text-ink">
                  <span className="text-violet-400">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          )}
          {c.plan.reminder && <p className="rounded-lg bg-violet-50 p-2 text-violet-800">💡 {c.plan.reminder}</p>}
          {c.plan.encouragement && <p className="italic text-muted">{c.plan.encouragement}</p>}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <form action={endCorner.bind(null, c.id, childId)}>
          <ConfirmSubmit
            title="End the Anchor?"
            confirmLabel="End now"
            message="The timer ends and the wall goes back to normal."
          >
            End corner
          </ConfirmSubmit>
        </form>
      </div>

      <div className="mt-3">
        <ReportButton id={c.id} childId={childId} existing={c.report} />
      </div>
    </div>
  );
}

function ReportButton({ id, childId, existing }: { id: string; childId: string; existing: string | null }) {
  const [text, setText] = useState<string | null>(existing);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function gen() {
    setLoading(true);
    setErr(null);
    const res = await generateCornerReport(id, childId);
    setLoading(false);
    if (res.ok) setText(res.text ?? "");
    else setErr(res.error ?? "Couldn't generate that reflection.");
  }

  return (
    <div>
      <button
        type="button"
        onClick={gen}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-xl border border-violet-300 px-3.5 py-2 text-sm font-semibold text-violet-800 transition hover:bg-violet-50 disabled:opacity-60"
      >
        <Sparkles className="h-4 w-4" /> {loading ? "Reflecting…" : text ? "Refresh reflection" : "AI reflection for you"}
      </button>
      {err && <p className="mt-1 text-sm text-red-600">{err}</p>}
      {text && (
        <p className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-sm text-ink ring-1 ring-violet-100">
          {text}
        </p>
      )}
    </div>
  );
}

function RecentCorners({ childId, recent }: { childId: string; recent: CornerRow[] }) {
  return (
    <div className="mt-5 border-t border-violet-200/60 pt-4">
      <h3 className="text-sm font-semibold text-harbor">Recent Anchors</h3>
      <div className="mt-2 space-y-2">
        {recent.map((c) => (
          <details key={c.id} className="rounded-xl border border-harbor-100 p-3">
            <summary className="cursor-pointer list-none text-sm">
              <span className="font-medium text-ink">{prettyDateTime(c.started_at)}</span>
              <span className="text-muted">
                {" · "}
                {c.duration_minutes} min{c.reason ? ` · ${c.reason}` : ""}
              </span>
            </summary>
            <div className="mt-2">
              <ReportButton id={c.id} childId={childId} existing={c.report} />
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
