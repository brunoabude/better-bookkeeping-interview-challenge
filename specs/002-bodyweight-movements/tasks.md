---
description: "Task list for 002-bodyweight-movements feature implementation"
---

# Tasks: Body-Weight Movements

**Input**: Design documents from `/specs/002-bodyweight-movements/`

**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths are included in every description

---

## Phase 1: Setup (Schema & Migration)

**Purpose**: Apply the database schema change that enables all subsequent work. No user story can begin until the Movement model has the `isBodyWeight` column.

**⚠️ CRITICAL**: All user story phases are blocked on Phase 1 completion.

- [x] T001 Edit `prisma/schema.prisma` — add `isBodyWeight Boolean @default(false)` field to the `Movement` model (after the `name` field, before the `sets` relation)
- [x] T002 Run `bunx prisma migrate dev --name add_is_body_weight_to_movement` from repo root to generate migration in `prisma/migrations/` and regenerate the Prisma client in `prisma/generated/client/`

**Checkpoint**: Prisma client now exposes `isBodyWeight` on `Movement`; TypeScript will enforce this field across all server functions and queries.

---

## Phase 2: Foundational (Server Functions)

**Purpose**: Update the movement server functions to read and write `isBodyWeight`. These changes unlock all three user stories.

**⚠️ CRITICAL**: Blocks US1, US2, and US3.

- [x] T003 In `src/lib/movements.server.ts` — update `createMovementServerFn` Zod input schema to add `isBodyWeight: z.boolean().default(false)` and pass the value to `prisma.movement.create({ data: { name, isBodyWeight } })`
- [x] T004 In `src/lib/movements.server.ts` — confirm `getMovementsServerFn` returns `isBodyWeight` for every movement (the Prisma query likely already returns all scalar fields; verify and add `isBodyWeight` to any explicit `select` clause if one exists)

**Checkpoint**: `createMovementServerFn` and `getMovementsServerFn` both handle `isBodyWeight`. Foundation ready — user story work can begin.

---

## Phase 3: User Story 1 — Flag a Movement as Body-Weight on Creation (Priority: P1) 🎯 MVP

**Goal**: Users can mark a new movement as body-weight via a toggle in the create form, and flagged movements display a visual indicator in the list.

**Independent Test**: Create a movement with the body-weight toggle enabled → reload the movements list → confirm the "Body Weight" badge is visible and persisted across page refresh.

### Implementation for User Story 1

- [x] T005 [US1] In `src/routes/__index/_layout.movements/index.tsx` — add an `isBodyWeight` field (default `false`) to the TanStack Form state; render a `Switch` + `Label` ("Body-weight movement") from `@better-bookkeeping/ui` below the name input; pass `isBodyWeight` to `createMovementServerFn` on submit; reset the switch to `false` after successful submission
- [x] T006 [US1] In `src/routes/__index/_layout.movements/index.tsx` — in the movements list render, import `Badge` from `@better-bookkeeping/ui` and render `<Badge>Body Weight</Badge>` inline with the movement name when `movement.isBodyWeight === true`

**Checkpoint**: User Story 1 is fully functional. A user can create a body-weight movement and see the badge in the list. Independently testable.

---

## Phase 4: User Story 2 — Auto-Fill Weight When Adding Body-Weight Movement to Workout (Priority: P1)

**Goal**: When a body-weight movement is selected in the Add Set form, the weight field is pre-filled with the user's most recently logged body weight. If no weight entry exists, the field remains empty and a hint is shown.

**Independent Test**: Log a body weight on `/weight` → navigate to `/current-workout` → select a body-weight movement → confirm the weight field shows the logged value instantly with no additional interaction.

### Implementation for User Story 2

- [x] T007 [P] [US2] In `src/lib/weight.server.ts` — add `getLatestWeightServerFn`: GET method, `authMiddleware`, query `prisma.weightEntry.findFirst({ where: { userId: context.user.id }, orderBy: { date: 'desc' }, select: { weight: true, date: true } })`; return `{ weight: number; date: string }` (date as ISO string) or `null` if no entries exist
- [x] T008 [P] [US2] Create `src/routes/__index/_layout.current-workout/-queries/latest-weight.ts` — export `latestWeightQueryOptions()` using `queryOptions({ queryKey: ['latest-weight'], queryFn: () => getLatestWeightServerFn() })` following the same pattern as `currentWorkoutQueryOptions()`
- [x] T009 [US2] In `src/routes/__index/_layout.current-workout/index.tsx` — add `context.queryClient.ensureQueryData(latestWeightQueryOptions())` to the route `loader` (alongside the existing `ensureQueryData` calls); also confirm `movementsQueryOptions()` is prefetched in this loader (required so the Add Set movement dropdown has `isBodyWeight` data); add if missing
- [x] T010 [US2] In `src/routes/__index/_layout.current-workout/index.tsx` — add `const latestWeight = useQuery(latestWeightQueryOptions())` hook; in the Add Set form, watch the `movementId` field value; when it changes, look up the movement in the cached movements list; if `movement.isBodyWeight === true` and `latestWeight.data != null`, call `form.setFieldValue('weight', latestWeight.data.weight)`; if `movement.isBodyWeight === true` and `latestWeight.data == null`, leave weight empty and render a hint `<p>Log your body weight on the <Link to="/weight">weight page</Link> to enable auto-fill.</p>` below the weight input; if `movement.isBodyWeight === false`, apply no auto-fill behaviour

**Checkpoint**: User Story 2 is fully functional. Auto-fill works for logged users; fallback hint works when no weight is logged; manual override always permitted. Independently testable alongside or after US1.

---

## Phase 5: User Story 3 — Edit an Existing Movement's Body-Weight Flag (Priority: P2)

