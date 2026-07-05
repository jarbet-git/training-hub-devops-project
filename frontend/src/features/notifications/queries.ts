import { useMutation, useQuery } from "@tanstack/react-query";
import { getNotificationSummary, markAllNotificationsRead, markNotificationScopesRead } from "./api";

export type MarkNotificationReadInput = string[] | { scopes: string[]; formIds?: number[] };

export const notificationKeys = {
  summary: () => ["notifications", "summary"] as const,
};

export function useNotificationSummary(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.summary(),
    queryFn: getNotificationSummary,
    enabled,
    refetchInterval: 60_000,
  });
}

export function useMarkAllNotificationsRead() {
  return useMutation({ mutationFn: () => markAllNotificationsRead() });
}


export function useMarkNotificationScopesRead() {
  return useMutation({
    mutationFn: (input: MarkNotificationReadInput) => {
      if (Array.isArray(input)) return markNotificationScopesRead(input);
      return markNotificationScopesRead(input.scopes, input.formIds);
    },
  });
}
