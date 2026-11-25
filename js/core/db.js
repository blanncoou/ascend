/* ASCEND · Acceso a IndexedDB (capa de bajo nivel, sin lógica de negocio)
 * Base "ascend", object stores:
 *  - kv:      documentos clave/valor ('state' = datos del usuario, 'meta' = info de migraciones y copias)
 *  - backups: copias locales completas { id, createdAt, reason, checksum, size, data }
 * Si IndexedDB no está disponible (navegación privada en algunos navegadores, entorno de pruebas),
 * `available()` devuelve false y la capa superior usa localStorage como respaldo.
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  const NAME = 'ascend';
  const DB_VERSION = 1;
  let dbPromise = null;

  function available() {
    try { return !!root.indexedDB; } catch (e) { return false; }
  }

  function open() {
    if (!available()) return Promise.reject(new Error('IndexedDB no disponible'));
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = root.indexedDB.open(NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
        if (!db.objectStoreNames.contains('backups')) db.createObjectStore('backups', { keyPath: 'id' });
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
      req.onerror = () => reject(req.error || new Error('No se pudo abrir IndexedDB'));
      req.onblocked = () => reject(new Error('IndexedDB bloqueada por otra pestaña'));
    });
    dbPromise.catch(() => (dbPromise = null));
    return dbPromise;
  }

  function tx(store, mode, fn) {
    return open().then((db) => new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const s = t.objectStore(store);
      let result;
      Promise.resolve(fn(s)).then((r) => (result = r));
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error || new Error('Error de transacción'));
      t.onabort = () => reject(t.error || new Error('Transacción abortada (¿espacio insuficiente?)'));
    }));
  }

  const wrap = (req) => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });

  function get(key) {
    return open().then((db) => wrap(db.transaction('kv').objectStore('kv').get(key)));
  }
  function put(key, value) {
    return tx('kv', 'readwrite', (s) => { s.put(value, key); });
  }
  function del(key) {
    return tx('kv', 'readwrite', (s) => { s.delete(key); });
  }
  function putBackup(b) {
    return tx('backups', 'readwrite', (s) => { s.put(b); });
  }
  function delBackup(id) {
    return tx('backups', 'readwrite', (s) => { s.delete(id); });
  }
  function listBackups() {
    return open().then((db) => wrap(db.transaction('backups').objectStore('backups').getAll()))
      .then((all) => all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
  }
  function getBackup(id) {
    return open().then((db) => wrap(db.transaction('backups').objectStore('backups').get(id)));
  }

  ASC.db = { available, open, get, put, del, putBackup, delBackup, listBackups, getBackup };
})(typeof window !== 'undefined' ? window : globalThis);
