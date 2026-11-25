/* ASCEND · Perfil y ajustes */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  const { esc, icon } = ASC.ui;
  const D = ASC.dates;

  function row(ic, label, sub, attrs, right) {
    return '<button class="list-item" ' + attrs + '><span class="icon-btn" style="width:36px;height:36px;background:var(--surface-2)">' + icon(ic, 'sm') + '</span><span class="grow"><span class="small" style="font-weight:600">' + label + '</span>' + (sub ? '<div class="tiny muted">' + sub + '</div>' : '') + '</span>' + (right || icon('chevR', 'sm chev')) + '</button>';
  }

  function notifState() {
    if (!('Notification' in window)) return 'Este navegador no soporta notificaciones: los avisos aparecen dentro de ASCEND.';
    if (Notification.permission === 'granted') return 'Permiso concedido. Los avisos llegan mientras ASCEND esté abierto o en segundo plano; con la app cerrada hace falta un servidor de notificaciones (todavía no configurado).';
    if (Notification.permission === 'denied') return 'Bloqueadas en el navegador. Habilitalas desde la configuración del sitio.';
    return 'Se pide permiso al activar un recordatorio.';
  }

  function render() {
    const st = ASC.store.get();
    const xp = ASC.progress.xp(st);
    const goals = (ASC.onboardingData.GOALS || []).filter((g) => st.profile.goals.includes(g.id));
    const r = st.settings.reminders;
    let s = '<div class="screen"><div class="head"><h1>Perfil</h1></div>';
    s += '<div class="card row" style="gap:14px"><div class="logo-mark" style="width:60px;height:60px;border-radius:20px;font-family:var(--font-display);font-size:28px;font-weight:800">' + esc((st.profile.name || '?').charAt(0).toUpperCase()) + '</div>' +
      '<div class="grow"><div class="num" style="font-size:26px;line-height:1;text-transform:uppercase">' + esc(st.profile.name) + '</div><div class="small muted" style="margin-top:4px">Nivel ' + xp.level.level + ' · ' + esc(xp.level.name) + ' · ' + ASC.ui.fmtNum(xp.total) + ' XP</div>' +
      '<div class="tiny faint" style="margin-top:2px">Usando ASCEND desde el ' + ASC.dates.shortLabel(ASC.dates.toKey(new Date(st.createdAt))) + '</div></div>' +
      '<button class="icon-btn" data-act="profile-edit" aria-label="Editar perfil">' + icon('edit', 'sm') + '</button></div>';

    s += '<div class="section"><div class="section-title">Mis objetivos</div><div class="card"><div class="chips">' +
      (goals.length ? goals.map((g) => '<span class="chip on">' + g.emo + ' ' + esc(g.label) + '</span>').join('') : '<span class="small muted">Sin objetivos generales elegidos.</span>') +
      '</div><button class="btn ghost sm mt" data-act="profile-goals">' + icon('edit', 'xs') + 'Modificar objetivos y áreas</button></div></div>';

    s += '<div class="section"><div class="section-title">Recordatorios</div><div class="list">' +
      reminderRow('habits', 'Hábitos pendientes', r.habits) + reminderRow('gym', 'Aviso de entrenamiento', r.gym) + reminderRow('daily', 'Resumen del día', r.daily) +
      '</div>' +
      '<div class="card mt stack" style="gap:12px">' +
      '<div class="row between" style="gap:10px"><div><b class="small">Pausar recordatorios</b><div class="tiny muted">' + (r.pausedUntil && r.pausedUntil >= D.today() ? 'En pausa hasta el ' + esc(D.shortLabel(r.pausedUntil)) + ' inclusive' : 'Ej: vacaciones') + '</div></div>' +
      (r.pausedUntil && r.pausedUntil >= D.today() ? '<button class="btn ghost sm" data-act="rem-resume">Reanudar</button>' : '<select class="select" style="width:auto" data-change="rem-pause" aria-label="Pausar recordatorios"><option value="">Elegí…</option><option value="1">Hoy</option><option value="3">3 días</option><option value="7">1 semana</option><option value="14">2 semanas</option></select>') + '</div>' +
      '<div class="row between" style="gap:10px;flex-wrap:wrap"><div><b class="small">Horario de silencio</b><div class="tiny muted">Sin avisos en esa franja</div></div><div class="row" style="gap:6px;flex-wrap:wrap;min-width:0">' +
      '<input class="input" style="width:auto;max-width:120px" type="time" value="' + esc(r.quiet.from) + '" data-change="rem-quiet" data-k="from" aria-label="Silencio desde">' +
      '<input class="input" style="width:auto;max-width:120px" type="time" value="' + esc(r.quiet.to) + '" data-change="rem-quiet" data-k="to" aria-label="Silencio hasta">' +
      '<button class="switch ' + (r.quiet.enabled ? 'on' : '') + '" data-act="rem-quiet-toggle" aria-pressed="' + !!r.quiet.enabled + '" aria-label="Activar horario de silencio"></button></div></div></div>' +
      '<p class="tiny faint mt">' + esc(notifState()) + ' Cada hábito y cada rutina pueden tener su propio horario y días.</p></div>';

    if (ASC.motivationUI) s += ASC.motivationUI.section(st);

    s += '<div class="section"><div class="section-title">Administrar</div><div class="list">' +
      '<a class="list-item" href="#/habits"><span class="icon-btn" style="width:36px;height:36px;background:var(--surface-2)">' + icon('habits', 'sm') + '</span><span class="grow small" style="font-weight:600">Hábitos <span class="muted">(' + st.habits.length + ')</span></span>' + icon('chevR', 'sm chev') + '</a>' +
      '<a class="list-item" href="#/gym"><span class="icon-btn" style="width:36px;height:36px;background:var(--surface-2)">' + icon('dumbbell', 'sm') + '</span><span class="grow small" style="font-weight:600">Rutinas <span class="muted">(' + st.routines.length + ')</span></span>' + icon('chevR', 'sm chev') + '</a>' +
      '<a class="list-item" href="#/gym?tab=body"><span class="icon-btn" style="width:36px;height:36px;background:var(--surface-2)">' + icon('scale', 'sm') + '</span><span class="grow small" style="font-weight:600">Perfil físico</span>' + icon('chevR', 'sm chev') + '</a>' +
      '<a class="list-item" href="#/habits?tab=goals"><span class="icon-btn" style="width:36px;height:36px;background:var(--surface-2)">' + icon('target', 'sm') + '</span><span class="grow small" style="font-weight:600">Objetivos <span class="muted">(' + st.goals.length + ')</span></span>' + icon('chevR', 'sm chev') + '</a></div></div>';

    s += '<div class="section"><div class="section-title">Preferencias</div><div class="list">' +
      row('bolt', 'Reducir animaciones', 'Menos movimiento en pantalla', 'data-act="pref-motion" aria-pressed="' + !!st.settings.reduceMotion + '"', '<span class="switch ' + (st.settings.reduceMotion ? 'on' : '') + '" aria-hidden="true"></span>') +
      row('bell', 'Sonidos de celebración', 'Breves, solo al completar o subir de rango', 'data-act="pref-sound" aria-pressed="' + !!st.settings.sound + '"', '<span class="switch ' + (st.settings.sound ? 'on' : '') + '" aria-hidden="true"></span>') +
      row('dumbbell', 'Esfuerzo por serie', { none: 'No registrar', rir: 'RIR (repeticiones en reserva)', rpe: 'RPE (esfuerzo percibido)' }[st.settings.effortScale || 'none'], 'data-act="pref-effort"') +
      row('star', 'Ver tutorial del juego', 'Cómo funcionan rachas, XP, rangos y misiones', 'data-act="tutorial-open"') +
      row('dumbbell', 'Preferencias de entrenamiento', 'Nivel, equipamiento, ejercicios a evitar y organización', 'data-act="gym-prefs"') +
      row('play', 'Menú de inicio del gimnasio', 'Volver a elegir cómo empezar a entrenar', 'data-act="gym-welcome"') +
      '<div class="list-item"><span class="icon-btn" style="width:36px;height:36px;background:var(--surface-2)">' + icon('scale', 'sm') + '</span><span class="grow small" style="font-weight:600">Unidad de peso</span><span class="badge">kg</span></div></div></div>';

    s += '<div class="section"><div class="section-title">Tus datos y copias</div><div class="card" data-storage-info><div class="small muted">Revisando el almacenamiento…</div></div>' +
      '<div class="list mt">' +
      row('copy', 'Crear una copia ahora', 'Se guarda en este dispositivo', 'data-act="backup-now"') +
      row('download', 'Exportar mis datos', 'Archivo JSON para guardar donde quieras', 'data-act="data-export"') +
      row('upload', 'Importar datos', 'Restaurar desde un archivo exportado', 'data-act="data-import"') +
      row('trash', '<span class="red">Borrar todos mis datos</span>', 'Elimina datos y copias de este dispositivo', 'data-act="data-wipe"') + '</div>' +
      '<input type="file" accept="application/json,.json" id="import-file" hidden data-change="data-import-file" aria-label="Archivo para importar">' +
      '<div class="section-title" style="margin-top:22px;font-size:16px">Copias en este dispositivo</div><div class="list" data-backups><div class="list-item small muted">Cargando…</div></div>' +
      '<p class="tiny faint mt">Las copias locales protegen contra errores o datos dañados, pero si el navegador borra sus datos, se borran con ellas. Para estar seguro, exportá un archivo de vez en cuando. La copia semanal automática se crea solo cuando abrís la app.</p></div>';

    s += installSection();
    s += accountSection();
    s += '<div class="section"><div class="section-title">Legal</div><div class="list">' +
      row('lock', 'Política de privacidad', 'Borrador pendiente de revisión legal', 'data-act="legal-open" data-doc="privacidad"') +
      row('edit', 'Términos y condiciones', 'Borrador pendiente de revisión legal', 'data-act="legal-open" data-doc="terminos"') + '</div>' +
      (st.consent ? '<p class="tiny faint mt">Aceptaste los textos el ' + new Date(st.consent.at).toLocaleDateString('es-AR') + '.</p>' : '') + '</div>';

    s += '<p class="tiny faint center mt-lg">' + esc(ASC.brand.name) + ' · versión web ' + esc(ASC.brand.version) + ' · ' + esc(ASC.brand.tagline) + '</p>';
    return s + '</div>';
  }

  /** Instalación como app (PWA) */
  function installSection() {
    const inst = ASC.app.installState ? ASC.app.installState() : {};
    let body;
    if (inst.standalone) body = '<div class="row">' + icon('check', 'sm red') + '<span class="small"><b>Instalada.</b> Estás usando ASCEND como app.</span></div>';
    else if (inst.canPrompt) body = '<p class="small muted" style="margin:0 0 12px">Instalala para abrirla desde la pantalla de inicio, usarla sin conexión y que el navegador cuide mejor tus datos.</p><button class="btn primary sm" data-act="pwa-install">' + icon('download', 'xs') + 'Instalar ASCEND</button>';
    else if (inst.ios) body = '<p class="small muted" style="margin:0">En iPhone o iPad: abrí ASCEND en <b>Safari</b>, tocá <b>Compartir</b> y elegí <b>Agregar a inicio</b>.</p>';
    else if (location.protocol === 'file:') body = '<p class="small muted" style="margin:0">Para instalarla y usarla sin conexión, hay que abrir ASCEND desde un servidor web (ver README), no con doble clic en el archivo.</p>';
    else body = '<p class="small muted" style="margin:0">Si tu navegador lo permite, buscá la opción <b>Instalar app</b> o <b>Agregar a la pantalla de inicio</b> en su menú.</p>';
    body += '<p class="tiny faint" style="margin:10px 0 0">Sin conexión: ' + (inst.sw ? 'disponible (la app ya quedó guardada en este dispositivo).' : 'se activa al abrirla desde un servidor web seguro (https).') + '</p>';
    return '<div class="section"><div class="section-title">Instalar la app</div><div class="card">' + body + '</div></div>';
  }

  /** Cuenta y sincronización: solo muestra acciones si hay un proyecto configurado */
  function accountSection() {
    const sync = ASC.sync;
    let body;
    if (!sync || !sync.isConfigured()) {
      body = '<div class="row" style="align-items:flex-start">' + icon('lock', 'sm') + '<div class="small"><b>No disponible todavía.</b><div class="muted" style="margin-top:4px">La sincronización entre dispositivos está preparada pero falta conectar un servidor (Supabase). Mientras tanto, tus datos quedan solo en este dispositivo: usá <b>Exportar mis datos</b> para pasarlos a otro.</div></div></div>';
    } else if (sync.user()) {
      const st = sync.status();
      body = '<div class="row between small"><span class="muted">Sesión iniciada</span><b>' + esc(sync.user().email || '') + '</b></div>' +
        '<div class="row between small mt"><span class="muted">Estado</span><b>' + esc(st.message || '—') + '</b></div>' +
        '<div class="row mt" style="gap:8px;flex-wrap:wrap"><button class="btn primary sm" data-act="sync-now">Sincronizar ahora</button><button class="btn ghost sm" data-act="sync-signout">Cerrar sesión</button></div>';
    } else {
      body = '<p class="small muted" style="margin:0 0 12px">Creá una cuenta para tener tus datos en varios dispositivos.</p>' +
        '<label class="field"><span>Correo</span><input class="input" type="email" id="acc-email" autocomplete="email"></label>' +
        '<label class="field"><span>Contraseña</span><input class="input" type="password" id="acc-pass" autocomplete="current-password" minlength="8"></label>' +
        '<div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn primary sm" data-act="sync-signin">Ingresar</button><button class="btn ghost sm" data-act="sync-signup">Crear cuenta</button><button class="btn ghost sm" data-act="sync-reset">Olvidé mi contraseña</button></div>';
    }
    return '<div class="section"><div class="section-title">Cuenta y sincronización</div><div class="card">' + body + '</div></div>';
  }

  function reminderRow(key, label, r) {
    return '<div class="list-item"><span class="icon-btn" style="width:36px;height:36px;background:var(--surface-2)">' + icon('bell', 'sm') + '</span><span class="grow small" style="font-weight:600">' + label + '</span>' +
      (r.enabled ? '<input type="time" class="input time-input" value="' + esc(r.time) + '" data-change="rem-time" data-key="' + key + '" aria-label="Horario ' + label + '">' : '') +
      '<button class="switch ' + (r.enabled ? 'on' : '') + '" data-act="rem-toggle" data-key="' + key + '" aria-pressed="' + r.enabled + '" aria-label="' + label + '"></button></div>';
  }

  function download(name, text) {
    const blob = new Blob([text], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  Object.assign(ASC.actions, {
    'profile-edit': () => {
      const st = ASC.store.get();
      ASC.ui.sheet({ title: 'Tu perfil', body: '<label class="field"><span>Nombre o apodo</span><input class="input" name="name" maxlength="30" value="' + esc(st.profile.name) + '"></label><button class="btn primary block" data-act="profile-save">Guardar</button>' });
    },
    'profile-save': () => {
      const v = ASC.ui.topSheet().querySelector('[name=name]').value.trim();
      if (!v) return ASC.ui.fieldError(ASC.ui.topSheet().querySelector('[name=name]'), 'El nombre no puede quedar vacío.');
      ASC.store.get().profile.name = v;
      ASC.ui.closeTop();
      ASC.app.commit();
    },
    'profile-goals': () => {
      const st = ASC.store.get();
      ASC.ui.sheet({ title: 'Objetivos y áreas', autofocus: false, body:
        '<div class="field"><span>Objetivos</span><div class="chips" data-group="pgoals">' + ASC.onboardingData.GOALS.map((g) => '<button class="chip ' + (st.profile.goals.includes(g.id) ? 'on' : '') + '" data-act="toggle-on" data-val="' + g.id + '">' + g.emo + ' ' + esc(g.label) + '</button>').join('') + '</div></div>' +
        '<div class="field"><span>Áreas a mejorar</span><div class="chips" data-group="pareas">' + ASC.habits.CATEGORIES.map((c) => '<button class="chip ' + (st.profile.areas.includes(c.id) ? 'on' : '') + '" data-act="toggle-on" data-val="' + c.id + '">' + esc(c.label) + '</button>').join('') + '</div></div>' +
        '<button class="btn primary block" data-act="profile-goals-save">Guardar</button>' });
    },
    'profile-goals-save': () => {
      const sh = ASC.ui.topSheet();
      const st = ASC.store.get();
      st.profile.goals = Array.from(sh.querySelectorAll('[data-group="pgoals"] .on')).map((x) => x.dataset.val);
      st.profile.areas = Array.from(sh.querySelectorAll('[data-group="pareas"] .on')).map((x) => x.dataset.val);
      ASC.ui.closeTop();
      ASC.app.commit();
    },
    'rem-toggle': async (el) => {
      const r = ASC.store.get().settings.reminders[el.dataset.key];
      r.enabled = !r.enabled;
      if (r.enabled) await ASC.app.requestNotifications();
      ASC.app.commit();
    },
    'rem-pause': (el) => {
      if (!el.value) return;
      ASC.store.get().settings.reminders.pausedUntil = D.addDays(D.today(), Number(el.value) - 1);
      ASC.app.commit();
      ASC.ui.toast('Recordatorios en pausa.');
    },
    'rem-resume': () => { ASC.store.get().settings.reminders.pausedUntil = null; ASC.app.commit(); ASC.ui.toast('Recordatorios activos.'); },
    'rem-quiet': (el) => { ASC.store.get().settings.reminders.quiet[el.dataset.k] = el.value || '00:00'; ASC.store.save(); ASC.ui.toast('Horario guardado.'); },
    'rem-quiet-toggle': () => { const q = ASC.store.get().settings.reminders.quiet; q.enabled = !q.enabled; ASC.app.commit(); },
    'rem-time': (el) => {
      ASC.store.get().settings.reminders[el.dataset.key].time = el.value || '09:00';
      ASC.store.save();
      ASC.ui.toast('Horario guardado.');
    },
    'pwa-install': async () => {
      const ok = await ASC.app.promptInstall();
      ASC.ui.toast(ok ? 'ASCEND se está instalando.' : 'Instalación cancelada.');
      ASC.app.render();
    },
    'sync-signin': () => accountCall('signIn'),
    'sync-signup': () => accountCall('signUp'),
    'sync-reset': () => accountCall('resetPassword'),
    'sync-signout': async () => { try { await ASC.sync.signOut(); } catch (e) { ASC.ui.toast(e.message, 'error'); } ASC.app.render(); },
    'sync-now': async () => {
      try { const r = await ASC.sync.syncNow(); ASC.ui.toast(r.action === 'merged' ? 'Sincronizado: se combinaron cambios de otro dispositivo.' : 'Sincronizado.'); }
      catch (e) { ASC.ui.toast(e.message || 'No se pudo sincronizar.', 'error'); }
      ASC.app.render();
    },
    'pref-sound': () => {
      const st = ASC.store.get();
      st.settings.sound = !st.settings.sound;
      ASC.app.commit();
      if (st.settings.sound) ASC.sound.play('achievement');
    },
    'pref-effort': () => {
      const st = ASC.store.get();
      const cur = st.settings.effortScale || 'none';
      ASC.ui.sheet({ title: 'Esfuerzo por serie', autofocus: false, body:
        '<p class="small muted" style="margin-top:-6px">Opcional: registrá qué tan cerca del fallo quedó cada serie. Sirve para las sugerencias de progresión. Nunca es obligatorio.</p>' +
        '<div class="option-list" data-group="effort">' + [['none', 'No registrar', ''], ['rir', 'RIR · repeticiones en reserva', '0 = no podías hacer ni una más; 3 = te quedaban 3.'], ['rpe', 'RPE · esfuerzo percibido (1 a 10)', '10 = máximo esfuerzo; 7 = te quedaban unas 3 repeticiones.']].map(([v, l, d]) =>
          '<button class="option ' + (cur === v ? 'on' : '') + '" data-act="pick-one" data-val="' + v + '"><span><b>' + l + '</b>' + (d ? '<br><span class="tiny muted">' + d + '</span>' : '') + '</span><span class="tick">' + icon('check') + '</span></button>').join('') + '</div>' +
        '<button class="btn primary block mt" data-act="pref-effort-save">Guardar</button>' });
    },
    'pref-effort-save': () => {
      const on = ASC.ui.topSheet().querySelector('[data-group="effort"] .on');
      ASC.store.get().settings.effortScale = on ? on.dataset.val : 'none';
      ASC.ui.closeTop();
      ASC.app.commit();
    },
    'pref-motion': () => {
      const st = ASC.store.get();
      st.settings.reduceMotion = !st.settings.reduceMotion;
      document.documentElement.classList.toggle('reduce-motion', !!st.settings.reduceMotion);
      ASC.app.commit();
    },
    'backup-now': async () => {
      const b = await ASC.store.createBackup('Copia manual');
      ASC.ui.toast(b ? 'Copia creada en este dispositivo.' : 'Las copias locales no están disponibles en este navegador. Usá Exportar.');
      after();
    },
    'backup-restore': async (el) => {
      if (!(await ASC.ui.confirm({ title: '¿Restaurar esta copia?', text: 'Tus datos actuales se reemplazan por los de la copia. Antes se guarda una copia del estado actual.', ok: 'Restaurar', danger: true }))) return;
      try {
        await ASC.store.restoreBackup(el.dataset.id);
        ASC.perf && ASC.perf.reset();
        ASC.app.commit({ silent: true });
        ASC.ui.toast('Copia restaurada.');
      } catch (e) { ASC.ui.toast(e.message, 'error'); }
    },
    'storage-persist': async () => {
      const r = await ASC.store.requestPersist();
      ASC.ui.toast(r.persisted ? 'Listo: el navegador no borrará tus datos automáticamente.' : 'El navegador no lo concedió por ahora. Instalá la app o exportá tus datos para estar seguro.');
      after();
    },
    'data-export': () => {
      const st = ASC.store.get();
      download('ascend-datos-' + ASC.dates.today() + '.json', JSON.stringify({ app: 'ascend', exportedAt: new Date().toISOString(), data: st }, null, 2));
      ASC.ui.toast('Archivo descargado.');
    },
    'data-import': () => document.getElementById('import-file').click(),
    'data-import-file': (el) => {
      const f = el.files && el.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = async () => {
        let parsed;
        try { parsed = JSON.parse(reader.result); } catch (e) { return ASC.ui.toast('El archivo no es un JSON válido.', 'error'); }
        const data = parsed && parsed.app === 'ascend' ? parsed.data : null;
        if (!data || !data.profile || !Array.isArray(data.habits)) return ASC.ui.toast('Ese archivo no es una exportación de ASCEND.', 'error');
        if (!(await ASC.ui.confirm({ title: '¿Reemplazar tus datos?', text: 'Todo lo que tenés ahora en este navegador se reemplaza por el contenido del archivo.', ok: 'Reemplazar', danger: true }))) return;
        await ASC.store.replaceAll(data);
        ASC.perf && ASC.perf.reset();
        location.hash = '#/home';
        ASC.app.commit({ silent: true });
        ASC.ui.toast('Datos importados.');
      };
      reader.readAsText(f);
      el.value = '';
    },
    'data-wipe': async () => {
      if (!(await ASC.ui.confirm({ title: '¿Borrar todo?', text: 'Se eliminan hábitos, objetivos, diario, rutinas, historial y las copias locales de este dispositivo. Te recomendamos exportar antes.', ok: 'Continuar', danger: true }))) return;
      if (!(await ASC.ui.confirm({ title: 'Última confirmación', text: 'Esta acción no se puede deshacer.', ok: 'Borrar todo', danger: true }))) return;
      await ASC.store.reset();
      ASC.perf && ASC.perf.reset();
      try { localStorage.removeItem('ascend:fired'); } catch (e) {}
      location.hash = '#/home';
      ASC.app.render();
    },
  });

  function fmtBytes(n) {
    if (n == null) return '—';
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
  }

  async function accountCall(kind) {
    const email = document.getElementById('acc-email'), pass = document.getElementById('acc-pass');
    if (!email.value || !/^\S+@\S+\.\S+$/.test(email.value)) return ASC.ui.fieldError(email, 'Ingresá un correo válido.');
    if (kind !== 'resetPassword' && (!pass.value || pass.value.length < 8)) return ASC.ui.fieldError(pass, 'La contraseña debe tener al menos 8 caracteres.');
    try {
      if (kind === 'resetPassword') { await ASC.sync.resetPassword(email.value); ASC.ui.toast('Te enviamos un correo para cambiar la contraseña.'); }
      else if (kind === 'signUp') { await ASC.sync.signUp(email.value, pass.value); ASC.ui.toast('Cuenta creada. Revisá tu correo para confirmarla.'); }
      else { await ASC.sync.signIn(email.value, pass.value); ASC.ui.toast('Sesión iniciada.'); }
      ASC.app.render();
    } catch (e) { ASC.ui.toast(e.message || 'No se pudo completar.', 'error'); }
  }

  /** Completa la información de almacenamiento y la lista de copias (asíncrono) */
  async function after() {
    const box = document.querySelector('[data-storage-info]');
    if (!box) return;
    const info = await ASC.store.storageInfo();
    const modeLabel = { indexeddb: 'IndexedDB (recomendado)', localstorage: 'localStorage (modo de respaldo)', memory: 'Solo memoria: los datos NO se guardan' }[info.mode];
    if (!document.body.contains(box)) return;
    box.innerHTML = '<div class="row between small"><span class="muted">Almacenamiento</span><b>' + esc(modeLabel) + '</b></div>' +
      '<div class="row between small mt"><span class="muted">Protección contra borrado automático</span><b class="' + (info.persisted ? 'red' : '') + '">' + (info.persisted === null ? 'No disponible en este navegador' : info.persisted ? 'Activada' : 'No activada') + '</b></div>' +
      '<div class="row between small mt"><span class="muted">Espacio usado</span><b>' + fmtBytes(info.usage) + '</b></div>' +
      '<div class="row between small mt"><span class="muted">Última copia automática</span><b>' + (info.lastAutoBackup ? new Date(info.lastAutoBackup).toLocaleDateString('es-AR') : 'Todavía no') + '</b></div>' +
      (info.persisted === false ? '<button class="btn ghost sm mt" data-act="storage-persist">' + icon('lock', 'xs') + 'Pedir almacenamiento persistente</button><p class="tiny faint" style="margin:8px 0 0">El navegador decide si lo concede (suele hacerlo si instalás la app o la usás seguido).</p>' : '') +
      (info.error ? '<p class="tiny red" style="margin:8px 0 0">Último error: ' + esc(info.error) + '</p>' : '');
    const list = document.querySelector('[data-backups]');
    const backups = await ASC.store.listBackups();
    if (!list) return;
    list.innerHTML = backups.length ? backups.map((b) => '<div class="list-item"><span class="grow"><b class="small">' + new Date(b.createdAt).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' }) + '</b><div class="tiny muted">' + esc(b.reason) + ' · ' + fmtBytes(b.size) + (b.valid ? '' : ' · <span class="red">dañada</span>') + '</div></span>' +
      (b.valid ? '<button class="btn ghost sm" data-act="backup-restore" data-id="' + esc(b.id) + '">Restaurar</button>' : '') + '</div>').join('')
      : '<div class="list-item small muted">' + (info.mode === 'indexeddb' ? 'Todavía no hay copias.' : 'Las copias locales necesitan IndexedDB, que no está disponible en este navegador.') + '</div>';
  }

  ASC.screens.profile = { render, tab: 'profile', after };
})(typeof window !== 'undefined' ? window : globalThis);
