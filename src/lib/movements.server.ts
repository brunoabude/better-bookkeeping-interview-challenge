import { createServerFn } from "@tanstack/react-start";
import { getServerSidePrismaClient } from "@/lib/db.server";
import { z } from "zod";

const PAGE_SIZE = 5;

export const createMovementServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ name: z.string().min(1), isBodyWeight: z.boolean().default(false) }))
  .handler(async ({ data }: { data: { name: string; isBodyWeight: boolean } }) => {
    const prisma = await getServerSidePrismaClient();
    const movement = await prisma.movement.create({
      data: { name: data.name, isBodyWeight: data.isBodyWeight },
    });
    // Determine which page the new movement lands on (sorted alphabetically)
    const position = await prisma.movement.count({ where: { name: { lt: data.name } } });
    const page = Math.floor(position / PAGE_SIZE) + 1;
    return { success: true, movement, page };
  });

export const getMovementsServerFn = createServerFn().handler(async () => {
  const prisma = await getServerSidePrismaClient();
  return prisma.movement.findMany({
    orderBy: { name: "asc" },
  });
});

export const getPaginatedMovementsServerFn = createServerFn()
  .inputValidator(z.object({ page: z.number().int().min(1) }))
  .handler(async ({ data }: { data: { page: number } }) => {
    const prisma = await getServerSidePrismaClient();
    const skip = (data.page - 1) * PAGE_SIZE;
    const [totalCount, items] = await prisma.$transaction([
      prisma.movement.count(),
      prisma.movement.findMany({
        orderBy: { name: "asc" },
        take: PAGE_SIZE,
        skip,
      }),
    ]);
    return {
      items,
      totalCount,
      page: data.page,
      totalPages: Math.ceil(totalCount / PAGE_SIZE),
      pageSize: PAGE_SIZE,
    };
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
