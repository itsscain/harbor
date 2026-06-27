import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Real-Time §3.3 — the client Router Cache is the main reason a parent navigates
    // back to a section and sees their own change stale. Dynamic routes must never be
    // reused from the client cache on navigation; static routes can hold briefly.
    // (Server-Action revalidation already clears the cache after a mutation; this makes
    // plain navigation honest too.)
    staleTimes: { dynamic: 0, static: 180 },
  },
};

export default nextConfig;
