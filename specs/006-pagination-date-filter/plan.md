# Implementation Plan: Workout History, Weight Tracking & Movements Pagination with Date Range Filtering

**Branch**: `006-pagination-date-filter` | **Date**: 2026-06-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-pagination-date-filter/spec.md`

**Note**: This plan reflects a re-plan pass to align all design artifacts with updated spec constraints: unified 90-day maximum date range across all paginated pages, page size reduced from 20 → 5, and introduction of a dedicated e2e test database with global setup/teardown.

## Summary

Adds server-side pagination and date range filtering to the Workout History, Weight Tracking, and Movements pages. All three pages return fixed-size slices (5 items/page) from the database using Prisma `take`/`skip`. The date-filtered pages (Workout History and Weight Tracking) enforce a 90-day maximum window; Movements has no date filter. Pagination and date state are encoded in URL search params via TanStack Router `validateSearch`. A dedicated PostgreSQL database (separate from dev) is used for Playwright e2e tests — cleaned and migrated in Playwright's global setup before any test runs.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)

**Primary Dependencies**:
- TanStack Start (React SSR framework)
- TanStack Router (file-based; `validateSearch` + `loaderDeps` for URL search param state)
- TanStack Query (`useSuspenseQuery`, query key includes `{ startDate, endDate, page }`)
- Prisma ORM (PostgreSQL; `take`/`skip` for pagination, `$transaction` for count + data atomicity)
- `@better-bookkeeping/ui` (shadcn wrapper; `Pagination` component lives in `src/components/ui/pagination.tsx`)
- `lucide-react` (`AlertCircle` icon for invalid range feedback)
- Playwright (e2e tests in `e2e/`)

**Storage**: PostgreSQL via Prisma. No schema changes required — existing `Workout.completedAt` and `WeightEntry.date` fields are the filter targets. A dedicated test database (`better_bookkeeping_test` or equivalent) is created and managed by Playwright global setup.

**Testing**: Playwright for e2e (files: `e2e/workouts.spec.ts`, `e2e/weight.spec.ts`, `e2e/movements.spec.ts`, `e2e/progression-charts.spec.ts`, `e2e/bodyweight-movements.spec.ts`, `e2e/sets.spec.ts`). Playwright global setup: create test DB if not exists, run Prisma migrations, truncate tables. Vitest for unit tests.

**Target Platform**: Web (SSR, Node/Bun server)

**Performance Goals**: First page renders within 2 s for users with up to 5 years of data (SC-001). Date/page navigation updates in under 1 s (SC-002).

**Constraints**:
- Page size: fixed at 5 items/page; not user-configurable (Assumption in spec)
- Maximum date range: 90 calendar days for both Workout History and Weight Tracking
- Full record set must NEVER be loaded and sliced client-side (FR-008)
- URL search params are the single source of truth for pagination state (FR-014, FR-017)

**Scale/Scope**: Three paginated pages; no schema migrations; one new Playwright global setup file; one new `src/hooks/use-debounce.ts` hook.

**Project Type**: Web application (SSR, single-repo fullstack)

## Constitution Check

### I. Type Safety ✅

All new code uses TypeScript strict mode. Server function input/output types are inferred from Zod validators. Route search param types are derived from `validateSearch` — no manual shape duplication. The `Pagination` component is fully typed.

### II. Test Coverage of User-Facing Flows ✅

Every user story has corresponding Playwright e2e tests:
- US1 (Workout History pagination): `e2e/workouts.spec.ts` `workout history pagination` describe block
- US2 (Weight Tracking pagination): `e2e/weight.spec.ts` `weight history pagination` describe block
- US3 (Reset): covered within US1/US2 test blocks
- US4 (Movements pagination): `e2e/movements.spec.ts`

No test files are skipped or empty at merge time.

### III. Security by Default ✅

All paginated server functions apply `authMiddleware` — no unauthenticated data access. Input is validated via Zod before any DB query. Date range bounds are validated server-side as a second layer. No internal errors or stack traces are exposed to the client.

### IV. Simplicity & YAGNI ✅

Only one shared abstraction is introduced: `useDebounce<T>` hook (called at 4 sites across two pages — exceeds the three-call-site threshold). The `Pagination` component is shared across all three pages. No speculative wrappers or HOCs. Virtualization (`@tanstack/react-virtual`) is removed from both date-filtered pages because per-page results (max 5) don't require it.

### V. Conventional Commits ✅

All commits follow `feat(scope)`, `fix(scope)`, `test(scope)` pattern as required. See tasks.md for per-task commit prefixes.

## Project Structure

### Documentation (this feature)

```text
specs/006-pagination-date-filter/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions for pagination strategy, date filtering, URL state
├── data-model.md        # Phase 1 — entities, query shapes, constants (updated 2026-06-03)
├── quickstart.md        # Phase 1 — how to run and exercise the feature
├── contracts/
│   └── server-functions.md  # Phase 1 — input/output contracts for paginated server fns
└── tasks.md             # Phase 2 — implementation task list (/speckit-tasks output)
```

### Source Code (repository root)

```text
src/
├── hooks/
│   └── use-debounce.ts                         # Shared debounce hook (new)
├── components/ui/
│   └── pagination.tsx                          # Shadcn-style Pagination component (new)
├── lib/
│   ├── workouts.server.ts                      # getWorkoutHistoryServerFn (modified: paginated, 90-day max)
│   ├── weight.server.ts                        # getWeightEntriesServerFn (modified: paginated, 90-day max)
│   └── movements.server.ts                     # getPaginatedMovementsServerFn (modified: PAGE_SIZE 5)
└── routes/__index/_layout/
    ├── workout-history/
    │   ├── index.tsx                           # Pagination + date filter UI (modified)
    │   └── -queries/workout-history.ts         # Query options (modified: accepts page + dates)
    ├── weight/
    │   ├── index.tsx                           # Pagination + date filter UI (modified)
    │   └── -queries/weight-entries.ts          # Query options (modified: accepts page + dates)
    └── movements/
        └── index.tsx                           # Pagination UI (modified)

