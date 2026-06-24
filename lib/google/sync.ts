import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { refreshAccessToken } from "./oauth";

type Sb = Awaited<ReturnType<typeof createClient>>;

// Two-way Google Calendar sync. Pull brings Google → Harbor (upsert by
// google_event_id, soft-delete cancelled); push sends locally-created Harbor
// events → Google and stamps their id. Idempotent both ways; no infinite loop
// because pulled events carry google_event_id (never re-pushed).

const CAL_BASE = "https://www.googleapis.com/calendar/v3/calendars";
const PAGE_GUARD = 50; // ≈12.5k events/sync — far beyond any real family calendar
const INITIAL_WINDOW_DAYS = 180; // how far back to pull on first connect

type Conn = {
  access_token: string | null;
  refresh_token: string | null;
  token_expiry: string | null;
  calendar_id: string;
  sync_token: string | null;
};

export async function getConnection(supabase: Sb, householdId: string): Promise<Conn | null> {
  const { data } = await supabase
    .from("google_calendar")
    .select("access_token, refresh_token, token_expiry, calendar_id, sync_token")
    .eq("household_id", householdId)
    .maybeSingle();
  return (data as Conn) ?? null;
}

/** Clear stored tokens so Settings shows "not connected" and the user can reconnect. */
async function clearConnection(supabase: Sb, householdId: string) {
  await supabase
    .from("google_calendar")
    .update({ access_token: null, refresh_token: null, token_expiry: null, connected_email: null, sync_token: null })
    .eq("household_id", householdId);
}

/** A valid access token, refreshing (and persisting) if it's expired. Returns null
 *  (and clears the connection) if the refresh token is revoked/expired. */
async function validToken(supabase: Sb, householdId: string, conn: Conn): Promise<string | null> {
  const soon = Date.now() + 60_000;
  if (conn.access_token && conn.token_expiry && new Date(conn.token_expiry).getTime() > soon) {
    return conn.access_token;
  }
  if (!conn.refresh_token) return conn.access_token; // best effort
  try {
    const t = await refreshAccessToken(conn.refresh_token);
    const expiry = new Date(Date.now() + (t.expires_in ?? 3600) * 1000).toISOString();
    await supabase.from("google_calendar").update({ access_token: t.access_token, token_expiry: expiry }).eq("household_id", householdId);
    return t.access_token;
  } catch {
    await clearConnection(supabase, householdId);
    return null;
  }
}

async function gcal(token: string, path: string, init?: RequestInit) {
  return fetch(`${CAL_BASE}/${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init?.headers ?? {}) },
  });
}

// ── Mapping ──────────────────────────────────────────────────────────────────
type GEvent = {
  id: string;
  status?: string;
  summary?: string;
  location?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

function dayOf(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso.slice(0, 10) : d.toISOString().slice(0, 10);
}

type HarborEvent = { title: string; starts_at: string; ends_at: string | null; all_day: boolean | null; location: string | null };

function harborToGoogle(e: HarborEvent) {
  if (e.all_day) {
    const date = dayOf(e.starts_at);
    let endDate: string;
    if (e.ends_at) {
      endDate = dayOf(e.ends_at);
    } else {
      const next = new Date(`${date}T00:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      endDate = next.toISOString().slice(0, 10);
    }
    return { summary: e.title, location: e.location ?? undefined, start: { date }, end: { date: endDate } };
  }
  const start = new Date(e.starts_at);
  const end = e.ends_at ? new Date(e.ends_at) : new Date(start.getTime() + 60 * 60 * 1000);
  return {
    summary: e.title,
    location: e.location ?? undefined,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
  };
}

