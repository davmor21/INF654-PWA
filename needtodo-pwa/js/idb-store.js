(function () {
  const DB_NAME = 'needtodo-db';
  const DB_VERSION = 3;
  const TASKS = 'tasks';
  const OUTBOX = 'outbox';

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(TASKS)) {
          const store = db.createObjectStore(TASKS, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt');
        }
        if (!db.objectStoreNames.contains(OUTBOX)) {
          db.createObjectStore(OUTBOX, { keyPath: 'clientOpId' }); // queued operations
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function withStore(name, mode, fn) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(name, mode);
      const store = tx.objectStore(name);
      const result = fn(store);
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
    });
  }

  // TASKS CRUD (offline)
  async function idbCreate(task) {
    task.updatedAt = Date.now();
    await withStore(TASKS, 'readwrite', s => s.put(task));
    return task;
  }
  async function idbUpdate(task) {
    task.updatedAt = Date.now();
    await withStore(TASKS, 'readwrite', s => s.put(task));
    return task;
  }
  async function idbDelete(id) {
    await withStore(TASKS, 'readwrite', s => s.delete(id));
  }
  async function idbGetAll() {
    return await withStore(TASKS, 'readonly', s => s.getAll());
  }

  // OUTBOX queue for offline mutations
  async function queueOp(op) {
    const clientOpId = crypto.randomUUID();
    await withStore(OUTBOX, 'readwrite', s => s.put({ clientOpId, ...op }));
    return clientOpId;
  }
  async function loadOutbox() {
    return await withStore(OUTBOX, 'readonly', s => s.getAll());
  }
  async function removeFromOutbox(clientOpId) {
    await withStore(OUTBOX, 'readwrite', s => s.delete(clientOpId));
  }

  window.IDBStore = {
    idbCreate, idbUpdate, idbDelete, idbGetAll,
    queueOp, loadOutbox, removeFromOutbox
  };
})();

