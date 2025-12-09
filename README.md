# NeedToDo (Prototype)

**NeedToDo** is a mobile-friendly task manager prototype built with **Materialize CSS**.  
It demonstrates responsive web design and the foundations of Progressive Web Apps (PWAs).

This project organizes daily habits, homework assignments, and home care tasks in one place.  
It’s designed to work well on both large and small screens, with the potential to become a fully functional PWA.

## Features
- Responsive layout using **Materialize CSS**
- Navigation tabs for **Habits**, **Homework**, and **Home Care**
- Forms to add and manage tasks
- Offline support (via **Service Worker**)
- Installable on mobile as a PWA

## Getting Started
1. Clone or download this repository.
2. Open it locally using a local server:

   ```bash
   cd needtodo-pwa
   npx http-server -p 5173
   ```
   or  
   ```bash
   cd needtodo-pwa
   python -m http.server 5173
   ```

---

## Due 10/27/2025

# NeedToDo PWA (INF654 Assignment)

This prototype demonstrates **Progressive Web App** features: installability and offline caching through a service worker.

### What was added
- **Web App Manifest** (`manifest.webmanifest`)
  - App name, short name, start URL, display mode, theme colors, and icons
- **Service Worker** (`service-worker.js`)
  - Caches essential assets for offline use
  - Updates automatically with `self.skipWaiting()`
  - Serves cached files when offline

### Caching Strategy
- **App Shell** (precache): HTML, CSS, JS, and icons  
- **Runtime**: Cache-first, network fallback for same-origin requests

---

## Due 11/24/2025

# NeedToDo PWA — Firebase + IndexedDB Integration (INF654 Assignment Part 2)

This update expands the prototype to support both **online** and **offline** data storage using **Firebase Firestore** and **IndexedDB**.

### What was added
- **Firebase Firestore**
  - Online CRUD operations for tasks
  - Unique IDs for each task using `crypto.randomUUID()`
  - Real-time sync across browsers and devices
- **IndexedDB**
  - Offline CRUD and local persistence
  - “Outbox” system queues actions made while offline
- **Synchronization Logic**
  - Detects online/offline state automatically
  - Replays offline changes to Firestore once reconnected
  - Syncs automatically when the app loads or reconnects
- **Service Worker**
  - Updated to cache all new data scripts for full offline support
- **User Feedback**
  - Toast messages confirm offline saves and sync completion

---

## Testing
1. Add tasks online → verify in Firestore (`tasks` collection).  
2. Go offline → add, edit, or delete tasks.  
3. Go back online → queued changes sync automatically.  
4. Reload → tasks persist via IndexedDB.  

---


# NeedToDo PWA — Final Version (INF654 Project)

This phase completes NeedToDo with **Google Authentication**, **user-scoped Firebase data**, and improved UI/UX. All core PWA components are now working together so the app runs online and offline, syncing automatically when connectivity changes.

### What was added/finalized
- **Google Sign-In (Firebase Auth)**
  - Each user sees only their own tasks
  - Profile menu with dropdown to sign out
- **Firestore Structure:** `/users/{uid}/tasks`, `/classes`, `/homeTasks`, `/assignments`
- **IndexedDB Sync**
  - Local offline storage for all data
  - Outbox system replays unsynced changes on reconnect
- **Service Worker + Manifest**
  - Full offline caching and installability
- **Responsive UI**
  - Desktop: profile at top right
  - Mobile: simplified layout with profile menu
- **Automatic Sync**
  - On app load
  - When reconnecting
  - After user signs in

### Usage Notes
- App installs on mobile and desktop
- Works fully without internet
- Data syncs across multiple sessions/devices for the same Google account

**Developed for Fort Hays State University — INF654 Progressive Web Apps**

---

**Developed for Fort Hays State University — INF654 Progressive Web Applications**
