/* Pruebas de los mensajes motivacionales: node tests/motivacion.test.js */
const path = require('path').join(__dirname, '..', 'js') + '/';
['config/brand.js', 'config/xp.js', 'core/dates.js', 'core/store.js', 'core/perf.js', 'data/exercises.js', 'domain/rules.js', 'domain/habits.js', 'domain/gym.js', 'domain/progress.js', 'domain/game.js', 'domain/rewards.js', 'domain/calendar.js', 'domain/insights.js', 'domain/planner.js', 'domain/recovery.js', 'domain/wellbeing.js', 'data/motivation.js', 'domain/motivation.js'].forEach((f) => require(path + f));
const assert = require('assert');
const { store: S, habits: H, dates: D, motivation: MO, motivationData: MD } = globalThis.ASC;
let ok = 0;
const t = (name, fn) => { fn(); ok++; console.log('  ✓ ' + name); };
const T = '2026-11-24';
const at = (key, hhmm) => { const d = D.fromKey(key); const [h, m] = hhmm.split(':').map(Number); d.setHours(h, m, 0, 0); return d; };
const fresh = (mot) => { const st = S.emptyState(); st.createdAt = '2026-01-01T12:00:00Z'; Object.assign(st.settings.motivation, { enabled: true, choice: 'accepted', asked: true }, mot || {}); return st; };
const habit = (id, extra) => Object.assign({ id, name: 'Meditar en secreto', kind: 'check', freqType: 'daily', days: [], timesPerWeek: 3, startDate: '2026-01-01', order: 0, pauses: [] }, extra || {});
const noop = () => true;
/** Simula un día entero con la app abierta (tick cada 5 min) */
const runDay = (st, key, perm) => { const sent = []; for (let m = 0; m < 24 * 60; m += 5) { const now = at(key, MO.toTime(m)); const r = MO.tick(st, now, perm || 'granted', (a, b) => { sent.push({ t: MO.toTime(m), b }); return true; }); } return sent; };

console.log('Valores por defecto y migración');
t('desactivadas por defecto: solo se activan si el usuario acepta', () => {
  const st = S.emptyState();
  assert.strictEqual(st.settings.motivation.enabled, false);
  assert.strictEqual(st.settings.motivation.start, '09:00'); assert.strictEqual(st.settings.motivation.end, '21:00');
  assert.ok(st.settings.motivation.perDay >= 1 && st.settings.motivation.perDay <= 3);
  assert.deepStrictEqual(MO.planDay(st, T), []);
});
t('migración: datos viejos sin la sección la reciben sin perder nada', () => {
  const old = S.emptyState(); delete old.settings.motivation; delete old.motivationLog; old.habits.push(habit('h1'));
  const m = S.migrate(JSON.parse(JSON.stringify(old))).data;
  assert.strictEqual(m.settings.motivation.enabled, false); assert.deepStrictEqual(m.motivationLog, []); assert.strictEqual(m.habits.length, 1);
  const keep = S.emptyState(); keep.settings.motivation.perDay = 3; keep.settings.motivation.enabled = true;
  assert.strictEqual(S.migrate(JSON.parse(JSON.stringify(keep))).data.settings.motivation.perDay, 3, 'no pisa lo que el usuario eligió');
});

console.log('Planificación');
t('cantidad exacta, dentro de la franja y separados al menos 1 h', () => {
  for (const n of [1, 2, 3, 4, 5]) {
    const st = fresh({ perDay: n });
    for (let d = 0; d < 30; d++) {
      const key = D.addDays(T, d); const p = MO.planDay(st, key);
      assert.strictEqual(p.length, n, key + ' n=' + n);
      p.forEach((x) => assert.ok(x >= '09:00' && x <= '21:00', x));
      for (let i = 1; i < p.length; i++) assert.ok(MO.toMin(p[i]) - MO.toMin(p[i - 1]) >= 60, p.join(','));
    }
  }
});
t('determinístico: el mismo día da los mismos horarios; días distintos varían', () => {
  const st = fresh({ perDay: 2 });
  assert.deepStrictEqual(MO.planDay(st, T), MO.planDay(st, T));
  const set = new Set(); for (let d = 0; d < 10; d++) set.add(MO.planDay(st, D.addDays(T, d)).join());
  assert.ok(set.size > 5);
});
t('respeta los días elegidos', () => {
  const st = fresh({ days: [1, 3, 5] });
  for (let d = 0; d < 14; d++) { const k = D.addDays(T, d); assert.strictEqual(MO.planDay(st, k).length > 0, [1, 3, 5].includes(D.weekday(k)), k); }
});
t('nunca dentro del horario de silencio', () => {
  const st = fresh({ perDay: 3, start: '08:00', end: '23:00' });
  st.settings.reminders.quiet = { enabled: true, from: '13:00', to: '15:00' };
  for (let d = 0; d < 30; d++) MO.planDay(st, D.addDays(T, d)).forEach((x) => assert.ok(!(x >= '13:00' && x < '15:00'), x));
});

