import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  adminImportMandatoryTrainings,
  getAdminMandatoryTrainingImportSummary,
  getMandatoryTrainingSummary,
  getMandatoryTrainings,
} from "./api";

export const mandatoryTrainingKeys = {
  all: () => ["mandatory-trainings"] as const,
  list: (params?: { q?: string; status?: string; limit?: number; offset?: number }) => ["mandatory-trainings", "list", params] as const,
  summary: () => ["mandatory-trainings", "summary"] as const,
  adminImportSummary: () => ["mandatory-trainings", "admin-import-summary"] as const,
};

export function useMandatoryTrainingSummary(enabled = true) {
  return useQuery({
    queryKey: mandatoryTrainingKeys.summary(),
    queryFn: getMandatoryTrainingSummary,
    enabled,
    refetchInterval: 60_000,
  });
}

export function useMandatoryTrainings(params?: { q?: string; status?: string; limit?: number; offset?: number }, enabled = true) {
  return useQuery({
    queryKey: mandatoryTrainingKeys.list(params),
    queryFn: () => getMandatoryTrainings(params),
    enabled,
    refetchInterval: 60_000,
  });
}

export function useAdminMandatoryTrainingImportSummary(enabled = true) {
  return useQuery({
    queryKey: mandatoryTrainingKeys.adminImportSummary(),
    queryFn: getAdminMandatoryTrainingImportSummary,
    enabled,
  });
}

export function useAdminImportMandatoryTrainings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => adminImportMandatoryTrainings(file),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: mandatoryTrainingKeys.all() }),
        qc.invalidateQueries({ queryKey: ["notifications", "summary"] }),
      ]);
    },
  });
}
