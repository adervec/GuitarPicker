// Service worker: network-first with cache fallback, so the installed app
// keeps working offline but always picks up fresh files when online.
// ponytail: no versioned precache manifest — runtime caching covers every
// file the app actually loads; add a build-time precache list only if a
// true first-load-offline guarantee is ever needed.
const CACHE = "guitarpicker-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
