# Research: Movement Progression Charts

## Chart Library Selection

**Decision**: Recharts

**Rationale**: SVG-based rendering is SSR-safe (no `window` dependency at import time).
The compositional API (`<LineChart>`, `<Line>`, `<XAxis>`, `<YAxis>`, `<Tooltip>`,
`<ResponsiveContainer>`) maps directly to the feature's line chart requirement with
minimal boilerplate. TypeScript support is first-class. `<ResponsiveContainer>` covers
mobile responsiveness without extra code. Actively maintained, React 19 compatible.

**Alternatives considered**:
- Chart.js + react-chartjs-2: Canvas-based (not SSR-native), imperative API — rejected
- Visx (Airbnb): Low-level building blocks, significant boilerplate for a simple line
  chart — rejected (violates Principle IV / YAGNI)
- Tremor: High-level components, large bundle overhead for a single chart type — rejected

**Installation**: `bun add recharts`

---

## Data Aggregation Strategy

**Decision**: Compute all three metrics server-side in a new dedicated server function
`getMovementProgressionServerFn({ movementId })`.

**Rationale**: The existing `getWorkoutHistoryServerFn` returns all workout data for the
history table. Reusing it for chart data would require client-side re-aggregation and
ship unnecessary set-level detail to the browser. A dedicated function returns only the
pre-aggregated `{ date, maxWeight, totalReps, totalVolume }` tuples needed for the chart.
All three metrics are returned together so switching metrics costs zero additional
round-trips (satisfies SC-002: < 1 s metric switch).

**Alternatives considered**:
- Reuse `getWorkoutHistoryServerFn` with client-side aggregation: sends all set details
  to the browser; scales poorly with history size — rejected
- Separate server calls per metric: three round-trips per movement selection — rejected

---

## Routing Strategy

**Decision**: Add a "Progression" Card section to the existing
`src/routes/__index/_layout.workout-history/index.tsx` route. No new route created.

**Rationale**: FR-001 requires access "from the workout history section." Embedding the
chart section in the same page satisfies this with minimal structural change. No new
navigation link, tab, or breadcrumb UI is required by the spec.

**Alternatives considered**:
- Sub-route `/workout-history/progression`: requires new nav link and layout changes —
  over-engineered for the spec — rejected

---

## Client State Management

**Decision**: React `useState` for `selectedMovementId` and `selectedMetric`.

**Rationale**: Both values are local to the Progression section component. No
cross-component or cross-route sharing is needed. `useState` is the minimal primitive;
TanStack Store is appropriate for complex derived state or multi-component sharing —
neither applies here (Principle IV / YAGNI).

---

## Movement List Source

**Decision**: Derive the movement list for the selector from the existing
`workoutHistoryQueryOptions` cache (already loaded on the workout-history route).

**Rationale**: The workout-history route preloads all completed workouts with sets and
movements. Extracting unique movements from that cached result costs zero additional
queries. A dedicated "movements I've logged" server function would duplicate work
already done in the route loader.
