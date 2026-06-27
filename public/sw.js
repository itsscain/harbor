/* Harbor Kiosk service worker — precache the shell, runtime-cache assets, and
   guarantee the wall boots fully offline. Supabase (cross-origin) requests are
   left untouched; the kiosk's sync layer handles being offline gracefully. */
const CACHE = "harbor-kiosk-v6";
const PRECACHE = [
  "/kiosk",
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-maskable.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

// The page, once loaded online, tells us exactly which /_next/static chunks it
// used so we can cache them — guaranteeing a later cold offline boot has its JS.
self.addEventListener("message", (event) => {
  const data = event.data;
  if (data && data.type === "CACHE_ASSETS" && Array.isArray(data.urls)) {
    event.waitUntil(
      caches.open(CACHE).then((cache) =>
        Promise.all(
          data.urls.map((u) =>
            cache.match(u).then((hit) => (hit ? null : cache.add(u).catch(() => null))),
          ),
        ),
      ),
    );
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // don't intercept Supabase, etc.

  // App navigations: network-first, fall back to the cached kiosk shell.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put("/kiosk", copy));
          }
          return res;
        })
        .catch(async () => (await caches.match("/kiosk")) || Response.error()),
    );
    return;
  }

  // Static assets (incl. /_next/static): stale-while-revalidate, cache only OK.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
