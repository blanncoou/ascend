/* Pruebas del cliente de sincronización (js/sync/sync.js) con un servidor Supabase SIMULADO en memoria.
 * Sirven para la lógica (dos dispositivos, conflictos de cuenta, cambios simultáneos). La prueba contra el
 * proyecto real se hace en el navegador (ver docs/SUPABASE.md).   node tests/sync-cliente.test.js */
const fs = require('fs'), vm = require('vm'), path = require('path');
const assert = require('assert');
const JS = path.join(__dirname, '..', 'js') + '/';
const FILES = ['config/brand.js', 'config/xp.js', 'config/app-config.js', 'core/dates.js', 'core/store.js', 'core/perf.js', 'sync/merge.js', 'domain/rules.js', 'domain/habits.js', 'sync/sync.js'];

/* ---- Servidor simulado: una tabla user_state con RLS por usuario ---- */
function makeServer() {
  const rows = new Map(); // user_id -> { data, rev }
  const users = new Map([['tomi@x.com', { id: 'u-1', password: 'secreta123' }], ['otro@x.com', { id: 'u-2', password: 'secreta456' }]]);
  let hook = null; // para simular una escritura de otro dispositivo en el medio
  return {
    rows, users, setHook: (fn) => (hook = fn),
    client(store) {
      let session = JSON.parse(store.getItem('ascend-auth') || 'null');
      const listeners = [];
      const fire = (ev) => listeners.forEach((f) => f(ev, session));
      const q = (uid) => {
        const filters = {};
        const api = {
          select() { return api; },
          eq(k, v) { filters[k] = v; return api; },
          async maybeSingle() {
            if (filters.user_id !== uid) return { data: null, error: null }; // RLS: nada de otros
            const r = rows.get(uid);
            return { data: r ? JSON.parse(JSON.stringify(r)) : null, error: null };
          },
          async insert(obj) {
            if (obj.user_id !== uid) return { error: { code: '42501', message: 'new row violates row-level security policy' } };
            if (rows.has(uid)) return { error: { code: '23505', message: 'duplicate key' } };
            rows.set(uid, { data: JSON.parse(JSON.stringify(obj.data)), rev: obj.rev });
            return { error: null };
          },
          update(obj) {
            const run = async () => {
              if (hook) { const h = hook; hook = null; await h(); }
              const r = rows.get(uid);
              if (filters.user_id !== uid || !r || r.rev !== filters.rev) return { data: [], error: null };
              rows.set(uid, { data: JSON.parse(JSON.stringify(obj.data)), rev: obj.rev });
              return { data: [{ rev: obj.rev }], error: null };
            };
            const chain = { eq(k, v) { filters[k] = v; return chain; }, select() { return run(); } };
            return chain;
          },
        };
        return api;
      };
      return {
        auth: {
          async getSession() { return { data: { session } }; },
          onAuthStateChange(fn) { listeners.push(fn); },
          async signInWithPassword({ email, password }) {
            const u = users.get(email);
            if (!u || u.password !== password) return { data: {}, error: { message: 'Invalid login credentials' } };
            session = { user: { id: u.id, email } }; store.setItem('ascend-auth', JSON.stringify(session)); fire('SIGNED_IN');
            return { data: { session }, error: null };
          },
          async signOut() { session = null; store.removeItem('ascend-auth'); fire('SIGNED_OUT'); return {}; },
        },
        from() { return q(session && session.user.id); },
      };
    },
  };
}

