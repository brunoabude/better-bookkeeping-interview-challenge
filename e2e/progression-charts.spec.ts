import { test, expect, Page } from "@playwright/test";
import { waitForHydration, signInOrCreate } from "./shared";

const PROG_PASSWORD = "password123";

async function createCompletedWorkout(page: Page, movementName: string, weight: number, reps: number) {
  await page.goto("/movements");
  await waitForHydration(page);
  const existing = await page.locator("li").filter({ hasText: movementName }).count();
  if (existing === 0) {
    await page.getByPlaceholder("Movement name (e.g. Bench Press)").fill(movementName);
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.locator("li").filter({ hasText: movementName })).toBeVisible();
  }

  await page.goto("/current-workout");
  await waitForHydration(page);

  const completeBtn = page.getByRole("button", { name: "Complete Workout" });
  if (await completeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await completeBtn.click();
    await waitForHydration(page);
  }

  await page.getByRole("button", { name: "Start Workout" }).click();
  await waitForHydration(page);

  await page.getByRole("combobox").selectOption({ label: movementName });
  await page.locator('input[placeholder="Weight"]').fill(String(weight));
  await page.locator('input[placeholder="Reps"]').fill(String(reps));
  await page.getByRole("button", { name: "Add" }).click();
  await waitForHydration(page);

  await page.getByRole("button", { name: "Complete Workout" }).click();
  await waitForHydration(page);
}

test.describe("Progression Charts (US1) — chart renders", () => {
  test("US1 happy path: chart renders with SVG after selecting movement", async ({ page }) => {
    const movementName = `Deadlift-${Date.now()}`;

    await createCompletedWorkout(page, movementName, 100, 5);
    await createCompletedWorkout(page, movementName, 110, 5);

    await page.goto("/workout-history");
    await waitForHydration(page);

    await page.getByRole("combobox").last().selectOption({ label: movementName });

    await expect(page.locator(".recharts-responsive-container svg")).toBeVisible({ timeout: 10000 });
  });

  test("US1 metric correctness: switching metrics keeps chart visible", async ({ page }) => {
    const movementName = `Squat-${Date.now()}`;
    await createCompletedWorkout(page, movementName, 80, 8);

    await page.goto("/workout-history");
    await waitForHydration(page);

    await page.getByRole("combobox").last().selectOption({ label: movementName });
    await expect(page.locator(".recharts-responsive-container svg")).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: "Total Reps" }).click();
    await expect(page.locator(".recharts-responsive-container svg")).toBeVisible();

    await page.getByRole("button", { name: "Total Volume" }).click();
    await expect(page.locator(".recharts-responsive-container svg")).toBeVisible();

    await page.getByRole("button", { name: "Max Weight" }).click();
    await expect(page.locator(".recharts-responsive-container svg")).toBeVisible();
  });
});

test.describe("Progression Charts (US2) — selector independence", () => {
  test("US2: changing metric preserves movement selection; changing movement preserves metric", async ({
    page,
  }) => {
    const movement1 = `OHP-${Date.now()}`;
    const movement2 = `BenchPress-${Date.now()}`;
    await createCompletedWorkout(page, movement1, 50, 10);
    await createCompletedWorkout(page, movement2, 70, 8);

    await page.goto("/workout-history");
    await waitForHydration(page);

    const select = page.getByRole("combobox").last();

    await select.selectOption({ label: movement1 });
    await expect(page.locator(".recharts-responsive-container svg")).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: "Total Reps" }).click();

    const movement1Id = await page.evaluate((name: string) => {
      const opts = Array.from(document.querySelectorAll("select option"));
      return (opts.find((o) => o.textContent?.trim() === name) as HTMLOptionElement | undefined)?.value ?? "";
    }, movement1);
    await expect(select).toHaveValue(movement1Id);

    await select.selectOption({ label: movement2 });
    await expect(page.locator(".recharts-responsive-container svg")).toBeVisible({ timeout: 10000 });

    const movement2Id = await page.evaluate((name: string) => {
      const opts = Array.from(document.querySelectorAll("select option"));
      return (opts.find((o) => o.textContent?.trim() === name) as HTMLOptionElement | undefined)?.value ?? "";
    }, movement2);
    await expect(select).toHaveValue(movement2Id);
  });
});

test.describe("Progression Charts (US3) — empty states", () => {
  test.describe("fresh account", () => {
    test.use({ storageState: undefined });

    test("US3: fresh account with no completed workouts shows instructional text", async ({ page }) => {
      await page.goto("/logout");
      await page.waitForURL("/sign-in");
      const freshEmail = `e2e-prog-fresh-${Date.now()}@test.com`;
      await signInOrCreate(page, freshEmail, PROG_PASSWORD, "Progression Fresh User");

      await page.goto("/workout-history");
      await waitForHydration(page);

      await expect(
        page.getByText("Complete a workout to start tracking your progression."),
      ).toBeVisible();
    });
  });

  test("US3: with completed workouts but no movement selected shows selection prompt", async ({ page }) => {
    const movementName = `SelPrompt-${Date.now()}`;
    await createCompletedWorkout(page, movementName, 60, 6);

    await page.goto("/workout-history");
    await waitForHydration(page);

    await expect(
      page.getByText("Select a movement above to see your progression chart."),
    ).toBeVisible();
  });
});
