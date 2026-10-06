# Water IoT Monorepo Organization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the existing FastAPI backend and Vite dashboard into clean, independently deployable `backend/` and `dashboard/` application roots without changing application behavior.

**Architecture:** Keep one Git repository with two plain application directories and shared project documentation at root. Preserve each application's current toolchain and lockfile; Dokploy selects the relevant application through its base-directory setting rather than through workspace tooling.

**Tech Stack:** Python 3.12, FastAPI, uv, pytest, Docker/Nixpacks, React 19, Vite 8, TypeScript 6, npm.

**Spec:** `docs/superpowers/specs/2026-03-26-monorepo-organization-design.md`

## Global Constraints

- Backend and dashboard remain separate Dokploy applications.
- Backend base directory is exactly `backend`; dashboard base directory is exactly `dashboard`.
- Preserve backend imports and start command `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}`.
- Preserve `backend/uv.lock` in the Nixpacks build context.
- Preserve the existing dashboard source, dependencies, lockfile, Vite aliases, and component configuration.
- Do not implement dashboard screens, API integration, workspaces, Turborepo, shared packages, or combined containers.
- Keep `docs/` and the consolidated `.gitignore` at repository root.

## Review Focus

- Running uv from `backend/` must find `pyproject.toml`, `uv.lock`, `app.main`, tests, and deployment files without relying on root paths.
- `backend/.dockerignore` must not exclude `uv.lock`, or Nixpacks deployment will fail.
- `dashboard/package.json` and `dashboard/package-lock.json` must be direct children, and `dashboard/iot-water-dashboard/` must no longer exist.
- Root ignore rules must exclude Python/Node generated files and `.env` files without excluding `.env.example` files.
- Both application builds must pass independently from their configured Dokploy base directories.

---

### Task 1: Isolate the FastAPI backend

**Files:**
- Create, then move: `tests/test_repository_layout.py` → `backend/tests/test_repository_layout.py`
- Move: `app/` → `backend/app/`
- Move: `tests/` → `backend/tests/`
- Move: `Dockerfile` → `backend/Dockerfile`
- Move: `nixpacks.toml` → `backend/nixpacks.toml`
- Move: `pyproject.toml` → `backend/pyproject.toml`
- Move: `uv.lock` → `backend/uv.lock`
- Move: `.python-version` → `backend/.python-version`
- Move: `.env.example` → `backend/.env.example`
- Move: `.dockerignore` → `backend/.dockerignore`
- Move: `README.md` → `backend/README.md`
- Modify: `.gitignore`
- Create: `README.md`

**Interfaces:**
- Consumes: the current root-level backend, its deployment configuration, and existing 42-test suite.
- Produces: a self-contained `backend/` application and root-level monorepo documentation used by Task 2.

- [ ] **Step 1: Write the failing backend layout test**

Create `tests/test_repository_layout.py` with an adaptive repository-root helper so the same file works before and after moving. Assert that `backend/app/main.py`, `backend/pyproject.toml`, `backend/uv.lock`, `backend/Dockerfile`, and `backend/nixpacks.toml` exist; assert root `app/`, `tests/` (after resolving the running test directory), `pyproject.toml`, `uv.lock`, `Dockerfile`, and `nixpacks.toml` do not remain as backend artifacts; assert `backend/.dockerignore` does not list `uv.lock`.

- [ ] **Step 2: Run the layout test and verify RED**

Run: `uv run pytest tests/test_repository_layout.py -v`
Expected: FAIL because `backend/app/main.py` and the backend manifests do not exist.

- [ ] **Step 3: Move the backend as one Git-aware operation**

Use `git mv` for tracked files and directories. Keep all Python package paths unchanged below `backend/`. Do not move generated `.venv`, `iot_water.egg-info`, caches, `dist`, or `build` artifacts.

- [ ] **Step 4: Consolidate root ignore rules and create the root README**

The root `.gitignore` covers Python and Node caches/builds plus `.env` files at any depth while leaving `.env.example` trackable. The root README documents the architecture, the two directories, local commands, and Dokploy base directories. Preserve the detailed backend guide at `backend/README.md`.

- [ ] **Step 5: Run backend verification from its final base directory**

Run from `backend/`:

