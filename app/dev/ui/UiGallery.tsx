"use client";

import { useState } from "react";
import { Plus, Star } from "lucide-react";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { ActionForm, FormError } from "@/components/ui/ActionForm";
import { Sheet, SheetActions } from "@/components/ui/Sheet";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ChipGroup, ChildChips } from "@/components/ui/Chips";
import { Stepper } from "@/components/ui/Stepper";
import { DayPicker } from "@/components/ui/DayPicker";
import { TimeList } from "@/components/ui/TimeList";
import { EmojiPicker } from "@/components/ui/EmojiPicker";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { Button, Card, Field, Input } from "@/components/ui/primitives";

const KIDS = [
  { id: "k1", name: "Leo", avatar: "🦊", color: "#36C6D6" },
  { id: "k2", name: "Mia", avatar: "🐬", color: "#F472A8" },
  { id: "k3", name: "Sam", avatar: "🐸", color: "#5FCB8E" },
];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function fakeSave(): Promise<{ ok: true }> {
  await wait(700);
  return { ok: true };
}
async function fakeFail(): Promise<{ ok: false; error: string }> {
  await wait(700);
  return { ok: false, error: "Pick at least one child for this chore." };
}

export function UiGallery() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  return (
    <div data-theme={theme} data-app-theme-root className="min-h-dvh bg-bg text-fg">
      <ToastProvider>
        <main className="mx-auto max-w-lg space-y-6 p-4 pb-40">
          <div className="flex items-center justify-between">
            <h1 className="text-display text-fg">Toolkit</h1>
            <Button variant="secondary" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? "Light" : "Dark"} theme
            </Button>
          </div>
          <ToastDemo />
          <SheetDemo />
          <Card className="space-y-5">
            <Field label="Chips">
              <ChipGroup
                name="kind"
                defaultValue="checklist"
                options={[
                  { value: "checklist", label: "Checklist", emoji: "✅" },
                  { value: "first_then", label: "First → Then", emoji: "🔁" },
                ]}
              />
            </Field>
            <Field label="Medicine times">
              <TimeList name="times" defaultValue={["08:00"]} />
            </Field>
            <Field label="Color">
              <ColorPicker name="color" defaultValue="#F472A8" />
            </Field>
            <Field label="Buttons">
              <div className="flex flex-wrap gap-2">
                <Button size="sm">Small</Button>
                <Button>Medium</Button>
                <Button size="lg">Large</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="danger">Danger</Button>
              </div>
            </Field>
          </Card>
        </main>
      </ToastProvider>
    </div>
  );
}

function ToastDemo() {
  const toast = useToast();
  return (
    <Card className="flex flex-wrap gap-2">
      <Button size="sm" onClick={() => toast.success("+5 stars for Leo")}>Success toast</Button>
      <Button size="sm" variant="secondary" onClick={() => toast.success("Chore removed", { action: { label: "Undo", onClick: () => toast.info("Restored") } })}>
        With Undo
      </Button>
      <Button size="sm" variant="danger" onClick={() => toast.error("That didn't save. Check your connection and try again.")}>Error toast</Button>
    </Card>
  );
}

function SheetDemo() {
  const [open, setOpen] = useState<null | "ok" | "fail">(null);
  return (
    <Card className="flex flex-wrap gap-2">
      <Button onClick={() => setOpen("ok")}>
        <Plus className="h-4 w-4" /> Add a chore
      </Button>
      <Button variant="secondary" onClick={() => setOpen("fail")}>
        Add (fails)
      </Button>
      <Sheet open={open !== null} onClose={() => setOpen(null)} title="Add a chore" description="It shows on the wall right away.">
        <ActionForm action={open === "fail" ? fakeFail : fakeSave} success="Chore added" className="space-y-5">
          <div className="flex items-end gap-3">
            <EmojiPicker name="emoji" defaultValue="🧹" />
            <Field label="Chore" htmlFor="chore-title" className="flex-1">
              <Input id="chore-title" name="title" required placeholder="Feed the dog" />
            </Field>
          </div>
          <Field label="Who does it?">
            <ChildChips name="child_ids" kids={KIDS} multiple defaultValue={["k1"]} />
          </Field>
          <Field label="Stars">
            <Stepper name="points" defaultValue={5} max={50} presets={[1, 3, 5, 10]} suffix="★" label="Stars" />
          </Field>
          <Field label="Days">
            <DayPicker name="days" />
          </Field>
          <FormError />
          <SheetActions>
            <SubmitButton size="lg" className="w-full sm:w-auto">
              <Star className="h-4 w-4" /> Add chore
            </SubmitButton>
          </SheetActions>
        </ActionForm>
      </Sheet>
    </Card>
  );
}
