import { chromium, FullConfig } from "@playwright/test";
import { TEST_EMAIL, TEST_PASSWORD, TEST_NAME, waitForHydration } from "./shared";
import path from "path";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { Client } from "pg";

// Load .env.test if DATABASE_URL_TEST is not already in the environment.
// Bun does not auto-load .env.test unless NODE_ENV=test.
function loadEnvTest() {
  try {
    const content = readFileSync(path.join(process.cwd(), ".env.test"), "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    // No .env.test file — DATABASE_URL_TEST must be set externally (e.g. CI).
  }
}

loadEnvTest();

async function setupTestDatabase(): Promise<void> {
  const testDbUrl = process.env.DATABASE_URL_TEST;
  if (!testDbUrl) {
    throw new Error("DATABASE_URL_TEST is not set. Copy .env.test.example to .env.test and fill in the values.");
  }

  // Parse the test DB URL to get the database name and connect to the admin 'postgres' db
  const testDbUrlParsed = new URL(testDbUrl);
  const testDbName = testDbUrlParsed.pathname.replace(/^\//, "");
  const adminUrl = new URL(testDbUrl);
  adminUrl.pathname = "/postgres";

  // Create the test database if it doesn't exist
  const adminClient = new Client({ connectionString: adminUrl.toString() });
  await adminClient.connect();
  const exists = await adminClient.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [testDbName],
  );
  if (exists.rowCount === 0) {
    await adminClient.query(`CREATE DATABASE "${testDbName}"`);
  }
  await adminClient.end();

  // Apply all Prisma migrations against the test DB
  execSync("bunx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: testDbUrl },
    stdio: "inherit",
  });

  // Truncate all tables for a clean slate
  const testClient = new Client({ connectionString: testDbUrl });
  await testClient.connect();
  await testClient.query(
    `TRUNCATE "User", "Workout", "Set", "Movement", "WeightEntry" RESTART IDENTITY CASCADE`,
  );
  await testClient.end();

  console.log(`[global-setup] test DB truncated: ${testDbName}`);
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  await setupTestDatabase();

  // Derive baseURL from the playwright config so we connect to the right port
  // regardless of whether the app is running behind Docker (port 3000) or locally (port 3902).
  const baseURL = config.projects[0]?.use?.baseURL ?? "http://localhost:3000";

  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  // Sign in if the test user already exists (subsequent runs), create it otherwise.
  await page.goto(`${baseURL}/sign-in`);
  await waitForHydration(page);
  await page.getByRole("textbox", { name: "Email" }).fill(TEST_EMAIL);
  await page.getByRole("textbox", { name: "Password" }).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  const signedIn = await page
    .waitForURL(/current-workout/, { timeout: 5000 })
    .then(() => true)
    .catch(() => false);

  if (!signedIn) {
    await page.goto(`${baseURL}/create-account`);
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
