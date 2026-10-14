import { SUPABASE_URL, SUPABASE_ANON_KEY, VAPID_PUBLIC_KEY } from '../cloud/supabaseClient'

export function getManifestJson(): string {
  return JSON.stringify(
    {
      name: '교행 보드 모바일',
      short_name: '교행보드',
      description: '학교 행정실 오늘의 일정/할일 및 D-DAY 모바일 연동 앱',
      start_url: './',
      display: 'standalone',
      background_color: '#0f172a',
      theme_color: '#1e293b',
      orientation: 'portrait-primary',
      icons: [
        {
          src: './icon.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: './icon.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    },
    null,
    2
  )
}

export function getServiceWorkerJs(): string {
  return `
const CACHE_NAME = 'gyoheng-board-v5';
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
`.trim()
}

export function getMobileHtml(
  appName = '교행 보드',
  version = 'v2.0.57',
  mode: 'lan' | 'cloud' = 'lan'
): string {
  const isCloud = mode === 'cloud'

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="${appName}" />
  <meta name="theme-color" content="#0f172a" />
  <link rel="manifest" href="./manifest.json" />
  <link rel="icon" type="image/png" href="./icon.png" />
  <title>${appName} 모바일</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --card-border: #334155;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #3b82f6;
      --accent-hover: #2563eb;
      --accent-purple: #8b5cf6;
      --success: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
      --dday-bg: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      --dday-today: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
    }

    input, textarea, button {
      user-select: auto;
      font-family: inherit;
    }

    body {
      background-color: var(--bg);
      color: var(--text-main);
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
      min-height: 100vh;
      padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }

    header {
      background: rgba(30, 41, 59, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--card-border);
      position: sticky;
      top: 0;
      z-index: 50;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .brand-icon {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 16px;
      color: #fff;
      box-shadow: 0 4px 10px rgba(59, 130, 246, 0.35);
    }

    .brand-text h1 {
      font-size: 16px;
      font-weight: 700;
      letter-spacing: -0.3px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .brand-text .version-tag {
      font-size: 10px;
      background: #334155;
      color: #cbd5e1;
      padding: 1px 6px;
      border-radius: 9999px;
      font-weight: 500;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-badge {
      font-size: 11px;
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 4px 8px;
      border-radius: 20px;
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      font-weight: 500;
    }

    .status-badge.offline {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
    }

    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
    }

    .pulse {
      animation: pulseAnim 2s infinite;
    }

    @keyframes pulseAnim {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.1); }
      100% { opacity: 1; transform: scale(1); }
    }

    .icon-btn {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--card-border);
      color: #cbd5e1;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 15px;
      transition: all 0.2s;
    }

    .icon-btn:active {
      transform: scale(0.92);
      background: rgba(255, 255, 255, 0.12);
    }

    .icon-btn.active {
      background: rgba(59, 130, 246, 0.2);
      border-color: rgba(59, 130, 246, 0.5);
      color: #60a5fa;
    }

    main {
      flex: 1;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      max-width: 600px;
      width: 100%;
      margin: 0 auto;
    }

    .date-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 6px 10px;
      gap: 6px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .date-nav-btn {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--card-border);
      color: #94a3b8;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.15s;
    }

    .date-nav-btn:active {
      background: var(--accent);
      color: white;
      border-color: var(--accent);
    }

    .date-center-wrap {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      position: relative;
      padding: 4px;
      border-radius: 8px;
      transition: background 0.15s;
    }

    .date-center-wrap:active {
      background: rgba(255, 255, 255, 0.05);
    }

    .today-date {
      font-size: 14px;
      font-weight: 700;
      color: #f1f5f9;
      display: flex;
      align-items: center;
      gap: 5px;
      white-space: nowrap;
    }

    .today-jump-btn {
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.4);
      color: #60a5fa;
      padding: 5px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s;
    }

    .today-jump-btn:active {
      background: var(--accent);
      color: white;
    }

    .hidden-date-picker {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
      pointer-events: none;
    }

    .refresh-btn {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--card-border);
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      transition: background 0.2s;
    }

    .refresh-btn:active {
      background: var(--card-bg);
      color: var(--text-main);
    }

    /* Section Styles */
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #cbd5e1;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .section-btn {
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.3);
      color: #60a5fa;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .section-btn:active {
      background: #3b82f6;
      color: white;
    }

    /* D-Day Carousel */
    .dday-scroll {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      padding-bottom: 6px;
      scroll-snap-type: x mandatory;
      -webkit-overflow-scrolling: touch;
    }

    .dday-scroll::-webkit-scrollbar {
      height: 4px;
    }
    .dday-scroll::-webkit-scrollbar-thumb {
      background: #334155;
      border-radius: 4px;
    }

    .dday-card {
      flex: 0 0 calc(50% - 6px);
      min-width: 145px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 8px;
      position: relative;
      scroll-snap-align: start;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: transform 0.15s;
    }

    .dday-card:active {
      transform: scale(0.98);
    }

    .dday-tag-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .dday-badge {
      font-size: 12px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 6px;
      color: white;
      background: var(--dday-bg);
      letter-spacing: -0.2px;
    }

    .dday-badge.today {
      background: var(--dday-today);
      animation: pulseAnim 1.5s infinite;
    }

    .dday-badge.urgent {
      background: linear-gradient(135deg, #f59e0b, #d97706);
    }

    .dday-badge.past {
      background: #475569;
      color: #cbd5e1;
    }

    .dday-delete-btn {
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      font-size: 14px;
      line-height: 1;
      padding: 2px 4px;
      border-radius: 4px;
    }

    .dday-delete-btn:active {
      color: var(--danger);
      background: rgba(239, 68, 68, 0.15);
    }

    .dday-title {
      font-size: 14px;
      font-weight: 700;
      color: #f1f5f9;
      line-height: 1.3;
      word-break: break-all;
    }

    .dday-date {
      font-size: 11px;
      color: var(--text-muted);
    }

    .empty-card {
      width: 100%;
      background: var(--card-bg);
      border: 1px dashed var(--card-border);
      border-radius: 14px;
      padding: 20px;
      text-align: center;
      color: var(--text-muted);
      font-size: 13px;
    }

    /* Tabs */
    .tab-nav {
      display: flex;
      background: #1e293b;
      border-radius: 10px;
      padding: 3px;
      border: 1px solid var(--card-border);
      gap: 4px;
    }

    .tab-btn {
      flex: 1;
      padding: 8px 12px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: var(--text-muted);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .tab-btn.active {
      background: #334155;
      color: #f8fafc;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    }

    /* Quick Add Input (LAN 모드 전용) */
    .quick-add-form {
      display: flex;
      gap: 8px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 6px 8px 6px 14px;
      align-items: center;
    }

    .quick-input {
      flex: 1;
      background: transparent;
      border: none;
      color: var(--text-main);
      font-size: 14px;
      outline: none;
    }

    .quick-input::placeholder {
      color: #64748b;
    }

    .quick-submit {
      background: var(--accent);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 7px 14px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
      white-space: nowrap;
    }

    .quick-submit:active {
      background: var(--accent-hover);
    }

    /* Schedule / Todo List */
    .todo-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .todo-item {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 12px 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: all 0.2s;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .todo-item.completed {
      opacity: 0.55;
      background: rgba(30, 41, 59, 0.5);
    }

    .checkbox-btn {
      width: 22px;
      height: 22px;
      border-radius: 6px;
      border: 2px solid #64748b;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.2s;
    }

    .checkbox-btn.checked {
      background: var(--success);
      border-color: var(--success);
    }

    .todo-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow: hidden;
    }

    .todo-title {
      font-size: 14px;
      font-weight: 500;
      color: #f1f5f9;
      word-break: break-all;
    }

    .todo-item.completed .todo-title {
      text-decoration: line-through;
      color: #94a3b8;
    }

    .todo-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: var(--text-muted);
    }

    .category-badge {
      padding: 1px 6px;
      border-radius: 4px;
      background: #334155;
      color: #94a3b8;
      font-size: 10px;
    }

    .todo-delete-btn {
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      padding: 6px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .todo-delete-btn:active {
      color: var(--danger);
      background: rgba(239, 68, 68, 0.15);
    }

    /* Admin Schedule Cards */
    .admin-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      border-left: 4px solid var(--accent-purple);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .admin-card.deadline {
      border-left-color: var(--danger) !important;
      background: rgba(239, 68, 68, 0.06);
    }

    .admin-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .admin-title {
      font-size: 14px;
      font-weight: 600;
      color: #f8fafc;
      line-height: 1.4;
    }

    .deadline-badge {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
    }

    /* Category Chips */
    .cat-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 4px;
    }

    .cat-chip {
      padding: 6px 12px;
      border-radius: 20px;
      border: 1.5px solid var(--card-border);
      background: transparent;
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }

    .cat-chip.selected {
      color: #fff !important;
      font-weight: 700;
    }

    /* Key Notice Card */
    .key-notice-card {
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98));
      border: 1px solid rgba(59, 130, 246, 0.4);
      border-radius: 16px;
      padding: 18px 16px;
      margin-bottom: 16px;
      text-align: center;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    }
    .key-notice-card h3 {
      font-size: 15px;
      font-weight: 700;
      color: #60a5fa;
      margin-bottom: 6px;
    }
    .key-notice-card p {
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.45;
      margin-bottom: 14px;
    }
    .key-notice-card .key-input-row {
      display: flex;
      gap: 6px;
    }
    .key-notice-card input {
      flex: 1;
      padding: 9px 12px;
      border-radius: 8px;
      border: 1px solid var(--card-border);
      background: #0f172a;
      color: white;
      font-size: 12px;
      outline: none;
    }
    .key-notice-card input:focus {
      border-color: var(--accent);
    }
    .key-notice-card button {
      padding: 9px 14px;
      border-radius: 8px;
      background: var(--accent);
      color: white;
      border: none;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      z-index: 100;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .modal-backdrop.open {
      display: flex;
    }

    .modal-content {
      background: #1e293b;
      border: 1px solid var(--card-border);
      border-radius: 18px;
      padding: 20px;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    }

    .modal-title {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 14px;
    }

    .modal-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-label {
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 600;
    }

    .form-input {
      background: #0f172a;
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 10px 12px;
      color: white;
      font-size: 14px;
      outline: none;
    }

    .form-input:focus {
      border-color: var(--accent);
    }

    .modal-actions {
      display: flex;
      gap: 8px;
      margin-top: 10px;
    }

    .modal-actions button {
      flex: 1;
      padding: 10px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      border: none;
      cursor: pointer;
    }

    .btn-cancel {
      background: #334155;
      color: #cbd5e1;
    }

    .btn-save {
      background: var(--accent);
      color: white;
    }

    /* Toast */
    .toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: rgba(30, 41, 59, 0.95);
      border: 1px solid var(--card-border);
      color: white;
      padding: 8px 16px;
      border-radius: 9999px;
      font-size: 12px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      z-index: 200;
      transition: transform 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
      pointer-events: none;
    }

    .toast.show {
      transform: translateX(-50%) translateY(0);
    }
  </style>
