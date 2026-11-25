/* ASCEND · Cuentas y sincronización (Supabase) — PREPARADO, NO ACTIVO
 *
 * Estado: este módulo no se activa mientras ASC.config.supabase.url / anonKey estén vacíos.
 * No fue probado contra un proyecto Supabase real (no había uno disponible). Ver docs/SUPABASE.md.
 *
 * Diseño:
 *  - Cada usuario tiene una fila en public.user_state { user_id, data (jsonb), rev, updated_at, device }.
 *  - RLS: cada usuario solo puede leer/escribir su propia fila (supabase/schema.sql).
 *  - Concurrencia optimista: se actualiza "donde rev = rev leído". Si otro dispositivo escribió antes,
 *    se descarga, se combina (ASC.merge.mergeStates) y se reintenta.
 *  - La app sigue funcionando sin conexión: la sincronización es un paso extra, nunca un requisito.
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  let client = null;
  let session = null;
  let lastStatus = { state: 'off', message: '' };
  const META_KEY = 'ascend:sync-meta';

  function cfg() {
    return (ASC.config && ASC.config.supabase) || {};
  }

  function isConfigured() {
    const c = cfg();
    return !!(c.url && c.anonKey);
  }

  function status() {
    if (!isConfigured()) return { state: 'not-configured', message: 'Sincronización no configurada: falta un proyecto de Supabase (URL y clave pública anon).' };
    return lastStatus;
  }

  function loadSdk() {
    if (root.supabase && root.supabase.createClient) return Promise.resolve(root.supabase);
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = cfg().sdkUrl;
      s.async = true;
      s.onload = () => (root.supabase ? resolve(root.supabase) : reject(new Error('No se pudo cargar el SDK de Supabase')));
      s.onerror = () => reject(new Error('Sin conexión para cargar el SDK de Supabase'));
      document.head.appendChild(s);
    });
  }

  async function ensureClient() {
    if (!isConfigured()) throw new Error(status().message);
    if (client) return client;
    const sb = await loadSdk();
    client = sb.createClient(cfg().url, cfg().anonKey, { auth: { persistSession: true, autoRefreshToken: true } });
    const { data } = await client.auth.getSession();
    session = data.session;
    client.auth.onAuthStateChange((_e, s) => { session = s; });
    return client;
  }

  /* ---------- Autenticación ---------- */
  async function signUp(email, password) {
    const c = await ensureClient();
    const { data, error } = await c.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }
  async function signIn(email, password) {
    const c = await ensureClient();
    const { data, error } = await c.auth.signInWithPassword({ email, password });
    if (error) throw error;
    session = data.session;
    return data;
  }
  async function resetPassword(email) {
    const c = await ensureClient();
    const { error } = await c.auth.resetPasswordForEmail(email, { redirectTo: cfg().redirectTo || location.href.split('#')[0] });
    if (error) throw error;
    return true;
  }
  async function signOut() {
    const c = await ensureClient();
    await c.auth.signOut();
    session = null;
  }
  function user() {
    return session ? session.user : null;
  }

  /* ---------- Sincronización ---------- */
  function meta() {
    try { return JSON.parse(localStorage.getItem(META_KEY) || '{}'); } catch (e) { return {}; }
  }
  function saveMeta(m) {
    try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch (e) {}
  }

  async function syncNow() {
    const c = await ensureClient();
    if (!session) throw new Error('Iniciá sesión para sincronizar.');
    lastStatus = { state: 'syncing', message: 'Sincronizando…' };
    const uid = session.user.id;
    const m = meta();
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: row, error } = await c.from('user_state').select('data, rev, updated_at').eq('user_id', uid).maybeSingle();
      if (error) throw error;
      let local = ASC.store.get();
      if (!row) {
        const ins = await c.from('user_state').insert({ user_id: uid, data: local, rev: 1, device: navigator.userAgent.slice(0, 120) });
        if (ins.error) throw ins.error;
        saveMeta({ lastRemoteRev: 1, lastSyncedAt: new Date().toISOString() });
        lastStatus = { state: 'ok', message: 'Sincronizado' };
        return { action: 'uploaded' };
      }
      if (row.rev !== m.lastRemoteRev) {
        // Otro dispositivo escribió: combinar antes de subir
        const merged = ASC.merge.mergeStates(local, row.data);
        await ASC.store.replaceAll(merged);
        ASC.perf && ASC.perf.reset();
        local = ASC.store.get();
      }
      const upd = await c.from('user_state').update({ data: local, rev: row.rev + 1, updated_at: new Date().toISOString(), device: navigator.userAgent.slice(0, 120) })
        .eq('user_id', uid).eq('rev', row.rev).select('rev');
      if (upd.error) throw upd.error;
      if (upd.data && upd.data.length) {
        saveMeta({ lastRemoteRev: row.rev + 1, lastSyncedAt: new Date().toISOString() });
        lastStatus = { state: 'ok', message: 'Sincronizado' };
        return { action: row.rev !== m.lastRemoteRev ? 'merged' : 'uploaded' };
      }
      // Alguien escribió entre la lectura y la escritura: reintentar
    }
    lastStatus = { state: 'error', message: 'Hubo cambios simultáneos en otro dispositivo. Probá de nuevo.' };
    throw new Error(lastStatus.message);
  }

  ASC.sync = { isConfigured, status, signUp, signIn, resetPassword, signOut, user, syncNow, ensureClient };
})(typeof window !== 'undefined' ? window : globalThis);
