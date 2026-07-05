import { apiFetch } from "@/lib/api";
import type { TokenResponse, User } from "./auth.types";

export function loginApi(email: string, password: string) {
  return apiFetch<TokenResponse>("/auth/login", {
    method: "POST",
    json: { email, password },
  });
}

export function meApi() {
  return apiFetch<User>("/users/me", { method: "GET" });
}
