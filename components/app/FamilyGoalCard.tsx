import { Card, Field, Input, Switch } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { setFamilyGoal } from "@/app/app/(parent)/hub-actions";

type Goal = { label?: string; emoji?: string; target?: number; reward?: string | null; active?: boolean };

/** Family Goal (§9.2.9) — a shared, cooperative reward the whole family's stars
 *  fill together. Shows as a filling bar on the wall's Home screen. */
export function FamilyGoalCard({ goal }: { goal: Goal | null }) {
  return (
    <Card>
      <h2 className="text-title text-harbor">Family goal</h2>
      <p className="mt-1 text-sm text-muted">
        A shared reward the whole family&apos;s stars fill together — cooperative, not a competition.
        It shows as a filling bar on the wall&apos;s home screen.
      </p>
      <form action={setFamilyGoal} className="mt-3 space-y-3">
        <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto]">
          <Field label="Emoji">
            <Input name="emoji" defaultValue={goal?.emoji ?? "🍕"} className="w-20 text-center text-xl" />
          </Field>
          <Field label="Goal">
            <Input name="label" defaultValue={goal?.label ?? ""} placeholder="Family movie night" />
          </Field>
          <Field label="Stars needed">
            <Input name="target" type="number" min={1} max={100000} defaultValue={goal?.target ?? 100} className="w-28" />
          </Field>
        </div>
        <Field label="Reward (optional)" hint="What the family earns together.">
          <Input name="reward" defaultValue={goal?.reward ?? ""} placeholder="Pizza & a movie" />
        </Field>
        <div className="rounded-xl border border-harbor-100 px-3.5 py-3">
          <Switch name="active" label="Show on the wall" hint="Turn the goal on for the family." defaultChecked={goal?.active ?? false} />
        </div>
        <SubmitButton variant="secondary">Save family goal</SubmitButton>
      </form>
    </Card>
  );
}
