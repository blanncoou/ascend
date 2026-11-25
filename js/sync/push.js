/* ASCEND · Notificaciones push — PREPARADO, NO ACTIVO
 *
 * Para recibir recordatorios con la app CERRADA hace falta un servidor que envíe mensajes push
 * (Web Push con claves VAPID). Sin servidor, este módulo informa que no está disponible y la app
 * usa avisos locales mientras está abierta (o en segundo plano reciente). Ver docs/NOTIFICACIONES.md.
 *
 * iOS / Safari: las notificaciones web solo funcionan en iOS 16.4 o posterior y únicamente si la app
 * se instaló en la pantalla de inicio ("Agregar a inicio"). En Safari como pestaña, no.
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});

  function cfg() {
    return (ASC.config && ASC.config.push) || {};
  }

  function capabilities() {
    const hasSW = 'serviceWorker' in navigator && /^https?:$/.test(location.protocol);
    const hasPush = hasSW && 'PushManager' in root;
    const hasNotif = 'Notification' in root;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    return {
      local: hasNotif,
      permission: hasNotif ? Notification.permission : 'unsupported',
      pushSupported: hasPush && (!ios || standalone),
      pushConfigured: !!(cfg().vapidPublicKey && cfg().subscribeEndpoint),
      ios, standalone,
    };
  }

  function b64ToUint8(b64) {
    const pad = '='.repeat((4 - (b64.length % 4)) % 4);
    const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(raw, (c) => c.charCodeAt(0));
  }

  /** Suscribe este dispositivo al servidor de push (solo si está configurado) */
  async function subscribe(habitsSchedule) {
    const cap = capabilities();
    if (!cap.pushConfigured) return { ok: false, reason: 'No hay servidor de notificaciones configurado.' };
    if (!cap.pushSupported) return { ok: false, reason: cap.ios ? 'En iPhone, instalá la app en la pantalla de inicio (iOS 16.4+).' : 'Este navegador no soporta notificaciones push.' };
    if (Notification.permission !== 'granted' && (await Notification.requestPermission()) !== 'granted') return { ok: false, reason: 'Permiso de notificaciones denegado.' };
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(cfg().vapidPublicKey) }));
    const res = await fetch(cfg().subscribeEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub, schedule: habitsSchedule || [], tz: Intl.DateTimeFormat().resolvedOptions().timeZone }) });
    if (!res.ok) return { ok: false, reason: 'El servidor rechazó la suscripción.' };
    return { ok: true };
  }

  ASC.push = { capabilities, subscribe };
})(typeof window !== 'undefined' ? window : globalThis);
