import Link from "next/link";
import { cookies } from "next/headers";
import { KeyRound, Tablet, Settings as SettingsIcon, Sparkles, CalendarDays, Bell, Palette } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { NotificationsCard } from "@/components/app/NotificationsCard";
import { isPushConfigured, env } from "@/lib/env";
import { mergePrefs } from "@/lib/notifications/prefs";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMyHousehold } from "@/lib/household";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Badge, Input, Field, Button, Textarea, Switch, Select } from "@/components/ui/primitives";
import { DEFAULT_TZ } from "@/lib/tz";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Disclosure } from "@/components/app/Disclosure";
import { GoogleSyncButton } from "@/components/app/GoogleSyncButton";
import { GuardiansCard, type Guardian } from "@/components/app/GuardiansCard";
import { formatPairingCode } from "@/lib/pairing-format";
import { titleCase } from "@/lib/format";
import { updateHouseholdName, setParentPin, clearParentPin } from "../actions";
import { updateKioskSettings, saveAiConfig, disconnectGoogle, createPairingCode } from "../hub-actions";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ google?: string }> }) {
  const household = await getMyHousehold();
  if (!household) return <Card><p className="text-fg-muted">No household yet.</p></Card>;

  const googleStatus = (await searchParams).google;
  const supabase = await createClient();
  const [{ data: pairings }, { data: kids }] = await Promise.all([
    supabase.from("device_pairings").select("code, status, kind, child_id").eq("household_id", household.id).order("created_at"),
    supabase.from("children").select("id, name").eq("household_id", household.id).is("deleted_at", null).order("sort_order"),
  ]);
  const childName = (id: string | null) => (id ? (kids ?? []).find((c) => c.id === id)?.name ?? "a child" : null);

  // Tolerate the table not existing yet (before migration 0031 is applied) so the
  // Settings page — the only place to connect Google — always renders.
  let gcal: { connected_email: string | null; last_synced_at: string | null } | null = null;
  try {
    const { data } = await supabase
      .from("google_calendar")
      .select("connected_email, last_synced_at")
      .eq("household_id", household.id)
      .maybeSingle();
    gcal = data;
  } catch {
    /* migration not applied yet */
  }
  const googleConnected = !!gcal?.connected_email;

  // AI config — read the raw key server-side but only surface a "set" boolean.
  const { data: aiRow } = await supabase
    .from("ai_config")
    .select("enabled, anthropic_api_key")
    .eq("household_id", household.id)
    .maybeSingle();
  const aiKeySet = !!aiRow?.anthropic_api_key;
  const aiEnabled = !!aiRow?.enabled;

  // Co-parent / guardians (§9.2.11). Only the owner manages; emails are resolved
  // server-side via the admin client (tolerant of no service-role key).
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  const isOwner = !!authUser && household.owner_id === authUser.id;
  let guardians: Guardian[] = [];
  let guardiansAvailable = false;
  try {
    const admin = createAdminClient();
    const { data: members } = await admin
      .from("household_members")
      .select("profile_id, role, created_at")
      .eq("household_id", household.id)
      .order("created_at");
    guardians = await Promise.all(
      (members ?? []).map(async (m) => {
        let email = "(account)";
        try {
          const { data } = await admin.auth.admin.getUserById(m.profile_id);
          email = data?.user?.email ?? email;
        } catch {
          /* leave placeholder */
        }
        return {
          profile_id: m.profile_id,
          role: m.role,
          email,
          isOwner: m.profile_id === household.owner_id,
        };
      }),
    );
    guardiansAvailable = true;
  } catch {
    /* no service-role key — the card shows a setup note */
  }

  // Notification preferences for the signed-in parent (per profile).
  let notifPrefsRaw: unknown = null;
  try {
    const { data } = await supabase
      .from("notification_preferences")
      .select("prefs")
      .eq("parent_id", authUser?.id ?? "")
      .maybeSingle();
    notifPrefsRaw = data?.prefs ?? null;
  } catch {
    /* migration not applied yet */
  }
  const notifPrefs = mergePrefs(notifPrefsRaw);
  const theme = (await cookies()).get("harbor-theme")?.value === "light" ? "light" : "dark";

  return (
    <>
      <PageHeader eyebrow="Account" icon={<SettingsIcon className="h-6 w-6" />} title="Settings" />

      <Card className="mb-4">
        <div className="mb-3 flex items-center gap-2">
          <Palette className="h-5 w-5 text-accent" />
          <h2 className="text-title text-fg">Appearance</h2>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-fg-muted">Harbor runs dark by default. Switch to light whenever you like.</p>
          <ThemeToggle initial={theme} />
        </div>
      </Card>

      <Card className="mb-4">
        <h2 className="text-title text-fg">Household</h2>
        <form action={updateHouseholdName} className="mt-3 flex items-end gap-3">
          <Field label="Name" className="flex-1">
            <Input name="name" defaultValue={household.name} />
          </Field>
          <SubmitButton variant="secondary">Save</SubmitButton>
        </form>
      </Card>

      <Card className="mb-4 p-0">
        <Disclosure
          bodyClassName="px-5 pb-5"
          summary={
            <span className="flex items-center gap-2 text-title text-fg">
              <Bell className="h-5 w-5 text-accent" /> Notifications
            </span>
          }
        >
          <p className="mb-4 text-sm text-fg-muted">
            Calm, high-signal alerts on your phone — most importantly, when a child needs you. Turn them on for this
            device, then choose what to hear about.
          </p>
          <NotificationsCard pushConfigured={isPushConfigured()} vapidPublicKey={env.vapidPublicKey} initialPrefs={notifPrefs} />
        </Disclosure>
      </Card>

      <Card className="mb-4 p-0">
        <Disclosure bodyClassName="px-5 pb-5" summary={
          <span className="text-title text-fg">Wall display</span>
        }>
        <p className="text-sm text-fg-muted">How the wall behaves when idle.</p>
        {(() => {
          const s = (household.settings ?? {}) as Record<string, unknown>;
          return (
            <form action={updateKioskSettings} className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Time zone" className="sm:col-span-2" hint="Calendar times and the daily reset all use this zone, on every device.">
                <Select name="timezone" defaultValue={(s.timezone as string) ?? DEFAULT_TZ}>
                  <option value="America/New_York">Eastern (New York)</option>
                  <option value="America/Chicago">Central (Chicago)</option>
                  <option value="America/Denver">Mountain (Denver)</option>
                  <option value="America/Phoenix">Arizona (no DST)</option>
                  <option value="America/Los_Angeles">Pacific (Los Angeles)</option>
                  <option value="America/Anchorage">Alaska (Anchorage)</option>
                  <option value="Pacific/Honolulu">Hawaii (Honolulu)</option>
                </Select>
              </Field>
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
              <div className="rounded-xl border border-line px-3.5 py-3 sm:col-span-2">
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
        </Disclosure>
      </Card>

      <Card className="mb-4 p-0">
        <Disclosure bodyClassName="px-5 pb-5" summary={
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          <span className="text-title text-fg">AI Companion</span>
          {aiEnabled && aiKeySet ? <Badge tone="green">On</Badge> : <Badge tone="gray">Off</Badge>}
        </div>
        }>
        <p className="mt-2 text-sm text-fg-muted">
          Bring your own Anthropic API key to power AI features — meal-plan generation now, with daily
          briefs, chore ideas and more coming. It runs on Claude Haiku to keep costs low. Your key is
          stored securely server-side and is <strong>never</strong> sent to the wall tablet.
        </p>
        <form action={saveAiConfig} className="mt-3 space-y-3">
          <Field
            label={aiKeySet ? "Anthropic API key (leave blank to keep current)" : "Anthropic API key"}
            hint="Starts with sk-ant-. Create one at console.anthropic.com → API keys."
          >
            <Input
              name="anthropic_api_key"
              type="password"
              autoComplete="off"
              placeholder={aiKeySet ? "•••••••••••• (saved)" : "sk-ant-…"}
            />
          </Field>
          <div className="rounded-xl border border-line px-3.5 py-3">
            <Switch
              name="ai_enabled"
              label="Enable the AI companion"
              hint="Turn AI features on across Harbor."
              defaultChecked={aiEnabled}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <SubmitButton variant="secondary">Save AI settings</SubmitButton>
            {aiKeySet && (
              <label className="flex items-center gap-1.5 text-xs text-fg-muted">
                <input type="checkbox" name="clear_key" className="h-3.5 w-3.5" /> Remove saved key
              </label>
            )}
          </div>
        </form>
        </Disclosure>
      </Card>

      <Card className="mb-4 p-0">
        <Disclosure bodyClassName="px-5 pb-5" summary={
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-accent" />
          <span className="text-title text-fg">Google Calendar</span>
          {googleConnected ? <Badge tone="green">Connected</Badge> : <Badge tone="gray">Not connected</Badge>}
        </div>
        }>
        <p className="mt-2 text-sm text-fg-muted">
          Two-way sync with your Google Calendar — events you add in Harbor appear in Google, and Google
          events show on the wall. Tokens are stored securely server-side and <strong>never</strong> reach the wall tablet.
        </p>
        {googleStatus === "connected" && (
          <p className="mt-3 rounded-lg bg-good/10 px-3 py-2 text-sm text-good">Google Calendar connected and synced.</p>
        )}
        {googleStatus === "error" && (
          <p className="mt-3 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">Couldn&apos;t connect — please try again.</p>
        )}
        {googleStatus === "unconfigured" && (
          <p className="mt-3 rounded-lg bg-beacon/10 px-3 py-2 text-sm text-beacon">Google sync isn&apos;t configured on the server yet.</p>
        )}
        {googleStatus === "denied" && (
          <p className="mt-3 rounded-lg bg-beacon/10 px-3 py-2 text-sm text-beacon">You didn&apos;t grant access — you can reconnect anytime.</p>
        )}
        {googleConnected ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-fg">
              Connected as <strong>{gcal?.connected_email}</strong>
              {gcal?.last_synced_at ? <span className="text-fg-muted"> · last synced {new Date(gcal.last_synced_at).toLocaleString()}</span> : null}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <GoogleSyncButton />
              <form action={disconnectGoogle}>
                <Button type="submit" variant="ghost" size="sm">Disconnect</Button>
              </form>
            </div>
          </div>
        ) : (
          <a
            href="/api/google/connect"
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition hover:brightness-110"
          >
            <CalendarDays className="h-4 w-4" /> Connect Google Calendar
          </a>
        )}
        </Disclosure>
      </Card>

      <Card id="pin" className="mb-4 scroll-mt-20 p-0">
        <Disclosure defaultOpen bodyClassName="px-5 pb-5" summary={
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-accent" />
          <span className="text-title text-fg">Wall PIN</span>
          {household.parent_pin_hash ? (
            <Badge tone="green">Set</Badge>
          ) : (
            <Badge tone="gray">Not set</Badge>
          )}
        </div>
        }>
        <p className="mt-2 text-sm text-fg-muted">
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
        </Disclosure>
      </Card>

      <Card className="mb-4 p-0">
        <Disclosure bodyClassName="px-5 pb-5" summary={
        <div className="flex items-center gap-2">
          <Tablet className="h-5 w-5 text-accent" />
          <span className="text-title text-fg">Devices</span>
        </div>
        }>
        <p className="mt-1 text-sm text-fg-muted">
          The wall is your hub. Turn any spare tablet into a per-child <strong>room device</strong> — their
          routine, Anchor, and a bedtime nightlight — at no extra cost.
        </p>
        <ul className="mt-3 space-y-2">
          {(pairings ?? []).map((p) => (
            <li key={p.code} className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2">
              <div className="min-w-0">
                <span className="font-mono font-bold tracking-wider text-fg">{formatPairingCode(p.code)}</span>
                <span className="ml-2 text-xs font-semibold text-fg-muted">
                  {p.kind === "outpost" ? `Room device · ${childName(p.child_id)}` : "Wall"}
                </span>
              </div>
              <Badge tone={p.status === "paired" ? "green" : "amber"}>{titleCase(p.status)}</Badge>
            </li>
          ))}
          {(pairings ?? []).length === 0 && <li className="text-sm text-fg-muted">No devices paired yet.</li>}
        </ul>

        <div className="mt-4 border-t border-line pt-4">
          <p className="text-eyebrow text-fg-muted">Add a device</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <form action={createPairingCode}>
              <input type="hidden" name="kind" value="wall" />
              <SubmitButton size="sm" variant="secondary" savedText="Code ready">+ Pair a wall</SubmitButton>
            </form>
            {(kids ?? []).map((c) => (
              <form key={c.id} action={createPairingCode}>
                <input type="hidden" name="kind" value="outpost" />
                <input type="hidden" name="child_id" value={c.id} />
                <SubmitButton size="sm" variant="secondary" savedText="Code ready">+ {c.name}&apos;s room device</SubmitButton>
              </form>
            ))}
          </div>
          <p className="mt-2 text-xs text-fg-muted">A new code appears above — open Harbor on the spare tablet and enter it.</p>
        </div>
        </Disclosure>
      </Card>

      <div className="mb-4">
        <GuardiansCard guardians={guardians} isOwner={isOwner} available={guardiansAvailable} />
      </div>

      <Card className="p-0">
        <Disclosure bodyClassName="px-5 pb-5" summary={
          <span className="text-title text-fg">Account</span>
        }>
        <Link href="/account/password" className="mt-2 inline-block">
          <Button variant="secondary" size="sm">Change password</Button>
        </Link>
        </Disclosure>
      </Card>
    </>
  );
}
