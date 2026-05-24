# Feature Specification: Movement Progression Charts

**Feature Branch**: `003-progression-charts`

**Created**: 2026-05-24

**Status**: Draft

**Input**: User description: "The Workout history should give the user a sense of
progression. Show certain summary metrics for each movement and their progression over
time. The user can select a movement and a corresponding metric and see that metric
plotted against time. Metrics: maximum weight (the maximum weight for that movement on
a given day), total reps, total volume (volume of a set is weight × reps, total volume
for a movement is total volume of all sets in a workout)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Progression Chart for a Movement (Priority: P1)

A user wants to understand whether they are getting stronger or doing more volume on a
specific exercise over time. They navigate to the workout history section, select a
movement (e.g., "Bench Press"), and choose a metric (e.g., "Maximum Weight"). A chart
appears showing that metric plotted on the vertical axis against date on the horizontal
axis, covering all workouts in which that movement appears.

**Why this priority**: This is the entire deliverable. All other stories are
refinements within this core flow. A user who can select a movement and a metric and
see a chart receives the full value of the feature.

**Independent Test**: Can be tested independently by seeding at least two workouts on
different dates that each include the same movement, then selecting that movement and
a metric — the chart MUST render with at least two data points.

**Acceptance Scenarios**:

1. **Given** the user has at least two workouts on different dates that include the
   same movement, **When** they select that movement and the "Maximum Weight" metric,
   **Then** a chart is rendered with one data point per workout date showing the
   maximum weight lifted for that movement on each date.
2. **Given** the user selects the "Total Reps" metric, **Then** the chart shows the
   sum of all reps for that movement per workout date.
3. **Given** the user selects the "Total Volume" metric, **Then** the chart shows the
   sum of (weight × reps) across all sets for that movement per workout date.
4. **Given** the user has only one workout containing the selected movement, **When**
   they view the chart, **Then** a single data point is shown and the chart is still
   rendered (not an error).

---

### User Story 2 - Switch Between Metrics Without Losing Movement Selection (Priority: P2)

A user has selected a movement and is viewing its "Total Volume" chart. They want to
switch to "Maximum Weight" to compare progression differently. They change the metric
selector and the chart updates immediately — the selected movement stays the same.

**Why this priority**: Users want to explore multiple dimensions of their progress for
the same movement without re-selecting it. This is a UX refinement on top of P1 that
significantly reduces friction.

**Independent Test**: Can be tested independently by selecting a movement and metric,
then switching the metric — the chart MUST update while the movement selection remains
unchanged.

**Acceptance Scenarios**:

1. **Given** a movement is selected and a chart is displayed, **When** the user changes
   the metric, **Then** the chart updates to reflect the new metric without the
   movement selection resetting.
2. **Given** a movement is selected and a chart is displayed, **When** the user changes
   the movement, **Then** the chart updates to reflect data for the new movement while
   the metric selection is preserved.

---

### User Story 3 - Empty State When No Data Exists for Selection (Priority: P3)

A user selects a movement or arrives at the progression chart page before any workouts
have been logged. The page shows a meaningful empty state explaining there is no
progression data yet, rather than a broken or empty chart.

**Why this priority**: Graceful empty states are a quality-of-life requirement. The
core chart feature works without this, but users with no history would see a confusing
blank chart.

**Independent Test**: Can be tested independently with a fresh user account (no
workouts) — the progression chart section MUST render an empty state prompt rather
than a blank or errored chart.

**Acceptance Scenarios**:

1. **Given** the user has no workouts logged, **When** they access the progression
   chart section, **Then** an empty state is shown explaining that progression data
   will appear once workouts are logged.
2. **Given** the user selects a movement that appears in no recorded workouts, **When**
   the chart would render, **Then** an empty state is shown specific to that movement.

---

### Edge Cases

