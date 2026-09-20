# SMS Backend (Express + PostgreSQL)

Production-ready REST API that matches the current frontend client expectations and routes.

## Stack
- Node.js (ESM), Express 4
- PostgreSQL (pg)
- JWT auth (access + refresh)
- express-validator for validation
- Clean modular structure (routes, controllers, services, middleware)

## Quick Start

1) Copy environment template

```
cp .env.example .env
```

2) Adjust `.env` values as needed (database URL, JWT secrets, CORS origins, port).

3) Install dependencies

```
npm install
```

4) Run migrations and seed demo data

```
npm run migrate
npm run seed
```

5) Start dev server

```
npm run dev
```

The API will listen on http://localhost:5000 by default.

Frontend .env (Vite):

```
VITE_API_URL=http://localhost:5000
VITE_TOKEN_STORAGE=local
VITE_REQUEST_TIMEOUT_MS=15000
VITE_ENABLE_DEMO_AUTH=false
```

## Folder Structure

```
src/
  app.js                 # Express app wiring
  server.js              # HTTP server
  config/
    env.js               # dotenv loader
    db.js                # pg pool
  controllers/           # Thin controllers call services
    auth.controller.js
    students.controller.js
    teachers.controller.js
    assignments.controller.js
  services/              # DB queries and business logic
    auth.service.js
    students.service.js
    teachers.service.js
    assignments.service.js
  routes/
    index.js             # Mounts all route modules
    auth.routes.js
    students.routes.js
    teachers.routes.js
    assignments.routes.js
  middleware/
    auth.js              # authenticate + authorize
    error.js             # 404 + error handler
    validate.js          # express-validator result handler
  utils/
    jwt.js               # sign/verify tokens
  db/
    schema.sql           # database schema
    migrate.js           # run schema
    seed.js              # demo data seed
```

## API Contract (high level)

Auth
- POST /auth/login { email, password } -> { token, refreshToken, user }
- POST /auth/logout (auth)
- POST /auth/refresh { refreshToken } -> { token, refreshToken, user }
- GET  /auth/profile (auth) -> { user }

Students (auth)
- GET    /students?{page,pageSize,q,class,section} -> { rows, total, page, pageSize }
- GET    /students/:id -> Student
- POST   /students (admin)
- PUT    /students/:id (admin)
- DELETE /students/:id (admin)

Teachers (auth)
- GET    /teachers?{page,pageSize,q} -> { rows, total, page, pageSize }
- GET    /teachers/:id -> Teacher
- GET    /teachers/:id/schedule -> Schedule[]
- POST   /teachers (admin)
- PUT    /teachers/:id (admin)
- DELETE /teachers/:id (admin)

Assignments (auth)
- GET    /assignments?{page,pageSize,q} -> { rows, total, page, pageSize }
- GET    /assignments/:id -> Assignment
- POST   /assignments (admin|teacher)
- PUT    /assignments/:id (admin|teacher)
- DELETE /assignments/:id (admin|teacher)
- POST   /assignments/:id/submit (student)

All non-auth routes require `Authorization: Bearer <token>`.

## Notes
- Response shapes alias DB columns to match frontend naming (e.g., rollNumber, rfidTag, feeStatus).
- 401 triggers frontend global unauthorized handler.
- Seed includes demo users: admin@, teacher@, student@, driver@ (password: password123).