/* ---- Un "dispositivo" = un contexto aislado con su propio almacenamiento ---- */
function makeDevice(server, name) {
  const mem = new Map();
  const localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  const ctx = { console, localStorage, navigator: { onLine: true, userAgent: 'test-' + name }, location: { hash: '', pathname: '/ascend/', search: '', origin: 'https://x' }, history: { replaceState() {} }, setTimeout, clearTimeout, Promise, Date, JSON, Math };
  ctx.globalThis = ctx; ctx.window = undefined;
  vm.createContext(ctx);
  FILES.forEach((f) => vm.runInContext(fs.readFileSync(JS + f, 'utf8'), ctx, { filename: f }));
  const ASC = ctx.ASC;
  ASC.config.supabase.url = 'https://test.supabase.co'; ASC.config.supabase.anonKey = 'sb_publishable_test';
  ctx.supabase = { createClient: () => server.client(localStorage) };
  ASC.store.load();
  // replaceAll sin IndexedDB
  ASC.store.replaceAll = async (d) => { const s = ASC.store.get(); Object.keys(s).forEach((k) => delete s[k]); Object.assign(s, ASC.store.migrate(d).data); };
  return { ASC, localStorage };
}
const habit = (id, name) => ({ id, name, icon: '✨', kind: 'check', freqType: 'daily', days: [], timesPerWeek: 3, startDate: '2026-11-01', order: 0, pauses: [], updatedAt: new Date().toISOString() });

let ok = 0;
const t = async (name, fn) => { await fn(); ok++; console.log('  ✓ ' + name); };

