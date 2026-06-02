# Quickstart: Argon2 Password Hashing

## Running the development environment

```bash
# Start full Docker dev environment (app on port 3200, Postgres included)
bun run dev:docker
```

## Manual testing checklist

After the feature is implemented:

1. **Account creation** — go to `http://localhost:3200/create-account`, register a new account, confirm redirect to `/current-workout`.
2. **Sign-in success** — sign out, sign in with the correct password; confirm redirect.
3. **Sign-in failure** — sign in with a wrong password; confirm error message, no redirect.
4. **Password update** — sign in, navigate to `http://localhost:3200/change-password`, change password, sign out, sign in with new password (success), sign in with old password (failure).
5. **Verify hash storage** — connect to Postgres and confirm `password` column starts with `$argon2id$`:

```bash
# From host (adjust container name as needed)
docker exec -it better-bookkeeping-db-1 psql -U postgres -d bookkeeping \
  -c "SELECT email, LEFT(password, 25) AS password_prefix FROM \"User\";"
# Expected output: $argon2id$v=19$m=6...
```

## Running automated tests

```bash
# Unit tests (Vitest)
bun run test

# E2e tests — requires dev environment running on port 3000
bunx playwright test e2e/auth.spec.ts --project=chromium
```

## Key files changed by this feature

| File | Change |
|------|--------|
| `src/lib/auth.server.ts` | Add `hashPassword`/`verifyPassword` helpers; update `createAccountServerFn` and `signInServerFn`; add `updatePasswordServerFn` |
| `src/routes/change-password.tsx` | New protected route for the password-change UI |
| `e2e/auth.spec.ts` | New Playwright test file covering auth happy paths |
| `prisma/schema.prisma` | Unchanged |

## No new environment variables

Bun's `Bun.password` API uses fixed secure defaults. No configuration is required.
