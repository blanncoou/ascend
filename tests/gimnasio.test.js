/* Pruebas del módulo de gimnasio (Fase 3): node tests/gimnasio.test.js */
const path = require('path').join(__dirname, '..', 'js') + '/';
['config/xp.js', 'core/dates.js', 'core/store.js', 'core/perf.js', 'data/exercises.js', 'domain/rules.js', 'domain/habits.js', 'domain/gym.js'].forEach((f) => require(path + f));
const assert = require('assert');
const { gym: G, store: S } = globalThis.ASC;
let ok = 0;
const t = (name, fn) => { fn(); ok++; console.log('  ✓ ' + name); };

function sessionWith(st, exId, sets, daysAgo, extra) {
  const s = { id: S.uid(), routineName: 'R', startedAt: new Date(Date.now() - daysAgo * 864e5).toISOString(), endedAt: new Date(Date.now() - daysAgo * 864e5 + 3600e3).toISOString(), status: 'completed',
    exercises: [{ exerciseId: exId, name: exId, rest: 90, targetReps: '8-12', sets: sets.map(([w, r, more]) => Object.assign({ weight: w, reps: r, done: true }, more || {})) }] };
  Object.assign(s.exercises[0], extra || {});
  st.sessions.push(s);
  return s;
}

console.log('Doble progresión');
t('tope del rango en todas las series → sugiere subir el incremento de barra', () => {
  const st = S.emptyState();
  sessionWith(st, 'press-banca', [[60, 12], [60, 12], [60, 12]], 3);
  const s = G.suggestProgression(st, 'press-banca', '8-12');
  assert.strictEqual(s.type, 'increase');
  assert.strictEqual(s.weight, 62.5);
});
t('mancuernas suben de a 2 kg', () => {
  const st = S.emptyState();
  sessionWith(st, 'curl-manc', [[12, 12], [12, 12]], 2);
  assert.strictEqual(G.suggestProgression(st, 'curl-manc', '8-12').weight, 14);
});
t('dentro del rango → sumar repeticiones con el mismo peso', () => {
  const st = S.emptyState();
  sessionWith(st, 'press-banca', [[60, 12], [60, 10], [60, 9]], 3);
  const s = G.suggestProgression(st, 'press-banca', '8-12');
  assert.strictEqual(s.type, 'reps');
  assert.strictEqual(s.weight, 60);
});
t('debajo del mínimo → mantener', () => {
  const st = S.emptyState();
  sessionWith(st, 'press-banca', [[60, 9], [60, 7]], 3);
  assert.strictEqual(G.suggestProgression(st, 'press-banca', '8-12').type, 'keep');
});
t('tope pero al fallo (RIR 0) → mantener', () => {
  const st = S.emptyState();
  sessionWith(st, 'press-banca', [[60, 12, { rir: 0 }], [60, 12, { rir: 0 }]], 3);
  assert.strictEqual(G.suggestProgression(st, 'press-banca', '8-12').type, 'keep');
});
t('series sin completar en la última sesión → mantener', () => {
  const st = S.emptyState();
  const s = sessionWith(st, 'press-banca', [[60, 12], [60, 12]], 3);
  s.exercises[0].sets.push({ weight: 60, reps: '', done: false });
  assert.strictEqual(G.suggestProgression(st, 'press-banca', '8-12').type, 'keep');
});
t('sin historial o sin rango → ninguna sugerencia', () => {
  const st = S.emptyState();
  assert.strictEqual(G.suggestProgression(st, 'press-banca', '8-12').type, 'none');
  sessionWith(st, 'press-banca', [[60, 12]], 3);
  assert.strictEqual(G.suggestProgression(st, 'press-banca', '').type, 'none');
});
t('rangos de repeticiones', () => {
  assert.deepStrictEqual(G.parseRepRange('8-12'), [8, 12]);
  assert.deepStrictEqual(G.parseRepRange('12 a 8'), [8, 12]);
  assert.deepStrictEqual(G.parseRepRange('10'), [10, 10]);
  assert.strictEqual(G.parseRepRange('x'), null);
});

console.log('Calculadora de discos');
const KG = [25, 20, 15, 10, 5, 2.5, 1.25];
t('combinación exacta y simétrica', () => {
  const r = G.calcPlates(100, 20, KG);
  assert.ok(r.exact);
  assert.strictEqual(r.perSide.reduce((a, b) => a + b, 0), 40);
});
t('si no hay exacta, la más cercana con la diferencia', () => {
  const r = G.calcPlates(61, 20, KG);
  assert.ok(!r.exact);
  assert.strictEqual(r.loaded, 60);
  assert.strictEqual(r.diff, 1);
});
t('respeta la cantidad de pares disponibles', () => {
  const r = G.calcPlates(100, 20, [20, 10, 5], { 20: 1, 10: 0 });
  assert.ok(r.exact);
  assert.strictEqual(r.perSide.filter((x) => x === 20).length, 1);
  assert.ok(!r.perSide.includes(10));
});
t('libras', () => {
  const r = G.calcPlates(225, 45, [45, 35, 25, 10, 5, 2.5]);
  assert.deepStrictEqual(r.perSide, [45, 45]);
});
t('peso menor que la barra', () => {
  assert.ok(G.calcPlates(15, 20, KG).belowBar);
});

console.log('Superseries');
t('la sesión copia el grupo de la rutina', () => {
  const st = S.emptyState();
  const r = { id: 'r', name: 'R', items: [{ exerciseId: 'press-banca', sets: 3, reps: '8-12', group: 'g1' }, { exerciseId: 'remo-barra', sets: 3, reps: '8-12', group: 'g1' }, { exerciseId: 'curl-manc', sets: 2, reps: '10' }] };
  const s = G.createSessionFromRoutine(st, r);
  assert.strictEqual(s.exercises[0].group, 'g1');
  assert.strictEqual(s.exercises[1].group, 'g1');
  assert.strictEqual(s.exercises[2].group, null);
  assert.strictEqual(s.exercises[0].sets[0].reps, '', 'un rango no se convierte en NaN');
});

console.log('\n' + ok + ' pruebas OK');
