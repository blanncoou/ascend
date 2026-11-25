/* Pruebas de la reforma v3 (hábitos avanzados, planificación, recuperación, juego, bienestar, insights): node tests/v3.test.js */
const path = require('path').join(__dirname, '..', 'js') + '/';
['config/brand.js', 'config/xp.js', 'core/dates.js', 'core/store.js', 'core/perf.js', 'data/exercises.js', 'domain/rules.js', 'domain/habits.js', 'domain/gym.js', 'domain/progress.js', 'domain/game.js', 'domain/rewards.js', 'domain/calendar.js', 'domain/insights.js', 'domain/planner.js', 'domain/recovery.js', 'domain/wellbeing.js'].forEach((f) => require(path + f));
const assert = require('assert');
const { store: S, habits: H, dates: D, planner: PL, recovery: R, rewards: RW, wellbeing: W, insights: I, progress: P, calendar: C } = globalThis.ASC;
let ok = 0;
const t = (name, fn) => { fn(); ok++; console.log('  ✓ ' + name); };
const T = '2026-11-24';
const habit = (id, extra) => Object.assign({ id, name: id, kind: 'check', freqType: 'daily', days: [], timesPerWeek: 3, startDate: '2026-01-01', order: 0, pauses: [] }, extra || {});
const fresh = () => { const st = S.emptyState(); st.createdAt = '2026-01-01T12:00:00Z'; return st; };
const mark = (st, id, keys) => keys.forEach((k) => H.forceToggle(st, id, k));

