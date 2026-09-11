/* Parikrama Path — offline cache.
   Bump CACHE when any asset changes; old caches are purged on activate. */
const CACHE = "parikrama-v19";
const ASSETS = [
  "./", "index.html",
  "app/tokens.css", "app/layout.css", "app/components.css", "app/app.js", "app/trends.js", "app/logo.js", "app/mapkit.js", "app/credits.js", "app/rounds.js",
  "data/geo.js", "data/places.js", "data/history.js", "data/topics.js", "data/rivers.js", "data/features.js", "data/quiz.js", "data/pyq.js",
  "icon.svg", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png", "manifest.webmanifest",
  "img/pass.webp", "img/lake.webp", "img/glacier.webp", "img/peak.webp", "img/river.webp", "img/state.webp", "img/district.webp", "img/topic.webp", "img/event.webp"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);
  if(url.origin !== location.origin) return;           // let fonts hit the network
  e.respondWith(
    caches.match(req, {ignoreSearch:true}).then(hit => hit ||
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{});
        return res;
      }).catch(() => caches.match("index.html")))
  );
});
