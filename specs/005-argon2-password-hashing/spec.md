# Feature Specification: Secure Password Hashing with Argon2

**Feature Branch**: `005-argon2-password-hashing`

**Created**: 2026-06-02

**Status**: Draft

**Input**: User description: "The authentication system stores passwords in plaintext. Update the password generation mechanism to use argon2 with proper hashing, salting and secure checks. The password should be stored in its cryptographed form. The salt should be correctly applied when bothing creating, updating and checking the password."

## Clarifications

### Session 2026-06-02

- Q: What runtime does the application execute under? → A: Vite/Node.js — Bun built-in APIs (e.g., `Bun.password`) are not available in this environment.
- Q: Which Argon2 library must be used for hashing and verification? → A: The `argon2` npm package (Node.js-compatible); no Bun-specific API may be used.
- Q: Where should the password hashing helper module live? → A: `src/lib/password.server.ts` — a dedicated server-only module following the `.server.ts` naming convention.
- Q: How should auth e2e tests handle the global authenticated session injected by Playwright's `storageState`? → A: Use `test.use({ storageState: { cookies: [], origins: [] } })` inside the `auth.spec.ts` describe block so those tests start unauthenticated — without this, a signed-in user is redirected away from `/create-account` before the test can run.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Secure Account Creation (Priority: P1)

When a new user registers or an account is created by an administrator, the user's password must never be stored in readable form. The system derives a protected credential from the password and stores only that protected form along with the data needed to verify it later.

**Why this priority**: This is the most critical security control — without it, any database exposure reveals all user credentials immediately. Every other story depends on this foundational change.

**Independent Test**: Can be fully tested by creating a new account and inspecting the stored credential record — the stored value must not match the plaintext password and must include all data required for future verification.

**Acceptance Scenarios**:

1. **Given** a user submits a new password during registration, **When** the account is saved, **Then** the stored credential is unrecognizable as the original password and contains all data required to verify the password later.
2. **Given** a database record for a newly created account, **When** the stored credential is inspected directly, **Then** it does not contain the plaintext password.
3. **Given** two accounts created with the same password, **When** their stored credentials are compared, **Then** the stored values are different from each other (unique salting per account).

---

### User Story 2 - Secure Login Verification (Priority: P1)

When a user attempts to log in by submitting their password, the system verifies the submitted password against the stored protected credential — without ever reconstructing or exposing the original password.

**Why this priority**: Login verification is the primary consumer of the stored credential. If verification is broken, users cannot access the system, making it a critical path alongside account creation.

**Independent Test**: Can be fully tested by creating an account, then attempting login with the correct and incorrect password and confirming the correct outcomes each time.

**Acceptance Scenarios**:

1. **Given** an account with a securely stored credential, **When** the user submits the correct password, **Then** the system grants access successfully.
2. **Given** an account with a securely stored credential, **When** the user submits an incorrect password, **Then** the system denies access and does not reveal the stored credential.
3. **Given** an account whose credential was created with a unique salt, **When** the correct password is submitted, **Then** the system uses the correct salt associated with that account for verification.

---

### User Story 3 - Secure Password Update (Priority: P2)

When a user changes their password, the system replaces the old protected credential with a new one derived from the new password, applying the full hashing and salting process from scratch.

**Why this priority**: Password updates are less frequent than login but must receive the same protection as account creation; a plaintext-safe update path closes the last gap in the password lifecycle.

**Independent Test**: Can be fully tested by changing a password and confirming that the new stored credential is different from both the old stored credential and the plaintext new password, and that login succeeds only with the new password.

**Acceptance Scenarios**:

1. **Given** a user with an existing stored credential, **When** the user successfully changes their password, **Then** the new stored credential is different from the previous stored credential.
2. **Given** a user who has just changed their password, **When** they attempt login with the old password, **Then** access is denied.
3. **Given** a user who has just changed their password, **When** they attempt login with the new password, **Then** access is granted.
4. **Given** the password change process, **When** a new credential is generated, **Then** a new unique salt is applied (not reusing the previous salt).

---

### Edge Cases

