import { chromium, FullConfig } from "@playwright/test";
import { TEST_EMAIL, TEST_PASSWORD, TEST_NAME, waitForHydration } from "./shared";
import path from "path";

export default async function globalSetup(_config: FullConfig): Promise<void> {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Sign in if the test user already exists (subsequent runs), create it otherwise.
  await page.goto("http://localhost:3000/sign-in");
  await waitForHydration(page);
  await page.getByRole("textbox", { name: "Email" }).fill(TEST_EMAIL);
  await page.getByRole("textbox", { name: "Password" }).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  const signedIn = await page
    .waitForURL(/current-workout/, { timeout: 5000 })
    .then(() => true)
    .catch(() => false);

  if (!signedIn) {
    await page.goto("http://localhost:3000/create-account");
    await waitForHydration(page);
    await page.getByRole("textbox", { name: "Name" }).fill(TEST_NAME);
    await page.getByRole("textbox", { name: "Email" }).fill(TEST_EMAIL);
    await page.getByRole("textbox", { name: "Password" }).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL(/current-workout/, { timeout: 15_000 });
  }

  const authFile = path.join(process.cwd(), "e2e", ".auth", "user.json");
  await context.storageState({ path: authFile });

  await browser.close();
}