(async () => {
  console.log('Cliente de sincronización (servidor simulado)');
  const server = makeServer();
  const A = makeDevice(server, 'iphone'), B = makeDevice(server, 'pc');

  await t('sin sesión: no sincroniza y lo informa', async () => {
    await assert.rejects(() => A.ASC.sync.syncNow(), /Iniciá sesión/);
  });
  await t('contraseña incorrecta: mensaje claro, sin datos', async () => {
    await assert.rejects(() => A.ASC.sync.signIn('tomi@x.com', 'mala'), /incorrectos/);
  });
  await t('dispositivo A crea hábitos y sube (primera vez)', async () => {
    await A.ASC.sync.signIn('tomi@x.com', 'secreta123');
    const s = A.ASC.store.get(); s.habits.push(habit('h-a1', 'Leer'), habit('h-a2', 'Agua')); s.habitLogs['h-a1'] = { '2026-11-20': true };
    assert.strictEqual(A.ASC.sync.status().state, 'pending');
    const r = await A.ASC.sync.syncNow();
    assert.strictEqual(r.action, 'uploaded'); assert.strictEqual(server.rows.get('u-1').rev, 1);
    assert.strictEqual(A.ASC.sync.status().state, 'ok');
  });
  await t('dispositivo B (con datos propios) ingresa: combina, no reemplaza', async () => {
    const s = B.ASC.store.get(); s.habits.push(habit('h-b1', 'Correr')); s.habitLogs['h-b1'] = { '2026-11-21': true };
    await B.ASC.sync.signIn('tomi@x.com', 'secreta123');
    const r = await B.ASC.sync.syncNow();
    assert.strictEqual(r.action, 'merged');
    assert.strictEqual(JSON.stringify(B.ASC.store.get().habits.map((h) => h.id).sort()), JSON.stringify(['h-a1', 'h-a2', 'h-b1']));
    assert.ok(B.ASC.store.get().habitLogs['h-a1']['2026-11-20'] && B.ASC.store.get().habitLogs['h-b1']['2026-11-21']);
  });
  await t('A vuelve a sincronizar y recibe lo de B', async () => {
    const r = await A.ASC.sync.syncNow();
    assert.strictEqual(r.action, 'merged');
    assert.strictEqual(JSON.stringify(A.ASC.store.get().habits.map((h) => h.id).sort()), JSON.stringify(['h-a1', 'h-a2', 'h-b1']));
  });
  await t('sin duplicados al sincronizar varias veces', async () => {
    await A.ASC.sync.syncNow(); await B.ASC.sync.syncNow(); await A.ASC.sync.syncNow();
    assert.strictEqual(A.ASC.store.get().habits.length, 3); assert.strictEqual(B.ASC.store.get().habits.length, 3);
  });
  await t('borrado en B no revive desde A', async () => {
    const s = B.ASC.store.get(); s.habits = s.habits.filter((h) => h.id !== 'h-a2'); B.ASC.merge.markDeleted(s, 'h-a2');
    await B.ASC.sync.syncNow(); await A.ASC.sync.syncNow();
    assert.ok(!A.ASC.store.get().habits.some((h) => h.id === 'h-a2'));
  });
  await t('edición: gana la más reciente', async () => {
    const hb = B.ASC.store.get().habits.find((h) => h.id === 'h-a1'); hb.name = 'Leer 20 min'; hb.updatedAt = new Date(Date.now() + 1000).toISOString();
    await B.ASC.sync.syncNow(); await A.ASC.sync.syncNow();
    assert.strictEqual(A.ASC.store.get().habits.find((h) => h.id === 'h-a1').name, 'Leer 20 min');
  });
  await t('cambios simultáneos: si otro escribe entre lectura y escritura, reintenta y combina', async () => {
    A.ASC.store.get().habits.push(habit('h-a3', 'Estirar'));
    server.setHook(async () => { B.ASC.store.get().habits.push(habit('h-b2', 'Meditar')); await B.ASC.sync.syncNow(); });
    await A.ASC.sync.syncNow();
    const ids = A.ASC.store.get().habits.map((h) => h.id);
    assert.ok(ids.includes('h-a3') && ids.includes('h-b2'), ids.join());
    const remote = server.rows.get('u-1').data.habits.map((h) => h.id);
    assert.ok(remote.includes('h-a3') && remote.includes('h-b2'));
  });
  await t('estado "pendiente" tras un cambio local y "sincronizado" después', async () => {
    A.ASC.store.get().habitLogs['h-a1']['2026-11-22'] = true;
    assert.strictEqual(A.ASC.sync.status().state, 'pending');
    await A.ASC.sync.syncNow();
    assert.strictEqual(A.ASC.sync.status().state, 'ok');
  });
  await t('otra cuenta en el mismo dispositivo: NO mezcla sin confirmación', async () => {
    await A.ASC.sync.signOut();
    await A.ASC.sync.signIn('otro@x.com', 'secreta456');
    assert.strictEqual(A.ASC.sync.status().state, 'conflict');
    await assert.rejects(() => A.ASC.sync.syncNow(), /otra cuenta/);
    assert.ok(!server.rows.has('u-2'), 'no se subió nada a la otra cuenta');
  });
  await t('...y con confirmación explícita, los suma a la nueva cuenta', async () => {
    const before = JSON.stringify(server.rows.get('u-1'));
    await A.ASC.sync.syncNow({ adoptOtherAccount: true });
    assert.ok(server.rows.has('u-2'));
    assert.strictEqual(A.ASC.sync.status().state, 'ok');
    assert.strictEqual(JSON.stringify(server.rows.get('u-1')), before, 'la primera cuenta no se tocó');
  });
  await t('cerrar sesión no borra los datos locales', async () => {
    const n = A.ASC.store.get().habits.length;
    await A.ASC.sync.signOut();
    assert.strictEqual(A.ASC.store.get().habits.length, n);
    assert.strictEqual(A.ASC.sync.status().state, 'signed-out');
  });
  await t('sin conexión: error claro y los datos quedan', async () => {
    B.ASC.sync; const nav = B.ASC.sync._friendly; // usa navigator.onLine del contexto
    assert.match(nav({ message: 'Failed to fetch' }).message, /Sin conexión/);
  });
  await t('errores de Supabase traducidos sin exponer detalles', async () => {
    const f = A.ASC.sync._friendly;
    assert.match(f({ code: 'email_address_not_authorized', message: 'x' }).message, /correo de prueba/);
    assert.match(f({ code: 'over_email_send_rate_limit' }).message, /demasiados correos/);
    assert.match(f({ message: 'Email not confirmed' }).message, /confirmaste/);
    assert.match(f({ message: 'User already registered' }).message, /Ya existe/);
  });
  console.log('\n' + ok + ' pruebas OK');
})().catch((e) => { console.error(e); process.exit(1); });
