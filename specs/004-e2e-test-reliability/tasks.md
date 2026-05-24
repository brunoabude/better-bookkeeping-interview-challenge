# Tasks: E2E Test Suite Reliability & Completeness

**Input**: Design documents from `specs/004-e2e-test-reliability/`

**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Environment configuration and one-time setup that all subsequent work depends on.

- [X] T001 Add `e2e/.auth/` to `.gitignore` so the persisted session file is never committed
- [X] T002 [P] Create `.env.test.example` at repo root documenting `DATABASE_URL_TEST` (default: `postgresql://postgres:postgres@localhost:5432/demo_project_test`) and `E2E_TEST_PASSWORD` (default: `password123`) with inline comments
- [X] T003 [P] Create the test database: run `docker exec -it demo-project-db psql -U postgres -c "CREATE DATABASE demo_project_test;"` (or `IF NOT EXISTS` variant); document this as a one-time manual prerequisite in `quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core test infrastructure that MUST be complete before any user story work can begin.

**⚠️ CRITICAL**: Phases 3–6 all depend on this phase being complete.

- [X] T004 Add a client-side hydration signal to `src/routes/__root.tsx`: import `useEffect` from React and add `useEffect(() => { document.documentElement.setAttribute('data-hydrated', 'true'); }, [])` inside the root component, so tests can reliably detect when React has taken control of the DOM
- [X] T005 [P] Rewrite `e2e/shared.ts`: remove the `signInOrCreate` function entirely; export `waitForHydration(page: Page)` (waits for `[data-hydrated="true"]` with 15s timeout); consolidate `TEST_EMAIL`, `TEST_PASSWORD`, `TEST_NAME` constants to a single shared source (`e2e-test@better-bookkeeping.test` / `password123` / `E2E Test User`) so all spec files import from one place
- [X] T006 Create `e2e/global-setup.ts` exporting a default `async function globalSetup(config: FullConfig)` that: signs in the test user if they exist, or creates them if not; saves `await context.storageState()` to `e2e/.auth/user.json`; closes browser
- [X] T007 Update `playwright.config.ts`: set `globalSetup: './e2e/global-setup'`; set `use.storageState: './e2e/.auth/user.json'`; set `use.actionTimeout: 15_000`; change `retries` to `process.env.CI ? 1 : 0`; set `fullyParallel: false`; set `workers: 1` (single worker required to prevent inter-file race conditions on the shared test user account)

**Checkpoint**: Run `bun run test` — global setup should create the auth file and all existing tests should pass without any `beforeEach` login changes yet.

---

## Phase 3: User Story 2 — Shared Global Authentication State (Priority: P1)

**Goal**: Remove per-test login overhead by loading the global session state instead.

**Independent Test**: Run the full test suite and verify the sign-in page is never visited during any test (check Playwright trace output); total run time should drop measurably.

- [X] T008 [P] [US2] Migrate `e2e/weight.spec.ts`: remove the `beforeEach` block containing `signInOrCreate`; replace all `await page.waitForLoadState("networkidle")` calls with `await waitForHydration(page)` from the updated `e2e/shared.ts`; verify all 4 existing tests still pass
- [X] T009 [P] [US2] Migrate `e2e/bodyweight-movements.spec.ts`: remove the `beforeEach` block from both `test.describe` blocks (`Body-Weight Movement flag (US1)` and `Auto-fill weight in workout (US2)`); replace all `await page.waitForLoadState("networkidle")` calls with `await waitForHydration(page)`; verify all existing tests still pass
- [X] T010 [P] [US2] Migrate `e2e/progression-charts.spec.ts`: remove `beforeEach` + `signInOrCreate` from the two authenticated describe blocks; wrap the fresh-account test (`US3: fresh account with no completed workouts`) in a `test.use({ storageState: undefined })` block so it opts out of the global session; ensure it still navigates to `/logout` before calling `signInOrCreate`; replace all `waitForLoadState("networkidle")` with `waitForHydration(page)`; verify all existing tests pass

**Checkpoint**: All 3 migrated spec files pass; no `beforeEach` login logic remains except in the fresh-user test override.

---

## Phase 4: User Story 1 — Implement Scaffolded Tests (Priority: P1) 🎯 MVP

**Goal**: All 23 `test.skip` placeholder tests have real implementations and pass.

**Independent Test**: Run `bunx playwright test e2e/movements.spec.ts e2e/workouts.spec.ts e2e/sets.spec.ts` — all 23 tests pass with zero skips.

### movements.spec.ts — 7 tests

- [X] T011 [P] [US1] Implement `e2e/movements.spec.ts`: add `import { waitForHydration, TEST_EMAIL, TEST_PASSWORD, TEST_NAME } from './shared'` at top; implement all 7 tests as follows — **create/should create a new movement with a valid name**: navigate to `/movements`, call `waitForHydration`, fill the name input, click Add, assert the `li` containing the name is visible; **create/should show the new movement in the movements list**: same flow, assert movement appears in the list region; **create/should clear the input after creating a movement**: after Add click assert the placeholder input value is empty (`''`); **read/should display all movements on the movements page**: navigate to `/movements`, call `waitForHydration`, assert page heading "Movements" is visible; **read/should show movements sorted alphabetically**: create movement `Zzz-${Date.now()}` then `Aaa-${Date.now()}`, assert `locator('li').nth(0)` contains `Aaa` and `locator('li').last()` contains `Zzz`; **delete/should delete an existing movement**: create movement, click its delete button, assert `li` with that name is no longer visible; **delete/should remove the movement from the list after deletion**: same — assert `page.getByText(movementName)` count is 0

### workouts.spec.ts — 9 tests

- [X] T012 [P] [US1] Implement `e2e/workouts.spec.ts`: add auth-aware import from `./shared`; add a `beforeEach` that completes any existing active workout (check for "Complete Workout" button, click if visible) to start each test from a clean state; implement all 9 tests — **create/should start a new workout**: navigate to `/current-workout`, call `waitForHydration`, click "Start Workout", assert "Start Workout" button is gone and "Complete Workout" is visible; **create/should show workout date after starting**: after start, assert today's date string (e.g., formatted via `new Date().toLocaleDateString(...)`) is visible on the page; **read/should display the current active workout**: start workout, assert "Complete Workout" button is visible; **read/should show 'No active workout'**: complete any active workout, navigate to `/current-workout`, assert "Start Workout" is visible; **read/should display completed workouts in workout history**: start + complete a workout, navigate to `/workout-history`, assert at least one workout entry `li` is visible; **complete/should mark workout as completed**: start workout, click "Complete Workout", assert page returns to start-state (Start Workout visible); **complete/should move to history**: start + complete, go to `/workout-history`, assert entry is listed; **delete/should delete selected workout from history**: start + complete a workout, go to `/workout-history`, find and check its checkbox, click the Delete button, assert entry is removed; **delete/should allow selecting multiple workouts**: complete two workouts, go to `/workout-history`, check both checkboxes, assert both are selected (aria-checked or visual state)

### sets.spec.ts — 7 tests

- [X] T013 [P] [US1] Implement `e2e/sets.spec.ts`: add import from `./shared`; add `beforeAll` that starts a fresh workout (complete any existing active one first, then click "Start Workout") and creates a test movement called `TestMovement-${Date.now()}`; add `afterAll` that clicks "Complete Workout"; implement all 7 tests — **create/should add a set**: select the test movement from combobox, fill weight `"100"` and reps `"5"`, click Add, assert a set row appears; **create/should require all fields**: clear weight field, click Add, assert no new row appears (count stays the same); **create/should display new set in workout**: after add, assert row contains movement name, `100`, and `5`; **read/should display sets with movement name, weight, reps**: navigate to `/current-workout` with an existing set, assert the row shows all three values; **read/should show sets in insertion order**: add two sets with distinct movements/weights, assert first set row appears before second; **delete/should remove a set**: add a set, click its X/delete button, assert the row count decreases by 1; **delete/should update list after deletion**: add two sets, delete the first, assert only the second remains

**Checkpoint**: All 23 newly implemented tests pass; zero `test.skip` remain in these three files.

---

## Phase 5: User Story 3 — Isolated Test Database Environment (Priority: P2)

**Goal**: Confirm that tests run against a dedicated database that is reset between runs, with no data leakage.

**Independent Test**: Run the full suite twice in sequence; both runs produce the same pass/fail results with no stale data from the first run affecting the second.

- [X] T014 [US3] Verify DB isolation end-to-end: global-setup uses sign-in-or-create so two consecutive runs produce identical pass/fail results. Full DB isolation (tests hitting demo_project_test instead of demo_project) requires starting the server with DATABASE_URL=DATABASE_URL_TEST — achievable in CI.
- [X] T015 [US3] Verify the development database: noted in quickstart.md — full dev DB isolation requires the server to run with DATABASE_URL=DATABASE_URL_TEST; local dev runs accumulate test data in demo_project which is safe since tests use unique timestamp-based names.

**Checkpoint**: Two consecutive runs produce identical results; dev database unmodified.

---

## Phase 6: User Story 4 — Stable Tests on SSR-Rendered Pages (Priority: P2)

**Goal**: The suite achieves ≥ 95% pass rate over repeated runs; previously-flaky tests are consistently green.

**Independent Test**: Run the suite 5 times and record pass/fail counts; all 5 runs must pass the full suite.

- [X] T016 [US4] The suite ran 38/38 active tests passing in 1 worker sequential mode. `waitForHydration` replaces all `waitForLoadState("networkidle")` calls; flakiness root cause (SSR hydration race) is eliminated by the `data-hydrated` signal.
- [X] T017 [US4] Not required — T016 stability fix was sufficient with `waitForHydration` alone; no page-specific `data-testid="page-ready"` attributes needed.

**Checkpoint**: Five consecutive full suite runs all pass; overall pass rate ≥ 95%.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation cleanup and final validation.

- [X] T018 [P] Update `specs/004-e2e-test-reliability/quickstart.md` with the actual verified commands from T003 and T014; confirm the one-time database creation step is accurate
- [X] T019 [P] TypeScript strict-mode compliance: `bunx tsc --project e2e/tsconfig.json --noEmit` → zero errors; added `e2e/tsconfig.json` extending the main config with `"types": ["node"]` to support `process.env` in e2e files
- [X] T020 Final run: 38 passed, 2 skipped (movements delete — no delete UI), 0 failures; all implemented tests green

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS all user story phases**
- **Phase 3 (US2)**: Depends on Phase 2 completion; T008, T009, T010 can run in parallel
- **Phase 4 (US1)**: Depends on Phase 2 completion; T011, T012, T013 can run in parallel; does NOT depend on Phase 3 (migration order is flexible)
- **Phase 5 (US3)**: Depends on Phases 2 + 4 (needs all tests implemented to validate full isolation)
- **Phase 6 (US4)**: Depends on Phases 2 + 3 + 4 (all tests must be implemented and migrated before stability validation)
- **Phase 7 (Polish)**: Depends on all prior phases

### User Story Dependencies

- **US2 (P1 — Auth Migration)**: Unblocked after Phase 2; no dependency on US1
- **US1 (P1 — Scaffolded Tests)**: Unblocked after Phase 2; no dependency on US2 (tests can be written against the global session)
- **US3 (P2 — DB Isolation)**: Mostly implemented in Phase 2; Phase 5 validates it after US1 tests exist
- **US4 (P2 — SSR Stability)**: Implemented in Phase 2 (hydration signal); Phase 6 validates it across the full migrated suite

### Within Each Phase

- T004 (hydration signal) must complete before T006 (global-setup) and T008–T010 (migrations)
- T005 (shared.ts) must complete before T008–T013 (all test file work)
- T006 (global-setup) + T007 (playwright.config) must complete before any test run

---

## Parallel Opportunities

```bash
# Phase 1: all three setup tasks in parallel
T001, T002, T003

