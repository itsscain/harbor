---
name: harbor-notifications
description: Parent /app web-push notification system — /app-only, VAPID web push + in-app center + badge, Tier-1 distress wired.
metadata:
  type: project
---

Spec: `C:\Users\tj.pendarvis\Downloads\HARBOR_PUSH_NOTIFICATIONS.md`. Parent-app notifications — calm,
high-signal, **`/app`-only** (never kiosk/Lantern). User steer (2026-07-02): "just need notifications to
pop up (PWA on iOS is set up) — email/sms couldn't hurt but don't stress it, notifications should be fine."
So: shipped **web push + the in-app center + badge + Tier-1 distress**; email/SMS **not** built (the in-app
center is the durable fallback; add resend/twilio later).

**SHIPPED (migration 0066 + web-push):**
- **Data model (0066):** `push_subscriptions` (parent_id→profiles, household_id, endpoint, p256dh, auth,
  active; unique(parent_id,endpoint)), `notifications` (the in-app record: parent_id, child_id, tier,
  category, title, body, route, detail_level, status unread|read), `notification_preferences`
  (parent_id PK, prefs jsonb). All RLS `(select auth.uid()) = parent_id or is_admin()` — parent reads/writes
  own; the SERVER writes via the service role (admin, bypasses RLS). Advisors clean (policies present).
- **Backend (`lib/notifications/`):** `webpush.ts` (VAPID-signed send; **guarded by `isPushConfigured()`**
  in lib/env.ts — runs keyless, sends become no-ops; detects dead subs 404/410). `prefs.ts`
  (isomorphic types + DEFAULT_PREFS + `mergePrefs` + `withinQuietHours`[overnight-aware] + `decide()` →
  skip/record/push; Tier-1 always pushes unless quiet-hours allowCritical off). `dispatch.ts` — **`notify()`**
  the brain: resolve household parents (owner + household_members.profile_id), per-parent honor prefs +
  quiet hours, ALWAYS write the in-app record, push to active subs, prune dead subs. Uses admin client;
  **never throws** (a notify failure must not break its trigger). `client.ts` (browser: enablePush/disablePush,
  isIOS/isStandalone, `applicationServerKey` needs `as BufferSource` cast for TS lib).
- **Service worker `/app`-only:** `public/sw-app.js` (PUSH ONLY — no caching) registered by
  `components/app/RegisterSWApp.tsx` with **`{scope:'/app'}`**, mounted ONLY in `app/app/(parent)/layout.tsx`.
  **STRUCTURAL /app-only guarantee (§6/§13):** the kiosk SW `public/sw.js` has NO push/notificationclick
  handlers; kiosk RegisterSW is only in app/kiosk + app/lantern layouts; kiosk/Lantern auth by device_secret
  and never create a push_subscription → can't be in the recipient set. Verify before changing: `grep push public/sw.js`.
- **UI:** `NotificationsCard` (Settings → Notifications disclosure): enable/disable push + iOS "Add to Home
  Screen" hint + **"Send a test notification"** (the thing that lets you verify push end-to-end) + category
  toggles + quiet hours + lock-screen detail level. Center: `app/app/(parent)/notifications/page.tsx` + a
  `NotificationBell` (mobile header + rail item) with unread badge + `BadgeSync` (setAppBadge). Actions in
  `app/app/(parent)/notification-actions.ts` (register/unregister/prefs/markRead/markAllRead/sendTest).
- **Events wired:** **Tier-1 distress** in `app/api/ai/voice/route.ts` (on the distress branch → `notify({
  category:'distress', ... route:/app/children/[id]})`). More events (approvals, celebrations, digests) are
  trivial to add via `notify()` — approvals have **no clean server signal yet** (the kiosk gates
  requires_approval locally; there's no pending-approval table), so that's a future add.

**ENV (must set in Vercel Production for push to actually send):** `NEXT_PUBLIC_VAPID_PUBLIC_KEY`,
`VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (mailto:). Generated locally into `.env.local` (gitignored); there is
**no Vercel env-set MCP tool**, so the USER must add them in Vercel + redeploy. Without them the app still
runs — notifications degrade to the in-app center + badge (no push).

Related: [[harbor-ai-voice]] (the distress trigger), [[harbor-lantern]], [[harbor-device-mgmt]], [[harbor-project]].
