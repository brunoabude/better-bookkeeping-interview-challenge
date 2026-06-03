import { test, expect } from "@playwright/test";
import { waitForHydration } from "./shared";

test.describe("Movements", () => {
  test.describe("create", () => {
    test("should create a new movement with a valid name", async ({ page }) => {
      const movementName = `TestMovement-${Date.now()}`;
      await page.goto("/movements");
      await waitForHydration(page);
      await page.getByPlaceholder("Movement name (e.g. Bench Press)").fill(movementName);
      await page.getByRole("button", { name: "Add" }).click();
      await expect(page.locator("li").filter({ hasText: movementName })).toBeVisible();
    });

    test("should show the new movement in the movements list", async ({ page }) => {
      const movementName = `ListTest-${Date.now()}`;
      await page.goto("/movements");
      await waitForHydration(page);
      await page.getByPlaceholder("Movement name (e.g. Bench Press)").fill(movementName);
      await page.getByRole("button", { name: "Add" }).click();
      await expect(page.locator("ul").filter({ has: page.locator("li").filter({ hasText: movementName }) })).toBeVisible();
    });

    test("should clear the input after creating a movement", async ({ page }) => {
      const movementName = `ClearTest-${Date.now()}`;
      await page.goto("/movements");
      await waitForHydration(page);
      const input = page.getByPlaceholder("Movement name (e.g. Bench Press)");
      await input.fill(movementName);
      await page.getByRole("button", { name: "Add" }).click();
      await expect(page.locator("li").filter({ hasText: movementName })).toBeVisible();
      await expect(input).toHaveValue("");
    });
  });

  test.describe("read", () => {
    test("should display all movements on the movements page", async ({ page }) => {
      await page.goto("/movements");
      await waitForHydration(page);
      await expect(page.getByRole("heading", { name: "Movements", exact: true })).toBeVisible();
    });

    test("should show movements sorted alphabetically", async ({ page }) => {
      const ts = Date.now();
      const nameZ = `Zzz-${ts}`;
      const nameA = `Aaa-${ts}`;
      await page.goto("/movements");
      await waitForHydration(page);

      // Create Zzz (sorts last) and capture its page
      await page.getByPlaceholder("Movement name (e.g. Bench Press)").fill(nameZ);
      await page.getByRole("button", { name: "Add" }).click();
      await expect(page.locator("li").filter({ hasText: nameZ })).toBeVisible();
      const zPage = Number(new URL(page.url()).searchParams.get("page") ?? "1");

      // Create Aaa (sorts first) and capture its page
      await page.getByPlaceholder("Movement name (e.g. Bench Press)").fill(nameA);
      await page.getByRole("button", { name: "Add" }).click();
      await expect(page.locator("li").filter({ hasText: nameA })).toBeVisible();
      const aPage = Number(new URL(page.url()).searchParams.get("page") ?? "1");

      if (aPage === zPage) {
        // Both on same page — verify positional order within visible items
        const texts = await page.locator("ul li").allTextContents();
        const aIdx = texts.findIndex((t) => t.includes(nameA));
        const zIdx = texts.findIndex((t) => t.includes(nameZ));
        expect(aIdx).toBeGreaterThanOrEqual(0);
        expect(zIdx).toBeGreaterThanOrEqual(0);
        expect(aIdx).toBeLessThan(zIdx);
      } else {
        // On different pages — Aaa's page must be before Zzz's page
        expect(aPage).toBeLessThan(zPage);
      }
    });
  });

  test.describe("delete", () => {
    // TODO: The movements UI does not expose a delete button. These tests should be
    // implemented once movement deletion is added to the movements page.
    test.skip("should delete an existing movement", async () => {});

    test.skip("should remove the movement from the list after deletion", async () => {});
  });
});
