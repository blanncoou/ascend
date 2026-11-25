/* ASCEND · Persistencia
 *
 * Fuente de verdad: un documento JSON con todos los datos del usuario, guardado en IndexedDB.
 *  - La app trabaja con una copia en memoria (lectura instantánea) y cada cambio se persiste
 *    con un guardado automático (debounce corto + escritura inmediata al ocultar la página).
 *  - Integridad: cada guardado lleva versión de esquema y checksum. Si al abrir el documento está
 *    dañado, se recupera la copia local más reciente.
 *  - Migración: la primera vez, si hay datos en localStorage (versión anterior), se copian a
 *    IndexedDB una sola vez (marca en 'meta') y el original se conserva renombrado como respaldo.
 *  - Si IndexedDB no está disponible, se usa localStorage (modo de respaldo).
 *  - Copias locales: una automática cada 7 días (si abrís la app), y manuales / antes de importar.
 *    Esto NO reemplaza un respaldo en la nube: si el navegador borra sus datos, se borran también
 *    las copias locales. Por eso existe "Exportar" (archivo) y la sincronización preparada (sync.js).
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  const LS_KEY = 'ascend:data:v1';
  const LS_MIGRATED = 'ascend:data:v1:migrado-a-indexeddb';
  const SCHEMA = 3;
  const AUTO_BACKUP_DAYS = 7;
  const KEEP_AUTO = 4, KEEP_OTHER = 5;

  function uid() {
    if (root.crypto && root.crypto.randomUUID) return root.crypto.randomUUID();
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function emptyState() {
    return {
      version: SCHEMA,
      createdAt: new Date().toISOString(),
      profile: { name: '', goals: [], areas: [], trainsGym: null, onboarded: false },
      settings: {
        weightUnit: 'kg',
        reduceMotion: false,
        sound: false, // sonidos desactivados por defecto
        editWindowDays: 1, // hoy + N días anteriores se pueden corregir
        effortScale: 'none', // 'none' | 'rir' | 'rpe'
        plates: { unit: 'kg', bar: 20, kg: [25, 20, 15, 10, 5, 2.5, 1.25], lb: [45, 35, 25, 10, 5, 2.5], pairs: {} },
        gym: { setupDone: false, choice: '', equipment: [], avoid: [], avoidExercises: [], scheduleMode: 'week' },
        reminders: {
          habits: { enabled: false, time: '09:00' },
          gym: { enabled: false, time: '18:00' },
          daily: { enabled: false, time: '21:30' },
          pausedUntil: null, // 'YYYY-MM-DD': sin recordatorios hasta esa fecha (inclusive)
          quiet: { enabled: false, from: '22:00', to: '07:00' }, // horario de silencio
        },
        motivation: { enabled: false, asked: false, choice: null, start: '09:00', end: '21:00', perDay: 2, days: [0, 1, 2, 3, 4, 5, 6], categories: ['general', 'habitos', 'entreno', 'enfoque', 'reflexion'], personalize: true },
        privateJournal: false, // ocultar el contenido del diario hasta tocar "Mostrar"
        wellbeing: true, // módulo de ánimo visible
      },
      habits: [],
      habitLogs: {}, // { habitId: { 'YYYY-MM-DD': true } } · en hábitos con cantidad, se deriva de habitQty
      habitQty: {}, // { habitId: { 'YYYY-MM-DD': número } }
      relapses: {}, // hábitos a evitar: { habitId: [{ date, note, at }] }
      corrections: [], // registro de cambios sobre días anteriores
      freezes: { used: [] }, // comodines usados: [{ date, at }]
      goals: [],
      tasks: [],
      journal: [],
      exercises: [],
      routines: [],
      sessions: [],
      activeSessionId: null,
      bodyProfile: { height: '', age: '', goal: '', level: '', days: [] },
      bodyMetrics: [],
      achievementsSeen: {},
      weeks: {},
      progressSeen: null,
      ui: { tutorialWeekSeen: false, lastWeekSummarySeen: null },
      deleted: {}, // lápidas para sincronización: { id: fecha }
      // v3
      habitRoutines: [], // rutinas de hábitos y actividades: [{ id, name, slot, items: [{ id, type: 'habit'|'activity', habitId?, title?, minutes? }], reminderTime, reminderDays, order }]
      routineLogs: {}, // actividades hechas: { routineId: { 'YYYY-MM-DD': [itemId] } }
      moodLog: {}, // ánimo del día: { 'YYYY-MM-DD': { mood: 1..5, at } }
      focusSessions: [], // modo enfoque: [{ id, label, minutes, startedAt, endedAt, habitId?, completed }]
      focus: null, // sesión de enfoque en curso: { id, label, minutes, startedAt, endsAt, habitId?, addToHabit }
      rewards: [], // recompensas propias: [{ id, title, kind: 'level'|'rank'|'achievement', value, claimedAt }]
      months: {}, // desafío mensual: { 'YYYY-MM': { challenge: { type, target, tier }, final } }
      recovery: null, // plan de recuperación: { start, until, keyHabits, pausedOthers, obstacles, note, tempMins, endedAt }
      recoveryDismissed: null, // fecha en que se descartó la sugerencia
      recoveryHistory: [], // planes terminados
      motivationLog: [], // mensajes motivacionales enviados: [{ date, slot, id, ctx, at, ok }] (últimos 90)
      motivationMissed: {}, // horarios que vencieron sin enviarse (app cerrada): { fecha: [slot] }
    };
  }

  /* ---------- Integridad ---------- */
  function checksum(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(16);
  }

  const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);

  /** Completa campos faltantes y repara tipos sin borrar datos. Devuelve { data, repaired: [] } */
  function migrate(input) {
    const data = isObj(input) ? input : {};
    const base = emptyState();
    const repaired = [];
    const out = Object.assign({}, base, data);
    out.profile = Object.assign({}, base.profile, data.profile);
    out.settings = Object.assign({}, base.settings, data.settings);
    out.settings.reminders = Object.assign({}, base.settings.reminders, (data.settings || {}).reminders);
    out.settings.plates = Object.assign({}, base.settings.plates, (data.settings || {}).plates);
    out.settings.gym = Object.assign({}, base.settings.gym, (data.settings || {}).gym);
    out.settings.reminders.quiet = Object.assign({}, base.settings.reminders.quiet, out.settings.reminders.quiet);
    out.settings.motivation = Object.assign({}, base.settings.motivation, (data.settings || {}).motivation);
    out.bodyProfile = Object.assign({}, base.bodyProfile, data.bodyProfile);
    out.ui = Object.assign({}, base.ui, data.ui);
    out.freezes = Object.assign({ used: [] }, data.freezes);
    ['habits', 'goals', 'tasks', 'journal', 'exercises', 'routines', 'sessions', 'bodyMetrics', 'corrections', 'habitRoutines', 'focusSessions', 'rewards', 'recoveryHistory', 'motivationLog'].forEach((k) => {
      if (!Array.isArray(out[k])) { if (out[k] !== undefined) repaired.push(k); out[k] = []; }
    });
    ['habitLogs', 'habitQty', 'relapses', 'weeks', 'achievementsSeen', 'deleted', 'routineLogs', 'moodLog', 'months', 'motivationMissed'].forEach((k) => {
      if (!isObj(out[k])) { if (out[k] !== undefined) repaired.push(k); out[k] = {}; }
    });
    // v1 → v2: tipo de hábito explícito
    out.habits.forEach((h) => { if (!h.kind) h.kind = 'check'; if (!Array.isArray(h.reminderDays)) h.reminderDays = []; });
    // v2 → v3: pausas (los hábitos existentes no tienen ninguna)
    out.habits.forEach((h) => { if (!Array.isArray(h.pauses)) h.pauses = []; });

    out.routines.forEach((r) => { if (!Array.isArray(r.items)) { r.items = []; repaired.push('routine.items'); } });
    if (!out.createdAt) out.createdAt = new Date().toISOString();
    out.version = SCHEMA;
    return { data: out, repaired };
  }

  /* ---------- Estado en memoria ---------- */
  let state = null;
  let rev = 0;
  let mode = 'memory'; // 'indexeddb' | 'localstorage' | 'memory'
  let lastError = null;
  let writeTimer = null;
  let writing = Promise.resolve();
  let meta = {};
  const listeners = [];

  function get() {
    if (!state) state = emptyState();
    return state;
  }

  function revision() {
    return rev;
  }

  /** Carga síncrona (solo localStorage). Se usa en pruebas y como último recurso. */
  function load() {
    try {
      const raw = root.localStorage && root.localStorage.getItem(LS_KEY);
      state = raw ? migrate(JSON.parse(raw)).data : emptyState();
      mode = root.localStorage ? 'localstorage' : 'memory';
    } catch (e) {
      state = emptyState();
      mode = 'memory';
    }
    rev++;
    return state;
  }

  function envelope(data) {
    const json = JSON.stringify(data);
    return { schema: SCHEMA, savedAt: new Date().toISOString(), checksum: checksum(json), json };
  }

  function readEnvelope(env) {
    if (!env || typeof env.json !== 'string') return { ok: false, reason: 'vacío' };
    if (checksum(env.json) !== env.checksum) return { ok: false, reason: 'checksum' };
    try { return { ok: true, data: JSON.parse(env.json) }; } catch (e) { return { ok: false, reason: 'json' }; }
  }

  /** Inicialización asíncrona: IndexedDB → migración desde localStorage → copia automática */
  async function init() {
    const report = { mode: null, migrated: false, recovered: false, repaired: [] };
    if (!ASC.db || !ASC.db.available()) {
      load();
      report.mode = mode;
      return report;
    }
    try {
      await ASC.db.open();
      mode = 'indexeddb';
      meta = (await ASC.db.get('meta')) || {};
      const env = await ASC.db.get('state');
      let data = null;
      if (env) {
        const r = readEnvelope(env);
        if (r.ok) data = r.data;
        else {
          // Documento dañado: recuperar la copia más reciente que sea válida
          const backups = await ASC.db.listBackups();
          for (const b of backups) {
            const rb = readEnvelope(b);
            if (rb.ok) { data = rb.data; report.recovered = b.createdAt; break; }
          }
        }
      } else if (!meta.migratedFromLocalStorage) {
        // Primera vez con IndexedDB: migrar desde localStorage (una sola vez)
        let raw = null;
        try { raw = root.localStorage.getItem(LS_KEY); } catch (e) {}
        if (raw) {
          try {
            data = JSON.parse(raw);
            report.migrated = true;
          } catch (e) { data = null; }
        }
      }
      const m = migrate(data || emptyState());
      state = m.data;
      report.repaired = m.repaired;
      rev++;
      if (report.migrated) {
        await ASC.db.putBackup(Object.assign({ id: 'pre-migracion-' + Date.now(), createdAt: new Date().toISOString(), reason: 'Antes de migrar a IndexedDB', size: JSON.stringify(data).length }, envelope(data)));
      }
      await writeNow();
      if (report.migrated) {
        meta.migratedFromLocalStorage = new Date().toISOString();
        await ASC.db.put('meta', meta);
        // Se conserva el original renombrado, por seguridad; deja de usarse.
        try { root.localStorage.setItem(LS_MIGRATED, root.localStorage.getItem(LS_KEY)); root.localStorage.removeItem(LS_KEY); } catch (e) {}
      } else if (!meta.migratedFromLocalStorage) {
        meta.migratedFromLocalStorage = 'sin-datos-previos';
        await ASC.db.put('meta', meta);
      }
      report.mode = mode;
      if (state.profile.onboarded) await autoBackup();
    } catch (e) {
      lastError = e;
      load();
      report.mode = mode;
      report.error = e.message;
    }
    return report;
  }

  /** Guardado automático (se llama después de cada cambio) */
  function save() {
    rev++;
    listeners.forEach((fn) => { try { fn(rev); } catch (e) {} });
    if (mode === 'indexeddb') {
      clearTimeout(writeTimer);
      writeTimer = setTimeout(() => { writeNow(); }, 120);
    } else writeLocal();
  }

  function writeLocal() {
    try {
      root.localStorage.setItem(LS_KEY, JSON.stringify(state));
      lastError = null;
    } catch (e) {
      lastError = e;
      notifyError('No se pudo guardar: el almacenamiento del navegador está lleno o bloqueado.');
    }
  }

  function writeNow() {
    clearTimeout(writeTimer);
    if (mode !== 'indexeddb') { writeLocal(); return Promise.resolve(); }
    const env = envelope(state);
    writing = writing.then(() => ASC.db.put('state', env)).then(() => { lastError = null; }).catch((e) => {
      lastError = e;
      notifyError('No se pudo guardar en este dispositivo (' + (e && e.name === 'QuotaExceededError' ? 'espacio lleno' : 'error de almacenamiento') + '). Exportá tus datos por seguridad.');
      try { root.localStorage.setItem(LS_KEY + ':emergencia', env.json); } catch (x) {}
    });
    return writing;
  }

  function flush() {
    return writeNow();
  }

  let lastErrorToast = 0;
  function notifyError(msg) {
    if (Date.now() - lastErrorToast < 8000) return;
    lastErrorToast = Date.now();
    if (ASC.ui && ASC.ui.toast) ASC.ui.toast(msg, 'error');
  }

  /* ---------- Copias locales ---------- */
  async function createBackup(reason) {
    if (mode !== 'indexeddb') return null;
    await writing;
    const env = envelope(state);
    const b = Object.assign({ id: (reason === 'auto' ? 'auto-' : 'manual-') + Date.now(), createdAt: new Date().toISOString(), reason: reason === 'auto' ? 'Copia semanal automática' : reason, size: env.json.length }, env);
    await ASC.db.putBackup(b);
    await pruneBackups();
    if (reason === 'auto') { meta.lastAutoBackup = b.createdAt; await ASC.db.put('meta', meta); }
    return b;
  }

  async function pruneBackups() {
    const all = await ASC.db.listBackups();
    const auto = all.filter((b) => b.id.startsWith('auto-'));
    const other = all.filter((b) => !b.id.startsWith('auto-'));
    for (const b of auto.slice(KEEP_AUTO)) await ASC.db.delBackup(b.id);
    for (const b of other.slice(KEEP_OTHER)) await ASC.db.delBackup(b.id);
  }

  /** Copia automática: solo cuando la app se abre y pasaron 7 días desde la última */
  async function autoBackup() {
    if (mode !== 'indexeddb') return null;
    const last = meta.lastAutoBackup ? new Date(meta.lastAutoBackup) : null;
    if (last && Date.now() - last < AUTO_BACKUP_DAYS * 864e5) return null;
    return createBackup('auto');
  }

  async function listBackups() {
    if (mode !== 'indexeddb') return [];
    return (await ASC.db.listBackups()).map((b) => ({ id: b.id, createdAt: b.createdAt, reason: b.reason, size: b.size, valid: readEnvelope(b).ok }));
  }

  async function restoreBackup(id) {
    const b = await ASC.db.getBackup(id);
    const r = readEnvelope(b);
    if (!r.ok) throw new Error('La copia está dañada y no se puede restaurar.');
    await createBackup('Antes de restaurar una copia');
    state = migrate(r.data).data;
    rev++;
    await writeNow();
    return true;
  }

  /* ---------- Almacenamiento persistente ---------- */
  async function requestPersist() {
    const s = root.navigator && root.navigator.storage;
    if (!s || !s.persist) return { supported: false, persisted: false };
    let persisted = s.persisted ? await s.persisted() : false;
    if (!persisted) { try { persisted = await s.persist(); } catch (e) { persisted = false; } }
    return { supported: true, persisted };
  }

  async function storageInfo() {
    const s = root.navigator && root.navigator.storage;
    const info = { mode, persisted: null, usage: null, quota: null, lastAutoBackup: meta.lastAutoBackup || null, migrated: meta.migratedFromLocalStorage || null, error: lastError ? lastError.message : null };
    if (s && s.persisted) { try { info.persisted = await s.persisted(); } catch (e) {} }
    if (s && s.estimate) { try { const e = await s.estimate(); info.usage = e.usage; info.quota = e.quota; } catch (e) {} }
    return info;
  }

  /* ---------- Reemplazos completos ---------- */
  async function replaceAll(data) {
    await createBackup('Antes de importar datos');
    state = migrate(data).data;
    rev++;
    await writeNow();
  }

  /** Borrar todo: elimina datos Y copias locales (el usuario pidió borrar, no se guarda nada) */
  async function reset() {
    if (mode === 'indexeddb') {
      for (const b of await ASC.db.listBackups()) await ASC.db.delBackup(b.id);
      meta.lastAutoBackup = null;
      await ASC.db.put('meta', meta);
    }
    try { root.localStorage.removeItem(LS_MIGRATED); root.localStorage.removeItem(LS_KEY + ':emergencia'); } catch (e) {}
    state = emptyState();
    rev++;
    try { root.localStorage.removeItem(LS_KEY); } catch (e) {}
    await writeNow();
  }

  function onChange(fn) {
    listeners.push(fn);
  }

  ASC.store = {
    get, load, init, save, flush, uid, reset, replaceAll, emptyState, migrate, checksum, revision, onChange,
    createBackup, listBackups, restoreBackup, autoBackup, requestPersist, storageInfo,
    isOk: () => !lastError, mode: () => mode, KEY: LS_KEY, SCHEMA,
  };
})(typeof window !== 'undefined' ? window : globalThis);
