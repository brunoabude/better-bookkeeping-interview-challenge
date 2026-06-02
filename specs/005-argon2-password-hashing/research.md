# Research: Secure Password Hashing with Argon2

## Decision 1: Hashing Library

**Decision**: Use `Bun.password` built-in API (`"argon2id"` variant)

**Rationale**: Bun ships a native `Bun.password` module since v1.0 that wraps the Argon2 reference implementation. It requires zero external dependencies, is maintained by the Bun team, produces PHC-format strings (with embedded salt) that `Bun.password.verify` handles automatically, and is already available in the project's runtime. Since the project is locked to Bun as runtime and package manager, this is zero cost.

**Alternatives considered**:
- `argon2` npm package — works, but adds an external native binding dependency; unnecessary given Bun built-in
- `@node-rs/argon2` — NAPI-based Rust binding; also external; same objection
- `bcryptjs` — pure-JS bcrypt; not memory-hard in the same way as Argon2id; rejected per FR-007 (must use memory-hard algorithm); also the constitution explicitly calls out argon2 as the target

## Decision 2: Salt Storage Strategy

**Decision**: Store the Argon2id PHC string directly in the existing `password` column; no separate `salt` column required

**Rationale**: `Bun.password.hash(password, "argon2id")` returns a PHC string in the format:
```
$argon2id$v=19$m=65536,t=2,p=1$<base64url-salt>$<base64url-hash>
```
The salt, algorithm, version, and parameters are all embedded inline. `Bun.password.verify(password, phcString)` extracts the salt automatically. No separate column is needed, which avoids a schema migration entirely.

**Alternatives considered**:
- Add a `salt String` column — redundant; the PHC format makes it unnecessary and introduces a schema migration
- Split `passwordHash` + `passwordSalt` into two columns — over-engineering; the PHC format was designed precisely to avoid this

## Decision 3: Schema Migration

**Decision**: No Prisma schema migration required

**Rationale**: `password String` maps to PostgreSQL `TEXT` (unlimited length). Argon2id PHC strings are ~95 characters; well within any column definition. The spec explicitly states the user table is treated as empty (no existing rows to migrate). The field name remains `password`; renaming it would create an unnecessary breaking migration.

**Alternatives considered**:
- Rename field to `passwordHash` — clearer semantically, but requires a destructive migration; spec does not require it; rejected per YAGNI (Constitution IV)

## Decision 4: Argon2id Parameters

**Decision**: Use Bun defaults (m=65536 KiB, t=2, p=1)

**Rationale**: Bun's defaults align with OWASP's Argon2id minimum recommendations. At these settings, hashing completes in ~100–300 ms on modern hardware — well under the 2-second budget from SC-007. Parameters are encoded in every PHC string, so they can be changed in future without breaking existing stored hashes (old hashes remain verifiable at their original parameters).

**Alternatives considered**:
- Custom higher parameters — adds complexity; defaults meet OWASP guidelines; revisable when scale demands it

## Decision 5: Password Update Flow

**Decision**: Add `updatePasswordServerFn` to `auth.server.ts` + new `change-password.tsx` route

**Rationale**: No existing password-update endpoint is present in the codebase. User Story 3 (FR-004) explicitly requires the capability and provides acceptance scenarios. Adding `updatePasswordServerFn` to the existing `auth.server.ts` keeps all credential operations in one file (matching the spec assumption). A new `change-password.tsx` route follows the established per-flow pattern (matching `sign-in.tsx` and `create-account.tsx`).

**Alternatives considered**:
- Defer to a later feature — rejected; spec has explicit acceptance scenarios; it is in-scope
- Embed in a generic "settings" page — would require a new settings section unrelated to this feature; simpler to add a dedicated route

## Decision 6: No Migration Path for Existing Plaintext Passwords

**Decision**: Skip FR-008 / FR-009 (transition path for existing accounts)

**Rationale**: The spec assumptions explicitly state: "There is no need for migrating existing passwords. The app has no active users so no additional complexity should be added to handle this scenario." The user table is treated as empty. FR-008 and FR-009 are superseded by this assumption.

**Alternatives considered**:
- Implement lazy migration (hash on first login) — explicitly rejected by spec assumptions; adds complexity for no benefit
