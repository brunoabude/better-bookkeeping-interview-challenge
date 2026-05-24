# Implementation Plan: Weight Tracking

**Branch**: `001-weight-tracking` | **Date**: 2026-05-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-weight-tracking/spec.md`

**Note**: This file is the output of the `/speckit-plan` command.

## Summary

Add a dedicated weight tracking section accessible from the main navigation where authenticated users can log their daily body weight, view their history in a sortable list, and see a time-series line chart of their weight over time. The technical approach uses TanStack Start server functions backed by a new Prisma `WeightEntry` model (PostgreSQL), with Recharts for the line chart.

## Technical Context

**Language/Version**: TypeScript 5.9+ (strict mode), Bun runtime

**Primary Dependencies**: TanStack Start (SSR), TanStack Router (file-based), TanStack Query v5, Prisma v7 (PostgreSQL), Recharts (new — chart rendering), Zod v4 (validation), @better-bookkeeping/ui (shadcn wrapper)

**Storage**: PostgreSQL via Prisma; new `WeightEntry` table with composite unique index on `(userId, date)`

**Testing**: Playwright (e2e happy-path coverage required by constitution); Vitest available for unit tests

**Target Platform**: Web SSR (TanStack Start on Bun/Nitro)

**Project Type**: Web application — single full-stack project (TanStack Start)

**Performance Goals**: Chart renders within 2 seconds for up to 365 entries (SC-002)

**Constraints**: Authenticated users only (auth middleware redirects to /sign-in); one weight entry per user per calendar day enforced at DB level via unique index + upsert at application level

**Scale/Scope**: Up to ~365 entries/year per user; no pagination required at this scale

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Type Safety | PASS | All new code in TypeScript strict mode; Prisma generates types; route types from TanStack Router auto-generated tree |
| II. Test Coverage | PASS | Playwright e2e test required covering: log weight, view chart, delete entry (happy paths) |
| III. Security by Default | PASS | `authMiddleware` on all server functions; Zod input validation at boundary; all DB queries scoped to `context.user.id` |
| IV. Simplicity & YAGNI | PASS | Three server functions (list, upsert, delete); one new route; no speculative abstractions |
| V. Conventional Commits | PASS | All commits will use `feat(weight)` scope |

**Chart library addition**: Recharts is a new dependency. The constitution explicitly permits third-party chart libraries for visualisation features; the choice is documented in `research.md`.

Post-Phase-1 gate re-check: **PASS** — design stays within spec, no new violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/001-weight-tracking/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── lib/
│   └── weight.server.ts                    # Server functions: getWeightEntries, upsertWeightEntry, deleteWeightEntry
└── routes/
    └── __index/
        └── _layout.weight/
            ├── -queries/
            │   └── weight.ts               # TanStack Query options
            └── index.tsx                   # Weight tracking page component

prisma/
└── schema.prisma                           # +WeightEntry model

e2e/
└── weight.spec.ts                          # Playwright e2e test (happy path)
```

**Structure Decision**: Single project (web application variant). Follows the exact pattern established by `_layout.workout-history` — server functions in `src/lib/`, query options in the route's `-queries/` folder, page component as `index.tsx`. No new shared components needed; UI lives entirely in the route.

## Complexity Tracking

> No constitution violations — section not applicable.
