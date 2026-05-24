# Data Model: Weight Tracking

**Feature**: 001-weight-tracking | **Date**: 2026-05-24

## New Entity: WeightEntry

### Purpose

Stores a single body weight measurement for a user on a specific calendar day. Enforces one entry per user per day at the database level via a composite unique index.

### Prisma Schema Addition

```prisma
model WeightEntry {
  id     String   @id @default(uuid())
  userId String
  user   User     @relation(fields: [userId], references: [id])
  weight Float // in lbs, the canonical unit for this system
  date   DateTime // UTC midnight of the calendar day

  @@unique([userId, date])
}
```

The `User` model gains the inverse relation field:

```prisma
model User {
  // ... existing fields ...
  weightEntries WeightEntry[]
}
```

### Fields

| Field    | Type     | Constraints                             | Description                                    |
|----------|----------|-----------------------------------------|------------------------------------------------|
| `id`     | String   | PK, UUID auto-generated                 | Unique record identifier                       |
| `userId` | String   | FK → User.id, NOT NULL                  | Owning user; always from `context.user.id`     |
| `weight` | Float    | > 0, ≤ 320 (Zod-enforced at boundary)  | Body weight value in lbs           |
| `date`   | DateTime | Composite unique with `userId`, NOT NULL | UTC midnight of the entry's calendar day      |

### Validation Rules

- `weight` must be > 0 and ≤ 320. The upper bound corresponds to 320 kg ≈ 705 lbs (FR-009). Enforced via Zod in `upsertWeightEntryServerFn`.
- `date` is always computed server-side as `new Date(Date.UTC(y, m, d))`. Clients never send a date field.
- `userId` is always taken from `context.user.id` via `authMiddleware`. Never accepted from client input.

### State Transitions

```
(no entry for today) --[upsert weight]→ (entry exists for today)
(entry exists today) --[upsert weight]→ (entry updated for today, same id)
(entry exists)       --[delete by id]→  (entry removed; chart/list update)
```

### Relation to Existing Schema

```
User ──1────────────────*── WeightEntry
(existing model)            (new model)
```

WeightEntry does not reference `Workout`, `Set`, or `Movement`. The implicit contract where Feature 2 reads the user's most recent weight is handled in Feature 2's own server function — Feature 1 exposes no explicit API for that cross-feature dependency.

### Indexes

- **Primary key** on `id` (auto)
- **Composite unique index** on `(userId, date)` — enforces one-entry-per-day and doubles as the query index for `findMany({ where: { userId } })`

### Migration

```bash
bunx prisma migrate dev --name add-weight-entry
```

This generates a migration that:
1. Creates the `WeightEntry` table
2. Adds the composite unique index on `(userId, date)`
3. Regenerates the Prisma client with full TypeScript types
