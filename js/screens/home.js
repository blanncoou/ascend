/* ASCEND · Inicio: centro de control del día */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  const { esc, icon, ring } = ASC.ui;
  const D = ASC.dates;

  function greeting() {
    const h = new Date().getHours();
    if (h < 6) return 'Buenas noches';
    if (h < 13) return 'Buenos días';
    if (h < 20) return 'Buenas tardes';
    return 'Buenas noches';
  }

  function fmtQty(n) {
    return Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 });
  }

  /** Fila de hábito reutilizable (Inicio, Hábitos, Calendario). Respeta las reglas de edición. */
  function habitRow(st, h, key) {
    const done = ASC.habits.isDone(st, h.id, key);
    const streak = ASC.habits.currentStreak(st, h);
    const ds = ASC.rules.dateStatus(st, key);
    const qty = h.kind === 'quantity';
    let meta = '';
    const minQ = qty ? ASC.habits.effectiveMin(h, key) : 0;
    if (qty) meta += '<span><b style="color:#fff">' + fmtQty(ASC.habits.getQty(st, h.id, key)) + '</b> / ' + fmtQty(minQ) + ' ' + esc(h.qtyUnit || '') + (minQ < Number(h.qtyTarget) ? ' · ideal ' + fmtQty(h.qtyTarget) : '') + '</span>' + (ASC.habits.idealReached(st, h, key) && minQ < Number(h.qtyTarget) ? '<span class="red">Ideal</span>' : '');
    else if (ASC.habits.isFlexible(h)) { const pp = ASC.habits.periodProgress(st, h, key); meta += '<span>' + pp.count + '/' + pp.target + ' este ' + pp.unit + '</span>'; }
    else if (h.target) meta += '<span>' + esc(h.target) + '</span>';
    else meta += '<span>' + esc(ASC.habits.categoryLabel(h.category)) + '</span>';
    if (streak.value > 0) meta += '<span class="flame">' + icon('flame', 'xs') + streak.value + (streak.unit === 'semanas' ? ' sem' : '') + '</span>';
    if (h.reminderTime && ds !== 'closed') meta += '<span>' + esc(h.reminderTime) + '</span>';
    let action = '';
    if (ds === 'closed') {
      action = '<span class="check locked ' + (done ? 'on' : '') + '" role="img" aria-label="' + (done ? 'Hecho' : 'No registrado') + ' · día cerrado" title="Día cerrado: ya no se puede modificar">' + icon(done ? 'check' : 'lock', done ? '' : 'sm') + '</span>';
    } else if (ds === 'open') {
      if (qty) {
        const pct = Math.min(1, ASC.habits.getQty(st, h.id, key) / minQ);
        action = '<button class="icon-btn qty-edit" data-act="qty-edit" data-id="' + h.id + '" data-date="' + key + '" aria-label="Editar cantidad de ' + esc(h.name) + '">' + icon('edit', 'xs') + '</button>' +
          '<button class="check qty ' + (done ? 'on' : '') + '" style="--p:' + Math.round(pct * 100) + '%" data-act="qty-add" data-id="' + h.id + '" data-date="' + key + '" aria-label="Sumar ' + fmtQty(h.qtyStep || 1) + ' ' + esc(h.qtyUnit || '') + ' a ' + esc(h.name) + '">' + (done ? icon('check') : '<span class="qty-plus">+' + fmtQty(h.qtyStep || 1) + '</span>') + '</button>';
      } else {
        action = '<button class="check ' + (done ? 'on' : '') + '" data-act="habit-toggle" data-id="' + h.id + '" data-date="' + key + '" aria-pressed="' + done + '" aria-label="' + (done ? 'Desmarcar ' : 'Completar ') + esc(h.name) + '">' + icon('check') + '</button>';
      }
    }
    const bar = qty ? '<div class="bar-track" style="height:4px;margin-top:6px"><div class="bar-fill" style="width:' + Math.round(Math.min(1, ASC.habits.getQty(st, h.id, key) / minQ) * 100) + '%"></div></div>' : '';
    return '<div class="habit ' + (done ? 'done' : '') + (ds === 'closed' ? ' is-closed' : '') + '">' +
      '<div class="h-icon" style="background:' + h.color + '22">' + esc(h.icon) + '</div>' +
      '<a class="grow" href="#/habit/' + h.id + '"><div class="h-name">' + esc(h.name) + '</div><div class="h-meta">' + meta + '</div>' + bar + '</a>' + action + '</div>';
  }

  /** Tarjeta de hábito a evitar */
  function negativeRow(st, h) {
    const c = ASC.habits.cleanStreak(st, h);
    const goal = h.negGoalDays || 0;
    return '<div class="neg-card"><a class="row" href="#/habit/' + h.id + '" style="gap:12px"><div class="h-icon" style="background:' + h.color + '22">' + esc(h.icon) + '</div><div class="grow"><div class="tiny muted" style="text-transform:uppercase;letter-spacing:1px">Evitando</div><div class="h-name">' + esc(h.name) + '</div></div>' +
      '<div class="center"><div class="num" style="font-size:30px;line-height:1">' + c.current + '</div><div class="tiny muted">' + (c.current === 1 ? 'día' : 'días') + ' sin</div></div></a>' +
      (goal ? '<div class="row" style="margin-top:10px"><div class="bar-track grow" style="height:6px"><div class="bar-fill" style="width:' + Math.round(Math.min(1, c.current / goal) * 100) + '%"></div></div><span class="tiny muted">meta ' + goal + ' días</span></div>' : '') +
      '<div class="row between" style="margin-top:10px"><span class="tiny muted">Mejor racha: ' + c.best + ' días</span><button class="btn ghost sm" data-act="relapse-new" data-id="' + h.id + '">Registrar recaída</button></div></div>';
  }

  function taskRow(t) {
    return '<div class="habit ' + (t.done ? 'done' : '') + '" style="padding-left:10px">' +
      '<span class="prio ' + t.priority + '" title="Prioridad ' + t.priority + '"></span>' +
      '<button class="grow" style="text-align:left" data-act="task-edit" data-id="' + t.id + '"><div class="h-name">' + esc(t.title) + '</div><div class="h-meta"><span>Prioridad ' + t.priority + '</span>' + (t.time ? '<span>' + esc(t.time) + '</span>' : '') + '</div></button>' +
      '<button class="check ' + (t.done ? 'on' : '') + '" data-act="task-toggle" data-id="' + t.id + '" aria-label="' + (t.done ? 'Desmarcar tarea' : 'Completar tarea') + '">' + icon('check') + '</button></div>';
  }

  const PRIO_ORDER = { alta: 0, media: 1, baja: 2 };
  function tasksFor(st, key) {
    if (ASC.planner) return ASC.planner.tasksFor(st, key);
    return st.tasks.filter((t) => t.date === key).sort((a, b) => (a.done - b.done) || (PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority]) || String(a.time || '99').localeCompare(String(b.time || '99')));
  }

  const TOD = [['manana', 'Mañana', 'sun'], ['tarde', 'Tarde', 'sunset'], ['noche', 'Noche', 'moon'], ['', 'Cualquier momento', 'list']];

  /** Mensaje breve según el estado real del día (sin culpas) */
  function contextMessage(st, info, streak, recovering) {
    const hr = new Date().getHours();
    if (recovering) return 'Hoy alcanza con el mínimo de tus hábitos clave.';
    if (!info.scheduled) return 'Día libre de hábitos. Descansar también suma.';
    if (info.pct >= 1) return streak > 1 ? 'Día completo. ' + streak + ' días de constancia.' : 'Día completo. Así se construye.';
    const left = info.scheduled - info.done;
    if (streak > 0 && hr >= 18) return 'Te ' + (left === 1 ? 'queda 1 hábito' : 'quedan ' + left + ' hábitos') + ' para sostener tus ' + streak + ' días.';
    if (info.done === 0) return hr < 12 ? 'Arrancá por el más fácil: el impulso hace el resto.' : 'Todavía hay tiempo: elegí uno y empezá.';
    return 'Vas por buen camino: ' + Math.round(info.pct * 100) + ' % del día.';
  }

  function render() {
    const st = ASC.store.get();
    const today = D.today();
    const C = ASC.calendar;
    const info = C.dayInfo(st, today, today);
    const det = C.dayDetail(st, today, today);
    const streak = ASC.progress.consistencyStreak(st, today);
    const xp = ASC.progress.xp(st, today);
    const lv = xp.level;
    const recovering = ASC.recovery && ASC.recovery.active(st, today);
    const pctNum = Math.round(info.pct * 100);
    const tp = ASC.habits.todayProgress(st, today);

    let s = '<div class="screen">';
    s += '<div class="head"><div><div class="sub" style="margin:0 0 4px;text-transform:capitalize">' + esc(D.longLabel(today)) + '</div><h1>' + greeting() + ',<br><span class="red">' + esc(st.profile.name) + '</span></h1></div>' +
      '<a class="rank-chip" href="#/progress" aria-label="Rango ' + esc(lv.rank) + ', nivel ' + lv.level + '">' + ASC.ui.emblem(lv.rankIndex, 30) + '<span>Nv ' + lv.level + ' · ' + esc(lv.rank) + '</span></a></div>';

    s += '<div class="dgrid"><div class="dcol">';
    // A. Resumen del día (mismo % que el calendario)
    const qtyTxt = det.qty.map((q) => esc(q.habit.name) + ' ' + fmtQty(q.value) + '/' + fmtQty(q.target)).join(' · ');
    s += '<section class="card day-sum" aria-label="Resumen del día"><div class="day-sum-body">' +
      ring(info.pct, 104, 10, '<div><b>' + (info.scheduled ? pctNum + '%' : '—') + '</b><span>hoy</span></div>') +
      '<div class="day-sum-stats">' +
      '<div><b class="num">' + info.done + '<small>/' + info.scheduled + '</small></b><span>hechos</span></div>' +
      '<div><b class="num">' + det.pending.length + '</b><span>pendientes</span></div>' +
      '<div><b class="num">' + det.xp.total + '</b><span>XP hoy</span></div>' +
      '</div></div>' + (qtyTxt ? '<div class="tiny muted day-sum-qty">' + qtyTxt + '</div>' : '') + '</section>';

    if (ASC.plannerUI) s += ASC.plannerUI.recoveryCard(st, today) + ASC.plannerUI.moodRow(st, today);

    // B. Hábitos por momento del día
    s += '<div class="section"><div class="section-title">Hábitos de hoy <a class="link" href="#/habits?tab=today">Ver todos</a></div>';
    if (!st.habits.filter((h) => !h.archivedAt).length) {
      s += ASC.ui.emptyState('habits', 'Creá tu primer hábito', 'Un hábito chico y diario es el mejor punto de partida.', 'Nuevo hábito', 'habit-new');
    } else if (!tp.list.length) {
      s += '<div class="card small muted">No tenés hábitos programados para hoy. Descansar también es parte del proceso.</div>';
    } else {
      const routines = st.habitRoutines || [];
      TOD.forEach(([slot, label, ic]) => {
        const list = tp.list.filter((h) => ASC.habits.timeOfDay(h) === slot);
        const r = routines.filter((x) => x.slot === slot);
        if (!list.length && !r.length) return;
        const pend = list.filter((h) => !ASC.habits.isDone(st, h.id, today));
        const done = list.filter((h) => ASC.habits.isDone(st, h.id, today));
        s += '<div class="tod"><div class="tod-head">' + icon(ic, 'xs') + '<span>' + label + '</span><span class="tiny muted">' + done.length + '/' + list.length + '</span></div>' +
          r.map((x) => { const p = ASC.planner.routineProgress(st, x, today); return p.total ? '<a class="tod-routine" href="#/habits?tab=routines">' + icon('list', 'xs') + '<span class="grow">' + esc(x.name) + '</span><span class="tiny muted">' + p.done + '/' + p.total + '</span>' + icon('chevR', 'xs') + '</a>' : ''; }).join('') +
          pend.concat(done).map((h) => habitRow(st, h, today)).join('') + '</div>';
      });
    }
    s += '</div>';
    const negs = st.habits.filter((h) => h.kind === 'negative' && !h.archivedAt);
    if (negs.length) s += '<div class="section"><div class="section-title">Evitando</div>' + negs.map((h) => negativeRow(st, h)).join('') + '</div>';

    s += '</div><div class="dcol">';
    // D. Motivación
    s += '<div class="section" style="margin-top:0"><div class="card motivation"><div class="row" style="gap:12px">' + ASC.ui.emblem(lv.rankIndex, 48) +
      '<div class="grow"><b>Nivel ' + lv.level + ' · ' + esc(lv.rank) + '</b>' +
      '<div class="bar-track" style="height:6px;margin-top:8px"><div class="bar-fill" style="width:' + Math.round(lv.pct * 100) + '%"></div></div><div class="tiny muted" style="margin-top:6px">Faltan ' + ASC.ui.fmtNum(lv.needed - lv.into) + ' XP para el nivel ' + (lv.level + 1) + '</div></div></div>' +
      '<div class="row mt" style="gap:16px"><span class="small">' + icon('flame', 'xs red') + ' <b>' + streak + '</b> ' + (streak === 1 ? 'día' : 'días') + ' de constancia</span></div>' +
      '<p class="small" style="margin:8px 0 0;color:#d8d8dd">' + esc(contextMessage(st, info, streak, recovering)) + '</p></div>';
    if (ASC.plannerUI && st.habits.some((h) => !h.archivedAt)) s += '<div class="mt">' + ASC.plannerUI.monthlyCard(st, today) + '</div>';
    s += '</div>';

    // C. Gimnasio
    const nw = ASC.gym.nextWorkout(st, today);
    const trainedToday = ASC.gym.workedOutOn(st, today);
    const last = ASC.gym.completedSessions(st).slice().sort((a, b) => (a.endedAt < b.endedAt ? 1 : -1))[0];
    s += '<div class="section"><div class="section-title">Gimnasio <a class="link" href="#/gym">Abrir</a></div>';
    const active = st.activeSessionId && st.sessions.find((x) => x.id === st.activeSessionId && x.status === 'in_progress');
    if (active) {
      s += '<a class="card tap routine-card" href="#/workout" style="display:block;border-color:rgba(var(--red-rgb),.5)"><span class="badge red">En curso</span><h3 style="margin-top:8px">' + esc(active.routineName) + '</h3><div class="small muted mt">Tocá para continuar donde lo dejaste.</div></a>';
    } else if (nw) {
      const r = nw.routine;
      s += '<div class="card routine-card"><div class="row between"><span class="badge ' + (nw.isToday && !trainedToday ? 'red' : '') + '">' + (nw.sequence ? 'Día ' + nw.position + ' de ' + nw.total : nw.isToday ? 'Hoy' : esc(D.DIAS_LARGOS[D.weekday(nw.key)])) + '</span><span class="small muted">' + r.items.length + ' ejercicios</span></div>' +
        '<h3 style="margin-top:10px">' + esc(r.name) + '</h3>' + (trainedToday ? '<div class="small muted">Ya entrenaste hoy: esta es la próxima.</div>' : '') +
        '<button class="btn primary block mt" data-act="workout-start" data-id="' + r.id + '"' + (r.items.length ? '' : ' disabled') + '>' + icon('play', 'sm') + 'Empezar</button></div>';
    } else {
      s += ASC.ui.emptyState('dumbbell', 'Armá tu rutina', 'Creá una rutina o empezá con una básica.', 'Ir al gimnasio', 'go-gym');
    }
    if (last) {
      const sm = ASC.gym.sessionStats ? ASC.gym.sessionStats(last) : null;
      s += '<a class="list-item mt" href="#/session/' + last.id + '" style="border-radius:var(--r);border:1px solid var(--line)">' + icon('history', 'sm') + '<span class="grow small">Último: <b>' + esc(last.routineName || 'Entrenamiento') + '</b><div class="tiny muted">' + esc(D.shortLabel(ASC.gym.sessionDateKey(last))) + (sm ? ' · ' + sm.sets + ' series · ' + ASC.ui.fmtNum(sm.volume) + ' kg' : '') + '</div></span>' + icon('chevR', 'sm chev') + '</a>';
    }
    s += '</div>';

    // Plan del día (3 prioridades) y enfoque
    if (ASC.plannerUI) s += ASC.plannerUI.prioritiesSection(st, today);
    s += '<button class="card tap row focus-cta" data-act="focus-open">' + icon('timer', 'sm red') + '<span class="grow" style="text-align:left"><b class="small">Modo enfoque</b><div class="tiny muted">' + (st.focus ? 'Sesión en curso: ' + esc(st.focus.label) : 'Temporizador para estudiar, leer o trabajar') + '</div></span>' + icon('chevR', 'sm chev') + '</button>';

    return s + '</div></div></div>';
  }

  function quick(ic, label, act) {
    return '<button class="card tap row" style="text-align:left" data-act="' + act + '"><span class="icon-btn" style="background:var(--red-soft);border-color:transparent;color:var(--red)">' + icon(ic, 'sm') + '</span><span class="small" style="font-weight:600">' + label + '</span></button>';
  }

  /* ---------- Tareas ---------- */
  function taskForm(t) {
    t = t || { title: '', priority: 'media', time: '', date: D.today() };
    const pr = ['alta', 'media', 'baja'];
    return '<label class="field"><span>Tarea</span><input class="input" name="title" maxlength="80" value="' + esc(t.title) + '"></label>' +
      '<div class="field"><span>Prioridad</span><div class="chips" data-group="prio">' + pr.map((p) => '<button class="chip ' + (t.priority === p ? 'on' : '') + '" data-act="pick-one" data-val="' + p + '">' + p.charAt(0).toUpperCase() + p.slice(1) + '</button>').join('') + '</div></div>' +
      '<div class="two"><label class="field"><span>Fecha</span><input class="input" type="date" name="date" value="' + esc(t.date) + '"></label>' +
      '<label class="field"><span>Horario (opcional)</span><input class="input" type="time" name="time" value="' + esc(t.time || '') + '"></label></div>';
  }

  function readTask(sh) {
    const g = sh.querySelector('[data-group="prio"] .on');
    return {
      title: sh.querySelector('[name=title]').value.trim(),
      priority: g ? g.dataset.val : 'media',
      date: sh.querySelector('[name=date]').value || D.today(),
      time: sh.querySelector('[name=time]').value,
    };
  }

  Object.assign(ASC.actions, {
    noop: () => {},
    'habit-toggle': (el) => {
      const st = ASC.store.get();
      const before = ASC.progress.xp(st).total;
      const on = ASC.habits.toggle(st, el.dataset.id, el.dataset.date);
      if (on === null) { ASC.ui.toast(ASC.rules.closedMessage(st), 'error'); return; }
      if (on && ASC.sound) ASC.sound.play('complete');
      if (on) { ASC.ui.burst(el); ASC.ui.haptic(12); }
      ASC._pop = on ? el.dataset.id : null;
      ASC.app.commit();
      const diff = ASC.progress.xp(st).total - before;
      if (diff > 0) ASC.ui.toast('<b>+' + diff + ' XP</b> ' + (diff > 10 ? '¡Día completo!' : 'Bien ahí.'), 'xp', true);
    },
    'qty-add': (el) => {
      const st = ASC.store.get();
      const h = st.habits.find((x) => x.id === el.dataset.id);
      const before = ASC.progress.xp(st).total;
      const wasDone = ASC.habits.isDone(st, h.id, el.dataset.date);
      const cur = ASC.habits.getQty(st, h.id, el.dataset.date);
      // si ya estaba completo, tocar de nuevo no suma más: abre el editor
      if (wasDone) return ASC.actions['qty-edit'](el);
      const v = ASC.habits.setQty(st, h.id, el.dataset.date, cur + (Number(h.qtyStep) || 1));
      if (v === null) { ASC.ui.toast(ASC.rules.closedMessage(st), 'error'); return; }
      ASC.ui.haptic(8);
      const nowDone = ASC.habits.isDone(st, h.id, el.dataset.date);
      if (nowDone) { ASC.ui.burst(el); ASC._pop = h.id; if (ASC.sound) ASC.sound.play('complete'); }
      ASC.app.commit();
      const diff = ASC.progress.xp(st).total - before;
      if (diff > 0) ASC.ui.toast('<b>+' + diff + ' XP</b> Objetivo de ' + esc(h.name) + ' cumplido.', 'xp', true);
    },
    'qty-edit': (el) => {
      const st = ASC.store.get();
      const h = st.habits.find((x) => x.id === el.dataset.id);
      const key = el.dataset.date;
      const cur = ASC.habits.getQty(st, h.id, key);
      const step = Number(h.qtyStep) || 1;
      ASC.ui.sheet({ title: h.name, body:
        '<p class="small muted" style="margin-top:-8px">' + esc(D.longLabel(key)) + ' · objetivo ' + fmtQty(h.qtyTarget) + ' ' + esc(h.qtyUnit || '') + '</p>' +
        '<label class="field"><span>Cantidad registrada (' + esc(h.qtyUnit || 'unidades') + ')</span><input class="input big" name="qty" inputmode="decimal" value="' + (cur || '') + '" placeholder="0"></label>' +
        '<div class="chips" style="margin-bottom:16px">' + [-step, step, step * 2, step * 4].map((d) => '<button class="chip" data-act="qty-bump" data-d="' + d + '">' + (d > 0 ? '+' : '−') + fmtQty(Math.abs(d)) + '</button>').join('') + '<button class="chip" data-act="qty-bump" data-set="' + h.qtyTarget + '">Completar</button></div>' +
        '<button class="btn primary block" data-act="qty-save" data-id="' + h.id + '" data-date="' + key + '">Guardar</button>' });
    },
    'qty-bump': (el) => {
      const i = el.closest('.sheet').querySelector('[name=qty]');
      const cur = parseFloat(String(i.value).replace(',', '.')) || 0;
      i.value = el.dataset.set ? el.dataset.set : Math.max(0, Math.round((cur + Number(el.dataset.d)) * 100) / 100);
    },
    'qty-save': (el) => {
      const st = ASC.store.get();
      const sh = ASC.ui.topSheet();
      const input = sh.querySelector('[name=qty]');
      const v = parseFloat(String(input.value).replace(',', '.'));
      if (input.value !== '' && (isNaN(v) || v < 0)) return ASC.ui.fieldError(input, 'Ingresá un número igual o mayor a 0.');
      const before = ASC.progress.xp(st).total;
      const r = ASC.habits.setQty(st, el.dataset.id, el.dataset.date, isNaN(v) ? 0 : v);
      if (r === null) { ASC.ui.toast(ASC.rules.closedMessage(st), 'error'); return; }
      ASC.ui.closeTop();
      ASC.app.commit();
      const diff = ASC.progress.xp(st).total - before;
      if (diff > 0) ASC.ui.toast('<b>+' + diff + ' XP</b>', 'xp', true);
    },
    'relapse-new': (el) => {
      const st = ASC.store.get();
      const h = st.habits.find((x) => x.id === el.dataset.id);
      const today = D.today();
      const win = ASC.rules.windowDays(st);
      const opts = [];
      for (let i = 0; i <= win; i++) { const k = D.addDays(today, -i); if (k >= h.startDate) opts.push(k); }
      ASC.ui.sheet({ title: 'Registrar recaída', autofocus: false, body:
        '<p class="small muted" style="margin-top:-8px">Registrarlo es parte del proceso: te ayuda a ver patrones. Tu mejor racha se conserva y podés volver a empezar hoy mismo.</p>' +
        '<label class="field"><span>¿Cuándo?</span><select class="select" name="date">' + opts.map((k, i) => '<option value="' + k + '">' + (i === 0 ? 'Hoy' : i === 1 ? 'Ayer' : esc(D.longLabel(k))) + '</option>').join('') + '</select></label>' +
        '<label class="field"><span>¿Qué pasó o qué aprendiste? (opcional)</span><textarea class="textarea" name="note" maxlength="500" style="min-height:80px" placeholder="Ej: fue después de un día de mucho estrés"></textarea></label>' +
        '<button class="btn primary block" data-act="relapse-save" data-id="' + h.id + '">Registrar y seguir</button>' });
    },
    'relapse-save': (el) => {
      const st = ASC.store.get();
      const sh = ASC.ui.topSheet();
      const r = ASC.habits.logRelapse(st, el.dataset.id, sh.querySelector('[name=date]').value, sh.querySelector('[name=note]').value.trim());
      if (r === null) { ASC.ui.toast(ASC.rules.closedMessage(st), 'error'); return; }
      ASC.ui.closeTop();
      ASC.app.commit();
      ASC.ui.toast('Registrado. Cada día es una nueva oportunidad: tu contador vuelve a empezar.');
    },
    'task-quick': () => {
      const i = document.getElementById('quick-task');
      const v = i && i.value.trim();
      if (!v) { if (i) i.focus(); return; }
      ASC.store.get().tasks.push({ id: ASC.store.uid(), title: v, priority: 'media', time: '', date: D.today(), done: false, createdAt: new Date().toISOString() });
      ASC.app.commit();
      const n = document.getElementById('quick-task');
      if (n) n.focus();
    },
    'task-toggle': (el) => {
      const t = ASC.store.get().tasks.find((x) => x.id === el.dataset.id);
      if (!t) return;
      t.done = !t.done;
      if (t.done) { ASC.ui.burst(el); ASC.ui.haptic(10); }
      ASC.app.commit();
    },
    'task-edit': (el) => {
      const st = ASC.store.get();
      const t = st.tasks.find((x) => x.id === el.dataset.id);
      if (!t) return;
      ASC.ui.sheet({
        title: 'Editar tarea', autofocus: false,
        body: taskForm(t) + '<button class="btn primary block" data-act="task-save" data-id="' + t.id + '">Guardar</button><button class="btn danger block mt" data-act="task-delete" data-id="' + t.id + '">' + icon('trash', 'sm') + 'Eliminar</button>',
      });
    },
    'task-save': (el) => {
      const sh = ASC.ui.topSheet();
      const v = readTask(sh);
      if (!v.title) return ASC.ui.fieldError(sh.querySelector('[name=title]'), 'La tarea necesita un título.');
      const t = ASC.store.get().tasks.find((x) => x.id === el.dataset.id);
      Object.assign(t, v, { updatedAt: new Date().toISOString() });
      ASC.ui.closeTop();
      ASC.app.commit();
    },
    'task-delete': async (el) => {
      if (!(await ASC.ui.confirm({ title: '¿Eliminar tarea?', text: 'No se puede deshacer.', ok: 'Eliminar', danger: true }))) return;
      const st = ASC.store.get();
      ASC.merge && ASC.merge.markDeleted(st, el.dataset.id);
      st.tasks = st.tasks.filter((x) => x.id !== el.dataset.id);
      ASC.ui.closeTop();
      ASC.app.commit();
    },
    // genéricos para formularios
    'pick-one': (el) => {
      const g = el.closest('[data-group]');
      g.querySelectorAll('.on').forEach((x) => x.classList.remove('on'));
      el.classList.add('on');
      g.querySelectorAll('[aria-pressed]').forEach((b) => b.setAttribute('aria-pressed', String(b === el)));
      if (g.dataset.group === 'kind') {
        const sh = el.closest('.sheet');
        const k = el.dataset.val;
        g.querySelectorAll('[aria-pressed]').forEach((b) => b.setAttribute('aria-pressed', b === el));
        sh.querySelectorAll('[data-kind-panel]').forEach((p) => (p.hidden = p.dataset.kindPanel !== k));
        sh.querySelectorAll('[data-kind-hide]').forEach((p) => (p.hidden = p.dataset.kindHide === k));
        const lab = sh.querySelector('[data-kind-label]');
        if (lab) lab.textContent = k === 'negative' ? 'Qué querés evitar' : 'Nombre';
        const nm = sh.querySelector('[name=name]');
        if (nm) nm.placeholder = k === 'negative' ? 'Ej: Fumar, redes después de las 23 h' : k === 'quantity' ? 'Ej: Tomar agua' : 'Ej: Leer 20 minutos';
      }
      if (g.dataset.group === 'freq') {
        const sh = el.closest('.sheet');
        sh.querySelectorAll('[data-freq-panel]').forEach((p) => (p.hidden = p.dataset.freqPanel !== el.dataset.val));
      }
    },
    'toggle-on': (el) => {
      el.classList.toggle('on');
      if (el.classList.contains('switch') || el.hasAttribute('aria-pressed')) el.setAttribute('aria-pressed', el.classList.contains('on'));
    },
  });

  ASC.actions['go-gym'] = () => { location.hash = '#/gym'; };
  ASC.screens.home = { render, tab: 'home' };
  ASC.homeHelpers = { habitRow, negativeRow, taskRow, tasksFor, fmtQty };
})(typeof window !== 'undefined' ? window : globalThis);
