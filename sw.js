const CACHE = "nanocalendar-v6";
const APP_FILES = ["./", "./index.html", "./manifest.json", "./icon.svg", "./sw.js", "./auth.js"];

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
        const sync = '<script>window.addEventListener("load",function(){try{if(window.firebase&&firebase.apps.length){firebase.auth().onAuthStateChanged(async function(u){if(!u)return;try{var db=firebase.firestore(),q=await db.collection("publicReservations").get(),k="agenda-entrenos-v1",raw=localStorage.getItem(k),d=raw?JSON.parse(raw):null;if(!d)return;d.clientes=Array.isArray(d.clientes)?d.clientes:[];d.turnos=Array.isArray(d.turnos)?d.turnos:[];d.servicios=Array.isArray(d.servicios)?d.servicios:[];var s=d.servicios.find(function(x){return x.id==="sv3"});if(!s){s={id:"sv3",nombre:"Grupal",min:60,c:2};d.servicios.push(s)}var changed=false;q.docs.forEach(function(doc){var r=Object.assign({id:doc.id},doc.data());if(!r.date||!r.time||!r.name||d.turnos.some(function(t){return t.reservaPublicaId===r.id}))return;var cid="pub-"+r.id;if(!d.clientes.some(function(c){return c.id===cid}))d.clientes.push({id:cid,nombre:r.name,tel:r.phone||"",pack:0,packDesde:r.date,notas:"Reserva realizada desde NanoCalendar público.",alta:r.date});d.turnos.push({id:"pubturn-"+r.id,clienteId:cid,servicioId:s.id,fecha:r.date,hora:r.time,min:s.min||60,lugar:"Gimnasio",estado:"confirmado",notas:"Reserva pública",serie:"",reservaPublicaId:r.id});changed=true});if(changed)localStorage.setItem(k,JSON.stringify(d));}catch(e){console.warn("sync reservas públicas",e)}})}}catch(e){console.warn(e)}});</script>';
        const inject = '<script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js"></script><script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js"></script><script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js"></script>' + sync + '<script src="./auth.js?v=6"></script>';
        if (!text.includes('auth.js')) text = text.replace('</head>', inject + '</head>');
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
