// src/features/forms/api.ts
import { apiFetch } from "@/lib/http";
import type {
  AreaOption,
  BusinessNeedOption,
  CostCenterOption,
  Form,
  FormDetails,
  FormEvent,
  FormItem,
  FormItemCreatePayload,
  FormItemUpdatePayload,
  FormListResponse,
  HrDecision,
  HrReplyPayload,
  HrAdminListParams,
  HrInboxParams,
  ManagerInboxParams,
  EditorInboxParams,
  MyFormsParams,
  TrainingCategoryOption,
  TrainingNameOption,
} from "./types";

// Backend dict item shape
type DictItem = {
  id: number;
  code?: string | null;
  name_pl?: string | null;
  name_en?: string | null;
  // training-name extras
  default_cost_per_person?: number | null;
  default_hours_per_person?: number | null;
};

function toAreaOption(x: DictItem): AreaOption {
  return {
    id: x.id,
    code: x.code ?? null,
    name_pl: x.name_pl ?? null,
    name_en: x.name_en ?? null,
  };
}

function toCostCenterOption(x: DictItem & { area_id?: number | null }): CostCenterOption {
  return {
    id: x.id,
    area_id: x.area_id ?? null,
    code: (x.code ?? "").toString(),
    name_pl: x.name_pl ?? null,
    name_en: x.name_en ?? null,
  };
}

function toDictOption(x: DictItem): { id: number; code?: string | null; name_pl?: string | null; name_en?: string | null } {
  return {
    id: x.id,
    code: x.code ?? null,
    name_pl: x.name_pl ?? null,
    name_en: x.name_en ?? null,
  };
}

function withParams(path: string, params: Record<string, unknown>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}

// ---- FORMS (lists) ----
export async function getMyForms(params: MyFormsParams = {}): Promise<FormListResponse> {
  return apiFetch<FormListResponse>(withParams("/forms/my", params), { auth: true });
}

export async function getManagerInbox(params: ManagerInboxParams = {}): Promise<FormListResponse> {
  return apiFetch<FormListResponse>(withParams("/forms/manager/inbox", params), { auth: true });
}

export async function getEditorInbox(params: EditorInboxParams = {}): Promise<FormListResponse> {
  return apiFetch<FormListResponse>(withParams("/forms/editor/inbox", params), { auth: true });
}

export async function getHrInbox(params: HrInboxParams = {}): Promise<FormListResponse> {
  return apiFetch<FormListResponse>(withParams("/forms/hr/inbox", params), { auth: true });
}

export async function getHrAdminFormsList(params: HrAdminListParams = {}): Promise<FormListResponse> {
  return apiFetch<FormListResponse>(withParams("/forms/list", params), { auth: true });
}

// ---- FORM details ----
export async function getForm(formId: number): Promise<FormDetails> {
  return apiFetch<FormDetails>(`/forms/${formId}`, { auth: true });
}

export async function getFormHistory(formId: number): Promise<FormEvent[]> {
  return apiFetch<FormEvent[]>(`/forms/${formId}/history`, { auth: true });
}

export async function createForm(payload: { area_id: number }): Promise<Form> {
  return apiFetch<Form>("/forms", { auth: true, method: "POST", json: payload });
}

// ---- ITEM CRUD ----
export async function addItem(formId: number, payload: FormItemCreatePayload): Promise<FormItem> {
  return apiFetch<FormItem>(`/forms/${formId}/items`, { auth: true, method: "POST", json: payload });
}

export async function updateItem(
  formId: number,
  itemId: number,
  payload: FormItemUpdatePayload
): Promise<FormItem> {
  return apiFetch<FormItem>(`/forms/${formId}/items/${itemId}`, {
    auth: true,
    method: "PATCH",
    json: payload,
  });
}

export async function deleteItem(formId: number, itemId: number): Promise<void> {
  await apiFetch<null>(`/forms/${formId}/items/${itemId}`, { auth: true, method: "DELETE" });
}

