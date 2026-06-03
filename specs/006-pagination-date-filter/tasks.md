---
description: "Task list for Workout History, Weight Tracking & Movements Pagination with Date Range Filtering"
---

# Tasks: Workout History, Weight Tracking & Movements Pagination with Date Range Filtering

**Input**: Design documents from `specs/006-pagination-date-filter/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/server-functions.md ✅

**Organization**: Tasks grouped by user story. Completed tasks (✅) reflect the initial implementation pass; open tasks reflect: (1) code drift corrections for unified 90-day max and page size 5, and (2) e2e test database isolation replacing the superseded `!`-prefix workaround.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared state)
- **[Story]**: User story label (US1, US2, US3, US4)
- Exact file paths included in all descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create shared UI primitives used by all user story phases.

- [X] T001 Create `useDebounce<T>(value, delay)` hook in `src/hooks/use-debounce.ts`
- [X] T002 [P] Create `Pagination` UI component (numbered pages, prev/next, ellipsis, hidden when `totalPages ≤ 1`) in `src/components/ui/pagination.tsx`

---

## Phase 2: Foundational (Server-Side)

**Purpose**: Server validation and design-doc artefacts aligned with final per-page limits (90-day max, page size 5).

- [X] T003 Update `MAX_RANGE_DAYS` constant to `90` in `src/lib/weight.server.ts`
- [X] T004 [P] Update `specs/006-pagination-date-filter/contracts/server-functions.md` — weight entries range limit 30→90 calendar days
- [X] T005 [P] Update `specs/006-pagination-date-filter/data-model.md` — unified 90-day max and page size 5

---

## Phase 3: User Story 1 — Paginate Workout History Within a Date Range (Priority: P1) 🎯 MVP

**Goal**: Workout History page shows last 90 days by default, paginated at 5/page via shadcn `Pagination`, with auto-apply debounce (500 ms), warning icon for invalid ranges, URL search params for state, Reset button, auto-scroll, and result summary.

**Independent Test**: Open `/workout-history` → verify last 90 days shown → navigate pages → set >90-day range → verify warning icon → click Reset → verify 90-day defaults → copy URL and reload → verify same view.

### Implementation for User Story 1

- [X] T006 [US1] Modify `getWorkoutHistoryServerFn` in `src/lib/workouts.server.ts`: add Zod `inputValidator` for `{ startDate, endDate, page }`, validate range ≤ 90 days, return paginated envelope `{ items, totalCount, page, totalPages, pageSize }`
- [X] T007 [US1] Update `workoutHistoryQueryOptions` in workout history `-queries/` file: accept `{ startDate, endDate, page }` and set `queryKey: ["workout-history", { startDate, endDate, page }]`
- [X] T008 [US1] Add `validateSearch` (page, from, to; 90-day default) and `loaderDeps` to `src/routes/__index/_layout.workout-history/index.tsx`
- [X] T009 [US1] Remove `useState` for date/page; add `Route.useSearch()`, `useNavigate`, and local mirror input state (`localStart`, `localEnd`) in `src/routes/__index/_layout.workout-history/index.tsx`
- [X] T010 [US1] Wire `useDebounce(localStart/localEnd, 500)` and `useEffect` to navigate (`replace: true`) on valid range change; derive `rangeError` from raw local inputs for immediate icon display in `src/routes/__index/_layout.workout-history/index.tsx`
- [X] T011 [US1] Replace Apply button with `<AlertCircle data-testid="range-error-icon">` icon when range is invalid; add Reset button wired to 90-day default in `src/routes/__index/_layout.workout-history/index.tsx`
- [X] T012 [US1] Add `<Pagination>` component, "Showing X–Y of Z workouts" summary, `listRef` + auto-scroll `useEffect` on page change; remove `useVirtualizer` in `src/routes/__index/_layout.workout-history/index.tsx`
- [X] T013 [US1] Add `workout history pagination` describe block to `e2e/workouts.spec.ts`: default date range pre-fill, valid range filter, invalid range icon, start-after-end icon, Reset, URL-param restore
- [X] T014 [US1] Fix URL assertions in `e2e/workouts.spec.ts` that use exact `toHaveURL("/workout-history")` — change to regex partial match `toHaveURL(/\/workout-history/)` to tolerate pagination query params

**Checkpoint**: Workout History page fully functional. All US1 e2e tests pass.

---

## Phase 4: User Story 2 — Paginate Weight Entries Within a Date Range (Priority: P2)

**Goal**: Weight Tracking page shows last 90 days by default (89 days ago → today), paginated at 5/page, with auto-apply (max 90 days), warning icon, URL state, Reset to 90-day default, auto-scroll, result summary, and chart reflecting the selected range.

**Independent Test**: Open `/weight` → verify last 90 days shown → change date range (≤ 90 days) → verify list and chart update → set >90-day range → verify warning icon → click Reset → verify 90-day defaults → reload URL → verify state restored.

### Implementation for User Story 2

- [X] T015 [US2] Modify `getWeightEntriesServerFn` in `src/lib/weight.server.ts`: add Zod `inputValidator`, validate range ≤ 90 days, return paginated envelope with `chartItems`
- [X] T016 [US2] Update weight entries query options: accept `{ startDate, endDate, page }` and set `queryKey: ["weight-entries", { startDate, endDate, page }]`
- [X] T017 [US2] Add `validateSearch` (page, from, to; 89-day default) and `loaderDeps` to `src/routes/__index/_layout.weight/index.tsx`
- [X] T018 [US2] Remove `useState` for date/page; add `Route.useSearch()`, `useNavigate`, and local mirror input state in `src/routes/__index/_layout.weight/index.tsx`
- [X] T019 [US2] Set default `from` to 89 days ago in `src/routes/__index/_layout.weight/index.tsx`; update `rangeError` threshold to 90 days
- [X] T020 [US2] Reset button navigates to `from = 89 days ago` and resets `localStart`/`localEnd` in `src/routes/__index/_layout.weight/index.tsx`
- [X] T021 [US2] Add `<Pagination>` component, "Showing X–Y of Z entries" summary, `listRef` + auto-scroll; chart uses `data.chartItems`; remove `useVirtualizer` in `src/routes/__index/_layout.weight/index.tsx`
- [X] T022 [US2] Fix URL assertions in `e2e/weight.spec.ts` — change to regex partial match `toHaveURL(/\/weight/)`
- [X] T023 [US2] Update `weight history pagination` describe block in `e2e/weight.spec.ts`: 89-day offset default, 91-day trigger for invalid range, 90-day referenced in test names

**Checkpoint**: Weight Tracking page uses 90-day default and max end-to-end. All US2 e2e tests pass.

---

## Phase 5: User Story 3 — Reset Date Range to Default (Priority: P3)

**Goal**: Verify Reset works on both pages and returns each to its 90-day default.

**Independent Test**: Set a custom range on each page → click Reset → verify error icon disappears → verify inputs show 90-day default → verify URL cleared to page 1.

### E2E Verification for User Story 3

- [X] T024 [US3] `reset restores default date range` scenario in `e2e/workouts.spec.ts` — asserts 89-day offset after reset
- [X] T025 [US3] `reset restores default date range` scenario in `e2e/weight.spec.ts` — asserts 89-day offset after reset

**Checkpoint**: Reset verified on both pages with correct 90-day defaults.

---

## Phase 6: User Story 4 — Paginate Movements List (Priority: P2)

**Goal**: Movements page paginates at 5/page alphabetically. `?page=N` in URL restores the correct page. Pagination controls hidden when ≤ 1 page.

**Independent Test**: Open `/movements` → verify only 5 movements shown → navigate to page 2 → verify next alphabetical batch → reload with `?page=2` → verify same page.

### Implementation for User Story 4

- [X] T026 [US4] Add `validateSearch` (page only, default 1) and `loaderDeps` to `src/routes/__index/_layout.movements/index.tsx`
- [X] T027 [US4] Wire movements query/loader to pass `page` and return paginated envelope `{ items, totalCount, totalPages, page, pageSize }` in `src/routes/__index/_layout.movements/index.tsx`
- [X] T028 [US4] Add `<Pagination page={page} totalPages={totalPages} onPageChange={...} />` to movements page in `src/routes/__index/_layout.movements/index.tsx`

### Code Drift Corrections (post re-plan 2026-06-03)

**⚠️ Note**: The `!`-prefix workaround for e2e movement isolation (T029–T031 in prior task revision) is superseded by the dedicated test database approach in Phase 7. These slots now hold the outstanding code drift fixes.

- [X] T029 Fix `PAGE_SIZE` constant from `10` to `5` in `src/lib/movements.server.ts` (line 22); verify the `getPaginatedMovementsServerFn` response envelope reflects `pageSize: 5`
- [X] T030 [P] Fix error message in `src/lib/workouts.server.ts` (line 128): change `"Date range must not exceed 30 days"` to `"Date range must not exceed 90 days"` — the constant `MAX_RANGE_DAYS` is already correct (90) but the string literal was not updated
- [X] T031 [P] Fix error message in `src/lib/weight.server.ts` (line 34): change `"Date range must not exceed 30 days"` to `"Date range must not exceed 90 days"` — same drift as T030

**Checkpoint**: All server functions use PAGE_SIZE=5 and correct 90-day error messages.

---

## Phase 7: E2E Test Database Isolation (Priority: P1 for test reliability)

**Goal**: Replace the ad-hoc `!`-prefix naming convention with a properly isolated test database. Playwright global setup creates (or reuses) a dedicated PostgreSQL database (`demo_project_test`), applies all Prisma migrations, and truncates all tables before the suite starts. This gives every test run a clean slate and eliminates inter-run data pollution.

**Architecture**: Same PostgreSQL instance as dev; database name `demo_project_test`. Connection string stored in `DATABASE_URL_TEST` environment variable (see `.env.test.example`). The Playwright `webServer` config starts the app server with `DATABASE_URL` overridden to `DATABASE_URL_TEST` so the app reads from the test DB during test runs.

**Prerequisites**: `.env.test` created from `.env.test.example` with `DATABASE_URL_TEST` pointing at the local Postgres instance.

### Implementation for E2E Test Database Isolation

- [X] T033 Add `pg` and `@types/pg` as devDependencies (`bun add -d pg @types/pg`) in `package.json` — required so `e2e/global-setup.ts` can connect directly to Postgres for database creation and table truncation without going through the app server
- [X] T034 [P] Update `e2e/global-setup.ts` to add DB isolation steps BEFORE the existing browser auth flow: (1) read `DATABASE_URL_TEST` from `process.env` (throw if missing); (2) connect to the `postgres` admin database using `pg.Client` to issue `CREATE DATABASE demo_project_test` if not exists; (3) run `execSync('bunx prisma migrate deploy', { env: { ...process.env, DATABASE_URL: testDbUrl } })` to apply migrations; (4) connect to the test DB and `TRUNCATE "User", "Workout", "Set", "Movement", "WeightEntry" CASCADE`; (5) proceed with the existing browser sign-in or create-account flow against the now-clean test DB (depends on T033)
- [X] T035 [P] Update `playwright.config.ts`: add `webServer` block with `command: 'bun run dev'`, `url: 'http://localhost:3000'`, `reuseExistingServer: !process.env.CI`, and `env: { DATABASE_URL: process.env.DATABASE_URL_TEST ?? '' }` — so the server started for tests reads from the test DB, while the dev server (when run separately) continues using `DATABASE_URL` unchanged

**Checkpoint**: Running `bunx playwright test` against a clean environment correctly isolates test data. Newly created movements, workouts, and weight entries are always visible on page 1 because no pre-existing data exists. The global setup log shows "test DB truncated" before tests begin.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, docs consistency, and final validation.

- [X] T032 [P] Update `specs/006-pagination-date-filter/quickstart.md`: updated default date range note to 90 days, added test DB setup notes, updated seeding note to >5 items
- [X] T036 Run full Playwright e2e suite (`bunx playwright test`) and verify zero failures across all spec files: `e2e/workouts.spec.ts`, `e2e/weight.spec.ts`, `e2e/movements.spec.ts`, `e2e/sets.spec.ts`, `e2e/bodyweight-movements.spec.ts`, `e2e/progression-charts.spec.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** (Setup): ✅ complete
- **Phase 2** (Foundational): ✅ complete
- **Phase 3** (US1): ✅ complete
- **Phase 4** (US2): ✅ complete
- **Phase 5** (US3): ✅ complete
- **Phase 6** (US4): Implementation ✅; code drift corrections T029–T031 open
- **Phase 7** (Test DB Isolation): T033 must finish before T034; T034 + T035 can run in parallel after T033
- **Phase 8** (Polish): T036 depends on T029–T031 and T033–T035 all complete

