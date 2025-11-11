document.addEventListener('DOMContentLoaded', async () => {
  M.AutoInit();
  await DB.openDB();

  // Auto-sync queued operations at startup if online (no user action needed)
if (navigator.onLine && window.FirebaseLive && window.IDBStore) {
  setTimeout(() => {
    syncOutboxToFirebase().catch(err => console.warn('Startup sync failed:', err));
  }, 1000); // 1s delay ensures modals + FABs initialize first
}


  seedFirstRun();
  renderHabits();
  renderClasses();
  renderHomeTasks();

  document.getElementById('fabAddHabit').addEventListener('click', onAddHabit);
  document.getElementById('btnAddClass').addEventListener('click', onAddClass);
  document.getElementById('btnAddAssignment').addEventListener('click', onAddAssignment);
  document.getElementById('fabAddHomeTask').addEventListener('click', onAddHomeTask);
  document.getElementById('btnExport').addEventListener('click', onExport);
  document.getElementById('btnDoImport').addEventListener('click', onDoImport);
});

const CURRENT_WS = 'ws_demo';

async function seedFirstRun() {
  const classes = await DB.all('classes');
  if (!classes.length) {
    // await DB.put('workspaces', { id: CURRENT_WS, name: 'Demo Workspace', members: [], createdAt: new Date().toISOString() });
    // await DB.put('tasks', { id: Domain.uid('task'), workspaceId: CURRENT_WS, type: 'habit', title: 'Take vitamins', status: 'todo', recurrence: {unit:'days', every:1}, createdAt: new Date().toISOString() });
    // await DB.put('classes', { id: 'class_demo', workspaceId: CURRENT_WS, name: 'CSCI 331', term: 'Fall 2025' });
    // await DB.put('assignments', { id: Domain.uid('asg'), classId: 'class_demo', title: 'HW1', dueISO: new Date(Date.now()+86400000).toISOString(), status: 'todo' });
    // await DB.put('gradeSchemes', { classId: 'class_demo', workspaceId: CURRENT_WS, categories: [{name:'Homework', weight:30},{name:'Labs', weight:30},{name:'Exams', weight:40}] });
    // await DB.put('homeTasks', { id: Domain.uid('home'), workspaceId: CURRENT_WS, title: 'Fridge water filter', freq: {unit:'months', every:6}, lastDoneISO: null, nextDueISO: Domain.computeNextDue(null,{unit:'months',every:6}), createdAt: new Date().toISOString() });
  }
}

async function renderHabits() {
  const all = await DB.all('tasks');
  const habits = all.filter(t => t.type === 'habit' && t.workspaceId === CURRENT_WS);
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
  const log = { id: Domain.uid('log'), workspaceId: CURRENT_WS, taskId: id, dateISO: new Date().toISOString().slice(0,10), actorUid: 'local', createdAt: new Date().toISOString() };
  await DB.put('logs', log);
  M.toast({html: 'Marked done'});
}

let _selectedClass = null;

