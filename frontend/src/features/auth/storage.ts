// src/features/auth/storage.ts

const ACCESS_KEY = "poap_access_token";
const REFRESH_KEY = "poap_refresh_token";

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setAccessToken(token: string) {
  localStorage.setItem(ACCESS_KEY, token);
}

// ✅ Dodano brakującą funkcję
export function setRefreshToken(token: string) {
  localStorage.setItem(REFRESH_KEY, token);
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}