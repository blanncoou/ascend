/* ASCEND · Lógica de hábitos, rachas y cumplimiento
 * Módulo puro (sin DOM). Reglas:
 *  - Un día solo cuenta para un hábito si estaba PROGRAMADO.
 *  - daily / weekdays: la racha son días programados consecutivos cumplidos; los no programados se saltean.
 *  - weekly (X veces por semana): la racha se mide en SEMANAS que alcanzaron la meta.
 *  - monthly (X veces por mes): igual que el semanal, medido en MESES. Ambos son "flexibles":
 *    están disponibles todos los días, suman el día que se hacen y nunca restan.
 *  - Pausa (h.pauses = [{ from, to }], to exclusivo o null): los días pausados no existen para el hábito
 *    (no se programan, no cuentan, no cortan rachas). El historial se conserva.
 *  - Con cantidad: qtyMin (mínimo) y qtyTarget (ideal). Se cumple al llegar al mínimo (o al ideal si no hay
 *    mínimo). h.tempMin = { value, from, until } reduce el mínimo por un tiempo (plan de recuperación).
 *  - Hoy, si todavía no se cumplió, no corta la racha.
 *  - Días antes de startDate o después de archivar no cuentan.
 *  - En el % diario, un hábito semanal solo suma el día que se hizo (nunca resta).
 *
 * Tipos de hábito (h.kind):
 *  - 'check':    sí / no.
 *  - 'quantity': con cantidad (ej. 2000 ml). Se registra en habitQty; se completa solo al llegar al objetivo.
 *  - 'negative': conducta a evitar. No se "marca": cuenta días sin recaídas. No entra en el % diario.
 *
 * Edición: toggle / setQty / logRelapse respetan ASC.rules (hoy + ventana de corrección).
 * Caché: dayStatus usa agregados por día (ASC.perf) y cada cambio invalida solo su día.
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  const D = () => ASC.dates;

  const CATEGORIES = [
    { id: 'salud', label: 'Salud' },
    { id: 'productividad', label: 'Productividad' },
    { id: 'estudio', label: 'Estudio' },
    { id: 'mentalidad', label: 'Mentalidad' },
    { id: 'bienestar', label: 'Bienestar' },
    { id: 'lectura', label: 'Lectura' },
    { id: 'organizacion', label: 'Organización' },
    { id: 'fitness', label: 'Fitness' },
    { id: 'finanzas', label: 'Finanzas personales' },
    { id: 'otros', label: 'Otros' },
  ];

  function categoryLabel(id) {
    const c = CATEGORIES.find((x) => x.id === id);
    return c ? c.label : 'Otros';
  }

  function isDone(state, habitId, key) {
    const l = state.habitLogs[habitId];
    return !!(l && l[key]);
  }

  /** ¿Estaba pausado ese día? */
  function isPaused(h, key) {
    return (h.pauses || []).some((p) => key >= p.from && (!p.to || key < p.to));
  }
  function pausedNow(h, key) {
    return (h.pauses || []).find((p) => key >= p.from && (!p.to || key < p.to)) || null;
  }

  /** ¿El hábito existe en esa fecha? (empezó, no estaba archivado ni pausado) */
  function isActiveOn(h, key) {
    if (key < h.startDate) return false;
    if (h.archivedAt && key >= h.archivedAt) return false;
    if (h.pauses && h.pauses.length && isPaused(h, key)) return false;
    return true;
  }

  /** Semanales y mensuales: disponibles todos los días, suman cuando se hacen */
  function isFlexible(h) {
    return h.freqType === 'weekly' || h.freqType === 'monthly';
  }

  function monthStartOf(key) {
    return key.slice(0, 8) + '01';
  }
  function monthDays(key) {
    const d = D().fromKey(monthStartOf(key));
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  }
  function monthCount(state, h, key) {
    const ms = monthStartOf(key);
    const l = state.habitLogs[h.id] || {};
    let n = 0;
    for (const k in l) if (l[k] && k.slice(0, 7) === ms.slice(0, 7)) n++;
    return n;
  }
  function monthTarget(h, key) {
    const ms = monthStartOf(key);
    let avail = 0;
    const n = monthDays(ms);
    for (let i = 0; i < n; i++) if (isActiveOn(h, D().addDays(ms, i))) avail++;
    return Math.min(h.timesPerMonth || 1, avail);
  }
  /** Avance del período de un hábito flexible: { count, target, unit } */
  function periodProgress(state, h, key) {
    if (h.freqType === 'monthly') return { count: monthCount(state, h, key), target: monthTarget(h, key), unit: 'mes' };
    return { count: weekCount(state, h, key), target: weekTarget(h, D().weekStart(key)), unit: 'semana' };
  }

  /** Mínimo efectivo de un hábito con cantidad en una fecha (considera reducciones temporales) */
  function effectiveMin(h, key) {
    const t = h.tempMin;
    if (t && t.value > 0 && key >= t.from && key <= t.until) return Number(t.value);
    return Number(h.qtyMin) > 0 ? Math.min(Number(h.qtyMin), Number(h.qtyTarget) || Infinity) : Number(h.qtyTarget) || 1;
  }
  /** ¿Llegó al ideal? (solo hábitos con cantidad) */
  function idealReached(state, h, key) {
    return h.kind === 'quantity' && Number(h.qtyTarget) > 0 && getQty(state, h.id, key) >= Number(h.qtyTarget);
  }

  /** ¿Estaba programado ese día? (los semanales están "disponibles" todos los días) */
  function isScheduled(h, key) {
    if (h.kind === 'negative') return false;
    if (!isActiveOn(h, key)) return false;
    if (h.freqType === 'weekdays') return (h.days || []).includes(D().weekday(key));
    return true; // daily, weekly y monthly
  }

  function weekCount(state, h, key) {
    const ws = D().weekStart(key);
    let n = 0;
    for (let i = 0; i < 7; i++) if (isDone(state, h.id, D().addDays(ws, i))) n++;
    return n;
  }

  /** Meta semanal ajustada si la semana tiene menos días disponibles (semana de inicio/archivo) */
  function weekTarget(h, weekStartKey) {
    let avail = 0;
    for (let i = 0; i < 7; i++) if (isActiveOn(h, D().addDays(weekStartKey, i))) avail++;
    return Math.min(h.timesPerWeek || 1, avail);
  }

  function frequencyLabel(h) {
    if (h.kind === 'negative') return 'Evitar · ' + (h.negGoalDays ? 'meta ' + h.negGoalDays + ' días' : 'sin meta de días');
    if (h.freqType === 'daily') return 'Todos los días';
    if (h.freqType === 'weekly') return h.timesPerWeek + ' veces por semana';
    if (h.freqType === 'monthly') return (h.timesPerMonth || 1) + ' veces por mes';
    const days = (h.days || []).slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
    if (days.length === 7) return 'Todos los días';
    return days.map((d) => D().DIAS_CORTOS[d]).join(' · ');
  }

  /** Hábitos para mostrar en la lista de un día */
  function habitsForDay(state, key) {
    return state.habits
      .filter((h) => h.kind !== 'negative')
      .filter((h) => !h.archivedAt || key < h.archivedAt)
      .filter((h) => isActiveOn(h, key))
      .filter((h) => {
        if (isFlexible(h)) {
          // se muestra si la meta del período aún no se cumplió o si se hizo ese día
          const pp = periodProgress(state, h, key);
          return isDone(state, h.id, key) || pp.count < pp.target;
        }
        return isScheduled(h, key);
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  /** Fracción de cumplimiento de un hábito en un día (0..1).
   *  - Hecho = 1. Con cantidad y sin terminar = cantidad / objetivo (tope 0,99 para no contradecir
   *    el registro "no cumplido", por ejemplo si el objetivo se bajó después de cerrar el día).
   */
  function habitFraction(state, h, key) {
    if (isDone(state, h.id, key)) return 1;
    if (h.kind === 'quantity') {
      const t = effectiveMin(h, key);
      const q = getQty(state, h.id, key);
      return t > 0 && q > 0 ? Math.min(0.99, q / t) : 0;
    }
    return 0;
  }

  /** Estado de un día para calendario y progreso.
   *  done/scheduled cuentan hábitos terminados (rachas, día perfecto, XP).
   *  progress suma el avance real (las cantidades parciales aportan su fracción) para el % del calendario. */
  function dayCounts(state, key) {
    let scheduled = 0;
    let done = 0;
    let progress = 0;
    for (const h of state.habits) {
      if (h.kind === 'negative' || !isActiveOn(h, key)) continue;
      const d = isDone(state, h.id, key);
      if (isFlexible(h)) {
        if (d) { scheduled++; done++; progress++; }
      } else if (isScheduled(h, key)) {
        scheduled++;
        if (d) done++;
        progress += habitFraction(state, h, key);
      }
    }
    return { scheduled, done, progress: Math.round(progress * 1000) / 1000 };
  }

  function dayStatus(state, key, todayKey) {
    todayKey = todayKey || D().today();
    const c = ASC.perf ? ASC.perf.dayGet(state, key, () => dayCounts(state, key)) : dayCounts(state, key);
    const scheduled = c.scheduled, done = c.done;
    let status;
    if (key > todayKey) status = 'future';
    else if (scheduled === 0) status = 'rest';
    else if (done === scheduled) status = 'full';
    else if (key === todayKey) status = 'pending';
    else if (done > 0) status = 'partial';
    else status = 'none';
    return { scheduled, done, pct: scheduled ? done / scheduled : 0, progress: c.progress, weighted: scheduled ? c.progress / scheduled : 0, status };
  }

  /** Progreso de hoy considerando todos los hábitos visibles hoy (incluye semanales pendientes) */
  function todayProgress(state, key) {
    const list = habitsForDay(state, key);
    const done = list.filter((h) => isDone(state, h.id, key)).length;
    return { total: list.length, done, pct: list.length ? done / list.length : 0, list };
  }

  /** Racha actual. Devuelve { value, unit: 'días' | 'semanas' } */
  function currentStreak(state, h, todayKey) {
    todayKey = todayKey || D().today();
    const end = h.archivedAt && h.archivedAt <= todayKey ? D().addDays(h.archivedAt, -1) : todayKey;
    if (end < h.startDate) return { value: 0, unit: h.freqType === 'weekly' ? 'semanas' : h.freqType === 'monthly' ? 'meses' : 'días' };

    if (h.freqType === 'monthly') {
      let n = 0;
      let ms = monthStartOf(end);
      const first = monthStartOf(h.startDate);
      let isCurrent = true;
      while (ms >= first) {
        const tgt = monthTarget(h, ms);
        const met = tgt > 0 && monthCount(state, h, ms) >= tgt;
        if (met) n++;
        else if (tgt > 0 && !(isCurrent && end === todayKey)) break;
        isCurrent = false;
        const d = D().fromKey(ms);
        ms = D().toKey(new Date(d.getFullYear(), d.getMonth() - 1, 1, 12));
      }
      return { value: n, unit: 'meses' };
    }

    if (h.freqType === 'weekly') {
      let n = 0;
      let ws = D().weekStart(end);
      const firstWs = D().weekStart(h.startDate);
      let isCurrent = true;
      while (ws >= firstWs) {
        const met = weekCount(state, h, ws) >= weekTarget(h, ws);
        if (met) n++;
        else if (!(isCurrent && end === todayKey)) break;
        isCurrent = false;
        ws = D().addDays(ws, -7);
      }
      return { value: n, unit: 'semanas' };
    }

    let n = 0;
    let k = end;
    let guard = 0;
    while (k >= h.startDate && guard++ < 5000) {
      if (isScheduled(h, k)) {
        if (isDone(state, h.id, k)) n++;
        else if (k !== todayKey) break;
      }
      k = D().addDays(k, -1);
    }
    return { value: n, unit: 'días' };
  }

  /** Mejor racha histórica */
  function bestStreak(state, h, todayKey) {
    todayKey = todayKey || D().today();
    const end = h.archivedAt && h.archivedAt <= todayKey ? D().addDays(h.archivedAt, -1) : todayKey;
    let best = 0;
    let cur = 0;
    if (h.freqType === 'monthly') {
      let ms = monthStartOf(h.startDate);
      const last = monthStartOf(end);
      while (ms <= last) {
        const tgt = monthTarget(h, ms);
        if (tgt > 0 && monthCount(state, h, ms) >= tgt) { cur++; best = Math.max(best, cur); }
        else if (tgt > 0 && ms !== last) cur = 0;
        const d = D().fromKey(ms);
        ms = D().toKey(new Date(d.getFullYear(), d.getMonth() + 1, 1, 12));
      }
      return { value: best, unit: 'meses' };
    }
    if (h.freqType === 'weekly') {
      let ws = D().weekStart(h.startDate);
      const last = D().weekStart(end);
      while (ws <= last) {
        if (weekCount(state, h, ws) >= weekTarget(h, ws)) { cur++; best = Math.max(best, cur); }
        else if (ws !== last) cur = 0;
        ws = D().addDays(ws, 7);
      }
      return { value: best, unit: 'semanas' };
    }
    for (const k of D().range(h.startDate, end)) {
      if (!isScheduled(h, k)) continue;
      if (isDone(state, h.id, k)) { cur++; best = Math.max(best, cur); }
      else if (k !== todayKey) cur = 0;
    }
    return { value: best, unit: 'días' };
  }

  /** Programados vs cumplidos de un hábito en un rango [from, to] */
  function habitRangeStats(state, h, from, to) {
    const start = from < h.startDate ? h.startDate : from;
    let scheduled = 0;
    let done = 0;
    if (start > to) return { scheduled, done, pct: 0 };
    if (h.freqType === 'weekly') {
      let ws = D().weekStart(start);
      while (ws <= to) {
        let avail = 0, cnt = 0;
        for (let i = 0; i < 7; i++) {
          const k = D().addDays(ws, i);
          if (k < start || k > to || !isActiveOn(h, k)) continue;
          avail++;
          if (isDone(state, h.id, k)) cnt++;
        }
        const target = Math.min(h.timesPerWeek || 1, avail);
        scheduled += target;
        done += Math.min(cnt, target);
        ws = D().addDays(ws, 7);
      }
    } else if (h.freqType === 'monthly') {
      // meta proporcional a los días del mes que caen dentro del rango
      let ms = monthStartOf(start);
      while (ms <= to) {
        const md = monthDays(ms);
        let avail = 0, cnt = 0;
        for (let i = 0; i < md; i++) {
          const k = D().addDays(ms, i);
          if (k < start || k > to || !isActiveOn(h, k)) continue;
          avail++;
          if (isDone(state, h.id, k)) cnt++;
        }
        const target = Math.min(avail, Math.round(((h.timesPerMonth || 1) * avail) / md));
        scheduled += target;
        done += Math.min(cnt, target);
        const d = D().fromKey(ms);
        ms = D().toKey(new Date(d.getFullYear(), d.getMonth() + 1, 1, 12));
      }
    } else {
      for (const k of D().range(start, to)) {
        if (!isScheduled(h, k)) continue;
        scheduled++;
        if (isDone(state, h.id, k)) done++;
      }
    }
    return { scheduled, done, pct: scheduled ? done / scheduled : 0 };
  }

  /** Cumplimiento global en un rango (suma de todos los hábitos) */
  function rangeStats(state, from, to) {
    let scheduled = 0, done = 0;
    for (const h of state.habits) {
      const s = habitRangeStats(state, h, from, to);
      scheduled += s.scheduled;
      done += s.done;
    }
    return { scheduled, done, pct: scheduled ? done / scheduled : 0 };
  }

  function totalCompletions(state, habitId) {
    const h = state.habits.find((x) => x.id === habitId);
    if (h && h.kind === 'negative') return 0;
    const l = state.habitLogs[habitId] || {};
    return Object.keys(l).filter((k) => l[k]).length;
  }

  function allCompletions(state) {
    let n = 0;
    for (const id in state.habitLogs) n += totalCompletions(state, id);
    return n;
  }

  function setLog(state, habitId, key, value) {
    if (!state.habitLogs[habitId]) state.habitLogs[habitId] = {};
    if (value) state.habitLogs[habitId][key] = true;
    else delete state.habitLogs[habitId][key];
    if (ASC.perf) ASC.perf.touchDay(state, key);
  }

  /**
   * Marca / desmarca respetando las reglas de edición.
   * Devuelve true/false (nuevo valor) o null si la fecha está cerrada o es futura.
   */
  function toggle(state, habitId, key, todayKey) {
    if (ASC.rules && !ASC.rules.canEdit(state, key, todayKey)) return null;
    const h = state.habits.find((x) => x.id === habitId);
    if (h && h.kind === 'negative') return null;
    if (h && h.kind === 'quantity') {
      const cur = getQty(state, habitId, key);
      return setQty(state, habitId, key, cur >= (h.qtyTarget || 1) ? 0 : h.qtyTarget, todayKey) === null ? null : isDone(state, habitId, key);
    }
    const value = !isDone(state, habitId, key);
    setLog(state, habitId, key, value);
    if (ASC.rules) ASC.rules.logCorrection(state, { type: 'habit', habitId, date: key, value }, todayKey);
    return value;
  }

  /** Sin reglas de edición: SOLO para importaciones, migraciones y pruebas */
  function forceToggle(state, habitId, key) {
    const value = !isDone(state, habitId, key);
    setLog(state, habitId, key, value);
    return value;
  }

  /* ---------- Hábitos con cantidad ---------- */
  function getQty(state, habitId, key) {
    const q = state.habitQty && state.habitQty[habitId];
    return (q && Number(q[key])) || 0;
  }

  /** Registra la cantidad del día (reemplaza). Devuelve la cantidad o null si la fecha está cerrada. */
  function setQty(state, habitId, key, value, todayKey) {
    if (ASC.rules && !ASC.rules.canEdit(state, key, todayKey)) return null;
    const h = state.habits.find((x) => x.id === habitId);
    if (!h) return null;
    if (!state.habitQty) state.habitQty = {};
    if (!state.habitQty[habitId]) state.habitQty[habitId] = {};
    const v = Math.max(0, Math.round((Number(value) || 0) * 100) / 100);
    if (v > 0) state.habitQty[habitId][key] = v;
    else delete state.habitQty[habitId][key];
    setLog(state, habitId, key, v >= effectiveMin(h, key));
    if (ASC.rules) ASC.rules.logCorrection(state, { type: 'qty', habitId, date: key, value: v }, todayKey);
    return v;
  }

  /** Si cambia el objetivo de cantidad, se recalcula solo lo que todavía es editable (no lo cerrado) */
  function resyncQty(state, h, todayKey) {
    if (h.kind !== 'quantity') return;
    const q = (state.habitQty && state.habitQty[h.id]) || {};
    const from = ASC.rules ? ASC.rules.oldestEditable(state, todayKey) : D().today();
    Object.keys(q).forEach((k) => { if (k >= from) setLog(state, h.id, k, q[k] >= effectiveMin(h, k)); });
  }

  /* ---------- Hábitos a evitar ---------- */
  function relapseDates(state, habitId) {
    return ((state.relapses && state.relapses[habitId]) || []).map((r) => r.date).sort();
  }

  function logRelapse(state, habitId, key, note, todayKey) {
    if (ASC.rules && !ASC.rules.canEdit(state, key, todayKey)) return null;
    if (!state.relapses) state.relapses = {};
    if (!state.relapses[habitId]) state.relapses[habitId] = [];
    const list = state.relapses[habitId];
    const existing = list.find((r) => r.date === key);
    if (existing) existing.note = note || existing.note;
    else list.push({ date: key, note: note || '', at: new Date().toISOString() });
    if (ASC.rules) ASC.rules.logCorrection(state, { type: 'relapse', habitId, date: key }, todayKey);
    return true;
  }

  function removeRelapse(state, habitId, key, todayKey) {
    if (ASC.rules && !ASC.rules.canEdit(state, key, todayKey)) return null;
    state.relapses[habitId] = (state.relapses[habitId] || []).filter((r) => r.date !== key);
    if (ASC.rules) ASC.rules.logCorrection(state, { type: 'relapse-removed', habitId, date: key }, todayKey);
    return true;
  }

  /** Días seguidos sin la conducta: desde el inicio o desde el día siguiente a la última recaída */
  function cleanStreak(state, h, todayKey) {
    todayKey = todayKey || D().today();
    const end = h.archivedAt && h.archivedAt <= todayKey ? h.archivedAt : todayKey;
    const rel = relapseDates(state, h.id).filter((d) => d <= end);
    const startClean = rel.length ? D().addDays(rel[rel.length - 1], 1) : h.startDate;
    const current = Math.max(0, D().diffDays(startClean, end));
    // mejor racha: tramos entre recaídas
    let best = current, prev = h.startDate;
    rel.forEach((d) => { best = Math.max(best, D().diffDays(prev, d)); prev = D().addDays(d, 1); });
    return { current, best, relapses: rel.length, lastRelapse: rel.length ? rel[rel.length - 1] : null, since: startClean };
  }

  /* ---------- Momento del día ---------- */
  const TIMES_OF_DAY = [['manana', 'Mañana'], ['tarde', 'Tarde'], ['noche', 'Noche'], ['', 'Cualquier momento']];
  /** Momento del día: el elegido, o se deduce del horario del recordatorio */
  function timeOfDay(h) {
    if (h.timeOfDay !== undefined && h.timeOfDay !== null && h.timeOfDay !== 'auto') return h.timeOfDay;
    const t = h.reminderTime;
    if (!t) return '';
    const hh = Number(t.slice(0, 2));
    return hh < 12 ? 'manana' : hh < 19 ? 'tarde' : 'noche';
  }

  /* ---------- Pausas ---------- */
  /** Pausa un hábito desde una fecha (opcionalmente hasta otra, exclusiva). No borra nada. */
  function pause(state, h, from, to) {
    h.pauses = (h.pauses || []).filter((p) => p.to && p.to <= from); // reemplaza pausas abiertas o futuras
    h.pauses.push({ from, to: to || null });
    h.updatedAt = new Date().toISOString();
    if (ASC.perf) ASC.perf.reset();
  }
  /** Reanuda: cierra la pausa abierta en la fecha indicada */
  function resume(state, h, key) {
    (h.pauses || []).forEach((p) => { if (key >= p.from && (!p.to || key < p.to)) p.to = key; });
    h.pauses = (h.pauses || []).filter((p) => p.to > p.from);
    h.updatedAt = new Date().toISOString();
    if (ASC.perf) ASC.perf.reset();
  }

  ASC.habits = {
    CATEGORIES, categoryLabel, isDone, isActiveOn, isScheduled, weekCount, weekTarget, isPaused, pausedNow, isFlexible,
    monthCount, monthTarget, periodProgress, effectiveMin, idealReached, TIMES_OF_DAY, timeOfDay, pause, resume,
    frequencyLabel, habitsForDay, dayStatus, habitFraction, todayProgress, currentStreak, bestStreak,
    habitRangeStats, rangeStats, totalCompletions, allCompletions, toggle, forceToggle,
    getQty, setQty, resyncQty, relapseDates, logRelapse, removeRelapse, cleanStreak, dayCounts,
  };
})(typeof window !== 'undefined' ? window : globalThis);
