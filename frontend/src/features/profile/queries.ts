import { useMutation, useQueryClient } from "@tanstack/react-query";

import { changeMyPassword, deleteMyAvatar, updateMyPreferences, uploadMyAvatar } from "./api";

export function useUpdateMyPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateMyPreferences,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}

export function useChangeMyPassword() {
  return useMutation({
    mutationFn: changeMyPassword,
  });
}

export function useUploadMyAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: uploadMyAvatar,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}

export function useDeleteMyAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteMyAvatar,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}
