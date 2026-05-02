================================================================
  TASKFLOW — Project & Task Management App
================================================================

OVERVIEW
--------
TaskFlow is a full-stack web application for managing projects
and tasks. It features a dark-themed UI, JWT authentication,
a SQLite database, and a kanban-style task board.


TECH STACK
----------
  Backend  : Node.js, Express, better-sqlite3, JWT, bcryptjs
  Frontend : React 18, Vite, React Router v6, Axios, Lucide


PROJECT STRUCTURE
-----------------
  taskflow/
  ├── backend/
  │   ├── middleware/
  │   │   └── auth.js          JWT auth + project access middleware
  │   ├── models/
  │   │   └── database.js      SQLite setup, schema, seed
  │   ├── routes/
  │   │   ├── auth.js          Login / Register
  │   │   ├── projects.js      Projects + members CRUD
  │   │   ├── tasks.js         Tasks + comments CRUD
  │   │   └── users.js         User management
  │   ├── server.js            Express entry point
  │   └── package.json
  └── frontend/
      ├── src/
      │   ├── components/
      │   │   └── Layout.jsx   Sidebar + nav shell
      │   ├── context/
      │   │   ├── AuthContext.jsx
      │   │   └── ToastContext.jsx
      │   ├── pages/
      │   │   ├── Login.jsx
      │   │   ├── Register.jsx
      │   │   ├── Dashboard.jsx
      │   │   ├── Projects.jsx
      │   │   └── ProjectDetail.jsx  Kanban board + members
      │   ├── api.js           Axios instance with auth headers
      │   ├── App.jsx          Routes
      │   ├── main.jsx
      │   └── index.css        Global dark theme styles
      ├── index.html
      ├── vite.config.js
      └── package.json


GETTING STARTED
---------------

1. Install dependencies

   Backend:
     cd taskflow/backend
     npm install

   Frontend:
     cd taskflow/frontend
     npm install

2. Start the backend (port 5000)

     cd taskflow/backend
     node server.js

3. Start the frontend (port 5173)

     cd taskflow/frontend
     npm run dev

4. Open in browser
     http://localhost:5173


DEFAULT ADMIN ACCOUNT
---------------------
  Email    : admin@taskflow.dev
  Password : admin123

  (Created automatically on first run)


API ENDPOINTS
-------------
  Auth
    POST   /api/auth/register
    POST   /api/auth/login

  Projects
    GET    /api/projects
    POST   /api/projects
    GET    /api/projects/:id
    PUT    /api/projects/:id
    DELETE /api/projects/:id
    POST   /api/projects/:id/members
    DELETE /api/projects/:id/members/:userId

  Tasks
    GET    /api/tasks
    POST   /api/tasks
    GET    /api/tasks/project/:projectId
    GET    /api/tasks/dashboard
    PUT    /api/tasks/:id
    DELETE /api/tasks/:id
    GET    /api/tasks/:id/comments
    POST   /api/tasks/:id/comments

  Users
    GET    /api/users
    PUT    /api/users/me
    PUT    /api/users/:id/role   (admin only)


FEATURES
--------
  - JWT-based authentication
  - Role-based access (admin / member)
  - Project creation with deadline tracking
  - Kanban board with 4 columns: Todo, In Progress, Review, Done
  - Task priority levels: Low, Medium, High, Urgent
  - Task assignment to project members
  - Member management per project
  - Dashboard with stats and recent tasks
  - Overdue task highlighting
  - Toast notifications
  - SQLite database (auto-created at backend/data/taskflow.db)


NOTES
-----
  - The SQLite database file is created automatically at
    taskflow/backend/data/taskflow.db on first run.
  - The frontend proxies /api requests to localhost:5000
    via Vite's dev server config.
  - For production, build the frontend (npm run build) and
    the backend will serve the dist folder statically.

================================================================
