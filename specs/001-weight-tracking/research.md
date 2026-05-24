# Research: Weight Tracking

**Feature**: 001-weight-tracking | **Date**: 2026-05-24

## Chart Library Selection

**Decision**: Recharts

**Rationale**: React-first (renders as React components over SVG, not imperative canvas), first-class TypeScript support, powers shadcn's built-in chart components making it the most compatible choice with `@better-bookkeeping/ui`'s design language. The `<LineChart>` + `<Line>` + `<XAxis>` + `<YAxis>` API is minimal for FR-006 and FR-007 with no boilerplate beyond what the spec requires. React 19 compatible; actively maintained (>23k GitHub stars, releases through 2025).

**Install**: `bun add recharts`

**Alternatives considered**:
- **Nivo**: Also React-first and typed, but heavier bundle and requires more configuration for a simple line chart
- **Chart.js + react-chartjs-2**: Imperative canvas API; adds wrapper overhead; less idiomatic in React 19
- **Victory**: React-first but maintenance activity has slowed in 2025

---

## Weight Unit Convention

**Decision**: Store and display weight in `lbs` as the canonical unit.

**Rationale**: The existing codebase stores workout set weights as `Int` and the workout history UI renders "X lbs" explicitly. The weight tracking feature follows this convention. Unit conversion is explicitly out of scope per the spec Assumptions section.

**Alternatives considered**:
- Storing in kg and converting for display: over-engineered; unit selection is out of scope
- Storing both value and unit per-entry: adds schema complexity without a spec requirement

---

## Day-Level Uniqueness Enforcement

**Decision**: Store `date` as `DateTime` (UTC midnight) with `@@unique([userId, date])` in Prisma. Use `upsert` in the server function so submitting a weight for today overwrites the existing entry rather than creating a duplicate.

**Rationale**: PostgreSQL enforces uniqueness at the DB level (race-condition safe). The `upsert` pattern gives a clean "log today's weight" UX — submitting again updates rather than errors. The date is computed server-side by truncating `new Date()` to UTC midnight, preventing client clock manipulation.

**Alternatives considered**:
- Application-level uniqueness check before insert: not race-condition safe; requires an extra round-trip query
- Storing full timestamp and enforcing uniqueness in queries only: allows duplicate rows; fails FR-007 (one data point per calendar day) if the user submits twice

---

## Auth Pattern for Server Functions

**Decision**: Use `authMiddleware` from `@/lib/auth.server` on all weight server functions. Access `context.user.id` to scope every query to the authenticated user.

**Rationale**: Identical pattern to `workouts.server.ts`. No new mechanism needed. Prevents cross-user data access (FR-011). All weight queries include `where: { userId: context.user.id }`.

---

## Route Structure

**Decision**: `src/routes/__index/_layout.weight/index.tsx`

**Rationale**: Follows the exact file-based routing convention of existing routes (`_layout.movements`, `_layout.workout-history`). TanStack Router auto-generates the route at `/weight`. The nav item is added to the `navItems` array in `_layout.tsx`. No manual route tree edits required.
