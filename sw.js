// Eenvoudige service worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Geen fetch-handler: browser haalt altijd de nieuwste versie van de site op
