/* ASCEND · Gimnasio guiado: bienvenida, rutinas básicas, selector guiado, reemplazos, preferencias y ayudas */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  const { esc, icon } = ASC.ui;
  const D = ASC.dates;
  const G = ASC.gym;
  const X = ASC.exerciseData;
  const EG = ASC.exerciseGuide;
  const RG = ASC.routineGuide;

  const PICKER_GROUPS = ['pecho', 'espalda', 'hombros', 'biceps', 'triceps', 'cuadriceps', 'isquios', 'gluteos', 'gemelos', 'abdomen'];
  const SAFETY = 'Orientación general: no reemplaza la evaluación de un profesional. Si tenés molestias, una lesión o dudas sobre la técnica, consultá antes de seguir.';

  /* ---------- Ayudas contextuales ---------- */
  function help(term, label) {
    const g = EG.GLOSSARY[term];
    if (!g) return '';
    return '<button type="button" class="help-btn" data-act="help" data-term="' + term + '" aria-label="¿Qué es ' + esc(label || g.t) + '?">?</button>';
  }
  function openHelp(term) {
    const g = EG.GLOSSARY[term];
    if (!g) return;
    ASC.ui.sheet({ title: g.t, autofocus: false, body: '<p class="small" style="margin-top:0;line-height:1.6;color:#d8d8dd">' + esc(g.d) + '</p><button class="btn block mt" data-close>Entendido</button>' });
  }

  function levelBadge(ex) {
    const d = EG.difficulty(ex);
    return '<span class="badge lvl lvl-' + d + '">' + EG.levelLabel(d) + '</span>';
  }

  /* ---------- Tarjeta de análisis (rutina y semana) ---------- */
  function analysisCard(a, title) {
    if (!a) return '';
    const warn = a.checks.filter((c) => c.level === 'warn');
    const info = a.checks.filter((c) => c.level === 'info');
    let s = '<div class="card analysis' + (warn.length ? ' has-warn' : '') + '" role="status"><div class="row between"><b class="small">' + esc(title || 'Revisión de la rutina') + '</b>' + (a.minutes ? '<span class="badge">' + icon('timer', 'xs') + '≈ ' + a.minutes + ' min</span>' : '') + '</div>';
    if (!a.checks.length) s += '<p class="small muted" style="margin:8px 0 0">No encontramos nada para señalar en lo que revisamos.</p>';
    s += a.checks.map((c) => '<div class="an-row ' + c.level + '">' + icon(c.level === 'warn' ? 'bolt' : 'note', 'xs') + '<span class="small">' + esc(c.text) + '</span></div>').join('');
    if (a.evaluated && a.evaluated.length) s += '<details class="an-eval"><summary class="tiny muted">Qué revisamos</summary><p class="tiny muted" style="margin:6px 0 0">' + esc(a.evaluated.join(' · ')) + '. No evaluamos tu técnica, tu recuperación ni tu historial de lesiones.</p></details>';
    return s + '</div>';
  }

  /* ---------- Bienvenida ---------- */
  function welcome() {
    const st = ASC.store.get();
    const lvl = st.bodyProfile.level || 'Principiante';
    const opt = (act, ic, letter, title, text) => '<button class="welcome-opt" data-act="' + act + '"><span class="wo-letter" aria-hidden="true">' + letter + '</span><span class="grow"><b>' + title + '</b><span class="small muted">' + text + '</span></span>' + icon(ic, 'sm') + '</button>';
    let s = '<div class="screen gym-welcome"><div class="hero welcome-hero"><div class="hero-kicker">Gimnasio</div><h1 class="hero-title">¿Cómo querés empezar a entrenar?</h1>' +
      '<p class="small" style="color:#ddd;position:relative;margin:10px 0 0">Elegí una rutina para comenzar o creá tu propio entrenamiento. ASCEND te va a ayudar a organizar tu progreso.</p></div>';
    s += '<div class="stack" style="margin-top:16px">' +
      opt('gw-basic', 'play', 'A', 'Empezar con una rutina básica', 'Si estás comenzando, te recomendamos una rutina sencilla y organizada para aprender los ejercicios y construir constancia.') +
      opt('gw-custom', 'edit', 'B', 'Crear mi propia rutina', 'Organizá tus entrenamientos, elegí los grupos musculares y agregá los ejercicios que prefieras.') +
      opt('gw-explore', 'search', 'C', 'Explorar ejercicios', 'Conocé los ejercicios disponibles, sus grupos musculares y cómo se realizan.') + '</div>';
    s += '<div class="card row between mt"><div><div class="tiny muted">Tu nivel</div><b class="small">' + esc(lvl) + '</b></div><button class="btn ghost sm" data-act="gym-prefs">' + icon('sliders', 'xs') + 'Preferencias</button></div>';
    s += '<button class="btn ghost block mt" data-act="gw-skip">Ahora no</button>';
    s += '<p class="tiny faint center mt">Podés volver a este menú desde Gimnasio o desde tu Perfil. ' + esc(SAFETY) + '</p>';
    return s + '</div>';
  }

  function markSetup(choice) {
    const st = ASC.store.get();
    st.settings.gym = Object.assign({}, st.settings.gym, { setupDone: true, choice });
    ASC.store.save();
  }

  /* ---------- Rutinas básicas ---------- */
  function basicMeta(b) {
    return b.items.length + ' ejercicios · ≈ ' + EG.estimateMinutes(b.items.map(([, sets, , rest]) => ({ sets, rest }))) + ' min · ' + b.level;
  }
  const BASIC_COLOR = { pecho: X.muscleColor('pecho'), espalda: X.muscleColor('espalda'), piernas: X.muscleColor('cuadriceps'), brazos: X.muscleColor('biceps') };
  const BASIC_LABEL = { pecho: 'Pecho', espalda: 'Espalda', piernas: 'Piernas', brazos: 'Brazos' };
  const WEEK_PLAN = { 'basica-pecho': [1], 'basica-espalda': [2], 'basica-piernas': [4], 'basica-brazos': [5] };

  function basicList() {
    const st = ASC.store.get();
    let s = '<div class="screen"><div class="head"><a class="icon-btn" href="#/gym" aria-label="Volver">' + icon('chevL') + '</a><div><h1>Rutinas básicas</h1><div class="sub">Para aprender los movimientos</div></div></div>';
    s += '<p class="small muted" style="margin-top:0">Una rutina por grupo muscular, con pocos ejercicios y fáciles de aprender. Elegí una para empezar; después la podés editar.</p>';
    s += '<div class="card-grid">' + EG.BASIC_ROUTINES.map((b) => {
      const has = st.routines.some((r) => r.source === b.id);
      return '<a class="card basic-card" style="--c:' + BASIC_COLOR[b.muscle] + '" href="#/basic/' + b.id + '"><div class="row between"><span class="tiny bc-kicker">' + BASIC_LABEL[b.muscle] + '</span>' + (has ? '<span class="badge red">Ya la usás</span>' : '') + '</div><h3>' + esc(b.name) + '</h3><p class="small muted">' + esc(b.description) + '</p><div class="tiny faint">' + basicMeta(b) + '</div></a>';
    }).join('') + '</div>';
    s += '<div class="card mt"><b class="small">¿Querés las cuatro?</b><p class="small muted" style="margin:6px 0 10px">Una propuesta para la semana: pecho el lunes, espalda el martes, piernas el jueves y brazos el viernes. Los días se pueden cambiar.</p><button class="btn ghost sm" data-act="basic-all">' + icon('calendar', 'xs') + 'Usar las 4 en la semana</button></div>';
    s += '<p class="tiny faint mt">' + esc(EG.BASIC_NOTE) + '</p>';
    return s + '</div>';
  }

  let basicDays = null;
  function basicDetail(id) {
    const st = ASC.store.get();
    const b = RG.basicRoutine(id);
    if (!b) return basicList();
    if (!basicDays || basicDays.id !== id) basicDays = { id, days: (WEEK_PLAN[id] || []).slice() };
    const items = b.items.map(([, sets, , rest]) => ({ sets, rest }));
    let s = '<div class="screen"><div class="head"><a class="icon-btn" href="#/basic" aria-label="Volver a rutinas básicas">' + icon('chevL') + '</a></div>';
    s += '<div class="hero" style="--c:' + BASIC_COLOR[b.muscle] + '"><div class="hero-kicker">' + BASIC_LABEL[b.muscle] + ' · ' + esc(b.level) + '</div><h1 class="hero-title">' + esc(b.name) + '</h1><p class="small" style="color:#ddd;position:relative">' + esc(b.description) + '</p>' +
      '<div class="chips" style="position:relative"><span class="badge">' + icon('timer', 'xs') + '≈ ' + EG.estimateMinutes(items) + ' min</span><span class="badge">' + b.items.length + ' ejercicios</span><span class="badge">' + b.items.reduce((a, x) => a + x[1], 0) + ' series</span></div></div>';
    s += '<div class="section"><div class="section-title">Ejercicios</div><div class="tiny muted" style="margin:-6px 2px 10px">Series ' + help('series') + ' · Repeticiones ' + help('rango', 'un rango de repeticiones') + ' · Descanso ' + help('descanso') + '</div><div class="list">' +
      b.items.map(([exId, sets, reps, rest, note], i) => {
        const ex = G.getExercise(st, exId);
        return '<a class="list-item" href="#/exercise/' + exId + '?from=basic"><span class="ex-avatar">' + (i + 1) + '</span><span class="grow"><b class="small">' + esc(ex.name) + '</b><div class="tiny muted">' + sets + ' series × ' + reps.replace('-', '–') + ' reps · descanso ' + D.clock(rest) + '</div><div class="tiny faint">' + esc(note) + '</div></span>' + icon('chevR', 'sm chev') + '</a>';
      }).join('') + '</div></div>';
    s += '<div class="card"><b class="small">Antes de empezar</b>' + ['Calentá 5–10 minutos y hacé 1–2 series livianas del primer ejercicio. ' + help('calentamiento')].concat(b.tips.map(esc)).map((t) => '<div class="row small" style="align-items:flex-start;margin-top:8px">' + icon('check', 'xs red') + '<span class="muted">' + t + '</span></div>').join('') + '</div>';
    s += '<div class="card mt"><div class="field" style="margin:0"><span>¿Qué días la querés hacer? <span class="muted">(opcional)</span></span><div class="chips">' + [1, 2, 3, 4, 5, 6, 0].map((d) => '<button class="chip day ' + (basicDays.days.includes(d) ? 'on' : '') + '" data-act="basic-day" data-val="' + d + '" aria-pressed="' + basicDays.days.includes(d) + '">' + D.DIAS_LETRA[d] + '</button>').join('') + '</div></div>' +
      '<button class="btn primary block mt" data-act="basic-use" data-id="' + b.id + '">' + icon('plus', 'sm') + 'Usar esta rutina</button><p class="tiny faint" style="margin:8px 0 0">Se crea una copia en tus rutinas: la podés editar, reemplazar ejercicios o cambiar series sin perder tu historial.</p></div>';
    s += '<p class="tiny faint mt">' + esc(EG.BASIC_NOTE) + '</p>';
    return s + '</div>';
  }

  /* ---------- Selector guiado de ejercicios ---------- */
  let picker = null; // { getItems, onPick, step, muscle, infoId }

  function openPicker(opts) {
    picker = Object.assign({ step: 'groups', muscle: null, infoId: null }, opts);
    const { el } = ASC.ui.sheet({ title: 'Agregar ejercicio', autofocus: false, body: '', onClose: () => (picker = null) });
    picker.el = el;
    paintPicker();
  }

  function paintPicker(focusSel) {
    if (!picker || !picker.el) return;
    const st = ASC.store.get();
    const items = picker.getItems();
    const title = picker.el.querySelector('.sheet-head h2');
    const body = picker.el.querySelector('.sheet-body');
    let s = '';
    if (picker.step === 'groups') {
      title.textContent = 'Agregar ejercicio';
      const a = RG.analyzeRoutine(st, items);
      const hints = {};
      a.checks.forEach((c) => { if (c.code === 'no-pull') hints.espalda = 'Falta tracción'; if (c.code === 'no-compound') hints[c.muscle] = 'Falta un compuesto'; });
      s += '<p class="small muted" style="margin-top:-4px">¿Qué grupo muscular querés trabajar?</p><div class="mgrid">' + PICKER_GROUPS.map((m) => {
        const n = a.sets[m] || 0;
        return '<button class="mgroup" data-act="pk-muscle" data-m="' + m + '" style="--c:' + X.muscleColor(m) + '"><i aria-hidden="true"></i><b>' + X.muscleLabel(m) + '</b><span class="tiny ' + (hints[m] ? 'red' : 'muted') + '">' + (hints[m] || (n ? n + ' series en la rutina' : 'Sin ejercicios')) + '</span></button>';
      }).join('') + '</div>';
      s += '<div class="row mt" style="gap:8px;flex-wrap:wrap"><button class="btn ghost sm" data-act="pk-muscle" data-m="antebrazos">Antebrazos</button><button class="btn ghost sm" data-act="pk-muscle" data-m="otros">Cardio y otros</button><button class="btn ghost sm" data-act="pk-search">' + icon('search', 'xs') + 'Buscar por nombre</button></div>';
    } else if (picker.step === 'search') {
      title.textContent = 'Buscar ejercicio';
      s += '<button class="btn ghost sm" data-act="pk-back">' + icon('chevL', 'xs') + 'Grupos musculares</button>';
      s += '<div class="search mt">' + icon('search', 'sm') + '<input class="input" placeholder="Nombre, equipamiento o músculo…" aria-label="Buscar ejercicio" data-input="pk-filter" value="' + esc(picker.q || '') + '"></div><div class="list" data-pk-results>' + searchRows(st, items, picker.q || '') + '</div>';
    } else if (picker.step === 'muscle') {
      const m = picker.muscle;
      title.textContent = X.muscleLabel(m);
      const r = RG.suggestFor(st, items, m);
      s += '<button class="btn ghost sm" data-act="pk-back">' + icon('chevL', 'xs') + 'Grupos musculares</button>';
      s += '<p class="small muted" style="margin:12px 0 4px">' + esc(r.note) + '</p>';
      if (r.volumeWarn) s += '<div class="an-row warn">' + icon('bolt', 'xs') + '<span class="small">' + esc(r.volumeWarn) + '</span></div>';
      if (r.recommended.length) {
        s += '<div class="section-title" style="font-size:16px;margin-top:14px">Recomendados para esta rutina</div><p class="tiny muted" style="margin:-6px 2px 10px">' + (r.here.length ? 'Estos ejercicios pueden ser una buena opción para complementar tu rutina.' : 'Buenas opciones para empezar con este grupo.') + ' Te explicamos por qué; la decisión es tuya.</p>';
        s += r.recommended.map((x) => recRow(st, x)).join('');
      }
      const avail = r.list.filter((x) => x.status !== 'excluded');
      const excl = r.list.filter((x) => x.status === 'excluded');
      s += '<div class="section-title" style="font-size:16px;margin-top:18px">Todos los de ' + X.muscleLabel(m).toLowerCase() + ' <span class="small muted">' + avail.length + '</span></div>';
      const regions = (X.MUSCLES.find((x) => x.id === m) || { regions: [] }).regions;
      regions.concat([['_', 'Propios']]).forEach(([reg, label]) => {
        const rows = avail.filter((x) => (reg === '_' ? !regions.some((y) => y[0] === x.ex.region) : x.ex.region === reg)).sort((a, b) => EG.difficulty(a.ex) - EG.difficulty(b.ex) || a.ex.name.localeCompare(b.ex.name, 'es'));
        if (rows.length) s += '<div class="ex-region-head">' + esc(label) + '</div><div class="list">' + rows.map((x) => pickRow(st, x)).join('') + '</div>';
      });
      if (excl.length) s += '<details class="card mt"><summary class="small">Excluidos por tus preferencias (' + excl.length + ')</summary><div class="list mt">' + excl.map((x) => '<div class="list-item"><span class="grow"><b class="small">' + esc(x.ex.name) + '</b><div class="tiny muted">' + esc(x.reasons[0]) + '</div></span></div>').join('') + '</div><button class="btn ghost sm mt" data-act="gym-prefs">Cambiar preferencias</button></details>';
    } else if (picker.step === 'info') {
      const ex = G.getExercise(st, picker.infoId);
      title.textContent = ex.name;
      s += '<button class="btn ghost sm" data-act="pk-back-muscle">' + icon('chevL', 'xs') + 'Volver</button>' + quickInfo(st, ex);
      s += '<div class="row mt" style="gap:8px"><button class="btn primary grow" data-act="pk-add" data-id="' + ex.id + '">' + icon('plus', 'sm') + 'Agregar a la rutina</button></div>';
    }
    body.innerHTML = s;
    const f = body.querySelector(focusSel || '[data-act="pk-back"], [data-act="pk-back-muscle"], .mgroup, input');
    if (f) f.focus();
    body.scrollTop = 0;
  }

  function orientationText(st, ex) {
    const c = RG.context(st);
    const o = RG.orientation(ex, c.level, c.goal);
    return o.sets + ' series × ' + o.reps + (o.rest !== '—' ? ' · descanso ' + o.rest : '');
  }

  function recRow(st, x) {
    return '<div class="rec pick-rec" style="--c:' + X.muscleColor(x.ex.muscle) + '"><div class="row between" style="align-items:flex-start;gap:10px"><button class="grow link-like" data-act="pk-info" data-id="' + x.ex.id + '"><b>' + esc(x.ex.name) + '</b><div class="tiny muted">' + esc(EG.patternLabel(EG.patternOf(x.ex))) + ' · ' + esc(x.ex.equipment) + '</div></button>' + levelBadge(x.ex) + '</div>' +
      '<p class="small" style="margin:8px 0;color:#d8d8dd">' + esc(x.reasons.join(' ')) + '</p>' +
      '<div class="row between"><span class="tiny muted">' + esc(orientationText(st, x.ex)) + '</span><button class="btn primary sm" data-act="pk-add" data-id="' + x.ex.id + '">' + icon('plus', 'xs') + 'Agregar</button></div></div>';
  }

  function pickRow(st, x) {
    const tag = x.status === 'in' ? '<span class="badge">En la rutina</span>' : x.status === 'similar' ? '<span class="badge warn-b">Parecido</span>' : '';
    return '<div class="list-item pick-row"><button class="grow link-like" data-act="pk-info" data-id="' + x.ex.id + '"><b class="small">' + esc(x.ex.name) + '</b><div class="tiny muted">' + esc(x.ex.equipment) + ' · ' + EG.levelLabel(EG.difficulty(x.ex)) + (x.status === 'similar' ? ' · ' + esc(x.reasons[0]) : '') + '</div></button>' + tag +
      '<button class="icon-btn" style="width:38px;height:38px" data-act="pk-add" data-id="' + x.ex.id + '" aria-label="Agregar ' + esc(x.ex.name) + '">' + icon('plus', 'sm') + '</button></div>';
  }

  function norm(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function searchRows(st, items, q) {
    q = norm(q).trim();
    if (q.length < 2) return '<div class="list-item small muted">Escribí al menos 2 letras.</div>';
    const ctx = RG.context(st);
    const inR = new Set(items.map((i) => i.exerciseId));
    const res = G.allExercises(st).filter((e) => norm(e.name + ' ' + e.equipment + ' ' + X.muscleLabel(e.muscle)).includes(q)).slice(0, 40);
    if (!res.length) return '<div class="list-item small muted">Sin resultados.</div>';
    return res.map((ex) => {
      const excl = RG.excludedReason(ex, ctx);
      return pickRow(st, { ex, status: inR.has(ex.id) ? 'in' : null, reasons: [] }).replace('</div></button>', (excl ? ' · <span class="red">' + esc(excl) + '</span>' : '') + '</div></button>');
    }).join('');
  }

  /** Resumen educativo de un ejercicio (selector y fichas) */
  function quickInfo(st, ex) {
    const p = EG.patternOf(ex);
    const alts = RG.replacementsFor(st, ex.id, []).list.slice(0, 3);
    let s = '<div class="qi"><div class="chips mt">' + levelBadge(ex) + '<span class="badge">' + esc(ex.equipment) + '</span><span class="badge">' + X.typeLabel(ex.type) + '</span></div>';
    s += '<dl class="qi-dl"><dt>Músculo principal</dt><dd>' + esc(X.muscleLabel(ex.muscle)) + (X.regionLabel(ex.muscle, ex.region) ? ' · ' + esc(X.regionLabel(ex.muscle, ex.region)) : '') + '</dd>' +
      ((ex.secondary || []).length ? '<dt>Secundarios</dt><dd>' + ex.secondary.map((m) => esc(X.muscleLabel(m))).join(', ') + '</dd>' : '') +
      '<dt>Movimiento ' + help('patron', 'un patrón de movimiento') + '</dt><dd>' + esc(EG.patternLabel(p)) + '</dd>' +
      '<dt>Para qué sirve</dt><dd>' + esc((EG.PATTERNS[p] || {}).purpose || ex.description) + '</dd>' +
      '<dt>Para empezar</dt><dd>' + esc(orientationText(st, ex)) + '</dd>' +
      (alts.length ? '<dt>Cumplen una función parecida</dt><dd>' + alts.map((a) => esc(a.ex.name)).join(', ') + '</dd>' : '') + '</dl>';
    if (ex.description) s += '<p class="small muted" style="margin:0">' + esc(ex.description) + '</p>';
    s += '<a class="tiny red" href="#/exercise/' + ex.id + '" data-close>Ver ficha completa ›</a></div>';
    return s;
  }

  /* ---------- Reemplazar ejercicio ---------- */
  let replacer = null; // { exId, getItems, onChoose, mode }
  function openReplace(opts) {
    replacer = opts;
    const st = ASC.store.get();
    const r = RG.replacementsFor(st, opts.exId, opts.getItems ? opts.getItems() : []);
    if (!r.base) return;
    const groups = [['Muy similar', 'Muy similares'], ['Similar', 'Similares'], ['Alternativa parcial', 'Otras opciones (no equivalentes)']];
    let s = '<p class="small muted" style="margin-top:-4px">Alternativas compatibles con <b style="color:#fff">' + esc(r.base.name) + '</b>, ordenadas por similitud. Ninguna es idéntica: cada una cambia algo.</p>';
    if (opts.mode !== 'session') {
      s += '<div class="card stack" style="gap:10px;margin-bottom:12px"><label class="check-line"><input type="checkbox" id="rp-keep" checked> <span class="small">Conservar series, repeticiones y descanso</span></label>' +
        '<label class="check-line"><input type="checkbox" id="rp-weight"> <span class="small">Conservar el peso <span class="muted">(suele ser distinto en otro ejercicio)</span></span></label></div>';
    } else s += '<p class="tiny faint">Solo cambia en este entrenamiento. Tu rutina queda igual.</p>';
    groups.forEach(([key, label], gi) => {
      const rows = r.list.filter((x) => x.label === key).slice(0, gi === 2 ? 6 : 8);
      if (!rows.length) return;
      const inner = '<div class="list">' + rows.map((x) => '<div class="list-item rp-row"><span class="grow"><a class="small" style="font-weight:700" href="#/exercise/' + x.ex.id + '" data-close>' + esc(x.ex.name) + '</a><div class="tiny muted">' + esc(x.ex.equipment) + ' · ' + EG.levelLabel(x.difficulty) + (x.status === 'in' ? ' · <span class="red">ya está en la rutina</span>' : '') + '</div><div class="tiny" style="color:#cfcfd5;margin-top:3px">' + esc(x.reason) + '</div></span>' +
        '<button class="btn ghost sm" data-act="rp-choose" data-id="' + x.ex.id + '">Elegir</button></div>').join('') + '</div>';
      s += gi === 2 ? '<details class="mt"><summary class="section-title" style="font-size:16px">' + label + ' <span class="small muted">' + rows.length + '</span></summary>' + inner + '</details>'
        : '<div class="section-title" style="font-size:16px;margin-top:12px">' + label + '</div>' + inner;
    });
    if (!r.list.length) s += '<div class="card small muted">No encontramos alternativas con tus preferencias actuales.</div>';
    if (r.excluded) s += '<p class="tiny faint mt">' + r.excluded + ' opciones ocultas por tus preferencias. <button class="link" data-act="gym-prefs">Cambiarlas</button></p>';
    s += '<button class="btn ghost block mt" data-close>Cancelar</button>';
    ASC.ui.sheet({ title: 'Reemplazar ejercicio', autofocus: false, body: s, onClose: () => (replacer = null) });
  }

  /* ---------- Preferencias de entrenamiento ---------- */
  function openPrefs() {
    const st = ASC.store.get();
    const g = RG.gymSettings(st);
    const lvl = st.bodyProfile.level || 'Principiante';
    const eq = X.EQUIPMENT.filter((e) => e !== 'Peso corporal' && e !== 'Otro');
    const body = '<div class="field"><span>Tu nivel</span><div class="chips" data-group="gp-level">' + ['Principiante', 'Intermedio', 'Avanzado'].map((l) => '<button class="chip ' + (lvl === l ? 'on' : '') + '" data-act="pick-one" data-val="' + l + '" aria-pressed="' + (lvl === l) + '">' + l + '</button>').join('') + '</div></div>' +
      '<div class="field"><span>Equipamiento disponible</span><div class="chips" data-group="gp-eq">' + eq.map((e) => { const on = !g.equipment.length || g.equipment.includes(e); return '<button class="chip ' + (on ? 'on' : '') + '" data-act="toggle-on" data-val="' + e + '" aria-pressed="' + on + '">' + e + '</button>'; }).join('') + '</div><div class="tiny faint" style="margin-top:6px">Los ejercicios con peso corporal siempre se consideran disponibles.</div></div>' +
      '<div class="field"><span>Prefiero evitar</span><div class="chips" data-group="gp-avoid">' + Object.keys(EG.AVOID_TAGS).map((k) => '<button class="chip ' + (g.avoid.includes(k) ? 'on' : '') + '" data-act="toggle-on" data-val="' + k + '" aria-pressed="' + g.avoid.includes(k) + '">' + esc(EG.AVOID_TAGS[k].label) + '</button>').join('') + '</div>' +
      '<div class="tiny faint" style="margin-top:6px">No te pedimos información médica. Esto solo filtra recomendaciones y reemplazos. Si tenés una lesión o molestia, consultá a un profesional.</div></div>' +
      (g.avoidExercises.length ? '<div class="field"><span>Ejercicios que marcaste para evitar</span><div class="list">' + g.avoidExercises.map((id) => { const e = G.getExercise(st, id); return e ? '<div class="list-item"><span class="grow small">' + esc(e.name) + '</span><button class="btn ghost sm" data-act="gp-unavoid" data-id="' + id + '">Quitar</button></div>' : ''; }).join('') + '</div></div>' : '') +
      '<div class="field"><span>Cómo organizás tus rutinas</span><div class="chips" data-group="gp-mode">' + [['week', 'Por días de la semana'], ['sequence', 'Secuencia propia (Día 1, Día 2…)']].map(([v, l]) => '<button class="chip ' + (g.scheduleMode === v ? 'on' : '') + '" data-act="pick-one" data-val="' + v + '" aria-pressed="' + (g.scheduleMode === v) + '">' + l + '</button>').join('') + '</div>' +
      '<div class="tiny faint" style="margin-top:6px">Con la secuencia propia, la próxima rutina es la siguiente a la última que hiciste, sin importar el día.</div></div>' +
      '<button class="btn primary block" data-act="gp-save">Guardar preferencias</button>';
    ASC.ui.sheet({ title: 'Preferencias de entrenamiento', autofocus: false, body });
  }

  /* ---------- Acciones ---------- */
  Object.assign(ASC.actions, {
    help: (el) => openHelp(el.dataset.term),
    'go-back': () => { if (history.length > 1) history.back(); else location.hash = '#/gym'; },
    'gym-prefs': () => openPrefs(),
    'gym-welcome': () => { location.hash = '#/gym-start'; },
    'gw-basic': () => { markSetup('basic'); location.hash = '#/basic'; },
    'gw-custom': () => { markSetup('custom'); ASC.actions['routine-new'](); },
    'gw-explore': () => { markSetup('explore'); location.hash = '#/gym?tab=exercises'; ASC.app.render(); },
    'gw-skip': () => { markSetup('skip'); location.hash = '#/gym'; ASC.app.render(); },
    'basic-day': (el) => {
      const d = Number(el.dataset.val);
      basicDays.days = basicDays.days.includes(d) ? basicDays.days.filter((x) => x !== d) : basicDays.days.concat(d);
      el.classList.toggle('on');
      el.setAttribute('aria-pressed', String(basicDays.days.includes(d)));
    },
    'basic-use': async (el) => {
      const st = ASC.store.get();
      const id = el.dataset.id;
      if (st.routines.some((r) => r.source === id) && !(await ASC.ui.confirm({ title: 'Ya tenés esta rutina', text: '¿Querés agregar otra copia?', ok: 'Agregar copia' }))) return;
      const r = RG.routineFromBasic(st, id, basicDays && basicDays.id === id ? basicDays.days : []);
      st.routines.push(r);
      st.settings.gym = Object.assign({}, st.settings.gym, { setupDone: true, choice: st.settings.gym.choice || 'basic' });
      basicDays = null;
      location.hash = '#/routine/' + r.id;
      ASC.app.commit();
      ASC.ui.toast('Rutina agregada. Podés editarla cuando quieras.');
    },
    'basic-all': () => {
      const st = ASC.store.get();
      let added = 0, skipped = 0;
      EG.BASIC_ROUTINES.forEach((b) => {
        if (st.routines.some((r) => r.source === b.id)) { skipped++; return; }
        st.routines.push(RG.routineFromBasic(st, b.id, WEEK_PLAN[b.id]));
        added++;
      });
      st.settings.gym = Object.assign({}, st.settings.gym, { setupDone: true, choice: st.settings.gym.choice || 'basic' });
      location.hash = '#/gym';
      ASC.app.commit();
      ASC.ui.toast(added ? added + ' rutinas agregadas' + (skipped ? ' (' + skipped + ' ya las tenías)' : '') + '.' : 'Ya tenías las cuatro rutinas.');
    },
    'pk-muscle': (el) => { picker.step = 'muscle'; picker.muscle = el.dataset.m; paintPicker(); },
    'pk-search': () => { picker.step = 'search'; paintPicker('input'); },
    'pk-filter': (el) => { picker.q = el.value; const box = picker.el.querySelector('[data-pk-results]'); if (box) box.innerHTML = searchRows(ASC.store.get(), picker.getItems(), el.value); },
    'pk-back': () => { picker.step = 'groups'; paintPicker(); },
    'pk-back-muscle': () => { picker.step = picker.muscle ? 'muscle' : 'search'; paintPicker(); },
    'pk-info': (el) => { picker.step = 'info'; picker.infoId = el.dataset.id; paintPicker(); },
    'pk-add': async (el) => {
      const p = picker;
      if (!p) return;
      await p.onPick(el.dataset.id);
    },
    'rp-choose': (el) => {
      if (!replacer) return;
      const sh = el.closest('.sheet');
      const keep = sh.querySelector('#rp-keep');
      const keepW = sh.querySelector('#rp-weight');
      const r = replacer;
      ASC.ui.closeTop();
      r.onChoose(el.dataset.id, { keepSets: keep ? keep.checked : true, keepWeight: keepW ? keepW.checked : false });
    },
    'gp-unavoid': (el) => {
      const st = ASC.store.get();
      st.settings.gym.avoidExercises = (st.settings.gym.avoidExercises || []).filter((x) => x !== el.dataset.id);
      el.closest('.list-item').remove();
      ASC.store.save();
    },
    'gp-save': (el) => {
      const sh = el.closest('.sheet');
      const st = ASC.store.get();
      const lv = sh.querySelector('[data-group="gp-level"] .on');
      if (lv) st.bodyProfile.level = lv.dataset.val;
      const eqAll = Array.from(sh.querySelectorAll('[data-group="gp-eq"] .chip'));
      const eqOn = eqAll.filter((c) => c.classList.contains('on')).map((c) => c.dataset.val);
      const mode = sh.querySelector('[data-group="gp-mode"] .on');
      st.settings.gym = Object.assign({}, st.settings.gym, {
        equipment: eqOn.length === eqAll.length ? [] : eqOn,
        avoid: Array.from(sh.querySelectorAll('[data-group="gp-avoid"] .on')).map((c) => c.dataset.val),
        scheduleMode: mode ? mode.dataset.val : 'week',
      });
      ASC.ui.closeTop();
      ASC.app.commit();
      if (picker) paintPicker();
      ASC.ui.toast('Preferencias guardadas.');
    },
    'ex-avoid': (el) => {
      const st = ASC.store.get();
      const list = st.settings.gym.avoidExercises || [];
      const on = list.includes(el.dataset.id);
      st.settings.gym.avoidExercises = on ? list.filter((x) => x !== el.dataset.id) : list.concat(el.dataset.id);
      ASC.app.commit();
      ASC.ui.toast(on ? 'Ya no está marcado para evitar.' : 'Marcado para evitar: no se va a recomendar.');
    },
  });

  ASC.screens['gym-start'] = { render: welcome, tab: 'gym' };
  ASC.screens.basic = { render: (p) => (p[0] ? basicDetail(p[0]) : basicList()), tab: 'gym' };
  ASC.gymGuide = { welcome, openPicker, paintPicker, openReplace, openPrefs, analysisCard, help, levelBadge, quickInfo, orientationText, SAFETY };
})(typeof window !== 'undefined' ? window : globalThis);
