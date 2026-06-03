# Data Model: Workout History & Weight Tracking Pagination with Date Range Filtering

## Schema Changes

**None.** No Prisma schema changes are required. The existing `Workout.completedAt` and `WeightEntry.date` fields already provide sufficient structure for date range filtering.

## Existing Entities Used

### Workout (existing)

| Field         | Type      | Relevant Role                                |
|---------------|-----------|----------------------------------------------|
| `id`          | `String`  | Record identifier                            |
| `userId`      | `String`  | Ownership filter (always applied)            |
| `completedAt` | `DateTime?` | Date range filter target; `NOT NULL` check filters to completed workouts |

### WeightEntry (existing)

| Field    | Type       | Relevant Role                          |
|----------|------------|----------------------------------------|
| `id`     | `Int`      | Record identifier                      |
| `userId` | `String`   | Ownership filter (always applied)      |
| `weight` | `Float`    | Displayed value                        |
| `date`   | `DateTime` | Date range filter target (stored as UTC midnight) |

## Pagination Query Parameters

Both server functions accept the same parameter shape:

| Parameter   | Type     | Validation                                 | Default       |
|-------------|----------|--------------------------------------------|---------------|
| `startDate` | `string` | ISO date `YYYY-MM-DD`; must be ≤ `endDate` | 29 days ago   |
| `endDate`   | `string` | ISO date `YYYY-MM-DD`; must be ≥ `startDate` | today       |
| `page`      | `number` | Integer ≥ 1                                | `1`           |

**Range constraint**: `endDate - startDate` must be ≤ 30 calendar days. Validated server-side with a 400-equivalent error response if violated.

## Paginated Response Shape

Both server functions return the same envelope structure (with domain-specific `items` type):

```
{
  items:       T[]     // page of records (max 20)
  totalCount:  number  // total records matching the date range
  page:        number  // current page (1-indexed)
  totalPages:  number  // Math.ceil(totalCount / pageSize)
  pageSize:    number  // always 20
}
```

Where `T` is:
- **Workout history**: `Workout & { sets: (Set & { movement: Movement })[] }`
- **Weight entries**: `{ id: number; weight: number; date: string }`

## Query Logic

### Workout History

```
WHERE userId = :userId
  AND completedAt IS NOT NULL
  AND completedAt >= :startDate (midnight UTC)
  AND completedAt <= :endDate   (23:59:59.999 UTC)
ORDER BY completedAt DESC
LIMIT 20 OFFSET (page - 1) * 20
```

Count query uses the same `WHERE` clause without `LIMIT`/`OFFSET`.

### Weight Entries

```
WHERE userId = :userId
  AND date >= :startDate (midnight UTC)
  AND date <= :endDate   (midnight UTC, since entries are stored as midnight)
ORDER BY date DESC
LIMIT 20 OFFSET (page - 1) * 20
```

Count query uses the same `WHERE` clause without `LIMIT`/`OFFSET`.

## URL Search Params Shape

Both route files declare the same search param schema via `validateSearch`:

| Param  | URL key | Type     | Default          | Example             |
|--------|---------|----------|------------------|---------------------|
| `page` | `page`  | `number` | `1`              | `?page=2`           |
| `from` | `from`  | `string` | 29 days ago      | `?from=2026-05-01`  |
| `to`   | `to`    | `string` | today            | `?to=2026-05-31`    |

Full example: `?page=2&from=2026-05-01&to=2026-05-31`

All three params are read via `Route.useSearch()` in the component and written via `useNavigate`.

## Constants

| Constant    | Value | Location                         |
|-------------|-------|----------------------------------|
| `PAGE_SIZE` | `20`  | Defined in each server file      |
| `MAX_RANGE_DAYS` | `30` | Defined in each server file |
| `DEFAULT_RANGE_DAYS` | `30` | Derived on client per page load |
