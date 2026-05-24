import { test, expect, Browser } from "@playwright/test";
import path from "path";
import { waitForHydration } from "./shared";

const AUTH_FILE = path.join(process.cwd(), "e2e", ".auth", "user.json");
let testMovementName: string;

async function withAuthPage(browser: Browser, fn: (page: import("@playwright/test").Page) => Promise<void>) {
  const context = await browser.newContext({ storageState: AUTH_FILE });
  const page = await context.newPage();
  try {
    await fn(page);
  } finally {
    await context.close();
  }
}

test.beforeAll(async ({ browser }) => {
  await withAuthPage(browser, async (page) => {
    await page.goto("http://localhost:3000/current-workout");
    await waitForHydration(page);

    const completeBtn = page.getByRole("button", { name: "Complete Workout" });
    if (await completeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await completeBtn.click();
      await waitForHydration(page);
    }

    await page.getByRole("button", { name: "Start Workout" }).click();
    await waitForHydration(page);

    testMovementName = `TestMovement-${Date.now()}`;
    await page.goto("http://localhost:3000/movements");
    await waitForHydration(page);
    await page.getByPlaceholder("Movement name (e.g. Bench Press)").fill(testMovementName);
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.locator("li").filter({ hasText: testMovementName })).toBeVisible();
  });
});

test.afterAll(async ({ browser }) => {
  await withAuthPage(browser, async (page) => {
    await page.goto("http://localhost:3000/current-workout");
    await waitForHydration(page);
    const completeBtn = page.getByRole("button", { name: "Complete Workout" });
    if (await completeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await completeBtn.click();
      await waitForHydration(page);
    }
  });
});

test.describe("Sets", () => {
  test.describe("create", () => {
    test("should add a set to the current workout", async ({ page }) => {
      await page.goto("/current-workout");
      await waitForHydration(page);

      const rowsBefore = await page.locator("ul li").count();

      await page.getByRole("combobox").selectOption({ label: testMovementName });
      await page.locator('input[placeholder="Weight"]').fill("100");
      await page.locator('input[placeholder="Reps"]').fill("5");
      await page.getByRole("button", { name: "Add" }).click();

      await expect(page.locator("ul li")).toHaveCount(rowsBefore + 1);

      // Cleanup
      const newRow = page.locator("ul li").last();
      await newRow.getByRole("button").click();
      await expect(page.locator("ul li")).toHaveCount(rowsBefore);
    });

    test("should require all fields to add a set", async ({ page }) => {
      await page.goto("/current-workout");
      await waitForHydration(page);

      await page.getByRole("combobox").selectOption({ label: testMovementName });
      await page.locator('input[placeholder="Reps"]').fill("5");
      // Leave weight empty

      await expect(page.getByRole("button", { name: "Add" })).toBeDisabled();
    });

    test("should display the new set in the workout", async ({ page }) => {
      await page.goto("/current-workout");
      await waitForHydration(page);

      await page.getByRole("combobox").selectOption({ label: testMovementName });
      await page.locator('input[placeholder="Weight"]').fill("200");
      await page.locator('input[placeholder="Reps"]').fill("10");
      await page.getByRole("button", { name: "Add" }).click();

      const newRow = page.locator("ul li").last();
      await expect(newRow).toContainText(testMovementName);
      await expect(newRow).toContainText("200");
      await expect(newRow).toContainText("10");

      // Cleanup
      await newRow.getByRole("button").click();
      await expect(newRow).not.toBeVisible();
    });
  });

  test.describe("read", () => {
    test("should display sets with movement name, weight, and reps", async ({ page }) => {
      await page.goto("/current-workout");
      await waitForHydration(page);

      await page.getByRole("combobox").selectOption({ label: testMovementName });
      await page.locator('input[placeholder="Weight"]').fill("75");
      await page.locator('input[placeholder="Reps"]').fill("3");
      await page.getByRole("button", { name: "Add" }).click();

      const row = page.locator("ul li").last();
      await expect(row).toContainText(testMovementName);
      await expect(row).toContainText("75");
      await expect(row).toContainText("3");

      // Cleanup
      await row.getByRole("button").click();
      await expect(row).not.toBeVisible();
    });

    test("should show sets in the order they were added", async ({ page }) => {
      await page.goto("/current-workout");
      await waitForHydration(page);

      const countBefore = await page.locator("ul li").count();

      // Add first set
      await page.getByRole("combobox").selectOption({ label: testMovementName });
      await page.locator('input[placeholder="Weight"]').fill("111");
      await page.locator('input[placeholder="Reps"]').fill("1");
      await page.getByRole("button", { name: "Add" }).click();
      await expect(page.locator("ul li")).toHaveCount(countBefore + 1);

      // Add second set
      await page.getByRole("combobox").selectOption({ label: testMovementName });
      await page.locator('input[placeholder="Weight"]').fill("222");
      await page.locator('input[placeholder="Reps"]').fill("2");
      await page.getByRole("button", { name: "Add" }).click();
      await expect(page.locator("ul li")).toHaveCount(countBefore + 2);

      // The first set should appear before the second set
      const firstSet = page.locator("ul li").nth(countBefore);
      const secondSet = page.locator("ul li").nth(countBefore + 1);
      await expect(firstSet).toContainText("111");
      await expect(secondSet).toContainText("222");

      // Cleanup
      await secondSet.getByRole("button").click();
      await firstSet.getByRole("button").click();
    });
  });

  test.describe("delete", () => {
    test("should remove a set from the current workout", async ({ page }) => {
      await page.goto("/current-workout");
      await waitForHydration(page);

      const countBefore = await page.locator("ul li").count();

      await page.getByRole("combobox").selectOption({ label: testMovementName });
      await page.locator('input[placeholder="Weight"]').fill("50");
      await page.locator('input[placeholder="Reps"]').fill("15");
      await page.getByRole("button", { name: "Add" }).click();
      await expect(page.locator("ul li")).toHaveCount(countBefore + 1);

      const newRow = page.locator("ul li").last();
      await newRow.getByRole("button").click();

      await expect(page.locator("ul li")).toHaveCount(countBefore);
    });

    test("should update the sets list after deletion", async ({ page }) => {
      await page.goto("/current-workout");
      await waitForHydration(page);

      const countBefore = await page.locator("ul li").count();

      // Add two sets
      await page.getByRole("combobox").selectOption({ label: testMovementName });
      await page.locator('input[placeholder="Weight"]').fill("60");
      await page.locator('input[placeholder="Reps"]').fill("6");
      await page.getByRole("button", { name: "Add" }).click();

      await page.getByRole("combobox").selectOption({ label: testMovementName });
      await page.locator('input[placeholder="Weight"]').fill("70");
      await page.locator('input[placeholder="Reps"]').fill("7");
      await page.getByRole("button", { name: "Add" }).click();

      await expect(page.locator("ul li")).toHaveCount(countBefore + 2);

      // Delete the first of the two new sets
      const firstNewRow = page.locator("ul li").nth(countBefore);
      await firstNewRow.getByRole("button").click();

      // Only the second new set should remain
      await expect(page.locator("ul li")).toHaveCount(countBefore + 1);
      await expect(page.locator("ul li").last()).toContainText("70");

      // Cleanup
      await page.locator("ul li").last().getByRole("button").click();
    });
  });
});
