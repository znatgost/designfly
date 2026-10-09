// A tiny IndexedDB key-value store for the artist brain (weights are a few MB — too big for localStorage).
export function idbStore(name = 'designfly', store = 'kv') {
  const open = () => new Promise((res, rej) => {
    const rq = indexedDB.open(name, 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore(store);
    rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error);
  });
  let db = null;
  const tx = async (mode, fn) => { db ||= await open(); return new Promise((res, rej) => { const t = db.transaction(store, mode), rq = fn(t.objectStore(store)); t.oncomplete = () => res(rq?.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }); };
  return {
    get: (k) => tx('readonly', (s) => s.get(k)),
    set: (k, v) => tx('readwrite', (s) => s.put(v, k)),
    del: (k) => tx('readwrite', (s) => s.delete(k)),
  };
}
