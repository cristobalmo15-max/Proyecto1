// Service Worker for Punto Propiedades Web Push Notifications & PWA
const CACHE_NAME = 'punto-propiedades-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => caches.delete(cache))
      );
    }).then(() => self.clients.claim())
  );
});

// Listen for Web Push Notifications dispatched from server
self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'Punto Propiedades',
    body: 'Tienes una nueva notificación en el sistema.',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    targetUrl: '/?module=reports&sub=expiries'
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        title: payload.title || notificationData.title,
        body: payload.body || notificationData.body,
        icon: payload.icon || notificationData.icon,
        badge: payload.badge || notificationData.badge,
        targetUrl: payload.targetUrl || payload.url || notificationData.targetUrl
      };
    } catch (e) {
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    vibrate: [100, 50, 100],
    data: {
      targetUrl: notificationData.targetUrl
    },
    actions: [
      { action: 'open', title: 'Ver en App' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Handle notification click -> open or focus app & navigate directly to target URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.targetUrl || '/?module=reports&sub=expiries';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
