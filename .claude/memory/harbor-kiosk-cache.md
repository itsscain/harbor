---
name: harbor-kiosk-cache
description: Kiosk stale-build fix — self-updating SW + the Vercel auth-wall gotcha that strands the tablet.
metadata:
  type: project
  originSessionId: 3cd03412-7647-4c62-ade9-5099b108cba8
---

Spec `HARBOR_SAFARI_CACHE_FIX.md` (Downloads). Symptom (2026-06-28): the wall tablet was "all
messed up" while localhost was great — classic stale-build + a worse root cause.

**ROOT CAUSE #1 (the big one — NOT code): Vercel Deployment Protection is ON for production.**
`https://harbor-cainssh.vercel.app` (the only prod URL — no custom domain serves Harbor;
`dadhq.net`/`geomedsdvo.com` exist on the account but don't point at it) **302-redirects every
request — the kiosk page AND `/sw.js` — to `vercel.com/sso-api` → a login wall.** A public wall
tablet (kids never log in) can't authenticate, so it can't load fresh assets or update its SW →
stale/broken. **FIX (user must do it in the Vercel dashboard — it's a security/account setting I
must not change autonomously): Project `harbor` → Settings → Deployment Protection → set Vercel
Authentication to OFF for Production (or "Only Preview Deployments"), or attach a public custom
domain.** Verify with `curl -sI https://harbor-cainssh.vercel.app/kiosk` → expect 200, not 302→sso.

**ROOT CAUSE #2 (code — fixed): the SW couldn't self-update on a never-closing kiosk tab.** Even
though `RegisterSW` already polled `reg.update()` + reloaded on `controllerchange`, Safari/iOS
serves a cached `/sw.js`, so update() never saw a new worker. Shipped (Safari-Cache-Fix §4):
- `next.config.ts`: `env.NEXT_PUBLIC_BUILD_ID = VERCEL_GIT_COMMIT_SHA || Date.now()`, and a
  `headers()` rule serving `/sw.js` with `Cache-Control: no-cache,no-store,must-revalidate`.
- `RegisterSW.tsx`: registers `/sw.js?v=${NEXT_PUBLIC_BUILD_ID}` — a changing URL each deploy
  forces Safari to fetch+install the new worker even on a tab that never closes.
- `public/sw.js`: self-versions its cache from the `?v` query (`const BUILD = new URL(
  self.location.href).searchParams.get("v"); CACHE = "harbor-kiosk-"+BUILD`) → old caches purge on
  activate; skips `/api/*` (never cache dynamic data, §4.6); and the network-first nav handler now
  **refuses to cache an off-origin redirect** (so an auth/login wall can't poison the shell).
  (`sw.js` already had `skipWaiting` + `clients.claim`.) No more manual CACHE bumping needed.

**BOOTSTRAP TRAP:** a device already on a stale SW won't pick up the new logic on its own → needs
ONE manual clear. Easiest in-app: Parent menu → Debug tools → **"Clear everything & restart"**
(`VoiceDebug`, already exists — unregisters SWs + clears all caches + reloads, keeps pairing/PIN/
progress). Or iOS: Settings→Safari→Advanced→Website Data→Remove for the URL, or delete+re-add the
home-screen PWA. After that, deploys self-update forever. On-device build is confirmable via the
Debug "Build vNN" stamp (now `v12 · self-updating wall`). Harbor prefers Android tablets for kiosks
anyway (haptics + predictable SW/storage). Related: [[harbor-project]], [[harbor-realtime]],
[[harbor-voice-tts]].
