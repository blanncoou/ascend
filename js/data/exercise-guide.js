/* ASCEND · Guía de ejercicios (datos educativos)
 *
 * Completa la biblioteca (exercises.js) sin cambiar sus ids:
 *  - Patrón de movimiento de cada ejercicio (base de recomendaciones y reemplazos).
 *  - Dificultad orientativa (1 principiante · 2 intermedio · 3 avanzado).
 *  - Etiquetas para preferencias "prefiero evitar" (no son diagnósticos ni contraindicaciones médicas).
 *  - Fichas detalladas (paso a paso + errores frecuentes) para los ejercicios más usados por principiantes.
 *    El resto muestra la guía general de su patrón, aclarando que es general.
 *  - Glosario y rutinas básicas de iniciación.
 * Todo es orientativo: no reemplaza a un profesional que observe la técnica.
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});

  /* ---------- Patrones de movimiento ---------- */
  const PATTERNS = {
    'empuje-h': { label: 'Empuje horizontal', purpose: 'Empujar un peso hacia adelante, alejándolo del pecho. Es la base del trabajo de pecho y también suma hombro anterior y tríceps.' },
    'empuje-inc': { label: 'Empuje inclinado', purpose: 'Empujar en diagonal hacia arriba. Pone más énfasis en la parte superior del pecho y el hombro anterior.' },
    'empuje-v': { label: 'Empuje vertical', purpose: 'Empujar el peso por encima de la cabeza. Trabaja sobre todo hombros y tríceps.' },
    fondos: { label: 'Fondos', purpose: 'Empujar el cuerpo hacia arriba desde barras o un banco. Muy exigente para tríceps, pecho y hombros.' },
    apertura: { label: 'Aperturas (aducción horizontal)', purpose: 'Juntar los brazos por delante del pecho con los codos casi fijos. Aísla el pecho sin depender del tríceps.' },
    'traccion-v': { label: 'Tracción vertical', purpose: 'Tirar desde arriba hacia el pecho. Desarrolla los dorsales (el ancho de la espalda) y suma bíceps.' },
    'traccion-h': { label: 'Tracción horizontal (remo)', purpose: 'Tirar hacia el cuerpo desde adelante. Trabaja la espalda media, los dorsales y el hombro posterior.' },
    pullover: { label: 'Pullover (extensión de hombro)', purpose: 'Llevar los brazos casi rectos desde arriba hacia la cadera. Trabaja los dorsales sin que el bíceps limite.' },
    encogimiento: { label: 'Encogimiento de hombros', purpose: 'Elevar los hombros hacia las orejas. Trabaja el trapecio superior.' },
    'elev-lateral': { label: 'Elevación lateral', purpose: 'Separar los brazos del cuerpo hacia los costados. Trabaja el deltoides lateral, que da ancho a los hombros.' },
    'elev-frontal': { label: 'Elevación frontal', purpose: 'Elevar el brazo hacia adelante. Trabaja el deltoides anterior, que ya recibe mucho trabajo en los empujes.' },
    'deltoides-post': { label: 'Hombro posterior', purpose: 'Llevar los brazos hacia atrás con los codos abiertos. Trabaja el deltoides posterior y ayuda a equilibrar los empujes.' },
    curl: { label: 'Flexión de codo (curl)', purpose: 'Doblar el codo contra resistencia. Trabaja bíceps, braquial y braquiorradial según el agarre.' },
    'ext-codo': { label: 'Extensión de codo', purpose: 'Estirar el codo contra resistencia. Aísla el tríceps.' },
    sentadilla: { label: 'Sentadilla / prensa', purpose: 'Flexionar rodillas y cadera a la vez. Trabaja cuádriceps y glúteos; es el movimiento base del tren inferior.' },
    'unilateral-pierna': { label: 'Zancada / una pierna', purpose: 'Trabajar una pierna por vez. Suma equilibrio y corrige diferencias entre lados.' },
    'ext-rodilla': { label: 'Extensión de rodilla', purpose: 'Estirar la rodilla. Aísla el cuádriceps, incluido el recto femoral.' },
    'flex-rodilla': { label: 'Flexión de rodilla (curl femoral)', purpose: 'Doblar la rodilla contra resistencia. Aísla los isquiotibiales.' },
    bisagra: { label: 'Bisagra de cadera', purpose: 'Inclinar el tronco desde la cadera con la espalda neutra. Trabaja isquiotibiales, glúteos y la zona lumbar.' },
    'empuje-cadera': { label: 'Extensión de cadera (glúteo)', purpose: 'Llevar la cadera hacia arriba o atrás contra resistencia. Trabaja sobre todo el glúteo mayor.' },
    'abduccion-cadera': { label: 'Abducción de cadera', purpose: 'Separar la pierna hacia afuera. Trabaja el glúteo medio y menor.' },
    'aduccion-cadera': { label: 'Aducción de cadera', purpose: 'Juntar las piernas. Trabaja los aductores (cara interna del muslo).' },
    gemelos: { label: 'Extensión de tobillo', purpose: 'Subir sobre las puntas de los pies. Trabaja gemelos y sóleo.' },
    'flex-tronco': { label: 'Flexión de tronco', purpose: 'Acercar el pecho a la pelvis (o la pelvis al pecho). Trabaja el recto abdominal.' },
    rotacion: { label: 'Rotación / flexión lateral', purpose: 'Girar o inclinar el tronco. Trabaja los oblicuos.' },
    estabilidad: { label: 'Estabilidad del tronco', purpose: 'Resistir el movimiento manteniendo el tronco firme. Trabaja el core completo.' },
    agarre: { label: 'Antebrazo y agarre', purpose: 'Sostener o mover la muñeca contra resistencia. Fortalece el agarre y los antebrazos.' },
    'cuerpo-completo': { label: 'Cuerpo completo', purpose: 'Combina varios movimientos en uno. Útil para fuerza y acondicionamiento.' },
    cardio: { label: 'Cardio', purpose: 'Trabajo continuo o por intervalos para la capacidad cardiovascular.' },
  };

  const BY_PATTERN = {
    'empuje-h': ['press-banca', 'press-banca-manc', 'press-pecho-maq', 'smith-banca', 'press-suelo', 'flexiones', 'press-declinado', 'press-declinado-manc', 'press-cerrado', 'flexiones-diamante'],
    'empuje-inc': ['press-inclinado-manc', 'press-inclinado-barra', 'press-inclinado-smith', 'press-inclinado-maq', 'flexiones-declinadas', 'press-landmine'],
    'empuje-v': ['press-militar', 'press-hombro-manc', 'press-arnold', 'press-hombro-maq', 'push-press'],
    fondos: ['fondos-pecho', 'fondos', 'fondos-banco'],
    apertura: ['aperturas-manc', 'pec-deck', 'aperturas-polea-media', 'aperturas-inclinadas', 'cruce-poleas-bajo', 'cruce-poleas'],
    'traccion-v': ['dominadas', 'dominadas-supinas', 'dominada-asistida', 'jalon-pecho', 'jalon-neutro', 'jalon-supino', 'jalon-unilateral'],
    'traccion-h': ['remo-barra', 'remo-pendlay', 'remo-manc', 'remo-polea', 'remo-t', 'remo-pecho-apoyado', 'remo-maq', 'remo-invertido', 'remo-seal', 'remo-landmine'],
    pullover: ['pullover-polea', 'pullover-manc'],
    encogimiento: ['encogimientos-barra', 'encogimientos-manc'],
    'elev-lateral': ['elev-laterales', 'elev-laterales-polea', 'elev-laterales-maq', 'elev-lateral-inclinado', 'remo-menton', 'elev-y'],
    'elev-frontal': ['elev-frontal'],
    'deltoides-post': ['face-pull', 'pajaros', 'pec-deck-inverso', 'cruce-poleas-posterior'],
    curl: ['curl-inclinado', 'curl-bayesian', 'curl-barra', 'curl-barra-z', 'curl-manc', 'curl-polea', 'curl-predicador', 'curl-predicador-manc', 'curl-predicador-maq', 'curl-concentrado', 'curl-arana', 'curl-martillo', 'curl-martillo-cuerda', 'curl-inverso', 'curl-zottman'],
    'ext-codo': ['ext-overhead-polea', 'ext-triceps-manc', 'press-frances', 'ext-overhead-unilateral', 'ext-triceps-polea', 'ext-triceps-cuerda', 'ext-unilateral-inversa', 'patada-triceps', 'jm-press'],
    sentadilla: ['sentadilla', 'sentadilla-frontal', 'sentadilla-hack', 'sentadilla-pendulo', 'sentadilla-smith', 'sentadilla-goblet', 'prensa', 'sentadilla-sumo'],
    'unilateral-pierna': ['zancadas', 'zancada-reversa', 'zancada-caminando', 'bulgara', 'subida-cajon'],
    'ext-rodilla': ['ext-cuadriceps', 'ext-cuadriceps-uni', 'sentadilla-sissy', 'nordico-inverso'],
    'flex-rodilla': ['curl-femoral-sentado', 'curl-femoral', 'curl-femoral-pie', 'curl-nordico', 'curl-fitball', 'glute-ham'],
    bisagra: ['peso-muerto', 'peso-muerto-rumano', 'rumano-manc', 'rumano-unilateral', 'piernas-rigidas', 'buenos-dias', 'pull-through', 'kb-swing', 'peso-muerto-sumo', 'hiperextensiones'],
    'empuje-cadera': ['hip-thrust', 'hip-thrust-maq', 'hip-thrust-uni', 'puente-gluteo', 'patada-gluteo'],
    'abduccion-cadera': ['abduccion-maq', 'abduccion-polea', 'caminata-banda', 'elev-lateral-pierna', 'almeja'],
    'aduccion-cadera': ['aduccion-maq', 'plancha-copenhague'],
    gemelos: ['gemelos-pie', 'gemelos-prensa', 'gemelos-smith', 'gemelos-unilateral', 'burro', 'gemelos-sentado'],
    'flex-tronco': ['crunch', 'crunch-polea', 'crunch-maq', 'crunch-inverso', 'crunch-declinado', 'elev-piernas'],
    rotacion: ['giro-ruso', 'lenador-polea', 'flexion-lateral', 'crunch-bicicleta'],
    estabilidad: ['plancha', 'plancha-lateral', 'rueda-abdominal', 'pallof', 'bicho-muerto', 'perro-pajaro', 'hollow'],
    agarre: ['curl-muneca', 'caminata-granjero', 'colgado-barra', 'curl-muneca-inverso'],
    'cuerpo-completo': ['thruster', 'cargada', 'burpees', 'empuje-trineo'],
    cardio: ['remo-maquina', 'bici-estatica', 'cinta-inclinada', 'eliptica', 'saltar-soga', 'cuerdas-batalla'],
  };
  const PATTERN_OF = {};
  Object.keys(BY_PATTERN).forEach((p) => BY_PATTERN[p].forEach((id) => (PATTERN_OF[id] = p)));

  /* Patrón por defecto para ejercicios propios del usuario (según grupo y zona) */
  const DEFAULT_PATTERN = {
    'pecho.sup': 'empuje-inc', 'pecho.med': 'empuje-h', 'pecho.inf': 'empuje-h',
    'espalda.dorsal': 'traccion-v', 'espalda.media': 'traccion-h', 'espalda.trap': 'encogimiento', 'espalda.lumbar': 'bisagra',
    'hombros.ant': 'empuje-v', 'hombros.lat': 'elev-lateral', 'hombros.post': 'deltoides-post',
    biceps: 'curl', 'triceps.comp': 'empuje-h', triceps: 'ext-codo',
    'cuadriceps.vastos': 'sentadilla', 'cuadriceps.recto': 'ext-rodilla', 'cuadriceps.uni': 'unilateral-pierna',
    'isquios.rodilla': 'flex-rodilla', 'isquios.cadera': 'bisagra',
    'gluteos.mayor': 'empuje-cadera', 'gluteos.medio': 'abduccion-cadera',
    gemelos: 'gemelos', 'abdomen.recto': 'flex-tronco', 'abdomen.oblicuos': 'rotacion', 'abdomen.core': 'estabilidad',
    antebrazos: 'agarre', 'otros.aductores': 'aduccion-cadera', 'otros.full': 'cuerpo-completo', 'otros.cardio': 'cardio',
  };

  function patternOf(ex) {
    if (!ex) return null;
    if (ex.pattern && PATTERNS[ex.pattern]) return ex.pattern;
    return PATTERN_OF[ex.id] || DEFAULT_PATTERN[ex.muscle + '.' + ex.region] || DEFAULT_PATTERN[ex.muscle] || null;
  }

  /* ---------- Dificultad orientativa ---------- */
  const LEVELS = ['', 'Principiante', 'Intermedio', 'Avanzado'];
  const ADVANCED = ['dominadas', 'dominadas-supinas', 'fondos', 'fondos-pecho', 'remo-pendlay', 'push-press', 'sentadilla-frontal', 'peso-muerto', 'buenos-dias', 'curl-nordico', 'glute-ham', 'sentadilla-sissy', 'nordico-inverso', 'rueda-abdominal', 'jm-press', 'plancha-copenhague', 'cargada', 'thruster'];
  const INTERMEDIATE = ['press-banca', 'press-inclinado-barra', 'press-declinado', 'press-suelo', 'press-landmine', 'flexiones-declinadas', 'remo-barra', 'remo-t', 'remo-seal', 'remo-landmine', 'remo-invertido', 'press-militar', 'press-arnold', 'remo-menton', 'press-frances', 'press-cerrado', 'flexiones-diamante', 'sentadilla', 'bulgara', 'zancadas', 'zancada-caminando', 'zancada-reversa', 'subida-cajon', 'peso-muerto-rumano', 'rumano-manc', 'rumano-unilateral', 'piernas-rigidas', 'hip-thrust', 'peso-muerto-sumo', 'kb-swing', 'pull-through', 'curl-fitball', 'hollow', 'elev-piernas', 'burpees', 'empuje-trineo', 'hip-thrust-uni', 'press-declinado-manc', 'curl-zottman', 'giro-ruso'];
  function difficulty(ex) {
    if (!ex) return 1;
    if (ex.difficulty) return ex.difficulty;
    if (ADVANCED.includes(ex.id)) return 3;
    if (INTERMEDIATE.includes(ex.id)) return 2;
    if (ex.custom && ex.equipment === 'Barra' && ex.type === 'c') return 2;
    return 1;
  }
  function levelNum(label) {
    const i = LEVELS.indexOf(label);
    return i > 0 ? i : 1;
  }

  /* ---------- Preferencias: "prefiero evitar" (no son contraindicaciones médicas) ---------- */
  const AVOID_TAGS = {
    overhead: { label: 'Movimientos por encima de la cabeza', ids: ['press-militar', 'press-hombro-manc', 'press-arnold', 'press-hombro-maq', 'push-press', 'ext-overhead-polea', 'ext-triceps-manc', 'ext-overhead-unilateral', 'thruster', 'elev-y'] },
    'carga-espalda': { label: 'Barra sobre la espalda o levantada desde el piso', ids: ['sentadilla', 'sentadilla-smith', 'buenos-dias', 'gemelos-smith', 'peso-muerto', 'peso-muerto-sumo', 'remo-pendlay', 'cargada', 'thruster', 'push-press'] },
    zancadas: { label: 'Zancadas y flexión profunda de rodilla', ids: ['zancadas', 'zancada-reversa', 'zancada-caminando', 'bulgara', 'sentadilla-sissy', 'nordico-inverso'] },
    colgado: { label: 'Colgarse de una barra', ids: ['dominadas', 'dominadas-supinas', 'elev-piernas', 'colgado-barra'] },
    impacto: { label: 'Saltos e impacto', ids: ['burpees', 'saltar-soga'] },
    suelo: { label: 'Ejercicios acostado en el piso', ids: ['flexiones', 'flexiones-declinadas', 'flexiones-diamante', 'plancha', 'plancha-lateral', 'crunch', 'crunch-inverso', 'crunch-bicicleta', 'bicho-muerto', 'perro-pajaro', 'hollow', 'puente-gluteo', 'almeja', 'elev-lateral-pierna', 'press-suelo', 'plancha-copenhague'] },
  };
  function avoidTagsOf(id) {
    return Object.keys(AVOID_TAGS).filter((k) => AVOID_TAGS[k].ids.includes(id));
  }

  /* ---------- Guía general por patrón (se muestra cuando no hay ficha específica) ---------- */
  const PATTERN_GUIDE = {
    'empuje-h': { steps: ['Acomodate con los omóplatos apretados hacia atrás y abajo, y los pies firmes.', 'Bajá el peso con control hacia la altura del pecho, con los codos algo por debajo de la línea de los hombros.', 'Empujá hasta casi estirar los brazos, sin despegar la espalda del apoyo.'], errors: ['Abrir los codos a 90° del cuerpo.', 'Rebotar o acortar el recorrido para mover más peso.', 'Despegar la cadera o la cabeza del apoyo.'] },
    'empuje-inc': { steps: ['Usá una inclinación moderada (unos 30°).', 'Bajá el peso con control hacia la parte alta del pecho.', 'Empujá hacia arriba y un poco hacia atrás, sin bloquear de golpe los codos.'], errors: ['Inclinar tanto el banco que se vuelva un press de hombros.', 'Arquear mucho la espalda baja.'] },
    'empuje-v': { steps: ['Tronco firme y abdomen apretado; si estás sentado, espalda apoyada.', 'Empujá el peso desde la altura de los hombros hasta arriba de la cabeza.', 'Bajá con control hasta la altura de las orejas o el mentón.'], errors: ['Arquear la zona lumbar para empujar.', 'Bajar el peso de golpe.'] },
    fondos: { steps: ['Sostenete con los brazos estirados y los hombros lejos de las orejas.', 'Bajá con control hasta donde el hombro esté cómodo.', 'Empujá hasta estirar los brazos.'], errors: ['Bajar más allá de un rango cómodo para el hombro.', 'Dejar caer los hombros hacia adelante.'] },
    apertura: { steps: ['Codos levemente flexionados y fijos durante todo el movimiento.', 'Abrí los brazos con control hasta sentir el pecho estirado.', 'Juntalos por delante del pecho como si abrazaras un árbol.'], errors: ['Doblar y estirar los codos (se convierte en un press).', 'Abrir más de lo que el hombro tolera cómodo.'] },
    'traccion-v': { steps: ['Agarrá la barra y llevá el pecho un poco hacia arriba.', 'Tirá llevando los codos hacia abajo y hacia los costados del cuerpo.', 'Subí con control hasta estirar los brazos, sin soltar la tensión.'], errors: ['Tirar hacia atrás con todo el cuerpo (balanceo).', 'Llevar la barra detrás de la nuca.', 'Acortar el recorrido arriba.'] },
    'traccion-h': { steps: ['Espalda neutra y pecho alto.', 'Tirá llevando los codos hacia atrás, cerca del cuerpo.', 'Volvé estirando los brazos y dejando que los omóplatos se separen, con control.'], errors: ['Redondear la espalda baja.', 'Tirar con impulso del tronco.', 'Encoger los hombros hacia las orejas.'] },
    pullover: { steps: ['Brazos casi rectos, codos levemente flexionados.', 'Llevá el peso desde arriba hacia la cadera trazando un arco.', 'Volvé con control hasta sentir los dorsales estirados.'], errors: ['Doblar los codos y convertirlo en un tirón de bíceps.'] },
    encogimiento: { steps: ['Brazos estirados y el peso a los costados.', 'Subí los hombros hacia las orejas.', 'Bajalos lento, sin girarlos.'], errors: ['Hacer círculos con los hombros.', 'Usar impulso con las piernas.'] },
    'elev-lateral': { steps: ['Pararte derecho con el peso al costado y los codos apenas flexionados.', 'Elevá los brazos hacia los costados hasta la altura del hombro aproximadamente.', 'Bajá lento, sin dejar caer el peso.'], errors: ['Balancear el cuerpo para subir el peso.', 'Subir mucho más arriba del hombro con los hombros encogidos.'] },
    'elev-frontal': { steps: ['Peso delante de los muslos, codos apenas flexionados.', 'Elevá hacia adelante hasta la altura de los hombros.', 'Bajá con control.'], errors: ['Balancearte con el tronco.'] },
    'deltoides-post': { steps: ['Inclinate o acomodate según el equipo, con el cuello relajado.', 'Llevá los brazos hacia atrás y afuera con los codos abiertos.', 'Volvé con control.'], errors: ['Juntar los omóplatos con fuerza en lugar de mover los brazos.', 'Usar demasiado peso y balancearte.'] },
    curl: { steps: ['Codos quietos al costado del cuerpo (o apoyados, según el ejercicio).', 'Doblá los codos llevando el peso hacia los hombros.', 'Bajá con control hasta casi estirar los brazos.'], errors: ['Balancear el tronco o la cadera.', 'Mover los codos hacia adelante.', 'Cortar el recorrido abajo.'] },
    'ext-codo': { steps: ['Fijá los codos en su lugar: solo se mueve el antebrazo.', 'Estirá los brazos por completo.', 'Volvé con control hasta sentir el tríceps estirado.'], errors: ['Abrir los codos hacia los costados.', 'Ayudarte con el hombro o el tronco.'] },
    sentadilla: { steps: ['Pies a lo ancho de hombros, apoyando toda la planta.', 'Bajá flexionando rodillas y cadera a la vez, con las rodillas en la dirección de los pies.', 'Subí empujando el piso, sin despegar los talones.'], errors: ['Juntar las rodillas hacia adentro.', 'Levantar los talones.', 'Redondear la espalda abajo.'] },
    'unilateral-pierna': { steps: ['Tronco firme; buscá una postura estable antes de bajar.', 'Bajá con control hasta un rango cómodo.', 'Subí empujando con la pierna de adelante.'], errors: ['Dejar que la rodilla se vaya hacia adentro.', 'Pasos demasiado cortos o inestables.'] },
    'ext-rodilla': { steps: ['Acomodá el equipo para que la rodilla quede alineada con el eje.', 'Estirá las rodillas por completo.', 'Bajá con control.'], errors: ['Patear el peso con impulso.', 'Despegar la cadera del asiento.'] },
    'flex-rodilla': { steps: ['Acomodá el equipo para que la rodilla quede alineada con el eje.', 'Doblá las rodillas llevando los talones hacia la cola.', 'Volvé con control hasta casi estirar.'], errors: ['Levantar la cadera para ayudarte.', 'Soltar el peso de golpe.'] },
    bisagra: { steps: ['Espalda neutra, rodillas apenas flexionadas.', 'Llevá la cadera hacia atrás mientras el tronco se inclina, con el peso cerca de las piernas.', 'Volvé empujando la cadera hacia adelante y apretando glúteos.'], errors: ['Redondear la espalda.', 'Convertirlo en una sentadilla doblando mucho las rodillas.', 'Alejar el peso del cuerpo.'] },
    'empuje-cadera': { steps: ['Apoyá bien la espalda alta o el cuerpo según el equipo, pies firmes.', 'Subí la cadera apretando glúteos hasta que el tronco quede alineado con los muslos.', 'Bajá con control.'], errors: ['Arquear la espalda baja arriba en lugar de extender la cadera.'] },
    'abduccion-cadera': { steps: ['Tronco quieto.', 'Separá la pierna (o las piernas) hacia afuera.', 'Volvé con control.'], errors: ['Mover el tronco para ganar recorrido.'] },
    'aduccion-cadera': { steps: ['Tronco quieto.', 'Juntá las piernas con control.', 'Volvé lento a la apertura cómoda.'], errors: ['Abrir más de lo cómodo.'] },
    gemelos: { steps: ['Apoyá la punta del pie con el talón libre.', 'Subí lo más alto posible.', 'Bajá lento hasta sentir el gemelo estirado.'], errors: ['Rebotar abajo.', 'Hacer recorridos cortos.'] },
    'flex-tronco': { steps: ['Exhalá mientras acercás las costillas a la pelvis.', 'Pausa breve con el abdomen apretado.', 'Volvé con control.'], errors: ['Tirar del cuello con las manos.', 'Usar impulso.'] },
    rotacion: { steps: ['Tronco firme.', 'Girá o inclinate con control desde el tronco.', 'Volvé al centro sin rebotar.'], errors: ['Moverse rápido y con impulso.'] },
    estabilidad: { steps: ['Abdomen apretado como si fueras a recibir un golpe.', 'Mantené la posición o movete lento sin que el tronco se arquee.', 'Respirá de forma continua.'], errors: ['Dejar caer la cadera o arquear la zona lumbar.', 'Aguantar la respiración.'] },
    agarre: { steps: ['Sostené el peso con firmeza.', 'Movete con control.', 'Cortá la serie si perdés el agarre.'], errors: ['Usar impulso.'] },
    'cuerpo-completo': { steps: ['Aprendelo con poco peso y, si es posible, con un entrenador.', 'Priorizá la técnica antes que la velocidad.'], errors: ['Agregar peso antes de dominar la técnica.'] },
    cardio: { steps: ['Empezá suave unos minutos.', 'Mantené un ritmo que puedas sostener.', 'Terminá bajando la intensidad.'], errors: ['Arrancar demasiado fuerte.'] },
  };

  /* ---------- Fichas específicas (los más usados por principiantes) ---------- */
  const GUIDES = {
    /* Pecho */
    'press-pecho-maq': { steps: ['Ajustá el asiento para que las manijas queden a la altura de la mitad del pecho.', 'Apoyá bien la espalda, omóplatos hacia atrás y pies en el piso.', 'Empujá hasta casi estirar los brazos.', 'Volvé con control hasta sentir el pecho estirado, sin que el peso apoye.'], errors: ['Asiento muy alto o muy bajo (las manijas a la altura del cuello o del abdomen).', 'Despegar la espalda del respaldo.', 'Recorridos cortos.'] },
    'press-banca': { steps: ['Acostate con los ojos debajo de la barra y los pies firmes en el piso.', 'Agarrá la barra un poco más ancho que los hombros y llevá los omóplatos hacia atrás y abajo.', 'Bajá la barra con control hasta tocar suave la parte media-baja del pecho.', 'Empujá hasta estirar los brazos, sin despegar la cola del banco.'], errors: ['Rebotar la barra en el pecho.', 'Codos muy abiertos (a 90° del cuerpo).', 'Despegar la cadera del banco.', 'Entrenar pesado sin compañero ni topes de seguridad.'] },
    'press-banca-manc': { steps: ['Sentate con las mancuernas sobre los muslos y acostate llevándolas al pecho.', 'Omóplatos atrás, pies firmes.', 'Empujá hasta arriba del pecho sin chocar las mancuernas.', 'Bajá con control hasta sentir el pecho estirado.'], errors: ['Bajar más de lo que el hombro tolera cómodo.', 'Dejar caer las mancuernas al terminar la serie.'] },
    'press-inclinado-manc': { steps: ['Banco inclinado a unos 30°.', 'Mancuernas a la altura de la parte alta del pecho, codos algo por debajo de los hombros.', 'Empujá hacia arriba hasta casi estirar los brazos.', 'Bajá con control.'], errors: ['Inclinación excesiva (se vuelve un press de hombros).', 'Arquear mucho la espalda baja.'] },
    'press-inclinado-maq': { steps: ['Ajustá el asiento para que las manijas queden a la altura de la parte alta del pecho.', 'Espalda apoyada, pies firmes.', 'Empujá hasta casi estirar los brazos y volvé con control.'], errors: ['Despegar la espalda del respaldo.'] },
    'pec-deck': { steps: ['Ajustá el asiento para que las manijas queden a la altura del pecho.', 'Espalda apoyada, codos levemente flexionados.', 'Juntá los brazos por delante del pecho.', 'Abrí con control hasta sentir el pecho estirado.'], errors: ['Doblar los codos para empujar.', 'Abrir más de lo cómodo para el hombro.', 'Despegar la espalda del respaldo.'] },
    'aperturas-polea-media': { steps: ['Poleas a la altura del pecho; dá un paso adelante para tener tensión.', 'Codos levemente flexionados y fijos.', 'Juntá las manos por delante del pecho.', 'Volvé con control hasta sentir el pecho estirado.'], errors: ['Inclinarte mucho hacia adelante.', 'Convertirlo en un press doblando los codos.'] },
    flexiones: { steps: ['Manos un poco más anchas que los hombros, cuerpo en línea de cabeza a talones.', 'Bajá el pecho hacia el piso con los codos a unos 45° del cuerpo.', 'Empujá hasta estirar los brazos.', 'Si te cuesta, hacelas con las manos apoyadas en un banco.'], errors: ['Dejar caer la cadera.', 'Subir primero la cola.', 'Codos completamente abiertos.'] },
    /* Espalda */
    'jalon-pecho': { steps: ['Ajustá el rodillo para que las piernas queden firmes.', 'Agarrá la barra un poco más ancho que los hombros.', 'Llevá la barra hacia la parte alta del pecho bajando los codos hacia los costados.', 'Subí con control hasta estirar los brazos.'], errors: ['Tirarte hacia atrás para mover más peso.', 'Llevar la barra detrás de la nuca.', 'Encoger los hombros.'] },
    'jalon-neutro': { steps: ['Usá un agarre con las palmas enfrentadas.', 'Llevá las manijas hacia el pecho con los codos cerca del cuerpo.', 'Subí con control hasta estirar los brazos.'], errors: ['Balancear el tronco.'] },
    'dominada-asistida': { steps: ['Elegí una asistencia que te permita hacer todas las repeticiones con buena técnica (más peso de asistencia = más fácil).', 'Agarrá la barra y bajá los hombros lejos de las orejas.', 'Subí hasta que el mentón pase la barra.', 'Bajá con control hasta estirar los brazos.'], errors: ['Patear o balancearte.', 'Hacer medias repeticiones.'] },
    'remo-polea': { steps: ['Sentate con los pies apoyados y las rodillas apenas flexionadas.', 'Espalda neutra y pecho alto.', 'Tirá de la manija hacia el abdomen llevando los codos hacia atrás.', 'Volvé estirando los brazos con control, sin redondear la espalda.'], errors: ['Mecerse hacia atrás para tirar.', 'Redondear la espalda al volver.', 'Encoger los hombros.'] },
    'remo-manc': { steps: ['Apoyá una mano y una rodilla en el banco, espalda neutra.', 'Con la otra mano, tirá de la mancuerna hacia la cadera.', 'Bajá con control hasta estirar el brazo.', 'Completá las repeticiones y cambiá de lado.'], errors: ['Girar el tronco para subir el peso.', 'Tirar hacia el hombro en lugar de hacia la cadera.'] },
    'remo-maq': { steps: ['Ajustá el asiento para que las manijas queden a la altura del pecho bajo.', 'Apoyá el pecho en el respaldo.', 'Tirá llevando los codos hacia atrás.', 'Volvé con control.'], errors: ['Despegar el pecho del apoyo.'] },
    'remo-pecho-apoyado': { steps: ['Banco inclinado, pecho apoyado.', 'Tirá de las mancuernas llevando los codos hacia atrás.', 'Bajá con control hasta estirar los brazos.'], errors: ['Levantar el pecho del banco para ayudarte.'] },
    /* Piernas */
    prensa: { steps: ['Sentate con la espalda y la cola bien apoyadas.', 'Pies a lo ancho de hombros en el centro de la plataforma.', 'Bajá con control hasta donde la cola no se despegue del asiento.', 'Empujá hasta casi estirar las piernas, sin trabar las rodillas.', 'Usá los topes de seguridad.'], errors: ['Bajar tanto que la cola se levanta del asiento.', 'Trabar las rodillas arriba.', 'Juntar las rodillas hacia adentro.'] },
    'sentadilla-goblet': { steps: ['Sostené una mancuerna o kettlebell contra el pecho.', 'Pies a lo ancho de hombros, puntas apenas hacia afuera.', 'Bajá entre las piernas con el pecho alto, hasta un rango cómodo.', 'Subí empujando el piso con todo el pie.'], errors: ['Levantar los talones.', 'Rodillas hacia adentro.', 'Inclinar mucho el tronco.'] },
    'sentadilla-smith': { steps: ['Barra sobre la parte alta de la espalda, pies un poco adelantados.', 'Destrabá la barra y bajá con control.', 'Subí empujando con todo el pie.', 'Usá los topes de seguridad de la máquina.'], errors: ['Pies demasiado atrás.', 'Rebotar abajo.'] },
    'ext-cuadriceps': { steps: ['Ajustá el respaldo para que la rodilla quede alineada con el eje de la máquina.', 'Rodillo apoyado sobre el tobillo.', 'Estirá las rodillas por completo.', 'Bajá con control.'], errors: ['Patear con impulso.', 'Despegar la cadera del asiento.'] },
    'curl-femoral-sentado': { steps: ['Ajustá la máquina para que la rodilla quede alineada con el eje.', 'Trabá los muslos con el apoyo superior.', 'Doblá las rodillas llevando los talones hacia abajo y atrás.', 'Volvé con control hasta casi estirar.'], errors: ['Despegar la cola del asiento.', 'Soltar el peso de golpe.'] },
    'curl-femoral': { steps: ['Acostate boca abajo con las rodillas justo fuera del banco.', 'Rodillo apoyado arriba de los talones.', 'Llevá los talones hacia la cola.', 'Bajá con control.'], errors: ['Levantar la cadera.'] },
    'gemelos-pie': { steps: ['Apoyá la punta de los pies en el borde, con los talones libres.', 'Subí lo más alto posible.', 'Bajá lento hasta sentir el gemelo estirado.'], errors: ['Rebotar abajo.', 'Doblar las rodillas para ayudarte.'] },
    'gemelos-prensa': { steps: ['Apoyá solo la punta de los pies en el borde bajo de la plataforma.', 'Piernas estiradas sin trabar las rodillas y los topes de seguridad puestos.', 'Empujá con la punta de los pies y volvé lento.'], errors: ['Apoyar todo el pie.', 'Sacar los topes de seguridad.'] },
    'gemelos-sentado': { steps: ['Rodillas debajo del apoyo, punta de los pies en el escalón.', 'Subí los talones lo más alto posible.', 'Bajá lento.'], errors: ['Recorridos cortos.'] },
    'hip-thrust-maq': { steps: ['Acomodá la espalda alta en el respaldo y el cinturón sobre la cadera.', 'Pies apoyados de forma que, arriba, las rodillas queden a unos 90°.', 'Subí la cadera apretando glúteos.', 'Bajá con control.'], errors: ['Arquear la espalda baja arriba.'] },
    'rumano-manc': { steps: ['De pie con las mancuernas delante de los muslos, rodillas apenas flexionadas.', 'Llevá la cadera hacia atrás bajando las mancuernas cerca de las piernas.', 'Bajá hasta sentir los isquiotibiales estirados, con la espalda neutra.', 'Volvé empujando la cadera hacia adelante.'], errors: ['Redondear la espalda.', 'Doblar mucho las rodillas.', 'Alejar las mancuernas de las piernas.'] },
    /* Hombros */
    'press-hombro-maq': { steps: ['Ajustá el asiento para que las manijas queden a la altura de los hombros.', 'Espalda apoyada.', 'Empujá hacia arriba sin trabar los codos.', 'Bajá con control.'], errors: ['Arquear la espalda baja.'] },
    'press-hombro-manc': { steps: ['Sentate con respaldo vertical o casi vertical.', 'Mancuernas a la altura de los hombros.', 'Empujá hacia arriba.', 'Bajá con control a la altura de las orejas.'], errors: ['Arquear la zona lumbar.', 'Chocar las mancuernas arriba.'] },
    'elev-laterales': { steps: ['De pie, mancuernas al costado y codos apenas flexionados.', 'Elevá los brazos hacia los costados hasta la altura de los hombros.', 'Bajá lento.'], errors: ['Balancear el cuerpo.', 'Encoger los hombros.'] },
    'face-pull': { steps: ['Polea a la altura de la cara, con cuerda.', 'Tirá hacia la cara separando las manos y llevando los codos hacia afuera y atrás.', 'Volvé con control.'], errors: ['Tirar con la espalda baja.', 'Usar mucho peso.'] },
    /* Brazos */
    'curl-manc': { steps: ['De pie, mancuernas al costado con las palmas hacia adelante.', 'Codos quietos al costado del cuerpo.', 'Doblá los codos llevando las mancuernas hacia los hombros.', 'Bajá con control hasta estirar los brazos.'], errors: ['Balancear el cuerpo.', 'Mover los codos hacia adelante.', 'Bajar de golpe.'] },
    'curl-martillo': { steps: ['Mancuernas al costado con las palmas enfrentadas (agarre neutro).', 'Codos quietos.', 'Subí sin girar la muñeca.', 'Bajá con control.'], errors: ['Balancearte.', 'Girar la muñeca.'] },
    'curl-polea': { steps: ['Polea baja con barra o manija; parate cerca.', 'Codos al costado del cuerpo.', 'Doblá los codos hasta llevar la barra a la altura del pecho.', 'Bajá con control.'], errors: ['Inclinarte hacia atrás.', 'Adelantar los codos.'] },
    'curl-barra-z': { steps: ['Agarrá la barra Z por las partes inclinadas.', 'Codos al costado del cuerpo.', 'Subí la barra doblando los codos y bajá con control.'], errors: ['Balancear la cadera.'] },
    'ext-triceps-polea': { steps: ['Polea alta con barra; codos pegados al cuerpo.', 'Estirá los brazos por completo empujando hacia abajo.', 'Volvé con control hasta que los antebrazos queden por encima de la horizontal.'], errors: ['Mover los codos hacia adelante y atrás.', 'Inclinarte sobre la barra para usar el peso del cuerpo.'] },
    'ext-triceps-cuerda': { steps: ['Polea alta con cuerda; codos pegados al cuerpo.', 'Empujá hacia abajo y separá apenas las manos al final.', 'Volvé con control.'], errors: ['Mover los codos.', 'Usar el tronco.'] },
    'ext-overhead-polea': { steps: ['De espaldas a la polea, cuerda o barra detrás de la cabeza.', 'Codos apuntando hacia adelante y arriba, quietos.', 'Estirá los brazos por completo.', 'Volvé con control sintiendo el tríceps estirado.'], errors: ['Abrir mucho los codos.', 'Arquear la espalda baja.'] },
    'ext-triceps-manc': { steps: ['Sentado con respaldo, sostené una mancuerna con ambas manos detrás de la cabeza.', 'Codos apuntando hacia arriba, quietos.', 'Estirá los brazos y bajá con control.'], errors: ['Abrir los codos.', 'Arquear la zona lumbar.'] },
    /* Abdomen */
    plancha: { steps: ['Antebrazos en el piso, codos debajo de los hombros.', 'Cuerpo en línea de cabeza a talones, abdomen y glúteos apretados.', 'Sostené respirando normal.'], errors: ['Dejar caer la cadera.', 'Levantar mucho la cola.', 'Aguantar la respiración.'] },
    'crunch-polea': { steps: ['De rodillas frente a la polea alta, cuerda a los costados de la cabeza.', 'Flexioná el tronco acercando las costillas a la pelvis.', 'Volvé con control.'], errors: ['Tirar con los brazos.', 'Sentarte sobre los talones (se mueve la cadera, no el abdomen).'] },
    'bicho-muerto': { steps: ['Boca arriba, brazos al techo y rodillas a 90°.', 'Bajá el brazo de un lado y la pierna contraria sin que la zona lumbar se despegue.', 'Volvé y alterná.'], errors: ['Arquear la espalda baja.', 'Hacerlo rápido.'] },
  };

  /* ---------- Glosario (ayudas contextuales) ---------- */
  const GLOSSARY = {
    series: { t: 'Series', d: 'Una serie es un bloque de repeticiones seguidas. "3 series de 10" son tres bloques de 10 repeticiones, con descanso entre medio.' },
    repeticiones: { t: 'Repeticiones', d: 'Cada vez que hacés el movimiento completo (subir y bajar) es una repetición.' },
    rango: { t: 'Rango de repeticiones', d: 'Un rango como 8–12 significa: elegí un peso con el que llegues a 8 como mínimo. Cuando hagas 12 en todas las series con buena técnica, subí un poco el peso.' },
    descanso: { t: 'Descanso', d: 'Tiempo entre series. Los ejercicios grandes (prensa, remo) suelen necesitar 1,5–3 minutos; los de aislamiento, 1–2 minutos. Descansar lo suficiente ayuda a mantener la calidad de las series.' },
    sobrecarga: { t: 'Sobrecarga progresiva', d: 'Para seguir mejorando, el esfuerzo tiene que aumentar de a poco con el tiempo: más repeticiones, más peso o mejor técnica. ASCEND te sugiere cuándo subir, pero vos decidís.' },
    rir: { t: 'RIR (repeticiones en reserva)', d: 'Cuántas repeticiones más podrías haber hecho con buena técnica. RIR 2 = te quedaban 2. Al empezar, terminar las series con 2–3 de reserva es una buena referencia.' },
    rpe: { t: 'RPE (esfuerzo percibido)', d: 'Qué tan dura fue la serie del 1 al 10. RPE 10 = no podías hacer ni una más; RPE 8 ≈ te quedaban 2.' },
    calentamiento: { t: 'Calentamiento', d: '5–10 minutos de movimiento suave (bici, caminata) y 1–2 series livianas del primer ejercicio antes de las series de trabajo.' },
    recuperacion: { t: 'Recuperación', d: 'El músculo mejora mientras descansa. Dormir bien y dejar 48 horas aproximadamente antes de volver a entrenar fuerte el mismo grupo ayuda a progresar. Si algo duele (dolor distinto al cansancio muscular), pará.' },
    compuesto: { t: 'Compuesto y aislamiento', d: 'Un ejercicio compuesto mueve varias articulaciones y músculos (prensa, remo, press). Uno de aislamiento se enfoca en uno (curl, extensión de rodilla). Lo habitual es empezar con compuestos.' },
    superserie: { t: 'Superserie', d: 'Hacer una serie de un ejercicio y, sin descansar, una del siguiente. Ahorra tiempo; se descansa al terminar la ronda.' },
    patron: { t: 'Patrón de movimiento', d: 'El tipo de movimiento que hace un ejercicio (empujar, tirar, sentadilla, bisagra…). Dos ejercicios con el mismo patrón y el mismo músculo suelen poder reemplazarse entre sí.' },
  };

  /* ---------- Rutinas básicas de iniciación ---------- */
  const BASIC_NOTE = 'Rutina orientativa para aprender los movimientos. No es un plan universal: la técnica, la recuperación y tu situación personal importan más que seguirla al pie de la letra. Si tenés una lesión, una condición de salud o dudas sobre la ejecución, consultá a un profesional.';
  const BASIC_ROUTINES = [
    {
      id: 'basica-pecho', muscle: 'pecho', name: 'Pecho · Iniciación', level: 'Principiante',
      description: 'Tres ejercicios para aprender el empuje horizontal, el inclinado y una apertura. Empieza con máquina para que la trayectoria sea más fácil de controlar.',
      items: [['press-pecho-maq', 3, '10-12', 90, 'Base de la rutina: empuje horizontal guiado.'], ['press-inclinado-manc', 3, '10-12', 90, 'Suma la parte superior del pecho.'], ['pec-deck', 2, '12-15', 60, 'Aislamiento sin depender del tríceps.']],
      tips: ['Elegí pesos que te dejen 2–3 repeticiones de reserva en cada serie.', 'Cuando domines el press en máquina, podés reemplazarlo por press de banca con barra o con mancuernas.', 'Combinala con la rutina de espalda en la semana para equilibrar empujes y tracciones.'],
    },
    {
      id: 'basica-espalda', muscle: 'espalda', name: 'Espalda · Iniciación', level: 'Principiante',
      description: 'Aprendé la tracción vertical (jalón) y la horizontal (remos), las dos bases del trabajo de espalda.',
      items: [['jalon-pecho', 3, '10-12', 90, 'Tracción vertical: dorsales.'], ['remo-polea', 3, '10-12', 90, 'Tracción horizontal: espalda media.'], ['remo-manc', 2, '10-12', 75, 'Un brazo por vez; repeticiones por cada lado.']],
      tips: ['Pensá en llevar los codos hacia abajo o hacia atrás, no en tirar con las manos.', 'No te balancees: si necesitás impulso, el peso es demasiado alto.', 'Si querés trabajar el hombro posterior, podés agregar un face pull.'],
    },
    {
      id: 'basica-piernas', muscle: 'piernas', name: 'Piernas · Iniciación', level: 'Principiante',
      description: 'Cuádriceps, glúteos, isquiotibiales y gemelos con máquinas, para aprender a controlar el peso antes de pasar a variantes libres.',
      items: [['prensa', 3, '10-12', 120, 'Movimiento base: cuádriceps y glúteos.'], ['curl-femoral-sentado', 3, '10-12', 75, 'Isquiotibiales.'], ['ext-cuadriceps', 2, '12-15', 75, 'Aislamiento de cuádriceps.'], ['gemelos-prensa', 2, '12-15', 60, 'Gemelos en la misma prensa.']],
      tips: ['Usá siempre los topes de seguridad de la prensa.', 'Bajá solo hasta donde la cola no se despegue del asiento.', 'Más adelante podés sumar una sentadilla goblet para aprender la sentadilla libre.'],
    },
    {
      id: 'basica-brazos', muscle: 'brazos', name: 'Brazos · Iniciación', level: 'Principiante',
      description: 'Bíceps y tríceps por separado, con dos ejercicios para cada uno y sin variantes repetidas.',
      items: [['curl-manc', 3, '10-12', 60, 'Bíceps: flexión de codo con supinación.'], ['curl-martillo', 2, '10-12', 60, 'Braquial y braquiorradial (agarre neutro).'], ['ext-triceps-polea', 3, '10-12', 60, 'Tríceps: extensión con codos fijos.'], ['ext-overhead-polea', 2, '10-12', 60, 'Tríceps con el brazo por encima de la cabeza (cabeza larga).']],
      tips: ['Los codos quietos son la clave de estos ejercicios.', 'No hace falta mucho peso: priorizá el recorrido completo.', 'Los brazos también trabajan en los ejercicios de pecho y espalda; tenelo en cuenta si entrenás todo el mismo día.'],
    },
  ];
  // Grupos que abarca cada rutina básica (para el análisis de equilibrio)
  const BASIC_GROUPS = { pecho: ['pecho'], espalda: ['espalda'], piernas: ['cuadriceps', 'isquios', 'gluteos', 'gemelos'], brazos: ['biceps', 'triceps'] };

  /** Duración estimada en minutos: calentamiento + series (≈45 s de trabajo) + descansos */
  function estimateMinutes(items) {
    let sec = 8 * 60;
    (items || []).forEach((it) => {
      const sets = Math.max(1, Number(it.sets) || 1);
      sec += sets * 45 + (sets - 1) * (Number(it.rest) || 90) + 60; // + 1 min para cambiar de ejercicio
    });
    return Math.max(10, Math.round(sec / 60 / 5) * 5);
  }

  ASC.exerciseGuide = {
    PATTERNS, BY_PATTERN, PATTERN_GUIDE, GUIDES, GLOSSARY, LEVELS, AVOID_TAGS, BASIC_ROUTINES, BASIC_GROUPS, BASIC_NOTE,
    patternOf, difficulty, levelNum, avoidTagsOf, estimateMinutes,
    patternLabel: (p) => (PATTERNS[p] ? PATTERNS[p].label : 'Otro'),
    levelLabel: (n) => LEVELS[n] || 'Principiante',
    /** Ficha: específica si existe; si no, guía general del patrón */
    guideFor(ex) {
      if (!ex) return null;
      if (GUIDES[ex.id]) return Object.assign({ specific: true }, GUIDES[ex.id]);
      const p = patternOf(ex);
      return PATTERN_GUIDE[p] ? Object.assign({ specific: false }, PATTERN_GUIDE[p]) : null;
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
