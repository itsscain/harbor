"use client";

import { Plus, ShieldAlert, Sparkles, Gift, MonitorSmartphone } from "lucide-react";
import { startGrounding, adjustGrounding, updateGrounding, endGrounding } from "@/app/app/(parent)/hub-actions";
import { Card, Field, Input, Switch, Badge } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmSubmit } from "@/components/ui/ConfirmSubmit";
import { cn } from "@/lib/cn";

type G = {
  id: string;
  reason: string | null;
  note: string | null;
  started_on: string;
  ends_on: string;
  pause_rewards: boolean;
  pause_screen_time: boolean;
  status: string;
};

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function diffDays(a: string, b: string) {
  return Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86_400_000);
}
function pretty(s: string) {
  return new Date(`${s}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function GroundingCard({ childId, childName, grounding }: { childId: string; childName: string; grounding: G | null }) {
  if (grounding) return <Active childId={childId} childName={childName} g={grounding} />;
  return <Start childId={childId} childName={childName} />;
}

function Active({ childId, childName, g }: { childId: string; childName: string; g: G }) {
  const today = localToday();
  const total = Math.max(1, diffDays(g.started_on, g.ends_on) + 1);
  const dayNum = Math.min(total, Math.max(1, diffDays(g.started_on, today) + 1));
  const daysLeft = Math.max(0, diffDays(today, g.ends_on) + 1);
  const pct = Math.round((Math.min(dayNum, total) / total) * 100);

  return (
    <Card className="border-amber-300/70 bg-amber-50/40">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-amber-700">
          <ShieldAlert className="h-5 w-5" />
          <h2 className="text-title">{childName} is on a reset</h2>
        </div>
        <Badge tone="amber">Day {dayNum} of {total}</Badge>
      </div>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-amber-200/70">
        <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-sm text-muted">
        {daysLeft <= 1 ? "Last day — wraps up today." : `${daysLeft} days left · ends ${pretty(g.ends_on)}`}
        {g.reason ? ` · ${g.reason}` : ""}
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        {g.pause_rewards && <Badge tone="gray"><Gift className="mr-1 h-3 w-3" />Store paused</Badge>}
        {g.pause_screen_time && <Badge tone="gray"><MonitorSmartphone className="mr-1 h-3 w-3" />Screen time paused</Badge>}
      </div>

      {/* Day-by-day controls */}
      <div className="mt-4 flex flex-wrap gap-2">
        <form action={adjustGrounding.bind(null, g.id, childId, -1)}>
          <button className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-button transition hover:bg-emerald-700 active:scale-[0.98]">
            <Sparkles className="h-4 w-4" /> Earn a day back
          </button>
        </form>
        <form action={adjustGrounding.bind(null, g.id, childId, 1)}>
          <button className="inline-flex items-center gap-1.5 rounded-xl border border-harbor-100 px-3.5 py-2.5 text-sm font-semibold text-harbor transition hover:bg-harbor-50 active:scale-[0.98]">
            <Plus className="h-4 w-4" /> Add a day
          </button>
        </form>
        <form action={endGrounding.bind(null, g.id, childId)}>
          <ConfirmSubmit title="End the reset now?" confirmLabel="End now" message={`${childName}'s reset will end and the wall goes back to normal.`}>
            End now
          </ConfirmSubmit>
        </form>
      </div>

      {/* Edit the plan + what's paused */}
      <form action={updateGrounding.bind(null, g.id, childId)} className="mt-4 space-y-3 border-t border-amber-200/60 pt-4">
        <Field label="The plan to get through it" hint="Shows on the wall so they know exactly what to do.">
          <Input name="note" defaultValue={g.note ?? ""} placeholder="Finish every routine and a kind day — then we're done." />
        </Field>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-harbor-100 px-3.5 py-3">
            <Switch name="pause_rewards" label="Pause the reward store" defaultChecked={g.pause_rewards} />
          </div>
          <div className="rounded-xl border border-harbor-100 px-3.5 py-3">
            <Switch name="pause_screen_time" label="Pause screen-time rewards" defaultChecked={g.pause_screen_time} />
          </div>
        </div>
        <SubmitButton size="sm" variant="secondary">Save the plan</SubmitButton>
      </form>
    </Card>
  );
}

function Start({ childId, childName }: { childId: string; childName: string }) {
  return (
    <Card>
      <div className="flex items-center gap-2 text-harbor">
        <ShieldAlert className="h-5 w-5 text-amber-600" />
        <h2 className="text-title">Start a reset (grounding)</h2>
      </div>
      <p className="mt-1 text-sm text-muted">
        Give {childName} a clear, calm path through it — a countdown on the wall, what&apos;s paused, and a plan to finish.
      </p>
      <form action={startGrounding.bind(null, childId)} className="mt-4 space-y-3">
        <input type="hidden" name="started_on" value={localToday()} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="How many days?">
            <Input name="days" type="number" min={1} max={60} defaultValue={3} />
          </Field>
          <Field label="Reason (optional)" hint="Kept short; shown gently.">
            <Input name="reason" placeholder="Hitting · skipped chores…" />
          </Field>
        </div>
        <Field label="The plan to get through it">
          <Input name="note" placeholder="Finish every routine and a kind day — then we're done." />
        </Field>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-harbor-100 px-3.5 py-3">
            <Switch name="pause_rewards" label="Pause the reward store" defaultChecked />
          </div>
          <div className="rounded-xl border border-harbor-100 px-3.5 py-3">
            <Switch name="pause_screen_time" label="Pause screen-time rewards" />
          </div>
        </div>
        <SubmitButton variant="secondary" className={cn("border-amber-300 text-amber-800")} confirmSaved={false}>
          Start the reset
        </SubmitButton>
      </form>
    </Card>
  );
}
