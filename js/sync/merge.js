/* ASCEND · Combinación de datos entre dispositivos (módulo puro, probado sin servidor)
 *
 * Se usa cuando el mismo usuario modificó datos en dos dispositivos antes de sincronizar.
 * Reglas:
 *  - Entidades con id (hábitos, objetivos, tareas, diario, rutinas, entrenamientos, ejercicios, mediciones):
 *    unión por id; si existe en ambos, gana la de `updatedAt` más reciente (si no hay, la local).
 *  - Lo borrado en cualquiera de los dos (lápidas en state.deleted) no vuelve a aparecer.
 *  - Registros de hábitos: unión de días marcados (marcar en un dispositivo no se pierde).
 *    Limitación conocida: desmarcar en un dispositivo mientras el otro lo tenía marcado → queda marcado.
 *  - Cantidades: el mayor valor del día. Recaídas, comodines y correcciones: unión sin duplicados.
 *  - Ánimo: por día, el registro más reciente. Actividades de rutinas: unión. Desafíos mensuales: se conserva el congelado.
 *  - Perfil, ajustes, plan de recuperación y estado de interfaz: los del dispositivo local.
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  const ENTITY_ARRAYS = ['habits', 'goals', 'tasks', 'journal', 'exercises', 'routines', 'sessions', 'bodyMetrics', 'habitRoutines', 'focusSessions', 'rewards'];
  const clone = (x) => JSON.parse(JSON.stringify(x));

  function mergeEntities(a, b, deleted) {
    const map = new Map();
    (b || []).forEach((x) => x && x.id && map.set(x.id, x));
    (a || []).forEach((x) => {
      if (!x || !x.id) return;
      const other = map.get(x.id);
      if (!other) return map.set(x.id, x);
      const ta = x.updatedAt || '', tb = other.updatedAt || '';
      map.set(x.id, tb > ta ? other : x);
    });
    return Array.from(map.values()).filter((x) => !deleted[x.id]);
  }

  function mergeDayMaps(a, b, pick) {
    const out = clone(a || {});
    for (const id in b || {}) {
      out[id] = out[id] || {};
      for (const k in b[id]) out[id][k] = out[id][k] === undefined ? b[id][k] : pick(out[id][k], b[id][k]);
    }
    return out;
  }

  function mergeStates(local, remote) {
    if (!remote) return clone(local);
    if (!local) return clone(remote);
    const out = clone(local);
    const deleted = Object.assign({}, remote.deleted || {}, local.deleted || {});
    out.deleted = deleted;
    ENTITY_ARRAYS.forEach((k) => (out[k] = mergeEntities(local[k], remote[k], deleted)));
    out.habitLogs = mergeDayMaps(local.habitLogs, remote.habitLogs, (x, y) => x || y);
    out.habitQty = mergeDayMaps(local.habitQty, remote.habitQty, (x, y) => Math.max(Number(x) || 0, Number(y) || 0));
    out.relapses = {};
    new Set(Object.keys(local.relapses || {}).concat(Object.keys(remote.relapses || {}))).forEach((id) => {
      const byDate = new Map();
      ((remote.relapses || {})[id] || []).concat((local.relapses || {})[id] || []).forEach((r) => byDate.set(r.date, r));
      out.relapses[id] = Array.from(byDate.values()).sort((x, y) => (x.date < y.date ? -1 : 1));
    });
    const fz = new Map();
    (((remote.freezes || {}).used) || []).concat(((local.freezes || {}).used) || []).forEach((f) => fz.set(f.date, f));
    out.freezes = { used: Array.from(fz.values()).sort((x, y) => (x.date < y.date ? -1 : 1)) };
    const corr = new Map();
    (remote.corrections || []).concat(local.corrections || []).forEach((c) => corr.set(c.at + '|' + c.date + '|' + c.type + '|' + (c.habitId || ''), c));
    out.corrections = Array.from(corr.values()).sort((x, y) => (x.at < y.at ? -1 : 1)).slice(-500);
    out.weeks = Object.assign({}, remote.weeks || {});
    for (const ws in local.weeks || {}) {
      const l = local.weeks[ws], r = out.weeks[ws];
      out.weeks[ws] = !r ? l : { missions: l.missions || r.missions, plan: l.plan || r.plan, final: l.final || r.final };
    }
    out.achievementsSeen = Object.assign({}, remote.achievementsSeen || {}, local.achievementsSeen || {});
    // v3: ánimo por día (gana el registro más reciente), actividades de rutinas (unión), meses (se conserva el congelado)
    out.moodLog = Object.assign({}, remote.moodLog || {});
    Object.keys(local.moodLog || {}).forEach((k) => { const a = local.moodLog[k], b = out.moodLog[k]; out.moodLog[k] = !b || (a.at || '') >= (b.at || '') ? a : b; });
    out.routineLogs = {};
    new Set(Object.keys(local.routineLogs || {}).concat(Object.keys(remote.routineLogs || {}))).forEach((rid) => {
      const a = (local.routineLogs || {})[rid] || {}, b = (remote.routineLogs || {})[rid] || {};
      out.routineLogs[rid] = {};
      new Set(Object.keys(a).concat(Object.keys(b))).forEach((k) => (out.routineLogs[rid][k] = Array.from(new Set((a[k] || []).concat(b[k] || [])))));
    });
    out.months = Object.assign({}, remote.months || {});
    Object.keys(local.months || {}).forEach((mk) => { const a = local.months[mk], b = out.months[mk]; out.months[mk] = b && b.final && !a.final ? b : a; });
    // la sesión de entrenamiento en curso es del dispositivo local
    if (out.activeSessionId && !out.sessions.some((s) => s.id === out.activeSessionId)) out.activeSessionId = null;
    if (local.createdAt && remote.createdAt) out.createdAt = local.createdAt < remote.createdAt ? local.createdAt : remote.createdAt;
    return out;
  }

  /** Marca un borrado para que la sincronización no lo "reviva" */
  function markDeleted(state, id) {
    if (!state.deleted) state.deleted = {};
    state.deleted[id] = new Date().toISOString();
  }

  ASC.merge = { mergeStates, markDeleted };
})(typeof window !== 'undefined' ? window : globalThis);
