---
description: "Task list for 003-progression-charts feature implementation"
---

# Tasks: Movement Progression Charts

**Input**: Design documents from `/specs/003-progression-charts/`

**Prerequisites**: spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Key decisions**:
- No schema migration — all data read from existing `Workout`, `Set`, `Movement` tables
- `recharts` already in `package.json` (`^3.8.1`) — no install step needed
- Chart embedded in existing `/workout-history` page (no new route)
- Server-side aggregation returns all three metrics in one call (zero round-trips on metric switch)
- Movement list derived from already-loaded `workoutHistory` cache

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependencies)
- **[Story]**: User story label (US1, US2, US3)

---

## Phase 1: Foundational (Server Layer)

**Purpose**: Server function and query options that ALL user story phases depend on. No migration required.

**⚠️ CRITICAL**: US1, US2, US3 all block on Phase 1.

- [x] T001 Add `getMovementProgressionServerFn` to `src/lib/workouts.server.ts` — GET method, `authMiddleware`, Zod input `z.object({ movementId: z.string() })`, query `prisma.set.findMany({ where: { movementId: data.movementId, workout: { userId: context.user.id, completedAt: { not: null } } }, select: { reps: true, weight: true, workout: { select: { completedAt: true } } }, orderBy: { workout: { completedAt: 'asc' } } })`; group results by calendar date in application code (format `completedAt` as `'YYYY-MM-DD'`); for each date compute `maxWeight` (`Math.max` of non-null weights, or `null`), `totalReps` (sum all reps), `totalVolume` (sum of `weight * reps` for non-null weights); return `Array<{ date: string; maxWeight: number | null; totalReps: number; totalVolume: number }>` ordered by date ASC
- [x] T002 Create `src/routes/__index/_layout.workout-history/-queries/movement-progression.ts` — export `movementProgressionQueryOptions({ movementId }: { movementId: string })` using `queryOptions({ queryKey: ['movement-progression', movementId], queryFn: () => getMovementProgressionServerFn({ data: { movementId } }) })`; import `getMovementProgressionServerFn` from `@/lib/workouts.server`

**Checkpoint**: Server function exists and query options are wired. Foundation ready for all user story phases.

---

## Phase 2: User Story 1 — View Progression Chart for a Movement (Priority: P1) 🎯 MVP

**Goal**: User selects a movement and a metric and sees a line chart plotting that metric over time.

**Independent Test**: With at least two completed workouts on different dates containing the same movement, select that movement + "Maximum Weight" → chart renders with two or more data points connected by a line.

### Implementation for User Story 1

- [x] T003 [US1] Create `src/components/progression-chart.tsx` — export `ProgressionChart({ data, metric }: { data: Array<{ date: string; maxWeight: number | null; totalReps: number; totalVolume: number }>; metric: 'maxWeight' | 'totalReps' | 'totalVolume' })` that renders a Recharts `<ResponsiveContainer width="100%" height={300}>` containing a `<LineChart>`; X-axis uses `dataKey="date"` with `<XAxis>` formatted to show the date string; Y-axis uses `<YAxis>`; render a `<Line type="monotone" dataKey={metric} dot={true} />` using the `metric` prop to select the field; add `<Tooltip />` and `<CartesianGrid strokeDasharray="3 3" />`; import only from `recharts`
- [x] T004 [US1] Add a "Progression" `<Card>` section to `src/routes/__index/_layout.workout-history/index.tsx` — add `useState<string>('')` for `selectedMovementId` and `useState<'maxWeight' | 'totalReps' | 'totalVolume'>('maxWeight')` for `selectedMetric`; derive `uniqueMovements` from the existing `workoutHistory` data by collecting all `set.movement` entries, deduplicating by `id`, sorting by `name`; add `useQuery(movementProgressionQueryOptions({ movementId: selectedMovementId }))` with `enabled: !!selectedMovementId`; render a movement `<Select>` and three metric toggle `<Button>` components ("Max Weight", "Total Reps", "Total Volume") each calling `setSelectedMetric`; when `selectedMovementId` is set and query data exists, render `<ProgressionChart data={query.data} metric={selectedMetric} />`; import `ProgressionChart` from `@/components/progression-chart` and `movementProgressionQueryOptions` from `./-queries/movement-progression`

**Checkpoint**: User Story 1 fully functional. A user with workout history can select a movement and see a live chart. Independently testable.

---

## Phase 3: User Story 2 — Switch Between Metrics Without Losing Movement Selection (Priority: P2)

**Goal**: Metric and movement selectors are independent — switching one preserves the other.

**Independent Test**: Select a movement → select "Total Reps" → the chart updates; change metric to "Max Weight" → chart updates, movement dropdown still shows the original selection.

### Implementation for User Story 2

- [x] T005 [US2] In `src/routes/__index/_layout.workout-history/index.tsx` — verify the movement `<Select>` `onChange` handler calls only `setSelectedMovementId(e.target.value)` (does NOT reset `selectedMetric`); verify each metric `<Button>` `onClick` calls only `setSelectedMetric(...)` (does NOT reset `selectedMovementId`); confirm `useQuery` re-fetches automatically when `selectedMovementId` changes (React Query handles this via the query key `['movement-progression', selectedMovementId]`); no additional code if T004 already implements this correctly — this task is to confirm correctness and fix if needed

