/* Pruebas de la combinación entre dispositivos y de la config sin credenciales: node tests/sync.test.js */
const path = require('path').join(__dirname, '..', 'js') + '/';
['config/brand.js', 'config/xp.js', 'config/app-config.js', 'core/dates.js', 'core/store.js', 'sync/merge.js'].forEach((f) => require(path + f));
const assert = require('assert');
const { store: S, merge: M, config: C, entitlements: E, brand: B } = globalThis.ASC;
let ok = 0;
const t = (name, fn) => { fn(); ok++; console.log('  ✓ ' + name); };
const h = (id, name, updatedAt) => ({ id, name, kind: 'check', updatedAt });

console.log('Combinación de datos (mergeStates)');
t('une hábitos creados en dispositivos distintos', () => {
  const a = S.emptyState(), b = S.emptyState();
  a.habits = [h('h1', 'Leer')]; b.habits = [h('h2', 'Correr')];
  const m = M.mergeStates(a, b);
  assert.deepStrictEqual(m.habits.map((x) => x.id).sort(), ['h1', 'h2']);
});
t('si el mismo hábito cambió en los dos, gana la edición más reciente', () => {
  const a = S.emptyState(), b = S.emptyState();
  a.habits = [h('h1', 'Leer 10 min', '2026-11-01T10:00:00Z')];
  b.habits = [h('h1', 'Leer 20 min', '2026-11-02T10:00:00Z')];
  assert.strictEqual(M.mergeStates(a, b).habits[0].name, 'Leer 20 min');
  assert.strictEqual(M.mergeStates(b, a).habits[0].name, 'Leer 20 min');
});
t('lo borrado en un dispositivo no revive desde el otro', () => {
  const a = S.emptyState(), b = S.emptyState();
  a.habits = []; M.markDeleted(a, 'h1');
  b.habits = [h('h1', 'Leer')];
  const m = M.mergeStates(a, b);
  assert.strictEqual(m.habits.length, 0);
  assert.ok(m.deleted.h1);
});
t('los días marcados se suman y no se pierden', () => {
  const a = S.emptyState(), b = S.emptyState();
  a.habitLogs = { h1: { '2026-11-01': true } };
  b.habitLogs = { h1: { '2026-11-02': true }, h2: { '2026-11-02': true } };
  const m = M.mergeStates(a, b);
  assert.deepStrictEqual(Object.keys(m.habitLogs.h1).sort(), ['2026-11-01', '2026-11-02']);
  assert.ok(m.habitLogs.h2['2026-11-02']);
});
t('cantidades: se conserva el mayor valor del día', () => {
  const a = S.emptyState(), b = S.emptyState();
  a.habitQty = { w: { '2026-11-01': 1.5 } }; b.habitQty = { w: { '2026-11-01': 2 } };
  assert.strictEqual(M.mergeStates(a, b).habitQty.w['2026-11-01'], 2);
});
t('recaídas y comodines sin duplicados', () => {
  const a = S.emptyState(), b = S.emptyState();
  a.relapses = { n: [{ date: '2026-11-01' }] }; b.relapses = { n: [{ date: '2026-11-01' }, { date: '2026-11-05' }] };
  a.freezes = { used: [{ date: '2026-10-10' }] }; b.freezes = { used: [{ date: '2026-10-10' }] };
  const m = M.mergeStates(a, b);
  assert.strictEqual(m.relapses.n.length, 2);
  assert.strictEqual(m.freezes.used.length, 1);
});
t('ajustes y perfil: se mantienen los del dispositivo local', () => {
  const a = S.emptyState(), b = S.emptyState();
  a.profile.name = 'Tomi'; b.profile.name = 'Otro'; a.settings.sound = true; b.settings.sound = false;
  const m = M.mergeStates(a, b);
  assert.strictEqual(m.profile.name, 'Tomi'); assert.strictEqual(m.settings.sound, true);
});
t('no modifica los objetos originales y el resultado pasa la migración', () => {
  const a = S.emptyState(), b = S.emptyState();
  a.habits = [h('h1', 'A')]; b.habits = [h('h2', 'B')];
  const snapA = JSON.stringify(a), snapB = JSON.stringify(b);
  const m = M.mergeStates(a, b);
  assert.strictEqual(JSON.stringify(a), snapA); assert.strictEqual(JSON.stringify(b), snapB);
  assert.deepStrictEqual(S.migrate(m).repaired, []);
});
t('una semana cerrada se conserva aunque el otro dispositivo no la tenga', () => {
  const a = S.emptyState(), b = S.emptyState();
  b.weeks = { '2026-11-02': { missions: ['m'], final: { done: 3 } } };
  a.weeks = { '2026-11-02': { missions: ['m'] } };
  assert.deepStrictEqual(M.mergeStates(a, b).weeks['2026-11-02'].final, { done: 3 });
});

t('v3: ánimo (el más reciente), rutinas de hábitos y actividades se combinan', () => {
  const a = S.emptyState(), b = S.emptyState();
  a.moodLog = { '2026-11-20': { mood: 2, at: '2026-11-20T10:00:00Z' } }; b.moodLog = { '2026-11-20': { mood: 4, at: '2026-11-20T20:00:00Z' }, '2026-11-21': { mood: 3, at: 'x' } };
  a.habitRoutines = [{ id: 'r1', name: 'A' }]; b.habitRoutines = [{ id: 'r2', name: 'B' }];
  a.routineLogs = { r1: { '2026-11-20': ['i1'] } }; b.routineLogs = { r1: { '2026-11-20': ['i2'] } };
  const m = M.mergeStates(a, b);
  assert.strictEqual(m.moodLog['2026-11-20'].mood, 4); assert.ok(m.moodLog['2026-11-21']);
  assert.strictEqual(m.habitRoutines.length, 2);
  assert.deepStrictEqual(m.routineLogs.r1['2026-11-20'].sort(), ['i1', 'i2']);
});

console.log('Configuración sin credenciales');
t('no hay credenciales cargadas: nada se conecta solo', () => {
  assert.strictEqual(C.supabase.url, ''); assert.strictEqual(C.supabase.anonKey, '');
  assert.strictEqual(C.push.vapidPublicKey, '');
});
t('sin plan pago, ninguna función queda bloqueada', () => {
  assert.strictEqual(E.has('estadisticas'), true); assert.strictEqual(E.has('gimnasio'), true);
});
t('la marca es configurable y tiene versión', () => {
  assert.ok(B.name && B.colors.accent && B.version && typeof B.apply === 'function');
});

console.log('\n' + ok + ' pruebas OK');
