import { apiFetch } from "@/lib/http";
import type { MailLogRow, MailStatus, MailTestPayload, MailTestResponse } from "./types";

export function getMailStatus() {
  return apiFetch<MailStatus>("/admin/mail/status", { auth: true });
}

export function sendTestMail(payload: MailTestPayload) {
  return apiFetch<MailTestResponse>("/admin/mail/test", {
    method: "POST",
    auth: true,
    json: payload,
  });
}

export function getMailLogs(limit = 10) {
  return apiFetch<MailLogRow[]>(`/admin/mail/logs?limit=${limit}`, { auth: true });
}
