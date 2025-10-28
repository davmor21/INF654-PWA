# NeedToDo (Prototype)

**NeedToDo** is a mobile-friendly task manager prototype built with **Materialize CSS**. It demonstrates core concepts of responsive web design and introduces the foundations of Progressive Web Apps (PWAs).  

This project organizes daily habits, homework assignments, and home care tasks in one place. It’s designed to work well on both large and small screens, with the potential to be enhanced into a fully functional PWA.

## Features
- Responsive layout using **Materialize CSS**
- Navigation bar with tabs for **Habits**, **Homework**, and **Home Care**
- Forms to add and manage tasks
- Offline support (via **Service Worker**)
- Installable on mobile as a PWA (prototype level)

## Getting Started
1. Clone or download this repository.
2. Open it locally using an extension or using npx or python to start a local server:
   
     ## [Install Live Server for VSCode](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
      
      or
      ```bash
      cd needtodo-pwa
      npx http-server -p 5173
      ```
      or
      ```bash
      cd needtodo-pwa
      python -m http.server 5173
      ```

<br><br><br>
## Due 10/27/2025:

# NeedToDo PWA (INF654 Assignment)

This prototype demonstrates **Progressive Web App** features: installability and basic offline support via a service worker.

## What was added
- **Web App Manifest** (`manifest.webmanifest`):
  - `name`, `short_name`, and `description`
  - `start_url: ./` and `scope: ./` for correct relative paths (works on GitHub Pages/project subpaths)
  - `display: standalone`, `background_color`, `theme_color`
  - **Icons**: 192×192 and 512×512 under `img/icons/`

- **Service Worker** (`service-worker.js`):
  - Precaches core assets (HTML/CSS/JS/icons) on install
  - Cleans up old caches on activate and claims clients
  - Serves cached assets when offline (same‑origin requests)
  - `self.skipWaiting()` to promote new SW versions during development

## Caching strategy
- **App Shell (precache)**: `index.html`, CSS, JS, icons.
- **Runtime**: For same-origin requests, the SW responds from cache first, then falls back to network. This ensures the app still loads offline.
