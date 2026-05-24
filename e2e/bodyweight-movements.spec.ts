import { test, expect, Page } from "@playwright/test";
import { signInOrCreate, TEST_EMAIL, TEST_NAME, TEST_PASSWORD } from "./shared";

test.describe("Body-Weight Movement flag (US1)", () => {
  test.beforeEach(async ({ page }) => {
    await signInOrCreate(page, TEST_EMAIL, TEST_PASSWORD, TEST_NAME);
  });

  test("can flag a movement as body-weight on creation and badge appears in list", async ({ page }) => {
    const movementName = `Pull-ups-${Date.now()}`;

    await page.goto("/movements");
    await page.waitForLoadState("networkidle");

    await page.getByPlaceholder("Movement name (e.g. Bench Press)").fill(movementName);

    // Enable the body-weight toggle
    await page.getByRole("switch").click();
    await expect(page.getByRole("switch")).toHaveAttribute("aria-checked", "true");

    await page.getByRole("button", { name: "Add" }).click();

    // The new movement appears with the Body Weight badge
    const movementItem = page.locator("li").filter({ hasText: movementName });
    await expect(movementItem).toBeVisible();
    await expect(movementItem.getByText("Body Weight")).toBeVisible();

    // Form is reset (toggle back to off)
    await expect(page.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  test("non-body-weight movement has no badge", async ({ page }) => {
    const movementName = `Bench-Press-${Date.now()}`;

    await page.goto("/movements");
    await page.waitForLoadState("networkidle");

    await page.getByPlaceholder("Movement name (e.g. Bench Press)").fill(movementName);
    // Do NOT enable the switch
    await page.getByRole("button", { name: "Add" }).click();

    const movementItem = page.locator("li").filter({ hasText: movementName });
    await expect(movementItem).toBeVisible();
    await expect(movementItem.getByText("Body Weight")).not.toBeVisible();
  });
});

test.describe("Auto-fill weight in workout (US2)", () => {
  test.beforeEach(async ({ page }) => {
    await signInOrCreate(page, TEST_EMAIL, TEST_PASSWORD, TEST_NAME);
  });

  test("pre-fills weight field when body-weight movement selected and weight is logged", async ({ page }) => {
    // Ensure at least one body-weight movement exists
    const bwMovementName = `BW-AutoFill-${Date.now()}`;
    await page.goto("/movements");
    await page.waitForLoadState("networkidle");
    await page.getByPlaceholder("Movement name (e.g. Bench Press)").fill(bwMovementName);
    await page.getByRole("switch").click();
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.locator("li").filter({ hasText: bwMovementName })).toBeVisible();

    // Log a body weight
    await page.goto("/weight");
    await page.waitForLoadState("networkidle");
    await page.fill('input[type="number"]', "72");
    await page.getByRole("button", { name: "Log Weight" }).click();
    await expect(page.getByText("72 lbs")).toBeVisible();

    // Navigate to current workout (create one if needed)
    await page.goto("/current-workout");
    await page.waitForLoadState("networkidle");

    const startButton = page.getByRole("button", { name: "Start Workout" });
    if (await startButton.isVisible()) {
      await startButton.click();
      await page.waitForLoadState("networkidle");
    }

    // Select the body-weight movement
    await page.getByRole("combobox").selectOption({ label: bwMovementName });

    // Weight field should be pre-filled with 72
    const weightInput = page.locator('input[placeholder="Weight"]');
    await expect(weightInput).toHaveValue("72");
  });

  test("non-body-weight movement does not auto-fill weight", async ({ page }) => {
    const regularMovementName = `Regular-${Date.now()}`;
    await page.goto("/movements");
    await page.waitForLoadState("networkidle");
    await page.getByPlaceholder("Movement name (e.g. Bench Press)").fill(regularMovementName);
    // No toggle — regular movement
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.locator("li").filter({ hasText: regularMovementName })).toBeVisible();

    await page.goto("/current-workout");
    await page.waitForLoadState("networkidle");

    const startButton = page.getByRole("button", { name: "Start Workout" });
    if (await startButton.isVisible()) {
      await startButton.click();
      await page.waitForLoadState("networkidle");
    }

    await page.getByRole("combobox").selectOption({ label: regularMovementName });

    const weightInput = page.locator('input[placeholder="Weight"]');
    await expect(weightInput).toHaveValue("");
  });

  test("shows hint when body-weight movement selected but no weight logged", async ({ page }) => {
    test.setTimeout(60000);
    // Log out first to avoid session-cookie conflict with the shared browser context
    await page.goto("/logout");
    await page.waitForURL("/sign-in");
    // Use a fresh unique account guaranteed to have no weight entries
    const freshEmail = `e2e-no-weight-${Date.now()}@test.com`;
    await signInOrCreate(page, freshEmail, TEST_PASSWORD, "Fresh User");

    // Create a body-weight movement
    const bwMovementName = `BW-NoWeight-${Date.now()}`;
    await page.goto("/movements");
    await page.waitForLoadState("networkidle");
    await page.getByPlaceholder("Movement name (e.g. Bench Press)").fill(bwMovementName);
    await page.getByRole("switch").click();
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.locator("li").filter({ hasText: bwMovementName })).toBeVisible();

    await page.goto("/current-workout");
    await page.waitForLoadState("networkidle");

    const startButton = page.getByRole("button", { name: "Start Workout" });
    if (await startButton.isVisible()) {
      await startButton.click();
      await page.waitForLoadState("networkidle");
    }

    await page.getByRole("combobox").selectOption({ label: bwMovementName });

    // Weight field remains empty
    const weightInput = page.locator('input[placeholder="Weight"]');
    await expect(weightInput).toHaveValue("");

    // Hint text is shown
    await expect(page.getByText("Log your body weight")).toBeVisible();
  });
});

