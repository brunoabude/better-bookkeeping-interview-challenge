# Feature Specification: Body-Weight Movements

**Feature Branch**: `002-bodyweight-movements`

**Created**: 2026-05-24

**Status**: Draft

**Input**: User description: "The current setup doesn't support body-weight movements
very well (e.g. pullups / pushups). Update the movements page so a user can flag a
movement as 'body-weight' when they create it. When a 'body-weight' movement is added
to the current workout the weight field should default to the most recent
user-inputted weight."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Flag a Movement as Body-Weight on Creation (Priority: P1)

A user creates a new movement (e.g., "Pull-ups") and marks it as a body-weight
movement. This flag is saved alongside the movement name and is preserved for future
workouts.

**Why this priority**: This is the entry point for the entire feature. Without being
able to designate a movement as body-weight, the auto-fill behavior in User Story 2
cannot be triggered.

**Independent Test**: Can be tested independently by creating a movement with the
body-weight flag enabled, then loading the movements list and confirming the flag is
visible and persisted.

**Acceptance Scenarios**:

1. **Given** the user is on the create movement page, **When** they fill in a movement
   name and enable the body-weight toggle, **Then** the movement is saved with the
   body-weight flag and appears in the movements list with a visual indicator.
2. **Given** the user creates a movement without enabling the body-weight toggle,
   **When** the movement is saved, **Then** it is treated as a standard movement with
   no body-weight behavior.
3. **Given** the user enables the body-weight toggle, **When** they change their mind
   and disable it before saving, **Then** the movement is saved as a standard movement.

---

### User Story 2 - Auto-Fill Weight When Adding Body-Weight Movement to Workout
(Priority: P1)

A user adds a body-weight movement to their current workout. The weight field for that
set is automatically pre-filled with the user's most recently logged body weight,
saving them from manually re-entering it each session.

**Why this priority**: This is the core UX benefit of the feature. It directly removes
friction for users who track body-weight exercises by eliminating repeated manual
weight entry.

**Independent Test**: Can be tested independently by having at least one body weight
entry logged (Feature 1) and adding a body-weight movement to a workout — the weight
field MUST appear pre-filled with that value.

**Acceptance Scenarios**:

1. **Given** the user has a logged body weight entry and adds a body-weight movement
   to their workout, **When** the set input row appears, **Then** the weight field is
   pre-filled with the most recently logged body weight value.
2. **Given** the user has no logged body weight entries and adds a body-weight movement,
   **When** the set input row appears, **Then** the weight field is empty and a hint
   is shown suggesting the user log their body weight.
3. **Given** the weight field is pre-filled, **When** the user manually changes the
   value, **Then** the edited value is used for that set (user override is always
   respected).
4. **Given** a non-body-weight movement is added to the same workout, **When** the set
   input row appears, **Then** the weight field is empty (no auto-fill).

---

### User Story 3 - Edit an Existing Movement's Body-Weight Flag (Priority: P2)

A user has an existing movement that they want to reclassify as body-weight (or vice
versa). They edit the movement and toggle the flag; future sets using that movement
will reflect the updated behavior.

**Why this priority**: Users who have been tracking before this feature was introduced
need to be able to update their existing movements without recreating them.

**Independent Test**: Can be tested independently by editing an existing movement's
body-weight flag and then adding it to a new workout to confirm the auto-fill behavior
matches the updated flag.

**Acceptance Scenarios**:

1. **Given** an existing non-body-weight movement, **When** the user edits it and
   enables the body-weight flag, **Then** the flag is saved and subsequent workout
   additions auto-fill the weight.
2. **Given** an existing body-weight movement, **When** the user edits it and disables
   the flag, **Then** the movement behaves as a standard movement going forward (no
   auto-fill).
3. **Given** historical sets logged before the flag was toggled, **When** the user
   views workout history, **Then** historical data is not altered.

---

### Edge Cases

- What if no body weight entry has been logged when a body-weight movement is added?
  → Weight field remains empty; a hint guides the user to log their body weight
  first. The set can still be saved with a manually entered weight.
- What if the most recent body weight entry was logged many weeks ago? → The most
  recent value is still used as the default; no staleness check is applied (assumption:
  user is responsible for keeping their weight up to date).
- What happens to historical sets when a movement's body-weight flag is changed?
  → Historical sets are not affected; only future additions use the new behavior.
- What if the user adds the same body-weight movement to a workout multiple times?
  → Each new set row is pre-filled independently with the same most recent body weight.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The movement creation form MUST include a toggle to mark a movement as
  body-weight.
- **FR-002**: The movement edit form MUST include the same body-weight toggle, allowing
  the flag to be changed on an existing movement.
- **FR-003**: The body-weight flag MUST be persisted as part of the movement record.
- **FR-004**: Movements flagged as body-weight MUST display a visual indicator in the
  movements list that distinguishes them from standard movements.
- **FR-005**: When a body-weight movement is added to an active workout, the weight
  input field for the new set MUST be pre-filled with the user's most recently logged
  body weight value.
- **FR-006**: If the user has no logged body weight entries, the weight field MUST
  remain empty and MUST display a contextual hint directing the user to log their
  body weight.
- **FR-007**: The user MUST be able to override the pre-filled weight value for any
  individual set without restriction.
- **FR-008**: Changing a movement's body-weight flag MUST NOT alter any previously
  logged set data for that movement.
- **FR-009**: Non-body-weight movements MUST NOT receive any auto-fill behavior.

### Key Entities

- **Movement** *(modified)*: Gains a boolean `isBodyWeight` attribute. All other
  attributes remain unchanged.
- **WeightEntry** *(from Feature 1)*: The most recent entry for the current user
  provides the auto-fill value. This feature reads from but does not write to weight
  entries.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: When adding a body-weight movement to a workout (with a prior body weight
  logged), the weight field is pre-filled instantly — no additional user interaction
  required.
- **SC-002**: A user can flag a movement as body-weight during creation in under 5
  additional seconds compared to creating a standard movement (toggle is a single
  action).
- **SC-003**: 100% of body-weight movements added to a workout show the pre-filled
  weight when at least one body weight entry exists for the user.
- **SC-004**: 100% of non-body-weight movements added to a workout show an empty
  weight field (no erroneous auto-fill).
- **SC-005**: Toggling the body-weight flag on an existing movement takes under 30
  seconds end-to-end (navigate → edit → save).

## Assumptions

- The movements list and movement creation/edit pages already exist; this feature
  adds a toggle to them rather than replacing them.
- "Most recently logged body weight" means the single latest WeightEntry by recorded
  date/time for the authenticated user (from Feature 1).
- No staleness threshold is applied to the body weight default — the most recent value
  is always used regardless of when it was logged.
- This feature does not change how historical workout data is displayed or stored.
- The body-weight flag applies to the movement globally (per user), not per-workout.
- Unauthenticated access is out of scope; all flows assume the user is logged in.
- Mobile responsiveness follows the app's existing responsive design conventions.
- Feature 1 (weight tracking) MUST be deployed before or alongside this feature for
  the auto-fill to function; if deployed without Feature 1, the empty-field fallback
  (FR-006) applies.
