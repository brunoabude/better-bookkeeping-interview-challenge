# Implementation Plan: E2E Test Suite Reliability & Completeness

**Branch**: `004-e2e-test-reliability` | **Date**: 2026-05-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-e2e-test-reliability/spec.md`

## Summary

Harden the Playwright e2e test suite by: (1) implementing all 23 currently-skipped scaffolded tests across `workouts.spec.ts`, `movements.spec.ts`, and `sets.spec.ts`; (2) introducing Playwright's global setup + `storageState` to share a single authenticated session across all tests instead of logging in before every test; (3) isolating the test database via a `DATABASE_URL_TEST` environment variable and resetting it in global setup; and (4) eliminating SSR hydration flakiness by adding a `data-hydrated` DOM signal to the root layout and replacing `waitForLoadState("networkidle")` with a `waitForHydration()` helper throughout all test files.

## Technical Context

**Language/Version**: TypeScript 5.x, strict mode

**Primary Dependencies**: Playwright 1.57+, Prisma (PostgreSQL), TanStack Start (React SSR)

**Storage**: PostgreSQL — a dedicated `demo_project_test` database, distinct from the dev database, used exclusively by the test suite

**Testing**: Playwright for e2e (this feature); Vitest (existing, not modified)

**Target Platform**: Linux (Docker dev environment, local + CI)

**Project Type**: Web application (SSR React frontend + server functions)

**Performance Goals**: Full suite completes in < 5 minutes locally; ≥ 95% pass rate over 5 consecutive runs

**Constraints**: No changes to production application behaviour; test infrastructure changes only (except the `data-hydrated` attribute added to `__root.tsx`)

**Scale/Scope**: 6 test files, ~40 total tests (23 new + ~17 existing)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Type Safety | ✅ PASS | All new files use TypeScript. `global-setup.ts` uses `FullConfig` from `@playwright/test`. `shared.ts` types extended correctly. |
| II. Test Coverage | ✅ PASS | This feature _is_ the test coverage work. All scaffolded tests are implemented; the feature closes the explicit gap named in the constitution. |
| III. Security by Default | ✅ PASS | Test credentials read from env variable (`E2E_TEST_PASSWORD`); hardcoded default only for local dev. Auth state file is gitignored. |
| IV. Simplicity & YAGNI | ✅ PASS | No new abstractions beyond `waitForHydration()` (used 15+ times = justified) and `globalSetup`. No speculative helpers. |
| V. Conventional Commits | ✅ PASS | Commits will use `test(e2e):` prefix per spec. |

## Project Structure

### Documentation (this feature)

```text
specs/004-e2e-test-reliability/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
e2e/
├── .auth/
│   └── user.json            # NEW — gitignored; persisted auth session
├── global-setup.ts          # NEW — DB reset + auth state creation
├── shared.ts                # MODIFIED — remove signInOrCreate; add waitForHydration + TEST_* constants
├── weight.spec.ts           # MODIFIED — remove beforeEach login; use waitForHydration
├── workouts.spec.ts         # IMPLEMENTED — 9 skipped tests filled in
├── movements.spec.ts        # IMPLEMENTED — 7 skipped tests filled in
├── sets.spec.ts             # IMPLEMENTED — 7 skipped tests filled in
├── bodyweight-movements.spec.ts  # MODIFIED — remove beforeEach login; use waitForHydration
└── progression-charts.spec.ts    # MODIFIED — remove beforeEach login; fresh-user test uses isolated context

playwright.config.ts         # MODIFIED — globalSetup, storageState, actionTimeout, retries
.env.test.example            # NEW — documents required env vars for test runs
.gitignore                   # MODIFIED — add e2e/.auth/