console.log('Hábitos avanzados');
t('mensual: disponible hasta cumplir la meta del mes y suma solo cuando se hace', () => {
  const st = fresh(); st.habits.push(habit('m', { freqType: 'monthly', timesPerMonth: 2 }), habit('d'));
  assert.ok(H.habitsForDay(st, '2026-11-03').some((h) => h.id === 'm'));
  mark(st, 'm', ['2026-11-02', '2026-11-05']);
  assert.ok(!H.habitsForDay(st, '2026-11-10').some((h) => h.id === 'm'), 'meta cumplida: ya no aparece');
  assert.strictEqual(H.dayStatus(st, '2026-11-03', T).scheduled, 1, 'no resta los días que no se hizo');
  assert.strictEqual(H.dayStatus(st, '2026-11-05', T).scheduled, 2);
  assert.deepStrictEqual(H.periodProgress(st, st.habits[0], '2026-11-20'), { count: 2, target: 2, unit: 'mes' });
  assert.strictEqual(H.frequencyLabel(st.habits[0]), '2 veces por mes');
});
t('mensual: racha en meses (el mes en curso no la corta)', () => {
  const st = fresh(); st.habits.push(habit('m', { freqType: 'monthly', timesPerMonth: 1, startDate: '2026-09-01' }));
  mark(st, 'm', ['2026-09-10', '2026-10-10']);
  assert.deepStrictEqual(H.currentStreak(st, st.habits[0], T), { value: 2, unit: 'meses' });
  mark(st, 'm', ['2026-11-01']);
  assert.strictEqual(H.currentStreak(st, st.habits[0], T).value, 3);
  assert.strictEqual(H.bestStreak(st, st.habits[0], T).value, 3);
});
t('mínimo e ideal: se cumple con el mínimo y el ideal queda como meta extra', () => {
  const st = fresh(); st.habits.push(habit('leer', { kind: 'quantity', qtyMin: 5, qtyTarget: 30, qtyUnit: 'min', qtyStep: 5 }));
  assert.strictEqual(H.setQty(st, 'leer', T, 4, T), 4);
  assert.strictEqual(H.isDone(st, 'leer', T), false);
  assert.ok(Math.abs(H.habitFraction(st, st.habits[0], T) - 0.8) < 1e-9, '4 de 5 de mínimo = 80 %');
  H.setQty(st, 'leer', T, 5, T);
  assert.strictEqual(H.isDone(st, 'leer', T), true); assert.strictEqual(H.idealReached(st, st.habits[0], T), false);
  H.setQty(st, 'leer', T, 30, T);
  assert.strictEqual(H.idealReached(st, st.habits[0], T), true);
});
t('pausa: no se programa, no cuenta como incumplido y conserva el historial', () => {
  const st = fresh(); st.habits.push(habit('a'), habit('b'));
  mark(st, 'a', ['2026-11-01']);
  H.pause(st, st.habits[0], '2026-11-10', '2026-11-15');
  assert.strictEqual(H.isScheduled(st.habits[0], '2026-11-12'), false);
  assert.strictEqual(H.dayStatus(st, '2026-11-12', T).scheduled, 1);
  assert.ok(H.isDone(st, 'a', '2026-11-01'), 'historial intacto');
  assert.strictEqual(H.isScheduled(st.habits[0], '2026-11-15'), true, 'vuelve en la fecha indicada');
});
t('pausa: no corta la racha diaria', () => {
  const st = fresh(); st.habits.push(habit('a', { startDate: '2026-11-01' }));
  mark(st, 'a', ['2026-11-18', '2026-11-19', '2026-11-23', '2026-11-24']);
  H.pause(st, st.habits[0], '2026-11-20', '2026-11-23');
  assert.strictEqual(H.currentStreak(st, st.habits[0], T).value, 4);
});
t('reanudar cierra la pausa abierta; pausar y reanudar el mismo día no deja rastro', () => {
  const st = fresh(); const h = habit('a'); st.habits.push(h);
  H.pause(st, h, '2026-11-20', null);
  assert.ok(H.pausedNow(h, T));
  H.resume(st, h, T);
  assert.ok(!H.pausedNow(h, T)); assert.deepStrictEqual(h.pauses, [{ from: '2026-11-20', to: T }]);
  H.pause(st, h, T, null); H.resume(st, h, T);
  assert.deepStrictEqual(h.pauses, [{ from: '2026-11-20', to: T }]);
});
t('momento del día: elegido o deducido del recordatorio', () => {
  assert.strictEqual(H.timeOfDay({ timeOfDay: 'noche' }), 'noche');
  assert.strictEqual(H.timeOfDay({ reminderTime: '07:30' }), 'manana');
  assert.strictEqual(H.timeOfDay({ reminderTime: '15:00' }), 'tarde');
  assert.strictEqual(H.timeOfDay({ reminderTime: '21:00' }), 'noche');
  assert.strictEqual(H.timeOfDay({}), '');
});
t('migración v2 → v3: agrega campos sin perder datos', () => {
  const old = { version: 2, habits: [{ id: 'x', name: 'Leer', kind: 'check', freqType: 'daily', startDate: '2026-01-01' }], habitLogs: { x: { '2026-11-01': true } }, settings: { reminders: { habits: { enabled: true, time: '08:00' } } } };
  const m = S.migrate(JSON.parse(JSON.stringify(old)));
  assert.deepStrictEqual(m.data.habits[0].pauses, []);
  assert.ok(m.data.habitLogs.x['2026-11-01']);
  assert.strictEqual(m.data.settings.reminders.habits.time, '08:00');
  assert.deepStrictEqual(m.data.settings.reminders.quiet, { enabled: false, from: '22:00', to: '07:00' });
  assert.ok(Array.isArray(m.data.habitRoutines) && typeof m.data.moodLog === 'object' && m.data.version === 3);
  assert.deepStrictEqual(m.repaired, []);
});

