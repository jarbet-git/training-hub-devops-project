import { ApiError } from "@/lib/http";

export function safeErr(e: unknown): string {
  if (e instanceof ApiError) {
    const detail = (e.detail && typeof e.detail === "object") ? (e.detail as any).detail : undefined;
    if (typeof detail === "string" && detail.trim()) return detail;
    return `HTTP ${e.status}${e.statusText ? ` ${e.statusText}` : ""}`;
  }

  if (e instanceof Error) return e.message;

  if (typeof e === "string") return e;

  try {
    return JSON.stringify(e);
  } catch {
    return "Unknown error";
  }
}
