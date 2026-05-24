---
description: "Task list for 001-weight-tracking implementation"
---

# Tasks: Weight Tracking

**Input**: Design documents from `/specs/001-weight-tracking/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependency)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install the chart library before any implementation begins.

- [X] T001 Install Recharts dependency by running `bun add recharts` in the project root

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database model, migration, server functions, query options, and nav wiring. ALL must be complete before any user story phase begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Add `WeightEntry` model and `User.weightEntries` relation to `prisma/schema.prisma` per data-model.md (fields: id String PK uuid, userId String FK→User, weight Float, date DateTime, @@unique([userId, date]))
- [X] T003 Run `bunx prisma migrate dev --name add-weight-entry` to apply the migration and regenerate the Prisma client (depends on T002)
- [X] T004 [P] Create `src/lib/weight.server.ts` implementing three server functions — `getWeightEntriesServerFn` (GET, returns entries ordered by date asc), `upsertWeightEntryServerFn` (POST, upserts today's UTC-midnight date, Zod validates weight > 0 and ≤ 320), `deleteWeightEntryServerFn` (POST, verifies userId ownership before delete) — all using `authMiddleware` from `@/lib/auth.server`
- [X] T005 [P] Create `src/routes/__index/_layout.weight/-queries/weight.ts` exporting `weightEntriesQueryOptions` using `queryOptions` from TanStack Query, with queryKey `["weight-entries"]` and queryFn calling `getWeightEntriesServerFn()`
- [X] T006 Add a `{ to: "/weight", label: "Weight", icon: Scale }` entry to the `navItems` array in `src/routes/__index/_layout.tsx` (import `Scale` from `lucide-react`)

**Checkpoint**: Database schema is live, server functions exist, query options are wired, nav shows the Weight link. No UI page yet.

---

## Phase 3: User Story 1 — Log Body Weight (Priority: P1) 🎯 MVP

**Goal**: User can navigate to `/weight`, submit a numeric weight value, see it appear in a list, and submit again to update (not duplicate) the same-day entry.

**Independent Test**: Navigate to `/weight` → submit `180` → entry appears in list with today's date → submit `185` → only one entry remains, updated to `185` → submit `-1` → validation error shown, nothing saved.

- [X] T007 [US1] Create `src/routes/__index/_layout.weight/index.tsx` with the route definition (`createFileRoute("/__index/_layout/weight/")`), a loader that calls `context.queryClient.ensureQueryData(weightEntriesQueryOptions())`, and a `WeightPage` component that uses `useSuspenseQuery(weightEntriesQueryOptions())` to fetch entries and renders them as a list in a `Card`; show an empty-state paragraph when no entries exist
- [X] T008 [US1] Add a weight entry form above the list in `src/routes/__index/_layout.weight/index.tsx` using `useForm` from `@tanstack/react-form` with a single numeric `weight` field; wire the form submit to `upsertWeightEntryServerFn` via `useMutation` (invalidate `weightEntriesQueryOptions().queryKey` on success); display inline validation errors for out-of-range or non-numeric values

**Checkpoint**: User Story 1 is fully functional. Navigate to `/weight`, log a weight, see it in the list, update it by submitting again.

---

## Phase 4: User Story 2 — View Weight History Chart (Priority: P2)

**Goal**: A Recharts line chart renders below the entries list when at least one entry exists, with date on the X-axis and weight on the Y-axis.

**Independent Test**: Seed two entries with different dates (via Prisma Studio or direct DB insert) → chart shows two connected data points in chronological order → delete all entries → chart is hidden and empty state shows.

- [X] T009 [US2] Add a Recharts `LineChart` wrapped in `ResponsiveContainer` to `src/routes/__index/_layout.weight/index.tsx`: render it in a `Card` below the entries list only when `entries.length > 0`; use `<Line type="monotone" dataKey="weight" />`, `<XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />`, `<YAxis domain={["auto", "auto"]} />`, and `<Tooltip />`; import from `recharts`

**Checkpoint**: User Stories 1 and 2 both work. Chart renders with entries and hides on empty state.

---

## Phase 5: User Story 3 — Delete a Weight Entry (Priority: P3)

**Goal**: Each entry in the list has a delete button; clicking it removes the entry and the list and chart update immediately without a page reload.

**Independent Test**: Log a weight → delete it → entry disappears from list → if no more entries, empty state and no chart → chart data point removed when other entries remain.

- [X] T010 [US3] Add a delete button (use `<Button variant="ghost" size="sm">` with `<Trash2 className="w-4 h-4" />` from `lucide-react`) to each entry row in the list in `src/routes/__index/_layout.weight/index.tsx`; wire it to `deleteWeightEntryServerFn` via `useMutation` (invalidate `weightEntriesQueryOptions().queryKey` on success)

**Checkpoint**: All three user stories are independently functional and testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: E2E test coverage (required by constitution) and final validation.

- [X] T011 [P] Write Playwright e2e test in `e2e/weight.spec.ts` covering the happy path: sign in → navigate to Weight via sidebar → submit a weight value → verify entry appears in list → verify chart renders → delete the entry → verify removal and empty state
- [X] T012 Run all quickstart.md validation steps manually to confirm all acceptance scenarios from spec.md pass (FR-001 through FR-011)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (T001 must complete before T004 since Recharts types may be referenced) — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 completion (T003 for Prisma client, T004 for server fns, T005 for query options, T006 for nav)
- **US2 (Phase 4)**: Depends on Phase 3 completion (needs the page component and data fetching from US1)
- **US3 (Phase 5)**: Depends on Phase 3 completion (needs the list rendering from US1); can overlap with US2
- **Polish (Phase 6)**: Depends on all user story phases

### User Story Dependencies

- **US1 (P1)**: No dependency on other stories — first deliverable after Foundational
- **US2 (P2)**: Depends on US1 (uses the same page component and data source)
- **US3 (P3)**: Depends on US1 (extends the same list component); independent of US2

### Within Each User Story

- T007 before T008 (page shell before form)
- T009 after T007 (chart needs the page component and data)
- T010 after T007 (delete button needs the list rendering)

### Parallel Opportunities

- T004 and T005 can run in parallel (different files, no shared dependency)
- T011 (e2e test) can be written while T012 validation runs

---

## Parallel Example: Foundational Phase

```bash
# After T002 + T003 complete, these can run in parallel:
Task T004: "Create src/lib/weight.server.ts with all three server functions"
Task T005: "Create src/routes/__index/_layout.weight/-queries/weight.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002–T006)
3. Complete Phase 3: User Story 1 (T007–T008)
4. **STOP and VALIDATE**: Navigate to `/weight`, log a weight, confirm it appears and updates correctly
5. Demo/review MVP

### Incremental Delivery

1. Setup + Foundational → foundation ready, nav link visible
2. US1 → weight logging and list → independently testable MVP
3. US2 → chart rendering → adds analytical value
4. US3 → delete → data correction UX complete
5. Polish → e2e test satisfies constitution Principle II

---

## Notes

- [P] tasks = different files, no dependencies — safe to parallelize
- [Story] label maps each task to a user story for traceability
- The chart (US2) is intentionally placed in its own phase since it adds to the page component built in US1 — implementing it in isolation avoids merge conflicts
- All server functions are in a single file (`weight.server.ts`) to match the existing project pattern (`workouts.server.ts`, `movements.server.ts`)
- Prisma client regeneration (T003) must complete before T004 can use the generated `WeightEntry` types
