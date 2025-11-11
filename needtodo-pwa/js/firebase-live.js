
/**
 * Firestore CRUD using a client-assigned ID for each task.
 * We use the SAME ID online and offline to avoid conflicts.
 */
(function () {
  if (!window.FB_CONFIG) {
    console.warn('Firebase config missing. Include firebase-config.js.');
    return;
  }
  firebase.initializeApp(window.FB_CONFIG);
  const db = firebase.firestore();
  const tasksCol = db.collection('tasks');

  async function fbCreate(task) {
    // Task must have a stable id (crypto.randomUUID) from UI layer
    await tasksCol.doc(task.id).set(task, { merge: true });
    return task;
  }
  async function fbUpdate(task) {
    task.updatedAt = Date.now();
    await tasksCol.doc(task.id).set(task, { merge: true });
    return task;
  }
  async function fbDelete(id) {
    await tasksCol.doc(id).delete();
  }
  async function fbGetAll() {
    const snap = await tasksCol.orderBy('updatedAt', 'desc').get();
    return snap.docs.map(d => d.data());
  }

  window.FirebaseLive = { fbCreate, fbUpdate, fbDelete, fbGetAll };
})();
