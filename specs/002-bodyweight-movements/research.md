# Research: Body-Weight Movements

**Feature**: `002-bodyweight-movements` | **Phase**: 0 | **Date**: 2026-05-24

## Decision Log

### 1. Storage of `isBodyWeight` flag

**Decision**: Add `isBodyWeight Boolean @default(false)` directly to the `Movement` model in `prisma/schema.prisma`.

**Rationale**: Movements are currently a global resource — no `userId` on the `Movement` model. The spec explicitly states "Movement (modified): Gains a boolean `isBodyWeight` attribute. All other attributes remain unchanged." Adding the flag directly matches the spec, keeps the migration trivial (non-breaking, default `false`), and avoids introducing a user-movement junction table that would require auth middleware on all movement queries and reshape the entire movements API. The YAGNI principle (Constitution IV) prohibits the junction-table approach given no requirement for per-user flags exists.

**Alternatives considered**:
- **User-movement junction table** (`UserMovementFlag` model with `userId`, `movementId`, `isBodyWeight`): would enable per-user flag customization but is speculative scope. Rejected — the spec says the flag is on the movement globally.
- **Separate `BodyWeightMovement` table**: Over-engineered; a boolean field is sufficient.

---

### 2. Fetching the most recent body weight for auto-fill

**Decision**: Add a new server function `getLatestWeightServerFn()` to `src/lib/weight.server.ts` that returns the single most recent `WeightEntry` for the authenticated user (ordered by `date DESC`, `take: 1`), or `null` if none exists.

**Rationale**: The current `getWeightEntriesServerFn()` returns the full weight history. Fetching all entries just to use the last one wastes bandwidth and bloats the current-workout page's data budget. A dedicated endpoint returns only what is needed. This follows the existing pattern of narrow, purpose-built server functions in the project.

**Alternatives considered**:
- **Reuse `getWeightEntriesServerFn()` and take last element**: Cheaper to implement but sends unbounded history to the client just for one value. Rejected for efficiency.
- **Embed latest weight in `getCurrentWorkoutServerFn()` response**: Mixes concerns — workout data and weight data are independent; complicates the workout cache key. Rejected.

---

### 3. Auto-fill mechanism (client vs. server)

**Decision**: Auto-fill is handled entirely client-side. The Add Set form in `/current-workout` watches the selected `movementId`. When it changes, the form logic checks if the corresponding `Movement.isBodyWeight === true` (from the already-cached `movements` query). If true, it sets the `weight` field value to the latest weight from the `latestWeightQueryOptions()` cache. No additional server round-trip on selection change.

**Rationale**: Both pieces of data (movements list with `isBodyWeight`, latest weight) are fetched at route load time via React Query. Auto-fill is therefore synchronous and instant — matches SC-001 ("weight field is pre-filled instantly — no additional user interaction required"). This also means the existing `addSetServerFn()` signature does not change; it still receives `weight` as user-supplied input.

**Alternatives considered**:
- **Server-side auto-fill**: Have `addSetServerFn()` detect body-weight movements and look up the weight server-side. Rejected — this would require the server to override user intent and would conflict with FR-007 (user can always override the pre-filled value).

---

### 4. UI pattern for the body-weight toggle

**Decision**: Use the `Switch` component from `@better-bookkeeping/ui` (shadcn wrapper) with a `Label` adjacent to it. The toggle appears in both the movement creation form and the movement edit form (if one is added; see User Story 3).

**Rationale**: `Switch` is available in the existing UI library (`./node_modules/@better-bookkeeping/ui/dist/src/components/ui`). Consistent with the app's component conventions. Single-action toggle — matches SC-002 ("under 5 additional seconds" to flag a movement).

**Alternatives considered**:
- **Checkbox**: Functionally equivalent but `Switch` communicates a binary on/off state more clearly for UX. Rejected in favour of `Switch`.

---

### 5. Visual indicator for body-weight movements in the list

**Decision**: Render a `Badge` component (from `@better-bookkeeping/ui`) with label "Body Weight" next to the movement name in the movements list when `isBodyWeight === true`.

**Rationale**: Badge is already available in the UI library, requires no additional dependencies, and is visually distinct without cluttering the list. Satisfies FR-004.

**Alternatives considered**:
- **Icon only** (e.g., a person icon from lucide-react): Less accessible (requires tooltip for clarity). Rejected.
- **Colour-coded rows**: More invasive, harder to maintain with Tailwind v4 variables. Rejected.

---

### 6. Movement edit flow (User Story 3)

**Decision**: Add an inline edit capability to the movements list. Each movement row gains an "Edit" button that reveals an inline form (or a small modal) allowing the user to toggle `isBodyWeight`. A new `updateMovementServerFn({ id, isBodyWeight })` server function performs the update.

**Rationale**: The spec says the edit form for an existing movement MUST include the body-weight toggle (FR-002). The movements page currently has no edit UI. Adding an inline edit (toggle + save) is the simplest path that satisfies the requirement without introducing a new route.

**Alternatives considered**:
- **New `/movements/:id/edit` route**: Overkill for a single-field update; adds routing complexity. Rejected (YAGNI).
- **Edit all fields inline**: The spec only requires editing the body-weight flag on existing movements; name editing is out of scope. Rejected (YAGNI).

---

### 7. Migration strategy

**Decision**: A standard Prisma migration (`prisma migrate dev`) adds `isBodyWeight Boolean @default(false)` to the `Movement` table. No backfill is needed — all existing movements default to `false` (non-body-weight), which is the correct semantic.

**Rationale**: Non-breaking schema change. The default ensures backward compatibility with the existing `getMovementsServerFn()` callers without code changes to the query layer until the feature is deployed.

**Alternatives considered**:
- **Optional field (`isBodyWeight Boolean?`)**: Would require null-checking everywhere. Unnecessary given `false` is a valid default for all existing movements. Rejected.
