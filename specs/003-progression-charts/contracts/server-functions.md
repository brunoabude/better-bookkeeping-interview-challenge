# Server Function Contracts

## getMovementProgressionServerFn

### Purpose

Returns pre-aggregated progression data for a specific movement, scoped to the
authenticated user. Covers all three metrics (Maximum Weight, Total Reps, Total Volume)
in a single call so metric switching requires no additional network request.

### Method

`GET` (TanStack Start `createServerFn()` default)

### Auth

Required — uses `authMiddleware`. Unauthenticated calls are rejected before the handler
runs. Only the authenticated user's own data is returned (satisfies FR-010).

### Input Validator (Zod)

```typescript
z.object({
  movementId: z.string(),
})
```

### Output

```typescript
Array<{
  date: string;           // "YYYY-MM-DD"
  maxWeight: number | null;
  totalReps: number;
  totalVolume: number;
}>
```

Ordered by `date ASC`. Returns `[]` when no data exists for the given movement.

### Query Shape (Prisma)

```typescript
prisma.set.findMany({
  where: {
    movementId: data.movementId,
    workout: {
      userId: context.user.id,
      completedAt: { not: null },
    },
  },
  select: {
    reps: true,
    weight: true,
    workout: { select: { completedAt: true } },
  },
  orderBy: { workout: { completedAt: "asc" } },
})
```

Results are grouped by calendar date in application code (Prisma does not support
`DATE()` extraction across all adapters uniformly). Grouping is O(n) on the set count
for the movement — acceptable for the data volumes described in SC-003 (50+ sets).

### Error Handling

The server function does NOT expose internal error messages to the client (Principle III).
Unexpected errors propagate as generic 500 responses via TanStack Start's default
error boundary.

---

## Unchanged Server Functions

The following existing server functions are used unchanged by this feature:

| Function | File | Usage |
|----------|------|-------|
| `getWorkoutHistoryServerFn` | `src/lib/workouts.server.ts` | Provides the movement list for the selector (unique movements derived from cached result) |
