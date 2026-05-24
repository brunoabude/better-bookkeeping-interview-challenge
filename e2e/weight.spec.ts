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
