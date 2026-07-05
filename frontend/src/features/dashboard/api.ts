import { apiFetch } from "@/lib/api";
import type { DashboardComparisonResponse } from "./types";

export function getDashboardComparison() {
  return apiFetch<DashboardComparisonResponse>("/dashboard/summary");
}