</head>
<body>

  <header>
    <div class="brand">
      <div class="brand-icon">교</div>
      <div class="brand-text">
        <h1>${appName} <span class="version-tag">${isCloud ? '클라우드' : version}</span></h1>
      </div>
    </div>
    <div class="header-actions">
      ${
        isCloud
          ? `<button class="icon-btn" id="keyConfigBtn" title="연동 키 설정">🔑</button>
             <button class="icon-btn" id="pushNotifyBtn" title="웹푸시 알림 켜기">🔔</button>`
          : ''
      }
      <div id="statusBadge" class="status-badge">
        <span class="dot pulse"></span>
        <span id="statusText">연결 중</span>
      </div>
    </div>
  </header>

  <main>
    <!-- 날짜 네비게이션 바 -->
    <div class="date-bar">
      <button class="date-nav-btn" id="prevDayBtn" title="이전 날">◀</button>
      <div class="date-center-wrap" id="dateCenterWrap" title="날짜 선택">
        <input type="date" id="datePickerInput" class="hidden-date-picker" />
        <div class="today-date" id="todayDateStr">📅 오늘 일정</div>
      </div>
      <button class="date-nav-btn" id="nextDayBtn" title="다음 날">▶</button>
      <button class="today-jump-btn" id="todayJumpBtn" title="오늘로 이동" style="display: none;">오늘</button>
      <button class="refresh-btn" id="refreshBtn" title="새로고침">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
        </svg>
      </button>
    </div>

    <!-- D-DAY 섹션 -->
    <section>
      <div class="section-header">
        <div class="section-title">
          <span>🚩</span>
          <span>중요 D-DAY</span>
          <span id="ddayCount" style="font-size: 11px; color: var(--text-muted); font-weight: 500;"></span>
        </div>
        ${!isCloud ? `<button class="section-btn" id="openDdayModalBtn">+ D-DAY 등록</button>` : ''}
      </div>

      <div class="dday-scroll" id="ddayContainer">
        <!-- D-DAY 카드 목록 동적 렌더링 -->
      </div>
    </section>

    <!-- 일정 및 할일 섹션 (행정실 일정 통합 뷰) -->
    <section>
      <div class="section-header">
        <div class="section-title">
          <span>📝</span>
          <span>오늘의 업무 & 일정</span>
          <span id="todoStats" style="font-size: 11px; color: var(--text-muted); font-weight: 500;"></span>
        </div>
        <button class="section-btn" id="openAdminModalBtn" style="background: linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.25)); border-color: rgba(99,102,241,0.4); color: #93c5fd; font-weight: 700; display: flex; align-items: center; gap: 4px;">
          <span>+</span><span>행정일정 추가</span>
        </button>
      </div>

      <!-- 빠른 추가 입력창 (개인 할 일 간편 추가) -->
      <form class="quick-add-form" id="quickAddForm">
        <input type="text" class="quick-input" id="quickTodoInput" placeholder="간편 할 일을 입력하세요..." maxlength="100" required />
        <button type="submit" class="quick-submit">추가</button>
      </form>

      <div class="todo-list" id="todoList">
        <!-- 행정실 마감 및 오늘의 할일 통합 동적 렌더링 -->
      </div>
    </section>
  </main>

  ${
    isCloud
      ? `
  <!-- 연동 키 설정 모달 (클라우드 모드) -->
  <div class="modal-backdrop" id="keyModal">
    <div class="modal-content">
      <div class="modal-title">🔑 클라우드 연동 키 설정</div>
      <form class="modal-form" id="keyModalForm">
        <div class="form-group">
          <label class="form-label">보안 연동 키 또는 QR 접속 주소</label>
          <input type="text" class="form-input" id="keyModalInput" placeholder="PC 설정 화면의 주소나 48자리 키 붙여넣기" required />
          <p style="font-size: 11px; color: var(--text-muted); margin-top: 4px; line-height: 1.4;">
            PC 교행 보드 [환경설정 ➔ 모바일 연동]에서 QR 코드를 다시 스캔하시거나, 화면에 표시된 모바일 접속 URL 전체를 복사하여 붙여넣으세요.
          </p>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-cancel" id="closeKeyModalBtn">취소</button>
          <button type="submit" class="btn-save">저장 및 연동</button>
        </div>
      </form>
    </div>
  </div>
  `
      : ''
  }

  ${
    !isCloud
      ? `
  <!-- D-DAY 추가 모달 (LAN 모드) -->
  <div class="modal-backdrop" id="ddayModal">
    <div class="modal-content">
      <div class="modal-title">새 D-DAY 등록</div>
      <form class="modal-form" id="ddayForm">
        <div class="form-group">
          <label class="form-label">D-DAY 제목</label>
          <input type="text" class="form-input" id="ddayTitleInput" placeholder="예: 급여일, 정산 마감, 분기 보고" required />
        </div>
        <div class="form-group">
          <label class="form-label">목표 날짜</label>
          <input type="date" class="form-input" id="ddayDateInput" required />
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-cancel" id="closeDdayModalBtn">취소</button>
          <button type="submit" class="btn-save">등록하기</button>
        </div>
      </form>
    </div>
  </div>
  `
      : ''
  }

  <!-- 행정일정 추가 팝업 모달 (PC 행정달력과 동일) -->
  <div class="modal-backdrop" id="adminScheduleModal">
    <div class="modal-content" style="max-width: 440px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h2 style="font-size: 16px; font-weight: 700; color: #f8fafc; margin: 0; display: flex; align-items: center; gap: 6px;">
          <span>📋</span> 행정 일정 추가
        </h2>
        <button type="button" id="closeAdminScheduleModalBtn" style="background: none; border: none; color: #94a3b8; font-size: 18px; cursor: pointer; padding: 4px;">✕</button>
      </div>
      <form class="modal-form" id="adminScheduleModalForm">
        <div class="form-group">
          <label class="form-label">제목 <span style="color: #ef4444;">*</span></label>
          <input type="text" class="form-input" id="adminScheduleTitle" placeholder="일정 제목을 입력하세요" required />
        </div>

        <div class="form-group">
          <label class="form-label">카테고리</label>
          <div class="cat-chips" id="adminCatChips">
            <!-- 5개 카테고리 칩 -->
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div class="form-group">
            <label class="form-label">날짜 <span style="color: #ef4444;">*</span></label>
            <input type="date" class="form-input" id="adminScheduleStartDate" required />
          </div>
          <div class="form-group">
            <label class="form-label">종료 날짜 (선택)</label>
            <input type="date" class="form-input" id="adminScheduleEndDate" />
          </div>
        </div>

        <div class="form-group" style="margin-top: 2px;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none;">
            <input type="checkbox" id="adminScheduleIsDeadline" style="width: 16px; height: 16px; accent-color: #ef4444; cursor: pointer;" />
            <span id="adminScheduleDeadlineLabel" style="font-size: 13px; color: var(--text-muted); transition: color 0.15s;">
              마감일로 표시 (빨간색 강조)
            </span>
          </label>
        </div>

        <div class="form-group">
          <label class="form-label">메모 (선택)</label>
          <textarea class="form-input" id="adminScheduleMemo" rows="3" placeholder="메모를 입력하세요 (선택)" style="resize: vertical; min-height: 64px; font-family: inherit;"></textarea>
        </div>

        <div class="modal-actions" style="margin-top: 14px;">
          <button type="button" class="btn-cancel" id="cancelAdminScheduleModalBtn">취소</button>
          <button type="submit" class="btn-save" id="saveAdminScheduleModalBtn">저장하기</button>
        </div>
      </form>
    </div>
  </div>

  <!-- 토스트 메시지 -->
  <div class="toast" id="toast"></div>

  <script>
    const IS_CLOUD = ${isCloud ? 'true' : 'false'};
    const SUPABASE_URL = '${SUPABASE_URL}';
    const SUPABASE_ANON_KEY = '${SUPABASE_ANON_KEY}';
    const VAPID_PUBLIC_KEY = '${VAPID_PUBLIC_KEY}';

    // PWA Service Worker 등록
    let swReg = null;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').then(reg => {
        swReg = reg;
        checkPushSubscription();
      }).catch(console.error);
    }

    // 보안 키 파싱 헬퍼 함수
    function parseKeyFromText(text) {
      if (!text) return '';
      text = text.trim();
      // 1) #key=xxxx 또는 ?key=xxxx 또는 ?k=xxxx
      const match = text.match(/[#?&](?:key|k)=([a-f0-9]{16,64})/i);
      if (match && match[1]) return match[1];
      // 2) 48자리 16진수 문자열 직접 입력된 경우
      const hexMatch = text.match(/[a-f0-9]{32,64}/i);
      if (hexMatch) return hexMatch[0];
      return text;
    }

    // 보안 키/토큰 추출
    let cloudKey = '';
    let lanToken = '';

    if (IS_CLOUD) {
      // 1) URL 해시 (#key=...) 또는 쿼리 파라미터 (?key=... / ?k=...) 확인
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      const extracted = parseKeyFromText(hash + search);

      if (extracted && extracted.length >= 16) {
        cloudKey = extracted;
        localStorage.setItem('gyoheng_cloud_key', cloudKey);
        // [중요!] iOS Safari에서 '홈 화면에 추가' 시 키가 보존되도록 URL 해시를 삭제하지 않습니다!
      } else {
        cloudKey = localStorage.getItem('gyoheng_cloud_key') || '';
      }
    } else {
      const urlParams = new URLSearchParams(window.location.search);
      const tokenFromUrl = urlParams.get('token');
      if (tokenFromUrl) {
        localStorage.setItem('gyoheng_token', tokenFromUrl);
      }
      lanToken = localStorage.getItem('gyoheng_token') || '';
    }

    // 상태 관리
    let appState = {
      today: '',
      schedules: [],
      ddays: [],
      adminSchedules: [],
      isConnected: false
    };

    let currentDate = ''; // 사용자가 현재 보고 있는 선택 날짜 (YYYY-MM-DD)
    let activeTab = 'todo';

    // DOM 요소
    const statusBadge = document.getElementById('statusBadge');
    const statusText = document.getElementById('statusText');
    const todayDateStr = document.getElementById('todayDateStr');
    const prevDayBtn = document.getElementById('prevDayBtn');
    const nextDayBtn = document.getElementById('nextDayBtn');
    const todayJumpBtn = document.getElementById('todayJumpBtn');
    const datePickerInput = document.getElementById('datePickerInput');
    const dateCenterWrap = document.getElementById('dateCenterWrap');
    const ddayContainer = document.getElementById('ddayContainer');
    const ddayCount = document.getElementById('ddayCount');
    const todoList = document.getElementById('todoList');
    const todoStats = document.getElementById('todoStats');
    const quickAddForm = document.getElementById('quickAddForm');
    const quickTodoInput = document.getElementById('quickTodoInput');
    const refreshBtn = document.getElementById('refreshBtn');
    const toast = document.getElementById('toast');
    const pushNotifyBtn = document.getElementById('pushNotifyBtn');

    // 행정 카테고리 정의 (PC ScheduleModal과 100% 동일)
    const ADMIN_CATEGORIES = [
      { value: '회계/예산', color: '#3b82f6' },
      { value: '인사/노무', color: '#8b5cf6' },
      { value: '시설/안전', color: '#f59e0b' },
      { value: '급식/보건', color: '#10b981' },
      { value: '행정', color: '#ec4899' }
    ];
    let selectedAdminCategory = '행정';

    // 행정 모달 DOM 요소
    const openAdminModalBtn = document.getElementById('openAdminModalBtn');
    const adminScheduleModal = document.getElementById('adminScheduleModal');
    const closeAdminScheduleModalBtn = document.getElementById('closeAdminScheduleModalBtn');
    const cancelAdminScheduleModalBtn = document.getElementById('cancelAdminScheduleModalBtn');
    const adminScheduleModalForm = document.getElementById('adminScheduleModalForm');
    const adminScheduleTitle = document.getElementById('adminScheduleTitle');
    const adminScheduleStartDate = document.getElementById('adminScheduleStartDate');
    const adminScheduleEndDate = document.getElementById('adminScheduleEndDate');
    const adminScheduleIsDeadline = document.getElementById('adminScheduleIsDeadline');
    const adminScheduleDeadlineLabel = document.getElementById('adminScheduleDeadlineLabel');
    const adminScheduleMemo = document.getElementById('adminScheduleMemo');
    const adminCatChips = document.getElementById('adminCatChips');

    function getKstToday() {
      const d = new Date();
      const offset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - offset).toISOString().slice(0, 10);
    }

    function changeDate(deltaDays) {
      if (!currentDate) currentDate = appState.today || getKstToday();
      const parts = currentDate.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      d.setDate(d.getDate() + deltaDays);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      currentDate = y + '-' + m + '-' + day;
      render();
    }

    function setDate(dateStr) {
      if (!dateStr) return;
      currentDate = dateStr;
      render();
    }

    function showToast(msg) {
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2200);
    }

    function updateConnectionStatus(connected) {
      appState.isConnected = connected;
      if (connected) {
        statusBadge.className = 'status-badge';
        statusText.textContent = IS_CLOUD ? '클라우드 연동' : '실시간 연동';
      } else {
        statusBadge.className = 'status-badge offline';
        statusText.textContent = '오프라인';
      }
    }

    // 데이터 불러오기
    function renderKeyNotice(show) {
      const existing = document.getElementById('keyNoticeCard');
      if (show) {
        if (!existing) {
          const card = document.createElement('div');
          card.id = 'keyNoticeCard';
          card.className = 'key-notice-card';
          card.innerHTML = '<div style="font-size: 26px; margin-bottom: 6px;">🔐</div>' +
            '<h3>모바일 클라우드 연동 필요</h3>' +
            '<p>PC 교행 보드의 <strong>[환경설정 ➔ 모바일 연동]</strong>에 표시된 <strong>QR 코드</strong>를 다시 스캔하시거나, 아래에 <strong>접속 주소(또는 48자리 연동 키)</strong>를 붙여넣어 주세요.</p>' +
            '<div class="key-input-row">' +
            '  <input type="text" id="manualKeyInput" placeholder="접속 주소 또는 연동 키 붙여넣기" />' +
            '  <button id="saveKeyBtn">연동하기</button>' +
            '</div>';
          const main = document.querySelector('main');
          if (main) main.insertBefore(card, main.firstChild);

          const saveBtn = document.getElementById('saveKeyBtn');
          const input = document.getElementById('manualKeyInput');
          if (saveBtn && input) {
            saveBtn.addEventListener('click', () => {
              const val = parseKeyFromText(input.value);
              if (val && val.length >= 16) {
                cloudKey = val;
                localStorage.setItem('gyoheng_cloud_key', val);
                showToast('✅ 연동 키가 저장되었습니다!');
                loadData();
              } else {
                alert('유효한 연동 키가 아닙니다. PC 설정 화면의 전체 접속 주소나 48자리 키를 복사해 붙여넣으세요.');
              }
            });
          }
        }
      } else {
        if (existing) existing.remove();
      }
    }

    async function loadData() {
      if (IS_CLOUD) {
        if (!cloudKey || cloudKey.trim().length < 16) {
          updateConnectionStatus(false);
          renderKeyNotice(true);
          return;
        }
        renderKeyNotice(false);

        try {
          const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/get_snapshot', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
            },
            body: JSON.stringify({ p_key: cloudKey })
          });

          if (!res.ok) throw new Error('HTTP ' + res.status);
          const data = await res.json();

          if (data && data.payload) {
            appState.today = data.payload.today || '';
            appState.schedules = data.payload.schedules || [];
            appState.ddays = data.payload.ddays || [];
            appState.adminSchedules = data.payload.adminSchedules || [];

            localStorage.setItem('cached_gyoheng_cloud', JSON.stringify(appState));
            updateConnectionStatus(true);
            render();
          } else {
            showToast('등록된 일정이 아직 없거나 키가 만료되었습니다.');
            updateConnectionStatus(false);
          }
        } catch (err) {
          console.warn('클라우드 조회 실패, 캐시 사용', err);
          updateConnectionStatus(false);
          loadCachedData('cached_gyoheng_cloud');
        }
      } else {
        // LAN 모드
        try {
          const res = await fetch('/api/data?token=' + encodeURIComponent(lanToken));
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const json = await res.json();
          if (json.success) {
            appState.today = json.today || '';
            appState.schedules = json.schedules || [];
            appState.ddays = json.ddays || [];
            appState.adminSchedules = json.adminSchedules || [];

            localStorage.setItem('cached_gyoheng_lan', JSON.stringify(appState));
            updateConnectionStatus(true);
            render();
          }
        } catch (err) {
          updateConnectionStatus(false);
          loadCachedData('cached_gyoheng_lan');
        }
      }
    }

    function loadCachedData(cacheKey) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          appState.today = parsed.today || '';
          appState.schedules = parsed.schedules || [];
          appState.ddays = parsed.ddays || [];
          appState.adminSchedules = parsed.adminSchedules || [];
          render();
        } catch(e) {}
      }
    }

    // 렌더링
    function render() {
      if (!currentDate) currentDate = appState.today || getKstToday();
      renderDateBar();
      renderDdays();
      renderTodos();
      renderAdminSchedules();
    }

    function renderDateBar() {
      const targetDate = currentDate || appState.today || getKstToday();
      const parts = targetDate.split('-');
      if (parts.length === 3) {
        const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const dayStr = days[dateObj.getDay()];
        const isToday = targetDate === appState.today;
        todayDateStr.innerHTML = '📅 ' + parts[0] + '.' + parts[1] + '.' + parts[2] + ' (' + dayStr + ')' +
          (isToday ? ' <span style="font-size: 10px; background: rgba(59,130,246,0.3); color: #93c5fd; padding: 2px 6px; border-radius: 4px; margin-left: 4px;">오늘</span>' : '');
        
        if (datePickerInput) datePickerInput.value = targetDate;
        if (todayJumpBtn) todayJumpBtn.style.display = isToday ? 'none' : 'inline-block';
      }
    }

    function renderDdays() {
      ddayContainer.innerHTML = '';
      // 지나간 일정(D+)은 제외하고 오늘(D-DAY) 및 앞으로 남은 일정만 임박순 표시
      const list = (appState.ddays || [])
        .filter(d => d.daysLeft >= 0)
        .sort((a, b) => a.daysLeft - b.daysLeft);

      ddayCount.textContent = list.length > 0 ? '(' + list.length + '개)' : '';

      if (list.length === 0) {
        ddayContainer.innerHTML = '<div class="empty-card">예정된 D-DAY가 없습니다.</div>';
        return;
      }

      list.forEach(d => {
        const card = document.createElement('div');
        card.className = 'dday-card';

        let badgeClass = 'dday-badge';
        let badgeText = '';
        if (d.daysLeft === 0) {
          badgeClass += ' today';
          badgeText = 'D-DAY';
        } else {
          if (d.daysLeft <= 3) badgeClass += ' urgent';
          badgeText = 'D-' + d.daysLeft;
        }

        const deleteHtml = !IS_CLOUD ? '<button class="dday-delete-btn" title="삭제" data-id="' + d.id + '">✕</button>' : '';

        card.innerHTML = 
          '<div class="dday-tag-row">' +
            '<span class="' + badgeClass + '">' + badgeText + '</span>' +
            deleteHtml +
          '</div>' +
          '<div class="dday-title">' + escapeHtml(d.title) + '</div>' +
          '<div class="dday-date">' + (d.targetDate || '') + '</div>';

        if (!IS_CLOUD) {
          card.querySelector('.dday-delete-btn')?.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm(d.title + ' D-DAY를 삭제하시겠습니까?')) {
              await fetch('/api/ddays/' + d.id + '?token=' + encodeURIComponent(lanToken), { method: 'DELETE' });
              showToast('D-DAY가 삭제되었습니다.');
              loadData();
            }
          });
        }

        ddayContainer.appendChild(card);
      });
    }

    function renderTodos() {
      todoList.innerHTML = '';
      const targetDate = currentDate || appState.today || getKstToday();

      // 선택된 날짜에 해당하는 행정실 일정/마감 필터링
      const adminList = (appState.adminSchedules || []).filter(a => {
        if (!a.date) return false;
        const aDate = String(a.date).trim().slice(0, 10);
        const aEnd = a.end_date ? String(a.end_date).trim().slice(0, 10) : '';
        if (aDate === targetDate) return true;
        if (aEnd && aDate <= targetDate && aEnd >= targetDate) return true;
        return false;
      });

      // 선택된 날짜에 진행 중인 개인 일정/할일 필터링 (행정일정과 제목 중복 제거)
      const adminTitles = new Set(adminList.map(a => String(a.title || '').trim()));
      const schedules = (appState.schedules || []).filter(s => {
        if (!s.start_date) return false;
        const sStart = String(s.start_date).trim().slice(0, 10);
        const sEnd = s.end_date ? String(s.end_date).trim().slice(0, 10) : '';
        const isMatched = (sStart === targetDate) || (sEnd && sStart <= targetDate && sEnd >= targetDate);
        if (!isMatched) return false;
        return !adminTitles.has(String(s.title || '').trim());
      });

      const completedCount = schedules.filter(s => s.is_completed === 1).length;
      if (adminList.length > 0) {
        todoStats.textContent = '(' + completedCount + '/' + (schedules.length + adminList.length) + ' 항목 · 행정 ' + adminList.length + '건)';
      } else if (schedules.length > 0) {
        todoStats.textContent = '(' + completedCount + '/' + schedules.length + ' 완료)';
      } else {
        todoStats.textContent = '';
      }

      if (adminList.length === 0 && schedules.length === 0) {
        todoList.innerHTML = '<div class="empty-card" style="padding: 30px;">' + targetDate + ' 일정 및 할 일이 없습니다. ✨</div>';
        return;
      }

      // 1) 행정실 일정 상단 렌더링 (일반 일정 및 마감 일정 모두 충실히 렌더링)
      if (adminList.length > 0) {
        adminList.forEach(a => {
          const item = document.createElement('div');
          const isDl = a.is_deadline === 1 || a.is_deadline === true;
          item.className = 'admin-card' + (isDl ? ' deadline' : '');
          item.style.marginBottom = '6px';

          const catInfo = ADMIN_CATEGORIES.find(c => c.value === a.category) || { value: a.category || '행정', color: '#ec4899' };
          const catColor = catInfo.color;

          if (!isDl) {
            item.style.borderLeftColor = catColor;
          }

          const isTargetToday = targetDate === appState.today;
          const deadlineText = isTargetToday ? '오늘 마감' : '마감일';
          const deadlineTag = isDl ? '<span class="deadline-badge">⚑ ' + deadlineText + '</span>' : '';
          const categoryTag = '<span class="category-badge" style="background: ' + catColor + '20; color: ' + catColor + '; border: 1.5px solid ' + catColor + '50; font-weight: 700;">' + escapeHtml(catInfo.value) + '</span>';

          let dateRangeHtml = '';
          if (a.end_date && a.end_date !== a.date) {
            dateRangeHtml = '<span style="font-size: 11px; color: var(--text-muted);">' + escapeHtml(a.date) + ' ~ ' + escapeHtml(a.end_date) + '</span>';
          }

          let memoHtml = '';
          if (a.memo && String(a.memo).trim()) {
            memoHtml = '<div style="font-size: 12px; color: #94a3b8; margin-top: 4px; line-height: 1.4; white-space: pre-wrap; background: rgba(0,0,0,0.2); padding: 5px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">' + escapeHtml(String(a.memo).trim()) + '</div>';
          }

          item.innerHTML = 
            '<div class="admin-header">' +
              '<div style="display: flex; align-items: center; gap: 6px;">' +
                categoryTag +
                deadlineTag +
              '</div>' +
              (dateRangeHtml || '<span style="font-size: 11px; color: var(--text-muted);">학교행정</span>') +
            '</div>' +
            '<div class="admin-title" style="margin-top: 5px;">' +
              (isDl ? '<span style="color: #ef4444; margin-right: 4px; font-weight: 700;">⚑</span>' : '<span style="color: ' + catColor + '; margin-right: 4px; font-weight: 700;">📋</span>') +
              escapeHtml(a.title) +
            '</div>' +
            memoHtml;
            
          todoList.appendChild(item);
        });
      }

      // 2) 오늘 개인 일정 및 할일 목록 렌더링
      if (schedules.length > 0) {
        schedules.forEach(item => {
          const row = document.createElement('div');
          row.className = 'todo-item' + (item.is_completed === 1 ? ' completed' : '');
          const isChecked = item.is_completed === 1;

          const checkIcon = isChecked ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : '';
          const checkHtml = !IS_CLOUD
            ? '<button class="checkbox-btn ' + (isChecked ? 'checked' : '') + '" data-id="' + item.id + '">' + checkIcon + '</button>'
            : '<div class="checkbox-btn ' + (isChecked ? 'checked' : '') + '" style="cursor: default;">' + checkIcon + '</div>';

          const deleteHtml = !IS_CLOUD
            ? '<button class="todo-delete-btn" data-id="' + item.id + '" title="삭제">' +
                '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
              '</button>'
            : '';

          row.innerHTML = 
            checkHtml +
            '<div class="todo-content">' +
              '<div class="todo-title">' + escapeHtml(item.title) + '</div>' +
              '<div class="todo-meta">' +
                '<span class="category-badge">' + getCategoryName(item.category) + '</span>' +
              '</div>' +
            '</div>' +
            deleteHtml;

          if (!IS_CLOUD) {
            row.querySelector('.checkbox-btn')?.addEventListener('click', async () => {
              const nextStatus = isChecked ? 0 : 1;
              await fetch('/api/schedules/' + item.id + '/toggle?token=' + encodeURIComponent(lanToken), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_completed: nextStatus })
              });
              item.is_completed = nextStatus;
              renderTodos();
            });

            row.querySelector('.todo-delete-btn')?.addEventListener('click', async () => {
              if (confirm('이 할 일을 삭제하시겠습니까?')) {
                await fetch('/api/schedules/' + item.id + '?token=' + encodeURIComponent(lanToken), { method: 'DELETE' });
                showToast('삭제되었습니다.');
                loadData();
              }
            });
          }

          todoList.appendChild(row);
        });
      }
    }

    function renderAdminSchedules() {
      // 통합 렌더링으로 대체됨
    }

    function getCategoryName(cat) {
      const map = { general: '일반', event: '행사', exam: '시험', meeting: '회의', finance: '재무', holiday: '휴무' };
      return map[cat] || '일반';
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // 날짜 네비게이션 이벤트 바인딩
    if (prevDayBtn) {
      prevDayBtn.addEventListener('click', () => changeDate(-1));
    }
    if (nextDayBtn) {
      nextDayBtn.addEventListener('click', () => changeDate(1));
    }
    if (todayJumpBtn) {
      todayJumpBtn.addEventListener('click', () => {
        currentDate = appState.today || getKstToday();
        render();
      });
    }
    if (dateCenterWrap && datePickerInput) {
      dateCenterWrap.addEventListener('click', () => {
        if (datePickerInput.showPicker) {
          try {
            datePickerInput.showPicker();
          } catch(e) {
            datePickerInput.click();
          }
        } else {
          datePickerInput.click();
        }
      });
      datePickerInput.addEventListener('change', (e) => {
        if (e.target.value) {
          setDate(e.target.value);
        }
      });
    }

    // 빠른 일정/할 일 추가 (2단계: 모바일 ➔ PC 양방향 연동)
    if (quickAddForm) {
      quickAddForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = (quickTodoInput.value || '').trim();
        if (!text) return;

        const targetDate = currentDate || appState.today || getKstToday();

        if (IS_CLOUD) {
          if (!cloudKey || cloudKey.trim().length < 16) {
            showToast('⚠️ 먼저 연동 키를 설정해주세요.');
            openKeyModal();
            return;
          }

          quickTodoInput.disabled = true;
          try {
            const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/add_mobile_schedule', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
              },
              body: JSON.stringify({
                p_key: cloudKey,
                p_title: text,
                p_date: targetDate,
                p_category: '행정'
              })
            });

            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.message || '서버 오류 (' + res.status + ')');
            }

            // 화면에 즉시 임시 등록 (낙관적 UI 반영 - 행정 일정에 추가)
            const newItem = {
              id: Date.now(),
              title: text,
              date: targetDate,
              category: '행정',
              is_deadline: 0,
              memo: ''
            };
            appState.adminSchedules = appState.adminSchedules || [];
            appState.adminSchedules.push(newItem);
            renderTodos();
            quickTodoInput.value = '';
            showToast('✅ 할 일이 추가되었습니다! PC 행정 달력에 반영됩니다.');
          } catch (err) {
            console.error('Failed to add schedule:', err);
            alert('일정 추가 실패: ' + (err.message || '네트워크 오류'));
          } finally {
            quickTodoInput.disabled = false;
          }
        } else {
          // LAN 모드
          try {
            const res = await fetch('/api/schedules?token=' + encodeURIComponent(lanToken), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: text,
                start_date: targetDate,
                category: 'general'
              })
            });
            if (!res.ok) throw new Error('등록 실패');
            quickTodoInput.value = '';
            showToast('할 일이 추가되었습니다.');
            loadData();
          } catch (err) {
            alert('일정 추가 실패: ' + err.message);
          }
        }
      });
    }

    // 새로고침
    refreshBtn.addEventListener('click', () => {
      refreshBtn.style.transform = 'rotate(180deg)';
      refreshBtn.style.transition = 'transform 0.4s';
      setTimeout(() => {
        refreshBtn.style.transform = 'none';
        refreshBtn.style.transition = 'none';
      }, 400);
      loadData();
      showToast('새로고침 완료');
    });

    // 웹푸시 구독 처리 (클라우드 모드)
    async function checkPushSubscription() {
      if (!IS_CLOUD || !swReg || !('PushManager' in window)) return;
      try {
        const sub = await swReg.pushManager.getSubscription();
        if (sub && pushNotifyBtn) {
          pushNotifyBtn.classList.add('active');
          pushNotifyBtn.title = '웹푸시 알림 활성화됨';
        }
      } catch (e) {}
    }

    // 키 설정 모달 이벤트 바인딩
    const keyConfigBtn = document.getElementById('keyConfigBtn');
    const keyModal = document.getElementById('keyModal');
    const closeKeyModalBtn = document.getElementById('closeKeyModalBtn');
    const keyModalForm = document.getElementById('keyModalForm');
    const keyModalInput = document.getElementById('keyModalInput');

    function openKeyModal() {
      if (!keyModal) return;
      if (keyModalInput) keyModalInput.value = cloudKey || '';
      keyModal.style.display = 'flex';
    }

    function closeKeyModal() {
      if (!keyModal) return;
      keyModal.style.display = 'none';
    }

    if (keyConfigBtn) keyConfigBtn.addEventListener('click', openKeyModal);
    if (closeKeyModalBtn) closeKeyModalBtn.addEventListener('click', closeKeyModal);
    if (keyModalForm) {
      keyModalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = parseKeyFromText(keyModalInput.value);
        if (val && val.length >= 16) {
          cloudKey = val;
          localStorage.setItem('gyoheng_cloud_key', val);
          closeKeyModal();
          showToast('✅ 연동 키가 설정되었습니다!');
          loadData();
        } else {
          alert('유효한 연동 키가 아닙니다. PC 설정 화면의 전체 접속 주소나 48자리 키를 복사해 붙여넣으세요.');
        }
      });
    }

    if (pushNotifyBtn) {
      pushNotifyBtn.addEventListener('click', async () => {
        if (!cloudKey || cloudKey.trim().length < 16) {
          showToast('클라우드 연동 키가 없습니다. 먼저 연동을 완료해주세요.');
          openKeyModal();
          return;
        }

        if (!('Notification' in window) || !('PushManager' in window)) {
          alert('이 브라우저는 웹푸시 알림을 지원하지 않습니다.');
          return;
        }

        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          showToast('알림 권한이 거부되었습니다.');
          return;
        }

        if (!swReg) {
          showToast('서비스 워커 준비 중입니다. 잠시 후 다시 시도해주세요.');
          return;
        }

        try {
          const rawSub = await swReg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY)
          });

          const subJson = rawSub.toJSON();
          const endpoint = subJson.endpoint;
          const p256dh = subJson.keys?.p256dh;
          const auth = subJson.keys?.auth;

          if (!endpoint || !p256dh || !auth) throw new Error('구독 키 누락');

          // Supabase RPC: register_push
          const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/register_push', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
            },
            body: JSON.stringify({
              p_key: cloudKey,
              p_endpoint: endpoint,
              p_p256dh: p256dh,
              p_auth: auth
            })
          });

          if (!res.ok) throw new Error('서버 등록 실패: ' + res.status);

          pushNotifyBtn.classList.add('active');
          showToast('🔔 알림이 성공적으로 설정되었습니다!');
        } catch (err) {
          console.error('Push subscription failed:', err);
          showToast('알림 등록 실패: ' + err.message);
        }
      });
    }

    function urlB64ToUint8Array(base64String) {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding).replace(/\\-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    }

    // SSE 연결 (LAN 모드 전용)
    if (!IS_CLOUD) {
      let eventSource = null;
      function connectSSE() {
        if (eventSource) eventSource.close();
        eventSource = new EventSource('/api/events?token=' + encodeURIComponent(lanToken));
        eventSource.onopen = () => updateConnectionStatus(true);
        eventSource.onmessage = (e) => {
          if (e.data === 'change') loadData();
        };
        eventSource.onerror = () => {
          updateConnectionStatus(false);
          eventSource.close();
          setTimeout(connectSSE, 4000);
        };
      }
      connectSSE();
    }

    // ============================================
    // 행정 일정 모달 로직 (PC ScheduleModal과 연동)
    // ============================================
    function renderAdminCategoryChips() {
      if (!adminCatChips) return;
      adminCatChips.innerHTML = '';
      ADMIN_CATEGORIES.forEach(cat => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'cat-chip' + (selectedAdminCategory === cat.value ? ' selected' : '');
        chip.textContent = cat.value;
        if (selectedAdminCategory === cat.value) {
          chip.style.borderColor = cat.color;
          chip.style.background = cat.color;
          chip.style.color = '#fff';
        } else {
          chip.style.borderColor = cat.color;
          chip.style.background = 'transparent';
          chip.style.color = cat.color;
        }
        chip.addEventListener('click', () => {
          selectedAdminCategory = cat.value;
          renderAdminCategoryChips();
        });
        adminCatChips.appendChild(chip);
      });
    }

    function openAdminModal() {
      if (!adminScheduleModal) return;
      const cur = currentDate || appState.today || getKstToday();
      if (adminScheduleStartDate) {
        adminScheduleStartDate.value = cur;
      }
      if (adminScheduleEndDate) {
        adminScheduleEndDate.value = '';
        adminScheduleEndDate.min = cur;
      }
      if (adminScheduleTitle) adminScheduleTitle.value = '';
      if (adminScheduleMemo) adminScheduleMemo.value = '';
      if (adminScheduleIsDeadline) {
        adminScheduleIsDeadline.checked = false;
        if (adminScheduleDeadlineLabel) {
          adminScheduleDeadlineLabel.style.color = 'var(--text-muted)';
          adminScheduleDeadlineLabel.style.fontWeight = '400';
        }
      }
      selectedAdminCategory = '행정';
      renderAdminCategoryChips();
      adminScheduleModal.classList.add('open');
      setTimeout(() => {
        if (adminScheduleTitle) adminScheduleTitle.focus();
      }, 100);
    }

    function closeAdminModal() {
      if (!adminScheduleModal) return;
      adminScheduleModal.classList.remove('open');
    }

    if (openAdminModalBtn) openAdminModalBtn.addEventListener('click', openAdminModal);
    if (closeAdminScheduleModalBtn) closeAdminScheduleModalBtn.addEventListener('click', closeAdminModal);
    if (cancelAdminScheduleModalBtn) cancelAdminScheduleModalBtn.addEventListener('click', closeAdminModal);

    // 모달 배경 클릭 시 닫기
    if (adminScheduleModal) {
      adminScheduleModal.addEventListener('click', (e) => {
        if (e.target === adminScheduleModal) closeAdminModal();
      });
    }

    if (adminScheduleStartDate && adminScheduleEndDate) {
      adminScheduleStartDate.addEventListener('change', (e) => {
        adminScheduleEndDate.min = e.target.value;
        if (adminScheduleEndDate.value && adminScheduleEndDate.value < e.target.value) {
          adminScheduleEndDate.value = e.target.value;
        }
      });
    }

    if (adminScheduleIsDeadline && adminScheduleDeadlineLabel) {
      adminScheduleIsDeadline.addEventListener('change', (e) => {
        adminScheduleDeadlineLabel.style.color = e.target.checked ? '#ef4444' : 'var(--text-muted)';
        adminScheduleDeadlineLabel.style.fontWeight = e.target.checked ? '600' : '400';
      });
    }

    if (adminScheduleModalForm) {
      adminScheduleModalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = (adminScheduleTitle.value || '').trim();
        if (!title) {
          alert('일정 제목을 입력해주세요.');
          return;
        }
        const startDate = adminScheduleStartDate.value || currentDate || appState.today || getKstToday();
        const endDate = adminScheduleEndDate.value || null;
        const isDeadline = adminScheduleIsDeadline.checked;
        const memo = (adminScheduleMemo.value || '').trim();
        const category = selectedAdminCategory || '행정';

        const saveBtn = document.getElementById('saveAdminScheduleModalBtn');
        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.textContent = '저장 중...';
        }

        try {
          if (IS_CLOUD) {
            if (!cloudKey || cloudKey.trim().length < 16) {
              showToast('⚠️ 먼저 연동 키를 설정해주세요.');
              closeAdminModal();
              openKeyModal();
              return;
            }

            // 모든 메타데이터(종료일, 마감여부, 메모 등)를 손실 없이 전송하기 위해 JSON 패킹
            const packedTitle = JSON.stringify({
              title,
              endDate,
              isDeadline: isDeadline ? 1 : 0,
              memo,
              category,
              target: 'admin'
            });

            const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/add_mobile_schedule', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
              },
              body: JSON.stringify({
                p_key: cloudKey,
                p_title: packedTitle,
                p_date: startDate,
                p_category: category
              })
            });

            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.message || '서버 오류 (' + res.status + ')');
            }

            // 낙관적 UI 업데이트
            const newAdminItem = {
              id: Date.now(),
              title,
              category,
              date: startDate,
              end_date: endDate,
              is_deadline: isDeadline ? 1 : 0,
              memo
            };
            appState.adminSchedules = appState.adminSchedules || [];
            appState.adminSchedules.push(newAdminItem);
            closeAdminModal();
            // 입력한 일정의 날짜로 화면 이동하여 즉시 확인
            currentDate = startDate;
            render();
            showToast('✅ 행정 일정이 등록되었습니다! PC 행정 달력에 반영됩니다.');
          } else {
            // LAN 모드
            const res = await fetch('/api/admin-schedules?token=' + encodeURIComponent(lanToken), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title,
                category,
                date: startDate,
                end_date: endDate,
                is_deadline: isDeadline ? 1 : 0,
                memo
              })
            });

            if (!res.ok) throw new Error('등록 실패');
            closeAdminModal();
            showToast('✅ 행정 일정이 등록되었습니다.');
            loadData();
          }
        } catch (err) {
          console.error('Failed to add admin schedule:', err);
          alert('행정 일정 등록 실패: ' + (err.message || '네트워크 오류'));
        } finally {
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = '저장하기';
          }
        }
      });
    }

    // 초기 로드
    loadData();
  </script>
</body>
</html>
`
}
