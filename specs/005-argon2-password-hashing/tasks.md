# Tasks: Secure Password Hashing with Argon2

**Input**: Design documents from `/specs/005-argon2-password-hashing/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/server-functions.md ✅

**Tests**: E2e tests are included — required by Constitution Principle II (every user-facing feature MUST have at least one Playwright e2e test on the happy path).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths are included in all descriptions

---

## Phase 1: Setup

This feature modifies an existing file and adds three new files. The `argon2` npm package must be installed as a production dependency (`bun add argon2`). The application runs in a Vite/Node.js runtime; `Bun.password` is not available.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the dedicated `src/lib/password.server.ts` helper module (FR-011) and import it in `src/lib/auth.server.ts`. All three user stories call these helpers; they MUST exist before any user story task starts.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T001 Create `src/lib/password.server.ts` exporting `hashPassword(password: string): Promise<string>` and `verifyPassword(password: string, hash: string): Promise<boolean>` using `argon2.hash(password, { type: argon2.argon2id })` and `argon2.verify(hash, password)` from the `argon2` npm package; import both functions in `src/lib/auth.server.ts`

**Checkpoint**: `src/lib/password.server.ts` exists, `auth.server.ts` imports from it, and `bunx tsc --noEmit` passes with no errors.

---

## Phase 3: User Story 1 — Secure Account Creation (Priority: P1) 🎯 MVP

**Goal**: Passwords are hashed with Argon2id before being stored; no plaintext password is ever written to the database.

**Independent Test**: Create a new account via the UI, then query the `User` table directly and confirm `password` starts with `$argon2id$`. Alternatively, create two accounts with the same password and confirm the stored `password` values differ.

### Implementation for User Story 1

- [X] T002 [US1] In `src/lib/auth.server.ts`, update `createAccountServerFn` handler: replace `password` with `await hashPassword(password)` in the `prisma.user.create` data object (currently line 112)

**Checkpoint**: Creating a new account via `http://localhost:3200/create-account` succeeds; inspecting the `User` row in Postgres shows a PHC string (`$argon2id$…`) in the `password` column, not the plaintext.

---

## Phase 4: User Story 2 — Secure Login Verification (Priority: P1)

**Goal**: Sign-in verifies the submitted password against the stored Argon2id hash using a timing-safe comparison; plaintext comparison is removed.

**Independent Test**: With a newly created account (from Phase 3), attempt sign-in with the correct password (succeeds) and with an incorrect password (denied with generic error message, no redirect).

### Implementation for User Story 2

- [X] T003 [US2] In `src/lib/auth.server.ts`, update `signInServerFn` handler: replace the plaintext comparison `user.password !== password` (currently line 84) with `!(await verifyPassword(password, user.password))`

**Checkpoint**: Sign-in with the correct password redirects to `/current-workout`; sign-in with a wrong password returns `{ success: false, error: "Invalid email or password" }` and stays on the sign-in page.

---

## Phase 5: User Story 3 — Secure Password Update (Priority: P2)

**Goal**: Users can change their password; the new password is hashed with a fresh Argon2id salt; the old password stops working immediately.

**Independent Test**: Sign in, change password, sign out, then confirm: (a) new password grants access; (b) old password is rejected.

### Implementation for User Story 3

- [X] T004 [US3] In `src/lib/auth.server.ts`, add and export `updatePasswordServerFn` after `logoutServerFn`: it must (1) resolve the current user from the session cookie using the existing `verifySessionToken` + `prisma.user.findUnique` pattern; (2) return `{ success: false, error: "Not authenticated" }` if no valid session; (3) call `verifyPassword(currentPassword, user.password)` and return `{ success: false, error: "Current password is incorrect" }` on failure; (4) on success, call `prisma.user.update` with `password: await hashPassword(newPassword)`; (5) validate input with Zod schema `{ currentPassword: z.string(), newPassword: z.string().min(6) }`
- [X] T005 [US3] Create `src/routes/change-password.tsx` as a new protected route: use `authMiddleware` in `beforeLoad` (following the pattern of other protected routes), render a form with "Current password", "New password", and "Confirm new password" fields, call `updatePasswordServerFn` on submit, show inline error messages on failure, redirect to `/` on success; the page title should be "Change password"

**Checkpoint**: Navigate to `http://localhost:3200/change-password` while signed in; submitting with the correct current password and a valid new password returns `{ success: true }` and redirects; attempting sign-in with the old password is then denied.

