# Feature Specification: Weight Tracking

**Feature Branch**: `001-weight-tracking`

**Created**: 2026-05-24

**Status**: Draft

**Input**: User description: "Add weight tracking section where a user can input their weight. This should be something they can track over time. Add a chart showing the history of that."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Log Body Weight (Priority: P1)

A user wants to record their body weight for the current day. They navigate to the
weight tracking section, enter their current weight, and save it. The entry is
timestamped automatically with today's date.

**Why this priority**: This is the foundational data entry path. Without it, the
history chart has nothing to display and feature 2 (body-weight movements) cannot
derive a default weight.

**Independent Test**: Can be fully tested by submitting a weight value and confirming
it appears as the most recent entry — delivers the core data capture value on its own.

**Acceptance Scenarios**:

1. **Given** the user is logged in, **When** they navigate to the weight tracking
   section and submit a numeric weight value, **Then** the entry is saved with today's
   date and the saved value is immediately visible.
2. **Given** the user has already logged a weight entry for today, **When** they
   submit a new value, **Then** the entry for the current day is updated (multiple entries per day are not
   allowed).
3. **Given** the user submits a non-numeric or empty value, **When** the form is
   submitted, **Then** a validation error is shown and nothing is saved.

---

### User Story 2 - View Weight History Chart (Priority: P2)

A user wants to see how their body weight has changed over time. They visit the weight
tracking section and see a chart that plots their logged weight values against the
dates they were recorded.

**Why this priority**: The chart is the analytical payoff of data entry. It transforms
raw numbers into a meaningful progression view, which is the stated goal of the
feature. It depends on at least one weight entry existing (User Story 1).

**Independent Test**: Can be tested independently by seeding at least two weight
entries with different dates and confirming both appear as data points on a rendered
chart.

**Acceptance Scenarios**:

1. **Given** the user has logged at least two weight entries on different dates,
   **When** they view the weight tracking section, **Then** a chart is displayed with
   dates on the horizontal axis and weight values on the vertical axis.
2. **Given** the user has logged no weight entries, **When** they view the weight
   tracking section, **Then** an empty state is shown with a prompt to log their first
   weight.
3. **Given** many weight entries exist (30+), **When** the user views the chart,
   **Then** all data points are represented and the chart remains readable.

---

### User Story 3 - Delete a Weight Entry (Priority: P3)

A user logged an incorrect weight and wants to remove it. They find the entry in the
list and delete it; the chart updates to exclude the removed value.

**Why this priority**: Data correction is a secondary quality-of-life need. The core
feature works without it, but incorrect entries will pollute the history chart.

**Independent Test**: Can be tested independently by adding then deleting a weight
entry and confirming it no longer appears in the list or chart.

**Acceptance Scenarios**:

1. **Given** the user has at least one weight entry, **When** they delete it, **Then**
   the entry is removed from the list and the chart no longer includes that data point.
2. **Given** the user attempts to delete the only remaining entry, **When** confirmed,
   **Then** the entry is removed and the empty state is shown.

---

### Edge Cases

- What happens when the user enters a weight of 0 or a negative number? → Validation
  MUST reject values ≤ 0.
- What happens when the user enters an implausibly large value (e.g., 10,000 kg)?
  → Reasonable upper-bound validation SHOULD be applied (assumption: > 700 lbs /
  > 320 kg is rejected as implausible).
- What if the user has no weight entries yet? → Show a meaningful empty state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a dedicated weight tracking section accessible
  from the main navigation.
- **FR-002**: The system MUST allow an authenticated user to submit a numeric body
  weight value (always in lbs, which is considered the canonical weight unit for the app).
- **FR-003**: The system MUST automatically record the current date/time when a weight
  entry is saved.
- **FR-004**: The system MUST persist all weight entries associated with the logged-in
  user.
- **FR-005**: The system MUST display all of the user's weight entries in a list,
  ordered by date (most recent first).
- **FR-006**: The system MUST display a line chart of the user's weight history with
  date on the horizontal axis and weight on the vertical axis.
- **FR-007**: The chart MUST show one data point per calendar day.
- **FR-008**: The system MUST show an empty state with a prompt when no weight entries
  exist.
- **FR-009**: The system MUST validate that the submitted weight is a positive number
  within a plausible range (> 0, ≤ 700 lbs).
- **FR-010**: The system MUST allow a user to delete any of their own weight entries,
  with the chart and list updating immediately after deletion.
- **FR-011**: A user MUST only be able to view and modify their own weight entries
  (no cross-user data access).

### Key Entities

- **WeightEntry**: A single recorded body weight value. Attributes: user reference,
  numeric weight value, recorded timestamp (date + time).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can log a body weight entry in under 30 seconds from the time
  they open the weight tracking section.
- **SC-002**: The weight history chart renders within 2 seconds for a history of up to
  365 entries.
- **SC-003**: A user with at least 2 entries can immediately see their weight trend
  without any additional interaction.
- **SC-004**: Invalid weight submissions (non-numeric, out-of-range) are rejected 100%
  of the time with a user-visible error message.
- **SC-005**: After deleting an entry, the chart and list reflect the removal without
  requiring a page reload.

## Assumptions

- Weight is stored always in lbs; unit selection is outside the scope
  of this feature — the app's existing convention will be followed.
- Multiple entries per day are not allowed in storage.
- The weight tracking section is accessible only to authenticated users; unauthenticated
  access is out of scope.
- The feature is for body weight tracking only — it does not affect or interact with
  per-set workout weights.
- Mobile responsiveness follows the app's existing responsive design conventions.
- The most recent weight entry is the value used by the body-weight movements feature
  (Feature 2) as a default weight; this contract is implicit and not displayed to the
  user here.
