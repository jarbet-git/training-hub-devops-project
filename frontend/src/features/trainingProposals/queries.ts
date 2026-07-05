import { useMutation, useQuery } from "@tanstack/react-query";
import {
  approveTrainingProposal,
  createTrainingProposal,
  getHrTrainingProposals,
  getMyTrainingProposals,
  linkTrainingProposal,
  markReviewedTrainingProposalNotificationsSeen,
  rejectTrainingProposal,
} from "./api";
import type {
  TrainingProposalApprovePayload,
  TrainingProposalCreatePayload,
  TrainingProposalLinkPayload,
  TrainingProposalRejectPayload,
  TrainingProposalStatus,
} from "./types";

export const trainingProposalKeys = {
  my: (status?: TrainingProposalStatus) => ["training-proposals", "my", status ?? "all"] as const,
  hr: (status?: TrainingProposalStatus) => ["training-proposals", "hr", status ?? "all"] as const,
  all: () => ["training-proposals"] as const,
};

export function useMyTrainingProposals(status?: TrainingProposalStatus, enabled = true) {
  return useQuery({
    queryKey: trainingProposalKeys.my(status),
    queryFn: () => getMyTrainingProposals(status),
    enabled,
  });
}

export function useHrTrainingProposals(status?: TrainingProposalStatus, enabled = true) {
  return useQuery({
    queryKey: trainingProposalKeys.hr(status),
    queryFn: () => getHrTrainingProposals(status),
    enabled,
  });
}

export function useCreateTrainingProposal() {
  return useMutation({ mutationFn: (payload: TrainingProposalCreatePayload) => createTrainingProposal(payload) });
}

export function useApproveTrainingProposal() {
  return useMutation({ mutationFn: ({ id, payload }: { id: number; payload: TrainingProposalApprovePayload }) => approveTrainingProposal(id, payload) });
}

export function useLinkTrainingProposal() {
  return useMutation({ mutationFn: ({ id, payload }: { id: number; payload: TrainingProposalLinkPayload }) => linkTrainingProposal(id, payload) });
}

export function useRejectTrainingProposal() {
  return useMutation({ mutationFn: ({ id, payload }: { id: number; payload: TrainingProposalRejectPayload }) => rejectTrainingProposal(id, payload) });
}


export function useMarkReviewedTrainingProposalNotificationsSeen() {
  return useMutation({ mutationFn: () => markReviewedTrainingProposalNotificationsSeen() });
}
