# Data Model: Movement Progression Charts

## Overview

This feature introduces **no new database entities or schema changes**. All data is
derived from existing entities in read-only mode. The Prisma schema requires no
migration.

---

## Relevant Existing Entities

### Workout

| Field | Type | Notes |
|-------|------|-------|
| id | String (UUID) | PK |
| userId | String | FK → User; scopes all queries to the authenticated user |
| completedAt | DateTime? | `null` = active workout; non-null = completed |
| sets | Set[] | relation |

**Usage**: Provides the date dimension. Only workouts where `completedAt IS NOT NULL`
contribute data points. The calendar date is derived from `completedAt`.

### Set

| Field | Type | Notes |
|-------|------|-------|
| id | String (UUID) | PK |
| workoutId | String | FK → Workout |
| movementId | String | FK → Movement |
| reps | Int | always present |
| weight | Int | non-nullable in current schema; treat as `number \| null` defensively — Feature 2 will change this to `Int?` |

**Usage**: Provides raw metric values per movement per date. Aggregated server-side.

### Movement

| Field | Type | Notes |
|-------|------|-------|
| id | String (UUID) | PK |
| name | String | display label for the selector |
| sets | Set[] | relation |

**Usage**: The grouping key for the selector. Data is keyed by `movement.id` (not
`movement.name`) so renames do not lose historical data.

---

## Derived Aggregation Type

The server function returns `ProgressionDataPoint[]` — one entry per distinct workout
date for the selected movement:

```typescript
type ProgressionDataPoint = {
  date: string;           // "YYYY-MM-DD" (derived from workout.completedAt)
  maxWeight: number | null; // null when all sets on this date have null weight
  totalReps: number;      // sum of reps across all sets on this date
  totalVolume: number;    // sum of (weight × reps) for sets with non-null weight
};
```

### Aggregation Rules

| Metric | Rule |
|--------|------|
| Maximum Weight | `MAX(set.weight)` for sets where weight is not null |
| Total Reps | `SUM(set.reps)` across all sets (including null-weight sets) |
| Total Volume | `SUM(set.weight × set.reps)` for sets where weight is not null |

### Invariants

- Only completed workouts (`completedAt IS NOT NULL`) contribute data points.
- All data is scoped to the authenticated user (`userId = context.user.id`).
- Results are ordered by `date ASC` for correct time-series rendering.
- If multiple workouts share the same calendar date, their sets are merged into one
  data point (aggregate across all sets on that date).
- An empty array `[]` is returned when no data exists — the client renders an empty
  state (FR-009).
