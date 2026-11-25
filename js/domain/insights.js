/* ASCEND · Estadísticas que enseñan algo
 * Reglas: con pocos datos no se sacan conclusiones (se informa "todavía no hay suficiente historial");
 * las relaciones son ASOCIACIONES OBSERVADAS, nunca causas.
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  const D = () => ASC.dates;
  const H = () => ASC.habits;
  const MIN_DAYS_PER_WEEKDAY = 3; // al menos 3 lunes, 3 martes… con hábitos programados
  const MIN_SCHED_PER_HABIT = 7;
  const MIN_MOOD_PER_GROUP = 4;

  /** Cumplimiento por día de la semana en las últimas 12 semanas */
  function byWeekday(state, todayKey) {
    todayKey = todayKey || D().today();
    const acc = [0, 1, 2, 3, 4, 5, 6].map((d) => ({ day: d, scheduled: 0, done: 0, days: 0 }));
    for (const k of D().range(D().addDays(todayKey, -84), D().addDays(todayKey, -1))) {
      const st = H().dayStatus(state, k, todayKey);
      if (!st.scheduled) continue;
      const a = acc[D().weekday(k)];
      a.scheduled += st.scheduled; a.done += st.done; a.days++;
    }
    const valid = acc.filter((a) => a.days >= MIN_DAYS_PER_WEEKDAY).map((a) => Object.assign(a, { pct: a.done / a.scheduled }));
    if (valid.length < 4) return { enough: false, all: acc };
    const sorted = valid.slice().sort((a, b) => b.pct - a.pct);
    return { enough: true, all: acc.map((a) => Object.assign(a, { pct: a.scheduled ? a.done / a.scheduled : null })), best: sorted[0], worst: sorted[sorted.length - 1] };
  }

  /** Hábitos más constantes y los que suelen quedar pendientes (30 días) */
  function habitRanking(state, todayKey) {
    todayKey = todayKey || D().today();
    const rows = state.habits.filter((h) => !h.archivedAt && h.kind !== 'negative').map((h) => ({ h, s: H().habitRangeStats(state, h, D().addDays(todayKey, -30), D().addDays(todayKey, -1)) }))
      .filter((r) => r.s.scheduled >= MIN_SCHED_PER_HABIT);
    if (rows.length < 2) return { enough: false };
    rows.sort((a, b) => b.s.pct - a.s.pct);
    return { enough: true, top: rows.filter((r) => r.s.pct >= 0.7).slice(0, 3), pending: rows.slice().reverse().filter((r) => r.s.pct < 0.7).slice(0, 3) };
  }

  /** Cambio de constancia: últimas 4 semanas vs. las 4 anteriores */
  function trend(state, todayKey) {
    todayKey = todayKey || D().today();
    const end = D().addDays(todayKey, -1);
    const a = H().rangeStats(state, D().addDays(end, -27), end);
    const b = H().rangeStats(state, D().addDays(end, -55), D().addDays(end, -28));
    if (a.scheduled < 14 || b.scheduled < 14) return { enough: false };
    return { enough: true, recent: a.pct, previous: b.pct, delta: a.pct - b.pct };
  }

  /** Estado de ánimo en días con y sin entrenamiento (asociación, no causa) */
  function moodVsTraining(state) {
    const days = new Set(ASC.gym.completedSessions(state).map((s) => ASC.gym.sessionDateKey(s)));
    const withW = [], without = [];
    if (ASC.wellbeing) {
      const keys = new Set(Object.keys(state.moodLog || {}).concat(state.journal.filter((j) => j.mood > 0).map((j) => j.date)));
      keys.forEach((k) => { const m = ASC.wellbeing.moodFor(state, k); if (m) (days.has(k) ? withW : without).push(m); });
    } else state.journal.filter((j) => j.mood > 0).forEach((j) => (days.has(j.date) ? withW : without).push(j.mood));
    const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
    if (withW.length < MIN_MOOD_PER_GROUP || without.length < MIN_MOOD_PER_GROUP) return { enough: false, withN: withW.length, withoutN: without.length, need: MIN_MOOD_PER_GROUP };
    return { enough: true, withAvg: avg(withW), withoutAvg: avg(without), withN: withW.length, withoutN: without.length };
  }

  /* ---------- v3: estadísticas avanzadas (todas con el % real del calendario) ---------- */
  const pctTxt = (p) => Math.round(p * 100) + '\u00a0%';

  /** Promedio de cumplimiento por mes (últimos n meses, incluido el actual) */
  function monthlyEvolution(state, todayKey, n) {
    todayKey = todayKey || D().today();
    const C = ASC.calendar;
    const out = [];
    for (let i = (n || 6) - 1; i >= 0; i--) {
      const mk = C.addMonths(todayKey, -i);
      const s = C.summary(state, mk, C.monthEnd(mk), todayKey);
      out.push({ month: mk, avg: s.avg, counted: s.counted, full: s.full });
    }
    return out;
  }

  /** Compara un período con el anterior de igual duración */
  function comparePeriods(state, from, to, todayKey) {
    todayKey = todayKey || D().today();
    const len = D().diffDays(from, to) + 1;
    const pFrom = D().addDays(from, -len), pTo = D().addDays(from, -1);
    const a = ASC.calendar.summary(state, from, to, todayKey);
    const b = ASC.calendar.summary(state, pFrom, pTo, todayKey);
    const enough = a.counted >= 3 && b.counted >= 3;
    return { current: a, previous: b, enough, delta: enough ? a.avg - b.avg : null, prevFrom: pFrom, prevTo: pTo };
  }

  /** Consistencia por hábito en los últimos N días (frecuencias flexibles: veces hechas / meta) */
  function habitConsistency(state, todayKey, days) {
    todayKey = todayKey || D().today();
    const from = D().addDays(todayKey, -(days || 30)), to = D().addDays(todayKey, -1);
    return state.habits.filter((h) => !h.archivedAt && h.kind !== 'negative').map((h) => {
      const s = H().habitRangeStats(state, h, from, to);
      return { habit: h, scheduled: s.scheduled, done: s.done, pct: s.pct, enough: s.scheduled >= 4 };
    }).sort((a, b) => (b.enough - a.enough) || b.pct - a.pct);
  }

  /** Cumplimiento por día de la semana con el % real (12 semanas) */
  function weekdayTrend(state, todayKey) {
    todayKey = todayKey || D().today();
    const acc = [0, 1, 2, 3, 4, 5, 6].map((d) => ({ day: d, sum: 0, days: 0 }));
    for (const k of D().range(D().addDays(todayKey, -84), D().addDays(todayKey, -1))) {
      const st = H().dayStatus(state, k, todayKey);
      if (!st.scheduled) continue;
      const a = acc[D().weekday(k)];
      a.sum += Math.min(1, st.weighted); a.days++;
    }
    acc.forEach((a) => (a.avg = a.days ? a.sum / a.days : null));
    const valid = acc.filter((a) => a.days >= MIN_DAYS_PER_WEEKDAY);
    return { all: acc, enough: valid.length >= 4, best: valid.slice().sort((x, y) => y.avg - x.avg)[0], worst: valid.slice().sort((x, y) => x.avg - y.avg)[0] };
  }

  /** INSIGHTS: observaciones en lenguaje claro, solo cuando hay datos suficientes. Nunca causales. */
  function generate(state, todayKey) {
    todayKey = todayKey || D().today();
    const out = [];
    const wd = weekdayTrend(state, todayKey);
    if (wd.enough && wd.best && wd.worst && wd.best.avg - wd.worst.avg >= 0.1) {
      out.push({ id: 'weekday', icon: 'calendar', title: 'Tus mejores días', text: 'Los ' + D().DIAS_LARGOS[wd.best.day] + ' cumplís en promedio el ' + pctTxt(wd.best.avg) + '; los ' + D().DIAS_LARGOS[wd.worst.day] + ', el ' + pctTxt(wd.worst.avg) + '.', basis: 'Últimas 12 semanas, ' + (wd.best.days + wd.worst.days) + ' días comparados.' });
    }
    const hc = habitConsistency(state, todayKey, 30).filter((r) => r.enough);
    if (hc.length >= 2) {
      const top = hc[0], low = hc[hc.length - 1];
      if (top.pct >= 0.7) out.push({ id: 'top-habit', icon: 'trophy', title: 'Tu hábito más constante', text: top.habit.name + ': ' + pctTxt(top.pct) + ' en los últimos 30 días (' + top.done + ' de ' + top.scheduled + ').', basis: 'Días en que estaba programado.' });
      if (low.pct < 0.5 && low !== top) out.push({ id: 'low-habit', icon: 'target', title: 'El que más se te escapa', text: low.habit.name + ': ' + low.done + ' de ' + low.scheduled + ' (' + pctTxt(low.pct) + '). Probá con un mínimo más chico o cambiale el horario.', basis: 'Últimos 30 días.' });
    }
    const end = D().addDays(todayKey, -1);
    const wk = comparePeriods(state, D().addDays(end, -6), end, todayKey);
    if (wk.enough && Math.abs(wk.delta) >= 0.08) out.push({ id: 'week-diff', icon: wk.delta > 0 ? 'trend' : 'refresh', title: wk.delta > 0 ? 'Mejor que la semana anterior' : 'Semana más floja que la anterior', text: 'Últimos 7 días: ' + pctTxt(wk.current.avg) + ' contra ' + pctTxt(wk.previous.avg) + ' de los 7 anteriores.', basis: wk.current.counted + ' y ' + wk.previous.counted + ' días con hábitos.' });
    const tr = trend(state, todayKey);
    if (tr.enough && Math.abs(tr.delta) >= 0.1) out.push({ id: 'trend', icon: 'trend', title: tr.delta > 0 ? 'Tendencia en alza' : 'Tendencia a la baja', text: 'Las últimas 4 semanas promedian ' + pctTxt(tr.recent) + ', contra ' + pctTxt(tr.previous) + ' de las 4 anteriores.', basis: 'Hábitos hechos sobre programados.' });
    if (ASC.wellbeing) {
      const mv = ASC.wellbeing.moodVsHabits(state, todayKey);
      const r = mv.rows.find((x) => Math.abs(x.diff) >= 0.5);
      if (r) out.push({ id: 'mood-habit', icon: 'heart', title: 'Ánimo y hábitos', text: 'Los días que hiciste "' + r.habit.name + '" tu ánimo promedio fue ' + r.withAvg.toFixed(1).replace('.', ',') + '/5, contra ' + r.withoutAvg.toFixed(1).replace('.', ',') + '/5 los días que no.', basis: 'Asociación observada en ' + (r.withN + r.withoutN) + ' días: no demuestra que uno cause lo otro.' });
    }
    const mt = moodVsTraining(state);
    if (mt.enough && Math.abs(mt.withAvg - mt.withoutAvg) >= 0.5) out.push({ id: 'mood-gym', icon: 'dumbbell', title: 'Ánimo y entrenamiento', text: 'Ánimo promedio ' + mt.withAvg.toFixed(1).replace('.', ',') + '/5 los días que entrenaste y ' + mt.withoutAvg.toFixed(1).replace('.', ',') + '/5 los que no.', basis: 'Asociación en ' + (mt.withN + mt.withoutN) + ' registros: no es una causa comprobada.' });
    return out;
  }

  ASC.insights = { byWeekday, habitRanking, trend, moodVsTraining, monthlyEvolution, comparePeriods, habitConsistency, weekdayTrend, generate };
})(typeof window !== 'undefined' ? window : globalThis);
