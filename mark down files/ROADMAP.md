# Node.js Mastery Roadmap

> Enterprise Excel Import/Export with PostgreSQL — Practical Coding Tasks

---

## Today's Update — Jul 15, 2026

**Topics Covered:**
- Project init & Express server setup
- Middleware stack (helmet, cors, morgan, json parser, error handler)
- MVC folder structure (routes, controllers, services, middleware, config)
- File upload with multer (disk storage, UUID rename, type/size filter)
- REST endpoints (POST upload, GET list files)
- Config centralization
- API testing via Postman

**Blockers Encountered:**
- `app.use(express())` was invalid — should be `express.json()`
- `app.js` was empty causing `require('./app')` to fail
- Swagger was added then removed on request

---

## 1. Core Node.js Runtime

**Coding Task:** Build a CLI tool that reads a large CSV file using streams, processes it in chunks, and writes output to a new file.

**What you'll do:**
- Set up a Node.js project from scratch
- Use `fs.createReadStream` / `fs.createWriteStream` with piping
- Use `process.argv` and `process.exit`
- Handle `uncaughtException` and `unhandledRejection`
- Use `path` module for file path handling

**Blockers:** Understanding stream backpressure, event loop blocking with sync code, buffer overflow on large files.

---

## 2. HTTP & API Layer

**Coding Task:** Create a REST API with Express that handles file upload and serves Excel reports.

**What you'll do:**
- Set up Express with routes, middleware, error handling
- Implement file upload endpoint using `multer`
- Serve static files (exported Excel files)
- Add CORS, helmet, morgan middleware
- Test with Postman/curl

**Blockers:** Middleware ordering, forgetting `express.json()`, CORS errors, `next()` not called in middleware.

---

## 3. Project Structure & Dependencies

**Coding Task:** Structure the backend project with proper folder separation (routes, controllers, services, utils, config, middleware).

**What you'll do:**
- Organize code into feature-based modules
- Set up `config/` for environment variables
- Create utility functions in `utils/`
- Add npm scripts for dev, start, lint
- Install and configure ESLint + Prettier

**Blockers:** Circular imports, wrong require paths, not separating concerns, messy package.json scripts.

---

## 4. Error Handling

**Coding Task:** Implement a global error handler with custom error classes and proper HTTP error responses.

**What you'll do:**
- Create custom `AppError` class extending `Error`
- Build Express error-handling middleware
- Handle async errors without try/catch everywhere
- Catch unhandled rejections globally
- Return consistent JSON error responses

**Blockers:** Errors swallowed in async routes, not catching promise rejections, error middleware placed before routes.

---

## 5. Logging

**Coding Task:** Set up structured logging with Winston — log to console (dev) and file (production) with request correlation IDs.

**What you'll do:**
- Configure Winston with console + file transports
- Add morgan HTTP request logging piped to Winston
- Generate UUID per request via middleware
- Store request context using `AsyncLocalStorage`
- Mask sensitive data (passwords, tokens) in logs

**Blockers:** Sync I/O slowing event loop, logging raw request bodies with passwords, log rotation not configured.

---

## 6. Excel Parsing Engine

**Coding Task:** Build an Excel parser service that reads `.xlsx` files, validates columns, and outputs JSON.

**What you'll do:**
- Use `ExcelJS` to read an uploaded Excel file
- Stream large files instead of loading entirely in memory
- Map Excel columns to expected fields
- Validate data types, required fields, and formats
- Generate a validation report (success/error rows)
- Handle multiple sheets

**Blockers:** Memory crash on large files, wrong cell value types, encoding issues, formula cells returning raw formulas.

---

## 7. Database (PostgreSQL)

**Coding Task:** Set up PostgreSQL with connection pooling and implement bulk insert + upsert for imported Excel data.

**What you'll do:**
- Install `pg` and configure connection pool
- Create tables with proper indexes
- Implement bulk `INSERT` with batch chunking
- Implement `ON CONFLICT` upsert logic
- Use transactions for atomic imports
- Run `EXPLAIN ANALYZE` to optimize queries

