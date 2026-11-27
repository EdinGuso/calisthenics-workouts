/* workouts service worker.
   Cache first so the app opens instantly with no signal, then refresh in the
   background so an update you push lands on the next launch. Your training
   data lives in localStorage and is never touched by any of this. */

const CACHE = "workouts-v3";
const FILES = [
  "./",
  "./index.html",
  "./css/app.css",
  "./js/main.js",
  "./js/config.js",
  "./js/store.js",
  "./js/weeks.js",
  "./js/targets.js",
  "./js/milestones.js",
  "./js/chart.js",
  "./js/audio.js",
  "./js/ui.js",
  "./js/player.js",
  "./js/settings.js",
  "./fonts/geist-400.woff2",
  "./fonts/geist-500.woff2",
  "./fonts/geist-600.woff2",
  "./fonts/geist-mono-400.woff2",
  "./fonts/geist-mono-500.woff2",
  "./manifest.webmanifest",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(hit => {
      const live = fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || live;
    })
  );
});
