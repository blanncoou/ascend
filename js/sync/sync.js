/* ASCEND · Cuentas y sincronización (Supabase)
 *
 * Se activa solo si ASC.config.supabase.url y anonKey (clave pública: anon o publishable) están completos.
 *
 * Diseño:
 *  - Cada usuario tiene una fila en public.user_state { user_id, data (jsonb), rev, updated_at, device }.
 *  - RLS: cada usuario solo puede leer/escribir su propia fila (supabase/schema.sql).
 *  - Concurrencia optimista: se actualiza "donde rev = rev leído". Si otro dispositivo escribió antes,
 *    se descarga, se combina (ASC.merge.mergeStates, nunca se reemplaza lo local) y se reintenta.
 *  - Los datos locales recuerdan a qué cuenta se sincronizaron: si se inicia sesión con OTRA cuenta,
 *    no se mezclan sin confirmación explícita.
 *  - Enlaces de los correos (confirmación y recuperación de contraseña) llegan con los datos de sesión
 *    en el "#" de la URL (flujo implícito). handleAuthRedirect() los procesa antes de que actúe el router.
 *    Se usa el flujo implícito y no PKCE porque en iPhone el correo abre Safari, que no comparte
 *    almacenamiento con la app instalada: con PKCE el enlace fallaría.
 *  - La app sigue funcionando sin conexión: la sincronización es un paso extra, nunca un requisito.
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  let client = null;
  let session = null;
  let busy = false;
  let lastStatus = { state: 'idle', message: '' };
  const META_PREFIX = 'ascend:sync-meta';
  const listeners = [];

  function cfg() {
    return (ASC.config && ASC.config.supabase) || {};
  }
  function isConfigured() {
    const c = cfg();
    return !!(c.url && c.anonKey);
  }
  function emit() { listeners.forEach((fn) => { try { fn(); } catch (e) {} }); }
  function onChange(fn) { listeners.push(fn); }

  /* ---------- Metadatos por cuenta ---------- */
  function metaKey(uid) { return META_PREFIX + ':' + uid; }
  function meta(uid) {
    try { return JSON.parse(localStorage.getItem(metaKey(uid)) || '{}'); } catch (e) { return {}; }
  }
  function saveMeta(uid, m) {
    try { localStorage.setItem(metaKey(uid), JSON.stringify(m)); localStorage.setItem(META_PREFIX + ':owner', uid); } catch (e) {}
  }
  /** Cuenta con la que se sincronizaron por última vez los datos de este dispositivo (o null) */
  function owner() {
    try { return localStorage.getItem(META_PREFIX + ':owner'); } catch (e) { return null; }
  }
  function fingerprint() {
    const st = ASC.store.get();
    return ASC.store.checksum(JSON.stringify(st));
  }

  /** Estado para la interfaz: off | signed-out | syncing | ok | pending | offline | error | conflict */
  function status() {
    if (!isConfigured()) return { state: 'not-configured', message: 'Sincronización no configurada.' };
    if (busy) return { state: 'syncing', message: 'Sincronizando…' };
    if (!session) return { state: 'signed-out', message: 'Sin sesión iniciada.' };
    const uid = session.user.id;
    const own = owner();
    if (own && own !== uid) return { state: 'conflict', message: 'Los datos de este dispositivo se sincronizaron con otra cuenta.' };
    if (lastStatus.state === 'error' || lastStatus.state === 'offline') return lastStatus;
    const m = meta(uid);
    if (!m.lastSyncedAt) return { state: 'pending', message: 'Todavía no sincronizaste este dispositivo.' };
    if (m.fingerprint !== fingerprint()) return { state: 'pending', message: 'Hay cambios sin sincronizar.', at: m.lastSyncedAt };
    return { state: 'ok', message: 'Sincronizado', at: m.lastSyncedAt };
  }

  function loadSdk() {
    if (root.supabase && root.supabase.createClient) return Promise.resolve(root.supabase);
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = cfg().sdkUrl;
      s.async = true;
      s.crossOrigin = 'anonymous';
      s.onload = () => (root.supabase ? resolve(root.supabase) : reject(new Error('No se pudo cargar el módulo de cuentas.')));
      s.onerror = () => { s.remove(); reject(Object.assign(new Error('Sin conexión: no se pudo cargar el módulo de cuentas.'), { offline: true })); };
      document.head.appendChild(s);
    });
  }

  let clientPromise = null;
  function ensureClient() {
    if (!isConfigured()) return Promise.reject(new Error('Sincronización no configurada.'));
    if (client) return Promise.resolve(client);
    if (!clientPromise) {
      clientPromise = (async () => {
        const sb = await loadSdk();
        const c = sb.createClient(cfg().url, cfg().anonKey, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'implicit', storageKey: 'ascend-auth' },
        });
        const { data } = await c.auth.getSession();
        session = data.session;
        c.auth.onAuthStateChange((event, s) => {
          session = s;
          if (event === 'SIGNED_OUT') lastStatus = { state: 'idle', message: '' };
          emit();
        });
        client = c;
        return c;
      })().catch((e) => { clientPromise = null; throw e; });
    }
    return clientPromise;
  }

  /* ---------- Traducción de errores (sin exponer datos) ---------- */
  function friendly(e) {
    const msg = String((e && (e.message || e.error_description)) || e || '');
    const code = e && (e.code || e.error_code);
    if (!navigator.onLine || (e && e.offline) || /Failed to fetch|NetworkError|Load failed/i.test(msg)) return Object.assign(new Error('Sin conexión. Tus datos siguen guardados en este dispositivo.'), { offline: true });
    if (/Invalid login credentials/i.test(msg)) return new Error('Correo o contraseña incorrectos.');
    if (/Email not confirmed/i.test(msg) || code === 'email_not_confirmed') return new Error('Todavía no confirmaste tu correo. Revisá tu bandeja de entrada (y spam).');
    if (code === 'email_address_not_authorized' || /not authorized/i.test(msg)) return new Error('El servidor de correo de prueba todavía no puede enviar mensajes a esta dirección.');
    if (code === 'over_email_send_rate_limit' || /rate limit/i.test(msg)) return new Error('Se enviaron demasiados correos. Esperá un rato y probá de nuevo.');
    if (/User already registered/i.test(msg) || code === 'user_already_exists') return new Error('Ya existe una cuenta con ese correo. Ingresá o recuperá la contraseña.');
    if (code === 'weak_password' || /Password should/i.test(msg)) return new Error('La contraseña es demasiado débil: usá al menos 8 caracteres.');
    if (code === 'same_password') return new Error('La nueva contraseña tiene que ser distinta de la anterior.');
    if (/JWT expired|session.*(missing|expired)|refresh token/i.test(msg)) return new Error('Tu sesión venció. Volvé a ingresar.');
    try { console.warn('[ASCEND sync]', code || '', msg.slice(0, 160)); } catch (x) {}
    return new Error('No se pudo completar. Probá de nuevo en un momento.');
  }

  /* ---------- Autenticación ---------- */
  function siteUrl() { return cfg().redirectTo || location.origin + location.pathname; }

  async function signUp(email, password) {
    try {
      const c = await ensureClient();
      const { data, error } = await c.auth.signUp({ email, password, options: { emailRedirectTo: siteUrl() } });
      if (error) throw error;
      // Con confirmación por correo, un correo ya registrado devuelve un usuario sin identidades
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) throw { code: 'user_already_exists' };
      if (data.session) session = data.session;
      emit();
      return { needsConfirmation: !data.session };
    } catch (e) { throw friendly(e); }
  }
  async function signIn(email, password) {
    try {
      const c = await ensureClient();
      const { data, error } = await c.auth.signInWithPassword({ email, password });
      if (error) throw error;
      session = data.session;
      emit();
      return data;
    } catch (e) { throw friendly(e); }
  }
  async function resetPassword(email) {
    try {
      const c = await ensureClient();
      const { error } = await c.auth.resetPasswordForEmail(email, { redirectTo: siteUrl() });
      if (error) throw error;
      return true;
    } catch (e) { throw friendly(e); }
  }
  async function updatePassword(password) {
    try {
      const c = await ensureClient();
      const { error } = await c.auth.updateUser({ password });
      if (error) throw error;
      return true;
    } catch (e) { throw friendly(e); }
  }
  async function signOut() {
    try {
      const c = await ensureClient();
      await c.auth.signOut({ scope: 'local' });
    } catch (e) { /* sin conexión: igual se cierra localmente */ }
    session = null;
    lastStatus = { state: 'idle', message: '' };
    emit();
  }
  function user() {
    return session ? session.user : null;
  }

  /** Procesa los enlaces de los correos (#access_token=…&type=recovery|signup, o #error=…).
   *  Devuelve { type } o null. Limpia la URL para que el router no vea los datos de sesión. */
  async function handleAuthRedirect() {
    const h = location.hash || '';
    if (!/(^#|&)(access_token|error|error_description)=/.test(h)) return null;
    const p = new URLSearchParams(h.slice(1));
    history.replaceState(null, '', location.pathname + location.search + '#/profile');
    if (p.get('error') || p.get('error_description')) {
      const expired = /expired|invalid/i.test(p.get('error_description') || '') || p.get('error_code') === 'otp_expired';
      return { type: 'error', message: expired ? 'El enlace del correo venció o ya se usó. Pedí uno nuevo.' : 'No se pudo usar el enlace del correo.' };
    }
    if (!isConfigured()) return null;
    try {
      const c = await ensureClient();
      const { data, error } = await c.auth.setSession({ access_token: p.get('access_token'), refresh_token: p.get('refresh_token') });
      if (error) throw error;
      session = data.session;
      emit();
      return { type: p.get('type') || 'signin' };
    } catch (e) {
      return { type: 'error', message: friendly(e).message };
    }
  }

  /* ---------- Sincronización ---------- */
  /** opts.adoptOtherAccount: el usuario confirmó combinar datos que estaban asociados a otra cuenta */
  async function syncNow(opts) {
    opts = opts || {};
    if (busy) return { action: 'busy' };
    let c;
    try { c = await ensureClient(); } catch (e) { const f = friendly(e); lastStatus = { state: f.offline ? 'offline' : 'error', message: f.message }; throw f; }
    if (!session) { const e = new Error('Iniciá sesión para sincronizar.'); e.signedOut = true; throw e; }
    const uid = session.user.id;
    const own = owner();
    if (own && own !== uid && !opts.adoptOtherAccount) { const e = new Error('Los datos de este dispositivo pertenecen a otra cuenta.'); e.conflict = true; throw e; }
    busy = true; emit();
    try {
      const m = own === uid ? meta(uid) : {};
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data: row, error } = await c.from('user_state').select('data, rev').eq('user_id', uid).maybeSingle();
        if (error) throw error;
        let local = ASC.store.get();
        if (!row) {
          const ins = await c.from('user_state').insert({ user_id: uid, data: local, rev: 1, device: navigator.userAgent.slice(0, 120) });
          if (ins.error) { if (ins.error.code === '23505') continue; throw ins.error; } // otro dispositivo la creó recién
          saveMeta(uid, { lastRemoteRev: 1, lastSyncedAt: new Date().toISOString(), fingerprint: fingerprint() });
          lastStatus = { state: 'ok', message: 'Sincronizado' };
          return { action: 'uploaded' };
        }
        let merged = false;
        if (row.rev !== m.lastRemoteRev) {
          // Otro dispositivo escribió (o este dispositivo es nuevo en la cuenta): combinar antes de subir
          await ASC.store.replaceAll(ASC.merge.mergeStates(local, row.data)); // crea una copia de seguridad antes
          ASC.perf && ASC.perf.reset && ASC.perf.reset();
          local = ASC.store.get();
          merged = true;
        }
        const upd = await c.from('user_state').update({ data: local, rev: row.rev + 1, updated_at: new Date().toISOString(), device: navigator.userAgent.slice(0, 120) })
          .eq('user_id', uid).eq('rev', row.rev).select('rev');
        if (upd.error) throw upd.error;
        if (upd.data && upd.data.length) {
          saveMeta(uid, { lastRemoteRev: row.rev + 1, lastSyncedAt: new Date().toISOString(), fingerprint: fingerprint() });
          lastStatus = { state: 'ok', message: 'Sincronizado' };
          return { action: merged ? 'merged' : 'uploaded' };
        }
        // Otro dispositivo escribió entre la lectura y la escritura: reintentar
      }
      throw Object.assign(new Error('Hubo cambios simultáneos en otro dispositivo. Probá de nuevo.'), { retry: true });
    } catch (e) {
      const f = e.retry ? e : friendly(e);
      lastStatus = { state: f.offline ? 'offline' : 'error', message: f.message };
      throw f;
    } finally {
      busy = false; emit();
    }
  }

  ASC.sync = { isConfigured, status, signUp, signIn, resetPassword, updatePassword, signOut, user, syncNow, ensureClient, handleAuthRedirect, onChange, owner, _friendly: friendly };
})(typeof window !== 'undefined' ? window : globalThis);
