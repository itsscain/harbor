"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Sheet, SheetActions } from "@/components/ui/Sheet";
import { ActionForm, FormError } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmSubmit } from "@/components/ui/ConfirmSubmit";
import { ChipGroup, MiniAvatar } from "@/components/ui/Chips";
import { EmojiPicker } from "@/components/ui/EmojiPicker";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { Toggle } from "@/components/ui/Toggle";
import { Button, Field, Input } from "@/components/ui/primitives";
import { useQuickAction } from "@/components/ui/useQuickAction";
import { ChildPhotoField } from "@/components/app/ChildPhotoField";
import { updateKidProfile, setKidSettings, hideKid, restoreKid } from "@/app/app/(parent)/children/kid-actions";
import { deleteChildPermanently } from "@/app/app/(parent)/actions";
import type { KidBasics } from "@/lib/kid";

const fmtBirthday = (b: string) => new Date(`${b}T12:00:00Z`).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

export function KidProfileCard({ kid }: { kid: KidBasics }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-center gap-4">
        <MiniAvatar kid={kid} size={56} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold text-fg">{kid.name}</p>
          <p className="text-sm text-fg-muted">{kid.birthday ? `Birthday ${fmtBirthday(kid.birthday)}` : "No birthday added"}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          <Pencil className="h-4 w-4" /> Edit
        </Button>
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title={`Edit ${kid.name}`}>
        <div className="mb-5 border-b border-line pb-5">
          <ChildPhotoField childId={kid.id} name={kid.name} photoUrl={kid.photo_url} color={kid.color ?? "#18606f"} />
        </div>
        <ActionForm action={updateKidProfile.bind(null, kid.id)} className="space-y-5">
          <div className="flex items-end gap-3">
            <EmojiPicker name="avatar" defaultValue={kid.avatar ?? "🙂"} label="Face" />
            <Field label="Name" htmlFor="kp-name" className="flex-1">
              <Input id="kp-name" name="name" required maxLength={40} defaultValue={kid.name} />
            </Field>
          </div>
          <Field label="Birthday" htmlFor="kp-bday" hint="Shows a birthday countdown on the wall.">
            <Input id="kp-bday" name="birthday" type="date" defaultValue={kid.birthday ?? ""} />
          </Field>
          <Field label="Their color" hint="So they can spot their stuff on the wall.">
            <ColorPicker name="color" defaultValue={kid.color} />
          </Field>
          <FormError />
          <SheetActions>
            <SubmitButton size="lg" className="w-full sm:w-auto" confirmSaved={false}>
              Save
            </SubmitButton>
          </SheetActions>
        </ActionForm>
      </Sheet>
    </section>
  );
}

type Sensory = "calm" | "standard" | "vivid";

/** How the wall feels for this kid — every change saves on its own. */
export function KidWallFeel({ kidId, kidName, settings }: { kidId: string; kidName: string; settings: Record<string, unknown> }) {
  const { run } = useQuickAction();
  const [sensory, setSensory] = useState<Sensory>(
    settings.sensory === "calm" || settings.sensory === "vivid" ? (settings.sensory as Sensory) : "standard",
  );
  const [readAloud, setReadAloud] = useState(settings.readAloud !== false);
  const [sound, setSound] = useState(settings.sound !== false);
  const [reducedMotion, setReducedMotion] = useState(settings.reducedMotion === true);
  const [bedtime, setBedtime] = useState(typeof settings.bedtime === "string" ? settings.bedtime : "");

  const save = (patch: Parameters<typeof setKidSettings>[1]) => run(() => setKidSettings(kidId, patch), { success: "Saved" });

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-title text-fg">On the wall</h2>
      <p className="mt-0.5 text-sm text-fg-muted">How {kidName}&apos;s screen looks, sounds and moves. Changes save right away.</p>

      <div className="mt-4">
        <p className="mb-2 text-sm font-semibold text-fg">Feel</p>
        <ChipGroup
          ariaLabel="Feel"
          value={sensory}
          onChange={(v) => {
            const next = (v[0] ?? "standard") as Sensory;
            if (next === sensory) return;
            setSensory(next);
            save({ sensory: next });
          }}
          options={[
            { value: "calm", label: "Gentle", emoji: "🌙" },
            { value: "standard", label: "Normal", emoji: "🙂" },
            { value: "vivid", label: "Big & bright", emoji: "🎉" },
          ]}
        />
      </div>

      <div className="mt-4 divide-y divide-line rounded-xl border border-line px-3.5">
        <Toggle
          checked={readAloud}
          onChange={(v) => {
            setReadAloud(v);
            save({ readAloud: v });
          }}
          label="Read steps aloud"
          hint="Says each step when it's tapped"
          className="py-2"
        />
        <Toggle
          checked={sound}
          onChange={(v) => {
            setSound(v);
            save({ sound: v });
          }}
          label="Happy sounds"
          hint="A chime when something's done"
          className="py-2"
        />
        <Toggle
          checked={reducedMotion}
          onChange={(v) => {
            setReducedMotion(v);
            save({ reducedMotion: v });
          }}
          label="Less motion"
          hint="Calmer, minimal animation"
          className="py-2"
        />
      </div>

      <div className="mt-4 flex items-end gap-2">
        <Field label="Bedtime" htmlFor="kw-bed" hint="Shows a countdown to bed on the wall." className="flex-1">
          <Input
            id="kw-bed"
            type="time"
            value={bedtime}
            onChange={(e) => {
              const v = e.target.value;
              setBedtime(v);
              if (/^\d{2}:\d{2}$/.test(v)) save({ bedtime: v });
            }}
          />
        </Field>
        {bedtime && (
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => {
              setBedtime("");
              save({ bedtime: null });
            }}
          >
            Clear
          </Button>
        )}
      </div>
    </section>
  );
}

export function KidDangerZone({ kidId, kidName }: { kidId: string; kidName: string }) {
  const router = useRouter();
  const { run, pending } = useQuickAction();
  return (
    <section className="rounded-2xl border border-error/30 bg-surface p-5">
      <h2 className="text-title text-fg">Remove {kidName}</h2>
      <div className="mt-3 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 flex-1 text-sm text-fg-muted">
            <span className="block font-semibold text-fg">Hide</span>
            Takes {kidName} off the wall and the app. Everything is kept, and you can undo it.
          </p>
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() =>
              run(() => hideKid(kidId), {
                undo: () => restoreKid(kidId),
                onDone: () => router.replace("/app/children"),
              })
            }
          >
            Hide
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="min-w-0 flex-1 text-sm text-fg-muted">
            <span className="block font-semibold text-fg">Delete forever</span>
            Erases {kidName} and all their routines, stars and history. This can’t be undone.
          </p>
          <ActionForm action={deleteChildPermanently.bind(null, kidId)} success={false}>
            <ConfirmSubmit
              title={`Delete ${kidName} forever?`}
              confirmLabel="Delete forever"
              message={`This permanently erases ${kidName} and all their routines, rewards, stars and history from Harbor. It can't be undone.`}
            >
              Delete
            </ConfirmSubmit>
          </ActionForm>
        </div>
      </div>
    </section>
  );
}
