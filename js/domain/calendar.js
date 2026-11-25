/* ASCEND · Calendario de progreso (lógica pura, sin DOM)
 *
 * Reutiliza el cálculo diario existente (ASC.habits.dayStatus, con caché por día en ASC.perf):
 *  - Solo cuentan los hábitos programados ese día; los semanales suman el día que se hicieron.
 *  - Los hábitos con cantidad aportan su fracción real (4 de 8 vasos = 0,5).
 *  - Hábitos archivados: cuentan hasta la fecha de archivo. Hábitos para evitar: no entran en el %.
 *  - Sin hábitos programados = "sin registros" (no es 0 %). Días futuros: sin color y fuera de las estadísticas.
 *  - Hoy, mientras no esté completo, se muestra con su avance pero no entra en las estadísticas
 *    del período (el día todavía no terminó).
 * Nada de este módulo escribe datos.
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  const D = () => ASC.dates;
  const H = () => ASC.habits;

  const VIEWS = [
    { id: 'week', label: 'Semana', short: 'Sem', months: 0 },
    { id: 'month', label: 'Mes', short: 'Mes', months: 1 },
    { id: '3m', label: '3 meses', short: '3 m', months: 3 },
    { id: '6m', label: '6 meses', short: '6 m', months: 6 },
    { id: '12m', label: '12 meses', short: '12 m', months: 12 },
  ];

  /** Nivel de la escala (para leyenda, accesibilidad y pruebas) */
  function bucket(pct) {
    if (pct >= 1) return 5;
    if (pct >= 0.75) return 4;
    if (pct >= 0.5) return 3;
    if (pct >= 0.25) return 2;
    if (pct > 0) return 1;
    return 0;
  }
  const BUCKET_LABEL = ['0 %', '1–24 %', '25–49 %', '50–74 %', '75–99 %', '100 %'];

  /** Intensidad continua: opacidad del rojo según el %, con saltos claros entre niveles */
  function alpha(pct) {
    if (pct <= 0) return 0;
    if (pct >= 1) return 1;
    return Math.round((0.14 + 0.66 * pct) * 1000) / 1000; // 1 % → 0,15 · 50 % → 0,47 · 99 % → 0,79 · 100 % → rojo pleno
  }

  /** Información de un día (usa la caché diaria) */
  function dayInfo(state, key, todayKey) {
    todayKey = todayKey || D().today();
    if (key > todayKey) return { key, kind: 'future', scheduled: 0, done: 0, progress: 0, pct: 0, bucket: null, counted: false };
    const s = H().dayStatus(state, key, todayKey);
    if (!s.scheduled) return { key, kind: 'empty', scheduled: 0, done: 0, progress: 0, pct: 0, bucket: null, counted: false, isToday: key === todayKey };
    const pct = Math.min(1, s.weighted);
    const isToday = key === todayKey;
    const counted = !isToday || pct >= 1; // hoy solo cuenta si ya está completo
    return {
      key, kind: pct >= 1 ? 'full' : pct > 0 ? 'partial' : isToday ? 'pending' : 'zero',
      scheduled: s.scheduled, done: s.done, progress: s.progress, pct, bucket: bucket(pct), counted, isToday,
    };
  }

  /* ---------- Períodos ---------- */
  function monthStart(key) {
    return key.slice(0, 8) + '01';
  }
  function addMonths(key, n) {
    const d = D().fromKey(monthStart(key));
    return D().toKey(new Date(d.getFullYear(), d.getMonth() + n, 1, 12));
  }
  function monthEnd(key) {
    return D().addDays(addMonths(key, 1), -1);
  }

  /** Rango del período: semana (lun–dom), mes, o N meses que terminan en el mes del ancla */
  function period(view, anchor) {
    if (view === 'week') {
      const from = D().weekStart(anchor);
      return { view, from, to: D().addDays(from, 6), months: [] };
    }
    const n = (VIEWS.find((v) => v.id === view) || VIEWS[1]).months;
    const last = monthStart(anchor);
    const months = [];
    for (let i = n - 1; i >= 0; i--) months.push(addMonths(last, -i));
    return { view, from: months[0], to: monthEnd(last), months };
  }

  /** Ancla del período anterior / siguiente */
  function shift(view, anchor, dir) {
    if (view === 'week') return D().addDays(D().weekStart(anchor), 7 * dir);
    const n = (VIEWS.find((v) => v.id === view) || VIEWS[1]).months;
    return addMonths(anchor, n * dir);
  }

  function periodLabel(p) {
    const M = D().MESES, MC = D().MESES_CORTOS;
    const a = D().fromKey(p.from), b = D().fromKey(p.to);
    if (p.view === 'week') {
      return a.getMonth() === b.getMonth()
        ? a.getDate() + '–' + b.getDate() + ' de ' + M[b.getMonth()] + ' ' + b.getFullYear()
        : a.getDate() + ' ' + MC[a.getMonth()] + ' – ' + b.getDate() + ' ' + MC[b.getMonth()] + ' ' + b.getFullYear();
    }
    if (p.view === 'month') return D().monthLabel(a.getFullYear(), a.getMonth());
    return MC[a.getMonth()] + (a.getFullYear() !== b.getFullYear() ? ' ' + a.getFullYear() : '') + ' – ' + MC[b.getMonth()] + ' ' + b.getFullYear();
  }

  /* ---------- Resumen del período (mismos datos que las celdas) ---------- */
  function summary(state, from, to, todayKey) {
    todayKey = todayKey || D().today();
    const compute = () => {
      let counted = 0, sum = 0, full = 0, partial = 0, zero = 0, empty = 0, future = 0;
      let best = null;
      const end = to < todayKey ? to : todayKey;
      const startK = ASC.progress ? ASC.progress.startKey(state) : from;
      if (from <= end) {
        for (const k of D().range(from, end)) {
          const d = dayInfo(state, k, todayKey);
          if (d.kind === 'empty') { if (k >= startK) empty++; continue; } // antes de empezar a usar la app no se informa
          if (!d.counted) continue;
          counted++;
          sum += d.pct;
          if (d.pct >= 1) full++;
          else if (d.pct > 0) partial++;
          else zero++;
          if (!best || d.pct > best.pct || (d.pct === best.pct && d.done > best.done) || (d.pct === best.pct && d.done === best.done && k > best.key)) best = { key: k, pct: d.pct, done: d.done, scheduled: d.scheduled };
        }
      }
      if (to > todayKey) future = D().diffDays(from > todayKey ? from : todayKey, to) + (from > todayKey ? 1 : 0);
      const includesToday = from <= todayKey && todayKey <= to;
      return {
        from, to, counted, avg: counted ? sum / counted : null, full, partial, zero, empty, future, best,
        streak: includesToday && ASC.progress ? ASC.progress.consistencyStreak(state, todayKey) : null,
        includesToday,
      };
    };
    return ASC.perf ? ASC.perf.memo(state, 'calsum:' + from + ':' + to + ':' + todayKey, compute) : compute();
  }

  /* ---------- XP del día (misma fórmula que el total de XP) ---------- */
  function dayXP(state, key, todayKey) {
    todayKey = todayKey || D().today();
    const X = ASC.XP;
    const rows = [];
    if (key > todayKey) return { total: 0, rows };
    const s = H().dayStatus(state, key, todayKey);
    const habits = Math.min(X.habitDailyCap, s.done);
    if (habits) rows.push({ label: habits === 1 ? '1 hábito' : habits + ' hábitos' + (s.done > X.habitDailyCap ? ' (tope diario)' : ''), xp: habits * X.habit });
    if (s.status === 'full' && s.scheduled >= X.perfectMinHabits) rows.push({ label: 'Día perfecto', xp: X.perfectDay });
    if (state.journal.some((j) => j.date === key)) rows.push({ label: 'Diario', xp: X.journalDay });
    const sessions = ASC.gym ? ASC.gym.completedSessions(state).filter((x) => ASC.gym.sessionDateKey(x) === key) : [];
    const wo = Math.min(X.workoutDailyCap, sessions.length);
    if (wo) rows.push({ label: wo === 1 ? 'Entrenamiento' : wo + ' entrenamientos', xp: wo * X.workout });
    const prs = sessions.reduce((a, x) => a + Math.min(X.prPerSessionCap, ASC.gym.sessionPRs(state, x).length), 0);
    if (prs) rows.push({ label: prs === 1 ? 'Récord personal' : prs + ' récords personales', xp: prs * X.pr });
    return { total: rows.reduce((a, r) => a + r.xp, 0), rows };
  }

  /* ---------- Detalle de un día (solo lectura) ---------- */
  function dayDetail(state, key, todayKey) {
    todayKey = todayKey || D().today();
    const info = dayInfo(state, key, todayKey);
    const done = [], pending = [], qty = [];
    state.habits.forEach((h) => {
      if (h.kind === 'negative' || !H().isActiveOn(h, key)) return;
      const isDone = H().isDone(state, h.id, key);
      const weekly = H().isFlexible(h);
      const counts = weekly ? isDone : H().isScheduled(h, key);
      if (!counts) return;
      const frac = H().habitFraction(state, h, key);
      if (h.kind === 'quantity') qty.push({ habit: h, value: H().getQty(state, h.id, key), target: H().effectiveMin(h, key), ideal: Number(h.qtyTarget) || 0, unit: h.qtyUnit || '', frac });
      (isDone ? done : pending).push({ habit: h, frac });
    });
    const sortFn = (a, b) => (a.habit.order || 0) - (b.habit.order || 0);
    done.sort(sortFn); pending.sort(sortFn);
    return {
      info, done, pending, qty,
      xp: dayXP(state, key, todayKey),
      journal: state.journal.filter((j) => j.date === key),
      relapses: state.habits.filter((h) => h.kind === 'negative' && H().relapseDates(state, h.id).includes(key)).map((h) => h.name),
      workouts: ASC.gym ? ASC.gym.completedSessions(state).filter((x) => ASC.gym.sessionDateKey(x) === key) : [],
      editable: ASC.rules ? key <= todayKey && ASC.rules.canEdit(state, key, todayKey) : false,
    };
  }

  ASC.calendar = { VIEWS, BUCKET_LABEL, bucket, alpha, dayInfo, period, shift, periodLabel, summary, dayXP, dayDetail, addMonths, monthStart, monthEnd };
})(typeof window !== 'undefined' ? window : globalThis);
