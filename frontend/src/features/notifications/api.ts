import { apiFetch } from "@/lib/http";
import type { NotificationSummary } from "./types";

export async function getNotificationSummary(): Promise<NotificationSummary> {
  return apiFetch<NotificationSummary>("/notifications/summary", { auth: true });
}

export async function markAllNotificationsRead(): Promise<{ updated: number }> {
  return apiFetch<{ updated: number }>("/notifications/mark-all-read", { auth: true, method: "POST" });
}


export async function markNotificationScopesRead(scopes: string[], formIds?: number[]): Promise<{ updated: number }> {
  return apiFetch<{ updated: number }>("/notifications/mark-read", {
    auth: true,
    method: "POST",
    json: { scopes, form_ids: formIds ?? [] },
  });
}
