import type { Plugin } from 'vite';

/**
 * Writes `sw.js` into the build: precaches every emitted file so the game
 * plays offline. The cache name changes with each build, so old caches are dropped on update.
 */
export function serviceWorker(): Plugin {
  return {
    name: 'pour-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = ['./', ...Object.keys(bundle).map((f) => `./${f}`)];
      const extra = ['manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon.svg'].map(
        (f) => `./${f}`,
      );
      const version = Date.now().toString(36);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: swSource(`pour-${version}`, [...files, ...extra]) });
    },
  };
}

export function swSource(cache: string, files: string[]): string {
  return `const CACHE = ${JSON.stringify(cache)};
const FILES = ${JSON.stringify(files)};
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  // The page itself: network first, so a new version shows on the next open; cached copy when offline.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put('./', copy)); return r; })
        .catch(() => caches.match('./', { ignoreVary: true })),
    );
    return;
  }
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true, ignoreVary: true }).then((hit) => hit || fetch(e.request).catch(() => caches.match('./'))),
  );
});
`;
}
