const CACHE = "nanocalendar-v10";
const APP_FILES = ["./", "./index.html", "./manifest.json", "./icon.svg", "./icon-192.svg", "./icon-512.svg", "./sw.js", "./auth.js", "./sync-public.js"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;

  const url = new URL(event.request.url);
  const isPublicPage = url.pathname.endsWith("/public-reservas.html") || url.pathname.endsWith("/reservas-admin.html");
  const isAppPage = !isPublicPage && (event.request.mode === "navigate" || url.pathname.endsWith("/index.html"));

  if (isAppPage) {
    event.respondWith(
      fetch(event.request).then(async response => {
        if (!response || !response.ok) return response;
        let text = await response.text();
        const inject = '<script src="./auth.js?v=10"></script><script src="./sync-public.js?v=10"></script>';
        if (!text.includes('auth.js')) text = text.replace('</head>', inject + '</head>');
        else if (!text.includes('sync-public.js')) text = text.replace('</head>', '<script src="./sync-public.js?v=10"></script></head>');
        return new Response(text, {status: response.status, statusText: response.statusText, headers: response.headers});
      }).catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
      }
      return response;
    }).catch(() => caches.match("./index.html")))
  );
});
