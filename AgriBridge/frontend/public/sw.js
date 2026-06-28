// AgriBridge — Service Worker Cleanup
// This file exists solely to satisfy the browser's cached SW registration.
// It immediately unregisters itself so no offline caching occurs.
// The app requires a live backend connection and does not need PWA offline support.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.registration.unregister().then(() => {
      console.log('[SW] Unregistered stale service worker.');
    })
  );
});
