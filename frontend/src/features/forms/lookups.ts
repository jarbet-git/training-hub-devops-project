// src/features/forms/lookups.ts
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { CostCenterOption } from "@/features/forms/types";

type CostCentersResponse = {
  items: CostCenterOption[];
};

export function useCostCentersByArea(areaId?: number, enabled = true) {
  return useQuery({
    queryKey: ["cost-centers", { areaId }],
    enabled: enabled && !!areaId,
    queryFn: async () => {
      // UWAGA: musisz mieć endpoint w backendzie: GET /api/cost-centers?area_id=...
      return apiFetch<CostCentersResponse>(`/cost-centers?area_id=${areaId}`);
    },
  });
}
