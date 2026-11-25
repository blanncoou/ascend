/* ASCEND · Recuperación de la constancia (lógica pura)
 * Idea central: retomar importa más que una racha perfecta. Nada de esto castiga ni resta XP.
 * - detect(): sugiere un plan cuando hubo varios días flojos recientes (nunca obliga).
 * - start(): plan opcional por N días: hábitos clave, pausa temporal del resto, mínimos reducidos, obstáculos.
 * - end(): deshace exactamente lo que hizo el plan (reanuda lo que pausó, quita los mínimos temporales).
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  const D = () => ASC.dates;
  const H = () => ASC.habits;

  const RULES = { lookback: 7, minDays: 4, lowPct: 0.5, lowDaysNeeded: 3, avgBelow: 0.45, snoozeDays: 7 };

  const OBSTACLES = [
    ['tiempo', 'Falta de tiempo', 'Usá el mínimo de cada hábito: 2 minutos también cuentan para no cortar el hilo.'],
    ['cansancio', 'Cansancio', 'Mové los hábitos exigentes a tu mejor momento del día y dejá solo los clave.'],
    ['olvido', 'Me olvido', 'Asigná un horario y activá el recordatorio, o sumalos a una rutina de mañana o noche.'],
    ['motivacion', 'Poca motivación', 'Elegí 1 a 3 hábitos que de verdad te importen. Lo demás puede esperar unos días.'],
    ['imprevistos', 'Imprevistos', 'Pausá lo que no podés sostener esta semana: la pausa no cuenta como incumplido.'],
    ['animo', 'Ánimo bajo', 'Bajá la exigencia sin culpa. Si el malestar sigue, hablarlo con alguien de confianza o un profesional ayuda.'],
  ];

  function considered(state, todayKey) {
    const out = [];
    for (let i = 1; i <= RULES.lookback; i++) {
      const k = D().addDays(todayKey, -i);
      const s = H().dayStatus(state, k, todayKey);
      if (s.scheduled) out.push({ key: k, pct: Math.min(1, s.weighted) });
    }
    return out;
  }

  function active(state, todayKey) {
    const r = state.recovery;
    todayKey = todayKey || D().today();
    return r && !r.endedAt && todayKey <= r.until ? r : null;
  }

  /** ¿Conviene ofrecer un plan? */
  function detect(state, todayKey) {
    todayKey = todayKey || D().today();
    const days = considered(state, todayKey);
    const base = { suggest: false, days };
    if (active(state, todayKey)) return Object.assign(base, { reason: 'active' });
    if (state.recoveryDismissed && D().diffDays(state.recoveryDismissed, todayKey) < RULES.snoozeDays) return Object.assign(base, { reason: 'snoozed' });
    if (state.habits.filter((h) => !h.archivedAt && h.kind !== 'negative').length < 2) return Object.assign(base, { reason: 'few-habits' });
    if (days.length < RULES.minDays) return Object.assign(base, { reason: 'little-data' });
    const avg = days.reduce((a, d) => a + d.pct, 0) / days.length;
    const low = days.slice(0, 5).filter((d) => d.pct < RULES.lowPct).length;
    const suggest = low >= RULES.lowDaysNeeded || avg < RULES.avgBelow;
    return Object.assign(base, { suggest, avg, low, reason: suggest ? 'low' : 'ok' });
  }

  /** Mínimo temporal sugerido para un hábito con cantidad: la mitad de su mínimo actual (al menos 1 paso) */
  function reducedMin(h, key) {
    const cur = H().effectiveMin(h, key);
    const step = Number(h.qtyStep) || 1;
    return Math.max(step, Math.round((cur / 2) / step) * step || step);
  }

  /** Crea el plan. opts: { keyHabits: [id], pauseOthers, reduce, obstacles: [id], note, days } */
  function start(state, opts, todayKey) {
    todayKey = todayKey || D().today();
    const days = Math.max(3, Math.min(21, Number(opts.days) || 7));
    const until = D().addDays(todayKey, days - 1);
    const keys = (opts.keyHabits || []).slice(0, 3);
    const plan = { id: ASC.store ? ASC.store.uid() : 'r' + Date.now(), start: todayKey, until, days, keyHabits: keys, pausedIds: [], reducedIds: [], obstacles: opts.obstacles || [], note: (opts.note || '').slice(0, 300), endedAt: null };
    state.habits.forEach((h) => {
      if (h.archivedAt || h.kind === 'negative') return;
      if (keys.includes(h.id)) {
        if (opts.reduce && h.kind === 'quantity') { h.tempMin = { value: reducedMin(h, todayKey), from: todayKey, until }; plan.reducedIds.push(h.id); }
      } else if (opts.pauseOthers && !H().pausedNow(h, todayKey)) {
        H().pause(state, h, todayKey, D().addDays(until, 1));
        plan.pausedIds.push(h.id);
      }
    });
    state.recovery = plan;
    state.recoveryDismissed = null;
    if (ASC.perf) ASC.perf.reset();
    return plan;
  }

  /** Termina el plan (antes de tiempo o al vencer) y deshace sus cambios */
  function end(state, todayKey, reason) {
    todayKey = todayKey || D().today();
    const r = state.recovery;
    if (!r || r.endedAt) return null;
    r.pausedIds.forEach((id) => {
      const h = state.habits.find((x) => x.id === id);
      if (h && H().pausedNow(h, todayKey)) H().resume(state, h, todayKey);
    });
    r.reducedIds.forEach((id) => { const h = state.habits.find((x) => x.id === id); if (h && h.tempMin) delete h.tempMin; });
    r.endedAt = todayKey;
    r.endReason = reason || 'manual';
    r.summary = progress(state, r, todayKey);
    state.recoveryHistory = (state.recoveryHistory || []).concat(r).slice(-20);
    state.recovery = null;
    if (ASC.perf) ASC.perf.reset();
    return r;
  }

  /** Si el plan venció, se cierra solo (sus pausas ya terminan en la fecha prevista) */
  function autoEnd(state, todayKey) {
    todayKey = todayKey || D().today();
    const r = state.recovery;
    if (r && !r.endedAt && todayKey > r.until) return end(state, D().addDays(r.until, 1), 'completed');
    return null;
  }

  /** Avance de los hábitos clave durante el plan */
  function progress(state, plan, todayKey) {
    todayKey = todayKey || D().today();
    const last = todayKey > plan.until ? plan.until : todayKey;
    let sched = 0, done = 0, daysWithAny = 0;
    if (last >= plan.start) {
      for (const k of D().range(plan.start, last)) {
        let any = false;
        plan.keyHabits.forEach((id) => {
          const h = state.habits.find((x) => x.id === id);
          if (!h || !H().isActiveOn(h, k)) return;
          const isD = H().isDone(state, id, k);
          if (H().isScheduled(h, k) || isD) { sched++; if (isD) { done++; any = true; } }
        });
        if (any) daysWithAny++;
      }
    }
    return { sched, done, pct: sched ? done / sched : 0, daysWithAny, daysElapsed: last >= plan.start ? D().diffDays(plan.start, last) + 1 : 0, daysTotal: plan.days };
  }

  /** Hábitos sugeridos como clave: los que más se cumplieron en los últimos 30 días */
  function suggestKeyHabits(state, todayKey) {
    todayKey = todayKey || D().today();
    return state.habits.filter((h) => !h.archivedAt && h.kind !== 'negative' && !H().pausedNow(h, todayKey))
      .map((h) => ({ h, s: H().habitRangeStats(state, h, D().addDays(todayKey, -30), D().addDays(todayKey, -1)) }))
      .sort((a, b) => b.s.pct - a.s.pct || b.s.done - a.s.done)
      .slice(0, 3).map((x) => x.h.id);
  }

  ASC.recovery = { RULES, OBSTACLES, detect, start, end, autoEnd, active, progress, suggestKeyHabits, reducedMin };
})(typeof window !== 'undefined' ? window : globalThis);
