/* Pruebas del módulo de guía de gimnasio: node tests/rutinas.test.js */
const path = require('path').join(__dirname, '..', 'js') + '/';
['config/xp.js', 'core/dates.js', 'core/store.js', 'data/exercises.js', 'data/exercise-guide.js', 'domain/rules.js', 'domain/habits.js', 'domain/gym.js', 'domain/coach.js', 'domain/routine-guide.js'].forEach((f) => require(path + f));
const assert = require('assert');
const { store: S, routineGuide: RG, exerciseGuide: EG, exerciseData: X, gym: G, dates: D } = globalThis.ASC;
let ok = 0;
const t = (name, fn) => { fn(); ok++; console.log('  ✓ ' + name); };
const base = (level) => { const st = S.emptyState(); st.bodyProfile.level = level || 'Principiante'; return st; };
const it = (exerciseId, sets) => ({ id: exerciseId + Math.random(), exerciseId, sets: sets || 3, reps: '10-12', weight: '', rest: 90 });

console.log('Datos');
t('las 4 rutinas básicas existen con todos los campos', () => {
  assert.deepStrictEqual(EG.BASIC_ROUTINES.map((r) => r.muscle), ['pecho', 'espalda', 'piernas', 'brazos']);
  EG.BASIC_ROUTINES.forEach((r) => {
    assert.ok(r.name && r.level === 'Principiante' && r.description && r.tips.length >= 2);
    assert.ok(r.items.length >= 3 && r.items.length <= 4, r.id + ' con 3–4 ejercicios');
    r.items.forEach(([id, sets, reps, rest]) => { assert.ok(G.getExercise(S.emptyState(), id), id); assert.ok(sets >= 2 && sets <= 3); assert.ok(/^\d+-\d+$/.test(reps)); assert.ok(rest >= 60); });
    assert.ok(EG.estimateMinutes(r.items.map(([, sets, , rest]) => ({ sets, rest }))) <= 35);
  });
});
t('cada rutina básica trabaja su grupo', () => {
  const st = S.emptyState();
  EG.BASIC_ROUTINES.forEach((r) => r.items.forEach(([id]) => assert.ok(EG.BASIC_GROUPS[r.muscle].includes(G.getExercise(st, id).muscle), id + ' en ' + r.id)));
});
t('los 168 ejercicios tienen patrón, dificultad y ficha (específica o general)', () => {
  X.LIBRARY.forEach((e) => { assert.ok(EG.PATTERNS[EG.patternOf(e)], e.id); assert.ok([1, 2, 3].includes(EG.difficulty(e))); assert.ok(EG.guideFor(e).steps.length, e.id); });
  assert.strictEqual(X.LIBRARY.length, 168);
});
t('clasificación coherente: patrón compatible con el grupo muscular', () => {
  const allowed = { pecho: ['empuje-h', 'empuje-inc', 'fondos', 'apertura'], espalda: ['traccion-v', 'traccion-h', 'pullover', 'encogimiento', 'bisagra'], biceps: ['curl'], triceps: ['ext-codo', 'empuje-h', 'fondos'], gemelos: ['gemelos'] };
  X.LIBRARY.forEach((e) => { if (allowed[e.muscle]) assert.ok(allowed[e.muscle].includes(EG.patternOf(e)), e.id + ' → ' + EG.patternOf(e)); });
});

console.log('Recomendaciones al agregar');
t('rutina vacía: para pecho sugiere un compuesto accesible', () => {
  const r = RG.suggestFor(base(), [], 'pecho');
  assert.strictEqual(r.recommended[0].ex.type, 'c');
  assert.ok(EG.difficulty(r.recommended[0].ex) === 1);
});
t('con press de banca, no recomienda otro press plano y sí otra zona o un aislamiento', () => {
  const r = RG.suggestFor(base(), [it('press-banca')], 'pecho');
  r.recommended.forEach((x) => assert.ok(!(EG.patternOf(x.ex) === 'empuje-h' && x.ex.region === 'med'), x.ex.id));
  assert.ok(r.recommended.some((x) => x.ex.region !== 'med' || x.ex.type === 'a'));
  assert.strictEqual(r.list.find((x) => x.ex.id === 'press-banca-manc').status, 'similar');
  assert.strictEqual(r.list.find((x) => x.ex.id === 'press-banca').status, 'in');
});
t('avisa cuando el grupo ya tiene mucho volumen', () => {
  const r = RG.suggestFor(base(), [it('press-banca', 4), it('press-inclinado-manc', 4), it('pec-deck', 3)], 'pecho');
  assert.ok(r.volumeWarn);
});
t('respeta las preferencias: "evitar por encima de la cabeza" excluye el press militar', () => {
  const st = base(); st.settings.gym.avoid = ['overhead'];
  const r = RG.suggestFor(st, [], 'hombros');
  assert.strictEqual(r.list.find((x) => x.ex.id === 'press-militar').status, 'excluded');
  assert.ok(!r.recommended.some((x) => EG.avoidTagsOf(x.ex.id).includes('overhead')));
});
t('respeta el equipamiento disponible (solo mancuernas): no recomienda máquinas', () => {
  const st = base(); st.settings.gym.equipment = ['Mancuernas'];
  const r = RG.suggestFor(st, [], 'pecho');
  r.recommended.forEach((x) => assert.ok(['Mancuernas', 'Peso corporal'].includes(x.ex.equipment)));
});
t('un principiante no recibe ejercicios avanzados como recomendación', () => {
  const r = RG.suggestFor(base(), [], 'espalda');
  r.recommended.forEach((x) => assert.ok(EG.difficulty(x.ex) < 3, x.ex.id));
});

