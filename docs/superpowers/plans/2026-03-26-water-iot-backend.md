# Water IoT Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready FastAPI service that validates, stores, and queries IoT water measurements in an existing PostgreSQL database.

**Architecture:** Use a synchronous FastAPI application with request-scoped SQLAlchemy 2.x sessions and psycopg 3. Keep HTTP, service, repository, schema, and ORM responsibilities separate while avoiding speculative infrastructure. Compute water status in one service function and create missing tables during the FastAPI lifespan.

**Tech Stack:** Python 3.12+, FastAPI, Uvicorn, SQLAlchemy 2.x, PostgreSQL, psycopg 3, Pydantic v2, pydantic-settings, pytest, Docker.

**Spec:** `docs/superpowers/specs/2026-03-26-water-iot-backend-design.md`

## Global Constraints

- PostgreSQL already exists and must not be provisioned by this project.
- Use `DATABASE_URL=postgresql+psycopg://...`; never log its value.
- Use `Base.metadata.create_all(bind=engine)` only to create missing schema objects.
- Use the root package `app/` and run `uvicorn app.main:app --host 0.0.0.0 --port 8000`.
- Keep collectors isolated from PostgreSQL; they communicate only by HTTP(S).
- Do not add authentication, WebSockets, queues, caches, or microservices.

## Review Focus

- A whitespace-only `node_id` must return `422`, not create a row.
- Exact status thresholds (`8`, `5`, `5.5`, `6.5`, `8.5`, `9.5`) must use the specified strict comparisons.
- Equal timestamps must still produce deterministic newest-first results using `id DESC`.
- `from_date > to_date` must return `422` instead of an empty, misleading result.
- A database outage must return a generic `503` and must not disclose connection details.

---

### Task 1: Project configuration, schemas, and ORM model

**Files:**
- Modify: `pyproject.toml`
- Modify: `.gitignore`
- Delete: `src/iot_water/main.py`
- Create: `app/__init__.py`
- Create: `app/core/__init__.py`
- Create: `app/core/config.py`
- Create: `app/core/database.py`
- Create: `app/models/__init__.py`
- Create: `app/models/measurement.py`
- Create: `app/schemas/__init__.py`
- Create: `app/schemas/measurement.py`
- Create: `tests/conftest.py`
- Create: `tests/test_schema_and_model.py`

**Interfaces:**
- Produces: `Settings`, `settings`, `Base`, `engine`, `SessionLocal`, `get_db()`, `Measurement`, `MeasurementCreate`, `MeasurementResponse`, and `WaterStatus`.

- [ ] **Step 1: Write failing schema and metadata tests**

Test valid and invalid measurement boundaries, whitespace-only node IDs, CORS comma parsing, database-generated `created_at`, and the three required table indexes.

- [ ] **Step 2: Run tests and verify RED**

Run: `pytest tests/test_schema_and_model.py -v`
Expected: FAIL because the `app` modules do not exist.

- [ ] **Step 3: Implement the minimum configuration, database, model, and schema code**

Use `SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')`, a comma-separated CORS validator, SQLAlchemy `DeclarativeBase`, `create_engine(..., pool_pre_ping=True)`, and typed `Mapped` columns. Use a SQLite integer type variant only so isolated tests can exercise bigint autoincrement behavior.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `pytest tests/test_schema_and_model.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pyproject.toml .gitignore app tests src/iot_water/main.py
git commit -m "feat: define water measurement model and validation"
```

### Task 2: Repository and service behavior

**Files:**
- Create: `app/repositories/__init__.py`
- Create: `app/repositories/measurement_repository.py`
- Create: `app/services/__init__.py`
- Create: `app/services/measurement_service.py`
- Create: `tests/test_measurement_service.py`

**Interfaces:**
- Consumes: `Measurement`, `MeasurementCreate`, `MeasurementResponse`, `WaterStatus`, and SQLAlchemy `Session`.
- Produces: `calculate_water_status(ph: float, turbidity: float) -> WaterStatus`, `to_response(measurement: Measurement) -> MeasurementResponse`, `create_measurement(db: Session, data: MeasurementCreate) -> Measurement`, `list_measurements(...) -> list[Measurement]`, `get_latest_measurement(...) -> Measurement | None`, `get_measurement(db: Session, measurement_id: int) -> Measurement | None`, and `list_node_ids(db: Session) -> list[str]`.