src/routes/__root.tsx        # MODIFIED — add data-hydrated attribute via useEffect
```

**Structure Decision**: Single project layout; all changes are within `e2e/` and `playwright.config.ts` except the one-line hydration signal in `__root.tsx`.

---

## Implementation Phases

### Phase A — Infrastructure (do first, unblocks all other work)

**A1. Database isolation**
- Create `.env.test.example` documenting `DATABASE_URL_TEST` and `E2E_TEST_PASSWORD`
- Update `playwright.config.ts`: read `process.env.DATABASE_URL_TEST` and set it as `DATABASE_URL` for the test process
- Verify `prisma db push --force-reset` works against the test database

**A2. Global setup + auth state**
- Create `e2e/global-setup.ts`:
  - Set `DATABASE_URL` to `DATABASE_URL_TEST` (or default test DB URL)
  - Run `prisma db push --force-reset` to clean the schema
  - Launch a browser, navigate to `/create-account`, create the test user
  - Save `context.storageState()` to `e2e/.auth/user.json`
- Update `playwright.config.ts`:
  - `globalSetup: './e2e/global-setup.ts'`
  - `use.storageState: './e2e/.auth/user.json'`
  - `use.actionTimeout: 15_000`
  - `retries: process.env.CI ? 1 : 0`
  - `fullyParallel: false`
- Add `e2e/.auth/` to `.gitignore`

**A3. Hydration signal**
- In `src/routes/__root.tsx`, add a `useEffect` that sets `document.documentElement.setAttribute('data-hydrated', 'true')` after mount
- In `e2e/shared.ts`, replace `signInOrCreate` (remove) with `waitForHydration(page: Page)` helper:
  ```ts
  export async function waitForHydration(page: Page) {
    await page.locator('[data-hydrated="true"]').waitFor({ state: 'attached', timeout: 15_000 });
  }
  ```
- Export consolidated `TEST_EMAIL`, `TEST_PASSWORD`, `TEST_NAME` constants (single source of truth)

### Phase B — Migrate Existing Tests

**B1. weight.spec.ts**
- Remove `beforeEach` + `signInOrCreate` call
- Replace all `waitForLoadState("networkidle")` with `waitForHydration(page)`

**B2. bodyweight-movements.spec.ts**
- Remove `beforeEach` + `signInOrCreate` calls from both `describe` blocks
- Replace all `waitForLoadState("networkidle")` with `waitForHydration(page)`

**B3. progression-charts.spec.ts**
- Remove `beforeEach` + `signInOrCreate` from the two authenticated describe blocks
- Fresh-account test (`US3: fresh account`): keep its `/logout` navigation + `signInOrCreate` since it intentionally needs a new account; wrap in its own `test.use({ storageState: undefined })` block to opt out of global session
- Replace all `waitForLoadState("networkidle")` with `waitForHydration(page)`

### Phase C — Implement Scaffolded Tests

All new tests follow the pattern:
1. `waitForHydration(page)` after navigation
2. Unique names via `Date.now()` suffix where needed
3. Cleanup at end of test (delete created entities)

**C1. movements.spec.ts** — 7 tests

Add `beforeAll` (or shared setup) that ensures auth is loaded, then implement:

- `create / should create a new movement with a valid name`:
  Navigate to `/movements`, fill movement name input, click Add, assert `li` with the name is visible.

- `create / should show the new movement in the movements list`:
  After creation, assert the movement appears in the `ul`/list region.

- `create / should clear the input after creating a movement`:
  After creation, assert the name input value is empty.

- `read / should display all movements on the movements page`:
  Navigate to `/movements`, assert the page heading is visible and at least one `li` is present (create one first if needed).

- `read / should show movements sorted alphabetically`:
  Create two movements with known names (e.g., `Zzz-${Date.now()}` and `Aaa-${Date.now()}`), assert the Aaa movement's `li` appears before the Zzz movement's `li` in the DOM.

- `delete / should delete an existing movement`:
  Create a movement, click its delete button, assert the `li` is no longer visible.

- `delete / should remove the movement from the list after deletion`:
  Variation of above — assert the entire list no longer contains the movement name text.

**C2. workouts.spec.ts** — 9 tests

Each test that starts a workout must complete or discard it at the end (cleanup).

- `create / should start a new workout from the current workout page`:
  Navigate to `/current-workout`, complete any active workout first, click "Start Workout", assert the page no longer shows the "Start Workout" button.

- `create / should show the workout date after starting`:
  After starting, assert a date string is visible on the page (formatted date of today).

- `read / should display the current active workout`:
  Start a workout, assert the "Complete Workout" button is visible.

- `read / should show 'No active workout' when none exists`:
  Complete any active workout, navigate to `/current-workout`, assert "No active workout" or "Start Workout" text is visible.

- `read / should display completed workouts in workout history`:
  Start + complete a workout, navigate to `/workout-history`, assert at least one entry is visible.

- `complete / should mark the current workout as completed`:
  Start a workout, click "Complete Workout", assert the page returns to the start-workout state.

- `complete / should move completed workout to history`:
  Start + complete a workout, navigate to `/workout-history`, assert the workout entry is listed.

- `delete / should delete selected workouts from history`:
  Create + complete a workout, navigate to `/workout-history`, select the workout via checkbox, click Delete, assert it is removed.

- `delete / should allow selecting multiple workouts for deletion`:
  Create + complete two workouts, select both checkboxes, assert both delete buttons are enabled (or confirm multi-select UI appears).

**C3. sets.spec.ts** — 7 tests

Sets require an active workout. Each test starts a workout in `beforeAll`, adds sets, then completes the workout in `afterAll`.

- `create / should add a set to the current workout`:
  Select a movement, fill weight + reps, click Add, assert a set row appears.

- `create / should require movement, weight, and reps to add a set`:
  Leave one field empty, click Add, assert no new row appears (or an error is shown, depending on app behavior).

- `create / should display the new set in the workout`:
  After adding, assert the set row shows the movement name, weight, and rep count.

- `read / should display sets with movement name, weight, and reps`:
  Navigate to active workout with an existing set, assert the set row contains all three values.

- `read / should show sets in the order they were added`:
  Add two sets with distinct movements, assert they appear in insertion order (first set on top).

- `delete / should remove a set from the current workout`:
  Add a set, click its delete (X) button, assert the row is gone.

- `delete / should update the sets list after deletion`:
  Add two sets, delete the first, assert only the second remains.

---

## Key Implementation Notes

1. **`prisma db push --force-reset` in globalSetup** requires `DATABASE_URL` env to be set to the test DB before the Prisma CLI is invoked. Use `execa` or `child_process.execSync` with the `DATABASE_URL` env override.

2. **`test.use({ storageState: undefined })`** — the correct Playwright API to opt a describe block out of the global storage state. The fresh-user progression test must be in such a block.

3. **`data-hydrated` attribute placement** — set on `document.documentElement` (the `<html>` element) so `page.locator('[data-hydrated="true"]')` matches a single stable element regardless of page content.

4. **Movement deletion UI** — the movements page doesn't currently show a delete button in the scaffolded code read during research. Verify during implementation; if no delete exists, the movements delete tests may need to be deferred with a note in the tasks.

5. **Workout history delete UI** — similarly, verify the checkbox/delete UI for workout history exists before implementing those tests.

6. **No `fullyParallel: true`** — keeping per-file parallelism avoids two workers simultaneously writing to the same workout (only one active workout per user at a time). If per-user isolation is needed in future, each worker would need its own test user.
