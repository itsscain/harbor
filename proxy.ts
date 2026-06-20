import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 "proxy" convention (formerly middleware): runs on every matched
// request to refresh the Supabase session and enforce role-based route access.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets and the kiosk PWA assets.
     * The kiosk (/kiosk) is intentionally NOT gated — it is local-first and
     * must work fully offline, paired by device code rather than a user login.
     */
    "/((?!_next/static|_next/image|favicon.ico|kiosk|manifest.webmanifest|sw.js|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
