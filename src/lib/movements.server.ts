import { createServerFn } from "@tanstack/react-start";
import { getServerSidePrismaClient } from "@/lib/db.server";
import { z } from "zod";

export const createMovementServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ name: z.string().min(1), isBodyWeight: z.boolean().default(false) }))
  .handler(async ({ data }: { data: { name: string; isBodyWeight: boolean } }) => {
    const prisma = await getServerSidePrismaClient();
    const movement = await prisma.movement.create({
      data: { name: data.name, isBodyWeight: data.isBodyWeight },
    });
    return { success: true, movement };
  });

export const getMovementsServerFn = createServerFn().handler(async () => {
  const prisma = await getServerSidePrismaClient();
  return prisma.movement.findMany({
    orderBy: { name: "asc" },
  });
});

export const updateMovementServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid(), isBodyWeight: z.boolean() }))
  .handler(async ({ data }: { data: { id: string; isBodyWeight: boolean } }) => {
    const prisma = await getServerSidePrismaClient();
    try {
      const movement = await prisma.movement.update({
        where: { id: data.id },
        data: { isBodyWeight: data.isBodyWeight },
      });
      return { success: true as const, movement };
    } catch {
      return { success: false as const, error: "Movement not found" };
    }
  });
