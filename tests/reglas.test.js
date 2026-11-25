/* Pruebas de las reglas nuevas (Fase 1 y 2): node tests/reglas.test.js */
const path = require('path').join(__dirname, '..', 'js') + '/';
['config/xp.js', 'core/dates.js', 'core/store.js', 'core/perf.js', 'data/exercises.js', 'domain/rules.js', 'domain/habits.js', 'domain/gym.js', 'domain/progress.js', 'domain/coach.js', 'domain/game.js'].forEach((f) => require(path + f));
const assert = require('assert');
const { dates: D, habits: H, progress: P, game: GM, store: S, rules: R, perf: PF } = globalThis.ASC;
let ok = 0;
const t = (name, fn) => { fn(); ok++; console.log('  ✓ ' + name); };

const T = D.today();
function base() {
  const st = S.emptyState();
  st.createdAt = new Date(Date.now() - 60 * 864e5).toISOString();
  return st;
}
function habit(st, id, extra) {
  const h = Object.assign({ id, name: id, kind: 'check', category: 'salud', freqType: 'daily', days: [], timesPerWeek: 3, startDate: D.addDays(T, -50), color: '#f00', icon: 'x' }, extra || {});
  st.habits.push(h);
  return h;
}

console.log('Reglas de edición');
t('hoy y ayer se pueden editar; antes no; el futuro tampoco', () => {
  const st = base(); habit(st, 'a');
  assert.strictEqual(H.toggle(st, 'a', T), true);
  assert.strictEqual(H.toggle(st, 'a', D.addDays(T, -1)), true);
  assert.strictEqual(H.toggle(st, 'a', D.addDays(T, -2)), null);
  assert.strictEqual(H.toggle(st, 'a', D.addDays(T, 1)), null);
  assert.strictEqual(H.isDone(st, 'a', D.addDays(T, -2)), false);
});
t('las correcciones de días anteriores quedan registradas (las de hoy no)', () => {
  const st = base(); habit(st, 'a');
  H.toggle(st, 'a', T);
  H.toggle(st, 'a', D.addDays(T, -1));
  H.toggle(st, 'a', D.addDays(T, -1));
  assert.strictEqual(st.corrections.length, 2);
  assert.strictEqual(st.corrections[0].date, D.addDays(T, -1));
});
t('la ventana es configurable (0 a 7)', () => {
  const st = base(); habit(st, 'a');
  st.settings.editWindowDays = 0;
  assert.strictEqual(H.toggle(st, 'a', D.addDays(T, -1)), null);
  st.settings.editWindowDays = 3;
  assert.strictEqual(H.toggle(st, 'a', D.addDays(T, -3)), true);
  st.settings.editWindowDays = 99;
  assert.strictEqual(R.windowDays(st), 7);
});
t('marcar y desmarcar no duplica XP', () => {
  const st = base(); habit(st, 'a'); habit(st, 'b');
  const x0 = P.xp(st).total;
  H.toggle(st, 'a', T); H.toggle(st, 'a', T); H.toggle(st, 'a', T);
  const x1 = P.xp(st).total;
  H.toggle(st, 'a', T);
  assert.strictEqual(P.xp(st).total, x0);
  assert.ok(x1 > x0);
});

console.log('Semanas finalizadas');
t('una semana cerrada congela misiones y desafío', () => {
  const st = base(); habit(st, 'a'); habit(st, 'b');
  const ws = D.addDays(D.weekStart(T), -14);
  GM.ensureWeek(st, ws, ws);
  GM.planWeek(st, ws, 'suave', ws);
  for (let i = 0; i < 7; i++) { H.forceToggle(st, 'a', D.addDays(ws, i)); H.forceToggle(st, 'b', D.addDays(ws, i)); }
  assert.ok(GM.commitmentProgress(st, ws).met);
  assert.ok(GM.finalizeWeeks(st, T));
  // una modificación forzada posterior no cambia el resultado congelado
  for (let i = 0; i < 7; i++) H.forceToggle(st, 'a', D.addDays(ws, i));
  assert.ok(GM.commitmentProgress(st, ws).met);
  assert.ok(GM.commitmentProgress(st, ws).final);
  assert.strictEqual(GM.finalizeWeeks(st, T), false);
});
t('la semana actual no se congela', () => {
  const st = base(); habit(st, 'a');
  GM.ensureWeek(st, D.weekStart(T), T);
  GM.finalizeWeeks(st, T);
  assert.ok(!st.weeks[D.weekStart(T)].final);
});