---

## Phase 6: Polish & E2E Test Coverage (Constitution requirement)

**Purpose**: Add Playwright e2e tests required by Constitution Principle II. These tests verify the behavioral outcomes of all three user stories through the UI — not internal implementation details.

- [X] T006 [P] Create `e2e/auth.spec.ts` and add the following three tests:
  1. **"creates account and signs in with correct password"** — navigate to `/create-account`, register a unique test user, confirm redirect to a protected route, sign out, sign in with the same password, confirm access granted (covers US1 + US2 happy path)
  2. **"rejects sign-in with wrong password"** — attempt sign-in for the account created in step 1 with an incorrect password, confirm error message shown and no redirect (covers US2 rejection)
  3. **"password update: new password works, old password does not"** — sign in, navigate to `/change-password`, change password to a new value, sign out, sign in with the new password (success), sign out, sign in with the old password (denied) (covers US3 full cycle)

  Use `waitForHydration` from `e2e/shared.ts`. Generate a unique email per test run (e.g., `auth-test-${Date.now()}@test.local`) to avoid cross-test state. Mark the test file with `test.describe('auth — password hashing', ...)`.

**Checkpoint**: `bunx playwright test e2e/auth.spec.ts --project=chromium` passes all three tests (requires dev environment running on port 3000).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No dependencies — start immediately
- **User Story 1 (Phase 3)**: Depends on T001
- **User Story 2 (Phase 4)**: Depends on T001
- **User Story 3 (Phase 5)**: Depends on T001; T005 depends on T004
- **Polish (Phase 6)**: Depends on Phase 3 + Phase 4 + Phase 5 for meaningful test coverage

### User Story Dependencies

- **US1 (Phase 3)**: T001 → T002. No dependency on US2 or US3.
- **US2 (Phase 4)**: T001 → T003. No dependency on US1 or US3 (but meaningful e2e testing of US2 requires US1 to exist so accounts can be created with hashed passwords).
- **US3 (Phase 5)**: T001 → T004 → T005. Conceptually depends on US1 (accounts needed) and US2 (sign-in needed for the test cycle), but the server function itself has no code dependency on the US1/US2 tasks.

### Within Each User Story

- Models before services: N/A — no schema changes; the `User` model is unchanged
- Services before UI: T004 (server function) before T005 (route/UI)
- Implementation before e2e tests: T002 + T003 + T004 + T005 before T006

### Parallel Opportunities

- T002 and T003 both modify `src/lib/auth.server.ts`; they cannot run in parallel without merge conflicts — execute sequentially
- T004 (auth.server.ts) and any future route work are in different files once T004 is complete; T005 can start immediately after T004 lands
- T006 is marked [P] — it can be written in parallel with T005 since it's a different file, but meaningful execution requires T002–T005 to be complete

---

## Parallel Example: User Story 3

```bash
# After T004 lands, T005 (different file) can start immediately:
Task T004: "Add updatePasswordServerFn to src/lib/auth.server.ts"
Task T005: "Create src/routes/change-password.tsx" — starts once T004 is merged
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 2: Foundational (T001) — adds helpers
2. Complete Phase 3: User Story 1 (T002) — account creation hashes password
3. Complete Phase 4: User Story 2 (T003) — sign-in verifies hash
4. **STOP and VALIDATE**: create account + sign in/out works end-to-end
5. This closes the critical security gap (FR-001, FR-007) with minimal change surface

### Incremental Delivery

1. T001 → T002 → T003: Core security fix — no plaintext passwords stored or compared
2. T004 → T005: Add password-update capability
3. T006: E2e tests for all three stories
4. Each increment is independently deployable

---

## Notes

- **No schema migration**: `prisma/schema.prisma` is not changed; the `password String` column already stores `TEXT` which accommodates the ~95-char PHC string
- **No new packages**: `Bun.password` is a Bun runtime built-in; `bun install` is not required
- **`[P]` tasks**: T006 is in a different file from the implementation tasks — it can be written concurrently with T005 (different file), but running it requires the implementation to be complete
- **Session continuity**: `updatePasswordServerFn` does not invalidate the current session cookie; the user stays signed in after a password change (intentional, per design)
- **Conventional commits**: prefix all commits with `feat(auth):` per Constitution Principle V
