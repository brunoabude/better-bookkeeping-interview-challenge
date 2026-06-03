# Research: Workout History & Weight Tracking Pagination with Date Range Filtering

## Pagination Strategy

**Decision**: Offset-based pagination using Prisma's `take` / `skip` options  
**Rationale**: Offset-based is the correct default for the access patterns here — the user browses forward/back by page number, there is no infinite scroll, and the dataset is not so large that keyset pagination is needed. Prisma's `take`/`skip` maps directly to SQL `LIMIT`/`OFFSET`.  
**Alternatives considered**: Keyset (cursor) pagination — better for infinite scroll and very large datasets, but adds complexity (requires a stable sort key and cursor management) and is overkill for explicit prev/next navigation with page sizes of 5.

## Count + Data in One Round-Trip

**Decision**: Use `prisma.$transaction([count, findMany])` to fetch total count and the page's data atomically  
**Rationale**: Executing count and data fetch separately risks the total changing between the two queries. Wrapping them in a transaction prevents this race condition and keeps the round-trip count to 1.  
**Alternatives considered**: Sequential count + findMany — simpler but vulnerable to count drift between queries; not worth the risk.

## Date Range Filtering

**Decision**: Construct UTC datetime boundaries from ISO date strings server-side and use Prisma `gte`/`lte` filters  
**Rationale**:
- For `Workout.completedAt` (a full timestamp): filter by `completedAt >= YYYY-MM-DDT00:00:00.000Z` AND `completedAt <= YYYY-MM-DDT23:59:59.999Z`.
- For `WeightEntry.date` (stored as `T00:00:00.000Z` by the existing upsert logic): filter by `date >= startDate AND date <= endDate` using the same boundary pattern.
- Converting on the server side means the client sends simple `YYYY-MM-DD` strings, and the server owns timezone interpretation (UTC midnight boundaries). The spec notes dates should be interpreted in user local timezone, but since the app does not currently collect timezone information, UTC midnight boundaries are the pragmatic default. This is documented as a future improvement point.  
**Alternatives considered**: Client sends full ISO timestamps — more flexible for timezone support but adds unnecessary complexity given current app scope.

## Date Range Validation

**Decision**: Validate both client-side (immediate feedback) and server-side (security)  
**Rationale**: Client-side validation prevents unnecessary round-trips; server-side is mandatory to prevent bypassing UI constraints. Both layers apply the same two rules: start ≤ end, range ≤ 90 calendar days. Calendar days are computed as `Math.abs(differenceInDays)` using simple date arithmetic.

## Page Size

**Decision**: Fixed at 5 items per page, defined as a constant  
**Rationale**: 5 items per page is the value chosen for this project per spec assumptions. Not user-configurable in this version.

## Query Key Design

**Decision**: Include `{ startDate, endDate, page }` in TanStack Query's `queryKey` array  
**Rationale**: TanStack Query deduplicates and caches by query key. If date range or page changes, a new cache entry is created. On reset to default values, the cached default response is served from cache without a new network request.  
**Pattern**:
```
["workout-history", { startDate, endDate, page }]
["weight-entries", { startDate, endDate, page }]
```

## UI Controls

**Decision**: Native HTML `<input type="date">` elements for the date range picker (unchanged); shadcn-style `Pagination` component for page navigation  
**Rationale**: Native date inputs require no additional dependencies and fulfill the requirement. For pagination, the spec (clarified 2026-06-02) requires the shadcn `Pagination` component with numbered pages, prev/next arrows, and ellipsis. The `@better-bookkeeping/ui` package is not installed locally; UI components are maintained in `src/components/ui/` following the same shadcn conventions. A `Pagination` component must be created there, reusing the existing `Button` component and `cn` utility.  
**Alternatives considered**: Simple Prev/Next buttons only (the first iteration) — insufficient per spec clarification.

## Date Filter Trigger — Auto-Apply with Debounce

**Decision**: Remove the Apply button. Wire `onChange` directly to each date input. Debounce the URL navigation by 500 ms using a `useDebounce` hook. Do not fire a data fetch while the range is invalid.  
**Rationale**: Clarified 2026-06-02. The Apply button created an extra interaction step. Auto-apply with debounce feels immediate while preventing a rapid series of server requests as the user adjusts dates. The 500 ms delay absorbs both inputs (start + end) in a typical date-picking gesture.  
**Alternatives considered**: Apply button (current implementation) — contradicts the clarification decision.

## Validation Feedback — Warning Icon + Tooltip

**Decision**: Replace inline error `<span>` text with a `<AlertCircle>` icon (from `lucide-react`) carrying a `title` attribute as the tooltip. The icon appears adjacent to the date picker when the range is invalid. No data fetch is triggered while invalid.  
**Rationale**: Clarified 2026-06-02. A native `title` tooltip on a Lucide icon (already used throughout the codebase) satisfies the spec with zero additional component code.  
**Alternatives considered**: Keep inline error text (current) — contradicts clarification. Create a Tooltip component — over-engineering for a single use.

## URL Search Params — TanStack Router `validateSearch` + `loaderDeps`

**Decision**: Declare `page`, `from`, and `to` as typed URL search params on both routes using `validateSearch`. Use `loaderDeps` to trigger loader re-execution on param changes. Read in component via `Route.useSearch()`; write via `useNavigate`.  
**Rationale**: Clarified 2026-06-02. URL-based state makes filtered views bookmarkable and shareable, and the browser back button navigates page history correctly. TanStack Router has first-class support for typed search params with no extra libraries.  
**Alternatives considered**: `useState` (current) — resets on refresh, not shareable.

## Auto-Scroll on Page Change

**Decision**: Attach a `ref` to the list container. In a `useEffect` watching the `page` search param, call `ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })`.  
**Rationale**: Clarified 2026-06-02. Without auto-scroll, the user lands mid-page after clicking a page number. `scrollIntoView` on the list container is the most precise option.  
**Alternatives considered**: `window.scrollTo(0, 0)` — scrolls the full viewport, not the list container.

## Virtualization Removal

**Decision**: Remove `useVirtualizer` from both pages  
**Rationale**: Virtual scrolling was a workaround for long unbounded lists loaded all at once. With server-side pagination returning at most 5 items, virtual scrolling adds complexity with no benefit. A plain list renders 5 items trivially.  
**Impact**: Removes the `@tanstack/react-virtual` dependency usage from these two pages (the package itself may remain if used elsewhere, but no new import is needed).

## Shared Abstractions

**Decision**: Create `src/hooks/use-debounce.ts` exporting `useDebounce<T>(value: T, delay: number): T`. No other shared abstraction.  
**Rationale**: `useDebounce` is called for `startDate` and `endDate` in both page components = 4 call sites, satisfying the constitution's three-or-more threshold. The hook itself is a 7-line primitive with no domain logic. Pagination render logic differs between pages (Workout has collapse/expand rows; Weight has a simpler list), so no shared pagination wrapper is warranted.

## Test Coverage

**Decision**: Update existing Playwright e2e tests in `e2e/workouts.spec.ts` and `e2e/weight.spec.ts` to match the new interaction model (no Apply button; auto-apply; icon-based validation; URL params; shadcn Pagination component). Add new tests covering: URL param restoration, pagination component navigation, invalid range icon display, and reset.  
**Rationale**: The constitution requires at least one e2e test covering the happy path for each user-facing feature. Existing tests reference the Apply button and inline error text — these must be updated or they will fail. New tests cover the clarified behaviors.
