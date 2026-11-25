/* ASCEND · Interfaz de planificación, enfoque, recuperación, juego mensual, recompensas y ánimo
 * Componentes que se usan en Inicio, Hábitos y Estadísticas. Toda la lógica vive en js/domain/*.
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  const { esc, icon } = ASC.ui;
  const D = ASC.dates;
  const H = ASC.habits;
  const PL = ASC.planner;

  const SLOT_ICON = { manana: 'sun', tarde: 'sunset', noche: 'moon', custom: 'list', '': 'list' };

  /* =========================================================
   * Rutinas de hábitos (Hábitos → Rutinas)
   * ========================================================= */
  function routineCard(st, r, key, compact) {
    const p = PL.routineProgress(st, r, key);
    const editable = ASC.rules.canEdit(st, key);
    let s = '<div class="card routine-h' + (p.total && p.done === p.total ? ' complete' : '') + '"><div class="row between"><div class="row" style="gap:10px;min-width:0">' +
      '<span class="slot-ic" aria-hidden="true">' + icon(SLOT_ICON[r.slot] || 'list', 'sm') + '</span><div style="min-width:0"><b class="ell" style="display:block">' + esc(r.name) + '</b><div class="tiny muted">' + PL.slotLabel(r.slot) + (r.reminderTime ? ' · ' + esc(r.reminderTime) : '') + ' · ' + p.done + '/' + p.total + '</div></div></div>' +
      (compact ? '' : '<button class="icon-btn" data-act="hr-edit" data-id="' + r.id + '" aria-label="Editar rutina ' + esc(r.name) + '">' + icon('edit', 'xs') + '</button>') + '</div>' +
      '<div class="bar-track mt" style="height:5px" aria-hidden="true"><div class="bar-fill" style="width:' + Math.round(p.pct * 100) + '%"></div></div>';
    if (!p.items.length) s += '<p class="small muted" style="margin:10px 0 0">' + (r.items.length ? 'Nada de esta rutina aplica hoy.' : 'Todavía no tiene pasos. Editala para sumar hábitos y actividades.') + '</p>';
    s += '<ol class="steps-list">' + p.items.map((x) => {
      const act = x.item.type === 'habit' ? (x.habit.kind === 'quantity' ? 'qty-edit' : 'habit-toggle') : 'hr-activity';
      const data = x.item.type === 'habit' ? 'data-id="' + x.habit.id + '" data-date="' + key + '"' : 'data-r="' + r.id + '" data-item="' + x.item.id + '" data-date="' + key + '"';
      const label = esc(x.title) + (x.minutes ? ' · ' + x.minutes + ' min' : '') + (x.item.type === 'habit' ? '' : ' <span class="tiny faint">(actividad)</span>');
      return '<li class="step ' + (x.done ? 'done' : '') + '">' + (editable ? '<button class="step-check" data-act="' + act + '" ' + data + ' aria-pressed="' + x.done + '" aria-label="' + (x.done ? 'Desmarcar ' : 'Completar ') + esc(x.title) + '">' + icon('check', 'xs') + '</button>' : '<span class="step-check" aria-hidden="true">' + (x.done ? icon('check', 'xs') : '') + '</span>') + '<span class="grow">' + label + '</span></li>';
    }).join('') + '</ol>';
    return s + '</div>';
  }

  function routinesTab() {
    const st = ASC.store.get();
    const today = D.today();
    let s = '<p class="small muted" style="margin-top:0">Agrupá hábitos y actividades en el orden en que los hacés. Completar un hábito acá es lo mismo que marcarlo en tu día.</p>';
    const all = st.habitRoutines || [];
    if (!all.length) {
      s += ASC.ui.emptyState('list', 'Armá tu primera rutina', 'Por ejemplo, una rutina de mañana: agua, estirar 5 minutos y planificar el día.', 'Nueva rutina', 'hr-new');
      s += '<div class="row mt" style="gap:8px;flex-wrap:wrap">' + PL.SLOTS.slice(0, 3).map(([v, l]) => '<button class="btn ghost sm" data-act="hr-new" data-slot="' + v + '">' + icon(SLOT_ICON[v], 'xs') + 'Rutina de ' + l.toLowerCase() + '</button>').join('') + '</div>';
      return s;
    }
    PL.SLOTS.forEach(([slot, label]) => {
      const list = PL.routinesForSlot(st, slot);
      if (!list.length) return;
      s += '<div class="section"><div class="section-title">' + label + '</div><div class="card-grid">' + list.map((r) => routineCard(st, r, today)).join('') + '</div></div>';
    });
    s += '<button class="btn ghost block mt" data-act="hr-new">' + icon('plus', 'sm') + 'Nueva rutina</button>';
    return s;
  }

  let hrDraft = null;
  function routineForm(r) {
    const st = ASC.store.get();
    const habits = st.habits.filter((h) => !h.archivedAt && h.kind !== 'negative');
    let s = '<label class="field"><span>Nombre</span><input class="input" id="hr-name" maxlength="40" value="' + esc(r.name) + '"></label>' +
      '<div class="field"><span>Momento</span><div class="chips" data-group="hr-slot">' + PL.SLOTS.map(([v, l]) => '<button class="chip ' + (r.slot === v ? 'on' : '') + '" data-act="pick-one" data-val="' + v + '" aria-pressed="' + (r.slot === v) + '">' + l + '</button>').join('') + '</div></div>' +
      '<div class="field"><span>Pasos en orden</span><div class="list" id="hr-items">' + (r.items.length ? r.items.map((it, i) => {
        const h = it.type === 'habit' ? st.habits.find((x) => x.id === it.habitId) : null;
        const name = h ? esc(h.icon || '') + ' ' + esc(h.name) : esc(it.title) + (it.minutes ? ' · ' + it.minutes + ' min' : '');
        return '<div class="list-item"><span class="grow small">' + (i + 1) + '. ' + name + (h ? '' : ' <span class="tiny faint">actividad</span>') + '</span>' +
          '<button class="icon-btn" style="width:34px;height:34px" data-act="hr-move" data-i="' + i + '" data-dir="-1" aria-label="Subir"' + (i ? '' : ' disabled') + '>' + icon('up', 'xs') + '</button>' +
          '<button class="icon-btn" style="width:34px;height:34px" data-act="hr-move" data-i="' + i + '" data-dir="1" aria-label="Bajar"' + (i < r.items.length - 1 ? '' : ' disabled') + '>' + icon('down', 'xs') + '</button>' +
          '<button class="icon-btn" style="width:34px;height:34px;color:var(--red-text)" data-act="hr-remove" data-i="' + i + '" aria-label="Quitar">' + icon('x', 'xs') + '</button></div>';
      }).join('') : '<div class="list-item small muted">Sin pasos todavía.</div>') + '</div></div>';
    const avail = habits.filter((h) => !r.items.some((it) => it.habitId === h.id));
    s += '<div class="two"><label class="field"><span>Sumar un hábito</span><select class="select" id="hr-habit"><option value="">Elegí…</option>' + avail.map((h) => '<option value="' + h.id + '">' + esc(h.name) + '</option>').join('') + '</select></label><div class="field"><span>&nbsp;</span><button class="btn ghost" data-act="hr-add-habit">' + icon('plus', 'xs') + 'Sumar</button></div></div>' +
      '<div class="two"><label class="field"><span>O una actividad</span><input class="input" id="hr-act" maxlength="40" placeholder="Ej: Estirar"></label><label class="field"><span>Minutos (opcional)</span><input class="input" id="hr-min" inputmode="numeric" maxlength="3" placeholder="5"></label></div>' +
      '<button class="btn ghost sm" data-act="hr-add-act" style="margin:-6px 0 14px">' + icon('plus', 'xs') + 'Sumar actividad</button>' +
      '<div class="two"><label class="field"><span>Recordatorio</span><input class="input" type="time" id="hr-time" value="' + esc(r.reminderTime || '') + '"></label><div></div></div>' +
      '<div class="field"><span>Días del recordatorio (vacío = todos)</span><div class="chips" data-group="hr-days">' + [1, 2, 3, 4, 5, 6, 0].map((d) => '<button class="chip day ' + ((r.reminderDays || []).includes(d) ? 'on' : '') + '" data-act="toggle-on" data-val="' + d + '" aria-pressed="' + (r.reminderDays || []).includes(d) + '" aria-label="' + D.DIAS_LARGOS[d] + '">' + D.DIAS_LETRA[d] + '</button>').join('') + '</div></div>' +
      '<button class="btn primary block" data-act="hr-save">Guardar rutina</button>' + (r._isNew ? '' : '<button class="btn ghost block mt" style="color:var(--red-text)" data-act="hr-delete">Eliminar rutina</button>');
    return s;
  }
  function readRoutineFields(sh) {
    if (!sh || !hrDraft) return;
    const n = sh.querySelector('#hr-name'); if (n) hrDraft.name = n.value.trim() || hrDraft.name;
    const sl = sh.querySelector('[data-group="hr-slot"] .on'); if (sl) hrDraft.slot = sl.dataset.val;
    const t = sh.querySelector('#hr-time'); if (t) hrDraft.reminderTime = t.value;
    hrDraft.reminderDays = Array.from(sh.querySelectorAll('[data-group="hr-days"] .on')).map((e) => Number(e.dataset.val));
  }
  function paintRoutineForm(sh) {
    const b = sh.querySelector('.sheet-body');
    b.innerHTML = routineForm(hrDraft);
  }
  function openRoutineForm(r) {
    hrDraft = JSON.parse(JSON.stringify(r));
    ASC.ui.sheet({ title: r._isNew ? 'Nueva rutina' : 'Editar rutina', body: routineForm(hrDraft) });
  }

  /* =========================================================
   * Prioridades del día (Inicio)
   * ========================================================= */
  function prioritiesSection(st, today) {
    const tasks = PL.tasksFor(st, today);
    const top = tasks.filter((t) => t.top);
    const rest = tasks.filter((t) => !t.top);
    const late = PL.pendingBefore(st, today);
    let s = '<div class="section"><div class="section-title">Plan del día <span class="small muted" style="font-family:var(--font);text-transform:none;letter-spacing:0">' + tasks.filter((t) => t.done).length + '/' + tasks.length + '</span></div>';
    if (late.length) s += '<div class="card row between" style="margin-bottom:10px;gap:10px"><span class="small">' + late.length + (late.length === 1 ? ' tarea pendiente' : ' tareas pendientes') + ' de días anteriores.</span><button class="btn ghost sm" data-act="tasks-bring">Pasarlas a hoy</button></div>';
    s += '<div class="row" style="margin-bottom:10px"><input class="input grow" id="quick-task" aria-label="Nueva tarea para hoy" maxlength="80" placeholder="Agregar una tarea para hoy…" data-enter="task-quick"><button class="icon-btn red" data-act="task-quick" aria-label="Agregar tarea">' + icon('plus') + '</button></div>';
    s += '<div class="prio-box"><div class="tiny muted" style="margin:0 2px 6px;font-weight:700;letter-spacing:.5px;text-transform:uppercase">Tus 3 prioridades</div>' + (top.length ? top.map((t) => taskRow(t, true)).join('') : '<div class="small faint" style="padding:6px 2px 4px">Marcá con ★ hasta 3 tareas que sí o sí querés hacer hoy.</div>') + '</div>';
    if (rest.length) s += '<div class="mt">' + rest.map((t) => taskRow(t, false)).join('') + '</div>';
    return s + '</div>';
  }
  function taskRow(t, isTop) {
    return '<div class="task ' + (t.done ? 'done' : '') + (isTop ? ' top' : '') + '">' +
      '<button class="star ' + (t.top ? 'on' : '') + '" data-act="task-top" data-id="' + t.id + '" aria-pressed="' + !!t.top + '" aria-label="' + (t.top ? 'Quitar de prioridades' : 'Marcar como prioridad') + '">' + icon('star', 'xs') + '</button>' +
      '<button class="grow task-main" data-act="task-edit" data-id="' + t.id + '"><span class="h-name">' + esc(t.title) + '</span><span class="tiny muted">' + (t.time ? esc(t.time) + ' · ' : '') + 'Prioridad ' + esc(t.priority) + (t.rescheduled ? ' · reprogramada' : '') + '</span></button>' +
      (t.done ? '' : '<button class="icon-btn mini" data-act="task-move" data-id="' + t.id + '" data-dir="-1" aria-label="Subir ' + esc(t.title) + '">' + icon('up', 'xs') + '</button><button class="icon-btn mini" data-act="task-later" data-id="' + t.id + '" aria-label="Pasar ' + esc(t.title) + ' a mañana">' + icon('skip', 'xs') + '</button>') +
      '<button class="check ' + (t.done ? 'on' : '') + '" data-act="task-toggle" data-id="' + t.id + '" aria-pressed="' + !!t.done + '" aria-label="' + (t.done ? 'Desmarcar tarea' : 'Completar tarea') + '">' + icon('check') + '</button></div>';
  }

  /* =========================================================
   * Modo enfoque (#/focus)
   * ========================================================= */
  let focusTimer = null;
  function focusScreen() {
    const st = ASC.store.get();
    const f = st.focus;
    let s = '<div class="screen"><div class="head"><a class="icon-btn" href="#/home" aria-label="Volver">' + icon('chevL') + '</a><div><h1>Enfoque</h1><div class="sub">Un bloque, una cosa</div></div></div>';
    if (f) {
      const rem = PL.focusRemaining(st);
      const pct = 1 - rem / (f.minutes * 60);
      s += '<div class="card center focus-live"><div class="tiny muted" style="text-transform:uppercase;letter-spacing:1px;font-weight:700">' + esc(f.label) + '</div>' +
        ASC.ui.ring(pct, 220, 12, '<div><b class="focus-clock" id="focus-clock" aria-live="off">' + D.clock(rem) + '</b><span>de ' + f.minutes + ' min</span></div>') +
        (f.habitId ? '<p class="small muted">Al terminar suma los minutos a <b style="color:var(--text)">' + esc((st.habits.find((h) => h.id === f.habitId) || {}).name || '') + '</b>.</p>' : '') +
        '<div class="row mt" style="gap:10px;justify-content:center"><button class="btn primary" data-act="focus-finish" data-done="1">' + icon('check', 'sm') + 'Terminé</button><button class="btn ghost" data-act="focus-finish" data-done="0">Cortar acá</button></div>' +
        '<p class="tiny faint mt">Podés cambiar de pantalla: el tiempo sigue corriendo. ' + (('Notification' in window) && Notification.permission === 'granted' ? 'Te avisamos al terminar si ASCEND sigue abierto.' : 'Activá las notificaciones en Perfil para recibir un aviso al terminar (con ASCEND abierto).') + '</p></div>';
    } else {
      const fh = PL.focusHabits(st);
      s += '<div class="card"><label class="field"><span>¿En qué te vas a enfocar?</span><input class="input" id="focus-label" maxlength="40" placeholder="Estudiar, leer, trabajar…" value="Estudiar"></label>' +
        '<div class="field"><span>Duración</span><div class="chips" data-group="focus-min">' + PL.FOCUS_PRESETS.map(([m, l], i) => '<button class="chip ' + (i === 0 ? 'on' : '') + '" data-act="pick-one" data-val="' + m + '" aria-pressed="' + (i === 0) + '">' + m + ' min · ' + l + '</button>').join('') + '</div></div>' +
        '<label class="field"><span>O minutos personalizados</span><input class="input" id="focus-custom" inputmode="numeric" maxlength="3" placeholder="Ej: 40"></label>' +
        (fh.length ? '<label class="field"><span>Sumar los minutos a un hábito (opcional)</span><select class="select" id="focus-habit"><option value="">No sumar</option>' + fh.map((h) => '<option value="' + h.id + '">' + esc(h.name) + ' (' + esc(h.qtyUnit) + ')</option>').join('') + '</select></label>' : '<p class="tiny faint">Tip: si tenés un hábito con cantidad en minutos (ej. "Leer 30 min"), el enfoque le puede sumar el tiempo.</p>') +
        '<button class="btn primary block" data-act="focus-start">' + icon('play', 'sm') + 'Empezar</button></div>';
      const w = PL.focusStats(st, D.addDays(D.today(), -6), D.today());
      const recent = (st.focusSessions || []).slice(-5).reverse();
      s += '<div class="section"><div class="section-title">Últimos 7 días</div><div class="stat-grid"><div class="stat"><div class="v">' + w.sessions + '</div><div class="k">sesiones</div></div><div class="stat"><div class="v">' + w.minutes + '<small>min</small></div><div class="k">enfocado</div></div></div>' +
        (recent.length ? '<div class="list mt">' + recent.map((r) => '<div class="list-item"><span class="grow small">' + esc(r.label) + '<div class="tiny muted">' + D.shortLabel(D.toKey(new Date(r.startedAt))) + ' · ' + r.minutes + ' de ' + r.planned + ' min' + (r.addedToHabit ? ' · sumado a tu hábito' : '') + '</div></span>' + (r.completed ? icon('check', 'xs red') : '') + '</div>').join('') + '</div>' : '') + '</div>';
      s += '<p class="tiny faint">El enfoque no suma XP por sí mismo (no se premia dejar un temporizador corriendo): si lo vinculás a un hábito, la XP llega al completar ese hábito.</p>';
    }
    return s + '</div>';
  }
  function focusAfter() {
    clearInterval(focusTimer);
    const st = ASC.store.get();
    if (!st.focus) return;
    focusTimer = setInterval(() => {
      const cur = ASC.store.get();
      if (!cur.focus) return clearInterval(focusTimer);
      const rem = PL.focusRemaining(cur);
      const el = document.getElementById('focus-clock');
      if (el) el.textContent = D.clock(rem);
      if (rem <= 0) {
        clearInterval(focusTimer);
        const rec = PL.finishFocus(cur, true);
        ASC.app.commit();
        ASC.app.notify('Bloque de enfoque terminado', rec.label + ' · ' + rec.minutes + ' min' + (rec.addedToHabit ? ' sumados a tu hábito' : ''));
        if (ASC.sound) ASC.sound.play('complete');
      }
    }, 1000);
  }

  /* =========================================================
   * Recuperación
   * ========================================================= */
  function recoveryCard(st, today) {
    const R = ASC.recovery;
    const act = R.active(st, today);
    if (act) {
      const p = R.progress(st, act, today);
      const names = act.keyHabits.map((id) => (st.habits.find((h) => h.id === id) || {}).name).filter(Boolean);
      return '<div class="card recovery on"><div class="row between"><b>Plan para retomar</b><span class="badge">Día ' + Math.min(p.daysElapsed, act.days) + ' de ' + act.days + '</span></div>' +
        '<p class="small muted" style="margin:6px 0 10px">Foco en: ' + esc(names.join(', ') || 'tus hábitos clave') + '. ' + (p.daysWithAny ? p.daysWithAny + (p.daysWithAny === 1 ? ' día' : ' días') + ' con avance: eso es lo que cuenta.' : 'Hoy alcanza con el mínimo.') + '</p>' +
        '<div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn ghost sm" data-act="rec-end">Terminar el plan</button></div></div>';
    }
    const d = R.detect(st, today);
    if (!d.suggest) return '';
    return '<div class="card recovery"><b>¿Retomamos de a poco?</b><p class="small muted" style="margin:6px 0 12px">Los últimos días vinieron más flojos. Pasa: lo importante es volver, no tener una racha perfecta. Si querés, armamos un plan corto con lo esencial.</p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn primary sm" data-act="rec-open">Armar un plan</button><button class="btn ghost sm" data-act="rec-dismiss">Ahora no</button></div></div>';
  }
  let recDraft = null;
  function recoveryForm() {
    const st = ASC.store.get();
    const today = D.today();
    const R = ASC.recovery;
    const habits = st.habits.filter((h) => !h.archivedAt && h.kind !== 'negative' && !H.pausedNow(h, today));
    if (!recDraft) recDraft = { keyHabits: R.suggestKeyHabits(st, today), pauseOthers: false, reduce: true, obstacles: [], days: 7, note: '' };
    const qty = habits.filter((h) => recDraft.keyHabits.includes(h.id) && h.kind === 'quantity');
    return '<p class="small muted" style="margin-top:-4px">Un plan de unos días para volver a arrancar. Todo es opcional y se deshace solo al terminar.</p>' +
      '<div class="field"><span>1. Elegí hasta 3 hábitos clave</span><div class="chips" data-group="rec-keys">' + habits.map((h) => '<button class="chip ' + (recDraft.keyHabits.includes(h.id) ? 'on' : '') + '" data-act="rec-key" data-id="' + h.id + '" aria-pressed="' + recDraft.keyHabits.includes(h.id) + '">' + esc(h.icon || '') + ' ' + esc(h.name) + '</button>').join('') + '</div></div>' +
      '<div class="card row between" style="margin-bottom:12px"><div><b class="small">2. Pausar el resto durante el plan</b><div class="tiny muted">No cuentan como incumplidos. Vuelven solos al terminar.</div></div><button class="switch ' + (recDraft.pauseOthers ? 'on' : '') + '" data-act="rec-flag" data-k="pauseOthers" aria-pressed="' + recDraft.pauseOthers + '" aria-label="Pausar el resto de los hábitos"></button></div>' +
      (qty.length ? '<div class="card row between" style="margin-bottom:12px"><div><b class="small">3. Bajar los mínimos a la mitad</b><div class="tiny muted">' + qty.map((h) => esc(h.name) + ': ' + ASC.homeHelpers.fmtQty(H.effectiveMin(h, today)) + ' → ' + ASC.homeHelpers.fmtQty(R.reducedMin(h, today)) + ' ' + esc(h.qtyUnit || '')).join(' · ') + '</div></div><button class="switch ' + (recDraft.reduce ? 'on' : '') + '" data-act="rec-flag" data-k="reduce" aria-pressed="' + recDraft.reduce + '" aria-label="Bajar los mínimos"></button></div>' : '<p class="tiny faint">3. En hábitos de sí o no, el mínimo es hacerlo aunque sea un poco: dos minutos también cuentan.</p>') +
      '<div class="field"><span>4. ¿Qué te está costando? <span class="muted">(opcional)</span></span><div class="chips" data-group="rec-obs">' + R.OBSTACLES.map(([id, l]) => '<button class="chip ' + (recDraft.obstacles.includes(id) ? 'on' : '') + '" data-act="rec-obs" data-id="' + id + '" aria-pressed="' + recDraft.obstacles.includes(id) + '">' + l + '</button>').join('') + '</div>' +
      (recDraft.obstacles.length ? '<div class="stack" style="gap:6px;margin-top:10px">' + recDraft.obstacles.map((id) => '<div class="tiny" style="color:#d8d8dd">' + icon('note', 'xs red') + ' ' + esc(R.OBSTACLES.find((o) => o[0] === id)[2]) + '</div>').join('') + '</div>' : '') + '</div>' +
      '<div class="field"><span>5. Duración</span><div class="chips" data-group="rec-days">' + [5, 7, 14].map((n) => '<button class="chip ' + (recDraft.days === n ? 'on' : '') + '" data-act="rec-days" data-n="' + n + '" aria-pressed="' + (recDraft.days === n) + '">' + n + ' días</button>').join('') + '</div></div>' +
      '<p class="tiny faint">Para reorganizar horarios, editá cada hábito clave (momento del día y recordatorio) cuando quieras.</p>' +
      '<button class="btn primary block" data-act="rec-start"' + (recDraft.keyHabits.length ? '' : ' disabled') + '>Empezar el plan</button>';
  }
  function paintRecovery(el) {
    const sh = el.closest('.sheet');
    if (sh) sh.querySelector('.sheet-body').innerHTML = recoveryForm();
  }

  /* =========================================================
   * Desafío mensual y recompensas
   * ========================================================= */
  function monthlyCard(st, today) {
    const RW = ASC.rewards;
    const mk = RW.monthKey(today);
    const p = RW.progress(st, mk, today);
    const mlabel = D.MESES[Number(mk.slice(5)) - 1];
    if (!p) return '<div class="card row between"><div><b class="small">Desafío de ' + mlabel + '</b><div class="tiny muted">Elegí una meta para el mes y ganá hasta ' + ASC.XP.monthly.total + ' XP.</div></div><button class="btn ghost sm" data-act="month-pick">Elegir</button></div>';
    return '<div class="card monthly' + (p.met ? ' met' : '') + '"><div class="row between"><b class="small">Desafío de ' + mlabel + '</b><span class="badge ' + (p.met ? 'red' : '') + '">' + (p.met ? 'Cumplido · +' + p.xp + ' XP' : p.daysLeft + ' días restantes') + '</span></div>' +
      '<div class="small muted" style="margin:6px 0 8px">' + esc(p.label) + ': <b style="color:var(--text)">' + p.value + ' de ' + p.target + '</b></div>' +
      '<div class="bar-track"><div class="bar-fill" style="width:' + Math.round(Math.min(1, p.value / p.target) * 100) + '%"></div></div>' +
      (p.final || p.met ? '' : '<button class="link tiny mt" data-act="month-pick">Cambiar desafío</button>') + '</div>';
  }
  function monthPicker() {
    const st = ASC.store.get();
    const today = D.today();
    const RW = ASC.rewards;
    const mk = RW.monthKey(today);
    const types = Object.keys(ASC.XP.monthlyTargets);
    const body = '<p class="small muted" style="margin-top:-4px">Un desafío por mes. La meta se calcula sobre los días del mes; te sugerimos un nivel según tu mes anterior.</p>' + types.map((type) => {
      const cfg = ASC.XP.monthlyTargets[type];
      const sug = RW.suggestTier(st, type, today);
      return '<div class="card" style="margin-bottom:10px"><b class="small">' + esc(cfg.label) + '</b><div class="row mt" style="gap:8px;flex-wrap:wrap">' + ['suave', 'firme', 'total'].map((tier) =>
        '<button class="btn ' + (tier === sug ? 'primary' : 'ghost') + ' sm" data-act="month-set" data-type="' + type + '" data-tier="' + tier + '">' + tier.charAt(0).toUpperCase() + tier.slice(1) + ' · ' + RW.targetFor(type, tier, mk) + ' · +' + ASC.XP.monthly[tier] + ' XP</button>').join('') + '</div></div>';
    }).join('');
    ASC.ui.sheet({ title: 'Desafío del mes', autofocus: false, body });
  }

  function rewardsSection(st) {
    const RW = ASC.rewards;
    const list = st.rewards || [];
    let s = '<div class="section"><div class="section-title">Recompensas <button class="link small" data-act="reward-new">Nueva</button></div>';
    if (!list.length) return s + '<div class="card small muted">Definí premios para vos: "cuando llegue al nivel 10, me compro unas zapatillas". Se desbloquean con tu progreso real.</div></div>';
    s += '<div class="list">' + list.map((r) => {
      const un = RW.rewardUnlocked(st, r);
      return '<div class="list-item reward ' + (un ? 'unlocked' : '') + '"><span class="ex-avatar">' + icon(un ? 'gift' : 'lock', 'sm') + '</span><span class="grow"><b class="small">' + esc(r.title) + '</b><div class="tiny muted">' + esc(RW.rewardLabel(r)) + (r.claimedAt ? ' · canjeada el ' + D.shortLabel(r.claimedAt) : un ? ' · ¡desbloqueada!' : '') + '</div></span>' +
        (un && !r.claimedAt ? '<button class="btn primary sm" data-act="reward-claim" data-id="' + r.id + '">Canjear</button>' : '') + '<button class="icon-btn mini" data-act="reward-del" data-id="' + r.id + '" aria-label="Eliminar recompensa ' + esc(r.title) + '">' + icon('trash', 'xs') + '</button></div>';
    }).join('') + '</div>';
    return s + '</div>';
  }

  /* =========================================================
   * Ánimo del día
   * ========================================================= */
  function moodRow(st, today) {
    if (st.settings.wellbeing === false) return '';
    const W = ASC.wellbeing;
    const cur = (st.moodLog || {})[today];
    return '<div class="card mood-row"><div class="row between" style="gap:10px;flex-wrap:wrap"><span class="small" style="font-weight:600">¿Cómo te sentís hoy?</span><div class="mood-pick" role="group" aria-label="Ánimo de hoy">' +
      W.MOODS.map(([e, l], i) => '<button class="' + (cur && cur.mood === i + 1 ? 'on' : '') + '" data-act="mood-set" data-v="' + (i + 1) + '" aria-pressed="' + !!(cur && cur.mood === i + 1) + '" aria-label="' + l + '">' + e + '</button>').join('') + '</div></div></div>';
  }

  /* =========================================================
   * Acciones
   * ========================================================= */
  Object.assign(ASC.actions, {
    'hr-new': (el) => openRoutineForm(Object.assign(PL.newRoutine((el && el.dataset.slot) || 'manana'), { _isNew: true })),
    'hr-edit': (el) => openRoutineForm(ASC.store.get().habitRoutines.find((r) => r.id === el.dataset.id)),
    'hr-add-habit': (el) => {
      const sh = el.closest('.sheet'); readRoutineFields(sh);
      const id = sh.querySelector('#hr-habit').value;
      if (!id) return ASC.ui.fieldError(sh.querySelector('#hr-habit'), 'Elegí un hábito.');
      hrDraft.items.push({ id: ASC.store.uid(), type: 'habit', habitId: id });
      paintRoutineForm(sh);
    },
    'hr-add-act': (el) => {
      const sh = el.closest('.sheet'); readRoutineFields(sh);
      const t = sh.querySelector('#hr-act').value.trim();
      if (!t) return ASC.ui.fieldError(sh.querySelector('#hr-act'), 'Escribí la actividad.');
      hrDraft.items.push({ id: ASC.store.uid(), type: 'activity', title: t, minutes: Math.min(600, Number(sh.querySelector('#hr-min').value) || 0) || null });
      paintRoutineForm(sh);
    },
    'hr-move': (el) => {
      const sh = el.closest('.sheet'); readRoutineFields(sh);
      const i = Number(el.dataset.i), j = i + Number(el.dataset.dir);
      if (j < 0 || j >= hrDraft.items.length) return;
      const tmp = hrDraft.items[i]; hrDraft.items[i] = hrDraft.items[j]; hrDraft.items[j] = tmp;
      paintRoutineForm(sh);
    },
    'hr-remove': (el) => { const sh = el.closest('.sheet'); readRoutineFields(sh); hrDraft.items.splice(Number(el.dataset.i), 1); paintRoutineForm(sh); },
    'hr-save': (el) => {
      const sh = el.closest('.sheet'); readRoutineFields(sh);
      if (!hrDraft.name) return ASC.ui.fieldError(sh.querySelector('#hr-name'), 'Ponele un nombre.');
      const st = ASC.store.get();
      const isNew = hrDraft._isNew;
      delete hrDraft._isNew;
      hrDraft.updatedAt = new Date().toISOString();
      if (isNew) { hrDraft.order = st.habitRoutines.length; st.habitRoutines.push(hrDraft); }
      else st.habitRoutines = st.habitRoutines.map((r) => (r.id === hrDraft.id ? hrDraft : r));
      hrDraft = null;
      ASC.ui.closeTop();
      ASC.app.commit();
      ASC.ui.toast('Rutina guardada.');
    },
    'hr-delete': async () => {
      if (!(await ASC.ui.confirm({ title: '¿Eliminar la rutina?', text: 'Los hábitos que contiene no se borran ni pierden su historial.', ok: 'Eliminar', danger: true }))) return;
      const st = ASC.store.get();
      ASC.merge && ASC.merge.markDeleted(st, hrDraft.id);
      st.habitRoutines = st.habitRoutines.filter((r) => r.id !== hrDraft.id);
      delete st.routineLogs[hrDraft.id];
      hrDraft = null;
      ASC.ui.closeTop();
      ASC.app.commit();
    },
    'hr-activity': (el) => {
      const st = ASC.store.get();
      const on = PL.toggleActivity(st, el.dataset.r, el.dataset.item, el.dataset.date);
      if (on === null) return ASC.ui.toast(ASC.rules.closedMessage(st), 'error');
      if (on) ASC.ui.burst(el);
      ASC.app.commit();
    },
    // Tareas
    'task-top': (el) => {
      const st = ASC.store.get();
      if (!PL.toggleTop(st, el.dataset.id)) return ASC.ui.toast('Ya tenés 3 prioridades. Quitá una para sumar otra.', 'error');
      ASC.app.commit();
    },
    'task-move': (el) => { PL.moveTask(ASC.store.get(), el.dataset.id, Number(el.dataset.dir)); ASC.app.commit(); },
    'task-later': (el) => {
      const st = ASC.store.get();
      const t = st.tasks.find((x) => x.id === el.dataset.id);
      t.date = D.addDays(t.date < D.today() ? D.today() : t.date, 1); t.top = false; t.rescheduled = (t.rescheduled || 0) + 1;
      ASC.app.commit();
      ASC.ui.toast('"' + t.title + '" pasó a mañana.');
    },
    'tasks-bring': () => {
      const st = ASC.store.get();
      const today = D.today();
      let n = 0;
      PL.pendingBefore(st, today).forEach((t) => { n += PL.reschedulePending(st, t.date, today); });
      ASC.app.commit();
      ASC.ui.toast(n + (n === 1 ? ' tarea pasada' : ' tareas pasadas') + ' a hoy.');
    },
    // Enfoque
    'focus-open': () => { location.hash = '#/focus'; },
    'focus-start': (el) => {
      const sh = el.closest('.card');
      const pick = sh.querySelector('[data-group="focus-min"] .on');
      const custom = Number(sh.querySelector('#focus-custom').value);
      const hSel = sh.querySelector('#focus-habit');
      const st = ASC.store.get();
      PL.startFocus(st, { minutes: custom > 0 ? custom : pick ? Number(pick.dataset.val) : 25, label: sh.querySelector('#focus-label').value.trim() || 'Enfoque', habitId: hSel ? hSel.value || null : null });
      ASC.app.commit();
    },
    'focus-finish': (el) => {
      const st = ASC.store.get();
      const rec = PL.finishFocus(st, el.dataset.done === '1');
      clearInterval(focusTimer);
      ASC.app.commit();
      if (rec) ASC.ui.toast(rec.minutes + ' min de enfoque' + (rec.addedToHabit ? ' sumados a tu hábito.' : ' registrados.'));
    },
    // Recuperación
    'rec-open': () => { recDraft = null; ASC.ui.sheet({ title: 'Plan para retomar', autofocus: false, body: recoveryForm() }); },
    'rec-dismiss': () => { const st = ASC.store.get(); st.recoveryDismissed = D.today(); ASC.app.commit(); ASC.ui.toast('Listo. Si lo necesitás, lo vas a encontrar en Estadísticas.'); },
    'rec-key': (el) => {
      const id = el.dataset.id;
      if (recDraft.keyHabits.includes(id)) recDraft.keyHabits = recDraft.keyHabits.filter((x) => x !== id);
      else if (recDraft.keyHabits.length < 3) recDraft.keyHabits.push(id);
      else return ASC.ui.toast('Hasta 3 hábitos clave: menos es más para retomar.', 'error');
      paintRecovery(el);
    },
    'rec-flag': (el) => { recDraft[el.dataset.k] = !recDraft[el.dataset.k]; paintRecovery(el); },
    'rec-obs': (el) => { const id = el.dataset.id; recDraft.obstacles = recDraft.obstacles.includes(id) ? recDraft.obstacles.filter((x) => x !== id) : recDraft.obstacles.concat(id); paintRecovery(el); },
    'rec-days': (el) => { recDraft.days = Number(el.dataset.n); paintRecovery(el); },
    'rec-start': () => {
      const st = ASC.store.get();
      ASC.recovery.start(st, recDraft, D.today());
      recDraft = null;
      ASC.ui.closeTop();
      ASC.app.commit();
      ASC.ui.toast('Plan en marcha. Un paso por día alcanza.');
    },
    'rec-end': async () => {
      if (!(await ASC.ui.confirm({ title: '¿Terminar el plan?', text: 'Se reanudan los hábitos que pausó el plan y vuelven tus mínimos normales.', ok: 'Terminar' }))) return;
      const r = ASC.recovery.end(ASC.store.get(), D.today(), 'manual');
      ASC.app.commit();
      if (r) ASC.ui.toast('Plan terminado: ' + r.summary.daysWithAny + ' días con avance. Bien ahí por volver.');
    },
    // Mensual
    'month-pick': () => monthPicker(),
    'month-set': (el) => {
      const st = ASC.store.get();
      const c = ASC.rewards.setChallenge(st, ASC.rewards.monthKey(D.today()), el.dataset.type, el.dataset.tier);
      ASC.ui.closeTop();
      if (!c) return ASC.ui.toast('No se puede cambiar este desafío.', 'error');
      ASC.app.commit();
      ASC.ui.toast('Desafío del mes elegido.');
    },
    // Recompensas
    'reward-new': () => {
      const RW = ASC.rewards;
      ASC.ui.sheet({ title: 'Nueva recompensa', body:
        '<label class="field"><span>¿Qué te vas a regalar?</span><input class="input" id="rw-title" maxlength="60" placeholder="Ej: Zapatillas nuevas"></label>' +
        '<div class="field"><span>Se desbloquea al…</span><div class="chips" data-group="rw-kind">' + RW.REWARD_KINDS.map(([v, l], i) => '<button class="chip ' + (i === 0 ? 'on' : '') + '" data-act="pick-one" data-val="' + v + '" aria-pressed="' + (i === 0) + '">' + l + '</button>').join('') + '</div></div>' +
        '<label class="field"><span>Valor (nivel, número de rango 0–9 o días)</span><input class="input" id="rw-value" inputmode="numeric" maxlength="3" placeholder="10"></label>' +
        '<p class="tiny faint">Rangos: ' + ASC.game.RANKS.map((r, i) => i + ' ' + r.name).join(' · ') + '</p>' +
        '<button class="btn primary block" data-act="reward-save">Guardar</button>' });
    },
    'reward-save': (el) => {
      const sh = el.closest('.sheet');
      const title = sh.querySelector('#rw-title').value.trim();
      const kind = (sh.querySelector('[data-group="rw-kind"] .on') || {}).dataset.val || 'level';
      const value = Number(sh.querySelector('#rw-value').value);
      if (!title) return ASC.ui.fieldError(sh.querySelector('#rw-title'), 'Escribí la recompensa.');
      if (!(value >= 0) || (kind !== 'rank' && value < 1) || (kind === 'rank' && value > 9)) return ASC.ui.fieldError(sh.querySelector('#rw-value'), kind === 'rank' ? 'Un número de rango entre 0 y 9.' : 'Un número mayor a 0.');
      const st = ASC.store.get();
      st.rewards.push({ id: ASC.store.uid(), title, kind, value, createdAt: new Date().toISOString(), claimedAt: null });
      ASC.ui.closeTop();
      ASC.app.commit();
    },
    'reward-claim': (el) => {
      const r = ASC.store.get().rewards.find((x) => x.id === el.dataset.id);
      r.claimedAt = D.today();
      ASC.app.commit();
      ASC.ui.confetti(60);
      ASC.ui.toast('<b>¡Disfrutala!</b> Te la ganaste.', 'xp', true);
    },
    'reward-del': async (el) => {
      if (!(await ASC.ui.confirm({ title: '¿Eliminar la recompensa?', ok: 'Eliminar', danger: true }))) return;
      const st = ASC.store.get();
      st.rewards = st.rewards.filter((x) => x.id !== el.dataset.id);
      ASC.app.commit();
    },
    // Ánimo
    'mood-set': (el) => {
      const st = ASC.store.get();
      const today = D.today();
      const v = Number(el.dataset.v);
      const cur = (st.moodLog || {})[today];
      ASC.wellbeing.setMood(st, today, cur && cur.mood === v ? 0 : v, today);
      ASC.app.commit();
    },
  });

  ASC.screens.focus = { render: focusScreen, after: focusAfter, tab: 'home' };
  ASC.plannerUI = { routinesTab, routineCard, prioritiesSection, recoveryCard, monthlyCard, rewardsSection, moodRow, taskRow };
})(typeof window !== 'undefined' ? window : globalThis);
