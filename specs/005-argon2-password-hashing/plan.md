# Implementation Plan: Secure Password Hashing with Argon2

**Branch**: `005-argon2-password-hashing` | **Date**: 2026-06-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-argon2-password-hashing/spec.md`

## Summary

Replace plaintext password storage in `src/lib/auth.server.ts` with Argon2id hashing using Bun's built-in `Bun.password` API. The existing `password String` field in the `User` model stores the Argon2id PHC string (which embeds the salt inline); no schema migration is required. Three call sites need updating — account creation, sign-in verification, and a new password-update server function — plus a new `change-password.tsx` UI route and an `e2e/auth.spec.ts` test file.

## Technical Context

**Language/Version**: TypeScript 5.x, strict mode, Bun runtime (1.x)

**Primary Dependencies**: TanStack Start (SSR), Prisma 7.2.0 (PostgreSQL), Zod (input validation), `Bun.password` built-in (Argon2id — no external library required)

**Storage**: PostgreSQL via Prisma; `User.password` stores the Argon2id PHC string; no schema change required

**Testing**: Vitest (unit), Playwright (e2e)

**Target Platform**: Linux server (Bun runtime)

**Project Type**: Web application (SSR via TanStack Start)

**Performance Goals**: < 2 s per hash/verify operation (SC-007); Bun's default Argon2id parameters (m=65536 KiB, t=2, p=1) are well within this bound (~100–300 ms on modern hardware)

**Constraints**: Zero plaintext passwords in any storage layer at any point after the hashing operation completes; no external hashing library (Bun built-in reduces dependency surface)

**Scale/Scope**: Small user base; auth operations are low-frequency; user table is treated as empty (no existing rows to migrate per spec assumption)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Type Safety | ✅ PASS | All modifications in TypeScript strict; server functions are strongly typed via `.inputValidator()` + explicit handler return types |
| II. Test Coverage | ✅ PASS | New `e2e/auth.spec.ts` covers: create-account happy path, sign-in success/failure, password-update success + old-password rejection |
| III. Security by Default | ✅ PASS | This feature IS the security control; Argon2id is OWASP-recommended; `Bun.password.verify` is timing-safe |
| IV. Simplicity & YAGNI | ✅ PASS | Two private helpers (`hashPassword`, `verifyPassword`) in the existing `auth.server.ts`; no new modules or abstractions; no migration code |
| V. Conventional Commits | ✅ PASS | `feat(auth):` prefix on all commits for this feature |

**Post-Phase 1 re-check**: No design changes between pre- and post-check; all gates remain green.

## Project Structure

### Documentation (this feature)

```text
specs/005-argon2-password-hashing/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── server-functions.md  # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code

```text
src/
├── lib/
│   └── auth.server.ts        # Modified: hashPassword + verifyPassword helpers;
│                             #   createAccountServerFn hashes before persist;
│                             #   signInServerFn uses Bun.password.verify;
│                             #   new updatePasswordServerFn added
└── routes/
    └── change-password.tsx   # New: protected UI route for password-change form

e2e/
└── auth.spec.ts              # New: Playwright tests for secure auth flows

prisma/
└── schema.prisma             # Unchanged: password String field stores PHC string as-is
```

**Structure Decision**: Single-project web app. All credential operations stay in `src/lib/auth.server.ts` (satisfying the spec assumption that a centralized auth layer exists). The new `change-password.tsx` route follows the existing per-flow page pattern established by `sign-in.tsx` and `create-account.tsx`.
