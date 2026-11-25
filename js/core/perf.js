/* ASCEND · Caché de cálculos con invalidación explícita
 *
 * Los datos originales (registros) siguen siendo la única fuente de verdad. Acá solo se guardan
 * resultados derivados, siempre con una regla clara de invalidación:
 *
 *  1) memo(state, key, fn): resultados completos (XP, rachas, logros, récords) válidos mientras no cambie
 *     la revisión del store. Cada guardado incrementa la revisión → se recalcula una vez y se reutiliza
 *     en todos los componentes de esa pantalla. Solo aplica al estado activo de la app (no a copias de prueba).
 *
 *  2) Agregados por día (programados / cumplidos): se recalcula SOLO el día que cambió.
 *     - Marcar/desmarcar un hábito, registrar cantidad o una recaída → touchDay(fecha).
 *     - Crear, editar, archivar o borrar hábitos → cambia la "firma" de hábitos → se vacía la caché diaria.
 *     - Importar, restaurar o borrar todo → reset().
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  let memoCache = new Map();
  let memoRev = -1;
  let dayCaches = new WeakMap(); // state → { sig, days: Map }
  const stats = { memoHits: 0, memoMiss: 0, dayHits: 0, dayMiss: 0 };

  function isLive(state) {
    return ASC.store && state === ASC.store.get();
  }

  function memo(state, key, fn) {
    if (!isLive(state)) return fn();
    const rev = ASC.store.revision();
    if (rev !== memoRev) { memoCache = new Map(); memoRev = rev; }
    if (memoCache.has(key)) { stats.memoHits++; return memoCache.get(key); }
    stats.memoMiss++;
    const v = fn();
    memoCache.set(key, v);
    return v;
  }

  /** Firma de la definición de los hábitos: si cambia, los agregados diarios dejan de valer */
  function habitsSig(state) {
    let s = '';
    for (const h of state.habits) s += h.id + '|' + h.kind + '|' + h.startDate + '|' + (h.archivedAt || '') + '|' + h.freqType + '|' + (h.days || []).join(',') + '|' + h.timesPerWeek + '|' + (h.qtyTarget || '') + '|' + (h.qtyMin || '') + '|' + (h.timesPerMonth || '') + '|' + JSON.stringify(h.pauses || []) + '|' + JSON.stringify(h.tempMin || '') + ';';
    return s;
  }

  function dayCache(state) {
    const sig = memo(state, 'habitsSig', () => habitsSig(state));
    let c = dayCaches.get(state);
    if (!c || c.sig !== sig) { c = { sig, days: new Map() }; dayCaches.set(state, c); }
    return c.days;
  }

  function dayGet(state, key, compute) {
    const days = dayCache(state);
    if (days.has(key)) { stats.dayHits++; return days.get(key); }
    stats.dayMiss++;
    const v = compute();
    days.set(key, v);
    return v;
  }

  function touchDay(state, key) {
    const c = dayCaches.get(state);
    if (c) c.days.delete(key);
  }

  function reset() {
    memoCache = new Map();
    memoRev = -1;
    dayCaches = new WeakMap();
  }

  ASC.perf = { memo, dayGet, touchDay, reset, stats };
})(typeof window !== 'undefined' ? window : globalThis);