**Goal**: Users can toggle the body-weight flag on any existing movement via an inline edit UI, so pre-existing movements can be reclassified without deletion.

**Independent Test**: On the movements list, click "Edit" on a non-body-weight movement → enable the toggle → click "Save" → confirm the "Body Weight" badge now appears for that movement and the flag persists on page refresh.

### Implementation for User Story 3

- [x] T011 [US3] In `src/lib/movements.server.ts` — add `updateMovementServerFn`: POST method, no auth middleware (movements are a global resource), Zod input `{ id: z.string().uuid(), isBodyWeight: z.boolean() }`, call `prisma.movement.update({ where: { id }, data: { isBodyWeight } })`; if the movement is not found Prisma throws — catch and return `{ success: false, error: 'Movement not found' }`; on success return `{ success: true, movement }`
- [x] T012 [US3] In `src/routes/__index/_layout.movements/index.tsx` — add per-row edit state (e.g., `editingId: string | null` via `useState`); render an "Edit" button on each movement row; when clicked, show an inline zone with a `Switch` pre-set to the movement's current `isBodyWeight` value, a "Save" button (calls `updateMovementServerFn({ id, isBodyWeight })` then invalidates the `['movements']` query key and closes the edit zone), and a "Cancel" button (closes without saving); ensure only one row can be in edit mode at a time

**Checkpoint**: User Story 3 complete. All three user stories are independently functional.

---

## Phase 6: Polish & e2e Tests

**Purpose**: Playwright e2e coverage required by Constitution Principle II before merge. Covers happy paths and the empty-weight fallback.

- [x] T013 Create `e2e/bodyweight-movements.spec.ts` with the following Playwright test cases:
  - **US1 happy path**: sign in → navigate to `/movements` → fill movement name "Pull-ups" → enable body-weight switch → submit → assert "Body Weight" badge is visible in the list
  - **US1 non-body-weight**: create a movement without enabling the switch → assert no badge is rendered
  - **US2 happy path**: sign in → log a body weight entry on `/weight` → create a body-weight movement → navigate to `/current-workout` → create workout if needed → select the body-weight movement in Add Set dropdown → assert weight field value equals the logged weight
  - **US2 fallback (no weight logged)**: sign in with a fresh account (no weight entries) → add a body-weight movement to workout → assert weight field is empty and hint text is visible
  - **US3 happy path**: sign in → navigate to `/movements` → click "Edit" on an existing non-body-weight movement → enable toggle → click "Save" → assert "Body Weight" badge appears
- [x] T014 Run `bun run test` (Vitest) and `bunx playwright test e2e/bodyweight-movements.spec.ts` and confirm all tests pass with zero failures

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (Prisma client must be regenerated) — BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 — independently deliverable once foundation is ready
- **Phase 4 (US2)**: Depends on Phase 2 — independently deliverable; T007 and T008 can start in parallel immediately after Phase 2
- **Phase 5 (US3)**: Depends on Phase 2 — independently deliverable; no hard dependency on US1 or US2
- **Phase 6 (Polish)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Depends only on Phase 2 — no dependencies on US2 or US3
- **US2 (P1)**: Depends only on Phase 2 — no dependencies on US1 or US3; however, to test US2's auto-fill end-to-end the tester must first log a body weight (requires the `/weight` page from Feature 001)
- **US3 (P2)**: Depends only on Phase 2 — no dependencies on US1 or US2

### Within Each User Story

- Models/schema → server functions → UI → validation
- Phase 3: T005 (form) before T006 (list badge) is safe; they touch the same file sequentially
- Phase 4: T007 [P] and T008 [P] can run in parallel; T009 depends on T008; T010 depends on T009 and T007
- Phase 5: T011 (server fn) before T012 (UI wiring) — sequential in dependency order

### Parallel Opportunities

- **T007 ‖ T008**: Different files (`weight.server.ts` vs new `-queries/latest-weight.ts`) — no dependency
- **US1, US2, US3** can all begin in parallel immediately after Phase 2 completes (if more than one developer)

---

## Parallel Example: User Story 2

```bash
# After Phase 2 completes, launch T007 and T008 together:
Task T007: "Add getLatestWeightServerFn to src/lib/weight.server.ts"
Task T008: "Create src/routes/__index/_layout.current-workout/-queries/latest-weight.ts"

# Then sequentially:
Task T009: "Update current-workout route loader"
Task T010: "Add auto-fill logic to Add Set form"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Schema migration
2. Complete Phase 2: Server function updates
3. Complete Phase 3 (US1): Toggle + badge in movements page
4. **STOP and VALIDATE**: Create a body-weight movement, reload page, confirm badge persists
5. Deliverable: movements page fully supports the `isBodyWeight` flag

### Incremental Delivery

1. Phase 1 + Phase 2 → schema and server layer ready
2. Phase 3 (US1) → movements page with toggle and badge → validate independently
3. Phase 4 (US2) → auto-fill on current-workout page → validate independently
4. Phase 5 (US3) → inline edit on movements page → validate independently
5. Phase 6 → e2e tests pass → ready for merge

---

## Notes

- [P] tasks = different files, no blocking dependencies between them
- [USx] label maps each task to its user story for traceability
- All `isBodyWeight` values flow through Prisma — after T002, TypeScript enforces the field everywhere
- `addSetServerFn` signature is **not changed** — auto-fill is client-side only; the server always receives the explicit weight value
- Movements are a global resource (no `userId`); `updateMovementServerFn` requires no auth middleware (matches existing `createMovementServerFn` pattern)
- Historical `Set` records are never touched — only the `Movement.isBodyWeight` flag changes
- After each phase, commit with conventional commit format (e.g., `feat(movements): add isBodyWeight flag and body-weight badge`)
