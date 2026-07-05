export type TrainingProposalStatus = "SUBMITTED" | "APPROVED" | "LINKED" | "REJECTED";

export type TrainingProposal = {
  id: number;
  name: string;
  name_en?: string | null;
  justification: string;
  suggested_category_id?: number | null;
  provider?: string | null;
  external_url?: string | null;
  estimated_cost_per_person?: number | null;
  estimated_hours_per_person?: number | null;
  notes?: string | null;
  status: TrainingProposalStatus | string;
  requester_user_id: number;
  requester_role: string;
  requester_full_name?: string | null;
  form_id?: number | null;
  review_comment?: string | null;
  reviewed_by_user_id?: number | null;
  reviewed_by_full_name?: string | null;
  reviewed_at?: string | null;
  linked_training_name_id?: number | null;
  linked_training_name_pl?: string | null;
  linked_training_name_en?: string | null;
  approved_training_name_id?: number | null;
  approved_training_name_pl?: string | null;
  approved_training_name_en?: string | null;
  created_at: string;
};

export type TrainingProposalCreatePayload = {
  name: string;
  name_en?: string | null;
  justification: string;
  suggested_category_id?: number | null;
  provider?: string | null;
  external_url?: string | null;
  estimated_cost_per_person?: number | null;
  estimated_hours_per_person?: number | null;
  notes?: string | null;
  form_id?: number | null;
};

export type TrainingProposalApprovePayload = {
  category_id: number;
  name_pl: string;
  name_en?: string | null;
  default_cost_per_person: number;
  default_hours_per_person: number;
  review_comment?: string | null;
};

export type TrainingProposalLinkPayload = {
  training_name_id: number;
  review_comment?: string | null;
};

export type TrainingProposalRejectPayload = {
  review_comment: string;
};
