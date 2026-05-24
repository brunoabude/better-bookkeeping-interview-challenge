# Data Model: Body-Weight Movements

**Feature**: `002-bodyweight-movements` | **Phase**: 1 | **Date**: 2026-05-24

## Modified Entity: Movement

### Schema Change

```prisma
model Movement {
  id           String  @id @default(uuid())
  name         String
  isBodyWeight Boolean @default(false)   // ← NEW FIELD
  sets         Set[]
}
```

**Migration**: Non-breaking. All existing rows receive `isBodyWeight = false` via the column default.

### Field Details

| Field | Type | Default | Nullable | Description |
|-------|------|---------|----------|-------------|
| `id` | `String` (UUID) | `uuid()` | No | Primary key — unchanged |
| `name` | `String` | — | No | Display name — unchanged |
| `isBodyWeight` | `Boolean` | `false` | No | Designates movement as body-weight; drives auto-fill behavior |
| `sets` | `Set[]` | — | — | Relation — unchanged |

### Validation Rules

- `isBodyWeight` must be a boolean; Zod: `z.boolean().default(false)`
- On creation, `isBodyWeight` defaults to `false` if omitted from the request body
- On edit, `isBodyWeight` must be explicitly provided (no partial-update ambiguity)

### State Transitions

`isBodyWeight` is a simple boolean with no guarded state machine:

```
false ──(user edits & enables toggle)──▶ true
true  ──(user edits & disables toggle)──▶ false
```

Toggling the flag does NOT retroactively alter any `Set` records linked to this movement (FR-008).

---

## Read-Only Entity: WeightEntry (Feature 001)

This feature reads from `WeightEntry` but does not write to it.

```prisma
model WeightEntry {
  id     Int      @id @default(autoincrement())
  userId String
  weight Float
  date   DateTime
  user   User     @relation(fields: [userId], references: [id])

  @@unique([userId, date])
}
```

### Access Pattern for This Feature

- **Query**: `SELECT * FROM "WeightEntry" WHERE "userId" = $userId ORDER BY "date" DESC LIMIT 1`
- **Purpose**: Provides the auto-fill default for the weight field when a body-weight movement is added to the current workout
- **Result**: Single `{ weight: Float, date: DateTime }` row or `null`
- **Auth**: Requires authenticated user (`authMiddleware`)

---

## Unchanged Entities

The following entities are unchanged by this feature. Listed for reference only.

### User

```
id, email, name, password, createdAt, updatedAt
→ Relations: Workout[], WeightEntry[]
```

### Workout

```
id, userId, completedAt
→ Relations: User, Set[]
```

### Set

```
id, workoutId, movementId, reps, weight
→ Relations: Workout, Movement
```

`weight` on `Set` remains `Int` — auto-fill supplies the initial value client-side, but the server always receives the final user-confirmed value.

---

## Entity Relationship Summary

```
User ──┬── Workout ── Set ──── Movement (isBodyWeight: boolean)  [NEW flag]
       └── WeightEntry                                            [read-only]
```

The `isBodyWeight` flag on `Movement` and the latest `WeightEntry` for a `User` are the only two data points involved in the auto-fill behavior. They are never joined server-side; the client resolves them from separate React Query caches.
