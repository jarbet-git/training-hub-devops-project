import { useQuery } from "@tanstack/react-query";

import { getDashboardComparison } from "./api";

export const dashboardKeys = {
  comparison: () => ["dashboard", "comparison"] as const,
};

export function useDashboardComparison(enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.comparison(),
    queryFn: getDashboardComparison,
    enabled,
    refetchInterval: 60_000,
  });
}
