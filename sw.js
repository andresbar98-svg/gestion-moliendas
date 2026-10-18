/* La Molienda – Service Worker genérico. Se crea UNA sola vez; no hay que editarlo al actualizar index.html. */
const CACHE='molienda-pwa';
const SCOPE=self.registration.scope;
const CDN=[
 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js',
 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
 'https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@500;600;700&display=swap'
];
const HOSTS=['www.gstatic.com','fonts.gstatic.com','fonts.googleapis.com','cdnjs.cloudflare.com'];

self.addEventListener('install',e=>{
 e.waitUntil((async()=>{
  const c=await caches.open(CACHE);
  try{const r=await fetch(SCOPE,{cache:'no-cache'});if(r.ok)await c.put(SCOPE,r)}catch(_){}
  await Promise.all(CDN.map(u=>fetch(new Request(u,{mode:'no-cors'})).then(r=>c.put(u,r)).catch(()=>{})));
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',e=>{
 e.waitUntil((async()=>{
  const ks=await caches.keys();
  await Promise.all(ks.filter(k=>k.indexOf('molienda-')===0&&k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
 })());
});

/* Páginas: red primero (máx. 4 s, por si la señal es débil) y, si falla, la copia guardada. */
async function nav(req){
 const c=await caches.open(CACHE);
 const p=fetch(req.url,{cache:'no-cache',credentials:'same-origin'}).then(r=>{if(!r||!r.ok)throw 0;c.put(SCOPE,r.clone());return r});
 try{return await Promise.race([p,new Promise((_,j)=>setTimeout(j,4000))])}
 catch(_){return (await c.match(SCOPE))||Response.error()}
}
/* Recursos estáticos: copia guardada al instante y se refresca en segundo plano. */
async function swr(req){
 const c=await caches.open(CACHE),hit=await c.match(req);
 const net=fetch(req).then(r=>{if(r&&(r.ok||r.type==='opaque'))c.put(req,r.clone());return r}).catch(()=>null);
 return hit||(await net)||Response.error();
}
self.addEventListener('fetch',e=>{
 const r=e.request;if(r.method!=='GET')return;
 const u=new URL(r.url);
 if(r.cache==='no-cache'||r.cache==='reload'||r.cache==='no-store')return;   /* revisiones de versión: directo a la red */
 if(r.mode==='navigate'&&u.origin===location.origin){e.respondWith(nav(r));return}
 if(u.origin===location.origin||HOSTS.indexOf(u.hostname)>-1)e.respondWith(swr(r));
 /* Firestore y demás no se interceptan: Firebase maneja su propio caché offline. */
});
