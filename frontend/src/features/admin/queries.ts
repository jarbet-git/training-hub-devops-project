// src/features/admin/queries.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminCreateArea,
  adminCreateBusinessNeed,
  adminCreateCostCenter,
  adminCreateTrainingCategory,
  adminCreateTrainingName,
  adminCreateUser,
  adminGenerateUserActivationLink,
  adminResendUserInvite,
adminDeleteArea,
  adminDeleteBusinessNeed,
  adminDeleteCostCenter,
  adminDeleteTrainingCategory,
  adminDeleteTrainingName,
  adminGetCollectionWindow,
  adminGetMandatoryTrainingImportSummary,
  adminImportMandatoryTrainingFile,
  adminListAreas,
  adminListBusinessNeeds,
  adminListCostCenters,
  adminListTrainingCategories,
  adminListTrainingNames,
  adminSearchTrainingNames,
  adminListUsers,
  adminSetCollectionWindow,
  adminUpdateArea,
  adminUpdateBusinessNeed,
  adminUpdateCostCenter,
  adminUpdateTrainingCategory,
  adminUpdateTrainingName,
  adminUpdateUser,
} from "./api";
import type {
  AdminUserCreate,
  AdminUserUpdate,
  AreaAdminCreate,
  AreaAdminUpdate,
  BusinessNeedCreate,
  BusinessNeedUpdate,
  CostCenterAdminCreate,
  CostCenterAdminUpdate,
  TrainingCategoryCreate,
  TrainingCategoryUpdate,
  TrainingNameCreate,
  TrainingNameUpdate,
} from "./types";

export const adminKeys = {
  users: (params?: { q?: string; role?: string; area_id?: number | null }) => ["admin", "users", params] as const,
  areas: () => ["admin", "areas"] as const,
  costCenters: (params?: { area_id?: number | null; q?: string }) => ["admin", "costCenters", params] as const,
  trainingCategories: () => ["admin", "trainingCategories"] as const,
  trainingNames: (catId: number, q?: string) => ["admin", "trainingNames", catId, q ?? ""] as const,
  trainingNamesSearch: (params: { q?: string; category_id?: number | null; limit?: number }) => ["admin", "trainingNamesSearch", params] as const,
  businessNeeds: () => ["admin", "businessNeeds"] as const,
  collectionWindow: () => ["admin", "collectionWindow"] as const,
  mandatoryTrainingImportSummary: () => ["admin", "mandatoryTrainingImportSummary"] as const,
};

// USERS
export function useAdminUsers(params?: { q?: string; role?: string; area_id?: number | null }) {
  return useQuery({ queryKey: adminKeys.users(params), queryFn: () => adminListUsers(params) });
}

export function useAdminCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminUserCreate) => adminCreateUser(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useAdminUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, payload }: { userId: number; payload: AdminUserUpdate }) => adminUpdateUser(userId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useAdminResendUserInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => adminResendUserInvite(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useAdminGenerateUserActivationLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => adminGenerateUserActivationLink(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

// COLLECTION WINDOW
export function useAdminCollectionWindow() {
  return useQuery({ queryKey: adminKeys.collectionWindow(), queryFn: () => adminGetCollectionWindow() });
}

export function useAdminSetCollectionWindow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (is_open: boolean) => adminSetCollectionWindow(is_open),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.collectionWindow() }),
  });
}

// AREAS
export function useAdminAreas() {
  return useQuery({ queryKey: adminKeys.areas(), queryFn: () => adminListAreas() });
}

export function useAdminCreateArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AreaAdminCreate) => adminCreateArea(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.areas() }),
  });
}

export function useAdminUpdateArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ areaId, payload }: { areaId: number; payload: AreaAdminUpdate }) => adminUpdateArea(areaId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.areas() }),
  });
}

export function useAdminDeleteArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (areaId: number) => adminDeleteArea(areaId),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.areas() }),
  });
}

