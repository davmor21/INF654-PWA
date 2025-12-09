// ---------------- UI / APP GLUE ------------------

document.addEventListener('DOMContentLoaded', async () => {
  console.log("NeedToDo app loaded");

  M.AutoInit();
  M.Modal.init(document.querySelectorAll('.modal'));

  // Open IndexedDB
  await DB.openDB();

  // Initial fast render from cache (offline-first)
  renderHabits();
  renderClasses();
  renderHomeTasks();

  // If user already authed (page refresh)
  if (firebase.auth().currentUser) {
    console.log('[Auth] Restored session');
    await loadFromFirebase();
    renderHabits();
    renderClasses();
    renderHomeTasks();
  }

  // Bind buttons
  document.getElementById('fabAddHabit').addEventListener('click', onAddHabit);
  document.getElementById('btnAddClass').addEventListener('click', onAddClass);
  document.getElementById('btnAddAssignment').addEventListener('click', onAddAssignment);
  document.getElementById('fabAddHomeTask').addEventListener('click', onAddHomeTask);
  document.getElementById('btnExport').addEventListener('click', onExport);
  document.getElementById('btnDoImport').addEventListener('click', onDoImport);

  // Auth buttons
  document.getElementById('btnSignIn').addEventListener('click', () => FirebaseLive.fbSignIn());
  document.getElementById('btnSignOut').addEventListener('click', () => FirebaseLive.fbSignOut());
  document.getElementById('profileMenuTrigger').addEventListener('click', () => {
    if (firebase.auth().currentUser) {
      firebase.auth().signOut();
    } else {
      firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider());
      document.getElementById('profilePic').src = 'img/default-user.png';
    }
  });

});


// ---------------- CONSTS -----------------

const CURRENT_WS = 'ws_demo';
// NEW: track currently signed-in user UID for local filtering
let CURRENT_UID = null;


// ---------------- AUTH UI -----------------

window.onAuthChangedUI = function(user) {
  console.log('[Auth] UI Hook →', user ? user.uid : 'signed out');
  const signInBtn = document.getElementById('btnSignIn');
  const signOutBtn = document.getElementById('btnSignOut');
  const userSpan = document.getElementById('authUser');

  // NEW: store UID globally
  CURRENT_UID = user ? user.uid : null;

  if (user) {
    signInBtn.style.display = 'none';
    signOutBtn.style.display = 'block';
    userSpan.textContent = user.displayName;

    // Pull firebase data now that we know UID
    loadFromFirebase()
      .then(() => {
        console.log('[Sync] Firebase data loaded → re-rendering UI');
        renderHabits();
        renderClasses();
        renderHomeTasks();
      })
      .catch(e => console.error('[Sync] Firebase load failed:', e));
    const profilePic = document.getElementById('profilePic');
    if (user.photoURL) {
      profilePic.src = user.photoURL;
    } else {
      profilePic.src = 'img/default-user.png';
    }

  } else {
    signInBtn.style.display = 'block';
    signOutBtn.style.display = 'none';
    userSpan.textContent = '';

    // Clear UI for signed-out view
    document.getElementById('habitsList').innerHTML = '<p>Please sign in</p>';
    document.getElementById('classesList').innerHTML = '<p>Please sign in</p>';
    document.getElementById('homeTasksList').innerHTML = '<p>Please sign in</p>';
  }
};


// ---------------- SYNC LOAD -----------------

async function loadFromFirebase() {
  if (!navigator.onLine || !window.FirebaseLive) return;
  console.log('[Sync] Pulling from Firebase...');

  try {
    const [tasks, homeTasks, classes, assignments] = await Promise.all([
      FirebaseLive.fbGetAll('tasks'),
      FirebaseLive.fbGetAll('homeTasks'),
      FirebaseLive.fbGetAll('classes'),
      FirebaseLive.fbGetAll('assignments')
    ]);

    // Cache into IndexedDB
    for (const t of tasks) await DB.put('tasks', t);
    for (const h of homeTasks) await DB.put('homeTasks', h);
    for (const c of classes) await DB.put('classes', c);
    for (const a of assignments) await DB.put('assignments', a);

    console.log('[Sync] Firebase data cached locally.');
  } catch (e) {
    console.error('[Sync] Firebase fetch failed:', e);
  }
}


