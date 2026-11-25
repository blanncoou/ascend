/* ASCEND · Onboarding (breve, progresivo, todo salteable salvo el nombre) */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  const { esc, icon } = ASC.ui;

  const GOALS = [
    { id: 'disciplina', label: 'Mejorar la disciplina', emo: '⚡' },
    { id: 'tiempo', label: 'Organizar mejor el tiempo', emo: '🗓️' },
    { id: 'leer', label: 'Leer más', emo: '📖' },
    { id: 'estudiar', label: 'Estudiar', emo: '📚' },
    { id: 'dormir', label: 'Dormir mejor', emo: '😴' },
    { id: 'redes', label: 'Menos tiempo en redes', emo: '📵' },
    { id: 'alimentacion', label: 'Mejorar la alimentación', emo: '🥗' },
    { id: 'constancia', label: 'Desarrollar constancia', emo: '🔁' },
    { id: 'fisico', label: 'Mejorar el estado físico', emo: '🏋️' },
  ];

  const SUGGEST = {
    disciplina: [{ name: 'Levantarse temprano', icon: '⏰', category: 'productividad' }],
    tiempo: [{ name: 'Planificar el día', icon: '🗓️', category: 'organizacion' }],
    leer: [{ name: 'Leer 20 minutos', icon: '📖', category: 'lectura' }],
    estudiar: [{ name: 'Estudiar una hora', icon: '📚', category: 'estudio', freqType: 'weekdays', days: [1, 2, 3, 4, 5] }],
    dormir: [{ name: 'Dormir a horario', icon: '😴', category: 'salud' }],
    redes: [{ name: 'Menos de 1 h en redes', icon: '📵', category: 'mentalidad' }],
    alimentacion: [{ name: 'Tomar 2 litros de agua', icon: '💧', category: 'salud' }],
    constancia: [{ name: 'Meditar 10 minutos', icon: '🧘', category: 'mentalidad' }],
    fisico: [
      { name: 'Entrenar', icon: '🏋️', category: 'fitness', freqType: 'weekly', timesPerWeek: 3, linkGym: true },
      { name: 'Caminar 30 minutos', icon: '🚶', category: 'fitness' },
    ],
  };

  const COLORS = ['#F04459', '#ff7a1a', '#ffc21a', '#3ddc84', '#1ec8ff', '#5b7cff', '#b45bff', '#ff4fa3'];

  let ob = null;
  function fresh() {
    return { step: 0, name: '', goals: [], areas: [], habits: [], custom: '', trainsGym: null, level: '', fitGoal: '', days: [], remindOn: false, remindTime: '09:00' };
  }

  function suggestions() {
    const out = [];
    const seen = new Set();
    const goals = ob.goals.length ? ob.goals : ['alimentacion', 'leer'];
    goals.forEach((g) => (SUGGEST[g] || []).forEach((s) => { if (!seen.has(s.name)) { seen.add(s.name); out.push(s); } }));
    return out;
  }

  const STEPS = 8;
  function progress() {
    let s = '<div class="ob-progress">';
    for (let i = 1; i <= STEPS; i++) s += '<i class="' + (i <= ob.step ? 'on' : '') + '"></i>';
    return s + '</div>';
  }

  function option(id, label, emo, on, act) {
    return '<button class="option ' + (on ? 'on' : '') + '" data-act="' + act + '" data-id="' + esc(id) + '">' +
      (emo ? '<span class="emo">' + emo + '</span>' : '') + '<span>' + esc(label) + '</span><span class="tick">' + icon('check') + '</span></button>';
  }

  function nav(nextLabel, canSkip) {
    return '<div class="actions"><button class="btn primary block" data-act="ob-next">' + esc(nextLabel || 'Continuar') + '</button>' +
      (canSkip ? '<button class="btn ghost block" data-act="ob-skip">Omitir por ahora</button>' : '') +
      (ob.step > 1 ? '<button class="btn ghost block" data-act="ob-back">Volver</button>' : '') + '</div>';
  }

  function render() {
    if (!ob) ob = fresh();
    const B = ASC.brand;
    if (ob.step === 0) {
      return '<div class="ob ob-welcome"><div class="logo"><div class="logo-mark"><svg width="28" height="28" viewBox="0 0 24 24">' + B.logoPath + '</svg></div><div class="logo-word">' + esc(B.name) + '</div></div>' +
        '<div class="big-claim">' + B.claim.join('<br>') + '</div>' +
        '<p class="lead" style="position:relative">Hábitos, objetivos y gimnasio en un solo centro de control. Construí disciplina sin presión innecesaria.</p>' +
        '<div class="actions"><button class="btn primary block" data-act="ob-next">Empezar</button>' +
        '<p class="tiny faint center" style="margin:4px 0 0">Demo web: tus datos se guardan solo en este navegador. Las cuentas y la sincronización llegan con la app.</p></div></div>';
    }
    let body = '';
    if (ob.step === 1) {
      body = '<h1>¿Cómo te llamamos?</h1><p class="lead">Tu nombre o apodo. Lo vas a ver cada mañana.</p>' +
        '<input class="input big" id="ob-name" aria-label="Tu nombre o apodo" maxlength="30" placeholder="Tu nombre" value="' + esc(ob.name) + '" autocomplete="given-name">' + nav('Continuar', false);
    } else if (ob.step === 2) {
      body = '<h1>¿Qué querés lograr?</h1><p class="lead">Elegí los que quieras. Los usamos para sugerirte hábitos.</p><div class="option-list">' +
        GOALS.map((g) => option(g.id, g.label, g.emo, ob.goals.includes(g.id), 'ob-goal')).join('') + '</div>' + nav('Continuar', true);
    } else if (ob.step === 3) {
      body = '<h1>Áreas a mejorar</h1><p class="lead">Así organizamos tus hábitos y estadísticas.</p><div class="chips">' +
        ASC.habits.CATEGORIES.map((c) => '<button class="chip ' + (ob.areas.includes(c.id) ? 'on' : '') + '" data-act="ob-area" data-id="' + c.id + '">' + esc(c.label) + '</button>').join('') + '</div>' + nav('Continuar', true);
    } else if (ob.step === 4) {
      const sug = suggestions();
      if (!ob.habitsInit) { ob.habits = sug.map((s) => s.name); ob.habitsInit = true; }
      const customs = ob.habits.filter((n) => !sug.some((s) => s.name === n));
      body = '<h1>Tus primeros hábitos</h1><p class="lead">Empezá con pocos. Después podés editarlos o crear los tuyos.</p><div class="option-list">' +
        sug.map((s) => option(s.name, s.name + (s.freqType === 'weekly' ? ' · ' + s.timesPerWeek + '×/sem' : s.freqType === 'weekdays' ? ' · L a V' : ''), s.icon, ob.habits.includes(s.name), 'ob-habit')).join('') +
        customs.map((n) => option(n, n, '✨', true, 'ob-habit')).join('') +
        '</div><div class="row mt"><input class="input grow" id="ob-custom" aria-label="Crear un hábito propio" maxlength="40" placeholder="Crear uno propio…"><button class="icon-btn red" data-act="ob-add-custom" aria-label="Agregar">' + icon('plus') + '</button></div>' + nav('Continuar', true);
    } else if (ob.step === 5) {
      body = '<h1>¿Entrenás en gimnasio?</h1><p class="lead">Si es así, activamos tu registro de entrenamiento.</p><div class="option-list">' +
        option('si', 'Sí, entreno', '🏋️', ob.trainsGym === true, 'ob-gym') + option('no', 'Todavía no', '🙂', ob.trainsGym === false, 'ob-gym') + '</div>' + nav('Continuar', true);
    } else if (ob.step === 6) {
      const lv = ['Principiante', 'Intermedio', 'Avanzado'];
      const fg = ['Hipertrofia', 'Fuerza', 'Resistencia', 'Acondicionamiento físico', 'Mantenimiento'];
      body = '<h1>Tu entrenamiento</h1><p class="lead">Opcional. Lo podés cambiar en tu perfil físico.</p>' +
        '<div class="field"><span>Nivel</span><div class="chips">' + lv.map((l) => '<button class="chip ' + (ob.level === l ? 'on' : '') + '" data-act="ob-level" data-id="' + l + '">' + l + '</button>').join('') + '</div></div>' +
        '<div class="field"><span>Objetivo físico</span><div class="chips">' + fg.map((l) => '<button class="chip ' + (ob.fitGoal === l ? 'on' : '') + '" data-act="ob-fitgoal" data-id="' + l + '">' + l + '</button>').join('') + '</div></div>' +
        '<div class="field"><span>Días disponibles</span><div class="chips">' + [1, 2, 3, 4, 5, 6, 0].map((d) => '<button class="chip day ' + (ob.days.includes(d) ? 'on' : '') + '" data-act="ob-day" data-id="' + d + '">' + ASC.dates.DIAS_LETRA[d] + '</button>').join('') + '</div></div>' + nav('Continuar', true);
    } else if (ob.step === 7) {
      body = '<h1>Recordatorios</h1><p class="lead">Un aviso por día para revisar tus hábitos. Nada más.</p>' +
        '<div class="card"><div class="row between"><div><b>Recordatorio diario</b><div class="small muted">Te avisa si tenés hábitos pendientes</div></div><button class="switch ' + (ob.remindOn ? 'on' : '') + '" data-act="ob-remind" aria-label="Activar recordatorio" aria-pressed="' + ob.remindOn + '"></button></div>' +
        (ob.remindOn ? '<div class="row between mt"><span class="muted">Horario</span><input type="time" class="input time-input" id="ob-time" value="' + esc(ob.remindTime) + '"></div>' : '') + '</div>' +
        '<p class="tiny faint mt">En la web, los avisos llegan mientras ASCEND esté abierto en el navegador. En la app serán notificaciones del sistema.</p>' + nav('Continuar', true);
    } else if (ob.step === 8) {
      body = '<h1>Todo listo, ' + esc(ob.name) + '.</h1><p class="lead">Tu centro de control está armado. El primer paso es el más importante: completá un hábito hoy.</p>' +
        '<div class="card pad-lg"><div class="stack small">' +
        '<div class="row">' + icon('habits', 'sm red') + '<span><b>' + ob.habits.length + '</b> ' + (ob.habits.length === 1 ? 'hábito' : 'hábitos') + ' para empezar</span></div>' +
        '<div class="row">' + icon('target', 'sm red') + '<span><b>' + ob.goals.length + '</b> ' + (ob.goals.length === 1 ? 'objetivo elegido' : 'objetivos elegidos') + '</span></div>' +
        '<div class="row">' + icon('dumbbell', 'sm red') + '<span>' + (ob.trainsGym ? 'Registro de gimnasio activado' : 'Gimnasio disponible cuando quieras') + '</span></div></div></div>' +
        '<label class="consent mt"><input type="checkbox" id="ob-consent" data-change="ob-consent"' + (ob.consent ? ' checked' : '') + '><span class="small">Leí y acepto la <button type="button" class="link" data-act="legal-open" data-doc="privacidad">política de privacidad</button> y los <button type="button" class="link" data-act="legal-open" data-doc="terminos">términos</button>. Entiendo que los datos de peso, medidas y ánimo son opcionales y quedan solo en este dispositivo.</span></label>' +
        '<p class="tiny faint" style="margin:6px 0 0">Textos en versión borrador, pendientes de revisión legal.</p>' +
        '<div class="actions"><button class="btn primary block" data-act="ob-finish"' + (ob.consent ? '' : ' disabled aria-disabled="true"') + '>Entrar a ASCEND</button><button class="btn ghost block" data-act="ob-back">Volver</button></div>';
    }
    return '<div class="ob">' + progress() + '<div class="body">' + body + '</div></div>';
  }

  function readInputs() {
    const n = document.getElementById('ob-name');
    if (n) ob.name = n.value.trim();
    const t = document.getElementById('ob-time');
    if (t) ob.remindTime = t.value || '09:00';
  }

  function toggleIn(arr, v) {
    const i = arr.indexOf(v);
    if (i >= 0) arr.splice(i, 1); else arr.push(v);
  }

  function go(step) {
    ob.step = step;
    ASC.app.render();
    window.scrollTo(0, 0);
  }

  function next(skip) {
    readInputs();
    if (ob.step === 1 && !ob.name) {
      ASC.ui.fieldError(document.getElementById('ob-name'), 'Escribí un nombre o apodo para continuar.');
      return;
    }
    if (ob.step === 5 && skip) ob.trainsGym = null;
    let n = ob.step + 1;
    if (n === 6 && ob.trainsGym !== true) n = 7;
    go(n);
  }

  function finish() {
    if (!ob.consent) return ASC.ui.toast('Para continuar, aceptá la política de privacidad.');
    const st = ASC.store.get();
    st.consent = { privacy: ASC.brand.version, terms: ASC.brand.version, at: new Date().toISOString() };
    const today = ASC.dates.today();
    const sug = suggestions();
    st.profile.name = ob.name;
    st.profile.goals = ob.goals.slice();
    st.profile.areas = ob.areas.slice();
    st.profile.trainsGym = ob.trainsGym;
    st.profile.onboarded = true;
    st.bodyProfile.level = ob.level;
    st.bodyProfile.goal = ob.fitGoal;
    st.bodyProfile.days = ob.days.slice();
    st.settings.reminders.habits = { enabled: ob.remindOn, time: ob.remindTime };
    ob.habits.forEach((name, i) => {
      const s = sug.find((x) => x.name === name) || { name, icon: '✨', category: 'otros' };
      st.habits.push({
        id: ASC.store.uid(), kind: 'check', reminderDays: [], name: s.name, description: '', category: s.category || 'otros', icon: s.icon || '✨',
        color: COLORS[i % COLORS.length], freqType: s.freqType || 'daily', days: s.days || [], timesPerWeek: s.timesPerWeek || 3,
        target: '', reminderTime: '', startDate: today, archivedAt: null, goalId: null, linkGym: !!s.linkGym, order: i, createdAt: new Date().toISOString(),
      });
    });
    ob = null;
    ASC.app.commit({ silent: true });
    ASC.store.requestPersist(); // el navegador decide; no se asume que lo conceda
    // Pantalla de mensajes motivacionales: una sola vez, después de la bienvenida
    location.hash = st.settings.motivation && st.settings.motivation.asked ? '#/home' : '#/motivation-intro';
    ASC.ui.toast('¡Bienvenido, ' + st.profile.name + '! Arrancamos.');
  }

  Object.assign(ASC.actions, {
    'ob-next': () => next(false),
    'ob-skip': () => next(true),
    'ob-back': () => { readInputs(); let p = ob.step - 1; if (p === 6 && ob.trainsGym !== true) p = 5; go(Math.max(1, p)); },
    'ob-goal': (el) => { toggleIn(ob.goals, el.dataset.id); ob.habitsInit = false; ASC.app.render(); },
    'ob-area': (el) => { toggleIn(ob.areas, el.dataset.id); ASC.app.render(); },
    'ob-habit': (el) => { toggleIn(ob.habits, el.dataset.id); ASC.app.render(); },
    'ob-add-custom': () => {
      const i = document.getElementById('ob-custom');
      const v = i && i.value.trim();
      if (v && !ob.habits.includes(v)) { ob.habits.push(v); ASC.app.render(); }
    },
    'ob-gym': (el) => { ob.trainsGym = el.dataset.id === 'si'; ASC.app.render(); },
    'ob-level': (el) => { ob.level = ob.level === el.dataset.id ? '' : el.dataset.id; ASC.app.render(); },
    'ob-fitgoal': (el) => { ob.fitGoal = ob.fitGoal === el.dataset.id ? '' : el.dataset.id; ASC.app.render(); },
    'ob-day': (el) => { toggleIn(ob.days, Number(el.dataset.id)); ASC.app.render(); },
    'ob-remind': async () => {
      readInputs();
      ob.remindOn = !ob.remindOn;
      if (ob.remindOn) await ASC.app.requestNotifications();
      ASC.app.render();
    },
    'ob-finish': finish,
    'ob-consent': (el) => {
      ob.consent = el.checked;
      const b = document.querySelector('[data-act="ob-finish"]');
      if (b) { b.disabled = !el.checked; b.setAttribute('aria-disabled', String(!el.checked)); }
    },
  });

  ASC.screens.onboarding = { render, noTabs: true };
  ASC.onboardingData = { GOALS, COLORS };
})(typeof window !== 'undefined' ? window : globalThis);
