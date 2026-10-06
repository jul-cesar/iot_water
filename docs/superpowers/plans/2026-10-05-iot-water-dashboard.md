# IoT Water Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive dashboard that displays current and historical water telemetry from the real IoT API and detects interrupted data transmission.

**Architecture:** Keep the existing React/Vite SPA and place the API contract and derived telemetry rules in small framework-free modules. TanStack Query owns polling, caching, retry, and paginated history; presentation components consume those query results without duplicating backend status logic.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Tailwind CSS 4, shadcn/ui, TanStack Query, Recharts, Node test runner

**Spec:** `dashboard/iot-water-dashboard/docs/superpowers/specs/2026-10-05-iot-water-dashboard-design.md`

## Global Constraints

- Default API URL: `https://iot.julcesar.xyz`; allow override through `VITE_API_URL`.
- Poll the selected node's latest measurement every 2,000 ms.
- Treat a reading older than 15,000 ms as `NO_DATA`.
- Use backend `water_status` as the sole general-status source; frontend rules only explain pH and turbidity.
- Never invent a node that is absent from `GET /api/nodes`.
- Request at most 2,000 chart records and 20 table records per page.
- Render UTC timestamps in the user's local timezone with native `Intl` APIs.
- Reuse existing CSS tokens and installed shadcn components; add no UI or date dependency.
- Preserve the last valid data during background refresh and show explicit loading, empty, stale, and error states.
- Keep the five sensor variables on independent chart scales.

## Review Focus

- `GET /latest` returning 404 must become an empty-device state, not a broken dashboard — pinned in Task 1 API tests.
- Empty node arrays must remain empty and must not produce a fabricated selection — pinned in Task 1 API tests and Task 4 browser checks.
- Future or malformed sensor timestamps must never display negative age or crash the page — pinned in Task 1 domain tests.
- A failed refresh after valid data must preserve the visible measurement while changing connection state to error — pinned in Task 1 domain tests and Task 4 browser checks.
- A custom date range with start after end must not trigger a request — pinned in Task 3 range tests.

---

### Task 1: Telemetry contract and domain rules

**Files:**
- Modify: `dashboard/package.json`
- Modify: `dashboard/package-lock.json`
- Create: `dashboard/src/lib/api.ts`
- Create: `dashboard/src/lib/api.test.ts`
- Create: `dashboard/src/lib/water.ts`
- Create: `dashboard/src/lib/water.test.ts`

**Interfaces:**
- Produces: `WaterStatus`, `Measurement`, `MeasurementsParams`, `getNodes(signal?)`, `getLatestMeasurement(nodeId, signal?)`, and `getMeasurements(params, signal?)` from `api.ts`.
- Produces: `getAlertReasons(measurement)`, `getReadingAge(timestamp, now?)`, `getConnectionState({ measurement, error, now?, staleAfterMs? })`, `formatLocalDate(timestamp)`, and `formatRelativeTime(timestamp, now?)` from `water.ts`.
- Connection result type: `"ONLINE" | "NO_DATA" | "ERROR"`.

- [ ] **Step 1: Add the test command and TanStack Query dependency**

Run from the repository root:

```bash
npm install --prefix dashboard @tanstack/react-query
npm pkg set --prefix dashboard scripts.test="node --test src/lib/*.test.ts"
```

Expected: `dashboard/package.json` contains `@tanstack/react-query` and `npm test --prefix dashboard` resolves the Node test runner.

- [ ] **Step 2: Write failing API contract tests**

In `dashboard/src/lib/api.test.ts`, use `node:test` and `node:assert/strict` with a temporary `globalThis.fetch` stub. Add tests asserting:

- `getNodes()` returns `[]` unchanged for an empty JSON array.
- `getLatestMeasurement("SinDatos")` returns `null` for status 404.
- `getLatestMeasurement` throws for status 500.
- `getMeasurements({ nodeId: "Nodo_01_Agua", fromDate, toDate, limit: 20, offset: 40 })` sends the exact query keys `node_id`, `from_date`, `to_date`, `limit`, and `offset`.

- [ ] **Step 3: Run API tests and confirm the expected failure**

Run: `npm test --prefix dashboard -- --test-name-pattern="nodes|latest|measurements"`

Expected: FAIL because `api.ts` does not exist.

- [ ] **Step 4: Implement the API module**

In `dashboard/src/lib/api.ts`, define the interfaces above and a private JSON request helper. Use `new URL()` and `URLSearchParams`; treat only latest-measurement 404 as `null`, and throw an `Error` containing the HTTP status for every other non-2xx response.

- [ ] **Step 5: Run API tests**

Run: `npm test --prefix dashboard -- --test-name-pattern="nodes|latest|measurements"`

Expected: all API tests PASS.

- [ ] **Step 6: Write failing domain-rule tests**

In `dashboard/src/lib/water.test.ts`, assert:

- pH 3.76 and turbidity 8.6 produce both Spanish critical reasons.
- warning thresholds use strict greater/less comparisons from the spec.
- a future timestamp has age `0` and connection state `ONLINE`.
- an invalid timestamp returns `NO_DATA` and a safe fallback label.
- a measurement older than 15,000 ms returns `NO_DATA`.
- `{ measurement: validReading, error: true }` returns `ERROR` without requiring the reading to be discarded.
- local and relative formatters return non-empty strings for a valid ISO timestamp.

