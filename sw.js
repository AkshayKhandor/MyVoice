/* MyVoice service worker
   Caches the app itself so it opens with no internet — important for a
   communication aid, which has to work in a car, a clinic corridor, or
   anywhere the signal drops.

   Note: Gesture Mode loads its hand-tracking model from a CDN, so that one
   feature still needs a connection the first time. Everything else — the
   picture board, speech, letters, numbers and body parts — works offline. */

const CACHE = 'myvoice-v2';   // bump this number every time you upload a new version
const CORE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  // The app itself (pages, manifest, icons): ask the network FIRST so users
  // always get the newest version, and only fall back to the saved copy when
  // offline. (Cache-first was why old versions kept showing up.)
  if (CORE.some((path) => e.request.url.endsWith(path.replace('./', '')))
      || e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request, { cache: 'no-cache' })
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(e.request).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }

  // Everything else (fonts, the hand-tracking model): try the network, fall
  // back to whatever we cached last time.
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
