import { apiFetch, apiFetchBlobWithMeta } from "@/lib/http";
import type {
  MandatoryTrainingImportSummary,
  MandatoryTrainingListResponse,
  MandatoryTrainingSummary,
} from "./types";

function qs(params: Record<string, string | number | null | undefined>) {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    sp.set(key, String(value));
  }
  const suffix = sp.toString();
  return suffix ? `?${suffix}` : "";
}

export async function getMandatoryTrainings(params?: {
  q?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  return apiFetch<MandatoryTrainingListResponse>(
    `/mandatory-trainings${qs({
      q: params?.q,
      status: params?.status ?? "all",
      limit: params?.limit ?? 200,
      offset: params?.offset ?? 0,
    })}`,
    { auth: true }
  );
}

export async function getMandatoryTrainingSummary() {
  return apiFetch<MandatoryTrainingSummary>("/mandatory-trainings/summary", { auth: true });
}

export async function exportMandatoryTrainings(params?: {
  q?: string;
  status?: string;
  lang?: "pl" | "en";
}): Promise<{ blob: Blob; filename: string }> {
  const { blob, res } = await apiFetchBlobWithMeta(
    `/mandatory-trainings/export${qs({
      q: params?.q,
      status: params?.status ?? "all",
      lang: params?.lang ?? "pl",
    })}`,
    { method: "GET" }
  );

  const cd = res.headers.get("content-disposition") || res.headers.get("Content-Disposition") || "";
  const m = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i);
  const filename = decodeURIComponent((m?.[1] || m?.[2] || "").trim()) || "mandatory_trainings.xlsx";

  return { blob, filename };
}

export async function getAdminMandatoryTrainingImportSummary() {
  return apiFetch<MandatoryTrainingImportSummary>("/admin/mandatory-trainings/import-summary", { auth: true });
}

export async function adminImportMandatoryTrainings(file: File) {
  const body = new FormData();
  body.append("file", file);
  return apiFetch<MandatoryTrainingImportSummary>("/admin/mandatory-trainings/import", {
    method: "POST",
    auth: true,
    body,
  });
}
