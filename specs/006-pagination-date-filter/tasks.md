---
description: "Task list for Workout History & Weight Tracking Pagination with Date Range Filtering"
---

# Tasks: Workout History & Weight Tracking Pagination with Date Range Filtering

**Input**: Design documents from `specs/006-pagination-date-filter/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/server-functions.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies within the same phase)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths are included in all task descriptions

---

## Phase 1: Setup

**Purpose**: Confirm the baseline before any changes are made. No project initialization or new dependencies are required for this feature.

- [X] T001 Confirm baseline by running `bun run test` and the existing Playwright e2e suite, verifying all tests pass before any changes

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No shared foundational infrastructure is required for this feature. US1 and US2 touch completely independent files and can start immediately after Phase 1.

> No tasks — proceed directly to user story phases.

**Checkpoint**: Baseline confirmed in T001 — user story phases can now begin (in parallel if staffed).

---

## Phase 3: User Story 1 — Paginate Workout History Within a Date Range (Priority: P1) 🎯 MVP

**Goal**: The Workout History page fetches only the current page of workouts (max 20) within a user-selected date range (default: last 30 days), with previous/next navigation and a result count. The full workout history is never loaded into memory.

**Independent Test**: Open `/workout-history`, verify the default date range is pre-filled to the last 30 days, navigate to page 2 if there are enough workouts, change the date range, and confirm the list reloads with filtered results. No other page needs to be touched.

### Implementation for User Story 1

- [X] T002 [US1] Modify `getWorkoutHistoryServerFn` in `src/lib/workouts.server.ts`: add Zod `inputValidator` for `{ startDate: string, endDate: string, page: number }`, validate that `startDate ≤ endDate` and the range is ≤ 30 calendar days (throw on violation), define `PAGE_SIZE = 20` and `MAX_RANGE_DAYS = 30` as module-level constants, construct UTC boundaries (`startDate + "T00:00:00.000Z"` and `endDate + "T23:59:59.999Z"`), run `prisma.$transaction([count, findMany])` with `where: { userId, completedAt: { not: null, gte: startBound, lte: endBound } }`, `orderBy: { completedAt: "desc" }`, `take: PAGE_SIZE`, `skip: (page - 1) * PAGE_SIZE`, and return `{ items, totalCount, page, totalPages: Math.ceil(totalCount / PAGE_SIZE), pageSize: PAGE_SIZE }`

- [X] T003 [US1] Update `workoutHistoryQueryOptions` in `src/routes/__index/_layout.workout-history/-queries/workout-history.ts`: accept `{ startDate: string, endDate: string, page: number }` as parameters, pass them to `getWorkoutHistoryServerFn`, and set `queryKey: ["workout-history", { startDate, endDate, page }]` (depends on T002)

- [X] T004 [US1] Update `WorkoutHistoryPage` in `src/routes/__index/_layout.workout-history/index.tsx`: add `startDate`, `endDate`, `page`, and `dateError` state (default `startDate` = 29 days ago as `YYYY-MM-DD`, `endDate` = today as `YYYY-MM-DD`, `page` = 1), add a date range picker section above the card with two `<input type="date">` elements, an Apply button that validates client-side (start ≤ end, range ≤ 30 days; sets `dateError` on failure; clears error and resets page to 1 on success), a Reset button that restores defaults and clears `dateError`, and an error message display; pass `{ startDate, endDate, page }` to `workoutHistoryQueryOptions` (depends on T003)

- [X] T005 [US1] Update `WorkoutHistoryPage` in `src/routes/__index/_layout.workout-history/index.tsx` to remove `useVirtualizer` (and its `listRef` / `useRef` setup), replace the virtualised list with a plain `data.items.map(...)` render, add Previous/Next `<Button>` elements below the list (Previous disabled when `page === 1`, Next disabled when `page === data.totalPages`), add a "Showing X–Y of Z workouts" count line, and hide pagination controls entirely when `data.totalPages <= 1` (depends on T004)

- [X] T006 [US1] Add a new `test.describe("workout history pagination")` block to `e2e/workouts.spec.ts` with the following scenarios: (a) navigating to `/workout-history` shows the start-date input pre-filled to 29 days ago and end-date to today; (b) applying a custom valid date range resets to page 1 and filters the list; (c) applying a range > 30 days shows an error message and does not reload the list; (d) applying a range where start is after end shows an error (depends on T005)

**Checkpoint**: User Story 1 is fully functional. The Workout History page loads a single page of results filtered to the last 30 days, navigation controls work, and e2e tests pass.

---

## Phase 4: User Story 2 — Paginate Weight Entries Within a Date Range (Priority: P2)

**Goal**: The Weight Tracking page history list and chart show only entries within the selected date range (default: last 30 days), paginated to 20 entries per page. The full weight history is never loaded into memory.

**Independent Test**: Open `/weight`, verify the default date range is pre-filled, interact with the history list pagination, change the date range, and confirm both the list and the chart update. No workout history page interaction is required.

### Implementation for User Story 2

- [X] T007 [US2] Modify `getWeightEntriesServerFn` in `src/lib/weight.server.ts`: add Zod `inputValidator` for `{ startDate: string, endDate: string, page: number }`, validate that `startDate ≤ endDate` and the range is ≤ 30 calendar days (throw on violation), define `PAGE_SIZE = 20` and `MAX_RANGE_DAYS = 30` as module-level constants, construct UTC boundaries (`startDate + "T00:00:00.000Z"` for both start and end since weight entries are stored at UTC midnight), run `prisma.$transaction([count, findMany])` with `where: { userId, date: { gte: startBound, lte: endBound } }`, `orderBy: { date: "desc" }`, `take: PAGE_SIZE`, `skip: (page - 1) * PAGE_SIZE`, `select: { id, weight, date }`, and return `{ items: entries.map(e => ({ ...e, date: e.date.toISOString() })), totalCount, page, totalPages: Math.ceil(totalCount / PAGE_SIZE), pageSize: PAGE_SIZE }`

- [X] T008 [US2] Update `weightEntriesQueryOptions` in `src/routes/__index/_layout.weight/-queries/weight.ts`: accept `{ startDate: string, endDate: string, page: number }` as parameters, pass them to `getWeightEntriesServerFn`, and set `queryKey: ["weight-entries", { startDate, endDate, page }]` (depends on T007)

- [X] T009 [US2] Update `WeightPage` in `src/routes/__index/_layout.weight/index.tsx`: add `startDate`, `endDate`, `page`, and `dateError` state (same defaults as T004), add a date range picker section (two `<input type="date">` elements, Apply button with client-side validation, Reset button, error display), pass `{ startDate, endDate, page }` to `weightEntriesQueryOptions`, and update the chart's `data` prop to use `data.items` instead of the full entries array so the chart reflects the selected date range (depends on T008)

- [X] T010 [US2] Update `WeightPage` in `src/routes/__index/_layout.weight/index.tsx` to remove `useVirtualizer` (and its `listRef` / `useRef` setup) from the history card, replace the virtualised list with a plain `data.items.map(...)` render, add Previous/Next `<Button>` elements below the history list (Previous disabled when `page === 1`, Next disabled when `page === data.totalPages`), add a "Showing X–Y of Z entries" count line, and hide pagination controls when `data.totalPages <= 1` (depends on T009)

- [X] T011 [US2] Add a new `test.describe("weight history pagination")` block to `e2e/weight.spec.ts` with the following scenarios: (a) navigating to `/weight` shows the start-date input pre-filled to 29 days ago and end-date to today; (b) applying a custom valid date range resets to page 1 and shows filtered entries; (c) applying a range > 30 days shows an error message; (d) the chart is visible and updates when the date range changes (depends on T010)

**Checkpoint**: User Stories 1 and 2 are both fully functional independently.

---

## Phase 5: User Story 3 — Reset Date Range to Default (Priority: P3)

**Goal**: Users on either page can restore the date range to the last 30 days with a single Reset button click. Implementation is already delivered in T004 (workout history) and T009 (weight tracking). This phase adds targeted e2e coverage for the reset action.

**Independent Test**: Set a custom date range on either page, click Reset, and confirm the date inputs return to the default 30-day window and the list reloads.

### E2E Tests for User Story 3

- [X] T012 [US3] Add a reset scenario to the `"workout history pagination"` describe block in `e2e/workouts.spec.ts`: apply a custom date range, click the Reset button, confirm the start-date input value equals today minus 29 days and end-date equals today, and confirm the list reloads (depends on T006)

- [X] T013 [P] [US3] Add a reset scenario to the `"weight history pagination"` describe block in `e2e/weight.spec.ts`: apply a custom date range, click the Reset button, confirm the date inputs return to defaults, and confirm the list reloads (depends on T011)

**Checkpoint**: All three user stories are fully implemented and e2e-tested.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and quality checks across both modified pages.

- [X] T014 Run the full Playwright e2e suite to confirm no regressions in existing workouts, sets, weight, movements, or progression chart tests
- [X] T015 [P] Confirm TypeScript strict mode compliance in all modified files (`src/lib/workouts.server.ts`, `src/lib/weight.server.ts`, both query option files, both page components) — no `any`, no non-null assertions without justification

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: N/A — no tasks
- **Phase 3 (US1)**: Depends on T001 (Phase 1) — T002 → T003 → T004 → T005 → T006 (sequential)
- **Phase 4 (US2)**: Depends on T001 (Phase 1) — T007 → T008 → T009 → T010 → T011 (sequential); **independent of Phase 3**
- **Phase 5 (US3)**: Depends on T006 (for T012) and T011 (for T013)
- **Phase 6 (Polish)**: Depends on all Phase 3, 4, and 5 tasks

### User Story Dependencies

- **US1 (P1)**: Starts after T001 — no dependency on US2 or US3
- **US2 (P2)**: Starts after T001 — no dependency on US1 or US3; can be worked in parallel with US1
- **US3 (P3)**: Implementation delivered as part of US1 (T004) and US2 (T009); e2e tests (T012, T013) depend on T006 and T011

### Within Each User Story

- Server function change (T002 / T007) → query options update (T003 / T008) → UI state + date picker (T004 / T009) → pagination controls (T005 / T010) → e2e tests (T006 / T011)
- Each step in this chain depends on the previous

### Parallel Opportunities

- **Phase 3 and Phase 4** can be worked concurrently by two developers (completely different files)
- **T012 and T013** (US3 e2e tests) can run in parallel (different spec files, no shared state)
- **T015** (TypeScript check) can run in parallel with T014 (e2e suite)

---

## Parallel Example: US1 and US2 Concurrently

```
Developer A (US1):                        Developer B (US2):
T002 — Modify workouts server fn          T007 — Modify weight server fn
T003 — Update workout query opts          T008 — Update weight query opts
T004 — Add date picker UI (workout)       T009 — Add date picker UI (weight)
T005 — Add pagination controls (workout)  T010 — Add pagination controls (weight)
T006 — Add workout e2e tests              T011 — Add weight e2e tests
                    ↘                         ↙
                T012 — Workout reset e2e  T013 [P] — Weight reset e2e
                    ↘                         ↙
                    T014 — Full e2e suite
                    T015 [P] — TS check
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete T001 (verify baseline)
2. Complete T002 → T003 → T004 → T005 → T006 (US1 — workout history)
3. **STOP and VALIDATE**: Open `/workout-history`, confirm pagination and date filter work end-to-end
4. Run `bun run test` to confirm no regressions

### Incremental Delivery

1. T001 → Baseline confirmed
2. T002–T006 → Workout history paginated (**MVP shipped**)
3. T007–T011 → Weight tracking paginated
4. T012–T013 → Reset action fully tested
5. T014–T015 → Full quality gate passed

### Parallel Team Strategy

With two developers: T002 and T007 can start simultaneously after T001. Each developer owns one page end-to-end and merges independently.

---

## Notes

- [P] tasks = different files with no open dependencies — safe to run concurrently
- [US1/US2/US3] labels map each task to its user story for traceability
- The Reset button (US3) is implemented inside T004 and T009 — US3 phase only adds e2e coverage
- `useVirtualizer` is removed in T005 and T010 — the `@tanstack/react-virtual` import should be deleted from both page files if it is not used elsewhere
- Commit after each logical group using Conventional Commits (e.g., `feat(workout-history): add server-side pagination`)
- Each checkpoint is a valid demo/deploy point
