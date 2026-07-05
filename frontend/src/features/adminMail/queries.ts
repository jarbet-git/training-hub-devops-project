import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMailLogs, getMailStatus, sendTestMail } from "./api";

export const adminMailKeys = {
  status: () => ["admin-mail", "status"] as const,
  logs: (limit = 10) => ["admin-mail", "logs", limit] as const,
};

export function useAdminMailStatus(enabled = true) {
  return useQuery({
    queryKey: adminMailKeys.status(),
    queryFn: getMailStatus,
    enabled,
  });
}

export function useAdminMailLogs(limit = 10, enabled = true) {
  return useQuery({
    queryKey: adminMailKeys.logs(limit),
    queryFn: () => getMailLogs(limit),
    enabled,
  });
}

export function useAdminSendTestMail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sendTestMail,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-mail"] });
    },
  });
}
