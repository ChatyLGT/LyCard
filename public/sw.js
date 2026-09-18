// Service worker escrito a mano — nada de next-pwa (muerto desde 2024,
// solo webpack) ni de @serwist/turbopack (todavía en tag "preview" de npm,
// demasiado nuevo para apostarle a una app que se despliega varias veces
// por día). Estrategia simple y honesta, dos casos:
//
// 1. Assets estáticos de Next (/_next/static/*, /icons/*) — el nombre de
//    archivo ya lleva el hash del build, así que cache-first es siempre
//    seguro: un deploy nuevo genera URLs nuevas, nunca sirve algo viejo.
// 2. Navegación (HTML) — SOLO para rutas públicas de bajo riesgo (la
//    tarjeta pública /c/[slug] y el home). Nunca /admin ni /m/dashboard:
//    son pantallas autenticadas por cookie, y cachear esa HTML podría
//    terminar mostrándole a alguien la sesión vieja de otra persona en el
//    mismo teléfono. Para esas, sin señal simplemente falla como una web
//    normal — es la degradación correcta, no una que invente datos.
const CACHE_VERSION = "lycard-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGES_CACHE = `${CACHE_VERSION}-pages`;
const OFFLINE_URL = "/offline";

function isCacheableNavigation(url) {
  return url.pathname === "/" || url.pathname.startsWith("/c/");
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PAGES_CACHE).then((cache) => cache.add(OFFLINE_URL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (request.mode === "navigate") {
    if (!isCacheableNavigation(url)) return;
    event.respondWith(networkFirst(request, PAGES_CACHE));
  }
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    const offline = await cache.match(OFFLINE_URL);
    if (offline) return offline;
    return Response.error();
  }
}
