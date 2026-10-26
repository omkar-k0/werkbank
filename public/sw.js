// Minimal service worker: makes the app installable and shows an offline
// page when there is no connection. Data is never cached; it lives on the server.
const OFFLINE = "/offline.html";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open("werkbank-v1").then((c) => c.addAll([OFFLINE, "/icon.svg"])));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE)));
});
