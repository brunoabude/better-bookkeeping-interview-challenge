# Quickstart: Running E2E Tests (After Implementation)

**Feature**: 004-e2e-test-reliability  
**Date**: 2026-05-24

---

## Prerequisites

1. **Docker running** with the dev stack: `bun run dev:docker`
2. **Test database created** (one-time setup):
   ```bash
   # Connect to the running Postgres container and create the test DB
   docker exec -it demo-project-db psql -U postgres -c "CREATE DATABASE demo_project_test;"
   # If the DB already exists this will print an error — that is fine, ignore it.
   ```
3. **Environment configured**: copy `.env.test.example` to `.env.test` (created as part of this feature):
   ```bash
   cp .env.test.example .env.test
   ```
   The defaults work out-of-the-box for local Docker development. Override `E2E_TEST_PASSWORD` if needed.

---

## Running Tests

```bash
# Full suite (uses global setup: DB reset + auth creation)
bun run test

# With Playwright UI (interactive mode)
bun run test:ui

# Single file
bunx playwright test e2e/movements.spec.ts

# Headed mode (see the browser)
bunx playwright test --headed
```

---

## How It Works

1. **Global setup** (`e2e/global-setup.ts`) runs first:
   - Resets the test database to a clean state
   - Creates the `e2e-test@better-bookkeeping.test` user
   - Logs in via the browser and saves session to `e2e/.auth/user.json`

2. **Each test** starts with the saved session already loaded — no login page interaction.

3. **Tests that need a fresh/anonymous user** use `page.context()` isolation and navigate to `/logout` before proceeding.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `Error: Cannot connect to database` | Test DB not created or Docker not running | Run prerequisite steps above |
| `Auth state file not found` | globalSetup failed | Check Playwright output for login errors; verify the app is running on port 3000 |
| Tests fail with `Timeout exceeded` | App not running or hydration slower than 15s | Ensure `bun run dev:docker` is up; check logs |
| `ERROR: database "demo_project_test" already exists` | DB already created | Safe to ignore — it means the one-time setup was done before |

---

## CI Configuration

Set these environment variables in CI:

```
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5432/demo_project_test
E2E_TEST_PASSWORD=<secret>
```

The Playwright config reads `CI=true` from GitHub Actions automatically to set `workers: 1` and `retries: 1`.