console.log('Planificación');
t('3 prioridades como máximo por día', () => {
  const st = fresh();
  for (let i = 0; i < 4; i++) st.tasks.push({ id: 't' + i, title: 'T' + i, date: T, priority: 'media', done: false });
  assert.ok(PL.toggleTop(st, 't0') && PL.toggleTop(st, 't1') && PL.toggleTop(st, 't2'));
  assert.strictEqual(PL.toggleTop(st, 't3'), false);
  assert.deepStrictEqual(PL.tasksFor(st, T).slice(0, 3).map((x) => x.id).sort(), ['t0', 't1', 't2']);
});
t('reordenar y reprogramar pendientes', () => {
  const st = fresh();
  ['a', 'b', 'c'].forEach((id) => st.tasks.push({ id, title: id, date: '2026-11-23', priority: 'media', done: id === 'c' }));
  PL.moveTask(st, 'b', -1);
  assert.deepStrictEqual(PL.tasksFor(st, '2026-11-23').map((x) => x.id).slice(0, 2), ['b', 'a']);
  assert.strictEqual(PL.reschedulePending(st, '2026-11-23', T), 2);
  assert.deepStrictEqual(st.tasks.filter((x) => x.date === T).map((x) => x.id).sort(), ['a', 'b']);
  assert.strictEqual(st.tasks.find((x) => x.id === 'c').date, '2026-11-23', 'las hechas se quedan');
});
t('rutina de hábitos: progreso combinado y actividades con ventana de edición', () => {
  const st = fresh(); st.habits.push(habit('agua'), habit('lun', { freqType: 'weekdays', days: [1] }));
  const r = { id: 'r', name: 'Mañana', slot: 'manana', items: [{ id: 'i1', type: 'habit', habitId: 'agua' }, { id: 'i2', type: 'activity', title: 'Estirar' }, { id: 'i3', type: 'habit', habitId: 'lun' }] };
  st.habitRoutines.push(r);
  assert.strictEqual(PL.routineProgress(st, r, T).total, 2, 'el hábito de los lunes no aplica el martes');
  assert.strictEqual(PL.toggleActivity(st, 'r', 'i2', T, T), true);
  mark(st, 'agua', [T]);
  assert.strictEqual(PL.routineProgress(st, r, T).pct, 1);
  assert.strictEqual(PL.toggleActivity(st, 'r', 'i2', '2026-11-01', T), null, 'día cerrado');
});
t('modo enfoque: suma minutos reales al hábito vinculado y no suma XP propia', () => {
  const st = fresh(); st.habits.push(habit('est', { kind: 'quantity', qtyTarget: 60, qtyUnit: 'min', qtyStep: 15 }));
  const now = Date.now();
  PL.startFocus(st, { minutes: 25, label: 'Estudiar', habitId: 'est' }, now);
  assert.strictEqual(PL.focusRemaining(st, now + 60000), 24 * 60);
  const xp0 = P.xp(st).total;
  const rec = PL.finishFocus(st, false, now + 10 * 60000 + 5000);
  assert.strictEqual(rec.minutes, 10); assert.strictEqual(rec.addedToHabit, 10);
  assert.strictEqual(H.getQty(st, 'est', D.today()), 10);
  assert.strictEqual(st.focus, null);
  assert.strictEqual(P.xp(st).total, xp0, '10 de 60 min no completa el hábito: sin XP');
});

