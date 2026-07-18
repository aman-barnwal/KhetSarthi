/* KhetSarthi service worker — offline shell + stale-while-revalidate for safe public data */
const SHELL_CACHE = "ks-shell-v1";
const DATA_CACHE = "ks-data-v1";
const SHELL_ASSETS = ["/", "/logo.png", "/favicon.png", "/logo192.png", "/manifest.json"];
const CACHEABLE_API = ["/api/schemes", "/api/faqs", "/api/commodities", "/api/managed-prices"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => ![SHELL_CACHE, DATA_CACHE].includes(k)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;

  // Never cache auth or private user data
  if (url.pathname.startsWith("/api/")) {
    if (CACHEABLE_API.some((p) => url.pathname.startsWith(p))) {
      e.respondWith(
        caches.open(DATA_CACHE).then(async (cache) => {
          const cached = await cache.match(e.request);
          const network = fetch(e.request).then((res) => {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          }).catch(() => cached);
          return cached || network;
        })
      );
    }
    return;
  }

  // Static assets & fonts: cache-first
  if (url.origin === self.location.origin && (url.pathname.startsWith("/static/") || SHELL_ASSETS.includes(url.pathname))) {
    e.respondWith(
      caches.open(SHELL_CACHE).then(async (cache) => {
        const cached = await cache.match(e.request);
        if (cached) return cached;
        const res = await fetch(e.request);
        if (res.ok) cache.put(e.request, res.clone());
        return res;
      })
    );
    return;
  }

  // Navigations: network-first with cached shell fallback
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).then((res) => {
        caches.open(SHELL_CACHE).then((c) => c.put("/", res.clone()));
        return res;
      }).catch(() => caches.match("/"))
    );
  }
});
