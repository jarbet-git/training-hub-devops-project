import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CheckCircle2, KeyRound, Lock, MailWarning } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PublicLanguageSwitcher } from "@/components/PublicLanguageSwitcher";
import { useI18n } from "@/app/i18n";
import { completeActivationApi, validateActivationTokenApi } from "@/features/auth/api";
import type { ActivationValidation } from "@/features/auth/types";

function friendlyActivationError(message: string, t: (key: string, vars?: Record<string, string | number>) => string) {
  const m = message.toLowerCase();
  if (m.includes("expired")) return t("auth.activation.expired");
  if (m.includes("invalid")) return t("auth.activation.invalid");
  if (m.includes("network") || m.includes("failed to fetch")) return t("auth.activation.networkError");
  return message || t("common.error");
}

export function ActivateAccountPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { t } = useI18n();

  const token = (params.get("token") || "").trim();
  const [validation, setValidation] = React.useState<ActivationValidation | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!token) {
        setError(t("auth.activation.invalid"));
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const res = await validateActivationTokenApi(token);
        if (cancelled) return;
        if (!res.valid) {
          setError(friendlyActivationError(String(res.message ?? ""), t));
          setValidation(null);
          return;
        }
        setValidation(res);
      } catch (err: any) {
        if (cancelled) return;
        setError(friendlyActivationError(String(err?.message ?? ""), t));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [token, t]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validation || saving) return;
    if (password.length < 8) {
      toast.error(t("auth.activation.passwordTooShort"));
      return;
    }
    if (password !== confirmPassword) {
      toast.error(t("auth.activation.passwordMismatch"));
      return;
    }

    setSaving(true);
    try {
      await completeActivationApi(token, password);
      setDone(true);
      toast.success(t("auth.activation.successToast"));
    } catch (err: any) {
      const msg = friendlyActivationError(String(err?.message ?? ""), t);
      setError(msg);
      toast.error(t("auth.activation.submitError"), { description: msg });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PublicLanguageSwitcher />
      <div className="min-h-dvh grid place-items-center bg-muted/30 p-4">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(60rem_40rem_at_20%_10%,hsl(var(--primary)/0.18),transparent_60%),radial-gradient(50rem_35rem_at_90%_20%,hsl(var(--ring)/0.12),transparent_55%)]" />

      <motion.div
        initial={{ opacity: 0, y: 14, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="rounded-2xl border bg-background/80 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl">{t("auth.activation.title")}</CardTitle>
            <div className="text-sm text-muted-foreground">{t("auth.activation.subtitle")}</div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
            ) : done ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" />
                  <div>
                    <div className="font-medium">{t("auth.activation.successTitle")}</div>
                    <div className="mt-1 text-emerald-800 dark:text-emerald-100/90">{t("auth.activation.successText")}</div>
                  </div>
                </div>
                <Button className="w-full rounded-xl" onClick={() => nav("/login", { replace: true })}>
                  {t("auth.activation.goToLogin")}
                </Button>
              </div>
            ) : error ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                  <MailWarning className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
                  <div>
                    <div className="font-medium">{t("auth.activation.errorTitle")}</div>
                    <div className="mt-1 text-amber-800 dark:text-amber-100/90">{error}</div>
                  </div>
                </div>
                <Button variant="outline" className="w-full rounded-xl" onClick={() => nav("/login", { replace: true })}>
                  {t("auth.activation.goToLogin")}
                </Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-3" autoComplete="on">
                <div className="rounded-2xl border bg-muted/40 p-3 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">{validation?.full_name || validation?.email}</div>
                  <div className="mt-1">{validation?.email}</div>
                </div>

                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-3 h-4 w-4 opacity-60" />
                  <Input
                    className="pl-9 rounded-xl"
                    type="password"
                    placeholder={t("auth.activation.password")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    name="new-password"
                    autoComplete="new-password"
                    disabled={saving}
                  />
                </div>

                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-3 h-4 w-4 opacity-60" />
                  <Input
                    className="pl-9 rounded-xl"
                    type="password"
                    placeholder={t("auth.activation.passwordConfirm")}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    name="confirm-password"
                    autoComplete="new-password"
                    disabled={saving}
                  />
                </div>

                <Button className="w-full rounded-xl" disabled={saving} type="submit" aria-busy={saving}>
                  {saving ? t("auth.activation.saving") : t("auth.activation.submit")}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
      </div>
    </>
  );
}