console.log('Envío');
t('un día completo respeta el tope diario y la franja', () => {
  for (const n of [1, 2, 3]) {
    const st = fresh({ perDay: n });
    const s = runDay(st, T);
    assert.strictEqual(s.length, n);
    s.forEach((x) => assert.ok(x.t >= '09:00' && x.t <= '21:00'));
  }
});
t('desactivadas o sin permiso: no se envía nada', () => {
  assert.strictEqual(runDay(fresh({ enabled: false }), T).length, 0);
  assert.strictEqual(runDay(fresh(), T, 'denied').length, 0);
  assert.strictEqual(runDay(fresh(), T, 'default').length, 0);
});
t('desactivar a mitad del día corta los siguientes', () => {
  const st = fresh({ perDay: 3 }); const p = MO.planDay(st, T); const sent = [];
  for (let m = 0; m < 24 * 60; m += 5) {
    const hh = MO.toTime(m);
    if (sent.length) st.settings.motivation.enabled = false;
    MO.tick(st, at(T, hh), 'granted', () => sent.push(hh));
  }
  assert.strictEqual(sent.length, 1);
});
t('permiso quitado en el sistema: se detiene', () => {
  const st = fresh({ perDay: 3 }); const p = MO.planDay(st, T); let n = 0;
  for (let m = 0; m < 24 * 60; m += 5) { const hh = MO.toTime(m); MO.tick(st, at(T, hh), n ? 'denied' : 'granted', () => n++); }
  assert.strictEqual(n, 1);
});
t('pausa de recordatorios: no se envía', () => {
  const st = fresh(); st.settings.reminders.pausedUntil = T;
  assert.strictEqual(runDay(st, T).length, 0);
  assert.ok(runDay(st, D.addDays(T, 1)).length > 0, 'al día siguiente vuelven');
});
t('entrenamiento o enfoque en curso: espera y envía después', () => {
  const st = fresh({ perDay: 1 }); const p = MO.planDay(st, T)[0];
  st.sessions.push({ id: 's1', status: 'in_progress' }); st.activeSessionId = 's1';
  assert.strictEqual(MO.tick(st, at(T, p), 'granted', noop).reason, 'workout');
  st.activeSessionId = null; st.focus = { startedAt: 'x' };
  assert.strictEqual(MO.tick(st, at(T, p), 'granted', noop).reason, 'focus');
  st.focus = null;
  const later = MO.toTime(MO.toMin(p) + 20);
  assert.strictEqual(MO.tick(st, at(T, later), 'granted', noop).sent, true);
});
t('horarios viejos (app cerrada) no se envían tarde ni se acumulan', () => {
  const st = fresh({ perDay: 3 }); const p = MO.planDay(st, T);
  // la app recién se abre al final de la franja
  const r = MO.tick(st, at(T, '21:00'), 'granted', noop);
  const stale = p.filter((x) => 21 * 60 - MO.toMin(x) > MO.STALE_MIN).length;
  assert.ok(stale >= 1);
  assert.ok((st.motivationLog || []).length <= 1, 'como mucho uno');
  assert.ok(r.sent || r.reason === 'stale');
  assert.strictEqual(MO.tick(st, at(T, '21:00'), 'granted', noop).sent, false, 'no se envía otro enseguida');
});
t('nunca dos con menos de una hora aunque el usuario cambie la franja', () => {
  const st = fresh({ perDay: 1 }); const s = runDay(st, T);
  assert.strictEqual(s.length, 1);
  st.settings.motivation.perDay = 3;
  const sent = []; for (let m = MO.toMin(s[0].t); m < MO.toMin(s[0].t) + 59; m += 1) MO.tick(st, at(T, MO.toTime(m)), 'granted', () => sent.push(m));
  assert.strictEqual(sent.length, 0);
});