console.log('Recuperación');
const lowWorld = () => {
  const st = fresh(); ['a', 'b', 'c', 'd'].forEach((id, i) => st.habits.push(habit(id, { order: i })));
  st.habits.push(habit('agua', { kind: 'quantity', qtyTarget: 8, qtyMin: 6, qtyStep: 1 }));
  for (let i = 30; i >= 8; i--) mark(st, 'a', [D.addDays(T, -i)]);
  for (let i = 7; i >= 1; i--) if (i % 3 === 0) mark(st, 'a', [D.addDays(T, -i)]);
  return st;
};
t('detecta varios días flojos y sugiere (sin obligar)', () => {
  const st = lowWorld();
  const d = R.detect(st, T);
  assert.strictEqual(d.suggest, true); assert.ok(d.low >= 3);
  st.recoveryDismissed = D.addDays(T, -2);
  assert.strictEqual(R.detect(st, T).suggest, false, 'descartado: no insiste por 7 días');
});
t('no sugiere con buena constancia ni con poco historial', () => {
  const st = fresh(); st.habits.push(habit('a'), habit('b'));
  for (let i = 1; i <= 7; i++) mark(st, 'a', [D.addDays(T, -i)]), mark(st, 'b', [D.addDays(T, -i)]);
  assert.strictEqual(R.detect(st, T).suggest, false);
  const st2 = fresh(); st2.habits.push(habit('a', { startDate: D.addDays(T, -2) }), habit('b', { startDate: D.addDays(T, -2) }));
  assert.strictEqual(R.detect(st2, T).reason, 'little-data');
});
t('plan: pausa el resto, reduce mínimos y al terminar deshace exactamente eso', () => {
  const st = lowWorld();
  H.pause(st, st.habits[3], '2026-11-01', null); // "d" ya estaba pausado por el usuario
  const plan = R.start(st, { keyHabits: ['a', 'agua'], pauseOthers: true, reduce: true, obstacles: ['tiempo'], days: 7 }, T);
  assert.deepStrictEqual(plan.pausedIds.sort(), ['b', 'c']);
  assert.strictEqual(H.effectiveMin(st.habits[4], T), 3, 'mínimo 6 → 3 durante el plan');
  assert.strictEqual(H.isScheduled(st.habits[1], T), false);
  assert.ok(R.active(st, T));
  R.end(st, D.addDays(T, 2));
  assert.strictEqual(H.isScheduled(st.habits[1], D.addDays(T, 2)), true, 'reanudado');
  assert.ok(H.pausedNow(st.habits[3], D.addDays(T, 2)), 'la pausa propia del usuario se respeta');
  assert.strictEqual(H.effectiveMin(st.habits[4], T), 6);
  assert.strictEqual(st.recovery, null); assert.strictEqual(st.recoveryHistory.length, 1);
});
t('el plan vencido se cierra solo', () => {
  const st = lowWorld();
  R.start(st, { keyHabits: ['a'], pauseOthers: true, days: 3 }, '2026-11-10');
  assert.ok(R.autoEnd(st, T));
  assert.strictEqual(st.recoveryHistory[0].endReason, 'completed');
  assert.strictEqual(H.isScheduled(st.habits[1], T), true);
});

console.log('Juego');
t('desafío mensual: solo el mes en curso, meta según el mes', () => {
  const st = fresh(); st.habits.push(habit('a'));
  assert.strictEqual(RW.setChallenge(st, '2026-10', 'active', 'firme', T), null);
  const c = RW.setChallenge(st, '2026-11', 'active', 'firme', T);
  assert.strictEqual(c.target, 21); // 70 % de 30 días
  assert.strictEqual(RW.setChallenge(st, '2026-11', 'workouts', 'suave', T).target, 4);
});
t('desafío mensual: suma XP una sola vez y queda congelado al cerrar el mes', () => {
  const st = fresh(); st.habits.push(habit('a'));
  st.months['2026-10'] = { challenge: { type: 'active', tier: 'suave', target: 3 } };
  mark(st, 'a', ['2026-10-01', '2026-10-02', '2026-10-03']);
  const x1 = P.xp(st, T).breakdown.find((r) => r.key === 'monthly');
  assert.strictEqual(x1.total, ASC.XP.monthly.suave); assert.strictEqual(x1.count, 1);
  assert.ok(RW.finalizeMonths(st, T));
  assert.deepStrictEqual([st.months['2026-10'].final.value, st.months['2026-10'].final.met], [3, true]);
  H.forceToggle(st, 'a', '2026-10-01'); // corrección posterior (forzada): el premio no cambia
  assert.strictEqual(RW.progress(st, '2026-10', T).met, true);
  assert.strictEqual(RW.finalizeMonths(st, T), false, 'no se vuelve a congelar');
  assert.ok(P.achievements(st, T).find((a) => a.key === 'month_challenge').unlocked);
});
t('recompensas propias: se desbloquean por nivel, rango o racha', () => {
  const st = fresh(); st.habits.push(habit('a', { startDate: D.addDays(T, -10) }));
  for (let i = 0; i <= 10; i++) mark(st, 'a', [D.addDays(T, -i)]);
  const best = P.xp(st, T).best;
  assert.strictEqual(RW.rewardUnlocked(st, { kind: 'streak', value: best }, T), true);
  assert.strictEqual(RW.rewardUnlocked(st, { kind: 'streak', value: best + 1 }, T), false);
  assert.strictEqual(RW.rewardUnlocked(st, { kind: 'level', value: 99 }, T), false);
  assert.strictEqual(RW.rewardLabel({ kind: 'rank', value: 3 }), 'Rango Hábito');
});