async function renderClasses() {
  const classes = (await DB.all('classes')).filter(c => c.workspaceId === CURRENT_WS);
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

async function renderAssignments() {
  const list = document.getElementById('assignmentsList');
  if (!_selectedClass) { list.innerHTML = '<p class="grey-text">Select a class.</p>'; return; }
  const items = (await DB.all('assignments')).filter(a => a.classId === _selectedClass);
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
  const as = (await DB.all('assignments')).find(x => x.id === id);
  if (!as) return;
  as.status = 'done';
  await DB.put('assignments', as);
  M.toast({html: 'Assignment marked done'});
  renderAssignments();
}

async function renderGrade() {
  const target = document.getElementById('currentGrade');
  if (!_selectedClass) { target.textContent = 'Select a class'; return; }
  const scheme = (await DB.all('gradeSchemes')).find(g => g.classId === _selectedClass);
  const items = (await DB.all('gradeItems')).filter(i => i.classId === _selectedClass);
  const res = Domain.computeWeightedGrade(scheme, items);
  if (!res) { target.innerHTML = '<span class="grey-text">Add a grade scheme to see current grade.</span>'; return; }
  const pct = res.percent.toFixed(1);
  target.innerHTML = `<strong>${pct}%</strong> (weights total ${res.weightSum}%)`;
}

async function renderGradeSchemeEditor() {
  const panel = document.getElementById('gradeSchemePanel');
  if (!_selectedClass) { panel.textContent = 'Select a class to edit weights'; return; }
  const scheme = (await DB.all('gradeSchemes')).find(g => g.classId === _selectedClass);
  if (!scheme) { panel.innerHTML = '<p class="grey-text">No scheme yet.</p>'; return; }
  panel.innerHTML = scheme.categories.map(c => `
    <div class="row" style="margin-bottom:8px;">
      <div class="col s6"><input value="${c.name}" disabled></div>
      <div class="col s6"><input value="${c.weight}" disabled><span class="small-muted">% weight</span></div>
    </div>
  `).join('');
}

async function renderHomeTasks() {
  const tasks = (await DB.all('homeTasks')).filter(t => t.workspaceId === CURRENT_WS);
  const el = document.getElementById('homeTasksList');
  const now = Date.now();
  el.innerHTML = tasks.map(t => {
    const next = t.nextDueISO ? new Date(t.nextDueISO).getTime() : null;
    const badge = (next && next - now < 0) ? 'due' : (next && next - now < 3*86400000 ? 'soon' : 'ok');
    const nextTxt = next ? new Date(next).toLocaleDateString() : '—';
    return `
      <div class="card">
        <div class="card-content">
          <span class="card-title">${t.title} <span class="new badge ${badge}" data-badge-caption="${badge==='due'?'Overdue':badge==='soon'?'Soon':'OK'}"></span></span>
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
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.lastDoneISO = new Date().toISOString();
  task.nextDueISO = Domain.computeNextDue(task.lastDoneISO, task.freq);
  await DB.put('homeTasks', task); // keep local behavior
  // NEW: sync to Firebase (or queue) without changing UI flow
  if (navigator.onLine && window.FirebaseLive) {
    try { await FirebaseLive.fbUpdate(task); } catch(e) { console.warn('fbUpdate failed; will queue:', e); }
  } else if (window.IDBStore) {
    try { await IDBStore.queueOp({ type: 'update', task }); } catch {}
  }
  M.toast({html: 'Logged'});
  renderHomeTasks();
}

// --- Simple add actions ---
// (Only these two gained tiny Firebase sync — everything else untouched)

async function onAddHabit() {
  const title = prompt('Habit title:');
  if (!title) return;
  const task = { id: Domain.uid('task'), workspaceId: CURRENT_WS, type: 'habit', title, status: 'todo', recurrence: {unit:'days', every:1}, createdAt: new Date().toISOString() };

  await DB.put('tasks', task); // local first for offline UX

  // NEW: push to Firebase if online; otherwise queue for later
  if (navigator.onLine && window.FirebaseLive) {
    try { await FirebaseLive.fbCreate(task); } catch(e) { console.warn('fbCreate failed; will queue:', e); if (window.IDBStore) await IDBStore.queueOp({ type: 'create', task }); }
  } else if (window.IDBStore) {
    try { await IDBStore.queueOp({ type: 'create', task }); } catch {}
  }

  renderHabits();
}

async function onAddClass() {
  const name = prompt('Class name:');
  if (!name) return;
  const id = Domain.uid('class');
  await DB.put('classes', { id, workspaceId: CURRENT_WS, name, term: 'Fall 2025' });
  await DB.put('gradeSchemes', { classId: id, workspaceId: CURRENT_WS, categories: [{name:'Homework', weight:30},{name:'Labs', weight:30},{name:'Exams', weight:40}] });
  renderClasses();
}

async function onAddAssignment() {
  if (!_selectedClass) return;
  const title = prompt('Assignment title:');
  if (!title) return;
  const due = new Date(Date.now()+3*86400000).toISOString();
  await DB.put('assignments', { id: Domain.uid('asg'), classId: _selectedClass, title, dueISO: due, status: 'todo' });
  renderAssignments();
}

async function onAddHomeTask() {
  const title = prompt('Home task title:');
  if (!title) return;
  const next = Domain.computeNextDue(null, {unit:'weeks', every:1});
  const task = { id: Domain.uid('home'), workspaceId: CURRENT_WS, type:'home', title, freq: {unit:'weeks', every:1}, lastDoneISO: null, nextDueISO: next, createdAt: new Date().toISOString() };

  await DB.put('homeTasks', task); // local first

  // NEW: push to Firebase if online; otherwise queue
  if (navigator.onLine && window.FirebaseLive) {
    try { await FirebaseLive.fbCreate(task); } catch(e) { console.warn('fbCreate failed; will queue:', e); if (window.IDBStore) await IDBStore.queueOp({ type: 'create', task }); }
  } else if (window.IDBStore) {
    try { await IDBStore.queueOp({ type: 'create', task }); } catch {}
  }

  renderHomeTasks();
}

// Export / Import
async function onExport() {
  const stores = ['workspaces','tasks','logs','classes','assignments','gradeSchemes','gradeItems','settings','homeTasks'];
  const data = {};
  for (const s of stores) data[s] = await DB.all(s).catch(() => []);
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2)], { type: 'application/json' });
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

/* ------- minimal auto-sync plumbing (no UI changes) ------- */

async function syncOutboxToFirebase() {
  if (!window.IDBStore || !window.FirebaseLive) return;
  const ops = await IDBStore.loadOutbox().catch(() => []);
  if (!ops || !ops.length) return;
  for (const op of ops) {
    try {
      if (op.type === 'create' || op.type === 'update') {
        await FirebaseLive.fbCreate(op.task);
      } else if (op.type === 'delete') {
        await FirebaseLive.fbDelete(op.id);
      }
      await IDBStore.removeFromOutbox(op.clientOpId);
    } catch (e) {
      console.error('[Sync] Failed op, will retry later:', op, e);
      // leave queued
    }
  }
}

window.addEventListener('online', async () => {
  await syncOutboxToFirebase();
});