console.log('Mensajes');
t('no se repite el mismo mensaje en días consecutivos ni en los últimos 3 días', () => {
  const st = fresh({ perDay: 3, personalize: false });
  const days = [];
  for (let d = 0; d < 40; d++) { const k = D.addDays(T, d); runDay(st, k); days.push(st.motivationLog.filter((x) => x.date === k).map((x) => x.id)); }
  for (let i = 1; i < days.length; i++) for (let j = Math.max(0, i - 3); j < i; j++) days[i].forEach((id) => assert.ok(!days[j].includes(id), 'repetido ' + id + ' día ' + i));
});
t('respeta los tipos elegidos', () => {
  const st = fresh({ perDay: 3, categories: ['entreno'], personalize: false });
  for (let d = 0; d < 5; d++) runDay(st, D.addDays(T, d));
  assert.ok(st.motivationLog.every((x) => x.id.startsWith('entreno-')));
});
t('privacidad: ningún mensaje incluye nombres de hábitos ni objetivos', () => {
  const st = fresh({ perDay: 5 }); st.habits.push(habit('h1'));
  st.goals.push({ id: 'g', title: 'Proyecto confidencial', status: 'active', steps: [1, 2, 3, 4, 5].map((i) => ({ id: 's' + i, title: 'x', done: i < 5 })) });
  const s = []; for (let d = 0; d < 10; d++) s.push(...runDay(st, D.addDays(T, d)));
  s.forEach((x) => { assert.ok(!/Meditar|confidencial/i.test(x.b), x.b); assert.ok(x.b.length <= 140); });
  MD.ALL.forEach((m) => assert.ok(m.text.length <= 140 && !/\{name\}/.test(m.text)));
});
t('contexto solo con datos que lo confirman', () => {
  const st = fresh({ perDay: 1 });
  assert.strictEqual(MO.context(st, T, 13 * 60), null, 'usuario sin datos: mensaje general');
  st.habits.push(habit('h1'));
  assert.strictEqual(MO.context(st, T, 10 * 60), null, 'antes del mediodía no se dice que quedan pendientes');
  assert.strictEqual(MO.context(st, T, 13 * 60), 'pending');
  H.forceToggle(st, 'h1', T);
  assert.notStrictEqual(MO.context(st, T, 13 * 60), 'pending', 'si ya los hizo, no lo afirma');
  st.settings.motivation.personalize = false; st.habits.push(habit('h2'));
  assert.strictEqual(MO.context(st, T, 13 * 60), null, 'personalización apagada');
});
t('objetivo cercano: solo si es real (≥ 80 % de los pasos y sin terminar)', () => {
  const st = fresh();
  const g = (done, status) => ({ id: 'g', title: 'x', status: status || 'active', steps: [1, 2, 3, 4, 5].map((i) => ({ id: 's' + i, title: 'x', done: i <= done })) });
  st.goals = [g(2)]; assert.strictEqual(MO.context(st, T, 600), null);
  st.goals = [g(4)]; assert.strictEqual(MO.context(st, T, 600), 'goal');
  st.goals = [g(5, 'done')]; assert.strictEqual(MO.context(st, T, 600), null);
});
t('cada contexto se usa una sola vez por día', () => {
  const st = fresh({ perDay: 3, categories: ['habitos'] }); st.habits.push(habit('h1'));
  const s = runDay(st, T);
  assert.ok(st.motivationLog.filter((x) => x.ctx === 'pending').length <= 1, JSON.stringify(s));
});
t('programación anticipada (app nativa): solo mensajes generales, sin repetir, dentro de reglas', () => {
  const st = fresh({ perDay: 2, days: [1, 2, 3, 4, 5] });
  const list = MO.scheduleAhead(st, at(T, '08:00'), 7);
  assert.ok(list.length >= 8);
  assert.strictEqual(new Set(list.map((x) => x.id)).size, list.length);
  list.forEach((x) => { assert.ok(!x.id.startsWith('ctx-')); assert.ok([1, 2, 3, 4, 5].includes(x.at.getDay())); });
  assert.deepStrictEqual(MO.scheduleAhead(fresh({ enabled: false }), at(T, '08:00'), 7), []);
});
t('validación de la configuración', () => {
  assert.ok(MO.validate(Object.assign({}, MO.DEFAULTS, { start: '20:00', end: '20:10' })).end);
  assert.ok(MO.validate(Object.assign({}, MO.DEFAULTS, { days: [] })).days);
  assert.ok(MO.validate(Object.assign({}, MO.DEFAULTS, { categories: [] })).categories);
  assert.deepStrictEqual(MO.validate(MO.DEFAULTS), {});
});

console.log('\n' + ok + ' pruebas OK');
