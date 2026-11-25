/* ASCEND · Reglas del juego de hábitos
 * Módulo puro (sin DOM). Todo el XP se DERIVA de lo registrado: nada se "otorga" a mano,
 * así las reglas son transparentes y desmarcar algo descuenta exactamente lo que sumó.
 *
 * Progresión:
 *  - 10 rangos, de "Idea" a "Disciplina pura". Los primeros duran pocos niveles (enganchan rápido);
 *    los últimos duran más (es lo que cuesta de verdad).
 *  - Pasar del nivel n al n+1 cuesta 50 + 25·(n−1) XP: nivel 2 se alcanza el primer día,
 *    "Disciplina pura" (nivel 51) pide unos 33.000 XP ≈ un año de constancia real.
 *
 * Semana (lunes a domingo):
 *  - Desafío semanal: el usuario elige cuánto se compromete (Suave 70 %, Firme 85 %, Total 100 %
 *    de los hábitos programados desde que planifica). Si lo cumple suma XP extra; si no, no pierde nada.
 *  - 3 misiones semanales generadas a partir de SUS hábitos, fijas durante toda la semana.
 *  - Hitos de racha y maestría de cada hábito suman bonus de una sola vez.
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  const D = () => ASC.dates;
  const H = () => ASC.habits;

  /* ---------- Rangos ---------- */
  const RANKS = [
    { name: 'Idea', from: 1, motto: 'Todo empieza con una decisión.' },
    { name: 'Chispa', from: 4, motto: 'Diste el primer paso. Ahora hay algo encendido.' },
    { name: 'Intento', from: 7, motto: 'Volvés aunque cueste. Eso ya te diferencia.' },
    { name: 'Hábito', from: 11, motto: 'Lo que hacés empieza a repetirse solo.' },
    { name: 'Rutina', from: 16, motto: 'Tu día tiene estructura y la sostenés.' },
    { name: 'Constancia', from: 21, motto: 'Ya no dependés de la motivación.' },
    { name: 'Determinación', from: 28, motto: 'Elegís lo difícil a propósito.' },
    { name: 'Hierro', from: 35, motto: 'Lo que antes costaba, ahora es parte tuya.' },
    { name: 'Voluntad', from: 43, motto: 'Tu palabra con vos mismo vale.' },
    { name: 'Disciplina pura', from: 51, motto: 'Ya no lo hacés: lo sos.' },
  ];

  /** XP acumulado necesario para estar en `level` */
  function xpForLevel(level) {
    const n = level - 1;
    const c = (ASC.XP && ASC.XP.level) || { base: 50, step: 25 };
    return c.base * n + (c.step * n * (n - 1)) / 2;
  }

  function rankIndex(level) {
    let i = 0;
    RANKS.forEach((r, k) => { if (level >= r.from) i = k; });
    return i;
  }

  function levelInfo(xp) {
    let level = 1;
    while (xp >= xpForLevel(level + 1)) level++;
    const from = xpForLevel(level), to = xpForLevel(level + 1);
    const ri = rankIndex(level);
    const rank = RANKS[ri], next = RANKS[ri + 1] || null;
    const rankFromXp = xpForLevel(rank.from);
    const rankToXp = next ? xpForLevel(next.from) : null;
    return {
      level, xp, into: xp - from, needed: to - from, pct: (xp - from) / (to - from),
      rankIndex: ri, rank: rank.name, motto: rank.motto, name: rank.name,
      nextRank: next ? next.name : null, nextRankLevel: next ? next.from : null,
      rankPct: next ? (xp - rankFromXp) / (rankToXp - rankFromXp) : 1,
      xpToNextRank: next ? rankToXp - xp : 0,
      levelInRank: level - rank.from + 1, levelsInRank: next ? next.from - rank.from : null,
    };
  }

  /* ---------- Maestría de cada hábito ---------- */
  const TIERS = [
    { name: 'Semilla', at: 0, glyph: '·' },
    { name: 'Brote', at: 7, glyph: '✦' },
    { name: 'Raíz', at: 21, glyph: '✦✦' },
    { name: 'Tronco', at: 50, glyph: '✦✦✦' },
    { name: 'Roble', at: 100, glyph: '★' },
    { name: 'Leyenda', at: 250, glyph: '★★' },
  ];
  const TIER_XP = (ASC.XP && ASC.XP.tierUp) || 25;

  function tierFor(count) {
    let i = 0;
    TIERS.forEach((t, k) => { if (count >= t.at) i = k; });
    const next = TIERS[i + 1] || null;
    return { index: i, name: TIERS[i].name, glyph: TIERS[i].glyph, count, next: next ? next.name : null, nextAt: next ? next.at : null, pct: next ? (count - TIERS[i].at) / (next.at - TIERS[i].at) : 1 };
  }

  /* ---------- Hitos de racha de constancia ---------- */
  const STREAK_MILESTONES = (ASC.XP && ASC.XP.streakMilestones) || [[3, 30], [7, 70], [14, 150], [30, 300], [60, 600], [100, 1000], [180, 1800], [365, 3650]];
  const MXP = (ASC.XP && ASC.XP.missions) || { habit: 60, perfect: 80, active: 50, journal: 50, category: 50, gym: 70 };
  const CXP = (ASC.XP && ASC.XP.commitments) || { suave: 100, firme: 200, total: 350 };

  function streakBonus(best) {
    return STREAK_MILESTONES.filter(([d]) => best >= d).reduce((a, [, x]) => a + x, 0);
  }

  function nextMilestone(current) {
    const m = STREAK_MILESTONES.find(([d]) => current < d);
    return m ? { days: m[0], xp: m[1] } : null;
  }

  /* ---------- Semana ---------- */
  const COMMITMENTS = {
    suave: { label: 'Suave', pct: 0.7, xp: CXP.suave, desc: 'Para semanas cargadas. Mantener el hilo también cuenta.' },
    firme: { label: 'Firme', pct: 0.85, xp: CXP.firme, desc: 'El punto justo entre exigencia y realidad.' },
    total: { label: 'Total', pct: 1, xp: CXP.total, desc: 'Todo lo programado, sin excepciones. Disciplina pura.' },
  };

  function weekEnd(ws) {
    return D().addDays(ws, 6);
  }

  function weekData(state, ws) {
    if (!state.weeks) state.weeks = {};
    return state.weeks[ws] || null;
  }

  /** Check-ins programados desde `from` hasta el domingo */
  function scheduledFrom(state, from, ws) {
    return H().rangeStats(state, from, weekEnd(ws));
  }

  function planWeek(state, ws, level, todayKey) {
    todayKey = todayKey || D().today();
    const c = COMMITMENTS[level];
    const from = todayKey > ws ? todayKey : ws;
    const total = scheduledFrom(state, from, ws).scheduled;
    const target = Math.max(1, Math.ceil(total * c.pct));
    const w = ensureWeek(state, ws, todayKey);
    w.plan = { level, pct: c.pct, xp: c.xp, from, total, target, at: new Date().toISOString() };
    return w.plan;
  }

  function commitmentProgress(state, ws) {
    const w = weekData(state, ws);
    if (!w || !w.plan) return null;
    if (w.final) return { plan: w.plan, done: w.final.done, target: w.plan.target, pct: Math.min(1, w.final.done / w.plan.target), met: w.final.met, final: true };
    const done = scheduledFrom(state, w.plan.from, ws).done;
    return { plan: w.plan, done, target: w.plan.target, pct: Math.min(1, done / w.plan.target), met: done >= w.plan.target };
  }

  /* Aleatorio determinístico por semana: las misiones no cambian al recargar */
  function rng(seedStr) {
    let h = 1779033703 ^ seedStr.length;
    for (let i = 0; i < seedStr.length; i++) { h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    let a = h >>> 0;
    return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  function habitScheduledInWeek(h, from, ws) {
    if (h.freqType === 'weekly') return Math.min(h.timesPerWeek || 1, D().diffDays(from, weekEnd(ws)) + 1);
    if (h.freqType === 'monthly') return Math.min(Math.ceil((h.timesPerMonth || 1) / 4), D().diffDays(from, weekEnd(ws)) + 1);
    return D().range(from, weekEnd(ws)).filter((k) => H().isScheduled(h, k)).length;
  }

  function generateMissions(state, ws, todayKey) {
    todayKey = todayKey || D().today();
    const from = todayKey > ws ? todayKey : ws;
    const daysLeft = D().diffDays(from, weekEnd(ws)) + 1;
    const scale = (n) => Math.max(1, Math.round((n * daysLeft) / 7));
    const habits = state.habits.filter((h) => h.kind !== 'negative' && !h.archivedAt && h.startDate <= weekEnd(ws));
    if (!habits.length) return [];
    const r = rng('ascend-' + ws);
    const out = [];

    // 1) Un hábito protagonista de la semana
    const ranked = habits.map((h) => ({ h, n: habitScheduledInWeek(h, from, ws), r: r() })).filter((x) => x.n >= 1).sort((a, b) => b.n - a.n || b.r - a.r);
    if (ranked.length) {
      const pick = ranked[Math.floor(r() * Math.min(3, ranked.length))];
      const n = Math.min(pick.n, 5);
      out.push({ id: 'm1', type: 'habit', habitId: pick.h.id, n, xp: MXP.habit, title: 'Completá "' + pick.h.name + '" ' + n + (n === 1 ? ' vez' : ' veces') });
    }
    // 2) Días perfectos
    const np = Math.min(daysLeft, habits.length >= 4 ? 2 : 3);
    out.push({ id: 'm2', type: 'perfect', n: np, xp: MXP.perfect, title: 'Lográ ' + np + (np === 1 ? ' día perfecto' : ' días perfectos') });
    // 3) Rotativa
    const pool = ['active', 'journal'];
    const cats = {};
    habits.forEach((h) => (cats[h.category] = (cats[h.category] || 0) + habitScheduledInWeek(h, from, ws)));
    const topCat = Object.keys(cats).sort((a, b) => cats[b] - cats[a])[0];
    if (topCat && cats[topCat] >= 4 && Object.keys(cats).length > 1) pool.push('category');
    if (state.routines.length) pool.push('gym');
    const kind = pool[Math.floor(r() * pool.length)];
    if (kind === 'active') { const n = scale(5); out.push({ id: 'm3', type: 'active', n, xp: MXP.active, title: 'Sumá actividad ' + n + (n === 1 ? ' día' : ' días') }); }
    if (kind === 'journal') { const n = scale(3); out.push({ id: 'm3', type: 'journal', n, xp: MXP.journal, title: 'Escribí en tu diario ' + n + (n === 1 ? ' día' : ' días') }); }
    if (kind === 'category') { const n = Math.min(cats[topCat], 8); out.push({ id: 'm3', type: 'category', category: topCat, n, xp: MXP.category, title: 'Completá ' + n + ' hábitos de ' + H().categoryLabel(topCat) }); }
    if (kind === 'gym') {
      const days = new Set();
      state.routines.forEach((x) => (x.days || []).forEach((d) => days.add(d)));
      const n = scale(Math.max(2, Math.min(4, days.size || 2)));
      out.push({ id: 'm3', type: 'gym', n, xp: MXP.gym, title: 'Entrená ' + n + (n === 1 ? ' vez' : ' veces') });
    }
    return out;
  }

  /** Crea los datos de la semana la primera vez que se ve (misiones fijas para toda la semana) */
  function ensureWeek(state, ws, todayKey) {
    if (!state.weeks) state.weeks = {};
    if (!state.weeks[ws]) state.weeks[ws] = { missions: null, plan: null };
    const w = state.weeks[ws];
    if (!w.missions || (!w.missions.length && state.habits.some((h) => !h.archivedAt))) w.missions = generateMissions(state, ws, todayKey);
    return w;
  }

  function missionProgress(state, ws, m, todayKey) {
    todayKey = todayKey || D().today();
    const w = weekData(state, ws);
    if (w && w.final && w.final.missions) { const d = w.final.missions.includes(m.id); return { value: d ? m.n : Math.min(m.n, (w.final.values || {})[m.id] || 0), n: m.n, done: d, pct: d ? 1 : Math.min(1, ((w.final.values || {})[m.id] || 0) / m.n) }; }
    const we = weekEnd(ws);
    const days = D().range(ws, we < todayKey ? we : todayKey);
    let value = 0;
    if (m.type === 'habit') value = days.filter((k) => H().isDone(state, m.habitId, k)).length;
    else if (m.type === 'perfect') value = days.filter((k) => H().dayStatus(state, k, todayKey).status === 'full').length;
    else if (m.type === 'active') value = days.filter((k) => H().dayStatus(state, k, todayKey).done > 0 || ASC.gym.workedOutOn(state, k)).length;
    else if (m.type === 'journal') value = new Set(state.journal.filter((j) => j.date >= ws && j.date <= we).map((j) => j.date)).size;
    else if (m.type === 'category') value = state.habits.filter((h) => h.category === m.category).reduce((a, h) => a + days.filter((k) => H().isDone(state, h.id, k)).length, 0);
    else if (m.type === 'gym') value = ASC.gym.workoutsInRange(state, ws, we).count;
    return { value: Math.min(value, m.n), n: m.n, done: value >= m.n, pct: Math.min(1, value / m.n) };
  }

  /**
   * Cierre de semanas: cuando una semana terminó y ya pasó la ventana de corrección, su resultado
   * (misiones y desafío) se congela. Así una modificación retroactiva no puede alterar una semana finalizada.
   */
  function finalizeWeeks(state, todayKey) {
    todayKey = todayKey || D().today();
    const win = ASC.rules ? ASC.rules.windowDays(state) : 1;
    let changed = false;
    for (const ws in state.weeks || {}) {
      const w = state.weeks[ws];
      if (w.final || D().addDays(weekEnd(ws), win) >= todayKey) continue;
      const values = {}, done = [];
      (w.missions || []).forEach((m) => { const p = missionProgress(state, ws, m, todayKey); values[m.id] = p.value; if (p.done) done.push(m.id); });
      const cp = commitmentProgress(state, ws);
      w.final = { at: new Date().toISOString(), missions: done, values, done: cp ? cp.done : 0, met: cp ? cp.met : false };
      changed = true;
    }
    return changed;
  }

  /** XP de juego acumulado: misiones, desafíos, hitos de racha y maestría */
  function gameXP(state, todayKey, bestStreak) {
    let missions = 0, missionsXP = 0, challenges = 0, challengesXP = 0;
    for (const ws in state.weeks || {}) {
      const w = state.weeks[ws];
      (w.missions || []).forEach((m) => { if (missionProgress(state, ws, m, todayKey).done) { missions++; missionsXP += m.xp; } });
      const cp = commitmentProgress(state, ws);
      if (cp && cp.met) { challenges++; challengesXP += cp.plan.xp; }
    }
    let tierUps = 0;
    state.habits.forEach((h) => (tierUps += tierFor(H().totalCompletions(state, h.id)).index));
    const milestones = STREAK_MILESTONES.filter(([d]) => bestStreak >= d).length;
    return {
      missions, missionsXP, challenges, challengesXP, tierUps, tierXP: tierUps * TIER_XP,
      milestones, milestonesXP: streakBonus(bestStreak),
    };
  }

  /** Resumen de XP ganado en una semana concreta (hábitos, días perfectos, entrenos, misiones, desafío) */
  function weekXP(state, ws, todayKey) {
    todayKey = todayKey || D().today();
    const we = weekEnd(ws);
    const days = D().range(ws, we < todayKey ? we : todayKey);
    let habits = 0, perfect = 0;
    days.forEach((k) => {
      state.habits.forEach((h) => { if (H().isDone(state, h.id, k)) habits++; });
      if (H().dayStatus(state, k, todayKey).status === 'full') perfect++;
    });
    const workouts = ASC.gym.workoutsInRange(state, ws, we).count;
    const w = weekData(state, ws);
    const missions = ((w && w.missions) || []).filter((m) => missionProgress(state, ws, m, todayKey).done).reduce((a, m) => a + m.xp, 0);
    const cp = commitmentProgress(state, ws);
    const challenge = cp && cp.met ? cp.plan.xp : 0;
    return { total: habits * 10 + perfect * 20 + workouts * 50 + missions + challenge, habits, perfect, workouts, missions, challenge };
  }

  ASC.game = {
    RANKS, TIERS, TIER_XP, STREAK_MILESTONES, COMMITMENTS,
    xpForLevel, levelInfo, rankIndex, tierFor, streakBonus, nextMilestone,
    planWeek, commitmentProgress, ensureWeek, finalizeWeeks, weekData, generateMissions, missionProgress, gameXP, weekXP, weekEnd, scheduledFrom,
  };
})(typeof window !== 'undefined' ? window : globalThis);
