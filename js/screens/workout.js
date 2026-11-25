/* ASCEND · Entrenamiento activo
 * - Cada cambio se guarda al instante (sobrevive a cerrar la pestaña o recargar).
 * - El descanso guarda la HORA DE FIN, no un contador: si el navegador suspende la página, sigue siendo exacto.
 * - Al volver, la barra "Entrenamiento en curso" permite retomarlo desde cualquier pantalla.
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  const { esc, icon } = ASC.ui;
  const D = ASC.dates;
  const G = ASC.gym;

  let ticker = null;
  let wakeLock = null;

  function active() {
    const st = ASC.store.get();
    return st.sessions.find((x) => x.id === st.activeSessionId && x.status === 'in_progress') || null;
  }

  function exDone(ex) {
    return ex.sets.length > 0 && ex.sets.every((s) => s.done);
  }

  function render() {
    const st = ASC.store.get();
    const sess = active();
    if (!sess) {
      return '<div class="screen">' + ASC.ui.emptyState('dumbbell', 'Sin entrenamiento activo', 'Elegí una rutina para empezar a registrar tus series.', 'Elegir rutina', 'workout-pick') + '</div>';
    }
    const i = Math.min(sess.currentIndex || 0, sess.exercises.length - 1);
    const ex = sess.exercises[i];
    const info = G.getExercise(st, ex.exerciseId);
    const last = G.lastSetsFor(st, ex.exerciseId);
    const doneEx = sess.exercises.filter(exDone).length;

    let s = '<div class="screen no-tabs" style="padding-bottom:140px">';
    s += '<div class="wo-top"><div class="row between"><button class="icon-btn" data-act="wo-discard" aria-label="Descartar entrenamiento">' + icon('trash', 'sm') + '</button>' +
      '<div class="center"><div class="tiny muted" style="text-transform:uppercase;letter-spacing:1px">' + esc(sess.routineName) + '</div><div class="wo-clock" data-elapsed>' + D.clock((Date.now() - new Date(sess.startedAt)) / 1000) + '</div></div>' +
      '<button class="btn primary sm" data-act="wo-finish">Finalizar</button></div>' +
      '<div class="wo-dots">' + sess.exercises.map((e, k) => '<i class="' + (k === i ? 'cur' : exDone(e) ? 'done' : '') + '"></i>').join('') + '</div>' +
      '<div class="tiny muted mt" style="margin-top:8px">Ejercicio ' + (i + 1) + ' de ' + sess.exercises.length + ' · ' + doneEx + ' completos</div></div>';

    s += '<div class="badge red">' + esc(info ? ASC.exerciseData.muscleLabel(info.muscle) : 'Ejercicio') + '</div>';
    s += '<div class="wo-ex-title">' + esc(ex.name) + '</div>';
    s += '<div class="small muted">Objetivo: ' + ex.sets.length + ' × ' + esc(ex.targetReps || '—') + ' · descanso ' + D.clock(ex.rest) + '</div>';
    if (ex.swappedFrom) s += '<div class="tiny faint">Cambiado por hoy (en la rutina sigue ' + esc(ex.swappedFrom.name) + ').</div>';
    s += '<div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap">' + (ex.sets.some((x) => x.done) ? '' : '<button class="btn ghost sm" data-act="wo-swap">' + icon('refresh', 'xs') + 'Cambiar por hoy</button>') + '<a class="btn ghost sm" href="#/exercise/' + ex.exerciseId + '?from=wo">' + icon('book', 'xs') + 'Cómo se hace</a></div>';
    if (last) s += '<div class="prev-hint">Última vez: ' + last.map((x) => (Number(x.weight) || 0) + '×' + (Number(x.reps) || 0)).join(' · ') + '</div>';
    // Superserie
    const grp = groupOf(sess, i);
    if (grp.length > 1) {
      s += '<div class="ss-bar" role="group" aria-label="Superserie"><span class="badge red">Superserie</span>' + grp.map((k, n) =>
        '<button class="chip ' + (k === i ? 'on' : '') + '" data-act="wo-go" data-to="' + k + '">' + String.fromCharCode(65 + n) + ' · ' + esc(sess.exercises[k].name) + '</button>').join('') +
        '<div class="tiny muted" style="width:100%">Hacé una serie de cada ejercicio sin descanso; descansás al terminar la ronda.</div></div>';
    }
    // Progresión sugerida (nunca se aplica sola)
    const sug = G.suggestProgression(st, ex.exerciseId, ex.targetReps);
    if (sug.type !== 'none') {
      const pendingDiffer = ex.sets.some((x) => !x.done && Number(x.weight) !== sug.weight);
      s += '<div class="sug ' + sug.type + '"><div class="row" style="gap:10px;align-items:flex-start">' + icon(sug.type === 'increase' ? 'up' : 'target', 'sm') + '<div class="grow"><b class="small">' + (sug.type === 'increase' ? 'Sugerencia: subir a ' + sug.weight + ' kg' : sug.type === 'keep' ? 'Sugerencia: mantener ' + sug.weight + ' kg' : 'Sugerencia: sumar repeticiones') + '</b><div class="tiny muted" style="margin-top:3px">' + esc(sug.reason) + '</div>' +
        (sug.weight && pendingDiffer ? '<button class="btn ghost sm" style="margin-top:8px" data-act="wo-apply-sug" data-w="' + sug.weight + '">Usar ' + sug.weight + ' kg en las series pendientes</button>' : '') + '</div></div></div>';
    }
    if (info && info.equipment === 'Barra') s += '<button class="btn ghost sm mt" data-act="plates-open" data-w="' + esc((ex.sets.find((x) => !x.done) || ex.sets[0]).weight || '') + '">' + icon('dumbbell', 'xs') + 'Calcular discos</button>';

    s += '<div class="card mt"><div class="set-head"><span class="center">#</span><span class="center">Peso (kg)</span><span class="center">Reps</span><span></span></div>';
    const scale = st.settings.effortScale || 'none';
    if (scale !== 'none') s += '<div class="tiny muted" style="margin:-2px 4px 8px">' + (scale === 'rir' ? 'RIR = repeticiones que te quedaban (0 = al fallo).' : 'RPE = esfuerzo de 1 a 10 (10 = máximo).') + ' Opcional.</div>';
    s += ex.sets.map((st2, k) => '<div class="set-row ' + (st2.done ? 'done' : '') + (scale !== 'none' ? ' has-effort' : '') + '"><span class="n">' + (k + 1) + '</span>' +
      '<input class="input" inputmode="decimal" aria-label="Peso serie ' + (k + 1) + '" value="' + esc(st2.weight) + '" placeholder="0" data-input="wo-set" data-k="' + k + '" data-f="weight">' +
      '<input class="input" inputmode="numeric" aria-label="Repeticiones serie ' + (k + 1) + '" value="' + esc(st2.reps) + '" placeholder="0" data-input="wo-set" data-k="' + k + '" data-f="reps">' +
      '<button class="check ' + (st2.done ? 'on' : '') + '" data-act="wo-set-done" data-id="set-' + k + '" data-k="' + k + '" aria-pressed="' + st2.done + '" aria-label="Completar serie ' + (k + 1) + '">' + icon('check') + '</button>' +
      (scale !== 'none' ? effortSelect(scale, st2, k) : '') + '</div>').join('');
    s += '<div class="row mt"><button class="btn ghost sm grow" data-act="wo-add-set">' + icon('plus', 'xs') + 'Serie</button><button class="btn ghost sm grow" data-act="wo-remove-set"' + (ex.sets.length <= 1 ? ' disabled' : '') + '>' + icon('minus', 'xs') + 'Quitar última</button></div></div>';

    s += '<label class="field mt"><span>Notas del ejercicio</span><input class="input" maxlength="140" placeholder="Ej: subir peso la próxima" value="' + esc(ex.notes || '') + '" data-input="wo-notes"></label>';

    s += '<div class="wo-nav"><button class="btn ghost grow" data-act="wo-go" data-to="' + (i - 1) + '"' + (i === 0 ? ' disabled' : '') + '>' + icon('chevL', 'sm') + 'Anterior</button>' +
      (i < sess.exercises.length - 1 ? '<button class="btn primary grow" data-act="wo-go" data-to="' + (i + 1) + '">Siguiente' + icon('chevR', 'sm') + '</button>' : '<button class="btn primary grow" data-act="wo-finish">' + icon('trophy', 'sm') + 'Finalizar</button>') + '</div>';

    s += '<div class="section"><div class="section-title">Ejercicios de hoy</div><div class="list">' + sess.exercises.map((e, k) =>
      '<button class="list-item" data-act="wo-go" data-to="' + k + '"><span class="ex-avatar" style="' + (exDone(e) ? 'background:var(--red);color:#fff' : k === i ? 'outline:2px solid var(--red)' : '') + '">' + (exDone(e) ? icon('check', 'sm') : k + 1) + '</span><span class="grow"><b class="small">' + esc(e.name) + '</b><div class="tiny muted">' + e.sets.filter((x) => x.done).length + '/' + e.sets.length + ' series</div></span></button>').join('') + '</div></div>';

    s += '<div data-rest-slot></div></div>';
    return s;
  }

  /** Índices de los ejercicios de la misma superserie (consecutivos con el mismo grupo) */
  function groupOf(sess, i) {
    const g = sess.exercises[i] && sess.exercises[i].group;
    if (!g) return [i];
    let a = i, b = i;
    while (a > 0 && sess.exercises[a - 1].group === g) a--;
    while (b < sess.exercises.length - 1 && sess.exercises[b + 1].group === g) b++;
    const out = [];
    for (let k = a; k <= b; k++) out.push(k);
    return out;
  }

  function effortSelect(scale, set, k) {
    const opts = scale === 'rir' ? ['0', '1', '2', '3', '4', '5+'] : ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10'];
    const v = set[scale] === undefined ? '' : String(set[scale]);
    return '<label class="effort"><span>' + scale.toUpperCase() + '</span><select class="select" data-change="wo-effort" data-k="' + k + '" data-scale="' + scale + '" aria-label="' + scale.toUpperCase() + ' serie ' + (k + 1) + '"><option value="">—</option>' +
      opts.map((o) => '<option value="' + o + '"' + (v === o || (o === '5+' && v === '5') ? ' selected' : '') + '>' + o + '</option>').join('') + '</select></label>';
  }

  /* ---------- Descanso ---------- */
  function restHTML(sess) {
    const left = (sess.rest.endAt - Date.now()) / 1000;
    const pct = Math.max(0, Math.min(1, left / sess.rest.total));
    return '<div class="rest-timer" role="timer" aria-live="off"><div class="row between"><div><div class="tiny muted" style="text-transform:uppercase;letter-spacing:1px">' + (sess.rest.label || 'Descanso') + '</div><div class="time" data-rest-time>' + D.clock(left) + '</div></div>' +
      '<div class="row" style="gap:6px"><button class="btn ghost sm" data-act="wo-rest-add" data-s="-15">−15</button><button class="btn ghost sm" data-act="wo-rest-add" data-s="15">+15</button><button class="btn primary sm" data-act="wo-rest-skip">' + icon('skip', 'xs') + 'Saltar</button></div></div>' +
      '<div class="prog" data-rest-prog style="width:' + pct * 100 + '%"></div></div>';
  }

  function paintRest() {
    const slot = document.querySelector('[data-rest-slot]');
    if (!slot) return;
    const sess = active();
    if (sess && sess.rest && sess.rest.endAt > Date.now()) {
      if (!slot.querySelector('.rest-timer')) slot.innerHTML = restHTML(sess);
    } else slot.innerHTML = '';
  }

  function tick() {
    const sess = active();
    if (!sess || !document.querySelector('[data-elapsed]')) { stopTicker(); return; }
    const el = document.querySelector('[data-elapsed]');
    el.textContent = D.clock((Date.now() - new Date(sess.startedAt)) / 1000);
    if (sess.rest) {
      const left = (sess.rest.endAt - Date.now()) / 1000;
      if (left <= 0) {
        sess.rest = null;
        ASC.store.save();
        paintRest();
        ASC.ui.haptic([60, 60, 60]);
        ASC.ui.toast('Descanso terminado. ¡A la siguiente serie!');
      } else {
        const t = document.querySelector('[data-rest-time]');
        const p = document.querySelector('[data-rest-prog]');
        if (t) t.textContent = D.clock(left);
        if (p) p.style.width = Math.max(0, Math.min(1, left / sess.rest.total)) * 100 + '%';
      }
    }
  }

  function startTicker() {
    if (!ticker) ticker = setInterval(tick, 250);
  }
  function stopTicker() {
    clearInterval(ticker);
    ticker = null;
    if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
  }

  async function keepAwake() {
    try {
      if ('wakeLock' in navigator && !wakeLock) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => (wakeLock = null));
      }
    } catch (e) { /* no disponible: no pasa nada */ }
  }

  /* ---------- Acciones ---------- */
  function cur() {
    const sess = active();
    return sess ? { sess, ex: sess.exercises[sess.currentIndex || 0] } : {};
  }

  Object.assign(ASC.actions, {
    'wo-set': (el) => {
      const { ex } = cur();
      if (!ex) return;
      const raw = el.value.replace(',', '.');
      const n = parseFloat(raw);
      ex.sets[Number(el.dataset.k)][el.dataset.f] = raw === '' || isNaN(n) ? '' : n;
      ASC.store.save(); // guardado inmediato, sin redibujar (no se pierde el foco)
    },
    'wo-notes': (el) => {
      const { ex } = cur();
      if (!ex) return;
      ex.notes = el.value;
      ASC.store.save();
    },
    'wo-set-done': (el) => {
      const { sess, ex } = cur();
      if (!ex) return;
      const set = ex.sets[Number(el.dataset.k)];
      set.done = !set.done;
      set.doneAt = set.done ? new Date().toISOString() : null;
      if (set.done) {
        if (set.weight === '') set.weight = 0;
        if (set.reps === '') { const rr = G.parseRepRange(ex.targetReps); set.reps = rr ? rr[0] : 0; }
        // las series siguientes sin valores heredan los de esta
        for (let k = Number(el.dataset.k) + 1; k < ex.sets.length; k++) {
          const nx = ex.sets[k];
          if (nx.done) continue;
          if (nx.weight === '' || nx.weight === 0) nx.weight = set.weight;
          if (nx.reps === '') nx.reps = set.reps;
        }
        ASC.ui.burst(el);
        ASC.ui.haptic(15);
        const allDone = sess.exercises.every(exDone);
        const grp = groupOf(sess, sess.currentIndex || 0);
        const k = Number(el.dataset.k);
        if (grp.length > 1 && !allDone) {
          // Superserie: pasar al siguiente ejercicio del grupo con la misma serie pendiente; descanso al cerrar la ronda
          const pos = grp.indexOf(sess.currentIndex || 0);
          const nextInRound = grp.slice(pos + 1).find((j) => sess.exercises[j].sets[k] && !sess.exercises[j].sets[k].done);
          if (nextInRound !== undefined) {
            sess.rest = null;
            sess.currentIndex = nextInRound;
            ASC.ui.toast('Superserie: seguí con ' + sess.exercises[nextInRound].name + '.');
          } else {
            const roundRest = Number(sess.exercises[grp[grp.length - 1]].rest) || 0;
            if (roundRest > 0) sess.rest = { endAt: Date.now() + roundRest * 1000, total: roundRest, label: 'Descanso entre rondas' };
            const first = grp.find((j) => sess.exercises[j].sets.some((x) => !x.done));
            if (first !== undefined) sess.currentIndex = first;
          }
        } else if (!allDone && ex.rest > 0) sess.rest = { endAt: Date.now() + ex.rest * 1000, total: ex.rest };
        ASC._pop = 'set-' + el.dataset.k;
      } else sess.rest = null;
      ASC.app.commit({ silent: true });
    },
    'wo-effort': (el) => {
      const { ex } = cur();
      if (!ex) return;
      const set = ex.sets[Number(el.dataset.k)];
      const v = el.value === '5+' ? 5 : el.value;
      if (v === '') delete set[el.dataset.scale]; else set[el.dataset.scale] = Number(v);
      ASC.store.save();
    },
    'wo-apply-sug': (el) => {
      const { ex } = cur();
      if (!ex) return;
      ex.sets.forEach((x) => { if (!x.done) x.weight = Number(el.dataset.w); });
      ASC.app.commit({ silent: true });
      ASC.ui.toast('Peso aplicado a las series pendientes. Podés cambiarlo cuando quieras.');
    },
    'wo-swap': () => {
      const { sess, ex } = cur();
      if (!ex || ex.sets.some((x) => x.done)) return ASC.ui.toast('Ya registraste series de este ejercicio: no se puede cambiar.');
      ASC.gymGuide.openReplace({
        exId: ex.exerciseId, mode: 'session',
        getItems: () => sess.exercises.map((e) => ({ exerciseId: e.exerciseId })),
        onChoose: (newId) => {
          const st = ASC.store.get();
          const info = G.getExercise(st, newId);
          const last = G.lastSetsFor(st, newId);
          if (!ex.swappedFrom) ex.swappedFrom = { exerciseId: ex.exerciseId, name: ex.name };
          ex.exerciseId = newId;
          ex.name = info.name;
          ex.sets.forEach((x, k) => { x.weight = last && last[k] ? last[k].weight : ''; });
          ASC.app.commit({ silent: true });
          ASC.ui.toast('Cambiado por ' + info.name + ' solo en este entrenamiento.');
        },
      });
    },
    'wo-add-set': () => {
      const { ex } = cur();
      const prev = ex.sets[ex.sets.length - 1] || { weight: '', reps: '' };
      ex.sets.push({ weight: prev.weight, reps: prev.reps, done: false, doneAt: null });
      ASC.app.commit({ silent: true });
    },
    'wo-remove-set': async () => {
      const { ex } = cur();
      if (ex.sets.length <= 1) return;
      const last = ex.sets[ex.sets.length - 1];
      if (last.done && !(await ASC.ui.confirm({ title: '¿Quitar serie completada?', text: 'Se va a borrar del registro de este entrenamiento.', ok: 'Quitar', danger: true }))) return;
      ex.sets.pop();
      ASC.app.commit({ silent: true });
    },
    'wo-go': (el) => {
      const { sess } = cur();
      const to = Number(el.dataset.to);
      if (!sess || to < 0 || to >= sess.exercises.length) return;
      sess.currentIndex = to;
      ASC.store.save();
      ASC.app.render();
      window.scrollTo(0, 0);
    },
    'wo-rest-add': (el) => {
      const { sess } = cur();
      if (!sess || !sess.rest) return;
      sess.rest.endAt += Number(el.dataset.s) * 1000;
      sess.rest.total = Math.max(sess.rest.total, (sess.rest.endAt - Date.now()) / 1000);
      ASC.store.save();
      tick();
    },
    'wo-rest-skip': () => {
      const { sess } = cur();
      if (!sess) return;
      sess.rest = null;
      ASC.store.save();
      paintRest();
    },
    'wo-discard': async () => {
      if (!(await ASC.ui.confirm({ title: '¿Descartar entrenamiento?', text: 'Se pierden las series registradas en esta sesión.', ok: 'Descartar', danger: true }))) return;
      const st = ASC.store.get();
      ASC.merge && ASC.merge.markDeleted(st, st.activeSessionId);
      st.sessions = st.sessions.filter((x) => x.id !== st.activeSessionId);
      st.activeSessionId = null;
      stopTicker();
      location.hash = '#/gym';
      ASC.app.commit();
    },
    'wo-finish': async () => {
      const st = ASC.store.get();
      const sess = active();
      if (!sess) return;
      const total = sess.exercises.reduce((a, e) => a + e.sets.length, 0);
      const done = sess.exercises.reduce((a, e) => a + e.sets.filter((x) => x.done).length, 0);
      if (!done) {
        ASC.ui.toast('Completá al menos una serie para guardar el entrenamiento, o descartalo.');
        return;
      }
      if (done < total && !(await ASC.ui.confirm({ title: '¿Finalizar ahora?', text: 'Completaste ' + done + ' de ' + total + ' series. Solo se guardan las completadas.', ok: 'Finalizar' }))) return;
      const before = ASC.progress.xp(st).total;
      sess.status = 'completed';
      sess.endedAt = new Date().toISOString();
      sess.updatedAt = sess.endedAt;
      sess.rest = null;
      st.activeSessionId = null;
      // Integración con hábitos: los hábitos "Completar al entrenar" se marcan solos
      const today = D.today();
      st.habits.forEach((h) => {
        if (h.linkGym && !h.archivedAt && ASC.habits.isActiveOn(h, today) && !ASC.habits.isDone(st, h.id, today)) ASC.habits.toggle(st, h.id, today);
      });
      stopTicker();
      location.hash = '#/session/' + sess.id + '?summary=1';
      ASC.app.commit();
      const diff = ASC.progress.xp(st).total - before;
      if (diff > 0) ASC.ui.toast('<b>+' + diff + ' XP</b> Entrenamiento registrado.', 'xp', true);
    },
  });

  ASC.screens.workout = {
    render,
    tab: 'gym',
    noTabs: true,
    after() {
      if (active()) {
        paintRest();
        startTicker();
        keepAwake();
      }
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
