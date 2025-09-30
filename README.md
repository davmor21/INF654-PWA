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

## Notes
- This is a **prototype** for class, not a production app.
- Data is stored locally in the browser (IndexedDB).
- Future improvements: Google Sign-In, shared workspaces, advanced grade tracking.
