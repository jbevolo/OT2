/**
 * @file sw.js
 * @description Service Worker para la PWA "Gestión de Taller OT".
 * Maneja el cache de assets estáticos para funcionamiento offline.
 * @version 1.3
 */

/** @type {string} Nombre del cache actual */
const CACHE_NAME = 'taller-ot-v4';

/** @type {string[]} Assets locales a precachear para uso offline */
const ASSETS = [
  'index.html',
  'dashboard.html',
  'manifest.json',
  'css/styles.css',
  'js/main.js',
  'js/dashboard.js',
  'js/config.js',
  'js/supabase.js',
  'js/dom.js',
  'js/state.js',
  'js/notify.js',
  'js/auth.js',
  'js/orders.js',
  'js/photos.js',
  'js/share.js',
  'js/publicView.js',
  'js/print.js',
  'js/backup.js'
];

/**
 * Evento 'install' - Se ejecuta cuando el SW se instala por primera vez.
 * Precachea los assets locales tolerando fallos por asset (los CDN se cachean
 * al vuelo en el fetch). Finaliza con skipWaiting para activar de inmediato.
 * @param {ExtendableEvent} e - Evento de instalación
 */
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(ASSETS.map((url) => cache.add(url)))
    ).then(() => self.skipWaiting())
  );
});

/**
 * Evento 'activate' - Borra caches viejos de versiones anteriores.
 * Solo se conserva el cache con el nombre actual (CACHE_NAME).
 * @param {ExtendableEvent} e - Evento de activación
 */
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

/**
 * Evento 'fetch' - Intercepta las peticiones.
 * Estrategia: Cache-First (cache primero, fallback a red).
 * Solo se cachean respuestas GET exitosas (200) al vuelo, para que los CDN
 * (Tailwind, Supabase) queden offline tras la primera carga. Los POST de
 * Supabase (auth/RPC) nunca se cachean.
 * @param {FetchEvent} e - Evento de petición HTTP
 */
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return res;
      });
    })
  );
});