/* Service worker — Triage REB (CHU de La Réunion)
   Cache "shell" pour fonctionnement hors-ligne une fois l'app installée.
   Les données de zones (.json) sont en "réseau d'abord" pour toujours
   récupérer la dernière mise à jour, avec repli sur le cache hors-ligne. */
const CACHE = 'triage-reb-v2';
const CORE = [
  './',
  './index.html',
  './support.js',
  './manifest.webmanifest',
  './assets/logo_horizontal.png',
  './assets/logo_mark.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(
    CORE.map((u) => c.add(u).catch(() => null))
  )));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const isJson = req.url.split('?')[0].endsWith('.json');

  // Données de zones : réseau d'abord, repli cache si hors-ligne.
  if (isJson) {
    e.respondWith(
      fetch(req).then((res) => {
        try {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
        } catch (_) {}
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Reste (coquille app) : cache d'abord.
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      try {
        const url = new URL(req.url);
        if (url.origin === self.location.origin && res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
      } catch (_) {}
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