test.describe("Edit movement body-weight flag (US3)", () => {
  test.beforeEach(async ({ page }) => {
    await signInOrCreate(page, TEST_EMAIL, TEST_PASSWORD, TEST_NAME);
  });

  test("can enable body-weight flag on existing movement and badge appears", async ({ page }) => {
    const movementName = `Edit-Flag-${Date.now()}`;

    await page.goto("/movements");
    await page.waitForLoadState("networkidle");

    // Create as non-body-weight
    await page.getByPlaceholder("Movement name (e.g. Bench Press)").fill(movementName);
    await page.getByRole("button", { name: "Add" }).click();
    const movementItem = page.locator("li").filter({ hasText: movementName });
    await expect(movementItem).toBeVisible();
    await expect(movementItem.getByText("Body Weight")).not.toBeVisible();

    // Click edit
    await movementItem.getByRole("button", { name: "Edit" }).click();

    // Toggle should be off; enable it
    const editSwitch = movementItem.getByRole("switch");
    await expect(editSwitch).toHaveAttribute("aria-checked", "false");
    await editSwitch.click();
    await expect(editSwitch).toHaveAttribute("aria-checked", "true");

    // Save
    await movementItem.getByRole("button", { name: "Save" }).click();

    // Badge should now appear
    await expect(movementItem.getByText("Body Weight")).toBeVisible();
  });

  test("can disable body-weight flag on existing movement and badge disappears", async ({ page }) => {
    const movementName = `Disable-Flag-${Date.now()}`;

    await page.goto("/movements");
    await page.waitForLoadState("networkidle");

    // Create as body-weight
    await page.getByPlaceholder("Movement name (e.g. Bench Press)").fill(movementName);
    await page.getByRole("switch").click();
    await page.getByRole("button", { name: "Add" }).click();
    const movementItem = page.locator("li").filter({ hasText: movementName });
    await expect(movementItem.getByText("Body Weight")).toBeVisible();

    // Edit and disable
    await movementItem.getByRole("button", { name: "Edit" }).click();
    const editSwitch = movementItem.getByRole("switch");
    await expect(editSwitch).toHaveAttribute("aria-checked", "true");
    await editSwitch.click();
    await movementItem.getByRole("button", { name: "Save" }).click();

    await expect(movementItem.getByText("Body Weight")).not.toBeVisible();
  });

  test("cancel edit discards changes", async ({ page }) => {
    const movementName = `Cancel-Edit-${Date.now()}`;

    await page.goto("/movements");
    await page.waitForLoadState("networkidle");

    await page.getByPlaceholder("Movement name (e.g. Bench Press)").fill(movementName);
    await page.getByRole("button", { name: "Add" }).click();
    const movementItem = page.locator("li").filter({ hasText: movementName });
    await expect(movementItem).toBeVisible();

    await movementItem.getByRole("button", { name: "Edit" }).click();
    await movementItem.getByRole("switch").click();
    await movementItem.getByRole("button", { name: "Cancel" }).click();

    // Badge should NOT appear — change was discarded
    await expect(movementItem.getByText("Body Weight")).not.toBeVisible();
    // Edit button should be visible again
    await expect(movementItem.getByRole("button", { name: "Edit" })).toBeVisible();
  });
});