```bash
uv sync --extra dev --frozen
uv run pytest -q
uvx ruff check app tests
uvx ruff format --check app tests
DATABASE_URL=postgresql+psycopg://test:test@localhost:5432/test uv run python -c "from app.main import app; assert app.title"
uvx --from uv==0.4.30 uv sync --no-dev --frozen
uv sync --extra dev --frozen
```

Expected: layout test and full suite PASS, lint/format/import PASS, and the Nixpacks uv version accepts the moved lockfile.

- [ ] **Step 6: Commit**

```bash
git add -A backend README.md .gitignore tests app Dockerfile nixpacks.toml pyproject.toml uv.lock .python-version .env.example .dockerignore
git commit -m "refactor: isolate backend application"
```

### Task 2: Flatten and validate the Vite dashboard

**Files:**
- Create: `backend/tests/test_dashboard_layout.py`
- Move: `dashboard/iot-water-dashboard/*` → `dashboard/*`, including dotfiles except its local `.gitignore`
- Delete: `dashboard/iot-water-dashboard/`
- Do not retain: `dashboard/.gitignore` (its relevant rules live in root `.gitignore`)

**Interfaces:**
- Consumes: Task 1's root `.gitignore`, root README, and final `backend/tests/` location.
- Produces: a directly deployable `dashboard/` Vite application with unchanged package scripts and a regression check for the monorepo layout.

- [ ] **Step 1: Write the failing dashboard layout test**

Create `backend/tests/test_dashboard_layout.py`. Assert that root `dashboard/package.json`, `dashboard/package-lock.json`, `dashboard/vite.config.ts`, `dashboard/src/App.tsx`, and `dashboard/components.json` exist; assert `dashboard/iot-water-dashboard/` and `dashboard/.gitignore` do not exist.

- [ ] **Step 2: Run the layout test and verify RED**

Run from `backend/`:

```bash
uv run pytest tests/test_dashboard_layout.py -v
```

Expected: FAIL because the dashboard manifests are still nested.

- [ ] **Step 3: Flatten the existing dashboard without rewriting it**

Move all source, public assets, package manifests, lockfiles, and Vite/TypeScript/ESLint/Prettier/shadcn configuration directly into `dashboard/`. Remove only the redundant nested directory and its local `.gitignore`; do not alter React source or dependency versions.

- [ ] **Step 4: Verify frontend and repository layout**

Run from `dashboard/`:

```bash
npm ci
npm run lint
npm run typecheck
npm run build
```

Then run from `backend/`:

```bash
uv run pytest -q
```

Expected: npm install/lint/typecheck/build PASS and the complete backend suite, including both layout tests, PASS.

- [ ] **Step 5: Verify no generated or misplaced files will be committed**

Run from repository root:

```bash
git status --short
git check-ignore dashboard/node_modules dashboard/dist backend/.venv backend/.env
```

Expected: generated directories are ignored; only intended backend moves, dashboard source, root docs/configuration, spec, plan, and tests are staged or unstaged.

- [ ] **Step 6: Commit**

```bash
git add -A dashboard backend/tests README.md .gitignore docs/superpowers

git commit -m "refactor: organize backend and dashboard monorepo"
```

### Task 3: Final independent application smoke checks

**Files:**
- Modify only if verification exposes a path defect; every modification requires a failing regression check first.

**Interfaces:**
- Consumes: the final `backend/` and `dashboard/` application roots.
- Produces: evidence that both Dokploy base directories are self-contained and the working tree contains no accidental generated artifacts.

- [ ] **Step 1: Verify backend from a clean command context**

Run: `uv run --project backend pytest backend/tests -q`
Expected: all backend and repository-layout tests PASS.

- [ ] **Step 2: Verify dashboard from its application root**

Run: `npm --prefix dashboard run lint && npm --prefix dashboard run typecheck && npm --prefix dashboard run build`
Expected: all commands exit 0.

- [ ] **Step 3: Inspect final tracked structure**

Run: `git status --short && git ls-files | sort`
Expected: backend runtime files exist only under `backend/`, dashboard source exists directly under `dashboard/`, documentation remains under root `docs/`, and generated artifacts are absent.

- [ ] **Step 4: Commit verification fixes only if Step 1–3 required changes**

```bash
git add -A
git commit -m "fix: correct monorepo application paths"
```