// ---------------- UI RENDERING -----------------

async function renderHabits() {
  const all = await DB.all('tasks');
  // ONLY show tasks for the current user
  const habits = all.filter(t =>
    t.type === 'habit' &&
    t.workspaceId === CURRENT_WS &&
    (!CURRENT_UID || t.uid === CURRENT_UID)
  );
  const container = document.getElementById('habitsList');

  container.innerHTML = habits.map(h => `
    <div class="card">
      <div class="card-content">
        <span class="card-title">${h.title}</span>
        <a class="btn-small blue" onclick="markHabitDone('${h.id}')">Done today</a>
      </div>
    </div>
  `).join('') || '<p class="grey-text">No habits yet.</p>';
}

async function markHabitDone(id) {
  const log = {
    id: Domain.uid('log'),
    workspaceId: CURRENT_WS,
    taskId: id,
    dateISO: new Date().toISOString().slice(0,10),
    actorUid: 'local',
    createdAt: new Date().toISOString(),
    modifiedAt: Date.now(),
    // NEW: tag log by user
    uid: CURRENT_UID
  };

  await DB.put('logs', log);
  M.toast({html: 'Marked done'});
}


// ---------- CLASSES  ----------

let _selectedClass = null;

async function renderClasses() {
  const classes = (await DB.all('classes')).filter(c =>
    c.workspaceId === CURRENT_WS &&
    (!CURRENT_UID || c.uid === CURRENT_UID)
  );
  const el = document.getElementById('classesList');

  el.innerHTML = classes.map(c => `
    <a class="waves-effect waves-light btn-flat" onclick="selectClass('${c.id}')">${c.name}</a>
  `).join('') || '<p class="grey-text">No classes yet.</p>';
}

async function selectClass(id) {
  _selectedClass = id;
  document.getElementById('btnAddAssignment').classList.remove('disabled');
  await renderAssignments();
  await renderGrade();
  await renderGradeSchemeEditor();
}


// ---------- ASSIGNMENTS ----------

async function renderAssignments() {
  const list = document.getElementById('assignmentsList');
  if (!_selectedClass) { list.innerHTML = '<p class="grey-text">Select a class.</p>'; return; }

  const items = (await DB.all('assignments')).filter(a =>
    a.classId === _selectedClass &&
    (!CURRENT_UID || a.uid === CURRENT_UID)
  );
  list.innerHTML = items.map(a => `
    <div class="card">
      <div class="card-content">
        <span class="card-title">${a.title}</span>
        <p class="small-muted">Due ${new Date(a.dueISO).toLocaleString()}</p>
        <div class="section">
          <a class="btn-small blue" onclick="markAssignmentDone('${a.id}')">Mark Done</a>
        </div>
      </div>
    </div>
  `).join('') || '<p class="grey-text">No assignments yet.</p>';
}

async function markAssignmentDone(id) {
  const all = await DB.all('assignments');
  const as = all.find(x => x.id === id && (!CURRENT_UID || x.uid === CURRENT_UID));
  if (!as) return;
  as.status = 'done';
  as.modifiedAt = Date.now();

  await DB.put('assignments', as);
  M.toast({html: 'Assignment marked done'});
  renderAssignments();
}


// ---------- GRADE ----------

async function renderGrade() {
  const target = document.getElementById('currentGrade');
  if (!_selectedClass) { target.textContent = 'Select a class'; return; }

  const schemeAll = await DB.all('gradeSchemes');
  const itemsAll = await DB.all('gradeItems');

  const scheme = schemeAll.find(g =>
    g.classId === _selectedClass &&
    (!CURRENT_UID || g.uid === CURRENT_UID)
  );
  const items = itemsAll.filter(i =>
    i.classId === _selectedClass &&
    (!CURRENT_UID || i.uid === CURRENT_UID)
  );

  const res = Domain.computeWeightedGrade(scheme, items);

  if (!res) {
    target.innerHTML = '<span class="grey-text">Add a grade scheme to see current grade.</span>';
    return;
  }

  const pct = res.percent.toFixed(1);
  target.innerHTML = `<strong>${pct}%</strong> (weights total ${res.weightSum}%)`;
}