// ── Pull: Google → Harbor ────────────────────────────────────────────────────
export async function pullFromGoogle(supabase: Sb, householdId: string): Promise<{ pulled: number }> {
  const conn = await getConnection(supabase, householdId);
  if (!conn) return { pulled: 0 };
  const token = await validToken(supabase, householdId, conn);
  if (!token) return { pulled: 0 };

  const { data: existing } = await supabase
    .from("events")
    .select("id, google_event_id")
    .eq("household_id", householdId)
    .not("google_event_id", "is", null);
  const byGoogleId = new Map<string, string>();
  (existing ?? []).forEach((r: { id: string; google_event_id: string | null }) => {
    if (r.google_event_id) byGoogleId.set(r.google_event_id, r.id);
  });

  let pageToken: string | undefined;
  let syncToken = conn.sync_token ?? undefined;
  let nextSyncToken: string | undefined;
  let pulled = 0;
  const timeMin = new Date(Date.now() - INITIAL_WINDOW_DAYS * 86_400_000).toISOString();

  for (let guard = 0; guard < PAGE_GUARD; guard++) {
    const p = new URLSearchParams({ singleEvents: "true", maxResults: "250" });
    if (syncToken) p.set("syncToken", syncToken);
    else p.set("timeMin", timeMin);
    if (pageToken) p.set("pageToken", pageToken);

    const res = await gcal(token, `${encodeURIComponent(conn.calendar_id)}/events?${p.toString()}`);
    if (res.status === 410) {
      await supabase.from("google_calendar").update({ sync_token: null }).eq("household_id", householdId);
      syncToken = undefined;
      pageToken = undefined;
      continue;
    }
    if (res.status === 401 || res.status === 403) {
      // Access revoked/expired — clear so the user can reconnect.
      await clearConnection(supabase, householdId);
      throw new Error("Google access expired — please reconnect in Settings.");
    }
    if (!res.ok) throw new Error(`Google list failed (${res.status})`);
    const data = (await res.json()) as { items?: GEvent[]; nextPageToken?: string; nextSyncToken?: string };

    for (const it of data.items ?? []) {
      const localId = byGoogleId.get(it.id);
      if (it.status === "cancelled") {
        if (localId)
          await supabase
            .from("events")
            .update({ deleted_at: new Date().toISOString(), google_event_id: null })
            .eq("id", localId);
        continue;
      }
      if (!it.start) continue;
      const all_day = !!it.start.date;
      const starts_at = all_day ? new Date(`${it.start.date}T00:00:00Z`).toISOString() : new Date(it.start.dateTime!).toISOString();
      const ends_at = all_day
        ? it.end?.date
          ? new Date(`${it.end.date}T00:00:00Z`).toISOString()
          : null
        : it.end?.dateTime
          ? new Date(it.end.dateTime).toISOString()
          : null;
      const row = {
        household_id: householdId,
        title: (it.summary ?? "Event").slice(0, 200),
        location: it.location ? it.location.slice(0, 200) : null,
        starts_at,
        ends_at,
        all_day,
        google_event_id: it.id,
        deleted_at: null,
      };
      if (localId) await supabase.from("events").update(row).eq("id", localId);
      else await supabase.from("events").insert(row);
      pulled++;
    }

    nextSyncToken = data.nextSyncToken ?? nextSyncToken;
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  await supabase
    .from("google_calendar")
    .update({ sync_token: nextSyncToken ?? conn.sync_token, last_synced_at: new Date().toISOString() })
    .eq("household_id", householdId);
  return { pulled };
}

// ── Push: Harbor → Google ────────────────────────────────────────────────────
export async function pushToGoogle(supabase: Sb, householdId: string): Promise<{ pushed: number }> {
  const conn = await getConnection(supabase, householdId);
  if (!conn) return { pushed: 0 };
  const token = await validToken(supabase, householdId, conn);
  if (!token) return { pushed: 0 };

  const { data: locals } = await supabase
    .from("events")
    .select("id, title, starts_at, ends_at, all_day, location")
    .eq("household_id", householdId)
    .is("google_event_id", null)
    .is("deleted_at", null)
    .limit(100);

  let pushed = 0;
  for (const e of locals ?? []) {
    const res = await gcal(token, `${encodeURIComponent(conn.calendar_id)}/events`, {
      method: "POST",
      body: JSON.stringify(harborToGoogle(e as HarborEvent)),
    });
    if (!res.ok) continue;
    const created = (await res.json()) as { id?: string };
    if (created.id) {
      await supabase.from("events").update({ google_event_id: created.id }).eq("id", (e as { id: string }).id);
      pushed++;
    }
  }
  return { pushed };
}

/** Delete a Harbor-linked event from Google (best-effort, called on delete). */
export async function deleteGoogleEvent(supabase: Sb, householdId: string, googleEventId: string): Promise<void> {
  const conn = await getConnection(supabase, householdId);
  if (!conn) return;
  const token = await validToken(supabase, householdId, conn);
  if (!token) return;
  await gcal(token, `${encodeURIComponent(conn.calendar_id)}/events/${encodeURIComponent(googleEventId)}`, {
    method: "DELETE",
  }).catch(() => {});
}

/** Full two-way sync: push local-only events up, then pull Google changes down. */
export async function syncGoogle(supabase: Sb, householdId: string): Promise<{ pushed: number; pulled: number }> {
  const push = await pushToGoogle(supabase, householdId);
  const pull = await pullFromGoogle(supabase, householdId);
  return { pushed: push.pushed, pulled: pull.pulled };
}
