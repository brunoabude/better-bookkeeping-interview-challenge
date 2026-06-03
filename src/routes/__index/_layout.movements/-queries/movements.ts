import { getPaginatedMovementsServerFn } from "@/lib/movements.server";
import { queryOptions } from "@tanstack/react-query";

export const movementsQueryOptions = (page: number) =>
  queryOptions({
    queryKey: ["movements-paginated", { page }],
    queryFn: () => getPaginatedMovementsServerFn({ data: { page } }),
  });
