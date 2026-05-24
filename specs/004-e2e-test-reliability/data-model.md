# Data Model: E2E Test Suite Reliability & Completeness

**Feature**: 004-e2e-test-reliability  
**Date**: 2026-05-24

---

This feature does not introduce new application data models. It modifies the test infrastructure and testing strategy only. The entities below describe the test-layer data concepts that the implementation must manage.

---

## Test Infrastructure Entities

### AuthState

Represents the persisted browser session created during global setup. Stored as a JSON file on disk in the Playwright format.

| Field | Type | Description |
|---|---|---|
| `cookies` | `Cookie[]` | Session cookies captured after successful login |
| `origins` | `Origin[]` | localStorage/sessionStorage state per origin |

**Storage location**: `e2e/.auth/user.json`  
**Lifecycle**: Created once per test run in `globalSetup`; consumed by every test that requires authentication; deleted on next `globalSetup` run.  
**Gitignore**: Yes — must not be committed.

---

### TestUser

The single designated test account used for all authenticated tests. Defined as constants in `e2e/shared.ts`.

| Field | Value |
|---|---|
| `email` | `e2e-test@better-bookkeeping.test` |
| `password` | Read from `E2E_TEST_PASSWORD` env variable (default: `password123` for local dev) |
| `name` | `E2E Test User` |

**Note**: All five current spec files that use authentication will migrate to this single user. The previous per-file emails (`e2e-bodyweight@test.com`, `e2e-progression@test.com`) are eliminated.

---

### TestDatabase

The isolated database used exclusively by the test suite.

| Field | Description |
|---|---|
| `connection` | Configured via `DATABASE_URL_TEST` environment variable |
| `default value` | `postgresql://postgres:postgres@localhost:5432/demo_project_test` |
| `reset mechanism` | `prisma db push --force-reset` run in `globalSetup` before any test |
| `creation` | Manual one-time: `createdb demo_project_test` or `CREATE DATABASE demo_project_test;` |

**State at test start**: Empty schema — all tables exist but contain no rows, except the test user created by `globalSetup` after the reset.

---

## Application Entities Referenced by Tests

These are existing entities from `prisma/schema.prisma` that the tests create, read, and delete. Listed here for reference.

### Movement

| Field | Type | Notes |
|---|---|---|
| `id` | `String (UUID)` | Auto-generated |
| `name` | `String` | Unique-ish; tests append `Date.now()` suffix |
| `isBodyWeight` | `Boolean` | Default `false` |

### Workout

| Field | Type | Notes |
|---|---|---|
| `userId` | `String` | FK to User |
| `startedAt` | `DateTime` | Set on creation |
| `completedAt` | `DateTime?` | Null = active workout |

### Set

| Field | Type | Notes |
|---|---|---|
| `id` | `String (UUID)` | Auto-generated |
| `workoutId` | `String` | FK to Workout |
| `movementId` | `String` | FK to Movement |
| `weight` | `Float` | lbs |
| `reps` | `Int` | |

### WeightEntry

| Field | Type | Notes |
|---|---|---|
| `userId` | `String` | FK to User |
| `weight` | `Float` | |
| `date` | `DateTime` | Unique per userId+date |
