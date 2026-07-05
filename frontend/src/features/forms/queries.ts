// src/features/forms/queries.ts

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  addItem,
  createForm,
  deleteItem,
  getEditorInbox,
  getForm,
  getFormHistory,
  getHrAdminFormsList,
  getHrInbox,
  getManagerInbox,
  getMyForms,
  hrReply,
  hrRequestChanges,
  listAreas,
  listBusinessNeeds,
  listCostCenters,
  listMyAreas,
  listTrainingCategories,
  listTrainingNames,
  managerApprove,
  managerRequestChanges,
  submitToManager,
  updateItem,
} from "@/features/forms/api";
import type {
  EditorInboxParams,
  FormCreatePayload,
  FormItemCreatePayload,
  FormItemUpdatePayload,
  HrAdminListParams,
  HrInboxParams,
  HrReplyPayload,
  ManagerInboxParams,
  MyFormsParams,
} from "@/features/forms/types";

export const formKeys = {
  myForms: (p: MyFormsParams) => ["forms", "my", p] as const,
  managerInbox: (p: ManagerInboxParams) => ["forms", "manager_inbox", p] as const,
  editorInbox: (p: EditorInboxParams) => ["forms", "editor_inbox", p] as const,
  hrInbox: (p: HrInboxParams) => ["forms", "hr_inbox", p] as const,
  hrAdminList: (p: HrAdminListParams) => ["forms", "list", p] as const,
  one: (id: number) => ["forms", "one", id] as const,
  history: (id: number) => ["forms", "history", id] as const,

  areas: (q?: string) => ["dict", "areas", q ?? ""] as const,
  myAreas: (q?: string) => ["dict", "my_areas", q ?? ""] as const,
  costCenters: (areaId: number, q?: string) => ["dict", "cost_centers", areaId, q ?? ""] as const,
  categories: (q?: string) => ["dict", "training_categories", q ?? ""] as const,
  trainingNames: (catId: number, q?: string) => ["dict", "training_names", catId, q ?? ""] as const,
  businessNeeds: (q?: string) => ["dict", "business_needs", q ?? ""] as const,
};

// ---- forms lists ----
export function useMyForms(params: MyFormsParams, enabled = true) {
  return useQuery({
    queryKey: formKeys.myForms(params),
    queryFn: () => getMyForms(params),
    enabled,
  });
}

export function useManagerInbox(params: ManagerInboxParams, enabled = true) {
  return useQuery({
    queryKey: formKeys.managerInbox(params),
    queryFn: () => getManagerInbox(params),
    enabled,
  });
}

export function useEditorInbox(params: EditorInboxParams, enabled = true) {
  return useQuery({
    queryKey: formKeys.editorInbox(params),
    queryFn: () => getEditorInbox(params),
    enabled,
  });
}

export function useHrInbox(params: HrInboxParams, enabled = true) {
  return useQuery({
    queryKey: formKeys.hrInbox(params),
    queryFn: () => getHrInbox(params),
    enabled,
  });
}

export function useHrAdminFormsList(params: HrAdminListParams, enabled = true) {
  return useQuery({
    queryKey: formKeys.hrAdminList(params),
    queryFn: () => getHrAdminFormsList(params),
    enabled,
  });
}

// ---- single form ----
export function useForm(id: number, enabled = true) {
  return useQuery({
    queryKey: formKeys.one(id),
    queryFn: () => getForm(id),
    enabled,
  });
}

export function useFormHistory(id: number, enabled = true) {
  return useQuery({
    queryKey: formKeys.history(id),
    queryFn: () => getFormHistory(id),
    enabled,
  });
}

// ---- dicts ----
export function useAreas(q?: string, enabled = true) {
  return useQuery({
    queryKey: formKeys.areas(q),
    queryFn: () => listAreas(q),
    enabled,
  });
}

export function useMyAreas(enabled = true, q?: string) {
  return useQuery({
    queryKey: formKeys.myAreas(q),
    queryFn: () => listMyAreas(q),
    enabled,
  });
}

export function useCostCentersSearch(areaId: number | null, q: string, enabled = true) {
  return useQuery({
    queryKey: formKeys.costCenters(areaId ?? 0, q),
    queryFn: () => listCostCenters(areaId!, q),
    enabled: enabled && !!areaId,
  });
}

export function useCostCentersAll(areaId: number | null, enabled = true) {
  return useQuery({
    queryKey: formKeys.costCenters(areaId ?? 0, ""),
    queryFn: () => listCostCenters(areaId!, undefined),
    enabled: enabled && !!areaId,
  });
}

export function useTrainingCategories(q?: string, enabled = true) {
  return useQuery({
    queryKey: formKeys.categories(q),
    queryFn: () => listTrainingCategories(q),
    enabled,
  });
}

export function useTrainingNames(categoryId: number | null, q?: string, enabled = true) {
  return useQuery({
    queryKey: formKeys.trainingNames(categoryId ?? 0, q ?? ""),
    queryFn: () => listTrainingNames(categoryId!, q),
    enabled: enabled && !!categoryId,
  });
}

export function useBusinessNeeds(q?: string, enabled = true) {
  return useQuery({
    queryKey: formKeys.businessNeeds(q),
    queryFn: () => listBusinessNeeds(q),
    enabled,
  });
}

// ---- mutations ----
export function useCreateForm() {
  return useMutation({
    mutationFn: (payload: FormCreatePayload) => createForm(payload),
  });
}

export function useAddItem(formId: number) {
  return useMutation({
    mutationFn: (payload: FormItemCreatePayload) => addItem(formId, payload),
  });
}

export function useUpdateItem(formId: number, itemId: number) {
  return useMutation({
    mutationFn: (payload: FormItemUpdatePayload) => updateItem(formId, itemId, payload),
  });
}

export function useDeleteItem(formId: number, itemId: number) {
  return useMutation({
    mutationFn: () => deleteItem(formId, itemId),
  });
}

export function useSubmitToManager(formId: number) {
  return useMutation({
    mutationFn: () => submitToManager(formId),
  });
}

export function useManagerApprove(formId: number) {
  return useMutation({
    mutationFn: () => managerApprove(formId),
  });
}

export function useManagerRequestChanges(formId: number) {
  return useMutation({
    mutationFn: (payload: { comment: string }) => managerRequestChanges(formId, payload.comment),
  });
}

export function useHrReplyForm(formId: number) {
  return useMutation({
    mutationFn: (payload: HrReplyPayload) => hrReply(formId, payload),
  });
}

export function useHrRequestChanges(formId: number) {
  return useMutation({
    mutationFn: (payload: { comment: string }) => hrRequestChanges(formId, payload.comment),
  });
}

// ---- kompatybilne aliasy (ułatwiają użycie w widokach) ----
export function useFormById(id: number, enabled = true) {
  return useForm(id, enabled);
}

export function useCostCentersForArea(areaId: number | null, q?: string, enabled = true) {
  const query = (q ?? "").trim();
  // Jeśli jest fraza – odpalamy search-as-you-type; w przeciwnym razie pobieramy pełną listę
  return query ? useCostCentersSearch(areaId, query, enabled) : useCostCentersAll(areaId, enabled);
}

export function useHrReply(formId: number) {
  return useHrReplyForm(formId);
}
