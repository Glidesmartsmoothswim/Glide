/*
 * GLIDE — service worker.
 * Strategia: network-first con fallback alla cache; pagina /offline per le
 * navigazioni quando si è senza rete. Caching prudente dell'app shell.
 */
const CACHE = "glide-v2";
const APP_SHELL = [
  "/login",
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

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
  // Solo GET same-origin; le API/mutazioni restano sempre live.
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api")) return;

  const isNavigation = request.mode === "navigate";

  event.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        // Navigazione offline → pagina dedicata; altrimenti login.
        return (
          (await caches.match(isNavigation ? "/offline" : "/login")) ||
          new Response("Offline", { status: 503 })
        );
      }),
  );
});
