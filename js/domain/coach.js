/* ASCEND · Recomendador de ejercicios basado en evidencia
 * Módulo puro (sin DOM).
 * Reglas de honestidad:
 *  - "Estudio": la recomendación se apoya en un ensayo o metaanálisis citado abajo.
 *  - "Biomecánica": se apoya en la función anatómica del músculo, sin un estudio directo citado.
 *  - Nada de esto es indicación médica. Los estudios tienen muestras chicas y condiciones concretas.
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  const X = () => ASC.exerciseData;

  /* ---------- Evidencia citada ---------- */
  const EVIDENCE = {
    inclinado: {
      short: 'EMG · 2022',
      title: 'Banco plano vs. inclinado',
      text: 'Al inclinar el banco, la activación del pectoral se desplaza hacia la porción clavicular (pecho superior). En banco plano predomina la porción esternocostal (pecho medio).',
      ref: 'Estudio con EMG de alta densidad, Scand J Med Sci Sports, 2022',
      url: 'https://pubmed.ncbi.nlm.nih.gov/34644424/',
    },
    triceps: {
      short: 'Maeo 2023',
      title: 'Tríceps sobre la cabeza vs. pushdown',
      text: 'En 12 semanas, la extensión en polea con el brazo sobre la cabeza hizo crecer más el tríceps que la misma extensión con el brazo al costado (+19,9 % vs. +13,9 %), aun con menos peso.',
      ref: 'Maeo et al., 2023 · Eur J Sport Sci',
      url: 'https://pubmed.ncbi.nlm.nih.gov/35819335/',
    },
    curlSentado: {
      short: 'Maeo 2021',
      title: 'Curl femoral sentado vs. acostado',
      text: 'El curl sentado (cadera flexionada, isquios más estirados) aumentó más el volumen de los isquios que el acostado (+14 % vs. +9 %).',
      ref: 'Maeo et al., 2021 · Med Sci Sports Exerc',
      url: 'https://pubmed.ncbi.nlm.nih.gov/33009197/',
    },
    gemelos: {
      short: 'Kinoshita 2023',
      title: 'Gemelos de pie vs. sentado',
      text: 'De pie (rodilla extendida) el gastrocnemio creció mucho más que sentado; el sóleo creció de forma similar en ambas versiones.',
      ref: 'Kinoshita, Maeo et al., 2023 · Front Physiol',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10753835/',
    },
    gemelosParcial: {
      short: 'Kassiano 2023',
      title: 'Gemelos en la parte estirada del recorrido',
      text: 'Trabajar la elevación de talones en la parte inicial (más estirada) del recorrido dio más crecimiento del gastrocnemio que el recorrido completo o la parte final.',
      ref: 'Kassiano et al., 2023 · J Strength Cond Res',
      url: 'https://pubmed.ncbi.nlm.nih.gov/37015016/',
    },
    recto: {
      short: 'Comparativos',
      title: 'Sentadilla vs. extensión de piernas',
      text: 'El recto femoral cruza la cadera y trabaja poco en la sentadilla. En comparaciones directas, la extensión de cuádriceps lo hizo crecer más; la sentadilla favoreció a los vastos.',
      ref: 'Resumen de estudios comparativos · StrengthLog',
      url: 'https://www.strengthlog.com/squat-vs-leg-extension/',
    },
    hipthrust: {
      short: 'Plotkin 2023',
      title: 'Hip thrust vs. sentadilla',
      text: 'Con el mismo volumen, ambos dieron una hipertrofia de glúteo similar. La sentadilla además hizo crecer más cuádriceps y aductores.',
      ref: 'Plotkin et al., 2023 · Front Physiol',
      url: 'https://pubmed.ncbi.nlm.nih.gov/37877099/',
    },
    biceps: {
      short: 'Int J Sports Med 2025',
      title: 'Curl inclinado vs. predicador',
      text: 'El curl inclinado aumentó más la zona proximal del flexor del codo; el predicador, la zona distal. Combinarlos cubre más regiones.',
      ref: 'Int J Sports Med, 2025',
      url: 'https://pubmed.ncbi.nlm.nih.gov/39809454/',
    },
    longitud: {
      short: 'Wolf 2023',
      title: 'Entrenar con el músculo estirado',
      text: 'Las revisiones sugieren un posible beneficio de cargar el músculo en posiciones estiradas (por ejemplo, la parte inicial del recorrido), aunque la evidencia todavía es limitada.',
      ref: 'Wolf et al., 2023 · Int J Strength Cond; Kassiano et al., 2023 · J Strength Cond Res',
      url: 'https://pubmed.ncbi.nlm.nih.gov/36662126/',
    },
    volumen: {
      short: 'Schoenfeld 2017',
      title: 'Cuántas series por semana',
      text: 'Más series semanales por músculo se asocian a más hipertrofia; los resultados fueron mejores con más de 9 series semanales por grupo muscular. En jóvenes entrenados, 12 a 20 podría ser un buen rango.',
      ref: 'Schoenfeld, Ogborn y Krieger, 2017 · J Sports Sci; Baz-Valle et al., 2022 · J Hum Kinet',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8884877/',
    },
    cargas: {
      short: 'Schoenfeld 2017',
      title: 'Cargas altas vs. bajas',
      text: 'La fuerza máxima mejoró más con cargas altas. La hipertrofia fue similar con cargas bajas o altas cuando las series se llevaron cerca del fallo.',
      ref: 'Schoenfeld et al., 2017 · J Strength Cond Res; Lopez et al., 2021 · Med Sci Sports Exerc',
      url: 'https://pubmed.ncbi.nlm.nih.gov/28834797/',
    },
  };

  /* ---------- Información por zona muscular ---------- */
  // prefer: mejores opciones para esa zona (en orden). ev: clave de EVIDENCE si hay estudio directo.
  const REGIONS = {
    'pecho.sup': { prefer: ['press-inclinado-manc', 'press-inclinado-barra', 'cruce-poleas-bajo', 'aperturas-inclinadas'], ev: 'inclinado', why: 'La inclinación desplaza el trabajo hacia la porción clavicular, el pecho superior.' },
    'pecho.med': { prefer: ['press-banca', 'press-banca-manc', 'aperturas-manc', 'pec-deck'], ev: 'inclinado', why: 'En banco plano predomina la porción esternocostal, el pecho medio.' },
    'pecho.inf': { prefer: ['fondos-pecho', 'cruce-poleas', 'press-declinado'], why: 'Empujar o cerrar los brazos hacia abajo alinea el esfuerzo con las fibras inferiores.' },
    'espalda.dorsal': { prefer: ['jalon-pecho', 'dominadas', 'jalon-unilateral', 'pullover-polea'], why: 'Llevar el brazo desde arriba hacia la cadera es la función principal del dorsal ancho.' },
    'espalda.media': { prefer: ['remo-pecho-apoyado', 'remo-polea', 'remo-barra', 'remo-t'], why: 'Los remos horizontales trabajan romboides, trapecio medio y dorsal.' },
    'espalda.trap': { prefer: ['encogimientos-manc', 'encogimientos-barra'], why: 'Elevar los hombros es la función del trapecio superior.' },
    'espalda.lumbar': { prefer: ['hiperextensiones'], why: 'Las extensiones de tronco controladas trabajan los erectores espinales.' },
    'hombros.ant': { prefer: ['press-hombro-manc', 'press-militar', 'press-arnold'], why: 'Los empujes por encima de la cabeza trabajan sobre todo el deltoides anterior, que también participa en los press de pecho.' },
    'hombros.lat': { prefer: ['elev-laterales-polea', 'elev-laterales', 'elev-lateral-inclinado', 'elev-laterales-maq'], why: 'El deltoides lateral se trabaja separando el brazo del cuerpo; los press lo estimulan poco.' },
    'hombros.post': { prefer: ['pec-deck-inverso', 'cruce-poleas-posterior', 'face-pull', 'pajaros'], why: 'Llevar el brazo hacia atrás en el plano horizontal aísla el deltoides posterior, que los press no trabajan.' },
    'biceps.larga': { prefer: ['curl-inclinado', 'curl-bayesian'], ev: 'biceps', why: 'Con el brazo por detrás del cuerpo la cabeza larga trabaja más estirada; el curl inclinado hizo crecer más la zona proximal.' },
    'biceps.corta': { prefer: ['curl-predicador', 'curl-barra-z', 'curl-predicador-manc'], ev: 'biceps', why: 'El curl predicador hizo crecer más la zona distal del flexor del codo.' },
    'biceps.braquial': { prefer: ['curl-martillo', 'curl-inverso', 'curl-martillo-cuerda'], why: 'El agarre neutro o prono involucra más el braquial y el braquiorradial.' },
    'triceps.larga': { prefer: ['ext-overhead-polea', 'ext-triceps-manc', 'press-frances'], ev: 'triceps', why: 'Con el brazo por encima de la cabeza la cabeza larga trabaja estirada y el tríceps creció más.' },
    'triceps.lateral': { prefer: ['ext-triceps-cuerda', 'ext-triceps-polea'], why: 'Con el brazo al costado se cargan sobre todo las cabezas lateral y medial.' },
    'triceps.comp': { prefer: ['press-cerrado', 'fondos'], why: 'Los empujes con agarre cerrado permiten cargar mucho peso sobre el tríceps.' },
    'cuadriceps.vastos': { prefer: ['sentadilla', 'sentadilla-hack', 'prensa'], ev: 'recto', why: 'Los compuestos de rodilla y cadera trabajan sobre todo los vastos.' },
    'cuadriceps.recto': { prefer: ['ext-cuadriceps', 'sentadilla-sissy'], ev: 'recto', why: 'El recto femoral cruza la cadera: trabaja poco en la sentadilla y más en la extensión de piernas.' },
    'cuadriceps.uni': { prefer: ['bulgara', 'zancada-reversa', 'subida-cajon'], why: 'Los unilaterales equilibran ambas piernas y suman trabajo de glúteo.' },
    'isquios.rodilla': { prefer: ['curl-femoral-sentado', 'curl-femoral', 'curl-nordico'], ev: 'curlSentado', why: 'Sentado, con la cadera flexionada, los isquios trabajan más estirados y crecieron más que acostado.' },
    'isquios.cadera': { prefer: ['peso-muerto-rumano', 'rumano-manc', 'buenos-dias'], ev: 'longitud', why: 'La bisagra de cadera carga los isquios en posición estirada, algo que el curl no hace.' },
    'gluteos.mayor': { prefer: ['hip-thrust', 'sentadilla', 'bulgara'], ev: 'hipthrust', why: 'Hip thrust y sentadilla dieron un crecimiento de glúteo similar; la sentadilla suma además cuádriceps y aductores.' },
    'gluteos.medio': { prefer: ['abduccion-maq', 'abduccion-polea', 'caminata-banda'], why: 'Separar la pierna del cuerpo trabaja el glúteo medio y el menor.' },
    'gemelos.gastro': { prefer: ['gemelos-pie', 'gemelos-prensa', 'burro'], ev: 'gemelos', why: 'Con la rodilla extendida el gastrocnemio trabaja estirado y creció mucho más que sentado.' },
    'gemelos.soleo': { prefer: ['gemelos-sentado'], ev: 'gemelos', why: 'Con la rodilla flexionada trabaja sobre todo el sóleo.' },
    'abdomen.recto': { prefer: ['crunch-polea', 'elev-piernas', 'crunch-inverso'], why: 'Flexionar el tronco o la pelvis contra resistencia trabaja el recto abdominal.' },
    'abdomen.oblicuos': { prefer: ['lenador-polea', 'plancha-lateral', 'pallof'], why: 'La rotación y la flexión lateral trabajan los oblicuos.' },
    'abdomen.core': { prefer: ['rueda-abdominal', 'pallof', 'plancha'], why: 'Resistir la extensión y la rotación entrena la estabilidad del tronco.' },
    'antebrazos.flex': { prefer: ['curl-muneca', 'caminata-granjero', 'colgado-barra'], why: 'Flexionar la muñeca y sostener carga fortalece el agarre.' },
    'antebrazos.ext': { prefer: ['curl-muneca-inverso', 'curl-inverso'], why: 'La extensión de muñeca y el agarre prono trabajan los extensores.' },
    'otros.aductores': { prefer: ['aduccion-maq', 'sentadilla-sumo', 'plancha-copenhague'], ev: 'hipthrust', why: 'Juntar las piernas trabaja los aductores; la sentadilla también los hizo crecer.' },
    'otros.full': { prefer: ['thruster', 'kb-swing', 'empuje-trineo'], why: 'Los movimientos de cuerpo completo combinan fuerza y acondicionamiento.' },
    'otros.cardio': { prefer: ['bici-estatica', 'remo-maquina', 'cinta-inclinada'], why: 'Acondicionamiento cardiovascular de bajo impacto.' },
  };

  /* ---------- Objetivos del usuario ---------- */
  const GOALS = {
    Hipertrofia: { sets: 3, reps: '8-12', restC: 120, restA: 90, scheme: '6 a 15 repeticiones (sirve hasta ~30), cerca del fallo', rest: '1,5 a 3 min en compuestos, 1 a 2 min en aislamientos', text: 'La carga importa menos que el esfuerzo: la hipertrofia fue similar con cargas bajas o altas si las series se acercan al fallo. Sumá unas 10 o más series semanales por músculo.', ev: ['cargas', 'volumen'] },
    Fuerza: { sets: 4, reps: '4-6', restC: 180, restA: 120, scheme: '3 a 6 repeticiones con cargas altas', rest: '2 a 4 min', text: 'Para la fuerza máxima rinden más las cargas altas y priorizar los ejercicios compuestos que querés mejorar.', ev: ['cargas'] },
    Resistencia: { sets: 3, reps: '15-20', restC: 75, restA: 60, scheme: '15 a 25 repeticiones', rest: '45 a 90 s', text: 'Más repeticiones con cargas moderadas y descansos cortos (criterio general de especificidad).', ev: [] },
    'Acondicionamiento físico': { sets: 3, reps: '10-15', restC: 75, restA: 60, scheme: '10 a 15 repeticiones, en circuito o con poco descanso', rest: '45 a 90 s', text: 'Combiná ejercicios compuestos con poco descanso entre series (criterio general).', ev: [] },
    Mantenimiento: { sets: 2, reps: '8-12', restC: 120, restA: 90, scheme: '6 a 15 repeticiones', rest: '1,5 a 3 min', text: 'Para mantener, un volumen menor suele alcanzar si conservás la intensidad (criterio general).', ev: [] },
  };

  function goalInfo(goal) {
    return GOALS[goal] || null;
  }

  /** Valores por defecto al agregar un ejercicio a una rutina, según el objetivo */
  function defaultsFor(ex, goal) {
    const g = GOALS[goal] || GOALS.Hipertrofia;
    return { sets: g.sets, reps: g.reps.split('-')[1] || g.reps, rest: ex && ex.type === 'c' ? g.restC : g.restA };
  }

  function regionKey(ex) {
    return ex.muscle + '.' + ex.region;
  }

  function regionInfo(m, r) {
    return REGIONS[m + '.' + r] || null;
  }

  // Solo estos estudios comparan directamente posiciones más o menos estiradas
  const STRETCH_EV = ['curlSentado', 'triceps', 'gemelos', 'gemelosParcial', 'biceps'];
  function stretchEv(info) {
    return info && STRETCH_EV.includes(info.ev) ? info.ev : 'longitud';
  }

  /** Puntaje para ordenar candidatos dentro de una zona */
  function score(c, info, base) {
    let s = 0;
    const i = info && info.prefer ? info.prefer.indexOf(c.id) : -1;
    if (i >= 0) s += 100 - i * 10;
    if (c.stretch) s += 8;
    if (base && c.type !== base.type) s += 4;
    if (base && c.equipment !== base.equipment) s += 1;
    return s;
  }

  function best(list, info, base) {
    return list.slice().sort((a, b) => score(b, info, base) - score(a, info, base));
  }

  /**
   * Recomendaciones para un ejercicio.
   * focus: null = completar el músculo; 'region' = priorizar esa zona; 'stretch' = variantes estiradas.
   * Devuelve [{ ex, reason, ev, kind }]
   */
  function recommend(state, exId, focus) {
    const all = ASC.gym.allExercises(state);
    const base = all.find((e) => e.id === exId);
    if (!base) return [];
    const group = X().MUSCLES.find((m) => m.id === base.muscle);
    const same = all.filter((e) => e.muscle === base.muscle && e.id !== base.id);
    const out = [];
    const used = new Set([base.id]);
    const push = (ex, reason, ev, kind) => {
      if (!ex || used.has(ex.id)) return;
      used.add(ex.id);
      out.push({ ex, reason, ev: ev || null, kind });
    };

    if (focus === 'stretch') {
      best(same.filter((e) => e.stretch), null, base).slice(0, 5).forEach((e) =>
        push(e, 'Carga el músculo en posición estirada (' + X().regionLabel(e.muscle, e.region).toLowerCase() + ').', stretchEv(regionInfo(e.muscle, e.region)), 'stretch'));
      return out;
    }

    if (focus) {
      const info = regionInfo(base.muscle, focus);
      best(same.filter((e) => e.region === focus), info, base).slice(0, 5).forEach((e, i) =>
        push(e, i === 0 && info ? info.why : (e.type === 'c' ? 'Opción compuesta' : 'Opción de aislamiento') + ' para ' + X().regionLabel(base.muscle, focus).toLowerCase() + (e.stretch ? ', con el músculo estirado.' : '.'), info && info.ev, 'region'));
      return out;
    }

    // 1) Completar las otras zonas del músculo
    (group ? group.regions : []).forEach(([r]) => {
      if (r === base.region) return;
      const info = regionInfo(base.muscle, r);
      const pick = best(same.filter((e) => e.region === r), info, base)[0];
      if (pick) push(pick, info ? info.why : 'Trabaja otra zona del mismo músculo.', info && info.ev, 'complete');
    });

    // 2) Misma zona, versión con más estiramiento
    const baseInfo = regionInfo(base.muscle, base.region);
    if (!base.stretch) {
      const st = best(same.filter((e) => e.region === base.region && e.stretch), baseInfo, base)[0];
      if (st) push(st, 'Trabaja la misma zona con el músculo más estirado.', stretchEv(baseInfo), 'stretch');
    }

    // 3) Complemento compuesto / aislamiento en la misma zona
    const comp = best(same.filter((e) => e.region === base.region && e.type !== base.type), baseInfo, base)[0];
    if (comp) push(comp, base.type === 'c' ? 'Aislamiento para sumar volumen a la misma zona con menos fatiga general.' : 'Compuesto para la misma zona: permite más carga y trabaja músculos vecinos.', null, 'pair');

    return out.slice(0, 6);
  }

  /** Lista de evidencias usadas en un set de recomendaciones (para mostrar las fuentes) */
  function sourcesFor(recs, goal) {
    const keys = new Set();
    recs.forEach((r) => r.ev && keys.add(r.ev));
    const g = GOALS[goal];
    if (g) g.ev.forEach((k) => keys.add(k));
    return Array.from(keys).map((k) => Object.assign({ key: k }, EVIDENCE[k]));
  }

  ASC.coach = { EVIDENCE, REGIONS, GOALS, recommend, goalInfo, defaultsFor, regionInfo, regionKey, sourcesFor };
})(typeof window !== 'undefined' ? window : globalThis);