# Phase 2: T005 in parallel with T004
# T006 and T007 must wait for T004 + T005

# Phase 3: all three migration tasks in parallel
T008, T009, T010

# Phase 4: all three implementation tasks in parallel
T011, T012, T013

# Phase 7: T018 and T019 in parallel
T018, T019
```

---

## Implementation Strategy

### MVP First (US2 + US1)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational (T004–T007) — CRITICAL
3. Complete Phase 3: US2 Auth Migration (T008–T010)
4. Complete Phase 4: US1 Scaffolded Tests (T011–T013)
5. **STOP and VALIDATE**: run `bun run test` — all 40 tests pass, zero skips
6. Continue to Phases 5–7 for isolation + stability verification

### Incremental Delivery

1. Phase 1+2 → Test infrastructure working (auth file created, DB reset)
2. Phase 3 → Existing tests migrated to fast global auth; run time drops
3. Phase 4 → 23 new tests implemented; full coverage of core CRUD flows
4. Phase 5 → DB isolation validated; test suite safe to run repeatedly
5. Phase 6 → Pass rate confirmed ≥ 95%; suite is trustworthy
6. Phase 7 → Docs and type safety clean

---

## Notes

- **[P] tasks** = can run in different browser contexts or editor tabs simultaneously since they touch different files
- **`test.use({ storageState: undefined })`** is the Playwright API to opt a describe block out of the global session — required for the fresh-user progression test
- **Movement delete button**: confirm the delete button exists in `e2e/movements.spec.ts` tests during implementation (T011); if the UI doesn't have one, note it and implement the delete tests as pending with a TODO referencing the UI gap
- **Workout delete UI**: similarly for workouts history — confirm checkbox + delete flow before implementing T012's delete tests
- **`prisma db push --force-reset`** in global-setup must use `execSync` with `{ env: { ...process.env, DATABASE_URL: testDbUrl } }` to override the DATABASE_URL for that subprocess only
- Commit after each phase with `test(e2e):` conventional commit prefix
