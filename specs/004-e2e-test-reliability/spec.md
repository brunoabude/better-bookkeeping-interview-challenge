# Feature Specification: E2E Test Suite Reliability & Completeness

**Feature Branch**: `004-e2e-test-reliability`

**Created**: 2026-05-24

**Status**: Draft

**Input**: User description: "lets specify the e2e tests. We have missing tests that are already scaffolded but not implemented that needs to be implemented. Also, we must run the tests in a isolated environment, specially the database. The current implemented tests are doing login logic in each run, lets use a global state for the login. Also, the current tests are really flaky. They do work 50% of the time, but the randomness and the failure rate is unnaceptable. This is probably happening due to the fact that the frontend is SSR and the hydration / state updating process are not interacting very nicely with playwright."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Implement Scaffolded Tests (Priority: P1)

A developer running the test suite expects every scaffolded test (currently marked as skipped with TODO comments) to be fully implemented and covering the intended behavior. The affected test files are `workouts.spec.ts`, `movements.spec.ts`, and `sets.spec.ts`, which contain create, read, and delete scenarios that are currently placeholders.

**Why this priority**: Unimplemented tests provide a false sense of coverage. This is the most directly actionable gap — the skeletons already exist and the behaviors they cover are critical application flows.

**Independent Test**: Can be validated by running only the previously-skipped tests and confirming they pass without relying on any other test infrastructure changes.

**Acceptance Scenarios**:

1. **Given** a developer runs the full e2e test suite, **When** all tests complete, **Then** no test is marked as skipped with a TODO comment — every scaffolded test either passes or fails with a real assertion.
2. **Given** the movements test suite runs, **When** it executes the create, read, and delete scenarios, **Then** each scenario makes assertions against actual application behavior (creation confirmation, list display, removal confirmation).
3. **Given** the workouts test suite runs, **When** it executes the create, read, and delete scenarios, **Then** each scenario validates starting a workout, viewing it, and completing or discarding it.
4. **Given** the sets test suite runs, **When** it executes the create, read, and delete scenarios, **Then** each scenario validates adding a set to an active workout, verifying it appears, and removing it.

---

### User Story 2 - Shared Global Authentication State (Priority: P1)

A developer running the test suite expects login to happen once per test run (or once per worker), not before every individual test. Currently, each test that needs an authenticated user calls `signInOrCreate` in a `beforeEach` hook, repeating the full login flow and inflating test duration unnecessarily.

**Why this priority**: Repeated login adds substantial overhead to every test run and is a common source of flakiness (network timing, redirect races). Centralizing it eliminates an entire class of failures.

**Independent Test**: Can be validated by measuring run duration before and after, and confirming that the application recognizes the user as logged in at the start of each test without executing the sign-in form flow.

**Acceptance Scenarios**:

1. **Given** the test suite starts, **When** a global setup phase runs, **Then** a single authenticated session is created and saved as browser storage state (cookies, localStorage) on disk.
2. **Given** individual tests need an authenticated user, **When** they start, **Then** they load the saved session state instead of navigating to the sign-in page and filling in credentials.
3. **Given** the saved session is loaded, **When** a test navigates to any authenticated page, **Then** the application treats the user as logged in without triggering a redirect to sign-in.
4. **Given** a test explicitly requires an unauthenticated user (e.g., the fresh-account empty-state test), **When** that test runs, **Then** it opts out of the global session and manages its own authentication state.

---

### User Story 3 - Isolated Test Database Environment (Priority: P2)

A developer running the test suite expects tests to run against a dedicated, isolated database that is reset to a known state before each run, preventing data from one test run from affecting another.

**Why this priority**: Without isolation, tests that create or mutate data accumulate state across runs, causing assertion failures based on leftover entries. This is especially damaging when tests run in parallel.

**Independent Test**: Can be validated by running the full suite twice in sequence and confirming both runs produce the same results, with no data leakage between runs.

**Acceptance Scenarios**:

1. **Given** the test suite is about to run, **When** the global setup phase executes, **Then** the test database is seeded to a clean, known state (or reset to empty) before any test touches it.
2. **Given** one test creates data (e.g., a movement named `Pull-ups-${Date.now()}`), **When** the next test run starts, **Then** that data is not present in the database.
3. **Given** tests run in parallel across multiple workers, **When** different workers write to the database simultaneously, **Then** the data written by one worker does not cause assertion failures in another worker's tests.
4. **Given** the test environment is configured, **When** a developer runs the suite locally, **Then** a separate test database (distinct from the development database) is used automatically.

---

### User Story 4 - Stable Tests on SSR-Rendered Pages (Priority: P2)

A developer running the test suite expects tests to pass consistently, not 50% of the time. The current flakiness is caused by the application's server-side rendering (SSR) and client-side hydration completing at unpredictable times, leading Playwright to interact with the page before React has taken control of interactive elements.

