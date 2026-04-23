// Bump CACHE_VERSION to force all clients to drop the old cache and refetch.
const CACHE_VERSION = 'v3';
const CACHE_NAME = `meme-streeps-${CACHE_VERSION}`;

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
];

// ─── Install ─────────────────────────────────────────────────────────────────
// Pre-cache the app shell. skipWaiting forces the new SW to activate immediately
// instead of waiting for all tabs to close.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// ─── Activate ────────────────────────────────────────────────────────────────
// Delete every cache that isn't the current one. This guarantees stale assets
// (like the old fruit-card images) are evicted as soon as the new SW takes over.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// ─── Fetch ───────────────────────────────────────────────────────────────────
// Strategy:
//   - HTML / JS / CSS  → network-first (fall back to cache when offline). This
//     way new app code & image references roll out immediately on next visit.
//   - Images & fonts   → stale-while-revalidate: serve cached for speed, but
//     fetch in the background and update the cache for next time.
//   - Anything else    → network-first.
//
// Crucially, we never serve a cached response for a URL that 404s on the
// server right now — if the network returns a non-OK response, we DON'T fall
// back to a stale cached version (which is what was happening before).
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Skip cross-origin requests entirely (Supabase, Google Fonts API).
  if (url.origin !== self.location.origin) return;

  const dest = req.destination;
  const isImage = dest === 'image' || /\.(png|jpe?g|webp|svg|gif|avif)$/i.test(url.pathname);
  const isFont = dest === 'font' || /\.(woff2?|ttf|otf|eot)$/i.test(url.pathname);
  const isAppShell =
    dest === 'document' ||
    dest === 'script' ||
    dest === 'style' ||
    /\.(html|js|mjs|css)$/i.test(url.pathname);

  if (isAppShell) {
    event.respondWith(networkFirst(req));
  } else if (isImage || isFont) {
    event.respondWith(staleWhileRevalidate(req));
  } else {
    event.respondWith(networkFirst(req));
  }
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(req);
    if (fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    if (req.destination === 'document') {
      const fallback = await cache.match('/index.html');
      if (fallback) return fallback;
    }
    return new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);

  const networkPromise = fetch(req)
    .then((res) => {
      // Only update cache for OK responses — 404s should NOT replace good cached entries
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);

  // Return cached immediately if we have it, otherwise wait for network
  return cached || (await networkPromise) || new Response('Offline', { status: 503 });
}
