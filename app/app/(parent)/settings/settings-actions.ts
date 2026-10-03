"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getMyHousehold } from "@/lib/household";
import { hashPinServer } from "@/lib/pin";
import type { Json } from "@/lib/database.types";

// Settings, one small action per row. Each RETURNS an honest result for the toast and merges
// into households.settings instead of overwriting it (so one sheet can't clobber another).

export type SettingsResult = { ok: true; message?: string } | { ok: false; error: string };

const clip = (v: unknown, max: number): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, max) : null;
};
const hhmm = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return /^\d{2}:\d{2}$/.test(s) ? s : null;
};

async function ctx() {
  await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household found.");
  return { household, supabase: await createClient() };
}

async function mergeSettings(patch: Record<string, unknown>, remove: string[] = []): Promise<SettingsResult> {
  const { household, supabase } = await ctx();
  const next: Record<string, unknown> = { ...((household.settings ?? {}) as Record<string, unknown>), ...patch };
  for (const k of remove) delete next[k];
  const { error } = await supabase.from("households").update({ settings: next as Json }).eq("id", household.id);
  if (error) return { ok: false, error: "Couldn't save that. Try again." };
  revalidatePath("/app", "layout");
  return { ok: true, message: "Saved" };
}

export async function renameHousehold(formData: FormData): Promise<SettingsResult> {
  const { household, supabase } = await ctx();
  const name = clip(formData.get("name"), 60);
  if (!name) return { ok: false, error: "Give your family a name." };
  const { error } = await supabase.from("households").update({ name }).eq("id", household.id);
  if (error) return { ok: false, error: "Couldn't save that. Try again." };
  revalidatePath("/app", "layout");
  return { ok: true, message: "Saved" };
}

export async function setFamilyTimezone(tz: string): Promise<SettingsResult> {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
  } catch {
    return { ok: false, error: "That time zone isn't recognized." };
  }
  const r = await mergeSettings({ timezone: tz });
  return r.ok ? { ok: true, message: "Time zone saved" } : r;
}

/** Set or change the wall PIN — typed twice so a typo can't lock you out. */
export async function setWallPin(formData: FormData): Promise<SettingsResult> {
  const { household, supabase } = await ctx();
  const pin = String(formData.get("pin") ?? "").trim();
  const confirm = String(formData.get("confirm") ?? "").trim();
  if (!/^\d{4,8}$/.test(pin)) return { ok: false, error: "Use 4 to 8 numbers." };
  if (pin !== confirm) return { ok: false, error: "Those two PINs don't match." };
  const { error } = await supabase.from("households").update({ parent_pin_hash: hashPinServer(pin) }).eq("id", household.id);
  if (error) return { ok: false, error: "Couldn't save the PIN. Try again." };
  revalidatePath("/app", "layout");
  return { ok: true, message: "PIN saved — the wall picks it up in a moment" };
}

export async function removeWallPin(): Promise<SettingsResult> {
  const { household, supabase } = await ctx();
  const { error } = await supabase.from("households").update({ parent_pin_hash: null }).eq("id", household.id);
  if (error) return { ok: false, error: "Couldn't remove the PIN." };
  revalidatePath("/app", "layout");
  return { ok: true, message: "PIN removed" };
}

/** How the wall behaves when nobody's using it: sleep, screensaver photos, quiet hours, weather. */
export async function saveWallScreen(formData: FormData): Promise<SettingsResult> {
  const { household } = await ctx();
  const current = (household.settings ?? {}) as Record<string, unknown>;

  let weather = current.weather as { lat: number; lon: number; label: string } | undefined;
  const city = clip(formData.get("weatherCity"), 80);
  if (!city) weather = undefined;
  else if (city.toLowerCase() !== (weather?.label ?? "").toLowerCase()) {
    try {
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
      const hit = (await r.json())?.results?.[0];
      if (!hit) return { ok: false, error: `Couldn't find “${city}”. Try the city and state, like “Austin, Texas”.` };
      weather = { lat: hit.latitude, lon: hit.longitude, label: [hit.name, hit.admin1].filter(Boolean).join(", ") };
    } catch {
      return { ok: false, error: "Couldn't look up that city right now. Try again." };
    }
  }

  const photos = String(formData.get("homePhotos") ?? "")
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s))
    .slice(0, 30);
  const idle = Number(formData.get("idleSeconds"));
  const r = await mergeSettings(
    {
      screensaver: formData.get("screensaver") === "on",
      idleSeconds: Number.isFinite(idle) && idle >= 30 ? Math.min(3600, Math.round(idle)) : 120,
      quietStart: hhmm(formData.get("quietStart")),
      quietEnd: hhmm(formData.get("quietEnd")),
      homePhotos: photos,
      ...(weather ? { weather } : {}),
    },
    weather ? [] : ["weather"],
  );
  return r.ok ? { ok: true, message: "Wall settings saved" } : r;
}
