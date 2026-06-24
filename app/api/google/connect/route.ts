import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { buildAuthUrl, isGoogleConfigured } from "@/lib/google/oauth";

// Kicks off Google OAuth: sets a CSRF state cookie, then redirects to consent.
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  if (!isGoogleConfigured()) {
    return NextResponse.redirect(new URL("/app/settings?google=unconfigured", origin));
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", origin));

  const state = crypto.randomUUID();
  const jar = await cookies();
  jar.set("g_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 1800,
    path: "/",
  });
  return NextResponse.redirect(buildAuthUrl(state));
}
