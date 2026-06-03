# Data Model: Workout History, Weight Tracking & Movements Pagination with Date Range Filtering

## Schema Changes

**None.** No Prisma schema changes are required. The existing `Workout.completedAt` and `WeightEntry.date` fields already provide sufficient structure for date range filtering.

## Existing Entities Used

### Workout (existing)

| Field         | Type        | Relevant Role                                |
|---------------|-------------|----------------------------------------------|
| `id`          | `String`    | Record identifier                            |
| `userId`      | `String`    | Ownership filter (always applied)            |
| `completedAt` | `DateTime?` | Date range filter target; `NOT NULL` check filters to completed workouts |

### WeightEntry (existing)

| Field    | Type       | Relevant Role                          |
|----------|------------|----------------------------------------|
| `id`     | `Int`      | Record identifier                      |
| `userId` | `String`   | Ownership filter (always applied)      |
| `weight` | `Float`    | Displayed value                        |
| `date`   | `DateTime` | Date range filter target (stored as UTC midnight) |

### Movement (existing)

| Field         | Type      | Relevant Role                          |
|---------------|-----------|----------------------------------------|
| `id`          | `String`  | Record identifier                      |
| `name`        | `String`  | Alphabetical sort key for pagination   |
| `isBodyWeight`| `Boolean` | Displayed attribute                    |

## Pagination Query Parameters

### Workout History & Weight Tracking

Both server functions accept the same parameter shape:

| Parameter   | Type     | Validation                                 | Default (both pages) |
|-------------|----------|--------------------------------------------|----------------------|
| `startDate` | `string` | ISO date `YYYY-MM-DD`; must be ≤ `endDate` | 89 days ago          |
| `endDate`   | `string` | ISO date `YYYY-MM-DD`; must be ≥ `startDate` | today              |
| `page`      | `number` | Integer ≥ 1                                | `1`                  |

**Range constraint**: Validated server-side with a thrown error if violated.
- **Both pages**: `endDate - startDate` must be ≤ **90** calendar days (`MAX_RANGE_DAYS = 90`)

### Movements

| Parameter | Type     | Validation      | Default |
|-----------|----------|-----------------|---------|
| `page`    | `number` | Integer ≥ 1     | `1`     |

No date range parameters — movements have no time dimension.

## Paginated Response Shape

All three server functions return the same envelope structure (with domain-specific `items` type):

```
{
  items:       T[]     // page of records (max 5)
  totalCount:  number  // total records matching the filter
  page:        number  // current page (1-indexed)
  totalPages:  number  // Math.ceil(totalCount / pageSize)
  pageSize:    number  // always 5
}
```

Where `T` is:
- **Workout history**: `Workout & { sets: (Set & { movement: Movement })[] }`
- **Weight entries**: `{ id: number; weight: number; date: string }`; plus `chartItems` (all entries in range, unsliced, for chart rendering
- **Movements**: `{ id: string; name: string; isBodyWeight: boolean }`

## Query Logic

### Workout History

```
WHERE userId = :userId
  AND completedAt IS NOT NULL
  AND completedAt >= :startDate (midnight UTC)
  AND completedAt <= :endDate   (23:59:59.999 UTC)
ORDER BY completedAt DESC
LIMIT 5 OFFSET (page - 1) * 5
```

Count query uses the same `WHERE` clause without `LIMIT`/`OFFSET`.

### Weight Entries

```
WHERE userId = :userId
  AND date >= :startDate (midnight UTC)
  AND date <= :endDate   (midnight UTC, since entries are stored as midnight)
ORDER BY date DESC
LIMIT 5 OFFSET (page - 1) * 5
```

Count query uses the same `WHERE` clause without `LIMIT`/`OFFSET`.

Chart data fetches all entries within the range (no `LIMIT`) sorted ascending, returned as `chartItems`.

### Movements

```
ORDER BY name ASC
LIMIT 5 OFFSET (page - 1) * 5
```

Count query: `SELECT COUNT(*) FROM Movement`.

## URL Search Params Shape

### Workout History & Weight Tracking

| Param  | URL key | Type     | Default      | Example             |
|--------|---------|----------|--------------|---------------------|
| `page` | `page`  | `number` | `1`          | `?page=2`           |
| `from` | `from`  | `string` | 89 days ago  | `?from=2026-05-01`  |
| `to`   | `to`    | `string` | today        | `?to=2026-05-31`    |

Full example: `?page=2&from=2026-05-01&to=2026-05-31`

### Movements

| Param  | URL key | Type     | Default | Example   |
|--------|---------|----------|---------|-----------|
| `page` | `page`  | `number` | `1`     | `?page=2` |

All params are read via `Route.useSearch()` in the component and written via `useNavigate`.

## Constants

| Constant | Value | Location |
|----------|-------|----------|
| `PAGE_SIZE` | `5` | Defined in each server file (`workouts.server.ts`, `weight.server.ts`, `movements.server.ts`) |
| `MAX_RANGE_DAYS` (Workout History) | `90` | `src/lib/workouts.server.ts` |
| `MAX_RANGE_DAYS` (Weight Tracking) | `90` | `src/lib/weight.server.ts` |
| `DEFAULT_RANGE_DAYS` (both date-filtered pages) | `90` (89-day offset → 90-day window) | Client: `src/routes/__index/_layout.workout-history/index.tsx` and `src/routes/__index/_layout.weight/index.tsx` |
