/**
 * Minimal PWA service worker — install-focused with an offline fallback page.
 * We deliberately avoid aggressive caching so Next.js revalidation stays
 * authoritative (standard #1: saves + fresh data must never be masked by a
 * stale SW cache). The ONLY thing cached is the offline fallback shell.
 */

const CACHE = "agon-shell-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
    })(),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Only handle top-level navigations; everything else goes to the network
  // untouched (standard #1: no fake data from stale caches).
  if (req.mode !== "navigate") return;
  event.respondWith(
    (async () => {
      try {
        return await fetch(req);
      } catch {
        const cache = await caches.open(CACHE);
        const fallback = await cache.match(OFFLINE_URL);
        return fallback ?? new Response("Offline", { status: 503 });
      }
    })(),
  );
});
