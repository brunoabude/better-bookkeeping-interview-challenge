# Research: E2E Test Suite Reliability & Completeness

**Feature**: 004-e2e-test-reliability  
**Date**: 2026-05-24

---

## 1. Global Authentication State

### Decision
Use Playwright's native `globalSetup` + `storageState` pattern. A dedicated global setup script runs once before the suite, performs login via the application UI, and saves the resulting browser state (cookies + localStorage) to `e2e/.auth/user.json`. The `playwright.config.ts` `use.storageState` option then loads that file into every test browser context automatically.

### Rationale
- This is the Playwright-documented standard approach for shared authentication.
- Eliminates `signInOrCreate` from every `beforeEach` hook, removing the most common source of login-related flakiness.
- Tests that require an **unauthenticated** context (e.g., the fresh-account empty-state progression test) use a separate `browserContext` fixture that ignores `storageState`, or navigate to `/logout` before their flow.
- `e2e/.auth/` must be added to `.gitignore` since it contains session credentials.

### Alternatives Considered
- **Per-worker login via fixture** — saves auth once per worker rather than once globally. More complex fixture setup; unnecessary given the suite currently runs single-worker in CI (`workers: 1`).
- **Mocking the auth cookie** — bypasses the actual auth flow; risks diverging from production session format and is fragile against session schema changes.

---

## 2. Database Isolation Strategy

### Decision
Introduce a `DATABASE_URL_TEST` environment variable that points to a dedicated test database (e.g., `demo_project_test`). The global setup script runs `prisma db push --force-reset` against this URL before tests begin, wiping and re-applying the schema to a clean state. All tests run with `DATABASE_URL` set to `DATABASE_URL_TEST`.

### Rationale
- Separate database ensures dev data is never touched during test runs.
- `prisma db push --force-reset` is idempotent and always leaves the schema in a known clean state without requiring migration history.
- Docker Compose already exposes PostgreSQL on port 5432; adding a second database (`demo_project_test`) to the same Postgres instance requires no additional infrastructure — just a `CREATE DATABASE` on first setup.
- Using an environment variable means no code path divergence between local and CI runs — only the value changes.

### Alternatives Considered
- **Transaction rollback per test** — impractical with SSR/HTTP requests; Prisma Client sessions do not share a transaction boundary with Playwright's HTTP requests.
- **SQLite in-memory for tests** — breaks PostgreSQL-specific behaviors (e.g., `@@unique` constraints evaluated differently, UUID functions); incompatible with the existing Prisma schema's PostgreSQL features.
- **Docker Compose test service** — cleanest isolation but adds significant CI complexity; deferred as a future improvement.

---

## 3. SSR Hydration Timing & Flakiness Fix

### Decision
Add a `data-hydrated="true"` attribute to the root layout element (`src/routes/__root.tsx`) using a `useEffect` hook that fires after the first client-side render. Create a `waitForHydration(page)` helper in `e2e/shared.ts` that waits for `[data-hydrated="true"]` to appear in the DOM. Replace all `page.waitForLoadState("networkidle")` calls in tests with `await waitForHydration(page)`.

Additionally, set `use.actionTimeout: 15_000` in `playwright.config.ts` to give Playwright's auto-waiting enough time to resolve actionability checks.

### Rationale
- **Root cause**: TanStack Start sends HTML from the server (SSR), then loads the React bundle client-side, then hydrates. Playwright's `networkidle` fires after the HTML response and the initial bundle loads, but React's concurrent-mode hydration can still be in-progress. Clicking or filling inputs before hydration completes results in the event handler not being attached — the interaction is silently swallowed.
- **`data-hydrated` signal**: A `useEffect` in the root component runs only on the client after React takes over the DOM. Setting `data-hydrated="true"` at that point is a reliable, zero-cost hydration signal. Playwright's `locator.waitFor()` polls the DOM efficiently.
- **No app changes for individual pages**: The signal is on the root layout, so a single wait covers all routes.
- **Increased `actionTimeout`**: Default is 5s. SSR + hydration on a dev server can easily exceed this under load. 15s is a safe ceiling without masking real failures.

### Alternatives Considered
- **`waitForLoadState("domcontentloaded")` + element wait**: Still subject to the same hydration race; DOMContentLoaded fires even earlier than networkidle.
- **`page.waitForTimeout(1000)` after networkidle**: Arbitrary delay that is simultaneously too slow (adds 1s per test) and too fragile (won't scale to slower environments).
- **`page.waitForFunction(() => window.__TANSTACK_ROUTER_HYDRATED__)`**: Requires checking TanStack Router internals, which may change across versions.
- **Intercept React's `hydrateRoot` completion**: No stable public event; requires patching the React bundle.

---

## 4. Implementing Scaffolded Tests

### Decision
Implement all 23 skipped tests across `workouts.spec.ts`, `movements.spec.ts`, and `sets.spec.ts`. Each test uses the global auth state (no login per test), uses `waitForHydration` instead of `waitForLoadState("networkidle")`, and uses Playwright's built-in auto-waiting for assertions.

### Test Inventory

**movements.spec.ts** (7 tests):
- create: name + Add → item in list; item in list after creation; input cleared after creation
- read: all movements shown on `/movements`; movements shown in alphabetical order
- delete: delete button removes movement; movement absent from list after delete

**workouts.spec.ts** (9 tests):
- create: Start Workout button starts workout; date shown after start
- read: active workout displayed; "No active workout" shown when none; completed workouts in history
- complete: Complete Workout marks it done; completed workout moves to history
- delete: checkbox + delete removes workout from history; multiple selection works

**sets.spec.ts** (7 tests):
- create: Add with movement + weight + reps adds a set; all three fields required; new set appears in list
- read: sets show movement name, weight, and reps; sets appear in insertion order
- delete: delete button removes the set; sets list updates after deletion

### Rationale
Each test is scoped to a single behavior and uses unique-named data (timestamp suffix) to avoid cross-test conflicts even under parallel execution. Cleanup (delete created data) is performed at the end of tests that create durable data, as a belt-and-suspenders supplement to the global DB reset.

---

## 5. Playwright Configuration Updates

### Decision
Update `playwright.config.ts` with:
```
globalSetup: './e2e/global-setup.ts'
use.storageState: './e2e/.auth/user.json'
use.actionTimeout: 15_000
retries: 0 (local), 1 (CI)
```

Remove `fullyParallel: true` in favor of per-file parallelism while keeping `workers: undefined` (auto) locally and `workers: 1` in CI to avoid DB write conflicts between parallel workers.

### Rationale
- `storageState` at the `use` level applies to all projects globally; individual tests that need anonymous context override this with `page.context().storageState = undefined` or by using a fresh context.
- `retries: 1` in CI (reduced from 2) is acceptable given the flakiness fix eliminates most non-deterministic failures; two retries masked the underlying problem.
- `fullyParallel: false` (per-file parallelism) reduces DB write contention risk; true parallelism can be re-enabled once per-worker DB isolation is implemented.
