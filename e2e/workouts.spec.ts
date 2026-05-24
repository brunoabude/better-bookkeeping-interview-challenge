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
