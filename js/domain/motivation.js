/* ASCEND · Notificaciones motivacionales (lógica pura, probada en Node)
 *
 * - planDay(): horarios del día (determinísticos por fecha) dentro de la franja elegida, repartidos para que
 *   no queden juntos, salteando el horario de silencio y los días no elegidos.
 * - pickMessage(): elige el texto. Sin repetir mensajes de los últimos 3 días (nunca el mismo que ayer).
 *   Si la personalización está activa, puede usar un mensaje de contexto, SOLO si los datos lo confirman en
 *   ese momento (ej. "tenés hábitos para hoy" únicamente si de verdad hay pendientes). Nunca nombra hábitos,
 *   objetivos ni datos sensibles: son textos aptos para la pantalla bloqueada.
 * - gate(): decide si se puede enviar ahora (activadas, permiso real, días, silencio, pausa, entrenamiento o
 *   enfoque en curso, tope diario y separación mínima).
 * - tick(): envía como máximo un mensaje pendiente por llamada y lo registra.
 * - scheduleAhead(): lista de próximos envíos para programarlos en el sistema (app nativa). Usa solo
 *   mensajes generales: a futuro no se puede confirmar ningún dato del usuario.
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  const D = () => ASC.dates;
  const M = () => ASC.motivationData;

  const DEFAULTS = {
    enabled: false, // solo se activa si el usuario acepta
    asked: false, // ya vio la pantalla de la bienvenida
    choice: null, // 'accepted' | 'later' | 'os-denied'
    start: '09:00',
    end: '21:00',
    perDay: 2, // 1 a 3 recomendado (máximo 5)
    days: [0, 1, 2, 3, 4, 5, 6],
    categories: ['general', 'habitos', 'entreno', 'enfoque', 'reflexion'],
    personalize: true,
  };
  const MAX_PER_DAY = 5;
  const MIN_GAP_MIN = 60; // nunca dos mensajes con menos de una hora entre sí
  const STALE_MIN = 120; // un horario que pasó hace más de 2 h no se envía tarde
  const NO_REPEAT_DAYS = 3;

  function settings(state) {
    return Object.assign({}, DEFAULTS, (state.settings && state.settings.motivation) || {});
  }

  const toMin = (t) => { const [h, m] = String(t || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  const toTime = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  const rand = (seed) => (hash(String(seed)) % 10000) / 10000;

  function inQuiet(state, min) {
    const q = (state.settings.reminders || {}).quiet || {};
    if (!q.enabled || !q.from || !q.to || q.from === q.to) return false;
    const a = toMin(q.from), b = toMin(q.to);
    return a < b ? min >= a && min < b : min >= a || min < b;
  }

  /** Horarios del día ('HH:MM'). Cada uno cae en el 60 % central de su tramo, así quedan separados. */
  function planDay(state, key) {
    const s = settings(state);
    if (!s.enabled) return [];
    if (!s.days.includes(D().weekday(key))) return [];
    const start = toMin(s.start), end = toMin(s.end);
    if (end - start < 30) return [];
    const n = Math.max(1, Math.min(MAX_PER_DAY, Number(s.perDay) || 1));
    const seg = (end - start) / n;
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = start + seg * i + seg * 0.2, b = start + seg * i + seg * 0.8;
      let m = Math.round(a + (b - a) * rand(key + ':' + i));
      // si cae en el horario de silencio, buscar el minuto permitido más cercano dentro del tramo
      if (inQuiet(state, m)) {
        let found = null;
        for (let d = 1; d <= seg / 2 && found === null; d++) {
          if (m + d <= b && !inQuiet(state, m + d)) found = m + d;
          else if (m - d >= a && !inQuiet(state, m - d)) found = m - d;
        }
        if (found === null) continue;
        m = found;
      }
      if (out.length && m - toMin(out[out.length - 1]) < MIN_GAP_MIN) continue;
      out.push(toTime(m));
    }
    return out;
  }

  function sentOn(state, key) {
    return (state.motivationLog || []).filter((x) => x.date === key);
  }

  /** Contexto confirmable AHORA con los datos (o null). Sin datos suficientes, no se afirma nada. */
  function context(state, key, nowMin) {
    const s = settings(state);
    if (!s.personalize) return null;
    const cats = s.categories;
    const today = sentOn(state, key).map((x) => x.ctx).filter(Boolean);
    const ok = (c) => !today.includes(c);
    const H = ASC.habits;
    if (cats.includes('habitos') && ASC.recovery && ok('recovery')) {
      const act = ASC.recovery.active(state, key);
      const det = act ? null : ASC.recovery.detect(state, key);
      if (act || (det && det.suggest)) return 'recovery';
    }
    if (cats.includes('entreno') && ASC.gym && ok('gym') && nowMin < 20 * 60) {
      const nw = ASC.gym.nextWorkout(state, key);
      if (nw && nw.isToday && !nw.sequence && !ASC.gym.workedOutOn(state, key) && (nw.routine.days || []).length) return 'gym';
    }
    if (cats.includes('habitos') && H && ok('pending') && nowMin >= 12 * 60) {
      const tp = H.todayProgress(state, key);
      if (tp.list.some((h) => !H.isFlexible(h) && !H.isDone(state, h.id, key))) return 'pending';
    }
    if (cats.includes('habitos') && ASC.progress && ok('streak')) {
      const n = ASC.progress.consistencyStreak(state, key);
      if (n >= 7 && n % 7 === 0) return 'streak';
    }
    if (cats.includes('general') && ok('goal')) {
      const near = (state.goals || []).some((g) => g.status !== 'done' && g.status !== 'paused' && (g.steps || []).length >= 3 && g.steps.filter((x) => x.done).length / g.steps.length >= 0.8 && g.steps.some((x) => !x.done));
      if (near) return 'goal';
    }
    return null;
  }

  /** Elige el mensaje evitando repeticiones recientes */
  function pickMessage(state, key, slot, nowMin) {
    const s = settings(state);
    const log = state.motivationLog || [];
    const since = D().addDays(key, -NO_REPEAT_DAYS);
    const recent = new Set(log.filter((x) => x.date >= since).map((x) => x.id));
    const yesterdayToday = new Set(log.filter((x) => x.date >= D().addDays(key, -1)).map((x) => x.id));
    const ctx = context(state, key, nowMin);
    const choose = (pool, salt) => {
      let c = pool.filter((m) => !recent.has(m.id));
      if (!c.length) c = pool.filter((m) => !yesterdayToday.has(m.id));
      if (!c.length) return null;
      return c[hash(key + ':' + slot + ':' + salt) % c.length];
    };
    if (ctx) {
      const m = choose(M().ALL.filter((x) => x.cat === 'ctx-' + ctx), ctx);
      if (m) {
        const n = ctx === 'streak' ? ASC.progress.consistencyStreak(state, key) : 0;
        return { id: m.id, text: m.text.replace('{n}', n), ctx, cat: m.cat };
      }
    }
    const cats = s.categories.length ? s.categories : ['general'];
    const dayIdx = Math.floor(new Date(D().fromKey(key)).getTime() / 864e5);
    for (let k = 0; k < cats.length; k++) {
      const cat = cats[(dayIdx + slot + k) % cats.length];
      const m = choose(M().ALL.filter((x) => x.cat === cat), cat);
      if (m) return { id: m.id, text: m.text, ctx: null, cat };
    }
    return null;
  }

  /** ¿Se puede enviar ahora? Devuelve { ok, reason } */
  function gate(state, now, permission) {
    const s = settings(state);
    const key = D().toKey(now);
    const min = now.getHours() * 60 + now.getMinutes();
    if (!s.enabled) return { ok: false, reason: 'off' };
    if (permission !== 'granted') return { ok: false, reason: 'permission' };
    if (!s.days.includes(now.getDay())) return { ok: false, reason: 'day' };
    if (min < toMin(s.start) || min > toMin(s.end)) return { ok: false, reason: 'window' };
    if (inQuiet(state, min)) return { ok: false, reason: 'quiet' };
    const r = state.settings.reminders || {};
    if (r.pausedUntil && key <= r.pausedUntil) return { ok: false, reason: 'paused' };
    const active = state.activeSessionId && (state.sessions || []).some((x) => x.id === state.activeSessionId && x.status === 'in_progress');
    if (active) return { ok: false, reason: 'workout' };
    if (state.focus) return { ok: false, reason: 'focus' };
    const today = sentOn(state, key);
    if (today.length >= Math.min(MAX_PER_DAY, s.perDay)) return { ok: false, reason: 'limit' };
    const last = today[today.length - 1];
    if (last && now.getTime() - new Date(last.at).getTime() < MIN_GAP_MIN * 60000) return { ok: false, reason: 'gap' };
    return { ok: true };
  }

  /** Envía como máximo un mensaje si hay un horario vencido. send(title, body) debe devolver true/false. */
  function tick(state, now, permission, send) {
    const key = D().toKey(now);
    const min = now.getHours() * 60 + now.getMinutes();
    const slots = planDay(state, key);
    const done = new Set(sentOn(state, key).map((x) => x.slot));
    const missed = new Set(((state.motivationMissed || {})[key]) || []);
    const due = slots.map((t, i) => ({ t, i })).filter((x) => !done.has(x.i) && !missed.has(x.i) && toMin(x.t) <= min);
    if (!due.length) return { sent: false, reason: 'none-due' };
    const g = gate(state, now, permission);
    // horarios viejos (app cerrada o pausada) se descartan en vez de enviarse tarde
    const fresh = due.filter((x) => min - toMin(x.t) <= STALE_MIN);
    const stale = due.filter((x) => min - toMin(x.t) > STALE_MIN);
    if (stale.length) {
      state.motivationMissed = state.motivationMissed || {};
      state.motivationMissed[key] = Array.from(new Set(((state.motivationMissed[key]) || []).concat(stale.map((x) => x.i))));
    }
    if (!fresh.length) return { sent: false, reason: 'stale' };
    if (!g.ok) {
      // los motivos "momentáneos" no consumen el horario (se reintenta); los demás sí
      if (['workout', 'focus', 'gap'].includes(g.reason)) return { sent: false, reason: g.reason };
      return { sent: false, reason: g.reason };
    }
    const slot = fresh[fresh.length - 1];
    const msg = pickMessage(state, key, slot.i, min);
    if (!msg) return { sent: false, reason: 'no-message' };
    const ok = send('ASCEND', msg.text);
    state.motivationLog = (state.motivationLog || []).concat({ date: key, slot: slot.i, id: msg.id, ctx: msg.ctx, at: now.toISOString(), ok: ok !== false }).slice(-90);
    // los demás vencidos de este tick no se acumulan: un solo mensaje por vez
    fresh.slice(0, -1).forEach((x) => { state.motivationMissed = state.motivationMissed || {}; state.motivationMissed[key] = (state.motivationMissed[key] || []).concat(x.i); });
    Object.keys(state.motivationMissed || {}).forEach((k) => { if (k < D().addDays(key, -7)) delete state.motivationMissed[k]; });
    return { sent: true, msg };
  }

  /** Próximos envíos (para programar en el sistema en la app nativa). Solo mensajes generales. */
  function scheduleAhead(state, fromDate, days) {
    const out = [];
    const s = settings(state);
    const cats = s.categories.filter((c) => c !== 'ctx');
    const used = new Set();
    for (let d = 0; d < (days || 7); d++) {
      const key = D().addDays(D().toKey(fromDate), d);
      planDay(state, key).forEach((t, i) => {
        const at = new Date(D().fromKey(key)); at.setHours(Math.floor(toMin(t) / 60), toMin(t) % 60, 0, 0);
        if (at <= fromDate) return;
        const cat = cats[(d + i) % cats.length] || 'general';
        const pool = M().ALL.filter((x) => x.cat === cat && !used.has(x.id));
        const m = pool[hash(key + ':' + i) % Math.max(1, pool.length)] || M().ALL.find((x) => x.cat === cat);
        used.add(m.id);
        out.push({ at, id: m.id, text: m.text, key, slot: i });
      });
    }
    return out;
  }

  function validate(s) {
    const errors = {};
    if (toMin(s.end) - toMin(s.start) < 30) errors.end = 'La franja tiene que durar al menos 30 minutos.';
    if (!(s.perDay >= 1 && s.perDay <= MAX_PER_DAY)) errors.perDay = 'Entre 1 y ' + MAX_PER_DAY + ' mensajes por día.';
    if (!s.days.length) errors.days = 'Elegí al menos un día.';
    if (!s.categories.length) errors.categories = 'Elegí al menos un tipo de mensaje.';
    return errors;
  }

  ASC.motivation = { DEFAULTS, MAX_PER_DAY, MIN_GAP_MIN, STALE_MIN, NO_REPEAT_DAYS, settings, planDay, context, pickMessage, gate, tick, scheduleAhead, validate, toMin, toTime };
})(typeof window !== 'undefined' ? window : globalThis);
