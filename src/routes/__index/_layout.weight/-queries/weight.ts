import { getWeightEntriesServerFn } from "@/lib/weight.server";
import { queryOptions } from "@tanstack/react-query";

export const weightEntriesQueryOptions = ({
  startDate,
  endDate,
  page,
}: {
  startDate: string;
  endDate: string;
  page: number;
}) =>
  queryOptions({
    queryKey: ["weight-entries", { startDate, endDate, page }],
    queryFn: () => getWeightEntriesServerFn({ data: { startDate, endDate, page } }),
  });