async function renderGradeSchemeEditor() {
  const panel = document.getElementById('gradeSchemePanel');
  if (!_selectedClass) { panel.textContent = 'Select a class to edit weights'; return; }

  const allSchemes = await DB.all('gradeSchemes');
  const scheme = allSchemes.find(g =>
    g.classId === _selectedClass &&
    (!CURRENT_UID || g.uid === CURRENT_UID)
  );
  if (!scheme) { panel.innerHTML = '<p class="grey-text">No scheme yet.</p>'; return; }

  panel.innerHTML = scheme.categories.map(c => `
    <div class="row" style="margin-bottom:8px;">
      <div class="col s6"><input value="${c.name}" disabled></div>
      <div class="col s6"><input value="${c.weight}" disabled><span class="small-muted">% weight</span></div>
    </div>
  `).join('');
}


// ---------- HOME TASKS  ----------

async function renderHomeTasks() {
  const tasks = (await DB.all('homeTasks')).filter(t =>
    t.workspaceId === CURRENT_WS &&
    (!CURRENT_UID || t.uid === CURRENT_UID)
  );
  const el = document.getElementById('homeTasksList');
  const now = Date.now();

  el.innerHTML = tasks.map(t => {
    const next = t.nextDueISO ? new Date(t.nextDueISO).getTime() : null;
    const badge = (next && next - now < 0) ? 'due'
                 : (next && next - now < 3*86400000) ? 'soon'
                 : 'ok';
    const nextTxt = next ? new Date(next).toLocaleDateString() : '—';

    return `
      <div class="card">
        <div class="card-content">
          <span class="card-title">${t.title}
            <span class="new badge ${badge}" data-badge-caption="${badge==='due'?'Overdue':badge==='soon'?'Soon':'OK'}"></span>
          </span>
          <p class="small-muted">Next due: ${nextTxt}</p>
          <div class="section">
            <a class="btn-small blue" onclick="logHomeTask('${t.id}')">Log as done</a>
          </div>
        </div>
      </div>
    `;
  }).join('') || '<p class="grey-text">No home tasks yet.</p>';
}

async function logHomeTask(id) {
  const tasks = await DB.all('homeTasks');
  const task = tasks.find(t => t.id === id && (!CURRENT_UID || t.uid === CURRENT_UID));
  if (!task) return;

  task.lastDoneISO = new Date().toISOString();
  task.modifiedAt = Date.now();
  task.nextDueISO = Domain.computeNextDue(task.lastDoneISO, task.freq);

  await DB.put('homeTasks', task);

  // Sync or queue
  if (navigator.onLine && window.FirebaseLive) {
    try { await FirebaseLive.fbUpdate(task); } 
    catch(e) { console.warn('fbUpdate failed; queueing:', e); }
  } else if (window.IDBStore) {
    await IDBStore.queueOp({ type: 'update', task });
  }

  M.toast({html: 'Logged'});
  renderHomeTasks();
}


// ---------------- ADD HANDLERS -----------------

async function onAddHabit() {
  const title = prompt('Habit title:');
  if (!title) return;

  const task = {
    id: Domain.uid('task'),
    workspaceId: CURRENT_WS,
    type: 'habit',
    title,
    status: 'todo',
    recurrence: {unit:'days', every:1},
    createdAt: new Date().toISOString(),
    modifiedAt: Date.now(),
    // NEW: tag by user
    uid: CURRENT_UID
  };

  await DB.put('tasks', task);

  if (navigator.onLine && window.FirebaseLive) {
    try { await FirebaseLive.fbCreate(task, "tasks"); }
    catch(e) { await IDBStore.queueOp({ type: 'create', task }); }
  } else {
    await IDBStore.queueOp({ type: 'create', task });
  }

  renderHabits();
}

