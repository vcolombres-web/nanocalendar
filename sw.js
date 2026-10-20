const CACHE = "nanocalendar-v3";
const APP_FILES = ["./", "./index.html", "./manifest.json", "./icon.svg", "./sw.js", "./auth.js"];
self.addEventListener("install", event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_FILES))); self.skipWaiting(); });
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))); self.clients.claim(); });
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  const isAppPage = event.request.mode === "navigate" || new URL(event.request.url).pathname.endsWith("/index.html");
  if (isAppPage) {
    event.respondWith(fetch(event.request).then(async response => {
      if (!response || !response.ok) return response;
      let text=await response.text();
      const inject='<script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js"></script><script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js"></script><script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js"></script><script src="./auth.js"></script>';
      text=text.replace('</head>',inject+'</head>');
      const out=new Response(text,{status:response.status,statusText:response.statusText,headers:response.headers});
      const copy=out.clone(); caches.open(CACHE).then(cache=>cache.put(event.request,copy)); return out;
    }).catch(() => caches.match(event.request).then(cached => cached || caches.match("./index.html"))));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => { if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));} return response; }).catch(() => caches.match("./index.html"))));
});
