// src/features/admin/types.ts

export type Role = "EDITOR" | "MANAGER" | "HR" | "ADMIN";

export type AdminUser = {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  is_pending_activation: boolean;
  activated_at?: string | null;
  area_ids: number[];
};

export type AdminUserCreate = {
  email: string;
  full_name?: string;
  role: Role;
  is_active: boolean;
  area_ids: number[];
};

export type AdminUserUpdate = {
  email?: string;
  full_name?: string;
  role?: Role;
  is_active?: boolean;
  area_ids?: number[];
};

export type UserInviteActionResponse = {
  message: string;
  email_sent: boolean;
  user: AdminUser;
  activation_link?: string | null;
  expires_at?: string | null;
};

export type UserActivationLinkResponse = {
  activation_link: string;
  expires_at: string;
};

export type AreaAdmin = {
  id: number;
  code: string;
  name_pl: string | null;
  name_en: string | null;
};

export type AreaAdminCreate = {
  code: string;
  name_pl: string;
  name_en: string;
};

export type AreaAdminUpdate = {
  code?: string;
  name_pl?: string | null;
  name_en?: string | null;
};

export type CostCenterAdmin = {
  id: number;
  area_id: number;
  code: string;
  name_pl: string | null;
  name_en: string | null;
};

export type CostCenterAdminCreate = {
  code: string;
  name_pl: string;
  name_en: string;
};

export type CostCenterAdminUpdate = {
  code?: string;
  name_pl?: string | null;
  name_en?: string | null;
};

export type TrainingCategoryAdmin = {
  id: number;
  name_pl: string;
  name_en: string;
};

export type TrainingCategoryCreate = {
  name_pl: string;
  name_en: string;
};

export type TrainingCategoryUpdate = {
  name_pl?: string;
  name_en?: string;
};

export type TrainingNameAdmin = {
  id: number;
  category_id: number;
  name_pl: string;
  name_en: string;
  default_cost_per_person: number;
  default_hours_per_person: number;
};

export type TrainingNameCreate = {
  name_pl: string;
  name_en: string;
  default_cost_per_person: number;
  default_hours_per_person: number;
};

export type TrainingNameUpdate = {
  name_pl?: string;
  name_en?: string;
  default_cost_per_person?: number;
  default_hours_per_person?: number;
};

export type BusinessNeedAdmin = {
  id: number;
  name_pl: string;
  name_en: string;
};

export type BusinessNeedCreate = {
  name_pl: string;
  name_en: string;
};

export type BusinessNeedUpdate = {
  name_pl?: string;
  name_en?: string;
};

export type CollectionWindow = {
  is_open: boolean;
  updated_at?: string | null;
};
