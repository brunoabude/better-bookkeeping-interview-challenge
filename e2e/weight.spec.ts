import { test, expect } from "@playwright/test";
import { waitForHydration } from "./shared";

test.describe("Weight Tracking", () => {
  test("happy path: log weight, view chart, delete entry", async ({ page }) => {
    await page.goto("/weight");
    await waitForHydration(page);

    await expect(page.getByRole("heading", { name: "Weight Tracking" })).toBeVisible();

    await page.getByRole("spinbutton").fill("175");
    await page.getByRole("button", { name: "Log Weight" }).click();

    await expect(page.getByText("175 lbs")).toBeVisible();

    await expect(page.locator(".recharts-responsive-container")).toBeVisible();

    await page.getByRole("button").filter({ has: page.locator(".lucide-trash-2") }).first().click();

    await expect(page.getByText("No weight entries yet")).toBeVisible();

    await expect(page.locator(".recharts-responsive-container")).not.toBeVisible();
  });

  test("Weight link appears in sidebar", async ({ page }) => {
    await page.goto("/current-workout");
    await waitForHydration(page);
    await expect(page.getByRole("link", { name: "Weight" })).toBeVisible();
    await page.getByRole("link", { name: "Weight" }).click();
    await expect(page).toHaveURL("/weight");
  });

  test("upsert: logging weight for same day updates existing entry", async ({ page }) => {
    await page.goto("/weight");
    await waitForHydration(page);

    await page.fill('input[type="number"]', "180");
    await page.getByRole("button", { name: "Log Weight" }).click();

    await expect(page.getByText("180 lbs")).toBeVisible();

    await page.fill('input[type="number"]', "182");
    await page.getByRole("button", { name: "Log Weight" }).click();

    await expect(page.getByText("182 lbs")).toBeVisible();

    const entries = page.locator("text=/\\d+ lbs/");
    await expect(entries).toHaveCount(1);

    await page.getByRole("button").filter({ has: page.locator(".lucide-trash-2") }).first().click();
  });

  test.describe("weight history pagination", () => {
    test("default date range is pre-filled to last 30 days", async ({ page }) => {
      await page.goto("/weight");
      await waitForHydration(page);

      const todayDate = new Date();
      const startDefault = new Date();
      startDefault.setDate(todayDate.getDate() - 29);

      const fmt = (d: Date) => d.toLocaleDateString("en-CA");

      const startInput = page.locator('input[type="date"]').first();
      const endInput = page.locator('input[type="date"]').last();

      await expect(startInput).toHaveValue(fmt(startDefault));
      await expect(endInput).toHaveValue(fmt(todayDate));
    });

    test("applying a valid date range resets to page 1 and shows filtered entries", async ({ page }) => {
      await page.goto("/weight");
      await waitForHydration(page);

      // Log an entry so the history section is visible
      await page.getByRole("spinbutton").fill("150");
      await page.getByRole("button", { name: "Log Weight" }).click();
      await waitForHydration(page);

      const todayStr = new Date().toLocaleDateString("en-CA");
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      await page.locator('input[type="date"]').first().fill(twoDaysAgo.toLocaleDateString("en-CA"));
      await page.locator('input[type="date"]').last().fill(todayStr);

      // Wait for debounce + query
      await page.waitForTimeout(600);
      await waitForHydration(page);

      await expect(page.locator('[data-testid="range-error-icon"]')).not.toBeVisible();
      await expect(page.getByText("150 lbs")).toBeVisible();

      // Cleanup
      await page.getByRole("button").filter({ has: page.locator(".lucide-trash-2") }).first().click();
    });

    test("applying a range greater than 30 days shows warning icon, not error text", async ({ page }) => {
      await page.goto("/weight");
      await waitForHydration(page);

      const todayDate = new Date();
      const thirtyOneAgo = new Date();
      thirtyOneAgo.setDate(todayDate.getDate() - 31);

      await page.locator('input[type="date"]').first().fill(thirtyOneAgo.toLocaleDateString("en-CA"));
      await page.locator('input[type="date"]').last().fill(todayDate.toLocaleDateString("en-CA"));

      await expect(page.locator('[data-testid="range-error-icon"]')).toBeVisible();
      await expect(page.getByText("Date range must not exceed 30 days")).not.toBeVisible();
    });

    test("chart is visible and updates when date range changes", async ({ page }) => {
      await page.goto("/weight");
      await waitForHydration(page);

      // Log a weight entry so the chart is visible
      await page.getByRole("spinbutton").fill("160");
      await page.getByRole("button", { name: "Log Weight" }).click();
      await waitForHydration(page);

      await expect(page.locator(".recharts-responsive-container")).toBeVisible();

      // Apply a date range that includes today via debounce
      const todayStr = new Date().toLocaleDateString("en-CA");
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      await page.locator('input[type="date"]').first().fill(twoDaysAgo.toLocaleDateString("en-CA"));
      await page.locator('input[type="date"]').last().fill(todayStr);

      // Wait for debounce + query
      await page.waitForTimeout(600);
      await waitForHydration(page);

      await expect(page.locator(".recharts-responsive-container")).toBeVisible();

      // Cleanup
      await page.getByRole("button").filter({ has: page.locator(".lucide-trash-2") }).first().click();
    });

    test("reset restores default date range", async ({ page }) => {
      await page.goto("/weight");
      await waitForHydration(page);

      const todayDate = new Date();
      const thirtyOneAgo = new Date();
      thirtyOneAgo.setDate(todayDate.getDate() - 31);

      await page.locator('input[type="date"]').first().fill(thirtyOneAgo.toLocaleDateString("en-CA"));
      await page.locator('input[type="date"]').last().fill(todayDate.toLocaleDateString("en-CA"));
      await expect(page.locator('[data-testid="range-error-icon"]')).toBeVisible();

      await page.getByRole("button", { name: "Reset" }).click();
      await waitForHydration(page);

      await expect(page.locator('[data-testid="range-error-icon"]')).not.toBeVisible();

      const startDefault = new Date();
      startDefault.setDate(todayDate.getDate() - 29);
      const fmt = (d: Date) => d.toLocaleDateString("en-CA");

      await expect(page.locator('input[type="date"]').first()).toHaveValue(fmt(startDefault));
      await expect(page.locator('input[type="date"]').last()).toHaveValue(fmt(todayDate));
    });

    test("URL params restore filtered view on reload", async ({ page }) => {
      const todayStr = new Date().toLocaleDateString("en-CA");
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const fromStr = twoDaysAgo.toLocaleDateString("en-CA");

      await page.goto(`/weight?from=${fromStr}&to=${todayStr}&page=1`);
      await waitForHydration(page);

      await expect(page.locator('input[type="date"]').first()).toHaveValue(fromStr);
      await expect(page.locator('input[type="date"]').last()).toHaveValue(todayStr);
    });
  });

  test("validation: rejects invalid weight values", async ({ page }) => {
    await page.goto("/weight");
    await waitForHydration(page);

    await page.fill('input[type="number"]', "-5");
    await page.getByRole("button", { name: "Log Weight" }).click();
    await expect(page.getByText("Must be greater than 0")).toBeVisible();

    await page.fill('input[type="number"]', "500");
    await page.getByRole("button", { name: "Log Weight" }).click();
    await expect(page.getByText("Must be 320 or less")).toBeVisible();
  });
});