**Blockers:** Pool exhaustion, deadlocks on concurrent writes, batch too large causing timeout, N+1 queries.

---

## 8. Background Job Processing

**Coding Task:** Offload Excel import processing to a Bull queue with progress tracking and retry logic.

**What you'll do:**
- Set up Redis + Bull queue
- Create a job producer (submit import task)
- Create a worker (process import in background)
- Report progress (row count, percentage)
- Add retry with exponential backoff
- Handle failed jobs with dead letter queue

**Blockers:** Redis connection lost, jobs not retried, memory not freed after job completes, no progress feedback to frontend.

---

## 9. Caching

**Coding Task:** Cache Excel templates and frequent query results in Redis to reduce DB load and speed up exports.

**What you'll do:**
- Connect Redis with `ioredis`
- Cache Excel template metadata
- Cache frequently accessed data (dropdown options, reference data)
- Set TTL and handle cache invalidation
- Implement cache-aside pattern in services

**Blockers:** Stale data served after updates, cache miss storm on TTL expiry, Redis memory full.

---

## 10. Excel Export

**Coding Task:** Generate formatted Excel export files with styling, formulas, and multiple sheets from database data.

**What you'll do:**
- Create workbook with styled headers and auto-sized columns
- Add formulas (SUM, AVERAGE) to footer rows
- Generate multi-sheet exports by category
- Stream export directly to HTTP response (no temp file)
- Support `.xlsx` and `.csv` formats
- Schedule automated exports with `node-cron`

**Blockers:** Memory spike on 100K+ rows, formula cells not calculating, styling too complex causing corrupt files.

---

## 11. Data Integrity & Rollback

**Coding Task:** Implement duplicate detection, dry-run mode, and rollback for failed imports.

**What you'll do:**
- Detect duplicate rows before inserting (by key columns)
- Offer skip/overwrite/reject options for duplicates
- Implement dry-run endpoint (validate without saving)
- Use savepoints for partial rollback on error
- Generate reconciliation report (what was inserted vs rejected)
- Build import summary endpoint

**Blockers:** Fuzzy matching slow on huge datasets, partial import corruption without savepoints, dry-run mismatch with actual insert behavior.

---

## 12. Security

**Coding Task:** Secure the API with rate limiting, file validation, CORS config, and security headers.

**What you'll do:**
- Validate uploaded file type (magic numbers, not just extension)
- Set file size limits in multer
- Add `express-rate-limit` to import/export endpoints
- Configure Helmet.js for security headers
- Restrict CORS to allowed origins only
- Sanitize inputs and prevent formula injection in Excel

**Blockers:** MIME spoofing bypasses extension check, rate limiting not applied to expensive endpoints, missing CSP headers.

---

## 13. Docker & Deployment

**Coding Task:** Dockerize the app with multi-stage build, docker-compose for dev environment, and production-ready health checks.

**What you'll do:**
- Write Dockerfile with multi-stage build (under 300MB)
- Write docker-compose.yml (app + postgres + redis)
- Add `/health` / `/ready` endpoints
- Use PM2 for process management in container
- Move config to environment variables

**Blockers:** Image too large, env vars not passed to container, health check doesn't verify DB connectivity, no rollback strategy.

---

## 14. Testing & Documentation

**Coding Task:** Write unit tests, integration tests, API docs, and load test the import/export endpoints.

**What you'll do:**
- Unit test services with Jest (mock DB/external calls)
- Integration test with supertest (test full endpoints)
- Write E2E test for import → process → export flow
- Generate Swagger/OpenAPI docs for all endpoints
- Run load test with Artillery (100 concurrent uploads)
- Add JSDoc comments to all functions

**Blockers:** Tests depend on real DB without mock, flaky tests from shared state, load test unrealistic vs production, docs outdated.
