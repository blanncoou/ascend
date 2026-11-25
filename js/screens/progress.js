/* ASCEND · Progreso: general, desarrollo personal y gimnasio (separados) */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  const { esc, icon, ring } = ASC.ui;
  const D = ASC.dates;
  const H = ASC.habits;
  const G = ASC.gym;
  const P = ASC.progress;

  function seg(tab) {
    const tabs = [['general', 'Resumen'], ['personal', 'Hábitos'], ['insights', 'Insights'], ['gym', 'Gimnasio']];
    return '<nav class="seg" aria-label="Secciones de estadísticas">' + tabs.map(([id, l]) => '<a href="#/progress?tab=' + id + '" class="' + (tab === id ? 'on' : '') + '"' + (tab === id ? ' aria-current="page"' : '') + '>' + l + '</a>').join('') + '</nav>';
  }

  function render(p, q) {
    const tab = q.tab || 'general';
    let s = '<div class="screen"><div class="head"><div><h1>Estadísticas</h1><div class="sub">Calculadas solo con lo que registraste</div></div></div>' + seg(tab);
    if (tab === 'personal' || tab === 'habits') s += personal();
    else if (tab === 'insights') s += insightsTab();
    else if (tab === 'gym') s += gym();
    else s += general();
    return s + '</div>';
  }

  function general() {
    const st = ASC.store.get();
    const today = D.today();
    const xp = P.xp(st, today);
    const lv = xp.level;
    let s = '<div class="dgrid even"><div class="dcol">' + ASC.habitUI.rankCard(st);
    // Camino de rangos: de idea a disciplina pura
    s += '<div class="section"><div class="section-title">El camino</div><div class="card path">' + ASC.game.RANKS.map((r, i) => {
      const cls = i < lv.rankIndex ? 'done' : i === lv.rankIndex ? 'current' : 'locked';
      return '<div class="path-step ' + cls + '">' + ASC.ui.emblem(i, 56) + '<div class="grow"><div class="row between"><b class="num" style="font-size:20px;text-transform:uppercase">' + esc(r.name) + '</b><span class="tiny muted">Nivel ' + r.from + '+ · ' + ASC.ui.fmtNum(ASC.game.xpForLevel(r.from)) + ' XP</span></div>' +
        '<div class="small ' + (cls === 'locked' ? 'faint' : 'muted') + '">' + esc(r.motto) + '</div>' + (cls === 'current' ? '<div class="tiny red" style="margin-top:4px;font-weight:700">ESTÁS ACÁ</div>' : '') + '</div></div>';
    }).join('') + '</div></div>';
    s += '</div><div class="dcol"><div class="stat-grid mt-lg">' +
      '<div class="stat accent"><div class="v">' + P.consistencyStreak(st, today) + '<small>días</small></div><div class="k">Racha de constancia</div></div>' +
      '<div class="stat"><div class="v">' + P.bestConsistency(st, today) + '<small>días</small></div><div class="k">Mejor racha</div></div>' +
      '<div class="stat"><div class="v">' + P.activeDays(st, today) + '</div><div class="k">Días con actividad</div></div>' +
      '<div class="stat"><div class="v">' + xp.counts.workout + '</div><div class="k">Entrenamientos</div></div></div>';

    // Últimos 14 días combinados
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const k = D.addDays(today, -i);
      const ds = H.dayStatus(st, k, today);
      days.push({ label: D.DIAS_LETRA[D.weekday(k)], value: ds.scheduled ? Math.round(ds.pct * 100) : 0, text: ds.scheduled ? Math.round(ds.pct * 100) : '', gym: G.workedOutOn(st, k) });
    }
    s += '<div class="section"><div class="section-title">Últimos 14 días</div><div class="card">' + ASC.ui.barChart(days, { max: 100, label: 'Cumplimiento diario de hábitos', height: 140 }) +
      '<div class="week" style="grid-template-columns:repeat(14,1fr);margin-top:6px">' + days.map((d) => '<div class="center" style="color:' + (d.gym ? 'var(--red)' : 'transparent') + '">' + icon('dumbbell', 'xs') + '</div>').join('') + '</div>' +
      '<div class="tiny muted mt">Barras: % de hábitos cumplidos. ' + icon('dumbbell', 'xs red').replace('class="icon', 'style="display:inline;vertical-align:-3px" class="icon') + ' días con entrenamiento.</div></div></div>';

    // Logros
    const ach = P.achievements(st, today);
    s += '<div class="section"><div class="section-title">Logros <span class="small muted">' + ach.filter((a) => a.unlocked).length + '/' + ach.length + '</span></div><div class="ach-grid">' +
      ach.map((a) => { const when = st.achievementsSeen[a.key]; const d = a.unlocked && typeof when === 'string' && /^\d{4}-/.test(when) ? D.shortLabel(D.toKey(new Date(when))) + ' ' + when.slice(0, 4) : ''; return '<div class="ach ' + (a.unlocked ? 'on' : '') + '"><div class="m">' + icon(a.unlocked ? 'trophy' : 'lock', 'sm') + '</div><b>' + esc(a.title) + '</b><span>' + esc(a.desc) + '</span>' + (d ? '<span class="tiny red" style="margin-top:4px">Desbloqueado el ' + d + '</span>' : '') + '</div>'; }).join('') + '</div></div>';
    s += '<div class="section"><div class="section-title">Desafío del mes</div>' + ASC.plannerUI.monthlyCard(st, today) + '</div>';
    s += ASC.plannerUI.rewardsSection(st);
    s += ASC.plannerUI.recoveryCard(st, today) ? '<div class="section">' + ASC.plannerUI.recoveryCard(st, today) + '</div>' : '<div class="section"><button class="btn ghost block" data-act="rec-open">' + icon('refresh', 'sm') + 'Armar un plan para retomar la constancia</button></div>';

    // Reglas de XP transparentes
    s += '<div class="section"><div class="section-title">Cómo sumás XP <a class="link small" href="#/xp-rules">Ver todas las reglas</a></div><div class="list">' + xp.breakdown.map((r) =>
      '<div class="list-item"><span class="grow small">' + esc(r.label) + '<div class="tiny muted">' + (r.points ? r.count + ' × ' + r.points + ' XP' : r.count + ' en total (XP variable)') + '</div></span><b class="num" style="font-size:18px">' + ASC.ui.fmtNum(r.total) + '</b></div>').join('') + '</div>' +
      '<p class="tiny faint mt">Desmarcar un hábito descuenta lo que había sumado. Descansar nunca resta XP. Pasar del nivel N al siguiente requiere 50 + 25 × (N − 1) XP. Los primeros rangos llegan rápido; Disciplina pura pide alrededor de un año de constancia.</p></div>';
    return s + '</div></div>';
  }

  /* ---------- Insights (v3) ---------- */
  function insightsTab() {
    const st = ASC.store.get();
    const today = D.today();
    const I = ASC.insights;
    const list = I.generate(st, today);
    let s = '<p class="small muted" style="margin-top:0">Observaciones calculadas con tus registros. Cuando hay pocos datos no sacamos conclusiones, y una relación entre dos cosas no significa que una cause la otra.</p>';
    s += list.length ? '<div class="card-grid">' + list.map((x) => '<div class="card insight-card"><div class="row" style="gap:10px;align-items:flex-start"><span class="ex-avatar">' + icon(x.icon, 'sm') + '</span><div><b class="small">' + esc(x.title) + '</b><p class="small" style="margin:4px 0 6px;color:#d8d8dd">' + esc(x.text) + '</p><div class="tiny faint">' + esc(x.basis) + '</div></div></div></div>').join('') + '</div>'
      : '<div class="card small muted">Todavía no hay suficientes datos para observaciones confiables. Con unas semanas de registros van a aparecer acá.</div>';
    // Ánimo y hábitos
    const mv = ASC.wellbeing.moodVsHabits(st, today);
    s += '<div class="section"><div class="section-title">Ánimo y hábitos</div>';
    if (!mv.rows.length) s += '<div class="card small muted">Registrá tu ánimo en Inicio o en el Diario. Hace falta al menos ' + mv.need + ' días con y ' + mv.need + ' sin cada hábito para comparar (llevás ' + mv.moodDays + ' días con ánimo en los últimos 90).</div>';
    else s += '<div class="card"><div class="list">' + mv.rows.slice(0, 6).map((r) => '<div class="list-item"><span class="grow small">' + esc(r.habit.name) + '<div class="tiny muted">' + r.withN + ' días con · ' + r.withoutN + ' sin</div></span><span class="small">' + r.withAvg.toFixed(1).replace('.', ',') + ' vs ' + r.withoutAvg.toFixed(1).replace('.', ',') + '</span></div>').join('') + '</div><p class="tiny faint mt">Ánimo promedio (1 a 5) en días en que lo hiciste vs. días programados en que no. Es una asociación: puede haber otras explicaciones (por ejemplo, que los días buenos te den ganas de hacerlo).</p></div>';
    s += '</div>';
    return s;
  }

  /** Comparación con el período anterior, consistencia por hábito y día de la semana */
  function advancedBlock(st, today) {
    const I = ASC.insights;
    const pct = (p) => (p === null || p === undefined ? '—' : Math.round(p * 100) + '%');
    const end = D.addDays(today, -1);
    const c30 = I.comparePeriods(st, D.addDays(end, -29), end, today);
    const c7 = I.comparePeriods(st, D.addDays(end, -6), end, today);
    const delta = (c) => (c.enough ? '<span class="' + (c.delta >= 0 ? 'red' : 'muted') + '">' + (c.delta >= 0 ? '+' : '−') + Math.abs(Math.round(c.delta * 100)) + ' pts</span>' : '<span class="muted">sin datos suficientes</span>');
    let s = '<div class="section"><div class="section-title">Comparación entre períodos</div><div class="stat-grid">' +
      '<div class="stat"><div class="v">' + pct(c7.current.avg) + '</div><div class="k">Últimos 7 días</div><div class="tiny">vs ' + pct(c7.previous.avg) + ' · ' + delta(c7) + '</div></div>' +
      '<div class="stat"><div class="v">' + pct(c30.current.avg) + '</div><div class="k">Últimos 30 días</div><div class="tiny">vs ' + pct(c30.previous.avg) + ' · ' + delta(c30) + '</div></div></div></div>';
    const wd = I.weekdayTrend(st, today);
    s += '<div class="section"><div class="section-title">Por día de la semana</div><div class="card">' + ASC.ui.barChart([1, 2, 3, 4, 5, 6, 0].map((d) => { const a = wd.all[d]; return { label: D.DIAS_LETRA[d], value: a.avg === null ? 0 : Math.round(a.avg * 100), text: a.avg === null ? '' : Math.round(a.avg * 100) }; }), { max: 100, label: 'Cumplimiento promedio por día de la semana', height: 130 }) +
      '<div class="tiny muted mt">Promedio de las últimas 12 semanas (% real, con cantidades parciales).' + (wd.enough ? '' : ' Todavía hay pocos datos por día.') + '</div></div></div>';
    const hc = I.habitConsistency(st, today, 30);
    if (hc.length) s += '<div class="section"><div class="section-title">Consistencia por hábito <span class="small muted">30 días</span></div><div class="card"><div class="list">' + hc.map((r) =>
      '<div class="list-item" style="display:block"><div class="row between small"><span>' + esc(r.habit.icon || '') + ' ' + esc(r.habit.name) + '</span><span class="muted">' + (r.enough ? Math.round(r.pct * 100) + '% · ' + r.done + '/' + r.scheduled : 'pocos días') + '</span></div><div class="bar-track" style="height:5px;margin-top:6px"><div class="bar-fill" style="width:' + Math.round(r.pct * 100) + '%"></div></div></div>').join('') + '</div></div></div>';
    return s;
  }

  /* ---------- Lo que dicen tus datos ---------- */
  function insightsBlock(st, today) {
    const I = ASC.insights;
    const pct = (x) => Math.round(x * 100) + '%';
    const notEnough = (t) => '<div class="insight muted-insight"><b class="small">' + t + '</b><div class="tiny muted">Todavía no hay suficiente historial para sacar conclusiones.</div></div>';
    let s = '<div class="section"><div class="section-title">Lo que dicen tus datos</div><div class="card-grid two-col">';
    const wd = I.byWeekday(st, today);
    if (wd.enough) {
      s += '<div class="insight"><div class="tiny red" style="font-weight:800;letter-spacing:1px">DÍAS DE LA SEMANA · 12 SEMANAS</div><div class="wd-bars">' + [1, 2, 3, 4, 5, 6, 0].map((d) => {
        const a = wd.all[d];
        const h = a.pct === null ? 0 : Math.round(a.pct * 100);
        return '<div class="wd-bar ' + (a === wd.best ? 'best' : a === wd.worst ? 'worst' : '') + '"><span style="height:' + Math.max(4, h) + '%"></span><small>' + D.DIAS_LETRA[d] + '</small></div>';
      }).join('') + '</div><div class="small">Tu mejor día es el <b>' + D.DIAS_LARGOS[wd.best.day] + '</b> (' + pct(wd.best.pct) + '); el más difícil, el <b>' + D.DIAS_LARGOS[wd.worst.day] + '</b> (' + pct(wd.worst.pct) + ').</div></div>';
    } else s += notEnough('Días de la semana');
    const rk = I.habitRanking(st, today);
    if (rk.enough) {
      s += '<div class="insight"><div class="tiny red" style="font-weight:800;letter-spacing:1px">ÚLTIMOS 30 DÍAS</div><b class="small">Más constantes</b>' + (rk.top.length ? '' : '<div class="tiny muted" style="margin-top:4px">Ninguno llega todavía al 70 %.</div>') + rk.top.map((r) => '<div class="row between small" style="margin-top:4px"><span>' + esc(r.h.icon) + ' ' + esc(r.h.name) + '</span><b>' + pct(r.s.pct) + '</b></div>').join('') +
        (rk.pending.length ? '<b class="small" style="display:block;margin-top:10px">Suelen quedar pendientes</b>' + rk.pending.map((r) => '<div class="row between small" style="margin-top:4px"><span>' + esc(r.h.icon) + ' ' + esc(r.h.name) + '</span><span class="muted">' + pct(r.s.pct) + '</span></div>').join('') : '<div class="tiny muted" style="margin-top:8px">Ningún hábito quedó por debajo del 70 %.</div>') + '</div>';
    } else s += notEnough('Hábitos más y menos constantes');
    const tr = I.trend(st, today);
    if (tr.enough) {
      const d = Math.round(tr.delta * 100);
      s += '<div class="insight"><div class="tiny red" style="font-weight:800;letter-spacing:1px">CAMBIO EN LA CONSTANCIA</div><div class="num" style="font-size:34px;line-height:1.1">' + (d > 0 ? '+' : '') + d + ' pts</div><div class="small muted">Últimas 4 semanas: ' + pct(tr.recent) + ' · 4 anteriores: ' + pct(tr.previous) + '.</div><div class="small" style="margin-top:6px">' + (d >= 5 ? 'Vas en subida.' : d <= -5 ? 'Bajó un poco: revisá si tus hábitos siguen siendo realistas.' : 'Te mantenés estable.') + '</div></div>';
    } else s += notEnough('Cambio en la constancia');
    const mv = I.moodVsTraining(st);
    if (mv.enough) {
      s += '<div class="insight"><div class="tiny red" style="font-weight:800;letter-spacing:1px">ÁNIMO Y ENTRENAMIENTO</div><div class="row" style="gap:18px;margin:6px 0"><div><div class="num" style="font-size:28px">' + mv.withAvg.toFixed(1) + '</div><div class="tiny muted">días que entrenaste (' + mv.withN + ')</div></div><div><div class="num" style="font-size:28px">' + mv.withoutAvg.toFixed(1) + '</div><div class="tiny muted">días sin entrenar (' + mv.withoutN + ')</div></div></div>' +
        '<div class="tiny muted">Promedio de ánimo del diario (1 a 5). Es una asociación observada en tus registros, no prueba que una cosa cause la otra.</div></div>';
    } else s += '<div class="insight muted-insight"><b class="small">Ánimo y entrenamiento</b><div class="tiny muted">Necesitás al menos ' + mv.need + ' entradas de diario con ánimo en días con entrenamiento y ' + mv.need + ' en días sin (tenés ' + mv.withN + ' y ' + mv.withoutN + ').</div></div>';
    return s + '</div></div>';
  }

  function personal() {
    const st = ASC.store.get();
    const today = D.today();
    if (!st.habits.length) return ASC.ui.emptyState('habits', 'Sin datos todavía', 'Tus estadísticas aparecen cuando empieces a completar hábitos.', 'Crear hábito', 'habit-new');
    const month = H.rangeStats(st, D.addDays(today, -29), today);
    const goalsDone = st.goals.filter((g) => g.status === 'done').length;
    let bestH = null;
    st.habits.filter((h) => h.kind !== 'negative').forEach((h) => { const b = H.bestStreak(st, h, today); if (!bestH || b.value > bestH.b.value) bestH = { h, b }; });
    let s = '<div class="stat-grid">' +
      '<div class="stat accent"><div class="v">' + (month.scheduled ? Math.round(month.pct * 100) : 0) + '<small>%</small></div><div class="k">Cumplimiento 30 días</div></div>' +
      '<div class="stat"><div class="v">' + H.allCompletions(st) + '</div><div class="k">Hábitos completados</div></div>' +
      '<div class="stat"><div class="v">' + (bestH ? bestH.b.value : 0) + '<small>' + (bestH && bestH.b.unit === 'semanas' ? 'sem' : 'días') + '</small></div><div class="k">Mejor racha' + (bestH && bestH.b.value ? ' · ' + esc(bestH.h.name) : '') + '</div></div>' +
      '<div class="stat"><div class="v">' + goalsDone + '<small>/' + st.goals.length + '</small></div><div class="k">Objetivos cumplidos</div></div></div>';
    s += insightsBlock(st, today);
    s += advancedBlock(st, today);

    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const ws = D.addDays(D.weekStart(today), -7 * i);
      const we = D.addDays(ws, 6) > today ? today : D.addDays(ws, 6);
      const r = H.rangeStats(st, ws, we);
      weeks.push({ label: D.shortLabel(ws), value: r.scheduled ? Math.round(r.pct * 100) : 0, text: r.scheduled ? Math.round(r.pct * 100) + '%' : '' });
    }
    s += '<div class="dgrid even"><div class="dcol"><div class="section"><div class="section-title">Evolución semanal</div><div class="card">' + ASC.ui.barChart(weeks, { max: 100, label: 'Cumplimiento semanal', height: 150 }) + '</div></div></div>';

    const months = [];
    const t = D.fromKey(today);
    for (let i = 5; i >= 0; i--) {
      const first = new Date(t.getFullYear(), t.getMonth() - i, 1, 12);
      const last = new Date(t.getFullYear(), t.getMonth() - i + 1, 0, 12);
      const a = D.toKey(first), b = D.toKey(last) > today ? today : D.toKey(last);
      const r = H.rangeStats(st, a, b);
      months.push({ label: D.MESES_CORTOS[first.getMonth()], value: r.scheduled ? Math.round(r.pct * 100) : 0, text: r.scheduled ? Math.round(r.pct * 100) + '%' : '' });
    }
    s += '<div class="dcol"><div class="section"><div class="section-title">Evolución mensual</div><div class="card">' + ASC.ui.barChart(months, { max: 100, label: 'Cumplimiento mensual', height: 150 }) + '</div></div></div></div>';

    s += '<div class="section"><div class="section-title">Por hábito · 30 días</div><div class="card">' + st.habits.filter((h) => !h.archivedAt && h.kind !== 'negative').map((h) => {
      const r = H.habitRangeStats(st, h, D.addDays(today, -29), today);
      const c = H.currentStreak(st, h, today);
      return '<a href="#/habit/' + h.id + '" style="display:block;padding:8px 0"><div class="row between small"><span>' + esc(h.icon) + ' ' + esc(h.name) + '</span><span class="muted">' + (r.scheduled ? Math.round(r.pct * 100) + '%' : '—') + ' · ' + icon('flame', 'xs red').replace('class="icon', 'style="display:inline;vertical-align:-2px" class="icon') + ' ' + c.value + '</span></div><div class="bar-track mt" style="margin-top:6px;height:6px"><div class="bar-fill" style="width:' + Math.round(r.pct * 100) + '%"></div></div></a>';
    }).join('') + '</div></div>';
    return s;
  }

  function gym() {
    const st = ASC.store.get();
    const today = D.today();
    const all = G.completedSessions(st);
    if (!all.length && !st.bodyMetrics.length) return ASC.ui.emptyState('dumbbell', 'Sin entrenamientos registrados', 'Finalizá tu primer entrenamiento para ver frecuencia, tiempo y récords.', 'Entrenar', 'workout-pick');
    const totalMs = all.reduce((a, x) => a + G.sessionStats(x).durationMs, 0);
    const last4 = G.workoutsInRange(st, D.addDays(D.weekStart(today), -21), today).count;
    let s = '<div class="stat-grid">' +
      '<div class="stat accent"><div class="v">' + all.length + '</div><div class="k">Entrenamientos</div></div>' +
      '<div class="stat"><div class="v">' + Math.round(totalMs / 36e5 * 10) / 10 + '<small>h</small></div><div class="k">Tiempo entrenado</div></div>' +
      '<div class="stat"><div class="v">' + Math.round((last4 / 4) * 10) / 10 + '</div><div class="k">Por semana (últimas 4)</div></div>' +
      '<div class="stat"><div class="v">' + G.totalPRs(st) + '</div><div class="k">Récords superados</div></div></div>';
    const wk = [], tm = [];
    for (let i = 7; i >= 0; i--) {
      const ws = D.addDays(D.weekStart(today), -7 * i);
      const r = G.workoutsInRange(st, ws, D.addDays(ws, 6));
      wk.push({ label: D.shortLabel(ws), value: r.count, text: r.count || '' });
      const min = Math.round(r.ms / 60000);
      tm.push({ label: D.shortLabel(ws), value: min, text: min ? min : '' });
    }
    if (all.length) {
      s += '<div class="dgrid even"><div class="dcol"><div class="section"><div class="section-title">Frecuencia semanal</div><div class="card">' + ASC.ui.barChart(wk, { label: 'Entrenamientos por semana', height: 130 }) + '</div></div></div>';
      s += '<div class="dcol"><div class="section"><div class="section-title">Minutos por semana</div><div class="card">' + ASC.ui.barChart(tm, { label: 'Minutos entrenados por semana', height: 130 }) + '</div></div></div></div>';
      const ids = new Set();
      all.forEach((x) => x.exercises.forEach((e) => { if (G.doneSets(e).length) ids.add(e.exerciseId); }));
      const recs = Array.from(ids).map((id) => ({ id, ex: G.getExercise(st, id), r: G.records(st, id) })).filter((x) => x.ex && x.r.maxWeight).sort((a, b) => b.r.sessions - a.r.sessions).slice(0, 8);
      s += '<div class="section"><div class="section-title">Mejores marcas</div><div class="list">' + recs.map((x) =>
        '<a class="list-item" href="#/exercise/' + x.id + '"><span class="grow"><b class="small">' + esc(x.ex.name) + '</b><div class="tiny muted">' + x.r.sessions + ' sesiones registradas</div></span><span class="badge red">' + (x.r.maxWeight.weight > 0 ? x.r.maxWeight.weight + ' kg × ' + x.r.maxWeight.reps : x.r.maxReps.reps + ' reps') + '</span></a>').join('') + '</div></div>';
    }
    const m = st.bodyMetrics.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
    if (m.length >= 2) s += '<div class="section"><div class="section-title">Peso corporal</div><div class="card">' + ASC.ui.lineChart(m.slice(-15).map((x) => ({ label: D.shortLabel(x.date), value: Number(x.weight) })), { label: 'Peso corporal' }) + '</div></div>';
    return s;
  }

  /* ---------- Reglas de XP (desde la configuración central) ---------- */
  function xpRules() {
    const X = ASC.XP;
    const row = (a, b, c) => '<div class="list-item"><span class="grow small">' + a + (c ? '<div class="tiny muted">' + c + '</div>' : '') + '</span><b class="small">' + b + '</b></div>';
    let s = '<div class="screen"><div class="head"><a class="icon-btn" href="#/progress" aria-label="Volver">' + icon('chevL') + '</a><div><h1>Cómo se gana XP</h1><div class="sub">Reglas generadas desde la configuración</div></div></div>';
    s += '<div class="section"><div class="section-title">Cada día</div><div class="list">' +
      row('Hábito completado', '+' + X.habit, 'Hasta ' + X.habitDailyCap + ' por día') + row('Día perfecto', '+' + X.perfectDay, 'Todo lo programado, con al menos ' + X.perfectMinHabits + ' hábitos') +
      row('Entrada de diario', '+' + X.journalDay, '1 por día') + row('Entrenamiento terminado', '+' + X.workout, 'Hasta ' + X.workoutDailyCap + ' por día') + row('Récord personal', '+' + X.pr, 'Hasta ' + X.prPerSessionCap + ' por sesión') + '</div></div>';
    s += '<div class="section"><div class="section-title">Objetivos</div><div class="list">' + row('Paso de un objetivo', '+' + X.goalStep) + row('Objetivo cumplido', '+' + X.goal) + '</div></div>';
    s += '<div class="section"><div class="section-title">Cada semana</div><div class="list">' + Object.keys(X.missions).map((k) => row('Misión: ' + k, '+' + X.missions[k])).join('') + Object.keys(X.commitments).map((k) => row('Desafío semanal ' + k, '+' + X.commitments[k])).join('') + '</div></div>';
    s += '<div class="section"><div class="section-title">Cada mes</div><div class="list">' + Object.keys(X.monthly).map((k) => row('Desafío mensual ' + k, '+' + X.monthly[k], 'Uno por mes, se cobra una sola vez')).join('') + '</div></div>';
    s += '<div class="section"><div class="section-title">Una sola vez</div><div class="list">' + X.streakMilestones.map(([d, x]) => row('Racha de ' + d + ' días', '+' + x)).join('') + row('Hábito que sube de maestría', '+' + X.tierUp) + X.negativeMilestones.map(([d, x]) => row(d + ' días sin la conducta a evitar', '+' + x)).join('') + '</div></div>';
    s += '<div class="card small muted mt">La XP no se guarda: se recalcula siempre desde tus registros. Por eso corregir un día no duplica premios, desmarcar descuenta lo sumado y los premios semanales y mensuales quedan fijos cuando cierra el período. Descansar o no cumplir nunca resta XP. El modo enfoque, el ánimo y las recompensas propias no dan XP. Subir del nivel N al siguiente cuesta ' + X.level.base + ' + ' + X.level.step + ' × (N − 1) XP.</div>';
    return s + '</div>';
  }

  ASC.screens.progress = { render, tab: 'progress' };
  ASC.screens['xp-rules'] = { render: xpRules, tab: 'progress' };
})(typeof window !== 'undefined' ? window : globalThis);
