const CACHE_NAME = 'gyoheng-board-v2';
const STATIC_ASSETS = ['./', './manifest.json', './icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // API 및 RPC 요청은 네트워크 우선
  if (e.request.url.includes('/api/') || e.request.url.includes('/rpc/')) {
    e.respondWith(
      fetch(e.request).catch(() => {
        return new Response(JSON.stringify({ error: 'offline', offline: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // 정적 리소스는 네트워크 우선, 실패 시 캐시
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// 웹푸시 수신 리스너
self.addEventListener('push', (e) => {
  let data = { title: '교행 보드 알림', body: '새로운 알림이 도착했습니다.' };
  try {
    if (e.data) {
      data = e.data.json();
    }
  } catch (err) {
    if (e.data) data.body = e.data.text();
  }

  const options = {
    body: data.body || '',
    icon: './icon.png',
    badge: './icon.png',
    data: { url: data.url || './' },
    vibrate: [100, 50, 100]
  };

  e.waitUntil(self.registration.showNotification(data.title, options));
});

// 알림 클릭 리스너
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const targetUrl = e.notification.data?.url || './';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});