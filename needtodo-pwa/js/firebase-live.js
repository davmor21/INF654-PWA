/**
 * Firestore CRUD using a client-assigned ID for each entity.
 * Uses distinct collections for habits, home tasks, classes, and assignments.
 */
(function () {
  if (!window.FB_CONFIG) {
    console.warn('Firebase config missing. Include firebase-config.js.');
    return;
  }

  // Initialize Firebase app and Firestore
  firebase.initializeApp(window.FB_CONFIG);
  const db = firebase.firestore();

  // Define each Firestore collection
  const colRefs = {
    tasks: db.collection('tasks'),           // Habits
    homeTasks: db.collection('homeTasks'),   // Home tasks
    classes: db.collection('classes'),       // Classes
    assignments: db.collection('assignments')// Assignments
  };

  /**
   * Create or update a document
   * @param {object} item - The object to write (must include id)
   * @param {string} collectionName - One of 'tasks', 'homeTasks', 'classes', 'assignments'
   */
  async function fbCreate(item, collectionName = 'tasks') {
    const col = colRefs[collectionName] || colRefs.tasks;
    await col.doc(item.id).set(item, { merge: true });
    console.log(`[Firebase] Created in ${collectionName}:`, item.id);
    return item;
  }

  async function fbUpdate(item, collectionName = 'tasks') {
    const col = colRefs[collectionName] || colRefs.tasks;
    item.updatedAt = Date.now();
    await col.doc(item.id).set(item, { merge: true });
    console.log(`[Firebase] Updated in ${collectionName}:`, item.id);
    return item;
  }

  async function fbDelete(id, collectionName = 'tasks') {
    const col = colRefs[collectionName] || colRefs.tasks;
    await col.doc(id).delete();
    console.log(`[Firebase] Deleted from ${collectionName}:`, id);
  }

  async function fbGetAll(collectionName = 'tasks') {
  const col = colRefs[collectionName] || colRefs.tasks;
  try {
    const snap = await col.orderBy('updatedAt', 'desc').get();
    if (!snap.empty) {
      const docs = snap.docs.map(d => d.data());
      console.log(`[Firebase] Loaded ${docs.length} from ${collectionName} (ordered)`);
      return docs;
    }
  } catch (e) {
    console.warn(`[Firebase] orderBy(updatedAt) failed in ${collectionName}, falling back:`, e);
  }
  // Fallback: no orderBy, return all docs
  const fallback = await col.get();
  const docs = fallback.docs.map(d => d.data());
  console.log(`[Firebase] Loaded ${docs.length} from ${collectionName}`);
  return docs;
}


  // Expose globally
  window.FirebaseLive = { fbCreate, fbUpdate, fbDelete, fbGetAll };
})();
