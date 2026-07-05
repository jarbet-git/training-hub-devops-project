// src/features/auth/context.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Role, User } from "./types";
import { loginApi, meApi } from "./api";
import { clearTokens, getAccessToken, setTokens } from "./storage";

type RoleFlags = {
  isAdmin: boolean;
  isHr: boolean;
  isManager: boolean;
  isEditor: boolean;
};

type AuthState = {
  user: User | null;
  loading: boolean;
  roleFlags: RoleFlags;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function roleFlagsFrom(user: User | null): RoleFlags {
  const role = (user?.role ?? "").toUpperCase() as Role;
  return {
    isAdmin: role === "ADMIN",
    isHr: role === "HR" || role === "ADMIN",
    isManager: role === "MANAGER" || role === "ADMIN",
    isEditor: role === "EDITOR" || role === "ADMIN",
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshMe() {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      return;
    }
    const u = await meApi();
    setUser(u);
  }

  async function safeRefreshMe() {
    try {
      await refreshMe();
    } catch {
      // np. token wygasł / backend zwrócił 401
      clearTokens();
      setUser(null);
    }
  }

  async function login(email: string, password: string) {
    const tokens = await loginApi(email, password);
    setTokens(tokens.access_token, tokens.refresh_token);
    await safeRefreshMe();
  }

  function logout() {
    clearTokens();
    setUser(null);
  }

  useEffect(() => {
    (async () => {
      await safeRefreshMe();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthState>(() => {
    return {
      user,
      loading,
      roleFlags: roleFlagsFrom(user),
      login,
      logout,
      refreshMe: safeRefreshMe,
    };
  }, [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
