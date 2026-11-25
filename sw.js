/* ASCEND · Service worker
 * - Precarga la app (funciona sin conexión después de la primera visita).
 * - Archivos propios: se sirven desde caché y se actualizan en segundo plano (la versión nueva se ve al reabrir).
 * - Tipografías de Google: caché en tiempo de ejecución.
 * - Notificaciones: muestra avisos enviados desde la app y, cuando exista un servidor de push, eventos 'push'.
 * Al cambiar archivos, subir VERSION para forzar la actualización.
 */
const VERSION = 'ascend-v3.1.0';
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'js/app.js',
  'js/config/app-config.js',
  'js/config/brand.js',
  'js/config/xp.js',
  'js/core/dates.js',
  'js/core/db.js',
  'js/core/perf.js',
  'js/core/store.js',
  'js/data/exercise-guide.js',
  'js/data/exercises.js',
  'js/data/legal.js',
  'js/data/motivation.js',
  'js/domain/calendar.js',
  'js/domain/coach.js',
  'js/domain/game.js',
  'js/domain/gym.js',
  'js/domain/habits.js',
  'js/domain/insights.js',
  'js/domain/motivation.js',
  'js/domain/planner.js',
  'js/domain/progress.js',
  'js/domain/recovery.js',
  'js/domain/rewards.js',
  'js/domain/routine-guide.js',
  'js/domain/rules.js',
  'js/domain/wellbeing.js',
  'js/screens/calendar.js',
  'js/screens/gym-guide.js',
  'js/screens/gym.js',
  'js/screens/habits.js',
  'js/screens/home.js',
  'js/screens/legal.js',
  'js/screens/motivation.js',
  'js/screens/onboarding.js',
  'js/screens/planner.js',
  'js/screens/profile.js',
  'js/screens/progress.js',
  'js/screens/tutorial.js',
  'js/screens/workout.js',
  'js/sync/merge.js',
  'js/sync/native-notify.js',
  'js/sync/push.js',
  'js/sync/sync.js',
  'js/ui/sound.js',
  'js/ui/ui.js',
  'assets/apple-touch-icon.png',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/icon-maskable-512.png',
  'assets/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== 'ascend-fonts').map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // stale-while-revalidate
    e.respondWith(
      caches.open(VERSION).then((cache) =>
        cache.match(req, { ignoreSearch: true }).then((hit) => {
          const net = fetch(req).then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit || (req.mode === 'navigate' ? cache.match('index.html') : undefined));
          return hit || net;
        })
      )
    );
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open('ascend-fonts').then((cache) => cache.match(req).then((hit) => hit || fetch(req).then((res) => { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; }).catch(() => hit)))
    );
  }
});

// Push (requiere servidor y claves VAPID: ver docs/NOTIFICACIONES.md). Sin servidor, este evento nunca llega.
self.addEventListener('push', (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (err) { data = { title: 'ASCEND', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(data.title || 'ASCEND', { body: data.body || '', icon: 'assets/icon-192.png', badge: 'assets/icon-192.png', data: { url: data.url || './index.html#/home' } }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || './index.html#/home';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) { if ('focus' in c) { c.navigate(target).catch(() => {}); return c.focus(); } }
    return self.clients.openWindow(target);
  }));
});

self.addEventListener('message', (e) => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
