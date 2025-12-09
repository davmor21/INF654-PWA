(function () {
  if (!window.FB_CONFIG) {
    console.warn("Firebase config missing. Include firebase-config.js.");
    return;
  }

  firebase.initializeApp(window.FB_CONFIG);
  const db = firebase.firestore();

  let currentUser = null;

  // --------- GET COLLECTIONS UNDER THE LOGGED-IN USER ---------
  function getRefs() {
    if (!currentUser) {
      console.warn("[Firebase] No user yet → returning null refs");
      return null;
    }
    const base = db.collection("users").doc(currentUser.uid);
    return {
      tasks:       base.collection("tasks"),
      homeTasks:   base.collection("homeTasks"),
      classes:     base.collection("classes"),
      assignments: base.collection("assignments")
    };
  }


  // --------- CRUD HELPERS ---------
  async function fbCreate(item, collectionName = "tasks") {
    const refs = getRefs();
    if (!refs) return;
    item.modifiedAt = Date.now();
    await refs[collectionName].doc(item.id).set(item, { merge: true });
    console.log(`[Firebase] Create in ${collectionName}:`, item.id);
    return item;
  }

  async function fbUpdate(item, collectionName = "tasks") {
    const refs = getRefs();
    if (!refs) return;
    item.modifiedAt = Date.now();
    await refs[collectionName].doc(item.id).set(item, { merge: true });
    console.log(`[Firebase] Update in ${collectionName}:`, item.id);
    return item;
  }

  async function fbDelete(id, collectionName = "tasks") {
    const refs = getRefs();
    if (!refs) return;
    await refs[collectionName].doc(id).delete();
    console.log(`[Firebase] Delete from ${collectionName}:`, id);
  }

  async function fbGetAll(collectionName = "tasks") {
    const refs = getRefs();
    if (!refs) return [];
    try {
      const snap = await refs[collectionName].orderBy("modifiedAt", "desc").get();
      const docs = snap.docs.map(d => d.data());
      console.log(`[Firebase] Loaded ${docs.length} from ${collectionName}`);
      return docs;
    } catch (e) {
      console.warn(`[Firebase] fbGetAll fallback:`, e);
      const snap = await refs[collectionName].get();
      return snap.docs.map(d => d.data());
    }
  }


  // --------- AUTH ---------
  async function fbSignIn() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      const res = await firebase.auth().signInWithPopup(provider);
      currentUser = res.user;
      console.log("[Auth] Signed in as", currentUser.uid);
      return currentUser.uid;
    } catch (e) {
      console.error("[Auth] Sign-in failed:", e);
    }
  }

  async function fbSignOut() {
    try {
      await firebase.auth().signOut();
      currentUser = null;
      console.log("[Auth] Signed out");
    } catch (e) {
      console.error("[Auth] Sign-out failed:", e);
    }
  }

  firebase.auth().onAuthStateChanged(user => {
    currentUser = user || null;
    console.log("[AuthListener] now:", currentUser ? currentUser.uid : "signed out");
    if (window.onAuthChangedUI) {
      window.onAuthChangedUI(currentUser);
    }
  });


  // --------- EXPORT ---------
  window.FirebaseLive = {
    fbCreate,
    fbUpdate,
    fbDelete,
    fbGetAll,
    fbSignIn,
    fbSignOut
  };
})();
