# Quickstart: Pagination & Date Filter Feature

## Start the dev environment

```bash
bun run dev:docker    # starts app + PostgreSQL on http://localhost:3200
```

Or without Docker (requires local PostgreSQL):
```bash
bun run dev           # http://localhost:3000
```

## Pages to exercise

| Page | URL |
|------|-----|
| Workout History | `/workout-history` |
| Weight Tracking | `/weight` |
| Movements | `/movements` |

## Key behaviours to verify

1. **Default date range**: Both Workout History and Weight Tracking open with the last 90 days (89-day offset). Both default to page 1.
2. **Auto-apply debounce**: Change either date input — after ~500 ms the list updates without clicking Apply.
3. **URL state**: After changing dates or page, the URL reflects `?page=N&from=YYYY-MM-DD&to=YYYY-MM-DD`. Copy and reload — the same filtered view is restored.
4. **Invalid range — icon**: Set start date after end date, or a range exceeding 90 days. A warning icon (⚠) appears next to the date picker; the list does not reload.
5. **Pagination component**: With enough data, numbered page buttons appear below the list. Clicking a page number scrolls to the top of the list. On Movements, paginate alphabetically with `?page=N`.
6. **Reset**: The Reset button returns the filter to the 90-day default on both Workout History and Weight Tracking pages.

## Running e2e tests

```bash
bun run test          # vitest unit suite
bunx playwright test  # full Playwright e2e suite (requires dev server running)
```

Playwright runs against a dedicated test database (separate from the dev DB). The global setup in `e2e/global-setup.ts` creates the test DB, applies migrations, and truncates all tables before the suite runs.

Relevant test files:
- `e2e/workouts.spec.ts` — includes `workout history pagination` describe block
- `e2e/weight.spec.ts` — includes `weight history pagination` describe block
- `e2e/movements.spec.ts` — includes movements list and pagination tests

## Seeding test data

To test pagination (> 5 items per page), seed the database with at least 6 records in the relevant entity. If a seed script exists:
```bash
bun run scripts/seed.ts
```
