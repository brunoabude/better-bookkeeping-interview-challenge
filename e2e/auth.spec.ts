import { test, expect } from "@playwright/test";
import { waitForHydration } from "./shared";

const BASE_EMAIL = `auth-test-${Date.now()}@test.local`;
const BASE_PASSWORD = "testpass123";
const UPDATED_PASSWORD = "newpass456";
const TEST_NAME = "Auth Test User";

test.describe("auth — password hashing", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("creates account and signs in with correct password", async ({ page }) => {
    const email = `create-${BASE_EMAIL}`;

    await page.goto("/create-account");
    await waitForHydration(page);
    await page.getByRole("textbox", { name: "Name" }).fill(TEST_NAME);
    await page.getByRole("textbox", { name: "Email" }).fill(email);
    await page.getByRole("textbox", { name: "Password" }).fill(BASE_PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();

    await page.waitForURL(/(current-workout|weight|workout-history|movements)/, { timeout: 15_000 });

    await page.goto("/logout");
    await page.waitForURL("/sign-in", { timeout: 10_000 });
    await waitForHydration(page);

    await page.getByRole("textbox", { name: "Email" }).fill(email);
    await page.getByRole("textbox", { name: "Password" }).fill(BASE_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await page.waitForURL(/(current-workout|weight|workout-history|movements)/, { timeout: 10_000 });
    await expect(page).not.toHaveURL("/sign-in");
  });

  test("rejects sign-in with wrong password", async ({ page }) => {
    const email = `reject-${BASE_EMAIL}`;

    await page.goto("/create-account");
    await waitForHydration(page);
    await page.getByRole("textbox", { name: "Name" }).fill(TEST_NAME);
    await page.getByRole("textbox", { name: "Email" }).fill(email);
    await page.getByRole("textbox", { name: "Password" }).fill(BASE_PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL(/(current-workout|weight|workout-history|movements)/, { timeout: 15_000 });

    await page.goto("/logout");
    await page.waitForURL("/sign-in", { timeout: 10_000 });
    await waitForHydration(page);

    await page.getByRole("textbox", { name: "Email" }).fill(email);
    await page.getByRole("textbox", { name: "Password" }).fill("wrongpassword");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Invalid email or password")).toBeVisible({ timeout: 5_000 });
    await expect(page).toHaveURL("/sign-in");
  });

  test("password update: new password works, old password does not", async ({ page }) => {
    const email = `update-${BASE_EMAIL}`;

    await page.goto("/create-account");
    await waitForHydration(page);
    await page.getByRole("textbox", { name: "Name" }).fill(TEST_NAME);
    await page.getByRole("textbox", { name: "Email" }).fill(email);
    await page.getByRole("textbox", { name: "Password" }).fill(BASE_PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL(/(current-workout|weight|workout-history|movements)/, { timeout: 15_000 });
    await waitForHydration(page);

    await page.goto("/change-password");
    await waitForHydration(page);
    await page.getByLabel("Current password", { exact: true }).fill(BASE_PASSWORD);
    await page.getByLabel("New password", { exact: true }).fill(UPDATED_PASSWORD);
    await page.getByLabel("Confirm new password", { exact: true }).fill(UPDATED_PASSWORD);
    await page.getByRole("button", { name: "Update password" }).click();
    await page.waitForURL(/(current-workout|weight|workout-history|movements)/, { timeout: 10_000 });

    await page.goto("/logout");
    await page.waitForURL("/sign-in", { timeout: 10_000 });
    await waitForHydration(page);

    await page.getByRole("textbox", { name: "Email" }).fill(email);
    await page.getByRole("textbox", { name: "Password" }).fill(UPDATED_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/(current-workout|weight|workout-history|movements)/, { timeout: 10_000 });
    await expect(page).not.toHaveURL("/sign-in");

    await page.goto("/logout");
    await page.waitForURL("/sign-in", { timeout: 10_000 });
    await waitForHydration(page);

    await page.getByRole("textbox", { name: "Email" }).fill(email);
    await page.getByRole("textbox", { name: "Password" }).fill(BASE_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Invalid email or password")).toBeVisible({ timeout: 5_000 });
    await expect(page).toHaveURL("/sign-in");
  });
});
