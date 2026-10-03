"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Sheet, SheetActions } from "@/components/ui/Sheet";
import { ActionForm, FormError } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ChipGroup } from "@/components/ui/Chips";
import { Toggle } from "@/components/ui/Toggle";
import { Button, Field, Input, Textarea } from "@/components/ui/primitives";
import { useQuickAction } from "@/components/ui/useQuickAction";
import { Disclosure } from "@/components/app/Disclosure";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { GoogleSyncButton } from "@/components/app/GoogleSyncButton";
import { NotificationsCard } from "@/components/app/NotificationsCard";
import { renameHousehold, setFamilyTimezone, setWallPin, removeWallPin, saveWallScreen } from "@/app/app/(parent)/settings/settings-actions";
import { disconnectGoogle } from "@/app/app/(parent)/hub-actions";
import type { NotifPrefs } from "@/lib/notifications/prefs";

export type SettingsData = {
  familyName: string;
  timezone: string;
  pinSet: boolean;
  wall: { screensaver: boolean; idleSeconds: number; quietStart: string | null; quietEnd: string | null; weatherCity: string; photos: string[] };
  screens: number;
  google: { connected: boolean; email: string | null; lastSynced: string | null; status: string | null };
  theme: "dark" | "light";
  notifications: { pushConfigured: boolean; vapidPublicKey: string; prefs: NotifPrefs };
  /** Open one sheet straight away (e.g. the setup checklist's "Set a wall PIN"). */
  open?: string | null;
};

type SheetKey = null | "name" | "tz" | "pin" | "wall" | "google" | "notifications";
const SHEETS: SheetKey[] = ["name", "tz", "pin", "wall", "google", "notifications"];

