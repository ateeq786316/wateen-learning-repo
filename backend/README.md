# Node.js Backend — Excel Import/Export API

Enterprise-grade Node.js backend for importing, validating, processing, and exporting Excel (.xlsx) files with PostgreSQL.

---

## Tech Stack

- **Runtime:** Node.js 22
- **Framework:** Express 5
- **Database:** PostgreSQL (via `pg`)
- **Caching / Queue:** Redis (Bull)
- **Excel:** ExcelJS / SheetJS
- **Logging:** Winston
- **Testing:** Jest + Supertest

---

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment file
cp .env .env

# Start dev server (nodemon)
npm run dev

# Start production
npm start
```

---

## Project Structure

```
backend/
├── src/
│   ├── server.js          # Entry point — starts the server
│   ├── app.js             # Express app setup (middleware, routes)
│   ├── config/            # Environment & app configuration
│   ├── routes/            # API route definitions
│   ├── controllers/       # Request handlers
│   ├── services/          # Business logic
│   ├── middleware/        # Custom middleware (auth, validation, error)
│   ├── utils/             # Helper functions
│   └── models/            # Data models / schemas
├── uploads/               # Uploaded Excel files (gitignored)
├── exports/               # Generated export files (gitignored)
├── .env                   # Environment variables
├── .gitignore
└── package.json
```

---

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `npm run dev` | `nodemon src/server.js` | Dev server with auto-reload |
| `npm start` | `node src/server.js` | Production start |
| `npm test` | `jest` | Run tests |

---

## API Endpoints

*(To be documented with Swagger)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/imports/upload` | Upload Excel file for import |
| GET | `/api/imports/:id/status` | Check import job status |
| GET | `/api/imports/:id/report` | Get import validation report |
| POST | `/api/exports` | Generate Excel export |
| GET | `/api/exports/:id` | Download exported file |
| GET | `/health` | Health check |

---

## Roadmap

See [ROADMAP.md](../ROADMAP.md) for the full 14-topic mastery plan covering:

1. Core Node.js (CLI tools, streams, event loop)
2. HTTP & API Layer (Express, middleware, routing)
3. Project Structure & Dependencies
4. Error Handling (custom errors, global handler)
5. Logging (Winston, correlation IDs)
6. Excel Parsing Engine (streaming, validation)
7. Database (PostgreSQL, bulk ops, transactions)
8. Background Job Processing (Bull queue)
9. Caching (Redis)
10. Excel Export (styling, multi-sheet)
11. Data Integrity & Rollback
12. Security (rate limiting, helmet, CORS)
13. Docker & Deployment
14. Testing & Documentation
