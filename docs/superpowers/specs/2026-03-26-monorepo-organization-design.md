# Water IoT Monorepo Organization Design

## Objective

Reorganize the repository into two independently deployable applications before dashboard development begins, without changing backend behavior or adding frontend features.

## Current State

- The FastAPI backend lives at the repository root.
- The React application is untracked and nested at `dashboard/iot-water-dashboard/`.
- Backend deployment files assume the repository root is the application root.
- Backend and dashboard will be deployed as separate Dokploy applications.

## Target Structure

```text
/
├── backend/
│   ├── app/
│   ├── tests/
│   ├── Dockerfile
│   ├── nixpacks.toml
│   ├── pyproject.toml
│   ├── uv.lock
│   ├── .python-version
│   ├── .env.example
│   ├── .dockerignore
│   └── README.md
├── dashboard/
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.ts
│   └── remaining React configuration
├── docs/
│   └── superpowers/
├── .gitignore
└── README.md
```

The extra `dashboard/iot-water-dashboard/` layer is removed. No `apps/` layer, npm workspace, Turborepo, task runner, or shared package is introduced.

## Backend Migration

Move these tracked backend artifacts into `backend/`:

- `app/`
- `tests/`
- `Dockerfile`
- `nixpacks.toml`
- `pyproject.toml`
- `uv.lock`
- `.python-version`
- `.env.example`
- `.dockerignore`
- the existing backend-focused `README.md`

Internal Python imports remain unchanged because `app/` stays at the backend application root. Docker and Nixpacks commands also remain unchanged when Dokploy uses `backend/` as its base directory.

The backend deployment must continue to include `uv.lock` in the Nixpacks build context.

## Dashboard Migration

Move the contents of `dashboard/iot-water-dashboard/` directly into `dashboard/`. Preserve the existing React, Vite, TypeScript, shadcn/ui, ESLint, Prettier, package manifest, and lockfile configuration.

This migration does not implement dashboard screens or connect to FastAPI.

## Root Files

### Root README

Replace the backend-only root README with a project overview that documents:

- the Arduino → XBee → collector → FastAPI → PostgreSQL → dashboard architecture;
- the purpose of `backend/` and `dashboard/`;
- local commands for each application;
- Dokploy base directory `backend` for the API;
- Dokploy base directory `dashboard` for the Vite application;
- links to each application's README where available.

### Root `.gitignore`

Use one root ignore file for Python and Node artifacts, including:

- virtual environments and Python caches;
- `*.egg-info`, build, dist, and pytest/Ruff caches;
- `node_modules`, Vite output, and frontend caches;
- all `.env` files while allowing committed `.env.example` files;
- editor and operating-system artifacts.

Application-specific `.dockerignore` remains inside `backend/` because its rules belong to the backend build context.

## Deployment

Configure Dokploy as two applications from the same repository:

1. Backend base directory: `backend`
   - Nixpacks reads `backend/.python-version`, `backend/uv.lock`, and `backend/nixpacks.toml`.
   - Start command remains `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}`.

2. Dashboard base directory: `dashboard`
   - Install from `package-lock.json`.
   - Build with the existing Vite scripts.
   - Frontend deployment details beyond a successful production build are deferred until dashboard implementation.

## Verification

Backend, from `backend/`:

```bash
uv sync --extra dev --frozen
uv run pytest -q
uvx ruff check app tests
uv run python -c "from app.main import app; assert app.title"
```

Dashboard, from `dashboard/`:

```bash
npm ci
npm run lint
npm run build
```

Repository checks must confirm:

- no backend runtime files remain accidentally at root;
- no nested `dashboard/iot-water-dashboard/` remains;
- backend deployment files resolve all relative paths from `backend/`;
- neither application has committed secrets;
- generated `iot_water.egg-info/` and build artifacts are not moved or committed.

## Out of Scope

- Dashboard design or API integration.
- Shared frontend/backend types.
- Authentication, WebSockets, alerts, or statistics.
- npm or Python workspace tooling.
- Combining backend and dashboard into one container or Dokploy application.
