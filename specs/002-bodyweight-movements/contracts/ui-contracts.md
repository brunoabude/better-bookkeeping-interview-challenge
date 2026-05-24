# UI Contracts: Body-Weight Movements

**Feature**: `002-bodyweight-movements` | **Phase**: 1 | **Date**: 2026-05-24

Describes the observable UI behaviour and component responsibilities for each user-facing surface touched by this feature.

---

## Page: `/movements`

### Movement List Item

**Current state**: Each row shows the movement name.

**After this feature**: Each row that has `isBodyWeight === true` shows a `Badge` labelled "Body Weight" inline with the name.

```
┌──────────────────────────────────────────────┐
│ Pull-ups   [Body Weight]          [Edit]      │
│ Squat                             [Edit]      │
│ Push-ups   [Body Weight]          [Edit]      │
└──────────────────────────────────────────────┘
```

**Acceptance**:
- Badge renders only when `movement.isBodyWeight === true` (FR-004)
- Badge uses `@better-bookkeeping/ui` `Badge` component
- Existing movements without the flag show no badge

---

### Create Movement Form

**Current state**: Single text input for movement name + Submit button.

**After this feature**: Adds a `Switch` + `Label` below the name input.

```
┌──────────────────────────────────────────────┐
│ Movement name                                 │
│ [___________________________]                 │
│                                               │
│ Body-weight movement                          │
│ [○ OFF]  Use my logged body weight as default │
│                                               │
│           [Add Movement]                      │
└──────────────────────────────────────────────┘
```

**Acceptance**:
- Switch defaults to `false` (off) for all new movements (FR-001 — toggle must be present, not pre-enabled)
- Switch state is included in the form submission as `isBodyWeight: boolean`
- Toggling switch off then on before submit correctly sends the final state
- After submit, form resets (including switch back to off)
- Uses `@better-bookkeeping/ui` `Switch` and `Label` components

---

### Movement Edit (inline)

Each movement row has an **Edit** button. Clicking it reveals an inline edit zone within the row.

```
┌──────────────────────────────────────────────┐
│ Pull-ups   [Body Weight]                      │
│  ┌── Edit ─────────────────────────────────┐ │
│  │ Body-weight movement  [● ON]            │ │
│  │            [Save]  [Cancel]             │ │
│  └─────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

**Acceptance**:
- Inline edit shows only the `isBodyWeight` toggle (name editing is out of scope — FR-002 specifies only the toggle)
- Switch is pre-set to the movement's current `isBodyWeight` value
- "Save" calls `updateMovementServerFn({ id, isBodyWeight })` and closes edit zone
- "Cancel" discards changes and closes edit zone
- After save, React Query invalidates `["movements"]` cache so the list updates (badge appears/disappears)
- Historical sets are not affected (FR-008 enforced server-side by not touching `Set` records)

---

## Page: `/current-workout`

### Add Set Form — Weight Field Auto-Fill

**Current state**: Weight field is always empty on each new set row.

**After this feature**: When the user selects a movement from the movement dropdown:
- If `movement.isBodyWeight === true` AND `latestWeight !== null`: weight field is pre-filled with `latestWeight.weight`
- If `movement.isBodyWeight === true` AND `latestWeight === null`: weight field remains empty; hint text displayed below
- If `movement.isBodyWeight === false`: weight field remains empty (no change from current behaviour)

```
Add Set
┌─────────────────────────────────────────────────────────┐
│ Movement  [Pull-ups ▼]                                  │
│ Weight    [68]  ← pre-filled from latest body weight    │
│ Reps      [___]                                         │
│                                         [Add Set]       │
└─────────────────────────────────────────────────────────┘

(When no body weight logged)
Add Set
┌─────────────────────────────────────────────────────────┐
│ Movement  [Pull-ups ▼]                                  │
│ Weight    [___]                                         │
│           ℹ Log your body weight to enable auto-fill    │
│ Reps      [___]                                         │
│                                         [Add Set]       │
└─────────────────────────────────────────────────────────┘
```

**Acceptance**:
- Auto-fill is applied when movement selection changes to a body-weight movement (SC-001: instant, no extra interaction)
- Pre-filled value is editable — user can clear or overwrite it without restriction (FR-007)
- When a non-body-weight movement is selected, weight field is empty (FR-009)
- Hint is shown only when `isBodyWeight === true` AND no weight entry exists (FR-006)
- Hint links or references the `/weight` page to guide the user
- The `latestWeightQueryOptions()` is loaded at route mount (same loader pattern as other queries)
- Auto-fill uses the numeric `weight` value directly (Float from WeightEntry → number in the input)

---

## React Query Cache Keys

| Key | Purpose | New? |
|-----|---------|------|
| `["movements"]` | All movements with `isBodyWeight` | Existing (updated shape) |
| `["latest-weight"]` | Most recent WeightEntry or null | **NEW** |

The `["latest-weight"]` query is fetched at the `/current-workout` route loader. Stale time can follow the existing `weightEntriesQueryOptions` pattern.
