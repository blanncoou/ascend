/* ASCEND · Tutorial del juego de hábitos
 * Se muestra la primera vez que se abre la pestaña Semana. Es breve (6 pasos), se puede omitir
 * y volver a ver desde Perfil → Ver tutorial.
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  const { esc, icon } = ASC.ui;

  function miniGrid() {
    const cells = ['done', 'done', 'miss', 'done', 'now', 'future', 'future'];
    return '<div class="tut-grid">' + cells.map((c) => '<span class="wcell ' + c + '">' + (c === 'done' ? icon('check', 'xs') : '') + '</span>').join('') + '</div>';
  }

  function steps() {
    const X = ASC.XP;
    return [
      { title: 'Tu semana es una partida', art: ASC.ui.emblem(0, 92), text: 'Cada lunes empieza una semana nueva con desafío, misiones y XP. Tus hábitos son las jugadas.' },
      { title: 'Hábitos', art: miniGrid(), text: 'Tocá el día en el tablero para marcarlo. Podés registrar hoy y corregir ayer; los días anteriores quedan cerrados para que tu progreso sea real. Hay hábitos de sí o no, con cantidad (ej. 2.000 ml) y para evitar conductas.' },
      { title: 'Rachas', art: '<div class="streak-flame" style="margin:0 auto">' + icon('flame') + '<b>7</b></div>', text: 'Tu racha cuenta los días seguidos con actividad. Los días sin nada programado no la cortan. Cada ' + X.freeze.earnEvery + ' días ganás un comodín para proteger un día difícil.' },
      { title: 'XP y rangos', art: '<div class="row" style="justify-content:center;gap:8px">' + [0, 3, 6, 9].map((i) => ASC.ui.emblem(i, 54)).join('') + '</div>', text: 'Cada hábito suma ' + X.habit + ' XP y un día perfecto, ' + X.perfectDay + ' más. Con XP subís de nivel y de rango: de Idea a Disciplina pura. Las reglas completas están en Progreso.' },
      { title: 'Desafío y misiones', art: '<div class="xp-pill" style="font-size:22px;padding:8px 16px;display:inline-block">+' + X.commitments.total + ' XP</div>', text: 'Planificá tu semana eligiendo un compromiso (70 %, 85 % o 100 %). Si lo cumplís, sumás XP extra; si no, no perdés nada. Además hay 3 misiones semanales armadas con tus hábitos.' },
      { title: 'Logros', art: '<div class="medal" style="width:72px;height:72px;margin:0 auto;border-radius:22px;display:grid;place-items:center;background:linear-gradient(160deg,#ff4651,#8f0f18);color:#fff">' + icon('trophy') + '</div>', text: 'Los logros se desbloquean solos al alcanzar hitos. Si querés, activá sonidos breves para las celebraciones.', sound: true },
    ];
  }

  function open() {
    const st = ASC.store.get();
    const list = steps();
    let i = 0;
    const ov = ASC.ui.dialog('<div class="tut"></div>', 'tutorial', () => finish(true));
    const box = ov.querySelector('.tut');
    function finish() {
      st.ui.tutorialWeekSeen = true;
      ASC.store.save();
      ov._close();
    }
    function paint() {
      const s = list[i];
      box.innerHTML = '<div class="tut-dots" aria-hidden="true">' + list.map((_, k) => '<i class="' + (k === i ? 'on' : k < i ? 'done' : '') + '"></i>').join('') + '</div>' +
        '<div class="tut-art">' + s.art + '</div><h3 id="tut-title">' + esc(s.title) + '</h3><p>' + esc(s.text) + '</p>' +
        (s.sound ? '<div class="card row between" style="margin-bottom:16px;text-align:left"><b class="small">Sonidos de celebración</b><button class="switch ' + (st.settings.sound ? 'on' : '') + '" data-tut="sound" aria-pressed="' + !!st.settings.sound + '" aria-label="Activar sonidos"></button></div>' : '') +
        '<div class="btn-row">' + (i > 0 ? '<button class="btn ghost" data-tut="prev">Anterior</button>' : '<button class="btn ghost" data-tut="skip">Omitir</button>') +
        '<button class="btn primary" data-tut="next" data-ok>' + (i === list.length - 1 ? 'Empezar' : 'Siguiente') + '</button></div>' +
        '<div class="tiny faint" style="margin-top:10px">Paso ' + (i + 1) + ' de ' + list.length + '</div>';
      ov.querySelector('.dialog').setAttribute('aria-labelledby', 'tut-title');
      const n = box.querySelector('[data-tut="next"]');
      if (n) n.focus();
    }
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-tut]');
      if (!b) return;
      const a = b.dataset.tut;
      if (a === 'next') { if (i === list.length - 1) finish(); else { i++; paint(); } }
      else if (a === 'prev') { i = Math.max(0, i - 1); paint(); }
      else if (a === 'skip') finish();
      else if (a === 'sound') {
        st.settings.sound = !st.settings.sound;
        b.classList.toggle('on', st.settings.sound);
        b.setAttribute('aria-pressed', st.settings.sound);
        ASC.store.save();
        if (st.settings.sound) ASC.sound.play('achievement', true);
      }
    });
    paint();
  }

  ASC.tutorial = { open };
  ASC.actions['tutorial-open'] = () => open();
})(typeof window !== 'undefined' ? window : globalThis);
