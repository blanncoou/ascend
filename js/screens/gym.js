/* ASCEND · Gimnasio: rutinas, biblioteca de ejercicios, historial y seguimiento físico */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  const { esc, icon } = ASC.ui;
  const D = ASC.dates;
  const G = ASC.gym;
  const X = ASC.exerciseData;
  const EG = ASC.exerciseGuide;
  const RG = ASC.routineGuide;
  const GG = () => ASC.gymGuide;

  const TEMPLATES = {
    ppl: { label: 'Push / Pull / Legs', routines: [
      { name: 'Push', description: 'Pecho, hombros y tríceps', days: [1, 4], items: [['press-banca', 4, 8], ['press-inclinado-manc', 3, 10], ['press-hombro-manc', 3, 10], ['elev-laterales', 3, 15], ['ext-triceps-polea', 3, 12]] },
      { name: 'Pull', description: 'Espalda y bíceps', days: [2, 5], items: [['dominadas', 4, 8], ['remo-barra', 4, 8], ['jalon-pecho', 3, 10], ['face-pull', 3, 15], ['curl-manc', 3, 12]] },
      { name: 'Legs', description: 'Piernas y glúteos', days: [3, 6], items: [['sentadilla', 4, 6], ['peso-muerto-rumano', 3, 8], ['prensa', 3, 10], ['curl-femoral', 3, 12], ['gemelos-pie', 4, 12]] },
    ] },
    tp: { label: 'Torso / Pierna', routines: [
      { name: 'Torso', description: 'Empuje y tracción', days: [1, 4], items: [['press-banca', 4, 8], ['remo-barra', 4, 8], ['press-hombro-manc', 3, 10], ['jalon-pecho', 3, 10], ['curl-manc', 2, 12], ['ext-triceps-polea', 2, 12]] },
      { name: 'Pierna', description: 'Cuádriceps, isquios y glúteos', days: [2, 5], items: [['sentadilla', 4, 6], ['peso-muerto-rumano', 3, 8], ['bulgara', 3, 10], ['curl-femoral', 3, 12], ['gemelos-pie', 3, 15], ['plancha', 3, 40]] },
    ] },
    fb: { label: 'Full Body', routines: [
      { name: 'Full Body', description: 'Cuerpo completo', days: [1, 3, 5], items: [['sentadilla', 3, 8], ['press-banca', 3, 8], ['remo-manc', 3, 10], ['press-hombro-manc', 3, 10], ['peso-muerto-rumano', 3, 10], ['plancha', 3, 30]] },
    ] },
  };

  function seg(tab) {
    const tabs = [['routines', 'Rutinas'], ['exercises', 'Ejercicios'], ['history', 'Historial'], ['body', 'Físico']];
    return '<nav class="seg" aria-label="Secciones de gimnasio">' + tabs.map(([id, l]) => '<a href="#/gym?tab=' + id + '" class="' + (tab === id ? 'on' : '') + '">' + l + '</a>').join('') + '</nav>';
  }

  function daysBadges(days) {
    return '<div class="days">' + [1, 2, 3, 4, 5, 6, 0].map((d) => '<i class="' + ((days || []).includes(d) ? 'on' : '') + '">' + D.DIAS_LETRA[d] + '</i>').join('') + '</div>';
  }

  function initials(name) {
    return esc(name.split(' ').filter((w) => w.length > 2).slice(0, 2).map((w) => w[0]).join('') || name.slice(0, 2));
  }

  function render(p, q) {
    if (RG.needsWelcome(ASC.store.get()) && !q.tab) return GG().welcome();
    const tab = q.tab || 'routines';
    let s = '<div class="screen"><div class="head"><div><h1>Gimnasio</h1><div class="sub">Tu registro de entrenamiento</div></div></div>' + seg(tab);
    if (tab === 'exercises') s += exercisesTab(q);
    else if (tab === 'history') s += historyTab();
    else if (tab === 'body') s += bodyTab();
    else s += routinesTab();
    const fab = { routines: ['routine-new', 'Nueva rutina'], exercises: ['exercise-new', 'Crear ejercicio'], body: ['metric-new', 'Nuevo registro'] }[tab];
    if (fab) s += '<button class="fab" data-act="' + fab[0] + '" aria-label="' + fab[1] + '">' + icon('plus') + '</button>';
    return s + '</div>';
  }

  /* ---------- Rutinas ---------- */
  function routinesTab() {
    const st = ASC.store.get();
    const list = st.routines.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
    if (!list.length) {
      return ASC.ui.emptyState('dumbbell', 'Sin rutinas todavía', 'Empezá con una rutina básica para aprender los ejercicios, o creá la tuya desde cero.', 'Crear rutina', 'routine-new') +
        '<a class="card basic-cta" href="#/basic"><span class="ex-avatar">' + icon('play', 'sm') + '</span><span class="grow"><b class="small">Rutinas básicas para empezar</b><div class="tiny muted">Pecho, espalda, piernas y brazos · nivel principiante</div></span>' + icon('chevR', 'sm chev') + '</a>' +
        learnBlock() +
        '<div class="section"><div class="section-title">Plantillas</div><div class="list">' + Object.keys(TEMPLATES).map((k) =>
          '<button class="list-item" data-act="routine-template" data-id="' + k + '"><span class="ex-avatar">' + initials(TEMPLATES[k].label) + '</span><span class="grow"><b class="small">' + TEMPLATES[k].label + '</b><div class="tiny muted">' + TEMPLATES[k].routines.length + ' rutinas · editables</div></span>' + icon('plus', 'sm red') + '</button>').join('') + '</div></div>';
    }
    const total = G.completedSessions(st).length;
    const gs = RG.gymSettings(st);
    let s = '<div class="tool-row"><a class="btn ghost sm" href="#/basic">' + icon('play', 'xs') + 'Rutinas básicas</a><button class="btn ghost sm" data-act="gym-prefs">' + icon('sliders', 'xs') + 'Preferencias</button><button class="btn ghost sm" data-act="plates-open">' + icon('dumbbell', 'xs') + 'Discos</button><a class="btn ghost sm" href="#/gym-start">¿Cómo empezar?</a></div>';
    s += '<div class="stat-grid three" style="margin-bottom:16px"><div class="stat"><div class="v">' + list.length + '</div><div class="k">rutinas</div></div><div class="stat"><div class="v">' + total + '</div><div class="k">entrenamientos</div></div><div class="stat"><div class="v">' + G.workoutsInRange(st, D.weekStart(D.today()), D.today()).count + '</div><div class="k">esta semana</div></div></div>';
    s += '<div class="card-grid">' + list.map((r, i) => '<div class="card routine-card"><div class="row between"><a href="#/routine/' + r.id + '" class="grow"><h3>' + esc(r.name) + '</h3><div class="small muted">' + r.items.length + ' ejercicios' + (r.description ? ' · ' + esc(r.description) : '') + '</div></a>' +
      '<div class="row" style="gap:6px"><button class="icon-btn" style="width:34px;height:34px" data-act="routine-move" data-id="' + r.id + '" data-dir="-1" aria-label="Subir"' + (i === 0 ? ' disabled style="opacity:.3;width:34px;height:34px"' : '') + '>' + icon('up', 'xs') + '</button><button class="icon-btn" style="width:34px;height:34px" data-act="routine-move" data-id="' + r.id + '" data-dir="1" aria-label="Bajar"' + (i === list.length - 1 ? ' disabled style="opacity:.3;width:34px;height:34px"' : '') + '>' + icon('down', 'xs') + '</button></div></div>' +
      '<div class="row between mt rc-foot">' + (gs.scheduleMode === 'sequence' ? '<span class="badge">Día ' + (i + 1) + '</span>' : daysBadges(r.days)) + '<button class="btn primary sm" data-act="workout-start" data-id="' + r.id + '"' + (r.items.length ? '' : ' disabled') + '>' + icon('play', 'xs') + 'Empezar</button></div></div>').join('') + '</div>';
    const wk = RG.weeklyAnalysis(st);
    if (wk.checks.length) s += '<div class="section">' + GG().analysisCard(wk, gs.scheduleMode === 'sequence' ? 'Resumen de tus rutinas' : 'Resumen de tu semana') + '</div>';
    s += learnBlock();
    return s;
  }

  /** "Aprendé lo básico": glosario desplegable */
  function learnBlock() {
    const terms = ['series', 'repeticiones', 'rango', 'descanso', 'sobrecarga', 'rir', 'rpe', 'calentamiento', 'recuperacion', 'compuesto'];
    return '<details class="card mt learn"><summary class="small" style="font-weight:700">' + icon('book', 'xs red') + ' Aprendé lo básico</summary>' + terms.map((k) =>
      '<details class="learn-item"><summary class="small">' + esc(EG.GLOSSARY[k].t) + '</summary><p class="small muted">' + esc(EG.GLOSSARY[k].d) + '</p></details>').join('') + '</details>';
  }

  function routineDetail(id) {
    const st = ASC.store.get();
    const r = st.routines.find((x) => x.id === id);
    if (!r) return '<div class="screen"><div class="empty"><h3>Rutina no encontrada</h3><a class="btn primary" href="#/gym">Volver</a></div></div>';
    let s = '<div class="screen"><div class="head"><a class="icon-btn" href="#/gym" aria-label="Volver">' + icon('chevL') + '</a><a class="icon-btn" href="#/routine-edit/' + r.id + '" aria-label="Editar">' + icon('edit', 'sm') + '</a></div>';
    s += '<div class="hero"><div class="hero-kicker">Rutina</div><div class="hero-title">' + esc(r.name) + '</div>' + (r.description ? '<p class="small" style="color:#ddd;position:relative">' + esc(r.description) + '</p>' : '') +
      '<div style="position:relative" class="routine-card">' + daysBadges(r.days) + '</div>' +
      '<button class="btn primary block mt" style="position:relative" data-act="workout-start" data-id="' + r.id + '"' + (r.items.length ? '' : ' disabled') + '>' + icon('play', 'sm') + 'Empezar entrenamiento</button></div>';
    s += '<div class="section"><div class="section-title">Ejercicios <span class="small muted">' + r.items.length + '</span></div>';
    s += r.items.length ? '<div class="list">' + r.items.map((it, i) => {
      const ex = G.getExercise(st, it.exerciseId);
      const L = groupLetters(r.items)[it.group];
      return '<a class="list-item" href="#/exercise/' + it.exerciseId + '"><span class="ex-avatar"' + (L ? ' style="box-shadow:inset 3px 0 0 var(--red)"' : '') + '>' + (L ? L + (r.items.filter((x, j) => j <= i && x.group === it.group).length) : i + 1) + '</span><span class="grow"><b class="small">' + esc(ex ? ex.name : 'Ejercicio eliminado') + '</b><div class="tiny muted">' + it.sets + ' × ' + esc(it.reps) + (it.weight !== '' && it.weight != null ? ' · ' + it.weight + ' kg' : '') + ' · descanso ' + D.clock(it.rest) + (it.notes ? ' · ' + esc(it.notes) : '') + '</div></span>' + icon('chevR', 'sm chev') + '</a>';
    }).join('') + '</div>' : '<div class="card small muted">Esta rutina no tiene ejercicios. Editala para agregarlos.</div>';
    if (r.items.length) {
      s += '<a class="btn ghost block mt" href="#/routine-edit/' + r.id + '">' + icon('refresh', 'sm') + 'Editar, agregar o reemplazar ejercicios</a>';
      s += '<div class="mt">' + GG().analysisCard(RG.analyzeRoutine(st, r.items, { focus: (EG.BASIC_ROUTINES.find((b) => b.id === r.source) || {}).muscle })) + '</div>';
    }
    const basic = EG.BASIC_ROUTINES.find((b) => b.id === r.source);
    if (basic) s += '<details class="card mt"><summary class="small" style="font-weight:700">Consejos de esta rutina básica</summary>' + basic.tips.map((t) => '<div class="row small" style="align-items:flex-start;margin-top:8px">' + icon('check', 'xs red') + '<span class="muted">' + esc(t) + '</span></div>').join('') + '<p class="tiny faint mt">' + esc(EG.BASIC_NOTE) + '</p></details>';
    s += '</div><div class="section stack"><button class="btn ghost block" data-act="routine-duplicate" data-id="' + r.id + '">' + icon('copy', 'sm') + 'Duplicar rutina</button>' +
      '<button class="btn danger block" data-act="routine-delete" data-id="' + r.id + '">' + icon('trash', 'sm') + 'Eliminar rutina</button></div></div>';
    return s;
  }

  /* ---------- Editor de rutina (borrador en memoria) ---------- */
  let draft = null;
  function routineEditor(id) {
    const st = ASC.store.get();
    if (!draft || draft._for !== id) {
      const src = id === 'new' ? { name: '', description: '', days: [], items: [] } : st.routines.find((x) => x.id === id);
      if (!src) return routineDetail(id);
      draft = JSON.parse(JSON.stringify(src));
      draft._for = id;
    }
    let s = '<div class="screen no-tabs"><div class="head"><button class="icon-btn" data-act="routine-cancel" aria-label="Cancelar">' + icon('x') + '</button><h1 style="font-size:26px">' + (id === 'new' ? 'Nueva rutina' : 'Editar rutina') + '</h1><button class="btn primary sm" data-act="routine-save">Guardar</button></div>';
    s += '<label class="field"><span>Nombre</span><input class="input" maxlength="40" placeholder="Ej: Push" value="' + esc(draft.name) + '" data-input="draft-field" data-f="name"></label>';
    s += '<label class="field"><span>Descripción</span><input class="input" maxlength="100" placeholder="Opcional" value="' + esc(draft.description || '') + '" data-input="draft-field" data-f="description"></label>';
    if (RG.gymSettings(st).scheduleMode === 'sequence') s += '<div class="card small muted" style="margin-bottom:16px">Organizás tus rutinas como secuencia propia (Día 1, Día 2…): el orden se cambia desde la lista de rutinas. <button class="link" data-act="gym-prefs">Cambiar</button></div>';
    else s += '<div class="field"><span>Días de entrenamiento <span class="muted">(opcional)</span></span><div class="chips">' + [1, 2, 3, 4, 5, 6, 0].map((d) => '<button class="chip day ' + (draft.days.includes(d) ? 'on' : '') + '" data-act="draft-day" data-val="' + d + '" aria-pressed="' + draft.days.includes(d) + '">' + D.DIAS_LETRA[d] + '</button>').join('') + '</div></div>';
    s += '<div class="section-title" style="margin-top:22px">Ejercicios <span class="small muted">' + draft.items.length + '</span></div>';
    const letters = groupLetters(draft.items);
    s += '<p class="tiny faint" style="margin:-6px 2px 10px">Reps acepta rangos (ej. 8-12) ' + GG().help('rango', 'un rango de repeticiones') + ': así funcionan las sugerencias de progresión.</p>';
    s += draft.items.map((it, i) => {
      const ex = G.getExercise(st, it.exerciseId);
      const linkedNext = i < draft.items.length - 1 && it.group && draft.items[i + 1].group === it.group;
      const inGroup = it.group && ((i > 0 && draft.items[i - 1].group === it.group) || linkedNext);
      return '<div class="card' + (inGroup ? ' rgroup' : '') + '">' + (inGroup ? '<div class="tiny red" style="font-weight:800;letter-spacing:1px;margin-bottom:6px">SUPERSERIE ' + letters[it.group] + '</div>' : '') + '<div class="row between"><b>' + (i + 1) + '. ' + esc(ex ? ex.name : 'Ejercicio') + '</b><div class="row" style="gap:4px">' +
        '<button class="icon-btn" style="width:32px;height:32px" data-act="draft-move" data-i="' + i + '" data-dir="-1" aria-label="Subir">' + icon('up', 'xs') + '</button>' +
        '<button class="icon-btn" style="width:32px;height:32px" data-act="draft-move" data-i="' + i + '" data-dir="1" aria-label="Bajar">' + icon('down', 'xs') + '</button>' +
        '<button class="icon-btn" style="width:32px;height:32px;color:var(--red)" data-act="draft-remove" data-i="' + i + '" aria-label="Quitar">' + icon('trash', 'xs') + '</button></div></div>' +
        (ex ? '<div class="tiny muted" style="margin-top:4px">' + esc(X.muscleLabel(ex.muscle)) + ' · ' + esc(EG.patternLabel(EG.patternOf(ex))) + ' · ' + esc(ex.equipment) + '</div>' : '') +
        '<div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn ghost sm" data-act="draft-replace" data-i="' + i + '">' + icon('refresh', 'xs') + 'Reemplazar</button><a class="btn ghost sm" href="#/exercise/' + it.exerciseId + '?from=edit">' + icon('book', 'xs') + 'Ficha</a></div>' +
        '<div class="stat-grid" style="grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px">' +
        num('Series', i, 'sets', it.sets) + num('Reps', i, 'reps', it.reps, 'text') + num('Peso kg', i, 'weight', it.weight) + num('Desc. s', i, 'rest', it.rest) + '</div>' +
        (i === 0 ? '<div class="tiny faint" style="margin-top:6px">¿Dudas? ' + GG().help('series') + ' series · ' + GG().help('repeticiones') + ' repeticiones · ' + GG().help('descanso') + ' descanso</div>' : '') +
        '<input class="input mt" style="min-height:42px;padding:10px 12px" maxlength="100" placeholder="Notas (opcional)" aria-label="Notas" value="' + esc(it.notes || '') + '" data-input="draft-item" data-i="' + i + '" data-f="notes">' +
        (linkedNext ? '<div class="tiny muted mt">Sin descanso hacia el siguiente: el descanso de la ronda es el del último ejercicio de la superserie.</div>' : '') +
        (i < draft.items.length - 1 ? '<button class="btn ghost sm mt" data-act="draft-link" data-i="' + i + '" aria-pressed="' + !!linkedNext + '">' + icon(linkedNext ? 'x' : 'plus', 'xs') + (linkedNext ? 'Separar del siguiente' : 'Superserie con el siguiente') + '</button>' : '') + '</div>';
    }).join('');
    if (!draft.items.length) s += '<div class="card small muted">Todavía no agregaste ejercicios. Tocá "Agregar ejercicio": te mostramos los grupos musculares y recomendaciones según lo que vayas armando.</div>';
    s += '<button class="btn primary block mt" data-act="draft-add">' + icon('plus', 'sm') + 'Agregar ejercicio</button>';
    if (draft.items.length) s += '<div class="mt">' + GG().analysisCard(RG.analyzeRoutine(st, draft.items, { focus: (EG.BASIC_ROUTINES.find((b) => b.id === draft.source) || {}).muscle })) + '</div>';
    if (id !== 'new') s += '<p class="tiny faint center mt">Los cambios se aplican a los próximos entrenamientos: tu historial no se modifica. Cancelar descarta todo lo que no guardaste.</p>';
    return s + '</div>';
  }

  /** Letras A, B, C… para cada superserie (solo grupos con 2 o más ejercicios) */
  function groupLetters(items) {
    const out = {};
    let n = 0;
    items.forEach((it, i) => {
      if (!it.group || out[it.group]) return;
      if (items.filter((x) => x.group === it.group).length > 1) out[it.group] = String.fromCharCode(65 + n++);
    });
    return out;
  }

  function num(label, i, f, v, type) {
    return '<label><span class="tiny muted" style="display:block;margin-bottom:4px">' + label + '</span><input class="input" style="min-height:44px;padding:8px;text-align:center" inputmode="' + (type === 'text' ? 'text' : 'decimal') + '" value="' + esc(v == null ? '' : v) + '" data-input="draft-item" data-i="' + i + '" data-f="' + f + '"></label>';
  }

  /* ---------- Lista agrupada por músculo y zona (biblioteca y selector) ---------- */
  function exRow(st, e, mode) {
    const rec = mode === 'library' ? G.records(st, e.id) : null;
    const color = X.muscleColor(e.muscle);
    const meta = X.typeLabel(e.type) + ' · ' + esc(e.equipment) + (e.custom ? ' · <span class="red">propio</span>' : '');
    const badges = (e.stretch ? '<span class="badge tiny-badge">Estirado</span>' : '') + (rec && rec.maxWeight && rec.maxWeight.weight > 0 ? '<span class="badge red">' + rec.maxWeight.weight + ' kg</span>' : '');
    const inner = '<span class="ex-avatar" style="color:' + color + ';box-shadow:inset 3px 0 0 ' + color + '">' + initials(e.name) + '</span><span class="grow"><b class="small">' + esc(e.name) + '</b><div class="tiny muted">' + meta + '</div></span>' + badges;
    const data = ' data-name="' + esc(norm(e.name + ' ' + e.equipment + ' ' + X.muscleLabel(e.muscle))) + '" data-muscle="' + e.muscle + '"';
    if (mode === 'picker') return '<button class="list-item" data-act="draft-pick" data-id="' + e.id + '"' + data + '>' + inner + icon('plus', 'sm red') + '</button>';
    return '<a class="list-item" href="#/exercise/' + e.id + '"' + data + '>' + inner + icon('chevR', 'sm chev') + '</a>';
  }

  function norm(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function groupedList(st, list, mode) {
    let s = '';
    X.MUSCLES.forEach((m) => {
      const inGroup = list.filter((e) => e.muscle === m.id);
      if (!inGroup.length) return;
      s += '<section class="ex-group" data-group-sec="' + m.id + '"><div class="ex-group-head"><i style="background:' + m.color + ';box-shadow:0 0 10px ' + m.color + '"></i><span>' + m.label + '</span><small>' + inGroup.length + '</small></div>';
      const regions = m.regions.concat([['_otros', 'Propios']]);
      regions.forEach(([r, label]) => {
        const rows = inGroup.filter((e) => (r === '_otros' ? !m.regions.some((x) => x[0] === e.region) : e.region === r)).sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name, 'es') : a.type === 'c' ? -1 : 1));
        if (!rows.length) return;
        s += '<div class="ex-region" data-region-sec><div class="ex-region-head">' + esc(label) + '</div><div class="list">' + rows.map((e) => exRow(st, e, mode)).join('') + '</div></div>';
      });
      s += '</section>';
    });
    return s || '<div class="card small muted">No hay ejercicios con ese filtro.</div>';
  }

  /** Oculta filas que no coinciden y los grupos / zonas que quedan vacíos */
  function filterGrouped(scope, q, muscle) {
    q = norm(q || '').trim();
    scope.querySelectorAll('.list-item[data-name]').forEach((it) => {
      it.hidden = !((!q || it.dataset.name.includes(q)) && (!muscle || it.dataset.muscle === muscle));
    });
    scope.querySelectorAll('[data-region-sec]').forEach((r) => (r.hidden = !r.querySelector('.list-item:not([hidden])')));
    scope.querySelectorAll('[data-group-sec]').forEach((g) => (g.hidden = !g.querySelector('.list-item:not([hidden])')));
  }

  /* ---------- Selector de ejercicios (editor de rutina) ---------- */
  function pickerBody(st) {
    return '<div class="search">' + icon('search', 'sm') + '<input class="input" placeholder="Buscar ejercicio…" aria-label="Buscar ejercicio" data-input="picker-filter"></div>' +
      '<div class="hscroll">' + [['', 'Todos']].concat(X.MUSCLES.map((m) => [m.id, m.label])).map(([id, l]) => '<button class="chip ' + (id ? '' : 'on') + '" data-act="picker-muscle" data-val="' + id + '">' + l + '</button>').join('') + '</div>' +
      '<div data-picker-list>' + groupedList(st, G.allExercises(st), 'picker') + '</div>';
  }

  function applyPickerFilter(sh) {
    const chip = sh.querySelector('.hscroll .chip.on');
    filterGrouped(sh.querySelector('[data-picker-list]'), sh.querySelector('[data-input="picker-filter"]').value, chip ? chip.dataset.val : '');
  }

  /* ---------- Biblioteca ---------- */
  function exercisesTab(q) {
    const st = ASC.store.get();
    const m = q.m || '';
    const all = G.allExercises(st);
    const list = all.filter((e) => !m || e.muscle === m);
    let s = '<div class="search">' + icon('search', 'sm') + '<input class="input" placeholder="Buscar en ' + all.length + ' ejercicios…" aria-label="Buscar ejercicio" data-input="ex-filter"></div>';
    s += '<div class="hscroll">' + [['', 'Todos', '']].concat(X.MUSCLES.map((x) => [x.id, x.label, x.color])).map(([id, l, c]) => '<a class="chip ' + (m === id ? 'on' : '') + '" href="#/gym?tab=exercises' + (id ? '&m=' + id : '') + '">' + (c ? '<i class="dot" style="background:' + c + '"></i>' : '') + l + '</a>').join('') + '</div>';
    s += '<p class="tiny faint" style="margin:-4px 2px 14px">Ordenados por grupo y zona muscular. Tocá uno para ver técnica, recomendaciones y tus récords.</p>';
    s += '<div data-ex-list>' + groupedList(st, list, 'library') + '</div>';
    return s;
  }

  /* ---------- Detalle de ejercicio + recomendaciones ---------- */
  function recCard(r) {
    const c = X.muscleColor(r.ex.muscle);
    const kind = { complete: 'Completa: ' + X.regionLabel(r.ex.muscle, r.ex.region), stretch: 'Más estiramiento', pair: r.ex.type === 'c' ? 'Complemento compuesto' : 'Complemento de aislamiento', region: X.regionLabel(r.ex.muscle, r.ex.region) }[r.kind] || '';
    return '<div class="rec" style="--c:' + c + '"><div class="row between" style="align-items:flex-start"><a class="grow" href="#/exercise/' + r.ex.id + '"><div class="tiny" style="color:' + c + ';font-weight:700;text-transform:uppercase;letter-spacing:.5px">' + esc(kind) + '</div><b>' + esc(r.ex.name) + '</b><div class="tiny muted">' + X.typeLabel(r.ex.type) + ' · ' + esc(r.ex.equipment) + '</div></a>' +
      '<button class="icon-btn" style="width:38px;height:38px" data-act="ex-add" data-id="' + r.ex.id + '" aria-label="Agregar ' + esc(r.ex.name) + ' a una rutina">' + icon('plus', 'sm') + '</button></div>' +
      '<p class="small" style="margin:8px 0 8px;color:#d8d8dd">' + esc(r.reason) + '</p>' +
      (r.ev ? '<span class="badge red">' + icon('book', 'xs') + 'Estudio · ' + esc(ASC.coach.EVIDENCE[r.ev].short) + '</span>' : '<span class="badge">Criterio biomecánico</span>') + '</div>';
  }

  function exerciseDetail(id, q) {
    const st = ASC.store.get();
    const e = G.getExercise(st, id);
    if (!e) return '<div class="screen"><div class="empty"><h3>Ejercicio no encontrado</h3><a class="btn primary" href="#/gym?tab=exercises">Volver</a></div></div>';
    const rec = G.records(st, id);
    const m = X.MUSCLES.find((x) => x.id === e.muscle);
    const color = X.muscleColor(e.muscle);
    const focus = q.f || '';
    const goal = st.bodyProfile.goal;
    const gi = ASC.coach.goalInfo(goal);
    const recs = ASC.coach.recommend(st, id, focus || null);
    const zone = X.regionLabel(e.muscle, e.region);

    let s = '<div class="screen"><div class="head">' + (q.from ? '<button class="icon-btn" data-act="go-back" aria-label="Volver">' + icon('chevL') + '</button>' : '<a class="icon-btn" href="#/gym?tab=exercises&m=' + e.muscle + '" aria-label="Volver">' + icon('chevL') + '</a>') + '' + (e.custom ? '<button class="icon-btn" data-act="exercise-edit" data-id="' + e.id + '" aria-label="Editar">' + icon('edit', 'sm') + '</button>' : '') + '</div>';
    s += '<div class="dgrid sticky-left"><div class="dcol"><div class="ex-hero" style="--c:' + color + '"><div class="tiny" style="color:' + color + ';font-weight:800;letter-spacing:2px;text-transform:uppercase">' + esc(m ? m.label : 'Ejercicio') + (zone ? ' · ' + esc(zone) : '') + '</div>' +
      '<div class="num" style="font-size:36px;line-height:1;text-transform:uppercase;margin-top:6px">' + esc(e.name) + '</div>' +
      '<div class="chips mt">' + GG().levelBadge(e) + '<span class="badge">' + esc(EG.patternLabel(EG.patternOf(e))) + '</span><span class="badge">' + X.typeLabel(e.type) + '</span><span class="badge">' + esc(e.equipment) + '</span>' + (e.stretch ? '<span class="badge red">Músculo estirado</span>' : '') + '</div>' +
      ((e.secondary || []).length ? '<div class="tiny muted mt">Secundarios: ' + e.secondary.map((x) => esc(X.muscleLabel(x))).join(', ') + '</div>' : '') + '</div>';
    s += '<div class="card mt center">' + ASC.ui.muscleMap(e.muscle, e.region, e.secondary, 260) + '<div class="mm-legend"><span><i style="background:var(--red)"></i>Principal</span><span><i style="background:rgba(var(--red-rgb),.3)"></i>Secundario / resto del grupo</span></div><div class="tiny faint" style="margin-top:6px">Ilustración esquemática de los músculos: no muestra cómo se ejecuta.</div></div>';
    const avoided = (st.settings.gym.avoidExercises || []).includes(e.id);
    const exclWhy = RG.excludedReason(e, RG.context(st));
    s += '<div class="row mt" style="gap:8px"><button class="btn primary grow" data-act="ex-add" data-id="' + e.id + '">' + icon('plus', 'sm') + 'Agregar a mi rutina</button><button class="btn ghost" data-act="ex-avoid" data-id="' + e.id + '" aria-pressed="' + avoided + '">' + (avoided ? 'No evitar' : 'Evitar') + '</button></div>';
    if (exclWhy) s += '<div class="an-row warn mt">' + icon('bolt', 'xs') + '<span class="small">' + esc(exclWhy) + ' No se va a recomendar.</span></div>';
    const inRoutine = st.routines.map((r2) => r2.items.find((it) => it.exerciseId === e.id)).find(Boolean);
    if (inRoutine && rec.sessions) {
      const sg = G.suggestProgression(st, e.id, inRoutine.reps);
      if (sg.type !== 'none') s += '<div class="sug ' + sg.type + '"><b class="small">Próxima sesión' + (sg.weight ? ': ' + sg.weight + ' kg' : '') + '</b><div class="tiny muted" style="margin-top:3px">' + esc(sg.reason) + '</div><div class="tiny faint" style="margin-top:4px">Sugerencia orientativa (doble progresión). Nada se cambia sin tu confirmación.</div></div>';
    }
    const pat = EG.PATTERNS[EG.patternOf(e)];
    s += '<div class="card mt"><b class="small">Para qué sirve</b><p class="small muted" style="margin:6px 0 0">' + esc(pat ? pat.purpose : '') + '</p>' + (e.description ? '<p class="small" style="margin:8px 0 0;color:#d8d8dd">' + esc(e.description) + '</p>' : '') + '</div>';
    const guide = EG.guideFor(e);
    if (guide) {
      s += '<div class="card mt"><b class="small">Cómo hacerlo</b>' + (guide.specific ? '' : '<div class="tiny faint" style="margin-top:4px">Guía general del movimiento (' + esc(EG.patternLabel(EG.patternOf(e)).toLowerCase()) + '). Este ejercicio todavía no tiene instrucciones específicas.</div>') +
        '<ol class="steps">' + guide.steps.map((t) => '<li class="small">' + esc(t) + '</li>').join('') + '</ol></div>';
      if (guide.errors && guide.errors.length) s += '<div class="card mt"><b class="small">Errores frecuentes</b>' + guide.errors.map((t) => '<div class="row small" style="align-items:flex-start;margin-top:8px">' + icon('x', 'xs red') + '<span class="muted">' + esc(t) + '</span></div>').join('') + '</div>';
    }
    if (e.tips && e.tips.length) s += '<div class="card mt"><b class="small">Consejos de ejecución</b>' + e.tips.map((t) => '<div class="row small" style="align-items:flex-start;margin-top:8px">' + icon('check', 'xs red') + '<span class="muted">' + esc(t) + '</span></div>').join('') + '</div>';
    const ctx = RG.context(st);
    const o = RG.orientation(e, ctx.level, ctx.goal);
    s += '<div class="card mt"><div class="row between"><b class="small">Para empezar</b><span class="badge">' + esc(st.bodyProfile.level || 'Principiante') + '</span></div><div class="stat-grid three mt" style="gap:8px">' +
      '<div><div class="tiny muted">Series ' + GG().help('series') + '</div><b class="small">' + esc(o.sets) + '</b></div><div><div class="tiny muted">Repeticiones ' + GG().help('rango', 'un rango de repeticiones') + '</div><b class="small">' + esc(o.reps) + '</b></div><div><div class="tiny muted">Descanso ' + GG().help('descanso') + '</div><b class="small">' + esc(o.rest) + '</b></div></div>' +
      '<p class="tiny faint" style="margin:8px 0 0">Valores orientativos. Elegí un peso que te deje 2–3 repeticiones de reserva ' + GG().help('rir', 'RIR') + ' y subí de a poco ' + GG().help('sobrecarga', 'la sobrecarga progresiva') + '.</p></div>';
    s += '<p class="tiny faint mt">' + esc(GG().SAFETY) + '</p>';

    s += '</div><div class="dcol">';
    // Alternativas (reemplazos)
    const alts = RG.replacementsFor(st, e.id, []).list.slice(0, 4);
    if (alts.length) s += '<div class="section"><div class="section-title">Ejercicios alternativos</div><p class="small muted" style="margin:-4px 2px 10px">Si no tenés el equipo o querés variar. Ninguno es idéntico.</p>' + alts.map((a) =>
      '<a class="list-item alt-row" href="#/exercise/' + a.ex.id + '"><span class="grow"><b class="small">' + esc(a.ex.name) + '</b> <span class="badge">' + esc(a.label) + '</span><div class="tiny muted" style="margin-top:3px">' + esc(a.reason) + '</div></span>' + icon('chevR', 'sm chev') + '</a>').join('') + '</div>';
    // Recomendaciones
    s += '<div class="section"><div class="section-title">Para complementar</div>';
    s += '<div class="small muted" style="margin:-4px 2px 10px">¿Qué querés priorizar?</div><div class="hscroll">' +
      [['', 'Completar ' + (m ? m.label.toLowerCase() : 'el músculo')]].concat((m ? m.regions : []).map(([r, l]) => [r, l])).concat([['stretch', 'Más estiramiento']]).map(([f, l]) =>
        '<a class="chip ' + (focus === f ? 'on' : '') + '" href="#/exercise/' + e.id + (f ? '?f=' + f : '') + '">' + esc(l) + '</a>').join('') + '</div>';
    if (focus && focus !== 'stretch') {
      const info = ASC.coach.regionInfo(e.muscle, focus);
      if (info) s += '<div class="card small" style="margin-bottom:10px;border-color:' + color + '55"><b>' + esc(X.regionLabel(e.muscle, focus)) + ':</b> <span class="muted">' + esc(info.why) + '</span></div>';
    }
    s += recs.length ? recs.map(recCard).join('') : '<div class="card small muted">No hay otras opciones para esta selección.</div>';

    // Según objetivo
    s += '<div class="card mt goal-card"><div class="row between"><b class="small">Según tu objetivo</b>' + (goal ? '<span class="badge red">' + esc(goal) + '</span>' : '') + '</div>';
    if (gi) {
      s += '<div class="stat-grid mt" style="gap:8px"><div><div class="tiny muted">Repeticiones</div><div class="small" style="font-weight:600">' + esc(gi.scheme) + '</div></div><div><div class="tiny muted">Descanso</div><div class="small" style="font-weight:600">' + esc(gi.rest) + '</div></div></div><p class="small muted" style="margin:10px 0 0">' + esc(gi.text) + '</p>';
    } else s += '<p class="small muted" style="margin:8px 0 0">Elegí tu objetivo para ajustar series, repeticiones y descansos sugeridos:</p>';
    s += '<div class="chips mt">' + Object.keys(ASC.coach.GOALS).map((k) => '<button class="chip ' + (goal === k ? 'on' : '') + '" data-act="set-goal" data-val="' + esc(k) + '">' + esc(k) + '</button>').join('') + '</div></div>';

    // Fuentes
    const src = ASC.coach.sourcesFor(recs, goal);
    if (src.length) {
      s += '<details class="card mt sources"><summary class="small" style="font-weight:700">' + icon('book', 'xs red') + ' Estudios en los que se basa (' + src.length + ')</summary>' + src.map((x) =>
        '<div class="src"><b class="small">' + esc(x.title) + '</b><p class="small muted">' + esc(x.text) + '</p><a class="tiny red" href="' + x.url + '" target="_blank" rel="noopener">' + esc(x.ref) + ' ↗</a></div>').join('') + '</details>';
    }
    s += '<p class="tiny faint mt">Orientación general basada en estudios con muestras acotadas; no reemplaza a un profesional ni es una indicación médica. Ante dolor, consultá.</p></div></div></div>';

    // Récords
    s += '<div class="section"><div class="section-title">Tus récords</div>';
    if (!rec.sessions) s += '<div class="card small muted">Todavía no registraste este ejercicio. Tus marcas aparecen después de tu primer entrenamiento.</div>';
    else {
      s += '<div class="stat-grid three"><div class="stat accent"><div class="v">' + rec.maxWeight.weight + '<small>kg</small></div><div class="k">Mayor peso · ' + rec.maxWeight.reps + ' reps</div></div>' +
        '<div class="stat"><div class="v">' + rec.maxReps.reps + '</div><div class="k">Más reps' + (rec.maxReps.weight ? ' · ' + rec.maxReps.weight + ' kg' : '') + '</div></div>' +
        '<div class="stat"><div class="v">' + ASC.ui.fmtNum(rec.maxVolumeSet.weight * rec.maxVolumeSet.reps) + '</div><div class="k">Mejor serie (kg×reps)</div></div></div>';
      if (rec.history.length >= 2) {
        const pts = rec.history.slice(-12).map((h) => ({ label: D.shortLabel(h.date), value: h.bestWeight > 0 ? h.bestWeight : h.maxReps }));
        const byWeight = rec.history.some((h) => h.bestWeight > 0);
        s += '<div class="card mt"><div class="small muted" style="margin-bottom:8px">' + (byWeight ? 'Mayor peso por sesión (kg)' : 'Más repeticiones por sesión') + '</div>' + ASC.ui.lineChart(pts, { label: 'Progresión de ' + e.name }) + '</div>';
      }
      s += '</div><div class="section"><div class="section-title">Historial</div><div class="list">' + rec.history.slice().reverse().slice(0, 15).map((h) =>
        '<a class="list-item" href="#/session/' + h.sessionId + '"><span class="grow"><b class="small">' + D.shortLabel(h.date) + '</b><div class="tiny muted">' + h.sets.map((x) => (Number(x.weight) || 0) + '×' + (Number(x.reps) || 0)).join(' · ') + '</div></span><span class="tiny muted">' + ASC.ui.fmtNum(h.volume) + ' kg</span></a>').join('') + '</div>';
    }
    s += '</div>';
    if (e.custom) s += '<div class="section"><button class="btn danger block" data-act="exercise-delete" data-id="' + e.id + '">' + icon('trash', 'sm') + 'Eliminar ejercicio</button></div>';
    return s + '</div>';
  }

  /* ---------- Agregar a rutina ---------- */
  function addToRoutineSheet(exId) {
    const st = ASC.store.get();
    const e = G.getExercise(st, exId);
    const list = st.routines.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
    const d = RG.newItem(st, e);
    const why = RG.excludedReason(e, RG.context(st));
    ASC.ui.sheet({ title: 'Agregar a mi rutina', autofocus: false, body:
      '<p class="small muted" style="margin-top:-6px"><b style="color:#fff">' + esc(e.name) + '</b> · se agrega con ' + d.sets + ' series × ' + esc(d.reps) + ' reps y ' + d.rest + ' s de descanso (orientativo). Después lo podés ajustar.</p>' +
      (why ? '<div class="an-row warn">' + icon('bolt', 'xs') + '<span class="small">' + esc(why) + '</span></div>' : '') +
      (list.length ? '<div class="list">' + list.map((r) => {
        const has = r.items.some((it) => it.exerciseId === exId);
        return '<button class="list-item" data-act="ex-to-routine" data-ex="' + exId + '" data-routine="' + r.id + '"><span class="ex-avatar">' + initials(r.name) + '</span><span class="grow"><b class="small">' + esc(r.name) + '</b><div class="tiny muted">' + r.items.length + ' ejercicios' + (has ? ' · <span class="red">ya lo incluye</span>' : '') + '</div></span>' + icon('plus', 'sm red') + '</button>';
      }).join('') + '</div>' : '<div class="card small muted">Todavía no tenés rutinas.</div>') +
      '<button class="btn ghost block mt" data-act="ex-new-routine" data-ex="' + exId + '">' + icon('plus', 'sm') + 'Crear una rutina nueva con este ejercicio</button>' });
  }

  function exerciseForm(e) {
    e = e || { name: '', muscle: 'pecho', region: 'med', secondary: [], equipment: 'Mancuernas', type: 'a', description: '', tips: [] };
    return '<label class="field"><span>Nombre</span><input class="input" name="name" maxlength="50" value="' + esc(e.name) + '"></label>' +
      '<label class="field"><span>Grupo y zona muscular</span><select class="select" name="zone">' + X.MUSCLES.map((m) => '<optgroup label="' + m.label + '">' + m.regions.map(([r, l]) => '<option value="' + m.id + '|' + r + '"' + (e.muscle === m.id && e.region === r ? ' selected' : '') + '>' + m.label + ' · ' + l + '</option>').join('') + '</optgroup>').join('') + '</select></label>' +
      '<div class="two"><label class="field"><span>Equipamiento</span><select class="select" name="equipment">' + X.EQUIPMENT.map((q) => '<option' + (e.equipment === q ? ' selected' : '') + '>' + q + '</option>').join('') + '</select></label>' +
      '<label class="field"><span>Tipo</span><select class="select" name="type"><option value="c"' + (e.type === 'c' ? ' selected' : '') + '>Compuesto</option><option value="a"' + (e.type !== 'c' ? ' selected' : '') + '>Aislamiento</option></select></label></div>' +
      '<div class="field"><span>Músculos secundarios</span><div class="chips" data-group="secondary">' + X.MUSCLES.map((m) => '<button class="chip ' + ((e.secondary || []).includes(m.id) ? 'on' : '') + '" data-act="toggle-on" data-val="' + m.id + '">' + m.label + '</button>').join('') + '</div></div>' +
      '<div class="card row between" style="margin-bottom:16px"><div><b class="small">Trabaja con el músculo estirado</b><div class="tiny muted">Ej: curl inclinado, peso muerto rumano</div></div><button class="switch ' + (e.stretch ? 'on' : '') + '" data-act="toggle-on" data-switch="stretch" aria-label="Músculo estirado"></button></div>' +
      '<label class="field"><span>Descripción</span><textarea class="textarea" name="description" maxlength="300" style="min-height:70px">' + esc(e.description) + '</textarea></label>' +
      '<label class="field"><span>Indicaciones (una por línea)</span><textarea class="textarea" name="tips" maxlength="600" style="min-height:70px">' + esc((e.tips || []).join('\n')) + '</textarea></label>';
  }

  function readExercise(sh) {
    const [muscle, region] = sh.querySelector('[name=zone]').value.split('|');
    return {
      name: sh.querySelector('[name=name]').value.trim(),
      muscle, region,
      equipment: sh.querySelector('[name=equipment]').value,
      type: sh.querySelector('[name=type]').value,
      stretch: sh.querySelector('[data-switch="stretch"]').classList.contains('on'),
      secondary: Array.from(sh.querySelectorAll('[data-group="secondary"] .on')).map((x) => x.dataset.val),
      description: sh.querySelector('[name=description]').value.trim(),
      tips: sh.querySelector('[name=tips]').value.split('\n').map((x) => x.trim()).filter(Boolean),
    };
  }

  /* ---------- Historial ---------- */
  function historyTab() {
    const st = ASC.store.get();
    const list = G.completedSessions(st);
    if (!list.length) return ASC.ui.emptyState('history', 'Sin entrenamientos aún', 'Cuando finalices tu primer entrenamiento, vas a verlo acá con todos sus detalles.', st.routines.length ? 'Entrenar ahora' : 'Crear rutina', st.routines.length ? 'workout-pick' : 'routine-new');
    const wk = [];
    for (let i = 7; i >= 0; i--) {
      const ws = D.addDays(D.weekStart(D.today()), -7 * i);
      const c = G.workoutsInRange(st, ws, D.addDays(ws, 6)).count;
      wk.push({ label: D.shortLabel(ws), value: c, text: c || '' });
    }
    let s = '<div class="card"><div class="small muted" style="margin-bottom:6px">Entrenamientos por semana</div>' + ASC.ui.barChart(wk, { label: 'Entrenamientos por semana', height: 130 }) + '</div><div class="section">';
    s += '<div class="card-grid">' + list.map((x) => {
      const ss = G.sessionStats(x);
      const prs = G.sessionPRs(st, x).length;
      return '<a class="card tap" style="display:block" href="#/session/' + x.id + '"><div class="row between"><b class="num" style="font-size:22px;text-transform:uppercase">' + esc(x.routineName) + '</b>' + (prs ? '<span class="badge red">' + icon('trophy', 'xs') + prs + ' PR</span>' : '') + '</div>' +
        '<div class="small muted" style="text-transform:capitalize">' + D.longLabel(G.sessionDateKey(x)) + '</div><div class="row mt small" style="gap:16px"><span>' + icon('timer', 'xs red') + '</span><span style="margin-left:-12px">' + D.duration(ss.durationMs) + '</span><span>' + ss.sets + ' series</span><span>' + ASC.ui.fmtNum(ss.volume) + ' kg</span></div></a>';
    }).join('') + '</div>';
    return s + '</div>';
  }

  function sessionDetail(id, q) {
    const st = ASC.store.get();
    const x = st.sessions.find((y) => y.id === id);
    if (!x) return '<div class="screen"><div class="empty"><h3>Entrenamiento no encontrado</h3><a class="btn primary" href="#/gym?tab=history">Volver</a></div></div>';
    const ss = G.sessionStats(x);
    const prs = G.sessionPRs(st, x);
    let s = '<div class="screen"><div class="head"><a class="icon-btn" href="' + (q.summary ? '#/home' : '#/gym?tab=history') + '" aria-label="Volver">' + icon(q.summary ? 'x' : 'chevL') + '</a></div>';
    if (q.summary) {
      s += '<div class="hero summary-hero"><div class="hero-kicker">Entrenamiento completado</div><div class="big" style="margin-top:8px">' + esc(x.routineName) + '</div><p class="muted" style="position:relative">Otro paso más. La constancia es lo que construye.</p></div>';
    } else {
      s += '<div class="num" style="font-size:34px;text-transform:uppercase;line-height:1">' + esc(x.routineName) + '</div><div class="small muted mt" style="margin-top:6px;text-transform:capitalize">' + D.longLabel(G.sessionDateKey(x)) + '</div>';
    }
    s += '<div class="stat-grid mt-lg"><div class="stat accent"><div class="v">' + D.duration(ss.durationMs).replace(' min', '<small>min</small>').replace(' h ', '<small>h</small> ') + '</div><div class="k">Duración</div></div><div class="stat"><div class="v">' + ss.sets + '</div><div class="k">Series completadas</div></div>' +
      '<div class="stat"><div class="v">' + ASC.ui.fmtNum(ss.volume) + '<small>kg</small></div><div class="k">Volumen (peso × reps)</div></div><div class="stat"><div class="v">' + ss.exercisesDone + '<small>/' + x.exercises.length + '</small></div><div class="k">Ejercicios</div></div></div>';
    if (prs.length) s += '<div class="section"><div class="section-title">Récords personales</div>' + prs.map((p) => '<div class="card row">' + icon('trophy', 'red') + '<span class="grow"><b class="small">' + esc(p.name) + '</b><div class="tiny muted">' + (p.kind === 'peso' ? p.value + ' kg (antes ' + p.prev + ' kg)' : p.value + ' reps (antes ' + p.prev + ')') + '</div></span></div>').join('') + '</div>';
    s += '<div class="section"><div class="section-title">Detalle</div>' + x.exercises.map((e) => {
      const ds = G.doneSets(e);
      return '<div class="card"><a class="row between" href="#/exercise/' + e.exerciseId + '"><b>' + esc(e.name) + '</b>' + icon('chevR', 'sm chev') + '</a>' +
        (ds.length ? '<div class="set-head" style="grid-template-columns:34px 1fr 1fr;margin-top:10px"><span>#</span><span>Peso</span><span>Reps</span></div>' + ds.map((st2, i) => '<div class="row small" style="display:grid;grid-template-columns:34px 1fr 1fr;padding:4px"><span class="red num">' + (i + 1) + '</span><span>' + (Number(st2.weight) || 0) + ' kg</span><span>' + (Number(st2.reps) || 0) + '</span></div>').join('') : '<div class="small faint mt">Sin series completadas.</div>') +
        (e.notes ? '<div class="tiny muted mt">' + icon('note', 'xs') + '</div><div class="small muted" style="margin:-15px 0 0 20px">' + esc(e.notes) + '</div>' : '') + '</div>';
    }).join('') + '</div>';
    if (q.summary) s += '<div class="section"><a class="btn primary block" href="#/home">Volver al inicio</a></div>';
    else s += '<div class="section"><button class="btn danger block" data-act="session-delete" data-id="' + x.id + '">' + icon('trash', 'sm') + 'Eliminar del historial</button></div>';
    return s + '</div>';
  }

  /* ---------- Físico ---------- */
  function bodyTab() {
    const st = ASC.store.get();
    const bp = st.bodyProfile;
    const metrics = st.bodyMetrics.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
    const last = metrics[metrics.length - 1];
    let s = '<div class="card"><div class="row between"><b>Perfil físico</b><button class="btn ghost sm" data-act="bodyprofile-edit">' + icon('edit', 'xs') + 'Editar</button></div><div class="stat-grid three mt">' +
      '<div><div class="num" style="font-size:22px">' + (bp.height ? esc(bp.height) + '<small class="muted"> cm</small>' : '—') + '</div><div class="tiny muted">Altura</div></div>' +
      '<div><div class="num" style="font-size:22px">' + (last ? last.weight + '<small class="muted"> kg</small>' : '—') + '</div><div class="tiny muted">Último peso</div></div>' +
      '<div><div class="num" style="font-size:22px">' + (bp.age ? esc(bp.age) : '—') + '</div><div class="tiny muted">Edad</div></div></div>' +
      '<div class="small muted mt">' + [bp.goal, bp.level, (bp.days || []).length ? (bp.days.length + ' días disponibles') : ''].filter(Boolean).map(esc).join(' · ') + '</div></div>';
    s += '<div class="section"><div class="section-title">Peso corporal</div>';
    if (!metrics.length) s += ASC.ui.emptyState('scale', 'Sin registros', 'Registrá tu peso y medidas cada tanto para ver tu evolución. Es opcional.', 'Nuevo registro', 'metric-new');
    else {
      if (metrics.length >= 2) {
        const first = metrics[0], diff = Math.round((last.weight - first.weight) * 10) / 10;
        s += '<div class="card">' + ASC.ui.lineChart(metrics.slice(-15).map((m) => ({ label: D.shortLabel(m.date), value: Number(m.weight) })), { label: 'Peso corporal' }) +
          '<div class="tiny muted mt">Variación desde ' + D.shortLabel(first.date) + ': ' + (diff > 0 ? '+' : '') + diff + ' kg</div></div>';
      }
      s += '<div class="list mt">' + metrics.slice().reverse().map((m) => {
        const ms = m.measurements || {};
        const extra = [ms.waist ? 'cintura ' + ms.waist : '', ms.chest ? 'pecho ' + ms.chest : '', ms.arm ? 'brazo ' + ms.arm : ''].filter(Boolean).join(' · ');
        return '<button class="list-item" data-act="metric-edit" data-id="' + m.id + '"><span class="grow"><b class="small">' + m.weight + ' kg</b><div class="tiny muted">' + D.shortLabel(m.date) + (extra ? ' · ' + extra + ' cm' : '') + (m.notes ? ' · ' + esc(m.notes) : '') + '</div></span>' + icon('chevR', 'sm chev') + '</button>';
      }).join('') + '</div>';
    }
    s += '<p class="tiny faint mt">Las fotos de progreso llegan con la app, guardadas en almacenamiento privado. Estos datos son para tu seguimiento, no son diagnósticos.</p></div>';
    return s;
  }

  function metricForm(m) {
    m = m || { date: D.today(), weight: '', measurements: {}, notes: '' };
    const ms = m.measurements || {};
    return '<div class="two"><label class="field"><span>Fecha</span><input class="input" type="date" name="date" value="' + esc(m.date) + '"></label><label class="field"><span>Peso (kg)</span><input class="input" inputmode="decimal" name="weight" value="' + esc(m.weight) + '"></label></div>' +
      '<div class="field"><span>Medidas en cm (opcional)</span><div class="stat-grid three" style="gap:8px"><input class="input" inputmode="decimal" placeholder="Cintura" name="waist" value="' + esc(ms.waist || '') + '"><input class="input" inputmode="decimal" placeholder="Pecho" name="chest" value="' + esc(ms.chest || '') + '"><input class="input" inputmode="decimal" placeholder="Brazo" name="arm" value="' + esc(ms.arm || '') + '"></div></div>' +
      '<label class="field"><span>Observaciones</span><input class="input" name="notes" maxlength="120" value="' + esc(m.notes || '') + '"></label>';
  }

  const toNum = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? '' : n; };

  /* ---------- Calculadora de discos ---------- */
  const PLATE_COLORS = { 25: '#d0202c', 20: '#2d6be0', 15: '#e6b411', 10: '#2fa84f', 5: '#e8e8ec', 2.5: '#b3131e', 1.25: '#8a8a93', 45: '#2d6be0', 35: '#e6b411', 0: '#666' };

  function platesBody(st, total) {
    const p = st.settings.plates;
    const unit = p.unit || 'kg';
    const list = p[unit];
    const bar = unit === 'kg' ? (p.bar || 20) : (p.barLb || 45);
    return '<div class="seg" data-group="punit" style="margin-bottom:14px">' + ['kg', 'lb'].map((u) => '<button class="' + (unit === u ? 'on' : '') + '" data-act="plates-unit" data-val="' + u + '">' + u + '</button>').join('') + '</div>' +
      '<div class="two"><label class="field"><span>Peso total (' + unit + ')</span><input class="input big" name="ptotal" inputmode="decimal" value="' + esc(total || '') + '" data-input="plates-calc"></label>' +
      '<label class="field"><span>Barra (' + unit + ')</span><input class="input big" name="pbar" inputmode="decimal" value="' + bar + '" data-input="plates-calc"></label></div>' +
      '<div class="field"><span>Discos disponibles · pares (vacío = sin límite, 0 = no tengo)</span><div class="plate-chips">' + list.map((v) =>
        '<label class="plate-chip"><span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:' + (PLATE_COLORS[v] || '#888') + ';margin-right:6px"></i>' + String(v).replace('.', ',') + '</span><input class="input" inputmode="numeric" name="pair-' + v + '" value="' + esc((p.pairs[unit] || {})[v] !== undefined ? p.pairs[unit][v] : '') + '" placeholder="∞" aria-label="Pares de discos de ' + v + ' ' + unit + '" data-input="plates-calc"></label>').join('') + '</div></div>' +
      '<div data-plates-result aria-live="polite"></div>';
  }

  function paintPlates(sh) {
    const st = ASC.store.get();
    const p = st.settings.plates;
    const unit = p.unit || 'kg';
    const total = toNum(sh.querySelector('[name=ptotal]').value);
    const bar = toNum(sh.querySelector('[name=pbar]').value);
    const pairs = {};
    p[unit].forEach((v) => { const x = sh.querySelector('[name="pair-' + v + '"]').value.trim(); if (x !== '') pairs[v] = Math.max(0, parseInt(x, 10) || 0); });
    // recordar preferencias
    if (bar !== '') { if (unit === 'kg') p.bar = bar; else p.barLb = bar; }
    p.pairs[unit] = pairs;
    ASC.store.save();
    const box = sh.querySelector('[data-plates-result]');
    if (total === '' || bar === '') { box.innerHTML = '<p class="small muted">Ingresá el peso total y el de la barra.</p>'; return; }
    const r = G.calcPlates(total, bar, p[unit], pairs);
    if (r.belowBar) { box.innerHTML = '<p class="small red">El peso total es menor que la barra (' + bar + ' ' + unit + ').</p>'; return; }
    const fmt = (n) => String(n).replace('.', ',');
    const maxP = Math.max(...p[unit]);
    const plate = (v) => '<span class="plate" style="height:' + Math.round(40 + (v / maxP) * 70) + 'px;background:' + (PLATE_COLORS[v] || '#888') + (v === 5 ? ';color:#111' : '') + '"><span' + (v === 5 ? ' style="color:#111"' : '') + '>' + fmt(v) + '</span></span>';
    box.innerHTML = '<div class="plates-bar" role="img" aria-label="Por lado: ' + (r.perSide.length ? r.perSide.map(fmt).join(', ') : 'ningún disco') + '"><span class="sleeve"></span>' + r.perSide.slice().reverse().map(plate).join('') + '<span class="shaft"></span>' + r.perSide.map(plate).join('') + '<span class="sleeve"></span></div>' +
      '<div class="card"><div class="row between"><span class="muted small">Por lado</span><b>' + (r.perSide.length ? r.perSide.map(fmt).join(' + ') + ' ' + unit : 'Solo la barra') + '</b></div>' +
      '<div class="row between mt"><span class="muted small">Total cargado</span><b class="' + (r.exact ? 'red' : '') + '">' + fmt(r.loaded) + ' ' + unit + '</b></div>' +
      (r.exact ? '' : '<p class="small" style="margin:10px 0 0">No hay una combinación exacta con tus discos: la más cercana queda a <b>' + fmt(Math.abs(r.diff)) + ' ' + unit + (r.diff > 0 ? ' por debajo' : ' por encima') + '</b> de ' + fmt(total) + ' ' + unit + '.</p>') + '</div>';
  }

  /* ---------- Acciones ---------- */
  function startWorkout(routineId) {
    const st = ASC.store.get();
    const active = st.activeSessionId && st.sessions.find((x) => x.id === st.activeSessionId && x.status === 'in_progress');
    if (active) {
      ASC.ui.toast('Ya tenés un entrenamiento en curso. Terminalo o descartalo primero.');
      location.hash = '#/workout';
      return;
    }
    const r = st.routines.find((x) => x.id === routineId);
    if (!r || !r.items.length) return;
    const sess = G.createSessionFromRoutine(st, r);
    st.sessions.push(sess);
    st.activeSessionId = sess.id;
    ASC.ui.closeTop();
    ASC.store.save();
    location.hash = '#/workout';
  }

  Object.assign(ASC.actions, {
    'plates-open': (el) => {
      const st = ASC.store.get();
      ASC.ui.sheet({ title: 'Calculadora de discos', autofocus: false, body: platesBody(st, el && el.dataset ? el.dataset.w : ''), onMount: (sh) => paintPlates(sh) });
    },
    'plates-calc': (el) => paintPlates(el.closest('.sheet')),
    'plates-unit': (el) => {
      const st = ASC.store.get();
      st.settings.plates.unit = el.dataset.val;
      ASC.store.save();
      const sh = el.closest('.sheet');
      sh.querySelector('.sheet-body').innerHTML = platesBody(st, '');
      paintPlates(sh);
    },
    'draft-link': (el) => {
      const i = Number(el.dataset.i);
      const a = draft.items[i], b = draft.items[i + 1];
      if (!b) return;
      if (a.group && b.group === a.group) {
        // separar: los que siguen al punto de corte forman otro grupo
        const ng = ASC.store.uid();
        for (let k = i + 1; k < draft.items.length && draft.items[k].group === a.group; k++) draft.items[k].group = ng;
      } else {
        const g = a.group || ASC.store.uid();
        const old = b.group;
        a.group = g;
        draft.items.forEach((x, k) => { if (k > i && (x === b || (old && x.group === old))) x.group = g; });
      }
      // grupos de un solo ejercicio no son superserie
      draft.items.forEach((x) => { if (x.group && draft.items.filter((y) => y.group === x.group).length < 2) x.group = null; });
      ASC.app.render();
    },
    'routine-new': () => { draft = null; location.hash = '#/routine-edit/new'; if (ASC.app.parseRoute().name === 'routine-edit') ASC.app.render(); },
    'routine-template': (el) => {
      const st = ASC.store.get();
      const t = TEMPLATES[el.dataset.id];
      t.routines.forEach((r, i) => st.routines.push({
        id: ASC.store.uid(), name: r.name, description: r.description, days: r.days.slice(), order: st.routines.length + i, createdAt: new Date().toISOString(),
        items: r.items.map(([exerciseId, sets, reps]) => ({ id: ASC.store.uid(), exerciseId, sets, reps, weight: '', rest: 90, notes: '' })),
      }));
      ASC.app.commit();
      ASC.ui.toast('Plantilla agregada. Ajustá días, pesos y ejercicios a tu medida.');
    },
    'routine-move': (el) => {
      const st = ASC.store.get();
      const list = st.routines.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
      const i = list.findIndex((r) => r.id === el.dataset.id), j = i + Number(el.dataset.dir);
      if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      list.forEach((r, k) => (r.order = k));
      ASC.app.commit();
    },
    'routine-duplicate': (el) => {
      const st = ASC.store.get();
      const r = st.routines.find((x) => x.id === el.dataset.id);
      const c = JSON.parse(JSON.stringify(r));
      c.id = ASC.store.uid();
      c.name = r.name + ' (copia)';
      c.order = st.routines.length;
      c.items.forEach((it) => (it.id = ASC.store.uid()));
      st.routines.push(c);
      location.hash = '#/routine/' + c.id;
      ASC.app.commit();
      ASC.ui.toast('Rutina duplicada.');
    },
    'routine-delete': async (el) => {
      if (!(await ASC.ui.confirm({ title: '¿Eliminar rutina?', text: 'Tu historial de entrenamientos se conserva.', ok: 'Eliminar', danger: true }))) return;
      const st = ASC.store.get();
      ASC.merge && ASC.merge.markDeleted(st, el.dataset.id);
      st.routines = st.routines.filter((x) => x.id !== el.dataset.id);
      location.hash = '#/gym';
      ASC.app.commit();
    },
    'routine-cancel': async () => {
      const wasNew = draft && draft._for === 'new';
      const target = draft && !wasNew ? '#/routine/' + draft._for : '#/gym';
      draft = null;
      location.hash = target;
    },
    'routine-save': () => {
      if (!draft.name.trim()) return ASC.ui.fieldError(document.querySelector('[data-f=name]'), 'Ponele un nombre a la rutina.');
      const st = ASC.store.get();
      const clean = {
        source: draft.source || null,
        name: draft.name.trim(), description: (draft.description || '').trim(), days: draft.days,
        items: draft.items.map((it) => ({ id: it.id || ASC.store.uid(), exerciseId: it.exerciseId, replaced: it.replaced || undefined, sets: Math.max(1, parseInt(it.sets, 10) || 1), reps: String(it.reps || '').trim() || '10', weight: toNum(it.weight), rest: Math.max(0, parseInt(it.rest, 10) || 0), notes: (it.notes || '').trim(), group: draft.items.filter((x) => x.group && x.group === it.group).length > 1 ? it.group : null })),
      };
      let id = draft._for;
      if (id === 'new') {
        id = ASC.store.uid();
        st.routines.push(Object.assign({ id, order: st.routines.length, createdAt: new Date().toISOString() }, clean));
      } else Object.assign(st.routines.find((x) => x.id === id), clean, { updatedAt: new Date().toISOString() });
      draft = null;
      location.hash = '#/routine/' + id;
      ASC.app.commit();
      ASC.ui.toast('Rutina guardada.');
    },
    'draft-field': (el) => { draft[el.dataset.f] = el.value; },
    'draft-item': (el) => { draft.items[Number(el.dataset.i)][el.dataset.f] = el.value; },
    'draft-day': (el) => {
      const d = Number(el.dataset.val);
      draft.days = draft.days.includes(d) ? draft.days.filter((x) => x !== d) : draft.days.concat(d);
      el.classList.toggle('on');
    },
    'draft-move': (el) => {
      const i = Number(el.dataset.i), j = i + Number(el.dataset.dir);
      if (j < 0 || j >= draft.items.length) return;
      [draft.items[i], draft.items[j]] = [draft.items[j], draft.items[i]];
      ASC.app.render();
    },
    'draft-remove': (el) => { draft.items.splice(Number(el.dataset.i), 1); ASC.app.render(); },
    'draft-add': () => GG().openPicker({
      getItems: () => (draft ? draft.items : []),
      onPick: async (exId) => {
        if (!draft) return;
        const st = ASC.store.get();
        const ex = G.getExercise(st, exId);
        if (draft.items.some((x) => x.exerciseId === exId) && !(await ASC.ui.confirm({ title: 'Ya está en la rutina', text: ex.name + ' ya forma parte de esta rutina. ¿Agregarlo otra vez?', ok: 'Agregar igual' }))) return;
        const before = RG.analyzeRoutine(st, draft.items).checks.filter((c) => c.level === 'warn').length;
        draft.items.push(RG.newItem(st, ex));
        const after = RG.analyzeRoutine(st, draft.items).checks.filter((c) => c.level === 'warn');
        ASC.ui.closeTop();
        ASC.app.render();
        ASC.ui.toast(ex.name + ' agregado.' + (after.length > before ? ' Ojo: ' + after[after.length - 1].text : ''));
      },
    }),
    'draft-replace': (el) => {
      const i = Number(el.dataset.i);
      GG().openReplace({
        exId: draft.items[i].exerciseId,
        getItems: () => draft.items,
        onChoose: (newId, opts) => {
          const st = ASC.store.get();
          const ex = G.getExercise(st, newId);
          const old = G.getExercise(st, draft.items[i].exerciseId);
          const nd = RG.newItem(st, ex);
          draft.items = RG.applyReplace(draft.items, i, newId, Object.assign({ defaults: { sets: nd.sets, reps: nd.reps, rest: nd.rest } }, opts));
          ASC.app.render();
          ASC.ui.toast((old ? old.name : 'Ejercicio') + ' → ' + ex.name + '. Se aplica al guardar; Cancelar lo descarta.');
        },
      });
    },
    'picker-filter': (el) => applyPickerFilter(el.closest('.sheet')),
    'picker-muscle': (el) => {
      const sh = el.closest('.sheet');
      sh.querySelectorAll('.hscroll .chip').forEach((c) => c.classList.remove('on'));
      el.classList.add('on');
      applyPickerFilter(sh);
    },
    'draft-pick': async (el) => {
      const st = ASC.store.get();
      if (draft.items.some((x) => x.exerciseId === el.dataset.id) && !(await ASC.ui.confirm({ title: 'Ya está en la rutina', text: '¿Agregarlo otra vez?', ok: 'Agregar igual' }))) return;
      const d = ASC.coach.defaultsFor(G.getExercise(st, el.dataset.id), st.bodyProfile.goal);
      draft.items.push({ id: ASC.store.uid(), exerciseId: el.dataset.id, sets: d.sets, reps: String(d.reps), weight: '', rest: d.rest, notes: '' });
      ASC.ui.closeTop();
      ASC.app.render();
      ASC.ui.toast('Ejercicio agregado.');
    },
    'ex-filter': (el) => filterGrouped(document.querySelector('[data-ex-list]'), el.value, ''),
    'ex-add': (el) => addToRoutineSheet(el.dataset.id),
    'ex-to-routine': async (el) => {
      const st = ASC.store.get();
      const r = st.routines.find((x) => x.id === el.dataset.routine);
      const e = G.getExercise(st, el.dataset.ex);
      if (r.items.some((x) => x.exerciseId === e.id) && !(await ASC.ui.confirm({ title: 'Ya está en la rutina', text: e.name + ' ya forma parte de ' + r.name + '. ¿Agregarlo otra vez?', ok: 'Agregar igual' }))) return;
      r.items.push(RG.newItem(st, e));
      r.updatedAt = new Date().toISOString();
      ASC.ui.closeTop();
      ASC.app.commit();
      ASC.ui.toast(e.name + ' agregado a ' + r.name + '.');
    },
    'ex-new-routine': (el) => {
      const st = ASC.store.get();
      const e = G.getExercise(st, el.dataset.ex);
      draft = { _for: 'new', name: '', description: '', days: [], items: [RG.newItem(st, e)] };
      ASC.ui.closeTop();
      location.hash = '#/routine-edit/new';
    },
    'set-goal': (el) => {
      const st = ASC.store.get();
      st.bodyProfile.goal = st.bodyProfile.goal === el.dataset.val ? '' : el.dataset.val;
      ASC.app.commit();
    },
    'exercise-new': () => ASC.ui.sheet({ title: 'Nuevo ejercicio', body: exerciseForm() + '<button class="btn primary block" data-act="exercise-save">Crear ejercicio</button>' }),
    'exercise-edit': (el) => {
      const e = ASC.store.get().exercises.find((x) => x.id === el.dataset.id);
      ASC.ui.sheet({ title: 'Editar ejercicio', autofocus: false, body: exerciseForm(e) + '<button class="btn primary block" data-act="exercise-save" data-id="' + e.id + '">Guardar</button>' });
    },
    'exercise-save': (el) => {
      const esh = ASC.ui.topSheet();
      const v = readExercise(esh);
      if (!v.name) return ASC.ui.fieldError(esh.querySelector('[name=name]'), 'El ejercicio necesita un nombre.');
      const st = ASC.store.get();
      if (el.dataset.id) Object.assign(st.exercises.find((x) => x.id === el.dataset.id), v, { updatedAt: new Date().toISOString() });
      else {
        const id = 'c-' + ASC.store.uid();
        st.exercises.push(Object.assign({ id, custom: true, createdAt: new Date().toISOString() }, v));
        location.hash = '#/exercise/' + id;
      }
      ASC.ui.closeTop();
      ASC.app.commit();
    },
    'exercise-delete': async (el) => {
      const st = ASC.store.get();
      const used = st.routines.some((r) => r.items.some((it) => it.exerciseId === el.dataset.id));
      if (!(await ASC.ui.confirm({ title: '¿Eliminar ejercicio?', text: used ? 'Se va a quitar de las rutinas que lo usan. Tu historial se conserva.' : 'Tu historial se conserva.', ok: 'Eliminar', danger: true }))) return;
      const e = st.exercises.find((x) => x.id === el.dataset.id);
      e.deletedAt = new Date().toISOString();
      st.routines.forEach((r) => (r.items = r.items.filter((it) => it.exerciseId !== e.id)));
      location.hash = '#/gym?tab=exercises';
      ASC.app.commit();
    },
    'session-delete': async (el) => {
      if (!(await ASC.ui.confirm({ title: '¿Eliminar entrenamiento?', text: 'Se quita del historial y de tus récords. No se puede deshacer.', ok: 'Eliminar', danger: true }))) return;
      const st = ASC.store.get();
      ASC.merge && ASC.merge.markDeleted(st, el.dataset.id);
      st.sessions = st.sessions.filter((x) => x.id !== el.dataset.id);
      location.hash = '#/gym?tab=history';
      ASC.app.commit();
    },
    'workout-start': (el) => startWorkout(el.dataset.id),
    'workout-pick': () => {
      const st = ASC.store.get();
      if (st.activeSessionId && st.sessions.some((x) => x.id === st.activeSessionId && x.status === 'in_progress')) { location.hash = '#/workout'; return; }
      const list = st.routines.filter((r) => r.items.length);
      if (!list.length) { location.hash = '#/gym'; ASC.ui.toast('Primero creá una rutina con ejercicios.'); return; }
      const today = D.weekday(D.today());
      ASC.ui.sheet({ title: 'Elegí la rutina', autofocus: false, body: '<div class="list">' + list.map((r) => '<button class="list-item" data-act="workout-start" data-id="' + r.id + '"><span class="ex-avatar">' + initials(r.name) + '</span><span class="grow"><b class="small">' + esc(r.name) + '</b><div class="tiny muted">' + r.items.length + ' ejercicios' + ((r.days || []).includes(today) ? ' · <span class="red">programada hoy</span>' : '') + '</div></span>' + icon('play', 'sm red') + '</button>').join('') + '</div>' });
    },
    'bodyprofile-edit': () => {
      const bp = ASC.store.get().bodyProfile;
      const lv = ['Principiante', 'Intermedio', 'Avanzado'], fg = ['Hipertrofia', 'Fuerza', 'Resistencia', 'Acondicionamiento físico', 'Mantenimiento'];
      ASC.ui.sheet({ title: 'Perfil físico', autofocus: false, body:
        '<div class="two"><label class="field"><span>Altura (cm)</span><input class="input" inputmode="numeric" name="height" value="' + esc(bp.height) + '"></label><label class="field"><span>Edad</span><input class="input" inputmode="numeric" name="age" value="' + esc(bp.age) + '"></label></div>' +
        '<div class="field"><span>Objetivo físico</span><div class="chips" data-group="goal">' + fg.map((x) => '<button class="chip ' + (bp.goal === x ? 'on' : '') + '" data-act="pick-one" data-val="' + x + '">' + x + '</button>').join('') + '</div></div>' +
        '<div class="field"><span>Nivel</span><div class="chips" data-group="level">' + lv.map((x) => '<button class="chip ' + (bp.level === x ? 'on' : '') + '" data-act="pick-one" data-val="' + x + '">' + x + '</button>').join('') + '</div></div>' +
        '<div class="field"><span>Días disponibles</span><div class="chips" data-group="days">' + [1, 2, 3, 4, 5, 6, 0].map((d) => '<button class="chip day ' + ((bp.days || []).includes(d) ? 'on' : '') + '" data-act="toggle-on" data-val="' + d + '">' + D.DIAS_LETRA[d] + '</button>').join('') + '</div></div>' +
        '<button class="btn primary block" data-act="bodyprofile-save">Guardar</button>' });
    },
    'bodyprofile-save': () => {
      const sh = ASC.ui.topSheet();
      const pick = (g) => { const e = sh.querySelector('[data-group="' + g + '"] .on'); return e ? e.dataset.val : ''; };
      Object.assign(ASC.store.get().bodyProfile, {
        height: sh.querySelector('[name=height]').value.trim(), age: sh.querySelector('[name=age]').value.trim(),
        goal: pick('goal'), level: pick('level'), days: Array.from(sh.querySelectorAll('[data-group="days"] .on')).map((x) => Number(x.dataset.val)),
      });
      ASC.ui.closeTop();
      ASC.app.commit();
    },
    'metric-new': () => ASC.ui.sheet({ title: 'Nuevo registro', body: metricForm() + '<button class="btn primary block" data-act="metric-save">Guardar</button>' }),
    'metric-edit': (el) => {
      const m = ASC.store.get().bodyMetrics.find((x) => x.id === el.dataset.id);
      ASC.ui.sheet({ title: 'Editar registro', autofocus: false, body: metricForm(m) + '<button class="btn primary block" data-act="metric-save" data-id="' + m.id + '">Guardar</button><button class="btn danger block mt" data-act="metric-delete" data-id="' + m.id + '">' + icon('trash', 'sm') + 'Eliminar</button>' });
    },
    'metric-save': (el) => {
      const sh = ASC.ui.topSheet();
      const w = toNum(sh.querySelector('[name=weight]').value);
      if (w === '' || w <= 0 || w > 500) return ASC.ui.fieldError(sh.querySelector('[name=weight]'), 'Ingresá un peso válido en kg (entre 1 y 500).');
      const v = { date: sh.querySelector('[name=date]').value || D.today(), weight: w, notes: sh.querySelector('[name=notes]').value.trim(),
        measurements: { waist: toNum(sh.querySelector('[name=waist]').value), chest: toNum(sh.querySelector('[name=chest]').value), arm: toNum(sh.querySelector('[name=arm]').value) } };
      const st = ASC.store.get();
      if (el.dataset.id) Object.assign(st.bodyMetrics.find((x) => x.id === el.dataset.id), v, { updatedAt: new Date().toISOString() });
      else st.bodyMetrics.push(Object.assign({ id: ASC.store.uid() }, v));
      ASC.ui.closeTop();
      if (!location.hash.includes('tab=body')) location.hash = '#/gym?tab=body';
      ASC.app.commit();
    },
    'metric-delete': async (el) => {
      if (!(await ASC.ui.confirm({ title: '¿Eliminar registro?', ok: 'Eliminar', danger: true }))) return;
      const st = ASC.store.get();
      ASC.merge && ASC.merge.markDeleted(st, el.dataset.id);
      st.bodyMetrics = st.bodyMetrics.filter((x) => x.id !== el.dataset.id);
      ASC.ui.closeTop();
      ASC.app.commit();
    },
  });

  ASC.screens.gym = { render, tab: 'gym' };
  ASC.screens.routine = { render: (p) => routineDetail(p[0]), tab: 'gym' };
  ASC.screens['routine-edit'] = { render: (p) => routineEditor(p[0]), tab: 'gym', noTabs: true };
  ASC.screens.exercise = { render: (p, q) => exerciseDetail(p[0], q), tab: 'gym' };
  ASC.screens.session = { render: (p, q) => sessionDetail(p[0], q), tab: 'gym' };
})(typeof window !== 'undefined' ? window : globalThis);
