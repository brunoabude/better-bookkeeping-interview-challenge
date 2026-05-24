import { test, expect } from "@playwright/test";

const TEST_EMAIL = "e2e-weight@test.com";
const TEST_PASSWORD = "password123";
const TEST_NAME = "E2E Weight User";

test.describe("Weight Tracking", () => {
  test.beforeEach(async ({ page }) => {
// Try to sign in; if that fails, create an account first
  await page.goto("/sign-in");
  await page.waitForLoadState("networkidle");
  await page.getByRole("textbox", { name: "Email" }).fill(TEST_EMAIL);
  await page.getByRole("textbox", { name: "Password" }).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  // Sign-in uses an async fetch + client-side navigate, so page.url() is not
  // reliable immediately after click. Wait for navigation instead.
  const loginSucceeded = await page
    .waitForURL("/current-workout", { timeout: 5000 })
    .then(() => true)
    .catch(() => false);

  if (!loginSucceeded) {
    await page.goto("/create-account");
    await page.waitForLoadState("networkidle");

    await page.getByRole("textbox", { name: "Name" }).fill(TEST_NAME);
    await page.getByRole("textbox", { name: "Email" }).fill(TEST_EMAIL);
    await page.getByRole("textbox", { name: "Password" }).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
  }

  await page.waitForURL(/(current-workout|weight|workout-history|movements)/);
  });

  test("happy path: log weight, view chart, delete entry", async ({ page }) => {
    // Navigate to Weight via sidebar
    await page.goto("/weight");
    await page.waitForLoadState("networkidle");
    
    await expect(page.getByRole("heading", { name: "Weight Tracking" })).toBeVisible();

    // Log a weight value
    await page.getByRole("spinbutton").fill("175");
    await page.getByRole("button", { name: "Log Weight" }).click();

    // Verify entry appears in the list
    await expect(page.getByText("175 lbs")).toBeVisible();

    // Verify chart renders (ResponsiveContainer wraps an svg)
    await expect(page.locator(".recharts-responsive-container")).toBeVisible();

    // Delete the entry
    await page.getByRole("button").filter({ has: page.locator(".lucide-trash-2") }).first().click();

    // Verify entry is removed and empty state shows
    await expect(page.getByText("No weight entries yet")).toBeVisible();

    // Chart should be hidden when no entries
    await expect(page.locator(".recharts-responsive-container")).not.toBeVisible();
  });

  test("Weight link appears in sidebar", async ({ page }) => {
    await page.goto("/current-workout");
    await expect(page.getByRole("link", { name: "Weight" })).toBeVisible();
    await page.getByRole("link", { name: "Weight" }).click();
    await expect(page).toHaveURL("/weight");
  });

  test("upsert: logging weight for same day updates existing entry", async ({ page }) => {
    await page.goto("/weight");
    await page.waitForLoadState("networkidle");

    // Log first value
    await page.fill('input[type="number"]', "180");
    await page.getByRole("button", { name: "Log Weight" }).click();

    await expect(page.getByText("180 lbs")).toBeVisible();

    // Log again — should update, not duplicate
    await page.fill('input[type="number"]', "182");
    await page.getByRole("button", { name: "Log Weight" }).click();

    await expect(page.getByText("182 lbs")).toBeVisible();

    // Only one entry should exist
    const entries = page.locator("text=/\\d+ lbs/");
    await expect(entries).toHaveCount(1);

    // Cleanup
    await page.getByRole("button").filter({ has: page.locator(".lucide-trash-2") }).first().click();
  });

  test("validation: rejects invalid weight values", async ({ page }) => {
    await page.goto("/weight");
    await page.waitForLoadState("networkidle");

    // Negative value
    await page.fill('input[type="number"]', "-5");
    await page.getByRole("button", { name: "Log Weight" }).click();
    await expect(page.getByText("Must be greater than 0")).toBeVisible();

    // Value over 320
    await page.fill('input[type="number"]', "500");
    await page.getByRole("button", { name: "Log Weight" }).click();
    await expect(page.getByText("Must be 320 or less")).toBeVisible();
  });
});
