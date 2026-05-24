import { Page } from "@playwright/test";

export const TEST_EMAIL = "e2e-test@better-bookkeeping.test";
export const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? "password123";
export const TEST_NAME = "E2E Test User";

export async function waitForHydration(page: Page): Promise<void> {
  await page.locator("[data-hydrated='true']").waitFor({ state: "attached", timeout: 15_000 });
}

export async function signInOrCreate(page: Page, email: string, password: string, name: string): Promise<void> {
  await page.goto("/sign-in");
  await waitForHydration(page);
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  const loginSucceeded = await page
    .waitForURL("/current-workout", { timeout: 5000 })
    .then(() => true)
    .catch(() => false);

  if (!loginSucceeded) {
    await page.goto("/create-account");
    await waitForHydration(page);
    await page.getByRole("textbox", { name: "Name" }).fill(name);
    await page.getByRole("textbox", { name: "Email" }).fill(email);
    await page.getByRole("textbox", { name: "Password" }).fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
  }

  await page.waitForURL(/(current-workout|weight|workout-history|movements)/);
}
