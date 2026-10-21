# Protected History Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require one shared administrator credential to read stored measurement history and export up to 31 days as an Excel-compatible CSV.

**Architecture:** FastAPI HTTP Basic protects stored-history routes using a username and password configured in the environment. The backend generates bounded CSV exports; React keeps one Basic authorization value only in component memory and uses it for history, recent rows, and export while current readings remain public.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy, Python standard-library `secrets`/`csv`; React 19, TypeScript, TanStack Query, existing Base UI dialog; pytest and Node test runner.

**Spec:** `docs/superpowers/specs/2026-10-20-protected-history-export-design.md`

## Global Constraints

- One shared account only; no registration, roles, recovery, JWT, cookies, or persistent sessions.
- Do not add dependencies; use FastAPI and standard-library primitives already available.
- Keep `POST /api/measurements`, `GET /api/measurements/latest`, and `GET /api/nodes` public.
- Protect `GET /api/measurements`, `GET /api/measurements/{id}`, and `GET /api/measurements/export.csv`.
- Accept export ranges of at most 31 days and at most 50,000 rows; never silently truncate.
- Produce UTF-8 CSV with BOM and `Content-Disposition`; do not add native `.xlsx` generation.
- Keep browser credentials only in React memory and clear them after any `401` response.
- HTTPS and proxy-level failed-authentication rate limiting remain deployment requirements.

## Review Focus

- Missing, malformed, or wrong Basic credentials must always produce the same `401` without `WWW-Authenticate`, so only the custom modal appears (Task 1 tests).
- The dynamic `/{measurement_id}` route must not capture `/export.csv` (Task 2 route test).
- Exactly 31 days must pass while 31 days plus one second fails with `422` (Task 2 boundary tests).
- A 50,001st row must produce `413` rather than truncation or an oversized response (Task 2 cap test).
- Spreadsheet-formula prefixes in text cells must be neutralized before Excel opens the CSV (Task 2 CSV-injection test).

---

### Task 1: Shared history authentication

**Files:**
- Create: `backend/app/core/history_auth.py`
- Modify: `backend/app/core/config.py`
- Modify: `backend/app/api/routes/measurements.py:1-101`
- Modify: `backend/tests/conftest.py`
- Modify: `backend/tests/test_api.py`
- Modify: `backend/.env.example`
- Modify: `backend/README.md`

**Interfaces:**
- Produces: `require_history_access(credentials: Annotated[HTTPBasicCredentials, Depends(HTTPBasic())]) -> None`.
- Produces settings: `history_username: str` and `history_password: str` sourced from `HISTORY_USERNAME` and `HISTORY_PASSWORD`.
- Consumes: existing FastAPI route dependencies and settings singleton.

- [ ] **Step 1: Write failing authentication tests**

Add tests in `backend/tests/test_api.py` asserting:

```python
assert client.get("/api/measurements").status_code == 401
assert client.get("/api/measurements/1").status_code == 401
assert client.get("/api/measurements", auth=("admin", "wrong")).status_code == 401
assert client.get("/api/measurements", auth=("admin", "test-password")).status_code == 200
```

Also assert all rejected cases have generic `{"detail": "Invalid history credentials"}` without `WWW-Authenticate`, while POST, latest, and nodes remain public.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `cd backend && uv run pytest tests/test_api.py -v`

Expected: FAIL because history routes are still public and no authentication dependency exists.

- [ ] **Step 3: Implement the minimum authentication dependency**

In `backend/app/core/history_auth.py`, compare both environment credentials with `secrets.compare_digest` and normalize malformed Basic headers to the same generic response. In `measurements.py`, add the dependency only to list and detail routes.

Set test credentials in `backend/tests/conftest.py`. Add placeholder production values to `.env.example` and `backend/README.md`; never include a real password.

- [ ] **Step 4: Run authentication tests and checks**

Run: `cd backend && uv run pytest tests/test_api.py -v && uv run ruff check app tests`

Expected: all focused tests PASS and Ruff reports no errors.

- [ ] **Step 5: Commit**

```bash
git add backend/app/core/history_auth.py backend/app/core/config.py backend/app/api/routes/measurements.py backend/tests/conftest.py backend/tests/test_api.py backend/.env.example backend/README.md
git commit -m "feat(api): protect measurement history"
```

---

### Task 2: Bounded server-side CSV export

**Files:**
- Modify: `backend/app/api/routes/measurements.py`
- Modify: `backend/tests/test_api.py`
- Modify: `backend/README.md`

**Interfaces:**
- Consumes: `require_history_access`, `list_measurements(...)`, and `to_response(...)` from Task 1 and existing services.
- Produces: `GET /api/measurements/export.csv?node_id=<id>&from_date=<ISO>&to_date=<ISO>`.
- Produces: CSV columns `created_at,node_id,temperature,ph,turbidity,tds,level,water_status` in chronological order.

- [ ] **Step 1: Write failing export tests**

Add API tests asserting:

- no credentials and wrong credentials return the Task 1 generic `401`;
- valid credentials return `200`, `text/csv`, BOM, the exact column header, chronological rows, and an attachment filename;
- commas, quotes, and line breaks are escaped by `csv.writer`;
- text beginning with `=`, `+`, `-`, or `@` is prefixed with `'` to prevent spreadsheet formula execution;
- missing dates, reversed dates, and ranges over 31 days return `422`;
- exactly 31 days succeeds;
- monkeypatching the row cap to one and exporting two matches returns `413` with guidance to shorten the range;
- `/api/measurements/export.csv` reaches the export handler rather than the integer detail route.

