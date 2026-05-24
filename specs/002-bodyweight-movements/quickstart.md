# Quickstart: Body-Weight Movements

**Feature**: `002-bodyweight-movements` | **Phase**: 1 | **Date**: 2026-05-24

## Prerequisites

- Docker running (PostgreSQL + app via `bun run dev:docker`)
- Or local Bun + a running PostgreSQL instance configured in `.env`
- Feature 001 (weight tracking) deployed — required for auto-fill to function. Without it the fallback (empty field + hint) applies.

## Development Setup

### 1. Switch to the feature branch

```bash
git checkout 002-bodyweight-movements
```

### 2. Install dependencies (if needed)

```bash
bun install
```

No new packages are introduced by this feature.

### 3. Run the database migration

```bash
bunx prisma migrate dev --name add_is_body_weight_to_movement
```

This generates and applies the migration that adds `isBodyWeight Boolean @default(false)` to the `Movement` table. All existing movements receive `false` automatically.

### 4. Regenerate the Prisma client

The migration step above regenerates the client automatically. If needed manually:

```bash
bunx prisma generate
```

### 5. Start the development server

```bash
# Docker (recommended — includes PostgreSQL)
bun run dev:docker

# Or local (requires local PostgreSQL)
bun run dev
```

App is available at:
- Local: http://localhost:3000
- Docker: http://localhost:3200

## Verifying the Feature

### Manual smoke test

1. **Create a body-weight movement**
   - Navigate to `/movements`
   - Enter "Pull-ups" in the name field
   - Enable the "Body-weight movement" toggle
   - Click "Add Movement"
   - Confirm "Pull-ups" appears in the list with a "Body Weight" badge

2. **Auto-fill on workout**
   - Navigate to `/weight` and log a body weight (e.g., 68)
   - Navigate to `/current-workout` (create a workout if none active)
   - In the Add Set form, select "Pull-ups" from the movement dropdown
   - Confirm the weight field is pre-filled with 68

3. **Fallback when no weight logged**
   - Create a new user account (or delete all weight entries)
   - Navigate to `/current-workout`, select "Pull-ups"
   - Confirm the weight field is empty and a hint is shown

4. **Edit existing movement flag**
   - Navigate to `/movements`
   - Click "Edit" on an existing non-body-weight movement
   - Enable the toggle, click "Save"
   - Confirm the badge appears in the list

### Run e2e tests

```bash
bunx playwright test e2e/bodyweight-movements.spec.ts
```

### Run all tests

```bash
bun run test           # Vitest unit tests
bunx playwright test   # All Playwright e2e tests
```

## Key Files

| File | Role |
|------|------|
| `prisma/schema.prisma` | Data model — `isBodyWeight` field on `Movement` |
| `src/lib/movements.server.ts` | Server functions: create + get + update movement |
| `src/lib/weight.server.ts` | Server functions: add `getLatestWeightServerFn` |
| `src/routes/__index/_layout.movements/index.tsx` | Toggle in create form; badge in list; inline edit |
| `src/routes/__index/_layout.current-workout/index.tsx` | Auto-fill logic in Add Set form |
| `src/routes/__index/_layout.current-workout/-queries/latest-weight.ts` | React Query options for latest weight |
| `e2e/bodyweight-movements.spec.ts` | Playwright e2e tests |

## Troubleshooting

**Prisma client out of sync after schema change**

If TypeScript shows errors on `movement.isBodyWeight`, regenerate:

```bash
bunx prisma generate
```

**Migration already applied but column missing**

Check migration status:

```bash
bunx prisma migrate status
```

**Auto-fill not triggering**

- Open browser devtools → React Query DevTools (bottom-left panel)
- Confirm `["latest-weight"]` query has resolved with a non-null value
- Confirm the selected movement has `isBodyWeight: true` in the `["movements"]` cache