console.log('Análisis de rutina');
t('detecta repetidos, parecidos y exceso de series', () => {
  const a = RG.analyzeRoutine(base(), [it('press-banca', 4), it('press-banca', 4), it('press-pecho-maq', 4)]);
  const codes = a.checks.map((c) => c.code);
  assert.ok(codes.includes('duplicate') && codes.includes('similar') && codes.includes('volume'));
  assert.strictEqual(a.ok, false);
});
t('empujes sin tracciones: lo señala (sin declararlo error)', () => {
  const a = RG.analyzeRoutine(base(), [it('press-banca'), it('press-hombro-manc')]);
  const c = a.checks.find((x) => x.code === 'no-pull');
  assert.ok(c && c.level === 'info');
});
t('solo aislamientos en pecho: sugiere un compuesto', () => {
  assert.ok(RG.analyzeRoutine(base(), [it('pec-deck'), it('aperturas-manc')]).checks.some((c) => c.code === 'no-compound'));
});
t('ejercicio avanzado para principiante: ofrece una alternativa más simple', () => {
  const c = RG.analyzeRoutine(base(), [it('dominadas')]).checks.find((x) => x.code === 'level');
  assert.ok(c && c.easierId && EG.difficulty(G.getExercise(base(), c.easierId)) === 1);
});
t('las rutinas básicas no tienen advertencias', () => {
  const st = base();
  EG.BASIC_ROUTINES.forEach((b) => { const r = RG.routineFromBasic(st, b.id, []); const a = RG.analyzeRoutine(st, r.items, { focus: b.muscle }); assert.ok(a.ok, b.id + ': ' + JSON.stringify(a.checks)); });
});
t('nunca dice "equilibrada": informa qué se revisó', () => {
  const a = RG.analyzeRoutine(base(), [it('press-banca')]);
  assert.ok(a.evaluated.length >= 5);
  assert.ok(!JSON.stringify(a).toLowerCase().includes('equilibrada'));
});
t('resumen semanal: sin tracciones en ninguna rutina → advertencia', () => {
  const st = base();
  st.routines.push({ id: 'r', name: 'Push', days: [1], items: [it('press-banca')] });
  assert.ok(RG.weeklyAnalysis(st).checks.some((c) => c.code === 'no-pull'));
  st.routines.push({ id: 'r2', name: 'Pull', days: [3], items: [it('remo-polea')] });
  assert.ok(!RG.weeklyAnalysis(st).checks.some((c) => c.code === 'no-pull'));
});