const COMMON_TZ: { tz: string; label: string }[] = [
  { tz: "America/New_York", label: "Eastern" },
  { tz: "America/Chicago", label: "Central" },
  { tz: "America/Denver", label: "Mountain" },
  { tz: "America/Phoenix", label: "Arizona" },
  { tz: "America/Los_Angeles", label: "Pacific" },
  { tz: "America/Anchorage", label: "Alaska" },
  { tz: "Pacific/Honolulu", label: "Hawaii" },
];
export const tzLabel = (tz: string) => {
  const c = COMMON_TZ.find((x) => x.tz === tz);
  const city = tz.split("/").pop()?.replace(/_/g, " ") ?? tz;
  return c ? `${c.label} (${city})` : city;
};
const fmtTime = (t: string | null) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h >= 12 ? "PM" : "AM"}`;
};

function Row({ emoji, label, value, onClick, href, trailing }: { emoji: string; label: string; value?: string; onClick?: () => void; href?: string; trailing?: React.ReactNode }) {
  const inner = (
    <>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-xl" aria-hidden>
        {emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-fg">{label}</span>
        {value && <span className="block truncate text-sm text-fg-muted">{value}</span>}
      </span>
      {trailing ?? <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" />}
    </>
  );
  const cls = "flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-2";
  if (href) return <Link href={href} className={cls}>{inner}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={cls}>{inner}</button>;
  return <div className="flex min-h-16 w-full items-center gap-3 px-4 py-3">{inner}</div>;
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 px-1 text-sm font-semibold text-fg-muted">{title}</h2>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">{children}</ul>
    </section>
  );
}

export function SettingsList({ data }: { data: SettingsData }) {
  const [sheet, setSheet] = useState<SheetKey>(
    data.google.status ? "google" : SHEETS.includes((data.open ?? null) as SheetKey) ? (data.open as SheetKey) : null,
  );
  const w = data.wall;
  const wallSummary = [
    w.screensaver ? `Sleeps after ${Math.round(w.idleSeconds / 60)} min` : "Never sleeps",
    w.quietStart && w.quietEnd ? `Dims ${fmtTime(w.quietStart)}–${fmtTime(w.quietEnd)}` : null,
    w.weatherCity ? `Weather: ${w.weatherCity}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <Group title="Your family">
        <li>
          <Row emoji="🏠" label="Family name" value={data.familyName} onClick={() => setSheet("name")} />
        </li>
        <li>
          <Row emoji="🕒" label="Time zone" value={tzLabel(data.timezone)} onClick={() => setSheet("tz")} />
        </li>
        <li>
          <Row emoji="👥" label="Grown-ups" value="Co-parents and wall profiles" href="/app/family" />
        </li>
      </Group>

      <Group title="The wall">
        <li>
          <Row emoji="🔒" label="Wall PIN" value={data.pinSet ? "On" : "Not set — keeps little hands out of settings"} onClick={() => setSheet("pin")} />
        </li>
        <li>
          <Row emoji="🖥️" label="When nobody's using it" value={wallSummary} onClick={() => setSheet("wall")} />
        </li>
        <li>
          <Row emoji="📱" label="Screens" value={data.screens ? `${data.screens} ${data.screens === 1 ? "screen" : "screens"}` : "Set up your wall"} href="/app/devices" />
        </li>
        <li>
          <Row emoji="📅" label="Google Calendar" value={data.google.connected ? `Connected · ${data.google.email}` : "Not connected"} onClick={() => setSheet("google")} />
        </li>
      </Group>

      <Group title="This phone">
        <li>
          <Row emoji="🔔" label="Notifications" value="What reaches your phone" onClick={() => setSheet("notifications")} />
        </li>
        <li>
          <Row emoji="🌓" label="Appearance" trailing={<ThemeToggle initial={data.theme} />} />
        </li>
      </Group>

      <Group title="Account">
        <li>
          <Row emoji="🔑" label="Change password" href="/account/password" />
        </li>
        <li>
          <Row emoji="✨" label="Harbor Plus" value="Extras for your family" href="/app/billing" />
        </li>
      </Group>

      <Sheet open={sheet === "name"} onClose={() => setSheet(null)} title="Family name" description="Shown at the top of the wall and the app.">
        <ActionForm action={renameHousehold} className="space-y-5">
          <Input name="name" required maxLength={60} defaultValue={data.familyName} aria-label="Family name" data-autofocus />
          <FormError />
          <SheetActions>
            <SubmitButton size="lg" className="w-full sm:w-auto" confirmSaved={false}>
              Save
            </SubmitButton>
          </SheetActions>
        </ActionForm>
      </Sheet>

      <Sheet open={sheet === "tz"} onClose={() => setSheet(null)} title="Time zone" description="Routines, reminders and the daily reset all follow this, on every screen.">
        <TimezonePicker current={data.timezone} onDone={() => setSheet(null)} />
      </Sheet>

      <Sheet open={sheet === "pin"} onClose={() => setSheet(null)} title="Wall PIN" description="Grown-ups type it on the wall to open settings or approve things.">
        <PinForm pinSet={data.pinSet} onDone={() => setSheet(null)} />
      </Sheet>

      <Sheet open={sheet === "wall"} onClose={() => setSheet(null)} title="When nobody's using it">
        <WallScreenForm wall={data.wall} />
      </Sheet>

      <Sheet open={sheet === "google"} onClose={() => setSheet(null)} title="Google Calendar" description="Events you add in Harbor show in Google, and Google events show on the wall.">
        <GooglePanel google={data.google} />
      </Sheet>

      <Sheet open={sheet === "notifications"} onClose={() => setSheet(null)} title="Notifications" size="lg">
        <NotificationsCard pushConfigured={data.notifications.pushConfigured} vapidPublicKey={data.notifications.vapidPublicKey} initialPrefs={data.notifications.prefs} />
      </Sheet>
    </>
  );
}

