// sw.js — cache app shell, maar haal status JSON altijd vers op

const CACHE_NAME = "padel-status-v3";

// Bestanden die “statisch” zijn en je graag cached wil hebben
const APP_SHELL = [
  "./",
  "status.html",
  "outdoor.html",
  "manifest.json",
  "icon-192.png",
  "icon-512.png",
  "sw.js",
];

// Install: cache app shell
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

// Activate: oude caches opruimen
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      ),
    ])
  );
});

// Fetch:
// - status*.json: network-first (altijd proberen vers te halen, fallback cache)
// - rest: cache-first (snel), fallback network
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Alleen eigen origin afhandelen
  if (url.origin !== self.location.origin) return;

  const isStatusJson =
    url.pathname.endsWith("/status.json") ||
    url.pathname.endsWith("/status_outdoor.json");

  if (isStatusJson) {
    event.respondWith(
      fetch(event.request).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return resp;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // App shell: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return resp;
        })
      );
    })
  );
});
