"use client";

import { createClient } from "@/lib/supabase/client";
import { env } from "@/lib/env";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

// One shared realtime client (one WebSocket) for the whole tab — never a connection
// per entity (Real-Time §4.5). Channels are joined on top of it.
let _client: SupabaseClient | null = null;
function rtClient(): SupabaseClient {
  if (!_client) _client = createClient() as unknown as SupabaseClient;
  return _client;
}

/** A nudge payload (data-free apart from a server timestamp for freshness measurement). */
export type NudgePayload = { t?: string; tbl?: string; at?: number };

/** Subscribe to a household's nudge topic (Real-Time §4.2). The topic is PRIVATE —
 *  Supabase DB-broadcast only fans out over the authorized path — gated by the
 *  realtime.messages RLS policy (migration 0046). Receipt is authorized with the
 *  parent's session JWT, or (on the kid wall, no login) the anon key. The nudge is
 *  data-free; `onChange` fires on each one (with the payload, for §8 freshness timing)
 *  and the caller debounces + delta-pulls. `onStatus` surfaces the channel connection
 *  state (SUBSCRIBED / CHANNEL_ERROR / TIMED_OUT / CLOSED) for the sync-health panel.
 *
 *  Returns a cleanup that removes the channel — ALWAYS call it on unmount; leaked
 *  channels are the #1 realtime failure (§4.5). */
export function subscribeHousehold(
  householdId: string,
  onChange: (payload?: NudgePayload) => void,
  onStatus?: (status: string) => void,
): () => void {
  if (!householdId || typeof window === "undefined") return () => {};
  const supabase = rtClient();
  let channel: RealtimeChannel | null = null;
  let cancelled = false;

  void (async () => {
    // Authorize the socket: a logged-in parent uses their session token; the wall has
    // no session, so it falls back to the anon key (RLS still scopes receipt to hh:*).
    let token = env.supabaseAnonKey;
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) token = data.session.access_token;
    } catch {
      /* no session — use anon key */
    }
    if (cancelled) return;
    await supabase.realtime.setAuth(token);
    if (cancelled) return;
    channel = supabase
      .channel(`hh:${householdId}`, { config: { private: true } })
      .on("broadcast", { event: "changed" }, (msg) => onChange(msg.payload as NudgePayload))
      .subscribe((status) => onStatus?.(status));
  })();

  return () => {
    cancelled = true;
    if (channel) {
      try {
        void supabase.removeChannel(channel);
      } catch {
        /* ignore */
      }
    }
  };
}
