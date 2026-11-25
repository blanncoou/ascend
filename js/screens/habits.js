/* ASCEND · Hábitos, calendario, objetivos y diario
 * Hábitos (recurrentes), tareas (puntuales, en Inicio) y objetivos (largo plazo) viven en listas separadas.
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  const { esc, icon } = ASC.ui;
  const D = ASC.dates;
  const H = ASC.habits;

  const EMOJIS = ['💧', '📖', '📚', '🏋️', '🚶', '🧘', '⏰', '😴', '🥗', '📵', '🧠', '✍️', '🎯', '🧹', '💰', '🎧', '☀️', '🏃', '🚴', '🧴', '💊', '🗓️', '🎸', '✨'];
  const COLORS = ['#F04459', '#ff7a1a', '#ffc21a', '#3ddc84', '#1ec8ff', '#5b7cff', '#b45bff', '#ff4fa3'];
  const MOODS = [['😞', 'Muy mal'], ['😕', 'Mal'], ['😐', 'Normal'], ['🙂', 'Bien'], ['😄', 'Muy bien']];
  const HORIZONS = { corto: 'Corto plazo', mediano: 'Mediano plazo', largo: 'Largo plazo' };

  function seg(tab) {
    const tabs = [['today', 'Hoy'], ['week', 'Semana'], ['routines', 'Rutinas'], ['calendar', 'Calendario'], ['goals', 'Objetivos'], ['journal', 'Diario']];
    return '<nav class="seg" aria-label="Secciones de hábitos">' + tabs.map(([id, l]) => '<a href="#/habits?tab=' + id + '" class="' + (tab === id ? 'on' : '') + '"' + (tab === id ? ' aria-current="page"' : '') + '>' + l + '</a>').join('') + '</nav>';
  }

  /* ---------- Render principal ---------- */
  function render(params, q) {
    const tab = q.tab || 'week';
    if (tab !== 'journal') journalRevealed = false;
    let s = '<div class="screen"><div class="head"><div><h1>Hábitos</h1><div class="sub">Constancia, objetivos y reflexión</div></div></div>' + seg(tab);
    if (tab === 'calendar') s += calendarTab(q);
    else if (tab === 'goals') s += goalsTab();
    else if (tab === 'journal') s += journalTab();
    else if (tab === 'today') s += todayTab(q);
    else if (tab === 'routines') s += ASC.plannerUI.routinesTab();
    else s += weekTab();
    const fab = { week: 'habit-new', today: 'habit-new', calendar: 'habit-new', goals: 'goal-new', journal: 'journal-new', routines: 'hr-new' }[tab];
    const fabLabel = { week: 'Nuevo hábito', today: 'Nuevo hábito', calendar: 'Nuevo hábito', goals: 'Nuevo objetivo', journal: 'Nueva entrada', routines: 'Nueva rutina' }[tab];
    s += '<button class="fab" data-act="' + fab + '" aria-label="' + fabLabel + '">' + icon('plus') + '</button>';
    return s + '</div>';
  }

  function todayTab(q) {
    const st = ASC.store.get();
    const today = D.today();
    const active = st.habits.filter((h) => !h.archivedAt);
    const archived = st.habits.filter((h) => h.archivedAt);
    let s = '';
    if (!active.length) {
      s += ASC.ui.emptyState('habits', 'Sin hábitos todavía', 'Creá un hábito con su frecuencia. Solo cuenta los días en que está programado.', 'Crear hábito', 'habit-new');
    } else {
      const tp = H.todayProgress(st, today);
      s += '<div class="card row" style="margin-bottom:14px"><div class="grow"><div class="small muted">Hoy</div><div class="num" style="font-size:26px">' + tp.done + ' / ' + tp.total + '</div></div><div style="width:55%"><div class="bar-track"><div class="bar-fill" style="width:' + Math.round(tp.pct * 100) + '%"></div></div><div class="tiny muted mt" style="text-align:right">' + Math.round(tp.pct * 100) + '% completado</div></div></div>';
      s += tp.list.length ? '<div class="hgrid">' + tp.list.map((h) => ASC.homeHelpers.habitRow(st, h, today)).join('') + '</div>' : '<div class="card small muted">Nada programado para hoy.</div>';
      const negs = active.filter((h) => h.kind === 'negative');
      if (negs.length) s += '<div class="section"><div class="section-title">Evitando</div><div class="card-grid two-col">' + negs.map((h) => ASC.homeHelpers.negativeRow(st, h)).join('') + '</div></div>';
      const paused = active.filter((h) => H.pausedNow(h, today));
      const notToday = active.filter((h) => h.kind !== 'negative' && !tp.list.includes(h) && !H.pausedNow(h, today));
      if (notToday.length) {
        s += '<div class="section"><div class="section-title">Otros días</div><div class="list">' + notToday.map((h) =>
          '<a class="list-item" href="#/habit/' + h.id + '"><span class="h-icon" style="background:' + h.color + '22;width:36px;height:36px">' + esc(h.icon) + '</span><span class="grow"><b class="small">' + esc(h.name) + '</b><div class="tiny muted">' + esc(H.frequencyLabel(h)) + (H.isFlexible(h) ? ' · meta del período cumplida' : '') + '</div></span>' + icon('chevR', 'sm chev') + '</a>').join('') + '</div></div>';
      }
      if (paused.length) {
        s += '<div class="section"><div class="section-title">En pausa <span class="small muted">' + paused.length + '</span></div><div class="list">' + paused.map((h) => {
          const p = H.pausedNow(h, today);
          return '<div class="list-item"><span class="h-icon" style="background:var(--surface-3);width:36px;height:36px">' + esc(h.icon) + '</span><a class="grow" href="#/habit/' + h.id + '"><b class="small">' + esc(h.name) + '</b><div class="tiny muted">' + (p.to ? 'Vuelve el ' + esc(D.shortLabel(p.to)) : 'Hasta que lo reanudes') + ' · no cuenta como incumplido</div></a><button class="btn ghost sm" data-act="habit-resume" data-id="' + h.id + '">Reanudar</button></div>';
        }).join('') + '</div></div>';
      }
    }
    if (archived.length) {
      s += '<div class="section"><div class="section-title">Archivados <span class="small muted">' + archived.length + '</span></div><div class="list">' + archived.map((h) =>
        '<a class="list-item" href="#/habit/' + h.id + '"><span class="h-icon" style="background:var(--surface-3);width:36px;height:36px;opacity:.6">' + esc(h.icon) + '</span><span class="grow muted small">' + esc(h.name) + '</span>' + icon('chevR', 'sm chev') + '</a>').join('') + '</div></div>';
    }
    return s;
  }

  /* ---------- Semana: el juego ---------- */
  const GM = ASC.game;

  /** Tarjeta de rango reutilizable (Semana, Inicio, Progreso) */
  function rankCard(st, compact) {
    const x = ASC.progress.xp(st);
    const L = x.level;
    return '<a class="rank-card" href="#/progress?tab=general"><div class="rank-emb">' + ASC.ui.emblem(L.rankIndex, compact ? 64 : 84) + '</div><div class="grow">' +
      '<div class="rank-kicker">Rango ' + (L.rankIndex + 1) + ' de ' + GM.RANKS.length + '</div><div class="rank-title">' + esc(L.rank) + '</div>' +
      '<div class="row between tiny" style="margin-top:8px"><span><b style="color:#fff">Nivel ' + L.level + '</b></span><span class="muted">' + ASC.ui.fmtNum(L.into) + ' / ' + ASC.ui.fmtNum(L.needed) + ' XP</span></div>' +
      '<div class="bar-track" style="height:7px;margin-top:6px"><div class="bar-fill" style="width:' + Math.round(L.pct * 100) + '%"></div></div>' +
      (L.nextRank ? '<div class="tiny muted" style="margin-top:7px">' + ASC.ui.fmtNum(L.xpToNextRank) + ' XP para <b style="color:#fff">' + esc(L.nextRank) + '</b> (nivel ' + L.nextRankLevel + ')</div>' : '<div class="tiny red" style="margin-top:7px">Rango máximo alcanzado</div>') +
      '</div></a>';
  }

  const MISSION_ICON = { habit: 'target', perfect: 'star', active: 'flame', journal: 'book', category: 'habits', gym: 'dumbbell' };

  function weekTab() {
    const st = ASC.store.get();
    const today = D.today();
    const ws = D.weekStart(today), we = GM.weekEnd(ws);
    const hadMissions = !!(st.weeks && st.weeks[ws] && st.weeks[ws].missions);
    const w = GM.ensureWeek(st, ws, today);
    if (!hadMissions) ASC.store.save();
    const habits = st.habits.filter((h) => h.kind !== 'negative' && !h.archivedAt && h.startDate <= we);
    const daysLeft = D.diffDays(today, we) + 1;
    const wxp = GM.weekXP(st, ws, today);

    let s = '<div class="dgrid"><div class="dcol">' + rankCard(st);

    // Encabezado de la semana
    s += '<div class="week-head"><div><div class="tiny muted" style="text-transform:uppercase;letter-spacing:1.5px">Semana</div><div class="num" style="font-size:26px;line-height:1">' + D.shortLabel(ws) + ' – ' + D.shortLabel(we) + '</div></div>' +
      '<div class="center"><div class="num red" style="font-size:30px;line-height:1">+' + ASC.ui.fmtNum(wxp.total) + '</div><div class="tiny muted">XP esta semana</div></div></div>';

    if (!habits.length) {
      return s + '</div><div class="dcol"></div></div>' + ASC.ui.emptyState('target', 'Tu juego empieza acá', 'Creá tus primeros hábitos para desbloquear misiones y el desafío semanal.', 'Crear hábito', 'habit-new');
    }

    // Desafío semanal
    const cp = GM.commitmentProgress(st, ws);
    if (!cp) {
      const preview = GM.scheduledFrom(st, today > ws ? today : ws, ws).scheduled;
      s += '<button class="challenge-cta" data-act="week-plan"><div class="row between"><span class="badge red">' + icon('bolt', 'xs') + 'Desafío semanal</span><span class="tiny muted">Quedan ' + daysLeft + (daysLeft === 1 ? ' día' : ' días') + '</span></div>' +
        '<div class="num" style="font-size:30px;line-height:1;margin:12px 0 6px;text-transform:uppercase">Planificá tu semana</div>' +
        '<div class="small muted">Tenés <b style="color:#fff">' + preview + ' check-ins</b> programados. Elegí tu compromiso y ganá hasta <b class="red">+' + GM.COMMITMENTS.total.xp + ' XP</b>. Si no llegás, no perdés nada.</div>' +
        '<div class="btn primary block mt">Aceptar el desafío</div></button>';
    } else {
      const c = GM.COMMITMENTS[cp.plan.level];
      s += '<div class="challenge ' + (cp.met ? 'met' : '') + '"><div class="row between"><span class="badge red">' + icon('bolt', 'xs') + 'Desafío ' + esc(c.label) + ' · ' + Math.round(c.pct * 100) + '%</span><span class="tiny ' + (cp.met ? 'red' : 'muted') + '">' + (cp.met ? '¡Cumplido!' : 'Quedan ' + daysLeft + (daysLeft === 1 ? ' día' : ' días')) + '</span></div>' +
        '<div class="row" style="gap:16px;margin-top:12px">' + ASC.ui.ring(cp.pct, 92, 9, '<div><b style="font-size:24px">' + cp.done + '</b><span>de ' + cp.target + '</span></div>') +
        '<div class="grow"><div class="num" style="font-size:24px;line-height:1.05;text-transform:uppercase">' + (cp.met ? 'Palabra cumplida' : 'Faltan ' + (cp.target - cp.done) + ' check-ins') + '</div>' +
        '<div class="small muted" style="margin-top:6px">' + (cp.met ? 'Sumaste <b class="red">+' + cp.plan.xp + ' XP</b>. Lo que hagas de acá al domingo es extra.' : 'Al cumplirlo sumás <b class="red">+' + cp.plan.xp + ' XP</b>.') + '</div></div></div></div>';
    }

    // Cuadrícula semanal
    s += '<div class="section"><div class="section-title">Tu tablero <span class="tiny muted" style="font-family:var(--font);text-transform:none;letter-spacing:0">tocá un día para marcarlo</span></div><div class="card wgrid-card"><div class="wgrid">';
    s += '<div></div>' + [0, 1, 2, 3, 4, 5, 6].map((i) => { const k = D.addDays(ws, i); return '<div class="wday ' + (k === today ? 'today' : '') + '">' + D.DIAS_LETRA[D.weekday(k)] + '<small>' + D.fromKey(k).getDate() + '</small></div>'; }).join('') + '<div></div>';
    habits.forEach((h) => {
      const tier = GM.tierFor(H.totalCompletions(st, h.id));
      let done = 0, sched = 0;
      s += '<a class="wname" href="#/habit/' + h.id + '"><span>' + esc(h.icon) + '</span><span class="ell">' + esc(h.name) + '</span><span class="tier t' + tier.index + '" style="margin-left:auto">' + esc(tier.name) + '</span></a><span class="wemo">' + esc(h.icon) + '</span>';
      for (let i = 0; i < 7; i++) {
        const k = D.addDays(ws, i);
        const active = H.isActiveOn(h, k);
        const isDone = H.isDone(st, h.id, k);
        const weekly = H.isFlexible(h);
        const sc = active && (weekly || H.isScheduled(h, k));
        if (isDone) done++;
        if (sc && !weekly) sched++;
        const editable = ASC.rules.canEdit(st, k, today);
        const qpct = h.kind === 'quantity' && !isDone ? Math.min(1, H.getQty(st, h.id, k) / H.effectiveMin(h, k)) : 0;
        let cls = 'off';
        if (!active) cls = 'off';
        else if (isDone) cls = 'done';
        else if (qpct > 0) cls = 'part';
        else if (!sc) cls = 'rest';
        else if (k > today) cls = weekly ? 'opt future' : 'future';
        else if (k === today) cls = weekly ? 'opt now' : 'now';
        else cls = weekly ? 'opt' : 'miss';
        if (active && k < today && !editable) cls += ' closed';
        const can = active && editable && (sc || isDone);
        const act = h.kind === 'quantity' ? 'qty-edit' : 'habit-toggle';
        const label = esc(h.name) + ' ' + D.longLabel(k) + (isDone ? ', hecho' : qpct ? ', ' + Math.round(qpct * 100) + '%' : '') + (active && k < today && !editable ? ', día cerrado' : '');
        s += can ? '<button class="wcell ' + cls + '" style="--hc:' + h.color + ';--p:' + Math.round(qpct * 100) + '%" data-act="' + act + '" data-id="' + h.id + '" data-date="' + k + '" aria-label="' + label + '">' + (isDone ? icon('check', 'xs') : '') + '</button>'
          : '<span class="wcell ' + cls + '" style="--p:' + Math.round(qpct * 100) + '%" role="img" aria-label="' + label + '">' + (isDone ? icon('check', 'xs') : '') + '</span>';
      }
      const target = h.freqType === 'weekly' ? Math.min(h.timesPerWeek || 1, 7) : h.freqType === 'monthly' ? done : sched;
      s += '<span class="wcount ' + (target && done >= target ? 'red' : '') + '" title="' + esc(tier.name) + '">' + done + '/' + target + '</span>';
    });
    s += '</div><div class="legend" style="margin-top:12px"><span><i style="background:var(--red)"></i>Hecho</span><span><i style="border:2px solid var(--red)"></i>Hoy</span><span><i style="border:1px dashed var(--line-2)"></i>Pendiente / perdido</span><span><i style="background:var(--surface-3);opacity:.6"></i>X por semana: cualquier día</span><span><i style="background:linear-gradient(to top,rgba(var(--red-rgb),.55) 50%,transparent 0);border:1px solid rgba(var(--red-rgb),.4)"></i>Cantidad parcial</span></div>' +
      '<p class="tiny faint" style="margin:10px 0 0">' + icon('lock', 'xs').replace('class="icon', 'style="display:inline;vertical-align:-2px" class="icon') + ' Podés registrar hoy y corregir ' + (ASC.rules.windowDays(st) === 1 ? 'ayer' : 'hasta ' + ASC.rules.windowDays(st) + ' días atrás') + '. Los días anteriores quedan cerrados para que tu progreso sea real.</p></div></div>';

    s += '</div><div class="dcol">';
    // Misiones
    s += '<div class="section"><div class="section-title">Misiones de la semana <span class="small muted" style="font-family:var(--font);text-transform:none;letter-spacing:0">' + w.missions.filter((m) => GM.missionProgress(st, ws, m, today).done).length + '/' + w.missions.length + '</span></div>';
    s += w.missions.map((m) => {
      const p = GM.missionProgress(st, ws, m, today);
      return '<div class="mission ' + (p.done ? 'done' : '') + '"><span class="m-ic">' + icon(p.done ? 'check' : MISSION_ICON[m.type] || 'target', 'sm') + '</span><div class="grow"><b class="small">' + esc(m.title) + '</b>' +
        '<div class="row" style="margin-top:7px"><div class="bar-track grow" style="height:6px"><div class="bar-fill" style="width:' + Math.round(p.pct * 100) + '%"></div></div><span class="tiny muted">' + p.value + '/' + p.n + '</span></div></div><span class="xp-pill">+' + m.xp + '</span></div>';
    }).join('');
    s += '<p class="tiny faint" style="margin:8px 2px 0">Las misiones se generan con tus hábitos cada lunes y no cambian durante la semana.</p></div>';

    // Racha, hitos y comodines
    const cons = ASC.progress.consistency(st, today);
    const cur = cons.current;
    const nm = GM.nextMilestone(cur);
    const yesterday = D.addDays(today, -1);
    const canFreeze = ASC.progress.canUseFreeze(st, yesterday, today);
    s += '<div class="section"><div class="section-title">Racha de constancia</div><div class="card row" style="gap:14px"><div class="streak-flame">' + icon('flame') + '<b>' + cur + '</b></div><div class="grow">' +
      (nm ? '<b class="small">Hito: ' + nm.days + ' días seguidos</b><div class="row" style="margin-top:7px"><div class="bar-track grow" style="height:6px"><div class="bar-fill" style="width:' + Math.round((cur / nm.days) * 100) + '%"></div></div><span class="xp-pill">+' + nm.xp + '</span></div><div class="tiny muted" style="margin-top:6px">Te faltan ' + (nm.days - cur) + (nm.days - cur === 1 ? ' día' : ' días') + '. Los días sin nada programado no la cortan.</div>' : '<b class="small">Superaste todos los hitos de racha.</b>') + '</div></div>' +
      '<div class="card mt freeze-card"><div class="row between"><div class="row" style="gap:10px"><span class="freeze-ic">' + icon('lock', 'sm') + '</span><div><b class="small">Comodines de racha</b><div class="tiny muted">Ganás 1 cada ' + ASC.XP.freeze.earnEvery + ' días seguidos (máximo ' + ASC.XP.freeze.maxHeld + ')</div></div></div>' +
      '<div class="freeze-count" aria-label="' + cons.freezes.available + ' comodines disponibles">' + Array.from({ length: ASC.XP.freeze.maxHeld }, (_, i) => '<i class="' + (i < cons.freezes.available ? 'on' : '') + '"></i>').join('') + '</div></div>' +
      (canFreeze ? '<div class="freeze-offer"><p class="small" style="margin:10px 0">Ayer no registraste hábitos y tu racha se cortó. Podés usar un comodín para proteger ese día.</p><button class="btn primary block" data-act="freeze-use" data-date="' + yesterday + '">Usar comodín para ayer</button></div>' : '') +
      (cons.freezes.used.length ? '<div class="tiny muted" style="margin-top:10px">Usados: ' + cons.freezes.used.slice(-5).map((d) => D.shortLabel(d)).join(', ') + '</div>' : '') +
      '<p class="tiny faint" style="margin:10px 0 0">Un comodín solo cuida tu racha: el día sigue figurando como no cumplido en tus estadísticas y no suma XP. Se puede usar en un día que cortaría la racha, dentro de la ventana de corrección.</p></div></div>';

    // Maestría
    s += '<div class="section"><div class="section-title">Maestría de tus hábitos</div><div class="list">' + habits.map((h) => {
      const t = GM.tierFor(H.totalCompletions(st, h.id));
      return '<a class="list-item" href="#/habit/' + h.id + '"><span class="h-icon" style="background:' + h.color + '22;width:38px;height:38px">' + esc(h.icon) + '</span><span class="grow"><span class="row between"><b class="small ell">' + esc(h.name) + '</b><span class="tier t' + t.index + '">' + esc(t.name) + '</span></span>' +
        '<div class="bar-track" style="height:5px;margin-top:7px"><div class="bar-fill" style="width:' + Math.round(t.pct * 100) + '%"></div></div><div class="tiny muted" style="margin-top:5px">' + t.count + ' veces' + (t.next ? ' · ' + (t.nextAt - t.count) + ' para ' + t.next + ' (+' + GM.TIER_XP + ' XP)' : ' · nivel máximo') + '</div></span></a>';
    }).join('') + '</div><p class="tiny faint" style="margin:8px 2px 0">Semilla → Brote (7) → Raíz (21) → Tronco (50) → Roble (100) → Leyenda (250).</p></div>';

    // Semana pasada
    const pws = D.addDays(ws, -7);
    const pw = st.weeks && st.weeks[pws];
    if (pw && (pw.plan || (pw.missions && pw.missions.length))) {
      const pxp = GM.weekXP(st, pws, today);
      const pcp = GM.commitmentProgress(st, pws);
      const pm = (pw.missions || []).filter((m) => GM.missionProgress(st, pws, m, today).done).length;
      s += '<div class="section"><div class="section-title">Semana pasada</div><div class="card"><div class="stat-grid three">' +
        '<div><div class="num" style="font-size:24px">+' + ASC.ui.fmtNum(pxp.total) + '</div><div class="tiny muted">XP ganado</div></div>' +
        '<div><div class="num" style="font-size:24px">' + pm + '/' + (pw.missions || []).length + '</div><div class="tiny muted">misiones</div></div>' +
        '<div><div class="num" style="font-size:24px">' + (pcp ? Math.round(Math.min(1, pcp.done / pcp.target) * 100) + '%' : '—') + '</div><div class="tiny muted">desafío</div></div></div>' +
        '<p class="small muted" style="margin:12px 0 0">' + (pcp ? (pcp.met ? 'Cumpliste el desafío ' + GM.COMMITMENTS[pcp.plan.level].label + '. Eso es disciplina.' : 'Llegaste a ' + pcp.done + ' de ' + pcp.target + '. No perdiste nada: esta semana es una nueva oportunidad.') : 'No planificaste esa semana. Esta vez, aceptá el desafío.') + '</p></div></div>';
    }
    return s + '</div></div>';
  }

  function planSheet() {
    const st = ASC.store.get();
    const today = D.today();
    const ws = D.weekStart(today);
    const from = today > ws ? today : ws;
    const habits = st.habits.filter((h) => !h.archivedAt);
    const total = GM.scheduledFrom(st, from, ws).scheduled;
    let s = '<p class="small muted" style="margin-top:-8px">' + (from === ws ? 'De lunes a domingo' : 'De hoy al domingo') + ' tenés <b style="color:#fff">' + total + ' check-ins</b> programados:</p>';
    s += '<div class="list" style="margin-bottom:16px">' + habits.map((h) => {
      const n = GM.scheduledFrom({ habits: [h], habitLogs: st.habitLogs }, from, ws).scheduled;
      return '<div class="list-item" style="min-height:46px;padding:10px 14px"><span>' + esc(h.icon) + '</span><span class="grow small">' + esc(h.name) + '</span><span class="small muted">' + n + '</span></div>';
    }).join('') + '</div>';
    s += '<div class="field"><span>Elegí tu compromiso</span><div class="commit-list" data-group="commit">' + Object.keys(GM.COMMITMENTS).map((k) => {
      const c = GM.COMMITMENTS[k];
      const target = Math.max(1, Math.ceil(total * c.pct));
      return '<button class="commit ' + (k === 'firme' ? 'on' : '') + '" data-act="pick-one" data-val="' + k + '"><div class="row between"><b class="num" style="font-size:22px;text-transform:uppercase">' + c.label + '</b><span class="xp-pill">+' + c.xp + ' XP</span></div>' +
        '<div class="small" style="margin-top:4px">' + target + ' de ' + total + ' check-ins (' + Math.round(c.pct * 100) + '%)</div><div class="tiny muted" style="margin-top:3px">' + esc(c.desc) + '</div></button>';
    }).join('') + '</div></div>';
    s += '<p class="tiny faint">Una vez aceptado, el desafío queda fijo hasta el domingo. Si no lo cumplís, no perdés XP.</p>';
    s += '<button class="btn primary block" data-act="week-commit"' + (total ? '' : ' disabled') + '>' + icon('bolt', 'sm') + 'Aceptar desafío</button>';
    return s;
  }

  /* ---------- Calendario ---------- */
  /** Calendario de progreso: ver js/screens/calendar.js. Los enlaces viejos (?m=AAAA-MM&d=…) siguen funcionando. */
  function calendarTab(q) {
    if (q.m && !q.a) q.a = q.m + '-01';
    if (q.d && !q.a) q.a = q.d;
    return ASC.calendarView.render(q);
  }

  /* ---------- Objetivos ---------- */
  function goalProgress(g) {
    const steps = g.steps || [];
    if (g.status === 'done') return 1;
    if (steps.length) return steps.filter((x) => x.done).length / steps.length;
    return (Number(g.manualProgress) || 0) / 100;
  }

  function goalsTab() {
    const st = ASC.store.get();
    if (!st.goals.length) return ASC.ui.emptyState('target', 'Definí un objetivo', 'Corto, mediano o largo plazo. Dividilo en pasos y asociale hábitos.', 'Nuevo objetivo', 'goal-new');
    const order = { active: 0, paused: 1, done: 2 };
    return '<div class="card-grid two-col">' + st.goals.slice().sort((a, b) => order[a.status] - order[b.status]).map((g) => {
      const p = goalProgress(g);
      const linked = st.habits.filter((h) => h.goalId === g.id && !h.archivedAt).length;
      return '<a class="card tap" href="#/goal/' + g.id + '" style="display:block"><div class="row between"><span class="badge ' + (g.status === 'done' ? 'red' : '') + '">' + (g.status === 'done' ? 'Cumplido' : g.status === 'paused' ? 'En pausa' : HORIZONS[g.horizon] || 'Objetivo') + '</span>' +
        (g.targetDate ? '<span class="tiny muted">Meta: ' + D.shortLabel(g.targetDate) + '</span>' : '') + '</div>' +
        '<div class="num" style="font-size:24px;margin:10px 0 4px;text-transform:uppercase">' + esc(g.title) + '</div>' +
        '<div class="row"><div class="bar-track grow"><div class="bar-fill" style="width:' + Math.round(p * 100) + '%"></div></div><b class="small">' + Math.round(p * 100) + '%</b></div>' +
        '<div class="tiny muted mt">' + (g.steps || []).filter((x) => x.done).length + '/' + (g.steps || []).length + ' pasos · ' + linked + ' hábitos asociados</div></a>';
    }).join('') + '</div>';
  }

  function goalDetail(id) {
    const st = ASC.store.get();
    const g = st.goals.find((x) => x.id === id);
    if (!g) return notFound('Objetivo');
    const p = goalProgress(g);
    const linked = st.habits.filter((h) => h.goalId === g.id);
    const today = D.today();
    let s = '<div class="screen"><div class="head"><div class="head-back"><a class="icon-btn" href="#/habits?tab=goals" aria-label="Volver">' + icon('chevL') + '</a><div><div class="sub" style="margin:0">' + esc(HORIZONS[g.horizon] || 'Objetivo') + ' · ' + esc(H.categoryLabel(g.category)) + '</div></div></div><button class="icon-btn" data-act="goal-edit" data-id="' + g.id + '" aria-label="Editar">' + icon('edit', 'sm') + '</button></div>';
    s += '<div class="hero"><div class="hero-kicker">' + (g.status === 'done' ? 'Objetivo cumplido' : 'Objetivo') + '</div><div class="hero-title">' + esc(g.title) + '</div>' +
      (g.description ? '<p class="small" style="color:#ddd;position:relative">' + esc(g.description) + '</p>' : '') +
      '<div class="row mt" style="position:relative"><div class="bar-track grow"><div class="bar-fill" style="width:' + Math.round(p * 100) + '%"></div></div><b class="num" style="font-size:22px">' + Math.round(p * 100) + '%</b></div>' +
      '<div class="tiny muted mt" style="position:relative">Desde ' + D.shortLabel(g.startDate) + (g.targetDate ? ' · meta ' + D.shortLabel(g.targetDate) + (g.status !== 'done' ? ' (' + Math.max(0, D.diffDays(today, g.targetDate)) + ' días)' : '') : '') + '</div></div>';

    s += '<div class="section"><div class="section-title">Pasos</div><div class="card">';
    s += (g.steps || []).map((x) => '<div class="step ' + (x.done ? 'done' : '') + '"><button class="mini-check ' + (x.done ? 'on' : '') + '" data-act="step-toggle" data-goal="' + g.id + '" data-id="' + x.id + '" aria-label="Completar paso">' + icon('check') + '</button><span class="grow small">' + esc(x.title) + '</span><button class="faint" data-act="step-delete" data-goal="' + g.id + '" data-id="' + x.id + '" aria-label="Eliminar paso">' + icon('x', 'xs') + '</button></div>').join('') || '<div class="small muted" style="padding-bottom:10px">Dividí el objetivo en pasos concretos. El progreso se calcula con ellos.</div>';
    s += '<div class="row mt"><input class="input grow" id="new-step" aria-label="Nuevo paso del objetivo" maxlength="80" placeholder="Nuevo paso…" data-enter="step-add" data-goal="' + g.id + '"><button class="icon-btn red" data-act="step-add" data-goal="' + g.id + '" aria-label="Agregar paso">' + icon('plus') + '</button></div></div></div>';

    s += '<div class="section"><div class="section-title">Hábitos asociados</div>';
    s += linked.length ? linked.map((h) => ASC.homeHelpers.habitRow(st, h, today)).join('') : '<div class="card small muted">Podés asociar hábitos desde el formulario de cada hábito.</div>';
    s += '</div><div class="section stack">';
    s += g.status === 'done' ? '<button class="btn ghost block" data-act="goal-status" data-id="' + g.id + '" data-val="active">Reabrir objetivo</button>' :
      '<button class="btn primary block" data-act="goal-status" data-id="' + g.id + '" data-val="done">' + icon('trophy', 'sm') + 'Marcar como cumplido</button>' +
      '<button class="btn ghost block" data-act="goal-status" data-id="' + g.id + '" data-val="' + (g.status === 'paused' ? 'active' : 'paused') + '">' + (g.status === 'paused' ? 'Retomar' : 'Poner en pausa') + '</button>';
    s += '<button class="btn danger block" data-act="goal-delete" data-id="' + g.id + '">' + icon('trash', 'sm') + 'Eliminar objetivo</button></div></div>';
    return s;
  }

  function goalForm(g) {
    g = g || { title: '', description: '', category: 'otros', horizon: 'mediano', startDate: D.today(), targetDate: '', manualProgress: 0, steps: [] };
    return '<label class="field"><span>Título</span><input class="input" name="title" maxlength="60" placeholder="Ej: Leer 12 libros" value="' + esc(g.title) + '"></label>' +
      '<label class="field"><span>Descripción</span><textarea class="textarea" name="description" maxlength="400" placeholder="¿Por qué es importante para vos?">' + esc(g.description) + '</textarea></label>' +
      '<div class="field"><span>Plazo</span><div class="chips" data-group="horizon">' + Object.keys(HORIZONS).map((k) => '<button class="chip ' + (g.horizon === k ? 'on' : '') + '" data-act="pick-one" data-val="' + k + '">' + HORIZONS[k] + '</button>').join('') + '</div></div>' +
      '<label class="field"><span>Categoría</span><select class="select" name="category">' + H.CATEGORIES.map((c) => '<option value="' + c.id + '"' + (g.category === c.id ? ' selected' : '') + '>' + c.label + '</option>').join('') + '</select></label>' +
      '<div class="two"><label class="field"><span>Inicio</span><input class="input" type="date" name="startDate" value="' + esc(g.startDate) + '"></label><label class="field"><span>Fecha objetivo</span><input class="input" type="date" name="targetDate" value="' + esc(g.targetDate || '') + '"></label></div>' +
      (g.steps && g.steps.length ? '' : '<label class="field"><span>Progreso manual (si no usás pasos): <b class="red" data-out>' + (g.manualProgress || 0) + '%</b></span><input type="range" min="0" max="100" step="5" name="manualProgress" value="' + (g.manualProgress || 0) + '" data-input="range-out" style="width:100%;accent-color:var(--red)"></label>');
  }

  function readGoal(sh) {
    const hz = sh.querySelector('[data-group="horizon"] .on');
    const mp = sh.querySelector('[name=manualProgress]');
    return {
      title: sh.querySelector('[name=title]').value.trim(),
      description: sh.querySelector('[name=description]').value.trim(),
      category: sh.querySelector('[name=category]').value,
      horizon: hz ? hz.dataset.val : 'mediano',
      startDate: sh.querySelector('[name=startDate]').value || D.today(),
      targetDate: sh.querySelector('[name=targetDate]').value || '',
      manualProgress: mp ? Number(mp.value) : undefined,
    };
  }

  /* ---------- Diario ---------- */
  function journalTab() {
    const st = ASC.store.get();
    const priv = !!st.settings.privateJournal;
    let s = '<div class="card row small between" style="margin-bottom:14px;gap:10px"><span class="row" style="gap:8px">' + icon('lock', 'sm red') + '<span class="muted">Se guarda solo en este dispositivo.' + (priv ? ' Modo privado: el contenido se oculta.' : '') + '</span></span><button class="btn ghost sm" data-act="journal-privacy" aria-pressed="' + priv + '">' + (priv ? 'Mostrar siempre' : 'Ocultar contenido') + '</button></div>';
    if (ASC.plannerUI) s += ASC.plannerUI.moodRow(st, D.today());
    if (!st.journal.length) return s + ASC.ui.emptyState('book', 'Tu espacio privado', 'Anotá cómo estuvo tu día, qué aprendiste, una reflexión o un acontecimiento importante.', 'Escribir hoy', 'journal-new');
    const showAll = !priv || journalRevealed;
    const events = st.journal.filter((j) => j.type === 'evento').sort((a, b) => (a.date < b.date ? 1 : -1));
    if (events.length) s += '<div class="section" style="margin-top:6px"><div class="section-title">Acontecimientos importantes</div><div class="list">' + events.slice(0, 5).map((j) => '<button class="list-item" data-act="journal-edit" data-id="' + j.id + '">' + icon('star', 'xs red') + '<span class="grow small" style="text-align:left">' + esc(D.shortLabel(j.date)) + ' · ' + (showAll ? esc((j.title || j.text || '').slice(0, 70)) : 'Contenido oculto') + '</span></button>').join('') + '</div></div>';
    if (!showAll) return s + '<div class="card center"><p class="small muted">' + st.journal.length + ' entradas ocultas.</p><button class="btn primary" data-act="journal-reveal">' + icon('eye', 'sm') + 'Mostrar por esta vez</button></div>';
    return s + '<div class="card-grid two-col">' + st.journal.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (a.createdAt < b.createdAt ? 1 : -1))).map((j) =>
      '<button class="card tap" style="display:block;width:100%;text-align:left" data-act="journal-edit" data-id="' + j.id + '"><div class="row between"><b class="small" style="text-transform:capitalize">' + esc(D.longLabel(j.date)) + '</b><span style="font-size:22px" title="' + esc((MOODS[j.mood - 1] || [])[1] || '') + '">' + ((MOODS[j.mood - 1] || [''])[0]) + '</span></div>' +
      (j.text ? '<div class="entry-text">' + esc(j.text.length > 180 ? j.text.slice(0, 180) + '…' : j.text) + '</div>' : '') +
      (j.learnings ? '<div class="row small mt" style="color:#ddd;align-items:flex-start">' + icon('star', 'xs red') + '<span>' + esc(j.learnings.length > 100 ? j.learnings.slice(0, 100) + '…' : j.learnings) + '</span></div>' : '') + '</button>').join('') + '</div>';
  }

  let journalRevealed = false;
  // Al salir del diario se vuelve a ocultar (modo privado)
  if (typeof window !== 'undefined') window.addEventListener('hashchange', () => { if (!/tab=journal/.test(location.hash)) journalRevealed = false; });
  function journalForm(j) {
    j = j || { date: D.today(), mood: 0, text: '', learnings: '', type: 'nota', title: '' };
    const types = ASC.wellbeing ? ASC.wellbeing.ENTRY_TYPES : [['nota', 'Nota']];
    return '<div class="field"><span>Tipo</span><div class="chips" data-group="jtype">' + types.map(([v, l]) => '<button class="chip ' + ((j.type || 'nota') === v ? 'on' : '') + '" data-act="pick-one" data-val="' + v + '" aria-pressed="' + ((j.type || 'nota') === v) + '">' + l + '</button>').join('') + '</div></div>' +
      '<div class="two"><label class="field"><span>Fecha</span><input class="input" type="date" name="date" value="' + esc(j.date) + '"></label><label class="field"><span>Título (opcional)</span><input class="input" name="title" maxlength="60" value="' + esc(j.title || '') + '"></label></div>' +
      '<div class="field"><span>¿Cómo te sentís?</span><div class="mood-row" data-group="mood">' + MOODS.map((m, i) => '<button class="' + (j.mood === i + 1 ? 'on' : '') + '" data-act="pick-one" data-val="' + (i + 1) + '" aria-label="' + m[1] + '">' + m[0] + '</button>').join('') + '</div></div>' +
      '<label class="field"><span>¿Cómo estuvo tu día?</span><textarea class="textarea" name="text" maxlength="5000" placeholder="Escribí libremente…">' + esc(j.text) + '</textarea></label>' +
      '<label class="field"><span>Aprendizajes</span><textarea class="textarea" name="learnings" maxlength="2000" style="min-height:80px" placeholder="¿Qué te llevás de hoy?">' + esc(j.learnings) + '</textarea></label>';
  }

  /* ---------- Detalle de hábito ---------- */
  function notFound(what) {
    return '<div class="screen"><div class="empty"><h3>' + what + ' no encontrado</h3><p>Puede que se haya eliminado.</p><a class="btn primary" href="#/habits">Volver</a></div></div>';
  }

  function negativeDetail(st, h, today) {
    const c = H.cleanStreak(st, h, today);
    const rel = (st.relapses[h.id] || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
    let s = '<div class="screen"><div class="head"><div class="head-back"><a class="icon-btn" href="#/habits?tab=today" aria-label="Volver">' + icon('chevL') + '</a></div><button class="icon-btn" data-act="habit-edit" data-id="' + h.id + '" aria-label="Editar">' + icon('edit', 'sm') + '</button></div>';
    s += '<div class="row" style="gap:14px"><div class="h-icon" style="width:62px;height:62px;font-size:30px;border-radius:18px;background:' + h.color + '22">' + esc(h.icon) + '</div><div class="grow"><div class="tiny red" style="font-weight:800;letter-spacing:1.5px">EVITANDO</div><div class="num" style="font-size:30px;line-height:1;text-transform:uppercase">' + esc(h.name) + '</div>' + (h.archivedAt ? '<div class="small red">Archivado</div>' : '') + '</div></div>';
    s += '<div class="stat-grid mt-lg"><div class="stat accent"><div class="v">' + c.current + '<small>días</small></div><div class="k">Sin la conducta</div></div><div class="stat"><div class="v">' + c.best + '<small>días</small></div><div class="k">Mejor racha</div></div>' +
      '<div class="stat"><div class="v">' + c.relapses + '</div><div class="k">Recaídas registradas</div></div><div class="stat"><div class="v">' + (h.negGoalDays ? Math.min(100, Math.round((c.current / h.negGoalDays) * 100)) + '<small>%</small>' : '—') + '</div><div class="k">' + (h.negGoalDays ? 'Meta de ' + h.negGoalDays + ' días' : 'Sin meta de días') + '</div></div></div>';
    // Evolución: últimas 8 semanas
    s += '<div class="section"><div class="section-title">Últimas 8 semanas</div><div class="card"><div class="cal">';
    [1, 2, 3, 4, 5, 6, 0].forEach((d) => (s += '<div class="dow">' + D.DIAS_LETRA[d] + '</div>'));
    const relSet = new Set(rel.map((r) => r.date));
    const startWs = D.addDays(D.weekStart(today), -49);
    for (let i = 0; i < 56; i++) {
      const k = D.addDays(startWs, i);
      const cls = k > today ? 'future' : k < h.startDate ? 'rest' : relSet.has(k) ? 'none' : 'full';
      s += '<div class="cal-day ' + cls + '" title="' + D.longLabel(k) + (relSet.has(k) ? ' · recaída' : '') + '">' + D.fromKey(k).getDate() + '</div>';
    }
    s += '</div><div class="legend"><span><i style="background:var(--red-600)"></i>Día sin la conducta</span><span><i style="border:1px dashed var(--line-2)"></i>Recaída</span></div></div></div>';
    s += '<div class="section">' + (h.archivedAt ? '' : '<button class="btn ghost block" data-act="relapse-new" data-id="' + h.id + '">Registrar una recaída</button>') + '</div>';
    if (rel.length) {
      s += '<div class="section"><div class="section-title">Registro</div><div class="list">' + rel.map((r) => '<div class="list-item"><span class="grow"><b class="small">' + esc(D.longLabel(r.date)) + '</b>' + (r.note ? '<div class="tiny muted">' + esc(r.note) + '</div>' : '') + '</span>' +
        (ASC.rules.canEdit(st, r.date, today) ? '<button class="btn ghost sm" data-act="relapse-remove" data-id="' + h.id + '" data-date="' + r.date + '">Quitar</button>' : '<span class="tiny faint">' + icon('lock', 'xs') + '</span>') + '</div>').join('') + '</div></div>';
    }
    s += '<p class="tiny faint">Esto es un registro personal para ver tu evolución, no un tratamiento. Si necesitás ayuda para dejar una conducta, consultá con un profesional.</p>';
    s += '<div class="section stack">' + (h.archivedAt ? '<button class="btn ghost block" data-act="habit-unarchive" data-id="' + h.id + '">' + icon('refresh', 'sm') + 'Restaurar</button>' : '<button class="btn ghost block" data-act="habit-archive" data-id="' + h.id + '">' + icon('archive', 'sm') + 'Archivar</button>') +
      '<button class="btn danger block" data-act="habit-delete" data-id="' + h.id + '">' + icon('trash', 'sm') + 'Eliminar</button></div></div>';
    return s;
  }

  function habitDetail(id) {
    const st = ASC.store.get();
    const h = st.habits.find((x) => x.id === id);
    if (!h) return notFound('Hábito');
    const today = D.today();
    if (h.kind === 'negative') return negativeDetail(st, h, today);
    const cur = H.currentStreak(st, h, today), best = H.bestStreak(st, h, today);
    const s30 = H.habitRangeStats(st, h, D.addDays(today, -29), today);
    const total = H.totalCompletions(st, h.id);
    const goal = h.goalId && st.goals.find((g) => g.id === h.goalId);
    let s = '<div class="screen"><div class="head"><div class="head-back"><a class="icon-btn" href="#/habits" aria-label="Volver">' + icon('chevL') + '</a></div><button class="icon-btn" data-act="habit-edit" data-id="' + h.id + '" aria-label="Editar">' + icon('edit', 'sm') + '</button></div>';
    s += '<div class="row" style="gap:14px"><div class="h-icon" style="width:62px;height:62px;font-size:30px;border-radius:18px;background:' + h.color + '22">' + esc(h.icon) + '</div><div class="grow"><div class="num" style="font-size:30px;line-height:1;text-transform:uppercase">' + esc(h.name) + '</div><div class="small muted mt" style="margin-top:6px">' + esc(H.frequencyLabel(h)) + ' · ' + esc(H.categoryLabel(h.category)) + (h.archivedAt ? ' · <span class="red">Archivado</span>' : '') + '</div></div></div>';
    if (h.description) s += '<p class="small muted">' + esc(h.description) + '</p>';
    s += '<div class="stat-grid mt-lg"><div class="stat accent"><div class="v">' + cur.value + '<small>' + (cur.unit === 'semanas' ? 'sem' : 'días') + '</small></div><div class="k">Racha actual</div></div>' +
      '<div class="stat"><div class="v">' + best.value + '<small>' + (best.unit === 'semanas' ? 'sem' : 'días') + '</small></div><div class="k">Mejor racha</div></div>' +
      '<div class="stat"><div class="v">' + total + '</div><div class="k">' + (h.kind === 'quantity' ? 'Días con el objetivo cumplido' : 'Veces completado') + '</div></div>' +
      '<div class="stat"><div class="v">' + (s30.scheduled ? Math.round(s30.pct * 100) + '<small>%</small>' : '—') + '</div><div class="k">Cumplimiento 30 días</div></div></div>';

    // Últimas 5 semanas en grilla
    s += '<div class="section"><div class="section-title">Últimas 5 semanas</div><div class="card"><div class="cal">';
    [1, 2, 3, 4, 5, 6, 0].forEach((d) => (s += '<div class="dow">' + D.DIAS_LETRA[d] + '</div>'));
    const startWs = D.addDays(D.weekStart(today), -28);
    for (let i = 0; i < 35; i++) {
      const k = D.addDays(startWs, i);
      let cls = 'future';
      if (k <= today) {
        const done = H.isDone(st, h.id, k);
        if (done) cls = 'full';
        else if (!H.isActiveOn(h, k) || H.isFlexible(h) || !H.isScheduled(h, k)) cls = 'rest';
        else cls = k === today ? 'pending' : 'none';
      }
      s += '<div class="cal-day ' + cls + '" title="' + D.longLabel(k) + '">' + D.fromKey(k).getDate() + '</div>';
    }
    s += '</div><p class="tiny faint" style="margin:12px 0 0">Los días sin programar no cuentan como incumplidos.</p></div></div>';

    s += '<div class="section"><div class="list">' +
      '<div class="list-item"><span class="grow small muted">Empezó</span><span class="small">' + D.shortLabel(h.startDate) + '</span></div>' +
      (h.target ? '<div class="list-item"><span class="grow small muted">Meta diaria</span><span class="small">' + esc(h.target) + '</span></div>' : '') +
      (h.reminderTime ? '<div class="list-item"><span class="grow small muted">Recordatorio</span><span class="small">' + esc(h.reminderTime) + '</span></div>' : '') +
      (goal ? '<a class="list-item" href="#/goal/' + goal.id + '"><span class="grow small muted">Objetivo</span><span class="small">' + esc(goal.title) + '</span>' + icon('chevR', 'sm chev') + '</a>' : '') +
      (h.linkGym ? '<div class="list-item"><span class="grow small muted">Se completa al entrenar</span><span class="small red">Sí</span></div>' : '') + '</div></div>';

    s += '<div class="section stack">' + (h.archivedAt ?
      '<button class="btn ghost block" data-act="habit-unarchive" data-id="' + h.id + '">' + icon('refresh', 'sm') + 'Restaurar hábito</button>' :
      (H.pausedNow(h, D.today()) ? '<button class="btn ghost block" data-act="habit-resume" data-id="' + h.id + '">' + icon('play', 'sm') + 'Reanudar</button>' : '<button class="btn ghost block" data-act="habit-pause" data-id="' + h.id + '">' + icon('timer', 'sm') + 'Pausar (vacaciones, lesión, etc.)</button>') +
      '<button class="btn ghost block" data-act="habit-archive" data-id="' + h.id + '">' + icon('archive', 'sm') + 'Archivar (conserva el historial)</button>') +
      '<button class="btn danger block" data-act="habit-delete" data-id="' + h.id + '">' + icon('trash', 'sm') + 'Eliminar hábito</button></div></div>';
    return s;
  }

  /* ---------- Formulario de hábito ---------- */
  const UNITS = ['ml', 'L', 'vasos', 'páginas', 'minutos', 'horas', 'pasos', 'km', 'repeticiones', 'veces'];

  function habitForm(h) {
    const st = ASC.store.get();
    h = h || { kind: 'check', name: '', description: '', category: 'otros', icon: '💧', color: COLORS[0], freqType: 'daily', days: [1, 2, 3, 4, 5], timesPerWeek: 3, target: '', reminderTime: '', reminderDays: [], startDate: D.today(), goalId: null, linkGym: false, qtyTarget: '', qtyMin: '', qtyUnit: 'ml', qtyStep: '', negGoalDays: 30, timesPerMonth: 8, timeOfDay: '' };
    const kind = h.kind || 'check';
    const goals = st.goals.filter((g) => g.status !== 'done');
    const isNew = !h.id;
    const kinds = [['check', 'Hacer', 'Sí o no, cada día que toca'], ['quantity', 'Con cantidad', 'Ej: 2.000 ml, 20 páginas'], ['negative', 'Evitar', 'Una conducta que querés dejar']];
    return (isNew ? '<div class="field"><span>Tipo de hábito</span><div class="kind-pick" data-group="kind">' + kinds.map(([v, l, d]) =>
        '<button class="kind ' + (kind === v ? 'on' : '') + '" data-act="pick-one" data-val="' + v + '" aria-pressed="' + (kind === v) + '"><b>' + l + '</b><span>' + d + '</span></button>').join('') + '</div></div>'
      : '<input type="hidden" name="kind" value="' + kind + '"><p class="small muted" style="margin-top:-6px">Tipo: <b style="color:#fff">' + { check: 'Hacer', quantity: 'Con cantidad', negative: 'Evitar' }[kind] + '</b> (no se puede cambiar para no alterar el historial)</p>') +
      '<label class="field"><span data-kind-label>' + (kind === 'negative' ? 'Qué querés evitar' : 'Nombre') + '</span><input class="input" name="name" maxlength="50" placeholder="' + (kind === 'negative' ? 'Ej: Fumar, redes después de las 23 h' : 'Ej: Leer 20 minutos') + '" value="' + esc(h.name) + '"></label>' +
      // Cantidad
      '<div data-kind-panel="quantity" ' + (kind === 'quantity' ? '' : 'hidden') + '><div class="two"><label class="field"><span>Mínimo <span class="muted">(opcional)</span></span><input class="input" name="qtyMin" inputmode="decimal" placeholder="Ej: 5" value="' + esc(h.qtyMin || '') + '"></label><label class="field"><span>Ideal (objetivo diario)</span><input class="input" name="qtyTarget" inputmode="decimal" placeholder="Ej: 30" value="' + esc(h.qtyTarget || '') + '"></label></div>' +
      '<p class="tiny faint" style="margin:-8px 0 12px">Con mínimo, el día cuenta como cumplido al llegar al mínimo; el ideal queda como meta extra. Sin mínimo, se cumple al llegar al ideal.</p><div class="two">' +
      '<label class="field"><span>Unidad</span><input class="input" name="qtyUnit" list="unit-list" maxlength="15" value="' + esc(h.qtyUnit || '') + '"><datalist id="unit-list">' + UNITS.map((u) => '<option value="' + u + '">').join('') + '</datalist></label></div>' +
      '<label class="field"><span>Incremento rápido (lo que suma cada toque)</span><input class="input" name="qtyStep" inputmode="decimal" placeholder="250" value="' + esc(h.qtyStep || '') + '"></label></div>' +
      // Evitar
      '<div data-kind-panel="negative" ' + (kind === 'negative' ? '' : 'hidden') + '><div class="field"><span>Objetivo de días seguidos (opcional)</span><div class="chips" data-group="neggoal">' + [[0, 'Sin meta'], [7, '7 días'], [30, '30 días'], [90, '90 días'], [180, '180 días'], [365, '1 año']].map(([v, l]) => '<button class="chip ' + (Number(h.negGoalDays || 0) === v ? 'on' : '') + '" data-act="pick-one" data-val="' + v + '">' + l + '</button>').join('') + '</div></div>' +
      '<p class="tiny faint" style="margin-top:-6px">No se marca cada día: cuenta solo los días sin la conducta. Si hay una recaída, la registrás y el contador vuelve a empezar, sin perder tu mejor racha.</p></div>' +
      '<div class="field"><span>Ícono</span><div class="emoji-pick" data-group="icon">' + EMOJIS.map((e) => '<button class="' + (h.icon === e ? 'on' : '') + '" data-act="pick-one" data-val="' + e + '" aria-label="Ícono ' + e + '">' + e + '</button>').join('') + '</div></div>' +
      '<div class="field"><span>Color</span><div class="swatches" data-group="color">' + COLORS.map((c) => '<button class="swatch ' + (h.color === c ? 'on' : '') + '" style="background:' + c + '" data-act="pick-one" data-val="' + c + '" aria-label="Color ' + c + '"></button>').join('') + '</div></div>' +
      '<div data-kind-hide="negative" ' + (kind === 'negative' ? 'hidden' : '') + '>' +
      '<div class="field"><span>Frecuencia</span><div class="seg" data-group="freq" style="margin:0">' +
      [['daily', 'Diario'], ['weekdays', 'Días fijos'], ['weekly', 'X/semana'], ['monthly', 'X/mes']].map(([v, l]) => '<button class="' + (h.freqType === v ? 'on' : '') + '" data-act="pick-one" data-val="' + v + '">' + l + '</button>').join('') + '</div></div>' +
      '<div class="field" data-freq-panel="weekdays" ' + (h.freqType === 'weekdays' ? '' : 'hidden') + '><span>Días</span><div class="chips" data-group="days">' + [1, 2, 3, 4, 5, 6, 0].map((d) => '<button class="chip day ' + ((h.days || []).includes(d) ? 'on' : '') + '" data-act="toggle-on" data-val="' + d + '" aria-label="' + D.DIAS_LARGOS[d] + '">' + D.DIAS_LETRA[d] + '</button>').join('') + '</div></div>' +
      '<div class="field" data-freq-panel="weekly" ' + (h.freqType === 'weekly' ? '' : 'hidden') + '><span>Veces por semana</span><div class="chips" data-group="times">' + [1, 2, 3, 4, 5, 6].map((n) => '<button class="chip day ' + (Number(h.timesPerWeek) === n ? 'on' : '') + '" data-act="pick-one" data-val="' + n + '">' + n + '</button>').join('') + '</div></div>' +
      '<div class="field" data-freq-panel="monthly" ' + (h.freqType === 'monthly' ? '' : 'hidden') + '><span>Veces por mes</span><div class="chips" data-group="mtimes">' + [1, 2, 3, 4, 6, 8, 10, 12, 15, 20].map((n) => '<button class="chip day ' + (Number(h.timesPerMonth || 8) === n ? 'on' : '') + '" data-act="pick-one" data-val="' + n + '">' + n + '</button>').join('') + '</div></div>' +
      '<div class="field"><span>Momento del día</span><div class="chips" data-group="tod">' + H.TIMES_OF_DAY.map(([v, l]) => '<button class="chip ' + ((h.timeOfDay || '') === v ? 'on' : '') + '" data-act="pick-one" data-val="' + v + '" aria-pressed="' + ((h.timeOfDay || '') === v) + '">' + l + '</button>').join('') + '</div></div>' +
      '<div class="two"><label class="field" data-kind-hide="quantity" ' + (kind === 'quantity' ? 'hidden' : '') + '><span>Meta (opcional)</span><input class="input" name="target" maxlength="30" placeholder="Ej: 20 min" value="' + esc(h.target || '') + '"></label>' +
      '<label class="field"><span>Recordatorio</span><input class="input" type="time" name="reminderTime" value="' + esc(h.reminderTime || '') + '"></label></div>' +
      '<div class="field"><span>Días del recordatorio (vacío = los días que toca)</span><div class="chips" data-group="remdays">' + [1, 2, 3, 4, 5, 6, 0].map((d) => '<button class="chip day ' + ((h.reminderDays || []).includes(d) ? 'on' : '') + '" data-act="toggle-on" data-val="' + d + '" aria-label="Recordar el ' + D.DIAS_LARGOS[d] + '">' + D.DIAS_LETRA[d] + '</button>').join('') + '</div></div>' +
      '</div>' +
      '<label class="field"><span>Categoría</span><select class="select" name="category">' + H.CATEGORIES.map((c) => '<option value="' + c.id + '"' + (h.category === c.id ? ' selected' : '') + '>' + c.label + '</option>').join('') + '</select></label>' +
      '<label class="field"><span>Descripción (opcional)</span><input class="input" name="description" maxlength="140" value="' + esc(h.description || '') + '"></label>' +
      '<div class="two"><label class="field"><span>Empieza</span><input class="input" type="date" name="startDate" value="' + esc(h.startDate) + '"></label>' +
      '<label class="field"><span>Objetivo</span><select class="select" name="goalId"><option value="">Ninguno</option>' + goals.map((g) => '<option value="' + g.id + '"' + (h.goalId === g.id ? ' selected' : '') + '>' + esc(g.title) + '</option>').join('') + '</select></label></div>' +
      '<div class="card row between" data-kind-hide="negative" style="margin-bottom:18px" ' + (kind === 'negative' ? 'hidden' : '') + '><div><b class="small">Completar al entrenar</b><div class="tiny muted">Se marca solo al finalizar un entrenamiento</div></div><button class="switch ' + (h.linkGym ? 'on' : '') + '" data-act="toggle-on" data-switch="linkGym" aria-pressed="' + !!h.linkGym + '" aria-label="Completar al entrenar"></button></div>';
  }

  function readHabit(sh) {
    const pick = (g) => { const e = sh.querySelector('[data-group="' + g + '"] .on'); return e ? e.dataset.val : null; };
    const num = (n) => { const v = parseFloat(String((sh.querySelector('[name=' + n + ']') || {}).value || '').replace(',', '.')); return isNaN(v) ? 0 : v; };
    const kindHidden = sh.querySelector('[name=kind]');
    const kind = kindHidden ? kindHidden.value : pick('kind') || 'check';
    const v = {
      kind,
      name: sh.querySelector('[name=name]').value.trim(),
      icon: pick('icon') || '✨',
      color: pick('color') || COLORS[0],
      freqType: kind === 'negative' ? 'daily' : pick('freq') || 'daily',
      days: Array.from(sh.querySelectorAll('[data-group="days"] .on')).map((e) => Number(e.dataset.val)),
      timesPerWeek: Number(pick('times')) || 3,
      timesPerMonth: Number(pick('mtimes')) || 8,
      timeOfDay: kind === 'negative' ? '' : pick('tod') || '',
      target: kind === 'check' ? sh.querySelector('[name=target]').value.trim() : '',
      reminderTime: kind === 'negative' ? '' : sh.querySelector('[name=reminderTime]').value,
      reminderDays: Array.from(sh.querySelectorAll('[data-group="remdays"] .on')).map((e) => Number(e.dataset.val)),
      category: sh.querySelector('[name=category]').value,
      description: sh.querySelector('[name=description]').value.trim(),
      startDate: sh.querySelector('[name=startDate]').value || D.today(),
      goalId: sh.querySelector('[name=goalId]').value || null,
      linkGym: kind !== 'negative' && sh.querySelector('[data-switch="linkGym"]').classList.contains('on'),
    };
    if (kind === 'quantity') { v.qtyTarget = num('qtyTarget'); v.qtyUnit = sh.querySelector('[name=qtyUnit]').value.trim(); v.qtyStep = num('qtyStep') || Math.max(1, Math.round(v.qtyTarget / 8)); v.qtyMin = num('qtyMin') || ''; }
    if (kind === 'negative') v.negGoalDays = Number(pick('neggoal')) || 0;
    return v;
  }

  function validHabit(v, sh) {
    if (!v.name) { ASC.ui.fieldError(sh.querySelector('[name=name]'), 'Ponele un nombre al hábito.'); return false; }
    if (v.kind !== 'negative' && v.freqType === 'weekdays' && !v.days.length) { ASC.ui.toast('Elegí al menos un día de la semana.', 'error'); return false; }
    if (v.kind === 'quantity' && !(v.qtyTarget > 0)) { ASC.ui.fieldError(sh.querySelector('[name=qtyTarget]'), 'Indicá una cantidad objetivo mayor a 0.'); return false; }
    if (v.kind === 'quantity' && v.qtyMin && v.qtyMin > v.qtyTarget) { ASC.ui.fieldError(sh.querySelector('[name=qtyMin]'), 'El mínimo no puede ser mayor que el ideal.'); return false; }
    return true;
  }

  Object.assign(ASC.actions, {
    'freeze-use': async (el) => {
      const st = ASC.store.get();
      if (!(await ASC.ui.confirm({ title: '¿Usar un comodín?', text: 'Tu racha de constancia no se corta por ' + D.longLabel(el.dataset.date) + '. Ese día sigue figurando como no cumplido y no suma XP.', ok: 'Usar comodín' }))) return;
      if (!ASC.progress.useFreeze(st, el.dataset.date)) { ASC.ui.toast('No se pudo usar el comodín para ese día.', 'error'); return; }
      ASC.app.commit();
      if (ASC.sound) ASC.sound.play('streak');
      ASC.ui.toast('Racha protegida. Hoy es un buen día para retomar.');
    },
    'relapse-remove': async (el) => {
      if (!(await ASC.ui.confirm({ title: '¿Quitar esta recaída?', text: 'Usalo solo si la registraste por error.', ok: 'Quitar', danger: true }))) return;
      const st = ASC.store.get();
      if (H.removeRelapse(st, el.dataset.id, el.dataset.date) === null) return ASC.ui.toast(ASC.rules.closedMessage(st), 'error');
      ASC.app.commit();
    },
    'week-plan': () => {
      if (ASC.game.commitmentProgress(ASC.store.get(), D.weekStart(D.today()))) return;
      ASC.ui.sheet({ title: 'Planificá tu semana', autofocus: false, body: planSheet() });
    },
    'week-commit': () => {
      const sh = ASC.ui.topSheet();
      const pick = sh.querySelector('[data-group="commit"] .on');
      const st = ASC.store.get();
      const plan = ASC.game.planWeek(st, D.weekStart(D.today()), pick ? pick.dataset.val : 'firme');
      ASC.ui.closeTop();
      ASC.ui.haptic([20, 50, 20]);
      if (!location.hash.startsWith('#/habits')) location.hash = '#/habits?tab=week';
      ASC.app.commit();
      ASC.ui.toast('<b>Desafío aceptado.</b> ' + plan.target + ' check-ins hasta el domingo. Vamos.', 'xp', true);
    },
    'habit-new': () => ASC.ui.sheet({ title: 'Nuevo hábito', body: habitForm() + '<button class="btn primary block" data-act="habit-create">Crear hábito</button>' }),
    'habit-create': () => {
      const sh = ASC.ui.topSheet();
      const v = readHabit(sh);
      if (!validHabit(v, sh)) return;
      const st = ASC.store.get();
      st.habits.push(Object.assign({ id: ASC.store.uid(), archivedAt: null, order: st.habits.length, createdAt: new Date().toISOString() }, v));
      ASC.ui.closeTop();
      ASC.app.commit();
      ASC.ui.toast('Hábito creado. Vamos.');
    },
    'habit-edit': (el) => {
      const h = ASC.store.get().habits.find((x) => x.id === el.dataset.id);
      ASC.ui.sheet({ title: 'Editar hábito', autofocus: false, body: habitForm(h) + '<button class="btn primary block" data-act="habit-save" data-id="' + h.id + '">Guardar cambios</button>' });
    },
    'habit-save': (el) => {
      const sh = ASC.ui.topSheet();
      const v = readHabit(sh);
      if (!validHabit(v, sh)) return;
      const hh = ASC.store.get().habits.find((x) => x.id === el.dataset.id);
      Object.assign(hh, v, { updatedAt: new Date().toISOString() });
      ASC.habits.resyncQty(ASC.store.get(), hh);
      ASC.ui.closeTop();
      ASC.app.commit();
    },
    'habit-archive': async (el) => {
      if (!(await ASC.ui.confirm({ title: '¿Archivar hábito?', text: 'Deja de aparecer en tu día, pero conservás su historial. Podés restaurarlo cuando quieras.', ok: 'Archivar' }))) return;
      ASC.store.get().habits.find((x) => x.id === el.dataset.id).archivedAt = D.today();
      ASC.app.commit();
    },
    'habit-pause': (el) => {
      const h = ASC.store.get().habits.find((x) => x.id === el.dataset.id);
      const opt = (days, label) => '<button class="list-item" data-act="habit-pause-do" data-id="' + h.id + '" data-days="' + days + '"><span class="grow small" style="text-align:left">' + label + '</span>' + icon('chevR', 'sm chev') + '</button>';
      ASC.ui.sheet({ title: 'Pausar ' + h.name, autofocus: false, body:
        '<p class="small muted" style="margin-top:-4px">Mientras esté en pausa no aparece en tu día, no cuenta como incumplido y no corta tu racha. El historial queda intacto.</p><div class="list">' +
        opt(7, '1 semana') + opt(14, '2 semanas') + opt(30, '1 mes') + opt(0, 'Hasta que lo reanude') + '</div>' });
    },
    'habit-pause-do': (el) => {
      const st = ASC.store.get();
      const h = st.habits.find((x) => x.id === el.dataset.id);
      const days = Number(el.dataset.days);
      const today = D.today();
      H.pause(st, h, today, days ? D.addDays(today, days) : null);
      ASC.ui.closeTop();
      ASC.app.commit();
      ASC.ui.toast(h.name + ' en pausa' + (days ? ' hasta el ' + D.shortLabel(D.addDays(today, days)) : '') + '.');
    },
    'habit-resume': (el) => {
      const st = ASC.store.get();
      const h = st.habits.find((x) => x.id === el.dataset.id);
      H.resume(st, h, D.today());
      ASC.app.commit();
      ASC.ui.toast(h.name + ' reanudado. ¡Bienvenido de vuelta!');
    },
    'habit-unarchive': (el) => {
      ASC.store.get().habits.find((x) => x.id === el.dataset.id).archivedAt = null;
      ASC.app.commit();
      ASC.ui.toast('Hábito restaurado.');
    },
    'habit-delete': async (el) => {
      if (!(await ASC.ui.confirm({ title: '¿Eliminar hábito?', text: 'Se borra el hábito y todo su historial. Si solo querés pausarlo, archivalo.', ok: 'Eliminar', danger: true }))) return;
      const st = ASC.store.get();
      ASC.merge && ASC.merge.markDeleted(st, el.dataset.id);
      st.habits = st.habits.filter((x) => x.id !== el.dataset.id);
      delete st.habitLogs[el.dataset.id];
      location.hash = '#/habits';
      ASC.app.commit();
    },
    'goal-new': () => ASC.ui.sheet({ title: 'Nuevo objetivo', body: goalForm() + '<button class="btn primary block" data-act="goal-create">Crear objetivo</button>' }),
    'goal-create': () => {
      const gsh = ASC.ui.topSheet();
      const v = readGoal(gsh);
      if (!v.title) return ASC.ui.fieldError(gsh.querySelector('[name=title]'), 'El objetivo necesita un título.');
      const g = Object.assign({ id: ASC.store.uid(), status: 'active', steps: [], createdAt: new Date().toISOString() }, v);
      ASC.store.get().goals.push(g);
      ASC.ui.closeTop();
      location.hash = '#/goal/' + g.id;
      ASC.app.commit();
    },
    'goal-edit': (el) => {
      const g = ASC.store.get().goals.find((x) => x.id === el.dataset.id);
      ASC.ui.sheet({ title: 'Editar objetivo', autofocus: false, body: goalForm(g) + '<button class="btn primary block" data-act="goal-save" data-id="' + g.id + '">Guardar</button>' });
    },
    'goal-save': (el) => {
      const gsh = ASC.ui.topSheet();
      const v = readGoal(gsh);
      if (!v.title) return ASC.ui.fieldError(gsh.querySelector('[name=title]'), 'El objetivo necesita un título.');
      const g = ASC.store.get().goals.find((x) => x.id === el.dataset.id);
      if (v.manualProgress === undefined) delete v.manualProgress;
      Object.assign(g, v, { updatedAt: new Date().toISOString() });
      ASC.ui.closeTop();
      ASC.app.commit();
    },
    'goal-status': (el) => {
      const g = ASC.store.get().goals.find((x) => x.id === el.dataset.id);
      g.status = el.dataset.val;
      g.completedAt = g.status === 'done' ? new Date().toISOString() : null;
      if (g.status === 'done') ASC.ui.haptic([15, 40, 15]);
      ASC.app.commit();
    },
    'goal-delete': async (el) => {
      if (!(await ASC.ui.confirm({ title: '¿Eliminar objetivo?', text: 'Se borran sus pasos. Los hábitos asociados se conservan.', ok: 'Eliminar', danger: true }))) return;
      const st = ASC.store.get();
      ASC.merge && ASC.merge.markDeleted(st, el.dataset.id);
      st.goals = st.goals.filter((x) => x.id !== el.dataset.id);
      st.habits.forEach((h) => { if (h.goalId === el.dataset.id) h.goalId = null; });
      location.hash = '#/habits?tab=goals';
      ASC.app.commit();
    },
    'step-add': (el) => {
      const i = document.getElementById('new-step');
      const v = i && i.value.trim();
      if (!v) return;
      const g = ASC.store.get().goals.find((x) => x.id === el.dataset.goal);
      g.steps = g.steps || [];
      g.steps.push({ id: ASC.store.uid(), title: v, done: false });
      ASC.app.commit();
      const n = document.getElementById('new-step');
      if (n) n.focus();
    },
    'step-toggle': (el) => {
      const g = ASC.store.get().goals.find((x) => x.id === el.dataset.goal);
      const x = g.steps.find((y) => y.id === el.dataset.id);
      x.done = !x.done;
      if (x.done) { ASC.ui.burst(el); ASC.ui.haptic(10); }
      ASC.app.commit();
    },
    'step-delete': async (el) => {
      if (!(await ASC.ui.confirm({ title: '¿Eliminar paso?', ok: 'Eliminar', danger: true }))) return;
      const g = ASC.store.get().goals.find((x) => x.id === el.dataset.goal);
      g.steps = g.steps.filter((y) => y.id !== el.dataset.id);
      ASC.app.commit();
    },
    'range-out': (el) => {
      const o = el.closest('.field').querySelector('[data-out]');
      if (o) o.textContent = el.value + '%';
    },
    'journal-new': () => ASC.ui.sheet({ title: 'Diario', autofocus: false, body: journalForm() + '<button class="btn primary block" data-act="journal-save">Guardar entrada</button>' }),
    'journal-edit': (el) => {
      const j = ASC.store.get().journal.find((x) => x.id === el.dataset.id);
      ASC.ui.sheet({ title: 'Diario', autofocus: false, body: journalForm(j) + '<button class="btn primary block" data-act="journal-save" data-id="' + j.id + '">Guardar</button><button class="btn danger block mt" data-act="journal-delete" data-id="' + j.id + '">' + icon('trash', 'sm') + 'Eliminar entrada</button>' });
    },
    'journal-privacy': () => {
      const st = ASC.store.get();
      st.settings.privateJournal = !st.settings.privateJournal;
      journalRevealed = false;
      ASC.app.commit();
    },
    'journal-reveal': () => { journalRevealed = true; ASC.app.render(); },
    'journal-save': (el) => {
      const sh = ASC.ui.topSheet();
      const mood = sh.querySelector('[data-group="mood"] .on');
      const v = {
        date: sh.querySelector('[name=date]').value || D.today(),
        mood: mood ? Number(mood.dataset.val) : 0,
        text: sh.querySelector('[name=text]').value.trim(),
        learnings: sh.querySelector('[name=learnings]').value.trim(),
        type: (sh.querySelector('[data-group="jtype"] .on') || { dataset: { val: 'nota' } }).dataset.val,
        title: (sh.querySelector('[name=title]') || { value: '' }).value.trim(),
      };
      if (!v.text && !v.learnings && !v.mood && !v.title) return ASC.ui.toast('Escribí algo o elegí cómo te sentís.');
      const st = ASC.store.get();
      if (el.dataset.id) Object.assign(st.journal.find((x) => x.id === el.dataset.id), v, { updatedAt: new Date().toISOString() });
      else st.journal.push(Object.assign({ id: ASC.store.uid(), createdAt: new Date().toISOString() }, v));
      ASC.ui.closeTop();
      if (!location.hash.includes('journal')) location.hash = '#/habits?tab=journal';
      ASC.app.commit();
    },
    'journal-delete': async (el) => {
      if (!(await ASC.ui.confirm({ title: '¿Eliminar entrada?', text: 'No se puede deshacer.', ok: 'Eliminar', danger: true }))) return;
      const st = ASC.store.get();
      ASC.merge && ASC.merge.markDeleted(st, el.dataset.id);
      st.journal = st.journal.filter((x) => x.id !== el.dataset.id);
      ASC.ui.closeTop();
      ASC.app.commit();
    },
  });

  ASC.screens.habits = {
    render,
    tab: 'habits',
    after(p, q) {
      const st = ASC.store.get();
      if (q.tab === 'calendar') ASC.calendarView.after(q);
      if ((q.tab || 'week') === 'week' && !st.ui.tutorialWeekSeen && st.habits.length && !document.querySelector('.tutorial')) setTimeout(() => ASC.tutorial.open(), 500);
    },
  };
  ASC.screens.habit = { render: (p) => habitDetail(p[0]), tab: 'habits' };
  ASC.screens.goal = { render: (p) => goalDetail(p[0]), tab: 'habits' };
  ASC.habitUI = { goalProgress, MOODS, rankCard };
})(typeof window !== 'undefined' ? window : globalThis);