- [ ] **Step 7: Run domain tests and confirm the expected failure**

Run: `npm test --prefix dashboard -- --test-name-pattern="reason|timestamp|connection|format"`

Expected: FAIL because `water.ts` does not exist.

- [ ] **Step 8: Implement the domain rules**

Implement the exported signatures in `dashboard/src/lib/water.ts`. Keep `staleAfterMs` configurable with a 15,000 ms default, clamp future ages to zero, and return a generic backend-determined reason when `water_status` is non-optimal but no pH/turbidity reason applies.

- [ ] **Step 9: Verify and commit Task 1**

Run:

```bash
npm test --prefix dashboard
npm run typecheck --prefix dashboard
git add dashboard/package.json dashboard/package-lock.json dashboard/src/lib/api.ts dashboard/src/lib/api.test.ts dashboard/src/lib/water.ts dashboard/src/lib/water.test.ts
git commit -m "feat(dashboard): add telemetry data contract"
```

Expected: tests and typecheck PASS; commit contains only the contract, rules, and dependency changes.

---

### Task 2: Query layer and live overview

**Files:**
- Create: `dashboard/src/hooks/use-telemetry.ts`
- Create: `dashboard/src/components/dashboard/dashboard-header.tsx`
- Create: `dashboard/src/components/dashboard/water-status-panel.tsx`
- Create: `dashboard/src/components/dashboard/sensor-card.tsx`
- Modify: `dashboard/src/main.tsx`
- Modify: `dashboard/src/App.tsx`
- Modify: `dashboard/src/index.css`
- Add existing scaffold files required by these imports under `dashboard/src/components/ui/`, `dashboard/src/components/theme-provider.tsx`, and dashboard root configuration files.

**Interfaces:**
- Consumes: Task 1 API and water exports.
- Produces: `useNodes()`, `useLatestMeasurement(nodeId)`, and `telemetryKeys` from `use-telemetry.ts`.
- `DashboardHeader` receives nodes, selected node, selection callback, connection state, and latest timestamp.
- `WaterStatusPanel` receives `Measurement | null` and alert reasons.
- `SensorCard` receives label, numeric value, unit, update timestamp, and visual severity.

- [ ] **Step 1: Implement the React Query provider**

Create one `QueryClient` in `dashboard/src/main.tsx` and wrap the existing theme provider and `<App />` with `QueryClientProvider`. Configure one retry for ordinary failures and no refetch on window focus.

- [ ] **Step 2: Implement telemetry query hooks**

In `dashboard/src/hooks/use-telemetry.ts`, use node-specific query keys. Configure latest-measurement polling with `refetchInterval: 2_000`; keep the previous successful result during background errors.

- [ ] **Step 3: Build the live overview components**

Implement the three component interfaces above using existing `Badge`, `Card`, `Button`, and Hugeicons. Use a native `<select>` for the real node list. Give connection status a text label and icon/dot so color is not the only signal.

- [ ] **Step 4: Compose the overview in App**

In `dashboard/src/App.tsx`, select the first returned node only when no valid selection exists. Add a one-second local clock for relative time and staleness without extra requests. Render loading, no-node, no-measurement, and API-error messages from the approved copy.

- [ ] **Step 5: Apply existing design tokens and responsive layout**

In `dashboard/src/index.css` and component classes, use `background`, `card`, `primary`, `muted`, `border`, `chart-*`, and `destructive`. Add only one warning semantic token pair if no existing token communicates warning. Use one-column mobile and multi-column tablet/desktop grids.

- [ ] **Step 6: Verify the live overview**

Run:

```bash
npm test --prefix dashboard
npm run typecheck --prefix dashboard
npm run lint --prefix dashboard
npm run build --prefix dashboard
```

Expected: all commands PASS. In a browser, the real `Nodo_01_Agua` appears, latest data loads, and the relative timestamp changes without page reload.

- [ ] **Step 7: Commit Task 2**

Stage only the dashboard scaffold, query hook, overview components, `App.tsx`, `main.tsx`, and `index.css`, then commit:

```bash
git commit -m "feat(dashboard): show live water telemetry"
```

---

### Task 3: Time filters and independent history charts

**Files:**
- Create: `dashboard/src/lib/time-range.ts`
- Create: `dashboard/src/lib/time-range.test.ts`
- Modify: `dashboard/src/hooks/use-telemetry.ts`
- Create: `dashboard/src/components/dashboard/time-range-filter.tsx`
- Create: `dashboard/src/components/dashboard/history-charts.tsx`
- Modify: `dashboard/src/App.tsx`

**Interfaces:**
- Produces: `TimePreset = "1h" | "6h" | "24h" | "7d" | "custom"`, `TimeRange`, `getPresetRange(preset, now?)`, and `validateTimeRange(range)` from `time-range.ts`.
- Produces: `useHistoricalMeasurements(nodeId, range)` from `use-telemetry.ts`, with a 2,000-record limit.
- `TimeRangeFilter` emits only valid `TimeRange` values.
- `HistoryCharts` receives `Measurement[]`, loading state, and a flag indicating the 2,000-record ceiling was reached.

