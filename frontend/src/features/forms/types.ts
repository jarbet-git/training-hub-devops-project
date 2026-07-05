// src/features/forms/types.ts

// ---- wspólne ----
export type SortDir = "asc" | "desc";
export type FormsSortBy = "updated_at" | "created_at" | "id";

export type FormStatus =
  | "DRAFT"
  | "MANAGER_REVIEW"
  | "HR_REVIEW"
  | "REPLIED"
  | "CLOSED";

export type Priority = "LOW" | "MEDIUM" | "HIGH";
export type Quarter = "Q1" | "Q2" | "Q3" | "Q4" | "TBD";

// ---- dictionary options (przechowujemy obie nazwy — PL/EN) ----
export type DictOption = {
  id: number;
  code?: string | null;
  name_pl?: string | null;
  name_en?: string | null;
  // legacy — czasem backend daje `name`
  name?: string | null;
};

export type AreaOption = {
  id: number;
  code: string | null;
  name_pl: string | null;
  name_en: string | null;
};

export type CostCenterOption = {
  id: number;
  area_id: number | null;
  code: string;
  name_pl: string | null;
  name_en: string | null;
};

export type TrainingCategoryOption = DictOption;

export type TrainingNameOption = DictOption & {
  category_id?: number | null;
  default_cost_per_person?: number | null;
  default_hours_per_person?: number | null;
};

export type BusinessNeedOption = DictOption;

// ---- forms ----
export type HrDecision = "APPROVED" | "REJECTED";
export type HrWorkflowDecision = HrDecision | "REQUEST_CHANGES";

export type Form = {
  id: number;
  area_id: number;
  cost_center_id?: number | null; // legacy
  created_by_user_id: number;
  created_by_full_name?: string | null;
  status: FormStatus | string;

  created_at?: string | null;
  updated_at?: string | null;

  last_comment?: string | null;
  last_commented_by_role?: string | null;
  last_commented_at?: string | null;

  // HR response (per whole request)
  hr_budget_total?: number | null;
  hr_decision?: HrDecision | null;
  hr_comment?: string | null;
};

export type FormItem = {
  id: number;
  form_id: number;

  // MPK per pozycja
  cost_center_id: number;

  training_category_id: number;
  training_name_id: number;
  business_need_id: number;

  priority: Priority;
  quarter: Quarter;

  employees_count: number;
  employee_full_name?: string | null;

  estimated_cost_per_person: number;
  estimated_hours_per_person: number;

  contact_person?: string | null;
  notes?: string | null;
};

export type FormEvent = {
  id: number;
  created_at: string;
  actor_user_id?: number | null;
  actor_full_name?: string | null;
  actor_role?: string | null;
  action: string;
  from_status?: FormStatus | string | null;
  to_status?: FormStatus | string | null;
  item_id?: number | null;
  comment?: string | null;
  meta?: Record<string, unknown> | null;
};

export type FormDetails = Form & {
  items: FormItem[];
};

// ---- payloady ----
export type FormCreatePayload = {
  area_id: number;
};

export type FormItemCreatePayload = {
  cost_center_id: number;
  training_category_id: number;
  training_name_id: number;
  business_need_id: number;
  priority: Priority;
  quarter: Quarter;

  employees_count: number;
  employee_full_name?: string | null;

  estimated_cost_per_person: number;
  estimated_hours_per_person: number;

  contact_person?: string | null;
  notes?: string | null;
};

export type FormItemUpdatePayload = Partial<FormItemCreatePayload>;

export type HrReplyPayload = {
  decision: HrDecision;
  budget_total?: number | null;
  comment?: string | null;
};

// ---- listy ----
export type FormListResponse = {
  items: Form[];
  total: number;
  limit?: number;
  offset?: number;
};

// ---- paramsy do list ----
export type MyFormsParams = {
  limit?: number;
  offset?: number;
  sort_by?: FormsSortBy;
  sort_dir?: SortDir;
};

export type ManagerInboxParams = {
  limit?: number;
  offset?: number;
  area_id?: number;
  cost_center_id?: number;
  created_by_user_id?: number;
  sort_by?: FormsSortBy;
  sort_dir?: SortDir;
};

export type EditorInboxParams = {
  limit?: number;
  offset?: number;
  area_id?: number;
  sort_by?: FormsSortBy;
  sort_dir?: SortDir;
};

export type HrInboxParams = ManagerInboxParams;

export type HrAdminListParams = ManagerInboxParams & {
  status_value?: FormStatus;
};
