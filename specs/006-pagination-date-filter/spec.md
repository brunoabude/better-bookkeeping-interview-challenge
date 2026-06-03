# Feature Specification: Workout History, Weight Tracking & Movements Pagination with Date Range Filtering

**Feature Branch**: `006-pagination-date-filter`

**Created**: 2026-06-02

**Status**: Draft

**Input**: User description: "Workout history and weight tracking pages are not being paginated right now. Pagination is important for reducing the load on database and also providing better UX. The user must be able to paginate between the workout history, and also be able to filter by date ranges. So, when the users choose a date range, the pagination will be applied to that range. The maximum allowed date range is 30 days, and it defaults to the last 30 days when no user input is provided. This logic applies to both workout history and weight tracking pages. The pagination must be handled in the SQL side, so don't pull the whole history and try to paginate it client-side."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Paginate Workout History Within a Date Range (Priority: P1)

A user opens the Workout History page. The page automatically shows their workouts from the last 90 days. Only a fixed number of workouts are displayed at a time, with controls to navigate to previous or next pages. The user can change the date range using a date picker — once they select a valid range (up to 90 days), the list resets to the first page and shows only workouts within that range. Only the workouts for the current page are loaded from the system; the full history is never pulled all at once.

**Why this priority**: Directly addresses the database load problem and the primary UX need — browsing workout history without waiting for the full dataset to load. Delivers immediate value even without weight tracking changes.

**Independent Test**: Can be fully tested by opening the Workout History page, verifying only the last 90 days are shown by default, navigating through pages, changing the date range, and confirming the list updates accordingly without loading unrelated workouts.

**Acceptance Scenarios**:

1. **Given** a user with many completed workouts spanning several months, **When** they open the Workout History page, **Then** only workouts completed within the last 90 days are shown, paginated with a fixed number of items per page.
2. **Given** the user is on the Workout History page, **When** they navigate to the next page, **Then** the next set of workouts within the current date range is displayed.
3. **Given** the user selects a custom date range of up to 90 days, **When** the range is applied, **Then** the list resets to page 1 and shows only workouts within that range.
4. **Given** the user selects a date range greater than 90 days, **When** both dates are set, **Then** a warning icon with a tooltip appears and no new data is fetched.
5. **Given** the user is on page 2 of workout history, **When** they change the date range to a valid range, **Then** the page resets to 1.
6. **Given** no workouts exist in the selected date range, **When** the valid filter is auto-applied, **Then** an empty state message is displayed.

---

### User Story 2 - Paginate Weight Entries Within a Date Range (Priority: P2)

A user opens the Weight Tracking page. The history section automatically shows their weight entries from the last 90 days. They can navigate between pages to see entries within the range. The chart also reflects the currently selected date range. The user can change the date range using a date picker.

**Why this priority**: Consistent with the workout history behaviour and prevents the weight history from growing unboundedly in memory as the user logs entries over months or years.

**Independent Test**: Can be fully tested by opening the Weight Tracking page, verifying only the last 90 days of entries appear in the history list and chart, navigating pages, and changing the date range.

**Acceptance Scenarios**:

1. **Given** a user with weight entries spanning several months, **When** they open the Weight Tracking page, **Then** only entries from the last 90 days are shown in the history list and the chart, paginated.
2. **Given** the user is on the Weight Tracking page, **When** they navigate to the next page in the history list, **Then** the next set of entries within the current date range is displayed.
3. **Given** the user selects a custom date range of up to 90 days, **When** the range is applied, **Then** the history list and chart reset to page 1 and reflect only entries within that range.
4. **Given** the user selects a date range greater than 90 days, **When** both dates are set, **Then** a warning icon with a tooltip appears and no new data is fetched.
5. **Given** no weight entries exist in the selected date range, **When** the valid filter is auto-applied, **Then** an empty state message is displayed in the history section.

---

### User Story 3 - Reset Date Range to Default (Priority: P3)

A user who has set a custom date range can reset it back to the default (last 90 days) at any time with a single action, without manually re-entering dates.

**Why this priority**: Quality-of-life improvement that completes the date range filtering flow. Without a reset option, users who set a custom range are stuck with it until they manually clear the dates.

**Independent Test**: Can be tested by setting a custom date range, then clicking a "Reset" or "Clear" control, and verifying the filter returns to the last 90 days and the list reloads.

**Acceptance Scenarios**:

1. **Given** the user has set a custom date range, **When** they click the reset control, **Then** the date range returns to the last 90 days and the list reloads accordingly.

---

### User Story 4 - Paginate Movements List (Priority: P2)