console.log('Caché');
t('los agregados diarios con caché coinciden con el cálculo directo', () => {
  const st = base(); ['a', 'b', 'c'].forEach((id, i) => habit(st, id, i === 2 ? { freqType: 'weekdays', days: [1, 3, 5] } : {}));
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let n = 0; n < 400; n++) {
    const k = D.addDays(T, -Math.floor(rnd() * 50));
    H.forceToggle(st, ['a', 'b', 'c'][Math.floor(rnd() * 3)], k);
    const k2 = D.addDays(T, -Math.floor(rnd() * 50));
    const cached = H.dayStatus(st, k2, T);
    const direct = H.dayCounts(st, k2);
    assert.strictEqual(cached.done, direct.done);
    assert.strictEqual(cached.scheduled, direct.scheduled);
  }
  assert.ok(PF.stats.dayHits > 0);
});
t('editar un hábito invalida la caché diaria', () => {
  const st = base(); const h = habit(st, 'a');
  H.forceToggle(st, 'a', D.addDays(T, -2));
  assert.strictEqual(H.dayStatus(st, D.addDays(T, -2), T).scheduled, 1);
  h.freqType = 'weekdays'; h.days = [];
  assert.strictEqual(H.dayStatus(st, D.addDays(T, -2), T).scheduled, 0);
});

console.log('Comodines');
t('se gana 1 comodín cada 7 días de racha (máx. 2) y protege un día', () => {
  const st = base(); habit(st, 'a', { startDate: D.addDays(T, -20) });
  st.createdAt = new Date(D.fromKey(D.addDays(T, -20))).toISOString();
  for (let i = 20; i >= 3; i--) H.forceToggle(st, 'a', D.addDays(T, -i)); // 18 días seguidos
  // ayer falló (T-1) y anteayer hizo (T-2)? T-2 no marcado: lo marcamos
  H.forceToggle(st, 'a', D.addDays(T, -2));
  const before = P.consistency(st, T);
  assert.strictEqual(before.current, 0, 'ayer sin hacer corta la racha');
  assert.ok(before.freezes.available >= 1);
  assert.ok(P.canUseFreeze(st, D.addDays(T, -1), T));
  assert.ok(P.useFreeze(st, D.addDays(T, -1), T));
  const after = P.consistency(st, T);
  assert.strictEqual(after.current, 19);
  assert.strictEqual(after.freezes.used.length, 1);
  assert.ok(!P.canUseFreeze(st, D.addDays(T, -1), T), 'no se usa dos veces el mismo día');
  // las estadísticas de cumplimiento no cambian (el día sigue incumplido)
  assert.strictEqual(H.dayStatus(st, D.addDays(T, -1), T).done, 0);
});
t('sin comodines disponibles no se puede usar', () => {
  const st = base(); habit(st, 'a', { startDate: D.addDays(T, -3) });
  H.forceToggle(st, 'a', D.addDays(T, -2));
  assert.ok(!P.canUseFreeze(st, D.addDays(T, -1), T));
});
t('no se puede usar en un día que no rompía la racha ni fuera de la ventana', () => {
  const st = base(); habit(st, 'a');
  for (let i = 30; i >= 1; i--) H.forceToggle(st, 'a', D.addDays(T, -i));
  assert.ok(!P.canUseFreeze(st, D.addDays(T, -1), T));
  assert.ok(!P.canUseFreeze(st, D.addDays(T, -5), T));
});