async function onAddClass() {
  const name = prompt('Class name:');
  if (!name) return;

  const id = Domain.uid('class');
  const newClass = {
    id,
    workspaceId: CURRENT_WS,
    name,
    term: 'Fall 2025',
    createdAt: new Date().toISOString(),
    modifiedAt: Date.now(),
    // NEW: user ownership
    uid: CURRENT_UID
  };

  await DB.put('classes', newClass);
  await DB.put('gradeSchemes', {
    classId: id,
    workspaceId: CURRENT_WS,
    categories: [
      {name:'Homework', weight:30},
      {name:'Labs', weight:30},
      {name:'Exams', weight:40}
    ],
    // NEW: user ownership
    uid: CURRENT_UID
  });

  if (navigator.onLine && window.FirebaseLive) {
    try { await FirebaseLive.fbCreate(newClass, "classes"); }
    catch(e) { await IDBStore.queueOp({ type: 'create', collection:'classes', task:newClass }); }
  } else {
    await IDBStore.queueOp({ type: 'create', collection:'classes', task:newClass });
  }

  renderClasses();
}

async function onAddAssignment() {
  if (!_selectedClass) return;

  const title = prompt('Assignment title:');
  if (!title) return;

  const due = new Date(Date.now()+3*86400000).toISOString();
  const newAssignment = {
    id: Domain.uid('asg'),
    classId: _selectedClass,
    title,
    dueISO: due,
    status: 'todo',
    createdAt: new Date().toISOString(),
    modifiedAt: Date.now(),
    // NEW: user ownership
    uid: CURRENT_UID
  };

  await DB.put('assignments', newAssignment);

  if (navigator.onLine && window.FirebaseLive) {
    try { await FirebaseLive.fbCreate(newAssignment, "assignments"); }
    catch(e) { await IDBStore.queueOp({ type: 'create', collection:'assignments', task:newAssignment }); }
  } else {
    await IDBStore.queueOp({ type: 'create', collection:'assignments', task:newAssignment });
  }

  renderAssignments();
}

async function onAddHomeTask() {
  const title = prompt('Home task title:');
  if (!title) return;

  const next = Domain.computeNextDue(null, {unit:'weeks', every:1});
  const task = {
    id: Domain.uid('home'),
    workspaceId: CURRENT_WS,
    type:'home',
    title,
    freq: {unit:'weeks', every:1},
    lastDoneISO: null,
    nextDueISO: next,
    createdAt: new Date().toISOString(),
    modifiedAt: Date.now(),
    // NEW: user ownership
    uid: CURRENT_UID
  };

  await DB.put('homeTasks', task);

  if (navigator.onLine && window.FirebaseLive) {
    try { await FirebaseLive.fbCreate(task, "homeTasks"); }
    catch(e) { await IDBStore.queueOp({ type: 'create', task }); }
  } else {
    await IDBStore.queueOp({ type: 'create', task });
  }

  renderHomeTasks();
}


// ---------------- EXPORT / IMPORT -----------------

async function onExport() {
  const stores = [
    'workspaces','tasks','logs','classes',
    'assignments','gradeSchemes','gradeItems','settings','homeTasks'
  ];
  const data = {};
  for (const s of stores) data[s] = await DB.all(s).catch(() => []);
  
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2)],
                        { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'needtodo-export.json';
  a.click();
  URL.revokeObjectURL(url);
}

async function onDoImport() {
  const file = document.getElementById('importFile').files[0];
  if (!file) return;
  const txt = await file.text();
  const payload = JSON.parse(txt);

  for (const [store, arr] of Object.entries(payload.data || {})) {
    for (const item of arr) await DB.put(store, item);
  }

  M.toast({html: 'Import complete'});
  renderHabits(); renderClasses(); renderHomeTasks();
}


// ---------------- ONLINE EVENT -----------------

window.addEventListener('online', async () => {
  console.log('[Network] Online → syncing...');
  await syncOutboxToFirebase();
  await loadFromFirebase();
  renderHabits();
  renderClasses();
  renderHomeTasks();
});
