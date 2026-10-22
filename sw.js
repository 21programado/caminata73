const CACHE_NAME = 'ruteador-peatonal-v3';   // súbelo cada vez que cambies CSV o manifest
const assetsToCache = [
  './',
  './index.html',
  './manifest.json',
  './direcciones_parte1.csv',
  './direcciones_parte2.csv'
];

// Instalación: cada archivo se pide por separado y saltándose la caché HTTP.
// Si alguno falta (404), ya no se cae toda la instalación.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(
        assetsToCache.map(url => cache.add(new Request(url, { cache: 'reload' })))
      ))
      .then(() => self.skipWaiting())
  );
});

// Activación: borra cachés viejas y toma control de inmediato
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const guardar = (req, res) => {
  if (res.ok) {
    const copia = res.clone();
    caches.open(CACHE_NAME).then(c => c.put(req, copia));
  }
  return res;
};

self.addEventListener('fetch', event => {
  const req = event.request;
  // Mapas, rutas y CDNs (otros dominios) van directo a la red
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  if (req.mode === 'navigate' || req.destination === 'document') {
    // HTML: red primero (siempre la versión nueva), caché solo sin conexión
    event.respondWith(
      fetch(req).then(res => guardar(req, res))
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
  } else {
    // CSV, manifest, íconos: caché primero (son pesados)
    event.respondWith(
      caches.match(req).then(r => r || fetch(req).then(res => guardar(req, res)))
    );
  }
});
