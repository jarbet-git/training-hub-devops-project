export type MandatoryTrainingStatusBucket = "expired" | "due_7" | "due_30" | "ok" | "indefinite";

export type MandatoryTrainingImportSummary = {
  filename: string | null;
  imported_at: string | null;
  imported_by_user_id: number | null;
  imported_by_full_name: string | null;
  rows_total: number;
  rows_imported: number;
  rows_skipped: number;
  rows_unmapped: number;
  total_records: number;
  expired_count: number;
  due_in_7_count: number;
  due_in_30_count: number;
  indefinite_count: number;
  unmapped_cost_center_codes: string[];
};

export type MandatoryTrainingSummary = {
  total: number;
  expired: number;
  due_in_7: number;
  due_in_30: number;
  indefinite: number;
  imported_at: string | null;
  imported_filename: string | null;
};

export type MandatoryTrainingRow = {
  id: number;
  employee_id: string;
  local_sap_id: string | null;
  employee_name: string;
  cost_center_code: string;
  cost_center_name: string | null;
  area_id: number | null;
  is_mapped: boolean;
  training_name: string;
  cost_per_person: number | null;
  start_date: string | null;
  expiration_date: string | null;
  days_to_expiration: number | null;
  completion_status: string | null;
  mandatory_training_by: string | null;
  status_bucket: MandatoryTrainingStatusBucket;
};

export type MandatoryTrainingListResponse = {
  items: MandatoryTrainingRow[];
  total: number;
  limit: number;
  offset: number;
};
