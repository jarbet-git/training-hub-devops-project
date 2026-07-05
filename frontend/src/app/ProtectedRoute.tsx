// src/app/ProtectedRoute.tsx
import { Navigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/features/auth/context";
import { LoginPage } from "@/views/LoginPage";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="min-h-dvh grid place-items-center bg-muted/30">
        <motion.div
          initial={{ opacity: 0, y: 10, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border bg-background/80 px-6 py-5 shadow-sm backdrop-blur"
        >
          <div className="text-sm font-semibold">Training Hub</div>
          <div className="mt-1 text-xs text-muted-foreground">Ładowanie sesji…</div>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    if (loc.pathname === "/") return <LoginPage />;
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }
  if (!user.is_active) return <Navigate to="/forbidden" replace />;

  return <>{children}</>;
}
