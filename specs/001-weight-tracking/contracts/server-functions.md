# Server Functions Contract: Weight Tracking

**Feature**: 001-weight-tracking | **Date**: 2026-05-24  
**File**: `src/lib/weight.server.ts`

All functions use `authMiddleware`. `context.user.id` is the authenticated user's ID and is never accepted from client input.

---

## `getWeightEntriesServerFn`

**Method**: GET (default)  
**Auth**: Required (`authMiddleware`)  
**Input**: None

**Output**:
```typescript
Array<{
  id: string;
  weight: number;
  unit: string;
  date: string; // ISO 8601 date string (UTC midnight)
}>
```

Ordered by `date` ascending (oldest first) so the chart renders chronologically left-to-right.

---

## `upsertWeightEntryServerFn`

**Method**: POST  
**Auth**: Required (`authMiddleware`)

**Input**:
```typescript
{
  weight: number; // validated: > 0, ≤ 320
}
```

**Output (success)**:
```typescript
{
  success: true;
  entry: {
    id: string;
    weight: number;
    unit: string;
    date: string; // ISO 8601
  };
}
```

**Output (validation failure)**:
```typescript
{
  success: false;
  error: string;
}
```

**Behaviour**:
- Computes `date` server-side as UTC midnight of the current calendar day
- If an entry already exists for `(userId, date)`, updates its `weight` (Prisma `upsert`)
- If no entry exists, creates a new one
- Validates input with Zod: `z.object({ weight: z.number().positive().max(320) })`
- Never exposes DB errors or stack traces to the client

---

## `deleteWeightEntryServerFn`

**Method**: POST  
**Auth**: Required (`authMiddleware`)

**Input**:
```typescript
{
  id: string;
}
```

**Output (success)**:
```typescript
{ success: true }
```

**Output (not found / wrong user)**:
```typescript
{ success: false; error: "Not found" }
```

**Behaviour**:
- Looks up the entry with the given `id` where `userId = context.user.id` before deleting
- Returns `{ success: false, error: "Not found" }` if the entry doesn't exist or belongs to a different user (no information leakage about other users' data)
- On success, the client invalidates the weight query so the list and chart re-render immediately
