"use client";

import { useOptimistic, useState } from "react";
import { ChevronRight, Plus, Sparkles } from "lucide-react";
import { Sheet, SheetActions, useSheetClose } from "@/components/ui/Sheet";
import { ActionForm, FormError } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ChipGroup, ChildChips, type ChipChild } from "@/components/ui/Chips";
import { EmojiPicker } from "@/components/ui/EmojiPicker";
import { Stepper } from "@/components/ui/Stepper";
import { Toggle } from "@/components/ui/Toggle";
import { Button, Field, Input } from "@/components/ui/primitives";
import { useQuickAction } from "@/components/ui/useQuickAction";
import { Disclosure } from "@/components/app/Disclosure";
import { saveReward, deleteRewardSoft, restoreReward, addStarterRewards, saveFamilyGoal } from "@/app/app/(parent)/store/store-actions";
import { cn } from "@/lib/cn";

export type Reward = { id: string; label: string; emoji: string | null; cost: number; kind: string; childId: string | null; enabled: boolean };
export type FamilyGoal = { label: string; emoji: string | null; target: number; reward: string | null; active: boolean } | null;

const KIND_LABEL: Record<string, string> = { reward: "Reward", screen_time: "Screen time", allowance: "Allowance", goal: "Saving up" };

export function RewardsView({ rewards, kids, goal, familyStars }: { rewards: Reward[]; kids: ChipChild[]; goal: FamilyGoal; familyStars: number }) {
  const { run, pending } = useQuickAction();
  const [editing, setEditing] = useState<Reward | "new" | null>(null);
  const [goalOpen, setGoalOpen] = useState(false);
  const [gone, hide] = useOptimistic<string[], string>([], (cur, id) => [...cur, id]);
  const shown = rewards.filter((r) => !gone.includes(r.id));
  const nameOf = (id: string | null) => (id ? (kids.find((k) => k.id === id)?.name ?? "One kid") : "All kids");
  const pct = goal ? Math.min(100, Math.round((familyStars / Math.max(1, goal.target)) * 100)) : 0;

  return (
    <>
      <section className="mb-7">
        <h2 className="mb-2 text-title text-fg">Family goal</h2>
        <button type="button" onClick={() => setGoalOpen(true)} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 text-left transition hover:bg-surface-2">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-2xl" aria-hidden>
            {goal?.emoji ?? "🎉"}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate font-semibold text-fg">{goal?.label ?? "Set a goal everyone works toward"}</span>
              {goal && !goal.active && <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-fg-muted">Off</span>}
            </span>
            {goal ? (
              <span className="mt-1.5 flex items-center gap-2 text-sm text-fg-muted">
                <span className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-2">
                  <span className="block h-full rounded-full bg-beacon" style={{ width: `${pct}%` }} />
                </span>
                {familyStars} of {goal.target} ★
              </span>
            ) : (
              <span className="block text-sm text-fg-muted">Everyone&apos;s stars fill it together</span>
            )}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" />
        </button>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-title text-fg">Rewards</h2>
          <Button size="sm" variant="secondary" onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        {shown.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line-strong p-6 text-center">
            <p className="text-3xl" aria-hidden>
              🎁
            </p>
            <p className="mt-1 font-semibold text-fg">Nothing to spend stars on yet</p>
            <p className="mx-auto mt-0.5 max-w-sm text-sm text-fg-muted">Add something they&apos;ll really want — or start with a few favorites.</p>
            <Button className="mt-4" disabled={pending} onClick={() => run(() => addStarterRewards())}>
              <Sparkles className="h-4 w-4" /> Add 5 favorites
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {shown.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => setEditing(r)} className={cn("flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-2", !r.enabled && "opacity-60")}>
                  <span className="text-2xl leading-none" aria-hidden>
                    {r.emoji ?? "🎁"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-semibold text-fg">{r.label}</span>
                      {!r.enabled && <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-fg-muted">Off</span>}
                    </span>
                    <span className="block truncate text-sm text-fg-muted">
                      {nameOf(r.childId)}
                      {r.kind !== "reward" && ` · ${KIND_LABEL[r.kind] ?? r.kind}`}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-bold text-beacon">★ {r.cost}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Add a reward" : "Edit reward"}>
        {editing && <RewardForm key={editing === "new" ? "new" : editing.id} reward={editing === "new" ? null : editing} kids={kids} onDelete={hide} />}
      </Sheet>
      <Sheet open={goalOpen} onClose={() => setGoalOpen(false)} title="Family goal" description="A shared reward — everyone's stars fill it together, on the wall's home screen.">
        <GoalForm goal={goal} />
      </Sheet>
    </>
  );
}

function RewardForm({ reward, kids, onDelete }: { reward: Reward | null; kids: ChipChild[]; onDelete: (id: string) => void }) {
  const close = useSheetClose();
  const { run, pending } = useQuickAction();
  const [enabled, setEnabled] = useState(reward?.enabled ?? true);
  const [kind, setKind] = useState(reward?.kind ?? "reward");
  return (
    <ActionForm action={saveReward.bind(null, reward?.id ?? null)} className="space-y-5">
      <div className="flex items-end gap-3">
        <EmojiPicker name="emoji" defaultValue={reward?.emoji ?? "🎁"} label="Picture" />
        <Field label="Reward" htmlFor="rw-label" className="flex-1">
          <Input id="rw-label" name="label" required maxLength={60} defaultValue={reward?.label ?? ""} placeholder="Ice cream trip" data-autofocus />
        </Field>
      </div>
      <Field label={kind === "goal" ? "Stars to save up" : "Costs"}>
        <Stepper name="cost_points" defaultValue={reward?.cost ?? 20} max={10000} presets={[10, 20, 50, 100]} suffix="★" label="Stars" />
      </Field>
      {kids.length > 0 && (
        <Field label="For">
          <ChildChips name="child_id" kids={kids} everyone everyoneLabel="All kids" defaultValue={reward?.childId ?? ""} />
        </Field>
      )}
      <div className="rounded-xl border border-line">
        <Disclosure summary={<span className="text-[15px] font-semibold text-fg">More options</span>} bodyClassName="space-y-4 px-4 pb-4">
          <Field label="Type" hint={kind === "goal" ? "A big thing they save toward — it fills up as they earn, instead of being bought." : undefined}>
            <ChipGroup
              name="kind"
              value={kind}
              onChange={(v) => v[0] && setKind(v[0])}
              options={[
                { value: "reward", label: "Reward", emoji: "🎁" },
                { value: "screen_time", label: "Screen time", emoji: "📺" },
                { value: "allowance", label: "Allowance", emoji: "💵" },
                { value: "goal", label: "Saving up", emoji: "🏆" },
              ]}
            />
          </Field>
          {reward && <Toggle checked={enabled} onChange={setEnabled} name="enabled" label="Show in the store" hint={enabled ? "Kids can see it" : "Hidden for now"} />}
        </Disclosure>
      </div>
      <FormError />
      <SheetActions className={reward ? "sm:justify-between" : undefined}>
        {reward && (
          <Button
            type="button"
            variant="ghost"
            className="text-error"
            disabled={pending}
            onClick={() => run(() => deleteRewardSoft(reward.id), { optimistic: () => onDelete(reward.id), undo: () => restoreReward(reward.id), onDone: () => close?.() })}
          >
            Remove
          </Button>
        )}
        <SubmitButton size="lg" className={reward ? undefined : "w-full sm:w-auto"} confirmSaved={false}>
          {reward ? "Save" : "Add reward"}
        </SubmitButton>
      </SheetActions>
    </ActionForm>
  );
}

function GoalForm({ goal }: { goal: FamilyGoal }) {
  const [active, setActive] = useState(goal?.active ?? true);
  return (
    <ActionForm action={saveFamilyGoal} className="space-y-5">
      <div className="flex items-end gap-3">
        <EmojiPicker name="emoji" defaultValue={goal?.emoji ?? "🍕"} label="Picture" />
        <Field label="Goal" htmlFor="fg-label" className="flex-1">
          <Input id="fg-label" name="label" required maxLength={60} defaultValue={goal?.label ?? ""} placeholder="Family movie night" data-autofocus />
        </Field>
      </div>
      <Field label="Stars needed">
        <Stepper name="target" defaultValue={goal?.target ?? 100} min={1} max={100000} presets={[50, 100, 200, 500]} suffix="★" label="Stars" />
      </Field>
      <Field label="What you'll do together (optional)" htmlFor="fg-reward">
        <Input id="fg-reward" name="reward" maxLength={80} defaultValue={goal?.reward ?? ""} placeholder="Pizza and a movie" />
      </Field>
      <div className="rounded-xl border border-line px-3.5">
        <Toggle checked={active} onChange={setActive} name="active" label="Show on the wall" hint={active ? "Everyone can watch it fill" : "Saved, but hidden for now"} />
      </div>
      <FormError />
      <SheetActions>
        <SubmitButton size="lg" className="w-full sm:w-auto" confirmSaved={false}>
          Save
        </SubmitButton>
      </SheetActions>
    </ActionForm>
  );
}
