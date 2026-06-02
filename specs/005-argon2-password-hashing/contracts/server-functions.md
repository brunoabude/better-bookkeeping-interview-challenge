# Server Function Contracts

All server functions live in `src/lib/auth.server.ts` and are called from React components via TanStack Start's `createServerFn`.

---

## Modified: `signInServerFn`

**Method**: POST

**Input schema** (Zod, unchanged):
```ts
{ email: string, password: string }
```

**Success response**:
```ts
{ success: true }
```
Side effect: sets `session` HttpOnly cookie (HMAC-signed `{userId}.{sig}`, 7-day TTL).

**Failure response**:
```ts
{ success: false, error: "Invalid email or password" }
```
Triggered when: user not found **or** `Bun.password.verify(password, user.password)` returns `false`. Identical message in both cases — no credential enumeration.

**Change from current**: `user.password !== password` (plaintext comparison) → `await Bun.password.verify(password, user.password)` (constant-time Argon2id verification).

---

## Modified: `createAccountServerFn`

**Method**: POST

**Input schema** (Zod, unchanged):
```ts
{ email: string, name: string, password: string }
// password: min 6 characters
```

**Success response**:
```ts
{ success: true }
```
Side effects: creates `User` row with `password` set to Argon2id PHC string; sets `session` cookie.

**Failure response**:
```ts
{ success: false, error: "An account with this email already exists" }
```

**Change from current**: `prisma.user.create({ data: { ..., password } })` (plaintext) → `prisma.user.create({ data: { ..., password: await hashPassword(password) } })` (PHC string).

---

## New: `updatePasswordServerFn`

**Method**: POST

**Auth**: requires active session; reads current user from session cookie.

**Input schema** (Zod):
```ts
{ currentPassword: string, newPassword: string }
// newPassword: min 6 characters
```

**Success response**:
```ts
{ success: true }
```
Side effect: updates `User.password` with new Argon2id PHC string (fresh salt). Does **not** invalidate existing session cookie.

**Failure responses**:
```ts
{ success: false, error: "Not authenticated" }      // no valid session
{ success: false, error: "Current password is incorrect" }  // verify failed
```

**Invariants**:
- `currentPassword` is verified with `Bun.password.verify` before any mutation
- `newPassword` is hashed with `Bun.password.hash(newPassword, "argon2id")` — a new random salt is generated automatically on every call
- Prisma's `updatedAt` field is bumped automatically by the update

---

## Unchanged: `getUserServerFn`, `logoutServerFn`, `authMiddleware`

These functions have no interaction with password storage and require no changes.
