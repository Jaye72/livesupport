/**
 * Minimal service worker: makes the app installable and loads the shell
 * offline. It deliberately does NOT cache the WebSocket stream — that is
 * always live. Only the static files (html/js/manifest/icons) are cached.
 */
const CACHE = "live-session-shell-v8"; // bumped so phones drop the old cached UI
const SHELL = [
  "./index.html",
  "./app.js",
  "./fonts/inter-latin.woff2",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // never touch websocket or cross-origin (relay) traffic
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request))
  );
});