console.log('Reemplazos');
t('press de banca → primero máquina/mancuernas (mismo patrón), con motivo', () => {
  const r = RG.replacementsFor(base(), 'press-banca', []);
  const top = r.list.slice(0, 4).map((x) => x.ex.id);
  assert.ok(top.includes('press-pecho-maq') && top.includes('press-banca-manc'), top.join(','));
  const maq = r.list.find((x) => x.ex.id === 'press-pecho-maq');
  assert.strictEqual(maq.label, 'Muy similar');
  assert.ok(/mismo patrón/i.test(maq.reason) && /guiada/.test(maq.reason));
});
t('jalón al pecho → otras tracciones verticales primero', () => {
  const r = RG.replacementsFor(base(), 'jalon-pecho', []);
  r.list.slice(0, 3).forEach((x) => assert.strictEqual(EG.patternOf(x.ex), 'traccion-v'));
});
t('las alternativas con otro patrón se marcan como no equivalentes', () => {
  const r = RG.replacementsFor(base(), 'press-banca', []);
  const ap = r.list.find((x) => x.ex.id === 'pec-deck');
  assert.strictEqual(ap.label, 'Alternativa parcial');
  assert.ok(/no es equivalente/.test(ap.reason));
});
t('excluye por preferencias y cuenta cuántas', () => {
  const st = base(); st.settings.gym.avoid = ['overhead'];
  const r = RG.replacementsFor(st, 'press-hombro-maq', []);
  assert.ok(!r.list.some((x) => x.ex.id === 'press-militar'));
  assert.ok(r.excluded > 0);
});
t('reemplazar no muta el original, conserva series y deja rastro', () => {
  const items = [it('press-banca', 4)];
  items[0].weight = 60;
  const snap = JSON.stringify(items);
  const out = RG.applyReplace(items, 0, 'press-pecho-maq', { keepSets: true });
  assert.strictEqual(JSON.stringify(items), snap);
  assert.strictEqual(out[0].exerciseId, 'press-pecho-maq');
  assert.strictEqual(out[0].sets, 4);
  assert.strictEqual(out[0].weight, '');
  assert.strictEqual(out[0].replaced[0].from, 'press-banca');
});
t('el historial no cambia al reemplazar en la rutina', () => {
  const st = base();
  const r = { id: 'r1', name: 'Pecho', days: [], items: [it('press-banca')] };
  st.routines.push(r);
  const sess = G.createSessionFromRoutine(st, r);
  sess.status = 'completed'; sess.endedAt = new Date().toISOString(); sess.exercises[0].sets.forEach((x) => { x.done = true; x.weight = 50; x.reps = 10; });
  st.sessions.push(sess);
  r.items = RG.applyReplace(r.items, 0, 'press-pecho-maq');
  assert.strictEqual(st.sessions[0].exercises[0].exerciseId, 'press-banca');
  assert.strictEqual(G.records(st, 'press-banca').sessions, 1);
});

console.log('Bienvenida y organización');
t('la bienvenida aparece solo si no se configuró y no hay rutinas ni entrenamientos', () => {
  const st = base();
  assert.strictEqual(RG.needsWelcome(st), true);
  st.settings.gym.setupDone = true; assert.strictEqual(RG.needsWelcome(st), false);
  const st2 = base(); st2.routines.push({ id: 'x', name: 'x', items: [] }); assert.strictEqual(RG.needsWelcome(st2), false);
});
t('la preferencia se conserva al migrar los datos', () => {
  const st = base(); st.settings.gym.setupDone = true; st.settings.gym.choice = 'basic';
  const m = S.migrate(JSON.parse(JSON.stringify(st))).data;
  assert.strictEqual(m.settings.gym.setupDone, true); assert.strictEqual(m.settings.gym.choice, 'basic');
  const old = S.migrate({ settings: { sound: true } }).data;
  assert.strictEqual(old.settings.gym.setupDone, false);
});
t('crear desde rutina básica: copia editable con días elegidos', () => {
  const st = base();
  const r = RG.routineFromBasic(st, 'basica-piernas', [2, 5]);
  assert.strictEqual(r.items.length, 4); assert.deepStrictEqual(r.days, [2, 5]); assert.strictEqual(r.source, 'basica-piernas');
  r.items[0].sets = 9; assert.strictEqual(EG.BASIC_ROUTINES[2].items[0][1], 3);
});
t('organización sin semana fija: la próxima es la siguiente a la última hecha', () => {
  const st = base(); st.settings.gym.scheduleMode = 'sequence';
  ['A', 'B', 'C'].forEach((n, i) => st.routines.push({ id: n, name: n, order: i, days: [], items: [it('prensa')] }));
  assert.strictEqual(G.nextWorkout(st, D.today()).routine.id, 'A');
  st.sessions.push({ id: 's', routineId: 'A', status: 'completed', startedAt: new Date(Date.now() - 2 * 864e5).toISOString(), endedAt: new Date(Date.now() - 2 * 864e5).toISOString(), exercises: [] });
  assert.strictEqual(G.nextWorkout(st, D.today()).routine.id, 'B');
});
t('valores orientativos por nivel: principiante con rangos y descansos moderados', () => {
  const o = RG.orientation(G.getExercise(base(), 'prensa'), 1, '');
  assert.strictEqual(o.repsTxt, '10-12'); assert.ok(o.restN >= 90);
  const n = RG.newItem(base(), G.getExercise(base(), 'curl-manc'));
  assert.strictEqual(n.reps, '12-15'); assert.strictEqual(n.sets, 2);
});

console.log('\n' + ok + ' pruebas OK');
