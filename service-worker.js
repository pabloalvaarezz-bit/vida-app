// VIDA/OS — service worker: cachea el shell de la app para uso offline.
const CACHE_NAME = "vidaos-cache-v4";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/tokens.css",
  "./css/layout.css",
  "./css/calendar.css",
  "./js/app.js",
  "./js/storage.js",
  "./js/dates.js",
  "./js/dom.js",
  "./js/scoring.js",
  "./js/charts.js",
  "./js/modules/dashboard.js",
  "./js/modules/habits.js",
  "./js/modules/workouts.js",
  "./js/modules/health.js",
  "./js/modules/study.js",
  "./js/modules/finance.js",
  "./js/modules/calendar.js",
  "./js/modules/settings.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
