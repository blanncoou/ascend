/* ASCEND · Núcleo de la app: router, barra inferior, eventos, logros y recordatorios */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  const { icon, esc } = ASC.ui;

  const TABS = [
    { id: 'home', label: 'Inicio', icon: 'home', href: '#/home' },
    { id: 'habits', label: 'Hábitos', icon: 'habits', href: '#/habits' },
    { id: 'gym', label: 'Gimnasio', icon: 'dumbbell', href: '#/gym' },
    { id: 'progress', label: 'Estadísticas', icon: 'chart', href: '#/progress' },
    { id: 'profile', label: 'Perfil', icon: 'user', href: '#/profile' },
  ];

  function parseRoute() {
    const h = (location.hash || '#/home').slice(2);
    const [path, qs] = h.split('?');
    const parts = path.split('/').filter(Boolean);
    const query = {};
    (qs || '').split('&').filter(Boolean).forEach((p) => {
      const [k, v] = p.split('=');
      query[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
    return { name: parts[0] || 'home', params: parts.slice(1), query };
  }

  const root$ = () => document.getElementById('app');

  function render() {
    const st = ASC.store.get();
    const el = root$();
    let screen, route = parseRoute();
    if (!st.profile.onboarded) {
      screen = ASC.screens.onboarding;
      route = { name: 'onboarding', params: [], query: {} };
    } else {
      screen = ASC.screens[route.name] || ASC.screens.home;
      if (!ASC.screens[route.name]) route = { name: 'home', params: [], query: {} };
    }
    let html = '';
    try {
      html = screen.render(route.params, route.query);
    } catch (e) {
      console.error(e);
      html = '<div class="screen"><div class="empty"><h3>Algo salió mal</h3><p>' + esc(e.message) + '</p><a class="btn primary" href="#/home">Volver al inicio</a></div></div>';
    }
    const tab = screen.tab || route.name;
    let chrome = '';
    let hasLive = false;
    if (!screen.noTabs) {
      const active = st.activeSessionId && st.sessions.find((s) => s.id === st.activeSessionId && s.status === 'in_progress');
      if (active) {
        hasLive = true;
        chrome += '<a class="live-bar" href="#/workout"><span class="pulse"></span><span class="grow">Entrenamiento en curso · ' + esc(active.routineName) + '</span><span class="row small">Volver ' + icon('chevR', 'sm') + '</span></a>';
      } else if (st.focus && route.name !== 'focus') {
        hasLive = true;
        const rem = ASC.planner.focusRemaining(st);
        chrome += '<a class="live-bar" href="#/focus"><span class="pulse"></span><span class="grow">Enfoque · ' + esc(st.focus.label) + '</span><span class="row small">' + (rem > 0 ? 'quedan ' + Math.ceil(rem / 60) + ' min' : 'terminado') + ' ' + icon('chevR', 'sm') + '</span></a>';
      }
      // En celular es la barra inferior; en computadora (≥1024 px) se convierte en barra lateral
      const L = ASC.progress.xp(st).level;
      chrome += '<nav class="tabbar" aria-label="Secciones">' +
        '<a class="side-brand" href="#/home"><span class="logo-mark" style="width:38px;height:38px;border-radius:12px"><svg width="20" height="20" viewBox="0 0 24 24">' + ASC.brand.logoPath + '</svg></span><span>' + esc(ASC.brand.name) + '</span></a>' +
        TABS.map((t) =>
        '<a class="tab ' + (t.id === tab ? 'on' : '') + '" href="' + t.href + '" ' + (t.id === tab ? 'aria-current="page"' : '') + '>' + icon(t.icon) + '<span>' + t.label + '</span></a>').join('') +
        '<a class="side-rank" href="#/habits?tab=week">' + ASC.ui.emblem(L.rankIndex, 44) + '<span class="grow"><b>' + esc(L.rank) + '</b><small>Nivel ' + L.level + ' · ' + ASC.ui.fmtNum(L.into) + '/' + ASC.ui.fmtNum(L.needed) + ' XP</small><i class="bar-track"><i class="bar-fill" style="width:' + Math.round(L.pct * 100) + '%"></i></i></span></a>' +
        '</nav>';
    }
    const sameScreen = el.dataset.screen === route.name + '/' + route.params.join('/');
    const y = window.scrollY;
    el.innerHTML = html + chrome;
    el.classList.toggle('has-nav', !screen.noTabs);
    el.classList.toggle('has-live', hasLive);
    el.dataset.screen = route.name + '/' + route.params.join('/');
    if (sameScreen) {
      el.querySelectorAll('.screen').forEach((s) => (s.style.animation = 'none'));
      window.scrollTo(0, y);
    }
    ASC.ui.animateRings(el);
    if (ASC._pop) {
      const b = el.querySelector('.check[data-id="' + ASC._pop + '"]');
      if (b) b.classList.add('pop');
      ASC._pop = null;
    }
    if (screen.after) screen.after(route.params, route.query);
  }

  /** Guarda y vuelve a dibujar. Revisa logros nuevos. */
  function commit(opts) {
    opts = opts || {};
    ASC.game.finalizeWeeks(ASC.store.get());
    if (ASC.rewards) ASC.rewards.finalizeMonths(ASC.store.get());
    ASC.store.save();
    if (!opts.noRender) render();
    checkAchievements(opts.silent);
  }

  /**
   * Detecta progresos nuevos y los celebra: nivel, rango, desafío semanal, misiones, hitos de racha y logros.
   * Se guarda el máximo alcanzado: desmarcar y volver a marcar no repite la celebración.
   */
  function checkAchievements(silent) {
    const st = ASC.store.get();
    if (!st.profile.onboarded) return;
    const x = ASC.progress.xp(st);
    const info = x.level;
    const g = { challenges: x.counts.challenges || 0, missions: x.counts.missions || 0, milestones: (x.breakdown.find((b) => b.key === 'milestones') || {}).count || 0 };
    const seen = st.progressSeen;
    let celebrated = false;
    if (!seen || seen.challenges === undefined) {
      st.progressSeen = Object.assign({ level: info.level, rankIndex: info.rankIndex }, seen || {}, g);
    } else {
      if (!silent) {
        if (info.level > seen.level) {
          if (info.rankIndex > seen.rankIndex) { ASC.ui.rankUp(info); celebrated = true; }
          else ASC.ui.levelUp(info);
        }
        if (g.challenges > seen.challenges) {
          ASC.ui.confetti(80);
          if (!celebrated && ASC.sound) ASC.sound.play('challenge');
          ASC.ui.toast('<b>¡Desafío semanal cumplido!</b> Palabra cumplida.', 'xp', true);
          celebrated = true;
        } else if (g.milestones > seen.milestones) {
          if (ASC.sound) ASC.sound.play('streak');
          ASC.ui.toast('<b>Hito de racha alcanzado.</b> ' + x.best + ' días de constancia.', 'xp', true);
        } else if (g.missions > seen.missions) {
          if (ASC.sound) ASC.sound.play('achievement');
          ASC.ui.toast('<b>Misión cumplida.</b> Sumaste XP de la semana.', 'xp', true);
        }
      }
      st.progressSeen = {
        level: Math.max(seen.level, info.level), rankIndex: Math.max(seen.rankIndex, info.rankIndex),
        challenges: Math.max(seen.challenges, g.challenges), missions: Math.max(seen.missions, g.missions), milestones: Math.max(seen.milestones, g.milestones),
      };
    }
    const list = ASC.progress.achievements(st);
    const fresh = list.filter((a) => a.unlocked && !st.achievementsSeen[a.key]);
    fresh.forEach((a) => (st.achievementsSeen[a.key] = new Date().toISOString()));
    ASC.store.save();
    if (silent || !fresh.length) return;
    if (!celebrated) ASC.ui.celebrate(fresh[0].title, fresh[0].desc);
    const rest = celebrated ? fresh : fresh.slice(1);
    if (rest.length === 1) ASC.ui.toast('Logro desbloqueado: ' + rest[0].title);
    else if (rest.length > 1) ASC.ui.toast('Desbloqueaste ' + rest.length + ' logros más. Miralos en Progreso.');
  }

  /** Al empezar una semana nueva: resumen de la anterior (una sola vez) */
  function weekSummary() {
    const st = ASC.store.get();
    if (!st.profile.onboarded) return;
    const D = ASC.dates;
    const pws = D.addDays(D.weekStart(D.today()), -7);
    const w = st.weeks && st.weeks[pws];
    if (!w || st.ui.lastWeekSummarySeen === pws || (!w.plan && !(w.missions && w.missions.length))) return;
    st.ui.lastWeekSummarySeen = pws;
    ASC.store.save();
    const wx = ASC.game.weekXP(st, pws);
    const cp = ASC.game.commitmentProgress(st, pws);
    const md = (w.missions || []).filter((m) => ASC.game.missionProgress(st, pws, m).done).length;
    if (ASC.sound) ASC.sound.play('week');
    const ov = ASC.ui.dialog('<div class="kicker red" style="font-family:var(--font-display);letter-spacing:3px;font-weight:800">SEMANA TERMINADA</div><h3 style="margin-top:6px">' + D.shortLabel(pws) + ' – ' + D.shortLabel(D.addDays(pws, 6)) + '</h3>' +
      '<p>' + (cp ? (cp.met ? 'Cumpliste tu desafío ' + ASC.game.COMMITMENTS[cp.plan.level].label + '. Eso es disciplina.' : 'Llegaste a ' + cp.done + ' de ' + cp.target + ' check-ins. No perdiste nada: esta semana va de nuevo.') : 'Buen trabajo. Esta semana, aceptá el desafío.') + '</p>' +
      '<div class="stat-grid three" style="margin-bottom:18px"><div><div class="num red" style="font-size:26px">+' + ASC.ui.fmtNum(wx.total) + '</div><div class="tiny muted">XP</div></div><div><div class="num" style="font-size:26px">' + md + '/' + (w.missions || []).length + '</div><div class="tiny muted">misiones</div></div><div><div class="num" style="font-size:26px">' + wx.perfect + '</div><div class="tiny muted">días perfectos</div></div></div>' +
      '<a class="btn primary block" href="#/habits?tab=week" data-ok>Planificar esta semana</a>', 'week-summary');
    ov.addEventListener('click', (e) => { if (e.target.closest('[data-ok]')) ov._close(); });
  }

  /* ---------- Eventos delegados ---------- */
  function onClick(e) {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const fn = ASC.actions[el.dataset.act];
    if (fn) {
      e.preventDefault();
      fn(el, e);
    }
  }
  function onChange(e) {
    const el = e.target.closest('[data-change]');
    if (!el) return;
    const fn = ASC.actions[el.dataset.change];
    if (fn) fn(el, e);
  }
  function onInput(e) {
    const el = e.target.closest('[data-input]');
    if (!el) return;
    const fn = ASC.actions[el.dataset.input];
    if (fn) fn(el, e);
  }

  /* ---------- Recordatorios (mientras la página está abierta) ---------- */
  async function requestNotifications() {
    if (!('Notification' in window)) {
      ASC.ui.toast('Este navegador no permite notificaciones. Los avisos se mostrarán dentro de ASCEND.');
      return false;
    }
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') {
      ASC.ui.toast('Las notificaciones están bloqueadas en el navegador. Podés habilitarlas desde la configuración del sitio.');
      return false;
    }
    const r = await Notification.requestPermission();
    return r === 'granted';
  }

  /** Aviso local: vía service worker si está activo (mejor en Android), si no con la API de Notificaciones, si no dentro de la app */
  function notify(title, body, opts) {
    if ('Notification' in window && Notification.permission === 'granted') {
      if (swReg && swReg.showNotification) {
        swReg.showNotification(title, { body, tag: (opts && opts.tag) || undefined, icon: 'assets/icon-192.png', badge: 'assets/icon-192.png', data: { url: './index.html#/home' } }).catch(() => ASC.ui.toast(title + ' · ' + body));
        return;
      }
      try { new Notification(title, { body }); return; } catch (e) {}
    }
    ASC.ui.toast(title + ' · ' + body);
  }

  /* ---------- PWA ---------- */
  let swReg = null;
  async function registerSW() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return null; // no funciona abriendo el archivo con doble clic
    try {
      swReg = await navigator.serviceWorker.register('sw.js');
      return swReg;
    } catch (e) { return null; } // p. ej. en entornos que bloquean service workers
  }

  let installPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; });
  async function promptInstall() {
    if (!installPrompt) return false;
    installPrompt.prompt();
    const r = await installPrompt.userChoice;
    installPrompt = null;
    return r.outcome === 'accepted';
  }
  function installState() {
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    return { standalone, canPrompt: !!installPrompt, ios, sw: !!swReg };
  }

  function reminderTick() {
    const st = ASC.store.get();
    if (!st.profile.onboarded) return;
    const now = new Date();
    const hhmm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    const today = ASC.dates.today();
    let fired = {};
    try { fired = JSON.parse(localStorage.getItem('ascend:fired') || '{}'); } catch (e) {}
    if (fired.date !== today) fired = { date: today, keys: [] };
    const fire = (key, title, body) => {
      if (fired.keys.includes(key)) return;
      fired.keys.push(key);
      notify(title, body);
    };
    const r = st.settings.reminders;
    if (!ASC.remindersAllowed(r, today, hhmm)) return;
    const tp = ASC.habits.todayProgress(st, today);
    const pending = tp.total - tp.done;
    if (r.habits.enabled && r.habits.time === hhmm && pending > 0) fire('habits', 'Tus hábitos te esperan', 'Te quedan ' + pending + ' hábitos para hoy.');
    if (r.gym.enabled && r.gym.time === hhmm) {
      const nw = ASC.gym.nextWorkout(st, today);
      if (nw && nw.isToday) fire('gym', 'Hoy toca entrenar', nw.routine.name + ' está programada para hoy.');
    }
    if (r.daily.enabled && r.daily.time === hhmm) fire('daily', 'Resumen del día', tp.done + ' de ' + tp.total + ' hábitos completados hoy.');
    const wd = ASC.dates.weekday(today);
    st.habits.forEach((h) => {
      if (h.archivedAt || h.kind === 'negative' || h.reminderTime !== hhmm || ASC.habits.isDone(st, h.id, today)) return;
      // Días del recordatorio: los elegidos, o si no hay, los días en que el hábito toca
      const dayOk = (h.reminderDays && h.reminderDays.length) ? h.reminderDays.includes(wd) : tp.list.includes(h);
      if (dayOk) fire('h-' + h.id, h.icon + ' ' + h.name, h.kind === 'quantity' ? 'Llevás ' + ASC.habits.getQty(st, h.id, today) + ' de ' + h.qtyTarget + ' ' + (h.qtyUnit || '') + '.' : 'Es el momento de este hábito.');
    });
    // Rutinas de hábitos con horario
    (st.habitRoutines || []).forEach((rt) => {
      if (rt.reminderTime !== hhmm) return;
      if (rt.reminderDays && rt.reminderDays.length && !rt.reminderDays.includes(wd)) return;
      const p = ASC.planner.routineProgress(st, rt, today);
      if (p.total && p.done < p.total) fire('r-' + rt.id, rt.name, 'Te quedan ' + (p.total - p.done) + ' de ' + p.total + ' pasos.');
    });
    try { localStorage.setItem('ascend:fired', JSON.stringify(fired)); } catch (e) {}
  }

  /** ¿Se pueden mostrar avisos ahora? (pausa y horario de silencio) */
  ASC.remindersAllowed = function (r, today, hhmm) {
    if (r.pausedUntil && today <= r.pausedUntil) return false;
    const q = r.quiet || {};
    if (q.enabled && q.from && q.to && q.from !== q.to) {
      const inQuiet = q.from < q.to ? hhmm >= q.from && hhmm < q.to : hhmm >= q.from || hhmm < q.to; // cruza medianoche
      if (inQuiet) return false;
    }
    return true;
  };

  /* ---------- Inicio ---------- */
  let lastDay = null;
  async function init() {
    ASC.brand.apply && ASC.brand.apply();
    const report = await ASC.store.init();
    const st = ASC.store.get();
    if (ASC.game.finalizeWeeks(st)) ASC.store.save();
    if (ASC.rewards && ASC.rewards.finalizeMonths(st)) ASC.store.save();
    if (ASC.recovery && ASC.recovery.autoEnd(st)) { ASC.store.save(); ASC.ui.toast('Tu plan para retomar terminó. ¡Bien por volver!'); }
    if (report.migrated) setTimeout(() => ASC.ui.toast('Tus datos se pasaron a un almacenamiento más seguro (IndexedDB). No se perdió nada.'), 800);
    if (report.recovered) setTimeout(() => ASC.ui.toast('Se detectó un problema al leer tus datos y se recuperó la copia del ' + new Date(report.recovered).toLocaleDateString('es-AR') + '.', 'error'), 800);
    // Guardado inmediato al salir o pasar a segundo plano
    window.addEventListener('pagehide', () => ASC.store.flush());
    document.addEventListener('visibilitychange', () => { if (document.hidden) ASC.store.flush(); });
    document.documentElement.classList.toggle('reduce-motion', !!st.settings.reduceMotion);
    document.addEventListener('click', onClick);
    document.addEventListener('change', onChange);
    document.addEventListener('input', onInput);
    window.addEventListener('hashchange', () => {
      const prev = root$().dataset.screen;
      render();
      if (root$().dataset.screen !== prev) window.scrollTo(0, 0);
    });
    document.addEventListener('keydown', (e) => {
      const t = e.target.closest && e.target.closest('[data-enter]');
      if (e.key === 'Enter' && t && ASC.actions[t.dataset.enter]) { e.preventDefault(); ASC.actions[t.dataset.enter](t, e); }
    });
    lastDay = ASC.dates.today();
    // si cambia el día con la app abierta, redibujar
    setInterval(() => {
      const t = ASC.dates.today();
      if (t !== lastDay) { lastDay = t; const cs = ASC.store.get(); if (ASC.game.finalizeWeeks(cs)) ASC.store.save(); if (ASC.rewards.finalizeMonths(cs)) ASC.store.save(); if (ASC.recovery.autoEnd(cs)) ASC.store.save(); render(); weekSummary(); }
      reminderTick();
      if (ASC.motivationUI) ASC.motivationUI.tick();
    }, 30000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { if (ASC.motivationUI) ASC.motivationUI.syncPermission(); render(); reminderTick(); if (ASC.motivationUI) ASC.motivationUI.tick(); } });
    if (ASC.motivationUI) { ASC.motivationUI.syncPermission(); ASC.motivationUI.tick(); }
    render();
    checkAchievements(true);
    setTimeout(weekSummary, 900);
    registerSW();
  }

  ASC.app = { render, commit, init, parseRoute, requestNotifications, notify, promptInstall, installState };
  document.addEventListener('DOMContentLoaded', () => {
    init().catch((e) => {
      console.error(e);
      document.getElementById('app').innerHTML = '<div class="screen"><div class="empty"><h3>No se pudo iniciar</h3><p>' + esc(e.message) + '</p></div></div>';
    });
  });
})(window);