// COST CENTERS
export function useAdminCostCenters(params?: { area_id?: number | null; q?: string; limit?: number }, enabled = true) {
  return useQuery({
    queryKey: adminKeys.costCenters(params),
    queryFn: () => adminListCostCenters(params ?? {}),
    enabled,
  });
}

export function useAdminCreateCostCenter(areaId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CostCenterAdminCreate) => adminCreateCostCenter(areaId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "costCenters"] }),
  });
}

export function useAdminUpdateCostCenter(_areaId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ccId, payload }: { ccId: number; payload: CostCenterAdminUpdate }) => adminUpdateCostCenter(ccId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "costCenters"] }),
  });
}

export function useAdminDeleteCostCenter(_areaId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ccId: number) => adminDeleteCostCenter(ccId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "costCenters"] }),
  });
}

// TRAINING CATEGORIES
export function useAdminTrainingCategories() {
  return useQuery({ queryKey: adminKeys.trainingCategories(), queryFn: () => adminListTrainingCategories() });
}

export function useAdminCreateTrainingCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: TrainingCategoryCreate) => adminCreateTrainingCategory(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.trainingCategories() }),
  });
}

export function useAdminUpdateTrainingCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ catId, payload }: { catId: number; payload: TrainingCategoryUpdate }) => adminUpdateTrainingCategory(catId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.trainingCategories() }),
  });
}

export function useAdminDeleteTrainingCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (catId: number) => adminDeleteTrainingCategory(catId),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.trainingCategories() }),
  });
}

// TRAINING NAMES
export function useAdminTrainingNames(catId: number, q?: string, enabled = true) {
  return useQuery({
    queryKey: adminKeys.trainingNames(catId, q),
    queryFn: () => adminListTrainingNames(catId, q),
    enabled: enabled && !!catId,
  });
}

export function useAdminTrainingNamesSearch(params: { q?: string; category_id?: number | null; limit?: number }, enabled = true) {
  return useQuery({
    queryKey: adminKeys.trainingNamesSearch(params),
    queryFn: () => adminSearchTrainingNames(params),
    enabled,
  });
}

export function useAdminCreateTrainingName(catId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: TrainingNameCreate) => adminCreateTrainingName(catId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "trainingNames"] });
      qc.invalidateQueries({ queryKey: ["admin", "trainingNamesSearch"] });
    },
  });
}

export function useAdminUpdateTrainingName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tnId, payload }: { tnId: number; payload: TrainingNameUpdate }) => adminUpdateTrainingName(tnId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "trainingNames"] });
      qc.invalidateQueries({ queryKey: ["admin", "trainingNamesSearch"] });
    },
  });
}

export function useAdminDeleteTrainingName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tnId: number) => adminDeleteTrainingName(tnId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "trainingNames"] });
      qc.invalidateQueries({ queryKey: ["admin", "trainingNamesSearch"] });
    },
  });
}

// BUSINESS NEEDS
export function useAdminBusinessNeeds() {
  return useQuery({ queryKey: adminKeys.businessNeeds(), queryFn: () => adminListBusinessNeeds() });
}

export function useAdminCreateBusinessNeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BusinessNeedCreate) => adminCreateBusinessNeed(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.businessNeeds() }),
  });
}

export function useAdminUpdateBusinessNeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: BusinessNeedUpdate }) => adminUpdateBusinessNeed(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.businessNeeds() }),
  });
}

export function useAdminDeleteBusinessNeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => adminDeleteBusinessNeed(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.businessNeeds() }),
  });
}


export function useAdminMandatoryTrainingImportSummary() {
  return useQuery({
    queryKey: adminKeys.mandatoryTrainingImportSummary(),
    queryFn: () => adminGetMandatoryTrainingImportSummary(),
  });
}

export function useAdminImportMandatoryTrainingFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => adminImportMandatoryTrainingFile(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "mandatoryTrainingImportSummary"] });
      qc.invalidateQueries({ queryKey: ["mandatory-trainings"] });
      qc.invalidateQueries({ queryKey: ["notifications", "summary"] });
    },
  });
}
