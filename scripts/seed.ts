#!/usr/bin/env bun
/**
 * Seed script — generates one year of workout + weight history for a test user.
 *
 * Usage:    bun run scripts/seed.ts
 * Credentials: seed@better-bookkeeping.test / 123456
 *
 * Safe to re-run: clears and recreates all workout/weight data for this user
 * each time. Movements and the user account are upserted, never duplicated.
 */

import argon2 from "argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../prisma/generated/client/client";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/demo_project";

const adapter = new PrismaPg({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter } as never);

// ─── Constants ────────────────────────────────────────────────────────────────

const SEED_EMAIL = "seed@better-bookkeeping.test";
const SEED_PASSWORD = "123456";
const SEED_NAME = "Seed User";

// ─── Seeded PRNG (xorshift32) — reproducible output across runs ───────────────

let _s = 0xdeadbeef;
function rand(): number {
  _s ^= _s << 13;
  _s ^= _s >> 17;
  _s ^= _s << 5;
  return ((_s >>> 0) & 0x7fffffff) / 0x7fffffff;
}
function randInt(min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Movement definitions ─────────────────────────────────────────────────────

interface MovementDef {
  name: string;
  isBodyWeight: boolean;
  startWeight: number; // lbs on day 0
  endWeight: number;   // lbs on day 365 (ignored for bodyweight)
  minReps: number;
  maxReps: number;
}

const MOVEMENT_DEFS: MovementDef[] = [
  { name: "Barbell Bench Press", isBodyWeight: false, startWeight: 135, endWeight: 185, minReps: 4, maxReps: 8  },
  { name: "Barbell Squat",       isBodyWeight: false, startWeight: 155, endWeight: 225, minReps: 4, maxReps: 8  },
  { name: "Deadlift",            isBodyWeight: false, startWeight: 185, endWeight: 275, minReps: 3, maxReps: 6  },
  { name: "Barbell Row",         isBodyWeight: false, startWeight: 95,  endWeight: 145, minReps: 5, maxReps: 10 },
  { name: "Overhead Press",      isBodyWeight: false, startWeight: 65,  endWeight: 95,  minReps: 4, maxReps: 8  },
  { name: "Leg Press",           isBodyWeight: false, startWeight: 180, endWeight: 270, minReps: 8, maxReps: 12 },
  { name: "Lat Pulldown",        isBodyWeight: false, startWeight: 100, endWeight: 150, minReps: 8, maxReps: 12 },
  { name: "Dumbbell Curl",       isBodyWeight: false, startWeight: 30,  endWeight: 45,  minReps: 8, maxReps: 12 },
  { name: "Pull-up",             isBodyWeight: true,  startWeight: 0,   endWeight: 0,   minReps: 4, maxReps: 12 },
  { name: "Push-up",             isBodyWeight: true,  startWeight: 0,   endWeight: 0,   minReps: 10, maxReps: 20 },
  { name: "Dips",                isBodyWeight: true,  startWeight: 0,   endWeight: 0,   minReps: 6, maxReps: 15 },
];

// ─── Workout schedule helpers ─────────────────────────────────────────────────

/** Returns the Monday of the week that contains `date`. */
function getMonday(date: Date): Date {
  const d = new Date(date);
  const dow = d.getDay(); // 0 = Sun
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  d.setHours(12, 0, 0, 0);
  return d;
}

/**
 * Returns workout dates for the given range.
 * Schedule: Mon–Sat only, at most 5 per week, 3–5 target per week with a
 * random chance of 1–2 days being "forgotten" (dropped).
 */
function buildWorkoutDates(startDate: Date, endDate: Date): Date[] {
  const results: Date[] = [];
  const monday = getMonday(startDate);

  while (monday <= endDate) {
    // Collect Mon–Sat days inside [startDate, endDate]
    const available: Date[] = [];
    for (let d = 0; d < 6; d++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + d);
      day.setHours(12, 0, 0, 0);
      if (day >= startDate && day <= endDate) available.push(day);
    }

    // Target 3–5 workouts; weighted toward 4
    const targets = [3, 3, 4, 4, 4, 5, 5];
    const target = targets[randInt(0, targets.length - 1)];

    // Simulate forgetting: 35 % chance to miss 1 day, 10 % to miss 2
    const forgot = rand() < 0.10 ? 2 : rand() < 0.35 ? 1 : 0;
    const actual = Math.max(0, Math.min(target - forgot, available.length));

    results.push(...shuffle(available).slice(0, actual));
    monday.setDate(monday.getDate() + 7);
  }

  return results.sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Returns the exercise weight for a given movement on a given progress fraction
 * (0 = start of year, 1 = end of year). Rounded to nearest 5 lbs + noise.
 */
function exerciseWeight(def: MovementDef, progress: number): number {
  if (def.isBodyWeight) return 0;
  const linear = def.startWeight + (def.endWeight - def.startWeight) * progress;
  // ±10 % noise, rounded to nearest 5
  const noise = (rand() - 0.5) * (def.endWeight - def.startWeight) * 0.15;
  return Math.round((linear + noise) / 5) * 5;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱  Seeding database…\n");

  // 1. Upsert movements
  const movementIdByName = new Map<string, string>();
  for (const def of MOVEMENT_DEFS) {
    const existing = await prisma.movement.findFirst({ where: { name: def.name } });
    if (existing) {
      await prisma.movement.update({
        where: { id: existing.id },
        data: { isBodyWeight: def.isBodyWeight },
      });
      movementIdByName.set(def.name, existing.id);
    } else {
      const m = await prisma.movement.create({
        data: { name: def.name, isBodyWeight: def.isBodyWeight },
      });
      movementIdByName.set(def.name, m.id);
    }
  }
  console.log(`✓  Movements upserted: ${movementIdByName.size}`);

  // 2. Upsert test user
  const hashedPassword = await argon2.hash(SEED_PASSWORD, { type: argon2.argon2id });
  let user = await prisma.user.findUnique({ where: { email: SEED_EMAIL } });
  if (!user) {
    user = await prisma.user.create({
      data: { email: SEED_EMAIL, password: hashedPassword, name: SEED_NAME },
    });
    console.log(`✓  Created user: ${SEED_EMAIL}`);
  } else {
    await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } });
    console.log(`✓  Found user:   ${SEED_EMAIL}`);
  }

  // 3. Clear existing workout + weight data
  await prisma.set.deleteMany({ where: { workout: { userId: user.id } } });
  await prisma.workout.deleteMany({ where: { userId: user.id } });
  await prisma.weightEntry.deleteMany({ where: { userId: user.id } });
  console.log("✓  Cleared existing data");

  // 4. Date range: one year ago → today
  const endDate = new Date();
  endDate.setHours(12, 0, 0, 0);
  const startDate = new Date(endDate);
  startDate.setFullYear(startDate.getFullYear() - 1);
  startDate.setDate(startDate.getDate() + 1); // day after same day last year

  const totalDays = Math.round(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  // 5. Generate workouts
  const workoutDates = buildWorkoutDates(startDate, endDate);
  const movementNames = MOVEMENT_DEFS.map((d) => d.name);
  let setCount = 0;

  for (const date of workoutDates) {
    const progress =
      (date.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime());

    // Pick 3–5 movements for this workout
    const chosen = shuffle(movementNames).slice(0, randInt(3, 5));

    const sets: Array<{ movementId: string; reps: number; weight: number }> = [];
    for (const name of chosen) {
      const def = MOVEMENT_DEFS.find((d) => d.name === name)!;
      const numSets = randInt(3, 4);
      const w = exerciseWeight(def, progress);
      for (let s = 0; s < numSets; s++) {
        sets.push({ movementId: movementIdByName.get(name)!, reps: randInt(def.minReps, def.maxReps), weight: w });
      }
    }

    await prisma.workout.create({
      data: { userId: user.id, completedAt: date, sets: { create: sets } },
    });
    setCount += sets.length;
  }

  console.log(`✓  Workouts created: ${workoutDates.length}  (${setCount} sets)`);

  // 6. Generate daily weight entries (one per day for the full year)
  let weightLbs = 185.0;
  const weightRows: Array<{ userId: string; weight: number; date: Date }> = [];

  for (let dayOffset = 0; dayOffset <= totalDays; dayOffset++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + dayOffset);
    date.setHours(0, 0, 0, 0);

    // Daily variation: random walk ±0.8 lbs + rare ±2 lb spikes + slight downward trend
    const spike = rand() < 0.08 ? (rand() < 0.5 ? 2.0 : -2.0) : 0;
    const delta = (rand() - 0.5) * 1.6 + spike - 0.01;
    weightLbs = Math.max(165, Math.min(210, weightLbs + delta));

    weightRows.push({
      userId: user.id,
      weight: Math.round(weightLbs * 10) / 10,
      date,
    });
  }

  await prisma.weightEntry.createMany({ data: weightRows });
  console.log(`✓  Weight entries created: ${weightRows.length}`);

  console.log(`
✅  Done!

   Email:    ${SEED_EMAIL}
   Password: ${SEED_PASSWORD}
   Workouts: ${workoutDates.length} (across ${Math.round(totalDays / 7)} weeks)
   Weights:  ${weightRows.length} daily entries
`);
}

main()
  .catch((err) => {
    console.error("\n❌  Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await (prisma as unknown as { $disconnect: () => Promise<void> }).$disconnect();
  });