- What happens when a password contains special characters, unicode, or very long strings (e.g., > 1000 characters)?
- How does the system handle a corrupted or malformed stored credential during login?
- What happens if the hashing process fails mid-operation (e.g., system resource exhaustion)?
- How are concurrent password-change requests for the same account handled?
- What happens when an administrator resets a user's password — does the full secure process apply?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST store user passwords exclusively in a hashed and salted form — no plaintext password may persist in any storage layer after the hashing operation completes.
- **FR-002**: The system MUST generate a unique, random salt for each user account independently, so that two accounts with identical passwords produce different stored credentials.
- **FR-003**: The system MUST apply the salt correctly and consistently when creating a new credential, so that the same process can later be used to verify the password.
- **FR-004**: The system MUST apply the salt correctly and consistently when a password is updated, generating a new salt and a new hashed credential that replaces the previous one.
- **FR-005**: The system MUST verify a submitted password by deriving a credential using the stored salt for that account and comparing it to the stored credential, without reconstructing or exposing the original password.
- **FR-006**: The system MUST reject login attempts where the submitted password does not match the stored credential, regardless of whether the stored credential was created under the old or new scheme.
- **FR-007**: The system MUST use a memory-hard, slow hashing algorithm (Argon2id variant) for all new credential derivations, implemented via the `argon2` npm package (Node.js-compatible). No Bun-specific runtime APIs may be used for this purpose.
- **FR-011**: All password hashing and verification operations MUST be encapsulated in a dedicated server-only module (`src/lib/password.server.ts`) that exposes exactly two functions: `hashPassword(password: string): Promise<string>` and `verifyPassword(password: string, hash: string): Promise<boolean>`. All other modules MUST call these functions rather than invoking any hashing library directly, so the implementation can be swapped without touching auth logic.
- **FR-008**: The system MUST support a transition path for existing accounts with plaintext passwords, converting them to the secure format transparently on the next successful login.
- **FR-009**: After an existing account's credential has been converted, the system MUST no longer use any plaintext fallback path for that account.
- **FR-010**: The system MUST apply the same secure hashing process when an administrator resets a user's password.

### Key Entities

- **User Credential Record**: Represents a user's stored authentication data; contains the hashed credential (the output of the hashing process) and the associated salt; does not contain the plaintext password at any point after creation.
- **Salt**: A unique, randomly generated value associated with a single user's credential; combined with the plaintext password as input to the hashing process; stored alongside the hashed credential.
- **Hashed Credential**: The output produced by running the password and salt through the hashing algorithm; the only form in which a password is persisted; used exclusively for comparison during login verification.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of newly created user accounts have their passwords stored in hashed form — zero accounts created after the change contain a readable plaintext password in any storage layer.
- **SC-002**: 100% of password update operations produce a stored credential that differs from both the previous credential and the plaintext input.
- **SC-003**: Login verification succeeds for all users who submit the correct password, with a success rate matching the pre-change baseline (no regression in valid login outcomes).
- **SC-004**: Login verification rejects 100% of incorrect password submissions, with no false positives.
- **SC-005**: A direct inspection of the credential storage for any account reveals no plaintext password.
- **SC-006**: The hashing operation completes within an acceptable time window (under 2 seconds per operation) so that user-perceived login and registration latency is not materially degraded.

## Assumptions

- The application currently has a functioning authentication system with a user credential store; this feature modifies how passwords are stored and verified within that existing system.
- The database schema can be updated to store the hashed credential and salt (either as separate fields or as a combined encoded string); no data model redesign beyond this is in scope.
- All password-related operations (account creation, login, password update, administrative reset) pass through a centralized authentication layer that can be updated in one place.
- There is no need for migrating existing passwords. The app has no active users so no additional complexity should be added to handle this scenario. 
- The user table should be considered empty, so there is no need for handling existing passwords that are currently in plaintext. It's the admin responsability for deleting any user accounts that are in plain text.
- There is no external identity provider (SSO, OAuth) in scope — this feature applies to locally managed credentials only.
- The hashing configuration parameters (memory cost, time cost, parallelism) will be set to values meeting current security best-practice recommendations and will be revisable without requiring a full re-migration.
- The application runs in a Vite/Node.js runtime; Bun-specific built-in APIs (e.g., `Bun.password`) are not available and MUST NOT be used.
- The `argon2` npm package is the approved Node.js implementation for Argon2id hashing; it is installed as a production dependency.