### Open Task Dependencies

```
T029   ─────────────────────────────────────────────────┐
T030 [P] ─────────────────────────────────────────────── ┼──→ T036 (run suite)
T031 [P] ─────────────────────────────────────────────── ┤
T033 ─→ T034 ────────────────────────────────────────────┤
T035 [P] (parallel with T033, no file conflict) ─────────┘
```

### Parallel Opportunities

- T029, T030, T031: all touch different server files — run in parallel
- T033 and T035: different files (`package.json` vs `playwright.config.ts`) — run in parallel
- T034 depends on T033 (needs pg installed first)

---

## Parallel Example: Phase 7

```bash
# Step 1 — run T033 and T035 in parallel (different files):
Task: "Add pg devDeps in package.json"                     → T033
Task: "Add webServer config to playwright.config.ts"       → T035

# Step 2 — T034 after T033 completes:
Task: "Update global-setup.ts for test DB"                 → T034

# Step 3 — T036 after T029-T031 and T033-T035 all complete:
Task: "Run full Playwright e2e suite"                       → T036
```

---

## Implementation Strategy

### Immediate Priority (Fix Broken Tests)

1. T029 — Fix movements.server.ts PAGE_SIZE (unblocks clean pagination for movements)
2. T030, T031 (parallel) — Fix error messages in server files
3. T033 — Add pg devDep (unblocks T034)
4. T034 + T035 (parallel after T033) — Wire test DB global setup + playwright config
5. T036 — Run full suite and confirm green

### Full Incremental Order

1. T029–T031 (parallel) → server constants correct
2. T033 + T035 (parallel) → package.json + playwright.config ready
3. T034 → global-setup.ts updated (test DB isolation wired)
4. T036 → full suite passes ✅

---

## Notes

- **Test DB convention**: `demo_project_test` — same Postgres instance as dev, separate database. Source of truth: `.env.test.example` → copy to `.env.test` (not checked in)
- **No `!` prefix**: With a clean test DB on every run, movement names in tests do NOT need the `!` prefix. `TestMovement-${Date.now()}` will always be on page 1 of a fresh database.
- **PAGE_SIZE = 5**: All three server files must use 5. After T029, all are consistent.
- **90-day max on all date-filtered pages**: After T030–T031, error messages match the `MAX_RANGE_DAYS = 90` constant.
- **webServer `reuseExistingServer`**: In local dev, if a server is already running on port 3000, Playwright reuses it. For fully isolated test runs locally, stop the dev server first. In CI (`CI=true`), Playwright always starts a fresh server with the test DB.
- Commit using Conventional Commits: `fix(movements): set page size to 5`, `fix(workouts): correct 90-day error message`, `test(e2e): add dedicated test database global setup`, etc.
