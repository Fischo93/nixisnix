/* NIXisNIX — Service Worker
   Legt die Seite beim ersten Besuch ab, damit sie danach auch ohne
   Internet startet. Beim Aktualisieren gewinnt immer die neue Fassung:
   Die Seite selbst wird zuerst aus dem Netz geholt und nur bei Ausfall
   aus dem Speicher bedient. */
const CACHE = 'nixisnix-v1';
const ASSETS = ['./', './index.html', './manifest.webmanifest',
                './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== location.origin) return;

  // Seite: erst Netz (damit Änderungen ankommen), sonst Speicher
  if(req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')){
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }
  // Bilder & Co.: erst Speicher, sonst Netz
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }).catch(() => hit))
  );
});
