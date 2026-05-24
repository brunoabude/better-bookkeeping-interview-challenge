# Server Function Contracts: Body-Weight Movements

**Feature**: `002-bodyweight-movements` | **Phase**: 1 | **Date**: 2026-05-24

All server functions use `createServerFn` from `@tanstack/react-start`. Method, input validation (Zod), and auth middleware are specified per function.

---

## Modified: `createMovementServerFn`

**File**: `src/lib/movements.server.ts`

**Method**: POST

**Auth**: None (movements are a global resource)

### Input

```typescript
// Before (existing)
{ name: string }  // min length 1

// After (this feature)
{
  name: string          // min length 1 — unchanged
  isBodyWeight?: boolean // NEW; defaults to false if omitted
}
```

**Zod schema**:

```typescript
z.object({
  name: z.string().min(1),
  isBodyWeight: z.boolean().default(false),
})
```

### Output

```typescript
{
  success: true
  movement: {
    id: string
    name: string
    isBodyWeight: boolean   // NEW field in response
  }
}
```

### Error Cases

Unchanged from existing implementation.

---

## Modified: `getMovementsServerFn`

**File**: `src/lib/movements.server.ts`

**Method**: GET

**Auth**: None

### Input

None.

### Output

```typescript
Array<{
  id: string
  name: string
  isBodyWeight: boolean   // NEW field in response
}>
```

The list is ordered alphabetically by `name` (unchanged). The `isBodyWeight` field is included for every movement.

### Backwards Compatibility

All existing movements will have `isBodyWeight: false` after the migration. No client-side breakage expected.

---

## New: `updateMovementServerFn`

**File**: `src/lib/movements.server.ts`

**Method**: POST

**Auth**: None (movements are a global resource)

### Input

```typescript
{
  id: string
  isBodyWeight: boolean
}
```

**Zod schema**:

```typescript
z.object({
  id: z.string().uuid(),
  isBodyWeight: z.boolean(),
})
```

### Output

```typescript
{
  success: true
  movement: {
    id: string
    name: string
    isBodyWeight: boolean
  }
}
| {
  success: false
  error: string   // e.g., "Movement not found"
}
```

### Error Cases

| Condition | Response |
|-----------|----------|
| Movement with `id` not found | `{ success: false, error: "Movement not found" }` |
| Invalid UUID format | Zod validation error (400) |

---

## New: `getLatestWeightServerFn`

**File**: `src/lib/weight.server.ts`

**Method**: GET

**Auth**: `authMiddleware` (reads user-specific data)

### Input

None.

### Output

```typescript
// When at least one WeightEntry exists for the user:
{
  weight: number   // Float, in lbs
  date: string     // ISO 8601 string, e.g. "2026-05-20T00:00:00.000Z"
}

// When no WeightEntry exists:
null
```

### Prisma Query

```typescript
prisma.weightEntry.findFirst({
  where: { userId: context.user.id },
  orderBy: { date: 'desc' },
  select: { weight: true, date: true },
})
```

### Error Cases

| Condition | Response |
|-----------|----------|
| Unauthenticated | Redirect to `/sign-in` (handled by `authMiddleware`) |
| No weight entries | `null` (not an error) |

---

## Unchanged: `addSetServerFn`

**File**: `src/lib/workouts.server.ts`

The `addSetServerFn` signature and behavior are **not changed** by this feature. Auto-fill is a client-side concern: the form pre-populates the `weight` field, but the server always receives the explicit weight value as provided by the user.

```typescript
// Input — unchanged
{
  movementId: string
  reps: number       // min 1
  weight: number     // min 0
}
```
