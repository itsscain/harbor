import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { isPushConfigured, env } from "@/lib/env";
import { mergePrefs } from "@/lib/notifications/prefs";
import { tzFromSettings } from "@/lib/tz";
import { PageHeader } from "@/components/ui/PageHeader";
import { SettingsList, type SettingsData } from "@/components/app/settings/SettingsList";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

// Settings — a short list of plain rows; each opens one small sheet.
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ google?: string; open?: string }> }) {
  const household = await getMyHousehold();
  if (!household) return <PageHeader title="Settings" subtitle="No household yet." />;
  const { google, open } = await searchParams;
  const supabase = await createClient();
  const s = (household.settings ?? {}) as Record<string, unknown>;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ count: screens }, gcalRes, prefsRes] = await Promise.all([
    supabase.from("device_pairings").select("id", { count: "exact", head: true }).eq("household_id", household.id),
    supabase.from("google_calendar").select("connected_email, last_synced_at").eq("household_id", household.id).maybeSingle(),
    supabase.from("notification_preferences").select("prefs").eq("parent_id", user?.id ?? "").maybeSingle(),
  ]);
  const gcal = gcalRes.data;

  const data: SettingsData = {
    familyName: household.name,
    timezone: tzFromSettings(s),
    pinSet: !!household.parent_pin_hash,
    wall: {
      screensaver: s.screensaver !== false,
      idleSeconds: typeof s.idleSeconds === "number" ? s.idleSeconds : 120,
      quietStart: typeof s.quietStart === "string" ? s.quietStart : null,
      quietEnd: typeof s.quietEnd === "string" ? s.quietEnd : null,
      weatherCity: (s.weather as { label?: string } | undefined)?.label ?? "",
      photos: Array.isArray(s.homePhotos) ? (s.homePhotos as string[]) : [],
    },
    screens: screens ?? 0,
    google: {
      connected: !!gcal?.connected_email,
      email: gcal?.connected_email ?? null,
      lastSynced: gcal?.last_synced_at ?? null,
      status: google ?? null,
    },
    theme: (await cookies()).get("harbor-theme")?.value === "light" ? "light" : "dark",
    notifications: { pushConfigured: isPushConfigured(), vapidPublicKey: env.vapidPublicKey, prefs: mergePrefs(prefsRes.data?.prefs ?? null) },
    open: open ?? null,
  };

  return (
    <>
      <PageHeader title="Settings" />
      <SettingsList data={data} />
    </>
  );
}
