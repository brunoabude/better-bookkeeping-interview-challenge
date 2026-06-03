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

## Key behaviours to verify

1. **Default date range**: Opening either page with no URL params shows the last 30 days and page 1.
2. **Auto-apply debounce**: Change either date input — after ~500 ms the list updates without clicking Apply.
3. **URL state**: After changing dates or page, the URL reflects `?page=N&from=YYYY-MM-DD&to=YYYY-MM-DD`. Copy and reload — the same filtered view is restored.
4. **Invalid range — icon**: Set start date after end date, or a range > 30 days. A warning icon (⚠) appears next to the date picker; the list does not reload.
5. **Pagination component**: With enough data, numbered page buttons appear below the list. Clicking a page number scrolls to the top of the list.
6. **Reset**: The Reset button returns the filter to the default 30-day range and clears the URL params.

## Running e2e tests

```bash
bun run test          # vitest unit suite
bunx playwright test  # full Playwright e2e suite (requires dev server running)
```

Relevant test files:
- `e2e/workouts.spec.ts` — includes `workout history pagination` describe block
- `e2e/weight.spec.ts` — includes `weight history pagination` describe block

## Seeding test data

To test pagination (> 20 items), seed the database:
```bash
# If a seed script exists:
bun run scripts/seed.ts
```
