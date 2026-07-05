import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from "@/features/auth/storage";

// Backward-compat: some earlier builds used VITE_API_BASE_URL
export const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ??
  (import.meta as any).env?.VITE_API_BASE ??
  "/api";

export type ApiFetchOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  auth?: boolean;
  json?: unknown;
  body?: BodyInit;
  headers?: Record<string, string>;
  /**
   * Internal: disable refresh retry.
   * (Used to avoid infinite loops when calling /auth/refresh).
   */
  _noRetry?: boolean;
};

export class ApiError extends Error {
  status: number;
  statusText: string;
  detail?: unknown;

  constructor(status: number, statusText: string, message: string, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.statusText = statusText;
    this.detail = detail;
  }
}

async function readBody(res: Response): Promise<unknown> {
  const ct = res.headers.get("content-type") ?? "";
  if (res.status === 204) return null;

  try {
    if (ct.includes("application/json")) return await res.json();
    const t = await res.text();
    return t ? t : null;
  } catch {
    return null;
  }
}

function extractMessage(status: number, statusText: string, data: unknown): string {
  const detail = data && typeof data === "object" ? (data as any).detail : data;
  if (typeof detail === "string" && detail.trim()) {
  const msg = detail.trim();

  // Localize known backend messages based on selected UI language.
  // (Backend messages are in EN; we translate a few key ones for PL UX.)
  const lang = (localStorage.getItem("poap_lang") as any) || "pl";
  if (lang === "pl") {
    const m = msg.match(/^Cannot delete: ([A-Za-z]+) is used by existing forms\/items$/);
    if (m) {
      const entity = m[1];
      const entityPl: Record<string, string> = {
        Area: "Obszar",
        CostCenter: "Centrum kosztowe (MPK)",
        TrainingCategory: "Kategoria szkolenia",
        TrainingName: "Nazwa szkolenia",
        BusinessNeed: "Potrzeba biznesowa",
      };
      const name = entityPl[entity] ?? entity;
      return `Nie można usunąć: ${name} jest używany w istniejących wnioskach/pozycjach.`;
    }

    if (msg === "Form already submitted to HR and cannot be deleted.") {
      return "Nie można usunąć: wniosek jest już w HR lub był już przekazany do HR.";
    }
    if (msg === "Form cannot be deleted in this status.") {
      return "Nie można usunąć wniosku w tym statusie.";
    }

    if (msg === "Cost center code already exists") {
      return "Nie można zapisać: kod MPK już istnieje w innym obszarze.";
    }
    if (msg === "Cost center code already exists in this area") {
      // legacy message; keep it friendly
      return "Nie można zapisać: kod MPK już istnieje w tym obszarze.";
    }
    if (msg === "Area code already exists") {
      return "Nie można zapisać: kod obszaru już istnieje.";
    }
  }

  return msg;
}
  if (Array.isArray(detail)) {
    // FastAPI validation errors can be a list
    const first = detail?.[0];
    if (first && typeof first === "object") {
      const msg = (first as any).msg;
      if (typeof msg === "string" && msg.trim()) return msg;
    }
  }
  return `HTTP ${status} ${statusText || ""}`.trim();
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });

    const data = await readBody(res);
    if (!res.ok) return false;

    const accessToken = (data as any)?.access_token;
    const refreshToken = (data as any)?.refresh_token;
    if (typeof accessToken === "string" && accessToken) setAccessToken(accessToken);
    if (typeof refreshToken === "string" && refreshToken) setRefreshToken(refreshToken);

    return Boolean(accessToken);
  } catch {
    return false;
  }
}

async function ensureRefreshedOnce(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = refreshTokens().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function apiFetch<T>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
  const url = `${API_BASE}${path}`;

  const headers: Record<string, string> = {
    ...(opts.headers ?? {}),
  };

  if (opts.auth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let body: BodyInit | undefined = opts.body;
  if (opts.json !== undefined) {
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
    body = JSON.stringify(opts.json);
  }

  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers,
    body,
  });

  // Auto refresh once on 401 for authenticated calls
  if (res.status === 401 && opts.auth && !opts._noRetry) {
    const ok = await ensureRefreshedOnce();
    if (!ok) {
      clearTokens();
    } else {
      return apiFetch<T>(path, { ...opts, _noRetry: true });
    }
  }

  const data = await readBody(res);
  if (!res.ok) {
    throw new ApiError(res.status, res.statusText, extractMessage(res.status, res.statusText, data), data);
  }

  return (data as T) ?? (null as T);
}

export async function apiFetchBlob(path: string, opts: ApiFetchOptions = {}): Promise<Blob> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    ...(opts.headers ?? {}),
  };

  if (opts.auth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body,
  });

  if (res.status === 401 && opts.auth && !opts._noRetry) {
    const ok = await ensureRefreshedOnce();
    if (ok) return apiFetchBlob(path, { ...opts, _noRetry: true });
    clearTokens();
  }

  if (!res.ok) {
    const data = await readBody(res);
    throw new ApiError(res.status, res.statusText, extractMessage(res.status, res.statusText, data), data);
  }

  return await res.blob();
}


// Like apiFetchBlob, but also returns the Response (e.g., to read headers like Content-Disposition).
export async function apiFetchBlobWithMeta(path: string, init: RequestInit = {}): Promise<{ blob: Blob; res: Response }> {
  // Same-origin downloads should use relative "/api" (Vite proxy / reverse proxy).
  // Allow absolute URLs when needed.
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  const headers = new Headers(init.headers || {});
  headers.set("Accept", "*/*");

  const setAuth = () => {
    const access = getAccessToken();
    if (access) headers.set("Authorization", `Bearer ${access}`);
    else headers.delete("Authorization");
  };

  setAuth();

  const doFetch = () => fetch(url, { ...init, headers });

  let res = await doFetch();

  // Retry once on 401 (refresh)
  if (res.status === 401) {
    const ok = await ensureRefreshedOnce();
    if (ok) {
      setAuth();
      res = await doFetch();
    }
  }

  if (!res.ok) {
    const data = await readBody(res);
    throw new ApiError(res.status, res.statusText, extractMessage(res.status, res.statusText, data), data);
  }

  return { blob: await res.blob(), res };
}
