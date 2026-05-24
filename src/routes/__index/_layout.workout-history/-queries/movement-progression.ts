import { getMovementProgressionServerFn } from "@/lib/workouts.server";
import { queryOptions } from "@tanstack/react-query";

export const movementProgressionQueryOptions = ({ movementId }: { movementId: string }) =>
  queryOptions({
    queryKey: ["movement-progression", movementId],
    queryFn: () => getMovementProgressionServerFn({ data: { movementId } }),
  });
