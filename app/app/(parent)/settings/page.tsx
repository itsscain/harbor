import Link from "next/link";
import { KeyRound, Tablet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Badge, Input, Field, Button, Textarea, Switch } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { formatPairingCode } from "@/lib/pairing-format";
import { titleCase } from "@/lib/format";
import { updateHouseholdName, setParentPin, clearParentPin } from "../actions";
import { updateKioskSettings } from "../hub-actions";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const household = await getMyHousehold();
  if (!household) return <Card><p className="text-muted">No household yet.</p></Card>;

  const supabase = await createClient();
  const { data: pairings } = await supabase
    .from("device_pairings")
    .select("code, status, last_synced_at")
    .eq("household_id", household.id)
    .order("created_at");

  return (
    <>
      <PageHeader title="Settings" />

      <Card className="mb-4">
        <h2 className="text-title text-harbor">Household</h2>
        <form action={updateHouseholdName} className="mt-3 flex items-end gap-3">
          <Field label="Name" className="flex-1">
            <Input name="name" defaultValue={household.name} />
          </Field>
          <SubmitButton variant="secondary">Save</SubmitButton>
        </form>
      </Card>

      <Card className="mb-4">
        <h2 className="text-title text-harbor">Wall display</h2>
        <p className="text-sm text-muted">How the wall behaves when idle.</p>
        {(() => {
          const s = (household.settings ?? {}) as Record<string, unknown>;
          return (
            <form action={updateKioskSettings} className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Return to home after (seconds)">
                <Input name="idleSeconds" type="number" min={30} defaultValue={(s.idleSeconds as number) ?? 120} />
              </Field>
              <Field label="Home photo URL (optional)">
                <Input name="homePhotoUrl" type="url" defaultValue={(s.homePhotoUrl as string) ?? ""} placeholder="https://…" />
              </Field>
              <Field label="Weather location (city)" hint="Shows the local forecast on the wall.">
                <Input
                  name="weatherCity"
                  defaultValue={(s.weather as { label?: string } | undefined)?.label ?? ""}
                  placeholder="Austin, Texas"
                />
              </Field>
              <Field label="Quiet hours start" hint="Wall dims to a soft clock at night.">
                <Input name="quietStart" type="time" defaultValue={(s.quietStart as string) ?? ""} />
              </Field>
              <Field label="Quiet hours end">
                <Input name="quietEnd" type="time" defaultValue={(s.quietEnd as string) ?? ""} />
              </Field>
              <Field label="Photo slideshow URLs" className="sm:col-span-2" hint="One image URL per line — they cross-fade on the idle screensaver.">
                <Textarea
                  name="homePhotos"
                  defaultValue={((s.homePhotos as string[] | undefined) ?? []).join("\n")}
                  placeholder={"https://…/photo1.jpg\nhttps://…/photo2.jpg"}
                  className="font-mono text-xs"
                />
              </Field>
              <div className="rounded-xl border border-harbor-100 px-3.5 py-3 sm:col-span-2">
                <Switch
                  name="screensaver"
                  label="Show screensaver when idle"
                  hint="Photo slideshow or soft clock after the idle timeout."
                  defaultChecked={s.screensaver !== false}
                />
              </div>
              <div className="sm:col-span-2">
                <SubmitButton variant="secondary">Save wall settings</SubmitButton>
              </div>
            </form>
          );
        })()}
      </Card>

      <Card className="mb-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-water" />
          <h2 className="text-title text-harbor">Wall PIN</h2>
          {household.parent_pin_hash ? (
            <Badge tone="green">Set</Badge>
          ) : (
            <Badge tone="gray">Not set</Badge>
          )}
        </div>
        <p className="mt-2 text-sm text-muted">
          Gates settings and editing on the wall tablet. Syncs to the wall with
          Harbor Plus; otherwise set it on the device itself.
        </p>
        <form action={setParentPin} className="mt-3 flex items-end gap-3">
          <Field label="New PIN (4–8 digits)" className="flex-1">
            <Input name="pin" inputMode="numeric" pattern="\d{4,8}" placeholder="••••" />
          </Field>
          <SubmitButton>Save PIN</SubmitButton>
        </form>
        {household.parent_pin_hash && (
          <form action={clearParentPin} className="mt-2">
            <Button type="submit" variant="ghost" size="sm">Clear PIN</Button>
          </form>
        )}
      </Card>

      <Card className="mb-4">
        <div className="flex items-center gap-2">
          <Tablet className="h-5 w-5 text-water" />
          <h2 className="text-title text-harbor">Wall devices</h2>
        </div>
        <ul className="mt-3 space-y-2">
          {(pairings ?? []).map((p) => (
            <li key={p.code} className="flex items-center justify-between rounded-lg bg-harbor-50 px-3 py-2">
              <span className="font-mono font-bold tracking-wider text-harbor">
                {formatPairingCode(p.code)}
              </span>
              <Badge tone={p.status === "paired" ? "green" : "amber"}>
                {titleCase(p.status)}
              </Badge>
            </li>
          ))}
          {(pairings ?? []).length === 0 && (
            <li className="text-sm text-muted">No devices paired yet.</li>
          )}
        </ul>
      </Card>

      <Card>
        <h2 className="text-title text-harbor">Account</h2>
        <Link href="/account/password" className="mt-2 inline-block">
          <Button variant="secondary" size="sm">Change password</Button>
        </Link>
      </Card>
    </>
  );
}
