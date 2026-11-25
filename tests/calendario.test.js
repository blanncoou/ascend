/* Pruebas del calendario de progreso: node tests/calendario.test.js */
const path = require('path').join(__dirname, '..', 'js') + '/';
['config/xp.js', 'core/dates.js', 'core/store.js', 'core/perf.js', 'data/exercises.js', 'domain/rules.js', 'domain/habits.js', 'domain/gym.js', 'domain/progress.js', 'domain/game.js', 'domain/calendar.js'].forEach((f) => require(path + f));
const assert = require('assert');
const { store: S, calendar: C, habits: H, dates: D, progress: P } = globalThis.ASC;
let ok = 0;
const t = (name, fn) => { fn(); ok++; console.log('  ✓ ' + name); };
const TODAY = '2026-11-24'; // martes
const habit = (id, extra) => Object.assign({ id, name: id, kind: 'check', freqType: 'daily', days: [], timesPerWeek: 3, startDate: '2026-01-01', order: 0 }, extra || {});
function world(n) {
  const st = S.emptyState();
  for (let i = 0; i < (n || 8); i++) st.habits.push(habit('h' + i, { order: i }));
  return st;
}
const mark = (st, ids, key) => ids.forEach((id) => H.forceToggle(st, id, key));

console.log('Intensidad y cálculo diario');
t('1. 8 de 8 → 100 % y nivel máximo (rojo intenso)', () => {
  const st = world(8); mark(st, ['h0', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7'], '2026-11-20');
  const d = C.dayInfo(st, '2026-11-20', TODAY);
  assert.strictEqual(d.pct, 1); assert.strictEqual(d.bucket, 5); assert.strictEqual(C.alpha(d.pct), 1); assert.strictEqual(d.kind, 'full');
});
t('2. 4 de 8 → 50 %, intensidad intermedia', () => {
  const st = world(8); mark(st, ['h0', 'h1', 'h2', 'h3'], '2026-11-20');
  const d = C.dayInfo(st, '2026-11-20', TODAY);
  assert.strictEqual(d.pct, 0.5); assert.strictEqual(d.bucket, 3);
  assert.ok(C.alpha(0.5) > C.alpha(0.25) && C.alpha(0.5) < C.alpha(0.9));
});
t('3. 1 de 8 → 12,5 %, rojo muy tenue', () => {
  const st = world(8); mark(st, ['h0'], '2026-11-20');
  const d = C.dayInfo(st, '2026-11-20', TODAY);
  assert.strictEqual(d.bucket, 1); assert.ok(C.alpha(d.pct) < 0.25 && C.alpha(d.pct) > 0);
});
t('la escala es continua y creciente (no 5 colores fijos)', () => {
  let prev = 0;
  for (let p = 1; p <= 100; p++) { const a = C.alpha(p / 100); assert.ok(a > prev || (p === 100 && a === 1), 'p=' + p); prev = a; }
  assert.strictEqual(C.bucket(0.24), 1); assert.strictEqual(C.bucket(0.25), 2); assert.strictEqual(C.bucket(0.74), 3); assert.strictEqual(C.bucket(0.99), 4);
});
t('4. día sin hábitos programados ≠ día con 0 %', () => {
  const st = S.emptyState();
  st.habits.push(habit('lun', { freqType: 'weekdays', days: [1] }));
  const sinProg = C.dayInfo(st, '2026-11-18', TODAY); // miércoles
  const cero = C.dayInfo(st, '2026-11-16', TODAY); // lunes sin marcar
  assert.strictEqual(sinProg.kind, 'empty'); assert.strictEqual(sinProg.bucket, null);
  assert.strictEqual(cero.kind, 'zero'); assert.strictEqual(cero.bucket, 0);
});
t('5. cantidades parciales: 4 de 8 vasos = 50 % de ese hábito', () => {
  const st = S.emptyState();
  st.habits.push(habit('agua', { kind: 'quantity', qtyTarget: 8, qtyUnit: 'vasos', qtyStep: 1 }));
  st.habits.push(habit('leer'));
  st.habitQty = { agua: { '2026-11-20': 4 } };
  mark(st, ['leer'], '2026-11-20');
  const d = C.dayInfo(st, '2026-11-20', TODAY);
  assert.strictEqual(d.pct, 0.75); // (1 + 0,5) / 2
  assert.strictEqual(d.done, 1); // terminado sigue siendo solo "leer" (rachas y XP sin cambios)
  const det = C.dayDetail(st, '2026-11-20', TODAY);
  assert.strictEqual(det.qty[0].value, 4); assert.strictEqual(det.qty[0].frac, 0.5);
});
t('cantidad sin terminar nunca se muestra como 100 % aunque cambie el objetivo', () => {
  const st = S.emptyState();
  st.habits.push(habit('agua', { kind: 'quantity', qtyTarget: 4 }));
  st.habitQty = { agua: { '2026-11-10': 6 } }; // registro cerrado como no cumplido con objetivo anterior
  assert.ok(C.dayInfo(st, '2026-11-10', TODAY).pct < 1);
});
t('hábitos con días específicos: no programado no cuenta como incumplido', () => {
  const st = S.emptyState();
  st.habits.push(habit('a')); st.habits.push(habit('gym', { freqType: 'weekdays', days: [1, 3, 5] }));
  mark(st, ['a'], '2026-11-17'); // martes: "gym" no estaba programado
  assert.strictEqual(C.dayInfo(st, '2026-11-17', TODAY).pct, 1);
});
t('semanales: suman el día que se hicieron, nunca restan', () => {
  const st = S.emptyState();
  st.habits.push(habit('a')); st.habits.push(habit('w', { freqType: 'weekly', timesPerWeek: 2 }));
  mark(st, ['a'], '2026-11-17');
  assert.strictEqual(C.dayInfo(st, '2026-11-17', TODAY).pct, 1);
  mark(st, ['w'], '2026-11-18');
  assert.strictEqual(C.dayInfo(st, '2026-11-18', TODAY).pct, 0.5);
});
t('archivados: cuentan hasta que se archivaron, después no alteran', () => {
  const st = world(2); st.habits[1].archivedAt = '2026-11-15';
  mark(st, ['h0'], '2026-11-14'); mark(st, ['h0'], '2026-11-16');
  assert.strictEqual(C.dayInfo(st, '2026-11-14', TODAY).pct, 0.5);
  assert.strictEqual(C.dayInfo(st, '2026-11-16', TODAY).pct, 1);
});
t('antes del inicio de un hábito no cuenta', () => {
  const st = S.emptyState(); st.habits.push(habit('n', { startDate: '2026-11-20' }));
  assert.strictEqual(C.dayInfo(st, '2026-11-19', TODAY).kind, 'empty');
});
t('hábitos para evitar no entran en el %', () => {
  const st = world(1); st.habits.push(habit('fumar', { kind: 'negative' }));
  mark(st, ['h0'], '2026-11-20');
  assert.strictEqual(C.dayInfo(st, '2026-11-20', TODAY).pct, 1);
});
t('9. días futuros: sin color y fuera de las estadísticas', () => {
  const st = world(2);
  assert.strictEqual(C.dayInfo(st, '2026-11-25', TODAY).kind, 'future');
  const s = C.summary(st, '2026-11-23', '2026-11-29', TODAY);
  assert.strictEqual(s.future, 5); assert.strictEqual(s.zero, 1); // lunes 23 (hoy martes pendiente no cuenta)
  assert.strictEqual(s.counted, 1);
});
t('hoy pendiente no cuenta como incumplido; hoy completo sí suma', () => {
  const st = world(2);
  const s1 = C.summary(st, TODAY, TODAY, TODAY);
  assert.strictEqual(s1.counted, 0); assert.strictEqual(C.dayInfo(st, TODAY, TODAY).kind, 'pending');
  mark(st, ['h0', 'h1'], TODAY);
  const s2 = C.summary(st, TODAY, TODAY, TODAY);
  assert.strictEqual(s2.full, 1);
});

console.log('Períodos');
t('6. semana, mes, 3, 6 y 12 meses con rangos correctos', () => {
  assert.deepStrictEqual([C.period('week', TODAY).from, C.period('week', TODAY).to], ['2026-11-23', '2026-11-29']);
  assert.deepStrictEqual([C.period('month', TODAY).from, C.period('month', TODAY).to], ['2026-11-01', '2026-11-30']);
  const m3 = C.period('3m', TODAY); assert.deepStrictEqual([m3.from, m3.to, m3.months.length], ['2026-09-01', '2026-11-30', 3]);
  const m6 = C.period('6m', TODAY); assert.deepStrictEqual([m6.from, m6.months.length], ['2026-06-01', 6]);
  const y = C.period('12m', TODAY); assert.deepStrictEqual([y.from, y.to, y.months.length], ['2025-12-01', '2026-11-30', 12]);
  assert.strictEqual(D.range(y.from, y.to).length, 365);
});
t('navegación hacia atrás y adelante', () => {
  assert.strictEqual(C.shift('week', TODAY, -1), '2026-11-16');
  assert.strictEqual(C.shift('month', TODAY, -1), '2026-10-01');
  assert.strictEqual(C.shift('3m', TODAY, -1), '2026-08-01');
  assert.strictEqual(C.period('3m', C.shift('3m', TODAY, -1)).to, '2026-08-31');
  assert.strictEqual(C.shift('12m', '2026-01-15', 1), '2027-01-01');
  assert.strictEqual(C.period('month', '2028-02-10').to, '2028-02-29'); // año bisiesto
  assert.strictEqual(C.period('week', '2026-01-01').from, '2025-12-29'); // semana que cruza el año
});
t('etiquetas legibles', () => {
  assert.strictEqual(C.periodLabel(C.period('week', TODAY)), '23–29 de noviembre 2026');
  assert.strictEqual(C.periodLabel(C.period('12m', TODAY)), 'dic 2025 – nov 2026');
});

console.log('Estadísticas');
t('8. las estadísticas coinciden con las celdas', () => {
  const st = world(4);
  mark(st, ['h0', 'h1', 'h2', 'h3'], '2026-11-02'); // 100
  mark(st, ['h0', 'h1'], '2026-11-03'); // 50
  mark(st, ['h0'], '2026-11-04'); // 25
  const s = C.summary(st, '2026-11-01', '2026-11-30', TODAY);
  const cells = D.range('2026-11-01', '2026-11-30').map((k) => C.dayInfo(st, k, TODAY)).filter((d) => d.counted);
  assert.strictEqual(s.counted, cells.length);
  assert.strictEqual(s.full, cells.filter((d) => d.pct >= 1).length);
  assert.strictEqual(s.partial, cells.filter((d) => d.pct > 0 && d.pct < 1).length);
  assert.strictEqual(s.zero, cells.filter((d) => d.pct === 0).length);
  assert.ok(Math.abs(s.avg - cells.reduce((a, d) => a + d.pct, 0) / cells.length) < 1e-9);
  assert.strictEqual(s.best.key, '2026-11-02');
  assert.strictEqual(s.full + s.partial + s.zero, s.counted);
  assert.strictEqual(s.full, 1); assert.strictEqual(s.partial, 2);
});
t('racha actual solo si el período incluye hoy (y es la misma que en el resto de la app)', () => {
  const st = world(1);
  ['2026-11-21', '2026-11-22', '2026-11-23'].forEach((k) => mark(st, ['h0'], k));
  assert.strictEqual(C.summary(st, '2026-11-01', '2026-11-30', TODAY).streak, P.consistencyStreak(st, TODAY));
  assert.strictEqual(C.summary(st, '2026-10-01', '2026-10-31', TODAY).streak, null);
});
t('período sin datos: promedio vacío, no 0 % inventado', () => {
  const s = C.summary(S.emptyState(), '2026-11-01', '2026-11-30', TODAY);
  assert.strictEqual(s.avg, null); assert.strictEqual(s.best, null);
});
t('XP del día: la suma de todos los días coincide con la XP diaria total', () => {
  const st = world(3);
  for (let i = 0; i < 20; i++) { const k = D.addDays('2026-11-01', i); mark(st, ['h0', 'h1', 'h2'].slice(0, (i % 3) + 1), k); }
  st.journal.push({ id: 'j', date: '2026-11-05', text: 'hola', mood: 4 });
  const sum = D.range(P.startKey(st), TODAY).reduce((a, k) => a + C.dayXP(st, k, TODAY).total, 0);
  const x = P.xp(st, TODAY).breakdown.filter((r) => ['habit', 'perfect', 'journal', 'workout', 'pr'].includes(r.key)).reduce((a, r) => a + r.total, 0);
  assert.strictEqual(sum, x);
  const d = C.dayXP(st, '2026-11-03', TODAY); // 3 de 3 → 30 + 20 perfecto
  assert.strictEqual(d.total, 50);
});

console.log('Integridad');
t('7. consultar el calendario no modifica ningún registro', () => {
  const st = world(3); mark(st, ['h0'], '2026-11-02'); st.habitQty = { h1: { '2026-11-02': 2 } };
  const snap = JSON.stringify(st);
  ['week', 'month', '3m', '6m', '12m'].forEach((v) => { const p = C.period(v, TODAY); C.summary(st, p.from, p.to, TODAY); D.range(p.from, p.to).forEach((k) => C.dayInfo(st, k, TODAY)); });
  C.dayDetail(st, '2026-11-02', TODAY);
  assert.strictEqual(JSON.stringify(st), snap);
});
t('el detalle respeta la ventana de edición (días cerrados no son editables)', () => {
  const st = world(1);
  assert.strictEqual(C.dayDetail(st, '2026-11-10', TODAY).editable, false);
  assert.strictEqual(C.dayDetail(st, '2026-11-23', TODAY).editable, true);
  assert.strictEqual(C.dayDetail(st, '2026-11-25', TODAY).editable, false);
});
t('done/scheduled no cambian (rachas, día perfecto y XP siguen igual)', () => {
  const st = S.emptyState();
  st.habits.push(habit('agua', { kind: 'quantity', qtyTarget: 8 }));
  st.habitQty = { agua: { '2026-11-20': 7 } };
  const s = H.dayStatus(st, '2026-11-20', TODAY);
  assert.strictEqual(s.done, 0); assert.strictEqual(s.pct, 0); assert.strictEqual(s.status, 'none');
  assert.ok(Math.abs(s.weighted - 0.875) < 1e-9);
});

console.log('\n' + ok + ' pruebas OK');
