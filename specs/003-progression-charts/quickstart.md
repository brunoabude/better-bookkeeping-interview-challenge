# Quickstart: Movement Progression Charts

## Prerequisites

- Docker dev environment running (`bun run dev:docker`)
- PostgreSQL accessible (included in Docker Compose)
- At least two completed workouts in the database, each with at least one set for the
  same movement, on different dates

## Running the Feature

```bash
bun run dev:docker
# Navigate to: http://localhost:3200/workout-history
# Scroll to the "Progression" section below the completed workouts table
```

## Seeding Data for Manual Testing

Use the app UI:
1. Navigate to **Current Workout** → start a workout
2. Add sets for "Bench Press" (or any movement) → **Complete** the workout
3. Repeat on a different day for the same movement
4. Navigate to **Workout History** → scroll to the **Progression** section
5. Select the movement → select a metric → chart renders

## Running Tests

```bash
# e2e only (Playwright)
bunx playwright test e2e/progression-charts.spec.ts

# All tests
bun run test
```

## Key Files

| Purpose | Path |
|---------|------|
| Server function | `src/lib/workouts.server.ts` — `getMovementProgressionServerFn` |
| Query options | `src/routes/__index/_layout.workout-history/-queries/movement-progression.ts` |
| Chart component | `src/components/progression-chart.tsx` |
| Page integration | `src/routes/__index/_layout.workout-history/index.tsx` |
| e2e tests | `e2e/progression-charts.spec.ts` |

## Installing the Chart Library

```bash
bun add recharts
```