- [ ] **Step 2: Run export tests and verify failure**

Run: `cd backend && uv run pytest tests/test_api.py -k "export" -v`

Expected: FAIL with `404` or route-validation errors because the export route does not exist.

- [ ] **Step 3: Implement the export route**

Declare `/measurements/export.csv` before `/measurements/{measurement_id}`. Require `node_id`, `from_date`, `to_date`, and `require_history_access`; reject ranges beyond `timedelta(days=31)`. Fetch `MAX_EXPORT_ROWS + 1` through existing `list_measurements`, return `413` when the extra row exists, then build CSV with `io.StringIO` and `csv.writer`.

Use a fixed safe filename derived only from ISO dates, prepend `\ufeff`, and return a complete `Response` only after CSV creation succeeds. Add the endpoint and limits to `backend/README.md`.

- [ ] **Step 4: Run backend verification**

Run: `cd backend && uv run pytest -v && uv run ruff check app tests`

Expected: full backend suite PASS and Ruff reports no errors.

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/routes/measurements.py backend/tests/test_api.py backend/README.md
git commit -m "feat(api): export protected history csv"
```

---

### Task 3: In-memory dashboard access and protected download

**Files:**
- Create: `dashboard/src/lib/history-access.ts`
- Create: `dashboard/src/lib/history-access.test.ts`
- Create: `dashboard/src/components/dashboard/history-access-dialog.tsx`
- Modify: `dashboard/src/lib/api.ts`
- Modify: `dashboard/src/lib/api.test.ts`
- Modify: `dashboard/src/hooks/use-telemetry.ts`
- Modify: `dashboard/src/lib/export.ts`
- Modify: `dashboard/src/lib/export.test.ts`
- Modify: `dashboard/src/App.tsx:1-230`

**Interfaces:**
- Produces: `HistoryAccessState` with `authorization: string | null`, `dialogOpen: boolean`, and `error: string | null`.
- Produces: `historyAccessReducer(state, event) -> HistoryAccessState`; `SUBMIT` stores a Basic header, `UNAUTHORIZED` clears it and reopens the dialog.
- Produces: `HttpError` with numeric `status`, and `isUnauthorized(error: unknown) -> boolean` in `api.ts`.
- Produces: `getMeasurements(params, { authorization, signal })` and `getMeasurementsCsv(params, { authorization, signal }) -> Promise<Blob>`.
- Produces: `downloadBlob(blob: Blob, filename: string) -> void` in `export.ts`.
- Consumes: the existing time-range helpers and Base UI `Dialog` components.

- [ ] **Step 1: Write failing pure-state and API tests**

In `history-access.test.ts`, assert `SUBMIT` creates `Basic ${btoa("admin:secret")}`, closes the dialog, and stores no username/password fields; assert `UNAUTHORIZED` clears authorization, opens the dialog, and sets a generic error.

In `api.test.ts`, assert protected measurement and CSV requests send the supplied `Authorization` header, serialize node/date parameters, return CSV as a Blob, and expose `401` as `HttpError.status`. Update `export.test.ts` to remove client-side CSV conversion tests while retaining title tests.

- [ ] **Step 2: Run dashboard tests and verify failure**

Run: `cd dashboard && npm test`

Expected: FAIL because the access reducer, status-aware API errors, and server CSV client do not exist.

- [ ] **Step 3: Implement access state and API support**

Implement the Task 3 interfaces without reading or writing `localStorage`, `sessionStorage`, cookies, or URLs. Keep public API calls unchanged. Include authorization in protected request headers but not TanStack Query keys.

Update both telemetry hooks to accept authorization, disable protected queries while it is absent, and preserve current polling after access is granted.

- [ ] **Step 4: Implement the access dialog and protected sections**

Build `HistoryAccessDialog` with native labeled username/password inputs inside the existing accessible Dialog primitives. Clear its local password after submission.

In `App.tsx`, use the reducer: show one “Acceder al historial” action when locked; render historical and recent sections only while authorized; dispatch `UNAUTHORIZED` when either query or export receives `401`. Replace browser-side row conversion with `getMeasurementsCsv` for the exact selected range and pass the Blob to `downloadBlob`. Show a concise error for `413` or other export failures.

- [ ] **Step 5: Run dashboard verification**

Run: `cd dashboard && npm test && npm run typecheck && npm run lint && npm run build`

Expected: tests, typecheck, lint, and production build all PASS.

- [ ] **Step 6: Run repository verification**

Run: `cd backend && uv run pytest -v && uv run ruff check app tests`

Run: `cd ../dashboard && npm test && npm run typecheck && npm run lint && npm run build`

Manual check: current cards load without credentials; history opens only after valid credentials; refresh locks it again; wrong credentials reopen the dialog; a selected date range downloads a CSV that Excel opens correctly.

- [ ] **Step 7: Commit**

```bash
git add dashboard/src/lib/history-access.ts dashboard/src/lib/history-access.test.ts dashboard/src/components/dashboard/history-access-dialog.tsx dashboard/src/lib/api.ts dashboard/src/lib/api.test.ts dashboard/src/hooks/use-telemetry.ts dashboard/src/lib/export.ts dashboard/src/lib/export.test.ts dashboard/src/App.tsx
git commit -m "feat(dashboard): unlock protected history export"
```
