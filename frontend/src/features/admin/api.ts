// src/features/admin/api.ts
import { apiFetch, apiFetchBlobWithMeta } from "@/lib/http";
import type {
  AdminUser,
  AdminUserCreate,
  AdminUserUpdate,
  UserActivationLinkResponse,
  UserInviteActionResponse,
  AreaAdmin,
  AreaAdminCreate,
  AreaAdminUpdate,
  BusinessNeedAdmin,
  BusinessNeedCreate,
  BusinessNeedUpdate,
  CollectionWindow,
  CostCenterAdmin,
  CostCenterAdminCreate,
  CostCenterAdminUpdate,
  TrainingCategoryAdmin,
  TrainingCategoryCreate,
  TrainingCategoryUpdate,
  TrainingNameAdmin,
  TrainingNameCreate,
  TrainingNameUpdate,
} from "./types";
import type { MandatoryTrainingImportSummary } from "@/features/mandatoryTrainings/types";

function qs(params: Record<string, string | number | boolean | null | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// -------- USERS --------
export async function adminListUsers(params?: { q?: string; role?: string; area_id?: number | null }) {
  return apiFetch<AdminUser[]>(
    `/admin/users${qs({ q: params?.q, role: params?.role, area_id: params?.area_id ?? undefined })}`,
    { auth: true }
  );
}

export async function adminCreateUser(payload: AdminUserCreate) {
  return apiFetch<AdminUser>("/admin/users", { method: "POST", auth: true, json: payload });
}

export async function adminUpdateUser(userId: number, payload: AdminUserUpdate) {
  return apiFetch<AdminUser>(`/admin/users/${userId}`, { method: "PATCH", auth: true, json: payload });
}


export async function adminResendUserInvite(userId: number) {
  return apiFetch<UserInviteActionResponse>(`/admin/users/${userId}/resend-invite`, { method: "POST", auth: true });
}

export async function adminGenerateUserActivationLink(userId: number) {
  return apiFetch<UserActivationLinkResponse>(`/admin/users/${userId}/activation-link`, { method: "POST", auth: true });
}

// -------- COLLECTION WINDOW --------
export async function adminGetCollectionWindow() {
  return apiFetch<CollectionWindow>("/admin/collection-window", { auth: true });
}

export async function adminSetCollectionWindow(is_open: boolean) {
  // Backend supports PATCH. We intentionally use PATCH to avoid 405 Method Not Allowed.
  return apiFetch<CollectionWindow>("/admin/collection-window", { method: "PATCH", auth: true, json: { is_open } });
}

// -------- AREAS --------
export async function adminListAreas() {
  return apiFetch<AreaAdmin[]>("/admin/dict/areas", { auth: true });
}

export async function adminCreateArea(payload: AreaAdminCreate) {
  return apiFetch<AreaAdmin>("/admin/dict/areas", { method: "POST", auth: true, json: payload });
}

export async function adminUpdateArea(areaId: number, payload: AreaAdminUpdate) {
  return apiFetch<AreaAdmin>(`/admin/dict/areas/${areaId}`, { method: "PATCH", auth: true, json: payload });
}

export async function adminDeleteArea(areaId: number) {
  return apiFetch<null>(`/admin/dict/areas/${areaId}`, { method: "DELETE", auth: true });
}

// -------- COST CENTERS --------
export async function adminListCostCenters(params: { area_id?: number | null; q?: string; limit?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.area_id) qs.set("area_id", String(params.area_id));
  if (params.q) qs.set("q", params.q);
  if (params.limit) qs.set("limit", String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<CostCenterAdmin[]>(`/admin/dict/cost-centers${suffix}`, { auth: true });
}

export async function adminCreateCostCenter(areaId: number, payload: CostCenterAdminCreate) {
  return apiFetch<CostCenterAdmin>(`/admin/dict/areas/${areaId}/cost-centers`, { method: "POST", auth: true, json: payload });
}

// NOTE: Backend updates a Cost Center by ID (not nested under Area).
export async function adminUpdateCostCenter(ccId: number, payload: CostCenterAdminUpdate) {
  return apiFetch<CostCenterAdmin>(`/admin/dict/cost-centers/${ccId}`, { method: "PATCH", auth: true, json: payload });
}

// NOTE: Backend deletes a Cost Center by ID (not nested under Area).
export async function adminDeleteCostCenter(ccId: number) {
  return apiFetch<null>(`/admin/dict/cost-centers/${ccId}`, { method: "DELETE", auth: true });
}

// -------- TRAINING CATEGORIES --------
export async function adminListTrainingCategories() {
  // Backend uses /categories
  return apiFetch<TrainingCategoryAdmin[]>("/admin/dict/categories", { auth: true });
}

export async function adminCreateTrainingCategory(payload: TrainingCategoryCreate) {
  return apiFetch<TrainingCategoryAdmin>("/admin/dict/categories", { method: "POST", auth: true, json: payload });
}

export async function adminUpdateTrainingCategory(catId: number, payload: TrainingCategoryUpdate) {
  return apiFetch<TrainingCategoryAdmin>(`/admin/dict/categories/${catId}`, { method: "PATCH", auth: true, json: payload });
}

export async function adminDeleteTrainingCategory(catId: number) {
  return apiFetch<null>(`/admin/dict/categories/${catId}`, { method: "DELETE", auth: true });
}

// -------- TRAINING NAMES --------
export async function adminListTrainingNames(catId: number, q?: string) {
  // Backend uses /categories/{catId}/trainings
  return apiFetch<TrainingNameAdmin[]>(
    `/admin/dict/categories/${catId}/trainings${qs({ q })}`,
    { auth: true }
  );
}

export async function adminSearchTrainingNames(params: { q?: string; category_id?: number | null; limit?: number } = {}) {
  return apiFetch<TrainingNameAdmin[]>(
    `/admin/dict/trainings${qs({ q: params.q, category_id: params.category_id ?? undefined, limit: params.limit })}`,
    { auth: true }
  );
}

export async function adminCreateTrainingName(catId: number, payload: TrainingNameCreate) {
  return apiFetch<TrainingNameAdmin>(`/admin/dict/categories/${catId}/trainings`, { method: "POST", auth: true, json: payload });
}

// NOTE: Backend updates a Training by ID (not nested under Category).
export async function adminUpdateTrainingName(tnId: number, payload: TrainingNameUpdate) {
  return apiFetch<TrainingNameAdmin>(`/admin/dict/trainings/${tnId}`, { method: "PATCH", auth: true, json: payload });
}

// NOTE: Backend deletes a Training by ID (not nested under Category).
export async function adminDeleteTrainingName(tnId: number) {
  return apiFetch<null>(`/admin/dict/trainings/${tnId}`, { method: "DELETE", auth: true });
}

// -------- BUSINESS NEEDS --------
export async function adminListBusinessNeeds() {
  return apiFetch<BusinessNeedAdmin[]>("/admin/dict/business-needs", { auth: true });
}

export async function adminCreateBusinessNeed(payload: BusinessNeedCreate) {
  return apiFetch<BusinessNeedAdmin>("/admin/dict/business-needs", { method: "POST", auth: true, json: payload });
}

export async function adminUpdateBusinessNeed(id: number, payload: BusinessNeedUpdate) {
  return apiFetch<BusinessNeedAdmin>(`/admin/dict/business-needs/${id}`, { method: "PATCH", auth: true, json: payload });
}

export async function adminDeleteBusinessNeed(id: number) {
  return apiFetch<null>(`/admin/dict/business-needs/${id}`, { method: "DELETE", auth: true });
}

// -------- REPORTS --------
export async function adminExportForms(params: {
  format: "xlsx" | "csv";
  // filters
  status?: string | null; // backward compat (single)
  statuses?: string[] | null; // multi
  area_id?: number | null; // backward compat (single)
  area_ids?: number[] | null; // multi
  created_by_user_id?: number | null;
  date_from?: string | null; // YYYY-MM-DD
  date_to?: string | null; // YYYY-MM-DD
  hr_decision?: string | null; // backward compat (single)
  hr_decisions?: string[] | null; // multi
  // export
  preset_id?: number | null;
  columns?: string[] | null; // ordered column keys
  lang?: "pl" | "en";
}): Promise<{ blob: Blob; filename: string }> {
  const qs = new URLSearchParams();
  qs.set("format", params.format);
  if (params.lang) qs.set("lang", params.lang);

  // filters
  if (params.status) qs.set("status", params.status);
  if (params.statuses?.length) params.statuses.forEach((s) => qs.append("statuses", s));
  if (params.hr_decision) qs.set("hr_decision", params.hr_decision);
  if (params.hr_decisions?.length) params.hr_decisions.forEach((d) => qs.append("hr_decisions", d));
  if (params.area_id) qs.set("area_id", String(params.area_id));
  if (params.area_ids?.length) params.area_ids.forEach((id) => qs.append("area_ids", String(id)));
  if (params.created_by_user_id) qs.set("created_by_user_id", String(params.created_by_user_id));
  if (params.date_from) qs.set("date_from", params.date_from);
  if (params.date_to) qs.set("date_to", params.date_to);

  // export
  if (params.preset_id) qs.set("preset_id", String(params.preset_id));
  if (params.columns?.length) qs.append("columns", params.columns.join(","));

  const { blob, res } = await apiFetchBlobWithMeta(`/admin/reports/forms-export?${qs.toString()}`, { method: "GET" });

  // backend exposes Content-Disposition header via CORS
  const cd = res.headers.get("content-disposition") || res.headers.get("Content-Disposition") || "";
  const m = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i);
  const filename = decodeURIComponent((m?.[1] || m?.[2] || "").trim()) || `poap_report.${params.format}`;

  return { blob, filename };
}

// -------- EXPORT PRESETS --------
export type ExportPreset = {
  id: number;
  name: string;
  columns: string[];

  // always saved in preset
  export_format: "xlsx" | "csv";
  export_lang: "pl" | "en";
  filters?: Record<string, any> | null;

  is_shared: boolean;
  created_by_user_id: number | null;
  created_at: string;
  updated_at: string;
};

export async function adminListExportPresets(params?: { mine_only?: boolean }): Promise<ExportPreset[]> {
  const qs = new URLSearchParams();
  if (params?.mine_only) qs.set("mine_only", "true");
  const url = qs.toString() ? `/admin/export-presets?${qs.toString()}` : "/admin/export-presets";
  return apiFetch<ExportPreset[]>(url, { method: "GET", auth: true });
}

export async function adminCreateExportPreset(payload: {
  name: string;
  columns: string[];
  export_format: "xlsx" | "csv";
  export_lang: "pl" | "en";
  filters?: Record<string, any> | null;
  is_shared?: boolean;
}): Promise<ExportPreset> {
  return apiFetch<ExportPreset>("/admin/export-presets", { method: "POST", auth: true, json: payload });
}

export async function adminUpdateExportPreset(
  id: number,
  payload: {
    name?: string;
    columns?: string[];
    export_format?: "xlsx" | "csv";
    export_lang?: "pl" | "en";
    filters?: Record<string, any> | null;
    is_shared?: boolean;
  }
): Promise<ExportPreset> {
  return apiFetch<ExportPreset>(`/admin/export-presets/${id}`, { method: "PUT", auth: true, json: payload });
}

export async function adminDeleteExportPreset(id: number): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/admin/export-presets/${id}`, { method: "DELETE", auth: true });
}


// -------- MANDATORY TRAININGS --------
export async function adminGetMandatoryTrainingImportSummary() {
  return apiFetch<MandatoryTrainingImportSummary>("/admin/mandatory-trainings/import-summary", { auth: true });
}

export async function adminImportMandatoryTrainingFile(file: File) {
  const body = new FormData();
  body.append("file", file);
  return apiFetch<MandatoryTrainingImportSummary>("/admin/mandatory-trainings/import", {
    method: "POST",
    auth: true,
    body,
  });
}
