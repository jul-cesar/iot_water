# Water IoT Backend Design

## Objective

Build a maintainable FastAPI backend that receives measurements from Python collectors, validates them, stores them in an existing PostgreSQL database, and exposes query endpoints for future dashboards and additional IoT nodes.

## Scope

Included:

- FastAPI application using Python 3.12 or newer.
- PostgreSQL persistence with SQLAlchemy 2.x and psycopg 3.
- Environment configuration with pydantic-settings and `.env`.
- Automatic table and index creation with `metadata.create_all()`.
- Health, ingestion, listing, latest, detail, and node-list endpoints.
- Computed water quality status in API responses.
- Docker image running as a non-root user.
- Tests and operational documentation.

Excluded:

- PostgreSQL container provisioning.
- Authentication, WebSockets, alerts, statistics, Redis, Kafka, and RabbitMQ.
- Alembic migrations in this initial version.
- Direct database access from collectors.

## Architecture

The application uses a root `app/` package:

- `app/core`: settings, SQLAlchemy engine, declarative base, and request-scoped sessions.
- `app/models`: ORM entities and database indexes.
- `app/schemas`: Pydantic request and response models.
- `app/repositories`: SQLAlchemy persistence and query operations.
- `app/services`: transaction coordination and reusable water-status calculation.
- `app/api/routes`: HTTP endpoints.
- `app/main.py`: application factory concerns, lifespan, CORS, routers, and database error handling.

The implementation is synchronous. This matches psycopg 3's synchronous SQLAlchemy driver and avoids unnecessary async database complexity for the expected academic IoT workload.

## Data Model

Table: `measurements`

| Column | Type | Rules |
| --- | --- | --- |
| `id` | BIGINT | Primary key, autoincrement |
| `node_id` | VARCHAR(100) | Required |
| `temperature` | DOUBLE PRECISION | Required |
| `ph` | DOUBLE PRECISION | Required |
| `turbidity` | DOUBLE PRECISION | Required |
| `tds` | DOUBLE PRECISION | Required |
| `level` | DOUBLE PRECISION | Required |
| `created_at` | TIMESTAMPTZ | Required, database default `NOW()` |

Indexes:

- `node_id`
- `created_at`
- `(node_id, created_at)`

`water_status` is computed for responses and is not stored.

## Validation

- `node_id`: stripped, non-empty, maximum 100 characters.
- `temperature`: -50 through 100 inclusive.
- `ph`: 0 through 14 inclusive.
- `turbidity`: zero or greater.
- `tds`: zero or greater.
- `level`: zero or greater.

Values that indicate unsafe water remain valid measurements.

## Water Status

A single reusable service function applies the rules in priority order:

1. `CRITICAL` when turbidity is greater than 8, pH is below 5.5, or pH is above 9.5.
2. `WARNING` when turbidity is greater than 5, pH is below 6.5, or pH is above 8.5.
3. `OPTIMAL` otherwise.

## API

### `GET /health`

Executes `SELECT 1` against PostgreSQL. Returns `200` with `{"status": "ok"}` when healthy, or `503` with a generic database-unavailable detail when the check fails.

### `POST /api/measurements`

Validates and stores one measurement. PostgreSQL assigns `id` and `created_at`. Returns the stored measurement with `water_status` and status `201`.

### `GET /api/measurements`

Supports `node_id`, `from_date`, `to_date`, `limit`, and `offset`. The default limit is 100 and maximum is 1000. Results are ordered by `created_at DESC, id DESC`. A date range where `from_date` is later than `to_date` returns `422`.

### `GET /api/measurements/latest`

Returns the latest measurement globally or for an optional `node_id`. Returns `404` when no matching measurement exists.

### `GET /api/measurements/{id}`

Returns one measurement or `404`.

### `GET /api/nodes`

Returns distinct node IDs in ascending order.

## Database Lifecycle

The FastAPI lifespan handler verifies connectivity and calls `Base.metadata.create_all(bind=engine)` before accepting requests. Existing tables are not dropped or recreated. Startup fails with a clear, credential-free log message if PostgreSQL is unavailable.

`create_all()` is appropriate for the first schema because it creates missing objects without destructive migrations. Future schema changes must use Alembic because `create_all()` does not alter existing tables safely.

Each request receives one SQLAlchemy `Session` dependency. Write failures trigger rollback. Sessions are always closed.

## Error Handling and Logging

- Missing resources use `HTTPException(404)`.
- Invalid input and query parameters use FastAPI/Pydantic validation responses.
- SQLAlchemy failures are logged internally without logging `DATABASE_URL`.
- Database operation failures return a generic `503` response.
- Startup database failures terminate startup rather than running a nonfunctional API.

## Configuration and Security

Required environment setting:

- `DATABASE_URL`

Optional settings with defaults:

- `APP_NAME=Water IoT API`
- `APP_ENV=development`
- `API_PREFIX=/api`
- `CORS_ORIGINS=*`

CORS origins are parsed as a comma-separated list. Wildcard CORS is suitable only for development; production deployments must specify dashboard domains.

Credentials are never committed, returned by endpoints, or written to logs.

## Docker and Deployment

The Docker image uses a Python 3.12 slim base, installs project dependencies, copies the application, switches to a non-root user, exposes port 8000, and runs:

```text
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The container receives configuration through an env file or environment variables. It does not run PostgreSQL.

## Testing

Tests cover:

- Request validation boundaries.
- Water-status thresholds and priority.
- API behavior with dependency-overridden test sessions.
- Pagination, filters, latest lookup, node listing, and 404 responses.

Tests use SQLite only as an isolated application test database; production remains PostgreSQL-only.

## Data Flow

```text
Arduino + sensors
        ↓
      XBee
        ↓
Python collector on Mac
        ↓ POST HTTPS
FastAPI on VPS
        ↓
Existing PostgreSQL
        ↓
Future dashboard
```

Collectors communicate only with FastAPI and never connect directly to PostgreSQL.
