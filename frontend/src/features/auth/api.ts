import { apiFetch } from "@/lib/http";
import type { ActivationValidation, TokenResponse, User } from "./types";

export function loginApi(email: string, password: string) {
  return apiFetch<TokenResponse>("/auth/login", { method: "POST", json: { email, password } });
}

export function meApi() {
  return apiFetch<User>("/users/me", { method: "GET", auth: true });
}

export function forgotPasswordApi(email: string) {
  return apiFetch<{ message: string }>("/auth/forgot-password", { method: "POST", json: { email } });
}

export function validateResetTokenApi(token: string) {
  return apiFetch<{ valid: boolean; message?: string | null }>(`/auth/reset-password/validate?token=${encodeURIComponent(token)}`, { method: "GET" });
}

export function resetPasswordApi(token: string, newPassword: string) {
  return apiFetch<{ message: string }>("/auth/reset-password", { method: "POST", json: { token, new_password: newPassword } });
}

export function validateActivationTokenApi(token: string) {
  return apiFetch<ActivationValidation>(`/auth/activate-account/validate?token=${encodeURIComponent(token)}`, { method: "GET" });
}

export function completeActivationApi(token: string, password: string) {
  return apiFetch<{ message: string }>("/auth/activate-account", { method: "POST", json: { token, password } });
}