A user opens the Movements page. The full list of movements is paginated so that only a fixed number of movements are shown at a time. Movements remain sorted alphabetically. The user can navigate between pages using pagination controls. No date range filter applies — movements have no time dimension.

**Why this priority**: Prevents the movements list from growing unboundedly in the UI as users accumulate many custom movements over time.

**Independent Test**: Can be tested by opening the Movements page and verifying that pagination controls appear and function correctly when enough movements exist.

**Acceptance Scenarios**:

1. **Given** a user with many movements, **When** they open the Movements page, **Then** only a fixed number of movements are displayed, sorted alphabetically, with pagination controls visible.
2. **Given** the user is on page 1 of the movements list, **When** they navigate to page 2, **Then** the next set of alphabetically sorted movements is displayed.
3. **Given** the total number of movements fits on a single page, **When** the user opens the Movements page, **Then** pagination controls are hidden or disabled.

---

### Edge Cases

- What happens when the start date is after the end date? A warning icon with a tooltip appears next to the date picker; no data fetch is triggered. The existing valid range (or default) remains active.
- What happens when the selected range exceeds 90 days? A warning icon with a tooltip stating the 90-day limit appears next to the date picker; no data fetch is triggered.
- What happens when the user is on the last page and the total count is not evenly divisible by the page size? The last page shows only the remaining items.
- What happens when there is only one page of results? Pagination controls are hidden or clearly shown as disabled.
- What happens when a single date is selected as both start and end? This is valid — a one-day range must be accepted.
- What happens if the user clears one date input but not the other? The filter must not be applied; the existing range remains active until a complete, valid range is provided.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Workout History page MUST display completed workouts filtered to a date range, defaulting to the last 90 days when the page is first loaded.
- **FR-002**: The Weight Tracking page MUST display weight entries filtered to a date range, defaulting to the last 90 days when the page is first loaded.
- **FR-003**: Both pages MUST present a date range picker allowing the user to set a start date and an end date. The filter MUST apply automatically once both dates are set, debounced with a 500 ms delay so that rapid changes do not trigger multiple server requests. No explicit "Apply" button is required.
- **FR-004**: When the selected date range exceeds the page-specific maximum (90 calendar days for both Workout History and Weight Tracking), the system MUST display a small warning icon adjacent to the date picker with a tooltip explaining the applicable limit. No data fetch MUST be triggered while the range is invalid.
- **FR-005**: When the start date is after the end date, the system MUST display a small warning icon adjacent to the date picker with a tooltip explaining the invalid range. No data fetch MUST be triggered while the range is invalid.
- **FR-006**: Both pages MUST display records in pages of a fixed size, using the shadcn `Pagination` component (numbered page buttons, previous/next arrows, and ellipsis for large page counts) placed below the list.
- **FR-007**: When the user applies a new date range, the system MUST reset to the first page before loading filtered results.
- **FR-008**: The data fetched for each page view MUST be limited server-side to only the records belonging to the current page within the selected date range — the full record history MUST NOT be loaded and then filtered or sliced in the application layer.
- **FR-009**: Both pages MUST provide a control to reset the date range to the default (last 90 days) without requiring manual date entry. Resetting MUST also clear the relevant URL query params and return to page 1.
- **FR-014**: Current page number, start date, and end date MUST be reflected in the URL query string (e.g. `?page=2&from=2026-05-01&to=2026-05-31`) using TanStack Router search params. Navigating to a URL with valid params MUST restore the corresponding filtered, paginated view.
- **FR-010**: When no records exist for the current page within the selected date range, the system MUST display an informative empty-state message.
- **FR-011**: The Weight Tracking page chart MUST update to reflect the selected date range, showing only entries within that range.
- **FR-012**: Pagination controls MUST be hidden or visually disabled when there is only one page of results.
- **FR-015**: When the user navigates to a different page, the page MUST automatically scroll to the top of the list container.
- **FR-013**: Both pages MUST display a summary indicating the user's position within the result set (e.g., "Showing 1–5 of 47 workouts").
- **FR-016**: The Movements page MUST display movements paginated with the same fixed page size as the other pages (5 items per page), sorted alphabetically. No date range filter applies.
- **FR-017**: The current page number on the Movements page MUST be reflected in the URL query string (e.g. `?page=2`). Navigating to a URL with a valid `page` param MUST restore that page of the movements list.
- **FR-018**: Pagination controls on the Movements page MUST be hidden or visually disabled when all movements fit on a single page.

### Key Entities

