(function () {
  const notify = (msg) => {
    // If you use Materialize toast:
    if (window.M && M.toast) M.toast({ html: msg });
    else console.log('[notify]', msg);
  };

  const isOnline = () => navigator.onLine;

  async function createTask(task) {
    // Ensure stable ID across modes
    if (!task.id) task.id = crypto.randomUUID();
    task.updatedAt = Date.now();

    if (isOnline() && window.FirebaseLive) {
      await FirebaseLive.fbCreate(task);
      // keep IDB in sync for fast local reads
      await IDBStore.idbCreate(task);
    } else {
      await IDBStore.idbCreate(task);
      await IDBStore.queueOp({ type: 'create', task });
      notify('Saved offline — will sync later.');
    }
    return task;
  }

  async function updateTask(task) {
    task.updatedAt = Date.now();
    if (isOnline() && window.FirebaseLive) {
      await FirebaseLive.fbUpdate(task);
      await IDBStore.idbUpdate(task);
    } else {
      await IDBStore.idbUpdate(task);
      await IDBStore.queueOp({ type: 'update', task });
      notify('Updated offline — will sync later.');
    }
    return task;
  }

  async function deleteTask(id) {
    if (isOnline() && window.FirebaseLive) {
      await FirebaseLive.fbDelete(id);
      await IDBStore.idbDelete(id);
    } else {
      await IDBStore.idbDelete(id);
      await IDBStore.queueOp({ type: 'delete', id });
      notify('Deleted offline — will sync later.');
    }
  }

  async function readAllTasks() {
    if (isOnline() && window.FirebaseLive) {
      const list = await FirebaseLive.fbGetAll();
      // refresh local cache for offline start-ups
      const existing = await IDBStore.idbGetAll();
      const existingIds = new Set(existing.map(t => t.id));
      for (const t of list) {
        if (!existingIds.has(t.id)) await IDBStore.idbCreate(t);
        }
      return list;
    } else {
      return await IDBStore.idbGetAll();
    }
  }

  async function syncOutbox() {
    if (!isOnline() || !window.FirebaseLive) return;
    const ops = await IDBStore.loadOutbox();
    if (!ops.length) return;

    for (const op of ops) {
      try {
        if (op.type === 'create' || op.type === 'update') {
          await FirebaseLive.fbUpdate(op.task); // set/merge is idempotent
        } else if (op.type === 'delete') {
          await FirebaseLive.fbDelete(op.id);
        }
        await IDBStore.removeFromOutbox(op.clientOpId);
      } catch (e) {
        console.error('Sync failed for op:', op, e);
        // Leave it in outbox; will retry on next online event.
      }
    }
    notify(`Synced ${ops.length} change(s) to Firebase.`);
  }
    
  window.addEventListener('online', syncOutbox);

  window.addEventListener('load', () => {
    if (navigator.onLine) DataSync.syncOutbox();
    });

  window.DataSync = {
    createTask, updateTask, deleteTask, readAllTasks, syncOutbox
  };
})();