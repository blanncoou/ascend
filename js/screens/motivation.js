/* ASCEND · Notificaciones motivacionales: pantalla de la bienvenida, configuración y envío
 *
 * Capacidades reales según dónde corre ASCEND:
 *  - App nativa (Capacitor con LocalNotifications): se programan en el sistema → llegan con la app cerrada.
 *  - Web / PWA (hoy): se envían mientras ASCEND está abierta o en segundo plano reciente. Con la app cerrada
 *    no llegan: haría falta Web Push con un servidor (ver docs/NOTIFICACIONES.md). No se simula.
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  const { esc, icon } = ASC.ui;
  const D = ASC.dates;
  const MOT = ASC.motivation;

  /* ---------- Permiso real del dispositivo ---------- */
  function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent); }
  function standalone() { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; }
  function permission() {
    if (ASC.nativeNotify && ASC.nativeNotify.available()) return ASC.nativeNotify.lastPermission();
    if (!('Notification' in window)) return isIOS() && !standalone() ? 'needs-install' : 'unsupported';
    return Notification.permission; // 'granted' | 'denied' | 'default'
  }
  async function requestPermission() {
    if (ASC.nativeNotify && ASC.nativeNotify.available()) return ASC.nativeNotify.request();
    if (!('Notification' in window)) return permission();
    try { return await Notification.requestPermission(); } catch (e) { return Notification.permission; }
  }
  function mode() {
    if (ASC.nativeNotify && ASC.nativeNotify.available()) return 'native';
    return 'web';
  }

  function cfg() {
    const st = ASC.store.get();
    st.settings.motivation = Object.assign({}, MOT.DEFAULTS, st.settings.motivation || {});
    return st.settings.motivation;
  }

  /** Mantiene la configuración alineada con el permiso real (por ejemplo, si se quitó desde el sistema) */
  function syncPermission() {
    const s = cfg();
    const p = permission();
    if (s.enabled && p === 'denied') {
      s.enabled = false;
      s.choice = 'os-denied';
      s.revokedAt = D.today();
      ASC.store.save();
      ASC.ui.toast('Los mensajes motivacionales se desactivaron porque el permiso de notificaciones se quitó en el sistema.');
    }
    if (mode() === 'native') ASC.nativeNotify.resync(ASC.store.get());
  }

  /** Envío (web). Devuelve true si se mostró como notificación del sistema. */
  function deliver(title, body) {
    try {
      if (ASC.app && ASC.app.notify) { ASC.app.notify(title, body, { tag: 'motivacion' }); return true; }
    } catch (e) {}
    return false;
  }

  /** Llamado cada 30 s y al volver a la app */
  function tick() {
    if (mode() === 'native') return; // en la app nativa los programa el sistema
    const st = ASC.store.get();
    const r = MOT.tick(st, new Date(), permission(), deliver);
    if (r.sent || r.reason === 'stale') ASC.store.save();
    return r;
  }

  /* ---------- Pantalla de la bienvenida ---------- */
  let introStep = 'ask'; // 'ask' | 'explain' | 'result'
  let introResult = null;
  function intro() {
    let s = '<div class="screen mot-intro"><div class="mot-hero"><div class="mot-ic" aria-hidden="true">' + icon('bell', 'lg') + '</div>';
    if (introStep === 'ask') {
      s += '<h1>Un mensaje puede cambiar tu día</h1><p class="lead">Recibí pequeños recordatorios para mantener tu enfoque, motivarte y seguir avanzando en tus objetivos.</p></div>' +
        '<ul class="mot-points"><li>' + icon('check', 'xs') + 'Entre 1 y 3 por día, de 9 a 21 h. Lo cambiás cuando quieras.</li><li>' + icon('check', 'xs') + 'Mensajes breves, sin presión ni culpas.</li><li>' + icon('lock', 'xs') + 'Nunca muestran tus hábitos ni datos personales en la pantalla bloqueada.</li></ul>' +
        '<div class="stack mt-lg"><button class="btn primary block" data-act="mot-intro-yes">' + icon('bell', 'sm') + 'Activar mensajes motivacionales</button><button class="btn ghost block" data-act="mot-intro-no">Ahora no</button></div>';
    } else if (introStep === 'explain') {
      const p = permission();
      s += '<h1>Un paso más</h1>';
      if (p === 'needs-install') s += '<p class="lead">En iPhone, las notificaciones web funcionan solo con ASCEND agregada a la pantalla de inicio (iOS 16.4 o posterior). Tu configuración queda guardada: cuando la abras desde el ícono, activalas desde Perfil.</p></div><button class="btn primary block mt-lg" data-act="mot-intro-save-pending">Entendido</button>';
      else if (p === 'unsupported') s += '<p class="lead">Este navegador no permite notificaciones. Tu configuración queda guardada para cuando uses ASCEND desde uno compatible.</p></div><button class="btn primary block mt-lg" data-act="mot-intro-save-pending">Entendido</button>';
      else s += '<p class="lead">Ahora tu ' + (mode() === 'native' ? 'teléfono' : 'navegador') + ' te va a pedir permiso para mostrar notificaciones. Tocá <b>Permitir</b> para recibir los mensajes.</p></div><button class="btn primary block mt-lg" data-act="mot-intro-request">Continuar</button><button class="btn ghost block mt" data-act="mot-intro-no">Mejor ahora no</button>';
    } else {
      const ok = introResult === 'granted';
      s += '<h1>' + (ok ? 'Listo' : 'Sin problema') + '</h1><p class="lead">' + (ok
        ? 'Vas a recibir mensajes breves durante el día. Podés cambiar horarios, cantidad y tipos en Perfil → Notificaciones motivacionales.'
        : 'No se activaron las notificaciones. ASCEND funciona igual; si cambiás de idea, las activás desde Perfil. No te lo vamos a volver a pedir.') + '</p>' +
        (ok && mode() === 'web' ? '<p class="small muted">Por ahora llegan mientras ASCEND está abierta o en segundo plano reciente.</p>' : '') + '</div><button class="btn primary block mt-lg" data-act="mot-intro-done">Ir a ASCEND</button>';
    }
    return s + '</div>';
  }

  /* ---------- Configuración (Perfil) ---------- */
  function statusLine(s) {
    const p = permission();
    if (!s.enabled) return s.choice === 'os-denied' ? { t: 'Desactivadas: el permiso está bloqueado en el sistema.', warn: true } : { t: 'Desactivadas.', warn: false };
    if (p === 'granted') return { t: mode() === 'native' ? 'Activas: programadas en el sistema (llegan con la app cerrada).' : 'Activas mientras ASCEND está abierta o en segundo plano reciente.', warn: false };
    if (p === 'default') return { t: 'Falta tu permiso: tocá el interruptor otra vez para autorizarlas.', warn: true };
    if (p === 'denied') return { t: 'El permiso está bloqueado en el sistema.', warn: true };
    if (p === 'needs-install') return { t: 'En iPhone, instalá ASCEND en la pantalla de inicio para recibirlas.', warn: true };
    return { t: 'Este navegador no permite notificaciones.', warn: true };
  }

  function section(st) {
    const s = Object.assign({}, MOT.DEFAULTS, st.settings.motivation || {});
    const stt = statusLine(s);
    const plan = MOT.planDay(st, D.today());
    const sent = new Set((st.motivationLog || []).filter((x) => x.date === D.today()).map((x) => x.slot));
    const miss = new Set(((st.motivationMissed || {})[D.today()]) || []);
    const off = !s.enabled;
    let h = '<div class="section" id="mot-settings"><div class="section-title">Notificaciones motivacionales</div><div class="card stack mot-card" style="gap:14px">' +
      '<div class="row between" style="gap:12px"><div><b class="small">Mensajes durante el día</b><div class="tiny ' + (stt.warn ? 'red' : 'muted') + '" role="status">' + esc(stt.t) + '</div></div>' +
      '<button class="switch ' + (s.enabled ? 'on' : '') + '" data-act="mot-toggle" aria-pressed="' + s.enabled + '" aria-label="Activar mensajes motivacionales"></button></div>';
    if (permission() === 'denied') h += '<div class="tiny muted">Para volver a permitirlas: ' + (isIOS() ? 'Ajustes → Notificaciones → ASCEND.' : 'tocá el candado junto a la dirección del sitio (o Ajustes del sistema → Apps → ASCEND) y permití las notificaciones.') + ' ASCEND no vuelve a pedirlo por su cuenta.</div>';
    h += '<fieldset class="mot-fields"' + (off ? ' disabled' : '') + '><legend class="sr-only">Preferencias de mensajes motivacionales</legend>' +
      '<div class="two"><label class="field"><span>Desde</span><input class="input" type="time" id="mot-start" value="' + esc(s.start) + '" data-change="mot-time" data-k="start"></label><label class="field"><span>Hasta</span><input class="input" type="time" id="mot-end" value="' + esc(s.end) + '" data-change="mot-time" data-k="end"></label></div>' +
      '<div class="field"><span>Mensajes por día</span><div class="chips" role="group" aria-label="Mensajes por día">' + [1, 2, 3, 4, 5].map((n) => '<button type="button" class="chip day ' + (s.perDay === n ? 'on' : '') + '" data-act="mot-per" data-n="' + n + '" aria-pressed="' + (s.perDay === n) + '">' + n + '</button>').join('') + '</div><div class="tiny faint" style="margin-top:6px">Recomendado: 1 a 3. Nunca llegan dos con menos de una hora entre sí.</div></div>' +
      '<div class="field"><span>Días</span><div class="chips" role="group" aria-label="Días de la semana">' + [1, 2, 3, 4, 5, 6, 0].map((d) => '<button type="button" class="chip day ' + (s.days.includes(d) ? 'on' : '') + '" data-act="mot-day" data-d="' + d + '" aria-pressed="' + s.days.includes(d) + '" aria-label="' + D.DIAS_LARGOS[d] + '">' + D.DIAS_LETRA[d] + '</button>').join('') + '</div></div>' +
      '<div class="field"><span>Tipos de mensaje</span><div class="chips" role="group" aria-label="Tipos de mensaje">' + ASC.motivationData.CATEGORIES.map(([id, l]) => '<button type="button" class="chip ' + (s.categories.includes(id) ? 'on' : '') + '" data-act="mot-cat" data-c="' + id + '" aria-pressed="' + s.categories.includes(id) + '">' + l + '</button>').join('') + '</div></div>' +
      '<div class="row between" style="gap:12px"><div><b class="small">Adaptar a mi día</b><div class="tiny muted">Usa tu progreso de hoy (por ejemplo, si quedan hábitos o toca entrenar) para elegir el mensaje. Se calcula en tu dispositivo y no muestra detalles.</div></div><button type="button" class="switch ' + (s.personalize ? 'on' : '') + '" data-act="mot-personal" aria-pressed="' + s.personalize + '" aria-label="Adaptar los mensajes a mi día"></button></div>' +
      '</fieldset>';
    if (s.enabled && plan.length) h += '<div class="tiny muted">Hoy: ' + plan.map((t, i) => esc(t) + (sent.has(i) ? ' ✓' : miss.has(i) ? ' (no llegó: app cerrada)' : '')).join(' · ') + '</div>';
    else if (s.enabled) h += '<div class="tiny muted">Hoy no hay mensajes programados (día no elegido o franja dentro del horario de silencio).</div>';
    h += '<div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn ghost sm" data-act="mot-test"' + (permission() === 'granted' ? '' : ' disabled') + '>' + icon('bell', 'xs') + 'Probar un mensaje</button></div>' +
      '<details class="tiny muted"><summary>Cómo funcionan</summary><p style="margin:8px 0 0;line-height:1.6">Se eligen de una biblioteca de mensajes por tipo, sin repetir los de los últimos 3 días. ' +
      'Respetan tu franja, los días elegidos, el horario de silencio y la pausa de recordatorios, y no llegan durante un entrenamiento o una sesión de enfoque. ' +
      'Nunca incluyen nombres de hábitos, objetivos ni datos personales, y nada se comparte con terceros. ' +
      (mode() === 'native' ? 'En la app se programan en el sistema, así que llegan aunque ASCEND esté cerrada.' : 'En la versión web llegan solo con ASCEND abierta o en segundo plano reciente: con la app cerrada hace falta la app nativa o un servidor de notificaciones. Un horario que pasó con la app cerrada no se envía tarde.') + '</p></details>' +
      '</div></div>';
    return h;
  }

  function saveAndRefresh(msg) {
    const st = ASC.store.get();
    const errs = MOT.validate(cfg());
    if (Object.keys(errs).length) return errs;
    ASC.app.commit();
    if (mode() === 'native') ASC.nativeNotify.resync(st);
    if (msg) ASC.ui.toast(msg);
    return null;
  }

  async function enableFlow() {
    const s = cfg();
    let p = permission();
    if (p === 'default') p = await requestPermission(); // solo tras un toque del usuario, nunca solo
    if (p === 'granted') { s.enabled = true; s.choice = 'accepted'; delete s.revokedAt; }
    else if (p === 'denied') { s.enabled = false; s.choice = 'os-denied'; }
    else { s.enabled = true; s.choice = 'accepted'; } // sin soporte todavía: queda listo para cuando lo haya
    s.asked = true;
    return p;
  }

  Object.assign(ASC.actions, {
    'mot-intro-yes': () => { introStep = 'explain'; ASC.app.render(); },
    'mot-intro-no': () => { const s = cfg(); s.asked = true; s.choice = 'later'; s.enabled = false; introStep = 'ask'; ASC.app.commit({ silent: true }); location.hash = '#/home'; },
    'mot-intro-request': async () => { introResult = await enableFlow(); introStep = 'result'; ASC.app.commit({ silent: true }); ASC.app.render(); },
    'mot-intro-save-pending': () => { const s = cfg(); s.asked = true; s.choice = 'accepted'; s.enabled = true; introStep = 'ask'; ASC.app.commit({ silent: true }); location.hash = '#/home'; },
    'mot-intro-done': () => { introStep = 'ask'; location.hash = '#/home'; },
    'mot-toggle': async () => {
      const s = cfg();
      if (s.enabled) { s.enabled = false; ASC.app.commit(); if (mode() === 'native') ASC.nativeNotify.resync(ASC.store.get()); return ASC.ui.toast('Mensajes motivacionales desactivados.'); }
      if (permission() === 'denied') { ASC.app.render(); return ASC.ui.toast('El permiso está bloqueado en el sistema: habilitalo ahí primero.', 'error'); }
      const p = await enableFlow();
      ASC.app.commit();
      if (mode() === 'native') ASC.nativeNotify.resync(ASC.store.get());
      ASC.ui.toast(p === 'granted' ? 'Mensajes motivacionales activados.' : p === 'denied' ? 'No se concedió el permiso. Podés habilitarlo desde el sistema.' : 'Guardado. Se activan cuando tu dispositivo lo permita.', p === 'denied' ? 'error' : undefined);
    },
    'mot-time': (el) => {
      const s = cfg();
      const prev = s[el.dataset.k];
      s[el.dataset.k] = el.value || prev;
      const errs = MOT.validate(s);
      if (errs.end) { s[el.dataset.k] = prev; ASC.ui.fieldError(document.getElementById('mot-end'), errs.end); return; }
      saveAndRefresh('Horario guardado.');
    },
    'mot-per': (el) => { cfg().perDay = Number(el.dataset.n); saveAndRefresh(); },
    'mot-day': (el) => {
      const s = cfg(); const d = Number(el.dataset.d);
      const next = s.days.includes(d) ? s.days.filter((x) => x !== d) : s.days.concat(d);
      if (!next.length) return ASC.ui.toast('Elegí al menos un día (o desactivá los mensajes).', 'error');
      s.days = next; saveAndRefresh();
    },
    'mot-cat': (el) => {
      const s = cfg(); const c = el.dataset.c;
      const next = s.categories.includes(c) ? s.categories.filter((x) => x !== c) : s.categories.concat(c);
      if (!next.length) return ASC.ui.toast('Elegí al menos un tipo de mensaje.', 'error');
      s.categories = next; saveAndRefresh();
    },
    'mot-personal': () => { const s = cfg(); s.personalize = !s.personalize; saveAndRefresh(); },
    'mot-test': () => {
      const st = ASC.store.get();
      const m = ASC.motivation.pickMessage(st, D.today(), 99, new Date().getHours() * 60);
      if (!m) return;
      deliver('ASCEND', m.text); // de prueba: no cuenta para el tope diario
      ASC.ui.toast('Mensaje de prueba enviado.');
    },
  });

  ASC.screens['motivation-intro'] = { render: intro, noTabs: true };
  ASC.motivationUI = { section, tick, syncPermission, permission, mode, intro };
})(typeof window !== 'undefined' ? window : globalThis);
