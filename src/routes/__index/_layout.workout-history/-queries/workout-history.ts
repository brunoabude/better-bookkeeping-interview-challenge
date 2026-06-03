import { getWorkoutHistoryServerFn } from "@/lib/workouts.server";
import { queryOptions } from "@tanstack/react-query";

export const workoutHistoryQueryOptions = ({
  startDate,
  endDate,
  page,
}: {
  startDate: string;
  endDate: string;
  page: number;
}) =>
  queryOptions({
    queryKey: ["workout-history", { startDate, endDate, page }],
    queryFn: () => getWorkoutHistoryServerFn({ data: { startDate, endDate, page } }),
  });
