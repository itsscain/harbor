// Harbor parent-app service worker — PUSH ONLY, scoped to /app.
// It never caches or intercepts requests (that's the kiosk SW's job) and it exists ONLY for the
// parent notification system. It can never render on the kiosk or Lantern: those are separate PWAs
// with their own scopes, and this worker is registered with { scope: '/app' } (see RegisterSWApp).

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_e) {
    data = { title: "Harbor", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Harbor";
  const options = {
    body: data.body || "",
    icon: "/icons/icon.svg",
    badge: "/icons/icon.svg",
    // Group by category + child so multiples collapse into one instead of stacking.
    tag: data.tag || undefined,
    renotify: !!data.tag,
    data: { route: data.route || "/app", id: data.id || null },
    // Tier 1 ("your child needs you") stays on screen until acknowledged.
    requireInteraction: data.tier === 1,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const route = (event.notification.data && event.notification.data.route) || "/app";
  const target = new URL(route, self.location.origin).href;
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        if (client.url.includes("/app")) {
          try {
            await client.focus();
            if ("navigate" in client) await client.navigate(target);
          } catch (_e) {
            /* focus/navigate can reject if the client is gone — fall through to openWindow */
          }
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});

// If the browser rotates the subscription, tell any open /app tab to re-subscribe + re-register.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) client.postMessage({ type: "harbor-resubscribe" });
    })(),
  );
});
