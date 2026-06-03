import { createServerFn } from "@tanstack/react-start";
import { getServerSidePrismaClient } from "@/lib/db.server";
import { authMiddleware } from "@/lib/auth.server";
import { z } from "zod";
import { Prisma } from "../../prisma/generated/client/client";

export const createWorkoutServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const prisma = await getServerSidePrismaClient();
    const workout = await prisma.workout.create({
      data: {
        userId: context.user.id,
      },
    });
    return { success: true, workout };
  });

export const getCurrentWorkoutServerFn = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const prisma = await getServerSidePrismaClient();
    // Get the most recent workout for the user
    const workout = await prisma.workout.findFirst({
      where: { userId: context.user.id, completedAt: null },
      orderBy: { id: "desc" },
      include: {
        sets: {
          include: { movement: true },
        },
      },
    });
    return workout;
  });

export const completeWorkoutServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const prisma = await getServerSidePrismaClient();
    const workout = await prisma.workout.findFirst({
      where: { userId: context.user.id, completedAt: null },
    });
    if (!workout) {
      return { success: false, error: "No active workout to complete" };
    }
    await prisma.workout.update({
      where: { id: workout.id },
      data: { completedAt: new Date() },
    });
    return { success: true };
  });

export const addSetServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ movementId: z.string(), reps: z.number().min(1), weight: z.number().min(0) }))
  .handler(
    async ({
      context,
      data,
    }: {
      context: { user: { id: string } };
      data: { movementId: string; reps: number; weight: number };
    }) => {
      const prisma = await getServerSidePrismaClient();
      const workout = await prisma.workout.findFirst({
        where: { userId: context.user.id, completedAt: null },
      });
      if (!workout) {
        return { success: false, error: "No active workout" };
      }
      const set = await prisma.set.create({
        data: {
          workoutId: workout.id,
          movementId: data.movementId,
          reps: data.reps,
          weight: data.weight,
        },
        include: { movement: true },
      });
      return { success: true, set };
    },
  );

export const deleteSetServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ setId: z.string() }))
  .handler(async ({ context, data }: { context: { user: { id: string } }; data: { setId: string } }) => {
    const prisma = await getServerSidePrismaClient();
    // Verify the set belongs to the user's active workout
    const set = await prisma.set.findFirst({
      where: { id: data.setId, workout: { userId: context.user.id, completedAt: null } },
    });
    if (!set) {
      return { success: false, error: "Set not found" };
    }
    await prisma.set.delete({ where: { id: data.setId } });
    return { success: true };
  });

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const PAGE_SIZE = 5;
const MAX_RANGE_DAYS = 90;

export const getWorkoutHistoryServerFn = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      startDate: z.string().regex(DATE_REGEX),
      endDate: z.string().regex(DATE_REGEX),
      page: z.number().int().min(1),
    }),
  )
  .handler(
    async ({
      context,
      data,
    }: {
      context: { user: { id: string } };
      data: { startDate: string; endDate: string; page: number };
    }) => {
      if (data.startDate > data.endDate) {
        throw new Error("Start date must not be after end date");
      }
      const diffDays =
        (new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > MAX_RANGE_DAYS) {
        throw new Error("Date range must not exceed 90 days");
      }

      const startBound = new Date(data.startDate + "T00:00:00.000Z");
      const endBound = new Date(data.endDate + "T23:59:59.999Z");
      const skip = (data.page - 1) * PAGE_SIZE;

      const prisma = await getServerSidePrismaClient();
      const where = {
        userId: context.user.id,
        completedAt: { not: null as null, gte: startBound, lte: endBound },
      };

      const [totalCount, items] = await prisma.$transaction([
        prisma.workout.count({ where }),
        prisma.workout.findMany({
          where,
          orderBy: { completedAt: "desc" },
          take: PAGE_SIZE,
          skip,
          include: { sets: { include: { movement: true } } },
        }),
      ]);

      return {
        items,
        totalCount,
        page: data.page,
        totalPages: Math.ceil(totalCount / PAGE_SIZE),
        pageSize: PAGE_SIZE,
      };
    },
  );

export const getMovementProgressionServerFn = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ movementId: z.string() }))
  .handler(async ({ context, data }: { context: { user: { id: string } }; data: { movementId: string } }) => {
    const prisma = await getServerSidePrismaClient();
    const rows = await prisma.$queryRaw<
      { date: string; maxWeight: number | null; totalVolume: number; totalReps: number }[]
    >(Prisma.sql`
      SELECT
        TO_CHAR(DATE(w."completedAt"), 'YYYY-MM-DD') AS date,
        MAX(s.weight)::int                           AS "maxWeight",
        SUM(s.weight * s.reps)::int                  AS "totalVolume",
        SUM(s.reps)::int                             AS "totalReps"
      FROM "Set" s
      JOIN "Workout" w ON s."workoutId" = w.id
      WHERE s."movementId" = ${data.movementId}
        AND w."userId"     = ${context.user.id}
        AND w."completedAt" IS NOT NULL
      GROUP BY DATE(w."completedAt")
      ORDER BY date ASC
    `);
    return rows;
  });

export const deleteWorkoutsServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ workoutIds: z.array(z.string()) }))
  .handler(async ({ context, data }: { context: { user: { id: string } }; data: { workoutIds: string[] } }) => {
    const prisma = await getServerSidePrismaClient();
    // Delete sets first, then workouts (only for this user's workouts)
    await prisma.set.deleteMany({
      where: { workout: { id: { in: data.workoutIds }, userId: context.user.id } },
    });
    await prisma.workout.deleteMany({
      where: { id: { in: data.workoutIds }, userId: context.user.id },
    });
    return { success: true };
  });
