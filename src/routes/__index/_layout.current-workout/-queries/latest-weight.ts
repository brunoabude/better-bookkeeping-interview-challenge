import { getLatestWeightServerFn } from "@/lib/weight.server";
import { queryOptions } from "@tanstack/react-query";

export const latestWeightQueryOptions = () =>
  queryOptions({
    queryKey: ["latest-weight"],
    queryFn: () => getLatestWeightServerFn(),
  });
