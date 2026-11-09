// Offline support: the page is fetched fresh when online (so a new release shows at once) and from the cache when offline;
// every other file is versioned (?v=...) and served from the cache after the first visit.
// a new CACHE name clears everything stored by the previous one (needed when an unversioned file such as the icon changes)
const CACHE = "dsg-v2";
const CORE = ["./", "index.html", "img/tg-control.png"];

self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const same = url.origin === location.origin, fonts = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!same && !fonts) return;
  if (req.mode === "navigate") {
    // "no-cache": always ask the server (GitHub Pages lets browsers keep the page 10 minutes), so a release shows at once
    e.respondWith(fetch(req.url, { cache: "no-cache", credentials: "same-origin" }).then(r => { const c = r.clone(); caches.open(CACHE).then(k => k.put("index.html", c)); return r; })
      .catch(() => caches.match("index.html")));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok || r.type === "opaque") {
      const c = r.clone();
      caches.open(CACHE).then(async k => {
        // drop older versions of the same file
        if (same && url.search) for (const old of await k.keys()) { const o = new URL(old.url); if (o.pathname === url.pathname && o.search !== url.search) k.delete(old); }
        k.put(req, c);
      });
    }
    return r;
  })));
});