- [ ] **Step 1: Write failing time-range tests**

Assert exact millisecond differences for 1h, 6h, 24h, and 7d presets. Assert `validateTimeRange` rejects missing dates and start-after-end, and accepts equal or ordered valid dates.

- [ ] **Step 2: Run the range tests and confirm failure**

Run: `npm test --prefix dashboard -- --test-name-pattern="range|preset"`

Expected: FAIL because `time-range.ts` does not exist.

- [ ] **Step 3: Implement time-range helpers**

Implement the interfaces above using `Date` and ISO strings only. Do not add another date library.

- [ ] **Step 4: Add the historical query**

Extend `use-telemetry.ts` to call `getMeasurements` with selected node, `from_date`, `to_date`, and `limit: 2_000`. Preserve previous data while the key changes.

- [ ] **Step 5: Build the filter**

Render preset buttons and a custom-range dialog using the existing `Calendar` and `Dialog`. Disable “Aplicar” while the range is incomplete or reversed; do not emit or request invalid ranges.

- [ ] **Step 6: Build five independent charts**

In `history-charts.tsx`, define one sensor metadata array and map it to five Recharts line-chart cards. Each chart has its own unit, Y scale, local-time X labels, accessible title, and tooltip with local date, value, and unit. Reverse API results for chronological chart order without mutating cached arrays.

- [ ] **Step 7: Verify and commit Task 3**

Run:

```bash
npm test --prefix dashboard
npm run typecheck --prefix dashboard
npm run lint --prefix dashboard
npm run build --prefix dashboard
git add dashboard/src/lib/time-range.ts dashboard/src/lib/time-range.test.ts dashboard/src/hooks/use-telemetry.ts dashboard/src/components/dashboard/time-range-filter.tsx dashboard/src/components/dashboard/history-charts.tsx dashboard/src/App.tsx
git commit -m "feat(dashboard): chart historical measurements"
```

Expected: all commands PASS; changing presets updates all five charts without blanking the old result during loading.

---

### Task 4: Paginated table, resilience, and responsive verification

**Files:**
- Modify: `dashboard/src/hooks/use-telemetry.ts`
- Create: `dashboard/src/components/dashboard/measurements-table.tsx`
- Modify: `dashboard/src/App.tsx`
- Modify: `dashboard/src/index.css`
- Modify: `dashboard/README.md`

**Interfaces:**
- Consumes: Task 1 `getMeasurements` and `Measurement`.
- Produces: `useRecentMeasurements(nodeId)` backed by `useInfiniteQuery`, with 20 rows per page and `getNextPageParam` returning `undefined` when the last page contains fewer than 20 rows.
- `MeasurementsTable` receives flattened measurements, pagination state, and a load-more callback.

- [ ] **Step 1: Add paginated recent measurements**

Extend `use-telemetry.ts` with the interface above. Keep table data independent from the chart period so changing a chart filter does not reset pagination.

- [ ] **Step 2: Build the measurement table**

Render the approved eight columns with existing table components. Format timestamps locally, use a status badge, preserve horizontal scrolling on small screens, and show “Cargar más” only when another page may exist.

- [ ] **Step 3: Complete resilience states**

In `App.tsx`, ensure initial loading, no nodes, node without data, stale telemetry, latest-query error, history error, and empty history each have non-broken content. A refresh error must leave the last successful sensor values visible while the header reports `ERROR`.

- [ ] **Step 4: Document configuration**

Replace the template README with setup commands, `VITE_API_URL`, endpoint assumptions, polling and stale thresholds, and build/test commands. Do not document speculative alert/export features as implemented.

- [ ] **Step 5: Run automated verification**

Run:

```bash
npm test --prefix dashboard
npm run typecheck --prefix dashboard
npm run lint --prefix dashboard
npm run build --prefix dashboard
```

Expected: every command exits 0.

- [ ] **Step 6: Run browser verification against the real API**

Start the Vite server and verify at desktop, tablet, and mobile widths:

- only API-provided nodes appear;
- current cards and relative time update without full-page reload;
- stopping or blocking latest-measurement requests preserves values and changes connection status;
- all presets and a valid custom range update the charts;
- reversed custom dates cannot be applied;
- the table loads another page only when available;
- empty and 404 responses show the approved messages;
- keyboard focus reaches selector, filters, dialog controls, and load-more button.

- [ ] **Step 7: Commit Task 4**

```bash
git add dashboard/src/hooks/use-telemetry.ts dashboard/src/components/dashboard/measurements-table.tsx dashboard/src/App.tsx dashboard/src/index.css dashboard/README.md
git commit -m "feat(dashboard): add measurement history table"
```

- [ ] **Step 8: Review the complete branch**

Run `git diff <base-ref>...HEAD --check` and inspect the full dashboard diff for duplicated status logic, invented node data, inaccessible color-only indicators, and untracked frontend files. Expected: no whitespace errors, no omitted required files, and no second implementation of `water_status`.
