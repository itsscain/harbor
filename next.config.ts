import type { NextConfig } from "next";

// A unique id per deploy. On Vercel this is the git commit SHA (stable per deploy, changes
// each deploy); locally it falls back to a build timestamp. The kiosk registers its service
// worker as `/sw.js?v=<BUILD_ID>` so Safari/iOS can never strand a kiosk on a stale build
// (Safari-Cache-Fix §4.4) — a changing URL forces the new worker to install + self-version
// its caches even on a tab that never closes.
const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now());

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
  },
  experimental: {
    // Real-Time §3.3 — the client Router Cache is the main reason a parent navigates
    // back to a section and sees their own change stale. Dynamic routes must never be
    // reused from the client cache on navigation; static routes can hold briefly.
    // (Server-Action revalidation already clears the cache after a mutation; this makes
    // plain navigation honest too.)
    staleTimes: { dynamic: 0, static: 180 },
  },
  async headers() {
    return [
      {
        // The worker script must always be revalidated, so a deploy's new sw.js is fetched
        // immediately instead of served from Safari's HTTP cache (Safari-Cache-Fix §4.4).
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
