// src/app/RoleGuard.tsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/context";

type Role = "ADMIN" | "HR" | "MANAGER" | "EDITOR";

type RoleGuardProps = {
  allow: Role[];
  children: React.ReactNode;
};

export function RoleGuard({ allow, children }: RoleGuardProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Ładowanie…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const role = (user.role ?? "").toUpperCase() as Role;
  if (!allow.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
