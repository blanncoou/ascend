/* ASCEND · Biblioteca de ejercicios
 * Organizada por GRUPO muscular y ZONA dentro del grupo (ej. pecho superior / medio / inferior).
 * Cada ejercicio indica: tipo (compuesto / aislamiento), si carga el músculo en posición
 * estirada (stretch) y equipamiento. Las descripciones son orientativas y conservadoras:
 * no son indicaciones médicas.
 * Los ids son estables: el historial del usuario los referencia (no cambiarlos).
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});

  const MUSCLES = [
    { id: 'pecho', label: 'Pecho', color: '#F04459', regions: [['sup', 'Pecho superior'], ['med', 'Pecho medio'], ['inf', 'Pecho inferior']] },
    { id: 'espalda', label: 'Espalda', color: '#ff7a1a', regions: [['dorsal', 'Dorsales'], ['media', 'Espalda media'], ['trap', 'Trapecio superior'], ['lumbar', 'Zona lumbar']] },
    { id: 'hombros', label: 'Hombros', color: '#ffc21a', regions: [['ant', 'Deltoides anterior'], ['lat', 'Deltoides lateral'], ['post', 'Deltoides posterior']] },
    { id: 'biceps', label: 'Bíceps', color: '#3ddc84', regions: [['larga', 'Cabeza larga'], ['corta', 'Cabeza corta y zona distal'], ['braquial', 'Braquial y braquiorradial']] },
    { id: 'triceps', label: 'Tríceps', color: '#1ec8ff', regions: [['larga', 'Cabeza larga'], ['lateral', 'Cabezas lateral y medial'], ['comp', 'Empujes compuestos']] },
    { id: 'cuadriceps', label: 'Cuádriceps', color: '#5b7cff', regions: [['vastos', 'Vastos (compuestos)'], ['recto', 'Recto femoral'], ['uni', 'Unilaterales']] },
    { id: 'isquios', label: 'Isquiotibiales', color: '#9b6bff', regions: [['rodilla', 'Flexión de rodilla'], ['cadera', 'Bisagra de cadera']] },
    { id: 'gluteos', label: 'Glúteos', color: '#ff4fa3', regions: [['mayor', 'Glúteo mayor'], ['medio', 'Glúteo medio y menor']] },
    { id: 'gemelos', label: 'Gemelos', color: '#2ed3b7', regions: [['gastro', 'Gastrocnemio (rodilla extendida)'], ['soleo', 'Sóleo (rodilla flexionada)']] },
    { id: 'abdomen', label: 'Abdomen', color: '#d4d4da', regions: [['recto', 'Recto abdominal'], ['oblicuos', 'Oblicuos'], ['core', 'Estabilidad (core)']] },
    { id: 'antebrazos', label: 'Antebrazos', color: '#a3e635', regions: [['flex', 'Flexores y agarre'], ['ext', 'Extensores']] },
    { id: 'otros', label: 'Otros', color: '#9b9ba4', regions: [['aductores', 'Aductores'], ['full', 'Cuerpo completo'], ['cardio', 'Acondicionamiento']] },
  ];

  const EQUIPMENT = ['Barra', 'Mancuernas', 'Máquina', 'Polea', 'Peso corporal', 'Kettlebell', 'Banda', 'Otro'];

  // Indicaciones generales por tipo de movimiento (se suman a las propias de cada ejercicio)
  const GENERIC = {
    c: 'Elegí un peso que te permita mantener la técnica en todas las repeticiones.',
    a: 'Movete con control, sin impulso, en el rango que te resulte cómodo.',
  };

  // [id, nombre, grupo, zona, secundarios, equipamiento, tipo c|a, estiramiento 0|1, descripción, indicaciones?]
  const RAW = [
    /* ---------- PECHO ---------- */
    ['press-banca', 'Press de banca', 'pecho', 'med', ['triceps', 'hombros'], 'Barra', 'c', 0, 'Empuje horizontal acostado en banco plano, bajando la barra hacia el pecho.', ['Mantené los pies apoyados y la espalda estable sobre el banco.', 'Bajá con control, sin rebotar la barra en el pecho.', 'Usá un compañero o topes de seguridad con pesos altos.']],
    ['press-banca-manc', 'Press de banca con mancuernas', 'pecho', 'med', ['triceps', 'hombros'], 'Mancuernas', 'c', 1, 'Press plano con mancuernas; permite algo más de recorrido que la barra.', ['Bajá hasta una amplitud cómoda para los hombros.']],
    ['press-pecho-maq', 'Press de pecho en máquina', 'pecho', 'med', ['triceps', 'hombros'], 'Máquina', 'c', 0, 'Empuje horizontal guiado; útil para acercarse al fallo con seguridad.', []],
    ['smith-banca', 'Press de banca en Smith', 'pecho', 'med', ['triceps', 'hombros'], 'Máquina', 'c', 0, 'Press plano con la barra guiada por rieles.', ['Ubicá el banco para que la barra baje a la altura media del pecho.']],
    ['press-suelo', 'Press en el suelo', 'pecho', 'med', ['triceps'], 'Barra', 'c', 0, 'Press acostado en el suelo; el recorrido termina cuando los codos tocan el piso.', []],
    ['flexiones', 'Flexiones de brazos', 'pecho', 'med', ['triceps', 'hombros', 'abdomen'], 'Peso corporal', 'c', 0, 'Empuje desde el suelo manteniendo el cuerpo alineado.', ['Mantené el cuerpo en línea de cabeza a talones.', 'Apoyá las rodillas para una versión más sencilla.']],
    ['aperturas-manc', 'Aperturas con mancuernas', 'pecho', 'med', ['hombros'], 'Mancuernas', 'a', 1, 'Apertura y cierre de brazos acostado, con codos levemente flexionados.', ['Mantené una leve flexión de codos todo el movimiento.', 'No fuerces la amplitud más allá de lo cómodo.']],
    ['pec-deck', 'Pec deck (contractor)', 'pecho', 'med', ['hombros'], 'Máquina', 'a', 0, 'Cierre de brazos sentado en máquina.', []],
    ['aperturas-polea-media', 'Aperturas en polea a media altura', 'pecho', 'med', ['hombros'], 'Polea', 'a', 1, 'Cierre de brazos con poleas a la altura del pecho.', []],
    ['press-inclinado-manc', 'Press inclinado con mancuernas', 'pecho', 'sup', ['hombros', 'triceps'], 'Mancuernas', 'c', 0, 'Empuje en banco inclinado, con más énfasis en la parte superior del pecho.', ['Una inclinación de 30° a 45° es un buen punto de partida.', 'Bajá las mancuernas con control.']],
    ['press-inclinado-barra', 'Press inclinado con barra', 'pecho', 'sup', ['hombros', 'triceps'], 'Barra', 'c', 0, 'Press con barra en banco inclinado.', ['Usá topes o compañero con cargas altas.']],
    ['press-inclinado-smith', 'Press inclinado en Smith', 'pecho', 'sup', ['hombros', 'triceps'], 'Máquina', 'c', 0, 'Press inclinado con barra guiada.', []],
    ['press-inclinado-maq', 'Press inclinado en máquina', 'pecho', 'sup', ['hombros', 'triceps'], 'Máquina', 'c', 0, 'Empuje inclinado guiado.', []],
    ['aperturas-inclinadas', 'Aperturas inclinadas', 'pecho', 'sup', ['hombros'], 'Mancuernas', 'a', 1, 'Aperturas en banco inclinado.', ['Usá poco peso y codos levemente flexionados.']],
    ['cruce-poleas-bajo', 'Cruce de poleas de abajo hacia arriba', 'pecho', 'sup', ['hombros'], 'Polea', 'a', 0, 'Cierre de brazos desde poleas bajas hacia la altura de los hombros.', []],
    ['flexiones-declinadas', 'Flexiones con pies elevados', 'pecho', 'sup', ['hombros', 'triceps'], 'Peso corporal', 'c', 0, 'Flexiones con los pies sobre un banco: el ángulo se parece a un press inclinado.', []],
    ['press-landmine', 'Press landmine', 'pecho', 'sup', ['hombros', 'triceps'], 'Barra', 'c', 0, 'Empuje de una barra anclada en un extremo, en diagonal hacia arriba.', []],
    ['press-declinado', 'Press declinado', 'pecho', 'inf', ['triceps'], 'Barra', 'c', 0, 'Press en banco declinado, con la cabeza más baja que la cadera.', ['Asegurá bien los pies antes de empezar.']],
    ['press-declinado-manc', 'Press declinado con mancuernas', 'pecho', 'inf', ['triceps'], 'Mancuernas', 'c', 0, 'Press declinado con mancuernas.', []],
    ['fondos-pecho', 'Fondos con inclinación hacia adelante', 'pecho', 'inf', ['triceps', 'hombros'], 'Peso corporal', 'c', 1, 'Fondos en paralelas inclinando el torso hacia adelante.', ['Bajá solo hasta donde tus hombros estén cómodos.']],
    ['cruce-poleas', 'Cruce de poleas de arriba hacia abajo', 'pecho', 'inf', ['hombros'], 'Polea', 'a', 0, 'Cierre de brazos desde poleas altas hacia la cadera.', ['Mantené el torso estable.', 'Controlá la vuelta, sin dejar que el peso tire de los brazos.']],

    /* ---------- ESPALDA ---------- */
    ['dominadas', 'Dominadas', 'espalda', 'dorsal', ['biceps'], 'Peso corporal', 'c', 1, 'Tracción vertical colgado de una barra con agarre prono.', ['Empezá con brazos extendidos y subí con control.', 'Podés usar banda o máquina asistida.']],
    ['dominadas-supinas', 'Dominadas supinas (chin-ups)', 'espalda', 'dorsal', ['biceps'], 'Peso corporal', 'c', 1, 'Dominadas con las palmas hacia vos; suman más bíceps.', []],
    ['dominada-asistida', 'Dominada asistida en máquina', 'espalda', 'dorsal', ['biceps'], 'Máquina', 'c', 1, 'Dominada con contrapeso para reducir la carga corporal.', []],
    ['jalon-pecho', 'Jalón al pecho', 'espalda', 'dorsal', ['biceps'], 'Polea', 'c', 1, 'Tracción vertical en polea alta hacia la parte alta del pecho.', ['Evitá balancear el torso.', 'Dejá subir la barra con control.']],
    ['jalon-neutro', 'Jalón con agarre neutro', 'espalda', 'dorsal', ['biceps'], 'Polea', 'c', 1, 'Jalón con agarre de palmas enfrentadas.', []],
    ['jalon-supino', 'Jalón con agarre supino', 'espalda', 'dorsal', ['biceps'], 'Polea', 'c', 1, 'Jalón con palmas hacia vos y agarre al ancho de hombros.', []],
    ['jalon-unilateral', 'Jalón a una mano', 'espalda', 'dorsal', ['biceps'], 'Polea', 'c', 1, 'Jalón unilateral que permite un estiramiento amplio arriba.', []],
    ['pullover-polea', 'Pullover en polea (brazos rectos)', 'espalda', 'dorsal', [], 'Polea', 'a', 0, 'Llevar la barra desde arriba hacia la cadera con brazos casi rectos.', ['El movimiento sale del hombro, no de los codos.']],
    ['pullover-manc', 'Pullover con mancuerna', 'espalda', 'dorsal', ['pecho', 'triceps'], 'Mancuernas', 'a', 1, 'Acostado, llevar una mancuerna por detrás de la cabeza y volver.', ['Bajá solo hasta donde controles el hombro.']],
    ['remo-barra', 'Remo con barra', 'espalda', 'media', ['biceps', 'isquios'], 'Barra', 'c', 0, 'Tracción horizontal con el torso inclinado hacia adelante.', ['Mantené la espalda en posición neutra.']],
    ['remo-pendlay', 'Remo Pendlay', 'espalda', 'media', ['biceps'], 'Barra', 'c', 0, 'Remo con barra que arranca desde el suelo en cada repetición.', []],
    ['remo-manc', 'Remo con mancuerna a una mano', 'espalda', 'media', ['biceps'], 'Mancuernas', 'c', 1, 'Tracción unilateral apoyando una mano y una rodilla en el banco.', ['Llevá el codo hacia atrás, cerca del cuerpo.', 'Evitá girar el torso para ayudarte.']],
    ['remo-polea', 'Remo en polea baja', 'espalda', 'media', ['biceps'], 'Polea', 'c', 1, 'Tracción horizontal sentado hacia el abdomen.', ['Mantené el torso firme, sin balancearte.']],
    ['remo-t', 'Remo en T', 'espalda', 'media', ['biceps'], 'Barra', 'c', 0, 'Remo con barra anclada o máquina en T.', []],
    ['remo-pecho-apoyado', 'Remo con pecho apoyado', 'espalda', 'media', ['biceps', 'hombros'], 'Mancuernas', 'c', 0, 'Remo con el pecho sobre un banco inclinado: quita carga de la zona lumbar.', []],
    ['remo-maq', 'Remo sentado en máquina', 'espalda', 'media', ['biceps'], 'Máquina', 'c', 0, 'Remo horizontal guiado con apoyo de pecho.', []],
    ['remo-invertido', 'Remo invertido', 'espalda', 'media', ['biceps', 'abdomen'], 'Peso corporal', 'c', 0, 'Colgado debajo de una barra baja, llevar el pecho hacia ella.', ['Más horizontal = más difícil.']],
    ['remo-seal', 'Remo Seal', 'espalda', 'media', ['biceps'], 'Barra', 'c', 0, 'Remo acostado boca abajo sobre un banco alto.', []],
    ['remo-landmine', 'Remo landmine a una mano', 'espalda', 'media', ['biceps'], 'Barra', 'c', 1, 'Remo unilateral con barra anclada en un extremo.', []],
    ['encogimientos-barra', 'Encogimientos con barra', 'espalda', 'trap', [], 'Barra', 'a', 0, 'Elevar los hombros hacia las orejas sosteniendo una barra.', ['Evitá rotar los hombros.']],
    ['encogimientos-manc', 'Encogimientos con mancuernas', 'espalda', 'trap', ['antebrazos'], 'Mancuernas', 'a', 0, 'Elevación de hombros con mancuernas a los costados.', []],
    ['hiperextensiones', 'Hiperextensiones (extensión lumbar)', 'espalda', 'lumbar', ['gluteos', 'isquios'], 'Máquina', 'a', 0, 'Extensión de tronco en banco romano.', ['Movete con control, sin hiperextender de golpe.']],

    /* ---------- HOMBROS ---------- */
    ['press-militar', 'Press militar', 'hombros', 'ant', ['triceps'], 'Barra', 'c', 0, 'Empuje vertical de la barra desde los hombros por encima de la cabeza.', ['Apretá abdomen y glúteos para estabilizar.', 'Evitá arquear de más la zona lumbar.']],
    ['press-hombro-manc', 'Press de hombros con mancuernas', 'hombros', 'ant', ['triceps'], 'Mancuernas', 'c', 0, 'Empuje vertical con mancuernas, sentado o de pie.', []],
    ['press-arnold', 'Press Arnold', 'hombros', 'ant', ['triceps'], 'Mancuernas', 'c', 0, 'Press de hombros que arranca con palmas hacia vos y rota al subir.', []],
    ['press-hombro-maq', 'Press de hombros en máquina', 'hombros', 'ant', ['triceps'], 'Máquina', 'c', 0, 'Empuje vertical guiado.', []],
    ['push-press', 'Push press', 'hombros', 'ant', ['triceps', 'cuadriceps'], 'Barra', 'c', 0, 'Press por encima de la cabeza ayudado por un impulso de piernas.', ['Aprendelo con poco peso.']],
    ['elev-frontal', 'Elevación frontal', 'hombros', 'ant', [], 'Mancuernas', 'a', 0, 'Elevar los brazos hacia adelante hasta la altura de los hombros.', []],
    ['elev-laterales', 'Elevaciones laterales', 'hombros', 'lat', [], 'Mancuernas', 'a', 0, 'Elevar los brazos hacia los costados hasta la altura de los hombros.', ['Usá un peso liviano y controlado.', 'Evitá impulsarte con el cuerpo.']],
    ['elev-laterales-polea', 'Elevación lateral en polea', 'hombros', 'lat', [], 'Polea', 'a', 1, 'Elevación lateral con el cable cruzando por delante o detrás del cuerpo.', []],
    ['elev-laterales-maq', 'Elevación lateral en máquina', 'hombros', 'lat', [], 'Máquina', 'a', 0, 'Abducción de hombros guiada.', []],
    ['elev-lateral-inclinado', 'Elevación lateral inclinado', 'hombros', 'lat', [], 'Mancuernas', 'a', 1, 'Elevación lateral apoyado de costado en un banco inclinado o sosteniéndote de un soporte.', []],
    ['remo-menton', 'Remo al mentón', 'hombros', 'lat', ['espalda'], 'Barra', 'c', 0, 'Tracción vertical de la barra hacia el pecho con codos altos.', ['Usá un agarre más ancho que los hombros y un recorrido cómodo.']],
    ['elev-y', 'Elevación en Y', 'hombros', 'lat', ['espalda'], 'Mancuernas', 'a', 0, 'Elevar los brazos en forma de Y, apoyado boca abajo en banco inclinado.', []],
    ['face-pull', 'Face pull', 'hombros', 'post', ['espalda'], 'Polea', 'a', 0, 'Tracción de una cuerda hacia la cara separando las manos.', ['Mantené los codos altos.']],
    ['pajaros', 'Elevaciones posteriores', 'hombros', 'post', ['espalda'], 'Mancuernas', 'a', 0, 'Elevaciones de brazos con el torso inclinado.', ['Usá poco peso y movimientos controlados.']],
    ['pec-deck-inverso', 'Pec deck inverso', 'hombros', 'post', ['espalda'], 'Máquina', 'a', 0, 'Apertura de brazos hacia atrás en máquina.', []],
    ['cruce-poleas-posterior', 'Cruce de poleas posterior', 'hombros', 'post', ['espalda'], 'Polea', 'a', 1, 'Apertura de brazos hacia atrás con poleas cruzadas.', []],

    /* ---------- BÍCEPS ---------- */
    ['curl-inclinado', 'Curl inclinado con mancuernas', 'biceps', 'larga', [], 'Mancuernas', 'a', 1, 'Curl sentado en banco inclinado con los brazos colgando por detrás del torso.', ['Usá menos peso que en el curl de pie.']],
    ['curl-bayesian', 'Curl en polea por detrás (Bayesian)', 'biceps', 'larga', [], 'Polea', 'a', 1, 'Curl a una mano de espaldas a la polea, con el brazo por detrás del cuerpo.', []],
    ['curl-barra', 'Curl con barra', 'biceps', 'corta', ['antebrazos'], 'Barra', 'a', 0, 'Flexión de codos levantando la barra con agarre supino.', ['Mantené los codos cerca del cuerpo.', 'Evitá balancear el torso.']],
    ['curl-barra-z', 'Curl con barra Z', 'biceps', 'corta', ['antebrazos'], 'Barra', 'a', 0, 'Curl con barra de agarre angulado, más cómodo para las muñecas.', []],
    ['curl-manc', 'Curl con mancuernas', 'biceps', 'corta', [], 'Mancuernas', 'a', 0, 'Flexión de codos con mancuernas, alternada o simultánea.', ['Bajá con control hasta extender los brazos.']],
    ['curl-polea', 'Curl en polea', 'biceps', 'corta', [], 'Polea', 'a', 0, 'Flexión de codos con agarre en polea baja.', ['Mantené los codos quietos.']],
    ['curl-predicador', 'Curl predicador (Scott)', 'biceps', 'corta', [], 'Barra', 'a', 1, 'Curl con los brazos apoyados en un atril inclinado.', ['Bajá controlado: la parte de abajo es la más exigente.']],
    ['curl-predicador-manc', 'Curl predicador con mancuerna', 'biceps', 'corta', [], 'Mancuernas', 'a', 1, 'Curl unilateral apoyado en atril.', []],
    ['curl-predicador-maq', 'Curl en máquina predicador', 'biceps', 'corta', [], 'Máquina', 'a', 1, 'Curl guiado en máquina tipo Scott.', []],
    ['curl-concentrado', 'Curl concentrado', 'biceps', 'corta', [], 'Mancuernas', 'a', 0, 'Curl sentado con el codo apoyado en la cara interna del muslo.', []],
    ['curl-arana', 'Curl araña', 'biceps', 'corta', [], 'Mancuernas', 'a', 0, 'Curl apoyado boca abajo en banco inclinado, brazos colgando adelante.', []],
    ['curl-martillo', 'Curl martillo', 'biceps', 'braquial', ['antebrazos'], 'Mancuernas', 'a', 0, 'Curl con agarre neutro (palmas enfrentadas).', ['Mantené las muñecas firmes.']],
    ['curl-martillo-cuerda', 'Curl martillo en polea con cuerda', 'biceps', 'braquial', ['antebrazos'], 'Polea', 'a', 0, 'Curl con agarre neutro usando una cuerda.', []],
    ['curl-inverso', 'Curl invertido', 'biceps', 'braquial', ['antebrazos'], 'Barra', 'a', 0, 'Curl con agarre prono (palmas hacia abajo).', []],
    ['curl-zottman', 'Curl Zottman', 'biceps', 'braquial', ['antebrazos'], 'Mancuernas', 'a', 0, 'Subís con agarre supino y bajás con agarre prono.', []],

    /* ---------- TRÍCEPS ---------- */
    ['ext-overhead-polea', 'Extensión de tríceps sobre la cabeza en polea', 'triceps', 'larga', [], 'Polea', 'a', 1, 'Extensión de codos de espaldas a la polea, con los brazos por encima de la cabeza.', []],
    ['ext-triceps-manc', 'Extensión de tríceps sobre la cabeza', 'triceps', 'larga', [], 'Mancuernas', 'a', 1, 'Extensión de codos con una mancuerna por encima de la cabeza.', ['Movete en una amplitud cómoda para los hombros.']],
    ['press-frances', 'Press francés', 'triceps', 'larga', [], 'Barra', 'a', 1, 'Extensión de codos acostado, bajando la barra hacia la frente o por detrás de la cabeza.', ['Usá un peso que controles con seguridad.', 'Mantené los codos apuntando hacia arriba.']],
    ['ext-overhead-unilateral', 'Extensión a una mano sobre la cabeza en polea', 'triceps', 'larga', [], 'Polea', 'a', 1, 'Extensión unilateral con el brazo cruzando por encima de la cabeza.', []],
    ['ext-triceps-polea', 'Extensión de tríceps en polea (barra)', 'triceps', 'lateral', [], 'Polea', 'a', 0, 'Empujar una barra hacia abajo con los brazos al costado (pushdown).', ['Mantené los codos pegados al cuerpo.']],
    ['ext-triceps-cuerda', 'Extensión de tríceps con cuerda', 'triceps', 'lateral', [], 'Polea', 'a', 0, 'Pushdown con cuerda, separando las manos al final.', []],
    ['ext-unilateral-inversa', 'Extensión a una mano con agarre supino', 'triceps', 'lateral', [], 'Polea', 'a', 0, 'Pushdown unilateral con la palma hacia arriba.', []],
    ['patada-triceps', 'Patada de tríceps', 'triceps', 'lateral', [], 'Mancuernas', 'a', 0, 'Extensión de codo con el torso inclinado y el brazo pegado al cuerpo.', []],
    ['fondos', 'Fondos en paralelas', 'triceps', 'comp', ['pecho', 'hombros'], 'Peso corporal', 'c', 0, 'Bajar y subir el cuerpo sostenido en barras paralelas, torso erguido.', ['Bajá solo hasta donde tus hombros se sientan cómodos.', 'Podés usar asistencia o banda.']],
    ['press-cerrado', 'Press de banca agarre cerrado', 'triceps', 'comp', ['pecho', 'hombros'], 'Barra', 'c', 0, 'Press plano con las manos al ancho de hombros.', []],
    ['flexiones-diamante', 'Flexiones diamante', 'triceps', 'comp', ['pecho'], 'Peso corporal', 'c', 0, 'Flexiones con las manos juntas debajo del pecho.', []],
    ['fondos-banco', 'Fondos en banco', 'triceps', 'comp', ['hombros'], 'Peso corporal', 'c', 0, 'Fondos con las manos apoyadas en un banco detrás del cuerpo.', ['Evitalos si te generan molestia en el hombro.']],
    ['jm-press', 'JM press', 'triceps', 'comp', ['pecho'], 'Barra', 'c', 0, 'Híbrido entre press cerrado y press francés.', ['Aprendelo con poco peso.']],

    /* ---------- CUÁDRICEPS ---------- */
    ['sentadilla', 'Sentadilla con barra', 'cuadriceps', 'vastos', ['gluteos', 'otros'], 'Barra', 'c', 1, 'Flexión de rodillas y caderas con la barra en la espalda alta.', ['Mantené el torso firme y los pies apoyados.', 'Bajá hasta una profundidad que controles.', 'Usá topes de seguridad en el rack.']],
    ['sentadilla-frontal', 'Sentadilla frontal', 'cuadriceps', 'vastos', ['gluteos', 'abdomen'], 'Barra', 'c', 1, 'Sentadilla con la barra apoyada adelante, sobre los hombros.', []],
    ['sentadilla-hack', 'Sentadilla hack', 'cuadriceps', 'vastos', ['gluteos'], 'Máquina', 'c', 1, 'Sentadilla guiada en máquina con respaldo inclinado.', []],
    ['sentadilla-pendulo', 'Sentadilla péndulo', 'cuadriceps', 'vastos', ['gluteos'], 'Máquina', 'c', 1, 'Sentadilla en máquina de péndulo, con mucho énfasis en cuádriceps.', []],
    ['sentadilla-smith', 'Sentadilla en Smith', 'cuadriceps', 'vastos', ['gluteos'], 'Máquina', 'c', 1, 'Sentadilla con barra guiada.', []],
    ['sentadilla-goblet', 'Sentadilla goblet', 'cuadriceps', 'vastos', ['gluteos'], 'Mancuernas', 'c', 1, 'Sentadilla sosteniendo una mancuerna o kettlebell frente al pecho.', ['Buena opción para aprender el patrón.']],
    ['prensa', 'Prensa de piernas', 'cuadriceps', 'vastos', ['gluteos'], 'Máquina', 'c', 0, 'Empuje de la plataforma con las piernas.', ['No despegues la zona lumbar del respaldo.', 'Evitá bloquear las rodillas de golpe.']],
    ['ext-cuadriceps', 'Extensión de cuádriceps', 'cuadriceps', 'recto', [], 'Máquina', 'a', 0, 'Extensión de rodillas sentado en máquina.', ['Controlá la bajada.']],
    ['ext-cuadriceps-uni', 'Extensión de cuádriceps a una pierna', 'cuadriceps', 'recto', [], 'Máquina', 'a', 0, 'Extensión de rodilla unilateral.', []],
    ['sentadilla-sissy', 'Sentadilla sissy', 'cuadriceps', 'recto', [], 'Peso corporal', 'a', 1, 'Llevar las rodillas hacia adelante inclinando el cuerpo hacia atrás.', ['Sostenete de un soporte y progresá de a poco.']],
    ['nordico-inverso', 'Nórdico inverso', 'cuadriceps', 'recto', [], 'Peso corporal', 'a', 1, 'De rodillas, inclinar el cuerpo recto hacia atrás y volver.', ['Empezá con poco recorrido.']],
    ['zancadas', 'Zancadas', 'cuadriceps', 'uni', ['gluteos'], 'Mancuernas', 'c', 0, 'Paso largo flexionando ambas rodillas.', ['Mantené el torso erguido.']],
    ['zancada-reversa', 'Zancada hacia atrás', 'cuadriceps', 'uni', ['gluteos'], 'Mancuernas', 'c', 0, 'Zancada dando el paso hacia atrás; suele ser más amable con la rodilla.', []],
    ['zancada-caminando', 'Zancadas caminando', 'cuadriceps', 'uni', ['gluteos'], 'Mancuernas', 'c', 0, 'Zancadas avanzando paso a paso.', []],
    ['bulgara', 'Sentadilla búlgara', 'cuadriceps', 'uni', ['gluteos'], 'Mancuernas', 'c', 1, 'Sentadilla a una pierna con el pie trasero sobre un banco.', ['Buscá una distancia al banco que te resulte estable.']],
    ['subida-cajon', 'Subida al cajón (step-up)', 'cuadriceps', 'uni', ['gluteos'], 'Mancuernas', 'c', 0, 'Subir a un cajón o banco con una pierna.', []],

    /* ---------- ISQUIOTIBIALES ---------- */
    ['curl-femoral-sentado', 'Curl femoral sentado', 'isquios', 'rodilla', [], 'Máquina', 'a', 1, 'Flexión de rodillas sentado: la cadera flexionada estira más los isquios.', []],
    ['curl-femoral', 'Curl femoral acostado', 'isquios', 'rodilla', [], 'Máquina', 'a', 0, 'Flexión de rodillas acostado boca abajo.', ['Evitá levantar la cadera del apoyo.']],
    ['curl-femoral-pie', 'Curl femoral de pie a una pierna', 'isquios', 'rodilla', [], 'Máquina', 'a', 0, 'Flexión de rodilla unilateral de pie.', []],
    ['curl-nordico', 'Curl nórdico', 'isquios', 'rodilla', [], 'Peso corporal', 'a', 1, 'De rodillas con los tobillos sujetos, bajar el cuerpo controlando con los isquios.', ['Es muy exigente: empezá con poco recorrido y ayuda con las manos.']],
    ['curl-fitball', 'Curl femoral con fitball', 'isquios', 'rodilla', ['gluteos'], 'Otro', 'a', 0, 'Acostado, flexionar las rodillas rodando una pelota con los talones.', []],
    ['glute-ham', 'Glute-ham raise', 'isquios', 'rodilla', ['gluteos'], 'Máquina', 'a', 1, 'Flexión de rodilla y extensión de cadera en banco GHD.', []],
    ['peso-muerto', 'Peso muerto', 'isquios', 'cadera', ['gluteos', 'espalda'], 'Barra', 'c', 0, 'Levantar la barra desde el suelo extendiendo caderas y rodillas.', ['Mantené la barra cerca del cuerpo.', 'Conservá la espalda neutra.', 'Si sos principiante, aprendelo con guía profesional.']],
    ['peso-muerto-rumano', 'Peso muerto rumano', 'isquios', 'cadera', ['gluteos', 'espalda'], 'Barra', 'c', 1, 'Bisagra de cadera con rodillas levemente flexionadas.', ['Llevá la cadera hacia atrás.', 'Bajá hasta donde mantengas la espalda neutra.']],
    ['rumano-manc', 'Peso muerto rumano con mancuernas', 'isquios', 'cadera', ['gluteos'], 'Mancuernas', 'c', 1, 'Rumano con mancuernas.', []],
    ['rumano-unilateral', 'Peso muerto rumano a una pierna', 'isquios', 'cadera', ['gluteos'], 'Mancuernas', 'c', 1, 'Bisagra de cadera sobre una pierna.', ['Sostenete de un soporte si te cuesta el equilibrio.']],
    ['piernas-rigidas', 'Peso muerto con piernas rígidas', 'isquios', 'cadera', ['gluteos', 'espalda'], 'Barra', 'c', 1, 'Variante con las rodillas casi extendidas.', []],
    ['buenos-dias', 'Buenos días', 'isquios', 'cadera', ['gluteos', 'espalda'], 'Barra', 'c', 1, 'Bisagra de cadera con la barra en la espalda.', ['Usá cargas moderadas.']],

    /* ---------- GLÚTEOS ---------- */
    ['hip-thrust', 'Hip thrust', 'gluteos', 'mayor', ['isquios'], 'Barra', 'c', 0, 'Extensión de cadera con la espalda alta apoyada en un banco y la barra sobre la cadera.', ['Usá una almohadilla para la barra.', 'Terminá con la cadera alineada, sin arquear la lumbar.']],
    ['hip-thrust-maq', 'Hip thrust en máquina', 'gluteos', 'mayor', ['isquios'], 'Máquina', 'c', 0, 'Extensión de cadera guiada.', []],
    ['hip-thrust-uni', 'Hip thrust a una pierna', 'gluteos', 'mayor', ['isquios'], 'Peso corporal', 'c', 0, 'Hip thrust apoyando un solo pie.', []],
    ['puente-gluteo', 'Puente de glúteos', 'gluteos', 'mayor', ['isquios'], 'Peso corporal', 'c', 0, 'Elevar la cadera desde el suelo con las rodillas flexionadas.', ['Apretá glúteos arriba y bajá con control.']],
    ['patada-gluteo', 'Patada de glúteo en polea', 'gluteos', 'mayor', [], 'Polea', 'a', 0, 'Extensión de cadera hacia atrás con tobillera.', ['Mantené el torso estable.']],
    ['pull-through', 'Pull-through en polea', 'gluteos', 'mayor', ['isquios'], 'Polea', 'c', 1, 'Bisagra de cadera tirando de una cuerda entre las piernas.', []],
    ['kb-swing', 'Swing con kettlebell', 'gluteos', 'mayor', ['isquios', 'espalda'], 'Kettlebell', 'c', 0, 'Balanceo impulsado por la extensión de cadera.', ['El impulso viene de la cadera, no de los brazos.']],
    ['peso-muerto-sumo', 'Peso muerto sumo', 'gluteos', 'mayor', ['isquios', 'cuadriceps', 'otros'], 'Barra', 'c', 0, 'Peso muerto con postura amplia y agarre por dentro de las piernas.', []],
    ['abduccion-maq', 'Abducción de cadera en máquina', 'gluteos', 'medio', [], 'Máquina', 'a', 0, 'Separar las piernas sentado en máquina.', []],
    ['abduccion-polea', 'Abducción en polea', 'gluteos', 'medio', [], 'Polea', 'a', 0, 'Llevar la pierna hacia afuera de pie con tobillera.', []],
    ['caminata-banda', 'Caminata lateral con banda', 'gluteos', 'medio', [], 'Banda', 'a', 0, 'Pasos laterales con una banda alrededor de las piernas.', []],
    ['elev-lateral-pierna', 'Elevación lateral de pierna acostado', 'gluteos', 'medio', [], 'Peso corporal', 'a', 0, 'Acostado de costado, elevar la pierna de arriba.', []],
    ['almeja', 'Almeja con banda', 'gluteos', 'medio', [], 'Banda', 'a', 0, 'Acostado de costado con rodillas flexionadas, separar las rodillas.', []],

    /* ---------- GEMELOS ---------- */
    ['gemelos-pie', 'Elevación de talones de pie', 'gemelos', 'gastro', [], 'Máquina', 'a', 1, 'Elevar los talones de pie, con la rodilla extendida.', ['Hacé el recorrido completo, con pausa abajo.']],
    ['gemelos-prensa', 'Gemelos en prensa', 'gemelos', 'gastro', [], 'Máquina', 'a', 1, 'Empujar la plataforma de la prensa con la punta de los pies.', ['Mantené las rodillas extendidas sin bloquearlas de golpe.']],
    ['gemelos-smith', 'Gemelos en Smith', 'gemelos', 'gastro', [], 'Máquina', 'a', 1, 'Elevación de talones de pie con barra guiada, sobre un escalón.', []],
    ['gemelos-unilateral', 'Gemelo a una pierna con mancuerna', 'gemelos', 'gastro', [], 'Mancuernas', 'a', 1, 'Elevación de talón unilateral sobre un escalón.', []],
    ['burro', 'Elevación de talones tipo burro', 'gemelos', 'gastro', [], 'Máquina', 'a', 1, 'Elevación de talones con el torso inclinado hacia adelante.', []],
    ['gemelos-sentado', 'Elevación de talones sentado', 'gemelos', 'soleo', [], 'Máquina', 'a', 0, 'Elevar los talones sentado con carga sobre las rodillas.', ['Pausá brevemente arriba y abajo.']],

    /* ---------- ABDOMEN ---------- */
    ['crunch', 'Crunch abdominal', 'abdomen', 'recto', [], 'Peso corporal', 'a', 0, 'Flexión del tronco acostado, despegando los hombros del suelo.', ['Evitá tirar del cuello con las manos.']],
    ['crunch-polea', 'Crunch en polea', 'abdomen', 'recto', [], 'Polea', 'a', 0, 'Flexión del tronco de rodillas tirando de una cuerda.', ['El movimiento sale del tronco, no de los brazos.']],
    ['crunch-maq', 'Crunch en máquina', 'abdomen', 'recto', [], 'Máquina', 'a', 0, 'Flexión de tronco guiada con carga.', []],
    ['crunch-inverso', 'Crunch inverso', 'abdomen', 'recto', [], 'Peso corporal', 'a', 0, 'Acostado, llevar las rodillas al pecho despegando la pelvis.', []],
    ['crunch-declinado', 'Crunch en banco declinado', 'abdomen', 'recto', [], 'Peso corporal', 'a', 1, 'Crunch en banco declinado, con más recorrido.', []],
    ['elev-piernas', 'Elevación de piernas colgado', 'abdomen', 'recto', [], 'Peso corporal', 'a', 0, 'Elevar piernas o rodillas colgado de una barra.', ['Evitá balancearte; empezá con rodillas flexionadas.']],
    ['giro-ruso', 'Giro ruso', 'abdomen', 'oblicuos', [], 'Peso corporal', 'a', 0, 'Sentado con el torso inclinado, rotar de lado a lado.', []],
    ['lenador-polea', 'Leñador en polea', 'abdomen', 'oblicuos', [], 'Polea', 'a', 0, 'Rotación del tronco tirando de la polea en diagonal.', []],
    ['plancha-lateral', 'Plancha lateral', 'abdomen', 'oblicuos', ['gluteos'], 'Peso corporal', 'a', 0, 'Sostener el cuerpo de costado apoyado en un antebrazo.', ['Registrá segundos como repeticiones.']],
    ['flexion-lateral', 'Flexión lateral con mancuerna', 'abdomen', 'oblicuos', [], 'Mancuernas', 'a', 0, 'De pie, inclinar el torso hacia un costado y volver.', []],
    ['crunch-bicicleta', 'Crunch bicicleta', 'abdomen', 'oblicuos', [], 'Peso corporal', 'a', 0, 'Acostado, llevar codo hacia la rodilla contraria alternando.', []],
    ['plancha', 'Plancha', 'abdomen', 'core', [], 'Peso corporal', 'a', 0, 'Sostener el cuerpo alineado apoyado en antebrazos y pies.', ['Registrá segundos como repeticiones.', 'Mantené la cadera alineada.']],
    ['rueda-abdominal', 'Rueda abdominal', 'abdomen', 'core', [], 'Otro', 'a', 1, 'Rodar hacia adelante y volver manteniendo el tronco firme.', ['Avanzá solo hasta donde controles la zona lumbar.']],
    ['pallof', 'Press Pallof', 'abdomen', 'core', ['oblicuos'], 'Polea', 'a', 0, 'De costado a la polea, empujar el agarre al frente resistiendo la rotación.', []],
    ['bicho-muerto', 'Bicho muerto (dead bug)', 'abdomen', 'core', [], 'Peso corporal', 'a', 0, 'Boca arriba, extender brazo y pierna contrarios sin despegar la lumbar.', []],
    ['perro-pajaro', 'Perro-pájaro (bird dog)', 'abdomen', 'core', ['gluteos'], 'Peso corporal', 'a', 0, 'En cuatro apoyos, extender brazo y pierna contrarios.', []],
    ['hollow', 'Hollow hold', 'abdomen', 'core', [], 'Peso corporal', 'a', 0, 'Boca arriba, sostener piernas y hombros despegados con la lumbar apoyada.', []],

    /* ---------- ANTEBRAZOS ---------- */
    ['curl-muneca', 'Curl de muñeca', 'antebrazos', 'flex', [], 'Barra', 'a', 0, 'Flexión de muñeca con los antebrazos apoyados.', []],
    ['caminata-granjero', 'Caminata del granjero', 'antebrazos', 'flex', ['abdomen', 'espalda'], 'Mancuernas', 'c', 0, 'Caminar sosteniendo peso en ambas manos.', ['Registrá metros o segundos como repeticiones.']],
    ['colgado-barra', 'Colgado de barra', 'antebrazos', 'flex', ['espalda'], 'Peso corporal', 'a', 0, 'Sostenerse colgado de una barra el mayor tiempo posible.', ['Registrá segundos como repeticiones.']],
    ['curl-muneca-inverso', 'Curl de muñeca invertido', 'antebrazos', 'ext', [], 'Barra', 'a', 0, 'Extensión de muñeca con agarre prono.', []],

    /* ---------- OTROS ---------- */
    ['aduccion-maq', 'Aducción de cadera en máquina', 'otros', 'aductores', [], 'Máquina', 'a', 0, 'Juntar las piernas sentado en máquina.', []],
    ['plancha-copenhague', 'Plancha Copenhague', 'otros', 'aductores', ['abdomen'], 'Peso corporal', 'a', 0, 'Plancha lateral con la pierna de arriba apoyada en un banco.', ['Empezá con la rodilla apoyada (versión corta).']],
    ['sentadilla-sumo', 'Sentadilla sumo', 'otros', 'aductores', ['gluteos', 'cuadriceps'], 'Mancuernas', 'c', 1, 'Sentadilla con postura amplia y puntas hacia afuera.', []],
    ['thruster', 'Thruster', 'otros', 'full', ['cuadriceps', 'hombros'], 'Barra', 'c', 0, 'Sentadilla frontal que termina en un press por encima de la cabeza.', []],
    ['cargada', 'Cargada de potencia', 'otros', 'full', ['isquios', 'espalda'], 'Barra', 'c', 0, 'Llevar la barra desde el suelo a los hombros de forma explosiva.', ['Técnica compleja: aprendela con un entrenador.']],
    ['burpees', 'Burpees', 'otros', 'full', ['pecho', 'cuadriceps'], 'Peso corporal', 'c', 0, 'Flexión, salto y vuelta a la posición de pie.', []],
    ['empuje-trineo', 'Empuje de trineo', 'otros', 'full', ['cuadriceps', 'gluteos'], 'Otro', 'c', 0, 'Empujar un trineo con carga. Registrá metros.', []],
    ['remo-maquina', 'Remo (máquina de cardio)', 'otros', 'cardio', ['espalda'], 'Máquina', 'c', 0, 'Acondicionamiento en remoergómetro. Registrá minutos.', []],
    ['bici-estatica', 'Bicicleta fija', 'otros', 'cardio', ['cuadriceps'], 'Máquina', 'c', 0, 'Pedaleo continuo o por intervalos. Registrá minutos.', []],
    ['cinta-inclinada', 'Caminata en cinta inclinada', 'otros', 'cardio', ['gemelos'], 'Máquina', 'c', 0, 'Caminata con pendiente. Registrá minutos.', []],
    ['eliptica', 'Elíptica', 'otros', 'cardio', [], 'Máquina', 'c', 0, 'Cardio de bajo impacto. Registrá minutos.', []],
    ['saltar-soga', 'Saltar la soga', 'otros', 'cardio', ['gemelos'], 'Otro', 'c', 0, 'Saltos continuos con soga. Registrá minutos o saltos.', []],
    ['cuerdas-batalla', 'Cuerdas de batalla', 'otros', 'cardio', ['hombros'], 'Otro', 'c', 0, 'Ondas con cuerdas pesadas por intervalos. Registrá segundos.', []],
  ];

  const LIBRARY = RAW.map(([id, name, muscle, region, secondary, equipment, type, stretch, description, tips]) => ({
    id, name, muscle, region, secondary, equipment, type, stretch: !!stretch, description,
    tips: (tips && tips.length ? tips : []).concat(tips && tips.length ? [] : [GENERIC[type]]),
    custom: false,
  }));

  function muscle(id) {
    return MUSCLES.find((m) => m.id === id) || MUSCLES[MUSCLES.length - 1];
  }
  function muscleLabel(id) {
    return muscle(id).label;
  }
  function muscleColor(id) {
    return muscle(id).color;
  }
  function regionLabel(m, r) {
    const reg = muscle(m).regions.find((x) => x[0] === r);
    return reg ? reg[1] : '';
  }
  function typeLabel(t) {
    return t === 'c' ? 'Compuesto' : 'Aislamiento';
  }

  ASC.exerciseData = { MUSCLES, EQUIPMENT, LIBRARY, muscleLabel, muscleColor, regionLabel, typeLabel };
})(typeof window !== 'undefined' ? window : globalThis);
