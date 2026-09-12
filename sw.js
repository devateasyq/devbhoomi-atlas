/* Parikrama Path — offline cache.
   Bump CACHE when any asset changes; old caches are purged on activate. */
const CACHE = "parikrama-v62";
const ASSETS = [
  "./", "index.html",
  "app/tokens.css", "app/layout.css", "app/components.css", "app/app.js", "app/trends.js", "app/logo.js", "app/mapkit.js", "app/credits.js", "app/rounds.js", "app/sync.js", "app/firebase-config.js", "app/auth.js",
  "data/geo.js", "data/places.js", "data/history.js", "data/topics.js", "data/rivers.js", "data/features.js", "data/quiz.js", "data/pyq.js", "data/economy.js",
  "icon.svg", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png", "manifest.webmanifest",
  "img/chenab.webp", "img/d-lahaul.webp", "img/district.webp", "img/event.webp", "img/glacier.webp", "img/lake.webp", "img/lk-gobindsagar.webp", "img/lk-khajjiar.webp", "img/lk-manimahesh.webp", "img/lk-nako.webp", "img/lk-prashar.webp", "img/lk-renuka.webp", "img/lk-rewalsar.webp", "img/lk-surajtal.webp", "img/pass.webp", "img/peak.webp", "img/pk-chaudhar.webp", "img/pk-hanumantibba.webp", "img/pk-manimaheshkailash.webp", "img/pk-reopurgyil.webp", "img/ps-baralacha.webp", "img/ps-hamta.webp", "img/ps-jalori.webp", "img/ps-rohtang.webp", "img/ps-sach.webp", "img/ps-shipkila.webp", "img/ravi.webp", "img/river.webp", "img/s-sirmaur.webp", "img/state.webp", "img/sutlej.webp", "img/t-monasteries.webp", "img/topic.webp", "img/yamuna.webp"
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
      }).catch(() => {
        // The index.html fallback is only correct for a page navigation.
        // Any other failed same-origin GET (a script — e.g. the Firebase
        // SDK loaded on demand — a stylesheet, an image) must propagate
        // its failure rather than resolve to an HTML document standing
        // in for the asset that was actually requested.
        if(req.mode === "navigate") return caches.match("index.html");
        throw new Error("offline");
      }))
  );
});
