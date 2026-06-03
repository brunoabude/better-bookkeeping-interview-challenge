# Server Function Contracts

These TanStack Start server functions form the server/client boundary for the pagination feature.

---

## `getWorkoutHistoryServerFn` (modified)

**File**: `src/lib/workouts.server.ts`
**Method**: `GET` (no-body)
**Auth**: Required (authMiddleware)

### Input

```typescript
{
  startDate: string  // YYYY-MM-DD — inclusive lower bound on completedAt
  endDate:   string  // YYYY-MM-DD — inclusive upper bound on completedAt
  page:      number  // 1-indexed; defaults to 1
}
```

### Validation Rules

| Rule | Error |
|------|-------|
| `startDate` must match `/^\d{4}-\d{2}-\d{2}$/` | Zod parse error |
| `endDate` must match `/^\d{4}-\d{2}-\d{2}$/` | Zod parse error |
| `page` must be integer ≥ 1 | Zod parse error |
| `startDate` ≤ `endDate` | Thrown error: "Start date must not be after end date" |
| Range ≤ **90** calendar days | Thrown error: "Date range must not exceed 90 days" |

### Output (success)

```typescript
{
  items: Array<{
    id:          string
    completedAt: Date | null
    userId:      string
    sets: Array<{
      id:         string
      reps:       number
      weight:     number
      movement: { id: string; name: string; isBodyWeight: boolean }
    }>
  }>
  totalCount: number
  page:       number
  totalPages: number
  pageSize:   number  // always 5
}
```

---

## `getWeightEntriesServerFn` (modified)

**File**: `src/lib/weight.server.ts`
**Method**: `GET` (no-body)
**Auth**: Required (authMiddleware)

### Input

```typescript
{
  startDate: string  // YYYY-MM-DD — inclusive lower bound on date
  endDate:   string  // YYYY-MM-DD — inclusive upper bound on date
  page:      number  // 1-indexed; defaults to 1
}
```

### Validation Rules

| Rule | Error |
|------|-------|
| `startDate` must match `/^\d{4}-\d{2}-\d{2}$/` | Zod parse error |
| `endDate` must match `/^\d{4}-\d{2}-\d{2}$/` | Zod parse error |
| `page` must be integer ≥ 1 | Zod parse error |
| `startDate` ≤ `endDate` | Thrown error: "Start date must not be after end date" |
| Range ≤ **90** calendar days | Thrown error: "Date range must not exceed 90 days" |

### Output (success)

```typescript
{
  items: Array<{
    id:     number
    weight: number
    date:   string  // ISO string
  }>
  chartItems: Array<{
    weight: number
    date:   string  // ISO string — all entries in range, ascending, for chart rendering
  }>
  totalCount: number
  page:       number
  totalPages: number
  pageSize:   number  // always 5
}
```

---

## `getPaginatedMovementsServerFn` (modified)

**File**: `src/lib/movements.server.ts`
**Method**: `GET` (no-body)
**Auth**: None required

### Input

```typescript
{
  page: number  // 1-indexed; defaults to 1
}
```

### Validation Rules

| Rule | Error |
|------|-------|
| `page` must be integer ≥ 1 | Zod parse error |

### Output (success)

```typescript
{
  items: Array<{
    id:           string
    name:         string
    isBodyWeight: boolean
  }>
  totalCount: number
  page:       number
  totalPages: number
  pageSize:   number  // always 5
}
```

---

## Query Key Conventions

TanStack Query keys for these functions:

```typescript
// Workout history
["workout-history", { startDate: string, endDate: string, page: number }]

// Weight entries
["weight-entries", { startDate: string, endDate: string, page: number }]

// Movements (paginated)
["movements-paginated", { page: number }]
```

All keys include every filter parameter to ensure correct cache separation between different dates and pages.
