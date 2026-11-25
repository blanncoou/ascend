/* ASCEND · Reglas de edición (lógica de negocio, no solo interfaz)
 *
 * - Se puede completar / modificar HOY y corregir hasta `editWindowDays` días anteriores (por defecto 1 = ayer).
 * - Las fechas más antiguas quedan CERRADAS: toggle(), setQty() y logRelapse() las rechazan.
 * - Todo cambio sobre un día anterior queda registrado en state.corrections.
 * - Las fechas son siempre la fecha LOCAL del usuario ("YYYY-MM-DD"), nunca UTC:
 *   un registro a las 00:30 cuenta para el día que el usuario ve en su reloj.
 * - El límite es configurable (settings.editWindowDays, de 0 a 7) para ajustarlo en el futuro.
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  const D = () => ASC.dates;
  const MAX_WINDOW = 7;
  const MAX_LOG = 500;

  function windowDays(state) {
    const n = Number(state && state.settings && state.settings.editWindowDays);
    return isNaN(n) ? 1 : Math.max(0, Math.min(MAX_WINDOW, Math.floor(n)));
  }

  /** 'future' | 'open' | 'closed' */
  function dateStatus(state, key, todayKey) {
    todayKey = todayKey || D().today();
    if (key > todayKey) return 'future';
    return D().diffDays(key, todayKey) <= windowDays(state) ? 'open' : 'closed';
  }

  function canEdit(state, key, todayKey) {
    return dateStatus(state, key, todayKey) === 'open';
  }

  /** Último día que todavía se puede corregir */
  function oldestEditable(state, todayKey) {
    return D().addDays(todayKey || D().today(), -windowDays(state));
  }

  function logCorrection(state, entry, todayKey) {
    todayKey = todayKey || D().today();
    if (!entry.date || entry.date >= todayKey) return;
    if (!Array.isArray(state.corrections)) state.corrections = [];
    state.corrections.push(Object.assign({ at: new Date().toISOString() }, entry));
    if (state.corrections.length > MAX_LOG) state.corrections.splice(0, state.corrections.length - MAX_LOG);
  }

  function closedMessage(state) {
    const n = windowDays(state);
    return n === 0 ? 'Solo se puede registrar el día de hoy.' : n === 1 ? 'Ese día está cerrado: podés corregir hasta ayer.' : 'Ese día está cerrado: podés corregir hasta ' + n + ' días atrás.';
  }

  ASC.rules = { windowDays, dateStatus, canEdit, oldestEditable, logCorrection, closedMessage, MAX_WINDOW };
})(typeof window !== 'undefined' ? window : globalThis);
