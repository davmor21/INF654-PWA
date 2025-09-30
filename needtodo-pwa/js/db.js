// IndexedDB helpers (no external libs)
const DB_NAME = 'needtodo-db';
const DB_VER = 2;
let _dbPromise;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains('workspaces'))   db.createObjectStore('workspaces',   { keyPath: 'id' });
      if (!db.objectStoreNames.contains('tasks'))        db.createObjectStore('tasks',        { keyPath: 'id' });
      if (!db.objectStoreNames.contains('logs'))         db.createObjectStore('logs',         { keyPath: 'id' });
      if (!db.objectStoreNames.contains('classes'))      db.createObjectStore('classes',      { keyPath: 'id' });
      if (!db.objectStoreNames.contains('assignments'))  db.createObjectStore('assignments',  { keyPath: 'id' });
      if (!db.objectStoreNames.contains('gradeSchemes')) db.createObjectStore('gradeSchemes', { keyPath: 'classId' });
      if (!db.objectStoreNames.contains('gradeItems'))   db.createObjectStore('gradeItems',   { keyPath: 'id' });
      if (!db.objectStoreNames.contains('settings'))     db.createObjectStore('settings',     { keyPath: 'key' });
      if (!db.objectStoreNames.contains('homeTasks'))    db.createObjectStore('homeTasks',    { keyPath: 'id' }); // ⬅ missing before
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
  return _dbPromise;
}

async function dbPut(store, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve(value);
    tx.onerror = () => reject(tx.error);
  });
}

async function dbGetAll(store) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(store, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

window.DB = { openDB, put: dbPut, all: dbGetAll, del: dbDelete };
