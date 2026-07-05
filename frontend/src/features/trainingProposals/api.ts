import { apiFetch } from "@/lib/http";
import type {
  TrainingProposal,
  TrainingProposalApprovePayload,
  TrainingProposalCreatePayload,
  TrainingProposalLinkPayload,
  TrainingProposalRejectPayload,
  TrainingProposalStatus,
} from "./types";

function withParams(path: string, params: Record<string, unknown>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}

export async function createTrainingProposal(payload: TrainingProposalCreatePayload): Promise<TrainingProposal> {
  return apiFetch<TrainingProposal>("/training-proposals", { auth: true, method: "POST", json: payload });
}

export async function getMyTrainingProposals(status?: TrainingProposalStatus): Promise<TrainingProposal[]> {
  return apiFetch<TrainingProposal[]>(withParams("/training-proposals/my", { status }), { auth: true });
}

export async function getHrTrainingProposals(status?: TrainingProposalStatus): Promise<TrainingProposal[]> {
  return apiFetch<TrainingProposal[]>(withParams("/training-proposals/hr/inbox", { status }), { auth: true });
}

export async function approveTrainingProposal(id: number, payload: TrainingProposalApprovePayload): Promise<TrainingProposal> {
  return apiFetch<TrainingProposal>(`/training-proposals/${id}/approve`, { auth: true, method: "POST", json: payload });
}

export async function linkTrainingProposal(id: number, payload: TrainingProposalLinkPayload): Promise<TrainingProposal> {
  return apiFetch<TrainingProposal>(`/training-proposals/${id}/link`, { auth: true, method: "POST", json: payload });
}

export async function rejectTrainingProposal(id: number, payload: TrainingProposalRejectPayload): Promise<TrainingProposal> {
  return apiFetch<TrainingProposal>(`/training-proposals/${id}/reject`, { auth: true, method: "POST", json: payload });
}


export async function markReviewedTrainingProposalNotificationsSeen(): Promise<{ updated: number }> {
  return apiFetch<{ updated: number }>("/training-proposals/my/mark-reviewed-seen", { auth: true, method: "POST" });
}