- **Date Range**: A pair of start and end dates (inclusive) constraining which records are shown. Maximum span is 90 calendar days for both Workout History and Weight Tracking. Default window: 89 days ago → today (inclusive), producing a 90-day window.
- **Page**: A fixed-size slice of the filtered result set, defined by a page number (1-indexed) and a fixed page size of 5 items.
- **Workout History Record**: A completed workout entry identified by its completion date, shown within the filtered and paginated view.
- **Weight Entry**: A single logged body weight measurement for a specific date, shown within the filtered and paginated view.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Both pages load and display their first page of results within 2 seconds for a user with up to 5 years of recorded data.
- **SC-002**: Changing the date range or navigating to a different page takes under 1 second to display updated results.
- **SC-003**: The amount of data delivered to the user per page view is proportional to the page size — not to the total number of records stored for that user.
- **SC-004**: Users can always determine their current position in the result set (current page and total count are visible).
- **SC-005**: 100% of invalid date ranges (exceeding the 90-day maximum or start after end) are blocked from triggering a data fetch; a warning icon with tooltip is shown inline next to the date picker.
- **SC-006**: The default date range (last 90 days) is applied automatically on first load for both Workout History and Weight Tracking pages without any user interaction.

## Assumptions

- The page size is fixed at 5 items per page; this is not user-configurable in this version.
- The progression chart on the Workout History page (which shows all-time movement progression for a selected exercise) is out of scope for this feature's date range filtering — it continues to display all historical data for the selected movement.
- Pagination state (current page number, start date, end date) is stored in the URL query string (e.g. `?page=2&from=2026-05-01&to=2026-05-31`), making filtered views bookmarkable and shareable. If no query params are present on load, the default range and page 1 are used.
- Users are authenticated; unauthenticated access is already handled by existing infrastructure and is out of scope.
- Dates are interpreted in the user's local timezone for the purpose of defining the date range boundaries.
- The default date range for both Workout History and Weight Tracking is 89 days ago → today (inclusive), producing a 90-day window.
- E2E tests run against a dedicated PostgreSQL database (same Postgres instance, separate database from development). This database is cleaned (all data wiped) in a global setup step before any test runs, and all migrations are applied in that same global setup. This prevents unbounded DB growth and eliminates inter-test data pollution from parallel test runs.

## Clarifications

### Session 2026-06-02

- Q: Which pagination UI component pattern should be used for both pages? → A: shadcn `Pagination` component (numbered page buttons, prev/next arrows, ellipsis for large page counts), placed below the list.
- Q: Should the date range filter apply automatically or require an explicit Apply button? → A: Auto-apply when both dates are set, debounced to avoid rapid server requests. Invalid ranges (>90 days, start after end) show a small warning icon with a tooltip — no blocking error message, no data fetch while invalid.
- Q: What debounce delay should be used before auto-applying the date filter? → A: 500 ms.
- Q: Should pagination state (page + date range) be stored in the URL query string or client state only? → A: URL query string (`?page=2&from=2026-05-01&to=2026-05-31`) via TanStack Router search params — shareable, bookmarkable, back-button works.
- Q: Should the page auto-scroll to the top of the list when the user navigates to a new page? → A: Yes, auto-scroll to top of the list container on every page change.

### Session 2026-06-03

- Q: Do the Workout History and Weight Tracking pages share the same maximum date range and default window, or do they differ? → A: They now use the same limit: both Workout History and Weight Tracking use 90 days (max and default). FR-001, FR-004, FR-009, SC-005, SC-006, Assumptions, Key Entities, and User Stories 1–3 updated accordingly.
- Q: Is Movements page pagination intentional or an accidental side effect of the feature? → A: Intentional — implemented outside the spec flow. Movements list is paginated (page size 5, alphabetical sort, `?page=N` URL param, no date range filter). User Story 4 and FR-016–018 added.
- Q: Which URL matching strategy should e2e tests use when asserting navigation to pages that now carry pagination query params? → A: Regex partial match — `toHaveURL(/\/weight/)` / `toHaveURL(/\/movements/)` etc. Consistent with existing patterns in the suite; query params are ignored.
- Q: What page size is used across all paginated pages? → A: 5 items per page (uniform across Workout History, Weight Tracking, and Movements). FR-016, Key Entities, and Assumptions updated; example counts in FR-013 adjusted accordingly.
- Q: How should e2e test data isolation be handled to prevent parallel test interference after pagination was introduced? → A: Dedicated test database (same Postgres instance, separate DB). Global setup cleans the DB and applies migrations before any test runs. This replaces the earlier `!Movement-${Date.now()}` prefix workaround, which is no longer needed. Assumption added under the Assumptions section.
