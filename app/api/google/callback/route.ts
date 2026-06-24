import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { exchangeCodeForTokens, fetchGoogleEmail } from "@/lib/google/oauth";
import { syncGoogle } from "@/lib/google/sync";

// Google redirects here with ?code&state. Verify CSRF, exchange for tokens, store
// them server-side (never to the wall), then kick off an initial two-way sync.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const back = (status: string) => NextResponse.redirect(new URL(`/app/settings?google=${status}`, origin));

  // The user declined the consent screen.
  if (url.searchParams.get("error") === "access_denied") return back("denied");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const saved = jar.get("g_oauth_state")?.value;
  jar.delete("g_oauth_state");
  if (!code || !state || !saved || state !== saved) return back("error");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", origin));
  const household = await getMyHousehold();
  if (!household) return back("error");

  try {
    const tokens = await exchangeCodeForTokens(code);
    const email = await fetchGoogleEmail(tokens.access_token);
    const expiry = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString();
    // Google only returns refresh_token on first consent — don't clobber a stored one.
    const { error } = await supabase.from("google_calendar").upsert(
      {
        household_id: household.id,
        access_token: tokens.access_token,
        token_expiry: expiry,
        connected_email: email,
        calendar_id: "primary",
        ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
      },
      { onConflict: "household_id" },
    );
    if (error) return back("error");
    try {
      await syncGoogle(supabase, household.id);
    } catch {
      /* initial sync is best-effort; the connection still succeeded */
    }
    return back("connected");
  } catch {
    return back("error");
  }
}
