/* ASCEND · Constancia general, comodines, XP y logros
 * El XP NO se guarda: se calcula a partir de lo registrado (transparente; desmarcar descuenta lo sumado).
 * Los cálculos pesados se memorizan por revisión del store (ASC.perf.memo) y usan agregados por día.
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  const D = () => ASC.dates;
  const H = () => ASC.habits;
  const G = () => ASC.gym;
  const X = () => ASC.XP;
  const memo = (state, key, fn) => (ASC.perf ? ASC.perf.memo(state, key, fn) : fn());

  function startKey(state) {
    let k = D().toKey(new Date(state.createdAt));
    for (const h of state.habits) if (h.startDate < k) k = h.startDate;
    return k;
  }

  function workoutsByDay(state) {
    return memo(state, 'workoutsByDay', () => {
      const m = new Map();
      G().completedSessions(state).forEach((s) => { const k = G().sessionDateKey(s); m.set(k, (m.get(k) || 0) + 1); });
      return m;
    });
  }

  /** Clasificación cruda del día (sin comodines): 'count' | 'neutral' | 'break' */
  function rawKind(state, key, todayKey, wmap) {
    const st = H().dayStatus(state, key, todayKey);
    if (st.done > 0 || wmap.get(key)) return 'count';
    if (key === todayKey) return 'neutral';
    if (st.status === 'rest') return 'neutral'; // sin nada programado: descansar no rompe la racha
    return 'break';
  }

  /**
   * Una sola pasada cronológica: racha actual y mejor, días activos, días perfectos,
   * XP diario con topes, y comodines (ganados, usados válidos, disponibles).
   */
  function consistency(state, todayKey) {
    todayKey = todayKey || D().today();
    return memo(state, 'consistency:' + todayKey, () => {
      const cfg = X();
      const wmap = workoutsByDay(state);
      const used = new Map(((state.freezes && state.freezes.used) || []).map((f) => [f.date, f]));
      let cur = 0, best = 0, active = 0, perfect = 0, habitXPCount = 0, workoutXPCount = 0;
      let balance = 0, earned = 0;
      const validFreezes = [];
      for (const k of D().range(startKey(state), todayKey)) {
        const st = H().dayStatus(state, k, todayKey);
        habitXPCount += Math.min(cfg.habitDailyCap, st.done);
        workoutXPCount += Math.min(cfg.workoutDailyCap, wmap.get(k) || 0);
        if (st.status === 'full' && st.scheduled >= cfg.perfectMinHabits) perfect++;
        let kind = rawKind(state, k, todayKey, wmap);
        if (kind === 'break' && used.has(k) && balance > 0) { kind = 'neutral'; balance--; validFreezes.push(k); }
        if (kind === 'count') {
          cur++; active++;
          if (cur > best) best = cur;
          if (cur % cfg.freeze.earnEvery === 0) { earned++; balance = Math.min(cfg.freeze.maxHeld, balance + 1); }
        } else if (kind === 'break') cur = 0;
      }
      return { current: cur, best, active, perfect, habitXPCount, workoutXPCount, freezes: { available: balance, earned, used: validFreezes } };
    });
  }

  function consistencyStreak(state, todayKey) { return consistency(state, todayKey).current; }
  function bestConsistency(state, todayKey) { return consistency(state, todayKey).best; }
  function activeDays(state, todayKey) { return consistency(state, todayKey).active; }
  function perfectDays(state, todayKey) { return consistency(state, todayKey).perfect; }

  /** ¿Se puede usar un comodín en esta fecha? Solo en un día que cortaría la racha y dentro de la ventana de corrección */
  function canUseFreeze(state, key, todayKey) {
    todayKey = todayKey || D().today();
    if (key >= todayKey || !ASC.rules.canEdit(state, key, todayKey)) return false;
    if (((state.freezes && state.freezes.used) || []).some((f) => f.date === key)) return false;
    const before = consistency(state, D().addDays(key, -1));
    return before.freezes.available > 0 && rawKind(state, key, todayKey, workoutsByDay(state)) === 'break';
  }

  function useFreeze(state, key, todayKey) {
    if (!canUseFreeze(state, key, todayKey)) return false;
    if (!state.freezes) state.freezes = { used: [] };
    state.freezes.used.push({ date: key, at: new Date().toISOString() });
    ASC.rules.logCorrection(state, { type: 'freeze', date: key }, todayKey);
    return true;
  }

  function counts(state, todayKey) {
    const cfg = X();
    const c = consistency(state, todayKey);
    const goalsDone = state.goals.filter((g) => g.status === 'done').length;
    const steps = state.goals.reduce((a, g) => a + (g.steps || []).filter((s) => s.done).length, 0);
    const journalDays = new Set(state.journal.map((j) => j.date)).size;
    const prs = memo(state, 'prsCapped', () => G().completedSessions(state).reduce((a, s) => a + Math.min(cfg.prPerSessionCap, G().sessionPRs(state, s).length), 0));
    return {
      habit: c.habitXPCount,
      habitTotal: H().allCompletions(state),
      perfect: c.perfect,
      workout: c.workoutXPCount,
      workoutTotal: G().completedSessions(state).length,
      pr: prs,
      step: steps,
      goal: goalsDone,
      journal: journalDays,
    };
  }

  function negativeXP(state, todayKey) {
    const ms = X().negativeMilestones;
    let n = 0, xp = 0;
    state.habits.filter((h) => h.kind === 'negative').forEach((h) => {
      const best = H().cleanStreak(state, h, todayKey).best;
      ms.forEach(([d, x]) => { if (best >= d) { n++; xp += x; } });
    });
    return { n, xp };
  }

  function levelInfo(xp) {
    return ASC.game.levelInfo(xp);
  }

  function xp(state, todayKey) {
    todayKey = todayKey || D().today();
    return memo(state, 'xp:' + todayKey, () => {
      const cfg = X();
      const c = counts(state, todayKey);
      const best = bestConsistency(state, todayKey);
      const g = ASC.game.gameXP(state, todayKey, best);
      const neg = negativeXP(state, todayKey);
      const row = (key, label, count, points, scale, fixed) => ({ key, label, count, points, total: points === null ? fixed : count * points, scale });
      const breakdown = [
        row('habit', 'Hábito completado', c.habit, cfg.habit, 'diario'),
        row('perfect', 'Día perfecto', c.perfect, cfg.perfectDay, 'diario'),
        row('journal', 'Día con entrada de diario', c.journal, cfg.journalDay, 'diario'),
        row('workout', 'Entrenamiento finalizado', c.workout, cfg.workout, 'diario'),
        row('pr', 'Récord personal', c.pr, cfg.pr, 'diario'),
        row('step', 'Paso de objetivo', c.step, cfg.goalStep, 'objetivos'),
        row('goal', 'Objetivo cumplido', c.goal, cfg.goal, 'objetivos'),
        row('missions', 'Misiones semanales', g.missions, null, 'semanal', g.missionsXP),
        row('challenges', 'Desafíos semanales cumplidos', g.challenges, null, 'semanal', g.challengesXP),
        row('milestones', 'Hitos de racha', g.milestones, null, 'extraordinario', g.milestonesXP),
        row('tiers', 'Hábitos que subieron de maestría', g.tierUps, cfg.tierUp, 'extraordinario'),
        row('negative', 'Hitos sin la conducta a evitar', neg.n, null, 'extraordinario', neg.xp),
      ];
      const mon = ASC.rewards ? ASC.rewards.monthlyXP(state, todayKey) : { n: 0, xp: 0 };
      breakdown.splice(10, 0, row('monthly', 'Desafíos mensuales cumplidos', mon.n, null, 'mensual', mon.xp));
      c.monthly = mon.n;
      const total = breakdown.reduce((a, b) => a + b.total, 0);
      c.challenges = g.challenges;
      c.missions = g.missions;
      return { total, breakdown, counts: c, best, level: levelInfo(total) };
    });
  }

  const ACHIEVEMENTS = [
    { key: 'first_habit', title: 'Primer paso', desc: 'Completá tu primer hábito.', test: (c) => c.habitTotal >= 1 },
    { key: 'perfect_day', title: 'Día perfecto', desc: 'Completá todos los hábitos programados de un día (mínimo 2).', test: (c) => c.perfect >= 1 },
    { key: 'week', title: 'Primera semana', desc: 'Llegá a 7 días de constancia seguidos.', test: (c, x) => x.best >= 7 },
    { key: 'first_workout', title: 'Primera rutina', desc: 'Finalizá tu primer entrenamiento.', test: (c) => c.workoutTotal >= 1 },
    { key: 'ten_workouts', title: 'Diez entrenamientos', desc: 'Registrá 10 entrenamientos.', test: (c) => c.workoutTotal >= 10 },
    { key: 'first_pr', title: 'Nueva marca', desc: 'Superá un récord personal.', test: (c) => c.pr >= 1 },
    { key: 'month', title: 'Primer mes', desc: 'Sumá 30 días con actividad.', test: (c, x) => x.active >= 30 },
    { key: 'first_goal', title: 'Objetivo cumplido', desc: 'Completá tu primer objetivo.', test: (c) => c.goal >= 1 },
    { key: 'journal', title: 'Mirada hacia adentro', desc: 'Escribí tu primera entrada en el diario.', test: (c) => c.journal >= 1 },
    { key: 'level5', title: 'Nivel 5', desc: 'Alcanzá el nivel 5.', test: (c, x) => x.level >= 5 },
    { key: 'challenge', title: 'Palabra cumplida', desc: 'Cumplí un desafío semanal.', test: (c) => c.challenges >= 1 },
    { key: 'missions10', title: 'Cazador de misiones', desc: 'Completá 10 misiones semanales.', test: (c) => c.missions >= 10 },
    { key: 'rank_habit', title: 'Rango Hábito', desc: 'Llegá al rango Hábito (nivel 11).', test: (c, x) => x.level >= 11 },
    { key: 'rank_iron', title: 'Rango Hierro', desc: 'Llegá al rango Hierro (nivel 35).', test: (c, x) => x.level >= 35 },
    { key: 'month_challenge', title: 'Mes de palabra', desc: 'Cumplí un desafío mensual.', test: (c) => c.monthly >= 1 },
  ];

  function achievements(state, todayKey) {
    todayKey = todayKey || D().today();
    return memo(state, 'ach:' + todayKey, () => {
      const x = xp(state, todayKey);
      const extra = { best: x.best, active: activeDays(state, todayKey), level: x.level.level };
      return ACHIEVEMENTS.map((a) => ({ key: a.key, title: a.title, desc: a.desc, unlocked: !!a.test(x.counts, extra) }));
    });
  }

  ASC.progress = {
    consistency, consistencyStreak, bestConsistency, activeDays, perfectDays, xp, levelInfo, achievements, startKey,
    canUseFreeze, useFreeze, rawKind: (s, k, t) => rawKind(s, k, t || D().today(), workoutsByDay(s)),
  };
})(typeof window !== 'undefined' ? window : globalThis);
