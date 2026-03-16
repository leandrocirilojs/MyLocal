/* ═══════════════════════════════════════════
   GeoTrack — Service Worker
   Rastreamento em segundo plano
═══════════════════════════════════════════ */

const CACHE_NAME = 'geotrack-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './config.js',
  './manifest.json',
];

// ── Instala e faz cache dos arquivos
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ── Ativa e limpa caches antigos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Serve arquivos do cache (funciona offline)
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// ── Recebe mensagens do app principal
self.addEventListener('message', e => {
  if (e.data.type === 'START_BACKGROUND_TRACKING') {
    startBackgroundTracking(e.data.interval);
  }
  if (e.data.type === 'STOP_BACKGROUND_TRACKING') {
    stopBackgroundTracking();
  }
});

// ── Rastreamento periódico em segundo plano
let trackingInterval = null;

function startBackgroundTracking(intervalMs) {
  if (trackingInterval) clearInterval(trackingInterval);
  trackingInterval = setInterval(() => {
    // Notifica todos os clientes para enviar localização
    self.clients.matchAll().then(clients => {
      clients.forEach(client => client.postMessage({ type: 'REQUEST_LOCATION' }));
    });
  }, intervalMs || 120000); // padrão: 2 minutos
}

function stopBackgroundTracking() {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }
}

// ── Background Sync — envia localização quando reconectar
self.addEventListener('sync', e => {
  if (e.tag === 'sync-location') {
    e.waitUntil(syncPendingLocations());
  }
});

async function syncPendingLocations() {
  // Busca localizações pendentes salvas no IndexedDB
  const cache = await caches.open('geotrack-pending');
  const keys = await cache.keys();
  for (const key of keys) {
    const res = await cache.match(key);
    const data = await res.json();
    try {
      await fetch(data.url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.payload),
      });
      await cache.delete(key);
    } catch (_) {}
  }
}

// ── Push Notification
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'GeoTrack', {
      body: data.body || 'Nova atualização de localização',
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: 'geotrack',
      data: data,
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('./'));
});