- What if a movement has sets with no weight recorded (e.g., a body-weight movement
  where weight was left blank)? → Sets with no weight value are excluded from
  "Maximum Weight" and "Total Volume" calculations for that date. "Total Reps" still
  counts those sets.
- What if multiple sets for the same movement occur on the same date? → All sets on
  that date are aggregated: max weight is the highest single-set weight; total reps is
  the sum; total volume is the sum of weight × reps for each set.
- What if the user has only one data point? → Chart renders with a single point;
  trend lines are not shown (not enough data).
- What if a movement name has changed since historical workouts were logged? → Data
  is associated with movement ID, not name; historical data is not lost if a movement
  is renamed.
- What if a workout spans midnight? → Date attribution follows the workout's recorded
  date, not individual set timestamps.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide access to progression charts from the workout
  history section.
- **FR-002**: The user MUST be able to select any movement they have previously logged
  in a workout from a list or dropdown.
- **FR-003**: The user MUST be able to select one of three metrics: Maximum Weight,
  Total Reps, or Total Volume.
- **FR-004**: The system MUST display a chart with the selected metric on the vertical
  axis and workout date on the horizontal axis.
- **FR-005**: Each date on the chart MUST represent one data point aggregated across
  all sets of the selected movement performed on that date:
  - **Maximum Weight**: the highest weight value across all sets on that date.
  - **Total Reps**: the sum of all reps across all sets on that date.
  - **Total Volume**: the sum of (weight × reps) for each set on that date.
- **FR-006**: Changing the metric selection MUST update the chart without resetting the
  movement selection.
- **FR-007**: Changing the movement selection MUST update the chart without resetting
  the metric selection.
- **FR-008**: Sets with no recorded weight value MUST be excluded from Maximum Weight
  and Total Volume calculations; they MUST still contribute reps to Total Reps.
- **FR-009**: When no data exists for the current selection, the system MUST display a
  meaningful empty state rather than a blank or errored chart.
- **FR-010**: A user MUST only be able to view their own workout progression data
  (no cross-user data access).

### Key Entities

- **Movement**: An exercise type (existing entity). Progression charts are grouped by
  movement.
- **WorkoutSet** *(read-only for this feature)*: A logged set within a workout,
  containing movement reference, weight, and reps. Provides the raw data for metric
  aggregation. This feature does not create or modify sets.
- **Workout** *(read-only for this feature)*: Associates sets with a specific date.
  The workout date is used as the horizontal axis.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can arrive at a rendered progression chart for any movement in
  under 10 seconds from the workout history section.
- **SC-002**: Switching between metrics updates the chart in under 1 second.
- **SC-003**: The chart correctly aggregates data for a movement with 50+ sets across
  20+ dates — all data points are represented with no missing or duplicated entries.
- **SC-004**: All three metrics (Maximum Weight, Total Reps, Total Volume) are
  available and produce correct results for 100% of movements that have at least one
  logged set.
- **SC-005**: The empty state is shown in 100% of cases where the selected movement has
  no logged sets, rather than a blank or broken chart.

## Assumptions

- The progression chart is read-only; this feature does not allow editing workouts
  or sets.
- Movement selection is limited to movements the current user has personally logged in
  at least one workout; movements with no history may be omitted from the selector.
- The chart type is a line chart (points connected by lines) — appropriate for
  time-series progression data. The exact visual style follows the app's existing chart
  conventions.
- Dates on the horizontal axis are calendar dates derived from the workout record, not
  individual set timestamps.
- If a workout has no date recorded, it is excluded from the chart (assumption:
  workouts always have a date in the existing data model).
- Total Volume for a set where weight is null/blank is treated as 0 for that set
  (i.e., the set is excluded from the volume sum).
- This feature is independent of Feature 1 (weight tracking) and Feature 2
  (body-weight movements) — it can be shipped in any order relative to those features.
- Unauthenticated access is out of scope; all flows assume the user is logged in.
- Mobile responsiveness follows the app's existing responsive design conventions.
