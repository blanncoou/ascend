/* ASCEND · Biblioteca de mensajes motivacionales
 *
 * Reglas de redacción:
 *  - Breves (≤ 110 caracteres), naturales, en voseo, sin culpas ni agresividad.
 *  - Nunca nombran hábitos, objetivos, pesos, ánimo ni nada que pueda ser privado en la pantalla bloqueada.
 *  - Los contextuales solo afirman lo que los datos confirman en el momento de enviarse.
 * Para ampliar: agregá mensajes con un id nuevo y único (no reutilices ids: se usan para evitar repeticiones).
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});

  const CATEGORIES = [
    ['general', 'Motivación general'],
    ['habitos', 'Disciplina y hábitos'],
    ['entreno', 'Entrenamiento'],
    ['enfoque', 'Productividad y enfoque'],
    ['reflexion', 'Reflexiones personales'],
  ];

  const LIBRARY = {
    general: [
      'No esperes el momento perfecto. Empezá con lo que tenés.',
      'Un pequeño avance sigue siendo un avance.',
      'Hoy tenés una nueva oportunidad para acercarte a tus objetivos.',
      'No hace falta hacerlo todo. Empezá por algo.',
      'No compares tu progreso con el de otros. Concentrate en tu propio camino.',
      'Lo que hacés hoy es lo que vas a ver dentro de unos meses.',
      'No tiene que ser perfecto. Tiene que ser hoy.',
      'Cada paso cuenta, incluso los que nadie ve.',
      'Vas más lejos de lo que creés. Seguí.',
      'Un día bueno no se espera: se arma de a poco.',
      'Tu versión de mañana te va a agradecer lo que hagas ahora.',
      'Empezar es la parte más difícil. Lo demás viene solo.',
      'Hacelo por vos, no por la racha.',
      'Lo simple, hecho todos los días, termina siendo enorme.',
    ],
    habitos: [
      'La disciplina se construye cuando cumplís incluso en los días difíciles.',
      'Hoy alcanza con el mínimo. Mañana vuelve a ser más fácil.',
      'Los hábitos no se sienten grandes, hasta que un día miras atrás.',
      'Dos minutos también cuentan. Empezá por el más fácil.',
      'No se trata de motivación: se trata de volver a hacerlo.',
      'Un hábito es una promesa chica que te cumplís.',
      'Si hoy cuesta, bajá la exigencia, no la constancia.',
      'Lo que repetís, te define.',
      'No rompas la cadena por un día difícil: hacé la versión corta.',
      'La constancia le gana al talento cuando el talento no aparece.',
      'Un buen día empieza con una cosa bien hecha.',
      'No necesitás ganas. Necesitás empezar.',
    ],
    entreno: [
      'El mejor entrenamiento es el que hacés.',
      'Calentá bien, concentrate en la técnica y el resto llega.',
      'Fuerza es volver al gimnasio aunque el día no ayude.',
      'Hoy no hace falta un récord. Hace falta presentarse.',
      'Cada serie bien hecha es progreso real.',
      'Tu cuerpo se adapta a lo que hacés seguido, no a lo que hacés perfecto.',
      'Descansar también es parte del plan.',
      'Moverte un rato hoy vale más que el entrenamiento ideal de la semana que viene.',
      'Respirá, ajustá la postura y una repetición más con buena técnica.',
      'El progreso en el gimnasio es lento y por eso vale tanto.',
    ],
    enfoque: [
      'Elegí una sola cosa importante y dale 25 minutos.',
      'Silenciá lo que distrae. Lo urgente puede esperar un bloque.',
      'Terminar algo chico ordena el resto del día.',
      'Tu atención es tu recurso más valioso. Cuidala.',
      'Empezá por la tarea que más postergás. Después todo pesa menos.',
      'Un bloque de enfoque hoy vale más que diez planes para mañana.',
      'No hace falta tener ganas para empezar: las ganas aparecen trabajando.',
      'Menos pestañas, más avance.',
      'Si te trabás, achicá la tarea hasta que sea obvia.',
      'Planificá tres prioridades. Lo demás es extra.',
    ],
    reflexion: [
      '¿Qué te gustaría poder decir de este día cuando termine?',
      '¿Qué cosa chica podés hacer hoy por tu yo de dentro de un año?',
      'Pensá en algo que hoy te salió bien. Eso también es progreso.',
      'Respirá un momento. ¿Cómo estás de verdad?',
      '¿Qué aprendiste esta semana que no sabías la anterior?',
      'Tomate un minuto para reconocer lo que ya avanzaste.',
      '¿Qué te está frenando hoy? A veces nombrarlo ya ayuda.',
      'Agradecé algo de hoy, por chico que sea.',
      'Estar mejor no es hacer más: es hacer lo que importa.',
      'Si hoy fue difícil, mañana es una página nueva.',
    ],
  };

  /* Contextuales: solo se usan si la personalización está activa y los datos lo confirman en ese momento.
   * No incluyen nombres ni cifras sensibles. {n} = días de constancia (dato no sensible). */
  const CONTEXT = {
    pending: [
      'Todavía tenés hábitos para hoy. Elegí uno y empezá por ahí.',
      'Queda día por delante: un hábito más ya suma.',
      'Hoy todavía está abierto. ¿Cuál hacés ahora?',
      'Un pendiente menos y el día cambia. Empezá por el más fácil.',
    ],
    gym: [
      'Hoy toca entrenar. Preparate y arrancá con un buen calentamiento.',
      'Tu rutina de hoy te espera. Una serie a la vez.',
      'Día de gimnasio: presentarte ya es la mitad del trabajo.',
    ],
    streak: [
      'Llevás {n} días de constancia. Eso se construyó día a día.',
      '{n} días seguidos. Lo estás haciendo muy bien.',
      'Constancia de {n} días: seguí cuidándola sin presión.',
    ],
    recovery: [
      'Retomar es más importante que una racha perfecta. Hoy, solo lo esencial.',
      'Volver de a poco también es avanzar. Elegí un hábito clave.',
      'No hace falta recuperar todo hoy. Un paso alcanza.',
    ],
    goal: [
      'Estás cerca de cumplir un objetivo. Un empujón más.',
      'Te falta poco para un objetivo. Seguí así.',
      'Uno de tus objetivos está casi listo. Vale la pena terminarlo.',
    ],
  };

  // ids estables: categoría + número (no reordenar; agregar al final)
  const ALL = [];
  Object.keys(LIBRARY).forEach((cat) => LIBRARY[cat].forEach((text, i) => ALL.push({ id: cat + '-' + (i + 1), cat, text })));
  Object.keys(CONTEXT).forEach((cat) => CONTEXT[cat].forEach((text, i) => ALL.push({ id: 'ctx-' + cat + '-' + (i + 1), cat: 'ctx-' + cat, text })));

  ASC.motivationData = { CATEGORIES, LIBRARY, CONTEXT, ALL };
})(typeof window !== 'undefined' ? window : globalThis);
