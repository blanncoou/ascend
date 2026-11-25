/* ASCEND · Guía de rutinas (lógica pura, sin DOM)
 *
 * - Analiza una rutina y explica QUÉ se revisó (nunca afirma que está "equilibrada" en general).
 * - Recomienda ejercicios para un grupo muscular según lo que ya tiene la rutina.
 * - Propone reemplazos ordenados por similitud, con el motivo.
 * - Respeta las preferencias del usuario (equipamiento disponible y "prefiero evitar").
 * Criterios documentados en docs/GIMNASIO.md.
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  const X = () => ASC.exerciseData;
  const EG = () => ASC.exerciseGuide;

  const PUSH = ['empuje-h', 'empuje-inc', 'empuje-v', 'fondos'];
  const PULL = ['traccion-v', 'traccion-h'];
  const BIG = ['pecho', 'espalda', 'cuadriceps'];
  const LEG_MUSCLES = ['cuadriceps', 'isquios', 'gluteos', 'gemelos'];
  const MINOR_REGIONS = ['espalda.trap', 'espalda.lumbar', 'pecho.inf'];

  const EQUIP_NOTE = {
    Máquina: 'trayectoria guiada, más sencilla de aprender',
    Mancuernas: 'cada lado trabaja por separado, con más rango y control',
    Polea: 'tensión constante en todo el recorrido',
    Barra: 'permite más carga, pero pide más técnica',
    'Peso corporal': 'no necesita equipamiento; la dificultad depende de tu peso',
    Kettlebell: 'agarre y trayectoria distintos a la mancuerna',
    Banda: 'liviano y portátil; la tensión aumenta al estirarla',
    Otro: 'equipamiento específico',
  };

  /* ---------- Preferencias del usuario ---------- */
  function gymSettings(state) {
    const g = (state.settings && state.settings.gym) || {};
    return {
      setupDone: !!g.setupDone,
      choice: g.choice || '',
      equipment: Array.isArray(g.equipment) ? g.equipment : [], // vacío = todo disponible
      avoid: Array.isArray(g.avoid) ? g.avoid : [],
      avoidExercises: Array.isArray(g.avoidExercises) ? g.avoidExercises : [],
      scheduleMode: g.scheduleMode === 'sequence' ? 'sequence' : 'week',
    };
  }

  function context(state) {
    const g = gymSettings(state);
    return { level: EG().levelNum((state.bodyProfile || {}).level), goal: (state.bodyProfile || {}).goal || '', g };
  }

  /** Motivo por el que un ejercicio queda fuera según tus preferencias (o null) */
  function excludedReason(ex, ctx) {
    if (!ex) return null;
    const g = ctx.g;
    if (g.avoidExercises.includes(ex.id)) return 'Lo marcaste para evitar.';
    const tag = EG().avoidTagsOf(ex.id).find((t) => g.avoid.includes(t));
    if (tag) return 'Preferís evitar: ' + EG().AVOID_TAGS[tag].label.toLowerCase() + '.';
    if (g.equipment.length && ex.equipment !== 'Peso corporal' && !g.equipment.includes(ex.equipment)) return 'No marcaste ' + ex.equipment.toLowerCase() + ' como equipamiento disponible.';
    return null;
  }

  /* ---------- Series sugeridas según nivel ---------- */
  function orientation(ex, level, goal) {
    const p = EG().patternOf(ex);
    if (p === 'cardio') return { sets: '1', reps: '10–20 min', rest: '—', setsN: 1, repsTxt: '15', restN: 0 };
    if (p === 'estabilidad') return { sets: '2–3', reps: '20–40 s', rest: '45–60 s', setsN: 3, repsTxt: '30', restN: 60 };
    const comp = ex.type === 'c';
    if (level <= 1 || !goal) {
      return comp ? { sets: '2–3', reps: '8–12', rest: '1,5–2 min', setsN: 3, repsTxt: '10-12', restN: 90 }
        : { sets: '2–3', reps: '10–15', rest: '1–1,5 min', setsN: 2, repsTxt: '12-15', restN: 60 };
    }
    const G = ASC.coach && ASC.coach.GOALS[goal];
    if (!G) return comp ? { sets: '3–4', reps: '6–12', rest: '2–3 min', setsN: 3, repsTxt: '8-12', restN: 120 } : { sets: '3', reps: '10–15', rest: '1–2 min', setsN: 3, repsTxt: '10-15', restN: 90 };
    return { sets: String(G.sets), reps: G.reps.replace('-', '–'), rest: G.rest, setsN: G.sets, repsTxt: G.reps, restN: comp ? G.restC : G.restA };
  }

  /** Item nuevo para una rutina con valores orientativos (editables) */
  function newItem(state, ex) {
    const c = context(state);
    const o = orientation(ex, c.level, c.goal);
    return { id: ASC.store ? ASC.store.uid() : String(Math.random()).slice(2), exerciseId: ex.id, sets: o.setsN, reps: o.repsTxt, weight: '', rest: o.restN, notes: '' };
  }

  /* ---------- Análisis de una rutina ---------- */
  function volumeLimit(level) {
    return level <= 1 ? 10 : 14;
  }

  function analyzeRoutine(state, items, opts) {
    opts = opts || {};
    const ctx = context(state);
    const rows = (items || []).map((it) => ({ it, ex: ASC.gym.getExercise(state, it.exerciseId) })).filter((r) => r.ex);
    const sets = {};
    const patterns = {};
    rows.forEach(({ it, ex }) => {
      const n = Math.max(1, Number(it.sets) || 1);
      sets[ex.muscle] = (sets[ex.muscle] || 0) + n;
      const p = EG().patternOf(ex);
      patterns[p] = (patterns[p] || 0) + n;
    });
    const checks = [];
    const add = (level, code, text, extra) => checks.push(Object.assign({ level, code, text }, extra || {}));

    // 1) Repetidos
    const seen = {};
    rows.forEach(({ ex }) => (seen[ex.id] = (seen[ex.id] || 0) + 1));
    Object.keys(seen).filter((id) => seen[id] > 1).forEach((id) => add('warn', 'duplicate', ASC.gym.getExercise(state, id).name + ' aparece ' + seen[id] + ' veces.', { exId: id }));

    // 2) Muy parecidos (mismo músculo, patrón y zona)
    const sim = {};
    rows.forEach(({ ex }) => {
      const k = ex.muscle + '|' + EG().patternOf(ex) + '|' + ex.region;
      sim[k] = sim[k] || [];
      if (!sim[k].some((e) => e.id === ex.id)) sim[k].push(ex);
    });
    Object.values(sim).filter((l) => l.length > 1).forEach((l) => {
      add(l.length > 2 ? 'warn' : 'info', 'similar', l.map((e) => e.name).join(', ') + ' trabajan casi igual (mismo patrón y misma zona). Si buscás variedad, cambiá uno por otro movimiento.', { ids: l.map((e) => e.id) });
    });

    // 3) Volumen por grupo
    const lim = volumeLimit(ctx.level);
    Object.keys(sets).filter((m) => m !== 'otros' && sets[m] > lim).forEach((m) =>
      add('warn', 'volume', X().muscleLabel(m) + ' suma ' + sets[m] + ' series en esta rutina. Como referencia, ' + (ctx.level <= 1 ? 'al empezar suelen alcanzar 6–10 por sesión' : 'más de 12–14 por sesión rara vez suma') + '; más series alargan la sesión y la recuperación.', { muscle: m }));

    // 4) Solo aislamientos en un grupo grande
    BIG.forEach((m) => {
      const here = rows.filter((r) => r.ex.muscle === m);
      if (here.length && here.every((r) => r.ex.type !== 'c')) add('info', 'no-compound', 'Para ' + X().muscleLabel(m).toLowerCase() + ' solo tenés aislamientos. Un ejercicio compuesto (' + (m === 'pecho' ? 'un press' : m === 'espalda' ? 'un remo o jalón' : 'prensa o sentadilla') + ') suele ser la base.', { muscle: m });
    });

    // 5) Empujes sin tracciones dentro de la rutina
    const push = PUSH.reduce((a, p) => a + (patterns[p] || 0), 0);
    const pull = PULL.reduce((a, p) => a + (patterns[p] || 0), 0);
    if (push >= 3 && !pull && opts.focus !== 'pecho') add('info', 'no-pull', 'Esta rutina tiene empujes pero ningún movimiento de tracción para espalda (remo o jalón). Está bien si la espalda la entrenás otro día: mirá el resumen de tu semana.');

    // 6) Nivel
    rows.forEach(({ ex }) => {
      if (EG().difficulty(ex) - ctx.level >= 2) {
        const easier = easierAlternative(state, ex, ctx);
        add('info', 'level', ex.name + ' es de nivel ' + EG().levelLabel(EG().difficulty(ex)).toLowerCase() + '.' + (easier ? ' Podés empezar con ' + easier.name + '.' : ' Aprendelo con poco peso o con ayuda de un profesional.'), { exId: ex.id, easierId: easier ? easier.id : null });
      }
    });

    // 7) Preferencias
    rows.forEach(({ ex }) => {
      const why = excludedReason(ex, ctx);
      if (why) add('warn', 'excluded', ex.name + ': ' + why, { exId: ex.id });
    });

    // 8) Largo
    const minutes = EG().estimateMinutes(items);
    const maxEx = ctx.level <= 1 ? 7 : 9;
    if (rows.length > maxEx) add('info', 'long', 'Tiene ' + rows.length + ' ejercicios. ' + (ctx.level <= 1 ? 'Para empezar, 3 a 6 bien hechos suelen ser suficientes.' : 'Revisá si todos aportan algo distinto.'));
    else if (minutes > (ctx.level <= 1 ? 60 : 90)) add('info', 'long', 'Duración estimada: ' + minutes + ' minutos.');

    return {
      sets, patterns, minutes, checks,
      ok: !checks.some((c) => c.level === 'warn'),
      evaluated: ['ejercicios repetidos', 'ejercicios muy parecidos', 'series por grupo muscular', 'compuestos en grupos grandes', 'empujes y tracciones', 'nivel de dificultad', 'tus preferencias', 'duración estimada'],
    };
  }

  function easierAlternative(state, ex, ctx) {
    const p = EG().patternOf(ex);
    return ASC.gym.allExercises(state)
      .filter((e) => e.id !== ex.id && e.muscle === ex.muscle && EG().patternOf(e) === p && EG().difficulty(e) <= ctx.level && !excludedReason(e, ctx))
      .sort((a, b) => (EG().GUIDES[b.id] ? 1 : 0) - (EG().GUIDES[a.id] ? 1 : 0))[0] || null;
  }

  /* ---------- Resumen semanal (todas las rutinas) ---------- */
  function weeklyAnalysis(state) {
    const g = gymSettings(state);
    const sets = {};
    let push = 0, pull = 0;
    state.routines.forEach((r) => {
      const times = g.scheduleMode === 'sequence' ? 1 : Math.max(1, (r.days || []).length);
      r.items.forEach((it) => {
        const ex = ASC.gym.getExercise(state, it.exerciseId);
        if (!ex) return;
        const n = Math.max(1, Number(it.sets) || 1) * times;
        sets[ex.muscle] = (sets[ex.muscle] || 0) + n;
        const p = EG().patternOf(ex);
        if (PUSH.includes(p)) push += n;
        if (PULL.includes(p)) pull += n;
      });
    });
    const checks = [];
    if (!state.routines.length) return { sets, checks, push, pull, evaluated: [] };
    if (push && !pull) checks.push({ level: 'warn', code: 'no-pull', text: 'Ninguna de tus rutinas tiene tracciones para espalda (remos o jalones). Equilibrar empujes y tracciones ayuda a los hombros y a la postura.' });
    else if (pull && push > pull * 2) checks.push({ level: 'info', code: 'push-pull', text: 'Hacés ' + push + ' series de empuje y ' + pull + ' de tracción por semana. Acercarlas suele ser una buena idea.' });
    if (!LEG_MUSCLES.some((m) => sets[m])) checks.push({ level: 'info', code: 'no-legs', text: 'Tus rutinas no incluyen piernas.' });
    const missing = ['pecho', 'espalda', 'hombros', 'abdomen'].filter((m) => !sets[m]);
    if (missing.length) checks.push({ level: 'info', code: 'missing', text: 'Sin trabajo directo: ' + missing.map((m) => X().muscleLabel(m).toLowerCase()).join(', ') + '. Puede ser una decisión tuya; solo lo señalamos.' });
    return { sets, checks, push, pull, evaluated: ['empujes y tracciones', 'piernas', 'grupos sin trabajo directo'], perWeek: g.scheduleMode !== 'sequence' };
  }

  /* ---------- Recomendaciones al agregar ---------- */
  function suggestFor(state, items, muscle) {
    const ctx = context(state);
    const all = ASC.gym.allExercises(state).filter((e) => e.muscle === muscle);
    const inRoutine = (items || []).map((it) => ASC.gym.getExercise(state, it.exerciseId)).filter(Boolean);
    const here = inRoutine.filter((e) => e.muscle === muscle);
    const hasComp = here.some((e) => e.type === 'c');
    const regionsHere = new Set(here.map((e) => e.region));
    const setsHere = (items || []).reduce((a, it) => { const e = ASC.gym.getExercise(state, it.exerciseId); return a + (e && e.muscle === muscle ? Math.max(1, Number(it.sets) || 1) : 0); }, 0);

    const list = all.map((ex) => {
      const reasons = [];
      let score = 0;
      let status = null;
      const p = EG().patternOf(ex);
      const dif = EG().difficulty(ex);
      const excl = excludedReason(ex, ctx);
      if (excl) return { ex, score: -999, status: 'excluded', reasons: [excl] };
      if (here.some((e) => e.id === ex.id)) return { ex, score: -500, status: 'in', reasons: ['Ya está en la rutina.'] };
      const twin = here.find((e) => EG().patternOf(e) === p && e.region === ex.region);
      if (twin) { score -= 30; status = 'similar'; reasons.push('Muy parecido a ' + twin.name + ', que ya tenés.'); }
      if (!here.length) {
        if (ex.type === 'c' || !BIG.includes(muscle)) { score += 25; reasons.push(ex.type === 'c' ? 'Ejercicio base para empezar con ' + X().muscleLabel(muscle).toLowerCase() + '.' : 'Buena opción para trabajar ' + X().muscleLabel(muscle).toLowerCase() + '.'); }
      } else {
        if (!regionsHere.has(ex.region) && !twin) { score += ex.type === 'c' ? 24 : 18; reasons.push('Trabaja una zona que tu rutina todavía no cubre: ' + X().regionLabel(ex.muscle, ex.region).toLowerCase() + '.'); }
        else if (hasComp && ex.type !== 'c' && !twin) { score += 12; reasons.push('Complementa lo que ya tenés con un aislamiento, con menos fatiga general.'); }
        if (!hasComp && ex.type === 'c' && BIG.includes(muscle)) { score += 22; reasons.push('Tu rutina no tiene un compuesto para este grupo: este puede ser la base.'); }
      }
      if (dif <= ctx.level) score += 15;
      else if (dif === ctx.level + 1) { score -= 5; reasons.push('Un nivel por encima del tuyo: empezá con poco peso.'); }
      else { score -= 35; reasons.push('Nivel ' + EG().levelLabel(dif).toLowerCase() + '.'); }
      if (EG().GUIDES[ex.id]) score += 8;
      if (MINOR_REGIONS.includes(ex.muscle + '.' + ex.region)) score -= 12; // zonas complementarias: no son la prioridad al armar una rutina
      if (ctx.goal === 'Fuerza' && ex.type === 'c') score += 4;
      return { ex, score, status, reasons, pattern: p, difficulty: dif };
    }).sort((a, b) => b.score - a.score || a.ex.name.localeCompare(b.ex.name, 'es'));

    // Recomendados: los mejores, pero sin repetir patrón+zona (variedad real)
    const recommended = [];
    const pool = list.filter((r) => !r.status && r.score > 0);
    // primero los de tu nivel; si no alcanzan, se completan con el siguiente nivel
    pool.filter((r) => r.difficulty <= ctx.level).concat(pool.filter((r) => r.difficulty > ctx.level)).forEach((r) => {
      if (recommended.length >= 3) return;
      const key = EG().patternOf(r.ex) + '|' + r.ex.region;
      if (!recommended.some((x) => EG().patternOf(x.ex) + '|' + x.ex.region === key)) recommended.push(r);
    });
    let note = '';
    if (!here.length) note = 'Tu rutina todavía no tiene ejercicios de ' + X().muscleLabel(muscle).toLowerCase() + '.';
    else note = 'Ya tenés: ' + here.map((e) => e.name).join(', ') + ' (' + setsHere + ' series).';
    const lim = volumeLimit(ctx.level);
    const volumeWarn = setsHere >= lim ? 'Ya sumás ' + setsHere + ' series de ' + X().muscleLabel(muscle).toLowerCase() + ' en esta rutina: agregar más probablemente no aporte mucho.' : '';
    return { list, recommended, note, volumeWarn, setsHere, here };
  }

  /* ---------- Reemplazos ---------- */
  function replacementsFor(state, exId, items) {
    const ctx = context(state);
    const base = ASC.gym.getExercise(state, exId);
    if (!base) return { base: null, list: [], excluded: 0 };
    const bp = EG().patternOf(base);
    const inRoutine = new Set((items || []).map((it) => it.exerciseId));
    let excluded = 0;
    const list = [];
    ASC.gym.allExercises(state).forEach((ex) => {
      if (ex.id === base.id) return;
      const p = EG().patternOf(ex);
      const sameMuscle = ex.muscle === base.muscle;
      const samePattern = p === bp;
      if (!sameMuscle && !samePattern) return;
      if (!sameMuscle && samePattern && ex.muscle !== base.muscle && !(base.secondary || []).includes(ex.muscle) && !(ex.secondary || []).includes(base.muscle)) return;
      if (excludedReason(ex, ctx)) { excluded++; return; }
      let s = 0;
      if (sameMuscle) s += 35;
      if (samePattern) s += 35;
      if (ex.region === base.region) s += 15;
      if (ex.type === base.type) s += 5;
      const dif = EG().difficulty(ex);
      if (dif <= ctx.level) s += 5;
      if (dif > ctx.level) s -= 8 * (dif - ctx.level);
      if (ex.equipment === 'Peso corporal' && base.equipment !== 'Peso corporal') s -= 3;
      if (EG().GUIDES[ex.id]) s += 1;
      const parts = [];
      parts.push(samePattern ? 'Mismo patrón (' + EG().patternLabel(p).toLowerCase() + ')' : 'Otro movimiento (' + EG().patternLabel(p).toLowerCase() + '): no es equivalente');
      if (ex.equipment !== base.equipment) parts.push(EQUIP_NOTE[ex.equipment] || ex.equipment.toLowerCase());
      else parts.push('con el mismo equipamiento');
      if (ex.region !== base.region && sameMuscle) parts.push('cambia el énfasis a ' + X().regionLabel(ex.muscle, ex.region).toLowerCase());
      if (ex.type !== base.type) parts.push(ex.type === 'c' ? 'es compuesto: suma otros músculos y permite más carga' : 'es de aislamiento: más localizado y con menos carga');
      if (dif > ctx.level) parts.push('más exigente técnicamente (' + EG().levelLabel(dif).toLowerCase() + ')');
      const label = s >= 85 ? 'Muy similar' : s >= 65 ? 'Similar' : 'Alternativa parcial';
      list.push({ ex, score: s, label, reason: parts.join('; ') + '.', status: inRoutine.has(ex.id) ? 'in' : null, difficulty: dif });
    });
    list.sort((a, b) => b.score - a.score || a.ex.name.localeCompare(b.ex.name, 'es'));
    return { base, list, excluded };
  }

  /** Reemplaza el ejercicio de una posición (devuelve una copia; el historial no se toca) */
  function applyReplace(items, index, newExId, opts) {
    opts = Object.assign({ keepSets: true, keepWeight: false }, opts || {});
    const out = JSON.parse(JSON.stringify(items));
    const it = out[index];
    if (!it) return out;
    const from = it.exerciseId;
    it.exerciseId = newExId;
    if (!opts.keepWeight) it.weight = '';
    if (!opts.keepSets && opts.defaults) { it.sets = opts.defaults.sets; it.reps = opts.defaults.reps; it.rest = opts.defaults.rest; }
    it.replaced = (it.replaced || []).concat({ from, at: new Date().toISOString() }).slice(-10);
    return out;
  }

  /* ---------- Rutinas básicas ---------- */
  function basicRoutine(id) {
    return EG().BASIC_ROUTINES.find((r) => r.id === id) || null;
  }

  /** Crea una rutina del usuario a partir de una básica (copia editable) */
  function routineFromBasic(state, id, days) {
    const b = basicRoutine(id);
    if (!b) return null;
    return {
      id: ASC.store.uid(), name: b.name.replace(' · Iniciación', ''), description: 'Rutina básica de iniciación (editable)', days: (days || []).slice(), order: state.routines.length,
      createdAt: new Date().toISOString(), source: b.id,
      items: b.items.map(([exerciseId, sets, reps, rest, note]) => ({ id: ASC.store.uid(), exerciseId, sets, reps, weight: '', rest, notes: '' })),
    };
  }

  /** ¿Mostrar la bienvenida del gimnasio? Solo si nunca se configuró y no hay rutinas ni entrenamientos */
  function needsWelcome(state) {
    const g = gymSettings(state);
    if (g.setupDone) return false;
    return !state.routines.length && !state.sessions.some((s) => s.status === 'completed');
  }

  ASC.routineGuide = {
    gymSettings, context, excludedReason, orientation, newItem, analyzeRoutine, weeklyAnalysis, suggestFor, replacementsFor, applyReplace,
    basicRoutine, routineFromBasic, needsWelcome, easierAlternative, EQUIP_NOTE, PUSH, PULL,
  };
})(typeof window !== 'undefined' ? window : globalThis);
