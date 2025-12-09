// firebase-live.js
(function () {
  if (!window.FB_CONFIG || !window.firebase) {
    console.warn('[FirebaseLive] Missing FB_CONFIG or firebase global.');
    return;
  }

  // Initialise (compat SDK)
  if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(window.FB_CONFIG);
  }

  const db   = firebase.firestore();
  const auth = firebase.auth();

  let currentUser = null;

  // ---------- helpers ----------

  function requireUser() {
    if (!currentUser) {
      throw new Error('[FirebaseLive] No signed-in user.');
    }
    return currentUser;
  }

  // Get a subcollection for the current user:
  // collectionName is "tasks", "homeTasks", "classes", "assignments"
  function userCollection(collectionName) {
    const user = requireUser();
    return db
      .collection('users')
      .doc(user.uid)
      .collection(collectionName);
  }

  // Normalise item before write
  function withTimestamps(item) {
    const now = Date.now();
    return {
      ...item,
      updatedAt: item.updatedAt || now,
      createdAt: item.createdAt || now,
    };
  }

  // ---------- CRUD API ----------

  async function fbCreate(item, collectionName = 'tasks') {
    const col = userCollection(collectionName);

    // If caller didn’t set id, let Firestore make one and mirror it back
    const docRef = item.id ? col.doc(item.id) : col.doc();
    const data   = withTimestamps({ ...item, id: docRef.id });

    await docRef.set(data, { merge: true });
    console.log(`[Firebase] Created in ${collectionName}:`, docRef.id);
    return data;
  }

  async function fbUpdate(item, collectionName = 'tasks') {
    if (!item.id) throw new Error('fbUpdate requires item.id');
    const col   = userCollection(collectionName);
    const data  = withTimestamps(item);
    await col.doc(item.id).set(data, { merge: true });
    console.log(`[Firebase] Updated in ${collectionName}:`, item.id);
    return data;
  }

  async function fbDelete(id, collectionName = 'tasks') {
    const col = userCollection(collectionName);
    await col.doc(id).delete();
    console.log(`[Firebase] Deleted from ${collectionName}:`, id);
  }

  async function fbGetAll(collectionName = 'tasks') {
    if (!currentUser) {
      // Not signed in → nothing from Firestore (you still have IndexedDB)
      console.log(`[Firebase] fbGetAll(${collectionName}) with no user → []`);
      return [];
    }

    const col = userCollection(collectionName);

    try {
      const snap = await col.orderBy('updatedAt', 'desc').get();
      const docs = snap.docs.map(d => d.data());
      console.log(
        `[Firebase] Loaded ${docs.length} from users/${currentUser.uid}/${collectionName}`
      );
      return docs;
    } catch (e) {
      console.warn(
        `[Firebase] orderBy(updatedAt) failed in ${collectionName}, falling back:`,
        e
      );
      const snap = await col.get();
      const docs = snap.docs.map(d => d.data());
      console.log(
        `[Firebase] Loaded ${docs.length} from users/${currentUser?.uid}/${collectionName} (fallback)`
      );
      return docs;
    }
  }

  // ---------- Auth API ----------

  async function fbSignIn() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      const res = await auth.signInWithPopup(provider);
      currentUser = res.user;
      console.log('[Auth] Signed in as', currentUser.uid);
      return currentUser;
    } catch (e) {
      console.error('[Auth] Sign-in failed:', e);
      throw e;
    }
  }

  async function fbSignOut() {
    try {
      await auth.signOut();
      console.log('[Auth] Signed out');
      currentUser = null;
    } catch (e) {
      console.error('[Auth] Sign-out error:', e);
      throw e;
    }
  }

  function fbGetCurrentUser() {
    return currentUser;
  }

  // Keep UI in sync
  auth.onAuthStateChanged(user => {
    currentUser = user || null;
    console.log('[AuthListener] now:', currentUser ? currentUser.uid : 'null');
    if (window.onAuthChangedUI) {
      window.onAuthChangedUI(currentUser);
    }
  });

  // Expose global API
  window.FirebaseLive = {
    fbCreate,
    fbUpdate,
    fbDelete,
    fbGetAll,
    fbSignIn,
    fbSignOut,
    fbGetCurrentUser,
  };
})();