- [ ] **Step 1: Write failing status and repository tests**

Cover every threshold boundary and critical-over-warning priority. Against temporary SQLite metadata, cover create/refresh, filters, deterministic descending order, latest by node, lookup by ID, distinct sorted nodes, commit, and rollback after a forced database error.

- [ ] **Step 2: Run tests and verify RED**

Run: `pytest tests/test_measurement_service.py -v`
Expected: FAIL because repository and service modules do not exist.

- [ ] **Step 3: Implement SQLAlchemy 2.x queries and status conversion**

Use `select()`, `.scalars()`, `distinct()`, explicit optional filters, `created_at.desc()`, and `id.desc()`. Keep transaction commit/rollback in the create service and all query construction in the repository.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `pytest tests/test_measurement_service.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/repositories app/services tests/test_measurement_service.py
git commit -m "feat: persist and classify water measurements"
```

### Task 3: HTTP API and database error responses

**Files:**
- Create: `app/api/__init__.py`
- Create: `app/api/routes/__init__.py`
- Create: `app/api/routes/health.py`
- Create: `app/api/routes/measurements.py`
- Create: `app/main.py`
- Create: `tests/test_api.py`

**Interfaces:**
- Consumes: Task 1's session dependency and schemas and Task 2's service functions.
- Produces: FastAPI `app` with `/health`, `/api/measurements`, `/api/measurements/latest`, `/api/measurements/{id}`, and `/api/nodes`.

- [ ] **Step 1: Write failing API tests**

Override `get_db` with the temporary database. Assert POST `201` and computed status; list pagination/filtering; latest globally and by node; detail and latest `404`; distinct nodes; invalid date range `422`; health `200`; SQLAlchemy failure `503` with no database URL in the body.

- [ ] **Step 2: Run tests and verify RED**

Run: `pytest tests/test_api.py -v`
Expected: FAIL because routers and `app.main` do not exist.

- [ ] **Step 3: Implement routes and application lifespan**

Declare `/latest` before `/{measurement_id}`. Use `Query` bounds for limit and offset, UTC-aware datetimes, `SELECT 1` for health, `CORSMiddleware`, a SQLAlchemy exception handler returning generic `503`, and an `@asynccontextmanager` lifespan that checks connectivity then calls `Base.metadata.create_all(bind=engine)`.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `pytest tests/test_api.py -v`
Expected: PASS.

- [ ] **Step 5: Run the complete suite**

Run: `pytest -v`
Expected: all tests PASS without warnings.

- [ ] **Step 6: Commit**

```bash
git add app/api app/main.py tests/test_api.py
git commit -m "feat: expose water measurement API"
```

### Task 4: Container and operating documentation

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`
- Create: `.env.example`
- Modify: `README.md`
- Modify: `uv.lock`

**Interfaces:**
- Consumes: `app.main:app` and settings from Tasks 1–3.
- Produces: reproducible local and Docker startup instructions and a non-root production image.

- [ ] **Step 1: Write deployment smoke checks**

Define checks for dependency locking, importing `app.main`, Dockerfile non-root execution, required example environment keys, documented curl commands, and absence of committed secrets.

- [ ] **Step 2: Run checks and verify RED**

Run: `uv lock && uv run python -c "import app.main" && docker build -t water-iot-api .`
Expected: FAIL until deployment files and final dependency metadata exist.

- [ ] **Step 3: Implement deployment files and README**

Use `python:3.12-slim`, install the project dependencies, create a non-root application user, expose 8000, and add a Python standard-library HTTP healthcheck. Document virtualenv setup, `.env`, local execution, `/docs`, curl examples, Docker, VPS deployment, CORS production restrictions, automatic table creation, and future Alembic use.

- [ ] **Step 4: Verify package, tests, and container**

Run:

```bash
uv lock
uv sync --extra dev
uv run pytest -v
uv run python -c "from app.main import app; assert app.title"
docker build -t water-iot-api .
```

Expected: every command succeeds.

- [ ] **Step 5: Commit**

```bash
git add Dockerfile .dockerignore .env.example README.md pyproject.toml uv.lock
git commit -m "docs: add Docker and deployment guide"
```
