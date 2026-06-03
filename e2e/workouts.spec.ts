import { test, expect } from "@playwright/test";
import { waitForHydration } from "./shared";

async function completeActiveWorkout(page: import("@playwright/test").Page) {
  await page.goto("/current-workout");
  await waitForHydration(page);
  const completeBtn = page.getByRole("button", { name: "Complete Workout" });
  if (await completeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await completeBtn.click();
    await waitForHydration(page);
  }
}

test.describe("Workouts", () => {
  test.beforeEach(async ({ page }) => {
    await completeActiveWorkout(page);
  });

  test.describe("create", () => {
    test("should start a new workout from the current workout page", async ({ page }) => {
      await page.goto("/current-workout");
      await waitForHydration(page);
      await page.getByRole("button", { name: "Start Workout" }).click();
      await waitForHydration(page);
      await expect(page.getByRole("button", { name: "Start Workout" })).not.toBeVisible();
      await expect(page.getByRole("button", { name: "Complete Workout" })).toBeVisible();
    });

    test("should show the workout date after starting", async ({ page }) => {
      await page.goto("/current-workout");
      await waitForHydration(page);
      await page.getByRole("button", { name: "Start Workout" }).click();
      await waitForHydration(page);

      const dateString = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      await expect(page.getByText(dateString)).toBeVisible();
    });
  });

  test.describe("read", () => {
    test("should display the current active workout", async ({ page }) => {
      await page.goto("/current-workout");
      await waitForHydration(page);
      await page.getByRole("button", { name: "Start Workout" }).click();
      await waitForHydration(page);
      await expect(page.getByRole("button", { name: "Complete Workout" })).toBeVisible();
    });

    test("should show 'No active workout' when none exists", async ({ page }) => {
      await page.goto("/current-workout");
      await waitForHydration(page);
      await expect(page.getByRole("button", { name: "Start Workout" })).toBeVisible();
    });

    test("should display completed workouts in workout history", async ({ page }) => {
      await page.goto("/current-workout");
      await waitForHydration(page);
      await page.getByRole("button", { name: "Start Workout" }).click();
      await waitForHydration(page);
      await page.getByRole("button", { name: "Complete Workout" }).click();
      await waitForHydration(page);

      await page.goto("/workout-history");
      await waitForHydration(page);
      await expect(page.locator('[data-index="0"]')).toBeVisible();
    });
  });

  test.describe("complete", () => {
    test("should mark the current workout as completed", async ({ page }) => {
      await page.goto("/current-workout");
      await waitForHydration(page);
      await page.getByRole("button", { name: "Start Workout" }).click();
      await waitForHydration(page);
      await page.getByRole("button", { name: "Complete Workout" }).click();
      await waitForHydration(page);
      await expect(page.getByRole("button", { name: "Start Workout" })).toBeVisible();
    });

    test("should move completed workout to history", async ({ page }) => {
      await page.goto("/current-workout");
      await waitForHydration(page);
      await page.getByRole("button", { name: "Start Workout" }).click();
      await waitForHydration(page);
      await page.getByRole("button", { name: "Complete Workout" }).click();
      await waitForHydration(page);

      await page.goto("/workout-history");
      await waitForHydration(page);
      await expect(page.locator('[data-index="0"]')).toBeVisible();
    });
  });

  test.describe("workout history pagination", () => {
    test("default date range is pre-filled to last 30 days", async ({ page }) => {
      await page.goto("/workout-history");
      await waitForHydration(page);

      const today = new Date();
      const startDefault = new Date();
      startDefault.setDate(today.getDate() - 29);

      const fmt = (d: Date) => d.toLocaleDateString("en-CA"); // YYYY-MM-DD

      const startInput = page.locator('input[type="date"]').first();
      const endInput = page.locator('input[type="date"]').last();

      await expect(startInput).toHaveValue(fmt(startDefault));
      await expect(endInput).toHaveValue(fmt(today));
    });

    test("applying a valid date range resets to page 1 and filters the list", async ({ page }) => {
      // Create and complete a workout so there is data in the list
      await page.goto("/current-workout");
      await waitForHydration(page);
      await page.getByRole("button", { name: "Start Workout" }).click();
      await waitForHydration(page);
      await page.getByRole("button", { name: "Complete Workout" }).click();
      await waitForHydration(page);

      await page.goto("/workout-history");
      await waitForHydration(page);

      // Fill a valid range that includes today — auto-apply after debounce
      const today = new Date().toLocaleDateString("en-CA");
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const twoDaysAgoStr = twoDaysAgo.toLocaleDateString("en-CA");

      await page.locator('input[type="date"]').first().fill(twoDaysAgoStr);
      await page.locator('input[type="date"]').last().fill(today);

      // Wait for debounce + query
      await page.waitForTimeout(600);
      await waitForHydration(page);

      // Should show no error icon and the list should have the just-completed workout
      await expect(page.locator('[data-testid="range-error-icon"]')).not.toBeVisible();
      await expect(page.locator('[data-index="0"]')).toBeVisible();
    });

    test("invalid date range shows warning icon, not error text", async ({ page }) => {
      await page.goto("/workout-history");
      await waitForHydration(page);

      const today = new Date();
      const thirtyOneAgo = new Date();
      thirtyOneAgo.setDate(today.getDate() - 31);

      await page.locator('input[type="date"]').first().fill(thirtyOneAgo.toLocaleDateString("en-CA"));
      await page.locator('input[type="date"]').last().fill(today.toLocaleDateString("en-CA"));

      // Icon should appear immediately (no debounce needed for validation display)
      await expect(page.locator('[data-testid="range-error-icon"]')).toBeVisible();
      // No text error message
      await expect(page.getByText("Date range must not exceed 30 days")).not.toBeVisible();
    });

    test("applying a range where start is after end shows warning icon", async ({ page }) => {
      await page.goto("/workout-history");
      await waitForHydration(page);

      const today = new Date().toLocaleDateString("en-CA");
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await page.locator('input[type="date"]').first().fill(today);
      await page.locator('input[type="date"]').last().fill(yesterday.toLocaleDateString("en-CA"));

      await expect(page.locator('[data-testid="range-error-icon"]')).toBeVisible();
      await expect(page.getByText("Start date must not be after end date")).not.toBeVisible();
    });

    test("reset restores default date range", async ({ page }) => {
      await page.goto("/workout-history");
      await waitForHydration(page);

      // Set an invalid range so there's an error icon visible
      const today = new Date();
      const thirtyOneAgo = new Date();
      thirtyOneAgo.setDate(today.getDate() - 31);

      await page.locator('input[type="date"]').first().fill(thirtyOneAgo.toLocaleDateString("en-CA"));
      await page.locator('input[type="date"]').last().fill(today.toLocaleDateString("en-CA"));
      await expect(page.locator('[data-testid="range-error-icon"]')).toBeVisible();

      // Click Reset
      await page.getByRole("button", { name: "Reset" }).click();
      await waitForHydration(page);

      // Error icon should be gone
      await expect(page.locator('[data-testid="range-error-icon"]')).not.toBeVisible();

      // Dates should be back to defaults
      const startDefault = new Date();
      startDefault.setDate(today.getDate() - 29);
      const fmt = (d: Date) => d.toLocaleDateString("en-CA");

      await expect(page.locator('input[type="date"]').first()).toHaveValue(fmt(startDefault));
      await expect(page.locator('input[type="date"]').last()).toHaveValue(fmt(today));
    });

    test("URL params restore filtered view on reload", async ({ page }) => {
      const today = new Date().toLocaleDateString("en-CA");
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const fromStr = twoDaysAgo.toLocaleDateString("en-CA");

      // Navigate with explicit URL params
      await page.goto(`/workout-history?from=${fromStr}&to=${today}&page=1`);
      await waitForHydration(page);

      // Inputs should reflect the URL params
      await expect(page.locator('input[type="date"]').first()).toHaveValue(fromStr);
      await expect(page.locator('input[type="date"]').last()).toHaveValue(today);
    });
  });

  test.describe("delete", () => {
    test("should delete selected workouts from history", async ({ page }) => {
      // Create and complete a workout so there is something to delete
      await page.goto("/current-workout");
      await waitForHydration(page);
      await page.getByRole("button", { name: "Start Workout" }).click();
      await waitForHydration(page);
      await page.getByRole("button", { name: "Complete Workout" }).click();
      await waitForHydration(page);

      await page.goto("/workout-history");
      await waitForHydration(page);

      const firstWorkoutRow = page.locator('[data-index="0"]');
      await expect(firstWorkoutRow).toBeVisible();

      // Select the first workout's checkbox
      await firstWorkoutRow.locator('input[type="checkbox"]').check();

      // Delete button should show count and be enabled
      const deleteBtn = page.getByRole("button").filter({ hasText: /Delete Selected/ });
      await expect(deleteBtn).toBeEnabled();
      await deleteBtn.click();

      // Wait for mutation to complete and list to update
      await page.waitForTimeout(500);
      await expect(deleteBtn).toBeDisabled();
    });

    test("should allow selecting multiple workouts for deletion", async ({ page }) => {
      // Create and complete two workouts
      for (let i = 0; i < 2; i++) {
        await page.goto("/current-workout");
        await waitForHydration(page);
        await page.getByRole("button", { name: "Start Workout" }).click();
        await waitForHydration(page);
        await page.getByRole("button", { name: "Complete Workout" }).click();
        await waitForHydration(page);
      }

      await page.goto("/workout-history");
      await waitForHydration(page);

      const firstCheckbox = page.locator('[data-index="0"] input[type="checkbox"]');
      const secondCheckbox = page.locator('[data-index="1"] input[type="checkbox"]');

      await firstCheckbox.check();
      await secondCheckbox.check();

      await expect(firstCheckbox).toBeChecked();
      await expect(secondCheckbox).toBeChecked();

      // Delete button should reflect 2 selected
      await expect(page.getByRole("button").filter({ hasText: /Delete Selected \(2\)/ })).toBeVisible();
    });
  });
});
