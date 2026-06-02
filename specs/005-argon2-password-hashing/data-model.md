# Data Model: Secure Password Hashing with Argon2

## Schema Changes

**None.** The Prisma schema is unchanged. The `User.password` field already uses `String` which maps to PostgreSQL `TEXT` (unlimited length), sufficient for the ~95-character Argon2id PHC string.

## Existing Entity: User

```prisma
model User {
  id            String        @id @default(uuid())
  email         String        @unique
  name          String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  password      String        // stores Argon2id PHC string after this feature
  workouts      Workout[]
  weightEntries WeightEntry[]
}
```

| Field | Type | Behaviour after this feature |
|-------|------|------------------------------|
| `id` | `String` (UUID) | Unchanged |
| `email` | `String` (unique) | Unchanged |
| `name` | `String?` | Unchanged |
| `password` | `String` | Stores the Argon2id PHC string — never contains plaintext after any write operation |
| `createdAt` | `DateTime` | Unchanged |
| `updatedAt` | `DateTime` | Auto-updated on password change |

## Credential Format

### Argon2id PHC String (what is stored in `User.password`)

`Bun.password.hash(plaintext, "argon2id")` returns a PHC-format string:

```
$argon2id$v=19$m=65536,t=2,p=1$<base64url-salt>$<base64url-hash>
```

| Segment | Meaning |
|---------|---------|
| `argon2id` | Algorithm: Argon2id (hybrid of Argon2i + Argon2d) |
| `v=19` | Argon2 specification version 1.3 |
| `m=65536` | Memory cost: 64 MiB |
| `t=2` | Time cost: 2 iterations |
| `p=1` | Parallelism: 1 thread |
| `<base64url-salt>` | Per-user unique random salt (22 chars base64url, ~16 bytes) |
| `<base64url-hash>` | Derived key output (43 chars base64url, ~32 bytes) |

Total string length: ~95 characters. PostgreSQL `TEXT` accommodates this without length constraints.

## Validation Rules

| Operation | Rules |
|-----------|-------|
| Account creation | `password` min 6 chars (Zod); hashed with `Bun.password.hash` before `prisma.user.create` |
| Sign-in | `Bun.password.verify(submitted, stored)` must return `true`; identical error message on user-not-found vs wrong-password |
| Password update | `currentPassword` must verify; `newPassword` min 6 chars (Zod); new PHC string replaces stored value |

## State Transitions

```
User.password lifecycle:

  Registration:
    plaintext input
      → Bun.password.hash(plaintext, "argon2id")
      → PHC string persisted in User.password

  Sign-in (read-only):
    PHC string (stored) + plaintext input
      → Bun.password.verify(plaintext, phcString) → true | false
      → no mutation to User.password

  Password update:
    1. Bun.password.verify(currentPlaintext, storedPhcString) → must be true
    2. Bun.password.hash(newPlaintext, "argon2id") → new PHC string
    3. new PHC string persisted in User.password (replaces previous)
    → fresh salt generated automatically for every hash call
```
