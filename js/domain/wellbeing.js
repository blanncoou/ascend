/* ASCEND · Bienestar: ánimo diario y su relación con los hábitos (lógica pura)
 * Las relaciones son ASOCIACIONES observadas en tus registros, nunca causas. Con pocos datos no se concluye nada.
 * Privacidad: todo queda en el dispositivo; el diario puede ocultarse (settings.privateJournal).
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  const D = () => ASC.dates;
  const H = () => ASC.habits;
  const MOODS = [['😞', 'Muy mal'], ['😕', 'Mal'], ['😐', 'Normal'], ['🙂', 'Bien'], ['😄', 'Muy bien']];
  const MIN_PER_GROUP = 5;
  const ENTRY_TYPES = [['nota', 'Nota'], ['reflexion', 'Reflexión'], ['evento', 'Acontecimiento importante']];

  /** Registra el ánimo del día (1..5). null si la fecha está cerrada. */
  function setMood(state, key, mood, todayKey) {
    if (ASC.rules && !ASC.rules.canEdit(state, key, todayKey)) return null;
    state.moodLog = state.moodLog || {};
    if (!mood) { delete state.moodLog[key]; return 0; }
    state.moodLog[key] = { mood: Math.max(1, Math.min(5, Number(mood))), at: new Date().toISOString() };
    return state.moodLog[key].mood;
  }

  /** Ánimo del día: el registro rápido o, si no hay, el promedio de las entradas del diario */
  function moodFor(state, key) {
    const m = state.moodLog && state.moodLog[key];
    if (m && m.mood) return m.mood;
    const js = state.journal.filter((j) => j.date === key && j.mood > 0);
    return js.length ? js.reduce((a, j) => a + j.mood, 0) / js.length : null;
  }

  function moodDays(state, from, to) {
    const out = [];
    for (const k of D().range(from, to)) { const m = moodFor(state, k); if (m) out.push({ key: k, mood: m }); }
    return out;
  }

  /** Ánimo promedio en días con y sin cada hábito (últimos 90 días). Solo hábitos con datos suficientes. */
  function moodVsHabits(state, todayKey) {
    todayKey = todayKey || D().today();
    const days = moodDays(state, D().addDays(todayKey, -90), D().addDays(todayKey, -1));
    const rows = [];
    state.habits.filter((h) => h.kind !== 'negative').forEach((h) => {
      const withH = [], without = [];
      days.forEach((d) => {
        if (!H().isActiveOn(h, d.key)) return;
        const done = H().isDone(state, h.id, d.key);
        if (done) withH.push(d.mood);
        else if (H().isScheduled(h, d.key) && !H().isFlexible(h)) without.push(d.mood);
      });
      if (withH.length < MIN_PER_GROUP || without.length < MIN_PER_GROUP) return;
      const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
      rows.push({ habit: h, withAvg: avg(withH), withoutAvg: avg(without), withN: withH.length, withoutN: without.length, diff: avg(withH) - avg(without) });
    });
    rows.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
    return { moodDays: days.length, rows, need: MIN_PER_GROUP };
  }

  ASC.wellbeing = { MOODS, ENTRY_TYPES, setMood, moodFor, moodDays, moodVsHabits, MIN_PER_GROUP };
})(typeof window !== 'undefined' ? window : globalThis);