console.log('Hábitos con cantidad');
t('registra parciales y se completa al llegar al objetivo', () => {
  const st = base(); habit(st, 'w', { kind: 'quantity', qtyTarget: 2000, qtyUnit: 'ml', qtyStep: 250 });
  H.setQty(st, 'w', T, 1500);
  assert.strictEqual(H.getQty(st, 'w', T), 1500);
  assert.strictEqual(H.isDone(st, 'w', T), false);
  H.setQty(st, 'w', T, 2000);
  assert.strictEqual(H.isDone(st, 'w', T), true);
  H.setQty(st, 'w', T, 0);
  assert.strictEqual(H.isDone(st, 'w', T), false);
  assert.strictEqual(H.setQty(st, 'w', D.addDays(T, -5), 2000), null);
});
t('cambiar el objetivo no altera días cerrados', () => {
  const st = base(); const h = habit(st, 'w', { kind: 'quantity', qtyTarget: 2000 });
  st.habitQty.w = { [D.addDays(T, -10)]: 1000, [T]: 1000 };
  h.qtyTarget = 1000;
  H.resyncQty(st, h, T);
  assert.strictEqual(H.isDone(st, 'w', T), true);
  assert.strictEqual(H.isDone(st, 'w', D.addDays(T, -10)), false);
});

console.log('Hábitos a evitar');
t('cuentan días sin la conducta, no entran en el % diario', () => {
  const st = base(); const h = habit(st, 'n', { kind: 'negative', startDate: D.addDays(T, -20) });
  habit(st, 'a');
  assert.strictEqual(H.cleanStreak(st, h, T).current, 20);
  assert.ok(!H.habitsForDay(st, T).includes(h));
  assert.strictEqual(H.dayCounts(st, T).scheduled, 1);
  assert.strictEqual(H.toggle(st, 'n', T), null);
});
t('una recaída reinicia la racha actual pero conserva la mejor', () => {
  const st = base(); const h = habit(st, 'n', { kind: 'negative', startDate: D.addDays(T, -20) });
  assert.ok(H.logRelapse(st, 'n', D.addDays(T, -1), 'mal día'));
  const c = H.cleanStreak(st, h, T);
  assert.strictEqual(c.current, 0);
  assert.strictEqual(c.best, 19);
  assert.strictEqual(H.logRelapse(st, 'n', D.addDays(T, -9)), null, 'fecha cerrada');
});
t('hitos sin la conducta suman XP una sola vez', () => {
  const st = base(); habit(st, 'n', { kind: 'negative', startDate: D.addDays(T, -40) });
  const row = P.xp(st).breakdown.find((b) => b.key === 'negative');
  assert.strictEqual(row.total, 50 + 150);
});

console.log('Balance de XP');
t('tope diario: crear muchos hábitos triviales no infla el XP', () => {
  const st = base();
  for (let i = 0; i < 20; i++) habit(st, 'h' + i);
  st.habits.forEach((h) => H.toggle(st, h.id, T));
  const row = P.xp(st).breakdown.find((b) => b.key === 'habit');
  assert.strictEqual(row.count, ASC.XP.habitDailyCap);
});
t('un día perfecto necesita al menos 2 hábitos programados', () => {
  const st = base(); habit(st, 'a');
  H.toggle(st, 'a', T);
  assert.strictEqual(P.xp(st).counts.perfect, 0);
  habit(st, 'b'); H.toggle(st, 'b', T);
  assert.strictEqual(P.xp(st).counts.perfect, 1);
});
t('la curva usa la configuración central', () => {
  assert.strictEqual(GM.xpForLevel(2), ASC.XP.level.base);
  assert.strictEqual(GM.levelInfo(GM.xpForLevel(51)).rank, 'Disciplina pura');
});

console.log('Almacenamiento');
t('migrate repara tipos sin borrar datos y agrega campos v2', () => {
  const m = S.migrate({ profile: { name: 'Tomi' }, habits: [{ id: 'x', name: 'Leer' }], habitLogs: 'roto', sessions: null });
  assert.strictEqual(m.data.profile.name, 'Tomi');
  assert.strictEqual(m.data.habits[0].kind, 'check');
  assert.deepStrictEqual(m.data.habitLogs, {});
  assert.ok(Array.isArray(m.data.sessions));
  assert.ok(m.repaired.includes('habitLogs'));
  assert.strictEqual(m.data.version, S.SCHEMA);
});
t('checksum detecta cambios', () => {
  assert.notStrictEqual(S.checksum('{"a":1}'), S.checksum('{"a":2}'));
});

console.log('\n' + ok + ' pruebas OK');
