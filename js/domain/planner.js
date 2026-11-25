/* ASCEND · Planificación (lógica pura)
 * - Rutinas de hábitos y actividades (mañana, tarde, noche, personalizadas).
 * - Tareas: 3 prioridades por día, orden manual, reprogramar pendientes.
 * - Modo enfoque: temporizador basado en hora de fin (sobrevive recargas); opcionalmente suma minutos a un hábito.
 * Toda escritura sobre días pasados respeta ASC.rules (ventana de edición).
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  const D = () => ASC.dates;
  const H = () => ASC.habits;
  const uid = () => (ASC.store ? ASC.store.uid() : Math.random().toString(36).slice(2));

  const SLOTS = [['manana', 'Mañana'], ['tarde', 'Tarde'], ['noche', 'Noche'], ['custom', 'Personalizada']];
  const slotLabel = (v) => (SLOTS.find((x) => x[0] === v) || SLOTS[3])[1];

  /* ---------- Rutinas de hábitos ---------- */
  function routineItems(state, r, key) {
    return (r.items || []).map((it) => {
      if (it.type === 'habit') {
        const h = state.habits.find((x) => x.id === it.habitId);
        if (!h || h.archivedAt || h.kind === 'negative') return null;
        const active = H().isActiveOn(h, key);
        return { item: it, habit: h, title: h.name, done: H().isDone(state, h.id, key), applies: active && (H().isScheduled(h, key) || H().isFlexible(h)) };
      }
      const logs = ((state.routineLogs || {})[r.id] || {})[key] || [];
      return { item: it, title: it.title, minutes: it.minutes, done: logs.includes(it.id), applies: true };
    }).filter(Boolean);
  }

  function routineProgress(state, r, key) {
    const items = routineItems(state, r, key).filter((x) => x.applies);
    const done = items.filter((x) => x.done).length;
    return { items, done, total: items.length, pct: items.length ? done / items.length : 0 };
  }

  /** Marca/desmarca una actividad (no hábito). Devuelve el nuevo estado o null si la fecha está cerrada. */
  function toggleActivity(state, routineId, itemId, key, todayKey) {
    if (ASC.rules && !ASC.rules.canEdit(state, key, todayKey)) return null;
    state.routineLogs = state.routineLogs || {};
    const byDay = (state.routineLogs[routineId] = state.routineLogs[routineId] || {});
    const list = byDay[key] || [];
    const on = !list.includes(itemId);
    byDay[key] = on ? list.concat(itemId) : list.filter((x) => x !== itemId);
    if (!byDay[key].length) delete byDay[key];
    return on;
  }

  function routinesForSlot(state, slot) {
    return (state.habitRoutines || []).filter((r) => r.slot === slot).sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  function newRoutine(slot) {
    return { id: uid(), name: slotLabel(slot) === 'Personalizada' ? 'Mi rutina' : 'Rutina de la ' + slotLabel(slot).toLowerCase(), slot, items: [], reminderTime: '', reminderDays: [], order: 0, createdAt: new Date().toISOString() };
  }

  /* ---------- Tareas ---------- */
  const PRIO = { alta: 0, media: 1, baja: 2 };
  function tasksFor(state, key) {
    return state.tasks.filter((t) => t.date === key).sort((a, b) =>
      (a.done - b.done) || ((b.top ? 1 : 0) - (a.top ? 1 : 0)) || ((a.order ?? 999) - (b.order ?? 999)) || (PRIO[a.priority] - PRIO[b.priority]) || String(a.time || '99').localeCompare(String(b.time || '99')));
  }
  const MAX_TOP = 3;
  /** Marca o desmarca como prioridad del día. Devuelve false si ya hay 3. */
  function toggleTop(state, id) {
    const t = state.tasks.find((x) => x.id === id);
    if (!t) return false;
    if (!t.top && state.tasks.filter((x) => x.date === t.date && x.top).length >= MAX_TOP) return false;
    t.top = !t.top;
    t.updatedAt = new Date().toISOString();
    return true;
  }
  /** Mueve una tarea un lugar arriba/abajo dentro de su día */
  function moveTask(state, id, dir) {
    const t = state.tasks.find((x) => x.id === id);
    if (!t) return;
    const list = tasksFor(state, t.date).filter((x) => !x.done);
    list.forEach((x, i) => (x.order = i));
    const i = list.indexOf(t), j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    list[i].order = j; list[j].order = i;
  }
  /** Pasa las tareas pendientes de un día a otro. Devuelve cuántas se movieron. */
  function reschedulePending(state, fromKey, toKey) {
    let n = 0;
    state.tasks.forEach((t) => {
      if (t.date === fromKey && !t.done) { t.date = toKey; t.top = false; t.order = 999; t.rescheduled = (t.rescheduled || 0) + 1; t.updatedAt = new Date().toISOString(); n++; }
    });
    return n;
  }
  function pendingBefore(state, todayKey) {
    return state.tasks.filter((t) => !t.done && t.date < todayKey && t.date >= D().addDays(todayKey, -7));
  }

  /* ---------- Modo enfoque ---------- */
  const FOCUS_PRESETS = [[25, 'Pomodoro'], [50, 'Bloque largo'], [15, 'Arranque corto']];
  function startFocus(state, opts, now) {
    now = now || Date.now();
    const minutes = Math.max(1, Math.min(240, Number(opts.minutes) || 25));
    state.focus = { id: uid(), label: opts.label || 'Enfoque', minutes, startedAt: new Date(now).toISOString(), endsAt: new Date(now + minutes * 60000).toISOString(), habitId: opts.habitId || null, addToHabit: !!opts.habitId };
    return state.focus;
  }
  function focusRemaining(state, now) {
    if (!state.focus) return null;
    return Math.max(0, Math.round((new Date(state.focus.endsAt).getTime() - (now || Date.now())) / 1000));
  }
  /** Termina la sesión. completed=false cuenta solo los minutos reales. Devuelve el registro. */
  function finishFocus(state, completed, now) {
    const f = state.focus;
    if (!f) return null;
    now = now || Date.now();
    const elapsed = Math.min(f.minutes, Math.floor((now - new Date(f.startedAt).getTime()) / 60000));
    const minutes = completed ? f.minutes : elapsed;
    const rec = { id: f.id, label: f.label, minutes, planned: f.minutes, startedAt: f.startedAt, endedAt: new Date(now).toISOString(), habitId: f.habitId, completed: !!completed, addedToHabit: 0 };
    if (f.addToHabit && f.habitId && minutes > 0) {
      const h = state.habits.find((x) => x.id === f.habitId);
      const key = D().today();
      if (h && h.kind === 'quantity' && /min/i.test(h.qtyUnit || '')) {
        const v = H().setQty(state, h.id, key, H().getQty(state, h.id, key) + minutes, key);
        if (v !== null) rec.addedToHabit = minutes;
      }
    }
    state.focusSessions = (state.focusSessions || []).concat(rec).slice(-500);
    state.focus = null;
    return rec;
  }
  function focusStats(state, from, to) {
    const list = (state.focusSessions || []).filter((s) => { const k = D().toKey(new Date(s.startedAt)); return k >= from && k <= to; });
    return { sessions: list.length, minutes: list.reduce((a, s) => a + (s.minutes || 0), 0) };
  }
  /** Hábitos que pueden recibir minutos del modo enfoque */
  function focusHabits(state) {
    return state.habits.filter((h) => !h.archivedAt && h.kind === 'quantity' && /min/i.test(h.qtyUnit || ''));
  }

  ASC.planner = {
    SLOTS, slotLabel, routineItems, routineProgress, toggleActivity, routinesForSlot, newRoutine,
    tasksFor, toggleTop, moveTask, reschedulePending, pendingBefore, MAX_TOP,
    FOCUS_PRESETS, startFocus, focusRemaining, finishFocus, focusStats, focusHabits,
  };
})(typeof window !== 'undefined' ? window : globalThis);
