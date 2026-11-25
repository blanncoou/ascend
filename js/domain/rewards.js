/* ASCEND · Desafío mensual y recompensas propias (lógica pura)
 * - Desafío mensual: el usuario elige tipo y nivel; la meta sale de ASC.XP.monthlyTargets.
 *   El avance se calcula siempre desde los registros (no se guarda XP). Al terminar el mes y cerrarse la
 *   ventana de edición, el resultado se congela (`final`) para que corregir días viejos no cambie premios.
 * - Recompensas propias: el usuario define "cuando llegue a X, me regalo Y". Se desbloquean por nivel,
 *   rango o mejor racha, y se marcan como canjeadas. No dan XP (evita inflar el juego).
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  const D = () => ASC.dates;
  const H = () => ASC.habits;

  const monthKey = (key) => key.slice(0, 7);
  const monthFirst = (mk) => mk + '-01';
  function monthLast(mk) {
    const d = D().fromKey(monthFirst(mk));
    return D().toKey(new Date(d.getFullYear(), d.getMonth() + 1, 0, 12));
  }
  const daysIn = (mk) => Number(monthLast(mk).slice(8));

  function targetFor(type, tier, mk) {
    const cfg = ASC.XP.monthlyTargets[type];
    if (!cfg) return 0;
    if (cfg.fixed) return cfg.fixed[tier];
    return Math.max(1, Math.round(cfg.ratio[tier] * daysIn(mk)));
  }

  /** Elegir (o cambiar) el desafío del mes actual. No se puede para meses pasados. */
  function setChallenge(state, mk, type, tier, todayKey) {
    todayKey = todayKey || D().today();
    if (mk !== monthKey(todayKey) || !ASC.XP.monthlyTargets[type] || !ASC.XP.monthly[tier]) return null;
    state.months = state.months || {};
    const m = (state.months[mk] = state.months[mk] || {});
    if (m.final) return null;
    m.challenge = { type, tier, target: targetFor(type, tier, mk), setAt: todayKey };
    return m.challenge;
  }

  function valueFor(state, type, mk, todayKey) {
    const from = monthFirst(mk);
    const to = monthLast(mk) < todayKey ? monthLast(mk) : todayKey;
    if (to < from) return 0;
    if (type === 'workouts') return ASC.gym ? ASC.gym.completedSessions(state).filter((s) => monthKey(ASC.gym.sessionDateKey(s)) === mk && ASC.gym.sessionDateKey(s) <= to).length : 0;
    let n = 0;
    for (const k of D().range(from, to)) {
      if (type === 'mood') { if ((state.moodLog && state.moodLog[k]) || state.journal.some((j) => j.date === k)) n++; continue; }
      const s = H().dayStatus(state, k, todayKey);
      if (!s.scheduled) continue;
      if (type === 'active' && s.weighted >= 0.5) n++;
      if (type === 'perfect' && s.weighted >= 1) n++;
    }
    return n;
  }

  function progress(state, mk, todayKey) {
    todayKey = todayKey || D().today();
    const m = (state.months || {})[mk];
    if (!m || !m.challenge) return null;
    const c = m.challenge;
    const value = m.final ? m.final.value : valueFor(state, c.type, mk, todayKey);
    const cfg = ASC.XP.monthlyTargets[c.type];
    return { type: c.type, tier: c.tier, label: cfg.label, unit: cfg.unit, target: c.target, value, met: value >= c.target, xp: ASC.XP.monthly[c.tier], final: !!m.final, daysLeft: Math.max(0, D().diffDays(todayKey, monthLast(mk))) };
  }

  /** Congela los meses terminados cuya ventana de edición ya cerró */
  function finalizeMonths(state, todayKey) {
    todayKey = todayKey || D().today();
    const w = ASC.rules ? ASC.rules.windowDays(state) : 1;
    let changed = false;
    Object.keys(state.months || {}).forEach((mk) => {
      const m = state.months[mk];
      if (!m.challenge || m.final) return;
      if (D().diffDays(monthLast(mk), todayKey) > w) {
        const v = valueFor(state, m.challenge.type, mk, todayKey);
        m.final = { value: v, met: v >= m.challenge.target, at: todayKey };
        changed = true;
      }
    });
    return changed;
  }

  /** XP de desafíos mensuales cumplidos (cada mes cuenta una sola vez) */
  function monthlyXP(state, todayKey) {
    let xp = 0, n = 0;
    Object.keys(state.months || {}).forEach((mk) => {
      const p = progress(state, mk, todayKey);
      if (p && p.met) { xp += p.xp; n++; }
    });
    return { xp, n };
  }

  /** Propuesta de nivel según los últimos 2 meses (para que el desafío sea alcanzable) */
  function suggestTier(state, type, todayKey) {
    todayKey = todayKey || D().today();
    const prev = D().addDays(monthFirst(monthKey(todayKey)), -1);
    const pmk = monthKey(prev);
    const v = valueFor(state, type, pmk, todayKey);
    const tiers = ['total', 'firme', 'suave'];
    return tiers.find((t) => v >= targetFor(type, t, pmk) * 0.9) || 'suave';
  }

  /* ---------- Recompensas propias ---------- */
  const REWARD_KINDS = [['level', 'Llegar al nivel'], ['rank', 'Llegar al rango'], ['streak', 'Mejor racha de (días)']];
  function rewardUnlocked(state, r, todayKey) {
    const x = ASC.progress.xp(state, todayKey);
    if (r.kind === 'level') return x.level.level >= r.value;
    if (r.kind === 'rank') return x.level.rankIndex >= r.value;
    if (r.kind === 'streak') return x.best >= r.value;
    return false;
  }
  function rewardLabel(r) {
    if (r.kind === 'level') return 'Nivel ' + r.value;
    if (r.kind === 'rank') return 'Rango ' + ((ASC.game.RANKS[r.value] || {}).name || r.value);
    return r.value + ' días de racha';
  }

  ASC.rewards = { monthKey, monthFirst, monthLast, targetFor, setChallenge, progress, finalizeMonths, monthlyXP, suggestTier, REWARD_KINDS, rewardUnlocked, rewardLabel };
})(typeof window !== 'undefined' ? window : globalThis);
