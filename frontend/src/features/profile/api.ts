import { apiFetch } from "@/lib/http";
import type { ChangePasswordPayload, MessageResponse, ProfileResponse, UserPreferencesPayload } from "./types";

export function updateMyPreferences(payload: UserPreferencesPayload) {
  return apiFetch<ProfileResponse>("/users/me/preferences", {
    method: "PATCH",
    auth: true,
    json: payload,
  });
}

export function changeMyPassword(payload: ChangePasswordPayload) {
  return apiFetch<MessageResponse>("/users/me/change-password", {
    method: "POST",
    auth: true,
    json: payload,
  });
}

export function uploadMyAvatar(file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<ProfileResponse>("/users/me/avatar", {
    method: "POST",
    auth: true,
    body: form,
  });
}

export function deleteMyAvatar() {
  return apiFetch<ProfileResponse>("/users/me/avatar", {
    method: "DELETE",
    auth: true,
  });
}