export async function deleteForm(formId: number): Promise<void> {
  await apiFetch<null>(`/forms/${formId}`, { auth: true, method: "DELETE" });
}

// ---- WORKFLOW actions ----
export async function submitToManager(formId: number): Promise<Form> {
  return apiFetch<Form>(`/forms/${formId}/submit`, { auth: true, method: "POST" });
}

export async function managerApprove(formId: number): Promise<Form> {
  return apiFetch<Form>(`/forms/${formId}/manager/approve`, { auth: true, method: "POST" });
}

export async function managerRequestChanges(formId: number, comment: string): Promise<Form> {
  return apiFetch<Form>(`/forms/${formId}/manager/request-changes`, {
    auth: true,
    method: "POST",
    json: { comment },
  });
}

export async function hrReply(formId: number, payload: HrReplyPayload): Promise<Form> {
  // Final HR decision: APPROVED or REJECTED. Both finish the workflow.
  return apiFetch<Form>(`/forms/${formId}/hr/reply`, { auth: true, method: "POST", json: payload });
}

export async function hrRequestChanges(formId: number, comment: string): Promise<Form> {
  // Non-final HR action: return request to manager/editor for corrections.
  return apiFetch<Form>(`/forms/${formId}/hr/request-changes`, {
    auth: true,
    method: "POST",
    json: { comment },
  });
}

// ---- DICTS ----
export async function listAreas(q?: string): Promise<AreaOption[]> {
  const items = await apiFetch<DictItem[]>(withParams("/dict/areas", { q }), { auth: true });
  return items.map(toAreaOption);
}

export async function listMyAreas(q?: string): Promise<AreaOption[]> {
  const items = await apiFetch<DictItem[]>(withParams("/dict/my-areas", { q }), { auth: true });
  return items.map(toAreaOption);
}

export async function listCostCenters(areaId: number, q?: string): Promise<CostCenterOption[]> {
  const items = await apiFetch<Array<DictItem & { area_id?: number | null }>>(
    withParams(`/dict/areas/${areaId}/cost-centers`, { q }),
    { auth: true }
  );
  return items.map(toCostCenterOption);
}

export async function listTrainingCategories(q?: string): Promise<TrainingCategoryOption[]> {
  const items = await apiFetch<DictItem[]>(withParams("/dict/training-categories", { q }), { auth: true });
  return items.map((x) => ({ ...toDictOption(x), code: null }));
}

export async function listTrainingNames(categoryId: number, q?: string): Promise<TrainingNameOption[]> {
  const items = await apiFetch<Array<DictItem & { category_id?: number | null }>>(
    withParams(`/dict/training-categories/${categoryId}/training-names`, { q }),
    { auth: true }
  );
  return items.map((x) => ({
    ...toDictOption(x),
    code: null,
    category_id: (x as any).category_id ?? null,
    default_cost_per_person: x.default_cost_per_person ?? null,
    default_hours_per_person: x.default_hours_per_person ?? null,
  }));
}

export async function searchTrainingNames(params: { q?: string; categoryId?: number | null; limit?: number } = {}): Promise<TrainingNameOption[]> {
  const { q, categoryId, limit } = params;
  const items = await apiFetch<Array<DictItem & { category_id?: number | null }>>(
    withParams(`/dict/training-names`, { q, category_id: categoryId ?? undefined, limit }),
    { auth: true }
  );
  return items.map((x) => ({
    ...toDictOption(x),
    code: null,
    category_id: (x as any).category_id ?? null,
    default_cost_per_person: x.default_cost_per_person ?? null,
    default_hours_per_person: x.default_hours_per_person ?? null,
  }));
}

export async function listBusinessNeeds(q?: string): Promise<BusinessNeedOption[]> {
  const items = await apiFetch<DictItem[]>(withParams("/dict/business-needs", { q }), { auth: true });
  return items.map((x) => ({ ...toDictOption(x), code: null }));
}

// ---- helpers for decisions ----
export function normalizeHrDecision(v: unknown): HrDecision | null {
  if (v === "APPROVED" || v === "REJECTED") return v;
  return null;
}