e2e/
├── global-setup.ts                             # Playwright global setup: create test DB, run migrations, truncate (new)
├── workouts.spec.ts                            # Updated: regex URL assertions, 90-day defaults
├── weight.spec.ts                              # Updated: regex URL assertions, 90-day defaults
├── movements.spec.ts                           # Updated: movements pagination tests
├── progression-charts.spec.ts                  # Updated: any movement visibility assertions
├── bodyweight-movements.spec.ts               # Updated: any movement visibility assertions
└── sets.spec.ts                                # Updated: any movement visibility assertions

playwright.config.ts                            # Updated: globalSetup + TEST_DATABASE_URL env var
```

**Structure Decision**: Single-project web application. All changes are contained within the existing `src/` tree. The only structural addition is `e2e/global-setup.ts` and a `playwright.config.ts` update.

## Phase 0: Research

Already complete — see [research.md](research.md).

Key decisions:
- **Pagination**: Offset-based (`take`/`skip`) via `prisma.$transaction([count, findMany])`
- **Date validation**: Both client (immediate icon feedback) and server (security, 90-day cap)
- **URL state**: TanStack Router `validateSearch` + `loaderDeps`
- **Debounce**: 500 ms `useDebounce` hook
- **Feedback**: `AlertCircle` icon with `title` tooltip (no blocking modal)
- **Auto-scroll**: `ref.current?.scrollIntoView` on `page` change

## Phase 1: Design Artifacts

See generated/updated artifacts below.

### Updated Constants (post re-plan)

| Constant | Old Value | New Value | Location |
|----------|-----------|-----------|----------|
| `PAGE_SIZE` | 20 | **5** | Each server file + movements.server.ts |
| `MAX_RANGE_DAYS` (Workout History) | 30 | **90** | `workouts.server.ts` |
| `MAX_RANGE_DAYS` (Weight Tracking) | 90 | 90 (unchanged) | `weight.server.ts` |
| Default range (Workout History) | 29 days ago | **89 days ago** | `src/routes/__index/_layout/workout-history/index.tsx` |
| Default range (Weight Tracking) | 89 days ago | 89 days ago (unchanged) | `src/routes/__index/_layout/weight/index.tsx` |

### E2E Test Database Architecture

A dedicated PostgreSQL database (e.g., `better_bookkeeping_test`) is provisioned for Playwright tests. It uses the same Postgres instance as dev but a different database. Playwright's `globalSetup` function (in `e2e/global-setup.ts`) is responsible for:

1. Ensuring the test database exists (create if not exists)
2. Applying all Prisma migrations (`prisma migrate deploy` with `DATABASE_URL` pointing to the test DB)
3. Truncating all tables (clean slate before the suite)

This replaces the previous `!Movement-${Date.now()}` prefix convention for guaranteeing page 1 placement — with a clean DB, any freshly created test movement is the only movement and will appear on page 1.

`playwright.config.ts` must be updated to:
- Set `globalSetup: './e2e/global-setup.ts'`
- Pass `TEST_DATABASE_URL` as an environment variable to the dev server process (or ensure the app reads from a test-specific env variable when `NODE_ENV=test`)

## Complexity Tracking

No constitution violations. No new abstractions beyond `useDebounce` and `Pagination` (both satisfy the three-call-site threshold).
