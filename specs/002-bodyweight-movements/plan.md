# Implementation Plan: Body-Weight Movements

**Branch**: `002-bodyweight-movements` | **Date**: 2026-05-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-bodyweight-movements/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Add a boolean `isBodyWeight` flag to the global `Movement` model so users can designate movements like pull-ups or push-ups as body-weight exercises. When a body-weight movement is added to the current workout, the weight field in the "Add Set" form is automatically pre-filled with the user's most recently logged body weight (from the existing `WeightEntry` model introduced in Feature 001). If no body weight entry exists the field remains empty and a contextual hint is shown. The flag is editable on both creation and post-creation via the existing movements page.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)

**Primary Dependencies**: TanStack Start (SSR), TanStack Router (file-based), TanStack Query v5, TanStack Form, Prisma v7 (PostgreSQL), Tailwind CSS v4, `@better-bookkeeping/ui` (shadcn wrapper), Zod, Playwright (e2e), Vitest (unit/integration)

**Storage**: PostgreSQL via Prisma ORM — one schema migration adds `isBodyWeight Boolean @default(false)` to the `Movement` model

**Testing**: Playwright for e2e (new `e2e/bodyweight-movements.spec.ts`); Vitest for any unit-level logic

**Target Platform**: Browser (SSR via TanStack Start, served by Bun on port 3000 / Docker 3200)

**Project Type**: Full-stack web application (SSR + server functions)

**Performance Goals**: Auto-fill is purely client-side (data already cached by React Query) — zero additional latency on set addition

**Constraints**: Movements are currently a global resource (no `userId`); the `isBodyWeight` flag is stored per-movement globally, shared across all users. No staleness threshold on the body-weight default (most recent `WeightEntry` always used).

**Scale/Scope**: Small single-user fitness tracker; 2 routes modified (`/movements`, `/current-workout`), 1 new server function, 1 DB migration

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Type Safety | All new fields and server function signatures typed; `any` forbidden | ✅ PASS — `isBodyWeight: boolean` added to Prisma model; all server fn inputs/outputs typed via Zod + Prisma inference |
| II. Test Coverage | Playwright e2e for happy path before merge | ✅ PASS — `e2e/bodyweight-movements.spec.ts` planned covering: flag movement as body-weight, auto-fill on add-set, empty fallback |
| III. Security | Input validation at server boundary; auth middleware on weight endpoint | ✅ PASS — `createMovementServerFn`/`updateMovement` validate `isBodyWeight` via Zod; `getLatestWeightServerFn` uses `authMiddleware` |
| IV. Simplicity & YAGNI | No speculative abstractions; implement exactly what spec describes | ✅ PASS — no new abstractions; `isBodyWeight` directly on Movement; auto-fill is inline form logic |
| V. Conventional Commits | All commits follow conventional commits spec | ✅ PASS — enforced by project hooks |

**Post-design re-check**: No violations introduced by Phase 1 design. Complexity Tracking section left empty.

## Project Structure

### Documentation (this feature)

```text
specs/002-bodyweight-movements/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── server-functions.md
│   └── ui-contracts.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                                   ← add isBodyWeight to Movement
└── migrations/
    └── <timestamp>_add_is_body_weight_to_movement/ ← generated migration

src/
├── lib/
│   ├── movements.server.ts    ← update createMovementServerFn + getMovementsServerFn
│   └── weight.server.ts       ← add getLatestWeightServerFn
└── routes/
    └── __index/
        └── _layout.movements/
            ├── index.tsx                           ← add isBodyWeight toggle + badge
            └── -queries/
                └── movements.ts                    ← type update auto-propagates
        └── _layout.current-workout/
            ├── index.tsx                           ← auto-fill logic in Add Set form
            └── -queries/
                └── latest-weight.ts                ← new: latestWeightQueryOptions

e2e/
└── bodyweight-movements.spec.ts                    ← new Playwright e2e tests
```

**Structure Decision**: Single web application project (TanStack Start). Server logic lives in `src/lib/`, pages in `src/routes/`. Follows the existing pattern used by Feature 001 weight tracking. No new top-level directories required.

## Complexity Tracking

> No Constitution Check violations — this section intentionally left blank.