console.log('Bienestar e insights');
t('ánimo del día respeta la ventana de edición', () => {
  const st = fresh();
  assert.strictEqual(W.setMood(st, T, 4, T), 4);
  assert.strictEqual(W.setMood(st, '2026-11-01', 4, T), null);
  assert.strictEqual(W.moodFor(st, T), 4);
  st.journal.push({ id: 'j', date: '2026-11-20', mood: 2 }, { id: 'k', date: '2026-11-20', mood: 4 });
  assert.strictEqual(W.moodFor(st, '2026-11-20'), 3);
});
t('ánimo vs. hábitos: requiere datos suficientes en ambos grupos', () => {
  const st = fresh(); st.habits.push(habit('a'));
  for (let i = 1; i <= 12; i++) { const k = D.addDays(T, -i); st.moodLog[k] = { mood: i % 2 ? 4 : 2 }; if (i % 2) mark(st, 'a', [k]); }
  const r = W.moodVsHabits(st, T).rows[0];
  assert.strictEqual(r.withAvg, 4); assert.strictEqual(r.withoutAvg, 2); assert.strictEqual(r.withN, 6);
  const st2 = fresh(); st2.habits.push(habit('a')); st2.moodLog[D.addDays(T, -1)] = { mood: 3 };
  assert.strictEqual(W.moodVsHabits(st2, T).rows.length, 0);
});
t('insights: sin datos no inventa nada', () => {
  const st = fresh(); st.habits.push(habit('a', { startDate: D.addDays(T, -3) }));
  assert.deepStrictEqual(I.generate(st, T), []);
});
t('insights: con datos reales genera observaciones con su base y sin causalidad', () => {
  const st = fresh(); st.habits.push(habit('a', { startDate: '2026-08-01' }), habit('b', { startDate: '2026-08-01' }));
  for (const k of D.range('2026-08-01', D.addDays(T, -1))) {
    if (D.weekday(k) !== 1) mark(st, 'a', [k]);
    if (D.weekday(k) === 3 || D.weekday(k) === 5) mark(st, 'b', [k]);
    st.moodLog[k] = { mood: H.isDone(st, 'b', k) ? 5 : 3 };
  }
  const ins = I.generate(st, T);
  const ids = ins.map((x) => x.id);
  assert.ok(ids.includes('weekday') && ids.includes('top-habit') && ids.includes('low-habit') && ids.includes('mood-habit'), ids.join(','));
  ins.forEach((x) => { assert.ok(x.basis && x.text); assert.ok(!/caus(a|ó) que|provoca|gracias a/i.test(x.text)); });
  assert.ok(/no demuestra/.test(ins.find((x) => x.id === 'mood-habit').basis));
  const ev = I.monthlyEvolution(st, T, 3);
  assert.strictEqual(ev.length, 3); assert.ok(ev.every((m) => m.avg > 0));
  const cp = I.comparePeriods(st, '2026-11-01', '2026-11-23', T);
  assert.strictEqual(cp.prevTo, '2026-10-31'); assert.ok(cp.enough);
});

console.log('\n' + ok + ' pruebas OK');