function TimezonePicker({ current, onDone }: { current: string; onDone: () => void }) {
  const { run, pending } = useQuickAction();
  const [q, setQ] = useState("");
  const [showAll, setShowAll] = useState(!COMMON_TZ.some((c) => c.tz === current));
  const detected = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return null;
    }
  }, []);
  const all = useMemo(() => {
    try {
      return (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone");
    } catch {
      return COMMON_TZ.map((c) => c.tz);
    }
  }, []);
  const choose = (tz: string) => run(() => setFamilyTimezone(tz), { onDone });
  const matches = q.trim() ? all.filter((tz) => tz.toLowerCase().replace(/_/g, " ").includes(q.trim().toLowerCase())).slice(0, 30) : [];

  return (
    <div className="space-y-5 pb-1">
      {detected && detected !== current && (
        <Button size="lg" className="w-full" disabled={pending} onClick={() => choose(detected)}>
          Use this phone&apos;s time zone · {tzLabel(detected)}
        </Button>
      )}
      <ChipGroup
        ariaLabel="Time zone"
        value={COMMON_TZ.some((c) => c.tz === current) ? current : null}
        onChange={(v) => v[0] && v[0] !== current && choose(v[0])}
        options={COMMON_TZ.map((c) => ({ value: c.tz, label: c.label }))}
      />
      {showAll ? (
        <div className="space-y-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for a city, like London or Toronto" aria-label="Search time zones" />
          {!COMMON_TZ.some((c) => c.tz === current) && <p className="text-sm text-fg-muted">Now: {tzLabel(current)}</p>}
          {matches.length > 0 && (
            <ul className="max-h-64 divide-y divide-line overflow-y-auto rounded-xl border border-line">
              {matches.map((tz) => (
                <li key={tz}>
                  <button type="button" disabled={pending} onClick={() => choose(tz)} className="flex min-h-11 w-full items-center px-3.5 text-left text-[15px] text-fg transition hover:bg-surface-2">
                    {tz.replace(/_/g, " ")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <button type="button" onClick={() => setShowAll(true)} className="min-h-10 text-sm font-semibold text-accent">
          Somewhere else?
        </button>
      )}
    </div>
  );
}

function PinForm({ pinSet, onDone }: { pinSet: boolean; onDone: () => void }) {
  const { run, pending } = useQuickAction();
  const digits = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 8);
  };
  return (
    <ActionForm action={setWallPin} resetOnSuccess className="space-y-5">
      <Field label={pinSet ? "New PIN" : "PIN"} htmlFor="pin-1" hint="4 to 8 numbers. The wall picks it up within a moment.">
        <Input id="pin-1" name="pin" type="password" inputMode="numeric" autoComplete="new-password" required minLength={4} maxLength={8} onChange={digits} placeholder="••••" data-autofocus className="text-center text-2xl tracking-[0.4em]" />
      </Field>
      <Field label="Type it again" htmlFor="pin-2">
        <Input id="pin-2" name="confirm" type="password" inputMode="numeric" autoComplete="new-password" required minLength={4} maxLength={8} onChange={digits} placeholder="••••" className="text-center text-2xl tracking-[0.4em]" />
      </Field>
      <FormError />
      <SheetActions className={pinSet ? "sm:justify-between" : undefined}>
        {pinSet && (
          <Button type="button" variant="ghost" className="text-error" disabled={pending} onClick={() => run(() => removeWallPin(), { onDone })}>
            Remove PIN
          </Button>
        )}
        <SubmitButton size="lg" className={pinSet ? undefined : "w-full sm:w-auto"} confirmSaved={false}>
          {pinSet ? "Change PIN" : "Set PIN"}
        </SubmitButton>
      </SheetActions>
    </ActionForm>
  );
}

function WallScreenForm({ wall }: { wall: SettingsData["wall"] }) {
  const [screensaver, setScreensaver] = useState(wall.screensaver);
  const [dim, setDim] = useState(!!(wall.quietStart && wall.quietEnd));
  const idleChoices = ["60", "120", "300", "600"];
  const idle = String(wall.idleSeconds);
  return (
    <ActionForm action={saveWallScreen} className="space-y-5">
      <div className="rounded-xl border border-line px-3.5">
        <Toggle checked={screensaver} onChange={setScreensaver} name="screensaver" label="Rest after a while" hint="Shows photos or a soft clock, then wakes with a tap" />
      </div>
      {screensaver && (
        <Field label="Rest after">
          <ChipGroup
            name="idleSeconds"
            defaultValue={idleChoices.includes(idle) ? idle : "120"}
            options={[
              { value: "60", label: "1 min" },
              { value: "120", label: "2 min" },
              { value: "300", label: "5 min" },
              { value: "600", label: "10 min" },
            ]}
          />
        </Field>
      )}
      {!screensaver && <input type="hidden" name="idleSeconds" value={wall.idleSeconds} />}
      <div className="rounded-xl border border-line px-3.5">
        <Toggle checked={dim} onChange={setDim} label="Dim at night" hint="A soft clock overnight" />
      </div>
      {dim ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="From" htmlFor="ws-qs">
            <Input id="ws-qs" name="quietStart" type="time" defaultValue={wall.quietStart ?? "20:30"} />
          </Field>
          <Field label="Until" htmlFor="ws-qe">
            <Input id="ws-qe" name="quietEnd" type="time" defaultValue={wall.quietEnd ?? "06:30"} />
          </Field>
        </div>
      ) : (
        <>
          <input type="hidden" name="quietStart" value="" />
          <input type="hidden" name="quietEnd" value="" />
        </>
      )}
      <Field label="Weather for (optional)" htmlFor="ws-city" hint="The forecast shows on the wall.">
        <Input id="ws-city" name="weatherCity" maxLength={80} defaultValue={wall.weatherCity} placeholder="Austin, Texas" />
      </Field>
      <div className="rounded-xl border border-line">
        <Disclosure summary={<span className="text-[15px] font-semibold text-fg">Photo slideshow</span>} bodyClassName="px-4 pb-4">
          <Field label="Photo links" htmlFor="ws-photos" hint="One image link per line — they fade between each other while the wall rests.">
            <Textarea id="ws-photos" name="homePhotos" defaultValue={wall.photos.join("\n")} placeholder={"https://…/photo1.jpg\nhttps://…/photo2.jpg"} className="font-mono text-xs" />
          </Field>
        </Disclosure>
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

function GooglePanel({ google }: { google: SettingsData["google"] }) {
  const notes: Record<string, { cls: string; text: string }> = {
    connected: { cls: "bg-good/10 text-good", text: "Google Calendar is connected and synced." },
    error: { cls: "bg-error/10 text-error", text: "Couldn't connect — please try again." },
    unconfigured: { cls: "bg-beacon/10 text-beacon", text: "Google sync isn't set up on the server yet." },
    denied: { cls: "bg-beacon/10 text-beacon", text: "You didn't allow access — you can connect anytime." },
  };
  const note = google.status ? notes[google.status] : null;
  return (
    <div className="space-y-4 pb-1">
      {note && <p className={`rounded-xl px-3.5 py-2.5 text-sm ${note.cls}`}>{note.text}</p>}
      {google.connected ? (
        <>
          <p className="text-[15px] text-fg">
            Connected as <strong>{google.email}</strong>
            {google.lastSynced && <span className="block text-sm text-fg-muted">Last synced {new Date(google.lastSynced).toLocaleString()}</span>}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <GoogleSyncButton />
            <form action={disconnectGoogle}>
              <Button type="submit" variant="ghost" size="sm" className="text-error">
                Disconnect
              </Button>
            </form>
          </div>
        </>
      ) : (
        <a href="/api/google/connect" className="flex min-h-12 items-center justify-center rounded-xl bg-accent px-5 text-base font-semibold text-accent-fg transition hover:brightness-110">
          Connect Google Calendar
        </a>
      )}
      <p className="text-sm text-fg-subtle">Your Google sign-in stays on our server — it never reaches the wall.</p>
    </div>
  );
}
