/* ASCEND · Calendario de progreso (Hábitos → Calendario)
 * Vistas: semana, mes, 3, 6 y 12 meses. Intensidad de rojo según el % real del día.
 * Consultar no modifica nada: corregir un día es una acción explícita y respeta la ventana de edición.
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  const { esc, icon } = ASC.ui;
  const D = ASC.dates;
  const C = ASC.calendar;

  const pctTxt = (p) => Math.round(p * 100) + '\u00a0%';
  const cap = (s) => s.replace(/^./, (c) => c.toUpperCase());

  function href(v, a, extra) {
    return '#/habits?tab=calendar&v=' + v + '&a=' + a + (extra || '');
  }

  /** Atributos de una celda según el día */
  function cellAttrs(d) {
    const lbl = D.longLabel(d.key) + ': ' + (d.kind === 'future' ? 'día futuro' : d.kind === 'empty' ? 'sin hábitos programados' : pctTxt(d.pct) + ', ' + d.done + ' de ' + d.scheduled + ' hábitos' + (d.kind === 'pending' ? ', en curso' : ''));
    const cls = 'cd k-' + d.kind + (d.isToday ? ' today' : '') + (d.bucket !== null && d.bucket !== undefined ? ' b' + d.bucket : '');
    const style = d.kind === 'partial' || d.kind === 'full' || (d.kind === 'pending' && d.pct > 0) ? ' style="--a:' + C.alpha(d.pct) + '"' : '';
    return 'class="' + cls + '"' + style + ' data-act="cal-day" data-k="' + d.key + '" aria-label="' + esc(cap(lbl)) + '"';
  }

  /* ---------- Vistas ---------- */
  function weekView(st, p, today) {
    let s = '<div class="cw">';
    D.range(p.from, p.to).forEach((k) => {
      const d = C.dayInfo(st, k, today);
      const dt = D.fromKey(k);
      s += '<button ' + cellAttrs(d) + '><span class="cw-dow">' + D.DIAS_CORTOS[dt.getDay()] + '</span><b class="cw-num">' + dt.getDate() + '</b>' +
        '<span class="cw-pct">' + (d.kind === 'future' ? '' : d.kind === 'empty' ? '—' : pctTxt(d.pct)) + '</span><span class="cw-cnt">' + (d.scheduled ? d.done + '/' + d.scheduled : '') + '</span></button>';
    });
    return s + '</div>';
  }

  function monthGrid(st, mKey, today, compact) {
    const first = D.fromKey(mKey);
    const y = first.getFullYear(), m = first.getMonth();
    let s = '<div class="cm' + (compact ? ' compact' : '') + '">';
    if (!compact) [1, 2, 3, 4, 5, 6, 0].forEach((d) => (s += '<div class="dow" aria-hidden="true">' + D.DIAS_LETRA[d] + '</div>'));
    const lead = (first.getDay() + 6) % 7;
    for (let i = 0; i < lead; i++) s += '<span class="cd-pad" aria-hidden="true"></span>';
    const days = new Date(y, m + 1, 0).getDate();
    for (let n = 1; n <= days; n++) {
      const k = D.toKey(new Date(y, m, n, 12));
      const d = C.dayInfo(st, k, today);
      if (compact) s += '<button ' + cellAttrs(d) + '></button>';
      else {
        const gym = ASC.gym.workedOutOn(st, k);
        s += '<button ' + cellAttrs(d) + '><b>' + n + '</b>' + (d.scheduled && d.kind !== 'future' ? '<small>' + Math.round(d.pct * 100) + '</small>' : '') + (gym ? '<i class="gym-dot" aria-hidden="true"></i>' : '') + '</button>';
      }
    }
    return s + '</div>';
  }

  function multiView(st, p, today) {
    return '<div class="cms v-' + p.view + '">' + p.months.map((mk) => {
      const d = D.fromKey(mk);
      const sum = C.summary(st, mk, C.monthEnd(mk), today);
      return '<div class="cms-m"><a class="cms-h" href="' + href('month', mk) + '" aria-label="Ver ' + D.monthLabel(d.getFullYear(), d.getMonth()) + ' en vista de mes"><span>' + D.MESES_CORTOS[d.getMonth()] + (d.getMonth() === 0 || mk === p.months[0] ? ' ' + String(d.getFullYear()).slice(2) : '') + '</span><small>' + (sum.avg === null ? '—' : pctTxt(sum.avg)) + '</small></a>' + monthGrid(st, mk, today, true) + '</div>';
    }).join('') + '</div>';
  }

  function legend() {
    const sw = (cls, style, label) => '<span class="lg-i"><i class="cd ' + cls + '"' + (style ? ' style="' + style + '"' : '') + ' aria-hidden="true"></i>' + label + '</span>';
    return '<div class="cal-legend" aria-label="Leyenda de colores"><div class="lg-scale"><span class="tiny muted">Menos</span>' +
      [0.12, 0.37, 0.62, 0.87].map((p) => '<i class="cd k-partial" style="--a:' + C.alpha(p) + '" aria-hidden="true"></i>').join('') + '<i class="cd k-full" aria-hidden="true"></i><span class="tiny muted">Más</span></div>' +
      '<div class="lg-items tiny muted">' + sw('k-full', '', '100 %') + sw('k-partial', '--a:' + C.alpha(0.87), '75–99 %') + sw('k-partial', '--a:' + C.alpha(0.62), '50–74 %') + sw('k-partial', '--a:' + C.alpha(0.37), '25–49 %') + sw('k-partial', '--a:' + C.alpha(0.12), '1–24 %') +
      sw('k-zero', '', '0 %') + sw('k-empty', '', 'Sin hábitos programados') + sw('k-future', '', 'Futuro') + '</div>' +
      '<p class="tiny faint" style="margin:8px 0 0">El rojo crece de forma continua con el % del día. Los hábitos con cantidad suman su avance parcial.</p></div>';
  }

  function stats(st, p, today) {
    const s = C.summary(st, p.from, p.to, today);
    const tile = (v, k, sub) => '<div class="stat"><div class="v">' + v + '</div><div class="k">' + k + '</div>' + (sub ? '<div class="tiny faint">' + sub + '</div>' : '') + '</div>';
    const best = s.best ? tile(pctTxt(s.best.pct), 'mejor día', D.shortLabel(s.best.key)) : tile('—', 'mejor día');
    let html = '<div class="cal-stats">' +
      tile(s.avg === null ? '—' : pctTxt(s.avg), 'promedio', s.counted ? s.counted + (s.counted === 1 ? ' día' : ' días') + ' con hábitos' : 'sin días con hábitos') +
      tile(s.full, 'días al 100\u00a0%') + tile(s.partial, 'parciales') + tile(s.zero, 'sin cumplir') + best +
      (s.streak !== null ? tile(s.streak, 'racha actual', s.streak === 1 ? 'día' : 'días') : tile('—', 'racha actual', 'período pasado')) + '</div>';
    const notes = [];
    if (s.includesToday && C.dayInfo(st, today, today).kind === 'pending') notes.push('Hoy se suma a las estadísticas cuando completes todos tus hábitos o termine el día.');
    if (s.empty) notes.push(s.empty + (s.empty === 1 ? ' día sin hábitos programados no cuenta.' : ' días sin hábitos programados no cuentan.'));
    if (notes.length) html += '<p class="tiny faint" style="margin:8px 2px 0">' + notes.join(' ') + '</p>';
    return html;
  }

  /* ---------- Pantalla ---------- */
  function render(q) {
    const st = ASC.store.get();
    const today = D.today();
    const view = C.VIEWS.some((v) => v.id === q.v) ? q.v : 'month';
    const anchor = /^\d{4}-\d{2}-\d{2}$/.test(q.a || '') ? q.a : today;
    const p = C.period(view, anchor);
    const isCurrent = p.from <= today && today <= p.to;
    const anim = q.dir === '1' ? ' anim-next' : q.dir === '-1' ? ' anim-prev' : q.dir === '0' ? ' anim-fade' : '';
    let s = '<div class="calv">';
    s += '<nav class="seg cal-views" aria-label="Período del calendario">' + C.VIEWS.map((v) => '<a href="' + href(v.id, anchor, '&dir=0') + '" class="' + (v.id === view ? 'on' : '') + '"' + (v.id === view ? ' aria-current="page"' : '') + ' aria-label="' + v.label + '"><span class="lbl-l" aria-hidden="true">' + v.label + '</span><span class="lbl-s" aria-hidden="true">' + v.short + '</span></a>').join('') + '</nav>';
    s += '<div class="cal-nav"><button class="icon-btn" data-act="cal-go" data-h="' + href(view, C.shift(view, anchor, -1), '&dir=-1') + '" data-f="prev" aria-label="Período anterior">' + icon('chevL', 'sm') + '</button>' +
      '<div class="cal-nav-mid"><h2 class="cal-title" aria-live="polite">' + esc(cap(C.periodLabel(p))) + '</h2>' + (isCurrent ? '' : '<button class="btn ghost sm" data-act="cal-go" data-h="' + href(view, today, '&dir=0') + '" data-f="today">Ir a hoy</button>') + '</div>' +
      '<button class="icon-btn" data-act="cal-go" data-h="' + href(view, C.shift(view, anchor, 1), '&dir=1') + '" data-f="next" aria-label="Período siguiente">' + icon('chevR', 'sm') + '</button></div>';
    s += stats(st, p, today);
    s += '<div class="card cal-card v-' + view + anim + '">';
    if (!st.habits.some((h) => h.kind !== 'negative')) s += '<p class="small muted" style="margin:0 0 12px">Todavía no tenés hábitos: cuando los marques, cada día se va a pintar según tu cumplimiento.</p>';
    s += view === 'week' ? weekView(st, p, today) : view === 'month' ? monthGrid(st, p.from, today, false) : multiView(st, p, today);
    s += '</div>' + legend();
    if (q.edit && q.d) s += editPanel(st, q.d, today, view, anchor);
    return s + '</div>';
  }

  /** Panel de corrección: solo si el usuario lo pide y la fecha sigue editable */
  function editPanel(st, key, today, view, anchor) {
    const det = C.dayDetail(st, key, today);
    let s = '<div class="section cal-edit" id="cal-edit"><div class="row between"><div class="section-title" style="text-transform:none;margin:0">Corregir: ' + esc(D.longLabel(key)) + '</div><a class="btn ghost sm" href="' + href(view, anchor) + '">Listo</a></div>';
    if (!det.editable) return s + '<div class="card small muted mt">' + icon('lock', 'xs') + ' ' + esc(ASC.rules.closedMessage(st)) + '</div></div>';
    const list = ASC.habits.habitsForDay(st, key);
    const extra = st.habits.filter((h) => h.kind !== 'negative' && !list.includes(h) && ASC.habits.isDone(st, h.id, key));
    const all = list.concat(extra);
    s += '<p class="tiny faint">Los cambios se guardan al tocar cada hábito y el calendario se actualiza al instante.</p>';
    s += all.length ? all.map((h) => ASC.homeHelpers.habitRow(st, h, key)).join('') : '<div class="card small muted">No había hábitos programados este día.</div>';
    return s + '</div>';
  }

  /* ---------- Detalle del día (solo lectura) ---------- */
  function openDay(key) {
    const st = ASC.store.get();
    const today = D.today();
    const det = C.dayDetail(st, key, today);
    const i = det.info;
    const y = D.fromKey(key).getFullYear();
    const title = cap(D.longLabel(key)) + (y !== D.fromKey(today).getFullYear() ? ' de ' + y : '');
    const stateTxt = { full: 'Día completo', partial: 'Cumplimiento parcial', zero: 'Sin cumplimiento', pending: 'Hoy · en curso', empty: 'Sin hábitos programados', future: 'Día futuro' }[i.kind];
    let b = '';
    if (i.kind === 'future') {
      const n = ASC.habits.habitsForDay(st, key).length;
      b += '<p class="small muted" style="margin-top:0">' + stateTxt + '. ' + (n ? n + (n === 1 ? ' hábito programado.' : ' hábitos programados.') : 'No hay hábitos programados.') + ' Los días futuros no cuentan como incumplidos.</p>';
    } else {
      b += '<div class="dd-head"><div class="dd-pct ' + (i.kind === 'empty' ? 'k-empty' : '') + '"' + (i.scheduled ? ' style="--a:' + C.alpha(i.pct) + '"' : '') + '><b>' + (i.scheduled ? pctTxt(i.pct) : '—') + '</b></div><div><b>' + stateTxt + '</b><div class="tiny muted">' + (i.scheduled ? 'Cumplimiento del día' : 'Este día no suma ni resta') + '</div></div></div>';
      if (i.scheduled) {
        b += '<div class="stat-grid three mt" style="gap:8px"><div class="stat"><div class="v">' + i.done + '<small>/' + i.scheduled + '</small></div><div class="k">completados</div></div><div class="stat"><div class="v">' + det.pending.length + '</div><div class="k">pendientes</div></div><div class="stat"><div class="v">' + det.xp.total + '</div><div class="k">XP del día</div></div></div>';
        b += '<div class="bar-track mt" aria-hidden="true"><div class="bar-fill" style="width:' + Math.round(i.pct * 100) + '%"></div></div>';
      }
      if (det.qty.length) {
        b += '<div class="dd-sec"><b class="small">Cantidades</b>' + det.qty.map((x) => '<div class="dd-qty"><div class="row between small"><span>' + esc(x.habit.emoji || '') + ' ' + esc(x.habit.name) + '</span><span class="muted">' + ASC.homeHelpers.fmtQty(x.value) + ' / ' + ASC.homeHelpers.fmtQty(x.target) + ' ' + esc(x.unit) + ' · ' + pctTxt(x.frac) + '</span></div><div class="bar-track"><div class="bar-fill" style="width:' + Math.round(x.frac * 100) + '%"></div></div></div>').join('') + '</div>';
      }
      if (det.done.length) b += '<div class="dd-sec"><b class="small">Realizados (' + det.done.length + ')</b>' + det.done.map((x) => '<div class="dd-h done">' + icon('check', 'xs') + '<span>' + esc(x.habit.emoji || '') + ' ' + esc(x.habit.name) + '</span></div>').join('') + '</div>';
      if (det.pending.length) b += '<div class="dd-sec"><b class="small">' + (i.isToday ? 'Pendientes' : 'No realizados') + ' (' + det.pending.length + ')</b>' + det.pending.map((x) => '<div class="dd-h">' + '<i class="dd-o" aria-hidden="true"></i><span>' + esc(x.habit.emoji || '') + ' ' + esc(x.habit.name) + (x.frac > 0 ? ' <span class="tiny muted">· ' + pctTxt(x.frac) + '</span>' : '') + '</span></div>').join('') + '</div>';
      if (det.xp.rows.length) b += '<div class="dd-sec"><b class="small">XP obtenida: ' + det.xp.total + '</b><div class="tiny muted">' + det.xp.rows.map((r) => esc(r.label) + ' +' + r.xp).join(' · ') + '</div><div class="tiny faint" style="margin-top:4px">No incluye la XP semanal (misiones, desafíos) ni los hitos de racha.</div></div>';
      if (det.workouts.length) b += '<div class="dd-sec"><b class="small">Entrenamientos</b>' + det.workouts.map((w) => '<div class="dd-h">' + icon('dumbbell', 'xs') + '<span>' + esc(w.routineName || w.name || 'Entrenamiento libre') + '</span></div>').join('') + '</div>';
      if (det.relapses.length) b += '<div class="dd-sec"><b class="small">Recaídas registradas</b><div class="tiny muted">' + det.relapses.map(esc).join(', ') + '</div></div>';
      if (det.journal.length) {
        const MOODS = (ASC.habitUI && ASC.habitUI.MOODS) || [];
        b += '<div class="dd-sec"><b class="small">Diario</b>' + det.journal.map((j) => '<div class="dd-j">' + (j.mood && MOODS[j.mood - 1] ? '<span aria-label="Ánimo: ' + MOODS[j.mood - 1][1] + '">' + MOODS[j.mood - 1][0] + '</span> ' : '') + esc(String(j.text || '').slice(0, 280)) + (String(j.text || '').length > 280 ? '…' : '') + '</div>').join('') + '</div>';
      }
      if (det.editable && i.kind !== 'empty') b += '<button class="btn ghost block mt" data-act="cal-edit" data-k="' + key + '">' + icon('edit', 'xs') + 'Corregir este día</button>';
      else if (i.scheduled && !det.editable) b += '<p class="tiny faint mt">' + icon('lock', 'xs').replace('class="icon', 'style="display:inline;vertical-align:-2px" class="icon') + ' Día cerrado: solo se puede consultar.</p>';
    }
    b += '<button class="btn block mt" data-close>Cerrar</button>';
    ASC.ui.sheet({ title, autofocus: false, body: b });
  }

  function currentQuery() {
    return ASC.app.parseRoute().query;
  }

  Object.assign(ASC.actions, {
    'cal-day': (el) => openDay(el.dataset.k),
    'cal-go': (el) => {
      ASC._calFocus = el.dataset.f;
      location.hash = el.dataset.h;
    },
    'cal-edit': (el) => {
      const q = currentQuery();
      ASC.ui.closeTop();
      ASC._calFocus = 'edit';
      location.hash = href(q.v || 'month', q.a || D.today(), '&d=' + el.dataset.k + '&edit=1');
    },
  });

  /** Después de dibujar: devolver el foco al control usado (teclado) y llevar al panel de corrección */
  function after(q) {
    const f = ASC._calFocus;
    ASC._calFocus = null;
    if (f === 'edit') {
      const e = document.getElementById('cal-edit');
      if (e) { e.scrollIntoView({ behavior: 'smooth', block: 'start' }); const b = e.querySelector('button, a'); if (b) b.focus({ preventScroll: true }); }
    } else if (f) {
      const b = document.querySelector('[data-act="cal-go"][data-f="' + f + '"]') || document.querySelector('[data-act="cal-go"][data-f="prev"]');
      if (b) b.focus();
    }
  }

  ASC.calendarView = { render, after, openDay };
})(typeof window !== 'undefined' ? window : globalThis);
