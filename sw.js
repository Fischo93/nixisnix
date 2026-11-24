/* NIXisNIX — Service Worker
   Legt die Seite beim ersten Besuch ab, damit sie danach auch ohne
   Internet startet. Beim Aktualisieren gewinnt immer die neue Fassung:
   Die Seite selbst wird zuerst aus dem Netz geholt und nur bei Ausfall
   aus dem Speicher bedient. */
const CACHE = 'nixisnix-v5';

/* Ohne diese Dateien startet das Spiel nicht. */
const CORE = ['./', './index.html', './manifest.webmanifest'];

/* Nützlich, aber nicht lebenswichtig: Symbole und die Bilder der
   Schätzfragen. Diese werden einzeln abgelegt — fehlt eine Datei auf
   dem Server, darf das nicht den ganzen Offline-Betrieb lahmlegen.
   (cache.addAll() bricht bei der kleinsten Lücke komplett ab.) */
const EXTRA = [
  './icon-192.png', './icon-512.png', './icon-maskable-512.png',
  './bilder/schaetz-kirschen.jpg', './bilder/schaetz-flaschen.jpg',
  './bilder/schaetz-ballons.jpg',  './bilder/schaetz-hoelzer.jpg',
  './bilder/schaetz-menge.jpg',    './bilder/schaetz-groesse.jpg',
  './bilder/kobold1.webp', './bilder/kobold2.webp', './bilder/kobold3.webp',
  './bilder/kobold4.webp', './bilder/kobold5.webp', './bilder/kobold6.webp',
  './bilder/kobold7.webp',
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE);                       // Pflicht
    await Promise.all(EXTRA.map(u => cache.add(u).catch(() => {})));  // Kür
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch(e){ return; }
  if(url.origin !== self.location.origin) return;

  // Die Seite selbst: erst das Netz, damit Aktualisierungen sofort ankommen
  if(req.mode === 'navigate'){
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch(err){
        return (await caches.match('./index.html'))
            || (await caches.match('./'))
            || new Response('Offline und nichts gespeichert.', { status: 503 });
      }
    })());
    return;
  }

  // Alles andere: erst der Speicher, sonst das Netz — und dann ablegen,
  // damit später ergänzte Bilder beim nächsten Mal offline da sind.
  event.respondWith((async () => {
    const hit = await caches.match(req);
    if(hit) return hit;
    try {
      const res = await fetch(req);
      if(res && res.ok && res.type === 'basic'){
        const cache = await caches.open(CACHE);
        cache.put(req, res.clone());
      }
      return res;
    } catch(err){
      return new Response('', { status: 504 });
    }
  })());
});
