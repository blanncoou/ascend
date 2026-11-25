/* ASCEND · Lógica de gimnasio
 * Récords y progresión se calculan SOLO con series realmente completadas (done = true)
 * de entrenamientos finalizados. No hay estimaciones (ni 1RM) presentadas como datos.
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  const D = () => ASC.dates;

  function allExercises(state) {
    return ASC.exerciseData.LIBRARY.concat(state.exercises.filter((e) => !e.deletedAt));
  }

  function getExercise(state, id) {
    return ASC.exerciseData.LIBRARY.find((e) => e.id === id) || state.exercises.find((e) => e.id === id) || null;
  }

  function sessionDateKey(s) {
    return D().toKey(new Date(s.startedAt));
  }

  function completedSessions(state) {
    return state.sessions
      .filter((s) => s.status === 'completed')
      .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
  }

  function doneSets(ex) {
    return ex.sets.filter((s) => s.done);
  }

  function sessionStats(s) {
    let sets = 0, volume = 0, exercisesDone = 0, reps = 0;
    for (const ex of s.exercises) {
      const ds = doneSets(ex);
      if (ds.length) exercisesDone++;
      sets += ds.length;
      for (const st of ds) {
        volume += (Number(st.weight) || 0) * (Number(st.reps) || 0);
        reps += Number(st.reps) || 0;
      }
    }
    const end = s.endedAt ? new Date(s.endedAt) : new Date();
    return { sets, volume: Math.round(volume), reps, exercisesDone, durationMs: end - new Date(s.startedAt) };
  }

  /** Historial de un ejercicio, del más viejo al más nuevo */
  function exerciseHistory(state, exId) {
    const out = [];
    const list = completedSessions(state).slice().reverse();
    for (const s of list) {
      for (const ex of s.exercises) {
        if (ex.exerciseId !== exId) continue;
        const ds = doneSets(ex);
        if (!ds.length) continue;
        let bestWeight = -1, bestReps = 0, volume = 0, maxReps = 0;
        for (const st of ds) {
          const w = Number(st.weight) || 0, r = Number(st.reps) || 0;
          volume += w * r;
          if (w > bestWeight || (w === bestWeight && r > bestReps)) { bestWeight = w; bestReps = r; }
          maxReps = Math.max(maxReps, r);
        }
        out.push({ sessionId: s.id, date: sessionDateKey(s), startedAt: s.startedAt, sets: ds, bestWeight, bestReps, maxReps, volume: Math.round(volume) });
      }
    }
    return out;
  }

  function records(state, exId) {
    const hist = exerciseHistory(state, exId);
    let maxWeight = null, maxVolumeSet = null, maxReps = null;
    for (const h of hist) {
      for (const st of h.sets) {
        const w = Number(st.weight) || 0, r = Number(st.reps) || 0;
        if (!maxWeight || w > maxWeight.weight || (w === maxWeight.weight && r > maxWeight.reps)) maxWeight = { weight: w, reps: r, date: h.date };
        if (!maxVolumeSet || w * r > maxVolumeSet.weight * maxVolumeSet.reps) maxVolumeSet = { weight: w, reps: r, date: h.date };
        if (!maxReps || r > maxReps.reps) maxReps = { weight: w, reps: r, date: h.date };
      }
    }
    return { maxWeight, maxVolumeSet, maxReps, sessions: hist.length, history: hist };
  }

  /** Récords batidos en una sesión respecto de las sesiones finalizadas anteriores */
  function sessionPRs(state, session) {
    const prev = completedSessions(state).filter((s) => s.id !== session.id && s.startedAt < session.startedAt);
    const out = [];
    for (const ex of session.exercises) {
      const ds = doneSets(ex);
      if (!ds.length) continue;
      let prevBestW = null, prevBestR = null;
      for (const s of prev) for (const e of s.exercises) {
        if (e.exerciseId !== ex.exerciseId) continue;
        for (const st of doneSets(e)) {
          const w = Number(st.weight) || 0, r = Number(st.reps) || 0;
          if (prevBestW === null || w > prevBestW) prevBestW = w;
          if (prevBestR === null || r > prevBestR) prevBestR = r;
        }
      }
      if (prevBestW === null) continue; // primera vez: es la marca base, no un récord
      const bestW = Math.max(...ds.map((s) => Number(s.weight) || 0));
      const bestR = Math.max(...ds.map((s) => Number(s.reps) || 0));
      if (bestW > 0 && bestW > prevBestW) out.push({ exerciseId: ex.exerciseId, name: ex.name, kind: 'peso', value: bestW, prev: prevBestW });
      else if (bestW === 0 && prevBestW === 0 && bestR > prevBestR) out.push({ exerciseId: ex.exerciseId, name: ex.name, kind: 'reps', value: bestR, prev: prevBestR });
    }
    return out;
  }

  function totalPRs(state) {
    let n = 0;
    for (const s of completedSessions(state)) n += sessionPRs(state, s).length;
    return n;
  }

  /** Últimas series hechas de un ejercicio (para precargar valores) */
  function lastSetsFor(state, exId) {
    const hist = exerciseHistory(state, exId);
    return hist.length ? hist[hist.length - 1].sets : null;
  }

  function createSessionFromRoutine(state, routine) {
    const exercises = routine.items.map((it) => {
      const exInfo = getExercise(state, it.exerciseId);
      const last = lastSetsFor(state, it.exerciseId);
      const sets = [];
      const n = Math.max(1, Number(it.sets) || 1);
      for (let i = 0; i < n; i++) {
        const prev = last && last[i];
        sets.push({
          weight: prev ? prev.weight : (it.weight === '' || it.weight == null ? '' : Number(it.weight)),
          reps: prev ? prev.reps : (it.reps === '' || it.reps == null || isNaN(Number(it.reps)) ? '' : Number(it.reps)),
          done: false,
          doneAt: null,
        });
      }
      return {
        uid: ASC.store.uid(),
        exerciseId: it.exerciseId,
        name: exInfo ? exInfo.name : 'Ejercicio',
        rest: Number(it.rest) || 90,
        targetReps: it.reps,
        notes: it.notes || '',
        group: it.group || null, // superserie: ejercicios consecutivos con el mismo grupo
        sets,
      };
    });
    return {
      id: ASC.store.uid(),
      routineId: routine.id,
      routineName: routine.name,
      startedAt: new Date().toISOString(),
      endedAt: null,
      status: 'in_progress',
      currentIndex: 0,
      rest: null,
      exercises,
    };
  }

  /* ---------- Doble progresión ---------- */
  /** "8-12" → [8, 12]; "10" → [10, 10]; vacío → null */
  function parseRepRange(txt) {
    const m = String(txt || '').match(/(\d+)\s*[-–a]\s*(\d+)/);
    if (m) return [Math.min(+m[1], +m[2]), Math.max(+m[1], +m[2])];
    const n = parseInt(txt, 10);
    return isNaN(n) ? null : [n, n];
  }

  /** Incremento disponible según el equipamiento (en kg) */
  function weightStep(state, ex) {
    const eq = ex ? ex.equipment : '';
    if (eq === 'Barra') {
      const p = (state.settings && state.settings.plates) || {};
      const list = (p.kg || [1.25]).filter((x) => x > 0);
      return 2 * Math.min.apply(null, list.length ? list : [1.25]);
    }
    if (eq === 'Mancuernas') return 2;
    if (eq === 'Kettlebell') return 4;
    if (eq === 'Peso corporal') return 0;
    return 2.5; // máquina / polea: suele variar según la placa del equipo
  }

  /**
   * Sugerencia para la próxima sesión (doble progresión), basada en la última vez que se hizo el ejercicio.
   * Nunca cambia nada por sí sola: el usuario decide si la aplica.
   */
  function suggestProgression(state, exId, targetReps) {
    const hist = exerciseHistory(state, exId);
    if (!hist.length) return { type: 'none', reason: 'Todavía no hay historial de este ejercicio.' };
    const last = hist[hist.length - 1];
    const range = parseRepRange(targetReps);
    const ex = getExercise(state, exId);
    // series de trabajo: las del peso más alto usado
    const top = Math.max(...last.sets.map((x) => Number(x.weight) || 0));
    const work = last.sets.filter((x) => (Number(x.weight) || 0) === top);
    const reps = work.map((x) => Number(x.reps) || 0);
    const sess = state.sessions.find((x) => x.id === last.sessionId);
    const sx = sess && sess.exercises.find((e) => e.exerciseId === exId);
    const allDone = sx ? sx.sets.every((x) => x.done) : true;
    const efforts = work.map((x) => (x.rir !== undefined && x.rir !== '' ? { rir: Number(x.rir) } : x.rpe !== undefined && x.rpe !== '' ? { rpe: Number(x.rpe) } : null)).filter(Boolean);
    const maxed = efforts.length && efforts.every((e) => (e.rir !== undefined ? e.rir <= 0 : e.rpe >= 10));
    const lastTxt = work.length + '×' + (Math.min(...reps) === Math.max(...reps) ? reps[0] : Math.min(...reps) + '–' + Math.max(...reps)) + (top ? ' con ' + top + ' kg' : '');
    if (!range) return { type: 'none', reason: 'Definí un rango de repeticiones en la rutina (ej. 8-12) para recibir sugerencias.' };
    const [lo, hi] = range;
    if (!allDone) return { type: 'keep', weight: top, reason: 'La última vez (' + lastTxt + ') no completaste todas las series: repetí el peso.' };
    if (reps.every((r) => r >= hi)) {
      if (maxed) return { type: 'keep', weight: top, reason: 'Llegaste a ' + hi + ' reps pero al máximo esfuerzo: mantené el peso una sesión más.' };
      const step = weightStep(state, ex);
      if (!step) return { type: 'reps', weight: top, reason: 'Llegaste al tope del rango (' + lastTxt + '). Probá una variante más difícil o sumá carga externa.' };
      const next = Math.round((top + step) * 100) / 100;
      return { type: 'increase', weight: next, from: top, reason: 'Completaste ' + lastTxt + ', el tope del rango ' + lo + '–' + hi + '. Probá ' + next + ' kg (+' + step + ') y volvé a apuntar a ' + lo + ' reps.' };
    }
    if (reps.some((r) => r < lo)) return { type: 'keep', weight: top, reason: 'Alguna serie quedó debajo de ' + lo + ' reps (' + lastTxt + '): mantené el peso hasta completar el rango.' };
    return { type: 'reps', weight: top, reason: 'Mismo peso (' + top + ' kg) y buscá sumar repeticiones hasta llegar a ' + hi + ' en todas las series.' };
  }

  /* ---------- Calculadora de discos ---------- */
  /**
   * Discos por lado para llegar al peso total. plates: valores disponibles; pairs: { valor: pares disponibles } (vacío = sin límite).
   * Devuelve la combinación exacta o la más cercana (y su diferencia), con la menor cantidad de discos.
   */
  function calcPlates(total, bar, plates, pairs) {
    total = Number(total) || 0; bar = Number(bar) || 0;
    const list = plates.map(Number).filter((x) => x > 0).sort((a, b) => b - a);
    if (total <= bar || !list.length) return { perSide: [], loaded: Math.max(bar, 0), diff: total - bar, exact: total === bar, belowBar: total < bar };
    const scale = 100;
    const vals = list.map((v) => Math.round(v * scale));
    const gcd = (a, b) => (b ? gcd(b, a % b) : a);
    const g = vals.reduce((a, b) => gcd(a, b));
    const units = vals.map((v) => v / g);
    const targetSide = ((total - bar) / 2) * scale / g;
    const maxSum = Math.ceil(targetSide) + Math.max(...units);
    const INF = 1e9;
    const best = new Array(maxSum + 1).fill(INF);
    const how = new Array(maxSum + 1).fill(null);
    best[0] = 0;
    units.forEach((u, idx) => {
      const lim = pairs && pairs[list[idx]] !== undefined && pairs[list[idx]] !== '' ? Number(pairs[list[idx]]) : 20;
      for (let c = 0; c < lim; c++) {
        let changed = false;
        for (let s = maxSum; s >= u; s--) {
          if (best[s - u] + 1 < best[s]) { best[s] = best[s - u] + 1; how[s] = { prev: s - u, plate: list[idx] }; changed = true; }
        }
        if (!changed) break;
      }
    });
    let pick = 0, pd = Infinity;
    for (let s = 0; s <= maxSum; s++) {
      if (best[s] >= INF) continue;
      const d = Math.abs(s - targetSide);
      if (d < pd - 1e-9 || (Math.abs(d - pd) < 1e-9 && s < pick)) { pd = d; pick = s; }
    }
    const perSide = [];
    for (let s = pick; s > 0; s = how[s].prev) perSide.push(how[s].plate);
    perSide.sort((a, b) => b - a);
    const loaded = Math.round((bar + 2 * perSide.reduce((a, b) => a + b, 0)) * 100) / 100;
    return { perSide, loaded, diff: Math.round((total - loaded) * 100) / 100, exact: Math.abs(total - loaded) < 1e-9 };
  }

  function routinesForWeekday(state, wd) {
    return state.routines.filter((r) => (r.days || []).includes(wd));
  }

  function workedOutOn(state, key) {
    return state.sessions.some((s) => s.status === 'completed' && sessionDateKey(s) === key);
  }

  /** Próximo entrenamiento: rutina programada hoy (si no se hizo) o la próxima en la semana */
  function nextWorkout(state, todayKey) {
    if (!state.routines.length) return null;
    const gs = (state.settings && state.settings.gym) || {};
    if (gs.scheduleMode === 'sequence') {
      // Secuencia propia (sin semana fija): la siguiente a la última rutina completada
      const list = state.routines.slice().sort((a, b) => (a.order || 0) - (b.order || 0)).filter((r) => r.items.length);
      if (!list.length) return null;
      const lastDone = completedSessions(state).filter((s) => s.routineId).sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))[0];
      const k = lastDone ? list.findIndex((r) => r.id === lastDone.routineId) : -1;
      const doneToday = workedOutOn(state, todayKey);
      return { routine: list[(k + 1) % list.length], key: doneToday ? D().addDays(todayKey, 1) : todayKey, isToday: !doneToday, sequence: true, position: ((k + 1) % list.length) + 1, total: list.length };
    }
    const doneToday = workedOutOn(state, todayKey);
    for (let i = 0; i < 7; i++) {
      const key = D().addDays(todayKey, i);
      if (i === 0 && doneToday) continue;
      const list = routinesForWeekday(state, D().weekday(key));
      if (list.length) return { routine: list[0], key, isToday: i === 0 };
    }
    return null;
  }

  function workoutsInRange(state, from, to) {
    const list = completedSessions(state).filter((s) => {
      const k = sessionDateKey(s);
      return k >= from && k <= to;
    });
    const ms = list.reduce((a, s) => a + sessionStats(s).durationMs, 0);
    return { count: list.length, ms, list };
  }

  ASC.gym = {
    allExercises, getExercise, sessionDateKey, completedSessions, sessionStats, exerciseHistory,
    records, sessionPRs, totalPRs, lastSetsFor, createSessionFromRoutine, routinesForWeekday,
    workedOutOn, nextWorkout, workoutsInRange, doneSets, parseRepRange, weightStep, suggestProgression, calcPlates,
  };
})(typeof window !== 'undefined' ? window : globalThis);
