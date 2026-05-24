# Quickstart: Weight Tracking (001)

**Feature**: 001-weight-tracking | **Date**: 2026-05-24

## Prerequisites

- Docker Desktop running (PostgreSQL is containerised)
- Bun installed
- `.env` file with `DATABASE_URL` pointing to the Docker PostgreSQL instance

## Start the Environment

```bash
bun run dev          # App on http://localhost:3000
# OR
bun run dev:docker   # Full Docker stack on http://localhost:3200
```

## Apply the Migration

After adding the `WeightEntry` model to `prisma/schema.prisma`:

```bash
bunx prisma migrate dev --name add-weight-entry
```

This creates the table, adds the composite unique index on `(userId, date)`, and regenerates the Prisma client.

## Verify the Feature

1. Sign in at `/sign-in`
2. Confirm **Weight** appears in the left sidebar nav
3. Submit a weight value (e.g. `180`) — entry appears in the list below the form
4. Submit again — the today entry is **updated**, not duplicated
5. Confirm the chart shows exactly one data point
6. To test the chart with multiple points, insert a backdated entry via Prisma Studio:
   ```bash
   bunx prisma studio
   ```
   Create a `WeightEntry` with a past `date` (UTC midnight) for the same user
7. Refresh — chart now shows two data points in chronological order
8. Delete an entry — list and chart update without a page reload

## Run Tests

```bash
bun run test                              # Vitest unit tests
bunx playwright test e2e/weight.spec.ts   # Playwright e2e (happy path)
```

## Key Files

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | `WeightEntry` model definition |
| `src/lib/weight.server.ts` | Server functions (list, upsert, delete) |
| `src/routes/__index/_layout.weight/index.tsx` | Page component |
| `src/routes/__index/_layout.weight/-queries/weight.ts` | TanStack Query options |
| `src/routes/__index/_layout.tsx` | Add "Weight" nav item |
| `e2e/weight.spec.ts` | Playwright e2e test |
