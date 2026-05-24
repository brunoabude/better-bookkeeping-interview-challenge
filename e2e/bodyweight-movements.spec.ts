import { test, expect } from "@playwright/test";
import { waitForHydration, signInOrCreate, TEST_PASSWORD } from "./shared";

test.describe("Body-Weight Movement flag (US1)", () => {
  test("can flag a movement as body-weight on creation and badge appears in list", async ({ page }) => {
    const movementName = `Pull-ups-${Date.now()}`;

    await page.goto("/movements");
    await waitForHydration(page);

    await page.getByPlaceholder("Movement name (e.g. Bench Press)").fill(movementName);

    await page.getByRole("switch").click();
    await expect(page.getByRole("switch")).toHaveAttribute("aria-checked", "true");

    await page.getByRole("button", { name: "Add" }).click();

    const movementItem = page.locator("li").filter({ hasText: movementName });
    await expect(movementItem).toBeVisible();
    await expect(movementItem.getByText("Body Weight")).toBeVisible();

    await expect(page.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  test("non-body-weight movement has no badge", async ({ page }) => {
    const movementName = `Bench-Press-${Date.now()}`;

    await page.goto("/movements");
    await waitForHydration(page);

    await page.getByPlaceholder("Movement name (e.g. Bench Press)").fill(movementName);
    await page.getByRole("button", { name: "Add" }).click();

    const movementItem = page.locator("li").filter({ hasText: movementName });
    await expect(movementItem).toBeVisible();
    await expect(movementItem.getByText("Body Weight")).not.toBeVisible();
  });
});

test.describe("Auto-fill weight in workout (US2)", () => {
  test("pre-fills weight field when body-weight movement selected and weight is logged", async ({ page }) => {
    const bwMovementName = `BW-AutoFill-${Date.now()}`;
    await page.goto("/movements");
    await waitForHydration(page);
    await page.getByPlaceholder("Movement name (e.g. Bench Press)").fill(bwMovementName);
    await page.getByRole("switch").click();
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.locator("li").filter({ hasText: bwMovementName })).toBeVisible();

    await page.goto("/weight");
    await waitForHydration(page);
    await page.fill('input[type="number"]', "72");
    await page.getByRole("button", { name: "Log Weight" }).click();
    await expect(page.getByText("72 lbs")).toBeVisible();

    await page.goto("/current-workout");
    await waitForHydration(page);

    const startButton = page.getByRole("button", { name: "Start Workout" });
    if (await startButton.isVisible()) {
      await startButton.click();
      await waitForHydration(page);
    }

    await page.getByRole("combobox").selectOption({ label: bwMovementName });

    const weightInput = page.locator('input[placeholder="Weight"]');
    await expect(weightInput).toHaveValue("72");
  });

  test("non-body-weight movement does not auto-fill weight", async ({ page }) => {
    const regularMovementName = `Regular-${Date.now()}`;
    await page.goto("/movements");
    await waitForHydration(page);
    await page.getByPlaceholder("Movement name (e.g. Bench Press)").fill(regularMovementName);
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.locator("li").filter({ hasText: regularMovementName })).toBeVisible();

    await page.goto("/current-workout");
    await waitForHydration(page);

    const startButton = page.getByRole("button", { name: "Start Workout" });
    if (await startButton.isVisible()) {
      await startButton.click();
      await waitForHydration(page);
    }

    await page.getByRole("combobox").selectOption({ label: regularMovementName });

    const weightInput = page.locator('input[placeholder="Weight"]');
    await expect(weightInput).toHaveValue("");
  });

  test.describe("fresh account — no weight logged", () => {
    test.use({ storageState: undefined });

    test("shows hint when body-weight movement selected but no weight logged", async ({ page }) => {
      test.setTimeout(60000);
      await page.goto("/logout");
      await page.waitForURL("/sign-in");
      const freshEmail = `e2e-no-weight-${Date.now()}@test.com`;
      await signInOrCreate(page, freshEmail, TEST_PASSWORD, "Fresh User");

      const bwMovementName = `BW-NoWeight-${Date.now()}`;
      await page.goto("/movements");
      await waitForHydration(page);
      await page.getByPlaceholder("Movement name (e.g. Bench Press)").fill(bwMovementName);
      await page.getByRole("switch").click();
      await page.getByRole("button", { name: "Add" }).click();
      await expect(page.locator("li").filter({ hasText: bwMovementName })).toBeVisible();

      await page.goto("/current-workout");
      await waitForHydration(page);

      const startButton = page.getByRole("button", { name: "Start Workout" });
      if (await startButton.isVisible()) {
        await startButton.click();
        await waitForHydration(page);
      }

      await page.getByRole("combobox").selectOption({ label: bwMovementName });

      const weightInput = page.locator('input[placeholder="Weight"]');
      await expect(weightInput).toHaveValue("");

      await expect(page.getByText("Log your body weight")).toBeVisible();
    });
  });
});

test.describe("Edit movement body-weight flag (US3)", () => {
  test("can enable body-weight flag on existing movement and badge appears", async ({ page }) => {
    const movementName = `Edit-Flag-${Date.now()}`;

    await page.goto("/movements");
    await waitForHydration(page);

    await page.getByPlaceholder("Movement name (e.g. Bench Press)").fill(movementName);
    await page.getByRole("button", { name: "Add" }).click();
    const movementItem = page.locator("li").filter({ hasText: movementName });
    await expect(movementItem).toBeVisible();
    await expect(movementItem.getByText("Body Weight")).not.toBeVisible();

    await movementItem.getByRole("button", { name: "Edit" }).click();

    const editSwitch = movementItem.getByRole("switch");
    await expect(editSwitch).toHaveAttribute("aria-checked", "false");
    await editSwitch.click();
    await expect(editSwitch).toHaveAttribute("aria-checked", "true");

    await movementItem.getByRole("button", { name: "Save" }).click();

    await expect(movementItem.getByText("Body Weight")).toBeVisible();
  });

  test("can disable body-weight flag on existing movement and badge disappears", async ({ page }) => {
    const movementName = `Disable-Flag-${Date.now()}`;

    await page.goto("/movements");
    await waitForHydration(page);

    await page.getByPlaceholder("Movement name (e.g. Bench Press)").fill(movementName);
    await page.getByRole("switch").click();
    await page.getByRole("button", { name: "Add" }).click();
    const movementItem = page.locator("li").filter({ hasText: movementName });
    await expect(movementItem.getByText("Body Weight")).toBeVisible();

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
    await waitForHydration(page);

    await page.getByPlaceholder("Movement name (e.g. Bench Press)").fill(movementName);
    await page.getByRole("button", { name: "Add" }).click();
    const movementItem = page.locator("li").filter({ hasText: movementName });
    await expect(movementItem).toBeVisible();

    await movementItem.getByRole("button", { name: "Edit" }).click();
    await movementItem.getByRole("switch").click();
    await movementItem.getByRole("button", { name: "Cancel" }).click();

    await expect(movementItem.getByText("Body Weight")).not.toBeVisible();
    await expect(movementItem.getByRole("button", { name: "Edit" })).toBeVisible();
  });
});
