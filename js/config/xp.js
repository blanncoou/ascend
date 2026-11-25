/* ASCEND · Balance del XP (configuración central)
 *
 * Todas las reglas de experiencia están acá para poder ajustarlas después de pruebas reales
 * sin tocar la lógica. La curva y su impacto están documentados en docs/BALANCE.md.
 *
 * Principios:
 *  - Premiar la constancia (días, semanas, rachas) más que el volumen de un día.
 *  - Topes diarios para que crear muchos hábitos triviales no infle el XP.
 *  - Todo el XP se deriva de lo registrado: no hay forma de sumarlo dos veces.
 *  - Tres escalas: diario (hábitos, día perfecto), semanal (misiones, desafío), extraordinario (hitos, rangos).
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  ASC.XP = {
    // Diario
    habit: 10, // por hábito completado
    habitDailyCap: 8, // máximo de hábitos que suman XP por día (80 XP)
    perfectDay: 20, // todos los hábitos programados del día
    perfectMinHabits: 2, // un "día perfecto" necesita al menos 2 hábitos programados
    journalDay: 5, // día con entrada de diario
    workout: 50, // entrenamiento finalizado
    workoutDailyCap: 2, // máximo de entrenamientos que suman XP por día
    pr: 25, // récord personal superado
    prPerSessionCap: 3, // máximo de récords que suman por sesión

    // Objetivos
    goalStep: 15,
    goal: 100,

    // Semanal
    missions: { habit: 60, perfect: 80, active: 50, journal: 50, category: 50, gym: 70 },
    commitments: { suave: 100, firme: 200, total: 350 },

    // Mensual: desafío elegido por el usuario (uno por mes). Se cobra una vez, al cumplirlo.
    monthly: { suave: 300, firme: 600, total: 1000 },
    // Metas del desafío mensual por nivel (proporción de los días del mes o cantidad fija)
    monthlyTargets: {
      active: { label: 'Días con al menos la mitad de tus hábitos', unit: 'días', ratio: { suave: 0.5, firme: 0.7, total: 0.85 } },
      perfect: { label: 'Días completos (100 %)', unit: 'días', ratio: { suave: 0.25, firme: 0.4, total: 0.6 } },
      workouts: { label: 'Entrenamientos', unit: 'entrenamientos', fixed: { suave: 4, firme: 8, total: 12 } },
      mood: { label: 'Días con registro de ánimo o diario', unit: 'días', ratio: { suave: 0.35, firme: 0.6, total: 0.85 } },
    },

    // Modo enfoque: no suma XP propia (evita premiar dejar un temporizador corriendo).
    // Si se vincula a un hábito con cantidad en minutos, suma minutos a ese hábito y la XP llega por el hábito.

    // Extraordinario (una sola vez)
    streakMilestones: [[3, 30], [7, 70], [14, 150], [30, 300], [60, 600], [100, 1000], [180, 1800], [365, 3650]],
    tierUp: 25, // cada vez que un hábito sube de maestría
    negativeMilestones: [[7, 50], [30, 150], [90, 400], [180, 800], [365, 1500]], // días sin la conducta a evitar

    // Curva de niveles: pasar del nivel n al n+1 cuesta base + step·(n−1)
    level: { base: 50, step: 25 },

    // Comodines de racha
    freeze: { earnEvery: 7, maxHeld: 2 },
  };
})(typeof window !== 'undefined' ? window : globalThis);