**Checkpoint**: US2 complete. Metric switching is instant (data already cached from the single server call), movement switching triggers one new fetch.

---

## Phase 4: User Story 3 — Empty State When No Data Exists (Priority: P3)

**Goal**: Meaningful empty states instead of blank/broken charts in all no-data scenarios.

**Independent Test**: With a fresh user account (no completed workouts), navigate to `/workout-history` — the Progression section shows an instructional empty state, not a blank area or error.

### Implementation for User Story 3

- [x] T006 [US3] In `src/routes/__index/_layout.workout-history/index.tsx` within the Progression Card — add three conditional renders:
  1. When `uniqueMovements.length === 0` (no completed workouts with sets): render `<p>Complete a workout to start tracking your progression.</p>` and hide the selectors
  2. When `selectedMovementId === ''` (initial state, movement not yet chosen): render `<p>Select a movement above to see your progression chart.</p>` below the movement selector
  3. When `selectedMovementId` is set AND `query.data?.length === 0` (movement has no logged sets): render `<p>No progression data for this movement yet. Add it to a workout to get started.</p>`

**Checkpoint**: US3 complete. All empty state scenarios handled gracefully.

---

## Phase 5: Polish & e2e Tests

**Purpose**: Playwright coverage required by Constitution Principle II before merge.

- [x] T007 Create `e2e/progression-charts.spec.ts` with the following Playwright test cases:
  - **US1 happy path**: sign in → seed two completed workouts (via UI) with the same movement on different dates → navigate to `/workout-history` → scroll to Progression section → select the movement from the dropdown → select "Max Weight" metric → assert a Recharts SVG chart is visible with at least two data points (`<svg>` inside `.recharts-responsive-container`)
  - **US1 metric correctness**: with seeded data, select "Total Reps" and "Total Volume" metrics → chart updates (assert `<svg>` remains visible after each switch)
  - **US2 independence**: select a movement → select "Total Reps" → change the movement → assert "Total Reps" metric button still appears active; change the metric → assert the movement dropdown still shows the previously selected movement
  - **US3 no workouts empty state**: sign in with fresh account (no completed workouts) → navigate to `/workout-history` → assert the Progression section shows instructional text (e.g., "Complete a workout")
  - **US3 movement no data empty state**: sign in with a completed workout → select a movement that was NOT in that workout → assert the Progression section shows "No progression data" text
- [x] T008 Run `bunx tsc --noEmit` and confirm zero TypeScript errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundational)**: No dependencies — start immediately; T001 before T002
- **Phase 2 (US1)**: Depends on Phase 1; T003 before T004
- **Phase 3 (US2)**: Depends on Phase 2 (T004) — verification/fix pass on the same file
- **Phase 4 (US3)**: Depends on Phase 2 (T004) — adds empty states to the same Progression section
- **Phase 5 (Polish)**: Depends on Phases 2–4

### User Story Dependencies

- **US1 (P1)**: Depends only on Phase 1 — core deliverable
- **US2 (P2)**: Depends on US1 being implemented — is a correctness check on T004's state management
- **US3 (P3)**: Depends on the Progression section existing (T004) — adds conditional renders

### Within Each Phase

- T001 → T002 (T002 imports the server function from T001)
- T003 → T004 (T004 imports the chart component from T003)
- T004 → T005 (T005 verifies T004's state logic)
- T004 → T006 (T006 adds conditionals to the same section as T004)

### Parallel Opportunities

No true parallelism within this feature (each task builds on the previous one in a linear chain). The only exception: T003 (chart component, new file) can be written independently while someone else writes T001/T002, since T003 has no code dependency on the server layer — it only takes typed props.

---

## Parallel Example: Phase 1 + Phase 2 (if two developers)

```bash
# Developer A:
Task T001: "Add getMovementProgressionServerFn to src/lib/workouts.server.ts"
Task T002: "Create src/routes/__index/_layout.workout-history/-queries/movement-progression.ts"

# Developer B (simultaneously):
Task T003: "Create src/components/progression-chart.tsx"
# Then waits for T001+T002 before starting T004
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. T001 → T002: Server layer
2. T003 → T004: Chart component + page integration
3. **STOP and VALIDATE**: Navigate to `/workout-history` with seeded data, confirm chart renders
4. Deliverable: progression charts working end-to-end

### Incremental Delivery

1. Phase 1 + Phase 2 (US1) → MVP chart working
2. Phase 3 (US2) → verify metric switching works; likely free from T004 implementation
3. Phase 4 (US3) → empty states polished
4. Phase 5 (Polish) → e2e tests pass → ready for merge

---

## Notes

- No `prisma migrate` needed — zero schema changes for this feature
- `recharts` is already installed (`package.json` `"recharts": "^3.8.1"`) — no `bun add` step
- The workout-history page currently uses `workoutHistoryQueryOptions()` (already loaded); `uniqueMovements` is derived from that cache at no extra cost
- `movementProgressionQueryOptions` uses `enabled: !!selectedMovementId` so no request fires until the user selects a movement
- All three metrics returned in a single server call — metric switching is client-side only (O(1), satisfies SC-002 < 1 s)
- Sets with `null` weight: `maxWeight` becomes `null` for that date if ALL sets are null-weight; `totalVolume` excludes null-weight sets; `totalReps` always counts all sets
