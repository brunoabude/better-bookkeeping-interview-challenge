import { createServerFn } from "@tanstack/react-start";
import { getServerSidePrismaClient } from "@/lib/db.server";
import { authMiddleware } from "@/lib/auth.server";
import { z } from "zod";

const MAXIMUM_VALID_WEIGHT = 720; // Lbs

export const getWeightEntriesServerFn = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const prisma = await getServerSidePrismaClient();
    const entries = await prisma.weightEntry.findMany({
      where: { userId: context.user.id },
      orderBy: { date: "asc" },
      select: { id: true, weight: true, date: true },
    });
    return entries.map((e) => ({ id: e.id, weight: e.weight, date: e.date.toISOString() }));
  });

export const upsertWeightEntryServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ weight: z.number().positive().max(MAXIMUM_VALID_WEIGHT), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
  .handler(async ({ context, data }: { context: { user: { id: string } }; data: { weight: number; date: string } }) => {
    const prisma = await getServerSidePrismaClient();
    const date = new Date(`${data.date}T00:00:00.000Z`);

    const entry = await prisma.weightEntry.upsert({
      where: { userId_date: { userId: context.user.id, date } },
      update: { weight: data.weight },
      create: { userId: context.user.id, weight: data.weight, date },
    });

    return {
      success: true as const,
      entry: { id: entry.id, weight: entry.weight, date: entry.date.toISOString() },
    };
  });

export const deleteWeightEntryServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.number().int() }))
  .handler(async ({ context, data }: { context: { user: { id: string } }; data: { id: number } }) => {
    const prisma = await getServerSidePrismaClient();
    const entry = await prisma.weightEntry.findFirst({
      where: { id: data.id, userId: context.user.id },
    });

    if (!entry) {
      return { success: false as const, error: "Not found" };
    }

    await prisma.weightEntry.delete({ where: { id: data.id } });
    return { success: true as const };
  });