**Why this priority**: A 50% failure rate makes the test suite untrustworthy. Developers cannot confidently use a suite that fails randomly. Fixing reliability unlocks the value of the entire suite.

**Independent Test**: Can be validated by running the same test 10 consecutive times and observing a pass rate of 95% or higher without test logic changes.

**Acceptance Scenarios**:

1. **Given** a test navigates to any page in the application, **When** Playwright interacts with a form field or button, **Then** the interaction succeeds because the test waited for the element to be in a fully interactive (hydrated) state before acting.
2. **Given** a test submits a form after navigation, **When** the form submit button is clicked, **Then** the expected result (new data appearing, confirmation message) is visible — not a stale or unresponsive UI.
3. **Given** any test in the suite is run 10 consecutive times in isolation, **When** all runs complete, **Then** at least 9 out of 10 pass (≥ 90% pass rate per test, targeting ≥ 95% overall suite stability).
4. **Given** the existing `waitForLoadState("networkidle")` calls, **When** replaced with more precise hydration-aware waiting strategies, **Then** tests no longer intermittently fail due to timing mismatches between SSR output and client hydration.

---

### Edge Cases

- What happens when the test database is unavailable at suite startup — should the suite fail fast with a clear error?
- How does the global auth session behave when the session token expires mid-run?
- What happens if two parallel workers try to create the same named movement in the movements test?
- How should tests that require a fresh/anonymous user (e.g., the empty-state progression chart test) interact with the global auth session?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The test suite MUST implement all tests currently marked with `test.skip` and a TODO comment in `workouts.spec.ts`, `movements.spec.ts`, and `sets.spec.ts`, replacing placeholder bodies with real assertions.
- **FR-002**: The test suite MUST establish a global authenticated session once per run using a designated test account, persisting the session state to disk for reuse across all tests that require authentication.
- **FR-003**: Individual tests MUST load the persisted session state at startup rather than navigating to the sign-in or create-account pages, unless the test explicitly requires an unauthenticated context.
- **FR-004**: The test suite MUST run against an isolated database environment that is separate from the development database and reset to a known clean state before each full test run.
- **FR-005**: Each test that creates data MUST either clean up after itself or rely on the global database reset to ensure no state leaks between runs.
- **FR-006**: Tests MUST use interaction-ready waiting strategies — waiting for specific elements to be visible, enabled, and attached to the DOM rather than relying solely on network-idle signals — to avoid flakiness caused by SSR hydration timing.
- **FR-007**: The pass rate of the complete test suite MUST reach at least 95% when run in a stable environment (consecutive runs with no code changes).
- **FR-008**: The test runner configuration MUST support running the suite both locally (against a local dev stack) and in CI without code changes — only environment variables differ.

### Key Entities

- **Test Session State**: The persisted browser authentication state (cookies and storage) generated during global setup, reused by individual tests.
- **Test Database**: A dedicated database instance or schema used exclusively by the test suite, seeded to a known state before each run.
- **Scaffolded Test**: An existing `test.skip(...)` block with a TODO comment that requires a real implementation — located in `workouts.spec.ts`, `movements.spec.ts`, and `sets.spec.ts`.
- **Hydration-Aware Wait**: A waiting strategy that targets element-level readiness (visible, enabled, attached) rather than broad page-level signals, compensating for SSR/hydration timing.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of previously-skipped scaffolded tests are implemented and make at least one meaningful assertion — zero tests remain with a TODO placeholder body.
- **SC-002**: The sign-in form flow is executed at most once per test run regardless of how many tests require authentication — verified by counting sign-in page navigations during a full run.
- **SC-003**: Running the full suite twice in sequence produces identical pass/fail results, confirming no data leaks between runs.
- **SC-004**: The complete test suite achieves a pass rate of 95% or higher when run 5 consecutive times without code changes in a stable environment.
- **SC-005**: Total test suite runtime decreases by at least 20% compared to the baseline (before shared auth session) due to eliminated repeated login flows.
- **SC-006**: Tests that were previously flaky (weight, bodyweight-movements, progression-charts) achieve individual pass rates of 95% or higher over 10 consecutive runs.

## Assumptions

- The application already has a working test user account creation flow and the `signInOrCreate` helper will be adapted or replaced by the global setup mechanism.
- The database isolation strategy will use a separate test database (not a transaction-rollback approach), since the app is an SSR application and transaction management across HTTP requests is impractical.
- Tests that require unique data names (e.g., `Pull-ups-${Date.now()}`) will continue using timestamps or unique identifiers to avoid name conflicts across parallel workers.
- The SSR hydration issue is addressable at the test layer (by using more precise wait conditions) without requiring application code changes.
- The CI environment can provide a dedicated database instance for testing (e.g., via environment variables pointing to a test database URL).
- The `progression-charts.spec.ts` test that creates a fresh account will be adapted to work alongside the global session by using an isolated browser context rather than the shared one.
