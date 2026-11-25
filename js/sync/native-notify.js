/* ASCEND · Notificaciones nativas (Capacitor LocalNotifications) — PREPARADO, se activa solo en la app
 *
 * En la web este módulo no hace nada (available() = false). Cuando ASCEND se empaquete con Capacitor y el
 * plugin @capacitor/local-notifications esté instalado, los mensajes motivacionales se programan en el
 * sistema para los próximos 14 días y llegan con la app cerrada. Cada vez que cambian las preferencias o
 * se abre la app, se reprograman.
 * No probado en un dispositivo todavía (no hay compilación nativa en este entorno).
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  const ID_BASE = 7000; // rango reservado para mensajes motivacionales: 7000–7999
  let perm = 'default';

  function plugin() {
    const C = root.Capacitor;
    return C && C.isNativePlatform && C.isNativePlatform() && C.Plugins && C.Plugins.LocalNotifications ? C.Plugins.LocalNotifications : null;
  }
  function available() { return !!plugin(); }
  function lastPermission() { return perm; }

  async function check() {
    const P = plugin();
    if (!P) return 'unsupported';
    const r = await P.checkPermissions();
    perm = r.display === 'granted' ? 'granted' : r.display === 'denied' ? 'denied' : 'default';
    return perm;
  }
  async function request() {
    const P = plugin();
    if (!P) return 'unsupported';
    const r = await P.requestPermissions();
    perm = r.display === 'granted' ? 'granted' : r.display === 'denied' ? 'denied' : 'default';
    return perm;
  }

  /** Cancela lo programado y vuelve a programar según la configuración actual */
  async function resync(state) {
    const P = plugin();
    if (!P) return { ok: false, reason: 'unsupported' };
    try {
      await check();
      const pending = await P.getPending();
      const mine = (pending.notifications || []).filter((n) => n.id >= ID_BASE && n.id < ID_BASE + 1000);
      if (mine.length) await P.cancel({ notifications: mine.map((n) => ({ id: n.id })) });
      const s = ASC.motivation.settings(state);
      if (!s.enabled || perm !== 'granted') return { ok: true, scheduled: 0 };
      const list = ASC.motivation.scheduleAhead(state, new Date(), 14).slice(0, 60);
      await P.schedule({ notifications: list.map((m, i) => ({ id: ID_BASE + i, title: 'ASCEND', body: m.text, schedule: { at: m.at, allowWhileIdle: true } })) });
      state.motivationScheduled = { at: new Date().toISOString(), count: list.length };
      return { ok: true, scheduled: list.length };
    } catch (e) {
      state.motivationScheduled = { at: new Date().toISOString(), error: String(e && e.message || e) };
      return { ok: false, reason: 'error', error: e };
    }
  }

  ASC.nativeNotify = { available, lastPermission, check, request, resync, ID_BASE };
})(typeof window !== 'undefined' ? window : globalThis);
