<!--
SYNC IMPACT REPORT
==================
Version change: [TEMPLATE] → 1.0.0 (initial ratification from blank template)
Modified principles: N/A (first fill — all 5 principles newly defined)
Added sections:
  - Core Principles (5 principles)
  - Technology Stack Constraints
  - Development Workflow
  - Governance
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ (Constitution Check gates are generic; align on next /speckit-plan run)
  - .specify/templates/spec-template.md ✅ (no structural changes required)
  - .specify/templates/tasks-template.md ✅ (no structural changes required)
Follow-up TODOs: None — all placeholders resolved.
-->

# Better Bookkeeping Constitution

## Core Principles

### I. Type Safety (NON-NEGOTIABLE)

All code MUST be written in TypeScript with strict mode enabled. The `any` type is
forbidden unless accompanied by an inline comment explaining why the type cannot be
expressed statically. Generic escape hatches (`as unknown as T`, non-null assertions)
MUST be justified at the call site. Route types MUST be derived from TanStack Router's
auto-generated tree — manual duplication of route shapes is prohibited.

**Rationale**: Strict typing prevents entire classes of runtime bugs and is a
precondition for confident SSR hydration with TanStack Start.

### II. Test Coverage of User-Facing Flows (NON-NEGOTIABLE)

Every user-facing feature MUST have at least one Playwright e2e test covering the happy
path before the feature is considered complete. The test files in `e2e/` are canonical:
`movements.spec.ts`, `sets.spec.ts`, and `workouts.spec.ts` cover CRUD operations for
core entities. New features MUST add corresponding tests; test files MUST NOT be
skipped or left empty at merge time.

**Rationale**: The project has explicitly identified missing e2e coverage as a
blocking deficiency. All new work inherits this obligation.

### III. Security by Default

Authentication credentials MUST be stored using a strong hashing algorithm (bcrypt or
argon2). Plaintext password storage is prohibited. Input at system boundaries (API
endpoints, form handlers) MUST be validated before use. Sensitive values (tokens,
keys) MUST be read from environment variables — never hardcoded. Server functions MUST
NOT expose internal error messages or stack traces to the client.

**Rationale**: A security fix for plaintext password storage is a stated project
requirement and the baseline for any production-bound application.

### IV. Simplicity & YAGNI

Implement exactly what the feature specification describes — no more, no less.
Abstractions are only permitted when they eliminate genuine, current repetition (three
or more identical call sites). Helper functions, HOCs, and utility modules MUST NOT be
created speculatively. Comments MUST only explain non-obvious *why*, never *what*.

**Rationale**: The codebase is subject to a live code review; over-engineering is a
disqualifying signal as much as under-engineering.

### V. Conventional Commits & Structured History

All commits MUST follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
specification. Commit type MUST accurately reflect the change:
`feat` for new functionality, `fix` for bug corrections, `test` for test-only changes,
`refactor` for behaviour-neutral restructuring, `chore` for tooling/config, `docs` for
documentation. Scope (in parentheses) SHOULD identify the affected area
(e.g., `feat(movements)`, `fix(auth)`). Breaking changes MUST use a `!` suffix.

**Rationale**: Conventional Commits is an explicit project requirement and enables
automated changelog generation.

## Technology Stack Constraints

The following stack is locked for this project. Introducing unlisted dependencies
requires explicit justification in the PR description:

- **Runtime**: Bun
- **Framework**: TanStack Start (React SSR)
- **Router**: TanStack Router (file-based; route tree MUST NOT be hand-edited)
- **Server State**: TanStack Query
- **Forms**: TanStack Form
- **Database ORM**: Prisma (PostgreSQL)
- **Styling**: Tailwind CSS v4 + `@better-bookkeeping/ui` (shadcn wrapper)
- **Testing**: Playwright for e2e; Vitest for unit/integration
- **Client State**: TanStack Store for complex client state

Third-party chart libraries are permitted for visualisation features; the choice MUST
be documented in the feature's `plan.md`.

## Development Workflow

1. **Branch naming**: Feature branches MUST follow sequential naming as configured in
   Spec Kit (`branch_numbering: sequential`).
2. **Spec before code**: Non-trivial features MUST have a `spec.md` before
   implementation begins.
3. **Conventional commits**: See Principle V — applied to every commit, not just merges.
4. **Code review**: All work is subject to a live code review; the implementer MUST be
   able to explain every decision made.
5. **Docker for local dev**: The full development environment (including PostgreSQL)
   MUST be started via `bun run dev` (Docker Compose). The app MUST NOT be run against
   a manually configured local database unless explicitly documented.
6. **No `--no-verify`**: Git hooks MUST NOT be bypassed.

## Governance

This constitution supersedes all other written or verbal practices for this project.
Amendments MUST:

1. Increment the version according to semver rules (see below).
2. Update the Sync Impact Report comment at the top of this file.
3. Propagate any changed gates to `plan-template.md`, `spec-template.md`, and
   `tasks-template.md`.

**Versioning policy**:
- MAJOR: Removal or redefinition of a non-negotiable principle.
- MINOR: New principle or section added.
- PATCH: Clarifications, wording fixes, non-semantic refinements.

All pull requests MUST be verified against the five Core Principles before approval.
Runtime development guidance lives in `CLAUDE.md`.

**Version**: 1.0.0 | **Ratified**: 2026-05-24 | **Last Amended**: 2026-05-24
