/*
 * GLIDE — service worker minimale.
 * Scopo Sprint 0: rendere la PWA installabile (serve un fetch handler).
 * Strategia: network-first con fallback alla cache dell'app shell.
 * Nessun caching aggressivo: le funzioni offline arriveranno dopo.
 */
const CACHE = "glide-v1";
const APP_SHELL = ["/login"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Solo GET same-origin; le API restano sempre live.
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        return res;
      })
      .catch(() =>
        caches.match(request).then((r) => r || caches.match("/login")),
      ),
  );
});
