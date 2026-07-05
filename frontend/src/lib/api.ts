import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "@/features/auth/auth.utils";

type ApiError = {
  status: number;
  message: string;
  details?: unknown;
};

let refreshingPromise: Promise<string | null> | null = null;

async function tryRefreshToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  if (!refreshingPromise) {
    refreshingPromise = (async () => {
      try {
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refresh }),
        });

        if (!res.ok) {
          clearTokens();
          return null;
        }

        const data = (await res.json()) as { access_token: string; refresh_token: string };
        setTokens(data.access_token, data.refresh_token);
        return data.access_token;
      } catch {
        clearTokens();
        return null;
      } finally {
        refreshingPromise = null;
      }
    })();
  }

  return refreshingPromise;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { json?: unknown }
): Promise<T> {
  const headers = new Headers(init?.headers);

  if (!headers.has("Content-Type") && init?.json !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const access = getAccessToken();
  if (access) headers.set("Authorization", `Bearer ${access}`);

  const doRequest = async (): Promise<Response> => {
    return fetch(`/api${path}`, {
      ...init,
      headers,
      body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
    });
  };

  let res = await doRequest();

  if (res.status === 401) {
    const newAccess = await tryRefreshToken();
    if (!newAccess) {
      const err: ApiError = { status: 401, message: "Not authenticated" };
      throw err;
    }
    headers.set("Authorization", `Bearer ${newAccess}`);
    res = await doRequest();
  }

  if (!res.ok) {
    let details: unknown = undefined;
    try {
      details = await res.json();
    } catch {
      // ignore
    }

    const err: ApiError = {
      status: res.status,
      message: (details as any)?.detail ?? res.statusText ?? "Request failed",
      details,
    };
    throw err;
  }

  return (await res.json()) as T;
}

// Used for endpoints that return non-JSON payloads (e.g., file downloads).
export async function apiFetchResponse(
  path: string,
  init: RequestInit & { json?: unknown } = {}
): Promise<Response> {
  // Default: same-origin API mounted under "/api".
  // Allow absolute URLs if you ever need to hit a different host.
  const url = path.startsWith("http") ? path : `/api${path}`;
  const headers = new Headers(init.headers || {});
  headers.set("Accept", "*/*");

  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
  }


  const doFetch = () =>
    fetch(url, {
      ...init,
      headers,
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
    });

  let res = await doFetch();

  // try refresh on 401 once
  if (res.status === 401) {
    const newAccess = await tryRefreshToken();
    if (newAccess) {
      headers.set("Authorization", `Bearer ${newAccess}`);
      res = await doFetch();
    }
  }

  if (!res.ok) {
    let details: unknown = undefined;
    let message = res.statusText || `HTTP ${res.status}`;
    try {
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        details = await res.clone().json();
        message = (details as any)?.detail || (details as any)?.message || message;
      } else {
        const txt = await res.clone().text();
        if (txt) message = txt;
        details = txt;
      }
    } catch {
      // ignore
    }

    const err: ApiError = { status: res.status, message, details };
    throw err;
  }

  return res;
}
