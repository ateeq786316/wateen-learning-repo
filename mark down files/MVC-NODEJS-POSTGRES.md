# MVC Architecture in Node.js with PostgreSQL

## Table of Contents
1. [What is MVC?](#1-what-is-mvc)
2. [Project Structure](#2-project-structure)
3. [Setup](#3-setup)
4. [Model Layer](#4-model-layer)
5. [Controller Layer](#5-controller-layer)
6. [Routes Layer](#6-routes-layer)
7. [Service Layer (Optional)](#7-service-layer-optional)
8. [View Layer (API Response)](#8-view-layer-api-response)
9. [Putting It All Together](#9-putting-it-all-together)
10. [Error Handling Middleware](#10-error-handling-middleware)
11. [Testing with curl](#11-testing-with-curl)

---

## 1. What is MVC?

**MVC** stands for **Model-View-Controller**, a design pattern that separates application logic into three interconnected layers:

| Layer | Responsibility |
|-------|---------------|
| **Model** | Data logic — interacts with database, defines schemas |
| **View** | Presentation — renders data (HTML, JSON response) |
| **Controller** | Business logic — handles request/response, calls Model & View |

```
Browser  ──▶  Routes  ──▶  Controller  ──▶  Model  ──▶  Database
   ▲                          │
   │                          ▼
   └────────────────────   View (JSON/HTML)
```

---

## 2. Project Structure

```
project/
├── src/
│   ├── config/          # DB config, env vars
│   │   └── db.js
│   ├── models/          # Database queries / ORM models
│   │   └── userModel.js
│   ├── controllers/     # Request handlers
│   │   └── userController.js
│   ├── routes/          # Express route definitions
│   │   └── userRoutes.js
│   ├── middleware/      # Custom middleware
│   │   ├── errorHandler.js
│   │   └── validate.js
│   ├── services/        # Business logic (optional)
│   │   └── userService.js
│   ├── utils/           # Helpers
│   │   └── logger.js
│   ├── app.js           # Express app setup
│   └── server.js        # Entry point
├── package.json
└── .env
```

---

## 3. Setup

### 3.1 Initialize project

```bash
mkdir mvc-app && cd mvc-app
npm init -y
npm install express pg dotenv cors
npm install --save-dev nodemon
```

### 3.2 `.env`

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=mvc_demo
```

### 3.3 `package.json` scripts

```json
"scripts": {
  "start": "node src/server.js",
  "dev": "nodemon src/server.js"
}
```

---

## 4. Model Layer

The **Model** handles all database interactions. It knows nothing about HTTP requests or responses.

### 4.1 Database config — `src/config/db.js`

```js
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
```

### 4.2 Model — `src/models/userModel.js`

```js
const db = require('../config/db');

const UserModel = {
  async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        age INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    return db.query(query);
  },

  async findAll() {
    const result = await db.query('SELECT * FROM users ORDER BY id ASC');
    return result.rows;
  },

  async findById(id) {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findByEmail(email) {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  },

  async create({ name, email, age }) {
    const result = await db.query(
      `INSERT INTO users (name, email, age)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, email, age]
    );
    return result.rows[0];
  },

  async update(id, { name, email, age }) {
    const result = await db.query(
      `UPDATE users
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           age = COALESCE($3, age),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [name, email, age, id]
    );
    return result.rows[0] || null;
  },

  async delete(id) {
    const result = await db.query(
      'DELETE FROM users WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0] || null;
  },
};

module.exports = UserModel;
```

**Key points:**
- Uses parameterized queries (`$1`, `$2`) to prevent SQL injection
- Each method returns clean data (not the raw pg result)
- Model has **no `req` or `res`** — pure data layer

---

## 5. Controller Layer

The **Controller** receives `req` and `res`, validates input, calls the Model, and sends the response.

### `src/controllers/userController.js`

```js
const UserModel = require('../models/userModel');

const UserController = {
  // GET /api/users
  async getAll(req, res, next) {
    try {
      const users = await UserModel.findAll();
      res.json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/users/:id
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const user = await UserModel.findById(id);

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/users
  async create(req, res, next) {
    try {
      const { name, email, age } = req.body;

      if (!name || !email) {
        return res.status(400).json({ success: false, message: 'Name and email are required' });
      }

      const existing = await UserModel.findByEmail(email);
      if (existing) {
        return res.status(409).json({ success: false, message: 'Email already exists' });
      }

      const user = await UserModel.create({ name, email, age });
      res.status(201).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/users/:id
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { name, email, age } = req.body;

      const user = await UserModel.update(id, { name, email, age });

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/users/:id
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const user = await UserModel.delete(id);

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = UserController;
```

**Key points:**
- Wraps async logic in `try/catch` and forwards errors via `next(err)`
- Handles request validation (missing fields, duplicates)
- Returns appropriate HTTP status codes (`201`, `400`, `404`, `409`, `500`)
- **Never** directly touches the database — delegates to Model

---

## 6. Routes Layer

Routes map HTTP methods + paths to controller methods.

### `src/routes/userRoutes.js`

```js
const { Router } = require('express');
const UserController = require('../controllers/userController');

const router = Router();

router.get('/', UserController.getAll);
router.get('/:id', UserController.getById);
router.post('/', UserController.create);
router.put('/:id', UserController.update);
router.delete('/:id', UserController.delete);

module.exports = router;
```

### `src/routes/index.js`

```js
const { Router } = require('express');
const userRoutes = require('./userRoutes');

const router = Router();

router.use('/users', userRoutes);

module.exports = router;
```

---

## 7. Service Layer (Optional)

When controllers become fat with business logic, extract it into **services**. Services sit between Controllers and Models.

### `src/services/userService.js`

```js
const UserModel = require('../models/userModel');

const UserService = {
  async register({ name, email, age }) {
    const existing = await UserModel.findByEmail(email);
    if (existing) {
      throw Object.assign(new Error('Email already exists'), { statusCode: 409 });
    }

    if (!name || !email) {
      throw Object.assign(new Error('Name and email are required'), { statusCode: 400 });
    }

    return UserModel.create({ name, email, age });
  },

  async list() {
    return UserModel.findAll();
  },
};

module.exports = UserService;
```

Then the controller becomes thinner:

```js
const UserService = require('../services/userService');

async create(req, res, next) {
  try {
    const user = await UserService.register(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}
```

---

## 8. View Layer (API Response)

In a REST API, the **View** is the JSON response. A consistent response format:

### `src/utils/response.js`

```js
const success = (res, data, statusCode = 200) => {
  res.status(statusCode).json({ success: true, data });
};

const error = (res, message, statusCode = 500) => {
  res.status(statusCode).json({ success: false, message });
};

module.exports = { success, error };
```

---

## 9. Putting It All Together

### `src/app.js`

```js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const UserModel = require('./models/userModel');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

app.use(errorHandler);

module.exports = app;
```

### `src/server.js`

```js
const app = require('./app');
const UserModel = require('./models/userModel');
const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await UserModel.createTable();
    console.log('Database tables ready');

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
 }
})();
```

---

## 10. Error Handling Middleware

### `src/middleware/errorHandler.js`

```js
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);

  const statusCode = err.statusCode || 500;
  const message = err.statusCode ? err.message : 'Internal Server Error';

  res.status(statusCode).json({ success: false, message });
};

module.exports = errorHandler;
```

---

## 11. Testing with curl

```bash
# Create user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","age":30}'

# Get all users
curl http://localhost:3000/api/users

# Get user by ID
curl http://localhost:3000/api/users/1

# Update user
curl -X PUT http://localhost:3000/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe"}'

# Delete user
curl -X DELETE http://localhost:3000/api/users/1
```

---

## Summary

```
HTTP Request
    │
    ▼
┌──────────┐     ┌──────────────┐     ┌──────────┐     ┌──────────┐
│  Routes   │────▶│  Controller  │────▶│  Service  │────▶│  Model   │────▶  DB
│ (url map) │     │ (req/res)    │     │ (logic)   │     │ (queries)│
└──────────┘     └──────────────┘     └──────────┘     └──────────┘
                        │
                        ▼
                   JSON Response (View)
```

**Golden Rule:** Each layer has one job. Never let SQL queries leak into controllers. Never put `req`/`res` in models.
